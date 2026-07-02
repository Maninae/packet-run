// engine.js — the run state machine. Headless by design: the UI, the unit
// tests, the economy simulators, and agent playtesters all drive the SAME
// engine through createRun / legalActions / act. No DOM access here.
//
// A run walks a MAP (config.js schema v2): per segment — junction (pick a
// road) → nodes (tool beats) → onward (hop: deadline ticks, impacts resolve,
// pickups/fog/rejoins fire on arrival) → next junction … until the dock
// renders or the run fails. Fail-fast: Deadline below zero ends it there.
//
// rng is injectable for tests/simulation; defaults to the seeded PRNG.
// Consumption order is documented in encounters.js — keep it stable.

import { RUN, MAP_1A, BELT } from './config.js';
import { seededRng } from './rng.js';
import {
  duplicateLegal, applyDuplicate, retransmitLegal, applyRetransmit,
  checksumLegal, applyChecksum, repairLegal, applyRepair,
} from './tools.js';
import { resolveImpact, rollFog } from './encounters.js';

export function createRun({ seed, rng, mods = null, map = MAP_1A }) {
  return {
    seed,
    rng: rng ?? seededRng(seed),
    mods, // difficulty overrides (config.EASY) — null = standard world
    map,
    bandwidth: map.startBandwidth,
    deadline: map.startDeadline,
    fragments: Array.from({ length: RUN.partySize }, (_, i) => ({
      id: i + 1,
      status: 'with-party', // 'with-party' | 'lost' | 'returning'
      hasCopy: false,
      corrupted: false,     // the Static's work — hidden until…
      revealed: false,      // …Checksum finds it (then Repair can fix it)
    })),
    phase: 'junction',      // 'junction' | 'node' | 'done'
    segment: 0,             // index into map.segments
    road: null,             // 'short' | 'long' within the current segment
    node: map.segments[0].roads.short.nodes[0],
    stepIndex: 0,           // index into the chosen road's node list
    impactResolved: false,  // per segment — resets at each junction
    waitsUsed: 0,           // per rapids window (max 2 — design/04)
    belt: [...BELT.start],  // actives AND passives share the 3 slots (design/03)
    passives: new Set(),    // extra always-on machinery (test/meta injection)
    rewardOptions: null,    // pick-1-of-3, offered at mid-map junctions
    lastImpact: null,       // { kind, impactNode } — autopsy's killer
    fogCost: null,          // revealed at the last road's penultimate node
    outcome: null,          // 'rendered' | 'failed'
    failure: null,          // { reason, killerConcept }
    stars: null,
    events: [{ type: 'run-start', seed }],
  };
}

export function currentSegment(run) {
  return run.map.segments[run.segment];
}

export function segmentRoads(run) {
  return currentSegment(run).roads;
}

export function roadDef(run) {
  return segmentRoads(run)[run.road];
}

const onBelt = (run, tool) => run.belt.includes(tool);

export function legalActions(run) {
  if (run.phase === 'done') return [];
  if (run.phase === 'reward') {
    const actions = [];
    run.rewardOptions.forEach((option, index) => {
      if (option.kind !== 'tool') {
        actions.push({ type: 'take-reward', index, kind: option.kind });
      } else if (run.belt.length < BELT.slots) {
        actions.push({ type: 'take-reward', index, kind: 'tool', tool: option.tool });
      } else {
        for (const replace of run.belt) {
          actions.push({ type: 'take-reward', index, kind: 'tool', tool: option.tool, replace });
        }
      }
    });
    return actions;
  }
  // tools stay available at junction beats too (mid-map junctions: rescue or
  // insure BEFORE committing to a road) — only movement needs a chosen road
  const actions = [];
  if (run.phase === 'junction') {
    for (const road of Object.keys(segmentRoads(run))) {
      actions.push({ type: 'choose-road', road });
    }
  }
  for (const f of run.fragments) {
    if (onBelt(run, 'duplicate') && duplicateLegal(run, f)) {
      actions.push({ type: 'duplicate', fragment: f.id });
    }
  }
  for (const f of run.fragments) {
    if (onBelt(run, 'retransmit') && retransmitLegal(run, f)) {
      actions.push({ type: 'retransmit', fragment: f.id });
    }
  }
  if (onBelt(run, 'checksum') && checksumLegal(run)) actions.push({ type: 'checksum' });
  for (const f of run.fragments) {
    if (onBelt(run, 'repair') && repairLegal(run, f)) {
      actions.push({ type: 'repair', fragment: f.id });
    }
  }
  if (run.phase === 'node') {
    if (onBelt(run, 'reroute') && run.stepIndex > 0 && run.deadline >= 1) {
      actions.push({ type: 'reroute' });
    }
    if (run.fragments.some((f) => f.status === 'straggler') && run.waitsUsed < 2) {
      actions.push({ type: 'wait' });
    }
    actions.push({ type: 'onward' });
  }
  return actions;
}

