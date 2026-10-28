// The Projectile Workshop: objects, motions, share codes; and Chef Infinity, the admin unit.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
E.Store.init();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
const P = X.Profile(); P.objects = {};

/* objects */
const o = E.prefabObject('comet');
ok(o.layers.length === 3 && o.trail === 'ribbon', 'a prefab cleans into an object');
const bad = E.cleanObject({ name:'<x>', size: 999, layers: Array.from({ length: 20 }, () => ({ k:'nope', c:'red', s: 50 })) });
ok(bad.size === 30 && bad.layers.length === 6 && bad.layers[0].k === 'disc' && bad.layers[0].s === 3 && bad.name === 'x', 'bad values are clamped and unknown kinds fall back');
const id = E.saveObject(o);
ok(id === 'obj1' && E.objectList().length === 1 && E.objectById(id).name === 'Comet', 'saved to the library');
const code = E.objectCode(o), back = E.objectFromCode(code);
ok(code.startsWith('KSO1:') && back.name === 'Comet' && back.layers.length === 3, 'object share codes round-trip');
let threw = false; try { E.objectFromCode('KSA1:zzz'); } catch (e) { threw = true; }
ok(threw, 'a design code is refused as an object');
for (let i = 2; i <= E.OBJ_MAX; i++) E.saveObject(E.prefabObject('shuriken'));
ok(E.saveObject(E.prefabObject('bubble')) === null && E.objectList().length === E.OBJ_MAX, 'the library is capped at ' + E.OBJ_MAX);
for (const k of E.objectList().slice(1)) E.deleteObject(k);

/* an attack fires an object with a motion */
const d = E.defaultCustom(); d.name = 'Comet Thrower';
Object.assign(d.attacks[0], { obj: id, motion:'orbit', orbitR: 120, wall: 2, dmg: 4, pierce: 6 });
const c = E.cleanCustom(d);
ok(c.attacks[0].obj === id && c.attacks[0].motion === 'orbit' && c.attacks[0].wall === 2 && c.attacks[0].shape === '', 'an attack keeps its object, motion and wall bounces');
const spec = E.attackFor(c.attacks[0]);
ok(spec.sprite === 'obj' && spec.obj.name === 'Comet' && spec.motion === 'orbit' && spec.orbitR === 120 && spec.wall === 2 && spec.lifeMul === 3, 'the compiled attack carries the object and its motion');
ok(E.objectUses(id) === 0, 'uses are counted from saved designs');
const tid = E.saveCustomTower(c);
ok(E.objectUses(id) === 1, 'now one design uses it');
const dcode = E.designCode(c);
ok(/"objs"/.test(decodeURIComponent(escape(atob(dcode.slice(5))))), 'the design code carries its objects');
E.deleteObject(id);
const d2 = E.designFromCode(dcode);
ok(E.objectList().length === 1 && d2.attacks[0].obj === E.objectList()[0], 'importing a design brings its objects back into the library');
const gone = E.attackFor(Object.assign({}, c.attacks[0], { obj:'obj99' }));
ok(gone.sprite === 'shape' && gone.shape === 'orb', 'a missing object falls back to a plain orb');

/* every motion plays a round */
for (const m of Object.keys(E.MOTIONS)){
  const dd = E.cleanCustom(Object.assign(E.defaultCustom(), { name:'M ' + m })); dd.attacks[0].obj = E.objectList()[0]; dd.attacks[0].motion = m; dd.attacks[0].wall = 1; dd.attacks[0].dmg = 5; dd.attacks[0].pierce = 5;
  const mid = E.saveCustomTower(E.cleanCustom(dd));
  E.newGame('block', 'medium', false); G.cash = 1e6; G.vis = true;
  const t = E.placeTower(mid, 380, 200); E.refreshTowers();
  G.round = 10; E.startRound(); let n = 0; while (G.roundActive && n < 60 * 120){ E.step(1 / 60); n++; }
  ok(t.dmg > 0 && !G.roundActive, 'motion ' + m + ' hits pests and the round ends (' + Math.round(t.dmg) + ' damage)');
  E.deleteCustomTower(mid);
}
E.deleteCustomTower(tid);
/* motionTick on its own: orbit stays on its circle and clears hits each lap */
const p = { x: 100, y: 0, vx: 0, vy: 0, ang: 0, spd: 300, life: 9, hit: new Set([1]), tw: { x: 0, y: 0 } };
const sp = { motion:'orbit', orbitR: 100 };
for (let i = 0; i < 60 * 3; i++) E.motionTick(p, sp, 1 / 60);
ok(Math.abs(Math.hypot(p.x, p.y) - 100) < 1 && p.lap >= 1 && !p.hit.has(1), 'an orbiting shot stays on its circle and can hit again after a lap');

