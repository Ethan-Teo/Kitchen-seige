'use strict';
/* =====================================================================
   Kitchen Siege — the community gallery (its data)
   An entry is a share code with a name, a maker and a line about it:
   { id, kind, name, by, blurb, code, at }. Kinds follow the code's prefix:
   appliance designs (KSA1:), kitchens (KSM1:), bodies (KSB1:), objects
   (KSO1:) and whole collections (KSC1:).
   Entries come from three places, merged by id:
     - the featured shelf built into the game (GALLERY_SEED, from the
       repo's gallery/gallery.json at build time);
     - the same file fetched from the site when the game runs on GitHub
       Pages, so new entries show without a rebuild;
     - inside Claude, a shared shelf in the artifact's store that anyone
       with the page can add to.
   On GitHub, sharing opens a prefilled issue for the maintainers to add.
   ===================================================================== */
const GALLERY_REPO = 'Ethan-Teo/Kitchen-seige';
const GALLERY_CODE_MAX = 60000;
const GALLERY_SEED = /*GALLERY_SEED*/[];
const GALLERY_KINDS = {
  tower:      { name:'Appliance',  plural:'Appliances',  prefix: SHARE_PREFIX },
  kitchen:    { name:'Kitchen',    plural:'Kitchens',    prefix: KITCHEN_PREFIX },
  body:       { name:'Body',       plural:'Bodies',      prefix: BODY_PREFIX },
  object:     { name:'Object',     plural:'Objects',     prefix: OBJ_PREFIX },
  collection: { name:'Collection', plural:'Collections', prefix: COLLECTION_PREFIX },
  mod:        { name:'Mod',        plural:'Mods',        prefix: GMOD_PREFIX },
};
function codeKind(code){
  code = String(code || '').trim();
  for (const k in GALLERY_KINDS) if (code.startsWith(GALLERY_KINDS[k].prefix)) return k;
  return null;
}
/* decode a code to see that it is whole, and what it holds */
function codePeek(code){
  code = String(code || '').trim().replace(/\s+/g, '');
  const kind = codeKind(code);
  if (!kind) throw new Error('That isn’t a Kitchen Siege code.');
  if (kind === 'tower'){ const d = designFromCodeRaw(code); return { kind, name: d.name || 'Appliance', data: d }; }
  if (kind === 'kitchen'){ const k = kitchenFromCode(code); return { kind, name: k.name, data: k }; }
  if (kind === 'body'){ const b = bodyFromCode(code); return { kind, name: b.name || 'Body', data: b }; }
  if (kind === 'object'){ const o = objectFromCode(code); return { kind, name: o.name || 'Object', data: o }; }
  if (kind === 'mod'){ const m = gameModFromCode(code); return { kind, name: m.name, data: m }; }
  let raw;
  try { raw = JSON.parse(decodeURIComponent(escape(atob(code.slice(COLLECTION_PREFIX.length))))); } catch (e) { throw new Error('That code is damaged or incomplete.'); }
  const n = ['designs', 'objs', 'bodies'].reduce((a, k) => a + Object.keys((raw && raw[k]) || {}).length, 0);
  return { kind, name: n + ' things', data: raw };
}
/* a design read from its code without adding its bodies and objects to the library yet */
function designFromCodeRaw(code){
  let obj;
  try { obj = JSON.parse(decodeURIComponent(escape(atob(code.slice(SHARE_PREFIX.length))))); } catch (e) { throw new Error('That code is damaged or incomplete.'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('That code has no design in it.');
  return cleanCustom(obj);
}
function cleanEntry(e){
  if (!e || typeof e !== 'object') return null;
  const code = String(e.code || '').trim().replace(/\s+/g, '');
  if (!code || code.length > GALLERY_CODE_MAX) return null;
  const kind = codeKind(code);
  if (!kind) return null;
  let peek;
  try { peek = codePeek(code); } catch (err) { return null; }
  const id = String(e.id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || ('g' + hashStr(code).toString(36));
  return { id, kind, name: cleanText(e.name, 32, peek.name || GALLERY_KINDS[kind].name), by: cleanText(e.by, 24, 'Anonymous'), blurb: cleanText(e.blurb, 140, ''), code, at: Math.max(0, Math.floor(+e.at || 0)), src: e.src === 'shared' ? 'shared' : 'featured', owner: typeof e.owner === 'string' ? e.owner.slice(0, 80) : undefined };
}
/* lists from several places, one entry per id (and per code), newest first */
function mergeGallery(...lists){
  const byId = new Map(), codes = new Set();
  for (const L of lists) for (const raw of (Array.isArray(L) ? L : [])){
    const e = cleanEntry(raw);
    if (!e || byId.has(e.id) || codes.has(e.code)) continue;
    byId.set(e.id, e); codes.add(e.code);
  }
  return [...byId.values()].sort((a, b) => (a.src === b.src ? 0 : a.src === 'featured' ? -1 : 1) || b.at - a.at || a.name.localeCompare(b.name));
}
/* take an entry into your own library; returns what was added */
function galleryGet(code){
  code = String(code || '').trim().replace(/\s+/g, '');
  const kind = codeKind(code);
  const fp = (o, drop) => JSON.stringify(Object.assign({}, o, drop));
  if (kind === 'collection'){ const got = importCollection(code); return { kind, got, added: got.designs + got.objs + got.bodies }; }
  if (kind === 'tower'){
    const d = designFromCode(code);
    const same = Object.keys(Profile.custom || {}).find(k => fp(Profile.custom[k], { created: 0 }) === fp(d, { created: 0 }));
    if (same) return { kind, id: same, added: 0, have: true };
    const id = saveCustomTower(d);
    if (!id) throw new Error('Your tower builder is full. Delete a design to make room.');
    return { kind, id, added: 1 };
  }
  if (kind === 'kitchen'){
    const k = kitchenFromCode(code);
    const same = kitchenList().find(id => fp(kitchenById(id), { created: 0 }) === fp(k, { created: 0 }));
    if (same) return { kind, id: same, added: 0, have: true };
    const id = saveKitchen(k);
    if (!id) throw new Error('You have ' + KITCHEN_MAX + ' kitchens already. Delete one to make room.');
    return { kind, id, added: 1 };
  }
  if (kind === 'body'){
    const b = bodyFromCode(code);
    const same = bodyList().find(id => fp(bodyById(id), { created: 0, _rev: 0 }) === fp(b, { created: 0, _rev: 0 }));
    if (same) return { kind, id: same, added: 0, have: true };
    const id = saveBody(b);
    if (!id) throw new Error('Your body workshop is full.');
    return { kind, id, added: 1 };
  }
  if (kind === 'object'){
    const o = objectFromCode(code);
    const same = objectList().find(id => fp(objectById(id), { created: 0 }) === fp(o, { created: 0 }));
    if (same) return { kind, id: same, added: 0, have: true };
    const id = saveObject(o);
    if (!id) throw new Error('Your object workshop is full.');
    return { kind, id, added: 1 };
  }
  if (kind === 'mod'){
    const m = gameModFromCode(code);
    const same = gameModList().find(id => fp(gameModById(id), { created: 0 }) === fp(m, { created: 0 }));
    if (same) return { kind, id: same, added: 0, have: true };
    const id = saveGameMod(m);
    if (!id) throw new Error('You have ' + GMOD_MAX + ' mods already. Delete one to make room.');
    return { kind, id, added: 1 };
  }
  throw new Error('That isn’t a Kitchen Siege code.');
}
/* everything of yours that can be shared, as { kind, name, code } */
function shareables(){
  const out = [];
  for (const id of Object.keys(Profile.custom || {})) try { out.push({ kind:'tower', id, name: Profile.custom[id].name, code: designCode(Profile.custom[id]) }); } catch (e) {}
  for (const id of kitchenList()) out.push({ kind:'kitchen', id, name: kitchenById(id).name, code: kitchenCode(kitchenById(id)) });
  for (const id of bodyList()) out.push({ kind:'body', id, name: bodyById(id).name, code: bodyCode(bodyById(id)) });
  for (const id of objectList()) out.push({ kind:'object', id, name: objectById(id).name, code: objectCode(objectById(id)) });
  for (const id of gameModList()) out.push({ kind:'mod', id, name: gameModById(id).name, code: gameModCode(gameModById(id)) });
  return out;
}
/* the GitHub issue that asks for an entry to be added to the featured shelf */
function gallerySubmitUrl(e){
  const body = 'Please add this to the Kitchen Siege gallery.\n\n' + 'Kind: ' + GALLERY_KINDS[e.kind].name + '\nName: ' + e.name + '\nBy: ' + e.by + '\nAbout: ' + (e.blurb || '') + '\n\nCode:\n```\n' + e.code + '\n```\n';
  const url = 'https://github.com/' + GALLERY_REPO + '/issues/new?labels=gallery&title=' + encodeURIComponent('Gallery: ' + e.name) + '&body=' + encodeURIComponent(body);
  return url.length < 7800 ? url : 'https://github.com/' + GALLERY_REPO + '/issues/new?labels=gallery&title=' + encodeURIComponent('Gallery: ' + e.name) + '&body=' + encodeURIComponent(body.replace(e.code, '(paste the code here: it was too long for a link)'));
}

/* ---------------- loading the shelves ---------------- */
const Gallery = { featured: null, shared: [], state: 'idle', unsub: null };
/* the repo's gallery file, when the game is served from the site */
async function galleryFetch(){
  if (typeof fetch !== 'function' || typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return [];
  try {
    const r = await fetch('gallery/gallery.json', { cache:'no-cache' });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : Array.isArray(j.entries) ? j.entries : [];
  } catch (e) { return []; }
}
/* the shared shelf in Claude's store */
function galleryDb(){ return Store.cloud && Store.cloud.db ? Store.cloud.db : null; }
function galleryWatch(onChange){
  const db = galleryDb();
  if (!db || Gallery.unsub) return !!Gallery.unsub;
  try {
    Gallery.unsub = db.collection('gallery').orderBy('at', 'desc').limit(200).onSnapshot(snap => {
      Gallery.shared = snap.docs.map(d => Object.assign({}, d.data(), { id: d.id, src:'shared' }));
      if (onChange) onChange();
    }, () => { Gallery.unsub = null; });
  } catch (e) { Gallery.unsub = null; }
  return !!Gallery.unsub;
}
async function galleryPost(entry){
  const db = galleryDb();
  if (!db) throw new Error('The shared shelf is only there when the game runs inside Claude.');
  const e = cleanEntry(Object.assign({}, entry, { at: Date.now(), src:'shared' }));
  if (!e) throw new Error('That code is damaged.');
  const doc = { kind: e.kind, name: e.name, by: e.by, blurb: e.blurb, code: e.code, at: e.at, owner: Store.cloud.uid || '' };
  const ref = await db.collection('gallery').add(doc);
  return ref.id;
}
async function galleryRemove(id){
  const db = galleryDb();
  if (!db) return false;
  await db.doc('gallery/' + id).delete();
  return true;
}
function galleryAll(){ return mergeGallery(GALLERY_SEED, Gallery.featured || [], Gallery.shared); }
