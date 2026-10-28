'use strict';
/* =====================================================================
   Kitchen Siege — the Body Workshop: appliances that look like your own
   A body is a 3D model you build from parts: a base (a rounded box, a
   drum, a dome) and up to 16 parts on it — boxes, cylinders, cones,
   barrels, balls, domes, rings, blades, fins, knobs, lights, flames and
   steam — each with its own place, size, colour, material, spin, bob and
   when it shows (always, while firing, while idle). The same body is
   drawn as a real 3D model (gl3d), as a solid in the fallback renderer,
   and flat on canvases without WebGL.
   Bodies live on the profile (Profile.bodies). A custom appliance can
   wear one instead of a built-in look, and an upgrade can swap it for
   another (the "Look becomes" change), so an appliance can grow and
   change as it is upgraded. They have share codes (KSB1:...).
   ===================================================================== */
const BODY_MAX = 24, BODY_PARTS = 16, BODY_PREFIX = 'KSB1:';
const BODY_KINDS = {
  box:'Box', rbox:'Rounded box', cyl:'Cylinder', cone:'Cone', barrel:'Barrel (points the way it aims)', sphere:'Ball', dome:'Dome', capsule:'Capsule',
  ring:'Ring', disc:'Disc', blade:'Blade (star)', fin:'Fin', knob:'Knob', light:'Light', flame:'Flame', steam:'Steam',
};
const BODY_BASES = { rbox:'Rounded box', box:'Box', cyl:'Drum', dome:'Dome', none:'No base (parts only)' };
const BODY_MATS = { matte:'Matte', plastic:'Plastic', steel:'Steel', gold:'Gold', glass:'Glass', neon:'Neon (glows)' };
const BODY_SHOW = { always:'Always', fire:'While firing', idle:'While idle' };
/* which size fields each kind uses */
const BODY_DIMS = {
  box:['w', 'd', 'h'], rbox:['w', 'd', 'h', 'r'], cyl:['r', 'r2', 'h'], cone:['r', 'h'], barrel:['r', 'h'], sphere:['r'], dome:['r'], capsule:['r', 'h'],
  ring:['r', 'r2'], disc:['r', 'h'], blade:['r', 'n', 'h'], fin:['w', 'd', 'h'], knob:['r', 'h'], light:['r'], flame:['r', 'h'], steam:['r', 'n'],
};
const BODY_NUM = (v, lo, hi, def, step) => { v = Number(v); if (!isFinite(v)) return def; v = Math.min(hi, Math.max(lo, v)); if (step) v = Math.round(v / step) * step; return Math.round(v * 100) / 100; };
const BODY_COL = (v, def) => v === '' ? '' : /^#[0-9a-f]{6}$/i.test(v || '') ? v.toLowerCase() : def;
function defaultBodyPart(k){
  return { k: BODY_KINDS[k] ? k : 'box', x:0, y:0, z:14, w:10, d:10, h:6, r:5, r2:4, n:6, c:'#c9d2d6', mat:'steel', glow:0, spin:0, bob:0, show:'always', tilt:0, turn:0, aim:false, kick:0 };
}
function defaultBody(){
  return { v:1, name:'New Body', size:17, turns:true, feet:true,
    base:{ k:'rbox', w:30, d:30, h:13, r:6, c:'', mat:'plastic' },
    parts:[Object.assign(defaultBodyPart('barrel'), { x:8, z:9, r:3.5, h:16, c:'#2a2f33', mat:'steel' })], created:0 };
}
function cleanBodyPart(s){
  s = s && typeof s === 'object' ? s : {};
  const P = defaultBodyPart(s.k);
  P.x = BODY_NUM(s.x, -40, 40, 0, 0.5); P.y = BODY_NUM(s.y, -40, 40, 0, 0.5); P.z = BODY_NUM(s.z, 0, 60, 14, 0.5);
  P.w = BODY_NUM(s.w, 0.5, 60, 10, 0.5); P.d = BODY_NUM(s.d, 0.5, 60, 10, 0.5); P.h = BODY_NUM(s.h, 0.2, 60, 6, 0.5);
  P.r = BODY_NUM(s.r, 0.3, 40, 5, 0.25); P.r2 = BODY_NUM(s.r2, 0, 40, 4, 0.25); P.n = BODY_NUM(s.n, 3, 16, 6, 1);
  P.c = BODY_COL(s.c, '#c9d2d6'); P.mat = BODY_MATS[s.mat] ? s.mat : 'steel';
  P.glow = BODY_NUM(s.glow, 0, 1, 0, 0.05);
  P.spin = BODY_NUM(s.spin, -4, 4, 0, 0.25); P.bob = BODY_NUM(s.bob, 0, 10, 0, 0.5);
  P.show = BODY_SHOW[s.show] ? s.show : 'always';
  P.tilt = BODY_NUM(s.tilt, -90, 90, 0, 5); P.turn = BODY_NUM(s.turn, -180, 180, 0, 5);
  P.aim = !!s.aim; P.kick = BODY_NUM(s.kick, 0, 10, 0, 0.5);
  return P;
}
function cleanBody(src){
  src = src && typeof src === 'object' ? src : {};
  const b = defaultBody();
  b.name = cleanText(src.name, 20, 'Body');
  b.size = BODY_NUM(src.size, 12, 26, 17, 1);
  b.turns = src.turns !== false;
  b.feet = src.feet !== false;
  const B0 = src.base && typeof src.base === 'object' ? src.base : {};
  b.base = { k: BODY_BASES[B0.k] ? B0.k : 'rbox', w: BODY_NUM(B0.w, 6, 60, 30, 0.5), d: BODY_NUM(B0.d, 6, 60, 30, 0.5), h: BODY_NUM(B0.h, 2, 40, 13, 0.5), r: BODY_NUM(B0.r, 0.5, 30, 6, 0.5),
    c: BODY_COL(B0.c, ''), mat: BODY_MATS[B0.mat] ? B0.mat : 'plastic' };
  b.parts = (Array.isArray(src.parts) ? src.parts : []).slice(0, BODY_PARTS).map(cleanBodyPart);
  b.created = Number(src.created) || 0;
  return b;
}
/* ready-made bodies to start from */
const BODY_PREFABS = {
  turret:  { name:'Turret', size:17, base:{ k:'cyl', w:30, d:30, h:9, r:6, c:'', mat:'plastic' }, parts:[
    { k:'dome', x:0, y:0, z:10, r:11, c:'', mat:'plastic' }, { k:'barrel', x:9, y:0, z:14, r:3, h:18, c:'#2a2f33', mat:'steel' }, { k:'ring', x:24, y:0, z:14, r:4, r2:1, c:'#f2c14e', mat:'gold', tilt:90 },
    { k:'knob', x:-6, y:0, z:20, r:2.5, h:2, c:'#e2383f', mat:'plastic' }, { k:'light', x:-6, y:0, z:22.5, r:1.6, c:'#ff6a4a', mat:'neon', glow:1, show:'fire' } ] },
  pot:     { name:'Stock Pot', size:17, turns:false, base:{ k:'cyl', w:32, d:32, h:16, r:6, c:'', mat:'steel' }, parts:[
    { k:'ring', x:0, y:0, z:16, r:16, r2:1.2, c:'#7f8b90', mat:'steel' }, { k:'ring', x:0, y:-16.5, z:12, r:3.5, r2:0.9, c:'#2a2f33', mat:'steel', tilt:90, turn:90 }, { k:'ring', x:0, y:16.5, z:12, r:3.5, r2:0.9, c:'#2a2f33', mat:'steel', tilt:90, turn:90 },
    { k:'disc', x:0, y:0, z:16, r:14.5, h:1, c:'#3b5560', mat:'glass' }, { k:'steam', x:0, y:0, z:18, r:3, n:4, c:'#ffffff', mat:'matte' },
    { k:'flame', x:0, y:0, z:0, r:14, h:5, c:'#ff8a3d', mat:'neon' } ] },
  robot:   { name:'Kitchen Bot', size:16, base:{ k:'rbox', w:22, d:26, h:18, r:5, c:'', mat:'plastic' }, parts:[
    { k:'sphere', x:0, y:0, z:18, r:9, c:'#e8eef0', mat:'plastic' }, { k:'light', x:6, y:-3, z:24, r:2, c:'#7fffe3', mat:'neon', glow:1 }, { k:'light', x:6, y:3, z:24, r:2, c:'#7fffe3', mat:'neon', glow:1 },
    { k:'cyl', x:0, y:0, z:27, r:0.8, r2:0.8, h:6, c:'#2a2f33', mat:'steel' }, { k:'light', x:0, y:0, z:33, r:1.8, c:'#e2383f', mat:'neon', glow:1, bob:1 },
    { k:'box', x:0, y:-16, z:6, w:8, d:5, h:9, c:'#7f8b90', mat:'steel', tilt:-20 }, { k:'box', x:0, y:16, z:6, w:8, d:5, h:9, c:'#7f8b90', mat:'steel', tilt:20 } ] },
  cauldron:{ name:'Cauldron', size:18, turns:false, base:{ k:'none', w:30, d:30, h:12, r:6, c:'', mat:'matte' }, parts:[
    { k:'sphere', x:0, y:0, z:3, r:15, c:'#2a2f33', mat:'matte' }, { k:'ring', x:0, y:0, z:17, r:11.5, r2:1.6, c:'#1d2124', mat:'matte' }, { k:'disc', x:0, y:0, z:16.5, r:10.5, h:0.6, c:'#6fe36f', mat:'neon', glow:0.6, spin:0.3 },
    { k:'steam', x:0, y:0, z:18, r:3.5, n:5, c:'#a8ffb0', mat:'matte' }, { k:'flame', x:0, y:0, z:0, r:12, h:6, c:'#ff8a3d', mat:'neon' }, { k:'cyl', x:0, y:0, z:0, r:13, r2:11, h:3, c:'#5a3b22', mat:'matte' } ] },
  tower:   { name:'Spire', size:16, turns:false, base:{ k:'cyl', w:26, d:26, h:6, r:6, c:'', mat:'steel' }, parts:[
    { k:'cone', x:0, y:0, z:6, r:11, h:26, c:'', mat:'plastic' }, { k:'ring', x:0, y:0, z:14, r:9.5, r2:0.8, c:'#f2c14e', mat:'gold', spin:0.5 }, { k:'ring', x:0, y:0, z:22, r:6, r2:0.7, c:'#f2c14e', mat:'gold', spin:-0.5 },
    { k:'sphere', x:0, y:0, z:33, r:3.5, c:'#8b5cf6', mat:'neon', glow:0.9, bob:1.5 }, { k:'blade', x:0, y:0, z:36, r:7, n:4, h:0.8, c:'#d7c6ff', mat:'glass', spin:1 } ] },
  saucer:  { name:'Saucer', size:18, turns:false, base:{ k:'none', w:30, d:30, h:8, r:6, c:'', mat:'steel' }, parts:[
    { k:'cyl', x:0, y:0, z:4, r:18, r2:16, h:4, c:'', mat:'steel' }, { k:'cyl', x:0, y:0, z:0, r:12, r2:18, h:4, c:'#7f8b90', mat:'steel' }, { k:'dome', x:0, y:0, z:8, r:9, c:'#9ad7ff', mat:'glass' },
    { k:'ring', x:0, y:0, z:6, r:17, r2:1, c:'#7fffe3', mat:'neon', glow:0.8, spin:1.5 }, { k:'light', x:0, y:0, z:0.5, r:3, c:'#7fffe3', mat:'neon', glow:1, bob:2 } ] },
  jukebox: { name:'Jukebox', size:17, turns:false, base:{ k:'rbox', w:28, d:24, h:22, r:8, c:'', mat:'plastic' }, parts:[
    { k:'disc', x:0, y:0, z:22, r:10, h:1, c:'#2a2f33', mat:'matte' }, { k:'disc', x:0, y:0, z:23, r:8, h:0.6, c:'#1d2124', mat:'matte', spin:1 }, { k:'disc', x:0, y:0, z:23.6, r:2.8, h:0.4, c:'#e2383f', mat:'plastic', spin:1 },
    { k:'light', x:14, y:-8, z:16, r:1.8, c:'#ffd166', mat:'neon', glow:1 }, { k:'light', x:14, y:0, z:16, r:1.8, c:'#ff6a4a', mat:'neon', glow:1, show:'fire' }, { k:'light', x:14, y:8, z:16, r:1.8, c:'#7fffe3', mat:'neon', glow:1 },
    { k:'ring', x:0, y:0, z:22.2, r:11, r2:0.8, c:'#f2c14e', mat:'gold' } ] },
  cannon:  { name:'Cannon', size:18, base:{ k:'box', w:26, d:22, h:7, r:3, c:'#5a3b22', mat:'matte' }, parts:[
    { k:'disc', x:0, y:-11.5, z:0, r:7, h:2, c:'#2a2f33', mat:'matte', tilt:90 }, { k:'disc', x:0, y:11.5, z:0, r:7, h:2, c:'#2a2f33', mat:'matte', tilt:90 },
    { k:'barrel', x:-2, y:0, z:11, r:5.5, h:26, c:'#2a2f33', mat:'steel' }, { k:'ring', x:22, y:0, z:11, r:6.5, r2:1.2, c:'#f2c14e', mat:'gold', tilt:90 }, { k:'sphere', x:-6, y:0, z:11, r:6.5, c:'#2a2f33', mat:'steel' },
    { k:'flame', x:26, y:0, z:11, r:5, h:9, c:'#ffd166', mat:'neon', show:'fire', tilt:90 } ] },
};
BODY_PREFABS.dish = { name:'Satellite Dish', size:17, turns:false, base:{ k:'rbox', w:28, d:28, h:6, r:5, c:'', mat:'plastic' }, parts:[
    { k:'cyl', x:0, y:0, z:6, r:3, r2:2.5, h:10, c:'#7f8b90', mat:'steel' }, { k:'cyl', x:3, y:0, z:14, r:12, r2:4, h:5, c:'#e8eef0', mat:'plastic', tilt:-60, aim:true, kick:3 },
    { k:'cyl', x:9, y:0, z:17, r:0.8, r2:0.8, h:9, c:'#2a2f33', mat:'steel', tilt:30, aim:true }, { k:'light', x:16, y:0, z:21, r:1.8, c:'#ff6a4a', mat:'neon', glow:1, aim:true, show:'fire' },
    { k:'knob', x:-9, y:9, z:6, r:2, h:1.5, c:'#2a2f33', mat:'plastic' } ] };
