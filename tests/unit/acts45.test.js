// acts45.test.js — the campaign's back half (design/04): the Far Reaches,
// where SCARCITY is the challenge (underinvestment, never the people — the
// respect rule), and the Hostile Zone, the open internet's rough
// neighborhood (never "the dark net"). Plus the offline node: a Far
// Reaches signature — the node reboots for a beat.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';
import { generateMap } from '../../js/generator.js';
import { ACTS } from '../../js/config.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};
const go = { type: 'onward' };
const road = (r) => ({ type: 'choose-road', road: r });

function hazardKinds(map) {
  return new Set(map.segments.flatMap((s) =>
    Object.values(s.roads).map((r) => r.hazard?.kind).filter(Boolean)));
}

test('five acts now: the Far Reaches and the Hostile Zone join the ladder', () => {
  assert.equal(ACTS.length, 5);
  assert.match(ACTS[3].name, /far reaches/i);
  assert.match(ACTS[4].name, /hostile/i);
});

test('the Far Reaches run lean: less starting energy — scarcity is the lesson', () => {
  const map = generateMap('FR1', { act: 4 });
  assert.ok(map.startBandwidth < generateMap('FR1', { act: 3 }).startBandwidth,
    'a sparser grid gives you less to spend');
});

test('Far Reaches skies: satellite and offline nodes appear; the swarm does not', () => {
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    for (const kind of hazardKinds(generateMap(`fr-${i}`, { act: 4 }))) {
      seen.add(kind);
      assert.notEqual(kind, 'ddos', 'the swarm belongs to dense networks');
    }
  }
  assert.ok(seen.has('satellite'), 'often the only road across a gap');
  assert.ok(seen.has('offline'), 'power-cycling nodes are the signature');
});

test('the Hostile Zone crawls with sniffers and swarms', () => {
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    for (const kind of hazardKinds(generateMap(`hz-${i}`, { act: 5 }))) seen.add(kind);
  }
  assert.ok(seen.has('sniffer'));
  assert.ok(seen.has('ddos'));
});

test('an offline node: the router is rebooting — one forced beat, nothing harmed', () => {
  const map = {
    id: 'test-offline',
    startBandwidth: 10, startDeadline: 8, stars: { threeStar: 9, twoStar: 8 },
    segments: [{
      roads: {
        short: { nodes: ['src', 'o1', 'o2', 'dock'], hazard: { kind: 'offline', impactNode: 'o1' }, bwPickup: null },
        long: { nodes: ['src', 'c', 'd', 'e', 'dock'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
      },
    }],
  };
  const run = createRun({ seed: 'OFF1', rng: rngOf([0.1]), map });
  act(run, road('short'));
  const dl = run.deadline;
  act(run, go); // hop −1, reboot −1
  assert.equal(run.deadline, dl - 2);
  const impact = run.events.find((e) => e.type === 'impact');
  assert.equal(impact.kind, 'offline');
  assert.ok(run.fragments.every((f) => f.status === 'with-party'), 'nobody harmed');
});

test('scarcity stays fair: an insuring, kitted player survives the Far Reaches', () => {
  const { segmentRoads } = { segmentRoads: null };
  return import('../../js/engine.js').then(({ segmentRoads }) => {
    let wins = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const run = createRun({ seed: `frv-${i}`, map: generateMap(`frv-${i}`, { act: 4 }) });
      for (let guard = 0; guard < 120 && run.phase !== 'done'; guard++) {
        const legal = legalActions(run);
        if (run.phase === 'event') { act(run, legal[0]); continue; }
        if (run.phase === 'reward') {
          const kit = legal.find((a) => a.kind === 'tool'
            && (a.tool === 'checksum' || a.tool === 'repair') && !a.replace);
          act(run, kit ?? legal.find((a) => a.kind === 'bandwidth'));
          continue;
        }
        if (run.phase === 'junction') {
          act(run, road('short'));
          const hazard = segmentRoads(run).short.hazard;
          if (hazard?.threatens) {
            for (const id of hazard.threatens) {
              if (legalActions(run).some((a) => a.type === 'duplicate' && a.fragment === id)) {
                act(run, { type: 'duplicate', fragment: id });
              }
            }
          }
          continue;
        }
        const sends = legal.filter((a) => a.type === 'send');
        if (sends.length) { act(run, sends.at(-1)); continue; }
        const p = legal.find((a) => a.type === 'push');
        if (p) { act(run, p); continue; }
        const fix = legal.find((a) => ['retransmit', 'checksum', 'repair'].includes(a.type));
        act(run, fix ?? go);
      }
      if (run.outcome === 'rendered') wins++;
    }
    assert.ok(wins / N >= 0.55,
      `the Far Reaches must be hard, not hopeless (got ${(wins / N * 100).toFixed(0)}%)`);
  });
});
