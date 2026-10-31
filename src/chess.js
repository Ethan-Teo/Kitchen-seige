'use strict';
/* =====================================================================
   Kitchen Siege — the Chess Set
   A pawn on a square of a chess board. Each path promotes it to another
   piece, and its paragon is the Queen. What it adds to the engine:
     slides     a piece sweeps a line through the pest it targets: rooks
                along the row or the column, bishops along a diagonal
                (later bouncing off the kitchen walls), pawns one square
                off on the diagonal, queens along all four lines at once
     back rank  a rook's slides hit twice as hard near the pantry
     leaps      knights jump onto pests in an L, stomp where they land,
                fork the toughest pests nearby and tour on from pest to pest
     the board  Colour Complex: pests standing on the dark squares of the
                kitchen floor take more damage from everything
     pawns      the Queen's pawns march up the trail from the pantry; one
                that makes it to the far end is promoted to a queen
   The engine calls in through chessFire, chessTick, chessFinish,
   chessRefresh, chessRoundEnd, chessForget, pawnDone and runChessAbility,
   and damage() asks onDark().
   ===================================================================== */
const QK = [];
const SQ = 40;   // the kitchen floor is a chessboard of 40 px squares
const RT2 = Math.SQRT1_2;
const SLIDE_SETS = {
  pawn:   [[RT2, -RT2], [RT2, RT2]],
  rook:   [[1, 0], [0, 1]],
  bishop: [[RT2, -RT2], [RT2, RT2]],
  queen:  [[1, 0], [0, 1], [RT2, -RT2], [RT2, RT2]],
};
const PIECE_GLOW = { pawn:'#fff1cf', rook:'#ff8a5c', bishop:'#ffd166', knight:'#7fe0c8', queen:'#d7a6ff' };
const KNIGHT_MOVE = SQ * Math.sqrt(5);   // two squares one way and one the other

/* the dark squares of the kitchen floor */
function onDark(x, y){ return ((Math.floor(x / SQ) + Math.floor(y / SQ)) & 1) === 1; }

/* ---------------------------------------------------------------------
   Slides: a line through the target, the way the piece moves
   --------------------------------------------------------------------- */
