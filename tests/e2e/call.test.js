// call.test.js — the live-call payload through the real UI: the Skip kit,
// steadied stutters, the 3/5 render with visible glitch frames, and the
// payload picker after the first win.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

test('a call run: lose two to the storm, skip them, the call connects at 3/5', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('packet-run-wins', '1'));
  await page.goto(`${app.origin}/?seed=CALL1&map=act1&payload=call`);
  await page.getByRole('button', { name: /deliver/i }).click();

  // the call kit: Skip on the belt, Retransmit absent
  assert.equal(await page.locator('#tool-skip').count(), 1);
  assert.equal(await page.locator('#tool-retransmit').count(), 0);

  await page.locator('[data-road-chip="short"]').click();
  await page.locator('[data-road-chip="short"]').click();
  await page.locator('#go:enabled').click();
  await page.locator('#go:enabled').click(); // storm sweeps #2 and #4

  // wave both goodbye
  for (const id of [2, 4]) {
    await page.locator('#tool-skip:enabled').click();
    await page.locator(`.fragment-chip.targetable[data-fragment="${id}"]`).click();
  }
  assert.equal(await page.locator('.fragment-chip.skipped').count(), 2);

  await page.locator('#go:enabled').click();
  await page.locator('#go:enabled').click();
  await page.locator('.win-screen').waitFor({ timeout: 8000 });
  const text = await page.locator('.win-screen').textContent();
  assert.match(text, /call connected/i);
  assert.match(text, /3\/5 frames/);
  assert.equal(await page.locator('.call-frame.gap').count(), 2, 'glitch frames visible');
  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.outcome, 'rendered');
  assert.equal(run.payload, 'udp-call');
  await page.context().close();
});

test('after the first win, the start screen offers the payload choice', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('packet-run-wins', '1'));
  await page.goto(`${app.origin}/?seed=PICK1&map=act1`);
  assert.equal(await page.locator('[data-payload]').count(), 2, 'two payload cards');
  await page.locator('[data-payload="udp-call"]').click();
  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.payload, 'udp-call');
  assert.deepEqual(run.belt, ['duplicate', 'skip']);
  await page.context().close();
});

test('gentle mode persists and softens the world; the daily run shares a date seed', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('packet-run-wins', '1'));
  await page.goto(`${app.origin}/?seed=GENTLE1&map=act1&payload=file`);
  await page.locator('#gentle').check();
  await page.getByRole('button', { name: /deliver/i }).click();
  let run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.mods?.gustChance, 0, 'gentle mode = easy world');
  assert.equal(await page.evaluate(() => localStorage.getItem('packet-run-gentle')), '1');

  // the daily run: a shared date seed
  await page.goto(`${app.origin}/?map=act1&payload=file`);
  await page.locator('#daily').click();
  run = await page.evaluate(() => window.packetRun.run);
  assert.match(run.seed, /^DAY-\d{8}$/);
  assert.equal(run.phase, 'junction');
  await page.context().close();
});

test('a brand-new player gets the simple message start (no picker)', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.goto(`${app.origin}/?seed=FRESH1`);
  assert.equal(await page.locator('[data-payload]').count(), 1, 'single Deliver button');
  await page.getByRole('button', { name: /deliver/i }).click();
  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.payload, 'tcp-file');
  await page.context().close();
});
