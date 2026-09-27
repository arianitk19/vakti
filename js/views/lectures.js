import { esc, icon, norm } from '../utils/dom.js';
import { t, lang } from '../i18n/index.js';
import { actions, inputs } from '../core/actions.js';
import { content, userLectures } from '../services/contentService.js';
import { favorites } from '../services/personalService.js';
import { pageHeader, emptyState, chips, errorState } from '../components/common.js';
import { Sheet, toast, confirmSheet } from '../components/ui.js';
import { parseSource, playLecture } from '../components/player.js';
import { fmtDate } from '../utils/tz.js';

export const LEC_CATS = ['akide', 'namazi', 'familja', 'edukimi', 'ramazani', 'xhumaja', 'morali', 'rinia', 'shoqeria', 'histori', 'keshilla'];
let all = [], cat = 'all', q = '', loaded = false;

const byDate = (a, b) => (b.date || b.added || '').localeCompare(a.date || a.added || '');

function thumb(l) {
  return l.thumbnail ? `<img src="${esc(l.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer" class="w-full h-full object-cover" onerror="this.remove()">`
    : `<span class="grid place-items-center w-full h-full text-accent">${icon('headphones', 'w-7 h-7')}</span>`;
}

function card(l, featured = false) {
  const fav = favorites.has('lectures', l.id);
  const meta = [l.speaker, l.duration, l.date && fmtDate({ y: +l.date.slice(0, 4), m: +l.date.slice(5, 7), d: +l.date.slice(8, 10) || 1 }, lang(), { day: 'numeric', month: 'short', year: 'numeric' })].filter(Boolean);
  return `<li class="card ${featured ? 'hero' : ''} overflow-hidden flex ${featured ? 'flex-col sm:flex-row' : ''}">
    <button class="flex-1 min-w-0 flex gap-3 p-3 text-left ${featured ? 'sm:p-5 flex-col sm:flex-row' : ''}" data-a="lec-play" data-id="${esc(l.id)}" aria-label="${esc(t('lec.play'))}: ${esc(l.title)}">
      <span class="relative ${featured ? 'w-full sm:w-56 aspect-video' : 'w-24 aspect-video'} shrink-0 rounded-lg overflow-hidden bg-accent-soft">${thumb(l)}<span class="absolute inset-0 grid place-items-center bg-black/25 text-white">${icon('play', 'w-6 h-6')}</span></span>
      <span class="min-w-0 flex-1"><span class="block font-semibold leading-snug ${featured ? 'text-lg' : 'line-clamp-2'}">${esc(l.title)}</span>
        <span class="block text-sm text-muted mt-1 truncate">${esc(meta.join(' · '))}</span>
        <span class="mt-2 flex flex-wrap gap-1.5"><span class="badge badge-upcoming">${esc(t('lcat.' + l.category))}</span>
          <span class="badge badge-passed">${icon('external-link', 'w-3 h-3')}${esc(l.local ? t('lec.addedByYou') : t('lec.external'))}</span></span></span></button>
    <div class="flex flex-col p-1"><button class="btn-icon ${fav ? 'text-accent' : ''}" data-a="fav" data-type="lectures" data-id="${esc(l.id)}" aria-pressed="${fav}" aria-label="${esc(fav ? t('saved.remove') : t('saved.add'))}">${icon('bookmark', 'w-5 h-5')}</button>
      ${l.local ? `<button class="btn-icon" data-a="lec-del" data-id="${esc(l.id)}" aria-label="${esc(t('common.delete'))}">${icon('trash-2', 'w-5 h-5')}</button>` : ''}</div></li>`;
}

function filtered() {
  const f = norm(q);
  return all.filter((l) => (cat === 'all' || l.category === cat) && (!f || norm([l.title, l.speaker, t('lcat.' + l.category), l.description].join(' ')).includes(f)));
}

