// Head chef tests: levels, XP, placement rules, abilities, saves, unlocks and achievements.
require('./sim_load.js');
const M = require('./.combined.js');
const { G, DT, step, startRound, placeTower, upgradeTower, Admin, spawnEnemy, useAbility } = M;
const P = () => M.X.Profile();
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fails++; };
const fresh = () => { M.setProfile(M.defaultProfile()); M.AdminFlags.unlockAll = false; };
/* a free spot for an appliance of this type near (x, y) */
function spotNear(type, x, y){
  for (let r = 0; r < 400; r += 8) for (let a = 0; a < 6.28; a += 0.4){
    const px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r);
    if (M.canPlace(type, px, py)) return [px, py];
  }
  return null;
}
const place = (type, x, y) => { const s = spotNear(type, x || 520, y || 300); return s ? placeTower(type, s[0], s[1]) : null; };

/* ---- the roster ---- */
fresh();
ok(M.HERO_ORDER.length === 6 && M.HERO_ORDER.every(id => M.TOWERS[id] && M.TOWERS[id].hero), 'six head chefs in the appliance table');
ok(M.HERO_ORDER.slice(1).every((id, i) => M.HEROES[id].unlock.level > (i ? M.HEROES[M.HERO_ORDER[i]].unlock.level : 0)), 'listed in the order they join');
ok(M.HERO_ORDER.every(id => M.TOWER_ORDER.indexOf(id) < 0 && M.BASE_TOWER_ORDER.indexOf(id) < 0), 'head chefs stay out of the shop order, mastery and challenges');
ok(M.HERO_ORDER.every(id => M.HEROES[id].levels.length === M.HERO_MAX - 1 && M.HEROES[id].levels.every(L => L.desc && typeof L.apply === 'function')), 'each has 19 level-ups with a description');
let threw = null;
for (const id of M.HERO_ORDER) for (let L = 1; L <= M.HERO_MAX; L++){ try { M.heroStats(id, L); } catch (e) { threw = id + ' level ' + L + ': ' + e.message; } }
ok(!threw, 'stats build at every level' + (threw ? ' (' + threw + ')' : ''));
for (const id of M.HERO_ORDER){
  const abs = M.HEROES[id].levels.filter(L => L.ab).map(L => L.ab);
  ok(abs.length === 2 && M.heroAbilityLevel(id, abs[0]) === 3 && M.heroAbilityLevel(id, abs[1]) === 10, M.HEROES[id].name + ': abilities at levels 3 and 10 (' + abs.join(', ') + ')');
  ok(M.heroStats(id, 2).abilities.length === 0 && M.heroStats(id, 3).abilities.length === 1 && M.heroStats(id, 20).abilities.length === 2, M.HEROES[id].name + ': abilities appear as levels are reached');
  ok(abs.every(a => M.ABILITIES[a] && M.ABILITIES[a].name), M.HEROES[id].name + ': abilities have names');
}
ok(M.heroNeed(1) === 100 && M.heroNeed(2) === 125 && M.heroTotalXP(20) > 25000 && M.heroTotalXP(20) < 30000, 'XP curve: 100, 125, … ' + M.heroTotalXP(20) + ' in all');

