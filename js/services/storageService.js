// StorageService: small settings in localStorage (sync), larger caches in IndexedDB (async).
// Nothing here ever leaves the device.
const PREFIX = 'vakt:';

const ls = {
  ok: (() => { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; } catch { return false; } })(),
  mem: new Map()
};

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = ls.ok ? localStorage.getItem(PREFIX + key) : ls.mem.get(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    const raw = JSON.stringify(value);
    try { ls.ok ? localStorage.setItem(PREFIX + key, raw) : ls.mem.set(key, raw); return true; } catch { return false; }
  },
  remove(key) { try { ls.ok ? localStorage.removeItem(PREFIX + key) : ls.mem.delete(key); } catch { /* noop */ } },
  keys() {
    if (!ls.ok) return [...ls.mem.keys()];
    const out = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length)); }
    return out;
  },
  exportAll() {
    const o = {};
    this.keys().forEach((k) => { o[k] = this.get(k); });
    return o;
  },
  async clearAll() {
    this.keys().forEach((k) => this.remove(k));
    try { await idb.clear(); } catch { /* noop */ }
  }
};

// ---- IndexedDB key/value ----
let dbp;
function db() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('no-idb'));
  dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('vakt', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
const tx = async (mode, fn) => {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction('kv', mode); const req = fn(t.objectStore('kv'));
    t.oncomplete = () => res(req?.result); t.onerror = () => rej(t.error);
  });
};
export const idb = {
  get: (k) => tx('readonly', (s) => s.get(k)).catch(() => undefined),
  set: (k, v) => tx('readwrite', (s) => s.put(v, k)).catch(() => undefined),
  del: (k) => tx('readwrite', (s) => s.delete(k)).catch(() => undefined),
  clear: () => tx('readwrite', (s) => s.clear()).catch(() => undefined)
};
