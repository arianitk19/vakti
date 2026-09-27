// Persistent player: lives outside the routed view so playback survives navigation.
// Audio: native <audio> with custom controls. YouTube: the YouTube IFrame Player API driven by
// our own custom controls, so playback *feels* fully in-app — the video still streams from
// YouTube's servers (their terms, and we have no rights to re-host the lectures), but the visible
// transport bar, seek/time/speed/volume, mini/full states etc. are all ours, not YouTube's chrome.
// If the API itself can't load (offline, blocked), we fall back honestly to a plain YouTube embed
// and say so — never pretend a control works when it doesn't.
import { $, esc, icon, pad } from '../utils/dom.js';
import { t } from '../i18n/index.js';
import { actions } from '../core/actions.js';
import { TransitionManager } from '../core/transition.js';

let item = null, mode = 'hidden', audio = null, yt = null, pollTimer = null;
const root = () => $('#player');
const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}` : '0:00');
const $$ = (id) => document.getElementById(id);

export function parseSource(url) {
  let u; try { u = new URL(url, location.href); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const h = u.hostname.replace(/^www\.|^m\./, '');
  let ytId = null;
  if (h === 'youtu.be') ytId = u.pathname.slice(1).split('/')[0];
  else if (h === 'youtube.com' || h === 'music.youtube.com') {
    ytId = u.searchParams.get('v') || (/^\/(embed|shorts|live)\//.test(u.pathname) ? u.pathname.split('/')[2] : null);
  }
  if (ytId && /^[\w-]{11}$/.test(ytId)) return { type: 'youtube', id: ytId, thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`, url: `https://www.youtube.com/watch?v=${ytId}` };
  if (/\.(mp3|m4a|aac|ogg|oga|wav|opus)(\?|#|$)/i.test(u.pathname)) return { type: 'audio', url: u.href };
  return { type: 'external', url: u.href };
}

/* ---------- YouTube IFrame API loader (lazy, once) ---------- */
let ytApiPromise = null;
function loadYTApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  ytApiPromise ||= new Promise((resolve, reject) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prevReady?.(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { ytApiPromise = null; reject(new Error('yt-api-script-failed')); };
    document.head.appendChild(s);
    setTimeout(() => { if (!window.YT?.Player) { ytApiPromise = null; reject(new Error('yt-api-timeout')); } }, 9000);
  });
  return ytApiPromise;
}

const mediaHTML = () => {
  if (!item) return '';
  if (item.sourceType === 'youtube') {
    return `<div id="yt-target" class="w-full h-full"></div>
      <div id="yt-loading" class="absolute inset-0 grid place-items-center bg-accent-soft text-accent" role="status">${icon('loader-circle', 'w-6 h-6 animate-spin')}</div>`;
  }
  return item.thumbnail ? `<img src="${esc(item.thumbnail)}" alt="" class="w-full h-full object-cover rounded-lg" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="grid place-items-center w-full h-full rounded-lg bg-accent-soft text-accent">${icon('headphones', 'w-8 h-8')}</span>`;
};

