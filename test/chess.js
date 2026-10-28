// The Chess Set: the pawn, rook slides (one line or a cross, back rank), bishop slides (bouncing diagonals,
// Colour Complex), knight leaps (stomps, forks, tours), abilities, and the Checkmate Queen's pawns.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
E.Store.init(); E.Admin.maxMastery();
function fresh(round){ E.newGame('block', 'medium', false); G.cash = 1e9; G.lives = 1e6; if (round) E.Admin.setRound(round); }
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
const at = (type, d, o) => E.spawnEnemy(type, Object.assign({ path: 0, d }, o || {}));
/* a pest that stays put where it is told, with plenty of health */
function pin(type, x, y, hp, o){ const e = at(type, 300, o); e.speed = 0; e.x = x; e.y = y; if (hp) e.hp = e.maxHp = hp; return e; }
function liveRound(){ G.roundActive = true; G.spawn = [{ type:'ant', count:0, spawned:0, start:0, spacing:1, mods:'' }]; }
const hurt = e => e.hp < e.maxHp;

/* ---- the upgrades ---- */
const T = X.TOWERS.chess;
ok(T && E.TOWER_ORDER.includes('chess') && E.BASE_TOWER_ORDER.includes('chess'), 'the Chess Set is built in');
ok(T.paths.map(p => p.name).join() === 'Rook,Bishop,Knight', 'three paths: Rook, Bishop and Knight');
ok(T.paths.every(p => p.ups.length === 5 && p.ups.every(u => u.name && u.desc && u.cost > 0)), 'five upgrades a path, each named, described and priced');
ok(T.paragon && T.paragon.name === 'The Checkmate Queen', 'its paragon is the Checkmate Queen');
let threw = null, pawnLeft = false;
for (let a = 0; a <= 5; a++) for (let b = 0; b <= 5; b++) for (let c = 0; c <= 5; c++){
  const tiers = [a, b, c].sort((x, y) => y - x);
  if (tiers[2] > 0 || tiers[1] > 2) continue;
  try { const s = E.computeStats({ type:'chess', up:[a, b, c], paragon:false, degree:0 }); if (a + b + c > 0 && s.atk.main) pawnLeft = true; } catch (e) { threw = a + '' + b + c + ': ' + e.message; }
}
ok(!threw, 'every legal build computes' + (threw ? ' (' + threw + ')' : ''));
ok(!pawnLeft, 'promoted builds have no pawn attack left');
const base = E.computeStats({ type:'chess', up:[0, 0, 0], paragon:false, degree:0 });
ok(base.atk.main && base.atk.main.kind === 'slide' && base.atk.main.dirs === 'pawn', 'it starts as a pawn');
const s210 = E.computeStats({ type:'chess', up:[2, 1, 0], paragon:false, degree:0 });
ok(s210.atk.rook && s210.atk.bishop && !s210.atk.knight, 'a crosspath sets a second piece beside the first');
ok(['castle', 'charge', 'checkmate', 'stalemate'].every(id => E.ABILITIES[id]), 'Castle Crush, Cavalry Charge, Checkmate and Stalemate are abilities');

