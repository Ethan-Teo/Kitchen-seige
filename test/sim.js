// Headless balance + crash test. Usage: node test/sim.js [map] [diff] [maxRound] [maxMastery]
// Usage: node test/sim.js [map] [diff] [maxRound] [maxMastery]; HERO=chef_blaze places a head chef first.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;

const mapId = process.argv[2] || 'block';
const diff = process.argv[3] || 'medium';
const maxRound = +(process.argv[4] || 60);
const maxM = process.argv[5] === '1';

E.Store.init();
if (maxM) E.Admin.maxMastery();
E.newGame(mapId, diff, false);
if (process.env.HERO) E.AdminFlags.unlockAll = true;

// candidate spots by path coverage
function spotsFor(type, range){
  const out = [];
  for (let x = 30; x < X.W - 20; x += 18) for (let y = 30; y < X.H - 20; y += 18){
    if (!E.canPlace(type, x, y)) continue;
    let cov = 0;
    for (const P of G.paths) for (let d = 0; d < P.len; d += 10){
      const s = P.segs.find(g => d >= g.start && d <= g.start + g.len);
      const t = d - s.start; const px = s.x1 + s.dx * t, py = s.y1 + s.dy * t;
      if ((px - x) ** 2 + (py - y) ** 2 <= range * range && px > 0 && px < X.W && py > 0 && py < X.H) cov++;
    }
    out.push({ x, y, cov });
  }
  out.sort((a, b) => b.cov - a.cov);
  return out;
}
function place(type){
  const range = type === 'siphon' || type === 'bread' || type === 'espresso' ? 130 : Math.min(X.TOWERS[type].base.range, 200);
  const sp = spotsFor(type, range);
  for (const s of sp){ const t = E.placeTower(type, s.x, s.y); if (t) return t; }
  return null;
}
const T = [];
// Adaptive bot: defense list always progresses; economy items only when the last round didn't leak.
const D_PLAN = [
  ['p','knife','k1'], ['p','knife','k2'], ['u','k1',0], ['u','k2',0],
  ['p','blender','b1'], ['u','b1',0],
  ['p','knife','k3'], ['u','k3',2], ['u','k3',2],
  ['p','toaster','t1'], ['u','t1',0],
  ['p','grill','g1'], ['u','g1',1], ['u','g1',1],
  ['p','fryer','f0'], ['u','f0',0], ['u','f0',1], ['u','f0',1],
  ['u','k1',0], ['u','k2',0], ['u','b1',0],
  ['u','t1',0], ['u','t1',2], ['u','t1',2],
  ['u','f0',0],
  ['p','mixer','x1'], ['u','x1',1], ['u','x1',1],
  ['u','g1',1], ['u','b1',0], ['u','k3',2],
  ['p','espresso','e1'], ['u','e1',0], ['u','e1',2],
  ['p','micro','m1'], ['u','m1',0], ['u','m1',0],
  ['u','t1',0], ['u','g1',1], ['u','x1',1], ['u','k3',2], ['u','f0',0],
  ['p','freezer','fz'], ['u','fz',2], ['u','fz',2], ['u','fz',2],
  ['p','siphon','s1'], ['u','s1',0], ['u','s1',0], ['u','s1',0], ['u','s1',0],
  ['u','m1',0], ['u','e1',0], ['u','e1',0],
  ['u','b1',0], ['u','x1',1], ['u','k1',0],
  ['p','knife','k4'], ['u','k4',1], ['u','k4',1], ['u','k4',1], ['u','k4',1],
  ['u','t1',0], ['u','s1',0], ['u','g1',1],
  ['p','toaster','t2'], ['u','t2',1], ['u','t2',1], ['u','t2',1], ['u','t2',1], ['u','t2',1],
  ['u','k4',1], ['u','e1',0],
  ['p','knife','k5'], ['u','k5',2], ['u','k5',2], ['u','k5',2], ['u','k5',2], ['u','k5',2],
  ['p','siphon','s2'], ['u','s2',0], ['u','s2',0], ['u','s2',0], ['u','s2',0], ['u','s2',0],
  ['p','grill','g2'], ['u','g2',0], ['u','g2',0], ['u','g2',0], ['u','g2',0], ['u','g2',0],
  ['u','m1',0],
  ['p','toaster','t3'], ['u','t3',2], ['u','t3',2], ['u','t3',2], ['u','t3',2], ['u','t3',2], ['par','t1'],
];
const E_PLAN = [
  ['p','bread','r1'], ['u','r1',0], ['u','r1',0], ['p','bread','r2'], ['u','r2',2], ['u','r2',2], ['u','r1',0], ['u','r2',2],
  ['p','bread','r3'], ['u','r3',0], ['u','r3',0], ['u','r1',0], ['u','r2',2], ['u','r3',0], ['u','r3',0],
];
const named = {};
let di = 0, ei = 0;
function tryItem(a){
  if (a[0] === 'p'){
    const c = E.towerCost(a[1]);
    if (G.cash < c) return 'wait';
    const t = place(a[1]);
    if (!t) return 'skip';
    named[a[2]] = t; return 'done';
  }
  const t = named[a[1]];
  if (!t || !G.towers.includes(t)) return 'skip';
  if (a[0] === 'par'){
    const st = E.paragonState(t);
    if (!st) return 'skip';
    if (!st.ok) return 'skip';
    if (G.cash < st.cost) return 'wait';
    E.makeParagon(t); console.log('PARAGON', t.type, 'degree', t.degree, 'at round', G.round); return 'done';
  }
  const st = E.upgradeState(t, a[2]);
  if (!st.ok) return st.mastery ? 'wait' : 'skip';
  if (G.cash < st.cost) return 'wait';
  E.upgradeTower(t, a[2]); return 'done';
}
let leakedLast = 0, quietRounds = 0;
function doPlan(){
  if (process.env.HERO && !named.hero){ const c = E.towerCost(process.env.HERO); if (G.cash < c) return; named.hero = place(process.env.HERO) || { skip:true }; }
  for (let guard = 0; guard < 60; guard++){
    const wantEcon = !process.env.NOECON && quietRounds >= 2 && ei < E_PLAN.length && G.round >= 8;
    if (wantEcon && G.round % 2 === 0){
      const r = tryItem(E_PLAN[ei]);
      if (r === 'done' || r === 'skip'){ ei++; continue; }
      if (G.round < 30) return;
    }
    if (di >= D_PLAN.length) return;
    const r = tryItem(D_PLAN[di]);
    if (r === 'done' || r === 'skip'){ di++; continue; }
    return;
  }
}
const pi = { valueOf(){ return di + '/' + ei; } };
const t0 = Date.now();
let lastLives = G.lives;
const log = [];
while (G.round <= maxRound && !G.over){
  doPlan();
  // try paragon if eligible (for late game)
  const r = G.round;
  E.startRound();
  let steps = 0;
  while (G.roundActive && !G.over && steps < 60 * 600){
    E.step(E.DT);
    // auto-collect loaves
    if (G.loaves.length) E.collectLoavesAt(0, 0, 99999);
    // abilities
    for (const ab of E.abilityList()) if (ab.cd <= 0) E.useAbility(ab.id);
    steps++;
  }
  if (steps >= 60 * 600) { console.log('ROUND STUCK', r, G.enemies.length); break; }
  const lost = lastLives - G.lives; lastLives = G.lives; quietRounds = lost > 0 ? 0 : quietRounds + 1;
  log.push(`R${r} cash=${Math.floor(G.cash)} lives=${G.lives}${lost > 0 ? ' (-' + lost + ')' : ''} towers=${G.towers.length} plan=${di}/${ei} t=${(steps / 60).toFixed(0)}s`);
  if (process.env.TW && r >= +process.env.TW) log.push('   ' + G.towers.map(t => t.type + '[' + t.up.join('') + ']=' + Math.round(t.dmg)).join(' '));
  if (G.won && !G.freeplay) E.Admin && (G.freeplay = true);
}
console.log(log.join('\n'));
console.log('over=', G.over, 'round=', G.round, 'damage=', Math.round(G.stats.damage), 'kills=', G.stats.kills, 'earned=', Math.round(G.stats.earned));
const P = X.Profile();
console.log('mastery', JSON.stringify(Object.fromEntries(Object.entries(P.mastery).map(([k, v]) => [k, v + ' (r' + X.rankOf(v) + ')']))));
if (named.hero && named.hero.hero) console.log('hero', named.hero.type, 'level', named.hero.level, 'dmg', Math.round(named.hero.dmg), 'cash', Math.round(named.hero.cashGen));
console.log('towers:', G.towers.map(t => t.type + '@' + t.x + ',' + t.y + '[' + t.up.join('') + '] dmg=' + Math.round(t.dmg)).join(', '));
console.log('elapsed', Date.now() - t0, 'ms');
