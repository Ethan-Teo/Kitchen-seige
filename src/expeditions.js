'use strict';
/* =====================================================================
   Kitchen Siege — Expeditions
   A run of five kitchens of rising difficulty, cooked one after another
   with a crew of up to six kinds of appliance picked up front. Unlike the
   Tasting Menu, an expedition is not weekly: start one whenever you like,
   with its own seed. Between kitchens:
     - lives carry over;
     - the appliances still standing are packed up (the dearest twelve,
       upgrades and all) and can be placed again for free in the next
       kitchen;
     - you pick one of three camp boons.
   Losing a kitchen ends the expedition. Each kitchen cleared pays Dough;
   finishing all five pays a big reward and a Gold crate. The run lives on
   the profile (Profile.expedition) and each kitchen is played as a
   challenge with an `ex` field, so saves and slots work as for dailies.
   ===================================================================== */
const EX_LEGS = 5, EX_KINDS = 6, EX_LIVES = 150, EX_PACK_MAX = 12;
const EX_ROUNDS = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 80]];
const EX_CASH = [650, 900, 1300, 1800, 2500];
const EX_TIERS = [['Beginner'], ['Beginner', 'Intermediate'], ['Intermediate', 'Advanced'], ['Advanced'], ['Advanced', 'Expert']];
const EX_DIFF = ['easy', 'medium', 'medium', 'hard', 'hard'];
const EX_RULES = ['fast', 'traffic', 'tough', 'hike', 'budget', 'basics', 'hands'];
const EX_LEG_DOUGH = [40, 70, 110, 160, 0], EX_REWARD = { dough: 900, crate: 'gold' };
const EX_BOONS = {
  rations:   { name:'Rations',      icon:'🥫', desc:'+40 lives.' },
  purse:     { name:'Travel purse', icon:'👛', desc:'+$1,200 at the start of the next kitchen.' },
  whetstone: { name:'Whetstone',    icon:'🔪', desc:'Every packed appliance gains a tier on its main path (up to tier 4).' },
  scout:     { name:'Scout ahead',  icon:'🧭', desc:'The next kitchen has no house rule.' },
  recruit:   { name:'New recruit',  icon:'🤝', desc:'Add one more kind of appliance to the crew (up to 8 kinds).' },
  mender:    { name:'Field mender', icon:'🩹', desc:'Restore lives back up to ' + EX_LIVES + ', or +15 if you already have that many.' },
};
const EX_BOON_ORDER = Object.keys(EX_BOONS);

