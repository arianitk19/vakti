import { esc, icon, download } from '../utils/dom.js';
import { t, lang } from '../i18n/index.js';
import { store } from '../core/store.js';
import { actions, changes } from '../core/actions.js';
import { pageHeader, segmented } from '../components/common.js';
import { CITIES, cityById } from '../services/cities.js';
import { detect, gpsSupported, currentCity } from '../services/locationService.js';
import { KosovoPrayerService, PRAYERS } from '../services/kosovoPrayerService.js';
import { notifSupported, permission, request, reschedule, test } from '../services/notificationService.js';
import { canInstall, install, isStandalone, isIOS } from '../services/installService.js';
import { storage } from '../services/storageService.js';
import { confirmSheet, toast } from '../components/ui.js';
import { kosovoParts, dateKey } from '../utils/tz.js';

const sec = (id, title, ic, body) => `<section id="set-${id}" class="card p-5 mb-4 scroll-mt-24"><h2 class="font-semibold flex items-center gap-2 mb-4">${icon(ic, 'w-5 h-5 text-accent')}${esc(title)}</h2>${body}</section>`;
const row = (label, control, help = '') => `<div class="flex items-center justify-between gap-4 py-2 min-h-[44px]"><div class="min-w-0"><p class="text-sm font-medium">${esc(label)}</p>${help ? `<p class="text-xs text-muted mt-0.5 leading-relaxed">${help}</p>` : ''}</div><div class="shrink-0">${control}</div></div>`;
const sw = (ch, on, dis = false, label = '') => `<input type="checkbox" class="switch" data-ch="${ch}" aria-label="${esc(label)}" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}>`;

