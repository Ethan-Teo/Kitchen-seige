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
function defaultGameMod(){ return { v:1, name:'My Mod', by:'', blurb:'', rules:{}, towers:{}, pests:{}, flags:{}, buffs:[], created:0 }; }
/* purchasable buffs: bought with cash during a game, for a while (dur seconds of rounds) or for the rest of the game (dur 0) */
const GM_BUFF_MAX = 12;
const GM_BUFF = { cost:['Price $', 1, 1e9, 1000], dur:['Lasts (s, 0 = rest of game)', 0, 3600, 30], dmg:['Damage ×', 0.1, 100, 1], rate:['Attack speed ×', 0.1, 20, 1], range:['Range ×', 0.5, 4, 1], pierce:['Pierce +', 0, 1000, 0], income:['Cash from pests ×', 0, 50, 1], lives:['Lives +', 0, 1000000, 0], max:['Times you can buy it (0 = any)', 0, 999, 0] };
function cleanBuff(b){
  if (!b || typeof b !== 'object') return null;
  const o = { name: cleanText(b.name, 24, 'Buff') };
  for (const k in GM_BUFF){ const [, lo, hi, def] = GM_BUFF[k]; const v = b[k] == null || b[k] === '' ? def : GM_NUM(b[k], lo, hi, def); o[k] = ['cost', 'dur', 'pierce', 'lives', 'max'].includes(k) ? Math.round(v) : v; }
  if (b.camo) o.camo = true;
  if (b.allTypes) o.allTypes = true;
  return o;
}
function buffSummary(b, noMax){
  const x = [];
  if (b.dmg !== 1) x.push('damage ×' + b.dmg);
  if (b.rate !== 1) x.push('attack speed ×' + b.rate);
  if (b.range !== 1) x.push('range ×' + b.range);
  if (b.pierce) x.push('+' + b.pierce + ' pierce');
  if (b.camo) x.push('see ghosts');
  if (b.allTypes) x.push('hit any pest type');
  if (b.income !== 1) x.push('pest cash ×' + b.income);
  if (b.lives) x.push('+' + gmFmt(b.lives) + ' lives');
  const timed = b.dur > 0 && (x.length > (b.lives ? 1 : 0));
  return (x.length ? x.join(', ') : 'does nothing yet') + (b.lives && x.length === 1 ? '' : timed ? ' for ' + b.dur + 's of rounds' : ' for the rest of the game') + (b.max && !noMax ? ' · ' + (b.max === 1 ? 'once a game' : 'up to ' + b.max + ' times') : '');
}
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
  m.buffs = (Array.isArray(src.buffs) ? src.buffs : []).slice(0, GM_BUFF_MAX).map(cleanBuff).filter(Boolean);
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
  if (m.buffs && m.buffs.length) out.push(m.buffs.length + (m.buffs.length === 1 ? ' buff' : ' buffs') + ' to buy (' + m.buffs.map(b => b.name + ' $' + gmFmt(b.cost)).join(', ') + ')');
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
  buffshop:{ name:'Buff Shop', blurb:'Buy buffs with your cash from the shop during the game, all the way up to the God Boost for $1,000,000.', buffs:[
    { name:'Sharpen Up', cost:400, dur:30, dmg:1.25 },
    { name:'Espresso Shot', cost:900, dur:30, rate:1.4 },
    { name:'Eagle Eye', cost:1500, dur:45, range:1.3, camo:true },
    { name:'Overtime Pay', cost:3000, dur:60, income:2 },
    { name:'Extra Lives', cost:5000, lives:50, max:5 },
    { name:'Rage Mode', cost:25000, dur:30, dmg:2, rate:1.5, pierce:3 },
    { name:'Chef’s Blessing', cost:150000, dur:60, dmg:3, rate:2, range:1.25, allTypes:true },
    { name:'God Boost', cost:1000000, dur:0, dmg:10, rate:3, range:1.5, pierce:20, camo:true, allTypes:true, max:1 },
  ] },
};

