// The gallery: codes and their kinds, cleaning entries, merging shelves, getting things into your library, sharing.
require('./sim_load.js');
const E = require('./.combined.js');
const fs = require('fs'), path = require('path');
E.Store.init();
let fails = 0;
function ok(c, m){ console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }
const P = () => E.Profile();
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'gallery', 'gallery.json'), 'utf8')).entries;
ok(seed.length >= 5 && seed.every(e => E.cleanEntry(e)), 'the repo’s gallery file has ' + seed.length + ' good entries');
ok(new Set(seed.map(e => e.id)).size === seed.length, 'its ids are unique');
for (const e of seed.filter(e => E.codeKind(e.code) === 'kitchen')) ok(E.kitchenProblems(E.kitchenFromCode(e.code)).length === 0, 'featured kitchen ' + e.name + ' is ready to play');
/* kinds */
ok(E.codeKind(seed.find(e => e.id === 'k-twin').code) === 'kitchen' && E.codeKind('KSA1:x') === 'tower' && E.codeKind('nope') === null, 'a code’s kind comes from its prefix');
/* cleaning */
ok(E.cleanEntry({ name:'x', code:'KSM1:broken' }) === null, 'a damaged code is refused');
const c = E.cleanEntry({ id:'<x>!', name:'<b>Big</b>', by:'', code: seed[0].code, blurb:'a'.repeat(400) });
ok(c && c.id === 'x' && c.name.indexOf('<') < 0 && c.by === 'Anonymous' && c.blurb.length <= 140, 'entries are cleaned');
/* merging */
const shared = [{ id:'s1', name:'Mine', by:'Me', code: E.kitchenCode(E.defaultKitchen()), at: 5, src:'shared' }, { id:'dup', name:'Copy', code: seed[0].code, src:'shared' }];
const all = E.mergeGallery(seed, shared);
ok(all.length === seed.length + 1 && all[0].src === 'featured' && all[all.length - 1].id === 's1', 'shelves merge, one entry per code, featured first');
/* getting things */
const kn = E.kitchenList().length;
const r = E.galleryGet(seed.find(e => e.kind === undefined && E.codeKind(e.code) === 'kitchen' || e.id === 'k-zigzag').code);
ok(r.added === 1 && E.kitchenList().length === kn + 1, 'Get adds a kitchen to your kitchens');
ok(E.galleryGet(seed.find(e => e.id === 'k-zigzag').code).have, 'getting it twice doesn’t duplicate it');
const tn = Object.keys(P().custom || {}).length;
const t = E.galleryGet(seed.find(e => e.id === 't-laser').code);
ok(t.added === 1 && Object.keys(P().custom).length === tn + 1 && E.X.TOWERS[t.id], 'Get adds an appliance design and it is buildable');
const bn = E.bodyList().length;
ok(E.galleryGet(seed.find(e => e.id === 'b-saucer').code).added === 1 && E.bodyList().length === bn + 1, 'Get adds a body');
let threw = false; try { E.galleryGet('hello'); } catch (e) { threw = true; }
ok(threw, 'a non-code is refused');
/* sharing */
const sh = E.shareables();
ok(sh.some(s => s.kind === 'kitchen') && sh.some(s => s.kind === 'tower') && sh.every(s => E.codeKind(s.code) === s.kind), 'your own things can be shared as codes');
const url = E.gallerySubmitUrl({ kind:'kitchen', name:'Zig', by:'Me', blurb:'', code: sh.find(s => s.kind === 'kitchen').code });
ok(url.startsWith('https://github.com/Ethan-Teo/Kitchen-seige/issues/new?') && url.length < 8000 && /KSM1/.test(decodeURIComponent(url)), 'Submit on GitHub opens a prefilled issue');
const big = E.gallerySubmitUrl({ kind:'tower', name:'Big', by:'Me', blurb:'', code: 'KSA1:' + 'A'.repeat(20000) });
ok(big.length < 8000, 'a code too long for a link is left out of it');
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
