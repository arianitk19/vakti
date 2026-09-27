import { esc, icon } from '../utils/dom.js';
import { t, lang } from '../i18n/index.js';
import { pageHeader } from '../components/common.js';
import { PRAYERS, KosovoPrayerService } from '../services/kosovoPrayerService.js';
import { currentCity } from '../services/locationService.js';
import { prayerLog, opens } from '../services/personalService.js';
import { kosovoParts, addDays, dateKey, fmtDate, daysBetween } from '../utils/tz.js';

const today = () => { const p = kosovoParts(); return { y: p.y, m: p.m, d: p.d, wd: p.wd }; };

/** How many prayers of a civil day could have been marked by now (only prayers whose time has begun). */
function possible(c, now, city) {
  const t0 = today();
  const diff = daysBetween(c, t0);
  if (diff > 0) return 5; if (diff < 0) return 0;
  const T = KosovoPrayerService.day(c, city).times;
  return PRAYERS.filter((k) => T[k] <= now).length;
}

function bar(n, max, label) {
  return `<div class="flex items-center gap-3"><span class="text-sm w-24 shrink-0 text-muted">${esc(label)}</span>
    <div class="flex-1 h-2.5 rounded-full bg-line overflow-hidden" role="img" aria-label="${esc(label)}: ${n} / ${max}"><div class="h-full bg-accent rounded-full" style="width:${max ? (n / max) * 100 : 0}%"></div></div>
    <span class="text-sm tabular-nums w-14 text-right font-medium">${n}/${max}</span></div>`;
}

export const stats = {
  title: 'nav.stats',
  render() {
    const now = Date.now(), city = currentCity(), td = today();
    const mon = addDays(td, -(td.wd - 1));
    // week grid
    const week = [...Array(7)].map((_, i) => addDays(mon, i));
    let wMarked = 0, wPoss = 0;
    const grid = week.map((c) => {
      const day = prayerLog.day(dateKey(c)); const n = Object.keys(day).length; const p = possible(c, now, city);
      wMarked += n; wPoss += p;
      const future = daysBetween(td, c) > 0;
      return `<div class="flex flex-col items-center gap-2 ${future ? 'opacity-50' : ''}"><span class="text-xs text-muted">${esc(fmtDate(c, lang(), { weekday: 'short' }))}</span>
        <div class="flex flex-col gap-1" role="img" aria-label="${esc(fmtDate(c, lang(), { weekday: 'long' }))}: ${n}/5">${PRAYERS.map((k) => `<i class="pip ${day[k] ? 'is-on' : ''}"></i>`).join('')}</div>
        <span class="text-xs tabular-nums font-medium">${n}</span></div>`;
    }).join('');
    // last 4 weeks
    const weeks = [3, 2, 1, 0].map((w) => {
      const start = addDays(mon, -7 * w); let m = 0, p = 0;
      for (let i = 0; i < 7; i++) { const c = addDays(start, i); m += prayerLog.count(dateKey(c)); p += possible(c, now, city); }
      return bar(m, p, `${fmtDate(start, lang(), { day: 'numeric', month: 'short' })}`);
    }).join('');
    // month
    const dim = new Date(Date.UTC(td.y, td.m, 0)).getUTCDate();
    let mMarked = 0, mPoss = 0, full = 0, daysElapsed = 0;
    const cells = [...Array(dim)].map((_, i) => {
      const c = { y: td.y, m: td.m, d: i + 1 }; const n = prayerLog.count(dateKey(c)); const p = possible(c, now, city);
      mMarked += n; mPoss += p; if (n === 5) full++; if (p > 0) daysElapsed++;
      const lvl = n === 0 ? 0 : n < 3 ? 1 : n < 5 ? 2 : 3;
      return `<div class="heat lvl${lvl} ${c.d === td.d ? 'ring-2 ring-accent' : ''}" role="img" aria-label="${c.d}: ${n}/5"><span>${c.d}</span></div>`;
    }).join('');
    const o = opens.all(); const ym = `${td.y}-${String(td.m).padStart(2, '0')}`;
    return pageHeader(t('nav.stats'), esc(t('stats.sub')), '', 'more') + `
      <div class="grid gap-4 md:grid-cols-3 mb-4">
        <div class="card p-5"><p class="text-xs uppercase tracking-wider text-muted">${esc(t('stats.thisWeek'))}</p><p class="text-4xl font-bold tabular-nums mt-1">${wMarked}<span class="text-xl text-muted font-medium">/${wPoss}</span></p><p class="text-sm text-muted mt-1">${esc(t('stats.markedOf'))}</p></div>
        <div class="card p-5"><p class="text-xs uppercase tracking-wider text-muted">${esc(t('stats.thisMonth'))}</p><p class="text-4xl font-bold tabular-nums mt-1">${mMarked}<span class="text-xl text-muted font-medium">/${mPoss}</span></p><p class="text-sm text-muted mt-1">${esc(t('stats.fullDays', { n: full, total: daysElapsed }))}</p></div>
        <div class="card p-5"><p class="text-xs uppercase tracking-wider text-muted">${esc(t('stats.opened'))}</p><p class="text-4xl font-bold tabular-nums mt-1">${o.length}</p><p class="text-sm text-muted mt-1">${esc(t('stats.openedMonth', { n: o.filter((k) => k.startsWith(ym)).length }))}</p></div></div>
      <section class="card p-5 mb-4"><h2 class="font-semibold mb-4">${esc(t('stats.weeklyOverview'))}</h2>
        <div class="grid grid-cols-7 gap-2 max-w-md mx-auto">${grid}</div>
        <p class="text-xs text-muted mt-4 text-center">${PRAYERS.map((k) => esc(t('prayer.short.' + k))).join(' · ')} ↓</p></section>
      <div class="grid gap-4 lg:grid-cols-2">
        <section class="card p-5"><h2 class="font-semibold mb-4">${esc(t('stats.weekly'))}</h2><div class="grid gap-3">${weeks}</div></section>
        <section class="card p-5"><h2 class="font-semibold mb-4">${esc(t('stats.monthly'))} · ${esc(fmtDate({ y: td.y, m: td.m, d: 1 }, lang(), { month: 'long' }))}</h2><div class="grid grid-cols-7 gap-1.5">${cells}</div></section></div>
      <p class="text-xs text-muted mt-6 leading-relaxed flex gap-2">${icon('info', 'w-4 h-4 shrink-0 mt-0.5')}${esc(t('stats.disclaimer'))}</p>`;
  }
};
