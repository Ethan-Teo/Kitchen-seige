'use strict';
/* =====================================================================
   Kitchen Siege — mods (the Mod Maker's data)
   A mod changes the rules of an ordinary game. It is plain data, never
   code, so a mod code from anyone is safe to load:
     rules    start cash, lives, the round you win on, pest health and
              speed, cash from pests, prices, the highest upgrade tier,
              no abilities, no selling
     towers   per appliance (or 'all'): damage, attack speed, range and
              pierce, price, or banned from the shop
     pests    per pest (or 'all'): health, speed and the cash it pays
   Mods live on the profile (Profile.gmods); the ones switched on
   (Profile.gmodOn) stack, and apply to new ordinary games: not daily
   challenges, events, expeditions or the Tasting Menu. A modded game
   carries its mods in its save (md), earns no medals, Dough or
   achievements, and says so. Share codes start KSX1:.
   ===================================================================== */
const GMOD_MAX = 24, GMOD_PREFIX = 'KSX1:';
const GM_NUM = (v, lo, hi, def) => { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v * 100) / 100)) : def; };
/* what can be changed, with its limits: [label, min, max, default] */
const GM_RULES = {
  cash:    ['Starting cash', 0, 10000000, null],
  lives:   ['Starting lives', 1, 100000, null],
  win:     ['Win on round', 5, 500, null],
  hp:      ['Pest health ×', 0.1, 20, 1],
  speed:   ['Pest speed ×', 0.25, 4, 1],
  income:  ['Cash from pests ×', 0, 20, 1],
  price:   ['Prices ×', 0.1, 10, 1],
  maxTier: ['Highest upgrade tier', 0, 5, 5],
};
const GM_TOWER = { dmg:['Damage ×', 0.1, 20, 1], rate:['Attack speed ×', 0.1, 10, 1], range:['Range ×', 0.3, 4, 1], pierce:['Pierce +', -10, 100, 0], cost:['Price ×', 0.1, 10, 1] };
const GM_PEST = { hp:['Health ×', 0.1, 20, 1], speed:['Speed ×', 0.25, 4, 1], cash:['Cash ×', 0, 20, 1] };
function defaultGameMod(){ return { v:1, name:'My Mod', by:'', blurb:'', rules:{}, towers:{}, pests:{}, flags:{}, created:0 }; }
function cleanGameMod(src){
  src = src && typeof src === 'object' ? src : {};
  const m = defaultGameMod();
  m.name = cleanText(src.name, 28, 'My Mod');
  m.by = cleanText(src.by, 24, '');
  m.blurb = cleanText(src.blurb, 160, '');
  const R = src.rules && typeof src.rules === 'object' ? src.rules : {};
  for (const k in GM_RULES){
    const [, lo, hi, def] = GM_RULES[k];
    if (R[k] == null || R[k] === '') continue;
    const v = GM_NUM(R[k], lo, hi, def);
    if (v != null && v !== def) m.rules[k] = k === 'maxTier' || k === 'lives' || k === 'win' || k === 'cash' ? Math.round(v) : v;
  }
  const F = src.flags && typeof src.flags === 'object' ? src.flags : {};
  for (const k of ['noAbilities', 'noSell', 'noPowers']) if (F[k]) m.flags[k] = true;
  const T = src.towers && typeof src.towers === 'object' ? src.towers : {};
  for (const type in T){
    if (type !== 'all' && !(TOWERS[type] && !TOWERS[type].custom && !TOWERS[type].admin)) continue;
    const o = {}, s = T[type] || {};
    for (const k in GM_TOWER){ const [, lo, hi, def] = GM_TOWER[k]; if (s[k] == null || s[k] === '') continue; const v = GM_NUM(s[k], lo, hi, def); if (v !== def) o[k] = k === 'pierce' ? Math.round(v) : v; }
    if (s.ban && type !== 'all' && !TOWERS[type].hero) o.ban = true;
    if (Object.keys(o).length) m.towers[type] = o;
  }
  const P = src.pests && typeof src.pests === 'object' ? src.pests : {};
  for (const type in P){
    if (type !== 'all' && !ENEMIES[type]) continue;
    const o = {}, s = P[type] || {};
    for (const k in GM_PEST){ const [, lo, hi, def] = GM_PEST[k]; if (s[k] == null || s[k] === '') continue; const v = GM_NUM(s[k], lo, hi, def); if (v !== def) o[k] = v; }
    if (Object.keys(o).length) m.pests[type] = o;
  }
  m.created = Number(src.created) || 0;
  return m;
}
/* a one-line summary of what a mod changes */
const gmFmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function gameModSummary(m){
  const out = [], x = v => '×' + v;
  const R = m.rules;
  if (R.cash != null) out.push('start with $' + gmFmt(R.cash));
  if (R.lives != null) out.push(gmFmt(R.lives) + ' lives');
  if (R.win != null) out.push('win on round ' + R.win);
  if (R.hp != null) out.push('pest health ' + x(R.hp));
  if (R.speed != null) out.push('pest speed ' + x(R.speed));
  if (R.income != null) out.push('pest cash ' + x(R.income));
  if (R.price != null) out.push('prices ' + x(R.price));
  if (R.maxTier != null) out.push('upgrades stop at tier ' + R.maxTier);
  if (m.flags.noAbilities) out.push('no abilities');
  if (m.flags.noSell) out.push('no selling');
  if (m.flags.noPowers) out.push('no powers');
  const tName = t => t === 'all' ? 'all appliances' : TOWERS[t].name;
  for (const t in m.towers){
    const o = m.towers[t];
    if (o.ban){ out.push(tName(t) + ' banned'); continue; }
    const bits = [];
    if (o.dmg != null) bits.push('damage ' + x(o.dmg));
    if (o.rate != null) bits.push('speed ' + x(o.rate));
    if (o.range != null) bits.push('range ' + x(o.range));
    if (o.pierce) bits.push('pierce ' + (o.pierce > 0 ? '+' : '') + o.pierce);
    if (o.cost != null) bits.push('price ' + x(o.cost));
    if (bits.length) out.push(tName(t) + ': ' + bits.join(', '));
  }
  for (const p in m.pests){
    const o = m.pests[p], bits = [];
    if (o.hp != null) bits.push('health ' + x(o.hp));
    if (o.speed != null) bits.push('speed ' + x(o.speed));
    if (o.cash != null) bits.push('cash ' + x(o.cash));
    if (bits.length) out.push((p === 'all' ? 'all pests' : ENEMIES[p].name) + ': ' + bits.join(', '));
  }
  return out.length ? out.join(' · ') : 'Changes nothing yet.';
}

