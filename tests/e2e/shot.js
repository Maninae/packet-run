// shot.js — quick visual-check CLI: screenshots the game at both canonical
// viewports into the directory given as argv[2] (default: ./shots).
// Usage: node tests/e2e/shot.js /path/to/outdir [urlPath]

import { launch, VIEWPORTS } from './helpers.js';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'shots';
const urlPath = process.argv[3] ?? '/';
await mkdir(outDir, { recursive: true });

const app = await launch();
for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  const page = await app.page(viewport);
  if (urlPath !== '/') await page.goto(app.origin + urlPath);
  await page.waitForTimeout(400); // let fonts/canvas settle
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log(`${outDir}/${name}.png`);
  await page.context().close();
}
await app.close();
