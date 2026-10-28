// The round book: rounds 1 to 100 follow the classic progression, scaled onto the threat curve.
require('./sim_load.js');
const E = require('./.combined.js');
const { X } = E;
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
const R = n => X.roundGroups(n), types = n => R(n).map(g => g.type), has = (n, t) => types(n).includes(t);
const first = t => { for (let n = 1; n <= 100; n++) if (has(n, t)) return n; return 0; };
ok(R(1).length === 1 && R(1)[0].type === 'ant' && R(1)[0].count === 20, 'round 1 is twenty ants');
ok(R(2)[0].count === 35 && R(10).length === 1 && R(10)[0].type === 'fruitfly' && R(10)[0].count === 102, 'the first ten rounds play as written');
ok(first('housefly') === 6 && first('roach') === 11, 'houseflies from 6, roaches from 11');
ok(first('pillbug') === 20 && first('snowflea') === 22 && first('fireant') === 25 && first('weevil') === 28, 'immune pests arrive at 20, 22, 25 and 28');
ok(first('antball') === 26 && first('mouse') === 35 && first('rat') === 38, 'ant balls at 26, mice at 35, rats at 38');
ok(types(40).join() === 'cheese' && R(40)[0].count === 1, 'round 40 is a lone cheese wheel');
ok(types(60).join() === 'basket' && types(80).join() === 'truck' && types(100).join() === 'raccoon', 'a lone basket on 60, food truck on 80, raccoon on 100');
ok(first('cheese') === 40 && first('basket') === 60 && first('truck') === 80 && first('midnight') === 90 && first('raccoon') === 100, 'each vehicle debuts on its round');
ok(R(24).some(g => g.mods.includes('c')) && !Array.from({ length: 23 }, (_, i) => i + 1).some(n => R(n).some(g => g.mods.includes('c'))), 'the first ghost comes on 24');
ok(R(17).every(g => g.mods.includes('m')), 'round 17 is all moldy');
let bosses = 0; for (let n = 1; n <= 100; n++) if (R(n).some(g => X.ENEMIES[g.type].boss)) bosses++;
let fp = 0; for (let n = 101; n <= 300; n++) if (R(n).some(g => X.ENEMIES[g.type].boss)) fp++;
ok(bosses === 0 && fp === 0, 'no bosses in ordinary rounds or freeplay: they have their own mode');
/* on the curve over each stretch of ten */
for (let a = 11; a <= 91; a += 10){
  let s = 0, t = 0; for (let n = a; n < a + 10; n++){ s += Math.log(X.roundThreat(R(n))); t += Math.log(X.threatTarget(n)); }
  const r = Math.exp((s - t) / 10);
  ok(r > 0.6 && r < 1.5, 'rounds ' + a + '-' + (a + 9) + ' sit on the curve (' + r.toFixed(2) + ')');
}
let maxN = 0; for (let n = 1; n <= 100; n++) for (const g of R(n)) maxN = Math.max(maxN, g.count);
ok(maxN <= 180, 'no group larger than 180 (' + maxN + ')');
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