function body() {
  if (!all.length) {
    return emptyState({ ic: 'headphones', title: t('lec.emptyTitle'), text: esc(t('lec.emptyText')),
      action: `<button class="btn btn-primary" data-a="lec-add">${icon('plus', 'w-4 h-4')}${esc(t('lec.add'))}</button>` });
  }
  const list = filtered().sort(byDate);
  const speakers = [...new Set(all.map((l) => l.speaker).filter(Boolean))];
  const feat = !q && cat === 'all' ? (list.find((l) => l.featured) || list[0]) : null;
  const rest = feat ? list.filter((l) => l !== feat) : list;
  return `${feat ? `<h2 class="font-semibold mb-3">${esc(t('lec.featured'))}</h2><ul class="mb-6">${card(feat, true)}</ul>` : ''}
    ${speakers.length ? `<div class="mb-5"><h2 class="font-semibold mb-2">${esc(t('lec.speakers'))}</h2><div class="flex gap-2 flex-wrap">${speakers.map((s) => `<button class="chip" data-a="lec-speaker" data-v="${esc(s)}">${icon('mic', 'w-3.5 h-3.5')}${esc(s)}</button>`).join('')}</div></div>` : ''}
    <h2 class="font-semibold mb-3">${esc(t('lec.latest'))}</h2>
    ${rest.length ? `<ul class="grid gap-3 lg:grid-cols-2">${rest.map((l) => card(l)).join('')}</ul>` : emptyState({ ic: 'search', title: t('lec.noResults'), text: esc(t('lec.noResultsText')) })}`;
}

const repaint = () => { const b = document.getElementById('lec-body'); if (b) b.innerHTML = body(); };

export const lectures = {
  title: 'nav.lectures',
  async render() {
    try { all = await content.lectures(); loaded = true; } catch { return pageHeader(t('nav.lectures')) + errorState(t('err.content')); }
    const add = `<button class="btn btn-primary" data-a="lec-add">${icon('plus', 'w-4 h-4')}<span class="hidden sm:inline">${esc(t('lec.add'))}</span><span class="sr-only sm:hidden">${esc(t('lec.add'))}</span></button>`;
    return pageHeader(t('nav.lectures'), esc(t('lec.sub')), add) + (all.length ? `
      <label class="search-box mb-4">${icon('search', 'w-5 h-5 text-muted')}<input type="search" class="flex-1 bg-transparent outline-none" value="${esc(q)}" placeholder="${esc(t('lec.search'))}" data-in="lec-search" aria-label="${esc(t('lec.search'))}"></label>
      <div class="mb-5" id="lec-chips">${chips([{ id: 'all', label: t('lec.all') }, ...LEC_CATS.map((c) => ({ id: c, label: t('lcat.' + c) }))], cat, 'lec-cat')}</div>` : '') +
      `<div id="lec-body">${body()}</div><p class="text-xs text-muted mt-8 leading-relaxed">${esc(t('lec.disclaimer'))}</p>`;
  }
};