BODY_PREFABS.gatling = { name:'Gatling', size:17, turns:false, base:{ k:'cyl', w:30, d:30, h:7, r:6, c:'', mat:'steel' }, parts:[
    { k:'cyl', x:0, y:0, z:7, r:8, r2:8, h:9, c:'#2a2f33', mat:'steel', aim:true }, { k:'barrel', x:6, y:0, z:11, r:4, h:18, c:'#7f8b90', mat:'steel', aim:true, kick:2 },
    { k:'barrel', x:22, y:0, z:11, r:4.6, h:3, c:'#2a2f33', mat:'steel', aim:true, spin:3, kick:2 }, { k:'blade', x:24.5, y:0, z:15, r:4.2, n:6, h:1, c:'#c9d2d6', mat:'steel', tilt:90, aim:true, spin:3 },
    { k:'box', x:-6, y:0, z:16, w:8, d:10, h:5, c:'#5a3b22', mat:'matte', aim:true }, { k:'flame', x:26, y:0, z:15, r:3, h:7, c:'#ffd166', mat:'neon', show:'fire', tilt:90, aim:true } ] };
BODY_PREFABS.jar = { name:'Blender Jar', size:16, turns:false, base:{ k:'rbox', w:24, d:24, h:9, r:7, c:'', mat:'plastic' }, parts:[
    { k:'cyl', x:0, y:0, z:9, r:10, r2:11.5, h:22, c:'#bfe9ff', mat:'glass' }, { k:'blade', x:0, y:0, z:10.5, r:7, n:4, h:0.8, c:'#c9d2d6', mat:'steel', spin:4 },
    { k:'disc', x:0, y:0, z:31, r:11.5, h:2, c:'#2a2f33', mat:'plastic' }, { k:'knob', x:0, y:0, z:33, r:3, h:2, c:'#7f8b90', mat:'steel' },
    { k:'knob', x:9, y:0, z:9, r:2.2, h:2, c:'#e2383f', mat:'plastic' }, { k:'light', x:9, y:5, z:9, r:1.3, c:'#7fffe3', mat:'neon', glow:1, show:'fire' } ] };
