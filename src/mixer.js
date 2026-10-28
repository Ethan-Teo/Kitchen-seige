'use strict';
/* =====================================================================
   Kitchen Siege — the Stand Mixer's storms, dough hooks and temper
   What the mixer adds to the engine:
     lightning     forked bolts that split in two at every pest they hit
     storms        whirlwinds that chase pests, superstorms that roam the
                   kitchen, and the paragon's bowl whirlwinds. They all blow
                   pests back up the trail (e.blowD), and a pest in the air
                   lands where it was blown to.
     meringue      crackling balls that stick pests in place and zap them
     dough hooks   grab one pest anywhere and knead it away, leaving a
                   pile of chocolate spikes on the trail (the Druid's brambles)
     dough         the Dough Golem's dough creeping along the trail
     temper        Bitter Batter, Whipped Frenzy, Dinner Rush, Kitchen Fury
     bake sales    cash and lives every round, more for Bread Machines
   The engine calls in through mixerFire, mixerTick, mixerApply,
   mixerRoundEnd, mixerParaKill, wrathFeed, runMixerAbility and vineDone.
   ===================================================================== */
const QX = [], QX2 = [];
const VINE_HIT = { ignoreImmune: true };

/* how much health a pest still has to chew through, its passengers included */
(function computeHealth(){
  const hpOf = id => {
    const d = ENEMIES[id];
    if (d._rbe != null) return d._rbe;
    let t = d.hp;
    if (d.children) for (const [c, n] of d.children) t += n * hpOf(c);
    d._rbe = t;
    return t;
  };
  for (const id in ENEMIES) hpOf(id);
})();
function pestLoadOf(e){ return e.hp + (e.def._rbe - e.def.hp) * (e.maxHp / Math.max(1, e.def.hp)); }
function pestLoad(){
  let s = 0;
  for (const e of G.enemies) if (!e.dead && onScreen(e)) s += pestLoadOf(e);
  return s;
}

/* ---------------------------------------------------------------------
   Blowback: a pest swept off its feet flies back up the trail
   --------------------------------------------------------------------- */
const BLOW_COST = { cheese: 3, basket: 9, midnight: 7, truck: 33, raccoon: 61 };
function blowCost(e, table){
  if (!e.big) return e.tier >= 6 ? 2 : 1;          // mice and rats are a mouthful
  return (table && table[e.type]) || BLOW_COST[e.type] || 40;
}
function canBlow(e, big){
  if (e.dead || e.boss || e.burrowT > 0 || e.blowD > 0 || e.holdT > 0 || e.gold) return false;
  if (e.big && (!big || e.type === 'raccoon')) return false;
  return true;
}
function blowE(e, dist){
  if (e.type === 'truck') dist *= 0.5;            // food trucks are heavy
  if (!(dist > 0)) return;
  e.blowD = dist;
  e.blowV = Math.max(300, (e.speed || 60) * 2.5);
  e.blown = (e.blown || 0) + 1;
  /* off the ground it loses its batter and its ice */
  if (e.freezeT > 0){ e.freezeT = 0; e.brittle = 0; e.shatter = null; }
  if (e.batterT > 0){ e.batterT = 0; e.batterMult = 1; }
  if (G.vis && !lowFx()) for (let i = 0; i < 4; i++){ const a = rand(0, TAU), v = rand(30, 80); part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, 0.35, '#eef4f7', 2.2, 'dust'); }
}

/* ---------------------------------------------------------------------
   Forked lightning: strikes a pest, then splits in two at every hit
   --------------------------------------------------------------------- */
