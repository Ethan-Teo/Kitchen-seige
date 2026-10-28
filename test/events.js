// Weekly events: the same events for a week, Boss Night's tiers and clock, the Race's finish, boards, saves.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
E.Store.init(); E.Admin.maxMastery();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
function run(sec){ for (let i = 0; i < sec * 60; i++) E.step(1 / 60); }
function playRound(){ E.startRound(); let n = 0; while (G.roundActive && n < 60 * 300){ E.step(1 / 60); n++; } return n / 60; }
function arm(){ G.cash = 1e6; let k = 0; for (let x = 40; x < X.W && k < 12; x += 60) for (let y = 40; y < X.H && k < 12; y += 60){ if (!E.canPlace('micro', x, y)) continue; const t = E.placeTower('micro', x, y); if (t){ t.up = [5, 2, 0]; k++; } } E.refreshTowers(); G.cash = 650; }

ok(E.weekKey(new Date(2026, 9, 27)) === '2026-W44' && E.weekKey(new Date(2026, 0, 1)) === '2026-W01', 'ISO week keys');
const a = E.weeklyEvents('2026-W44'), b = E.weeklyEvents('2026-W44'), c = E.weeklyEvents('2026-W45');
ok(JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(c), 'a week always gets the same events, the next week different ones');
ok(a.boss.map !== a.race.map && X.ENEMIES[a.boss.boss].boss && [30, 35, 40].includes(a.race.end), 'a boss, two kitchens and a race length');

/* Boss Night */
const P = X.Profile(); P.events = {}; P.boards = { boss: [], race: [] }; const d0 = P.dough;
E.newGame(a.boss.map, 'hard', false, null, 'standard', a.boss);
ok(G.ev && G.ev.kind === 'boss' && G.win === 100 && E.powerBlock(), 'Boss Night sets up: 100 rounds, no powers');
ok(E.evRecord(a.boss).tries === 1, 'a try is counted');
arm();
const g20 = E.roundGroupsFor(20), g19 = E.roundGroupsFor(19);
ok(g20.some(g => g.type === a.boss.boss && g.evTier === 1) && !g19.some(g => g.type === a.boss.boss), 'the boss joins round 20 and not 19');
G.round = 20;
E.startRound(); run(4);
const boss = G.enemies.find(e => e.boss);
ok(boss && boss.lvl === 1 && boss.maxHp > 1000, 'tier 1 boss at level 1 (' + Math.round(boss.maxHp) + ' health)');
ok(G.evClock > 3, 'the clock runs during the round');
let n = 0; while (G.roundActive && n < 60 * 300){ E.step(1 / 60); n++; }
ok(!G.roundActive && G.ev.done === 1 && G.ev.times[0] > 0, 'tier 1 cleared and timed (' + E.fmtClock(G.ev.times[0]) + ')');
ok(E.evRecord(a.boss).tiers === 1 && P.dough >= d0 + 100, 'the profile keeps tier 1 and pays 100 Dough (' + (P.dough - d0) + ')');
ok(E.boardOf('boss').length === 1 && E.boardOf('boss')[0].tier === 1, 'the run is on the board');
const clock1 = G.evClock;
run(5);
ok(G.evClock === clock1, 'the clock stops between rounds');
G.round = 40; const g40 = E.roundGroupsFor(40);
ok(Math.abs(g40.find(g => g.evTier === 2).hpMul / g20.find(g => g.evTier === 1).hpMul - E.EV_TIER_HP[1]) < 0.01, 'tier 2 is tougher');
/* retry penalty */
G.lastSnap = E.serializeGame();
E.retryRound();
ok(G.ev && G.ev.retries === 1 && Math.abs(E.evScore() - (G.evClock + 30)) < 0.01 && G.ev.done === 1, 'a retry keeps the event and adds 30s');
/* save and load */
const snap = E.serializeGame();
E.newGame('block', 'easy', false);
E.loadGame(snap);
ok(G.ev && G.ev.kind === 'boss' && G.ev.done === 1 && G.evClock > 3 && G.win === 100, 'a saved Boss Night loads with its tier and clock');

/* the Race */
E.newGame(a.race.map, 'medium', false, null, 'standard', a.race);
ok(G.ev.kind === 'race' && G.win === a.race.end, 'the race ends at its round');
arm();
E.startRound(); n = 0; while (G.roundActive && n < 60 * 300){ E.step(1 / 60); n++; }
run(2);
ok(G.roundActive && G.round === 2, 'the next round starts by itself');
G.round = a.race.end; G.roundActive = false; G.spawn = null; G.enemies = [];
playRound();
ok(G.won && E.evRecord(a.race).time > 0 && P.dough >= d0 + 100 + 250, 'finishing the race records a time and pays');
ok(!(P.medals[a.race.map] || {}).medium, 'no medal from a race');
ok(E.boardOf('race').length === 1, 'the race is on the board');

console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
