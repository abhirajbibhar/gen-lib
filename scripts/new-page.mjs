#!/usr/bin/env node
// Scaffold a page: writes production/<slug>.html and, when asked, appends a
// NAV entry to src/v4/shell-render.js.
//
//   npm run new -- reports --title "Reports"
//   npm run new -- user-roles --title "User roles" \
//     --nav-group "Admin" --icon profile \
//     --breadcrumb "Home > User management|user_management.html > Roles"
//
// No --nav-group means a page that exists but isn't linked from the sidebar.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const NAV_FILE = resolve(ROOT, 'src/v4/shell-render.js');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(arg);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const slug = (args._[0] || '').trim().replace(/\.html$/, '');

if (!slug) {
  console.error('Usage: npm run new -- <slug> [--title "…"] [--nav-group "…"] [--icon name]');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) {
  console.error(`Invalid slug "${slug}" — use lowercase letters, digits, - and _.`);
  process.exit(1);
}

const file = resolve(ROOT, 'production', `${slug}.html`);
if (existsSync(file)) {
  console.error(`production/${slug}.html already exists.`);
  process.exit(1);
}

const title = typeof args.title === 'string' ? args.title : slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const pageTitle = title.replace(/"/g, '&quot;');
const breadcrumb = (typeof args.breadcrumb === 'string' ? args.breadcrumb : `Home > ${title}`).replace(/"/g, '&quot;');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle} | Gentelella</title>
<link rel="icon" href="../images/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script type="module" src="/src/main-v4.js"></script>
</head>
<body data-shell="admin" data-page="${slug}" data-breadcrumb="${breadcrumb}">

<main class="main">
<div class="page-wrapper">

  <div class="page-header">
    <div class="page-header-row">
      <div>
        <div class="page-pretitle">${breadcrumb.split(' > ').slice(0, -1).pop() || 'Pages'}</div>
        <h1 class="page-title">${pageTitle}</h1>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-body">
      <p style="color:var(--text-secondary);font-size:14px">
        ${pageTitle} — start building here.
      </p>
    </div>
  </div>

</div>
</main>

</body>
</html>
`;

writeFileSync(file, html);
console.log(`✓ production/${slug}.html`);

if (typeof args['nav-group'] === 'string') {
  const group = args['nav-group'];
  const icon = typeof args.icon === 'string' ? args.icon : 'pages';
  const source = readFileSync(NAV_FILE, 'utf8');
  const groupStart = source.indexOf(`label: '${group}'`);

  if (groupStart === -1) {
    console.error(`✖ NAV group "${group}" not found in src/v4/shell-render.js`);
    console.error('  Created the page anyway; add the NAV entry by hand.');
    process.exit(1);
  }

  // Insert before the closing "]" of the `items:` array that follows the
  // group label. Counted brackets keep nested children blocks intact.
  const itemsStart = source.indexOf('items: [', groupStart);
  let depth = 0;
  let itemsEnd = -1;
  for (let i = source.indexOf('[', itemsStart); i < source.length; i++) {
    if (source[i] === '[') {
      depth++;
    } else if (source[i] === ']') {
      depth--;
      if (depth === 0) {
        itemsEnd = i;
        break;
      }
    }
  }

  if (itemsEnd === -1) {
    console.error(`✖ Could not find the end of the "${group}" items array.`);
    process.exit(1);
  }

  const key = slug.replace(/_/g, '-');
  const entry = `      { key: '${key}', href: '${slug}.html', text: '${title.replace(/'/g, "\\'")}', icon: '${icon}' },\n`;
  const updated = `${source.slice(0, itemsEnd)}${entry}    ${source.slice(itemsEnd)}`;
  writeFileSync(NAV_FILE, updated);
  console.log(`✓ NAV entry added under "${group}" (icon: ${icon})`);
}

console.log(`\nNext: npm run dev, then open /production/${slug}.html`);
