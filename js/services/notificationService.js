// Notifications while the app/browser is running. Browsers do not guarantee background delivery for
// a plain web app, so the UI says so explicitly and never promises more than this can do.
import { store } from '../core/store.js';
import { KosovoPrayerService, PRAYERS } from './kosovoPrayerService.js';
import { currentCity } from './locationService.js';
import { fmtTime, kosovoParts, addDays, civilToMs } from '../utils/tz.js';
import { t } from '../i18n/index.js';

let timer;
export const notifSupported = () => 'Notification' in window;
export const permission = () => (notifSupported() ? Notification.permission : 'unsupported');

export async function request() {
  if (!notifSupported()) return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

async function show(title, body, tag) {
  const opts = { body, tag, icon: 'assets/icons/icon-192.png', badge: 'assets/icons/icon-192.png', silent: !store.get('sound') };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(title, opts);
  } catch { /* fall through */ }
  try { new Notification(title, opts); } catch { /* noop */ }
}
export const test = () => show('Vakt', t('notif.testBody'), 'vakt-test');

/** Compute the next notification instant after now and arm a single timer. */
export function reschedule() {
  clearTimeout(timer);
  const n = store.get('notif');
  if (!n.enabled || permission() !== 'granted' || KosovoPrayerService.status !== 'ready') return;
  const now = Date.now(), city = currentCity();
  let best = null;
  const p = KosovoPrayerService.schedule(now, city);
  const cands = [];
  for (const day of [p.today, p.tomorrow]) for (const k of PRAYERS) if (n.prayers[k]) cands.push({ key: k, at: day.times[k] - n.lead * 60000, start: day.times[k] });
  // Friday reminder: 30 min before the user's own mosque time (never assumed)
  const ft = store.get('fridayTime');
  if (n.fridayRemind && /^\d{2}:\d{2}$/.test(ft)) {
    const p0 = kosovoParts(now);
    for (let i = 0; i < 8; i++) {
      const c = addDays(p0, i);
      if (c.wd !== 5) continue;
      const [h, mi] = ft.split(':').map(Number);
      const start = civilToMs(c, h, mi);
      cands.push({ key: 'friday', at: start - 30 * 60000, start, friday: true });
    }
  }
  for (const c of cands) if (c.at > now + 500 && (!best || c.at < best.at)) best = c;
  if (!best) return;
  timer = setTimeout(async () => {
    if (best.friday) { await show(t('nav.friday'), t('notif.friday', { time: fmtTime(best.start) }), 'vakt-friday'); reschedule(); return; }
    const name = t('prayer.' + best.key);
    const body = n.lead > 0 ? t('notif.body.before', { min: n.lead, time: fmtTime(best.start) }) : t('notif.body.now', { time: fmtTime(best.start) });
    await show(name, body, 'vakt-' + best.key);
    reschedule();
  }, Math.min(best.at - now, 2 ** 31 - 1));
}