/* one way along a line from (x, y): to its reach, or to the kitchen wall, bouncing off it `bounce` times */
function slideRay(x, y, dx, dy, reach, bounce, out){
  let left = reach > 0 ? reach : 1e9, b = bounce || 0, off = 0;
  for (let guard = 0; guard < 12; guard++){
    let k = 1e9;
    if (dx > 1e-9) k = Math.min(k, (W - x) / dx); else if (dx < -1e-9) k = Math.min(k, -x / dx);
    if (dy > 1e-9) k = Math.min(k, (H - y) / dy); else if (dy < -1e-9) k = Math.min(k, -y / dy);
    const L = Math.min(left, Math.max(0, k));
    if (L > 0.5) out.push({ x1: x, y1: y, x2: x + dx * L, y2: y + dy * L, ux: dx, uy: dy, len: L, off });
    off += L; left -= L;
    if (left <= 0.5 || b <= 0) break;
    x += dx * L; y += dy * L;
    const hx = (dx > 1e-9 && x >= W - 0.5) || (dx < -1e-9 && x <= 0.5);
    const hy = (dy > 1e-9 && y >= H - 0.5) || (dy < -1e-9 && y <= 0.5);
    if (!hx && !hy) break;
    if (hx) dx = -dx;
    if (hy) dy = -dy;
    b--;
  }
}
/* both ways along one line through (x, y) */
function slideLine(x, y, u, a){
  const out = [];
  const reach = a.full ? 0 : (a.reach || 80);
  slideRay(x, y, u[0], u[1], reach, a.bounce, out);
  slideRay(x, y, -u[0], -u[1], reach, a.bounce, out);
  return out;
}
/* every pest along those lines, nearest the target first */
function slideHits(segs, a){
  const w = (a.width || 20) * 0.5, out = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of segs){ x0 = Math.min(x0, s.x1, s.x2); x1 = Math.max(x1, s.x1, s.x2); y0 = Math.min(y0, s.y1, s.y2); y1 = Math.max(y1, s.y1, s.y2); }
  const pad = w + 60;
  for (const e of G.enemies){
    if (e.dead || e.burrowT > 0 || !onScreen(e)) continue;
    if (e.x < x0 - pad || e.x > x1 + pad || e.y < y0 - pad || e.y > y1 + pad) continue;
    let best = Infinity;
    for (const s of segs){
      const px = e.x - s.x1, py = e.y - s.y1, al = px * s.ux + py * s.uy;
      if (al < -e.r || al > s.len + e.r) continue;
      if (Math.abs(px * s.uy - py * s.ux) > e.r + w) continue;
      const d = s.off + Math.max(0, al);
      if (d < best) best = d;
    }
    if (best < Infinity) out.push([best, e]);
  }
  out.sort((p, q) => p[0] - q[0]);
  return out;
}
/* near the pantry a rook's slide hits twice as hard: the pest is on its back rank */
function slideSpec(a, e){
  if (!a.back) return a;
  const P = G.paths[e.path];
  if (!P || P.len - e.d > P.len * a.back.frac) return a;
  if (!a._back || a._backK !== a.dmg){
    const m = a.back.mul;
    a._back = Object.assign({}, a, { dmg: a.dmg * m, bonusBig: (a.bonusBig || 0) * m, bonusBoss: (a.bonusBoss || 0) * m, back: null, _back: null });
    a._backK = a.dmg;
  }
  return a._back;
}
/* a slide from src (an appliance or a promoted queen) through the pest tg; damage goes to tw */
function slideAt(src, tw, a, tg){
  const x = clamp(tg.x, 1, W - 1), y = clamp(tg.y, 1, H - 1);
  const set = SLIDE_SETS[a.dirs] || SLIDE_SETS.rook;
  let lines = set.map(u => { const segs = slideLine(x, y, u, a); return { segs, hits: slideHits(segs, a) }; });
  if (!a.cross && lines.length > 1){
    /* one line: the one that catches the most */
    let best = lines[0];
    for (const L of lines) if (Math.min(L.hits.length, a.pierce) > Math.min(best.hits.length, a.pierce)) best = L;
    lines = [best];
  }
  let n = 0;
  for (const L of lines){
    let k = 0;
    for (const [, e] of L.hits){
      if (k >= a.pierce) break;
      if (e.dead) continue;
      applyHit(e, slideSpec(a, e), tw);
      k++;
    }
    n += k;
  }
  if (G.vis){
    const segs = [];
    for (const L of lines) for (const s of L.segs) segs.push([s.x1, s.y1, s.x2, s.y2]);
    G.fx.push({ k:'slide', segs, x, y, x0: src.x, y0: src.y, piece: a.piece || 'rook', c: a.color || PIECE_GLOW[a.piece] || '#ffd166', w: Math.min(a.width || 20, 30), t:0, life: lowFx() ? 0.18 : 0.3 });
  }
  return n;
}
function fireSlide(t, a, id){
  const tg = acquire(t, attackRange(t, a), a, a.mode);
  if (!tg) return false;
  slideAt(t, t, a, tg);
  setAim(t, id, Math.atan2(tg.y - t.y, tg.x - t.x));
  t.fireAnim = 0.2;
  Hooks.sfx('clack');
  return true;
}

/* ---------------------------------------------------------------------
   Leaps: a knight jumps in an L onto a pest, stomps, forks and tours on
   --------------------------------------------------------------------- */