function body() {
  const n = store.get('notif'); const perm = permission();
  const meta = KosovoPrayerService.meta; const cm = meta?.calculation;
  const city = currentCity();
  const notifHelp = !notifSupported() ? t('set.notifUnsupported') : perm === 'denied' ? t('set.notifDenied') : t('set.notifNote');
  const install_ = isStandalone() ? `<p class="text-sm text-muted flex items-center gap-2">${icon('circle-check', 'w-4 h-4 text-success')}${esc(t('install.installed'))}</p>`
    : canInstall() ? `<button class="btn btn-primary" data-a="install-settings">${icon('download', 'w-4 h-4')}${esc(t('install.button'))}</button>`
    : isIOS() ? `<p class="text-sm text-muted leading-relaxed">${esc(t('install.ios'))}</p>` : `<p class="text-sm text-muted leading-relaxed">${esc(t('install.other'))}</p>`;

  return `
  ${sec('appearance', t('set.appearance'), 'palette', segmented([{ id: 'light', label: t('set.light') }, { id: 'dark', label: t('set.dark') }, { id: 'system', label: t('set.system') }], store.get('theme'), 'set-theme', t('set.appearance')))}
  ${sec('language', t('set.language'), 'languages', segmented([{ id: 'sq', label: 'Shqip' }, { id: 'en', label: 'English' }], lang(), 'set-lang', t('set.language')))}
  ${sec('location', t('set.location'), 'map-pin', `
    <label class="grid gap-1.5 text-sm">${esc(t('set.city'))}<select class="input" data-ch="set-city" aria-label="${esc(t('set.city'))}">${CITIES.map((c) => `<option value="${c.id}" ${c.id === store.get('city') ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <p class="text-xs text-muted mt-2 leading-relaxed">${esc(city.offsetKey ? t('prayers.cityOffset', { city: city.name, off: (KosovoPrayerService.offsetFor(city) > 0 ? '+' : '') + KosovoPrayerService.offsetFor(city) }) : t('prayers.cityBase', { city: city.name }))}</p>
    ${gpsSupported() ? `<button class="btn btn-ghost mt-3" data-a="set-gps">${icon('map-pin', 'w-4 h-4')}${esc(t('set.useGps'))}</button><p class="text-xs text-muted mt-2">${esc(t('loc.why'))}</p><p class="text-sm mt-2 hidden" data-gps-msg role="status"></p>` : `<p class="text-sm text-muted mt-3">${esc(t('loc.err.unsupported'))}</p>`}`)}
  ${sec('prayer', t('set.prayer'), 'clock', `
    ${row(t('set.source'), '', esc(t('prayer.sourceLong')))}
    <dl class="text-sm grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 mt-1">
      <dt class="text-muted">${esc(t('set.method'))}</dt><dd>${esc(t('set.methodValue'))}</dd>
      <dt class="text-muted">${esc(t('prayer.fajr'))}</dt><dd>${cm ? cm.fajr_angle + '°' : '—'}</dd>
      <dt class="text-muted">${esc(t('prayer.isha'))}</dt><dd>${cm ? cm.isha_angle + '°' : '—'}</dd>
      <dt class="text-muted">${esc(t('prayer.imsak'))}</dt><dd>${cm ? esc(t('set.imsakVal', { n: cm.fajr_offset_from_imsak })) : '—'}</dd>
      <dt class="text-muted">${esc(t('set.asr'))}</dt><dd>${esc(t('set.asrVal'))}</dd>
      <dt class="text-muted">${esc(t('set.highLat'))}</dt><dd>${esc(t('set.highLatVal'))}</dd>
      <dt class="text-muted">${esc(t('set.reference'))}</dt><dd>${esc(meta?.referenceCity || 'Deçan')}</dd></dl>
    <p class="text-xs text-muted mt-4 leading-relaxed">${esc(t('set.methodFixed'))}</p>
    <p class="text-xs text-muted mt-2 leading-relaxed">${esc(t('set.attribution'))} <a class="underline" href="${esc(meta?.repo || '#')}" target="_blank" rel="noopener noreferrer">drilonjaha/kohet-e-namazit-kosove-json</a> · <a class="underline" href="${esc(meta?.sourceUrl || '#')}" target="_blank" rel="noopener noreferrer">${esc(t('set.officialPdf'))}</a> · ${esc(meta?.license || '')}</p>`)}
  ${sec('notifications', t('set.notifications'), 'bell', `
    ${row(t('set.notifEnable'), sw('notif-enable', n.enabled && perm === 'granted', !notifSupported() || perm === 'denied', t('set.notifEnable')), esc(notifHelp))}
    <div class="${n.enabled && perm === 'granted' ? '' : 'opacity-50 pointer-events-none'}" ${n.enabled && perm === 'granted' ? '' : 'aria-disabled="true"'}>
      <p class="text-sm font-medium mt-3 mb-1">${esc(t('set.notifWhich'))}</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-1">${PRAYERS.map((k) => `<label class="flex items-center gap-2 min-h-[44px] text-sm"><input type="checkbox" class="chk" data-ch="notif-prayer" data-k="${k}" ${n.prayers[k] ? 'checked' : ''}>${esc(t('prayer.' + k))}</label>`).join('')}</div>
      <label class="grid gap-1.5 text-sm mt-3">${esc(t('set.notifLead'))}<select class="input" data-ch="notif-lead">${[0, 5, 10, 15].map((m) => `<option value="${m}" ${n.lead === m ? 'selected' : ''}>${m === 0 ? esc(t('set.atTime')) : esc(t('set.minBefore', { n: m }))}</option>`).join('')}</select></label>
      <button class="btn btn-ghost mt-3" data-a="notif-test">${icon('bell', 'w-4 h-4')}${esc(t('set.notifTest'))}</button></div>
    <p class="text-xs text-muted mt-3 leading-relaxed flex gap-2">${icon('info', 'w-4 h-4 shrink-0 mt-0.5')}${esc(t('set.notifHonest'))}</p>`)}
  ${sec('home', t('set.home'), 'layout-grid', `<button class="btn btn-ghost" data-a="widgets-edit">${icon('layout-grid', 'w-4 h-4')}${esc(t('home.customize'))}</button>`)}
  ${sec('accessibility', t('set.accessibility'), 'accessibility', `
    <p class="text-sm font-medium mb-2">${esc(t('set.fontSize'))}</p>
    ${segmented([{ id: '0.9', label: 'A−' }, { id: '1', label: 'A' }, { id: '1.15', label: 'A+' }, { id: '1.3', label: 'A++' }], String(store.get('fontScale')), 'set-font', t('set.fontSize'))}
    ${row(t('set.reduceMotion'), sw('set-motion', store.get('motion') === 'reduce', false, t('set.reduceMotion')), esc(t('set.reduceMotionHelp')))}
    ${row(t('set.contrast'), sw('set-contrast', store.get('contrast'), false, t('set.contrast')))}
    ${row(t('set.vibrate'), sw('opt-vibrate', store.get('vibrate'), false, t('set.vibrate')))}
    ${row(t('set.sound'), sw('opt-sound', store.get('sound'), false, t('set.sound')), esc(t('set.soundHelp')))}`)}
  ${sec('install', t('install.title'), 'smartphone', install_)}
  ${sec('data', t('set.data'), 'database', `
    <p class="text-sm text-muted leading-relaxed mb-3">${esc(t('set.privacy'))}</p>
    <div class="flex flex-wrap gap-3"><button class="btn btn-ghost" data-a="data-export">${icon('file-down', 'w-4 h-4')}${esc(t('set.export'))}</button>
    <button class="btn btn-ghost text-danger" data-a="data-reset">${icon('trash-2', 'w-4 h-4')}${esc(t('set.reset'))}</button></div>`)}
  ${sec('about', t('set.about'), 'info', `<p class="text-sm">Vakt · v1.0.0</p>
    <p class="text-xs text-muted leading-relaxed mt-2">${esc(t('set.credits'))}</p>
    <p class="text-xs text-muted leading-relaxed mt-2">${esc(t('set.contentNote'))}</p>`)}`;
}

const repaint = () => { const r = document.getElementById('settings-root'); if (!r) return; const y = window.scrollY; r.innerHTML = body(); window.scrollTo(0, y); };

export const settings = {
  title: 'nav.settings',
  render() { return pageHeader(t('nav.settings'), '', '', 'more') + `<div id="settings-root" class="max-w-2xl">${body()}</div>`; },
  mount(root, route) {
    const id = route.params[0];
    if (id) setTimeout(() => document.getElementById('set-' + id)?.scrollIntoView({ block: 'start' }), 80);
    const off = store.on('lang', repaint);
    return off;
  }
};

actions['set-theme'] = (el) => { store.set('theme', el.dataset.v); repaint(); };
actions['set-lang'] = (el) => { store.set('lang', el.dataset.v); };
actions['set-font'] = (el) => { store.set('fontScale', +el.dataset.v); repaint(); };
changes['set-motion'] = (el) => store.set('motion', el.checked ? 'reduce' : 'system');
changes['set-contrast'] = (el) => store.set('contrast', el.checked);
changes['set-city'] = (el) => { store.set('city', el.value); store.set('loc', { mode: 'city', coords: null }); reschedule(); repaint(); toast(cityById(el.value).name); };
actions['set-gps'] = async (el) => {
  el.disabled = true;
  const r = await detect();
  const msg = document.querySelector('[data-gps-msg]');
  if (r.ok) {
    store.set('city', r.city.id); store.set('loc', { mode: 'gps', coords: r.coords }); reschedule(); repaint();
    const m2 = document.querySelector('[data-gps-msg]'); if (m2) { m2.textContent = t('loc.detected', { city: r.city.name }); m2.classList.remove('hidden'); }
  } else if (msg) { msg.textContent = t('loc.err.' + r.reason); msg.classList.remove('hidden'); el.disabled = false; }
};
changes['notif-enable'] = async (el) => {
  if (el.checked) {
    const p = permission() === 'granted' ? 'granted' : await request();
    if (p !== 'granted') { el.checked = false; store.patch('notif', { enabled: false }); toast(t('notif.denied')); repaint(); return; }
    store.patch('notif', { enabled: true });
  } else store.patch('notif', { enabled: false });
  reschedule(); repaint();
};
changes['notif-prayer'] = (el) => { const n = store.get('notif'); store.patch('notif', { prayers: { ...n.prayers, [el.dataset.k]: el.checked } }); reschedule(); };
changes['notif-lead'] = (el) => { store.patch('notif', { lead: +el.value }); reschedule(); };
actions['notif-test'] = () => test();
actions['install-settings'] = async () => { await install(); repaint(); };
actions['data-export'] = () => {
  const o = storage.exportAll(); delete o['prayers-cache'];
  download(`vakt-data-${dateKey(kosovoParts())}.json`, JSON.stringify({ app: 'vakt', exportedAt: new Date().toISOString(), data: o }, null, 2));
};
actions['data-reset'] = async () => {
  if (await confirmSheet({ title: t('set.reset'), text: t('set.resetConfirm'), confirm: t('set.resetYes'), danger: true })) {
    await storage.clearAll(); store.resetDefaults(); location.hash = '#home'; location.reload();
  }
};
