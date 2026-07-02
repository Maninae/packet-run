// encounters.js — hazard windows: approach → impact → response beats.
// Phase 1a: storm (short road, threatens #2 & #4) and drizzle (long road,
// threatens #3), each with the 15% gust tail (one extra unnamed sweep,
// recoverable in response), plus the fog reveal at the penultimate node
// (a consequence, not a decision — build card #15). Tool order per window:
// approach = Duplicate only; response = Retransmit only (build card #17).

import { HAZARDS, FOG } from './config.js';

export function runHazardWindow(state, hazard, rng) {
  // beats: approach (telegraph + preempt) → impact (world acts) → response
}

export function revealFog(state, rng) {
  // 40% nothing / 40% -1 Deadline / 20% -2, per FOG.outcomes
}
