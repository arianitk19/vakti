import { esc, icon, fmtHMS, pad } from '../utils/dom.js';
import { t, lang } from '../i18n/index.js';
import { store } from '../core/store.js';
import { clock } from '../core/clock.js';
import { actions } from '../core/actions.js';
import { KosovoPrayerService, PRAYERS } from '../services/kosovoPrayerService.js';
import { currentCity, currentCoords } from '../services/locationService.js';
import { hijri, HIJRI_MONTHS, hijriSupported, ramadan, nextRamadan, events, monthGrid, eventOn } from '../services/calendarService.js';
import { bearing, distanceKm } from '../services/qiblaService.js';
import { content } from '../services/contentService.js';
import { fmtNum, fmtTime, fmtClock, fmtDate, kosovoParts, kosovoOffset, addDays, daysBetween, dateKey } from '../utils/tz.js';
import { prayerLog, tasbih } from '../services/personalService.js';
import { PRAYER_ICON, statusBadge } from '../components/common.js';
import { shouldPromote, install, dismiss } from '../services/installService.js';
import { Sheet } from '../components/ui.js';
import { DEFAULT_WIDGETS } from '../core/store.js';

let duasCache = null;

export function hijriLabel(civil) {
  const h = hijriSupported ? hijri(civil) : null;
  return h ? `${h.d} ${HIJRI_MONTHS[h.m - 1]} ${h.y}` : '';
}

function heroHTML(s, now) {
  const next = s.next, cur = s.current;
  const nextDay = next.tomorrow ? t('home.tomorrow') : t('home.today');
  return `<section class="hero p-5 lg:p-7 col-span-full" aria-labelledby="hero-t">
    <div class="flex items-center justify-between gap-3">
      <p class="eyebrow" id="hero-t">${esc(t('home.nextPrayer'))}</p>
      ${cur ? `<span class="badge badge-current">${icon('circle-dot', 'w-3.5 h-3.5')}${esc(t('home.now'))}: ${esc(t('prayer.' + cur.key))}</span>`
        : s.sunriseSoon ? `<span class="badge badge-upcoming">${icon('sun', 'w-3.5 h-3.5')}${esc(t('home.sunriseAt', { time: fmtTime(s.today.times.sunrise) }))}</span>` : ''}
    </div>
    <div class="mt-4 flex items-end justify-between gap-4">
      <div class="min-w-0">
        <h2 class="text-4xl sm:text-5xl font-bold tracking-tight flex items-center gap-3"><span class="text-accent">${icon(PRAYER_ICON[next.key], 'w-8 h-8')}</span>${esc(t('prayer.' + next.key))}</h2>
        <p class="text-muted mt-1 text-sm">${esc(nextDay)}</p>
      </div>
      <p class="text-4xl sm:text-5xl font-semibold tabular-nums tracking-tight">${fmtTime(next.start)}</p>
    </div>
    <div class="mt-6">
      <p class="text-xs text-muted uppercase tracking-wider">${esc(t('home.remaining'))}</p>
      <p class="text-4xl sm:text-5xl font-semibold tabular-nums tracking-tight mt-1" data-bind="cd" aria-hidden="true">${fmtHMS(next.start - now)}</p>
      <p class="sr-only" data-bind="cd-sr" aria-live="off"></p>
    </div>
    <div class="mt-5 h-1.5 rounded-full bg-line overflow-hidden" role="presentation"><div class="h-full bg-accent rounded-full transition-[width] duration-1000 ease-linear" data-bind="pg" style="width:0%"></div></div>
    ${cur ? `<div class="mt-5"><button class="btn btn-ghost" data-a="mark" data-k="${cur.key}" data-day="${dateKey(s.civil)}" aria-pressed="${!!prayerLog.day(dateKey(s.civil))[cur.key]}">${icon(prayerLog.day(dateKey(s.civil))[cur.key] ? 'circle-check' : 'circle', 'w-4 h-4')}${esc(prayerLog.day(dateKey(s.civil))[cur.key] ? t('log.marked') : t('log.mark'))}</button></div>` : ''}
  </section>`;
}

