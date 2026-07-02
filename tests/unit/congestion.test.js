// congestion.test.js — the bottleneck (design/04): a send-rate puzzle.
// Choose how many fragments to push per beat (1 → 2 → 4 ladder); success
// doubles your ceiling, overshooting the pipe's hidden capacity bounces the
// excess (nothing is lost — TIME is the price) and halves you back.
// Kids feel "ramp up, back off"; the popup names slow start/AIMD later.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};

const PIPE_MAP = {
  id: 'test-congestion',
  startBandwidth: 10, startDeadline: 12, stars: { threeStar: 9, twoStar: 8 },
  segments: [{
    roads: {
      short: { nodes: ['src', 'p1', 'p2', 'dock'], hazard: { kind: 'congestion', impactNode: 'p1' }, bwPickup: null },
      long: { nodes: ['src', 'c', 'd', 'e', 'dock'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
    },
  }],
};

const go = { type: 'onward' };
const road = (r) => ({ type: 'choose-road', road: r });
const send = (rate) => ({ type: 'send', rate });

// rng at a congestion impact: one capacityRoll (0..1 → capacity 1..3)
function intoPipe(capacityRoll, extra = []) {
  const run = createRun({ seed: 'P1', rng: rngOf([capacityRoll, ...extra]), map: PIPE_MAP });
  act(run, road('short'));
  act(run, go); // the bottleneck opens at p1
  return run;
}

test('the bottleneck opens: send is the only verb, slow start at rate 1', () => {
  const run = intoPipe(0.9); // capacity 3
  assert.ok(run.congestion, 'window state exists');
  const legal = legalActions(run);
  assert.ok(legal.every((a) => a.type === 'send'));
  assert.deepEqual(legal, [{ type: 'send', rate: 1 }], 'slow start: probe with one');
});

test('success doubles the ceiling: 1 → 2 → 4; each beat costs a tick', () => {
  const run = intoPipe(0.9); // capacity 3
  const d0 = run.deadline;
  act(run, send(1));
  assert.equal(run.deadline, d0 - 1);
  assert.deepEqual(legalActions(run).map((a) => a.rate), [1, 2]);
  act(run, send(2));
  assert.deepEqual(legalActions(run).map((a) => a.rate), [1, 2, 4]);
  assert.equal(run.congestion.crossed, 3);
});

test('overshoot: the pipe carries its capacity, the rest bounce, the ceiling halves', () => {
  const run = intoPipe(0.0); // capacity 2
  act(run, send(1)); // cautious… (1 across, ceiling 2)
  act(run, send(1)); // …too cautious (2 across, ceiling 4)
  act(run, send(4)); // greedy: 3 remain, pipe fits 2 — one bounces
  const e = run.events.findLast((ev) => ev.type === 'send');
  assert.equal(e.crossed, 2);
  assert.equal(e.bounced, 1);
  assert.equal(run.congestion.crossed, 4);
  assert.deepEqual(legalActions(run).map((a) => a.rate), [1, 2], 'halved from 4 back to 2');
  assert.equal(run.fragments.filter((f) => f.status === 'with-party').length, 5,
    'nothing is lost to congestion — time is the price');
});

test('crossing everyone closes the window and the road reopens', () => {
  const run = intoPipe(0.9, [0.1]); // capacity 3; kind fog later
  act(run, send(1));
  act(run, send(2));
  act(run, send(2)); // 5/5 across
  assert.equal(run.congestion, null);
  assert.ok(run.events.some((e) => e.type === 'congestion-cleared'));
  assert.ok(legalActions(run).some((a) => a.type === 'onward'));
  act(run, go); act(run, go);
  assert.equal(run.outcome, 'rendered');
});

test('the clock can kill mid-pipe (fail-fast, as everywhere)', () => {
  const run = intoPipe(0.0); // capacity 1: five slow beats minimum
  run.deadline = 2;
  act(run, send(1));
  act(run, send(1));
  act(run, send(1)); // deadline dips below zero
  assert.equal(run.outcome, 'failed');
  assert.equal(run.failure.killerConcept, 'latency');
});

test('a smaller party needs fewer crossings (losses upstream shrink the job)', () => {
  const run = createRun({ seed: 'P2', rng: rngOf([0.9, 0.9]), map: {
    ...PIPE_MAP,
    segments: [{
      roads: {
        short: { nodes: ['src', 's1', 'p1', 'dock'], hazard: { kind: 'storm', impactNode: 's1', threatens: [2, 4] }, bwPickup: null },
        long: PIPE_MAP.segments[0].roads.long,
      },
    }],
  } });
  // lose #2/#4 to the storm (no gust: 0.9), then hand-place a congestion window
  act(run, road('short'));
  act(run, go);
  run.congestion = { capacity: 3, maxRate: 4, crossed: 0 };
  act(run, send(2));
  assert.ok(run.congestion, '2 of 3 across — one to go');
  act(run, send(1));
  assert.equal(run.congestion, null, '3 alive fragments = 3 crossings');
});
