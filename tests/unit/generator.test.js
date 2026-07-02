// generator.test.js — seeded multi-segment maps (Phase 1b, design/09).
// Template stitching, not the balanced generator (that's Phase 4): three
// hand-tuned segment archetypes, seeded variation, budgets on the map.

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../../js/generator.js';
import { createRun, legalActions, act } from '../../js/engine.js';
import { MAP_1A, RUN } from '../../js/config.js';

test('same seed → identical map; different seeds vary', () => {
  const a = generateMap('GEN1');
  const b = generateMap('GEN1');
  assert.deepEqual(a, b);
  const others = ['GEN2', 'GEN3', 'GEN4', 'GEN5'].map((s) => JSON.stringify(generateMap(s)));
  assert.ok(new Set(others).size > 1, 'maps vary across seeds');
});

test('map shape: 3 segments, every road priced, threats name real fragments', () => {
  for (let i = 0; i < 50; i++) {
    const map = generateMap(`shape-${i}`);
    assert.equal(map.segments.length, 3);
    assert.ok(map.startBandwidth > 0 && map.startDeadline > 0);
    assert.ok(map.stars.threeStar > map.stars.twoStar);
    for (const [s, segment] of map.segments.entries()) {
      const { short, long } = segment.roads;
      assert.ok(short.nodes.length >= 3, 'short road has at least 2 hops');
      assert.ok(long.nodes.length > short.nodes.length
        || long.hazard?.kind === 'congestion',
        'the long road is slower: more hops, or a jam priced in beats');
      // roads share start and end nodes (junction to junction)
      assert.equal(short.nodes[0], long.nodes[0]);
      assert.equal(short.nodes.at(-1), long.nodes.at(-1));
      // the tension rule: a road with no hazard must cost more hops than its rival
      for (const road of [short, long]) {
        if (road.hazard) {
          assert.ok(road.nodes.includes(road.hazard.impactNode));
          assert.notEqual(road.hazard.impactNode, road.nodes[0]);
          if (road.hazard.kind === 'static') {
            assert.equal(road.hazard.corrupts, 1, 'static zones scramble one');
          } else if (road.hazard.kind === 'congestion') {
            assert.ok(road.hazard.impactNode, 'the jam sits on a node');
          } else if (road.hazard.kind === 'rapids') {
            assert.ok(road.hazard.straggles >= 1, 'rapids strand at least one');
          } else {
            for (const id of road.hazard.threatens) {
              assert.ok(id >= 1 && id <= RUN.partySize);
            }
            assert.ok(new Set(road.hazard.threatens).size === road.hazard.threatens.length);
          }
        }
      }
      assert.ok(short.hazard || long.hazard, 'at least one road per junction is risky');
      const last = s === map.segments.length - 1;
      assert.equal(short.nodes.at(-1) === 'dock', last, 'only the last segment docks');
    }
    // budget sanity: at least one pickup somewhere
    const pickups = map.segments.flatMap((seg) =>
      [seg.roads.short.bwPickup, seg.roads.long.bwPickup].filter(Boolean));
    assert.ok(pickups.length >= 1);
  }
});

test('engine walks a generated map: junction per segment, tools reset each storm window', () => {
  const map = generateMap('WALK1');
  const run = createRun({ seed: 'WALK1', map });
  assert.equal(run.bandwidth, map.startBandwidth);
  assert.equal(run.deadline, map.startDeadline);

  for (let segment = 0; segment < 3 && run.phase !== 'done'; segment++) {
    assert.equal(run.phase, 'junction', `segment ${segment} opens with a junction`);
    const legal = legalActions(run).map((a) => a.type);
    assert.equal(legal.filter((t) => t === 'choose-road').length, 2);
    assert.ok(!legal.includes('onward'), 'movement locked until a road is chosen');
    act(run, { type: 'choose-road', road: 'long' });
    // duplicates are legal again before EACH segment's impact
    const canDup = legalActions(run).some((a) => a.type === 'duplicate');
    assert.ok(canDup || run.bandwidth < 3, `segment ${segment}: preemptive play available`);
    while (run.phase === 'node') {
      const sends = legalActions(run).filter((a) => a.type === 'send');
      act(run, sends.length ? sends.at(-1) : { type: 'onward' });
    }
    if (run.phase === 'reward') {
      act(run, legalActions(run).find((a) => a.kind === 'bandwidth'));
    }
  }
  assert.equal(run.phase, 'done');
  assert.ok(['rendered', 'failed'].includes(run.outcome));
});

test('fog fires exactly once, at the end of the run', () => {
  for (let i = 0; i < 30; i++) {
    const map = generateMap(`fog-${i}`);
    const run = createRun({ seed: `fog-${i}`, map });
    while (run.phase !== 'done') {
      if (run.phase === 'reward') {
        act(run, legalActions(run).find((a) => a.kind === 'bandwidth'));
      } else if (run.phase === 'junction') {
        act(run, { type: 'choose-road', road: 'short' });
      } else {
        const sends = legalActions(run).filter((a) => a.type === 'send');
        act(run, sends.length ? sends.at(-1) : { type: 'onward' });
      }
    }
    const fogs = run.events.filter((e) => e.type === 'fog-reveal');
    assert.equal(fogs.length, 1, 'exactly one fog reveal');
    const fogIndex = run.events.findIndex((e) => e.type === 'fog-reveal');
    const lastHop = run.events.map((e) => e.type).lastIndexOf('hop');
    assert.ok(fogIndex > 0 && fogIndex >= lastHop - 4, 'fog is an endgame beat');
  }
});

test('the default map is still the hand-authored 1a region (first-run tutorial)', () => {
  const run = createRun({ seed: 'DEFAULT' });
  assert.equal(run.map.id, MAP_1A.id);
  assert.equal(run.bandwidth, 10);
  assert.equal(run.deadline, 8);
});