/* ---- hiring and picking ---- */
fresh();
ok(M.heroOwned('chef_blaze') && !M.heroOwned('chef_gelato') && !M.heroOwned('chef_penny'), 'a new profile has Chef Blaze only');
ok(M.heroPick() === 'chef_blaze' && !M.setHeroPick('chef_gelato') && M.heroPick() === 'chef_blaze', 'only hired chefs can be picked');
P().dough = 5000;
ok(M.hireHero('chef_penny') && M.heroOwned('chef_penny') && P().dough === 2500 && M.heroPick() === 'chef_penny', 'Chef Penny hired for 2,500 Dough and picked');
ok(!M.hireHero('chef_penny') && P().dough === 2500, 'no paying twice');
P().dough = 10;
ok(!M.hireHero('chef_gelato') && !M.heroOwned('chef_gelato'), 'not without the Dough');
const need10 = Array.from({ length: 9 }, (_, i) => M.chefNeed(i + 1)).reduce((a, b) => a + b, 0);
let joined = [];
M.Hooks.heroUnlock = id => joined.push(id);
M.addChefXP(need10);
ok(M.heroOwned('chef_gelato') && joined.join() === 'chef_gelato', 'Chef Gelato joins for free at chef level 10');
M.checkAchievements(true);
ok(!P().ach.brigade, 'no Full Brigade with three of six');
const needTo = L => Array.from({ length: L - 1 }, (_, i) => M.chefNeed(i + 1)).reduce((a, b) => a + b, 0);
M.addChefXP(needTo(15) - P().chef.xp);
ok(M.heroOwned('chef_kenji') && !M.heroOwned('chef_nonna') && joined.join() === 'chef_gelato,chef_kenji', 'Chef Kenji joins at chef level 15');
M.addChefXP(needTo(25) - P().chef.xp);
ok(M.heroOwned('chef_nonna') && !M.heroOwned('chef_bruno'), 'Chef Nonna joins at chef level 25');
P().dough = 3500;
ok(M.hireHero('chef_bruno') && M.heroOwned('chef_bruno') && P().dough === 0, 'Chef Bruno hired early for 3,500 Dough');
M.checkAchievements(true);
ok(P().ach.brigade === 1, 'Full Brigade once all six are hired');
M.Hooks.heroUnlock = () => {};
const merged = M.mergeProfile({ heroes:{ owned:{ chef_gelato:1, bogus:1, chef_blaze:0 }, pick:'bogus' } });
ok(merged.heroes.owned.chef_blaze && merged.heroes.owned.chef_gelato && !merged.heroes.owned.bogus && merged.heroes.pick === 'chef_blaze', 'saved chefs are cleaned up (Blaze always hired, bad picks dropped)');
ok(M.mergeProfile({ heroes:'x' }).heroes.pick === 'chef_blaze' && M.mergeProfile(null).heroes.owned.chef_blaze, 'broken saves get the default roster');

/* ---- placing ---- */
fresh();
M.newGame('block', 'medium', false);
G.vis = false;
G.cash = 1e6;
ok(!place('chef_gelato'), 'an unhired chef can’t be placed');
const blaze = place('chef_blaze');
ok(blaze && blaze.hero && blaze.level === 1 && blaze.hxp === 0, 'Chef Blaze placed at level 1');
ok(P().ach.hire1 === 1 && P().stats.heroHires === 1, 'Head Chef achievement for the first hire');
ok(M.heroBlock('chef_blaze') === 'Only one head chef per game' && !place('chef_blaze', 300, 500), 'one head chef per game');
M.AdminFlags.unlockAll = true;
ok(!place('chef_penny', 300, 500), 'not even a different one');
M.AdminFlags.unlockAll = false;
ok(!M.upgradeState(blaze, 0).ok && !M.upgradeTower(blaze, 0), 'no upgrade paths');
ok(M.towerCost('chef_blaze') === 600, 'costs $600 on Medium');

/* ---- XP from rounds ---- */
Admin.skipRound();
ok(blaze.level === 1 && blaze.hxp === M.heroRoundXP(1), 'round 1 gives ' + M.heroRoundXP(1) + ' XP');
const levelAt = {};
for (let r = 2; r <= 60; r++){ Admin.skipRound(); levelAt[r] = blaze.level; }
console.log('     level after round 10: ' + levelAt[10] + ', 20: ' + levelAt[20] + ', 30: ' + levelAt[30] + ', 40: ' + levelAt[40] + ', 50: ' + levelAt[50] + ', 60: ' + levelAt[60]);
ok(levelAt[10] >= 3 && levelAt[10] <= 5, 'Flambé (level 3) arrives by round 10');
ok(levelAt[40] >= 12 && levelAt[40] <= 16, 'around level 14 by round 40');
ok(levelAt[60] >= 17 && levelAt[60] < 20, 'not quite level 20 by round 60');
ok(!P().mastery.chef_blaze, 'head chefs earn no mastery XP');
for (let i = 0; i < 20 && blaze.level < 20; i++) Admin.skipRound();
ok(blaze.level === 20 && blaze.hxp === 0, 'level 20 in freeplay, then the XP bar stops');
ok(P().ach.hero10 && P().ach.hero20 && P().stats.heroTop === 20, 'Rising Star and Master Chef achievements');
ok(blaze.s.abilities.length === 2 && abilityIds(blaze).join() === 'flambe,wok', 'both abilities at level 20');
function abilityIds(t){ return t.s.abilities.map(a => a.id); }