BODY_PREFABS.lantern = { name:'Lantern', size:15, turns:false, base:{ k:'cyl', w:22, d:22, h:4, r:6, c:'#2a2f33', mat:'matte' }, parts:[
    { k:'cyl', x:0, y:0, z:4, r:2, r2:1.6, h:22, c:'#2a2f33', mat:'steel' }, { k:'ring', x:0, y:0, z:27, r:5, r2:0.8, c:'#f2c14e', mat:'gold' },
    { k:'sphere', x:0, y:0, z:22, r:6, c:'#ffd166', mat:'glass', bob:1 }, { k:'light', x:0, y:0, z:26, r:2.5, c:'#ffb27a', mat:'neon', glow:1, bob:1 },
    { k:'steam', x:0, y:0, z:34, r:1.6, n:3, c:'#ffe3a0', mat:'matte' }, { k:'fin', x:0, y:0, z:4, w:14, d:1.5, h:5, c:'#2a2f33', mat:'matte' }, { k:'fin', x:0, y:0, z:4, w:14, d:1.5, h:5, c:'#2a2f33', mat:'matte', turn:90 } ] };
const BODY_PREFAB_ORDER = ['turret', 'pot', 'robot', 'cauldron', 'tower', 'saucer', 'jukebox', 'cannon', 'dish', 'gatling', 'jar', 'lantern'];
function prefabBody(key){ return cleanBody(Object.assign(JSON.parse(JSON.stringify(BODY_PREFABS[key] || BODY_PREFABS.turret)), { v:1 })); }

