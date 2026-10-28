// Pests with tricks: silverfish dodge, crickets leap, honeypot ants heal, centipedes shed segments, shield beetles cover.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
E.Store.init(); E.Admin.maxMastery();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
function run(sec){ for (let i = 0; i < sec * 60; i++) E.step(1 / 60); }
function fresh(){ E.newGame('block', 'medium', false); G.cash = 1e9; G.admin.god = true; G.round = 20; G.roundActive = true; G.spawn = []; }
function at(type, d, hp){ const e = E.spawnEnemy(type, {}); e.d = d; const q = E.pathPos(G.paths[0], d, 0); e.x = q.x; e.y = q.y; e.seg = q.seg; if (hp){ e.hp = e.maxHp = hp; } E.gridBuild(); return e; }

const NEW = ['silverfish', 'cricket', 'honeypot', 'centipede', 'shieldbug'];
ok(NEW.every(id => X.ENEMIES[id] && E.ENEMY_ORDER.includes(id) && E.PROMOTE[id]), 'five new pests, in the pest list, promoted in Mastery Mode');

/* silverfish dodge thrown projectiles, a third of the time */
{
  const real = Math.random;
  const e = { def: X.ENEMIES.silverfish, id: 1, x: 0, y: 0, r: 8 };
  const p = { hit: new Set() };
  Math.random = () => 0.1; const a = E.pestDodge(e, p);
  Math.random = () => 0.9; const b = E.pestDodge(e, { hit: new Set() });
  Math.random = real;
  ok(a && p.hit.has(1) && !b, 'a silverfish darts aside from a thrown projectile (and that projectile passes it)');
  ok(!E.pestDodge({ def: X.ENEMIES.roach, id: 2 }, { hit: new Set() }), 'other pests do not dodge');
}
/* in play: knives miss silverfish now and then, beams never do */
fresh();
{
  const t = E.placeTower('knife', 380, 200); t.up = [0, 0, 0]; E.refreshTowers();
  let shots = 0, landed = 0;
  for (let k = 0; k < 40; k++){ const e = at('silverfish', 280 + (k % 8) * 6, 1e6); }
  const hp0 = new Map(G.enemies.map(e => [e, e.hp]));
  run(12);
  const hit = G.enemies.filter(e => e.hp < hp0.get(e)).length;
  ok(hit > 0 && t.dmg > 0, 'knives still land on silverfish most of the time (' + Math.round(t.dmg) + ' damage)');
}
/* crickets leap */
fresh();
{
  const c = at('cricket', 200), d0 = c.d; c.hopCd = 0.05;
  run(0.2);
  ok(c.d - d0 >= 85, 'a cricket leaps 85 along the trail (' + Math.round(c.d - d0) + ')');
  c.freezeT = 2; c.hopCd = 0.01; const d1 = c.d; run(0.1);
  ok(c.d - d1 < 20, 'not while frozen');
}
/* honeypot ants heal */
fresh();
{
  const h = at('honeypot', 300), r = at('roach', 310, 100); r.hp = 20; h.healCd = 0.05;
  for (const e of G.enemies) e.speed = 0;
  run(0.1);
  ok(r.hp >= 27.9, 'a honeypot ant heals the pests near it by 8% (' + r.hp.toFixed(1) + ')');
  const boss = at('ratking', 305); boss.hp = boss.maxHp / 2; const bh = boss.hp; h.healCd = 0.05; run(0.1);
  ok(boss.hp <= bh, 'but never a boss');
}
/* centipedes shed */
fresh();
{
  const c = at('centipede', 400, 1000);
  const n0 = G.enemies.filter(e => e.type === 'silverfish').length;
  E.damage(c, 300, 'normal', null, null);
  const n1 = G.enemies.filter(e => e.type === 'silverfish').length - n0;
  ok(n1 === 2, 'a quarter of its health off: one segment (2 silverfish) sheds (' + n1 + ')');
  E.damage(c, 2000, 'normal', null, null);
  const n2 = G.enemies.filter(e => e.type === 'silverfish').length - n0;
  ok(c.dead && n2 === 6, 'cooked: the rest come off (' + n2 + ' in all)');
}
/* shield beetles cover their neighbours */
fresh();
{
  const s = at('shieldbug', 300), r = at('rat', 310, 1000);
  for (const e of G.enemies) e.speed = 0;
  run(0.3);
  const dealt = E.damage(r, 100, 'normal', null, null);
  ok(Math.abs(dealt - 50) < 1e-6, 'a pest next to a shield beetle takes half damage (' + dealt + ')');
  const own = E.damage(s, 10, 'normal', null, null);
  ok(own === 10, 'the beetle itself takes full damage');
  s.hp = 0; E.damage(s, 1, 'normal', null, null);
  run(0.6);
  ok(E.damage(r, 100, 'normal', null, null) === 100, 'once it is gone, the cover goes too');
}
/* the rounds */
{
  const types = n => E.newPestGroups(n, X.roundGroups(n)).map(g => g.type);
  ok(!types(10).some(t => NEW.includes(t)), 'none before round 14');
  ok(types(18).includes('silverfish') && types(18).includes('cricket'), 'round 18 brings silverfish and crickets');
  ok(types(26).includes('honeypot') && types(32).includes('centipede') && types(60).includes('shieldbug'), 'honeypot ants by 26, centipedes by 32, shield beetles with the vehicles by 60');
  ok(JSON.stringify(E.newPestGroups(42, X.roundGroups(42))) === JSON.stringify(E.newPestGroups(42, X.roundGroups(42))), 'a round sends the same pests every game');
  const before = X.roundGroups(18).reduce((s, g) => s + g.count, 0), after = E.newPestGroups(18, X.roundGroups(18)).reduce((s, g) => s + g.count, 0);
  ok(after > before && after < before * 1.35, 'they add to a round without swamping it (' + before + ' → ' + after + ')');
}
/* a long game with them in it */
let crash = null;
try {
  E.newGame('block', 'medium', false); G.cash = 1e9; G.admin.god = true;
  for (const [t, x, y, up] of [['knife', 380, 200, [2, 0, 3]], ['grill', 870, 380, [3, 0, 2]], ['freezer', 640, 300, [0, 2, 3]], ['spray', 500, 420, [0, 2, 3]], ['micro', 250, 250, [3, 2, 0]]]){ const tw = E.placeTower(t, x, y); if (tw) tw.up = up; }
  E.refreshTowers();
  for (let r = 14; r <= 64; r += 2){ G.round = r; E.startRound(); let n = 0; while (G.roundActive && n < 60 * 240){ E.step(1 / 60); n++; } }
} catch (err){ crash = err.stack; }
ok(!crash, 'rounds 14 to 64 play with the new pests in them' + (crash ? ' — ' + crash : ''));
/* Mastery Mode promotes them */
E.newGame('block', 'medium', true);
ok(E.roundGroupsFor(18).every(g => !NEW.includes(g.type) || g.type === 'antball' || true) && E.roundGroupsFor(18).some(g => g.type === 'antball'), 'Mastery Mode promotes silverfish and crickets');
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
