// Progression tests: Dough, chef levels, daily chest and challenge, powers, insta appliances, crates, achievements.
require('./sim_load.js');
const M = require('./.combined.js');
const { G, DT, step, startRound, placeTower, upgradeTower, Admin, spawnEnemy, useAbility } = M;
const P = () => M.X.Profile();
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fails++; };
const fresh = () => { M.setProfile(M.defaultProfile()); };

/* ---- chef levels ---- */
fresh();
ok(M.chefLevel(0).level === 1 && M.chefLevel(M.chefNeed(1)).level === 2, 'level 2 after the first ' + M.chefNeed(1) + ' XP');
const xp10 = Array.from({ length: 9 }, (_, i) => M.chefNeed(i + 1)).reduce((a, b) => a + b, 0);
ok(M.chefLevel(xp10).level === 10 && M.chefLevel(xp10 - 1).level === 9, 'level 10 at ' + xp10 + ' XP');
M.addChefXP(xp10);
ok(P().dough === [2, 3, 4, 5, 6, 7, 8, 9, 10].reduce((a, L) => a + M.levelReward(L).dough, 0), 'level rewards paid in Dough: ' + P().dough);
ok(P().crates.chef === 2, 'a Chef’s Crate at levels 5 and 10');

/* ---- a medium game: Dough and XP per round, then a win ---- */
fresh();
M.newGame('block', 'medium', false);
G.vis = false;
for (let i = 0; i < 60 && !G.won; i++) Admin.skipRound();
ok(G.won, 'won after 60 rounds');
const st = P();
console.log('     medium game: dough', st.dough, '· chef level', M.chefLevel(st.chef.xp).level, '· game dough', G.doughGame, '· achievements', Object.keys(st.ach).join(','));
ok(st.dough > 600 && st.dough < 1600, 'a first medium win, with its first-time achievements, pays ' + st.dough + ' Dough');
ok(M.chefLevel(st.chef.xp).level >= 7, 'a medium game is worth several chef levels');
ok(st.ach.win1 && st.ach.medium && st.ach.r100 !== 1, 'win and medal achievements unlocked, round 100 not yet');

/* ---- freeplay rounds pay a flat amount ---- */
const d0 = P().dough;
M.X.Profile().stats.maxRound = 0;
G.freeplay = true;
for (let i = 0; i < 10; i++) Admin.skipRound();
const per = (P().dough - d0) / 10;
ok(per >= 1 && per <= 10, 'freeplay rounds pay ' + per + ' Dough each on Medium, level-ups included');

/* ---- daily chest ---- */
fresh();
const day = (y, m, d) => new Date(y, m - 1, d, 12);
let s1 = M.dailyStatus(day(2026, 10, 1));
ok(s1.ready && s1.day === 1, 'first chest is day 1');
let c1 = M.claimDaily(day(2026, 10, 1));
ok(c1 && c1.streak === 1 && P().dough >= 60 && P().powers.tipjar === 1, 'day 1 chest: Dough and a Tip Jar');
ok(M.claimDaily(day(2026, 10, 1)) === null, 'one chest a day');
for (let d = 2; d <= 7; d++) M.claimDaily(day(2026, 10, d));
ok(P().daily.streak === 7 && P().crates.gold === 1 && P().ach.streak7, 'seven days in a row: Golden Crate and Loyal Customer');
ok(M.dailyStatus(day(2026, 10, 8)).day === 1 && M.dailyStatus(day(2026, 10, 8)).streak === 8, 'day 8 starts the track again, streak 8');
ok(M.dailyStatus(day(2026, 10, 10)).streak === 1 && M.dailyStatus(day(2026, 10, 10)).lost, 'missing a day resets the streak');
ok(M.shiftDay('2026-03-01', -1) === '2026-02-28' && M.shiftDay('2024-03-01', -1) === '2024-02-29' && M.shiftDay('2026-12-31', 1) === '2027-01-01', 'date arithmetic');

