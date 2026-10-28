// Expeditions: a fresh run, the crew, playing a kitchen, packing up, camp boons, packed appliances placed free, defeat, the finish.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
E.Store.init();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
const P = () => E.Profile();
function clearLeg(){
  G.cash = 1e7;
  const spots = [[380, 260], [600, 260], [700, 420], [200, 420], [500, 500], [900, 300], [300, 120]];
  for (const [x, y] of spots){ for (const t of G.ch.towers){ const tw = E.placeTower(t, x, y); if (tw){ tw.up = E.exCleanUp(t, [3, 2, 0]); break; } } }
  E.refreshTowers();
  G.round = G.ch.end; G.lives = Math.max(G.lives, 1e6);
  E.startRound(); let n = 0; while (G.roundActive && n < 60 * 400){ E.step(1 / 60); n++; }
}

/* a run from a seed is the same every time */
const a = E.exNew(42), maps = a.maps.slice();
ok(maps.length === 5 && new Set(maps).size === 5, 'five different kitchens: ' + maps.join(', '));
ok(X.MAPS[maps[0]].level === 'Beginner' && ['Advanced', 'Expert'].includes(X.MAPS[maps[4]].level), 'they rise from Beginner to Advanced or Expert');
ok(JSON.stringify(E.exNew(42).maps) === JSON.stringify(maps), 'the same seed gives the same run');
ok(!a.rules[0] && !a.rules[1] && a.rules[2], 'house rules start at the third kitchen');
/* the crew */
const rec = E.exNew(7);
ok(!E.exCrewOk([], rec) && E.exCrewOk(['knife', 'toaster'], rec), 'a crew needs at least one kind');
ok(!E.exCrewOk(['knife', 'toaster', 'kettle', 'blender', 'mixer', 'whisk', 'fridge'].filter(t => X.TOWERS[t]).concat(E.exTypes().slice(0, 7)).slice(0, 7), rec), 'and no more than six');
rec.crew = ['knife', 'toaster', 'spray']; E.saveProfile();
/* kitchen 1 */
let ch = E.exLeg(rec);
ok(ch.ex && ch.start === 1 && ch.end === 15 && ch.diff === 'easy' && ch.map === rec.maps[0], 'kitchen 1 is rounds 1 to 15 on easy');
E.newGame(ch.map, ch.diff, false, ch);
ok(E.canBuild('knife') && !E.canBuild('boat') && E.crewLeft('knife') === Infinity, 'only the crew can be built, as many as you like');
ok(E.modeNoRetry(), 'no retries on an expedition');
clearLeg();
ok(G.won, 'kitchen 1 cleared');
const r1 = P().expedition;
ok(r1.leg === 1 && r1.pack.length >= 3 && r1.pack.length <= 12 && r1.offer && r1.offer.length === 3, 'it packs ' + r1.pack.length + ' appliances and offers 3 boons: ' + (r1.offer || []).join(', '));
ok(r1.lives >= 1e6 - 1, 'lives carry over');
ok((P().stats.exBest || 0) >= 1, 'the best run is counted');
/* camp */
const before = r1.pack.map(p => Math.max(...p.up));
r1.offer = ['whetstone', 'purse', 'scout'];
ok(E.exPickBoon('whetstone') && r1.pack.every((p, i) => Math.max(...p.up) === Math.min(4, before[i] + 1) || before[i] >= 4), 'Whetstone raises each packed main path');
ok(!E.exPickBoon('purse'), 'only one boon per camp');
r1.lives = 120;
/* kitchen 2: the pack comes along and places free */
ch = E.exLeg(r1);
ok(ch.start === 16 && ch.end === 30 && ch.lives === 120 && ch.pack.length === r1.pack.length, 'kitchen 2 is rounds 16 to 30 with the lives and the pack');
E.newGame(ch.map, ch.diff, false, ch);
const cash = G.cash, first = G.ch.pack[0];
let placed = null;
for (let x = 120; x < 1000 && !placed; x += 40) for (let y = 100; y < 600 && !placed; y += 40) if (E.canPlace(first.type, x, y)){ const r = E.exPlacePack(0, x, y); if (r.ok) placed = r.t; }
ok(placed && G.cash === cash && JSON.stringify(placed.up) === JSON.stringify(E.exCleanUp(first.type, first.up)) && placed.invested > 0, 'a packed ' + first.type + ' ' + first.up.join('-') + ' is placed for free with its upgrades');
ok(G.ch.pack.length === r1.pack.length - 1, 'and leaves the pack');
const snap = E.serializeGame(); E.loadGame(JSON.parse(JSON.stringify(snap)));
ok(G.ch.pack.length === r1.pack.length - 1 && G.ch.ex.leg === 1, 'the pack survives a save');
/* clean-up rules for packed upgrades */
ok(JSON.stringify(E.exCleanUp('knife', [5, 5, 5])) === '[5,2,0]', 'packed upgrades keep the crosspath rules');
/* defeat ends the run */
G.lives = 1; G.over = false; E.gameOver();
ok(P().expedition.over === true, 'losing a kitchen ends the expedition');
/* a full run pays once at the end */
const run = E.exNew(99); run.crew = ['knife', 'toaster', 'kettle'].filter(t => E.exTypes().includes(t)); E.saveProfile();
const dough0 = P().dough, crates0 = (P().crates.gold || 0);
for (let leg = 0; leg < 5; leg++){
  const c = E.exLeg(P().expedition);
  E.newGame(c.map, c.diff, false, c);
  clearLeg();
  if (!G.won){ ok(false, 'kitchen ' + (leg + 1) + ' cleared'); break; }
  const R = P().expedition;
  if (R.offer) E.exPickBoon(R.offer[0] === 'recruit' ? R.offer[1] : R.offer[0]);
}
const R = P().expedition;
ok(R.done && R.leg === 5, 'all five kitchens cleared');
ok(P().dough - dough0 >= 900 && (P().crates.gold || 0) === crates0 + 1 && P().stats.expeditions >= 1, 'the finish pays ' + (P().dough - dough0) + ' Dough and a Gold crate');
const again = E.exLegDone();
ok(!again || (!again.dough && !again.crate), 'and it can’t be paid twice');
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
