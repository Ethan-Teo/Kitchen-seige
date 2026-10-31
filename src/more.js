'use strict';
/* =====================================================================
   Kitchen Siege — the second wave of appliances
   The Mandoline, Condiment Caddy, Saucepan, Kitchen Bot, Pet Basket and
   Lobster Tank, and their paragons. What they add to the engine:
     timed buffs     brews, Take Aim, Overclock, sauce monsters (t.tb)
     stacking buffs  Kitchen Brigade, Lone Ranger, Echo Network, the pet pack
     pest effects    vinegar, sticky wasabi, Wanted marks, siren songs, gold
                     leaf, Midas glaze, soufflé batter, reduction potions
     new attacks     brews, songs, sentries and pest traps
   The engine calls in through moreApply, moreHit, moreFx, moreFire,
   moreTick, moreLeak, souffleBurst and runMoreAbility; their paragon
   systems join PARA, and moreParaKill, moreParaUI and moreParaBar.
   ===================================================================== */
const QM0 = [], QM1 = [];
const II_HIT = { ignoreImmune: true };
const ACID_HIT = { ii: true };

/* ---------------------------------------------------------------------
   Timed buffs: t.tb holds one buff of each kind, each with its own end time
   --------------------------------------------------------------------- */
function tbScore(b){
  return (b.dmg || 0) * 10 + (b.pierce || 0) * 2 + ((b.speed || 1) - 1) * 40 + ((b.range || 1) - 1) * 20 + (b.bigDmg || 0) + (b.allTypes ? 3 : 0) + (b.camo ? 3 : 0) + (b.monster ? 100 : 0);
}
function tbOn(t, kind){ const b = t.tb && t.tb[kind]; return !!b && b.until > G.time; }
/* give an appliance a timed buff; a stronger one of the same kind already on it stays.
   Returns true if anything changed (the caller refreshes the towers) */
function addTempBuff(t, kind, b, dur){
  t.tb = t.tb || {};
  const cur = t.tb[kind], until = dur === Infinity ? Infinity : G.time + dur;
  if (cur && cur.until > G.time){
    const a = tbScore(cur), n = tbScore(b);
    if (a > n + 1e-9) return false;
    if (Math.abs(a - n) < 1e-9 && cur.until >= until) return false;
  }
  t.tb[kind] = Object.assign({}, b, { until });
  if (until !== Infinity && (G.tbNext == null || until < G.tbNext)) G.tbNext = until;
  return true;
}
function nextTempBuffEnd(){
  let next = null;
  for (const t of G.towers) if (t.tb) for (const k in t.tb){ const u = t.tb[k].until; if (u !== Infinity && u > G.time && (next == null || u < next)) next = u; }
  return next;
}
function expireTempBuffs(){
  let any = false;
  for (const t of G.towers){
    if (!t.tb) continue;
    for (const k in t.tb) if (t.tb[k].until <= G.time){ delete t.tb[k]; any = true; }
  }
  G.tbNext = nextTempBuffEnd();
  if (any) refreshTowers();
}
/* saved with the game as time left (-1: for good) */
function saveTb(t){
  if (!t.tb) return undefined;
  const out = {};
  let any = false;
  for (const k in t.tb){
    const b = t.tb[k];
    if (b.until <= G.time) continue;
    const o = Object.assign({}, b);
    delete o.until;
    o.left = b.until === Infinity ? -1 : Math.round((b.until - G.time) * 10) / 10;
    out[k] = o; any = true;
  }
  return any ? out : undefined;
}
const TB_KINDS = ['brew', 'aim', 'monster', 'clock', 'angry', 'elixir'];
function loadTb(t, d){
  if (!d || typeof d !== 'object') return;
  t.tb = {};
  for (const k of TB_KINDS){
    const o = d[k];
    if (!o || typeof o !== 'object') continue;
    const left = +o.left;
    if (!(left === -1 || left > 0)) continue;
    const b = {
      speed: o.speed ? clamp(+o.speed || 1, 1, 3) : undefined, range: o.range ? clamp(+o.range || 1, 1, 2) : undefined,
      dmg: o.dmg ? clamp(+o.dmg || 0, 0, 20) : undefined, pierce: o.pierce ? clamp(+o.pierce || 0, 0, 20) : undefined, bigDmg: o.bigDmg ? clamp(+o.bigDmg || 0, 0, 50) : undefined,
      camo: !!o.camo || undefined, allTypes: !!o.allTypes || undefined, monster: !!o.monster || undefined,
      spec: o.spec && o.spec.kind === 'beam' ? { kind:'beam', rate: clamp(+o.spec.rate || 0.05, 0.03, 1), dmg: clamp(+o.spec.dmg || 1, 0, 100), pierce: clamp(+o.spec.pierce || 1, 1, 30), width: clamp(+o.spec.width || 10, 4, 20), bonusBig: clamp(+o.spec.bonusBig || 0, 0, 200), type:'normal', ignoreImmune:true, color:'#8fd16a', laser:true } : undefined,
    };
    for (const f in b) if (b[f] === undefined) delete b[f];
    b.until = left === -1 ? Infinity : G.time + Math.min(left, 600);
    t.tb[k] = b;
  }
}
/* every attack of a set of stats, and the copies kept for critical hits */
function eachAtk(s, fn){
  for (const id in s.atk){
    const a = s.atk[id];
    fn(a);
    if (a.critSpec) fn(a.critSpec);
    if (a.luckSpec) fn(a.luckSpec);
  }
}
function boostRate(s, m){ for (const id in s.atk) s.atk[id].rate /= m; }
function applyTimed(s, b){
  if (b.range && !s.global) s.range *= b.range;
  if (b.camo) s.camo = true;
  if (b.allTypes) s.allTypes = true;
  if (b.speed) boostRate(s, b.speed);
  eachAtk(s, a => {
    if (b.pierce){
      if (a.pierce != null && a.kind !== 'hitscan' && a.pierce < 9000) a.pierce += b.pierce;
      for (const k of ['explode', 'impact', 'radial']) if (a[k] && a[k].pierce != null) a[k].pierce += b.pierce;
    }
    if (b.dmg){
      if (a.dmg > 0) a.dmg += b.dmg;
      for (const k of ['explode', 'impact', 'radial', 'mine', 'burst']) if (a[k] && a[k].dmg > 0) a[k].dmg += b.dmg;
      if (a.bubble) a.bubble.pop += b.dmg;
    }
    if (b.bigDmg){
      if (a.dmg > 0 || a.kind === 'hitscan' || a.kind === 'beam' || a.kind === 'pulse') a.bonusBig = (a.bonusBig || 0) + b.bigDmg;
      for (const k of ['explode', 'impact', 'mine']) if (a[k]) a[k].bonusBig = (a[k].bonusBig || 0) + b.bigDmg;
    }
    if (b.allTypes){ a.ignoreImmune = true; propagateII(a); }
  });
  if (b.spec && !s.atk.monster){
    const m = JSON.parse(JSON.stringify(b.spec));
    finalizeAttack(m, 0);
    s.atk.monster = m;
  }
}

