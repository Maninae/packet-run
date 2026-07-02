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

import { RUN, MAP_1A, BELT, TOOLS, PAYLOADS, CONGESTION, EVENTS, POUCH } from './config.js';
import { seededRng } from './rng.js';
import {
  duplicateLegal, applyDuplicate, retransmitLegal, applyRetransmit,
  checksumLegal, applyChecksum, repairLegal, applyRepair,
  skipLegal, applySkip,
} from './tools.js';
import { resolveImpact, rollFog } from './encounters.js';

// Grandma's address — from TEST-NET-3 (192.0.2/24 siblings), the range
// reserved for documentation, so the game never prints a real host.
export const DEST_ADDRESS = '203.0.113.7';

export function createRun({ seed, rng, mods = null, map = MAP_1A, payload = 'tcp-file', dnsNeeded = false, weather = null, pouch = [] }) {
  return {
    seed,
    rng: rng ?? seededRng(seed),
    mods, // difficulty overrides (config.EASY) — null = standard world
    weather, // the run's sky (config.WEATHER) — mods take precedence
    map,
    payload, // 'tcp-file' | 'udp-call' — kit and render rule (design/05)
    bandwidth: map.startBandwidth,
    deadline: map.startDeadline,
    fragments: Array.from({ length: RUN.partySize }, (_, i) => ({
      id: i + 1,
      status: 'with-party', // 'with-party' | 'lost' | 'returning'
      hasCopy: false,
      corrupted: false,     // the Static's work — hidden until…
      revealed: false,      // …Checksum finds it (then Repair can fix it)
    })),
    phase: dnsNeeded ? 'dns' : 'junction', // 'dns' | 'junction' | 'node' | 'reward' | 'done'
    segment: 0,             // index into map.segments
    road: null,             // 'short' | 'long' within the current segment
    node: map.segments[0].roads.short.nodes[0],
    stepIndex: 0,           // index into the chosen road's node list
    impactResolved: false,  // per segment — resets at each junction
    waitsUsed: 0,           // per rapids window (max 2 — design/04)
    congestion: null,       // open bottleneck window { capacity, maxRate, crossed }
    eventCard: null,        // open "?" card (index into config.EVENTS)
    siege: null,            // DDoS window { beat, pushes } — design/10
    duel: null,             // Static duel window (design/10) — Act-5 dock
    duelDone: false,
    eventsSeen: new Set(),  // "?" nodes already visited (per segment:node)
    belt: [...PAYLOADS[payload].belt], // actives AND passives share the slots (design/03)
    pouch: pouch.slice(0, 3), // one-shot consumables (design/03: max 3)
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
  if (run.phase === 'dns') return [{ type: 'lookup' }];
  if (run.phase === 'event') {
    return EVENTS[run.eventCard].options
      .map((o, option) => ({ o, option }))
      .filter(({ o }) => (run.bandwidth + (o.effects.bw ?? 0) >= 0)
        && (run.deadline + Math.min(0, o.effects.deadline ?? 0) >= 0))
      .map(({ option }) => ({ type: 'choose-event', option }));
  }
  if (run.phase === 'reward') {
    const actions = [];
    run.rewardOptions.forEach((option, index) => {
      // the cloak's handshake needs a beat on the clock — never a suicide pick
      if (option.tool === 'cloak' && run.deadline < 1) return;
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
  // an open bottleneck locks everything but the send-rate choice — the
  // puzzle IS the beat (design/04)
  if (run.phase === 'duel') {
    const actions = [];
    const spendable = run.duel.actionsLeft + run.duel.banked;
    if (spendable > 0) {
      if (run.bandwidth >= 1
        && run.fragments.some((f) => f.status === 'with-party' && f.corrupted && !f.revealed)) {
        actions.push({ type: 'duel-checksum' });
      }
      if (run.bandwidth >= 2) {
        for (const f of run.fragments) {
          if (f.corrupted && f.revealed) actions.push({ type: 'duel-repair', fragment: f.id });
        }
      }
      // the arena provides the verbs — the duel closes the curriculum even
      // for a player who skipped the kit. Brace banks a BASE action only.
      if (run.duel.actionsLeft > 0) actions.push({ type: 'brace' });
      run.pouch.forEach((item, index) => {
        if (item === 'boost') actions.push({ type: 'use-item', index, item });
      });
    }
    actions.push({ type: 'hold' });
    return actions;
  }
  if (run.siege) {
    // the swarm owns movement: push two through per beat, or wait it out;
    // rescues still work — at the flood surcharge (Duplicate stays
    // preemptive-only: this segment's impact already resolved)
    const actions = run.fragments
      .filter((f) => f.status === 'with-party')
      .map((f) => ({ type: 'push', fragment: f.id }));
    for (const f of run.fragments) {
      if (onBelt(run, 'retransmit') && retransmitLegal(run, f)) {
        actions.push({ type: 'retransmit', fragment: f.id });
      }
    }
    actions.push({ type: 'wait' });
    return actions;
  }
  if (run.congestion) {
    return CONGESTION.rates
      .filter((rate) => rate <= run.congestion.maxRate)
      .map((rate) => ({ type: 'send', rate }));
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
  for (const f of run.fragments) {
    if (onBelt(run, 'skip') && skipLegal(run, f)) {
      actions.push({ type: 'skip', fragment: f.id });
    }
  }
  run.pouch.forEach((item, index) => {
    if (item === 'boost') actions.push({ type: 'use-item', index, item });
    if (item === 'spare') {
      for (const f of run.fragments) {
        if (f.status === 'lost') actions.push({ type: 'use-item', index, item, fragment: f.id });
      }
    }
    if (item === 'stamp') {
      for (const f of run.fragments) {
        if (f.status === 'with-party' && !f.stamped) {
          actions.push({ type: 'use-item', index, item, fragment: f.id });
        }
      }
    }
  });
  if (onBelt(run, 'checksum') && checksumLegal(run)) actions.push({ type: 'checksum' });
  for (const f of run.fragments) {
    if (onBelt(run, 'repair') && repairLegal(run, f)) {
      actions.push({ type: 'repair', fragment: f.id });
    }
  }
  if (run.phase === 'node') {
    if (onBelt(run, 'reroute') && run.stepIndex > 0
      && run.bandwidth >= TOOLS.reroute.bw && run.deadline >= TOOLS.reroute.deadline) {
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
    (a.option ?? null) === (action.option ?? null) &&
    (a.replace ?? null) === (action.replace ?? null));
}

function fail(run, reason, killerConcept) {
  run.phase = 'done';
  run.outcome = 'failed';
  run.failure = { reason, killerConcept };
  run.events.push({ type: 'run-failed', reason, killerConcept });
}

// ---- The Static duel (design/10): a 4-beat fight at the Act-5 dock. ----
// The Static scrambles one hidden fragment per beat (two on beat 4); you
// answer with up to two actions per beat. Brace banks a base action for any
// LATER beat — banked actions spend on top of that beat's base two. The
// clock ticks every beat. Then the standard render rules judge the result.

function staticStrike(run, count) {
  for (let i = 0; i < count; i++) {
    const candidates = run.fragments.filter((f) => f.status === 'with-party' && !f.corrupted);
    if (!candidates.length) break;
    candidates[Math.floor(run.rng() * candidates.length)].corrupted = true;
  }
  run.events.push({ type: 'duel-surge', beat: run.duel.beat, count });
}

function startDuel(run) {
  run.phase = 'duel';
  run.duel = { beat: 1, actionsLeft: 2, banked: 0, pending: 0 };
  run.events.push({ type: 'duel-start' });
  staticStrike(run, 1);
}

function spendDuelAction(run) {
  if (run.duel.actionsLeft > 0) run.duel.actionsLeft -= 1;
  else run.duel.banked -= 1;
}

function maybeEndDuelBeat(run) {
  if (run.duel.actionsLeft === 0 && run.duel.banked === 0) endDuelBeat(run);
}

function endDuelBeat(run) {
  const duel = run.duel;
  duel.banked += duel.pending;
  duel.pending = 0;
  run.deadline -= 1;
  run.events.push({ type: 'duel-beat', beat: duel.beat, deadline: run.deadline });
  if (run.deadline < 0) {
    fail(run, 'deadline', 'latency');
    return;
  }
  if (duel.beat >= 4) {
    run.duel = null;
    run.duelDone = true;
    run.events.push({ type: 'duel-won' });
    run.phase = 'node';
    arriveAtDock(run);
    return;
  }
  duel.beat += 1;
  duel.actionsLeft = 2;
  staticStrike(run, duel.beat === 4 ? 2 : 1);
}

function arriveAtDock(run) {
  if (run.map.boss === 'static' && !run.duelDone) {
    startDuel(run);
    return;
  }
  const payload = PAYLOADS[run.payload];

  // unneeded copies are discarded — the dock keeps only one of each number
  const discarded = run.fragments.filter((f) => f.hasCopy).map((f) => f.id);
  for (const f of run.fragments) f.hasCopy = false;
  if (discarded.length) run.events.push({ type: 'copies-discarded', fragments: discarded });

  if (payload.freshness) {
    // any gap still unacknowledged at the dock is silently accepted — the
    // stutter bleed en route already priced the delay (design/05)
    for (const f of run.fragments) {
      if (f.status === 'lost' || f.status === 'expired') f.status = 'skipped';
    }
  }

  // receiver-side check: real docks checksum on arrival. A file fails on it;
  // a call just drops the bad frame and keeps playing.
  const needed = Math.ceil(RUN.partySize * payload.renderRatio);
  const delivered = payload.freshness
    ? run.fragments.filter((f) => f.status === 'with-party' && !f.corrupted).length
    : run.fragments.filter((f) => f.status === 'with-party').length;
  if (delivered < needed) {
    fail(run, 'missing-fragments', 'packet-loss');
    return;
  }
  if (!payload.freshness
    && run.fragments.some((f) => f.status === 'with-party' && f.corrupted)) {
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
    if (option.tool === 'cloak') {
      run.deadline -= 1; // the encryption handshake takes a beat (design/03)
      run.events.push({ type: 'handshake', deadline: run.deadline });
      if (run.deadline < 0) {
        run.rewardOptions = null;
        fail(run, 'deadline', 'latency');
        return;
      }
    }
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
// Stragglers ride along (home re-sends everything it has) — but the price
// matches Retransmit's shape (1 BW + 1 Deadline) so it never undercuts it.
function reroute(run) {
  run.bandwidth -= TOOLS.reroute.bw;
  run.deadline -= TOOLS.reroute.deadline;
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
  run.congestion = null; // a reissued party re-meets the jam fresh
  run.phase = 'junction';
}

// A live call STUTTERS over unacknowledged gaps: every beat with an
// unskipped lost/expired frame bleeds +1 Deadline until you Skip it —
// acknowledging losses early IS the tempo lesson (design/05).
function stutterBleed(run) {
  if (!PAYLOADS[run.payload].freshness) return 0;
  const gaps = run.fragments
    .filter((f) => f.status === 'lost' || f.status === 'expired')
    .map((f) => f.id);
  if (!gaps.length) return 0;
  run.deadline -= 1;
  run.events.push({ type: 'stutter', fragments: gaps, deadline: run.deadline });
  return 1;
}

// The DDoS siege (design/10): a beat passes — the swarm rages on. After
// three beats it disperses; everyone pushed (or held) regroups unharmed.
function siegeTick(run) {
  run.deadline -= 1;
  run.events.push({ type: 'siege-beat', beat: run.siege.beat + 1, deadline: run.deadline });
  stutterBleed(run);
  if (run.deadline < 0) {
    fail(run, 'deadline', 'latency');
    return;
  }
  run.siege.beat += 1;
  maybeDisperse(run);
}

function siegeBeat(run) {
  siegeTick(run);
}

function maybeDisperse(run) {
  if (!run.siege) return;
  const stillHeld = run.fragments.some((f) => f.status === 'with-party');
  if (run.siege.beat >= 3 || !stillHeld) {
    for (const f of run.fragments) {
      if (f.status === 'pushed') f.status = 'with-party';
    }
    run.siege = null;
    run.events.push({ type: 'siege-over' });
  }
}

// push one fragment through the flooded pipe: two pushes complete a beat
function pushThroughFlood(run, action) {
  const fragment = run.fragments.find((f) => f.id === action.fragment);
  fragment.status = 'pushed';
  run.siege.pushes += 1;
  run.events.push({ type: 'push', fragment: fragment.id });
  if (run.siege.pushes % 2 === 0) {
    siegeTick(run);
    if (run.phase === 'done') return;
  }
  maybeDisperse(run);
}

// Waiting at rapids: 1 Deadline per beat (Buffer passive: two beats for the
// price of one). Lag counts down; caught-up stragglers rejoin.
function waitBeat(run) {
  const buffered = run.passives.has('buffer') || run.belt.includes('buffer');
  const cost = buffered ? run.waitsUsed % 2 : 1;
  run.waitsUsed += 1;
  run.deadline -= cost;
  run.events.push({ type: 'wait', cost, deadline: run.deadline });
  stutterBleed(run);
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
  stutterBleed(run);
  if (run.deadline < 0) {
    fail(run, 'deadline', 'latency');
    return;
  }

  // the world acts mid-wire: crossing into the impact node resolves the hazard
  if (def.hazard && to === def.hazard.impactNode && !run.impactResolved) {
    run.lastImpact = { kind: def.hazard.kind, impactNode: def.hazard.impactNode };
    resolveImpact(run, def.hazard, run.rng);
    if (run.phase !== 'node') return; // a cable cut sent the party back
    if (run.deadline < 0) {
      fail(run, 'deadline', 'latency'); // satellite delays bite like any tick
      return;
    }
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

  // a "?" node: the card opens (once per node per segment)
  const eventKey = `${run.segment}:${to}`;
  if (def.event?.node === to && !run.eventsSeen.has(eventKey)) {
    run.eventsSeen.add(eventKey);
    run.eventCard = def.event.card;
    run.phase = 'event';
    run.events.push({ type: 'event-opened', card: def.event.card, node: to });
    return;
  }

  if (finalHop) {
    arriveAtDock(run);
  } else if (to === def.nodes.at(-1)) {
    arriveAtSegmentEnd(run, to);
  }
}

// end of segment: reward beat, then the next junction; tool windows reset
function arriveAtSegmentEnd(run, node) {
  run.segment += 1;
  run.stepIndex = 0;
  run.road = null;
  run.impactResolved = false;
  run.events.push({ type: 'junction-reached', segment: run.segment, node });
  run.rewardOptions = drawRewards(run);
  run.phase = 'reward';
  run.events.push({ type: 'reward-offered', options: run.rewardOptions });
}

// resolve a "?" card choice: every option is priced (design/04)
function chooseEvent(run, action) {
  const card = EVENTS[run.eventCard];
  const cardIndex = run.eventCard;
  const effects = card.options[action.option].effects;
  run.eventCard = null;
  run.phase = 'node';
  run.events.push({ type: 'event-chosen', card: cardIndex, option: action.option });

  if (effects.bw) run.bandwidth += effects.bw;
  if (effects.deadline) run.deadline += effects.deadline;
  if (effects.risk && run.rng() < effects.risk.p) {
    const candidates = run.fragments.filter((f) => f.status === 'with-party');
    if (candidates.length) {
      const victim = candidates[Math.floor(run.rng() * candidates.length)];
      victim.status = 'straggler';
      victim.lag = effects.risk.straggle;
      run.waitsUsed = 0;
      run.events.push({ type: 'event-hiccup', fragment: victim.id, lag: victim.lag });
    }
  }
  if (effects.teleport) {
    // the cache's copy: the rest of THIS road is skipped — the serving node
    // is closer than home (that's the whole CDN idea, design/07)
    const def = roadDef(run);
    const end = def.nodes.at(-1);
    run.stepIndex = def.nodes.length - 1;
    run.node = end;
    run.events.push({ type: 'cache-jump', to: end });
    if (end === 'dock') arriveAtDock(run);
    else arriveAtSegmentEnd(run, end);
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
    case 'skip':
      applySkip(run, run.fragments.find((f) => f.id === action.fragment));
      break;
    case 'push':
      pushThroughFlood(run, action);
      break;
    case 'wait':
      if (run.siege) siegeBeat(run);
      else waitBeat(run);
      break;
    case 'reroute':
      reroute(run);
      break;
    case 'take-reward':
      takeReward(run, action);
      break;
    case 'send': {
      // one beat of pushing through the pipe: costs a tick; the pipe carries
      // up to its capacity — success doubles the ceiling, overshoot halves it
      run.deadline -= 1;
      stutterBleed(run);
      if (run.deadline < 0) {
        fail(run, 'deadline', 'latency');
        break;
      }
      const window = run.congestion;
      const alive = run.fragments.filter((f) => f.status === 'with-party').length;
      const sent = Math.min(action.rate, alive - window.crossed);
      const across = Math.min(sent, window.capacity);
      const bounced = sent - across;
      window.crossed += across;
      window.maxRate = bounced > 0
        ? Math.max(1, Math.floor(action.rate / 2))
        : Math.min(CONGESTION.rates.at(-1), window.maxRate * 2);
      run.events.push({
        type: 'send', rate: action.rate, crossed: across, bounced,
        totalCrossed: window.crossed, deadline: run.deadline,
      });
      if (window.crossed >= alive) {
        run.congestion = null;
        run.events.push({ type: 'congestion-cleared' });
      }
      break;
    }
    case 'choose-event':
      chooseEvent(run, action);
      break;
    case 'brace':
      run.duel.actionsLeft -= 1;
      run.duel.pending += 1;
      run.events.push({ type: 'brace', banked: run.duel.banked + run.duel.pending });
      if (run.duel.actionsLeft === 0 && run.duel.banked === 0) endDuelBeat(run);
      break;
    case 'duel-checksum':
      spendDuelAction(run);
      applyChecksum(run);
      if (run.phase === 'duel') maybeEndDuelBeat(run);
      break;
    case 'duel-repair':
      spendDuelAction(run);
      applyRepair(run, run.fragments.find((f) => f.id === action.fragment));
      if (run.phase === 'duel') maybeEndDuelBeat(run);
      break;
    case 'hold':
      endDuelBeat(run);
      break;
    case 'use-item': {
      const item = run.pouch[action.index];
      run.pouch.splice(action.index, 1);
      if (item === 'boost') run.bandwidth += 3;
      if (item === 'spare') {
        const f = run.fragments.find((x) => x.id === action.fragment);
        f.status = 'with-party';
        delete f.lag;
      }
      if (item === 'stamp') {
        run.fragments.find((x) => x.id === action.fragment).stamped = true;
      }
      run.events.push({ type: 'item-used', item, fragment: action.fragment ?? null });
      if (run.phase === 'duel') { spendDuelAction(run); maybeEndDuelBeat(run); }
      break;
    }
    case 'lookup':
      // names → addresses: the address book answers, the clock ticks once
      run.deadline -= 1;
      run.phase = 'junction';
      run.events.push({ type: 'dns-lookup', address: DEST_ADDRESS, deadline: run.deadline });
      break;
    case 'onward':
      onward(run);
      break;
  }
  return run;
}
