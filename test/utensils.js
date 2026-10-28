// Chopsticks and the Lazy Susan: lifting pests back down the trail (tiers, vehicles, bosses, ghosts), throws into the
// crowd behind, flicks, Flurry and Grand Pinch; riders on a turntable (seats, speed, turning, selling, saves), sauce,
// Full Spin, Gravy Flood and the Carousel.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
E.Store.init(); E.Admin.maxMastery();
function fresh(round, map){ E.newGame(map || 'block', 'medium', false); G.cash = 1e9; G.lives = 1e6; if (round) E.Admin.setRound(round); }
function spotNear(type, x, y){
  for (let r = 0; r < 400; r += 6) for (let a = 0; a < 6.28; a += 0.3){
    const px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r);
    if (E.canPlace(type, px, py) && !E.seatFor(type, px, py)) return [px, py];
  }
  return null;
}
function put(type, x, y, up){
  const s = spotNear(type, x, y);
  const t = s && E.placeTower(type, s[0], s[1]);
  if (t && up) for (let p = 0; p < 3; p++) for (let i = 0; i < up[p]; i++) E.upgradeTower(t, p);
  return t;
}
function run(sec){ const n = Math.round(sec * 60); for (let i = 0; i < n && !G.over; i++) E.step(E.DT); }
const at = (type, d, o) => E.spawnEnemy(type, Object.assign({ path: 0, d }, o || {}));
function liveRound(){ G.roundActive = true; G.spawn = [{ type:'ant', count:0, spawned:0, start:0, spacing:1, mods:'' }]; }
/* a pest that stands still on the trail */
function still(type, d, hp, o){ const e = at(type, d, o); e.speed = 0; if (hp) e.hp = e.maxHp = hp; return e; }
/* a point on the first trail, d along it */
const trailAt = d => E.pathPos(G.paths[0], d, 0);
const legal = (u) => { const s = u.slice().sort((a, b) => b - a); return s[2] === 0 && s[1] <= 2; };

/* ================= Chopsticks ================= */
const C = X.TOWERS.chopsticks;
ok(C && E.TOWER_ORDER.includes('chopsticks') && E.BASE_TOWER_ORDER.includes('chopsticks'), 'Chopsticks are built in');
ok(C.paths.map(p => p.name).join() === 'Bamboo,Lacquer,Gold', 'three paths: Bamboo, Lacquer and Gold');
ok(C.paths.every(p => p.ups.length === 5 && p.ups.every(u => u.name && u.desc && u.cost > 0)), 'five upgrades a path, each named, described and priced');
ok(C.paragon && C.paragon.name === 'Grandmaster Chopsticks', 'its paragon is Grandmaster Chopsticks');
let threw = null;
for (let a = 0; a <= 5; a++) for (let b = 0; b <= 5; b++) for (let c = 0; c <= 5; c++){
  if (!legal([a, b, c])) continue;
  try { E.computeStats({ type:'chopsticks', up:[a, b, c], paragon:false, degree:0 }); } catch (e) { threw = '' + a + b + c + ': ' + e.message; }
}
try { for (const d of [1, 50, 100]) E.computeStats({ type:'chopsticks', up:[5, 5, 5], paragon:true, degree:d }); } catch (e) { threw = 'paragon: ' + e.message; }
ok(!threw, 'every legal build and the paragon compute' + (threw ? ' (' + threw + ')' : ''));
ok(['flurry', 'grandpinch'].every(id => E.ABILITIES[id]), 'Flurry and Grand Pinch are abilities');

/* lifting an ant back down the trail */
fresh(10);
const p0 = trailAt(700);
let t = put('chopsticks', p0.x, p0.y - 70);
ok(!!t, 'chopsticks can be placed beside the trail');
liveRound();
let ant = still('ant', 700, 50);
run(0.2);
ok(!!ant.air, 'it pinches an ant in range and lifts it into the air');
const d0 = ant.air ? ant.air.d0 : 700;
run(1.5);
ok(!ant.air && Math.abs(ant.d - (d0 - 70)) < 2, 'and drops it 70 px back down the trail (' + Math.round(d0 - ant.d) + ')');
ok(ant.hp === 49, 'the drop does 1 damage');

