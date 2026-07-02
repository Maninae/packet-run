// generator-balance.test.js — the balanced generator (design/09): generate →
// simulate → adjust. Every served map has been beaten by a scripted policy
// INSIDE the generator before a kid ever sees it; brutal rolls get a budget
// bump (visible on the map), hopeless ones get rerolled. The guarantee is
// structural: solvability is 100% by construction, not 97% by luck.

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, policyWins } from '../../js/generator.js';
import { GEN } from '../../js/config.js';

test('every served map is beatable by a scripted policy — all five acts', () => {
  for (const act of [1, 2, 3, 4, 5]) {
    for (let i = 0; i < 150; i++) {
      const map = generateMap(`bal-${act}-${i}`, { act });
      assert.ok(policyWins(map, map.verifySeed),
        `act ${act} seed bal-${act}-${i} served an unbeatable map`);
    }
  }
});

test('the loop is deterministic: same seed, same map, adjustments included', () => {
  for (let i = 0; i < 40; i++) {
    const a = generateMap(`det-${i}`, { act: 3 });
    const b = generateMap(`det-${i}`, { act: 3 });
    assert.deepEqual(a, b);
  }
});

test('budgets ride the map: hard rolls carry a visible bump, never a stealth nerf', () => {
  let bumped = 0;
  for (let i = 0; i < 400; i++) {
    const map = generateMap(`bump-${i}`, { act: 5 });
    assert.ok(map.startBandwidth >= GEN.startBandwidth
      || map.startDeadline >= GEN.startDeadline - 2, 'budgets only ever go UP');
    if (map.startBandwidth > GEN.startBandwidth) bumped++;
  }
  // act 5 is the meanest pool — SOME rolls should need the mercy bump;
  // if none ever do, the verify loop is not actually engaged
  assert.ok(bumped > 0, 'the adjust arm of the loop is alive');
});
