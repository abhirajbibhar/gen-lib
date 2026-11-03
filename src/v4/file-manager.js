// File manager — folder tree on the left, file grid/list on the right.
// State is in-memory only; mutations (rename/delete/star) just update the
// model and re-render. Uploads are simulated.

import { showToast } from './toast.js';
import { showModal } from './modal.js';
import { openMenu } from './menus.js';

// Folder tree (children form a hierarchy via path)
const TREE = [
  { id: 'root',       name: 'Rajgruha library', parent: null, icon: 'drive' },
  { id: 'fiction',    name: 'Fiction',     parent: 'root', icon: 'folder' },
  { id: 'nonfiction', name: 'Non-fiction', parent: 'root', icon: 'folder' },
  { id: 'audio',      name: 'Audiobooks',  parent: 'root', icon: 'folder' },
  { id: 'covers',     name: 'Covers',      parent: 'root', icon: 'folder' },
  { id: 'imports',    name: 'Imports',     parent: 'root', icon: 'folder' },
  { id: 'shared',     name: 'Shared with me', parent: null, icon: 'shared' },
  { id: 'starred',    name: 'Starred',   parent: null,    icon: 'starred' },
  { id: 'trash',      name: 'Trash',     parent: null,    icon: 'trash' }
];

const ICON = {
  drive:   '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6l4-4h4l4 4v8H2V6z"/></svg>',
  folder:  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4a1 1 0 011-1h3l2 2h5a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"/></svg>',
  shared:  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="2.5"/><circle cx="11" cy="6" r="2"/><path d="M1 14a5 5 0 0110 0M11 9a4 4 0 014 5"/></svg>',
  starred: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z"/></svg>',
  trash:   '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4h10M6 4V2h4v2M5 4l1 9h4l1-9"/></svg>'
};

const FILE_TYPES = {
  epub:  { color: 'var(--green)',   bg: 'var(--green-lt)' },
  audio: { color: 'var(--purple)',  bg: 'var(--purple-lt)' },
  pdf:   { color: 'var(--red)',     bg: 'var(--red-lt)' },
  doc:   { color: 'var(--blue)',    bg: 'var(--blue-lt)' },
  xls:   { color: 'var(--green)',   bg: 'var(--green-lt)' },
  fig:   { color: 'var(--purple)',  bg: 'var(--purple-lt)' },
  img:   { color: 'var(--yellow)',  bg: 'var(--yellow-lt)' },
  zip:   { color: 'var(--text-secondary)', bg: 'var(--bg-surface-secondary)' },
  video: { color: 'var(--azure)',   bg: 'var(--azure-lt)' },
  code:  { color: 'var(--cyan)',    bg: 'var(--cyan-lt)' }
};

