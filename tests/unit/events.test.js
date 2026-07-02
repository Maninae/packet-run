// events.test.js — "?" nodes (design/04): pure text + one choice, priced.
// The CDN card is the teaching star: take the cache's copy (skip the rest of
// the road — the cache is CLOSER than home) for energy; the world reacts,
// the player never builds the CDN (design/07).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';
import { EVENTS } from '../../js/config.js';
import { generateMap } from '../../js/generator.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};

const go = { type: 'onward' };
const road = (r) => ({ type: 'choose-road', road: r });

const EVENT_MAP = (card) => ({
  id: 'test-event',
  startBandwidth: 10, startDeadline: 8, stars: { threeStar: 9, twoStar: 8 },
  segments: [
    { roads: {
      short: { nodes: ['src', 'a', 'b', 'j1'], hazard: null, bwPickup: null,
        event: { node: 'a', card } },
      long: { nodes: ['src', 'c', 'd', 'e', 'j1'], hazard: { kind: 'drizzle', impactNode: 'd', threatens: [3] }, bwPickup: null },
    } },
    { roads: {
      short: { nodes: ['j1', 'x', 'dock'], hazard: { kind: 'drizzle', impactNode: 'x', threatens: [5] }, bwPickup: null },
      long: { nodes: ['j1', 'y', 'z', 'dock'], hazard: null, bwPickup: null },
    } },
  ],
});

test('the event pool: four cards, each with two priced choices, kid-sized copy', () => {
  assert.equal(EVENTS.length, 4);
  for (const card of EVENTS) {
    assert.ok(card.title && card.text);
    assert.equal(card.options.length, 2);
    for (const option of card.options) {
      assert.ok(option.label.length > 0 && option.label.length < 60);
    }
  }
});

test('arriving at a "?" node opens the card: only its two choices are legal', () => {
  const run = createRun({ seed: 'E1', map: EVENT_MAP(1) });
  act(run, road('short'));
  act(run, go); // arrive at 'a'
  assert.equal(run.phase, 'event');
  assert.equal(run.eventCard, 1);
  assert.deepEqual(legalActions(run),
    [{ type: 'choose-event', option: 0 }, { type: 'choose-event', option: 1 }]);
  assert.throws(() => act(run, go), /illegal/i);
});

test('the mesh relay (card 1): a straight pick between energy and time', () => {
  const run = createRun({ seed: 'E2', map: EVENT_MAP(1) });
  act(run, road('short'));
  act(run, go);
  act(run, { type: 'choose-event', option: 0 }); // +2 energy
  assert.equal(run.bandwidth, 12);
  assert.equal(run.phase, 'node');
  assert.ok(run.events.some((e) => e.type === 'event-chosen' && e.card === 1));

  const run2 = createRun({ seed: 'E2', map: EVENT_MAP(1) });
  act(run2, road('short'));
  act(run2, go);
  act(run2, { type: 'choose-event', option: 1 }); // +1 tick
  assert.equal(run2.deadline, 8); // 8 − 1 hop + 1
});

test('the CDN shortcut (card 0): skip the rest of the road for 2 energy', () => {
  const run = createRun({ seed: 'E3', map: EVENT_MAP(0) });
  act(run, road('short'));
  act(run, go); // at 'a', 2 hops from j1
  act(run, { type: 'choose-event', option: 0 }); // take the cache's copy
  assert.equal(run.bandwidth, 8);
  assert.equal(run.node, 'j1', 'the cache is closer — the road remainder is skipped');
  assert.equal(run.phase, 'reward', 'segment end reached: the reward beat opens');
  assert.equal(run.deadline, 7, 'no extra hops were paid');

  const run2 = createRun({ seed: 'E3', map: EVENT_MAP(0) });
  act(run2, road('short'));
  act(run2, go);
  act(run2, { type: 'choose-event', option: 1 }); // walk on, keep the energy
  assert.equal(run2.bandwidth, 10);
  assert.equal(run2.phase, 'node');
});

test('the dusty router (card 2): reboot pays a tick; pushing through can strand one', () => {
  const safe = createRun({ seed: 'E4', map: EVENT_MAP(2) });
  act(safe, road('short'));
  act(safe, go);
  act(safe, { type: 'choose-event', option: 0 }); // reboot: −1 tick, safe
  assert.equal(safe.deadline, 6); // 8 − 1 hop − 1 reboot
  assert.ok(safe.fragments.every((f) => f.status === 'with-party'));

  // push through with a bad roll (rng: riskRoll 0.1 < 0.25, pick 0.0 → #1)
  const risky = createRun({ seed: 'E5', rng: rngOf([0.1, 0.0]), map: EVENT_MAP(2) });
  act(risky, road('short'));
  act(risky, go);
  act(risky, { type: 'choose-event', option: 1 });
  const f1 = risky.fragments.find((f) => f.id === 1);
  assert.equal(f1.status, 'straggler');
  assert.equal(f1.lag, 1, 'the old router hiccuped — one fragment lags a beat');
});

test('generated maps place events sometimes, never on impact or pickup nodes', () => {
  let placed = 0;
  for (let i = 0; i < 300; i++) {
    const map = generateMap(`ev-${i}`, { act: 2 });
    for (const segment of map.segments) {
      for (const r of Object.values(segment.roads)) {
        if (!r.event) continue;
        placed++;
        assert.ok(r.nodes.slice(1, -1).includes(r.event.node), 'event sits on an inner node');
        assert.notEqual(r.event.node, r.hazard?.impactNode);
        assert.notEqual(r.event.node, r.bwPickup?.node);
        assert.ok(r.event.card >= 0 && r.event.card < EVENTS.length);
      }
    }
  }
  assert.ok(placed > 30 && placed < 220, `event frequency sane (got ${placed}/300 maps)`);
});
