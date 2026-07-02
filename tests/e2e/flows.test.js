// flows.test.js — the five pricing-table lines played through the REAL UI,
// each checked against a headless engine replay of the same seed and policy;
// plus usability guarantees (44px targets, desktop, full-motion, legend,
// mute persistence, seed URLs).

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { createRun, legalActions, act } from '../../js/engine.js';

// Same policy as the economy simulator: insure up front, then always
// retransmit anything lost before moving on.
function replayLine(seed, { road, insure }) {
  const run = createRun({ seed });
  act(run, { type: 'choose-road', road });
  for (const id of insure) act(run, { type: 'duplicate', fragment: id });
  while (run.phase !== 'done') {
    const retx = legalActions(run).find((a) => a.type === 'retransmit');
    act(run, retx ?? { type: 'onward' });
  }
  return run;
}

// Drive the same policy through the browser UI.
async function playLineUI(page, seed, { road, insure }, origin) {
  // skip the protected first session — these runs must match unmodded replays
  await page.addInitScript(() => localStorage.setItem('packet-run-wins', '1'));
  await page.goto(`${origin}/?seed=${seed}&map=act1&payload=file`); // pin the 1a region
  await page.getByRole('button', { name: /deliver/i }).click();
  await page.locator(`[data-road-chip="${road}"]`).click();
  await page.locator(`[data-road-chip="${road}"]`).click();
  for (const id of insure) {
    await page.locator('#tool-duplicate:enabled').click();
    await page.locator(`.fragment-chip[data-fragment="${id}"]`).click();
  }
  for (let guard = 0; guard < 200; guard++) {
    if (await page.locator('.win-screen, .loss-screen').count()) break;
    const retxTargets = page.locator('.fragment-chip.lost');
    if (await page.locator('#tool-retransmit:enabled').count()
        && await retxTargets.count()) {
      await page.locator('#tool-retransmit:enabled').click();
      const target = await page.locator('.fragment-chip.targetable').first();
      if (await target.count()) { await target.click(); continue; }
      await page.locator('#tool-retransmit').click(); // disarm (unaffordable edge)
    }
    const go = page.locator('#go:enabled');
    if (await go.count()) { await go.click(); continue; }
    await page.waitForTimeout(150); // animations playing — poll until input unlocks
  }
  await page.locator('.win-screen, .loss-screen').waitFor({ timeout: 30000 });
  return page.evaluate(() => window.packetRun.run);
}

const LINES = {
  insureBoth: { road: 'short', insure: [2, 4] },
  insureOneRecoverOne: { road: 'short', insure: [2] },
  recoverBoth: { road: 'short', insure: [] },
  longInsure: { road: 'long', insure: [3] },
  longRecover: { road: 'long', insure: [] },
};

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

for (const [name, line] of Object.entries(LINES)) {
  test(`line ${name}: UI outcome matches the engine exactly`, async () => {
    const seed = `FLOW-${name}`;
    const expected = replayLine(seed, line);
    const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
    const uiRun = await playLineUI(page, seed, line, app.origin);
    assert.equal(uiRun.outcome, expected.outcome, `${name} outcome`);
    assert.equal(uiRun.bandwidth, expected.bandwidth, `${name} bandwidth`);
    assert.equal(uiRun.deadline, expected.deadline, `${name} deadline`);
    assert.equal(uiRun.stars, expected.stars, `${name} stars`);
    await page.context().close();
  });
}

test('every interactive control meets the 44px touch minimum', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.goto(`${app.origin}/?seed=TOUCH`);
  await page.getByRole('button', { name: /deliver/i }).click();
  for (const sel of ['.fragment-chip', '.tool-btn', '.go-btn', '.legend-chip']) {
    for (const box of await page.locator(sel).evaluateAll(
      (els) => els.map((el) => el.getBoundingClientRect()))) {
      assert.ok(box.width >= 44 && box.height >= 44,
        `${sel} is ${box.width}x${box.height}, below the 44px minimum`);
    }
  }
  await page.context().close();
});

test('desktop viewport: a full run works at 1280x800', async () => {
  const seed = 'FLOW-insureBoth';
  const expected = replayLine(seed, LINES.insureBoth);
  const page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  const uiRun = await playLineUI(page, seed, LINES.insureBoth, app.origin);
  assert.equal(uiRun.outcome, expected.outcome);
  await page.context().close();
});

test('full motion: a complete run finishes with animations enabled', async () => {
  const seed = 'FLOW-insureBoth';
  const page = await app.page(VIEWPORTS.portrait); // real timing
  const uiRun = await playLineUI(page, seed, LINES.insureBoth, app.origin);
  assert.equal(uiRun.phase, 'done');
  await page.context().close();
});

test('glyph legend: opens as a popover, closes on second tap', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.goto(`${app.origin}/?seed=LEGEND`);
  await page.getByRole('button', { name: /deliver/i }).click();
  await page.locator('#glyph-legend').click();
  assert.equal(await page.locator('.legend-pop').count(), 1);
  assert.match(await page.locator('.legend-pop').textContent(), /storm/i);
  await page.locator('#glyph-legend').click();
  assert.equal(await page.locator('.legend-pop').count(), 0);
  await page.context().close();
});

test('mute persists across reloads', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.goto(`${app.origin}/?seed=MUTE`);
  await page.getByRole('button', { name: /deliver/i }).click(); // start overlay covers the header
  await page.locator('#mute').click();
  await page.reload();
  assert.equal(await page.evaluate(() => localStorage.getItem('packet-run-muted')), '1');
  await page.context().close();
});

test('a generated 3-segment map plays end to end through the UI', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('packet-run-wins', '1'));
  await page.goto(`${app.origin}/?seed=GENMAP1&payload=file`); // no map pin → generated
  await page.getByRole('button', { name: /deliver/i }).click();

  let junctions = 0;
  for (let guard = 0; guard < 60; guard++) {
    if (await page.locator('.win-screen, .loss-screen').count()) break;
    if (await page.locator('.reward-card').count()) {
      await page.locator('[data-reward-kind="bandwidth"]').first().click();
      continue;
    }
    const chip = page.locator('[data-road-chip="short"]');
    if (await chip.count()) { junctions++; await chip.click(); await chip.click(); continue; }
    if (await page.locator('#tool-retransmit:enabled').count()
        && await page.locator('.fragment-chip.lost').count()) {
      await page.locator('#tool-retransmit:enabled').click();
      const target = page.locator('.fragment-chip.targetable').first();
      if (await target.count()) { await target.click(); continue; }
      await page.locator('#tool-retransmit').click();
    }
    const go = page.locator('#go:enabled');
    if (await go.count()) { await go.click(); continue; }
    await page.waitForTimeout(100);
  }
  assert.equal(junctions, 3, 'three junction choices on a 3-segment map');
  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.phase, 'done');
  assert.equal(run.map.id, 'gen-GENMAP1');
  await page.context().close();
});

test('a new run rewrites the seed in the URL (shareable)', async () => {
  const seed = 'FLOW-recoverBoth';
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await playLineUI(page, seed, LINES.recoverBoth, app.origin);
  await page.getByRole('button', { name: /new run/i }).click();
  const url = new URL(page.url());
  const newSeed = url.searchParams.get('seed');
  assert.ok(newSeed && newSeed !== seed, 'fresh seed in the URL');
  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.seed, newSeed);
  await page.context().close();
});
