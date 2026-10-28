// Sandbox: infinite cash and lives, everything unlocked, pests on demand, and nothing earned.
require('./sim_load.js');
const E = require('./.combined.js');
const { G } = E;
E.Store.init();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
const P = () => E.Profile();

E.newGame('block', 'medium', false, null, 'sandbox');
ok(G.mode === 'sandbox' && E.sandboxOn() && G.freeplay && G.adminUsed, 'a sandbox game starts, in freeplay, marked as earning nothing');
ok(G.admin.infCash && G.admin.god && G.cash >= 9999999, 'cash and lives never run out');
ok(E.canBuild('knife') && E.AdminFlags.unit === false && E.adminUnitOn() && E.heroOwned('chef_infinity'), 'Chef Infinity and every head chef are on offer');
ok(E.upgradeState && true, 'upgrade state is exposed');

/* build something expensive, with the top upgrades, and still have the money */
const t = E.placeTower('knife', 380, 200);
ok(!!t, 'an appliance is placed');
const cash0 = G.cash;
for (let i = 0; i < 5; i++) E.upgradeTower(t, 0);
ok(t.up[0] === 5, 'every upgrade tier is unlocked without any mastery');
ok(G.cash >= 9999999, 'building and upgrading cost nothing');

/* round and mastery bookkeeping stays untouched */
const rounds0 = P().stats.rounds, dough0 = P().dough, best0 = P().stats.best.block || 0, games0 = P().stats.games;
E.Sandbox.sendRound(12);
ok(G.round === 12 && G.roundActive, 'send round 12 starts round 12');
for (let i = 0; i < 60 * 240 && G.roundActive; i++) E.step(1 / 60);
ok(!G.roundActive && G.round === 13, 'the round plays out and the next is ready');
ok(P().stats.rounds === rounds0 && P().dough === dough0 && (P().stats.best.block || 0) === best0, 'no records, Dough or best-round progress');
ok(Object.keys(G.xp).length === 0, 'no mastery xp is held');
ok(G.lives === G.startLives || G.admin.god, 'invincible: lives never drop');

/* pests on demand, including a boss */
E.Sandbox.spawn('rat', 6, { armored:true });
for (let i = 0; i < 60 * 3; i++) E.step(1 / 60);
ok(G.enemies.filter(e => e.type === 'rat').length >= 4, 'sent rats appear');
E.Sandbox.spawn('ratking', 1, {});
for (let i = 0; i < 60; i++) E.step(1 / 60);
ok(G.bosses.length === 1 || G.enemies.some(e => e.type === 'ratking'), 'a boss can be sent');
E.Admin.killAll();

/* scaling switches */
E.Sandbox.hp(5); E.Sandbox.dmg(10);
ok(G.mod.hp === 5 && G.admin.dmgMult === 10, 'pest health and damage multipliers');
const snap = E.serializeGame();
ok(snap.mode === 'sandbox' && snap.au === 1 && snap.sb && snap.sb.h === 5 && snap.sb.d === 10, 'the save carries the sandbox switches');
E.Sandbox.cash(false); E.Sandbox.god(false); E.Sandbox.hp(1); E.Sandbox.dmg(1);
E.loadGame(snap);
ok(G.mode === 'sandbox' && G.adminUsed && G.admin.dmgMult === 10 && G.mod.hp === 5 && G.admin.infCash === true, 'loading brings the sandbox back as it was');
ok(G.towers.length === 1 && G.towers[0].up[0] === 5, 'with the appliances');

/* clear kitchen */
const n = E.Sandbox.clearKitchen();
ok(n === 1 && G.towers.length === 0 && G.enemies.length === 0, 'clear kitchen sells everything and removes pests');

/* no final round */
E.Admin.setRound(100);
ok(G.freeplay && !G.won, 'no victory at the last round');

/* a normal game after a sandbox starts clean */
E.newGame('block', 'easy', false);
ok(G.mode === 'standard' && !G.adminUsed && !G.admin.infCash && !G.admin.god && G.admin.dmgMult === 1 && G.mod.hp === 1, 'the next ordinary game inherits nothing');
ok(!E.sandboxOn() && !E.adminUnitOn() && !E.heroOwned('chef_infinity'), 'and the sandbox unlocks are gone');
ok(P().stats.games === games0 + 1, 'games are still counted');

/* Chef Infinity's old leak: his flag must not stick to the next game */
E.AdminFlags.unit = true;
const ci = E.placeTower('chef_infinity', 500, 420);
ok(G.adminUsed, 'Chef Infinity marks his game');
E.newGame('block', 'easy', false);
ok(!G.adminUsed, 'but the next game is clean');

console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
