// dns-view.test.js — the DNS beat must EARN its moment (Owen, 2026-07-03):
// before the lookup the dock is a mystery (dim, "?" plate, no name) — the map
// shows the place, the network needs the number. The lookup reveals the name
// and hangs the address plate. Cached runs (address remembered) show the
// plate from the first frame, because caching is real (design/04).

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { DEST_ADDRESS } from '../../js/engine.js';

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

test('before the lookup: the dock is unknown — no name, a "?" plate', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('packet-run-wins', '1'); // past the tutorial map
    localStorage.setItem('packet-run-dns', '0');  // cache empty → lookup needed
  });
  await page.goto(`${app.origin}/?seed=DNSVIEW&map=act1&payload=file`);
  await page.getByRole('button', { name: /deliver/i }).click();

  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.phase, 'dns', 'the run opens on the lookup beat');
  const mapText = await page.locator('#map-layer').textContent();
  assert.ok(!mapText.includes("Grandma's"), 'the name is withheld until the lookup');
  assert.equal(await page.locator('.dock-plate').count(), 1, 'the dock wears a plate');
  assert.equal((await page.locator('.dock-plate').textContent()).trim(), '?',
    'the plate reads "?" — we do not have the number yet');

  // the lookup reveals the name and the number
  await page.locator('#go:enabled').click();
  const after = await page.evaluate(() => window.packetRun.run);
  assert.equal(after.phase, 'junction');
  const revealed = await page.locator('#map-layer').textContent();
  assert.ok(revealed.includes("Grandma's"), 'the name appears');
  assert.ok(revealed.includes(DEST_ADDRESS), 'the address plate hangs under the dock');
  await page.context().close();
});

test('a cached run knows the address from the first frame', async () => {
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('packet-run-wins', '1');
    localStorage.setItem('packet-run-dns', '8'); // remembered — no beat
  });
  await page.goto(`${app.origin}/?seed=DNSVIEW2&map=act1&payload=file`);
  await page.getByRole('button', { name: /deliver/i }).click();
  const run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.phase, 'junction', 'no lookup beat — the cache answered');
  const mapText = await page.locator('#map-layer').textContent();
  assert.ok(mapText.includes("Grandma's"));
  assert.ok(mapText.includes(DEST_ADDRESS), 'the remembered address is shown');
  await page.context().close();
});
