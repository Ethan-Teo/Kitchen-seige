'use strict';
/* =====================================================================
   Kitchen Siege — the Body Workshop (UI)
   A Bodies tab in the tower builder: the library, prefabs to start from,
   and an editor with a live turning preview of the appliance (3D when
   the game is), the base, and the parts. The Basics tab's "Body" picker
   and an upgrade's "Look becomes" change can open it and come back with
   the new body chosen.
   ===================================================================== */
const BODY_EDIT_LOOK = 'cb__edit';
const BODY_DIM_LABEL = { w:'Width →', d:'Depth ↓', h:'Height', r:'Radius', r2:'Top radius / thickness', n:'Points / puffs' };
const BODY_DIM_RANGE = { w:[0.5, 60, 0.5], d:[0.5, 60, 0.5], h:[0.2, 60, 0.5], r:[0.3, 40, 0.25], r2:[0, 40, 0.25], n:[3, 16, 1] };
/* a canvas with the body standing in a kitchen, turning and firing now and then */
function bodyPreview(getBody, w, ht){
  w = w || 300; const h0 = ht || 190;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = h('canvas', { class:'ws-prev', width: String(w * dpr), height: String(h0 * dpr), role:'img', 'aria-label':'Body preview' });
  cv.style.width = w + 'px'; cv.style.height = h0 + 'px';
  const g = cv.getContext('2d');
  const S = { t: 0, last: 0, fire: 0, next: 1.2, rev: -1 };
  TOWERS._bodyprev = TOWERS._bodyprev || { name:'Preview', size:17, look: BODY_EDIT_LOOK, custom:true, cost:0, base:{ atk:{} }, paths:[] };
  const frame = now => {
    if (!cv.isConnected) return;
    const dt = Math.min(0.05, (now - (S.last || now)) / 1000); S.last = now;
    S.t += dt;
    const b = getBody();
    if (b._rev !== S.rev){ S.rev = b._rev; registerBody(BODY_EDIT_LOOK, b); TOWERS._bodyprev.size = b.size; }
    S.next -= dt; if (S.next <= 0){ S.next = 1.4 + Math.random(); S.fire = 0.22; }
    if (S.fire > 0) S.fire -= dt;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#d8b386'; g.fillRect(0, 0, w, h0);
    for (let y = 0; y < h0; y += 22){ g.fillStyle = (y / 22) % 2 ? 'rgba(80,45,10,0.06)' : 'rgba(255,240,220,0.08)'; g.fillRect(0, y, w, 22); }
    g.fillStyle = 'rgba(31,95,76,0.35)'; g.fillRect(0, h0 * 0.62, w, 26);
    const aim = -Math.PI / 2 + Math.sin(S.t * 0.6) * 1.1;
    const fake = { type:'_bodyprev', x: w / 2, y: h0 * 0.64, size: b.size, up:[0, 0, 0], paragon:false, degree:0, aim, aim2: aim, aimed:true, fireAnim: Math.max(0, S.fire), boost:{}, rank:0, id: 9001, level: b._rev || 0, s:{ look: BODY_EDIT_LOOK } };
    /* zoomed in so the parts can be seen: taller bodies a little less */
    const zoom = Math.max(1.2, Math.min(2.6, h0 * 0.75 / Math.max(40, bodyHeight(b) + b.size * 1.6)));
    g.save(); g.translate(fake.x, fake.y); g.scale(zoom, zoom); g.translate(-fake.x, -fake.y);
    try { Art.beginFrame(); Art.drawShadows(g, [fake], S.t); Art.drawTower(g, fake, S.t, {}); } catch (e) { g.fillStyle = '#5a1f22'; g.fillText('Preview error: ' + e.message, 8, 16); }
    g.restore();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return cv;
}
/* a still thumbnail: the body as an icon */
function bodyIcon(id, b, size){
  const look = id ? bodyLook(id) : BODY_EDIT_LOOK;
  if (!id) registerBody(look, b);
  TOWERS._bodyico = TOWERS._bodyico || { name:'Body', size:17, look, custom:true, cost:0, base:{ atk:{} }, paths:[] };
  TOWERS._bodyico.look = look; TOWERS._bodyico.size = b.size;
  const cvs = Art.towerIcon('_bodyico', size, [0, 0, 0], false, 'classic', '');
  const cv = h('canvas', { class:'ws-ico', width: String(cvs.width), height: String(cvs.height) });
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  cv.getContext('2d').drawImage(cvs, 0, 0);
  return cv;
}
function bodySummary(b){
  const bits = [b.parts.length + (b.parts.length === 1 ? ' part' : ' parts'), BODY_BASES[b.base.k].toLowerCase()];
  if (b.turns) bits.push('turns to aim');
  if (b.parts.some(P => P.spin)) bits.push('spins');
  if (b.parts.some(P => P.show === 'fire')) bits.push('lights up firing');
  return bits.join(' · ');
}
/* the Bodies tab: the library */
function drawBodiesTab(B, form, U){
  const { status, addBtn, tool, xBtn } = U;
  const ids = bodyList();
  const head = h('p', { class:'bnote wide' }, 'Bodies are appliances you model yourself: a base with up to ' + BODY_PARTS + ' parts (boxes, drums, cones, barrels, balls, rings, blades, lights, flames, steam), each with its own colour, material, spin and bob. A design wears one from the Basics tab, and an upgrade can swap it for another with the "Look becomes" change, so your appliance can change as it grows. ' + ids.length + ' of ' + BODY_MAX + ' slots used.');
  const cards = ids.map(id => {
    const b = bodyById(id), uses = bodyUses(id);
    return h('div', { class:'ws-card' },
      bodyIcon(id, b, 56),
      h('div', { class:'ws-id' }, h('b', { text: b.name }), h('small', { text: bodySummary(b) + (uses ? ' · used by ' + uses + (uses === 1 ? ' design' : ' designs') : '') })),
      h('div', { class:'ws-acts' },
        tool('Edit', 'Edit this body', () => { B.wb = { id, b: Object.assign(cleanBody(b), { _rev: Date.now() }), back: null }; B.tab = 'bodies'; U.redraw(); }),
        tool('Copy', 'Make a copy', () => { const c = cleanBody(b); c.name = copyName(c.name, 20) || 'Copy'; const nid = saveBody(c); status.textContent = nid ? 'Copied ' + b.name + '.' : 'No free body slots.'; U.redraw(); }),
        tool('Code', 'Show its share code', () => U.showCode(bodyCode(b), b.name)),
        B.delBody === id ? tool('Confirm delete', 'Delete for good', () => { deleteBody(id); B.delBody = null; status.textContent = 'Deleted ' + b.name + (uses ? '. Designs that wore it use their built-in look now.' : '.'); U.changed(true); U.redraw(); })
          : xBtn('Delete ' + b.name, () => { B.delBody = id; U.redraw(); })));
  });
  const prefabs = h('div', { class:'ws-prefabs' }, BODY_PREFAB_ORDER.map(k => { const b = prefabBody(k); b._rev = Date.now() + Math.random(); return h('button', { class:'ws-pre', title: 'Start from ' + b.name, onclick: () => { B.wb = { id: null, b, back: null }; U.redraw(); } }, bodyIcon(null, b, 40), h('small', { text: b.name })); }));
  const acts = h('div', { class:'ws-top' },
    addBtn('New body', () => { if (ids.length >= BODY_MAX){ status.textContent = 'No free body slots: delete one first.'; return; } B.wb = { id: null, b: Object.assign(cleanBody(defaultBody()), { _rev: Date.now() }), back: null }; U.redraw(); }),
    tool('Import code', 'Paste a body code (KSB1:…)', () => U.showImportObj()));
  form.append(head, acts, h('h4', { text:'Start from a ready-made body' }), prefabs, h('h4', { text:'Your bodies' }), cards.length ? h('div', { class:'ws-grid' }, cards) : h('p', { class:'bnote', text:'No bodies yet. Pick one above or make a new one.' }));
}
/* a top-down map of the body: the base outline and a handle for every part, draggable */
function bodyMap(b, onMove, onSelect){
  const W = 320, H = 200, K = 2.2, dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = h('canvas', { class:'ws-prev ws-map', width: String(W * dpr), height: String(H * dpr), role:'img', 'aria-label':'Part placement map' });
  cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.style.touchAction = 'none';
  const g = cv.getContext('2d');
  let sel = -1, drag = null;
  const toMap = (x, y) => [W / 2 + x * K, H / 2 + y * K];
  const partR = P => Math.max(3, Math.min(14, (P.k === 'box' || P.k === 'rbox' || P.k === 'fin' ? Math.max(P.w, P.d) / 2 : P.k === 'barrel' ? P.h / 2 : P.r) * K * 0.5));
  function draw(){
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#e9dcc5'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 1;
    for (let x = W / 2 % (10 * K); x < W; x += 10 * K){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = H / 2 % (10 * K); y < H; y += 10 * K){ g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    /* forward arrow */
    g.strokeStyle = 'rgba(29,43,51,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(W / 2 + 30, H / 2); g.lineTo(W / 2 + 24, H / 2 - 5); g.moveTo(W / 2 + 30, H / 2); g.lineTo(W / 2 + 24, H / 2 + 5); g.stroke();
    const base = b.base;
    if (base.k !== 'none'){
      g.fillStyle = 'rgba(90,166,214,0.25)'; g.strokeStyle = '#5aa6d6'; g.lineWidth = 1.5;
      g.beginPath();
      if (base.k === 'cyl' || base.k === 'dome') g.arc(W / 2, H / 2, base.w / 2 * K, 0, Math.PI * 2);
      else g.rect(W / 2 - base.w / 2 * K, H / 2 - base.d / 2 * K, base.w * K, base.d * K);
      g.fill(); g.stroke();
    }
    b.parts.forEach((P, i) => {
      const [x, y] = toMap(P.x, P.y), r = partR(P);
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
      g.fillStyle = i === sel ? 'rgba(255,107,74,0.85)' : (P.c || '#c9d2d6'); g.fill();
      g.lineWidth = i === sel ? 2.5 : 1.2; g.strokeStyle = i === sel ? '#1d2b33' : 'rgba(0,0,0,0.45)'; g.stroke();
      g.fillStyle = i === sel ? '#fff' : '#1d2b33'; g.font = '700 10px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), x, y);
    });
  }
  const at = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * (W / r.width), (ev.clientY - r.top) * (H / r.height)]; };
  cv.addEventListener('pointerdown', ev => {
    const [mx, my] = at(ev);
    let best = -1, bd = 1e9;
    b.parts.forEach((P, i) => { const [x, y] = toMap(P.x, P.y); const d = Math.hypot(mx - x, my - y); if (d < partR(P) + 6 && d < bd){ bd = d; best = i; } });
    sel = best;
    if (onSelect) onSelect(sel);
    if (sel >= 0){ drag = { i: sel, ox: b.parts[sel].x, oy: b.parts[sel].y, mx, my }; cv.setPointerCapture(ev.pointerId); }
    draw();
  });
  cv.addEventListener('pointermove', ev => {
    if (!drag) return;
    const [mx, my] = at(ev);
    const P = b.parts[drag.i];
    P.x = BODY_NUM(drag.ox + (mx - drag.mx) / K, -40, 40, P.x, 0.5); P.y = BODY_NUM(drag.oy + (my - drag.my) / K, -40, 40, P.y, 0.5);
    draw();
    if (onMove) onMove(drag.i, true);
  });
  const end = () => { if (drag){ drag = null; if (onMove) onMove(sel, false); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  draw();
  cv.redraw = draw;
  return cv;
}
/* the editor */
function drawBodyEditor(B, form, U){
  const { status, field, tool, xBtn, addBtn } = U;
  const W = B.wb, b = W.b;
  if (B.wbFor !== W){ B.wbFor = W; B.wbSel = -1; }
  const touch = () => { b._rev = Date.now() + Math.random(); if (form._bodyMap) form._bodyMap.redraw(); };
  const numF = (obj, key, lo, hi, step) => {
    const i = h('input', { type:'number', min: String(lo), max: String(hi), step: String(step || 1), inputmode:'decimal' });
    i.value = String(obj[key]);
    i.addEventListener('input', () => { const v = Number(i.value); if (i.value !== '' && isFinite(v)){ obj[key] = Math.min(hi, Math.max(lo, v)); touch(); } });
    i.addEventListener('change', () => { let v = Number(i.value); if (i.value === '' || !isFinite(v)) v = Number(obj[key]) || lo; v = Math.min(hi, Math.max(lo, v)); obj[key] = v; i.value = String(v); touch(); });
    return i;
  };
  const range = (obj, key, lo, hi, step) => { const i = h('input', { type:'range', min: String(lo), max: String(hi), step: String(step || 1) }); i.value = String(obj[key]); i.addEventListener('input', () => { obj[key] = Number(i.value); touch(); }); return i; };
  const col = (obj, key, allowBody) => {
    const wrap = h('div', { class:'ws-inline' });
    const c = h('input', { type:'color' }); c.value = obj[key] || '#c9d2d6';
    c.addEventListener('input', () => { obj[key] = c.value; touch(); if (allowBody){ own.checked = true; } });
    wrap.append(c);
    let own = null;
    if (allowBody){
      own = h('input', { type:'checkbox' }); own.checked = !!obj[key];
      own.addEventListener('change', () => { obj[key] = own.checked ? c.value : ''; touch(); });
      wrap.append(h('label', { class:'bchk' }, own, h('span', { text:'Own colour (else the appliance’s body colour)' })));
    }
    return wrap;
  };
  const sel = (obj, key, opts, after) => { const s = h('select', {}, Object.entries(opts).map(([v, t]) => h('option', { value: v, text: t }))); s.value = String(obj[key]); s.addEventListener('change', () => { obj[key] = s.value; touch(); if (after) after(); }); return s; };
  const txt = (obj, key, max, ph) => { const i = h('input', { type:'text', maxlength: String(max), placeholder: ph }); i.value = obj[key] || ''; i.addEventListener('input', () => { obj[key] = i.value; }); return i; };
  const tick = (obj, key, label) => { const c = h('input', { type:'checkbox' }); c.checked = !!obj[key]; c.addEventListener('change', () => { obj[key] = c.checked; touch(); }); return h('label', { class:'bchk' }, c, h('span', { text: label })); };
  const prev = bodyPreview(() => W.b, 320, 200);
  const general = h('div', { class:'bgrid' },
    field('Name', txt(b, 'name', 20, 'Body name')),
    field('Whole body', h('div', { class:'ws-inline' }, tool('Smaller', 'Scale everything down 10%', () => { scaleBody(b, 0.9); touch(); drawBase(); drawParts(); }), tool('Bigger', 'Scale everything up 10%', () => { scaleBody(b, 1.1); touch(); drawBase(); drawParts(); })), 'Scales the base and every part together.'),
    field('Footprint', numF(b, 'size', 12, 26, 1), 'How much room it takes on the counter. A Knife Block is 17.'),
    h('div', { class:'bchecks' }, tick(b, 'turns', 'Turns to face what it attacks'), tick(b, 'feet', 'Rubber feet under the base')));
  const baseBox = h('div', { class:'bgrid' });
  function drawBase(){
    baseBox.innerHTML = '';
    const Bs = b.base;
    baseBox.append(field('Base', sel(Bs, 'k', BODY_BASES, drawBase)));
    if (Bs.k !== 'none'){
      baseBox.append(field(Bs.k === 'cyl' || Bs.k === 'dome' ? 'Diameter' : 'Width →', range(Bs, 'w', 6, 60, 0.5)));
      if (Bs.k === 'rbox' || Bs.k === 'box') baseBox.append(field('Depth ↓', range(Bs, 'd', 6, 60, 0.5)));
      baseBox.append(field('Height', range(Bs, 'h', 2, 40, 0.5)));
      if (Bs.k === 'rbox') baseBox.append(field('Corner radius', range(Bs, 'r', 0.5, 30, 0.5)));
      baseBox.append(field('Material', sel(Bs, 'mat', BODY_MATS)), field('Colour', col(Bs, 'c', true), 'Leave it on the body colour so skins and your design’s own colour show.'));
    }
  }
  drawBase();
  const partsBox = h('div', { class:'ws-layers' });
  function drawParts(){
    partsBox.innerHTML = '';
    b.parts.forEach((P, i) => {
      const kids = [field('Part', sel(P, 'k', BODY_KINDS, drawParts)), field('Material', sel(P, 'mat', BODY_MATS)), field('Colour', col(P, 'c', true), null, true)];
      kids.push(field('Place →', range(P, 'x', -40, 40, 0.5), 'Forward is to the right.'), field('Place ↓', range(P, 'y', -40, 40, 0.5)), field('Place ↑ (height)', range(P, 'z', 0, 60, 0.5)));
      for (const k of BODY_DIMS[P.k]){ const [lo, hi, st] = BODY_DIM_RANGE[k]; kids.push(field(BODY_DIM_LABEL[k], k === 'n' ? numF(P, k, lo, hi, st) : range(P, k, lo, hi, st))); }
      kids.push(field('Tilt °', range(P, 'tilt', -90, 90, 5), 'Leans it forward or back.'), field('Turn °', range(P, 'turn', -180, 180, 5)),
        field('Spin (turns/s)', range(P, 'spin', -4, 4, 0.25)), field('Bob', range(P, 'bob', 0, 10, 0.5), 'Floats up and down.'),
        field('Glow', range(P, 'glow', 0, 1, 0.05)), field('Shows', sel(P, 'show', BODY_SHOW)),
        field('Recoil', range(P, 'kick', 0, 10, 0.5), 'Jumps back when it fires.'),
        h('div', { class:'bchecks' }, tick(P, 'aim', 'Turns to aim on its own (for a turret on a body that stays still)')));
      partsBox.append(h('section', { class:'bsec bcard ws-layer' + (i === B.wbSel ? ' ws-hl' : ''), 'data-part': String(i) },
        h('div', { class:'bcard-head' }, h('b', { text: 'Part ' + (i + 1) + ' · ' + BODY_KINDS[P.k].split(' (')[0] }),
          i > 0 ? tool('↑', 'Move up the list', () => { [b.parts[i - 1], b.parts[i]] = [b.parts[i], b.parts[i - 1]]; drawParts(); }) : null,
          i < b.parts.length - 1 ? tool('↓', 'Move down the list', () => { [b.parts[i + 1], b.parts[i]] = [b.parts[i], b.parts[i + 1]]; drawParts(); }) : null,
          b.parts.length < BODY_PARTS ? tool('Duplicate', 'Add a copy of this part', () => { b.parts.splice(i + 1, 0, cleanBodyPart(P)); touch(); drawParts(); }) : null,
          b.parts.length < BODY_PARTS ? tool('Mirror', 'Add a copy on the other side', () => { const c = cleanBodyPart(P); c.y = -c.y; c.turn = -c.turn; b.parts.splice(i + 1, 0, c); touch(); drawParts(); }) : null,
          xBtn('Remove part ' + (i + 1), () => { b.parts.splice(i, 1); touch(); drawParts(); })),
        h('div', { class:'bgrid' }, kids)));
    });
    if (b.parts.length < BODY_PARTS) partsBox.append(addBtn('Part', () => { b.parts.push(defaultBodyPart('box')); touch(); drawParts(); }));
  }
  drawParts();
  const save = andUse => {
    const id = saveBody(W.b, W.id);
    if (!id){ status.textContent = 'No free body slots: delete one first.'; Sfx.play('error'); return; }
    status.textContent = 'Saved ' + W.b.name + '.';
    Sfx.play('upgrade');
    const back = W.back;
    B.wb = null;
    if (back){ B.tab = back.tab; if (andUse){ if (back.d) back.d.body = id; if (back.m){ if (back.m.k === 'look') back.m.e = 'b:' + id; else back.m.look = 'b:' + id; } } U.changed(true); }
    else U.redraw();
  };
  const cancel = () => { const back = W.back; B.wb = null; if (back) B.tab = back.tab; U.redraw(); };
  const foot = h('div', { class:'ws-foot' },
    h('button', { class:'btn btn-small btn-primary', onclick: () => save(!!W.back) }, W.back ? 'Save and use it' : 'Save body'),
    W.back && W.id ? h('button', { class:'btn btn-small', onclick: () => save(false) }, 'Save only') : null,
    tool('Share code', 'Show this body’s code', () => U.showCode(bodyCode(W.b), W.b.name || 'this body')),
    h('button', { class:'btn btn-small', onclick: cancel }, 'Cancel'));
  const map = bodyMap(b, (i, moving) => { b._rev = Date.now() + Math.random(); if (!moving) drawParts(); }, sel => { B.wbSel = sel; partsBox.querySelectorAll('.ws-hl').forEach(x => x.classList.remove('ws-hl')); const el = partsBox.querySelector('[data-part="' + sel + '"]'); if (el) el.classList.add('ws-hl'); });
  form._bodyMap = map;
  form.append(h('div', { class:'ws-edit' }, h('div', { class:'ws-prevbox' }, prev, h('small', { text:'Turning to aim, and firing now and then. Units are kitchen pixels; forward is to the right.' }), map, h('small', { text:'From above: drag a part to move it. Forward is to the right.' })),
    h('div', { class:'ws-fields' }, h('h4', { text: W.id ? 'Editing ' + (bodyById(W.id) || {}).name : 'New body' }), general, h('h4', { text:'Base' }), baseBox)),
    h('h4', { text:'Parts' }), partsBox, foot);
}
