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
export function resolveImpact(run, hazard, rng) {
  const byId = new Map(run.fragments.map((f) => [f.id, f]));
  const swept = [];
  const saved = [];
  for (const id of hazard.threatens) {
    (sweep(byId.get(id)) ? saved : swept).push(id);
  }

  let gust = null;
  if (rng() < HAZARDS.gustChance) {
    const candidates = run.fragments.filter((f) => f.status === 'with-party');
    if (candidates.length > 0) {
      const target = candidates[Math.floor(rng() * candidates.length)];
      gust = { fragment: target.id, saved: sweep(target) };
    }
  }

  run.impactResolved = true;
  run.events.push({ type: 'impact', kind: hazard.kind, swept, saved, gust });
}

// Rolls the fog outcome for the final stretch; returns the Deadline cost.
export function rollFog(rng) {
  const roll = rng();
  let cumulative = 0;
  for (const outcome of FOG.outcomes) {
    cumulative += outcome.p;
    if (roll < cumulative) return outcome.deadlineCost;
  }
  return FOG.outcomes[FOG.outcomes.length - 1].deadlineCost;
}
