// Kitchens of your own: cleaning, checks, the library, playing one, no medals, saves that outlive the kitchen, codes.
require('./sim_load.js');
const E = require('./.combined.js');
const { G, X } = E;
E.Store.init();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
const P = () => E.Profile();

/* cleaning */
{
  const k = E.cleanKitchen({ name:'<b>Test</b>', theme:'nope', paths:[[[100, 340], [600, 340], [600, 100], [900, 100]], [[1]]], water:[{ style:'sink', x:5000, y:200, w:10, h:900 }, { style:'lava' }], deco:[{ k:'board', x:400, y:500 }, { k:'dragon', x:1, y:1 }] });
  ok(k.name === 'bTest/b' || k.name.indexOf('<') < 0, 'names lose markup');
  ok(k.theme === 'block' && k.paths.length === 1, 'an unknown floor becomes wood; a one-point trail is dropped');
  ok(k.paths[0][0][0] === -40 && k.paths[0][k.paths[0].length - 1][1] === -40, 'the trail ends run off the nearest edges by themselves');
  ok(k.water.length === 1 && k.water[0].x <= X.W && k.water[0].w >= 50 && k.water[0].h <= 500, 'water is clamped; unknown water dropped');
  ok(k.deco.length === 1 && k.deco[0].w === E.KM_DECO.board.w && k.deco[0].solid, 'props take their real size and solidity; unknown props dropped');
  ok(Object.keys(E.KM_DECO).length >= 15, Object.keys(E.KM_DECO).length + ' props to choose from');
}
/* checks */
{
  const short = E.cleanKitchen({ paths:[[[-40, 300], [200, 300], [200, -40]]] });
  ok(E.kitchenProblems(short).some(p => /too short/.test(p)), 'a short trail is flagged');
  const good = E.cleanKitchen(E.defaultKitchen());
  ok(E.kitchenProblems(good).length === 0, 'the starting kitchen is ready to play');
  const blocked = E.cleanKitchen(Object.assign(E.defaultKitchen(), { deco:[{ k:'jar', x:300, y:250 }] }));
  ok(E.kitchenProblems(blocked).some(p => /stands on a trail/.test(p)), 'a solid prop on a trail is flagged');
}
/* the library and playing one */
const k = Object.assign(E.defaultKitchen(), { name:'Test Kitchen', theme:'diner', water:[{ style:'sink', x:420, y:220, w:140, h:200 }], deco:[{ k:'jar', x:120, y:120 }] });
const id = E.saveKitchen(k);
const mid = E.kitchenMapId(id);
ok(id === 'km1' && X.MAPS[mid] && X.MAPS[mid].custom && X.MAPS[mid].level === 'Custom' && !X.MAP_ORDER.includes(mid), 'saved, it joins the kitchens as ' + mid + ' (not the medal list)');
E.newGame(mid, 'easy', false);
ok(G.mapId === mid && G.paths.length === 1 && G.map.theme === 'diner', 'a game starts on it');
ok(!E.canPlace('knife', 120, 120), 'its solid props block building');
ok(E.inWater(490, 320, 0) && !!E.placeTower('boat', 490, 320), 'boats go on its water');
G.cash = 1e7;
for (const [t, x, y] of [['knife', 380, 260], ['knife', 600, 260], ['toaster', 700, 420], ['knife', 200, 420]]){ const tw = E.placeTower(t, x, y); if (tw) tw.up = [3, 2, 0]; }
E.refreshTowers();
G.round = G.win; G.lives = 1e6;
E.startRound(); let n = 0; while (G.roundActive && n < 60 * 300){ E.step(1 / 60); n++; }
ok(G.won && !(P().medals[mid] && P().medals[mid].easy), 'winning on it earns no medal');
const snap = E.serializeGame();
ok(snap.cm && snap.cm.name === 'Test Kitchen' && snap.cm.paths.length === 1, 'the save carries a copy of the kitchen');
/* the kitchen deleted: the save still loads */
E.newGame('block', 'easy', false);   // leave the kitchen, then delete it
E.deleteKitchen(id);
ok(!E.kitchenById(id) && !X.MAPS[mid], 'deleted, it leaves the kitchens');
E.setActiveSlot(3); E.storeGame(snap);
ok(/Test Kitchen/.test(E.slotLabel(snap)), 'its save slot still names it');
E.loadGame(snap);
ok(G.mapId === mid && G.towers.length >= 4 && X.MAPS[mid] && X.MAPS[mid].adopted, 'and the game loads on its carried copy');
/* codes */
{
  const code = E.kitchenCode(k);
  const back = E.kitchenFromCode(code);
  ok(code.startsWith('KSM1:') && back.name === 'Test Kitchen' && back.water.length === 1 && back.theme === 'diner', 'kitchen codes round-trip');
  let threw = false; try { E.kitchenFromCode('KSM1:zzzz'); } catch (e) { threw = true; }
  ok(threw, 'a damaged code is refused');
}
/* the library's limit, and two devices' kitchens combined */
for (let i = 0; i < 30; i++) E.saveKitchen(E.defaultKitchen());
ok(E.kitchenList().length === 24 && E.saveKitchen(E.defaultKitchen()) === null, 'up to 24 kitchens');
{
  const a = { v:1, savedAt:1, kitchens:{ km1: E.defaultKitchen() } }, b = { v:1, savedAt:2, kitchens:{ km2: Object.assign(E.defaultKitchen(), { name:'Other' }) } };
  const c = E.combineProfiles(a, b);
  ok(c.kitchens.km1 && c.kitchens.km2, 'two devices’ kitchens are combined');
}
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
