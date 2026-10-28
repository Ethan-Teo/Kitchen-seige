// The second brood of bosses: skulls, and each one's move.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
E.Store.init(); E.Admin.maxMastery();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
function run(sec){ for (let i = 0; i < sec * 60; i++) E.step(1 / 60); }
function fresh(round){ E.newGame('block', 'medium', false); G.cash = 1e7; E.Admin.setRound(round || 101); G.lives = 1e6; G.roundActive = true; G.spawn = []; }
function boss(type, d){ const e = E.spawnEnemy(type, { boss: true, d: d || 900 }); return e; }
const NEW = ['compost', 'moth', 'dustdevil', 'beetle', 'pepper', 'phantom'];
ok(NEW.every(b => X.ENEMIES[b].boss && E.BOSS_CYCLE.includes(b)) && E.BOSS_CYCLE.length === 13, 'six new bosses join the boss cycle (13 in all)');
ok(!Array.from({ length: 200 }, (_, i) => i + 101).some(n => X.roundGroups(n).some(g => X.ENEMIES[g.type].boss)), 'no bosses in freeplay');
const wk = new Set(); for (let w = 1; w <= 52; w++) wk.add(E.weeklyEvents('2027-W' + String(w).padStart(2, '0')).boss.boss);
ok(NEW.some(b => wk.has(b)), 'Boss Night can bring them');
fresh(101); let e = boss('compost'); ok(E.bossSkulls(e).length === 2, 'level 1: two skulls');
fresh(125); e = boss('compost'); ok(e.lvl === 3 && E.bossSkulls(e).length === 3, 'level 3: three skulls');
fresh(160); e = boss('compost'); ok(E.bossSkulls(e).length === 4, 'level 6+: four skulls');

/* the Compost Heap flings pests ahead and dumps a heap at a skull */
fresh(); e = boss('compost', 600); run(3);
ok(G.enemies.some(o => !o.dead && !o.boss && o.d > e.d + 50), 'the Compost Heap flings pests up the trail ahead');
let before = G.enemies.length; e.hp = e.maxHp * 0.6; run(0.1);
ok(e.skull === 1 && G.enemies.length >= before + 10 && e.shieldT > 0, 'a skull dumps a heap (' + (G.enemies.length - before) + ' pests)');

/* the Grave Moth: drains boosts, and is soulbound while its wisps are about */
fresh(); e = boss('moth', 900);
const tw = E.placeTower('knife', e.x + 40, e.y + 40) || E.placeTower('knife', 500, 420);
tw.tb = { test: { until: G.time + 30 } }; e.hp = e.maxHp * 0.7; e.drainCd = 0; run(0.1);
ok(!(tw.tb.test.until > G.time) && e.hp > e.maxHp * 0.7 || Math.hypot(tw.x - e.x, tw.y - e.y) > 300, 'drains a timed boost off a nearby appliance and heals');
e.hp = e.maxHp * 0.6; run(0.1);
const wisps = G.enemies.filter(o => o.type === 'wisp' && !o.dead);
ok(e.soul && wisps.length >= 4, 'at a skull it splits off wisps (' + wisps.length + ')');
const h0 = e.hp; E.damage(e, 1000, 'normal', null);
ok(e.hp >= h0, 'nothing hurts it while they are about');
for (const w of wisps) E.damage(w, 1e6, 'normal', null, { ignoreImmune: true });
run(0.1); const h1 = e.hp; E.damage(e, 1000, 'normal', null);
ok(!e.soul && e.hp < h1, 'cook the wisps and it is exposed');

/* the Dust Devil: hard to slow, and knocks out appliances at a skull */
fresh(); e = boss('dustdevil', 900);
const near = E.placeTower('knife', e.x + 60, e.y) || E.placeTower('knife', e.x, e.y + 60) || E.placeTower('knife', e.x - 60, e.y);
e.hp = e.maxHp * 0.6; run(0.05);
ok(e.skull === 1 && (!near || (near.stunT > 0 && near.stunBy === 'gust')), 'a skull knocks out nearby appliances with a gust');

/* the Iron Beetle: plates soak hits, it shrugs off one attack at a time, and replates at a skull */
fresh(); e = boss('beetle', 900); run(0.05);
const hp0 = e.hp, pl0 = e.plate;
E.damage(e, 500, 'normal', null);
ok(pl0 > 0 && e.hp === hp0 && e.plate === pl0 - 500, 'its plates take the hit first');
const imm0 = e.immune[0]; run(7);
ok(e.immune[0] !== imm0, 'it shrugs off a different kind of attack in turn (' + imm0 + ' then ' + e.immune[0] + ')');
const before2 = e.hp; E.damage(e, 100, e.immune[0], null); 
ok(e.hp === before2 && e.plate === pl0 - 500, 'immune to the current kind');
E.damage(e, e.plate + 10, 'normal', null);
ok(e.plate === 0, 'the plates crack');
E.damage(e, e.hp - e.maxHp * 0.6, 'normal', null, { ignoreImmune: true }); run(0.05);
ok(e.skull === 1 && e.plate > 0, 'a skull grows new plates');

