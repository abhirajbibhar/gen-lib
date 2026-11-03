#!/usr/bin/env node
// Open a built file in the default application, cross-platform. `open` only
// exists on macOS, so `npm run analyze` used to die on Windows and Linux.

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const target = process.argv[2];

if (!target) {
  console.error('Usage: node scripts/open-file.mjs <path>');
  process.exit(1);
}

const file = resolve(process.cwd(), target);
if (!existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const [command, args] =
  process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '', file]]
    : process.platform === 'darwin'
      ? ['open', [file]]
      : ['xdg-open', [file]];

const child = spawn(command, args, { stdio: 'ignore', detached: true });
child.on('error', (err) => {
  console.error(`Could not open ${file}: ${err.message}`);
  process.exit(1);
});
child.unref();

console.log(`Opened ${target}`);