/* ---------------- applying mods ---------------- */
/* the mods switched on, stacked into one: multipliers multiply, the last number set wins, bans add up */
function stackGameMods(ids){
  const list = ids.map(gameModById).filter(Boolean);
  if (!list.length) return null;
  const out = { names: list.map(m => m.name), rules:{}, flags:{}, towers:{}, pests:{}, buffs:[] };
  const mulKeys = { hp:1, speed:1, income:1, price:1 };
  for (const m of list){
    for (const k in m.rules){ if (mulKeys[k]) out.rules[k] = (out.rules[k] || 1) * m.rules[k]; else if (k === 'maxTier') out.rules.maxTier = Math.min(out.rules.maxTier == null ? 5 : out.rules.maxTier, m.rules.maxTier); else out.rules[k] = m.rules[k]; }
    Object.assign(out.flags, m.flags);
    for (const t in m.towers){ const o = out.towers[t] || (out.towers[t] = {}), s = m.towers[t]; for (const k in s){ if (k === 'ban') o.ban = true; else if (k === 'pierce') o.pierce = (o.pierce || 0) + s.pierce; else o[k] = (o[k] || 1) * s[k]; } }
    for (const p in m.pests){ const o = out.pests[p] || (out.pests[p] = {}), s = m.pests[p]; for (const k in s) o[k] = (o[k] || 1) * s[k]; }
  }
  for (const m of list) for (const b of (m.buffs || [])) out.buffs.push(Object.assign({}, b));
  return out;
}
/* a game takes on its mods: `fresh` for a new game (start cash and lives), not for a loaded one */
function applyGameMods(M, fresh){
  if (!M) return;
  G.mods = M;
  if (!Array.isArray(M.buffs)) M.buffs = [];
  G.gmBuffs = []; G.gmBought = {};
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

/* ---------------- buying buffs in a game ---------------- */
function gmBuffs(){ return G.mods && G.mods.buffs ? G.mods.buffs : []; }
function gmBuffActive(i){ return (G.gmBuffs || []).find(a => a.i === i) || null; }
function buyGameBuff(i){
  const b = gmBuffs()[i];
  if (!b) return { ok:false, why:'No such buff' };
  if (!G.active || G.over) return { ok:false, why:'Start a game first' };
  if (typeof Coop !== 'undefined' && Coop.on && Coop.role === 'guest') return { ok:false, why:'In co-op, the host buys buffs' };
  const n = (G.gmBought && G.gmBought[i]) || 0;
  if (b.max && n >= b.max) return { ok:false, why:'You can buy ' + b.name + ' only ' + b.max + (b.max === 1 ? ' time' : ' times') };
  const act = gmBuffActive(i);
  if (act && !(act.left < Infinity)) return { ok:false, why: b.name + ' already lasts the rest of the game' };
  if (!canAfford(b.cost)) return { ok:false, why:'Need $' + gmFmt(b.cost - G.cash) + ' more' };
  spend(b.cost);
  G.gmBought[i] = n + 1;
  if (b.lives) G.lives += b.lives;
  const effects = b.dmg !== 1 || b.rate !== 1 || b.range !== 1 || b.pierce || b.camo || b.allTypes || b.income !== 1;
  if (effects){
    if (act) act.left += b.dur;
    else G.gmBuffs.push({ i, left: b.dur > 0 ? b.dur : Infinity });
    gmBuffsChanged();
  }
  Hooks.sfx('rank');
  return { ok:true };
}
/* the buffs running now, stacked */
function gmBuffNow(){
  const out = { dmg:1, rate:1, range:1, pierce:0, income:1, camo:false, allTypes:false, any:false };
  const B = gmBuffs();
  for (const a of (G.gmBuffs || [])){
    const b = B[a.i]; if (!b) continue;
    out.any = true;
    out.dmg *= b.dmg; out.rate *= b.rate; out.range *= b.range; out.pierce += b.pierce; out.income *= b.income;
    if (b.camo) out.camo = true;
    if (b.allTypes) out.allTypes = true;
  }
  return out;
}
function gmBuffsChanged(){
  const N = gmBuffNow();
  if (G.gmBaseCash == null) G.gmBaseCash = G.mod.cash;
  G.mod.cash = G.gmBaseCash * N.income;
  refreshTowers();
}
/* an appliance's stats with the running buffs on top */
function gmBuffStats(t, s){
  if (!G.gmBuffs || !G.gmBuffs.length) return;
  const N = gmBuffNow();
  if (!N.any) return;
  if (!s.global) s.range *= N.range;
  if (N.camo) s.camo = true;
  if (N.allTypes) s.allTypes = true;
  const scale = a => {
    if (!a || typeof a !== 'object') return;
    if (a.dmg > 0) a.dmg *= N.dmg;
    if (a.bonusBig) a.bonusBig *= N.dmg;
    if (a.bonusBoss) a.bonusBoss *= N.dmg;
    for (const k of ['explode', 'impact', 'radial', 'mine', 'splash', 'frag', 'stream', 'burn']) if (a[k] && a[k].dmg > 0) a[k].dmg *= N.dmg;
    if (a.rate > 0) a.rate /= N.rate;
    if (N.pierce && a.pierce != null) a.pierce += N.pierce;
  };
  for (const id in s.atk) scale(s.atk[id]);
  if (s.aura && s.aura.dmg) s.aura.dmg *= N.dmg;
}
/* timed buffs run down while rounds are on */
function gmBuffTick(dt){
  if (!G.gmBuffs || !G.gmBuffs.length || !G.roundActive) return;
  let gone = false;
  for (const a of G.gmBuffs) if (a.left < Infinity){ a.left -= dt; if (a.left <= 0) gone = true; }
  if (gone){ G.gmBuffs = G.gmBuffs.filter(a => a.left > 0); gmBuffsChanged(); }
}
function gmBuffSave(){ return G.gmBuffs && (G.gmBuffs.length || Object.keys(G.gmBought || {}).length) ? { a: G.gmBuffs.map(a => [a.i, a.left < Infinity ? Math.round(a.left * 10) / 10 : -1]), n: G.gmBought } : undefined; }
function gmBuffLoad(d){
  if (!d || !G.mods) return;
  const B = gmBuffs();
  G.gmBuffs = (Array.isArray(d.a) ? d.a : []).filter(x => Array.isArray(x) && B[x[0]]).map(x => ({ i: x[0], left: x[1] < 0 ? Infinity : Math.max(0, +x[1] || 0) }));
  G.gmBought = {};
  if (d.n && typeof d.n === 'object') for (const k in d.n) if (B[k]) G.gmBought[k] = Math.max(0, Math.floor(+d.n[k] || 0));
  G.gmBaseCash = null;
  gmBuffsChanged();
}
