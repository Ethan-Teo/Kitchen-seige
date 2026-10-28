// For milestone rounds, place a budget-appropriate build and play just that round.
const path = require('path');
require('./sim_load.js');
const E = require(path.join(__dirname, '.combined.js'));
const { G, X } = E;
E.Store.init();
E.Admin.maxMastery();
const mapId = process.argv[2] || 'block';
const diff = process.argv[3] || 'medium';

function spotsFor(type, range){
  const out = [];
  for (let x = 30; x < X.W - 20; x += 16) for (let y = 30; y < X.H - 20; y += 16){
    if (!E.canPlace(type, x, y)) continue;
    let cov = 0;
    for (const P of G.paths) for (let d = 0; d < P.len; d += 10){
      const s = P.segs.find(g => d >= g.start && d <= g.start + g.len);
      const t = d - s.start; const px = s.x1 + s.dx * t, py = s.y1 + s.dy * t;
      if ((px - x) ** 2 + (py - y) ** 2 <= range * range && px > 0 && px < X.W && py > 0 && py < X.H) cov += 1 + d / P.len * 0.3;
    }
    out.push({ x, y, cov });
  }
  out.sort((a, b) => b.cov - a.cov);
  return out;
}
const BUILDS = {
  40: ['knife:203', 'knife:302', 'toaster:320', 'blender:320', 'grill:032', 'freezer:003', 'knife:230', 'siphon:220'],
  50: ['knife:402', 'toaster:420', 'blender:420', 'grill:042', 'micro:200', 'freezer:203', 'siphon:230', 'espresso:200'],
  60: ['knife:402', 'knife:042', 'toaster:042', 'blender:420', 'grill:042', 'micro:200', 'freezer:203', 'siphon:240', 'espresso:220'],
  70: ['knife:502', 'knife:042', 'toaster:052', 'blender:420', 'grill:052', 'micro:300', 'freezer:204', 'siphon:240', 'espresso:220'],
  80: ['knife:502', 'knife:052', 'toaster:052', 'blender:420', 'grill:052', 'micro:320', 'freezer:204', 'siphon:240', 'espresso:220', 'micro:203'],
  90: ['knife:502', 'knife:052', 'toaster:052', 'blender:520', 'grill:052', 'micro:320', 'freezer:204', 'siphon:240', 'espresso:220', 'micro:203', 'toaster:204'],
  100:['knife:502', 'knife:052', 'toaster:052', 'blender:520', 'grill:052', 'micro:420', 'freezer:204', 'siphon:520', 'espresso:420', 'micro:203', 'toaster:204'],
};
if (process.argv[5] === 'lean') Object.assign(BUILDS, {
  70: ['knife:502', 'toaster:052', 'micro:300', 'grill:042', 'blender:420', 'siphon:240', 'espresso:220', 'knife:023'],
  80: ['knife:502', 'toaster:052', 'micro:320', 'grill:042', 'blender:420', 'siphon:240', 'espresso:220', 'knife:023'],
  90: ['knife:502', 'toaster:052', 'micro:320', 'grill:042', 'blender:420', 'siphon:420', 'espresso:220', 'knife:023', 'micro:203'],
  100:['knife:502', 'toaster:052', 'micro:420', 'grill:052', 'blender:420', 'siphon:520', 'espresso:420', 'knife:023', 'micro:203', 'freezer:203'],
});
if (process.argv[5] === 'new') Object.assign(BUILDS, {
  40: ['dish:302', 'knife:203', 'fryer:302', 'grill:032', 'mixer:302', 'pasta:203', 'oven:023', 'freezer:003'],
  50: ['dish:402', 'knife:402', 'fryer:402', 'grill:042', 'mixer:402', 'pasta:204', 'oven:024', 'micro:200', 'espresso:200'],
  60: ['dish:502', 'knife:042', 'fryer:402', 'grill:042', 'mixer:420', 'pasta:204', 'oven:204', 'micro:200', 'espresso:220', 'pasta:042'],
  70: ['dish:502', 'fryer:502', 'grill:042', 'mixer:420', 'pasta:204', 'oven:204', 'micro:300', 'espresso:220', 'pasta:052', 'mixer:024'],
  80: ['dish:502', 'fryer:502', 'grill:052', 'mixer:520', 'pasta:204', 'oven:205', 'micro:320', 'espresso:420', 'pasta:052', 'mixer:024', 'dish:204'],
  90: ['dish:502', 'fryer:502', 'grill:052', 'mixer:520', 'pasta:204', 'oven:205', 'micro:320', 'espresso:420', 'pasta:052', 'mixer:024', 'dish:204', 'grill:502', 'oven:502'],
  100:['dish:502', 'fryer:502', 'grill:052', 'mixer:520', 'pasta:205', 'oven:205', 'micro:420', 'espresso:520', 'pasta:052', 'mixer:025', 'dish:205', 'grill:502', 'oven:502', 'fryer:250'],
});
if (process.argv[5] === 'only') {
  // builds made only of the six new or redesigned appliances (plus an espresso for support)
  Object.assign(BUILDS, {
    40: ['dish:302', 'dish:203', 'fryer:302', 'grill:302', 'mixer:302', 'pasta:203', 'oven:023', 'mixer:032'],
    60: ['dish:502', 'fryer:402', 'grill:402', 'mixer:420', 'pasta:204', 'oven:204', 'espresso:220', 'pasta:042', 'mixer:032'],
    80: ['dish:502', 'fryer:502', 'grill:502', 'mixer:520', 'pasta:204', 'oven:205', 'espresso:420', 'pasta:052', 'mixer:024', 'dish:204'],
    100:['dish:502', 'fryer:502', 'grill:502', 'mixer:520', 'pasta:205', 'oven:205', 'espresso:520', 'pasta:052', 'mixer:025', 'dish:205', 'oven:502', 'fryer:250', 'grill:052'],
  });
}
BUILDS[95] = BUILDS[95] || BUILDS[90]; for (let k = 101; k <= 500; k++) BUILDS[k] = BUILDS[k] || BUILDS[100]; BUILDS[98] = BUILDS[98] || BUILDS[100];
const rounds = (process.argv[4] || '40,50,60,70,80,90,100').split(',').map(Number);
for (const n of rounds){
  E.newGame(mapId, diff, false);
  G.cash = 1e9;
  let cost = 0;
  for (const b of BUILDS[n]){
    const [type, ups] = b.split(':');
    const range = type === 'siphon' || type === 'espresso' ? 140 : Math.min(X.TOWERS[type].base.range * 1.2, 200);
    let t = null;
    for (const s of spotsFor(type, range)){ t = E.placeTower(type, s.x, s.y); if (t) break; }
    if (!t) { console.log('no spot for', type); continue; }
    const u = ups.split('').map(Number);
    for (let p = 0; p < 3; p++) for (let i = 0; i < u[p]; i++){ if (!E.upgradeTower(t, p)) console.log('fail up', type, p); }
    cost += t.invested;
  }
  // also ask the paragon question for the 100 build
  E.Admin.setRound(n);
  const lives0 = G.lives = 99999;
  E.startRound();
  let steps = 0, abil = 0;
  while (G.roundActive && steps < 60 * 900){
    E.step(E.DT); steps++;
    for (const ab of E.abilityList()) if (ab.cd <= 0 && E.useAbility(ab.id)) abil++;
  }
  console.log(`R${n}: build cost $${cost} | leaked ${lives0 - G.lives} lives | ${(steps / 60).toFixed(0)}s | abilities ${abil} | ${G.roundActive ? 'TIMEOUT' : 'done'}`);
  if (process.env.DMG) console.log('   ' + G.towers.map(t => t.type + '[' + t.up.join('') + ']=' + Math.round(t.dmg)).join(', '));
}