/* the Ghost Pepper: overheats appliances near it, and heat cannot hurt it */
fresh(); e = boss('pepper', 900);
let hot = null; for (const [dx, dy] of [[70, 0], [0, 70], [-70, 0], [0, -70], [60, 60], [-60, -60], [90, 30]]){ hot = E.placeTower('knife', e.x + dx, e.y + dy); if (hot) break; }
e.speed = 0; run(8);
ok(hot && (hot.stunT > 0 && hot.stunBy === 'heat' || hot.heat > 0.3), 'an appliance near it heats up and overheats');
const hp2 = e.hp; E.damage(e, 1000, 'heat', null);
ok(e.hp === hp2, 'heat cannot hurt it');

/* the Phantom: a ghost that fades out of reach */
fresh(); e = boss('phantom', 900);
ok(e.camo, 'it is a ghost');
e.fadeCd = 0; run(0.1);
const hp3 = e.hp; E.damage(e, 1000, 'normal', null);
ok(e.fadeT > 0 && e.hp === hp3, 'faded, nothing can hurt it');
run(4); const hp4 = e.hp; E.damage(e, 1000, 'normal', null);
ok(e.hp < hp4, 'then it comes back');

/* the new bosses go down to a strong kitchen, and the gallery counts them */
const P = X.Profile(); P.stats.bossKinds = {};
for (const b of NEW){
  fresh(101);
  for (const [t, x, y, u] of [['micro', 380, 200, [5, 2, 0]], ['micro', 500, 420, [2, 0, 4]], ['grill', 870, 380, [0, 5, 2]], ['knife', 250, 250, [5, 0, 2]], ['blender', 700, 330, [4, 2, 0]], ['siphon', 600, 200, [2, 4, 0]]]){ const k = E.placeTower(t, x, y); if (k) k.up = u; }
  E.refreshTowers();
  e = E.spawnEnemy(b, { boss: true }); let s = 0;
  while (!e.dead && s < 60 * 240){ E.step(1 / 60); s++; }
  ok(e.dead, b + ' can be beaten (' + (s / 60).toFixed(0) + 's)');
}
ok(NEW.every(b => P.stats.bossKinds[b] === 1), 'each kind is counted for the Rogues’ Gallery');
/* Boss Battles: any boss, any kitchen, Normal or Elite */
const P2 = X.Profile(); P2.battles = {}; P2.events = {};
const kit = () => { G.cash = 1e7; for (const [t, x, y, u] of [['micro', 380, 200, [5, 2, 0]], ['micro', 500, 420, [2, 0, 4]], ['grill', 870, 380, [0, 5, 2]], ['knife', 250, 250, [5, 0, 2]], ['blender', 700, 330, [4, 2, 0]]]){ const k = E.placeTower(t, x, y); if (k) k.up = u; } E.refreshTowers(); };
const playR = () => { E.startRound(); let s2 = 0; while (G.roundActive && s2 < 60 * 300){ E.step(1 / 60); s2++; } };
E.newGame('pantry', 'medium', false, null, 'standard', E.battleEvent('phantom', 'pantry', false));
ok(G.mapId === 'pantry', 'the kitchen picked is the one played');
E.newGame('block', 'medium', false, null, 'standard', E.battleEvent('phantom', 'block', false));
ok(G.ev && G.ev.kind === 'battle' && G.round === E.BB_START[0] && G.cash >= E.BB_START[1] && G.win === 100, 'a Boss Battle starts at round 16 with its cash, with the boss picked');
ok(E.roundGroupsFor(20).some(g => g.type === 'phantom' && g.evTier === 1) && !Object.keys(P2.events).length, 'the picked boss comes at round 20, and Boss Night is untouched');
kit(); G.round = 20; const d0 = P2.dough; playR();
ok(G.ev.done === 1 && E.bbRecord(G.ev).tiers === 1 && P2.dough >= d0 + 60, 'tier 1 cleared, kept and paid');
let snap = E.serializeGame(); E.newGame('block', 'easy', false); E.loadGame(snap);
ok(G.ev && G.ev.kind === 'battle' && G.ev.boss === 'phantom' && G.ev.done === 1, 'a saved Boss Battle loads');
/* Elite: tougher and higher level */
E.newGame('block', 'hard', false, null, 'standard', E.battleEvent('ratking', 'block', true));
const eHp = E.evTierHp(1), eL = E.evTierLevel(1);
E.newGame('block', 'medium', false, null, 'standard', E.battleEvent('ratking', 'block', false));
ok(eHp / E.evTierHp(1) > 1.5 && eL === E.evTierLevel(1) + 2 && G.diff === 'medium', 'Elite bosses have more health and two more levels');
/* the Boss Rush: all of them in turn */
E.newGame('block', 'medium', false, null, 'standard', E.rushEvent('block', false));
ok(G.ev.kind === 'rush' && G.win === 80 && E.BB_RUSH_TIERS.length === E.BOSS_CYCLE.length, 'the Boss Rush has every boss, ending at round 80');
const order = E.BB_RUSH_TIERS.map(n => E.roundGroupsFor(n).find(g => g.evTier).type);
ok(order.join() === E.BOSS_CYCLE.join(), 'one boss every five rounds, each in turn');
ok(E.evTierHp(13) > E.evTierHp(1) * 5, 'and each tougher than the last');
kit(); G.round = 20; playR();
ok(G.ev.done === 1 && E.bbRecord(G.ev).tiers === 1, 'the first boss of the rush is kept');
snap = E.serializeGame(); E.newGame('block', 'easy', false); E.loadGame(snap);
ok(G.ev && G.ev.kind === 'rush' && G.ev.order.length === 13 && G.ev.tiers[12] === 80 && G.win === 80, 'a saved Boss Rush loads with its order');
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