// Files (folder = type 'folder') by parent id
let nextId = 1;
const FILES = [
  // root — folders only, mirroring the library shelves
  { id: nextId++, parent: 'root', type: 'folder', name: 'Fiction',     modified: 'Nov 02, 2026', size: '—', starred: false },
  { id: nextId++, parent: 'root', type: 'folder', name: 'Non-fiction', modified: 'Nov 01, 2026', size: '—', starred: false },
  { id: nextId++, parent: 'root', type: 'folder', name: 'Audiobooks',  modified: 'Oct 30, 2026', size: '—', starred: false },
  { id: nextId++, parent: 'root', type: 'folder', name: 'Covers',      modified: 'Oct 29, 2026', size: '—', starred: false },
  { id: nextId++, parent: 'root', type: 'folder', name: 'Imports',     modified: 'Nov 03, 2026', size: '—', starred: false },
  { id: nextId++, parent: 'root', type: 'epub',   name: 'The Left Hand of Darkness.epub', modified: 'Nov 02, 2026', size: '2.4 MB', starred: true },
  { id: nextId++, parent: 'root', type: 'epub',   name: 'Piranesi.epub',                  modified: 'Nov 01, 2026', size: '1.1 MB', starred: true },
  // fiction
  { id: nextId++, parent: 'fiction', type: 'epub', name: 'Piranesi.epub',              modified: 'Nov 01, 2026', size: '1.1 MB', starred: true },
  { id: nextId++, parent: 'fiction', type: 'epub', name: 'Klara and the Sun.epub',     modified: 'Oct 24, 2026', size: '1.8 MB', starred: false },
  { id: nextId++, parent: 'fiction', type: 'epub', name: 'The Name of the Wind.epub',  modified: 'Oct 19, 2026', size: '3.2 MB', starred: false },
  { id: nextId++, parent: 'fiction', type: 'epub', name: 'Circe.epub',                 modified: 'Oct 12, 2026', size: '1.6 MB', starred: false },
  // non-fiction
  { id: nextId++, parent: 'nonfiction', type: 'epub', name: 'Braiding Sweetgrass.epub', modified: 'Nov 01, 2026', size: '2.9 MB', starred: true },
  { id: nextId++, parent: 'nonfiction', type: 'pdf',  name: 'Sapiens.pdf',              modified: 'Sep 12, 2026', size: '14.2 MB', starred: false },
  { id: nextId++, parent: 'nonfiction', type: 'epub', name: 'Educated.epub',            modified: 'Oct 08, 2026', size: '2.1 MB', starred: false },
  // audiobooks
  { id: nextId++, parent: 'audio', type: 'audio', name: 'Project Hail Mary.m4b',  modified: 'Oct 28, 2026', size: '412 MB', starred: true },
  { id: nextId++, parent: 'audio', type: 'audio', name: 'Circe.m4b',              modified: 'Oct 20, 2026', size: '286 MB', starred: false },
  { id: nextId++, parent: 'audio', type: 'audio', name: 'A Psalm for the Wild-Built.m4b', modified: 'Oct 04, 2026', size: '94 MB', starred: false },
  // covers
  { id: nextId++, parent: 'covers', type: 'img', name: 'left-hand-of-darkness.jpg', modified: 'Nov 02, 2026', size: '420 KB', starred: false },
  { id: nextId++, parent: 'covers', type: 'img', name: 'piranesi.jpg',              modified: 'Nov 01, 2026', size: '310 KB', starred: false },
  { id: nextId++, parent: 'covers', type: 'img', name: 'braiding-sweetgrass.jpg',   modified: 'Nov 01, 2026', size: '365 KB', starred: false },
  // imports
  { id: nextId++, parent: 'imports', type: 'zip', name: 'calibre-export.zip',    modified: 'Nov 03, 2026', size: '1.8 GB', starred: false },
  { id: nextId++, parent: 'imports', type: 'xls', name: 'metadata-review.xlsx',  modified: 'Nov 02, 2026', size: '84 KB',  starred: false },
  { id: nextId++, parent: 'imports', type: 'doc', name: 'import-report.md',      modified: 'Nov 02, 2026', size: '12 KB',  starred: false },
  // shared
  { id: nextId++, parent: 'shared', type: 'epub', name: 'The Overstory.epub',          modified: 'Nov 02, 2026', size: '2.7 MB', starred: false },
  { id: nextId++, parent: 'shared', type: 'epub', name: 'A Psalm for the Wild-Built.epub', modified: 'Oct 27, 2026', size: '1.3 MB', starred: false }
];

let currentId = 'root';
let viewMode = 'grid'; // or 'list'

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function getNode(id) { return TREE.find((n) => n.id === id); }

function getChildren(id) {
  return FILES.filter((f) => f.parent === id);
}

function getStarredFiles() {
  return FILES.filter((f) => f.starred && f.type !== 'folder');
}

function getCurrentFiles() {
  if (currentId === 'starred') {return getStarredFiles();}
  if (currentId === 'shared')  {return FILES.filter((f) => f.parent === 'shared');}
  if (currentId === 'trash')   {return [];}
  return getChildren(currentId);
}

function buildBreadcrumb() {
  const trail = [];
  let node = getNode(currentId);
  while (node) {
    trail.unshift(node);
    node = node.parent ? getNode(node.parent) : null;
  }
  return trail;
}

function fileExt(file) {
  if (file.type === 'folder') {return '';}
  const dot = file.name.lastIndexOf('.');
  return dot > -1 ? file.name.slice(dot + 1).toUpperCase() : file.type.toUpperCase();
}

// ── Renderers ──

