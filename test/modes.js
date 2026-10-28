// Game modes: each one's rules hold through real rounds, medals land under their own keys, saves keep the mode.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
E.Store.init(); E.Admin.maxMastery();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
function run(sec){ for (let i = 0; i < sec * 60; i++) E.step(1 / 60); }
/* noGold: no golden pest this round (its random bounty would make cash comparisons flaky) */
function playRound(noGold){ E.startRound(); if (noGold) G.goldAt = null; let n = 0; while (G.roundActive && n < 60 * 240){ E.step(1 / 60); n++; } return n / 60; }
function arm(){ for (const [t, x, y] of [['micro', 380, 200], ['micro', 500, 420], ['grill', 870, 380], ['micro', 250, 250]]){ const tw = E.placeTower(t, x, y); if (tw){ tw.up = [5, 2, 0]; } } E.refreshTowers(); }

/* every mode sets up */
for (const id of E.MODE_ORDER){
  const M = E.MODES[id];
  E.newGame('block', M.diff, false, null, id);
  ok(G.mode === id && G.M === M && G.diff === M.diff, id + ' sets up on ' + M.diff);
}
ok(E.modesFor('easy').length === 2 && E.modesFor('hard').length === 4 && E.modesFor('michelin').length === 1, 'modes per difficulty');

/* Fixed Menu: no cash moves at all except sales */
E.newGame('block', 'easy', false, null, 'fixed');
ok(G.round === 31 && G.cash === 20000 && G.win === 60, 'Fixed Menu starts round 31 with $20,000, ends at 60');
G.cash = 1e6; arm(); G.cash = 20000;
const t0 = E.placeTower('knife', 200, 200); const c1 = G.cash;
playRound();
ok(G.cash === c1, 'no cash from pests or the round bonus (' + G.cash + ')');
E.sellTower(t0);
ok(G.cash > c1, 'selling still refunds');
ok(E.powerBlock(), 'no powers in Fixed Menu');

/* Half Portions */
E.newGame('block', 'hard', false, null, 'half');
ok(G.cash === Math.round(650 * 0.5), 'half the starting cash');
G.cash = 1e6; arm(); G.cash = 0;
E.newGame('block', 'hard', false, null, 'half'); G.cash = 1e6; arm(); G.cash = 0;
G.round = 10; playRound(true);
const bonusHalf = G.cash;
E.newGame('block', 'hard', false); G.cash = 1e6; arm(); G.cash = 0; G.round = 10; playRound(true);
ok(bonusHalf < G.cash * 0.75 && bonusHalf > 0, 'about half the cash over a round (' + bonusHalf + ' vs ' + G.cash + ')');

/* Double Trouble */
E.newGame('block', 'hard', false, null, 'double');
const d1 = E.spawnEnemy('cheese', {}); E.newGame('block', 'hard', false); const d2 = E.spawnEnemy('cheese', {});
ok(Math.abs(d1.maxHp / d2.maxHp - 2) < 0.01, 'vehicles have double health');
const s1 = E.spawnEnemy('ant', {}); E.newGame('block', 'hard', false, null, 'double'); const s2 = E.spawnEnemy('ant', {});
ok(s1.maxHp === s2.maxHp, 'small pests unchanged');

/* Back Door: pests start where the pantry was and leak at the crack */
E.newGame('block', 'medium', false, null, 'reverse');
const P = G.paths[0], first = X.MAPS.block.paths[0];
ok(P.pts[0][0] === first[first.length - 1][0] && P.pts[0][1] === first[first.length - 1][1], 'the trail starts at the old pantry');
const r = E.spawnEnemy('ant', {}); run(0.5);
ok(Math.hypot(r.x - P.pts[0][0], r.y - P.pts[0][1]) < 80, 'pests enter from the pantry end');

/* Prep only */
E.newGame('block', 'easy', false, null, 'prep');
ok(E.canBuild('knife') && E.canBuild('chef_blaze') && !E.canBuild('grill') && !E.canBuild('boat'), 'only prep appliances and the chef');
ok(!E.placeTower('grill', 330, 210), 'placing a grill fails');

/* Rush Hour */
E.newGame('block', 'medium', false, null, 'rush');
G.cash = 1e6; arm();
E.startRound(); let n = 0; while (G.roundActive && n < 60 * 240){ E.step(1 / 60); n++; }
const rAfter = G.round; run(8);
ok(G.roundActive && G.round === rAfter, 'the next round starts by itself within a few seconds');

/* Chef's Special */
E.newGame('block', 'hard', false, null, 'alt');
const odd = E.roundGroupsFor(21), even = E.roundGroupsFor(40);
E.newGame('block', 'hard', false);
const std = E.roundGroupsFor(21);
ok(odd.some((g, i) => g.type !== std[i].type), 'odd rounds are promoted');
ok(even.filter(g => X.ENEMIES[g.type].big && !X.ENEMIES[g.type].boss).every(g => g.mods.includes('a')), 'even rounds send armored vehicles');

/* Chef's Table */
E.newGame('block', 'michelin', false, null, 'table');
ok(G.round === 6 && G.lives === 1 && G.cash === 650 && !E.canSell() && !!E.powerBlock(), 'rounds from 6, one life, $650, no selling, no powers');
G.cash = 1e6; arm(); G.cash = 100; const tc = G.cash;
E.startRound(); run(3);
ok(G.cash === tc || G.stats.earned === 0 || G.cash <= tc, 'no cash from pests');
ok(!E.retryRound(), 'no retries');

/* a mode medal lands under its own key, the Standard one stays */
E.newGame('block', 'easy', false, null, 'prep'); X.Profile().medals.block = {};
G.round = 40; G.win = 40; G.cash = 1e6;
for (const [t, x, y] of [['knife', 380, 200], ['knife', 500, 420], ['toaster', 870, 380], ['knife', 250, 250], ['blender', 700, 330], ['dish', 200, 160]]){ const tw = E.placeTower(t, x, y); if (tw) tw.up = [5, 2, 0]; }
E.refreshTowers();
playRound();
ok(G.won && X.Profile().medals.block['easy:prep'] === 1 && !X.Profile().medals.block.easy, 'the Prep Cook medal is its own');
ok(E.modeMedals('block').got === 1 && E.modeMedals('block').all === E.MODE_ORDER.length, 'the kitchen counts one mode medal');

/* saves keep the mode */
E.newGame('block', 'medium', false, null, 'reverse');
const snap = E.serializeGame();
E.newGame('block', 'easy', false);
E.loadGame(snap);
ok(G.mode === 'reverse' && G.paths[0].pts[0][0] === first[first.length - 1][0], 'a saved Back Door game loads reversed');

console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