function leapsOf(t){ let n = 0; for (const L of G.leaps) if (L.tw === t) n++; return n; }
function fireLeap(t, a, id){
  if (leapsOf(t) >= (a.max || 3)) return false;
  const R = attackRange(t, a), n = a.count || 1;
  const list = n > 1 ? acquireN(t, R, a, a.mode || t.tg, n) : [acquire(t, R, a, a.mode)].filter(Boolean);
  if (!list.length) return false;
  list.forEach((tg, i) => {
    const p = predictPos(tg, a.travel || 0.36);
    startLeap(t, a, t.x, t.y - 6, p.x, p.y, (a.travel || 0.36) + i * 0.05, a.tour || 0, new Set([tg.id]));
  });
  setAim(t, id, Math.atan2(list[0].y - t.y, list[0].x - t.x));
  t.fire2 = 0.3;
  Hooks.sfx('whoosh');
  return true;
}
function startLeap(tw, a, x0, y0, x1, y1, dur, left, seen){
  if (G.leaps.length >= 200) return;
  x1 = clamp(x1, 4, W - 4); y1 = clamp(y1, 4, H - 4);
  G.leaps.push({ x0, y0, x1, y1, x: x0, y: y0, z: 0, t: 0, dur, spec: a, tw, left, seen, face: x1 < x0 ? -1 : 1, seed: Math.random() * 10 });
}
/* where a knight is along its L: the long leg first, then the short one, up in the air on the way */
function leapPos(L){
  const k = clamp(L.t / L.dur, 0, 1), dx = L.x1 - L.x0, dy = L.y1 - L.y0;
  const longX = Math.abs(dx) >= Math.abs(dy), l1 = longX ? Math.abs(dx) : Math.abs(dy), l2 = longX ? Math.abs(dy) : Math.abs(dx);
  const tot = Math.max(1, l1 + l2), s = k * tot;
  if (s <= l1){ const f = l1 > 0 ? s / l1 : 1; L.x = L.x0 + (longX ? dx * f : 0); L.y = L.y0 + (longX ? 0 : dy * f); }
  else { const f = l2 > 0 ? (s - l1) / l2 : 1; L.x = L.x0 + (longX ? dx : dx * f); L.y = L.y0 + (longX ? dy * f : dy); }
  L.z = Math.sin(k * Math.PI) * (18 + tot * 0.07);
}
function leapTick(L, dt){
  L.t += dt;
  if (G.towers.indexOf(L.tw) < 0){ L.done = true; return; }
  leapPos(L);
  if (L.t >= L.dur){ L.done = true; landLeap(L); }
}
const STOMP_O = {};
function stomp(x, y, ex, tw){
  const list = query(x, y, ex.r, QK);
  if (list.length > ex.pierce) list.sort((p, q) => ((p.x - x) ** 2 + (p.y - y) ** 2) - ((q.x - x) ** 2 + (q.y - y) ** 2));
  let n = 0;
  for (let i = 0; i < list.length && n < ex.pierce; i++){
    const e = list[i];
    if (e.dead) continue;
    damage(e, ex.dmg + (ex.dmg > 0 && tw && tw.dmgAdd ? tw.dmgAdd : 0), ex.type, tw, ex);
    if (!e.dead) applyFx(e, ex, tw);
    n++;
  }
  if (G.vis){
    G.fx.push({ k:'stomp', x, y, r: ex.r, t:0, life: 0.38, seed: Math.random() * 10 });
    if (!lowFx()) for (let i = 0; i < 5; i++){ const an = rand(0, TAU), v = rand(30, 80); part(x + Math.cos(an) * 6, y + Math.sin(an) * 6, Math.cos(an) * v, Math.sin(an) * v - 10, 0.35, '#e7d9bd', 2.6, 'dust'); }
  }
  return n;
}
/* the toughest pests within reach of where the knight landed: it attacks two at once */
function forkAt(x, y, f, tw){
  const cand = [];
  for (const e of query(x, y, f.r, QK)){
    if (e.dead || e.burrowT > 0 || !onScreen(e)) continue;
    if (e.camo && !(tw.s && tw.s.camo)) continue;
    cand.push(e);
  }
  if (!cand.length) return 0;
  const sc = e => (e.boss ? 4e12 : 0) + (e.big ? 2e12 : 0) + e.tier * 1e9 + Math.min(e.hp, 9e8);
  cand.sort((p, q) => sc(q) - sc(p));
  const n = Math.min(f.n || 2, cand.length), to = [];
  for (let i = 0; i < n; i++){ const e = cand[i]; to.push([e.x, e.y]); applyHit(e, f, tw); }
  if (G.vis) G.fx.push({ k:'fork', x, y, to, t:0, life: 0.4 });
  return n;
}
/* the next square on the tour: a pest it hasn't landed on, as near a knight's move away as can be */
function nextHop(L){
  const a = L.spec, tw = L.tw;
  let best = null, bs = Infinity;
  for (const e of query(L.x1, L.y1, a.hop || 110, QK)){
    if (e.dead || e.burrowT > 0 || !onScreen(e) || L.seen.has(e.id)) continue;
    if (e.camo && !(tw.s && tw.s.camo)) continue;
    const d = Math.abs(Math.hypot(e.x - L.x1, e.y - L.y1) - KNIGHT_MOVE);
    if (d < bs){ bs = d; best = e; }
  }
  return best;
}
function landLeap(L){
  const a = L.spec, tw = L.tw;
  if (!tw.s) return;
  if (a.impact) stomp(L.x1, L.y1, a.impact, tw);
  if (a.fork) forkAt(L.x1, L.y1, a.fork, tw);
  Hooks.sfx('clop');
  if (L.left > 0){
    const e = nextHop(L);
    if (e){
      L.seen.add(e.id);
      const dur = a.hopTime || 0.24, p = predictPos(e, dur);
      startLeap(tw, a, L.x1, L.y1, p.x, p.y, dur, L.left - 1, L.seen);
    }
  }
}

