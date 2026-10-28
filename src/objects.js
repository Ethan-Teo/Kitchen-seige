'use strict';
/* =====================================================================
   Kitchen Siege — the Projectile Workshop: attack objects of your own
   An object is a little drawing built from layers (discs, rings, stars,
   blades, flames...), each with its own colour, size, offset, outline,
   spin and pulse, plus a glow, a trail and how the whole thing animates.
   Objects live on the profile (Profile.objects) and any custom attack
   can fire one. They have share codes (KSO1:...) like designs do.

   Motions are the second half: how a projectile flies. Straight, waving,
   zigzagging, orbiting its appliance, spiralling out, speeding up or
   braking, and bouncing off the kitchen walls. The same motion code runs
   in the game and in the builder's test range.
   ===================================================================== */
const OBJ_MAX = 24, OBJ_LAYERS = 6, OBJ_PREFIX = 'KSO1:';
const OBJ_KINDS = {
  disc:    'Disc',
  ring:    'Ring',
  star:    'Star',
  poly:    'Polygon',
  blade:   'Blade',
  spike:   'Spikes',
  crescent:'Crescent',
  flame:   'Flame',
  dots:    'Ring of dots',
  streak:  'Streak',
  cross:   'Cross',
  eye:     'Eye',
};
const OBJ_TRAILS = { none:'None', ribbon:'Ribbon', sparks:'Sparks', smoke:'Smoke', fire:'Fire', bubbles:'Bubbles', stars:'Stars', ice:'Frost' };
const OBJ_FACE = { fly:'The way it flies', spin:'Spins', still:'Stays upright' };
function defaultLayer(k){
  return { k: OBJ_KINDS[k] ? k : 'disc', c:'#ff7a59', o:'#5a1f12', w:1, s:1, x:0, y:0, r:0, n:5, a:1, spin:0, pulse:0 };
}
function defaultObject(){
  return { v:1, name:'New Object', size:8, face:'fly', spin:0, pulse:0, wobble:0, flicker:0, glow:0, glowC:'#ffb27a', trail:'none', trailC:'#ff7a59', trailLen:1,
    layers:[defaultLayer('disc')], created:0 };
}
const OBJ_NUM = (v, lo, hi, def, step) => {
  v = Number(v); if (!isFinite(v)) return def;
  v = Math.min(hi, Math.max(lo, v));
  if (step) v = Math.round(v / step) * step;
  return Math.round(v * 1000) / 1000;
};
const OBJ_COL = (v, def) => /^#[0-9a-f]{6}$/i.test(v || '') ? v.toLowerCase() : def;
function cleanLayer(s){
  s = s && typeof s === 'object' ? s : {};
  const L = defaultLayer(s.k);
  L.c = OBJ_COL(s.c, L.c); L.o = OBJ_COL(s.o, L.o);
  L.w = OBJ_NUM(s.w, 0, 4, 1, 0.5);
  L.s = OBJ_NUM(s.s, 0.1, 3, 1, 0.05);
  L.x = OBJ_NUM(s.x, -2, 2, 0, 0.05); L.y = OBJ_NUM(s.y, -2, 2, 0, 0.05);
  L.r = OBJ_NUM(s.r, -180, 180, 0, 1);
  L.n = OBJ_NUM(s.n, 3, 12, 5, 1);
  L.a = OBJ_NUM(s.a, 0.1, 1, 1, 0.05);
  L.spin = OBJ_NUM(s.spin, -4, 4, 0, 0.25);
  L.pulse = OBJ_NUM(s.pulse, 0, 1, 0, 0.05);
  return L;
}
function cleanObject(src){
  src = src && typeof src === 'object' ? src : {};
  const o = defaultObject();
  o.name = cleanText(src.name, 20, 'Object');
  o.size = OBJ_NUM(src.size, 3, 30, 8, 1);
  o.face = OBJ_FACE[src.face] ? src.face : 'fly';
  o.spin = OBJ_NUM(src.spin, -4, 4, 0, 0.25);
  o.pulse = OBJ_NUM(src.pulse, 0, 1, 0, 0.05);
  o.wobble = OBJ_NUM(src.wobble, 0, 1, 0, 0.05);
  o.flicker = OBJ_NUM(src.flicker, 0, 1, 0, 0.05);
  o.glow = OBJ_NUM(src.glow, 0, 3, 0, 0.1);
  o.glowC = OBJ_COL(src.glowC, '#ffb27a');
  o.trail = OBJ_TRAILS[src.trail] ? src.trail : 'none';
  o.trailC = OBJ_COL(src.trailC, '#ff7a59');
  o.trailLen = OBJ_NUM(src.trailLen, 0.3, 3, 1, 0.1);
  o.layers = (Array.isArray(src.layers) ? src.layers : []).slice(0, OBJ_LAYERS).map(cleanLayer);
  if (!o.layers.length) o.layers = [defaultLayer('disc')];
  o.created = Number(src.created) || 0;
  return o;
}
/* ready-made objects to start from (or just use) */
const OBJ_PREFABS = {
  comet:   { name:'Comet', size:8, face:'fly', glow:1.2, glowC:'#ffd166', trail:'ribbon', trailC:'#ffb27a', trailLen:1.6, layers:[{ k:'streak', c:'#ffe3a0', o:'#ff8a3d', w:0.5, s:1.6, x:-0.6 }, { k:'disc', c:'#fff4c2', o:'#ff8a3d', w:1, s:0.9 }, { k:'disc', c:'#ffffff', s:0.4, x:0.15, y:-0.15, w:0 }] },
  shuriken:{ name:'Shuriken', size:9, face:'spin', spin:3, layers:[{ k:'blade', c:'#c9d2d6', o:'#2d3438', w:1, s:1.1, n:4 }, { k:'ring', c:'#7a8288', o:'#2d3438', w:1, s:0.35 }, { k:'disc', c:'#e2383f', s:0.18, w:0 }] },
  fireball:{ name:'Fireball', size:9, face:'fly', pulse:0.3, flicker:0.4, glow:1.6, glowC:'#ff6a2a', trail:'fire', trailC:'#ff8a3d', trailLen:1.2, layers:[{ k:'flame', c:'#ff5a2a', o:'#7a1d0c', w:1, s:1.6, x:-0.5 }, { k:'flame', c:'#ffb14a', o:'#ff5a2a', w:0.5, s:1.1, x:-0.3 }, { k:'disc', c:'#fff1a8', s:0.55, w:0, x:0.1 }] },
  snowflake:{ name:'Snowflake', size:8, face:'spin', spin:1, glow:0.8, glowC:'#bfe9ff', trail:'ice', trailC:'#dff6ff', layers:[{ k:'spike', c:'#e9f7ff', o:'#6fb7d9', w:1, s:1.3, n:6 }, { k:'spike', c:'#ffffff', o:'#6fb7d9', w:0.5, s:0.7, n:6, r:30 }, { k:'disc', c:'#ffffff', o:'#6fb7d9', w:1, s:0.3 }] },
  stormorb: { name:'Storm Orb', size:8, face:'still', pulse:0.5, flicker:0.6, glow:2, glowC:'#9ad7ff', trail:'sparks', trailC:'#bfe9ff', layers:[{ k:'disc', c:'#2a5fd9', o:'#102a6b', w:1, s:1 }, { k:'cross', c:'#dff3ff', o:'#2a5fd9', w:0.5, s:1.4, spin:2 }, { k:'cross', c:'#ffffff', w:0, s:0.9, r:45, spin:-3 }] },
  sawblade: { name:'Sawblade', size:11, face:'spin', spin:4, layers:[{ k:'spike', c:'#9aa5ab', o:'#2d3438', w:1, s:1.3, n:12 }, { k:'disc', c:'#c9d2d6', o:'#2d3438', w:1, s:0.8 }, { k:'ring', c:'#5d666b', o:'#2d3438', w:0.5, s:0.3 }] },
  bubble:   { name:'Soap Bubble', size:9, face:'still', wobble:0.4, pulse:0.15, trail:'bubbles', trailC:'#bfe9ff', layers:[{ k:'disc', c:'#bfe9ff', o:'#6fb7d9', w:1, s:1, a:0.35 }, { k:'ring', c:'#ffffff', o:'#6fb7d9', w:0, s:1, a:0.6 }, { k:'crescent', c:'#ffffff', w:0, s:0.5, x:-0.35, y:-0.35, a:0.8, r:-45 }] },
  pizzaspin:{ name:'Pizza Spinner', size:11, face:'spin', spin:2.5, layers:[{ k:'disc', c:'#f2c14e', o:'#b8861b', w:1.5, s:1 }, { k:'disc', c:'#d9262a', o:'#8a1d22', w:0.5, s:0.75 }, { k:'dots', c:'#f4e2a8', o:'#8a1d22', w:0.5, s:0.5, n:6 }, { k:'dots', c:'#b23a2a', o:'#5a1f12', w:0.5, s:0.72, n:5, r:36 }] },
  ghostflame:{ name:'Ghost Flame', size:8, face:'fly', flicker:0.7, pulse:0.4, glow:1.8, glowC:'#7fffe3', trail:'smoke', trailC:'#7fffe3', layers:[{ k:'flame', c:'#7fffe3', o:'#1f6f66', w:1, s:1.5, x:-0.4, a:0.8 }, { k:'eye', c:'#123b36', o:'#7fffe3', w:0.5, s:0.5, x:0.1, y:-0.25 }, { k:'eye', c:'#123b36', o:'#7fffe3', w:0.5, s:0.5, x:0.1, y:0.25 }] },
  blackhole:{ name:'Black Hole', size:10, face:'still', spin:-1.5, pulse:0.2, glow:2.5, glowC:'#8b5cf6', trail:'stars', trailC:'#d7c6ff', layers:[{ k:'ring', c:'#8b5cf6', o:'#2b1a5e', w:1, s:1.4, a:0.8, spin:1 }, { k:'crescent', c:'#d7c6ff', w:0, s:1.2, spin:2, a:0.7 }, { k:'disc', c:'#0b0616', o:'#8b5cf6', w:1, s:0.8 }] },
  heartbomb:{ name:'Heart', size:8, face:'still', pulse:0.6, glow:1, glowC:'#ff8fc7', trail:'stars', trailC:'#ffd1e8', layers:[{ k:'poly', c:'#ff4f8b', o:'#8a1d4e', w:1, s:1.2, n:3, r:90 }, { k:'disc', c:'#ff4f8b', o:'#8a1d4e', w:1, s:0.65, x:-0.3, y:-0.3 }, { k:'disc', c:'#ff4f8b', o:'#8a1d4e', w:1, s:0.65, x:0.3, y:-0.3 }, { k:'disc', c:'#ffffff', w:0, s:0.25, x:-0.35, y:-0.45, a:0.8 }] },
  boltshell:{ name:'Lightning Shell', size:9, face:'fly', flicker:0.9, glow:1.4, glowC:'#ffd166', trail:'sparks', trailC:'#fff1a8', layers:[{ k:'poly', c:'#ffd166', o:'#8a5a00', w:1, s:1.2, n:6 }, { k:'streak', c:'#ffffff', w:0, s:1.2, x:-0.8, a:0.8 }, { k:'cross', c:'#ffffff', w:0, s:0.6, spin:4 }] },
};
const OBJ_PREFAB_ORDER = ['comet', 'shuriken', 'fireball', 'snowflake', 'stormorb', 'sawblade', 'bubble', 'pizzaspin', 'ghostflame', 'blackhole', 'heartbomb', 'boltshell'];
function prefabObject(key){ return cleanObject(Object.assign(JSON.parse(JSON.stringify(OBJ_PREFABS[key] || OBJ_PREFABS.comet)), { v:1 })); }