function boltCan(e, z, tw){
  if (e.dead || e.burrowT > 0 || !onScreen(e)) return false;
  if (e.camo && !(tw.s && tw.s.camo)) return false;
  if (!z.ignoreImmune && e.immune && !e.glazed && !(tw.s && tw.s.allTypes) && e.immune.indexOf(z.type) >= 0) return false;
  return true;
}
function forkBolt(x0, y0, first, z, tw){
  const F = z.fork, hit = new Set([first.id]);
  const segs = [[x0, y0, first.x, first.y]];
  applyHit(first, z, tw);
  let gen = [first];
  for (let g = 1; g < F.gens && gen.length; g++){
    const next = [];
    for (const src of gen){
      const near = query(src.x, src.y, F.range, QX).filter(e => !hit.has(e.id) && boltCan(e, z, tw));
      if (near.length > F.n) near.sort((a, b) => ((a.x - src.x) ** 2 + (a.y - src.y) ** 2) - ((b.x - src.x) ** 2 + (b.y - src.y) ** 2));
      for (let i = 0; i < near.length && i < F.n; i++){ const e = near[i]; hit.add(e.id); segs.push([src.x, src.y, e.x, e.y]); next.push(e); }
    }
    for (const e of next) applyHit(e, z, tw);
    gen = next;
  }
  if (G.vis) G.fx.push({ k:'zap', segs, t:0, life: lowFx() ? 0.1 : 0.17, c: z.color || '#ffe066' });
  return hit.size;
}
function fireBolt(t, a, id){
  const tg = acquire(t, attackRange(t, a), a, a.mode);
  if (!tg) return false;
  setAim(t, id, Math.atan2(tg.y - t.y, tg.x - t.x));
  forkBolt(t.x, t.y - 6, tg, a, t);
  t.fire2 = 0.2;
  Hooks.sfx('zap');
  return true;
}

/* ---------------------------------------------------------------------
   Storms: whirlwinds (chase a pest), superstorms (roam the kitchen,
   bouncing off its walls) and the paragon's bowl whirlwinds
   --------------------------------------------------------------------- */
