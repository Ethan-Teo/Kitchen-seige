// Spray Bottle: soak, lather and slips, bubbles, foam, wet combos, the twistable nozzle, its abilities and paragon.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
E.Store.init(); E.Admin.maxMastery();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
function run(sec, each){ for (let i = 0; i < sec * 60; i++){ E.step(1 / 60); if (each) each(); } }
function fresh(round){ E.newGame('block', 'medium', false); G.cash = 1e9; G.admin.god = true; G.round = round || 12; }
/* tough pests standing on the stretch of trail a bottle covers */
function pestsAt(t, type, n){
  const at = E.sprayTrailSpot(t, t.s.range), out = [];
  for (let i = 0; i < n; i++){ const e = E.spawnEnemy(type, {}); e.path = at.path; e.d = Math.max(0, at.d - i * 6); const q = E.pathPos(G.paths[at.path], e.d, 0); e.x = q.x; e.y = q.y; e.seg = q.seg; e.hp = e.maxHp = 1e5; out.push(e); }
  return out;
}
function bottle(up, x, y){ const t = E.placeTower('spray', x || 380, y || 200); t.up = up.slice(); E.refreshTowers(); return t; }

/* data */
const T = X.TOWERS.spray;
ok(T && T.paths.length === 3 && T.paths.every(p => p.ups.length === 5) && T.paragon && E.TOWER_ORDER.includes('spray'), 'the Spray Bottle has three paths of five and a paragon');
ok(T.hot === '?' && T.faction === 'prep', 'hotkey ? and the Prep Station');

/* base: it sprays and soaks */
fresh(8);
let t = bottle([0, 0, 0]);
E.startRound();
let wetSeen = 0;
run(25, () => { for (const e of G.enemies) if (e.wetT > 0) wetSeen++; });
ok(t.dmg > 0 && wetSeen > 0, 'the mist hits and soaks pests (' + Math.round(t.dmg) + ' damage)');
ok(t.s.atk.main.kind === 'spray' && !t.s.atk.main.streaming && !t.s.sprayStream, 'no stream until the nozzle path');

/* wet combos, straight through the damage function */
{
  const W = { dur:3, cold:1, energy:1 };
  const e = { sprayed:true, wetT:2, wetFx: W, x:0, y:0 };
  ok(E.sprayDamage(e, 10, 'cold', null, null) === 11 && E.sprayDamage(e, 10, 'energy', null, null) === 11 && E.sprayDamage(e, 10, 'normal', null, null) === 10, 'base soak: +1 from cold and energy only');
  const W2 = { dur:5, cold:1, energy:1, energyMul:1.5, heatMul:1.5, all:2 };
  const e2 = { sprayed:true, wetT:2, wetFx: W2, x:0, y:0 };
  ok(E.sprayDamage(e2, 10, 'energy', null, null) === (10 + 2 + 1) * 1.5 && E.sprayDamage(e2, 10, 'heat', null, null) === 18 && E.sprayDamage(e2, 10, 'sharp', null, null) === 12, 'Conductor and Humidifier: energy and heat multiplied, +2 on every hit');
  const e3 = { sprayed:true, wetT:0, wetFx: W2, latherT: 2, latherFx: { vuln: 0.5 } };
  ok(E.sprayDamage(e3, 10, 'normal', null, null) === 15, 'Squeaky Clean lather: +50% from everything');
}

