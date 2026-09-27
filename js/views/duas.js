import { esc, icon, norm } from '../utils/dom.js';
import { t } from '../i18n/index.js';
import { store } from '../core/store.js';
import { actions, inputs } from '../core/actions.js';
import { content } from '../services/contentService.js';
import { pageHeader, emptyState, loadingState, errorState } from '../components/common.js';
import { readerBlock, readerControls, itemActions } from '../components/textBlock.js';
import { kosovoParts, daysBetween } from '../utils/tz.js';

const CAT_ICON = { after_prayer: 'circle-check', morning: 'sunrise', evening: 'sunset', sleep: 'moon', before_food: 'circle-dot', after_food: 'circle-check', travel: 'navigation', protection: 'shield-check', gratitude: 'heart', repentance: 'refresh-cw', hardship: 'hand-heart', parents: 'user', family: 'heart', general: 'book-open' };

const card = (d) => `<li><a class="card card-link p-4 flex flex-col gap-2" href="#duas/item/${esc(d.id)}">
  <h3 class="font-semibold">${esc(d.title)}</h3>
  <p class="arabic text-xl leading-loose line-clamp-1" dir="rtl" lang="ar">${esc(d.arabic)}</p>
  <p class="text-sm text-muted line-clamp-2">${esc(d.translation)}</p></a></li>`;

function main(data) {
  const p = kosovoParts(); const doy = daysBetween({ y: p.y, m: 1, d: 1 }, p);
  const daily = data.items[doy % data.items.length];
  const cats = data.categories.map((c) => {
    const n = data.items.filter((d) => d.cats.includes(c)).length;
    return `<li><a href="#duas/cat/${c}" class="card card-link p-4 flex items-center gap-3 min-h-[68px]">
      <span class="grid place-items-center h-10 w-10 rounded-full bg-accent-soft text-accent shrink-0">${icon(CAT_ICON[c] || 'book-open', 'w-5 h-5')}</span>
      <span class="flex-1 min-w-0"><span class="block font-medium leading-tight">${esc(t('dcat.' + c))}</span><span class="text-xs text-muted">${n}</span></span>${icon('chevron-right', 'w-4 h-4 text-muted')}</a></li>`;
  }).join('');
  return `<label class="search-box mb-5">${icon('search', 'w-5 h-5 text-muted')}<input type="search" class="flex-1 bg-transparent outline-none" placeholder="${esc(t('duas.search'))}" data-in="dua-search" aria-label="${esc(t('duas.search'))}"></label>
    <div id="duas-body">
      <a href="#duas/item/${esc(daily.id)}" class="hero p-5 lg:p-6 block mb-6"><p class="eyebrow">${esc(t('home.dua'))}</p><h2 class="text-xl font-semibold mt-2">${esc(daily.title)}</h2>
        <p class="arabic text-3xl leading-loose mt-3 line-clamp-2" dir="rtl" lang="ar">${esc(daily.arabic)}</p><p class="text-sm text-muted mt-2 line-clamp-2">${esc(daily.translation)}</p></a>
      <h2 class="font-semibold mb-3">${esc(t('duas.categories'))}</h2>
      <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">${cats}</ul>
      <p class="text-xs text-muted mt-6 leading-relaxed">${esc(t('duas.disclaimer'))}</p></div>`;
}

function list(data, cat) {
  const items = data.items.filter((d) => d.cats.includes(cat));
  return pageHeader(t('dcat.' + cat), esc(t('duas.count', { n: items.length })), '', 'duas') + `<ul class="grid gap-3 lg:grid-cols-2">${items.map(card).join('')}</ul>`;
}

function detail(data, id, cat) {
  const i = data.items.findIndex((d) => d.id === id);
  if (i < 0) return emptyState({ ic: 'search', title: t('duas.notFound'), action: `<a class="btn btn-primary" href="#duas">${esc(t('common.back'))}</a>` });
  const d = data.items[i];
  const catId = cat || d.cats[0];
  const sibs = data.items.filter((x) => x.cats.includes(catId));
  const si = sibs.findIndex((x) => x.id === id);
  const prev = sibs[si - 1], next = sibs[si + 1];
  return `<div data-reader-root class="max-w-3xl mx-auto">
    <div class="flex items-center gap-2 mb-4"><a href="#duas/cat/${catId}" class="btn-icon -ml-2" aria-label="${esc(t('common.back'))}">${icon('chevron-left')}</a>
      <span class="text-sm text-muted flex-1">${esc(t('dcat.' + catId))}</span>${itemActions('duas', d.id)}</div>
    <article class="card p-5 lg:p-8">
      <div class="flex items-start justify-between gap-3 mb-6"><h1 class="text-xl lg:text-2xl font-bold tracking-tight">${esc(d.title)}</h1></div>
      ${d.count ? `<p class="badge badge-upcoming mb-4">${icon('repeat', 'w-3.5 h-3.5')}${esc(t('duas.repeat', { n: d.count }))}</p>` : ''}
      <div data-reader>${readerBlock(d)}</div>
      <div class="mt-6 pt-4 border-t border-line/60" data-reader-controls>${readerControls()}</div>
    </article>
    <nav class="mt-4 flex justify-between gap-3" aria-label="${esc(t('duas.nav'))}">
      ${prev ? `<a class="btn btn-ghost" href="#duas/item/${esc(prev.id)}/${catId}">${icon('chevron-left', 'w-4 h-4')}${esc(t('common.prev'))}</a>` : '<span></span>'}
      ${next ? `<a class="btn btn-ghost" href="#duas/item/${esc(next.id)}/${catId}">${esc(t('common.next'))}${icon('chevron-right', 'w-4 h-4')}</a>` : ''}</nav></div>`;
}

let data = null;
export const duas = {
  title: 'nav.duas',
  async render(route) {
    try { data ||= await content.duas(); } catch { return pageHeader(t('nav.duas')) + errorState(t('err.content')); }
    const [a, b, c] = route.params;
    if (a === 'cat' && b) return list(data, b);
    if (a === 'item' && b) return detail(data, b, c);
    return pageHeader(t('nav.duas'), esc(t('duas.sub'))) + main(data);
  },
  mount(root) {
    const rebuild = () => { const r = root.querySelector('[data-reader]'); const id = location.hash.split('/')[2]; const d = data?.items.find((x) => x.id === id); if (r && d) r.innerHTML = readerBlock(d); };
    document.addEventListener('reader-rebuild', rebuild);
    return () => document.removeEventListener('reader-rebuild', rebuild);
  }
};

inputs['dua-search'] = (el) => {
  const q = norm(el.value); const body = document.getElementById('duas-body'); if (!body || !data) return;
  if (!q) { body.innerHTML = main(data).split('<div id="duas-body">')[1].slice(0, -6); return; }
  const r = data.items.filter((d) => norm(d.title + ' ' + d.translation + ' ' + d.transliteration + ' ' + t('dcat.' + d.cats[0])).includes(q));
  body.innerHTML = r.length ? `<ul class="grid gap-3 lg:grid-cols-2">${r.map(card).join('')}</ul>` : emptyState({ ic: 'search', title: t('duas.noResults'), text: esc(t('duas.noResultsText')) });
};