function stormsOf(t, k){ let n = 0; for (const s of G.storms) if (s.tw === t && (!k || s.k === k)) n++; return n; }
function fireTornado(t, a, id){
  const tg = acquire(t, attackRange(t, a), a, a.mode, e => canBlow(e, false) && !e.blown);
  if (!tg) return false;
  const ang = Math.atan2(tg.y - t.y, tg.x - t.x);
  G.storms.push({ k:'tornado', x: t.x + Math.cos(ang) * t.size, y: t.y + Math.sin(ang) * t.size, ang, spd: a.speed, r: a.r, life: a.life, max: a.life,
    spec: a, tw: t, pierce: a.pierce, hit: new Map(), tg, t: 0, seed: Math.random() * 10 });
  setAim(t, id, ang);
  t.fire2 = 0.3;
  Hooks.sfx('whirl');
  return true;
}
function fireStorm(t, a, id){
  const tg = acquire(t, attackRange(t, a), a, a.mode);
  if (!tg || stormsOf(t, 'super') >= 6) return false;
  const ang = Math.atan2(tg.y - t.y, tg.x - t.x);
  G.storms.push({ k:'super', x: t.x, y: t.y, ang, vx: Math.cos(ang) * a.speed, vy: Math.sin(ang) * a.speed, r: a.r, life: a.life, max: a.life,
    spec: a, tw: t, pierce: a.pierce, hit: new Map(), t: 0, ballT: (a.ballEvery || 3) * 0.6, seed: Math.random() * 10 });
  setAim(t, id, ang);
  t.fire2 = 0.4;
  if (G.vis) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: t.size, r1: a.r * 1.4, t:0, life:0.4, c:'#a9bccb', w:5 });
  Hooks.sfx('whirl');
  return true;
}
/* a mixing bowl's whirlwind, flung at the nearest pest it can reach */
function bowlTornado(t, b, w){
  let best = null, bd = (w.reach || 175) ** 2;
  for (const e of G.enemies){
    if (e.dead || !onScreen(e) || e.burrowT > 0) continue;
    const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
    if (d < bd){ bd = d; best = e; }
  }
  if (!best) return false;
  const ang = Math.atan2(best.y - b.y, best.x - b.x);
  G.storms.push({ k:'bowl', x: b.x, y: b.y, ang, spd: w.speed, r: w.r, life: w.life, max: w.life, spec: w, tw: t, pierce: w.pierce, hit: new Map(), tg: best, t: 0, seed: Math.random() * 10 });
  if (G.vis) G.fx.push({ k:'gust', x1: b.x, y1: b.y, x2: best.x, y2: best.y, t:0, life:0.3 });
  b.spin = G.time;
  return true;
}
const STORM_HIT = {};
function stormTick(s, dt){
  s.t += dt; s.life -= dt;
  if (s.life <= 0 || s.pierce <= 0 || G.towers.indexOf(s.tw) < 0){ s.done = true; return; }
  const a = s.spec;
  if (s.k === 'super'){
    /* it drifts in a straight line and bounces off the kitchen walls */
    s.x += s.vx * dt; s.y += s.vy * dt;
    const m = s.r * 0.45;
    if (s.x < m){ s.x = m; s.vx = Math.abs(s.vx); } else if (s.x > W - m){ s.x = W - m; s.vx = -Math.abs(s.vx); }
    if (s.y < m){ s.y = m; s.vy = Math.abs(s.vy); } else if (s.y > H - m){ s.y = H - m; s.vy = -Math.abs(s.vy); }
    s.ang = Math.atan2(s.vy, s.vx);
    /* and throws off a meringue ball every few seconds */
    const B = s.tw.s && s.tw.s.atk && s.tw.s.atk.ball;
    if (B && a.ballEvery){
      s.ballT -= dt;
      if (s.ballT <= 0){ s.ballT = a.ballEvery; launchOrb(s.tw, B, s.x, s.y, s.ang + rand(-Math.PI / 2, Math.PI / 2)); }
    }
  } else {
    /* a whirlwind chases its pest (or the nearest one it may still blow) */
    if (!s.tg || s.tg.dead || s.tg.blowD > 0 || (s.k === 'tornado' && s.tg.blown && !s.hit.has(s.tg.id))){
      let best = null, bd = 420 * 420;
      for (const e of G.enemies){
        if (e.dead || !onScreen(e) || s.hit.has(e.id) || !canBlow(e, !!a.bigBlow) || (s.k === 'tornado' && e.blown) || (e.camo && !s.tw.s.camo)) continue;
        const d = (e.x - s.x) ** 2 + (e.y - s.y) ** 2;
        if (d < bd){ bd = d; best = e; }
      }
      s.tg = best;
    }
    if (s.tg){
      const want = Math.atan2(s.tg.y - s.y, s.tg.x - s.x);
      let da = want - s.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
      const turn = 2.8 * dt;
      s.ang += clamp(da, -turn, turn);
    }
    s.x += Math.cos(s.ang) * s.spd * dt; s.y += Math.sin(s.ang) * s.spd * dt;
    if (s.x < -40 || s.x > W + 40 || s.y < -40 || s.y > H + 40){ s.done = true; return; }
  }
  const list = query(s.x, s.y, s.r, QX2);
  for (let i = 0; i < list.length && s.pierce > 0; i++){
    const e = list[i];
    if (e.dead || e.burrowT > 0) continue;
    if (e.camo && !(s.tw.s && s.tw.s.camo)) continue;
    const last = s.hit.get(e.id);
    if (s.k === 'super'){
      if (e.boss) continue;                                    // a superstorm never touches a boss
      if (last != null && G.time - last < (a.rehit || 1)) continue;
      s.hit.set(e.id, G.time);
      if (a.dmg > 0) damage(e, a.dmg + (s.tw.dmgAdd || 0), a.type || 'normal', s.tw, a);
      s.pierce -= blowCost(e);
      if (last == null && !e.dead && canBlow(e, true)) blowE(e, rand(a.blow[0], a.blow[1]));
      continue;
    }
    if (last != null) continue;
    if (s.k === 'tornado'){
      /* a whirlwind only lifts what it can carry, and a pest only once */
      if (!canBlow(e, false) || e.blown) continue;
      s.hit.set(e.id, G.time);
      blowE(e, rand(a.blow[0], a.blow[1]));
      s.pierce -= blowCost(e);
      continue;
    }
    /* a bowl whirlwind hits everything, and blows back all but bosses and raccoons */
    s.hit.set(e.id, G.time);
    if (a.dmg > 0) damage(e, a.dmg, a.type || 'normal', s.tw, a);
    s.pierce -= e.boss ? 1 : blowCost(e, a.cost);
    if (!e.dead && canBlow(e, true)) blowE(e, rand(a.blow[0], a.blow[1]));
  }
}