function isLegal(run, action) {
  return legalActions(run).some((a) =>
    a.type === action.type &&
    (a.road ?? null) === (action.road ?? null) &&
    (a.fragment ?? null) === (action.fragment ?? null) &&
    (a.index ?? null) === (action.index ?? null) &&
    (a.replace ?? null) === (action.replace ?? null));
}

function fail(run, reason, killerConcept) {
  run.phase = 'done';
  run.outcome = 'failed';
  run.failure = { reason, killerConcept };
  run.events.push({ type: 'run-failed', reason, killerConcept });
}

function arriveAtDock(run) {
  // unneeded copies are discarded — the dock keeps only one of each number
  const discarded = run.fragments.filter((f) => f.hasCopy).map((f) => f.id);
  for (const f of run.fragments) f.hasCopy = false;
  if (discarded.length) run.events.push({ type: 'copies-discarded', fragments: discarded });

  const delivered = run.fragments.filter((f) => f.status === 'with-party').length;
  const needed = Math.ceil(RUN.partySize * RUN.renderThresholdRatio);
  if (delivered < needed) {
    fail(run, 'missing-fragments', 'packet-loss');
    return;
  }
  // receiver-side check: real docks checksum on arrival — and it's too late
  if (run.fragments.some((f) => f.status === 'with-party' && f.corrupted)) {
    fail(run, 'corrupted-payload', 'corruption');
    return;
  }
  const { threeStar, twoStar } = run.map.stars;
  run.phase = 'done';
  run.outcome = 'rendered';
  run.stars = run.bandwidth >= threeStar ? 3 : run.bandwidth >= twoStar ? 2 : 1;
  run.events.push({ type: 'render', delivered, stars: run.stars });
}