/* ---- slides ---- */
fresh(10);
let t = put('chess', 330, 330, [1, 0, 0]);
const rook = t.s.atk.rook;
/* a row of pests and a lone one above the target: the rook takes the row */
const row = [], col = [];
for (let i = 0; i < 5; i++) row.push(pin('ant', 500 + i * 15, 400, 100));
col.push(pin('ant', 500, 360, 100));
E.slideAt(t, t, rook, row[0]);
ok(row.every(hurt) && !hurt(col[0]), 'a rook slides along the line that catches the most: the whole row, not the pest above');
fresh(10);
t = put('chess', 330, 330, [1, 0, 0]);
const far = [];
for (let i = 0; i < 12; i++) far.push(pin('ant', 400 + i * 10, 200, 100));
E.slideAt(t, t, t.s.atk.rook, far[0]);
ok(far.filter(hurt).length === t.s.atk.rook.pierce, 'it hits at most its pierce in line (' + far.filter(hurt).length + ')');
ok(hurt(far[0]), 'and always its target first');
const beyond = pin('ant', 400 + 120, 200, 100);
const out = pin('ant', 400 - 100, 200, 100);
E.slideAt(t, t, Object.assign({}, t.s.atk.rook, { pierce: 99 }), far[0]);
ok(!hurt(out), 'a short slide stops at its reach');
/* doubled rooks: the row and the column at once */
fresh(10);
t = put('chess', 330, 330, [3, 0, 0]);
const r2 = pin('ant', 600, 300, 100), c2 = pin('ant', 560, 260, 100), mid = pin('ant', 560, 300, 100), off = pin('ant', 600, 260, 100);
E.slideAt(t, t, t.s.atk.rook, mid);
ok(hurt(r2) && hurt(c2) && hurt(mid) && !hurt(off), 'Doubled Rooks slide along the row and the column at once, and nowhere else');
/* back rank: double damage near the pantry */
fresh(10);
t = put('chess', 330, 330, [4, 0, 0]);
const P0 = G.paths[0];
const nearEnd = at('ant', P0.len - 60), nearStart = at('ant', 200);
for (const e of [nearEnd, nearStart]){ e.speed = 0; e.hp = e.maxHp = 1e4; }
const a4 = t.s.atk.rook;
E.slideAt(t, t, Object.assign({}, a4, { full: true, cross: true }), nearEnd);
E.slideAt(t, t, Object.assign({}, a4, { full: true, cross: true }), nearStart);
const dEnd = 1e4 - nearEnd.hp, dStart = 1e4 - nearStart.hp;
ok(dEnd > 0 && Math.abs(dEnd - 2 * a4.dmg * Math.round(dEnd / (2 * a4.dmg))) < 1e-6 && dEnd >= 2 * dStart - 1e-6, 'Back Rank: slides hit twice as hard near the pantry (' + dEnd + ' vs ' + dStart + ')');
/* lines wall to wall */
const full = E.slideLine(200, 300, [1, 0], { full: true });
ok(full.length === 2 && Math.abs(full[0].x2 - X.W) < 1 && Math.abs(full[1].x2) < 1, 'a full slide reaches both walls');

/* ---- bishops ---- */
const bounce = E.slideLine(100, 100, E.SLIDE_SETS.bishop[1], { full: true, bounce: 2 });
const flipped = bounce.some((s, i) => i > 0 && (Math.sign(s.ux) !== Math.sign(bounce[0].ux) || Math.sign(s.uy) !== Math.sign(bounce[0].uy)));
ok(bounce.length > 2 && flipped, 'Long Diagonal: diagonals bounce off the kitchen walls (' + bounce.length + ' stretches)');
fresh(10);
t = put('chess', 330, 330, [0, 3, 0]);
const xa = pin('ant', 500, 400, 100), xb = pin('ant', 540, 440, 100), xc = pin('ant', 540, 360, 100), xd = pin('ant', 545, 400, 100);
E.slideAt(t, t, t.s.atk.bishop, xa);
ok(hurt(xa) && hurt(xb) && hurt(xc) && !hurt(xd), 'Bishop Pair: both diagonals at once, nothing straight across');
ok(t.s.camo, 'Fianchetto spots ghosts');
/* Colour Complex */
fresh(10);
t = put('chess', 330, 330, [0, 5, 0]);
ok(G.board && Math.abs(G.board.mul - 1.35) < 1e-9, 'Colour Complex puts the board down');
const dark = pin('ant', 60, 20, 1000), light = pin('ant', 20, 20, 1000);
ok(E.onDark(60, 20) && !E.onDark(20, 20), 'the squares alternate');
E.damage(dark, 10, 'normal', null, null); E.damage(light, 10, 'normal', null, null);
ok(Math.abs((1000 - dark.hp) - 13.5) < 1e-6 && Math.abs((1000 - light.hp) - 10) < 1e-6, 'pests on a dark square take 35% more from everything (' + (1000 - dark.hp) + ', ' + (1000 - light.hp) + ')');
E.sellTower(t);
ok(!G.board, 'and the board goes when the bishop is sold');

