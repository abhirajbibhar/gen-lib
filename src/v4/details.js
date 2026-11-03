// Detail modals for project cards and contact cards. Imported by inline
// scripts in production/projects.html and production/contacts.html so each
// page stays self-contained while the modal markup lives here.

import { showModal } from './modal.js';
import { showToast } from './toast.js';

const MEMBER_NAMES = {
  SK: { name: 'Sarah Kowalski', role: 'Curator',   color: 'azure' },
  MR: { name: 'Michael Reyes',  role: 'Reader',    color: 'purple' },
  EW: { name: 'Emily Wang',     role: 'Reader',    color: 'yellow' },
  MK: { name: 'Mark Kim',       role: 'Reader',    color: 'red' },
  LP: { name: 'Lina Park',      role: 'Curator',   color: 'green' },
  DR: { name: 'Diego Reyes',    role: 'Reader',    color: 'blue' },
  YT: { name: 'Yuki Tanaka',    role: 'Reader',    color: 'primary' },
  TH: { name: 'Tom Hardy',      role: 'Reader',    color: 'purple' },
  A:  { name: 'Maya Chen',      role: 'Librarian', color: 'primary' }
};

const COLOR_VAR = {
  primary: 'var(--primary)',
  azure:   'var(--azure)',
  purple:  'var(--purple)',
  yellow:  'var(--yellow)',
  red:     'var(--red)',
  green:   'var(--green)',
  blue:    'var(--blue)'
};

const STATUS_CLS = { green: 'status-green', yellow: 'status-yellow', red: 'status-red' };

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function emailFor(name) {
  return name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
}

const SAMPLE_TASKS = [
  { title: 'Wireframes review',         done: true },
  { title: 'Stakeholder kickoff',       done: true },
  { title: 'Design system tokens',      done: true },
  { title: 'Component library',         done: false },
  { title: 'QA + accessibility audit',  done: false }
];

const SAMPLE_ACTIVITY = [
  { who: 'Sarah K.',    what: 'added a note to the collection', time: '12 min ago' },
  { who: 'Michael R.',  what: 'finished a book on the shelf',                  time: '1 hour ago' },
  { who: 'Emily W.',    what: 'updated the collection',            time: '4 hours ago' }
];

export function openProjectModal({ title, client, status, sCls, desc, pct, due, members }) {
  const memberRows = members.map((m) => {
    const info = MEMBER_NAMES[m] || { name: m, role: 'Team member', color: 'primary' };
    return `
      <div class="detail-member">
        <span class="av" style="background:${COLOR_VAR[info.color] || 'var(--primary)'}">${m}</span>
        <span class="meta">
          <span class="name">${escapeHtml(info.name)}</span>
          <span class="role">${escapeHtml(info.role)}</span>
        </span>
      </div>
    `;
  }).join('');

  const tasksHtml = SAMPLE_TASKS.map((t) => `
    <div class="detail-task${t.done ? ' done' : ''}">
      <span class="checkbox" aria-hidden="true">${t.done ? '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 6l2.5 3 5-6"/></svg>' : ''}</span>
      <span class="task-title">${escapeHtml(t.title)}</span>
    </div>
  `).join('');

  const activityHtml = SAMPLE_ACTIVITY.map((a) => `
    <div class="detail-activity-item">
      <div class="dot"></div>
      <div><strong>${escapeHtml(a.who)}</strong> ${escapeHtml(a.what)} <span class="time">· ${escapeHtml(a.time)}</span></div>
    </div>
  `).join('');

  const progressColor = sCls === 'red' ? 'var(--red)' : sCls === 'yellow' ? 'var(--yellow)' : 'var(--primary)';

  const body = `
    <div class="detail-project">
      <div class="detail-header">
        <div class="head-left">
          <div class="client-tag">${escapeHtml(client)}</div>
          <p class="desc">${escapeHtml(desc)}</p>
        </div>
        <span class="status ${STATUS_CLS[sCls] || 'status-green'}">${escapeHtml(status)}</span>
      </div>

      <div class="detail-stats">
        <div class="stat-block">
          <div class="label">Progress</div>
          <div class="value">${pct}%</div>
          <div class="progress-thin"><div class="bar" style="width:${pct}%;background:${progressColor}"></div></div>
        </div>
        <div class="stat-block">
          <div class="label">Last updated</div>
          <div class="value">${escapeHtml(due)}</div>
        </div>
        <div class="stat-block">
          <div class="label">Contributors</div>
          <div class="value">${members.length}</div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Members</div>
        <div class="detail-members">${memberRows}</div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Tasks · ${SAMPLE_TASKS.filter((t) => t.done).length}/${SAMPLE_TASKS.length}</div>
        <div class="detail-tasks">${tasksHtml}</div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Recent activity</div>
        <div class="detail-activity">${activityHtml}</div>
      </div>
    </div>
  `;

  showModal({
    title,
    body,
    size: 'lg',
    actions: [
      { label: 'Close', variant: 'outline' },
      { label: 'Open collection', variant: 'primary', action: () => showToast(`Opening: ${title}`) }
    ]
  });
}

export function openContactModal({ name, ini, color, role, read, loans, holds }) {
  const email = emailFor(name);
  const phone = '+1 (555) ' + (300 + (ini.charCodeAt(0) % 600)).toString().padStart(3, '0') + '-' + (1000 + (ini.charCodeAt(ini.length - 1) % 9000)).toString();
  const colorVar = COLOR_VAR[color] || 'var(--primary)';

  const body = `
    <div class="detail-contact">
      <div class="detail-contact-head">
        <div class="big-av" style="background:${colorVar}">${escapeHtml(ini)}</div>
        <div>
          <div class="name">${escapeHtml(name)}</div>
          <div class="role">${escapeHtml(role)}</div>
        </div>
      </div>

      <div class="detail-contact-fields">
        <div><span class="label">Email</span><a class="value" href="mailto:${email}">${email}</a></div>
        <div><span class="label">Phone</span><span class="value">${phone}</span></div>
        <div><span class="label">Joined</span><span class="value">Mar 2024</span></div>
        <div><span class="label">Tier</span><span class="value">${escapeHtml(role)}</span></div>
      </div>

      <div class="detail-contact-stats">
        <div><strong>${read}</strong><span>Books read</span></div>
        <div><strong>${loans}</strong><span>Reading</span></div>
        <div><strong>${holds}</strong><span>Wishlist</span></div>
      </div>
    </div>
  `;

  showModal({
    title: name,
    body,
    actions: [
      { label: 'Close',   variant: 'outline' },
      { label: 'Message', variant: 'outline', action: () => showToast(`Compose to: ${name}`) },
      { label: 'View profile', variant: 'primary', action: () => { window.location.href = 'profile.html'; } }
    ]
  });
}