/* ---------------------------------------------------------------------
   After an appliance's buffs: buffs that stack with others of its kind,
   its timed buffs, and more reach on the water
   --------------------------------------------------------------------- */
function moreApply(t){
  const s = t.s, T = TOWERS[t.type];
  if (!s || !T) return;
  t.wet = !!(T.amphib && inWater(t.x, t.y, 0));
  if (t.wet && !s.global) s.range *= 1.35;
  t.stack = 0;
  if (t.type === 'mandoline' && !t.paragon){
    /* Kitchen Brigade: a stack from every brigade Mandoline that has this one in range */
    let n = 0;
    for (const o of G.towers) if (o.type === 'mandoline' && o.base && o.base.brigade && Math.hypot(o.x - t.x, o.y - t.y) <= o.base.range + t.size * 0.6) n++;
    n = Math.min(20, n);
    if (n){
      t.stack = n;
      const m = 1 + 0.08 * n;
      boostRate(s, m);
      eachAtk(s, a => { if (a.pierce != null && a.kind !== 'hitscan') a.pierce = Math.ceil(a.pierce * m); });
    }
  }
  if (s.lone){
    /* Lone Ranger: faster with nobody else around */
    let n = 0;
    for (const o of G.towers) if (o !== t && Math.hypot(o.x - t.x, o.y - t.y) <= 130 + o.size) n++;
    const m = n === 0 ? 1.4 : n === 1 ? 1.2 : n === 2 ? 1.1 : 1;
    t.stack = n;
    if (m > 1) boostRate(s, m);
  }
  if (s.echo){
    /* Echo Network: every networked Lobster Tank on the map adds reach to all of them */
    let n = 0;
    for (const o of G.towers) if (o.type === 'lobster' && o.base && o.base.echo) n++;
    n = Math.min(10, n);
    t.stack = n;
    if (!s.global) s.range *= 1 + s.echo * n;
  }
  if (s.pet && s.pack){
    /* the pack: other baskets with the same kind of pet nearby make this one's pet stronger */
    let n = 0;
    for (const o of G.towers) if (o !== t && o.type === 'pets' && o.base && o.base.pet === s.pet && Math.hypot(o.x - t.x, o.y - t.y) <= s.range + 80) n++;
    n = Math.min(5, n);
    t.stack = n;
    const pa = s.atk[s.pet];
    if (n && pa){ const m = 1 + s.pack * n; pa.dmg *= m; if (pa.bonusBig) pa.bonusBig *= m; }
  }
  if (t.tb) for (const k in t.tb){ const b = t.tb[k]; if (b.until > G.time) applyTimed(s, b); }
  /* a bot's sentries share its targeting rules and mastery */
  const B = s.atk.build;
  if (B && B.minion){ const rank = TOWERS[t.type].custom ? 0 : masteryRank(t.type); for (const k in B.minion.specs) finalizeAttack(B.minion.specs[k], rank); }
  mixerApply(t);
}

/* ---------------------------------------------------------------------
   What their attacks do to pests
   --------------------------------------------------------------------- */