// Pick-1-of-3 (design/03): two tools you don't own + an energy top-up.
// Draws burn the run's rng — order is part of the seed's story.
function drawRewards(run) {
  const pool = BELT.rewardPool.filter((t) => !run.belt.includes(t));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(run.rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const options = pool.slice(0, 2).map((tool) => ({ kind: 'tool', tool }));
  while (options.length < 2) options.push({ kind: 'bandwidth', amount: BELT.resourceReward.bw });
  options.push({ kind: 'bandwidth', amount: BELT.resourceReward.bw });
  return options;
}

function takeReward(run, action) {
  const option = run.rewardOptions[action.index];
  if (option.kind === 'tool') {
    if (action.replace) run.belt = run.belt.filter((t) => t !== action.replace);
    run.belt.push(option.tool);
    run.events.push({ type: 'reward-taken', kind: 'tool', tool: option.tool, replaced: action.replace ?? null });
  } else {
    run.bandwidth += option.amount;
    run.events.push({ type: 'reward-taken', kind: 'bandwidth', amount: option.amount, bandwidth: run.bandwidth });
  }
  run.rewardOptions = null;
  run.phase = 'junction';
}

// Re-route (design/03, /07): a SENDER REISSUE — the party fades and
// rematerializes at the segment's junction; it never walks backwards.
// The hazard window resets: whatever road you take next plays fresh.
function reroute(run) {
  run.deadline -= 1;
  run.events.push({ type: 'reroute', deadline: run.deadline });
  if (run.deadline < 0) {
    fail(run, 'deadline', 'latency');
    return;
  }
  for (const f of run.fragments) {
    if (f.status === 'straggler') {
      f.status = 'with-party'; // reissued together
      delete f.lag;
    }
  }
  run.node = roadDef(run).nodes[0];
  run.stepIndex = 0;
  run.road = null;
  run.impactResolved = false;
  run.waitsUsed = 0;
  run.phase = 'junction';
}

// Waiting at rapids: 1 Deadline per beat (Buffer passive: two beats for the
// price of one). Lag counts down; caught-up stragglers rejoin.
function waitBeat(run) {
  const buffered = run.passives.has('buffer') || run.belt.includes('buffer');
  const cost = buffered ? run.waitsUsed % 2 : 1;
  run.waitsUsed += 1;
  run.deadline -= cost;
  run.events.push({ type: 'wait', cost, deadline: run.deadline });
  if (run.deadline < 0) {
    fail(run, 'deadline', 'latency');
    return;
  }
  const caught = [];
  for (const f of run.fragments) {
    if (f.status !== 'straggler') continue;
    f.lag -= 1;
    if (f.lag <= 0) {
      f.status = 'with-party';
      delete f.lag;
      caught.push(f.id);
    }
  }
  if (caught.length) run.events.push({ type: 'rejoin', fragments: caught });
}

function onward(run) {
  const def = roadDef(run);

  // pressing on abandons any remaining stragglers (recoverable via Retransmit)
  const abandoned = run.fragments.filter((f) => f.status === 'straggler');
  if (abandoned.length) {
    for (const f of abandoned) {
      f.status = 'lost';
      delete f.lag;
    }
    run.events.push({ type: 'stragglers-lost', fragments: abandoned.map((f) => f.id) });
  }

  const from = def.nodes[run.stepIndex];
  run.stepIndex += 1;
  const to = def.nodes[run.stepIndex];
  const finalHop = to === 'dock';

  run.deadline -= RUN.deadlinePerHop;
  if (finalHop && run.fogCost) run.deadline -= run.fogCost;
  run.events.push({ type: 'hop', from, to, deadline: run.deadline });
  if (run.deadline < 0) {
    fail(run, 'deadline', 'latency');
    return;
  }

  // the world acts mid-wire: crossing into the impact node resolves the hazard
  if (def.hazard && to === def.hazard.impactNode && !run.impactResolved) {
    run.lastImpact = { kind: def.hazard.kind, impactNode: def.hazard.impactNode };
    resolveImpact(run, def.hazard, run.rng);
  }

  run.node = to;

  // arrival: retransmitted fragments catch up (including at the dock itself)
  const rejoined = run.fragments.filter((f) => f.status === 'returning');
  if (rejoined.length) {
    for (const f of rejoined) f.status = 'with-party';
    run.events.push({ type: 'rejoin', fragments: rejoined.map((f) => f.id) });
  }

  if (def.bwPickup?.node === to) {
    run.bandwidth += def.bwPickup.amount;
    run.events.push({ type: 'pickup', amount: def.bwPickup.amount, bandwidth: run.bandwidth });
  }

  // fog belongs to the run's final stretch: the LAST segment's chosen road,
  // revealed at its second-to-last node (a consequence, not a decision)
  const lastSegment = run.segment === run.map.segments.length - 1;
  if (lastSegment && to === def.nodes.at(-2) && run.fogCost === null) {
    run.fogCost = rollFog(run, run.rng);
    run.events.push({ type: 'fog-reveal', cost: run.fogCost });
  }

  if (finalHop) {
    arriveAtDock(run);
  } else if (to === def.nodes.at(-1)) {
    // end of segment: reward beat, then the next junction; tool windows reset
    run.segment += 1;
    run.stepIndex = 0;
    run.road = null;
    run.impactResolved = false;
    run.events.push({ type: 'junction-reached', segment: run.segment, node: to });
    run.rewardOptions = drawRewards(run);
    run.phase = 'reward';
    run.events.push({ type: 'reward-offered', options: run.rewardOptions });
  }
}

export function act(run, action) {
  if (!isLegal(run, action)) {
    throw new Error(`illegal action ${JSON.stringify(action)} in phase ${run.phase} at ${run.node}`);
  }
  switch (action.type) {
    case 'choose-road':
      run.road = action.road;
      run.phase = 'node';
      run.events.push({ type: 'road-chosen', road: action.road, segment: run.segment });
      break;
    case 'duplicate':
      applyDuplicate(run, run.fragments.find((f) => f.id === action.fragment));
      break;
    case 'retransmit':
      applyRetransmit(run, run.fragments.find((f) => f.id === action.fragment));
      break;
    case 'checksum':
      applyChecksum(run);
      break;
    case 'repair':
      applyRepair(run, run.fragments.find((f) => f.id === action.fragment));
      break;
    case 'wait':
      waitBeat(run);
      break;
    case 'reroute':
      reroute(run);
      break;
    case 'take-reward':
      takeReward(run, action);
      break;
    case 'onward':
      onward(run);
      break;
  }
  return run;
}
