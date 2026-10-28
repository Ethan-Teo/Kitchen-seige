// Polish: round history, the build log and its replay, saves keeping both, the game summary, favourites.
require('./sim_load.js');
const E = require('./.combined.js');
const { G } = E;
E.Store.init();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
E.newGame('block', 'easy', false);
G.cash = 1e6;
function spot(t, skip){ for (let x = 120; x < 1000; x += 37) for (let y = 90; y < 620; y += 37) if (E.canPlace(t, x, y) && !(skip && skip(x, y))) return [x, y]; }
const a = E.placeTower('knife', ...spot('knife')), b = E.placeTower('toaster', ...spot('toaster'));
function play(){ E.startRound(); let n = 0; while (G.roundActive && n < 60 * 120){ E.step(1 / 60); n++; } }
play();
ok(G.hist.length === 1 && G.hist[0][0] === 1, 'a cleared round adds to the history');
ok(G.blog.filter(e => e[0] === 'a').length === 2, 'the two appliances are in the build log');
E.upgradeTower(a, 0); E.upgradeTower(a, 0);
E.sellTower(b);
const c = E.placeTower('knife', ...spot('knife'));
play();
ok(G.blog.some(e => e[0] === 'u' && e[2] === a.id && e[3] === '200'), 'an upgrade is logged');
ok(G.blog.some(e => e[0] === 'd' && e[2] === b.id), 'a sale is logged');
const r1 = E.buildAt(1), r2 = E.buildAt(2);
ok(Object.keys(r1).length === 2 && r1[a.id].up === '000', 'the build before round 1');
ok(Object.keys(r2).length === 2 && r2[a.id].up === '200' && !r2[b.id] && r2[c.id], 'the build before round 2');
ok(JSON.stringify(E.buildRounds()) === '[1,2]', 'the replay has a step per round with changes');
/* saves keep both, and ids survive a load */
const snap = JSON.parse(JSON.stringify(E.serializeGame()));
E.loadGame(snap);
ok(G.hist.length === 2 && G.blog.length === snap.bl.length, 'a save keeps the history and the build log');
ok(G.towers.some(t => t.id === a.id && t.type === 'knife'), 'appliances keep their ids across a load');
const before = G.blog.length;
E.startRound();
ok(G.blog.length === before, 'loading doesn’t log the whole build again');
G.roundActive = false;
/* summary */
const S = E.gameSummary();
ok(S.rounds === 2 && S.towers === 2 && S.kinds.length === 1 && S.kinds[0].type === 'knife' && S.top.length === 2, 'the summary counts rounds, appliances and kinds');
/* long games stay small */
for (let i = 0; i < 500; i++) E.histRoundEnd(i);
ok(G.hist.length <= 400, 'the history is capped');
/* favourites */
E.Profile().settings.favs = [];
ok(E.toggleFav('knife') === true && E.favList()[0] === 'knife', 'an appliance can be starred');
ok(E.toggleFav('knife') === false && !E.favList().length, 'and unstarred');
for (const t of ['knife', 'toaster', 'kettle', 'blender', 'grill', 'fryer', 'freezer', 'microwave', 'dishwasher', 'boat', 'pizza', 'mixer', 'spray']) E.toggleFav(t);
ok(E.favList().length <= 12, 'no more than twelve favourites');
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
