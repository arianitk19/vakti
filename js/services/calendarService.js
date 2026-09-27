// Hijri + Ramadan helpers. Hijri dates come from the browser's Umm al-Qura calendar (Intl) and can
// differ by a day from the Islamic Community of Kosovo's announcement — the UI labels them "approx".
import { addDays, daysBetween, kosovoParts } from '../utils/tz.js';
import { KosovoPrayerService } from './kosovoPrayerService.js';

let hijriFmt = null;
try {
  hijriFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
} catch { hijriFmt = null; }
export const hijriSupported = (() => { try { const p = hijriFmt.formatToParts(new Date(Date.UTC(2020, 0, 1, 12))).find((x) => x.type === 'year'); const y = parseInt(p.value, 10); return y >= 1440 && y <= 1442; } catch { return false; } })();

const cache = new Map();
export function hijri({ y, m, d }) {
  if (!hijriFmt) return null;
  const k = y * 10000 + m * 100 + d;
  if (cache.has(k)) return cache.get(k);
  const parts = hijriFmt.formatToParts(new Date(Date.UTC(y, m - 1, d, 12)));
  const o = {};
  parts.forEach((p) => { o[p.type] = p.value; });
  const r = { d: +o.day, m: +o.month, y: parseInt(o.year, 10) };
  if (!r.d || !r.m || !r.y) return null;
  cache.set(k, r);
  return r;
}

export const HIJRI_MONTHS = ['Muharrem', 'Safer', 'Rebiul-evvel', 'Rebiul-ahir', 'Xhumadel-ula', 'Xhumadel-ahira', 'Rexheb', 'Shaban', 'Ramazan', 'Shevval', 'Dhulkade', 'Dhulhixhe'];

/** Dataset events for 2026 (official BIK calendar). Other years: none (never invented). */
export function events(year) {
  if (year !== 2026) return [];
  const e = KosovoPrayerService.events2026;
  const names = {
    laylat_al_miraj: 'Miraxhi', laylat_al_baraat: 'Nata e Beratit', ramadan_start: 'Fillimi i Ramazanit',
    laylat_al_qadr: 'Nata e Kadrit', eid_al_fitr: 'Fitër Bajrami', eid_al_adha: 'Kurban Bajrami',
    islamic_new_year_1448: 'Viti i Ri Hixhri', ashura: 'Ashura', mawlid: 'Mevludi'
  };
  return Object.entries(e).map(([k, date]) => ({ id: k, date, name: names[k] || k }));
}
export function eventOn({ y, m, d }) {
  const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return events(y).find((e) => e.date === key) || null;
}

const ymd = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };

/** Ramadan status at civil date `civil`. */
export function ramadan(civil) {
  const ev = KosovoPrayerService.events2026;
  if (civil.y === 2026 && ev.ramadan_start && ev.eid_al_fitr) {
    const s = ymd(ev.ramadan_start), e = ymd(ev.eid_al_fitr);
    const dayNo = daysBetween(s, civil) + 1;
    const total = daysBetween(s, e);
    if (dayNo >= 1 && dayNo <= total) return { active: true, dayNo, total, start: s, estimated: false };
  }
  const h = hijri(civil);
  if (h && h.m === 9 && !(civil.y === 2026)) {
    // Walk back to day 1 and forward to length via Umm al-Qura
    let s = civil; while ((hijri(s)?.d || 1) > 1) s = addDays(s, -1);
    let n = 0, c = s; while (hijri(c)?.m === 9) { n++; c = addDays(c, 1); }
    return { active: true, dayNo: h.d, total: n, start: s, estimated: true };
  }
  return { active: false };
}

/** Next Ramadan start (civil) after `civil`; official for 2026, Umm al-Qura estimate otherwise. */
export function nextRamadan(civil) {
  const ev = KosovoPrayerService.events2026;
  if (ev.ramadan_start) { const s = ymd(ev.ramadan_start); if (daysBetween(civil, s) > 0) return { start: s, estimated: false }; }
  let c = civil;
  for (let i = 0; i < 400; i++) {
    c = addDays(c, 1);
    const h = hijri(c);
    if (h && h.m === 9 && h.d === 1 && !(c.y === 2026)) return { start: c, estimated: true };
  }
  return null;
}

/** Month grid: array of weeks (Mon-first) with civil dates or null. */
export function monthGrid(y, m) {
  const first = { y, m, d: 1 };
  const wd = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const len = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = Array(wd).fill(null);
  for (let d = 1; d <= len; d++) cells.push({ y, m, d });
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { weeks, first };
}

export const todayCivil = () => { const p = kosovoParts(); return { y: p.y, m: p.m, d: p.d, wd: p.wd }; };