/* ---------------- the library ---------------- */
function gameModStore(){ if (!Profile.gmods || typeof Profile.gmods !== 'object' || Array.isArray(Profile.gmods)) Profile.gmods = {}; return Profile.gmods; }
function gameModList(){ const S = gameModStore(); return Object.keys(S).sort((a, b) => (S[a].created || 0) - (S[b].created || 0)); }
function gameModById(id){ const S = gameModStore(); return id && S[id] ? S[id] : null; }
function gameModsOn(){ const on = Array.isArray(Profile.gmodOn) ? Profile.gmodOn : []; return on.filter(id => gameModById(id)); }
function setGameModOn(id, on){
  const list = gameModsOn().filter(x => x !== id);
  if (on && gameModById(id)) list.push(id);
  Profile.gmodOn = list; saveProfile();
}
function saveGameMod(m, id){
  const S = gameModStore();
  if (!id && Object.keys(S).length >= GMOD_MAX) return null;
  if (!id){ let n = 1; while (S['gm' + n]) n++; id = 'gm' + n; }
  const c = cleanGameMod(m);
  c.created = (S[id] && S[id].created) || Date.now();
  S[id] = c;
  saveProfile();
  return id;
}
function deleteGameMod(id){
  const S = gameModStore();
  if (!S[id]) return false;
  delete S[id];
  Profile.gmodOn = gameModsOn().filter(x => x !== id);
  saveProfile();
  return true;
}
function gameModCode(m){ const c = cleanGameMod(m); delete c.created; return GMOD_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(c)))); }
function gameModFromCode(code){
  code = String(code || '').trim().replace(/\s+/g, '');
  if (!code.startsWith(GMOD_PREFIX)) throw new Error('A mod code starts with ' + GMOD_PREFIX);
  let o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(code.slice(GMOD_PREFIX.length))))); } catch (e) { throw new Error('That code is damaged or incomplete.'); }
  return cleanGameMod(o);
}
/* example mods to start from */
const GM_PRESETS = {
  glass:  { name:'Glass Cannons', blurb:'Everything hits twice as hard and costs half again as much.', towers:{ all:{ dmg:2, cost:1.5 } } },
  rush:   { name:'Rush Hour', blurb:'Pests run 50% faster but pay 50% more.', rules:{ speed:1.5, income:1.5 } },
  swarm:  { name:'Pest Paradise', blurb:'Pests are twice as tough and pay twice as much.', rules:{ hp:2, income:2 } },
  basics: { name:'Back to Basics', blurb:'Upgrades stop at tier 3, no abilities, and you start rich.', rules:{ maxTier:3, cash:3000 }, flags:{ noAbilities:true } },
  knives: { name:'Knife Party', blurb:'Knife Blocks are cheap and deadly; nothing else is half as good.', towers:{ knife:{ dmg:3, rate:1.5, cost:0.5 }, all:{ dmg:0.5 } } },
  marathon:{ name:'Marathon', blurb:'Win on round 100 with 500 lives.', rules:{ win:100, lives:500 } },
};

