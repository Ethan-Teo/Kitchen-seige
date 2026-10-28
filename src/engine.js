'use strict';
/* =====================================================================
   Kitchen Siege — engine (no DOM access here, so it can run headless)
   ===================================================================== */
const DT = 1 / 60;
const TAU = Math.PI * 2;
const Hooks = {
  toast(){}, sfx(){}, roundEnd(){}, roundStart(){}, gameOver(){}, victory(){}, rankUp(){}, newPest(){},
  boss(){}, towersChanged(){}, flash(){}, abilityUsed(){}, saved(){}, cloud(){},
  levelUp(){}, achievement(){}, dough(){}, golden(){}, heroLevel(){}, heroUnlock(){}, eventCleared(){}
};
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------------------------------------------------------------------
   Profile and saving
   --------------------------------------------------------------------- */
const LS_PROFILE = 'kitchen-siege:profile:v1';
const LS_GAME = 'kitchen-siege:game:v1';
/* save slots: six games side by side; LS_GAME mirrors the active slot (the cloud's game document, as before) */
const LS_SLOTS = 'kitchen-siege:slots:v1', SLOT_N = 6;
function defaultProfile(){
  return { v:1, savedAt:0, mastery:{}, medals:{}, perks:{}, seen:{}, skins:{}, custom:{}, events:{}, tasting:{}, boards:{ boss:[], race:[] },
    dough:0, chef:{ xp:0 }, powers:{}, insta:{}, crates:{}, ach:{}, daily:{ last:'', streak:0, best:0, ch:{} },
    heroes:{ owned:{ chef_blaze:1 }, pick:'chef_blaze', seen:{}, tip:0 },
    stats:{ games:0, wins:0, cooked:0, rounds:0, best:{}, abilities:0, powers:0, paragons:0, t5:0, bosses:0, queens:0, golden:0, maxRound:0, maxCash:0, chests:0, dailies:0, flawless:0, insta:0, doughEarned:0, heroHires:0, heroTop:0 },
    settings:{ sound:true, music:true, dmgNums:false, volume:0.6, auto:false, fx:'high', perf:false, depth:true, autoAb:false, autoSet:{}, hideAb:false } };
}
function mergeProfile(p){
  const d = defaultProfile();
  if (!p || typeof p !== 'object') return d;
  const out = Object.assign(d, p);
  out.settings = Object.assign(defaultProfile().settings, p.settings || {});
  /* auto abilities: autoAb is the setting for every ability, autoSet holds per-ability exceptions */
  const as = out.settings.autoSet;
  out.settings.autoSet = {};
  if (as && typeof as === 'object' && !Array.isArray(as)) for (const id in as) if (typeof as[id] === 'boolean') out.settings.autoSet[id] = as[id];
  out.settings.autoAb = !!out.settings.autoAb;
  out.settings.hideAb = !!out.settings.hideAb;
  out.stats = Object.assign(defaultProfile().stats, p.stats || {});
  out.stats.best = Object.assign({}, (p.stats && p.stats.best) || {});
  for (const k of ['mastery','medals','perks','seen','skins','events','tasting']) out[k] = Object.assign({}, p[k] || {});
  out.boards = { boss: Array.isArray(p.boards && p.boards.boss) ? p.boards.boss.slice(0, 10) : [], race: Array.isArray(p.boards && p.boards.race) ? p.boards.race.slice(0, 10) : [] };
  out.custom = {};
  if (p.custom && typeof p.custom === 'object') for (const id in p.custom) if (/^c_[a-z0-9]{3,16}$/.test(id) && p.custom[id] && typeof p.custom[id] === 'object') out.custom[id] = JSON.parse(JSON.stringify(p.custom[id]));
  for (const k in out.stats) if (k !== 'best' && !(Number(out.stats[k]) >= 0)) out.stats[k] = 0;
  if (typeof mergeMeta === 'function') mergeMeta(out, p);
  if (typeof mergeHeroProfile === 'function') mergeHeroProfile(out, p);
  return out;
}
/* replace the whole profile (load, import, wipe) and bring custom appliances in line with it */
function setProfile(p){ Profile = p; if (typeof syncCustomTowers === 'function') syncCustomTowers(); }
let Profile = defaultProfile();

/* Two copies of one player's profile (this device's and the cloud's), combined so that neither can
   wipe out progress the other has: a blank copy on a new device, or an old one on a device that was
   away, only ever adds what it has. `a` is the copy to trust for choices (settings, picks, perks);
   anything that only grows (XP, medals, stats, achievements, hired chefs) is the most of both, and the
   spendable things (Dough, crates, powers, insta appliances) come from whichever copy has seen more
   Dough come in, since spending never lowers that count. A deliberate reset or a loaded save code
   (resetAt) wins over anything saved before it. */
function combineProfiles(a, b){
  if (!b || typeof b !== 'object') return a;
  if (!a || typeof a !== 'object') return b;
  if ((a.resetAt || 0) > (b.savedAt || 0)) return a;
  if ((b.resetAt || 0) > (a.savedAt || 0)) return b;
  const o = JSON.parse(JSON.stringify(a));
  const num = v => Math.max(0, Number(v) || 0), mx = (x, y) => Math.max(num(x), num(y));
  const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const union = (into, from) => { for (const k in obj(from)) if (from[k] && !into[k]) into[k] = from[k]; return into; };
  o.chef = { xp: mx(obj(a.chef).xp, obj(b.chef).xp) };
  o.mastery = obj(o.mastery); for (const k in obj(b.mastery)) o.mastery[k] = mx(o.mastery[k], b.mastery[k]);
  o.medals = obj(o.medals);
  for (const m in obj(b.medals)){ o.medals[m] = Object.assign({}, obj(o.medals[m])); for (const k in obj(b.medals[m])) if (b.medals[m][k]) o.medals[m][k] = 1; }
  o.stats = obj(o.stats); const bs = obj(b.stats);
  for (const k in bs) if (k !== 'best') o.stats[k] = mx(o.stats[k], bs[k]);
  o.stats.best = Object.assign({}, obj(o.stats.best)); for (const k in obj(bs.best)) o.stats.best[k] = mx(o.stats.best[k], bs.best[k]);
  o.seen = union(obj(o.seen), b.seen); o.ach = union(obj(o.ach), b.ach); o.custom = union(obj(o.custom), b.custom);
  o.objects = union(obj(o.objects), b.objects); o.bodies = union(obj(o.bodies), b.bodies); o.kitchens = union(obj(o.kitchens), b.kitchens);
  const ah = obj(o.heroes), bh = obj(b.heroes);
  o.heroes = Object.assign({}, ah, { owned: union(Object.assign({}, obj(ah.owned)), bh.owned), seen: union(Object.assign({}, obj(ah.seen)), bh.seen), tip: mx(ah.tip, bh.tip) });
  const ad = obj(o.daily), bd = obj(b.daily);
  o.daily = Object.assign({}, String(bd.last || '') > String(ad.last || '') ? bd : ad);
  o.daily.ch = Object.assign({}, obj(bd.ch), obj(ad.ch)); o.daily.best = mx(ad.best, bd.best);
  if (num(bs.doughEarned) > num(obj(a.stats).doughEarned)) for (const k of ['dough', 'crates', 'powers', 'insta']) o[k] = JSON.parse(JSON.stringify(b[k] != null ? b[k] : 0));
  if (!Object.keys(obj(o.perks)).length && Object.keys(obj(b.perks)).length) o.perks = Object.assign({}, b.perks);
  for (const k of ['retro', 'news', 'resetAt']){ const v = mx(a[k], b[k]); if (v) o[k] = v; }
  o.savedAt = mx(a.savedAt, b.savedAt);
  return o;
}
/* A saved game proves some of the progress it was played with: the chef XP and Dough it earned,
   the rounds it cleared, the pests it cooked, and a medal if it was won. A profile that somehow
   lost that progress gets it back (level crates included); a sound profile is left exactly as it is. */
function repairFromGame(p, g){
  if (!p || !g || typeof g !== 'object' || !Array.isArray(g.towers) || !p.stats) return false;
  const num = v => Math.max(0, Number(v) || 0), S = p.stats, before = JSON.stringify(p);
  const cx = num(g.cx), dg = num(g.dg);
  if (num(p.chef && p.chef.xp) < cx){
    const was = typeof chefLevel === 'function' ? chefLevel(num(p.chef.xp)).level : 0;
    p.chef = { xp: cx };
    if (typeof chefLevel === 'function') for (let L = was + 1; L <= chefLevel(cx).level; L++){ const R = levelReward(L); if (R.crate && CRATES[R.crate]) p.crates[R.crate] = (p.crates[R.crate] || 0) + 1; }
  }
  if (num(S.doughEarned) < dg){ p.dough = num(p.dough) + dg - num(S.doughEarned); S.doughEarned = dg; }
  const round = Math.floor(num(g.round)), start = Math.floor(num(g.stats && g.stats.start)) || 1, cleared = Math.max(0, round - start);
  if (cleared > 0){
    S.rounds = Math.max(num(S.rounds), cleared);
    S.maxRound = Math.max(num(S.maxRound), round - 1);
    if (MAPS[g.mapId]){ S.best = S.best || {}; S.best[g.mapId] = Math.max(num(S.best[g.mapId]), round - 1); }
    S.games = Math.max(num(S.games), 1);
  }
  S.cooked = Math.max(num(S.cooked), Math.floor(num(g.stats && g.stats.committedKills)));
  if (g.won && !g.ch && MAPS[g.mapId] && !/^cm_/.test(g.mapId) && DIFFS[g.diff]){
    const m = p.medals[g.mapId] = Object.assign({}, p.medals[g.mapId] || {});
    m[g.diff] = 1; if (g.mm) m.mastery = 1;
    S.wins = Math.max(num(S.wins), 1);
  }
  return JSON.stringify(p) !== before;
}

const Store = {
  ok: false, mem: {}, cloud: null, cloudState: 'off',
  pending: {}, timer: {}, inflight: {}, lastWrite: {},
  /* when this device's profile was last saved before this visit: boot-time saves (and anything done
     before the cloud answers) must not make a blank or old profile look newer than the cloud's */
  bootAt: 0, lastSync: 0, tries: 0,
  init(){
    try { const k = '__ks_probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); this.ok = true; }
    catch (e) { this.ok = false; }
    const p = this.read(LS_PROFILE);
    setProfile(mergeProfile(p));
    this.bootAt = (p && Number(p.savedAt)) || 0;
    if (repairFromGame(Profile, this.read(LS_GAME))) this.write(LS_PROFILE, Profile);
    /* a game saved before there were slots goes into slot 1 */
    if (!this.read(LS_SLOTS)){ const g = this.read(LS_GAME); const S = emptySlots(); if (g && g.towers) S.slots[0] = g; this.write(LS_SLOTS, S); }
  },
  read(key){
    if (this.ok){ try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
    return this.mem[key] ? JSON.parse(this.mem[key]) : null;
  },
  write(key, obj){
    const s = JSON.stringify(obj);
    if (this.ok){ try { localStorage.setItem(key, s); return; } catch (e) {} }
    this.mem[key] = s;
  },
  remove(key){
    if (this.ok){ try { localStorage.removeItem(key); } catch (e) {} }
    delete this.mem[key];
  },
  /* Cloud saves: a private per-player document in the artifact's store, so progress follows the
     player to other devices and survives a browser that forgets its storage */
  async connectCloud(){
    const c = (typeof window !== 'undefined') ? window.claude : null;
    if (!c || typeof c.use !== 'function') return false;
    this.cloudState = 'connecting'; Hooks.cloud();
    let db, user;
    try { [db, user] = await Promise.all([c.use('db'), c.use('user')]); } catch (e) { db = null; }
    if (!db || !user){ this.cloudState = 'off'; Hooks.cloud(); return false; }
    const uid = await user.id();
    if (!uid){ this.cloudState = 'off'; Hooks.cloud(); return false; }
    const ref = name => db.doc('data/users/' + uid + '/' + name);
    try {
      const [ps, gs, ss] = await Promise.all([ref('profile').get(), ref('game').get(), ref('slots').get().catch(() => ({ exists: false }))]);
      this.cloud = { db, uid, ref };
      const changed = this.adopt(ps.exists ? ps.data() : null, gs.exists ? gs.data() : null, ss && ss.exists ? ss.data() : null);
      this.cloudState = 'on'; this.tries = 0; Hooks.cloud(changed);
      return changed;
    } catch (e) {
      /* a passing hiccup: try again a few times before settling for this browser only */
      const code = e && e.code;
      if ((code === 'unavailable' || code === 'resource_exhausted' || !code) && this.tries++ < 3){
        this.cloudState = 'connecting'; Hooks.cloud();
        setTimeout(() => this.connectCloud(), 1500 * this.tries);
        return false;
      }
      this.cloud = null; this.cloudState = 'error'; Hooks.cloud(); return false;
    }
  },
  /* bring the cloud's copies together with this device's; returns true if anything here changed */
  adopt(pdoc, gdoc, sdoc){
    const clone = v => v ? JSON.parse(JSON.stringify(v)) : null;
    const pd = clone(pdoc), gd = clone(gdoc), sd = clone(sdoc);
    let changed = false;
    /* the save slots: slot by slot, the newer copy wins (a game is one run, so there is nothing to combine) */
    const S = slotsData();
    if (sd && Array.isArray(sd.slots)){
      let any = false;
      for (let i = 0; i < SLOT_N; i++){
        const c = sd.slots[i], m = S.slots[i];
        if (c && c.towers && (c.savedAt || 0) > ((m && m.savedAt) || 0)){ S.slots[i] = c; any = true; }
        else if (!c && m && (sd.savedAt || 0) > (m.savedAt || 0)){ S.slots[i] = null; any = true; }
      }
      if (any){ this.write(LS_SLOTS, S); changed = true; }
    }
    /* the active game: the newer of the two */
    const local = this.read(LS_GAME);
    if (gd && (gd.savedAt || 0) > ((local && local.savedAt) || 0)){
      if (gd.game){ this.write(LS_GAME, gd.game); S.slots[S.active] = gd.game; } else { this.remove(LS_GAME); S.slots[S.active] = null; }
      this.write(LS_SLOTS, S);
      changed = true;
    } else if (local) this.push('game', { savedAt: local.savedAt, game: local });
    this.push('slots', { savedAt: Date.now(), slots: S.slots });
    /* the profile: combined, never replaced, so a blank or stale copy can't erase the other */
    const before = JSON.stringify(Profile);
    let next = Profile;
    if (pd && pd.profile && typeof pd.profile === 'object'){
      const cloudP = mergeProfile(pd.profile);
      cloudP.savedAt = Number(pd.savedAt || pd.profile.savedAt) || 0;
      const mine = Object.assign({}, Profile, { savedAt: this.bootAt });
      next = cloudP.savedAt > this.bootAt ? combineProfiles(cloudP, mine) : combineProfiles(mine, cloudP);
      next = mergeProfile(next);
    }
    repairFromGame(next, this.read(LS_GAME));
    if (JSON.stringify(next) !== before){ setProfile(next); changed = true; }
    this.bootAt = Date.now();
    /* store the result here and in the cloud, so both copies agree from now on */
    saveProfile();
    this.lastSync = Date.now();
    return changed;
  },
  /* fetch the cloud's copy again (coming back to the page): another device may have played since */
  async resync(){
    if (!this.cloud || this.cloudState !== 'on' || Date.now() - this.lastSync < 20000) return false;
    this.lastSync = Date.now();
    try {
      const ps = await this.cloud.ref('profile').get();
      if (!ps.exists) return false;
      const pd = JSON.parse(JSON.stringify(ps.data()));
      if (!pd || !pd.profile) return false;
      const cloudP = mergeProfile(pd.profile);
      cloudP.savedAt = Number(pd.savedAt) || 0;
      if (cloudP.savedAt <= (Profile.savedAt || 0)) return false;   // nothing new out there
      const before = JSON.stringify(Profile);
      const next = mergeProfile(combineProfiles(cloudP, Profile));
      if (JSON.stringify(next) === before) return false;
      setProfile(next); saveProfile();
      Hooks.cloud(true);
      return true;
    } catch (e) { return false; }
  },
  push(name, body){
    if (!this.cloud) return;
    this.pending[name] = body;
    this.flush(name);
  },
  /* writes are spaced at least 4s apart per document; `now` skips the wait (the page is closing) */
  async flush(name, now){
    if (!this.cloud || !this.pending[name] || this.inflight[name]) return;
    const wait = now ? 0 : 4000 - (Date.now() - (this.lastWrite[name] || 0));
    if (wait > 0){ if (!this.timer[name]) this.timer[name] = setTimeout(() => { this.timer[name] = null; this.flush(name); }, wait); return; }
    if (this.timer[name]){ clearTimeout(this.timer[name]); this.timer[name] = null; }
    const body = this.pending[name]; this.pending[name] = null;
    this.inflight[name] = true; this.lastWrite[name] = Date.now();
    try { await this.cloud.ref(name).set(JSON.parse(JSON.stringify(body))); this.lastSync = Date.now(); }
    catch (e) {
      const code = e && e.code;
      if (code === 'unavailable' || code === 'resource_exhausted'){ if (!this.pending[name]) this.pending[name] = body; }
      else { if (typeof console !== 'undefined') console.warn('Cloud save stopped:', code, e && e.message); this.cloud = null; this.cloudState = 'error'; Hooks.cloud(); }
    }
    this.inflight[name] = false;
    if (this.pending[name] && this.cloud) this.timer[name] = this.timer[name] || setTimeout(() => { this.timer[name] = null; this.flush(name); }, 1500);
  },
  /* send anything still waiting right away (the page is being hidden or closed) */
  flushNow(){ for (const name in this.pending) if (this.pending[name]) this.flush(name, true); },
};
function saveProfile(){
  Profile.savedAt = Date.now();
  Store.write(LS_PROFILE, Profile);
  Store.push('profile', { savedAt: Profile.savedAt, profile: Profile });
}
function storeGame(data){
  if (!data) return;
  data.savedAt = Date.now();
  Store.write(LS_GAME, data);
  Store.push('game', { savedAt: data.savedAt, game: data });
  const S = slotsData(); S.slots[S.active] = data; writeSlots(S);
  Hooks.saved();
}
function clearStoredGame(){
  Store.remove(LS_GAME);
  Store.push('game', { savedAt: Date.now(), game: null });
  const S = slotsData(); S.slots[S.active] = null; writeSlots(S);
}
function readStoredGame(){ const g = Store.read(LS_GAME); return g && g.towers ? g : null; }
/* ---------------- save slots ---------------- */
function emptySlots(){ return { active: 0, slots: Array(SLOT_N).fill(null) }; }
function slotsData(){
  const s = Store.read(LS_SLOTS);
  if (!s || !Array.isArray(s.slots)) return emptySlots();
  const slots = []; for (let i = 0; i < SLOT_N; i++){ const g = s.slots[i]; slots.push(g && g.towers ? g : null); }
  return { active: Math.min(SLOT_N - 1, Math.max(0, Math.floor(s.active) || 0)), slots };
}
function writeSlots(S){ Store.write(LS_SLOTS, S); Store.push('slots', { savedAt: Date.now(), slots: S.slots }); }
function activeSlot(){ return slotsData().active; }
function slotGame(i){ return slotsData().slots[i] || null; }
/* make slot i the active one: its game becomes the one Continue picks up */
function setActiveSlot(i){
  const S = slotsData();
  i = Math.min(SLOT_N - 1, Math.max(0, i | 0));
  if (i === S.active) return S;
  S.active = i; Store.write(LS_SLOTS, S);
  const g = S.slots[i];
  if (g) Store.write(LS_GAME, g); else Store.remove(LS_GAME);
  Store.push('game', { savedAt: Date.now(), game: g || null });
  return S;
}
function deleteSlot(i){
  const S = slotsData();
  if (i === S.active){ clearStoredGame(); return; }
  S.slots[i] = null; writeSlots(S);
}
/* where a new game goes: the active slot if it is free, else the first free slot, else the active one (replacing it) */
let SLOT_PICK = null;
function pickSlot(i){ SLOT_PICK = i; }
function slotForNew(){
  const S = slotsData();
  if (!S.slots[S.active]) return S.active;
  const free = S.slots.findIndex(g => !g);
  return free >= 0 ? free : S.active;
}
function slotLabel(g){
  if (g && g.cm && typeof adoptKitchen === 'function') adoptKitchen(g.mapId, g.cm);
  if (!g || !MAPS[g.mapId]) return 'Empty';
  return (g.ev && g.ev.n ? g.ev.n + ' · ' : g.ch ? (g.ch.tm ? 'Tasting Menu · ' : g.ch.ex ? 'Expedition · ' : 'Daily · ') : '') + MAPS[g.mapId].name + ' · ' + (DIFFS[g.diff] ? DIFFS[g.diff].name : g.diff) + (g.mode && MODES[g.mode] && g.mode !== 'standard' ? ' · ' + MODES[g.mode].name : '') + (g.mm ? ' · Mastery' : '') + ' · Round ' + g.round;
}

/* ---------------------------------------------------------------------
   Mastery helpers
   --------------------------------------------------------------------- */
const AdminFlags = { unlockAll:false };
/* house rules: neutral in normal games, changed by daily challenges */
const NO_MOD = { speed:1, hp:1, bigHp:1, cash:1, price:1, noAbilities:false, maxTier:5, noSell:false, lives:null };
function rankOf(xp){ let r = 0; for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) r = i; return r; }
/* games that keep no records: the attract loop and the sandbox */
function noRecords(){ return !!G.attract || (typeof sandboxOn === 'function' && sandboxOn()); }
function masteryRank(type){ return AdminFlags.unlockAll || sandboxOn() ? RANKS.length - 1 : rankOf(Profile.mastery[type] || 0); }
function perk(id){ return !!Profile.perks[id]; }
function starsEarned(){
  let s = 0;
  for (const m in Profile.medals) for (const k in Profile.medals[m]) if (Profile.medals[m][k]) s += (k === 'michelin' ? 2 : 1);
  for (const t of BASE_TOWER_ORDER) s += rankOf(Profile.mastery[t] || 0);
  return s;
}
function starsSpent(){ let s = 0; for (const p of PERKS) if (Profile.perks[p.id]) s += p.cost; return s; }

/* ---------------------------------------------------------------------
   Game state
   --------------------------------------------------------------------- */
const G = {
  vis: typeof document !== 'undefined',
  active:false, paused:false, over:false, won:false, speed:1,
  enemies:[], towers:[], projs:[], lobs:[], puddles:[], clouds:[], fx:[], parts:[], loaves:[], timers:[], tornados:[], whirls:[], traps:[], bosses:[],
  paraList:[], necros:[], bowls:[], iceFloes:false, noKids:false, curAtk:null,
  storms:[], orbs:[], piles:[], minions:[], noIncome:false,
  admin:{ infCash:false, god:false, dmgMult:1, debug:false },
};

function buildPath(pts){
  const segs = []; let total = 0;
  for (let i = 0; i < pts.length - 1; i++){
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segs.push({ x1, y1, x2, y2, len, start: total, dx: (x2 - x1) / len, dy: (y2 - y1) / len, ang: Math.atan2(y2 - y1, x2 - x1) });
    total += len;
  }
  return { pts, segs, len: total };
}
function pathPos(P, d, hint){
  const s = P.segs;
  let i = hint || 0;
  if (d < 0) d = 0;
  while (i < s.length - 1 && d > s[i].start + s[i].len) i++;
  while (i > 0 && d < s[i].start) i--;
  const g = s[i];
  const t = Math.min(g.len, d - g.start);
  return { x: g.x1 + g.dx * t, y: g.y1 + g.dy * t, ang: g.ang, seg: i };
}
function distToSeg(px, py, g){
  let t = ((px - g.x1) * g.dx + (py - g.y1) * g.dy);
  t = clamp(t, 0, g.len);
  return Math.hypot(px - (g.x1 + g.dx * t), py - (g.y1 + g.dy * t));
}
function distToPath(P, x, y){ let m = Infinity; for (const g of P.segs){ const d = distToSeg(x, y, g); if (d < m) m = d; } return m; }

/* ---------------------------------------------------------------------
   Spatial grid for fast range queries
   --------------------------------------------------------------------- */
const CELL = 64, GW = Math.ceil(W / CELL) + 3, GH = Math.ceil(H / CELL) + 3, MAXR = 54;
const grid = Array.from({ length: GW * GH }, () => []);
function cellIdx(x, y){ const cx = clamp(Math.floor(x / CELL) + 1, 0, GW - 1), cy = clamp(Math.floor(y / CELL) + 1, 0, GH - 1); return cy * GW + cx; }
/* cells keep their arrays between steps (only a fill count is reset) so
   rebuilding the grid every step doesn't churn memory */
const gridN = new Int32Array(GW * GH), gridUsed = [];
function gridBuild(){
  for (let k = 0; k < gridUsed.length; k++) gridN[gridUsed[k]] = 0;
  gridUsed.length = 0;
  const list = G.enemies;
  for (let k = 0; k < list.length; k++){
    const e = list[k];
    if (e.dead) continue;
    const i = cellIdx(e.x, e.y);
    if (gridN[i] === 0) gridUsed.push(i);
    grid[i][gridN[i]++] = e;
  }
}
function query(x, y, r, out){
  out.length = 0;
  const R = r + MAXR;
  const x0 = clamp(Math.floor((x - R) / CELL) + 1, 0, GW - 1), x1 = clamp(Math.floor((x + R) / CELL) + 1, 0, GW - 1);
  const y0 = clamp(Math.floor((y - R) / CELL) + 1, 0, GH - 1), y1 = clamp(Math.floor((y + R) / CELL) + 1, 0, GH - 1);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++){
    const ci = cy * GW + cx, c = grid[ci], cn = gridN[ci];
    for (let i = 0; i < cn; i++){
      const e = c[i];
      if (e.dead) continue;
      const dx = e.x - x, dy = e.y - y, rr = r + e.r;
      if (dx * dx + dy * dy <= rr * rr) out.push(e);
    }
  }
  return out;
}
const Q0 = [], Q1 = [], Q2 = [], Q3 = [], Q4 = [];
const onScreen = e => e.x > -6 && e.x < W + 6 && e.y > -6 && e.y < H + 6;

