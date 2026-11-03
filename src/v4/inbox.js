// Inbox — fully interactive mail client for the template demo.
// Self-contained: data, state, and UI all live here. The host page only
// provides an empty <div id="inbox-root"> for us to mount into.
//
// Features:
// - Folders: Inbox / Sent / Drafts / Starred / Trash + four labels
// - Click a message to open it in the reading pane
// - Per-folder counts that update on read/star/move/delete
// - Compose modal (To / Subject / Body) → sends to Sent or saves to Drafts
// - Reply / Forward open compose prefilled
// - Star toggle, archive (move to Inbox→Trash), restore from Trash, delete forever
// - Search across the active folder (subject + body + sender)
// - Keyboard: J/K to navigate, Enter to open, R to reply, # to delete

import { showToast } from './toast.js';
import { showModal } from './modal.js';
import { useApiMode, httpAdapter } from './data-adapter.js';

// ────────────────────────
//  SEED DATA
// ────────────────────────

let nextId = 1;
const id = () => `msg-${nextId++}`;

/** @type {Array<Message>} */
const seed = [
  // ── Inbox
  m({ folder: 'inbox', unread: true,  starred: true,  label: 'library', from: 'Rajgruha Sync', fromEmail: 'sync@rajgruha.app', subject: 'Kobo Libra is up to date', preview: 'Three books synced — last position in Piranesi.', body: `Piranesi, The Left Hand of Darkness and Braiding Sweetgrass were synced to your Kobo Libra.

Last position: Piranesi · page 88 of 245.

Everything is in sync — no action needed.`, time: '9:42 AM' }),
  m({ folder: 'inbox', unread: true,  starred: false, label: 'library', from: 'Import', fromEmail: 'imports@rajgruha.app', subject: '24 EPUBs indexed', preview: 'Two files need metadata review before they appear in the catalog.', body: `24 EPUB files finished indexing.

22 matched cleanly against Open Library.
2 need review: missing author and series fields.

Review them in Catalog → Import queue.`, time: '8:14 AM' }),
  m({ folder: 'inbox', unread: true,  starred: false, label: 'library', from: 'Catalog', fromEmail: 'catalog@rajgruha.app', subject: '5 titles are missing covers', preview: 'The sci-fi shelf has five books without cover art.', body: `Five titles on the Sci-fi shelf have no cover image:

· The Seventh Perfection
· A Memory Called Empire
· The Vanished Birds
· Piranesi (Japanese edition)
· This Is How You Lose the Time War

Upload covers or let the catalog fetch them automatically.`, time: '7:30 AM' }),
  m({ folder: 'inbox', unread: false, starred: false, label: 'personal', from: 'Michael R.', fromEmail: 'mike@somewhere.io', subject: 'Book club pick for November?', preview: 'I vote for The Ministry for the Future — anyone read it?', body: `I vote for The Ministry for the Future for November.

Anyone read it yet? I have it queued but keep putting it off.

— Mike`, time: 'Yesterday' }),
  m({ folder: 'inbox', unread: false, starred: true,  label: 'library', from: 'Emily W.', fromEmail: 'emily@readers.club', subject: 'My Piranesi highlights', preview: '14 highlights, mostly about the statues.', body: `Sharing my 14 highlights from Piranesi — most of them are about the statues and the tides.

Favourite one: "The Beauty of the House is immeasurable; its Kindness infinite."

Tell me which ones you'd keep.`, time: 'Yesterday' }),
  m({ folder: 'inbox', unread: false, starred: false, label: 'library', from: 'Open Library', fromEmail: 'metadata@openlibrary.org', subject: 'Metadata matched for 216 titles', preview: 'Covers, series and publication dates were updated.', body: `216 titles were matched this week:

· 208 covers updated
· 41 series gaps filled
· 5 titles left unmatched

Open Catalog → Metadata to review the leftovers.`, time: 'Tue' }),
  m({ folder: 'inbox', unread: false, starred: false, label: null,       from: 'Storage', fromEmail: 'ops@rajgruha.app', subject: 'Nightly backup complete', preview: '2.4 GB of EPUBs and PDFs archived.', body: `Backup finished at 02:14.

· 2.4 GB archived
· 4,286 books, 771 audiobooks
· Verified: 100%

Next backup: tonight at 02:00.`, time: 'Tue' }),
  m({ folder: 'inbox', unread: false, starred: false, label: 'library', from: 'Collections', fromEmail: 'collections@rajgruha.app', subject: 'The Seventh Perfection suggested', preview: 'Emily Wang suggested a title for the Sci-fi shelf.', body: `Emily Wang suggested The Seventh Perfection for the Sci-fi shelf.

Daniel Polansky · 2020 · 208 pages

Approve it to add the EPUB to the shelf.`, time: 'Mon' }),
  m({ folder: 'inbox', unread: false, starred: false, label: null,       from: 'Diego R.', fromEmail: 'diego@readers.club', subject: 'Shared shelf — 14 new books', preview: 'All EPUB, covers already matched.', body: `Added 14 books to the shared shelf.

All EPUB 3 with covers and metadata already matched — nothing for you to fix.

Highlights: two Le Guin, three Becky Chambers, the rest sci-fi short fiction.`, time: 'Apr 23' }),
  m({ folder: 'inbox', unread: false, starred: false, label: 'library', from: 'Calibre', fromEmail: 'library@calibre.local', subject: 'Library export ready', preview: 'catalog-2026.epub collection is ready to import.', body: `Your Calibre export finished.

File: catalog-2026.epub
Books: 612
Size: 1.8 GB

Import it from Book files → Upload.`, time: 'Apr 22' }),
  m({ folder: 'inbox', unread: false, starred: false, label: 'acquisitions', from: 'Bookshop', fromEmail: 'orders@bookshop.org', subject: 'Your order is on the way', preview: 'Piranesi and Circe — arriving Thursday.', body: `Order #BS-40218 shipped.

· Piranesi — Susanna Clarke
· Circe — Madeline Miller

Estimated delivery: Thursday.`, time: 'Apr 20' }),
  m({ folder: 'inbox', unread: false, starred: false, label: 'urgent',   from: 'Security', fromEmail: 'security@rajgruha.app', subject: 'New device signed in', preview: 'An iPad Air signed in to your library yesterday.', body: `A new device signed in to your library:

· Device: iPad Air
· Location: Bengaluru, IN
· Time: Apr 19, 21:12

If this was you, no action is needed. Otherwise revoke the session in Settings → Sessions.`, time: 'Apr 19' }),

  // ── Sent
  m({ folder: 'sent', unread: false, starred: false, label: 'personal', from: 'Me',  to: 'mike@somewhere.io',  subject: 'Re: Book club pick for November?', preview: 'Piranesi if you want something short.', body: `Piranesi if you want something short — it is 245 pages and reads in a weekend.

Otherwise The Ministry for the Future, but give it a month.`, time: 'Yesterday' }),
  m({ folder: 'sent', unread: false, starred: false, label: 'library',  from: 'Me',  to: 'mark@readers.club', subject: 'Re: Import my Calibre library', preview: 'Drop the export in Book files and I will index it tonight.', body: `Drop the export into Book files → Upload and I will run the indexer tonight.

600 books should take about 20 minutes.`, time: 'Mon' }),
  m({ folder: 'sent', unread: false, starred: false, label: 'personal', from: 'Me',  to: 'emily@readers.club', subject: 'Re: My Piranesi highlights', preview: 'Keep the one about the tides.', body: `Keep the one about the tides — it is the whole book in one line.`, time: 'Yesterday' }),

  // ── Drafts
  m({ folder: 'drafts', unread: false, starred: false, label: null,     from: 'Me', to: 'emily@readers.club', subject: 'Re: My Piranesi highlights',  preview: 'Two more highlights you might like —', body: 'Two more highlights you might like — the ones from chapter 34 and the final page.', time: 'Today' }),
  m({ folder: 'drafts', unread: false, starred: false, label: null,     from: 'Me', to: '',                    subject: '',                          preview: '', body: '', time: 'Today' }),
  m({ folder: 'drafts', unread: false, starred: false, label: null,     from: 'Me', to: 'diego@readers.club', subject: 'Re: Shared shelf — 14 new books', preview: '', body: '', time: 'Apr 23' }),

  // ── Trash
  m({ folder: 'trash', trashed: true, unread: false, starred: false, label: 'acquisitions', from: 'BookBub', fromEmail: 'deals@bookbub.com', subject: '99¢ eBook deals — today only', preview: "Don't miss out…", body: 'Today only — 99¢ deals on bestselling eBooks.\n\nUnsubscribe', time: 'Apr 18' })
];

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {'inbox' | 'sent' | 'drafts' | 'trash'} folder
 * @property {boolean} trashed
 * @property {boolean} unread
 * @property {boolean} starred
 * @property {string|null} label
 * @property {string} from
 * @property {string} [fromEmail]
 * @property {string} [to]
 * @property {string} subject
 * @property {string} preview
 * @property {string} body
 * @property {string} time
 */

