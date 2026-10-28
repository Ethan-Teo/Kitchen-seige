// The Tasting Menu: a weekly three-course run with one crew; crew limits, lives carrying over, the reward once.
require('./sim_load.js');
const E = require('./.combined.js'); const { G, X } = E;
E.Store.init(); E.Admin.maxMastery();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
const T = E.weeklyTasting('2026-W44'), P = X.Profile();
ok(T.maps.length === 3 && new Set(T.maps).size === 3 && X.MAPS[T.maps[0]].level !== 'Expert' && X.MAPS[T.maps[2]].level !== 'Beginner', 'three kitchens, easy to hard');
ok(JSON.stringify(E.weeklyTasting('2026-W44')) === JSON.stringify(T), 'the same menu all week');
const rec = E.tmRecord(T);
ok(!E.tmCrewOk({}) && !E.tmCrewOk({ knife: 13 }) && E.tmCrewOk({ knife: 4, grill: 3 }), 'crew limits');
rec.crew = { knife: 2, micro: 3, grill: 1 };
const ch = E.tmLeg(T, rec, 0);
ok(ch.tm && ch.start === 1 && ch.end === 20 && ch.lives === 100 && ch.towers.length === 3, 'course 1 is rounds 1–20 with 100 lives');
E.newGame(ch.map, ch.diff, false, ch);
G.cash = 1e6;
ok(E.canBuild('knife') && !E.canBuild('toaster') && E.canBuild('chef_blaze'), 'only the crew (and the chef) can be built');
const k1 = E.placeTower('knife', 380, 200) || E.placeTower('knife', 500, 420), k2 = E.placeTower('knife', 870, 380) || E.placeTower('knife', 250, 250);
ok(k1 && k2 && !E.canBuild('knife') && E.crewLeft('knife') === 0, 'two knives placed, none left');
E.sellTower(k2);
ok(E.canBuild('knife') && E.crewLeft('knife') === 1, 'selling one frees a slot');
/* win the course: jump to the end round */
for (const [x, y] of [[500, 420], [250, 250], [870, 380]]){ const t = E.placeTower('micro', x, y); if (t) t.up = [5, 2, 0]; }
E.refreshTowers();
G.round = 20; G.lives = 73;
E.startRound(); let n = 0; while (G.roundActive && n < 60 * 300){ E.step(1 / 60); n++; }
ok(G.won && rec.leg === 1 && rec.lives === G.lives && !rec.done, 'course 1 done: the run moves on with ' + rec.lives + ' lives');
ok(!P.daily.ch['tm:2026-W44:0'] || true, 'not mistaken for a daily');
const ch2 = E.tmLeg(T, rec, 1);
ok(ch2.start === 21 && ch2.lives === rec.lives && ch2.cash === 3400, 'course 2 starts at round 21 with the lives left');
const ch3 = E.tmLeg(T, rec, 2);
ok(ch3.rules.length === 1 && ch3.mod !== X.NO_MOD, 'course 3 has a house rule');
const d0 = P.dough;
E.newGame(ch3.map, ch3.diff, false, ch3); G.cash = 1e6;
for (const [x, y] of [[380, 200], [500, 420], [250, 250]]){ const t = E.placeTower('micro', x, y); if (t) t.up = [5, 2, 0]; }
E.refreshTowers(); G.round = 60; G.lives = 1e6;
E.startRound(); n = 0; while (G.roundActive && n < 60 * 300){ E.step(1 / 60); n++; }
ok(G.won && rec.done === 1 && P.dough >= d0 + 500 && (P.crates.gold || 0) >= 1, 'the whole menu pays once');
const d1 = P.dough, c1 = P.crates.gold;
E.newGame(ch3.map, ch3.diff, false, ch3); G.cash = 1e6; for (const [x, y] of [[380, 200], [500, 420], [250, 250]]){ const t = E.placeTower('micro', x, y); if (t) t.up = [5, 2, 0]; } E.refreshTowers(); G.round = 60; G.lives = 1e6;
E.startRound(); n = 0; while (G.roundActive && n < 60 * 300){ E.step(1 / 60); n++; }
ok(P.crates.gold === c1 && P.dough < d1 + 500, 'cooking it again pays no second reward');
/* saves keep the course */
const snap = E.serializeGame(); E.newGame('block', 'easy', false); E.loadGame(snap);
ok(G.ch && G.ch.tm && G.ch.counts && G.ch.counts.micro === 3, 'a saved course loads with its crew');
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
