// Mods: cleaning, codes, the library and switching on, stacking, and what a modded game changes: cash, lives, the win
// round, prices, damage, range, pierce, bans, pest health, speed and pay, no medals or Dough, saves that keep their mods.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
E.Store.init();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
const P = () => E.Profile();
function spot(t){ for (let x = 120; x < 1000; x += 37) for (let y = 90; y < 620; y += 37) if (E.canPlace(t, x, y)) return [x, y]; }

/* cleaning and codes */
const m0 = E.cleanGameMod({ name:'<b>X</b>', rules:{ hp:99, speed:'1.5', lives:0, bogus:3, maxTier:7 }, towers:{ knife:{ dmg:2, ban:true }, dragon:{ dmg:9 }, all:{ ban:true, cost:1 } }, pests:{ ant:{ hp:0.5, cash:0 }, unicorn:{ hp:2 } }, flags:{ noSell:1, hack:1 } });
ok(m0.name.indexOf('<') < 0 && m0.rules.hp === 20 && m0.rules.speed === 1.5 && m0.rules.lives === 1 && !m0.rules.bogus && m0.rules.maxTier == null, 'numbers are clamped, unknown rules dropped, defaults left out');
ok(m0.towers.knife.ban && !m0.towers.dragon && !m0.towers.all && m0.pests.ant.cash === 0 && !m0.pests.unicorn && m0.flags.noSell && !m0.flags.hack, 'unknown appliances, pests and flags are dropped');
const code = E.gameModCode(m0), back = E.gameModFromCode(code);
ok(code.startsWith('KSX1:') && JSON.stringify(back.rules) === JSON.stringify(m0.rules) && back.towers.knife.dmg === 2, 'mod codes round-trip');
let threw = false; try { E.gameModFromCode('KSX1:!!'); } catch (e) { threw = true; }
ok(threw, 'a damaged code is refused');
ok(/pest health ×20/.test(E.gameModSummary(m0)) && /Knife Block banned/.test(E.gameModSummary(m0)), 'a summary says what it changes');
ok(Object.keys(E.GM_PRESETS).every(k => E.cleanGameMod(E.GM_PRESETS[k]).name === E.GM_PRESETS[k].name), 'every example mod is valid');

/* a plain game first, for comparison */
E.newGame('block', 'medium', false);
const plain = { cash: G.cash, lives: G.lives, win: G.win, knife: E.towerCost('knife') };
const kt = E.placeTower('knife', ...spot('knife'));
const plainStats = { dmg: kt.s.atk.main.dmg, rate: kt.s.atk.main.rate, range: kt.s.range, pierce: kt.s.atk.main.pierce, up: E.upgradeCost(kt, 0) };
ok(!G.mods && !E.noRecords(), 'with no mods on, games are ordinary');

/* the library */
const id = E.saveGameMod({ name:'Test Mod', rules:{ cash:5000, lives:42, win:30, hp:2, speed:1.5, income:3, price:2 }, towers:{ knife:{ dmg:3, rate:2, range:1.5, pierce:2 }, toaster:{ ban:true } }, pests:{ ant:{ hp:0.5 } }, flags:{ noSell:true } });
ok(id && E.gameModList().includes(id) && !E.gameModsOn().length, 'a mod is saved, switched off');
E.setGameModOn(id, true);
ok(E.gameModsOn()[0] === id, 'and switched on');

/* a modded game */
E.newGame('block', 'medium', false);
ok(G.mods && G.cash === 5000 && G.lives === 42 && G.win === 30, 'start cash, lives and the win round');
ok(E.towerCost('knife') === Math.max(5, Math.round(plain.knife * 2 / 5) * 5), 'prices doubled');
ok(!E.canBuild('toaster') && E.canBuild('knife'), 'the toaster is banned');
ok(!E.canSell(), 'no selling');
G.cash = 1e7;
const k2 = E.placeTower('knife', ...spot('knife'));
ok(Math.abs(k2.s.atk.main.dmg - plainStats.dmg * 3) < 1e-9 && Math.abs(k2.s.atk.main.rate - plainStats.rate / 2) < 1e-9 && Math.abs(k2.s.range - plainStats.range * 1.5) < 1e-6 && k2.s.atk.main.pierce === plainStats.pierce + 2, 'knife damage, speed, range and pierce');
ok(E.upgradeCost(k2, 0) === Math.max(5, Math.round(plainStats.up * 2 / 5) * 5), 'upgrades cost the modded price');
const ant = E.spawnEnemy('ant', {}), roach = E.spawnEnemy('roach', {});
const ref = X.ENEMIES;
ok(Math.abs(ant.speed / roach.speed - (ref.ant.speed / ref.roach.speed)) < 1e-9, 'pest speed changes for all alike');
ok(G.mod.hp === 2 && G.mod.speed === 1.5 && G.mod.cash === 3, 'health, speed and pay through the game’s rules');
{ const e = E.spawnEnemy('ant', {}); const e2 = E.spawnEnemy('fruitfly', {}); ok(e.maxHp / e2.maxHp < (ref.ant.hp / ref.fruitfly.hp) * 0.75, 'ants have half health on top'); }
ok(E.noRecords(), 'no records, achievements or medals in a modded game');
const dough = P().dough; E.metaRoundEnd(5); ok(P().dough === dough, 'and no Dough');
/* saves keep the mods even when they are switched off */
const snap = JSON.parse(JSON.stringify(E.serializeGame()));
E.setGameModOn(id, false);
E.newGame('block', 'medium', false);
ok(!G.mods && G.win === plain.win, 'switched off, new games are ordinary again');
E.loadGame(snap);
ok(G.mods && G.win === 30 && !E.canBuild('toaster') && G.mod.hp === 2, 'a loaded modded game keeps its mods');
/* stacking */
const id2 = E.saveGameMod({ name:'Two', rules:{ hp:3, maxTier:3 }, towers:{ knife:{ dmg:2 } } });
const S = E.stackGameMods([id, id2]);
ok(S.rules.hp === 6 && S.rules.maxTier === 3 && S.towers.knife.dmg === 6 && S.towers.knife.pierce === 2 && S.towers.toaster.ban, 'mods stack: multipliers multiply, bans add up');
/* challenges and events take no mods */
E.setGameModOn(id, true);
ok(E.gameModsForNew({}, null) === null && E.gameModsForNew(null, {}) === null && E.gameModsForNew(null, null), 'dailies and events stay unmodded');
/* deleting */
E.deleteGameMod(id);
ok(!E.gameModById(id) && !E.gameModsOn().includes(id), 'deleted, it is gone and switched off');
/* the gallery takes mods */
ok(E.codeKind(code) === 'mod' && E.galleryGet(code).added === 1, 'mod codes work in the gallery');
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
