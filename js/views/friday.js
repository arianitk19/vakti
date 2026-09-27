import { esc, icon } from '../utils/dom.js';
import { t, lang } from '../i18n/index.js';
import { store } from '../core/store.js';
import { actions, changes } from '../core/actions.js';
import { pageHeader } from '../components/common.js';
import { content } from '../services/contentService.js';
import { KosovoPrayerService } from '../services/kosovoPrayerService.js';
import { currentCity } from '../services/locationService.js';
import { fmtTime, fmtDate, kosovoParts, addDays } from '../utils/tz.js';
import { readerBlock } from '../components/textBlock.js';
import { reschedule, permission, request } from '../services/notificationService.js';
import { toast } from '../components/ui.js';

const FACTS = [
  ['best', 'Muslimi 854'], ['ghusl', 'Buhariu 877; Muslimi 846'], ['salawat', 'Ebu Davudi 1047'],
  ['hour', 'Buhariu 935; Muslimi 852'], ['kahf', 'el-Hakimi 2/368; Bejhakiu']
];

export const friday = {
  title: 'nav.friday',
  async render() {
    const p = kosovoParts(); const city = currentCity();
    const daysTo = (5 - p.wd + 7) % 7;
    const fri = addDays(p, daysTo);
    const dh = KosovoPrayerService.day(fri, city).times.dhuhr;
    let salavat = null; try { salavat = (await content.dhikr()).items.find((d) => d.id === 'dhikr-salavat'); } catch { /* optional */ }
    const ft = store.get('fridayTime');
    const remind = store.get('notif').fridayRemind;
    return pageHeader(t('nav.friday'), esc(t('friday.sub')), '', 'more') + `
      <section class="hero p-5 lg:p-7 mb-5"><p class="eyebrow">${esc(daysTo === 0 ? t('friday.todayTitle') : t('friday.next'))}</p>
        <p class="text-2xl font-semibold mt-2">${esc(fmtDate(fri, lang(), { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
        <p class="text-muted mt-1 text-sm">${daysTo === 0 ? esc(t('home.today')) : esc(t('home.inDays', { n: daysTo }))}</p>
        <div class="grid sm:grid-cols-2 gap-3 mt-5">
          <div class="card p-4 bg-surface/60"><p class="text-xs text-muted uppercase tracking-wider">${esc(t('friday.dhuhrStarts'))}</p><p class="text-2xl font-semibold tabular-nums mt-1">${fmtTime(dh)}</p><p class="text-xs text-muted mt-1">${esc(t('friday.localNote'))}</p></div>
          <div class="card p-4 bg-surface/60"><label class="text-xs text-muted uppercase tracking-wider" for="ft">${esc(t('friday.myMosque'))}</label>
            <input id="ft" type="time" class="input mt-1 tabular-nums" value="${esc(ft)}" data-ch="friday-time"><p class="text-xs text-muted mt-1">${esc(t('friday.myMosqueHelp'))}</p></div></div>
        <label class="flex items-center justify-between gap-3 mt-4 min-h-[44px]"><span class="text-sm">${esc(t('friday.remind'))}<span class="block text-xs text-muted">${esc(t('friday.remindHelp'))}</span></span>
          <input type="checkbox" class="switch" data-ch="friday-remind" ${remind ? 'checked' : ''} ${ft ? '' : 'disabled'}></label></section>
      <h2 class="font-semibold mb-3">${esc(t('friday.recs'))}</h2>
      <ul class="grid gap-3 md:grid-cols-2 mb-6">${FACTS.map(([k, src]) => `<li class="card p-4"><p class="leading-relaxed">${esc(t('friday.f.' + k))}</p><p class="text-xs text-muted mt-2 flex gap-2">${icon('book-open', 'w-3.5 h-3.5 mt-0.5')}${esc(t('common.source'))}: ${esc(src)}</p></li>`).join('')}</ul>
      <div class="grid gap-3 md:grid-cols-2 mb-6">
        <a href="#duas" class="card card-link p-5 flex items-center gap-4"><span class="text-accent">${icon('hand-heart', 'w-6 h-6')}</span><span class="flex-1"><span class="block font-semibold">${esc(t('nav.duas'))}</span><span class="text-sm text-muted">${esc(t('friday.duaHelp'))}</span></span>${icon('chevron-right', 'w-4 h-4')}</a></div>
      ${salavat ? `<h2 class="font-semibold mb-3">${esc(t('friday.salawatTitle'))}</h2><article class="card p-5 lg:p-6">${readerBlock(salavat)}</article>` : ''}
      <p class="text-xs text-muted mt-6 leading-relaxed">${esc(t('friday.disclaimer'))}</p>`;
  }
};

changes['friday-time'] = (el) => {
  store.set('fridayTime', el.value);
  const sw = document.querySelector('[data-ch="friday-remind"]'); if (sw) { sw.disabled = !el.value; if (!el.value) { sw.checked = false; store.patch('notif', { fridayRemind: false }); } }
  reschedule();
};
changes['friday-remind'] = async (el) => {
  if (el.checked) {
    if (permission() === 'default') await request();
    if (permission() !== 'granted') { el.checked = false; toast(t('notif.denied')); return; }
    store.patch('notif', { enabled: true, fridayRemind: true });
  } else store.patch('notif', { fridayRemind: false });
  reschedule();
};
