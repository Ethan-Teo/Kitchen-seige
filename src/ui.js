'use strict';
/* =====================================================================
   Kitchen Siege — interface, input, sound, screens, saves, service menu
   ===================================================================== */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmt = n => Math.floor(n).toLocaleString('en-US');
const money = n => '$' + fmt(n);
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;
const VERB = IS_TOUCH ? 'Tap' : 'Click';
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs){
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
function plural(name, n){
  const low = name.replace(/^The /, '').toLowerCase();
  if (n === 1) return low;
  if (low === 'mouse') return 'mice';
  if (low === 'cockroach') return 'cockroaches';
  if (/[^aeiou]y$/.test(low)) return low.slice(0, -1) + 'ies';
  return low + 's';
}
function silhouette(src){
  const c = iconCanvas(src);
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(29,43,51,0.32)'; g.fillRect(0, 0, c.width, c.height);
  return c;
}
function iconCanvas(src, cls){ const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); if (cls) c.className = cls; return c; }

const UI = { screen:'menu', sel:null, placing:null, ghost:null, hover:null, time:0, modalOpen:false, modalDismiss:null, sellArmed:0,
  panelKey:'', codeBuf:'', mtab:'towers', diffPick:'medium', modePick:'standard', mmPick:false, debug:false, fps:false, abKey:'', menuView:{ k:1, ox:0, oy:0, bg:null, key:'' },
  autoArmed:false, autoLeft:null };

/* ---------------------------------------------------------------------
   Sound: a tiny synth, so nothing has to be downloaded
   --------------------------------------------------------------------- */
const Sfx = (() => {
  let ctx = null, master = null, noiseBuf = null;
  const last = {};
  function ensure(){
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = vol(); master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }
  function vol(){ return Profile.settings.sound ? Profile.settings.volume * 0.55 : 0; }
  function tone(f, dur, type, gain, slide, delay){
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, gain, freq, q, type, delay){
    const t0 = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + 0.02);
  }
  const R = (a, b) => a + Math.random() * (b - a);
  const DEF = {
    pop:{ m:0.035, f:() => tone(R(520, 760), 0.06, 'triangle', 0.09, 0.55) },
    crack:{ m:0.08, f:() => { noise(0.25, 0.35, 900, 0.8); tone(140, 0.25, 'square', 0.08, 0.5); } },
    boom:{ m:0.07, f:() => { noise(0.3, 0.3, 260, 0.7, 'lowpass'); tone(90, 0.25, 'sine', 0.2, 0.5); } },
    thunk:{ m:0.06, f:() => tone(220, 0.08, 'square', 0.05, 0.6) },
    throw:{ m:0.05, f:() => noise(0.06, 0.08, 3200, 2) },
    splat:{ m:0.07, f:() => { noise(0.12, 0.12, 700, 1.2); tone(180, 0.1, 'sine', 0.06, 0.6); } },
    puff:{ m:0.1, f:() => noise(0.25, 0.08, 500, 0.6, 'lowpass') },
    whirl:{ m:0.08, f:() => tone(R(300, 340), 0.12, 'sawtooth', 0.03, 1.6) },
    freeze:{ m:0.15, f:() => { tone(1400, 0.25, 'sine', 0.05, 1.4); tone(2100, 0.2, 'sine', 0.03, 1.2, 0.04); } },
    zap:{ m:0.06, f:() => tone(R(700, 900), 0.08, 'sawtooth', 0.04, 0.4) },
    laser:{ m:0.12, f:() => tone(R(1200, 1400), 0.05, 'square', 0.015, 0.8) },
    flame:{ m:0.12, f:() => noise(0.16, 0.05, 1200, 0.5) },
    cork:{ m:0.06, f:() => { tone(900, 0.05, 'square', 0.06, 0.3); noise(0.05, 0.1, 2500, 1.5); } },
    place:{ m:0.05, f:() => { tone(330, 0.08, 'triangle', 0.12, 1); tone(495, 0.1, 'triangle', 0.1, 1, 0.06); } },
    upgrade:{ m:0.05, f:() => { tone(523, 0.1, 'triangle', 0.12); tone(659, 0.1, 'triangle', 0.12, 1, 0.07); tone(784, 0.16, 'triangle', 0.12, 1, 0.14); } },
    tier5:{ m:0.05, f:() => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', 0.13, 1, i * 0.08)); } },
    paragon:{ m:0.05, f:() => { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.35, 'triangle', 0.14, 1, i * 0.09)); noise(0.8, 0.12, 400, 0.5, 'lowpass'); } },
    sell:{ m:0.05, f:() => { tone(784, 0.08, 'square', 0.05); tone(1046, 0.12, 'square', 0.05, 1, 0.06); } },
    leak:{ m:0.15, f:() => tone(160, 0.3, 'sawtooth', 0.1, 0.6) },
    start:{ m:0.3, f:() => { tone(392, 0.1, 'triangle', 0.1); tone(523, 0.16, 'triangle', 0.1, 1, 0.08); } },
    cash:{ m:0.06, f:() => { tone(1318, 0.06, 'square', 0.04); tone(1760, 0.1, 'square', 0.04, 1, 0.05); } },
    ability:{ m:0.1, f:() => { tone(440, 0.3, 'sawtooth', 0.06, 2); noise(0.3, 0.08, 1500, 0.8); } },
    victory:{ m:1, f:() => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, 1, i * 0.12)); } },
    lose:{ m:1, f:() => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.14, 1, i * 0.16)); } },
    squeak:{ m:0.4, f:() => tone(1800, 0.12, 'sine', 0.05, 1.5) },
    error:{ m:0.1, f:() => tone(150, 0.15, 'square', 0.06, 0.8) },
    click:{ m:0.03, f:() => tone(880, 0.03, 'square', 0.03) },
    rank:{ m:0.5, f:() => { [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.25, 'sine', 0.12, 1, i * 0.1)); } },
    whoosh:{ m:0.08, f:() => noise(0.18, 0.07, 1400, 0.7) },
    whack:{ m:0.05, f:() => { tone(R(160, 200), 0.06, 'square', 0.05, 0.5); noise(0.04, 0.08, 1800, 1.2); } },
    bubble:{ m:0.06, f:() => tone(R(500, 700), 0.09, 'sine', 0.06, 2.2) },
    hook:{ m:0.1, f:() => tone(R(260, 300), 0.14, 'triangle', 0.06, 1.8) },
    splash:{ m:0.1, f:() => noise(0.22, 0.12, 900, 0.5) },
    squish:{ m:0.08, f:() => { tone(R(200, 240), 0.08, 'sine', 0.06, 0.6); noise(0.06, 0.05, 600, 1); } },
    sizzle:{ m:0.15, f:() => noise(0.3, 0.07, 4200, 0.6, 'highpass') },
    buzz:{ m:0.3, f:() => { tone(150, 0.45, 'sawtooth', 0.04, 1.08); tone(155, 0.45, 'sawtooth', 0.03, 0.95, 0.02); } },
    spray:{ m:0.3, f:() => { noise(0.6, 0.14, 700, 0.5, 'lowpass'); tone(90, 0.4, 'sine', 0.05, 0.7); } },
    clack:{ m:0.06, f:() => { tone(R(950, 1150), 0.035, 'triangle', 0.07, 0.7); noise(0.035, 0.1, 2600, 3); } },
    mist:{ m:0.14, f:() => noise(0.12, 0.05, 3200, 0.9, 'highpass') },
    steam:{ m:0.18, f:() => { noise(0.45, 0.12, 2200, 0.7, 'highpass'); tone(R(520, 580), 0.08, 'sine', 0.04, 1.4); } },
    clop:{ m:0.07, f:() => { tone(R(380, 460), 0.05, 'sine', 0.08, 0.55); noise(0.03, 0.06, 1400, 2); } },
  };
  function play(name){
    if (!Profile.settings.sound || G.attract) return;
    const c = ensure();
    if (!c || c.state !== 'running') return;
    const d = DEF[name]; if (!d) return;
    const now = c.currentTime;
    if (last[name] && now - last[name] < d.m) return;
    last[name] = now;
    try { d.f(); } catch (e) {}
  }
  function unlock(){ const c = ensure(); if (c && c.state === 'suspended') c.resume(); if (c && typeof Music !== 'undefined') Music.start(); }
  function setVolume(){ if (master) master.gain.value = vol(); if (typeof Music !== 'undefined') Music.setVolume(); }
  return { play, unlock, setVolume, ctx: ensure };
})();

/* ---------------------------------------------------------------------
   Screens
   --------------------------------------------------------------------- */
function show(name){
  for (const s of ['menu', 'maps', 'game', 'mastery', 'shop', 'chefs']) $('#scr-' + s).hidden = s !== name;
  UI.screen = name;
  hideAbTip(); UI.abPreview = null; UI.powerPick = null; closePowerTray();
  if (name === 'shop') buildPantry();
  if (name === 'chefs') buildChefs();
  if (name === 'menu'){ refreshMenu(); if (!G.active || !G.attract) startAttract(); layoutMenu(); }
  if (name === 'maps') buildMaps();
  if (name === 'mastery'){ UI.mTower = null; buildMastery(); }
  if (name === 'game'){ requestAnimationFrame(layoutStage); }
  window.scrollTo(0, 0);
}
function startAttract(){
  setupGame('block', 'easy', false);
  G.attract = true; G.cash = 1e9; G.speed = 1;
  const setup = [['knife', 228, 210, [2, 0, 1]], ['dish', 192, 444, [3, 0, 1]], ['toaster', 894, 426, [2, 0, 0]], ['grill', 894, 500, [1, 3, 0]],
    ['micro', 900, 300, [3, 0, 1]], ['blender', 156, 390, [2, 0, 0]], ['fryer', 174, 516, [3, 0, 1]], ['knife', 470, 160, [0, 3, 1]], ['siphon', 1040, 420, [2, 0, 0]],
    ['mixer', 440, 300, [3, 0, 0]], ['pasta', 440, 470, [2, 0, 1]], ['boat', 680, 395, [3, 0, 1]], ['sub', 680, 515, [0, 1, 3]], ['saucer', 680, 140, [2, 0, 1]],
    ['chopsticks', 380, 200, [0, 2, 1]], ['chopsticks', 870, 380, [2, 0, 1]], ['susan', 250, 250, [1, 1, 0]]];
  for (const [type, x, y, up] of setup){
    let t = null;
    for (const [dx, dy] of [[0, 0], [12, 0], [0, 12], [-12, 0], [0, -12], [16, 16]]){ t = placeTower(type, x + dx, y + dy); if (t) break; }
    if (t){ t.up = up; t.tg = 'first'; }
  }
  /* and a head chef */
  const chef = heroPick();
  for (const [x, y] of [[300, 290], [260, 290], [960, 300], [200, 160], [600, 560]]){
    let t = null;
    for (const [dx, dy] of [[0, 0], [14, 0], [0, 14], [-14, 0], [0, -14], [20, 20]]){ t = placeTower(chef, x + dx, y + dy); if (t) break; }
    if (t){ t.level = 12; break; }
  }
  refreshTowers();
  /* two appliances riding the Lazy Susan */
  const board = G.towers.find(t => t.type === 'susan');
  if (board) for (const [type, up] of [['knife', [2, 0, 0]], ['toaster', [1, 0, 1]]]){ const t = placeTower(type, board.x, board.y); if (t){ t.up = up; t.tg = 'first'; } }
  refreshTowers();
  for (const t of G.towers) if (t.type === 'saucer') t.flyMode = 'eight';
  G.attractT = 0;
}
function attractTick(dt){
  G.attractT -= dt;
  if (G.attractT <= 0){
    const pool = ['ant', 'ant', 'ant', 'fruitfly', 'housefly', 'roach', 'antball', 'mouse', 'weevil', 'fireant'];
    spawnEnemy(pool[Math.floor(Math.random() * pool.length)], { camo: false });
    G.attractT = 0.25 + Math.random() * 0.55;
    if (Math.random() < 0.025) spawnEnemy('cheese', {});
  }
  G.cash = 1e9;
}

/* ---------------------------------------------------------------------
   Menu
   --------------------------------------------------------------------- */
function refreshMenu(){
  const g = readStoredGame();
  const btn = $('#btn-continue');
  if (g && g.cm) adoptKitchen(g.mapId, g.cm);
  if (g && g.mapId && MAPS[g.mapId]){
    btn.hidden = false;
    $('#continue-info').textContent = 'Slot ' + (activeSlot() + 1) + ' · ' + slotLabel(g);
  } else btn.hidden = true;
  updateCloudBadge();
  refreshChefBar();
}
function updateCloudBadge(){
  const b = $('#cloud-badge');
  const st = Store.cloudState;
  let txt = 'Saved in this browser', on = false;
  if (st === 'on'){ txt = 'Synced to your Claude account'; on = true; }
  else if (st === 'connecting') txt = 'Connecting saves…';
  else if (st === 'error') txt = Store.ok ? 'Cloud sync paused · saved in this browser' : 'Cloud sync paused: use Save data';
  else if (!Store.ok) txt = 'Browser storage is off: use Save data';
  b.classList.toggle('on', on);
  b.querySelector('span').textContent = txt;
  b.title = st === 'on' && Store.lastSync ? 'Last synced at ' + new Date(Store.lastSync).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }) : '';
}
function layoutMenu(){
  const c = $('#menu-bg');
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const cw = c.clientWidth || window.innerWidth, ch = c.clientHeight || window.innerHeight;
  c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr);
  const s = Math.max(c.width / W, c.height / H);
  const V = UI.menuView;
  V.k = Math.min(s, 3); V.ox = (c.width - W * V.k) / 2; V.oy = (c.height - H * V.k) / 2;
  const key = 'block:' + V.k.toFixed(3) + ':' + Art.look3d.glOn();
  if (V.key !== key){ V.key = key; V.bg = MapArt.render('block', V.k, { split: true }); }
  Art.setScale(Math.max(V.k, 1));
}
function renderMenu(){
  const c = $('#menu-bg'), ctx = c.getContext('2d'), V = UI.menuView;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#d7a466'; ctx.fillRect(0, 0, c.width, c.height);
  renderWorld(ctx, V.k, V.ox, V.oy, V.bg, G.time, {});
}

/* ---------------------------------------------------------------------
   Map select and difficulty
   --------------------------------------------------------------------- */
const thumbs = {};
/* a kitchen's picture for the map cards, sharp at the screen's pixel density */
function thumbOf(id){
  if (!thumbs[id]) thumbs[id] = MapArt.render(id, 0.36 * Math.min(2.5, Math.max(1, window.devicePixelRatio || 1)));
  return thumbs[id];
}
function medalRow(id, withBest){
  const m = Profile.medals[id] || {};
  const row = h('div', { class:'medals' });
  const spec = [['easy', 'E', 'Bronze Spoon (Easy)'], ['medium', 'M', 'Silver Ladle (Medium)'], ['hard', 'H', 'Gold Whisk (Hard)'], ['michelin', '★', 'Michelin Star'], ['mastery', '◆', 'Mastery Mode win']];
  for (const [k, l, t] of spec) row.append(h('span', { class:'medal ' + k + (m[k] ? ' got' : ''), title: t + (m[k] ? ': earned' : ': not yet'), text: l }));
  const mm = modeMedals(id);
  row.append(h('span', { class:'medal modes' + (mm.got >= mm.all ? ' got' : mm.got ? ' some' : ''), title: mm.got + ' of ' + mm.all + ' mode medals', text: mm.got + '/' + mm.all }));
  if (withBest){ const b = Profile.stats.best[id]; row.append(h('span', { class:'best', text: b ? 'Best round ' + b : 'Not played yet' })); }
  return row;
}
function buildMaps(){
  const grid = $('#map-grid'); grid.innerHTML = '';
  let tier = '';
  for (const id of MAP_ORDER){
    const M = MAPS[id];
    if (M.level !== tier){
      tier = M.level;
      const ids = MAP_ORDER.filter(k => MAPS[k].level === tier), got = ids.reduce((n, k) => n + Object.values(Profile.medals[k] || {}).filter(Boolean).length, 0);
      grid.append(h('div', { class:'tier-head ' + tier }, h('span', { class:'level ' + tier, text: tier }), h('span', { class:'tier-n', text: ids.length + (ids.length === 1 ? ' kitchen' : ' kitchens') + ' · ' + got + ' medals' })));
    }
    const card = h('button', { class:'map-card', onclick: () => pickDifficulty(id) },
      iconCanvas(thumbOf(id)),
      h('div', { class:'map-meta' },
        h('div', { class:'t' }, h('h3', { text: M.name }), h('span', { class:'level ' + M.level, text: M.level })),
        h('p', { text: M.blurb }), medalRow(id, true)));
    grid.append(card);
  }
  kitchenCards(grid);
}
function pickDifficulty(mapId){
  Sfx.unlock();
  UI.lastPickMap = mapId;
  const m = Profile.medals[mapId] || {};
  const diffs = h('div', { class:'diffs' });
  const modes = h('div', { class:'modes' });
  if (!MODES[UI.modePick] || (UI.modePick !== 'standard' && MODES[UI.modePick].diff !== UI.diffPick)) UI.modePick = 'standard';
  const renderModes = () => {
    modes.innerHTML = '';
    for (const id of ['standard'].concat(modesFor(UI.diffPick))){
      const M = MODES[id], key = medalKey(UI.diffPick, id);
      modes.append(h('button', { class:'mode', 'aria-pressed': String(UI.modePick === id), onclick: () => { UI.modePick = id; renderModes(); } },
        h('b', { text: M.name + (m[key] ? ' ✓' : '') }), h('span', { text: M.blurb })));
    }
  };
  const renderDiffs = () => {
    diffs.innerHTML = '';
    for (const d of DIFF_ORDER){
      const D = DIFFS[d], got = modesFor(d).filter(id => m[medalKey(d, id)]).length;
      diffs.append(h('button', { class:'diff', 'aria-pressed': String(UI.diffPick === d), onclick: () => { UI.diffPick = d; UI.modePick = 'standard'; renderDiffs(); renderModes(); } },
        h('b', { text: D.name + (m[d] ? ' ✓' : '') }), h('span', { text: D.blurb + (got ? ' · ' + got + '/' + modesFor(d).length + ' modes' : '') })));
    }
  };
  renderDiffs(); renderModes();
  const mm = h('input', { type:'checkbox', id:'mm-toggle' }); mm.checked = UI.mmPick;
  mm.addEventListener('change', () => { UI.mmPick = mm.checked; });
  const mmRow = h('label', { class:'toggle-row', for:'mm-toggle' },
    h('span', { class:'txt' }, h('b', { text:'Mastery Mode' }), h('span', { text:'Every pest is promoted one rank: ants become flies, rats become cheese wheels. Double mastery XP and a special medal.' })),
    h('span', { class:'switch' }, mm, h('i')));
  /* Sandbox: a game with nothing at stake (the difficulty then only sets the pests' strength curve) */
  UI.sbPick = false;
  const sb = h('input', { type:'checkbox', id:'sb-toggle' });
  sb.addEventListener('change', () => { UI.sbPick = sb.checked; modes.classList.toggle('off', sb.checked); diffs.classList.toggle('off', false); mm.disabled = sb.checked; if (sb.checked){ mm.checked = false; UI.mmPick = false; } });
  const sbRow = h('label', { class:'toggle-row', for:'sb-toggle' },
    h('span', { class:'txt' }, h('b', { text:'Sandbox' }), h('span', { text: MODES.sandbox.blurb })),
    h('span', { class:'switch' }, sb, h('i')));
  /* which save slot the game goes in: a free one by default */
  const S = slotsData(), def = slotForNew();
  UI.slotPick = def;
  const slotSel = h('select', { id:'slot-pick', 'aria-label':'Save slot' }, S.slots.map((g, i) => { const o = h('option', { value: String(i), text: 'Slot ' + (i + 1) + ' · ' + slotLabel(g) }); if (i === def) o.selected = true; return o; }));
  const warn = h('p', { class:'note', id:'slot-note', text: slotStartNote(def) });
  slotSel.addEventListener('change', () => { UI.slotPick = +slotSel.value; warn.textContent = slotStartNote(UI.slotPick); });
  const slotRow = h('div', { class:'slot-row' }, h('label', { for:'slot-pick', text:'Save slot' }), slotSel);
  modal({ title: MAPS[mapId].name, lead: MAPS[mapId].blurb + (isCustomMap(mapId) ? ' A kitchen of your own: it earns Dough and mastery, but no medals.' : ''), content:[gmNoteRow(), diffs, h('p', { class:'lead modes-h', text:'House style' }), modes, mmRow, sbRow, slotRow, warn],
    actions:[{ label:'Cancel' }, { label:'Start cooking', kind:'primary', onClick: () => { pickSlot(UI.slotPick); startNewGame(mapId, UI.diffPick, UI.mmPick && !UI.sbPick, null, UI.sbPick ? 'sandbox' : UI.modePick); } }] });
}

/* ---------------------------------------------------------------------
   Game lifecycle
   --------------------------------------------------------------------- */
function startNewGame(mapId, diff, mm, ch, mode){
  Profile.news = NEWS;   // anyone starting games now already sees everything new on the menu
  newGame(mapId, diff, mm, ch, mode);
  enterGame();
  if (G.ch) toast(G.ch.name + ': survive rounds ' + G.ch.start + ' to ' + G.ch.end + '. ' + challengeRulesText(G.ch), 'gold');
  else if (G.M) toast(G.M.name + ': ' + G.M.blurb, 'gold');
  else if (Profile.tut) toast(VERB + ' an appliance in the shop, then ' + VERB.toLowerCase() + ' the kitchen to place it.', 'info');
  if (!G.ch && !G.ev && !G.M) tutStart();
  if (!Profile.heroes.tip && Profile.tut) toast('Your head chef, ' + HEROES[heroPick()].name + ', waits above the shop. Clearing rounds levels them up.', 'gold');
}
function continueGame(){
  const d = readStoredGame();
  if (!d) return;
  loadGame(d);
  enterGame();
  toast('Welcome back. Round ' + G.round + ' is ready.', 'info');
}
function enterGame(){
  G.attract = false; G.paused = false;
  UI.sel = null; UI.placing = null; UI.pasting = null; UI.ghost = null; UI.panelKey = '';
  show('game'); updateClip();
  $('#auto-start').checked = !!Profile.settings.auto;
  UI.autoArmed = false; UI.autoLeft = null;
  $('#mode-label').textContent = (G.mods ? '⚙ Modded · ' : '') + (G.ev ? eventLabel() : G.ch ? (G.ch.ex ? 'Expedition ' + (G.ch.ex.leg + 1) + '/5 · ' : G.ch.tm ? 'Tasting Menu · ' : 'Daily · ') + G.D.name : G.D.name + (G.M ? ' · ' + G.M.name : '') + (G.mm ? ' · Mastery' : ''));
  $('#mode-label').title = G.mods ? 'Mods: ' + G.mods.names.join(', ') : G.ch ? G.ch.name + ' · rounds ' + G.ch.start + ' to ' + G.ch.end + '. ' + challengeRulesText(G.ch) : G.M ? G.M.name + ': ' + modeRulesText() : '';
  UI.abKey = '';
  buildShop(); buildAbilities(); updatePanel(true); UI.bossKey = null; bossBar(); UI.previewKey = null; buildPreview();
  $('#toasts').innerHTML = '';
  UI.powerPick = null; closePowerTray(); updatePowerButton();
  UI.speedIdx = 0;
  closeSandbox(); sandboxButton();
}
function exitToMenu(){
  if (Coop.on || Net.send) coopLeave();
  if (tutOn()){ tutStep = -1; $('#tut').hidden = true; tutMark(''); }
  if (G.active && !G.over && !G.attract) saveGameNow();
  closeModal();
  closeSandbox();
  G.active = false;
  show('menu');
}

/* ---------------------------------------------------------------------
   Playfield layout and rendering
   --------------------------------------------------------------------- */
const View = { k:1, bg:null, bgKey:'' };
function layoutStage(){
  if (UI.screen !== 'game') return;
  const col = $('#stage-col'), stage = $('#stage'), cv = $('#cv');
  const mobile = matchMedia('(max-width: 860px) and (orientation: portrait), (max-width: 600px)').matches;
  let w;
  if (mobile) w = col.clientWidth;
  else { const s = Math.min(col.clientWidth / W, col.clientHeight / H); w = W * s; }
  w = Math.max(240, Math.floor(w));
  const hh = Math.floor(w * H / W);
  stage.style.width = w + 'px'; stage.style.height = hh + 'px';
  const dpr = perfMode() ? 1 : Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr);
  View.k = cv.width / W;
  Art.setScale(View.k);
  renderBg();
  placeBossBars();
}
function renderBg(force){
  if (!G.mapId) return;
  const rev = !!(G.M && G.M.reverse), key = G.mapId + ':' + View.k.toFixed(3) + ':' + Art.look3d.glOn() + (rev ? ':r' : '');
  if (!force && key === View.bgKey && View.bg) return;
  View.bgKey = key; View.bg = MapArt.render(G.mapId, View.k, { split: true, reverse: rev });
}
/* the kitchens are drawn again (their props are 3D or flat as the appliances are) */
function redrawKitchens(){
  for (const k in thumbs) delete thumbs[k];
  UI.menuView.key = ''; View.bgKey = '';
  if (UI.screen === 'menu') layoutMenu();
  if (UI.screen === 'game') renderBg(true);
}
function drawRange(ctx, x, y, r, ok, gold){
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  const cb = cbOn();
  ctx.fillStyle = ok ? (gold ? 'rgba(255,209,102,0.12)' : 'rgba(255,255,255,0.14)') : cb ? 'rgba(230,120,0,0.25)' : 'rgba(226,56,63,0.2)'; ctx.fill();
  ctx.setLineDash(ok ? [7, 6] : cb ? [3, 4] : [7, 6]); ctx.lineWidth = 2;
  ctx.strokeStyle = ok ? (gold ? 'rgba(255,209,102,0.95)' : 'rgba(255,255,255,0.8)') : cb ? 'rgba(230,120,0,0.95)' : 'rgba(226,56,63,0.9)'; ctx.stroke();
  ctx.restore();
}
function ghostRange(type, x, y){
  const T = TOWERS[type];
  if (T.base.global) return 0;
  /* a Lazy Susan reaches nothing until it has sauce: show the board it puts down */
  if (type === 'susan') return T.size;
  return T.base.range * (masteryRank(type) >= 4 ? 1.06 : 1) * (T.amphib && x != null && inWater(x, y, 0) ? 1.35 : 1);
}
function pasteRange(c){
  const key = c.type + c.up.join('');
  if (pasteRange.key !== key){
    const st = computeStats({ type: c.type, up: c.up.slice(), paragon:false, x:0, y:0 });
    pasteRange.key = key; pasteRange.v = st.global ? 0 : st.range || 0;
  }
  return pasteRange.v;
}
/* where an appliance sorts back to front: a rider just after its turntable */
function drawY(tw){ return tw.on ? tw.on.y + 0.5 + (tw.y - tw.on.y) * 0.004 : tw.y; }
function renderWorld(ctx, k, ox, oy, bg, t, opt){
  Art.beginFrame();
  ctx.setTransform(k, 0, 0, k, ox, oy);
  if (opt.shake && G.shake > 0 && !perfMode()){ const s = G.shake * 9; ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s); }
  if (bg) ctx.drawImage(bg, 0, 0, W, H);
  const water = (G.map && G.map.water) || [];
  if (G.iceFloes) for (const w of water) Art.drawIce(ctx, w, t);
  else if (!lowFx()) for (const w of water) MapArt.waterFx(ctx, w, t);
  if (opt.ghost && TOWERS[UI.placing] && (TOWERS[UI.placing].water || TOWERS[UI.placing].amphib)) for (const w of water) MapArt.waterHint(ctx, w, t);
  for (const pd of G.puddles) Art.drawPuddle(ctx, pd, t);
  for (const c of G.clouds) Art.drawCloud(ctx, c, t);
  if (G.foams && G.foams.length) drawSprayFloor(ctx, t);
  for (const tr of G.traps) Art.drawTrap(ctx, tr, t);
  if (G.ptraps) for (const tr of G.ptraps) Art.drawPowerTrap(ctx, tr, t);
  if (G.paraList && (G.paraList.length || G.bowls.length || G.towers.some(tw => tw.forestR))) Art.drawParaFloor(ctx, t);
  /* a stand mixer's chocolate spikes sit on top of its dough */
  if (G.piles && G.piles.length) for (const p of G.piles) Art.drawPile(ctx, p, t);
  /* a bishop's Colour Complex: the dark squares of the floor along the trail */
  if (G.board) Art.drawBoard(ctx, t);
  const sel = opt.sel;
  if (sel && TOWERS[sel.type].flyer === 'saucer') drawLoop(ctx, sel, t);
  if (sel && !sel.s.global && !(sel.type === 'susan' && !Object.keys(sel.s.atk).length)){ const air = TOWERS[sel.type].flyer && sel.fx != null; drawRange(ctx, air ? sel.fx : sel.x, air ? sel.fy : sel.y, sel.s.range, true, !!sel.s.buff); }
  for (const L of G.loaves) Art.drawLoaf(ctx, L, t);
  /* the appliances' shadows lie on the floor, under the pests */
  for (const tw of G.towers) tw.rank = masteryRank(tw.type);
  Art.drawShadows(ctx, G.towers, t);
  /* pests up in a pair of chopsticks: their shadows here, the pests themselves above the appliances */
  let lifted = false;
  for (const e of G.enemies) if (e.air && !e.dead){ Art.drawAirShadow(ctx, e); lifted = true; }
  for (const e of G.enemies) if (!e.dead && !e.air && !e.def.fly && !e.big) Art.drawPest(ctx, e, t);
  for (const e of G.enemies) if (!e.dead && !e.air && e.big) Art.drawPest(ctx, e, t);
  for (const e of G.enemies) if (!e.dead && !e.air && e.def.fly) Art.drawPest(ctx, e, t);
  for (const w of G.whirls) Art.drawWhirl(ctx, w, t);
  if (G.storms && G.storms.length) for (const s of G.storms) Art.drawStorm(ctx, s, t);
  if (G.orbs && G.orbs.length) for (const o of G.orbs) Art.drawOrb(ctx, o, t);
  for (const e of G.enemies) if (!e.dead && (e.markBy || e.wanted)) Art.drawMark(ctx, e, t);
  if (G.minions && G.minions.length) for (const m of G.minions) Art.drawMinion(ctx, m, t);
  if (G.queens && G.queens.length) for (const q of G.queens) Art.drawQueenlet(ctx, q, t);
  /* the appliances back to front, and the kitchen's props standing among them (what rides a Lazy Susan comes
     straight after it, back to front on its board) */
  const props = bg && bg.props, order = G.towers.length > 1 ? G.towers.slice().sort((a, b) => drawY(a) - drawY(b)) : G.towers;
  let pi = 0;
  coopDrawOwners(ctx);
  for (const tw of order){
    if (props) while (pi < props.length && props[pi].sy <= drawY(tw)){ const p = props[pi++]; ctx.drawImage(p.img, p.x, p.y, p.w, p.h); }
    Art.drawTower(ctx, tw, t, { selected: tw === sel || tw === opt.hover, noShadow: true });
  }
  if (props) while (pi < props.length){ const p = props[pi++]; ctx.drawImage(p.img, p.x, p.y, p.w, p.h); }
  if (lifted) for (const e of G.enemies) if (e.air && !e.dead) Art.drawPest(ctx, e, t);
  if ((G.bubbles && G.bubbles.length) || G.glob.downpour) drawSprayAir(ctx, t);
  if (G.paraList && G.paraList.length && !opt.menu) Art.drawParaMeters(ctx, t);
  if (opt.ghost){
    const gh = opt.ghost, type = UI.placing;
    const r = UI.pasting ? pasteRange(UI.pasting) : ghostRange(type, gh.x, gh.y);
    if (r) drawRange(ctx, gh.x, gh.y, r, gh.valid && gh.afford, false);
    ctx.save(); ctx.globalAlpha = 0.82;
    const ghostT = { type, x: gh.x, y: gh.y, size: TOWERS[type].size, up: gh.up || [0, 0, 0], aim:-Math.PI / 2, aim2:-Math.PI / 2, fireAnim:0, boost:{}, rank: masteryRank(type), on: gh.on || null };
    Art.drawTower(ctx, ghostT, t, {});
    if (TOWERS[type].flyer) Art.drawFlyer(ctx, Object.assign(ghostT, { fx: gh.x, fy: gh.y - 6 }), t, {});
    ctx.restore();
    if (!gh.valid){ ctx.strokeStyle = 'rgba(226,56,63,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gh.x - 9, gh.y - 9); ctx.lineTo(gh.x + 9, gh.y + 9); ctx.moveTo(gh.x + 9, gh.y - 9); ctx.lineTo(gh.x - 9, gh.y + 9); ctx.stroke(); }
    const label = UI.pasting && UI.pasting.insta ? 'Free · insta ' + UI.pasting.up.join('-') : !r ? 'Global range · ' + money(gh.cost) : money(gh.cost);
    ctx.font = '700 14px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(29,43,51,0.85)'; ctx.strokeText(label, gh.x, gh.y + TOWERS[type].size + 18);
    ctx.fillStyle = gh.afford ? '#ffcf4d' : '#ff8a8a'; ctx.fillText(label, gh.x, gh.y + TOWERS[type].size + 18);
  }
  if (sel && sel.s && sel.s.spot){
    if (UI.spotPick === sel && UI.pointer) drawSpot(ctx, UI.pointer.x, UI.pointer.y, t, true);
    else if (sel.spot) drawSpot(ctx, sel.spot.x, sel.spot.y, t, false);
  }
  for (const tw of G.towers) if (tw.lock){
    const strong = tw === sel || tw === opt.hover;
    if (strong){
      const air = TOWERS[tw.type].flyer && tw.fx != null, x0 = air ? tw.fx : tw.x, y0 = air ? tw.fy : tw.y;
      ctx.save(); ctx.strokeStyle = 'rgba(255,176,46,0.7)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -t * 22;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(tw.lock.x, tw.lock.y); ctx.stroke(); ctx.restore();
    }
    drawLock(ctx, tw.lock.x, tw.lock.y, t, strong, false);
  }
  if (UI.lockPick && UI.pointer && !opt.menu) drawLock(ctx, UI.pointer.x, UI.pointer.y, t, true, true);
  if (G.hasPointer && G.aimAt && !opt.menu && !G.attract && !opt.ghost && !UI.lockPick) drawAim(ctx, G.aimAt.x, G.aimAt.y, t);
  if (UI.abPreview && !opt.menu && !G.attract) drawAbilityAim(ctx, t);
  if (UI.powerPick && !opt.menu) drawTrapGhost(ctx, t);
  for (const L of G.lobs) Art.drawLob(ctx, L);
  for (const p of G.projs) Art.drawProj(ctx, p);
  coopDrawShots(ctx);
  if (G.leaps && G.leaps.length) for (const L of G.leaps) Art.drawLeap(ctx, L, t);
  /* aircraft and their escorts fly above everything on the ground */
  for (const tw of G.towers){
    if (TOWERS[tw.type].flyer) Art.drawFlyer(ctx, tw, t, { selected: tw === sel || tw === opt.hover });
    if (tw.s && tw.s.atk) for (const id in tw.s.atk) if (tw.s.atk[id].kind === 'drones'){ Art.drawDrones(ctx, tw, t); break; }
  }
  for (const tn of G.tornados) Art.drawTornado(ctx, tn, t);
  if (!lowFx() || G.parts.length < 200) for (const p of G.parts) Art.drawPart(ctx, p);
  for (const f of G.fx) Art.drawFx(ctx, f, t);
  if (G.glob && (G.glob.chill || G.glob.opening || G.glob.night || G.glob.sabotage) && !lowFx()) drawGlobGlow(ctx, t);
  if (UI.debug){
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,255,120,0.8)';
    for (const P of G.paths){ ctx.beginPath(); P.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,0,200,0.7)';
    for (const e of G.enemies){ ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.stroke(); }
    for (const d of G.map.deco) if (d.solid){ ctx.strokeStyle = 'rgba(255,80,80,0.8)'; ctx.beginPath(); if (d.r) ctx.arc(d.x, d.y, d.r, 0, TAU); else ctx.rect(d.x, d.y, d.w, d.h); ctx.stroke(); }
  }
  if (UI.fps && !opt.menu){
    ctx.setTransform(k, 0, 0, k, ox, oy);
    ctx.font = '700 13px "Barlow Condensed", sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#7ee07a';
    ctx.fillText(UI.fpsVal + ' fps · ' + G.enemies.length + ' pests · ' + G.projs.length + ' shots · ' + G.parts.length + ' fx', W - 10, H - 10);
  }
}
/* Big Chill frosts the edges of the kitchen; Grand Opening warms them with gold */
function drawGlobGlow(ctx, t){
  const N = G.glob.night;
  if (N){
    /* night falls over the kitchen, with snow */
    const el = N.max - N.t, a = Math.min(1, el / Math.max(0.1, N.delay)) * Math.min(1, N.t / 2);
    ctx.fillStyle = 'rgba(12,22,52,' + (0.42 * a).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * a).toFixed(3) + ')';
    for (let i = 0; i < 60; i++){ const x = ((i * 97.3 + t * (14 + i % 7)) % (W + 40)) - 20, y = ((i * 53.7 + t * (40 + (i % 5) * 9)) % (H + 20)) - 10; ctx.beginPath(); ctx.arc(x + Math.sin(t + i) * 6, y, 1.2 + (i % 3) * 0.7, 0, TAU); ctx.fill(); }
  }
  for (const [k, rgb] of [['chill', '191,233,255'], ['opening', '255,209,102'], ['sabotage', '74,42,20']]){
    const g = G.glob[k];
    if (!g) continue;
    const a = Math.min(1, g.t / 0.6, (g.max - g.t) / 0.3 + 0.2) * (k === 'chill' ? 0.55 : k === 'sabotage' ? 0.4 : 0.32);
    const grd = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.62);
    grd.addColorStop(0, 'rgba(' + rgb + ',0)'); grd.addColorStop(1, 'rgba(' + rgb + ',' + a.toFixed(3) + ')');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  }
}
/* a selected saucer's flight path */
function drawLoop(ctx, t, time){
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 7]); ctx.lineDashOffset = -time * 24;
  ctx.beginPath();
  for (let i = 0; i <= 96; i++){ const [x, y] = saucerPoint(t, i / 96 * TAU); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke(); ctx.restore();
}
/* a locked aim: the spot a Dartling-style appliance keeps firing at */
function drawLock(ctx, x, y, t, strong, live){
  ctx.save(); ctx.translate(x, y);
  ctx.globalAlpha = strong ? 1 : 0.6;
  const r = 13 + (live ? Math.sin(t * 8) * 1.5 : 0);
  ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(29,43,51,0.35)';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = '#ffb02e'; ctx.setLineDash([5, 3.4]); ctx.lineDashOffset = live ? -t * 16 : 0;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ ctx.moveTo(dx * (r - 5), dy * (r - 5)); ctx.lineTo(dx * (r + 5), dy * (r + 5)); } ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fillStyle = '#ffb02e'; ctx.fill();
  /* a little padlock on the ring */
  ctx.translate(r * 0.78, -r * 0.78);
  ctx.lineWidth = 1.7; ctx.strokeStyle = '#1d2b33'; ctx.beginPath(); ctx.arc(0, -1.6, 2.7, Math.PI, 0); ctx.stroke();
  rr(ctx, -4, -1.6, 8, 6.2, 1.3); fillStroke(ctx, '#ffb02e', '#1d2b33', 1.2);
  ctx.beginPath(); ctx.arc(0, 1.2, 0.9, 0, TAU); ctx.fillStyle = '#1d2b33'; ctx.fill();
  ctx.restore();
}
/* where Dartling-style appliances are aiming */
function drawAim(ctx, x, y, t){
  ctx.save(); ctx.translate(x, y);
  const r = 12 + Math.sin(t * 6) * 1.2;
  ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(29,43,51,0.35)';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(255,107,74,0.95)';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ ctx.moveTo(dx * (r - 5), dy * (r - 5)); ctx.lineTo(dx * (r + 5), dy * (r + 5)); } ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, TAU); ctx.fillStyle = 'rgba(255,107,74,0.95)'; ctx.fill();
  ctx.restore();
}
function drawSpot(ctx, x, y, t, live){
  ctx.save(); ctx.translate(x, y);
  const r = 26 + Math.sin(t * 5) * 2;
  ctx.strokeStyle = live ? 'rgba(255,255,255,0.95)' : 'rgba(226,56,63,0.95)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.stroke();
  ctx.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ ctx.moveTo(dx * (r - 9), dy * (r - 9)); ctx.lineTo(dx * (r + 9), dy * (r + 9)); } ctx.stroke();
  ctx.restore();
}
function renderGame(){
  const cv = $('#cv'), ctx = cv.getContext('2d');
  renderWorld(ctx, View.k, 0, 0, View.bg, G.time, { shake:true, sel: UI.sel, hover: UI.placing ? null : UI.hover, ghost: UI.placing && UI.ghost ? UI.ghost : null });
}

