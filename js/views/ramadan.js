import { esc, icon, fmtHMS } from '../utils/dom.js';
import { t, lang } from '../i18n/index.js';
import { clock } from '../core/clock.js';
import { actions } from '../core/actions.js';
import { pageHeader } from '../components/common.js';
import { KosovoPrayerService } from '../services/kosovoPrayerService.js';
import { currentCity } from '../services/locationService.js';
import { ramadan, nextRamadan, hijriSupported } from '../services/calendarService.js';
import { fmtTime, fmtDate, kosovoParts, addDays, daysBetween, sameDay } from '../utils/tz.js';
import { share } from '../services/shareService.js';

const civilNow = () => { const p = kosovoParts(); return { y: p.y, m: p.m, d: p.d, wd: p.wd }; };

function phase(now, city) {
  const T = KosovoPrayerService.day(civilNow(), city).times;
  if (now < T.imsak) return { id: 'starts', target: T.imsak };
  if (now < T.maghrib) return { id: 'active', target: T.maghrib };
  return { id: 'iftarTime', target: KosovoPrayerService.nextOf('imsak', now, city) };
}

function table(start, total, city, today, estimated) {
  const rows = [...Array(Math.min(total, 30))].map((_, i) => {
    const c = addDays(start, i); const d = KosovoPrayerService.day(c, city);
    const isT = today && sameDay(c, today);
    return `<tr class="${isT ? 'bg-accent-soft font-semibold' : ''}" ${isT ? 'aria-current="date"' : ''}><th scope="row" class="text-left py-2 pl-3 font-medium tabular-nums">${i + 1}</th>
      <td class="py-2">${esc(fmtDate(c, lang(), { weekday: 'short', day: 'numeric', month: 'short' }))}</td>
      <td class="py-2 tabular-nums text-right">${fmtTime(d.times.imsak)}</td><td class="py-2 pr-3 tabular-nums text-right">${fmtTime(d.times.maghrib)}</td></tr>`;
  }).join('');
  return `<div class="card overflow-hidden"><table class="w-full text-sm"><caption class="sr-only">${esc(t('ramadan.calendar'))}</caption>
    <thead class="text-xs text-muted uppercase tracking-wider"><tr><th class="text-left py-2 pl-3">#</th><th class="text-left py-2">${esc(t('common.date'))}</th><th class="text-right py-2">${esc(t('ramadan.syfyr'))}</th><th class="text-right py-2 pr-3">${esc(t('ramadan.iftar'))}</th></tr></thead>
    <tbody class="divide-y divide-line/60">${rows}</tbody></table></div>
    <p class="text-xs text-muted mt-3 leading-relaxed">${esc(estimated ? t('ramadan.tableEstimated') : t('ramadan.tableOfficial'))}</p>`;
}

export const ramadanView = {
  title: 'nav.ramadan',
  render() {
    const civil = civilNow(); const city = currentCity();
    const r = ramadan(civil);
    let out = pageHeader(t('nav.ramadan'), r.active ? esc(t('ramadan.dayOf', { n: r.dayNo, total: r.total })) : '', '', 'more');
    if (r.active) {
      const ph = phase(Date.now(), city); const T = KosovoPrayerService.day(civil, city).times;
      out += `<section class="hero p-5 lg:p-7 mb-5" aria-live="off">
        <div class="flex items-center justify-between"><p class="eyebrow">${esc(t('ramadan.fasting'))}</p><span class="badge badge-current" data-bind="phase">${esc(t('ramadan.ph.' + ph.id))}</span></div>
        <p class="text-sm text-muted mt-5" data-bind="lbl">${esc(t(ph.id === 'active' ? 'ramadan.untilIftar' : 'ramadan.untilSyfyrEnd'))}</p>
        <p class="text-5xl font-semibold tabular-nums tracking-tight mt-1" data-bind="cd">--:--:--</p>
        <div class="grid grid-cols-2 gap-3 mt-6">
          <div class="card p-4 bg-surface/60"><p class="text-xs text-muted uppercase tracking-wider">${esc(t('ramadan.syfyr'))}</p><p class="text-2xl font-semibold tabular-nums mt-1">${fmtTime(T.imsak)}</p><p class="text-xs text-muted mt-1">${esc(t('ramadan.syfyrHelp'))}</p></div>
          <div class="card p-4 bg-surface/60"><p class="text-xs text-muted uppercase tracking-wider">${esc(t('ramadan.iftar'))}</p><p class="text-2xl font-semibold tabular-nums mt-1">${fmtTime(T.maghrib)}</p><p class="text-xs text-muted mt-1">${esc(t('ramadan.iftarHelp'))}</p></div></div>
        <div class="mt-5 flex flex-wrap items-center gap-3"><button class="btn btn-ghost" data-a="ramadan-share">${icon('share-2', 'w-4 h-4')}${esc(t('common.share'))}</button>
          <p class="text-xs text-muted">${esc(r.estimated ? t('ramadan.estimated') : t('ramadan.official'))}</p></div></section>
        <h2 class="font-semibold mb-3">${esc(t('ramadan.calendar'))}</h2>${table(r.start, r.total, city, civil, r.estimated)}`;
    } else {
      const nx = nextRamadan(civil);
      out += `<section class="card p-6 mb-5 flex flex-col gap-2" role="status"><span class="text-accent">${icon('moon-star', 'w-7 h-7')}</span>
        <h2 class="text-xl font-semibold">${esc(t('ramadan.inactiveTitle'))}</h2>
        ${nx ? `<p class="text-muted">${esc(t('ramadan.startsOn', { date: fmtDate(nx.start, lang(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), n: daysBetween(civil, nx.start) }))}</p>
        <p class="text-xs text-muted">${esc(nx.estimated ? t('ramadan.estimated') : t('ramadan.official'))}</p>` : `<p class="text-muted">${esc(hijriSupported ? '' : t('ramadan.noCalendar'))}</p>`}</section>
        ${nx ? `<h2 class="font-semibold mb-1">${esc(t('ramadan.preview'))}</h2><p class="text-sm text-muted mb-3">${esc(t('ramadan.previewHelp'))}</p>${table(nx.start, 30, city, null, true)}` : ''}`;
    }
    return out;
  },
  mount(root) {
    const el = root.querySelector('[data-bind="cd"]'); if (!el) return null;
    return clock.subscribe((now) => {
      const ph = phase(now, currentCity());
      el.textContent = fmtHMS(ph.target - now);
      const l = root.querySelector('[data-bind="lbl"]'), p = root.querySelector('[data-bind="phase"]');
      const lt = t(ph.id === 'active' ? 'ramadan.untilIftar' : 'ramadan.untilSyfyrEnd'), pt = t('ramadan.ph.' + ph.id);
      if (l && l.textContent !== lt) l.textContent = lt; if (p && p.textContent !== pt) p.textContent = pt;
    });
  }
};

actions['ramadan-share'] = () => {
  const civil = civilNow(); const city = currentCity(); const r = ramadan(civil); const T = KosovoPrayerService.day(civil, city).times;
  share({ title: 'Vakt', text: t('ramadan.shareText', { n: r.dayNo, city: city.name, syfyr: fmtTime(T.imsak), iftar: fmtTime(T.maghrib) }) });
};