/* flag the attacks (and the blasts inside them) that carry one of these effects */
const MORE_HIT = ['distract', 'sticky', 'acid', 'mark', 'lift', 'drag', 'charm', 'souffle', 'glaze', 'gild', 'shrink', 'carry'];
function markMore(a){
  if (!a || typeof a !== 'object') return;
  for (const k of MORE_HIT) if (a[k]){ a.more = true; break; }
  for (const k of NESTED) if (a[k] && typeof a[k] === 'object') markMore(a[k]);
}
function moreHit(e, a, tw){
  if (e.dead) return;
  if (a.distract && !e.big && Math.random() < a.distract.chance){
    knockE(e, a.distract.dist);
    if (G.vis && !lowFx()) fxText(e.x, e.y - e.r - 6, '?', '#ffe08a', 0.5, 13);
  }
  if (a.acid) addAcid(e, a.acid, tw);
  if (a.sticky && e.big) stickOn(e, a.sticky, tw);
  if (a.mark) markWanted(e, tw, a.mark);
  if (a.charm) charmE(e, a.charm, tw);
  if (a.lift && e.big && !e.boss && e.tier <= a.lift.tier) knockE(e, a.lift.dist);
  if (a.carry && !e.big && !e.boss) carryOff(e, a.carry, tw);
  if (a.drag) dragUnder(e, a.drag, tw);
  moreCoat(e, a, tw);
}
/* a blast's effects (an explosion or a ladle's splash) */
function moreFx(e, ex, tw){
  if (e.dead) return;
  if (ex.acid) addAcid(e, ex.acid, tw);
  if (ex.charm) charmE(e, ex.charm, tw);
  moreCoat(e, ex, tw);
}
function moreCoat(e, x, tw){
  if (x.souffle && e.big){ e.souffle = x.souffle; e.souffleTw = tw; }
  if (x.glaze && !e.boss){ e.glazed = true; e.cashMul = Math.max(e.cashMul || 1, x.glaze); }
  if (x.gild) gildE(e, x.gild, tw);
  if (x.shrink && !e.dead) shrinkE(e, tw);
}
/* vinegar keeps eating at a pest for a while; a stronger dose replaces a weaker one */
function addAcid(e, ac, tw){
  if (e.dead) return;
  const c = e.acid;
  if (c && c.dmg > ac.dmg){ c.t = Math.max(c.t, ac.dur * 0.5); return; }
  if (c && c.dmg === ac.dmg){ c.t = Math.max(c.t, ac.dur); c.tw = tw; return; }
  e.acid = { dmg: ac.dmg, tick: ac.tick, t: ac.dur, acc: 0, tw };
}
function acidTick(e, dt){
  const c = e.acid;
  c.t -= dt; c.acc += dt;
  while (c.acc >= c.tick - 1e-9 && !e.dead){ c.acc -= c.tick; damage(e, c.dmg, 'normal', c.tw, ACID_HIT); }
  if (!e.dead && c.t <= 0) e.acid = null;
}
/* sticky wasabi: stuck to a vehicle, it bursts a moment later wherever the vehicle has got to */
function stickOn(e, st, tw){
  e.sticks = (e.sticks || 0) + 1;
  if (G.vis) G.fx.push({ k:'stick', e, t:0, life: st.delay, ox: rand(-0.55, 0.55) * e.r, oy: rand(-0.55, 0.55) * e.r });
  G.timers.push({ t: st.delay, fn: () => {
    e.sticks = Math.max(0, (e.sticks || 1) - 1);
    /* the full blast goes into the vehicle it is stuck to; the splash is small */
    if (!e.dead) damage(e, st.dmg, 'normal', tw, II_HIT);
    explodeAt(e.x, e.y, st.ex, tw, null);
  } });
}
/* Wanted: a marked pest takes more damage from everything and pays more when cooked */
function wantedCount(tw){
  if (tw.wantedAt !== G.time){
    let n = 0;
    for (const o of G.enemies) if (!o.dead && o.wanted === tw) n++;
    tw.wantedN = n; tw.wantedAt = G.time;
  }
  return tw.wantedN;
}
function markWanted(e, tw, m){
  if (e.dead || e.wanted || !tw) return;
  if (wantedCount(tw) >= m.max) return;
  e.wanted = tw; tw.wantedN++;
  e.markMul = Math.max(e.markMul || 1, m.mul);
  e.cashMul = Math.max(e.cashMul || 1, m.cash);
  if (G.vis) fxText(e.x, e.y - e.r - 8, 'WANTED', '#ffd166', 0.8, 12);
}
/* a siren song: the pest turns and walks back up the trail for a while, then shrugs songs off for a few seconds */
const CHARM_REST = 4;
function canCharm(e, c){
  if (e.dead || e.boss || e.gold) return false;
  if (e.charmImm > G.time) return false;   // just charmed: it shakes the song off for a few seconds
  return e.big ? !!c.bigTier && e.tier <= c.bigTier : e.tier <= (c.tier || 99);
}
function charmE(e, c, tw){
  if (!canCharm(e, c)) return;
  e.charmT = Math.max(e.charmT || 0, e.big ? c.dur * 0.5 : c.dur);
  e.charmImm = G.time + e.charmT + CHARM_REST;
  e.camo = false;
  if (c.vuln) setVuln(e, { amt: c.vuln, dur: c.dur });
  if (c.pop){
    /* the song sets off what is eating at it: the rest of a burn or a dose of vinegar lands at once */
    if (e.burn){ const b = e.burn; e.burn = null; damage(e, Math.ceil(b.t / b.tick) * b.dmg, 'heat', tw, b.o); }
    if (!e.dead && e.acid){ const v = e.acid; e.acid = null; damage(e, Math.ceil(v.t / v.tick) * v.dmg, 'normal', tw, ACID_HIT); }
  }
}
/* gold leaf: a shell-backed pest turns to gold and is cooked on the spot */
function gildE(e, cash, tw){
  if (e.dead || e.big || !e.immune) return;
  if (e.immune.indexOf('sharp') < 0 && e.immune.indexOf('blast') < 0) return;
  const x = e.x, y = e.y;
  damage(e, e.hp + 1, 'normal', tw, II_HIT);
  if (!e.dead) kill(e, tw);
  addCash(cash);
  if (tw) tw.cashGen += cash;
  if (G.vis){
    fxText(x, y - 14, '+$' + cash, '#ffd166', 0.8, 12);
    if (!lowFx()) for (let i = 0; i < 6; i++){ const a = rand(0, TAU), v = rand(30, 90); part(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.45, i % 2 ? '#ffd166' : '#fff4c2', 2.6, 'spark'); }
  }
}
/* a reduction potion boils a small pest down into an ant */
function shrinkE(e, tw){
  if (e.dead || e.big || e.boss || e.gold || e.type === 'ant') return;
  const def = ENEMIES.ant, ramp = waveRamp(G.round, G.D);
  const hp = Math.max(def.hp, Math.round(def.hp * hpScale(G.round, false, false) * ramp.hp * (G.mod ? G.mod.hp : 1)));
  e.type = 'ant'; e.def = def; e.tier = def.tier; e.r = def.r;
  e.hp = Math.min(e.hp, hp); e.maxHp = hp;
  e.speed = def.speed * speedScale(G.round) * ramp.speed * (G.mod ? G.mod.speed : 1);
  e.immune = null; e.camo = false; e.mold = false; e.armored = false;
  if (G.vis && !lowFx()) for (let i = 0; i < 5; i++){ const a = rand(0, TAU), v = rand(20, 70); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, 0.4, i % 2 ? '#b98cff' : '#e6d6ff', 2.6, 'dot'); }
}
/* a cooked vehicle coated in soufflé batter bursts */
function souffleBurst(e){
  const S = e.souffle, tw = e.souffleTw, x = e.x, y = e.y;
  e.souffle = null;
  const dmg = Math.round(Math.min(S.max, e.maxHp * S.pct) + S.dmg);
  /* a moment later, so the burst catches whatever spilled out of it */
  G.timers.push({ t: 0.05, fn: () => {
    explodeAt(x, y, { r: S.r, dmg, pierce: 60, type:'normal', ignoreImmune:true }, tw, null);
    if (G.vis) G.fx.push({ k:'ring', x, y, r0: 10, r1: S.r, t:0, life:0.4, c:'#ffe7a8', w:5 });
  } });
}
/* a big bird carries a small pest off and drops it from a height: cooked outright */
function carryOff(e, c, tw){
  if (e.dead || (c.tier && e.tier > c.tier)) return;
  damage(e, e.hp + 1, 'normal', tw, II_HIT);
  if (!e.dead) kill(e, tw);
}
/* a shark drags a vehicle under: destroyed outright (what is inside still spills), bosses lose a share */
function dragUnder(e, d, tw){
  if (e.dead || !e.big) return;
  if (e.boss){ if (d.boss) damage(e, e.maxHp * d.boss, 'normal', tw, II_HIT); return; }
  if (e.tier > d.tier) return;
  const x = e.x, y = e.y;
  damage(e, e.hp + 1, 'normal', tw, II_HIT);
  if (!e.dead) kill(e, tw);
  if (G.vis) G.fx.push({ k:'ring', x, y, r0: 8, r1: 46, t:0, life:0.45, c:'#7fd3ff', w:4 });
}

