// encounters.js — world-side resolution: hazard impacts and the fog reveal.
// Phase 1a: storm (short road, sweeps the telegraphed #2 & #4) and drizzle
// (long road, sweeps #3), each with the 15% gust tail — one EXTRA, unnamed
// fragment swept on impact, recoverable in the response beat. Copies absorb
// both named sweeps and gusts (that's why insurance stays valuable even when
// the named threats are covered — design/02). Fog at the penultimate node is
// a consequence, not a decision (build card #15).
//
// rng consumption order (keep stable — replays and tests depend on it):
//   resolveImpact: gustRoll, then gustPick (only if the gust fired)
//   rollFog: fogRoll

import { HAZARDS, FOG, PAYLOADS, CONGESTION } from './config.js';

function sweep(fragment) {
  if (fragment.stamped) {
    fragment.stamped = false; // the Priority Stamp shrugs it off (one hazard)
    return true;              // saved
  }
  if (fragment.hasCopy) {
    fragment.hasCopy = false; // the copy steps in and is consumed
    return true;              // saved
  }
  fragment.status = 'lost';
  return false;
}

// Resolves a hazard impact against the party. Mutates fragments, appends the
// impact event, marks the run's impact as resolved.
// 'static' scrambles ONE hidden fragment (no gust; corruption ignores copies —
// Duplicate insures against loss, Checksum/Repair own corruption). The event
// reports only the COUNT: which fragment is the Checksum's job to find.
export function resolveImpact(run, hazard, rng) {
  // rapids: fragments fall behind with VISIBLE lag (1–2 beats) — the wait-or-
  // press-on choice is informed. rng order: per straggler pick, then its lag.
  if (hazard.kind === 'rapids') {
    const freshness = PAYLOADS[run.payload].freshness;
    const stragglers = [];
    for (let i = 0; i < hazard.straggles; i++) {
      const candidates = run.fragments.filter((f) => f.status === 'with-party');
      if (!candidates.length) break;
      const straggler = candidates[Math.floor(rng() * candidates.length)];
      const lag = rng() < 0.5 ? 1 : 2;
      // live calls: a frame that far behind is ALREADY too old (design/05) —
      // born expired; waiting can't save it, only Skip acknowledges it
      const expired = Boolean(freshness && lag >= freshness);
      straggler.status = expired ? 'expired' : 'straggler';
      if (!expired) straggler.lag = lag;
      stragglers.push({ fragment: straggler.id, lag, expired });
    }
    run.impactResolved = true;
    run.waitsUsed = 0;
    run.events.push({ type: 'impact', kind: 'rapids', node: hazard.impactNode, stragglers });
    return;
  }
  // congestion: the bottleneck window opens — capacity rolls hidden (the
  // event never says it; overshooting is how you find out). rng: capacityRoll.
  if (hazard.kind === 'congestion') {
    const [lo, hi] = CONGESTION.capacities;
    run.congestion = {
      capacity: lo + Math.floor(rng() * (hi - lo + 1)),
      maxRate: CONGESTION.startMax,
      crossed: 0,
    };
    run.impactResolved = true;
    run.events.push({ type: 'impact', kind: 'congestion', node: hazard.impactNode });
    return;
  }
  // the trench: a huge seabed pipe — +3 bandwidth for crossing, but big
  // pipes fail big: a rare cable cut forces a sender reissue back to the
  // junction (the internet is physical; >99% of it is seabed fiber).
  // rng: cutRoll. The satellite pass: always one beat slower (the long way
  // up), sometimes solar-flaky. rng: flakeRoll.
  if (hazard.kind === 'trench') {
    const cut = rng() < 0.10;
    run.impactResolved = true;
    run.events.push({ type: 'impact', kind: 'trench', node: hazard.impactNode, cut });
    if (cut) {
      run.node = run.map.segments[run.segment].roads[run.road].nodes[0];
      run.stepIndex = 0;
      run.road = null;
      run.impactResolved = false;
      run.waitsUsed = 0;
      run.phase = 'junction';
    } else {
      run.bandwidth += 3;
    }
    return;
  }
  if (hazard.kind === 'satellite') {
    // always consume the roll (stream stability); a solar flare forces it
    const flaky = run.weather?.satelliteAlwaysFlaky || rng() < 0.20;
    run.deadline -= flaky ? 2 : 1;
    run.impactResolved = true;
    run.events.push({ type: 'impact', kind: 'satellite', node: hazard.impactNode, flaky, deadline: run.deadline });
    return;
  }
  // the offline node (Far Reaches): the router is power-cycling — one
  // forced beat while it reboots. Nothing harmed; uptime isn't a given
  // everywhere. No rng.
  if (hazard.kind === 'offline') {
    run.deadline -= 1;
    run.impactResolved = true;
    run.events.push({ type: 'impact', kind: 'offline', node: hazard.impactNode, deadline: run.deadline });
    return;
  }
  // the DDoS swarm (design/10): the siege window opens — no rng, pure vice.
  if (hazard.kind === 'ddos') {
    run.siege = { beat: 0, pushes: 0 };
    run.impactResolved = true;
    run.events.push({ type: 'impact', kind: 'ddos', node: hazard.impactNode });
    return;
  }
  // the sniffer: with the Cloak it's foiled outright — sealed fragments are
  // VISIBLE on the wire but unreadable (design/07; route-hiding is Tor, out
  // of scope). Unsealed, its tamper IS corruption: scrambled bits the
  // checksum pipeline catches, like real receivers do. rng: victimPick.
  if (hazard.kind === 'sniffer') {
    const foiled = run.belt.includes('cloak') || run.passives.has('cloak');
    if (!foiled) {
      const candidates = run.fragments.filter((f) => f.status === 'with-party');
      if (candidates.length) {
        candidates[Math.floor(rng() * candidates.length)].corrupted = true;
      }
    }
    run.impactResolved = true;
    run.events.push({ type: 'impact', kind: 'sniffer', node: hazard.impactNode, foiled });
    return;
  }
  if (hazard.kind === 'static') {
    const candidates = run.fragments.filter((f) => f.status === 'with-party');
    let scrambled = 0;
    if (candidates.length) {
      candidates[Math.floor(rng() * candidates.length)].corrupted = true;
      scrambled = 1;
    }
    run.impactResolved = true;
    run.events.push({ type: 'impact', kind: 'static', node: hazard.impactNode, scrambled });
    return;
  }
  const byId = new Map(run.fragments.map((f) => [f.id, f]));
  const swept = [];
  const saved = [];
  for (const id of hazard.threatens) {
    (sweep(byId.get(id)) ? saved : swept).push(id);
  }

  let gust = null;
  const gustChance = run.mods?.gustChance ?? run.weather?.gustChance ?? HAZARDS.gustChance;
  if (rng() < gustChance) {
    const candidates = run.fragments.filter((f) => f.status === 'with-party');
    if (candidates.length > 0) {
      const target = candidates[Math.floor(rng() * candidates.length)];
      gust = { fragment: target.id, saved: sweep(target) };
    }
  }

  run.impactResolved = true;
  run.events.push({ type: 'impact', kind: hazard.kind, node: hazard.impactNode, swept, saved, gust });
}

// Rolls the fog outcome for the final stretch; returns the Deadline cost.
export function rollFog(run, rng) {
  const outcomes = run.mods?.fogOutcomes ?? run.weather?.fogOutcomes ?? FOG.outcomes;
  const roll = rng();
  let cumulative = 0;
  for (const outcome of outcomes) {
    cumulative += outcome.p;
    if (roll < cumulative) return outcome.deadlineCost;
  }
  return outcomes[outcomes.length - 1].deadlineCost;
}
