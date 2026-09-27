import { esc, icon } from '../utils/dom.js';
import { t } from '../i18n/index.js';
import { store } from '../core/store.js';
import { actions, changes } from '../core/actions.js';
import { content } from '../services/contentService.js';
import { dhikrProgress, tasbih, haptic, tick } from '../services/personalService.js';
import { pageHeader, chips, errorState } from '../components/common.js';
import { itemActions, readerBlock } from '../components/textBlock.js';
import { Sheet, toast } from '../components/ui.js';

const CIRC = 2 * Math.PI * 92;
let data = null, cat = 'after_prayer';

/* ---------- tasbih ---------- */
function ringDash(count, target) { const f = target ? Math.min(1, count / target) : 0; return `${(CIRC * f).toFixed(1)} ${CIRC.toFixed(1)}`; }

function tasbihPane() {
  const s = tasbih.get();
  const target = s.target;
  return `<div class="grid gap-6 lg:grid-cols-[1fr_320px] items-start max-w-4xl">
    <div class="card p-6 flex flex-col items-center">
      <button class="tasbih-btn" data-a="tasbih-inc" aria-label="${esc(t('tasbih.add'))}">
        <svg viewBox="0 0 200 200" class="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true"><circle cx="100" cy="100" r="92" fill="none" stroke="var(--line)" stroke-width="6"/>
          <circle cx="100" cy="100" r="92" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${ringDash(s.count, target)}" data-tasbih-ring opacity="${s.count ? 1 : 0}" style="transition:stroke-dasharray .25s var(--ease)"/></svg>
        <span class="relative text-6xl font-bold tabular-nums" data-tasbih-count>${s.count}</span>
        <span class="relative text-sm text-muted mt-1">/ ${target}</span></button>
      <div class="mt-5 flex items-center gap-3">
        <button class="btn btn-ghost" data-a="tasbih-reset">${icon('rotate-ccw', 'w-4 h-4')}${esc(t('common.reset'))}</button></div>
      <p class="mt-4 text-sm text-muted" data-tasbih-rounds>${esc(t('tasbih.rounds', { n: s.rounds }))}</p></div>
    <div class="card p-5 grid gap-4">
      <div><p class="text-sm font-semibold mb-2">${esc(t('tasbih.target'))}</p>
        <div class="flex gap-2 flex-wrap">${[33, 100].map((n) => `<button class="chip ${target === n ? 'is-on' : ''}" data-a="tasbih-target" data-n="${n}">${n}</button>`).join('')}
        <button class="chip ${![33, 100].includes(target) ? 'is-on' : ''}" data-a="tasbih-custom">${esc(t('tasbih.custom'))}${![33, 100].includes(target) ? ` · ${target}` : ''}</button></div></div>
      <label class="flex items-center justify-between gap-3 min-h-[44px]"><span class="text-sm">${esc(t('set.vibrate'))}</span><input type="checkbox" class="switch" data-ch="opt-vibrate" ${store.get('vibrate') ? 'checked' : ''}></label>
      <label class="flex items-center justify-between gap-3 min-h-[44px]"><span class="text-sm">${esc(t('set.sound'))}</span><input type="checkbox" class="switch" data-ch="opt-sound" ${store.get('sound') ? 'checked' : ''}></label>
      <label class="flex items-center justify-between gap-3 min-h-[44px]"><span class="text-sm">${esc(t('tasbih.persist'))}</span><input type="checkbox" class="switch" data-ch="opt-persist" ${store.get('tasbihPersist') ? 'checked' : ''}></label>
    </div></div>`;
}

export function tasbihInc() {
  const { s, done } = tasbih.inc();
  haptic(done ? [30, 40, 30] : 10); tick(done ? 880 : 640);
  document.querySelectorAll('[data-tasbih-count]').forEach((n) => { n.textContent = s.count; });
  const ring = document.querySelector('[data-tasbih-ring]');
  if (ring) { ring.setAttribute('opacity', 1); ring.setAttribute('stroke-dasharray', done ? `${CIRC} ${CIRC}` : ringDash(s.count, s.target)); }
  if (ring && done) setTimeout(() => { ring.setAttribute('stroke-dasharray', ringDash(0, s.target)); ring.setAttribute('opacity', 0); }, 450);
  const r = document.querySelector('[data-tasbih-rounds]'); if (r) r.textContent = t('tasbih.rounds', { n: s.rounds });
  if (done) toast(t('tasbih.done', { n: s.target }));
}
actions['tasbih-inc'] = tasbihInc;
const repaintTasbih = () => { const p = document.getElementById('dhikr-pane'); if (p) p.innerHTML = tasbihPane(); };
actions['tasbih-reset'] = () => { tasbih.reset(); repaintTasbih(); };
actions['tasbih-target'] = (el) => { tasbih.setTarget(+el.dataset.n); repaintTasbih(); };
actions['tasbih-custom'] = () => {
  Sheet.open({ title: t('tasbih.custom'), html: `<form class="grid gap-4" data-form><label class="grid gap-2 text-sm">${esc(t('tasbih.customLabel'))}
    <input class="input" type="number" inputmode="numeric" min="1" max="9999" value="${tasbih.get().custom}" required data-autofocus></label>
    <button class="btn btn-primary justify-self-end" type="submit">${esc(t('common.save'))}</button></form>`,
  mount: (b, api) => b.querySelector('[data-form]').addEventListener('submit', (e) => { e.preventDefault(); const n = Math.round(+b.querySelector('input').value); if (n >= 1 && n <= 9999) { tasbih.setTarget(n); repaintTasbih(); api.close(); } }) });
};
changes['opt-vibrate'] = (el) => store.set('vibrate', el.checked);
changes['opt-sound'] = (el) => store.set('sound', el.checked);
changes['opt-persist'] = (el) => store.set('tasbihPersist', el.checked);

