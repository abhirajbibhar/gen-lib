// Reading calendar with Month / Week / Day views.
//
// - Month: 6×7 grid, one chip per event, strikethrough once done.
// - Week / Day: Google-Calendar-style time grid (7:00–22:00) with events
//   positioned by their start/end time, a "now" line, and click-to-create on
//   an empty slot.
// - Click an event → edit modal (title, date, start/end, colour, done).
// - Click a day number in month view → day agenda modal with quick done toggle.
// - Prev/next move by the active view's unit; Today returns to today.
//
// Events live in a Map keyed by ISO date; all state is local to the demo.

import { showToast } from './toast.js';
import { showModal, closeModal } from './modal.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Visible window of the time grid, in hours.
const START_HOUR = 7;
const END_HOUR = 22;
const ROWS = END_HOUR - START_HOUR;

const COLOR_OPTIONS = [
  { value: '', label: 'Teal', var: 'var(--primary)' },
  { value: 'blue', label: 'Blue', var: 'var(--blue)' },
  { value: 'yellow', label: 'Yellow', var: 'var(--yellow)' },
  { value: 'red', label: 'Red', var: 'var(--red)' },
  { value: 'purple', label: 'Purple', var: 'var(--purple)' }
];

const events = new Map();
let nextId = 1;

// ────────────────────────
//  Date helpers
// ────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function sameDay(a, b) { return dateKey(a) === dateKey(b); }
function minutes(hhmm) {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function formatTime(mins) {
  const h24 = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return m ? `${h12}:${pad(m)} ${suffix}` : `${h12} ${suffix}`;
}
function formatRange(start, end) {
  return `${formatTime(minutes(start))} – ${formatTime(minutes(end))}`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function colorOf(value) {
  return COLOR_OPTIONS.find((c) => c.value === value)?.var ?? 'var(--primary)';
}
function byStart(a, b) { return minutes(a.start) - minutes(b.start); }

// ────────────────────────
//  Seed data
// ────────────────────────

function seed() {
  if (events.size) { return; }
  const today = startOfDay(new Date());
  const at = (offset, title, start, end, color = '', done = false) => {
    const key = dateKey(addDays(today, offset));
    const list = events.get(key) || [];
    list.push({ id: nextId++, title, start, end, color, done });
    events.set(key, list);
  };

  at(0, 'Book club · Chapter 12', '18:00', '19:30');
  at(0, 'Evening reading', '21:00', '22:00', 'blue');
  at(-1, 'Finished Dune Messiah', '20:00', '21:00', 'yellow', true);
  at(-3, 'Goal check-in', '08:00', '09:00', 'red', true);
  at(-6, 'Audiobook night', '21:00', '22:00', 'purple');
  at(1, 'Library sync', '07:30', '08:30', 'blue');
  at(1, 'Read-along · Piranesi', '19:00', '20:00');
  at(2, 'Author talk: Susanna Clarke', '16:00', '17:30', 'purple');
  at(3, 'Write review', '20:30', '21:30', 'yellow');
  at(4, 'Weekend long read', '09:00', '11:00', 'red');
  at(5, 'Family reading hour', '17:00', '18:00', 'blue');
  at(6, 'Finish Braiding Sweetgrass', '20:00', '21:30', 'yellow', true);
  at(9, 'Book club · Chapter 13', '18:00', '19:30');
}

function eventsOn(key) {
  return (events.get(key) || []).slice().sort(byStart);
}

// ────────────────────────
//  Month view
// ────────────────────────

function renderMonth(state) {
  const { cursor, bodyEl, labelEl } = state;
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  labelEl.textContent = `${MONTHS[month]} ${year}`;

  const today = startOfDay(new Date());
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const html = DOWS.map((d) => `<div class="dow">${d}</div>`);

  for (let i = lead; i > 0; i--) {
    html.push(`<div class="calendar-day muted"><span class="day-num">${daysInPrev - i + 1}</span></div>`);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = dateKey(date);
    const isToday = sameDay(date, today);
    const chips = eventsOn(key).map((e) => `
      <span class="calendar-event${e.color ? ' ' + e.color : ''}${e.done ? ' done' : ''}"
            data-date="${key}" data-id="${e.id}"
            title="${escapeHtml(e.title)} · ${formatRange(e.start, e.end)}">
        ${escapeHtml(e.title)}
      </span>`).join('');
    html.push(`
      <div class="calendar-day${isToday ? ' today' : ''}" data-day="${key}">
        <span class="day-num">${d}</span>${chips}
      </div>`);
  }

  const trailing = 42 - lead - daysInMonth;
  for (let d = 1; d <= trailing; d++) {
    html.push(`<div class="calendar-day muted"><span class="day-num">${d}</span></div>`);
  }

  bodyEl.className = 'calendar-body';
  bodyEl.dataset.view = 'month';
  bodyEl.innerHTML = `<div class="calendar-grid">${html.join('')}</div>`;
}

// ────────────────────────
//  Week / day view
// ────────────────────────

function weekOf(date) {
  const start = addDays(startOfDay(date), -((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function nowLineTopPercent(now) {
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < START_HOUR * 60 || mins > END_HOUR * 60) { return null; }
  return ((mins - START_HOUR * 60) / (ROWS * 60)) * 100;
}

function renderTimeGrid(state) {
  const { cursor, bodyEl, labelEl, view } = state;
  const days = view === 'week' ? weekOf(cursor) : [startOfDay(cursor)];
  const cols = days.length;

  labelEl.textContent = view === 'week'
    ? `${MONTHS_SHORT[days[0].getMonth()]} ${days[0].getDate()} – ${MONTHS_SHORT[days[6].getMonth()]} ${days[6].getDate()}, ${days[6].getFullYear()}`
    : `${DOWS[(cursor.getDay() + 6) % 7]}, ${MONTHS[cursor.getMonth()]} ${cursor.getDate()}, ${cursor.getFullYear()}`;

  const today = startOfDay(new Date());
  const now = new Date();
  const nowTop = nowLineTopPercent(now);

  const heads = days.map((d) => {
    const isToday = sameDay(d, today);
    return `<div class="cal-head-cell${isToday ? ' today' : ''}" data-goto="${dateKey(d)}">
      <span class="dow">${DOWS[(d.getDay() + 6) % 7]}</span>
      <span class="dnum">${d.getDate()}</span>
    </div>`;
  }).join('');

  const gutter = Array.from({ length: ROWS }, (_, i) =>
    `<div class="cal-hour"><span>${formatTime((START_HOUR + i) * 60)}</span></div>`
  ).join('');

  const columns = days.map((d) => {
    const key = dateKey(d);
    const chips = eventsOn(key).map((e) => {
      const startMin = Math.max(minutes(e.start), START_HOUR * 60);
      const endMin = Math.min(minutes(e.end), END_HOUR * 60);
      const top = ((startMin - START_HOUR * 60) / (ROWS * 60)) * 100;
      const height = Math.max(3.2, ((endMin - startMin) / (ROWS * 60)) * 100);
      return `<div class="cal-slot-event${e.color ? ' ' + e.color : ''}${e.done ? ' done' : ''}"
        style="top:${top}%;height:${height}%"
        data-date="${key}" data-id="${e.id}"
        title="${escapeHtml(e.title)} · ${formatRange(e.start, e.end)}">
        <span class="n">${escapeHtml(e.title)}</span>
        <span class="t">${formatTime(startMin)}</span>
      </div>`;
    }).join('');
    const nowLine = sameDay(d, today) && nowTop !== null
      ? `<div class="cal-now-line" style="top:${nowTop}%"></div>`
      : '';
    return `<div class="cal-col" data-date="${key}">${nowLine}${chips}</div>`;
  }).join('');

  bodyEl.className = 'calendar-body';
  bodyEl.dataset.view = view;
  bodyEl.innerHTML = `
    <div class="cal-timegrid" style="--cal-cols:${cols}">
      <div class="cal-timegrid-head">
        <div class="cal-head-cell corner" aria-hidden="true"></div>
        ${heads}
      </div>
      <div class="cal-timegrid-body" style="--cal-rows:${ROWS}">
        <div class="cal-gutter">${gutter}</div>
        ${columns}
      </div>
    </div>`;
}

function render(state) {
  if (state.view === 'month') { renderMonth(state); }
  else { renderTimeGrid(state); }

  state.tabs.forEach((t) => {
    const on = t.dataset.view === state.view;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

// ────────────────────────
//  Modal forms
// ────────────────────────

function colorRadios(name, selected) {
  return `
    <div class="color-swatches" role="radiogroup" aria-label="Event color">
      ${COLOR_OPTIONS.map((c, i) => `
        <input type="radio" id="${name}-${i}" name="${name}" value="${c.value}" ${c.value === (selected || '') ? 'checked' : ''}>
        <label for="${name}-${i}" style="background:${c.var}" title="${c.label}" aria-label="${c.label}"></label>
      `).join('')}
    </div>`;
}

function eventFormHtml({ title = '', color = '', dateValue, start = '09:00', end = '10:00', done = false }) {
  return `
    <form class="modal-form" novalidate>
      <div class="modal-form-row">
        <label for="ev-title">Title</label>
        <input type="text" id="ev-title" name="title" value="${escapeHtml(title)}" placeholder="Event title" autocomplete="off" required>
      </div>
      <div class="modal-form-row">
        <label for="ev-date">Date</label>
        <input type="date" id="ev-date" name="date" value="${dateValue}" required>
      </div>
      <div class="modal-form-row cal-time-row">
        <label for="ev-start">Time</label>
        <div class="cal-time-inputs">
          <input type="time" id="ev-start" name="start" value="${start}" required>
          <span>–</span>
          <input type="time" id="ev-end" name="end" value="${end}" required>
        </div>
      </div>
      <div class="modal-form-row">
        <label>Color</label>
        ${colorRadios('color', color)}
      </div>
      <label class="cal-done-toggle">
        <input type="checkbox" name="done" ${done ? 'checked' : ''}>
        <span>Mark as done</span>
      </label>
    </form>`;
}

function getFormValues(bodyEl) {
  const form = bodyEl.querySelector('form');
  if (!form) { return null; }
  const fd = new FormData(form);
  return {
    title: (fd.get('title') || '').toString().trim(),
    color: (fd.get('color') || '').toString(),
    date: (fd.get('date') || '').toString(),
    start: (fd.get('start') || '09:00').toString(),
    end: (fd.get('end') || '10:00').toString(),
    done: fd.get('done') === 'on'
  };
}

function validTimes(v) {
  return minutes(v.end) > minutes(v.start);
}

function openEventEditor(state, key, id) {
  const list = events.get(key) || [];
  const idx = list.findIndex((e) => e.id === id);
  const ev = list[idx];
  if (!ev) { return; }

  showModal({
    title: 'Edit event',
    body: eventFormHtml({
      title: ev.title,
      color: ev.color,
      dateValue: key,
      start: ev.start,
      end: ev.end,
      done: ev.done
    }),
    actions: [
      {
        label: 'Delete',
        variant: 'outline',
        action: ({ close }) => {
          const arr = events.get(key) || [];
          const at = arr.findIndex((e) => e.id === id);
          if (at > -1) { arr.splice(at, 1); }
          if (!arr.length) { events.delete(key); } else { events.set(key, arr); }
          render(state);
          showToast(`Deleted: ${ev.title}`);
          close();
          return false;
        },
        closeOnAction: false
      },
      { label: 'Cancel', variant: 'outline' },
      {
        label: 'Save',
        variant: 'primary',
        action: ({ body }) => {
          const v = getFormValues(body);
          if (!v || !v.title) { showToast('Title is required', { variant: 'warning' }); return false; }
          if (!validTimes(v)) { showToast('End time must be after start time', { variant: 'warning' }); return false; }

          const oldArr = events.get(key) || [];
          const at = oldArr.findIndex((e) => e.id === id);
          if (at > -1) { oldArr.splice(at, 1); }
          if (!oldArr.length) { events.delete(key); } else { events.set(key, oldArr); }

          const newArr = events.get(v.date) || [];
          newArr.push({ id: ev.id, title: v.title, color: v.color, start: v.start, end: v.end, done: v.done });
          events.set(v.date, newArr);

          render(state);
          showToast(`Saved: ${v.title}`, { variant: 'success' });
          return true;
        }
      }
    ]
  });
}

function openCreateForm(state, presetDate, presetStart) {
  const dateValue = presetDate || (() => {
    const t = new Date();
    if (t.getFullYear() === state.cursor.getFullYear() && t.getMonth() === state.cursor.getMonth()) {
      return dateKey(t);
    }
    return dateKey(new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1));
  })();

  const start = presetStart || '09:00';
  const end = `${pad(Math.min(23, parseInt(start, 10) + 1))}:${start.split(':')[1]}`;

  showModal({
    title: 'New event',
    body: eventFormHtml({ dateValue, start, end }),
    actions: [
      { label: 'Cancel', variant: 'outline' },
      {
        label: 'Create',
        variant: 'primary',
        action: ({ body }) => {
          const v = getFormValues(body);
          if (!v || !v.title) { showToast('Title is required', { variant: 'warning' }); return false; }
          if (!validTimes(v)) { showToast('End time must be after start time', { variant: 'warning' }); return false; }

          const arr = events.get(v.date) || [];
          arr.push({ id: nextId++, title: v.title, color: v.color, start: v.start, end: v.end, done: v.done });
          events.set(v.date, arr);

          const np = parseKey(v.date);
          state.cursor = np;
          render(state);
          showToast(`Created: ${v.title}`, { variant: 'success' });
          return true;
        }
      }
    ]
  });
}

// ────────────────────────
//  Day agenda (month view)
// ────────────────────────

function openDayModal(state, key) {
  const date = parseKey(key);
  const dateLabel = `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

  const listHtml = () => {
    const list = eventsOn(key);
    if (!list.length) {
      return `<div class="modal-events-empty">No events yet for ${dateLabel}.</div>`;
    }
    return `
      <div class="modal-events-list">
        ${list.map((e) => `
          <div class="modal-event-row">
            <button type="button" class="row-btn cal-done-btn${e.done ? ' done' : ''}" data-done="${e.id}"
                    aria-label="${e.done ? 'Mark as not done' : 'Mark as done'}" aria-pressed="${e.done ? 'true' : 'false'}">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8.5l3.5 3.5L13 5"/></svg>
            </button>
            <span class="swatch" style="background:${colorOf(e.color)}"></span>
            <span class="title${e.done ? ' done' : ''}">${escapeHtml(e.title)}</span>
            <span class="when">${formatRange(e.start, e.end)}</span>
            <span class="row-actions">
              <button type="button" class="row-btn" data-edit="${e.id}" aria-label="Edit ${escapeHtml(e.title)}">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>
              </button>
              <button type="button" class="row-btn" data-delete="${e.id}" aria-label="Delete ${escapeHtml(e.title)}">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4h10M6 4V2h4v2M5 4l1 9h4l1-9"/></svg>
              </button>
            </span>
          </div>`).join('')}
      </div>`;
  };

  const { body } = showModal({
    title: dateLabel,
    body: listHtml(),
    actions: [
      { label: 'Close', variant: 'outline' },
      {
        label: 'Add event',
        variant: 'primary',
        action: () => {
          openCreateForm(state, key);
          return true;
        }
      }
    ]
  });

  body.addEventListener('click', (e) => {
    const doneBtn = e.target.closest('[data-done]');
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-delete]');

    if (doneBtn) {
      const id = Number(doneBtn.dataset.done);
      const arr = events.get(key) || [];
      const ev = arr.find((x) => x.id === id);
      if (ev) { ev.done = !ev.done; }
      render(state);
      body.innerHTML = listHtml();
    } else if (editBtn) {
      const id = Number(editBtn.dataset.edit);
      closeModal();
      setTimeout(() => openEventEditor(state, key, id), 200);
    } else if (delBtn) {
      const id = Number(delBtn.dataset.delete);
      const arr = events.get(key) || [];
      const at = arr.findIndex((x) => x.id === id);
      const ev = at > -1 ? arr[at] : null;
      if (at > -1) { arr.splice(at, 1); }
      if (!arr.length) { events.delete(key); } else { events.set(key, arr); }
      render(state);
      body.innerHTML = listHtml();
      if (ev) { showToast(`Deleted: ${ev.title}`); }
    }
  });
}

// ────────────────────────
//  Public init
// ────────────────────────

export function initCalendar() {
  const bodyEl = document.querySelector('.calendar-body');
  const labelEl = document.querySelector('.calendar-month');
  if (!bodyEl || !labelEl) { return; }

  seed();

  const state = {
    bodyEl,
    labelEl,
    view: 'month',
    cursor: startOfDay(new Date()),
    tabs: Array.from(document.querySelectorAll('.calendar-views .chart-tab'))
  };

  render(state);

  // View switcher
  state.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      state.view = tab.dataset.view || 'month';
      render(state);
    });
  });

  // Prev / next — one month, one week or one day depending on the view.
  const step = (dir) => {
    if (state.view === 'month') {
      state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + dir, 1);
    } else if (state.view === 'week') {
      state.cursor = addDays(state.cursor, 7 * dir);
    } else {
      state.cursor = addDays(state.cursor, dir);
    }
    render(state);
  };

  const prev = document.getElementById('cal-prev');
  const next = document.getElementById('cal-next');
  const today = document.getElementById('cal-today');

  if (prev) {
    prev.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); step(-1); });
  }
  if (next) {
    next.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); step(1); });
  }
  if (today) {
    today.addEventListener('click', (e) => {
      e.preventDefault();
      state.cursor = startOfDay(new Date());
      render(state);
    });
  }

  // Page header "New event"
  document.querySelectorAll('.page-actions .btn').forEach((b) => {
    if (b.textContent.trim().toLowerCase().includes('new event')) {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        openCreateForm(state);
      });
    }
  });

  // Grid interactions
  bodyEl.addEventListener('click', (e) => {
    const evEl = e.target.closest('[data-id]');
    if (evEl) {
      e.stopPropagation();
      openEventEditor(state, evEl.dataset.date, Number(evEl.dataset.id));
      return;
    }

    const head = e.target.closest('[data-goto]');
    if (head && state.view === 'week') {
      state.cursor = parseKey(head.dataset.goto);
      state.view = 'day';
      render(state);
      return;
    }

    const col = e.target.closest('.cal-col');
    if (col) {
      const rect = col.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      const raw = START_HOUR * 60 + ratio * ROWS * 60;
      const snapped = Math.min((END_HOUR - 1) * 60, Math.max(START_HOUR * 60, Math.round(raw / 30) * 30));
      const hh = pad(Math.floor(snapped / 60));
      const mm = pad(snapped % 60);
      openCreateForm(state, col.dataset.date, `${hh}:${mm}`);
      return;
    }

    const dayEl = e.target.closest('[data-day]');
    if (dayEl && !dayEl.classList.contains('muted')) {
      openDayModal(state, dayEl.dataset.day);
    }
  });
}