/* ---------------------------------------------------------------------
   Input on the playfield
   --------------------------------------------------------------------- */
function toLogical(ev){ const r = $('#cv').getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H }; }
function towerAt(x, y){
  let best = null, bd = Infinity;
  for (const t of G.towers){
    let d = Math.hypot(t.x - x, t.y - y);
    if (TOWERS[t.type].flyer && t.fx != null) d = Math.min(d, Math.hypot(t.fx - x, t.fy - y));
    /* a rider sits on its turntable: it wins where it stands, and the board's edge picks the turntable */
    if (t.on){ if (d < t.size * riderScale(t) + 3 && d - 6 < bd){ bd = d - 6; best = t; } continue; }
    if (d < t.size + 6 && d < bd){ bd = d; best = t; }
  }
  return best;
}
function setGhost(x, y){
  const type = UI.placing;
  if (!type) return;
  const cost = UI.pasting ? pasteCost(UI.pasting, x, y).cost : towerCost(type, x, y);
  /* over a Lazy Susan with a free seat: it snaps onto the seat */
  const seat = seatFor(type, x, y), at = seat ? seatXY(seat.tw, seat.i) : null;
  UI.ghost = { x: at ? at.x : x, y: at ? at.y : y, px: x, py: y, on: seat ? seat.tw : null, valid: canPlace(type, x, y), cost, afford: canAfford(cost), up: UI.pasting ? UI.pasting.up : null };
}
function showPlaceHint(){
  const hint = $('#place-hint');
  if (!UI.ghost){ hint.hidden = true; return; }
  const st = $('#stage');
  hint.style.left = (UI.ghost.x / W * st.clientWidth) + 'px';
  hint.style.top = (UI.ghost.y / H * st.clientHeight - 18) + 'px';
  const why = !UI.ghost.valid && placeWhy(UI.placing, UI.ghost.x, UI.ghost.y);
  hint.textContent = why === 'water' ? 'Place it on water' : why === 'land' ? 'Needs dry land' : !UI.ghost.valid ? 'Can’t place here' : !UI.ghost.afford ? 'Need ' + money(UI.ghost.cost) : 'Tap again to place';
  hint.hidden = false;
}
function startPlacing(type){
  Sfx.unlock();
  if (!canBuild(type)){ Sfx.play('error'); toast(TOWERS[type].name + (G.ch ? ' isn’t in today’s challenge.' : ' isn’t allowed in ' + G.M.name + '.'), 'warn'); return; }
  const hb = heroBlock(type);
  if (hb){ Sfx.play('error'); toast(hb + '.', 'warn'); return; }
  UI.powerPick = null;
  if (UI.placing === type && !UI.pasting){ cancelPlacing(); return; }
  UI.placing = type; UI.pasting = null; UI.sel = null; UI.ghost = null; UI.spotPick = null; UI.lockPick = null;
  $('#place-hint').hidden = true;
  updatePanel(); updateShop(); updateClip(); showInfo(type);
  Sfx.play('click');
  if (TOWERS[type].water && !UI.waterTold){ UI.waterTold = true; toast(TOWERS[type].name + ' floats: place it on the highlighted ' + waterWord() + '.', 'info'); }
}
function cancelPlacing(){ UI.placing = null; UI.pasting = null; UI.ghost = null; $('#place-hint').hidden = true; updateShop(); }

/* ---------------------------------------------------------------------
   Copy and paste: copy an appliance's upgrades and settings, then place
   copies that arrive fully upgraded for the combined price.
   --------------------------------------------------------------------- */
function copyTower(t){
  t = t || UI.sel;
  if (!t) return;
  if (t.paragon){ Sfx.play('error'); toast('Paragons can’t be copied.', 'warn'); return; }
  if (t.hero){ Sfx.play('error'); toast('There is only one head chef per game.', 'warn'); return; }
  UI.clip = { type: t.type, up: t.up.slice(), tg: t.tg, spot: t.spot ? { x: t.spot.x, y: t.spot.y } : null, fm: t.flyMode || null, lock: t.lock ? { x: t.lock.x, y: t.lock.y } : null };
  Sfx.play('click');
  toast('Copied ' + clipName(UI.clip) + '. ' + (IS_TOUCH ? 'Tap Paste' : 'Press Ctrl+V or Paste') + ' to place a copy.', 'info');
  updateClip(); updatePanel(true);
}
function clipName(c){ return TOWERS[c.type].name + ' ' + c.up.join('-'); }
/* total price of a pasted copy at (x, y): the appliance plus every upgrade, bought in order */
function pasteCost(c, x, y){
  if (c.insta || c.pack != null) return { cost:0, ok:true };
  const fake = { type: c.type, x, y, up:[0, 0, 0], paragon:false };
  let cost = towerCost(c.type, x, y);
  for (let p = 0; p < 3; p++) while (fake.up[p] < c.up[p]){
    const st = upgradeState(fake, p);
    if (!st.ok) return { cost, ok:false, why: st.why };
    cost += st.cost; fake.up[p]++;
  }
  return { cost, ok:true };
}
function startPaste(){
  const c = UI.clip;
  if (!c){ Sfx.play('error'); toast('Select an appliance and copy it first' + (IS_TOUCH ? '.' : ' (Ctrl+C).'), 'warn'); return; }
  if (!G.active || G.over) return;
  Sfx.unlock();
  UI.placing = c.type; UI.pasting = c; UI.sel = null; UI.ghost = null; UI.spotPick = null; UI.lockPick = null;
  $('#place-hint').hidden = true;
  if (UI.pointer) setGhost(UI.pointer.x, UI.pointer.y);
  updatePanel(); updateShop(); updateClip(); showInfo(c.type);
  Sfx.play('click');
}
function updateClip(){
  const box = $('#clip'); if (!box) return;
  const c = UI.clip;
  box.hidden = !c;
  if (!c) return;
  const pc = pasteCost(c);
  const pasting = !!(UI.pasting && !UI.pasting.insta && UI.pasting.pack == null);
  const key = clipName(c) + '|' + pc.cost + '|' + canAfford(pc.cost) + '|' + pasting;
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  box.innerHTML = '';
  box.append(
    h('button', { class:'clip-paste' + (pasting ? ' sel' : '') + (canAfford(pc.cost) ? '' : ' poor'), title:'Place a copy' + (IS_TOUCH ? '' : ' (Ctrl+V)'), onclick: () => pasting ? cancelPlacing() : startPaste() },
      iconCanvas(Art.towerIcon(c.type, 64, c.up)),
      h('span', {}, h('b', { text: pasting ? 'Placing copy…' : 'Paste' }), h('small', { text: clipName(c) })),
      h('span', { class:'pr num', text: money(pc.cost) })),
    h('button', { class:'icon-btn clip-x', 'aria-label':'Clear copied appliance', title:'Clear', onclick: () => { UI.clip = null; if (UI.pasting) cancelPlacing(); updateClip(); updatePanel(true); }, text:'×' }));
}
function tryPlace(x, y, keep){
  const type = UI.placing;
  if (!canPlace(type, x, y)){
    const why = placeWhy(type, x, y);
    Sfx.play('error');
    toast(why === 'water' ? TOWERS[type].name + ' floats: place it on water (the highlighted ' + waterWord() + ').' : why === 'land' ? 'Only boats and subs can go on the water.' : 'That spot is blocked. Keep clear of the trail and other appliances.', 'warn');
    return false;
  }
  const clip = UI.pasting;
  if (clip && clip.pack != null){
    const r = exPlacePack(clip.pack, x, y);
    if (!r.ok){ Sfx.play('error'); toast(r.why + '.', 'warn'); return false; }
    toast('Unpacked your ' + TOWERS[type].name + ' ' + r.t.up.join('-') + '.', 'gold');
    cancelPlacing(); buildAbilities(); buildShop();
    return true;
  }
  if (clip && clip.insta){
    const r = placeInsta(clip.insta, x, y);
    if (!r.ok){ Sfx.play('error'); toast(r.why + '.', 'warn'); return false; }
    toast('Placed your insta ' + TOWERS[type].name + ' ' + clip.up.join('-') + '.', 'gold');
    cancelPlacing(); buildAbilities(); updateShop(); updatePowerButton();
    return true;
  }
  if (clip && !canBuild(clip.type)){ Sfx.play('error'); toast(TOWERS[clip.type].name + (G.ch ? ' isn’t in today’s challenge.' : ' isn’t allowed in ' + G.M.name + '.'), 'warn'); return false; }
  const pc = clip ? pasteCost(clip, x, y) : null;
  const c = clip ? pc.cost : towerCost(type, x, y);
  if (clip && !pc.ok){ Sfx.play('error'); toast('Can’t paste that copy: ' + pc.why.toLowerCase() + '.', 'warn'); return false; }
  if (!canAfford(c)){ Sfx.play('error'); toast('Need ' + money(c - G.cash) + ' more for ' + (clip ? 'a copy of ' + clipName(clip) : 'a ' + TOWERS[type].name) + '.', 'warn'); return false; }
  if (coopGuest()){
    if (clip){ Sfx.play('error'); toast('In co-op, copies can only be pasted by the host.', 'warn'); return false; }
    coopCmd('place', type, Math.round(x), Math.round(y)); Coop.dirty = true;
    Hooks.sfx('place');
    if (!keep || TOWERS[type].hero) cancelPlacing();
    return true;
  }
  const t = placeTower(type, x, y);
  if (!t) return false;
  if (clip){
    for (let p = 0; p < 3; p++) while (t.up[p] < clip.up[p]) if (!upgradeTower(t, p)) break;
    if (targetModes(t).includes(clip.tg)) t.tg = clip.tg;
    if (clip.spot && t.s.spot) t.spot = { x: clip.spot.x, y: clip.spot.y };
    if (clip.fm && t.flyMode && flyModeOk(t, clip.fm)) t.flyMode = clip.fm;
    if (clip.lock && Object.values(t.s.atk).some(a => a.aim === 'pointer')) setLock(t, clip.lock);
    buildAbilities();
    toast('Pasted ' + clipName(clip) + ' for ' + money(c) + '.', 'gold');
  }
  if (!keep || t.hero) cancelPlacing();
  if (t.on && !Profile.seenSusan){ Profile.seenSusan = 1; saveProfile(); toast(TOWERS[t.type].name + ' is riding the Lazy Susan: it turns with the board and attacks faster. Selling the Lazy Susan sells what rides on it too.', 'gold'); }
  if (t.hero){
    buildHeroCard();
    if (!Profile.heroes.tip){ Profile.heroes.tip = 1; saveProfile(); toast(HEROES[t.type].name + ' is on duty! Every round you clear earns XP; ' + VERB.toLowerCase() + ' the chef to see the levels ahead.', 'gold'); }
  }
  updateShop();
  return true;
}
function waterWord(){
  const st = ((G.map && G.map.water) || []).map(w => w.style);
  const n = { sink:'sink', soda:'soda spill', puddle:'puddle', melt:'melt pool' }[st[0]] || 'water';
  return st.length > 1 ? n + 's' : n;
}
function select(t){
  UI.sel = t; UI.sellArmed = 0; UI.spotPick = null; UI.lockPick = null;
  if (t){ UI.placing = null; UI.ghost = null; $('#place-hint').hidden = true; Sfx.play('click'); }
  updatePanel(true); updateShop();
}
function bindStage(){
  const cv = $('#cv');
  cv.addEventListener('pointermove', ev => {
    const p = toLogical(ev);
    G.aimAt = p;
    if (ev.pointerType === 'touch') return;
    UI.pointer = p;
    if (UI.placing) setGhost(p.x, p.y);
    if (G.loaves.length) collectLoavesAt(p.x, p.y, 26);
    UI.hover = towerAt(p.x, p.y);
    cv.style.cursor = UI.placing || UI.spotPick || UI.lockPick || UI.powerPick ? 'crosshair' : UI.hover ? 'pointer' : 'default';
  });
  cv.addEventListener('pointerdown', ev => {
    Sfx.unlock();
    const p = toLogical(ev);
    if (!$('#pw-tray').hidden) closePowerTray();
    if (UI.powerPick){ UI.pointer = p; powerPickAt(p, ev); return; }
    if (!UI.placing && !UI.spotPick && !UI.lockPick) G.aimAt = p;
    if (UI.lockPick){
      const t = UI.lockPick;
      if (ev.button === 2){ UI.lockPick = null; updatePanel(true); return; }
      if (G.towers.includes(t)){ setLock(t, p); Sfx.play('click'); toast('Aim locked. It keeps firing at this spot.', ''); }
      UI.lockPick = null; updatePanel(true);
      return;
    }
    if (UI.spotPick){
      const t = UI.spotPick;
      if (ev.button === 2){ UI.spotPick = null; updatePanel(true); return; }
      if (G.towers.includes(t)){ t.spot = { x: clamp(p.x, 6, W - 6), y: clamp(p.y, 6, H - 6) }; Sfx.play('click'); toast('Target spot set.', ''); }
      UI.spotPick = null; updatePanel(true);
      return;
    }
    if (UI.placing){
      if (ev.pointerType === 'touch'){
        if (UI.ghost && Math.hypot(UI.ghost.x - p.x, UI.ghost.y - p.y) < 30 && UI.ghost.valid && UI.ghost.afford){ tryPlace(UI.ghost.x, UI.ghost.y); $('#place-hint').hidden = true; }
        else { setGhost(p.x, p.y); showPlaceHint(); }
      } else {
        if (ev.button === 2){ cancelPlacing(); return; }
        tryPlace(p.x, p.y, ev.shiftKey);
      }
      return;
    }
    if (G.loaves.length && collectLoavesAt(p.x, p.y, 36)) return;
    select(towerAt(p.x, p.y));
  });
  cv.addEventListener('pointerleave', () => { UI.hover = null; UI.pointer = null; if (UI.placing && UI.ghost && !IS_TOUCH) UI.ghost = null; });
  cv.addEventListener('contextmenu', ev => { ev.preventDefault(); if (UI.powerPick){ UI.powerPick = null; updatePowerButton(); return; } if (UI.spotPick || UI.lockPick) return; if (UI.placing) cancelPlacing(); else select(null); });
}

/* ---------------------------------------------------------------------
   HUD, toasts, boss bar
   --------------------------------------------------------------------- */
const hudCache = {};
function setText(sel, v){ if (hudCache[sel] !== v){ hudCache[sel] = v; const el = $(sel); if (el) el.textContent = v; } }
function updateHud(){
  setText('#hud-lives-n', G.admin.god ? '∞' : fmt(Math.max(0, G.lives)));
  setText('#hud-cash-n', G.admin.infCash ? '∞' : fmt(G.cash));
  setText('#hud-round-n', String(G.round));
  setText('#hud-round-of', G.M && G.M.sandbox ? 'sandbox' : (G.freeplay || G.won) ? 'freeplay' : '/ ' + G.win);
  const esc = escalation(G.round);
  if (hudCache.escRound !== G.round + G.diff){
    hudCache.escRound = G.round + G.diff;
    setText('#hud-esc-n', '+' + esc.hp + '%');
    const chip = $('#hud-esc');
    chip.classList.toggle('calm', esc.hp === 0);
    chip.title = 'Wave ' + G.round + ': pests have ' + esc.hp + '% more health and ' + esc.speed + '% more speed than wave 1, and every wave sends more of them.';
  }
  setText('#go-label', G.roundActive ? 'Cooking' : (G.won && !G.freeplay) ? 'Done' : 'Start');
  if (G.ev) setText('#mode-label', eventLabel());
  if (hudCache.bossRound !== G.round){ hudCache.bossRound = G.round; hudCache.bossNext = roundHasBoss(G.round); }
  buildPreview();
  const label = 'Round ' + G.round;
  const left = G.rushLeft != null ? G.rushLeft : UI.autoLeft;
  setText('#go-sub', !G.roundActive && left != null ? label + ' in ' + Math.max(1, Math.ceil(left)) + 's' : label);
  $('#btn-go').classList.toggle('btn-primary', !G.roundActive);
  setText('#btn-speed', G.speed + '×');
  if (G.bosses.length){
    for (const bar of $$('#boss-bars .boss-bar')){
      const e = G.bosses.find(b => b.id === +bar.dataset.id);
      if (!e) continue;
      bar.querySelector('.bf').style.width = clamp(e.hp / e.maxHp * 100, 0, 100).toFixed(1) + '%';
      const hpv = shortNum(e.hp) + ' / ' + shortNum(e.maxHp);
      const hpEl = bar.querySelector('.hpv'); if (hpEl.textContent !== hpv) hpEl.textContent = hpv;
      const st = bossStatus(e) || (e.shieldT > 0 ? 'Shielded' : e.burrowT > 0 ? 'Burrowed' : e.sprayT > 0 ? 'Spraying' : (e.type === 'flylord' && e.halfDone) ? 'Frenzy' : '');
      const stEl = bar.querySelector('.st'); if (stEl.textContent !== st) stEl.textContent = st;
      bar.classList.toggle('shield', e.shieldT > 0 || e.burrowT > 0);
      const pl = bar.querySelector('.bpl i'); if (pl) pl.style.width = clamp((e.plate || 0) / (e.plateMax || 1) * 100, 0, 100).toFixed(1) + '%';
      for (const [i, sk] of Array.from(bar.querySelectorAll('.sk')).entries()) sk.classList.toggle('gone', (e.skull || 0) > i);
    }
  }
}
function escalation(n){
  const r = waveRamp(n, G.D);
  return { hp: Math.round((r.hp * hpScale(n, false, false) - 1) * 100), speed: Math.round((r.speed * speedScale(n) - 1) * 100) };
}
/* what the coming (or current) wave holds */
function buildPreview(){
  const box = $('#preview');
  if (!box || !G.active || G.attract) return;
  const n = G.round, key = n + ':' + G.roundActive + ':' + G.mm + ':' + G.mode + ':' + G.over + ':' + G.won + ':' + G.freeplay;
  if (UI.previewKey === key) return;
  UI.previewKey = key;
  const groups = roundGroupsFor(n);
  const agg = new Map();
  for (const g of groups){
    const k = g.type + '|' + (ENEMIES[g.type].big ? g.mods.replace(/[cm]/g, '') : g.mods).replace('B', '');
    const a = agg.get(k) || { type: g.type, mods: k.split('|')[1], count: 0 };
    a.count += g.count; agg.set(k, a);
  }
  const list = [...agg.values()].sort((a, b) => ENEMIES[b.type].tier - ENEMIES[a.type].tier);
  box.innerHTML = '';
  box.append(h('span', { class:'pv-h', text: G.roundActive ? 'This wave' : 'Next wave' }));
  const tag = { c:'ghost', m:'moldy', a:'armored' };
  for (const a of list.slice(0, 7)){
    const d = ENEMIES[a.type];
    const mods = [...a.mods].map(c => tag[c]).filter(Boolean);
    box.append(h('span', { class:'pv' + (d.boss ? ' boss' : ''), title: a.count + ' ' + plural(d.name, a.count) + (mods.length ? ' (' + mods.join(', ') + ')' : '') },
      iconCanvas(Art.pestIcon(a.type, 64)), d.boss ? 'Boss' : '×' + fmt(a.count), mods.length ? h('i', { text: mods.map(m => m[0].toUpperCase()).join('') }) : null));
  }
  if (list.length > 7) box.append(h('span', { class:'pv', text: '+' + (list.length - 7) }));
  if (!UI.skipBtns) UI.skipBtns = [10, 100].map(n => h('button', { class:'btn btn-small skip', id:'btn-skip' + (n === 10 ? '' : n), 'data-n': n, onclick: () => skipPressed(n) }, 'Skip ' + n + ' ▸▸'));
  const wrap = h('span', { class:'skips' }, UI.skipBtns);
  box.append(wrap);
  updateSkipBtn();
}
function updateSkipBtn(){
  if (!UI.skipBtns) return;
  if (G.over) UI.skipQueued = 0;
  for (const b of UI.skipBtns){
    const n = +b.dataset.n, q = UI.skipQueued === n;
    b.disabled = !G.active || G.over || (G.won && !G.freeplay) || !!UI.skipping || Coop.on;
    b.classList.toggle('queued', q);
    b.textContent = q ? 'Skip ' + n + ' queued ✕' : 'Skip ' + n + ' ▸▸';
    b.title = q ? 'The skip forecast opens when this wave is cleared. Click to cancel.' : 'Play the next ' + n + ' waves instantly and see the result first';
  }
}
/* during a wave the skip is queued and opens as soon as the wave is cleared */
function skipPressed(n){
  if (!G.active || G.over || (G.won && !G.freeplay) || UI.skipping) return;
  if (Coop.on){ toast('Wave skips are off in co-op.', 'info'); return; }
  if (G.roundActive){
    UI.skipQueued = UI.skipQueued === n ? 0 : n;
    toast(UI.skipQueued ? 'Skip ' + n + ' will open as soon as wave ' + G.round + ' is cleared.' : 'Skip cancelled.', 'info');
    updateSkipBtn();
    return;
  }
  skipForecast(n);
}

/* ---------------------------------------------------------------------
   Wave skip: play the next 10 or 100 waves out instantly in the background,
   show the forecast with a warning, and only keep it if the player agrees.
   --------------------------------------------------------------------- */
/* the forecast runs the real simulation at a coarser 20 steps per second
   with nothing drawn, in long slices that only pause to update the bar */
const SKIP_K = 3, SKIP_DT = DT * SKIP_K, SKIP_SLICE_MS = 90;
const skipYield = (() => {
  if (typeof MessageChannel === 'undefined') return fn => setTimeout(fn, 0);
  const ch = new MessageChannel(), q = [];
  ch.port1.onmessage = () => { const fn = q.shift(); if (fn) fn(); };
  return fn => { q.push(fn); ch.port2.postMessage(0); };
})();
function skipForecast(count){
  count = count || 10;
  if (!G.active || G.attract || G.roundActive || G.over || (G.won && !G.freeplay) || UI.skipping) return;
  Sfx.unlock();
  const before = serializeGame(), profBefore = JSON.stringify(Profile);
  const keep = { hooks: Object.assign({}, Hooks), write: Store.write, push: Store.push, remove: Store.remove };
  for (const k in Hooks) Hooks[k] = () => {};
  Store.write = Store.push = Store.remove = () => {};
  G.vis = false; UI.skipping = true; G.paused = false;
  const start = G.round, lives0 = G.lives, cash0 = G.cash, kills0 = G.stats.kills, wasWon = G.won;
  const target = start + count;
  let cancelled = false;
  const bar = h('i'), note = h('p', { class:'note', text:'Playing wave ' + start + '…' });
  const earnN = h('b', { class:'num', text: money(0) }), livesN = h('b', { class:'num', text: fmt(lives0) });
  const tally = h('div', { class:'skip-tally' }, h('span', {}, 'Cash earned ', earnN), h('span', {}, 'Lives ', livesN));
  modal({ title:'Skipping ' + count + ' waves', lead:'Your kitchen is playing out waves ' + start + ' to ' + (target - 1) + ' at full speed. Abilities fire on their own and loaves are collected.' + (count > 10 ? ' This can take a little while.' : ''),
    content:[h('div', { class:'skip-prog' }, bar), tally, note], dismissable:false,
    actions:[{ label:'Cancel', onClick: () => { cancelled = true; } }] });
  let steps = 0, result = null, lostRound = 0;
  const restore = () => {
    for (const k in keep.hooks) Hooks[k] = keep.hooks[k];
    Store.write = keep.write; Store.push = keep.push; Store.remove = keep.remove;
    G.vis = true; UI.skipping = false;
  };
  const chunk = () => {
    if (cancelled){ setProfile(mergeProfile(JSON.parse(profBefore))); loadGame(before); restore(); UI.previewKey = null; updatePanel(true); bossBar(); toast('Skip cancelled. Nothing changed.', 'info'); return; }
    try {
      const t0 = performance.now();
      while (!result && performance.now() - t0 < SKIP_SLICE_MS){
        if (!G.roundActive){
          if (G.over){ result = 'lose'; break; }
          if (G.won && !wasWon){ result = 'win'; break; }
          if (G.round >= target){ result = 'ok'; break; }
          startRound(); steps = 0;
        }
        step(SKIP_DT); steps += SKIP_K;
        if (G.over){ result = 'lose'; lostRound = G.round; break; }
        if (G.loaves.length) collectLoavesAt(0, 0, 1e9);
        if (steps % 21 < SKIP_K) for (const ab of abilityList()) if (ab.cd <= 0) useAbility(ab.id);
        if (steps > 60 * 900){ result = 'lose'; lostRound = G.round; G.lives = 0; break; }
      }
    } catch (err) { console.error(err); result = 'error'; }
    const done = G.round - start + (G.roundActive ? 0.5 : 0);
    bar.style.width = clamp(done / count * 100, 0, 100) + '%';
    note.textContent = result ? 'Done.' : 'Playing wave ' + G.round + ' of ' + (target - 1) + '…';
    earnN.textContent = '+' + money(Math.max(0, Math.floor(G.cash - cash0)));
    livesN.textContent = fmt(Math.max(0, G.lives));
    if (cancelled || !result){ skipYield(chunk); return; }
    // capture the outcome, then put the real game back exactly as it was
    const keepState = result === 'lose' ? G.lastSnap : null;
    const out = { count, result, lostRound: lostRound || G.round, livesLost: Math.max(0, lives0 - Math.max(0, G.lives)), cash: Math.floor((keepState ? keepState.cash : G.cash) - cash0), cash0: Math.floor(cash0), kills: G.stats.kills - kills0,
      endRound: G.round, state: result === 'lose' ? G.lastSnap : serializeGame(), prof: JSON.stringify(Profile), lives: Math.max(0, G.lives) };
    setProfile(mergeProfile(JSON.parse(profBefore)));
    loadGame(before);
    restore();
    closeModal();
    showForecast(out, profBefore);
  };
  setTimeout(chunk, 30);
}
function showForecast(o, profBefore){
  if (o.result === 'error'){ toast('The forecast hit a problem, so nothing was skipped.', 'warn'); return; }
  const lose = o.result === 'lose', win = o.result === 'win';
  const head = lose ? 'You would lose on wave ' + o.lostRound + '.'
    : win ? 'You would win! The kitchen survives to the end of ' + G.D.name + '.'
    : 'You would survive all ' + o.count + ' waves.';
  const earned = Math.max(0, o.cash);
  const detail = lose ? 'The pests break through on wave ' + o.lostRound + ' and the game ends there.' + (earned > 0 ? ' You would earn ' + money(earned) + ' before that wave, and keep it if you retry.' : '')
    : 'You would lose ' + fmt(o.livesLost) + ' li' + (o.livesLost === 1 ? 'fe' : 'ves') + ' (' + fmt(o.lives) + ' left) and cook ' + fmt(o.kills) + ' pests. You would be on wave ' + o.endRound + '.';
  const cashBox = lose && earned <= 0 ? null : h('div', { class:'skip-cash' }, h('span', { class:'plus num', text: '+' + money(earned) }), h('span', { text: lose ? ' earned before the loss' : ' cash earned · you would have ' + money(o.cash0 + earned) }));
  const warn = lose ? 'Warning: if you skip anyway, the game ends on wave ' + o.lostRound + '. You can still retry that wave afterwards.'
    : o.lives <= Math.max(1, (G.ch ? G.ch.lives : G.D.lives) * 0.25) ? 'Warning: that leaves you very low on lives. You cannot build or upgrade during the skipped waves.'
    : 'Warning: you cannot build or upgrade during the skipped waves, and the result is final.';
  modal({ title:'Skip forecast', content:[h('div', { class:'forecast ' + (lose ? 'bad' : 'ok') }, h('b', { text: head }), h('p', { text: detail })), cashBox, h('p', { class:'note', style:{ color:'var(--cherry-deep)', fontWeight:600 }, text: warn })],
    actions:[{ label:'Keep playing normally' }, { label: lose ? 'Skip and lose' : 'Skip ' + o.count + ' waves', kind:'primary', onClick: () => applySkip(o, profBefore) }] });
}
function cashPop(v){
  const chip = $('#hud-cash'); if (!chip || v <= 0) return;
  chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop');
  const f = h('span', { class:'cash-float num', text: '+' + money(v) });
  chip.append(f); setTimeout(() => f.remove(), 1800); setTimeout(() => chip.classList.remove('pop'), 1200);
  Sfx.play('cash');
}
function applySkip(o, profBefore){
  const pb = JSON.parse(profBefore), medalsBefore = pb.medals || {};
  setProfile(mergeProfile(JSON.parse(o.prof))); saveProfile();
  /* what the skipped waves earned beyond cash */
  const dough = Math.max(0, (Profile.dough || 0) - (pb.dough || 0));
  const lv0 = chefLevel((pb.chef && pb.chef.xp) || 0).level, lv1 = chefLevel(Profile.chef.xp).level;
  const newAch = ACHIEVEMENTS.filter(A => Profile.ach[A.id] && !(pb.ach && pb.ach[A.id]));
  setTimeout(() => {
    if (dough) toast('The skipped waves earned ' + fmt(dough) + ' Dough' + (lv1 > lv0 ? ' and took you to chef level ' + lv1 : '') + '.', 'gold');
    for (const A of newAch.slice(0, 3)) toast('Achievement: ' + A.name + '! +' + A.dough + ' Dough', 'gold');
  }, 700);
  const dailyFirst = G.ch && !(pb.daily && pb.daily.ch && pb.daily.ch[G.ch.date]) && !!Profile.daily.ch[G.ch.date];
  const chef0 = heroOnDuty(), lv0h = chef0 ? chef0.level : 0;
  loadGame(o.state);
  const chef1 = heroOnDuty();
  if (chef1 && chef1.level > lv0h) setTimeout(() => toast(HEROES[chef1.type].name + ' reached level ' + chef1.level + ' during the skipped waves.', 'gold'), 900);
  UI.sel = null; UI.placing = null; UI.bossKey = null; UI.previewKey = null; UI.autoLeft = null;
  buildAbilities(); updatePanel(true); bossBar();
  if (o.result === 'lose'){
    storeGame(o.state);
    G.lives = 0; G.over = true;
    toast('Skipped ahead: the pests broke through on wave ' + o.lostRound + '.', 'warn');
    setTimeout(showDefeat, 300);
    return;
  }
  storeGame(o.state);
  cashPop(Math.max(0, o.cash));
  toast('Skipped to wave ' + G.round + ': lost ' + fmt(o.livesLost) + ' lives, earned ' + money(Math.max(0, o.cash)) + '.', o.livesLost ? 'warn' : 'gold');
  if (G.lives <= Math.max(1, (G.ch ? G.ch.lives : G.D.lives) * 0.25)) toast('Careful: only ' + fmt(G.lives) + ' lives left!', 'warn');
  if (o.result === 'win'){
    const m = (Profile.medals[G.mapId] || {}), mb = medalsBefore[G.mapId] || {};
    setTimeout(() => showVictory(!mb[G.diff] && !!m[G.diff], G.mm && !mb.mastery && !!m.mastery, G.ch ? { daily:true, first: dailyFirst, crate: G.ch.reward.crate, dough: G.ch.reward.dough } : null), 300);
  }
}
function roundHasBoss(n){ return roundGroupsRaw(n).some(g => ENEMIES[g[0]].boss || (g[4] || '').includes('B')); }
function bossBar(){
  const box = $('#boss-bars');
  const list = UI.screen === 'game' && !G.attract ? G.bosses.filter(b => !b.dead).slice(0, 3) : [];
  const key = list.map(b => b.id).join(',');
  if (key === UI.bossKey) return;
  UI.bossKey = key;
  box.innerHTML = '';
  box.classList.toggle('many', list.length > 1);
  for (const b of list){
    box.append(h('div', { class:'boss-bar', 'data-id': b.id },
      h('div', { class:'bn' }, h('span', {}, b.def.name + (b.armored ? ' (armored)' : ''), b.lvl > 1 ? h('span', { class:'lv', text: 'Lv ' + b.lvl }) : null, h('span', { class:'st' })), h('span', { class:'num hpv' })),
      h('div', { class:'bt' }, h('div', { class:'bf' }), ...bossSkulls(b).map(x => h('i', { class:'sk', style:'left:' + (x * 100).toFixed(1) + '%' }))),
      b.type === 'beetle' ? h('div', { class:'bpl' }, h('i')) : null));
  }
  placeBossBars();
}
/* keep boss bars clear of the HUD chips, and toasts clear of the bars */
function placeBossBars(){
  const box = $('#boss-bars'), tb = $('#toasts');
  box.style.top = '';
  if (!box.children.length){ tb.style.top = ''; return; }
  const st = $('#stage').getBoundingClientRect(), hud = $('.hud').getBoundingClientRect();
  let r = box.getBoundingClientRect();
  if (r.left < hud.right + 6 && r.top < hud.bottom + 4){ box.style.top = Math.round(hud.bottom - st.top + 6) + 'px'; r = box.getBoundingClientRect(); }
  tb.style.top = Math.round(r.bottom - st.top + 8) + 'px';
}
function shortNum(n){
  n = Math.max(0, n);
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e5) return Math.round(n / 1e3) + 'K';
  return fmt(n);
}
const BOSS_HINT = { ratking:'Summons mice as it marches.', flylord:'Keeps releasing swarms of flies.', greatmold:'Regrows unless it is burning.', skunk:'Its spray knocks out nearby appliances.',
  bigcheese:'Breaks into cheese wheels as it takes damage.', mole:'Burrows where nothing can hit it.', queen:'Hardens her shell and calls her brood.', raccoon:'Dashes forward every few seconds.' };
