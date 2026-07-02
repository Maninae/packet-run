// tools.js — the toolbelt: costs, effects, per-tool legality.
// Phase 1a kit: Retransmit (reactive rescue) + Duplicate (preemptive, targeted
// insurance) only — build card #2. Tools are ALWAYS available when affordable;
// randomness lives in the world, never in your kit (design/01, 03).
// Stateless: every function takes the run and mutates only what its verb says.

import { TOOLS } from './config.js';

export function canAfford(run, toolName) {
  const cost = TOOLS[toolName];
  return run.bandwidth >= cost.bw && run.deadline >= cost.deadline;
}

// Duplicate: preemptive only (illegal once the impact resolved — build card #6),
// one copy per fragment, never on a copy, target must still be with the party.
export function duplicateLegal(run, fragment) {
  return !run.impactResolved &&
    canAfford(run, 'duplicate') &&
    fragment.status === 'with-party' &&
    !fragment.hasCopy;
}

export function applyDuplicate(run, fragment) {
  run.bandwidth -= TOOLS.duplicate.bw;
  fragment.hasCopy = true;
  run.events.push({ type: 'duplicate', fragment: fragment.id });
}

// Retransmit: legal whenever a fragment is lost and you can pay — a lost
// fragment stays recoverable at later nodes; the Deadline prices delay.
export function retransmitLegal(run, fragment) {
  return canAfford(run, 'retransmit') && fragment.status === 'lost';
}

export function applyRetransmit(run, fragment) {
  run.bandwidth -= TOOLS.retransmit.bw;
  run.deadline -= TOOLS.retransmit.deadline;
  fragment.status = 'returning'; // catches up at the next node (any node, incl. the dock)
  run.events.push({ type: 'retransmit', fragment: fragment.id });
}