/* ---------- dhikr list ---------- */
function itemCard(d) {
  const n = dhikrProgress.get(d.id); const target = d.count;
  const done = target && n >= target;
  return `<li class="card p-5" id="${esc(d.id)}">
    <div class="flex items-start justify-between gap-3"><h2 class="font-semibold">${esc(d.title)}</h2>${itemActions('dhikr', d.id)}</div>
    <div class="mt-3">${readerBlock({ ...d, source: d.source })}</div>
    <div class="mt-5 flex items-center gap-3">
      <button class="btn ${done ? 'btn-ghost' : 'btn-primary'} flex-1 sm:flex-none min-w-[140px]" data-a="dhikr-inc" data-id="${esc(d.id)}" data-target="${target || 0}" aria-live="polite">
        ${icon(done ? 'circle-check' : 'plus', 'w-4 h-4')}<span data-count>${n}</span>${target ? ` / ${target}` : ''}</button>
      <button class="btn-icon" data-a="dhikr-reset" data-id="${esc(d.id)}" aria-label="${esc(t('common.reset'))}">${icon('rotate-ccw', 'w-4 h-4')}</button></div></li>`;
}

function listPane() {
  const items = data.items.filter((d) => d.cats.includes(cat));
  return `${chips(data.categories.map((c) => ({ id: c, label: t('dcat.' + c) })), cat, 'dhikr-cat')}
    <ul class="grid gap-4 mt-4 lg:grid-cols-2 items-start" id="dhikr-list">${items.map(itemCard).join('')}</ul>
    <p class="text-xs text-muted mt-6">${esc(t('dhikr.progressNote'))}</p>`;
}

actions['dhikr-cat'] = (el) => { cat = el.dataset.v; const p = document.getElementById('dhikr-pane'); if (p) import('../core/transition.js').then(({ TransitionManager }) => TransitionManager.swap(p, () => () => { p.innerHTML = listPane(); }, { fadeOnly: true })); };
actions['dhikr-inc'] = (el) => {
  const id = el.dataset.id, target = +el.dataset.target;
  const n = dhikrProgress.set(id, dhikrProgress.get(id) + 1);
  const done = target && n >= target;
  el.querySelector('[data-count]').textContent = n;
  haptic(done && n === target ? [30, 40, 30] : 8); tick(done ? 880 : 640);
  if (done && n === target) { el.classList.replace('btn-primary', 'btn-ghost'); toast(t('dhikr.done')); }
};
actions['dhikr-reset'] = (el) => {
  dhikrProgress.reset(el.dataset.id);
  const card = document.getElementById(el.dataset.id);
  const it = data.items.find((d) => d.id === el.dataset.id);
  if (card && it) card.outerHTML = itemCard(it);
};

let mode = 'list';
export const dhikr = {
  title: 'nav.dhikr',
  async render(route) {
    mode = route.params[0] === 'tasbih' ? 'tasbih' : 'list';
    try { data ||= await content.dhikr(); } catch { return pageHeader(t('nav.dhikr'), '', '', 'more') + errorState(t('err.content')); }
    const tabs = `<nav class="seg mb-5" aria-label="${esc(t('nav.dhikr'))}"><a href="#dhikr" class="seg-i ${mode === 'list' ? 'is-on' : ''}" ${mode === 'list' ? 'aria-current="page"' : ''}>${esc(t('nav.dhikr'))}</a><a href="#dhikr/tasbih" class="seg-i ${mode === 'tasbih' ? 'is-on' : ''}" ${mode === 'tasbih' ? 'aria-current="page"' : ''}>${esc(t('nav.tasbih'))}</a></nav>`;
    return pageHeader(t('nav.dhikr'), esc(t('dhikr.sub')), '', 'more') + tabs + `<div id="dhikr-pane">${mode === 'tasbih' ? tasbihPane() : listPane()}</div>`;
  },
  mount(root) {
    const rebuild = () => { const p = root.querySelector('#dhikr-pane'); if (p && mode === 'list') p.innerHTML = listPane(); };
    document.addEventListener('reader-rebuild', rebuild);
    const key = (e) => { if (mode === 'tasbih' && e.code === 'Space' && document.activeElement === document.body) { e.preventDefault(); tasbihInc(); } };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('reader-rebuild', rebuild); document.removeEventListener('keydown', key); };
  }
};
