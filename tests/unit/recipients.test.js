// recipients.test.js — Phase 5 narrative: every act delivers to a PERSON
// (design/06), and the traveler's cache event stocks the pouch (design/03:
// items found at Events). The campaign ends where it began: Grandma, with
// the Static in between.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, act } from '../../js/engine.js';
import { RECIPIENTS, recipientFor, EVENTS } from '../../js/config.js';

const go = { type: 'onward' };
const road = (r) => ({ type: 'choose-road', road: r });

test('five recipients, one per act; the campaign ends where it began', () => {
  assert.equal(RECIPIENTS.length, 5);
  assert.match(RECIPIENTS[0].name, /grandma/i);
  assert.match(RECIPIENTS[4].name, /grandma/i);
  for (const r of RECIPIENTS) {
    assert.ok(r.dockLabel, 'the dock is a place on the map');
    assert.equal(r.message.length, 5, 'five lines for five fragments');
    assert.ok(r.winLine.length > 0);
  }
  assert.equal(recipientFor(2), RECIPIENTS[1]);
  assert.equal(recipientFor(99), RECIPIENTS[4], 'clamps past the ladder');
});

test('the traveler\'s cache event grants a pouch item — gated on space', () => {
  const cacheCard = EVENTS.findIndex((e) => e.options.some((o) => o.effects.pouchItem));
  assert.ok(cacheCard >= 0, 'a pouch-granting card exists');
  const MAP = {
    id: 'test-pouch-event',
    startBandwidth: 10, startDeadline: 8, stars: { threeStar: 9, twoStar: 8 },
    segments: [{
      roads: {
        short: { nodes: ['src', 'a', 'b', 'dock'], hazard: null, bwPickup: null,
          event: { node: 'a', card: cacheCard } },
        long: { nodes: ['src', 'c', 'd', 'e', 'dock'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
      },
    }],
  };
  const run = createRun({ seed: 'PE1', map: MAP });
  act(run, road('short'));
  act(run, go);
  assert.equal(run.phase, 'event');
  const takeIdx = EVENTS[cacheCard].options.findIndex((o) => o.effects.pouchItem);
  act(run, { type: 'choose-event', option: takeIdx });
  assert.equal(run.pouch.length, 1, 'the item joined the pouch');

  // with a full pouch, the take option is not offered
  const full = createRun({ seed: 'PE2', map: MAP, pouch: ['boost', 'boost', 'boost'] });
  act(full, road('short'));
  act(full, go);
  const { legalActions } = { legalActions: null };
  return import('../../js/engine.js').then(({ legalActions }) => {
    const options = legalActions(full).map((a) => a.option);
    assert.ok(!options.includes(takeIdx), 'no room, no take');
  });
});
