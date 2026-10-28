'use strict';
/* =====================================================================
   Kitchen Siege — co-op (the game side)
   Two players defend one kitchen. The host's game is the real one: it
   runs the pests, the appliances and the rounds. The guest's screen is a
   puppet of it, drawn from frames the host sends about 15 times a second,
   and everything the guest does (build, upgrade, sell, target, abilities,
   start a round, change speed) goes to the host as a command.
   Each player has their own cash and owns the appliances they place: only
   the owner can upgrade or sell one. Cash the kitchen earns is split down
   the middle; lives are shared.
   The transport (WebRTC on the web, a Claude room inside Claude) lives in
   ui_coop.js; this file only makes and reads the messages.
     host -> guest  { k:'e', ... }   a frame: round, lives, cash, pests, shots
                    { k:'t', ... }   the appliances (when they change, and every
                                     couple of seconds), in parts if large
     guest -> host  { k:'c', q:[[seq, cmd, ...args], ...] }  commands not yet acked
   ===================================================================== */
const Coop = { on:false, role:null, me:0, actor:0, wallet:[0, 0], seq:0, ack:0, out:[], tv:0, tvSent:-1, tParts:null, last:null, names:['Host', 'Guest'], peerSeen:0, frames:0, cap:1500 };
const COOP_ENEMY_CAP_ROOM = 260;
let coopTypes = null;
const COOP_TYPES = () => coopTypes || (coopTypes = Object.keys(ENEMIES).sort());
function coopOn(){ return !!Coop.on; }
function coopGuest(){ return Coop.on && Coop.role === 'guest'; }
function coopHost(){ return Coop.on && Coop.role === 'host'; }
function coopReset(){
  Object.assign(Coop, { on:false, role:null, me:0, actor:0, wallet:[0, 0], seq:0, ack:0, out:[], tv:0, tvSent:-1, tParts:null, last:null, peerSeen:0, frames:0, cap:1500, guestHas:null });
}
/* the host starts co-op on the game in hand: its cash is split into two purses */
function coopHostStart(cap){
  Coop.on = true; Coop.role = 'host'; Coop.me = 0; Coop.actor = 0; Coop.cap = cap || 1500;
  const half = Math.floor(G.cash / 2);
  Coop.wallet = [G.cash - half, half];
  G.cash = Coop.wallet[0];
  Coop.tv++;
}
/* whose purse G.cash holds right now: the host's, except while a guest command runs */
function coopIncome(before){
  if (!coopHost()) return;
  const d = G.cash - before;
  if (d > 0){ const half = d / 2; G.cash -= half; Coop.wallet[1] += half; }
}
function coopCanTouch(t){ return !Coop.on || (t.own || 0) === Coop.actor; }
function coopTowersChanged(){ if (coopHost()) Coop.tv++; }

