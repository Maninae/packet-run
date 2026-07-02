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
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '1'); localStorage.setItem('packet-run-dns', '8'); });
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
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '1'); localStorage.setItem('packet-run-dns', '8'); });
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
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '1'); localStorage.setItem('packet-run-dns', '8'); });
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

test('a "?" node opens its card; the choice lands and the run continues', async () => {
  const { generateMap } = await import('../../js/generator.js');
  let seed = null;
  for (let i = 0; i < 1500 && !seed; i++) {
    const map = generateMap(`Q${i}`, { act: 1 }); // wins=1 plays act 1
    if (map.segments[0].roads.short.event) seed = `Q${i}`;
  }
  assert.ok(seed, 'found an event-on-first-short-road seed');
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '1'); localStorage.setItem('packet-run-dns', '8'); });
  await page.goto(`${app.origin}/?seed=${seed}&payload=file`);
  await page.getByRole('button', { name: /deliver/i }).click();
  const chip = page.locator('[data-road-chip="short"]');
  await chip.click();
  await chip.click();
  for (let g = 0; g < 8; g++) {
    if (await page.locator('[data-event-option]').count()) break;
    await page.locator('#go:enabled').click();
  }
  assert.ok(await page.locator('.event-screen').count(), 'the card opened');
  const before = await page.evaluate(() => window.packetRun.run);
  assert.equal(before.phase, 'event');
  await page.locator('[data-event-option]:enabled').first().click();
  const after = await page.evaluate(() => window.packetRun.run);
  assert.notEqual(after.phase, 'event', 'the card resolved');
  assert.ok(after.events.some((e) => e.type === 'event-chosen'));
  await page.context().close();
});

test('the sky rides the seed: a rainy run says so, gentle runs stay clear', async () => {
  const { weatherFor } = await import('../../js/config.js');
  let rainy = null;
  for (let i = 0; i < 300 && !rainy; i++) {
    if (weatherFor(`SKY${i}`, 2).id === 'rain') rainy = `SKY${i}`;
  }
  assert.ok(rainy, 'found a rainy act-2 seed');
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '4'); localStorage.setItem('packet-run-dns', '8'); });
  await page.goto(`${app.origin}/?seed=${rainy}&payload=file`);
  assert.match(await page.locator('#act-chip').textContent(), /Rain/);
  let run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.weather.id, 'rain');

  // gentle mode: clear skies, honest display
  await page.addInitScript(() => localStorage.setItem('packet-run-gentle', '1'));
  await page.goto(`${app.origin}/?seed=${rainy}&payload=file`);
  assert.doesNotMatch(await page.locator('#act-chip').textContent(), /Rain/);
  run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.weather.id, 'clear');
  await page.context().close();
});

test('acts climb with wins: biome class, act chip, and gated hazards', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '4'); localStorage.setItem('packet-run-dns', '8'); });
  await page.goto(`${app.origin}/?seed=ACT2A&payload=file`);
  assert.equal(await page.evaluate(() => document.body.className), 'act-2');
  assert.match(await page.locator('#act-chip').textContent(), /Act 2 · Backbone City/);
  let run = await page.evaluate(() => window.packetRun.run);
  const kinds = run.map.segments.flatMap((s) =>
    Object.values(s.roads).map((r) => r.hazard?.kind).filter(Boolean));
  assert.ok(kinds.every((k) => !['trench', 'satellite', 'sniffer'].includes(k)),
    'act 2 never rolls ocean systems');

  await page.addInitScript(() => localStorage.setItem('packet-run-wins', '9'));
  await page.goto(`${app.origin}/?seed=ACT3A&payload=file`);
  assert.equal(await page.evaluate(() => document.body.className), 'act-3');
  assert.match(await page.locator('#act-chip').textContent(), /Act 3 · The Ocean Crossing/);
  await page.context().close();
});

test('DNS: the first run looks up the address; the cache skips it afterward', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.goto(`${app.origin}/?seed=DNS1&map=act1&payload=file`); // fresh: no cache
  await page.getByRole('button', { name: /deliver/i }).click();
  let run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.phase, 'dns');
  const before = run.deadline;
  await page.getByRole('button', { name: /look it up/i }).click();
  run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.phase, 'junction');
  assert.equal(run.deadline, before - 1, 'the lookup cost a tick');
  assert.equal(await page.evaluate(() => localStorage.getItem('packet-run-dns')), '8');

  // reload: the device remembers — straight to the junction
  await page.reload();
  await page.getByRole('button', { name: /deliver/i }).click();
  run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.phase, 'junction');
  assert.equal(await page.evaluate(() => localStorage.getItem('packet-run-dns')), '7',
    'the cache spends down toward the next lookup');
  await page.context().close();
});