/* what it can lift */
fresh(10);
t = put('chopsticks', p0.x, p0.y - 70);
const a0 = t.s.atk.main;
ok(E.liftable(still('roach', 650, 50), a0), 'it lifts small pests up to roaches');
ok(!E.liftable(still('rat', 640, 50), a0), 'but not rats');
ok(!E.liftable(still('cheese', 630, 500), a0), 'or vehicles');
ok(!E.liftable(Object.assign(still('ratking', 620, 5000), {}), Object.assign({}, a0, { tier: 99, bigTier: 99 })), 'and never a boss');
fresh(10);
t = put('chopsticks', p0.x, p0.y - 70, [0, 3, 0]);
ok(E.liftable(still('rat', 640, 50), t.s.atk.main) && t.s.atk.main.n === 2 && t.s.atk.main.daze === 1, 'Serving Chopsticks lift rats, 2 at a time, and daze what they drop');
fresh(10);
t = put('chopsticks', p0.x, p0.y - 70, [0, 4, 0]);
liveRound();
let cheese = still('cheese', 700, 5000);
run(0.3);
ok(!!cheese.air, 'Ebony Tongs lift a cheese wheel');
const c0 = cheese.air ? cheese.air.d0 : 700, back4 = t.s.atk.main.back;
run(1.0);
ok(!cheese.air && Math.abs((c0 - cheese.d) - back4 * 0.5) < 3, 'vehicles go back half as far (' + Math.round(c0 - cheese.d) + ' of ' + Math.round(back4) + ')');
ok(cheese.hp < 5000, 'and the drop hits them hard');

/* ghosts */
fresh(10);
t = put('chopsticks', p0.x, p0.y - 70);
liveRound();
let ghost = still('ant', 700, 50, { camo: true });
run(0.3);
ok(!ghost.air, 'it can\'t see ghost pests at first');
fresh(10);
t = put('chopsticks', p0.x, p0.y - 70, [0, 2, 0]);
liveRound();
ghost = still('ant', 700, 50, { camo: true });
run(0.3);
ok(!!ghost.air, 'Long Reach spots and lifts them');

/* the throw: into the pests behind */
fresh(10);
t = put('chopsticks', p0.x, p0.y - 70, [0, 0, 3]);
liveRound();
const lead = still('ant', 720, 500);
const pack = [still('ant', 650, 500), still('ant', 652, 500), still('ant', 648, 500), still('ant', 655, 500)];
const ahead = still('ant', 780, 500);
G.towers[0].tg = 'first';
run(0.12);
const flying = [lead, ahead].find(e => e.air);
ok(!!flying, 'Midas Throw lifts a pest');
run(1.4);
const hitPack = pack.filter(e => e.hp < 500).length;
ok(hitPack >= 3, 'and throws it into the pests behind it: ' + hitPack + ' of 4 hit');
ok(pack.some(e => e.cashMul === 2), 'pests a throw hits are worth double cash');
ok(flying.d < 720 + 1, 'the thrown pest lands further back, never ahead');

/* flicks and Flurry */
fresh(10);
t = put('chopsticks', p0.x, p0.y - 70, [1, 0, 0]);
ok(t.s.atk.flick && t.s.atk.flick.kind === 'hitscan' && t.s.atk.flick.knock > 0, 'Quick Flick adds flicks that nudge pests back');
liveRound();
const fl = still('roach', 700, 500);
run(1.5);
ok(fl.hp < 500, 'flicks hurt');
fresh(10);
t = put('chopsticks', p0.x, p0.y - 70, [4, 0, 0]);
ok(t.s.abilities.some(a => a.id === 'flurry'), 'Thousand Flicks brings Flurry');
liveRound(); still('ant', 700, 50);
t.ab.flurry = 0;
ok(E.useAbility('flurry') && t.boost.flurry && t.boost.flurry.mult === 4, 'Flurry makes it 4× as fast');