/* ---------------------------------------------------------------------
   Tower stats
   --------------------------------------------------------------------- */
const NESTED = ['explode', 'impact', 'frag', 'cluster', 'radial', 'splash', 'split', 'mine', 'burst'];
function propagateII(a){
  for (const k of NESTED) if (a[k]) a[k].ignoreImmune = true;
  if (a.puddle && a.puddle.burn) a.puddle.burn.ii = true;
  if (a.impact && a.impact.burn) a.impact.burn.ii = true;
  if (a.burn) a.burn.ii = true;
}
function finalizeAttack(a, rank){
  a.rangeMul = a.rangeMul || 1;
  a.count = a.count || 1;
  markMore(a);
  a.dyn = !!(a.quick || a.standoff || a.crowd);
  if (rank >= 6) a.rate /= 1.06;
  if (rank >= 8 && a.pierce != null && a.kind !== 'hitscan') a.pierce += 1;
  a.dtype = a.type || (a.explode && a.explode.type) || (a.impact && a.impact.type) || 'normal';
  if (a.cluster && !a.cluster.type) a.cluster.type = (a.explode && a.explode.type) || (a.impact && a.impact.type) || (a.mine && a.mine.type) || 'blast';
  if (a.ignoreImmune) propagateII(a);
  if (a.puddle || a.cloud || a.kind === 'trap') a.targetsAll = true;
  if (a.crit && a.crit.mul){
    const c = JSON.parse(JSON.stringify(a)), m = a.crit.mul;
    c.crit = null;
    if (c.dmg) c.dmg *= m;
    if (c.bonusBig) c.bonusBig *= m;
    for (const k of ['explode', 'impact', 'burst', 'splash']) if (c[k]){ c[k].dmg *= m; if (c[k].bonusBig) c[k].bonusBig *= m; if (k === 'explode' || k === 'impact') c[k].r *= 1.25; }
    c.size = (c.size || 6) * 1.45;
    c.isCrit = true;
    a.critSpec = c;
  } else if (a.crit){
    if (a.crit.over){
      a.critSpec = Object.assign({}, a, JSON.parse(JSON.stringify(a.crit.over)), { crit: null });
      if (a.ignoreImmune) propagateII(a.critSpec);
    } else a.critSpec = Object.assign({}, a, { dmg: a.crit.dmg, bigMult: a.crit.bigMult, sprite: a.crit.sprite, count: 1, crit: null, pierce: Math.max(3, a.pierce), split: null, size: Math.max(a.size, 9) });
    markMore(a.critSpec);
  }
  /* a bullseye (the condiment caddy's lucky squirt) */
  if (a.luck) a.luckSpec = Object.assign({}, a, { dmg: a.dmg * a.luck.mul, bonusBig: (a.bonusBig || 0) * a.luck.mul, luck: null, isCrit: true });
}
function computeStats(t){
  const T = TOWERS[t.type];
  let s;
  if (T.hero) s = heroStats(t.type, t.level || 1);
  else if (t.paragon) s = T.paragon.make(t.degree);
  else {
    s = JSON.parse(JSON.stringify(T.base));
    s.abilities = [];
    for (let p = 0; p < 3; p++) for (let i = 0; i < t.up[p]; i++) T.paths[p].ups[i].apply(s);
    if (T.finish) T.finish(s);
  }
  s.abilities = s.abilities || [];
  s.atk = s.atk || {};
  if (s.atk.main && s.atk.main.kind === 'spray') sprayStats(t, s);
  if (t.paragon && PARA[t.type]) paraStats(t, s);
  /* head chefs have no mastery: they grow by levels instead */
  const rank = T.hero ? 0 : masteryRank(t.type);
  if (rank >= 4 && !s.global) s.range *= 1.06;
  for (const id in s.atk) finalizeAttack(s.atk[id], rank);
  return s;
}
function buffAttack(a, b){
  a.rate /= (b.speed * b.polar);
  if (a.pierce != null && a.kind !== 'hitscan') a.pierce += b.pierce;
  if (a.radial) a.radial.pierce += b.pierce;
  if (b.dmg){
    if (a.dmg > 0) a.dmg += b.dmg;
    if (a.explode) a.explode.dmg += b.dmg;
    if (a.impact) a.impact.dmg += b.dmg;
    if (a.radial) a.radial.dmg += b.dmg;
    if (a.mine) a.mine.dmg += b.dmg;
    if (a.bubble) a.bubble.pop += b.dmg;
  }
  if (b.allTypes){ a.ignoreImmune = true; propagateII(a); }
}
function applyBuff(s, b){
  if (!s.global) s.range *= b.range;
  if (b.camo) s.camo = true;
  if (b.allTypes) s.allTypes = true;
  for (const id in s.atk){
    const a = s.atk[id];
    buffAttack(a, b);
    if (a.critSpec) buffAttack(a.critSpec, b);
    if (a.luckSpec) buffAttack(a.luckSpec, b);
  }
  return s;
}
function inBuffRange(o, t){ return o.base.global || (o.base.buff && o.base.buff.global) || Math.hypot(o.x - t.x, o.y - t.y) <= o.base.range + t.size * 0.6; }
/* whether any appliance is aiming wherever the player points (locked ones are not) */
function pointerFlag(){ G.hasPointer = G.towers.some(t => !t.lock && Object.values(t.s.atk).some(a => a.aim === 'pointer')); }
/* some buffs only reach certain appliances: 'water' ones, or one kind */
function buffFits(only, t){
  if (!only) return true;
  const T = TOWERS[t.type];
  const wet = !!(T.water || (T.amphib && inWater(t.x, t.y, 0)));
  if (only === 'water') return wet;
  if (only === 'navy') return !!(wet || T.flyer);
  if (FACTIONS[only]) return factionOf(t.type) === only;
  return t.type === only;
}
function refreshTowers(){
  for (const t of G.towers) t.base = computeStats(t);
  for (const t of G.towers){
    const b = { speed:1, polar:1, pierce:0, dmg:0, range:1, camo:false, allTypes:false, energize:0 };
    if (t.base.buff && t.base.buff.energize) b.energize = t.base.buff.energize;
    for (const o of G.towers){
      if (o === t || !o.base.buff || !buffFits(o.base.buff.only, t) || !inBuffRange(o, t)) continue;
      const ob = o.base.buff;
      if (ob.energize) b.energize = Math.max(b.energize, ob.energize);
      if (ob.speed){ if (o.type === 'freezer') b.polar = Math.max(b.polar, ob.speed); else if (ob.speed > b.speed){ b.speed = ob.speed; b.speedBy = o.type; } }
      if (ob.pierce) b.pierce = Math.max(b.pierce, ob.pierce);
      if (ob.dmg) b.dmg = Math.max(b.dmg, ob.dmg);
      if (ob.range) b.range = Math.max(b.range, ob.range);
      if (ob.camo) b.camo = true;
      if (ob.allTypes) b.allTypes = true;
    }
    t.buffs = b;
    t.s = applyBuff(JSON.parse(JSON.stringify(t.base)), b);
    moreApply(t);
    t.s.abilities = t.base.abilities;
    for (const ab of t.s.abilities) if (t.ab[ab.id] == null) t.ab[ab.id] = ab.startFull ? ab.cd : ab.cd * 0.35;
    for (const id in t.ab) if (!t.s.abilities.some(x => x.id === id)) delete t.ab[id];
  }
  G.globalSlow = 1; G.leakGuard = false; G.sellBonus = 0; G.preempt = 0;
  pointerFlag();
  for (const t of G.towers){
    if (t.s.globalSlow) G.globalSlow = Math.min(G.globalSlow, t.s.globalSlow);
    if (t.s.leakGuard) G.leakGuard = true;
    if (t.s.sellBonus) G.sellBonus = Math.max(G.sellBonus, t.s.sellBonus);
    if (t.s.preempt) G.preempt = Math.max(G.preempt, t.s.preempt);
  }
  paraRefresh();
  Hooks.towersChanged();
}

/* ---------------------------------------------------------------------
   Prices
   --------------------------------------------------------------------- */
function masteryDiscount(type){ const r = masteryRank(type); return r >= 7 ? 0.10 : r >= 2 ? 0.04 : 0; }
function discountAt(x, y){
  let d = 0;
  for (const t of G.towers) if (t.base && t.base.buff && t.base.buff.discount && (t.base.global || Math.hypot(t.x - x, t.y - y) <= t.base.range)) d = Math.max(d, t.base.buff.discount);
  return d;
}
function price(base, type, x, y){
  let m = (G.D ? G.D.cost : 1) * (G.mod ? G.mod.price : 1);
  m *= 1 - masteryDiscount(type);
  if (perk('bulk')) m *= 0.97;
  if (x != null) m *= 1 - discountAt(x, y);
  return Math.max(5, Math.round(base * m / 5) * 5);
}
function towerCost(type, x, y){ let c = TOWERS[type].cost; if (type === 'knife' && perk('sharp')) c -= 50; return price(c, type, x, y); }
function upgradeCost(t, p){ return price(TOWERS[t.type].paths[p].ups[t.up[p]].cost, t.type, t.x, t.y); }
function paragonCost(type){ return price(TOWERS[type].paragon.cost, type); }
function canAfford(c){ return G.admin.infCash || G.cash >= c; }
function spend(c){ if (!G.admin.infCash) G.cash -= c; }
/* cash coming in. While a Grand Planetary Mixer overmixes, every kind of income stops
   (force: money that isn't income, like a sale or a withdrawal) */
function addCash(v, force){
  if ((G.noIncome || modeNoIncome()) && v > 0 && !force){ G.stats.blocked = (G.stats.blocked || 0) + v; return; }
  G.cash += v; G.stats.earned += v;
}
function ownSellValue(t){ const pct = perk('resale') ? 0.8 : 0.7; return Math.floor(t.invested * pct * (1 + (G.sellBonus || 0)) + (t.bank || 0)); }
/* what selling it brings, with whatever rides on it */
function sellValue(t){ let v = ownSellValue(t); if (t.type === 'susan') for (const r of ridersOf(t)) v += sellValue(r); return v; }

/* ---------------------------------------------------------------------
   New game / load
   --------------------------------------------------------------------- */
function setupGame(mapId, diff, mm, ch, mode, ev){
  const D = DIFFS[diff];
  ch = ch && ch.mod && MAPS[ch.map] ? ch : null;
  const mod = Object.assign({}, NO_MOD, ch ? ch.mod : {});
  const start = ch ? ch.start : D.start;
  const lives = ch ? ch.lives : D.lives + (perk('lives') && diff !== 'michelin' ? 25 : 0);
  Object.assign(G, {
    active:true, paused:false, over:false, won:false, mapId, map: MAPS[mapId], paths: MAPS[mapId].paths.map(buildPath), diff, D, mm: !!mm && !ch, freeplay:false,
    ch, mod, win: ch ? ch.end : D.win,
    cash: ch ? ch.cash : D.cash + (perk('cash') ? 150 : 0), lives, startLives: lives,
    round: start, roundActive:false, roundTime:0, spawn:null,
    enemies:[], towers:[], projs:[], lobs:[], puddles:[], clouds:[], fx:[], parts:[], loaves:[], timers:[], tornados:[], whirls:[], traps:[], bosses:[], ptraps:[],
    paraList:[], necros:[], bowls:[], iceFloes:false, noKids:false, curAtk:null,
    nextId:1, time:0, pathToggle:0, xp:{}, xpGame:{}, xpMult: D.xp * (mm && !ch ? 2 : 1), attract:false,
    stats:{ kills:0, damage:0, earned:0, leaked:0, start }, glob:{ rush:null, boost:null, opening:null, chill:null, night:null, sabotage:null }, usedSecond:false, blitzCd:0,
    minions:[], tbNext:null, grid:null,
    storms:[], orbs:[], piles:[], noIncome:false, pestHP:0, oakAt:null, loadT:0,
    leaps:[], queens:[], board:null,
    globalSlow:1, leakGuard:false, sellBonus:0, lastSnap:null, shake:0, abOrder:[], aimAt:null, hasPointer:false,
    doughGame:0, doughAcc:0, chefXpGame:0, goldAt:null, hist:[], blog:[], blPrev:null,
    mode:'standard', M:null, rushLeft:null, ev:null, evClock:0, adminUsed:false, foams:[], bubbles:[],
  });
  sandboxEnd();
  if (!ch) applyMode(mode);
  if (!ch) applyEvent(ev);
}
/* can this appliance be built here (daily challenges allow only a few) */
function canBuild(type){ return (!G.ch || G.ch.towers.indexOf(type) >= 0 || !!(TOWERS[type] && TOWERS[type].hero)) && modeAllows(type) && crewLeft(type) > 0; }
function newGame(mapId, diff, mm, ch, mode, ev){
  /* the new game takes the slot asked for (SLOT_PICK), else a free one */
  setActiveSlot(SLOT_PICK != null ? SLOT_PICK : slotForNew()); SLOT_PICK = null;
  setupGame(mapId, diff, mm, ch, mode, ev);
  Profile.stats.games++;
  saveProfile();
  G.lastSnap = serializeGame();
  storeGame(G.lastSnap);
}
function trapTower(type){ const m = TOWERS[type].base.atk && TOWERS[type].base.atk.main; return !!(m && m.kind === 'trap'); }
function makeTower(type, x, y){
  const t = { id: G.nextId++, type, x, y, size: TOWERS[type].size, up:[0,0,0], paragon:false, degree:0, tg:'first', aim:-Math.PI / 2, cd:{}, ab:{}, boost:{},
    dmg:0, kills:0, invested:0, bank:0, cashGen:0, shots:0, trapN:0, spot:null, lock:null, radialRot:0, auraAcc:0, auraDmgAcc:0, loafQ:0, loafT:0, fireAnim:0, placedAt: G.time };
  const fly = TOWERS[type].flyer;
  if (fly){ t.flyMode = FLY_MODES[fly][0].id; t.fx = x; t.fy = y; t.fvx = 0; t.fvy = 0; t.fth = 0; }
  if (TOWERS[type].hero){ t.hero = true; t.level = TOWERS[type].admin ? HERO_MAX : 1; t.hxp = 0; }
  if (TOWERS[type].admin) G.adminUsed = true;
  return t;
}
function serializeGame(){
  return { v:1, savedAt: Date.now(), mapId:G.mapId, diff:G.diff, mm:G.mm, mode: G.mode !== 'standard' ? G.mode : undefined, ev: evSave(), freeplay:G.freeplay, won:G.won, round:G.round,
    cash: Math.floor(G.cash), lives: G.lives, usedSecond: G.usedSecond, stats: Object.assign({}, G.stats), nextId: G.nextId,
    ch: G.ch || undefined, cm: typeof isCustomMap === 'function' && isCustomMap(G.mapId) ? kitchenCopy(G.mapId) : undefined, au: G.adminUsed ? 1 : undefined, sb: G.M && G.M.sandbox ? sbSave() : undefined, dg: G.doughGame || 0, cx: G.chefXpGame || 0, da: Math.round((G.doughAcc || 0) * 1000) / 1000,
    pt: G.ptraps.length ? G.ptraps.filter(tr => tr.left > 0).map(tr => ({ x: Math.round(tr.x), y: Math.round(tr.y), a: Math.round(tr.ang * 100) / 100, n: tr.left })) : undefined,
    hs: G.hist && G.hist.length ? G.hist : undefined, bl: G.blog && G.blog.length ? G.blog : undefined,
    towers: G.towers.map(t => ({ id:t.id, type:t.type, x:Math.round(t.x), y:Math.round(t.y), up:t.up.slice(), par: t.paragon ? t.degree : 0, tg:t.tg,
      dmg: Math.round(t.dmg), kills:t.kills, inv: Math.round(t.invested), bank: Math.round(t.bank || 0), cashGen: Math.round(t.cashGen || 0),
      spot: t.spot ? [Math.round(t.spot.x), Math.round(t.spot.y)] : null, fm: t.flyMode || undefined, nz: t.nozzle || undefined, lk: t.lock ? [Math.round(t.lock.x), Math.round(t.lock.y)] : undefined,
      hl: t.hero ? t.level : undefined, hx: t.hero ? Math.round(t.hxp) : undefined,
      sy: t.sys ? paraSave(t) : undefined, pit: t.pit ? Math.round(t.pit) : undefined,
      pw: t.paragon && t.pw ? PARA_POOLS.map(k => Math.round(t.pw[k] || 0)) : undefined, pws: t.paragon && t.pwSeen ? [Math.round(t.pwSeen.dmg), Math.round(t.pwSeen.inc)] : undefined,
      tb: saveTb(t), ub: t.ub || undefined, fr: t.forestR ? Math.round(t.forestR) : undefined,
      on: t.on ? G.towers.indexOf(t.on) : undefined, st: t.on ? t.seat : undefined, lf: t.lifts || undefined,
      ab: Object.fromEntries(Object.entries(t.ab).map(([k, v]) => [k, Math.round(v * 10) / 10])) })) };
}
function loadGame(data){
  if (data && data.cm && typeof adoptKitchen === 'function') adoptKitchen(data.mapId, data.cm);   // a kitchen of the player's own, carried in the save
  setupGame(data.mapId, data.diff, data.mm, data.ch, data.mode);
  evLoad(data.ev);
  Object.assign(G, { round:data.round, cash:data.cash, lives:data.lives, freeplay:!!data.freeplay, won:!!data.won, usedSecond:!!data.usedSecond });
  G.doughGame = +data.dg || 0; G.chefXpGame = +data.cx || 0; G.doughAcc = +data.da || 0;
  G.adminUsed = !!data.au || !!(G.M && G.M.sandbox);
  if (G.M && G.M.sandbox) sbLoad(data.sb);
  /* mousetraps on the trail (older saves kept each as [x, y, angle, left]) */
  if (Array.isArray(data.pt)) for (const a of data.pt){
    const q = Array.isArray(a) ? { x: a[0], y: a[1], a: a[2], n: a[3] } : a && typeof a === 'object' ? a : null;
    if (q && q.n > 0) G.ptraps.push({ x: clamp(+q.x || 0, 0, W), y: clamp(+q.y || 0, 0, H), ang: +q.a || 0, left: Math.min(6, +q.n || 0), max: 6, t: 0, snap: -9 });
  }
  G.stats = Object.assign(G.stats, data.stats || {});
  const made = [];
  for (const d of data.towers){
    made.push(null);
    if (!TOWERS[d.type]) continue;
    const t = makeTower(d.type, d.x, d.y);
    if (Number.isInteger(d.id) && d.id > 0 && !G.towers.some(o => o.id === d.id)) t.id = d.id;
    t.up = d.up.slice(); t.paragon = !!d.par; t.degree = d.par || 0; t.tg = d.tg || 'first';
    if (d.nz === 'mist' || d.nz === 'stream') t.nozzle = d.nz;
    t.dmg = d.dmg || 0; t.kills = d.kills || 0; t.invested = d.inv || 0; t.bank = d.bank || 0; t.cashGen = d.cashGen || 0;
    if (d.lf) t.lifts = clamp(Math.floor(+d.lf || 0), 0, 1e9);
    t.ab = Object.assign({}, d.ab || {});
    if (t.paragon){
      paraInit(t); paraLoad(t, d.sy);
      t.degree = clamp(Math.floor(+t.degree || 1), 1, 100);
      if (Array.isArray(d.pw) && d.pw.length === 4){ t.pw = {}; PARA_POOLS.forEach((k, i) => { t.pw[k] = clamp(+d.pw[i] || 0, 0, PARA_CAP[k]); }); }
      else t.pw = poolsForDegree(t.degree);
      t.pwSeen = Array.isArray(d.pws) ? { dmg: Math.min(+d.pws[0] || 0, t.dmg), inc: Math.min(+d.pws[1] || 0, t.cashGen) } : { dmg: t.dmg, inc: t.cashGen };
    }
    if (d.pit) t.pit = clamp(+d.pit || 0, 0, 3000);
    if (d.tb) loadTb(t, d.tb);
    if (d.ub) t.ub = clamp(Math.floor(+d.ub || 0), 0, 10);
    if (d.fr) t.forestR = clamp(+d.fr || 0, 0, 1400);
    if (Array.isArray(d.spot) && TOWERS[d.type] && TOWERS[d.type].base.spot) t.spot = { x: clamp(+d.spot[0] || 0, 0, W), y: clamp(+d.spot[1] || 0, 0, H) };
    if (TOWERS[d.type] && trapTower(d.type) && !d.tg) t.tg = 'strong';
    if (t.flyMode && typeof d.fm === 'string' && FLY_MODES[TOWERS[d.type].flyer].some(m => m.id === d.fm)) t.flyMode = d.fm;
    if (Array.isArray(d.lk)) t.lock = { x: clamp(+d.lk[0] || 0, 0, W), y: clamp(+d.lk[1] || 0, 0, H) };
    if (t.hero){
      if (G.towers.some(o => o.hero)) continue;   // one head chef per game
      t.level = clamp(Math.floor(+d.hl || 1), 1, HERO_MAX); t.hxp = t.level >= HERO_MAX ? 0 : clamp(+d.hx || 0, 0, heroNeed(t.level) - 1);
    }
    G.towers.push(t);
    made[made.length - 1] = t;
  }
  G.nextId = Math.max(G.nextId, Math.floor(+data.nextId || 0), ...G.towers.map(t => t.id + 1));
  G.hist = Array.isArray(data.hs) ? data.hs.filter(Array.isArray).slice(-400) : [];
  G.blog = Array.isArray(data.bl) ? data.bl.filter(Array.isArray).slice(-3000) : [];
  G.blPrev = typeof buildNow === 'function' ? buildNow() : null;
  /* riders back on their turntables */
  data.towers.forEach((d, i) => {
    const t = made[i], s = Number.isInteger(d.on) ? made[d.on] : null;
    if (t && s && s !== t && s.type === 'susan' && canRide(t.type)){ t.on = s; t.seat = Math.max(0, Math.floor(+d.st || 0)); }
  });
  G.tbNext = nextTempBuffEnd();
  refreshTowers();
  if (seatCheck()) refreshTowers();
  G.lastSnap = data;
}
function saveGameNow(){
  if (!G.active) return;
  if (G.over) return;
  storeGame(G.roundActive ? G.lastSnap : serializeGame());
}

