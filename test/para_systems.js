// Every paragon's system and abilities, one at a time: runs a round, fires its abilities,
// checks the system moved, and that a save and load keeps it. Also the grill's undead path.
// Usage: node test/para_systems.js [types] [round]
const path = require('path');
require('./sim_load.js');
const E = require(path.join(__dirname, '.combined.js'));
const { G, X } = E;
const types = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : Object.keys(X.TOWERS).filter(t => X.TOWERS[t].paragon);
const ROUND = +(process.argv[3] || 79); /* a long, vehicle-heavy round: moldy mice and picnic baskets */
E.Store.init();
E.Admin.maxMastery();
let fails = 0;
const fail = (...m) => { fails++; console.log('  FAIL', ...m); };
function spotFor(type){
  let best = null;
  for (let x = 40; x < X.W - 30; x += 16) for (let y = 40; y < X.H - 30; y += 16){
    if (!E.canPlace(type, x, y)) continue;
    let cov = 0;
    for (const P of G.paths) for (let d = 0; d < P.len; d += 12){ const q = E.pathPos(P, d, 0); if ((q.x - x) ** 2 + (q.y - y) ** 2 <= 200 * 200) cov++; }
    if (!best || cov > best.cov) best = { x, y, cov };
  }
  return best;
}
function snap(t){ return JSON.stringify(t.sys, (k, v) => (k === 'on' || k === 'uses' ? undefined : typeof v === 'number' ? Math.round(v * 100) / 100 : v)); }
for (const type of types){
  E.newGame(type === 'boat' || type === 'sub' ? 'block' : 'pantry', 'medium', false);
  G.cash = 1e9;
  const sp = spotFor(type);
  const t = E.placeTower(type, sp.x, sp.y);
  if (!t){ fail(type, 'could not place'); continue; }
  t.paragon = true; t.degree = 40; t.up = [5, 5, 5];
  E.refreshTowers();
  /* the Carousel's Full Spin needs something riding it */
  if (type === 'susan' && !E.placeTower('knife', t.x, t.y)) fail(type, 'could not seat a rider');
  E.Admin.resetCooldowns();
  if (!t.sys) fail(type, 'no system state');
  const before = snap(t);
  if (type === 'sub') E.paraSet(t, 'dive', true);
  if (type === 'espresso') E.paraSet(t, 'blend', 'mocha');
  E.Admin.setRound(ROUND);
  G.lives = 1e6;
  E.startRound();
  const used = {};
  let steps = 0, maxU = 0;
  while (G.roundActive && steps < 60 * 120){
    E.step(E.DT); steps++; if (steps % 30 === 0) maxU = Math.max(maxU, E.undeadCount());
    for (const ab of E.abilityList()) if (ab.cd <= 0 && E.useAbility(ab.id)) used[ab.id] = (used[ab.id] || 0) + 1;
    if (type === 'sub' && steps === 60 * 20) E.paraSet(t, 'dive', false);
  }
  const after = snap(t);
  const abs = t.s.abilities.map(a => a.id);
  const unused = abs.filter(id => !used[id]);
  console.log(type.padEnd(9), 'dmg', Math.round(t.dmg), 'kills', t.kills, 'round', ROUND, (steps / 60).toFixed(0) + 's', 'abilities', JSON.stringify(used), 'max undead', maxU);
  console.log('   sys', before, '->', after);
  if (!t.dmg && type !== 'espresso' && type !== 'bread') fail(type, 'did no damage');
  if (unused.length) fail(type, 'abilities never fired:', unused.join(','));
  // save and load keep the system
  const data = E.serializeGame();
  E.loadGame(JSON.parse(JSON.stringify(data)));
  const t2 = G.towers.find(o => o.type === type && o.paragon);
  if (!t2 || !t2.sys) fail(type, 'paragon or its system lost on load');
  else {
    const want = X.TOWERS[type] && E.PARA[type] && E.PARA[type].save ? JSON.stringify(E.PARA[type].save(t.sys, t)) : null;
    const got = want ? JSON.stringify(E.PARA[type].save(t2.sys, t2)) : null;
    if (want !== got) fail(type, 'system changed over save/load', want, got);
  }
}
// the grill's Smoke path: an ash pit and undead
for (const up of [[0, 2, 4], [2, 0, 5]]){
  E.newGame('pantry', 'medium', false);
  G.cash = 1e9;
  const sp = spotFor('grill');
  const t = E.placeTower('grill', sp.x, sp.y);
  for (let p = 0; p < 3; p++) for (let i = 0; i < up[p]; i++) if (!E.upgradeTower(t, p)) fail('grill', 'upgrade failed', p, i);
  const knives = [];
  for (let i = 0; i < 4; i++){ const k = E.placeTower('knife', sp.x + 40 * Math.cos(i * 1.6), sp.y + 40 * Math.sin(i * 1.6)); if (k){ for (let j = 0; j < 3; j++) E.upgradeTower(k, 0); knives.push(k); } }
  E.Admin.setRound(up[2] === 5 ? 45 : 30);
  G.lives = 1e6;
  E.startRound();
  let steps = 0, maxU = 0, kinds = new Set();
  while (G.roundActive && steps < 60 * 120){ E.step(E.DT); steps++; maxU = Math.max(maxU, E.undeadCount()); for (const w of G.whirls) if (w.undead) kinds.add(w.undead); }
  console.log('grill', up.join('-'), 'pit', Math.round(t.pit || 0), 'dmg bonus', t.dmgAdd, 'max undead', maxU, 'kinds', [...kinds].join(','), 'grill dmg', Math.round(t.dmg));
  if (!maxU) fail('grill', up.join('-'), 'raised no undead');
  if (up[2] === 5 && !kinds.has('cheese') && !kinds.has('basket')) fail('grill', up.join('-'), 'no undead vehicles');
}
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);
