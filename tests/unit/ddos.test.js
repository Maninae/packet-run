// ddos.test.js — the DDoS Swarm elite (design/10): a flood doesn't break the
// wire, it starves everyone using it. Three beats of siege: you rate-limit
// (push TWO fragments through per beat — triage is the verb), tools cost +1
// while it rages, holding is safe. No fail state inside the siege — the
// clock and the frozen economy are the vice.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';
import { TOOLS } from '../../js/config.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};

const go = { type: 'onward' };
const road = (r) => ({ type: 'choose-road', road: r });
const push = (n) => ({ type: 'push', fragment: n });

const SIEGE_MAP = {
  id: 'test-ddos',
  startBandwidth: 10, startDeadline: 10, stars: { threeStar: 9, twoStar: 8 },
  segments: [{
    roads: {
      short: { nodes: ['src', 'w1', 'w2', 'dock'], hazard: { kind: 'ddos', impactNode: 'w1' }, bwPickup: null },
      long: { nodes: ['src', 'c', 'd', 'e', 'dock'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
    },
  }],
};

function intoSiege() {
  const run = createRun({ seed: 'W1', rng: rngOf([0.1]), map: SIEGE_MAP });
  act(run, road('short'));
  act(run, go);
  return run;
}

test('the swarm hits: the siege owns the beat — push is the only movement', () => {
  const run = intoSiege();
  assert.ok(run.siege, 'siege window open');
  assert.equal(run.siege.beat, 0);
  const legal = legalActions(run);
  assert.ok(!legal.some((a) => a.type === 'onward'), 'no riding through a flood');
  assert.equal(legal.filter((a) => a.type === 'push').length, 5, 'anyone can be pushed');
});

test('two pushes make a beat: the second costs the tick', () => {
  const run = intoSiege();
  const dl = run.deadline;
  act(run, push(1));
  assert.equal(run.deadline, dl, 'first of the pair is free');
  assert.equal(run.fragments.find((f) => f.id === 1).status, 'pushed');
  act(run, push(2));
  assert.equal(run.deadline, dl - 1, 'the pair completes a beat');
  assert.equal(run.siege.beat, 1);
});

test('while it rages, rescues cost one more energy (the flood surcharge)', () => {
  const run = intoSiege();
  run.fragments.find((f) => f.id === 5).status = 'lost'; // a casualty from before
  const bw = run.bandwidth;
  act(run, { type: 'retransmit', fragment: 5 });
  assert.equal(run.bandwidth, bw - (TOOLS.retransmit.bw + 1), 'flood surcharge applied');
});

test('after three beats the swarm disperses: everyone regroups, the road reopens', () => {
  const run = intoSiege();
  act(run, push(1)); act(run, push(2)); // beat 1
  act(run, push(3)); act(run, push(4)); // beat 2
  act(run, push(5));                    // beat 3 (odd push, everyone pushed)
  assert.equal(run.siege, null, 'siege over — all alive fragments crossed');
  assert.ok(run.events.some((e) => e.type === 'siege-over'));
  assert.ok(run.fragments.every((f) => f.status === 'with-party'), 'regrouped');
  assert.ok(legalActions(run).some((a) => a.type === 'onward'));
});

test('you can hold some back: three beats pass and the swarm leaves anyway', () => {
  const run = intoSiege();
  const dl = run.deadline;
  act(run, push(1)); act(run, push(2));
  act(run, push(3)); act(run, push(4));
  act(run, { type: 'wait' }); // beat 3: hold the last one — waiting out the flood
  assert.equal(run.siege, null, 'three beats: the swarm disperses');
  assert.equal(run.deadline, dl - 3);
  assert.ok(run.fragments.every((f) => f.status === 'with-party'),
    'held fragments were safe all along');
});

test('the clock is the killer: a siege with no slack ends the run', () => {
  const run = intoSiege();
  run.deadline = 1;
  act(run, push(1)); act(run, push(2)); // −1 → 0
  act(run, push(3)); act(run, push(4)); // −1 → dead
  assert.equal(run.outcome, 'failed');
  assert.equal(run.failure.killerConcept, 'latency');
});