/* ---------------------------------------------------------------------
   Tower actions
   --------------------------------------------------------------------- */
/* water: sinks, spills, puddles and melt pools. `pad` shrinks each shape (negative grows it) */
function inWater(x, y, pad){
  const ws = G.map && G.map.water;
  if (!ws) return false;
  pad = pad || 0;
  for (const w of ws){
    if (w.rx){
      const rx = w.rx - pad, ry = w.ry - pad;
      if (rx > 0 && ry > 0 && ((x - w.x) / rx) ** 2 + ((y - w.y) / ry) ** 2 <= 1) return true;
    } else if (inRoundRect(x, y, w, pad - (pad < 0 ? (w.rim || 0) : 0))) return true;
  }
  return false;
}
/* a rounded rectangle shrunk by g on every side (grown when g is negative) */
function inRoundRect(x, y, w, g){
  const x0 = w.x + g, y0 = w.y + g, x1 = w.x + w.w - g, y1 = w.y + w.h - g;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const R = Math.max(0, (w.r || 0) - g);
  const cx = clamp(x, x0 + R, x1 - R), cy = clamp(y, y0 + R, y1 - R);
  return (x - cx) ** 2 + (y - cy) ** 2 <= R * R;
}
function placeWhy(type, x, y){
  const T = TOWERS[type], r = T.size;
  if (T.amphib) return null;   // at home on land or water
  if (T.water && !inWater(x, y, 8)) return 'water';
  if (!T.water && inWater(x, y, -r * 0.5)) return G.iceFloes ? null : 'land';
  return null;
}
function canPlace(type, x, y){
  if (seatFor(type, x, y)) return true;
  const r = TOWERS[type].size;
  if (x < r || y < r || x > W - r || y > H - r) return false;
  if (placeWhy(type, x, y)) return false;
  for (const P of G.paths) if (distToPath(P, x, y) < PATH_W / 2 + r - 4) return false;
  for (const t of G.towers) if (Math.hypot(t.x - x, t.y - y) < t.size + r - 2) return false;
  for (const d of G.map.deco){
    if (!d.solid) continue;
    if (d.r){ if (Math.hypot(d.x - x, d.y - y) < d.r + r - 3) return false; }
    else if (x > d.x - r + 3 && x < d.x + d.w + r - 3 && y > d.y - r + 3 && y < d.y + d.h + r - 3) return false;
  }
  return true;
}
function placeTower(type, x, y){
  if (!canBuild(type) || !canPlace(type, x, y)) return null;
  if (TOWERS[type].hero && heroBlock(type)) return null;
  const c = towerCost(type, x, y);
  if (!canAfford(c)) return null;
  spend(c);
  const t = makeTower(type, x, y);
  t.invested = c;
  const seat = seatFor(type, x, y);
  if (seat) seatOn(t, seat.tw, seat.i);
  if (trapTower(type)) t.tg = 'strong';
  G.towers.push(t);
  refreshTowers();
  if (t.hero && !noRecords()){ Profile.stats.heroHires = (Profile.stats.heroHires || 0) + 1; checkAchievements(); }
  Hooks.sfx('place');
  if (G.vis) for (let i = 0; i < 10; i++) part(x + rand(-14, 14), y + rand(-14, 14), rand(-40, 40), rand(-60, -10), 0.5, '#fff8e8', 3, 'dust');
  return t;
}
function upgradeState(t, p){
  if (t.paragon) return { ok:false, why:'Paragon' };
  if (TOWERS[t.type].hero) return { ok:false, why:'Head chefs level up instead of taking upgrades', closed:true };
  const up = t.up, tier = up[p];
  if (tier >= 5) return { ok:false, why:'Fully upgraded', max:true };
  const others = [0, 1, 2].filter(i => i !== p);
  if (tier === 0 && others.filter(i => up[i] > 0).length >= 2) return { ok:false, why:'Two paths already chosen', closed:true };
  if (tier >= 2 && others.some(i => up[i] > 2)) return { ok:false, why:'Another path is past tier 2', closed:true };
  const next = tier + 1, rank = TOWERS[t.type].custom ? RANKS.length - 1 : masteryRank(t.type);
  if (G.mod && next > G.mod.maxTier) return { ok:false, why:'Tier ' + next + ' is off in this challenge', closed:true };
  if (next === 4 && rank < 1) return { ok:false, why:'Needs ' + RANKS[1].name + ' mastery', mastery:1 };
  if (next === 5 && rank < 3) return { ok:false, why:'Needs ' + RANKS[3].name + ' mastery', mastery:3 };
  return { ok:true, cost: upgradeCost(t, p) };
}
function upgradeTower(t, p){
  const st = upgradeState(t, p);
  if (!st.ok || !canAfford(st.cost)) return false;
  spend(st.cost);
  t.invested += st.cost;
  t.up[p]++;
  refreshTowers();
  Hooks.sfx(t.up[p] === 5 ? 'tier5' : 'upgrade');
  if (t.up[p] === 5 && !noRecords()){ Profile.stats.t5 = (Profile.stats.t5 || 0) + 1; checkAchievements(); }
  if (G.vis){
    const c = PATH_COLORS[p];
    for (let i = 0; i < (t.up[p] === 5 ? 40 : 16); i++){ const a = rand(0, TAU), v = rand(40, 140); part(t.x, t.y, Math.cos(a) * v, Math.sin(a) * v - 20, 0.7, i % 3 ? c : '#ffffff', 3, 'spark'); }
    G.fx.push({ k:'ring', x:t.x, y:t.y, r0:t.size, r1:t.size + 40, t:0, life:0.45, c, w:3 });
  }
  return true;
}
function canSell(){ return !(G.mod && G.mod.noSell); }
function sellTower(t){
  if (!canSell()) return 0;
  let rode = 0;
  if (t.type === 'susan') for (const r of ridersOf(t)) rode += sellTower(r);
  const v = ownSellValue(t);
  addCash(v, true); G.stats.earned -= v;
  /* a bakery empire sold with loaves in its vault cashes them in first */
  if (t.sys && t.sys.vault > 0) sellVault(t, 1);
  /* so does a bot with pests in its cage */
  for (const tr of G.traps) if (tr.tw === t && tr.catch && !tr.done) collectCatch(tr);
  G.minions = G.minions.filter(m => m.tw !== t);
  G.towers = G.towers.filter(o => o !== t);
  G.puddles = G.puddles.filter(p => p.tw !== t);
  G.traps = G.traps.filter(p => p.tw !== t);
  G.whirls = G.whirls.filter(p => p.tw !== t);
  G.bowls = G.bowls.filter(b => b.tw !== t);
  mixerForget(t);
  refreshTowers();
  Hooks.sfx('sell');
  if (G.vis) fxText(t.x, t.y - 10, '+$' + v.toLocaleString(), '#ffd166');
  return v + rode;
}
function paragonState(t){
  const T = TOWERS[t.type];
  if (t.paragon || !T.paragon) return null;
  if (!t.up.some(v => v === 5)) return null;
  const mine = G.towers.filter(o => o.type === t.type);
  const has = [0, 1, 2].map(p => mine.some(o => o.up[p] === 5));
  const rankOk = !!T.custom || masteryRank(t.type) >= 5;
  const exists = G.towers.some(o => o.type === t.type && o.paragon);
  const cost = paragonCost(t.type);
  const pools = copiesPower(mine, 3);
  return { has, rankOk, exists, cost, ok: has.every(Boolean) && rankOk && !exists, degree: degreeOf(poolTotal(pools)), pools };
}
/* Paragon degree (1 to 100) comes from power in four pools, each with a cap; 200,000 power is degree 100.
   Cash: every $1 spent on merged copies that have no tier 5, and every $1 invested from the paragon's panel.
   Damage: 1 for every 120 damage and every $45 of income, from merged copies and from the paragon itself.
   Tier 5s: 6,000 for each tier 5 beyond the three a paragon needs. Upgrades: 100 per tier on copies with no tier 5.
   A paragon keeps growing after it is built, so degree 100 is always within reach. */
const PARA_CAP = { cash: 100000, dmg: 90000, t5: 50000, ups: 10000 };
const PARA_POOLS = ['cash', 'dmg', 't5', 'ups'];
function degreeOf(power){ return clamp(Math.floor(Math.sqrt(Math.max(0, power) / 20)), 1, 100); }
function powerFor(deg){ return deg <= 1 ? 0 : 20 * deg * deg; }
function poolTotal(P){ let s = 0; for (const k of PARA_POOLS) s += Math.min(PARA_CAP[k], P[k] || 0); return s; }
function addPool(P, k, v){ P[k] = Math.min(PARA_CAP[k], (P[k] || 0) + Math.max(0, v || 0)); }
/* what merging copies brings; `extraT5` is how many of their tier 5s count beyond the three a paragon needs */
function copiesPower(list, freeT5){
  const P = { cash: 0, dmg: 0, t5: 0, ups: 0 };
  let t5 = 0;
  for (const o of list){
    const n5 = o.up.filter(v => v === 5).length;
    t5 += n5;
    if (!n5){ addPool(P, 'cash', o.invested); addPool(P, 'ups', o.up.reduce((a, v) => a + v, 0) * 100); }
    addPool(P, 'dmg', (o.dmg || 0) / 120 + (o.cashGen || 0) / 45);
  }
  addPool(P, 't5', Math.max(0, t5 - freeT5) * 6000);
  return P;
}
/* an old save (or a test) has only a degree: give it pools worth that much power, every pool filled to the same
   share of its cap, so each way of growing it is still open */
function poolsForDegree(deg){
  const need = powerFor(deg), all = PARA_POOLS.reduce((a, k) => a + PARA_CAP[k], 0), share = Math.min(1, need / all);
  const P = {};
  for (const k of PARA_POOLS) P[k] = PARA_CAP[k] * share;
  return P;
}
function paraPools(t){
  if (!t.pw) t.pw = poolsForDegree(t.degree || 1);
  if (!t.pwSeen) t.pwSeen = { dmg: t.dmg || 0, inc: t.cashGen || 0 };
  return t.pw;
}
/* sets the degree from the pools; true when it went up */
function settleDegree(t){
  const d = Math.max(t.degree || 1, degreeOf(poolTotal(paraPools(t))));
  if (d === t.degree) return false;
  const was = t.degree;
  t.degree = d;
  refreshTowers();
  if (!G.attract){
    Hooks.toast((TOWERS[t.type].paragon ? TOWERS[t.type].paragon.name : 'The paragon') + ' reached degree ' + d + (d >= 100 ? ', the top!' : '.'), 'gold');
    if (G.vis){ G.fx.push({ k:'ring', x: t.x, y: t.y, r0: t.size, r1: t.size + 70, t:0, life:0.7, c:'#ffd166', w:5 }); fxText(t.x, t.y - t.size - 18, 'DEGREE ' + d, '#ffd166', 1.3, 15); }
    Hooks.sfx(d - was >= 5 ? 'paragon' : 'rank');
  }
  return true;
}
/* the paragon's own damage and income since last counted */
function paragonGrow(t){
  const P = paraPools(t), S = t.pwSeen;
  const dd = Math.max(0, (t.dmg || 0) - S.dmg), di = Math.max(0, (t.cashGen || 0) - S.inc);
  S.dmg = t.dmg || 0; S.inc = t.cashGen || 0;
  addPool(P, 'dmg', dd / 120 + di / 45);
  return settleDegree(t);
}
/* cash put into a paragon from its panel: $1 is 1 power, until the cash pool is full */
function paragonInvest(t, amount){
  if (!t || !t.paragon) return 0;
  const P = paraPools(t);
  const room = Math.max(0, PARA_CAP.cash - P.cash);
  const v = Math.floor(Math.min(amount, room, G.admin.infCash ? Infinity : G.cash));
  if (v <= 0) return 0;
  spend(v); t.invested += v;
  addPool(P, 'cash', v);
  settleDegree(t);
  return v;
}
/* another copy of a paragon's appliance, merged into it: no refund, all of its power */
function mergeState(o){
  if (!o || o.paragon || o.hero) return null;
  const par = G.towers.find(t => t.paragon && t.type === o.type);
  if (!par) return null;
  const P = Object.assign({}, paraPools(par)), add = copiesPower([o], 0);
  for (const k of PARA_POOLS) addPool(P, k, add[k]);
  const gain = poolTotal(P) - poolTotal(par.pw);
  return { par, add, gain, degree: par.degree, next: Math.max(par.degree, degreeOf(poolTotal(P))) };
}
function mergeIntoParagon(o){
  const st = mergeState(o);
  if (!st || !canSell()) return false;
  const par = st.par, P = par.pw;
  for (const k of PARA_POOLS) addPool(P, k, st.add[k]);
  par.invested += o.invested; par.dmg += o.dmg; par.pwSeen.dmg += o.dmg; par.kills += o.kills;
  par.cashGen = (par.cashGen || 0) + (o.cashGen || 0); par.pwSeen.inc += o.cashGen || 0;
  G.towers = G.towers.filter(x => x !== o);
  G.puddles = G.puddles.filter(p => p.tw !== o); G.traps = G.traps.filter(p => p.tw !== o); G.whirls = G.whirls.filter(p => p.tw !== o); G.bowls = G.bowls.filter(b => b.tw !== o);
  mixerForget(o);
  if (G.vis){ G.fx.push({ k:'hook', x1: par.x, y1: par.y, x2: o.x, y2: o.y, t:0, life:0.5 }); for (let i = 0; i < 24; i++){ const a = rand(0, TAU), v = rand(40, 160); part(o.x, o.y, Math.cos(a) * v, Math.sin(a) * v, 0.8, i % 2 ? '#ffd166' : '#fff4c2', 3, 'spark'); } }
  refreshTowers();
  if (!settleDegree(par)) Hooks.toast(TOWERS[o.type].name + ' merged into ' + TOWERS[o.type].paragon.name + '.', 'gold');
  Hooks.sfx('upgrade');
  return true;
}
function paragonDegree(type){
  return degreeOf(poolTotal(copiesPower(G.towers.filter(o => o.type === type && !o.paragon), 3)));
}
function makeParagon(t){
  const st = paragonState(t);
  if (!st || !st.ok || !canAfford(st.cost)) return false;
  spend(st.cost);
  const copies = G.towers.filter(o => o.type === t.type);
  const pools = copiesPower(copies, 3), degree = degreeOf(poolTotal(pools));
  let inv = st.cost, dmg = 0, kills = 0, gen = 0;
  for (const o of copies){ inv += o.invested; dmg += o.dmg; kills += o.kills; gen += o.cashGen || 0; }
  G.towers = G.towers.filter(o => o.type !== t.type || o === t);
  t.paragon = true; t.degree = degree; t.invested = inv; t.dmg = dmg; t.kills = kills; t.cashGen = gen; t.up = [5,5,5]; t.bank = 0;
  t.pw = pools; t.pwSeen = { dmg, inc: gen };
  refreshTowers();
  if (!noRecords()){ Profile.stats.paragons = (Profile.stats.paragons || 0) + 1; checkAchievements(); }
  Hooks.sfx('paragon');
  Hooks.toast(TOWERS[t.type].paragon.name + ' rises! Degree ' + degree + '.', 'gold');
  if (G.vis){
    G.shake = 0.5;
    for (let i = 0; i < 90; i++){ const a = rand(0, TAU), v = rand(60, 260); part(t.x, t.y, Math.cos(a) * v, Math.sin(a) * v, 1.2, i % 2 ? '#ffd166' : '#fff4c2', 4, 'spark'); }
    G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1:220, t:0, life:0.9, c:'#ffd166', w:6 });
  }
  return true;
}

/* ---------------------------------------------------------------------
   Pests
   --------------------------------------------------------------------- */
function spawnEnemy(type, o){
  o = o || {};
  let def = ENEMIES[type];
  const multi = G.paths.length;
  const path = o.path != null ? o.path : (multi > 1 ? (G.pathToggle++ % multi) : 0);
  const big = !!def.big, boss = !!(def.boss || o.boss);
  const ramp = waveRamp(G.round, G.D);
  let hp = def.hp * (o.armored ? 2 : 1) * hpScale(G.round, big, !!def.boss) * (o.hpMul || 1);
  if (def.boss) hp *= G.D.boss * (G.mm ? 1.5 : 1) * Math.sqrt(ramp.hp) * Math.pow(BOSS_LEVEL_HP, bossLevel(G.round) - 1);
  else hp *= ramp.hp * (G.mod ? (big ? G.mod.bigHp : G.mod.hp) : 1);
  if (!big && def.hp < 10) hp = Math.max(def.hp * (o.armored ? 2 : 1), Math.round(hp));
  /* a Grand Saboteur's sabotage: vehicles that arrive during it are already damaged */
  if (big && !def.boss && !o.child && G.glob.sabotage && G.glob.sabotage.weak) hp *= 1 - G.glob.sabotage.weak;
  const e = {
    id: G.nextId++, type, def, path, d: o.d || 0, seg: 0, x: -40, y: 0, ang: 0, rot: 0,
    hp, maxHp: hp, speed: def.speed * speedScale(G.round) * ramp.speed * (o.speedMul || 1) * (G.mod ? G.mod.speed : 1), r: def.r, big, boss, tier: def.tier,
    camo: !!(def.camo || o.camo), mold: !!(def.mold || o.mold), armored: !!o.armored, immune: def.immune || null,
    lineage: o.lineage || null, slowMult: 1, slowT: 0, freezeT: 0, stunT: 0, brittle: 0, burn: null,
    vulnT: 0, vulnAmt: 0, soakT: 0, smokeT: 0, heatMult: 1, bigBurn: 0, bigBurnTw: null, crippleT: 0, crippleMult: 1,
    hitT: -10, anim: Math.random() * 10, abT: 0, phase: 0, shieldT: 0, dashT: 0, dashCd: 6, halfDone: false, flashT: 0, dead: false,
    holdT: 0, hold: null, grabImm: 0, batterT: 0, batterMult: 1, burrowT: 0, lvl: 1,
    /* a pest beefed up to fit its round pays a little more */
    payMul: o.hpMul > 1 && !def.boss ? Math.sqrt(o.hpMul) : 1,
  };
  if (boss){ e.lvl = evBossLevel() || bossLevel(G.round); e.speed *= Math.min(1.6, 1 + 0.03 * (e.lvl - 1)); }
  const pos = pathPos(G.paths[path], e.d, 0);
  e.x = pos.x; e.y = pos.y; e.seg = pos.seg; e.ang = e.rot = pos.ang;
  G.enemies.push(e);
  if (boss && !o.child){ G.bosses.push(e); Hooks.boss(e); }
  if (big && !o.child && G.preempt) preemptStrike(e);
  if (!G.attract && !Profile.seen[type]){ Profile.seen[type] = 1; Hooks.newPest(type); }
  return e;
}
function preemptStrike(e){
  let src = null;
  for (const t of G.towers) if (t.s.preempt && (!src || t.s.preempt > src.s.preempt)) src = t;
  if (!src) return;
  const spec = { kind:'proj', dmg:0, pierce:1, speed:700, size:9, type:'normal', sprite:'mustard', homing:true, explode:{ r:40, dmg:10, pierce:10, type:'normal', bonusBig: src.s.preempt, ignoreImmune:true } };
  pushProj(src.x, src.y, Math.atan2(e.y - src.y, e.x - src.x), spec.speed, 5, spec, src, e);
}
function isImmune(e, type, ii, tw){
  if (ii || !e.immune || e.glazed || (tw && tw.s && tw.s.allTypes)) return false;
  return e.immune.indexOf(type) >= 0;
}
function damage(e, amt, type, tw, o){
  if (e.dead) return 0;
  if (e.shieldT > 0 || e.burrowT > 0) return 0;
  if (isImmune(e, type, o && (o.ignoreImmune || o.ii), tw)){
    if (G.vis && Math.random() < 0.05) fxText(e.x, e.y - e.r - 6, 'IMMUNE', '#c9d6dc', 0.5, 11);
    return 0;
  }
  let d = amt;
  if (e.big && o){ if (o.bonusBig) d += o.bonusBig; if (o.bigMult) d *= o.bigMult; }
  if (e.boss && o && o.bonusBoss) d += o.bonusBoss;
  if (e.mold && o && o.bonusMold) d += o.bonusMold;
  if (d <= 0) return 0;
  if (e.freezeT > 0 && e.brittle) d += e.brittle;
  if (e.vulnT > 0) d += e.vulnAmt;
  if (e.sprayed) d = sprayDamage(e, d, type, tw, o);   // a spray bottle's soak and lather
  if (e.guardUntil > G.time) d = pestGuard(e, d);       // a shield beetle's cover
  if (type === 'heat'){ if (e.soakT > 0) d += 1; if (e.smokeT > 0 && e.heatMult > 1) d *= e.heatMult; }
  if (e.crippleT > 0) d *= e.crippleMult;
  if (tw){ if (tw.dmgMul) d *= tw.dmgMul; if (tw.heroBoost) d *= tw.heroBoost; }
  if (e.layers) d *= 1 + 0.1 * e.layers;
  if (e.markMul) d *= e.markMul;
  if (G.board && onDark(e.x, e.y)) d *= G.board.mul;   // a bishop's Colour Complex: pests on the dark squares
  d *= G.admin.dmgMult;
  if (e.plate > 0) return plateSoak(e, d, tw);
  const before = e.hp;
  e.hp -= d; e.hitT = G.time; e.flashT = 0.06;
  const dealt = Math.min(d, before);
  G.stats.damage += dealt;
  if (G.vis && dmgNumbersOn()){ e.dmgAcc = (e.dmgAcc || 0) + dealt; if (!(e.dmgAccT > 0)) e.dmgAccT = 0.18; }
  if (tw){ tw.dmg += dealt; G.xp[tw.type] = (G.xp[tw.type] || 0) + dealt * G.xpMult; if (tw.wrathOn) wrathFeed(tw, dealt); if (tw.on) riderXp(tw, dealt); }
  if (e.def.segs) shedSegs(e);
  if (e.hp <= 0) kill(e, tw);
  return dealt;
}
function kill(e, tw){
  if (e.dead) return;
  e.dead = true; G.deadFlag = true;
  addCash(e.def.bounty * cashScale(G.round) * waveRamp(G.round, G.D).cash * (G.mod ? G.mod.cash : 1) * (e.cashMul || 1) * (e.payMul || 1));
  G.stats.kills++;
  if (tw) tw.kills++;
  if (e.gold) goldenCooked(e);
  if (e.souffle) souffleBurst(e);
  if (e.boss && !noRecords()){ Profile.stats.bosses = (Profile.stats.bosses || 0) + 1; if (e.type === 'queen') Profile.stats.queens = (Profile.stats.queens || 0) + 1; const BK = Profile.stats.bossKinds || (Profile.stats.bossKinds = {}); BK[e.type] = (BK[e.type] || 0) + 1; checkAchievements(); }
  if (G.necros.length) necroFeed(e);
  if (G.paraList.length) paraKill(e, tw);
  if (e.shatter && e.freezeT > 0) spawnFrags(e.x, e.y, { count: e.shatter.count, dmg: e.shatter.dmg, pierce: e.shatter.pierce, speed: 320, life: 0.25, type:'normal', sprite:'iceshard' }, e.shatterTw);
  const ch = G.noKids ? null : e.def.children;
  if (ch){
    const cm = e.def.childMods || '';
    const camo = (e.camo && !e.big) || cm.includes('c');
    const mold = (e.mold && !e.boss) || cm.includes('m');
    const lineage = (e.lineage ? e.lineage.slice(-5) : []).concat(e.id);
    let k = 0;
    for (const [cid, n] of ch) for (let i = 0; i < n; i++){
      spawnEnemy(cid, { path: e.path, d: Math.max(0, e.d - k * 7), camo, mold, lineage, child: true });
      k++;
    }
  }
  if (G.vis){
    const col = splatColor(e);
    const n = e.big ? 26 : 5;
    if (e.dmgAcc > 0) flushDmgNumber(e);
    /* the pest itself: cooked, it curls up, puffs smoke and fades (bosses and vehicles go out with a bang above) */
    if (!lowFx()) G.fx.push({ k:'cooked', x: e.x, y: e.y, rot: e.rot, type: e.type, r: e.r, big: !!e.big, gold: !!e.gold, t: 0, life: e.big ? 0.55 : 0.38, seed: Math.random() * 10 });
    for (let i = 0; i < n; i++){ const a = rand(0, TAU), v = rand(30, e.big ? 220 : 110); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, rand(0.25, 0.5), col, e.big ? 4 : 2.5, 'dot'); }
    if (e.big){ G.fx.push({ k:'boom', x:e.x, y:e.y, r:e.r * 1.6, t:0, life:0.4, c:'#fff2d6' }); G.shake = Math.max(G.shake, e.boss ? 0.6 : 0.18); }
  }
  Hooks.sfx(e.big ? 'crack' : 'pop');
  const bi = G.bosses.indexOf(e);
  if (bi >= 0){ G.bosses.splice(bi, 1); Hooks.boss(null); Hooks.toast(e.def.name + ' defeated!', 'gold'); }
}
function splatColor(e){
  return { ant:'#3a2418', fruitfly:'#b07a3a', housefly:'#33383d', weevil:'#6b5444', pillbug:'#6f7782', fireant:'#d9531e', snowflea:'#cfe7f3', spore:'#7aa95c',
    roach:'#6b3a1f', antball:'#4a2c1c', mouse:'#9aa0a6', rat:'#5f5a55', cheese:'#f2c14e', basket:'#c08a4a', midnight:'#5b3a7a', truck:'#e2383f',
    raccoon:'#7d8288', ratking:'#ffd166', greatmold:'#7aa95c', queen:'#8b2f2f', flylord:'#2f3a33', skunk:'#24272b', mole:'#4a3f3a', bigcheese:'#f2c14e' }[e.type] || '#888';
}
function leak(e){
  e.dead = true; G.deadFlag = true;
  if (e.gold){ Hooks.golden('escaped', e); return; }
  const L = e.boss ? 99999 : e.def._leak;
  G.stats.leaked += Math.min(L, 9999);
  const bi = G.bosses.indexOf(e);
  if (bi >= 0){ G.bosses.splice(bi, 1); Hooks.boss(null); }
  if (!G.admin.god && !G.attract) G.lives -= L;
  if (G.paraList.length) paraLost();
  moreLeak();
  Hooks.sfx('leak');
  if (G.vis){ G.fx.push({ k:'flash', c:'rgba(226,56,63,0.22)', t:0, life:0.35 }); G.shake = Math.max(G.shake, 0.25); }
  if (G.leakGuard && G.blitzCd <= 0) leakGuard();
  if (G.lives <= 0 && !G.over){
    if (perk('second') && !G.usedSecond){ G.usedSecond = true; G.lives = 25; Hooks.toast('Second Helping! 25 lives restored.', 'gold'); }
    else { G.lives = 0; gameOver(); }
  }
}
function leakGuard(){
  G.blitzCd = 20;
  let n = 0;
  for (const e of G.enemies){
    if (e.dead || e.big || !onScreen(e)) continue;
    kill(e, null); n++;
    if (G.vis && n % 3 === 0) G.fx.push({ k:'boom', x:e.x, y:e.y, r:30, t:0, life:0.35, c:'#ffcf7a' });
  }
  Hooks.toast('Toast storm! The kitchen is cleared.', 'warn');
  Hooks.sfx('boom');
}