function m(p) {
  return {
    id: id(),
    folder: p.folder,
    trashed: !!p.trashed,
    unread: !!p.unread,
    starred: !!p.starred,
    label: p.label || null,
    from: p.from,
    fromEmail: p.fromEmail || '',
    to: p.to || '',
    subject: p.subject || '(no subject)',
    preview: p.preview || '',
    body: p.body || '',
    time: p.time
  };
}

// ────────────────────────
//  STATE
// ────────────────────────

const state = {
  /** @type {Array<Message>} */
  messages: seed.slice(),
  /** @type {'inbox' | 'sent' | 'drafts' | 'starred' | 'trash' | string} */
  view: 'inbox',
  /** Active label filter (when view === 'label:<key>') */
  selectedId: null,
  query: ''
};

// ────────────────────────
//  FOLDERS
// ────────────────────────

const FOLDERS = [
  { key: 'inbox',   label: 'Inbox',   icon: '<path d="M2 6l6 4 6-4"/><rect x="2" y="4" width="12" height="9" rx="1.5"/>' },
  { key: 'sent',    label: 'Sent',    icon: '<path d="M2 14L14 2M14 2H6M14 2v8"/>' },
  { key: 'drafts',  label: 'Drafts',  icon: '<path d="M3 3h10v10H3zM6 7l2 2 2-2"/>' },
  { key: 'starred', label: 'Starred', icon: '<path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z"/>' },
  { key: 'trash',   label: 'Trash',   icon: '<path d="M3 5h10l-1 9H4z"/><path d="M5 5V3h6v2"/>' }
];

