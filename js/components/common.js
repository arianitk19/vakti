// Shared presentational helpers so every module speaks the same visual language.
import { esc, icon } from '../utils/dom.js';
import { t } from '../i18n/index.js';

export const PRAYER_ICON = { imsak: 'moon-star', fajr: 'sunrise', sunrise: 'sun', dhuhr: 'sun-medium', asr: 'cloud-sun', maghrib: 'sunset', isha: 'moon' };

export function pageHeader(title, sub = '', right = '', back = '') {
  return `<header class="flex items-start gap-3 mb-5 lg:mb-7">
    ${back ? `<a href="#${back}" class="btn-icon -ml-2 mt-0.5" aria-label="${esc(t('common.back'))}">${icon('chevron-left')}</a>` : ''}
    <div class="flex-1 min-w-0"><h1 class="text-2xl lg:text-3xl font-bold tracking-tight">${esc(title)}</h1>
    ${sub ? `<p class="text-muted text-sm mt-1">${sub}</p>` : ''}</div>${right}</header>`;
}

export function emptyState({ ic = 'info', title, text = '', action = '' }) {
  return `<div class="card p-8 text-center flex flex-col items-center gap-3">
    <span class="grid place-items-center h-12 w-12 rounded-full bg-accent-soft text-accent">${icon(ic, 'w-6 h-6')}</span>
    <h2 class="font-semibold">${esc(title)}</h2>${text ? `<p class="text-muted text-sm max-w-sm leading-relaxed">${text}</p>` : ''}${action}</div>`;
}

export function errorState(text, retryAction = '') {
  return `<div class="card p-6 flex gap-3 items-start border-danger/40" role="alert">
    <span class="text-danger mt-0.5">${icon('triangle-alert')}</span>
    <div class="flex-1"><p class="text-sm leading-relaxed">${text}</p>${retryAction ? `<button class="btn btn-ghost mt-3" data-a="${retryAction}">${esc(t('common.retry'))}</button>` : ''}</div></div>`;
}

export const loadingState = (text = t('common.loading')) =>
  `<div class="p-10 flex flex-col items-center gap-3 text-muted" role="status">${icon('loader-circle', 'w-6 h-6 animate-spin')}<span class="text-sm">${esc(text)}</span></div>`;

/** Segmented control; each option => data-a=action data-v=value */
export function segmented(options, active, action, label = '') {
  return `<div class="seg" role="tablist" aria-label="${esc(label)}">${options.map((o) =>
    `<button role="tab" aria-selected="${o.id === active}" class="seg-i ${o.id === active ? 'is-on' : ''}" data-a="${action}" data-v="${esc(o.id)}">${esc(o.label)}</button>`).join('')}</div>`;
}

export function chips(options, active, action) {
  return `<div class="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap pb-1" role="tablist">${options.map((o) =>
    `<button role="tab" aria-selected="${o.id === active}" class="chip ${o.id === active ? 'is-on' : ''}" data-a="${action}" data-v="${esc(o.id)}">${esc(o.label)}</button>`).join('')}</div>`;
}

/** Status badge — never colour alone: icon + text + border style. */
export function statusBadge(status) {
  const map = {
    current: ['circle-dot', 'badge-current'], upcoming: ['clock', 'badge-upcoming'], passed: ['circle-check', 'badge-passed']
  };
  const [ic, cls] = map[status];
  return `<span class="badge ${cls}">${icon(ic, 'w-3.5 h-3.5')}${esc(t('status.' + status))}</span>`;
}

export function sourceNote(extra = '') {
  return `<p class="text-xs text-muted leading-relaxed">${esc(t('prayer.sourceShort'))} ${extra}</p>`;
}
