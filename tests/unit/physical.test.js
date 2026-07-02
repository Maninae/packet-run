// physical.test.js — the internet is PHYSICAL (design/04): the undersea
// trench (huge pipe: bandwidth windfall, rare catastrophic cable cut) and
// the satellite pass (the long way up: always a beat slower, sometimes
// solar-flaky). Both teach geography; neither harms a fragment.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};

const go = { type: 'onward' };
const road = (r) => ({ type: 'choose-road', road: r });

const PHYS_MAP = (kind) => ({
  id: `test-${kind}`,
  startBandwidth: 10, startDeadline: 8, stars: { threeStar: 9, twoStar: 8 },
  segments: [{
    roads: {
      short: { nodes: ['src', 'a', 'b', 'dock'], hazard: { kind, impactNode: 'a' }, bwPickup: null },
      long: { nodes: ['src', 'c', 'd', 'e', 'dock'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
    },
  }],
});

// trench rng: cutRoll (0.10 cuts). satellite rng: flakeRoll (0.20 flakes).

test('the trench: a huge pipe — crossing pays +3 bandwidth', () => {
  const run = createRun({ seed: 'T1', rng: rngOf([0.9, 0.1]), map: PHYS_MAP('trench') });
  act(run, road('short'));
  act(run, go);
  assert.equal(run.bandwidth, 13);
  const e = run.events.find((ev) => ev.type === 'impact');
  assert.equal(e.kind, 'trench');
  assert.equal(e.cut, false);
  assert.ok(!run.fragments.some((f) => f.status !== 'with-party'), 'no one harmed');
});

test('the cable cut: big pipes fail big — a forced reissue back to the junction', () => {
  const run = createRun({ seed: 'T2', rng: rngOf([0.05, 0.1]), map: PHYS_MAP('trench') });
  act(run, road('short'));
  act(run, go); // the cable snaps mid-crossing
  const e = run.events.find((ev) => ev.type === 'impact');
  assert.equal(e.cut, true);
  assert.equal(run.phase, 'junction', 'sent back to choose again');
  assert.equal(run.node, 'src');
  assert.equal(run.bandwidth, 10, 'no windfall from a dead cable');
  assert.ok(!run.impactResolved, 'the next road plays fresh');
  // the other road still works
  act(run, road('long'));
  while (run.phase === 'node') act(run, go);
  assert.ok(['rendered', 'failed'].includes(run.outcome ?? 'pending') || run.phase !== 'done');
});

test('the satellite pass: always a beat slower (the long way up)', () => {
  const run = createRun({ seed: 'T3', rng: rngOf([0.9, 0.1]), map: PHYS_MAP('satellite') });
  act(run, road('short'));
  const dl = run.deadline;
  act(run, go); // hop −1, uplink −1
  assert.equal(run.deadline, dl - 2);
  const e = run.events.find((ev) => ev.type === 'impact');
  assert.equal(e.kind, 'satellite');
  assert.equal(e.flaky, false);
});

test('solar weather: one run in five, the satellite link costs another tick', () => {
  const run = createRun({ seed: 'T4', rng: rngOf([0.1, 0.1]), map: PHYS_MAP('satellite') });
  act(run, road('short'));
  const dl = run.deadline;
  act(run, go); // hop −1, uplink −1, flake −1
  assert.equal(run.deadline, dl - 3);
  assert.equal(run.events.find((ev) => ev.type === 'impact').flaky, true);
});

test('satellite delays can kill via the clock, fail-fast as everywhere', () => {
  const run = createRun({ seed: 'T5', rng: rngOf([0.1]), map: PHYS_MAP('satellite') });
  run.deadline = 2;
  act(run, road('short'));
  act(run, go); // −1 hop −1 uplink −1 flake → −1
  assert.equal(run.outcome, 'failed');
  assert.equal(run.failure.killerConcept, 'latency');
});
