'use strict';
/* =====================================================================
   Kitchen Siege — polish: the end-of-game stats screen, the build replay,
   colour-blind mode and text size, and shop favourites.
   ===================================================================== */

/* ---------------- accessibility ---------------- */
const TEXT_SIZES = { normal:'Normal', large:'Large', larger:'Larger' };
function cbOn(){ return !!(Profile.settings && Profile.settings.cb); }
function applyAccess(){
  const S = Profile.settings || {}, B = document.body;
  if (!B) return;
  B.classList.toggle('cb', !!S.cb);
  B.classList.toggle('txt-l', S.text === 'large');
  B.classList.toggle('txt-xl', S.text === 'larger');
}
function accessRows(sw){
  const S = Profile.settings;
  const seg = h('div', { class:'seg', role:'group', 'aria-label':'Text size' }, Object.keys(TEXT_SIZES).map(k => h('button', { 'aria-pressed': String((S.text || 'normal') === k), 'data-size': k, onclick: ev => {
    S.text = k; saveProfile(); applyAccess();
    for (const b of ev.currentTarget.parentNode.children) b.setAttribute('aria-pressed', String(b.dataset.size === k));
  } }, TEXT_SIZES[k])));
  return [
    sw('set-cb', 'Colour-blind friendly', 'Health bars, range circles and success colours use blue and orange instead of green and red.', !!S.cb, v => { S.cb = v; applyAccess(); }),
    h('div', { class:'form-row' }, h('label', { text:'Text size' }), seg)];
}

/* ---------------- the stats screen ---------------- */
/* a small line chart of one column of the round history */
function histChart(H, col, label, color, fmtv){
  const Wc = 520, Hc = 120, pad = 30;
  const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + Wc + ' ' + Hc); svg.setAttribute('class', 'gs-chart'); svg.setAttribute('role', 'img');
  const vals = H.map(e => e[col]), max = Math.max(1, ...vals), min = Math.min(0, ...vals);
  svg.setAttribute('aria-label', label + ' by round: from ' + fmtv(vals[0] || 0) + ' to ' + fmtv(vals[vals.length - 1] || 0));
  const X = i => pad + (H.length < 2 ? 0 : i / (H.length - 1)) * (Wc - pad - 8), Y = v => 20 + (1 - (v - min) / (max - min || 1)) * (Hc - 44);
  const el = (n, a) => { const e = document.createElementNS(svgNS, n); for (const k in a) e.setAttribute(k, a[k]); svg.append(e); return e; };
  el('line', { x1: pad, y1: Hc - 22, x2: Wc - 8, y2: Hc - 22, class:'gs-axis' });
  const d = H.map((e, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(e[col]).toFixed(1)).join(' ');
  if (H.length > 1) el('path', { d, fill:'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin':'round' });
  else if (H.length) el('circle', { cx: X(0), cy: Y(H[0][col]), r: 3, fill: color });
  const t1 = el('text', { x: pad, y: 12, class:'gs-tick' }); t1.textContent = fmtv(max);
  const t2 = el('text', { x: pad, y: Hc - 6, class:'gs-tick' }); t2.textContent = 'Round ' + (H[0] ? H[0][0] : '');
  const t3 = el('text', { x: Wc - 8, y: Hc - 6, class:'gs-tick', 'text-anchor':'end' }); t3.textContent = 'Round ' + (H.length ? H[H.length - 1][0] : '');
  return h('div', { class:'gs-chart-box' }, h('b', { text: label }), svg);
}
function showGameStats(back){
  const S = gameSummary();
  const cb = cbOn();
  const content = [
    statBlock([['Rounds', fmt(S.rounds)], ['Pests cooked', fmt(S.kills)], ['Pests through', fmt(S.leaked)], ['Cash earned', money(S.earned)], ['Appliances', fmt(S.towers)]]),
    S.hist.length ? h('div', { class:'gs-charts' },
      histChart(S.hist, 1, 'Lives', cb ? '#2f7fd8' : '#e2383f', fmt),
      histChart(S.hist, 2, 'Cash in hand', cb ? '#e08a00' : '#2a9d8f', money)) : h('p', { class:'dly-note', text:'Play a round or two and the charts fill in.' }),
    S.leakRounds.length ? h('p', { class:'dly-note', text:'Pests got through on round' + (S.leakRounds.length > 1 ? 's ' : ' ') + S.leakRounds.slice(0, 20).join(', ') + (S.leakRounds.length > 20 ? '…' : '') + '.' }) : S.hist.length ? h('p', { class:'dly-note', text:'Flawless so far: nothing got through.' }) : null,
    S.top.length ? h('div', { class:'gs-top' }, h('div', { class:'dly-label', text:'Hardest workers' }), S.top.map((t, i) => h('div', { class:'gs-row' },
      h('span', { class:'gs-rank num', text: '#' + (i + 1) }), iconCanvas(Art.towerIcon(t.type, 64, t.up || [0, 0, 0], t.paragon)),
      h('span', {}, h('b', { text: TOWERS[t.type] ? TOWERS[t.type].name : t.type }), ' ' + (t.paragon ? 'Paragon' : t.up.join('-'))),
      h('span', { class:'num', text: fmt(t.dmg) + ' dmg · ' + fmt(t.kills) + ' cooked' })))) : null,
    S.kinds.length ? h('div', { class:'gs-kinds' }, h('div', { class:'dly-label', text:'By kind' }), h('div', { class:'gs-table' },
      h('b', { text:'Appliance' }), h('b', { text:'Count' }), h('b', { text:'Damage' }), h('b', { text:'Share' }),
      ...S.kinds.flatMap(k => [h('span', { text: TOWERS[k.type] ? TOWERS[k.type].name : k.type }), h('span', { class:'num', text: fmt(k.n) }), h('span', { class:'num', text: fmt(Math.round(k.dmg)) }),
        h('span', { class:'gs-bar' }, h('i', { style:{ width: (S.damage ? Math.min(100, k.dmg / Math.max(1, S.kinds.reduce((a, b) => a + b.dmg, 0)) * 100) : 0).toFixed(1) + '%' } }))]))) : null];
  modal({ title:'Game stats', lead: MAPS[G.mapId].name + ' · ' + G.D.name + ' · round ' + G.round + '.', wide:true, cls:'gstats', content,
    actions:[{ label:'Back', onClick: back }, { label:'Watch the build', kind:'primary', onClick: () => showReplay(() => showGameStats(back)) }], dismissable: !back, onClose: back });
}
/* a button for the end-of-game modals: opens the stats, then comes back to the same modal */
function statsButton(){
  return h('div', { class:'acts-row gs-open' }, h('button', { class:'btn btn-small', id:'btn-gstats', onclick: () => { const prev = UI.modalOpts; Sfx.play('click'); showGameStats(() => modal(prev)); } }, 'Game stats & build replay'));
}

