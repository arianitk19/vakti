import { esc, icon } from '../utils/dom.js';
import { t } from '../i18n/index.js';
import { pageHeader, emptyState } from '../components/common.js';
import { content } from '../services/contentService.js';
import { favorites } from '../services/personalService.js';

export const saved = {
  title: 'nav.saved',
  async render() {
    const fav = favorites.all();
    const [duas, dhikr, lecs] = await Promise.all([content.duas().catch(() => ({ items: [] })), content.dhikr().catch(() => ({ items: [] })), content.lectures().catch(() => [])]);
    const sec = (title, rows) => rows.length ? `<section class="mb-6"><h2 class="font-semibold mb-3">${esc(title)}</h2><ul class="grid gap-2 md:grid-cols-2">${rows.join('')}</ul></section>` : '';
    const link = (href, ic, main, sub) => `<li><a class="card card-link p-4 flex items-center gap-3" href="${href}"><span class="text-accent">${icon(ic, 'w-5 h-5')}</span><span class="flex-1 min-w-0"><span class="block font-medium truncate">${esc(main)}</span>${sub ? `<span class="block text-xs text-muted truncate">${esc(sub)}</span>` : ''}</span>${icon('chevron-right', 'w-4 h-4 text-muted')}</a></li>`;
    const d = fav.duas.map((id) => duas.items.find((x) => x.id === id)).filter(Boolean).map((x) => link('#duas/item/' + x.id, 'hand-heart', x.title, x.translation));
    const k = fav.dhikr.map((id) => dhikr.items.find((x) => x.id === id)).filter(Boolean).map((x) => link('#dhikr', 'repeat', x.title, x.translation));
    const l = fav.lectures.map((id) => lecs.find((x) => x.id === id)).filter(Boolean).map((x) => link('#lectures', 'headphones', x.title, x.speaker));
    const total = d.length + k.length + l.length;
    return pageHeader(t('nav.saved'), esc(t('saved.sub')), '', 'more') + (total ? sec(t('nav.duas'), d) + sec(t('nav.dhikr'), k) + sec(t('nav.lectures'), l)
      : emptyState({ ic: 'bookmark', title: t('saved.emptyTitle'), text: esc(t('saved.emptyText')), action: `<a class="btn btn-primary" href="#duas">${esc(t('nav.duas'))}</a>` }));
  }
};
