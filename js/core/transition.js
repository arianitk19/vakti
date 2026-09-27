// TransitionManager — the single owner of motion: route/tab swaps, sheets and modals.
// Language: opacity + small translate + scale .995→1. No blur, no long durations.
import { reducedMotion } from '../utils/dom.js';

const EASE = 'cubic-bezier(.22,1,.36,1)';
const anim = (el, frames, opts) => el.animate(frames, { fill: 'both', ...opts });
const settle = async (a) => { try { await a.finished; } catch { /* cancelled */ } };

export const TransitionManager = {
  /** Fade old content out, render new, fade in. Latest call wins; never flashes blank. */
  async swap(el, render, { fadeOnly = false } = {}) {
    const token = (el._tk = (el._tk || 0) + 1);
    const pending = Promise.resolve().then(render);      // start loading the next content immediately
    if (reducedMotion()) { const r = await pending; if (token === el._tk) r?.(); return; }
    const out = anim(el, [{ opacity: 1 }, { opacity: 0, transform: fadeOnly ? 'none' : 'translateY(3px)' }], { duration: 110, easing: 'ease-out' });
    let commit;
    try { [commit] = await Promise.all([pending, settle(out)]); } catch (e) { out.cancel(); throw e; }
    if (token !== el._tk) return;                          // superseded by a newer navigation
    commit?.();
    out.cancel();
    anim(el, [{ opacity: 0, transform: fadeOnly ? 'none' : 'translateY(8px) scale(.995)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE })
      .finished.then((a) => { try { a.commitStyles?.(); } catch { /* noop */ } }).catch(() => {});
    setTimeout(() => el.getAnimations().forEach((a) => a.finished.then(() => a.cancel()).catch(() => {})), 300);
  },

  /** Bottom sheet (mobile) / dialog (desktop) enter. */
  sheetIn(panel, backdrop) {
    const desktop = window.matchMedia('(min-width:1024px)').matches;
    if (reducedMotion()) return Promise.resolve();
    anim(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
    return settle(anim(panel, desktop
      ? [{ opacity: 0, transform: 'scale(.98) translateY(6px)' }, { opacity: 1, transform: 'none' }]
      : [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: desktop ? 220 : 320, easing: EASE }));
  },
  async sheetOut(panel, backdrop) {
    const desktop = window.matchMedia('(min-width:1024px)').matches;
    if (reducedMotion()) return;
    anim(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in' });
    await settle(anim(panel, desktop
      ? [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.98)' }]
      : [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], { duration: 200, easing: 'ease-in' }));
  },

  /** Small element entrance (toasts, mini-player). */
  pop(el) {
    if (reducedMotion()) return;
    anim(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE });
  }
};