Object.assign(BOSS_HINT, BOSS_HINT2);
function announceBoss(e){
  toast('Boss: ' + e.def.name + (e.lvl > 1 ? ' (level ' + e.lvl + ')' : '') + '. ' + (BOSS_HINT[e.type] || ''), 'warn');
}
function toast(msg, kind){
  if (UI.screen !== 'game') return;
  const box = $('#toasts');
  const t = h('div', { class:'toast' + (kind ? ' t-' + kind : ''), text: msg });
  box.append(t);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, kind === 'gold' ? 4200 : 3200);
}
function flashSaved(){
  const d = $('#saved-dot'); if (!d) return;
  d.classList.add('show'); clearTimeout(flashSaved.t); flashSaved.t = setTimeout(() => d.classList.remove('show'), 1200);
}

/* ---------------------------------------------------------------------
   Shop
   --------------------------------------------------------------------- */
/* appliances in faction order (built-in order inside each faction) */
function factionSorted(list){
  const fi = t => FACTION_ORDER.indexOf(factionOf(t)), oi = t => TOWER_ORDER.indexOf(t);
  return list.slice().sort((a, b) => fi(a) - fi(b) || oi(a) - oi(b));
}
function factionsInUse(){ return FACTION_ORDER.filter(f => TOWER_ORDER.some(t => factionOf(t) === f)); }
/* a row of faction filter chips: 'all' plus every faction that has appliances */
function factionChips(cur, onPick, short){
  const bar = [h('button', { class:'fchip', 'aria-pressed': String(cur === 'all'), onclick: () => onPick('all'), text:'All' })];
  for (const f of factionsInUse()){
    const F = FACTIONS[f];
    bar.push(h('button', { class:'fchip', style:'--fc:' + F.color, 'aria-pressed': String(cur === f), title: F.name + ': ' + F.blurb, onclick: () => onPick(f) },
      h('i', { 'aria-hidden':'true' }), short ? F.name.replace('Front of House', 'Support').replace(' Station', '') : F.name));
  }
  return bar;
}
function shopFaction(){ const f = Profile.settings.shopFaction; return f && f !== 'all' && FACTIONS[f] && factionsInUse().includes(f) ? f : 'all'; }
function buildShop(){
  buildHeroCard();
  const shop = $('#shop'); shop.innerHTML = '';
  const cur = shopFaction();
  const bar = $('#shop-factions');
  bar.innerHTML = '';
  bar.hidden = !!G.ch;
  if (G.M && G.M.only) bar.hidden = true;
  if (G.ch && G.ch.tm) shop.append(h('p', { class:'fnote ch-note', id:'crew-note', text: crewNoteText() }));
  else if (G.ch && G.ch.ex) exShopBits(shop);
  else if (G.ch) shop.append(h('p', { class:'fnote ch-note', text:'Daily challenge: these ' + G.ch.towers.length + ' appliances only.' }));
  else if (G.M && G.M.only) shop.append(h('p', { class:'fnote ch-note', text: G.M.name + ': ' + FACTIONS[G.M.only].name + ' appliances and your head chef.' }));
  else bar.append(...factionChips(cur, f => { Profile.settings.shopFaction = f; saveProfile(); Sfx.play('click'); buildShop(); }, true));
  let last = null;
  const card = (type, fav) => {
    const T = TOWERS[type], F = FACTIONS[factionOf(type)];
    return h('button', { class:'card' + (T.custom ? ' custom' : '') + (fav ? ' fav' : ''), style:'--fc:' + F.color, 'data-type': type, title: T.name + (T.hot ? ' (' + T.hot + ')' : ' (custom)') + ' · ' + F.name + (fav ? ' · favourite' : ''), onclick: () => startPlacing(type), onmouseenter: () => showInfo(type), onfocus: () => showInfo(type), onmouseleave: () => showInfo(UI.placing),
      oncontextmenu: ev => { ev.preventDefault(); if (!T.hero){ const on = toggleFav(type); Sfx.play('click'); toast((on ? 'Starred ' : 'Unstarred ') + T.name + '.', 'info'); buildShop(); } } },
      h('span', { class:'hk', text: T.custom ? '✦' : T.hot }), iconCanvas(Art.towerIcon(type, 64)), h('span', { class:'nm', text: T.name }), h('span', { class:'pr num' }), h('span', { class:'st' }));
  };
  gmBuffCards(shop);
  favCards(shop, card);
  const shopTypes = factionSorted(TOWER_ORDER.filter(canBuild));
  if (adminUnitOn() && !G.towers.some(t => t.type === ADMIN_UNIT)) shopTypes.push(ADMIN_UNIT);
  for (const type of shopTypes){
    const T = TOWERS[type], f = factionOf(type), F = FACTIONS[f];
    if (!G.ch && !(G.M && G.M.only) && cur !== 'all' && f !== cur) continue;
    if (cur === 'all' && f !== last){ last = f; shop.append(h('div', { class:'fhead', style:'--fc:' + F.color, title: F.blurb }, h('i', { 'aria-hidden':'true' }), F.name)); }
    shop.append(card(type));
  }
  if (!G.ch && !(G.M && G.M.only) && cur !== 'all') shop.append(h('p', { class:'fnote', text: 'Showing ' + FACTIONS[cur].name + '. Hotkeys still pick any appliance.' }));
  updateShop(); showInfo(null);
}
let shopRebuildT = 0;
function buildShopSoon(){ clearTimeout(shopRebuildT); shopRebuildT = setTimeout(() => { if (UI.screen === 'game' && G.active) buildShop(); }, 40); }
function crewNoteText(){ return 'Your crew: ' + G.ch.towers.map(t => TOWERS[t].name + ' ×' + Math.max(0, crewLeft(t))).join(', ') + ' left.'; }
function updateShop(){
  updateHeroCard();
  gmBuffCardsUpdate();
  if (G.ch && G.ch.tm){ const n = $('#crew-note'); const txt = crewNoteText(); if (n && n.textContent !== txt){ n.textContent = txt; buildShopSoon(); } }
  for (const card of $$('#shop .card[data-type]')){
    const type = card.dataset.type;
    const c = towerCost(type);
    const pr = '$' + fmt(c);
    const prEl = card.querySelector('.pr'); if (prEl.textContent !== pr) prEl.textContent = pr;
    card.classList.toggle('poor', !canAfford(c));
    card.classList.toggle('sel', UI.placing === type && !UI.pasting);
    const r = masteryRank(type);
    const st = r >= 6 ? '★'.repeat(r - 5) : '';
    const stEl = card.querySelector('.st'); if (stEl.textContent !== st) stEl.textContent = st;
  }
}
function showInfo(type){
  const box = $('#shop-info');
  box.innerHTML = '';
  if (!type){
    box.append(h('b', { text: 'Pick an appliance' }), VERB + ' one, then ' + VERB.toLowerCase() + ' the kitchen to place it. ' + VERB + ' a placed appliance to upgrade it.' + (IS_TOUCH ? '' : ' Right-click cancels.'));
    return;
  }
  if (isHero(type)){ heroInfo(box, type); return; }
  const T = TOWERS[type];
  box.append(h('b', { text: T.name + ' · ' + FACTIONS[factionOf(type)].name + (T.custom ? ' · custom ' + T.role.toLowerCase() : '') }), T.blurb + ' ', h('span', { style:{ color:'var(--mint)', fontWeight:600 }, text: RANKS[masteryRank(type)].name + ' mastery.' }), ' ', favButton(type));
}

/* ---------------------------------------------------------------------
   Tower panel
   --------------------------------------------------------------------- */
function panelKey(t){ return t ? [t.id, t.level || 0, skinOf(t.type), t.up.join(''), t.paragon, t.degree, t.tg, t.flyMode || '', !!t.lock, UI.lockPick === t, Math.round(t.bank || 0), UI.sellArmed > 0, masteryRank(t.type), G.towers.length, JSON.stringify(t.buffs || {}), !!t.spot, UI.spotPick === t, t.stunT > 0, t.tb ? Object.keys(t.tb).join(',') : '', t.stack || 0, t.ub || 0, !!t.wet, t.mixKey || '', t.rushN || 0, t.oakN || 0, !!t.nonnaMix, t.nozzle || ''].join('|') : ''; }
function updatePanel(force){
  const t = UI.sel && G.towers.includes(UI.sel) ? UI.sel : null;
  if (!t && UI.sel) UI.sel = null;
  $('#tpanel').hidden = !t;
  $('#shop-wrap').hidden = !!t;
  if (!t){ UI.panelKey = ''; if (UI.abPreview && UI.abPreview.t) UI.abPreview = null; return; }
  const key = panelKey(t);
  if (force || key !== UI.panelKey){ UI.panelKey = key; buildPanel(t); }
  refreshPanel(t);
}
const TARGET_LABEL = { first:'First', last:'Last', close:'Close', strong:'Strong' };
const TRAP_LABEL = { strong:'Spread', first:'Exit', last:'Entry', close:'Close' };
function targetModes(t){ return trapTower(t.type) ? ['strong', 'first', 'last', 'close'] : ['first', 'last', 'close', 'strong']; }
function targetLabel(t, k){ return trapTower(t.type) ? TRAP_LABEL[k] : TARGET_LABEL[k]; }
const TARGET_TIP = { first:'the pest nearest the pantry', last:'the pest furthest back', close:'the closest pest', strong:'the toughest pest' };
const TRAP_TIP = { strong:'anywhere on the trail in range', first:'near the pantry end of its range', last:'near the entrance end of its range', close:'close to the machine' };
function buffChips(t){
  const b = t.buffs || {}, out = [];
  if (b.speed > 1) out.push((b.speedBy === 'espresso' ? 'Caffeinated' : b.speedBy === 'boat' ? 'Flagship' : 'Boosted') + ' +' + Math.round((b.speed - 1) * 100) + '% speed');
  if (b.polar > 1) out.push('Chilled +' + Math.round((b.polar - 1) * 100) + '% speed');
  if (b.pierce) out.push('+' + b.pierce + ' pierce');
  if (b.dmg) out.push('+' + b.dmg + ' damage');
  if (b.range > 1) out.push('+' + Math.round((b.range - 1) * 100) + '% range');
  if (b.camo && !t.base.camo) out.push('Ghost sight');
  if (b.allTypes) out.push('Ignores immunities');
  if (b.energize) out.push('Abilities +' + Math.round(b.energize * 100) + '% recharge');
  /* riding a Lazy Susan */
  if (t.on && b.ride) out.push('On a Lazy Susan +' + Math.round((b.ride - 1) * 100) + '% speed' + (b.rideRange > 1 ? ', +' + Math.round((b.rideRange - 1) * 100) + '% range' : ''));
  if (t.on && t.spinSp > 1) out.push('Carousel wind-up +' + Math.round((t.spinSp - 1) * 100) + '%');
  for (const k in t.boost){ const nm = { barrage:'Barrage', sugar:'Sugar rush', delivery:'Delivery rush', dance:'Knife Dance', storm:'Blade Storm', liquefy:'Liquefy', overmix:'Overmix', boil:'Rolling Boil', reaper:'Reaper Mode', refill:'Bottomless Refill', steam:'Full Steam', bird:'Fire Bird', fan:'Fan the Hammer', flurry:'Flurry', fullspin:'Full Spin' }[k] || k; out.push(nm + (t.boost[k].mult !== 1 ? ' ×' + t.boost[k].mult : '')); }
  /* the second wave's timed buffs and stacks */
  if (t.tb) for (const k in t.tb){
    const b = t.tb[k];
    if (b.until <= G.time) continue;
    const left = b.until === Infinity ? ' for good' : '';
    const nm = { brew:'Brewed', aim:'Taking aim', monster:'Sauce monster', clock:'Overclocked', angry:'Angry', elixir:'Elixir' }[k] || k;
    out.push(nm + left);
  }
  if (t.ub) out.push('Ultraboost ×' + t.ub);
  if (t.stack && t.type === 'mandoline') out.push('Brigade ×' + t.stack + ' · +' + Math.round(t.stack * 8) + '%');
  if (t.s && t.s.lone) out.push(t.stack === 0 ? 'Lone Ranger +40% speed' : t.stack === 1 ? 'Lone Ranger +20% speed' : t.stack === 2 ? 'Lone Ranger +10% speed' : 'Lone Ranger: too crowded');
  if (t.stack && t.type === 'lobster' && t.s && t.s.echo) out.push('Echo network ×' + t.stack);
  if (t.stack && t.type === 'pets') out.push('Pack ×' + t.stack);
  if (t.wet) out.push('In the water +35% range');
  if (G.glob.sabotage && t.type === 'mandoline' && G.glob.sabotage.boost > 1) out.push('Sabotage +' + Math.round((G.glob.sabotage.boost - 1) * 100) + '% speed');
  if (gridOn(t)) out.push('On the Automat’s power grid');
  /* a stand mixer's temper, and what the Grand Planetary Mixer does */
  if (t.type === 'mixer' && t.s){
    const s = t.s;
    if (s.vengeance){ const n = Math.min(s.vengeance.max, livesLost()); out.push('Bitter Batter +' + Math.round((s.vengeance.base + s.vengeance.per * n) * 100) + '% speed'); }
    if (s.wrath) out.push(t.wrathN ? 'Frenzy ×' + t.wrathN + ' · +' + Math.round(t.wrathN * s.wrath.step * 100) + '% speed' : 'Frenzy: not yet');
    if (t.rushN) out.push('Dinner Rush ×' + t.rushN + ' · +' + Math.round(t.rushN * 15) + '%');
    if (s.fury) out.push('Fury +' + (t.dmgAdd || 0) + ' damage');
    if (s.oak && t.oakN) out.push('Sourdough +' + t.oakN + '% pierce');
    if (t.sys && t.sys.over) out.push('Overmixing · no income');
  }
  if (t.nonnaMix) out.push('With the Grand Planetary Mixer: 11× damage, abilities 65% sooner');
  if (t.stunT > 0) out.push(stunReason(t));
  else if (t.heat > 0.05) out.push('Heating up: ' + Math.round(t.heat * 100) + '%');
  return out;
}
function buildPanel(t){
  if (t.hero){ buildHeroPanel(t); return; }
  const P = $('#tpanel'); P.innerHTML = '';
  const T = TOWERS[t.type];
  const rank = masteryRank(t.type);
  const up = t.paragon ? [5, 5, 5] : t.up;
  P.append(h('div', { class:'tp-head' },
    iconCanvas(Art.towerIcon(t.type, 64, up, t.paragon)),
    h('div', { class:'tp-title' },
      h('div', { class:'tp-name', text: t.paragon ? T.paragon.name : T.name }),
      h('div', { class:'tp-sub', text: t.paragon ? 'Paragon · Degree ' + t.degree : RANKS[rank].name + ' · ' + t.up.join('-') }),
      t.paragon ? null : skinChip(t.type)),
    h('button', { class:'icon-btn', 'aria-label':'Close', title:'Close (Esc)', onclick: () => select(null), text:'×' })));
  const stats = h('div', { class:'tp-stats', id:'tp-stats' });
  P.append(stats);
  const chips = buffChips(t);
  if (chips.length) P.append(h('div', { class:'buffs' }, chips.map(c => h('span', { text: c }))));
  if (t.type === 'susan') P.append(susanBox(t));
  if (t.on && G.towers.includes(t.on)) P.append(h('div', { class:'note ride-note' }, h('span', { text:'Riding a Lazy Susan, and sold along with it. ' }), h('button', { class:'linkish', onclick: () => select(t.on) }, 'Select the Lazy Susan')));
  if (t.paragon){ P.append(h('p', { class:'note', text: T.paragon.desc })); P.append(degreeBox(t)); const pb = paraBox(t); if (pb) P.append(pb); }
  if (!t.s.noTarget && Object.keys(t.s.atk).length){
    const trap = trapTower(t.type);
    const seg = h('div', { class:'seg', role:'group', 'aria-label': trap ? 'Where to lay pasta' : 'Targeting' });
    for (const k of targetModes(t)) seg.append(h('button', { 'aria-pressed': String(t.tg === k), title: (trap ? 'Lay pasta ' + TRAP_TIP[k] : 'Target ' + TARGET_TIP[k]) + ' (Tab cycles)', onclick: () => { t.tg = k; updatePanel(true); }, text: targetLabel(t, k) }));
    const aims = Object.values(t.s.atk).filter(a => a.aim === 'pointer').length, all = Object.keys(t.s.atk).length;
    if (aims < all) P.append(seg);
    if (aims){
      const picking = UI.lockPick === t, who = IS_TOUCH ? 'taps' : 'pointer';
      P.append(h('div', { class:'spot-row' },
        h('span', { class:'spot-txt', text: picking ? VERB + ' the kitchen to lock its aim' : t.lock ? 'Aim locked on a spot' : 'Aim follows your ' + who }),
        h('div', { class:'seg seg2', role:'group', 'aria-label':'Aim' },
          h('button', { 'aria-pressed': String(!t.lock && !picking), title:'Fire wherever you point', onclick: () => { UI.lockPick = null; if (t.lock){ setLock(t, null); toast('Aim unlocked. It follows your ' + who + ' again.', ''); } updatePanel(true); }, text:'Follow' }),
          h('button', { 'aria-pressed': String(!!t.lock || picking), title:'Lock its aim on one spot so it keeps firing there', onclick: () => { UI.lockPick = picking ? null : t; updatePanel(true); if (!picking) toast(VERB + ' anywhere in the kitchen to lock its aim there.', 'info'); }, text: picking ? 'Cancel' : t.lock ? 'Move lock' : 'Lock' }))));
      const some = aims === all ? '' : aims === 1 ? 'One of its attacks ' : 'Some of its attacks ';
      P.append(h('p', { class:'note aim-note', text: picking
        ? 'Once locked, it keeps firing at that spot while you point elsewhere, and during skips.' + (IS_TOUCH ? '' : ' Esc cancels.')
        : t.lock
        ? (some ? some + 'fires' : 'Fires') + ' at the locked spot, anywhere on the map, even during skips.'
        : (some ? some + 'aims' : 'Aims') + ' wherever you point: ' + (IS_TOUCH ? 'tap the kitchen to move the target.' : 'move your mouse over the kitchen.') + ' It hits anywhere on the map.' }));
    }
  }
  const fly = TOWERS[t.type].flyer;
  if (fly){
    const seg = h('div', { class:'seg', role:'group', 'aria-label': fly === 'saucer' ? 'Flight path' : 'How it flies' });
    for (const m of FLY_MODES[fly]){
      const ok = flyModeOk(t, m.id);
      seg.append(h('button', { 'aria-pressed': String(t.flyMode === m.id), disabled: !ok, title: ok ? m.tip : 'Unlocked by ' + m.lock, onclick: () => { if (!flyModeOk(t, m.id)) return; t.flyMode = m.id; Sfx.play('click'); updatePanel(true); }, text: m.name }));
    }
    P.append(h('div', { class:'fly-row' }, h('span', { class:'fly-txt', text: fly === 'saucer' ? 'Flight path' : 'Flight' }), seg));
    if (fly === 'copter' && t.flyMode === 'follow') P.append(h('p', { class:'note aim-note', text: 'Flies to wherever you ' + (IS_TOUCH ? 'tap in the kitchen.' : 'point in the kitchen.') + ' When you are not pointing, it patrols near its pad.' }));
  }
  /* a rice cooker: how far it has cooked, the pots it keeps warm, and opening the lid early */
  if (t.s.atk.main && t.s.atk.main.kind === 'cook'){
    const c = riceCharge(t), a = t.s.atk.main;
    const meter = h('div', { class:'rice-meter', id:'rice-meter' }, h('i', { style:{ width: Math.round(c * 100) + '%' } }));
    const label = h('span', { class:'fly-txt', id:'rice-label', text: c >= 1 ? 'Ready: waiting for pests' : 'Cooking ' + Math.round(c * 100) + '%' });
    const kept = a.store ? h('span', { class:'rice-kept', id:'rice-kept', text: 'Kept warm: ' + (t.riceStore || 0) + ' of ' + a.store }) : null;
    const btn = h('button', { class:'btn btn-small', id:'rice-lid', title:'Let the steam out now. The less it has cooked, the weaker the burst (it needs at least a quarter).', onclick: () => {
      if (coopGuest()){ toast('In co-op, only the host can open the lid early.', 'info'); return; }
      if (riceOpenLid(t)) Sfx.play('click'); else { Sfx.play('error'); toast(riceCharge(t) < 0.25 ? 'The rice has barely started cooking.' : 'No pests in range to steam.', 'warn'); }
    } }, 'Open the lid');
    P.append(h('div', { class:'fly-row rice-row' }, label, meter, h('div', { class:'rice-acts' }, btn, kept)));
  }
  /* a spray bottle's nozzle: twist it between a wide mist and a long jet */
  if (t.s.sprayStream && !t.paragon){
    const cur = nozzleOf(t);
    const seg = h('div', { class:'seg', role:'group', 'aria-label':'Nozzle' },
      [['mist', 'Mist', 'A wide cone at the pests close by'], ['stream', 'Stream', 'A long jet through a line of pests, pushing them back']].map(([id, name, tip]) =>
        h('button', { 'aria-pressed': String(cur === id), title: tip, onclick: () => { if (nozzleOf(t) === id) return; setNozzle(t, id); Sfx.play('click'); updatePanel(true); }, text: name })));
    P.append(h('div', { class:'fly-row' }, h('span', { class:'fly-txt', text:'Nozzle' }), seg));
  }
  if (t.s.spot){
    const picking = UI.spotPick === t;
    P.append(h('div', { class:'spot-row' },
      h('span', { class:'spot-txt', text: picking ? VERB + ' the kitchen to aim' : t.spot ? 'Aiming at a fixed spot' : 'Aiming at pests' }),
      h('div', { class:'seg seg2', role:'group', 'aria-label':'Pizza target' },
        h('button', { 'aria-pressed': String(!t.spot && !picking), title:'Aim at pests using the targeting above', onclick: () => { t.spot = null; UI.spotPick = null; updatePanel(true); }, text:'Auto' }),
        h('button', { 'aria-pressed': String(!!t.spot || picking), title:'Pick a spot on the map to bombard', onclick: () => { UI.spotPick = picking ? null : t; updatePanel(true); if (!picking) toast(VERB + ' anywhere in the kitchen to set the target.', 'info'); }, text: picking ? 'Cancel' : t.spot ? 'Move spot' : 'Set spot' }))));
  }
  if (!t.paragon) for (let p = 0; p < 3; p++) P.append(pathRow(t, p));
  const ps = paragonState(t), ms = mergeState(t);
  if (ms) P.append(mergeBox(t, ms));
  else if (ps) P.append(paragonBox(t, ps));
  if (UI.abPreview && UI.abPreview.t && !UI.abPreview.until) UI.abPreview = null;
  if (t.s.abilities.length) P.append(abilitySection(t));
  if (t.s.bread && t.s.bread.bank){
    P.append(h('div', { class:'bank' },
      h('span', {}, 'Bank ', h('b', { class:'num', id:'bank-amt', text: money(t.bank || 0) }), ' of ' + money(t.s.bread.bank.cap)),
      h('button', { class:'btn btn-small btn-gold', onclick: () => { const v = Math.floor(t.bank || 0); if (v <= 0) return; addCash(v, true); t.bank = 0; Sfx.play('cash'); toast('Withdrew ' + money(v) + ' from the sourdough bank.', 'gold'); updatePanel(true); } }, 'Withdraw')));
  }
  const sellBtn = sellButton(t, t.type === 'susan' && ridersOf(t).length ? 'Sells everything riding on it too' : null);
  const copyBtn = t.paragon ? null : h('button', { class:'btn btn-small', id:'copy-btn', title:'Copy this appliance with its upgrades' + (IS_TOUCH ? '' : ' (Ctrl+C)'), onclick: () => copyTower(t) }, 'Copy');
  P.append(h('div', { class:'tp-foot' }, copyBtn, sellBtn));
}
/* a Lazy Susan's seats and what rides on them */
function susanBox(t){
  const n = (t.s && t.s.seats) || 1, riders = ridersOf(t);
  const box = h('div', { class:'psys susan-box' }, h('div', { class:'psys-head' }, h('b', { text: 'Seats · ' + riders.length + ' of ' + n + ' taken' })));
  const list = h('div', { class:'seats' });
  for (let i = 0; i < n; i++){
    const r = riders.find(o => o.seat === i);
    list.append(r ? h('button', { class:'seat', title:'Select it', onclick: () => select(r) }, iconCanvas(Art.towerIcon(r.type, 32, r.paragon ? [5, 5, 5] : r.up, r.paragon)), h('span', { text: (r.paragon ? TOWERS[r.type].paragon.name : TOWERS[r.type].name + ' ' + r.up.join('-')) }))
      : h('span', { class:'seat empty', text:'Empty seat' }));
  }
  box.append(list);
  const spin = Math.round(((t.s && t.s.spin) || 1) * 100 - 100);
  box.append(h('p', { class:'psys-note', text: riders.length < n
    ? 'Place an appliance over the board to seat it (not boats, aircraft or head chefs). Riders turn with the board and attack ' + spin + '% faster.'
    : 'Every seat is taken. Riders attack ' + spin + '% faster.' + (n < 3 && !t.paragon ? ' Size upgrades add seats.' : '') }));
  return box;
}
/* sell takes two presses: the first arms it */
function sellButton(t, note){
  if (!canSell()) return h('button', { class:'btn btn-small sell', id:'sell-btn', disabled:true, title:'No refunds in today’s challenge' }, 'No refunds');
  return h('button', { class:'btn btn-small sell' + (UI.sellArmed > 0 ? ' armed' : ''), id:'sell-btn', title: note || null, onclick: () => {
    if (Coop.on && !coopCanTouch(t)){ Sfx.play('error'); toast('That’s ' + Coop.names[t.own || 0] + '’s appliance: only they can sell it.', 'warn'); return; }
    if (UI.sellArmed > 0){ const v = sellTower(t); UI.sellArmed = 0; toast('Sold for ' + money(v) + '.', ''); select(null); }
    else { UI.sellArmed = 2.5; updatePanel(true); }
  } }, UI.sellArmed > 0 ? 'Confirm: sell for ' + money(sellValue(t)) : 'Sell for ' + money(sellValue(t)));
}
function pathRow(t, p){
  const T = TOWERS[t.type], path = T.paths[p], tier = t.up[p];
  const row = h('div', { class:'path', style: '--pc:' + PATH_COLORS[p] });
  const pips = h('span', { class:'pips', 'data-p': p, role:'group', 'aria-label': 'Tier ' + tier + ' of 5. Pick a square to upgrade up to that tier.' });
  for (let i = 0; i < 5; i++){
    const pip = h('button', { class: i < tier ? 'on' : '', 'data-tier': i + 1, onclick: ev => { ev.stopPropagation(); buyToTier(p, i + 1); } });
    pip.addEventListener('pointerenter', () => {
      for (const q of pips.children) q.classList.toggle('pre', +q.dataset.tier <= i + 1 && !q.classList.contains('on'));
      const cur = row.querySelector('.path-cur'); if (!cur || i + 1 <= t.up[p]) return;
      const plan = planToTier(t, p, i + 1);
      cur.textContent = plan.full ? 'To tier ' + (i + 1) + ': ' + money(plan.cost) : plan.why;
      cur.classList.add('hint');
    });
    pips.append(pip);
  }
  pips.addEventListener('pointerleave', () => {
    for (const q of pips.children) q.classList.remove('pre');
    const cur = row.querySelector('.path-cur'); if (cur){ cur.textContent = t.up[p] ? path.ups[t.up[p] - 1].name : 'Not upgraded'; cur.classList.remove('hint'); }
  });
  row.append(h('div', { class:'path-head' }, h('span', { text: path.name }), pips, h('span', { class:'path-cur', text: tier ? path.ups[tier - 1].name : 'Not upgraded' })));
  const st = upgradeState(t, p);
  if (st.max){
    row.append(h('div', { class:'upg max' }, iconCanvas(Art.towerIcon(t.type, 64, t.up)), h('span', {}, h('b', { text:'Fully upgraded' }), h('small', { text: path.ups[4].desc }))));
    return row;
  }
  const u = path.ups[tier];
  const nextUp = t.up.slice(); nextUp[p]++;
  const notes = [];
  if (st.closed) notes.push(h('small', { class:'lock-note', text: st.why }));
  if (st.mastery){
    const xp = Profile.mastery[t.type] || 0, need = RANKS[st.mastery].xp, prev = RANKS[st.mastery - 1] ? RANKS[st.mastery - 1].xp : 0;
    notes.push(h('small', { class:'lock-note', text: st.why + ': ' + fmt(xp) + ' / ' + fmt(need) + ' XP' }));
    notes.push(h('span', { class:'xpbar' }, h('i', { style: { width: clamp((xp - prev) / (need - prev) * 100, 0, 100) + '%' } })));
  }
  const btn = h('button', { class:'upg', 'data-p': p, title: u.name + ' (' + [',', '.', '/'][p] + ')', onclick: () => buyUpgrade(p) },
    iconCanvas(Art.towerIcon(t.type, 64, nextUp)),
    h('span', {}, h('b', { text: u.name }), h('small', { text: u.desc }), notes),
    h('span', { class:'price num' }));
  row.append(btn);
  return row;
}
function paragonBox(t, ps){
  const T = TOWERS[t.type];
  const box = h('div', { class:'paragon' }, h('h4', { text: T.paragon.name }), h('div', { class:'why', text: T.paragon.desc }));
  const ul = h('ul');
  T.paths.forEach((pth, i) => ul.append(h('li', { class: ps.has[i] ? 'ok' : '', text: (ps.has[i] ? '✓ ' : '✗ ') + 'A tier 5 ' + pth.name + ' ' + T.name })));
  if (!T.custom) ul.append(h('li', { class: ps.rankOk ? 'ok' : '', text: (ps.rankOk ? '✓ ' : '✗ ') + RANKS[5].name + ' mastery' }));
  if (ps.exists) ul.append(h('li', { text:'✗ Only one paragon of each kind' }));
  box.append(ul);
  box.append(h('div', { class:'why', text:'Merges every ' + T.name + ' you own into one paragon. Estimated degree ' + ps.degree + ' of 100.' }));
  box.append(poolList(ps.pools, true));
  box.append(h('div', { class:'why', text:'Its degree keeps rising after it is built: from the damage it deals, cash you invest in it and copies you merge into it, up to 100.' }));
  box.append(h('button', { class:'btn btn-small btn-gold', id:'paragon-btn', onclick: () => {
    if (makeParagon(t)){ updatePanel(true); buildAbilities(); }
    else { Sfx.play('error'); if (ps.ok) toast('Need ' + money(ps.cost - G.cash) + ' more for the paragon.', 'warn'); }
  } }, 'Build paragon · ' + money(ps.cost)));
  return box;
}
/* Paragon degree: where its power comes from, and how to add more */
const POOL_TXT = {
  cash: ['Cash', 'every $1 spent on copies with no tier 5, or invested here'],
  dmg: ['Damage and income', '1 for every 120 damage or $45 it makes, counted at the end of each round'],
  t5: ['Extra tier 5s', '6,000 for each tier 5 beyond the first three'],
  ups: ['Upgrades', '100 per tier on copies with no tier 5'],
};
function poolList(P, brief){
  const ul = h('ul', { class:'pools' });
  for (const k of PARA_POOLS){
    const v = Math.min(PARA_CAP[k], P[k] || 0), full = v >= PARA_CAP[k];
    ul.append(h('li', { class: full ? 'full' : '' }, h('span', { class:'pl-k', text: POOL_TXT[k][0] }), h('b', { class:'num', text: fmt(Math.floor(v)) + ' / ' + fmt(PARA_CAP[k]) }),
      brief ? null : h('small', { text: POOL_TXT[k][1] }), h('i', { style:{ width: (v / PARA_CAP[k] * 100).toFixed(1) + '%' } })));
  }
  return ul;
}
function degreeBox(t){
  const P = paraPools(t), pow = poolTotal(P), d = t.degree;
  const box = h('div', { class:'psys degree', id:'degree-box' }, h('div', { class:'psys-head' }, h('b', { text: 'Degree ' + d + ' of 100' })));
  const lo = powerFor(d), hi = powerFor(Math.min(100, d + 1));
  box.append(h('div', { class:'psys-meter' }, h('i', { style:{ width: (d >= 100 ? 100 : clamp((pow - lo) / (hi - lo), 0, 1) * 100).toFixed(1) + '%', background:'#ffd166' } }),
    h('span', { text: d >= 100 ? 'Top degree' : fmt(Math.ceil(hi - pow)) + ' power to degree ' + (d + 1) })));
  box.append(poolList(P, false));
  const room = Math.max(0, PARA_CAP.cash - (P.cash || 0));
  if (room > 0 && d < 100){
    const invest = amt => () => {
      const v = paragonInvest(t, amt);
      if (v > 0){ Sfx.play('cash'); toast('Invested ' + money(v) + ' in ' + TOWERS[t.type].paragon.name + '.', 'gold'); }
      else { Sfx.play('error'); toast(room <= 0 ? 'Its cash pool is full.' : 'Not enough cash.', 'warn'); }
      updatePanel(true);
    };
    const maxAmt = Math.min(room, G.admin.infCash ? room : Math.floor(G.cash));
    box.append(h('div', { class:'acts' },
      h('button', { class:'btn btn-small btn-gold', disabled: !G.admin.infCash && G.cash < Math.min(10000, room), onclick: invest(Math.min(10000, room)) }, 'Invest ' + money(Math.min(10000, room))),
      maxAmt > 10000 ? h('button', { class:'btn btn-small', onclick: invest(maxAmt) }, 'Invest ' + money(maxAmt)) : null));
  }
  if (d < 100) box.append(h('p', { class:'pools-tip', text: 'Merge more ' + TOWERS[t.type].name + 's into it from their panels to add their power too.' }));
  return box;
}
function mergeBox(t, ms){
  const T = TOWERS[t.type], par = ms.par;
  const box = h('div', { class:'paragon' }, h('h4', { text: 'Feed ' + T.paragon.name }),
    h('div', { class:'why', text: 'Merge this ' + T.name + ' into your paragon to add its power: +' + fmt(Math.round(ms.gain)) + (ms.next > ms.degree ? ' (degree ' + ms.degree + ' → ' + ms.next + ').' : ' (degree ' + ms.degree + ').') + ' It is absorbed, with no refund.' }));
  box.append(h('button', { class:'btn btn-small btn-gold', id:'merge-btn', disabled: !canSell() || ms.gain <= 0, onclick: () => {
    if (mergeIntoParagon(t)){ select(par); }
    else Sfx.play('error');
  } }, ms.gain > 0 ? 'Merge into the paragon' : 'Its pools are already full'));
  return box;
}
function refreshPanel(t){
  const rm = $('#rice-meter');
  if (rm){
    const c = riceCharge(t), a = t.s.atk.main;
    rm.firstChild.style.width = Math.round(c * 100) + '%'; rm.classList.toggle('ready', c >= 1);
    const l = $('#rice-label'); if (l) l.textContent = c >= 1 ? 'Ready: waiting for pests' : 'Cooking ' + Math.round(c * 100) + '%';
    const k = $('#rice-kept'); if (k && a) k.textContent = 'Kept warm: ' + (t.riceStore || 0) + ' of ' + a.store;
    const b = $('#rice-lid'); if (b) b.disabled = c < 0.25;
  }
  const stats = $('#tp-stats');
  if (stats){
    const parts = [];
    if (Object.keys(t.s.atk).length) parts.push(['Damage', fmt(t.dmg)], ['Cooked', fmt(t.kills)]);
    if (t.lifts) parts.push(['Lifted', fmt(t.lifts)]);
    if (t.type === 'susan'){ const rs = ridersOf(t); if (rs.length) parts.push(['Riders’ damage', fmt(rs.reduce((a, r) => a + r.dmg, 0))]); }
    if (t.lastDmg != null && Object.keys(t.s.atk).length) parts.push(['Last round', fmt(t.lastDmg)]);
    if (t.cashGen) parts.push(['Earned', money(t.cashGen)]);
    if (t.s.income) parts.push(['Per round', money(t.s.income)]);
    if (t.s.bread) parts.push(['Loaves', t.s.bread.loaves + ' × ' + money(breadValue(t))]);
    const html = parts.map(([a, b]) => '<span>' + a + ' <b>' + b + '</b></span>').join('');
    if (stats.innerHTML !== html) stats.innerHTML = html;
  }
  for (const pips of $$('#tpanel .pips[data-p]')){
    const p = +pips.dataset.p, name = TOWERS[t.type].paths[p].name;
    for (const q of pips.children){
      const n = +q.dataset.tier;
      let title, cls = '';
      if (n <= t.up[p]) title = 'Tier ' + n + ' owned';
      else {
        const plan = planToTier(t, p, n);
        if (!plan.full) { title = 'Tier ' + n + ': ' + plan.why.toLowerCase(); cls = 'no'; }
        else { title = 'Upgrade to tier ' + n + ' ' + name + ' · ' + money(plan.cost); cls = canAfford(plan.cost) ? 'can' : 'poor'; }
      }
      if (q.title !== title) q.title = title;
      q.classList.toggle('can', cls === 'can'); q.classList.toggle('poor', cls === 'poor'); q.classList.toggle('no', cls === 'no');
    }
  }
  for (const btn of $$('#tpanel .upg[data-p]')){
    const p = +btn.dataset.p;
    const st = upgradeState(t, p);
    btn.classList.remove('can', 'poor', 'locked', 'closed');
    const pr = btn.querySelector('.price');
    if (st.closed){ btn.classList.add('closed'); pr.textContent = 'Closed'; }
    else if (st.mastery){ btn.classList.add('locked'); pr.textContent = 'Locked'; }
    else if (st.ok){ const ok = canAfford(st.cost); btn.classList.add(ok ? 'can' : 'poor'); const txt = money(st.cost); if (pr.textContent !== txt) pr.textContent = txt; }
  }
  const pb = $('#paragon-btn');
  if (pb){ const ps = paragonState(t); pb.disabled = !(ps && ps.ok && canAfford(ps.cost)); }
  for (const row of $$('#tpanel .abil[data-ab]')){
    const cd = t.ab[row.dataset.ab] || 0, st = row.querySelector('.abil-st'), sab = t.s.abilities.find(x => x.id === row.dataset.ab);
    const txt = cd > 0 ? 'Recharging · ' + Math.ceil(cd) + 's' : sab && t.sys && paraAbBlocked(t, sab) ? 'Used this round' : 'Ready';
    if (st.textContent !== txt){ st.textContent = txt; st.classList.toggle('ready', cd <= 0); }
  }
  const ba = $('#bank-amt'); if (ba) ba.textContent = money(t.bank || 0);
  if (t.paragon) refreshParaBox(t);
  if (t.hero) refreshHeroBox(t);
}
function buyUpgrade(p){
  const t = UI.sel;
  if (!t) return;
  if (t.hero){ heroBuyUI(t); return; }
  const st = upgradeState(t, p);
  if (!st.ok){ Sfx.play('error'); toast(st.why + '.', 'warn'); return; }
  if (!canAfford(st.cost)){ Sfx.play('error'); toast('Need ' + money(st.cost - G.cash) + ' more.', 'warn'); return; }
  upgradeTower(t, p);
  updatePanel(true);
  buildAbilities();
}
/* what it takes to go from the current tier straight to `target` on path p */
function planToTier(t, p, target){
  const saved = t.up.slice();
  let cost = 0, steps = 0, why = null, mastery = false;
  try {
    while (t.up[p] < target){
      const st = upgradeState(t, p);
      if (!st.ok){ why = st.why; mastery = !!st.mastery; break; }
      cost += st.cost; steps++; t.up[p]++;
    }
  } finally { t.up = saved; }
  return { cost, steps, why, mastery, full: !why };
}
function buyToTier(p, target){
  const t = UI.sel;
  if (!t || t.paragon) return;
  const tier = t.up[p], name = TOWERS[t.type].paths[p].name;
  if (target <= tier){ toast(name + ' is already at tier ' + tier + '.', ''); return; }
  const plan = planToTier(t, p, target);
  if (!plan.steps){ Sfx.play('error'); toast(plan.why + '.', 'warn'); return; }
  if (!canAfford(plan.cost)){
    Sfx.play('error');
    toast('Tier ' + (tier + plan.steps) + ' ' + name + ' costs ' + money(plan.cost) + '. Need ' + money(plan.cost - G.cash) + ' more.', 'warn');
    return;
  }
  for (let i = 0; i < plan.steps; i++) if (!upgradeTower(t, p)) break;
  const got = t.up[p];
  if (plan.steps > 1) toast('Upgraded ' + name + ' to tier ' + got + ' for ' + money(plan.cost) + '.', 'gold');
  if (!plan.full) toast('Stopped at tier ' + got + ': ' + plan.why.toLowerCase() + '.', 'warn');
  updatePanel(true);
  buildAbilities();
}
function cycleTarget(){ const t = UI.sel; if (!t || t.s.noTarget) return; const order = targetModes(t); t.tg = order[(order.indexOf(t.tg) + 1) % 4]; updatePanel(true); toast((trapTower(t.type) ? 'Pasta: ' : 'Targeting: ') + targetLabel(t, t.tg), ''); }

