// play.test.js — full Phase 1a runs through the REAL UI, asserting the screen
// agrees with a headless engine replay of the same seed. Reduced-motion is
// emulated so beats resolve instantly and deterministically.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { createRun, act } from '../../js/engine.js';

// Find seeds with known rng behavior by replaying the engine headlessly.
function scanSeed(predicate) {
  for (let i = 0; i < 500; i++) {
    const seed = `E2E${i}`;
    if (predicate(seed)) return seed;
  }
  throw new Error('no seed found');
}

function replay(seed, actions) {
  const run = createRun({ seed });
  for (const a of actions) act(run, a);
  return run;
}

const INSURE_BOTH = [
  { type: 'choose-road', road: 'short' },
  { type: 'duplicate', fragment: 2 }, { type: 'duplicate', fragment: 4 },
  { type: 'onward' }, { type: 'onward' }, { type: 'onward' }, { type: 'onward' },
];

// a seed where insure-both wins with no gust (clean, fully scripted win)
const WIN_SEED = scanSeed((s) => {
  const run = replay(s, INSURE_BOTH);
  return run.outcome === 'rendered' &&
    !run.events.find((e) => e.type === 'impact').gust;
});
const WIN_EXPECTED = replay(WIN_SEED, INSURE_BOTH);

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

async function openGame(page, seed) {
  // these tests assert against unmodded engine replays — skip the protected
  // first session (which softens world RNG until the first win)
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '1'); localStorage.setItem('packet-run-dns', '8'); });
  await page.goto(`${app.origin}/?seed=${seed}&map=act1&payload=file`); // pin the 1a region
  await page.getByRole('button', { name: /deliver/i }).click(); // start overlay
}

test('win path: insure both, walk the storm road, message renders', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await openGame(page, WIN_SEED);

  // junction: tap the short road to preview, tap again to commit (build card #9)
  await page.locator('[data-road-chip="short"]').click();
  await page.locator('[data-road-chip="short"]').click();

  // arm Duplicate, tap #2; again for #4
  await page.locator('#tool-duplicate').click();
  await page.locator('.fragment-chip[data-fragment="2"]').click();
  await page.locator('#tool-duplicate').click();
  await page.locator('.fragment-chip[data-fragment="4"]').click();

  // ride to the dock
  for (let i = 0; i < 4; i++) {
    await page.locator('#go:enabled').click();
  }

  const win = page.locator('.win-screen');
  await win.waitFor({ timeout: 5000 });
  await assert.rejects(win.locator('.loss-line').waitFor({ timeout: 50 }).then(() => {}));

  // the UI's outcome must match the engine replay exactly
  const shown = await page.locator('.win-stars').getAttribute('data-stars');
  assert.equal(Number(shown), WIN_EXPECTED.stars);
  const uiRun = await page.evaluate(() => window.packetRun.run);
  assert.equal(uiRun.outcome, 'rendered');
  assert.equal(uiRun.bandwidth, WIN_EXPECTED.bandwidth);
  assert.equal(uiRun.deadline, WIN_EXPECTED.deadline);
  await page.context().close();
});

test('loss path: ignore the storm, lose fragments, get the loss line + retry same seed', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await openGame(page, WIN_SEED);

  await page.locator('[data-road-chip="short"]').click();
  await page.locator('[data-road-chip="short"]').click();
  for (let i = 0; i < 4; i++) {
    await page.locator('#go:enabled').click();
  }

  const loss = page.locator('.loss-screen');
  await loss.waitFor({ timeout: 5000 });
  const line = await loss.locator('.loss-line').textContent();
  assert.match(line, /storm got/i, 'the loss line names the killer');
  assert.match(line, /real internet/i, 'and normalizes it');

  // retry that seed: same seed, fresh run, back at the junction
  await loss.getByRole('button', { name: /same seed/i }).click();
  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.seed, WIN_SEED);
  assert.equal(run.phase, 'junction');
  await page.context().close();
});

test('the belt greys unaffordable tools and arming shows targets', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await openGame(page, WIN_SEED);

  // retransmit needs a lost fragment — disabled at the junction
  assert.ok(await page.locator('#tool-retransmit').isDisabled());
  await page.locator('[data-road-chip="short"]').click();
  await page.locator('[data-road-chip="short"]').click();

  await page.locator('#tool-duplicate').click();
  const targets = await page.locator('.fragment-chip.targetable').count();
  assert.equal(targets, 5, 'all five insurable before impact');
  // disarm by tapping again — no targets remain
  await page.locator('#tool-duplicate').click();
  assert.equal(await page.locator('.fragment-chip.targetable').count(), 0);
  await page.context().close();
});