function exRecord(){ const r = Profile.expedition; return r && typeof r === 'object' && Array.isArray(r.maps) ? r : null; }
function exTypes(){ return TOWER_ORDER.filter(t => TOWERS[t] && !TOWERS[t].hero && !TOWERS[t].custom && !TOWERS[t].admin); }
/* a fresh run from a seed: five kitchens of rising tier, house rules from the third on */
function exNew(seed){
  seed = seed == null ? Math.floor(Math.random() * 1e9) : seed >>> 0;
  const rnd = mulberry32(hashStr('ks-expedition:' + seed)), pick = arr => arr[Math.floor(rnd() * arr.length)];
  const maps = [];
  for (const t of EX_TIERS){
    let pool = MAP_ORDER.filter(m => t.includes(MAPS[m].level) && !maps.includes(m));
    if (!pool.length) pool = MAP_ORDER.filter(m => !maps.includes(m));
    maps.push(pick(pool));
  }
  const rules = maps.map((m, i) => i >= 2 ? pick(EX_RULES) : null);
  const rec = { seed, maps, rules, crew: [], leg: 0, lives: EX_LIVES, pack: [], purse: 0, scout: false, boons: [], offer: null, over: false, done: false, tries: 0, started: Date.now() };
  Profile.expedition = rec;
  saveProfile();
  return rec;
}
function exCrewOk(crew, rec){
  const max = EX_KINDS + ((rec && rec.boons) ? rec.boons.filter(b => b === 'recruit').length : 0);
  return Array.isArray(crew) && crew.length >= 1 && crew.length <= Math.min(8, max) && crew.every(t => exTypes().includes(t)) && new Set(crew).size === crew.length;
}
function exKindsMax(rec){ return Math.min(8, EX_KINDS + (rec ? rec.boons.filter(b => b === 'recruit').length : 0)); }
function exRuleOf(rec, leg){ return rec.scout && leg === rec.leg ? null : rec.rules[leg]; }
/* the challenge that plays one kitchen of the run */
function exLeg(rec){
  const leg = Math.min(EX_LEGS - 1, rec.leg), [start, end] = EX_ROUNDS[leg], map = rec.maps[leg];
  const rule = exRuleOf(rec, leg), rules = rule ? [rule] : [];
  const mod = Object.assign({}, NO_MOD);
  for (const r of rules){ const m = CH_RULES[r].mod; for (const k in m) mod[k] = m[k]; }
  return { ex: { seed: rec.seed, leg }, date: 'ex:' + rec.seed + ':' + leg, name: 'Expedition · kitchen ' + (leg + 1) + ' of ' + EX_LEGS, map, diff: EX_DIFF[leg], start, end,
    cash: EX_CASH[leg] + (rec.purse || 0), lives: Math.max(1, rec.lives || EX_LIVES), towers: rec.crew.slice(), rules, mod, reward: { dough: 0, crate: null },
    pack: rec.pack.map(p => ({ type: p.type, up: p.up.slice() })) };
}
/* the upgrades a packed appliance may keep: the usual crosspath limits, and the kitchen's tier cap */
function exCleanUp(type, up){
  const T = TOWERS[type], cap = (G.ch && G.ch.mod && G.ch.mod.maxTier) || 5;
  const u = [0, 1, 2].map(p => Math.max(0, Math.min(cap, T.paths[p] ? T.paths[p].ups.length : 0, Math.floor(+up[p] || 0))));
  /* at most two paths, and only one past tier 2 */
  const order = [0, 1, 2].sort((a, b) => u[b] - u[a]);
  u[order[2]] = 0;
  if (u[order[1]] > 2) u[order[1]] = 2;
  return u;
}
/* place a packed appliance for free, upgrades and all */
function exPlacePack(i, x, y){
  const P = G.ch && G.ch.ex && G.ch.pack;
  if (!P || !P[i]) return { ok:false, why:'Nothing packed there' };
  if (!G.active || G.over) return { ok:false, why:'Start a game first' };
  const it = P[i];
  if (!TOWERS[it.type]) return { ok:false, why:'That appliance is gone' };
  if (!canPlace(it.type, x, y)){
    const w = placeWhy(it.type, x, y);
    return { ok:false, why: w === 'water' ? TOWERS[it.type].name + ' has to go on the water' : w === 'land' ? 'Only boats and subs can go on the water' : 'That spot is blocked' };
  }
  const t = makeTower(it.type, x, y);
  t.up = exCleanUp(it.type, it.up);
  t.invested = instaValue(it.type, t.up);
  const seat = seatFor(it.type, x, y);
  if (seat) seatOn(t, seat.tw, seat.i);
  if (trapTower(it.type)) t.tg = 'strong';
  G.towers.push(t);
  P.splice(i, 1);
  refreshTowers();
  Hooks.sfx('place');
  return { ok:true, t };
}
/* what the run packs at the end of a kitchen: the dearest twelve appliances standing */
function exPackUp(){
  const keep = G.towers.filter(t => !t.hero && !t.paragon && !TOWERS[t.type].custom && !TOWERS[t.type].admin && exTypes().includes(t.type))
    .sort((a, b) => (b.invested || 0) - (a.invested || 0)).slice(0, EX_PACK_MAX);
  /* anything still in the pack that wasn't placed comes along too */
  const left = (G.ch && G.ch.pack) || [];
  return keep.map(t => ({ type: t.type, up: t.up.slice() })).concat(left.map(p => ({ type: p.type, up: p.up.slice() }))).slice(0, EX_PACK_MAX);
}
/* three boons on offer at camp, from the run's seed so a reload offers the same */
function exOffer(rec){
  const rnd = mulberry32(hashStr('ks-camp:' + rec.seed + ':' + rec.leg));
  const pool = EX_BOON_ORDER.filter(b => b !== 'recruit' || exKindsMax(rec) < 8);
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
/* a kitchen cleared: pack up, carry lives, pay, and open the camp */
function exLegDone(){
  const ch = G.ch;
  if (!ch || !ch.ex) return null;
  const rec = exRecord();
  if (!rec || rec.seed !== ch.ex.seed || rec.over) return null;
  const leg = ch.ex.leg, out = { leg, last: leg === EX_LEGS - 1, dough: 0, crate: null };
  if (rec.leg !== leg) return out;   // already counted
  const noPay = G.adminUsed;
  rec.lives = Math.max(1, Math.floor(G.lives));
  rec.pack = exPackUp();
  rec.leg = leg + 1; rec.purse = 0; rec.scout = false;
  if (!noPay) out.dough = addDough(EX_LEG_DOUGH[leg] || 0);
  const S = Profile.stats;
  S.exBest = Math.max(S.exBest || 0, rec.leg);
  if (out.last){
    rec.done = true; rec.offer = null;
    if (!noPay){ out.dough += addDough(EX_REWARD.dough); addCrate(EX_REWARD.crate, 1); out.crate = EX_REWARD.crate; }
    S.expeditions = (S.expeditions || 0) + 1;
  } else {
    rec.offer = exOffer(rec);
    out.offer = rec.offer.slice();
  }
  saveProfile();
  return out;
}
function exPickBoon(id){
  const rec = exRecord();
  if (!rec || !rec.offer || !rec.offer.includes(id)) return false;
  if (id === 'rations') rec.lives += 40;
  else if (id === 'purse') rec.purse = (rec.purse || 0) + 1200;
  else if (id === 'whetstone') for (const p of rec.pack){
    const T = TOWERS[p.type]; if (!T) continue;
    const main = [0, 1, 2].sort((a, b) => p.up[b] - p.up[a])[0];
    if (p.up[main] < 4 && T.paths[main] && p.up[main] < T.paths[main].ups.length) p.up[main]++;
  }
  else if (id === 'scout') rec.scout = true;
  else if (id === 'mender') rec.lives = rec.lives < EX_LIVES ? EX_LIVES : rec.lives + 15;
  rec.boons.push(id);
  rec.offer = null;
  saveProfile();
  return true;
}
function exAddRecruit(type){
  const rec = exRecord();
  if (!rec || rec.crew.includes(type) || !exTypes().includes(type) || rec.crew.length >= exKindsMax(rec)) return false;
  rec.crew.push(type); saveProfile(); return true;
}
/* losing a kitchen ends the run */
function exDefeat(){
  const rec = exRecord();
  if (!rec || !G.ch || !G.ch.ex || rec.seed !== G.ch.ex.seed || rec.done) return;
  rec.over = true;
  Profile.stats.exBest = Math.max(Profile.stats.exBest || 0, rec.leg);
  saveProfile();
}
function exAbandon(){ Profile.expedition = null; saveProfile(); }