/* ---------------------------------------------------------------------
   A paragon's own system in its panel: a meter or pips for its state,
   switches for its modes, and a few lines on what it is doing now.
   --------------------------------------------------------------------- */
function paraBox(t){
  const U = paraUI(t);
  if (!U) return null;
  const box = h('div', { class:'psys', id:'psys' }, h('div', { class:'psys-head' }, h('b', { text: U.title })));
  if (U.meter) box.append(h('div', { class:'psys-meter' }, h('i', { id:'psys-fill' }), U.meter.mark != null ? h('u', { style:{ left: (U.meter.mark * 100) + '%' } }) : null, h('span', { id:'psys-mtxt' })));
  if (U.pips) box.append(h('div', { class:'psys-pips', id:'psys-pips' }));
  if (U.chart) box.append(h('canvas', { class:'psys-chart', id:'psys-chart', width: 520, height: 120, 'aria-label':'Bread price, recent' }));
  if (U.buttons){
    const seg = h('div', { class:'seg psys-seg', role:'group', 'aria-label': U.title });
    for (const b of U.buttons) seg.append(h('button', { 'aria-pressed': String(!!b.on), title: b.title || null, onclick: () => {
      if (paraSet(t, b.key, b.value)){ Sfx.play('click'); updatePanel(true); buildAbilities(); }
    }, text: b.label }));
    box.append(seg);
  }
  box.append(h('div', { class:'psys-lines', id:'psys-lines' }));
  if (U.sell) box.append(h('button', { class:'btn btn-small btn-gold', id:'psys-sell', onclick: () => {
    const v = sellVault(t, 1);
    if (v) toast('Sold the vault for ' + money(v) + '.', 'gold'); else Sfx.play('error');
    refreshParaBox(t);
  } }));
  return box;
}
function refreshParaBox(t){
  if (!$('#psys')) return;
  const U = paraUI(t);
  if (!U) return;
  if (U.meter){
    const f = $('#psys-fill');
    if (f){ f.style.width = (clamp(U.meter.v, 0, 1) * 100).toFixed(1) + '%'; f.style.background = U.meter.c; }
    const m = $('#psys-mtxt'); if (m && m.textContent !== U.meter.text) m.textContent = U.meter.text;
  }
  if (U.pips){
    const P = $('#psys-pips'), key = U.pips.n + '/' + U.pips.max;
    if (P && P.dataset.k !== key){
      P.dataset.k = key; P.innerHTML = '';
      for (let i = 0; i < U.pips.max; i++){
        const on = i < U.pips.n;
        P.append(h('span', { class: on ? 'on' : '', style: on ? { background: U.pips.cs ? U.pips.cs[i] : U.pips.c } : null, text: U.pips.labels ? (i === U.pips.max - 1 ? 'Roar' : 'Lance') : '' }));
      }
    }
  }
  const L = $('#psys-lines'), sig = U.lines.join('\n');
  if (L && L.dataset.k !== sig){ L.dataset.k = sig; L.innerHTML = ''; for (const x of U.lines) L.append(h('p', { text: x })); }
  if (U.chart) drawMarket($('#psys-chart'), U.chart, U.price);
  if (U.sell){ const b = $('#psys-sell'); if (b){ const txt = U.sell.can ? 'Sell the vault · ' + money(U.sell.value) : 'The vault is empty'; if (b.textContent !== txt) b.textContent = txt; b.disabled = !U.sell.can; } }
}
/* the Bread Exchange: recent prices, with the base price marked */
function drawMarket(cv, hist, price){
  if (!cv) return;
  const key = hist.join(',');
  if (cv.dataset.k === key) return;
  cv.dataset.k = key;
  const g = cv.getContext('2d'), w = cv.width, hh = cv.height;
  g.clearRect(0, 0, w, hh);
  const lo = Math.log(0.4), hi = Math.log(2.5), y = v => hh - 10 - (Math.log(v) - lo) / (hi - lo) * (hh - 20);
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(0, y(1)); g.lineTo(w, y(1)); g.stroke(); g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.font = '700 20px "Barlow Condensed", sans-serif'; g.fillText('×1', 8, y(1) - 6);
  const n = hist.length, dx = (w - 24) / Math.max(1, 39);
  const x0 = w - 12 - (n - 1) * dx;
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); hist.forEach((v, i) => i ? g.lineTo(x0 + i * dx, y(v)) : g.moveTo(x0 + i * dx, y(v)));
  g.strokeStyle = price >= 1 ? '#7ee07a' : '#ff8a7a'; g.lineWidth = 5; g.stroke();
  const lx = x0 + (n - 1) * dx, ly = y(price);
  g.beginPath(); g.arc(lx, ly, 8, 0, TAU); g.fillStyle = '#fff'; g.fill();
  g.beginPath(); g.arc(lx, ly, 5, 0, TAU); g.fillStyle = price >= 1 ? '#2f9d3a' : '#c9363a'; g.fill();
  g.font = '700 26px "Barlow Condensed", sans-serif'; g.textAlign = 'right'; g.fillStyle = '#fff';
  g.fillText('×' + price.toFixed(2), Math.min(w - 4, lx - 12), Math.max(26, Math.min(hh - 6, ly - 10)));
  g.textAlign = 'left';
}
/* abilities that are used up for this round */
function abBlocked(id){
  let any = false;
  for (const t of G.towers){ const ab = t.s.abilities.find(x => x.id === id); if (!ab) continue; any = true; if (!(t.sys && paraAbBlocked(t, ab))) return false; }
  return any;
}

/* ---------------------------------------------------------------------
   What abilities do: plain words with the real numbers, worked out from
   the ability as the appliance has it now, so upgrades show through.
   --------------------------------------------------------------------- */
const AB_BOOST = { barrage:['knife', 'throw knives', 'throws knives'], sugar:['siphon', 'fire', 'fires'], delivery:['oven', 'bake', 'bakes'] };
const abSec = v => (Math.round(v * 10) / 10) + 's';
function abRecharge(ab){ return ab.cd * (perk('quick') ? 0.9 : 1); }
/* a custom ability's text at its current strength (paragons and upgrades make it stronger) */
function customAbilityText(ab){
  const P = ab.power || 1, L = 1 + (P - 1) * 0.5, r1 = v => Math.round(v * 10) / 10;
  const out = (ab.actions || []).map(a0 => {
    const a = Object.assign({}, a0);
    if (a.dur != null) a.dur = r1(a.dur * L);
    switch (a.k){
      case 'damage': a.dmg *= P; a.big = (a.big || 0) * P; break;
      case 'burn': case 'strike': a.dmg *= P; break;
      case 'weaken': a.vuln *= P; break;
      case 'bombs': a.count = Math.round(a.count * P); break;
      case 'speed': a.fastp = Math.round(Math.min(1000, a.fastp * L)); break;
      case 'cash': case 'lives': a.amt = Math.round(a.amt * P); break;
    }
    return actionText(a);
  }).filter(Boolean);
  return out.length ? out.join('. ') + '.' : '';
}
/* name, what it does and how long it takes to recharge; s is the appliance's stats (for its range and mines) */
function abilityDetails(ab, s){
  const A = ABILITIES[ab.id] || { name: ab.id, desc: '' };
  const n = fmtN, sec = abSec;
  let text = A.desc;
  if (ab.custom) text = customAbilityText(ab) || A.desc;
  else switch (ab.id){
    case 'barrage': case 'sugar': case 'delivery': {
      const [type, many, one] = AB_BOOST[ab.id], nm = TOWERS[type].name, max = ab.max;
      text = (ab.global ? (max ? 'Up to ' + max + ' ' + plural(nm, 2) + ' anywhere on the map ' + many : 'Every ' + nm + ' on the map ' + one)
        : max ? 'This ' + nm + ' and up to ' + (max - 1) + ' more nearby ' + many : 'This ' + nm + ' and every other one nearby ' + many) + ' ' + ab.mult + '× as fast for ' + sec(ab.dur) + '.';
      break;
    }
    case 'bird': {
      const a = (s && s.atk && s.atk.bird) || { dmg:4, pierce:5, rate:0.15 }, l = s && s.atk && s.atk.lava;
      text = l ? 'A great lava bird joins the fire bird for ' + sec(ab.dur) + ', raining fireballs: ' + n(l.dmg) + ' damage (+' + n(l.bonusBig || 0) + ' to vehicles) to ' + n(l.pierce) + ' pests each.'
        : 'A bird of flame circles the grill for ' + sec(ab.dur) + ', raining fireballs at pests: ' + n(a.dmg) + ' damage to ' + n(a.pierce) + ' pests, ' + Math.round(1 / a.rate) + ' a second.';
      break;
    }
    case 'spill':
      text = 'Hot oil coats every pest on screen' + (ab.storm ? ', and keeps coating them every second for ' + sec(ab.dur) : ' for ' + sec(ab.dur)) + ': battered (' + Math.round((1 - ab.slow) * 100) + '% slower, vehicles ' + Math.round((1 - ab.bigSlow) * 100) + '%), soaked (+1 heat damage taken) and seared (+' + n(ab.vuln) + ' damage from every hit).';
      break;
    case 'pastastorm': text = n(ab.count) + ' pasta nests drop onto random spots all along the trail, each one the same as the maker extrudes.'; break;
    case 'kernel': text = 'A giant kernel bursts over the microwave, hitting every pest near it for ' + n(ab.dmg) + ' (' + n(ab.big) + ' to vehicles, ' + n(ab.boss) + ' to bosses).'; break;
    case 'steamup': text = (ab.global ? 'Every tower on the map' : 'Every tower in range') + ' attacks ' + ab.mult + '× as fast for ' + sec(ab.dur) + '.'; break;
    case 'rush': text = 'Every appliance on the map attacks ' + ab.mult + '× as fast for ' + sec(ab.dur) + '.'; break;
    case 'bagel': case 'mustard': {
      const splash = ab.id === 'bagel' ? 30 : 60;
      text = (ab.id === 'bagel' ? 'A giant bagel' : 'A giant mustard missile') + ' homes in on the toughest vehicle and hits it for ' + n(splash + ab.dmg) + '. Its blast deals ' + splash + ' to smaller pests around it.';
      break;
    }
    case 'blitz': text = n(ab.bombs) + ' toast bombs rain on the toughest pests on the map, ' + n(ab.dmg) + ' damage each.'; break;
    case 'storm': text = n(ab.rockets) + ' homing popcorn rockets stream out over 3s at the toughest pests on the map, ' + n(ab.dmg) + ' damage each.'; break;
    case 'tornado':
      text = 'Hits every pest in a wide circle around it for ' + n(ab.dmg) + ', stuns small pests for 0.6s and blows them back along the trail. ' + (ab.bigPush ? 'Vehicles are pushed too; bosses hold their ground.' : 'Vehicles hold their ground.');
      break;
    case 'vat': text = 'Dunks every pest near the fryer in boiling oil for ' + n(ab.dmg) + ' and stuns them for ' + sec(ab.stun) + '. Vehicles take ' + n(ab.bigDmg) + ' instead.'; break;
    case 'freeze': {
      const k = perk('icebox') ? 1.15 : 1;
      text = 'Freezes every pest on the map for ' + sec(ab.dur * k) + '. Vehicles freeze for ' + sec(ab.bigDur * k) + ', bosses for ' + sec(ab.bigDur * 0.5 * k) + '.' + (ab.ignoreImmune ? ' Even snow fleas freeze.' : ' Snow fleas can’t be frozen.');
      break;
    }
    case 'rinse': text = 'Washes every pest on the map back up the trail, scrubs off armor and mold, and stuns small pests for 0.6s. Vehicles wash back less; bosses only lose their mold.'; break;
    case 'supply': text = 'A crate of ' + money(ab.cash) + ' lands next to the siphon.'; break;
    case 'chinook': text = 'A supply copter drops a crate of ' + money(ab.cash) + ' and ' + n(ab.lives) + ' extra lives.'; break;
    case 'pastarain': {
      const atk = (s && s.atk) || {}, src = atk.mines && atk.mines.mine ? atk.mines : atk.main;
      const m = (src && src.mine) || { dmg:40 };
      text = n(ab.count) + ' ravioli mines rain onto random spots along the trail. Each bursts for ' + n(m.dmg) + (m.bonusBig ? ' (+' + n(m.bonusBig) + ' to vehicles)' : '') + ' when a pest steps on it, and they last 30s.';
      break;
    }
    case 'galley': {
      const k = ab.hooks || 1, many = k > 1, cap = ab.maxTier || 10;
      const kinds = Object.values(ENEMIES).filter(E => E.big && !E.boss);
      const top = kinds.filter(E => E.tier <= cap).sort((a, b) => b.tier - a.tier)[0];
      const limit = kinds.some(E => E.tier > cap) && top ? ' (up to ' + plural(top.name, 2) + ')' : '';
      text = 'Hooks the ' + (many ? k + ' toughest vehicles' : 'toughest vehicle') + ' on the map' + limit + ' and destroys ' + (many ? 'them' : 'it') + ' outright, whatever ' + (many ? 'their' : 'its') + ' health; anything inside still spills out. Bosses lose ' + Math.round((ab.bossPct || 0.1) * 100) + '% of their health instead.';
      break;
    }
    case 'tactical': {
      const per = 1 / ab.rate;
      text = 'A commando parachutes in beside the trail near the front of the pack and fires at the closest pest ' + (per >= 1 ? Math.round(per) + ' times a second' : 'every ' + sec(ab.rate)) + ' for ' + sec(ab.dur) + ': ' + n(ab.dmg) + ' a shot, ' + n(ab.dmg * 2) + ' to vehicles.';
      break;
    }
    case 'zest': case 'tsar':
      text = (ab.id === 'tsar' ? 'An enormous bonbon bomb' : 'A zesty blast') + ' hits every pest on the map for ' + n(ab.dmg) + (ab.big !== ab.dmg ? ' (' + n(ab.big) + ' to vehicles)' : '') + (ab.stun ? ' and stuns them for ' + sec(ab.stun) + ' (bosses ' + sec(ab.stun * 0.4) + ')' : '') + '.';
      break;
    case 'bladestorm': text = 'For ' + sec(ab.dur) + ' it attacks ' + ab.mult + '× as fast and flings slicer wheels in every direction, all rebounding off the kitchen walls.'; break;
    case 'brioche': {
      const tr = ab.trail || { dmg: 0, bonusBig: 0 };
      text = 'A giant brioche missile hunts the toughest pest on the map. Every quarter second it leaves an explosion behind (' + n(tr.dmg) + ', ' + n(tr.dmg + tr.bonusBig) + ' to vehicles) that knocks pests back, and it bursts on its target for ' + n(ab.dmg) + ', stunning everything nearby for 5s. Recharges 10s faster for every leak.';
      break;
    }
    case 'liquefy': {
      const sp = s && s.atk && s.atk.soup;
      text = 'For ' + sec(ab.dur) + ' its shrapnel flies 2.5× as far, and a ring of boiling soup scalds up to ' + (sp ? n(sp.pierce) : 80) + ' pests around it every second for ' + (sp ? n(sp.dmg) : 250) + ' (+250 to bosses).';
      break;
    }
    case 'meteor': text = 'A molten meteor slams the toughest pest for ' + n(ab.dmg) + ' (' + n(ab.small) + ' to smaller pests around it), then bursts into ' + n(ab.balls) + ' homing fireballs of ' + n(ab.ballDmg) + '.'; break;
    case 'rushhour': text = 'Gives it ' + ab.stacks + ' Rush Hour stacks, each one 11% faster (' + Math.round((Math.pow(1 / 0.9, ab.stacks) - 1) * 100) + '% faster with all ' + ab.stacks + '). One wears off every ' + sec(ab.decay) + '.'; break;
    case 'pyre': text = 'Burns every drop of fuel: the phoenix bursts, setting every pest near the grill burning for ' + n(ab.dot) + ' every half second for 30s, and raises a charred food truck for every ' + n(ab.per) + ' fuel (up to ' + ab.trucks + '). Each truck walks back up the trail hitting pests for ' + n(ab.truck.dmg) + ', then breaks into 4 charred picnic baskets. The phoenix returns 10s later.'; break;
    case 'inferno': {
      const c = s && s.atk && s.atk.cascade;
      text = 'The grill and its phoenix become one: its coal spikes keep flying while it pours out a cascade of flame (' + (c ? n(c.dmg) : 200) + ' to ' + (c ? n(c.pierce) : 100) + ' pests, ten times a second) and walls of fire along the trail, burning ' + n(ab.drain) + ' fuel a second. Lasts until the fuel runs out, ' + ab.max + 's at most.';
      break;
    }
    case 'deepfry': text = 'Dunks every battered pest on screen: ' + n(ab.per) + ' damage for each layer of batter (' + ab.big + '× to vehicles), and small pests are stunned for ' + sec(ab.stun) + '. Their batter is used up.'; break;
    case 'void_pull': text = 'Every pest on the map is dragged up to ' + n(ab.pull) + ' along the trail (vehicles ' + n(ab.bigPull) + ', bosses half that) to the stretch nearest Chef Infinity, held there for ' + sec(ab.hold) + ' and takes ' + n(ab.dmg) + '.'; break;
    case 'void_burst': text = 'Every pest on the map is blown back ' + n(ab.push) + ' along the trail (vehicles ' + n(ab.bigPush) + ') and takes ' + n(ab.dmg) + ' (' + n(ab.dmg * ab.bigMul) + ' for vehicles; bosses lose ' + Math.round(ab.bossPct * 100) + '% of their health), then stands stunned for ' + sec(ab.stun) + '.'; break;
    case 'void_course': text = 'A beam ' + n(ab.width) + ' wide from Chef Infinity through the toughest pest to the far wall: everything in it takes ' + n(ab.dmg) + ', and bosses lose ' + Math.round(ab.bossPct * 100) + '% of their health.'; break;
    case 'void_domain': text = 'For ' + sec(ab.dur) + ' the kitchen is his: every pest stands frozen and loses ' + (ab.pct * 100).toFixed(1) + '% of its health every 0.1s (bosses ' + (ab.bossPct * 100).toFixed(1) + '%), and every other appliance attacks ' + ab.boost + '× as fast.'; break;
    case 'longnight': text = 'Night falls. After ' + sec(ab.delay) + ' every pest freezes solid for ' + sec(ab.dur) + ' (vehicles ' + sec(ab.bigDur) + ', bosses half that), and the whole kitchen moves ' + Math.round((1 - ab.slow) * 100) + '% slower until morning, ' + sec(ab.cold) + ' later. Once per round.'; break;
    case 'meltdown': text = 'Vents all of the reactor’s heat as a wave across the kitchen: every pest takes ' + n(ab.per) + ' per point of heat (' + n(ab.per * 100) + ' at 100%, ' + ab.big + '× to vehicles) and takes +5 damage from everything for 5s. The reactor cools to 0 without shutting down.'; break;
    case 'supernova': text = 'A supercork blasts in a straight line through the toughest pest to the edge of the kitchen: ' + n(ab.dmg) + ' to every pest in its path and ' + n(ab.dmg * ab.big) + ' to vehicles, which are stunned for 2s and take 50% more damage for 8s.'; break;
    case 'avalanche': text = n(ab.count) + ' pizzas rain down all along the trail, ' + n(ab.dmg) + ' each (' + n(ab.dmg + ab.bonusBig) + ' to vehicles), and every pest on screen is stunned for ' + sec(ab.stun) + ' (vehicles half as long).'; break;
    case 'overmix': text = 'A switch. While it is on: ' + Math.round((ab.range - 1) * 100) + '% more reach, chips thrown ' + Math.round((1 - ab.spread) * 100) + '% tighter, and damage that grows with the pests on the map (+0.5× for every ' + n(ab.per) + ' health of them, up to ' + ab.max + '×). It costs ' + Math.round(ab.drain * 100) + '% of your cash every second of a round (' + money(ab.min) + ' to ' + money(ab.cap) + ' a second), stops all income, and switches itself off below ' + money(ab.min) + '.'; break;
    case 'punchdown': text = 'Dough hooks rise up under the ' + n(ab.n) + ' small pests it would pick first, anywhere in the kitchen, and knead them flat, each leaving a pile of chocolate spikes behind. Not vehicles' + (s && s.camo ? '' : ' or ghosts') + '.'; break;
    case 'boil': text = 'Makes lasagna and mines ' + ab.mult + '× as fast for ' + sec(ab.dur) + '. Once per round.'; break;
    case 'pastageddon': text = n(ab.per) + ' giant ravioli mines line every trail, each bursting for ' + n(ab.mine.dmg) + ' (' + n(ab.mine.dmg + ab.mine.bonusBig) + ' to vehicles) on up to ' + n(ab.mine.pierce) + ' pests when one touches it. Using it again first sets off any still waiting.'; break;
    case 'reaper': text = 'For ' + sec(ab.dur) + ' the mill sits at Reaper heat, fires ' + ab.mult + '× as fast, and its peppercorns burst into flame (' + n(ab.burst.dmg) + ' to ' + n(ab.burst.pierce) + ' pests).'; break;
    case 'leviathan': text = 'A giant hook drags the toughest vehicle on the map off for good, raccoons included; anything inside still spills out. Bosses lose ' + Math.round((ab.bossPct || 0.2) * 100) + '% of their health instead. Twice per round.'; break;
    case 'finale': text = 'A ' + Math.round(ab.wait || 15) + ' second countdown (it only runs during a round, and pauses its other attacks), then three giant mustard missiles hit the pest nearest the pantry, the closest one and the toughest: ' + n(ab.dmg) + ' each to vehicles, an aftershock that stuns everything but raccoons and bosses for ' + sec(ab.after.stun) + ', and pools of fallout that last ' + sec(ab.pools.dur) + '.'; break;
    case 'strafe': text = 'Every escort copter in the wing strafes the whole trail from the pantry back to the entrance, hitting each pest for ' + n(ab.dmg) + ' (' + n(ab.dmg + ab.bonusBig) + ' to vehicles) per copter. Then the wing rebuilds.'; break;
    case 'bombers': text = 'Three bomber saucers cross the kitchen in a line through the toughest pest, dropping ' + ab.per + ' bombs each plus everything in the hold. Each bomb hits up to ' + n(ab.pierce) + ' pests for ' + n(ab.small) + ' (' + n(ab.dmg) + ' to vehicles) and stuns them for ' + sec(ab.stun) + ' (vehicles half as long).'; break;
    case 'refill': text = 'For ' + sec(ab.dur) + ' every blend is served at once to every appliance on the map: faster, longer reach, more pierce and damage, and faster abilities.'; break;
    case 'marketday': text = 'Sells every loaf in the vault at ' + ab.mult + '× the current Bread Exchange price.'; break;
    /* the second wave */
    case 'sabotage':
      text = 'For ' + sec(ab.dur) + ' every pest on the map moves at ' + Math.round((ab.slow || 0.5) * 100) + '% speed (bosses lose half as much).' + (ab.weak ? ' Vehicles that arrive while it lasts start with ' + Math.round(ab.weak * 100) + '% less health, and every Mandoline throws ' + Math.round(((ab.boost || 1) - 1) * 100) + '% faster.' : '');
      break;
    case 'takeaim': text = 'Up to ' + (ab.max || 6) + ' appliances in its range (the ones that have done the most damage, itself included) gain ' + Math.round((ab.range - 1) * 100) + '% range and spot ghost pests for ' + sec(ab.dur) + '.'; break;
    case 'tonic': {
      const m = (s && s.atk && s.atk.monster) || { dmg: 4, bonusBig: 6, pierce: 6, rate: 0.05 };
      text = 'It becomes a sauce monster for ' + sec(ab.dur) + ', firing a scalding beam: ' + n(m.dmg) + ' damage (+' + n(m.bonusBig || 0) + ' to vehicles) to ' + n(m.pierce) + ' pests, ' + Math.round(1 / m.rate) + ' times a second.' + (ab.others ? ' Up to ' + ab.others + ' nearby appliances (the ones that have done the most damage) become monsters too, with beams of their own.' : '');
      break;
    }
    case 'overclock': text = (ab.global ? 'The appliance on the map' : 'The appliance in its range') + ' that has done the most damage attacks ' + Math.round(((ab.mult || 1 / 0.6) - 1) * 100) + '% faster for ' + sec(ab.dur) + '.' + (ab.ultra ? ' Each use also gives it a permanent Ultraboost stack: 4% faster for good, up to 10.' : ''); break;
    case 'roar': text = 'A mighty roar stuns every pest ' + (ab.global ? 'on the map' : 'around the basket') + ' for ' + sec(ab.stun) + ' (vehicles half as long, bosses less)' + (ab.dmg ? ' and hits them for ' + n(ab.dmg) : '') + '.'; break;
    case 'icejet': text = ab.flood ? 'Floods the kitchen with ice water: every pest on screen takes ' + n(ab.dmg) + ' (' + n(ab.big) + ' to vehicles) and freezes for ' + sec(ab.freeze) + ' (vehicles half as long), even snow fleas.'
      : n(ab.balls) + ' balls of ice hunt the toughest pests, each bouncing on to 6 more: ' + n(ab.dmg) + ' damage (+' + n(ab.bonusBig) + ' to vehicles), and they freeze what they hit.'; break;
    case 'smokebomb': text = 'Every pest on screen is stunned for ' + sec(ab.stun) + ' (vehicles ' + sec(ab.stun * 0.4) + ', bosses less), loses its ghost cloak and takes +' + n(ab.vuln) + ' damage from everything for ' + sec(ab.dur) + '.'; break;
    case 'shadowstrike': text = 'Every shadow clone strikes one of the toughest pests on screen for ' + n(ab.dmg) + '. The clones are spent, and the band starts gathering again.'; break;
    case 'fanhammer': text = 'For ' + sec(ab.dur) + ' it fires everything ' + ab.mult + '× as fast.'; break;
    case 'highnoon': text = 'Every Wanted pest it marked (topped up to 6 with the toughest pests on screen) takes a golden shot: ' + n(ab.per) + ' damage for every notch on its belt plus ' + ab.base + ' more, and a 1s stun. The notches are spent.'; break;
    case 'transmute': text = 'Every vehicle on screen shrinks one size: a food truck becomes a picnic basket, a basket a cheese wheel, and so on. Nothing spills out. Bosses lose ' + Math.round(ab.boss * 100) + '% of their health instead.'; break;
    case 'elixir': { const b = ab.buff; text = 'Every appliance on the map drinks an elixir for ' + sec(ab.dur) + ': +' + b.dmg + ' damage, +' + b.pierce + ' pierce, +' + (b.bigDmg || 0) + ' to vehicles, ' + Math.round((b.range - 1) * 100) + '% more range and ' + Math.round((b.speed - 1) * 100) + '% faster.'; break; }
    case 'overdrive': text = 'Every appliance on the map is overclocked for ' + sec(ab.dur) + ' (' + Math.round((ab.mult - 1) * 100) + '% faster) and gets a permanent Ultraboost stack: 4% faster for good, up to 10.'; break;
    case 'megabot': text = 'A giant sentry rolls out beside the trail near the front of the pack for ' + sec(ab.dur) + ', firing homing rockets: ' + n(ab.dmg) + ' damage around each hit, +' + n(ab.bonusBig) + ' to vehicles.'; break;
    case 'stampede': text = 'A stampede charges up every trail from the pantry: every pest in its way takes ' + n(ab.dmg) + ' (' + n(ab.dmg + ab.bonusBig) + ' to vehicles) and is shoved back up the trail. Bosses hold their ground.'; break;
    case 'feast': text = 'The great bird carries off the ' + n(ab.n) + ' toughest vehicles on screen, destroyed outright; whatever is inside still spills out. Bosses lose ' + Math.round(ab.boss * 100) + '% of their health instead.'; break;
    case 'tsunami': text = 'A great wave washes every pest on screen back up the trail (vehicles less, bosses not at all), hits it for ' + n(ab.dmg) + ' and freezes it for ' + sec(ab.freeze) + ' (vehicles half as long).'; break;
    case 'kraken': text = 'The kraken drags the ' + n(ab.n) + ' toughest vehicles on screen under for good, raccoons included; whatever is inside still spills out. Bosses lose ' + Math.round(ab.boss * 100) + '% of their health instead.'; break;
    /* the chess set */
    case 'castle': text = 'A giant rook rolls down every trail from the pantry back to the entrance, crushing every pest in its way for ' + n(ab.dmg) + ' (' + n(ab.dmg + ab.bonusBig) + ' to vehicles). Small pests are shoved back and stunned for ' + sec(ab.stun) + ', vehicles shoved a little; raccoons and bosses hold their ground.'; break;
    case 'charge': text = 'A troop of knights gallops up every trail from the pantry, trampling every pest in its way for ' + n(ab.dmg) + ' (' + n(ab.dmg + ab.bonusBig) + ' to vehicles). Small pests are knocked back and stunned for ' + sec(ab.stun) + '.'; break;
    case 'checkmate': text = 'The ' + n(ab.n) + ' toughest vehicles on screen are checkmated: off the board for good, raccoons included, though whatever is inside still spills out. A boss is put in check instead: it loses ' + Math.round(ab.boss * 100) + '% of its health and is stunned for 2s.'; break;
    case 'stalemate': text = 'Nobody has a move: every pest on screen stops where it stands for ' + sec(ab.dur) + ' (bosses ' + sec(ab.dur * 0.4) + ').'; break;
    case 'flurry': text = 'Every attack these chopsticks make, pinches and flicks alike, comes ' + n(ab.mult) + '× as fast for ' + sec(ab.dur) + '.'; break;
    case 'fullspin': text = 'The board spins flat out: everything riding it attacks ' + n(ab.mult) + '× as fast for ' + sec(ab.dur) + '. Needs at least one appliance on top.'; break;
    case 'gravyflood': text = 'A wave of scalding gravy rolls off the board: every pest within ' + n(Math.round((s ? s.range : 110) * (ab.rangeMul || 2.5))) + ' px takes ' + n(ab.dmg) + ' (' + n(ab.dmg + (ab.bonusBig || 0)) + ' to vehicles), burns, and is slowed by ' + Math.round((1 - ab.slow) * 100) + '% for ' + sec(ab.dur) + ' (vehicles ' + Math.round((1 - ab.bigSlow) * 100) + '%). Goes through any shell.'; break;
    case 'grandpinch': text = 'The ' + n(ab.n) + ' toughest pests on screen that aren’t bosses, vehicles included, are lifted and carried all the way back to the entrance. Bosses are held where they stand for ' + sec(ab.hold) + '.'; break;
    /* the spray bottle */
    /* the rice cooker */
    case 'valve': text = 'The pressure valve blows: ' + n(ab.n) + ' steam bursts in ' + sec(Math.round(ab.n * ab.every * 10) / 10) + ', each at ' + n(ab.mul) + '× damage.'; break;
    case 'mochi': text = 'A mallet pounds the whole kitchen: every pest on screen takes ' + n(ab.dmg) + (ab.bonusBig ? ' (' + n(ab.dmg + ab.bonusBig) + ' to vehicles)' : '') + ' and is glued in place for ' + sec(ab.dur) + (ab.big ? ' (vehicles half as long)' : ' (vehicles slowed instead)') + '; bosses are slowed.'; break;
    case 'serve': text = 'Every pot it can keep warm is cooked at once and served straight out' + (s && s.atk.main && s.atk.main.store ? ' (' + n(s.atk.main.store + 1) + ' bursts)' : '') + '.'; break;
    case 'bubblebath': text = 'The ' + n(ab.n) + ' toughest pests on screen' + (ab.big ? ', vehicles too (not bosses),' : ' (not vehicles or bosses)') + ' are trapped in soap bubbles: floated ' + n(ab.back) + ' px back up the trail (vehicles half as far) and held for ' + sec(ab.hold) + ', then the bubbles pop for ' + n(ab.pop) + (ab.popBig ? ' (' + n(ab.popBig) + ' for vehicles)' : '') + '.'; break;
    case 'downpour': text = 'Rain falls on the whole kitchen for ' + sec(ab.dur) + ': every pest on screen stays wet, and wet pests take double from cold, energy and heat.' + (ab.bolts ? ' Lightning strikes ' + n(ab.bolts) + ' times a second, each bolt hitting a wet pest for ' + n(ab.boltDmg) + ' (' + n(ab.boltDmg + (ab.boltBig || 0)) + ' to vehicles) through any shell.' : ''); break;
    case 'hydroblast': text = 'A huge jet down the line with the most pests: everything in it but bosses takes ' + n(ab.dmg) + ' (' + n(ab.dmg + (ab.bonusBig || 0)) + ' to vehicles) through any shell and is blasted ' + n(ab.push) + ' px back up the trail (vehicles half as far).'; break;
  }
  if (HERO_ABS[ab.id]) text = heroAbilityText(ab);
  return { name: A.name, text, cd: abRecharge(ab) };
}
/* the appliance whose ability fires next: the most upgraded one that is ready, as useAbility picks it,
   or failing that the one that will be ready soonest */