/* ---------------------------------------------------------------------
   The Queen's pawns: they march up the trail from the pantry, and one that
   reaches the far end is promoted to a queen beside the trail
   --------------------------------------------------------------------- */
function pawnsOf(t){ let n = 0; for (const w of G.whirls) if (w.pawn && w.tw === t) n++; return n; }
function marchPawn(t, P){
  const pts = trailPoints();
  if (!pts.length) return false;
  const pi = (t.sys.lane = ((t.sys.lane || 0) + 1) % G.paths.length);
  let first = null, last = null;
  for (const p of pts){ if (p.path !== pi) continue; if (!first || p.d < first.d) first = p; if (!last || p.d > last.d) last = p; }
  if (!first || !last || last.d - first.d < 80) return false;
  const q = pathPos(G.paths[pi], last.d, 0);
  G.whirls.push({ path: pi, d: last.d, seg: q.seg, x: q.x, y: q.y, r: 11, speed: P.speed, left: last.d - first.d, spec: P.hit, tw: t, hit: new Set(), pierce: P.pierce, t: 0,
    seed: Math.random() * 10, pawn: true, pmax: P.pierce });
  return true;
}
/* called by the engine when a pawn stops marching: if it got all the way, it is promoted */
function pawnDone(w){
  if (!(w.left <= 0 && w.pierce > 0)) return;
  const t = w.tw, P = t && t.s && t.s.pawns;
  if (!P || G.towers.indexOf(t) < 0) return;
  if (t.sys) t.sys.made = (t.sys.made || 0) + 1;
  const mine = G.queens.filter(q => q.tw === t);
  if (mine.length >= P.max){ mine.sort((a, b) => a.life - b.life); mine[0].done = true; }
  const sg = G.paths[w.path].segs[w.seg], ang = sg ? sg.ang : 0;
  let spot = besideTrail(w.x, w.y, ang, Math.random() < 0.5 ? -1 : 1);
  if (!spot.ok) spot = besideTrail(w.x, w.y, ang, 1);
  G.queens = G.queens.filter(q => !q.done);
  G.queens.push({ x: spot.x, y: spot.y, x0: w.x, y0: w.y, tw: t, life: P.life, max: P.life, cd: 0.4, t: 0, id: G.nextId++ });
  if (G.vis){
    G.fx.push({ k:'ring', x: spot.x, y: spot.y, r0: 6, r1: 46, t:0, life:0.6, c:'#d7a6ff', w:4 });
    fxText(spot.x, spot.y - 26, 'PROMOTED', '#e9d2ff', 1.1, 13);
    if (!lowFx()) for (let i = 0; i < 12; i++){ const an = rand(0, TAU), v = rand(30, 110); part(spot.x, spot.y, Math.cos(an) * v, Math.sin(an) * v - 20, 0.6, i % 2 ? '#ffd166' : '#e9d2ff', 3, 'spark'); }
  }
  Hooks.sfx('rank');
}
function queenTick(q, dt){
  q.t += dt; q.life -= dt;
  const t = q.tw, P = t && t.s && t.s.pawns;
  if (q.life <= 0 || !P || G.towers.indexOf(t) < 0){ q.done = true; return; }
  if (q.t < 0.35) return;
  q.cd -= dt * towerSpeed(t);
  if (q.cd > 0) return;
  const a = P.queen;
  const me = q.me || (q.me = { x: q.x, y: q.y, tg: 'first', s: null });
  me.s = t.s;
  const tg = acquire(me, a.range || 240, a, 'first');
  if (!tg){ q.cd = 0.1; return; }
  q.cd = a.rate;
  q.fire = 0.25;
  slideAt(q, t, a, tg);
  if (G.vis && Math.random() < 0.4) Hooks.sfx('clack');
}

