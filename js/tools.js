// tools.js — the toolbelt: costs, effects, affordability.
// Phase 1a kit: Retransmit (reactive rescue) + Duplicate (preemptive, targeted
// insurance) only — build card #2. Tools are ALWAYS available when affordable;
// randomness lives in the world, never in your kit (design/01, 03).

import { TOOLS } from './config.js';

export function canAfford(state, toolName) {
  const cost = TOOLS[toolName];
  return state.bandwidth >= cost.bw && state.deadline >= cost.deadline;
}

export function retransmit(state, fragmentId) {
  // recall one lost fragment; it catches up next node (costs bw + deadline)
}

export function duplicate(state, fragmentId) {
  // approach-beat only; one copy per fragment; dock discards unneeded copies
}
