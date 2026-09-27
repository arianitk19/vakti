// Articles ("Artikuj") — real, live Islamic content from around the world: a hadith explained,
// a piece of Islamic history/seerah, real news from the Muslim world. Not generic interfaith news.
// It reads real RSS feeds from named Islamic outlets and links straight back to their original
// articles. Nothing here is written, translated or summarised by Vakt — titles/summaries are
// exactly what the source published.
import { esc, icon } from '../utils/dom.js';
import { t, lang } from '../i18n/index.js';
import { actions } from '../core/actions.js';
import { news } from '../services/newsService.js';
import { pageHeader, loadingState, errorState, emptyState, chips } from '../components/common.js';
import { kosovoParts, fmtDate, fmtTime } from '../utils/tz.js';

let state = { phase: 'loading' }; // 'loading' | 'ok' | 'error'
let kindFilter = 'all';

const KIND_META = {
  hadith: { ic: 'book-heart', key: 'articles.kind.hadith' },
  history: { ic: 'history', key: 'articles.kind.history' },
  news: { ic: 'newspaper', key: 'articles.kind.news' }
};
const KIND_ORDER = ['news', 'hadith', 'history'];

function whenText(iso) {
  if (!iso) return '';
  const p = kosovoParts(Date.parse(iso));
  return `${fmtDate(p, lang(), { day: 'numeric', month: 'short', year: 'numeric' })} · ${fmtTime(Date.parse(iso))}`;
}

function card(a) {
  const km = KIND_META[a.kind];
  return `<li class="card p-4">
    <div class="flex items-center gap-2 mb-2 flex-wrap">
      ${km ? `<span class="badge badge-current">${icon(km.ic, 'w-3 h-3')}${esc(t(km.key))}</span>` : ''}
      <span class="badge badge-upcoming">${icon('globe', 'w-3 h-3')}${esc(a.source)}</span>
      ${a.published ? `<span class="text-xs text-muted">${esc(whenText(a.published))}</span>` : ''}</div>
    <a class="font-semibold leading-snug hover:underline" href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">${esc(a.title)}</a>
    ${a.summary ? `<p class="text-sm text-muted mt-2 leading-relaxed">${esc(a.summary)}</p>` : ''}
    <a class="inline-flex items-center gap-1.5 text-sm text-accent mt-3" href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">${icon('external-link', 'w-3.5 h-3.5')}${esc(t('articles.open'))}</a>
  </li>`;
}

function sourceLinks() {
  return `<ul class="grid gap-2 mt-3">${news.sources.map((s) => `<li><a class="inline-flex items-center gap-1.5 text-sm text-accent" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${icon('external-link', 'w-3.5 h-3.5')}${esc(s.name)}</a></li>`).join('')}</ul>`;
}

function byDateDesc(a, b) { return (b.published || '').localeCompare(a.published || ''); }

function grouped() {
  const by = { news: [], hadith: [], history: [] };
  state.items.forEach((a) => { if (by[a.kind]) by[a.kind].push(a); });
  Object.values(by).forEach((l) => l.sort(byDateDesc));
  return by;
}

function sections() {
  const by = grouped();
  const kinds = kindFilter === 'all' ? KIND_ORDER : [kindFilter];
  const cap = kindFilter === 'all' ? 6 : 30;
  const html = kinds.map((k) => {
    const items = by[k].slice(0, cap);
    if (!items.length) return '';
    const km = KIND_META[k];
    return `<section class="mb-6"><h2 class="font-semibold mb-3 flex items-center gap-2">${icon(km.ic, 'w-4 h-4 text-accent')}${esc(t(km.key))}</h2>
      <ul class="grid gap-3 lg:grid-cols-2">${items.map(card).join('')}</ul></section>`;
  }).join('');
  return html || emptyState({ ic: 'newspaper', title: t('articles.emptyTitle'), text: esc(t('articles.emptyText')) });
}

function body() {
  if (state.phase === 'loading') return loadingState(t('articles.loading'));
  if (state.phase === 'error') {
    const msg = state.reason === 'offline' ? t('articles.offline') : t('articles.unreachable');
    return errorState(esc(msg) + ` <span class="block mt-2 text-xs text-muted">${esc(t('articles.tryDirect'))}</span>${sourceLinks()}`, 'articles-retry');
  }
  if (!state.items.length) return emptyState({ ic: 'newspaper', title: t('articles.emptyTitle'), text: esc(t('articles.emptyText')) });
  return `${state.stale ? `<p class="text-xs text-muted mb-3 flex items-center gap-1.5">${icon('wifi-off', 'w-3.5 h-3.5')}${esc(t('articles.stale'))}</p>` : ''}
    <div class="mb-5">${chips([{ id: 'all', label: t('articles.all') }, ...KIND_ORDER.map((k) => ({ id: k, label: t(KIND_META[k].key) }))], kindFilter, 'art-kind')}</div>
    <div id="art-sections">${sections()}</div>`;
}

const repaint = () => { const b = document.getElementById('art-body'); if (b) b.innerHTML = body(); };
const meta = () => { const m = document.getElementById('art-meta'); if (m) m.textContent = state.phase === 'ok' && !state.stale ? t('articles.updated', { time: whenText(state.updatedAt) }) : ''; };

async function load(force = false) {
  state = { phase: 'loading' };
  repaint(); meta();
  const r = await news.getArticles({ force });
  state = r.ok ? { phase: 'ok', items: r.items, updatedAt: r.updatedAt, stale: !!r.stale } : { phase: 'error', reason: r.reason };
  repaint(); meta();
}

export const articles = {
  title: 'nav.articles',
  render() {
    const refresh = `<button class="btn btn-ghost" data-a="articles-retry" aria-label="${esc(t('common.retry'))}">${icon('refresh-cw', 'w-4 h-4')}<span class="hidden sm:inline">${esc(t('common.retry'))}</span></button>`;
    return pageHeader(t('nav.articles'), esc(t('articles.sub')), refresh, 'more') +
      `<p id="art-meta" class="text-xs text-muted mb-4" role="status"></p>
       <div id="art-body">${loadingState(t('articles.loading'))}</div>
       <p class="text-xs text-muted mt-8 leading-relaxed">${esc(t('articles.disclaimer'))}</p>`;
  },
  mount() {
    kindFilter = 'all';
    load(false);
    return () => { state = { phase: 'loading' }; };
  }
};

actions['articles-retry'] = () => load(true);
actions['art-kind'] = (el) => { kindFilter = el.dataset.v; repaint(); };
