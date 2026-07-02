// autopsy.js — loss is a teaching beat (design/06). Every finished run derives
// one compact record: what killed it → which real concept that was → which
// tool might have saved you → one "on the real internet…" line. The same JSON
// powers the loss screen, balance tuning, and the headless simulator.
// deriveAutopsy is pure; logRun is the only storage side effect.

import { MAP_1A, TOOLS } from './config.js';

const CONCEPT_LINES = {
  'packet-loss': 'Real senders insure important data with redundancy.',
  latency: 'On the real internet, data that arrives too late gets dropped.',
};

// kid-facing "what might have saved you" lines (≤2 short sentences each)
const TOOL_LINES = {
  'duplicate-before-storm':
    'Duplicate could have saved you: copy the fragments the storm names, before it hits.',
  'retransmit-the-lost':
    'You had energy left — Retransmit calls a lost fragment back.',
  'save-energy-for-rescues':
    'Copies cost 3 energy each. Keep enough to rescue someone later.',
  'keep-slack-for-the-mist':
    'The mist can hide mud. Arrive at the last stretch with ticks to spare.',
  'try-the-short-road':
    'The long road spends 7 ticks before anything goes wrong. Short roads leave slack.',
  'spend-fewer-ticks':
    'Every Retransmit costs a tick. Spend them where they count.',
};

function suggestFor(run) {
  if (run.failure.reason === 'missing-fragments') {
    const usedDuplicate = run.events.some((e) => e.type === 'duplicate');
    if (!usedDuplicate) return 'duplicate-before-storm';
    if (run.bandwidth >= TOOLS.retransmit.bw) return 'retransmit-the-lost';
    return 'save-energy-for-rescues';
  }
  // latency: did the fog make the difference, or was the plan already dead?
  if (run.fogCost > 0 && run.deadline + run.fogCost >= 0) return 'keep-slack-for-the-mist';
  if (run.road === 'long') return 'try-the-short-road';
  return 'spend-fewer-ticks';
}

export function deriveAutopsy(run) {
  const hops = run.events.filter((e) => e.type === 'hop');
  const path = ['src', ...hops.map((h) => h.to)];
  const toolsUsed = run.events
    .filter((e) => e.type === 'duplicate' || e.type === 'retransmit')
    .map((e) => e.type);
  const alive = run.fragments.filter((f) => f.status === 'with-party').length;

  const base = {
    seed: run.seed,
    payload: 'tcp-file',
    easy: !!run.mods,
    stars: run.stars,
    state: { fragments: alive, bw: run.bandwidth, deadline: run.deadline },
    path,
    toolsUsed,
  };

  if (run.outcome === 'rendered') {
    return { ...base, outcome: 'win', killerNode: null, killerConcept: null,
      suggestion: null, toolLine: null, conceptLine: null };
  }

  const hazard = MAP_1A.roads[run.road].hazard;
  const killerNode = run.failure.reason === 'missing-fragments'
    ? `${hazard.kind}-${hazard.impactNode}`
    : (hops.at(-1)?.to ?? run.node);
  const suggestion = suggestFor(run);
  return {
    ...base,
    outcome: 'fail',
    killerNode,
    killerConcept: run.failure.killerConcept,
    suggestion,
    toolLine: TOOL_LINES[suggestion],
    conceptLine: CONCEPT_LINES[run.failure.killerConcept],
  };
}

// Appends this run's autopsy to the persistent log (last 200 kept).
export function logRun(run, storage = globalThis.localStorage) {
  if (!storage) return null;
  const record = deriveAutopsy(run);
  const log = JSON.parse(storage.getItem('packet-run-log') ?? '[]');
  log.push(record);
  storage.setItem('packet-run-log', JSON.stringify(log.slice(-200)));
  return record;
}