/* ---- knights ---- */
fresh(10);
t = put('chess', 330, 330, [0, 0, 1]);
const P = G.paths[0];
let dk = 0, best = Infinity;
for (let d = 0; d < P.len; d += 4){ const q = E.pathPos(P, d, 0); const k = (q.x - t.x) ** 2 + (q.y - t.y) ** 2; if (k < best){ best = k; dk = d; } }
const herd = [];
for (let i = 0; i < 6; i++){ const e = at('ant', dk + i * 6); e.speed = 0; e.hp = e.maxHp = 100; herd.push(e); }
liveRound();
E.step(E.DT);
ok(G.leaps.length === 1, 'a knight leaps');
run(0.6);
ok(herd.filter(hurt).length >= 3, 'and stomps the pests where it lands (' + herd.filter(hurt).length + ')');
fresh(10);
t = put('chess', 330, 330, [0, 0, 2]);
const big = pin('cheese', 600, 500, 1e5), small = pin('ant', 610, 500, 1e5), small2 = pin('ant', 640, 520, 1e5), wee = pin('ant', 700, 560, 1e5);
E.gridBuild();
E.forkAt(600, 500, t.s.atk.knight.fork, t);
ok(hurt(big) && (hurt(small) || hurt(small2)) && !hurt(wee), 'Fork: the 2 toughest pests near the landing take a hit');
fresh(10);
t = put('chess', 330, 330, [0, 0, 3]);
const tour = [];
for (let i = 0; i < 6; i++){ const e = at('ant', 40 + i * 85); e.speed = 0; e.hp = e.maxHp = 1e5; tour.push(e); }
E.step(E.DT);
t.s.atk = {};   // only the leap we start, so every landing is the tour's
E.startLeap(t, X.TOWERS.chess.paths[2].ups.slice(0, 3).reduce((s, u) => { u.apply(s); return s; }, { atk:{}, abilities:[] }).atk.knight, t.x, t.y, tour[0].x, tour[0].y, 0.1, 3, new Set([tour[0].id]));
liveRound();
run(2.5);
ok(tour.filter(hurt).length >= 4, 'Knight’s Tour: it leaps on from pest to pest (' + tour.filter(hurt).length + ' landings)');

/* ---- abilities ---- */
fresh(30);
t = put('chess', 330, 330, [5, 0, 0]);
E.Admin.resetCooldowns();
liveRound();
const crowd = [];
for (let i = 0; i < 8; i++){ const e = at('ant', 400 + i * 30); e.speed = 0; e.hp = e.maxHp = 1e4; crowd.push(e); }
const van = at('truck', 900); van.speed = 0; van.hp = van.maxHp = 1e6;
const d0 = crowd.map(e => e.d);
ok(E.useAbility('castle'), 'Castle Crush goes off');
run(1.6);
const ab = t.s.abilities.find(x => x.id === 'castle');
ok(crowd.every(e => 1e4 - e.hp >= ab.dmg - 1e-6) && 1e6 - van.hp >= ab.dmg + ab.bonusBig - 1e-6, 'it crushes everything on the trail (' + (1e4 - crowd[0].hp) + ', ' + (1e6 - van.hp) + ' to the truck)');
ok(crowd.every((e, i) => e.d < d0[i]), 'and shoves small pests back');
fresh(30);
t = put('chess', 330, 330, [0, 0, 4]);
E.Admin.resetCooldowns();
t.s.atk = {};   // only the charge, no leaps
liveRound();
const herd2 = [];
for (let i = 0; i < 6; i++){ const e = at('ant', 500 + i * 40); e.speed = 0; e.hp = e.maxHp = 1e4; herd2.push(e); }
ok(E.useAbility('charge'), 'Cavalry Charge goes off');
run(1.6);
ok(herd2.every(e => e.hp < 1e4), 'its knights trample every pest on the trail');