/* ---------------------------------------------------------------------
   Engine hooks
   --------------------------------------------------------------------- */
function chessFire(t, a, id){
  switch (a.kind){
    case 'slide': return fireSlide(t, a, id);
    case 'leap': return fireLeap(t, a, id);
    case 'elements': return fireElements(t, a, id);
  }
  return utensilFire(t, a, id);
}
/* promoted: the pawn's jab gives way to its pieces */
function chessFinish(s){
  if (s.atk.rook || s.atk.bishop || s.atk.knight) delete s.atk.main;
}
/* after the appliances are rebuilt: which board is down, if any */
function chessRefresh(){
  let m = 1;
  for (const t of G.towers) if (t.s && t.s.board && t.s.board.mul > m) m = t.s.board.mul;
  G.board = m > 1 ? { mul: m } : null;
}
function chessTick(dt){
  wallsTick(dt);
  for (const e of G.enemies){ if (e.poisonT > 0) e.poisonT -= dt; if (e.brandT > 0) e.brandT -= dt; }
  if (G.leaps.length){ for (const L of G.leaps) if (!L.done) leapTick(L, dt); G.leaps = G.leaps.filter(L => !L.done); }
  if (G.queens.length){ for (const q of G.queens){ if (q.fire > 0) q.fire -= dt; if (!q.done) queenTick(q, dt); } G.queens = G.queens.filter(q => !q.done); }
}
function chessRoundEnd(){
  G.queens = [];
  G.leaps = [];
}
/* the set is sold or merged: its leaping knights and its queens go with it */
function chessForget(t){
  if (G.chWalls) G.chWalls = G.chWalls.filter(w => w.tw !== t);
  G.leaps = G.leaps.filter(L => L.tw !== t);
  G.queens = G.queens.filter(q => q.tw !== t);
  utensilForget(t);
}

/* ---------------------------------------------------------------------
   The Checkmate Queen's system: pawns march while a round is on
   --------------------------------------------------------------------- */
PARA.chess = {
  init: () => ({ pawnT: 1, made: 0, lane: 0 }),
  tick(t, dt){
    const S = t.sys, P = t.s && t.s.pawns;
    if (!P || !G.roundActive || t.stunT > 0) return;
    S.pawnT -= dt;
    if (S.pawnT > 0) return;
    S.pawnT = P.every;
    if (pawnsOf(t) < P.cap && G.enemies.some(e => !e.dead && onScreen(e))) marchPawn(t, P);
  },
  round(t, when){ if (when === 'start') t.sys.made = 0; },
  save: S => ({ m: S.made || 0 }),
  load(S, d){ S.made = clamp(Math.floor(+d.m || 0), 0, 9999); },
};
function chessParaBar(t){
  if (t.type !== 'chess') return utensilParaBar(t);
  const P = t.s.pawns || { max: 4 };
  const n = G.queens.filter(q => q.tw === t).length;
  return { pips: true, n, max: P.max, c: '#d7a6ff' };
}
function chessParaUI(t){
  if (t.type !== 'chess') return utensilParaUI(t);
  const s = t.s, S = t.sys, P = s.pawns || { every: 2.5, max: 4, life: 20, pierce: 25 };
  const n = G.queens.filter(q => q.tw === t).length, marching = pawnsOf(t);
  const board = s.board ? Math.round((s.board.mul - 1) * 100) : 50;
  return { title:'The board', pips: { n, max: P.max, c: '#d7a6ff' },
    lines: ['Every ' + P.every + 's of a round a pawn marches up the trail from the pantry, hitting up to ' + P.pierce + ' pests on the way. A pawn that reaches the far end is promoted to a queen beside the trail for ' + P.life + 's, sweeping all four lines through the pests near it. Up to ' + P.max + ' queens at once.',
      'Pawns marching: ' + marching + ' · queens on the board: ' + n + ' · promoted this round: ' + ((S && S.made) || 0) + '.',
      'Colour Complex: every pest on a dark square of the kitchen floor takes ' + board + '% more damage from everything. Near the pantry, her slides hit twice as hard.'] };
}

