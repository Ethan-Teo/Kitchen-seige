// Paragon degree: built from power pools, grows after it is built, can reach 100, and survives a save.
const path = require('path');
require('./sim_load.js');
const E = require(path.join(__dirname, '.combined.js'));
const { G, X } = E;
E.Store.init(); E.Admin.maxMastery();
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
E.newGame('pantry', 'medium', false);
G.cash = 5e6;
const spots = [];
for (let x = 60; x < X.W - 60 && spots.length < 12; x += 40) for (let y = 60; y < X.H - 60 && spots.length < 12; y += 40) if (E.canPlace('knife', x, y)) spots.push([x, y]);
const put = () => { const [x, y] = spots.shift(); return E.placeTower('knife', x, y); };
const a = put(), b = put(), c = put();
for (let i = 0; i < 5; i++){ E.upgradeTower(a, 0); E.upgradeTower(b, 1); E.upgradeTower(c, 2); }
const st = E.paragonState(a);
ok(st && st.ok, 'three tier 5s make a paragon possible');
const est = st.degree;
ok(E.makeParagon(a), 'paragon built');
const par = G.towers.find(t => t.paragon);
console.log('     fresh degree', par.degree, 'estimate', est, 'power', Math.round(E.poolTotal(par.pw)));
ok(par.degree === est, 'the estimate matches the result');
// invest cash
const d0 = par.degree, cash0 = G.cash;
const v = E.paragonInvest(par, 50000);
ok(v === 50000 && G.cash === cash0 - 50000, 'investing $50,000 spends it');
ok(par.degree > d0, 'investing raises the degree (' + d0 + ' -> ' + par.degree + ')');
const filled = E.paragonInvest(par, 1e9);
ok(par.pw.cash === E.PARA_CAP.cash, 'the cash pool stops at its cap (' + (v + filled) + ' invested)');
// merge copies: extra tier 5s and cheap copies
const d1 = par.degree;
for (let i = 0; i < 4; i++){ const k = put(); for (let j = 0; j < 5; j++) E.upgradeTower(k, i % 3); for (let j = 0; j < 2; j++) E.upgradeTower(k, (i + 1) % 3); E.mergeIntoParagon(k); }
ok(par.degree > d1 && par.pw.t5 > 0, 'merging tier 5 copies raises it (' + d1 + ' -> ' + par.degree + ', tier 5 pool ' + par.pw.t5 + ')');
const cheap = put(); E.upgradeTower(cheap, 0); E.upgradeTower(cheap, 0);
const ms = E.mergeState(cheap);
ok(ms && ms.gain > 0, 'a cheap copy adds cash and upgrade power (+' + Math.round(ms.gain) + ')');
E.mergeIntoParagon(cheap);
ok(!G.towers.includes(cheap), 'the merged copy is gone');
// its own damage grows it at the end of a round
const d2 = par.degree;
par.dmg += 10.8e6;
E.paragonGrow(par);
ok(par.degree > d2, 'damage it deals raises the degree (' + d2 + ' -> ' + par.degree + ')');
console.log('     pools', JSON.stringify(Object.fromEntries(Object.entries(par.pw).map(([k, v]) => [k, Math.round(v)]))), 'power', Math.round(E.poolTotal(par.pw)), 'degree', par.degree);
ok(par.degree === 100, 'degree 100 is reachable');
// stats follow the degree
const r = Object.values(par.s.atk)[0].rate;
ok(r > 0 && isFinite(r), 'stats are built for the new degree');
// save and load keep the pools
const data = JSON.parse(JSON.stringify(E.serializeGame()));
E.loadGame(data);
const p2 = G.towers.find(t => t.paragon);
ok(p2.degree === 100 && Math.round(E.poolTotal(p2.pw)) === Math.round(E.poolTotal(par.pw)), 'save and load keep degree and pools');
// an old save with only a degree
delete data.towers.find(t => t.par).pw; data.towers.find(t => t.par).par = 74;
E.loadGame(data);
const p3 = G.towers.find(t => t.paragon);
ok(p3.degree === 74 && E.degreeOf(E.poolTotal(p3.pw)) === 74, 'an older save keeps degree 74 and can keep growing');
p3.dmg += 5e6; E.paragonGrow(p3);
ok(p3.degree > 74, 'which it does (' + p3.degree + ')');
console.log(fails ? fails + ' FAILED' : 'all degree tests passed');
process.exit(fails ? 1 : 0);