/* ---------------------------------------------------------------------
   Meringue balls: drift along, stick what they touch, zap what is near
   --------------------------------------------------------------------- */
function launchOrb(tw, a, x, y, ang){
  if (G.orbs.length >= 60) return null;
  const o = { x, y, vx: Math.cos(ang) * a.speed, vy: Math.sin(ang) * a.speed, life: a.life, max: a.life, r: a.r, spec: a, tw, zapT: 0.15, stuck: new Set(), seed: Math.random() * 10 };
  G.orbs.push(o);
  return o;
}
function fireOrb(t, a, id){
  const tg = acquire(t, attackRange(t, a), a, a.mode);
  if (!tg) return false;
  const ang = Math.atan2(tg.y - t.y, tg.x - t.x);
  launchOrb(t, a, t.x + Math.cos(ang) * t.size, t.y + Math.sin(ang) * t.size, ang);
  setAim(t, id, ang);
  t.fire2 = 0.3;
  Hooks.sfx('zap');
  return true;
}
const STICK = { dur: 2 };
function orbTick(o, dt){
  o.life -= dt;
  if (o.life <= 0 || G.towers.indexOf(o.tw) < 0){ o.done = true; return; }
  o.x += o.vx * dt; o.y += o.vy * dt;
  if (o.x < -30 || o.x > W + 30 || o.y < -30 || o.y > H + 30){ o.done = true; return; }
  const a = o.spec;
  /* sticks every small pest it rolls over (not ones the freezer can't touch) */
  if (a.stick) for (const e of query(o.x, o.y, o.r, QX2)){
    if (e.dead || e.big || o.stuck.has(e.id) || (e.camo && !o.tw.s.camo)) continue;
    o.stuck.add(e.id);
    STICK.dur = a.stick;
    freezeE(e, STICK, o.tw);
  }
  o.zapT -= dt * towerSpeed(o.tw);
  if (o.zapT <= 0){
    o.zapT += a.zap.rate;
    let best = null, bd = a.zap.fork.range ** 2;
    for (const e of query(o.x, o.y, a.zap.fork.range, QX2)){
      if (!boltCan(e, a.zap, o.tw)) continue;
      const d = (e.x - o.x) ** 2 + (e.y - o.y) ** 2;
      if (d < bd){ bd = d; best = e; }
    }
    if (best) forkBolt(o.x, o.y, best, a.zap, o.tw);
  }
}

/* ---------------------------------------------------------------------
   Dough hooks: one pest anywhere, kneaded away, then a pile of spikes
   --------------------------------------------------------------------- */
