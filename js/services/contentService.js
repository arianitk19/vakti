// Content sources (JSON). Swap these fetches for a backend later without touching the UI.
import { storage } from './storageService.js';

const memo = new Map();
async function json(path) {
  if (memo.has(path)) return memo.get(path);
  const p = fetch(path).then((r) => { if (!r.ok) throw new Error(path); return r.json(); });
  memo.set(path, p);
  try { return await p; } catch (e) { memo.delete(path); throw e; }
}

export const content = {
  duas: () => json('data/duas.json'),
  dhikr: () => json('data/dhikr.json'),
  /** Bundled lectures + lectures the user added on this device. Nothing is invented. */
  async lectures() {
    let base = []; try { base = await json('data/lectures.json'); } catch { /* optional */ }
    return [...base.map((x) => ({ ...x, local: false })), ...storage.get('lectures', []).map((x) => ({ ...x, local: true }))];
  },
  scholars: async () => { try { return await json('data/scholars.json'); } catch { return []; } }
};

export const userLectures = {
  all: () => storage.get('lectures', []),
  add(item) { const a = this.all(); a.unshift(item); storage.set('lectures', a); },
  remove(id) { storage.set('lectures', this.all().filter((x) => x.id !== id)); }
};
