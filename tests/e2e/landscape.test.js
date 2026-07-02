// landscape.test.js — the desktop two-pane layout (design/11 step 2): the map
// pane west with the journey flowing west→east, the rail (meters / prompt /
// party / belt) east. Portrait is the playtested design target — these tests
// also pin that it stays untouched. Includes a full-motion desktop run
// (testing lore: reduced-motion E2E hides animation-path crashes).

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { createRun, legalActions, act } from '../../js/engine.js';
import { generateMap } from '../../js/generator.js';

const PORTRAIT_BOX = '0 0 390 560';
const LANDSCAPE_BOX = '0 0 560 390';

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

async function startRun(page, url, wins = 1) {
  await page.addInitScript((w) => {
    localStorage.setItem('packet-run-wins', String(w));
    localStorage.setItem('packet-run-dns', '8');
  }, wins);
  await page.goto(app.origin + url);
  await page.getByRole('button', { name: /deliver/i }).click();
}

test('desktop: a real two-pane composition — map west, rail east', async () => {
  const page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=LAND1&map=act1&payload=file');
  const stage = await page.locator('#stage').boundingBox();
  assert.ok(stage.width > VIEWPORTS.desktop.width * 0.55, 'the map pane is the star');
  for (const sel of ['#meters', '#prompt', '#party', '#belt']) {
    const b = await page.locator(sel).boundingBox();
    assert.ok(b.x >= stage.x + stage.width - 1, `${sel} lives in the east rail`);
  }
  const meters = await page.locator('#meters').boundingBox();
  const belt = await page.locator('#belt').boundingBox();
  assert.ok(meters.y < belt.y, 'meters top the rail, the belt anchors it');
  assert.equal(await page.locator('#map-layer').getAttribute('viewBox'), LANDSCAPE_BOX);
  await page.context().close();
});

test('desktop: the journey flows west→east; chips, fog, clouds stay in frame', async () => {
  const page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=LAND2&map=act1&payload=file');
  const geo = await page.evaluate(async () => {
    const { layoutMap } = await import('./js/map-layout.js');
    const nodes = layoutMap(window.packetRun.run.map);
    const rect = (n) => {
      const r = n.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, cx: r.x + r.width / 2 };
    };
    return {
      src: nodes.src,
      dock: nodes.dock,
      stage: rect(document.querySelector('#stage')),
      chips: [...document.querySelectorAll('.glyph-chip')].map(rect),
      clouds: [...document.querySelectorAll('.hazard-cloud')].map(rect),
      fog: rect(document.querySelector('.fog')),
    };
  });
  assert.ok(geo.src.x < geo.dock.x, 'home west, dock east');
  assert.equal(geo.chips.length, 2, 'both forecast chips drawn at the junction');
  for (const b of [...geo.chips, ...geo.clouds]) {
    assert.ok(b.x >= geo.stage.x && b.right <= geo.stage.right, 'inside the pane (x)');
    assert.ok(b.y >= geo.stage.y && b.bottom <= geo.stage.bottom, 'inside the pane (y)');
  }
  assert.ok(geo.fog.cx > geo.stage.x + (geo.stage.right - geo.stage.x) / 2,
    'the mist hugs the dock in the east');

  // the canvas party cluster stands at Home — painted pixels, west third
  const party = await page.evaluate(() => {
    const c = document.querySelector('#live-layer');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    let count = 0;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] > 0) { sum += ((i - 3) / 4) % c.width; count++; }
    }
    return { count, centroidX: count ? sum / count : 0, width: c.width };
  });
  assert.ok(party.count > 0, 'the party is drawn on the canvas in landscape');
  assert.ok(party.centroidX < party.width / 3, 'the party stands at Home in the west');
  await page.context().close();
});

test('desktop: a long recipient label stays inside the map pane', async () => {
  const page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=GENMAP1&payload=file', 7); // act 3 → "Kenji's, across the ocean"
  const geo = await page.evaluate(() => {
    const label = [...document.querySelectorAll('#map-layer text')]
      .find((n) => n.textContent.includes('Kenji'));
    const r = label.getBoundingClientRect();
    const s = document.querySelector('#stage').getBoundingClientRect();
    return { label: { x: r.x, right: r.right }, stage: { x: s.x, right: s.right } };
  });
  assert.ok(geo.label.x >= geo.stage.x && geo.label.right <= geo.stage.right,
    `dock label ${geo.label.x}..${geo.label.right} inside pane ${geo.stage.x}..${geo.stage.right}`);
  await page.context().close();
});

test('portrait: the phone column is untouched', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=LAND3&map=act1&payload=file');
  assert.equal(await page.locator('#map-layer').getAttribute('viewBox'), PORTRAIT_BOX);
  assert.equal(await page.evaluate(
    () => getComputedStyle(document.querySelector('#game')).gridTemplateAreas), 'none');
  const stage = await page.locator('#stage').boundingBox();
  const belt = await page.locator('#belt').boundingBox();
  assert.ok(belt.y >= stage.y + stage.height, 'the belt sits below the map — the column stands');
  await page.context().close();
});