/* ---- daily challenge ---- */
const a1 = M.dailyChallenge('2026-10-14'), a2 = M.dailyChallenge('2026-10-14');
ok(JSON.stringify(a1) === JSON.stringify(a2), 'same date, same challenge');
const keys = []; for (let i = 0; i < 200; i++) keys.push(M.shiftDay('2026-01-01', i));
const all = keys.map(k => M.dailyChallenge(k));
ok(new Set(all.map(c => c.map + c.diff + c.start + c.rules.join())).size > 120, 'challenges vary from day to day');
ok(all.every(c => c.towers.length === 7 && new Set(c.towers).size === 7), 'seven different appliances');
ok(all.every(c => c.towers.filter(t => !M.TOWERS[t].water && M.TOWERS[t].faction !== 'support').length >= 4), 'at least four land fighters');
ok(all.every(c => c.towers.some(M.canSpotGhosts)), 'something can always learn to spot ghosts');
ok(all.every(c => c.rules.length === 2 && !(c.rules.includes('hike') && c.rules.includes('happy'))), 'two compatible house rules');
ok(all.every(c => c.end - c.start + 1 >= 20 && c.cash >= 650), 'rounds and starting cash');
console.log('     example:', a1.name, a1.map, a1.diff, 'rounds', a1.start + '-' + a1.end, '$' + a1.cash, a1.towers.join(' '), a1.rules.join('+'), JSON.stringify(a1.reward));
const counts = {}; for (const c of all) for (const r of c.rules) counts[r] = (counts[r] || 0) + 1;
console.log('     rules over 200 days:', JSON.stringify(counts));

/* ---- playing a challenge ---- */
fresh();
const ch = Object.assign({}, a1, { rules:['basics', 'hands'], mod: Object.assign({}, M.NO_MOD, { maxTier:3, noAbilities:true, price:1.2, speed:1.2 }) });
M.newGame(ch.map, ch.diff, true, ch);
ok(G.ch && G.round === ch.start && G.win === ch.end && G.cash === ch.cash && !G.mm, 'challenge sets round, goal, cash, and drops Mastery Mode');
const banned = M.TOWER_ORDER.find(t => !ch.towers.includes(t));
ok(!placeTower(banned, 300, 300), 'appliances outside the list can’t be built');
let tw = null; for (let y = 80; y < 600 && !tw; y += 20) for (let x = 60; x < 1040 && !tw; x += 20) if (M.canPlace(ch.towers[0], x, y)) tw = placeTower(ch.towers[0], x, y);
ok(!!tw, 'a listed appliance can be built');
G.cash = 1e9;
upgradeTower(tw, 0); upgradeTower(tw, 0); upgradeTower(tw, 0);
ok(tw.up[0] === 3 && !upgradeTower(tw, 0) && /off in this challenge/.test(M.upgradeState(tw, 0).why), 'upgrades stop at tier 3');
ok(M.towerCost(ch.towers[0]) === Math.max(5, Math.round(M.TOWERS[ch.towers[0]].cost * M.X.DIFFS[ch.diff].cost * 1.2 / 5) * 5), 'prices follow the house rule');
const e1 = spawnEnemy('ant', {});
ok(Math.abs(e1.speed / (M.X.ENEMIES.ant.speed * M.X.waveRamp(G.round, G.D).speed) - 1.2) < 0.01, 'pests 20% faster');
ok(M.powerBlock() && /challenge/.test(M.powerBlock()), 'no powers in challenges');
const sv = M.serializeGame(); M.loadGame(sv);
ok(G.ch && G.ch.date === ch.date && G.win === ch.end && G.mod.maxTier === 3, 'challenge survives save and load');
G.vis = false;
const dBefore = P().dough;
while (!G.won && G.round <= ch.end) Admin.skipRound();
ok(G.won && P().daily.ch[ch.date] && P().stats.dailies === 1 && (P().crates[ch.reward.crate] || 0) >= 1, 'winning the challenge pays its reward once');
ok(!P().medals[ch.map], 'challenges don’t give map medals');
const dWin = P().dough - dBefore;
G.won = false; M.victory();
ok(P().stats.dailies === 1, 'a second win the same day pays nothing more');
console.log('     challenge dough', dWin);

