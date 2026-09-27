import sq from './sq.js';
import en from './en.js';

const dict = { sq, en };
let cur = 'sq';
const warned = new Set();

export const lang = () => cur;
export function setLang(l) { cur = dict[l] ? l : 'sq'; document.documentElement.lang = cur; }
export const languages = Object.keys(dict);

/** t('key', {var}) — falls back to Albanian, then to the key itself (never blank). */
export function t(key, vars) {
  let s = dict[cur][key] ?? dict.sq[key];
  if (s === undefined) { if (!warned.has(key)) { warned.add(key); console.warn('[i18n] missing', key); } return key; }
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}
