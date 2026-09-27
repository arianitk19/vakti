// Global search: pages, settings, prayers, duas, dhikr, lectures — all local.
import { esc, icon, norm, debounce } from '../utils/dom.js';
import { t } from '../i18n/index.js';
import { content } from '../services/contentService.js';
import { Sheet } from './ui.js';
import { navigate } from '../core/router.js';

let idx = null, lastLang = '';
async function build() {
  const [duas, dhikr, lecs] = await Promise.all([content.duas().catch(() => ({ items: [] })), content.dhikr().catch(() => ({ items: [] })), content.lectures().catch(() => [])]);
  const out = [];
  const pages = [['home', 'house'], ['prayers', 'clock'], ['qibla', 'compass'], ['duas', 'hand-heart'], ['dhikr', 'repeat'], ['lectures', 'headphones'], ['ramadan', 'moon-star'], ['friday', 'calendar-check'], ['saved', 'bookmark'], ['stats', 'chart-column'], ['articles', 'newspaper'], ['settings', 'settings']];
  pages.forEach(([id, ic]) => out.push({ g: 'search.features', ic, title: t('nav.' + id), sub: ['qibla', 'dhikr', 'ramadan', 'friday', 'saved', 'stats', 'articles', 'settings'].includes(id) ? t('more.d.' + id) : '', href: id, k: norm(t('nav.' + id) + ' ' + id) }));
  out.push({ g: 'search.features', ic: 'repeat', title: t('nav.tasbih'), href: 'dhikr/tasbih', k: norm(t('nav.tasbih') + ' tasbih counter') });
  ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'imsak'].forEach((k) => out.push({ g: 'search.prayers', ic: 'clock', title: t('prayer.' + k), href: 'prayers', k: norm(t('prayer.' + k) + ' namaz prayer ' + k) }));
  ['appearance', 'language', 'location', 'prayer', 'notifications', 'accessibility', 'data', 'install'].forEach((s) => out.push({ g: 'search.settings', ic: 'settings', title: t(s === 'install' ? 'install.title' : 'set.' + s), href: 'settings/' + s, k: norm(t(s === 'install' ? 'install.title' : 'set.' + s) + ' ' + s) }));
  duas.items.forEach((d) => out.push({ g: 'nav.duas', ic: 'hand-heart', title: d.title, sub: d.translation, href: 'duas/item/' + d.id, k: norm(d.title + ' ' + d.translation + ' ' + d.transliteration + ' ' + d.cats.map((c) => t('dcat.' + c)).join(' ')) }));
  dhikr.items.forEach((d) => out.push({ g: 'nav.dhikr', ic: 'repeat', title: d.title, sub: d.translation, href: 'dhikr', k: norm(d.title + ' ' + d.translation + ' ' + d.transliteration + ' ' + d.cats.map((c) => t('dcat.' + c)).join(' ')) }));
  lecs.forEach((l) => out.push({ g: 'nav.lectures', ic: 'headphones', title: l.title, sub: l.speaker, href: 'lectures', k: norm(l.title + ' ' + l.speaker + ' ' + t('lcat.' + l.category)) }));
  return out;
}

export async function openSearch() {
  const L = document.documentElement.lang;
  if (!idx || lastLang !== L) { idx = await build(); lastLang = L; }
  Sheet.open({ title: t('search.title'), wide: true, html: `
    <label class="search-box mb-3">${icon('search', 'w-5 h-5 text-muted')}<input type="search" data-autofocus class="flex-1 bg-transparent outline-none" placeholder="${esc(t('search.placeholder'))}" aria-label="${esc(t('search.placeholder'))}" autocomplete="off"></label>
    <div data-results class="min-h-[240px]" role="listbox" aria-label="${esc(t('search.title'))}"></div>`,
  mount: (b, api) => {
    const input = b.querySelector('input'), res = b.querySelector('[data-results]');
    const render = () => {
      const q = norm(input.value);
      const hits = (q ? idx.filter((x) => q.split(/\s+/).every((w) => x.k.includes(w))) : idx.filter((x) => x.g === 'search.features')).slice(0, 40);
      if (!hits.length) { res.innerHTML = `<p class="text-center text-muted py-10 text-sm">${esc(t('search.none'))}</p>`; return; }
      const groups = {}; hits.forEach((h) => (groups[h.g] ||= []).push(h));
      res.innerHTML = Object.entries(groups).map(([g, l]) => `<p class="text-xs uppercase tracking-wider text-muted mt-3 mb-1">${esc(t(g))}</p>${l.map((h) => `<a role="option" href="#${h.href}" class="flex items-center gap-3 rounded-xl px-3 min-h-[48px] hover:bg-accent-soft focus:bg-accent-soft outline-none" data-go="${esc(h.href)}"><span class="text-accent">${icon(h.ic, 'w-5 h-5')}</span><span class="min-w-0"><span class="block truncate font-medium">${esc(h.title)}</span>${h.sub ? `<span class="block truncate text-xs text-muted">${esc(h.sub)}</span>` : ''}</span></a>`).join('')}`).join('');
    };
    input.addEventListener('input', debounce(render, 60));
    input.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); res.querySelector('a')?.focus(); } });
    res.addEventListener('keydown', (e) => {
      const links = [...res.querySelectorAll('a')]; const i = links.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); links[Math.min(i + 1, links.length - 1)]?.focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); i <= 0 ? input.focus() : links[i - 1].focus(); }
    });
    res.addEventListener('click', (e) => { if (e.target.closest('[data-go]')) api.close(); });
    render();
  } });
}
