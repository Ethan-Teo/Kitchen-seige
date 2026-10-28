// Body Workshop: bodies on the profile, designs that wear them, looks that change with upgrades, share codes.
require('./sim_load.js');
const E = require('./.combined.js');
const { G } = E;
E.Store.init();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
const P = () => E.Profile();

/* a stand-in for the 3D builder: every call is recorded, chained, and counted */
function fakeBuilder(){
  const calls = {}; const B = new Proxy({}, { get: (o, k) => (...a) => { calls[k] = (calls[k] || 0) + 1; return B; } });
  return { B, calls };
}
/* a stand-in for a canvas context */
function fakeCtx(){
  const n = { fill:0, stroke:0 };
  const g = new Proxy({ globalAlpha:1, fillStyle:'', strokeStyle:'', lineWidth:1 }, { get: (o, k) => k in o ? o[k] : (...a) => { n[k] = (n[k] || 0) + 1; }, set: (o, k, v) => { o[k] = v; return true; } });
  return { g, n };
}

/* prefabs build and draw */
for (const key of E.BODY_PREFAB_ORDER){
  const b = E.prefabBody(key);
  const { B, calls } = fakeBuilder();
  let err = null; try { E.bodyBuild(B, b); } catch (e) { err = e; }
  const { g, n } = fakeCtx();
  try { E.bodyDrawFlat(b)(g, { type:'knife', fireAnim: 0.1 }, [0, 0, 0], 1.3); } catch (e) { err = err || e; }
  ok(!err && calls.push > 0 && calls.pop === calls.push && n.fill > 0, 'prefab ' + key + ' builds (' + Object.keys(calls).length + ' builder calls, push/pop balanced) and draws flat' + (err ? ': ' + err.message : ''));
}
/* every kind builds */
{
  const b = E.cleanBody({ name:'All kinds', parts: Object.keys(E.BODY_PREFABS.turret.parts.length ? { box:1, rbox:1, cyl:1, cone:1, barrel:1, sphere:1, dome:1, capsule:1, ring:1, disc:1, blade:1, fin:1, knob:1, light:1, flame:1, steam:1 } : {}).map(k => ({ k, spin: 1, bob: 1, show:'fire' })) });
  ok(b.parts.length === 16, 'sixteen parts, one of each kind, fit');
  const { B, calls } = fakeBuilder();
  let err = null; try { E.bodyBuild(B, b); } catch (e) { err = e; }
  ok(!err && calls.part === calls.endPart && calls.part >= 16, 'every kind builds, with its moving part opened and closed' + (err ? ': ' + err.message : ''));
  ok(E.bodyHeight(b) > 14, 'the body has a height');
}
/* cleaning */
{
  const b = E.cleanBody({ name:'<x>', size: 99, base:{ k:'nope', w: -5 }, parts:[{ k:'zzz', x: 500, c:'red' }] });
  ok(b.name === 'x' && b.size === 26 && b.base.k === 'rbox' && b.base.w === 6 && b.parts[0].k === 'box' && b.parts[0].x === 40 && b.parts[0].c === '#c9d2d6', 'bad values are clamped or replaced');
}
/* the library */
const id1 = E.saveBody(E.prefabBody('turret'));
const id2 = E.saveBody(Object.assign(E.prefabBody('cannon'), { name:'Big Gun' }));
ok(id1 === 'bd1' && id2 === 'bd2' && E.bodyList().length === 2, 'bodies save to the profile');
ok(E.bodyById(id1).name === 'Turret' && E.bodyById(id1)._rev > 0, 'a saved body has a revision');
const code = E.bodyCode(E.bodyById(id2));
ok(code.startsWith('KSB1:') && E.bodyFromCode(code).name === 'Big Gun', 'body share codes round-trip');

