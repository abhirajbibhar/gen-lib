#!/usr/bin/env node
// Capture light + dark screenshots of the template's key pages into
// docs/screenshots/. Builds nothing — it serves the dev server, so run it
// against whatever is on disk.
//
//   npm run screenshots
//   SHOT_PAGES=index,e_commerce npm run screenshots
//
// Requires Playwright's Chromium: `npx playwright install chromium`.

import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'docs/screenshots');
const PORT = Number(process.env.SHOT_PORT) || 9177;
const WIDTH = 1440;
const HEIGHT = 900;

// Curated set: one of each layout the template ships, not all 59 pages —
// screenshots are docs, and 118 images makes the folder useless to scan.
const DEFAULT_PAGES = [
  'index',
  'index2',
  'index3',
  'e_commerce',
  'product_detail',
  'reader',
  'orders',
  'order_detail',
  'tables',
  'tables_dynamic',
  'kanban',
  'calendar',
  'inbox',
  'chat',
  'file_manager',
  'media_gallery',
  'contacts',
  'user_management',
  'settings',
  'profile',
  'faq'
];

const pages = (process.env.SHOT_PAGES || DEFAULT_PAGES.join(','))
  .split(',')
  .map((page) => page.trim())
  .filter(Boolean);

mkdirSync(OUT, { recursive: true });

const server = await createServer({
  root: ROOT,
  logLevel: 'error',
  server: { port: PORT, strictPort: true, open: false, host: '127.0.0.1' }
});
await server.listen();
const base = `http://127.0.0.1:${PORT}`;

const browser = await chromium.launch();
const failures = [];

for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    colorScheme: theme
  });
  // The pre-paint script reads localStorage first, so setting it here is what
  // actually puts the page in the wanted theme.
  await context.addInitScript((value) => {
    localStorage.setItem('theme', value);
  }, theme);

  for (const page of pages) {
    const tab = await context.newPage();
    const errors = [];
    tab.on('pageerror', (err) => errors.push(err.message));
    try {
      await tab.goto(`${base}/production/${page}.html`, {
        waitUntil: 'networkidle',
        timeout: 30_000
      });
      // Charts and tables lazy-load after the shell paints.
      await tab.waitForTimeout(400);
      // Viewport-sized, not fullPage: the sidebar is position:fixed, so a
      // full-page capture leaves an empty band below it.
      await tab.screenshot({
        path: resolve(OUT, `${page}-${theme}.png`)
      });
      if (errors.length) {
        failures.push(`${page} (${theme}): ${errors.join('; ')}`);
      }
      process.stdout.write('.');
    } catch (err) {
      failures.push(`${page} (${theme}): ${err.message.split('\n')[0]}`);
    } finally {
      await tab.close();
    }
  }
  await context.close();
}

await browser.close();
await server.close();
process.stdout.write(`\n✓ ${pages.length * 2} screenshots → docs/screenshots/\n`);

if (failures.length) {
  console.error('\nPage errors during capture:');
  for (const line of failures) {
    console.error(`  ${line}`);
  }
  process.exit(1);
}