function vineBusy(t){ const e = t.vineE; return !!(e && !e.dead && e.holdT > 0 && e.hold && e.hold.k === 'vine' && e.hold.tw === t); }
/* tougher pests take longer to knead: about a quarter second for an ant, two for a rat */
function crushTime(e){
  let s = 0.25 * Math.pow(Math.max(1, e.def._leak || 1), 0.33);
  if (e.immune && e.immune.length) s += 0.6;
  if (e.tier >= 7) s += 1.2;
  if (e.armored) s += 0.5;
  return Math.min(3, s);
}
function hookable(e){ return !e.big && !e.boss && !e.gold && !(e.holdT > 0) && !(e.blowD > 0); }
function fireVine(t, a){
  if (vineBusy(t) || (t.vineRest || 0) > G.time) return false;
  const tg = acquire(t, 99999, a, a.mode, hookable);
  if (!tg) return false;
  const dur = crushTime(tg);
  tg.holdT = dur;
  tg.hold = { k:'vine', tw: t, dur, spec: a };
  t.vineE = tg;
  t.fire2 = 0.35;
  if (G.vis) G.fx.push({ k:'ring', x: tg.x, y: tg.y, r0: 4, r1: tg.r + 10, t:0, life:0.3, c:'#f3e1b8', w:3 });
  Hooks.sfx('hook');
  return true;
}
/* knead a pest away for good, passengers and all (they are paid for too) */
function crushPest(e, t){
  const extra = (e.def._cash || 0) - (e.def.bounty || 0);
  const nk = G.noKids; G.noKids = true;
  try { damage(e, e.hp + 1, 'normal', t, VINE_HIT); } finally { G.noKids = nk; }
  if (e.dead && extra > 0) addCash(extra * cashScale(G.round) * waveRamp(G.round, G.D).cash * (G.mod ? G.mod.cash : 1));
  return e.dead;
}
function vineDone(e, h){
  const t = h.tw;
  if (G.towers.indexOf(t) < 0 || !t.s) return;
  const x = e.x, y = e.y;
  if (crushPest(e, t)) layPile(t, h.spec.pile, x, y);
  t.vineRest = G.time + (h.spec.rest || 1.4);
  if (G.vis && !lowFx()) for (let i = 0; i < 6; i++){ const a = rand(0, TAU), v = rand(30, 90); part(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.4, i % 2 ? '#f3e1b8' : '#5a341b', 2.6, 'dot'); }
}
/* a pile of chocolate spikes on the trail: it hits whatever walks over it */
function layPile(t, p, x, y){
  if (!p) return;
  if (G.piles.length >= 120) G.piles.shift();
  G.piles.push({ x, y, r: p.r || 13, life: p.life * ((t.s && t.s.reach) || 1), t: 0, acc: 0, spec: p, tw: t, seed: Math.random() * 10 });
}
function pileTick(pl, dt){
  pl.t += dt;
  if (pl.t >= pl.life || G.towers.indexOf(pl.tw) < 0){ pl.done = true; return; }
  pl.acc += dt;
  const p = pl.spec;
  if (pl.acc < p.tick) return;
  pl.acc -= p.tick;
  let n = 0;
  for (const e of query(pl.x, pl.y, pl.r, QX2)){
    if (e.dead || e.burrowT > 0 || (e.camo && !pl.tw.s.camo)) continue;
    damage(e, p.dmg, p.type || 'sharp', pl.tw, p);
    if (p.demold && !e.dead) e.mold = false;
    if (++n >= p.pierce) break;
  }
}

/* ---------------------------------------------------------------------
   The Dough Golem's dough, creeping along the trail from the mixer
   --------------------------------------------------------------------- */
function forestTick(t, dt){
  const F = t.s.forest;
  t.forestR = Math.min(1400, (t.forestR || t.size) + F.grow * dt);
  t.forestAcc = (t.forestAcc || 0) + dt;
  if (t.forestAcc < F.tick) return;
  t.forestAcc -= F.tick;
  if (!G.roundActive) return;
  if (!F._o) F._o = F.zones.map(z => ({ bonusBig: z[2], ignoreImmune: true }));
  for (const e of query(t.x, t.y, t.forestR, QX2).slice()){
    if (e.dead || e.burrowT > 0) continue;
    const d = Math.hypot(e.x - t.x, e.y - t.y);
    let i = F.zones.findIndex(z => d <= z[0]);
    if (i < 0) i = F.zones.length - 1;
    damage(e, F.zones[i][1], 'normal', t, F._o[i]);
  }
}

/* ---------------------------------------------------------------------
   Temper: Bitter Batter, Whipped Frenzy, Kitchen Fury
   --------------------------------------------------------------------- */
function livesLost(){ return Math.max(0, (G.startLives || G.lives) - G.lives); }
function livesUp(){ return Math.max(0, G.lives - (G.startLives || G.lives)); }
/* called from damage(): every 10 damage dealt adds to the frenzy */
function wrathFeed(t, d){
  const W = t.s && t.s.wrath;
  if (!W || !(d > 0)) return;
  t.wrathLast = G.time;
  t.wrathAcc = (t.wrathAcc || 0) + d;
  if (t.wrathAcc >= W.per){
    const n = Math.floor(t.wrathAcc / W.per);
    t.wrathAcc -= n * W.per;
    t.wrathN = Math.min(W.max, (t.wrathN || 0) + n);
  }
}
function temperSpeed(t){
  const s = t.s;
  let m = 1;
  if (s.vengeance){ const V = s.vengeance; m *= 1 + V.base + V.per * Math.min(V.max, livesLost()); }
  if (s.wrath && t.wrathN) m *= 1 + s.wrath.step * t.wrathN;
  return m;
}

/* ---------------------------------------------------------------------
   Engine hooks
   --------------------------------------------------------------------- */
