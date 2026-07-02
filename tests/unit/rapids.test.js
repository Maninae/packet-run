// rapids.test.js — reorder rapids (design/04): fragments arrive scrambled
// with straggler(s) behind. Wait (−1 Deadline per beat, max 2) or press on
// (stragglers are lost unless later Retransmitted). Lag is VISIBLE — the
// choice is informed, and "sometimes waiting is right, sometimes pressing"
// falls out of lag sizes vs the clock. Buffer (a passive, acquired in 1b-v)
// halves the wait cost and is defined here.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};

const RAPIDS_MAP = {
  id: 'test-rapids',
  startBandwidth: 10,
  startDeadline: 8,
  stars: { threeStar: 9, twoStar: 8 },
  segments: [{
    roads: {
      short: {
        nodes: ['src', 'r1', 'r2', 'dock'],
        hazard: { kind: 'rapids', impactNode: 'r1', straggles: 2 },
        bwPickup: null,
      },
      long: {
        nodes: ['src', 'y1', 'y2', 'y3', 'dock'],
        hazard: { kind: 'drizzle', impactNode: 'y2', threatens: [3] },
        bwPickup: null,
      },
    },
  }],
};

const go = { type: 'onward' };
const wait = { type: 'wait' };

// rapids rng order: per straggler pick, then per-straggler lag roll
function intoRapids(rngValues) {
  const run = createRun({ seed: 'R1', rng: rngOf(rngValues), map: RAPIDS_MAP });
  act(run, { type: 'choose-road', road: 'short' });
  act(run, go); // impact crossing into r1
  return run;
}

// picks: 0.0 → #1; then among remaining 0.0 → #2. lags: 0.4 → 1 beat, 0.9 → 2 beats
const TWO_STRAGGLERS = [0.0, 0.4, 0.0, 0.9];

test('rapids: stragglers fall behind with visible lag; the party is scrambled, not harmed', () => {
  const run = intoRapids(TWO_STRAGGLERS);
  const stragglers = run.fragments.filter((f) => f.status === 'straggler');
  assert.deepEqual(stragglers.map((f) => [f.id, f.lag]), [[1, 1], [2, 2]]);
  const impact = run.events.find((e) => e.type === 'impact');
  assert.equal(impact.kind, 'rapids');
  assert.deepEqual(impact.stragglers, [{ fragment: 1, lag: 1 }, { fragment: 2, lag: 2 }]);
  assert.ok(legalActions(run).some((a) => a.type === 'wait'));
});

test('waiting: 1 Deadline per beat, lag counts down, caught-up stragglers rejoin', () => {
  const run = intoRapids(TWO_STRAGGLERS);
  act(run, wait);
  assert.equal(run.deadline, 6); // 8 − 1 hop − 1 wait
  assert.equal(run.fragments.find((f) => f.id === 1).status, 'with-party');
  assert.equal(run.fragments.find((f) => f.id === 2).lag, 1);
  act(run, wait);
  assert.equal(run.fragments.find((f) => f.id === 2).status, 'with-party');
  assert.ok(!legalActions(run).some((a) => a.type === 'wait'), 'no one left to wait for');
  assert.ok(run.events.filter((e) => e.type === 'rejoin').length >= 2);
});

test('the wait is capped at 2 beats per rapids', () => {
  // lags 2 and 2: after two waits everyone is back — cap never blocks a
  // recoverable wait; but a third wait must not be offered even mid-lag
  const run = intoRapids([0.0, 0.9, 0.0, 0.9]);
  act(run, wait);
  act(run, wait);
  assert.equal(run.fragments.filter((f) => f.status === 'with-party').length, 5);
  const run2 = intoRapids([0.0, 0.9, 0.0, 0.9]);
  act(run2, wait);
  assert.ok(legalActions(run2).some((a) => a.type === 'wait'), 'second wait offered');
});

test('pressing on abandons stragglers to lost — recoverable by Retransmit later', () => {
  const run = intoRapids(TWO_STRAGGLERS);
  act(run, go); // press on: r1 → r2
  const lost = run.fragments.filter((f) => f.status === 'lost').map((f) => f.id);
  assert.deepEqual(lost, [1, 2]);
  assert.ok(legalActions(run).some((a) => a.type === 'retransmit' && a.fragment === 1));
  act(run, { type: 'retransmit', fragment: 1 });
  act(run, go); // r2 → dock: #1 catches up at the dock
  assert.equal(run.fragments.find((f) => f.id === 1).status, 'with-party');
  assert.equal(run.outcome, 'failed', '#2 never came back');
  assert.equal(run.failure.reason, 'missing-fragments');
});

test('waiting through every lag then walking on wins clean', () => {
  const run = intoRapids([...TWO_STRAGGLERS, 0.1]); // + clear fog
  act(run, wait);
  act(run, wait);
  act(run, go);
  act(run, go);
  assert.equal(run.outcome, 'rendered');
  assert.equal(run.deadline, 8 - 3 - 2); // 3 hops + 2 waits
});

test('Buffer passive: two beats of waiting for the price of one', () => {
  const run = createRun({ seed: 'R2', rng: rngOf(TWO_STRAGGLERS), map: RAPIDS_MAP });
  run.passives.add('buffer');
  act(run, { type: 'choose-road', road: 'short' });
  act(run, go);
  act(run, wait); // buffer: first beat of a pair is free
  assert.equal(run.deadline, 7, 'first wait costs 0 with Buffer');
  act(run, wait);
  assert.equal(run.deadline, 6, 'second wait pays the 1');
  assert.equal(run.fragments.filter((f) => f.status === 'with-party').length, 5);
});
