'use strict';
/* =====================================================================
   Kitchen Siege — Chopsticks and the Lazy Susan
   Chopsticks pinch a pest, lift it off the trail and carry it back the
   way it came. What they add to the engine:
     pinch      a pest in the air: it rises, is carried back along an arc
                and dropped on the trail further back (or, on the Gold
                path, thrown into the pests behind it, hitting them all)
     flicks     quick melee jabs (a hitscan with a little knockback)
   The Lazy Susan is a turntable that carries other appliances. Any
   appliance that walks the floor can ride it (not boats, aircraft or head
   chefs): placed over a free seat, it rides round as the board turns and
   attacks faster. Riders count as standing where they are drawn, at
   their seat.
   The engine calls in through utensilFire, airTick, utensilTick,
   utensilRefresh, utensilForget, utensilRoundEnd, runUtensilAbility and
   riderXp; placement through seatFor, seatXY, ridersOf and canRide.
   ===================================================================== */
const QU = [];

/* ---------------------------------------------------------------------
   Chopsticks
   --------------------------------------------------------------------- */
/* can these chopsticks lift this pest: small ones up to its tier, vehicles up to its vehicle tier, never a boss */
function liftable(e, a){
  if (e.dead || e.air || e.boss || e.burrowT > 0) return false;
  if (e.big) return (a.bigTier || 0) >= e.tier;
  return e.tier <= (a.tier || 0);
}
/* how far along its trail a pest is, from 0 at the entrance to 1 at the pantry */
function progressOf(e){ const P = G.paths[e.path]; return P ? e.d / Math.max(1, P.len) : 0; }
function firePinch(t, a, id){
  const list = acquireN(t, attackRange(t, a), a, a.mode || t.tg, a.n || 1, e => liftable(e, a));
  if (!list.length) return false;
  for (const e of list) pinch(t, a, e);
  setAim(t, id, Math.atan2(list[0].y - t.y, list[0].x - t.x));
  t.fireAnim = 0.3;
  if (id !== 'main') t.fire2 = 0.3;
  Hooks.sfx('clack');
  return true;
}
/* where a thrown pest lands: among the pests behind it in range, the toughest (aim 'strong') or the most crowded spot */
function tossSpot(tw, a, e){
  const T = a.toss, me = progressOf(e);
  const near = query(tw.x, tw.y, attackRange(tw, a) * 1.25, QU).filter(o => o !== e && !o.dead && !o.air && o.burrowT <= 0 && onScreen(o) && progressOf(o) <= me + 0.004);
  if (!near.length) return null;
  let best = null, bs = -Infinity;
  for (const o of near.slice(0, 48)){
    let sc;
    if (T.aim === 'strong') sc = (o.boss ? 4e12 : 0) + (o.big ? 2e12 : 0) + o.tier * 1e9 + Math.min(o.hp, 9e8);
    else { sc = 0; for (const q of near) if ((q.x - o.x) ** 2 + (q.y - o.y) ** 2 <= T.r * T.r) sc++; sc -= progressOf(o) * 0.5; }
    if (sc > bs){ bs = sc; best = o; }
  }
  return best ? { path: best.path, d: best.d, x: best.x, y: best.y } : null;
}
/* lift a pest: it leaves the trail and flies back along an arc */
function pinch(tw, a, e){
  let path = e.path, d1;
  const T = a.toss ? tossSpot(tw, a, e) : null;
  if (T){ path = T.path; d1 = T.d; }
  else d1 = Math.max(0, e.d - (e.big ? (a.bigBack != null ? a.bigBack : a.back * 0.5) : a.back));
  const q = pathPos(G.paths[path], d1, path === e.path ? e.seg : 0);
  const far = Math.hypot(q.x - e.x, q.y - e.y);
  e.air = { x0: e.x, y0: e.y, x1: q.x, y1: q.y, d0: e.d, d1, p0: e.path, p1: path, t: 0,
    dur: (a.carry || 0.55) * (e.big ? 1.25 : 1) + Math.min(0.6, far / 900), h: Math.min(90, (e.big ? 26 : 18) + far * 0.12),
    tw, a, toss: !!a.toss, spin: (Math.random() < 0.5 ? -1 : 1) * (a.toss ? 14 : 3), look: sticksLook(tw) };
  e.z = 0;
  tw.lifts = (tw.lifts || 0) + 1;
  if (e.holdT > 0){ e.holdT = 0; e.hold = null; }   // plucked out of whatever held it
  /* lifting is what chopsticks are for: it counts toward their mastery, more for bigger pests */
  if (!G.attract) G.xp[tw.type] = (G.xp[tw.type] || 0) + (4 + e.tier * 3) * (e.big ? 3 : 1) * G.xpMult;
  if (tw.sys && tw.sys.focus != null) tw.sys.focus++;
}
/* the look of the chopsticks holding a pest in the air, from the path they are furthest along */
function sticksLook(tw){
  if (!tw || !tw.up) return 'plain';
  if (tw.paragon) return 'grand';
  let p = -1, m = 0;
  for (let i = 0; i < 3; i++) if (tw.up[i] > m){ m = tw.up[i]; p = i; }
  return p === 0 ? 'bamboo' : p === 1 ? (m >= 4 ? 'ebony' : 'lacquer') : p === 2 ? 'gold' : 'plain';
}
/* a pest in the air (the engine skips its walk while this returns true) */
function airTick(e, dt){
  const A = e.air;
  A.t += dt;
  const q = Math.min(1, A.t / A.dur), s = q * q * (3 - 2 * q);
  e.x = A.x0 + (A.x1 - A.x0) * s; e.y = A.y0 + (A.y1 - A.y0) * s;
  e.z = Math.sin(q * Math.PI) * A.h;
  if (A.p0 === A.p1) e.d = A.d0 + (A.d1 - A.d0) * s;
  e.rot += A.spin * dt;
  if (q >= 1) landPest(e);
  return true;
}
function landPest(e){
  const A = e.air;
  e.air = null; e.z = 0;
  e.path = A.p1; e.d = A.d1;
  const pos = pathPos(G.paths[e.path], e.d, 0);
  e.x = pos.x; e.y = pos.y; e.seg = pos.seg; e.ang = pos.ang;
  const a = A.a, tw = A.tw;
  if (A.toss && a.toss) tossImpact(e.x, e.y, a.toss, tw, e);
  if (!e.dead && (a.dmg > 0 || (e.big && a.bonusBig))) damage(e, a.dmg || 0, a.type || 'normal', tw, a);
  if (!e.dead && a.daze && !e.big) stunE(e, a.daze);
  if (G.vis){
    for (let i = 0; i < (e.big ? 10 : 4); i++){ const an = rand(0, TAU), v = rand(30, 90); part(e.x, e.y, Math.cos(an) * v, Math.sin(an) * v * 0.5, 0.35, '#e8dcc4', 2.5, 'dust'); }
    if (!A.toss && e.big) G.shake = Math.max(G.shake, 0.12);
  }
}
/* a thrown pest lands among others: everything near takes the hit, the pest thrown most of all */
function tossImpact(x, y, T, tw, thrown){
  const list = query(x, y, T.r, QU).filter(o => !o.dead && !o.air && o.burrowT <= 0).sort((p, q) => ((p.x - x) ** 2 + (p.y - y) ** 2) - ((q.x - x) ** 2 + (q.y - y) ** 2));
  if (thrown && !thrown.dead && list.indexOf(thrown) < 0) list.unshift(thrown);
  let n = 0;
  for (const o of list){
    if (n >= T.pierce) break;
    if (o.dead) continue;
    if (T.midas) o.cashMul = Math.max(o.cashMul || 1, T.midas);
    damage(o, o === thrown && T.self ? T.dmg * T.self : T.dmg, T.type || 'normal', tw, T);
    if (!o.dead) applyFx(o, T, tw);
    n++;
  }
  if (G.vis){
    G.fx.push({ k:'ring', x, y, r0: 6, r1: T.r + 8, t: 0, life: 0.35, c: T.midas ? '#ffd166' : '#fff2d6', w: T.r > 40 ? 5 : 3 });
    if (T.midas && !lowFx()) for (let i = 0; i < 10; i++){ const an = rand(0, TAU), v = rand(50, 150); part(x, y, Math.cos(an) * v, Math.sin(an) * v, 0.6, i % 2 ? '#ffd166' : '#fff4c2', 3, 'spark'); }
    if (T.r >= 46) G.shake = Math.max(G.shake, 0.22);
  }
  Hooks.sfx('thunk');
}