/* ---------------- the library on the profile ---------------- */
function objectStore(){ if (!Profile.objects || typeof Profile.objects !== 'object' || Array.isArray(Profile.objects)) Profile.objects = {}; return Profile.objects; }
function objectList(){ const S = objectStore(); return Object.keys(S).sort((a, b) => (S[a].created || 0) - (S[b].created || 0)); }
function objectById(id){ const S = objectStore(); return id && S[id] ? S[id] : null; }
function newObjectId(){ let n = 1; while (objectStore()['obj' + n]) n++; return 'obj' + n; }
function saveObject(obj, id){
  const S = objectStore();
  if (!id && Object.keys(S).length >= OBJ_MAX) return null;
  id = id || newObjectId();
  const o = cleanObject(obj);
  o.created = (S[id] && S[id].created) || Date.now();
  S[id] = o;
  saveProfile();
  if (typeof syncCustomTowers === 'function') syncCustomTowers();
  return id;
}
function deleteObject(id){
  const S = objectStore();
  if (!S[id]) return false;
  delete S[id];
  saveProfile();
  if (typeof syncCustomTowers === 'function') syncCustomTowers();
  return true;
}
/* how many custom attacks fire this object */
function objectUses(id){
  let n = 0;
  for (const k in (Profile.custom || {})){ const d = Profile.custom[k]; for (const A of (d.attacks || [])) if (A.obj === id) n++; if (d.paragon) for (const A of (d.paragon.attacks || [])) if (A.obj === id) n++; }
  return n;
}
function objectCode(o){ return OBJ_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(cleanObject(o))))); }
function objectFromCode(code){
  code = String(code || '').trim();
  if (!code.startsWith(OBJ_PREFIX)) throw new Error('That is not an object code (it should start with ' + OBJ_PREFIX + ').');
  let o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(code.slice(OBJ_PREFIX.length))))); } catch (e) { throw new Error('That code could not be read.'); }
  return cleanObject(o);
}
/* the compact copy an attack carries into the game (so a deleted object keeps flying in saved games) */
function objectSpec(id){
  const o = objectById(id);
  if (!o) return null;
  return { id, name: o.name, size: o.size, face: o.face, spin: o.spin, pulse: o.pulse, wobble: o.wobble, flicker: o.flicker, glow: o.glow, glowC: o.glowC, trail: o.trail, trailC: o.trailC, trailLen: o.trailLen,
    layers: o.layers.map(L => Object.assign({}, L)) };
}

