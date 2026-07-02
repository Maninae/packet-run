// engine.test.js — Phase 1a engine behavior, spec'd from design/02-core-loop.md
// and the build card in design/09-build-plan.md. The engine is headless: these
// tests ARE a complete playthrough harness (and the simulator reuses it).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';

// Deterministic rng for tests: consumes the given values in order, then 0.5s.
// Engine rng consumption order (documented in engine.js):
//   at impact: gustRoll, then gustPick (only if gust fired); at penult: fogRoll.
const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};

const NO_GUST = 0.9; // > 0.15
const GUST = 0.05;   // < 0.15
const FOG_NONE = 0.1;   // < 0.4  → 0
const FOG_SLOW = 0.5;   // < 0.8  → −1
const FOG_DEEP = 0.95;  // else   → −2

function types(actions) {
  return actions.map((a) => a.type + (a.road ? `:${a.road}` : '') + (a.fragment ? `:${a.fragment}` : ''));
}

function playTo(run, actions) {
  for (const a of actions) act(run, a);
  return run;
}

// shorthand action builders
const road = (r) => ({ type: 'choose-road', road: r });
const dup = (n) => ({ type: 'duplicate', fragment: n });
const retx = (n) => ({ type: 'retransmit', fragment: n });
const go = { type: 'onward' };

// Walk the short road with no tool use: junction → s1 → s2 → s3 → dock.
const SHORT_WALK = [road('short'), go, go, go, go];

test('createRun: v0 starting state', () => {
  const run = createRun({ seed: 'TEST' });
  assert.equal(run.bandwidth, 10);
  assert.equal(run.deadline, 8);
  assert.equal(run.fragments.length, 5);
  assert.ok(run.fragments.every((f) => f.status === 'with-party' && !f.hasCopy));
  assert.equal(run.phase, 'junction');
  assert.equal(run.node, 'src');
  assert.equal(run.seed, 'TEST');
});

test('junction: both roads offered, movement locked until one is chosen', () => {
  const run = createRun({ seed: 'TEST' });
  const legal = types(legalActions(run));
  assert.ok(legal.includes('choose-road:short') && legal.includes('choose-road:long'));
  assert.ok(!legal.includes('onward'), 'no moving without a road');
  // tools stay usable at junctions (insure before you commit)
  assert.ok(legal.includes('duplicate:1'));
  assert.throws(() => act(run, go), /illegal/i);
});

test('choosing a road commits it and allows onward + preemptive Duplicate', () => {
  const run = createRun({ seed: 'TEST' });
  act(run, road('short'));
  assert.equal(run.road, 'short');
  assert.equal(run.phase, 'node');
  assert.equal(run.node, 'src');
  const legal = types(legalActions(run));
  assert.ok(legal.includes('onward'));
  assert.ok(legal.includes('duplicate:2'));
  assert.ok(!legal.some((t) => t.startsWith('retransmit')), 'nothing lost yet');
});

test('onward: each hop costs 1 Deadline and advances the party', () => {
  const run = createRun({ seed: 'TEST' });
  playTo(run, [road('short'), go]);
  assert.equal(run.node, 's1');
  assert.equal(run.deadline, 7);
});

test('Duplicate: costs 3 BW, marks the copy, one per fragment, never on a copy', () => {
  const run = createRun({ seed: 'TEST' });
  playTo(run, [road('short'), dup(2)]);
  assert.equal(run.bandwidth, 7);
  assert.ok(run.fragments.find((f) => f.id === 2).hasCopy);
  assert.throws(() => act(run, dup(2)), /illegal/i, 'no copying copies / one copy per fragment');
});

test('Duplicate is preemptive only: illegal once the impact has passed', () => {
  const run = createRun({ seed: 'TEST', rng: rngOf([NO_GUST]) });
  playTo(run, [road('short'), go, go]); // impact resolves crossing s1→s2
  assert.ok(!types(legalActions(run)).some((t) => t.startsWith('duplicate')));
  assert.throws(() => act(run, dup(1)), /illegal/i);
});

test('storm impact: sweeps the telegraphed #2 and #4', () => {
  const run = createRun({ seed: 'TEST', rng: rngOf([NO_GUST]) });
  playTo(run, [road('short'), go, go]);
  const lost = run.fragments.filter((f) => f.status === 'lost').map((f) => f.id);
  assert.deepEqual(lost, [2, 4]);
  const impact = run.events.find((e) => e.type === 'impact');
  assert.deepEqual(impact.swept, [2, 4]);
  assert.equal(impact.gust, null);
});

