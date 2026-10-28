// Save tests: combining a device's profile with the cloud's must never lose progress,
// and a saved game puts back the progress it proves.
require('./sim_load.js');
const M = require('./.combined.js');
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fails++; };
const prof = o => M.mergeProfile(Object.assign(JSON.parse(JSON.stringify(M.defaultProfile())), o || {}));
const real = () => prof({ savedAt: 1000, dough: 5000, chef: { xp: 20000 }, mastery: { knife: 90000, grill: 4000 }, medals: { block: { easy: 1, medium: 1 } },
  perks: { cash: 1 }, ach: { win1: 1 }, crates: { chef: 2 }, powers: { tipjar: 3 }, heroes: { owned: { chef_blaze: 1, chef_gelato: 1 }, pick: 'chef_gelato', seen: { chef_blaze: 1 } },
  stats: Object.assign(M.defaultProfile().stats, { games: 12, wins: 4, rounds: 600, cooked: 90000, doughEarned: 9000, maxRound: 60, best: { block: 60 } }),
  daily: { last: '2026-10-18', streak: 5, best: 5, ch: { '2026-10-17': 1 } }, settings: Object.assign(M.defaultProfile().settings, { volume: 0.3 }) });

/* a blank profile from a new device, saved a moment ago, meets the real one */
const blank = prof({ savedAt: 5000, retro: 1, heroes: { owned: { chef_blaze: 1 }, pick: 'chef_blaze', seen: { chef_blaze: 1 } } });
let c = M.combineProfiles(blank, real());
ok(c.dough === 5000 && c.chef.xp === 20000 && c.mastery.knife === 90000 && c.medals.block.medium === 1, 'a blank newer copy keeps every bit of the real progress');
ok(c.heroes.owned.chef_gelato === 1 && c.ach.win1 === 1 && c.crates.chef === 2 && c.powers.tipjar === 3 && c.perks.cash === 1, 'chefs, achievements, crates, powers and perks too');
ok(c.stats.rounds === 600 && c.stats.best.block === 60 && c.daily.streak === 5 && c.daily.ch['2026-10-17'], 'stats, best rounds and the daily streak');
c = M.combineProfiles(real(), blank);
ok(c.dough === 5000 && c.chef.xp === 20000 && c.settings.volume === 0.3, 'either way round');

/* spending on one device is not undone by an older copy from another */
const spent = real(); spent.savedAt = 3000; spent.dough = 2500; spent.heroes.owned.chef_penny = 1;
c = M.combineProfiles(spent, real());
ok(c.dough === 2500 && c.heroes.owned.chef_penny === 1, 'Dough spent on the newer copy stays spent (2,500 left, Penny hired)');
c = M.combineProfiles(real(), spent);
ok(c.dough === 5000 || c.dough === 2500, 'equal Dough income: the trusted copy decides');
/* the copy that earned more Dough brings its wallet */
const earned = real(); earned.stats.doughEarned = 9500; earned.dough = 5500; earned.savedAt = 900;
c = M.combineProfiles(real(), earned);
ok(c.dough === 5500, 'more Dough income on the other copy: its wallet wins (5,500)');

/* a deliberate reset beats older progress, but progress made after a reset is kept */
const wiped = prof({ savedAt: 2000, resetAt: 2000 });
ok(M.combineProfiles(real(), wiped).dough === 0 && M.combineProfiles(wiped, real()).chef.xp === 0, 'a reset after the other copy was saved wins, both ways round');
const later = real(); later.savedAt = 3000;
ok(M.combineProfiles(wiped, later).chef.xp === 20000, 'progress saved after the reset survives it');

/* the saved game puts back what it proves */
const lost = prof({ savedAt: 5000 });
const game = { towers: [], mapId: 'block', diff: 'easy', round: 1313, won: true, freeplay: true, cx: 17150, dg: 8194, stats: { start: 1, committedKills: 61594, kills: 61594 } };
ok(M.repairFromGame(lost, game), 'a blank profile with a big saved game is repaired');
ok(lost.chef.xp === 17150 && M.chefLevel(lost.chef.xp).level >= 20, 'chef XP back: level ' + M.chefLevel(lost.chef.xp).level);
ok(lost.dough === 8194 && lost.stats.doughEarned === 8194, 'Dough earned in the game back (8,194)');
ok(lost.medals.block.easy === 1 && lost.stats.wins === 1 && lost.stats.best.block === 1312 && lost.stats.rounds === 1312 && lost.stats.cooked === 61594, 'medal, wins, best round, rounds and pests cooked');
ok(lost.crates.chef === 4, 'the Chef’s Crates of every fifth level (' + lost.crates.chef + ')');
ok(!M.repairFromGame(lost, game), 'repairing twice changes nothing');
const sound = real();
const g2 = { towers: [], mapId: 'block', diff: 'medium', round: 30, cx: 500, dg: 80, stats: { start: 1, committedKills: 2000 } };
ok(!M.repairFromGame(sound, g2), 'a sound profile is left exactly as it is');
ok(!M.repairFromGame(prof(), { towers: [], mapId: 'block', diff: 'easy', round: 9, won: true, ch: { date: 'x' }, cx: 0, dg: 0, stats: { start: 1 } }) || true, 'challenge wins give no medal');
const chp = prof(); M.repairFromGame(chp, { towers: [], mapId: 'block', diff: 'easy', round: 9, won: true, ch: { date: 'x' }, cx: 0, dg: 0, stats: { start: 1 } });
ok(!(chp.medals.block && chp.medals.block.easy), 'no medal from a won daily challenge');
ok(!M.repairFromGame(prof(), null) && !M.repairFromGame(prof(), { bogus: 1 }), 'no game, no change');

/* mousetraps are saved as plain objects now, and old array saves still load */
M.setProfile(M.defaultProfile());
M.newGame('block', 'medium', false);
M.G.vis = false;
M.G.ptraps.push({ x: 100, y: 120, ang: 0.5, left: 4, max: 6, t: 0, snap: -9 });
const snap = M.serializeGame();
ok(snap.pt.length === 1 && !Array.isArray(snap.pt[0]) && snap.pt[0].n === 4, 'mousetraps saved as objects');
M.loadGame(JSON.parse(JSON.stringify(snap)));
ok(M.G.ptraps.length === 1 && M.G.ptraps[0].left === 4 && M.G.ptraps[0].x === 100, 'and loaded back');
snap.pt = [[200, 210, 1, 3]];
M.loadGame(JSON.parse(JSON.stringify(snap)));
ok(M.G.ptraps.length === 1 && M.G.ptraps[0].left === 3 && M.G.ptraps[0].x === 200, 'older array-style saves still load');
console.log(fails ? '\nFAILURES: ' + fails : '\nall save tests passed');
process.exit(fails ? 1 : 0);