/* ---------------------------------------------------------------------
   The Lazy Susan
   --------------------------------------------------------------------- */
const RIDER_SC = 0.72;            // riders are drawn a little smaller, to fit on the board
const SEAT_R = [0, 0, 12, 14, 16]; // how far from the middle the seats are, by how many there are
/* how small a rider is drawn: smaller still on a crowded board */
function riderScale(t){ const n = t && t.on ? seatCount(t.on) : 1; return n >= 4 ? 0.66 : n === 3 ? 0.6 : n === 2 ? 0.66 : RIDER_SC; }
function canRide(type){ const T = TOWERS[type]; return !!T && type !== 'susan' && !T.hero && !T.flyer && !T.water; }
function ridersOf(s){ const out = []; for (const t of G.towers) if (t.on === s) out.push(t); return out; }
function seatCount(s){ return Math.max(1, Math.min(4, (s.s && s.s.seats) || 1)); }
function boardR(s){ return s.size * (s.paragon ? 1.25 : 1); }
/* where seat i of a turntable is right now */
function seatXY(s, i, n){
  n = n || seatCount(s);
  if (n <= 1) return { x: s.x, y: s.y };
  const an = (s.spinA || 0) + i / n * TAU, r = SEAT_R[n] * (s.paragon ? 1.25 : 1);
  return { x: s.x + Math.cos(an) * r, y: s.y + Math.sin(an) * r };
}
/* a free seat on a turntable under (x, y) for an appliance of this type, the nearest one: { tw, i } */
function seatFor(type, x, y){
  if (!canRide(type) || !G.towers) return null;
  let best = null, bd = Infinity;
  for (const s of G.towers){
    if (s.type !== 'susan' || !s.s || s.on) continue;
    if (Math.hypot(s.x - x, s.y - y) > boardR(s) + 4) continue;
    const n = seatCount(s), used = new Set(ridersOf(s).map(r => r.seat));
    for (let i = 0; i < n; i++){
      if (used.has(i)) continue;
      const p = seatXY(s, i, n), q = Math.hypot(p.x - x, p.y - y);
      if (q < bd){ bd = q; best = { tw: s, i }; }
    }
  }
  return best;
}
/* puts an appliance on a seat */
function seatOn(t, s, i){
  t.on = s; t.seat = i;
  const p = seatXY(s, i);
  t.x = p.x; t.y = p.y;
}
/* every rider in a seat that exists and isn't taken twice; the rest step off where they are */
function seatCheck(){
  let changed = false;
  for (const s of G.towers){
    if (s.type !== 'susan') continue;
    const n = seatCount(s), used = new Set();
    for (const r of ridersOf(s)){
      if (!(r.seat >= 0 && r.seat < n) || used.has(r.seat)){
        let free = -1;
        for (let i = 0; i < n; i++) if (!used.has(i) && !ridersOf(s).some(o => o !== r && o.seat === i)){ free = i; break; }
        if (free < 0){ r.on = null; r.seat = null; changed = true; continue; }
        r.seat = free; changed = true;
      }
      used.add(r.seat);
      seatOn(r, s, r.seat);
    }
  }
  for (const t of G.towers) if (t.on && (G.towers.indexOf(t.on) < 0 || t.on.type !== 'susan')){ t.on = null; t.seat = null; changed = true; }
  return changed;
}
/* a turntable turns all the time; its riders go round with it */
function utensilTick(dt){
  let boards = false;
  for (const s of G.towers){
    if (s.type !== 'susan') continue;
    boards = true;
    const spin = (s.s && s.s.spin) || 1, wind = s.sys && s.sys.wind ? s.sys.wind : 0;
    s.spinA = ((s.spinA || 0) + dt * 0.5 * spin * (1 + wind) * (s.boost.fullspin ? 2 : 1)) % TAU;
  }
  let lost = false;
  for (const t of G.towers){
    if (!t.on) continue;
    /* its turntable is gone (merged into a carousel): it steps off where it stands */
    if (!boards || G.towers.indexOf(t.on) < 0){ t.on = null; t.seat = null; t.spinSp = 0; lost = true; continue; }
    const p = seatXY(t.on, t.seat);
    t.x = p.x; t.y = p.y;
  }
  if (lost) refreshTowers();
}
/* after the appliances are rebuilt: what riding a turntable gives each rider */
function utensilRefresh(){
  for (const t of G.towers){
    if (!t.on || !t.s || t.s._ride) continue;
    const S = t.on.s;
    if (!S || G.towers.indexOf(t.on) < 0) continue;
    const b = { speed: S.spin || 1, polar: 1, pierce: S.riderPierce || 0, dmg: S.riderDmg || 0, range: S.riderRange || 1, camo: !!S.riderCamo, allTypes: false };
    applyBuff(t.s, b);
    t.s._ride = true;
    t.buffs = Object.assign({}, t.buffs, { ride: S.spin || 1, rideRange: S.riderRange || 1 });
    if (S.riderEnergize) t.buffs.energize = Math.max(t.buffs.energize || 0, S.riderEnergize);
    for (const ab of t.s.abilities) if (t.ab[ab.id] == null) t.ab[ab.id] = ab.cd * 0.35;
  }
}
/* damage a rider deals teaches its turntable a little too */
function riderXp(tw, dealt){ if (!G.attract && tw.on) G.xp.susan = (G.xp.susan || 0) + dealt * 0.25 * G.xpMult; }
/* a turntable sold: what rides on it is sold with it (sellTower does the selling); chopsticks sold mid-lift let go */
function utensilForget(t){
  for (const e of G.enemies) if (e.air && e.air.tw === t) e.air.tw = null;
}
function utensilRoundEnd(){
  /* a turntable earns a little every round, like a support appliance */
  if (G.attract) return;
  for (const t of G.towers) if (t.type === 'susan' && !t.paragon) G.xp.susan = (G.xp.susan || 0) + (10 + G.round * 2) * G.xpMult;
}