/* status effects */
function slowE(e, mult, dur){
  if (e.boss) mult = 1 - (1 - mult) * 0.5 * windResist(e);
  if (e.slowT <= 0 || mult <= e.slowMult){ e.slowMult = mult; e.slowT = Math.max(e.slowT, dur); }
}
/* batter (the fryer's glue): coated pests crawl until it wears off; vehicles only once batter sticks to them */
function batterE(e, b){
  let m = e.big ? (b.bigMult || 1) : b.mult;
  if (!(m < 1)) return;
  if (e.boss) m = 1 - (1 - m) * 0.5;
  e.batterMult = e.batterT > 0 ? Math.min(e.batterMult, m) : m;
  e.batterT = Math.max(e.batterT, b.dur);
}
function canBatter(e, b){ return !e.big || (b.bigMult || 1) < 1; }
function freezeE(e, f, tw){
  if (e.immune && !e.glazed && e.immune.indexOf('cold') >= 0 && !f.ii && !f.ignoreImmune && !(tw && tw.s && tw.s.allTypes)) return;
  const k = perk('icebox') ? 1.15 : 1;
  if (e.big){
    if (f.bigDur) e.freezeT = Math.max(e.freezeT, f.bigDur * k * (e.boss ? 0.5 * (e.def.windy ? 0.5 : 1) : 1));
    else slowE(e, 0.82, f.dur * k);
  } else e.freezeT = Math.max(e.freezeT, f.dur * k);
  /* a frost that lingers: thawed pests stay slow for a while */
  if (f.after && !e.big) slowE(e, f.after.mult, e.freezeT + f.after.dur);
  if (f.brittle) e.brittle = Math.max(e.brittle, f.brittle);
  if (f.shatter){ e.shatter = f.shatter; e.shatterTw = tw; }
}
function stunE(e, d){ if (e.boss) d *= 0.4 * (e.def.windy ? 0.5 : 1); e.stunT = Math.max(e.stunT, d); }
function addBurn(e, b, tw, ii){
  if (e.immune && !e.glazed && e.immune.indexOf('heat') >= 0 && !b.ii && !ii && !(tw && tw.s && tw.s.allTypes)) return;
  const dur = b.dur * (perk('slow') ? 1.25 : 1);
  if (e.burn && e.burn.dmg > b.dmg){ e.burn.t = Math.max(e.burn.t, dur * 0.5); return; }
  if (e.burn && e.burn.dmg === b.dmg){ e.burn.t = Math.max(e.burn.t, dur); e.burn.tw = tw; return; }
  e.burn = { dmg: b.dmg, tick: b.tick, t: dur, acc: 0, tw, o: { ii: !!(b.ii || ii) } };
}
function setVuln(e, v){ e.vulnAmt = e.vulnT > 0 ? Math.max(e.vulnAmt, v.amt) : v.amt; e.vulnT = Math.max(e.vulnT, v.dur); }
function stripArmor(e){
  if (!e.armored || e.boss || e.dead) return;
  e.armored = false; e.hp *= 0.5; e.maxHp *= 0.5;
  if (G.vis){ for (let i = 0; i < 6; i++){ const a = rand(0, TAU), v = rand(50, 120); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, 0.45, i % 2 ? '#c9d2d6' : '#e2383f', 3, 'spark'); } fxText(e.x, e.y - e.r - 8, 'SCRUBBED', '#bfe9ff', 0.7, 11); }
}
function applyHit(e, a, tw){
  if (e.burrowT > 0) return;
  G.curAtk = a;
  damage(e, a.dmg + (a.dmg > 0 && tw && tw.dmgAdd ? tw.dmgAdd : 0) + (a.stunBonus && (e.stunT > 0 || e.freezeT > 0) ? a.stunBonus : 0), a.type, tw, a);
  G.curAtk = null;
  if (e.dead) return;
  if (isImmune(e, a.type, a.ignoreImmune, tw)) return;
  if (a.soak) e.soakT = Math.max(e.soakT, a.batter ? a.batter.dur : 3);
  if (a.strip) stripArmor(e);
  if (a.burn) addBurn(e, a.burn, tw, a.ignoreImmune);
  if (a.freeze) freezeE(e, a.freeze, tw);
  if (a.slow) slowE(e, e.big ? (a.slow.bigMult || 1) : a.slow.mult, a.slow.dur);
  if (a.batter) batterE(e, a.batter);
  if (a.stun && !e.big) stunE(e, a.stun);
  if (a.bigStun && e.big) stunE(e, a.bigStun);
  if (a.knock && !e.big) knockE(e, a.knock);
  if (a.bigKnock && e.big && !e.boss) knockE(e, a.bigKnock);
  if (a.decamo) e.camo = false;
  if (a.demold) e.mold = false;
  if (a.vuln) setVuln(e, a.vuln);
  if (a.cripple && e.big){ e.crippleMult = a.cripple.mult; e.crippleT = a.cripple.dur; }
  if (a.layer) addLayer(e, tw);
  if (tw && tw.hitFx) paraHitFx(e, tw);
  if (a.more) moreHit(e, a, tw);
}
/* extra effects carried by an explosion (impact, blast, mine) */
function applyFx(e, ex, tw){
  if (e.dead || e.burrowT > 0 || isImmune(e, ex.type, ex.ignoreImmune, tw)) return;
  if (ex.stun) stunE(e, e.big ? (ex.stunBig || 0) : ex.stun);
  if (ex.burn) addBurn(e, ex.burn, tw, ex.ignoreImmune);
  if (ex.vuln) setVuln(e, ex.vuln);
  if (ex.soak) e.soakT = Math.max(e.soakT, 3);
  if (ex.knock && !e.big) knockE(e, ex.knock);
  if (ex.bigKnock && e.big && !e.boss) knockE(e, ex.bigKnock);
  if (ex.slow) slowE(e, e.big ? (ex.slow.bigMult || 1) : ex.slow.mult, ex.slow.dur);
  if (ex.batter) batterE(e, ex.batter);
  if (ex.freeze) freezeE(e, ex.freeze, tw);
  if (ex.strip) stripArmor(e);
  if (ex.decamo) e.camo = false;
  if (ex.more) moreFx(e, ex, tw);
}
/* grabs: dough hooks and soap bubbles hold a pest in place */
function grab(e, a, tw){
  let dur = a.bubble ? (e.big ? (a.bubble.bigDur || 0) : a.bubble.dur) : (e.big ? (a.bigHold || 0) : a.hold);
  if (!(dur > 0)) return false;
  if (e.boss){ dur *= 0.3; e.grabImm = 4; }
  applyHit(e, a, tw);
  if (e.dead) return true;
  e.holdT = Math.max(e.holdT, dur);
  e.hold = a.bubble ? { k:'bubble', pop: a.bubble.pop, popBig: a.bubble.popBig || a.bubble.pop, foam: !!a.bubble.foam, tw, dur }
    : { k:'hook', x: tw.x, y: tw.y, tw, dur };
  if (G.vis && a.bubble) G.fx.push({ k:'ring', x:e.x, y:e.y, r0:e.r, r1:e.r + 14, t:0, life:0.3, c:'#bfefff', w:2 });
  return true;
}
function releaseHold(e){
  const h = e.hold;
  e.hold = null; e.holdT = 0;
  if (h && h.k === 'vine'){ if (!e.dead) vineDone(e, h); return; }   // a mixer's dough hook has kneaded it away
  if (!h || h.k !== 'bubble' || e.dead) return;
  if (G.vis){ G.fx.push({ k:'pop', x:e.x, y:e.y, t:0, life:0.25 }); for (let i = 0; i < 8; i++){ const a = rand(0, TAU), v = rand(40, 110); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, 0.4, '#e6fbff', 2.5, 'dot'); } }
  Hooks.sfx('bubble');
  if (h.foam) G.clouds.push({ x: e.x, y: e.y, r: e.big ? 52 : 40, t: 0, dur: 2.5, spec: { slow: 0.55, foam: true }, tw: h.tw, acc: 0, seed: Math.random() * 100 });
  damage(e, e.big ? h.popBig : h.pop, 'normal', h.tw, null);
}
function knockE(e, k){
  e.d = Math.max(0, e.d - k);
  const pos = pathPos(G.paths[e.path], e.d, e.seg);
  e.x = pos.x; e.y = pos.y; e.seg = pos.seg;
}

/* ---------------------------------------------------------------------
   Targeting
   --------------------------------------------------------------------- */
function attackRange(t, a){ return a.rangeAbs || t.s.range * (a.rangeMul || 1); }
function score(e, t, mode){
  const P = G.paths[e.path];
  switch (mode){
    case 'last': return P.len - e.d;
    case 'close': return -((e.x - t.x) ** 2 + (e.y - t.y) ** 2);
    case 'strong': return e.tier * 1e9 + Math.min(e.hp, 9e8) - (P.len - e.d) * 1e-3;
    default: return -(P.len - e.d);
  }
}
function canTarget(t, e, a){
  if (e.dead || e.burrowT > 0 || !onScreen(e)) return false;
  if (e.camo && !t.s.camo) return false;
  if (a && !a.targetsAll && !a.ignoreImmune && !t.s.allTypes && e.immune && !e.glazed && e.immune.indexOf(a.dtype) >= 0) return false;
  return true;
}
function acquire(t, range, a, mode, filter){
  let list;
  if (range >= 5000) list = G.enemies; else list = query(t.x, t.y, range, Q0);
  let best = null, bs = -Infinity;
  mode = mode || t.tg;
  for (let i = 0; i < list.length; i++){
    const e = list[i];
    if (!canTarget(t, e, a) || (filter && !filter(e))) continue;
    const sc = score(e, t, mode);
    if (sc > bs){ bs = sc; best = e; }
  }
  return best;
}
function acquireBig(t, range, a){
  let best = null, bs = -Infinity;
  const list = range >= 5000 ? G.enemies : query(t.x, t.y, range, Q0);
  for (const e of list){
    if (!canTarget(t, e, a)) continue;
    const sc = (e.big ? 1e12 : 0) + e.hp;
    if (sc > bs){ bs = sc; best = e; }
  }
  return best;
}
function acquireN(t, range, a, mode, n, filter){
  const list = range >= 5000 ? G.enemies : query(t.x, t.y, range, Q0);
  const c = [];
  for (let i = 0; i < list.length; i++){
    const e = list[i];
    if (!canTarget(t, e, a) || (filter && !filter(e))) continue;
    c.push([score(e, t, mode || t.tg), e]);
  }
  c.sort((p, q) => q[0] - p[0]);
  const out = [];
  for (let i = 0; i < c.length && i < n; i++) out.push(c[i][1]);
  return out;
}
function anyTarget(t, a){
  for (const e of G.enemies) if (canTarget(t, e, a)) return true;
  return false;
}
function predictPos(e, dt){
  const P = G.paths[e.path];
  const mult = (e.freezeT > 0 || e.stunT > 0 || e.holdT > 0) ? 0 : Math.min(e.slowT > 0 ? e.slowMult : 1, e.batterT > 0 ? e.batterMult : 1);
  const d = Math.min(P.len, e.d + e.speed * mult * dt);
  return pathPos(P, d, e.seg);
}

/* ---------------------------------------------------------------------
   Projectiles and other attack objects
   --------------------------------------------------------------------- */
function pushProj(x, y, ang, spd, life, spec, tw, target){
  if (G.projs.length > 1400) return null;
  const p = { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, ang, spd, life, max: life, size: spec.size || 5, spec, tw,
    pierce: spec.pierce || 1, pierce0: spec.pierce || 1, hit: new Set(), target: target || null, spin: Math.random() * TAU, done: false, hitSomething: false, curve: spec.spiral ? 2.4 : 0 };
  G.projs.push(p);
  return p;
}
function spawnFrags(x, y, f, tw){
  const off = Math.random() * TAU;
  for (let i = 0; i < f.count; i++){
    const a = off + i / f.count * TAU;
    pushProj(x, y, a, f.speed, f.life, f, tw);
  }
}
function explodeAt(x, y, ex, tw, spec){
  const list = query(x, y, ex.r, Q2);
  let n = 0;
  if (list.length > ex.pierce) list.sort((a, b) => ((a.x - x) ** 2 + (a.y - y) ** 2) - ((b.x - x) ** 2 + (b.y - y) ** 2));
  for (let i = 0; i < list.length && n < ex.pierce; i++){
    const e = list[i];
    if (e.dead) continue;
    damage(e, ex.dmg + (ex.dmg > 0 && tw && tw.dmgAdd ? tw.dmgAdd : 0), ex.type, tw, ex);
    if (!e.dead) applyFx(e, ex, tw);
    n++;
  }
  if (ex.wet){
    /* a splash of water from a lobster's fork */
    if (G.vis) G.fx.push({ k:'splash', x, y, r: ex.r, t:0, life: 0.35, seed: Math.random() * 10 });
    if (Math.random() < 0.3) Hooks.sfx('splash');
  } else if (ex.splat){
    /* a splash of batter, not a bang */
    if (G.vis){
      G.fx.push({ k:'splat', x, y, r: ex.r, t:0, life: 0.4, seed: Math.random() * 10 });
      if (!lowFx()) for (let i = 0; i < 6; i++){ const a = rand(0, TAU), v = rand(40, 110); part(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.35, '#e8c26a', 2.6, 'dot'); }
    }
    Hooks.sfx('splat');
  } else {
    if (G.vis){
      G.fx.push({ k:'boom', x, y, r: ex.r, t:0, life: 0.32, c: ex.type === 'heat' || ex.burn ? '#ff8a3d' : '#ffc46b' });
      if (!lowFx()) for (let i = 0; i < 4; i++){ const a = rand(0, TAU), v = rand(40, 120); part(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.4, '#c98a3c', 2.5, 'crumb'); }
    }
    Hooks.sfx('boom');
  }
  if (spec){
    if (spec.frag) spawnFrags(x, y, spec.frag, tw);
    if (spec.cluster) scheduleCluster(x, y, spec.cluster, tw, spec.cluster.depth);
  }
}
function scheduleCluster(x, y, c, tw, depth){
  const n = c.count;
  for (let i = 0; i < n; i++){
    const a = i / n * TAU + rand(-0.3, 0.3), dist = c.spread * rand(0.5, 1.1);
    const cx = clamp(x + Math.cos(a) * dist, 0, W), cy = clamp(y + Math.sin(a) * dist, 0, H);
    G.timers.push({ t: rand(0.1, 0.25), fn: () => {
      explodeAt(cx, cy, c.type ? c : Object.assign({}, c, { type:'blast' }), tw, null);
      if (G.vis) G.fx.push({ k:'mini', x:cx, y:cy, t:0, life:0.25 });
      if (depth > 1) scheduleCluster(cx, cy, Object.assign({}, c, { count: Math.max(3, Math.floor(n / 2)), spread: c.spread * 0.7 }), tw, depth - 1);
    }});
  }
}
function lobTo(t, a, x, y, extra){
  const x1 = clamp(x, 4, W - 4), y1 = clamp(y, 4, H - 4);
  const dist = Math.hypot(x1 - t.x, y1 - t.y);
  const h = a.mortar ? 70 + dist * 0.22 : 34 + Math.random() * 18;
  /* thrown from the side that faces the target, as the appliance turns to it */
  const off = extra && extra.drop ? 0 : Math.min(dist, t.size * 0.55), ux = dist > 0 ? (x1 - t.x) / dist : 0, uy = dist > 0 ? (y1 - t.y) / dist : 0;
  G.lobs.push(Object.assign({ x0: t.x + ux * off, y0: t.y - 8 + uy * off, x1, y1, t: 0, dur: a.travel || 0.45, spec: a, tw: t, h, spin: Math.random() * TAU }, extra || {}));
}
function addPuddle(x, y, p, tw, r, cap){
  let n = 0;
  for (let i = G.puddles.length - 1; i >= 0; i--) if (G.puddles[i].tw === tw && ++n >= (cap || 9)) G.puddles.splice(i, 1);
  G.puddles.push({ x, y, r: r || p.r, t: 0, dur: p.dur, spec: p, tw, acc: Math.random() * 0.1, seed: Math.random() * 100 });
}
/* trail sample points, used by traps and pasta rain */
let trailCache = { key:'', pts:[] };
function trailPoints(){
  const key = G.mapId + ':' + G.paths.length;
  if (trailCache.key === key) return trailCache.pts;
  const pts = [];
  G.paths.forEach((P, pi) => {
    for (let d = 0; d <= P.len; d += 9){
      const q = pathPos(P, d, 0);
      if (q.x < 10 || q.x > W - 10 || q.y < 10 || q.y > H - 10) continue;
      pts.push({ x: q.x, y: q.y, ang: q.ang, path: pi, d, left: P.len - d });
    }
  });
  trailCache = { key, pts };
  return pts;
}
function trapSpots(t, range){
  const key = G.mapId + ':' + Math.round(range);
  if (t._spots && t._spots.key === key) return t._spots;
  const pts = trailPoints().filter(p => Math.hypot(p.x - t.x, p.y - t.y) <= range);
  const byExit = pts.slice().sort((a, b) => a.left - b.left);
  const byDist = pts.slice().sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
  t._spots = { key, pts, byExit, byDist };
  return t._spots;
}
function pickSpot(t, S){
  const n = S.pts.length, part = Math.max(1, Math.ceil(n * 0.35));
  const r = () => Math.floor(Math.random() * part);
  switch (t.tg){
    case 'first': return S.byExit[r()];
    case 'last': return S.byExit[n - 1 - r()];
    case 'close': return S.byDist[r()];
    default: return S.pts[Math.floor(Math.random() * n)];
  }
}
function addTrap(tw, a, pt, mine, o){
  o = o || {};
  if (!o.rain){
    const keep = !!a.keep, cap = keep ? 60 : tw.paragon ? 140 : 70;
    let n = 0;
    for (let i = G.traps.length - 1; i >= 0; i--) if (G.traps[i].tw === tw && !G.traps[i].rain && !!G.traps[i].keep === keep && ++n >= cap) G.traps.splice(i, 1);
  }
  const off = rand(-6, 6);
  const x = pt.x - Math.sin(pt.ang) * off, y = pt.y + Math.cos(pt.ang) * off;
  G.traps.push({ x, y, r: mine ? Math.max(14, a.r || 14) : (a.r || 14), spec: a, tw, pierce: a.pierce || 1, max: a.pierce || 1, life: o.life || a.life || 20, t: 0,
    fly: o.fly != null ? o.fly : 0.22, x0: o.x0 != null ? o.x0 : tw.x, y0: o.y0 != null ? o.y0 : tw.y, hit: new Set(), bigHit: new Map(),
    mine: !!mine, rain: !!o.rain, keep: !!a.keep, geddon: !!o.geddon, sprite: mine ? 'ravioli' : a.sprite, rot: rand(0, TAU), seed: Math.random() * 100 });
}
/* nests (or mines) dropped from above at random spots along every trail */
function layCarpet(t, spec, count, mine){
  const pts = trailPoints();
  if (!pts.length) return false;
  for (let i = 0; i < count; i++){
    const pt = pts[Math.floor(Math.random() * pts.length)];
    G.timers.push({ t: 0.03 * i, fn: () => addTrap(t, spec, pt, !!mine, { rain:true, life: spec.life || 30, fly:0.45, x0: pt.x, y0: pt.y - 240 }) });
  }
  Hooks.sfx('squish');
  return true;
}
function pathPointAhead(e, ahead){
  const P = G.paths[e.path];
  return pathPos(P, Math.min(P.len - 5, e.d + ahead), e.seg);
}

