'use strict';
/* =====================================================================
   Kitchen Siege — progression between games: Dough (the savings you
   spend in the Pantry Shop), chef levels, the daily chest and daily
   challenge, powers, insta appliances, crates, achievements and the
   Golden Roach. No DOM here, so it runs headless as well.
   ===================================================================== */

/* ---------------- Dough ----------------
   Earned for every round cleared (more on harder difficulties and in
   Mastery Mode), for winning, for new medals, levels and achievements. */
const DOUGH_RATE = { easy:1, medium:1.5, hard:2, michelin:3 };
const WIN_DOUGH = { easy:40, medium:80, hard:150, michelin:300 };
const MEDAL_DOUGH = { easy:60, medium:120, hard:200, michelin:400, mastery:250 };

function addDough(v){
  v = Math.max(0, Math.round(v || 0));
  if (!v) return 0;
  Profile.dough += v;
  Profile.stats.doughEarned = (Profile.stats.doughEarned || 0) + v;
  if (G.active && !G.attract) G.doughGame = (G.doughGame || 0) + v;
  Hooks.dough(v);
  return v;
}
function spendDough(v){
  if (!(v > 0) || Profile.dough < v) return false;
  Profile.dough -= v;
  return true;
}

/* ---------------- Chef level ----------------
   Every cleared round gives chef XP. Each level pays out Dough, every
   fifth level adds a Chef's Crate and every 25th a Golden Crate. */
function chefNeed(L){ return 150 + 60 * (L - 1); }
function chefLevel(xp){
  xp = Math.max(0, xp || 0);
  let L = 1, need = chefNeed(1);
  while (xp >= need && L < 9999){ xp -= need; L++; need = chefNeed(L); }
  return { level: L, into: xp, need, pct: clamp(xp / need, 0, 1) };
}
function levelReward(L){ return { dough: 20 + 5 * L, crate: L % 25 === 0 ? 'gold' : L % 5 === 0 ? 'chef' : null }; }
function addChefXP(v){
  v = Math.round(v || 0);
  if (!(v > 0)) return 0;
  const before = chefLevel(Profile.chef.xp).level;
  Profile.chef.xp += v;
  const after = chefLevel(Profile.chef.xp).level;
  for (let L = before + 1; L <= after; L++){
    const R = levelReward(L);
    addDough(R.dough);
    if (R.crate) addCrate(R.crate, 1);
    Hooks.levelUp(L, R);
  }
  /* some head chefs join for free at a chef level */
  if (after > before && typeof syncHeroUnlocks === 'function') for (const id of syncHeroUnlocks()) Hooks.heroUnlock(id, 'level');
  return after - before;
}

/* ---------------- Rounds, wins and losses ---------------- */
function metaRoundEnd(n){
  if (G.attract || G.adminUsed || G.mods) return;
  const rate = (DOUGH_RATE[G.diff] || 1) * (G.mm ? 1.5 : 1), main = n <= G.win;
  G.doughAcc = (G.doughAcc || 0) + (main ? 2 + n / 20 : 1) * rate;
  const whole = Math.floor(G.doughAcc);
  G.doughAcc -= whole;
  G.lastRoundDough = addDough(whole);
  const xp = Math.round((main ? 10 + n : 10) * ((G.D && G.D.xp) || 1) * (G.mm ? 1.25 : 1));
  G.chefXpGame = (G.chefXpGame || 0) + xp;
  addChefXP(xp);
  const S = Profile.stats;
  S.maxRound = Math.max(S.maxRound || 0, n);
  if (!G.admin.infCash) S.maxCash = Math.max(S.maxCash || 0, Math.floor(G.cash));
  checkAchievements();
}
/* what a win pays: the daily challenge reward, or Dough for the win and any new medals */
function metaVictory(fresh, freshMM){
  const out = { dough: 0, crate: null, daily: false, first: false };
  if (G.attract || G.adminUsed || G.mods) return out;
  if (G.ch && G.ch.tm){
    const r = tmLegDone();
    if (r){ out.tm = r; out.dough += r.dough; out.crate = r.crate; out.first = !!r.dough; }
  } else if (G.ch && G.ch.ex){
    const r = exLegDone();
    if (r){ out.ex = r; out.dough += r.dough; out.crate = r.crate; out.first = !!r.crate; }
  } else if (G.ch){
    out.daily = true;
    if (!Profile.daily.ch[G.ch.date]){
      out.first = true;
      Profile.daily.ch[G.ch.date] = 1;
      Profile.stats.dailies = (Profile.stats.dailies || 0) + 1;
      out.dough += addDough(G.ch.reward.dough);
      addCrate(G.ch.reward.crate, 1);
      out.crate = G.ch.reward.crate;
    }
  } else {
    out.dough += addDough(WIN_DOUGH[G.diff] * (G.mm ? 1.5 : 1));
    if (fresh) out.dough += addDough(MEDAL_DOUGH[G.diff] || 0);
    if (freshMM) out.dough += addDough(MEDAL_DOUGH.mastery);
  }
  if (G.stats.leaked === 0) Profile.stats.flawless = (Profile.stats.flawless || 0) + 1;
  checkAchievements();
  return out;
}