/* ---------------------------------------------------------------------
   The Caddy's trigger finger: how fast it fires depends on what it sees
   --------------------------------------------------------------------- */
function countNear(t, R){
  let n = 0;
  for (const e of query(t.x, t.y, R, QM0)) if (!e.dead && (!e.camo || t.s.camo)) n++;
  return n;
}
function dynRate(t, a){
  let m = 1;
  const R = attackRange(t, a);
  if (a.quick) m *= 1 - a.quick * clamp((t.lastDist || 0) / Math.max(1, R), 0, 1);
  if (a.standoff || a.crowd){
    const n = countNear(t, R);
    if (a.standoff) m *= 1 - a.standoff * clamp((5 - n) / 4, 0, 1);
    if (a.crowd) m /= 1 + a.crowd * Math.min(5, n);
  }
  return m;
}
/* a bullseye: likelier the farther away the pest is */
function luckRoll(t, a, e){
  const L = a.luck, f = clamp(Math.hypot(e.x - t.x, e.y - t.y) / Math.max(1, attackRange(t, a)), 0, 1);
  return Math.random() < L.near + (L.far - L.near) * f;
}

/* ---------------------------------------------------------------------
   Their own kinds of attack
   --------------------------------------------------------------------- */
function moreFire(t, a, id){
  switch (a.kind){
    case 'brew': return fireBrew(t, a);
    case 'song': return fireSong(t, a, id);
    case 'build': return buildMinion(t, a);
    case 'catch': return placeCatch(t, a);
  }
  return mixerFire(t, a, id);
}
/* a saucepan's brew: lobbed at the appliances near it that would gain the most */
function fireBrew(t, a){
  if (!G.roundActive && !G.attract) return false;
  if (!G.enemies.some(e => !e.dead && onScreen(e))) return false;
  const R = attackRange(t, a), want = tbScore(a.buff), dur = a.perm ? Infinity : a.dur;
  const cands = [];
  for (const o of G.towers){
    if (o === t || !o.s || !o.s.atk || !Object.keys(o.s.atk).length) continue;
    if (Math.hypot(o.x - t.x, o.y - t.y) > R + o.size) continue;
    const cur = o.tb && o.tb.brew && o.tb.brew.until > G.time ? o.tb.brew : null;
    const have = cur ? tbScore(cur) : -1;
    if (have > want + 1e-9) continue;
    const left = cur ? cur.until - G.time : 0;
    if (have >= want - 1e-9 && (left === Infinity || left > Math.min(4, a.dur * 0.3))) continue;
    cands.push({ o, sc: (have < want - 1e-9 ? 1e12 : 0) - left * 1e6 + (o.dmg || 0) * 1e-3 });
  }
  if (!cands.length) return false;
  cands.sort((p, q) => q.sc - p.sc);
  const pick = cands.slice(0, a.n || 1).map(c => c.o);
  for (const o of pick) lobTo(t, { travel: 0.45, sprite:'brewcup' }, o.x, o.y - 6);
  G.timers.push({ t: 0.45, soft: true, fn: () => {
    let any = false;
    for (const o of pick) if (G.towers.indexOf(o) >= 0 && addTempBuff(o, 'brew', a.buff, dur)) any = true;
    if (any) refreshTowers();
    if (G.vis) for (const o of pick){ G.fx.push({ k:'ring', x: o.x, y: o.y, r0: o.size * 0.6, r1: o.size + 16, t:0, life:0.4, c: a.perm ? '#ffd166' : '#ff7a52', w:3 }); if (!lowFx()) for (let i = 0; i < 5; i++) part(o.x + rand(-10, 10), o.y + rand(-6, 6), rand(-20, 20), rand(-70, -30), 0.5, i % 2 ? '#ff9a52' : '#ffd166', 2.4, 'dot'); }
  } });
  setAim(t, 'main', Math.atan2(pick[0].y - t.y, pick[0].x - t.x));
  t.fire2 = 0.3;
  Hooks.sfx('splat');
  return true;
}
/* a siren song: charms the pests in range that are not charmed yet, furthest along first */
function fireSong(t, a, id){
  if (!(a.dmg >= 0)) a.dmg = 0;   // a song does no damage of its own
  const R = a.global ? 9999 : attackRange(t, a);
  const list = R >= 5000 ? G.enemies : query(t.x, t.y, R, QM1);
  const c = a.charm, cand = [];
  for (const e of list){
    if (e.dead || !onScreen(e) || e.burrowT > 0 || (e.charmT || 0) > 0.4) continue;
    if (e.camo && !t.s.camo) continue;
    if (!canCharm(e, c)) continue;
    cand.push(e);
  }
  if (!cand.length) return false;
  if (cand.length > a.pierce){ const P = e => G.paths[e.path].len - e.d; cand.sort((p, q) => P(p) - P(q)); }
  const n = Math.min(a.pierce, cand.length);
  for (let i = 0; i < n; i++) applyHit(cand[i], a, t);
  if (G.vis){
    G.fx.push({ k:'song', x: t.x, y: t.y, r: a.global ? 520 : R, t:0, life:0.9, seed: Math.random() * 10 });
    if (!lowFx()) for (let i = 0; i < Math.min(n, 8); i++) G.fx.push({ k:'note', x: cand[i].x, y: cand[i].y - cand[i].r - 4, t:0, life:0.8, seed: Math.random() * 10 });
  }
  t.fire2 = 0.5;
  Hooks.sfx('whirl');
  return true;
}

