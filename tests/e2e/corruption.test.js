// corruption.test.js — the detect→repair loop through the real UI: static
// impact, hidden victim, Checksum reveal (glitched chip), targeted Repair.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { generateMap } from '../../js/generator.js';

// find a seed whose generated map opens with a static short road
function staticSeed() {
  for (let i = 0; i < 500; i++) {
    const seed = `STAT${i}`;
    if (generateMap(seed).segments[0].roads.short.hazard?.kind === 'static') return seed;
  }
  throw new Error('no static-opening seed found');
}

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

test('static zone: hidden scramble → Checksum reveals → Repair fixes', async () => {
  const seed = staticSeed();
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('packet-run-wins', '1'));
  await page.goto(`${app.origin}/?seed=${seed}`);
  await page.getByRole('button', { name: /deliver/i }).click();

  // four tools on a Static map
  assert.equal(await page.locator('.tool-btn').count(), 4);
  assert.ok(await page.locator('#tool-checksum').isDisabled(), 'nothing to find yet');

  // ride into the static impact (short road, impact on hop 1)
  await page.locator('[data-road-chip="short"]').click();
  await page.locator('[data-road-chip="short"]').click();
  await page.locator('#go:enabled').click();

  const run1 = await page.evaluate(() => window.packetRun.run);
  const victim = run1.fragments.find((f) => f.corrupted);
  assert.ok(victim, 'someone got scrambled');
  assert.equal(await page.locator('.fragment-chip.glitched').count(), 0,
    'the victim is hidden until Checksum');

  // Checksum fires immediately (a scan, not a targeted verb)
  await page.locator('#tool-checksum:enabled').click();
  await page.locator('.fragment-chip.glitched').waitFor({ timeout: 4000 });
  assert.equal(await page.locator('.fragment-chip.glitched').count(), 1);

  // Repair targets the glitched chip
  await page.locator('#tool-repair:enabled').click();
  await page.locator(`.fragment-chip.targetable[data-fragment="${victim.id}"]`).click();
  const run2 = await page.evaluate(() => window.packetRun.run);
  assert.ok(!run2.fragments.some((f) => f.corrupted), 'clean party');
  assert.equal(await page.locator('.fragment-chip.glitched').count(), 0);
  await page.context().close();
});
