// boss.test.js — The Static duel through the real UI: reach the Act-5 dock,
// survive four surges with the Brace bank, checksum-and-repair the burst,
// and watch the render judge the result honestly.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { createRun, legalActions, act } from '../../js/engine.js';
import { generateMap } from '../../js/generator.js';

// Mirror of the UI driver below: short roads, bandwidth rewards, option-0
// events; in the duel — brace beats 1–3, then one checksum + bulk repairs.
function replay(seed) {
  const run = createRun({ seed, map: generateMap(seed, { act: 5 }) });
  for (let guard = 0; guard < 200 && run.phase !== 'done'; guard++) {
    const legal = legalActions(run);
    if (run.phase === 'duel') {
      if (run.duel.beat < 4) {
        if (legal.some((a) => a.type === 'brace')) { act(run, { type: 'brace' }); continue; }
        act(run, { type: 'hold' });
        continue;
      }
      if (legal.some((a) => a.type === 'duel-checksum')) { act(run, { type: 'duel-checksum' }); continue; }
      const repair = legal.find((a) => a.type === 'duel-repair');
      if (repair) { act(run, repair); continue; }
      act(run, { type: 'hold' });
      continue;
    }
    if (run.phase === 'event') { act(run, legal[0]); continue; }
    if (run.phase === 'reward') { act(run, legal.find((a) => a.kind === 'bandwidth')); continue; }
    if (run.phase === 'junction') { act(run, { type: 'choose-road', road: 'short' }); continue; }
    const sends = legal.filter((a) => a.type === 'send');
    if (sends.length) { act(run, sends.at(-1)); continue; }
    const push = legal.find((a) => a.type === 'push');
    if (push) { act(run, push); continue; }
    act(run, { type: 'onward' });
  }
  return run;
}

function winnableSeed() {
  for (let i = 0; i < 3000; i++) {
    const seed = `BOSS${i}`;
    const run = replay(seed);
    if (run.outcome === 'rendered' && run.events.some((e) => e.type === 'duel-won')) return seed;
  }
  throw new Error('no winnable boss seed found');
}

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

test('the Static duel: brace the surges, burst the repairs, render the message', async () => {
  const seed = winnableSeed();
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '12'); localStorage.setItem('packet-run-dns', '8'); });
  await page.goto(`${app.origin}/?seed=${seed}&payload=file`);
  await page.getByRole('button', { name: /deliver/i }).click();

  // march to the dock (same policy as the scan replay)
  for (let guard = 0; guard < 80; guard++) {
    const run = await page.evaluate(() => window.packetRun.run);
    if (run.phase === 'duel' || run.phase === 'done') break;
    if (await page.locator('[data-event-option]').count()) {
      await page.locator('[data-event-option]:enabled').first().click(); continue;
    }
    if (run.phase === 'reward') {
      await page.locator('[data-reward-kind="bandwidth"]').first().click(); continue;
    }
    if (run.phase === 'junction') {
      const chip = page.locator('[data-road-chip="short"]');
      await chip.click(); await chip.click(); continue;
    }
    if (await page.locator('.send-btn').count()) {
      await page.locator('.send-btn').last().click(); continue;
    }
    const target = page.locator('.fragment-chip.targetable').first();
    if (run.siege && await target.count()) { await target.click(); continue; }
    const go = page.locator('#go:enabled');
    if (await go.count()) { await go.click(); continue; }
    await page.waitForTimeout(100);
  }

  let run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.phase, 'duel', 'the tunnel of noise opened at the dock');
  assert.ok(await page.evaluate(() => document.body.classList.contains('dueling')),
    'the arena crawls with static');

  // beats 1–3: brace both actions, hold the beat closed
  for (let beat = 1; beat <= 3; beat++) {
    await page.locator('#brace:enabled').click();
    await page.locator('#brace:enabled').click();
    run = await page.evaluate(() => window.packetRun.run);
    if (run.duel.beat === beat) await page.locator('#hold').click();
  }
  run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.duel.beat, 4);
  assert.equal(run.duel.banked, 6, 'six actions in the bank for the burst');

  // the burst: checksum once, repair every glitch by tapping its chip
  await page.locator('#duel-checksum:enabled').click();
  for (let guard = 0; guard < 6; guard++) {
    run = await page.evaluate(() => window.packetRun.run);
    if (run.phase !== 'duel') break;
    if (run.fragments.some((f) => f.corrupted)) {
      await page.locator('#duel-repair:enabled').click();
      await page.locator('.fragment-chip.targetable').first().click();
      continue;
    }
    await page.locator('#hold').click();
  }
  run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.outcome, 'rendered', 'the message survived the Static');
  assert.ok(run.events.some((e) => e.type === 'duel-won'));
  await page.locator('.win-screen').waitFor({ timeout: 8000 });
  await page.context().close();
});