/* ---------------- applying mods ---------------- */
/* the mods switched on, stacked into one: multipliers multiply, the last number set wins, bans add up */
function stackGameMods(ids){
  const list = ids.map(gameModById).filter(Boolean);
  if (!list.length) return null;
  const out = { names: list.map(m => m.name), rules:{}, flags:{}, towers:{}, pests:{} };
  const mulKeys = { hp:1, speed:1, income:1, price:1 };
  for (const m of list){
    for (const k in m.rules){ if (mulKeys[k]) out.rules[k] = (out.rules[k] || 1) * m.rules[k]; else if (k === 'maxTier') out.rules.maxTier = Math.min(out.rules.maxTier == null ? 5 : out.rules.maxTier, m.rules.maxTier); else out.rules[k] = m.rules[k]; }
    Object.assign(out.flags, m.flags);
    for (const t in m.towers){ const o = out.towers[t] || (out.towers[t] = {}), s = m.towers[t]; for (const k in s){ if (k === 'ban') o.ban = true; else if (k === 'pierce') o.pierce = (o.pierce || 0) + s.pierce; else o[k] = (o[k] || 1) * s[k]; } }
    for (const p in m.pests){ const o = out.pests[p] || (out.pests[p] = {}), s = m.pests[p]; for (const k in s) o[k] = (o[k] || 1) * s[k]; }
  }
  return out;
}
/* a game takes on its mods: `fresh` for a new game (start cash and lives), not for a loaded one */
function applyGameMods(M, fresh){
  if (!M) return;
  G.mods = M;
  const R = M.rules;
  G.mod = Object.assign({}, G.mod);
  if (R.hp) { G.mod.hp *= R.hp; G.mod.bigHp *= R.hp; }
  if (R.speed) G.mod.speed *= R.speed;
  if (R.income != null) G.mod.cash *= R.income;
  if (R.price) G.mod.price *= R.price;
  if (R.maxTier != null) G.mod.maxTier = Math.min(G.mod.maxTier, R.maxTier);
  if (M.flags.noAbilities) G.mod.noAbilities = true;
  if (M.flags.noSell) G.mod.noSell = true;
  if (R.win) G.win = R.win;
  if (fresh){
    if (R.cash != null) G.cash = R.cash;
    if (R.lives != null){ G.lives = R.lives; G.startLives = R.lives; }
  }
}
/* the mods for a new game: only ordinary games take them */
function gameModsForNew(ch, ev){ return ch || ev ? null : stackGameMods(gameModsOn()); }
function gmTower(type){ const M = G.mods; if (!M) return null; const a = M.towers.all, b = M.towers[type]; if (!a && !b) return null; return { a: a || {}, b: b || {} }; }
function gmBanned(type){ const M = G.mods; return !!(M && M.towers[type] && M.towers[type].ban); }
function gmCost(type){ const t = gmTower(type); return t ? (t.a.cost || 1) * (t.b.cost || 1) : 1; }
/* an appliance's stats, changed by the mods */
function gmStats(t, s){
  const T = gmTower(t.type);
  if (!T) return;
  const dmg = (T.a.dmg || 1) * (T.b.dmg || 1), rate = (T.a.rate || 1) * (T.b.rate || 1), range = (T.a.range || 1) * (T.b.range || 1), pierce = (T.a.pierce || 0) + (T.b.pierce || 0);
  if (!s.global) s.range *= range;
  const scale = a => {
    if (!a || typeof a !== 'object') return;
    if (a.dmg > 0) a.dmg *= dmg;
    if (a.bonusBig) a.bonusBig *= dmg;
    if (a.bonusBoss) a.bonusBoss *= dmg;
    for (const k of ['explode', 'impact', 'radial', 'mine', 'splash', 'frag', 'stream', 'burn']) if (a[k] && a[k].dmg > 0) a[k].dmg *= dmg;
    if (a.rate > 0) a.rate /= rate;
    if (pierce && a.pierce != null) a.pierce = Math.max(1, a.pierce + pierce);
  };
  for (const id in s.atk) scale(s.atk[id]);
  if (s.aura && s.aura.dmg) s.aura.dmg *= dmg;
}
/* a pest as it spawns, changed by the mods */
function gmPest(e){
  const M = G.mods; if (!M) return;
  const a = M.pests.all || {}, b = M.pests[e.type] || {};
  const hp = (a.hp || 1) * (b.hp || 1), sp = (a.speed || 1) * (b.speed || 1), cash = (a.cash == null ? 1 : a.cash) * (b.cash == null ? 1 : b.cash);
  if (hp !== 1){ e.hp *= hp; e.maxHp *= hp; }
  if (sp !== 1) e.speed *= sp;
  if (cash !== 1) e.payMul = (e.payMul || 1) * cash;
}
