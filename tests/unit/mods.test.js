// mods.test.js — difficulty modifiers (the "hint"/protected-first-session
// tier, design/06): world RNG softens (no gust, kind fog); the storm's core
// lesson — act or lose the named fragments — stays fully intact.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';
import { EASY } from '../../js/config.js';

function playLine(seed, { road, insure, mods }) {
  const run = createRun({ seed, mods });
  act(run, { type: 'choose-road', road });
  for (const id of insure) act(run, { type: 'duplicate', fragment: id });
  while (run.phase !== 'done') {
    const retx = legalActions(run).find((a) => a.type === 'retransmit');
    act(run, retx ?? { type: 'onward' });
  }
  return run;
}

test('EASY mods: the gust never fires', () => {
  for (let i = 0; i < 300; i++) {
    const run = playLine(`easy-${i}`, { road: 'short', insure: [2, 4], mods: EASY });
    assert.equal(run.events.find((e) => e.type === 'impact').gust, null);
  }
});

test('EASY mods: fog is always clear', () => {
  for (let i = 0; i < 300; i++) {
    const run = playLine(`easyfog-${i}`, { road: 'long', insure: [3], mods: EASY });
    assert.equal(run.events.find((e) => e.type === 'fog-reveal').cost, 0);
  }
});

test('EASY mods: every recovery line wins — but ignoring the storm still loses', () => {
  for (let i = 0; i < 200; i++) {
    assert.equal(playLine(`er-${i}`, { road: 'short', insure: [], mods: EASY }).outcome, 'rendered');
    assert.equal(playLine(`eg-${i}`, { road: 'long', insure: [], mods: EASY }).outcome, 'rendered');
  }
  // no tools at all: the named sweep still costs the render (the lesson survives)
  const run = createRun({ seed: 'ignore', mods: EASY });
  act(run, { type: 'choose-road', road: 'short' });
  while (run.phase !== 'done') act(run, { type: 'onward' });
  assert.equal(run.outcome, 'failed');
  assert.equal(run.failure.reason, 'missing-fragments');
});

test('mods do not leak: an unmodded run still gusts somewhere', () => {
  let sawGust = false;
  for (let i = 0; i < 100 && !sawGust; i++) {
    const run = playLine(`leak-${i}`, { road: 'short', insure: [2, 4] });
    sawGust = !!run.events.find((e) => e.type === 'impact').gust;
  }
  assert.ok(sawGust, 'default gust chance should fire within 100 runs');
});
