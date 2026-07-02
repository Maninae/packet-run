// ddos.test.js — the Swarm elite through the real UI: chips become push
// targets, two per beat, tools surcharged, the flood disperses.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, VIEWPORTS } from './helpers.js';
import { generateMap } from '../../js/generator.js';

function swarmSeed() {
  for (let i = 0; i < 2000; i++) {
    const seed = `SWARM${i}`;
    const map = generateMap(seed, { act: 3 });
    if (map.segments.some((s, idx) => idx > 0 && s.roads.short.hazard?.kind === 'ddos')
      && map.segments[0].roads.short.hazard?.kind !== 'ddos') {
      // needs the swarm reachable by always-short play without dying first:
      // keep it simple — accept any seed whose SECOND segment shorts into it
      if (map.segments[1].roads.short.hazard?.kind === 'ddos') return seed;
    }
  }
  throw new Error('no swarm seed found');
}

let app;
test.before(async () => { app = await launch(); });
test.after(async () => { await app.close(); });

test('the Swarm: push two per beat by tapping chips, then the flood breaks', async () => {
  const seed = swarmSeed();
  const page = await app.page(VIEWPORTS.portrait, { reducedMotion: 'reduce' });
  await page.addInitScript(() => { localStorage.setItem('packet-run-wins', '9'); localStorage.setItem('packet-run-dns', '8'); });
  await page.goto(`${app.origin}/?seed=${seed}&payload=file`);
  await page.getByRole('button', { name: /deliver/i }).click();

  // ride short roads until the siege opens
  for (let guard = 0; guard < 40; guard++) {
    const run = await page.evaluate(() => window.packetRun.run);
    if (run.siege || run.phase === 'done') break;
    if (await page.locator('[data-event-option]').count()) {
      await page.locator('[data-event-option]:enabled').first().click();
      continue;
    }
    if (run.phase === 'reward') {
      await page.locator('[data-reward-kind="bandwidth"]').first().click();
      continue;
    }
    if (run.phase === 'junction') {
      const chip = page.locator('[data-road-chip="short"]');
      await chip.click();
      await chip.click();
      continue;
    }
    if (await page.locator('.send-btn').count()) {
      await page.locator('.send-btn').last().click();
      continue;
    }
    const go = page.locator('#go:enabled');
    if (await go.count()) { await go.click(); continue; }
    await page.waitForTimeout(100);
  }

  let run = await page.evaluate(() => window.packetRun.run);
  assert.ok(run.siege, 'the siege opened');
  assert.equal(await page.locator('#go:enabled').count(), 0, 'no Onward through a flood');
  assert.ok(await page.locator('.fragment-chip.targetable').count() >= 4,
    'held fragments are push targets');

  // push everyone through, tapping chips (any order — triage is ours)
  for (let guard = 0; guard < 8; guard++) {
    run = await page.evaluate(() => window.packetRun.run);
    if (!run.siege) break;
    const target = page.locator('.fragment-chip.targetable').first();
    if (await target.count()) { await target.click(); continue; }
    await page.locator('#wait').click();
  }
  run = await page.evaluate(() => window.packetRun.run);
  assert.equal(run.siege, null, 'the flood dispersed');
  assert.ok(run.fragments.every((f) => f.status !== 'pushed'), 'everyone regrouped');
  assert.ok(run.events.some((e) => e.type === 'siege-over'));
  await page.context().close();
});