function abilitySource(id){
  let best = null, soon = null, n = 0, ready = 0;
  const lvl = t => t.up.reduce((a, v) => a + v, 0) + (t.paragon ? 99 : 0);
  for (const t of G.towers){
    const ab = t.s.abilities.find(x => x.id === id);
    if (!ab) continue;
    n++;
    const cd = t.ab[id] || 0;
    if (cd <= 0){ ready++; if (!best || lvl(t) > lvl(best.t)) best = { t, ab }; }
    if (!soon || cd < soon.cd) soon = { t, ab, cd };
  }
  if (best) return { t: best.t, ab: best.ab, cd: 0, n, ready };
  return soon ? { t: soon.t, ab: soon.ab, cd: soon.cd, n, ready: 0 } : null;
}
/* what an ability would hit if it went off right now. `live` is false when it would find nothing
   to do, in which case pressing it does nothing and costs no recharge. */
function abilityAim(t, ab){
  const A = { rings:[], towers:[], marks:[], hooks:false, screen:false, trail:false, drop:null, gain:null, live:true };
  const onMap = () => G.enemies.filter(e => !e.dead && onScreen(e));
  switch (ab.id){
    case 'barrage': case 'sugar': case 'delivery': {
      const type = AB_BOOST[ab.id][0], R = Math.max(200, t.s.range * 1.5);
      A.towers = G.towers.filter(o => o.type === type && (ab.global || Math.hypot(o.x - t.x, o.y - t.y) <= R));
      if (!ab.global) A.rings.push({ x: t.x, y: t.y, r: R, soft: true });
      A.live = onMap().length > 0;
      break;
    }
    case 'rush': A.towers = G.towers.slice(); A.live = onMap().length > 0; break;
    case 'steamup':
      A.towers = G.towers.filter(o => o !== t && (ab.global || Math.hypot(o.x - t.x, o.y - t.y) <= t.s.range + o.size * 0.6));
      if (!ab.global) A.rings.push({ x: t.x, y: t.y, r: t.s.range, soft: true });
      A.live = onMap().length > 0;
      break;
    case 'bird': A.rings.push({ x: t.x, y: t.y, r: 70, soft: true }); A.live = true; break;
    case 'spill': A.screen = true; A.live = onMap().length > 0; break;
    case 'pastastorm': A.trail = true; A.live = G.roundActive || onMap().length > 0; break;
    case 'kernel': {
      const R = Math.max(200, t.s.range * 1.2);
      A.rings.push({ x: t.x, y: t.y, r: R });
      A.live = onMap().some(e => Math.hypot(e.x - t.x, e.y - t.y) <= R);
      break;
    }
    case 'bagel': case 'mustard': {
      const e = acquireBig({ x: t.x, y: t.y, s:{ camo:true, allTypes:true } }, 9999, null);
      if (e){ A.marks.push(e); A.rings.push({ x: e.x, y: e.y, r: ab.id === 'bagel' ? 46 : 60 }); } else A.live = false;
      break;
    }
    case 'blitz': case 'storm': {
      const L = onMap().sort((a, b) => b.tier - a.tier || b.hp - a.hp);
      A.marks = L.slice(0, Math.min(16, ab.id === 'blitz' ? ab.bombs : ab.rockets));
      A.live = L.length > 0;
      break;
    }
    case 'tornado': case 'vat': {
      const R = ab.id === 'tornado' ? Math.max(220, t.s.range * 2.6) : t.s.range * 1.4;
      A.rings.push({ x: t.x, y: t.y, r: R });
      A.live = G.enemies.some(e => !e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= R);
      break;
    }
    case 'freeze': A.screen = true; A.live = G.enemies.some(e => !e.dead); break;
    case 'rinse': A.screen = true; A.live = onMap().length > 0; break;
    case 'zest': case 'tsar': A.screen = true; A.live = onMap().length > 0; break;
    case 'supply': A.gain = '+' + money(ab.cash); break;
    case 'chinook': A.gain = '+' + money(ab.cash) + ' · +' + fmtN(ab.lives) + ' lives'; break;
    case 'pastarain': A.trail = true; A.live = G.roundActive || onMap().length > 0; break;
    case 'galley': {
      const k = ab.hooks || 1;
      const vs = G.enemies.filter(e => !e.dead && e.big && !e.boss && e.tier <= (ab.maxTier || 10) && onScreen(e) && e.burrowT <= 0).sort((a, b) => b.tier - a.tier || b.hp - a.hp).slice(0, k);
      const bosses = G.enemies.filter(e => !e.dead && e.boss && onScreen(e) && e.burrowT <= 0).slice(0, Math.max(0, k - vs.length));
      A.marks = vs.concat(bosses); A.hooks = true; A.live = A.marks.length > 0;
      break;
    }
    case 'tactical': {
      let lead = null, bs = -Infinity;
      for (const e of G.enemies){ if (e.dead || !onScreen(e)) continue; const sc = score(e, t, 'first'); if (sc > bs){ bs = sc; lead = e; } }
      if (!lead){ A.live = false; break; }
      const q = pathPointAhead(lead, -60), sp = besideTrail(q.x, q.y, q.ang, 1);
      A.drop = { x: sp.x, y: sp.y, r: ab.r };
      break;
    }
    case 'bladestorm': case 'reaper': A.rings.push({ x: t.x, y: t.y, r: t.s.range, soft: true }); A.live = onMap().length > 0; break;
    case 'liquefy': A.rings.push({ x: t.x, y: t.y, r: (t.s.atk.soup && t.s.atk.soup.rangeAbs) || 200 }); A.live = onMap().length > 0; break;
    case 'boil': A.rings.push({ x: t.x, y: t.y, r: t.s.range, soft: true }); A.live = G.roundActive; break;
    case 'brioche': case 'supernova': case 'bombers': {
      const e = toughest();
      if (e) A.marks.push(e); else A.live = false;
      break;
    }
    case 'meteor': { const e = toughest(); if (e){ A.marks.push(e); A.rings.push({ x: e.x, y: e.y, r: ab.r }); } else A.live = false; break; }
    case 'rushhour': A.towers = [t]; A.live = onMap().length > 0; break;
    case 'pyre': A.rings.push({ x: t.x, y: t.y, r: ab.r }); A.live = !!(t.sys && t.sys.fuel >= 1000) && onMap().length > 0; break;
    case 'inferno': A.rings.push({ x: t.x, y: t.y, r: t.s.range }); A.live = !!(t.sys && !t.sys.form && t.sys.fuel >= ab.drain) && onMap().length > 0; break;
    case 'deepfry': { const L = onMap().filter(e => e.layers > 0); A.marks = L.slice(0, 16); A.live = L.length > 0; break; }
    case 'longnight': case 'avalanche': case 'void_pull': case 'void_burst': case 'void_course': case 'void_domain': A.screen = true; A.live = onMap().length > 0; break;
    case 'meltdown': A.screen = true; A.live = !!(t.sys && t.sys.heat >= 5) && onMap().length > 0; A.gain = t.sys ? Math.round(t.sys.heat) + '% heat' : null; break;
    case 'overmix': A.rings.push({ x: t.x, y: t.y, r: t.s.range * (t.sys && t.sys.over ? 1 / ab.range : ab.range) }); A.live = onMap().length > 0; break;
    case 'punchdown': {
      const a = t.s.atk.hook;
      const list = a ? acquireN(t, 99999, a, t.tg, ab.n, e => !e.big && !e.boss && !e.gold && !(e.holdT > 0) && !(e.blowD > 0)) : [];
      for (const e of list) A.marks.push(e);
      A.live = list.length > 0;
      break;
    }
    case 'pastageddon': A.trail = true; A.live = G.roundActive || onMap().length > 0; break;
    case 'leviathan': {
      let best = null, bs = -Infinity;
      for (const e of onMap()){ if (!e.big || e.hooked || e.burrowT > 0) continue; const sc = (e.boss ? 0 : 1e12) + e.tier * 1e9 + e.hp; if (sc > bs){ bs = sc; best = e; } }
      if (best){ A.marks = [best]; A.hooks = true; } else A.live = false;
      break;
    }
    case 'finale': A.screen = true; A.live = !!(t.sys && !(t.sys.wait > 0)) && onMap().length > 0; break;
    case 'strafe': A.trail = true; A.live = !!(t.sys && t.sys.wing > 0) && onMap().length > 0; A.gain = t.sys ? t.sys.wing + ' copters' : null; break;
    case 'refill': A.towers = G.towers.slice(); A.live = onMap().length > 0; break;
    case 'marketday': A.gain = '+' + money(vaultValue(t, ab.mult)); A.live = !!(t.sys && t.sys.vault > 0); break;
    /* the second wave */
    case 'sabotage': case 'smokebomb': case 'transmute': case 'tsunami':
      A.screen = true; A.live = ab.id === 'transmute' ? onMap().some(e => e.big) : onMap().length > 0 || (ab.id === 'sabotage' && G.roundActive); break;
    case 'takeaim': A.towers = strongestNear(t, t.s.range, ab.max || 6, true); A.rings.push({ x: t.x, y: t.y, r: t.s.range, soft: true }); A.live = A.towers.length > 0; break;
    case 'tonic': A.towers = [t].concat(ab.others && t.s.monsterSpec ? strongestNear(t, t.s.range, ab.others, false) : []); if (ab.others) A.rings.push({ x: t.x, y: t.y, r: t.s.range, soft: true }); A.live = true; break;
    case 'overclock': { const o = strongestNear(t, ab.global ? 9999 : t.s.range, 1, false); A.towers = o; if (!ab.global) A.rings.push({ x: t.x, y: t.y, r: t.s.range, soft: true }); A.live = o.length > 0; break; }
    case 'roar': {
      if (ab.global){ A.screen = true; A.live = onMap().length > 0; break; }
      const R = Math.max(260, t.s.range * 2.2);
      A.rings.push({ x: t.x, y: t.y, r: R });
      A.live = onMap().some(e => Math.hypot(e.x - t.x, e.y - t.y) <= R);
      break;
    }
    case 'icejet': if (ab.flood){ A.screen = true; A.live = onMap().length > 0; } else { A.marks = toughestN(Math.min(12, ab.balls), onMap()); A.live = A.marks.length > 0; } break;
    case 'shadowstrike': A.marks = toughestN(Math.min(16, (t.sys && t.sys.clones) || 0), onMap()); A.live = A.marks.length > 0; A.gain = t.sys ? t.sys.clones + ' clones' : null; break;
    case 'fanhammer': A.towers = [t]; A.live = onMap().length > 0; break;
    case 'highnoon': {
      const on = onMap(), w = on.filter(e => e.wanted === t);
      A.marks = w.length >= 6 ? w : w.concat(toughestN(6 - w.length, on.filter(e => e.wanted !== t)));
      A.live = A.marks.length > 0; A.gain = t.sys ? t.sys.notches + ' notches' : null;
      break;
    }
    case 'elixir': case 'overdrive': A.towers = G.towers.filter(o => o.s && Object.keys(o.s.atk).length); A.live = A.towers.length > 0; break;
    case 'megabot': A.trail = true; A.live = onMap().length > 0; break;
    case 'stampede': A.trail = true; A.live = onMap().length > 0; break;
    case 'feast': case 'kraken': { A.marks = toughestN(ab.n || 3, onMap().filter(e => e.big)); A.hooks = ab.id === 'kraken'; A.live = A.marks.length > 0; break; }
    case 'castle': case 'charge': A.trail = true; A.live = onMap().length > 0; break;
    case 'checkmate': { A.marks = toughestN(ab.n || 3, onMap().filter(e => e.big)); A.live = A.marks.length > 0; break; }
    case 'stalemate': A.screen = true; A.live = onMap().length > 0; break;
    case 'flurry': A.towers = [t]; A.live = onMap().length > 0; break;
    case 'fullspin': A.towers = ridersOf(t); A.rings.push({ x: t.x, y: t.y, r: t.size * 1.3, soft: true }); A.live = A.towers.length > 0; break;
    case 'valve': case 'serve': { A.rings.push({ x: t.x, y: t.y, r: t.s.range }); A.live = onMap().some(e => !(e.burrowT > 0) && Math.hypot(e.x - t.x, e.y - t.y) <= t.s.range + e.r) || ab.id === 'serve'; break; }
    case 'mochi': A.screen = true; A.live = onMap().length > 0; break;
    case 'gravyflood': { const R = t.s.range * (ab.rangeMul || 2.5); A.rings.push({ x: t.x, y: t.y, r: R }); A.live = onMap().some(e => !(e.burrowT > 0) && Math.hypot(e.x - t.x, e.y - t.y) <= R + e.r); break; }
    case 'grandpinch': { const on = onMap().filter(e => !e.air); A.marks = toughestN(ab.n || 4, on.filter(e => !e.boss)).concat(on.filter(e => e.boss).slice(0, 2)); A.live = A.marks.length > 0; break; }
    case 'bubblebath': A.marks = toughestN(ab.n || 12, onMap().filter(e => !e.boss && !e.air && (ab.big || !e.big))); A.live = A.marks.length > 0; break;
    case 'downpour': A.screen = true; A.live = onMap().length > 0; break;
    case 'hydroblast': A.trail = true; A.live = onMap().some(e => !e.boss && !e.air); break;
  }
  if (t.sys && paraAbBlocked(t, ab)) A.live = false;
  if (HERO_ABS[ab.id]) heroAbilityAim(t, ab, A);
  if (ab.custom){
    const reach = area => area === 'screen' || t.s.global ? Infinity : area === 'wide' ? Math.max(220, t.s.range * 2.5) : t.s.range;
    const L = onMap(), gains = [];
    let live = false;
    for (const a of ab.actions || []){
      if (a.area){
        const R = reach(a.area);
        if (R === Infinity) A.screen = true; else if (!A.rings.some(r => r.r === R)) A.rings.push({ x: t.x, y: t.y, r: R });
        if (L.some(e => !(e.burrowT > 0) && (R === Infinity || Math.hypot(e.x - t.x, e.y - t.y) <= R))) live = true;
      } else if (a.k === 'bombs' || a.k === 'strike'){
        const S = L.slice().sort(a.k === 'strike' ? (x, y) => ((y.boss ? 2e12 : y.big ? 1e12 : 0) + y.hp) - ((x.boss ? 2e12 : x.big ? 1e12 : 0) + x.hp) : (x, y) => y.tier - x.tier || y.hp - x.hp);
        for (const e of S.slice(0, a.k === 'strike' ? 1 : Math.min(16, a.count))) if (A.marks.indexOf(e) < 0) A.marks.push(e);
        if (S.length) live = true;
      } else if (a.k === 'speed'){
        const R = Math.max(200, t.s.range * 1.5);
        A.towers = a.who === 'self' ? [t] : a.who === 'same' ? G.towers.filter(o => o.type === t.type) : a.who === 'all' ? G.towers.slice() : G.towers.filter(o => Math.hypot(o.x - t.x, o.y - t.y) <= R);
        if (a.who === 'near') A.rings.push({ x: t.x, y: t.y, r: R, soft: true });
        if (L.length) live = true;
      } else if (a.k === 'cash' || a.k === 'lives'){
        const v = Math.round(a.amt * (ab.power || 1));
        gains.push(a.k === 'cash' ? '+' + money(v) : '+' + fmtN(v) + ' lives');
        live = true;
      }
    }
    if (gains.length) A.gain = gains.join(' · ');
    A.live = live;
  }
  return A;
}
/* the ability preview on the map: what it reaches, what it hits, and which appliance fires it */
function drawAbilityAim(ctx, time){
  const P = UI.abPreview;
  if (!P) return;
  if (P.until && UI.time > P.until){ UI.abPreview = null; return; }
  let t = P.t, ab = null;
  if (t){ if (G.towers.indexOf(t) < 0){ UI.abPreview = null; return; } ab = t.s.abilities.find(x => x.id === P.id); }
  else { const src = abilitySource(P.id); if (src){ t = src.t; ab = src.ab; } }
  if (!t || !ab) return;
  const A = abilityAim(t, ab), col = Art.abilityColor(ab), pulse = 0.5 + Math.sin(time * 6) * 0.5;
  const at = o => TOWERS[o.type].flyer && o.fx != null ? [o.fx, o.fy] : [o.x, o.y];
  const [sx, sy] = at(t);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (!A.screen){
    /* dim the kitchen, leaving a single area of effect lit like a spotlight */
    ctx.beginPath(); ctx.rect(0, 0, W, H);
    if (A.rings.length === 1){ const r = A.rings[0]; ctx.moveTo(r.x + r.r, r.y); ctx.arc(r.x, r.y, r.r, 0, TAU, true); }
    ctx.fillStyle = 'rgba(29,43,51,0.2)'; ctx.fill('evenodd');
  }
  if (A.screen){
    ctx.fillStyle = rgba(col, 0.12); ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 7; ctx.strokeStyle = rgba(col, 0.9); ctx.setLineDash([16, 12]); ctx.lineDashOffset = -time * 30;
    ctx.strokeRect(6, 6, W - 12, H - 12); ctx.setLineDash([]);
  }
  if (A.trail) for (const Pth of G.paths){
    ctx.beginPath(); Pth.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = rgba(col, 0.32); ctx.lineWidth = PATH_W * 0.95; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 14]); ctx.lineDashOffset = -time * 40; ctx.stroke(); ctx.setLineDash([]);
  }
  for (const r of A.rings){
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU);
    ctx.fillStyle = rgba(col, r.soft ? 0.1 : 0.18); ctx.fill();
    ctx.lineWidth = 5.5; ctx.strokeStyle = 'rgba(29,43,51,0.32)'; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.strokeStyle = rgba(col, 1); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -time * 20; ctx.stroke(); ctx.setLineDash([]);
  }
  if (A.drop){
    const d = A.drop;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fillStyle = rgba(col, 0.16); ctx.fill();
    ctx.lineWidth = 5.5; ctx.strokeStyle = 'rgba(29,43,51,0.32)'; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.strokeStyle = rgba(col, 1); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -time * 20; ctx.stroke(); ctx.setLineDash([]);
    const bob = Math.sin(time * 4) * 3;
    ctx.beginPath(); ctx.arc(d.x, d.y - 26 + bob, 13, Math.PI, TAU); ctx.closePath(); fillStroke(ctx, '#e2383f', '#fff', 1.5);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); for (const x of [-13, -4, 4, 13]){ ctx.moveTo(d.x + x, d.y - 26 + bob); ctx.lineTo(d.x, d.y - 9 + bob); } ctx.stroke();
    ctx.beginPath(); ctx.arc(d.x, d.y - 6 + bob, 4, 0, TAU); ctx.fillStyle = '#2d3527'; ctx.fill();
  }
  for (const o of A.towers){
    const [x, y] = at(o), r = o.size + 8 + pulse * 3;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = rgba(col, 0.16); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(29,43,51,0.32)'; ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = rgba(col, 1); ctx.setLineDash([7, 5]); ctx.lineDashOffset = -time * 16; ctx.stroke(); ctx.setLineDash([]);
  }
  for (const e of A.marks){
    if (A.hooks){ ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -time * 24; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.setLineDash([]); }
    const r = e.r + 6 + pulse * 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(29,43,51,0.4)'; ctx.stroke();
    ctx.lineWidth = 2.2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ ctx.moveTo(e.x + dx * (r - 4), e.y + dy * (r - 4)); ctx.lineTo(e.x + dx * (r + 6), e.y + dy * (r + 6)); }
    ctx.strokeStyle = rgba(col, 1); ctx.lineWidth = 2.6; ctx.stroke();
  }
  /* the appliance that fires it */
  ctx.beginPath(); ctx.arc(sx, sy, t.size + 12, 0, TAU);
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(29,43,51,0.35)'; ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.setLineDash([6, 5]); ctx.lineDashOffset = time * 18; ctx.stroke(); ctx.setLineDash([]);
  if (A.gain){
    ctx.font = '700 17px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
    const y = sy - t.size - 22 - pulse * 3;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(29,43,51,0.85)'; ctx.strokeText(A.gain, sx, y);
    ctx.fillStyle = '#ffcf4d'; ctx.fillText(A.gain, sx, y);
  }
  ctx.restore();
}

/* ---------------------------------------------------------------------
   Abilities bar. Hover a button (or press and hold it on a touch screen)
   for a card saying what it does, with a preview of where it will hit.
   --------------------------------------------------------------------- */
function buildAbilities(){
  const list = abilityList();
  const key = list.map(a => a.id + a.towers.length).join(',');
  const bar = $('#abilities');
  if (key === UI.abKey && bar.querySelectorAll('.ab[data-id]').length === list.length) return;
  UI.abKey = key;
  bar.innerHTML = '';
  if (G.mod && G.mod.noAbilities) return;
  if (list.length){
    /* hide or show the ability buttons; while they are hidden it counts the ready ones */
    const hide = h('button', { class:'ab-hide', id:'ab-hide', 'aria-controls':'abilities', onclick: () => toggleAbHidden() },
      h('svg', null), h('span', { class:'hl' }), h('span', { class:'hn', 'aria-hidden':'true' }));
    hide.querySelector('svg').outerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    bar.append(hide);
    const auto = h('button', { class:'ab-auto', id:'ab-auto', 'aria-label':'Auto abilities', title: 'Auto: fire every ability by itself as soon as it is ready' + (IS_TOUCH ? '' : ' (`)'), onclick: () => toggleAutoAll() },
      h('svg', null), h('span', { text:'Auto' }));
    auto.querySelector('svg').outerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 0 1-12 4.9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M5 12a7 7 0 0 1 12-4.9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M17.6 3.6l.2 4.1-4 .3M6.4 20.4l-.2-4.1 4-.3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    bar.append(auto);
  }
  list.forEach((ab, i) => {
    const A = ABILITIES[ab.id];
    const key = AB_KEYS[i] || '';
    const spec = ab.towers[0].s.abilities.find(x => x.id === ab.id) || { id: ab.id };
    const btn = h('button', { class:'ab', 'aria-label': A.name + (key ? ' (' + key + ')' : ''), 'aria-describedby':'ab-tip', style: '--ac:' + Art.abilityColor(spec),
      onclick: () => {
        if (btn._held){ btn._held = false; return; }   // that press was for reading, not firing
        Sfx.unlock(); if (!useAbility(ab.id)) Sfx.play('error');
        if (UI.abTip) renderAbTip(false);
      } },
      iconCanvas(Art.abilityIcon(spec, 64)), h('span', { class:'cdv' }), key ? h('span', { class:'k', text: key }) : null,
      ab.towers.length > 1 ? h('span', { class:'n', text: '×' + ab.towers.length }) : null, h('span', { class:'au', text:'A' }));
    btn.dataset.id = ab.id;
    btn.addEventListener('pointerenter', ev => { if (ev.pointerType === 'mouse') showAbTip(btn, 'hover'); });
    btn.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') hideAbTip(btn); });
    btn.addEventListener('focus', () => { if (btn.matches(':focus-visible')) showAbTip(btn, 'focus'); });
    btn.addEventListener('blur', () => { if (UI.abTip && UI.abTip.how === 'focus') hideAbTip(btn); });
    /* touch: a long press shows the card; letting go hides it without firing */
    btn.addEventListener('pointerdown', ev => {
      if (ev.pointerType === 'mouse') return;
      btn._held = false; clearTimeout(UI.abHold);
      UI.abHold = setTimeout(() => { btn._held = true; showAbTip(btn, 'hold'); try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {} }, 380);
    });
    const letGo = ev => { if (ev.pointerType === 'mouse') return; clearTimeout(UI.abHold); if (btn._held) hideAbTip(btn); };
    btn.addEventListener('pointerup', letGo);
    btn.addEventListener('pointercancel', ev => { letGo(ev); btn._held = false; });
    /* right-click switches auto on or off for just this ability */
    btn.addEventListener('contextmenu', ev => { ev.preventDefault(); if (ev.pointerType === 'mouse' || !IS_TOUCH) toggleAuto(ab.id); });
    bar.append(btn);
  });
  updateAutoMarks();
  applyAbHidden();
  if (UI.abTip) renderAbTip(true);
}
/* The ability bar can be tucked away so it doesn't cover the kitchen. Hotkeys and Auto still work while
   it is hidden, and the button left behind shows how many abilities are ready. */
function abHidden(){ return !!(Profile.settings && Profile.settings.hideAb); }
function applyAbHidden(){
  const bar = $('#abilities'), hid = abHidden();
  if (bar) bar.classList.toggle('collapsed', hid);
  const b = $('#ab-hide');
  if (b){
    b.setAttribute('aria-expanded', String(!hid));
    b.title = (hid ? 'Show the ability buttons' : 'Hide the ability buttons. Their hotkeys and Auto still work.') + (IS_TOUCH ? '' : ' (-)');
    const l = b.querySelector('.hl'); if (l) l.textContent = hid ? 'Show' : 'Hide';
  }
  if (hid && UI.abTip) hideAbTip();
  const box = $('#set-abbar'); if (box) box.checked = !hid;
  UI.abHideSig = null;
  updateAbilities();
}
function setAbHidden(on){
  Profile.settings.hideAb = !!on; saveProfile();
  applyAbHidden();
}
function toggleAbHidden(){
  Sfx.play('click');
  setAbHidden(!abHidden());
  if (abHidden()) toast('Abilities hidden. ' + (IS_TOUCH ? 'Tap Show to bring them back; Auto still works.' : 'Their hotkeys and Auto still work; press - or Show to bring them back.'), '');
}
function updateAbilities(){
  const bar = $('#abilities');
  const btns = bar.querySelectorAll('.ab[data-id]');
  if (!btns.length) return;
  const map = {};
  for (const a of abilityList()) map[a.id] = a;
  let ready = 0;
  for (const btn of btns){
    const ab = map[btn.dataset.id];
    if (!ab) continue;
    const frac = ab.max ? clamp(ab.cd / ab.max, 0, 1) : 0;
    btn.style.setProperty('--cd', frac.toFixed(3));
    const on = ab.cd <= 0 && !abBlocked(ab.id);
    btn.classList.toggle('ready', on);
    btn.classList.toggle('switched', ab.towers.some(t => t.sys && t.sys.over));   // Overmix is switched on
    if (on) ready++;
  }
  const hb = $('#ab-hide'), hid = abHidden(), sig = hid + ':' + ready;
  if (hb && UI.abHideSig !== sig){
    UI.abHideSig = sig;
    const hn = hb.querySelector('.hn');
    hn.textContent = ready ? String(ready) : ''; hn.classList.toggle('on', ready > 0);
    hb.setAttribute('aria-label', hid ? 'Show abilities' + (ready ? ', ' + ready + ' ready' : '') : 'Hide abilities');
  }
  if (UI.abTip) renderAbTip(false);
}

/* ---------------------------------------------------------------------
   Auto abilities: every 10 ms, each ability set to auto fires as soon
   as it is ready and has pests to work on (a crate of cash or lives
   doesn't need any). The AUTO button switches every ability at once;
   right-click a button, or use the switch in the appliance's panel,
   for just one.
   --------------------------------------------------------------------- */
