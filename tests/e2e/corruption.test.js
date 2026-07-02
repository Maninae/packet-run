// corruption.test.js — the full 1b corruption arc through the real UI:
// build the kit at reward beats (Checksum, then Repair), ride into the
// Static, reveal the hidden victim, fix it. The seed is scanned by replaying
// the EXACT same decision rules headlessly first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { createRun, legalActions, act } from '../../js/engine.js';
import { generateMap } from '../../js/generator.js';

// Decision rules (mirrored by the UI driver below): always the short road;
// rewards: Checksum first, Repair second, energy after; at nodes: checksum
// when offered, repair when offered, else onward.
function replayForScan(seed) {
  const run = createRun({ seed, map: generateMap(seed) });
  let tookChecksum = false;
  let tookRepair = false;
  let sawStatic = false;
  for (let guard = 0; guard < 80 && run.phase !== 'done'; guard++) {
    if (run.phase === 'reward') {
      const legal = legalActions(run);
      const want = !tookChecksum ? 'checksum' : !tookRepair ? 'repair' : null;
      if (want) {
        const pick = legal.find((a) => a.tool === want && !a.replace);
        if (!pick) return null; // this seed doesn't offer the kit in order
        act(run, pick);
        if (want === 'checksum') tookChecksum = true; else tookRepair = true;
      } else {
        act(run, legal.find((a) => a.kind === 'bandwidth'));
      }
      continue;
    }
    if (run.phase === 'junction') { act(run, { type: 'choose-road', road: 'short' }); continue; }
    const legal = legalActions(run);
    const sends = legal.filter((a) => a.type === 'send');
    if (sends.length) { act(run, sends.at(-1)); continue; }
    const checksum = legal.find((a) => a.type === 'checksum');
    if (checksum) { act(run, checksum); continue; }
    const repair = legal.find((a) => a.type === 'repair');
    if (repair) { act(run, repair); return sawStatic ? run : null; }
    act(run, { type: 'onward' });
    if (run.events.at(-1)?.kind === 'static'
      || run.events.findLast((e) => e.type === 'impact')?.kind === 'static') sawStatic = true;
  }
  return null;
}

function scanSeed() {
  for (let i = 0; i < 2000; i++) {
    if (replayForScan(`KIT${i}`)) return `KIT${i}`;
  }
  throw new Error('no kit-then-static seed found');
}

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

test('build the kit at rewards, then detect and repair the Static\'s work', async () => {
  const seed = scanSeed();
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '1'); localStorage.setItem('packet-run-dns', '8'); });
  await page.goto(`${app.origin}/?seed=${seed}&payload=file`);
  await page.getByRole('button', { name: /deliver/i }).click();

  let tookChecksum = false;
  let tookRepair = false;
  let revealedSeen = false;
  for (let guard = 0; guard < 80; guard++) {
    const run = await page.evaluate(() => window.packetRun.run);
    if (run.phase === 'done') break;

    if (run.phase === 'reward') {
      const want = !tookChecksum ? 'checksum' : !tookRepair ? 'repair' : null;
      if (want) {
        await page.locator(`.reward-card[data-tool="${want}"]`).click();
        if (want === 'checksum') tookChecksum = true; else tookRepair = true;
      } else {
        await page.locator('[data-reward-kind="bandwidth"]').first().click();
      }
      continue;
    }
    if (run.phase === 'junction') {
      const chip = page.locator('[data-road-chip="short"]');
      await chip.click();
      await chip.click();
      continue;
    }
    if (await page.locator('#tool-checksum:enabled').count()) {
      assert.equal(await page.locator('.fragment-chip.glitched').count(), 0,
        'victim hidden before the scan');
      await page.locator('#tool-checksum:enabled').click();
      await page.locator('.fragment-chip.glitched').waitFor({ timeout: 4000 });
      revealedSeen = true;
      continue;
    }
    if (revealedSeen && await page.locator('#tool-repair:enabled').count()) {
      await page.locator('#tool-repair:enabled').click();
      await page.locator('.fragment-chip.targetable').first().click();
      break;
    }
    const go = page.locator('#go:enabled');
    if (await go.count()) { await go.click(); continue; }
    await page.waitForTimeout(100);
  }

  assert.ok(revealedSeen, 'the checksum reveal happened');
  const run = await page.evaluate(() => window.packetRun.run);
  assert.ok(!run.fragments.some((f) => f.corrupted), 'the party is clean');
  assert.equal(await page.locator('.fragment-chip.glitched').count(), 0);
  await page.context().close();
});