const LABELS = [
  { key: 'library',      label: 'Library',      color: 'var(--primary)' },
  { key: 'personal',   label: 'Personal',   color: 'var(--blue)' },
  { key: 'acquisitions', label: 'Acquisitions', color: 'var(--yellow)' },
  { key: 'urgent',     label: 'Urgent',     color: 'var(--red)' }
];

function viewFilter(msg) {
  if (state.view === 'inbox')   {return msg.folder === 'inbox' && !msg.trashed;}
  if (state.view === 'sent')    {return msg.folder === 'sent' && !msg.trashed;}
  if (state.view === 'drafts')  {return msg.folder === 'drafts' && !msg.trashed;}
  if (state.view === 'starred') {return msg.starred && !msg.trashed;}
  if (state.view === 'trash')   {return msg.trashed;}
  if (state.view.startsWith('label:')) {
    const lbl = state.view.slice(6);
    return msg.label === lbl && !msg.trashed;
  }
  return false;
}

function searchFilter(msg) {
  if (!state.query) {return true;}
  const q = state.query.toLowerCase();
  return msg.subject.toLowerCase().includes(q)
    || msg.body.toLowerCase().includes(q)
    || msg.from.toLowerCase().includes(q)
    || (msg.to || '').toLowerCase().includes(q);
}

function visibleMessages() {
  return state.messages.filter(viewFilter).filter(searchFilter);
}

function unreadCountInFolder(folder) {
  return state.messages.filter((m) => {
    if (folder === 'inbox')   {return m.folder === 'inbox' && !m.trashed && m.unread;}
    if (folder === 'starred') {return m.starred && !m.trashed && m.unread;}
    return false;
  }).length;
}

