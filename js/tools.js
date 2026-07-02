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

// Checksum: scans the whole party. Offered only while something scrambled is
// still hidden — the impact announces THAT, the Checksum finds WHICH.
export function checksumLegal(run) {
  return canAfford(run, 'checksum') &&
    run.fragments.some((f) => f.status === 'with-party' && f.corrupted && !f.revealed);
}

export function applyChecksum(run) {
  run.bandwidth -= TOOLS.checksum.bw;
  const found = run.fragments.filter((f) => f.status === 'with-party' && f.corrupted);
  for (const f of found) f.revealed = true;
  run.events.push({ type: 'checksum', found: found.map((f) => f.id) });
}

// Repair: fixes one fragment the Checksum has revealed.
export function repairLegal(run, fragment) {
  return canAfford(run, 'repair') && fragment.corrupted && fragment.revealed;
}

export function applyRepair(run, fragment) {
  run.bandwidth -= TOOLS.repair.bw;
  fragment.corrupted = false;
  fragment.revealed = false;
  run.events.push({ type: 'repair', fragment: fragment.id });
}

// Skip (the UDP verb, design/05): wave a straggler/lost/expired frame goodbye.
// Free — loss tolerance IS the strategy; the dock accepts the gap.
export function skipLegal(run, fragment) {
  return ['lost', 'straggler', 'expired'].includes(fragment.status);
}

export function applySkip(run, fragment) {
  fragment.status = 'skipped';
  delete fragment.lag;
  delete fragment.age;
  run.events.push({ type: 'skip', fragment: fragment.id });
}
