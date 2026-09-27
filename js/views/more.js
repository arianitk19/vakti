import { esc, icon } from '../utils/dom.js';
import { t } from '../i18n/index.js';
import { pageHeader } from '../components/common.js';

export const MORE_ITEMS = [
  ['qibla', 'compass'], ['dhikr', 'repeat'], ['ramadan', 'moon-star'],
  ['friday', 'calendar-check'], ['saved', 'bookmark'], ['stats', 'chart-column'], ['articles', 'newspaper'], ['settings', 'settings']
];

export const more = {
  title: 'nav.more',
  render() {
    return pageHeader(t('nav.more'), esc(t('more.sub'))) + `<ul class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">${MORE_ITEMS.map(([id, ic]) => `
      <li><a href="#${id}" class="card card-link p-4 flex flex-col gap-3 min-h-[112px] justify-between"><span class="grid place-items-center h-11 w-11 rounded-full bg-accent-soft text-accent">${icon(ic, 'w-5 h-5')}</span>
        <span><span class="block font-semibold leading-tight">${esc(t('nav.' + id))}</span><span class="block text-xs text-muted mt-0.5">${esc(t('more.d.' + id))}</span></span></a></li>`).join('')}</ul>`;
  }
};
