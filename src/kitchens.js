'use strict';
/* =====================================================================
   Kitchen Siege — kitchens of your own (the Kitchen Editor's data)
   A kitchen is plain data, the same shape as the built-in ones in MAPS:
   a floor (one of the four themes), one to three trails (lists of points
   that start and end beyond the kitchen's edges), water (sinks, spills,
   puddles, meltwater) and props (boards, jars, stools... solid ones block
   building). Kitchens live on the profile (Profile.kitchens) and join MAPS
   as 'cm_<id>' with level 'Custom'. They stay out of MAP_ORDER, so they
   never count towards medals, stars or achievements, and a game played on
   one carries a copy of it in its save, so the save still loads after the
   kitchen is deleted. Share codes start KSM1:.
   ===================================================================== */
const KITCHEN_MAX = 24, KITCHEN_PREFIX = 'KSM1:', KM_TRAILS = 3, KM_POINTS = 40, KM_WATER_MAX = 4, KM_DECO_MAX = 30, KM_MIN_LEN = 900;
const KM_THEMES = { block:'Butcher block (wood)', diner:'Diner (checkerboard)', pantry:'Pantry (kraft paper)', freezer:'Freezer (steel)' };
const KM_WATER = { sink:'Sink', soda:'Soda spill', puddle:'Puddle', melt:'Meltwater' };
const KM_DECO_NAMES = { board:'Cutting board', lemons:'Lemons', pin:'Rolling pin', garlic:'Garlic', salt:'Salt shaker', herbs:'Herbs', flour:'Flour dust', stool:'Stool', booth:'Booth', jukebox:'Jukebox', jar:'Jar', can:'Can', box:'Box', sack:'Sack', crate:'Crate', peas:'Frozen peas', pillar:'Pillar', frost:'Frost' };
/* each prop's size and whether it blocks building, taken from the built-in kitchens */
const KM_DECO = (() => {
  const out = {};
  for (const id of MAP_ORDER) for (const d of MAPS[id].deco) if (KM_DECO_NAMES[d.k] && !out[d.k]) out[d.k] = d.r ? { r: d.r, solid: !!d.solid } : { w: d.w, h: d.h, solid: !!d.solid };
  return out;
})();
const KM_NUM = (v, lo, hi, def) => { v = Math.round(Number(v)); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def; };
function defaultKitchen(){
  return { v:1, name:'My Kitchen', theme:'block', blurb:'', paths:[[[-40, 340], [300, 340], [300, 150], [800, 150], [800, 520], [1140, 520]]], water:[], deco:[], created:0 };
}
/* a trail's ends go just past the nearest edge of the kitchen, so pests walk in and out of view */
function snapEnds(pts){
  const out = pts.map(p => p.slice());
  const push = (p, q) => {
    if (p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) return;
    /* the edge it points towards: away from its neighbour along the longer axis, else the nearest edge */
    const d = [p[0], W - p[0], p[1], H - p[1]], i = d.indexOf(Math.min(...d));
    if (i === 0) p[0] = -40; else if (i === 1) p[0] = W + 40; else if (i === 2) p[1] = -40; else p[1] = H + 40;
  };
  if (out.length >= 2){ push(out[0], out[1]); push(out[out.length - 1], out[out.length - 2]); }
  return out;
}
function cleanKitchen(src){
  src = src && typeof src === 'object' ? src : {};
  const k = defaultKitchen();
  k.name = cleanText(src.name, 24, 'My Kitchen');
  k.theme = KM_THEMES[src.theme] ? src.theme : 'block';
  k.blurb = cleanText(src.blurb, 120, '');
  const paths = (Array.isArray(src.paths) ? src.paths : []).slice(0, KM_TRAILS)
    .map(P => (Array.isArray(P) ? P : []).slice(0, KM_POINTS).filter(p => Array.isArray(p) && p.length >= 2).map(p => [KM_NUM(p[0], -80, W + 80, 0), KM_NUM(p[1], -80, H + 80, 0)]))
    .filter(P => P.length >= 2).map(snapEnds);
  k.paths = paths.length ? paths : defaultKitchen().paths;
  k.water = (Array.isArray(src.water) ? src.water : []).slice(0, KM_WATER_MAX).map(w => {
    if (!w || !KM_WATER[w.style]) return null;
    if (w.style === 'sink') return { style:'sink', x: KM_NUM(w.x, 0, W - 40, 500), y: KM_NUM(w.y, 0, H - 40, 300), w: KM_NUM(w.w, 50, 500, 124), h: KM_NUM(w.h, 50, 500, 200), r: 16, rim: 10 };
    return { style: w.style, x: KM_NUM(w.x, 30, W - 30, 500), y: KM_NUM(w.y, 30, H - 30, 300), rx: KM_NUM(w.rx, 30, 260, 90), ry: KM_NUM(w.ry, 30, 260, 70) };
  }).filter(Boolean);
  k.deco = (Array.isArray(src.deco) ? src.deco : []).slice(0, KM_DECO_MAX).map(d => {
    const D = d && KM_DECO[d.k];
    if (!D) return null;
    const o = { k: d.k, x: KM_NUM(d.x, -20, W + 20, 100), y: KM_NUM(d.y, -20, H + 20, 100) };
    if (D.r) o.r = KM_NUM(d.r, 8, 120, D.r); else { o.w = KM_NUM(d.w, 16, 400, D.w); o.h = KM_NUM(d.h, 16, 400, D.h); }
    if (D.solid) o.solid = true;
    return o;
  }).filter(Boolean);
  k.created = Number(src.created) || 0;
  return k;
}
/* how long a trail is inside the kitchen */
function trailLen(P){ let n = 0; for (let i = 1; i < P.length; i++) n += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return n; }
/* what stops a kitchen being played, or makes it odd (an empty list means it is fine) */
function kitchenProblems(k){
  const out = [];
  k.paths.forEach((P, i) => {
    const n = k.paths.length > 1 ? 'Trail ' + (i + 1) : 'The trail';
    if (trailLen(P) < KM_MIN_LEN) out.push(n + ' is too short: make it at least ' + KM_MIN_LEN + ' long (it is ' + Math.round(trailLen(P)) + ').');
  });
  for (const d of k.deco) if (d.solid) for (const P of k.paths){
    const B = buildPath(P);
    if (distToPath(B, d.r ? d.x : d.x + d.w / 2, d.r ? d.y : d.y + d.h / 2) < (d.r || Math.min(d.w, d.h) / 2) * 0.6){ out.push('A ' + (KM_DECO_NAMES[d.k] || d.k).toLowerCase() + ' stands on a trail.'); break; }
  }
  return out;
}

