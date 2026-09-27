// Tiny reactive store + event bus. Persisted slices are written through StorageService.
import { storage } from '../services/storageService.js';

export const DEFAULT_WIDGETS = [
  { id: 'next', on: true }, { id: 'today', on: true }, { id: 'dua', on: true },
  { id: 'qibla', on: true }, { id: 'dhikr', on: true }, { id: 'ramadan', on: true },
  { id: 'reminder', on: true }, { id: 'calendar', on: true }
];

const DEFAULTS = {
  onboarded: false,
  lang: 'sq',
  theme: 'system',           // light | dark | system
  fontScale: 1,              // 0.9 | 1 | 1.15 | 1.3
  motion: 'system',          // system | reduce
  contrast: false,
  city: 'prishtine',
  loc: { mode: 'city', coords: null },   // last known GPS coords kept only if user allowed
  widgets: DEFAULT_WIDGETS,
  notif: { enabled: false, prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true }, lead: 10, dhikr: false, fridayRemind: false },
  arabicSize: 3,             // 1..5
  arabicLH: 2,               // 1..3 line height
  tasbihPersist: true,
  showTranslit: true,
  fridayTime: '',            // user-configurable local Friday prayer time (HH:MM), empty = not set
  installDismissedAt: 0,
  sound: false, vibrate: true
};

const state = {};
const subs = new Map();

export const store = {
  init() { for (const k of Object.keys(DEFAULTS)) state[k] = storage.get('s:' + k, DEFAULTS[k]); },
  get: (k) => state[k],
  set(k, v) { state[k] = v; storage.set('s:' + k, v); (subs.get(k) || []).forEach((f) => f(v)); (subs.get('*') || []).forEach((f) => f(k, v)); },
  patch(k, p) { this.set(k, { ...state[k], ...p }); },
  on(k, f) { const l = subs.get(k) || []; l.push(f); subs.set(k, l); return () => subs.set(k, subs.get(k).filter((x) => x !== f)); },
  resetDefaults() { for (const k of Object.keys(DEFAULTS)) { state[k] = DEFAULTS[k]; } }
};

/** Simple event bus for cross-module signals. */
const bus = new EventTarget();
export const emit = (n, detail) => bus.dispatchEvent(new CustomEvent(n, { detail }));
export const listen = (n, f) => { const h = (e) => f(e.detail); bus.addEventListener(n, h); return () => bus.removeEventListener(n, h); };