/* ---- the Checkmate Queen ---- */
fresh(60);
const qs = [put('chess', 200, 200), put('chess', 460, 440), put('chess', 700, 330)];
for (let p = 0; p < 3; p++){ for (let i = 0; i < 5; i++) E.upgradeTower(qs[p], p); for (let i = 0; i < 2; i++) E.upgradeTower(qs[p], (p + 1) % 3); }
ok(E.makeParagon(qs[0]), 'the paragon can be built');
const Q = G.towers.find(o => o.paragon && o.type === 'chess');
ok(Q && Q.s.atk.queen && Q.s.atk.queen.dirs === 'queen' && Q.s.atk.queen.cross && Q.s.atk.knights.kind === 'leap', 'she slides along every line and has knights of her own');
ok(G.board && G.board.mul >= 1.5, 'her board is down');
/* pawns march up the trail from the pantry, and one that gets all the way is promoted */
liveRound();
const decoy = at('ant', 10); decoy.speed = 0; decoy.hp = decoy.maxHp = 1e9; decoy.x = -100;   // keeps the round going without being hit
const lure = at('ant', 300); lure.speed = 0; lure.hp = lure.maxHp = 1e9;
Q.sys.pawnT = 0;
E.step(E.DT);
const pawns = G.whirls.filter(w => w.pawn);
ok(pawns.length === 1 && pawns[0].tw === Q, 'a pawn marches out');
const pw = pawns[0];
pw.left = 1; pw.pierce = 5;
E.step(E.DT);
ok(G.queens.length === 1 && G.queens[0].tw === Q && Q.sys.made === 1, 'a pawn that reaches the far end is promoted to a queen');
const qn = G.queens[0];
const near = pin('ant', qn.x + 30, qn.y, 1e6);
run(1.2);
ok(hurt(near), 'and the new queen slides at pests near her');
/* checkmate and stalemate */
const trucks = [];
for (let i = 0; i < 4; i++){ const e = at('truck', 300 + i * 60); e.speed = 0; e.hp = e.maxHp = 1e12; trucks.push(e); }
Q.ab.checkmate = 0;
ok(E.useAbility('checkmate'), 'Checkmate goes off');
run(1.2);
ok(trucks.filter(e => e.dead).length === 3, 'it takes the 3 toughest vehicles off the board (' + trucks.filter(e => e.dead).length + ')');
const roam = [];
for (let i = 0; i < 5; i++){ const e = at('ant', 200 + i * 40); roam.push(e); }
Q.ab.stalemate = 0;
ok(E.useAbility('stalemate'), 'Stalemate goes off');
ok(roam.every(e => e.stunT >= 3.9), 'every pest stops where it stands');
/* saving */
Q.sys.made = 7;
G.roundActive = false;
const snap = E.serializeGame();
E.loadGame(JSON.parse(JSON.stringify(snap)));
const Q2 = G.towers.find(o => o.paragon && o.type === 'chess');
ok(Q2 && Q2.sys && Q2.sys.made === 7 && G.board, 'the Queen and her board survive a save');
/* selling forgets the knights and queens */
G.leaps.push({ tw: Q2, done: false }); G.queens.push({ tw: Q2, life: 9 });
E.sellTower(Q2);
ok(!G.leaps.length && !G.queens.length && !G.board, 'selling her clears her knights, her queens and her board');

/* ---- a real round, every path ---- */
let crash = null;
for (const up of [[0, 0, 0], [5, 2, 0], [2, 5, 0], [0, 2, 5]]){
  fresh(55);
  const c = put('chess', 330, 330, up);
  try { E.startRound(); let n = 0; while (G.roundActive && n < 60 * 120){ E.step(E.DT); n++; for (const a of E.abilityList()) if (a.cd <= 0) E.useAbility(a.id); } } catch (e) { crash = up.join('') + ': ' + e.stack; }
  if (!crash && !(c.dmg > 0)) crash = up.join('') + ' did no damage';
}
ok(!crash, 'a whole round runs with every path' + (crash ? ' (' + crash + ')' : ''));

console.log(fails ? fails + ' FAILED' : 'all passed');
process.exitCode = fails ? 1 : 0;
