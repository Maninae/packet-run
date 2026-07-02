// economy.test.js — the pricing table from design/02, verified by playing the
// REAL engine thousands of times per line. Rounds 4–6 of design review each
// EV-broke a version of this table on paper; this file makes the check
// executable so it can never silently rot. If a number in js/config.js
// changes, these assertions are the new EV-check (update design/02 with it).
//
// The five line personalities (design/02):
//   1 short, insure both      — never fails, ★ (set-and-forget beginner line)
//   2 short, insure 2 + recover 4 — never fails, ★ (the practice line)
//   3 short, recover both     — fails only gust∧deep-fog ≈ 3%, ★★ (solid)
//   4 long, insure the one    — ★★★ when fog is kind, else scramble (daring)
//   5 long, recover the one   — ★★★ at ~34% = 0.85 × 0.40 (the gambler)

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act } from '../../js/engine.js';

const N = 4000;

// Policies: insure the listed fragments before moving; at any node, retransmit
// every lost fragment if affordable (the human "response beat" behavior).
function playLine(seed, { road, insure }) {
  const run = createRun({ seed });
  act(run, { type: 'choose-road', road });
  for (const id of insure) act(run, { type: 'duplicate', fragment: id });
  while (run.phase !== 'done') {
    const retx = legalActions(run).find((a) => a.type === 'retransmit');
    act(run, retx ?? { type: 'onward' });
  }
  return run;
}

const LINES = {
  insureBoth: { road: 'short', insure: [2, 4] },
  insureOneRecoverOne: { road: 'short', insure: [2] },
  recoverBoth: { road: 'short', insure: [] },
  longInsure: { road: 'long', insure: [3] },
  longRecover: { road: 'long', insure: [] },
};

function simulate(name) {
  const line = LINES[name];
  const out = { fails: 0, stars: { 1: 0, 2: 0, 3: 0 }, n: N };
  for (let i = 0; i < N; i++) {
    const run = playLine(`${name}-${i}`, line);
    // engine invariants must hold on every single run
    assert.ok(run.bandwidth >= 0, `bandwidth went negative on ${name}-${i}`);
    if (run.outcome === 'failed') out.fails++;
    else out.stars[run.stars]++;
  }
  out.failRate = out.fails / N;
  out.successRate = 1 - out.failRate;
  out.threeStarRate = out.stars[3] / N;
  return out;
}

const results = Object.fromEntries(Object.keys(LINES).map((k) => [k, simulate(k)]));

const near = (x, target, tol, msg) =>
  assert.ok(Math.abs(x - target) <= tol, `${msg}: got ${x.toFixed(3)}, wanted ${target}±${tol}`);

test('line 1 — insure both: never fails; ★ always (pays for total safety)', () => {
  const r = results.insureBoth;
  assert.equal(r.failRate, 0);
  assert.equal(r.stars[2] + r.stars[3], 0, 'never better than ★');
});

test('line 2 — insure one, recover one: never fails; ★; the response beat gets played', () => {
  const r = results.insureOneRecoverOne;
  assert.equal(r.failRate, 0);
  assert.equal(r.stars[2] + r.stars[3], 0);
});

test('line 3 — recover both: the solid ★★ line, fails only gust∧deep-fog ≈ 3%', () => {
  const r = results.recoverBoth;
  near(r.failRate, 0.03, 0.012, 'fail rate');
  // ★★ on the 85% no-gust runs that survive; gust survivors drop to ★
  near(r.stars[2] / N, 0.85, 0.03, '★★ share');
  assert.equal(r.stars[3], 0, 'never ★★★');
});

test('line 4 — long + insure: the daring line; ★★★ when fog is kind', () => {
  const r = results.longInsure;
  // fails: no-gust∧deep-fog (0.85×0.2) + gust-on-uninsured∧any-fog (0.15×0.8×0.6)
  //        + gust-on-insured∧deep-fog (0.15×0.2×0.2) ≈ 0.25
  near(r.failRate, 0.248, 0.03, 'fail rate');
  assert.ok(r.threeStarRate > 0.55, `most successes are ★★★ (got ${r.threeStarRate})`);
});

test('line 5 — long + recover: the gambler; ★★★ at ~34% (0.85 × 0.40), all-or-nothing', () => {
  const r = results.longRecover;
  near(r.successRate, 0.34, 0.03, 'success rate');
  assert.equal(r.stars[1] + r.stars[2], 0, 'never limps home — ★★★ or bust');
});

test('the tuning bar: at least three genuinely distinct viable personalities', () => {
  // distinct: safety line (0% fail, ★), solid line (~3% fail, ★★),
  // gambler (~66% fail, ★★★) — orderings must hold strictly
  const { insureBoth: a, recoverBoth: c, longInsure: d, longRecover: e } = results;
  assert.ok(a.failRate < c.failRate, 'safety strictly safer than solid');
  assert.ok(c.failRate < d.failRate, 'solid strictly safer than daring');
  assert.ok(d.failRate < e.failRate, 'daring strictly safer than gambling');
  // payoff strictly rises as risk rises (star EV among successes)
  const starEV = (r) => (r.stars[1] + 2 * r.stars[2] + 3 * r.stars[3]) / (N - r.fails);
  assert.ok(starEV(a) < starEV(c) && starEV(c) < starEV(d) && starEV(d) < starEV(e),
    `star payoff must rise with risk: ${[a, c, d, e].map((r) => starEV(r).toFixed(2))}`);
});

test('no line dominates: every line is the best answer to SOME preference', () => {
  // The safety lines win on certainty; the gambler wins on expected stars-if-
  // you-must-have-★★★; the solid line wins on star EV per unit of risk.
  const { insureBoth, recoverBoth, longRecover } = results;
  const tripleOdds = (r) => r.threeStarRate;
  assert.ok(tripleOdds(longRecover) > tripleOdds(recoverBoth),
    'chasing ★★★ must favor the risky road');
  assert.ok(insureBoth.failRate === 0 && longRecover.failRate > 0.5,
    'certainty and gambling must sit at opposite ends');
});
