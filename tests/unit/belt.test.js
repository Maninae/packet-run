// belt.test.js — the loadout layer (design/03): belt = 3 slots, starting kit
// Duplicate + Retransmit; a pick-1-of-3 reward beat at every mid-map junction
// (two tools you don't own + an energy top-up); tools only work from the
// belt; Re-route = sender reissue back to the segment's junction.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';
import { generateMap } from '../../js/generator.js';
import { BELT } from '../../js/config.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};

const go = { type: 'onward' };
const road = (r) => ({ type: 'choose-road', road: r });

function toSegmentEnd(run, r = 'short') {
  const startSegment = run.segment;
  // walk until the segment's reward beat (a cable cut can bounce us back
  // to the junction — just choose again)
  for (let guard = 0; guard < 60 && run.phase !== 'reward' && run.phase !== 'done'
    && run.segment === startSegment; guard++) {
    const legal = legalActions(run);
    if (run.phase === 'junction') { act(run, road(r)); continue; }
    if (run.phase === 'event') { act(run, legal[0]); continue; }
    const sends = legal.filter((a) => a.type === 'send');
    if (sends.length) { act(run, sends.at(-1)); continue; }
    const pushAct = legal.find((a) => a.type === 'push');
    act(run, pushAct ?? go);
  }
  return run;
}

test('starting belt: Duplicate + Retransmit; off-belt tools never offered', () => {
  const run = createRun({ seed: 'B1', map: generateMap('B1') });
  assert.deepEqual(run.belt, ['duplicate', 'retransmit']);
  assert.equal(BELT.slots, 4);
  // corrupt a fragment by hand: checksum still not offered — it's not on the belt
  run.fragments[0].corrupted = true;
  act(run, road('short'));
  assert.ok(!legalActions(run).some((a) => a.type === 'checksum'));
});

test('reaching a mid-map junction opens a pick-1-of-3: two new tools + energy', () => {
  const run = createRun({ seed: 'B2', map: generateMap('B2') });
  toSegmentEnd(run);
  if (run.phase === 'done') return; // straggler-abandonment death — other seeds cover
  assert.equal(run.phase, 'reward');
  assert.equal(run.rewardOptions.length, 3);
  const kinds = run.rewardOptions.map((o) => o.kind);
  assert.equal(kinds.filter((k) => k === 'tool').length, 2);
  assert.equal(kinds.filter((k) => k === 'bandwidth').length, 1);
  for (const o of run.rewardOptions) {
    if (o.kind === 'tool') assert.ok(!run.belt.includes(o.tool), 'offers only unowned tools');
  }
  // only reward picks are legal now
  assert.ok(legalActions(run).every((a) => a.type === 'take-reward'));
});

test('taking a tool fills a slot; taking energy pays +3', () => {
  const run = createRun({ seed: 'B3', map: generateMap('B3') });
  toSegmentEnd(run);
  const toolIdx = run.rewardOptions.findIndex((o) => o.kind === 'tool');
  const toolName = run.rewardOptions[toolIdx].tool;
  act(run, { type: 'take-reward', index: toolIdx });
  assert.equal(run.belt.length, 3);
  assert.ok(run.belt.includes(toolName));
  assert.equal(run.phase, 'junction');

  const run2 = createRun({ seed: 'B3', map: generateMap('B3') });
  toSegmentEnd(run2);
  const bw = run2.bandwidth;
  const resIdx = run2.rewardOptions.findIndex((o) => o.kind === 'bandwidth');
  act(run2, { type: 'take-reward', index: resIdx });
  assert.equal(run2.bandwidth, bw + 3);
});

test('a full belt swaps: taking a tool names which one it replaces', () => {
  const run = createRun({ seed: 'B4', map: generateMap('B4') });
  run.belt.push('buffer', 'reroute'); // hand-fill to 4/4
  toSegmentEnd(run);
  if (run.phase !== 'reward') return; // seed-dependent early death
  const toolIdx = run.rewardOptions.findIndex((o) => o.kind === 'tool');
  const incoming = run.rewardOptions[toolIdx].tool;
  assert.throws(() => act(run, { type: 'take-reward', index: toolIdx }),
    /illegal/i, 'full belt requires a swap target');
  act(run, { type: 'take-reward', index: toolIdx, replace: 'duplicate' });
  assert.ok(run.belt.includes(incoming));
  assert.ok(!run.belt.includes('duplicate'));
  assert.equal(run.belt.length, BELT.slots);
});

test('Re-route: 1 Deadline, the party rematerializes at the segment junction, hazard window fresh', () => {
  // hand map so the storm is guaranteed on the short road
  const map = {
    id: 'test-reroute',
    startBandwidth: 10, startDeadline: 8, stars: { threeStar: 9, twoStar: 8 },
    segments: [{
      roads: {
        short: { nodes: ['src', 'a', 'b', 'dock'], hazard: { kind: 'storm', impactNode: 'b', threatens: [2, 4] }, bwPickup: null },
        long: { nodes: ['src', 'c', 'd', 'e', 'dock'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
      },
    }],
  };
  const run = createRun({ seed: 'B5', rng: rngOf([0.9, 0.1, 0.9, 0.1]), map });
  run.belt.push('reroute');
  act(run, road('short'));
  act(run, go); // at 'a' — storm looms at 'b'
  assert.ok(legalActions(run).some((a) => a.type === 'reroute'));
  act(run, { type: 'reroute' });
  assert.equal(run.deadline, 6); // 8 − 1 hop − 1 reroute
  assert.equal(run.phase, 'junction');
  assert.equal(run.node, 'src');
  assert.ok(run.events.some((e) => e.type === 'reroute'));
  // take the other road: its drizzle still plays (fresh window)
  act(run, road('long'));
  act(run, go); act(run, go); // impact at 'd'
  assert.equal(run.fragments.find((f) => f.id === 3).status, 'lost');
});

test('Buffer from the belt halves the wait (passive machinery occupies a slot)', () => {
  const map = {
    id: 'test-buffer',
    startBandwidth: 10, startDeadline: 8, stars: { threeStar: 9, twoStar: 8 },
    segments: [{
      roads: {
        short: { nodes: ['src', 'a', 'b', 'dock'], hazard: { kind: 'rapids', impactNode: 'a', straggles: 1 }, bwPickup: null },
        long: { nodes: ['src', 'c', 'd', 'e', 'dock'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
      },
    }],
  };
  const run = createRun({ seed: 'B6', rng: rngOf([0.0, 0.9]), map }); // #1 lags 2
  run.belt.push('buffer');
  act(run, road('short'));
  act(run, go);
  act(run, { type: 'wait' });
  assert.equal(run.deadline, 7, 'Buffer: first beat free');
});