/* ---------------------------------------------------------------------
   Their own kind of attack
   --------------------------------------------------------------------- */
function utensilFire(t, a, id){
  switch (a.kind){
    case 'pinch': return firePinch(t, a, id);
  }
  return sprayFire(t, a, id);
}

/* ---------------------------------------------------------------------
   Paragon systems: the Grandmaster's focus and the Carousel's wind-up
   --------------------------------------------------------------------- */
PARA.chopsticks = {
  init: () => ({ focus: 0, pinches: 0 }),
  tick(t, dt){
    const S = t.sys, f = t.s && t.s.focus;
    if (!f || S.focus < f.need || !G.roundActive || t.stunT > 0) return;
    /* full focus: the toughest pests on screen go back to the entrance at once */
    if (grandPinch(t, { n: 2, hold: 1 }, true)){ S.focus = 0; S.pinches++; }
    else S.focus = f.need;
  },
  round(t, when){ if (when === 'start') t.sys.pinches = 0; },
  save: S => ({ f: Math.round(S.focus || 0) }),
  load(S, d){ S.focus = clamp(Math.floor(+d.f || 0), 0, 999); },
};
PARA.susan = {
  init: () => ({ wind: 0 }),
  tick(t, dt){
    const S = t.sys, w = t.s && t.s.windup;
    if (!w) return;
    if (G.roundActive && G.enemies.some(e => !e.dead)) S.wind = Math.min(w.max, S.wind + w.per * dt);
    for (const r of ridersOf(t)) r.spinSp = 1 + S.wind;
  },
  round(t, when){ if (when === 'start'){ t.sys.wind = 0; for (const r of ridersOf(t)) r.spinSp = 1; } },
  save: S => ({ w: Math.round((S.wind || 0) * 1000) / 1000 }),
  load(S, d){ S.wind = clamp(+d.w || 0, 0, 5); },
};
function utensilParaBar(t){
  const S = t.sys, s = t.s;
  if (t.type === 'chopsticks'){ const need = (s.focus && s.focus.need) || 30; return { v: S.focus / need, c: '#ffd166' }; }
  if (t.type === 'susan'){ const w = s.windup || { max: 0.6 }; return { v: S.wind / w.max, c: '#e8b04a' }; }
  if (t.type === 'spray') return sprayParaBar(t);
  return null;
}
function utensilParaUI(t){
  const S = t.sys, s = t.s;
  if (t.type === 'chopsticks'){
    const need = (s.focus && s.focus.need) || 30;
    return { title:'Focus', meter: { v: S.focus / need, c: '#ffd166', text: Math.min(S.focus, need) + ' of ' + need + ' pests lifted' },
      lines: ['Every pest it lifts sharpens its focus. At ' + need + ', it picks up the 2 toughest pests on screen, vehicles included, and carries them back to the entrance. Bosses are held for a second.',
        'Focus pinches this round: ' + (S.pinches || 0) + '.'] };
  }
  if (t.type === 'susan'){
    const w = s.windup || { per: 0.03, max: 0.6 };
    return { title:'Wind-up', meter: { v: S.wind / w.max, c: '#e8b04a', text: '+' + Math.round(S.wind * 100) + '% of +' + Math.round(w.max * 100) + '%' },
      lines: ['The longer a round runs, the faster the carousel turns: its riders attack ' + Math.round(w.per * 100) + '% faster for every second, up to ' + Math.round(w.max * 100) + '%. It winds down again when the next round starts.'] };
  }
  if (t.type === 'spray') return sprayParaUI(t);
  return null;
}