/* Ice Water: cold hits freeze wet pests */
fresh(24);
t = bottle([0, 2, 0]);
pestsAt(t, 'roach', 6); E.gridBuild(); run(2);
{
  const wet = G.enemies.find(e => !e.dead && e.wetT > 0 && !e.big);
  ok(!!wet && wet.wetFx && wet.wetFx.freeze === 0.6, 'Ice Water soak carries a freeze');
  if (wet){ wet.freezeT = 0; E.damage(wet, 1, 'cold', null, null); ok(wet.dead || wet.freezeT > 0.5, 'a cold hit freezes a wet pest solid'); }
}
/* Conductor: heat on a wet pest makes steam that scalds those around */
fresh(24);
t = bottle([0, 3, 0]);
pestsAt(t, 'roach', 6); E.gridBuild(); run(2); E.gridBuild();
{
  const wet = G.enemies.filter(e => !e.dead && e.wetT > 0);
  const target = wet.find(e => G.enemies.some(o => o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 30));
  if (target){
    const near = G.enemies.filter(o => o !== target && !o.dead && Math.hypot(o.x - target.x, o.y - target.y) < 30);
    const hp0 = near.map(o => o.hp);
    target.steamCd = 0; target.hp = 1e6;
    E.damage(target, 1, 'heat', null, null);
    ok(near.some((o, i) => o.dead || o.hp < hp0[i]), 'heat on a wet pest bursts into steam and scalds the pests next to it');
  } else ok(false, 'found two wet pests together for the steam test');
}

/* Soap: lather, slips, bubbles, foam */
fresh(14);
t = bottle([3, 0, 0]);
E.startRound();
let slips = 0, lathered = 0, bubbles = 0;
run(20, () => { for (const e of G.enemies){ if (e.slipT > 0.33) slips++; if (e.latherT > 0) lathered++; } bubbles = Math.max(bubbles, G.bubbles.length); });
ok(lathered > 0 && slips > 0, 'lathered pests slip back down the trail (' + slips + ' slips)');
ok(bubbles > 0, 'bubbles drift along the trail (' + bubbles + ' at once)');
{
  /* a slip moves a pest back */
  const e = G.enemies.find(p => !p.dead && !p.big && !p.boss);
  if (e){ const d0 = e.d; E.slipE(e, 60, { bump: 0 }); ok(e.d < d0 - 50 || d0 < 60, 'a slip carries a pest 60 back'); }
}
fresh(16);
t = bottle([4, 0, 0]);
E.startRound();
let foams = 0;
run(10, () => { foams = Math.max(foams, G.foams.length); });
ok(foams > 0 && foams <= 6, 'Foam Cannon lays foam on the trail (' + foams + ' patches)');
ok(E.abilityList().some(a => a.id === 'bubblebath'), 'Bubble Bath is on offer');
for (const k in t.ab) t.ab[k] = 0;
const before = G.enemies.filter(e => !e.dead && e.holdT > 0).length;
ok(E.useAbility('bubblebath'), 'Bubble Bath fires');
const held = G.enemies.filter(e => !e.dead && e.hold && e.hold.k === 'bubble');
ok(held.length > before && held.every(e => !e.big && !e.boss), 'it bubbles small pests only (' + held.length + ')');

/* Humidifier and Downpour, Monsoon's lightning */
fresh(20);
t = bottle([0, 5, 0]);
E.startRound(); run(3);
for (const k in t.ab) t.ab[k] = 0;
ok(E.useAbility('downpour') && G.glob.downpour, 'Downpour starts the rain');
run(1);
const onScreen = G.enemies.filter(e => !e.dead && e.x > 0 && e.x < X.W && e.y > 0 && e.y < X.H);
ok(onScreen.length > 0 && onScreen.filter(e => e.wetT > 0).length >= onScreen.length * 0.85, 'pests on screen are wet in the rain (' + onScreen.filter(e => e.wetT > 0).length + ' of ' + onScreen.length + ', the rest just arrived)');
ok(E.sprayDamage({ sprayed:true, wetT:1, wetFx: t.s.atk.main.wet }, 10, 'cold', null, null) === (10 + 10 + 1) * 2, 'rain doubles cold, energy and heat on wet pests');
const dmg0 = t.dmg; run(2);
ok(t.dmg > dmg0, 'Monsoon lightning strikes during the downpour');

