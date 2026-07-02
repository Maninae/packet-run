// share.test.js — the schoolyard loop: win → Share → a text card with the
// journey and a challenge URL → the friend opens it and gets the SAME map
// in the SAME act. Plus the grown-ups page.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { createRun, act } from '../../js/engine.js';

// a seed where the scripted line below wins on the 1a hand map
function shareSeed() {
  const line = [
    { type: 'choose-road', road: 'short' },
    { type: 'duplicate', fragment: 2 }, { type: 'duplicate', fragment: 4 },
    { type: 'onward' }, { type: 'onward' }, { type: 'onward' }, { type: 'onward' },
  ];
  for (let i = 0; i < 300; i++) {
    const run = createRun({ seed: `SHARE${i}` });
    try { for (const a of line) act(run, a); } catch { continue; }
    if (run.outcome === 'rendered'
      && !run.events.find((e) => e.type === 'impact').gust) return `SHARE${i}`;
  }
  throw new Error('no clean share seed');
}

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

async function winTutorialRun(page) {
  await page.getByRole('button', { name: /deliver/i }).click();
  await page.locator('[data-road-chip="short"]').click();
  await page.locator('[data-road-chip="short"]').click();
  for (const id of [2, 4]) { // insure what the storm names
    await page.locator('#tool-duplicate:enabled').click();
    await page.locator(`.fragment-chip.targetable[data-fragment="${id}"]`).click();
  }
  for (let i = 0; i < 4; i++) await page.locator('#go:enabled').click();
  await page.locator('.win-screen').waitFor({ timeout: 8000 });
}

test('a win shares as a card: stars, journey, and a same-map challenge URL', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '1'); localStorage.setItem('packet-run-dns', '8'); });
  const seed = shareSeed();
  await page.goto(`${app.origin}/?seed=${seed}&map=act1&payload=file`);
  await winTutorialRun(page);

  await page.locator('#share').click();
  await page.locator('#share-card:not([hidden])').waitFor({ timeout: 4000 });
  const card = await page.locator('#share-card').textContent();
  assert.match(card, /Packet Run — Act 1 · Home & Neighborhood/);
  assert.match(card, /[★☆]{3} · 5\/5 fragments/);
  assert.match(card, /→📬/, 'the journey line lands at the dock');
  assert.match(card, new RegExp(`\\?seed=${seed}&payload=file&act=1`), 'the challenge pins seed+payload+act');
  assert.match(await page.locator('#share').textContent(), /Copied!/);

  // the friend's side: the URL opens the same map in the same act
  const urlMatch = card.match(/(http\S+)/);
  const friend = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await friend.addInitScript(() => { localStorage.setItem('packet-run-wins', '9'); localStorage.setItem('packet-run-dns', '8'); });
  await friend.goto(urlMatch[1].replace(/&map=\w+/, ''));
  const run = await friend.evaluate(() => window.packetRun.run);
  assert.equal(run.seed, seed);
  assert.match(await friend.locator('#act-chip').textContent(), /Act 1/,
    'the pinned act overrides the friend\'s own ladder');
  await page.context().close();
  await friend.context().close();
});

test('the grown-ups page is linked from the start screen and stands alone', async () => {
  const page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  await page.goto(`${app.origin}/?seed=GROWN1&map=act1`);
  await page.locator('.grownups-link').click();
  await page.waitForURL(/teachers\.html/);
  const text = await page.locator('.page').textContent();
  assert.match(text, /never teach a falsehood/i);
  assert.match(text, /TCP vs UDP by feel/);
  assert.match(text, /No accounts, no tracking/);
  assert.match(text, /digital divide/i);
  await page.locator('.back').click();
  await page.waitForURL(/index\.html|\/$/);
  await page.context().close();
});