/* fire one attack; returns true if something happened */
function setAim(t, id, ang){ if (id === 'main' || !t.base.atk.main){ t.aim = ang; t.aimed = true; } else t.aim2 = ang; }
const BOOM_ARC = [[1.05, 1], [1.05, -1], [0.8, 1], [0.8, -1], [1.3, 1], [1.3, -1]];
/* where a pointer-aimed attack (a Dartling-style gun) aims: its locked spot if the player set one
   (also during skips), otherwise the player's pointer while playing. Skips and the menu demo have
   no pointer, so unlocked attacks aim by themselves at any range there. */
function aimPoint(t, a){
  if (a.aim !== 'pointer') return null;
  if (t.lock) return t.lock;
  return G.vis && !G.attract && G.aimAt ? G.aimAt : null;
}
/* lock a pointer-aimed appliance onto one spot, or (with null) let it follow the pointer again */
function setLock(t, p){
  t.lock = p ? { x: clamp(p.x, 4, W - 4), y: clamp(p.y, 4, H - 4) } : null;
  pointerFlag();
}
const autoRange = (a, range) => a.aim === 'pointer' ? Math.max(range, 9999) : range;
function fire(t, a, id){
  const range = attackRange(t, a);
  switch (a.kind){
    case 'proj': {
      const P = aimPoint(t, a);
      let tg = null, ax, ay;
      if (P){
        if (!anyTarget(t, a)) return false;
        ax = P.x; ay = P.y;
      } else {
        if (a.layer){
          /* layered batter goes to pests that can still take another layer */
          const R = autoRange(a, range);
          tg = acquire(t, R, a, a.mode, e => (e.layers || 0) < 5) || acquire(t, R, a, a.mode);
        } else if (a.bigOnly) tg = acquire(t, autoRange(a, range), a, 'strong', e => e.big);
        else if (a.batter){
          /* batter globs go to pests not coated yet (and never to vehicles it can't stick to) */
          const R = autoRange(a, range), b = a.batter;
          tg = acquire(t, R, a, a.mode, e => canBatter(e, b) && !(e.batterT > 1.5 && e.batterMult <= b.mult + 1e-6)) || acquire(t, R, a, a.mode, e => canBatter(e, b));
        } else tg = a.targetBig ? acquireBig(t, autoRange(a, range), a) : acquire(t, autoRange(a, range), a, a.mode);
        if (!tg) return false;
        ax = tg.x; ay = tg.y;
        if (a.dyn) t.lastDist = Math.hypot(tg.x - t.x, tg.y - t.y);
        const lead = a.boomerang ? 1.21 : 1;
        if (!a.homing){
          let tt = Math.hypot(tg.x - t.x, tg.y - t.y) * lead / a.speed;
          for (let k = 0; k < 2; k++){ const p = predictPos(tg, tt); ax = p.x; ay = p.y; tt = Math.hypot(ax - t.x, ay - t.y) * lead / a.speed; }
        }
      }
      const ang = Math.atan2(ay - t.y, ax - t.x);
      setAim(t, id, ang);
      let spec = a;
      if (a.crit){ t.shots++; if (t.shots % a.crit.every === 0) spec = a.critSpec; }
      const n = spec.count || 1;
      const jit = () => spec.inacc ? rand(-spec.inacc, spec.inacc) : 0;
      if (spec.boomerang){
        /* each plate flies a circle that passes through the target and comes home */
        const c = Math.max(36, Math.hypot(ax - t.x, ay - t.y));
        for (let i = 0; i < n; i++){
          const [al, side] = BOOM_ARC[i % BOOM_ARC.length];
          const R = c / (2 * Math.sin(al));
          const life = Math.min(3.5, TAU * R / spec.speed);
          const p = pushProj(t.x, t.y, ang - side * al, spec.speed, life, spec, t, null);
          if (p) p.curve = side * spec.speed / R;
        }
      } else {
        /* shots aimed at the pointer fly at least as far as the pointer */
        const reach = P ? Math.max(range, Math.hypot(ax - t.x, ay - t.y) + 80) : tg && a.aim === 'pointer' ? Math.max(range, Math.hypot(ax - t.x, ay - t.y) + 80) : range;
        const life = (Math.min(reach, 1100) * 1.15 * (spec.lifeMul || 1)) / spec.speed;
        const shoot = (dir, i) => {
          const p = pushProj(t.x + Math.cos(dir) * t.size * 0.6, t.y + Math.sin(dir) * t.size * 0.6, dir, spec.speed, life * (spec.pattern === 'spiral' ? 1.6 : 1), spec, t, spec.homing ? tg : null);
          if (p && spec.pattern === 'spiral') p.curve = (i % 2 ? -1 : 1) * 2.4;
        };
        if (spec.pattern === 'stream' && n > 1){
          /* a burst: one shot after another, each aimed again as it leaves */
          const gap = clamp(a.rate * 0.6 / n, 0.03, 0.09);
          shoot(ang + jit(), 0);
          for (let i = 1; i < n; i++) G.timers.push({ t: i * gap, fn: () => {
            if (G.towers.indexOf(t) < 0 || t.stunT > 0) return;
            const Q = aimPoint(t, a);
            let d = ang;
            if (Q) d = Math.atan2(Q.y - t.y, Q.x - t.x);
            else if (tg && !tg.dead) d = Math.atan2(tg.y - t.y, tg.x - t.x);
            setAim(t, id, d);
            shoot(d + jit(), i);
          } });
        } else for (let i = 0; i < n; i++){
          const dir = spec.pattern === 'ring' ? ang + i / n * TAU : spec.pattern === 'scatter' ? ang + rand(-0.45, 0.45) : ang + (i - (n - 1) / 2) * (spec.spread || 0.18);
          shoot(dir + jit(), i);
        }
      }
      t.fireAnim = 0.18;
      Hooks.sfx(a.explode ? 'thunk' : a.boomerang ? 'whoosh' : 'throw');
      return true;
    }
    case 'lob': case 'slick': case 'cloud': {
      const P = aimPoint(t, a);
      const spotMode = !!(a.mortar && t.spot);
      let tg = null;
      if (spotMode || P){ if (!anyTarget(t, a)) return false; }
      else { tg = acquire(t, autoRange(a, range), a, a.mode); if (!tg) return false; }
      let spec = a;
      if (a.crit){ t.shots++; if (t.shots % a.crit.every === 0) spec = a.critSpec; }
      const n = spec.count || 1;
      for (let i = 0; i < n; i++){
        let p;
        if (spec.kind === 'lob'){
          p = P ? { x: P.x, y: P.y } : spotMode ? { x: t.spot.x, y: t.spot.y } : predictPos(tg, spec.travel || 0.45);
          if (spec.mortar){ const an = rand(0, TAU), rr = (spec.spreadR || 0) * Math.sqrt(Math.random()) * (n > 1 ? 1.6 : 1); p = { x: p.x + Math.cos(an) * rr, y: p.y + Math.sin(an) * rr }; }
          else if (n > 1) p = { x: p.x + rand(-34, 34), y: p.y + rand(-34, 34) };
        } else {
          p = pathPointAhead(tg, tg.speed * (spec.travel || 0.4) + (spec.puddle ? spec.puddle.r * 0.7 : 40));
          if (Math.hypot(p.x - t.x, p.y - t.y) > range * 1.15) p = predictPos(tg, spec.travel || 0.4);
        }
        lobTo(t, spec, p.x, p.y, spec.kind === 'cloud' ? { cloud: true } : spec.drop ? { drop: true, h: 2 } : null);
      }
      const fx = P ? P.x : spotMode ? t.spot.x : tg.x, fy = P ? P.y : spotMode ? t.spot.y : tg.y;
      setAim(t, id, Math.atan2(fy - t.y, fx - t.x));
      t.fireAnim = 0.2;
      Hooks.sfx(a.kind === 'cloud' ? 'puff' : a.mortar ? 'thunk' : 'splat');
      return true;
    }
    case 'pulse': {
      const list = query(t.x, t.y, range, Q1);
      let vis = false;
      for (const e of list) if (!e.dead && onScreen(e) && (!e.camo || t.s.camo) && (!a.bigOnly || e.big)){ vis = true; break; }
      if (!vis) return false;
      if (list.length > a.pierce) list.sort((p, q) => score(q, t, 'first') - score(p, t, 'first'));
      let n = 0;
      for (let i = 0; i < list.length && n < a.pierce; i++){
        const e = list[i];
        if (e.dead || !onScreen(e) || (a.bigOnly && !e.big)) continue;
        applyHit(e, a, t); n++;
      }
      if (a.radial) fireRadial(t, a.radial);
      t.fireAnim = 0.3;
      if (id !== 'main') t.fire2 = 0.4;
      if (a.quiet) return true;   // a constant grind (orbiting platters): no ring or sound each tick
      if (G.vis) G.fx.push({ k: a.vfx || 'ring', x: t.x, y: t.y, r0: t.size, r1: range, t: 0, life: a.vfx === 'frost' ? 0.5 : a.vfx === 'basket' ? 0.45 : 0.28, c: a.color || (a.vfx === 'frost' ? '#bfe9ff' : a.vfx === 'steam' ? '#ffffff' : a.hot ? '#ff9a52' : '#d7f5ee'), w: 3 });
      Hooks.sfx(a.vfx === 'frost' ? 'freeze' : a.vfx === 'steam' ? 'puff' : a.vfx === 'basket' ? 'sizzle' : 'whirl');
      return true;
    }
    case 'radial': {
      const R = (a.range || range) * (a.farMul && t.boost[a.farMul.id] ? a.farMul.mul : 1);
      const tg = acquire(t, R, a);
      if (!tg) return false;
      fireRadial(t, a, R);
      t.fireAnim = 0.2;
      Hooks.sfx('throw');
      return true;
    }
    case 'drones': {
      /* escort jets and mini-copters circling the appliance, each firing from where it is */
      const tg = acquire(t, autoRange(a, range), a, a.mode);
      if (!tg) return false;
      const n = a.count || 1;
      for (let i = 0; i < n; i++){
        const [ox, oy] = dronePos(t, a, i, G.time);
        const x = t.x + ox, y = t.y + oy;
        let ax = tg.x, ay = tg.y;
        if (!a.homing){ const q = predictPos(tg, Math.hypot(tg.x - x, tg.y - y) / a.speed); ax = q.x; ay = q.y; }
        const life = Math.min(1100, Math.hypot(ax - x, ay - y) + 120) * (a.lifeMul || 1) / a.speed;
        pushProj(x, y, Math.atan2(ay - y, ax - x) + (a.inacc ? rand(-a.inacc, a.inacc) : 0), a.speed, life, a, t, a.homing ? tg : null);
      }
      if (id !== 'main') t.fire2 = 0.2;
      Hooks.sfx('throw');
      return true;
    }
    case 'beam': {
      const P = aimPoint(t, a);
      let tg = null, ang, far = range;
      if (P){ if (!anyTarget(t, a)) return false; ang = Math.atan2(P.y - t.y, P.x - t.x); far = Math.max(range, Math.hypot(P.x - t.x, P.y - t.y)); }
      else {
        tg = acquire(t, autoRange(a, range), a, a.mode);
        if (!tg) return false;
        ang = Math.atan2(tg.y - t.y, tg.x - t.x);
        if (a.aim === 'pointer') far = Math.max(range, Math.hypot(tg.x - t.x, tg.y - t.y));
      }
      setAim(t, id, ang);
      const len = far + 24, dx = Math.cos(ang), dy = Math.sin(ang);
      const x0 = t.x + dx * t.size * 0.7, y0 = t.y + dy * t.size * 0.7;
      const list = query(x0 + dx * len / 2, y0 + dy * len / 2, len / 2 + 8, Q1);
      const hits = [];
      for (const e of list){
        if (e.dead) continue;
        const px = e.x - x0, py = e.y - y0;
        const along = px * dx + py * dy;
        if (along < -e.r || along > len + e.r) continue;
        const perp = Math.abs(px * dy - py * dx);
        if (perp <= e.r + (a.width || 6) * 0.5) hits.push([along, e]);
      }
      hits.sort((p, q) => p[0] - q[0]);
      let n = 0, last = null;
      for (const [, e] of hits){ if (n >= a.pierce) break; applyHit(e, a, t); last = e; n++; }
      let ex = x0 + dx * len, ey = y0 + dy * len;
      if (n >= a.pierce && last){ ex = last.x; ey = last.y; }
      if (a.chain && (tg || n)) chainFrom(tg || hits[0][1], a, t, hits.slice(0, n).map(h => h[1]));
      if (G.vis) G.fx.push({ k:'beam', x1:x0, y1:y0, x2:ex, y2:ey, t:0, life: a.laser ? 0.09 : a.water ? 0.22 : a.bolt ? 0.2 : 0.14, w: a.width || 6, c: a.color || (a.water ? '#7fd3ff' : a.fusion ? '#9ff3ff' : a.type === 'normal' ? '#d6b8ff' : '#ff6b5e'), laser: !!a.laser, water: !!a.water, bolt: !!a.bolt, seed: Math.random() * 100 });
      t.fireAnim = 0.15;
      Hooks.sfx(a.water ? 'splash' : a.laser ? 'laser' : 'zap');
      return true;
    }
    case 'flame': {
      const P = aimPoint(t, a);
      let ang;
      if (P){ if (!anyTarget(t, a)) return false; ang = Math.atan2(P.y - t.y, P.x - t.x); }
      else { const tg = acquire(t, range, a, a.mode); if (!tg) return false; ang = Math.atan2(tg.y - t.y, tg.x - t.x); }
      setAim(t, id, ang);
      const list = query(t.x, t.y, range, Q1);
      const hits = [];
      for (const e of list){
        if (e.dead) continue;
        const dx = e.x - t.x, dy = e.y - t.y, dist = Math.hypot(dx, dy) || 1;
        let da = Math.atan2(dy, dx) - ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) <= a.cone * 0.5 + Math.atan(e.r / dist)) hits.push([dist, e]);
      }
      hits.sort((p, q) => p[0] - q[0]);
      let n = 0;
      for (const [, e] of hits){ if (n >= a.pierce) break; applyHit(e, a, t); n++; }
      if (G.vis && !lowFx()){
        const k = a.dragon ? 4 : 2;
        for (let i = 0; i < k; i++){
          const aa = ang + rand(-a.cone * 0.45, a.cone * 0.45), v = range * rand(1.6, 2.4);
          part(t.x + Math.cos(ang) * 14, t.y + Math.sin(ang) * 14, Math.cos(aa) * v, Math.sin(aa) * v, 0.38, a.color || (a.dragon ? '#a35cff' : '#ff8a3d'), a.dragon ? 9 : 7, 'flame');
        }
      }
      Hooks.sfx('flame');
      return true;
    }
    case 'hitscan': {
      const mode = a.mode || t.tg, P = aimPoint(t, a), shots = a.shots || 1;
      /* aimed at the pointer: the pests closest to it, anywhere on the map */
      const byPointer = n => G.enemies.filter(e => canTarget(t, e, a)).map(e => [(e.x - P.x) ** 2 + (e.y - P.y) ** 2, e]).sort((p, q) => p[0] - q[0]).slice(0, n).map(z => z[1]);
      const pickOne = () => P ? byPointer(1)[0] || null : (a.marked && acquire(t, autoRange(a, range), a, mode, e => e.markBy === t)) || (a.wanted && acquire(t, autoRange(a, range), a, mode, e => !!e.wanted)) || acquire(t, autoRange(a, range), a, mode);
      let tg = pickOne();
      if (!tg) return false;
      const ang = Math.atan2(tg.y - t.y, tg.x - t.x);
      setAim(t, id, ang);
      t.lastDist = Math.hypot(tg.x - t.x, tg.y - t.y);
      const many = a.multi ? (P ? byPointer(shots) : acquireN(t, autoRange(a, range), a, mode, shots)) : null;
      for (let s = 0; s < shots; s++){
        if (many){ tg = many[s]; if (!tg) break; }
        else if (!tg || tg.dead){ tg = pickOne(); if (!tg) break; }
        const hx = tg.x, hy = tg.y;
        if (a.luck && luckRoll(t, a, tg)){
          applyHit(tg, a.luckSpec, t);
          if (G.vis && !lowFx()) fxText(hx, hy - tg.r - 8, 'BULLSEYE', '#ffd166', 0.6, 11);
        } else applyHit(tg, a, t);
        if (a.zap) chainFrom(tg, a.zap, t, []);
        if (a.splash) explodeAt(hx, hy, a.splash, t, null);
        if (a.frag) spawnFrags(hx, hy, a.frag, t);
        if (G.vis){
          if (a.melee) G.fx.push({ k: a.fxk || 'whack', x: hx, y: hy, x0: t.x, y0: t.y, t: s * 0.025, life: a.fxk ? 0.4 : 0.2, look: a.look });
          else {
            G.fx.push({ k:'tracer', x1: t.x + Math.cos(ang) * 14, y1: t.y + Math.sin(ang) * 14, x2: hx, y2: hy, t: s * 0.04, life: a.squirt ? 0.22 : 0.16, c: a.color || '#fff6e0', squirt: !!a.squirt });
            G.fx.push({ k:'pop', x: hx, y: hy, t: s * 0.04, life: 0.22 });
          }
        }
      }
      t.fireAnim = 0.2;
      if (id !== 'main') t.fire2 = 0.2;
      Hooks.sfx(a.melee ? 'whack' : 'cork');
      return true;
    }
    case 'whirl': {
      const list = acquireN(t, range, a, a.mode || t.tg, a.count);
      if (!list.length) return false;
      for (let i = 0; i < a.count; i++){
        const e = list[i % list.length];
        const off = i >= list.length ? (i - list.length + 1) * a.r * 1.4 : 0;
        const P = G.paths[e.path];
        const d = Math.min(P.len - 2, e.d + a.r * 0.6 + off);
        const q = pathPos(P, d, e.seg);
        G.whirls.push({ path: e.path, d, seg: q.seg, x: q.x, y: q.y, r: a.r, speed: a.speed, left: a.dist, spec: a, tw: t, hit: new Set(), pierce: a.pierce, t: 0, seed: Math.random() * 10 });
        if (G.vis) G.fx.push({ k:'gust', x1: t.x, y1: t.y, x2: q.x, y2: q.y, t: 0, life: 0.25 });
      }
      setAim(t, id, Math.atan2(list[0].y - t.y, list[0].x - t.x));
      t.fireAnim = 0.3;
      Hooks.sfx('whirl');
      return true;
    }
    case 'grab': {
      const mode = a.mode || (a.hook ? 'strong' : t.tg);
      const list = acquireN(t, range, a, mode, a.count, e => e.holdT <= 0 && (!e.big || a.bigs) && !(e.boss && e.grabImm > 0));
      if (!list.length) return false;
      let any = false;
      for (const e of list) if (grab(e, a, t)) any = true;
      if (!any) return false;
      setAim(t, id, Math.atan2(list[0].y - t.y, list[0].x - t.x));
      t.fireAnim = 0.25;
      if (id !== 'main') t.fire2 = 0.35;
      Hooks.sfx(a.bubble ? 'bubble' : 'hook');
      return true;
    }
    case 'carpet': {
      /* every so often, pasta nests drop all along the trail */
      if (!G.roundActive && !G.attract) return false;
      if (!G.enemies.some(e => !e.dead && onScreen(e))) return false;
      /* the nests are the maker's own, as upgraded right now */
      layCarpet(t, Object.assign({}, t.s.atk.main, { life: a.life || 30 }), a.count);
      t.fireAnim = 0.3;
      return true;
    }
    case 'trap': {
      if (!G.roundActive && !G.attract) return false;
      const S = trapSpots(t, range);
      if (!S.pts.length) return false;
      for (let i = 0; i < a.count; i++){
        t.trapN++;
        addTrap(t, a, pickSpot(t, S), !!(a.mineEvery && t.trapN % a.mineEvery === 0));
      }
      t.fireAnim = 0.25;
      Hooks.sfx('squish');
      return true;
    }
  }
  return moreFire(t, a, id);
}
function fireRadial(t, r, R){
  const n = r.count;
  /* a blender's blades leave in the same directions every spin; sprays from aircraft wander */
  t.radialRot = r.fixed ? 0 : (t.radialRot + 0.37) % TAU;
  const life = (R || r.range) / r.speed;
  /* from: how far out the shots start (a turntable flings them off its edge); tang: a sideways tilt as they leave */
  const off = r.from || 10, tang = r.tang || 0;
  for (let i = 0; i < n; i++){
    const a = t.radialRot + i / n * TAU;
    pushProj(t.x + Math.cos(a) * off, t.y + Math.sin(a) * off, a + tang, r.speed, life, r, t);
  }
}
function chainFrom(start, a, tw, already){
  const hit = new Set(already.map(e => e.id));
  hit.add(start.id);
  let cur = start, n = 0;
  const pts = [[start.x, start.y]];
  while (n < a.chain.count){
    const list = query(cur.x, cur.y, a.chain.range, Q3);
    let best = null, bd = Infinity;
    for (const e of list){
      if (e.dead || hit.has(e.id)) continue;
      const d = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2;
      if (d < bd){ bd = d; best = e; }
    }
    if (!best) break;
    hit.add(best.id);
    pts.push([best.x, best.y]);
    applyHit(best, a, tw);
    cur = best; n++;
  }
  if (G.vis && pts.length > 1) G.fx.push({ k:'zap', pts, t:0, life:0.14, c: a.color });
}

/* ---------------------------------------------------------------------
   Abilities
   --------------------------------------------------------------------- */