/* Chef Infinity */
E.AdminFlags.unit = false;
E.newGame('block', 'medium', false); G.cash = 1000;
ok(!E.placeTower(E.ADMIN_UNIT, 380, 200) && !G.adminUsed, 'the admin unit cannot be placed while it is switched off');
E.AdminFlags.unit = true;
const t = E.placeTower(E.ADMIN_UNIT, 380, 200); E.refreshTowers();
ok(t && t.level === 20 && G.adminUsed && t.s.abilities.length === 4 && t.s.barrier, 'switched on: he places at level 20 with his four moves and his barrier');
ok(!!E.placeTower('chef_blaze', 500, 420), 'a head chef can still join him');
G.round = 80; E.startRound(); let n = 0; while (G.roundActive && n < 60 * 120){ E.step(1 / 60); n++; }
ok(!G.roundActive && G.lives === 150 && t.dmg > 1e4, 'round 80 is over in ' + (n / 60).toFixed(0) + 's without a leak');
G.round = 95; G.roundActive = true; G.spawn = [];
for (let i = 0; i < 20; i++) E.spawnEnemy(i % 4 ? 'rat' : 'basket', { d: 400 + i * 60 });
const q = E.spawnEnemy('skunk', { boss: true, d: 1800 });
for (const k in t.ab) t.ab[k] = 0;
const near = e => Math.hypot(e.x - t.x, e.y - t.y);
const far0 = G.enemies.filter(e => !e.dead && !e.boss).map(near);
ok(E.useAbility('void_pull'), 'Vacuum Pull fires');
const far1 = G.enemies.filter(e => !e.dead && !e.boss).map(near);
ok(far1.reduce((a, v) => a + v, 0) < far0.reduce((a, v) => a + v, 0) * 0.7 && G.enemies.some(e => e.holdT > 0), 'pests are dragged towards him and held');
const qh = q.hp; const dBefore = G.enemies.filter(e => !e.dead && !e.boss).map(e => e.d);
ok(E.useAbility('void_burst') && q.hp < qh && G.enemies.filter(e => !e.dead && !e.boss).every((e, i) => e.d <= dBefore[i]), 'Pressure Burst blows every pest back and hurts the boss');
const qh2 = q.hp;
ok(E.useAbility('void_course') && q.hp <= qh2 * 0.67, 'Void Course takes a third off the boss');
ok(E.useAbility('void_domain') && G.glob.domain, 'Unlimited Kitchen opens');
const fresh = Array.from({ length: 6 }, (_, i) => E.spawnEnemy('truck', { d: 300 + i * 80 })); const fh = fresh.map(e => e.hp); for (let i = 0; i < 30; i++) E.step(1 / 60);
const other = G.towers.find(o => o !== t);
ok(fresh.every((e, i) => e.dead || (e.freezeT > 0 && e.hp < fh[i])) && other && other.boost.domain, 'inside it every pest is frozen and burning, and the other appliances are boosted');
for (let i = 0; i < 60 * 9; i++) E.step(1 / 60);
ok(!G.glob.domain, 'and it closes after eight seconds');
/* no medals for a game he joined */
P.medals.block = {}; G.round = 80; G.win = 80; G.lives = 100; G.roundActive = false; G.spawn = null; G.enemies = [];
E.startRound(); n = 0; while (G.roundActive && n < 60 * 200){ E.step(1 / 60); n++; }
ok(G.won && !P.medals.block.medium, 'the win earns no medal');
const snap = E.serializeGame(); E.newGame('block', 'easy', false); E.loadGame(snap);
ok(G.adminUsed && G.towers.some(o => o.type === E.ADMIN_UNIT), 'a saved game keeps him and the no-medal mark');
E.AdminFlags.unit = false;
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
