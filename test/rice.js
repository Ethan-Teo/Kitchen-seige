// Rice Cooker: it cooks then bursts, waits when ready, opening the lid early, sticky rice, keep warm and the timer, abilities, the paragon.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
E.Store.init(); E.Admin.maxMastery();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
function run(sec, each){ for (let i = 0; i < sec * 60; i++){ E.step(1 / 60); if (each) each(); } }
function fresh(round){ E.newGame('block', 'medium', false); G.cash = 1e9; G.admin.god = true; G.round = round || 12; }
/* a cooker beside the trail, and tough pests in its reach */
function cooker(up){
  for (let x = 120; x < 1000; x += 23) for (let y = 90; y < 620; y += 23){
    if (!E.canPlace('rice', x, y)) continue;
    const t = E.placeTower('rice', x, y); t.up = up.slice(); E.refreshTowers();
    if (E.sprayTrailSpot(t, t.s.range * 0.8)) return t;
    E.sellTower(t);
  }
}
function pestsNear(t, type, n, hp){
  const at = E.sprayTrailSpot(t, t.s.range * 0.8), out = [];
  for (let i = 0; i < n; i++){ const e = E.spawnEnemy(type, {}); e.path = at.path; e.d = Math.max(0, at.d - i * 4); const q = E.pathPos(G.paths[at.path], e.d, 0); e.x = q.x; e.y = q.y; e.seg = q.seg; e.hp = e.maxHp = hp || 1e5; e.speed = 0.001; out.push(e); }
  return out;
}
const T = X.TOWERS.rice;
ok(T && T.paths.length === 3 && T.paths.every(p => p.ups.length === 5) && T.paragon && E.TOWER_ORDER.includes('rice'), 'the Rice Cooker has three paths of five and a paragon');
ok(T.hot === '{' && T.faction === 'line', 'hotkey { and Hot & Cold');

/* it cooks, then waits, warm, until pests come */
fresh(8);
let t = cooker([0, 0, 0]);
ok(t, 'a cooker placed beside the trail');
run(5);
ok(E.riceCharge(t) === 1 && t.dmg === 0, 'with no pests near, the rice cooks and waits');
let ps = pestsNear(t, 'roach', 6);
G.roundActive = true; G.spawn = [];
run(0.1);
ok(t.dmg > 0 && ps.every(e => e.hp < e.maxHp), 'pests arrive: one burst hits all of them (' + Math.round(t.dmg) + ')');
const d1 = t.dmg;
run(1.5);
ok(t.dmg === d1 && E.riceCharge(t) < 1, 'then it cooks again before the next burst');
run(2.5);
ok(t.dmg > d1, 'and bursts again when ready');
/* opening the lid early */
{
  const before = t.dmg;
  t.cd.main = t.s.atk.main.rate * 0.9;
  ok(!E.riceOpenLid(t), 'the lid stays shut when it has barely cooked');
  t.cd.main = t.s.atk.main.rate * 0.5;
  ok(E.riceOpenLid(t) && t.dmg > before && t.dmg - before < (d1 * 0.9), 'opened half way: a weaker burst');
  ok(t.cd.main === t.s.atk.main.rate, 'and it starts cooking again');
}
/* heat: fire ants are out of its reach until the pressure cooker */
fresh(20);
t = cooker([0, 0, 0]);
ps = pestsNear(t, 'fireant', 4);
G.roundActive = true; G.spawn = []; t.cd.main = 0;
run(0.2);
ok(t.dmg === 0, 'fire ants shrug off the steam');
t.up = [3, 0, 0]; E.refreshTowers(); t.cd.main = 0;
run(0.2);
ok(t.dmg > 0 && t.s.atk.main.ignoreImmune, 'the Pressure Cooker gets through');

/* sticky rice */
fresh(12);
t = cooker([0, 4, 0]);
ps = pestsNear(t, 'ant', 5);
const truck = pestsNear(t, 'truck', 1)[0];
G.roundActive = true; G.spawn = []; t.cd.main = 0;
run(0.05);
ok(ps.every(e => e.riceT > 0 && e.stunT > 0 && e.vulnAmt >= 4), 'Mochi Mallet: small pests are coated, glued and take more');
ok(truck.slowMult < 1 && !(truck.stunT > 0), 'vehicles are slowed, not glued');
ok(t.s.atk.balls && t.s.atk.balls.kind === 'proj', 'rice balls fly further out');
const ab = t.s.abilities.find(a => a.id === 'mochi');
ok(ab && E.runRiceAbility(t, ab) && G.enemies.filter(e => !e.big && !e.dead).every(e => e.stunT >= 2), 'Mochi Pound glues every pest on screen');

/* keep warm, and the timer */
fresh(12);
t = cooker([0, 0, 3]);
ok(t.s.atk.main.store === 4 && t.s.buff && t.s.buff.speed === 1.1, 'Rice Timer keeps 4 pots; the Warm Plate warms its neighbours');
run(4 * 3.2 + 4);
ok(t.riceStore === 4, 'with no pests near it keeps 4 pots warm');
ps = pestsNear(t, 'ant', 3, 1e7);
G.roundActive = true; G.spawn = [];
run(0.05);
const one = t.dmg;
ok(one > 0 && t.riceQ > 0, 'small pests arrive: the pots come out one after another');
run(1.5);
ok(t.dmg >= one * 4.5 && !t.riceQ, 'all five bursts served (' + Math.round(t.dmg) + ')');
fresh(12);
t = cooker([0, 0, 3]);
run(4 * 3.2 + 4);
ps = pestsNear(t, 'truck', 1, 1e7);
G.roundActive = true; G.spawn = [];
run(0.05);
ok(t.riceStore === 0 && Math.round(t.dmg) === Math.round(t.s.atk.main.dmg * 2 * 5) && !t.riceQ, 'a vehicle arrives: every kept pot at once at double damage (' + Math.round(t.dmg) + ')');
/* Serve! */
t.up = [0, 0, 4]; E.refreshTowers();
const sv = t.s.abilities.find(a => a.id === 'serve');
const ds = t.dmg;
ok(sv && E.runRiceAbility(t, sv) && t.dmg > ds, 'Serve! cooks and serves every pot at once');

/* Blow the Valve */
fresh(12);
t = cooker([4, 0, 0]);
ps = pestsNear(t, 'ant', 3, 1e7);
G.roundActive = true; G.spawn = []; t.cd.main = 5;
const vv = t.s.abilities.find(a => a.id === 'valve');
ok(E.runRiceAbility(t, vv), 'Blow the Valve starts');
run(2.2);
ok(t.dmg >= t.s.atk.main.dmg * 3 * 6, 'six triple bursts (' + Math.round(t.dmg) + ')');

/* the paragon: every twelve bowls, a feast */
fresh(60);
t = cooker([0, 0, 0]);
t.paragon = true; t.degree = 40; t.up = [5, 5, 5]; E.refreshTowers(); if (!t.sys) E.paraInit(t);
ok(t.paragon && t.sys && t.sys.bowls === 0, 'the Thousand-Bowl Banquet runs a banquet');
ps = pestsNear(t, 'truck', 4, 1e9);
G.roundActive = true; G.spawn = [];
run(12);
ok((t.sys.feasts || 0) >= 1, 'twelve bowls bring out a feast (' + (t.sys.feasts || 0) + ')');
const sv2 = E.serializeGame();
ok(sv2.towers.some(x => x.type === 'rice' && x.sy), 'its banquet is saved');
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
