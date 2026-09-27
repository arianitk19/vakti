import { esc, icon } from '../utils/dom.js';
import { t, lang } from '../i18n/index.js';
import { store } from '../core/store.js';
import { actions } from '../core/actions.js';
import { pageHeader } from '../components/common.js';
import { currentCoords, detect } from '../services/locationService.js';
import { bearing, distanceKm, Compass, compassSupported, needsGesture } from '../services/qiblaService.js';
import { haptic } from '../services/personalService.js';
import { toast } from '../components/ui.js';
import { fmtNum } from '../utils/tz.js';

let compass = null, state = 'idle', heading = null, aligned = false, raf = 0;
const num = fmtNum;

function dialSVG(b) {
  const ticks = [...Array(72)].map((_, i) => {
    const major = i % 9 === 0, a = i * 5;
    return `<line x1="150" y1="${major ? 14 : 20}" x2="150" y2="26" transform="rotate(${a} 150 150)" stroke="currentColor" stroke-width="${major ? 2 : 1}" opacity="${major ? 0.7 : 0.3}"/>`;
  }).join('');
  const lab = (l, a) => `<text x="150" y="52" text-anchor="middle" transform="rotate(${a} 150 150)" class="fill-current" font-size="15" font-weight="700" opacity="${l === 'N' ? 1 : 0.6}">${l}</text>`;
  return `<svg viewBox="0 0 300 300" class="w-full h-full" role="img" aria-label="${esc(t('qibla.dialLabel', { deg: Math.round(b) }))}">
    <circle cx="150" cy="150" r="140" fill="none" stroke="var(--line)" stroke-width="1.5"/>
    <g id="qibla-dial" style="transform-origin:150px 150px;transition:transform .15s linear">
      ${ticks}${lab('N', 0)}${lab('E', 90)}${lab('S', 180)}${lab('W', 270)}
      <g transform="rotate(${b.toFixed(2)} 150 150)"><line x1="150" y1="150" x2="150" y2="70" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
        <rect x="139" y="62" width="22" height="22" rx="4" fill="var(--accent)"/><rect x="143" y="66" width="14" height="14" rx="2" fill="var(--on-accent)" opacity=".9"/></g>
    </g>
    <path d="M150 6 L158 24 L142 24 Z" fill="var(--ink)"/><circle cx="150" cy="150" r="5" fill="var(--ink)"/></svg>`;
}

function panel() {
  const c = currentCoords(); const b = bearing(c); const km = distanceKm(c);
  const msgs = {
    idle: compassSupported() ? '' : t('qibla.unsupported'),
    unsupported: t('qibla.unsupported'), denied: t('qibla.denied'), 'no-data': t('qibla.noData'),
    waiting: t('qibla.waiting'), active: ''
  };
  const needBtn = compassSupported() && ['idle', 'denied', 'no-data'].includes(state);
  return `<div class="grid gap-6 lg:grid-cols-2 items-start">
    <div class="card p-6 flex flex-col items-center">
      <div class="relative w-full max-w-[340px] aspect-square text-ink">${dialSVG(b)}</div>
      <p class="mt-4 text-sm font-medium h-6 ${state === 'active' ? '' : 'text-muted'}" id="qibla-status" role="status" aria-live="polite">${state === 'active' ? esc(t('qibla.turn')) : ''}</p>
      ${msgs[state] ? `<p class="text-sm text-muted text-center max-w-sm mt-1 leading-relaxed" ${state === 'denied' || state === 'no-data' || state === 'unsupported' ? 'role="alert"' : ''}>${esc(msgs[state])}</p>` : ''}
      ${needBtn ? `<button class="btn btn-primary mt-4" data-a="compass-start">${icon('navigation', 'w-4 h-4')}${esc(t('qibla.enable'))}</button>` : ''}
    </div>
    <div class="grid gap-3">
      <div class="card p-5"><p class="text-xs uppercase tracking-wider text-muted">${esc(t('qibla.direction'))}</p>
        <p class="text-5xl font-bold tabular-nums mt-1">${b.toFixed(1)}°</p><p class="text-sm text-muted mt-1">${esc(t('qibla.fromNorth'))}</p></div>
      <div class="card p-5 flex items-center justify-between"><div><p class="text-xs uppercase tracking-wider text-muted">${esc(t('qibla.distance'))}</p>
        <p class="text-2xl font-semibold tabular-nums mt-1">${num(km)} km</p></div><span class="text-accent">${icon('map-pin', 'w-6 h-6')}</span></div>
      <div class="card p-5 text-sm"><p class="font-medium">${esc(c.source === 'gps' ? t('qibla.srcGps') : t('qibla.srcCity'))}</p>
        <p class="text-muted mt-1 tabular-nums">${c.lat.toFixed(3)}, ${c.lon.toFixed(3)}</p>
        <div class="mt-3 flex flex-wrap gap-2"><button class="btn btn-ghost btn-sm" data-a="qibla-gps">${icon('map-pin', 'w-4 h-4')}${esc(t('qibla.useGps'))}</button>
        ${c.source === 'gps' ? `<button class="btn btn-ghost btn-sm" data-a="qibla-city">${esc(t('qibla.useCity'))}</button>` : ''}</div>
        <p class="text-xs text-muted mt-3 leading-relaxed">${esc(t('qibla.note'))}</p></div>
    </div></div>`;
}

function paint() {
  const root = document.getElementById('qibla-root');
  if (root) root.innerHTML = panel();
  applyHeading();
}
function applyHeading() {
  const dial = document.getElementById('qibla-dial');
  if (dial && heading != null) dial.style.transform = `rotate(${(-heading).toFixed(1)}deg)`;
  const st = document.getElementById('qibla-status');
  if (st && heading != null && state === 'active') {
    const b = bearing(currentCoords());
    const diff = ((b - heading + 540) % 360) - 180;
    const ok = Math.abs(diff) <= 3;
    st.textContent = ok ? t('qibla.aligned') : t(diff > 0 ? 'qibla.turnRight' : 'qibla.turnLeft', { deg: Math.abs(Math.round(diff)) });
    st.className = 'mt-4 text-sm font-semibold h-6 ' + (ok ? 'text-success' : '');
    if (ok && !aligned) haptic([20, 40, 20]);
    aligned = ok;
  }
}

function startCompass() {
  compass?.stop();
  compass = new Compass((h) => { heading = h; cancelAnimationFrame(raf); raf = requestAnimationFrame(applyHeading); },
    (s) => { const changed = s !== state; state = s; if (changed) paint(); });
  return compass.start();
}

export const qibla = {
  title: 'nav.qibla',
  render() {
    state = compassSupported() ? 'idle' : 'unsupported'; heading = null; aligned = false;
    return pageHeader(t('nav.qibla'), esc(t('qibla.sub')), '', 'more') + `<div id="qibla-root">${panel()}</div>`;
  },
  mount() {
    if (compassSupported() && !needsGesture()) startCompass();
    return () => { compass?.stop(); compass = null; cancelAnimationFrame(raf); };
  }
};

actions['compass-start'] = () => startCompass();
actions['qibla-gps'] = async (el) => {
  el.disabled = true;
  const r = await detect();
  if (r.coords) { store.set('loc', { mode: 'gps', coords: r.coords }); toast(t('qibla.gpsOk')); }
  else toast(t('loc.err.' + r.reason));
  paint();
};
actions['qibla-city'] = () => { store.set('loc', { mode: 'city', coords: null }); paint(); };