function todayHTML(s) {
  const rows = s.list.map((p) => `
    <a href="#prayers" class="row ${p.status === 'current' ? 'is-current' : ''} ${p.status === 'passed' ? 'is-passed' : ''}" ${p.status === 'current' ? 'aria-current="true"' : ''}>
      <span class="text-accent">${icon(PRAYER_ICON[p.key], 'w-5 h-5')}</span>
      <span class="flex-1 font-medium">${esc(t('prayer.' + p.key))}</span>
      <span class="tabular-nums font-semibold">${fmtTime(p.start)}</span>
      <span class="w-[92px] flex justify-end">${statusBadge(p.status)}</span>
    </a>`).join('');
  return `<section class="card p-2 md:col-span-2 xl:col-span-2" aria-label="${esc(t('home.todayTimes'))}">
    <div class="flex items-center justify-between px-3 pt-3 pb-1"><h2 class="font-semibold">${esc(t('home.todayTimes'))}</h2>
      <a class="text-sm text-accent font-medium inline-flex items-center gap-1 min-h-[44px]" href="#prayers">${esc(t('home.all'))}${icon('chevron-right', 'w-4 h-4')}</a></div>
    <div class="divide-y divide-line/60">${rows}</div>
    <p class="px-3 py-2 text-xs text-muted flex items-center gap-2">${icon('sun', 'w-3.5 h-3.5')}${esc(t('prayer.sunrise'))} ${fmtTime(s.today.times.sunrise)}</p>
  </section>`;
}

function duaHTML() {
  if (!duasCache) return '';
  const p = kosovoParts(); const doy = daysBetween({ y: p.y, m: 1, d: 1 }, p);
  const d = duasCache[doy % duasCache.length];
  return `<a href="#duas/item/${esc(d.id)}" class="card card-link p-5 flex flex-col gap-3">
    <div class="flex items-center gap-2 text-xs text-muted uppercase tracking-wider">${icon('hand-heart', 'w-4 h-4 text-accent')}${esc(t('home.dua'))}</div>
    <h3 class="font-semibold">${esc(d.title)}</h3>
    <p class="arabic text-2xl leading-loose line-clamp-2" dir="rtl" lang="ar">${esc(d.arabic)}</p>
    <p class="text-sm text-muted line-clamp-2">${esc(d.translation)}</p></a>`;
}

function qiblaHTML() {
  const c = currentCoords(); const b = bearing(c); const km = distanceKm(c);
  return `<a href="#qibla" class="card card-link p-5 flex items-center gap-4">
    <span class="relative grid place-items-center h-16 w-16 rounded-full border border-line shrink-0" aria-hidden="true">
      <span class="absolute top-1 text-[10px] text-muted font-semibold">N</span>
      <svg viewBox="0 0 24 24" class="w-8 h-8 text-accent" style="transform:rotate(${b.toFixed(0)}deg)" fill="currentColor"><path d="M12 3l4 12-4-2.5L8 15z"/></svg></span>
    <div class="min-w-0"><div class="text-xs text-muted uppercase tracking-wider">${esc(t('nav.qibla'))}</div>
      <p class="text-2xl font-semibold tabular-nums">${Math.round(b)}°</p>
      <p class="text-xs text-muted">${esc(t('qibla.fromNorth'))} · ${fmtNum(km)} km</p></div></a>`;
}

function dhikrHTML() {
  const s = tasbih.get();
  return `<section class="card p-5 flex items-center gap-4" aria-label="${esc(t('nav.tasbih'))}">
    <div class="flex-1 min-w-0"><div class="text-xs text-muted uppercase tracking-wider">${esc(t('nav.tasbih'))}</div>
      <p class="text-3xl font-semibold tabular-nums mt-1"><span data-tasbih-count>${s.count}</span><span class="text-muted text-xl"> / ${s.target}</span></p>
      <a class="text-sm text-accent font-medium inline-flex items-center min-h-[44px]" href="#dhikr/tasbih">${esc(t('home.openTasbih'))}</a></div>
    <button class="tap-round" data-a="tasbih-inc" aria-label="${esc(t('tasbih.add'))}">${icon('plus', 'w-7 h-7')}</button></section>`;
}