/* ---- buying levels ---- */
fresh();
M.newGame('block', 'easy', false);
G.vis = false; G.cash = 1e6;
const b2 = place('chef_blaze');
const c1 = M.heroLevelCost(b2);
ok(c1 === M.price(120, 'chef_blaze') && c1 === 100, 'level 2 costs ' + c1 + ' on Easy (120 × 0.85, rounded to $5)');
const inv0 = b2.invested, cash0 = G.cash;
ok(M.buyHeroLevel(b2) && b2.level === 2 && b2.hxp === 0 && G.cash === cash0 - c1 && b2.invested === inv0 + c1, 'buying a level spends cash and counts toward the sell value');
Admin.skipRound();
const left = M.heroNeed(2) - b2.hxp;
ok(M.heroLevelCost(b2) === M.price(left * 1.2, 'chef_blaze'), 'a level costs only the XP that is left');
let total = 0; while (b2.level < 20){ total += M.heroLevelCost(b2); M.buyHeroLevel(b2); }
console.log('     buying every level on Easy costs ' + total);
ok(total > 15000 && total < 40000, 'all the way to 20 for cash: ' + total);
ok(!M.buyHeroLevel(b2), 'nothing to buy at level 20');
G.cash = 0;
fresh(); M.newGame('block', 'medium', false); G.vis = false; G.cash = 700;
const b3 = place('chef_blaze');
ok(b3 && !M.buyHeroLevel(b3) && b3.level === 1, 'no level without the cash');

/* ---- saves ---- */
fresh();
M.newGame('block', 'medium', false);
G.vis = false; G.cash = 1e6;
const h1 = place('chef_blaze');
for (let i = 0; i < 12; i++) Admin.skipRound();
const lv = h1.level, hx = h1.hxp;
h1.ab.flambe = 7.5;
const snap = JSON.parse(JSON.stringify(M.serializeGame()));
M.loadGame(snap);
const h2 = G.towers.find(t => t.hero);
ok(h2 && h2.level === lv && Math.abs(h2.hxp - hx) <= 1 && h2.ab.flambe === 7.5, 'level ' + lv + ', XP and recharge survive a save');
snap.towers.push(Object.assign({}, snap.towers[0], { x: snap.towers[0].x + 200 }));
M.loadGame(snap);
ok(G.towers.filter(t => t.hero).length === 1, 'a save with two head chefs loads one');
snap.towers[0].hl = 99; snap.towers[0].hx = -5;
M.loadGame(snap);
ok(G.towers.find(t => t.hero).level === 20, 'levels are clamped to 20');
G.towers.find(t => t.hero).level = 5; M.refreshTowers();
startRound();
const before = G.towers.find(t => t.hero);
before.level = 9; M.refreshTowers();
M.retryRound();
ok(G.towers.find(t => t.hero).level === 5, 'retrying a round puts the level back to where the round started');