function totalCountInFolder(folder) {
  return state.messages.filter((m) => {
    if (folder === 'inbox')   {return m.folder === 'inbox' && !m.trashed;}
    if (folder === 'sent')    {return m.folder === 'sent' && !m.trashed;}
    if (folder === 'drafts')  {return m.folder === 'drafts' && !m.trashed;}
    if (folder === 'starred') {return m.starred && !m.trashed;}
    if (folder === 'trash')   {return m.trashed;}
    if (folder.startsWith('label:')) {return m.label === folder.slice(6) && !m.trashed;}
    return false;
  }).length;
}

// ────────────────────────
//  RENDER
// ────────────────────────

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderShell(root) {
  root.innerHTML = `
    <div class="inbox-layout">
      <aside class="inbox-sidebar" id="inbox-sidebar"></aside>
      <div class="inbox-list-pane">
        <div class="inbox-list-toolbar">
          <input type="text" class="inbox-search" placeholder="Search this folder…" aria-label="Search messages">
          <button type="button" class="btn btn-outline btn-sm" id="inbox-mark-read">Mark all read</button>
        </div>
        <div class="inbox-list" id="inbox-list" role="listbox" aria-label="Messages"></div>
      </div>
      <div class="inbox-reader" id="inbox-reader"></div>
    </div>
  `;
}

function renderSidebar() {
  const el = document.getElementById('inbox-sidebar');
  if (!el) {return;}
  const folder = (key) => {
    const f = FOLDERS.find((x) => x.key === key);
    const count = key === 'inbox' || key === 'starred' ? unreadCountInFolder(key) : totalCountInFolder(key);
    const showCount = count > 0 || key === 'inbox';
    return `
      <a class="inbox-folder${state.view === key ? ' active' : ''}" href="#" data-view="${key}">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">${f.icon}</svg>
        ${f.label}
        ${showCount ? `<span class="count">${count}</span>` : ''}
      </a>
    `;
  };
  el.innerHTML = `
    ${FOLDERS.map((f) => folder(f.key)).join('')}
    <div class="inbox-sidebar-label">Labels</div>
    ${LABELS.map((l) => {
    const c = totalCountInFolder(`label:${l.key}`);
    return `
        <a class="inbox-folder${state.view === `label:${l.key}` ? ' active' : ''}" href="#" data-view="label:${l.key}">
          <span class="inbox-label-dot" style="background:${l.color}"></span>
          ${l.label}
          ${c > 0 ? `<span class="count">${c}</span>` : ''}
        </a>
      `;
  }).join('')}
  `;
}