function ramadanHTML(now, city) {
  const civil = (() => { const p = kosovoParts(now); return { y: p.y, m: p.m, d: p.d }; })();
  const r = ramadan(civil);
  if (r.active) {
    return `<a href="#ramadan" class="card card-link p-5 flex flex-col gap-2"><div class="text-xs text-muted uppercase tracking-wider flex items-center gap-2">${icon('moon-star', 'w-4 h-4 text-accent')}${esc(t('nav.ramadan'))} · ${esc(t('ramadan.dayN', { n: r.dayNo }))}</div>
      <p class="text-sm text-muted" data-bind="iftar-l">${esc(t('ramadan.untilIftar'))}</p><p class="text-2xl font-semibold tabular-nums" data-bind="iftar">--:--:--</p></a>`;
  }
  const nx = nextRamadan(civil);
  if (!nx) return '';
  const days = daysBetween(civil, nx.start);
  return `<a href="#ramadan" class="card card-link p-5 flex flex-col gap-1"><div class="text-xs text-muted uppercase tracking-wider flex items-center gap-2">${icon('moon-star', 'w-4 h-4 text-accent')}${esc(t('nav.ramadan'))}</div>
    <p class="text-2xl font-semibold">${esc(t('ramadan.inDays', { n: days }))}</p>
    <p class="text-xs text-muted">${esc(nx.estimated ? t('ramadan.estimated') : t('ramadan.official'))}</p></a>`;
}

function reminderHTML(now) {
  const p = kosovoParts(now);
  if (p.wd === 5) return `<a href="#friday" class="card card-link p-5 flex gap-3 items-start"><span class="text-accent mt-0.5">${icon('calendar-check')}</span><div><h3 class="font-semibold">${esc(t('friday.todayTitle'))}</h3><p class="text-sm text-muted mt-1">${esc(t('friday.todayText'))}</p></div></a>`;
  if (p.wd === 4) return `<a href="#friday" class="card card-link p-5 flex gap-3 items-start"><span class="text-accent mt-0.5">${icon('calendar-check')}</span><div><h3 class="font-semibold">${esc(t('friday.tomorrowTitle'))}</h3><p class="text-sm text-muted mt-1">${esc(t('friday.tomorrowText'))}</p></div></a>`;
  const civil = { y: p.y, m: p.m, d: p.d };
  const ev = events(p.y).map((e) => ({ ...e, days: daysBetween(civil, { y: +e.date.slice(0, 4), m: +e.date.slice(5, 7), d: +e.date.slice(8) }) }))
    .filter((e) => e.days >= 0 && e.days <= 45).sort((a, b) => a.days - b.days)[0];
  if (!ev) return '';
  return `<a href="#prayers/month" class="card card-link p-5 flex gap-3 items-start"><span class="text-accent mt-0.5">${icon('calendar')}</span><div><h3 class="font-semibold">${esc(t('ev.' + ev.id))}</h3><p class="text-sm text-muted mt-1">${ev.days === 0 ? esc(t('home.today')) : esc(t('home.inDays', { n: ev.days }))} · ${esc(fmtDate({ y: +ev.date.slice(0, 4), m: +ev.date.slice(5, 7), d: +ev.date.slice(8) }, lang(), { day: 'numeric', month: 'long' }))}</p></div></a>`;
}

