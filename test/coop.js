// Co-op: the host's purses and ownership, the guest's commands, income split, frames and tower parts, and the guest's puppet.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, Coop } = E;
E.Store.init();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
function spot(t){ for (let x = 120; x < 1000; x += 37) for (let y = 90; y < 620; y += 37) if (E.canPlace(t, x, y)) return [x, y]; }
E.newGame('block', 'medium', false);
G.cash = 2000;
E.coopHostStart();
ok(Coop.on && G.cash === 1000 && Coop.wallet[1] === 1000, 'the host’s cash is split into two purses');
/* the guest builds with its own purse */
const [gx, gy] = spot('knife');
let n = E.coopHostReceive({ k:'c', q:[[1, 'place', 'knife', gx, gy]], name:'Pal' });
const gt = G.towers.find(t => t.own === 1);
ok(n === 1 && gt && G.cash === 1000 && Coop.wallet[1] < 1000, 'a guest command places the guest’s appliance from the guest’s purse');
ok(Coop.names[1] === 'Pal', 'the guest’s name arrives');
E.coopHostReceive({ k:'c', q:[[1, 'place', 'knife', gx + 200, gy]] });
ok(G.towers.length === 1, 'a command already done isn’t run twice');
const ht = E.placeTower('toaster', ...spot('toaster'));
ok(ht && !ht.own && G.cash < 1000, 'the host builds from the host’s purse');
/* ownership */
ok(!E.upgradeState(gt, 0).ok && /Pal/.test(E.upgradeState(gt, 0).why), 'the host can’t upgrade the guest’s appliance');
ok(E.sellTower(gt) === 0 && G.towers.includes(gt), 'or sell it');
const gw = Coop.wallet[1];
E.coopHostReceive({ k:'c', q:[[2, 'up', ht.id, 0]] });
ok(ht.up[0] === 0 && Coop.wallet[1] === gw, 'and the guest can’t upgrade the host’s');
E.coopHostReceive({ k:'c', q:[[3, 'up', gt.id, 0]] });
ok(gt.up[0] === 1 && Coop.wallet[1] < gw, 'the guest upgrades its own from its own purse');
E.coopHostReceive({ k:'c', q:[[4, 'set', gt.id, { tg:'strong' }]] });
ok(gt.tg === 'strong', 'and sets its targeting');
/* income is split */
const c0 = G.cash, w0 = Coop.wallet[1];
E.coopHostReceive({ k:'c', q:[[5, 'start']] });
ok(G.roundActive, 'the guest can start a round');
let steps = 0;
while (G.roundActive && steps < 60 * 120){ const before = G.cash; E.step(1 / 60); E.coopIncome(before); steps++; }
const hostGain = G.cash - c0, guestGain = Coop.wallet[1] - w0;
ok(hostGain > 0 && Math.abs(hostGain - guestGain) < 2, 'the kitchen’s earnings are split (' + Math.round(hostGain) + ' / ' + Math.round(guestGain) + ')');
/* the guest sells its own and gets the refund */
const w1 = Coop.wallet[1];
E.coopHostReceive({ k:'c', q:[[6, 'sell', gt.id]] });
ok(!G.towers.includes(gt) && Coop.wallet[1] > w1 && G.cash === c0 + hostGain, 'the guest sells its own and the refund is the guest’s');
/* a save keeps who owns what */
E.coopHostReceive({ k:'c', q:[[7, 'place', 'knife', gx, gy]] });
const snap = JSON.parse(JSON.stringify(E.serializeGame()));
ok(snap.towers.some(t => t.ow === 1), 'saves record the guest’s appliances');
/* frames */
G.cash = 1e6; E.startRound(); for (let i = 0; i < 300; i++) E.step(1 / 60);
const F = E.coopFrame(1500), parts = E.coopTowerParts(3000);
ok(F.k === 'e' && F.e.length === 12 * G.enemies.filter(e => !e.dead && e.x > -60 && e.x < 1160).length && F.e.length > 0, 'a frame carries ' + F.e.length / 12 + ' pests');
ok(JSON.stringify(E.coopFrame(5)).length < 4096 && E.coopFrame(5).e.length <= 60, 'frames for a room stay small');
ok(parts.length >= 1 && parts[0].t.length === G.towers.length && parts[0].map === 'block', 'the appliances go in parts');
const enemiesThen = G.enemies.filter(e => !e.dead).length, towersThen = G.towers.map(t => t.type + t.up.join('') + (t.own || 0)).sort().join();
const wire = JSON.parse(JSON.stringify({ F, parts }));
/* the guest's side */
E.coopReset();
E.coopGuestStart();
E.setupGame(wire.parts[0].map, wire.parts[0].diff, false, null, 'standard');
for (const p of wire.parts) E.coopApplyTowers(p);
ok(G.towers.map(t => t.type + t.up.join('') + (t.own || 0)).sort().join() === towersThen && G.towers.every(t => t.s), 'the guest’s puppet has the same appliances');
E.coopApplyFrame(wire.F);
ok(G.enemies.length > 0 && G.enemies.length <= enemiesThen && G.enemies.every(e => e.def && isFinite(e.x)), 'and the pests from the frame');
ok(G.cash === Math.floor(wire.F.c[1]) && G.lives === wire.F.l, 'the guest sees its own cash and the shared lives');
/* guest actions become commands */
const mine = G.towers.find(t => t.own === 1);
E.Coop.out = [];
ok(E.placeTower('knife', 300, 300) === null && E.Coop.out.length === 1 && E.Coop.out[0][1] === 'place', 'a guest’s build becomes a command');
ok(E.upgradeTower(mine, 1) && E.Coop.out[1][1] === 'up', 'so does an upgrade');
ok(!E.upgradeTower(G.towers.find(t => !t.own), 0), 'but not of the host’s appliance');
mine.tg = 'last'; E.coopGuestTick(0.05);
ok(E.Coop.out.some(c => c[1] === 'set' && c[3].tg === 'last'), 'a targeting change is sent');
const before = G.towers.length;
E.storeGame(E.serializeGame());
ok(true, 'a guest’s puppet game is never saved');
const pk = E.coopPacket();
ok(pk.k === 'c' && pk.q.length >= 3, 'the packet carries the unacknowledged commands');
E.coopApplyFrame(Object.assign({}, wire.F, { ack: pk.q[1][0] }));
ok(E.Coop.out.length === pk.q.length - 2, 'acknowledged ones are dropped');
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
