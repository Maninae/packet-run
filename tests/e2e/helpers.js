// helpers.js — shared Playwright setup for e2e tests and visual checks.
// Serves the repo root over http (ES modules need a server) and opens pages
// at the two canonical viewports: 6" phone portrait and small desktop.

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
};

export const VIEWPORTS = {
  portrait: { width: 390, height: 844 },   // iPhone 12–15 class, the design target
  desktop: { width: 1280, height: 800 },
};

export async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let path = normalize(url.pathname).replace(/^([/\\])+/, '');
      if (path === '' || path === '.') path = 'index.html';
      const file = join(ROOT, path);
      if (!file.startsWith(ROOT)) throw new Error('traversal');
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, origin: `http://localhost:${server.address().port}` };
}

export async function launch() {
  const { server, origin } = await startServer();
  const browser = await chromium.launch();
  return {
    origin,
    browser,
    async page(viewport = VIEWPORTS.portrait, options = {}) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 2,
        hasTouch: viewport === VIEWPORTS.portrait,
        ...options,
      });
      const p = await context.newPage();
      p.on('pageerror', (err) => { throw new Error(`page error: ${err.message}`); });
      await p.goto(origin + '/');
      return p;
    },
    async close() {
      await browser.close();
      server.close();
    },
  };
}
