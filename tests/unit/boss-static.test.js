// boss-static.test.js — The Static duel (design/10), SIMULATED BEFORE UI as
// the spec demands. A 4-beat duel at the Act-5 dock: the Static scrambles one
// hidden fragment per beat (TWO on beat 4 — five total); you answer with up
// to two actions per beat — Checksum (1 BW, reveals all), Repair (2 BW),
// Brace (bank an action for ANY later beat, spent on top of the base two).
// The banking rule is load-bearing: without it no 8-action line clears five
// scrambles. The optimal line: brace early, one late Checksum, bulk Repairs
// — 11 BW. The clock ticks every beat; the render rules stay honest.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';

const go = { type: 'onward' };
const road = (r) => ({ type: 'choose-road', road: r });

const BOSS_MAP = {
  id: 'test-static-duel',
  boss: 'static',
  startBandwidth: 12, startDeadline: 10, stars: { threeStar: 9, twoStar: 8 },
  segments: [{
    roads: {
      short: { nodes: ['src', 'a', 'dock'], hazard: null, bwPickup: null },
      long: { nodes: ['src', 'c', 'd', 'dock'], hazard: { kind: 'drizzle', impactNode: 'c', threatens: [3] }, bwPickup: null },
    },
  }],
};

function intoDuel(bw = 12, dl = 10) {
  const map = { ...BOSS_MAP, startBandwidth: bw, startDeadline: dl };
  const run = createRun({ seed: 'DUEL1', map });
  act(run, road('short'));
  act(run, go); act(run, go); // reach the dock — the tunnel of noise opens
  return run;
}

test('reaching the Act-5 dock opens the duel, not the render', () => {
  const run = intoDuel();
  assert.equal(run.phase, 'duel');
  assert.equal(run.duel.beat, 1);
  assert.equal(run.duel.actionsLeft, 2);
  assert.equal(run.duel.banked, 0);
  assert.equal(run.fragments.filter((f) => f.corrupted).length, 1,
    'the Static struck as the beat opened');
  assert.ok(run.events.some((e) => e.type === 'duel-start'));
});

test('Brace banks an action; banked actions spend on later beats ON TOP of two', () => {
  const run = intoDuel();
  act(run, { type: 'brace' });
  act(run, { type: 'brace' }); // both actions banked → beat ends
  assert.equal(run.duel.beat, 2);
  assert.equal(run.duel.banked, 2);
  assert.equal(run.duel.actionsLeft, 2, 'a fresh base two each beat');
  // beat 2: base two + both banked = four actions available
  act(run, { type: 'duel-checksum' });
  act(run, { type: 'brace' });
  assert.equal(run.duel.actionsLeft, 0);
  assert.ok(legalActions(run).some((a) => a.type === 'duel-repair'),
    'banked actions keep the beat alive');
});

test('the optimal line from the spec: brace early, one Checksum, bulk Repairs — 11 BW', () => {
  const run = intoDuel(11, 10);
  // beats 1–3: brace everything (bank 6). Once a bank exists, the beat
  // waits for an explicit Hold — you might have spent the banked actions.
  for (let beat = 1; beat <= 3; beat++) {
    act(run, { type: 'brace' });
    act(run, { type: 'brace' });
    if (run.duel.beat === beat) act(run, { type: 'hold' });
  }
  assert.equal(run.duel.beat, 4);
  assert.equal(run.duel.banked, 6);
  assert.equal(run.fragments.filter((f) => f.corrupted).length, 5,
    'beat 4 opened with the double surge — five scrambles total');
  // the burst: one Checksum reveals all five, then five Repairs (2 base + 4 banked)
  act(run, { type: 'duel-checksum' });
  for (const f of run.fragments.filter((x) => x.corrupted)) {
    act(run, { type: 'duel-repair', fragment: f.id });
  }
  assert.equal(run.bandwidth, 0, '1 + 5×2 = 11 BW, exactly the spec');
  act(run, { type: 'hold' }); // end the beat with one banked action to spare
  assert.equal(run.phase, 'done');
  assert.equal(run.outcome, 'rendered', 'clean fragments render');
  assert.ok(run.events.some((e) => e.type === 'duel-won'));
});

test('scan-every-beat (no banking) loses to the beat-4 double surge', () => {
  const run = intoDuel(14, 10);
  for (let beat = 0; beat < 4; beat++) {
    // naive: checksum then repair one, every beat — two actions, no bank
    if (legalActions(run).some((a) => a.type === 'duel-checksum')) {
      act(run, { type: 'duel-checksum' });
    } else {
      act(run, { type: 'brace' });
    }
    const bad = run.fragments.find((f) => f.corrupted && f.revealed);
    if (bad) act(run, { type: 'duel-repair', fragment: bad.id });
    else if (run.phase === 'duel' && run.duel.actionsLeft > 0) act(run, { type: 'hold' });
  }
  assert.equal(run.phase, 'done');
  assert.equal(run.outcome, 'failed', 'beat 4 lands two; two actions fix one');
  assert.equal(run.failure.killerConcept, 'corruption');
});

test('the duel is never free: the clock ticks every beat and can kill', () => {
  const run = intoDuel(12, 3); // three ticks of slack for a four-beat duel
  for (let beat = 0; beat < 4 && run.phase === 'duel'; beat++) {
    act(run, { type: 'brace' });
    act(run, { type: 'brace' });
  }
  assert.equal(run.outcome, 'failed');
  assert.equal(run.failure.killerConcept, 'latency');
});

test('act-5 generated maps carry the boss; earlier acts never do', async () => {
  const { generateMap } = await import('../../js/generator.js');
  assert.equal(generateMap('B5', { act: 5 }).boss, 'static');
  for (const a of [1, 2, 3, 4]) {
    assert.equal(generateMap('B5', { act: a }).boss, undefined);
  }
});
