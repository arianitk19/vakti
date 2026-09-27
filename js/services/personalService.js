// Personal, on-device data: prayer log, favourites, tasbih, dhikr progress, app-open days.
import { storage } from './storageService.js';
import { store } from '../core/store.js';
import { kosovoParts, dateKey } from '../utils/tz.js';

export const todayKey = () => { const p = kosovoParts(); return dateKey(p); };

// ---------- prayer log ("Shëno si të falur" — the user's own marking, never verified) ----------
export const prayerLog = {
  all: () => storage.get('log', {}),
  day(key) { return this.all()[key] || {}; },
  toggle(key, prayer) {
    const all = this.all(); const d = { ...(all[key] || {}) };
    if (d[prayer]) delete d[prayer]; else d[prayer] = 1;
    if (Object.keys(d).length) all[key] = d; else delete all[key];
    storage.set('log', all);
    return !!d[prayer];
  },
  count: (key) => Object.keys(prayerLog.day(key)).length
};

export const opens = {
  mark() { const a = storage.get('opens', []); const k = todayKey(); if (!a.includes(k)) { a.push(k); storage.set('opens', a.slice(-800)); } },
  all: () => storage.get('opens', [])
};

// ---------- favourites ----------
export const favorites = {
  all: () => storage.get('fav', { duas: [], dhikr: [], lectures: [] }),
  has(type, id) { return (this.all()[type] || []).includes(id); },
  toggle(type, id) {
    const a = this.all(); const l = a[type] || [];
    a[type] = l.includes(id) ? l.filter((x) => x !== id) : [id, ...l];
    storage.set('fav', a);
    return a[type].includes(id);
  }
};

// ---------- haptics / sound ----------
export function haptic(p = 12) { if (store.get('vibrate') && navigator.vibrate) { try { navigator.vibrate(p); } catch { /* noop */ } } }
let actx;
export function tick(freq = 660, ms = 40) {
  if (!store.get('sound')) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = freq; g.gain.value = 0.04; o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + ms / 1000);
  } catch { /* noop */ }
}

// ---------- tasbih ----------
export const tasbih = {
  mem: null,
  get() {
    const s = (!store.get('tasbihPersist') && this.mem) || storage.get('tasbih', { count: 0, target: 33, rounds: 0, day: todayKey(), custom: 50 });
    if (s.day !== todayKey()) { s.rounds = 0; s.day = todayKey(); }
    return s;
  },
  save(s) { if (store.get('tasbihPersist')) storage.set('tasbih', s); else this.mem = s; },
  inc() {
    const s = this.get(); s.count += 1; let done = false;
    if (s.target && s.count >= s.target) { done = true; s.rounds += 1; s.count = 0; }
    this.save(s); return { s, done };
  },
  reset() { const s = this.get(); s.count = 0; this.save(s); return s; },
  setTarget(n) { const s = this.get(); s.target = n; s.count = 0; if (![33, 100].includes(n)) s.custom = n; this.save(s); return s; }
};

// ---------- dhikr progress (resets each day) ----------
export const dhikrProgress = {
  all() { const a = storage.get('dhikrp', { day: todayKey(), c: {} }); return a.day === todayKey() ? a : { day: todayKey(), c: {} }; },
  get(id) { return this.all().c[id] || 0; },
  set(id, n) { const a = this.all(); a.c[id] = n; storage.set('dhikrp', a); return n; },
  reset(id) { return this.set(id, 0); }
};
