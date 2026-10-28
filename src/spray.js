'use strict';
/* =====================================================================
   Kitchen Siege — the Spray Bottle
   A trigger spray bottle. Its paths change what is in the bottle (soap,
   icy water) and how it comes out (the nozzle):
     wet        what it sprays is soaked for a while: wet pests take more
                from cold and energy hits by any appliance; with the Mist
                path cold hits freeze them solid, heat flashes them to
                steam that scalds the pests around, and every hit on a wet
                pest can deal more
     lather     soap: a lathered pest now and then slips back down the
                trail, crashing into the pests behind it; foam patches on
                the trail make everything crossing them slip far more
     bubbles    drift back up the trail from the stretch it covers and pop
                on the first pest they meet, lathering the pests around
     stream     the nozzle twisted to Stream (a setting in its panel): a
                long jet through a line of pests that pushes them back and
                scrubs off ghost cloaks, mold and armor
   Abilities: Bubble Bath (soap), Downpour (mist), Hydro Blast (nozzle).
   The engine calls in through sprayFire (attacks), sprayStats (stats),
   sprayDamage (in damage), sprayPestTick (pest timers), sprayTick (each
   frame) and runSprayAbility; the art through drawSprayFloor and
   drawSprayAir.
   ===================================================================== */
const QSB = [], QSF = [], QSH = [];
Object.assign(ABILITIES, {
  bubblebath: { name:'Bubble Bath', desc:'The toughest pests on screen are trapped in soap bubbles, floated back up the trail and held there, then the bubbles pop.' },
  downpour:   { name:'Downpour',    desc:'Rain over the whole kitchen: every pest stays wet, and wet pests take double from cold, energy and heat.' },
  hydroblast: { name:'Hydro Blast', desc:'A huge jet down the line with the most pests blasts them back up the trail.' },
});

/* ---------------- the nozzle ---------------- */
/* which way the nozzle is twisted: Mist until the Stream setting is bought, then Stream unless the player twisted it back */
function nozzleOf(t){ return t && (t.nozzle === 'mist' || t.nozzle === 'stream') ? t.nozzle : 'stream'; }
/* how strong a soak or a lather is: the stronger one stays on a pest when two bottles spray it */
function wetRank(W){ return W.rank != null ? W.rank : (W.rank = (W.all || 0) * 10 + (W.freeze ? 5 : 0) + (W.steam ? W.steam.dmg : 0) + ((W.energyMul || 1) - 1) * 10 + (W.chill ? 2 : 0) + (W.dur || 0) * 0.1); }
function latherRank(L){ return L.rank != null ? L.rank : (L.rank = L.dist + (L.bigDist || 0) + (L.bump || 0) + (L.vuln || 0) * 100 + L.chance); }
/* the jet an attack fires when twisted to Stream: what is in the bottle comes along */
function streamAttack(m){
  const st = m.stream;
  return { kind:'spray', streaming:true, rate: st.rate || m.rate, dmg: st.dmg, pierce: st.pierce, bonusBig: st.bonusBig || 0, bonusBoss: st.bonusBoss || 0,
    knock: st.knock || 0, bigKnock: st.bigKnock || 0, width: st.width || 10, rangeMul: st.rangeMul || 1.7, decamo: !!st.decamo, demold: !!st.demold, strip: !!st.strip,
    ignoreImmune: !!(st.ignoreImmune || m.ignoreImmune), type:'normal', wet: m.wet, lather: m.lather, foam: m.foam, mode: m.mode };
}
/* stats: a nozzle twisted to Stream fires the jet instead of the mist (the paragon fires both) */
function sprayStats(t, s){
  const m = s.atk.main;
  if (!m || m.kind !== 'spray') return;
  if (m.stream){
    s.sprayStream = true;
    if (m.both) s.atk.jet = streamAttack(m);
    else if (nozzleOf(t) === 'stream') s.atk.main = streamAttack(m);
  }
}
function setNozzle(t, mode){
  if (!t || (mode !== 'mist' && mode !== 'stream')) return false;
  t.nozzle = mode;
  refreshTowers();
  return true;
}

