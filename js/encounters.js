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

import { HAZARDS, FOG } from './config.js';

function sweep(fragment) {
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
    const stragglers = [];
    for (let i = 0; i < hazard.straggles; i++) {
      const candidates = run.fragments.filter((f) => f.status === 'with-party');
      if (!candidates.length) break;
      const straggler = candidates[Math.floor(rng() * candidates.length)];
      straggler.status = 'straggler';
      straggler.lag = rng() < 0.5 ? 1 : 2;
      stragglers.push({ fragment: straggler.id, lag: straggler.lag });
    }
    run.impactResolved = true;
    run.waitsUsed = 0;
    run.events.push({ type: 'impact', kind: 'rapids', node: hazard.impactNode, stragglers });
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
  const gustChance = run.mods?.gustChance ?? HAZARDS.gustChance;
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
  const outcomes = run.mods?.fogOutcomes ?? FOG.outcomes;
  const roll = rng();
  let cumulative = 0;
  for (const outcome of outcomes) {
    cumulative += outcome.p;
    if (roll < cumulative) return outcome.deadlineCost;
  }
  return outcomes[outcomes.length - 1].deadlineCost;
}