/* ---------------- Rewards ----------------
   A reward list is [kind, what, amount]: ['dough', 120], ['power', 'boost', 1],
   ['power', 'random', 1], ['insta', 'rare', 1] or ['crate', 'chef', 1]. */
const RARITY = {
  common:    { name:'Common',    color:'#8e9ba1', main:[1, 2] },
  rare:      { name:'Rare',      color:'#3d8bd9', main:[3, 3] },
  epic:      { name:'Epic',      color:'#9b4fd1', main:[4, 4] },
  legendary: { name:'Legendary', color:'#e8940f', main:[5, 5] },
};
const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
function pickWeighted(w, rnd){
  rnd = rnd || Math.random;
  let total = 0;
  for (const k in w) total += w[k];
  let r = rnd() * total;
  for (const k in w){ r -= w[k]; if (r < 0) return k; }
  return Object.keys(w)[0];
}
function addCrate(id, n){ if (!CRATES[id]) return; Profile.crates[id] = (Profile.crates[id] || 0) + (n || 1); }
function grantRewards(list){
  const got = [];
  for (const [k, what, n0] of list){
    const n = n0 == null ? 1 : n0;
    if (k === 'dough'){ const v = addDough(what); if (v) got.push({ k:'dough', n: v }); }
    else if (k === 'power'){
      for (let i = 0; i < n; i++){
        const id = POWERS[what] ? what : randomPower();
        Profile.powers[id] = (Profile.powers[id] || 0) + 1;
        const last = got.find(g => g.k === 'power' && g.id === id);
        if (last) last.n++; else got.push({ k:'power', id, n: 1 });
      }
    } else if (k === 'insta'){
      for (let i = 0; i < n; i++){
        const it = rollInsta(RARITY[what] ? what : 'common'), key = instaKey(it.type, it.up);
        Profile.insta[key] = (Profile.insta[key] || 0) + 1;
        got.push({ k:'insta', key, type: it.type, up: it.up, rarity: instaRarity(it.up), n: 1 });
      }
    } else if (k === 'crate' && CRATES[what]){ addCrate(what, n); got.push({ k:'crate', id: what, n }); }
  }
  return got;
}

/* ---------------- Insta appliances ----------------
   Ready-made upgraded appliances from crates and the daily chest. They are
   placed for free, keep their upgrades, and sell like any other. */
function instaKey(type, up){ return type + ':' + up.join('-'); }
function parseInsta(key){
  const m = /^([a-z]+):([0-5])-([0-5])-([0-5])$/.exec(key || '');
  if (!m || !TOWERS[m[1]] || TOWERS[m[1]].custom) return null;
  const up = [+m[2], +m[3], +m[4]];
  if (up.filter(v => v > 0).length > 2 || up.filter(v => v > 2).length > 1) return null;
  return { type: m[1], up };
}
function instaRarity(up){ const top = Math.max(up[0], up[1], up[2]); return top >= 5 ? 'legendary' : top === 4 ? 'epic' : top === 3 ? 'rare' : 'common'; }
function rollInsta(rarity, rnd){
  rnd = rnd || Math.random;
  const pool = BASE_TOWER_ORDER.filter(t => TOWERS[t] && !TOWERS[t].custom);
  const type = pool[Math.floor(rnd() * pool.length)];
  const R = RARITY[rarity] || RARITY.common;
  const p = Math.floor(rnd() * 3), q = (p + 1 + Math.floor(rnd() * 2)) % 3;
  const up = [0, 0, 0];
  up[p] = R.main[0] + Math.floor(rnd() * (R.main[1] - R.main[0] + 1));
  up[q] = Math.floor(rnd() * 3);
  return { type, up };
}
/* the price of the appliance and its upgrades, as if bought in this game */
function instaValue(type, up){
  const T = TOWERS[type];
  let c = towerCost(type);
  for (let p = 0; p < 3; p++) for (let i = 0; i < up[p]; i++) c += price(T.paths[p].ups[i].cost, type);
  return c;
}
function instaList(){
  return Object.keys(Profile.insta).filter(k => Profile.insta[k] > 0 && parseInsta(k))
    .sort((a, b) => RARITY_ORDER.indexOf(instaRarity(parseInsta(b).up)) - RARITY_ORDER.indexOf(instaRarity(parseInsta(a).up)) || TOWER_ORDER.indexOf(parseInsta(a).type) - TOWER_ORDER.indexOf(parseInsta(b).type) || a.localeCompare(b));
}
function placeInsta(key, x, y){
  const why = powerBlock();
  if (why) return { ok:false, why };
  const it = parseInsta(key);
  if (!it || !(Profile.insta[key] > 0)) return { ok:false, why:'You have none of those left' };
  if (!canPlace(it.type, x, y)){
    const w = placeWhy(it.type, x, y);
    return { ok:false, why: w === 'water' ? TOWERS[it.type].name + ' has to go on the water' : w === 'land' ? 'Only boats and subs can go on the water' : 'That spot is blocked' };
  }
  const t = makeTower(it.type, x, y);
  t.up = it.up.slice();
  t.invested = instaValue(it.type, it.up);
  /* onto a Lazy Susan's free seat, when it was placed over one */
  const seat = seatFor(it.type, x, y);
  if (seat) seatOn(t, seat.tw, seat.i);
  if (trapTower(it.type)) t.tg = 'strong';
  G.towers.push(t);
  refreshTowers();
  Profile.insta[key]--;
  if (!Profile.insta[key]) delete Profile.insta[key];
  Profile.stats.insta = (Profile.stats.insta || 0) + 1;
  saveProfile();
  Hooks.sfx('place');
  if (G.vis){
    G.fx.push({ k:'ring', x, y, r0: t.size, r1: t.size + 60, t:0, life:0.6, c:'#ffd166', w:5 });
    for (let i = 0; i < 24; i++){ const a = rand(0, TAU), v = rand(40, 160); part(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.7, i % 2 ? '#ffd166' : '#fff4c2', 3, 'spark'); }
  }
  Hooks.towersChanged();
  return { ok:true, t };
}

