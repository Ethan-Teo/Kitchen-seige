'use strict';
/* =====================================================================
   Kitchen Siege — the Kitchen Editor (UI)
   A wide modal with the kitchen drawn as it will play, and three tools:
     Trails  click to add a point (it goes where it lengthens the trail
             least), drag points to move them, right-click to remove one;
             up to three trails; the ends run off the kitchen's edge by
             themselves
     Water   drag to pour a sink, spill, puddle or meltwater; drag one to
             move it; right-click to remove it
     Props   click to place the chosen prop, drag to move, right-click to
             remove; solid props block building
   Undo and redo (Ctrl+Z, Ctrl+Y), a 10 px snap, a name, a floor, a note,
   live checks, Save, Play, share codes and starting from a built-in
   kitchen. The map grid gets a "Your kitchens" section with these.
   ===================================================================== */
const KED_ID = '_kedit';
const KED_TRAIL_COL = ['#ff6b4a', '#2a9d8f', '#8b5cf6'];
function openKitchenEditor(id){
  UI.ked = { id: id || null, k: JSON.parse(JSON.stringify(id && kitchenById(id) ? kitchenById(id) : defaultKitchen())), tool:'trail', trail:0, sel:null, snap:true, water:'sink', prop:'board', undo:[], redo:[], dirty:false };
  drawKitchenEditor();
}
function kedPreview(){ return cleanKitchen(UI.ked.k); }
function drawKitchenEditor(){
  const E = UI.ked, k = E.k;
  const cw = Math.min(900, Math.max(320, (window.innerWidth || 1000) - 120)), ch = Math.round(cw * H / W);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = h('canvas', { class:'ked-canvas', width: String(Math.round(cw * dpr)), height: String(Math.round(ch * dpr)), 'aria-label':'Kitchen' });
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const g = cv.getContext('2d');
  const S = cw / W;
  let bg = null, bgDue = 0, bgTimer = null, drag = null, hoverPt = null;
  const status = h('span', { class:'ked-status', 'aria-live':'polite' });
  const problems = h('ul', { class:'ked-problems' });
  /* ---- the picture: the kitchen as it will play, then the editing marks on top ---- */
  function renderBg(){
    MAPS[KED_ID] = Object.assign({ level:'Custom', custom:true }, kedPreview());
    try { bg = MapArt.render(KED_ID, S * dpr); } catch (e) { bg = null; status.textContent = 'Could not draw it: ' + e.message; }
    draw();
  }
  function scheduleBg(now){ clearTimeout(bgTimer); if (now) renderBg(); else bgTimer = setTimeout(renderBg, 140); }
  const toPx = (x, y) => [x * S, y * S];
  function draw(){
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cw, ch);
    if (bg) g.drawImage(bg, 0, 0, cw, ch); else { g.fillStyle = '#d8b386'; g.fillRect(0, 0, cw, ch); }
    const P = kedPreview();
    /* trails: the snapped trail as it will play (dashed where it leaves the kitchen), and the points */
    k.paths.forEach((pts, i) => {
      const on = i === E.trail && E.tool === 'trail', col = KED_TRAIL_COL[i];
      const snapped = P.paths[i] || pts;
      g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
      g.strokeStyle = col; g.globalAlpha = on ? 0.95 : 0.5; g.lineWidth = on ? 3 : 2; g.setLineDash(on ? [] : [6, 6]);
      g.beginPath(); snapped.forEach(([x, y], j) => { const [px, py] = toPx(x, y); if (j) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke();
      g.restore();
      if (E.tool !== 'trail') return;
      pts.forEach(([x, y], j) => {
        const px = clamp(x * S, 6, cw - 6), py = clamp(y * S, 6, ch - 6);
        g.beginPath(); g.arc(px, py, on ? 6.5 : 4.5, 0, TAU);
        g.fillStyle = hoverPt && hoverPt.i === i && hoverPt.j === j ? '#ffffff' : col; g.fill();
        g.lineWidth = 1.5; g.strokeStyle = '#1d2b33'; g.stroke();
        if (on && (j === 0 || j === pts.length - 1)){ g.fillStyle = '#1d2b33'; g.font = '700 10px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(j === 0 ? 'IN' : 'OUT', px, py - 13); }
      });
    });
    /* the selected pool or prop */
    if (E.sel && (E.sel.kind === 'water' || E.sel.kind === 'deco')){
      const o = E.sel.kind === 'water' ? k.water[E.sel.i] : k.deco[E.sel.i];
      if (o){
        g.save(); g.setLineDash([5, 4]); g.lineWidth = 2; g.strokeStyle = '#ffffff';
        if (o.w != null && o.r == null || o.style === 'sink'){ g.strokeRect(o.x * S - 3, o.y * S - 3, o.w * S + 6, o.h * S + 6); }
        else if (o.rx){ g.beginPath(); g.ellipse(o.x * S, o.y * S, o.rx * S + 3, o.ry * S + 3, 0, 0, TAU); g.stroke(); }
        else { g.beginPath(); g.arc(o.x * S, o.y * S, (o.r || 20) * S + 3, 0, TAU); g.stroke(); }
        g.restore();
      }
    }
    if (drag && drag.k === 'pour'){ g.save(); g.setLineDash([4, 4]); g.strokeStyle = '#1f6fa8'; g.lineWidth = 2; const x0 = Math.min(drag.x0, drag.x1) * S, y0 = Math.min(drag.y0, drag.y1) * S, w = Math.abs(drag.x1 - drag.x0) * S, hh = Math.abs(drag.y1 - drag.y0) * S; if (E.water === 'sink') g.strokeRect(x0, y0, w, hh); else { g.beginPath(); g.ellipse(x0 + w / 2, y0 + hh / 2, Math.max(1, w / 2), Math.max(1, hh / 2), 0, 0, TAU); g.stroke(); } g.restore(); }
  }
  /* ---- editing ---- */
  const snap = v => E.snap ? Math.round(v / 10) * 10 : Math.round(v);
  const at = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * W, (ev.clientY - r.top) / r.height * H]; };
  function remember(){ E.undo.push(JSON.stringify(k)); if (E.undo.length > 60) E.undo.shift(); E.redo = []; E.dirty = true; }
  function changed(now){ refreshChecks(); scheduleBg(now); }
  function restore(json){ const o = JSON.parse(json); for (const key of Object.keys(k)) delete k[key]; Object.assign(k, o); E.sel = null; E.trail = Math.min(E.trail, k.paths.length - 1); changed(true); drawOptions(); }
  function undo(){ if (!E.undo.length) return; E.redo.push(JSON.stringify(k)); restore(E.undo.pop()); status.textContent = 'Undone.'; }
  function redo(){ if (!E.redo.length) return; E.undo.push(JSON.stringify(k)); restore(E.redo.pop()); status.textContent = 'Redone.'; }
  function pointAt(x, y){
    let best = null, bd = 14 / S;
    k.paths.forEach((pts, i) => pts.forEach(([px, py], j) => { const d = Math.hypot(clamp(px, 6 / S, W - 6 / S) - x, clamp(py, 6 / S, H - 6 / S) - y); if (d < bd || (d === bd && i === E.trail)){ bd = d; best = { i, j }; } }));
    return best;
  }
  function waterAt(x, y){ for (let i = k.water.length - 1; i >= 0; i--){ const w = k.water[i]; if (w.style === 'sink' ? (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) : (((x - w.x) / w.rx) ** 2 + ((y - w.y) / w.ry) ** 2 <= 1)) return i; } return -1; }
  function decoAt(x, y){ for (let i = k.deco.length - 1; i >= 0; i--){ const d = k.deco[i]; if (d.r ? Math.hypot(d.x - x, d.y - y) <= d.r + 4 : (x >= d.x - 4 && x <= d.x + d.w + 4 && y >= d.y - 4 && y <= d.y + d.h + 4)) return i; } return -1; }
  /* a new point goes into the segment it lengthens least */
  function insertPoint(pts, x, y){
    let best = pts.length, cost = Infinity;
    for (let i = 1; i < pts.length; i++){ const a = pts[i - 1], b = pts[i]; const c = Math.hypot(a[0] - x, a[1] - y) + Math.hypot(b[0] - x, b[1] - y) - Math.hypot(a[0] - b[0], a[1] - b[1]); if (c < cost){ cost = c; best = i; } }
    pts.splice(best, 0, [x, y]);
    return best;
  }
  cv.addEventListener('contextmenu', ev => ev.preventDefault());
  cv.addEventListener('pointerdown', ev => {
    const [x, y] = at(ev), right = ev.button === 2;
    cv.setPointerCapture(ev.pointerId);
    if (E.tool === 'trail'){
      const p = pointAt(x, y);
      if (p && right){ if (k.paths[p.i].length > 2){ remember(); k.paths[p.i].splice(p.j, 1); E.trail = p.i; status.textContent = 'Point removed.'; changed(); draw(); } else status.textContent = 'A trail needs at least two points.'; return; }
      if (p){ remember(); E.trail = p.i; drag = { k:'pt', i: p.i, j: p.j }; drawOptions(); return; }
      if (right) return;
      const pts = k.paths[E.trail];
      if (pts.length >= KM_POINTS){ status.textContent = 'That trail has as many points as it can take.'; return; }
      remember();
      const j = insertPoint(pts, snap(x), snap(y));
      drag = { k:'pt', i: E.trail, j };
      changed(); draw();
    } else if (E.tool === 'water'){
      const i = waterAt(x, y);
      if (i >= 0 && right){ remember(); k.water.splice(i, 1); E.sel = null; changed(); return; }
      if (i >= 0){ remember(); E.sel = { kind:'water', i }; drag = { k:'move', o: k.water[i], ox: k.water[i].x, oy: k.water[i].y, x0: x, y0: y }; draw(); return; }
      if (right) return;
      if (k.water.length >= KM_WATER_MAX){ status.textContent = 'A kitchen can hold ' + KM_WATER_MAX + ' pools of water.'; return; }
      drag = { k:'pour', x0: snap(x), y0: snap(y), x1: snap(x), y1: snap(y) };
    } else {
      const i = decoAt(x, y);
      if (i >= 0 && right){ remember(); k.deco.splice(i, 1); E.sel = null; changed(); drawOptions(); return; }
      if (i >= 0){ remember(); E.sel = { kind:'deco', i }; drag = { k:'move', o: k.deco[i], ox: k.deco[i].x, oy: k.deco[i].y, x0: x, y0: y }; drawOptions(); draw(); return; }
      if (right) return;
      if (k.deco.length >= KM_DECO_MAX){ status.textContent = 'A kitchen can hold ' + KM_DECO_MAX + ' props.'; return; }
      remember();
      const D = KM_DECO[E.prop], d = { k: E.prop };
      if (D.r){ d.x = snap(x); d.y = snap(y); d.r = D.r; } else { d.x = snap(x - D.w / 2); d.y = snap(y - D.h / 2); d.w = D.w; d.h = D.h; }
      if (D.solid) d.solid = true;
      k.deco.push(d); E.sel = { kind:'deco', i: k.deco.length - 1 };
      drag = { k:'move', o: d, ox: d.x, oy: d.y, x0: x, y0: y };
      changed(); drawOptions();
    }
  });
  cv.addEventListener('pointermove', ev => {
    const [x, y] = at(ev);
    if (!drag){ if (E.tool === 'trail'){ const p = pointAt(x, y); const key = p ? p.i + ':' + p.j : ''; if (key !== (hoverPt ? hoverPt.i + ':' + hoverPt.j : '')){ hoverPt = p; draw(); } cv.style.cursor = p ? 'grab' : 'crosshair'; } return; }
    if (drag.k === 'pt'){ k.paths[drag.i][drag.j] = [snap(clamp(x, -60, W + 60)), snap(clamp(y, -60, H + 60))]; scheduleBg(); draw(); }
    else if (drag.k === 'move'){ drag.o.x = snap(drag.ox + x - drag.x0); drag.o.y = snap(drag.oy + y - drag.y0); scheduleBg(); draw(); }
    else if (drag.k === 'pour'){ drag.x1 = snap(x); drag.y1 = snap(y); draw(); }
  });
  const end = () => {
    if (!drag) return;
    if (drag.k === 'pour'){
      const x0 = Math.min(drag.x0, drag.x1), y0 = Math.min(drag.y0, drag.y1), w = Math.abs(drag.x1 - drag.x0), hh = Math.abs(drag.y1 - drag.y0);
      if (w >= 40 && hh >= 40){
        remember();
        k.water.push(E.water === 'sink' ? { style:'sink', x: x0, y: y0, w, h: hh, r: 16, rim: 10 } : { style: E.water, x: x0 + w / 2, y: y0 + hh / 2, rx: w / 2, ry: hh / 2 });
        E.sel = { kind:'water', i: k.water.length - 1 };
        status.textContent = KM_WATER[E.water] + ' poured. Boats and the Gravy Boat can go on it.';
      } else status.textContent = 'Drag a bigger shape to pour water.';
    }
    drag = null; changed(true); refreshChecks();
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  /* ---- the tool bar and its options ---- */
  const toolSeg = h('div', { class:'seg', role:'group', 'aria-label':'Tool' });
  const options = h('div', { class:'ked-opts' });
  function drawTools(){
    toolSeg.innerHTML = '';
    for (const [id, name] of [['trail', 'Trails'], ['water', 'Water'], ['deco', 'Props']]) toolSeg.append(h('button', { 'aria-pressed': String(E.tool === id), onclick: () => { E.tool = id; E.sel = null; drawTools(); drawOptions(); draw(); } }, name));
  }
  const btn = (label, fn, cls, title) => h('button', { class:'btn btn-small' + (cls ? ' ' + cls : ''), title: title || '', onclick: fn }, label);
  function drawOptions(){
    options.innerHTML = '';
    if (E.tool === 'trail'){
      const seg = h('div', { class:'seg', role:'group', 'aria-label':'Trail' }, k.paths.map((p, i) => h('button', { 'aria-pressed': String(E.trail === i), style: { borderColor: KED_TRAIL_COL[i] }, onclick: () => { E.trail = i; drawOptions(); draw(); } }, 'Trail ' + (i + 1))));
      options.append(seg,
        k.paths.length < KM_TRAILS ? btn('+ New trail', () => { remember(); const y = 120 + k.paths.length * 180; k.paths.push([[-40, y], [W / 2, y], [W + 40, y]]); E.trail = k.paths.length - 1; changed(true); drawOptions(); }) : null,
        btn('Reverse', () => { remember(); k.paths[E.trail].reverse(); changed(true); status.textContent = 'Trail ' + (E.trail + 1) + ' now runs the other way.'; }, '', 'Swap its entrance and exit'),
        k.paths.length > 1 ? btn('Delete trail', () => { remember(); k.paths.splice(E.trail, 1); E.trail = 0; changed(true); drawOptions(); }, 'sell') : null,
        h('small', { class:'ked-hint', text:'Click to add a point, drag a point to move it, right-click a point to remove it. The IN and OUT ends run off the edge by themselves.' }));
    } else if (E.tool === 'water'){
      const sel = h('select', { 'aria-label':'Water' }, Object.entries(KM_WATER).map(([v, t]) => h('option', { value: v, text: t })));
      sel.value = E.water; sel.addEventListener('change', () => { E.water = sel.value; });
      options.append(sel, h('small', { class:'ked-hint', text:'Drag on the kitchen to pour water. Drag a pool to move it, right-click to remove it. Up to ' + KM_WATER_MAX + '.' }));
    } else {
      const pal = h('div', { class:'ked-pal' }, Object.keys(KM_DECO).map(id => h('button', { class:'ked-prop', 'aria-pressed': String(E.prop === id), title: KM_DECO[id].solid ? 'Blocks building' : 'Flat on the floor', onclick: () => { E.prop = id; drawOptions(); } }, KM_DECO_NAMES[id] + (KM_DECO[id].solid ? '' : ' ·'))));
      options.append(pal);
      const d = E.sel && E.sel.kind === 'deco' ? k.deco[E.sel.i] : null;
      if (d){
        const D = KM_DECO[d.k], base = D.r || D.w, cur = d.r || d.w;
        const sz = h('input', { type:'range', min:'50', max:'200', step:'5', 'aria-label':'Size' }); sz.value = String(Math.round(cur / base * 100));
        sz.addEventListener('pointerdown', () => remember());
        sz.addEventListener('input', () => { const m = +sz.value / 100; if (D.r) d.r = Math.round(D.r * m); else { d.w = Math.round(D.w * m); d.h = Math.round(D.h * m); } scheduleBg(); draw(); });
        options.append(h('label', { class:'ked-size' }, h('span', { text: KM_DECO_NAMES[d.k] + ' size' }), sz), btn('Remove', () => { remember(); k.deco.splice(E.sel.i, 1); E.sel = null; changed(true); drawOptions(); }, 'sell'));
      }
      options.append(h('small', { class:'ked-hint', text:'Click to place the chosen prop, drag to move it, right-click to remove it. Props marked · lie flat; the rest block building.' }));
    }
  }
  /* ---- the kitchen's details, checks and actions ---- */
  const nameIn = h('input', { type:'text', maxlength:'24', 'aria-label':'Kitchen name', placeholder:'Kitchen name' }); nameIn.value = k.name;
  nameIn.addEventListener('input', () => { k.name = nameIn.value; E.dirty = true; });
  const themeSel = h('select', { 'aria-label':'Floor' }, Object.entries(KM_THEMES).map(([v, t]) => h('option', { value: v, text: t }))); themeSel.value = k.theme;
  themeSel.addEventListener('change', () => { remember(); k.theme = themeSel.value; changed(true); });
  const blurbIn = h('input', { type:'text', maxlength:'120', 'aria-label':'Description', placeholder:'A line about it (optional)' }); blurbIn.value = k.blurb || '';
  blurbIn.addEventListener('input', () => { k.blurb = blurbIn.value; E.dirty = true; });
  const startSel = h('select', { 'aria-label':'Start from a kitchen' }, h('option', { value:'', text:'Start from a kitchen…' }), MAP_ORDER.map(id => h('option', { value: id, text: MAPS[id].name })));
  startSel.addEventListener('change', () => { const M = MAPS[startSel.value]; if (!M) return; remember(); const c = cleanKitchen(JSON.parse(JSON.stringify(M))); Object.assign(k, { theme: c.theme, paths: c.paths, water: c.water, deco: c.deco }); themeSel.value = k.theme; E.trail = 0; E.sel = null; startSel.value = ''; status.textContent = 'Copied the layout of ' + M.name + '. Make it yours.'; changed(true); drawOptions(); });
  const snapTick = h('label', { class:'bchk' }, (() => { const c = h('input', { type:'checkbox' }); c.checked = E.snap; c.addEventListener('change', () => { E.snap = c.checked; }); return c; })(), h('span', { text:'Snap to 10' }));
  function refreshChecks(){
    const pr = kitchenProblems(kedPreview());
    problems.innerHTML = '';
    if (!pr.length) problems.append(h('li', { class:'ok', text:'Ready to play.' }));
    else for (const p of pr) problems.append(h('li', { text: p }));
    return pr;
  }
  function save(){
    k.name = nameIn.value; k.blurb = blurbIn.value;
    const id = saveKitchen(k, E.id);
    if (!id){ status.textContent = 'You already have ' + KITCHEN_MAX + ' kitchens. Delete one first.'; Sfx.play('error'); return null; }
    E.id = id; E.dirty = false;
    delete thumbs[kitchenMapId(id)];
    status.textContent = 'Saved ' + kitchenById(id).name + '.';
    Sfx.play('upgrade');
    return id;
  }
  const impTa = h('textarea', { class:'ked-code', rows:'3', placeholder:'Paste a kitchen code (' + KITCHEN_PREFIX + '…)', hidden: true });
  const actions = h('div', { class:'ked-acts' },
    btn('Save', () => { save(); }, 'btn-primary'),
    btn('Play it', () => { const pr = refreshChecks(); if (pr.length){ status.textContent = 'Fix this first: ' + pr[0]; Sfx.play('error'); return; } const id = save(); if (!id) return; closeModal(); pickDifficulty(kitchenMapId(id)); }, 'btn-gold'),
    btn('Share code', () => { impTa.hidden = false; impTa.readOnly = true; impTa.value = kitchenCode(k); copyText(impTa.value, impTa, ok => { status.textContent = ok ? 'Code copied. Anyone can paste it into their Kitchen Editor.' : 'Copy the code from the box.'; }); }),
    btn('Import code', () => { if (impTa.hidden || impTa.readOnly){ impTa.hidden = false; impTa.readOnly = false; impTa.value = ''; impTa.focus(); status.textContent = 'Paste a kitchen code, then press Import code again.'; return; } try { const c = kitchenFromCode(impTa.value); remember(); Object.assign(k, c); nameIn.value = k.name; blurbIn.value = k.blurb; themeSel.value = k.theme; E.id = null; impTa.hidden = true; status.textContent = 'Imported ' + k.name + '. Save it to keep it.'; changed(true); drawOptions(); } catch (e) { status.textContent = e.message; Sfx.play('error'); } }),
    btn('↶', undo, 'bico', 'Undo (Ctrl+Z)'), btn('↷', redo, 'bico', 'Redo (Ctrl+Y)'),
    E.id ? btn(UI.kedDel ? 'Confirm delete' : 'Delete', () => { if (!UI.kedDel){ UI.kedDel = true; drawKitchenEditor(); setTimeout(() => { UI.kedDel = false; }, 4000); return; } UI.kedDel = false; deleteKitchen(E.id); delete thumbs[kitchenMapId(E.id)]; closeModal(); toast('Kitchen deleted.', ''); if (UI.screen === 'maps') buildMaps(); }, 'sell') : null,
    btn('Close', () => { closeModal(); delete MAPS[KED_ID]; if (UI.screen === 'maps') buildMaps(); }));
  const keyH = ev => {
    if (!UI.ked || $('#modal').hidden) { document.removeEventListener('keydown', keyH, true); return; }
    if (ev.target.matches && ev.target.matches('input, textarea, select')) return;
    const kk = ev.key.toLowerCase();
    if ((ev.ctrlKey || ev.metaKey) && kk === 'z'){ ev.preventDefault(); ev.stopPropagation(); if (ev.shiftKey) redo(); else undo(); }
    else if ((ev.ctrlKey || ev.metaKey) && kk === 'y'){ ev.preventDefault(); ev.stopPropagation(); redo(); }
    else if ((kk === 'delete' || kk === 'backspace') && E.sel){ ev.preventDefault(); ev.stopPropagation(); remember(); if (E.sel.kind === 'water') k.water.splice(E.sel.i, 1); else k.deco.splice(E.sel.i, 1); E.sel = null; changed(true); drawOptions(); }
  };
  document.addEventListener('keydown', keyH, true);
  drawTools(); drawOptions(); refreshChecks();
  modal({ title:'Kitchen editor', lead:'Lay out trails, water and props, then play it. Kitchens of your own earn Dough and mastery but no medals, and share as codes.', wide:true, cls:'ked-modal', noFocus:true,
    content:[
      h('div', { class:'ked-top' }, toolSeg, snapTick, startSel),
      h('div', { class:'ked-stage' }, cv),
      options,
      h('div', { class:'ked-meta' }, h('label', {}, h('span', { text:'Name' }), nameIn), h('label', {}, h('span', { text:'Floor' }), themeSel), h('label', { class:'wide' }, h('span', { text:'Description' }), blurbIn)),
      problems, actions, impTa],
    foot: status,
    onClose: () => { delete MAPS[KED_ID]; document.removeEventListener('keydown', keyH, true); } });
  scheduleBg(true);
}
/* the map grid's own section: your kitchens, and a card to build one */
function kitchenCards(grid){
  const ids = kitchenList();
  grid.append(h('div', { class:'tier-head Custom' }, h('span', { class:'level Custom', text:'Your kitchens' }), h('span', { class:'tier-n', text: ids.length + (ids.length === 1 ? ' kitchen' : ' kitchens') + ' · no medals' })));
  for (const id of ids){
    const mid = kitchenMapId(id), M = MAPS[mid];
    if (!M) continue;
    grid.append(h('div', { class:'map-wrap' },
      h('button', { class:'map-card', onclick: () => pickDifficulty(mid) }, iconCanvas(thumbOf(mid)),
        h('div', { class:'map-meta' }, h('div', { class:'t' }, h('h3', { text: M.name }), h('span', { class:'level Custom', text:'Custom' })), h('p', { text: M.blurb }),
          h('div', { class:'medals' }, h('span', { class:'best', text: Profile.stats.best[mid] ? 'Best round ' + Profile.stats.best[mid] : 'Not played yet' })))),
      h('button', { class:'btn btn-small map-edit', onclick: () => openKitchenEditor(id) }, 'Edit')));
  }
  grid.append(h('button', { class:'map-card map-new', onclick: () => { if (ids.length >= KITCHEN_MAX){ toast('You already have ' + KITCHEN_MAX + ' kitchens. Delete one first.', 'warn'); return; } openKitchenEditor(null); } },
    h('div', { class:'map-new-in' }, h('b', { text:'+ Build a kitchen' }), h('span', { text:'Lay out your own trails, water and props.' }))));
}