/* ---------------- motions ---------------- */
const MOTIONS = {
  straight: { name:'Straight',           desc:'Flies where it is thrown.' },
  wave:     { name:'Wave',               desc:'Weaves from side to side as it flies.' },
  zigzag:   { name:'Zigzag',             desc:'Sharp turns left and right.' },
  orbit:    { name:'Orbit',              desc:'Circles its appliance for as long as it lasts, hitting pests again on every lap.' },
  spiralout:{ name:'Spiral out',         desc:'Circles its appliance in a widening spiral.' },
  accel:    { name:'Speeds up',          desc:'Starts slow and keeps gaining speed.' },
  brake:    { name:'Brakes',             desc:'Starts fast and slows to a crawl, lingering where it stops.' },
  drunk:    { name:'Wanders',            desc:'Drifts and staggers unpredictably.' },
};
/* motion fields on an attack spec: motion, amp (wave width, degrees), orbitR (orbit radius) */
function motionInit(p, sp){
  p.ang0 = p.ang; p.age = 0; p.spd0 = p.spd;
  if (sp.motion === 'orbit' || sp.motion === 'spiralout'){
    const cx = p.ox != null ? p.ox : (p.tw ? p.tw.x : p.x), cy = p.oy != null ? p.oy : (p.tw ? p.tw.y : p.y);
    p.ox = cx; p.oy = cy;
    p.orbA = Math.atan2(p.y - cy, p.x - cx);
    if (!isFinite(p.orbA)) p.orbA = p.ang;
    p.orbR = sp.motion === 'orbit' ? Math.max(20, sp.orbitR || 80) : 24;
    p.lap = 0;
  }
}
/* moves a projectile for dt under its motion; returns true when it moved the projectile itself */
function motionTick(p, sp, dt){
  const m = sp.motion;
  if (!m || m === 'straight') return false;
  if (p.age == null) motionInit(p, sp);
  p.age += dt;
  const amp = (sp.amp || 35) * Math.PI / 180;
  switch (m){
    case 'wave': {
      const w = Math.sin(p.age * 11) * amp;
      const base = sp.homing && p.target ? p.ang : p.ang0;
      p.vx = Math.cos(base + w) * p.spd; p.vy = Math.sin(base + w) * p.spd;
      return false;
    }
    case 'zigzag': {
      const w = (Math.floor(p.age * 6) % 2 ? 1 : -1) * amp;
      const base = sp.homing && p.target ? p.ang : p.ang0;
      p.vx = Math.cos(base + w) * p.spd; p.vy = Math.sin(base + w) * p.spd;
      return false;
    }
    case 'accel': {
      p.spd = Math.min(p.spd0 * 4, p.spd0 * (0.35 + p.age * 2.2));
      p.vx = Math.cos(p.ang) * p.spd; p.vy = Math.sin(p.ang) * p.spd;
      return false;
    }
    case 'brake': {
      p.spd = Math.max(p.spd0 * 0.08, p.spd0 * (1.6 - p.age * 2.4));
      p.vx = Math.cos(p.ang) * p.spd; p.vy = Math.sin(p.ang) * p.spd;
      return false;
    }
    case 'drunk': {
      p.ang += (Math.random() - 0.5) * 14 * dt + Math.sin(p.age * 7 + (p.spin || 0)) * 3 * dt;
      p.vx = Math.cos(p.ang) * p.spd; p.vy = Math.sin(p.ang) * p.spd;
      return false;
    }
    case 'orbit': case 'spiralout': {
      if (m === 'spiralout') p.orbR += p.spd * 0.22 * dt;
      const da = p.spd / p.orbR * dt;
      p.orbA += da;
      /* a new lap can hit the same pests again */
      const lapNow = Math.floor(p.orbA / TAU);
      if (lapNow !== p.lap){ p.lap = lapNow; p.hit.clear(); }
      const nx = p.ox + Math.cos(p.orbA) * p.orbR, ny = p.oy + Math.sin(p.orbA) * p.orbR;
      p.vx = (nx - p.x) / Math.max(dt, 1e-6); p.vy = (ny - p.y) / Math.max(dt, 1e-6);
      p.x = nx; p.y = ny; p.ang = p.orbA + Math.PI / 2;
      return true;
    }
  }
  return false;
}
/* trail particles for an object in flight: colours and shapes by trail kind; emit(x, y, vx, vy, life, colour, size, kind) */
function objectTrail(o, p, dt, emit){
  const tr = o.trail;
  if (!tr || tr === 'none') return;
  p.trAcc = (p.trAcc || 0) + dt;
  const every = { ribbon: 0.016, sparks: 0.03, smoke: 0.04, fire: 0.025, bubbles: 0.06, stars: 0.05, ice: 0.04 }[tr] || 0.04;
  while (p.trAcc >= every){
    p.trAcc -= every;
    const back = -Math.cos(p.ang) * 20, bk2 = -Math.sin(p.ang) * 20, L = o.trailLen || 1, c = o.trailC;
    switch (tr){
      case 'ribbon': emit(p.x, p.y, back * 0.6, bk2 * 0.6, 0.22 * L, c, o.size * 0.55, 'smoke'); break;
      case 'sparks': emit(p.x, p.y, (Math.random() - 0.5) * 120 + back, (Math.random() - 0.5) * 120 + bk2, 0.3 * L, Math.random() < 0.5 ? c : '#ffffff', 2 + Math.random() * 2, 'spark'); break;
      case 'smoke': emit(p.x + (Math.random() - 0.5) * 6, p.y + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20 - 10, 0.6 * L, c, o.size * 0.5, 'smoke'); break;
      case 'fire': emit(p.x, p.y, back * 1.5 + (Math.random() - 0.5) * 40, bk2 * 1.5 + (Math.random() - 0.5) * 40, 0.3 * L, Math.random() < 0.4 ? '#ffd166' : c, o.size * 0.6, 'flame'); break;
      case 'bubbles': emit(p.x + (Math.random() - 0.5) * 10, p.y + (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 30, -20 - Math.random() * 30, 0.8 * L, c, 2 + Math.random() * 3, 'bubble'); break;
      case 'stars': emit(p.x, p.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0.45 * L, c, 2.5 + Math.random() * 2, 'star'); break;
      case 'ice': emit(p.x, p.y, (Math.random() - 0.5) * 40 + back * 0.5, (Math.random() - 0.5) * 40 + bk2 * 0.5, 0.5 * L, Math.random() < 0.5 ? '#ffffff' : c, 2 + Math.random() * 2, 'ice'); break;
    }
  }
}
