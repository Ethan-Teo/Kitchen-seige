/* =====================================================================
   Kitchen Siege — skins screens and the admin tower builder (UI)
   ===================================================================== */

/* ---------------------------------------------------------------------
   Skins
   --------------------------------------------------------------------- */
function swatchStyle(type, id){
  const s = SKIN_MAP[id] || SKIN_MAP.classic;
  if (s.body === 'rainbow') return { background:'conic-gradient(#ff5d5d,#ffd23f,#5ddc7a,#3ec1d3,#7b5cff,#ff5dc8,#ff5d5d)' };
  const c = Art.skinSwatch(type, id);
  const st = { background: c };
  if (s.fx === 'sparkle') st.background = 'linear-gradient(135deg,#fff3c4 0%,' + c + ' 45%,#b8861b 100%)';
  if (s.fx === 'shine') st.background = 'linear-gradient(135deg,#f4c49a 0%,' + c + ' 50%,#7a3f1c 100%)';
  if (s.fx === 'neon') st.boxShadow = 'inset 0 0 0 2px #9ff3ff, 0 0 6px #7b5cff';
  if (s.fx === 'stars') st.background = 'radial-gradient(circle at 30% 30%,#fff4c2 0 1.5px,transparent 2px),radial-gradient(circle at 70% 60%,#fff4c2 0 1px,transparent 1.5px),' + c;
  if (s.fx === 'embers') st.background = 'radial-gradient(circle at 50% 110%,#ff7a2a 0,' + c + ' 70%)';
  if (s.fx === 'sprinkles') st.background = 'radial-gradient(circle at 30% 35%,#ffd23f 0 1.5px,transparent 2px),radial-gradient(circle at 65% 65%,#3ec1d3 0 1.5px,transparent 2px),radial-gradient(circle at 70% 30%,#9b5de5 0 1.5px,transparent 2px),' + c;
  if (s.fx === 'frost') st.background = 'radial-gradient(circle at 35% 30%,#ffffff 0 2px,transparent 3px),' + c;
  return st;
}
function skinLockText(s){ return 'Unlocks at ' + RANKS[s.rank].name + ' mastery'; }
function refreshSkinViews(){
  if (G.active && !G.attract && UI.screen === 'game'){ buildShop(); updatePanel(true); updateClip(); }
  if (UI.screen === 'mastery' && UI.mtab === 'skins') buildMastery('skins');
}
function skinChip(type){
  const id = skinOf(type);
  return h('button', { class:'skin-chip', title:'Change how this appliance looks', onclick: () => showSkinPicker(type) },
    h('i', { style: swatchStyle(type, id) }), 'Skin: ' + SKIN_MAP[id].name);
}
function showSkinPicker(type){
  const wrap = h('div', {});
  const draw = () => {
    const cur = skinOf(type);
    const grid = h('div', { class:'skin-grid' });
    for (const s of SKINS){
      const ok = skinUnlocked(type, s.id);
      grid.append(h('button', { class:'skin-tile' + (s.id === cur ? ' on' : '') + (ok ? '' : ' locked'), 'aria-pressed': String(s.id === cur), title: ok ? s.desc : skinLockText(s),
        onclick: () => {
          if (!ok){ Sfx.play('error'); note.textContent = s.name + ': ' + skinLockText(s).toLowerCase() + '.'; return; }
          setSkin(type, s.id); Sfx.play('click'); note.textContent = s.name + ' equipped.';
          wrap.replaceChildren(draw()); refreshSkinViews();
        } },
        iconCanvas(Art.towerIcon(type, 72, [0, 0, 0], false, s.id)),
        h('b', { text: s.name }),
        h('small', { text: ok ? s.desc : '🔒 ' + skinLockText(s) })));
    }
    return grid;
  };
  const note = h('p', { class:'note', 'aria-live':'polite', text: skinsOwned(type) + ' of ' + SKINS.length + ' skins unlocked for the ' + TOWERS[type].name + '.' });
  wrap.append(draw());
  modal({ title: TOWERS[type].name + ' skins', lead: isCustomTower(type) ? 'Custom appliances can wear any skin.' : 'Skins only change how it looks. Earn mastery ranks with this appliance to unlock more finishes.', content:[wrap, note], actions:[{ label:'Done', kind:'primary' }], wide:true });
}
function buildSkinsTab(body){
  body.append(h('p', { class:'lead', style:{ maxWidth:'72ch', color:'var(--ink-2)' }, text:'Skins change how an appliance looks and nothing else. Each one is unlocked by that appliance’s mastery rank, from Retro Mint at Line Cook up to Rainbow at Michelin ★★★. Pick a swatch to wear it; you can also change skins from an appliance’s panel during a game.' }));
  const grid = h('div', { class:'mgrid' });
  for (const type of TOWER_ORDER){
    const cur = skinOf(type);
    const dots = h('div', { class:'skin-dots', role:'group', 'aria-label': TOWERS[type].name + ' skins' });
    for (const s of SKINS){
      const ok = skinUnlocked(type, s.id);
      dots.append(h('button', { class:'skin-dot' + (s.id === cur ? ' on' : '') + (ok ? '' : ' locked'), style: swatchStyle(type, s.id), 'aria-pressed': String(s.id === cur),
        title: s.name + (ok ? '' : ' · ' + skinLockText(s)), 'aria-label': s.name + (ok ? '' : ' (locked)'),
        onclick: () => { if (!ok){ Sfx.play('error'); return; } setSkin(type, s.id); Sfx.play('click'); buildMastery('skins'); } }));
    }
    grid.append(h('div', { class:'mcard skin-card' },
      h('div', { class:'top' }, iconCanvas(Art.towerIcon(type, 64)),
        h('div', { style:{ flex:'1', minWidth:'0' } }, h('h3', { text: TOWERS[type].name }), h('div', { class:'rank', text: SKIN_MAP[cur].name + ' · ' + skinsOwned(type) + ' of ' + SKINS.length + ' unlocked' })),
        h('button', { class:'btn btn-small', onclick: () => showSkinPicker(type) }, 'Preview')),
      dots));
  }
  body.append(grid);
}

/* ---------------------------------------------------------------------
   Admin: tower builder
   Four tabs edit one working copy of a design (UI.bld.d):
   Basics, Attacks, Abilities and Upgrades. The preview on the side
   always shows the cleaned design, so half-typed numbers can't break it.
   --------------------------------------------------------------------- */
function adminCustomSection(btn){
  const ids = customList();
  const sec = h('section', {}, h('h5', { text:'Tower builder' }),
    h('div', { class:'muted', text: ids.length ? ids.length + ' custom appliance' + (ids.length === 1 ? '' : 's') + ' in the shop (limit ' + CUSTOM_MAX + ').' : 'Design your own appliance: its look, attacks, abilities and every upgrade. It joins the shop for every game.' }),
    h('div', { class:'r' }, btn('Open tower builder', () => openBuilder(null), 'on')));
  if (ids.length) sec.append(h('div', { class:'r' }, ids.map(id => btn('Edit ' + TOWERS[id].name, () => openBuilder(id)))));
  return sec;
}
function openBuilder(id){
  const editing = id && Profile.custom && Profile.custom[id] ? id : null;
  UI.bld = { id: editing, d: cleanCustom(editing ? Profile.custom[editing] : defaultCustom()), tab:'basics', path:0, delArm:null, adminWas: !$('#admin').hidden };
  $('#admin').hidden = true; UI.adminOpen = false;
  renderBuilder();
}
function closeBuilder(){
  const back = UI.bld && UI.bld.adminWas;
  UI.bld = null;
  closeModal();
  if (back){ UI.adminOpen = true; buildAdmin(); $('#admin').hidden = false; }
}
/* the type the builder draws a design as: its own body (under a stand-in type) or the built-in look */
function previewType(d){
  const b = d.body && typeof bodyById === 'function' ? bodyById(d.body) : null;
  if (!b) return d.look;
  TOWERS._bprev = Object.assign(TOWERS._bprev || {}, { name: d.name, size: b.size, look: bodyLook(d.body), custom:true, cost:0, base:{ atk:{} }, paths:[], tint: d.tint, skin: d.skin });
  return '_bprev';
}
/* which upgrade changes a design can use right now */
function modKindsFor(d){
  const A = d.attacks;
  return Object.keys(MOD_KINDS).filter(k => {
    const K = MOD_KINDS[k];
    if (K.atk && !A.length) return false;
    if (K.ab && !d.abilities.length) return false;
    if (k === 'unlock') return A.some(a => a.locked);
    if (K.atk) return A.some(a => modFits(k, a.style));
    return true;
  });
}
/* the attacks a change can point at */
function modTargets(d, k){
  const ok = a => k === 'unlock' ? a.locked : modFits(k, a.style);
  const out = [];
  if (k !== 'unlock' && !ONE_ATTACK[k]) out.push([-1, 'All attacks']);
  d.attacks.forEach((a, i) => { if (ok(a)) out.push([i, attackLabel(d, i) + (a.name ? ' (' + CUSTOM_STYLES[a.style].name.toLowerCase() + ')' : '')]); });
  return out;
}
function newMod(d, k){
  const K = MOD_KINDS[k], m = { k };
  if (K.atk){ const t = modTargets(d, k); m.a = t.length ? t[0][0] : -1; }
  if (K.ab) m.ab = 0;
  if (K.num) m.v = K.num[3];
  if (k === 'effect'){ m.e = 'burn'; m.v = 3; }
  if (k === 'type') m.e = 'normal';
  if (k === 'sprite'){ const a = d.attacks[m.a]; m.e = Object.keys(a ? UPGRADE_SPRITES[a.style] : ALL_SPRITES).slice(-1)[0]; }
  if (k === 'shape') m.e = 'star';
  if (k === 'color') m.e = '#ffd166';
  if (k === 'look'){ const c = lookChoices(); m.e = c.length ? c[0][0] : 'knife'; }
  if (k === 'tint') m.e = '#5aa6d6';
  if (k === 'aim'){ const a = d.attacks[m.a]; m.e = a && can.pointer(a.style) && a.aim !== 'pointer' ? 'pointer' : 'strong'; }
  return m;
}
/* the aims an attack of this style can use */
function aimsFor(st){ return Object.entries(AIMS).filter(([k]) => k !== 'pointer' || can.pointer(st)); }
/* keep upgrade changes pointing at the right attack or ability after one is removed */
function remapAfterRemove(d, kind, idx){
  for (const P of d.paths) for (const T of P.tiers){
    T.mods = T.mods.filter(m => {
      if (kind === 'attack' && MOD_KINDS[m.k] && MOD_KINDS[m.k].atk){ if (m.a === idx) return false; if (m.a > idx) m.a--; }
      if (kind === 'ability' && MOD_KINDS[m.k] && MOD_KINDS[m.k].ab){ if (m.ab === idx) return false; if (m.ab > idx) m.ab--; }
      return true;
    });
  }
}
/* ---------------------------------------------------------------------
   Builder test range: practice pests circle the appliance while it uses
   the design's real numbers at the chosen upgrade tiers (or as a paragon
   of some degree). It runs a small simulation of its own that follows the
   game's rules (ghosts, immunities, vehicles, effects), so it never
   touches a game in progress.
   --------------------------------------------------------------------- */