/* ---------------- what it sprays does to a pest ---------------- */
function soakE(e, W, tw, dur){
  if (!W || e.dead) return;
  e.wetT = Math.max(e.wetT || 0, dur != null ? dur : W.dur);
  /* the strongest soak wins: a Monsoon's wet beats a plain bottle's */
  if (!e.wetFx || wetRank(W) >= wetRank(e.wetFx)) e.wetFx = W;
  e.sprayed = true;
}
function latherE(e, L, tw, dur){
  if (!L || e.dead) return;
  e.latherT = Math.max(e.latherT || 0, dur != null ? dur : L.dur);
  if (!e.latherFx || latherRank(L) >= latherRank(e.latherFx)){ e.latherFx = L; e.latherBy = tw; }
  e.sprayed = true;
}
/* the fluid: soak, lather */
function sprayFluid(e, a, tw){
  if (e.dead || e.burrowT > 0) return;
  if (a.wet) soakE(e, a.wet, tw);
  if (a.lather && (!e.big || a.lather.bigDist > 0)) latherE(e, a.lather, tw);
}
/* a wet or lathered pest takes more (called from damage, after its other modifiers) */
function sprayDamage(e, d, type, tw, o){
  if (e.latherT > 0 && e.latherFx && e.latherFx.vuln) d *= 1 + e.latherFx.vuln;
  if (!(e.wetT > 0) || !e.wetFx) return d;
  const W = e.wetFx, rain = G.glob.downpour ? 2 : 1;
  if (W.all) d += W.all;
  if (type === 'cold'){
    d = (d + (W.cold || 0)) * rain;
    if (W.freeze && !(o && o.steam)) freezeE(e, { dur: W.freeze, bigDur: W.freeze * 0.35 }, tw);
  } else if (type === 'energy') d = (d + (W.energy || 0)) * (W.energyMul || 1) * rain;
  else if (type === 'heat'){
    d *= (W.heatMul || 1) * rain;
    if (W.steam && !(o && o.steam) && !(e.steamCd > G.time)){ e.steamCd = G.time + 0.5; steamBurst(e, W.steam, tw); }
  }
  return d;
}
/* heat on a wet pest: a burst of steam scalds the pests around it */
function steamBurst(e, S, tw){
  const list = query(e.x, e.y, S.r, QSH).filter(o => o !== e && !o.dead && !(o.burrowT > 0)).slice(0, S.n);
  const x = e.x, y = e.y;
  for (const o of list) damage(o, S.dmg, 'heat', tw, { steam: true });
  if (G.vis && !lowFx()){
    for (let i = 0; i < 8; i++){ const a = rand(0, TAU), v = rand(30, 90); part(x, y, Math.cos(a) * v, Math.sin(a) * v - 20, 0.6, '#f4fbff', 6, 'smoke'); }
    G.fx.push({ k:'ring', x, y, r0: 6, r1: S.r, t:0, life:0.3, c:'#e8f6ff', w:3 });
  }
  Hooks.sfx('sizzle');
}
/* a lathered pest slips back down the trail, into the pests behind it */
function slipE(e, dist, L){
  knockE(e, dist);
  e.slipT = 0.35;
  if (L.bump > 0){
    for (const o of query(e.x, e.y, 14, QSB)) if (o !== e && !o.dead && !(o.burrowT > 0)) damage(o, L.bump, 'normal', e.latherBy && G.towers.indexOf(e.latherBy) >= 0 ? e.latherBy : null, null);
  }
  if (G.vis && !lowFx()) for (let i = 0; i < 3; i++) part(e.x + rand(-4, 4), e.y + rand(-4, 4), rand(-30, 30), rand(-30, 10), 0.5, '#ffffff', 2.4, 'bubble');
}
/* each pest's soak and lather, every frame (called from the pest update) */
function sprayPestTick(e, dt){
  if (e.wetT > 0){
    e.wetT -= dt;
    const W = e.wetFx;
    if (W && e.wetT > 0){
      if (W.chill && !e.big) slowE(e, W.chill, 0.12);
      if (W.bigSlow && e.big && !e.boss) slowE(e, W.bigSlow, 0.12);
    }
  }
  if (e.foamT > 0) e.foamT -= dt;
  if (e.slipT > 0) e.slipT -= dt;
  if (e.latherT > 0){
    e.latherT -= dt;
    const L = e.latherFx;
    if (L && !e.boss && !e.air && !(e.holdT > 0) && !(e.burrowT > 0)){
      const dist = e.big ? L.bigDist : L.dist;
      if (dist > 0 && Math.random() < L.chance * (e.foamT > 0 ? 3 : 1) * dt) slipE(e, dist, L);
    }
  }
  if (!(e.wetT > 0) && !(e.latherT > 0) && !(e.foamT > 0) && !(e.slipT > 0)){ e.sprayed = false; e.wetFx = null; e.latherFx = null; }
}