function renderTree() {
  const root = TREE.filter((n) => n.parent === null);
  const html = root.map((n) => {
    const subs = TREE.filter((c) => c.parent === n.id);
    return `
      <div class="tree-group">
        <button type="button" class="tree-link${n.id === currentId ? ' active' : ''}" data-id="${n.id}">
          ${ICON[n.icon] || ICON.folder}
          <span>${escapeHtml(n.name)}</span>
        </button>
        ${subs.length ? `<div class="tree-subs">${subs.map((s) => {
    const subSubs = TREE.filter((cc) => cc.parent === s.id);
    return `
            <button type="button" class="tree-link tree-sub${s.id === currentId ? ' active' : ''}" data-id="${s.id}">
              ${ICON[s.icon] || ICON.folder}
              <span>${escapeHtml(s.name)}</span>
            </button>
            ${subSubs.map((ss) => `
              <button type="button" class="tree-link tree-sub-sub${ss.id === currentId ? ' active' : ''}" data-id="${ss.id}">
                ${ICON[ss.icon] || ICON.folder}
                <span>${escapeHtml(ss.name)}</span>
              </button>
            `).join('')}
          `;
  }).join('')}</div>` : ''}
      </div>
    `;
  }).join('');
  document.getElementById('fm-tree').innerHTML = html;
}

function renderBreadcrumb() {
  const trail = buildBreadcrumb();
  document.getElementById('fm-breadcrumb').innerHTML = trail.map((n, i) =>
    `${i > 0 ? '<span class="sep" aria-hidden="true">›</span>' : ''}<button type="button" class="bc-link${i === trail.length - 1 ? ' current' : ''}" data-id="${n.id}">${escapeHtml(n.name)}</button>`
  ).join('');
}

function renderFiles() {
  const files = getCurrentFiles();
  const empty = document.getElementById('fm-empty');
  const grid = document.getElementById('fm-grid');
  if (!files.length) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  grid.className = `fm-grid view-${viewMode}`;
  grid.innerHTML = files.map((f) => {
    const isFolder = f.type === 'folder';
    const tcfg = isFolder ? null : (FILE_TYPES[f.type] || FILE_TYPES.zip);
    return `
      <button type="button" class="fm-item${f.starred ? ' starred' : ''}" data-id="${f.id}" data-type="${f.type}">
        <div class="fm-item-icon" style="${isFolder ? '' : `background:${tcfg.bg};color:${tcfg.color}`}">
          ${isFolder
    ? '<svg width="32" height="32" viewBox="0 0 32 32" fill="var(--primary-lt)" stroke="var(--primary)" stroke-width="1.2"><path d="M4 8a2 2 0 012-2h6l3 3h11a2 2 0 012 2v13a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"/></svg>'
    : `<span class="ext">${fileExt(f)}</span>`}
        </div>
        <div class="fm-item-name">${escapeHtml(f.name)}</div>
        <div class="fm-item-meta">${f.size} · ${f.modified}</div>
        <span class="fm-star${f.starred ? ' on' : ''}" data-star="${f.id}" aria-label="${f.starred ? 'Unstar' : 'Star'}">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="${f.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z"/></svg>
        </span>
        <button type="button" class="fm-item-menu" data-menu="${f.id}" aria-label="More options">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/></svg>
        </button>
      </button>
    `;
  }).join('');
}

function renderAll() {
  renderTree();
  renderBreadcrumb();
  renderFiles();
}

// ── Actions ──

function navigateTo(id) {
  currentId = id;
  renderAll();
}

function deleteFile(id) {
  const i = FILES.findIndex((f) => f.id === id);
  if (i > -1) {
    const f = FILES[i];
    FILES.splice(i, 1);
    renderAll();
    showToast(`Moved to trash: ${f.name}`);
  }
}

function renameFile(id) {
  const f = FILES.find((x) => x.id === id);
  if (!f) {return;}
  showModal({
    title: 'Rename',
    body: `
      <form class="modal-form" novalidate>
        <div class="modal-form-row">
          <label for="rn-name">Name</label>
          <input type="text" id="rn-name" name="name" value="${escapeHtml(f.name)}" autocomplete="off" required>
        </div>
      </form>
    `,
    actions: [
      { label: 'Cancel', variant: 'outline' },
      { label: 'Save', variant: 'primary', action: ({ body }) => {
        const name = body.querySelector('input').value.trim();
        if (!name) { showToast('Name is required', { variant: 'warning' }); return false; }
        f.name = name;
        renderFiles();
        showToast(`Renamed to ${name}`, { variant: 'success' });
        return true;
      } }
    ]
  });
}

function uploadDialog() {
  showModal({
    title: 'Upload files',
    body: `
      <div class="upload-zone">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div class="upload-title">Drag files here, or click to browse</div>
        <div class="upload-meta">Max file size 50 MB. PDF, DOCX, XLSX, PNG, JPG, ZIP supported.</div>
        <input type="file" multiple style="display:none">
      </div>
    `,
    actions: [
      { label: 'Cancel', variant: 'outline' },
      { label: 'Upload demo file', variant: 'primary', action: () => {
        FILES.push({ id: nextId++, parent: currentId, type: 'pdf', name: `New upload ${Date.now()}.pdf`, modified: 'just now', size: '1.2 MB', starred: false });
        renderFiles();
        showToast('File uploaded', { variant: 'success' });
        return true;
      } }
    ]
  });
}