/* ---- powers ---- */
fresh();
P().powers = { tipjar:2, traps:1, boost:1, restock:1, sweep:1, freeze:1, storm:1 };
M.newGame('block', 'michelin', false);
ok(/Michelin/.test(M.usePower('tipjar').why), 'no powers on Michelin');
M.newGame('block', 'medium', false); G.vis = false;
const cash0 = G.cash; ok(M.usePower('tipjar').ok && G.cash === cash0 + 225 && P().powers.tipjar === 1, 'Tip Jar pays $200 + $25 a round');
P().powers.traps = 2;
ok(!M.usePower('traps', { x: 2, y: 2 }).ok && P().powers.traps === 2, 'traps need the trail');
const tp = M.trailPoints()[40];
ok(M.usePower('traps', { x: tp.x + 10, y: tp.y + 10 }).ok && G.ptraps.length === 3 && P().powers.traps === 1, 'three mousetraps on the trail');
const ants = []; for (let i = 0; i < 25; i++) ants.push(spawnEnemy('ant', { d: Math.max(0, tp.d - 30 - i * 4), path: tp.path }));
const fly = spawnEnemy('fruitfly', { d: Math.max(0, tp.d - 30), path: tp.path });
const k0 = G.stats.kills;
for (let i = 0; i < 240; i++) step(DT);
ok(G.stats.kills - k0 === 18 && G.ptraps.every(t => t.left === 0), 'the traps snap up 18 small pests: ' + (G.stats.kills - k0));
ok(!fly.dead, 'flying pests sail over the traps');
let t1 = null; for (let y = 80; y < 600 && !t1; y += 20) for (let x = 60; x < 1040 && !t1; x += 20) if (M.canPlace('knife', x, y)) t1 = placeTower('knife', x, y);
ok(M.usePower('boost').ok && M.X.Profile() && G.glob.boost && G.glob.boost.mult === 2, 'Double Shot starts');
for (let i = 0; i < 16 * 60; i++) step(DT);
ok(!G.glob.boost, 'Double Shot wears off after 15s');
const L0 = G.lives; ok(M.usePower('restock').ok && G.lives === L0 + 30, 'Pantry Restock: +30 lives');
const ghost = spawnEnemy('roach', { camo:true, mold:true, armored:true });
ok(M.usePower('sweep').ok && !ghost.camo && !ghost.mold, 'Clean Sweep strips ghosts and mold');
const truck = spawnEnemy('truck', {}), rat = spawnEnemy('rat', {});
ok(M.usePower('freeze').ok && truck.freezeT === 2 && rat.freezeT === 4, 'Freezer Burst');
const th = truck.hp; ok(M.usePower('storm').ok && Math.round(th - truck.hp) === 3000 && rat.dead, 'Sizzle Storm: 3,000 to vehicles, 1,000 to the rest');
ok(P().stats.powers === 7, 'powers counted: ' + P().stats.powers);
ok(!M.usePower('storm').ok, 'can’t use a power you don’t have');
const sv2 = M.serializeGame();

/* ---- insta appliances ---- */
fresh();
for (let i = 0; i < 400; i++){
  for (const r of M.RARITY ? Object.keys(M.RARITY) : []){
    const it = M.rollInsta(r), key = M.instaKey(it.type, it.up);
    if (!M.parseInsta(key) || M.instaRarity(it.up) !== r){ ok(false, 'bad insta roll ' + key + ' for ' + r); i = 1e9; break; }
  }
}
ok(true, 'insta rolls are valid builds of the right rarity');
ok(!M.parseInsta('knife:5-5-0') && !M.parseInsta('knife:3-3-0') && !M.parseInsta('nope:1-0-0') && !!M.parseInsta('knife:0-2-5'), 'insta keys are checked');
M.newGame('block', 'medium', false); G.vis = false;
P().insta = { 'toaster:4-2-0': 1 };
let spot = null; for (let y = 80; y < 600 && !spot; y += 20) for (let x = 60; x < 1040 && !spot; x += 20) if (M.canPlace('toaster', x, y)) spot = [x, y];
const cashI = G.cash;
const r1 = M.placeInsta('toaster:4-2-0', spot[0], spot[1]);
ok(r1.ok && r1.t.up.join() === '4,2,0' && G.cash === cashI && !P().insta['toaster:4-2-0'], 'insta toaster placed free with its upgrades');
ok(r1.t.invested === M.instaValue('toaster', [4, 2, 0]) && r1.t.invested > 5000, 'it sells like a bought one ($' + r1.t.invested + ' invested)');
ok(!M.placeInsta('toaster:4-2-0', spot[0] + 200, spot[1]).ok, 'none left');