/* ---------------- the library on the profile ---------------- */
function bodyStore(){ if (!Profile.bodies || typeof Profile.bodies !== 'object' || Array.isArray(Profile.bodies)) Profile.bodies = {}; return Profile.bodies; }
function bodyList(){ const S = bodyStore(); return Object.keys(S).sort((a, b) => (S[a].created || 0) - (S[b].created || 0)); }
function bodyById(id){ const S = bodyStore(); return id && S[id] ? S[id] : null; }
function newBodyId(){ let n = 1; while (bodyStore()['bd' + n]) n++; return 'bd' + n; }
function saveBody(body, id){
  const S = bodyStore();
  if (!id && Object.keys(S).length >= BODY_MAX) return null;
  id = id || newBodyId();
  const b = cleanBody(body);
  b.created = (S[id] && S[id].created) || Date.now();
  b._rev = Date.now();
  S[id] = b;
  saveProfile();
  if (typeof syncCustomTowers === 'function') syncCustomTowers();
  if (typeof Art !== 'undefined' && Art.clearIcons) Art.clearIcons();
  return id;
}
function deleteBody(id){
  const S = bodyStore();
  if (!S[id]) return false;
  delete S[id];
  saveProfile();
  if (typeof syncCustomTowers === 'function') syncCustomTowers();
  if (typeof Art !== 'undefined' && Art.clearIcons) Art.clearIcons();
  return true;
}
/* the look key a body is drawn under */
function bodyLook(id){ return 'cb_' + id; }
function isBodyLook(look){ return typeof look === 'string' && look.startsWith('cb_'); }
function bodyOfLook(look){ return isBodyLook(look) ? bodyById(look.slice(3)) : null; }
/* how many designs wear this body or switch to it in an upgrade */
function bodyUses(id){
  let n = 0;
  for (const k in (Profile.custom || {})){
    const d = Profile.custom[k];
    if (d.body === id) n++;
    if (d.paragon && d.paragon.look === 'b:' + id) n++;
    for (const P of (d.paths || [])) for (const T of (P.tiers || [])) for (const m of (T.mods || [])) if (m.k === 'look' && m.e === 'b:' + id) n++;
  }
  return n;
}
function bodyCode(b){ return BODY_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(cleanBody(b))))); }
function bodyFromCode(code){
  code = String(code || '').trim();
  if (!code.startsWith(BODY_PREFIX)) throw new Error('That is not a body code (it should start with ' + BODY_PREFIX + ').');
  let o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(code.slice(BODY_PREFIX.length))))); } catch (e) { throw new Error('That code could not be read.'); }
  return cleanBody(o);
}
function bodyHeight(b){
  let top = b.base.k === 'none' ? 0 : b.base.h + (b.feet ? 1 : 0);
  for (const P of b.parts){
    const h = P.k === 'sphere' ? P.r * 2 : P.k === 'dome' || P.k === 'light' ? P.r : P.k === 'ring' ? P.r2 * 2 : P.k === 'barrel' ? P.r * 2 : P.k === 'steam' ? P.r * 4 : P.h;
    top = Math.max(top, P.z + h);
  }
  return top;
}