const AUTO_MS = 10;
function autoOn(id){ const S = Profile.settings, o = S.autoSet ? S.autoSet[id] : undefined; return typeof o === 'boolean' ? o : !!S.autoAb; }
function barAbilityIds(){ return Array.from($$('#abilities .ab[data-id]')).map(b => b.dataset.id); }
function toggleAutoAll(){
  const ids = barAbilityIds(), S = Profile.settings;
  const allOn = ids.length > 0 && ids.every(autoOn);
  S.autoAb = !allOn; S.autoSet = {};
  saveProfile(); Sfx.play('click');
  toast(S.autoAb ? 'Auto abilities on: each one fires by itself as soon as it is ready.' : 'Auto abilities off.', S.autoAb ? 'gold' : '');
  updateAutoMarks(); autoAbilityTick();
}
function toggleAuto(id){
  const S = Profile.settings, on = !autoOn(id);
  S.autoSet = S.autoSet || {};
  if (on === !!S.autoAb) delete S.autoSet[id]; else S.autoSet[id] = on;
  saveProfile(); Sfx.play('click');
  toast((ABILITIES[id] ? ABILITIES[id].name : 'Ability') + ': auto ' + (on ? 'on' : 'off') + '.', on ? 'gold' : '');
  updateAutoMarks(); autoAbilityTick();
}
/* lights the AUTO button (fully, partly or not at all) and marks each auto ability */
function updateAutoMarks(){
  const ids = barAbilityIds(), n = ids.filter(autoOn).length;
  const b = $('#ab-auto');
  if (b){
    const st = !n ? 'false' : n === ids.length ? 'true' : 'mixed';
    b.setAttribute('aria-pressed', st);
    b.title = (st === 'true' ? 'Auto is on for every ability. Click to switch it off.' : st === 'mixed' ? 'Auto is on for ' + n + ' of ' + ids.length + ' abilities. Click to switch it on for all.' : 'Auto: fire every ability by itself as soon as it is ready.') + (IS_TOUCH ? '' : ' (`)');
  }
  for (const btn of $$('#abilities .ab[data-id]')) btn.classList.toggle('auto', autoOn(btn.dataset.id));
  for (const sw of $$('#tpanel .abil-auto[data-ab]')){ const on = autoOn(sw.dataset.ab); sw.setAttribute('aria-pressed', String(on)); sw.textContent = on ? 'Auto on' : 'Auto off'; }
  if (UI.abTip) renderAbTip(true);
}
function autoAbilityTick(){
  if (UI.screen !== 'game' || !G.active || G.over || G.paused || G.attract || UI.skipping || UI.modalOpen) return;
  if (G.mod && G.mod.noAbilities) return;
  const S = Profile.settings;
  if (!S.autoAb && !(S.autoSet && Object.values(S.autoSet).some(Boolean))) return;
  let fired = false;
  for (const a of abilityList()){
    if (a.cd > 0 || !autoOn(a.id)) continue;
    const src = abilitySource(a.id);
    if (!src || src.cd > 0 || src.ab.toggle || !abilityAim(src.t, src.ab).live) continue;   // a switch (Overmix) is never flipped by Auto
    if (useAbility(a.id)) fired = true;
  }
  if (fired) updateAbilities();
}
function showAbTip(btn, how){
  UI.abTip = { id: btn.dataset.id, btn, how };
  UI.abPreview = { id: btn.dataset.id };
  renderAbTip(true);
}
function hideAbTip(btn){
  if (btn && UI.abTip && UI.abTip.btn !== btn) return;
  UI.abTip = null;
  if (UI.abPreview && !UI.abPreview.t) UI.abPreview = null;
  const tip = $('#ab-tip');
  if (tip){ tip.hidden = true; tip.dataset.key = ''; }
}
/* fills in (full) or refreshes the card: the status line ticks while it is open */
function renderAbTip(full){
  const T = UI.abTip, tip = $('#ab-tip');
  if (!T || !tip) return;
  if (!T.btn.isConnected){
    const nb = $('#abilities .ab[data-id="' + T.id + '"]');
    if (!nb){ hideAbTip(); return; }
    T.btn = nb;
  }
  const src = abilitySource(T.id);
  if (!src){ hideAbTip(); return; }
  const D = abilityDetails(src.ab, src.t.s), list = abilityList(), i = list.findIndex(a => a.id === T.id), key = AB_KEYS[i] || '';
  const Tw = TOWERS[src.t.type], from = src.t.paragon ? Tw.paragon.name : src.t.hero ? Tw.name + ', level ' + src.t.level : Tw.name + ' ' + src.t.up.join('-');
  const sig = T.id + '|' + from + '|' + src.n + '|' + D.text + '|' + key + '|' + autoOn(T.id);
  if (full || tip.dataset.key !== sig){
    tip.dataset.key = sig;
    tip.innerHTML = '';
    tip.style.setProperty('--ac', Art.abilityColor(src.ab));
    tip.append(
      h('div', { class:'abt-head' }, iconCanvas(Art.abilityIcon(src.ab, 64)),
        h('div', { class:'abt-title' }, h('b', { text: D.name }), h('span', { class:'abt-sub' }, key && !IS_TOUCH ? h('kbd', { text: key }) : null, 'Recharges in ' + abSec(D.cd)))),
      h('p', { class:'abt-txt', text: D.text }),
      h('div', { class:'abt-foot' }, iconCanvas(src.t.hero ? Art.chefPortrait(src.t.type, 64) : Art.towerIcon(src.t.type, 64, src.t.paragon ? [5, 5, 5] : src.t.up, src.t.paragon)),
        h('span', { class:'abt-from', text: (src.n > 1 ? 'Next from ' : 'From ') + from + (src.n > 1 ? ' (you have ' + src.n + ')' : '') }),
        h('span', { class:'abt-st' })),
      h('div', { class:'abt-auto' + (autoOn(T.id) ? ' on' : '') }, h('b', { text: autoOn(T.id) ? 'Auto on' : 'Auto off' }),
        h('span', { text: (autoOn(T.id) ? 'Fires by itself as soon as it is ready and has pests to work on.' : 'Only fires when you press it.') + (IS_TOUCH ? ' Change it in the appliance’s panel.' : ' Right-click to change.') })));
    tip.hidden = false;
  }
  /* status */
  const st = tip.querySelector('.abt-st');
  let txt, cls;
  if (src.cd > 0){ txt = 'Recharging · ' + Math.ceil(src.cd) + 's'; cls = ''; }
  else if (abBlocked(T.id)){ txt = 'Used this round'; cls = 'wait'; }
  else if (!abilityAim(src.t, src.ab).live){ txt = 'Ready · waiting for pests'; cls = 'wait'; }
  else { txt = src.n > 1 ? src.ready + ' of ' + src.n + ' ready' : 'Ready'; cls = 'ready'; }
  if (st.textContent !== txt) st.textContent = txt;
  st.className = 'abt-st' + (cls ? ' ' + cls : '');
  /* sit above the button, unless that would hide what the preview points at */
  if (full || !T.spot || UI.time - (T.placed || 0) > 0.6){ T.placed = UI.time; T.spot = abTipSpot(T, src, tip, T.spot); }
  const S = T.spot;
  tip.style.left = S.left + 'px'; tip.style.top = S.top + 'px';
  tip.classList.toggle('far', S.id !== 'btn' && S.id !== 'under');
  tip.classList.toggle('under', S.id === 'under');
  if (S.cx != null) tip.style.setProperty('--ax', clamp(S.cx - S.left, 14, S.w - 14) + 'px');
}
function abTipSpot(T, src, tip, cur){
  /* the card lives in the stage column, so on small screens it can sit below the kitchen instead of over it */
  const col = $('#stage-col').getBoundingClientRect(), sr = $('#stage').getBoundingClientRect(), br = T.btn.getBoundingClientRect(), cr = $('#cv').getBoundingClientRect();
  const w = tip.offsetWidth, ht = tip.offsetHeight, k = cr.width / W;
  const L0 = sr.left - col.left, T0 = sr.top - col.top, ox = cr.left - col.left, oy = cr.top - col.top;
  const cx = br.left - col.left + br.width / 2;
  const fitX = x => clamp(x, L0 + 6, Math.max(L0 + 6, L0 + sr.width - w - 6));
  if (ht > sr.height * 0.5 && window.innerHeight - sr.bottom - 14 >= ht) return { id:'under', cx, w, left: fitX(cx - w / 2), top: T0 + sr.height + 14 };
  const below = el => { const r = el && el.getBoundingClientRect(); return r && r.height ? r.bottom - col.top + 8 : 0; };
  const top = Math.max(T0 + 8, below($('#stage .hud'))), topR = Math.max(top, below($('#boss-bars')));
  const above = br.top - col.top - 10 - ht;
  const spots = [
    { id:'btn', cx, w, left: fitX(cx - w / 2), top: Math.max(T0 + 4, above), cost: above < T0 + 4 ? 100 : 0 },
    { id:'tl', left: L0 + 8, top, cost: 0 },
    { id:'tr', left: fitX(L0 + sr.width - w - 8), top: topR, cost: 0 },
  ];
  const A = abilityAim(src.t, src.ab), pts = [];
  const pos = o => TOWERS[o.type].flyer && o.fx != null ? [o.fx, o.fy] : [o.x, o.y];
  const add = (x, y, wt) => pts.push([ox + x * k, oy + y * k, wt]);
  for (const e of A.marks) add(e.x, e.y, 3);
  if (A.drop) add(A.drop.x, A.drop.y, 3);
  add(...pos(src.t), 2);
  for (const o of A.towers) if (o !== src.t) add(...pos(o), 1);
  pts.push([cx, br.top - col.top + br.height / 2, 50]);   // never cover the button itself
  for (const sp of spots) sp.cost += pts.reduce((n, [x, y, wt]) => n + (x > sp.left - 14 && x < sp.left + w + 14 && y > sp.top - 14 && y < sp.top + ht + 14 ? wt : 0), 0);
  const was = cur && spots.find(sp => sp.id === cur.id);
  let best = spots[0];
  for (const sp of spots) if (sp.cost < best.cost) best = sp;
  return was && was.cost <= best.cost ? was : best;
}
/* the panel's list of this appliance's abilities */
function abilitySection(t){
  const list = abilityList();
  const wrap = h('div', { class:'abils' }, h('div', { class:'abils-head', text: t.s.abilities.length > 1 ? 'Abilities' : 'Ability' }));
  for (const ab of t.s.abilities){
    const D = abilityDetails(ab, t.s), i = list.findIndex(x => x.id === ab.id), key = AB_KEYS[i] || '';
    const row = h('div', { class:'abil', 'data-ab': ab.id, style: '--ac:' + Art.abilityColor(ab), title: IS_TOUCH ? null : 'Hover to see where it hits' },
      iconCanvas(Art.abilityIcon(ab, 64)),
      h('div', { class:'abil-body' },
        h('div', { class:'abil-head' }, h('b', { text: D.name }), key && !IS_TOUCH ? h('kbd', { text: key }) : null),
        h('p', { text: D.text }),
        h('div', { class:'abil-foot' }, h('small', { text: 'Recharges in ' + abSec(D.cd) + (IS_TOUCH ? ' · tap to see where it hits' : '') }), h('span', { class:'abil-st' })),
        G.mod && G.mod.noAbilities ? null : h('button', { class:'abil-auto', 'data-ab': ab.id, 'aria-pressed': String(autoOn(ab.id)), title:'Fire this ability by itself as soon as it is ready', onclick: ev => { ev.stopPropagation(); toggleAuto(ab.id); }, text: autoOn(ab.id) ? 'Auto on' : 'Auto off' })));
    row.addEventListener('pointerenter', ev => { if (ev.pointerType === 'mouse') UI.abPreview = { id: ab.id, t }; });
    row.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse' && UI.abPreview && UI.abPreview.t === t && !UI.abPreview.until) UI.abPreview = null; });
    row.addEventListener('click', () => { UI.abPreview = { id: ab.id, t, until: UI.time + 3 }; });
    wrap.append(row);
  }
  return wrap;
}

/* ---------------------------------------------------------------------
   Round controls
   --------------------------------------------------------------------- */
function goButton(){
  Sfx.unlock();
  if (!G.active || G.over) return;
  if (!G.roundActive){
    if (G.won && !G.freeplay){ showVictory(false, false); return; }
    if (startRound()){ UI.autoArmed = true; UI.autoLeft = null; }
  } else cycleSpeed();
}
/* Auto-start: once the player has started a round (or switched auto-start on),
   the next round begins shortly after each one is cleared. Checked every frame,
   so dialogs, pausing, freeplay and toggling mid-game all behave. */
const AUTO_AFTER_ROUND = 1.0, AUTO_AFTER_TOGGLE = 2.5;
function autoBlocked(){
  return !G.active || G.attract || UI.skipQueued || UI.skipping || G.over || G.paused || UI.modalOpen || UI.screen !== 'game' || !$('#keypad').hidden || (G.won && !G.freeplay);
}
function autoTick(dt){
  if (!Profile.settings.auto || !UI.autoArmed || G.roundActive){ UI.autoLeft = null; return; }
  if (autoBlocked()){ if (UI.autoLeft != null) UI.autoLeft = Math.max(UI.autoLeft, AUTO_AFTER_ROUND); return; }
  if (UI.autoLeft == null) UI.autoLeft = AUTO_AFTER_ROUND;
  UI.autoLeft -= dt;
  if (UI.autoLeft <= 0){ UI.autoLeft = null; startRound(); }
}
function setAutoStart(on){
  Profile.settings.auto = !!on; saveProfile();
  const box = $('#auto-start'); if (box) box.checked = !!on;
  if (!on){ UI.autoLeft = null; return; }
  if (UI.screen === 'game' && G.active && !G.attract){
    UI.autoArmed = true;
    if (!G.roundActive && !autoBlocked()){ UI.autoLeft = AUTO_AFTER_TOGGLE; toast('Auto-start is on. Round ' + G.round + ' starts in a moment.', 'info'); }
  }
}
function cycleSpeed(){
  const speeds = [1, 2, 3];
  const i = speeds.indexOf(G.speed);
  G.speed = speeds[(i + 1) % speeds.length] || 1;
  Sfx.play('click');
}

/* ---------------------------------------------------------------------
   Modals
   --------------------------------------------------------------------- */
function modal(o){
  UI.modalOpts = o;
  const wrap = $('#modal'), body = $('#modal-body');
  body.innerHTML = '';
  body.className = 'modal' + (o.wide ? ' wide' : '') + (o.cls ? ' ' + o.cls : '');
  if (o.title) body.append(h('h2', { text: o.title }));
  if (o.lead) body.append(h('p', { class:'lead', text: o.lead }));
  if (o.content) for (const c of [].concat(o.content)) if (c) body.append(c);
  if (o.actions){
    const acts = h('div', { class:'acts' });
    for (const a of o.actions){
      acts.append(h('button', { class:'btn ' + (a.kind ? 'btn-' + a.kind : ''), onclick: () => { Sfx.play('click'); if (!a.keep) closeModal(); if (a.onClick) a.onClick(); } }, a.label));
    }
    body.append(acts);
  }
  if (o.foot) body.append(o.foot);
  wrap.hidden = false;
  UI.modalOpen = true;
  UI.modalDismiss = o.dismissable === false ? null : (o.onClose || (() => {}));
  body.scrollTop = 0;
  const first = o.noFocus ? null : body.querySelector('.acts .btn-primary') || body.querySelector('button');
  if (first && !IS_TOUCH) setTimeout(() => first.focus(), 30);
}
function closeModal(){ $('#modal').hidden = true; UI.modalOpen = false; }
function statBlock(pairs){ return h('div', { class:'statline' }, pairs.map(([a, b]) => h('div', { class:'stat' }, h('b', { text: b }), h('span', { text: a })))); }
function xpList(){
  const rows = Object.entries(G.xpGame || {}).filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return null;
  return h('div', { class:'xp-list' }, h('p', { class:'lead', text:'Mastery XP earned' }), rows.map(([type, v]) => h('div', { class:'xp-row' },
    iconCanvas(Art.towerIcon(type, 64)), h('span', {}, h('b', { text: TOWERS[type].name }), ' · ' + RANKS[masteryRank(type)].name), h('span', { class:'num', text: '+' + fmt(v) + ' XP' }))));
}
function showVictory(fresh, freshMM, reward){
  if (G.ch){ showChallengeVictory(reward); return; }
  if (G.ev){ showEventVictory(); return; }
  const colors = { easy:'#c98a45', medium:'#aab6bc', hard:'#f2c14e', michelin:'#e2383f' };
  const medal = h('div', { class:'big-medal' + (G.M ? ' mode' : ''), style:{ background: colors[G.diff] }, text: G.M ? G.M.glyph : { easy:'E', medium:'M', hard:'H', michelin:'★' }[G.diff] });
  modal({ title:'Kitchen saved!', lead: MAPS[G.mapId].name + ' on ' + G.D.name + (G.M ? ' · ' + G.M.name : '') + (G.mm ? ' in Mastery Mode' : '') + ' is clear. ' + (fresh ? 'New medal: ' + medalName(G.diff, G.mode) + '.' : 'Medal already earned.') + (freshMM ? ' Mastery Mode medal earned too.' : ''),
    content:[medal, statBlock([['Rounds', fmt(G.round - 1)], ['Pests cooked', fmt(G.stats.kills)], ['Cash earned', money(G.stats.earned)]]), rewardSummary(), xpList()],
    actions:[{ label:'Keep cooking (freeplay)', kind:'primary', onClick: () => { continueFreeplay(); toast('Freeplay! Rounds keep getting tougher.', 'gold'); } }, { label:'Back to menu', onClick: exitToMenu }],
    dismissable:false });
}
function showDefeat(){
  if (G.ch && G.ch.ex){ showExDefeat(); return; }
  const noRetry = modeNoRetry();
  modal({ title:'The pantry fell', lead:'The pests broke through on round ' + G.round + '. ' + (noRetry ? G.M.name + ' allows no retries: start again from round ' + G.M.start + '.' : 'You can retry from the start of this round with the same kitchen.'),
    content:[statBlock([['Rounds survived', fmt(Math.max(0, G.round - G.stats.start))], ['Pests cooked', fmt(G.stats.kills)], ['Cash earned', money(G.stats.earned)]]), rewardSummary(), xpList()],
    actions:[noRetry ? null : { label:'Retry round ' + G.round, kind:'primary', onClick: () => { retryRound(); enterGame(); } },
      { label: G.ch ? 'Restart challenge' : 'Restart game', kind: noRetry ? 'primary' : '', onClick: () => { pickSlot(activeSlot()); startNewGame(G.mapId, G.diff, G.mm, G.ch, G.mode); } },
      { label:'Menu', onClick: () => { G.active = false; show('menu'); } }],
    dismissable:false });
}
function pauseGame(){
  if (!G.active || G.over || G.attract) return;
  G.paused = true;
  const resume = () => { G.paused = false; };
  const clock = h('span', { class:'clock', id:'pause-clock', text:'12:00', style:{ alignSelf:'flex-end' } });
  clock.addEventListener('click', clockTap);
  modal({ title:'Paused', lead: (G.ch ? G.ch.name + ' · ' : '') + MAPS[G.mapId].name + ' · ' + G.D.name + (G.M ? ' · ' + G.M.name : '') + (G.mm ? ' · Mastery Mode' : '') + ' · Round ' + G.round + (G.ch ? '. ' + challengeRulesText(G.ch) : G.M ? '. ' + modeRulesText() + '.' : ''),
    content:[settingsForm(true), G.doughGame || G.chefXpGame ? h('p', { class:'note', text:'This game so far: +' + fmt(G.doughGame || 0) + ' Dough and +' + fmt(G.chefXpGame || 0) + ' chef XP.' }) : null, h('p', { class:'note', text:'Progress saves at the start and end of every round, so leaving mid-round brings you back to the start of it.' })],
    actions:[{ label:'Resume', kind:'primary', onClick: resume }, { label:'How to play', onClick: () => showHowTo(pauseGame) }, { label:'Game stats', onClick: () => showGameStats(pauseGame) }, { label:'Save and exit', onClick: () => { G.paused = false; exitToMenu(); } },
      { label:'Restart', onClick: () => confirmBox('Restart this game?', 'Your towers and progress on this map will be wiped.', 'Restart', () => { pickSlot(activeSlot()); const ch = G.ch && G.ch.ex && exRecord() ? exLeg(exRecord()) : G.ch; startNewGame(G.mapId, G.diff, G.mm, ch, G.mode); }, pauseGame) }],
    onClose: resume, foot: clock });
}
function confirmBox(title, lead, label, yes, no){
  modal({ title, lead, actions:[{ label:'Cancel', onClick: no }, { label, kind:'primary', onClick: yes }], onClose: no });
}
function setPerf(on){
  Profile.settings.perf = !!on; saveProfile();
  if (on){ G.parts.length = 0; G.fx = G.fx.filter(f => f.k !== 'flash'); G.shake = 0; }
  Art.clearIcons();   // performance mode draws appliances flat
  if (UI.screen === 'game'){ layoutStage(); if (G.active) buildShop(); }
  const b = $('#btn-perf'); if (b){ b.setAttribute('aria-pressed', String(!!on)); }
  const box = $('#set-perf'); if (box) box.checked = !!on;
}
function settingsForm(compact){
  const S = Profile.settings;
  const save = () => { saveProfile(); Sfx.setVolume(); };
  const sw = (id, label, desc, val, on) => {
    const inp = h('input', { type:'checkbox', id }); inp.checked = val;
    inp.addEventListener('change', () => { on(inp.checked); save(); });
    return h('label', { class:'toggle-row', for: id }, h('span', { class:'txt' }, h('b', { text: label }), desc ? h('span', { text: desc }) : null), h('span', { class:'switch' }, inp, h('i')));
  };
  const vol = h('input', { type:'range', min:'0', max:'1', step:'0.05', id:'vol', 'aria-label':'Volume' }); vol.value = S.volume;
  vol.addEventListener('input', () => { S.volume = +vol.value; Sfx.setVolume(); });
  vol.addEventListener('change', save);
  const wrap = h('div', { style:{ display:'flex', flexDirection:'column', gap:'10px' } },
    sw('set-sound', 'Sound', null, S.sound, v => { S.sound = v; Sfx.unlock(); Sfx.setVolume(); }),
    sw('set-music', 'Music', 'The kitchen radio: a tune that swings during rounds and turns tense for bosses.', S.music !== false, v => { S.music = v; Sfx.unlock(); Sfx.setVolume(); }),
    h('div', { class:'form-row' }, h('label', { for:'vol', text:'Volume' }), vol),
    sw('set-dmg', 'Damage numbers', 'Hits add up over a pest for a moment, then float off it as a number.', !!S.dmgNums, v => { S.dmgNums = v; }),
    sw('set-fx', 'Full effects', 'Turn off to cut particles on slower devices.', S.fx !== 'low', v => { S.fx = v ? 'high' : 'low'; }),
    sw('set-depth', '3D kitchen', 'Appliances and the kitchens\' props are 3D models that cast shadows. Turn off for the flat look.', S.depth !== false, v => { S.depth = v; Art.clearIcons(); redrawKitchens(); if (UI.screen === 'game' && G.active){ buildShop(); updatePanel(true); buildAbilities(); } }),
    sw('set-abbar', 'Ability bar', 'Show the ability buttons at the bottom left of the kitchen. While they are hidden, their hotkeys and Auto still work.', !abHidden(), v => setAbHidden(!v)),
    sw('set-perf', 'Performance mode', 'Removes most particles, screen flashes and shake, and draws at a lower resolution. Best for long games and slower devices. The 3D kitchen stays on (switch it off above for the flat look).', !!S.perf, v => setPerf(v)),
    ...accessRows(sw));
  if (!compact) wrap.append(sw('set-auto', 'Auto-start rounds', 'Once you start a round, the next one begins as soon as it is cleared.', S.auto, v => setAutoStart(v)));
  return wrap;
}
function showHowTo(back){
  const li = (...kids) => h('li', {}, ...kids);
  const kb = k => h('kbd', { text: k });
  const dmg = [['Sharp', 'Knife Block, Blender blades, Stand Mixer chips, Pepper Gatling, carrot stars, ketchup squirts, mustard seeds, olives, pickles, skewers, sprinkles, icicles, crumbs', 'Weevils'], ['Blast', 'Toaster, popcorn, Pizza Oven, meatballs, mustard missiles, ravioli mines', 'Pillbugs'], ['Heat', 'Grill coals and flames, hot oil, hot steam, roasted grapes', 'Fire Ants'], ['Energy', 'Microwave pulses, mixer lightning', 'Fire Ants'], ['Cold', 'Freezer', 'Snow Fleas'], ['Impact', 'Dishwasher, Pasta Maker, Soda Siphon, Saucepan vinegar, fries, sonar, upgraded blades and chips', 'Nothing']];
  const tbl = h('div', { class:'dmg-table' }, dmg.flatMap(([a, b, c]) => [h('b', { text: a }), h('span', { text: b }), h('span', { class: c === 'Nothing' ? '' : 'imm', text: c === 'Nothing' ? 'hits all' : c + ' immune' })]));
  modal({ title:'How to play', content:[h('div', { class:'howto' },
    h('div', {}, h('h3', { text:'The basics' }), h('ul', {},
      li('Pests crawl along the trail to the pantry door. Every pest that gets through costs lives; bosses end the game.'),
      li(VERB + ' an appliance in the shop, then ' + VERB.toLowerCase() + ' beside the trail to place it. Cooking pests earns cash; each cleared round pays a bonus.'),
      li('Bread Machines bake loaves: ' + (IS_TOUCH ? 'tap' : 'hover over') + ' them before they go stale. Espresso Machines speed up nearby appliances.'),
      li('Pizza Ovens reach the whole kitchen: aim them at pests or pick a fixed spot. Pasta Makers lay nests on the trail during rounds.'),
      li('The Pepper Gatling sprays wherever you point, anywhere on the map: ' + (IS_TOUCH ? 'tap the kitchen to move its target.' : 'move your mouse over the kitchen to aim it.') + ' Or press Lock in its panel and ' + VERB.toLowerCase() + ' a spot: it keeps firing there, even during skips. Unlocked, it aims by itself during skips.'),
      li('Every kitchen has water: a sink, a soda spill, a puddle or melt pools. The Gravy Boat and Sub Sandwich float there and nowhere else. The Lobster Tank works on land or water, with 35% more range on the water. Nothing else can be built on it.'),
      li('The Whisk Copter and Flying Saucer take off from a pad. In their panel, choose how they fly: the copter can follow your ' + (IS_TOUCH ? 'taps' : 'pointer') + ', patrol, hover or (after Pursuit) hunt anywhere; the saucer flies a circle, a figure eight, a wide loop or (after Tight Loop) a tight one. ' + VERB + ' the craft or its pad to select it.'),
      li('Every wave is tougher than the last: more pests, and they gain health and speed as the waves go on (faster on harder difficulties). Tougher pests pay a little more. The arrow chip shows how much tougher they are now.'),
      li('Rounds 1 to 100 are a set menu, the same every game: the small fry first, the immune pests from round 20, the first cheese wheel on round 40, a picnic basket on 60, a food truck on 80, midnight roaches from 90 and the raccoon on 100. Bosses have their own game mode: Bosses on the main menu, where you fight any of the thirteen (Normal or Elite) or all of them in the Boss Rush. Each boss has skulls on its health bar where it does its big move. Boss Night brings one of them every week; ordinary games and freeplay have none. The next-wave preview under the Start button shows what is coming, bosses included.'),
      li('Skip 10 and Skip 100 play the next 10 or 100 waves out instantly with your current kitchen and tells you first whether you would survive or lose, and on which wave. Nothing changes unless you confirm, and you cannot build during skipped waves.'))),
    h('div', {}, h('h3', { text:'Upgrades' }), h('ul', {},
      li('Every appliance has three paths of five tiers. You can buy two paths, and only one of them can go past tier 2.'),
      li('Copy a placed appliance from its panel' + (IS_TOUCH ? '' : ' (Ctrl+C)') + ', then Paste it from the top of the shop' + (IS_TOUCH ? '' : ' (Ctrl+V)') + ' to place a copy with the same upgrades and targeting, for the full combined price.'),
      li('Skins change how an appliance looks. Each mastery rank unlocks new ones: pick them from the Skins tab in Mastery, or from an appliance\u2019s panel during a game.'),
      li('Pick one of the five squares next to a path name to buy every tier up to that square at once. Hover to see the total price.'),
      li('Tier 4, tier 5 and paragons unlock as an appliance gains mastery from the damage it deals.'),
      li('Some upgrades and most paragons add an ability: a round button at the bottom left of the kitchen. ' + (IS_TOUCH ? 'Press and hold it' : 'Hover over it') + ' to see what it does and where it will hit, and ' + VERB.toLowerCase() + ' it to fire. The appliance\u2019s panel lists its abilities too.'),
      li('Auto abilities: ' + VERB.toLowerCase() + ' AUTO at the start of the ability bar' + (IS_TOUCH ? '' : ' (or press `)') + ' and every ability fires by itself the moment it is ready, checked every 10 milliseconds. Boosts and blasts wait until there are pests to hit; cash and lives drops go straight away. ' + (IS_TOUCH ? 'Use the Auto switch in an appliance\u2019s panel' : 'Right-click an ability, or use the Auto switch in its appliance\u2019s panel,') + ' to change just that one.'),
      li('Hide the ability bar with the Hide button at its start' + (IS_TOUCH ? '' : ' (or press -)') + ' when it covers the kitchen. The button stays behind, counting the abilities that are ready, and ' + (IS_TOUCH ? 'tapping it' : 'clicking it') + ' brings them back. Auto' + (IS_TOUCH ? '' : ' and the ability keys') + ' keep working meanwhile.'),
      li('Paragon: own a tier 5 of all three paths of the same appliance and reach Executive Chef. It merges every copy into one giant tower with a system of its own (fuel, heat, hooks, a market...) shown in its panel and on a bar under it.'),
      li('Paragon degree runs from 1 to 100 and makes it faster and stronger. It comes from cash spent on the copies it merges, the damage they dealt, extra tier 5s and their upgrades. It keeps rising after it is built: from the damage it deals, cash you invest from its panel and copies you merge into it later.'),
      li('Appliances belong to five factions: Prep Station, Hot & Cold, Specialty, Fleet and Front of House. Filter the shop by faction with the chips above it. In Mastery, Tower mastery lists them by faction; pick one to see all of its upgrades and its paragon, and try out builds.'))),
    h('div', {}, h('h3', { text:'Progress and rewards' }), h('ul', {},
      li('Every round you clear earns Dough and chef XP, more on harder difficulties and in Mastery Mode. Wins, new medals and achievements pay extra. Chef levels pay Dough, and every fifth level a crate.'),
      li('Daily specials: open a free chest every day, bigger for each day in a row, and play the daily challenge: a set kitchen, rounds, appliances and two house rules, with a reward for the first win each day.'),
      li('The Pantry Shop sells powers and crates for Dough. Crates hold insta appliances: ready-made, upgraded appliances you place for free.'),
      li('Use powers and insta appliances from the Powers button at the bottom right of the kitchen. They stay in the pantry during daily challenges and on Michelin.'),
      li('Now and then a Golden Roach scuttles through a round. It can’t be frozen, stunned or slowed, and it darts ahead every few seconds. It never costs lives, but cook it before it escapes for bonus cash and Dough.'),
      li('Achievements are in Mastery. Each pays Dough once.'))),
    h('div', {}, h('h3', { text:'Head chefs' }), h('ul', {},
      li('Every game you can hire one head chef: the card above the shop' + (IS_TOUCH ? '' : ' (or press 0)') + '. Chef Blaze is yours from the start; Chef Gelato and Chef Penny join for free at chef levels ' + HEROES.chef_gelato.unlock.level + ' and ' + HEROES.chef_penny.unlock.level + ', or hire them sooner for Dough in Chefs on the menu.'),
      li('A head chef starts at level 1 and earns XP from every round you clear, up to level 20. Each level makes them stronger, and levels 3 and 10 bring abilities. ' + VERB + ' your chef to see the 20 levels, or level up straight away for cash' + (IS_TOUCH ? '.' : ' (,).')),
      li('Chef Blaze sets pests on fire, Chef Gelato slows and freezes them, and Chef Penny brings in cash and speeds up the appliances around her.'))),
    h('div', {}, h('h3', { text:'Damage and immunities' }), tbl,
      h('p', { style:{ marginTop:'6px' }, text:'Ghost pests can only be targeted by appliances with ghost sight. Moldy pests regrow unless burned. Vehicles shrug off most freezing, slowing and knockback.' })),
    IS_TOUCH ? null : h('div', {}, h('h3', { text:'Keys' }), h('ul', {},
      li(kb('Q'), ' to ', kb('P'), ', ', kb('A'), ' to ', kb('L'), ' and ', ...TOWER_ORDER.filter(t => TOWERS[t].code || /^[<>]$/.test(TOWERS[t].hot)).flatMap((t, i) => [i ? ' ' : '', kb(TOWERS[t].hot)]), ' pick appliances · ', kb(','), ' ', kb('.'), ' ', kb('/'), ' buy path 1, 2, 3 · ', kb('Tab'), ' targeting'),
      li(kb('Space'), ' start round or change speed · ', kb('Z'), ' to ', kb('M'), ', then ', kb('1'), ' to ', kb('9'), ' fire abilities in bar order · ', kb('-'), ' hide or show the ability bar · ', kb('Del'), ' sell · ', kb('Esc'), ' pause'),
      li(kb('0'), ' place your head chef (or select it) · ', kb(','), ' level the selected chef up'))))],
    actions:[{ label:'Got it', kind:'primary', onClick: back }], onClose: back });
}
function showSettings(){
  modal({ title:'Settings', content:[settingsForm(false)], actions:[{ label:'Done', kind:'primary' }] });
}

/* ---------------------------------------------------------------------
   Copying a code. Some app views refuse the clipboard API, so this also
   tries the older copy command, and if both are refused it leaves the
   whole code selected so one Ctrl+C (or Copy from the press-and-hold
   menu) takes it. done(true) when it reached the clipboard.
   --------------------------------------------------------------------- */
function selectCode(box){
  if (!box) return;
  box.focus();   // also brings it into view
  try { box.select(); box.setSelectionRange(0, box.value.length); } catch (e) {}
}
function copyText(text, box, done){
  let ok = false;
  /* the old way first: it runs right inside the click, which some browsers insist on */
  try {
    const t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.setAttribute('aria-hidden', 'true');
    Object.assign(t.style, { position:'fixed', left:'0', top:'0', width:'1px', height:'1px', opacity:'0', pointerEvents:'none' });
    ((box && box.parentNode) || document.body).append(t);
    t.select(); t.setSelectionRange(0, text.length);
    ok = !!(document.execCommand && document.execCommand('copy'));
    t.remove();
  } catch (e) { ok = false; }
  const finish = good => { if (box) selectCode(box); if (typeof done === 'function') done(good); };
  if (ok){ finish(true); return; }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => finish(true), () => finish(false));
    else finish(false);
  } catch (e) { finish(false); }
}
function copyHint(){ return IS_TOUCH ? 'The code is selected: press and hold it, then tap Copy.' : 'The code is selected: press Ctrl+C (⌘C on a Mac) to copy it.'; }
/* a code box: one click or tap selects all of it */
function codeBox(attrs){
  const box = h('textarea', Object.assign({ class:'codebox', readonly:true, spellcheck:'false', autocomplete:'off', autocorrect:'off', autocapitalize:'off' }, attrs));
  box.addEventListener('focus', () => { if (box.readOnly) setTimeout(() => { if (document.activeElement === box) selectCode(box); }, 0); });
  box.addEventListener('click', () => { if (box.readOnly && box.selectionStart === box.selectionEnd) selectCode(box); });
  return box;
}

/* ---------------------------------------------------------------------
   Save data: status, export codes, import, reset
   --------------------------------------------------------------------- */