/* ---------------------------------------------------------------------
   Abilities: Flurry, Full Spin, Gravy Flood and Grand Pinch
   --------------------------------------------------------------------- */
/* the toughest pests on screen (vehicles first) lifted back to the entrance; bosses held where they are */
function grandPinch(t, ab, quiet){
  const on = pestsOnScreen().filter(e => !e.air);
  const list = toughestN(ab.n || 3, on.filter(e => !e.boss));
  const bosses = on.filter(e => e.boss).slice(0, 2);
  if (!list.length && !bosses.length) return false;
  const spec = { carry: 0.9, back: 99999, bigBack: 99999, dmg: 0, type: 'normal' };
  for (const e of list){
    pinch(t, spec, e);
    if (e.air) e.air.h = Math.max(e.air.h, 70);
  }
  for (const e of bosses){ e.holdT = Math.max(e.holdT, ab.hold || 1.5); e.hold = { k:'pinch', tw: t, dur: ab.hold || 1.5, look: sticksLook(t) }; e.grabImm = 6; }
  if (G.vis){ G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 160, t: 0, life: 0.5, c: '#ffd166', w: 5 }); if (!quiet) G.shake = Math.max(G.shake, 0.25); }
  Hooks.sfx(quiet ? 'clack' : 'ability');
  return true;
}
function runUtensilAbility(t, ab){
  switch (ab.id){
    case 'flurry': {
      t.boost.flurry = { mult: ab.mult, t: ab.dur };
      if (G.vis){ G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 8, r1: 120, t: 0, life: 0.5, c: '#9fd36a', w: 4 }); for (let i = 0; i < 14; i++){ const an = rand(0, TAU), v = rand(60, 160); part(t.x, t.y, Math.cos(an) * v, Math.sin(an) * v, 0.45, i % 2 ? '#9fd36a' : '#e6c592', 3, 'spark'); } }
      Hooks.sfx('whoosh');
      return true;
    }
    case 'fullspin': {
      const riders = ridersOf(t);
      if (!riders.length) return false;
      for (const r of riders) r.boost.fullspin = { mult: ab.mult, t: ab.dur };
      t.boost.fullspin = { mult: 1, t: ab.dur };
      if (G.vis){ G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 90, t: 0, life: 0.6, c: '#e8b04a', w: 5 }); G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 20, r1: 140, t: 0.1, life: 0.6, c: '#fff4c2', w: 3 }); }
      Hooks.sfx('whirl');
      return true;
    }
    case 'gravyflood': {
      const R = t.s.range * (ab.rangeMul || 2.5), list = G.enemies.filter(e => !e.dead && e.burrowT <= 0 && Math.hypot(e.x - t.x, e.y - t.y) <= R + e.r);
      if (!list.length) return false;
      const o = { bonusBig: ab.bonusBig || 0, ignoreImmune: true };
      for (const e of list){
        damage(e, ab.dmg, 'heat', t, o);
        if (e.dead) continue;
        slowE(e, e.big ? ab.bigSlow : ab.slow, ab.dur);
        addBurn(e, { dmg: Math.max(1, Math.round(ab.dmg / 30)), tick: 0.5, dur: ab.dur }, t, true);
      }
      if (G.vis){ G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 12, r1: R, t: 0, life: 0.7, c: '#8a4a1f', w: 9 }); G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 12, r1: R * 0.8, t: 0.08, life: 0.6, c: '#c9762a', w: 5 }); G.shake = Math.max(G.shake, 0.3); }
      Hooks.sfx('splash');
      return true;
    }
    case 'grandpinch': return grandPinch(t, ab, false);
  }
  return null;
}
