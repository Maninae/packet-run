// engine.js — the Phase 1a run state machine. Headless by design: the UI,
// the unit tests, the economy simulator, and agent playtesters all drive the
// SAME engine through createRun / legalActions / act. No DOM access here.
//
// A run: junction (pick a road) → nodes (tool beats) → onward (hop: deadline
// ticks, impacts resolve, pickups/fog/rejoins fire on arrival) → dock render
// or failure. Fail-fast: the moment Deadline dips below zero, the run ends.
//
// rng is injectable for tests/simulation; defaults to the seeded PRNG.
// Consumption order is documented in encounters.js — keep it stable.

import { RUN, MAP_1A, STARS } from './config.js';
import { seededRng } from './rng.js';
import { duplicateLegal, applyDuplicate, retransmitLegal, applyRetransmit } from './tools.js';
import { resolveImpact, rollFog } from './encounters.js';

export function createRun({ seed, rng, mods = null }) {
  return {
    seed,
    rng: rng ?? seededRng(seed),
    mods, // difficulty overrides (config.EASY) — null = standard world
    bandwidth: RUN.startBandwidth,
    deadline: RUN.startDeadline,
    fragments: Array.from({ length: RUN.partySize }, (_, i) => ({
      id: i + 1,
      status: 'with-party', // 'with-party' | 'lost' | 'returning'
      hasCopy: false,
    })),
    phase: 'junction',      // 'junction' | 'node' | 'done'
    road: null,             // 'short' | 'long'
    node: 'src',
    stepIndex: 0,           // index into the chosen road's node list
    impactResolved: false,
    fogCost: null,          // revealed at the penultimate node
    outcome: null,          // 'rendered' | 'failed'
    failure: null,          // { reason, killerConcept }
    stars: null,
    events: [{ type: 'run-start', seed }],
  };
}

export function roadDef(run) {
  return MAP_1A.roads[run.road];
}

export function legalActions(run) {
  if (run.phase === 'done') return [];
  if (run.phase === 'junction') {
    return Object.keys(MAP_1A.roads).map((road) => ({ type: 'choose-road', road }));
  }
  const actions = [];
  for (const f of run.fragments) {
    if (duplicateLegal(run, f)) actions.push({ type: 'duplicate', fragment: f.id });
  }
  for (const f of run.fragments) {
    if (retransmitLegal(run, f)) actions.push({ type: 'retransmit', fragment: f.id });
  }
  actions.push({ type: 'onward' });
  return actions;
}

function isLegal(run, action) {
  return legalActions(run).some((a) =>
    a.type === action.type &&
    (a.road ?? null) === (action.road ?? null) &&
    (a.fragment ?? null) === (action.fragment ?? null));
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
  run.phase = 'done';
  run.outcome = 'rendered';
  run.stars = run.bandwidth >= STARS.threeStar ? 3 : run.bandwidth >= STARS.twoStar ? 2 : 1;
  run.events.push({ type: 'render', delivered, stars: run.stars });
}

function onward(run) {
  const def = roadDef(run);
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
  if (to === def.hazard.impactNode && !run.impactResolved) {
    resolveImpact(run, def.hazard, run.rng);
  }

  run.node = to;

  // arrival: retransmitted fragments catch up (including at the dock itself)
  const rejoined = run.fragments.filter((f) => f.status === 'returning');
  if (rejoined.length) {
    for (const f of rejoined) f.status = 'with-party';
    run.events.push({ type: 'rejoin', fragments: rejoined.map((f) => f.id) });
  }

  if (def.bwPickup.node === to) {
    run.bandwidth += def.bwPickup.amount;
    run.events.push({ type: 'pickup', amount: def.bwPickup.amount, bandwidth: run.bandwidth });
  }

  const penultimate = def.nodes[def.nodes.length - 2];
  if (to === penultimate && run.fogCost === null) {
    run.fogCost = rollFog(run, run.rng);
    run.events.push({ type: 'fog-reveal', cost: run.fogCost });
  }

  if (finalHop) arriveAtDock(run);
}

export function act(run, action) {
  if (!isLegal(run, action)) {
    throw new Error(`illegal action ${JSON.stringify(action)} in phase ${run.phase} at ${run.node}`);
  }
  switch (action.type) {
    case 'choose-road':
      run.road = action.road;
      run.phase = 'node';
      run.events.push({ type: 'road-chosen', road: action.road });
      break;
    case 'duplicate':
      applyDuplicate(run, run.fragments.find((f) => f.id === action.fragment));
      break;
    case 'retransmit':
      applyRetransmit(run, run.fragments.find((f) => f.id === action.fragment));
      break;
    case 'onward':
      onward(run);
      break;
  }
  return run;
}
