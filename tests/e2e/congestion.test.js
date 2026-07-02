// congestion.test.js — the send-rate puzzle through the real UI: the belt
// becomes rate buttons, probe-doubling crosses the pipe, bounces ease off.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { generateMap } from '../../js/generator.js';

function jamSeed() {
  for (let i = 0; i < 800; i++) {
    const seed = `JAM${i}`;
    if (generateMap(seed).segments[0].roads.long.hazard?.kind === 'congestion') return seed;
  }
  throw new Error('no congestion-opening seed found');
}

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

test('the bottleneck: rate buttons own the belt until everyone is through', async () => {
  const seed = jamSeed();
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '1'); localStorage.setItem('packet-run-dns', '8'); });
  await page.goto(`${app.origin}/?seed=${seed}&payload=file`);
  await page.getByRole('button', { name: /deliver/i }).click();
  await page.locator('[data-road-chip="long"]').click();
  await page.locator('[data-road-chip="long"]').click();
  await page.locator('#go:enabled').click(); // into the jam

  // slow start: exactly one rate offered
  await page.locator('.send-btn').first().waitFor({ timeout: 4000 });
  assert.equal(await page.locator('.send-btn').count(), 1);
  assert.match(await page.locator('.send-btn').textContent(), /send 1/i);
  assert.equal(await page.locator('#go').count(), 0, 'Onward is gone — the puzzle owns the beat');

  // probe-double until the pipe clears (biggest offered rate each beat)
  for (let guard = 0; guard < 12; guard++) {
    const run = await page.evaluate(() => window.packetRun.run);
    if (!run.congestion) break;
    await page.locator('.send-btn').last().click();
  }
  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.congestion, null, 'everyone crossed');
  assert.ok(await page.locator('#go:enabled').count(), 'the road reopens');
  assert.equal(run.fragments.filter((f) => f.status === 'with-party').length, 5,
    'congestion loses nothing — time was the price');
  await page.context().close();
});