test('a copy steps in: insured fragment survives the sweep, copy is consumed', () => {
  const run = createRun({ seed: 'TEST', rng: rngOf([NO_GUST]) });
  playTo(run, [road('short'), dup(2), go, go]);
  const f2 = run.fragments.find((f) => f.id === 2);
  assert.equal(f2.status, 'with-party');
  assert.equal(f2.hasCopy, false, 'copy consumed');
  const impact = run.events.find((e) => e.type === 'impact');
  assert.deepEqual(impact.swept, [4]);
  assert.deepEqual(impact.saved, [2]);
});

test('gust tail: one extra unnamed fragment swept; a copy can absorb it', () => {
  // gust fires, picks index 0 of remaining candidates [1,3,5] → #1
  const bare = createRun({ seed: 'TEST', rng: rngOf([GUST, 0.0]) });
  playTo(bare, [road('short'), go, go]);
  assert.equal(bare.fragments.find((f) => f.id === 1).status, 'lost');
  assert.deepEqual(bare.events.find((e) => e.type === 'impact').gust, { fragment: 1, saved: false });

  const insured = createRun({ seed: 'TEST', rng: rngOf([GUST, 0.0]) });
  playTo(insured, [road('short'), dup(1), go, go]);
  const f1 = insured.fragments.find((f) => f.id === 1);
  assert.equal(f1.status, 'with-party');
  assert.equal(f1.hasCopy, false, 'copy consumed by the gust');
  assert.deepEqual(insured.events.find((e) => e.type === 'impact').gust, { fragment: 1, saved: true });
});

test('response beat: Retransmit costs 2 BW + 1 Deadline; fragment rejoins at the next node', () => {
  const run = createRun({ seed: 'TEST', rng: rngOf([NO_GUST]) });
  playTo(run, [road('short'), go, go]); // at s2, #2 and #4 lost
  assert.ok(types(legalActions(run)).includes('retransmit:4'));
  act(run, retx(4));
  assert.equal(run.bandwidth, 8);
  assert.equal(run.deadline, 5); // 8 − 2 hops − 1 retransmit
  assert.equal(run.fragments.find((f) => f.id === 4).status, 'returning');
  act(run, go); // s2 → s3
  assert.equal(run.fragments.find((f) => f.id === 4).status, 'with-party');
  assert.ok(run.events.some((e) => e.type === 'rejoin' && e.fragments.includes(4)));
});

test('Retransmit stays available at later nodes while something is lost', () => {
  const run = createRun({ seed: 'TEST', rng: rngOf([NO_GUST, FOG_NONE]) });
  playTo(run, [road('short'), go, go, go]); // at s3, #2 and #4 still lost
  assert.ok(types(legalActions(run)).includes('retransmit:2'));
  act(run, retx(2)); // catches up at the NEXT node — the dock itself
  act(run, go);
  assert.equal(run.fragments.find((f) => f.id === 2).status, 'with-party');
});

test('Retransmit is illegal when nothing is lost or when unaffordable', () => {
  const run = createRun({ seed: 'TEST' });
  act(run, road('short'));
  assert.throws(() => act(run, retx(1)), /illegal/i);
});

test('bandwidth pickup: +2 on arriving at the relay node, logged', () => {
  const run = createRun({ seed: 'TEST', rng: rngOf([NO_GUST, FOG_NONE]) });
  playTo(run, [road('short'), go, go, go]); // arrive s3
  assert.equal(run.bandwidth, 12);
  assert.ok(run.events.some((e) => e.type === 'pickup' && e.amount === 2));
});

test('fog reveal at the penultimate node: outcome logged, cost applied on the final hop', () => {
  const run = createRun({ seed: 'TEST', rng: rngOf([NO_GUST, FOG_SLOW]) });
  playTo(run, [road('short'), go, go, go]);
  const fog = run.events.find((e) => e.type === 'fog-reveal');
  assert.equal(fog.cost, 1);
  const before = run.deadline;
  act(run, go); // final hop: −1 hop −1 fog
  assert.equal(run.deadline, before - 2);
});

test('render: all five at the dock with Deadline ≥ 0 wins; stars pay leftover BW', () => {
  // no tools, no gust, kind fog → arrive 5/5? No — the storm sweeps 2 and 4.
  // Insure both instead: the set-and-forget beginner line.
  const run = createRun({ seed: 'TEST', rng: rngOf([NO_GUST, FOG_NONE]) });
  playTo(run, [road('short'), dup(2), dup(4), go, go, go, go]);
  assert.equal(run.phase, 'done');
  assert.equal(run.outcome, 'rendered');
  assert.equal(run.bandwidth, 6); // 10 − 6 + 2 pickup
  assert.equal(run.stars, 1);
  assert.ok(run.events.some((e) => e.type === 'render'));
});

