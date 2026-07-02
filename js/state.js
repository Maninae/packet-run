// state.js — run state: the single coordinator object.
// All mutable run state lives here; other modules are stateless functions
// that receive (state, ...) as arguments. See CLAUDE.md architecture rules.

import { RUN } from './config.js';

export function newRun(seed) {
  return {
    seed,
    bandwidth: RUN.startBandwidth,
    deadline: RUN.startDeadline,
    // fragments 1..N; a lost fragment is visibly missing from the party
    fragments: Array.from({ length: RUN.partySize }, (_, i) => ({
      id: i + 1,
      status: 'with-party', // 'with-party' | 'lost'
      hasCopy: false,       // Duplicate insurance (one copy max, no copying copies)
    })),
    node: 0,
    road: null, // 'short' | 'long' after the junction choice
    log: [],    // event log → autopsy JSON (design/06) from Phase 1b
  };
}