function abilityList(){
  const map = {};
  for (const t of G.towers) for (const ab of t.s.abilities){
    const cur = map[ab.id];
    const cd = t.ab[ab.id] || 0;
    if (!cur) map[ab.id] = { id: ab.id, towers: [t], cd, max: ab.cd };
    else { cur.towers.push(t); if (cd < cur.cd){ cur.cd = cd; cur.max = ab.cd; } }
  }
  /* bar order: shop order at first, then new abilities join at the end so hotkeys never shuffle */
  const ids = Object.keys(ABILITIES);
  const list = Object.values(map).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  G.abOrder = (G.abOrder || []).filter(id => map[id]);
  for (const a of list) if (G.abOrder.indexOf(a.id) < 0) G.abOrder.push(a.id);
  return list.sort((a, b) => G.abOrder.indexOf(a.id) - G.abOrder.indexOf(b.id));
}
function useAbility(id){
  if (!G.active || G.over) return false;
  if (G.mod && G.mod.noAbilities) return false;
  let best = null;
  for (const t of G.towers){
    const ab = t.s.abilities.find(x => x.id === id);
    if (!ab || (t.ab[id] || 0) > 0) continue;
    if (t.sys && paraAbBlocked(t, ab)) continue;
    if (!best || t.up.reduce((s, v) => s + v, 0) + (t.paragon ? 99 : 0) > best.t.up.reduce((s, v) => s + v, 0) + (best.t.paragon ? 99 : 0)) best = { t, ab };
  }
  if (!best) return false;
  const { t, ab } = best;
  const ok = runAbility(t, ab);
  if (ok){
    t.ab[id] = ab.cd * (perk('quick') ? 0.9 : 1);
    if (t.sys) paraAbUsed(t, ab);
    Hooks.sfx('ability');
    Hooks.abilityUsed(id);
    if (!noRecords()){ Profile.stats.abilities = (Profile.stats.abilities || 0) + 1; if (Profile.stats.abilities === 100) checkAchievements(); }
  }
  return ok;
}
/* a spot just off the trail next to (x, y), where nothing walks */
function besideTrail(x, y, ang, sd){
  const off = PATH_W * 0.5 + 16;
  for (const k of [1, -1, 1.7, -1.7, 2.6, -2.6]){
    const cx = clamp(x - Math.sin(ang) * off * k * sd, 20, W - 20), cy = clamp(y + Math.cos(ang) * off * k * sd, 20, H - 20);
    if (G.paths.every(P => distToPath(P, cx, cy) >= PATH_W * 0.5 + 9)) return { x: cx, y: cy, ok: true };
  }
  return { x: clamp(x, 20, W - 20), y: clamp(y, 20, H - 20), ok: false };
}
function runAbility(t, ab){
  switch (ab.id){
    case 'barrage': case 'sugar': case 'delivery': {
      const type = { barrage:'knife', sugar:'siphon', delivery:'oven' }[ab.id];
      /* the nearest ones first, up to the ability's limit (itself included) */
      const near = G.towers.filter(o => o.type === type && (ab.global || Math.hypot(o.x - t.x, o.y - t.y) <= Math.max(200, t.s.range * 1.5)))
        .sort((p, q) => (p === t ? -1 : q === t ? 1 : Math.hypot(p.x - t.x, p.y - t.y) - Math.hypot(q.x - t.x, q.y - t.y)));
      for (const o of near.slice(0, ab.max || 99)) o.boost[ab.id] = { mult: ab.mult, t: ab.dur };
      if (G.vis) G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1: ab.global ? 400 : 200, t:0, life:0.6, c:'#ffd166', w:5 });
      return true;
    }
    case 'bird': {
      /* a bird of flame circles the grill for a while (its attack only runs while this lasts) */
      t.boost.bird = { mult: 1, t: ab.dur };
      if (G.vis){ G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1:140, t:0, life:0.6, c:'#ff8a3d', w:5 }); for (let i = 0; i < 14; i++){ const a = rand(0, TAU), v = rand(60, 160); part(t.x, t.y, Math.cos(a) * v, Math.sin(a) * v, 0.5, i % 2 ? '#ffb347' : '#ff5a1f', 3.5, 'flame'); } }
      Hooks.sfx('flame');
      return true;
    }
    case 'spill': {
      /* hot oil over everything on screen: battered, soaked and seared, again every second while it lasts */
      const coat = () => {
        for (const e of G.enemies){
          if (e.dead || !onScreen(e) || e.burrowT > 0) continue;
          batterE(e, { mult: ab.slow, bigMult: ab.bigSlow, dur: ab.dur });
          e.soakT = Math.max(e.soakT, ab.dur);
          if (ab.vuln) setVuln(e, { amt: ab.vuln, dur: ab.dur });
        }
      };
      if (!G.enemies.some(e => !e.dead && onScreen(e))) return false;
      coat();
      for (let k = 1; k < (ab.storm || 0); k++) G.timers.push({ t: k, soft:true, fn: coat });
      if (G.vis){ G.fx.push({ k:'flash', c:'rgba(230,180,80,0.32)', t:0, life:0.7 }); G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1:700, t:0, life:0.8, c:'#e8b445', w:7 }); }
      Hooks.sfx('splash');
      return true;
    }
    case 'pastastorm': {
      const spec = Object.assign({}, t.s.atk.main, { mineEvery: 0 });
      if (!layCarpet(t, spec, ab.count)) return false;
      if (G.vis) G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1:220, t:0, life:0.6, c:'#f0d27a', w:5 });
      return true;
    }
    case 'kernel': {
      /* a giant kernel bursts over the microwave, cooking almost everything near it */
      const R = Math.max(200, t.s.range * 1.2);
      let any = false;
      for (const e of G.enemies){
        if (e.dead || !onScreen(e) || Math.hypot(e.x - t.x, e.y - t.y) > R) continue;
        any = true;
        damage(e, e.boss ? ab.boss : e.big ? ab.big : ab.dmg, 'normal', t, { ignoreImmune:true });
      }
      if (!any) return false;
      if (G.vis){ G.fx.push({ k:'boom', x:t.x, y:t.y, r:R, t:0, life:0.7, c:'#fff1c6' }); G.fx.push({ k:'flash', c:'rgba(255,246,214,0.4)', t:0, life:0.5 }); G.shake = 0.5; }
      Hooks.sfx('boom');
      return true;
    }
    case 'steamup': {
      /* full steam: every appliance in range attacks much faster for a while */
      for (const o of G.towers) if (o !== t && (ab.global || Math.hypot(o.x - t.x, o.y - t.y) <= t.s.range + o.size * 0.6)) o.boost.steam = { mult: ab.mult, t: ab.dur };
      t.boost.steam = { mult: 1, t: ab.dur };
      if (G.vis){ G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1: ab.global ? 700 : t.s.range, t:0, life:0.7, c:'#ffffff', w:6 }); if (ab.global) G.fx.push({ k:'flash', c:'rgba(255,255,255,0.22)', t:0, life:0.5 }); }
      Hooks.sfx('puff');
      return true;
    }
    case 'rush':
      G.glob.rush = { mult: ab.mult, t: ab.dur };
      if (G.vis) G.fx.push({ k:'flash', c:'rgba(255,209,102,0.18)', t:0, life:0.5 });
      return true;
    case 'bagel': {
      const tg = acquireBig({ x:t.x, y:t.y, s:{ camo:true, allTypes:true } }, 9999, null);
      if (!tg) return false;
      const spec = { kind:'proj', dmg:0, pierce:1, speed:760, size:16, type:'normal', sprite:'bigbagel', homing:true, explode:{ r:46, dmg:30, pierce:30, type:'normal', bonusBig: ab.dmg, ignoreImmune:true } };
      pushProj(t.x, t.y, Math.atan2(tg.y - t.y, tg.x - t.x), spec.speed, 4, spec, t, tg);
      return true;
    }
    case 'blitz': {
      const targets = G.enemies.filter(e => !e.dead && onScreen(e)).sort((a, b) => b.tier - a.tier || b.hp - a.hp);
      if (!targets.length) return false;
      for (let i = 0; i < ab.bombs; i++){
        const e = targets[i % targets.length];
        const ox = rand(-20, 20), oy = rand(-20, 20);
        G.timers.push({ t: 0.35 + i * 0.035, fn: () => {
          const x = (e.dead ? e.x : e.x) + ox, y = (e.dead ? e.y : e.y) + oy;
          explodeAt(x, y, { r: ab.r, dmg: ab.dmg, pierce: 40, type:'normal', ignoreImmune:true }, t, null);
        }});
        if (G.vis) G.fx.push({ k:'drop', x: e.x + ox, y: e.y + oy, t: -i * 0.035, life: 0.35 });
      }
      return true;
    }
    case 'storm': {
      /* a stream of homing popcorn rockets, each picking one of the toughest pests */
      if (!G.enemies.some(e => !e.dead && onScreen(e))) return false;
      const spec = { kind:'proj', dmg:0, pierce:1, speed:560, size:6, type:'normal', sprite:'popcorn', homing:true, explode:{ r: ab.r, dmg: ab.dmg, pierce:20, type:'normal', ignoreImmune:true }, expireExplode:true };
      const gap = 3 / ab.rockets;
      for (let i = 0; i < ab.rockets; i++) G.timers.push({ t: i * gap, fn: () => {
        if (G.towers.indexOf(t) < 0) return;
        let best = null, bs = -Infinity;
        for (const e of G.enemies){ if (e.dead || !onScreen(e)) continue; const sc = e.tier * 1e6 + Math.min(e.hp, 9e5) + Math.random() * 4e5; if (sc > bs){ bs = sc; best = e; } }
        if (!best) return;
        pushProj(t.x, t.y, Math.atan2(best.y - t.y, best.x - t.x) + rand(-1.3, 1.3), spec.speed, 3, spec, t, best);
      } });
      if (G.vis) G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1:120, t:0, life:0.6, c:'#ffd166', w:5 });
      Hooks.sfx('whoosh');
      return true;
    }
    case 'tornado': {
      const R = Math.max(220, t.s.range * 2.6);
      let any = false;
      for (const e of G.enemies){
        if (e.dead || Math.hypot(e.x - t.x, e.y - t.y) > R) continue;
        any = true;
        damage(e, ab.dmg, 'normal', t, { ignoreImmune:true });
        if (e.dead) continue;
        const push = e.boss ? 0 : e.big ? ab.bigPush : ab.push;
        if (push) knockE(e, push);
        if (!e.big) stunE(e, 0.6);
      }
      if (G.vis) G.tornados.push({ x: t.x, y: t.y, t: 0, life: 1.4, r: R });
      return any || true;
    }
    case 'vat': {
      const R = t.s.range * 1.4;
      for (const e of G.enemies){
        if (e.dead || Math.hypot(e.x - t.x, e.y - t.y) > R) continue;
        if (e.big) damage(e, ab.bigDmg, 'normal', t, { ignoreImmune:true });
        else { damage(e, ab.dmg, 'normal', t, { ignoreImmune:true }); if (!e.dead) stunE(e, ab.stun); }
      }
      if (G.vis){ G.fx.push({ k:'vat', x:t.x, y:t.y, r:R, t:0, life:0.8 }); G.shake = 0.3; }
      return true;
    }
    case 'freeze': {
      for (const e of G.enemies){
        if (e.dead) continue;
        if (e.immune && e.immune.indexOf('cold') >= 0 && !ab.ignoreImmune) continue;
        const k = perk('icebox') ? 1.15 : 1;
        e.freezeT = Math.max(e.freezeT, (e.big ? ab.bigDur * (e.boss ? 0.5 : 1) : ab.dur) * k);
      }
      if (G.vis) G.fx.push({ k:'flash', c:'rgba(191,233,255,0.45)', t:0, life:0.9 });
      Hooks.sfx('freeze');
      return true;
    }
    case 'rinse': {
      for (const e of G.enemies){
        if (e.dead || !onScreen(e)) continue;
        e.mold = false;
        if (!e.boss){ stripArmor(e); knockE(e, e.big ? ab.bigPush : ab.push); }
        if (!e.big) stunE(e, 0.6);
      }
      if (G.vis){ G.fx.push({ k:'rinse', t:0, life:1.1 }); G.shake = 0.25; }
      Hooks.sfx('splash');
      return true;
    }
    case 'pastarain': {
      const src = (t.s.atk.mines && t.s.atk.mines.mine) ? t.s.atk.mines : t.s.atk.main;
      const spec = Object.assign({}, src, { mine: (src && src.mine) || { r:46, dmg:40, pierce:22, type:'blast' } });
      const pts = trailPoints();
      if (!pts.length) return false;
      for (let i = 0; i < ab.count; i++){
        const pt = pts[Math.floor(Math.random() * pts.length)];
        G.timers.push({ t: 0.04 * i, fn: () => addTrap(t, spec, pt, true, { rain:true, life:30, fly:0.45, x0: pt.x, y0: pt.y - 240 }) });
      }
      Hooks.sfx('squish');
      return true;
    }
    case 'galley': {
      /* hook the toughest vehicles and haul them off; bosses only lose a share of their health */
      const vs = G.enemies.filter(e => !e.dead && e.big && !e.boss && e.tier <= (ab.maxTier || 10) && onScreen(e) && e.burrowT <= 0)
        .sort((a, b) => b.tier - a.tier || b.hp - a.hp).slice(0, ab.hooks || 1);
      const bosses = G.enemies.filter(e => !e.dead && e.boss && onScreen(e) && e.burrowT <= 0).slice(0, Math.max(0, (ab.hooks || 1) - vs.length));
      if (!vs.length && !bosses.length) return false;
      for (const e of vs.concat(bosses)){
        e.holdT = Math.max(e.holdT, 0.6);
        if (G.vis) G.fx.push({ k:'hook', x1: t.x, y1: t.y, x2: e.x, y2: e.y, e, t:0, life:0.6 });
        G.timers.push({ t: 0.55, fn: () => {
          if (e.dead) return;
          if (e.boss) damage(e, e.maxHp * (ab.bossPct || 0.1), 'normal', t, { ignoreImmune:true });
          else { damage(e, e.hp + 1, 'normal', t, { ignoreImmune:true }); if (!e.dead) kill(e, t); }
          if (G.vis){ G.fx.push({ k:'boom', x:e.x, y:e.y, r:e.r * 1.4, t:0, life:0.4, c:'#c98a45' }); G.shake = Math.max(G.shake, 0.2); }
        } });
      }
      Hooks.sfx('hook');
      return true;
    }
    case 'mustard': {
      const tg = acquireBig({ x:t.x, y:t.y, s:{ camo:true, allTypes:true } }, 9999, null);
      if (!tg) return false;
      const spec = { kind:'proj', dmg:0, pierce:1, speed:640, size:14, scale:2.2, type:'normal', sprite:'mustard', homing:true, explode:{ r:60, dmg:60, pierce:40, type:'normal', bonusBig: ab.dmg, ignoreImmune:true } };
      pushProj(t.x, t.y, Math.atan2(tg.y - t.y, tg.x - t.x), spec.speed, 5, spec, t, tg);
      Hooks.sfx('whoosh');
      return true;
    }
    case 'chinook': {
      const x = clamp((t.fx != null ? t.fx : t.x) + rand(-40, 40), 30, W - 30), y = clamp((t.fy != null ? t.fy : t.y) + rand(-40, 40), 40, H - 30);
      addCash(ab.cash);
      t.cashGen += ab.cash;
      if (!G.attract) G.lives += ab.lives;
      G.xp[t.type] = (G.xp[t.type] || 0) + ab.cash * 0.5 * G.xpMult;
      if (G.vis){ G.fx.push({ k:'crate', x, y, t:0, life:1.3, v: ab.cash }); fxText(x, y - 44, '+' + ab.lives + ' lives', '#9df29a', 1.3, 15); }
      Hooks.sfx('cash');
      return true;
    }
    case 'tactical': {
      /* a commando lands beside the trail near the front of the pack and fires for a while */
      let lead = null, bs = -Infinity;
      for (const e of G.enemies){ if (e.dead || !onScreen(e)) continue; const sc = score(e, t, 'first'); if (sc > bs){ bs = sc; lead = e; } }
      if (!lead) return false;
      let spot = null;
      const sd = Math.random() < 0.5 ? -1 : 1;
      for (const back of [-60, -100, -30, -150, 0]){ const q = pathPointAhead(lead, back); spot = besideTrail(q.x, q.y, q.ang, sd); if (spot.ok) break; }
      const cx = spot.x, cy = spot.y;
      const f = { k:'commando', x: cx, y: cy, t:0, life: ab.dur + 0.4, ang: Math.atan2(lead.y - cy, lead.x - cx), shot: -1 };
      if (G.vis) G.fx.push(f);
      const spec = { dmg: ab.dmg, type:'normal', ignoreImmune:true, bonusBig: ab.dmg };
      const shots = Math.round(ab.dur / ab.rate), me = { x: cx, y: cy, s:{ camo:true, allTypes:true } };
      for (let i = 0; i < shots; i++) G.timers.push({ t: 0.4 + i * ab.rate, soft:true, fn: () => {
        const e = acquire(me, ab.r, null, 'close');
        if (!e) return;
        applyHit(e, spec, t);
        f.ang = Math.atan2(e.y - cy, e.x - cx); f.shot = G.time;
        if (G.vis && i % 2 === 0) G.fx.push({ k:'tracer', x1: cx + Math.cos(f.ang) * 10, y1: cy + Math.sin(f.ang) * 10, x2: e.x, y2: e.y, t:0, life:0.1, c:'#fff3c4' });
        if (i % 3 === 0) Hooks.sfx('cork');
      } });
      Hooks.sfx('whoosh');
      return true;
    }
    case 'zest': case 'tsar': {
      const list = G.enemies.filter(e => !e.dead && onScreen(e));
      if (!list.length) return false;
      for (const e of list){
        if (e.dead) continue;
        damage(e, e.big ? ab.big : ab.dmg, 'normal', t, { ignoreImmune:true });
        if (!e.dead && ab.stun) stunE(e, ab.stun);
      }
      if (G.vis){
        const x = t.fx != null ? t.fx : t.x, y = t.fy != null ? t.fy : t.y;
        G.fx.push({ k:'flash', c: ab.id === 'tsar' ? 'rgba(255,240,200,0.75)' : 'rgba(255,214,120,0.5)', t:0, life: ab.id === 'tsar' ? 1.1 : 0.6 });
        G.fx.push({ k:'ring', x, y, r0:20, r1: ab.id === 'tsar' ? 900 : 600, t:0, life:0.8, c: ab.id === 'tsar' ? '#ff6fb5' : '#ffd166', w:8 });
        G.fx.push({ k:'boom', x, y, r: ab.id === 'tsar' ? 160 : 110, t:0, life:0.7, c: ab.id === 'tsar' ? '#ff9ad0' : '#ffc46b' });
        G.shake = ab.id === 'tsar' ? 0.8 : 0.5;
      }
      Hooks.sfx('boom');
      return true;
    }
    case 'supply': {
      const x = clamp(t.x + rand(-60, 60), 30, W - 30), y = clamp(t.y + rand(-50, 50), 30, H - 30);
      addCash(ab.cash);
      t.cashGen += ab.cash;
      G.xp[t.type] = (G.xp[t.type] || 0) + ab.cash * 0.5 * G.xpMult;
      if (G.vis){ G.fx.push({ k:'crate', x, y, t:0, life:1.3, v: ab.cash }); }
      Hooks.sfx('cash');
      return true;
    }
  }
  { const r = runMoreAbility(t, ab); if (r != null) return r; }
  { const r = runParaAbility(t, ab); if (r != null) return r; }
  if (ab.custom && typeof runCustomAbility === 'function') return runCustomAbility(t, ab);
  if (t.hero && TOWERS[t.type].admin){ const r = adminAbility(t, ab); if (r != null) return r; }
  if (t.hero){ const r = runHeroAbility(t, ab); if (r != null) return r; }
  return false;
}

/* ---------------------------------------------------------------------
   Bread
   --------------------------------------------------------------------- */
function breadValue(t){
  const b = t.s.bread;
  let mult = 1;
  for (const o of G.towers) if (o.type === 'bread' && o.s.bread && o.s.bread.valueBuff) mult = Math.max(mult, 1 + o.s.bread.valueBuff);
  return Math.round(b.value * mult);
}
function bakeLoaf(t){
  const b = t.s.bread;
  if (b.vault && t.sys){ vaultLoaf(t); return; }
  const v = breadValue(t);
  if (b.bank){
    t.bank = Math.min(b.bank.cap, (t.bank || 0) + v);
    t.cashGen += v;
    G.xp.bread = (G.xp.bread || 0) + v * G.xpMult;
    if (G.vis) fxText(t.x, t.y - 22, '+$' + v, '#ffd166', 0.8, 12);
    return;
  }
  const a = rand(0, TAU), dist = rand(22, 46);
  const loaf = { x: clamp(t.x + Math.cos(a) * dist, 14, W - 14), y: clamp(t.y + Math.sin(a) * dist, 14, H - 14), sx: t.x, sy: t.y, t: 0, life: 15, v, tw: t, golden: !!b.golden };
  if (b.auto){ collectLoaf(loaf, true); return; }
  G.loaves.push(loaf);
}
function collectLoaf(L, auto){
  L.done = true;
  addCash(L.v);
  L.tw.cashGen += L.v;
  G.xp.bread = (G.xp.bread || 0) + L.v * G.xpMult;
  if (G.vis){ G.fx.push({ k:'loafFly', x: L.x, y: L.y, t:0, life:0.45, golden: L.golden }); fxText(L.x, L.y - 12, '+$' + L.v, '#ffd166', 0.7, 13); }
  Hooks.sfx('cash');
}
function collectLoavesAt(x, y, r){
  let n = 0;
  for (const L of G.loaves) if (!L.done && L.t > 0.35 && Math.hypot(L.x - x, L.y - y) < r){ collectLoaf(L); n++; }
  if (n) G.loaves = G.loaves.filter(L => !L.done);
  return n;
}
function breadTick(dt){
  for (const t of G.towers){
    if (!t.s.bread || t.loafQ <= 0) continue;
    t.loafT -= dt;
    if (t.loafT <= 0){ t.loafQ--; t.loafT = t.loafGap; bakeLoaf(t); }
  }
}

/* ---------------------------------------------------------------------
   Rounds
   --------------------------------------------------------------------- */