/* ---------------- the build replay ---------------- */
function showReplay(back){
  const rounds = buildRounds();
  const cv = h('canvas', { class:'rp-canvas', width: 880, height: 544, 'aria-label':'The kitchen as you built it, round by round' });
  const g = cv.getContext('2d'), k = 880 / W;
  let bg = null;
  try { bg = MapArt.render(G.mapId, 0.8); } catch (e) { bg = null; }
  const slider = h('input', { type:'range', min:'0', max: String(Math.max(0, rounds.length - 1)), step:'1', value: String(Math.max(0, rounds.length - 1)), 'aria-label':'Round' });
  const label = h('p', { class:'rp-label' });
  let playing = false, timer = 0;
  const icons = {};
  const iconFor = (type, up) => { const key = type + ':' + up; if (!icons[key]) icons[key] = TOWERS[type] ? Art.towerIcon(type, 64, up === '999' ? [0, 0, 0] : up.split('').map(Number), up === '999') : null; return icons[key]; };
  const draw = () => {
    const i = +slider.value, r = rounds[i];
    g.clearRect(0, 0, cv.width, cv.height);
    if (bg) g.drawImage(bg, 0, 0, cv.width, cv.height); else { g.fillStyle = '#e9e1d2'; g.fillRect(0, 0, cv.width, cv.height); }
    if (r == null){ label.textContent = 'Nothing built yet.'; return; }
    const now = buildAt(r), before = i ? buildAt(rounds[i - 1]) : {};
    let n = 0, fresh = 0, ups = 0;
    for (const id in now){
      const t = now[id], ic = iconFor(t.type, t.up);
      n++;
      const isNew = !before[id], isUp = !isNew && before[id].up !== t.up;
      if (isNew) fresh++; else if (isUp) ups++;
      const s = 44;
      if (isNew || isUp){ g.beginPath(); g.arc(t.x * k, t.y * k, s * 0.62, 0, TAU); g.fillStyle = isNew ? (cbOn() ? 'rgba(47,127,216,.35)' : 'rgba(126,224,122,.45)') : 'rgba(255,209,102,.5)'; g.fill(); }
      if (ic) g.drawImage(ic, t.x * k - s / 2, t.y * k - s / 2, s, s);
    }
    label.textContent = 'Before round ' + r + ': ' + n + ' appliance' + (n === 1 ? '' : 's') + (fresh ? ' · ' + fresh + ' new' : '') + (ups ? ' · ' + ups + ' upgraded' : '') + '.';
  };
  const play = h('button', { class:'btn btn-small', onclick: () => {
    playing = !playing; play.textContent = playing ? 'Pause' : 'Play';
    clearInterval(timer);
    if (playing){
      if (+slider.value >= rounds.length - 1) slider.value = '0';
      draw();
      timer = setInterval(() => { if (!cv.isConnected || +slider.value >= rounds.length - 1){ clearInterval(timer); playing = false; play.textContent = 'Play'; return; } slider.value = String(+slider.value + 1); draw(); }, 600);
    }
  } }, 'Play');
  slider.addEventListener('input', draw);
  modal({ title:'Build replay', lead:'Your kitchen as it stood at the start of each round. Green marks new appliances, gold marks upgrades.', wide:true, cls:'replay',
    content:[cv, h('div', { class:'rp-ctl' }, play, slider), label],
    actions:[{ label:'Back', onClick: () => { clearInterval(timer); back && back(); } }], dismissable: !back, onClose: () => { clearInterval(timer); if (back) back(); } });
  draw();
}

/* ---------------- shop favourites ---------------- */
function favButton(type){
  if (!TOWERS[type] || TOWERS[type].hero) return null;
  const on = favList().includes(type);
  return h('button', { class:'btn btn-small fav-btn' + (on ? ' on' : ''), 'aria-pressed': String(on), title: on ? 'Remove from favourites' : 'Add to favourites (or right-click its card)',
    onclick: ev => { ev.stopPropagation(); toggleFav(type); buildShop(); showInfo(type); } }, on ? '★ Favourite' : '☆ Favourite');
}
/* cards for the starred appliances, at the top of the shop */
function favCards(shop, card){
  const favs = favList().filter(t => canBuild(t));
  if (!favs.length) return;
  shop.append(h('div', { class:'fhead fav-head', style:'--fc:#c79a1c' }, h('i', { 'aria-hidden':'true' }), '★ Favourites'));
  for (const t of favs) shop.append(card(t, true));
}