/* ---------------------------------------------------------------------
   Abilities: Castle Crush, Cavalry Charge, Checkmate and Stalemate
   --------------------------------------------------------------------- */
/* a giant piece sweeps every trail from the pantry back to the entrance, reaching each pest in turn */
function trailSweep(t, ab, look){
  const list = pestsOnScreen();
  if (!list.length) return false;
  const big = { ignoreImmune: true, bonusBig: ab.bonusBig || 0 };
  list.forEach(e => G.timers.push({ t: 0.05 + clamp(1 - e.d / Math.max(1, G.paths[e.path].len), 0, 1) * 1.2, soft: true, fn: () => {
    if (e.dead || e.burrowT > 0) return;
    damage(e, ab.dmg, 'normal', t, big);
    if (e.dead || e.boss) return;
    if (!e.big){ knockE(e, ab.push || 0); if (ab.stun) stunE(e, ab.stun); }
    else if (ab.bigPush && e.type !== 'raccoon') knockE(e, ab.bigPush);
  } }));
  if (G.vis){ G.paths.forEach((P, i) => G.fx.push({ k: look, path: i, t:0, life:1.3, seed: Math.random() * 10 })); G.shake = Math.max(G.shake, 0.45); }
  return true;
}
function runChessAbility(t, ab){
  switch (ab.id){
    case 'castle': { const ok = trailSweep(t, ab, 'rookroll'); if (ok) Hooks.sfx('boom'); return ok; }
    case 'charge': { const ok = trailSweep(t, ab, 'cavalry'); if (ok) Hooks.sfx('whoosh'); return ok; }
    case 'checkmate': {
      /* the toughest vehicles on screen are checkmated: off the board for good. A boss is put in check */
      const on = pestsOnScreen();
      let list = toughestN(ab.n, on.filter(e => e.big && !e.boss));
      if (list.length < ab.n) list = list.concat(on.filter(e => e.boss).slice(0, ab.n - list.length));
      if (!list.length) return false;
      list.forEach((e, i) => {
        if (G.vis) G.fx.push({ k:'checkmate', x: e.x, y: e.y, e, t: -i * 0.12, life: 1, boss: !!e.boss });
        G.timers.push({ t: 0.55 + i * 0.12, soft: true, fn: () => {
          if (e.dead) return;
          if (e.boss){ damage(e, e.maxHp * ab.boss, 'normal', t, II_HIT); if (!e.dead) stunE(e, 2); }
          else { damage(e, e.hp + 1, 'normal', t, II_HIT); if (!e.dead) kill(e, t); }
          if (G.vis){ G.fx.push({ k:'ring', x: e.x, y: e.y, r0: e.r, r1: e.r + 40, t:0, life:0.45, c:'#d7a6ff', w:5 }); G.shake = Math.max(G.shake, 0.3); }
        } });
      });
      Hooks.sfx('ability');
      return true;
    }
    case 'stalemate': {
      /* nobody has a move: every pest on the map stops where it stands */
      const list = pestsOnScreen();
      if (!list.length) return false;
      for (const e of list) stunE(e, ab.dur);
      if (G.vis){ G.fx.push({ k:'flash', c:'rgba(120,90,180,0.28)', t:0, life:0.8 }); G.fx.push({ k:'stalemate', x: t.x, y: t.y, t:0, life:1.6 }); }
      Hooks.sfx('freeze');
      return true;
    }
  }
  return null;
}

/* ---------------------------------------------------------------------
   Gridlock: wall squares on the trail
   Every Chess Set drops wall squares on the stretch of trail in its range.
   A pest that reaches one stops and chews through it; hopping and flying
   pests go over. The board reshapes every round: the walls are rebuilt,
   whole, in new places.
   --------------------------------------------------------------------- */