/* ---------------- attacks ---------------- */
function sprayFire(t, a, id){
  switch (a.kind){
    case 'spray': return a.streaming ? fireStream(t, a, id) : fireMist(t, a, id);
    case 'bubbles': return fireBubbles(t, a);
  }
  return false;
}
function fireMist(t, a, id){
  const range = attackRange(t, a);
  const tg = acquire(t, range, a, a.mode);
  if (!tg) return false;
  const ang = Math.atan2(tg.y - t.y, tg.x - t.x);
  setAim(t, id, ang);
  const hits = [];
  for (const e of query(t.x, t.y, range, QSB)){
    if (!canTarget(t, e, a)) continue;
    const dx = e.x - t.x, dy = e.y - t.y, dist = Math.hypot(dx, dy) || 1;
    let da = Math.atan2(dy, dx) - ang;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) <= a.cone * 0.5 + Math.atan(e.r / dist)) hits.push([dist, e]);
  }
  hits.sort((p, q) => p[0] - q[0]);
  let n = 0;
  for (const [, e] of hits){ if (n >= a.pierce) break; applyHit(e, a, t); sprayFluid(e, a, t); n++; }
  foamDrop(t, a, hits.length ? hits[0][1] : tg);
  t.fireAnim = 0.18;
  if (G.vis && !lowFx()){
    const x0 = t.x + Math.cos(ang) * 16, y0 = t.y + Math.sin(ang) * 16;
    const soap = !!a.lather;
    for (let i = 0; i < 5; i++){
      const aa = ang + rand(-a.cone * 0.45, a.cone * 0.45), v = range * rand(1.4, 2.2);
      part(x0, y0, Math.cos(aa) * v, Math.sin(aa) * v, 0.42, soap && i % 2 ? '#ffffff' : '#bfe6ff', soap && i % 2 ? 3 : 4.5, i % 2 ? 'dot' : 'smoke');
    }
  }
  Hooks.sfx('mist');
  return true;
}
function fireStream(t, a, id){
  const range = attackRange(t, a);
  const tg = acquire(t, range, a, a.mode);
  if (!tg) return false;
  const ang = Math.atan2(tg.y - t.y, tg.x - t.x), dx = Math.cos(ang), dy = Math.sin(ang);
  setAim(t, id, ang);
  const x0 = t.x + dx * t.size * 0.9, y0 = t.y + dy * t.size * 0.9, len = range + 20;
  const hits = [];
  for (const e of query(x0 + dx * len / 2, y0 + dy * len / 2, len / 2 + 10, QSB)){
    if (!canTarget(t, e, a)) continue;
    const px = e.x - x0, py = e.y - y0, along = px * dx + py * dy;
    if (along < -e.r || along > len + e.r) continue;
    if (Math.abs(px * dy - py * dx) <= e.r + a.width * 0.5) hits.push([along, e]);
  }
  hits.sort((p, q) => p[0] - q[0]);
  let n = 0, last = null;
  for (const [, e] of hits){ if (n >= a.pierce) break; applyHit(e, a, t); sprayFluid(e, a, t); last = e; n++; }
  foamDrop(t, a, hits.length ? hits[0][1] : tg);
  let ex = x0 + dx * len, ey = y0 + dy * len;
  if (n >= a.pierce && last){ ex = last.x; ey = last.y; }
  if (G.vis) G.fx.push({ k:'beam', x1:x0, y1:y0, x2:ex, y2:ey, t:0, life:0.2, w: a.width, c: a.lather ? '#e9f7ff' : '#7fd3ff', water:true, seed: Math.random() * 100 });
  if (G.vis && !lowFx() && n) for (let i = 0; i < 3; i++) part(ex, ey, rand(-80, 80), rand(-80, 80), 0.35, '#dff4ff', 3, 'dot');
  t.fireAnim = 0.15;
  Hooks.sfx('splash');
  return true;
}
/* foam on the trail, every few sprays, where the spray lands */
function foamDrop(t, a, e){
  if (!a.foam || !e || e.dead) return;
  t.foamN = (t.foamN || 0) + 1;
  if (t.foamN % a.foam.every) return;
  const mine = G.foams.filter(f => f.tw === t);
  if (mine.length >= 6) G.foams.splice(G.foams.indexOf(mine[0]), 1);
  G.foams.push({ x: e.x, y: e.y, r: a.foam.r, t: 0, life: a.foam.life, slow: a.foam.slow, lather: a.lather, wet: a.wet, tw: t, seed: Math.random() * 100 });
}
/* the stretch of trail a bottle covers: the point in range furthest along it (cached until the bottle moves) */
function sprayTrailSpot(t, R){
  const key = Math.round(t.x) + ',' + Math.round(t.y) + ',' + Math.round(R) + ',' + G.paths.length + ',' + G.mapId + ',' + (G.M && G.M.reverse ? 'r' : '');
  if (t._spot && t._spot.key === key) return t._spot.at;
  let best = null;
  G.paths.forEach((P, pi) => {
    let seg = 0;
    for (let d = 0; d <= P.len; d += 8){
      const q = pathPos(P, d, seg); seg = q.seg;
      if ((q.x - t.x) ** 2 + (q.y - t.y) ** 2 <= R * R && (!best || d / P.len > best.d / G.paths[best.path].len)) best = { path: pi, d };
    }
  });
  t._spot = { key, at: best };
  return best;
}
function fireBubbles(t, a){
  if (!G.roundActive && !G.attract) return false;
  const R = attackRange(t, a);
  if (!G.enemies.some(e => !e.dead && onScreen(e) && Math.hypot(e.x - t.x, e.y - t.y) <= R * 2.5)) return false;
  const at = sprayTrailSpot(t, R);
  if (!at) return false;
  const lather = t.s.atk.main && t.s.atk.main.lather, wet = t.s.atk.main && t.s.atk.main.wet;
  for (let i = 0; i < a.count; i++){
    if (G.bubbles.length >= 60) G.bubbles.shift();
    G.bubbles.push({ path: at.path, d: Math.max(0, at.d - i * 18), seg: 0, x: t.x, y: t.y, t: 0, life: a.life, speed: a.speed * rand(0.85, 1.15), dmg: a.dmg, bonusBig: a.bonusBig || 0, r: a.r, lather, wet, tw: t, seed: Math.random() * 100, size: 5 + Math.min(4, a.r / 12) });
  }
  t.fireAnim = 0.15;
  Hooks.sfx('bubble');
  return true;
}

