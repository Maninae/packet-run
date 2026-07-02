// rapids.test.js — the wait-or-press choice through the real UI: stragglers
// with lag badges, the Wait button, catch-up, and the press-on cost.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { generateMap } from '../../js/generator.js';

function rapidsSeed() {
  for (let i = 0; i < 500; i++) {
    const seed = `RAP${i}`;
    if (generateMap(seed, { act: 1 }).segments[0].roads.short.hazard?.kind === 'rapids') return seed;
  }
  throw new Error('no rapids-opening seed found');
}

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

async function intoRapids(page, seed) {
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '1'); localStorage.setItem('packet-run-dns', '8'); });
  await page.goto(`${app.origin}/?seed=${seed}&payload=file`);
  await page.getByRole('button', { name: /deliver/i }).click();
  await page.locator('[data-road-chip="short"]').click();
  await page.locator('[data-road-chip="short"]').click();
  await page.locator('#go:enabled').click(); // impact on hop 1
}

test('rapids: straggler chips show lag; waiting brings them back', async () => {
  const seed = rapidsSeed();
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await intoRapids(page, seed);

  const stragglers = await page.locator('.fragment-chip.straggler').count();
  assert.ok(stragglers >= 1, 'straggler chips visible');
  assert.ok(await page.locator('.fragment-chip .lag-badge').count() >= 1, 'lag badges shown');
  assert.ok(await page.locator('#wait').count(), 'Wait button offered');

  // wait until everyone is back (max 2 beats by design)
  for (let i = 0; i < 2; i++) {
    if (!await page.locator('#wait').count()) break;
    await page.locator('#wait').click();
  }
  assert.equal(await page.locator('.fragment-chip.straggler').count(), 0);
  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.fragments.filter((f) => f.status === 'with-party').length, 5);
  await page.context().close();
});

test('full motion: a rapids impact animates without crashing (regression)', async () => {
  // static/rapids impacts once crashed the animation path (impact.swept
  // undefined) — invisible to reduced-motion tests, fatal for real kids
  const seed = rapidsSeed();
  const page = await app.page(VIEWPORTS.portrait); // real animation timing
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '1'); localStorage.setItem('packet-run-dns', '8'); });
  await page.goto(`${app.origin}/?seed=${seed}&payload=file`);
  await page.getByRole('button', { name: /deliver/i }).click();
  const chip = page.locator('[data-road-chip="short"]');
  await chip.click();
  await chip.click();
  await page.locator('#go:enabled').click();
  await page.locator('#wait, #go:enabled').first().waitFor({ timeout: 15000 });
  const run = await page.evaluate(() => window.packetRun.run);
  assert.ok(run.fragments.some((f) => f.status === 'straggler'), 'rapids resolved in motion');
  await page.context().close();
});

test('pressing on loses stragglers — recoverable after the reward beat', async () => {
  const seed = rapidsSeed();
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await intoRapids(page, seed);
  await page.locator('#go:enabled').click(); // press on → segment end → reward
  const run = await page.evaluate(() => window.packetRun.run);
  assert.ok(run.fragments.some((f) => f.status === 'lost'));
  await page.locator('[data-reward-kind="bandwidth"]').first().click();
  // at the next junction, the rescue verb is live (tools work at junctions)
  assert.ok(await page.locator('#tool-retransmit:enabled').count(), 'rescue available');
  await page.context().close();
});
