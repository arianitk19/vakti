// Hash router with sub-paths (#dhikr/tasbih). No reloads; views are swapped through TransitionManager.
import { TransitionManager } from './transition.js';
import { $ } from '../utils/dom.js';
import { t } from '../i18n/index.js';
import { emit } from './store.js';

const routes = {};
let cleanup = null;
let current = { name: null, params: [] };
const DEFAULT = 'home';

export const registerRoutes = (r) => Object.assign(routes, r);
export const currentRoute = () => current;

export function parseHash(h = location.hash) {
  const parts = h.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const name = routes[parts[0]] ? parts[0] : DEFAULT;
  return { name, params: parts.slice(1) };
}
export const navigate = (path) => { const target = '#' + path; if (location.hash === target) render(); else location.hash = target; };

let seq = 0;
export async function render({ animate = true } = {}) {
  const route = parseHash();
  const view = routes[route.name];
  const root = $('#view');
  const my = ++seq;
  const same = route.name === current.name;
  const prev = current;
  current = route;
  emit('route', route);

  const doRender = async () => {
    if (cleanup) { try { cleanup(); } catch { /* noop */ } cleanup = null; }
    let html;
    try { html = await view.render(route); }
    catch (e) { console.error(e); html = `<div class="p-6 text-center"><p class="font-semibold">${t('err.generic')}</p></div>`; }
    return () => {
      if (my !== seq) return;
      root.innerHTML = html;
      document.title = (view.title ? t(view.title) + ' · ' : '') + 'Vakt';
      if (!(same && prev.params.join() !== route.params.join() && view.keepScroll)) window.scrollTo(0, 0);
      cleanup = view.mount?.(root, route) || null;
      root.focus({ preventScroll: true });
    };
  };
  if (!animate) { (await doRender())(); return; }
  await TransitionManager.swap(root, doRender, { fadeOnly: same });
}

export function start() {
  window.addEventListener('hashchange', () => render());
  return render({ animate: false });
}