function calendarHTML(now) {
  const p = kosovoParts(now);
  const g = monthGrid(p.y, p.m);
  const wds = lang() === 'sq' ? ['H', 'M', 'M', 'E', 'P', 'SH', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return `<a href="#prayers/month" class="card card-link p-5 block" aria-label="${esc(t('home.calendar'))}">
    <div class="flex items-center justify-between mb-3"><h3 class="font-semibold">${esc(fmtDate({ y: p.y, m: p.m, d: 1 }, lang(), { month: 'long', year: 'numeric' }))}</h3><span class="text-xs text-muted">${esc(hijriLabel(p))}</span></div>
    <div class="grid grid-cols-7 gap-y-1 text-center text-xs" aria-hidden="true">
      ${wds.map((w) => `<span class="text-muted font-medium">${w}</span>`).join('')}
      ${g.weeks.flat().map((c) => c ? `<span class="py-1 rounded-full tabular-nums ${c.d === p.d ? 'bg-accent text-on-accent font-semibold' : eventOn(c) ? 'ring-1 ring-accent' : ''}">${c.d}</span>` : '<span></span>').join('')}
    </div></a>`;
}

function installHTML() {
  if (!shouldPromote()) return '';
  return `<div class="card p-4 flex items-center gap-3 col-span-full">${icon('download', 'w-5 h-5 text-accent')}<p class="flex-1 text-sm">${esc(t('install.cta'))}</p>
    <button class="btn btn-primary" data-a="install">${esc(t('install.button'))}</button>
    <button class="btn-icon" data-a="install-dismiss" aria-label="${esc(t('common.close'))}">${icon('x', 'w-4 h-4')}</button></div>`;
}

function headerHTML(now, city) {
  const p = kosovoParts(now);
  return `<header class="mb-5 lg:mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
    <div><p class="text-sm text-muted">${esc(fmtDate(p, lang(), { weekday: 'long' }))}</p>
      <h1 class="text-2xl lg:text-3xl font-bold tracking-tight">${esc(fmtDate(p, lang(), { day: 'numeric', month: 'long', year: 'numeric' }))}</h1>
      ${hijriSupported ? `<p class="text-sm text-muted mt-0.5">${esc(hijriLabel(p))} · ${esc(t("cal.approx"))}</p>` : ''}</div>
    <div class="text-right"><p class="text-3xl lg:text-4xl font-semibold tabular-nums tracking-tight" data-bind="clock">${fmtClock(now)}</p>
      <a href="#settings/location" class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink min-h-[44px]">${icon('map-pin', 'w-4 h-4')}${esc(city.name)}, ${esc(t('common.kosovo'))}</a>
      <p class="text-xs text-muted mt-0.5 inline-flex items-center gap-1">${icon('shield-check', 'w-3.5 h-3.5')}${esc(t('home.dataState'))}</p>
      ${-new Date(now).getTimezoneOffset() !== kosovoOffset(now) ? `<p class="text-xs text-muted">${esc(t('home.kosovoTime'))}</p>` : ''}</div></header>`;
}

function body(now) {
  const city = currentCity();
  const s = KosovoPrayerService.schedule(now, city);
  const map = { next: () => heroHTML(s, now), today: () => todayHTML(s), dua: duaHTML, qibla: qiblaHTML, dhikr: dhikrHTML,
    ramadan: () => ramadanHTML(now, city), reminder: () => reminderHTML(now), calendar: () => calendarHTML(now) };
  const widgets = store.get('widgets').filter((w) => w.on).map((w) => map[w.id]?.() || '').join('');
  return { html: headerHTML(now, city) + `<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">${installHTML()}${widgets}</div>
    <div class="mt-6 flex justify-center"><button class="btn btn-ghost" data-a="widgets-edit">${icon('layout-grid', 'w-4 h-4')}${esc(t('home.customize'))}</button></div>`, s };
}

const sig = (s) => [s.civil.d, s.next.key, s.next.start, s.current?.key, s.sunriseSoon].join('|');

export const home = {
  title: 'nav.home',
  async render() {
    if (!duasCache) { try { duasCache = (await content.duas()).items; } catch { duasCache = null; } }
    const { html } = body(Date.now());
    return `<div id="home-root">${html}</div>`;
  },
  mount(root) {
    const el = root.querySelector('#home-root');
    let last = sig(KosovoPrayerService.schedule(Date.now(), currentCity()));
    let lastMin = -1;
    const off = clock.subscribe((now) => {
      const city = currentCity();
      const s = KosovoPrayerService.schedule(now, city);
      if (sig(s) !== last) { last = sig(s); el.innerHTML = body(now).html; }
      const q = (b) => el.querySelector(`[data-bind="${b}"]`);
      const set = (b, v) => { const n = q(b); if (n && n.textContent !== v) n.textContent = v; };
      set('clock', fmtClock(now));
      set('cd', fmtHMS(s.next.start - now));
      const m = Math.floor(now / 60000);
      if (m !== lastMin) {
        lastMin = m;
        const sr = q('cd-sr'); if (sr) sr.textContent = t('home.srRemaining', { min: Math.ceil((s.next.start - now) / 60000), name: t('prayer.' + s.next.key) });
      }
      const pg = q('pg');
      if (pg) {
        const civil = s.civil; let prev = null;
        for (const k of PRAYERS) if (s.today.times[k] <= now) prev = s.today.times[k];
        if (prev == null) prev = KosovoPrayerService.day(addDays(civil, -1), city).times.isha;
        pg.style.width = Math.min(100, Math.max(0, ((now - prev) / (s.next.start - prev)) * 100)).toFixed(2) + '%';
      }
      const ift = q('iftar');
      if (ift) {
        const nm = KosovoPrayerService.nextOf('maghrib', now, city);
        const nmImsak = KosovoPrayerService.nextOf('imsak', now, city);
        // If imsak comes before maghrib we are in the fasting-free night → count to imsak instead
        ift.textContent = fmtHMS((nmImsak < nm ? nmImsak : nm) - now);
        const lb = q('iftar-l'), lt = t(nmImsak < nm ? 'ramadan.untilSyfyrEnd' : 'ramadan.untilIftar'); if (lb && lb.textContent !== lt) lb.textContent = lt;
      }
    });
    return off;
  }
};

// ---- actions ----
actions.mark = (el) => {
  const on = prayerLog.toggle(el.dataset.day, el.dataset.k);
  const root = document.getElementById('home-root');
  if (root) root.innerHTML = body(Date.now()).html;
  import('../components/ui.js').then((m) => m.toast(on ? t('log.markedToast') : t('log.unmarkedToast')));
};
actions.install = async () => { await install(); const r = document.getElementById('home-root'); if (r) r.innerHTML = body(Date.now()).html; };
actions['install-dismiss'] = () => { dismiss(); const r = document.getElementById('home-root'); if (r) r.innerHTML = body(Date.now()).html; };

actions['widgets-edit'] = () => {
  const render = (b) => {
    const list = store.get('widgets');
    b.innerHTML = `<p class="text-sm text-muted mb-3">${esc(t('home.customizeHelp'))}</p>
      <ul class="divide-y divide-line/60">${list.map((w, i) => `<li class="flex items-center gap-2 py-2">
        <label class="flex-1 flex items-center gap-3 cursor-pointer min-h-[44px]"><input type="checkbox" class="chk" data-w="${w.id}" ${w.on ? 'checked' : ''}><span>${esc(t('widget.' + w.id))}</span></label>
        <button class="btn-icon" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="${esc(t('common.moveUp'))}">${icon('arrow-up', 'w-4 h-4')}</button>
        <button class="btn-icon" data-down="${i}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="${esc(t('common.moveDown'))}">${icon('arrow-down', 'w-4 h-4')}</button></li>`).join('')}</ul>
      <div class="mt-4 flex justify-between"><button class="btn btn-ghost" data-reset>${icon('rotate-ccw', 'w-4 h-4')}${esc(t('home.resetLayout'))}</button><button class="btn btn-primary" data-done>${esc(t('common.done'))}</button></div>`;
  };
  Sheet.open({
    title: t('home.customize'),
    onClose: () => { const r = document.getElementById('home-root'); if (r) r.innerHTML = body(Date.now()).html; },
    mount: (b, api) => {
      render(b);
      b.addEventListener('change', (e) => { const id = e.target.dataset.w; if (!id) return; store.set('widgets', store.get('widgets').map((w) => (w.id === id ? { ...w, on: e.target.checked } : w))); });
      b.addEventListener('click', (e) => {
        const up = e.target.closest('[data-up]'), dn = e.target.closest('[data-down]');
        const l = [...store.get('widgets')];
        if (up) { const i = +up.dataset.up; [l[i - 1], l[i]] = [l[i], l[i - 1]]; store.set('widgets', l); render(b); b.querySelector(`[data-up="${i - 1}"]`)?.focus(); }
        else if (dn) { const i = +dn.dataset.down; [l[i + 1], l[i]] = [l[i], l[i + 1]]; store.set('widgets', l); render(b); b.querySelector(`[data-down="${i + 1}"]`)?.focus(); }
        else if (e.target.closest('[data-reset]')) { store.set('widgets', DEFAULT_WIDGETS); render(b); }
        else if (e.target.closest('[data-done]')) api.close();
      });
    }
  });
};
