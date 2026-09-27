// Delegated event handling: markup declares data-a="name" (click) / data-in="name" (input) / data-ch="name" (change).
export const actions = {};
export const inputs = {};
export const changes = {};

export function bindGlobalEvents() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const fn = actions[el.dataset.a];
    if (fn) { if (el.tagName === 'A' && !el.dataset.native) e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('input', (e) => { const el = e.target.closest('[data-in]'); if (el && inputs[el.dataset.in]) inputs[el.dataset.in](el, e); });
  document.addEventListener('change', (e) => { const el = e.target.closest('[data-ch]'); if (el && changes[el.dataset.ch]) changes[el.dataset.ch](el, e); });
}
