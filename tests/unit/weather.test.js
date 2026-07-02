// weather.test.js — weather is a biome SYSTEM (design/04): a seeded per-run
// state that makes the same map play differently. Rain and storms widen the
// gust spillover and thicken the fog; Act 3's solar flare makes every
// satellite pass flaky. Gentle-mode protection always wins over weather.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';
import { WEATHER, weatherFor, EASY } from '../../js/config.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};

const go = { type: 'onward' };
const road = (r) => ({ type: 'choose-road', road: r });

test('the sky is seeded: same seed, same weather; acts have their own skies', () => {
  assert.deepEqual(weatherFor('W1', 1), weatherFor('W1', 1));
  const seen = { 1: new Set(), 3: new Set() };
  for (let i = 0; i < 200; i++) {
    seen[1].add(weatherFor(`w-${i}`, 1).id);
    seen[3].add(weatherFor(`w-${i}`, 3).id);
  }
  assert.deepEqual([...seen[1]].sort(), ['clear', 'rain', 'storm']);
  assert.deepEqual([...seen[3]].sort(), ['clear', 'flare', 'rain']);
});

test('rainy weather widens the gust: the spillover chance rises', () => {
  assert.ok(WEATHER.rain.gustChance > 0.15);
  assert.ok(WEATHER.storm.gustChance > WEATHER.rain.gustChance);
  // a gust roll that misses in clear weather HITS in the rain
  const roll = 0.2; // > 0.15 (clear), < rain's chance
  const mk = (weather) => {
    const run = createRun({
      seed: 'WG', rng: rngOf([roll, 0.0, 0.1]), weather,
    });
    act(run, road('short'));
    act(run, go); act(run, go);
    return run.events.find((e) => e.type === 'impact').gust;
  };
  assert.equal(mk(null), null, 'clear: 0.2 misses');
  assert.ok(mk(WEATHER.rain), 'rain: 0.2 gusts');
});

test('rain thickens the fog: the worst stretch gets likelier', () => {
  const clearBad = 0.2;
  const rainBad = WEATHER.rain.fogOutcomes.at(-1).p;
  assert.ok(rainBad > clearBad);
});

test('the solar flare makes every satellite pass flaky', () => {
  const map = {
    id: 'test-flare',
    startBandwidth: 10, startDeadline: 10, stars: { threeStar: 9, twoStar: 8 },
    segments: [{
      roads: {
        short: { nodes: ['src', 'a', 'b', 'dock'], hazard: { kind: 'satellite', impactNode: 'a' }, bwPickup: null },
        long: { nodes: ['src', 'c', 'd', 'e', 'dock'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
      },
    }],
  };
  // flakeRoll 0.9 would MISS the 20% flake — the flare forces it anyway
  const run = createRun({ seed: 'WF', rng: rngOf([0.9, 0.1]), map, weather: WEATHER.flare });
  act(run, road('short'));
  const dl = run.deadline;
  act(run, go);
  assert.equal(run.deadline, dl - 3, 'hop −1, uplink −1, flare −1');
  assert.equal(run.events.find((e) => e.type === 'impact').flaky, true);
});

test('the world stays winnable under a storm front (regression fence)', async () => {
  const { generateMap } = await import('../../js/generator.js');
  const { segmentRoads } = await import('../../js/engine.js');
  let wins = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    const run = createRun({
      seed: `sky-${i}`, map: generateMap(`sky-${i}`, { act: 2 }), weather: WEATHER.storm,
    });
    for (let guard = 0; guard < 120 && run.phase !== 'done'; guard++) {
      const legal = legalActions(run);
      if (run.phase === 'event') { act(run, legal[0]); continue; }
      if (run.phase === 'reward') {
        // kit up against corruption like any sensible crosser
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
      act(run, fix ?? { type: 'onward' });
    }
    if (run.outcome === 'rendered') wins++;
  }
  assert.ok(wins / N >= 0.6,
    `an insuring player must survive most storm-front runs (got ${(wins / N * 100).toFixed(0)}%)`);
});

test('protection beats weather: gentle mods silence the storm-sky gusts', () => {
  const run = createRun({
    seed: 'WP', rng: rngOf([0.05, 0.1]), mods: EASY, weather: WEATHER.storm,
  });
  act(run, road('short'));
  act(run, go); act(run, go); // 0.05 would gust under ANY weather — mods win
  assert.equal(run.events.find((e) => e.type === 'impact').gust, null);
});
