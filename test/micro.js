// Controlled accuracy test: one tower beside a straight path, a stream of one pest type.
const path = require('path');
require('./sim_load.js');
const E = require(path.join(__dirname, '.combined.js'));
const { G } = E;
E.Store.init();
E.Admin.maxMastery();
const [type = 'knife', pest = 'ant', count = 20, spacing = 1, ups = '000'] = process.argv.slice(2);
// extra args: [7] mods (c/m/a) [8] round number [9] use abilities after N seconds
E.newGame('freezer', 'medium', false); // straight first segment along y=340
G.cash = 1e6;
const t = E.placeTower(type, 250, 340 - 60);
const up = ups.split('').map(Number);
for (let p = 0; p < 3; p++) for (let i = 0; i < up[p]; i++) E.upgradeTower(t, p);
let shots = 0;
const origPush = G.projs.push;
G.round = 1;
G.roundActive = true; G.spawn = [{ type:'ant', count: 1e9, spawned: 0, start: 1e9, spacing: 1, mods:'' }];
const mods = {}; for (const ch of (process.argv[7] || '')) mods[{ c:'camo', m:'mold', a:'armored' }[ch]] = true;
if (process.argv[8]) G.round = +process.argv[8];
let spawned = 0, time = 0, leaked = 0;
const lives0 = G.lives;
while (time < 120){
  if (spawned < +count && time >= spawned * +spacing){ E.Admin.spawn(pest, 1, mods); spawned++; }
  E.step(E.DT); time += E.DT;
  if (spawned >= +count && G.enemies.length === 0 && G.timers.length === 0) break;
  if (process.argv[9] && time > +process.argv[9] && !t._ab){ t._ab = 1; for (const ab of t.s.abilities) console.log('ability', ab.id, E.useAbility(ab.id)); }
}
console.log(`${type}[${ups}] vs ${count} ${pest} @${spacing}s: kills=${G.stats.kills} leaked lives=${lives0 - G.lives} dmg=${Math.round(t.dmg)} time=${time.toFixed(1)}s`);
