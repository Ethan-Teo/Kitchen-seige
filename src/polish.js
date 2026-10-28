'use strict';
/* =====================================================================
   Kitchen Siege — the game's own record: round history and build replay
   G.hist: one entry per cleared round (lives, cash, pests cooked, leaks,
   cash earned, damage dealt) for the end-of-game stats screen.
   G.blog: the build, as changes between rounds: an appliance added
   ['a', round, id, type, x, y, up], upgraded ['u', round, id, up],
   or gone ['d', round, id]. The replay steps through it round by round.
   Both go in the save (hs and bl) and are trimmed so a long freeplay game
   stays small.
   ===================================================================== */
const HIST_MAX = 400, BLOG_MAX = 3000;
function histRoundEnd(n){
  if (!G.hist) G.hist = [];
  G.hist.push([n, Math.max(0, Math.round(G.lives)), Math.floor(G.cash), G.stats.kills, G.stats.leaked, Math.round(G.stats.earned), Math.round(G.stats.damage)]);
  if (G.hist.length > HIST_MAX) G.hist.splice(0, G.hist.length - HIST_MAX);
  buildLogTick(n + 1);
}
/* what the build looks like now, by appliance id */
function buildNow(){
  const m = {};
  for (const t of G.towers) if (!t.minion && !t.clone) m[t.id] = { type: t.type, x: Math.round(t.x), y: Math.round(t.y), up: (t.paragon ? [9, 9, 9] : t.up).join('') };
  return m;
}
/* record what changed since the last look, as of round r */
function buildLogTick(r){
  if (!G.blog) G.blog = [];
  r = r || G.round;
  const now = buildNow(), prev = G.blPrev || {};
  for (const id in prev) if (!now[id]) G.blog.push(['d', r, +id]);
  for (const id in now){
    const a = now[id], b = prev[id];
    if (!b) G.blog.push(['a', r, +id, a.type, a.x, a.y, a.up]);
    else if (b.up !== a.up) G.blog.push(['u', r, +id, a.up]);
  }
  G.blPrev = now;
  if (G.blog.length > BLOG_MAX) G.blog.splice(0, G.blog.length - BLOG_MAX);
}
/* the build as it stood at the start of round r */
function buildAt(r, log){
  const m = {};
  for (const e of log || G.blog || []){
    if (e[1] > r) break;
    if (e[0] === 'a') m[e[2]] = { type: e[3], x: e[4], y: e[5], up: e[6] };
    else if (e[0] === 'u' && m[e[2]]) m[e[2]].up = e[3];
    else if (e[0] === 'd') delete m[e[2]];
  }
  return m;
}
function buildRounds(log){ const s = new Set((log || G.blog || []).map(e => e[1])); return [...s].sort((a, b) => a - b); }
/* the game's totals and its busiest appliances, for the stats screen */
function gameSummary(){
  const by = {};
  for (const t of G.towers){
    const k = t.type;
    if (!by[k]) by[k] = { type: k, n: 0, dmg: 0, kills: 0, spent: 0 };
    by[k].n++; by[k].dmg += t.dmg || 0; by[k].kills += t.kills || 0; by[k].spent += t.invested || 0;
  }
  const kinds = Object.values(by).sort((a, b) => b.dmg - a.dmg);
  const top = G.towers.slice().sort((a, b) => (b.dmg || 0) - (a.dmg || 0)).slice(0, 5).map(t => ({ type: t.type, up: t.paragon ? null : t.up.slice(), paragon: !!t.paragon, dmg: Math.round(t.dmg || 0), kills: t.kills || 0 }));
  const H = G.hist || [];
  const leakRounds = H.filter((e, i) => e[4] > (i ? H[i - 1][4] : 0)).map(e => e[0]);
  return { rounds: Math.max(0, G.round - G.stats.start), kills: G.stats.kills, leaked: G.stats.leaked, earned: Math.round(G.stats.earned), damage: Math.round(G.stats.damage), towers: G.towers.length, kinds, top, leakRounds, hist: H.slice() };
}
/* ---------------- shop favourites ----------------
   Starred appliances sit at the top of the shop under Favourites. */
const FAV_MAX = 12;
function favList(){ const f = Profile.settings.favs; return Array.isArray(f) ? f.filter(t => TOWERS[t] && !TOWERS[t].hero) : []; }
function toggleFav(type){
  if (!TOWERS[type] || TOWERS[type].hero) return false;
  const f = favList(), i = f.indexOf(type);
  if (i >= 0) f.splice(i, 1); else { if (f.length >= FAV_MAX) f.shift(); f.push(type); }
  Profile.settings.favs = f;
  saveProfile();
  return i < 0;
}