/* ---------------- 3D: the model ---------------- */
const BODY_TAU = Math.PI * 2;
function bodyPaint(B, c, mat, glow, fallback){
  const col = c || fallback || '';
  if (!col) B.body(1); else B.color(col, mat === 'glass' ? 0.5 : 1);
  switch (mat){
    case 'matte': B.shine(0.05); break;
    case 'plastic': B.shine(0.3); break;
    case 'steel': B.shine(0.8); break;
    case 'gold': B.shine(0.9); break;
    case 'glass': B.shine(0.95); break;
    case 'neon': B.shine(0); break;
  }
  B.glow(mat === 'neon' ? Math.max(0.6, glow || 0) : (glow || 0));
}
function bodyStar(r0, r1, n){ const p = []; for (let i = 0; i < n * 2; i++){ const a = -Math.PI / 2 + i / (n * 2) * BODY_TAU, r = i % 2 ? r1 : r0; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }
/* how far a part turns to point at the aim on its own (in the body's frame, which may itself have turned) */
function bodyAimTurn(t){ return (typeof GL3D !== 'undefined' ? GL3D.turnFor(t && t.aim != null ? t.aim : -Math.PI / 2, 0) : (t && t.aim != null ? t.aim : -Math.PI / 2)) - ((t && t._g3rot) || 0); }
function bodyKick(t, k){ return t && t.fireAnim > 0 ? -Math.min(t.fireAnim, 0.22) / 0.22 * k : 0; }
/* a part's own motion, in its own frame: spin (a barrel spins along its length), bob, recoil along its own
   forward (aiming parts recoil with their aim instead), and a flame's flicker */
function bodyPartAnim(P){
  const spin = P.spin * BODY_TAU, bob = P.bob, kick = P.aim ? 0 : P.kick, axis = P.k === 'barrel' ? 'rx' : 'rz';
  if (!spin && !bob && !kick && P.k !== 'flame') return null;
  return (time, t) => {
    const o = { z: Math.sin(time * 3) * bob };
    if (spin) o[axis] = time * spin;
    if (kick) o.x = bodyKick(t, kick);
    if (P.k === 'flame'){ o.sz = 0.85 + 0.25 * Math.sin(time * 12 + P.x); o.sx = 1 + 0.08 * Math.sin(time * 9 + P.y); o.s = 1; }
    return o;
  };
}
/* an aiming part swings around the body's centre, like a turret on a still base, and recoils along its aim */
function bodyAimAnim(P){
  return (time, t) => { const a = bodyAimTurn(t), k = P.kick ? bodyKick(t, P.kick) : 0; return { rz: a, x: Math.cos(a) * k, y: Math.sin(a) * k }; };
}
/* every size and place in a body scaled by k */
function scaleBody(b, k){
  const base = b.base;
  for (const f of ['w', 'd', 'h', 'r']) base[f] = BODY_NUM(base[f] * k, f === 'h' ? 2 : f === 'r' ? 0.5 : 6, f === 'h' ? 40 : f === 'r' ? 30 : 60, base[f], 0.5);
  for (const P of b.parts) for (const f of ['x', 'y', 'z', 'w', 'd', 'h', 'r', 'r2']){ const lo = f === 'x' || f === 'y' ? -40 : 0, hi = f === 'z' || f === 'w' || f === 'd' || f === 'h' ? 60 : 40; P[f] = BODY_NUM(P[f] * k, lo, hi, P[f], 0.25); }
  return b;
}
function bodyPartShow(P){
  if (P.show === 'fire') return (time, t) => !!(t && t.fireAnim > 0);
  if (P.show === 'idle') return (time, t) => !(t && t.fireAnim > 0);
  return null;
}
function bodyBuild(B, b){
  const base = b.base;
  const bc = base.c, bm = base.mat;
  let z0 = 0;
  if (base.k !== 'none' && b.feet){ B.push(); B.color('#22272a').shine(0.05).glow(0); B.rbox(Math.max(4, base.w - 2.4), Math.max(4, base.d - 2.4), 1.1, Math.max(0.5, Math.min(base.r, base.w / 2, base.d / 2) - 1.2), 0); B.pop(); z0 = 1; }
  if (base.k !== 'none'){
    B.push().at(0, 0, z0); bodyPaint(B, bc, bm, 0);
    if (base.k === 'rbox') B.rbox(base.w, base.d, base.h, base.r);
    else if (base.k === 'box') B.box(base.w, base.d, base.h);
    else if (base.k === 'cyl') B.cyl(base.w / 2, base.w / 2 * 0.96, base.h, 24);
    else if (base.k === 'dome') B.push().scale(1, 1, base.h / (base.w / 2)).dome(base.w / 2, 24, 8).pop();
    B.pop();
  }
  for (const P of b.parts){
    const aim = P.aim ? bodyAimAnim(P) : null;
    if (aim) B.part(aim);
    B.push().at(P.x, P.y, P.z);
    if (P.turn) B.rotZ(P.turn * Math.PI / 180);
    if (P.tilt) B.rotY(P.tilt * Math.PI / 180);
    if (P.k === 'barrel') B.at(0, 0, P.r);
    const anim = bodyPartAnim(P), show = bodyPartShow(P);
    if (anim || show) B.part(anim, show);
    bodyPaint(B, P.c, P.mat, P.glow, bc);
    switch (P.k){
      case 'box': B.box(P.w, P.d, P.h); break;
      case 'rbox': B.rbox(P.w, P.d, P.h, P.r); break;
      case 'cyl': B.cyl(P.r, Math.max(0.05, P.r2), P.h, 18); break;
      case 'cone': B.cyl(P.r, 0.05, P.h, 18); break;
      case 'barrel': B.push().rotY(Math.PI / 2).cyl(P.r, P.r, P.h, 16).pop(); break;
      case 'sphere': B.push().at(0, 0, P.r).sphere(P.r, 18, 10).pop(); break;
      case 'dome': B.dome(P.r, 18, 6); break;
      case 'capsule': B.capsule(P.r, Math.max(P.h, P.r * 2.05), 14); break;
      case 'ring': B.torus(P.r, Math.max(0.2, P.r2), 24, 8); break;
      case 'disc': B.cyl(P.r, P.r, P.h, 24); break;
      case 'blade': B.push().at(0, 0, -P.h / 2).extrude(bodyStar(P.r, P.r * 0.55, Math.round(P.n)), P.h).pop(); break;
      case 'fin': B.push().rotX(Math.PI / 2).at(0, 0, -P.d / 2).extrude([[-P.w / 2, 0], [P.w / 2, 0], [P.w * 0.3, -P.h], [-P.w * 0.1, -P.h]], P.d).pop(); break;
      case 'knob': B.cyl(P.r, P.r * 0.92, P.h, 14); B.push().at(P.r * 0.45, 0, P.h + 0.02).color('#ffffff').shine(0.2).flat([[-P.r * 0.4, -0.35], [P.r * 0.45, -0.35], [P.r * 0.45, 0.35], [-P.r * 0.4, 0.35]]).pop(); break;
      case 'light': B.glow(Math.max(0.85, P.glow)); B.push().at(0, 0, P.r).sphere(P.r, 12, 8).pop(); break;
      case 'flame': {
        const r = P.r, h = P.h;
        B.color('#ffe08a', 0.92).shine(0).glow(0.9);
        B.push().at(0, 0, 0.2).lathe([[0, 0], [r * 0.55, h * 0.12], [r * 0.5, h * 0.32], [r * 0.2, h * 0.55], [0, h * 0.68]], 8, { caps: false }).pop();
        B.color(P.c || '#ff8a3d', 0.8).glow(0.75);
        B.lathe([[0, 0], [r * 0.9, h * 0.12], [r, h * 0.3], [r * 0.6, h * 0.62], [r * 0.18, h * 0.88], [0, h]], 10, { caps: false });
        break;
      }
      case 'steam': {
        const n = Math.round(P.n);
        for (let i = 0; i < n; i++){
          B.push();
          B.part((time) => { const k = ((time * 0.7 + i / n) % 1 + 1) % 1; return { x: Math.sin(time * 1.7 + i * 2.1) * 1.6, z: k * P.r * 4, s: 0.45 + k * 1.1 }; }, (time) => ((time * 0.7 + i / n) % 1 + 1) % 1 < 0.92);
          B.color(P.c || '#ffffff', 0.42).shine(0).glow(0); B.sphere(P.r, 10, 6);
          B.endPart(); B.pop();
        }
        break;
      }
    }
    if (anim || show) B.endPart();
    B.pop();
    if (aim) B.endPart();
  }
}

/* ---------------- flat: the same body drawn from above on a canvas ---------------- */
function bodyShade(hex, k){
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '#c9d2d6');
  if (!m) return hex;
  const f = v => Math.max(0, Math.min(255, Math.round(parseInt(v, 16) * k)));
  return 'rgb(' + f(m[1]) + ',' + f(m[2]) + ',' + f(m[3]) + ')';
}
function bodyDrawFlat(b){
  return function(g, t, up, time){
    const T = TOWERS[t.type];
    const base = b.base, bc = base.c || bodyColourNow(t);
    const firing = !!(t && t.fireAnim > 0);
    const fill = (c, mat, glow) => {
      g.fillStyle = mat === 'glass' ? bodyShade(c, 1.15) : c;
      if (mat === 'glass') g.globalAlpha = 0.55;
      g.fill(); g.globalAlpha = 1;
      g.lineWidth = 1.2; g.strokeStyle = bodyShade(c, 0.5); g.stroke();
      if (mat === 'neon' || glow > 0.3){ g.save(); g.globalAlpha = 0.35; g.shadowColor = c; g.shadowBlur = 8; g.fill(); g.restore(); }
    };
    const rr = (x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const circ = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, BODY_TAU); };
    if (base.k !== 'none'){
      if (base.k === 'cyl' || base.k === 'dome') circ(0, 0, base.w / 2); else rr(-base.w / 2, -base.d / 2, base.w, base.d, base.k === 'box' ? 1.5 : base.r);
      fill(bc, base.mat, 0);
      /* a lighter top */
      g.save(); g.globalAlpha = 0.18; g.fillStyle = '#ffffff';
      if (base.k === 'cyl' || base.k === 'dome') circ(0, 0, base.w / 2 * 0.72); else rr(-base.w / 2 + 3, -base.d / 2 + 3, base.w - 6, base.d - 6, base.r);
      g.fill(); g.restore();
    }
    const parts = b.parts.slice().sort((p, q) => p.z - q.z);
    for (const P of parts){
      if (P.show === 'fire' && !firing) continue;
      if (P.show === 'idle' && firing) continue;
      const c = P.c || bc;
      const kk = P.kick ? bodyKick(t, P.kick) : 0;
      g.save();
      /* an aiming part swings around the centre and recoils along its aim; others recoil along their own forward */
      if (P.aim) g.rotate((t && t.aim != null ? t.aim : -Math.PI / 2) - ((t && t.rotNow) || 0));
      g.translate(P.x + (P.aim ? kk : 0), P.y - Math.sin(time * 3) * P.bob * 0.5);
      if (P.turn) g.rotate(P.turn * Math.PI / 180);
      if (kk && !P.aim) g.translate(kk, 0);
      if (P.spin && P.k !== 'barrel') g.rotate(time * P.spin * BODY_TAU);
      switch (P.k){
        case 'box': case 'rbox': case 'fin': rr(-P.w / 2, -P.d / 2, P.w, P.d, P.k === 'rbox' ? P.r : 1); fill(c, P.mat, P.glow); break;
        case 'cyl': case 'cone': case 'disc': case 'knob': case 'capsule': circ(0, 0, P.r); fill(c, P.mat, P.glow); if (P.k === 'cone'){ circ(0, 0, P.r * 0.35); g.fillStyle = bodyShade(c, 1.25); g.fill(); } break;
        case 'sphere': case 'dome': case 'light': circ(0, 0, P.r); fill(c, P.mat, P.k === 'light' ? 1 : P.glow); circ(-P.r * 0.3, -P.r * 0.3, P.r * 0.3); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); break;
        case 'barrel': rr(0, -P.r, P.h, P.r * 2, P.r * 0.6); fill(c, P.mat, P.glow); break;
        case 'ring': g.beginPath(); g.arc(0, 0, P.r, 0, BODY_TAU); g.lineWidth = Math.max(1, P.r2 * 2); g.strokeStyle = c; g.stroke(); g.lineWidth = 1; g.strokeStyle = bodyShade(c, 0.5); g.beginPath(); g.arc(0, 0, P.r + P.r2, 0, BODY_TAU); g.stroke(); break;
        case 'blade': { const n = Math.round(P.n), pts = bodyStar(P.r, P.r * 0.55, n); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); fill(c, P.mat, P.glow); break; }
        case 'flame': { const k = 0.8 + 0.2 * Math.sin(time * 12); circ(0, 0, P.r * k); g.fillStyle = c; g.globalAlpha = 0.85; g.fill(); circ(0, 0, P.r * 0.5 * k); g.fillStyle = '#ffe08a'; g.fill(); g.globalAlpha = 1; break; }
        case 'steam': { const n = Math.round(P.n); for (let i = 0; i < n; i++){ const q = ((time * 0.7 + i / n) % 1 + 1) % 1; circ(Math.sin(time * 1.7 + i * 2.1) * 1.6, -q * 6, P.r * (0.45 + q * 1.1)); g.fillStyle = c; g.globalAlpha = 0.35 * (1 - q); g.fill(); } g.globalAlpha = 1; break; }
      }
      g.restore();
    }
  };
}
/* the colour a body's "body colour" parts take: the skin or own colour being drawn (Art sets it while it draws),
   else gold for a paragon, else brushed steel */