/* the paragon */
fresh(30);
t = put('chopsticks', p0.x, p0.y - 70);
t.paragon = true; t.degree = 50; t.up = [5, 5, 5]; E.refreshTowers();
liveRound();
const truck = still('truck', 900, 1e6), mouse = still('mouse', 880, 1e5);
const boss = E.spawnEnemy('ratking', { path: 0, d: 860, boss: true });
t.ab.grandpinch = 0;
ok(E.useAbility('grandpinch'), 'Grand Pinch goes off');
ok(!!truck.air && !!mouse.air && !boss.air, 'it lifts the toughest pests, food trucks included, but not the boss');
ok(boss.holdT > 0, 'a boss is held for a moment instead');
run(3);
ok(truck.d < 5 && mouse.d < 5, 'and carries them back to the entrance');
ok(E.utensilParaUI(t) && E.utensilParaBar(t), 'its Focus shows on its bar and in its panel');

/* ================= Lazy Susan ================= */
const S = X.TOWERS.susan;
ok(S && E.TOWER_ORDER.includes('susan'), 'the Lazy Susan is built in');
ok(S.paths.map(p => p.name).join() === 'Spin,Size,Sauce', 'three paths: Spin, Size and Sauce');
ok(S.paths.every(p => p.ups.length === 5 && p.ups.every(u => u.name && u.desc && u.cost > 0)), 'five upgrades a path, each named, described and priced');
ok(S.paragon && S.paragon.name === 'The Carousel', 'its paragon is the Carousel');
threw = null;
for (let a = 0; a <= 5; a++) for (let b = 0; b <= 5; b++) for (let c = 0; c <= 5; c++){
  if (!legal([a, b, c])) continue;
  try { E.computeStats({ type:'susan', up:[a, b, c], paragon:false, degree:0 }); } catch (e) { threw = '' + a + b + c + ': ' + e.message; }
}
ok(!threw, 'every legal build computes' + (threw ? ' (' + threw + ')' : ''));
ok(['fullspin', 'gravyflood'].every(id => E.ABILITIES[id]), 'Full Spin and Gravy Flood are abilities');

fresh(10);
let sus = put('susan', 300, 230);
ok(!!sus && sus.s.seats === 1 && !sus.on, 'a Lazy Susan stands on the floor with one seat');
ok(E.canPlace('knife', sus.x + 3, sus.y + 2) && !!E.seatFor('knife', sus.x + 3, sus.y + 2), 'an appliance can go on its free seat');
const floorKnife = put('knife', 600, 80);
let rider = E.placeTower('knife', sus.x + 3, sus.y + 2);
ok(rider && rider.on === sus && rider.seat === 0 && rider.x === sus.x && rider.y === sus.y, 'a Knife Block placed on it rides in the middle');
ok(Math.abs(rider.s.atk.main.rate - floorKnife.s.atk.main.rate / 1.1) < 1e-9, 'it attacks 10% faster than one on the floor');
ok(!E.seatFor('knife', sus.x, sus.y) && !E.placeTower('knife', sus.x, sus.y), 'one seat: a second appliance doesn\'t fit');
ok(['boat', 'heli', 'saucer', 'susan', 'chef_blaze'].every(ty => !E.canRide(ty)), 'boats, aircraft, head chefs and other turntables can\'t ride');
E.upgradeTower(sus, 1);
ok(sus.s.seats === 2 && !!E.seatFor('toaster', sus.x, sus.y), 'Extra Leaf makes room for a second');
const r2 = E.placeTower('toaster', sus.x + 5, sus.y);
ok(r2 && r2.on === sus && r2.seat !== rider.seat, 'a toaster takes the other seat');
const before = [rider.x, rider.y];
run(1);
ok(Math.hypot(rider.x - before[0], rider.y - before[1]) > 1 && Math.abs(Math.hypot(rider.x - sus.x, rider.y - sus.y) - 12) < 0.01, 'with two seats the riders turn round the middle');
E.upgradeTower(sus, 0); E.upgradeTower(sus, 0);
ok(Math.abs(rider.s.atk.main.rate - floorKnife.s.atk.main.rate / 1.4 / 1.12 * 1.12) < 1e-9 || Math.abs(rider.s.atk.main.rate - floorKnife.s.atk.main.rate / 1.4) < 1e-9, 'Quick Turn: riders 40% faster');
/* riders teach the turntable */
G.xp = {};
E.damage(still('ant', 400, 100), 40, 'normal', rider, null);
ok((G.xp.susan || 0) > 0, 'damage a rider deals earns its turntable mastery');
/* saves */
const snap = E.serializeGame();
E.loadGame(snap);
const sus2 = G.towers.find(o => o.type === 'susan'), rs = G.towers.filter(o => o.on === sus2);
ok(sus2 && rs.length === 2 && rs.map(r => r.seat).sort().join() === '0,1', 'a saved game keeps both riders in their seats');
/* selling */
const cash0 = G.cash, want = E.sellValue(sus2);
const got = E.sellTower(sus2);
ok(got === want && Math.abs(G.cash - cash0 - want) < 1 && !G.towers.some(o => o.on), 'selling it sells what rides on it too, for the total shown');
ok(G.towers.every(o => o.type !== 'susan' && o.type !== 'toaster'), 'and they are gone');