function build() {
  const r = root(); if (!r || !item) return;
  const isYoutube = item.sourceType === 'youtube';
  r.dataset.kind = item.sourceType;
  r.innerHTML = `
    <div class="pl-backdrop" data-a="player-min"></div>
    <section class="pl-card" role="region" aria-label="${esc(t('player.label'))}">
      <div class="pl-media" id="pl-media">${mediaHTML()}</div>
      <div class="pl-info">
        <p class="pl-title">${esc(item.title)}</p>
        <p class="pl-sub">${esc(item.speaker || '')}</p>
        <p class="pl-ext"><span class="badge badge-upcoming">${icon('external-link', 'w-3 h-3')}${esc(t(item.sourceType === 'audio' && !/^https?:/.test(item.source) ? 'lec.local' : 'lec.external'))}</span></p>
      </div>
      <div class="pl-mini-ctl">
        <button class="btn-icon" data-a="player-toggle" aria-label="${esc(t('player.play'))}" id="pl-toggle-mini">${icon('play', 'w-5 h-5')}</button>
        <button class="btn-icon" data-a="player-max" aria-label="${esc(t('player.expand'))}">${icon('maximize-2', 'w-5 h-5')}</button>
        <button class="btn-icon" data-a="player-close" aria-label="${esc(t('common.close'))}">${icon('x', 'w-5 h-5')}</button></div>
      <div class="pl-full-ctl">
        <div class="flex items-center gap-3"><span class="text-xs tabular-nums w-10" id="pl-cur">0:00</span>
          <input type="range" id="pl-seek" class="range flex-1" min="0" max="100" step="0.1" value="0" aria-label="${esc(t('player.seek'))}"><span class="text-xs tabular-nums w-10 text-right" id="pl-dur">0:00</span></div>
        <div class="flex items-center justify-center gap-3 mt-3">
          <button class="btn-icon" data-a="player-skip" data-s="-15" aria-label="${esc(t('player.back15'))}">${icon('skip-back', 'w-5 h-5')}</button>
          <button class="tap-round !h-16 !w-16" data-a="player-toggle" id="pl-toggle" aria-label="${esc(t('player.play'))}">${icon('play', 'w-7 h-7')}</button>
          <button class="btn-icon" data-a="player-skip" data-s="15" aria-label="${esc(t('player.fwd15'))}">${icon('skip-forward', 'w-5 h-5')}</button></div>
        <div class="mt-3 flex items-center gap-4 justify-between">
          <label class="flex items-center gap-2 text-sm">${icon('gauge', 'w-4 h-4')}<select class="input !py-1 !w-auto" id="pl-speed" aria-label="${esc(t('player.speed'))}">${[0.75, 1, 1.25, 1.5, 2].map((s) => `<option value="${s}" ${s === 1 ? 'selected' : ''}>${s}×</option>`).join('')}</select></label>
          <label class="flex items-center gap-2 text-sm flex-1 max-w-[180px]">${icon('volume-2', 'w-4 h-4')}<input type="range" id="pl-vol" class="range flex-1" min="0" max="1" step="0.05" value="1" aria-label="${esc(t('player.volume'))}"></label></div>
        <p class="text-xs text-danger mt-2 hidden" id="pl-err" role="alert">${esc(t(isYoutube ? 'player.ytError' : 'player.error'))}</p>
        <p class="text-xs text-muted mt-2 hidden" id="pl-fallback-note" role="status">${esc(t('player.ytNote'))}</p>
        <div class="mt-4 flex items-center justify-between gap-2">
          <a class="btn btn-ghost btn-sm" href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">${icon('external-link', 'w-4 h-4')}${esc(t('player.openSource'))}</a>
          <div class="flex gap-1"><button class="btn-icon" data-a="player-min" aria-label="${esc(t('player.minimize'))}">${icon('minimize-2', 'w-5 h-5')}</button>
          <button class="btn-icon" data-a="player-close" aria-label="${esc(t('common.close'))}">${icon('x', 'w-5 h-5')}</button></div></div>
      </div>
    </section>`;
  if (item.sourceType === 'audio') wireAudio(); else wireYouTube();
}

function setToggleIcon(playing) {
  ['pl-toggle', 'pl-toggle-mini'].forEach((id) => { const b = $$(id); if (b) { b.innerHTML = icon(playing ? 'pause' : 'play', id === 'pl-toggle' ? 'w-7 h-7' : 'w-5 h-5'); b.setAttribute('aria-label', t(playing ? 'player.pause' : 'player.play')); } });
}

function wireMediaSession(handlers) {
  if (!('mediaSession' in navigator) || !item) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: item.title, artist: item.speaker || '' });
  navigator.mediaSession.setActionHandler('play', handlers.play);
  navigator.mediaSession.setActionHandler('pause', handlers.pause);
}

/* ---------- audio ---------- */
function wireAudio() {
  audio ||= new Audio();
  audio.preload = 'metadata';
  audio.src = item.source;
  audio.onloadedmetadata = () => { $$('pl-dur') && ($$('pl-dur').textContent = fmt(audio.duration)); };
  audio.ontimeupdate = () => {
    if (!$$('pl-seek')) return;
    $$('pl-cur').textContent = fmt(audio.currentTime);
    if (audio.duration) $$('pl-seek').value = (audio.currentTime / audio.duration) * 100;
  };
  audio.onplay = () => setToggleIcon(true); audio.onpause = () => setToggleIcon(false); audio.onended = () => setToggleIcon(false);
  audio.onerror = () => { $$('pl-err')?.classList.remove('hidden'); setToggleIcon(false); };
  $$('pl-seek').oninput = (e) => { if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration; };
  $$('pl-speed').onchange = (e) => { audio.playbackRate = +e.target.value; };
  $$('pl-vol').oninput = (e) => { audio.volume = +e.target.value; };
  audio.play().catch(() => setToggleIcon(false));
  wireMediaSession({ play: () => audio.play(), pause: () => audio.pause() });
}