/* ---------------- the guest's commands, run on the host ---------------- */
function coopRun(cmd){
  const [op, ...a] = cmd;
  /* the shared controls */
  if (op === 'start') return startRound();
  if (op === 'speed'){ const sp = +a[0]; if ([1, 2, 3].includes(sp)) G.speed = sp; return true; }
  if (op === 'ab') return useAbility(String(a[0]));
  /* building: the guest's own purse, the guest's own appliances */
  const keep = G.cash;
  G.cash = Coop.wallet[1]; Coop.actor = 1;
  let ok = false;
  try {
    const byId = id => G.towers.find(t => t.id === id);
    if (op === 'place'){ const t = placeTower(String(a[0]), +a[1], +a[2]); if (t){ t.own = 1; ok = true; } }
    else if (op === 'up'){ const t = byId(+a[0]); if (t && coopCanTouch(t)) ok = upgradeTower(t, clamp(Math.floor(+a[1]), 0, 2)); }
    else if (op === 'sell'){ const t = byId(+a[0]); if (t && coopCanTouch(t)){ sellTower(t); ok = true; } }
    else if (op === 'set'){
      const t = byId(+a[0]), o = a[1] || {};
      if (t && coopCanTouch(t)){
        if (typeof o.tg === 'string' && targetModesOf(t).includes(o.tg)) t.tg = o.tg;
        if (Array.isArray(o.spot) && t.s && t.s.spot) t.spot = { x: clamp(+o.spot[0] || 0, 0, W), y: clamp(+o.spot[1] || 0, 0, H) };
        if (Array.isArray(o.lock)) setLock(t, { x: clamp(+o.lock[0] || 0, 0, W), y: clamp(+o.lock[1] || 0, 0, H) });
        if (typeof o.fm === 'string' && t.flyMode && flyModeOk(t, o.fm)) t.flyMode = o.fm;
        ok = true;
      }
    }
  } finally {
    Coop.wallet[1] = G.cash; G.cash = keep; Coop.actor = 0;
  }
  if (ok) coopTowersChanged();
  return ok;
}
function targetModesOf(t){ return trapTower(t.type) ? ['strong', 'first', 'last', 'close'] : ['first', 'last', 'close', 'strong']; }
/* a command packet from the guest: run the new ones, in order */
function coopHostReceive(msg){
  if (!coopHost() || !msg || msg.k !== 'c' || !Array.isArray(msg.q)) return 0;
  Coop.peerSeen = Date.now();
  if (typeof msg.name === 'string') Coop.names[1] = cleanText(msg.name, 20, 'Guest');
  let n = 0;
  for (const item of msg.q.slice(0, 40)){
    if (!Array.isArray(item) || !(item[0] > Coop.ack)) continue;
    Coop.ack = item[0];
    if (G.active && !G.over) coopRun(item.slice(1));
    n++;
  }
  return n;
}

/* ---------------- frames, host side ---------------- */
const B36 = n => { n = Math.max(0, Math.min(1295, Math.round(n))); return (n < 36 ? '0' : '') + n.toString(36); };
const B36x3 = n => { n = ((Math.round(n) % 46656) + 46656) % 46656; return ('00' + n.toString(36)).slice(-3); };
const E_FLAGS = e => (e.camo ? 1 : 0) | (e.gold ? 2 : 0) | (e.boss ? 4 : 0) | (e.freezeT > 0 ? 8 : 0) | (e.stunT > 0 ? 16 : 0);
function coopEnemyList(cap){
  const live = G.enemies.filter(e => !e.dead && e.x > -60 && e.x < W + 60 && e.y > -60 && e.y < H + 60);
  if (live.length <= cap) return live;
  /* the ones that matter most: bosses and vehicles, then the ones furthest along */
  return live.sort((a, b) => (b.boss - a.boss) || (b.big - a.big) || (b.d - a.d)).slice(0, cap);
}
function coopFrame(cap){
  const es = coopEnemyList(cap || Coop.cap);
  let e = '';
  for (const x of es){
    const ti = COOP_TYPES().indexOf(x.type);
    e += B36x3(x.id) + B36(ti < 0 ? 0 : ti) + B36(x.x + 60) + B36(x.y + 60) + Math.floor((((x.rot % TAU) + TAU) % TAU) / TAU * 36).toString(36) + Math.min(35, Math.ceil(clamp(x.hp / x.maxHp, 0, 1) * 35)).toString(36) + E_FLAGS(x).toString(36);
  }
  let p = '';
  const shots = G.projs.length > 80 ? G.projs.slice(-80) : G.projs;
  for (const s of shots) p += B36(s.x + 60) + B36(s.y + 60);
  return { k:'e', r: G.round, ra: G.roundActive ? 1 : 0, l: Math.max(0, Math.round(G.lives)), c: [Math.floor(G.cash), Math.floor(Coop.wallet[1])], sp: G.speed, ov: G.over ? 1 : 0, w: G.won ? 1 : 0, win: G.win, tv: Coop.tv, ack: Coop.ack, e, p, n: Coop.names[0], fp: G.freeplay ? 1 : 0 };
}
/* the appliances, split into parts that each fit the room's message size */
function coopTowerParts(maxLen){
  const list = G.towers.map(t => [t.id, t.type, Math.round(t.x), Math.round(t.y), t.up.join(''), t.own || 0, t.paragon ? (t.degree || 1) : 0, t.tg, t.hero ? t.level : 0, Math.round(t.dmg || 0), t.kills || 0,
    Object.fromEntries(Object.entries(t.ab || {}).filter(([, v]) => v > 0).map(([k, v]) => [k, Math.round(v * 10) / 10])), t.nozzle || '', t.flyMode || '']);
  const parts = [];
  let cur = [], len = 0;
  for (const row of list){
    const s = JSON.stringify(row).length + 1;
    if (cur.length && len + s > (maxLen || 1e9)){ parts.push(cur); cur = []; len = 0; }
    cur.push(row); len += s;
  }
  parts.push(cur);
  return parts.map((rows, i) => ({ k:'t', tv: Coop.tv, i, n: parts.length, t: rows, map: G.mapId, diff: G.diff, km: isCustomMap(G.mapId) ? kitchenCopy(G.mapId) : undefined, mode: G.mode !== 'standard' ? G.mode : undefined }));
}

