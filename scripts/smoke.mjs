#!/usr/bin/env node
// Smoke test: boot the Vite dev server, request every entry page, and assert
// each one renders. Catches the failures that only show up at request time —
// a broken SCSS partial, a bad shell injection, a page that 500s because its
// import graph is wrong.
//
//   npm run smoke
//   PORT=9200 npm run smoke
//
// Exits 1 on the first run that has failures, listing every page that broke.

import { createServer } from 'vite';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PORT = Number(process.env.PORT) || 9175;
const TIMEOUT_MS = 20_000;

const pages = readdirSync(resolve(ROOT, 'production'))
  .filter((file) => file.endsWith('.html'))
  .sort();

if (pages.length === 0) {
  console.error('No pages found in production/');
  process.exit(1);
}

const shellPages = new Set(
  pages.filter((file) =>
    /<body[^>]*data-shell=["']admin["']/i.test(
      readFileSync(resolve(ROOT, 'production', file), 'utf8')
    )
  )
);

const server = await createServer({
  root: ROOT,
  logLevel: 'error',
  server: { port: PORT, strictPort: true, open: false, host: '127.0.0.1' }
});

await server.listen();
const base = `http://127.0.0.1:${PORT}`;

const failures = [];

for (const page of pages) {
  const url = `${base}/production/${page}`;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
  });
  try {
    const res = await Promise.race([fetch(url), timeout]);
    if (res.status !== 200) {
      failures.push(`${page} → HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();

    if (!/<title>[^<]+<\/title>/i.test(html)) {
      failures.push(`${page} → missing <title>`);
    }
    // The shell plugin inlines sidebar/topbar/footer at transform time, so a
    // page that opts in must already carry them in the served HTML.
    if (shellPages.has(page)) {
      if (!html.includes('class="sidebar')) {
        failures.push(`${page} → admin shell not injected (no sidebar)`);
      }
      if (!html.includes('skip-link')) {
        failures.push(`${page} → missing skip link`);
      }
      if (!html.includes('rel="manifest"')) {
        failures.push(`${page} → missing PWA manifest tag`);
      }
    }
    process.stdout.write('.');
  } catch (err) {
    failures.push(`${page} → ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

await server.close();
process.stdout.write('\n');

if (failures.length) {
  console.error(`\n✖ ${failures.length} of ${pages.length} pages failed:\n`);
  for (const line of failures) {
    console.error(`  ${line}`);
  }
  process.exit(1);
}

console.log(`✓ ${pages.length} pages responded 200 (${shellPages.size} with the admin shell)`);