/* ---------- youtube (custom in-app controls via IFrame Player API) ---------- */
function stopPoll() { clearInterval(pollTimer); pollTimer = null; }
function startPoll() {
  stopPoll();
  pollTimer = setInterval(() => {
    if (!yt?.getCurrentTime || !$$('pl-seek')) return;
    const d = yt.getDuration() || 0, c = yt.getCurrentTime() || 0;
    $$('pl-cur').textContent = fmt(c); $$('pl-dur').textContent = fmt(d);
    if (d) $$('pl-seek').value = (c / d) * 100;
  }, 400);
}

function setupYtControls() {
  $$('pl-dur') && ($$('pl-dur').textContent = fmt(yt.getDuration() || 0));
  $$('pl-seek').oninput = (e) => { const d = yt.getDuration(); if (d) yt.seekTo((e.target.value / 100) * d, true); };
  $$('pl-speed').onchange = (e) => { yt.setPlaybackRate(+e.target.value); };
  $$('pl-vol').oninput = (e) => { yt.setVolume(Math.round(e.target.value * 100)); };
  wireMediaSession({ play: () => yt.playVideo(), pause: () => yt.pauseVideo() });
}

function ytFallbackToPlainEmbed() {
  const box = $$('pl-media'); if (!box || !item) return;
  const id = item.videoId || parseSource(item.source)?.id;
  box.innerHTML = `<iframe class="w-full h-full rounded-lg" src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1" title="${esc(item.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  $$('pl-fallback-note')?.classList.remove('hidden');
  $$('pl-seek') && ($$('pl-seek').disabled = true);
  $$('pl-speed') && ($$('pl-speed').disabled = true);
  $$('pl-vol') && ($$('pl-vol').disabled = true);
}

async function wireYouTube() {
  const mine = item;
  let YTns;
  try { YTns = await loadYTApi(); } catch { if (item === mine) ytFallbackToPlainEmbed(); return; }
  if (item !== mine || !$$('yt-target')) return; // superseded by navigation/close before the API loaded
  try {
    yt = new YTns.Player('yt-target', {
      videoId: mine.videoId || parseSource(mine.source)?.id,
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, iv_load_policy: 3, playsinline: 1, fs: 0, origin: location.origin },
      events: {
        onReady: () => { if (item !== mine) return; $$('yt-loading')?.remove(); setupYtControls(); },
        onStateChange: (e) => {
          if (item !== mine) return;
          const S = YTns.PlayerState;
          if (e.data === S.PLAYING) { setToggleIcon(true); startPoll(); }
          else if (e.data === S.PAUSED || e.data === S.ENDED) { setToggleIcon(false); stopPoll(); }
        },
        onError: () => { if (item === mine) { $$('pl-err')?.classList.remove('hidden'); $$('yt-loading')?.remove(); } }
      }
    });
  } catch { if (item === mine) ytFallbackToPlainEmbed(); }
}

function setMode(m) {
  mode = m;
  const r = root(); if (!r) return;
  r.dataset.mode = m;
  document.documentElement.classList.toggle('has-mini', m === 'mini');
  document.documentElement.classList.toggle('player-full', m === 'full');
}

export function playLecture(it) {
  if (item && item.id === it.id && mode !== 'hidden') { setMode('full'); return; }
  stop();
  item = it; build(); setMode('full');
  const card = root().querySelector('.pl-card'); if (card) TransitionManager.pop(card);
}
function stop() {
  stopPoll();
  if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  if (yt) { try { yt.destroy(); } catch { /* noop */ } yt = null; }
}
export function closePlayer() { stop(); item = null; const r = root(); if (r) r.innerHTML = ''; setMode('hidden'); if ('mediaSession' in navigator) navigator.mediaSession.metadata = null; }
export const playerActive = () => !!item;

actions['player-min'] = () => setMode('mini');
actions['player-max'] = () => setMode('full');
actions['player-close'] = closePlayer;
actions['player-toggle'] = () => {
  if (!item) return;
  if (item.sourceType === 'audio') { if (audio) (audio.paused ? audio.play() : audio.pause()); return; }
  if (yt?.getPlayerState) { const S = window.YT?.PlayerState; yt.getPlayerState() === S?.PLAYING ? yt.pauseVideo() : yt.playVideo(); }
};
actions['player-skip'] = (el) => {
  if (!item) return;
  const s = +el.dataset.s;
  if (item.sourceType === 'audio') { if (audio) audio.currentTime = Math.max(0, Math.min(audio.duration || 1e9, audio.currentTime + s)); return; }
  if (yt?.getCurrentTime) { const d = yt.getDuration() || 1e9; yt.seekTo(Math.max(0, Math.min(d, yt.getCurrentTime() + s)), true); }
};
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mode === 'full' && !document.documentElement.classList.contains('sheet-open')) setMode('mini'); });
