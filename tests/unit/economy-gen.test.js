// economy-gen.test.js — the generated-map economy, verified the same way the
// 1a pricing table was: fixed policies played over thousands of seeded maps.
// If GEN budgets/stars change in config.js, these assertions are the check.
//
// Policies are strategy PERSONALITIES (not optimal play): the bar is that
// distinct temperaments stay viable and none dominates on every axis.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act, segmentRoads } from '../../js/engine.js';
import { generateMap } from '../../js/generator.js';

const N = 1500;

// Play a whole run under a road-choice temperament + insurance rule.
// Insurance happens right after each junction; anything lost gets
// retransmitted at the first legal moment (the human response beat).
function play(seed, { pickRoad, insure, avoidStatic }) {
  const map = generateMap(seed);
  const hasCorruptor = map.segments.some((s) =>
    Object.values(s.roads).some((r) => ['static', 'sniffer'].includes(r.hazard?.kind)));
  const run = createRun({ seed, map });
  while (run.phase !== 'done') {
    if (run.phase === 'reward') {
      // temperaments that will CROSS a static zone kit up; the guardian
      // routes around the uninsurable instead
      const legal = legalActions(run);
      const kit = hasCorruptor && !avoidStatic && legal.find((a) =>
        a.kind === 'tool' && (a.tool === 'checksum' || a.tool === 'repair') && !a.replace);
      act(run, kit || legal.find((a) => a.kind === 'bandwidth'));
      continue;
    }
    if (run.phase === 'junction') {
      let road = pickRoad(run);
      if (avoidStatic) {
        const roads = segmentRoads(run);
        const other = road === 'short' ? 'long' : 'short';
        const corr = (r) => ['static', 'sniffer'].includes(r.hazard?.kind);
        if (corr(roads[road]) && !corr(roads[other])) {
          road = other;
        }
      }
      act(run, { type: 'choose-road', road });
      const hazard = segmentRoads(run)[road].hazard;
      if (hazard?.threatens && insure(run, hazard)) {
        for (const id of hazard.threatens) {
          if (legalActions(run).some((a) => a.type === 'duplicate' && a.fragment === id)) {
            act(run, { type: 'duplicate', fragment: id });
          }
        }
      }
      continue;
    }
    // the response beat: fix what's broken before moving (all temperaments);
    // at rapids, wait while the clock allows, else press on and retransmit;
    // at a jammed pipe, probe-double (the AIMD play)
    const legal = legalActions(run);
    const sends = legal.filter((a) => a.type === 'send');
    if (sends.length) { act(run, sends.at(-1)); continue; }
    const waitAct = legal.find((a) => a.type === 'wait');
    if (waitAct && run.deadline > 4) { act(run, waitAct); continue; }
    const fix = legal.find((a) =>
      a.type === 'retransmit' || a.type === 'checksum' || a.type === 'repair');
    act(run, fix ?? { type: 'onward' });
  }
  return run;
}

const POLICIES = {
  // pays for certainty: quickest roads, every named threat insured,
  // and routes AROUND the Static (corruption can't be insured)
  guardian: {
    pickRoad: () => 'short',
    insure: () => true,
    avoidStatic: true,
  },
  // cheap and brave: quickest roads, rescue instead of insure
  daredevil: {
    pickRoad: () => 'short',
    insure: () => false,
  },
  // patient: mildest roads, rescue what drops
  wanderer: {
    pickRoad: (run) => {
      const { short, long } = segmentRoads(run);
      return threatWeight(long) < threatWeight(short) ? 'long' : 'short';
    },
    insure: () => false,
  },
  // adaptive: insure only big threats, prefer short while the clock is fat
  strategist: {
    pickRoad: (run) => {
      const { long } = segmentRoads(run);
      const hopsLeft = (run.map.segments.length - run.segment) * 4;
      if (run.deadline < hopsLeft) return 'short';
      return threatWeight(long) <= 1 && long.bwPickup ? 'long' : 'short';
    },
    insure: (run, hazard) => (hazard.threatens?.length ?? 0) >= 2 && run.bandwidth >= 8,
  },
};

// a static zone weighs a bit over one fragment: fixable only with the kit;
// a jam risks no fragments at all — just beats
function threatWeight(road) {
  if (!road.hazard) return 0;
  if (['static', 'sniffer'].includes(road.hazard.kind)) return 1.5;
  if (road.hazard.kind === 'congestion') return 0.5;
  if (road.hazard.kind === 'trench' || road.hazard.kind === 'satellite') return 0.5;
  return road.hazard.threatens?.length ?? 1;
}

const results = {};
for (const [name, policy] of Object.entries(POLICIES)) {
  const r = { wins: 0, stars: { 1: 0, 2: 0, 3: 0 }, failByDeadline: 0, failByLoss: 0 };
  for (let i = 0; i < N; i++) {
    const run = play(`gen-econ-${i}`, policy);
    assert.ok(run.bandwidth >= 0, `bandwidth negative under ${name}`);
    if (run.outcome === 'rendered') {
      r.wins++;
      r.stars[run.stars]++;
    } else if (run.failure.reason === 'deadline') r.failByDeadline++;
    else r.failByLoss++;
  }
  r.winRate = r.wins / N;
  r.starEV = (r.stars[1] + 2 * r.stars[2] + 3 * r.stars[3]) / Math.max(1, r.wins);
  results[name] = r;
}

test('every temperament is viable: all four win most of their runs', () => {
  for (const [name, r] of Object.entries(results)) {
    assert.ok(r.winRate >= 0.55, `${name} wins only ${(r.winRate * 100).toFixed(0)}%`);
  }
});

test('the guardian is the safest — certainty is purchasable', () => {
  const { guardian, daredevil, wanderer } = results;
  assert.ok(guardian.winRate > daredevil.winRate, 'insurance beats bravado on survival');
  assert.ok(guardian.winRate >= 0.9, `guardian at ${(guardian.winRate * 100).toFixed(0)}%`);
  assert.ok(guardian.winRate > wanderer.winRate - 0.05, 'guardian competitive with patience');
});

test('no policy dominates: the safest is not also the best-paid', () => {
  const { guardian } = results;
  const bestEV = Math.max(...Object.values(results).map((r) => r.starEV));
  assert.ok(guardian.starEV < bestEV - 0.2,
    `guardian star EV ${guardian.starEV.toFixed(2)} must trail the best ${bestEV.toFixed(2)}`);
});

test('running lean pays: some cheap temperament out-stars the guardian', () => {
  const { guardian, daredevil, wanderer, strategist } = results;
  const cheapBest = Math.max(daredevil.starEV, wanderer.starEV, strategist.starEV);
  assert.ok(cheapBest > guardian.starEV, 'stars must reward risk somewhere');
});

test('maps are solvable: some policy wins nearly every map', () => {
  let solved = 0;
  const M = 400;
  for (let i = 0; i < M; i++) {
    const seed = `solve-${i}`;
    const won = Object.values(POLICIES).some((p) => play(seed, p).outcome === 'rendered');
    if (won) solved++;
  }
  assert.ok(solved / M >= 0.97, `only ${solved}/${M} maps beaten by the policy suite`);
});

test('both failure modes exist in the wild (loss AND lag both teach)', () => {
  const total = (k) => Object.values(results).reduce((s, r) => s + r[k], 0);
  assert.ok(total('failByLoss') > 0, 'packet-loss failures occur');
  assert.ok(total('failByDeadline') > 0, 'deadline failures occur');
});
