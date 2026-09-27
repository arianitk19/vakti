// NewsService — real, live Islamic articles from around the world: actual hadith explanations,
// actual Islamic-history/seerah pieces, actual Muslim-world news — not generic interfaith news.
// Frontend-only: no backend, no API key. Reads real public RSS feeds from named Islamic outlets,
// through CORS-friendly public proxies (the feeds themselves don't send CORS headers).
// Nothing is invented: every item is a real article with a real link back to its source.
// If every source is unreachable, the UI shows an honest error — never placeholder "news".
import { idb } from './storageService.js';

const CACHE_KEY = 'news:cache';
const TTL_MS = 25 * 60 * 1000; // real "live-ish" refresh window, not pretend real-time

// Three real, named Islamic sources, each covering one of the kinds the reader actually wants:
// a hadith explained, a piece of Islamic history/seerah, real news from the Muslim world.
const FEEDS = [
  { id: 'hadith', name: 'AboutIslam — Hadith', url: 'https://aboutislam.net/tag/hadith/feed/', lang: 'en', kind: 'hadith' },
  { id: 'seerah', name: 'AboutIslam — Seerah', url: 'https://aboutislam.net/tag/seerah/feed/', lang: 'en', kind: 'history' },
  { id: 'ummah', name: 'MuslimMatters', url: 'https://muslimmatters.org/feed/', lang: 'en', kind: 'news' }
];

// Tried in order; the first that returns usable data for a feed wins. Having more than one
// keeps the feature working if a single proxy is down or rate-limited — never a fake fallback,
// just a different real path to the same real feed.
const JSON_PROXY = (url) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=20`;
const RAW_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
];

const stripHtml = (s = '') => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const clamp = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

function normalizeItem(raw, feed) {
  const title = stripHtml(raw.title || '');
  const link = raw.link || raw.url || '';
  if (!title || !/^https?:\/\//.test(link)) return null;
  const summary = clamp(stripHtml(raw.description || raw.summary || raw.content || ''), 220);
  const t = Date.parse(raw.pubDate || raw.published || raw.isoDate || '');
  return { id: `${feed.id}:${link}`, title, link, summary, source: feed.name, sourceLang: feed.lang, kind: feed.kind, published: Number.isFinite(t) ? new Date(t).toISOString() : null };
}

async function viaJsonProxy(feed, signal) {
  const r = await fetch(JSON_PROXY(feed.url), { signal });
  if (!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  if (j.status !== 'ok' || !Array.isArray(j.items)) throw new Error('bad payload');
  return j.items.map((it) => normalizeItem(it, feed)).filter(Boolean);
}

function parseRssXml(xmlText, feed) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('xml parse');
  const nodes = [...doc.querySelectorAll('item')];
  if (!nodes.length) throw new Error('no items');
  return nodes.map((n) => {
    const get = (sel) => n.querySelector(sel)?.textContent?.trim() || '';
    return normalizeItem({ title: get('title'), link: get('link'), description: get('description'), pubDate: get('pubDate') }, feed);
  }).filter(Boolean);
}

async function viaRawProxy(feed, signal) {
  let lastErr;
  for (const build of RAW_PROXIES) {
    try {
      const r = await fetch(build(feed.url), { signal });
      if (!r.ok) throw new Error('http ' + r.status);
      const text = await r.text();
      const items = parseRssXml(text, feed);
      if (items.length) return items;
      throw new Error('empty');
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('all raw proxies failed');
}

async function fetchOneFeed(feed, signal) {
  try { return await viaJsonProxy(feed, signal); }
  catch { /* fall through to a raw-XML path */ }
  return viaRawProxy(feed, signal);
}

async function fetchAllLive(timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const settled = await Promise.allSettled(FEEDS.map((f) => fetchOneFeed(f, ctrl.signal)));
    const items = settled.filter((s) => s.status === 'fulfilled').flatMap((s) => s.value);
    const anyOk = settled.some((s) => s.status === 'fulfilled');
    if (!anyOk) return { ok: false, reason: 'unreachable' };
    const seen = new Set();
    const merged = items.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)))
      .sort((a, b) => (b.published || '').localeCompare(a.published || ''));
    return { ok: true, items: merged, sourcesOk: settled.filter((s) => s.status === 'fulfilled').length, sourcesTotal: FEEDS.length };
  } finally { clearTimeout(timer); }
}

export const news = {
  sources: FEEDS.map((f) => ({ name: f.name, url: f.url })),
  /** Returns { ok, items, updatedAt, stale, reason }. Cache-first-if-fresh, otherwise a real network fetch. */
  async getArticles({ force = false } = {}) {
    const cached = await idb.get(CACHE_KEY);
    const fresh = cached && Date.now() - Date.parse(cached.updatedAt) < TTL_MS;
    if (!navigator.onLine) return cached ? { ok: true, items: cached.items, updatedAt: cached.updatedAt, stale: true } : { ok: false, reason: 'offline' };
    if (fresh && !force) return { ok: true, items: cached.items, updatedAt: cached.updatedAt, stale: false };
    try {
      const r = await fetchAllLive();
      if (!r.ok) throw new Error(r.reason);
      const updatedAt = new Date().toISOString();
      await idb.set(CACHE_KEY, { items: r.items, updatedAt });
      return { ok: true, items: r.items, updatedAt, stale: false, sourcesOk: r.sourcesOk, sourcesTotal: r.sourcesTotal };
    } catch {
      if (cached) return { ok: true, items: cached.items, updatedAt: cached.updatedAt, stale: true };
      return { ok: false, reason: 'unreachable' };
    }
  }
};
