// Kosovo civil time helpers. Everything is computed in Europe/Belgrade, independent of the device timezone.
export const TZ = 'Europe/Belgrade';

const dtf = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23', weekday: 'short'
});
const WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** {y,m,d,h,mi,s,wd(1=Mon..7=Sun)} of an instant in Kosovo time. */
export function kosovoParts(ms = Date.now()) {
  const o = {};
  for (const p of dtf.formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second, wd: WD[o.weekday] };
}

/** Offset (minutes) of Kosovo vs UTC at an instant: 60 (CET) or 120 (CEST). */
export function kosovoOffset(ms = Date.now()) {
  const p = kosovoParts(ms);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000) / 60000);
}

export const isDST = (ms = Date.now()) => kosovoOffset(ms) === 120;

/** Add n days to a civil date, returning {y,m,d,wd}. */
export function addDays({ y, m, d }, n) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: ((t.getUTCDay() + 6) % 7) + 1 };
}

export const dateKey = ({ y, m, d }) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export const sameDay = (a, b) => a.y === b.y && a.m === b.m && a.d === b.d;
export const daysBetween = (a, b) => Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 864e5);

const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const fmtTime = (ms) => hm.format(new Date(ms));
const hms = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
export const fmtClock = (ms) => hms.format(new Date(ms));

const SQ = {
  wdL: ['e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë', 'e diel'],
  wdS: ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'],
  moL: ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'],
  moS: ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'kor', 'gus', 'sht', 'tet', 'nën', 'dhj']
};

/** Localised date for a civil date. Albanian is formatted by hand so it never depends on the browser's `sq` locale data. */
export function fmtDate({ y, m, d }, lang, o = {}) {
  if (lang !== 'sq') return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...o }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  const wd = (new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() + 6) % 7;
  const parts = [];
  if (o.weekday) parts.push(o.weekday === 'long' ? SQ.wdL[wd] : SQ.wdS[wd]);
  const dm = [];
  if (o.day) dm.push(String(d));
  if (o.month) dm.push(o.month === 'long' ? SQ.moL[m - 1] : SQ.moS[m - 1]);
  if (o.year) dm.push(String(y));
  const rest = dm.join(' ');
  const out = parts.length && rest ? `${parts[0]}, ${rest}` : parts[0] || rest;
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export const fmtNum = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');

/** Absolute instant for a Kosovo civil date + wall-clock time (handles DST). */
export function civilToMs({ y, m, d }, h, mi) {
  let ms = Date.UTC(y, m - 1, d, h, mi) - 60 * 60000;
  ms = Date.UTC(y, m - 1, d, h, mi) - kosovoOffset(ms) * 60000;
  return Date.UTC(y, m - 1, d, h, mi) - kosovoOffset(ms) * 60000;
}
