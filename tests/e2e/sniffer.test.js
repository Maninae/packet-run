// sniffer.test.js — the eavesdropper through the real UI: take the Cloak at
// a reward beat, walk the listened road, watch it read nothing.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { createRun, legalActions, act } from '../../js/engine.js';
import { generateMap } from '../../js/generator.js';

// Mirror of the UI driver below: short roads; rewards take the cloak when
// offered, else energy; nodes just ride onward (sends probe-double).
function replayForScan(seed) {
  const run = createRun({ seed, map: generateMap(seed, { act: 3 }) });
  let cloaked = false;
  for (let guard = 0; guard < 80 && run.phase !== 'done'; guard++) {
    if (run.phase === 'reward') {
      const legal = legalActions(run);
      const cloak = legal.find((a) => a.tool === 'cloak' && !a.replace);
      if (cloak) { act(run, cloak); cloaked = true; continue; }
      act(run, legal.find((a) => a.kind === 'bandwidth'));
      continue;
    }
    if (run.phase === 'event') { act(run, legalActions(run)[0]); continue; }
    if (run.phase === 'junction') { act(run, { type: 'choose-road', road: 'short' }); continue; }
    const legal = legalActions(run);
    const sends = legal.filter((a) => a.type === 'send');
    if (sends.length) { act(run, sends.at(-1)); continue; }
    const foiled = run.events.find((e) => e.type === 'impact' && e.kind === 'sniffer');
    if (foiled) return cloaked && foiled.foiled ? run : null;
    act(run, { type: 'onward' });
  }
  return null;
}

function cloakSeed() {
  for (let i = 0; i < 3000; i++) {
    if (replayForScan(`SPY${i}`)) return `SPY${i}`;
  }
  throw new Error('no cloak-then-sniffer seed found');
}

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

test('sealed against the sniffer: the cloak is taken, the tamper never lands', async () => {
  const seed = cloakSeed();
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '6'); localStorage.setItem('packet-run-dns', '8'); });
  await page.goto(`${app.origin}/?seed=${seed}&payload=file`);
  await page.getByRole('button', { name: /deliver/i }).click();

  for (let guard = 0; guard < 60; guard++) {
    const run = await page.evaluate(() => window.packetRun.run);
    if (run.phase === 'done') break;
    const sniffed = run.events.find((e) => e.type === 'impact' && e.kind === 'sniffer');
    if (sniffed) {
      assert.equal(sniffed.foiled, true, 'the cloak foiled the sniffer');
      assert.ok(!run.fragments.some((f) => f.corrupted), 'nothing tampered');
      assert.ok(run.belt.includes('cloak'));
      assert.ok(await page.locator('#tool-cloak.passive').count(), 'cloak sits on the belt, always on');
      await page.context().close();
      return;
    }
    if (run.phase === 'reward') {
      const cloak = page.locator('.reward-card[data-tool="cloak"]');
      if (await cloak.count()) { await cloak.click(); continue; }
      await page.locator('[data-reward-kind="bandwidth"]').first().click();
      continue;
    }
    if (run.phase === 'junction') {
      const chip = page.locator('[data-road-chip="short"]');
      await chip.click();
      await chip.click();
      continue;
    }
    if (await page.locator('.send-btn').count()) {
      await page.locator('.send-btn').last().click();
      continue;
    }
    const go = page.locator('#go:enabled');
    if (await go.count()) { await go.click(); continue; }
    await page.waitForTimeout(100);
  }
  assert.fail('never reached the sniffer');
});
