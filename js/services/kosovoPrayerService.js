// KosovoPrayerService — the only place that knows about the dataset shape.
// Source: Takvimi i Bashkësisë Islame të Kosovës via drilonjaha/kohet-e-namazit-kosove-json (MIT).
// Dataset times are calendar-date based and stored here in standard time (CET, UTC+1); the summer-time
// shift is applied by Intl at display time, so DST transitions are correct for any year.
import { storage } from './storageService.js';
import { kosovoParts, addDays, sameDay } from '../utils/tz.js';

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const ALL_KEYS = ['imsak', 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const CACHE_KEY = 'prayers-cache';

function validate(d) {
  if (!d || !d.days || !d.order || !Array.isArray(d.order) || d.order.length !== 7) return false;
  const keys = Object.keys(d.days);
  if (keys.length !== 365) return false;
  for (const k of keys) {
    const v = d.days[k];
    if (!Array.isArray(v) || v.length !== 7) return false;
    for (let i = 0; i < 7; i++) {
      if (!Number.isFinite(v[i]) || v[i] < 0 || v[i] > 1440) return false;
      if (i > 0 && v[i] <= v[i - 1]) return false;
    }
  }
  return true;
}

class Service {
  constructor() { this.data = null; this.status = 'idle'; this.fromCache = false; }

  async load() {
    this.status = 'loading';
    try {
      const r = await fetch('data/prayers.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('http ' + r.status);
      const d = await r.json();
      if (!validate(d)) throw new Error('invalid');
      this.data = d; this.fromCache = false; this.status = 'ready';
      storage.set(CACHE_KEY, d);
      return true;
    } catch (e) {
      const c = storage.get(CACHE_KEY);
      if (c && validate(c)) { this.data = c; this.fromCache = true; this.status = 'ready'; return true; }
      this.status = 'error';
      return false;
    }
  }

  get meta() { return this.data?.meta; }
  get events2026() { return this.data?.events2026 || {}; }

  offsetFor(city) {
    const k = city?.offsetKey;
    return k && this.data?.cityOffsets?.[k] != null ? this.data.cityOffsets[k] : 0;
  }

  /** Prayer instants (ms, absolute) for a civil date and city. */
  day(civil, city) {
    let key = `${String(civil.m).padStart(2, '0')}-${String(civil.d).padStart(2, '0')}`;
    let approx = false;
    if (!this.data.days[key]) { key = '02-28'; approx = true; }   // 29 Feb: dataset has no row → nearest date
    const off = this.offsetFor(city);
    const base = Date.UTC(civil.y, civil.m - 1, civil.d);
    const times = {};
    this.data.days[key].forEach((min, i) => { times[ALL_KEYS[i]] = base + (min - 60 + off) * 60000; });
    return { civil, times, approx, offset: off };
  }

  /** Full picture at instant `now`: today's list with statuses, current and next prayer. */
  schedule(now, city) {
    const civil = (() => { const p = kosovoParts(now); return { y: p.y, m: p.m, d: p.d, wd: p.wd }; })();
    const today = this.day(civil, city);
    const tomorrow = this.day(addDays(civil, 1), city);
    const t = today.times;
    const ends = { fajr: t.sunrise, dhuhr: t.asr, asr: t.maghrib, maghrib: t.isha, isha: tomorrow.times.fajr };
    const list = PRAYERS.map((key) => {
      const start = t[key], end = ends[key];
      const status = now >= end ? 'passed' : now >= start ? 'current' : 'upcoming';
      return { key, start, end, status };
    });
    let next = list.find((p) => p.start > now);
    let nextIsTomorrow = false;
    if (!next) { next = { key: 'fajr', start: tomorrow.times.fajr }; nextIsTomorrow = true; }
    const current = list.find((p) => p.status === 'current') || null;
    const sunriseSoon = now >= t.fajr && now < t.sunrise;
    return { civil, today, tomorrow, list, current, next: { ...next, tomorrow: nextIsTomorrow }, sunriseSoon };
  }

  /** Next occurrence of any key (incl. imsak/sunrise) after `now`. */
  nextOf(key, now, city) {
    let civil = (() => { const p = kosovoParts(now); return { y: p.y, m: p.m, d: p.d }; })();
    for (let i = 0; i < 3; i++) {
      const ms = this.day(civil, city).times[key];
      if (ms > now) return ms;
      civil = addDays(civil, 1);
    }
    return null;
  }

  isToday(civil, now = Date.now()) { const p = kosovoParts(now); return sameDay(civil, p); }
}

export const KosovoPrayerService = new Service();
