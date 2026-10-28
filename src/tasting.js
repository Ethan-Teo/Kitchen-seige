'use strict';
/* =====================================================================
   Kitchen Siege — the Tasting Menu
   A weekly run of three kitchens, cooked in a row with one crew of
   appliances picked up front: up to six kinds, twelve appliances in
   all, and each course may use no more of a kind than the crew holds.
   Course 1 is rounds 1 to 20 on an easy kitchen, course 2 rounds 21 to
   40, course 3 rounds 41 to 60 on a hard one. Lives carry from course
   to course; cash starts fresh each time. Each course is played as a
   challenge (a daily's machinery), and the run's progress lives on the
   profile, so it can be picked up later in the week.
   ===================================================================== */
const TM_CREW_MAX = 12, TM_KINDS_MAX = 6, TM_LIVES = 100;
const TM_ROUNDS = [[1, 20], [21, 40], [41, 60]], TM_CASH = [650, 3400, 6500];
const TM_REWARD = { dough: 500, crate: 'gold' };
function weeklyTasting(key){
  key = key || weekKey();
  const rnd = mulberry32(hashStr('ks-tasting:' + key));
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const tiers = [['Beginner', 'Intermediate'], ['Intermediate', 'Advanced'], ['Advanced', 'Expert']];
  const maps = [];
  for (const t of tiers){ const pool = MAP_ORDER.filter(m => t.includes(MAPS[m].level) && !maps.includes(m)); maps.push(pick(pool)); }
  /* the last course has a house rule */
  const rule = pick(['fast', 'traffic', 'tough', 'hike']);
  return { week: key, name:'Tasting Menu', maps, rule };
}
function tmRecord(T){
  const E = Profile.tasting || (Profile.tasting = {});
  return E[T.week] || (E[T.week] = { leg: 0, crew: null, lives: TM_LIVES, done: 0, tries: 0 });
}
/* can this crew sail: enough of it, not too many kinds */
function tmCrewOk(crew){
  const kinds = Object.keys(crew).filter(k => crew[k] > 0), n = kinds.reduce((a, k) => a + crew[k], 0);
  return kinds.length >= 1 && kinds.length <= TM_KINDS_MAX && n >= 1 && n <= TM_CREW_MAX;
}
/* the challenge that plays one course of the run */
function tmLeg(T, rec, leg){
  const [start, end] = TM_ROUNDS[leg], map = T.maps[leg];
  const mod = Object.assign({}, NO_MOD), rules = leg === 2 ? [T.rule] : [];
  for (const r of rules){ const m = CH_RULES[r].mod; for (const k in m) mod[k] = m[k]; }
  const crew = rec.crew || {};
  return { tm: { week: T.week, leg }, date: 'tm:' + T.week + ':' + leg, name: 'Tasting Menu · course ' + (leg + 1) + ' of 3', map, diff:'medium', start, end, cash: TM_CASH[leg],
    lives: Math.max(1, rec.lives || TM_LIVES), towers: Object.keys(crew).filter(k => crew[k] > 0), counts: Object.assign({}, crew), rules, mod, reward: { dough: 0, crate: null } };
}
/* how many of a kind the crew still has for this course */
function crewLeft(type){
  if (!G.ch || !G.ch.counts) return Infinity;
  const T = TOWERS[type];
  if (T && T.hero) return Infinity;
  return (G.ch.counts[type] || 0) - G.towers.filter(t => t.type === type).length;
}
/* a course cleared: the run moves on; the whole menu done pays once a week */
function tmLegDone(){
  const ch = G.ch;
  if (!ch || !ch.tm) return null;
  const T = { week: ch.tm.week }, rec = tmRecord(T);
  const leg = ch.tm.leg;
  if (rec.leg <= leg){ rec.leg = leg + 1; rec.lives = G.lives; }
  const out = { leg, last: leg === 2, dough: 0, crate: null };
  if (leg === 2 && !rec.done){ rec.done = 1; out.dough = addDough(TM_REWARD.dough); addCrate(TM_REWARD.crate, 1); out.crate = TM_REWARD.crate; Profile.stats.tastings = (Profile.stats.tastings || 0) + 1; }
  saveProfile();
  return out;
}
