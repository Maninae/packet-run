// main.js — bootstrap + game-loop wiring only. No game rules live here.

import { newRun } from './state.js';

// Seeded runs from day one (design/09): seed shown in UI, shareable.
const state = newRun('DEV1');

console.log('Packet Run scaffold — Phase 1a pending the portrait mock (Gate 1).', state);
