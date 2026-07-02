// acts.test.js — Acts 1–3 as biomes (design/04): each act is a place with
// its own hazard mix, and the act ladder IS the curriculum — congestion
// appears Act 2 at the earliest, the ocean systems at Act 3 (cognitive-load
// gating). Wins climb the ladder until Phase 4's campaign spine.

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../../js/generator.js';
import { ACTS } from '../../js/config.js';

function hazardKinds(map) {
  return new Set(map.segments.flatMap((s) =>
    Object.values(s.roads).map((r) => r.hazard?.kind).filter(Boolean)));
}

test('three acts, named places, each with its own template pool', () => {
  assert.equal(ACTS.length, 3);
  assert.match(ACTS[0].name, /home/i);
  assert.match(ACTS[1].name, /city/i);
  assert.match(ACTS[2].name, /ocean/i);
});

test('Act 1 keeps to the basics: weather and rapids only', () => {
  for (let i = 0; i < 120; i++) {
    const kinds = hazardKinds(generateMap(`a1-${i}`, { act: 1 }));
    for (const kind of kinds) {
      assert.ok(['storm', 'drizzle', 'rapids'].includes(kind),
        `Act 1 rolled a ${kind}`);
    }
  }
});

test('Act 2 introduces the city systems: congestion and the Static', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    for (const kind of hazardKinds(generateMap(`a2-${i}`, { act: 2 }))) {
      seen.add(kind);
      assert.ok(!['trench', 'satellite', 'sniffer'].includes(kind),
        `Act 2 rolled the ocean-and-beyond ${kind}`);
    }
  }
  assert.ok(seen.has('congestion'), 'the send-rate puzzle is Act 2\'s signature');
  assert.ok(seen.has('static'), 'corruption joins in the city');
});

test('Act 3 opens the ocean: trench, satellite, sniffer appear', () => {
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    for (const kind of hazardKinds(generateMap(`a3-${i}`, { act: 3 }))) seen.add(kind);
  }
  for (const kind of ['trench', 'satellite', 'sniffer']) {
    assert.ok(seen.has(kind), `Act 3 should roll ${kind}`);
  }
});

test('an act pool never breaks the standing map constraints', () => {
  for (const act of [1, 2, 3]) {
    for (let i = 0; i < 60; i++) {
      const map = generateMap(`c${act}-${i}`, { act });
      const kinds = map.segments.map((s) => s.roads.short.hazard?.kind);
      assert.ok(!['static', 'sniffer'].includes(kinds[0]),
        'corruption-class never opens a map');
    }
  }
});