/* ---------------- every frame ---------------- */
function sprayTick(dt){
  if (G.bubbles.length) bubbleTick(dt);
  if (G.foams.length) foamTick(dt);
  if (G.glob.downpour) downpourTick(dt);
  for (const t of G.towers){
    if (!t.s || !t.s.humid || !t.s.atk.main || !t.s.atk.main.wet) continue;
    t.humidAcc = (t.humidAcc || 0) + dt;
    if (t.humidAcc < 0.4) continue;
    t.humidAcc = 0;
    const W = t.s.atk.main.wet;
    for (const e of query(t.x, t.y, t.s.range, QSF)) if (!e.dead && !(e.burrowT > 0)) soakE(e, W, t, 1.2);
  }
}
function bubbleTick(dt){
  const keep = [];
  for (const b of G.bubbles){
    b.t += dt;
    const P = G.paths[b.path];
    if (!P || b.t >= b.life || b.d <= 0){ if (G.vis && b.t < b.life) G.fx.push({ k:'pop', x:b.x, y:b.y, t:0, life:0.25 }); continue; }
    b.d = Math.max(0, b.d - b.speed * dt);
    const q = pathPos(P, b.d, b.seg); b.seg = q.seg;
    const w = Math.sin(b.t * 3 + b.seed) * 5;
    const nx = -(q.y - b.y), ny = q.x - b.x, nl = Math.hypot(nx, ny) || 1;
    b.x = q.x + nx / nl * w; b.y = q.y + ny / nl * w;
    const hit = query(b.x, b.y, b.size, QSB).find(e => !e.dead && !e.air && !(e.burrowT > 0));
    if (!hit){ keep.push(b); continue; }
    /* pop: the pest it met takes the hit, everything near it is lathered */
    const tw = G.towers.indexOf(b.tw) >= 0 ? b.tw : null;
    damage(hit, b.dmg, 'normal', tw, { bonusBig: b.bonusBig });
    for (const e of query(b.x, b.y, b.r, QSF)){
      if (e.dead || e.burrowT > 0) continue;
      if (b.wet) soakE(e, b.wet, tw);
      if (b.lather && (!e.big || b.lather.bigDist > 0)) latherE(e, b.lather, tw);
    }
    if (G.vis){
      G.fx.push({ k:'pop', x:b.x, y:b.y, t:0, life:0.25 });
      G.fx.push({ k:'ring', x:b.x, y:b.y, r0: 4, r1: b.r, t:0, life:0.3, c:'#dff6ff', w:2 });
    }
    Hooks.sfx('bubble');
  }
  G.bubbles = keep;
}
function foamTick(dt){
  const keep = [];
  for (const f of G.foams){
    f.t += dt;
    if (f.t >= f.life) continue;
    keep.push(f);
    const tw = G.towers.indexOf(f.tw) >= 0 ? f.tw : null;
    for (const e of query(f.x, f.y, f.r, QSF)){
      if (e.dead || e.air || e.burrowT > 0) continue;
      slowE(e, e.big ? Math.max(0.8, f.slow) : f.slow, 0.15);
      e.foamT = 0.2; e.sprayed = true;
      if (f.lather && (!e.big || f.lather.bigDist > 0)) latherE(e, f.lather, tw, 1.5);
    }
  }
  G.foams = keep;
}
function downpourTick(dt){
  const D = G.glob.downpour;
  D.t -= dt;
  if (D.t <= 0 || G.towers.indexOf(D.tw) < 0){ G.glob.downpour = null; return; }
  D.acc += dt;
  if (D.acc >= 0.25){ D.acc = 0; for (const e of G.enemies) if (!e.dead && onScreen(e) && !(e.burrowT > 0)) soakE(e, D.wet, D.tw, 1.5); }
  if (D.bolts > 0){
    D.bacc += dt * D.bolts;
    while (D.bacc >= 1){
      D.bacc -= 1;
      const wet = G.enemies.filter(e => !e.dead && onScreen(e) && e.wetT > 0 && !(e.burrowT > 0));
      if (!wet.length) break;
      const e = wet[Math.floor(Math.random() * wet.length)];
      if (G.vis) G.fx.push({ k:'beam', x1: e.x + rand(-30, 30), y1: e.y - 260, x2: e.x, y2: e.y, t:0, life:0.2, w:5, c:'#fff3a0', bolt:true, seed: Math.random() * 100 });
      damage(e, D.boltDmg, 'energy', D.tw, { bonusBig: D.boltBig, ignoreImmune: true });
      Hooks.sfx('zap');
    }
  }
}