function encodeSave(){
  const payload = { v:2, profile: Profile, game: readStoredGame(), slots: slotsData().slots, active: activeSlot() };
  const json = JSON.stringify(payload);
  return 'KS1:' + btoa(unescape(encodeURIComponent(json)));
}
function decodeSave(code){
  code = (code || '').trim();
  if (!code.startsWith('KS1:')) throw new Error('A save code starts with KS1:');
  const json = decodeURIComponent(escape(atob(code.slice(4).replace(/\s+/g, ''))));
  const data = JSON.parse(json);
  if (!data || !data.profile || typeof data.profile !== 'object') throw new Error('That code has no profile in it.');
  return data;
}
function showSaveData(){
  const st = Store.cloudState === 'on' ? 'Progress syncs to your Claude account, so it follows you to other devices. A copy is also kept in this browser.' + (Store.lastSync ? ' Last synced at ' + new Date(Store.lastSync).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }) + '.' : '')
    : Store.cloudState === 'error' ? 'Syncing to your Claude account stopped for now, so progress is saved in this browser only. It will try again next time you open the game. Copy a save code to be safe.'
    : Store.ok ? 'Progress is saved in this browser. Copy a save code to move it to another device or keep a backup.'
    : 'This browser is blocking storage, so progress lasts only until you close the page. Copy a save code before you go.';
  const out = codeBox({ 'aria-label':'Your save code', id:'save-out' });
  out.value = encodeSave();
  const status = h('p', { class:'note', id:'save-status', 'aria-live':'polite', text:'' });
  const copyBtn = h('button', { class:'btn btn-small btn-gold', id:'save-copy', onclick: () => {
    out.value = encodeSave();   // the latest progress
    copyText(out.value, out, ok => { status.textContent = ok ? 'Copied. Keep it somewhere safe, then paste it into Import on another device.' : copyHint(); });
  } }, 'Copy save code');
  const inp = h('textarea', { 'aria-label':'Paste a save code', id:'save-in', placeholder:'Paste a save code that starts with KS1:' });
  const loadBtn = h('button', { class:'btn btn-small', onclick: () => {
    let data;
    try { data = decodeSave(inp.value); } catch (e) { status.textContent = 'That code did not load. ' + e.message; Sfx.play('error'); return; }
    confirmBox('Load this save?', 'It replaces your mastery, medals and saved game in this browser.', 'Load save', () => {
      const loaded = mergeProfile(data.profile); loaded.resetAt = Date.now();   // a loaded code replaces every other copy
      setProfile(loaded); saveProfile();
      if (Array.isArray(data.slots)){ const S = emptySlots(); for (let i = 0; i < SLOT_N; i++) S.slots[i] = data.slots[i] && data.slots[i].towers ? data.slots[i] : null; S.active = Math.min(SLOT_N - 1, Math.max(0, +data.active || 0)); writeSlots(S); const g = S.slots[S.active]; if (g) Store.write(LS_GAME, g); else Store.remove(LS_GAME); Store.push('game', { savedAt: Date.now(), game: g || null }); }
      else if (data.game && data.game.towers) storeGame(data.game); else clearStoredGame();
      show('menu'); toastMenu('Save loaded.');
    }, showSaveData);
  } }, 'Load code');
  const resetBtn = h('button', { class:'btn btn-small', style:{ color:'var(--cherry-deep)' }, onclick: () => confirmBox('Reset all progress?', 'Mastery, medals, perks, stats and your saved game are deleted everywhere this profile is stored. This cannot be undone.', 'Delete everything', () => {
    const fresh = defaultProfile(); fresh.resetAt = Date.now();
    setProfile(fresh); saveProfile(); clearStoredGame(); show('menu');
  }, showSaveData) }, 'Reset all progress');
  modal({ title:'Save data', lead: st, content:[
    h('div', { class:'form-row' }, h('label', { for:'save-out', text:'Export' }), out, h('div', { class:'acts' }, copyBtn)),
    h('div', { class:'form-row' }, h('label', { for:'save-in', text:'Import' }), inp, h('div', { class:'acts' }, loadBtn)),
    status, h('div', { class:'acts' }, resetBtn)],
    actions:[{ label:'Done', kind:'primary' }] });
}
/* what a new game's start will do to the slots */
function slotStartNote(i){
  const S = slotsData();
  if (i == null) i = slotForNew();
  const g = S.slots[i];
  if (!g) return 'Saves to slot ' + (i + 1) + '. Your other saved games stay where they are.';
  const full = S.slots.every(Boolean);
  return (full ? 'All ' + SLOT_N + ' slots are full: starting' : 'Starting') + ' replaces slot ' + (i + 1) + ' (' + slotLabel(g) + ').';
}
/* the Saves screen: six slots to continue, switch to or delete */
function showSaves(){
  const S = slotsData();
  const cards = S.slots.map((g, i) => {
    const act = i === S.active;
    const when = g && g.savedAt ? new Date(g.savedAt).toLocaleString([], { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '';
    if (g) thumbOf(g.mapId);
    return h('div', { class:'slot-card' + (act ? ' active' : '') + (g ? '' : ' empty') },
      g ? iconCanvas(thumbs[g.mapId], 'dly-thumb') : h('div', { class:'dly-thumb slot-blank' }),
      h('div', { class:'slot-id' }, h('b', { text: 'Slot ' + (i + 1) + (act ? ' · active' : '') }), h('span', { text: slotLabel(g) }), g ? h('small', { text: 'Saved ' + when + (g.lives != null ? ' · ' + g.lives + ' lives · $' + fmt(g.cash || 0) : '') }) : h('small', { text:'Free. New games go to a free slot by themselves.' })),
      h('div', { class:'slot-acts' },
        g ? h('button', { class:'btn btn-small btn-primary', onclick: () => { closeModal(); setActiveSlot(i); continueGame(); } }, 'Continue') : h('button', { class:'btn btn-small', onclick: () => { setActiveSlot(i); closeModal(); refreshMenu(); toastMenu('Slot ' + (i + 1) + ' is active: New game saves there.'); } }, 'Use for new games'),
        g && !act ? h('button', { class:'btn btn-small', onclick: () => { setActiveSlot(i); closeModal(); refreshMenu(); showSaves(); } }, 'Make active') : null,
        g ? h('button', { class:'btn btn-small', style:{ color:'var(--cherry-deep)' }, onclick: () => confirmBox('Delete slot ' + (i + 1) + '?', slotLabel(g) + ' is gone for good.', 'Delete', () => { deleteSlot(i); refreshMenu(); showSaves(); }, showSaves) }, 'Delete') : null));
  });
  modal({ title:'Saves', lead: SLOT_N + ' slots. Continue on the menu picks up the active slot; a new game takes a free slot unless you choose one. Save codes carry every slot.', cls:'daily', content:[h('div', { class:'slot-grid' }, cards)], actions:[{ label:'Close' }] });
}
function toastMenu(msg){
  const b = $('#cloud-badge span'); if (!b) return;
  const prev = b.textContent; b.textContent = msg; setTimeout(updateCloudBadge, 2500);
}

/* ---------------------------------------------------------------------
   Mastery screen
   --------------------------------------------------------------------- */
function buildMastery(tab){
  tab = tab || UI.mtab; UI.mtab = tab;
  for (const b of $$('#mastery-tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  const avail = starsEarned() - starsSpent();
  $('#stars-pill').textContent = '★ ' + avail + ' to spend · ' + starsEarned() + ' earned';
  const body = $('#mastery-body'); body.innerHTML = '';
  if (tab === 'towers'){
    if (UI.mTower && TOWERS[UI.mTower]) masteryTowerPage(body, UI.mTower);
    else { UI.mTower = null; masteryTowerList(body); }
  } else if (tab === 'perks'){
    body.append(h('p', { class:'lead', style:{ color:'var(--ink-2)' }, text:'Spend stars on permanent kitchen perks. Stars come from map medals (Michelin medals give two) and from every mastery rank.' }));
    const grid = h('div', { class:'perks' });
    for (const p of PERKS){
      const owned = !!Profile.perks[p.id];
      grid.append(h('div', { class:'perk' + (owned ? ' owned' : '') }, h('h4', { text: p.name }), h('p', { text: p.desc }),
        h('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px' } },
          h('span', { class:'cost', text: '★ ' + p.cost }),
          owned ? h('span', { class:'level Beginner', text:'Owned' }) : h('button', { class:'btn btn-small btn-gold', disabled: avail < p.cost, onclick: () => { Profile.perks[p.id] = 1; saveProfile(); Sfx.play('upgrade'); buildMastery('perks'); } }, 'Buy'))));
    }
    body.append(grid);
    if (starsSpent() > 0) body.append(h('div', {}, h('button', { class:'btn btn-small', onclick: () => { Profile.perks = {}; saveProfile(); buildMastery('perks'); } }, 'Refund all perks')));
  } else if (tab === 'ach'){
    buildAchievementsTab(body);
  } else if (tab === 'skins'){
    buildSkinsTab(body);
  } else if (tab === 'medals'){
    const S = Profile.stats;
    body.append(h('div', { class:'stats-grid' }, [['Games started', S.games], ['Wins', S.wins], ['Rounds cleared', S.rounds], ['Pests cooked', S.cooked]].map(([a, b]) => h('div', { class:'stat' }, h('b', { text: fmt(b) }), h('span', { text: a })))));
    const tbl = h('div', { class:'medal-table' });
    for (const id of MAP_ORDER) tbl.append(h('div', { class:'medal-row' }, h('div', {}, h('h4', { text: MAPS[id].name }), h('span', { class:'level ' + MAPS[id].level, text: MAPS[id].level })), medalRow(id, true)));
    body.append(tbl);
  } else {
    const grid = h('div', { class:'pests' });
    for (const id of ENEMY_ORDER){
      const d = ENEMIES[id], seen = !!Profile.seen[id];
      const tags = h('div', { class:'tags' });
      if (seen){
        tags.append(h('span', { text: 'Health ' + fmt(d.hp) }), h('span', { text: 'Speed ' + Math.round(d.speed / 64 * 10) / 10 + '×' }));
        if (d.boss) tags.append(h('span', { class:'boss', text:'Boss' }));
        else if (d.big) tags.append(h('span', { class:'veh', text:'Vehicle' }));
        if (d.camo) tags.append(h('span', { class:'imm', text:'Ghost' }));
        if (d.immune) for (const im of d.immune) tags.append(h('span', { class:'imm', text: 'Immune: ' + TYPE_LABEL[im] }));
        if (d.children) tags.append(h('span', { text: 'Releases ' + d.children.map(([c, n]) => n + ' ' + plural(ENEMIES[c].name, n)).join(', ') }));
      }
      grid.append(h('div', { class:'pest' + (seen ? '' : ' unseen') }, seen ? iconCanvas(Art.pestIcon(id, 64)) : silhouette(Art.pestIcon(id, 64)),
        h('div', {}, h('h4', { text: seen ? d.name : 'Not seen yet' }), h('p', { text: seen ? d.desc : 'Survive longer to meet this pest.' }), tags)));
    }
    body.append(h('p', { class:'lead', style:{ color:'var(--ink-2)' }, text:'Modifiers: ghosts need a tower with ghost sight to be targeted; moldy pests regrow unless burned or defrosted; armored pests have double health and wear a bottle cap.' }), grid);
  }
}

/* ---------------------------------------------------------------------
   Mastery: every appliance by faction, and a page per appliance with its
   mastery ranks, all fifteen upgrades, its paragon and a build to try out
   --------------------------------------------------------------------- */
const MSORTS = { faction:'Faction', name:'Name', price:'Price', rank:'Mastery' };
function masteryOrder(){
  const f = UI.mFaction && UI.mFaction !== 'all' && factionsInUse().includes(UI.mFaction) ? UI.mFaction : 'all';
  let list = TOWER_ORDER.filter(t => f === 'all' || factionOf(t) === f);
  const sort = MSORTS[UI.mSort] ? UI.mSort : 'faction';
  if (sort === 'name') list.sort((a, b) => TOWERS[a].name.localeCompare(TOWERS[b].name));
  else if (sort === 'price') list.sort((a, b) => TOWERS[a].cost - TOWERS[b].cost || TOWERS[a].name.localeCompare(TOWERS[b].name));
  else if (sort === 'rank') list.sort((a, b) => (Profile.mastery[b] || 0) - (Profile.mastery[a] || 0) || TOWER_ORDER.indexOf(a) - TOWER_ORDER.indexOf(b));
  else list = factionSorted(list);
  return { list, f, sort };
}
function rankLadder(xp){
  const r = rankOf(xp), ladder = h('div', { class:'ladder' });
  for (let i = 1; i < RANKS.length; i++) ladder.append(h('i', { class: i <= r ? (i >= 6 ? 'gold' : 'on') : '', title: RANKS[i].name + ': ' + RANKS[i].perk }));
  return ladder;
}
function rankBits(type){
  const xp = Profile.mastery[type] || 0, r = rankOf(xp), next = RANKS[r + 1];
  const pct = next ? clamp((xp - RANKS[r].xp) / (next.xp - RANKS[r].xp) * 100, 0, 100) : 100;
  return { xp, r, next, pct };
}
function factionTag(type){
  const F = FACTIONS[factionOf(type)];
  return h('span', { class:'ftag', style:'--fc:' + F.color }, h('i', { 'aria-hidden':'true' }), F.name);
}
function openTowerPage(type){ UI.mTower = type; UI.mBuild = { type, up:[0, 0, 0], par:false }; Sfx.play('click'); buildMastery('towers'); const el = $('#scr-mastery'); if (el) el.scrollTop = 0; window.scrollTo(0, 0); }
function masteryTowerList(body){
  body.append(h('p', { class:'lead mlead', text:'Appliances earn mastery XP from the damage they deal (support appliances from the cash they make and rounds they serve). Ranks unlock tier 4, tier 5 and paragons, and add small permanent bonuses. Each rank also earns a star for Chef perks. Pick an appliance to see all of its upgrades.' }));
  const { list, f, sort } = masteryOrder();
  const sortSel = h('select', { 'aria-label':'Sort appliances' }, Object.entries(MSORTS).map(([k, v]) => h('option', { value:k, text: v })));
  sortSel.value = sort;
  sortSel.addEventListener('change', () => { UI.mSort = sortSel.value; buildMastery('towers'); });
  body.append(h('div', { class:'mctrl' },
    h('div', { class:'fbar', role:'group', 'aria-label':'Show appliances from' }, factionChips(f, k => { UI.mFaction = k; Sfx.play('click'); buildMastery('towers'); }, false)),
    h('label', { class:'msort' }, h('span', { text:'Sort by' }), sortSel)));
  const card = type => {
    const T = TOWERS[type], { xp, r, next, pct } = rankBits(type);
    const el = h('div', { class:'mcard link', role:'button', tabindex:'0', style:'--fc:' + FACTIONS[factionOf(type)].color, 'aria-label': T.name + ': see its upgrades', onclick: () => openTowerPage(type),
      onkeydown: ev => { if (ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); openTowerPage(type); } } },
      h('div', { class:'top' }, iconCanvas(Art.towerIcon(type, 64)), h('div', { class:'mt' }, h('h3', { text: T.name }), h('div', { class:'rank', text: T.custom ? 'Custom design' : RANKS[r].name }), sort === 'faction' ? null : factionTag(type))),
      T.custom ? null : rankLadder(xp),
      T.custom ? null : h('div', { class:'xpbar' }, h('i', { style:{ width: pct + '%' } })),
      h('p', { class:'next', text: T.custom ? 'Custom designs skip mastery locks.' : next ? fmt(xp) + ' XP · next: ' + next.name + ' at ' + fmt(next.xp) + ' (' + next.perk + ')' : fmt(xp) + ' XP · fully mastered' }),
      h('span', { class:'mgo', text:'See upgrades ›' }));
    return el;
  };
  if (!list.length){ body.append(h('p', { class:'note', text:'No appliances in this faction yet.' })); return; }
  if (sort === 'faction'){
    for (const fk of FACTION_ORDER){
      const mine = list.filter(t => factionOf(t) === fk);
      if (!mine.length) continue;
      const F = FACTIONS[fk], ranks = mine.reduce((n, t) => n + (TOWERS[t].custom ? 0 : rankOf(Profile.mastery[t] || 0)), 0), max = mine.filter(t => !TOWERS[t].custom).length * (RANKS.length - 1);
      body.append(h('section', { class:'fsec', style:'--fc:' + F.color },
        h('div', { class:'fsec-head' }, h('h3', { text: F.name }), h('p', { text: F.blurb }), max ? h('span', { class:'fsec-n', text: ranks + ' / ' + max + ' ranks' }) : null),
        h('div', { class:'mgrid' }, mine.map(card))));
    }
  } else body.append(h('div', { class:'mgrid' }, list.map(card)));
}
/* prices as a Medium game would charge them, with mastery and perk discounts */
function listPrice(base, type){ return Math.max(5, Math.round(base * (1 - masteryDiscount(type)) * (perk('bulk') ? 0.97 : 1) / 5) * 5); }
const ATK_LABEL = { storm:'Blade storm', soup:'Soup ring', press:'Plate press', burst:'Fireball burst', bellows:'Bellows beam', cascade:'Flame cascade', walls:'Walls of fire', glob:'Batter globs', orbit:'Orbiting platters', meteor:'Molten blade', lump:'Flaming lump', wall:'Lighter fluid', bird:'Fire bird', lava:'Lava bird', zap:'Lightning', whirl:'Whirlwinds', slick:'Oil slicks', carpet:'Pasta carpet', main:'Main attack', missiles:'Missiles', missile:'Mustard missile', gun:'Gun', turrets:'Turrets', steam:'Steam', sonar:'Sonar', snack:'Snacks', smoke:'Smoke', shove:'Vehicle shove', rotor:'Razor whisks', reactor:'Reactor', pop:'Popcorn', pods:'Popcorn pods', minis:'Mini-copters', mad:'Kernel Panic', jets:'Jets', jet:'Jet', ice:'Ice', hook:'Dough hook', grapes:'Grape shot', flame:'Flames', drop:'Meatball drop', draft:'Downdraft', cannon:'Cannon', bubble:'Bubbles', bombs:'Bombs', beat:'Beaters', basket:'Basket', wheel:'Slicer wheel', bagel:'Bagels', spray:'Shard spray', loaf:'Baguettes', mines:'Ravioli mines',
  caltrops:'Caltrops', sticky:'Sticky wasabi', clones:'Shadow clones', rifle:'Rifle', shotgun:'Shotgun', brew:'Brews', pool:'Vinegar puddles', monster:'Sauce monster beam', beam:'Sauce beam',
  build:'Sentries', foam:'Dish soap foam', trap:'Pest trap', fish:'Fish', cat:'Cat', bird:'Bird', tentacle:'Tentacles', song:'Siren song', roc:'Great bird', shark:'Great shark',
  ball:'Thunder meringue', super:'Superstorms', rook:'Rook', bishop:'Bishop', knight:'Knight', queen:'Queen', knights:'Knights', flick:'Flicks', hurl:'Hurl', sauce:'Sauce' };
function atkName(type, id){
  if (TOWERS[type].custom && Profile.custom[type]){
    try { const d = cleanCustom(Profile.custom[type]), i = id === 'main' ? 0 : parseInt(id.slice(1), 10) - 1; if (d.attacks[i]) return attackLabel(d, i); } catch (e) {}
  }
  if (type === 'chess' && id === 'main') return 'Pawn';
  if (type === 'chopsticks' && id === 'main') return 'Pinch';
  if (type === 'spray' && id === 'main') return 'Spray';
  if (type === 'rice' && id === 'main') return 'Steam burst';
  if (type === 'rice' && id === 'balls') return 'Rice balls';
  return ATK_LABEL[id] || (/^a\d+$/.test(id) ? 'Attack ' + id.slice(1) : id.charAt(0).toUpperCase() + id.slice(1));
}
const num1 = v => (Math.abs(v) >= 100 || Number.isInteger(v) ? fmt(v) : (Math.round(v * 100) / 100).toString());
function rateText(rate, n){ const aps = 1 / Math.max(0.001, rate); const each = n > 1 ? n + ' at a time, ' : ''; return each + (aps >= 1 ? num1(Math.round(aps * 10) / 10) + ' a second' : 'every ' + num1(Math.round(rate * 10) / 10) + 's'); }
function attackLine(type, id, a){
  const H = a.explode || a.impact || (a.mine && a.mineEvery === 1 ? a.mine : null);
  const dmg = H ? H.dmg : a.dmg, pierce = H ? H.pierce : a.pierce, big = (H && H.bonusBig) || a.bonusBig || 0;
  const n = a.kind === 'hitscan' ? (a.shots || 1) : (a.count || 1);
  const bits = [];
  if (a.batter && !(dmg > 0)) bits.push('coats pests in batter: ' + Math.round((1 - a.batter.mult) * 100) + '% slower for ' + num1(a.batter.dur) + 's' + ((a.batter.bigMult || 1) < 1 ? ' (vehicles ' + Math.round((1 - a.batter.bigMult) * 100) + '%)' : ''));
  else if (dmg > 0 || !a.knock) bits.push(num1(dmg) + ' damage' + (big ? ' (+' + num1(big) + ' to vehicles)' : ''));
  if (a.kind === 'carpet'){ bits.push(a.count + ' nests along the trail'); bits.push('every ' + num1(a.rate) + 's'); return { name: atkName(type, id), text: bits.join(' · '), type: TYPE_LABEL[a.type] || 'Impact' }; }
  /* the second wave's own kinds */
  if (a.kind === 'brew'){
    const b = a.buff, fx = [];
    if (b.dmg) fx.push('+' + b.dmg + ' damage');
    if (b.pierce) fx.push('+' + b.pierce + ' pierce');
    if (b.bigDmg) fx.push('+' + b.bigDmg + ' to vehicles');
    if (b.range > 1) fx.push('+' + Math.round((b.range - 1) * 100) + '% range');
    if (b.speed > 1) fx.push(Math.round((b.speed - 1) * 100) + '% faster');
    if (b.allTypes) fx.push('hits any type');
    return { name: atkName(type, id), text: fx.join(', ') + ' for ' + (a.perm ? 'good' : num1(a.dur) + 's') + ' · ' + (a.n > 1 ? 'up to ' + a.n + ' appliances' : '1 appliance') + ' every ' + num1(a.rate) + 's', type: 'Support' };
  }
  if (a.kind === 'song') return { name: atkName(type, id), text: 'charms up to ' + a.pierce + ' pests: they walk back up the trail for ' + num1(a.charm.dur) + 's · every ' + num1(a.rate) + 's', type: 'Charm' };
  if (a.kind === 'build'){
    const sp = a.minion.specs[a.minion.looks[0]];
    return { name: atkName(type, id), text: 'builds one every ' + num1(a.rate) + 's, up to ' + a.max + ' at once, lasting ' + num1(a.life) + 's · ' + num1(sp.explode ? sp.explode.dmg : sp.dmg) + ' damage, ' + rateText(sp.rate, sp.count || 1), type: a.minion.looks.length > 1 ? 'Mixed' : TYPE_LABEL[sp.type] || 'Impact' };
  }
  /* the stand mixer's */
  if (a.kind === 'bolt') return { name: atkName(type, id), text: num1(dmg) + ' damage · splits in two at every pest it hits, up to ' + (Math.pow(2, a.fork.gens) - 1) + ' pests · ' + rateText(a.rate, 1), type: TYPE_LABEL[a.type] || 'Energy' };
  if (a.kind === 'tornado') return { name: atkName(type, id), text: 'blows up to ' + fmt(a.pierce) + ' pests ' + a.blow[0] + '–' + a.blow[1] + ' px back up the trail (not vehicles, and each pest only once) · ' + rateText(a.rate, 1), type: 'Blowback' };
  if (a.kind === 'orb') return { name: atkName(type, id), text: 'sticks pests in place for ' + num1(a.stick) + 's and zaps ' + num1(a.zap.dmg) + ' forked lightning ' + rateText(a.zap.rate, 1) + ' while it drifts · ' + rateText(a.rate, 1), type: 'Energy' };
  if (a.kind === 'storm') return { name: atkName(type, id), text: num1(dmg) + ' damage every ' + num1(a.rehit || 1) + 's to everything inside (not bosses), blowing pests and vehicles back · roams for ' + num1(a.life) + 's · ' + rateText(a.rate, 1), type: 'Impact' };
  if (a.kind === 'vine') return { name: atkName(type, id), text: 'kneads away one small pest anywhere, then leaves chocolate spikes (' + num1(a.pile.dmg) + ' damage to ' + a.pile.pierce + ' pests every ' + num1(a.pile.tick) + 's, for ' + num1(a.pile.life) + 's) · at most every ' + num1(a.rate) + 's', type: TYPE_LABEL[a.type] || 'Sharp' };
  /* the chess set's */
  if (a.kind === 'slide'){
    const how = a.cross ? ({ rook:'the row and the column at once', bishop:'both diagonals at once', queen:'the row, the column and both diagonals at once' }[a.dirs] || 'every line at once')
      : ({ rook:'the row or the column', bishop:'a diagonal', pawn:'a diagonal' }[a.dirs] || 'a line');
    const times = b => b === 1 ? 'once' : b === 2 ? 'twice' : b + ' times';
    const reach = a.full ? 'wall to wall' + (a.bounce ? ', bouncing ' + times(a.bounce) : '') : Math.round(a.reach) + ' px each way';
    bits.push('up to ' + a.pierce + ' pests along ' + how + ' through its target, ' + reach);
    if (a.back) bits.push('double near the pantry');
    bits.push(rateText(a.rate, 1));
    return { name: atkName(type, id), text: bits.join(' · '), type: a.ignoreImmune ? 'Any type' : TYPE_LABEL[a.dtype || a.type] || 'Impact' };
  }
  if (a.kind === 'leap'){
    bits.push('leaps in an L and stomps up to ' + a.impact.pierce + ' pests where it lands');
    if (a.fork) bits.push('forks the ' + a.fork.n + ' toughest pests within ' + a.fork.r + ' px for ' + num1(a.fork.dmg) + (a.fork.bonusBig ? ' (+' + num1(a.fork.bonusBig) + ' to vehicles)' : ''));
    if (a.tour) bits.push('then ' + a.tour + ' more leap' + (a.tour === 1 ? '' : 's'));
    bits.push(rateText(a.rate, a.count || 1));
    return { name: atkName(type, id), text: bits.join(' · '), type: a.impact.ignoreImmune ? 'Any type' : TYPE_LABEL[a.impact.type] || 'Impact' };
  }
  /* the spray bottle: mist or stream, what it soaks pests with, its bubbles */
  if (a.kind === 'spray'){
    const out = [];
    if (a.streaming) out.push('a jet through up to ' + a.pierce + ' pests in a line for ' + num1(a.dmg) + (a.bonusBig ? ' (+' + num1(a.bonusBig) + ' to vehicles)' : '') + (a.knock ? ', pushing small pests ' + Math.round(a.knock) + ' back' + (a.bigKnock ? ' (vehicles ' + Math.round(a.bigKnock) + ')' : '') : ''));
    else out.push('mists up to ' + a.pierce + ' pests in a cone for ' + num1(a.dmg));
    const W = a.wet, fx = [];
    if (W.cold || W.energy) fx.push('+' + num1(W.cold || W.energy) + ' from cold and energy');
    if (W.freeze) fx.push('frozen by cold hits');
    if (W.energyMul > 1) fx.push(Math.round((W.energyMul - 1) * 100) + '% more from energy and heat');
    if (W.steam) fx.push('heat bursts into steam');
    if (W.all) fx.push('+' + num1(W.all) + ' from every hit');
    out.push('soaks them ' + num1(W.dur) + 's' + (fx.length ? ' (' + fx.join(', ') + ')' : ''));
    if (a.lather) out.push('lathers them: they slip ' + a.lather.dist + ' back now and then' + (a.lather.bump ? ', hitting the pests behind for ' + num1(a.lather.bump) : ''));
    if (a.foam) out.push('leaves foam every ' + (a.foam.every === 2 ? 'other' : a.foam.every === 3 ? 'third' : a.foam.every + 'th') + ' spray');
    out.push(rateText(a.rate, 1));
    return { name: a.streaming ? 'Stream' : atkName(type, id) === 'Jet' ? 'Jet' : 'Mist', text: out.join(' · '), type: a.ignoreImmune ? 'Any type' : 'Water' };
  }
  /* the rice cooker: cooks, then a burst of steam round it */
  if (a.kind === 'cook'){
    const out = ['cooks for ' + num1(Math.round(a.rate * 10) / 10) + 's, then a steam burst hits up to ' + a.pierce + ' pests around it for ' + num1(a.dmg) + (a.bonusBig ? ' (+' + num1(a.bonusBig) + ' to vehicles)' : '') + (a.bonusBoss ? ' (+' + num1(a.bonusBoss) + ' to bosses)' : '')];
    if (a.strip) out.push('strips armor');
    if (a.after) out.push('a second burst at ' + Math.round(a.after.mul * 100) + '% follows');
    const S = a.sticky;
    if (S) out.push('coats them in rice: ' + Math.round((1 - S.slow) * 100) + '% slower for ' + num1(S.dur) + 's' + (S.glue ? ', small pests glued ' + num1(S.glue) + 's' : '') + (S.vuln ? ', +' + num1(S.vuln) + ' from every hit' : ''));
    if (a.store) out.push('keeps up to ' + a.store + ' pots warm' + (a.timer ? ' (all at once for ×' + a.timer + ' when a vehicle or boss arrives)' : ''));
    return { name: atkName(type, id), text: out.join(' · '), type: a.ignoreImmune ? 'Any type' : TYPE_LABEL[a.type] || 'Heat' };
  }
  if (a.kind === 'bubbles') return { name: 'Bubbles', text: 'blows ' + a.count + ' bubbles ' + rateText(a.rate, 1) + ' that drift back up the trail and pop on the first pest they meet for ' + num1(a.dmg) + (a.bonusBig ? ' (+' + num1(a.bonusBig) + ' to vehicles)' : '') + ', lathering every pest within ' + a.r + ' px', type: 'Soap' };
  /* chopsticks: what they can lift, and where it goes */
  if (a.kind === 'pinch'){
    const small = a.tier >= 7 ? 'any small pest' : a.tier >= 5 ? 'small pests up to ant balls' : 'small pests up to cockroaches';
    const big = !a.bigTier ? '' : a.bigTier >= 11 ? ' and any vehicle' : a.bigTier >= 9 ? ', cheese wheels, picnic baskets and midnight roaches' : ' and cheese wheels';
    const out = ['lifts ' + small + big + (a.n > 1 ? ', ' + a.n + ' at a time' : '')];
    if (a.toss) out.push('throws each into the pests behind it: ' + num1(a.toss.dmg) + ' damage' + (a.toss.bonusBig ? ' (+' + num1(a.toss.bonusBig) + ' to vehicles)' : '') + ' to up to ' + a.toss.pierce + ' pests where it lands');
    else out.push(a.back >= 9999 ? 'drops them back at the entrance' : 'carries them ' + Math.round(a.back) + ' px back' + (a.bigTier ? ' (vehicles half as far)' : ''));
    if (a.dmg > 0) out.push(num1(a.dmg) + ' damage as they land' + (a.bonusBig ? ' (+' + num1(a.bonusBig) + ' to vehicles)' : ''));
    if (a.daze) out.push('dazed ' + num1(a.daze) + 's');
    out.push(rateText(a.rate, 1));
    return { name: atkName(type, id), text: out.join(' · '), type: a.ignoreImmune || (a.toss && a.toss.ignoreImmune) ? 'Any type' : 'Lift' };
  }
  if (a.kind === 'catch') return { name: atkName(type, id), text: 'catches pests worth up to ' + fmt(a.cap) + ' lives' + (a.bigTier ? ', vehicles too' : '') + ', then pays out ' + (a.mult || 2) + '× their value · a new trap ' + num1(a.rate) + 's later', type: 'Cash' };
  if (a.sticky) return { name: atkName(type, id), text: 'sticks to a vehicle and bursts ' + num1(a.sticky.delay) + 's later for ' + num1(a.sticky.dmg) + ' (' + num1(a.sticky.ex.dmg) + ' around it) · ' + rateText(a.rate, n), type: 'Vehicles' };
  if (a.kind === 'beam' && pierce >= 9000){ bits.push('every pest in line'); bits.push(rateText(a.rate, 1)); return { name: atkName(type, id), text: bits.join(' · '), type: a.ignoreImmune ? 'Any type' : TYPE_LABEL[a.dtype || a.type] || 'Impact' }; }
  if (a.kind === 'pulse') bits.push('up to ' + pierce + ' pests around it');
  else if (a.kind === 'grab') bits.push('holds ' + n + ' pest' + (n === 1 ? '' : 's'));
  else if (a.kind === 'trap') bits.push(pierce + ' hits per nest');
  else if (H) bits.push('blasts up to ' + pierce + ' pests');
  else if (pierce > 1) bits.push(pierce + ' pests per hit');
  bits.push(rateText(a.rate, a.kind === 'grab' ? 1 : n));
  const dtype = a.dtype || a.type || (H && H.type) || 'normal';
  return { name: atkName(type, id), text: bits.join(' · '), type: (a.ignoreImmune ? 'Any type' : TYPE_LABEL[dtype] || 'Impact') };
}
function statPanel(type, s){
  const rows = [];
  for (const id in s.atk) rows.push(attackLine(type, id, s.atk[id]));
  const extra = [];
  if (!(s.seats && !Object.keys(s.atk).length)) extra.push(s.global ? 'Reaches the whole map' : 'Range ' + Math.round(s.range));
  extra.push(s.camo ? 'Sees ghost pests' : 'No ghost sight');
  if (s.income) extra.push('Earns ' + money(s.income) + ' a round');
  if (s.lifeRound) extra.push('Brings in ' + s.lifeRound + (s.lifeRound === 1 ? ' life' : ' lives') + ' a round');
  if (s.bread) extra.push(s.bread.loaves + ' loaves a round, ' + money(s.bread.value) + ' each');
  if (s.brigade) extra.push('Kitchen Brigade: every Mandoline in its range throws 8% faster with 8% more pierce for each brigade around it (up to 20)');
  if (s.lone) extra.push('Lone Ranger: up to 40% faster with no other appliance within 130 px');
  if (s.nomad) extra.push('When you lose lives: ' + (s.nomad.range > 1 ? '+' + Math.round((s.nomad.range - 1) * 100) + '% range and ' : '') + Math.round((s.nomad.speed - 1) * 100) + '% faster for 10s');
  if (s.echo) extra.push('Echo Network: +' + Math.round(s.echo * 100) + '% range for every networked Lobster Tank on the map (up to 10)');
  if (s.pack) extra.push('Pack: its pet does ' + Math.round(s.pack * 100) + '% more damage for each nearby basket with the same pet (up to 5)');
  if (s.oak) extra.push('Sourdough Starter: scrubs mold off pests, and its chips hit 1% more pests for every life above the starting lives (up to twice as many)');
  if (s.bounty) extra.push('Bake sale every round: ' + money(s.bounty.cash) + ', plus ' + money(s.bounty.farm[0]) + '–' + money(s.bounty.farm[5]) + ' for each Bread Machine in its range');
  if (s.forest) extra.push('Dough Golem: dough studded with chocolate spikes creeps along the trail from it, ' + s.forest.grow + ' px further every second, and hits every pest on it twice a second');
  if (s.vengeance) extra.push('Bitter Batter: ' + Math.round(s.vengeance.base * 100) + '% faster, and 1% faster again for every life lost (up to +' + Math.round((s.vengeance.base + s.vengeance.per * s.vengeance.max) * 100) + '%)');
  if (s.wrath) extra.push('Whipped Frenzy: 5% faster for every 10 damage it deals in a round, up to twice as fast; it cools off after 2s without a hit');
  if (s.rush) extra.push('Dinner Rush: other Stand Mixers in its range work 15% faster and hit 15% more pests (from up to 5 of these)');
  if (s.fury) extra.push('Kitchen Fury: +1 damage for every ' + fmt(s.fury.per) + ' health of pests on the map, up to +' + s.fury.max);
  if (s.board) extra.push('Colour Complex: pests on the dark squares of the kitchen floor take ' + Math.round((s.board.mul - 1) * 100) + '% more damage from everything');
  if (s.pawns) extra.push('Pawns: one marches up the trail from the pantry every ' + s.pawns.every + 's of a round; one that reaches the far end is promoted to a queen for ' + s.pawns.life + 's');
  if (TOWERS[type] && TOWERS[type].amphib) extra.push('Builds on land or water, with 35% more range on water');
  /* the Lazy Susan: what it carries and what riding it gives */
  if (s.seats){
    const gifts = [Math.round(((s.spin || 1) - 1) * 100) + '% faster attacks'];
    if (s.riderRange > 1) gifts.push('+' + Math.round((s.riderRange - 1) * 100) + '% range');
    if (s.riderDmg) gifts.push('+' + s.riderDmg + ' damage');
    if (s.riderPierce) gifts.push('+' + s.riderPierce + ' pierce');
    if (s.riderCamo) gifts.push('ghost sight');
    if (s.riderEnergize) gifts.push(Math.round(s.riderEnergize * 100) + '% faster ability recharge');
    extra.push('Carries ' + (s.seats === 1 ? 'one appliance' : s.seats + ' appliances') + ' on its board (not boats, aircraft or head chefs). Riders get ' + gifts.join(', '));
  }
  if (s.windup) extra.push('Wind-up: its riders attack ' + Math.round(s.windup.per * 100) + '% faster for every second of a round, up to +' + Math.round(s.windup.max * 100) + '%');
  if (s.focus) extra.push('Focus: every ' + s.focus.need + ' pests it lifts, it carries the 2 toughest pests on screen back to the entrance');
  if (s.buff){
    const b = s.buff, out = [];
    if (b.speed) out.push(Math.round((b.speed - 1) * 100) + '% faster attacks');
    if (b.dmg) out.push('+' + b.dmg + ' damage');
    if (b.pierce) out.push('+' + b.pierce + ' pierce');
    if (b.range) out.push('+' + Math.round((b.range - 1) * 100) + '% range');
    if (b.camo) out.push('ghost sight');
    if (b.allTypes) out.push('hit every type');
    if (b.discount) out.push(Math.round(b.discount * 100) + '% discounts');
    if (b.energize) out.push(Math.round(b.energize * 100) + '% faster ability recharge');
    if (out.length) extra.push('Gives ' + (b.only === 'water' ? 'water appliances' : b.only ? 'other ' + (TOWERS[b.only] ? TOWERS[b.only].name + 's' : 'appliances') : 'appliances') + (b.global ? ' everywhere' : ' nearby') + ': ' + out.join(', '));
  }
  const abs = (s.abilities || []).map(ab => Object.assign({ ab }, abilityDetails(ab, s)));
  const dps = typeof statsDps === 'function' && rows.length ? statsDps(s) : null;
  return h('div', { class:'mstats' },
    rows.length ? h('ul', { class:'mlines' }, rows.map(r => h('li', {}, h('b', { text: r.name }), h('span', { text: r.text }), h('em', { text: r.type })))) : h('p', { class:'next', text:'No attacks: it supports the kitchen.' }),
    dps && dps.single > 0 ? h('p', { class:'mdps', text: '≈ ' + fmt(dps.single) + ' damage a second to one pest' + (dps.crowd > dps.single * 1.2 ? ', ≈ ' + fmt(dps.crowd) + ' against a crowd' : '') }) : null,
    h('ul', { class:'mextra' }, extra.map(t => h('li', { text: t }))),
    abs.length ? h('ul', { class:'mabs' }, abs.map(D => h('li', { style: '--ac:' + Art.abilityColor(D.ab) }, iconCanvas(Art.abilityIcon(D.ab, 64)),
      h('div', {}, h('div', { class:'mab-head' }, h('b', { text: D.name }), h('em', { text: 'Ability · recharges in ' + abSec(D.cd) })), h('p', { text: D.text }))))) : null);
}
/* pick tier n on path p for the build preview, keeping it a build the game allows */
function tryTier(up, p, n){
  const u = up.slice();
  if (u[p] === n) n -= 1;
  u[p] = n;
  if (n > 2) for (let q = 0; q < 3; q++) if (q !== p && u[q] > 2) u[q] = 2;
  const others = [0, 1, 2].filter(q => q !== p && u[q] > 0);
  if (u[p] > 0 && others.length > 1) u[others.sort((a, b) => u[a] - u[b] || b - a)[0]] = 0;
  return u;
}
function masteryTowerPage(body, type){
  const T = TOWERS[type], F = FACTIONS[factionOf(type)];
  if (!UI.mBuild || UI.mBuild.type !== type) UI.mBuild = { type, up:[0, 0, 0], par:false };
  const B = UI.mBuild, { xp, r, next, pct } = rankBits(type);
  const rank = T.custom ? RANKS.length - 1 : r;
  const { list } = masteryOrder();
  const at = list.indexOf(type), prev = list[(at - 1 + list.length) % list.length], nxt = list[(at + 1) % list.length];
  const page = h('div', { class:'tpage', style:'--fc:' + F.color });
  page.append(h('div', { class:'tp-nav' },
    h('button', { class:'btn btn-small', onclick: () => { UI.mTower = null; Sfx.play('click'); buildMastery('towers'); } }, '‹ All appliances'),
    h('span', { class:'sp' }),
    list.length > 1 && at >= 0 ? h('button', { class:'btn btn-small', title:'Previous: ' + TOWERS[prev].name + ' (←)', 'aria-label':'Previous: ' + TOWERS[prev].name, onclick: () => openTowerPage(prev) }, '‹ ', h('span', { class:'nvn', text: TOWERS[prev].name })) : null,
    list.length > 1 && at >= 0 ? h('button', { class:'btn btn-small', title:'Next: ' + TOWERS[nxt].name + ' (→)', 'aria-label':'Next: ' + TOWERS[nxt].name, onclick: () => openTowerPage(nxt) }, h('span', { class:'nvn', text: TOWERS[nxt].name }), ' ›') : null));
  /* who it is and how far its mastery has come */
  const ranks = h('ol', { class:'mranks' });
  RANKS.forEach((R, i) => { if (i) ranks.append(h('li', { class: i <= rank ? 'got' : '' }, h('b', { text: R.name }), h('span', { text: R.perk }), h('em', { text: i <= rank ? '✓' : fmt(R.xp) + ' XP' }))); });
  const hero = h('div', { class:'mpanel thero-id' },
    h('div', { class:'tid-col' },
      h('div', { class:'tid' }, iconCanvas(Art.towerIcon(type, 96)),
        h('div', {}, h('h2', { text: T.name }), h('div', { class:'tid-tags' }, factionTag(type), h('span', { class:'tprice', text: money(listPrice(T.cost, type)) }), T.hot ? h('kbd', { text: T.hot }) : null))),
      h('p', { class:'tblurb', text: T.blurb }),
      h('p', { class:'tblurb dim', text: FACTIONS[factionOf(type)].name + ': ' + FACTIONS[factionOf(type)].blurb })),
    T.custom ? h('p', { class:'note', text:'A custom design: it skips mastery locks, so every tier and its paragon are open from the start.' }) :
      h('div', { class:'tmast' }, h('div', { class:'rank', text: RANKS[r].name }), rankLadder(xp), h('div', { class:'xpbar' }, h('i', { style:{ width: pct + '%' } })),
        h('p', { class:'next', text: next ? fmt(xp) + ' XP · next: ' + next.name + ' at ' + fmt(next.xp) : fmt(xp) + ' XP · fully mastered' }), ranks));
  /* the build preview */
  const up = B.par ? [5, 5, 5] : B.up;
  const st = computeStats({ type, up: B.up.slice(), paragon: !!B.par, degree: 1, x:0, y:0 });
  let cost = listPrice(T.cost, type);
  if (B.par && T.paragon) cost = listPrice(T.paragon.cost, type);
  else for (let p = 0; p < 3; p++) for (let i = 0; i < B.up[p]; i++) cost += listPrice(T.paths[p].ups[i].cost, type);
  const preview = h('div', { class:'mpanel tbuild' },
    h('h4', { text: B.par ? 'Paragon preview' : 'Try a build' }),
    h('div', { class:'tb-top' }, iconCanvas(Art.towerIcon(type, 96, up, !!B.par)),
      h('div', {}, h('div', { class:'tb-code', text: B.par ? 'Paragon' : B.up.join('-') }), h('div', { class:'tb-cost', text: (B.par ? 'Merging costs ' : 'Total ') + money(cost) }),
        h('div', { class:'tb-sub', text: B.par ? 'Degree 1: it grows to 100 with what you merge into it.' : 'Medium prices, with your mastery discounts.' }))),
    statPanel(type, st),
    h('div', { class:'tb-foot' },
      h('button', { class:'btn btn-small', disabled: !B.par && !B.up.some(Boolean), onclick: () => { UI.mBuild = { type, up:[0, 0, 0], par:false }; buildMastery('towers'); } }, 'Reset'),
      h('span', { class:'next', text: B.par ? 'Pick an upgrade to leave the paragon.' : 'Pick upgrades below. Two paths at most, and only one past tier 2.' })));
  page.append(hero);
  /* all fifteen upgrades */
  const paths = h('div', { class:'mpaths' });
  T.paths.forEach((P, p) => {
    const col = h('div', { class:'mpath', style:'--pc:' + PATH_COLORS[p] }, h('div', { class:'mpath-head' }, h('span', { class:'pn', text: 'Path ' + (p + 1) }), h('h4', { text: P.name })));
    P.ups.forEach((U, i) => {
      const need = i === 3 ? 1 : i === 4 ? 3 : 0, locked = rank < need;
      const iu = [0, 0, 0]; iu[p] = i + 1;
      const on = !B.par && B.up[p] > i;
      col.append(h('button', { class:'mtier' + (on ? ' on' : '') + (locked ? ' locked' : ''), 'aria-pressed': String(on), title: (on && B.up[p] === i + 1 ? 'Step back to tier ' + i : 'Try tier ' + (i + 1) + ' ' + P.name) + (locked ? ' (needs ' + RANKS[need].name + ' mastery to buy)' : ''),
        onclick: () => { UI.mBuild = { type, up: tryTier(B.par ? [0, 0, 0] : B.up, p, i + 1), par:false }; Sfx.play('click'); buildMastery('towers'); } },
        h('span', { class:'tnum', text: String(i + 1) }), iconCanvas(Art.towerIcon(type, 64, iu)),
        h('span', { class:'tbody' },
          h('span', { class:'trow' }, h('b', { text: U.name }), h('span', { class:'tcost num', text: money(listPrice(U.cost, type)) })),
          h('small', { text: U.desc }),
          locked ? h('span', { class:'tlock', text: 'Needs ' + RANKS[need].name + ' mastery' }) : null)));
    });
    paths.append(col);
  });
  const main = h('div', { class:'tmain' }, h('h3', { class:'msub', text:'Upgrades' }), paths);
  page.append(h('div', { class:'tgrid' }, main, h('aside', { class:'tside' }, preview)));
  /* a slim build bar that stays in view on narrow screens */
  const dps = statsDps(st);
  const bar = h('div', { class:'tbar', 'aria-hidden':'true' }, iconCanvas(Art.towerIcon(type, 64, up, !!B.par)), h('b', { text: B.par ? 'Paragon' : B.up.join('-') }), h('span', { class:'num', text: money(cost) }),
    dps.single > 0 ? h('span', { class:'tbar-d', text: '≈ ' + fmt(dps.single) + '/s' }) : null);
  page.append(bar);
  /* the bar steps aside while the full preview is on screen */
  if (UI.mIO) UI.mIO.disconnect();
  UI.mIO = null;
  if (typeof IntersectionObserver === 'function'){
    UI.mIO = new IntersectionObserver(es => { for (const e of es) bar.classList.toggle('away', e.isIntersecting); }, { root: $('#scr-mastery'), threshold: 0.35 });
    UI.mIO.observe(preview);
  }
  /* the paragon */
  if (T.paragon){
    const okRank = T.custom || r >= 5;
    main.append(h('h3', { class:'msub', text:'Paragon' }), h('button', { class:'mpanel mpara' + (B.par ? ' on' : ''), 'aria-pressed': String(!!B.par), title: B.par ? 'Back to the build' : 'Preview the paragon',
      onclick: () => { UI.mBuild = B.par ? { type, up:[0, 0, 0], par:false } : { type, up:[5, 5, 5], par:true }; Sfx.play('click'); buildMastery('towers'); } },
      iconCanvas(Art.towerIcon(type, 96, [5, 5, 5], true)),
      h('span', { class:'tbody' },
        h('span', { class:'trow' }, h('b', { text: T.paragon.name }), h('span', { class:'tcost num', text: money(listPrice(T.paragon.cost, type)) })),
        h('small', { text: T.paragon.desc }),
        h('span', { class:'preq' },
          h('span', { text: '✓ Merges every ' + T.name + ' you own' }),
          h('span', { class:'need', text: 'Needs a tier 5 on each of the three paths' }),
          T.custom ? null : h('span', { class: okRank ? 'ok' : 'need', text: (okRank ? '✓ ' : '✗ ') + RANKS[5].name + ' mastery' })),
        h('span', { class:'mgo', text: B.par ? 'Showing its stats above' : 'Preview its stats ›' }))));
  }
  body.append(page);
}

/* ---------------------------------------------------------------------
   Hidden service menu (code 4334)
   --------------------------------------------------------------------- */
function clockTap(){
  UI.clockTaps = (UI.clockTaps || 0) + 1;
  clearTimeout(UI.clockTimer);
  UI.clockTimer = setTimeout(() => { UI.clockTaps = 0; }, 900);
  if (UI.clockTaps >= 3){ UI.clockTaps = 0; openKeypad(); }
}
function openKeypad(){
  UI.kp = '';
  $('#keypad').hidden = false;
  kpRender();
}
function kpRender(err){
  const d = $('#kp-display');
  d.classList.toggle('err', !!err);
  d.textContent = err ? 'Err' : (UI.kp.padStart(4, '-').replace(/(..)(..)/, '$1:$2'));
}
function kpPress(k){
  Sfx.unlock(); Sfx.play('click');
  if (k === 'C'){ UI.kp = ''; kpRender(); return; }
  if (k === 'S'){
    if (UI.kp === '4334'){ $('#keypad').hidden = true; openAdmin(); }
    else { kpRender(true); Sfx.play('error'); setTimeout(() => { $('#keypad').hidden = true; }, 700); }
    UI.kp = '';
    return;
  }
  if (UI.kp.length < 4){ UI.kp += k; kpRender(); }
}
function buildKeypad(){
  const g = $('#kp-grid');
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'S']){
    g.append(h('button', { class: k === 'S' ? 'start' : k === 'C' ? 'clr' : '', onclick: () => kpPress(k), 'aria-label': k === 'S' ? 'Start' : k === 'C' ? 'Clear' : k }, k === 'S' ? 'Start' : k === 'C' ? 'Clear' : k));
  }
  $('#keypad').addEventListener('click', ev => { if (ev.target.id === 'keypad') $('#keypad').hidden = true; });
}
function openAdmin(){
  UI.adminOpen = true;
  Sfx.play('rank');
  buildAdmin();
  $('#admin').hidden = false;
}
function buildAdmin(){
  const A = $('#admin'); A.innerHTML = '';
  const inGame = G.active && !G.attract;
  const btn = (label, fn, cls) => h('button', { class:'a ' + (cls || ''), onclick: () => { fn(); Sfx.play('click'); buildAdmin(); } }, label);
  const tog = (label, on, fn) => btn(label + (on ? ': on' : ': off'), fn, on ? 'on' : '');
  const num = (id, val, w) => { const i = h('input', { type:'number', id, value: String(val), 'aria-label': id }); if (w) i.style.width = w; return i; };
  const head = h('header', {}, h('b', { text:'Service menu' }), h('button', { 'aria-label':'Close', onclick: () => { $('#admin').hidden = true; UI.adminOpen = false; }, text:'×' }));
  A.append(head);
  dragify(A, head);
  A.append(adminCustomSection(btn));
  if (inGame){
    const cashIn = num('adm-cash', Math.floor(G.cash), '110px');
    const livesIn = num('adm-lives', G.lives);
    const roundIn = num('adm-round', G.round);
    A.append(h('section', {}, h('h5', { text:'Money and lives' }),
      h('div', { class:'r' }, btn('+$1K', () => Admin.cash(1000)), btn('+$10K', () => Admin.cash(10000)), btn('+$100K', () => Admin.cash(100000)), btn('+$1M', () => Admin.cash(1e6))),
      h('div', { class:'r' }, cashIn, btn('Set cash', () => Admin.setCash(+$('#adm-cash').value || 0)), tog('Infinite cash', G.admin.infCash, () => { G.admin.infCash = !G.admin.infCash; if (!G.admin.infCash) G.cash = Math.min(G.cash, 1e6); })),
      h('div', { class:'r' }, btn('+100 lives', () => Admin.lives(100)), livesIn, btn('Set lives', () => Admin.setLives(+$('#adm-lives').value || 1)), tog('Invincible', G.admin.god, () => { G.admin.god = !G.admin.god; }))));
    A.append(h('section', {}, h('h5', { text:'Rounds' }),
      h('div', { class:'r' }, roundIn, btn('Jump to round', () => { Admin.setRound(+$('#adm-round').value || 1); }), btn('Skip round', () => Admin.skipRound()), btn('Clear pests', () => Admin.killAll(), 'warn')),
      h('div', { class:'r' }, h('span', { class:'muted', text:'Speed' }), [1, 2, 3, 5, 10].map(s => btn(s + '×', () => { G.speed = s; }, G.speed === s ? 'on' : ''))),
      h('div', { class:'r' }, h('span', { class:'muted', text:'Damage' }), [1, 2, 10, 100].map(s => btn('×' + s, () => { G.admin.dmgMult = s; }, G.admin.dmgMult === s ? 'on' : '')))));
    const sel = h('select', { id:'adm-type', 'aria-label':'Pest' }, ENEMY_ORDER.map(id => h('option', { value: id, text: ENEMIES[id].name })));
    sel.value = UI.admType || 'cheese';
    sel.addEventListener('change', () => { UI.admType = sel.value; });
    const cnt = num('adm-count', UI.admCount || 5, '60px');
    const mod = (k, label) => { const c = h('input', { type:'checkbox', id:'adm-' + k }); c.checked = !!(UI.admMods || {})[k]; c.addEventListener('change', () => { UI.admMods = UI.admMods || {}; UI.admMods[k] = c.checked; }); return h('label', { for:'adm-' + k }, c, label); };
    A.append(h('section', {}, h('h5', { text:'Spawn pests' }),
      h('div', { class:'r' }, sel, cnt),
      h('div', { class:'r' }, mod('camo', 'Ghost'), mod('mold', 'Moldy'), mod('armored', 'Armored')),
      h('div', { class:'r' }, btn('Spawn', () => { UI.admCount = +$('#adm-count').value || 1; Admin.spawn($('#adm-type').value, clamp(UI.admCount, 1, 200), UI.admMods || {}); }))));
    const s = UI.sel && G.towers.includes(UI.sel) ? UI.sel : null;
    A.append(h('section', {}, h('h5', { text:'Appliances' }),
      h('div', { class:'muted', text: s ? 'Selected: ' + TOWERS[s.type].name + ' ' + s.up.join('-') : 'Select an appliance on the map to max it out.' }),
      h('div', { class:'r' }, [0, 1, 2].map(p => btn('Max to ' + ['5-2-0', '0-5-2', '2-0-5'][p], () => { if (s){ Admin.maxTower(s, p); updatePanel(true); buildAbilities(); } }, s ? '' : 'muted'))),
      h('div', { class:'r' }, btn('Reset ability cooldowns', () => Admin.resetCooldowns()))));
  } else {
    A.append(h('section', {}, h('p', { class:'muted', text:'Start or continue a game to use money, round, spawning and appliance tools.' })));
  }
  /* Dough: give some, or set the balance outright */
  const doughDone = () => {
    Hooks.dough(0);
    if (UI.screen === 'menu') refreshMenu();
    else if (UI.screen === 'chefs') buildChefs();
    else if (UI.screen === 'shop') buildPantry();
    else if (UI.screen === 'game' && G.active && !G.attract) updatePowerButton();
  };
  const doughIn = num('adm-dough', Math.floor(Profile.dough), '110px');
  A.append(h('section', {}, h('h5', { text:'Dough' }),
    h('div', { class:'muted', text:'You have ' + fmt(Profile.dough) + ' Dough.' }),
    h('div', { class:'r' }, [1000, 10000, 100000, 1e6].map(v => btn('+' + (v >= 1e6 ? fmt(v / 1e6) + 'M' : fmt(v / 1000) + 'K'), () => { Admin.dough(v); doughDone(); }))),
    h('div', { class:'r' }, doughIn, btn('Set Dough', () => { Admin.setDough(+$('#adm-dough').value || 0); doughDone(); }))));
  A.append(h('section', {}, h('h5', { text:'Profile' }),
    h('div', { class:'r' }, tog('Unlock every upgrade and skin', AdminFlags.unlockAll, () => { AdminFlags.unlockAll = !AdminFlags.unlockAll; if (G.active) refreshTowers(); refreshSkinViews(); })),
    h('div', { class:'r' }, tog('Admin unit: Chef Infinity in the shop', AdminFlags.unit, () => { AdminFlags.unit = !AdminFlags.unit; if (G.active && !G.attract && UI.screen === 'game') buildShop(); })),
    h('div', { class:'muted', text:'Chef Infinity is free, hits everything on the map, and has four kitchen-bending moves. A game he joins earns no medals, records or Dough.' }),
    h('div', { class:'r' }, btn('Max all mastery', () => { Admin.maxMastery(); refreshSkinViews(); }), btn('+10K XP each', () => { Admin.addXP(10000); refreshSkinViews(); }), btn('Reset mastery', () => { Admin.resetMastery(); refreshSkinViews(); }, 'warn')),
    h('div', { class:'r' }, btn('Unlock all medals', () => Admin.allMedals()), btn('Reset perks', () => { Profile.perks = {}; saveProfile(); })),
    h('div', { class:'r' }, UI.wipeArmed ? btn('Confirm: wipe all saves', () => { UI.wipeArmed = false; const fresh = defaultProfile(); fresh.resetAt = Date.now(); setProfile(fresh); saveProfile(); clearStoredGame(); if (G.active && !G.attract){ G.active = false; show('menu'); } else if (UI.screen === 'menu') refreshMenu(); }, 'warn') : btn('Wipe all saves', () => { UI.wipeArmed = true; setTimeout(() => { UI.wipeArmed = false; }, 4000); }, 'warn'))));
  A.append(h('section', {}, h('h5', { text:'Debug' }),
    h('div', { class:'r' }, tog('Paths and hitboxes', UI.debug, () => { UI.debug = !UI.debug; }), tog('FPS counter', UI.fps, () => { UI.fps = !UI.fps; })),
    h('div', { class:'muted', text:'Code 4334 · type it anywhere, or tap the 12:00 clock three times.' })));
  if (UI.screen === 'mastery') buildMastery();
}
function dragify(panel, handle){
  let sx, sy, ox, oy, on = false;
  handle.addEventListener('pointerdown', ev => {
    if (ev.target.closest('button')) return;
    on = true; sx = ev.clientX; sy = ev.clientY;
    const r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
    handle.setPointerCapture(ev.pointerId);
  });
  handle.addEventListener('pointermove', ev => {
    if (!on) return;
    const x = clamp(ox + ev.clientX - sx, 0, window.innerWidth - 80), y = clamp(oy + ev.clientY - sy, 0, window.innerHeight - 40);
    panel.style.left = x + 'px'; panel.style.top = y + 'px'; panel.style.right = 'auto';
  });
  handle.addEventListener('pointerup', () => { on = false; });
}