function promote(type, i){
  const p = PROMOTE[type];
  if (!p) return type;
  if (p === '*t3') return T3_POOL[i % T3_POOL.length];
  return p;
}
/* the round's groups with Mastery Mode's promotions and the game mode's changes */
function roundGroupsFor(n){
  const groups = newPestGroups(n, roundGroups(n));
  if (G.mm) groups.forEach((g, i) => { g.type = promote(g.type, i); });
  return evRoundGroups(n, modeGroups(n, groups));
}
function startRound(){
  if (!G.active || G.roundActive || G.over || G.won && !G.freeplay) return false;
  if (typeof buildLogTick === 'function') buildLogTick(G.round);
  G.lastSnap = serializeGame();
  storeGame(G.lastSnap);
  const groups = roundGroupsFor(G.round);
  G.spawn = groups.map(g => Object.assign(g, { spawned: 0 }));
  G.roundActive = true;
  G.roundTime = 0;
  G.goldAt = null;
  if (!G.attract && Math.random() < goldenChance(G.round)){
    const last = Math.max(...G.spawn.map(g => g.start + g.spacing * Math.max(0, g.count - 1)), 4);
    G.goldAt = last * (0.25 + Math.random() * 0.5);
  }
  for (const t of G.towers) if (t.s.bread){ t.loafQ = t.s.bread.loaves; t.loafGap = clamp(14 / Math.max(1, t.loafQ), 0.5, 3); t.loafT = 0.8; }
  paraRound('start');
  Hooks.sfx('start');
  Hooks.roundStart(G.round);
  return true;
}
function updateSpawner(dt){
  G.roundTime += dt;
  if (G.goldAt != null && G.roundTime >= G.goldAt){ G.goldAt = null; spawnGolden(); }
  for (const g of G.spawn){
    while (g.spawned < g.count && G.roundTime >= g.start + g.spawned * g.spacing){
      const m = g.mods;
      const big = ENEMIES[g.type].big;
      spawnEnemy(g.type, { camo: !big && m.includes('c'), mold: !big && m.includes('m'), armored: m.includes('a'), boss: m.includes('B'), hpMul: g.hpMul });
      g.spawned++;
    }
  }
}
function spawnDone(){ return G.spawn && G.spawn.every(g => g.spawned >= g.count); }
function endRound(){
  G.roundActive = false;
  const n = G.round;
  for (const t of G.towers) if (t.s.bread) while (t.loafQ > 0){ t.loafQ--; bakeLoaf(t); }
  for (const L of G.loaves) if (!L.done) collectLoaf(L, true);
  G.loaves = [];
  let bonus = Math.round((100 + n + (perk('tips') ? 25 : 0)) * modeCashMul());
  let support = 0;
  const noInc = modeNoIncome();
  const breadCount = G.towers.filter(t => t.type === 'bread').length;
  for (const t of G.towers){
    let inc = t.s.income || 0;
    if (t.s.bread && t.s.bread.network) inc += t.s.bread.network * breadCount;
    inc = Math.round(inc * modeCashMul());
    if (t.s.bread && t.s.bread.bank && !noInc){
      const bk = t.s.bread.bank;
      const before = t.bank || 0;
      t.bank = Math.min(bk.cap, before * (1 + bk.rate) + (bk.bonus || 0));
      t.cashGen += t.bank - before;
      G.xp.bread = (G.xp.bread || 0) + (t.bank - before) * G.xpMult;
    }
    if (inc){ support += inc; t.cashGen += inc; G.xp[t.type] = (G.xp[t.type] || 0) + inc * G.xpMult; }
    if (t.type === 'espresso') G.xp.espresso = (G.xp.espresso || 0) + (20 + n * 3) * G.xpMult;
  }
  addCash(bonus + support);
  paraRound('end');
  moreRoundEnd();
  if (!G.attract) for (const t of G.towers.slice()) if (t.paragon) paragonGrow(t);
  for (const t of G.towers) for (const k in t.boost) delete t.boost[k];
  G.glob.rush = null; G.glob.opening = null; G.glob.chill = null; G.glob.night = null;
  if (!(G.M && G.M.sandbox)){
    Profile.stats.rounds++;
    Profile.stats.best[G.mapId] = Math.max(Profile.stats.best[G.mapId] || 0, n);
  }
  const evGot = evRoundCleared(n);
  if (evGot) Hooks.eventCleared(evGot);
  metaRoundEnd(n);
  heroRoundEnd(n);
  /* appliances that bring in lives (a proofing drawer's bounty) */
  if (!G.attract && G.diff !== 'michelin') for (const t of G.towers) if (!t.hero && t.s.lifeRound){ G.lives += t.s.lifeRound; G.lastRoundLives = (G.lastRoundLives || 0) + t.s.lifeRound; }
  commitXP();
  if (typeof histRoundEnd === 'function') histRoundEnd(n);
  G.round++;
  G.lastSnap = serializeGame();
  storeGame(G.lastSnap);
  Hooks.roundEnd(n, bonus, support);
  if (n === G.win && !G.freeplay && !G.won) victory();
}
function commitXP(){
  if (G.attract || (G.M && G.M.sandbox)){ G.xp = {}; return; }
  let changed = false;
  for (const type in G.xp){
    const gain = G.xp[type];
    if (!(gain > 0) || (TOWERS[type] && TOWERS[type].hero)) continue;
    G.xpGame[type] = (G.xpGame[type] || 0) + gain;
    const before = rankOf(Profile.mastery[type] || 0);
    Profile.mastery[type] = Math.round((Profile.mastery[type] || 0) + gain);
    const after = rankOf(Profile.mastery[type]);
    if (after > before){ changed = true; Hooks.rankUp(type, after); }
  }
  Profile.stats.cooked += G.stats.kills - (G.stats.committedKills || 0);
  G.stats.committedKills = G.stats.kills;
  G.xp = {};
  if (changed && G.active) refreshTowers();
  saveProfile();
}
function victory(){
  G.won = true;
  if (typeof buildLogTick === 'function') buildLogTick(G.round);
  let fresh = false, freshMM = false;
  if (!G.ch && !G.ev && !G.adminUsed && !isCustomMap(G.mapId)){
    const m = Profile.medals[G.mapId] = Profile.medals[G.mapId] || {}, key = medalKey(G.diff, G.mode);
    fresh = !m[key];
    m[key] = 1;
    if (G.mm){ freshMM = !m.mastery; m.mastery = 1; }
  }
  Profile.stats.wins++;
  const reward = metaVictory(fresh, freshMM);
  saveProfile();
  storeGame(serializeGame());
  Hooks.sfx('victory');
  Hooks.victory(fresh, freshMM, reward);
}
function continueFreeplay(){ G.freeplay = true; storeGame(serializeGame()); }
function gameOver(){
  if (G.over) return;
  G.over = true;
  if (G.ch && G.ch.ex && typeof exDefeat === 'function') exDefeat();
  commitXP();
  if (typeof buildLogTick === 'function') buildLogTick(G.round);
  checkAchievements();
  Hooks.sfx('lose');
  Hooks.gameOver();
}
function retryRound(){
  const snap = G.lastSnap;
  if (!snap || modeNoRetry()) return false;
  const sp = G.speed;
  loadGame(snap);
  if (G.ev) G.ev.retries++;
  G.speed = sp;
  storeGame(snap);
  return true;
}

/* ---------------------------------------------------------------------
   Simulation step
   --------------------------------------------------------------------- */
/* ---------------------------------------------------------------------
   Flight: copters and saucers take off from their pads. Their attacks
   fire from where the aircraft is (t.fx, t.fy).
   --------------------------------------------------------------------- */
