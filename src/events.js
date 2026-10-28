'use strict';
/* =====================================================================
   Kitchen Siege — weekly events: Boss Night and the Race
   Every week (Monday to Sunday) brings the same two events to everyone:
     Boss Night  one boss comes back five times, at rounds 20, 40, 60, 80
                 and 100, tougher each time (tiers 1 to 5), on a set kitchen
                 on Hard. The clock runs while rounds are in play; every
                 tier cleared is a time on the board.
     The Race    clear a set stretch of rounds on a set kitchen as fast as
                 the kitchen clock allows: rounds start by themselves the
                 moment the last is cleared, and the clock only runs while
                 pests are on the trail.
   No powers or insta appliances in either. Retries are allowed but each
   one adds half a minute to the clock. Bests are kept on this device's
   profile: the Best Times board is yours, week by week.
   ===================================================================== */
const EV_TIERS = [20, 40, 60, 80, 100];
/* each tier's boss: this much more health than a plain level-1 boss */
const EV_TIER_HP = [1, 2.6, 6.5, 16, 40];
/* the bosses differ a lot in health (a rat king to the roach queen), so the event evens them out a little */
/* and the bosses with a nasty trick (knocking out appliances, healing, plates, fading) have less health to make up for it */
const BOSS_EASE = { dustdevil: 0.55, moth: 0.6, beetle: 0.65, phantom: 0.75, pepper: 0.8, skunk: 0.85, mole: 0.55, queen: 0.5 };
function evBossNorm(type){ const def = ENEMIES[type]; return Math.max(0.5, Math.min(1.8, Math.pow(8000 / def.hp, 0.35))) * (BOSS_EASE[type] || 1); }
const EV_RETRY_PENALTY = 30;
/* ---------------- Boss Battles: the bosses' own game mode ----------------
   Bosses only come in their own fights now (and on Boss Night):
     a Boss Battle   any boss, any kitchen, Normal or Elite: from round 16
                     with the cash for it, the boss at rounds 20, 40, 60, 80
                     and 100, tougher each time
     the Boss Rush   all of them in turn, one every five rounds from 20 to 80
   Each tier cleared for the first time pays Dough; best times are kept. */
