// Reading experience shared by Lutje and Dhikr: Arabic-first typography, size/line-height controls,
// favourite / copy / share actions.
import { esc, icon } from '../utils/dom.js';
import { t } from '../i18n/index.js';
import { store } from '../core/store.js';
import { actions } from '../core/actions.js';
import { favorites } from '../services/personalService.js';
import { content } from '../services/contentService.js';
import { copyText, share } from '../services/shareService.js';
import { toast } from './ui.js';

const SIZES = [1.5, 1.85, 2.2, 2.65, 3.1];   // rem
const LH = [1.9, 2.25, 2.7];

export const arabicVars = () => `--ar-size:${SIZES[store.get('arabicSize') - 1] || SIZES[2]}rem;--ar-lh:${LH[store.get('arabicLH') - 1] || LH[1]}`;

export function readerControls() {
  const sz = store.get('arabicSize'), lh = store.get('arabicLH');
  return `<div class="flex items-center gap-1 flex-wrap" role="group" aria-label="${esc(t('reader.controls'))}">
    <button class="btn-icon" data-a="ar-size" data-d="-1" ${sz <= 1 ? 'disabled' : ''} aria-label="${esc(t('reader.smaller'))}">${icon('minus', 'w-4 h-4')}</button>
    <span class="text-sm font-semibold w-6 text-center" aria-hidden="true">Aa</span>
    <button class="btn-icon" data-a="ar-size" data-d="1" ${sz >= 5 ? 'disabled' : ''} aria-label="${esc(t('reader.bigger'))}">${icon('plus', 'w-4 h-4')}</button>
    <button class="btn-icon ml-1" data-a="ar-lh" aria-label="${esc(t('reader.lineHeight'))}: ${lh}/3">${icon('type', 'w-4 h-4')}</button>
    <button class="btn-icon" data-a="toggle-translit" aria-pressed="${store.get('showTranslit')}" aria-label="${esc(t('reader.translit'))}">${icon(store.get('showTranslit') ? 'eye' : 'eye-off', 'w-4 h-4')}</button>
    <button class="btn-icon" data-a="theme-flip" aria-label="${esc(t('reader.theme'))}">${icon('sun-moon', 'w-4 h-4')}</button></div>`;
}

export function itemActions(type, id) {
  const fav = favorites.has(type, id);
  return `<div class="flex items-center gap-1">
    <button class="btn-icon ${fav ? 'text-accent' : ''}" data-a="fav" data-type="${type}" data-id="${esc(id)}" aria-pressed="${fav}" aria-label="${esc(fav ? t('saved.remove') : t('saved.add'))}">${icon('bookmark', 'w-5 h-5')}</button>
    <button class="btn-icon" data-a="copy-item" data-type="${type}" data-id="${esc(id)}" aria-label="${esc(t('common.copy'))}">${icon('copy', 'w-5 h-5')}</button>
    <button class="btn-icon" data-a="share-item" data-type="${type}" data-id="${esc(id)}" aria-label="${esc(t('common.share'))}">${icon('share-2', 'w-5 h-5')}</button></div>`;
}

/** Main content block: Arabic → transliteration → Albanian → source. */
export function readerBlock(it) {
  return `<div class="reader" style="${arabicVars()}">
    <p class="arabic reader-ar" dir="rtl" lang="ar">${esc(it.arabic)}</p>
    ${store.get('showTranslit') && it.transliteration ? `<p class="mt-5 italic text-[1.02rem] leading-relaxed text-ink/85">${esc(it.transliteration)}</p>` : ''}
    <p class="mt-4 text-[1.05rem] leading-relaxed">${esc(it.translation)}</p>
    ${it.source ? `<p class="mt-4 text-xs text-muted flex items-start gap-2">${icon('book-open', 'w-3.5 h-3.5 mt-0.5')}<span>${esc(t('common.source'))}: ${esc(it.source)}</span></p>` : ''}
  </div>`;
}

export const shareText = (it) => [it.title, '', it.arabic, '', it.transliteration, '', it.translation, '', it.source ? `${t('common.source')}: ${it.source}` : '', '— Vakt'].filter((x) => x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n');

async function find(type, id) {
  const src = type === 'duas' ? await content.duas() : await content.dhikr();
  return src.items.find((x) => x.id === id);
}

function rerenderReader() {
  const r = document.querySelector('[data-reader-root]');
  if (r) r.dispatchEvent(new CustomEvent('reader-refresh', { bubbles: true }));
  document.querySelectorAll('.reader').forEach((n) => n.setAttribute('style', arabicVars()));
  document.querySelectorAll('[data-reader-controls]').forEach((n) => { n.innerHTML = readerControls(); });
}

actions['ar-size'] = (el) => { store.set('arabicSize', Math.min(5, Math.max(1, store.get('arabicSize') + +el.dataset.d))); rerenderReader(); };
actions['ar-lh'] = () => { store.set('arabicLH', (store.get('arabicLH') % 3) + 1); rerenderReader(); };
actions['toggle-translit'] = () => {
  store.set('showTranslit', !store.get('showTranslit'));
  document.querySelectorAll('[data-reader-controls]').forEach((n) => { n.innerHTML = readerControls(); });
  document.dispatchEvent(new CustomEvent('reader-rebuild'));
};
actions['theme-flip'] = () => { const dark = document.documentElement.dataset.resolved === 'dark'; store.set('theme', dark ? 'light' : 'dark'); };
actions.fav = (el) => {
  const on = favorites.toggle(el.dataset.type, el.dataset.id);
  el.setAttribute('aria-pressed', on); el.classList.toggle('text-accent', on);
  el.setAttribute('aria-label', on ? t('saved.remove') : t('saved.add'));
  toast(on ? t('saved.added') : t('saved.removed'));
};
actions['copy-item'] = async (el) => { const it = await find(el.dataset.type, el.dataset.id); if (it) copyText(shareText(it)); };
actions['share-item'] = async (el) => { const it = await find(el.dataset.type, el.dataset.id); if (it) share({ title: it.title, text: shareText(it) }); };
