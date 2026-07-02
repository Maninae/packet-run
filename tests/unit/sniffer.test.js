// sniffer.test.js — the eavesdropper (design/04) and the Encryption Cloak
// (design/03). A sniffer's tamper IS corruption (scrambled bits, caught by
// checksums — real receivers catch tampering the same way). The Cloak foils
// it completely; its handshake costs a beat; sealed fragments stay VISIBLE
// on the wire — it sees them pass, it reads nothing (design/07).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};

const SNIFFER_MAP = {
  id: 'test-sniffer',
  startBandwidth: 10, startDeadline: 8, stars: { threeStar: 9, twoStar: 8 },
  segments: [{
    roads: {
      short: { nodes: ['src', 'n1', 'n2', 'dock'], hazard: { kind: 'sniffer', impactNode: 'n1' }, bwPickup: null },
      long: { nodes: ['src', 'c', 'd', 'e', 'dock'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
    },
  }],
};

const go = { type: 'onward' };
const road = (r) => ({ type: 'choose-road', road: r });

test('unsealed: the sniffer tampers — one hidden fragment is scrambled', () => {
  // rng at a sniffer impact: victimPick (like the Static)
  const run = createRun({ seed: 'S1', rng: rngOf([0.0, 0.1]), map: SNIFFER_MAP });
  act(run, road('short'));
  act(run, go);
  const corrupted = run.fragments.filter((f) => f.corrupted);
  assert.equal(corrupted.length, 1);
  assert.equal(corrupted[0].revealed, false, 'hidden until a Checksum');
  const impact = run.events.find((e) => e.type === 'impact');
  assert.equal(impact.kind, 'sniffer');
  assert.equal(impact.foiled, false);
});

test('sealed: the Cloak foils the sniffer at zero cost — it sees, it cannot read', () => {
  const run = createRun({ seed: 'S2', rng: rngOf([0.0, 0.1]), map: SNIFFER_MAP });
  run.belt.push('cloak');
  const bw = run.bandwidth;
  const dl = run.deadline;
  act(run, road('short'));
  act(run, go);
  assert.ok(!run.fragments.some((f) => f.corrupted), 'nothing tampered');
  const impact = run.events.find((e) => e.type === 'impact');
  assert.equal(impact.foiled, true);
  assert.equal(run.bandwidth, bw);
  assert.equal(run.deadline, dl - 1, 'only the hop was paid');
});

test('taking the Cloak at a reward costs the handshake beat (1 Deadline)', () => {
  const map = {
    ...SNIFFER_MAP,
    segments: [
      { roads: {
        short: { nodes: ['src', 'a', 'j1'], hazard: { kind: 'drizzle', impactNode: 'a', threatens: [5] }, bwPickup: null },
        long: { nodes: ['src', 'b', 'c', 'j1'], hazard: null, bwPickup: null },
      } },
      SNIFFER_MAP.segments[0] && { roads: {
        short: { nodes: ['j1', 'n1', 'dock'], hazard: { kind: 'sniffer', impactNode: 'n1' }, bwPickup: null },
        long: { nodes: ['j1', 'd', 'e', 'dock'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
      } },
    ],
  };
  const run = createRun({ seed: 'S3', rng: rngOf([0.9, 0.5, 0.5, 0.5, 0.5, 0.5]), map });
  act(run, road('long')); // quiet road to the reward beat
  while (run.phase === 'node') act(run, go);
  assert.equal(run.phase, 'reward');
  // force the cloak into the options for the test
  run.rewardOptions = [{ kind: 'tool', tool: 'cloak' }, { kind: 'tool', tool: 'checksum' },
    { kind: 'bandwidth', amount: 3 }];
  const dl = run.deadline;
  act(run, { type: 'take-reward', index: 0 });
  assert.ok(run.belt.includes('cloak'));
  assert.equal(run.deadline, dl - 1, 'the handshake takes a beat');
});

test('the cloak is in the reward pool (five tools now compete for four slots)', () => {
  const { BELT } = { BELT: null };
  return import('../../js/config.js').then((config) => {
    assert.ok(config.BELT.rewardPool.includes('cloak'));
    assert.equal(config.BELT.rewardPool.length, 5);
    assert.equal(config.BELT.slots, 4);
  });
});