/* sauce */
fresh(10);
const q0 = trailAt(500);
sus = put('susan', q0.x, q0.y - 60, [0, 0, 3]);
ok(sus.s.atk.sauce && sus.s.atk.sauce.kind === 'radial', 'Sticky Glaze flings sauce off its edge');
liveRound();
const sa = [still('ant', 500, 500), still('ant', 520, 500), still('ant', 480, 500)];
run(3);
ok(sa.some(e => e.hp < 500) && sa.some(e => e.slowT > 0 || e.hp < 500), 'the sauce hits and slows pests');
/* Full Spin */
fresh(10);
sus = put('susan', 300, 230, [4, 0, 0]);
rider = E.placeTower('knife', sus.x, sus.y);
liveRound(); still('ant', 700, 50);
sus.ab.fullspin = 0;
ok(E.useAbility('fullspin') && rider.boost.fullspin && rider.boost.fullspin.mult === 3, 'Full Spin makes its riders 3× as fast');
/* Gravy Flood */
fresh(10);
sus = put('susan', q0.x, q0.y - 60, [0, 0, 5]);
liveRound();
const gf = [still('ant', 500, 5000), still('cheese', 540, 5000)];
sus.ab.gravyflood = 0;
ok(E.useAbility('gravyflood') && gf.every(e => e.hp < 5000 && e.slowT > 0), 'Gravy Flood scalds and slows everything far around it');

/* the Carousel */
fresh(40);
sus = put('susan', 300, 230);
sus.paragon = true; sus.degree = 40; sus.up = [5, 5, 5]; E.refreshTowers();
ok(sus.s.seats === 4, 'the Carousel has four seats');
const four = ['knife', 'toaster', 'blender', 'dish'].map(ty => E.placeTower(ty, sus.x, sus.y));
ok(four.every(r => r && r.on === sus) && new Set(four.map(r => r.seat)).size === 4, 'four appliances ride it, one to a seat');
ok(!E.seatFor('grill', sus.x, sus.y), 'a fifth doesn\'t fit');
liveRound(); still('ant', 1500, 5);
run(3);
ok(four[0].spinSp > 1.05, 'it winds up as the round goes on, and so do its riders (' + four[0].spinSp.toFixed(2) + ')');
ok(E.utensilParaUI(sus) && E.utensilParaBar(sus), 'its wind-up shows on its bar and in its panel');

/* a whole round with both, every path */
fresh(20);
put('chopsticks', 330, 330, [3, 0, 2]); put('chopsticks', 900, 300, [0, 2, 4]); put('chopsticks', 600, 160, [2, 4, 0]);
sus = put('susan', 200, 450, [2, 3, 0]);
E.placeTower('knife', sus.x, sus.y); E.placeTower('toaster', sus.x + 4, sus.y);
put('susan', 880, 480, [0, 2, 5]);
let err = null;
try { E.startRound(); run(60); } catch (e) { err = e.message; }
ok(!err, 'a whole round runs with both' + (err ? ' (' + err + ')' : ''));
ok(G.enemies.every(e => !e.air || e.air.t <= e.air.dur + 0.1), 'no pest is left hanging in the air');
const lifter = G.towers.find(t => t.type === 'chopsticks' && t.lifts > 0);
ok(!!lifter, 'chopsticks count the pests they lift');
if (lifter){
  const n = lifter.lifts, at = G.towers.indexOf(lifter), snap2 = E.serializeGame();
  E.loadGame(snap2);
  ok(G.towers[at] && G.towers[at].lifts === n, 'the count survives a save (' + n + ')');
}

console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
