// economy-call.test.js — THE teaching claim of design/05, executable:
// on a live call, tempo (skip early, keep moving) must beat TCP instincts
// (wait for everyone, acknowledge nothing). Same maps, opposite optimal play.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act, segmentRoads } from '../../js/engine.js';
import { generateMap } from '../../js/generator.js';

const N = 1200;

function playCall(seed, style) {
  // act 2's pool is where the gap-makers (storms, rapids) live — the
  // tempo-vs-clinging contrast must hold where gaps actually occur
  const run = createRun({ seed, map: generateMap(seed, { act: 2 }), payload: 'udp-call' });
  for (let guard = 0; guard < 120 && run.phase !== 'done'; guard++) {
    if (run.phase === 'event') { act(run, legalActions(run)[0]); continue; }
    if (run.phase === 'reward') {
      act(run, legalActions(run).find((a) => a.kind === 'bandwidth'));
      continue;
    }
    if (run.phase === 'junction') {
      act(run, { type: 'choose-road', road: 'short' });
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
    const legal = legalActions(run);
    const sends = legal.filter((a) => a.type === 'send');
    if (sends.length) { act(run, sends.at(-1)); continue; }
    if (style === 'tempo') {
      // the UDP-correct read: save what's cheap (a lag-1 frame costs one
      // tick), acknowledge everything unsavable instantly
      const savable = run.fragments.some((f) => f.status === 'straggler');
      const wait = legal.find((a) => a.type === 'wait');
      if (savable && wait) { act(run, wait); continue; }
      const skip = legal.find((a) => a.type === 'skip');
      if (skip) { act(run, skip); continue; }
    } else {
      // clinger: TCP instincts imported — never acknowledge a gap, wait for
      // anything waitable, let the dock stall for the rest
      const wait = legal.find((a) => a.type === 'wait');
      if (wait) { act(run, wait); continue; }
    }
    act(run, { type: 'onward' });
  }
  return run;
}

const results = {};
for (const style of ['tempo', 'clinger']) {
  let wins = 0;
  let deadlineDeaths = 0;
  for (let i = 0; i < N; i++) {
    const run = playCall(`call-${i}`, style);
    if (run.outcome === 'rendered') wins++;
    else if (run.failure.reason === 'deadline') deadlineDeaths++;
  }
  results[style] = { winRate: wins / N, deadlineDeaths };
}

test('on a live call, tempo beats clinging — the UDP lesson holds', () => {
  const { tempo, clinger } = results;
  assert.ok(tempo.winRate > clinger.winRate + 0.05,
    `tempo ${(tempo.winRate * 100).toFixed(0)}% must clearly beat clinger ${(clinger.winRate * 100).toFixed(0)}%`);
  assert.ok(tempo.winRate >= 0.8,
    `the tempo style must be strongly viable (got ${(tempo.winRate * 100).toFixed(0)}%)`);
});

test('the clock is what punishes clinging (stalls are deadline bleed)', () => {
  const { tempo, clinger } = results;
  assert.ok(clinger.deadlineDeaths > tempo.deadlineDeaths,
    'clinging must die to the clock more often than tempo play');
});
