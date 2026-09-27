// App shell: brand, sidebar (desktop), bottom navigation (mobile), top bar.
import { $, esc, icon } from '../utils/dom.js';
import { t } from '../i18n/index.js';

export const logoSVG = (cls = '') => `<svg class="${cls}" viewBox="0 0 64 64" role="img" aria-label="Vakt"><rect width="64" height="64" rx="16" fill="var(--logo-bg,#0F172A)"/>
  <path d="M14 43a18 18 0 0 1 36 0" fill="none" stroke="var(--logo-arc,#B7B0FF)" stroke-width="4" stroke-linecap="round"/>
  <path d="M10 48h44" stroke="var(--logo-arc,#B7B0FF)" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>
  <circle cx="41.5" cy="27.5" r="4.2" fill="#F4C27A"/></svg>`;

const SIDE = [
  ['home', 'house'], ['prayers', 'clock'], ['qibla', 'compass'], ['duas', 'hand-heart'], ['dhikr', 'repeat'], ['lectures', 'headphones'],
  ['ramadan', 'moon-star'], ['friday', 'calendar-check'], ['saved', 'bookmark'], ['stats', 'chart-column'], ['articles', 'newspaper'], ['settings', 'settings']
];
const BOTTOM = [['home', 'house'], ['prayers', 'clock'], ['duas', 'hand-heart'], ['lectures', 'headphones'], ['more', 'layout-grid']];
const MORE_GROUP = new Set(['qibla', 'dhikr', 'ramadan', 'friday', 'saved', 'stats', 'articles', 'settings', 'more']);
export const navGroup = (name) => (MORE_GROUP.has(name) ? 'more' : name);

export function renderShell() {
  $('#sidebar').innerHTML = `
    <a href="#home" class="flex items-center gap-3 px-3 mb-6" aria-label="Vakt — ${esc(t('nav.home'))}"><span class="w-9 h-9">${logoSVG('w-9 h-9')}</span><span class="text-xl font-bold tracking-tight">Vakt</span></a>
    <nav aria-label="${esc(t('nav.main'))}" class="flex flex-col gap-0.5 flex-1">${SIDE.map(([id, ic]) => `<a href="#${id}" class="side-i" data-nav="${id}">${icon(ic, 'w-[18px] h-[18px]')}<span>${esc(t('nav.' + id))}</span></a>`).join('')}</nav>
    <p class="px-3 text-xs text-muted">${esc(t('common.kosovo'))} · <span data-net-label></span></p>`;
  $('#bottomnav').innerHTML = `<div class="flex">${BOTTOM.map(([id, ic]) => `<a href="#${id}" class="bn-i" data-bn="${id}">${icon(ic, 'w-[22px] h-[22px]')}<span>${esc(t('nav.' + id))}</span></a>`).join('')}</div>`;
  $('#topbar').innerHTML = `
    <a href="#home" class="lg:hidden flex items-center gap-2" aria-label="Vakt"><span class="w-8 h-8">${logoSVG('w-8 h-8')}</span><span class="font-bold tracking-tight text-lg">Vakt</span></a>
    <div class="flex-1"></div>
    <span id="net-pill" class="hidden badge badge-upcoming" role="status">${icon('wifi-off', 'w-3.5 h-3.5')}<span class="hidden sm:inline">${esc(t('net.offline'))}</span><span class="sm:hidden">${esc(t('net.offlineShort'))}</span></span>
    <button class="search-box hidden lg:inline-flex px-4 !min-h-[40px] text-sm text-muted hover:text-ink w-64" data-a="open-search">${icon('search', 'w-4 h-4')}<span class="flex-1 text-left">${esc(t('search.placeholder'))}</span><kbd class="text-[11px] border border-line rounded px-1.5">/</kbd></button>
    <button class="btn-icon lg:hidden" data-a="open-search" aria-label="${esc(t('search.title'))}">${icon('search')}</button>`;
  updateNet();
}

export function updateActive(name) {
  document.querySelectorAll('[data-nav]').forEach((a) => { const on = a.dataset.nav === name; a.classList.toggle('is-on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  const g = navGroup(name);
  document.querySelectorAll('[data-bn]').forEach((a) => { const on = a.dataset.bn === g; a.classList.toggle('is-on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
}

export function updateNet() {
  const off = !navigator.onLine;
  $('#net-pill')?.classList.toggle('hidden', !off);
  document.querySelectorAll('[data-net-label]').forEach((n) => { n.textContent = off ? t('net.offline') : t('net.online'); });
}