function flyModeOk(t, id){
  const m = (FLY_MODES[TOWERS[t.type].flyer] || []).find(x => x.id === id);
  return !!m && (!m.need || !!(t.s && t.s[m.need]));
}
function updateFlight(t, dt){
  const kind = TOWERS[t.type].flyer;
  if (t.fx == null){ t.fx = t.x; t.fy = t.y; t.fvx = 0; t.fvy = 0; t.fth = 0; }
  if (!flyModeOk(t, t.flyMode)) t.flyMode = FLY_MODES[kind][0].id;
  if (kind === 'saucer') flySaucer(t, dt); else flyCopter(t, dt);
}
function copterGoal(t){
  const m = t.flyMode;
  if (m === 'hover') return t;
  if (m === 'follow' && G.vis && !G.attract && G.aimAt) return G.aimAt;
  /* patrol (and follow with no pointer): go after the pest it would target near its pad */
  const e = acquire(t, m === 'chase' ? 9999 : Math.max(230, t.s.range * 1.35), null, t.tg);
  return e || t;
}
function flyCopter(t, dt){
  const goal = copterGoal(t);
  const sp = 220 * (t.s.flySpeed || 1);
  const dx = goal.x - t.fx, dy = goal.y - t.fy, d = Math.hypot(dx, dy);
  const want = d < 3 ? 0 : Math.min(sp, d * 3);
  const vx = d > 0 ? dx / d * want : 0, vy = d > 0 ? dy / d * want : 0;
  const k = Math.min(1, dt * 5);
  t.fvx += (vx - t.fvx) * k; t.fvy += (vy - t.fvy) * k;
  t.fx = clamp(t.fx + t.fvx * dt, 14, W - 14); t.fy = clamp(t.fy + t.fvy * dt, 14, H - 14);
  /* when not shooting, the nose turns to where it is flying */
  if (t.fireAnim <= 0 && t.fvx * t.fvx + t.fvy * t.fvy > 900){
    let da = Math.atan2(t.fvy, t.fvx) - t.aim; da = Math.atan2(Math.sin(da), Math.cos(da));
    t.aim += da * Math.min(1, dt * 4);
  }
}
/* saucer flight paths, as a point for an angle along the loop */
const SAUCER_PATHS = {
  circle: (t, a) => [t.x + Math.cos(a) * 120, t.y + Math.sin(a) * 120],
  tight:  (t, a) => [t.x + Math.cos(a) * 60, t.y + Math.sin(a) * 60],
  eight:  (t, a) => [t.x + Math.sin(a) * 170, t.y + Math.sin(a) * Math.cos(a) * 150],
  wide:   (t, a) => [W / 2 + Math.cos(a) * 420, H / 2 + Math.sin(a) * 230],
};
function saucerPoint(t, a, mode){ const [x, y] = (SAUCER_PATHS[mode || t.flyMode] || SAUCER_PATHS.circle)(t, a); return [clamp(x, 18, W - 18), clamp(y, 18, H - 18)]; }
function flySaucer(t, dt){
  const sp = 200 * (t.s.flySpeed || 1);
  const [x0, y0] = saucerPoint(t, t.fth), [x1, y1] = saucerPoint(t, t.fth + 0.01);
  const dl = Math.hypot(x1 - x0, y1 - y0) / 0.01;
  t.fth = (t.fth + (dl > 1e-3 ? Math.min(0.5, sp * dt / dl) : 0.5)) % (TAU * 64);
  const [x, y] = saucerPoint(t, t.fth);
  /* glide back onto the loop after the path changes */
  const dx = x - t.fx, dy = y - t.fy, d = Math.hypot(dx, dy), step = sp * 1.6 * dt;
  if (d > step){ t.fx += dx / d * step; t.fy += dy / d * step; } else { t.fx = x; t.fy = y; }
  t.fvx = dx / Math.max(dt, 1e-3); t.fvy = dy / Math.max(dt, 1e-3);
}
/* where escort drone i of attack a is, relative to its appliance */
function dronePos(t, a, i, time){
  const n = a.count || 1, R = a.orbit || 50;
  const ang = time * (a.orbitSpeed || 1.5) * (a.droneLook === 'mini' ? 1.3 : 1) + i / n * TAU + (t.id || 0) * 0.7 + (a.phase || 0);
  return [Math.cos(ang) * R, Math.sin(ang) * R];
}
function towerSpeed(t){
  let m = 1;
  if (G.glob.rush) m *= G.glob.rush.mult;
  if (G.glob.boost) m *= G.glob.boost.mult;
  if (G.glob.opening) m *= G.glob.opening.mult;
  if (G.glob.sabotage && t.type === 'mandoline') m *= G.glob.sabotage.boost || 1;
  if (t.ub) m *= Math.pow(1 / 0.96, t.ub);   // Ultraboost stacks, for good
  if (G.grid && G.grid.mul > 1 && t !== G.grid.t && Math.hypot(t.x - G.grid.t.x, t.y - G.grid.t.y) <= G.grid.r + t.size) m *= G.grid.mul;   // the Automat's power grid
  if (t.mixSp) m *= t.mixSp;   // a stand mixer's temper
  if (t.spinSp) m *= t.spinSp;   // riding a carousel as it winds up
  for (const k in t.boost) m *= t.boost[k].mult;
  return m;
}
function updateTowers(dt){
  for (const t of G.towers){
    if (t.sys) paraTick(t, dt);
    const s = t.s;
    if (t.fireAnim > 0) t.fireAnim -= dt;
    if (t.fire2 > 0) t.fire2 -= dt;
    for (const k in t.boost){ t.boost[k].t -= dt; if (t.boost[k].t <= 0) delete t.boost[k]; }
    if (G.roundActive){ const en = 1 + ((t.buffs && t.buffs.energize) || 0); for (const id in t.ab) if (t.ab[id] > 0) t.ab[id] = Math.max(0, t.ab[id] - dt * en); }
    const fly = TOWERS[t.type].flyer;
    if (fly) updateFlight(t, dt);
    if (t.stunT > 0){ t.stunT -= dt; continue; }
    if (s.necro) necroTick(t, dt);
    const sp = towerSpeed(t), hold = t.sys && t.sys.on.hold;
    /* aircraft attack from where they are flying */
    const px = t.x, py = t.y;
    if (fly){ t.x = t.fx; t.y = t.fy; }
    try {
      for (const id in s.atk){
        const a = s.atk[id];
        if (a.needBoost && !t.boost[a.needBoost]) continue;   // summoned by an ability, gone when it ends
        if (a.needTb && !tbOn(t, a.needTb)) continue;          // the same, for timed buffs (a sauce monster's beam)
        if (hold || (a.need && !(t.sys && t.sys.on[a.need]))) continue;   // switched off by its paragon system
        const asp = t.atkSpeed ? (t.atkSpeed[id] || 1) * (t.atkSpeed.all || 1) : 1;
        let cd = (t.cd[id] || 0) - dt * sp * asp;
        if (cd <= 0){
          let guard = 0;
          while (cd <= 0 && guard++ < 4){
            if (fire(t, a, id)){ cd += a.dyn ? a.rate * dynRate(t, a) : a.rate; if (t.sys) paraFired(t, a); } else { cd = 0; break; }
          }
        }
        t.cd[id] = cd;
      }
      if (s.aura) auraTick(t, s.aura, dt);
      if (s.barrier) barrierTick(t, s.barrier, dt);
    } finally { if (fly){ t.x = px; t.y = py; } }
  }
}
function auraTick(t, au, dt){
  t.auraAcc += dt;
  if (au.dmg) t.auraDmgAcc += dt;
  if (t.auraAcc < 0.1) return;
  t.auraAcc = 0;
  const list = query(t.x, t.y, t.s.range, Q4);
  const doDmg = au.dmg && t.auraDmgAcc >= au.tick;
  if (doDmg) t.auraDmgAcc -= au.tick;
  let n = 0;
  for (const e of list){
    if (e.dead) continue;
    const cold = au.type === 'cold';
    const immune = cold && e.immune && e.immune.indexOf('cold') >= 0 && !t.s.allTypes;
    if (!immune){
      if (!e.big) slowE(e, au.slow, 0.25);
      else if (au.bigSlow < 1) slowE(e, au.bigSlow, 0.25);
    }
    if (doDmg && n < 80){ damage(e, au.dmg, au.type || 'cold', t, au); n++; }
  }
}
function updateLobs(dt){
  for (const L of G.lobs){
    L.t += dt;
    if (L.t >= L.dur){
      L.done = true;
      const a = L.spec;
      if (a.impact) explodeAt(L.x1, L.y1, a.impact, L.tw, a);
      landZone(L.x1, L.y1, a, L.tw);
      if (L.cloud && a.cloud) G.clouds.push({ x: L.x1, y: L.y1, r: a.cloud.r, t: 0, dur: a.cloud.dur, spec: a.cloud, tw: L.tw, acc: 0, seed: Math.random() * 100 });
      else if (a.puddle){
        addPuddle(L.x1, L.y1, a.puddle, L.tw);
        if (a.puddle.splits) for (let i = 0; i < a.puddle.splits; i++){
          const ang = rand(0, TAU), d = a.puddle.r * rand(1.1, 1.6);
          addPuddle(clamp(L.x1 + Math.cos(ang) * d, 5, W - 5), clamp(L.y1 + Math.sin(ang) * d, 5, H - 5), a.puddle, L.tw, a.puddle.r * 0.65);
        }
        if (G.vis) for (let i = 0; i < 5; i++){ const an = rand(0, TAU), v = rand(30, 90); part(L.x1, L.y1, Math.cos(an) * v, Math.sin(an) * v, 0.3, '#d9a441', 2.5, 'dot'); }
      }
    }
  }
  G.lobs = G.lobs.filter(L => !L.done);
}
/* a bouncing projectile turns toward the nearest pest it hasn't hit yet */
function bounceProj(p, from){
  let best = null, bd = 180 * 180;
  for (const o of query(from.x, from.y, 180, Q3)){
    if (o.dead || o === from || hitBefore(p, o) || !onScreen(o) || (o.camo && !p.tw.s.camo)) continue;
    const d = (o.x - from.x) ** 2 + (o.y - from.y) ** 2;
    if (d < bd){ bd = d; best = o; }
  }
  if (!best) return;
  p.bounced = (p.bounced || 0) + 1;
  p.pierce++;
  p.ang = Math.atan2(best.y - p.y, best.x - p.x);
  p.vx = Math.cos(p.ang) * p.spd; p.vy = Math.sin(p.ang) * p.spd;
  p.life = Math.max(p.life, 0.6);
  p.curve = 0;
  if (p.spec.homing) p.target = best;
}
/* puddles and smoke left where a custom shell lands */
function landZone(x, y, sp, tw){
  if (sp.zone) addPuddle(x, y, sp.zone, tw);
  if (sp.smoke) G.clouds.push({ x, y, r: sp.smoke.r, t: 0, dur: sp.smoke.dur, spec: sp.smoke, tw, acc: 0, seed: Math.random() * 100 });
}
function hitBefore(p, e){
  if (p.hit.has(e.id)) return true;
  if (e.lineage) for (let i = 0; i < e.lineage.length; i++) if (p.hit.has(e.lineage[i])) return true;
  return false;
}
function updateProjs(dt){
  for (const p of G.projs){
    if (p.done) continue;
    p.life -= dt;
    const sp = p.spec;
    if (sp.spin || sp.sprite === 'shard' || sp.sprite === 'cutter') p.spin += dt * 18;
    if (sp.homing){
      if (!p.target || p.target.dead){
        let best = null, bs = -Infinity;
        for (const e of G.enemies){
          if (e.dead || !onScreen(e)) continue;
          const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
          if (!sp.targetBig && d > 360 * 360) continue;
          const sc = sp.targetBig ? (e.big ? 1e12 : 0) + e.hp - d * 1e-6 : -d;
          if (sc > bs){ bs = sc; best = e; }
        }
        p.target = best;
      }
      if (p.target){
        const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        let da = want - p.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
        const turn = 9 * dt;
        p.ang += clamp(da, -turn, turn);
        p.vx = Math.cos(p.ang) * p.spd; p.vy = Math.sin(p.ang) * p.spd;
      }
    } else if (p.curve){
      p.ang += p.curve * dt;
      p.vx = Math.cos(p.ang) * p.spd; p.vy = Math.sin(p.ang) * p.spd;
    }
    /* a workshop motion (wave, orbit, brake...) and an object's trail */
    const moved = sp.motion ? motionTick(p, sp, dt) : false;
    if (!moved){ p.x += p.vx * dt; p.y += p.vy * dt; }
    if (sp.obj && G.vis && sp.obj.trail !== 'none' && !lowFx()) objectTrail(sp.obj, p, dt, part);
    if (sp.grow) p.edge = Math.min(sp.grow.max, (p.edge || 0) + sp.grow.rate * dt);   // a riptide fork hits harder the farther it flies
    if (sp.trail){ p.trailAcc = (p.trailAcc || 0) + dt; if (p.trailAcc >= sp.trail.every){ p.trailAcc -= sp.trail.every; explodeAt(p.x, p.y, sp.trail, p.tw, null); } }
    if (sp.wall && (p.wb || 0) < sp.wall && (p.x < 3 || p.x > W - 3 || p.y < 3 || p.y > H - 3)){
      /* off the kitchen wall: it can cut the same pests again, a little harder */
      p.wb = (p.wb || 0) + 1;
      if (p.x < 3 || p.x > W - 3){ p.vx = -p.vx; p.x = clamp(p.x, 3, W - 3); }
      if (p.y < 3 || p.y > H - 3){ p.vy = -p.vy; p.y = clamp(p.y, 3, H - 3); }
      p.ang = Math.atan2(p.vy, p.vx); p.curve = 0; p.hit.clear(); p.edge = (p.edge || 0) + (sp.wallDmg || 0);
      p.life = Math.max(p.life, 0.7);
      if (p.tw && p.tw.sys && p.tw.sys.bounces != null) p.tw.sys.bounces++;
      if (G.vis && !lowFx()) G.fx.push({ k:'pop', x: p.x, y: p.y, t:0, life:0.2 });
    }
    const list = query(p.x, p.y, p.size + 3, Q1);
    for (let i = 0; i < list.length; i++){
      const e = list[i];
      if (e.dead || hitBefore(p, e)) continue;
      if (sp.only && p.target && e !== p.target) continue;
      if (e.def.dodge && !sp.explode && pestDodge(e, p)) continue;   // a silverfish darts aside   // a seeking shot passes everything but its mark
      p.hitSomething = true;
      if (sp.explode){ explodeAt(p.x, p.y, sp.explode, p.tw, sp); landZone(p.x, p.y, sp, p.tw); p.done = true; p.exploded = true; break; }
      p.hit.add(e.id);
      applyHit(e, sp, p.tw);
      if (p.edge && !e.dead) damage(e, p.edge, 'normal', p.tw, null);
      if (sp.burst) explodeAt(e.x, e.y, sp.burst, p.tw, null);
      if (sp.zap) chainFrom(e, sp.zap, p.tw, []);
      if (sp.bounce && (p.bounced || 0) < sp.bounce && p.pierce > 0) bounceProj(p, e);
      if (--p.pierce <= 0){ p.done = true; break; }
      if (sp.halfSplit && !p.halfDone && p.pierce <= p.pierce0 / 2){
        p.halfDone = true;
        const hs = sp.halfSplit;
        for (let i = 0; i < hs.count; i++) pushProj(p.x, p.y, rand(0, TAU), hs.speed, hs.life, hs, p.tw);
      }
    }
    if (!p.done && (p.life <= 0 || (!p.orbR && (p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60)))){ p.done = true; p.expired = true; }
    if (p.done){
      if (p.expired && sp.explode && sp.expireExplode && p.x > 0 && p.x < W && p.y > 0 && p.y < H){ explodeAt(p.x, p.y, sp.explode, p.tw, sp); landZone(p.x, p.y, sp, p.tw); }
      else if (!sp.explode && sp.frag && p.hitSomething) spawnFrags(p.x, p.y, sp.frag, p.tw);
      if (sp.split) for (let i = 0; i < sp.split.count; i++) pushProj(p.x, p.y, rand(0, TAU), sp.split.speed, sp.split.life, sp.split, p.tw);
    }
  }
  G.projs = G.projs.filter(p => !p.done);
}
function updateZones(dt){
  for (const pd of G.puddles){
    pd.t += dt; pd.acc += dt;
    if (pd.acc < 0.1) continue;
    pd.acc = 0;
    const p = pd.spec;
    let boil = false, simmer = false;
    if (p.boil){ pd.bacc = (pd.bacc || 0) + 0.1; if (pd.bacc >= p.boil.tick){ pd.bacc -= p.boil.tick; boil = true; } }
    if (p.sauce){ pd.sacc = (pd.sacc || 0) + 0.1; if (pd.sacc >= p.sauce.tick - 1e-9){ pd.sacc -= p.sauce.tick; simmer = true; } }
    for (const e of query(pd.x, pd.y, pd.r, Q4)){
      if (boil && !e.dead) damage(e, p.boil.dmg, 'heat', pd.tw, p.boil);
      if (simmer && !e.dead) damage(e, p.sauce.dmg, 'normal', pd.tw, p.sauce);
      if (e.dead) continue;
      if (!e.big) slowE(e, p.slow, 0.25);
      else if (p.bigSlow < 1) slowE(e, p.bigSlow, 0.25);
      if (p.burn) addBurn(e, p.burn, pd.tw);
      if (p.soak) e.soakT = Math.max(e.soakT, 3);
      if (p.decamo) e.camo = false;
      if (p.demold) e.mold = false;
      if (p.batter){
        const m = e.big ? (p.batter.bigMult || 1) : p.batter.mult;
        if (m < 1){ e.batterMult = e.batterT > 0 ? Math.min(e.batterMult, m) : m; e.batterT = Math.max(e.batterT, p.batter.dur); }
      }
    }
  }
  G.puddles = G.puddles.filter(p => p.t < p.dur);
  for (const c of G.clouds){
    c.t += dt; c.acc += dt;
    if (c.acc < 0.1) continue;
    c.acc = 0;
    const s = c.spec;
    for (const e of query(c.x, c.y, c.r, Q4)){
      if (e.dead) continue;
      if (s.decamo) e.camo = false;
      if (s.slow && !e.big) slowE(e, s.slow, 0.25);
      if (s.vuln) setVuln(e, s.vuln);
      if (s.heatMult){ e.heatMult = Math.max(e.heatMult, s.heatMult); e.smokeT = 1; }
      if (s.bigBurn && e.big) damage(e, e.maxHp * s.bigBurn * 0.1 * (e.boss ? 0.1 : 1), 'normal', c.tw, { ignoreImmune:true });
    }
  }
  G.clouds = G.clouds.filter(c => c.t < c.dur);
}
function updateWhirls(dt){
  if (!G.whirls.length) return;
  for (const w of G.whirls){
    w.t += dt;
    const step = w.speed * dt;
    w.d -= step; w.left -= step;
    if (w.d <= 0 || w.left <= 0 || w.pierce <= 0){ w.done = true; if (w.split && w.d > 0) splitUndead(w); if (w.pawn) pawnDone(w); continue; }
    const q = pathPos(G.paths[w.path], w.d, w.seg);
    w.x = q.x; w.y = q.y; w.seg = q.seg;
    const list = query(w.x, w.y, w.r, Q3);
    for (let i = 0; i < list.length; i++){
      const e = list[i];
      if (e.dead || w.hit.has(e.id)) continue;
      if (e.lineage && e.lineage.some(id => w.hit.has(id))) continue;
      w.hit.add(e.id);
      applyHit(e, w.spec, w.tw);
      if (--w.pierce <= 0) break;
    }
  }
  G.whirls = G.whirls.filter(w => !w.done);
}
function updateTraps(dt){
  if (!G.traps.length) return;
  let gone = false;
  for (const tr of G.traps){
    tr.t += dt; tr.life -= dt;
    if (tr.life <= 0){ tr.done = true; gone = true; continue; }
    if (tr.t < tr.fly) continue;
    if (tr.catch){ catchTick(tr, dt); if (tr.done) gone = true; continue; }
    const list = query(tr.x, tr.y, tr.r, Q3);
    if (!list.length) continue;
    if (tr.mine){
      for (const e of list) if (!e.dead){ tr.done = true; gone = true; explodeAt(tr.x, tr.y, tr.spec.mine, tr.tw, tr.spec); break; }
      continue;
    }
    for (let i = 0; i < list.length; i++){
      const e = list[i];
      if (e.dead) continue;
      if (e.big){
        /* vehicles roll over a nest a few times, then flatten it */
        const last = tr.bigHit.get(e.id);
        if (last != null && G.time - last < 0.2) continue;
        tr.bigHit.set(e.id, G.time);
        tr.flat = (tr.flat || 0) + 1;
      } else {
        if (tr.hit.has(e.id) || (e.lineage && e.lineage.some(id => tr.hit.has(id)))) continue;
        tr.hit.add(e.id);
      }
      applyHit(e, tr.spec, tr.tw);
      if (--tr.pierce <= 0 || tr.flat >= 3){ tr.done = true; gone = true; break; }
    }
  }
  if (gone) G.traps = G.traps.filter(tr => !tr.done);
}
function bossMinions(e, type, n, gap, o){
  for (let i = 0; i < n; i++) spawnEnemy(type, Object.assign({ path: e.path, d: Math.max(0, e.d - 30 - i * gap), lineage: [e.id], child: true }, o || {}));
}
function stinkTowers(x, y, R, dur){
  let n = 0;
  for (const t of G.towers){
    if (Math.hypot(t.x - x, t.y - y) > R + t.size) continue;
    const sd = t.paragon ? dur * 0.5 : dur; if (sd > (t.stunT || 0)){ t.stunT = sd; t.stunBy = 'stink'; } n++;
  }
  return n;
}
function bossTick(e, dt){
  const def = e.def;
  if (def.dash){
    e.dashCd -= dt;
    if (e.dashT > 0) e.dashT -= dt;
    if (e.dashCd <= 0){ e.dashT = 1.2; e.dashCd = Math.max(4, 8 - 0.4 * (e.lvl - 1)); if (G.vis) for (let i = 0; i < 8; i++) part(e.x, e.y, rand(-60, 60), rand(-60, 60), 0.5, '#c9d0d6', 5, 'smoke'); }
  }
  if (!def.boss) return;
  const L = e.lvl || 1;
  e.abT += dt;
  if (e.type === 'ratking'){
    if (e.abT >= Math.max(3, 6 - 0.3 * (L - 1))){ e.abT = 0; bossMinions(e, L >= 4 ? 'rat' : 'mouse', Math.min(10, 3 + Math.floor(L / 2)), 14); Hooks.sfx('squeak'); }
    if (!e.halfDone && e.hp < e.maxHp * 0.5){ e.halfDone = true; bossMinions(e, 'rat', Math.min(16, 3 + L), 18, { armored: L >= 6 }); Hooks.toast('The Rat King calls his guard!', 'warn'); }
  } else if (e.type === 'greatmold'){
    if (!e.burn) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.004 * (1 + 0.15 * (L - 1)) * dt);
    if (e.abT >= Math.max(2.5, 5 - 0.25 * (L - 1))){ e.abT = 0; bossMinions(e, 'spore', Math.min(14, 3 + L), 12, { camo: L >= 3 }); if (L >= 5) bossMinions(e, 'rat', 2, 20, { mold: true }); }
  } else if (e.type === 'queen'){
    if (e.shieldT > 0) e.shieldT -= dt;
    const th = L >= 3 ? [0.8, 0.6, 0.4, 0.2] : [0.66, 0.33];
    if (e.phase < th.length && e.hp < e.maxHp * th[e.phase]){
      e.phase++; e.shieldT = Math.min(5, 3 + 0.25 * (L - 1)); e.speed *= 1.15;
      bossMinions(e, 'midnight', Math.min(6, 2 + Math.floor(L / 3)), 30);
      bossMinions(e, 'roach', Math.min(16, 5 + L), 10, { camo: true });
      Hooks.toast('The Roach Queen hardens her shell!', 'warn');
    }
  } else if (e.type === 'flylord'){
    const frenzy = e.hp < e.maxHp * 0.5;
    if (frenzy && !e.halfDone){ e.halfDone = true; e.speed *= 1.35; Hooks.toast('The Fly Lord goes into a frenzy!', 'warn'); }
    if (e.abT >= Math.max(2, 5 - 0.25 * (L - 1)) * (frenzy ? 0.6 : 1)){
      e.abT = 0;
      const n = Math.min(30, 6 + 2 * (L - 1));
      for (let i = 0; i < n; i++) spawnEnemy(i % 3 ? 'housefly' : 'fruitfly', { path: e.path, d: Math.max(0, e.d - 10 - i * 5), lineage: [e.id], child: true, camo: L >= 3 && i % 2 === 0 });
      Hooks.sfx('buzz');
      if (G.vis) G.fx.push({ k:'ring', x:e.x, y:e.y, r0:e.r, r1:e.r + 40, t:0, life:0.4, c:'#c9d0d6', w:3 });
    }
  } else if (e.type === 'skunk'){
    e.sprayCd = (e.sprayCd == null ? 3 : e.sprayCd) - dt;
    if (e.sprayCd <= 0){
      e.sprayCd = Math.max(3.5, 7 - 0.35 * (L - 1));
      const R = Math.min(260, 130 + 10 * (L - 1)), dur = Math.min(5, 2.2 + 0.3 * (L - 1));
      const n = stinkTowers(e.x, e.y, R, dur);
      e.sprayT = 0.6;
      if (G.vis){ G.fx.push({ k:'stink', x:e.x, y:e.y, r:R, t:0, life:1.3 }); for (let i = 0; i < 16; i++){ const a = rand(0, TAU), v = rand(40, R * 1.2); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, 1.1, i % 2 ? 'rgba(150,200,80,0.6)' : 'rgba(190,220,110,0.55)', 9, 'smoke'); } }
      Hooks.sfx('spray');
      if (n && !e.warned){ e.warned = true; Hooks.toast('The Skunk knocked out ' + n + ' appliance' + (n === 1 ? '' : 's') + '!', 'warn'); }
    }
    if (e.sprayT > 0) e.sprayT -= dt;
  } else if (e.type === 'mole'){
    if (e.burrowT > 0){
      e.burrowT -= dt;
      if (e.burrowT <= 0){
        e.burrowT = 0; e.surfaceT = Math.max(2.2, 4.5 - 0.2 * (L - 1));
        bossMinions(e, 'mouse', Math.min(12, 1 + L), 12);
        if (G.vis){ G.fx.push({ k:'ring', x:e.x, y:e.y, r0:e.r * 0.5, r1:e.r * 1.8, t:0, life:0.5, c:'#8a5a2b', w:5 }); for (let i = 0; i < 14; i++){ const a = rand(0, TAU), v = rand(40, 160); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, 0.6, i % 2 ? '#8a5a2b' : '#5f3d1d', 4, 'dot'); } }
        Hooks.sfx('crack');
      }
    } else {
      e.surfaceT = (e.surfaceT == null ? 3.5 : e.surfaceT) - dt;
      if (e.surfaceT <= 0){
        e.burrowT = Math.min(4, 2 + 0.15 * (L - 1)) + (e.hp < e.maxHp * 0.5 ? 1 : 0);
        e.stunT = 0; e.freezeT = 0; e.slowT = 0; e.slowMult = 1; e.burn = null;
        if (e.holdT > 0){ e.holdT = 0; e.hold = null; }
        if (G.vis) for (let i = 0; i < 10; i++){ const a = rand(0, TAU), v = rand(30, 120); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, 0.5, '#7a5230', 4, 'dot'); }
      }
    }
  } else if (e.type === 'bigcheese'){
    const chunks = Math.min(9, Math.floor((1 - e.hp / e.maxHp) * 10));
    while ((e.chunks || 0) < chunks){
      e.chunks = (e.chunks || 0) + 1;
      bossMinions(e, L >= 7 ? 'basket' : 'cheese', 1 + Math.floor((L - 1) / 2), 34, { armored: L >= 4 });
      if (G.vis){ G.fx.push({ k:'boom', x:e.x, y:e.y, r:e.r, t:0, life:0.35, c:'#f2c14e' }); for (let i = 0; i < 12; i++){ const a = rand(0, TAU), v = rand(60, 180); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, 0.6, i % 2 ? '#f2c14e' : '#c9363a', 4, 'dot'); } }
      Hooks.sfx('crack');
    }
  } else if (def.skulls) bossTick2(e, dt, L);
}
function updateEnemies(dt){
  const N = G.glob.night;
  const gs = (G.globalSlow || 1) * (N && N.max - N.t >= N.delay ? N.slow : 1) * (G.glob.sabotage ? G.glob.sabotage.slow : 1);
  for (const e of G.enemies){
    if (e.dead) continue;
    e.anim += dt;
    if (e.flashT > 0) e.flashT -= dt;
    if (e.burn){
      const b = e.burn;
      b.t -= dt; b.acc += dt;
      while (b.acc >= b.tick && !e.dead){ b.acc -= b.tick; damage(e, b.dmg, 'heat', b.tw, b.o); }
      if (e.dead) continue;
      if (b.t <= 0) e.burn = null;
    }
    if (e.acid){ acidTick(e, dt); if (e.dead) continue; }
    if (e.freezeT > 0){ e.freezeT -= dt; if (e.freezeT <= 0){ e.brittle = 0; e.shatter = null; } }
    if (e.stunT > 0) e.stunT -= dt;
    if (e.slowT > 0){ e.slowT -= dt; if (e.slowT <= 0) e.slowMult = 1; }
    if (e.vulnT > 0) e.vulnT -= dt;
    if (e.soakT > 0) e.soakT -= dt;
    if (e.sprayed) sprayPestTick(e, dt);
    if (e.def.trick) pestTrick(e, dt);
    if (e.smokeT > 0){ e.smokeT -= dt; if (e.smokeT <= 0) e.heatMult = 1; }
    if (e.crippleT > 0) e.crippleT -= dt;
    if (e.batterT > 0){ e.batterT -= dt; if (e.batterT <= 0) e.batterMult = 1; }
    if (e.layerT > 0){ e.layerT -= dt; if (e.layerT <= 0) e.layers = 0; }
    if (e.grabImm > 0) e.grabImm -= dt;
    if (e.holdT > 0){ e.holdT -= dt; if (e.holdT <= 0){ releaseHold(e); if (e.dead) continue; } }
    if (e.dmgAccT > 0){ e.dmgAccT -= dt; if (e.dmgAccT <= 0) flushDmgNumber(e); }
    if (e.mold && !e.burn && G.time - e.hitT > 1.5 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * (e.big ? 0.005 : 0.09) * dt);
    if (e.boss || e.def.dash) bossTick(e, dt);
    if (e.gold) goldenTick(e, dt);
    /* lifted by chopsticks: it flies until it lands */
    if (e.air){ airTick(e, dt); continue; }
    let mult = 1;
    if (e.burrowT > 0) mult = 2.2 * gs;
    else if (e.freezeT > 0 || e.stunT > 0 || e.holdT > 0) mult = 0;
    else {
      if (e.slowT > 0) mult = e.slowMult;
      if (e.batterT > 0) mult = Math.min(mult, e.batterMult);
      mult *= e.boss ? 1 - (1 - gs) * 0.5 : gs;
      if (e.dashT > 0) mult *= 3;
    }
    /* blown back by a mixer's whirlwind: it flies back up the trail */
    if (e.blowD > 0){ const v = Math.min(e.blowD, e.blowV * dt); e.d -= v; e.blowD -= v; mult = 0; }
    /* charmed by a siren song: it walks back up the trail */
    if (e.charmT > 0){ e.charmT -= dt; if (mult > 0) mult *= -0.6; }
    e.d += e.speed * mult * dt;
    if (e.d < 0) e.d = 0;
    const P = G.paths[e.path];
    if (e.d >= P.len){ if (G.paraList.length && paraLeakSave(e)) continue; leak(e); if (G.over) return; continue; }
    const pos = pathPos(P, e.d, e.seg);
    e.x = pos.x; e.y = pos.y; e.seg = pos.seg; e.ang = pos.ang;
    let da = (e.charmT > 0 ? e.ang + Math.PI : e.ang) - e.rot; da = Math.atan2(Math.sin(da), Math.cos(da));
    e.rot += da * Math.min(1, dt * 12);
  }
}
function updateTimers(dt){
  if (!G.timers.length) return;
  const run = [];
  for (const tm of G.timers){ tm.t -= dt; if (tm.t <= 0) run.push(tm); }
  if (!run.length) return;
  G.timers = G.timers.filter(tm => tm.t > 0);
  for (const tm of run) tm.fn();
}
function updateLoaves(dt){
  if (!G.loaves.length) return;
  for (const L of G.loaves){ L.t += dt; if (L.t > L.life) L.done = true; }
  G.loaves = G.loaves.filter(L => !L.done);
}
function updateFx(dt){
  if (G.fx.length){
    for (const f of G.fx) f.t += dt;
    G.fx = G.fx.filter(f => f.t < f.life);
    if (perfMode()){ G.fx = G.fx.filter(f => f.k !== 'flash'); if (G.fx.length > 30) G.fx = G.fx.slice(-30); G.shake = 0; }
  }
  if (G.parts.length){
    for (const p of G.parts){
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'flame' || p.k === 'smoke'){ p.vx *= 0.92; p.vy *= 0.92; }
      else if (p.k === 'snow'){ p.vy += 10 * dt; }
      else { p.vx *= 0.9; p.vy *= 0.9; }
    }
    G.parts = G.parts.filter(p => p.t < p.life);
  }
  if (G.tornados.length){ for (const t of G.tornados) t.t += dt; G.tornados = G.tornados.filter(t => t.t < t.life); }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt);
}
/* performance mode: keep only a trickle of particles and no screen effects */
function perfMode(){ return !!(Profile.settings && Profile.settings.perf); }
function lowFx(){ return perfMode() || (Profile.settings && Profile.settings.fx === 'low'); }
function part(x, y, vx, vy, life, c, s, k){
  if (!G.vis || G.parts.length > 900) return;
  if (perfMode() && (G.parts.length >= 40 || Math.random() > 0.1)) return;
  G.parts.push({ x, y, vx, vy, t: 0, life, c, s, k });
}
/* floating damage numbers: hits on a pest add up for a moment, then one number floats off it */
function dmgNumbersOn(){ return !!(Profile.settings && Profile.settings.dmgNums) && !G.attract && !lowFx(); }
function flushDmgNumber(e){
  const v = e.dmgAcc; e.dmgAcc = 0; e.dmgAccT = 0;
  if (!(v >= 1)) return;
  const big = v >= 1000, mid = v >= 100;
  G.fx.push({ k:'text', x: e.x + rand(-6, 6), y: e.y - e.r - 4, txt: fmtDmg(v), c: big ? '#ffd166' : mid ? '#fff2b8' : '#ffffff', t: 0, life: big ? 0.9 : 0.65, size: big ? 16 : mid ? 13 : 11 });
}
function fmtDmg(v){ return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e4 ? Math.round(v / 1000) + 'k' : v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v)); }
function fxText(x, y, txt, c, life, size){ if (G.vis) G.fx.push({ k:'text', x, y, txt, c: c || '#fff', t: 0, life: life || 0.9, size: size || 14 }); }

function step(dt){
  if (!G.active || G.paused || G.over) return;
  G.time += dt;
  rushTick(dt);
  evTick(dt);
  if (G.glob.domain) domainTick(dt);
  if (G.glob.rush){ G.glob.rush.t -= dt; if (G.glob.rush.t <= 0) G.glob.rush = null; }
  if (G.glob.boost){ G.glob.boost.t -= dt; if (G.glob.boost.t <= 0) G.glob.boost = null; }
  if (G.glob.opening){ G.glob.opening.t -= dt; if (G.glob.opening.t <= 0) G.glob.opening = null; }
  if (G.glob.night){ G.glob.night.t -= dt; if (G.glob.night.t <= 0) G.glob.night = null; }
  if (G.glob.chill) heroChillTick(dt);
  if (G.blitzCd > 0) G.blitzCd -= dt;
  if (G.admin.infCash) G.cash = Math.max(G.cash, 9999999);
  if (G.roundActive){ updateSpawner(dt); breadTick(dt); }
  updateEnemies(dt);
  if (G.over) return;
  gridBuild();
  updateTowers(dt);
  moreTick(dt);
  updateLobs(dt);
  updateProjs(dt);
  updateWhirls(dt);
  updateTraps(dt);
  if (G.ptraps.length) updatePowerTraps(dt);
  updateZones(dt);
  updateTimers(dt);
  updateLoaves(dt);
  updateFx(dt);
  if (G.deadFlag){ G.enemies = G.enemies.filter(e => !e.dead); G.deadFlag = false; }
  if (G.roundActive && spawnDone() && G.enemies.length === 0 && !G.timers.some(tm => !tm.soft)) endRound();
}

/* ---------------------------------------------------------------------
   Admin tools
   --------------------------------------------------------------------- */
const Admin = {
  cash(v){ if (G.active) addCash(v, true); },
  setCash(v){ if (G.active) G.cash = Math.max(0, v); },
  lives(v){ if (G.active) G.lives = Math.max(1, G.lives + v); },
  setLives(v){ if (G.active) G.lives = Math.max(1, v); },
  killAll(){ if (!G.active) return; for (const e of G.enemies) if (!e.dead){ e.children = null; e.dead = true; G.deadFlag = true; } if (G.bosses.length){ G.bosses = []; Hooks.boss(null); } G.timers = []; },
  skipRound(){ if (!G.active) return; if (!G.roundActive) startRound(); for (const g of G.spawn) g.spawned = g.count; Admin.killAll(); G.enemies = []; endRound(); },
  setRound(n){ if (!G.active) return; Admin.killAll(); G.enemies = []; G.roundActive = false; G.spawn = null; G.round = clamp(Math.floor(n) || 1, 1, 999); if (G.round > G.win) G.freeplay = true; G.lastSnap = serializeGame(); },
  spawn(type, count, mods){
    if (!G.active) return;
    const big = ENEMIES[type].big;
    for (let i = 0; i < count; i++) G.timers.push({ t: i * 0.25, fn: () => spawnEnemy(type, { camo: !big && mods.camo, mold: !big && mods.mold, armored: mods.armored, boss: !!ENEMIES[type].boss }) });
  },
  maxTower(t, pathIdx){
    if (!t || t.paragon) return;
    if (t.hero){ t.level = HERO_MAX; t.hxp = 0; refreshTowers(); return; }
    const second = (pathIdx + 1) % 3;
    t.up = [0, 0, 0]; t.up[pathIdx] = 5; t.up[second] = 2;
    refreshTowers();
  },
  resetCooldowns(){ for (const t of G.towers) for (const k in t.ab) t.ab[k] = 0; },
  maxMastery(){ for (const t of TOWER_ORDER) Profile.mastery[t] = Math.max(Profile.mastery[t] || 0, RANKS[RANKS.length - 1].xp); saveProfile(); if (G.active) refreshTowers(); },
  addXP(v){ for (const t of TOWER_ORDER) Profile.mastery[t] = (Profile.mastery[t] || 0) + v; saveProfile(); if (G.active) refreshTowers(); },
  resetMastery(){ Profile.mastery = {}; saveProfile(); if (G.active) refreshTowers(); },
  allMedals(){ for (const m of MAP_ORDER){ Profile.medals[m] = { easy:1, medium:1, hard:1, michelin:1, mastery:1 }; } saveProfile(); },
  /* Dough given here counts as earned, so a synced save on another device keeps it */
  dough(v){
    v = Math.round(+v || 0);
    if (v > 0){ Profile.dough += v; Profile.stats.doughEarned = (Profile.stats.doughEarned || 0) + v; }
    else if (v < 0) Profile.dough = Math.max(0, Profile.dough + v);
    else return 0;
    saveProfile();
    return v;
  },
  setDough(v){ return Admin.dough(Math.max(0, Math.round(+v || 0)) - Profile.dough); },
};

/* expose for tests */
if (typeof module !== 'undefined') module.exports = { G, Profile: () => Profile, Store, newGame, loadGame, step, startRound, placeTower, upgradeTower, upgradeState, sellTower, makeParagon, paragonState, towerCost, upgradeCost, useAbility, abilityList, serializeGame, refreshTowers, canPlace, Admin, Hooks, DT, collectLoavesAt, retryRound, AdminFlags };