const RANGE_TARGETS = {
  roach:   { name:'Roaches', icon:'roach', pests:['roach', 'roach', 'roach', 'roach', 'roach'], tip:'Five cockroaches.' },
  ghost:   { name:'Ghosts', icon:'roach', ghost:true, pests:['roach', 'roach', 'roach', 'roach', 'roach'], tip:'Ghost roaches. Only appliances that see ghost pests can aim at them.' },
  shell:   { name:'Shelled', icon:'weevil', pests:['weevil', 'pillbug', 'fireant', 'snowflea', 'roach'], tip:'A weevil, pillbug, fire ant and snow flea, each immune to a damage type, plus a roach.' },
  vehicle: { name:'Vehicle', icon:'cheese', pests:['cheese'], tip:'A cheese wheel. Extra damage to vehicles counts against it.' },
  boss:    { name:'Boss', icon:'ratking', pests:['ratking'], tip:'The Rat King. Bosses shrug off half of a slow and most of a stun.' },
};
function makePreview(){
  const PW = 320, PH = 176, TX = 160, TY = 88, RX = 116, RY = 56, K = 0.75, WIN = 4, AVG_R = (RX + RY) / 2;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = h('canvas', { class:'bprev-range', width: String(PW * dpr), height: String(PH * dpr), role:'img', 'aria-label':'Test range: the appliance attacking practice pests. Point at it to aim attacks that follow your pointer.' });
  const g = cv.getContext('2d');
  const S = { d:null, s:null, para:false, up:[0, 0, 0], deg:50, target:'roach', list:[], abs:[], pests:[], proj:[], lobs:[], traps:[], whirls:[], fx:[], parts:[], puddles:[], clouds:[], timers:[],
    t:0, aim:-Math.PI / 2, fire:0, last:0, running:false, rush:0, rushMul:1, log:[], kills:0, t0:0, sig:'', nid:1, ptr:null };

  /* the pointer over the range aims Dartling-style attacks, like the mouse does in a game */
  const toRange = ev => { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * PW, y: (ev.clientY - r.top) / r.height * PH }; };
  cv.addEventListener('pointermove', ev => { S.ptr = toRange(ev); });
  cv.addEventListener('pointerdown', ev => { S.ptr = toRange(ev); });
  cv.addEventListener('pointerleave', ev => { if (ev.pointerType !== 'touch') S.ptr = null; });

  /* ---- practice pests ---- */
  const tangent = a => Math.atan2(RY * Math.cos(a), -RX * Math.sin(a));
  const onLoop = a => [TX + Math.cos(a) * RX, TY + Math.sin(a) * RY];
  function spawnSet(){
    const T = RANGE_TARGETS[S.target] || RANGE_TARGETS.roach;
    S.pests = T.pests.map((type, k, all) => {
      const def = ENEMIES[type], big = !!def.big, hp = big ? def.hp : def.hp * 2;
      const sc = big ? clamp(17 / def.r, 0.42, 0.8) : 0.9;
      const a = -Math.PI / 2 + k / all.length * TAU;
      return { id: S.nid++, type, def, x:0, y:0, a, px: TX + Math.cos(a) * RX, py: TY + Math.sin(a) * RY, r: def.r, sc, hr: def.r * sc, big, boss: !!def.boss, ghost: !!T.ghost, camo: !!T.ghost,
        immune: def.immune || null, hp, maxHp: hp, rot: tangent(a), anim: Math.random() * 10, slowMult:1, slowT:0, freezeT:0, stunT:0, burn:null, vulnT:0, vulnAmt:0, flashT:0,
        holdT:0, hold:null, dead:false, wait:0, immT:0, lvl:1, w: clamp(def.speed / 300, 0.05, 0.38) };
    });
    S.proj = []; S.lobs = []; S.traps = []; S.whirls = []; S.puddles = []; S.clouds = [];
  }
  function revive(m){
    Object.assign(m, { dead:false, hp: m.maxHp, camo: m.ghost, slowMult:1, slowT:0, freezeT:0, stunT:0, burn:null, vulnT:0, vulnAmt:0, flashT:0, holdT:0, hold:null });
    S.fx.push({ k:'pop', x: m.px, y: m.py, t:0, life:0.22 });
  }

  /* ---- the damage meter ---- */
  function resetMeter(){ S.log = []; S.kills = 0; S.t0 = S.t; }
  function dps(){
    while (S.log.length && S.log[0][0] < S.t - WIN) S.log.shift();
    let sum = 0;
    for (const e of S.log) sum += e[1];
    return sum / Math.max(1, Math.min(WIN, S.t - S.t0));
  }

  /* ---- rules, after the engine's ---- */
  const dist = m => Math.hypot(m.px - TX, m.py - TY);
  const reachOf = a => S.s && S.s.global ? Infinity : (S.s ? S.s.range : 150) * ((a && a.rangeMul) || 1) * K;
  const sees = m => !m.camo || !!(S.s && S.s.camo);
  const immuneTo = (m, type, src) => !!(type && m.immune && m.immune.includes(type) && !(src && (src.ignoreImmune || src.ii)));
  const canAim = (m, a) => !m.dead && sees(m) && !(a && !a.targetsAll && !a.ignoreImmune && immuneTo(m, a.dtype, a));
  const ptrOf = a => a && a.aim === 'pointer' && S.ptr ? S.ptr : null;
  /* targeting order: on a loop "first" is the pest furthest round, "last" the one furthest behind */
  const order = (a, mode) => {
    const m = mode || (a && a.mode) || 'close';
    if (m === 'strong') return (p, q) => (q.big - p.big) || q.hp - p.hp;
    if (m === 'first') return (p, q) => q.a - p.a;
    if (m === 'last') return (p, q) => p.a - q.a;
    return (p, q) => dist(p) - dist(q);
  };
  const pick = (a, n, filter, mode) => S.pests.filter(m => canAim(m, a) && (a && a.aim === 'pointer' ? true : dist(m) <= reachOf(a) + m.hr) && (!filter || filter(m))).sort(order(a, mode)).slice(0, n || 1);
  const anyTarget = a => S.pests.some(m => canAim(m, a));
  const near = (x, y, r, skip) => S.pests.filter(m => !m.dead && !(skip && skip.has(m.id)) && Math.hypot(m.px - x, m.py - y) <= r + m.hr)
    .sort((p, q) => Math.hypot(p.px - x, p.py - y) - Math.hypot(q.px - x, q.py - y));
  function hurt(m, amt, type, src, mul){
    if (m.dead) return 0;
    if (immuneTo(m, type, src)){
      if (m.immT <= 0){ m.immT = 0.8; S.fx.push({ k:'text', x: m.px, y: m.py - m.hr - 4, txt:'IMMUNE', c:'#c9d6dc', t:0, life:0.6, size:11 }); }
      return 0;
    }
    let d = amt;
    if (m.big && src){ if (src.bonusBig) d += src.bonusBig; if (src.bigMult) d *= src.bigMult; }
    if (!(d > 0)) return 0;
    if (m.vulnT > 0) d += m.vulnAmt;
    d *= mul || 1;
    m.hp -= d; m.flashT = 0.06;
    S.log.push([S.t, d]);
    if (m.hp <= 0) die(m);
    return d;
  }
  function die(m){
    S.kills++;
    const col = splatColor(m);
    for (let i = 0; i < (m.big ? 16 : 6); i++){ const a = Math.random() * TAU, v = 30 + Math.random() * (m.big ? 120 : 70); S.parts.push({ x: m.px, y: m.py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t:0, life: 0.3 + Math.random() * 0.25, c: col, s: m.big ? 3.5 : 2.5, k:'dot' }); }
    /* a practice vehicle or boss patches itself up at once, so the meter keeps measuring against one big target */
    if (m.big){
      m.hp = m.maxHp;
      S.fx.push({ k:'boom', x: m.px, y: m.py, r: m.hr * 1.8, t:0, life:0.4, c:'#fff2d6' });
      S.fx.push({ k:'text', x: m.px, y: m.py - m.hr - 6, txt:'POPPED', c:'#ffd166', t:0, life:0.7, size:12 });
      return;
    }
    m.dead = true; m.wait = 0.6; m.holdT = 0; m.hold = null;
  }
  const slowP = (m, mult, dur) => { if (m.boss) mult = 1 - (1 - mult) * 0.5; if (m.slowT <= 0 || mult <= m.slowMult){ m.slowMult = mult; m.slowT = Math.max(m.slowT, dur); } };
  const stunP = (m, d) => { if (!(d > 0)) return; if (m.boss) d *= 0.4; m.stunT = Math.max(m.stunT, d); };
  const freezeP = (m, f, ii) => {
    if (!ii && immuneTo(m, 'cold', f)) return;
    if (m.big){ if (f.bigDur) m.freezeT = Math.max(m.freezeT, f.bigDur * (m.boss ? 0.5 : 1)); else slowP(m, 0.82, f.dur); }
    else m.freezeT = Math.max(m.freezeT, f.dur);
  };
  const burnP = (m, b, ii) => {
    if (!ii && immuneTo(m, 'heat', b)) return;
    if (m.burn && m.burn.dmg > b.dmg){ m.burn.t = Math.max(m.burn.t, b.dur * 0.5); return; }
    m.burn = { dmg: b.dmg, tick: b.tick || 0.5, t: b.dur, acc: m.burn ? m.burn.acc : 0, ii: !!ii };
  };
  const vulnP = (m, v) => { m.vulnAmt = m.vulnT > 0 ? Math.max(m.vulnAmt, v.amt) : v.amt; m.vulnT = Math.max(m.vulnT, v.dur); };
  const knockP = (m, k) => { m.a -= k * K / AVG_R; };
  function effects(m, a, blast){
    if (m.dead || immuneTo(m, a.type, a)) return;
    if (a.burn) burnP(m, a.burn, a.ignoreImmune);
    if (a.freeze) freezeP(m, a.freeze, a.ignoreImmune);
    if (a.slow) slowP(m, m.big ? (a.slow.bigMult || 1) : a.slow.mult, a.slow.dur);
    if (blast){ if (a.stun) stunP(m, m.big ? (a.stunBig || 0) : a.stun); }
    else { if (a.stun && !m.big) stunP(m, a.stun); if (a.bigStun && m.big) stunP(m, a.bigStun); }
    if (a.knock && !m.big) knockP(m, a.knock);
    if (a.bigKnock && m.big && !m.boss) knockP(m, a.bigKnock);
    if (a.vuln) vulnP(m, a.vuln);
    if (a.decamo && m.camo){ m.camo = false; S.fx.push({ k:'text', x: m.px, y: m.py - m.hr - 4, txt:'SPOTTED', c:'#bfe9ff', t:0, life:0.6, size:11 }); }
  }
  const hitP = (m, a, mul) => { hurt(m, a.dmg, a.type, a, mul); if (!m.dead) effects(m, a, false); };
  function zone(x, y, sp){
    if (sp.zone) S.puddles.push({ x, y, r: sp.zone.r * K, t:0, dur: sp.zone.dur, spec: sp.zone, acc:0, bacc:0, seed: Math.random() * 100 });
    if (sp.smoke) S.clouds.push({ x, y, r: sp.smoke.r * K, t:0, dur: sp.smoke.dur, spec: sp.smoke, acc:0, seed: Math.random() * 100 });
    if (S.puddles.length > 9) S.puddles.shift();
    if (S.clouds.length > 6) S.clouds.shift();
  }
  function explode(x, y, ex, mul, spec){
    const R = ex.r * K;
    for (const m of near(x, y, R).slice(0, ex.pierce || 1)){ hurt(m, ex.dmg, ex.type, ex, mul); if (!m.dead) effects(m, ex, true); }
    S.fx.push({ k:'boom', x, y, r: Math.min(80, R), t:0, life:0.32, c: ex.type === 'heat' || ex.burn ? '#ff8a3d' : '#ffc46b' });
    if (spec) zone(x, y, spec);
  }
  function chain(from, z, mul){
    const seen = new Set([from.id]), pts = [[from.px, from.py]];
    let cur = from;
    for (let k = 0; k < z.chain.count; k++){
      const nx = near(cur.px, cur.py, z.chain.range * K, seen)[0];
      if (!nx) break;
      seen.add(nx.id); pts.push([nx.px, nx.py]);
      hitP(nx, z, mul);
      cur = nx;
    }
    if (pts.length > 1) S.fx.push({ k:'zap', pts, t:0, life:0.16, c: z.color });
  }
  function bounce(p, from){
    const nx = S.pests.filter(m => !m.dead && m !== from && !p.hit.has(m.id) && sees(m) && Math.hypot(m.px - from.px, m.py - from.py) <= 180 * K)
      .sort((a, b) => Math.hypot(a.px - from.px, a.py - from.py) - Math.hypot(b.px - from.px, b.py - from.py))[0];
    if (!nx) return;
    p.bounced++; p.pierce++;
    p.ang = Math.atan2(nx.py - p.y, nx.px - p.x); p.vx = Math.cos(p.ang) * p.spd; p.vy = Math.sin(p.ang) * p.spd;
    p.life = Math.max(p.life, 0.6); p.curve = 0;
    if (p.spec.homing) p.target = nx;
  }
  /* grabbed pests stay put until the hook lets go or the bubble pops */
  function release(m){
    const hd = m.hold;
    m.hold = null; m.holdT = 0;
    if (!hd || hd.k !== 'bubble' || m.dead) return;
    S.fx.push({ k:'pop', x: m.px, y: m.py, t:0, life:0.25 });
    for (let i = 0; i < 6; i++){ const a = Math.random() * TAU, v = 40 + Math.random() * 60; S.parts.push({ x: m.px, y: m.py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t:0, life:0.35, c:'#e6fbff', s:2.5, k:'dot' }); }
    hurt(m, m.big ? hd.popBig : hd.pop, 'normal', null, hd.mul || 1);
  }

  /* ---- attacks ---- */
  function aimAt(x, y){ S.aim = Math.atan2(y - TY, x - TX); S.fire = 0.18; return S.aim; }
  const speedNow = m => m.dead || m.freezeT > 0 || m.stunT > 0 || m.holdT > 0 ? 0 : m.w * (m.slowT > 0 ? m.slowMult : 1);
  /* where a pest will be after the shot's flight */
  function lead(m, spd){
    let ax = m.px, ay = m.py, tt = Math.hypot(ax - TX, ay - TY) / spd;
    for (let k = 0; k < 2; k++){ const a = m.a + speedNow(m) * tt; [ax, ay] = onLoop(a); tt = Math.hypot(ax - TX, ay - TY) / spd; }
    return [ax, ay];
  }
  function critOf(o, a){
    if (!a.crit) return a;
    o.shots++;
    return o.shots % a.crit.every === 0 && a.critSpec ? a.critSpec : a;
  }
  const critText = (spec, x, y) => { if (spec.isCrit) S.fx.push({ k:'text', x, y: y - 16, txt:'CRIT', c:'#ffd166', t:0, life:0.6, size:12 }); };
  function shoot(spec, dir, life, spd, mul, tg){
    S.proj.push({ x: TX + Math.cos(dir) * 14, y: TY + Math.sin(dir) * 14, vx: Math.cos(dir) * spd, vy: Math.sin(dir) * spd, spd, ang: dir, spin: Math.random() * TAU, size: spec.size || 7, spec, life,
      curve:0, hit: new Set(), pierce: spec.explode ? 1 : (spec.pierce || 1), bounced:0, mul, target: spec.homing ? tg : null });
    return S.proj[S.proj.length - 1];
  }
  function fire(o, mul){
    const a = o.a, P = ptrOf(a);
    switch (a.kind){
      case 'proj': {
        let tg = null, ax, ay;
        const spec = critOf(o, a);
        const spd = clamp((spec.speed || 500) * K * 0.8, 120, 560);
        if (P){ if (!anyTarget(a)) return false; ax = P.x; ay = P.y; }
        else { tg = pick(a)[0]; if (!tg) return false; [ax, ay] = spec.homing ? [tg.px, tg.py] : lead(tg, spd); }
        const ang = aimAt(ax, ay), n = Math.min(12, spec.count || 1);
        const jit = () => spec.inacc ? (Math.random() * 2 - 1) * spec.inacc : 0;
        if (spec.boomerang){
          /* each boomerang flies a loop through the target and comes home */
          const c = Math.max(30, Math.hypot(ax - TX, ay - TY));
          for (let k = 0; k < n; k++){
            const [al, side] = BOOM_ARC[k % BOOM_ARC.length], R = c / (2 * Math.sin(al));
            const p = shoot(spec, ang - side * al, Math.min(3.5, TAU * R / spd), spd, mul, null);
            p.curve = side * spd / R; p.x = TX; p.y = TY;
          }
        } else {
          const far = P || (tg && a.aim === 'pointer') ? Math.hypot(ax - TX, ay - TY) + 60 : reachOf(a);
          const life = Math.min(2.2, (far === Infinity ? 240 : far + 40) / spd) * (spec.lifeMul || 1) * (spec.pattern === 'spiral' ? 1.6 : 1);
          if (spec.pattern === 'stream' && n > 1){
            const gap = clamp(a.rate * 0.6 / n, 0.03, 0.09);
            shoot(spec, ang + jit(), life, spd, mul, tg);
            for (let k = 1; k < n; k++) S.timers.push({ t: k * gap, fn: () => {
              const Q = ptrOf(a);
              const d = Q ? aimAt(Q.x, Q.y) : tg && !tg.dead ? aimAt(tg.px, tg.py) : ang;
              shoot(spec, d + jit(), life, spd, mul, tg);
            } });
          } else for (let k = 0; k < n; k++){
            const dir = spec.pattern === 'ring' ? ang + k / n * TAU : spec.pattern === 'scatter' ? ang + (Math.random() - 0.5) * 0.9 : ang + (k - (n - 1) / 2) * (spec.spread || 0.18);
            const p = shoot(spec, dir + jit(), life, spd, mul, tg);
            if (spec.pattern === 'spiral') p.curve = (k % 2 ? -1 : 1) * 2.4;
          }
        }
        critText(spec, ax, ay);
        return true;
      }
      case 'lob': {
        let tg = null;
        if (P){ if (!anyTarget(a)) return false; aimAt(P.x, P.y); }
        else { tg = pick(a)[0]; if (!tg) return false; aimAt(tg.px, tg.py); }
        const spec = critOf(o, a), dur = spec.travel || 0.45;
        for (let k = 0; k < Math.min(6, spec.count || 1); k++){
          let [x1, y1] = P ? [P.x, P.y] : onLoop(tg.a + speedNow(tg) * dur);
          if (k){ x1 += (Math.random() - 0.5) * 50; y1 += (Math.random() - 0.5) * 34; }
          S.lobs.push({ x0: TX, y0: TY - 8, x1, y1, t:0, dur, h:42, spec, spin: Math.random() * TAU, mul });
        }
        critText(spec, P ? P.x : tg.px, P ? P.y : tg.py);
        return true;
      }
      case 'pulse': {
        const R = Math.min(reachOf(a), 400), inR = near(TX, TY, R);
        if (!inR.some(sees)) return false;
        for (const m of inR.slice(0, a.pierce || 1)) hitP(m, a, mul);
        S.fire = 0.3;
        S.fx.push({ k: a.vfx || 'ring', x:TX, y:TY, r0:16, r1: Math.min(R, 190), t:0, life: a.vfx === 'frost' ? 0.5 : 0.3, c: a.color || (a.hot ? '#ff9a52' : '#d7f5ee'), w:3 });
        return true;
      }
      case 'flame': {
        let ang;
        if (P){ if (!anyTarget(a)) return false; ang = aimAt(P.x, P.y); }
        else { const tg = pick(a)[0]; if (!tg) return false; ang = aimAt(tg.px, tg.py); }
        const R = Math.min(reachOf(a), 400), cone = a.cone || 0.6;
        const hits = S.pests.filter(m => {
          if (m.dead) return false;
          const dd = dist(m); if (dd > R + m.hr) return false;
          let da = Math.atan2(m.py - TY, m.px - TX) - ang; da = Math.atan2(Math.sin(da), Math.cos(da));
          return Math.abs(da) <= cone * 0.5 + Math.atan(m.hr / Math.max(1, dd));
        }).sort((p, q) => dist(p) - dist(q));
        for (const m of hits.slice(0, a.pierce || 1)) hitP(m, a, mul);
        for (let k = 0; k < 4; k++){ const aa = ang + (Math.random() - 0.5) * cone * 0.9, v = Math.min(R, 200) * (1.6 + Math.random() * 0.8); S.parts.push({ x: TX + Math.cos(ang) * 14, y: TY + Math.sin(ang) * 14, vx: Math.cos(aa) * v, vy: Math.sin(aa) * v, t:0, life:0.38, c: a.color || '#ff8a3d', s:7, k:'flame' }); }
        return true;
      }
      case 'beam': {
        let ang, far = Math.min(reachOf(a), 260);
        if (P){ if (!anyTarget(a)) return false; ang = aimAt(P.x, P.y); far = Math.max(far, Math.hypot(P.x - TX, P.y - TY)); }
        else { const tg = pick(a)[0]; if (!tg) return false; ang = aimAt(tg.px, tg.py); if (a.aim === 'pointer') far = Math.max(far, dist(tg)); }
        const dx = Math.cos(ang), dy = Math.sin(ang), len = Math.min(far, 360) + 18, x0 = TX + dx * 14, y0 = TY + dy * 14, w = (a.width || 6) * 0.5 * K;
        const hits = [];
        for (const m of S.pests){
          if (m.dead) continue;
          const px = m.px - x0, py = m.py - y0, along = px * dx + py * dy;
          if (along < -m.hr || along > len + m.hr) continue;
          if (Math.abs(px * dy - py * dx) <= m.hr + w) hits.push([along, m]);
        }
        hits.sort((p, q) => p[0] - q[0]);
        const cap = a.pierce || 1;
        let n = 0, last = null;
        for (const [, m] of hits){ if (n >= cap) break; hitP(m, a, mul); last = m; n++; }
        const stop = n >= cap && last;
        S.fx.push({ k:'beam', x1:x0, y1:y0, x2: stop ? last.px : x0 + dx * len, y2: stop ? last.py : y0 + dy * len, t:0, life: a.laser ? 0.1 : 0.15, w: a.width || 6, c: a.color || (a.type === 'normal' ? '#d6b8ff' : '#ff6b5e'), laser: !!a.laser });
        return true;
      }
      case 'hitscan': {
        const shots = Math.min(8, a.shots || 1);
        const byPtr = n => S.pests.filter(m => canAim(m, a)).sort((p, q) => Math.hypot(p.px - P.x, p.py - P.y) - Math.hypot(q.px - P.x, q.py - P.y)).slice(0, n);
        const one = () => (P ? byPtr(1) : pick(a))[0];
        const many = a.multi ? (P ? byPtr(shots) : pick(a, shots)) : null;
        let tg = many ? many[0] : one();
        if (!tg) return false;
        const ang = aimAt(tg.px, tg.py);
        for (let k = 0; k < shots; k++){
          if (many){ tg = many[k]; if (!tg) break; }
          else if (!tg || tg.dead){ tg = one(); if (!tg) break; }
          const hx = tg.px, hy = tg.py;
          hitP(tg, a, mul);
          if (a.zap) chain(tg, a.zap, mul);
          if (a.splash) explode(hx, hy, a.splash, mul, null);
          S.fx.push({ k:'tracer', x1: TX + Math.cos(ang) * 14, y1: TY + Math.sin(ang) * 14, x2: hx, y2: hy, t: -k * 0.04, life:0.16, c: a.color || '#fff6e0' });
          S.fx.push({ k:'pop', x: hx, y: hy, t: -k * 0.04, life:0.22 });
        }
        return true;
      }
      case 'trap': {
        if (!anyTarget(a)) return false;
        /* piles land on the loop inside the range, a little ahead of the pests */
        const R = reachOf(a), spots = [];
        for (let k = 0; k < 36; k++){ const an = k / 36 * TAU, [x, y] = onLoop(an); if (Math.hypot(x - TX, y - TY) <= R) spots.push(an); }
        if (!spots.length) return false;
        for (let k = 0; k < Math.min(6, a.count || 1); k++){
          const an = spots[Math.floor(Math.random() * spots.length)] + (Math.random() - 0.5) * 0.12, [x, y] = onLoop(an);
          const mine = !!a.mineEvery;
          S.traps.push({ x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6, r: (a.r || 14) * K, spec: a, pierce: a.pierce || 1, max: a.pierce || 1, life: Math.min(30, a.life || 20), t:0,
            fly:0.22, x0:TX, y0:TY, hit: new Set(), bigHit: new Map(), mine, rain:false, sprite: mine ? 'ravioli' : a.sprite, rot: Math.random() * TAU, seed: Math.random() * 100, mul });
        }
        if (S.traps.length > 30) S.traps.splice(0, S.traps.length - 30);
        S.fire = 0.25;
        return true;
      }
      case 'whirl': {
        const list = pick(a, a.count || 1);
        if (!list.length) return false;
        list.forEach((m, k) => {
          /* starts just ahead of the pest and spins back down the loop */
          const an = m.a + (a.r || 22) * 0.6 * K / AVG_R + k * 0.25;
          const [x, y] = onLoop(an);
          S.whirls.push({ an, x, y, r: (a.r || 22) * K, left: (a.dist || 230) * K, spd: (a.speed || 170) * K, spec: a, pierce: a.pierce || 1, hit: new Set(), t:0, seed: Math.random() * 10, mul });
          S.fx.push({ k:'gust', x1: TX, y1: TY, x2: x, y2: y, t:0, life:0.25 });
        });
        aimAt(list[0].px, list[0].py);
        if (S.whirls.length > 12) S.whirls.splice(0, S.whirls.length - 12);
        return true;
      }
      case 'grab': {
        const list = pick(a, a.count || 1, m => m.holdT <= 0 && (!m.big || a.bigs), a.mode || (a.hook ? 'strong' : 'close'));
        if (!list.length) return false;
        let any = false;
        for (const m of list){
          let dur = a.bubble ? (m.big ? a.bubble.bigDur || 0 : a.bubble.dur) : (m.big ? a.bigHold || 0 : a.hold);
          if (!(dur > 0)) continue;
          if (m.boss) dur *= 0.3;
          hitP(m, a, mul);
          if (m.dead) { any = true; continue; }
          m.holdT = dur;
          m.hold = a.bubble ? { k:'bubble', pop: a.bubble.pop, popBig: a.bubble.popBig || a.bubble.pop, mul } : { k:'hook', x: (TX - m.px) / m.sc, y: (TY - m.py) / m.sc };
          any = true;
        }
        if (any) aimAt(list[0].px, list[0].py);
        return any;
      }
    }
    return false;
  }

  /* ---- abilities, after runCustomAbility ---- */
  function runAb(B, P){
    const longer = 1 + (P - 1) * 0.5, base = S.s ? S.s.range : 150, II = { ignoreImmune:true };
    const area = ar => ar === 'screen' || (S.s && S.s.global) ? Infinity : ar === 'wide' ? Math.max(220, base * 2.5) * K : base * K;
    const inArea = ar => { const R = area(ar); return S.pests.filter(m => !m.dead && (R === Infinity || dist(m) <= R + m.hr)); };
    const show = (ar, c) => { const R = area(ar); S.fx.push(R === Infinity ? { k:'flash', c, t:0, life:0.5 } : { k:'ring', x:TX, y:TY, r0:10, r1: Math.min(R, 260), t:0, life:0.6, c: c.replace(/,[\d.]+\)$/, ',1)'), w:5 }); };
    for (const a of B.actions){
      switch (a.k){
        case 'damage': for (const m of inArea(a.area)) hurt(m, a.dmg * P + (m.big ? a.big * P : 0), 'normal', II, 1); show(a.area, 'rgba(255,209,102,0.3)'); break;
        case 'burn': for (const m of inArea(a.area)) burnP(m, { dmg: a.dmg * P, tick:0.5, dur: a.dur * longer }, true); show(a.area, 'rgba(255,138,61,0.3)'); break;
        case 'freeze': for (const m of inArea(a.area)) freezeP(m, { dur: a.dur * longer, bigDur: a.dur * longer * 0.5 }, true); show(a.area, 'rgba(191,233,255,0.45)'); break;
        case 'stun': for (const m of inArea(a.area)) stunP(m, a.dur * longer * (m.big ? 0.5 : 1)); show(a.area, 'rgba(255,246,168,0.3)'); break;
        case 'slow': for (const m of inArea(a.area)) slowP(m, 1 - a.slowp / 100, a.dur * longer); show(a.area, 'rgba(163,231,160,0.3)'); break;
        case 'knock': for (const m of inArea(a.area)) if (!m.boss) knockP(m, a.dist * longer * (m.big ? 0.35 : 1)); show(a.area, 'rgba(255,255,255,0.3)'); break;
        case 'weaken': for (const m of inArea(a.area)) vulnP(m, { amt: a.vuln * P, dur: a.dur * longer }); show(a.area, 'rgba(208,139,255,0.3)'); break;
        case 'strip': for (const m of inArea(a.area)) m.camo = false; show(a.area, 'rgba(191,233,255,0.35)'); break;
        case 'bombs': {
          const L = S.pests.filter(m => !m.dead).sort((x, y) => y.def.tier - x.def.tier || y.hp - x.hp);
          if (!L.length) break;
          const all = Math.round(a.count * P), n = Math.min(30, all), mul = all / n;
          for (let q = 0; q < n; q++){
            const m = L[q % L.length], ox = (Math.random() - 0.5) * 30, oy = (Math.random() - 0.5) * 30;
            S.fx.push({ k:'drop', x: m.px + ox, y: m.py + oy, t: -q * 0.035, life:0.35 });
            S.timers.push({ t: 0.35 + q * 0.035, fn: () => explode(m.px + ox, m.py + oy, { r: a.r, dmg: a.dmg, pierce:40, type:'normal', ignoreImmune:true }, mul, null) });
          }
          break;
        }
        case 'strike': {
          const m = S.pests.filter(x => !x.dead).sort((x, y) => (y.boss - x.boss) || (y.big - x.big) || y.hp - x.hp)[0];
          if (!m) break;
          S.fx.push({ k:'drop', x: m.px, y: m.py, t:0, life:0.35 });
          S.timers.push({ t:0.35, fn: () => { if (m.dead) return; hurt(m, a.dmg * P, 'normal', II, 1); S.fx.push({ k:'boom', x: m.px, y: m.py, r:34, t:0, life:0.35, c:'#ffc46b' }); } });
          break;
        }
        case 'speed': S.rush = a.dur * longer; S.rushMul = 1 + Math.min(10, a.fastp / 100 * longer); S.fx.push({ k:'ring', x:TX, y:TY, r0:10, r1:80, t:0, life:0.6, c:'#ffd166', w:5 }); break;
        case 'cash': S.fx.push({ k:'crate', x: TX + 46, y: TY - 14, t:0, life:1.3, v: Math.round(a.amt * P) }); break;
        case 'lives': S.fx.push({ k:'text', x: TX, y: TY - 30, txt: '+' + fmtN(Math.round(a.amt * P)) + ' lives', c:'#9df29a', t:0, life:1.1, size:14 }); break;
      }
    }
  }

  /* ---- the loop ---- */
  function update(dt){
    S.t += dt;
    for (const m of S.pests){
      if (m.flashT > 0) m.flashT -= dt;
      if (m.immT > 0) m.immT -= dt;
      if (m.dead){
        m.a += m.w * dt; [m.px, m.py] = onLoop(m.a); m.rot = tangent(m.a);
        m.wait -= dt; if (m.wait <= 0) revive(m);
        continue;
      }
      let sp = m.w;
      if (m.freezeT > 0){ m.freezeT -= dt; sp = 0; }
      if (m.stunT > 0){ m.stunT -= dt; sp = 0; }
      if (m.holdT > 0){ m.holdT -= dt; sp = 0; if (m.holdT <= 0) release(m); }
      if (m.slowT > 0){ m.slowT -= dt; sp *= m.slowMult; } else m.slowMult = 1;
      if (m.vulnT > 0) m.vulnT -= dt;
      m.a += sp * dt;
      [m.px, m.py] = onLoop(m.a); m.rot = tangent(m.a);
      if (sp > 0) m.anim += dt * sp / m.w;
      if (m.burn){
        const b = m.burn;
        b.t -= dt; b.acc += dt;
        while (b.acc >= b.tick && !m.dead){ b.acc -= b.tick; hurt(m, b.dmg, 'heat', { ii: b.ii }, 1); }
        if (b.t <= 0) m.burn = null;
      }
    }
    if (S.fire > 0) S.fire -= dt;
    if (S.rush > 0){ S.rush -= dt; if (S.rush <= 0) S.rushMul = 1; }
    for (const o of S.list){
      const aps = S.rushMul / Math.max(0.01, o.a.rate), vis = Math.min(8, aps);
      o.acc = Math.min(1.5, o.acc + dt * vis);
      if (o.acc >= 1 && fire(o, aps / vis)) o.acc -= 1;
    }
    const born = [];
    for (const p of S.proj){
      p.life -= dt; p.spin += dt * 12;
      if (p.target && !p.target.dead){
        const want = Math.atan2(p.target.py - p.y, p.target.px - p.x);
        let da = want - p.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
        p.ang += clamp(da, -9 * dt, 9 * dt); p.vx = Math.cos(p.ang) * p.spd; p.vy = Math.sin(p.ang) * p.spd;
      } else if (p.curve){ p.ang += p.curve * dt; p.vx = Math.cos(p.ang) * p.spd; p.vy = Math.sin(p.ang) * p.spd; }
      const sp = p.spec;
      p.age = (p.age || 0) + dt;
      if (!p.tw){ p.tw = { x: TX, y: TY }; }
      const moved = sp.motion ? motionTick(p, sp, dt) : false;
      if (!moved){ p.x += p.vx * dt; p.y += p.vy * dt; }
      if (sp.wall && (p.wb || 0) < sp.wall && (p.x < 3 || p.x > PW - 3 || p.y < 3 || p.y > PH - 3)){
        p.wb = (p.wb || 0) + 1;
        if (p.x < 3 || p.x > PW - 3){ p.vx = -p.vx; p.x = clamp(p.x, 3, PW - 3); }
        if (p.y < 3 || p.y > PH - 3){ p.vy = -p.vy; p.y = clamp(p.y, 3, PH - 3); }
        p.ang = Math.atan2(p.vy, p.vx); p.ang0 = p.ang; p.curve = 0; p.hit.clear(); p.life = Math.max(p.life, 0.7);
        S.fx.push({ k:'pop', x: p.x, y: p.y, t:0, life:0.2 });
      }
      if (sp.obj && sp.obj.trail !== 'none') objectTrail(sp.obj, p, dt, (x, y, vx, vy, life, c, sz, k) => { if (S.parts.length < 220) S.parts.push({ x, y, vx, vy, t:0, life, c, s: sz, k }); });
      for (const m of S.pests){
        if (m.dead || p.hit.has(m.id)) continue;
        if (Math.hypot(m.px - p.x, m.py - p.y) > m.hr + (p.size || 6) * 0.5 + 2) continue;
        if (sp.explode){ explode(p.x, p.y, sp.explode, p.mul, sp); p.done = true; break; }
        p.hit.add(m.id);
        hitP(m, sp, p.mul);
        S.fx.push({ k:'pop', x: p.x, y: p.y, t:0, life:0.2 });
        if (sp.burst) explode(m.px, m.py, sp.burst, p.mul, null);
        if (sp.zap) chain(m, sp.zap, p.mul);
        if (sp.bounce && p.bounced < sp.bounce && p.pierce > 0) bounce(p, m);
        if (--p.pierce <= 0){ p.done = true; break; }
      }
      if (!p.done && (p.life <= 0 || (!sp.motion || (sp.motion !== 'orbit' && sp.motion !== 'spiralout')) && (p.x < -40 || p.x > PW + 40 || p.y < -40 || p.y > PH + 40))){
        p.done = true;
        if (sp.explode && sp.expireExplode && p.x > 0 && p.x < PW && p.y > 0 && p.y < PH) explode(p.x, p.y, sp.explode, p.mul, sp);
      }
      if (p.done && sp.split && !p.piece){
        const c = Math.min(10, sp.split.count), spd = clamp((sp.split.speed || 380) * K * 0.8, 120, 400);
        for (let k = 0; k < c; k++){
          const an = Math.random() * TAU;
          born.push({ x: p.x, y: p.y, vx: Math.cos(an) * spd, vy: Math.sin(an) * spd, spd, ang: an, spin: Math.random() * TAU, size: sp.split.size || 4, spec: sp.split, life: (sp.split.life || 0.45) * 0.9,
            curve:0, hit: new Set(), pierce: sp.split.pierce || 1, bounced:0, mul: p.mul * sp.split.count / c, piece:true });
        }
      }
    }
    S.proj = S.proj.filter(p => !p.done).concat(born);
    if (S.proj.length > 320) S.proj.splice(0, S.proj.length - 320);
    for (const L of S.lobs){ L.t += dt; if (L.t >= L.dur){ L.done = true; if (L.spec.impact) explode(L.x1, L.y1, L.spec.impact, L.mul, L.spec); } }
    S.lobs = S.lobs.filter(L => !L.done);
    /* spikes and mines on the loop */
    for (const tr of S.traps){
      tr.t += dt; tr.life -= dt;
      if (tr.life <= 0){ tr.done = true; continue; }
      if (tr.t < tr.fly) continue;
      const list = near(tr.x, tr.y, tr.r);
      if (!list.length) continue;
      if (tr.mine){ tr.done = true; explode(tr.x, tr.y, tr.spec.mine, tr.mul, tr.spec); continue; }
      for (const m of list){
        if (m.big){
          const lastHit = tr.bigHit.get(m.id);
          if (lastHit != null && S.t - lastHit < 0.2) continue;
          tr.bigHit.set(m.id, S.t); tr.flat = (tr.flat || 0) + 1;
        } else { if (tr.hit.has(m.id)) continue; tr.hit.add(m.id); }
        hitP(m, tr.spec, tr.mul);
        if (--tr.pierce <= 0 || tr.flat >= 3){ tr.done = true; break; }
      }
    }
    S.traps = S.traps.filter(tr => !tr.done);
    /* whirlwinds spin back along the loop */
    for (const w of S.whirls){
      w.t += dt;
      const step = w.spd * dt;
      w.an -= step / AVG_R; w.left -= step;
      if (w.left <= 0 || w.pierce <= 0){ w.done = true; continue; }
      [w.x, w.y] = onLoop(w.an);
      for (const m of near(w.x, w.y, w.r)){
        if (w.hit.has(m.id)) continue;
        w.hit.add(m.id);
        hitP(m, w.spec, w.mul);
        if (--w.pierce <= 0) break;
      }
    }
    S.whirls = S.whirls.filter(w => !w.done);
    for (const z of S.puddles){
      z.t += dt; z.acc += dt;
      if (z.acc < 0.1) continue;
      z.acc = 0;
      const p = z.spec;
      let boil = false;
      if (p.boil){ z.bacc += 0.1; if (z.bacc >= p.boil.tick){ z.bacc -= p.boil.tick; boil = true; } }
      for (const m of near(z.x, z.y, z.r)){
        if (boil) hurt(m, p.boil.dmg, 'heat', p.boil, 1);
        if (m.dead) continue;
        if (!m.big) slowP(m, p.slow, 0.25); else if (p.bigSlow < 1) slowP(m, p.bigSlow, 0.25);
        if (p.burn) burnP(m, p.burn, false);
      }
    }
    S.puddles = S.puddles.filter(z => z.t < z.dur);
    for (const c of S.clouds){
      c.t += dt; c.acc += dt;
      if (c.acc < 0.1) continue;
      c.acc = 0;
      for (const m of near(c.x, c.y, c.r)){ if (c.spec.slow && !m.big) slowP(m, c.spec.slow, 0.25); if (c.spec.vuln) vulnP(m, c.spec.vuln); }
    }
    S.clouds = S.clouds.filter(c => c.t < c.dur);
    for (const f of S.fx) f.t += dt;
    S.fx = S.fx.filter(f => f.t < f.life).slice(-140);
    for (const q of S.parts){ q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    S.parts = S.parts.filter(q => q.t < q.life).slice(-200);
    for (const tm of S.timers){ tm.t -= dt; if (tm.t <= 0){ tm.done = true; tm.fn(); } }
    S.timers = S.timers.filter(tm => !tm.done);
  }
  function pill(x, y, txt, col, align){
    g.font = '700 12px "Barlow Condensed", "Arial Narrow", sans-serif';
    const w = g.measureText(txt).width + 14;
    const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    g.fillStyle = 'rgba(20,28,34,0.74)';
    g.beginPath(); g.moveTo(x0 + 9, y); g.arcTo(x0 + w, y, x0 + w, y + 18, 9); g.arcTo(x0 + w, y + 18, x0, y + 18, 9); g.arcTo(x0, y + 18, x0, y, 9); g.arcTo(x0, y, x0 + w, y, 9); g.closePath(); g.fill();
    g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, x0 + 7, y + 9.5); g.textBaseline = 'alphabetic';
  }
  function crosshair(x, y){
    g.save(); g.translate(x, y);
    g.lineWidth = 3; g.strokeStyle = 'rgba(29,43,51,0.35)'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.stroke();
    g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,107,74,0.95)'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.stroke();
    g.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ g.moveTo(dx * 5, dy * 5); g.lineTo(dx * 13, dy * 13); } g.stroke();
    g.restore();
  }
  function draw(){
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#d8b386'; g.fillRect(0, 0, PW, PH);
    for (let y = 0; y < PH; y += 22){ g.fillStyle = (y / 22) % 2 ? 'rgba(80,45,10,0.06)' : 'rgba(255,240,220,0.08)'; g.fillRect(0, y, PW, 22); }
    g.beginPath(); g.ellipse(TX, TY, RX, RY, 0, 0, TAU);
    g.strokeStyle = '#1f5f4c'; g.lineWidth = 26; g.stroke();
    g.strokeStyle = '#2f7d64'; g.lineWidth = 22; g.stroke();
    g.setLineDash([4, 6]); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1; g.stroke(); g.setLineDash([]);
    const d = S.d;
    const aimed = S.list.filter(o => o.a.aim !== 'pointer');
    if (S.s && !S.s.global && (aimed.length || !S.list.length)){
      const R = Math.min(420, aimed.length ? Math.max(...aimed.map(o => reachOf(o.a))) : reachOf(null));
      g.beginPath(); g.arc(TX, TY, R, 0, TAU);
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.fill();
      g.setLineDash([5, 5]); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.2; g.stroke(); g.setLineDash([]);
    }
    for (const z of S.puddles) Art.drawPuddle(g, z, S.t);
    for (const z of S.clouds) Art.drawCloud(g, z, S.t);
    for (const tr of S.traps) Art.drawTrap(g, tr, S.t);
    for (const m of S.pests){
      if (m.dead) continue;
      g.save(); g.translate(m.px, m.py); g.scale(m.sc, m.sc);
      Art.drawPest(g, m, S.t);
      g.restore();
    }
    for (const w of S.whirls) Art.drawWhirl(g, w, S.t);
    if (d) Art.drawTower(g, { type: previewType(d), x: TX, y: TY, size: TOWERS[previewType(d)].size, s: { look: designLookAt(d, S.up, S.para) || undefined, tint: designTintAt(d, S.up, S.para) || undefined }, up: S.para ? [5, 5, 5] : S.up, paragon: S.para, degree: S.deg, aim: S.aim, aim2: S.aim,
      fireAnim: Math.max(0, S.fire), boost: S.rush > 0 ? { rush:{ mult: S.rushMul } } : {}, rank:0, id:7, skin: d.skin, tint: d.tint }, S.t, {});
    for (const L of S.lobs) Art.drawLob(g, L);
    for (const p of S.proj) Art.drawProj(g, p);
    for (const q of S.parts) Art.drawPart(g, q);
    for (const f of S.fx) Art.drawFx(g, f, S.t);
    const pointer = S.list.some(o => o.a.aim === 'pointer');
    if (pointer && S.ptr) crosshair(S.ptr.x, S.ptr.y);
    if (!d) return;
    if (S.list.length || S.log.length){
      const v = dps();
      pill(6, 6, fmtN(v >= 10 ? Math.round(v) : round2(v)) + ' damage/s', '#ffd166');
      pill(PW - 6, 6, S.kills + ' popped', '#e8f3ee', 'right');
    }
    let msg = '';
    if (!S.list.length) msg = S.para ? 'This paragon has no attacks' : !d.attacks.length ? 'No attacks: it earns money or boosts others' : 'No attacks unlocked at these tiers';
    else if (S.pests.some(m => !m.dead) && S.pests.every(m => m.dead || !sees(m))) msg = 'It can’t see ghost pests';
    else if (pointer && !S.ptr) msg = 'Point at the range to aim';
    if (msg) pill(PW / 2, PH - 24, msg, '#ffffff', 'center');
  }
  function frame(now){
    if (!cv.isConnected && S.started){ S.running = false; return; }
    if (!UI.bld){ S.running = false; return; }
    S.started = S.started || cv.isConnected;
    const dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 0.016;
    S.last = now;
    try { update(dt); draw(); } catch (err) { console.error(err); }
    requestAnimationFrame(frame);
  }
  return {
    canvas: cv,
    /* o: { up, para, deg, target } */
    setDesign(d, o){
      o = o || {};
      S.d = d;
      S.para = !!o.para && !!d.paragon;
      S.up = (o.up || [0, 0, 0]).slice();
      S.deg = o.deg || 50;
      let s = null;
      try { s = S.para ? previewStats(d, null, S.deg) : previewStats(d, S.up); } catch (err) { console.error(err); }
      S.s = s;
      const atk = s ? s.atk : {}, old = {};
      for (const e of S.list) old[e.key] = e;
      S.list = Object.keys(atk).map(key => ({ key, a: atk[key], acc: old[key] ? old[key].acc : Math.random() * 0.5, shots: old[key] ? old[key].shots : 0 }));
      S.abs = s ? s.abilities : [];
      const target = RANGE_TARGETS[o.target] ? o.target : S.target;
      if (target !== S.target || !S.pests.length){ S.target = target; spawnSet(); S.sig = ''; }
      const sig = JSON.stringify([s && s.atk, s && s.range, s && s.camo, S.para, S.target]);
      if (sig !== S.sig){
        /* leftovers from the old numbers would muddle the meter */
        if (S.sig) { S.traps = []; S.whirls = []; S.lobs = []; S.puddles = []; S.clouds = []; S.timers = []; }
        S.sig = sig; resetMeter();
      }
      if (!S.running){ S.running = true; S.last = 0; requestAnimationFrame(frame); }
    },
    /* plays every ability on the practice pests, at its strength for the shown tiers */
    tryAbilities(){
      const d = S.d; if (!d) return;
      const list = S.para && d.paragon ? d.paragon.abilities : d.abilities;
      list.forEach((B, k) => {
        const tail = (S.para ? '_pab' : '_ab') + k;
        const live = (S.abs || []).find(x => x.id.endsWith(tail));
        S.timers.push({ t: k * 0.9, fn: () => runAb(B, live ? live.power || 1 : 1) });
      });
    },
    /* whether any attack shown follows the pointer */
    usesPointer(){ return S.list.some(o => o.a.aim === 'pointer'); },
    /* for tests: the meter's numbers and what is on the range */
    meter(){ return { dps: dps(), kills: S.kills, attacks: S.list.length, pests: S.pests.length, alive: S.pests.filter(m => !m.dead).length, traps: S.traps.length, whirls: S.whirls.length, held: S.pests.filter(m => m.holdT > 0).length, proj: S.proj.length }; },
    aimAt(x, y){ S.ptr = x == null ? null : { x, y }; },
    restart(){ spawnSet(); resetMeter(); },
  };
}