/* a design wears a body, and changes to another at tier 5 */
const d = E.defaultCustom();
d.name = 'Body Test'; d.body = id1;
d.paths[0].tiers[4].mods.push({ k:'look', e:'b:' + id2 });
d.paths[1].tiers[2].mods.push({ k:'look', e:'oven' });
const cid = E.saveCustomTower(d);
const T = E.TOWERS[cid];
ok(T && T.look === E.bodyLook(id1) && T.size === 17 && T.body === id1, 'the compiled appliance wears the body');
ok(T.paths[0].ups[4].look === E.bodyLook(id2) && T.paths[1].ups[2].look === 'oven', 'tiers that change the look say so');
ok(E.customLookAt(cid, [0, 0, 0]) === null && E.customLookAt(cid, [5, 0, 0]) === E.bodyLook(id2) && E.customLookAt(cid, [0, 3, 0]) === 'oven' && E.customLookAt(cid, [0, 0, 0], true) === 'oven', 'the look at each upgrade');
ok(E.designLookAt(P().custom[cid], [5, 0, 0]) === E.bodyLook(id2), 'and from the unsaved design');
ok(E.bodyUses(id1) === 1 && E.bodyUses(id2) === 1, 'body uses are counted');
/* in a game: the stats carry the look */
E.newGame('block', 'medium', false, null, 'sandbox');
const t = E.placeTower(cid, 380, 200);
ok(!!t && !t.s.look, 'placed, it wears its base body');
t.up = [5, 0, 0]; E.refreshTowers();
ok(t.s.look === E.bodyLook(id2), 'upgraded to tier 5, it wears the new one');
t.up = [5, 3, 0]; E.refreshTowers();
ok(t.s.look === 'oven', 'the last look change wins');
/* the save code carries bodies */
const dc = E.designCode(P().custom[cid]);
const raw = JSON.parse(decodeURIComponent(escape(Buffer.from(dc.slice(5), 'base64').toString('binary'))));
ok(raw.bodies && raw.bodies[id1] && raw.bodies[id2] && raw.body === id1, 'the design code carries both bodies');
/* importing into a profile without them remaps */
E.deleteBody(id1); E.deleteBody(id2);
ok(E.bodyList().length === 0 && E.TOWERS[cid].look === 'knife' && !E.TOWERS[cid].body, 'deleting the bodies leaves the design on its built-in look');
const d2 = E.designFromCode(dc);
ok(E.bodyList().length === 2 && d2.body && E.bodyById(d2.body).name === 'Turret', 'importing brings the bodies back and points the design at them');
const lm = d2.paths[0].tiers[4].mods.find(m => m.k === 'look');
ok(lm && lm.e === 'b:' + d2.paths[0].tiers[4].mods.find(m => m.k === 'look').e.slice(2) && E.bodyById(lm.e.slice(2)).name === 'Big Gun', 'and the tier-5 look change too');
const d3 = E.designFromCode(dc);
ok(E.bodyList().length === 2, 'importing again reuses the same bodies');
/* look choices */
ok(E.lookChoices().length === 2 + E.BASE_TOWER_ORDER.length && E.lookKeyOf('b:bd7') === 'cb_bd7' && E.lookKeyOf('oven') === 'oven', 'look choices list bodies then built-ins');
/* the cap */
for (let i = E.bodyList().length; i < E.BODY_MAX; i++) E.saveBody(E.prefabBody('pot'));
ok(E.bodyList().length === E.BODY_MAX && E.saveBody(E.prefabBody('pot')) === null, 'the library caps at ' + E.BODY_MAX);
/* colours that change with upgrades, paragon looks, aiming parts, scaling */
{
  const d = E.defaultCustom(); d.name = 'Tint Test'; d.body = E.bodyList()[0];
  d.paths[0].tiers[1].mods.push({ k:'tint', e:'#ff0000' });
  d.paragon = E.defaultParagon(E.cleanCustom(d)); d.paragon.look = 'b:' + E.bodyList()[1]; d.paragon.tint = '#00ff00';
  const cid2 = E.saveCustomTower(d);
  const T2 = E.TOWERS[cid2];
  ok(T2.paths[0].ups[1].tint === '#ff0000' && E.customTintAt(cid2, [2, 0, 0]) === '#ff0000' && E.customTintAt(cid2, [1, 0, 0]) === null, 'a tier can change the body colour');
  ok(T2.paragon.look === E.bodyLook(E.bodyList()[1]) && T2.paragon.tint === '#00ff00' && E.customLookAt(cid2, [5, 5, 5], true) === E.bodyLook(E.bodyList()[1]) && E.customTintAt(cid2, null, true) === '#00ff00', 'a paragon has its own look and colour');
  const ps = T2.paragon.make(10);
  ok(ps.look === E.bodyLook(E.bodyList()[1]) && ps.tint === '#00ff00', 'paragon stats carry them');
  ok(E.designTintAt(E.Profile().custom[cid2], [0, 0, 0], true) === '#00ff00' && E.designLookAt(E.Profile().custom[cid2], [0, 0, 0], true) === E.bodyLook(E.bodyList()[1]), 'and the design knows too');
  const b = E.cleanBody({ parts:[{ k:'barrel', aim:true, kick:4, x:10 }] });
  const fn = E.bodyAimAnim(b.parts[0]);
  const o = fn(1, { aim: Math.PI / 2, fireAnim: 0.22, _g3rot: 0 });
  ok(b.parts[0].aim && b.parts[0].kick === 4 && Math.abs(o.rz - Math.PI / 2) < 1e-6 && Math.abs(o.y + 4) < 1e-6 && Math.abs(o.x) < 1e-6, 'an aiming part swings to the aim around the centre and recoils along it');
  ok(E.bodyPartAnim(b.parts[0]) === null, 'its own frame has nothing left to do');
  const sp = E.bodyPartAnim(E.cleanBody({ parts:[{ k:'barrel', spin:2 }] }).parts[0])(0.25, {});
  ok(Math.abs(sp.rx - Math.PI) < 1e-6 && !sp.rz, 'a spinning barrel spins along its length');
  const kb = E.bodyPartAnim(E.cleanBody({ parts:[{ k:'box', kick:3 }] }).parts[0])(0, { fireAnim: 0.22 });
  ok(Math.abs(kb.x + 3) < 1e-6, 'a part that does not aim recoils along its own forward');
  /* the builder nests an aiming part's own frame inside its aim frame */
  { const calls = []; const B = new Proxy({}, { get: (o, k) => (...a) => { calls.push(k); return B; } }); E.bodyBuild(B, E.cleanBody({ base:{ k:'none' }, parts:[{ k:'barrel', aim:true, spin:1 }] }));
    const parts = calls.filter(c => c === 'part').length, ends = calls.filter(c => c === 'endPart').length;
    ok(parts === 2 && ends === 2 && calls.indexOf('part') < calls.indexOf('push'), 'an aiming, spinning barrel gets an aim frame around the centre and its own spin frame'); }
  const sc = E.scaleBody(E.cleanBody({ base:{ w:20, d:20, h:10 }, parts:[{ k:'box', x:10, w:10 }] }), 1.5);
  ok(sc.base.w === 30 && sc.base.h === 15 && sc.parts[0].x === 15 && sc.parts[0].w === 15, 'scale all');
  ok(E.BODY_PREFAB_ORDER.length === 12, '12 prefabs');
}
/* remixes of every built-in compile */
{
  let bad = 0, n = 0;
  for (const t of E.BASE_TOWER_ORDER){ if (E.TOWERS[t].hero) continue; const d = E.remixDesign(t); if (!d || !d.attacks.length || d.look !== t || d.attacks[0].dmg < 1) bad++; n++; }
  ok(bad === 0 && n > 20, n + ' built-in appliances remix into designs');
  const kd = E.remixDesign('knife');
  ok(kd.cost === 200 && kd.range === 140 && kd.attacks[0].style === 'throw' && kd.attacks[0].sprite === 'knife' && kd.paths[0].name === 'Edge' && kd.paths[0].tiers[0].name === 'Honed Edge' && kd.paths[0].tiers[0].cost === 140, 'the Knife Block remix keeps its price, range, knives and upgrade names');
}
/* a whole collection as one code */
{
  const code = E.collectionCode();
  ok(code.startsWith(E.COLLECTION_PREFIX), 'collection codes');
  const nD = Object.keys(P().custom).length, nB = E.bodyList().length, nO = E.objectList().length;
  const again = E.importCollection(code);
  ok(again.designs === 0 && again.bodies === 0 && again.objs === 0 && Object.keys(P().custom).length === nD && E.bodyList().length === nB, 'importing your own collection adds nothing twice');
  /* into an empty profile */
  P().custom = {}; P().bodies = {}; P().objects = {}; E.syncCustomTowers();
  const got = E.importCollection(code);
  ok(got.designs === nD && Object.keys(P().custom).length === nD && E.bodyList().length >= 2, 'into an empty profile it brings the designs and their bodies back (' + got.designs + ' designs, ' + got.bodies + ' bodies)');
}
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