/* ---- crates ---- */
fresh();
P().dough = 1000;
ok(M.buyCrate('chef') && P().dough === 750 && P().crates.chef === 1, 'buy a Chef’s Crate');
const oc = M.openCrate('chef');
ok(oc && oc.got.some(g => g.k === 'insta') && oc.got.filter(g => g.k === 'power').reduce((a, g) => a + g.n, 0) === 2 && oc.got.some(g => g.k === 'dough'), 'it holds an insta appliance, two powers and Dough');
ok(!M.openCrate('chef'), 'no crate left to open');
const rar = { common:0, rare:0, epic:0, legendary:0 };
for (let i = 0; i < 2000; i++){ P().crates.gold = 1; const o = M.openCrate('gold'); rar[o.rarity]++; }
ok(rar.common === 0 && rar.legendary > 80 && rar.legendary < 260, 'golden crates: rare or better ' + JSON.stringify(rar));
ok(P().ach.crates10, 'Collector after 10 crates');

/* ---- achievements ---- */
fresh();
const pr = P();
pr.stats.wins = 3; pr.stats.cooked = 12000; pr.medals = { block:{ easy:1, medium:1 } }; pr.stats.rounds = 150;
const got = M.checkAchievements(true);
ok(got.map(a => a.id).sort().join() === ['cook10k', 'cook1k', 'easy', 'medium', 'rounds100', 'win1'].sort().join(), 'old progress unlocks the right achievements: ' + got.map(a => a.id).join(','));
ok(pr.dough === got.reduce((a, A) => a + A.dough, 0), 'and pays their Dough');
ok(M.checkAchievements(true).length === 0, 'only once');
ok(new Set(M.ACHIEVEMENTS.map(a => a.id)).size === M.ACHIEVEMENTS.length, 'achievement ids are unique');

/* ---- the Golden Roach ---- */
fresh();
M.newGame('block', 'medium', false); G.vis = false; G.round = 30;
const g = M.spawnGolden();
ok(g.gold && g.hp > 100 && !g.camo, 'golden roach hp at round 30: ' + Math.round(g.hp));
const gc = G.cash, gd = P().dough;
M.damage(g, g.hp + 1, 'normal', null, { ignoreImmune:true });
ok(g.dead && G.cash > gc + 300 && P().dough > gd && P().stats.golden === 1 && P().ach.golden, 'cooking it pays cash and Dough');
const g2 = M.spawnGolden(), lives = G.lives;
g2.d = G.paths[0].len + 10;
for (let i = 0; i < 3; i++) step(DT);
ok(g2.dead && G.lives === lives, 'an escaped golden roach costs no lives');
let spawned = 0;
for (let i = 0; i < 300; i++){ M.newGame('block', 'medium', false); G.vis = false; G.round = 20; startRound(); if (G.goldAt != null) spawned++; }
ok(spawned > 30 && spawned < 80, 'a golden roach shows up in about 1 round in 6: ' + spawned + '/300');