/* ---------------------------------------------------------------------
   Sentries: little helpers the Kitchen Bot builds beside the trail
   --------------------------------------------------------------------- */
function minionSpot(t, R){
  const S = trapSpots(t, R);
  if (!S.pts.length) return null;
  for (let k = 0; k < 6; k++){
    const pt = S.pts[Math.floor(Math.random() * S.pts.length)];
    const sp = besideTrail(pt.x, pt.y, pt.ang, Math.random() < 0.5 ? -1 : 1);
    if (!sp.ok) continue;
    if (G.towers.some(o => Math.hypot(o.x - sp.x, o.y - sp.y) < o.size + 8)) continue;
    if (G.minions.some(m => Math.hypot(m.x - sp.x, m.y - sp.y) < 16)) continue;
    return sp;
  }
  return null;
}
function buildMinion(t, a){
  if (!G.roundActive && !G.attract) return false;
  if (!G.enemies.some(e => !e.dead && onScreen(e))) return false;
  let mine = 0;
  for (const m of G.minions) if (m.tw === t && !m.mega) mine++;
  if (mine >= a.max) return false;
  const sp = minionSpot(t, attackRange(t, a));
  if (!sp) return false;
  const looks = a.minion.looks;
  const look = looks[t.minionN = ((t.minionN || 0) + 1) % looks.length];
  G.minions.push({ x: sp.x, y: sp.y, x0: t.x, y0: t.y, tw: t, look, life: a.life, max: a.life, t: 0, cd: 0.4, ang: -Math.PI / 2, fire: 0, id: G.nextId++ });
  t.fire2 = 0.3;
  Hooks.sfx('place');
  return true;
}
const MINION_HOP = 0.35;
function minionSpec(m){
  if (m.spec) return m.spec;
  const B = m.tw.s && m.tw.s.atk && m.tw.s.atk.build;
  return B && B.minion && B.minion.specs[m.look];
}
function updateMinions(dt){
  let gone = false;
  for (const m of G.minions){
    m.t += dt; m.life -= dt;
    if (m.fire > 0) m.fire -= dt;
    if (m.life <= 0 || G.towers.indexOf(m.tw) < 0){
      m.done = true; gone = true;
      const sp = minionSpec(m);
      if (sp && sp.boomOnEnd && G.towers.indexOf(m.tw) >= 0) explodeAt(m.x, m.y, sp.boomOnEnd, m.tw, null);
      continue;
    }
    if (m.t < MINION_HOP || m.tw.stunT > 0) continue;
    const spec = minionSpec(m);
    if (!spec) continue;
    m.cd -= dt * towerSpeed(m.tw);
    if (m.cd > 0) continue;
    const me = m.me || (m.me = { x: m.x, y: m.y, tg: 'first', s: null });
    me.s = m.tw.s;
    const tg = spec.targetBig ? acquireBig(me, spec.range, spec) : acquire(me, spec.range, spec, spec.mode || 'first');
    if (!tg){ m.cd = 0; continue; }
    m.cd += spec.rate;
    let ax = tg.x, ay = tg.y;
    if (!spec.homing && spec.speed){ const q = predictPos(tg, Math.hypot(tg.x - m.x, tg.y - m.y) / spec.speed); ax = q.x; ay = q.y; }
    m.ang = Math.atan2(ay - m.y, ax - m.x);
    m.fire = 0.15;
    const n = spec.count || 1;
    for (let i = 0; i < n; i++){
      const dir = m.ang + (i - (n - 1) / 2) * (spec.spread || 0.15);
      const life = Math.min(900, spec.range * 1.25) / spec.speed;
      pushProj(m.x + Math.cos(dir) * 8, m.y + Math.sin(dir) * 8, dir, spec.speed, life, spec, m.tw, spec.homing ? tg : null);
    }
    if (G.vis && Math.random() < 0.3) Hooks.sfx('throw');
  }
  if (gone) G.minions = G.minions.filter(m => !m.done);
}