/* ---------------- Crates ---------------- */
const CRATES = {
  chef: { name:'Chef’s Crate', cost:250, desc:'An insta appliance, two powers and a handful of Dough.', odds:{ common:60, rare:28, epic:10, legendary:2 }, powers:2, dough:[20, 60] },
  gold: { name:'Golden Crate', cost:700, desc:'A rare or better insta appliance, three powers and more Dough.', odds:{ rare:62, epic:30, legendary:8 }, powers:3, dough:[60, 150] },
};
const CRATE_ORDER = ['chef', 'gold'];
/* buying in bulk has no limit but the Dough. Opening stops at 100,000 crates a go, only so an enormous pile
   can't stall the page: that many open in well under a second */
const OPEN_MAX = 100000;
function bulkCount(n){ return Math.max(1, Math.floor(+n || 1)); }
function buyCrate(id, n){
  const C = CRATES[id];
  n = bulkCount(n);
  if (!C || !spendDough(C.cost * n)) return false;
  addCrate(id, n);
  saveProfile();
  return true;
}
/* one crate's rewards (no saving: openCrate and openCrates save once) */
function rollCrate(id){
  const C = CRATES[id];
  Profile.crates[id]--;
  const rarity = pickWeighted(C.odds);
  const items = [['insta', rarity, 1]];
  for (let i = 0; i < C.powers; i++) items.push(['power', 'random', 1]);
  items.push(['dough', C.dough[0] + Math.floor(Math.random() * (C.dough[1] - C.dough[0] + 1))]);
  Profile.stats.chests = (Profile.stats.chests || 0) + 1;
  return { rarity, got: grantRewards(items) };
}
function openCrate(id){
  const C = CRATES[id];
  if (!C || !(Profile.crates[id] > 0)) return null;
  const r = rollCrate(id);
  checkAchievements();
  saveProfile();
  return { id, rarity: r.rarity, got: r.got };
}
/* rewards from several crates as one list: the Dough added up, and powers and insta appliances counted,
   best insta appliances first */
function mergeGot(list){
  const out = [], by = {};
  for (const g of list){
    const key = g.k === 'dough' ? 'dough' : g.k === 'insta' ? 'i:' + g.key : g.k + ':' + g.id;
    if (by[key]) by[key].n += g.n;
    else { by[key] = Object.assign({}, g); out.push(by[key]); }
  }
  const rank = g => g.k === 'insta' ? 0 : g.k === 'crate' ? 1 : g.k === 'power' ? 2 : 3;
  return out.sort((a, b) => rank(a) - rank(b)
    || (a.k === 'insta' ? RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.n - a.n || a.key.localeCompare(b.key) : 0)
    || (a.k === 'power' ? POWER_ORDER.indexOf(a.id) - POWER_ORDER.indexOf(b.id) : 0));
}
/* opens up to n crates of one kind at once (up to OPEN_MAX), saving once */
function openCrates(id, n){
  const C = CRATES[id];
  n = Math.min(bulkCount(n), OPEN_MAX, Profile.crates[id] || 0);
  if (!C || n < 1) return null;
  const all = [];
  let best = -1;
  const hook = Hooks.dough;
  Hooks.dough = () => {};
  try {
    for (let i = 0; i < n; i++){
      const r = rollCrate(id);
      best = Math.max(best, RARITY_ORDER.indexOf(r.rarity));
      all.push(...r.got);
    }
  } finally { Hooks.dough = hook; }
  const got = mergeGot(all);
  const d = got.find(g => g.k === 'dough');
  Hooks.dough(d ? d.n : 0);
  checkAchievements();
  saveProfile();
  return { id, n, rarity: RARITY_ORDER[best], got };
}

/* ---------------- Daily chest ----------------
   One chest a day. Opening on consecutive days climbs a seven-day track
   with bigger rewards; missing a day starts it over. */