inputs['lec-search'] = (el) => { q = el.value; repaint(); };
actions['lec-cat'] = (el) => { cat = el.dataset.v; const c = document.getElementById('lec-chips'); if (c) c.innerHTML = chips([{ id: 'all', label: t('lec.all') }, ...LEC_CATS.map((x) => ({ id: x, label: t('lcat.' + x) }))], cat, 'lec-cat'); repaint(); };
actions['lec-play'] = (el) => {
  const l = all.find((x) => x.id === el.dataset.id); if (!l) return;
  if (l.sourceType === 'external') { window.open(l.source, '_blank', 'noopener,noreferrer'); return; }
  playLecture(l);
};
actions['lec-del'] = async (el) => {
  const l = all.find((x) => x.id === el.dataset.id);
  if (await confirmSheet({ title: t('common.delete'), text: t('lec.deleteConfirm', { title: l?.title || '' }), confirm: t('common.delete'), danger: true })) {
    userLectures.remove(el.dataset.id); all = all.filter((x) => x.id !== el.dataset.id); repaint(); toast(t('lec.deleted'));
  }
};
actions['lec-speaker'] = async (el) => {
  const name = el.dataset.v; const list = all.filter((l) => l.speaker === name).sort(byDate);
  const sch = (await content.scholars()).find((s) => s.name === name);
  const topics = [...new Set(list.map((l) => t('lcat.' + l.category)))];
  Sheet.open({ title: name, wide: true, html: `
    ${sch?.description ? `<p class="text-sm leading-relaxed mb-3">${esc(sch.description)}</p>` : `<p class="text-xs text-muted mb-3">${esc(t('lec.noBio'))}</p>`}
    ${sch?.channelUrl ? `<a class="inline-flex items-center gap-1.5 text-sm text-accent mb-3" href="${esc(sch.channelUrl)}" target="_blank" rel="noopener noreferrer">${icon('external-link', 'w-3.5 h-3.5')}${esc(t('lec.officialChannel'))}</a>` : ''}
    <p class="text-sm mb-1"><span class="text-muted">${esc(t('lec.topics'))}:</span> ${esc(topics.join(', '))}</p>
    <p class="text-sm mb-4"><span class="text-muted">${esc(t('nav.lectures'))}:</span> ${list.length}</p>
    <ul class="grid gap-3">${list.map((l) => card(l)).join('')}</ul>` });
};

actions['lec-add'] = () => {
  Sheet.open({ title: t('lec.add'), html: `
    <form class="grid gap-4" data-form novalidate>
      <p class="text-xs text-muted leading-relaxed">${esc(t('lec.formHelp'))}</p>
      <label class="grid gap-1.5 text-sm">${esc(t('lec.fTitle'))}<input class="input" name="title" required maxlength="140" data-autofocus></label>
      <label class="grid gap-1.5 text-sm">${esc(t('lec.fSpeaker'))}<input class="input" name="speaker" required maxlength="80"></label>
      <label class="grid gap-1.5 text-sm">${esc(t('lec.fUrl'))}<input class="input" name="url" type="url" inputmode="url" required placeholder="https://"></label>
      <label class="grid gap-1.5 text-sm">${esc(t('lec.fCategory'))}<select class="input" name="category">${LEC_CATS.map((c) => `<option value="${c}">${esc(t('lcat.' + c))}</option>`).join('')}</select></label>
      <div class="grid grid-cols-2 gap-3"><label class="grid gap-1.5 text-sm">${esc(t('lec.fDuration'))}<input class="input" name="duration" placeholder="42:10" maxlength="12"></label>
        <label class="grid gap-1.5 text-sm">${esc(t('lec.fDate'))}<input class="input" name="date" type="date"></label></div>
      <p class="text-sm text-danger hidden" data-err role="alert"></p>
      <button class="btn btn-primary justify-self-end" type="submit">${esc(t('common.save'))}</button></form>`,
  mount: (b, api) => {
    const f = b.querySelector('[data-form]'); const err = b.querySelector('[data-err]');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const fail = (m) => { err.textContent = m; err.classList.remove('hidden'); };
      if (!d.title.trim() || !d.speaker.trim()) return fail(t('lec.errRequired'));
      const src = parseSource(d.url.trim());
      if (!src) return fail(t('lec.errUrl'));
      const item = { id: 'u-' + Date.now().toString(36), title: d.title.trim(), speaker: d.speaker.trim(), category: d.category, source: src.url, sourceType: src.type,
        videoId: src.type === 'youtube' ? src.id : undefined, thumbnail: src.thumbnail || '', duration: d.duration.trim(), date: d.date || '', added: new Date().toISOString() };
      userLectures.add(item); all.unshift({ ...item, local: true });
      api.close(); repaint();
      const pane = document.getElementById('lec-body'); if (!document.getElementById('lec-search')) lectures.render().then((h) => { const v = document.getElementById('view'); if (v) v.innerHTML = h; });
      toast(t('lec.added'));
    });
  } });
};