function bodyColourNow(t){
  const c = typeof Art !== 'undefined' && Art.skinBodyNow ? Art.skinBodyNow() : null;
  if (c) return c;
  const own = (t && t.s && t.s.tint) || (t && t.tint) || (t && TOWERS[t.type] && TOWERS[t.type].tint);
  if (own) return own;
  return t && t.paragon ? '#f2c14e' : '#c9d2d6';
}
/* the solid renderer's outline of the base */
function bodyForm(b){
  const base = b.base;
  const color = t => base.c || bodyColourNow(t);
  if (base.k === 'none') return { parts:[{ cx:0, cy:0, rx: b.size * 0.75 }], color };
  if (base.k === 'cyl' || base.k === 'dome') return { parts:[{ cx:0, cy:0, rx: base.w / 2 }], color };
  return { parts:[{ x:-base.w / 2, y:-base.d / 2, w: base.w, h: base.d, r: base.k === 'box' ? 1.5 : base.r }], color };
}
/* how tall the solid renderer's walls stand: the base (parts ride on top of it) */
function bodyWallHeight(b){ return b.base.k === 'none' ? Math.min(bodyHeight(b) * 0.5, b.size * 0.6) : b.base.h + (b.feet ? 1 : 0); }
/* makes a body drawable under a look key (the game draws TOWERS[type].look) */
function registerBody(look, b){
  if (typeof MODELS3D !== 'undefined') MODELS3D[look] = { build: B => bodyBuild(B, b), key: () => 'r' + (b._rev || 0), body: t => bodyColourNow(t) };
  if (typeof Art !== 'undefined' && Art.registerLook) Art.registerLook(look, { draw: bodyDrawFlat(b), form: bodyForm(b), rotates: b.turns ? 0 : null, height: bodyWallHeight(b) / b.size });
}
function unregisterBody(look){
  if (typeof MODELS3D !== 'undefined') delete MODELS3D[look];
  if (typeof Art !== 'undefined' && Art.registerLook) Art.registerLook(look, null);
}
function syncBodies(){
  const S = bodyStore();
  if (typeof MODELS3D !== 'undefined') for (const k of Object.keys(MODELS3D)) if (isBodyLook(k) && k !== 'cb__edit' && !S[k.slice(3)]) unregisterBody(k);
  for (const id in S){ const rev = S[id]._rev || S[id].created || 1; S[id] = cleanBody(S[id]); S[id]._rev = rev; registerBody(bodyLook(id), S[id]); }
}
/* looks a design or an upgrade can take: its bodies first, then the built-in appliances */
function lookChoices(){
  const out = [];
  for (const id of bodyList()) out.push(['b:' + id, bodyById(id).name + ' (body)']);
  for (const t of BASE_TOWER_ORDER) out.push([t, TOWERS[t].name]);
  return out;
}
function lookKeyOf(choice){ return typeof choice === 'string' && choice.startsWith('b:') ? bodyLook(choice.slice(2)) : choice; }
function lookChoiceOk(choice){ return typeof choice === 'string' && (choice.startsWith('b:') ? !!bodyById(choice.slice(2)) : BASE_TOWER_ORDER.includes(choice)); }
function lookChoiceName(choice){ return choice.startsWith('b:') ? (bodyById(choice.slice(2)) || {}).name || 'a body' : (TOWERS[choice] || {}).name || choice; }
