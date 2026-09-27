// Install experience: capture beforeinstallprompt, respect dismissal, detect standalone.
import { store, emit } from '../core/store.js';
let deferred = null;
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; emit('install-state'); });
window.addEventListener('appinstalled', () => { deferred = null; emit('install-state'); });

export const canInstall = () => !!deferred && !isStandalone();
export function shouldPromote() {
  if (!canInstall()) return false;
  const at = store.get('installDismissedAt') || 0;
  return Date.now() - at > 14 * 864e5;
}
export function dismiss() { store.set('installDismissedAt', Date.now()); emit('install-state'); }
export async function install() {
  if (!deferred) return 'unavailable';
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null; emit('install-state');
  if (outcome === 'dismissed') store.set('installDismissedAt', Date.now());
  return outcome;
}