/* ---------------- the library ---------------- */
function kitchenStore(){ if (!Profile.kitchens || typeof Profile.kitchens !== 'object' || Array.isArray(Profile.kitchens)) Profile.kitchens = {}; return Profile.kitchens; }
function kitchenList(){ const S = kitchenStore(); return Object.keys(S).sort((a, b) => (S[a].created || 0) - (S[b].created || 0)); }
function kitchenById(id){ const S = kitchenStore(); return id && S[id] ? S[id] : null; }
const kitchenMapId = id => 'cm_' + id;
function isCustomMap(mapId){ return !!(MAPS[mapId] && MAPS[mapId].custom); }
function saveKitchen(k, id){
  const S = kitchenStore();
  if (!id && Object.keys(S).length >= KITCHEN_MAX) return null;
  if (!id){ let n = 1; while (S['km' + n]) n++; id = 'km' + n; }
  const c = cleanKitchen(k);
  c.created = (S[id] && S[id].created) || Date.now();
  S[id] = c;
  saveProfile();
  registerKitchens();
  return id;
}
function deleteKitchen(id){
  const S = kitchenStore();
  if (!S[id]) return false;
  delete S[id];
  saveProfile();
  registerKitchens();
  return true;
}
/* the kitchens on the profile join MAPS (and leave it when deleted, unless a game in progress stands on one) */
function registerKitchens(){
  const S = kitchenStore();
  for (const mid of Object.keys(MAPS)) if (MAPS[mid].custom && !MAPS[mid].adopted && !S[mid.slice(3)] && !(typeof G !== 'undefined' && G.active && G.mapId === mid)) delete MAPS[mid];
  for (const id in S){ S[id] = cleanKitchen(S[id]); MAPS[kitchenMapId(id)] = Object.assign({ level:'Custom', custom:true }, S[id], { blurb: S[id].blurb || 'A kitchen of your own.' }); }
}
/* a saved game's own copy of the kitchen it was played on, for when the kitchen itself is gone */
function adoptKitchen(mapId, data){
  if (MAPS[mapId] || !/^cm_[a-z0-9_]{1,24}$/.test(String(mapId))) return;
  MAPS[mapId] = Object.assign({ level:'Custom', custom:true, adopted:true }, cleanKitchen(data));
}
function kitchenCopy(mapId){ const M = MAPS[mapId]; return M && M.custom ? cleanKitchen(M) : null; }
function kitchenCode(k){ const c = cleanKitchen(k); delete c.created; return KITCHEN_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(c)))); }
function kitchenFromCode(code){
  code = String(code || '').trim().replace(/\s+/g, '');
  if (!code.startsWith(KITCHEN_PREFIX)) throw new Error('A kitchen code starts with ' + KITCHEN_PREFIX);
  let o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(code.slice(KITCHEN_PREFIX.length))))); } catch (e) { throw new Error('That code is damaged or incomplete.'); }
  return cleanKitchen(o);
}