/* ---- abilities ---- */
function spawnAt(type, d, o){ const e = spawnEnemy(type, Object.assign({ d }, o || {})); return e; }
function nearestD(t){
  // the path distance of the trail point closest to the chef
  const P0 = G.paths[0]; let best = 0, bd = 1e9;
  for (let d = 0; d < P0.len; d += 4){ const q = M.pathPos(P0, d, 0); const dd = Math.hypot(q.x - t.x, q.y - t.y); if (dd < bd){ bd = dd; best = d; } }
  return best;
}
fresh();
M.AdminFlags.unlockAll = true;
M.newGame('block', 'medium', false);
G.vis = false; G.cash = 1e6;
const fb = place('chef_blaze', 400, 260);
fb.level = 20; M.refreshTowers(); Admin.resetCooldowns();
G.roundActive = true; G.spawn = [];
let d = nearestD(fb);
const ants = [0, 1, 2, 3, 4].map(i => spawnAt('roach', d + i * 6));
ants.forEach(e => { e.hp = e.maxHp = 5000; });
ok(useAbility('flambe') && ants.every(e => e.hp < 5000 && e.burn), 'Flambé hits and burns every pest around Blaze');
G.enemies = [];
const crowd = [0, 1, 2, 3, 4, 5].map(i => spawnAt('roach', d + 300 + i * 5));
crowd.forEach(e => { e.hp = e.maxHp = 1e5; });
ok(useAbility('wok'), 'Wok Inferno fires');
for (let i = 0; i < 40; i++) step(DT);
ok(crowd.every(e => e.maxHp - e.hp >= 400), 'Wok Inferno slams the crowd (' + Math.round(crowd[0].maxHp - crowd[0].hp) + ' damage each)');
G.enemies = []; G.towers = []; M.refreshTowers();
const fg = place('chef_gelato', 400, 260);
fg.level = 20; M.refreshTowers(); Admin.resetCooldowns();
d = nearestD(fg);
const far = spawnAt('roach', 40), flea = spawnAt('snowflea', d), near = spawnAt('roach', d + 4);
ok(useAbility('brainfreeze') && far.freezeT > 0 && near.freezeT > 0 && !(flea.freezeT > 0), 'Brain Freeze at level 20 freezes the whole map, but not snow fleas');
ok(useAbility('bigchill') && G.glob.chill && near.slowT > 0 && near.vulnT > 0, 'Big Chill slows and weakens');
const late = spawnAt('roach', 10);
for (let i = 0; i < 10; i++) step(DT);
ok(late.slowT > 0 && late.vulnAmt === 4, 'pests that arrive during Big Chill are chilled too');
for (let i = 0; i < 60 * 16; i++){ step(DT); for (const e of G.enemies) e.hp = e.maxHp; }
ok(!G.glob.chill, 'Big Chill wears off');
G.enemies = []; G.towers = []; M.refreshTowers();
const fp = place('chef_penny', 400, 260);
fp.level = 20; M.refreshTowers(); Admin.resetCooldowns();
G.round = 30;
const cash1 = G.cash;
ok(useAbility('payday') && G.cash - cash1 === 300 + 24 * 30, 'Payday pays ' + (G.cash - cash1) + ' on round 30 at level 20');
const kb = place('knife', fp.x + 60, fp.y);
ok(kb.buffs.speed === 1.25 && kb.buffs.dmg === 2 && kb.buffs.pierce === 1 && kb.buffs.range === 1.15 && kb.s.camo, 'nearby appliances get Penny’s buffs');
ok(M.towerCost('knife', fp.x + 40, fp.y) < M.towerCost('knife'), 'and are cheaper next to her');
ok(useAbility('opening') && G.glob.opening && G.glob.opening.mult === 1.75, 'Grand Opening speeds up every appliance');
G.roundActive = false;
const cash2 = G.cash;
G.spawn = null; G.roundActive = true; G.spawn = [{ type:'ant', count:0, spawned:0, start:0, spacing:1, mods:'' }];
M.endRound();
ok(G.cash - cash2 >= 1000, 'Penny earns $1,000 a round at level 20');
ok(!G.glob.opening, 'Grand Opening ends with the round');