const DAILY_CHEST = [
  { dough:60,  items:[['power', 'tipjar', 1]] },
  { dough:80,  items:[['power', 'traps', 1]] },
  { dough:100, items:[['power', 'boost', 1], ['power', 'sweep', 1]] },
  { dough:120, items:[['insta', 'common', 1]] },
  { dough:150, items:[['power', 'freeze', 1], ['power', 'restock', 1]] },
  { dough:200, items:[['power', 'storm', 1], ['insta', 'rare', 1]] },
  { dough:300, items:[['crate', 'gold', 1]] },
];
function dayKey(d){ d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function shiftDay(key, n){ const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); }
function dailyStatus(now){
  const D = Profile.daily, today = dayKey(now);
  const ready = D.last !== today;
  const keep = D.last === shiftDay(today, -1);
  const streak = ready ? (keep ? D.streak + 1 : 1) : Math.max(1, D.streak);
  return { ready, today, streak, day: ((streak - 1) % 7) + 1, chest: DAILY_CHEST[(streak - 1) % 7], lost: ready && !keep && D.streak > 1 };
}
function claimDaily(now){
  const st = dailyStatus(now);
  if (!st.ready) return null;
  const D = Profile.daily;
  D.last = st.today; D.streak = st.streak; D.best = Math.max(D.best || 0, st.streak);
  const got = grantRewards([['dough', st.chest.dough]].concat(st.chest.items));
  checkAchievements();
  saveProfile();
  return { streak: st.streak, day: st.day, got };
}

/* ---------------- Daily challenge ----------------
   Everyone gets the same challenge on the same date: a kitchen, a
   difficulty, a stretch of rounds, a short list of appliances and two
   house rules. Powers and insta appliances stay in the pantry. */
