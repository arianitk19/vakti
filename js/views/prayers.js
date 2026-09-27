import { esc, icon } from '../utils/dom.js';
import { t, lang } from '../i18n/index.js';
import { clock } from '../core/clock.js';
import { actions } from '../core/actions.js';
import { TransitionManager } from '../core/transition.js';
import { KosovoPrayerService, PRAYERS } from '../services/kosovoPrayerService.js';
import { currentCity } from '../services/locationService.js';
import { hijri, monthGrid, eventOn, hijriSupported, HIJRI_MONTHS } from '../services/calendarService.js';
import { fmtTime, fmtDate, kosovoParts, addDays, dateKey, sameDay } from '../utils/tz.js';
import { prayerLog } from '../services/personalService.js';
import { PRAYER_ICON, statusBadge, pageHeader } from '../components/common.js';
import { Sheet, toast } from '../components/ui.js';
import { hijriLabel } from './home.js';

const st = { week: 0, month: null };
const todayC = () => { const p = kosovoParts(); return { y: p.y, m: p.m, d: p.d, wd: p.wd }; };

function tabs(active) {
  const o = [['today', t('prayers.tabToday'), '#prayers'], ['week', t('prayers.tabWeek'), '#prayers/week'], ['month', t('prayers.tabMonth'), '#prayers/month']];
  return `<nav class="seg mb-5" aria-label="${esc(t('nav.prayers'))}">${o.map(([id, l, h]) =>
    `<a href="${h}" class="seg-i ${id === active ? 'is-on' : ''}" ${id === active ? 'aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</nav>`;
}

function noteHTML(city, day) {
  const off = day.offset;
  const src = city.offsetKey
    ? t('prayers.cityOffset', { city: city.name, off: (off > 0 ? '+' : '') + off })
    : t('prayers.cityBase', { city: city.name });
  return `<p class="text-xs text-muted leading-relaxed mt-4 flex gap-2">${icon('info', 'w-4 h-4 shrink-0 mt-0.5')}<span>${esc(src)} ${day.approx ? esc(t('prayers.leapNote')) : ''} <a class="underline" href="#settings/prayer">${esc(t('prayers.sourceLink'))}</a></span></p>`;
}

/* ---------- TODAY ---------- */
function todayPane(now) {
  const city = currentCity();
  const s = KosovoPrayerService.schedule(now, city);
  const key = dateKey(s.civil);
  const marked = prayerLog.day(key);
  const cards = s.list.map((p) => `
    <li class="card p-3 pl-4 flex items-center gap-3 prayer-card is-${p.status}" ${p.status === 'current' ? 'aria-current="true"' : ''}>
      <span class="grid place-items-center h-11 w-11 rounded-full bg-accent-soft text-accent shrink-0">${icon(PRAYER_ICON[p.key], 'w-5 h-5')}</span>
      <div class="flex-1 min-w-0"><p class="font-semibold leading-tight">${esc(t('prayer.' + p.key))}</p><div class="mt-1.5">${statusBadge(p.status)}</div></div>
      <p class="text-2xl font-semibold tabular-nums">${fmtTime(p.start)}</p>
      <button class="btn-icon ${marked[p.key] ? 'text-success' : 'text-muted'}" data-a="mark-day" data-day="${key}" data-k="${p.key}" aria-pressed="${!!marked[p.key]}" ${p.status === 'upcoming' ? 'disabled' : ''}
        aria-label="${esc(marked[p.key] ? t('log.marked') : t('log.mark'))}: ${esc(t('prayer.' + p.key))}" title="${esc(marked[p.key] ? t('log.marked') : t('log.mark'))}">${icon(marked[p.key] ? 'circle-check' : 'circle', 'w-6 h-6')}</button>
    </li>`).join('');

  // timeline: Sabahu → Lindja → Dreka → Ikindia → Akshami → Jacia
  const T = s.today.times;
  const pts = [['fajr', T.fajr], ['sunrise', T.sunrise], ['dhuhr', T.dhuhr], ['asr', T.asr], ['maghrib', T.maghrib], ['isha', T.isha]];
  const tl = pts.map(([k, at], i) => {
    const passed = now >= at, nextPt = pts[i + 1]?.[1];
    const active = passed && (!nextPt || now < nextPt);
    const fill = i < pts.length - 1 ? (now >= nextPt ? 100 : passed ? ((now - at) / (nextPt - at)) * 100 : 0) : 0;
    return `<li class="tl-i ${passed ? 'is-passed' : ''} ${active ? 'is-active' : ''}">
      <span class="tl-dot" aria-hidden="true"></span>
      ${i < pts.length - 1 ? `<span class="tl-line" aria-hidden="true"><span style="height:${fill.toFixed(1)}%"></span></span>` : ''}
      <div class="flex items-baseline justify-between gap-3 pb-6"><span class="${k === 'sunrise' ? 'text-muted' : 'font-medium'}">${esc(t('prayer.' + k))}</span><span class="tabular-nums ${k === 'sunrise' ? 'text-muted' : ''}">${fmtTime(at)}</span></div></li>`;
  }).join('');

  return `<div class="grid gap-6 lg:grid-cols-[1.2fr_1fr] items-start">
    <div><ul class="grid gap-3">${cards}</ul>${noteHTML(city, s.today)}</div>
    <section class="card p-5" aria-label="${esc(t('prayers.timeline'))}"><h2 class="font-semibold mb-4">${esc(t('prayers.timeline'))}</h2><ol class="tl">${tl}</ol></section></div>`;
}

/* ---------- WEEK ---------- */
const mondayOf = (c) => addDays(c, -(c.wd - 1));
function weekPane() {
  const city = currentCity(); const today = todayC();
  const start = addDays(mondayOf(today), st.week * 7);
  const end = addDays(start, 6);
  const rng = `${fmtDate(start, lang(), { day: 'numeric', month: 'short' })} – ${fmtDate(end, lang(), { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const days = [...Array(7)].map((_, i) => addDays(start, i)).map((c) => {
    const d = KosovoPrayerService.day(c, city);
    const isToday = sameDay(c, today);
    const past = Date.UTC(c.y, c.m - 1, c.d) < Date.UTC(today.y, today.m - 1, today.d);
    return `<li><button class="card w-full p-4 text-left ${isToday ? 'ring-2 ring-accent' : ''} " data-a="day-open" data-y="${c.y}" data-m="${c.m}" data-d="${c.d}" ${isToday ? 'aria-current="date"' : ''}>
      <div class="flex items-center justify-between mb-3"><span class="font-semibold">${esc(fmtDate(c, lang(), { weekday: 'long' }))} <span class="text-muted font-normal">${c.d}/${c.m}</span></span>
        ${isToday ? `<span class="badge badge-current">${esc(t('home.today'))}</span>` : past ? `<span class="text-xs text-muted">${esc(t('status.passed'))}</span>` : ''}</div>
      <div class="grid grid-cols-5 gap-1 text-center">${PRAYERS.map((k) => `<div><p class="text-[11px] text-muted leading-tight">${esc(t('prayer.short.' + k))}</p><p class="tabular-nums text-[13px] sm:text-sm font-semibold">${fmtTime(d.times[k])}</p></div>`).join('')}</div></button></li>`;
  }).join('');
  return `<div class="flex items-center justify-between gap-2 mb-4"><button class="btn-icon" data-a="week-nav" data-d="-1" aria-label="${esc(t('common.prev'))}">${icon('chevron-left')}</button>
    <div class="text-center"><p class="font-semibold">${esc(rng)}</p>${st.week ? `<button class="text-sm text-accent" data-a="week-nav" data-d="0">${esc(t('prayers.thisWeek'))}</button>` : ''}</div>
    <button class="btn-icon" data-a="week-nav" data-d="1" aria-label="${esc(t('common.next'))}">${icon('chevron-right')}</button></div>
    <ol class="grid gap-3 md:grid-cols-2">${days}</ol>${noteHTML(city, KosovoPrayerService.day(today, city))}`;
}

/* ---------- MONTH ---------- */
function monthPane() {
  const today = todayC();
  const { y, m } = st.month || { y: today.y, m: today.m };
  const g = monthGrid(y, m);
  const wds = [...Array(7)].map((_, i) => fmtDate(addDays({ y: 2024, m: 1, d: 1 }, i), lang(), { weekday: 'short' }));
  const cells = g.weeks.flat().map((c) => {
    if (!c) return '<span></span>';
    const isToday = sameDay(c, today); const key = dateKey(c);
    const ev = eventOn(c); const n = prayerLog.count(key);
    const h = hijriSupported ? hijri(c) : null;
    return `<button class="cal-cell ${isToday ? 'is-today' : ''}" data-a="day-open" data-y="${c.y}" data-m="${c.m}" data-d="${c.d}" aria-label="${esc(fmtDate(c, lang(), { weekday: 'long', day: 'numeric', month: 'long' }) + (ev ? ', ' + t('ev.' + ev.id) : ''))}" ${isToday ? 'aria-current="date"' : ''}>
      <span class="text-sm font-semibold tabular-nums">${c.d}</span>
      ${h ? `<span class="text-[10px] text-muted tabular-nums">${h.d}${h.d === 1 ? ' ' + HIJRI_MONTHS[h.m - 1].slice(0, 3) : ''}</span>` : ''}
      <span class="flex gap-0.5 h-1.5 mt-0.5" aria-hidden="true">${ev ? '<i class="dot bg-accent"></i>' : ''}${n ? `<i class="dot ${n === 5 ? 'bg-success' : 'bg-muted'}"></i>` : ''}</span></button>`;
  }).join('');
  const hm = hijriSupported ? (() => { const a = hijri({ y, m, d: 1 }), b = hijri({ y, m, d: 28 }); return a && b ? `${HIJRI_MONTHS[a.m - 1]}${a.m !== b.m ? ' – ' + HIJRI_MONTHS[b.m - 1] : ''} ${b.y}` : ''; })() : '';
  return `<div class="card p-4 lg:p-6">
    <div class="flex items-center justify-between mb-4"><button class="btn-icon" data-a="month-nav" data-d="-1" aria-label="${esc(t('common.prev'))}">${icon('chevron-left')}</button>
      <div class="text-center"><h2 class="font-semibold">${esc(fmtDate({ y, m, d: 1 }, lang(), { month: 'long', year: 'numeric' }))}</h2>${hm ? `<p class="text-xs text-muted">${esc(hm)} · ${esc(t('cal.approx'))}</p>` : ''}</div>
      <button class="btn-icon" data-a="month-nav" data-d="1" aria-label="${esc(t('common.next'))}">${icon('chevron-right')}</button></div>
    <div class="grid grid-cols-7 gap-1 text-center text-xs text-muted font-medium mb-1" aria-hidden="true">${wds.map((w) => `<span>${esc(w)}</span>`).join('')}</div>
    <div class="grid grid-cols-7 gap-1">${cells}</div>
    <p class="text-xs text-muted mt-4 flex flex-wrap gap-x-4 gap-y-1"><span class="inline-flex items-center gap-1.5"><i class="dot bg-accent"></i>${esc(t('cal.legendEvent'))}</span><span class="inline-flex items-center gap-1.5"><i class="dot bg-success"></i>${esc(t('cal.legendAll'))}</span></p>
    ${y === 2026 ? '' : `<p class="text-xs text-muted mt-2">${esc(t('cal.eventsOnly2026'))}</p>`}</div>`;
}

/* ---------- day sheet ---------- */
function dayBody(c) {
  const city = currentCity(); const d = KosovoPrayerService.day(c, city);
  const today = todayC(); const now = Date.now(); const key = dateKey(c);
  const marked = prayerLog.day(key);
  const future = Date.UTC(c.y, c.m - 1, c.d) > Date.UTC(today.y, today.m - 1, today.d);
  const ev = eventOn(c);
  const rows = ['imsak', 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].map((k) => {
    const canMark = PRAYERS.includes(k) && !future && d.times[k] <= now;
    return `<li class="flex items-center gap-3 py-2.5"><span class="text-accent">${icon(PRAYER_ICON[k], 'w-5 h-5')}</span><span class="flex-1">${esc(t('prayer.' + k))}</span><span class="tabular-nums font-semibold">${fmtTime(d.times[k])}</span>
      ${PRAYERS.includes(k) ? `<button class="btn-icon ${marked[k] ? 'text-success' : ''}" data-a="mark-day-sheet" data-day="${key}" data-k="${k}" ${canMark ? '' : 'disabled'} aria-pressed="${!!marked[k]}" aria-label="${esc(marked[k] ? t('log.marked') : t('log.mark'))}: ${esc(t('prayer.' + k))}">${icon(marked[k] ? 'circle-check' : 'circle', 'w-5 h-5')}</button>` : '<span class="w-11"></span>'}</li>`;
  }).join('');
  return `${ev ? `<p class="mb-2 badge badge-upcoming">${icon('calendar', 'w-3.5 h-3.5')}${esc(t('ev.' + ev.id))}</p>` : ''}
    ${hijriSupported ? `<p class="text-sm text-muted mb-2">${esc(hijriLabel(c))} · ${esc(t('cal.approx'))}</p>` : ''}
    <ul class="divide-y divide-line/60">${rows}</ul>${noteHTML(city, d)}`;
}

let paneMode = 'today';
const paneHTML = (mode, now) => (mode === 'week' ? weekPane() : mode === 'month' ? monthPane() : todayPane(now));

export const prayers = {
  title: 'nav.prayers',
  render(route) {
    const mode = ['week', 'month'].includes(route.params[0]) ? route.params[0] : 'today';
    paneMode = mode;
    if (mode === 'week') st.week = 0;
    if (mode === 'month') st.month = null;
    const now = Date.now();
    const p = kosovoParts(now);
    return pageHeader(t('nav.prayers'), esc(fmtDate(p, lang(), { weekday: 'long', day: 'numeric', month: 'long' }))) + tabs(mode) + `<div id="prayers-pane">${paneHTML(mode, now)}</div>`;
  },
  mount(root) {
    const pane = root.querySelector('#prayers-pane');
    if (paneMode !== 'today') return null;
    let last = '';
    return clock.subscribe((now) => {
      const s = KosovoPrayerService.schedule(now, currentCity());
      const sg = s.list.map((p) => p.status).join() + s.civil.d + Math.floor(now / 60000);
      if (sg !== last) { last = sg; pane.innerHTML = todayPane(now); }
    });
  }
};

const repaint = (html) => { const pane = document.getElementById('prayers-pane'); if (pane) TransitionManager.swap(pane, () => () => { pane.innerHTML = html; }, { fadeOnly: true }); };

actions['week-nav'] = (el) => { const d = +el.dataset.d; st.week = d === 0 ? 0 : st.week + d; repaint(weekPane()); };
actions['month-nav'] = (el) => {
  const c = st.month || (() => { const p = todayC(); return { y: p.y, m: p.m }; })();
  const n = new Date(Date.UTC(c.y, c.m - 1 + +el.dataset.d, 1));
  st.month = { y: n.getUTCFullYear(), m: n.getUTCMonth() + 1 };
  repaint(monthPane());
};
actions['day-open'] = (el) => {
  const c = { y: +el.dataset.y, m: +el.dataset.m, d: +el.dataset.d };
  Sheet.open({ title: fmtDate(c, lang(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), html: dayBody(c),
    mount: (b) => { b._c = c; }, onClose: () => { if (paneMode === 'month') { const pane = document.getElementById('prayers-pane'); if (pane) pane.innerHTML = monthPane(); } } });
};
actions['mark-day'] = (el) => {
  const on = prayerLog.toggle(el.dataset.day, el.dataset.k);
  const pane = document.getElementById('prayers-pane'); if (pane) pane.innerHTML = todayPane(Date.now());
  toast(on ? t('log.markedToast') : t('log.unmarkedToast'));
};
actions['mark-day-sheet'] = (el) => {
  prayerLog.toggle(el.dataset.day, el.dataset.k);
  const [y, m, d] = el.dataset.day.split('-').map(Number);
  Sheet.top().setBody(dayBody({ y, m, d }));
};