/* ---- Kenji ---- */
const BIG = Object.keys(M.X.ENEMIES).find(k => M.X.ENEMIES[k].big && !M.X.ENEMIES[k].boss && !M.X.ENEMIES[k].fly);
G.enemies = []; G.towers = []; G.puddles = []; G.traps = []; G.projs = []; G.timers = []; M.refreshTowers();
const fk = place('chef_kenji', 400, 260);
ok(fk.s.camo && fk.s.atk.main.sprite === 'chopstick', 'Kenji spots ghost pests from level 1');
fk.level = 20; M.refreshTowers(); Admin.resetCooldowns();
ok(fk.s.atk.main.critSpec && fk.s.atk.main.critSpec.isCrit && fk.s.atk.main.critSpec.dmg === fk.s.atk.main.dmg * 6 && fk.s.atk.main.crit.every === 3, 'his critical hits land every 3rd throw for 6× at level 20');
d = nearestD(fk);
const tough = [0, 1, 2].map(i => spawnAt(BIG, d + 200 + i * 20));
tough.forEach(e => { e.hp = e.maxHp = 1e6; });
const weak = spawnAt('ant', d + 100);
weak.hp = weak.maxHp = 1e6;
const projs0 = G.projs.length;
ok(useAbility('omakase'), 'Omakase fires');
for (let i = 0; i < 30; i++) step(DT);
ok(G.projs.length > projs0 || tough.some(e => e.hp < e.maxHp), 'golden chopsticks fly out');
for (let i = 0; i < 120; i++) step(DT);
ok(tough.every(e => e.maxHp - e.hp >= 400), 'Omakase hits the toughest pests hardest (' + tough.map(e => Math.round(e.maxHp - e.hp)).join(', ') + ')');
ok(useAbility('knifedance') && fk.boost.dance && fk.boost.dance.mult === 2.5 && M.towerSpeed(fk) >= 2.5, 'Knife Dance makes Kenji throw 2.5× as fast');
/* ---- Bruno ---- */
G.enemies = []; G.towers = []; M.refreshTowers();
const fbr = place('chef_bruno', 400, 260);
fbr.level = 20; M.refreshTowers(); Admin.resetCooldowns();
ok(fbr.s.atk.main.bigMult === 2 && fbr.s.atk.main.cripple && fbr.s.atk.main.cripple.mult === 1.3, 'Bruno doubles his damage to vehicles at level 20');
d = nearestD(fbr);
const vans = [0, 1, 2, 3, 4, 5].map(i => spawnAt(BIG, d + i * 25));
vans.forEach((e, i) => { e.hp = e.maxHp = 1e5 + i; });
const ant2 = spawnAt('ant', d + 10);
ok(useAbility('tenderize') && vans.slice(1).every(e => e.vulnT > 0 && e.slowT > 0) && !(ant2.vulnT > 0), 'Tenderize pounds the five toughest vehicles, not the small fry');
const boss = spawnAt(Object.keys(M.X.ENEMIES).find(k => M.X.ENEMIES[k].boss), d + 60, { boss: true });
boss.hp = boss.maxHp = 2e6;
ok(useAbility('chop'), 'The Big Chop fires');
for (let i = 0; i < 40; i++) step(DT);
const chopped = boss.maxHp - boss.hp;
ok(chopped >= 3000 + 2e6 * 0.1 * 0.9, 'it lands on the boss for ' + Math.round(chopped) + ' (3,000 plus a tenth of its health)');
/* ---- Nonna ---- */
G.enemies = []; G.towers = []; G.puddles = []; G.traps = []; M.refreshTowers();
const fn = place('chef_nonna', 400, 260);
fn.level = 20; M.refreshTowers(); Admin.resetCooldowns();
d = nearestD(fn);
G.roundActive = true; G.spawn = [{ type:'ant', count:0, spawned:0, start:0, spacing:1, mods:'' }];
const marcher = spawnAt('roach', d - 40);
marcher.hp = marcher.maxHp = 1e6;
for (let i = 0; i < 90; i++) step(DT);
ok(G.traps.some(tr => tr.sprite === 'meatball' && tr.tw === fn), 'Nonna rolls meatballs onto the trail');
G.traps = [];
ok(useAbility('sauce') && G.puddles.filter(p => p.tw === fn && p.spec.sauce).length === 9, 'Sauce! ladles 9 puddles along the trail');
const pd = G.puddles.find(p => p.tw === fn);
const dip = spawnAt('roach', d);
dip.hp = dip.maxHp = 1e6;
dip.x = pd.x; dip.y = pd.y; dip.speed = 0; dip.d = d;
const hp0 = dip.hp;
for (let i = 0; i < 70; i++){ step(DT); dip.x = pd.x; dip.y = pd.y; }
ok(dip.hp < hp0 && dip.slowT > 0, 'the sauce slows and simmers (' + Math.round(hp0 - dip.hp) + ' damage)');
G.enemies = [];
const eater = spawnAt('roach', d), van = spawnAt(BIG, d + 10);
ok(useAbility('mangia') && eater.stunT > 3 && !(van.stunT > 0) && van.slowT > 0, 'Mangia! stops small pests and slows vehicles');
G.enemies = []; G.spawn = [{ type:'ant', count:0, spawned:0, start:0, spacing:1, mods:'' }];
let lives0 = G.lives;
M.endRound();
ok(G.lives - lives0 === 10 && G.lastRoundLives === 10, 'Nonna brings 10 lives a round at level 20');
fresh();
M.newGame('block', 'michelin', false);
G.vis = false; G.cash = 1e6; M.AdminFlags.unlockAll = true;
const fn2 = place('chef_nonna', 400, 260);
fn2.level = 20; M.refreshTowers();
G.roundActive = true; G.spawn = [{ type:'ant', count:0, spawned:0, start:0, spacing:1, mods:'' }];
lives0 = G.lives;
M.endRound();
ok(G.lives === lives0, 'but none on Michelin');

/* ---- challenges, attract, achievements list ---- */
fresh();
const ch = M.dailyChallenge('2026-10-19');
M.newGame(ch.map, ch.diff, false, ch);
G.vis = false;
ok(M.canBuild('chef_blaze') && place('chef_blaze'), 'head chefs work in daily challenges');
ok(M.ACHIEVEMENTS.filter(A => ['hire1', 'hero10', 'hero20', 'brigade'].includes(A.id)).length === 4, 'four chef achievements');

console.log(fails ? '\nFAILURES: ' + fails : '\nall chef tests passed');
process.exit(fails ? 1 : 0);