function renderBuilder(){
  const B = UI.bld;
  const tabs = h('div', { class:'bld-tabs', role:'tablist', 'aria-label':'Builder sections' });
  const form = h('div', { class:'bld-form' }), side = h('aside', { class:'bld-side' });
  const status = h('span', { class:'bld-status', 'aria-live':'polite' });
  const presetSel = h('select', { 'aria-label':'Start from a preset' }, h('option', { value:'', text:'Start from a preset…' }),
    h('optgroup', { label:'Presets' }, Object.entries(PRESET_LIST).map(([k, t]) => h('option', { value:k, text:t }))),
    h('optgroup', { label:'Remix a built-in appliance' }, BASE_TOWER_ORDER.filter(t => !TOWERS[t].hero).map(t => h('option', { value:'remix:' + t, text: TOWERS[t].name }))));
  presetSel.addEventListener('change', () => {
    if (!presetSel.value) return;
    const keep = B.d.name;
    const remix = presetSel.value.startsWith('remix:') ? presetSel.value.slice(6) : null;
    B.d = remix ? remixDesign(remix) : presetDesign(presetSel.value);
    if (B.id && keep) B.d.name = keep;
    B.pvUp = [0, 0, 0]; B.pvPara = false; B.open = {};
    status.textContent = remix ? 'Started from the ' + TOWERS[remix].name + ': its look, price, range and main attack, with the real upgrade names and prices. Make it yours.' : 'Loaded the ' + PRESET_LIST[presetSel.value] + ' preset.';
    presetSel.value = '';
    remember(false);
    redraw();
  });
  const undoBtn = h('button', { class:'btn btn-small bico', title:'Undo (Ctrl+Z)', 'aria-label':'Undo', onclick: () => undo() }, '\u21b6');
  const redoBtn = h('button', { class:'btn btn-small bico', title:'Redo (Ctrl+Y)', 'aria-label':'Redo', onclick: () => redo() }, '\u21b7');
  const top = h('div', { class:'bld-top' }, presetSel,
    h('button', { class:'btn btn-small', onclick: () => { B.id = null; B.d = cleanCustom(defaultCustom()); B.path = 0; B.pvUp = [0, 0, 0]; B.pvPara = false; B.open = {}; resetHistory(); status.textContent = 'Started a new design.'; redraw(); } }, 'New design'),
    h('button', { class:'btn btn-small', title:'Roll a random appliance', onclick: () => surprise() }, '\ud83c\udfb2 Surprise me'),
    h('button', { class:'btn btn-small', onclick: () => showImport() }, 'Import code'),
    h('button', { class:'btn btn-small', title:'One code for every design, object and body you have', onclick: () => { if (!Object.keys(Profile.custom || {}).length && !objectList().length && !bodyList().length){ status.textContent = 'Nothing to export yet.'; return; } showCode(collectionCode(), 'your whole collection'); } }, 'Export all'), undoBtn, redoBtn);
  function surprise(){
    if (B.id){ B.id = null; resetHistory(); }
    B.d = randomDesign(); B.path = 0; B.pvUp = [0, 0, 0]; B.pvPara = false; B.open = {};
    remember(false);
    status.textContent = 'Rolled the ' + B.d.name + '. Roll again, change anything, or save it.';
    Sfx.play('click');
    redraw();
  }
  /* a panel for showing a share code or pasting one in */
  const impTitle = h('b', {}), impTa = codeBox({ 'aria-label':'Design code' });
  const impBtn = h('button', { class:'btn btn-small btn-primary', onclick: () => importCode() }, 'Import');
  let shown = null;
  const copyCode = () => copyText(impTa.value, impTa, ok => { status.textContent = ok ? 'Copied the code for ' + shown + '.' : copyHint(); });
  const impCopy = h('button', { class:'btn btn-small btn-gold', hidden:true, onclick: () => copyCode() }, 'Copy code');
  const impBox = h('div', { class:'bld-import', hidden:true }, h('div', { class:'bld-import-head' }, impTitle, h('button', { class:'bx', 'aria-label':'Close', onclick: () => { impBox.hidden = true; } }, '\u00d7')), impTa, h('div', { class:'bld-import-acts' }, impCopy, impBtn));
  const showImport = obj => { impBox.hidden = false; impTitle.textContent = obj ? 'Paste an object or body code (' + OBJ_PREFIX + '… or ' + BODY_PREFIX + '…)' : 'Paste a code: ' + SHARE_PREFIX + ' for a design, ' + OBJ_PREFIX + ' for an object, ' + BODY_PREFIX + ' for a body, ' + COLLECTION_PREFIX + ' for a whole collection'; impTa.readOnly = false; impTa.value = ''; impBtn.hidden = false; impCopy.hidden = true; impTa.focus(); };
  const showCode = (code, name) => {
    impBox.hidden = false; impTitle.textContent = 'Design code for ' + name + '. Anyone can paste it into their tower builder.'; impTa.readOnly = true; impTa.value = code; impBtn.hidden = true; impCopy.hidden = false;
    shown = name;
    try { impBox.scrollIntoView({ block:'nearest', behavior:'smooth' }); } catch (e) {}
    copyCode();
  };
  function importCode(){
    try {
      if (String(impTa.value).trim().startsWith(COLLECTION_PREFIX)){
        const got = importCollection(impTa.value);
        impBox.hidden = true;
        status.textContent = 'Imported ' + got.designs + (got.designs === 1 ? ' design, ' : ' designs, ') + got.objs + (got.objs === 1 ? ' object and ' : ' objects and ') + got.bodies + (got.bodies === 1 ? ' body.' : ' bodies.') + (got.skipped ? ' ' + got.skipped + ' skipped: no free slots.' : '');
        Sfx.play('upgrade');
        redraw();
        return;
      }
      if (String(impTa.value).trim().startsWith(BODY_PREFIX)){
        const b = bodyFromCode(impTa.value);
        const bid = saveBody(b);
        if (!bid) throw new Error('You already have ' + BODY_MAX + ' bodies. Delete one first.');
        impBox.hidden = true;
        status.textContent = 'Imported the body ' + b.name + '. Any design can wear it now.';
        Sfx.play('upgrade');
        B.tab = 'bodies'; B.ws = null; B.wb = null; redraw();
        return;
      }
      if (String(impTa.value).trim().startsWith(OBJ_PREFIX)){
        const o = objectFromCode(impTa.value);
        const oid = saveObject(o);
        if (!oid) throw new Error('You already have ' + OBJ_MAX + ' objects. Delete one first.');
        impBox.hidden = true;
        status.textContent = 'Imported the object ' + o.name + '. Any attack can fire it now.';
        Sfx.play('upgrade');
        B.tab = 'objects'; B.ws = null; redraw();
        return;
      }
      const d = designFromCode(impTa.value);
      const id = saveCustomTower(d);
      if (!id) throw new Error('You already have ' + CUSTOM_MAX + ' custom appliances. Delete one first.');
      B.id = id; B.d = cleanCustom(Profile.custom[id]); B.path = 0; B.pvUp = [0, 0, 0]; B.pvPara = false; resetHistory();
      impBox.hidden = true;
      status.textContent = 'Imported ' + TOWERS[id].name + '. It is now in the shop.';
      Sfx.play('upgrade');
      if (inGame){ buildShop(); updatePanel(true); }
      redraw();
    } catch (err) { Sfx.play('error'); status.textContent = err.message; }
  }
  const shell = h('div', { class:'bld' }, h('div', { class:'bld-main' }, top, impBox, tabs, form), side);
  const inGame = G.active && !G.attract && UI.screen === 'game';
  const D = () => B.d;
  /* undo and redo keep snapshots of the design; bursts of typing count as one step */
  function resetHistory(){ B.hist = []; B.fut = []; B.snap = JSON.stringify(B.d); B.typing = false; drawUndo(); }
  function remember(typing){
    const now = JSON.stringify(B.d);
    if (now === B.snap) return;
    const t = performance.now();
    if (!(typing && B.typing && t - B.lastT < 900)){ B.hist.push(B.snap); if (B.hist.length > 80) B.hist.shift(); }
    B.fut = []; B.snap = now; B.lastT = t; B.typing = !!typing;
    drawUndo();
  }
  function undo(){ if (!B.hist.length) return; B.fut.push(B.snap); B.snap = B.hist.pop(); B.d = JSON.parse(B.snap); B.typing = false; status.textContent = 'Undone.'; redraw(); drawUndo(); }
  function redo(){ if (!B.fut.length) return; B.hist.push(B.snap); B.snap = B.fut.pop(); B.d = JSON.parse(B.snap); B.typing = false; status.textContent = 'Redone.'; redraw(); drawUndo(); }
  function drawUndo(){ undoBtn.disabled = !B.hist || !B.hist.length; redoBtn.disabled = !B.fut || !B.fut.length; }
  B.undo = undo; B.redo = redo;
  if (!UI.bldKeys){
    UI.bldKeys = true;
    document.addEventListener('keydown', ev => {
      if (!UI.bld || !UI.bld.undo || !(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
      const tag = ev.target && ev.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = ev.key.toLowerCase();
      if (k === 'z' && !ev.shiftKey){ ev.preventDefault(); UI.bld.undo(); }
      else if (k === 'y' || (k === 'z' && ev.shiftKey)){ ev.preventDefault(); UI.bld.redo(); }
    });
  }
  /* structural edits re-clean the design (dropping changes that no longer fit) and redraw the form */
  const changed = structural => { if (structural){ B.d = cleanCustom(B.d); drawForm(); } remember(!structural); drawTabs(); drawSide(); };
  const redraw = () => { drawTabs(); drawForm(); drawSide(); };

  /* ---- small controls bound to a field of an object ---- */
  const field = (label, ctl, hint, wide) => h('label', { class:'bf' + (wide ? ' wide' : '') }, h('span', { class:'bl', text: label }), ctl, hint ? h('small', { text: hint }) : null);
  const num = (obj, key, lo, hi, step, structural) => {
    const i = h('input', { type:'number', min: String(lo), max: String(hi), step: String(step || 1), inputmode:'decimal' });
    i.value = String(obj[key]);
    i.addEventListener('input', () => { if (i.value === '') return; const v = Number(i.value); if (isFinite(v)){ obj[key] = v; changed(false); } });
    i.addEventListener('change', () => { let v = Number(i.value); if (i.value === '' || !isFinite(v)) v = Number(obj[key]) || lo; v = Math.min(hi, Math.max(lo, v)); obj[key] = v; i.value = String(v); changed(!!structural); });
    return i;
  };
  const pick = (obj, key, opts, onPick) => {
    const s = h('select', {}, (Array.isArray(opts) ? opts : Object.entries(opts)).map(([v, t]) => h('option', { value: String(v), text: t })));
    s.value = String(obj[key]);
    s.addEventListener('change', () => { if (onPick) onPick(s.value); else { obj[key] = s.value; changed(true); } });
    return s;
  };
  const tick = (obj, key, label, structural) => {
    const c = h('input', { type:'checkbox' }); c.checked = !!obj[key];
    c.addEventListener('change', () => { obj[key] = c.checked; changed(!!structural); });
    return h('label', { class:'bchk' }, c, h('span', { text: label }));
  };
  const text = (obj, key, max, ph, label) => {
    const i = h('input', { type:'text', maxlength: String(max), placeholder: ph || '', 'aria-label': label || ph || key }); i.value = obj[key] || '';
    i.addEventListener('input', () => { obj[key] = i.value; changed(false); });
    return i;
  };
  const sec = (title, kids, cls) => h('section', { class:'bsec' + (cls ? ' ' + cls : '') }, title ? h('h4', { text: title }) : null, h('div', { class:'bgrid' }, kids));
  const goTag = (el, key) => { el.dataset.go = key; return el; };
  const tool = (label, title, fn) => h('button', { class:'btn btn-small btool', title, onclick: fn }, label);
  const xBtn = (label, fn) => h('button', { class:'bx', 'aria-label': label, title: label, onclick: fn }, '×');
  const addBtn = (label, fn) => h('button', { class:'btn btn-small badd', onclick: fn }, '+ ' + label);

  const colorIn = (obj, key, label) => {
    const c = h('input', { type:'color', 'aria-label': label || 'Colour' });
    c.value = /^#[0-9a-f]{6}$/i.test(obj[key] || '') ? obj[key] : '#ff7a59';
    c.addEventListener('input', () => { obj[key] = c.value; changed(false); });
    return c;
  };
  function drawTabs(){
    const d = D();
    tabs.innerHTML = '';
    for (const [k, t] of [['basics', 'Basics'], ['attacks', 'Attacks · ' + d.attacks.length], ['abilities', 'Abilities · ' + d.abilities.length], ['upgrades', 'Upgrades'], ['paragon', d.paragon ? 'Paragon ✓' : 'Paragon'], ['objects', 'Objects · ' + objectList().length], ['bodies', 'Bodies · ' + bodyList().length]]){
      tabs.append(h('button', { role:'tab', 'aria-selected': String(B.tab === k && !B.ws && !B.wb), onclick: () => { const was = B.tab; B.tab = k; B.ws = null; B.wb = null; drawTabs(); drawForm(); if ((was === 'paragon') !== (k === 'paragon')) drawSide(); form.scrollIntoView({ block:'nearest' }); } }, t));
    }
  }
  const WS = { get status(){ return status; }, field, num, pick, tick, text, colorIn, changed, redraw: () => redraw(), tool, xBtn, addBtn, sec, showCode: (code, name) => showCode(code, name), showImportObj: () => showImport(true) };
  function drawForm(){
    form.innerHTML = '';
    if (B.ws){ drawObjectEditor(B, form, WS); return; }
    if (B.wb){ drawBodyEditor(B, form, WS); return; }
    ({ basics: drawBasics, attacks: drawAttacks, abilities: drawAbilities, upgrades: drawUpgrades, paragon: drawParagon, objects: () => drawObjectsTab(B, form, WS), bodies: () => drawBodiesTab(B, form, WS) })[B.tab]();
  }
  const supportFields = o => [
    field('Cash per round', num(o, 'income', 0, 1e8, 5), '0 for none.'),
    field('Nearby attack speed + %', num(o, 'bSpeed', 0, 300, 1)),
    field('Nearby range + %', num(o, 'bRange', 0, 200, 1)),
    field('Nearby + damage', num(o, 'bDmg', 0, 1000, 1)),
    field('Nearby + pests hit', num(o, 'bPierce', 0, 1000, 1)),
    field('Discount nearby %', num(o, 'bDisc', 0, 60, 1)),
    h('div', { class:'bchecks' }, tick(o, 'bCamo', 'Nearby appliances see ghost pests')),
  ];

  /* ---- Basics ---- */
  function drawBasics(){
    const d = D();
    const looks = {}; for (const t of BASE_TOWER_ORDER) looks[t] = TOWERS[t].name;
    const skins = {}; for (const s of SKINS) skins[s.id] = s.name;
    form.append(sec('Look and price', [
      goTag(field('Name', text(d, 'name', 24, 'My Appliance', 'Name')), 'name'),
      field('Body', (() => {
        const opts = [['', 'A built-in appliance (pick below)']].concat(bodyList().map(id => [id, bodyById(id).name]), [['__new', '+ Model a new body…']]);
        return pick({ body: d.body }, 'body', opts, v => {
          if (v === '__new'){ if (bodyList().length >= BODY_MAX){ status.textContent = 'No free body slots: delete one in the Bodies tab first.'; drawForm(); return; } B.wb = { id: null, b: Object.assign(cleanBody(defaultBody()), { _rev: Date.now() }), back: { tab: B.tab, d } }; drawTabs(); drawForm(); return; }
          d.body = v; changed(true);
        });
      })(), d.body ? 'Your own model from the Bodies tab. Its footprint sets the appliance’s size.' : 'Model your own in the Bodies tab, or wear a built-in appliance’s look.'),
      d.body && bodyById(d.body) ? h('div', { class:'bf' }, h('span', { class:'bl', text:'Model' }), h('div', { class:'ws-inline' }, bodyIcon(d.body, bodyById(d.body), 44), h('button', { class:'btn btn-small', onclick: () => { B.wb = { id: d.body, b: Object.assign(cleanBody(bodyById(d.body)), { _rev: Date.now() }), back: { tab: B.tab, d } }; drawTabs(); drawForm(); } }, 'Edit body'))) : null,
      d.body ? null : field('Looks like', pick(d, 'look', looks, v => { d.look = v; changed(false); })),
      field('Skin', pick(d, 'skin', skins, v => { d.skin = v; changed(false); }), d.tint ? 'Its effects still show with your own colour.' : null),
      field('Faction', pick(d, 'faction', FACTION_ORDER.map(f => [f, FACTIONS[f].name]), v => { d.faction = v; changed(false); }), 'Where it sorts in the shop and on the mastery pages.'),
      field('Body colour', pick({ m: d.tint ? 'own' : 'skin' }, 'm', { skin:'From the skin', own:'My own colour' }, v => { d.tint = v === 'own' ? (d.tint || '#5aa6d6') : ''; changed(true); })),
      d.tint ? field('Colour', colorIn(d, 'tint', 'Body colour')) : null,
      goTag(field('Price', num(d, 'cost', 25, 1e6, 5)), 'cost'),
    ].filter(Boolean)));
    const reach = [];
    if (!d.global) reach.push(field('Range', num(d, 'range', 40, 700, 1), 'A Knife Block reaches 140.'));
    reach.push(h('div', { class:'bchecks' }, tick(d, 'global', 'Reaches the whole map', true), goTag(tick(d, 'camo', 'Sees ghost pests'), 'camo')));
    form.append(sec('Reach', reach));
    form.append(sec('Where it goes', [
      field('Placed on', pick(d, 'place', d.fly !== 'none' ? { land:'Dry land (a pad)' } : { land:'Dry land', water:'Water only (sinks, spills, puddles)' }, v => { d.place = v; changed(true); }),
        d.place === 'water' ? 'Like the Gravy Boat: only on the water each kitchen has.' : null),
      field('Movement', pick(d, 'fly', { none:'Stays where it is placed', copter:'Flies like a copter', saucer:'Flies like a saucer' }, v => { d.fly = v; if (v !== 'none') d.place = 'land'; changed(true); }),
        d.fly === 'copter' ? 'Takes off from a pad and attacks from where it flies: it follows your pointer, patrols, hovers or hunts (pick in its panel).' : d.fly === 'saucer' ? 'Takes off from a pad and attacks while it loops: a circle, a figure eight or a wide loop (pick in its panel).' : null),
    ]));
    form.append(sec('Money and support', supportFields(d), 'support'));
  }

  /* ---- one attack, used by the Attacks tab and the paragon ---- */
  function specialsSummary(A){
    const s = [];
    if (A.obj) s.push(objectById(A.obj) ? objectById(A.obj).name : 'missing object');
    else if (A.shape) s.push(SHAPES[A.shape]);
    if (A.motion && A.motion !== 'straight') s.push(MOTIONS[A.motion].name.toLowerCase());
    if (A.wall) s.push(A.wall + ' wall bounce' + (A.wall === 1 ? '' : 's'));
    if (A.pattern && A.pattern !== 'aim') s.push(PATTERNS[A.pattern].split(' ')[0]);
    if (A.inacc) s.push(A.inacc + '° spread');
    if (A.lifePct !== 100) s.push('flies ' + A.lifePct + '%');
    if (A.sizePct !== 100) s.push('size ' + A.sizePct + '%');
    if (A.bounce) s.push(A.bounce + ' bounce' + (A.bounce === 1 ? '' : 's'));
    if (A.chainN) s.push('chain ' + A.chainN);
    if (A.splitN) s.push('splits ' + A.splitN);
    if (A.critEvery) s.push('crit ' + A.critMul + '×');
    if (A.zone && A.zone !== 'none') s.push(ZONES[A.zone].split(' (')[0].toLowerCase());
    if (A.allTypes) s.push('hits every type');
    if (A.decamo) s.push('strips ghosts');
    return s.join(', ');
  }
  function moreOptions(A, key){
    const st = A.style, kids = [];
    if (can.shape(st)){
      const looks = [['', 'Food (chosen above)']].concat(Object.entries(SHAPES).map(([k, v]) => [k, 'Shape: ' + v]), objectList().map(id => ['obj:' + id, 'Object: ' + objectById(id).name]), [['__new', '✦ Design a new object…']]);
      const cur = A.obj ? 'obj:' + A.obj : A.shape;
      const lookSel = h('select', {}, looks.map(([v, t]) => h('option', { value: v, text: t }))); lookSel.value = cur;
      lookSel.addEventListener('change', () => {
        const v = lookSel.value;
        if (v === '__new'){ if (objectList().length >= OBJ_MAX){ status.textContent = 'No free object slots: delete one in the Objects tab first.'; lookSel.value = cur; return; } B.ws = { id: null, o: cleanObject(defaultObject()), back: { tab: B.tab, A } }; drawTabs(); drawForm(); return; }
        if (v.startsWith('obj:')){ A.obj = v.slice(4); A.shape = ''; } else { A.obj = ''; A.shape = v; }
        changed(true);
      });
      kids.push(field('Projectile look', lookSel, A.obj ? 'A Workshop object: its own size, glow and trail.' : null));
      if (A.obj && objectById(A.obj)) kids.push(h('div', { class:'bf' }, h('span', { class:'bl', text:'Object' }), h('div', { class:'ws-inline' }, objectIcon(objectById(A.obj), 40), h('button', { class:'btn btn-small', onclick: () => { B.ws = { id: A.obj, o: cleanObject(objectById(A.obj)), back: { tab: B.tab, A } }; drawTabs(); drawForm(); } }, 'Edit object'))));
    }
    kids.push(field(can.shape(st) && !A.shape ? 'Colour (sparks and chains)' : 'Colour', colorIn(A, 'color')));
    if (A.shape) kids.push(field('Shape size', num(A, 'psize', 4, 30, 1)));
    if (can.motion(st)){
      kids.push(field('Flight path', pick(A, 'motion', Object.fromEntries(Object.entries(MOTIONS).map(([k, m]) => [k, m.name])), v => { A.motion = v; changed(true); }), MOTIONS[A.motion].desc + (A.motion === 'orbit' || A.motion === 'spiralout' || A.motion === 'brake' ? ' Lasts 3× as long.' : '')));
      if (A.motion === 'wave' || A.motion === 'zigzag') kids.push(field('Swing (degrees)', num(A, 'amp', 5, 90, 5)));
      if (A.motion === 'orbit') kids.push(field('Orbit radius', num(A, 'orbitR', 20, 300, 5)));
    }
    if (can.wall(st)) kids.push(field('Bounces off kitchen walls', num(A, 'wall', 0, 6, 1), 'Comes back off the edge of the kitchen and can hit the same pests again.'));
    const looks = [];
    if (A.shape) looks.push(tick(A, 'glow', 'Glow'));
    if (A.shape && can.trail(st)) looks.push(tick(A, 'trail', 'Trail'));
    if (looks.length) kids.push(h('div', { class:'bchecks' }, looks));
    if (can.pattern(st)) kids.push(field('Firing pattern', pick(A, 'pattern', PATTERNS, v => { A.pattern = v; changed(true); }), A.pattern === 'stream' ? 'Shots leave one after another, like a burst.' : 'Ring and scatter use the projectile count.'));
    if (can.speed(st)) kids.push(field(st === 'boomer' ? 'Boomerang speed %' : 'Projectile speed %', num(A, 'speedPct', 30, 300, 5)));
    if (can.inacc(st)) kids.push(field('Inaccuracy (degrees)', num(A, 'inacc', 0, 60, 1), 'Random spread on every shot. 0 is dead on.'));
    if (can.life(st)) kids.push(field('Flies % as far', num(A, 'lifePct', 30, 300, 5)));
    if (can.size(st) && !A.shape) kids.push(field(st === 'spikes' ? 'Pile size %' : 'Shot size %', num(A, 'sizePct', 50, 300, 5), st === 'spikes' ? 'Bigger piles catch pests more easily.' : 'Bigger shots hit pests more easily.'));
    if (can.bounce(st)) kids.push(field('Bounces', num(A, 'bounce', 0, 10, 1), 'Jumps to the next pest after a hit.'));
    if (can.chain(st)){ kids.push(field('Chain lightning jumps', num(A, 'chainN', 0, 10, 1))); kids.push(field('Chain damage %', num(A, 'chainPct', 10, 300, 5))); }
    if (can.split(st)){ kids.push(field('Splits into pieces', num(A, 'splitN', 0, 12, 1), 'When it stops or bursts.')); kids.push(field('Piece damage %', num(A, 'splitPct', 10, 300, 5))); }
    if (can.crit(st)){ kids.push(field('Critical hit every N attacks', num(A, 'critEvery', 0, 20, 1), '0 for none.')); kids.push(field('Critical damage ×', num(A, 'critMul', 2, 50, 1))); }
    if (can.zone(st)){
      kids.push(field('Leaves behind', pick(A, 'zone', ZONES)));
      if (A.zone !== 'none'){ kids.push(field('Puddle size', num(A, 'zoneR', 15, 150, 1))); kids.push(field('Lasts (seconds)', num(A, 'zoneDur', 1, 20, 0.5))); }
    }
    kids.push(h('div', { class:'bchecks wide' }, tick(A, 'allTypes', 'Hits every pest type (ignores immunity)'), tick(A, 'decamo', 'Strips ghost cloaks off pests it hits')));
    const sum = specialsSummary(A);
    const det = h('details', { class:'bmore wide' }, h('summary', {}, 'Look and special moves', sum ? h('span', { text: sum }) : null), h('div', { class:'bgrid' }, kids));
    B.open = B.open || {};
    if (B.open[key]) det.open = true;
    det.addEventListener('toggle', () => { B.open[key] = det.open; });
    return det;
  }
  function attackCard(list, i, para){
    const d = D(), A = list[i];
    const styles = {}; for (const k in CUSTOM_STYLES) styles[k] = CUSTOM_STYLES[k].name;
    const types = {}; for (const k in TYPE_LABEL) types[k] = TYPE_LABEL[k];
    const effects = {}; for (const k in CUSTOM_EFFECTS) effects[k] = CUSTOM_EFFECTS[k].name;
    const st = A.style, mine = st === 'spikes' && A.mine, bubble = st === 'grab' && A.sprite === 'bubble';
    const kids = [field('Type', pick(A, 'style', styles, v => {
      /* a new type starts from its own numbers; the name, damage, look, effect and lock carry over */
      const keep = { name: A.name, dmg: A.dmg, color: A.color, effect: A.effect, effPow: A.effPow, locked: A.locked, big: A.big, allTypes: A.allTypes, decamo: A.decamo };
      if (can.shape(v)) Object.assign(keep, { shape: A.shape, psize: A.psize, glow: A.glow, trail: A.trail });
      list[i] = cleanAttack(Object.assign(defaultAttack(v), keep));
      status.textContent = 'Switched to ' + CUSTOM_STYLES[v].name + ' with its usual numbers.';
      changed(true);
    }), CUSTOM_STYLES[st].desc)];
    const spriteLabel = { lob:'Shell', spikes:'Spikes', grab:'Grabs with', boomer:'Boomerang' }[st] || 'Projectile';
    if (CUSTOM_SPRITES[st] && !A.shape && !mine) kids.push(field(spriteLabel, pick(A, 'sprite', CUSTOM_SPRITES[st], v => { A.sprite = v; changed(st === 'grab'); })));
    kids.push(field(bubble ? 'Damage (pops for double)' : mine ? 'Mine damage' : 'Damage', num(A, 'dmg', 0, 1e7, 1)));
    kids.push(field('Attacks per second', num(A, 'aps', 0.1, 60, 0.1)));
    if (st !== 'snipe' && st !== 'grab'){
      const pl = blastStyle(st) ? 'Pests hit per blast' : mine ? 'Pests hit per mine blast' : st === 'spikes' ? 'Pests hit per pile' : st === 'whirl' ? 'Pests hit per whirlwind' : st === 'gatling' ? 'Pests hit per shot' : st === 'boomer' ? 'Pests hit per boomerang' : 'Pests hit per attack';
      kids.push(field(pl, num(A, 'pierce', 1, 5000, 1)));
    }
    if (can.count(st)){
      const cl = { snipe:'Targets per shot', lob:'Shells per attack', spikes: mine ? 'Mines per attack' : 'Piles per attack', whirl:'Whirlwinds per attack', grab:'Pests per grab', boomer:'Boomerangs per attack',
        gatling: A.pattern === 'stream' ? 'Shots per burst' : 'Shots per attack' }[st] || 'Projectiles per attack';
      kids.push(field(cl, num(A, 'count', 1, 12, 1)));
    }
    if (blastStyle(st) || mine) kids.push(field('Blast radius', num(A, 'splash', 10, 250, 1)));
    if (st === 'whirl') kids.push(field('Whirlwind size', num(A, 'splash', 10, 120, 1)));
    kids.push(field('Damage type', pick(A, 'type', types, v => { A.type = v; changed(false); })));
    kids.push(field('+ Damage to vehicles', num(A, 'big', 0, 1e7, 1)));
    kids.push(field('Range (% of appliance)', num(A, 'rangePct', 20, 400, 5)));
    if (can.aim(st)) kids.push(field('Aims at', pick(A, 'aim', aimsFor(st), v => { A.aim = v; changed(true); }),
      A.aim === 'pointer' ? 'Move your mouse over the kitchen, or tap it, to aim. During skips it aims by itself.' : A.aim === 'auto' ? 'Uses the First, Last, Close or Strong buttons on the appliance.' : null));
    if (st === 'spikes') kids.push(field('Lasts (seconds)', num(A, 'life', 2, 60, 0.5)));
    if (st === 'whirl'){ kids.push(field('Travels (distance)', num(A, 'dist', 60, 1200, 5))); kids.push(field('Pushes pests back', num(A, 'push', 0, 300, 1), 'How far each pest is blown back.')); }
    if (st === 'grab') kids.push(field(bubble ? 'Bubble lasts (seconds)' : 'Holds for (seconds)', num(A, 'hold', 0.2, 10, 0.1)));
    kids.push(field('Effect on hit', pick(A, 'effect', effects)));
    if (A.effect !== 'none' && A.effect !== 'strip') kids.push(field('Effect strength (1 to 5)', num(A, 'effPow', 1, 5, 1)));
    const checks = [];
    if (can.homing(st)) checks.push(tick(A, 'homing', 'Projectiles home in'));
    if (st === 'spikes') checks.push(tick(A, 'mine', 'Mines that blow up when stepped on', true));
    if (st === 'grab') checks.push(tick(A, 'bigs', 'Can grab vehicles (for half as long)'));
    if (!para) checks.push(tick(A, 'locked', 'Locked until an upgrade unlocks it', true));
    if (checks.length) kids.push(h('div', { class:'bchecks' }, checks));
    if (!para && A.locked){
      const where = [];
      d.paths.forEach((P, p) => P.tiers.forEach((T, t) => { if (T.mods.some(m => m.k === 'unlock' && m.a === i)) where.push([p, t]); }));
      kids.push(h('p', { class:'bnote wide' + (where.length ? '' : ' warn') }, where.length ? 'Unlocked at ' + where.map(([p, t]) => 'path ' + (p + 1) + ' tier ' + (t + 1)).join(', ') + '. ' : 'No upgrade unlocks this attack yet. Add an “Unlocks a locked attack” change in the Upgrades tab.',
        where.length ? tool('Test it', 'Show the appliance at that tier in the test range', () => testTier(where[0][0], where[0][1])) : null));
    }
    kids.push(moreOptions(A, (para ? 'p' : 'a') + i));
    const label = (para ? 'Paragon attack ' : 'Attack ') + (i + 1), nm = A.name || CUSTOM_STYLES[A.style].name;
    const move = j => {
      if (para) [list[i], list[j]] = [list[j], list[i]]; else swapAttacks(d, i, j);
      const o = B.open || {}, ka = (para ? 'p' : 'a') + i, kb = (para ? 'p' : 'a') + j; [o[ka], o[kb]] = [o[kb], o[ka]];
      status.textContent = 'Moved ' + nm + (j < i ? ' up.' : ' down.'); changed(true);
    };
    const foot = h('div', { class:'bcard-foot' },
      i > 0 ? tool('\u2191 Up', 'Move this attack up', () => move(i - 1)) : null,
      i < list.length - 1 ? tool('\u2193 Down', 'Move this attack down', () => move(i + 1)) : null,
      list.length < MAX_ATTACKS ? tool('Duplicate', 'Add a copy of this attack', () => {
        if (para){ const c = JSON.parse(JSON.stringify(A)); c.name = copyName(c.name, 20); list.splice(i + 1, 0, c); } else copyAttackAt(d, i);
        status.textContent = 'Added a copy of ' + nm + '.'; changed(true);
      }) : null,
      !para && d.paragon && d.paragon.attacks.length < MAX_ATTACKS ? tool('Copy to paragon', 'Add this attack to the paragon with paragon-strength numbers', () => {
        d.paragon.attacks.push(cleanAttack(paragonAttackFrom(A)));
        status.textContent = 'Copied ' + nm + ' into the paragon at 20× damage, 2× speed and 5× pests hit.'; changed(true);
      }) : null);
    return h('section', { class:'bsec bcard' + (para ? ' bpar' : ''), 'data-go': (para ? 'patk-' : 'atk-') + i },
      h('div', { class:'bcard-head' }, h('b', { text: para ? 'Attack ' + (i + 1) : label }), text(A, 'name', 20, CUSTOM_STYLES[A.style].name, label + ' name'),
        xBtn('Remove ' + label.toLowerCase(), () => { list.splice(i, 1); if (!para) remapAfterRemove(d, 'attack', i); changed(true); })),
      h('div', { class:'bgrid' }, kids), foot.children.length ? foot : null);
  }
  function abilityCard(list, k, para){
    const d = D(), Bd = list[k];
    const holder = { u: Bd.unlock ? Bd.unlock.p + ':' + Bd.unlock.t : 'start', tpl:'' };
    const rows = h('div', { class:'bacts' });
    Bd.actions.forEach((a, j) => {
      const kinds = {}; for (const x in AB_ACTIONS) kinds[x] = AB_ACTIONS[x].name;
      const kindSel = pick(a, 'k', kinds, v => { const old = a.area; Bd.actions[j] = cleanAction({ k: v, area: old }); changed(true); });
      kindSel.setAttribute('aria-label', 'Effect ' + (j + 1));
      const parts = [];
      for (const f of AB_ACTIONS[a.k].fields){
        if (f === 'area') parts.push(field('Where', pick(a, 'area', AB_AREAS, v => { a.area = v; changed(false); })));
        else if (f === 'who') parts.push(field('Who', pick(a, 'who', AB_WHO, v => { a.who = v; changed(false); })));
        else { const F = AB_FIELDS[f]; parts.push(field(F[0], num(a, f, F[1], F[2], F[3]))); }
      }
      rows.append(h('div', { class:'bact' }, h('div', { class:'bact-k' }, kindSel), h('div', { class:'bact-f' }, parts),
        Bd.actions.length > 1 ? xBtn('Remove effect', () => { Bd.actions.splice(j, 1); changed(true); }) : null));
    });
    const tpls = [['', 'Fill from a template…']].concat(Object.entries(ABILITY_TEMPLATES).map(([x, T]) => [x, T.name]));
    const kids = [field('Cooldown (seconds)', num(Bd, 'cd', 3, 600, 1))];
    if (!para){
      const unlocks = [['start', 'From the start']];
      for (let p = 0; p < 3; p++) for (let t = 0; t < 5; t++) unlocks.push([p + ':' + t, 'Path ' + (p + 1) + ', tier ' + (t + 1) + ' (' + d.paths[p].tiers[t].name + ')']);
      kids.push(field('Comes with', pick(holder, 'u', unlocks, v => { Bd.unlock = v === 'start' ? null : { p: +v.split(':')[0], t: +v.split(':')[1] }; changed(false); })));
    }
    kids.push(field('Template', pick(holder, 'tpl', tpls, v => { if (!v) return; list[k] = cleanAbility(Object.assign(JSON.parse(JSON.stringify(ABILITY_TEMPLATES[v])), { unlock: para ? null : Bd.unlock })); changed(true); })));
    kids.push(h('div', { class:'wide' }, h('span', { class:'bl', text:'Effects' }), rows, Bd.actions.length < MAX_ACTIONS ? addBtn('Add effect', () => { Bd.actions.push(cleanAction({ k: 'slow', area: 'range', slowp: 50, dur: 3 })); changed(true); }) : null));
    const label = (para ? 'Paragon ability ' : 'Ability ') + (k + 1);
    const move = j => { if (para) [list[k], list[j]] = [list[j], list[k]]; else swapAbilities(d, k, j); status.textContent = 'Moved ' + Bd.name + (j < k ? ' up.' : ' down.'); changed(true); };
    const foot = h('div', { class:'bcard-foot' },
      k > 0 ? tool('\u2191 Up', 'Move this ability up', () => move(k - 1)) : null,
      k < list.length - 1 ? tool('\u2193 Down', 'Move this ability down', () => move(k + 1)) : null,
      list.length < MAX_ABILITIES ? tool('Duplicate', 'Add a copy of this ability', () => {
        if (para){ const c = JSON.parse(JSON.stringify(Bd)); c.name = copyName(c.name, 24); list.splice(k + 1, 0, c); } else copyAbilityAt(d, k);
        status.textContent = 'Added a copy of ' + Bd.name + '.'; changed(true);
      }) : null,
      !para && d.paragon && d.paragon.abilities.length < MAX_ABILITIES ? tool('Copy to paragon', 'Give the paragon this ability, recharging faster', () => {
        d.paragon.abilities.push(cleanAbility(Object.assign(JSON.parse(JSON.stringify(Bd)), { unlock:null, cd: Math.max(3, Math.round(Bd.cd * 0.7)) })));
        status.textContent = 'Copied ' + Bd.name + ' into the paragon.'; changed(true);
      }) : null);
    return h('section', { class:'bsec bcard' + (para ? ' bpar' : ''), 'data-go': (para ? 'pab-' : 'ab-') + k },
      h('div', { class:'bcard-head' }, h('b', { text: para ? 'Ability ' + (k + 1) : label }), text(Bd, 'name', 24, 'Special Move', label + ' name'),
        xBtn('Remove ' + label.toLowerCase(), () => { list.splice(k, 1); if (!para) remapAfterRemove(d, 'ability', k); changed(true); })),
      h('div', { class:'bgrid' }, kids), foot.children.length ? foot : null);
  }

  /* ---- Attacks ---- */
  function drawAttacks(){
    const d = D();
    form.append(h('p', { class:'bnote', text:'Up to ' + MAX_ATTACKS + ' attacks, each with its own type, numbers and effect. Open “Look and special moves” for custom shapes and colours, firing patterns, bounces, chain lightning, splitting, critical hits and puddles. Lock an attack to make an upgrade unlock it later.' }));
    d.attacks.forEach((A, i) => form.append(attackCard(d.attacks, i, false)));
    if (d.attacks.length < MAX_ATTACKS) form.append(addBtn('Add attack', () => { d.attacks.push(defaultAttack(d.attacks.length ? 'pulse' : 'throw')); changed(true); }));
  }

  /* ---- Abilities ---- */
  function drawAbilities(){
    const d = D();
    form.append(h('p', { class:'bnote', text:'Abilities appear in the ability bar once the appliance has them. Each one runs up to ' + MAX_ACTIONS + ' effects. Upgrades can make them stronger or recharge faster.' }));
    d.abilities.forEach((Bd, k) => form.append(abilityCard(d.abilities, k, false)));
    if (d.abilities.length < MAX_ABILITIES) form.append(addBtn('Add ability', () => { d.abilities.push(defaultAbility()); changed(true); }));
  }

  /* ---- Paragon ---- */
  function drawParagon(){
    const d = D();
    const about = 'A paragon is the ultimate form of an appliance. Once you own a tier 5 on each of its three paths, you can merge every copy into one paragon. Its degree (1 to 100) comes from how much you spent and how much damage they did; at degree 100 it deals 3× damage, attacks and pierces 2× and its abilities are twice as strong. The numbers below are for degree 1.';
    if (!d.paragon){
      form.append(h('p', { class:'bnote', text: about }));
      form.append(addBtn('Add a paragon', () => { d.paragon = defaultParagon(cleanCustom(d)); status.textContent = 'Added a paragon, started from the appliance’s own attacks.'; changed(true); }));
      return;
    }
    const P = d.paragon;
    form.append(h('p', { class:'bnote', text: about }));
    const auto = describeParagon(Object.assign(cleanParagon(P, cleanCustom(d)), { desc:'' }));
    const kids = [field('Name', text(P, 'name', 24, 'Paragon name', 'Paragon name')), field('Price', num(P, 'cost', 1000, 1e8, 5))];
    if (!P.global) kids.push(field('Range', num(P, 'range', 40, 700, 1)));
    kids.push(h('div', { class:'bchecks' }, tick(P, 'global', 'Reaches the whole map', true), tick(P, 'camo', 'Sees ghost pests')));
    kids.push(field('Description (optional)', text(P, 'desc', 200, auto, 'Paragon description'), P.desc ? null : 'Shown in game: ' + auto, true));
    kids.push(field('Paragon look', pick({ look: P.look || '' }, 'look', [['', 'Same as the appliance (bigger, gold-trimmed)']].concat(lookChoices(), [['__new', '+ Model a new body…']]), v => {
      if (v === '__new'){ if (bodyList().length >= BODY_MAX){ status.textContent = 'No free body slots: delete one in the Bodies tab first.'; drawForm(); return; } B.wb = { id: null, b: Object.assign(cleanBody(defaultBody()), { _rev: Date.now() }), back: { tab: B.tab, m: P } }; drawTabs(); drawForm(); return; }
      P.look = v; changed(true);
    }), 'A paragon can wear a body of its own.'));
    kids.push(field('Paragon colour', pick({ m: P.tint ? 'own' : 'same' }, 'm', { same:'Same as the appliance', own:'Its own colour' }, v => { P.tint = v === 'own' ? (P.tint || '#f2c14e') : ''; changed(true); })));
    if (P.tint) kids.push(field('Colour', colorIn(P, 'tint', 'Paragon body colour')));
    form.append(sec('Paragon', kids, 'bpar'));
    form.append(h('h4', { class:'bsub', text:'Paragon attacks' }));
    P.attacks.forEach((A, i) => form.append(attackCard(P.attacks, i, true)));
    if (P.attacks.length < MAX_ATTACKS) form.append(addBtn('Add paragon attack', () => { P.attacks.push(defaultAttack('throw')); changed(true); }));
    form.append(h('h4', { class:'bsub', text:'Paragon abilities' }));
    P.abilities.forEach((Bd, k) => form.append(abilityCard(P.abilities, k, true)));
    if (P.abilities.length < MAX_ABILITIES) form.append(addBtn('Add paragon ability', () => { P.abilities.push(cleanAbility(Object.assign(defaultAbility(), { unlock: null }))); changed(true); }));
    form.append(sec('Paragon money and support', supportFields(P), 'support'));
    const armed = B.parArm;
    form.append(h('div', { class:'bpar-foot' },
      h('button', { class:'btn btn-small', onclick: () => { const keep = { name: P.name, cost: P.cost, desc: P.desc }; d.paragon = Object.assign(defaultParagon(cleanCustom(Object.assign({}, d, { paragon: null }))), keep); status.textContent = 'Rebuilt the paragon from the appliance’s attacks and abilities.'; changed(true); } }, 'Rebuild from the appliance'),
      h('button', { class:'btn btn-small sell' + (armed ? ' armed' : ''), onclick: () => { if (!armed){ B.parArm = true; drawForm(); setTimeout(() => { B.parArm = false; }, 4000); return; } B.parArm = false; d.paragon = null; status.textContent = 'Removed the paragon.'; changed(true); } }, armed ? 'Confirm: remove paragon' : 'Remove paragon')));
  }

  /* ---- Upgrades ---- */
  function drawUpgrades(){
    const d = D(), p = B.path, P = d.paths[p];
    const chooser = h('div', { class:'bpaths-tabs', role:'tablist', 'aria-label':'Upgrade paths' });
    d.paths.forEach((x, i) => chooser.append(h('button', { role:'tab', 'aria-selected': String(i === p), style: '--pc:' + PATH_COLORS[i], onclick: () => { B.path = i; drawForm(); } }, h('i'), 'Path ' + (i + 1) + (x.name ? ': ' + x.name : ''))));
    form.append(chooser);
    const tplHolder = { k: '' };
    const tpls = [['', 'Fill all 5 tiers from a template…']].concat(templatesFor(cleanCustom(d)).map(k => [k, PATH_TEMPLATES[k].name]));
    const movePath = q => {
      swapPaths(d, p, q);
      if (B.pvUp){ const u = B.pvUp.slice(); [u[p], u[q]] = [u[q], u[p]]; B.pvUp = u; }
      B.path = q;
      status.textContent = 'Moved ' + (d.paths[q].name || 'the path') + ' to path ' + (q + 1) + '.';
      changed(true);
    };
    form.append(sec('', [
      field('Path name', text(P, 'name', 20, 'Path ' + (p + 1), 'Path ' + (p + 1) + ' name')),
      field('Template', pick(tplHolder, 'k', tpls, v => { if (!v) return; d.paths[p] = Object.assign(templatePath(cleanCustom(d), v), { name: P.name || PATH_TEMPLATES[v].short }); status.textContent = 'Filled path ' + (p + 1) + ' from the ' + PATH_TEMPLATES[v].name + ' template.'; changed(true); }), 'Replaces the names, prices and changes of all five tiers.', true),
      h('div', { class:'bpath-move wide' },
        p > 0 ? tool('\u2190 Swap with path ' + p, 'Swap places with path ' + p, () => movePath(p - 1)) : null,
        p < 2 ? tool('Swap with path ' + (p + 2) + ' \u2192', 'Swap places with path ' + (p + 2), () => movePath(p + 1)) : null),
    ], 'path-' + p));
    const kinds = modKindsFor(d);
    P.tiers.forEach((T, t) => {
      const rows = h('div', { class:'bmods' });
      T.mods.forEach((m, j) => {
        const K = MOD_KINDS[m.k];
        const opts = h('select', { 'aria-label':'Change' });
        const groups = {};
        for (const k of kinds.includes(m.k) ? kinds : kinds.concat(m.k)){ const g = MOD_KINDS[k].group; (groups[g] = groups[g] || h('optgroup', { label: g })).append(h('option', { value:k, text: MOD_KINDS[k].name })); }
        for (const g in groups) opts.append(groups[g]);
        opts.value = m.k;
        opts.addEventListener('change', () => { T.mods[j] = newMod(d, opts.value); changed(true); });
        const parts = [opts];
        if (K.atk){
          const targets = modTargets(d, m.k);
          parts.push(pick(m, 'a', targets, v => { m.a = +v; if (m.k === 'sprite'){ const a = d.attacks[m.a]; const pool = a ? UPGRADE_SPRITES[a.style] : ALL_SPRITES; if (!pool[m.e]) m.e = Object.keys(pool).slice(-1)[0]; } changed(true); }));
        }
        if (K.ab) parts.push(pick(m, 'ab', d.abilities.map((x, i) => [i, x.name]), v => { m.ab = +v; changed(false); }));
        if (m.k === 'effect'){ const effects = {}; for (const k in CUSTOM_EFFECTS) if (k !== 'none') effects[k] = CUSTOM_EFFECTS[k].name; parts.push(pick(m, 'e', effects, v => { m.e = v; changed(true); })); }
        if (m.k === 'type') parts.push(pick(m, 'e', TYPE_LABEL, v => { m.e = v; changed(false); }));
        if (m.k === 'sprite'){ const a = d.attacks[m.a]; parts.push(pick(m, 'e', a ? UPGRADE_SPRITES[a.style] : ALL_SPRITES, v => { m.e = v; changed(false); })); }
        if (m.k === 'shape') parts.push(pick(m, 'e', SHAPES, v => { m.e = v; changed(false); }));
        if (m.k === 'aim'){ const a = d.attacks[m.a]; parts.push(pick(m, 'e', aimsFor(a ? a.style : 'throw'), v => { m.e = v; changed(false); })); }
        if (m.k === 'color') parts.push(colorIn(m, 'e', 'New colour'));
        if (m.k === 'tint') parts.push(colorIn(m, 'e', 'New body colour'));
        if (m.k === 'look'){
          parts.push(pick(m, 'e', lookChoices().concat([['__new', '+ Model a new body…']]), v => {
            if (v === '__new'){ if (bodyList().length >= BODY_MAX){ status.textContent = 'No free body slots: delete one in the Bodies tab first.'; drawForm(); return; } B.wb = { id: null, b: Object.assign(cleanBody(defaultBody()), { _rev: Date.now() }), back: { tab: B.tab, m } }; drawTabs(); drawForm(); return; }
            m.e = v; changed(true);
          }));
          if (m.e.startsWith('b:') && bodyById(m.e.slice(2))) parts.push(bodyIcon(m.e.slice(2), bodyById(m.e.slice(2)), 32));
        }
        if (K.num && !(m.k === 'effect' && m.e === 'strip')){
          const n = num(m, 'v', K.num[0], K.num[1], K.num[2]);
          n.setAttribute('aria-label', m.k === 'effect' ? 'Strength' : 'Amount');
          parts.push(m.k === 'effect' ? h('label', { class:'bmini' }, h('span', { text:'Lv' }), n) : n);
        }
        rows.append(h('div', { class:'bmod' }, parts, xBtn('Remove change', () => { T.mods.splice(j, 1); changed(true); })));
      });
      const auto = (() => { const c = cleanCustom(d); return tierDesc(Object.assign(c, { paths: c.paths.map((x, i) => i === p ? Object.assign({}, x, { tiers: x.tiers.map((y, k) => k === t ? Object.assign({}, y, { desc:'' }) : y) }) : x) }), p, t); })();
      const abNotes = d.abilities.filter(x => x.unlock && x.unlock.p === p && x.unlock.t === t).map(x => x.name);
      const shown = !B.pvPara && B.pvUp && B.pvUp[p] === t + 1;
      form.append(h('section', { class:'bsec bcard btier', style: '--pc:' + PATH_COLORS[p], 'data-go': 'tier-' + p + '-' + t },
        h('div', { class:'bcard-head' }, h('b', { text:'Tier ' + (t + 1) }), text(T, 'name', 24, 'Upgrade name', 'Tier ' + (t + 1) + ' name'), h('label', { class:'bmini' }, h('span', { text:'$' }), num(T, 'cost', 5, 1e8, 5)),
          h('button', { class:'btn btn-small btest' + (shown ? ' on' : ''), 'aria-pressed': String(shown), title:'Show the appliance at this tier in the test range', onclick: () => testTier(p, t) }, 'Test')),
        rows,
        h('div', { class:'btier-foot' },
          T.mods.length < MAX_MODS && kinds.length ? addBtn('Add change', () => { T.mods.push(newMod(d, kinds[0])); changed(true); }) : null,
          abNotes.length ? h('span', { class:'bnote', text:'Also unlocks ' + abNotes.join(' and ') + ' (set in Abilities).' }) : null),
        field('Description (optional)', text(T, 'desc', 160, auto, 'Tier ' + (t + 1) + ' description'), T.desc ? null : 'Shown in game: ' + auto, true)));
    });
  }

  /* ---- the test range, stats at the shown tiers, preview card, checkup and saved designs ---- */
  function testTier(p, t){
    B.pvPara = false;
    B.pvUp = tierPick(B.pvUp || [0, 0, 0], p, t + 1);
    const P = B.d.paths[p];
    status.textContent = 'Test range: ' + (P.name || 'path ' + (p + 1)) + ' tier ' + (t + 1) + ', shown as ' + B.pvUp.join('-') + '.';
    if (B.tab === 'paragon'){ B.tab = 'upgrades'; B.path = p; drawTabs(); drawForm(); }
    drawSide(); syncTestBtns();
    if (window.matchMedia && matchMedia('(max-width: 780px)').matches){ const r = side.querySelector('.brange'); if (r) r.scrollIntoView({ block:'start', behavior:'smooth' }); }
  }
  function syncTestBtns(){
    form.querySelectorAll('[data-go^="tier-"]').forEach(el => {
      const [, p, t] = el.dataset.go.split('-').map(Number);
      const b = el.querySelector('.btest'); if (!b) return;
      const on = !B.pvPara && !!B.pvUp && B.pvUp[p] === t + 1;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    });
  }
  function drawRange(d){
    if (!B.preview) B.preview = makePreview();
    B.pvUp = B.pvUp || [0, 0, 0]; B.pvDeg = B.pvDeg || 50; B.pvTarget = B.pvTarget || 'roach';
    const para = !!d.paragon && (B.tab === 'paragon' || !!B.pvPara);
    const opts = () => ({ up: B.pvUp, para, deg: B.pvDeg, target: B.pvTarget });
    B.preview.setDesign(d, opts());
    const box = h('div', { class:'brange' }, B.preview.canvas);
    /* appliance or paragon, and the abilities button */
    const abs = para ? d.paragon.abilities : d.abilities;
    const acts = h('div', { class:'brange-acts' });
    if (d.paragon) acts.append(h('div', { class:'seg seg2 bseg', role:'group', 'aria-label':'Preview' },
      h('button', { 'aria-pressed': String(!para), 'data-k':'seg-a', onclick: () => { B.pvPara = false; if (B.tab === 'paragon'){ B.tab = 'basics'; drawTabs(); drawForm(); } drawSide(); syncTestBtns(); } }, 'Appliance'),
      h('button', { 'aria-pressed': String(para), 'data-k':'seg-p', onclick: () => { B.pvPara = true; drawSide(); syncTestBtns(); } }, 'Paragon')));
    if (abs.length) acts.append(h('button', { class:'btn btn-small btn-gold', onclick: () => B.preview.tryAbilities() }, abs.length > 1 ? 'Try abilities' : 'Try ' + abs[0].name));
    if (acts.children.length) box.append(acts);
    /* which tiers (or which paragon degree) the range shows */
    const statBox = h('div', { class:'bstat' });
    if (!para){
      const head = h('div', { class:'btiers-head' }, h('span', { class:'btl', text:'Upgrades shown' }), h('b', { class:'btiers-n', text: B.pvUp.join('-') }),
        B.pvUp.some(x => x) ? h('button', { class:'bx bx-sm', 'data-k':'pip-x', 'aria-label':'Show no upgrades', title:'Show no upgrades', onclick: () => { B.pvUp = [0, 0, 0]; drawSide(); syncTestBtns(); } }, '×') : null);
      const row = h('div', { class:'btiers', role:'group', 'aria-label':'Upgrades shown in the test range' });
      for (let p = 0; p < 3; p++){
        const grp = h('span', { class:'bpips', style: '--pc:' + PATH_COLORS[p] });
        for (let t = 0; t < 5; t++){
          const on = B.pvUp[p] > t, T = d.paths[p].tiers[t];
          grp.append(h('button', { class:'bpip' + (on ? ' on' : ''), 'data-k': 'pip-' + p + '-' + t, 'aria-pressed': String(on), 'aria-label': (d.paths[p].name || 'Path ' + (p + 1)) + ' tier ' + (t + 1) + ', ' + T.name,
            title: (d.paths[p].name || 'Path ' + (p + 1)) + ' ' + (t + 1) + ': ' + T.name + ' · ' + money(T.cost) + '\n' + tierDesc(d, p, t),
            onclick: () => { B.pvUp = tierPick(B.pvUp, p, B.pvUp[p] === t + 1 ? t : t + 1); drawSide(); syncTestBtns(); } }));
        }
        row.append(grp);
      }
      box.append(head, row);
    } else {
      const val = h('b', { class:'btiers-n', text: String(B.pvDeg) });
      const sl = h('input', { type:'range', min:'1', max:'100', step:'1', 'aria-label':'Paragon degree' });
      sl.value = String(B.pvDeg);
      sl.addEventListener('input', () => { B.pvDeg = Number(sl.value); val.textContent = sl.value; B.preview.setDesign(d, opts()); fillStats(); });
      box.append(h('label', { class:'bdeg' }, h('span', { class:'btl', text:'Degree' }), sl, val));
    }
    /* practice pests */
    const tg = h('div', { class:'btargets', role:'group', 'aria-label':'Practice pests' });
    for (const [k, T] of Object.entries(RANGE_TARGETS)) tg.append(h('button', { class:'btg', 'data-k': 'tg-' + k, 'aria-pressed': String(B.pvTarget === k), title: T.tip,
      onclick: () => { B.pvTarget = k; drawSide(); } }, T.name));
    box.append(h('div', { class:'btargets-wrap' }, h('span', { class:'btl', text:'Practice pests' }), tg));
    /* the numbers at these tiers */
    function fillStats(){
      statBox.innerHTML = '';
      let s = null;
      try { s = para ? previewStats(d, null, B.pvDeg) : previewStats(d, B.pvUp); } catch (err) { console.error(err); }
      if (!s) return;
      const rows = attackStatsAt(d, s, para);
      if (rows.length){
        const body = h('tbody');
        for (const r of rows){
          const about = [TYPE_LABEL[r.type] + ' damage', r.range === Infinity ? 'whole map' : 'range ' + Math.round(r.range)];
          if (r.big) about.push('+' + fmtN(r.big) + ' to vehicles');
          if (r.radius) about.push('blast radius ' + Math.round(r.radius));
          body.append(h('tr', { title: about.concat(r.tags).join(' · ') },
            h('td', {}, h('span', { text: r.name }), h('small', { text: [TYPE_LABEL[r.type]].concat(r.tags).join(', ') })),
            h('td', { class:'num', text: fmtN(r.dmg) + (r.shots > 1 ? ' ×' + r.shots : '') }),
            h('td', { class:'num', text: fmtN(round2(r.aps)) }),
            h('td', { class:'num', text: fmtN(r.pierce) })));
        }
        statBox.append(h('table', {}, h('thead', {}, h('tr', {}, h('th', { text:'Attack' }), h('th', { text:'Damage', title:'Damage per hit (and shots per attack)' }), h('th', { text:'Per sec', title:'Attacks per second' }), h('th', { text:'Hits', title:'Pests hit per attack or blast' }))), body));
      }
      const n = statsDps(s), bits = [];
      bits.push(para ? 'Paragon ' + money(d.paragon.cost) : 'Total ' + money(tierCost(d, B.pvUp)));
      bits.push(s.global ? 'Whole map' : 'Range ' + Math.round(s.range));
      bits.push(s.camo ? 'Sees ghosts' : 'No ghost sight');
      if (n.single > 0) bits.push('≈' + fmtN(Math.round(n.single)) + ' damage/s');
      if (s.income) bits.push('+' + money(s.income) + '/round');
      statBox.append(h('div', { class:'bstat-foot' }, bits.map((b, i) => h('span', { class: i === 2 && !s.camo ? 'dim' : '', text: b }))));
    }
    fillStats();
    box.append(statBox);
    return box;
  }
  function drawCheckup(d, R){
    let items = [];
    try { items = designCheckup(d, R); } catch (err) { console.error(err); }
    const bad = items.filter(x => x.lvl === 'bad').length, warn = items.filter(x => x.lvl === 'warn').length;
    const sum = bad ? bad + ' problem' + (bad > 1 ? 's' : '') : warn ? warn + ' thing' + (warn > 1 ? 's' : '') + ' to check' : 'Ready to save';
    const box = h('div', { class:'bcheck' }, h('div', { class:'bcheck-head' }, h('b', { text:'Checkup' }), h('span', { class:'bcheck-sum ' + (bad ? 'bad' : warn ? 'warn' : 'ok'), text: sum })));
    if (!items.length){ box.append(h('p', { class:'note', text:'Nothing to fix. It has something to do, every attack can be used and every tier changes something.' })); return box; }
    const ul = h('ul', {});
    for (const it of items.slice(0, 8)) ul.append(h('li', { class: it.lvl },
      h('i', { 'aria-hidden':'true', text: it.lvl === 'bad' ? '!' : it.lvl === 'warn' ? '•' : 'i' }),
      h('span', { class:'bcheck-t' }, h('span', { class:'sr-only', text: it.lvl === 'bad' ? 'Problem: ' : it.lvl === 'warn' ? 'Check: ' : 'Tip: ' }), it.text),
      it.fix || it.go ? h('span', { class:'bcheck-acts' },
        it.fix ? h('button', { class:'btn btn-small', onclick: () => applyFix(it.fix) }, it.fix.label) : null,
        it.go ? h('button', { class:'btn btn-small', onclick: () => goTo(it.go) }, 'Show me') : null) : null));
    box.append(ul);
    if (items.length > 8) box.append(h('p', { class:'note', text: '…and ' + (items.length - 8) + ' more.' }));
    return box;
  }
  function applyFix(f){
    if (f.kind === 'price'){ B.d.cost = Math.max(25, Math.round(f.v)); status.textContent = 'Price set to ' + money(B.d.cost) + '.'; }
    if (f.kind === 'unlock'){ const T = B.d.paths[f.p].tiers[f.t]; T.mods.unshift({ k:'unlock', a: f.a }); status.textContent = 'Path ' + (f.p + 1) + ' tier ' + (f.t + 1) + ' now unlocks ' + attackLabel(B.d, f.a) + '.'; }
    if (f.kind === 'camo'){ B.d.paths[f.p].tiers[f.t].mods.push({ k:'camo' }); status.textContent = 'Path ' + (f.p + 1) + ' tier ' + (f.t + 1) + ' now lets it see ghost pests.'; }
    if (f.kind === 'prices'){ const base = Math.max(25, Number(B.d.cost) || 400); B.d.paths[f.p].tiers.forEach((T, i) => { T.cost = round5(base * TIER_COST[i]); }); status.textContent = 'Path ' + (f.p + 1) + ' now uses standard prices for a ' + money(base) + ' appliance.'; }
    Sfx.play('click');
    changed(true);
  }
  function goTo(go){
    const was = B.tab;
    B.tab = go.tab;
    if (go.path != null) B.path = go.path;
    drawTabs(); drawForm();
    if ((was === 'paragon') !== (go.tab === 'paragon')) drawSide();
    const el = go.card ? form.querySelector('[data-go="' + go.card + '"]') : null;
    (el || form).scrollIntoView({ block: el ? 'center' : 'start', behavior:'smooth' });
    if (el){
      el.classList.remove('bflash'); void el.offsetWidth; el.classList.add('bflash');
      const inp = el.matches('input,select') ? el : el.querySelector('input,select');
      if (inp) setTimeout(() => { try { inp.focus({ preventScroll:true }); } catch (e) {} }, 400);
    }
  }
  function drawSide(){
    const d = cleanCustom(B.d);
    /* keep keyboard focus on the same control when the panel is redrawn */
    const act = document.activeElement, keep = act && side.contains(act) && act.dataset ? act.dataset.k : null;
    side.innerHTML = '';
    side.append(drawRange(d));
    /* what it does */
    const nums = customNumbers(d);
    const card = h('div', { class:'bprev' },
      h('div', { class:'bprev-top' }, iconCanvas(Art.towerIcon(previewType(d), 64, [0, 0, 0], false, d.skin, d.tint)),
        h('div', {}, h('div', { class:'bprev-name', text: d.name }), h('div', { class:'bprev-sub', text: roleOf(d) + ' · ' + money(d.cost) + (B.id ? ' · editing' : ' · new') }))),
      h('p', { class:'bprev-desc', text: describeCustom(d) }));
    if (nums) card.append(h('div', { class:'bprev-stats' },
      h('span', {}, 'Damage per second ', h('b', { class:'num', text: fmt(Math.round(nums.single)) })),
      h('span', {}, 'Against crowds up to ', h('b', { class:'num', text: fmt(Math.round(nums.crowd)) }))));
    /* balance */
    let R = null;
    try { R = designRating(d); } catch (err) { console.error(err); }
    if (R){
      const bal = h('div', { class:'bbal' });
      if (R.attack){
        const pos = clamp(50 + Math.log2(R.ratio) * 25, 3, 97);
        const cls = R.ratio < 0.6 ? 'weak' : R.ratio < 1.5 ? 'fair' : R.ratio < 3 ? 'strong' : 'op';
        bal.append(h('div', { class:'bbal-head' }, h('b', { text:'Power for its price' }), h('span', { class:'bbal-word ' + cls, text: R.word })),
          h('div', { class:'bbal-bar', title: R.ratio.toFixed(2) + '× the damage for the price of a typical appliance' }, h('i', { style:{ left: pos + '%' } })),
          h('div', { class:'bbal-fair' }, 'About ' + (R.ratio >= 10 ? Math.round(R.ratio) : R.ratio.toFixed(1)) + '× a typical appliance. Fair price: ', h('b', { class:'num', text: money(R.fair) }),
            Math.abs(R.fair - d.cost) > d.cost * 0.08 ? h('button', { class:'btn btn-small', onclick: () => { B.d.cost = Math.max(25, R.fair); status.textContent = 'Price set to ' + money(B.d.cost) + '.'; changed(true); } }, 'Use it') : null));
      } else if (R.payback) bal.append(h('div', { class:'bbal-head' }, h('b', { text:'Money' }), h('span', { class:'bbal-word fair', text:'Pays for itself in ' + R.payback + ' round' + (R.payback === 1 ? '' : 's') })));
      const rows = R.paths.map((p, i) => h('li', { style: '--pc:' + PATH_COLORS[i] }, h('i'), h('span', { text: (d.paths[i].name || 'Path ' + (i + 1)) + ' maxed · ' + p.up.join('-') }), h('b', { class:'num', text: fmt(Math.round(p.n.single)) + '/s' })));
      if (R.para) rows.push(h('li', { class:'par' }, h('i'), h('span', { text:'Paragon at degree 50' }), h('b', { class:'num', text: fmt(Math.round(R.para.single)) + '/s' })));
      if (nums || R.para) bal.append(h('ul', { class:'bbal-paths', 'aria-label':'Damage per second when upgraded' }, rows));
      card.append(bal);
    }
    if (d.abilities.length) card.append(h('div', { class:'bprev-abs' }, d.abilities.map(x => h('div', { class:'bpa' },
      h('b', { text: x.name }), h('span', { text: ' · every ' + x.cd + 's · ' + (x.unlock ? 'path ' + (x.unlock.p + 1) + ' tier ' + (x.unlock.t + 1) : 'from the start') }),
      h('small', { text: abilityText(x) })))));
    const paths = h('div', { class:'bprev-paths' });
    d.paths.forEach((P, i) => {
      paths.append(h('div', { class:'bpp', style: '--pc:' + PATH_COLORS[i] },
        h('b', { text: P.name || 'Path ' + (i + 1) }),
        h('ol', {}, P.tiers.map((T, k) => h('li', { title: tierDesc(d, i, k) }, h('span', { text: T.name }), h('span', { class:'num', text: money(T.cost) }))))));
    });
    card.append(paths);
    if (d.paragon){
      const P = d.paragon;
      card.append(h('div', { class:'bprev-par' }, iconCanvas(Art.towerIcon(previewType(d), 64, [5, 5, 5], true)),
        h('div', {}, h('b', { text: P.name }), h('span', { text: ' · paragon · ' + money(P.cost) }), h('small', { text: describeParagon(P) }))));
    }
    side.append(drawCheckup(d, R));
    side.append(card);
    /* saved designs */
    const ids = customList();
    const list = h('div', { class:'blist' }, h('h4', { text: 'Your appliances (' + ids.length + ' of ' + CUSTOM_MAX + ')' }));
    if (!ids.length) list.append(h('p', { class:'note', text:'Nothing saved yet. Saved designs appear at the end of the shop in every game.' }));
    for (const cid of ids){
      const armed = B.delArm === cid, name = TOWERS[cid].name;
      list.append(h('div', { class:'brow' + (cid === B.id ? ' on' : '') },
        iconCanvas(Art.towerIcon(cid, 48)),
        h('span', { class:'bn' }, h('b', { text: name }), h('small', { text: TOWERS[cid].role + ' · ' + money(TOWERS[cid].cost) + (TOWERS[cid].paragon ? ' · paragon' : '') })),
        h('div', { class:'brow-acts' },
          h('button', { class:'btn btn-small', onclick: () => { B.id = cid; B.d = cleanCustom(Profile.custom[cid]); B.delArm = null; B.path = 0; B.pvPara = false; B.pvUp = [0, 0, 0]; B.open = {}; resetHistory(); status.textContent = 'Editing ' + name + '.'; redraw(); } }, 'Edit'),
          h('button', { class:'btn btn-small', title:'Get a code to share this design', onclick: () => showCode(designCode(Profile.custom[cid]), name) }, 'Share'),
          h('button', { class:'btn btn-small', title:'Save a copy of this design', onclick: () => {
            const copy = Object.assign(cleanCustom(Profile.custom[cid]), { name: name.slice(0, 19) + ' copy' });
            const id = saveCustomTower(copy);
            if (!id){ Sfx.play('error'); status.textContent = 'You already have ' + CUSTOM_MAX + ' custom appliances. Delete one first.'; return; }
            if (inGame){ buildShop(); updatePanel(true); }
            status.textContent = 'Saved a copy: ' + TOWERS[id].name + '.';
            drawSide();
          } }, 'Duplicate'),
          h('button', { class:'btn btn-small sell' + (armed ? ' armed' : ''), onclick: () => {
            if (!armed){ B.delArm = cid; drawSide(); return; }
            const r = deleteCustomTower(cid);
            if (B.id === cid) B.id = null;
            B.delArm = null;
            if (inGame){ buildShop(); updatePanel(true); buildAbilities(); }
            status.textContent = 'Deleted ' + name + '.' + (r.removed ? ' Refunded ' + money(r.refund) + ' for ' + r.removed + ' placed.' : '');
            drawSide();
          } }, armed ? 'Confirm' : 'Delete'))));
    }
    side.append(list);
    if (keep){ const el = side.querySelector('[data-k="' + keep + '"]') || (keep === 'pip-x' ? side.querySelector('.bpip') : null); if (el) el.focus({ preventScroll:true }); }
  }

  const save = andPlace => {
    const was = B.id;
    const id = saveCustomTower(B.d, B.id);
    if (!id){ Sfx.play('error'); status.textContent = 'You already have ' + CUSTOM_MAX + ' custom appliances. Delete one first.'; return; }
    B.id = id; B.d = cleanCustom(Profile.custom[id]);
    Sfx.play('upgrade');
    if (inGame){ buildShop(); updatePanel(true); buildAbilities(); }
    if (andPlace && inGame){ B.adminWas = false; closeBuilder(); startPlacing(id); toast(TOWERS[id].name + ' saved. ' + VERB + ' the kitchen to place it.', 'gold'); return; }
    status.textContent = (was ? 'Saved changes to ' : 'Saved ') + TOWERS[id].name + '.' + (was ? '' : ' It is now at the end of the shop.');
    redraw();
  };
  resetHistory();
  redraw();
  const acts = [{ label:'Save', kind:'primary', keep:true, onClick: () => save(false) }];
  if (inGame) acts.push({ label:'Save and place', kind:'gold', keep:true, onClick: () => save(true) });
  acts.push({ label:'Close', keep:true, onClick: closeBuilder });
  modal({ title:'Tower builder', lead:'Design an appliance with its own attacks, abilities and upgrades, model its body in 3D in the Bodies tab, draw what it fires in the Objects tab, or remix a built-in appliance. Saved designs join the shop in every game, skip mastery locks and wear a purple star.', content:[shell], actions: acts, foot: status, wide:true, noFocus:true,
    onClose: () => { const back = UI.bld && UI.bld.adminWas; UI.bld = null; if (back){ UI.adminOpen = true; buildAdmin(); $('#admin').hidden = false; } } });
}
