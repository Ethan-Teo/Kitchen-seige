'use strict';
/* =====================================================================
   Kitchen Siege — the Projectile Workshop (UI)
   Lives inside the tower builder: an Objects tab that lists the library,
   and an editor with a live flight preview, the object's settings, and
   its layers. An attack's "Projectile look" can open it straight away
   and come back with the new object chosen.
   ===================================================================== */
const OBJ_LAYER_FIELDS = [
  /* key, label, min, max, step */
  ['s', 'Size ×', 0.1, 3, 0.05], ['x', 'Offset →', -2, 2, 0.05], ['y', 'Offset ↓', -2, 2, 0.05], ['r', 'Turn °', -180, 180, 1],
  ['n', 'Points', 3, 12, 1], ['w', 'Outline width', 0, 4, 0.5], ['a', 'Opacity', 0.1, 1, 0.05], ['spin', 'Spin (turns/s)', -4, 4, 0.25], ['pulse', 'Pulse', 0, 1, 0.05],
];
const OBJ_POINTED = { star:1, poly:1, blade:1, spike:1, dots:1 };
/* a little canvas that shows an object flying a loop, with its trail */
function objectPreview(getObj, w, ht){
  w = w || 220; const h0 = ht || 150;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = h('canvas', { class:'ws-prev', width: String(w * dpr), height: String(h0 * dpr), role:'img', 'aria-label':'Object preview' });
  cv.style.width = w + 'px'; cv.style.height = h0 + 'px';
  const g = cv.getContext('2d');
  const S = { t: 0, parts: [], last: 0, p: { x: w / 2, y: h0 / 2, ang: 0, spin: 0, age: 0, trAcc: 0 } };
  const emit = (x, y, vx, vy, life, c, s, k) => { if (S.parts.length < 160) S.parts.push({ x, y, vx, vy, t:0, life, c, s, k }); };
  const frame = now => {
    if (!cv.isConnected){ return; }
    const dt = Math.min(0.05, (now - (S.last || now)) / 1000); S.last = now;
    S.t += dt;
    const o = getObj();
    const R = (o.size || 8) * 0.75, ax = w * 0.34, ay = h0 * 0.3;
    const a = S.t * 1.6, px = w / 2 + Math.cos(a) * ax, py = h0 / 2 + Math.sin(a * 2) * ay;
    S.p.ang = Math.atan2(py - S.p.y, px - S.p.x); S.p.x = px; S.p.y = py; S.p.age = S.t; S.p.spin += dt * 12;
    objectTrail(o, S.p, dt, emit);
    for (const q of S.parts){ q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    S.parts = S.parts.filter(q => q.t < q.life);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#d8b386'; g.fillRect(0, 0, w, h0);
    for (let y = 0; y < h0; y += 22){ g.fillStyle = (y / 22) % 2 ? 'rgba(80,45,10,0.06)' : 'rgba(255,240,220,0.08)'; g.fillRect(0, y, w, 22); }
    for (const q of S.parts) Art.drawPart(g, q);
    g.save(); g.translate(px, py); Art.drawObject(g, o, R, S.p.ang, S.p.spin, S.t); g.restore();
    /* the object again, big and still, so the layers can be seen */
    g.save(); g.translate(w - 34, h0 - 34); g.fillStyle = 'rgba(0,0,0,0.12)'; circle(g, 0, 0, 28); g.fill(); Art.drawObject(g, o, 18, 0, S.p.spin * 0.3, S.t); g.restore();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return cv;
}
/* a still thumbnail of an object */
function objectIcon(o, size){
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = h('canvas', { class:'ws-ico', width: String(size * dpr), height: String(size * dpr) });
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.translate(size / 2, size / 2);
  try { Art.drawObject(g, o, size * 0.22, -0.5, 0.4, 0.3); } catch (e) {}
  return cv;
}
function objectSummary(o){
  const bits = [o.layers.length + (o.layers.length === 1 ? ' layer' : ' layers')];
  if (o.trail !== 'none') bits.push(OBJ_TRAILS[o.trail].toLowerCase() + ' trail');
  if (o.glow) bits.push('glow');
  if (o.spin) bits.push('spins');
  if (o.pulse) bits.push('pulses');
  return bits.join(' · ');
}
/* the Objects tab: the library */
function drawObjectsTab(B, form, U){
  const { status, addBtn, tool, xBtn, sec } = U;
  const ids = objectList();
  const head = h('p', { class:'bnote wide' }, 'Attack objects are projectiles you draw yourself: layers of discs, rings, stars, blades and flames with their own colours, spin, glow and trail. Any custom attack can fire one (Attacks tab → Look and special moves → Projectile look). ' + ids.length + ' of ' + OBJ_MAX + ' slots used.');
  const cards = ids.map(id => {
    const o = objectById(id), uses = objectUses(id);
    return h('div', { class:'ws-card' },
      objectIcon(o, 56),
      h('div', { class:'ws-id' }, h('b', { text: o.name }), h('small', { text: objectSummary(o) + (uses ? ' · used by ' + uses + (uses === 1 ? ' attack' : ' attacks') : '') })),
      h('div', { class:'ws-acts' },
        tool('Edit', 'Edit this object', () => { B.ws = { id, o: cleanObject(o), back: null }; B.tab = 'objects'; U.redraw(); }),
        tool('Copy', 'Make a copy', () => { const c = cleanObject(o); c.name = copyName(c.name, 20) || 'Copy'; const nid = saveObject(c); status.textContent = nid ? 'Copied ' + o.name + '.' : 'No free object slots.'; U.redraw(); }),
        tool('Code', 'Show its share code', () => U.showCode(objectCode(o), o.name)),
        B.delObj === id ? tool('Confirm delete', 'Delete for good', () => { deleteObject(id); B.delObj = null; status.textContent = 'Deleted ' + o.name + (uses ? '. Attacks that fired it throw a plain orb now.' : '.'); U.redraw(); })
          : xBtn('Delete ' + o.name, () => { B.delObj = id; U.redraw(); })));
  });
  const prefabs = h('div', { class:'ws-prefabs' }, OBJ_PREFAB_ORDER.map(k => { const o = prefabObject(k); return h('button', { class:'ws-pre', title: 'Start from ' + o.name, onclick: () => { B.ws = { id: null, o, back: null }; U.redraw(); } }, objectIcon(o, 40), h('small', { text: o.name })); }));
  const acts = h('div', { class:'ws-top' },
    addBtn('New object', () => { if (ids.length >= OBJ_MAX){ status.textContent = 'No free object slots: delete one first.'; return; } B.ws = { id: null, o: cleanObject(defaultObject()), back: null }; U.redraw(); }),
    tool('Import code', 'Paste an object code (KSO1:…)', () => U.showImportObj()));
  form.append(head, acts, h('h4', { text:'Start from a ready-made object' }), prefabs, h('h4', { text:'Your objects' }), cards.length ? h('div', { class:'ws-grid' }, cards) : h('p', { class:'bnote', text:'No objects yet. Pick one above or make a new one.' }));
}
/* the editor */
function drawObjectEditor(B, form, U){
  const { status, field, tool, xBtn, addBtn } = U;
  const W = B.ws, o = W.o;
  let prev = null;
  const refresh = () => { /* the preview reads the object live; only the layer list needs redrawing on structure changes */ };
  const numF = (obj, key, lo, hi, step) => {
    const i = h('input', { type:'number', min: String(lo), max: String(hi), step: String(step || 1), inputmode:'decimal' });
    i.value = String(obj[key]);
    i.addEventListener('input', () => { const v = Number(i.value); if (i.value !== '' && isFinite(v)) obj[key] = Math.min(hi, Math.max(lo, v)); });
    i.addEventListener('change', () => { let v = Number(i.value); if (i.value === '' || !isFinite(v)) v = Number(obj[key]) || lo; v = Math.min(hi, Math.max(lo, v)); obj[key] = v; i.value = String(v); });
    return i;
  };
  const range = (obj, key, lo, hi, step) => {
    const i = h('input', { type:'range', min: String(lo), max: String(hi), step: String(step || 1) });
    i.value = String(obj[key]);
    i.addEventListener('input', () => { obj[key] = Number(i.value); });
    return i;
  };
  const col = (obj, key) => { const c = h('input', { type:'color' }); c.value = OBJ_COL(obj[key], '#ff7a59'); c.addEventListener('input', () => { obj[key] = c.value; }); return c; };
  const sel = (obj, key, opts, after) => { const s = h('select', {}, Object.entries(opts).map(([v, t]) => h('option', { value: v, text: t }))); s.value = String(obj[key]); s.addEventListener('change', () => { obj[key] = s.value; if (after) after(); }); return s; };
  const txt = (obj, key, max, ph) => { const i = h('input', { type:'text', maxlength: String(max), placeholder: ph }); i.value = obj[key] || ''; i.addEventListener('input', () => { obj[key] = i.value; }); return i; };
  prev = objectPreview(() => W.o, 300, 170);
  const general = h('div', { class:'bgrid' },
    field('Name', txt(o, 'name', 20, 'Object name')),
    field('Base size', numF(o, 'size', 3, 30, 1), 'How big it flies. Layers scale from this.'),
    field('Faces', sel(o, 'face', OBJ_FACE)),
    field('Spin (turns/s)', range(o, 'spin', -4, 4, 0.25)),
    field('Pulse', range(o, 'pulse', 0, 1, 0.05), 'Swells and shrinks.'),
    field('Wobble', range(o, 'wobble', 0, 1, 0.05)),
    field('Flicker', range(o, 'flicker', 0, 1, 0.05), 'Fades in and out like a flame.'),
    field('Glow', range(o, 'glow', 0, 3, 0.1)),
    field('Glow colour', col(o, 'glowC')),
    field('Trail', sel(o, 'trail', OBJ_TRAILS)),
    field('Trail colour', col(o, 'trailC')),
    field('Trail length ×', range(o, 'trailLen', 0.3, 3, 0.1)));
  const layersBox = h('div', { class:'ws-layers' });
  function drawLayers(){
    layersBox.innerHTML = '';
    o.layers.forEach((L, i) => {
      const kids = [field('Shape', sel(L, 'k', OBJ_KINDS, drawLayers)), field('Colour', col(L, 'c')), field('Outline', col(L, 'o'))];
      for (const [key, label, lo, hi, step] of OBJ_LAYER_FIELDS){
        if (key === 'n' && !OBJ_POINTED[L.k]) continue;
        kids.push(field(label, key === 'n' ? numF(L, key, lo, hi, step) : range(L, key, lo, hi, step)));
      }
      layersBox.append(h('section', { class:'bsec bcard ws-layer' },
        h('div', { class:'bcard-head' }, objectIcon({ layers:[L], size: 8, face:'still', spin:0, pulse:0, wobble:0, flicker:0, glow:0, glowC:'#000000', trail:'none', trailC:'#000000', trailLen:1 }, 28), h('b', { text: 'Layer ' + (i + 1) + ' · ' + OBJ_KINDS[L.k] }),
          i > 0 ? tool('↑', 'Draw earlier (underneath)', () => { [o.layers[i - 1], o.layers[i]] = [o.layers[i], o.layers[i - 1]]; drawLayers(); }) : null,
          i < o.layers.length - 1 ? tool('↓', 'Draw later (on top)', () => { [o.layers[i + 1], o.layers[i]] = [o.layers[i], o.layers[i + 1]]; drawLayers(); }) : null,
          o.layers.length < OBJ_LAYERS ? tool('Duplicate', 'Add a copy of this layer', () => { o.layers.splice(i + 1, 0, cleanLayer(L)); drawLayers(); }) : null,
          o.layers.length > 1 ? xBtn('Remove layer ' + (i + 1), () => { o.layers.splice(i, 1); drawLayers(); }) : null),
        h('div', { class:'bgrid' }, kids)));
    });
    if (o.layers.length < OBJ_LAYERS) layersBox.append(addBtn('Layer', () => { o.layers.push(defaultLayer('disc')); drawLayers(); }));
  }
  drawLayers();
  const save = andUse => {
    const id = saveObject(W.o, W.id);
    if (!id){ status.textContent = 'No free object slots: delete one first.'; Sfx.play('error'); return; }
    status.textContent = 'Saved ' + W.o.name + '.';
    Sfx.play('upgrade');
    const back = W.back;
    B.ws = null;
    if (back){ B.tab = back.tab; if (andUse && back.A){ back.A.obj = id; back.A.shape = ''; } U.changed(true); }
    else U.redraw();
  };
  const cancel = () => { const back = W.back; B.ws = null; if (back) B.tab = back.tab; U.redraw(); };
  const foot = h('div', { class:'ws-foot' },
    h('button', { class:'btn btn-small btn-primary', onclick: () => save(!!W.back) }, W.back ? 'Save and use it' : 'Save object'),
    W.back && W.id ? h('button', { class:'btn btn-small', onclick: () => save(false) }, 'Save only') : null,
    tool('Share code', 'Show this object’s code', () => U.showCode(objectCode(W.o), W.o.name || 'this object')),
    h('button', { class:'btn btn-small', onclick: cancel }, 'Cancel'));
  form.append(h('div', { class:'ws-edit' }, h('div', { class:'ws-prevbox' }, prev, h('small', { text:'The object in flight, and still (bottom right).' })),
    h('div', { class:'ws-fields' }, h('h4', { text: W.id ? 'Editing ' + (objectById(W.id) || {}).name : 'New object' }), general)),
    h('h4', { text:'Layers (drawn in order, first at the bottom)' }), layersBox, foot);
}
