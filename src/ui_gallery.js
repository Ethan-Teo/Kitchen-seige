'use strict';
/* =====================================================================
   Kitchen Siege — the community gallery: browse, get, share, paste a code
   ===================================================================== */
const GAL_GLYPH = { tower:'🔧', kitchen:'🗺️', body:'🤖', object:'🧩', collection:'📦', mod:'⚙️' };
const KM_FLOOR = { block:'#c8955c', diner:'#e9e4da', pantry:'#d6b98c', freezer:'#c9d6dd' };
/* a little picture of a kitchen code: its floor, water and trails */
function kitchenMini(k, w, hgt){
  const c = document.createElement('canvas'); c.width = w; c.height = hgt; c.className = 'gal-mini';
  const g = c.getContext('2d'), s = w / W;
  g.fillStyle = KM_FLOOR[k.theme] || '#ddd'; g.fillRect(0, 0, w, hgt);
  for (const q of k.water){ g.fillStyle = '#6fb7e0'; g.beginPath(); if (q.style === 'sink') g.rect(q.x * s, q.y * s, q.w * s, q.h * s); else g.ellipse(q.x * s, q.y * s, q.rx * s, q.ry * s, 0, 0, TAU); g.fill(); }
  for (const d of k.deco){ g.fillStyle = d.solid ? 'rgba(60,40,20,.45)' : 'rgba(60,40,20,.2)'; g.beginPath(); if (d.r) g.arc(d.x * s, d.y * s, d.r * s, 0, TAU); else g.rect(d.x * s, d.y * s, d.w * s, d.h * s); g.fill(); }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const P of k.paths){
    for (const [col, lw] of [['#2c5e4f', 9], ['#e8d3a4', 5]]){ g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0] * s, p[1] * s) : g.moveTo(p[0] * s, p[1] * s)); g.stroke(); }
  }
  return c;
}
function galThumb(e){
  if (e.kind === 'kitchen'){ try { return kitchenMini(kitchenFromCode(e.code), 176, 109); } catch (err) {} }
  return h('div', { class:'gal-glyph k-' + e.kind, 'aria-hidden':'true', text: GAL_GLYPH[e.kind] || '★' });
}
function showGallery(back){
  Sfx.unlock();
  UI.galKind = UI.galKind || 'all';
  const list = h('div', { class:'gal-list' }), chips = h('div', { class:'seg gal-kinds', role:'group', 'aria-label':'Show' });
  const note = h('p', { class:'dly-note gal-src' });
  const render = () => {
    const all = galleryAll(), kinds = ['all', ...Object.keys(GALLERY_KINDS)];
    chips.innerHTML = '';
    for (const k of kinds){
      const n = k === 'all' ? all.length : all.filter(e => e.kind === k).length;
      if (k !== 'all' && !n) continue;
      chips.append(h('button', { 'aria-pressed': String(UI.galKind === k), onclick: () => { UI.galKind = k; render(); } }, (k === 'all' ? 'All' : GALLERY_KINDS[k].plural) + ' ' + n));
    }
    const shown = all.filter(e => UI.galKind === 'all' || e.kind === UI.galKind);
    list.innerHTML = '';
    if (!shown.length) list.append(h('p', { class:'dly-note', text:'Nothing here yet. Share something of yours!' }));
    for (const e of shown){
      const mine = e.src === 'shared' && Store.cloud && e.owner && e.owner === Store.cloud.uid;
      const get = h('button', { class:'btn btn-small btn-primary gal-get', onclick: () => {
        try {
          const r = galleryGet(e.code);
          Sfx.play('upgrade');
          toast(r.have ? 'You already have ' + e.name + '.' : e.kind === 'collection' ? 'Added ' + r.added + ' things from ' + e.name + '.' : 'Added ' + e.name + ' to your ' + (e.kind === 'tower' ? 'tower builder' : e.kind === 'kitchen' ? 'kitchens' : e.kind === 'body' ? 'body workshop' : e.kind === 'mod' ? 'mods (switch it on in Mods)' : 'objects') + '.', 'gold');
          get.textContent = 'Got it ✓'; get.disabled = true;
        } catch (err) { Sfx.play('error'); toast(err.message, 'warn'); }
      } }, 'Get');
      list.append(h('div', { class:'gal-card', 'data-id': e.id }, galThumb(e),
        h('div', { class:'gal-txt' }, h('b', { text: e.name }), h('span', { class:'gal-by', text: GALLERY_KINDS[e.kind].name + ' · by ' + e.by + (e.src === 'shared' ? ' · shared here' : ' · featured') }), e.blurb ? h('span', { text: e.blurb }) : null),
        h('div', { class:'gal-acts' }, get,
          h('button', { class:'btn btn-small', onclick: () => { copyText(e.code); toast('Code copied.', 'info'); } }, 'Copy code'),
          e.kind === 'kitchen' ? h('button', { class:'btn btn-small', onclick: () => { try { const r = galleryGet(e.code); closeModal(); pickDifficulty(kitchenMapId(r.id)); } catch (err) { toast(err.message, 'warn'); } } }, 'Play') : null,
          mine ? h('button', { class:'btn btn-small', onclick: () => galleryRemove(e.id).then(() => toast('Removed from the shelf.', 'info')).catch(err => toast(err.message || 'Could not remove it.', 'warn')) }, 'Remove') : null)));
    }
    note.textContent = galleryDb() ? 'Featured picks, plus a shared shelf everyone with this page can add to.'
      : Gallery.featured && Gallery.featured.length ? 'Featured picks from the game’s GitHub page. Share yours with a GitHub issue and it can join them.'
      : 'Featured picks. Share yours with a code, or with a GitHub issue to have it featured.';
  };
  const paste = h('textarea', { class:'gal-paste', rows: 2, placeholder:'Paste a code: KSA1: appliance, KSM1: kitchen, KSB1: body, KSO1: object, KSC1: collection, KSX1: mod', 'aria-label':'Paste a code' });
  const pasteBtn = h('button', { class:'btn btn-small', onclick: () => {
    try { const p = codePeek(paste.value); const r = galleryGet(paste.value); paste.value = ''; Sfx.play('upgrade'); toast(r.have ? 'You already have that ' + GALLERY_KINDS[p.kind].name.toLowerCase() + '.' : 'Added ' + p.name + '.', 'gold'); }
    catch (err) { Sfx.play('error'); toast(err.message, 'warn'); }
  } }, 'Add from code');
  modal({ title:'Gallery', lead:'Appliances, kitchens, bodies and objects that players have made. Get one and it joins your own library.', wide:true, cls:'gallery',
    content:[chips, note, list, h('div', { class:'gal-pastebox' }, paste, pasteBtn)],
    actions:[{ label:'Back', onClick: back || null }, { label:'Share yours', kind:'primary', keep:true, onClick: () => showShare(() => showGallery(back)) }], onClose: back });
  render();
  UI.galRender = () => { if (UI.modalOpen && $('.modal.gallery')) render(); };
  if (Gallery.featured === null){ Gallery.featured = []; galleryFetch().then(L => { Gallery.featured = L; UI.galRender(); }); }
  galleryWatch(() => UI.galRender && UI.galRender());
}
function showShare(back){
  const items = shareables();
  if (!items.length){
    modal({ title:'Share yours', lead:'You haven’t made anything yet. Build an appliance in the tower builder, a kitchen in the Kitchen Editor, or a body or object in the workshops, then come back.', actions:[{ label:'Back', onClick: back }] });
    return;
  }
  const sel = h('select', { 'aria-label':'What to share' }, items.map((it, i) => h('option', { value: String(i) }, GALLERY_KINDS[it.kind].name + ': ' + it.name)));
  const by = h('input', { type:'text', maxlength:'24', placeholder:'Your name or nickname', 'aria-label':'By', value: Profile.settings.galBy || '' });
  const blurb = h('input', { type:'text', maxlength:'140', placeholder:'A line about it (optional)', 'aria-label':'About it' });
  const out = h('div', { class:'gal-out' });
  const entry = () => { const it = items[+sel.value]; return { kind: it.kind, name: it.name, by: by.value.trim() || 'Anonymous', blurb: blurb.value.trim(), code: it.code }; };
  const share = async () => {
    const e = entry();
    Profile.settings.galBy = by.value.trim(); saveProfile();
    out.innerHTML = '';
    if (galleryDb()){
      try { await galleryPost(e); Sfx.play('rank'); toast('Shared! It’s on the shelf for everyone here.', 'gold'); back(); return; }
      catch (err) { out.append(h('p', { class:'dly-note', text:'Couldn’t share it here (' + (err.message || err.code || 'error') + '). You can still use a GitHub issue or the code.' })); }
    }
    const ta = h('textarea', { class:'gal-paste', rows: 3, readonly: true }); ta.value = e.code;
    out.append(h('p', { class:'dly-note', text:'Send the code to a friend, or open a GitHub issue to have it featured in the gallery for everyone.' }), ta,
      h('div', { class:'acts-row' },
        h('button', { class:'btn btn-small', onclick: () => { copyText(e.code); toast('Code copied.', 'info'); } }, 'Copy code'),
        h('a', { class:'btn btn-small btn-gold', href: gallerySubmitUrl(e), target:'_blank', rel:'noopener' }, 'Submit on GitHub')));
  };
  modal({ title:'Share yours', lead: galleryDb() ? 'Put one of your creations on the shared shelf.' : 'Get a share code, or submit it to be featured.', cls:'gallery',
    content:[h('div', { class:'gal-form' }, h('label', { text:'What' }), sel, h('label', { text:'By' }), by, h('label', { text:'About' }), blurb), out],
    actions:[{ label:'Back', onClick: back }, { label: galleryDb() ? 'Share' : 'Get the code', kind:'primary', keep:true, onClick: share }], onClose: back });
}
