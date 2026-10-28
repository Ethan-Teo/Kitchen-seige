// Build every paragon, then run a heavy freeplay round. Checks for crashes and measures step cost.
const path = require('path');
require('./sim_load.js');
const E = require(path.join(__dirname, '.combined.js'));
const { G, X } = E;
E.Store.init();
E.Admin.maxMastery();
E.newGame(process.argv[2] || 'pantry', 'medium', false);
G.cash = 1e10;
const spots = [];
for (let x = 40; x < X.W - 30; x += 22) for (let y = 40; y < X.H - 30; y += 22) spots.push([x, y]);
spots.sort((a, b) => Math.min(...G.paths.map(P => X.distToPath(P, a[0], a[1]))) - Math.min(...G.paths.map(P => X.distToPath(P, b[0], b[1]))));
let si = 0;
function put(type){ while (si < spots.length){ const [x, y] = spots[si++]; const t = E.placeTower(type, x, y); if (t) return t; } throw new Error('no room'); }
const order = process.argv[4] ? process.argv[4].split(',') : Object.keys(X.TOWERS).filter(t => X.TOWERS[t].paragon);
for (const type of order){
  const ts = [put(type), put(type), put(type)];
  for (let p = 0; p < 3; p++){ for (let i = 0; i < 5; i++) E.upgradeTower(ts[p], p); for (let i = 0; i < 2; i++) E.upgradeTower(ts[p], (p + 1) % 3); }
  const st = E.paragonState(ts[0]);
  const ok = E.makeParagon(ts[0]);
  console.log(type.padEnd(9), 'paragon', ok ? 'OK' : 'FAILED', 'degree', ts[0].degree, 'cost', st && st.cost, 'towers left of type', G.towers.filter(t => t.type === type).length);
}
const n = +(process.argv[3] || 120);
E.Admin.setRound(n);
G.lives = 1e6;
const lives0 = G.lives;
E.startRound();
let steps = 0, maxStep = 0, total = 0, maxE = 0, maxP = 0;
while (G.roundActive && steps < 60 * 900){
  const t0 = process.hrtime.bigint();
  E.step(E.DT);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  total += ms; maxStep = Math.max(maxStep, ms); steps++;
  maxE = Math.max(maxE, G.enemies.length); maxP = Math.max(maxP, G.projs.length);
  for (const ab of E.abilityList()) if (ab.cd <= 0) E.useAbility(ab.id);
  if (G.loaves.length) E.collectLoavesAt(0, 0, 1e9);
}
console.log(`round ${n}: leaked ${lives0 - G.lives}, ${(steps / 60).toFixed(0)}s sim, avg step ${(total / steps).toFixed(3)}ms, max step ${maxStep.toFixed(1)}ms, max enemies ${maxE}, max projectiles ${maxP}`);
console.log('damage by tower:', G.towers.map(t => t.type + (t.paragon ? '*' : '') + '=' + Math.round(t.dmg)).join(', '));
