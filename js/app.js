// Vakt — bootstrap. Brand/name lives in one place (index.html + BRAND) so it can be renamed easily.
import { $, esc, icon } from './utils/dom.js';
import { store, listen } from './core/store.js';
import { setLang, t } from './i18n/index.js';
import { bindGlobalEvents, actions } from './core/actions.js';
import { registerRoutes, start, render, navigate } from './core/router.js';
import { clock } from './core/clock.js';
import { renderShell, updateActive, updateNet } from './components/layout.js';
import { KosovoPrayerService } from './services/kosovoPrayerService.js';
import { reschedule } from './services/notificationService.js';
import { opens } from './services/personalService.js';
import { runOnboarding } from './components/onboarding.js';
import { openSearch } from './components/search.js';
import { errorState } from './components/common.js';
import { toast } from './components/ui.js';
import './components/player.js';
import './components/textBlock.js';

import { home } from './views/home.js';
import { prayers } from './views/prayers.js';
import { qibla } from './views/qibla.js';
import { duas } from './views/duas.js';
import { dhikr } from './views/dhikr.js';
import { lectures } from './views/lectures.js';
import { ramadanView } from './views/ramadan.js';
import { friday } from './views/friday.js';
import { saved } from './views/saved.js';
import { stats } from './views/stats.js';
import { articles } from './views/articles.js';
import { settings } from './views/settings.js';
import { more } from './views/more.js';

export const BRAND = { name: 'Vakt' };

/* ---------- theme & accessibility ---------- */
const mq = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const pref = store.get('theme');
  const resolved = pref === 'system' ? (mq.matches ? 'dark' : 'light') : pref;
  const el = document.documentElement;
  el.dataset.theme = pref; el.dataset.resolved = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = resolved === 'dark' ? '#0B0D12' : '#F6F5F2';
}
function applyA11y() {
  const el = document.documentElement;
  el.style.setProperty('--scale', store.get('fontScale'));
  el.dataset.motion = store.get('motion') === 'reduce' ? 'reduce' : 'system';
  el.dataset.contrast = store.get('contrast') ? 'high' : 'normal';
}
function applyLang() { setLang(store.get('lang')); }

function bootSettings() {
  store.init(); applyLang(); applyTheme(); applyA11y();
  store.on('theme', applyTheme); store.on('fontScale', applyA11y); store.on('motion', applyA11y); store.on('contrast', applyA11y);
  mq.addEventListener?.('change', applyTheme);
  store.on('lang', () => { applyLang(); renderShell(); updateActive(currentName()); render({ animate: false }); });
}
const currentName = () => (location.hash.replace(/^#\/?/, '').split('/')[0] || 'home');

/* ---------- boot ---------- */
async function main() {
  bootSettings();
  bindGlobalEvents();
  registerRoutes({ home, prayers, qibla, duas, dhikr, lectures, ramadan: ramadanView, friday, saved, stats, articles, settings, more });
  renderShell();
  listen('route', (r) => updateActive(r.name));
  window.addEventListener('online', updateNet); window.addEventListener('offline', updateNet);

  const view = $('#view');
  view.innerHTML = `<div class="p-10 text-center text-muted" role="status">${icon('loader-circle', 'w-6 h-6 animate-spin mx-auto')}</div>`;
  const ok = await KosovoPrayerService.load();
  if (!ok) {
    view.innerHTML = `<div class="max-w-lg mx-auto pt-10">${errorState(esc(t('err.prayerData')), 'reload-data')}</div>`;
    return;
  }
  clock.start();
  const begin = async () => {
    await start(); updateActive(currentName());
    opens.mark(); reschedule();
    document.getElementById('boot')?.remove();
  };
  if (!store.get('onboarded')) { document.getElementById('boot')?.remove(); runOnboarding(begin); } else begin();

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if ((e.key === '/' && !['input', 'textarea', 'select'].includes(tag)) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); openSearch(); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reschedule(); });
  registerSW();
}

actions['open-search'] = () => openSearch();
actions['reload-data'] = () => location.reload();

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) toast(t('sw.updated'), 5000); });
}

main().catch((e) => {
  console.error(e);
  const v = document.getElementById('view');
  if (v) v.innerHTML = `<div class="p-8 text-center"><p class="font-semibold">Vakt</p><p class="text-sm text-muted mt-2">${esc(e.message)}</p></div>`;
});
