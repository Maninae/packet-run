// autopsy.test.js — the loss-is-a-teaching-beat stack (design/06): the
// autopsy card, hint retries, run logging, and the protected first session.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

async function stormLoss(page, seed, { presetWins = true } = {}) {
  if (presetWins) {
    await page.addInitScript(() => localStorage.setItem('packet-run-wins', '1'));
  }
  await page.goto(`${app.origin}/?seed=${seed}`);
  await page.getByRole('button', { name: /deliver/i }).click();
  await page.locator('[data-road-chip="short"]').click();
  await page.locator('[data-road-chip="short"]').click();
  for (let i = 0; i < 4; i++) await page.locator('#go:enabled').click();
  await page.locator('.loss-screen').waitFor({ timeout: 8000 });
}

test('the loss screen is a full autopsy: killer, concept, tool, real-internet line', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await stormLoss(page, 'AUTOPSY1');
  const text = await page.locator('.loss-screen').textContent();
  assert.match(text, /storm got/i, 'names the killer');
  assert.match(text, /packet loss/i, 'names the concept');
  assert.match(text, /duplicate could have saved/i, 'suggests the tool');
  assert.match(text, /redundancy/i, 'the real-internet line');
  await page.context().close();
});

test('"Try with a hint" reruns the seed with easy world RNG and a hint prompt', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await stormLoss(page, 'AUTOPSY2');
  await page.getByRole('button', { name: /hint/i }).click();
  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.seed, 'AUTOPSY2');
  assert.equal(run.phase, 'junction');
  assert.equal(run.mods.gustChance, 0, 'easy mods active');
  assert.match(await page.locator('#prompt').textContent(), /^\s*Hint:/i);
  await page.context().close();
});

test('every finished run is logged to localStorage (win or lose)', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await stormLoss(page, 'AUTOPSY3');
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('packet-run-log')));
  assert.equal(log.length, 1);
  assert.equal(log[0].seed, 'AUTOPSY3');
  assert.equal(log[0].outcome, 'fail');
  assert.equal(log[0].killerConcept, 'packet-loss');
  await page.context().close();
});

test('protected first session: easy until the first win, standard after', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.goto(`${app.origin}/?seed=PROT1`); // fresh profile: zero wins
  await page.getByRole('button', { name: /deliver/i }).click();
  let run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.mods?.gustChance, 0, 'first run is protected');

  // win it: insure both and walk (cannot fail under easy mods)
  await page.locator('[data-road-chip="short"]').click();
  await page.locator('[data-road-chip="short"]').click();
  for (const id of [2, 4]) {
    await page.locator('#tool-duplicate:enabled').click();
    await page.locator(`.fragment-chip[data-fragment="${id}"]`).click();
  }
  for (let i = 0; i < 4; i++) await page.locator('#go:enabled').click();
  await page.locator('.win-screen').waitFor({ timeout: 8000 });
  await page.getByRole('button', { name: /new run/i }).click();

  run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.mods, null, 'after the first win, the real world');
  await page.context().close();
});