/* ---------------------------------------------------------------------
   Pest traps: a cage on the trail that catches pests whole until it is
   full, then pays out what they are worth, and more
   --------------------------------------------------------------------- */
(function pestValues(){
  const valueOf = id => {
    const d = ENEMIES[id];
    if (d._cash != null) return d._cash;
    let v = d.bounty || 0;
    if (d.children) for (const [c, n] of d.children) v += n * valueOf(c);
    d._cash = v;
    return v;
  };
  for (const id in ENEMIES) valueOf(id);
})();
function pestWorth(e){ return e.def._cash * cashScale(G.round) * waveRamp(G.round, G.D).cash * (G.mod ? G.mod.cash : 1); }
function placeCatch(t, a){
  if (!G.roundActive && !G.attract) return false;
  for (const tr of G.traps) if (tr.tw === t && tr.catch) return false;   // one cage at a time
  const S = trapSpots(t, attackRange(t, a));
  if (!S.pts.length) return false;
  const pt = pickSpot(t, S);
  addTrap(t, Object.assign({ r: 16, pierce: 1, life: 9999, sprite:'cage' }, a), pt, false);
  const tr = G.traps[G.traps.length - 1];
  tr.catch = true; tr.held = 0; tr.value = 0; tr.cap = a.cap; tr.full = false; tr.fullT = 0;
  t.fireAnim = 0.25;
  Hooks.sfx('squish');
  return true;
}
/* one step of a cage: catch what walks in, and pay out once it is full */
function catchTick(tr, dt){
  const a = tr.spec;
  if (tr.full){
    tr.fullT += dt;
    if (tr.fullT >= 1) collectCatch(tr);
    return;
  }
  const list = query(tr.x, tr.y, tr.r, QM0);
  for (const e of list){
    if (e.dead || e.boss || e.gold) continue;
    if (e.big && !(a.bigTier && e.tier <= a.bigTier)) continue;
    if (e.camo && !(tr.tw.s && tr.tw.s.camo)) continue;
    const size = Math.max(1, e.def._leak || 1);
    if (tr.held > 0 && tr.held + size > tr.cap * 1.1) continue;
    e.dead = true; G.deadFlag = true;
    tr.held += size;
    tr.value += pestWorth(e);
    G.stats.kills++; tr.tw.kills++;
    const bi = G.bosses.indexOf(e);
    if (bi >= 0){ G.bosses.splice(bi, 1); Hooks.boss(null); }
    if (G.vis && !lowFx()) for (let i = 0; i < 4; i++){ const an = rand(0, TAU), v = rand(20, 60); part(e.x, e.y, Math.cos(an) * v, Math.sin(an) * v, 0.3, '#c9d2d6', 2.2, 'dot'); }
    if (tr.held >= tr.cap){ tr.full = true; tr.fullT = 0; break; }
  }
}
function collectCatch(tr){
  tr.done = true;
  const v = Math.round(tr.value * (tr.spec.mult || 2));
  if (v > 0){
    addCash(v); tr.tw.cashGen += v;
    G.xp[tr.tw.type] = (G.xp[tr.tw.type] || 0) + v * 0.5 * G.xpMult;
    if (G.vis){ G.fx.push({ k:'crate', x: tr.x, y: tr.y, t:0, life:1.1, v }); }
    Hooks.sfx('cash');
  }
  /* the next cage goes down after the bot's reload */
  const id = Object.keys(tr.tw.s.atk).find(k => tr.tw.s.atk[k].kind === 'catch');
  if (id) tr.tw.cd[id] = tr.spec.rate;
}
/* the end of a round empties every cage, full or not */
function collectAllCatches(){
  let any = false;
  for (const tr of G.traps) if (tr.catch && !tr.done){ collectCatch(tr); any = true; }
  if (any) G.traps = G.traps.filter(tr => !tr.done);
}

