// Tower strength probe: one tower at its best spot, fed an endless stream of very tough pests.
// Usage: node test/dps.js [types] [builds] [secs]
const path = require('path');
require('./sim_load.js');
const E = require(path.join(__dirname, '.combined.js'));
const { G, X } = E;
E.Store.init();
E.Admin.maxMastery();
if (E.AdminFlags) E.AdminFlags.unlockAll = /chef_/.test(process.argv[2] || '');
const types = (process.argv[2] || X.TOWERS && Object.keys(X.TOWERS).join(',')).split(',');
const builds = (process.argv[3] || '520,052,205,502,250,025').split(',');
const secs = +(process.argv[4] || 25);
function bestSpot(type){
  const T = X.TOWERS[type];
  const range = T.base.global ? 160 : T.base.range;
  let best = null;
  for (let x = 30; x < X.W - 20; x += 14) for (let y = 30; y < X.H - 20; y += 14){
    if (!E.canPlace(type, x, y)) continue;
    let cov = 0;
    for (const P of G.paths) for (let d = 0; d < P.len; d += 10){
      const s = P.segs.find(g => d >= g.start && d <= g.start + g.len);
      const t = d - s.start; const px = s.x1 + s.dx * t, py = s.y1 + s.dy * t;
      if ((px - x) ** 2 + (py - y) ** 2 <= range * range && px > 0 && px < X.W && py > 0 && py < X.H) cov++;
    }
    if (!best || cov > best.cov) best = { x, y, cov };
  }
  return best;
}
let startD = 0;
function run(type, build, scenario){
  E.newGame('block', 'medium', false);
  G.cash = 1e9; G.lives = 1e9;
  const sp = bestSpot(type);
  const t = E.placeTower(type, sp.x, sp.y);
  const P = G.paths[0], R = X.TOWERS[type].base.global ? 160 : X.TOWERS[type].base.range;
  let dmin = 0;
  for (let d = 0; d < P.len; d += 5){ const s = P.segs.find(g => d >= g.start && d <= g.start + g.len); const q = d - s.start; const px = s.x1 + s.dx * q, py = s.y1 + s.dy * q; if ((px - sp.x) ** 2 + (py - sp.y) ** 2 <= R * R){ dmin = d; break; } }
  startD = Math.max(0, dmin - 50);
  if (/^L\d+$/.test(build)){ t.level = +build.slice(1); E.refreshTowers(); }
  else { const u = build.split('').map(Number); for (let p = 0; p < 3; p++) for (let i = 0; i < u[p]; i++) E.upgradeTower(t, p); }
  G.round = 60; G.roundActive = true; G.spawn = [{ type:'ant', count: 1e9, spawned: 0, start: 1e9, spacing: 1, mods:'' }];
  E.Admin.resetCooldowns();
  let time = 0, next = 0;
  const spawn = () => {
    if (scenario === 'crowd'){ const e = E.Admin.spawn; for (let i = 0; i < 1; i++){ E.G.timers.push({ t: 0, fn: () => { const p = require; } }); } }
  };
  while (time < secs){
    if (time >= next){
      if (scenario === 'crowd'){ spawnTough('rat', 1e5); next += 0.12; }
      else { spawnTough('truck', 5e7); next += 4; }
    }
    E.step(E.DT); time += E.DT;
    if (!process.env.NOAB) for (const ab of E.abilityList()) if (ab.cd <= 0) E.useAbility(ab.id);
  }
  if (process.env.DBG) console.log(type, build, scenario, "spot", sp, "enemies", G.enemies.length, "first", G.enemies[0] && [Math.round(G.enemies[0].x), Math.round(G.enemies[0].y)], "over", G.over, "projs", G.projs.length);
  return t.dmg / secs;
}
function spawnTough(type, hp){
  // spawn through the engine, then make it effectively unkillable
  const before = G.enemies.length;
  E.Admin.spawn(type, 1, {});
  E.G.timers[E.G.timers.length - 1].fn = (fn => () => { fn(); const e = G.enemies[G.enemies.length - 1]; e.hp = e.maxHp = hp; e.d = startD; e.def = Object.assign({}, e.def, { children: null }); })(E.G.timers[E.G.timers.length - 1].fn);
}
const rows = [];
for (const type of types){
  if (X.TOWERS[type].base.noTarget) continue;
  const cells = [];
  for (const b of builds){
    const c = run(type, b, 'crowd'), v = run(type, b, 'boss');
    cells.push(b + ' ' + String(Math.round(c)).padStart(6) + '/' + String(Math.round(v)).padEnd(6));
  }
  rows.push(type.padEnd(8) + ' ' + cells.join(' | '));
  console.log(rows[rows.length - 1]);
}