test('crossing the breakpoint mid-run re-lays the map live', async () => {
  const page = await app.page({ width: 800, height: 900 }, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=LAND4&map=act1&payload=file');
  assert.equal(await page.locator('#map-layer').getAttribute('viewBox'), PORTRAIT_BOX);
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.waitForFunction((v) =>
    document.querySelector('#map-layer').getAttribute('viewBox') === v, LANDSCAPE_BOX);
  await page.setViewportSize({ width: 800, height: 900 });
  await page.waitForFunction((v) =>
    document.querySelector('#map-layer').getAttribute('viewBox') === v, PORTRAIT_BOX);
  await page.context().close();
});

test('full motion at desktop: a complete run finishes with animations enabled', async () => {
  const page = await app.page(VIEWPORTS.desktop); // real timing — no reduced motion
  await startRun(page, '/?seed=FLOW-insureBoth&map=act1&payload=file');
  const chip = page.locator('[data-road-chip="short"]');
  await chip.click();
  await chip.click();
  for (const id of [2, 4]) {
    await page.locator('#tool-duplicate:enabled').click();
    await page.locator(`.fragment-chip[data-fragment="${id}"]`).click();
  }
  for (let guard = 0; guard < 200; guard++) {
    if (await page.locator('.win-screen, .loss-screen').count()) break;
    if (await page.locator('#tool-retransmit:enabled').count()
        && await page.locator('.fragment-chip.lost').count()) {
      await page.locator('#tool-retransmit:enabled').click();
      const target = page.locator('.fragment-chip.targetable').first();
      if (await target.count()) { await target.click(); continue; }
      await page.locator('#tool-retransmit').click();
    }
    const go = page.locator('#go:enabled');
    if (await go.count()) { await go.click(); continue; }
    await page.waitForTimeout(150);
  }
  await page.locator('.win-screen, .loss-screen').waitFor({ timeout: 30000 });
  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.phase, 'done');
  // the overlay card recomposes sensibly: fully on screen at 1280x800
  const screen = await page.locator('.screen').boundingBox();
  assert.ok(screen.x >= 0 && screen.y >= 0
    && screen.x + screen.width <= VIEWPORTS.desktop.width
    && screen.y + screen.height <= VIEWPORTS.desktop.height,
  'the end-of-run card fits the desktop viewport');
  await page.context().close();
});

test('the east rail keeps every control at the 44px touch minimum', async () => {
  const page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=LAND5&map=act1&payload=file');
  for (const sel of ['.fragment-chip', '.tool-btn', '.go-btn', '.legend-chip']) {
    for (const box of await page.locator(sel).evaluateAll(
      (els) => els.map((el) => el.getBoundingClientRect()))) {
      assert.ok(box.width >= 44 && box.height >= 44,
        `${sel} is ${box.width}x${box.height}, below the 44px minimum`);
    }
  }
  await page.context().close();
});

// ---- the villain overlay in landscape: reach the Act-5 duel at the dock ----

// Same march policy as boss.test.js, but we only need a seed that OPENS the
// duel — winning it is the boss suite's job.
function reachesDuel(seed) {
  const run = createRun({ seed, map: generateMap(seed, { act: 5 }) });
  for (let guard = 0; guard < 200 && run.phase !== 'done'; guard++) {
    if (run.phase === 'duel') return true;
    const legal = legalActions(run);
    if (run.phase === 'event') { act(run, legal[0]); continue; }
    if (run.phase === 'reward') { act(run, legal.find((a) => a.kind === 'bandwidth')); continue; }
    if (run.phase === 'junction') { act(run, { type: 'choose-road', road: 'short' }); continue; }
    const sends = legal.filter((a) => a.type === 'send');
    if (sends.length) { act(run, sends.at(-1)); continue; }
    const push = legal.find((a) => a.type === 'push');
    if (push) { act(run, push); continue; }
    act(run, { type: 'onward' });
  }
  return false;
}

function duelSeed() {
  for (let i = 0; i < 3000; i++) {
    if (reachesDuel(`LBOSS${i}`)) return `LBOSS${i}`;
  }
  throw new Error('no duel-reaching seed found');
}

test('the Static looms inside the landscape map pane during the duel', async () => {
  const seed = duelSeed();
  const page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  await startRun(page, `/?seed=${seed}&payload=file`, 12); // wins=12 → act 5
  for (let guard = 0; guard < 80; guard++) {
    const run = await page.evaluate(() => window.packetRun.run);
    if (run.phase === 'duel' || run.phase === 'done') break;
    if (await page.locator('[data-event-option]').count()) {
      await page.locator('[data-event-option]:enabled').first().click(); continue;
    }
    if (run.phase === 'reward') {
      await page.locator('[data-reward-kind="bandwidth"]').first().click(); continue;
    }
    if (run.phase === 'junction') {
      const chip = page.locator('[data-road-chip="short"]');
      await chip.click(); await chip.click(); continue;
    }
    if (await page.locator('.send-btn').count()) {
      await page.locator('.send-btn').last().click(); continue;
    }
    const target = page.locator('.fragment-chip.targetable').first();
    if (run.siege && await target.count()) { await target.click(); continue; }
    const go = page.locator('#go:enabled');
    if (await go.count()) { await go.click(); continue; }
    await page.waitForTimeout(100);
  }
  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.phase, 'duel', 'the tunnel of noise opened at the dock');
  const villain = await page.locator('#villain').boundingBox();
  assert.ok(villain, 'The Static is visible');
  const stage = await page.locator('#stage').boundingBox();
  assert.ok(villain.x >= stage.x && villain.x + villain.width <= stage.x + stage.width
    && villain.y >= stage.y, 'The Static looms inside the map pane');
  await page.context().close();
});