/* ---------------- frames, guest side ---------------- */
function coopGuestStart(){ coopReset(); Coop.on = true; Coop.role = 'guest'; Coop.me = 1; Coop.actor = 1; }
/* queue a command for the host (it is resent until the host acknowledges it) */
function coopCmd(...cmd){
  if (!coopGuest()) return false;
  Coop.out.push([++Coop.seq, ...cmd]);
  if (Coop.out.length > 40) Coop.out.splice(0, Coop.out.length - 40);
  return true;
}
function coopPacket(){ return { k:'c', q: Coop.out.slice(-20), name: Coop.names[1] }; }
/* a puppet pest from a frame record */
function coopPuppet(rec, old){
  const def = ENEMIES[rec.type];
  const e = old && old.type === rec.type ? old : { id: rec.id, type: rec.type, def, path: 0, d: 0, seg: 0, ang: 0, r: def.r, big: !!def.big, boss: !!def.boss, tier: def.tier, slowMult: 1, anim: Math.random() * 10, hitT: -10, flashT: 0, dead: false, lvl: 1, x: rec.x, y: rec.y, rot: rec.rot };
  e.tx = rec.x; e.ty = rec.y; e.trot = rec.rot;
  e.hp = rec.hp; e.maxHp = 1;
  e.camo = !!(rec.f & 1); e.gold = !!(rec.f & 2); e.boss = e.boss || !!(rec.f & 4);
  e.freezeT = rec.f & 8 ? 1 : 0; e.stunT = rec.f & 16 ? 1 : 0;
  return e;
}
function coopReadEnemies(s){
  const out = [];
  for (let i = 0; i + 12 <= s.length; i += 12){
    const id = parseInt(s.substr(i, 3), 36), ti = parseInt(s.substr(i + 3, 2), 36);
    const type = COOP_TYPES()[ti];
    if (!type || !ENEMIES[type]) continue;
    out.push({ id, type, x: parseInt(s.substr(i + 5, 2), 36) - 60, y: parseInt(s.substr(i + 7, 2), 36) - 60, rot: parseInt(s[i + 9], 36) / 36 * TAU, hp: parseInt(s[i + 10], 36) / 35, f: parseInt(s[i + 11], 36) });
  }
  return out;
}
/* a frame arrives: the puppet game takes its numbers and its pests */
function coopApplyFrame(f){
  if (!coopGuest() || !f || f.k !== 'e' || !G.active) return;
  Coop.peerSeen = Date.now(); Coop.frames++;
  if (typeof f.n === 'string') Coop.names[0] = cleanText(f.n, 20, 'Host');
  G.round = f.r | 0; G.roundActive = !!f.ra; G.lives = f.l | 0; G.win = f.win || G.win; G.freeplay = !!f.fp;
  Coop.wallet = [f.c[0] || 0, f.c[1] || 0]; G.cash = Coop.wallet[1];
  if (!Coop.speedSent || Coop.speedSent === f.sp){ G.speed = f.sp || 1; Coop.speedSent = 0; Coop.speedHost = f.sp; }
  if (f.ack) Coop.out = Coop.out.filter(c => c[0] > f.ack);
  const was = new Map(G.enemies.map(e => [e.id, e]));
  G.enemies = coopReadEnemies(f.e || '').map(r => coopPuppet(r, was.get(r.id)));
  G.bosses = G.enemies.filter(e => e.boss);
  const p = f.p || '';
  Coop.shots = [];
  for (let i = 0; i + 4 <= p.length; i += 4) Coop.shots.push([parseInt(p.substr(i, 2), 36) - 60, parseInt(p.substr(i + 2, 2), 36) - 60]);
  Coop.wantTv = f.tv;
  const wasOver = G.over, wasWon = G.won;
  G.over = !!f.ov; G.won = !!f.w;
  if (G.over && !wasOver) Hooks.coopEnd && Hooks.coopEnd(false);
  else if (G.won && !wasWon) Hooks.coopEnd && Hooks.coopEnd(true);
}
/* the appliances arrive (perhaps in parts): rebuild the puppet's towers */
function coopApplyTowers(m){
  if (!coopGuest() || !m || m.k !== 't' || !Array.isArray(m.t)) return false;
  if (!Coop.tParts || Coop.tParts.tv !== m.tv) Coop.tParts = { tv: m.tv, n: m.n, got: {} };
  Coop.tParts.got[m.i] = m.t;
  if (Object.keys(Coop.tParts.got).length < Coop.tParts.n) return false;
  const rows = [].concat(...Object.keys(Coop.tParts.got).sort((a, b) => a - b).map(k => Coop.tParts.got[k]));
  const old = new Map(G.towers.map(t => [t.id, t]));
  const next = [];
  for (const r of rows){
    const [id, type, x, y, up, own, par, tg, lvl, dmg, kills, ab, nz, fm] = r;
    if (!TOWERS[type]) continue;
    let t = old.get(id);
    if (!t || t.type !== type){ t = makeTower(type, x, y); t.id = id; }
    t.x = x; t.y = y; t.up = String(up).split('').map(Number).slice(0, 3); t.own = own; t.paragon = !!par; t.degree = par || 0;
    if (!(Coop.tgSent && Coop.tgSent[id])) t.tg = tg;
    if (t.hero) t.level = lvl || 1;
    t.dmg = dmg || 0; t.kills = kills || 0; t.ab = Object.assign({}, ab || {});
    if (nz) t.nozzle = nz;
    if (fm) t.flyMode = fm;
    t._tg = t.tg;
    next.push(t);
  }
  G.towers = next;
  G.adminUsed = false;
  refreshTowers();
  Coop.tv = m.tv;
  Coop.tgSent = {};
  return true;
}
/* between frames: pests glide to where they were last seen, appliances turn to face them, cooldowns tick */
function coopGuestTick(dt){
  if (!coopGuest()) return;
  G.time += dt;
  const k = Math.min(1, dt * 12);
  for (const e of G.enemies){ e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; e.rot = e.trot; e.anim += dt; }
  for (const t of G.towers){
    for (const a in t.ab) if (t.ab[a] > 0) t.ab[a] = Math.max(0, t.ab[a] - dt);
    const r = (t.s && t.s.range) || 120;
    let best = null, bd = r * r;
    for (const e of G.enemies){ const d = (e.x - t.x) ** 2 + (e.y - t.y) ** 2; if (d < bd){ bd = d; best = e; } }
    if (best) t.aim = Math.atan2(best.y - t.y, best.x - t.x);
    /* the guest's own settings, sent when changed */
    if ((t.own || 0) === 1 && t._tg !== undefined && t.tg !== t._tg){ coopCmd('set', t.id, { tg: t.tg }); t._tg = t.tg; (Coop.tgSent = Coop.tgSent || {})[t.id] = 1; }
  }
  if (Coop.speedHost && G.speed !== Coop.speedHost && Coop.speedSent !== G.speed){ coopCmd('speed', G.speed); Coop.speedSent = G.speed; }
}
