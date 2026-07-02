// payload.test.js — the TCP/UDP contrast (design/05): same maps, opposite
// optimal play. A live call renders at ≥3/5 FRESH frames; there is no
// Retransmit — Skip (free) is the signature verb; stragglers age out after
// 3 beats; unacknowledged gaps stall the dock a tick each. A kid who wins a
// call run by deliberately abandoning stragglers has understood UDP.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';
import { PAYLOADS } from '../../js/config.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};

const go = { type: 'onward' };
const road = (r) => ({ type: 'choose-road', road: r });

const STORM_MAP = {
  id: 'test-call-storm',
  startBandwidth: 10, startDeadline: 8, stars: { threeStar: 9, twoStar: 8 },
  segments: [{
    roads: {
      short: { nodes: ['src', 'a', 'b', 'dock'], hazard: { kind: 'storm', impactNode: 'a', threatens: [2, 4] }, bwPickup: null },
      long: { nodes: ['src', 'c', 'd', 'e', 'dock'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
    },
  }],
};

const RAPIDS_MAP = {
  id: 'test-call-rapids',
  startBandwidth: 10, startDeadline: 8, stars: { threeStar: 9, twoStar: 8 },
  segments: [{
    roads: {
      short: { nodes: ['src', 'a', 'b', 'c', 'd', 'dock'], hazard: { kind: 'rapids', impactNode: 'a', straggles: 1 }, bwPickup: null },
      long: { nodes: ['src', 'x', 'y', 'z', 'w', 'v', 'dock'], hazard: { kind: 'drizzle', impactNode: 'y', threatens: [3] }, bwPickup: null },
    },
  }],
};

test('a call run starts with the call kit: Duplicate + Skip, no Retransmit', () => {
  const run = createRun({ seed: 'U1', map: STORM_MAP, payload: 'udp-call' });
  assert.equal(run.payload, 'udp-call');
  assert.deepEqual(run.belt, PAYLOADS['udp-call'].belt);
  assert.ok(!run.belt.includes('retransmit'));
});

test('losses on a call cannot be retransmitted — Skip acknowledges the gap for free', () => {
  const run = createRun({ seed: 'U2', rng: rngOf([0.9]), map: STORM_MAP, payload: 'udp-call' });
  act(run, road('short'));
  act(run, go); // storm sweeps #2 and #4
  const legal = legalActions(run);
  assert.ok(!legal.some((a) => a.type === 'retransmit'));
  assert.ok(legal.some((a) => a.type === 'skip' && a.fragment === 2));
  const bw = run.bandwidth;
  act(run, { type: 'skip', fragment: 2 });
  act(run, { type: 'skip', fragment: 4 });
  assert.equal(run.bandwidth, bw, 'Skip is free');
  assert.equal(run.fragments.filter((f) => f.status === 'skipped').length, 2);
});

test('the call renders at 3/5 — dropped frames and all', () => {
  const run = createRun({ seed: 'U3', rng: rngOf([0.9, 0.1]), map: STORM_MAP, payload: 'udp-call' });
  act(run, road('short'));
  act(run, go);
  act(run, { type: 'skip', fragment: 2 });
  act(run, { type: 'skip', fragment: 4 });
  act(run, go); act(run, go);
  assert.equal(run.outcome, 'rendered');
  assert.equal(run.events.find((e) => e.type === 'render').delivered, 3);
});

test('the same 3/5 arrival FAILS a file run (the contrast is the lesson)', () => {
  const run = createRun({ seed: 'U3', rng: rngOf([0.9, 0.1]), map: STORM_MAP, payload: 'tcp-file' });
  act(run, road('short'));
  act(run, go); act(run, go); act(run, go);
  assert.equal(run.outcome, 'failed');
  assert.equal(run.failure.reason, 'missing-fragments');
});

test('a call STUTTERS over unacknowledged gaps: +1 Deadline every beat until skipped', () => {
  const run = createRun({ seed: 'U4', rng: rngOf([0.9, 0.1]), map: STORM_MAP, payload: 'udp-call' });
  act(run, road('short'));
  act(run, go); // #2 and #4 swept, never skipped
  const before = run.deadline;
  act(run, go); // hop −1, stutter −1
  assert.equal(run.deadline, before - 2);
  assert.ok(run.events.some((e) => e.type === 'stutter' && e.fragments.length === 2));
  act(run, { type: 'skip', fragment: 2 });
  act(run, { type: 'skip', fragment: 4 });
  const steady = run.deadline;
  act(run, go); // acknowledged: the stutter stops — hop only
  assert.equal(run.deadline, steady - 1);
  assert.equal(run.outcome, 'rendered', '3/5 still plays');
});

test('on a call, a frame 2 beats behind is BORN expired — waiting cannot save it', () => {
  // rapids picks #1 with lag 2 (rng: pick 0.0, lag 0.9)
  const run = createRun({ seed: 'U5', rng: rngOf([0.0, 0.9, 0.1]), map: RAPIDS_MAP, payload: 'udp-call' });
  act(run, road('short'));
  act(run, go);
  const f1 = run.fragments.find((f) => f.id === 1);
  assert.equal(f1.status, 'expired', 'lag 2 ≥ freshness 2: its moment passed');
  assert.ok(!legalActions(run).some((a) => a.type === 'wait'),
    'nothing waitable — expired is not a straggler');
  assert.ok(legalActions(run).some((a) => a.type === 'skip' && a.fragment === 1));
  // the same lag-2 straggler on a FILE run is a normal, waitable straggler
  const file = createRun({ seed: 'U5', rng: rngOf([0.0, 0.9, 0.1]), map: RAPIDS_MAP });
  act(file, road('short'));
  act(file, go);
  assert.equal(file.fragments.find((f) => f.id === 1).status, 'straggler');
});

test('a lag-1 frame is still fresh: one wait saves it on a call', () => {
  // rng: pick 0.0 → #1, lag 0.4 → 1
  const run = createRun({ seed: 'U6', rng: rngOf([0.0, 0.4, 0.1]), map: RAPIDS_MAP, payload: 'udp-call' });
  act(run, road('short'));
  act(run, go);
  assert.equal(run.fragments.find((f) => f.id === 1).status, 'straggler');
  act(run, { type: 'wait' });
  assert.equal(run.fragments.find((f) => f.id === 1).status, 'with-party');
});

test('corrupted frames drop at the dock without failing the call', () => {
  const map = {
    id: 'test-call-static',
    startBandwidth: 10, startDeadline: 8, stars: { threeStar: 9, twoStar: 8 },
    segments: [{
      roads: {
        short: { nodes: ['src', 'a', 'b', 'dock'], hazard: { kind: 'static', impactNode: 'a', corrupts: 1 }, bwPickup: null },
        long: { nodes: ['src', 'c', 'd', 'e', 'dock'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
      },
    }],
  };
  const run = createRun({ seed: 'U8', rng: rngOf([0.0, 0.1]), map, payload: 'udp-call' });
  act(run, road('short'));
  act(run, go); act(run, go); act(run, go);
  assert.equal(run.outcome, 'rendered');
  assert.equal(run.events.find((e) => e.type === 'render').delivered, 4,
    'the corrupted frame was dropped, the call plays at 4/5');
});

test('a file run is unchanged by all of this (no aging, retransmit kit)', () => {
  const run = createRun({ seed: 'U9', map: STORM_MAP });
  assert.equal(run.payload, 'tcp-file');
  assert.deepEqual(run.belt, PAYLOADS['tcp-file'].belt);
});
