// First-run flow: welcome → language → location → calculation method → done. Skippable, changeable later.
import { esc, icon } from '../utils/dom.js';
import { t, setLang, lang } from '../i18n/index.js';
import { store } from '../core/store.js';
import { CITIES, cityById } from '../services/cities.js';
import { detect } from '../services/locationService.js';
import { KosovoPrayerService } from '../services/kosovoPrayerService.js';
import { logoSVG } from './layout.js';
import { TransitionManager } from '../core/transition.js';

export function runOnboarding(onDone) {
  const host = document.getElementById('onboarding');
  host.classList.remove('hidden');
  let step = 0, gps = null;
  const steps = 4;

  const finish = () => { store.set('onboarded', true); host.classList.add('hidden'); host.innerHTML = ''; document.removeEventListener('keydown', trap); onDone(); };
  const trap = (e) => {
    if (e.key !== 'Tab') return;
    const f = [...host.querySelectorAll('button:not([disabled]),select,a[href]')].filter((x) => x.offsetParent !== null);
    if (!f.length) return; const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  };
  document.addEventListener('keydown', trap);

  function content() {
    if (step === 0) return `<div class="text-center"><div class="mx-auto w-20 h-20 mb-8">${logoSVG()}</div>
      <h1 id="ob-t" class="text-3xl font-bold tracking-tight">${esc(t('ob.welcome'))}</h1>
      <p class="text-muted mt-3 leading-relaxed">${esc(t('ob.welcomeText'))}</p></div>`;
    if (step === 1) return `<h1 id="ob-t" class="text-2xl font-bold tracking-tight">${esc(t('ob.language'))}</h1><p class="text-muted mt-2">${esc(t('ob.languageText'))}</p>
      <div class="grid gap-3 mt-6" role="radiogroup" aria-labelledby="ob-t">${[['sq', 'Shqip'], ['en', 'English']].map(([id, l]) => `<button role="radio" aria-checked="${lang() === id}" class="card p-4 flex items-center gap-3 text-left ${lang() === id ? 'ring-2 ring-accent' : ''}" data-l="${id}"><span class="flex-1 font-semibold">${l}</span>${lang() === id ? icon('circle-check', 'w-5 h-5 text-accent') : ''}</button>`).join('')}</div>`;
    if (step === 2) {
      const c = cityById(store.get('city'));
      return `<h1 id="ob-t" class="text-2xl font-bold tracking-tight">${esc(t('ob.where'))}</h1>
        <p class="text-muted mt-2 leading-relaxed">${esc(t('loc.why'))}</p>
        <button class="btn btn-primary w-full mt-6" data-gps ${gps === 'busy' ? 'disabled' : ''}>${icon(gps === 'busy' ? 'loader-circle' : 'map-pin', 'w-4 h-4 ' + (gps === 'busy' ? 'animate-spin' : ''))}${esc(t('ob.useLocation'))}</button>
        ${gps && gps !== 'busy' ? `<p class="text-sm mt-3 ${gps.ok ? 'text-success' : 'text-danger'}" role="status">${esc(gps.ok ? t('loc.detected', { city: gps.city.name }) : t('loc.err.' + gps.reason))}</p>` : ''}
        <p class="text-center text-xs text-muted my-4">${esc(t('ob.or'))}</p>
        <label class="grid gap-1.5 text-sm font-medium">${esc(t('ob.pickCity'))}<select class="input" data-city>${CITIES.map((x) => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>`;
    }
    const cm = KosovoPrayerService.meta?.calculation;
    return `<h1 id="ob-t" class="text-2xl font-bold tracking-tight">${esc(t('ob.method'))}</h1><p class="text-muted mt-2 leading-relaxed">${esc(t('ob.methodText'))}</p>
      <div class="card p-4 mt-6"><p class="font-semibold">${esc(t('set.methodValue'))}</p>
        <dl class="text-sm grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 mt-3"><dt class="text-muted">${esc(t('prayer.fajr'))}</dt><dd>${cm ? cm.fajr_angle : 18}°</dd><dt class="text-muted">${esc(t('prayer.isha'))}</dt><dd>${cm ? cm.isha_angle : 17}°</dd><dt class="text-muted">${esc(t('set.asr'))}</dt><dd>${esc(t('set.asrVal'))}</dd></dl></div>
      <p class="text-xs text-muted mt-3 leading-relaxed">${esc(t('prayer.sourceLong'))}</p>`;
  }

  function paint() {
    const last = step === steps - 1;
    host.innerHTML = `<div class="min-h-dvh flex flex-col items-center justify-center p-5"><div class="w-full max-w-md" role="dialog" aria-modal="true" aria-labelledby="ob-t">
      <div id="ob-body" class="min-h-[300px]">${content()}</div>
      <div class="flex items-center justify-center gap-1.5 my-6" aria-hidden="true">${[...Array(steps)].map((_, i) => `<i class="h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-accent' : 'w-1.5 bg-line'}"></i>`).join('')}</div>
      <div class="flex items-center gap-3">${step > 0 ? `<button class="btn btn-ghost" data-back>${esc(t('common.back'))}</button>` : ''}
        <button class="btn btn-primary flex-1" data-next data-autofocus>${esc(last ? t('ob.start') : t('ob.continue'))}</button></div>
      <button class="block mx-auto mt-4 text-sm text-muted underline min-h-[44px]" data-skip>${esc(t('ob.skip'))}</button></div></div>`;
    host.querySelector('[data-next]').focus({ preventScroll: true });
  }
  const go = (n) => { const b = host.querySelector('#ob-body'); step = n; if (!b) return paint(); TransitionManager.swap(b, () => () => { paint(); }, { fadeOnly: true }); };

  host.onclick = async (e) => {
    if (e.target.closest('[data-next]')) return step === steps - 1 ? finish() : go(step + 1);
    if (e.target.closest('[data-back]')) return go(step - 1);
    if (e.target.closest('[data-skip]')) return finish();
    const l = e.target.closest('[data-l]');
    if (l) { store.set('lang', l.dataset.l); setLang(l.dataset.l); paint(); return; }
    if (e.target.closest('[data-gps]')) {
      gps = 'busy'; paint();
      const r = await detect(); gps = r;
      if (r.ok) { store.set('city', r.city.id); store.set('loc', { mode: 'gps', coords: r.coords }); }
      paint();
    }
  };
  host.onchange = (e) => { if (e.target.matches('[data-city]')) { store.set('city', e.target.value); store.set('loc', { mode: 'city', coords: null }); } };
  paint();
}