test('stars: ★★★ at ≥9 BW, ★★ at ≥8 — the gambler line hits ★★★', () => {
  // long road, recover the one: spend 2, pickup +2 → 10 BW at dock
  const run = createRun({ seed: 'TEST', rng: rngOf([NO_GUST, FOG_NONE]) });
  playTo(run, [road('long'), go, go, go]); // drizzle impact at l3 sweeps #3
  act(run, retx(3));
  playTo(run, [go, go, go, go]); // l4, l5, l6, dock
  assert.equal(run.outcome, 'rendered');
  assert.equal(run.bandwidth, 10);
  assert.equal(run.deadline, 0); // 8 − 7 hops − 1 retransmit − 0 fog
  assert.equal(run.stars, 3);
});

test('arriving incomplete fails the render: packet loss is the killer', () => {
  const run = createRun({ seed: 'TEST', rng: rngOf([NO_GUST, FOG_NONE]) });
  playTo(run, [road('short'), go, go, go, go]); // never recover #2/#4
  assert.equal(run.phase, 'done');
  assert.equal(run.outcome, 'failed');
  assert.equal(run.failure.reason, 'missing-fragments');
  assert.equal(run.failure.killerConcept, 'packet-loss');
});

test('the clock kills: Deadline below zero ends the run at that moment', () => {
  // long road + retransmit + deep fog: 8 − 7 − 1 − 2 < 0 (the gambler's bust)
  const run = createRun({ seed: 'TEST', rng: rngOf([NO_GUST, FOG_DEEP]) });
  playTo(run, [road('long'), go, go, go]);
  act(run, retx(3));
  playTo(run, [go, go, go]); // l4, l5, l6 — deadline now 0, fog −2 pending
  act(run, go); // final hop: −1 −2 → −3
  assert.equal(run.outcome, 'failed');
  assert.equal(run.failure.reason, 'deadline');
  assert.equal(run.failure.killerConcept, 'latency');
});

test('no action is legal after the run ends', () => {
  const run = createRun({ seed: 'TEST', rng: rngOf([NO_GUST, FOG_NONE]) });
  playTo(run, [road('short'), dup(2), dup(4), go, go, go, go]);
  assert.deepEqual(legalActions(run), []);
  assert.throws(() => act(run, go), /illegal/i);
});

test('same seed + same actions → identical outcome (shareable, retryable)', () => {
  const play = () => {
    const run = createRun({ seed: 'SEED42' });
    return playTo(run, [road('long'), go, go, go, retx(3), go, go, go, go]);
  };
  const a = play();
  const b = play();
  assert.equal(a.outcome, b.outcome);
  assert.equal(a.bandwidth, b.bandwidth);
  assert.equal(a.deadline, b.deadline);
  assert.deepEqual(a.events, b.events);
});

test('unaffordable tools are not offered: after three Duplicates, a fourth is illegal', () => {
  const run = createRun({ seed: 'TEST' });
  playTo(run, [road('short'), dup(1), dup(2), dup(3)]); // 10 − 9 = 1 BW left
  assert.ok(!types(legalActions(run)).some((t) => t.startsWith('duplicate')));
  assert.throws(() => act(run, dup(4)), /illegal/i);
});

test('the worked run trace from design/02 plays out exactly', () => {
  // Take left; Duplicate #2 on approach; storm sweeps (copy saves #2, #4 lost);
  // Retransmit #4; pickup +2; fog −1; dock 5/5, 2 Deadline slack, 7 BW.
  const run = createRun({ seed: 'TRACE', rng: rngOf([NO_GUST, FOG_SLOW]) });
  playTo(run, [road('short'), go]);        // at s1 (approach)
  act(run, dup(2));                         // 7 BW
  assert.equal(run.bandwidth, 7);
  act(run, go);                             // impact: #2 saved, #4 swept
  act(run, retx(4));                        // 5 BW, deadline 8−2−1 = 5
  assert.equal(run.bandwidth, 5);
  act(run, go);                             // s3: #4 rejoins, +2 BW → 7
  assert.equal(run.bandwidth, 7);
  act(run, go);                             // dock: hop −1, fog −1 → deadline 2
  assert.equal(run.outcome, 'rendered');
  assert.equal(run.deadline, 2);
  assert.equal(run.fragments.filter((f) => f.status === 'with-party').length, 5);
});