/* ---------------------------------------------------------------------
   Every step, a leak, and the end of a round
   --------------------------------------------------------------------- */
function moreTick(dt){
  if (G.grid && G.towers.indexOf(G.grid.t) < 0) G.grid = null;
  const S = G.glob.sabotage;
  if (S){ S.t -= dt; if (S.t <= 0) G.glob.sabotage = null; }
  if (G.tbNext != null && G.time >= G.tbNext) expireTempBuffs();
  if (G.minions.length) updateMinions(dt);
  mixerTick(dt);
  chessTick(dt);
  utensilTick(dt);
  sprayTick(dt);
  riceTick(dt);
  gmBuffTick(dt);
}
/* lives were lost: Nomads and Avengers get angry */
function moreLeak(){
  if (G.attract) return;
  let any = false;
  for (const t of G.towers){
    const nm = t.s && t.s.nomad;
    if (!nm) continue;
    if (t.tb && t.tb.angry && t.tb.angry.until - G.time > 9) continue;
    if (addTempBuff(t, 'angry', { range: nm.range, speed: nm.speed }, 10)) any = true;
  }
  if (any) refreshTowers();
}
function moreRoundEnd(){
  G.glob.sabotage = null;
  collectAllCatches();
  mixerRoundEnd();
  chessRoundEnd();
  utensilRoundEnd();
}

/* ---------------------------------------------------------------------
   Their abilities
   --------------------------------------------------------------------- */