const WALL_HP0 = 30, WALL_HP_ROUND = 6, WALL_GAP = 70;
function wallHp(W){ return Math.round((WALL_HP0 + WALL_HP_ROUND * G.round) * (W.hp || 1)); }
function chewRate(e){ return e.boss ? 600 : e.big ? 80 : 12; }
/* the trail spots in a set's range, as [path, d] */
function wallSpots(t){
  const out = [], R = t.s.range * 0.92;
  G.paths.forEach((P, pi) => {
    for (let d = 40; d < P.len - 40; d += 16){ const q = pathPos(P, d, 0); if (q.x > 4 && q.x < W - 4 && q.y > 4 && q.y < H - 4 && Math.hypot(q.x - t.x, q.y - t.y) <= R) out.push([pi, d]); }
  });
  return out;
}
function buildWalls(t){
  if (!G.chWalls) G.chWalls = [];
  G.chWalls = G.chWalls.filter(w => w.tw !== t);
  const W0 = t.s.walls;
  t.wallRound = G.round; t.wallN = W0 ? W0.n : 0;
  if (!W0 || !W0.n) return;
  const spots = wallSpots(t);
  for (let i = spots.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const x = spots[i]; spots[i] = spots[j]; spots[j] = x; }
  let pick = [];
  /* spread out where the trail allows, closer together where it doesn't */
  for (const gap of [WALL_GAP, 44, 28]){
    pick = [];
    for (const c of spots){
      if (pick.length >= W0.n) break;
      if (pick.some(o => o[0] === c[0] && Math.abs(o[1] - c[1]) < gap)) continue;
      if (G.chWalls.some(w => w.path === c[0] && Math.abs(w.d - c[1]) < 28)) continue;
      pick.push(c);
    }
    if (pick.length >= W0.n) break;
  }
  for (const [pi, d] of pick){
    const q = pathPos(G.paths[pi], d, 0), hp = wallHp(W0);
    G.chWalls.push({ tw: t, path: pi, d, x: q.x, y: q.y, ang: q.ang, hp, maxHp: hp, thorns: W0.thorns || 0, acc: 0, t: 0 });
    if (G.vis) G.fx.push({ k:'ring', x: q.x, y: q.y, r0: 4, r1: 26, t: 0, life: 0.4, c: '#f3e7cb', w: 3 });
  }
}
function wallsTick(dt){
  for (const t of G.towers){
    if (t.type !== 'chess' || !t.s || !t.s.walls) continue;
    if (t.wallRound !== G.round && G.roundActive) buildWalls(t);
    else if (t.wallN !== t.s.walls.n) buildWalls(t);
  }
  if (!G.chWalls || !G.chWalls.length) return;
  for (const w of G.chWalls) w.t += dt;
  const before = G.chWalls.length;
  G.chWalls = G.chWalls.filter(w => w.hp > 0 && G.towers.includes(w.tw));
  if (G.chWalls.length !== before) for (const t of G.towers) if (t.type === 'chess') t.wallN = t.s.walls ? t.s.walls.n : 0;
}
/* called as a pest moves from d0 to e.d: a standing wall in between stops it, and it chews */
function wallBlock(e, d0, dt){
  if (e.def.fly || e.hopT > 0 || e.burrowT > 0 || e.air || e.blowD > 0 || e.charmT > 0) return;
  for (const w of G.chWalls){
    if (w.path !== e.path || w.hp <= 0) continue;
    const front = w.d - e.r - 9;
    if (d0 <= front + 0.5 && e.d > front){
      e.d = front;
      w.hp -= chewRate(e) * dt;
      e.chewT = 0.2;
      if (w.thorns){ w.acc += dt; if (w.acc >= 0.5){ w.acc = 0; damage(e, w.thorns, 'normal', w.tw, { ignoreImmune: true }); } }
      if (w.hp <= 0){
        w.hp = 0;
        if (G.vis){ for (let i = 0; i < 10; i++){ const a = rand(0, TAU), v = rand(40, 120); part(w.x, w.y, Math.cos(a) * v, Math.sin(a) * v, 0.5, i % 2 ? '#3a2a1e' : '#f3e7cb', 3, 'spark'); } }
        Hooks.sfx('clack');
      }
      return;
    }
  }
}

/* ---------------------------------------------------------------------
   The Queen's elements: poison, brand, lightning and ice, in turn or all at once
   --------------------------------------------------------------------- */