/* ---------------- abilities ---------------- */
function runSprayAbility(t, ab){
  switch (ab.id){
    case 'bubblebath': {
      const list = toughestN(ab.n, pestsOnScreen().filter(e => !e.boss && !e.air && (ab.big || !e.big) && !(e.holdT > 0)));
      if (!list.length) return false;
      const L = t.s.atk.main && t.s.atk.main.lather, W = t.s.atk.main && t.s.atk.main.wet;
      for (const e of list){
        knockE(e, e.big ? ab.back * 0.5 : ab.back);
        if (L) latherE(e, L, t, ab.hold + 4);
        if (W) soakE(e, W, t, ab.hold + 4);
        grab(e, { kind:'grab', dmg: 0, type:'normal', bubble: { dur: ab.hold, bigDur: ab.big ? ab.hold : 0, pop: ab.pop, popBig: ab.popBig || ab.pop } }, t);
      }
      Hooks.sfx('bubble');
      Hooks.toast('Bubble Bath: ' + list.length + ' pest' + (list.length === 1 ? '' : 's') + ' bubbled.', 'info');
      return true;
    }
    case 'downpour': {
      const W = t.s.atk.main && t.s.atk.main.wet;
      if (!W) return false;
      G.glob.downpour = { t: ab.dur, dur: ab.dur, tw: t, wet: W, acc: 1, bolts: ab.bolts || 0, boltDmg: ab.boltDmg || 0, boltBig: ab.boltBig || 0, bacc: 0 };
      if (G.vis) G.fx.push({ k:'flash', c:'rgba(90,140,200,0.3)', t:0, life:0.5 });
      Hooks.sfx('splash');
      return true;
    }
    case 'hydroblast': {
      /* the line with the most pests in it (not bosses), out to the far wall */
      const L = pestsOnScreen().filter(e => !e.boss && !e.air);
      if (!L.length) return false;
      let best = null, bn = 0;
      for (let i = 0; i < 48; i++){
        const ang = i / 48 * TAU, dx = Math.cos(ang), dy = Math.sin(ang);
        let n = 0;
        for (const e of L){ const px = e.x - t.x, py = e.y - t.y, along = px * dx + py * dy; if (along > 0 && along < 900 && Math.abs(px * dy - py * dx) <= ab.width * 0.5 + e.r) n += e.big ? 3 : 1; }
        if (n > bn){ bn = n; best = ang; }
      }
      if (best == null) return false;
      const dx = Math.cos(best), dy = Math.sin(best);
      setAim(t, 'main', best);
      let n = 0;
      for (const e of L){
        const px = e.x - t.x, py = e.y - t.y, along = px * dx + py * dy;
        if (!(along > 0 && along < 900 && Math.abs(px * dy - py * dx) <= ab.width * 0.5 + e.r)) continue;
        damage(e, ab.dmg, 'normal', t, { bonusBig: ab.bonusBig, ignoreImmune: true });
        if (e.dead) { n++; continue; }
        knockE(e, e.big ? ab.push * 0.5 : ab.push);
        sprayFluid(e, t.s.atk.main || {}, t);
        n++;
      }
      if (G.vis){
        G.fx.push({ k:'beam', x1:t.x, y1:t.y, x2:t.x + dx * 900, y2:t.y + dy * 900, t:0, life:0.6, w: ab.width, c:'#7fd3ff', water:true, seed: Math.random() * 100 });
        G.fx.push({ k:'beam', x1:t.x, y1:t.y, x2:t.x + dx * 900, y2:t.y + dy * 900, t:0, life:0.45, w: ab.width * 0.4, c:'#ffffff', water:true, seed: Math.random() * 100 });
        G.shake = Math.max(G.shake || 0, 0.5);
      }
      t.fireAnim = 0.3;
      Hooks.sfx('splash');
      Hooks.toast('Hydro Blast: ' + n + ' pest' + (n === 1 ? '' : 's') + ' blasted back.', 'info');
      return true;
    }
  }
  return null;
}