/* ---- saves ---- */
const merged = M.mergeProfile({ dough: '250', chef:{ xp: 1234.7 }, powers:{ storm: 2, bogus: 5, tipjar: -3 }, crates:{ chef: 1, x: 2 }, daily:{ last:'2026-10-13', streak: 4, ch:{ '2026-10-13':1, 'junk':1 } }, ach:{ win1: 1 } });
ok(merged.dough === 250 && merged.chef.xp === 1234 && merged.powers.storm === 2 && !merged.powers.bogus && !merged.powers.tipjar && merged.crates.chef === 1 && !merged.crates.x, 'profile fields are cleaned');
ok(merged.daily.last === '2026-10-13' && merged.daily.streak === 4 && merged.daily.ch['2026-10-13'] && !merged.daily.ch.junk && merged.ach.win1, 'daily and achievements kept');
const old = M.mergeProfile({ v:1, stats:{ games: 5, wins: 2 } });
ok(old.dough === 0 && old.stats.t5 === 0 && old.daily.streak === 0 && old.stats.wins === 2, 'old saves load with the new fields');
M.loadGame(sv2);
ok(true, 'game with powers loads');

/* ---- buying and opening in bulk ---- */
fresh();
P().dough = 10000;
ok(M.buyCrate('chef', 10) && P().crates.chef === 10 && P().dough === 10000 - 10 * M.CRATES.chef.cost, 'ten crates bought at once');
ok(!M.buyCrate('gold', 100) && !(P().crates.gold > 0) && P().dough === 10000 - 10 * M.CRATES.chef.cost, 'a bulk buy the Dough can’t cover buys nothing');
ok(M.buyPower('tipjar', 5) && P().powers.tipjar === 5, 'five powers bought at once');
{
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  const d0 = P().dough, i0 = sum(P().insta), p0 = sum(P().powers), c0 = P().stats.chests || 0;
  const r = M.openCrates('chef', 10);
  ok(r && r.n === 10 && P().crates.chef === 0 && P().stats.chests === c0 + 10, 'ten crates opened at once');
  ok(sum(P().insta) === i0 + 10 && sum(P().powers) === p0 + 10 * M.CRATES.chef.powers, 'every crate paid its insta appliance and powers');
  const dough = r.got.filter(g => g.k === 'dough');
  ok(dough.length === 1 && P().dough >= d0 + dough[0].n && dough[0].n >= 10 * M.CRATES.chef.dough[0] && dough[0].n <= 10 * M.CRATES.chef.dough[1], 'the Dough comes back as one total: ' + dough[0].n);
  const keys = r.got.filter(g => g.k === 'insta').map(g => g.key);
  ok(new Set(keys).size === keys.length && r.got.filter(g => g.k === 'insta').reduce((a, g) => a + g.n, 0) === 10, 'insta appliances are counted, not repeated');
  ok(r.got[0].k === 'insta' && r.got[r.got.length - 1].k === 'dough', 'best finds first, Dough last');
  P().crates.gold = 2500;
  const r2 = M.openCrates('gold', 2500);
  ok(r2.n === 2500 && P().crates.gold === 0, 'Open all opens every crate: 2,500 at once');
  P().dough = 1e6;
  ok(M.buyPower('tipjar', Math.floor(1e6 / M.POWERS.tipjar.cost)) && P().dough === 1e6 % M.POWERS.tipjar.cost, 'Max buys as many as the Dough covers: ' + P().powers.tipjar + ' Tip Jars');
  P().dough = 5e9;
  ok(M.buyCrate('chef', 2e7) && P().crates.chef === 2e7 && M.openCrates('chef', 2e7).n === M.OPEN_MAX, 'even a huge pile opens ' + M.OPEN_MAX + ' at a time');
  P().crates.chef = 0;
  ok(M.openCrates('chef', 5) === null, 'nothing to open, nothing opened');
}

/* ---- the service menu's Dough ---- */
fresh();
P().dough = 40; P().stats.doughEarned = 40;
Admin.dough(10000);
ok(P().dough === 10040 && P().stats.doughEarned === 10040, 'the service menu gives Dough, and it counts as earned');
Admin.setDough(250);
ok(P().dough === 250 && P().stats.doughEarned === 10040, 'setting a lower balance spends it');
Admin.setDough(-5); Admin.dough(-1e9);
ok(P().dough === 0, 'Dough never goes below zero');
Admin.setDough(1e6);
ok(P().dough === 1e6 && P().stats.doughEarned === 10040 + 1e6, 'setting a higher balance adds the difference');

console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