const CH_RULES = {
  fast:     { name:'Fast Food',      desc:'Pests move 20% faster.',              mod:{ speed:1.2 },    w:3, hard:1 },
  traffic:  { name:'Heavy Traffic',  desc:'Vehicles have 60% more health.',      mod:{ bigHp:1.6 },    w:3, hard:1 },
  tough:    { name:'Tough Crowd',    desc:'Small pests have 30% more health.',   mod:{ hp:1.3 },       w:3, hard:1 },
  budget:   { name:'Tight Budget',   desc:'Pests pay half the usual cash.',      mod:{ cash:0.5 },     w:2, hard:2 },
  hands:    { name:'Hands On',       desc:'No abilities.',                       mod:{ noAbilities:true }, w:2, hard:1 },
  basics:   { name:'Back to Basics', desc:'Upgrades stop at tier 3.',            mod:{ maxTier:3 },    w:2, hard:2 },
  hike:     { name:'Price Hike',     desc:'Everything costs 20% more.',          mod:{ price:1.2 },    w:2, hard:1 },
  happy:    { name:'Happy Hour',     desc:'Everything costs 15% less.',          mod:{ price:0.85 },   w:2, hard:-1 },
  refunds:  { name:'No Refunds',     desc:'Appliances can’t be sold.',           mod:{ noSell:true },  w:2, hard:1 },
  skeleton: { name:'Skeleton Crew',  desc:'You start with only 25 lives.',       mod:{ lives:25 },     w:2, hard:1 },
};
/* starting cash for each starting round: what a kitchen has earned by then */
const CH_STARTS = [[1, 650], [6, 1300], [11, 2150], [16, 3400], [21, 5200]];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function hashStr(s){ let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function canSpotGhosts(type){
  for (const up of [[0, 0, 0], [3, 0, 0], [0, 3, 0], [0, 0, 3], [2, 2, 0], [0, 2, 2], [2, 0, 2]]){
    try { if (computeStats({ type, up, paragon:false, degree:1, x:0, y:0 }).camo) return true; } catch (e) {}
  }
  return false;
}
function dailyChallenge(key){
  key = key || dayKey();
  const rnd = mulberry32(hashStr('ks-daily:' + key));
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const map = pick(MAP_ORDER);
  const diff = pick(['easy', 'medium', 'medium', 'hard']);
  const [start, cash] = pick(CH_STARTS);
  const span = pick([20, 25, 30]);
  /* seven appliances: at least four that fight on land, and one that can learn to spot ghosts */
  const pool = BASE_TOWER_ORDER.filter(t => TOWERS[t] && !TOWERS[t].custom);
  for (let i = pool.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  /* a fighter does damage from the start and is affordable from the start (the fryer only slows; the microwave costs $2,500) */
  const hits = t => { const m = TOWERS[t].base.atk && TOWERS[t].base.atk.main; return !!m && ((m.dmg || 0) > 0 || !!(m.explode || m.impact || m.mine)); };
  const fighter = t => !TOWERS[t].water && factionOf(t) !== 'support' && hits(t) && TOWERS[t].cost <= Math.max(cash, 650);
  const towers = pool.filter(fighter).slice(0, 4);
  for (const t of pool) if (towers.length < 7 && towers.indexOf(t) < 0) towers.push(t);
  if (!towers.some(canSpotGhosts)){
    const swap = pool.find(t => towers.indexOf(t) < 0 && fighter(t) && canSpotGhosts(t));
    if (swap) towers[3] = swap;
  }
  towers.sort((a, b) => TOWER_ORDER.indexOf(a) - TOWER_ORDER.indexOf(b));
  /* two house rules that don't fight over the same setting */
  const ids = Object.keys(CH_RULES), rules = [];
  while (rules.length < 2){
    const w = {}; for (const id of ids) if (rules.indexOf(id) < 0) w[id] = CH_RULES[id].w;
    const id = pickWeighted(w, rnd);
    const keys = Object.keys(CH_RULES[id].mod);
    if (rules.some(r => Object.keys(CH_RULES[r].mod).some(k => keys.indexOf(k) >= 0))) continue;
    rules.push(id);
  }
  const mod = Object.assign({}, NO_MOD);
  for (const r of rules){ const m = CH_RULES[r].mod; for (const k in m) mod[k] = typeof m[k] === 'number' && typeof mod[k] === 'number' && k !== 'maxTier' && k !== 'lives' ? mod[k] * m[k] : m[k]; }
  const hard = rules.reduce((n, r) => n + CH_RULES[r].hard, 0) + { easy:0, medium:1, hard:2 }[diff] + (span >= 30 ? 1 : 0);
  const [y, mo, d] = key.split('-').map(Number);
  return {
    date: key, name: DAY_NAMES[new Date(y, mo - 1, d).getDay()] + ' Special', map, diff, start, end: start + span - 1, cash,
    lives: mod.lives || DIFFS[diff].lives, towers, rules, mod,
    reward: { dough: 150 + 40 * Math.max(0, hard), crate: hard >= 4 ? 'gold' : 'chef' }, hard,
  };
}

/* ---------------- Powers ----------------
   Bought with Dough or found in crates, used during a game from the Powers
   tray. Not in daily challenges, and never on Michelin. */
const POWERS = {
  tipjar:  { name:'Tip Jar',        cost:60,  w:5, desc:'Instant cash: $200, plus $25 for every round so far.' },
  traps:   { name:'Mousetraps',     cost:50,  w:5, desc:'Set three traps on the trail. Each snaps up the next 6 small pests that walk over it. Flying pests sail over.', target:'trail' },
  boost:   { name:'Double Shot',    cost:80,  w:4, desc:'Every appliance attacks twice as fast for 15 seconds.' },
  restock: { name:'Pantry Restock', cost:90,  w:3, desc:'30 extra lives, right away.' },
  sweep:   { name:'Clean Sweep',    cost:70,  w:4, desc:'Scrubs the ghost cloaks, armor and mold off every pest on the map.' },
  freeze:  { name:'Freezer Burst',  cost:100, w:3, desc:'Freezes every pest on the map for 4s (vehicles 2s, bosses 1s), snow fleas included.' },
  storm:   { name:'Sizzle Storm',   cost:150, w:2, desc:'Hits every pest on the map for 1,000 (3,000 to vehicles).' },
};
const POWER_ORDER = ['tipjar', 'traps', 'boost', 'restock', 'sweep', 'freeze', 'storm'];
function randomPower(rnd){ const w = {}; for (const id of POWER_ORDER) w[id] = POWERS[id].w; return pickWeighted(w, rnd); }
function buyPower(id, n){
  const P = POWERS[id];
  n = bulkCount(n);
  if (!P || !spendDough(P.cost * n)) return false;
  Profile.powers[id] = (Profile.powers[id] || 0) + n;
  saveProfile();
  return true;
}
/* why powers and insta appliances can't be used right now, or null */
function powerBlock(){
  if (!G.active || G.over || G.attract) return 'Start a game first';
  if (Coop.on && Coop.role === 'guest') return 'In co-op, powers and insta appliances are the host’s';
  if (G.mods && G.mods.flags.noPowers) return 'This game’s mods allow no powers';
  if (G.ch) return 'Powers stay in the pantry during daily challenges';
  if (G.diff === 'michelin') return 'Michelin is a pure test: no powers';
  if (modeNoPowers()) return G.M.name + ' is played without powers';
  if (evNoPowers()) return 'No powers during events';
  return null;
}
/* the nearest point on the trail to (x, y), if it is within reach */
function trailSpotNear(x, y, reach){
  let best = null, bd = reach || 50;
  for (const p of trailPoints()){ const d = Math.hypot(p.x - x, p.y - y); if (d < bd){ bd = d; best = p; } }
  return best;
}
function usePower(id, pt){
  const P = POWERS[id];
  if (!P) return { ok:false, why:'Unknown power' };
  const why = powerBlock();
  if (why) return { ok:false, why };
  if (!(Profile.powers[id] > 0)) return { ok:false, why:'You have no ' + P.name + ' left. Buy more in the Pantry Shop.' };
  switch (id){
    case 'tipjar': {
      const v = Math.min(6000, 200 + 25 * G.round);
      addCash(v);
      if (G.vis) for (let i = 0; i < 18; i++){ const a = rand(0, TAU), s = rand(60, 200); part(W / 2 + rand(-30, 30), H / 2, Math.cos(a) * s, Math.sin(a) * s - 80, 0.9, '#ffd166', 4, 'spark'); }
      Hooks.toast('Tip Jar: +' + '$' + v.toLocaleString('en-US') + '!', 'gold');
      Hooks.sfx('cash');
      break;
    }
    case 'traps': {
      const spot = pt && trailSpotNear(pt.x, pt.y, 60);
      if (!spot) return { ok:false, why:'Pick a spot on the trail' };
      const Pth = G.paths[spot.path];
      for (let i = 0; i < 3; i++){
        const q = pathPos(Pth, clamp(spot.d + (i - 1) * 26, 0, Pth.len - 1), 0);
        G.ptraps.push({ x: q.x, y: q.y, ang: q.ang, left: 6, max: 6, t: 0, snap: -9 });
      }
      Hooks.sfx('place');
      break;
    }
    case 'boost':
      G.glob.boost = { mult: 2, t: 15 };
      if (G.vis) G.fx.push({ k:'flash', c:'rgba(255,209,102,0.2)', t:0, life:0.5 });
      Hooks.sfx('ability');
      break;
    case 'restock':
      G.lives += 30;
      Hooks.toast('Pantry Restock: +30 lives.', 'gold');
      Hooks.sfx('rank');
      break;
    case 'sweep':
      for (const e of G.enemies){ if (e.dead) continue; stripArmor(e); e.camo = false; e.mold = false; }
      if (G.vis) G.fx.push({ k:'rinse', t:0, life:1.1 });
      Hooks.sfx('splash');
      break;
    case 'freeze':
      for (const e of G.enemies){ if (e.dead) continue; e.freezeT = Math.max(e.freezeT, e.boss ? 1 : e.big ? 2 : 4); }
      if (G.vis) G.fx.push({ k:'flash', c:'rgba(191,233,255,0.45)', t:0, life:0.9 });
      Hooks.sfx('freeze');
      break;
    case 'storm': {
      const list = G.enemies.filter(e => !e.dead);
      for (const e of list) if (!e.dead) damage(e, e.big ? 3000 : 1000, 'normal', null, { ignoreImmune:true });
      if (G.vis){ G.fx.push({ k:'flash', c:'rgba(255,190,110,0.5)', t:0, life:0.7 }); G.shake = Math.max(G.shake, 0.5); for (const e of list.slice(0, 40)) G.fx.push({ k:'boom', x:e.x, y:e.y, r: e.r * 1.6 + 10, t:0, life:0.4, c:'#ffb35c' }); }
      Hooks.sfx('boom');
      break;
    }
  }
  Profile.powers[id]--;
  if (!Profile.powers[id]) delete Profile.powers[id];
  Profile.stats.powers = (Profile.stats.powers || 0) + 1;
  checkAchievements();
  saveProfile();
  return { ok:true };
}
/* mousetraps snap up small walking pests; each trap has a few snaps */
function updatePowerTraps(dt){
  for (const tr of G.ptraps){
    tr.t += dt;
    if (tr.left <= 0) continue;
    for (const e of G.enemies){
      if (e.dead || e.big || e.def.fly || e.burrowT > 0) continue;
      if ((e.x - tr.x) ** 2 + (e.y - tr.y) ** 2 > (e.r + 16) ** 2) continue;
      kill(e, null);
      tr.left--; tr.snap = tr.t;
      if (G.vis) G.fx.push({ k:'boom', x: tr.x, y: tr.y, r: 18, t:0, life:0.25, c:'#fff2d6' });
      Hooks.sfx('whack');
      if (tr.left <= 0) break;
    }
  }
  if (G.ptraps.some(tr => tr.left <= 0 && tr.t - tr.snap > 0.6)) G.ptraps = G.ptraps.filter(tr => tr.left > 0 || tr.t - tr.snap <= 0.6);
}

/* ---------------- The Golden Roach ----------------
   Now and then a golden cockroach scuttles through a round. It never costs
   lives, but cook it before it escapes for bonus cash and Dough. */
function goldenChance(n){ return n >= 5 ? 0.18 : 0; }
function goldenHp(n){ return Math.max(30, 0.15 * threatTarget(n)) * waveRamp(n, G.D).hp; }
/* too slippery to freeze, stun or slow, and it darts ahead every few seconds */
function goldenTick(e, dt){
  e.freezeT = 0; e.stunT = 0; e.slowT = 0; e.slowMult = 1;
  e.dashCd -= dt;
  if (e.dashT > 0) e.dashT -= dt;
  if (e.dashCd <= 0){
    e.dashT = 0.5; e.dashCd = 3 + Math.random() * 1.5;
    if (G.vis) for (let i = 0; i < 6; i++) part(e.x, e.y, rand(-50, 50), rand(-50, 50), 0.45, '#ffe08a', 3, 'spark');
  }
}
function spawnGolden(){
  const e = spawnEnemy('roach', {});
  e.gold = true; e.camo = false; e.mold = false; e.armored = false;
  e.hp = e.maxHp = Math.round(goldenHp(G.round));
  e.speed *= 1.25; e.dashCd = 2;
  if (G.vis) G.fx.push({ k:'ring', x: e.x, y: e.y, r0: 6, r1: 50, t:0, life:0.6, c:'#ffd166', w:4 });
  Hooks.golden('spawn', e);
  return e;
}
function goldenCooked(e){
  if (G.attract) return;
  const cash = Math.round((60 + 12 * G.round) * (G.mod ? G.mod.cash : 1));
  addCash(cash);
  const dough = noRecords() || G.adminUsed ? 0 : addDough(Math.round((5 + G.round / 4) * (DOUGH_RATE[G.diff] || 1)));
  if (!noRecords()) Profile.stats.golden = (Profile.stats.golden || 0) + 1;
  if (G.vis) for (let i = 0; i < 30; i++){ const a = rand(0, TAU), v = rand(50, 220); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, 0.9, i % 3 ? '#ffd166' : '#fff4c2', 3.5, 'spark'); }
  Hooks.golden('cooked', e, cash, dough);
  checkAchievements();
}

/* ---------------- Achievements ----------------
   Each pays Dough once. Progress comes from lifetime stats, so wins and
   medals from before achievements existed count too. */
const medalCount = k => Object.values(Profile.medals).filter(m => m && m[k]).length;
const ACHIEVEMENTS = [
  { id:'win1',      name:'First Course',      desc:'Win a game.',                                  dough:100,  prog: S => [S.wins, 1] },
  { id:'easy',      name:'Bronze Spoon',      desc:'Win on Easy.',                                 dough:50,   prog: () => [medalCount('easy'), 1] },
  { id:'medium',    name:'Silver Ladle',      desc:'Win on Medium.',                               dough:100,  prog: () => [medalCount('medium'), 1] },
  { id:'hard',      name:'Gold Whisk',        desc:'Win on Hard.',                                 dough:200,  prog: () => [medalCount('hard'), 1] },
  { id:'michelin',  name:'Michelin Star',     desc:'Win on Michelin.',                             dough:500,  prog: () => [medalCount('michelin'), 1] },
  { id:'mastery',   name:'Promoted',          desc:'Win in Mastery Mode.',                         dough:300,  prog: () => [medalCount('mastery'), 1] },
  { id:'tour',      name:'Kitchen Tour',      desc:'Earn a medal on every kitchen.',               dough:200,  prog: () => [MAP_ORDER.filter(m => Profile.medals[m] && Object.values(Profile.medals[m]).some(Boolean)).length, MAP_ORDER.length] },
  { id:'fullset',   name:'Full Set',          desc:'Earn all five medals on one kitchen.',          dough:500,  prog: () => [Math.max(0, ...MAP_ORDER.map(m => DIFF_ORDER.concat('mastery').filter(k => (Profile.medals[m] || {})[k]).length)), 5] },
  { id:'tasting',   name:'Full Course',       desc:'Finish a Tasting Menu.',                      dough:400,  prog: S => [Math.min(1, S.tastings || 0), 1] },
  { id:'bossnight', name:'Boss Night',         desc:'Clear tier 3 of a Boss Night.',                dough:400,  prog: () => [Math.min(3, evStats().tiers), 3] },
  { id:'racer',     name:'Speed Service',     desc:'Finish three weekly races.',                   dough:300,  prog: () => [Math.min(3, evStats().races), 3] },
  { id:'styles',    name:'House Styles',      desc:'Earn five game-mode medals.',                 dough:300,  prog: () => [MAP_ORDER.reduce((n, m) => n + modeMedals(m).got, 0), 5] },
  { id:'table',     name:'Chef’s Table',      desc:'Win a Chef’s Table game.',                     dough:1000, prog: () => [medalCount('michelin:table'), 1] },
  { id:'fullhouse', name:'Full House',        desc:'Earn every game-mode medal on one kitchen.',   dough:1500, prog: () => [Math.max(0, ...MAP_ORDER.map(m => modeMedals(m).got)), MODE_ORDER.length] },
  { id:'flawless',  name:'Spotless',          desc:'Win a game without losing a single life.',     dough:300,  prog: S => [S.flawless || 0, 1] },
  { id:'cook1k',    name:'Line Cook',         desc:'Cook 1,000 pests.',                            dough:50,   prog: S => [S.cooked, 1000] },
  { id:'cook10k',   name:'Pest Control',      desc:'Cook 10,000 pests.',                           dough:150,  prog: S => [S.cooked, 10000] },
  { id:'cook100k',  name:'Exterminator',      desc:'Cook 100,000 pests.',                          dough:400,  prog: S => [S.cooked, 100000] },
  { id:'cook1m',    name:'Pantry Legend',     desc:'Cook 1,000,000 pests.',                        dough:1000, prog: S => [S.cooked, 1000000] },
  { id:'rounds100', name:'Shift Worker',      desc:'Clear 100 rounds in total.',                   dough:60,   prog: S => [S.rounds, 100] },
  { id:'rounds1k',  name:'Marathon',          desc:'Clear 1,000 rounds in total.',                 dough:300,  prog: S => [S.rounds, 1000] },
  { id:'r100',      name:'Century',           desc:'Reach round 100.',                             dough:300,  prog: S => [S.maxRound || 0, 100] },
  { id:'r150',      name:'Freeplay Hero',     desc:'Reach round 150.',                             dough:600,  prog: S => [S.maxRound || 0, 150] },
  { id:'t5',        name:'Top Tier',          desc:'Buy a tier 5 upgrade.',                        dough:100,  prog: S => [S.t5 || 0, 1] },
  { id:'t5x10',     name:'Five-Star Kitchen', desc:'Buy 10 tier 5 upgrades.',                      dough:250,  prog: S => [S.t5 || 0, 10] },
  { id:'paragon',   name:'Paragon',           desc:'Build a paragon.',                             dough:300,  prog: S => [S.paragons || 0, 1] },
  { id:'master',    name:'Executive Chef',    desc:'Reach Executive Chef mastery with any appliance.', dough:200, prog: () => [Math.max(0, ...BASE_TOWER_ORDER.map(t => rankOf(Profile.mastery[t] || 0))), 5] },
  { id:'boss',      name:'Boss Hunter',       desc:'Defeat a boss.',                               dough:100,  prog: S => [S.bosses || 0, 1] },
  { id:'boss10',    name:'Big Game',          desc:'Defeat 10 bosses.',                            dough:250,  prog: S => [S.bosses || 0, 10] },
  { id:'bossrush',  name:'Rush Hour Hero',    desc:'Clear the Boss Rush: every boss, one after another.', dough:800, prog: S => [S.rushes || 0, 1] },
  { id:'elite',     name:'Elite Exterminator', desc:'Beat all five tiers of a boss on Elite.',        dough:500,  prog: S => [S.eliteBosses || 0, 1] },
  { id:'bestiary',  name:'Rogues’ Gallery',   desc:'Defeat every one of the ' + BOSS_CYCLE.length + ' bosses at least once.', dough:600, prog: S => [BOSS_CYCLE.filter(k => (S.bossKinds || {})[k]).length, BOSS_CYCLE.length] },
  { id:'queen',     name:'Queen Slayer',      desc:'Defeat The Roach Queen.',                      dough:400,  prog: S => [S.queens || 0, 1] },
  { id:'golden',    name:'Gold Rush',         desc:'Cook a Golden Roach.',                         dough:50,   prog: S => [S.golden || 0, 1] },
  { id:'golden10',  name:'Gold Digger',       desc:'Cook 10 Golden Roaches.',                      dough:200,  prog: S => [S.golden || 0, 10] },
  { id:'abil100',   name:'Special Moves',     desc:'Use 100 abilities.',                           dough:100,  prog: S => [S.abilities || 0, 100] },
  { id:'powers10',  name:'Power Hungry',      desc:'Use 10 powers.',                               dough:80,   prog: S => [S.powers || 0, 10] },
  { id:'insta5',    name:'Ready Meals',       desc:'Place 5 insta appliances.',                    dough:80,   prog: S => [S.insta || 0, 5] },
  { id:'crates10',  name:'Collector',         desc:'Open 10 crates.',                              dough:150,  prog: S => [S.chests || 0, 10] },
  { id:'daily1',    name:'Daily Special',     desc:'Complete a daily challenge.',                  dough:100,  prog: S => [S.dailies || 0, 1] },
  { id:'daily7',    name:'Regular',           desc:'Complete 7 daily challenges.',                 dough:300,  prog: S => [S.dailies || 0, 7] },
  { id:'streak7',   name:'Loyal Customer',    desc:'Open the daily chest 7 days in a row.',        dough:200,  prog: () => [Profile.daily.best || 0, 7] },
  { id:'rich',      name:'High Roller',       desc:'Hold $100,000 at the end of a round.',          dough:100,  prog: S => [S.maxCash || 0, 100000] },
  { id:'lvl10',     name:'Chef Level 10',     desc:'Reach chef level 10.',                         dough:100,  prog: () => [chefLevel(Profile.chef.xp).level, 10] },
  { id:'lvl25',     name:'Chef Level 25',     desc:'Reach chef level 25.',                         dough:300,  prog: () => [chefLevel(Profile.chef.xp).level, 25] },
  { id:'lvl50',     name:'Chef Level 50',     desc:'Reach chef level 50.',                         dough:800,  prog: () => [chefLevel(Profile.chef.xp).level, 50] },
];
function achProgress(A){ const [cur, goal] = A.prog(Profile.stats); return { cur: Math.min(cur || 0, goal), goal, done: !!Profile.ach[A.id] }; }
/* unlocks anything newly earned; quiet skips the announcements (used when loading old saves) */
function checkAchievements(quiet){
  if ((G.attract || noRecords()) && !quiet) return [];
  const got = [];
  for (const A of ACHIEVEMENTS){
    if (Profile.ach[A.id]) continue;
    let ok = false;
    try { const [cur, goal] = A.prog(Profile.stats); ok = cur >= goal; } catch (e) {}
    if (!ok) continue;
    Profile.ach[A.id] = 1;
    got.push(A);
  }
  for (const A of got){ addDough(A.dough); if (!quiet) Hooks.achievement(A); }
  if (got.length) saveProfile();
  return got;
}

/* ---------------- Saves ----------------
   Brings the progression fields of a stored profile into shape. */
function mergeMeta(out, p){
  const num = v => Math.max(0, Math.floor(Number(v) || 0));
  const counts = src => { const o = {}; if (src && typeof src === 'object' && !Array.isArray(src)) for (const k in src){ const v = num(src[k]); if (v > 0) o[k] = v; } return o; };
  out.dough = num(p.dough);
  out.chef = { xp: num(p.chef && p.chef.xp) };
  out.powers = counts(p.powers);
  for (const k in out.powers) if (!POWERS[k]) delete out.powers[k];
  out.insta = counts(p.insta);
  out.crates = counts(p.crates);
  for (const k in out.crates) if (!CRATES[k]) delete out.crates[k];
  out.ach = {};
  if (p.ach && typeof p.ach === 'object') for (const k in p.ach) if (p.ach[k]) out.ach[k] = 1;
  const d = p.daily && typeof p.daily === 'object' ? p.daily : {};
  out.daily = { last: typeof d.last === 'string' && /^\d{4}-\d\d-\d\d$/.test(d.last) ? d.last : '', streak: num(d.streak), best: num(d.best), ch: {} };
  if (d.ch && typeof d.ch === 'object') for (const k of Object.keys(d.ch).filter(k => /^\d{4}-\d\d-\d\d$/.test(k)).sort().slice(-120)) out.daily.ch[k] = 1;
  return out;
}
