// autopsy.test.js — the loss autopsy (design/06): every finished run derives
// a compact JSON record — what killed it, which real concept that was, which
// tool might have saved you, one "on the real internet…" line. Same record
// powers the loss screen, balance tuning, and (later) the headless simulator.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';
import { deriveAutopsy, logRun } from '../../js/autopsy.js';

const rngOf = (values) => {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0.5);
};
const NO_GUST = 0.9;
const FOG_NONE = 0.1;
const FOG_DEEP = 0.95;

function walk(run, actions) {
  for (const a of actions) act(run, a);
  return run;
}
const road = (r) => ({ type: 'choose-road', road: r });
const go = { type: 'onward' };

test('storm loss with no tools: packet loss, named node, Duplicate suggested', () => {
  const run = createRun({ seed: 'A1', rng: rngOf([NO_GUST, FOG_NONE]) });
  walk(run, [road('short'), go, go, go, go]);
  const a = deriveAutopsy(run);
  assert.equal(a.outcome, 'fail');
  assert.equal(a.killerConcept, 'packet-loss');
  assert.equal(a.killerNode, 'storm-s2');
  assert.equal(a.suggestion, 'duplicate-before-storm');
  assert.deepEqual(a.path, ['src', 's1', 's2', 's3', 'dock']);
  assert.deepEqual(a.toolsUsed, []);
  assert.equal(a.state.fragments, 3);
  assert.match(a.conceptLine, /redundancy/i);
  assert.ok(a.toolLine.length > 0, 'kid-facing tool hint present');
});

test('deadline death in the fog: latency, slack suggested', () => {
  // long road + retransmit + deep fog = the gambler's bust (deadline < 0 at the end)
  const run = createRun({ seed: 'A2', rng: rngOf([NO_GUST, FOG_DEEP]) });
  walk(run, [road('long'), go, go, go, { type: 'retransmit', fragment: 3 }, go, go, go, go]);
  const a = deriveAutopsy(run);
  assert.equal(a.outcome, 'fail');
  assert.equal(a.killerConcept, 'latency');
  assert.equal(a.suggestion, 'keep-slack-for-the-mist');
  assert.match(a.conceptLine, /late/i);
  assert.deepEqual(a.toolsUsed, ['retransmit']);
});

test('deadline death without fog blame: the long road itself is the lesson', () => {
  // burn deadline with retransmits so even clear fog cannot save it? Instead:
  // deep fog but the run would have died anyway → suggestion blames the road.
  const run = createRun({ seed: 'A3', rng: rngOf([NO_GUST, FOG_DEEP]) });
  // two retransmits: deadline = 8 − 7 hops − 2 = −1 even before fog
  walk(run, [road('long'), go, go, go, { type: 'retransmit', fragment: 3 }]);
  run.fragments.find((f) => f.id === 1).status = 'lost'; // simulate a second loss
  walk(run, [{ type: 'retransmit', fragment: 1 }, go, go, go, go]);
  const a = deriveAutopsy(run);
  assert.equal(a.killerConcept, 'latency');
  assert.equal(a.suggestion, 'try-the-short-road');
});

test('a win derives too: no killer, stars and path recorded', () => {
  const run = createRun({ seed: 'A4', rng: rngOf([NO_GUST, FOG_NONE]) });
  walk(run, [road('short'), { type: 'duplicate', fragment: 2 }, { type: 'duplicate', fragment: 4 },
    go, go, go, go]);
  const a = deriveAutopsy(run);
  assert.equal(a.outcome, 'win');
  assert.equal(a.killerConcept, null);
  assert.equal(a.stars, 1);
  assert.deepEqual(a.toolsUsed, ['duplicate', 'duplicate']);
  assert.equal(a.state.fragments, 5);
});

test('logRun appends to storage and caps the log at 200 records', () => {
  const fake = (() => {
    const store = new Map();
    return {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, String(v)),
    };
  })();
  const run = createRun({ seed: 'A5', rng: rngOf([NO_GUST, FOG_NONE]) });
  walk(run, [road('short'), go, go, go, go]);
  for (let i = 0; i < 205; i++) logRun(run, fake);
  const log = JSON.parse(fake.getItem('packet-run-log'));
  assert.equal(log.length, 200);
  assert.equal(log[199].seed, 'A5');
  assert.equal(log[199].payload, 'tcp-file');
});