function mixerFire(t, a, id){
  switch (a.kind){
    case 'bolt': return fireBolt(t, a, id);
    case 'tornado': return fireTornado(t, a, id);
    case 'storm': return fireStorm(t, a, id);
    case 'orb': return fireOrb(t, a, id);
    case 'vine': return fireVine(t, a, id);
  }
  return chessFire(t, a, id);
}
/* the chip type carries over to its hooks and piles, and a sourdough starter scrubs mold with everything */
function mixerFinish(s){
  const m = s.atk.main;
  if (s.atk.hook && s.atk.hook.kind === 'vine'){
    s.atk.hook.type = m.type;
    if (s.atk.hook.pile) s.atk.hook.pile.type = m.type;
  }
  if (s.oak){
    for (const id in s.atk) s.atk[id].demold = true;
    if (s.atk.hook && s.atk.hook.pile) s.atk.hook.pile.demold = true;
    if (s.atk.ball && s.atk.ball.zap) s.atk.ball.zap.demold = true;
  }
  if (s.atk.ball && s.atk.ball.zap) s.atk.ball.zap.fork = s.atk.ball.zap.fork || { n:2, gens:5, range:120 };
}
/* after an appliance's buffs (from moreApply): the mixer's stacking ones, and the Grand Planetary Mixer's gift to Chef Nonna */
function mixerApply(t){
  const s = t.s;
  t.wrathOn = !!s.wrath;
  t.rushN = 0; t.oakN = 0;
  if (t.type === 'mixer' && !t.paragon){
    /* Dinner Rush: other mixers egg this one on, up to 5 of them */
    let n = 0, R = null;
    for (const o of G.towers) if (o !== t && o.type === 'mixer' && !o.paragon && o.base && o.base.rush && inBuffRange(o, t)){ n++; R = o.base.rush; }
    n = Math.min(5, n);
    if (n && R){
      t.rushN = n;
      const m = 1 + R.speed * n, mp = 1 + R.pierce * n;
      boostRate(s, m);
      eachAtk(s, a => { if (a.kind === 'proj' && a.pierce != null && a.pierce < 9000) a.pierce *= mp; });
    }
    /* Sourdough Starter: more pierce for every life above the starting lives */
    if (s.oak){
      const up = Math.min(100, livesUp()), m = 1 + s.oak.per * up;
      t.oakN = up;
      if (up) eachAtk(s, a => { if (a.kind === 'proj' && a.pierce != null && a.pierce < 9000) a.pierce *= m; });
    }
  }
  if (t.hero && t.type === 'chef_nonna' && G.towers.some(o => o.paragon && o.type === 'mixer')){
    /* meatballs and sauce hit 11× harder, and her abilities come back much sooner */
    t.nonnaMix = true;
    const a = s.atk.main;
    if (a){ a.dmg *= 11; if (a.bonusBig) a.bonusBig *= 11; }
    for (const ab of t.base.abilities){ ab.cd *= 0.35; if (ab.id === 'sauce') ab.dmg *= 11; if (ab.id === 'mangia' && ab.reach) ab.reach *= 2; }
  } else t.nonnaMix = false;
}
function mixerTick(dt){
  /* how much health is on the map, for Kitchen Fury and Overmix */
  G.loadT = (G.loadT || 0) - dt;
  const needLoad = G.towers.some(t => (t.s && t.s.fury) || (t.sys && t.sys.over));
  if (needLoad && G.loadT <= 0){ G.loadT = 0.25; G.pestHP = pestLoad(); }
  else if (!needLoad) G.pestHP = 0;
  let oak = false, over = false;
  for (const t of G.towers){
    const s = t.s;
    if (!s || t.type !== 'mixer') continue;
    if (s.wrath){
      if (t.wrathN && G.time - (t.wrathLast || 0) > s.wrath.idle){ t.wrathN = 0; t.wrathAcc = 0; }
    }
    t.mixSp = s.vengeance || s.wrath ? temperSpeed(t) : 0;
    if (s.fury) t.dmgAdd = Math.min(s.fury.max, Math.floor((G.pestHP || 0) / s.fury.per));
    if (s.forest) forestTick(t, dt);
    if (s.oak) oak = true;
    if (t.sys && t.sys.over) over = true;
    const key = (t.wrathN ? Math.floor(t.wrathN / 2) : 0) + ':' + (s.vengeance ? Math.min(s.vengeance.max, livesLost()) : 0) + ':' + (t.dmgAdd || 0) + ':' + (t.sys ? (t.sys.over ? 1 : 0) + '/' + Math.floor((t.sys.mom || 0) / 4) : '');
    t.mixKey = key;
  }
  G.noIncome = over;
  /* Sourdough Starter follows the lives: refresh when they change */
  if (oak){ const up = Math.min(100, livesUp()); if (up !== G.oakAt){ G.oakAt = up; refreshTowers(); } }
  if (G.storms.length){ for (const s of G.storms) stormTick(s, dt); G.storms = G.storms.filter(s => !s.done); }
  if (G.orbs.length){ for (const o of G.orbs) orbTick(o, dt); G.orbs = G.orbs.filter(o => !o.done); }
  if (G.piles.length){ for (const p of G.piles) pileTick(p, dt); G.piles = G.piles.filter(p => !p.done); }
}
/* the end of a round: frenzies cool off, and bake sales pay out */
function mixerRoundEnd(){
  for (const t of G.towers){
    if (t.type !== 'mixer' || !t.s) continue;
    t.wrathN = 0; t.wrathAcc = 0;
    if (t.s.bounty && !t.paragon) bakeSale(t, t.s.bounty, 1);
  }
}
/* the cash a bake sale brings in: its own, plus the Bread Machines (and mixing bowls) around it */
function bakeSaleCash(t, B){
  let cash = B.cash;
  if (B.farm) for (const o of G.towers) if (o.type === 'bread' && Math.hypot(o.x - t.x, o.y - t.y) <= t.s.range + o.size) cash += B.farm[Math.max(o.up[0], o.up[1], o.up[2], o.paragon ? 5 : 0)] || 0;
  if (B.bowl) cash += B.bowl * G.bowls.filter(b => b.tw === t).length;
  return Math.min(B.cap || 10000, cash);
}
function bakeSale(t, B, mult, lives){
  if (G.attract) return 0;
  const cash = Math.round(bakeSaleCash(t, B) * mult);
  const before = G.cash;
  addCash(cash);
  const got = G.cash - before;
  if (got > 0) t.cashGen += got;
  if (lives && G.diff !== 'michelin') G.lives += lives;
  if (G.vis) fxText(t.x, t.y - t.size - 18, (got > 0 ? 'Bake sale +' + money0(got) : 'Bake sale: income stopped') + (lives && G.diff !== 'michelin' ? ' · +' + lives + ' life' : ''), got > 0 ? '#ffd166' : '#ff9a8a', 1.4, 14);
  return got;
}
/* a raccoon or a boss cooked while the Grand Planetary Mixer is out: an extra bake sale */
function mixerParaKill(e){
  if (G.attract || !(e.boss || e.type === 'raccoon')) return;
  for (const t of G.paraList) if (t.type === 'mixer' && t.s && t.s.bakeSale) bakeSale(t, t.s.bakeSale, e.boss ? 2.5 : 0.5, t.s.bakeSale.lives);
}
/* the mixer's sold or merged: its storms, balls and piles go with it */
function mixerForget(t){
  G.storms = G.storms.filter(s => s.tw !== t);
  G.orbs = G.orbs.filter(o => o.tw !== t);
  G.piles = G.piles.filter(p => p.tw !== t);
  chessForget(t);
}

/* ---------------------------------------------------------------------
   Its ability: Punch Down
   --------------------------------------------------------------------- */
function runMixerAbility(t, ab){
  if (ab.id !== 'punchdown') return null;
  const a = t.s.atk.hook;
  if (!a) return false;
  const list = acquireN(t, 99999, a, t.tg, ab.n, hookable);
  if (!list.length) return false;
  for (const e of list){
    const x = e.x, y = e.y;
    if (G.vis) G.fx.push({ k:'punch', x, y, t:0, life:0.45, r: e.r + 8 });
    if (crushPest(e, t)) layPile(t, a.pile, x, y);
  }
  t.fire2 = 0.4;
  Hooks.sfx('squish');
  return true;
}
