// Toast + Sheet (bottom sheet on mobile, dialog on desktop). Escape and backdrop click close.
import { $, esc, icon } from '../utils/dom.js';
import { TransitionManager } from '../core/transition.js';
import { t } from '../i18n/index.js';

export function toast(msg, ms = 2400) {
  const root = $('#toast-root'); if (!root) return;
  const el = document.createElement('div');
  el.className = 'pointer-events-auto rounded-full bg-ink text-bg text-sm font-medium px-4 py-2.5 shadow-lg max-w-[90vw] text-center';
  el.textContent = msg;
  root.replaceChildren(el);
  TransitionManager.pop(el);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.remove(), ms);
}

const stack = [];
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const Sheet = {
  open({ title = '', html = '', mount, onClose, wide = false, label } = {}) {
    const root = $('#sheet-root');
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 z-[60] flex items-end lg:items-center justify-center';
    const id = 'sh' + Math.random().toString(36).slice(2, 7);
    wrap.innerHTML = `
      <div class="absolute inset-0 bg-black/45" data-backdrop></div>
      <div class="sheet-panel relative w-full ${wide ? 'lg:max-w-2xl' : 'lg:max-w-lg'} max-h-[90dvh] lg:max-h-[86vh] flex flex-col text-ink pb-[env(safe-area-inset-bottom)]"
           role="dialog" aria-modal="true" aria-labelledby="${id}">
        <div class="sheet-grabber lg:hidden" aria-hidden="true"></div>
        <header class="flex items-center gap-2 px-5 pt-3 pb-2">
          <h2 id="${id}" class="flex-1 text-lg font-semibold tracking-tight">${esc(title)}</h2>
          <button class="btn-icon" data-close aria-label="${esc(t('common.close'))}">${icon('x')}</button>
        </header>
        <div class="sheet-body overflow-y-auto overscroll-contain px-5 pb-5 flex-1" data-body>${html}</div>
      </div>`;
    const panel = $('.sheet-panel', wrap), backdrop = $('[data-backdrop]', wrap), body = $('[data-body]', wrap);
    const opener = document.activeElement;
    let closed = false;
    const api = {
      el: wrap, body,
      setBody(h) { body.innerHTML = h; },
      async close() {
        if (closed) return; closed = true;
        const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
        document.removeEventListener('keydown', onKey, true);
        await TransitionManager.sheetOut(panel, backdrop);
        wrap.remove();
        if (!stack.length) document.documentElement.classList.remove('sheet-open');
        onClose?.();
        try { opener?.focus?.({ preventScroll: true }); } catch { /* noop */ }
      }
    };
    const onKey = (e) => {
      if (stack[stack.length - 1] !== api) return;
      if (e.key === 'Escape') { e.stopPropagation(); api.close(); }
      else if (e.key === 'Tab') {
        const f = [...panel.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    backdrop.addEventListener('click', () => api.close());
    wrap.querySelector('[data-close]').addEventListener('click', () => api.close());
    document.addEventListener('keydown', onKey, true);
    root.appendChild(wrap);
    stack.push(api);
    document.documentElement.classList.add('sheet-open');
    TransitionManager.sheetIn(panel, backdrop);
    mount?.(body, api);
    setTimeout(() => (panel.querySelector('[data-autofocus]') || wrap.querySelector('[data-close]')).focus({ preventScroll: true }), 30);
    return api;
  },
  closeAll() { [...stack].forEach((s) => s.close()); },
  top: () => stack[stack.length - 1]
};

export function confirmSheet({ title, text, confirm, danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const s = Sheet.open({
      title,
      html: `<p class="text-muted leading-relaxed">${esc(text)}</p>
        <div class="mt-5 flex gap-3 justify-end"><button class="btn btn-ghost" data-no>${esc(t('common.cancel'))}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes data-autofocus>${esc(confirm)}</button></div>`,
      onClose: () => { if (!answered) resolve(false); },
      mount: (b) => {
        b.querySelector('[data-yes]').onclick = () => { answered = true; resolve(true); s.close(); };
        b.querySelector('[data-no]').onclick = () => { answered = true; resolve(false); s.close(); };
      }
    });
  });
}