const BB_START = [16, 3400];
const BB_RUSH_TIERS = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
const BB_REWARD_TIER = [60, 90, 140, 220, 400], BB_REWARD_RUSH = 1000;
const BB_ELITE = { hp: 1.6, lvl: 2, pay: 2 };
/* the boss fights are a mode to play through, not the weekly test: bosses there have less health than on Boss Night */
const BB_SCALE = { hp: 0.25 };
function battleEvent(boss, map, elite){
  return { kind:'battle', boss, map, elite: !!elite, diff: elite ? 'hard' : 'medium', tiers: EV_TIERS.slice(), week: weekKey(),
    name: ENEMIES[boss].name.replace(/^The /, '') + (elite ? ' · Elite' : '') };
}
function rushEvent(map, elite){
  return { kind:'rush', order: BOSS_CYCLE.slice(), map, elite: !!elite, diff: elite ? 'hard' : 'medium', tiers: BB_RUSH_TIERS.slice(), week: weekKey(),
    name: 'Boss Rush' + (elite ? ' · Elite' : '') };
}
function isBossEv(ev){ return !!ev && (ev.kind === 'boss' || ev.kind === 'battle' || ev.kind === 'rush'); }
/* the boss of a tier, its level and its extra health */
function evBossAt(tier){ return G.ev.order ? G.ev.order[tier - 1] : G.ev.boss; }
function evTierHp(tier){
  const n = G.ev.tiers[tier - 1];
  /* along the rounds 20..100 curve of the five tiers, so the rush's thirteen line up with it */
  const x = clamp((n - 20) / 20, 0, 4), i = Math.min(3, Math.floor(x)), f = x - i;
  const hp = EV_TIER_HP[i] * Math.pow(EV_TIER_HP[i + 1] / EV_TIER_HP[i], f);
  /* a boss fight eases in: the early tiers come before a kitchen has much to fight with */
  const bb = G.ev.kind === 'boss' ? 1 : BB_SCALE.hp * Math.min(1, 0.2 + 0.8 * Math.pow((n - 20) / 60, 1.3));
  return hp * bb * (G.ev.elite ? BB_ELITE.hp : 1);
}
function evTierLevel(tier){
  const base = G.ev.kind === 'rush' ? 1 + Math.floor((tier - 1) / 3) : tier;
  return base + (G.ev.elite ? BB_ELITE.lvl : 0);
}
/* what the profile keeps of the boss fights */
function bbRecord(ev){
  const B = Profile.battles || (Profile.battles = {});
  const key = ev.kind === 'rush' ? '_rush' : ev.boss, side = ev.elite ? 'elite' : 'normal';
  const r = B[key] || (B[key] = {});
  return r[side] || (r[side] = { tiers: 0, times: [], tries: 0 });
}
const EV_REWARD_TIER = [100, 150, 250, 400, 700];
const EV_REWARD_RACE = 250;
/* the ISO week of a date, as 'YYYY-Www' */
function weekKey(d){
  d = d ? new Date(d) : new Date();
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return y + '-W' + String(w).padStart(2, '0');
}
/* midnight at the end of the week's Sunday, local time */
function weekEnd(d){
  d = d ? new Date(d) : new Date();
  const day = d.getDay() || 7;
  const e = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (8 - day));
  return e;
}
/* this week's two events, the same for everyone */
function weeklyEvents(key){
  key = key || weekKey();
  const rnd = mulberry32(hashStr('ks-week:' + key));
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const boss = BOSS_CYCLE[Math.floor(rnd() * BOSS_CYCLE.length)];
  const bossMaps = MAP_ORDER.filter(m => MAPS[m].level !== 'Expert');
  const bossMap = pick(bossMaps);
  const raceMaps = MAP_ORDER.filter(m => m !== bossMap && MAPS[m].level !== 'Expert');
  const raceMap = pick(raceMaps);
  const end = pick([30, 35, 40]);
  return {
    week: key,
    boss: { kind:'boss', week: key, name: ENEMIES[boss].name.replace(/^The /, '') + ' Night', boss, map: bossMap, diff:'hard', tiers: EV_TIERS.slice() },
    race: { kind:'race', week: key, name: MAPS[raceMap].name + ' Dash', map: raceMap, diff:'medium', end },
  };
}
/* what the profile remembers of an event */
function evRecord(ev){
  const E = Profile.events || (Profile.events = {});
  const wk = E[ev.week] || (E[ev.week] = {});
  return wk[ev.kind] || (wk[ev.kind] = ev.kind === 'boss' ? { tiers: 0, times: [], tries: 0 } : { time: 0, tries: 0 });
}
/* the game's event state, set up by setupGame */
function applyEvent(ev){
  G.ev = null;
  if (!ev) return;
  G.ev = { kind: ev.kind, week: ev.week, name: ev.name, boss: ev.boss, tiers: (ev.tiers || EV_TIERS).slice(), end: ev.end, map: ev.map, done: 0, times: [], retries: 0, elite: !!ev.elite, order: ev.order ? ev.order.slice() : null };
  G.evClock = 0;
  if (isBossEv(ev)) G.win = G.ev.tiers[G.ev.tiers.length - 1];
  else G.win = ev.end;
  /* a boss fight starts at round 16 with the cash for it */
  if (ev.kind === 'battle' || ev.kind === 'rush'){ G.round = BB_START[0]; G.cash = BB_START[1] + (perk('cash') ? 150 : 0); G.stats.start = G.round; bbRecord(ev).tries++; saveProfile(); return; }
  evRecord(ev).tries++;
  saveProfile();
}
function evNoPowers(){ return !!G.ev; }
/* the event clock runs while a round is in play */
function evTick(dt){ if (G.ev && G.roundActive) G.evClock = (G.evClock || 0) + dt; }
/* the score the clock shows: time in play plus the retry penalty */
function evScore(){ return (G.evClock || 0) + (G.ev ? G.ev.retries * EV_RETRY_PENALTY : 0); }
function evTierOf(n){ return isBossEv(G.ev) ? G.ev.tiers.indexOf(n) + 1 : 0; }
/* Boss Night: the boss joins the round's spawn on tier rounds */
function evRoundGroups(n, groups){
  const tier = evTierOf(n);
  if (!tier) return groups;
  const b = evBossAt(tier);
  groups.unshift({ type: b, count: 1, spacing: 1, start: 3, mods: 'B', hpMul: evTierHp(tier) * evBossNorm(b), evTier: tier });
  return groups;
}
/* a boss spawned on a tier round wears its tier as its level */
function evBossLevel(){ const k = G.roundActive ? evTierOf(G.round) : 0; return k ? evTierLevel(k) : 0; }
/* a round cleared: a tier's time, or the race's finish; returns what was earned */
function evRoundCleared(n){
  if (!G.ev || G.attract || G.adminUsed) return null;
  const score = evScore();
  if (G.ev.kind === 'battle' || G.ev.kind === 'rush'){
    const tier = evTierOf(n);
    if (!tier) return null;
    const ev = G.ev, rec = bbRecord(ev), last = tier === ev.tiers.length;
    ev.done = tier; ev.times[tier - 1] = score;
    const fresh = tier > rec.tiers, better = !rec.times[tier - 1] || score < rec.times[tier - 1];
    if (better) rec.times[tier - 1] = Math.round(score * 10) / 10;
    let dough = 0;
    if (fresh){
      rec.tiers = tier;
      const pay = ev.elite ? BB_ELITE.pay : 1;
      dough = ev.kind === 'rush' ? (last ? BB_REWARD_RUSH * pay : 0) : BB_REWARD_TIER[tier - 1] * pay;
      if (dough) addDough(dough, 'event');
    }
    if (last){ const S = Profile.stats; if (ev.kind === 'rush') S.rushes = (S.rushes || 0) + 1; else if (ev.elite) S.eliteBosses = (S.eliteBosses || 0) + 1; }
    checkAchievements(); saveProfile();
    return { tier, score, fresh, better, dough, boss: evBossAt(tier), last };
  }
  const ev = G.ev, rec = evRecord(ev);
  let out = null;
  if (ev.kind === 'boss'){
    const tier = evTierOf(n);
    if (!tier) return null;
    ev.done = tier; ev.times[tier - 1] = score;
    const fresh = tier > rec.tiers;
    const better = !rec.times[tier - 1] || score < rec.times[tier - 1];
    if (better) rec.times[tier - 1] = Math.round(score * 10) / 10;
    if (fresh){ rec.tiers = tier; addDough(EV_REWARD_TIER[tier - 1], 'event'); }
    out = { tier, score, fresh, better, dough: fresh ? EV_REWARD_TIER[tier - 1] : 0 };
    boardPost('boss', { week: ev.week, label: ENEMIES[ev.boss].name + ' · tier ' + tier, map: ev.map, tier, score: Math.round(score * 10) / 10 });
  } else if (n === ev.end){
    const fresh = !rec.time, better = !rec.time || score < rec.time;
    if (better) rec.time = Math.round(score * 10) / 10;
    if (fresh) addDough(EV_REWARD_RACE, 'event');
    out = { score, fresh, better, dough: fresh ? EV_REWARD_RACE : 0 };
    boardPost('race', { week: ev.week, label: MAPS[ev.map].name + ' · ' + ev.end + ' rounds', map: ev.map, score: Math.round(score * 10) / 10 });
  }
  if (out){ checkAchievements(); saveProfile(); }
  return out;
}
/* the Best Times board: the ten best runs of each kind, best first (a boss run ranks by tier first) */
function boardPost(kind, entry){
  const B = Profile.boards || (Profile.boards = { boss: [], race: [] });
  const list = B[kind] || (B[kind] = []);
  entry.at = Date.now();
  list.push(entry);
  list.sort((a, b) => kind === 'boss' ? (b.tier - a.tier || a.score - b.score) : a.score - b.score);
  B[kind] = list.slice(0, 10);
}
function boardOf(kind){ const B = Profile.boards; return B && B[kind] ? B[kind] : []; }
function fmtClock(s){ s = Math.max(0, s || 0); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); }
/* a saved game keeps its event and its clock */
function evSave(){ return G.ev ? { k: G.ev.kind, w: G.ev.week, b: G.ev.boss, m: G.ev.map, e: G.ev.end, d: G.ev.done, t: G.ev.times.slice(), r: G.ev.retries, c: Math.round((G.evClock || 0) * 10) / 10, n: G.ev.name, x: G.ev.elite ? 1 : 0, o: G.ev.order || undefined, ti: G.ev.kind === 'rush' ? G.ev.tiers.slice() : undefined } : undefined; }
function evLoad(d){
  if (!d || !d.k) return;
  G.ev = { kind: d.k, week: d.w, name: d.n || '', boss: d.b, tiers: Array.isArray(d.ti) ? d.ti.slice() : EV_TIERS.slice(), end: d.e, map: d.m, done: d.d || 0, times: Array.isArray(d.t) ? d.t.slice() : [], retries: d.r || 0, elite: !!d.x, order: Array.isArray(d.o) ? d.o.slice() : null };
  G.evClock = +d.c || 0;
  G.win = isBossEv(G.ev) ? G.ev.tiers[G.ev.tiers.length - 1] : d.e;
}
/* achievements count by the events played */
function evStats(){
  const E = Profile.events || {};
  let tiers = 0, races = 0;
  for (const w in E){ if (E[w].boss) tiers = Math.max(tiers, E[w].boss.tiers || 0); if (E[w].race && E[w].race.time) races++; }
  return { tiers, races };
}