/* the nozzle */
fresh(12);
t = bottle([0, 0, 1]);
ok(t.s.sprayStream && t.s.atk.main.streaming && E.nozzleOf(t) === 'stream', 'Twist Nozzle: twisted to Stream once bought');
ok(t.s.atk.main.rangeMul === 1.7, 'the stream reaches 70% further');
E.setNozzle(t, 'mist');
ok(!t.s.atk.main.streaming && t.s.atk.main.cone > 0, 'twisted back to Mist');
E.setNozzle(t, 'stream');
const snap = E.serializeGame();
E.setNozzle(t, 'mist');
const saved = JSON.parse(JSON.stringify(snap));
saved.towers.find(x => x.type === 'spray').nz = 'mist';
E.loadGame(saved);
ok(G.towers.find(x => x.type === 'spray').nozzle === 'mist' && !G.towers.find(x => x.type === 'spray').s.atk.main.streaming, 'the nozzle setting is saved with the game');
E.loadGame(snap);
t = G.towers.find(x => x.type === 'spray');
ok(t.nozzle === 'stream' && t.s.atk.main.streaming, 'and loads back as it was');
/* the stream pushes small pests back */
fresh(9);
t = bottle([0, 0, 3]);
E.startRound(); run(6);
{
  const st = t.s.atk.main;
  ok(st.streaming && st.knock === 24 && st.strip && st.decamo && st.pierce >= 8, 'Power Jet: 8 pests (+1 at top mastery), strips armor and ghosts, pushes 24');
  const e = G.enemies.find(p => !p.dead && !p.big && Math.hypot(p.x - t.x, p.y - t.y) < E.X.TOWERS.spray.base.range * 1.7);
  if (e){ const d0 = e.d; e.armored = true; E.applyHit && E.applyHit(e, st, t); ok(e.d <= d0 - 23 || e.dead, 'a stream hit pushes a pest back'); }
}
fresh(14);
t = bottle([0, 0, 4]);
E.startRound(); run(8);
for (const k in t.ab) t.ab[k] = 0;
{
  const pests = G.enemies.filter(e => !e.dead);
  const d0 = new Map(pests.map(e => [e, e.d]));
  ok(E.useAbility('hydroblast'), 'Hydro Blast fires');
  ok(pests.some(e => e.dead || e.d < d0.get(e) - 100), 'it blasts pests back up the trail');
}

/* every crosspath plays a round without trouble */
let crashed = null;
for (const up of [[5, 2, 0], [5, 0, 2], [2, 5, 0], [0, 5, 2], [2, 0, 5], [0, 2, 5], [3, 2, 0], [0, 3, 2], [2, 0, 3]]){
  try {
    fresh(42);
    const a = bottle(up, 380, 200), b = bottle(up, 500, 420);
    E.placeTower('grill', 870, 380); E.placeTower('freezer', 250, 250);
    E.refreshTowers();
    E.startRound(); run(30);
    for (const tw of [a, b]) for (const ab of tw.s.abilities){ for (const k in tw.ab) tw.ab[k] = 0; E.useAbility(ab.id); }
    run(10);
  } catch (err){ crashed = up.join('-') + ': ' + err.stack; break; }
}
ok(!crashed, 'every crosspath plays rounds and uses its abilities' + (crashed ? ' — ' + crashed : ''));

/* the paragon: mist and jet at once */
fresh(60);
t = bottle([5, 2, 0]);
t.paragon = true; t.degree = 40; E.refreshTowers();
ok(t.s.atk.main.kind === 'spray' && !t.s.atk.main.streaming && t.s.atk.jet && t.s.atk.jet.streaming && t.s.atk.bubbles && t.s.humid, 'The Car Wash mists and jets at once, with bubbles and a humidifier');
ok(['bubblebath', 'downpour', 'hydroblast'].every(id => t.s.abilities.some(a => a.id === id)), 'and has all three abilities');
let pcrash = null;
try { E.startRound(); run(20); for (const ab of t.s.abilities){ for (const k in t.ab) t.ab[k] = 0; E.useAbility(ab.id); } run(10); } catch (err){ pcrash = err.stack; }
ok(!pcrash && t.dmg > 0, 'and plays a round (' + Math.round(t.dmg) + ' damage)' + (pcrash ? ' — ' + pcrash : ''));

/* a new game leaves no foam, bubbles or rain behind */
fresh(5);
ok(G.foams.length === 0 && G.bubbles.length === 0 && !G.glob.downpour, 'a new game starts dry');

console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
