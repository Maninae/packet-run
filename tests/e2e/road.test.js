// road.test.js — the chase-cam road view (design/11 step 3): Act 1 behind
// ?view=road at a landscape stage. The forecast carries over 1:1 (signposts
// = glyph chips, same data-road-chip handles), the top-down map stays one
// toggle away, and a full run must play in BOTH motion modes (testing lore:
// reduced-motion E2E hides animation-path crashes — the hop dolly and the
// impact fates only execute full-motion).

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { DEST_ADDRESS } from '../../js/engine.js';

const ROAD_BOX = '0 0 1280 800';
const MAP_LANDSCAPE_BOX = '0 0 560 390';

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

async function startRun(page, url, { wins = 1, dns = 8 } = {}) {
  await page.addInitScript(([w, d]) => {
    localStorage.setItem('packet-run-wins', String(w));
    localStorage.setItem('packet-run-dns', String(d));
  }, [wins, dns]);
  await page.goto(app.origin + url);
  await page.getByRole('button', { name: /deliver/i }).click();
}

// The flows-suite policy, driven through whichever view is active.
async function playThrough(page, { road = 'short', insure = [] } = {}) {
  const chip = page.locator(`[data-road-chip="${road}"]`);
  await chip.click();
  await chip.click();
  for (const id of insure) {
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
  return page.evaluate(() => window.packetRun.run);
}

test('act 1 + landscape + ?view=road: the chase-cam renders the junction', async () => {
  const page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=ROAD1&map=act1&payload=file&view=road');
  assert.equal(await page.locator('#map-layer').getAttribute('viewBox'), ROAD_BOX);

  // signposts ARE the chips: same handles, same forecast, one dot per hop
  assert.equal(await page.locator('.rv-sign').count(), 2);
  const shortSign = page.locator('[data-road-chip="short"]');
  assert.match(await shortSign.textContent(), /#2 #4/, 'the storm names its targets');
  assert.equal(await shortSign.locator('circle[fill="#eafff2"]').count(), 4,
    'four hop dots on the short road sign');
  assert.equal(
    await page.locator('[data-road-chip="long"] circle[fill="#eafff2"]').count(), 7,
    'seven on the long road sign');

  // the party formation is painted on the canvas
  const painted = await page.evaluate(() => {
    const c = document.querySelector('#live-layer');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
    return false;
  });
  assert.ok(painted, 'Pip and the fragments stand on the trunk');
  await page.context().close();
});

test('the top-down map stays one toggle away (and comes back)', async () => {
  const page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=ROAD2&map=act1&payload=file&view=road');
  const toggle = page.locator('#view-toggle');
  assert.equal((await toggle.textContent()).trim(), 'Map');
  await toggle.click();
  assert.equal(await page.locator('#map-layer').getAttribute('viewBox'), MAP_LANDSCAPE_BOX);
  assert.equal(await page.locator('#map-layer').getAttribute('preserveAspectRatio'),
    'xMidYMid meet', 'the map letterboxes — no leftover slice-crop from the road view');
  assert.equal((await toggle.textContent()).trim(), 'Road');
  await toggle.click();
  assert.equal(await page.locator('#map-layer').getAttribute('viewBox'), ROAD_BOX);
  await page.context().close();
});

test('without the flag, or on portrait, or past act 1: the classic map', async () => {
  // no flag at desktop
  let page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=ROAD3&map=act1&payload=file');
  assert.equal(await page.locator('#map-layer').getAttribute('viewBox'), MAP_LANDSCAPE_BOX);
  assert.equal(await page.locator('#view-toggle').isVisible(), false);
  await page.context().close();

  // flag on portrait — the phone column keeps the playtested map
  page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=ROAD3&map=act1&payload=file&view=road');
  assert.equal(await page.locator('#map-layer').getAttribute('viewBox'), '0 0 390 560');
  await page.context().close();

  // flag at act 2 — no scenery yet, fall back
  page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=ROAD3&payload=file&view=road', { wins: 3 });
  assert.equal(await page.locator('#map-layer').getAttribute('viewBox'), MAP_LANDSCAPE_BOX);
  await page.context().close();
});

test('the DNS mystery house: dim "?" until the lookup, then name + number', async () => {
  const page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=ROAD4&map=act1&payload=file&view=road', { dns: 0 });
  let text = await page.locator('#map-layer').textContent();
  assert.ok(!text.includes("Grandma's"), 'name withheld on the horizon');
  assert.equal((await page.locator('.rv-plate').textContent()).trim(), '?');
  await page.locator('#go:enabled').click(); // Look it up
  text = await page.locator('#map-layer').textContent();
  assert.ok(text.includes("Grandma's"), 'the porch light comes on');
  assert.ok(text.includes(DEST_ADDRESS), 'the address plate hangs by the door');
  await page.context().close();
});

test('a full run plays end-to-end in the road view (reduced motion)', async () => {
  const page = await app.page(VIEWPORTS.desktop, { reducedMotion: 'reduce' });
  await startRun(page, '/?seed=FLOW-insureBoth&map=act1&payload=file&view=road');
  const run = await playThrough(page, { road: 'short', insure: [2, 4] });
  assert.equal(run.phase, 'done');
  assert.equal(run.outcome, 'rendered', 'the insured line still wins in the new view');
  await page.context().close();
});

test('full motion: the hop dolly and impact fates play without crashing', async () => {
  const page = await app.page(VIEWPORTS.desktop); // real timing
  await startRun(page, '/?seed=FLOW-recoverBoth&map=act1&payload=file&view=road');
  // uninsured through the storm: swept fragments + retransmits exercise
  // the swept/arrives fates and the settle path of the road hop
  const run = await playThrough(page, { road: 'short', insure: [] });
  assert.equal(run.phase, 'done');
  await page.context().close();
});