function renderList() {
  const el = document.getElementById('inbox-list');
  if (!el) {return;}
  const items = visibleMessages();
  if (!items.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 8l9 6 9-6"/></svg>
        </div>
        <div class="empty-state-title">${state.query ? 'No matches' : 'Nothing here'}</div>
        <div class="empty-state-text">${state.query ? 'Try a different search term.' : 'New messages will appear here.'}</div>
      </div>
    `;
    return;
  }
  el.innerHTML = items.map((msg) => `
    <div class="inbox-item${msg.unread ? ' unread' : ''}${msg.id === state.selectedId ? ' selected' : ''}" data-id="${msg.id}" role="option" aria-selected="${msg.id === state.selectedId}" tabindex="0">
      <button type="button" class="inbox-star-btn" data-star="${msg.id}" aria-label="${msg.starred ? 'Unstar' : 'Star'}" aria-pressed="${msg.starred}">
        <svg class="star ${msg.starred ? 'on' : ''}" viewBox="0 0 16 16" fill="${msg.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z"/></svg>
      </button>
      <div class="inbox-item-body">
        <div class="sender">${escapeHtml(msg.folder === 'sent' || msg.folder === 'drafts' ? `To: ${msg.to || '(no recipient)'}` : msg.from)}</div>
        <div class="subject">${escapeHtml(msg.subject)}${msg.label ? `<span class="inbox-label-pill" data-label="${msg.label}">${escapeHtml(msg.label)}</span>` : ''}</div>
        <div class="preview">${escapeHtml(msg.preview || msg.body.split('\n')[0] || '')}</div>
      </div>
      <div class="meta">${escapeHtml(msg.time)}</div>
    </div>
  `).join('');
}

function renderReader() {
  const el = document.getElementById('inbox-reader');
  if (!el) {return;}
  const msg = state.messages.find((x) => x.id === state.selectedId);
  if (!msg) {
    el.innerHTML = `
      <div class="empty-state inbox-reader-empty">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 8l9 6 9-6"/></svg>
        </div>
        <div class="empty-state-title">Select a message</div>
        <div class="empty-state-text">Click a message in the list to read it here.</div>
      </div>
    `;
    return;
  }

  const isDraft = msg.folder === 'drafts';
  const isTrash = msg.trashed;

  el.innerHTML = `
    <div class="inbox-reader-toolbar">
      <button type="button" class="btn btn-outline btn-sm" data-action="back" aria-label="Back to list">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 3L4 8l6 5"/></svg>
      </button>
      ${isDraft ? `
        <button type="button" class="btn btn-primary btn-sm" data-action="edit-draft">Edit draft</button>
      ` : `
        <button type="button" class="btn btn-outline btn-sm" data-action="reply">Reply</button>
        <button type="button" class="btn btn-outline btn-sm" data-action="forward">Forward</button>
      `}
      <div class="inbox-reader-spacer"></div>
      <button type="button" class="btn btn-ghost btn-sm" data-action="star" aria-pressed="${msg.starred}">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="${msg.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><path d="M8 1l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z"/></svg>
        ${msg.starred ? 'Starred' : 'Star'}
      </button>
      ${isTrash ? `
        <button type="button" class="btn btn-ghost btn-sm" data-action="restore">Restore</button>
        <button type="button" class="btn btn-danger btn-sm" data-action="delete-forever">Delete forever</button>
      ` : `
        <button type="button" class="btn btn-ghost btn-sm" data-action="trash" aria-label="Move to trash">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 5h10l-1 9H4z"/><path d="M5 5V3h6v2"/></svg>
        </button>
      `}
    </div>
    <div class="inbox-reader-content">
      <h2 class="inbox-reader-subject">${escapeHtml(msg.subject)}</h2>
      <div class="inbox-reader-meta">
        <div class="inbox-reader-avatar" style="background:${avatarColor(msg.from)}">${initials(msg.from)}</div>
        <div class="inbox-reader-meta-text">
          <div><strong>${escapeHtml(msg.from)}</strong>${msg.fromEmail ? ` <span class="inbox-reader-email">&lt;${escapeHtml(msg.fromEmail)}&gt;</span>` : ''}</div>
          <div class="inbox-reader-to">${msg.to ? `to ${escapeHtml(msg.to)}` : ''}</div>
        </div>
        <div class="inbox-reader-time">${escapeHtml(msg.time)}</div>
      </div>
      ${msg.label ? `<div class="inbox-label-pill inbox-label-pill-lg" data-label="${msg.label}">${escapeHtml(msg.label)}</div>` : ''}
      <div class="inbox-reader-body">${escapeHtml(msg.body || '(empty draft)').replace(/\n/g, '<br>')}</div>
    </div>
  `;
}

function avatarColor(name) {
  const palette = ['var(--primary)', 'var(--blue)', 'var(--purple)', 'var(--yellow)', 'var(--green)', 'var(--cyan)', 'var(--pink)', 'var(--orange)'];
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {h = (h * 31 + name.charCodeAt(i)) >>> 0;}
  return palette[h % palette.length];
}

function initials(name) {
  if (!name) {return '?';}
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase();
}

function renderAll() {
  renderSidebar();
  renderList();
  renderReader();
  updateBackLayout();
}

function updateBackLayout() {
  // On mobile, when a message is selected we slide the reader over the list.
  const root = document.getElementById('inbox-root');
  if (!root) {return;}
  root.classList.toggle('reader-open', !!state.selectedId);
}

// ────────────────────────
//  ACTIONS
// ────────────────────────

function setView(view) {
  state.view = view;
  state.selectedId = null;
  state.query = '';
  const search = document.querySelector('.inbox-search');
  if (search) {search.value = '';}
  renderAll();
}

function selectMessage(id) {
  const msg = state.messages.find((x) => x.id === id);
  if (!msg) {return;}
  if (msg.unread) {
    msg.unread = false;
  }
  state.selectedId = id;
  renderSidebar();
  renderList();
  renderReader();
  updateBackLayout();
  syncTopbarUnread();
}

function toggleStar(id) {
  const msg = state.messages.find((x) => x.id === id);
  if (!msg) {return;}
  msg.starred = !msg.starred;
  renderSidebar();
  renderList();
  if (state.selectedId === id) {renderReader();}
}

function trashMessage(id) {
  const msg = state.messages.find((x) => x.id === id);
  if (!msg) {return;}
  msg.trashed = true;
  if (state.selectedId === id) {state.selectedId = null;}
  renderAll();
  showToast('Moved to Trash', { variant: 'success' });
}

function restoreMessage(id) {
  const msg = state.messages.find((x) => x.id === id);
  if (!msg) {return;}
  msg.trashed = false;
  renderAll();
  showToast('Restored', { variant: 'success' });
}

function deleteForever(id) {
  const idx = state.messages.findIndex((x) => x.id === id);
  if (idx < 0) {return;}
  state.messages.splice(idx, 1);
  if (state.selectedId === id) {state.selectedId = null;}
  renderAll();
  showToast('Deleted forever', { variant: 'success' });
}

function markAllRead() {
  let n = 0;
  state.messages.forEach((m) => {
    if (viewFilter(m) && m.unread) { m.unread = false; n += 1; }
  });
  renderSidebar();
  renderList();
  syncTopbarUnread();
  showToast(`Marked ${n} as read`);
}

function syncTopbarUnread() {
  const inboxUnread = unreadCountInFolder('inbox');
  document.querySelectorAll('[data-inbox-count]').forEach((el) => { el.textContent = inboxUnread; });
}

// ────────────────────────
//  COMPOSE
// ────────────────────────

/**
 * @param {Partial<Message>} [prefill]
 * @param {Message} [editingDraft] If set, sending replaces this draft.
 */
function openCompose(prefill = {}, editingDraft = null) {
  const body = document.createElement('div');
  body.className = 'compose-form';
  body.innerHTML = `
    <div class="form-group">
      <label class="form-label" for="compose-to">To</label>
      <input type="email" id="compose-to" class="form-control" placeholder="recipient@example.com" value="${escapeHtml(prefill.to || '')}" autocomplete="off">
    </div>
    <div class="form-group">
      <label class="form-label" for="compose-subject">Subject</label>
      <input type="text" id="compose-subject" class="form-control" placeholder="Subject" value="${escapeHtml(prefill.subject || '')}" autocomplete="off">
    </div>
    <div class="form-group">
      <label class="form-label" for="compose-body">Message</label>
      <textarea id="compose-body" class="form-control" rows="8" placeholder="Write your message…">${escapeHtml(prefill.body || '')}</textarea>
    </div>
  `;

  const collect = () => ({
    to: body.querySelector('#compose-to').value.trim(),
    subject: body.querySelector('#compose-subject').value.trim(),
    body: body.querySelector('#compose-body').value
  });

  showModal({
    title: editingDraft ? 'Edit draft' : 'New message',
    body,
    size: 'lg',
    actions: [
      {
        label: 'Discard',
        variant: 'ghost',
        action: () => {
          if (editingDraft) {
            // Discarding an existing draft removes it.
            const idx = state.messages.findIndex((m) => m.id === editingDraft.id);
            if (idx >= 0) {state.messages.splice(idx, 1);}
            if (state.selectedId === editingDraft.id) {state.selectedId = null;}
            renderAll();
          }
          showToast('Discarded');
        }
      },
      {
        label: 'Save draft',
        variant: 'outline',
        action: () => {
          const data = collect();
          if (!data.to && !data.subject && !data.body) {
            showToast('Empty draft discarded');
            return;
          }
          if (editingDraft) {
            Object.assign(editingDraft, {
              to: data.to,
              subject: data.subject || '(no subject)',
              body: data.body,
              preview: data.body.split('\n')[0].slice(0, 140),
              time: 'Just now'
            });
          } else {
            state.messages.unshift(m({
              folder: 'drafts',
              from: 'Me',
              to: data.to,
              subject: data.subject || '(no subject)',
              preview: data.body.split('\n')[0].slice(0, 140),
              body: data.body,
              time: 'Just now'
            }));
          }
          renderAll();
          showToast('Draft saved', { variant: 'success' });
        }
      },
      {
        label: 'Send',
        variant: 'primary',
        action: () => {
          const data = collect();
          if (!data.to) {
            showToast('Add a recipient', { variant: 'error' });
            return false;
          }
          if (editingDraft) {
            // Convert draft to sent
            const idx = state.messages.findIndex((m) => m.id === editingDraft.id);
            if (idx >= 0) {state.messages.splice(idx, 1);}
            if (state.selectedId === editingDraft.id) {state.selectedId = null;}
          }
          state.messages.unshift(m({
            folder: 'sent',
            from: 'Me',
            to: data.to,
            subject: data.subject || '(no subject)',
            preview: data.body.split('\n')[0].slice(0, 140),
            body: data.body,
            time: 'Just now'
          }));
          renderAll();
          showToast('Message sent', { variant: 'success' });
        }
      }
    ]
  });

  setTimeout(() => body.querySelector('#compose-to')?.focus(), 50);
}

function reply(msg) {
  openCompose({
    to: msg.fromEmail || msg.from,
    subject: msg.subject.startsWith('Re: ') ? msg.subject : `Re: ${msg.subject}`,
    body: `\n\n--- On ${msg.time}, ${msg.from} wrote:\n${msg.body.split('\n').map((l) => `> ${l}`).join('\n')}`
  });
}

function forward(msg) {
  openCompose({
    to: '',
    subject: msg.subject.startsWith('Fwd: ') ? msg.subject : `Fwd: ${msg.subject}`,
    body: `\n\n--- Forwarded message ---\nFrom: ${msg.from}${msg.fromEmail ? ` <${msg.fromEmail}>` : ''}\nDate: ${msg.time}\nSubject: ${msg.subject}\n\n${msg.body}`
  });
}

// ────────────────────────
//  EVENT WIRING
// ────────────────────────

function bindEvents(root) {
  // Folder switching
  root.addEventListener('click', (e) => {
    const folder = e.target.closest('[data-view]');
    if (folder) {
      e.preventDefault();
      setView(folder.dataset.view);
    }
  });

  // Message click
  root.addEventListener('click', (e) => {
    const star = e.target.closest('[data-star]');
    if (star) {
      e.stopPropagation();
      toggleStar(star.dataset.star);
      return;
    }
    const item = e.target.closest('.inbox-item');
    if (item) {selectMessage(item.dataset.id);}
  });

  // Reader toolbar
  root.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (!action || !action.dataset.action) {return;}
    const msg = state.messages.find((x) => x.id === state.selectedId);
    switch (action.dataset.action) {
      case 'back':
        state.selectedId = null;
        renderList();
        renderReader();
        updateBackLayout();
        break;
      case 'reply':           if (msg) {reply(msg);} break;
      case 'forward':         if (msg) {forward(msg);} break;
      case 'edit-draft':      if (msg) {openCompose({ to: msg.to, subject: msg.subject === '(no subject)' ? '' : msg.subject, body: msg.body }, msg);} break;
      case 'star':            if (msg) {toggleStar(msg.id);} break;
      case 'trash':           if (msg) {trashMessage(msg.id);} break;
      case 'restore':         if (msg) {restoreMessage(msg.id);} break;
      case 'delete-forever':  if (msg) {deleteForever(msg.id);} break;
    }
  });

  // Search
  root.addEventListener('input', (e) => {
    if (!e.target.matches('.inbox-search')) {return;}
    state.query = e.target.value.trim();
    renderList();
  });

  // Mark all read button (inside list toolbar) and the page-header one
  root.addEventListener('click', (e) => {
    if (e.target.closest('#inbox-mark-read')) {markAllRead();}
  });
  document.querySelectorAll('.page-actions .btn').forEach((b) => {
    const label = b.textContent.trim().toLowerCase();
    if (label === 'mark all read') {
      b.addEventListener('click', (e) => { e.preventDefault(); markAllRead(); });
    } else if (label === 'compose') {
      b.addEventListener('click', (e) => { e.preventDefault(); openCompose(); });
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('inbox-root')) {return;}
    if (e.target.matches('input, textarea')) {return;}
    const list = visibleMessages();
    const idx = list.findIndex((m) => m.id === state.selectedId);
    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (list.length === 0) {return;}
      const next = list[Math.min(list.length - 1, idx + 1)] || list[0];
      selectMessage(next.id);
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.length === 0) {return;}
      const prev = list[Math.max(0, idx - 1)] || list[list.length - 1];
      selectMessage(prev.id);
    } else if (e.key === 'r' && state.selectedId) {
      const msg = state.messages.find((x) => x.id === state.selectedId);
      if (msg && msg.folder !== 'drafts') {e.preventDefault(); reply(msg);}
    } else if (e.key === '#' && state.selectedId) {
      e.preventDefault();
      trashMessage(state.selectedId);
    } else if (e.key === 's' && state.selectedId) {
      e.preventDefault();
      toggleStar(state.selectedId);
    } else if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      openCompose();
    }
  });
}

// ────────────────────────
//  PUBLIC API
// ────────────────────────

/**
 * Mount the interactive inbox into `#inbox-root`. Idempotent — if there's
 * already a list inside the root, we re-render in place.
 *
 * Add `?api=1` to the URL to pull initial messages from /api/messages
 * instead of using seed. Mutations (star, trash, send) still happen
 * client-side in the demo; extend `data-adapter.js` to PATCH/POST them
 * back to the server in your own app.
 */
export async function initInbox() {
  const root = document.getElementById('inbox-root');
  if (!root) {return;}
  renderShell(root);
  bindEvents(root);
  renderAll();
  syncTopbarUnread();

  if (useApiMode()) {await hydrateFromApi(root);}
}

async function hydrateFromApi(root) {
  // Show loading state in the list pane.
  const list = root.querySelector('#inbox-list');
  if (list) {
    list.innerHTML = `
      <div class="empty-state inbox-loading">
        <div class="empty-state-icon">
          <span class="spinner-dots" aria-hidden="true"><span></span><span></span><span></span></span>
        </div>
        <div class="empty-state-title">Loading messages…</div>
      </div>`;
  }
  const adapter = httpAdapter('/api/messages', { listKey: 'messages' });
  try {
    const apiMessages = await adapter.list({ folder: state.view });
    // Replace seed with the API payload, mapping field names to the shape
    // our internal state expects.
    state.messages = apiMessages.map((m) => ({
      id: `api-${m.id}`,
      folder: m.folder,
      trashed: m.folder === 'trash',
      unread: !!m.unread,
      starred: !!m.starred,
      label: m.label || null,
      from: m.fromName,
      fromEmail: m.fromEmail || '',
      to: m.toEmail || '',
      subject: m.subject,
      preview: m.preview || '',
      body: m.body || '',
      time: m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
    }));
    renderAll();
    syncTopbarUnread();
    showToast(`Loaded ${apiMessages.length} from API`, { variant: 'success' });
  } catch (err) {
    if (list) {
      list.innerHTML = `
        <div style="padding:16px">
          <div class="banner banner-danger">
            <svg class="banner-icon" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M5 5l6 6M11 5l-6 6"/></svg>
            <div class="banner-body"><strong>Couldn't load messages.</strong> ${err.message || err}</div>
            <div class="banner-actions">
              <button class="btn btn-outline btn-sm" id="inbox-retry">Retry</button>
              <button class="btn btn-ghost btn-sm" id="inbox-fallback">Use seed</button>
            </div>
          </div>
        </div>`;
      document.getElementById('inbox-retry')?.addEventListener('click', () => hydrateFromApi(root));
      document.getElementById('inbox-fallback')?.addEventListener('click', () => renderAll());
    }
  }
}
