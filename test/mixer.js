// The Stand Mixer: forked lightning, whirlwinds, meringue, superstorms, dough hooks, chip piles,
// bake sales, its temper, and the Grand Planetary Mixer.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
E.Store.init(); E.Admin.maxMastery();
function fresh(round){ E.newGame('block', 'medium', false); G.cash = 1e9; G.lives = 1e6; G.startLives = 150; G.oakAt = 100; if (round) E.Admin.setRound(round); }
function spotNear(type, x, y){
  for (let r = 0; r < 400; r += 6) for (let a = 0; a < 6.28; a += 0.3){
    const px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r);
    if (E.canPlace(type, px, py)) return [px, py];
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
/* the spot on the trail nearest an appliance, as a distance along it */
function nearestD(t){ const P = G.paths[0]; let best = 0, bd = Infinity; for (let d = 0; d < P.len; d += 4){ const q = E.pathPos(P, d, 0); const k = (q.x - t.x) ** 2 + (q.y - t.y) ** 2; if (k < bd){ bd = k; best = d; } } return best; }
const at = (type, d, o) => E.spawnEnemy(type, Object.assign({ path: 0, d }, o || {}));
/* a pest that stays put, with plenty of health */
const still = (type, d, hp, o) => { const e = at(type, d, o); e.speed = 0; if (hp) e.hp = e.maxHp = hp; return e; };
/* pretend a round is on, with nothing more to spawn */
function liveRound(){ G.roundActive = true; G.spawn = [{ type:'ant', count:0, spawned:0, start:0, spacing:1, mods:'' }]; }
function only(t, ids){ for (const k of Object.keys(t.s.atk)) if (ids.indexOf(k) < 0) delete t.s.atk[k]; }

/* ---- the upgrades ---- */
const T = E.TOWERS.mixer;
ok(T.paths.map(p => p.name).join() === 'Whisk,Dough Hook,Temper', 'three paths: Whisk, Dough Hook and Temper');
ok(T.paths.every(p => p.ups.length === 5 && p.ups.every(u => u.name && u.desc && u.cost > 0)), 'five upgrades a path, each named, described and priced');
ok(!/beater/i.test(T.paths.map(p => p.ups.map(u => u.name + u.desc).join()).join()), 'no beaters any more');
let threw = null;
for (let a = 0; a <= 5; a++) for (let b = 0; b <= 5; b++) for (let c = 0; c <= 5; c++){
  const tiers = [a, b, c].sort((x, y) => y - x);
  if (tiers[2] > 0 || tiers[1] > 2) continue;
  try { E.computeStats({ type:'mixer', up:[a, b, c], paragon:false, degree:0 }); } catch (e) { threw = a + '' + b + c + ': ' + e.message; }
}
ok(!threw, 'every legal build computes' + (threw ? ' (' + threw + ')' : ''));
ok(E.ABILITIES.punchdown && E.ABILITIES.overmix, 'Punch Down and Overmix are abilities');

/* ---- Electric Whisk: forked lightning splits in two at every hit ---- */
fresh(10);
let m = put('mixer', 330, 330, [2, 0, 0]);
const zap = m.s.atk.zap;
only(m, []);
let d = nearestD(m);
const ants = [];
for (let i = 0; i < 50; i++) ants.push(at('ant', d - 100 + i * 4));
for (const a of ants) a.hp = a.maxHp = 100;
E.step(E.DT);   // build the grid
const hits = E.forkBolt(m.x, m.y, ants[25], zap, m);
ok(hits === 31, 'one bolt in a crowd hits 31 pests (' + hits + ')');
ok(ants.filter(a => a.hp < 100).length === 31, 'and each of them takes its damage');
fresh(10);
m = put('mixer', 330, 330, [2, 0, 0]);
d = nearestD(m);
const pair = [at('ant', d), at('ant', d + 6)];
for (const a of pair) a.hp = a.maxHp = 100;
E.step(E.DT);
ok(E.forkBolt(m.x, m.y, pair[0], m.s.atk.zap, m) === 2, 'with only two pests near, it stops at two');
const fire = at('fireant', d + 12); fire.hp = fire.maxHp = 100; E.step(E.DT);
E.forkBolt(m.x, m.y, pair[0], m.s.atk.zap, m);
ok(fire.hp === 100, 'fire ants shrug off the lightning');

/* ---- Whirlwind: blows small pests back up the trail, once each, never vehicles ---- */
fresh(10);
m = put('mixer', 330, 330, [3, 0, 0]);
only(m, ['whirl']);
d = nearestD(m);
const crowd = [], start = {}, low = {};
for (let i = 0; i < 12; i++){ const a = still('ant', d + i * 5, 1e6); crowd.push(a); start[a.id] = low[a.id] = a.d; }
const wheel = still('cheese', d + 20, 1e7); start[wheel.id] = wheel.d;
for (let i = 0; i < 84; i++){ E.step(E.DT); for (const a of crowd) low[a.id] = Math.min(low[a.id], a.d); }
const blown = crowd.filter(a => a.blown);
ok(blown.length >= 8, 'a whirlwind blows the crowd away (' + blown.length + ' of 12)');
for (let i = 0; i < 120; i++){ E.step(E.DT); for (const a of crowd) low[a.id] = Math.min(low[a.id], a.d); }
ok(blown.every(a => start[a.id] - low[a.id] >= 200), 'a long way back up the trail (' + blown.map(a => Math.round(start[a.id] - low[a.id])).join(', ') + ' px)');
ok(!wheel.blown && wheel.d >= start[wheel.id], 'the cheese wheel stays on its wheels');
const twice = crowd.filter(a => a.blown > 1);
run(4);
ok(crowd.every(a => (a.blown || 0) <= 1) && !twice.length, 'and no pest is blown away twice');

/* ---- Thunder Meringue: spots ghosts, sticks pests in place and zaps ---- */
fresh(10);
m = put('mixer', 330, 330, [4, 0, 0]);
ok(m.s.camo && m.s.atk.ball && m.s.atk.ball.kind === 'orb', 'Thunder Meringue spots ghosts and throws meringue');
only(m, ['ball']);
d = nearestD(m);
const sticky = [];
for (let i = 0; i < 10; i++) sticky.push(still('ant', d - 20 + i * 4, 1e4));
run(0.25);
ok(G.orbs.length === 1, 'a ball of meringue drifts out');
let froze = false, zapped = false;
for (let i = 0; i < 180 && !(froze && zapped); i++){ E.step(E.DT); if (sticky.some(a => a.freezeT > 0)) froze = true; if (sticky.some(a => a.hp < 1e4)) zapped = true; }
ok(froze, 'it sticks the pests it touches');
ok(zapped, 'and zaps lightning around it');

/* ---- Hurricane Mixer: superstorms hit everything but bosses, blow vehicles back, bounce off walls ---- */
fresh(60);
m = put('mixer', 330, 330, [5, 0, 0]);
only(m, ['super']);
d = nearestD(m);
const truckers = [still('cheese', d, 1e6), still('basket', d + 10, 1e6)];
const boss = still('ratking', d + 5, 1e6, { boss: true });
const v0 = truckers.map(v => v.d);
run(1.6);
ok(G.storms.some(s => s.k === 'super'), 'a superstorm forms');
ok(truckers.every(v => v.hp < 1e6), 'it hits vehicles (' + truckers.map(v => Math.round(1e6 - v.hp)).join(', ') + ')');
ok(truckers.some(v => v.blown), 'and blows them back up the trail');
ok(boss.hp === 1e6, 'but never touches a boss');
const s0 = G.storms.find(s => s.k === 'super');
s0.x = 30; s0.vx = -110; s0.vy = 0;
run(0.2);
ok(s0.vx > 0, 'it bounces off the kitchen wall');
ok(G.storms.every(s => s.life <= 12.9), 'and blows over in 13 seconds');

/* ---- Dough Hook: one small pest anywhere, kneaded away, then a pile of chips ---- */
fresh(10);
m = put('mixer', 330, 330, [0, 3, 0]);
only(m, ['hook']);
const far = still('mouse', 150, 1e5);
const van = still('cheese', 180);
const cash1 = G.cash;
run(0.1);
ok(far.hold && far.hold.k === 'vine' && m.vineE === far, 'a dough hook grabs a mouse at the far end of the trail');
ok(!(van.holdT > 0), 'but not a vehicle');
const crush = E.crushTime(far), fx = far.x, fy = far.y;
ok(crush > 0.3 && crush < 1.2, 'kneading a mouse takes ' + crush.toFixed(2) + 's');
run(crush + 0.1);
ok(far.dead, 'then it is gone');
ok(G.cash > cash1, 'and paid for');
ok(G.piles.length === 1 && Math.hypot(G.piles[0].x - fx, G.piles[0].y - fy) < 2, 'leaving a pile of chips where it was');
ok(m.vineRest > G.time, 'the hook rests a moment');
ok(E.crushTime(at('rat', 40)) > E.crushTime(at('ant', 40)), 'rats take longer to knead than ants');
/* chip piles hit what walks over them */
fresh(10);
m = put('mixer', 330, 330, [0, 3, 0]);
const pileSpec = m.s.atk.hook.pile;
only(m, []);
d = nearestD(m);
const pq = E.pathPos(G.paths[0], d, 0);
E.layPile(m, pileSpec, pq.x, pq.y);
const walker = still('roach', d, 1e4);
run(1.5);
ok(walker.hp < 1e4 && walker.hp > 1e4 - 20, 'a chip pile hits pests walking over it (' + Math.round(1e4 - walker.hp) + ')');
run(5);
ok(G.piles.length === 0, 'and is gone after 4.5 seconds');

/* ---- Bread Proofer: bake sales and Punch Down ---- */
fresh(10);
m = put('mixer', 330, 330, [0, 4, 0]);
const bread = put('bread', 400, 340, [3, 0, 0]);
ok(Math.hypot(bread.x - m.x, bread.y - m.y) <= m.s.range + bread.size, 'a Bread Machine in range');
ok(E.bakeSaleCash(m, m.s.bounty) === 120 + 60, 'the bake sale counts it: ' + E.bakeSaleCash(m, m.s.bounty));
ok(m.s.lifeRound === 1 && m.s.abilities.some(a => a.id === 'punchdown'), 'a life every round, and Punch Down');
const pests = [];
for (let i = 0; i < 15; i++) pests.push(still('ant', 200 + i * 20, 50));
E.step(E.DT);
E.Admin.resetCooldowns();
const piles0 = G.piles.length;
ok(E.useAbility('punchdown'), 'Punch Down fires');
ok(pests.filter(a => a.dead).length === 10, 'and kneads 10 pests flat (' + pests.filter(a => a.dead).length + ')');
ok(G.piles.length - piles0 === 10, 'leaving 10 piles of chips');
/* a whole round pays out */
fresh(1);
m = put('mixer', 330, 330, [0, 4, 0]);
G.lives = 150; G.admin.god = true;
const lives1 = G.lives, gen0 = m.cashGen;
E.startRound(); run(90);
ok(!G.roundActive && G.lives === lives1 + 1, 'the end of a round brings a life (' + (G.lives - lives1) + ')');
ok(m.cashGen - gen0 >= 120, 'and the bake sale cash (' + Math.round(m.cashGen - gen0) + ')');
G.admin.god = false;

/* ---- Dough Golem: dough creeps along the trail ---- */
fresh(10);
m = put('mixer', 330, 330, [0, 5, 0]);
ok(m.s.atk.main.dmg === 6 && m.s.forest, 'chips deal 6 and dough spreads');
only(m, []);
run(2);
ok(m.forestR > m.size + 20 && m.forestR < m.size + 30, 'it creeps 13 px a second (' + Math.round(m.forestR) + ')');
m.forestR = 700;
d = nearestD(m);
const vanIn = still('cheese', d, 1e5), antOut = still('ant', d, 1e5);
liveRound();
m.forestAcc = 0;
run(0.55);
ok(vanIn.hp === 1e5 - 40, 'near the mixer it hits a vehicle for 8 + 32 (' + Math.round(1e5 - vanIn.hp) + ')');
ok(antOut.hp === 1e5 - 8, 'and every pest on it for 8 (' + Math.round(1e5 - antOut.hp) + ')');
G.roundActive = false;
let snap = JSON.parse(JSON.stringify(E.serializeGame()));
E.loadGame(snap);
ok(Math.abs(G.towers.find(t => t.type === 'mixer').forestR - m.forestR) < 2, 'the dough is saved');

/* ---- Temper ---- */
fresh(10);
m = put('mixer', 330, 330, [0, 0, 2]);
G.startLives = 150; G.lives = 130;
ok(Math.abs(E.temperSpeed(m) - 1.3) < 1e-9, 'Bitter Batter: 10% faster, +1% for each of 20 lives lost');
G.lives = 50;
ok(Math.abs(E.temperSpeed(m) - 1.5) < 1e-9, 'up to 50% faster in all');
G.lives = 150;
m = put('mixer', 600, 300, [0, 0, 3]);
E.wrathFeed(m, 105);
ok(m.wrathN === 10 && Math.abs(E.temperSpeed(m) - 1.1 * 1.5) < 1e-9, 'Whipped Frenzy: 10 stacks for 105 damage, 50% faster');
E.wrathFeed(m, 1000);
ok(m.wrathN === 20, 'up to 20 stacks');
run(2.2);
ok(!m.wrathN, 'and it cools off after 2 seconds without a hit');
fresh(10);
const plain = put('mixer', 330, 330, [0, 0, 0]);
const r1 = put('mixer', 380, 330, [0, 0, 4]), r2 = put('mixer', 330, 390, [0, 0, 4]);
E.refreshTowers();
ok(plain.rushN === 2 && Math.abs(plain.s.atk.main.rate - plain.base.atk.main.rate / 1.3) < 1e-9, 'Dinner Rush: two rushing mixers speed a third up 30%');
ok(Math.abs(plain.s.atk.main.pierce - plain.base.atk.main.pierce * 1.3) < 1e-9, 'and its chips hit 30% more pests');
ok(r1.rushN === 1 && r2.rushN === 1, 'each rushing mixer feels only the other one');
fresh(60);
m = put('mixer', 330, 330, [0, 0, 5]);
d = nearestD(m);
only(m, []);
const fat = still('truck', d);
run(0.4);
const load = E.pestLoad();
ok(m.dmgAdd === Math.min(30, Math.floor(load / 1500)) && m.dmgAdd > 0, 'Kitchen Fury: +' + m.dmgAdd + ' damage with ' + Math.round(load) + ' health on the map');
fresh(10);
m = put('mixer', 330, 330, [0, 2, 0]);
G.lives = G.startLives + 50;
run(0.05);
ok(m.oakN === 50 && Math.abs(m.s.atk.main.pierce - m.base.atk.main.pierce * 1.5) < 1e-9, 'Sourdough Starter: 50 extra lives, 50% more pierce');
ok(Object.values(m.s.atk).every(a => a.demold), 'and it scrubs mold');

/* ---- The Grand Planetary Mixer ---- */
fresh(80);
m = put('mixer', 330, 330, [0, 0, 0]);
m.paragon = true; m.degree = 30; m.up = [5, 5, 5]; E.refreshTowers(); E.paraInit(m);
ok(m.s.atk.main.sprite === 'echip' && m.s.atk.main.count === 7 && m.s.atk.main.bounce === 2, 'it throws 7 electrified chips that ricochet');
ok(!m.s.atk.beat && !m.s.atk.hook, 'no beaters or hooks of its own');
d = nearestD(m);
for (let i = 0; i < 6; i++) still('rat', d + i * 12, 1e6);
liveRound();
run(3);
ok(m.sys.mom >= 10 && m.atkSpeed && m.atkSpeed.all > 1.4, 'every throw speeds the next (' + m.sys.mom + ' stacks)');
G.enemies = []; run(0.6);
ok(m.sys.mom === 0, 'and it starts over after a pause');
const range0 = m.s.range;
G.cash = 200000;
E.Admin.resetCooldowns();
ok(E.useAbility('overmix') && m.sys.over, 'Overmix switches on');
ok(Math.abs(m.s.range - range0 * 1.35) < 0.5, 'with 35% more reach');
for (let i = 0; i < 6; i++) still('rat', d + i * 12, 1e6);
liveRound();
const c0 = G.cash;
run(1.05);
ok(c0 - G.cash >= 2000 && c0 - G.cash <= 2100, 'it costs 1% of the cash a second (' + Math.round(c0 - G.cash) + ')');
const c1 = G.cash;
const victim = at('mouse', d); E.kill(victim, null);
ok(G.cash === c1 && G.noIncome, 'and no income comes in while it lasts');
const kn = put('knife', 600, 450, [0, 0, 0]), c2 = G.cash;
ok(E.sellTower(kn) > 0 && G.cash > c2, 'though a sale still pays');
G.cash = 500;
run(1.05);
ok(!m.sys.over, 'below $1,000 it switches itself off');
G.cash = 2e6; run(0.05);
ok(m.dmgMul === 1.25, 'with $2M in the bank it hits 1.25× as hard');
G.cash = 200000;
E.Admin.resetCooldowns();
E.useAbility('overmix');
G.pestHP = 0; m.sys.over = true;
for (let i = 0; i < 30; i++) still('truck', d + i, 1e5);
run(0.3);
ok(m.dmgMul > 2.5 && m.dmgMul <= 5, 'overmixing in a crowd multiplies its damage (' + m.dmgMul.toFixed(2) + '×)');
snap = JSON.parse(JSON.stringify(E.serializeGame()));
E.loadGame(snap);
const m2 = G.towers.find(t => t.type === 'mixer');
ok(m2.sys.over && Math.abs(m2.s.range - range0 * 1.35) < 0.5, 'Overmix stays on through a save');
E.Admin.resetCooldowns();
ok(E.useAbility('overmix') && !m2.sys.over, 'and switches off again');
/* bake sales: a life and cash every round, and a half one for a raccoon */
G.towers.forEach(t => { if (t !== m2) E.sellTower(t); });
G.bowls = [{ x: m2.x + 100, y: m2.y, tw: m2, life: 60, cd: 9, born: 0, seed: 0 }];
ok(E.bakeSaleCash(m2, m2.s.bakeSale) === 240 + 20, 'the bake sale pays $240 and $20 a mixing bowl');
G.lives = 100;
const gen1 = m2.cashGen, rac = still('raccoon', 150); E.kill(rac, null);
ok(G.lives === 101 && m2.cashGen - gen1 === 130, 'a cooked raccoon brings a half bake sale and a life (' + (m2.cashGen - gen1) + ')');
/* Chef Nonna cooks with it */
E.AdminFlags.unlockAll = true;
const nonna = put('chef_nonna', 600, 420);
E.AdminFlags.unlockAll = false;
ok(nonna && nonna.nonnaMix, 'Chef Nonna works with the Grand Planetary Mixer');
ok(nonna && nonna.s.atk.main.dmg === nonna.base.atk.main.dmg * 11, 'her meatballs hit 11× as hard');

console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
