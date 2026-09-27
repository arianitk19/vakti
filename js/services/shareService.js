import { toast } from '../components/ui.js';
import { t } from '../i18n/index.js';

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast(t('toast.copied')); return true; }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { /* noop */ }
    ta.remove(); toast(ok ? t('toast.copied') : t('toast.copyFail')); return ok;
  }
}

/** Web Share API with clipboard fallback. */
export async function share({ title, text, url }) {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return true; }
    catch (e) { if (e?.name === 'AbortError') return false; }
  }
  return copyText([text, url].filter(Boolean).join('\n'));
}
