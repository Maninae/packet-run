// pouch.test.js — one-shot consumables (design/03): game-flavor mercy that
// lives in the pouch, never on the belt. Boost tops up energy, the Spare
// re-materializes a lost fragment instantly (no clock cost), the Priority
// Stamp makes one fragment immune to the NEXT sweep — checked before copies.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';
import { POUCH } from '../../js/config.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};

const go = { type: 'onward' };
const road = (r) => ({ type: 'choose-road', road: r });

test('the pouch caps at three and its items are defined', () => {
  assert.ok(POUCH.boost && POUCH.spare && POUCH.stamp);
  const run = createRun({ seed: 'P1', pouch: ['boost', 'spare', 'stamp', 'boost'] });
  assert.equal(run.pouch.length, 3, 'a fourth item never fits');
});

test('Signal Boost: +3 energy, the slot empties', () => {
  const run = createRun({ seed: 'P2', pouch: ['boost'] });
  act(run, road('short'));
  const bw = run.bandwidth;
  act(run, { type: 'use-item', index: 0 });
  assert.equal(run.bandwidth, bw + 3);
  assert.equal(run.pouch.length, 0);
  assert.ok(run.events.some((e) => e.type === 'item-used' && e.item === 'boost'));
});

test('Spare Fragment: a lost fragment re-materializes instantly — no clock cost', () => {
  const run = createRun({ seed: 'P3', rng: rngOf([0.9, 0.1]), pouch: ['spare'] });
  act(run, road('short'));
  act(run, go); act(run, go); // the storm takes #2 and #4
  const dl = run.deadline;
  assert.ok(legalActions(run).some((a) => a.type === 'use-item' && a.fragment === 2));
  act(run, { type: 'use-item', index: 0, fragment: 2 });
  assert.equal(run.fragments.find((f) => f.id === 2).status, 'with-party',
    'instantly back — not "returning"');
  assert.equal(run.deadline, dl, 'the spare costs no time');
  assert.equal(run.pouch.length, 0);
});

test('the Spare needs a lost fragment: not offered when everyone is present', () => {
  const run = createRun({ seed: 'P4', pouch: ['spare'] });
  act(run, road('short'));
  assert.ok(!legalActions(run).some((a) => a.type === 'use-item'));
});

test('Priority Stamp: immune to the next sweep — checked before the copy', () => {
  const run = createRun({ seed: 'P5', rng: rngOf([0.9, 0.1]), pouch: ['stamp'] });
  act(run, road('short'));
  act(run, { type: 'use-item', index: 0, fragment: 2 });
  const f2 = run.fragments.find((f) => f.id === 2);
  assert.equal(f2.stamped, true);
  act(run, go); act(run, go); // storm sweeps #2 (stamped) and #4
  assert.equal(f2.status, 'with-party', 'the stamp absorbed the sweep');
  assert.equal(f2.stamped, false, 'one hazard only');
  assert.equal(run.fragments.find((f) => f.id === 4).status, 'lost');
  const impact = run.events.find((e) => e.type === 'impact');
  assert.deepEqual(impact.saved, [2]);
});