// ── Init ──

export function initFileManager() {
  const host = document.querySelector('.file-manager');
  if (!host) {return;}

  renderAll();

  // Tree clicks
  document.getElementById('fm-tree').addEventListener('click', (e) => {
    const link = e.target.closest('.tree-link');
    if (!link) {return;}
    e.stopPropagation();
    navigateTo(link.dataset.id);
  });

  // Breadcrumb clicks
  document.getElementById('fm-breadcrumb').addEventListener('click', (e) => {
    const link = e.target.closest('.bc-link');
    if (!link) {return;}
    e.stopPropagation();
    navigateTo(link.dataset.id);
  });

  // File grid: navigate folders, star toggles, menu, double-click to open
  document.getElementById('fm-grid').addEventListener('click', (e) => {
    const star = e.target.closest('[data-star]');
    if (star) {
      e.stopPropagation();
      const id = parseInt(star.dataset.star, 10);
      const f = FILES.find((x) => x.id === id);
      if (f) { f.starred = !f.starred; renderFiles(); }
      return;
    }
    const menu = e.target.closest('[data-menu]');
    if (menu) {
      e.stopPropagation();
      e.preventDefault();
      const id = parseInt(menu.dataset.menu, 10);
      const f = FILES.find((x) => x.id === id);
      if (!f) {return;}
      const items = f.type === 'folder' ? [
        { label: 'Open',     action: () => navigateTo(getNode(f.name.toLowerCase())?.id || currentId) },
        { label: 'Rename',   action: () => renameFile(id) },
        '-',
        { label: 'Delete',   action: () => deleteFile(id) }
      ] : [
        { label: 'Download', action: () => showToast(`Downloading: ${f.name}`) },
        { label: 'Share',    action: () => showToast(`Share link copied: ${f.name}`, { variant: 'success' }) },
        { label: 'Rename',   action: () => renameFile(id) },
        { label: f.starred ? 'Unstar' : 'Star', action: () => { f.starred = !f.starred; renderFiles(); } },
        '-',
        { label: 'Delete',   action: () => deleteFile(id) }
      ];
      openMenu(menu, items);
      return;
    }
    const item = e.target.closest('.fm-item');
    if (!item) {return;}
    if (item.dataset.type === 'folder') {
      // Look up folder node by name in current children
      const f = FILES.find((x) => x.id === parseInt(item.dataset.id, 10));
      if (!f) {return;}
      // Find tree node matching this folder name + parent
      const node = TREE.find((n) => n.parent === f.parent && n.name === f.name)
                || TREE.find((n) => n.name === f.name);
      if (node) {navigateTo(node.id);}
    } else {
      const f = FILES.find((x) => x.id === parseInt(item.dataset.id, 10));
      if (f) {showToast(`Preview: ${f.name}`);}
    }
  });

  // Toolbar
  document.getElementById('view-grid')?.addEventListener('click', () => {
    viewMode = 'grid';
    document.getElementById('view-grid').classList.add('active');
    document.getElementById('view-list').classList.remove('active');
    renderFiles();
  });
  document.getElementById('view-list')?.addEventListener('click', () => {
    viewMode = 'list';
    document.getElementById('view-list').classList.add('active');
    document.getElementById('view-grid').classList.remove('active');
    renderFiles();
  });
  document.getElementById('upload-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    uploadDialog();
  });
  document.getElementById('new-folder-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showModal({
      title: 'New folder',
      body: '<form class="modal-form" novalidate><div class="modal-form-row"><label for="nf-name">Folder name</label><input type="text" id="nf-name" name="name" placeholder="My folder" required autofocus></div></form>',
      actions: [
        { label: 'Cancel', variant: 'outline' },
        { label: 'Create', variant: 'primary', action: ({ body }) => {
          const name = body.querySelector('input').value.trim();
          if (!name) { showToast('Folder name is required', { variant: 'warning' }); return false; }
          FILES.push({ id: nextId++, parent: currentId, type: 'folder', name, modified: 'just now', size: '—', starred: false });
          renderFiles();
          showToast(`Folder created: ${name}`, { variant: 'success' });
          return true;
        } }
      ]
    });
  });
}