/* ---------------------------------------------------------------------
   Keyboard
   --------------------------------------------------------------------- */
function onKey(ev){
  if (ev.target.matches && ev.target.matches('input, textarea, select')) return;
  if (/^[0-9]$/.test(ev.key)){
    UI.codeBuf = (UI.codeBuf + ev.key).slice(-4);
    if (UI.codeBuf === '4334'){ UI.codeBuf = ''; $('#keypad').hidden = true; openAdmin(); return; }
  }
  if (!$('#keypad').hidden){
    if (/^[0-9]$/.test(ev.key)) kpPress(ev.key);
    else if (ev.key === 'Enter') kpPress('S');
    else if (ev.key === 'Backspace') kpPress('C');
    else if (ev.key === 'Escape') $('#keypad').hidden = true;
    return;
  }
  if (UI.modalOpen){
    if (ev.key === 'Escape' && UI.modalDismiss){ const f = UI.modalDismiss; closeModal(); f(); }
    return;
  }
  if (UI.screen !== 'game'){
    if (UI.screen === 'mastery' && UI.mtab === 'towers' && UI.mTower && !(ev.target.matches && ev.target.matches('select'))){
      if (ev.key === 'Escape'){ UI.mTower = null; buildMastery('towers'); return; }
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight'){
        const { list } = masteryOrder(), at = list.indexOf(UI.mTower);
        if (at >= 0 && list.length > 1){ ev.preventDefault(); openTowerPage(list[(at + (ev.key === 'ArrowLeft' ? -1 : 1) + list.length) % list.length]); }
        return;
      }
    }
    if (ev.key === 'Escape' && UI.screen !== 'menu') show('menu');
    return;
  }
  const k = ev.key.toLowerCase();
  if (k === ' '){ ev.preventDefault(); goButton(); return; }
  if (k === 'escape' && (UI.powerPick || !$('#pw-tray').hidden)){ UI.powerPick = null; closePowerTray(); updatePowerButton(); return; }
  if (k === 'escape'){ if (UI.lockPick){ UI.lockPick = null; updatePanel(true); } else if (UI.spotPick){ UI.spotPick = null; updatePanel(true); } else if (UI.placing) cancelPlacing(); else if (UI.sel) select(null); else pauseGame(); return; }
  if (k === 'tab' && UI.sel){ ev.preventDefault(); cycleTarget(); return; }
  if (UI.sel && (k === ',' || k === '.' || k === '/')){ ev.preventDefault(); buyUpgrade({ ',':0, '.':1, '/':2 }[k]); return; }
  if (UI.sel && (k === 'delete' || k === 'backspace') && !canSell()){ ev.preventDefault(); Sfx.play('error'); toast('No refunds in today’s challenge.', 'warn'); return; }
  if (UI.sel && (k === 'delete' || k === 'backspace') && Coop.on && !coopCanTouch(UI.sel)){ ev.preventDefault(); Sfx.play('error'); return; }
  if (UI.sel && (k === 'delete' || k === 'backspace')){ ev.preventDefault(); const v = sellTower(UI.sel); toast('Sold for ' + money(v) + '.', ''); select(null); return; }
  if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && k === 'c' && UI.sel && !(window.getSelection && String(window.getSelection()))){ ev.preventDefault(); copyTower(); return; }
  if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && k === 'v'){ ev.preventDefault(); startPaste(); return; }
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (k === HERO_KEY){ const d = heroOnDuty(); if (d) select(d); else { startPlacing(heroPick()); if (UI.pointer && UI.placing) setGhost(UI.pointer.x, UI.pointer.y); } return; }
  if (k === '`' || ev.code === 'Backquote'){ if ($('#ab-auto')) toggleAutoAll(); return; }
  if (k === '-' || ev.code === 'Minus' || ev.code === 'NumpadSubtract'){ if ($('#ab-hide')) toggleAbHidden(); return; }
  /* the new appliances sit on punctuation keys; match the physical key too, for keyboards where it types something else */
  const type = TOWER_ORDER.find(t => TOWERS[t].hot.toLowerCase() === k) || TOWER_ORDER.find(t => TOWERS[t].code && TOWERS[t].code === ev.code);
  if (type){ if (TOWERS[type].code) ev.preventDefault();   /* ' and / open Quick Find in some browsers */
    startPlacing(type); if (UI.pointer) setGhost(UI.pointer.x, UI.pointer.y); return; }
  const slot = AB_KEYS.findIndex(x => x.toLowerCase() === k);
  if (slot >= 0){ const ab = abilityList()[slot]; if (!ab || !useAbility(ab.id)) Sfx.play('error'); }
}

/* ---------------------------------------------------------------------
   Engine hooks
   --------------------------------------------------------------------- */
function wireHooks(){
  Hooks.sfx = n => Sfx.play(n);
  Hooks.toast = (m, k) => toast(m, k);
  Hooks.roundEnd = (n, bonus, support) => {
    if (G.attract) return;
    let mvp = null;
    for (const t of G.towers){ t.lastDmg = Math.max(0, t.dmg - (t.dmgStart != null ? t.dmgStart : t.dmg)); if (!mvp || t.lastDmg > mvp.lastDmg) mvp = t; }
    toast('Round ' + n + ' cleared · +' + money(bonus + support) + (G.lastRoundDough ? ' · +' + G.lastRoundDough + ' Dough' : '') + (G.lastRoundLives ? ' · +' + G.lastRoundLives + (G.lastRoundLives === 1 ? ' life' : ' lives') : ''), support ? 'gold' : '');
    if (mvp && mvp.lastDmg >= 1 && G.towers.length > 1) toast((mvp.hero ? 'Top cook: ' : 'Top appliance: ') + (mvp.paragon ? TOWERS[mvp.type].paragon.name : TOWERS[mvp.type].name) + ' · ' + fmt(mvp.lastDmg) + ' damage', 'info');
    flashSaved();
    updatePanel(true);
    if (UI.skipQueued){ const n = UI.skipQueued; UI.skipQueued = 0; UI.autoLeft = null; updateSkipBtn(); setTimeout(() => { if (!G.roundActive && !G.over && !UI.modalOpen) skipForecast(n); }, 500); return; }
    if (Profile.settings.auto && UI.autoArmed) UI.autoLeft = AUTO_AFTER_ROUND;
  };
  Hooks.roundStart = n => {
    for (const t of G.towers) t.dmgStart = t.dmg;
    buildPreview();
    if (G.attract || n < 10 || n % 10) return;
    const e = escalation(n);
    toast('Wave ' + n + ': pests now have +' + e.hp + '% health and +' + e.speed + '% speed.', 'warn');
  };
  Hooks.gameOver = () => { if (!G.attract) setTimeout(showDefeat, 400); };
  Hooks.victory = (fresh, freshMM, reward) => { if (!G.attract) setTimeout(() => showVictory(fresh, freshMM, reward), 500); };
  Hooks.eventCleared = got => eventCleared(got);
  Hooks.rankUp = (type, r) => { if (G.attract) return; toast(TOWERS[type].name + ' reached ' + RANKS[r].name + '! ' + RANKS[r].perk + '.', 'gold'); Sfx.play('rank'); };
  Hooks.newPest = type => {
    if (G.attract) return;
    const d = ENEMIES[type];
    if (d.boss){ saveProfile(); return; }
    const extra = d.immune ? 'Immune to ' + d.immune.map(i => TYPE_LABEL[i]).join(' and ') + '.' : d.big ? 'A vehicle: tough and slow.' : '';
    toast('New pest: ' + d.name + '. ' + extra, d.boss ? 'warn' : 'info');
    saveProfile();
  };
  Hooks.boss = e => { bossBar(); if (e && !G.attract && UI.screen === 'game') announceBoss(e); };
  Hooks.towersChanged = () => { if (G.attract) return; buildAbilities(); };
  Hooks.cloud = changed => {
    updateCloudBadge();
    if (!changed) return;
    /* the cloud brought progress from another device (or put back lost progress) */
    syncHeroUnlocks(); checkAchievements(true);
    if (UI.screen === 'menu') refreshMenu();
    else if (UI.screen === 'chefs') buildChefs();
    else if (UI.screen === 'shop') buildPantry();
    else if (UI.screen === 'game' && G.active && !G.attract){ buildShop(); updatePanel(true); updatePowerButton(); }
  };
  Hooks.saved = () => {};
}

/* ---------------------------------------------------------------------
   Main loop
   --------------------------------------------------------------------- */
let lastT = 0, acc = 0, slowT = 0, fpsN = 0, fpsT = 0;
function frame(now){
  const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0.016;
  lastT = now;
  UI.time += dt;
  fpsN++; fpsT += dt; if (fpsT >= 0.5){
    UI.fpsVal = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0;
    if (UI.screen === 'game' && G.roundActive && !G.paused && !perfMode() && !UI.perfHinted && !document.hidden){
      UI.slowFor = UI.fpsVal < 28 ? (UI.slowFor || 0) + 0.5 : 0;
      if (UI.slowFor >= 6){ UI.perfHinted = true; toast('The game is running slowly. Turn on Performance mode in Settings to remove most particles.', 'info'); }
    }
  }
  try {
    if (UI.screen === 'menu' && G.attract){
      attractTick(dt);
      acc += dt; let n = 0;
      while (acc >= DT && n < 4){ step(DT); acc -= DT; n++; }
      if (n >= 4) acc = 0;
      renderMenu();
    } else if (UI.screen === 'game' && G.active){
      if (coopGuest()){ coopGuestTick(dt); acc = 0; }
      else if (!G.paused && !G.over && !UI.modalOpen && !UI.skipping){
        acc += dt * G.speed; let n = 0; const max = 14;
        const cash0 = G.cash;
        while (acc >= DT && n < max){ step(DT); acc -= DT; n++; }
        if (n >= max) acc = 0;
        if (Coop.on) coopIncome(cash0);
      } else acc = 0;
      if (Coop.on || Net.send) coopNetTick();
      if (UI.sellArmed > 0){ UI.sellArmed -= dt; if (UI.sellArmed <= 0){ UI.sellArmed = 0; updatePanel(true); } }
      if (UI.skipping){ requestAnimationFrame(frame); return; }  // the forecast owns the game state; don't spend time drawing it
      autoTick(dt);
      tutTick();
      Music.setMood(UI.screen === 'game' && G.active && !G.attract ? (G.roundActive && G.bosses.length && !G.over ? 'boss' : 'game') : 'menu');
      renderGame();
      updateHud();
      updateAbilities();
      slowT += dt;
      if (slowT > 0.2){ slowT = 0; if (Coop.on || Net.role) updateCoopBadge(); updateShop(); updatePanel(); updateClip(); if (UI.placing && UI.ghost) setGhost(UI.ghost.px != null ? UI.ghost.px : UI.ghost.x, UI.ghost.py != null ? UI.ghost.py : UI.ghost.y); }
    }
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------------
   Boot
   --------------------------------------------------------------------- */
function bindStatic(){
  $('#btn-play').addEventListener('click', () => { Sfx.unlock(); show('maps'); });
  $('#btn-continue').addEventListener('click', () => { Sfx.unlock(); continueGame(); });
  $('#btn-saves').addEventListener('click', () => { Sfx.unlock(); showSaves(); });
  $('#btn-mastery').addEventListener('click', () => { Sfx.unlock(); show('mastery'); });
  $('#btn-daily').addEventListener('click', showDaily);
  $('#btn-events').addEventListener('click', showEvents);
  $('#btn-bosses').addEventListener('click', showBosses);
  $('#btn-gallery').addEventListener('click', () => showGallery());
  $('#btn-coop').addEventListener('click', () => showCoop());
  $('#btn-mods').addEventListener('click', () => showMods());
  $('#tut-skip').addEventListener('click', () => { Sfx.play('click'); tutEnd(); });
  $('#btn-shop').addEventListener('click', () => { Sfx.unlock(); show('shop'); });
  $('#btn-chefs').addEventListener('click', () => { Sfx.unlock(); show('chefs'); });
  $('#pw-btn').addEventListener('click', ev => { ev.stopPropagation(); togglePowerTray(); });
  $('#btn-data').addEventListener('click', showSaveData);
  $('#btn-settings').addEventListener('click', showSettings);
  $('#btn-howto').addEventListener('click', () => showHowTo());
  $('#menu-clock').addEventListener('click', clockTap);
  for (const b of $$('[data-back]')) b.addEventListener('click', () => show(b.dataset.back));
  for (const b of $$('#mastery-tabs button')) b.addEventListener('click', () => { if (b.dataset.tab === 'towers') UI.mTower = null; buildMastery(b.dataset.tab); });
  $('#btn-go').addEventListener('click', goButton);
  $('#btn-speed').addEventListener('click', () => { if (G.active) cycleSpeed(); });
  $('#btn-pause').addEventListener('click', pauseGame);
  $('#btn-sandbox').addEventListener('click', toggleSandbox);
  $('#auto-start').addEventListener('change', ev => setAutoStart(ev.target.checked));
  $('#modal').addEventListener('click', ev => { if (ev.target.id === 'modal' && UI.modalDismiss){ const f = UI.modalDismiss; closeModal(); f(); } });
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', () => { clearTimeout(UI.rt); UI.rt = setTimeout(() => { if (UI.screen === 'game') layoutStage(); if (UI.screen === 'menu') layoutMenu(); }, 120); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (UI.screen === 'game'){ clearTimeout(UI.rt2); UI.rt2 = setTimeout(layoutStage, 60); } }).observe($('#stage-col'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden){
      if (UI.screen === 'game' && G.active && !G.over){ saveGameNow(); if (G.roundActive && !UI.modalOpen) pauseGame(); }
      Store.flushNow();
    } else Store.resync();
  });
  window.addEventListener('pagehide', () => { if (UI.screen === 'game' && G.active && !G.over) saveGameNow(); Store.flushNow(); });
}
let booted = false;
function boot(data){
  if (booted) return;
  booted = true;
  Store.init();
  applyAccess();
  if (IS_TOUCH) document.body.classList.add('touch');
  wireHooks();
  wireMetaHooks();
  wireHeroHooks();
  buildKeypad();
  bindStatic();
  bindStage();
  if (data && data.game && data.game.towers){ try { loadGame(data.game); enterGame(); } catch (e) { show('menu'); } }
  else show('menu');
  metaBoot();
  Store.connectCloud();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
    redrawKitchens();
    if (UI.screen === 'game') buildShop();
  });
  try {
    const hot = window.claude && window.claude.hot;
    if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => ({ game: G.active && !G.attract && !G.over ? (G.roundActive ? G.lastSnap : serializeGame()) : null }));
  } catch (e) {}
  setInterval(autoAbilityTick, AUTO_MS);
  requestAnimationFrame(frame);
}
(function start(){
  let hot = null;
  try { hot = window.claude && window.claude.hot; } catch (e) {}
  if (hot && typeof hot.ready === 'function'){ try { hot.ready(boot); } catch (e) { boot({}); } setTimeout(() => boot({}), 2500); }
  else boot(hot && hot.data ? hot.data : {});
})();