const ELEMENTS = ['poison', 'brand', 'bolt', 'ice'];
const ELEMENT_COL = { poison:'#7ed957', brand:'#ff8a3d', bolt:'#ffe066', ice:'#9fe0ff' };
function fireElements(t, a, id){
  const range = t.s.range, list = [];
  for (const e of query(t.x, t.y, range, QK)) if (canTarget(t, e, a) && Math.hypot(e.x - t.x, e.y - t.y) <= range + e.r) list.push(e);
  if (!list.length) return false;
  t.elI = ((t.elI || 0) + 1) % 4;
  const els = a.all ? ELEMENTS : a.both ? [ELEMENTS[t.elI], ELEMENTS[(t.elI + 2) % 4]] : [ELEMENTS[t.elI]];
  const hit = list.slice(0, a.pierce);
  for (const el of els){
    if (el === 'bolt'){
      const tough = hit.slice().sort((p, q) => q.hp - p.hp).slice(0, a.bolt || 3);
      for (const e of tough){ damage(e, a.dmg * 2, 'energy', t, a); if (G.vis) G.fx.push({ k:'zap', segs: [[t.x, t.y - 20, e.x, e.y]], t:0, life:0.17, c:'#ffe066' }); }
      continue;
    }
    for (const e of hit){
      if (e.dead) continue;
      if (el === 'poison'){ damage(e, a.dmg, 'normal', t, a); if (!e.dead) addBurn(e, { dmg: a.poison, tick: 0.5, dur: 3 }, t, true); e.poisonT = 3; }
      else if (el === 'brand'){ damage(e, a.dmg, 'normal', t, a); if (!e.dead) setVuln(e, { amt: a.brand, dur: 3 }); e.brandT = 3; }
      else if (el === 'ice'){ damage(e, a.dmg, 'cold', t, a); if (!e.dead){ if (e.big) slowE(e, 0.6, 1.5); else freezeE(e, { dur: a.ice, ignoreImmune: true }, t); } }
    }
  }
  t.elNow = els; t.fire2 = 0.3;
  if (G.vis) for (const el of els) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: t.size, r1: range, t: 0, life: 0.4, c: ELEMENT_COL[el], w: 3 });
  return true;
}
/* the wall squares on the kitchen floor: a raised chess square, light or dark, cracking as it is chewed */
function drawChessWalls(g, time){
  if (!G.chWalls || !G.chWalls.length) return;
  for (const w of G.chWalls){
    if (w.hp <= 0) continue;
    const k = Math.min(1, w.t * 5), s = 13 * k, f = w.hp / w.maxHp;
    g.save(); g.translate(w.x, w.y); g.rotate(w.ang || 0);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-s + 2, -s + 3, s * 2, s * 2);
    const dark = onDark(w.x, w.y);
    g.fillStyle = dark ? '#5a3b26' : '#f0e2c4'; g.fillRect(-s, -s, s * 2, s * 2);
    g.strokeStyle = dark ? '#2e1d12' : '#9c8058'; g.lineWidth = 2; g.strokeRect(-s, -s, s * 2, s * 2);
    g.fillStyle = dark ? '#7a5236' : '#fff6e0'; g.fillRect(-s + 2, -s + 2, s * 2 - 4, 3);
    if (w.thorns){ g.fillStyle = '#c9d2d6'; for (const [x, y] of [[-s, -s], [s, -s], [-s, s], [s, s]]){ g.beginPath(); g.moveTo(x, y); g.lineTo(x * 0.7, y * 0.4); g.lineTo(x * 0.4, y * 0.7); g.closePath(); g.fill(); } }
    if (f < 0.7){ g.strokeStyle = dark ? '#c9a77a' : '#6a4a2a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-s * 0.6, -s * 0.2); g.lineTo(0, s * 0.1); g.lineTo(s * 0.4, -s * 0.5); if (f < 0.4){ g.moveTo(0, s * 0.1); g.lineTo(-s * 0.1, s * 0.7); } g.stroke(); }
    g.restore();
    if (f < 1){ g.fillStyle = 'rgba(20,24,28,0.75)'; g.fillRect(w.x - 13, w.y - 21, 26, 4); g.fillStyle = f > 0.5 ? '#f3e7cb' : f > 0.25 ? '#ffd166' : '#ff6b4a'; g.fillRect(w.x - 12, w.y - 20, 24 * f, 2); }
  }
}
