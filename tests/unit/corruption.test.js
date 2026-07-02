// corruption.test.js — The Static's domain (design/04): a hazard window that
// scrambles ONE hidden fragment. Checksum (1 BW) reveals which; Repair (2 BW)
// fixes a revealed one; the dock's receiver-side check fails a corrupted
// render. Copies do NOT protect against corruption — Duplicate insures
// against loss; Checksum/Repair own corruption (distinct verbs).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};

// A tiny hand map with a static zone on the short road.
const STATIC_MAP = {
  id: 'test-static',
  startBandwidth: 10,
  startDeadline: 8,
  stars: { threeStar: 9, twoStar: 8 },
  segments: [{
    roads: {
      short: {
        nodes: ['src', 'x1', 'x2', 'dock'],
        hazard: { kind: 'static', impactNode: 'x1', corrupts: 1 },
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
const road = (r) => ({ type: 'choose-road', road: r });

// rng order on a static impact: corruptPick. (No gust on static zones.)
// The kit is belt-gated since 1b-v: these tests carry Checksum + Repair.
function intoStatic(rngValues) {
  const run = createRun({ seed: 'C1', rng: rngOf(rngValues), map: STATIC_MAP });
  run.belt.push('checksum', 'repair');
  act(run, road('short'));
  act(run, go); // impact crossing into x1
  return run;
}

test('the Static scrambles one hidden fragment: state knows, the event does not say which', () => {
  const run = intoStatic([0.0, 0.9]); // corruptPick → #1; fog later
  const corrupted = run.fragments.filter((f) => f.corrupted);
  assert.equal(corrupted.length, 1);
  assert.equal(corrupted[0].id, 1);
  assert.equal(corrupted[0].revealed, false);
  assert.equal(corrupted[0].status, 'with-party', 'a scrambled fragment still travels');
  const impact = run.events.find((e) => e.type === 'impact');
  assert.equal(impact.kind, 'static');
  assert.equal(impact.scrambled, 1);
  assert.equal('fragment' in impact, false, 'the event never names the victim');
});

test('Checksum: 1 BW, reveals the scrambled fragment; then no longer offered', () => {
  const run = intoStatic([0.0, 0.9]);
  assert.ok(legalActions(run).some((a) => a.type === 'checksum'));
  act(run, { type: 'checksum' });
  assert.equal(run.bandwidth, 9);
  const f1 = run.fragments.find((f) => f.id === 1);
  assert.equal(f1.revealed, true);
  assert.deepEqual(run.events.find((e) => e.type === 'checksum').found, [1]);
  assert.ok(!legalActions(run).some((a) => a.type === 'checksum'),
    'nothing left to find — checksum not offered');
});

test('Repair: 2 BW, fixes only a REVEALED fragment', () => {
  const run = intoStatic([0.0, 0.9]);
  assert.ok(!legalActions(run).some((a) => a.type === 'repair'),
    'repair needs a revealed target');
  act(run, { type: 'checksum' });
  assert.ok(legalActions(run).some((a) => a.type === 'repair' && a.fragment === 1));
  act(run, { type: 'repair', fragment: 1 });
  assert.equal(run.bandwidth, 7);
  const f1 = run.fragments.find((f) => f.id === 1);
  assert.equal(f1.corrupted, false);
  assert.equal(f1.revealed, false);
  assert.ok(run.events.some((e) => e.type === 'repair' && e.fragment === 1));
});

test('a corrupted fragment at the dock fails the render (receiver-side check)', () => {
  const run = intoStatic([0.0, 0.1]); // corrupt #1; kind fog
  act(run, go); // x2 (penultimate: fog)
  act(run, go); // dock
  assert.equal(run.outcome, 'failed');
  assert.equal(run.failure.reason, 'corrupted-payload');
  assert.equal(run.failure.killerConcept, 'corruption');
});

test('checksum then repair en route saves the render', () => {
  const run = intoStatic([0.0, 0.1]);
  act(run, { type: 'checksum' });
  act(run, { type: 'repair', fragment: 1 });
  act(run, go);
  act(run, go);
  assert.equal(run.outcome, 'rendered');
});

test('a copy does not shield against the Static (corruption ≠ loss)', () => {
  const run = createRun({ seed: 'C2', rng: rngOf([0.0, 0.9]), map: STATIC_MAP });
  act(run, road('short'));
  act(run, { type: 'duplicate', fragment: 1 });
  act(run, go); // static hits #1 (pick 0.0 among all five with-party)
  const f1 = run.fragments.find((f) => f.id === 1);
  assert.equal(f1.corrupted, true);
  assert.equal(f1.hasCopy, true, 'the copy is untouched — and unhelpful here');
});

test('weather roads on the same map still work (drizzle + gust untouched)', () => {
  const run = createRun({ seed: 'C3', rng: rngOf([0.9, 0.1]), map: STATIC_MAP });
  act(run, road('long'));
  act(run, go);
  act(run, go); // drizzle impact at y2 sweeps #3, no gust
  assert.equal(run.fragments.find((f) => f.id === 3).status, 'lost');
  assert.ok(!legalActions(run).some((a) => a.type === 'checksum'),
    'no corruption on this road — no checksum offered');
});
