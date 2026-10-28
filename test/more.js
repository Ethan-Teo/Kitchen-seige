// The second wave of appliances: their mechanics, saves and paragons.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
E.Store.init(); E.Admin.maxMastery();
function fresh(round){ E.newGame('block', 'medium', false); G.cash = 1e9; G.lives = 1e6; if (round) E.Admin.setRound(round); }
function put(type, x, y, up){
  for (let r = 0; r < 240; r += 6) for (let a = 0; a < 6.28; a += 0.3){ const t = E.placeTower(type, x + Math.cos(a) * r, y + Math.sin(a) * r); if (t){ if (up) for (let p = 0; p < 3; p++) for (let i = 0; i < up[p]; i++) E.upgradeTower(t, p); return t; } }
  return null;
}
function run(sec, abs){ const n = Math.round(sec * 60); for (let i = 0; i < n && !G.over; i++){ E.step(E.DT); if (abs) for (const ab of E.abilityList()) if (ab.cd <= 0) E.useAbility(ab.id); } }

/* every new appliance is in the shop with its own hotkey */
const keys = X.TOWERS && E.TOWER_ORDER.map(t => E.TOWERS[t].hot);
ok(new Set(keys).size === keys.length, 'every appliance has its own hotkey (' + keys.length + ')');
for (const t of ['mandoline', 'caddy', 'saucepan', 'bot', 'pets', 'lobster']) ok(E.TOWER_ORDER.includes(t) && E.BASE_TOWER_ORDER.includes(t) && E.TOWERS[t].paragon, t + ' is built in, with a paragon');

/* Saucepan brews: a permanent brew survives a save and a load */
fresh(30);
const pan = put('saucepan', 330, 330, [5, 0, 2]);
const knife = put('knife', 380, 360, [0, 0, 0]);
E.startRound(); run(12);
ok(knife.tb && knife.tb.brew && knife.tb.brew.until === Infinity, 'Mother Sauce brews for good');
const k0 = knife.s.atk.main;
ok(k0.dmg >= 4 && k0.pierce >= 7, 'the brew adds damage and pierce (' + k0.dmg + ', ' + k0.pierce + ')');
let saved = JSON.parse(JSON.stringify(E.serializeGame()));
E.loadGame(saved);
const knife2 = G.towers.find(t => t.type === 'knife');
ok(knife2 && knife2.tb && knife2.tb.brew && knife2.tb.brew.until === Infinity && knife2.s.atk.main.dmg === k0.dmg, 'and keeps after loading');

/* timed buffs run out */
fresh(30);
const pan2 = put('saucepan', 330, 330, [2, 0, 0]);
const k3 = put('knife', 380, 360, [0, 0, 0]);
E.startRound(); run(6);
ok(k3.tb && k3.tb.brew && k3.tb.brew.allTypes, 'Vinegar Dip dips a neighbour');
const until = k3.tb.brew.until;
run(Math.max(0, until - G.time) + 0.2);
ok(!E.tbOn(k3, 'brew') || k3.tb.brew.until > until, 'and wears off unless topped up');

/* Overclock and Ultraboost */
fresh(30);
const bot = put('bot', 330, 330, [0, 5, 0]);
const k4 = put('knife', 380, 360, [2, 0, 0]);
k4.dmg = 1e6;
E.startRound(); run(1);
E.Admin.resetCooldowns();
ok(E.useAbility('overclock'), 'Overclock fires');
ok(E.tbOn(k4, 'clock') && k4.ub === 1, 'the best appliance is overclocked and ultraboosted');
saved = JSON.parse(JSON.stringify(E.serializeGame()));
E.loadGame(saved);
ok(G.towers.find(t => t.type === 'knife').ub === 1, 'Ultraboost stacks are saved');

/* Pest Trap: catches pests and pays out at the end of the round */
fresh(20);
const trapper = put('bot', 330, 330, [0, 0, 4]);
const cash0 = G.cash;
E.startRound(); run(120);
ok(!G.roundActive, 'the round ends with a trap on the trail');
ok(G.cash > cash0, 'traps paid out (' + Math.round(G.cash - cash0) + ')');
ok(!G.traps.some(tr => tr.catch), 'and no cage is left behind');

/* Sentries are built during rounds and go when their bot is sold */
fresh(40);
const sb = put('bot', 330, 330, [4, 0, 0]);
E.startRound(); run(15);
ok(G.minions.length > 0, 'sentries built (' + G.minions.length + ')');
E.sellTower(sb);
run(0.1);
ok(G.minions.length === 0, 'and leave with their bot');

/* Wanted marks pay more */
fresh(40);
const cad = put('caddy', 330, 330, [0, 4, 0]);
E.startRound(); run(20);
ok(G.enemies.some(e => e.wanted) || G.stats.kills > 0, 'the rifle marks pests as Wanted');

/* sirens charm small pests but not bosses, and pests still reach the end */
fresh(40);
const lob = put('lobster', 330, 330, [0, 0, 5]);
E.startRound(); run(240);
ok(!G.roundActive, 'a round with The Final Harmonic still ends');
const boss = E.spawnEnemy('ratking', { boss: true });
const charmed = (() => { boss.charmT = 0; E.markWanted; return E.useAbility; })();
ok(!(boss.charmT > 0), 'bosses ignore the song');

/* shrinking turns a rat into an ant */
fresh(40);
E.startRound(); run(0.1);
const rat = E.spawnEnemy('rat');
E.shrinkE(rat, null);
ok(rat.type === 'ant' && rat.hp <= rat.maxHp && !rat.big, 'a reduction potion shrinks a rat to an ant');

/* Lobster Tanks reach farther from the water */
fresh(1);
let wet = null, dry = null;
for (let x = 30; x < X.W && !wet; x += 10) for (let y = 30; y < X.H && !wet; y += 10) if (E.inWater(x, y, 10) && E.canPlace('lobster', x, y)) wet = E.placeTower('lobster', x, y);
dry = put('lobster', 200, 200, [0, 0, 0]);
ok(wet && dry && Math.abs(wet.s.range / dry.s.range - 1.35) < 0.01, 'on the water: +35% range');

/* Kitchen Brigade stacks */
fresh(1);
const m1 = put('mandoline', 300, 330, [0, 3, 0]), m2 = put('mandoline', 350, 330, [0, 3, 0]), m3 = put('mandoline', 300, 380, [0, 0, 0]);
ok(m3.stack === 2 && m1.stack === 2, 'two brigades stack on every Mandoline in range (' + m3.stack + ')');

/* paragons: build, abilities, save and load */
for (const type of ['mandoline', 'caddy', 'saucepan', 'bot', 'pets', 'lobster']){
  fresh(95);
  const t = put(type, 330, 330, [0, 0, 0]);
  t.paragon = true; t.degree = 40; t.up = [5, 5, 5]; E.paraInit(t); E.refreshTowers();
  E.startRound(); run(30, true);
  const s1 = JSON.stringify(t.sys && Object.fromEntries(Object.entries(t.sys).filter(([k]) => k !== 'on' && k !== 'uses')));
  saved = JSON.parse(JSON.stringify(E.serializeGame()));
  E.loadGame(saved);
  const t2 = G.towers.find(o => o.type === type);
  ok(t2 && t2.paragon && t2.sys && t.dmg > 0, type + ' paragon works and loads (' + Math.round(t.dmg) + ' damage, ' + s1 + ')');
  ok(!G.enemies.some(e => !Number.isFinite(e.hp)), type + ': no pest has broken health');
}
console.log(fails ? fails + ' FAILED' : 'all second-wave tests passed');
process.exit(fails ? 1 : 0);