function pestsOnScreen(){ return G.enemies.filter(e => !e.dead && onScreen(e) && !(e.burrowT > 0)); }
/* the toughest pests on screen, toughest first */
function toughestN(n, list){
  const L = (list || pestsOnScreen()).slice();
  L.sort((p, q) => ((q.boss ? 4e12 : 0) + (q.big ? 2e12 : 0) + q.tier * 1e9 + Math.min(q.hp, 9e8)) - ((p.boss ? 4e12 : 0) + (p.big ? 2e12 : 0) + p.tier * 1e9 + Math.min(p.hp, 9e8)));
  return L.slice(0, n);
}
/* the appliances an ability helps most: the ones that have done the most damage */
function strongestNear(t, R, n, self){
  return G.towers.filter(o => (self || o !== t) && o.s && Object.keys(o.s.atk).length && (R >= 5000 || Math.hypot(o.x - t.x, o.y - t.y) <= R + o.size))
    .sort((p, q) => (q.dmg || 0) - (p.dmg || 0)).slice(0, n);
}
/* one size down: a vehicle becomes its biggest kind of passenger, at the same spot */
function shrinkVehicle(e){
  const ch = e.def.children;
  if (!ch || !ch.length) return;
  let best = null;
  for (const [cid] of ch) if (!best || ENEMIES[cid].tier > ENEMIES[best].tier) best = cid;
  const n = spawnEnemy(best, { path: e.path, d: e.d, camo: e.camo && !ENEMIES[best].big, lineage: (e.lineage || []).concat(e.id).slice(-6), child: true });
  if (n){ n.glazed = e.glazed; n.cashMul = e.glazed ? e.cashMul : 1; }
  e.dead = true; G.deadFlag = true;
  if (G.vis){
    G.fx.push({ k:'ring', x: e.x, y: e.y, r0: e.r, r1: e.r * 0.4, t:0, life:0.4, c:'#b98cff', w:4 });
    if (!lowFx()) for (let i = 0; i < 10; i++){ const a = rand(0, TAU), v = rand(30, 110); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, 0.5, i % 2 ? '#b98cff' : '#ffd166', 3, 'spark'); }
  }
}
function runMoreAbility(t, ab){
  switch (ab.id){
    case 'sabotage': {
      if (!pestsOnScreen().length && !G.roundActive) return false;
      G.glob.sabotage = { t: ab.dur, max: ab.dur, slow: ab.slow || 0.5, weak: ab.weak || 0, boost: ab.boost || 1 };
      if (G.vis){ G.fx.push({ k:'flash', c:'rgba(70,40,20,0.3)', t:0, life:0.7 }); G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1:700, t:0, life:0.9, c:'#5a3418', w:7 }); }
      Hooks.sfx('splash');
      return true;
    }
    case 'takeaim': {
      const list = strongestNear(t, t.s.range, ab.max || 6, true);
      if (!list.length) return false;
      let any = false;
      for (const o of list) if (addTempBuff(o, 'aim', { range: ab.range, camo: true }, ab.dur)) any = true;
      if (any) refreshTowers();
      if (G.vis) for (const o of list) G.fx.push({ k:'aim', x: o.x, y: o.y, r: o.size + 10, t:0, life:0.8 });
      Hooks.sfx('ability');
      return true;
    }
    case 'tonic': {
      addTempBuff(t, 'monster', { monster: true }, ab.dur);
      const spec = t.s.monsterSpec;
      if (ab.others && spec) for (const o of strongestNear(t, t.s.range, ab.others, false)) addTempBuff(o, 'monster', { monster: true, spec }, ab.dur);
      refreshTowers();
      if (G.vis){ G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1: ab.others ? t.s.range : 80, t:0, life:0.7, c:'#8fd16a', w:6 }); for (let i = 0; i < 14; i++){ const a = rand(0, TAU), v = rand(40, 140); part(t.x, t.y, Math.cos(a) * v, Math.sin(a) * v, 0.6, i % 2 ? '#8fd16a' : '#e9ffd6', 3.2, 'dot'); } }
      Hooks.sfx('splash');
      return true;
    }
    case 'overclock': {
      const R = ab.global ? 9999 : t.s.range;
      const o = strongestNear(t, R, 1, false)[0];
      if (!o) return false;
      addTempBuff(o, 'clock', { speed: ab.mult || 1 / 0.6 }, ab.dur);
      if (ab.ultra) o.ub = Math.min(10, (o.ub || 0) + 1);
      refreshTowers();
      if (G.vis){ G.fx.push({ k:'zap', pts:[[t.x, t.y], [(t.x + o.x) / 2 + rand(-12, 12), (t.y + o.y) / 2 + rand(-12, 12)], [o.x, o.y]], t:0, life:0.3, c:'#7fd3ff' }); G.fx.push({ k:'ring', x:o.x, y:o.y, r0:o.size, r1:o.size + 26, t:0, life:0.6, c:'#7fd3ff', w:4 }); fxText(o.x, o.y - o.size - 12, ab.ultra ? 'ULTRABOOST ×' + o.ub : 'OVERCLOCK', '#bfefff', 1, 13); }
      Hooks.sfx('zap');
      return true;
    }
    case 'roar': {
      const R = ab.global ? 9999 : Math.max(260, t.s.range * 2.2);
      let any = false;
      for (const e of G.enemies){
        if (e.dead || !onScreen(e) || e.burrowT > 0 || (R < 5000 && Math.hypot(e.x - t.x, e.y - t.y) > R)) continue;
        if (e.big && e.tier > (ab.bigTier || 10) && !e.boss) continue;
        any = true;
        stunE(e, e.big ? ab.stun * 0.5 : ab.stun);
        if (ab.dmg) damage(e, ab.dmg, 'normal', t, II_HIT);
      }
      if (!any) return false;
      if (G.vis){ G.fx.push({ k:'ring', x:t.x, y:t.y, r0:20, r1: R >= 5000 ? 900 : R, t:0, life:0.7, c:'#ffcf7a', w:8 }); G.shake = Math.max(G.shake, 0.4); }
      Hooks.sfx('boom');
      return true;
    }
    case 'icejet': {
      if (ab.flood){
        /* the whole kitchen floods with ice water: everything freezes and takes a hit */
        const list = pestsOnScreen();
        if (!list.length) return false;
        for (const e of list){
          damage(e, e.big ? ab.big : ab.dmg, 'cold', t, II_HIT);
          if (!e.dead) freezeE(e, { dur: ab.freeze, bigDur: ab.freeze * 0.5, ii: true }, t);
        }
        if (G.vis){ G.fx.push({ k:'flash', c:'rgba(150,215,255,0.45)', t:0, life:1 }); G.fx.push({ k:'rinse', t:0, life:1.1 }); }
        Hooks.sfx('freeze');
        return true;
      }
      const tg = toughestN(ab.balls, pestsOnScreen());
      if (!tg.length) return false;
      const spec = { kind:'proj', dmg: ab.dmg, bonusBig: ab.bonusBig, pierce: 6, speed: 520, size: 8, type:'cold', ignoreImmune:true, sprite:'iceball', homing:true, bounce: 6, freeze:{ dur: 1, bigDur: 0.4, ii:true }, lifeMul: 2 };
      finalizeAttack(spec, 0);
      for (let i = 0; i < ab.balls; i++){
        const e = tg[i % tg.length];
        G.timers.push({ t: i * 0.08, soft: true, fn: () => { if (G.towers.indexOf(t) >= 0) pushProj(t.x, t.y, Math.atan2(e.y - t.y, e.x - t.x) + rand(-0.4, 0.4), spec.speed, 3, spec, t, e.dead ? null : e); } });
      }
      Hooks.sfx('freeze');
      return true;
    }
    case 'punchdown': return runMixerAbility(t, ab);
    case 'castle': case 'charge': case 'checkmate': case 'stalemate': return runChessAbility(t, ab);
    case 'flurry': case 'fullspin': case 'gravyflood': case 'grandpinch': return runUtensilAbility(t, ab);
    case 'bubblebath': case 'downpour': case 'hydroblast': return runSprayAbility(t, ab);
    case 'valve': case 'mochi': case 'serve': return runRiceAbility(t, ab);
  }
  return runMoreParaAbility(t, ab);
}