/* ---------------- drawing (called by the renderer) ---------------- */
function drawSprayFloor(g, time){
  for (const f of G.foams){
    const fade = Math.min(1, f.t * 4, (f.life - f.t) * 1.5);
    g.save(); g.globalAlpha = 0.85 * Math.max(0, fade);
    g.fillStyle = 'rgba(240,250,255,0.55)';
    g.beginPath(); g.ellipse(f.x, f.y, f.r, f.r * 0.82, 0, 0, TAU); g.fill();
    for (let i = 0; i < 11; i++){
      const a = i * 2.39 + f.seed, rr = f.r * (0.25 + ((i * 37) % 10) / 14), bx = f.x + Math.cos(a) * rr * 0.85, by = f.y + Math.sin(a) * rr * 0.7;
      const s = 3 + ((i * 13) % 5) + Math.sin(time * 2 + i) * 0.6;
      g.beginPath(); g.arc(bx, by, s, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill();
      g.lineWidth = 0.8; g.strokeStyle = 'rgba(150,200,230,0.7)'; g.stroke();
    }
    g.restore();
  }
}
function drawSprayAir(g, time){
  for (const b of G.bubbles){
    const s = b.size * (1 + Math.sin(b.t * 5 + b.seed) * 0.06), fade = Math.min(1, b.t * 5, (b.life - b.t) * 2);
    g.save(); g.globalAlpha = Math.max(0, fade);
    g.beginPath(); g.arc(b.x, b.y - 4, s, 0, TAU);
    const gr = g.createRadialGradient(b.x - s * 0.3, b.y - 4 - s * 0.3, s * 0.1, b.x, b.y - 4, s);
    gr.addColorStop(0, 'rgba(255,255,255,0.15)'); gr.addColorStop(0.75, 'rgba(190,235,255,0.22)'); gr.addColorStop(1, 'rgba(160,120,255,0.45)');
    g.fillStyle = gr; g.fill();
    g.lineWidth = 1.1; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.stroke();
    g.beginPath(); g.arc(b.x - s * 0.35, b.y - 4 - s * 0.35, s * 0.22, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
    g.restore();
  }
  const D = G.glob.downpour;
  if (D && !lowFx()){
    const k = Math.min(1, (D.dur - D.t) * 3, D.t * 2);
    g.save(); g.globalAlpha = 0.5 * k; g.strokeStyle = '#cfe8ff'; g.lineWidth = 1.2; g.beginPath();
    for (let i = 0; i < 90; i++){
      const x = ((i * 97.3 + time * 60) % (W + 40)) - 20, y = ((i * 53.7 + time * 620) % (H + 40)) - 20;
      g.moveTo(x, y); g.lineTo(x - 4, y + 14);
    }
    g.stroke();
    g.fillStyle = 'rgba(40,70,110,' + (0.12 * k) + ')'; g.fillRect(0, 0, W, H);
    g.restore();
  }
}

/* ---------------- The Car Wash's paragon system: the wash cycle ----------------
   During a round it runs four programmes in turn, 8 seconds each, starting again with Rinse every round:
     Rinse  the jets and mist come 60% faster
     Soap   every pest in range is lathered and slips three times as often
     Wax    every pest in range takes extra damage from every hit
     Dry    hot air blasts the wet pests in range every second (heat, so wet pests burst into steam) */
const WASH = [
  { id:'rinse', name:'Rinse', c:'#7fd3ff', text:'Its jets and mist come 60% faster.' },
  { id:'soap',  name:'Soap',  c:'#ff9ad0', text:'Every pest in range is lathered and slips three times as often.' },
  { id:'wax',   name:'Wax',   c:'#ffd166', text:'Every pest in range takes extra damage from every hit.' },
  { id:'dry',   name:'Dry',   c:'#ff8a3d', text:'Hot air blasts the wet pests in range every second, and the heat bursts them into steam.' },
];
const WASH_LEN = 8;
PARA.spray = {
  init: () => ({ prog: 0, t: 0, acc: 0, cycles: 0 }),
  tick(t, dt){
    const S = t.sys, m = t.s && t.s.atk && t.s.atk.main;
    if (!m || !G.roundActive || t.stunT > 0) return;
    S.t += dt;
    if (S.t >= WASH_LEN){ S.t -= WASH_LEN; S.prog = (S.prog + 1) % WASH.length; if (!S.prog) S.cycles++; if (G.vis) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: t.s.range, t: 0, life: 0.5, c: WASH[S.prog].c, w: 4 }); }
    const P = WASH[S.prog].id;
    if (P === 'rinse'){ t.boost.rinse = { mult: 1.6, t: 0.25 }; return; }
    S.acc += dt;
    const every = P === 'dry' ? 1 : 0.4;
    if (S.acc < every) return;
    S.acc = 0;
    const list = query(t.x, t.y, t.s.range, QSF).filter(e => !e.dead && !(e.burrowT > 0));
    for (const e of list){
      if (P === 'soap'){ if (m.lather) latherE(e, m.lather, t, 1); e.foamT = 0.5; e.sprayed = true; }
      else if (P === 'wax') setVuln(e, { amt: Math.max(5, Math.round(m.dmg)), dur: 0.6 });
      else if (P === 'dry' && e.wetT > 0) damage(e, m.dmg * 3, 'heat', t, { ignoreImmune: true, bonusBig: m.dmg * 6 });
    }
    if (P === 'dry' && G.vis && !lowFx()) for (let i = 0; i < 6; i++){ const a = rand(0, TAU), v = rand(60, 140); part(t.x, t.y, Math.cos(a) * v, Math.sin(a) * v, 0.5, '#ffd9a0', 6, 'smoke'); }
  },
  round(t, when){ if (when === 'start'){ t.sys.prog = 0; t.sys.t = 0; t.sys.acc = 0; } },
  save: S => ({ p: S.prog, t: Math.round((S.t || 0) * 10) / 10, c: S.cycles || 0 }),
  load(S, d){ S.prog = clamp(Math.floor(+d.p || 0), 0, WASH.length - 1); S.t = clamp(+d.t || 0, 0, WASH_LEN); S.cycles = clamp(Math.floor(+d.c || 0), 0, 1e6); },
};
function sprayParaBar(t){ const S = t.sys; return { v: S.t / WASH_LEN, c: WASH[S.prog].c, txt: WASH[S.prog].name.toUpperCase() }; }
function sprayParaUI(t){
  const S = t.sys, P = WASH[S.prog];
  return { title:'Wash cycle', meter: { v: S.t / WASH_LEN, c: P.c, text: P.name + ' · ' + Math.max(0, Math.ceil(WASH_LEN - S.t)) + 's left' },
    lines: ['During a round the Car Wash runs four programmes in turn, ' + WASH_LEN + ' seconds each, and starts again with Rinse every round.'].concat(WASH.map(w => (w === P ? '▶ ' : '') + w.name + ': ' + w.text)) };
}
