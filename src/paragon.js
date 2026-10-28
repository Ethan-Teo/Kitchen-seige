'use strict';
/* =====================================================================
   Kitchen Siege — paragon systems
   Every paragon runs a system of its own (fuel, heat, hooks, a market...).
   The engine calls in through a few hooks:
     paraTick   every step, before the paragon attacks
     paraFired  after one of its attacks goes off
     paraKill   when any pest is cooked
     paraStats  when its stats are built (modes and blends change them)
     paraRound  at the start and end of every round
   Also here: the charred undead raised by the grill's Smoke path (an ash
   pit fed by nearby kills) and by the grill's paragon (fed by its fuel).
   ===================================================================== */
const QP = [];
const PARA = {};
/* pests on screen that something can hit */
function pestsOn(){ return G.enemies.filter(e => !e.dead && onScreen(e) && !(e.burrowT > 0)); }
/* the toughest pest on screen: bosses, then vehicles, then health */
function toughest(list){
  let best = null, bs = -Infinity;
  for (const e of list || G.enemies){
    if (e.dead || !onScreen(e) || e.burrowT > 0) continue;
    const sc = (e.boss ? 4e12 : 0) + (e.big ? 2e12 : 0) + e.tier * 1e9 + Math.min(e.hp, 9e8);
    if (sc > bs){ bs = sc; best = e; }
  }
  return best;
}
function paraXY(t){ return TOWERS[t.type].flyer && t.fx != null ? [t.fx, t.fy] : [t.x, t.y]; }
/* where a straight line from (x, y) at angle a leaves the kitchen */
function edgeHit(x, y, a){
  const dx = Math.cos(a), dy = Math.sin(a);
  let k = 2000;
  if (dx > 1e-6) k = Math.min(k, (W - x) / dx); else if (dx < -1e-6) k = Math.min(k, -x / dx);
  if (dy > 1e-6) k = Math.min(k, (H - y) / dy); else if (dy < -1e-6) k = Math.min(k, -y / dy);
  return [x + dx * Math.max(0, k), y + dy * Math.max(0, k)];
}
/* every pest along a straight line, nearest first */
function pestsOnLine(x0, y0, x1, y1, width){
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  const out = [];
  for (const e of G.enemies){
    if (e.dead || e.burrowT > 0 || !onScreen(e)) continue;
    const px = e.x - x0, py = e.y - y0, along = px * ux + py * uy;
    if (along < -e.r || along > len + e.r) continue;
    if (Math.abs(px * uy - py * ux) <= e.r + width * 0.5) out.push([along, e]);
  }
  out.sort((p, q) => p[0] - q[0]);
  return out.map(p => p[1]);
}

/* ---------------------------------------------------------------------
   Charred undead. They are whirls (things that travel back up the trail
   hitting pests) with a pest's look: `undead` names the pest they were.
   --------------------------------------------------------------------- */
const UNDEAD_CAP = 160;
function undeadCount(){ let n = 0; for (const w of G.whirls) if (w.undead) n++; return n; }
function raiseUndead(tw, look, path, d, o){
  const P = G.paths[path];
  if (!P || !(o.life > 0)) return null;
  d = clamp(d, 4, P.len - 4);
  const q = pathPos(P, d, 0);
  const def = ENEMIES[look] || ENEMIES.ant;
  const speed = o.speed || (def.big ? 46 : 74);
  const w = { path, d, seg: q.seg, x: q.x, y: q.y, r: Math.max(9, def.r * 0.85 + 3), speed, left: speed * o.life,
    spec: { dmg: o.dmg, bonusBoss: o.boss || 0, type:'normal', ignoreImmune:true }, tw, hit: new Set(), pierce: o.pierce, t: 0,
    seed: Math.random() * 10, undead: look, big: !!def.big, split: o.split || null };
  G.whirls.push(w);
  if (G.vis && !lowFx()) for (let i = 0; i < (def.big ? 10 : 4); i++){ const a = rand(0, TAU), v = rand(20, 70); part(q.x, q.y, Math.cos(a) * v, Math.sin(a) * v - 25, 0.7, i % 3 ? 'rgba(80,80,86,0.7)' : 'rgba(255,140,60,0.85)', def.big ? 6 : 3.5, 'smoke'); }
  return w;
}
/* an undead food truck that has spent itself breaks into undead picnic baskets */
function splitUndead(w){
  const s = w.split;
  for (let i = 0; i < s.n; i++) raiseUndead(w.tw, s.look, w.path, w.d - i * 16, { dmg: s.dmg, boss: s.dmg, pierce: s.pierce, life: s.life });
  if (G.vis) G.fx.push({ k:'boom', x: w.x, y: w.y, r: 50, t:0, life:0.4, c:'#ff8a3d' });
}
/* the trail spots in a grill's range nearest the pantry, where its undead rise */
function riseSpot(t){
  const S = trapSpots(t, t.s.range);
  if (!S.byExit.length) return null;
  return S.byExit[Math.floor(Math.random() * Math.min(4, S.byExit.length))];
}

/* The Smoke path's ash pit: pests cooked near the grill feed it (the first
   grill in reach takes the ash), and every so often it raises some. */
const NECRO_R = 300;
function necroFeed(e){
  for (const t of G.necros){
    if (Math.hypot(e.x - t.x, e.y - t.y) > NECRO_R) continue;
    const n = t.s.necro;
    /* about one point per layer it had: tougher pests leave more ash (and a lot more after round 80) */
    const pts = Math.max(1, Math.ceil(Math.sqrt(e.def.hp))) * (G.round >= 81 ? 3 : 1);
    t.pit = Math.min(n.cap, (t.pit || 0) + pts);
    if (!e.big && !e.boss){ const L = t.pitTypes || (t.pitTypes = []); L.push(e.type); if (L.length > 12) L.shift(); }
    t.dmgAdd = Math.min(n.max, Math.floor(t.pit / n.per));
    return;
  }
}
function necroTick(t, dt){
  const n = t.s.necro;
  if (!G.roundActive || !(t.pit >= 1) || t.stunT > 0) return;
  const sp = towerSpeed(t);
  t.necroCd = (t.necroCd || 0) - dt * sp;
  if (t.necroCd <= 0){
    t.necroCd = n.rate * (1 - Math.min(0.5, 0.1 * Math.floor(t.pit / 100)));
    if (undeadCount() < UNDEAD_CAP && G.enemies.some(e => !e.dead && onScreen(e))){
      const used = Math.min(Math.floor(t.pit), 1 + Math.floor(Math.random() * 10));
      t.pit -= used;
      const k = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < k; i++){
        const pt = riseSpot(t);
        if (!pt) break;
        const L = t.pitTypes && t.pitTypes.length ? t.pitTypes : ['ant'];
        raiseUndead(t, L[Math.floor(Math.random() * L.length)], pt.path, pt.d - i * 14, { dmg: n.dmg + n.plus, pierce: 1 + used, life: n.life * n.lifeMul });
      }
      t.dmgAdd = Math.min(n.max, Math.floor(t.pit / n.per));
    }
  }
  if (n.bigs){
    t.necroBig = (t.necroBig == null ? 3 : t.necroBig) - dt * sp;
    if (t.necroBig <= 0 && t.pit >= 20){
      t.necroBig = 3;
      const basket = t.pit >= 2100, pt = riseSpot(t);
      if (pt && undeadCount() < UNDEAD_CAP){
        t.pit -= basket ? 50 : 20;
        raiseUndead(t, basket ? 'basket' : 'cheese', pt.path, pt.d, basket
          ? { dmg: 100 + n.plus, pierce: 50, life: 10 * n.lifeMul }
          : { dmg: 40 + n.plus, pierce: 20, life: 15 * n.lifeMul });
        t.dmgAdd = Math.min(n.max, Math.floor(t.pit / n.per));
      }
    }
  }
}

/* ---------------------------------------------------------------------
   Hooks the engine calls
   --------------------------------------------------------------------- */
function paraInit(t){
  const P = PARA[t.type];
  if (!t.paragon || !P){ t.sys = null; return; }
  t.sys = Object.assign({ uses:{}, on:{} }, P.init ? P.init(t) : {});
}
function paraStats(t, s){
  if (!t.sys) paraInit(t);
  const P = PARA[t.type];
  if (P && P.stats && t.sys) P.stats(t, s);
}
function paraTick(t, dt){
  const P = PARA[t.type];
  if (P && P.tick) P.tick(t, dt);
}
function paraFired(t, a){
  const P = PARA[t.type];
  if (P && P.fired) P.fired(t, a);
}
function paraKill(e, tw){
  /* a pest cooked by the grill paragon's coal spike rises again where it fell */
  if (tw && tw.sys && G.curAtk && G.curAtk.raise && tw.type === 'grill') raiseFromKill(tw, e, G.curAtk.raise);
  if (tw && tw.sys && tw.type === 'oven') orderUp(tw, e);
  if (e.markBy && e.markBy.s && e.markBy.s.marks && G.towers.indexOf(e.markBy) >= 0){
    const m = e.markBy;
    explodeAt(e.x, e.y, m.s.marks.burst, m, { frag: { count: 8, dmg: Math.round(m.s.marks.burst.dmg / 10), pierce: 3, speed: 380, life: 0.35, type:'normal', sprite:'bubble' } });
    if (G.vis) G.fx.push({ k:'ring', x: e.x, y: e.y, r0: 6, r1: m.s.marks.burst.r, t:0, life:0.4, c:'#ffe7a8', w:4 });
  }
  if (e.layers >= 5 && e.layerBy && e.layerBy.s && e.layerBy.s.layers && G.towers.indexOf(e.layerBy) >= 0){
    const f = e.layerBy, L = f.s.layers.fry;
    explodeAt(e.x, e.y, L, f, null);
    addPuddle(e.x, e.y, { r: 42, dur: 3, slow: 0.7, bigSlow: 1, boil: { dmg: Math.round(L.dmg / 6), tick: 0.5, bigMult: 2 }, soak: true }, f, 42, 30);
  }
  moreParaKill(e, tw);
  mixerParaKill(e);
}
/* a pest on its last step into the pantry; true if something saved the day */
function paraLeakSave(e){
  for (const t of G.paraList){
    if (t.type === 'toaster' && t.sys && t.s.toastStorm && t.sys.stormCd <= 0) return toastStorm(t, e);
  }
  return false;
}
/* lives were lost: the toaster paragon's missile recharges faster */
function paraLost(){
  for (const t of G.paraList){
    if (t.type !== 'toaster' || !t.sys) continue;
    if (G.time - (t.sys.lastCut || -9) < 1) continue;
    t.sys.lastCut = G.time;
    if (t.ab.brioche > 0){ t.ab.brioche = Math.max(0, t.ab.brioche - 10); if (G.vis) fxText(t.x, t.y - t.size - 14, '−10s', '#ffcf7a', 0.9, 13); }
  }
}
function paraRound(when){
  for (const t of G.paraList){
    if (!t.sys) continue;
    if (when === 'start') t.sys.uses = {};
    const P = PARA[t.type];
    if (P && P.round) P.round(t, when);
  }
}
/* abilities that only work so many times a round, or need the system to be ready */
function paraAbBlocked(t, ab){
  if (ab.perRound && t.sys && (t.sys.uses[ab.id] || 0) >= ab.perRound) return true;
  return false;
}
function paraAbUsed(t, ab){ if (ab.perRound && t.sys) t.sys.uses[ab.id] = (t.sys.uses[ab.id] || 0) + 1; }
/* after towers are rebuilt: which paragons have systems, which grills raise undead, ice floes, head chef boosts */
function paraRefresh(){
  G.paraList = G.towers.filter(t => t.paragon && t.sys);
  G.necros = G.towers.filter(t => !t.paragon && t.s && t.s.necro);
  for (const t of G.towers) t.dmgAdd = t.s && t.s.necro ? Math.min(t.s.necro.max, Math.floor((t.pit || 0) / t.s.necro.per)) : 0;
  G.iceFloes = G.towers.some(t => t.s && t.s.iceFloes);
  for (const t of G.towers) t.heroBoost = 0;
  for (const sub of G.paraList) if (sub.type === 'sub' && sub.sys.dive && sub.s.dive){
    for (const o of G.towers) if (o.hero && Math.hypot(o.x - sub.x, o.y - sub.y) <= sub.s.range + o.size) o.heroBoost = Math.max(o.heroBoost || 0, sub.s.dive.hero);
  }
  chessRefresh();
  utensilRefresh();
}
function paraSave(t){
  const P = PARA[t.type];
  return P && P.save && t.sys ? P.save(t.sys, t) : undefined;
}
function paraLoad(t, d){
  if (!t.sys) paraInit(t);
  const P = PARA[t.type];
  if (P && P.load && t.sys && d && typeof d === 'object') try { P.load(t.sys, d, t); } catch (err) {}
}
/* a mode switch from the panel (sub: surfaced or submerged; espresso: its blend) */
function paraSet(t, key, v){
  if (!t || !t.sys) return false;
  const P = PARA[t.type];
  if (!P || !P.set) return false;
  const ok = P.set(t, key, v);
  if (ok) refreshTowers();
  return ok;
}

/* ---------------------------------------------------------------------
   The systems
   --------------------------------------------------------------------- */
/* The Thousand Cuts: blades rebound off the kitchen walls, cutting harder after each bounce */
PARA.knife = {
  init: () => ({ bounces: 0 }),
  tick(t){ t.sys.on.storm = !!t.boost.storm; },
  round(t, when){ if (when === 'start') t.sys.bounces = 0; },
};

/* The Toastpocalypse: a toast storm guards the pantry door; the brioche missile recharges faster for every life lost */
PARA.toaster = {
  init: () => ({ stormCd: 0, lastCut: -9 }),
  tick(t, dt){ if (t.sys.stormCd > 0) t.sys.stormCd -= dt; },
  save: S => ({ c: Math.round(S.stormCd) }),
  load(S, d){ S.stormCd = clamp(+d.c || 0, 0, 200); },
};
function toastStorm(t, leaker){
  const st = t.s.toastStorm;
  t.sys.stormCd = st.cd;
  let n = 0;
  for (const p of G.enemies.slice()){
    if (p.dead || !(onScreen(p) || p === leaker)) continue;
    if (p.boss || p.type === 'raccoon') damage(p, st.boss, 'normal', t, { ignoreImmune:true });
    else {
      /* everything else is cooked whole: nothing spills out */
      G.noKids = true;
      try { damage(p, p.hp + 1, 'normal', t, { ignoreImmune:true }); if (!p.dead) kill(p, t); } finally { G.noKids = false; }
      n++;
      if (G.vis && n % 4 === 0) G.fx.push({ k:'boom', x: p.x, y: p.y, r: 34, t:0, life:0.35, c:'#ffcf7a' });
    }
  }
  if (G.vis){ G.fx.push({ k:'flash', c:'rgba(255,214,140,0.45)', t:0, life:0.6 }); G.shake = 0.5; }
  Hooks.toast('Toast storm! The Toastpocalypse guards the pantry.', 'warn');
  Hooks.sfx('boom');
  return !!leaker.dead;
}

/* The Singularity: spins up as it shreds; harder hits the faster it goes, and at full speed it drags pests back */
PARA.blender = {
  init: () => ({ rpm: 0, last: -9 }),
  tick(t, dt){
    const S = t.sys;
    if (G.time - S.last > 0.5) S.rpm = Math.max(0, S.rpm - 25 * dt);
    t.dmgMul = 1 + S.rpm / 100;
    S.on.liquefy = !!t.boost.liquefy;
  },
  fired(t, a){
    if (!a.rpm) return;
    const S = t.sys;
    S.rpm = Math.min(100, S.rpm + 3); S.last = G.time;
    if (S.rpm >= 100) for (const e of query(t.x, t.y, t.s.range, QP)){ if (e.dead || e.boss) continue; knockE(e, e.big ? 1 : 2.4); }
  },
};

/* The Commercial Dish Pit: Rush Hour stacks, each one 11% faster, losing one every few seconds */
PARA.dish = {
  init: () => ({ stacks: 0, decay: 0, per: 3 }),
  tick(t, dt){
    const S = t.sys;
    if (S.stacks > 0){ S.decay -= dt; if (S.decay <= 0){ S.stacks--; S.decay = S.per; } }
    t.atkSpeed = S.stacks > 0 ? { all: Math.pow(1 / 0.9, S.stacks) } : null;
  },
};

/* The Eternal Barbecue: a tank of fuel. Coal spikes and the phoenix burn it; at half a tank or more the
   spikes fly twice as fast; empty, it works the bellows (a draining beam) until the tank is full again. */
PARA.grill = {
  init: () => ({ fuel: 100000, mode: 'fire', form: false, formT: 0, drain: 0, birdT: 0 }),
  tick(t, dt){
    const S = t.sys, cap = t.s.fuelCap || 100000;
    if (S.birdT > 0) S.birdT -= dt;
    if (S.form){
      S.fuel = Math.max(0, S.fuel - S.drain * dt);
      S.formT -= dt;
      if (S.fuel <= 0 || S.formT <= 0){ S.form = false; if (G.vis) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 120, t:0, life:0.5, c:'#ff8a3d', w:4 }); }
    }
    /* the bellows also draw air on their own, so an empty tank never stays empty for long */
    if (S.mode === 'bellows' && !S.form && G.roundActive) S.fuel = Math.min(cap, S.fuel + cap * 0.03 * dt);
    if (S.mode === 'fire' && S.fuel <= 0 && !S.form) S.mode = 'bellows';
    else if (S.mode === 'bellows' && S.fuel >= cap){ S.mode = 'fire'; if (G.vis) fxText(t.x, t.y - t.size - 16, 'REFUELED', '#ffcf7a', 1, 14); }
    const fire = S.mode === 'fire' && !S.form;
    S.on.spike = fire || S.form; S.on.bird = fire && S.birdT <= 0; S.on.bellows = S.mode === 'bellows' && !S.form; S.on.form = S.form;
    t.atkSpeed = S.fuel >= cap / 2 ? { main: 2 } : null;
  },
  fired(t, a){
    const S = t.sys, cap = t.s.fuelCap || 100000;
    if (a.fuel) S.fuel = Math.max(0, S.fuel - a.fuel);
    if (a.refuel) S.fuel = Math.min(cap, S.fuel + a.refuel);
  },
  save: S => ({ f: Math.round(S.fuel), m: S.mode }),
  load(S, d){ S.fuel = clamp(+d.f || 0, 0, 100000); S.mode = d.m === 'bellows' ? 'bellows' : 'fire'; },
};
function raiseFromKill(t, e, r){
  const S = t.sys;
  if (S.fuel < r.cost || undeadCount() >= UNDEAD_CAP) return;
  S.fuel -= r.cost;
  const look = e.boss ? 'rat' : e.type === 'raccoon' ? 'truck' : e.type;
  raiseUndead(t, look, e.path, e.d, { dmg: r.dmg, boss: r.boss, pierce: r.pierce, life: r.life });
}

/* The Bottomless Fryer: its globs build up layers of batter (see addLayer) */
PARA.fryer = { init: () => ({}) };
function addLayer(e, tw){
  const L = tw.s && tw.s.layers;
  if (!L || e.dead) return;
  e.layers = Math.min(L.max, (e.layers || 0) + 1); e.layerT = L.dur; e.layerBy = tw;
}

/* Eternal Winter: lance, lance, lance, lance, ROAR */
PARA.freezer = {
  init: () => ({ cycle: 0, cd: 1 }),
  tick(t, dt){
    const S = t.sys, s = t.s;
    if (t.stunT > 0 || !s.lance) return;
    S.cd -= dt * towerSpeed(t);
    if (S.cd > 0) return;
    const tg = acquire(t, s.range, null, t.tg);
    if (!tg){ S.cd = 0; return; }
    if (S.cycle >= 4){ winterRoar(t); S.cycle = 0; }
    else { iceLance(t, tg); S.cycle++; }
    S.cd = s.lance.rate;
  },
  save: S => ({ c: S.cycle }),
  load(S, d){ S.cycle = clamp(Math.floor(+d.c || 0), 0, 4); },
};
function iceLance(t, tg){
  const L = t.s.lance, ang = Math.atan2(tg.y - t.y, tg.x - t.x);
  setAim(t, 'main', ang);
  t.fireAnim = 0.3;
  const x0 = t.x + Math.cos(ang) * t.size * 0.7, y0 = t.y + Math.sin(ang) * t.size * 0.7;
  const [x1, y1] = edgeHit(x0, y0, ang);
  const spec = { dmg: L.dmg, bonusBig: L.bonusBig, bonusBoss: L.bonusBoss, type:'normal', ignoreImmune:true, freeze: Object.assign({ ignoreImmune:true }, L.freeze) };
  let n = 0;
  for (const e of pestsOnLine(x0, y0, x1, y1, L.width)){ if (n++ >= L.pierce) break; applyHit(e, spec, t); }
  if (G.vis) G.fx.push({ k:'beam', x1: x0, y1: y0, x2: x1, y2: y1, t:0, life:0.35, w: L.width, c:'#bfe9ff', laser:true, seed: Math.random() * 100 });
  Hooks.sfx('freeze');
}
function winterRoar(t){
  const R = t.s.roar;
  t.fireAnim = 0.4;
  for (const e of pestsOn()){
    const frozen = e.freezeT > 0;
    damage(e, R.dmg + (frozen ? R.frozen : 0), 'normal', t, { ignoreImmune:true });
    if (e.dead) continue;
    freezeE(e, { dur: R.freeze, bigDur: R.bigFreeze, ignoreImmune:true }, t);
    slowE(e, e.big ? R.bigSlow : R.slow, R.slowDur + (e.big ? R.bigFreeze : R.freeze));
    setVuln(e, { amt: R.vuln, dur: 10 });
    e.camo = false; e.mold = false;
    if (!e.boss) e.immune = null;
  }
  if (G.vis){
    G.fx.push({ k:'flash', c:'rgba(214,240,255,0.5)', t:0, life:0.8 });
    G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 20, r1: 1100, t:0, life:1.1, c:'#e6f6ff', w:10 });
    for (let i = 0; i < 30; i++) part(rand(0, W), rand(0, H), rand(-30, 30), rand(10, 50), 1.6, 'rgba(255,255,255,0.9)', 2.5, 'snow');
    G.shake = Math.max(G.shake, 0.35);
  }
  Hooks.sfx('freeze');
}

/* Fusion Reactor Prime: heat builds as it fires, raising its damage; at 100% it vents and shuts down */
PARA.micro = {
  init: () => ({ heat: 0, downT: 0, last: -9 }),
  tick(t, dt){
    const S = t.sys, R = t.s.reactor || { cool: 8, down: 4, vent: 40 };
    if (S.downT > 0){ S.downT -= dt; S.heat = Math.max(0, S.heat - 26 * dt); }
    else if (G.time - S.last > 0.3) S.heat = Math.max(0, S.heat - R.cool * dt);
    if (S.heat >= 100 && S.downT <= 0) reactorVent(t);
    t.dmgMul = 1 + S.heat / 100;
    S.on.online = S.downT <= 0;
  },
  fired(t, a){ if (a.heat){ t.sys.heat = Math.min(100, t.sys.heat + a.heat); t.sys.last = G.time; } },
};
function reactorVent(t){
  const S = t.sys, R = t.s.reactor, rad = t.s.range * 2;
  const dmg = S.heat * R.vent;
  for (const e of G.enemies.slice()) if (!e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= rad) damage(e, dmg, 'normal', t, { ignoreImmune:true });
  S.downT = R.down;
  if (G.vis){ G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: rad, t:0, life:0.6, c:'#9ff3ff', w:8 }); G.fx.push({ k:'boom', x: t.x, y: t.y, r: 90, t:0, life:0.5, c:'#9ff3ff' }); fxText(t.x, t.y - t.size - 16, 'OVERHEAT', '#9ff3ff', 1.2, 15); G.shake = Math.max(G.shake, 0.25); }
  Hooks.sfx('boom');
}

/* The Champagne Supernova: marks the toughest pests; marked pests take 50% more damage and burst when cooked */
PARA.siphon = {
  init: () => ({ markT: 1 }),
  tick(t, dt){
    const S = t.sys, M = t.s.marks;
    if (!M) return;
    S.markT -= dt;
    if (S.markT > 0) return;
    S.markT = M.every;
    let n = 0;
    for (const e of G.enemies) if (!e.dead && e.markBy === t) n++;
    if (n >= M.max) return;
    let best = null, bs = -Infinity;
    for (const e of G.enemies){
      if (e.dead || e.markBy || !onScreen(e) || e.burrowT > 0) continue;
      const sc = (e.boss ? 4e12 : 0) + (e.big ? 2e12 : 0) + e.tier * 1e9 + Math.min(e.hp, 9e8);
      if (sc > bs){ bs = sc; best = e; }
    }
    if (!best) return;
    best.markBy = t; best.markMul = M.mult;
    if (G.vis) G.fx.push({ k:'ring', x: best.x, y: best.y, r0: best.r + 30, r1: best.r + 4, t:0, life:0.35, c:'#ffe7a8', w:3 });
  },
};

/* Il Forno Supremo: every pest its pizzas cook is an order; every 100 orders, a family-size pizza */
PARA.oven = {
  init: () => ({ orders: 0 }),
  save: S => ({ o: Math.floor(S.orders) }),
  load(S, d){ S.orders = clamp(+d.o || 0, 0, 1000); },
};
function orderUp(t, e){
  const O = t.s.orders;
  if (!O) return;
  t.sys.orders += e.big ? O.big : 1;
  if (t.sys.orders < O.need) return;
  t.sys.orders -= O.need;
  const tg = toughest();
  if (!tg) return;
  const p = predictPos(tg, 1.2);
  lobTo(t, { kind:'lob', mortar:true, travel:1.2, sprite:'bigpizza', scale:2.4, family:true, impact: O.family }, p.x, p.y);
  if (G.vis && !(G.time - (t.sys.txtT || -9) < 1.5)){ t.sys.txtT = G.time; fxText(t.x, t.y - t.size - 16, 'FAMILY SIZE!', '#ffcf4d', 1.2, 15); }
  Hooks.sfx('thunk');
}

/* The Grand Planetary Mixer: electrified chips that throw faster with every throw, dough across
   the kitchen, mixing bowls, bake sales, and Overmix (a switch: more reach, tighter aim and more
   damage the more pests there are, for 1% of your cash a second and no income while it lasts) */
const MIX_RAMP = { step:0.05, max:20, reset:0.51 };
function overmixSpec(s){ return ((s && s.abilities) || []).find(x => x.id === 'overmix') || {}; }
PARA.mixer = {
  init: () => ({ mom: 0, last: -9, R: 30, acc: 0, bowlT: 3, over: false, drainAcc: 0, mul: 1 }),
  stats(t, s){
    if (!t.sys || !t.sys.over) return;
    const ab = overmixSpec(s);
    s.range *= ab.range || 1.35;
    if (s.atk.main) s.atk.main.spread *= ab.spread || 0.2;
  },
  tick(t, dt){
    const S = t.sys, s = t.s, R = s.ramp || MIX_RAMP;
    if (G.time - S.last > R.reset) S.mom = 0;
    t.atkSpeed = S.mom ? { all: 1 + R.step * S.mom } : null;
    /* the more cash in the bank, the harder everything it does hits */
    let mul = G.cash >= 5e6 ? 2 : G.cash >= 2.5e6 ? 1.5 : G.cash >= 1e6 ? 1.25 : 1;
    if (S.over){
      const ab = overmixSpec(s);
      if (G.roundActive && !G.attract){
        S.drainAcc += dt;
        while (S.drainAcc >= 1 && S.over){
          S.drainAcc -= 1;
          if (G.admin.infCash) continue;
          if (G.cash < (ab.min || 1000)){
            S.over = false; refreshTowers();
            Hooks.toast('Overmix stopped: not enough cash to keep it going.', 'warn');
            break;
          }
          const c = clamp(Math.floor(G.cash * (ab.drain || 0.01)), ab.min || 1000, ab.cap || 10000);
          G.cash -= Math.min(c, G.cash);
          if (G.vis) fxText(t.x, t.y - t.size - 14, '−' + money0(c), '#ff9a8a', 0.8, 12);
        }
      }
      if (S.over) mul *= Math.min(ab.max || 5, 1 + 0.5 * (G.pestHP || 0) / (ab.per || 15000));
    }
    t.dmgMul = mul; S.mul = mul;
    /* the dough spreads out from the mixer, all the time */
    if (s.dough){
      S.R = Math.min(1400, S.R + s.dough.grow * dt);
      S.acc += dt;
      if (S.acc >= s.dough.tick){ S.acc -= s.dough.tick; if (G.roundActive) doughTick(t); }
    }
    /* mixing bowls pop up around it while a round is on (sooner as it speeds up) and whip up whirlwinds */
    const B = s.bowls;
    if (B && G.roundActive){
      S.bowlT -= dt * (1 + R.step * S.mom);
      if (S.bowlT <= 0){ S.bowlT = B.every; if (G.bowls.filter(b => b.tw === t).length < B.max) placeBowl(t); }
      for (const b of G.bowls){
        if (b.tw !== t) continue;
        b.life -= dt; b.cd -= dt * towerSpeed(t);
        if (b.cd <= 0) b.cd = bowlTornado(t, b, B.whirl) ? B.rate : 0.5;
      }
      if (G.bowls.some(b => b.life <= 0)) G.bowls = G.bowls.filter(b => b.life > 0);
    }
  },
  /* every throw speeds the next one up, until it pauses for half a second */
  fired(t){
    const S = t.sys, R = t.s.ramp || MIX_RAMP;
    if (G.time - S.last > R.reset) S.mom = 0;
    S.mom = Math.min(R.max, S.mom + 1);
    S.last = G.time;
  },
  round(t, when){
    if (when !== 'end' || !t.s.bakeSale) return;
    bakeSale(t, t.s.bakeSale, 1, t.s.bakeSale.lives);
  },
  save: S => ({ r: Math.round(S.R), o: S.over ? 1 : undefined }),
  load(S, d){ S.R = clamp(+d.r || 30, 30, 1400); S.over = !!d.o; },
};
function money0(v){ return '$' + Math.round(v).toLocaleString(); }
function doughTick(t){
  const S = t.sys, D = t.s.dough;
  for (const e of query(t.x, t.y, S.R, QP).slice()){
    if (e.dead || e.burrowT > 0) continue;
    const d = Math.hypot(e.x - t.x, e.y - t.y);
    const z = D.zones.find(z => d <= z[0]) || D.zones[D.zones.length - 1];
    damage(e, z[1], 'normal', t, { bonusBig: z[2], ignoreImmune:true });
  }
}
/* a bowl goes down off the trail, where its whirlwinds can reach the most of it */
function placeBowl(t){
  const reach = (t.s.bowls.whirl && t.s.bowls.whirl.reach) || 175, pts = trailPoints();
  let best = null, bs = -1;
  for (let k = 0; k < 40; k++){
    const a = rand(0, TAU), d = rand(40, 300) + (k > 20 ? rand(0, 350) : 0);
    const x = t.x + Math.cos(a) * d, y = t.y + Math.sin(a) * d;
    if (x < 24 || y < 24 || x > W - 24 || y > H - 24) continue;
    if (G.paths.some(P => distToPath(P, x, y) < PATH_W / 2 + 16)) continue;
    if (G.towers.some(o => Math.hypot(o.x - x, o.y - y) < o.size + 20)) continue;
    if (G.bowls.some(b => Math.hypot(b.x - x, b.y - y) < 34)) continue;
    if (inWater(x, y, -14)) continue;
    let cov = 0;
    for (const p of pts) if ((p.x - x) ** 2 + (p.y - y) ** 2 <= reach * reach) cov++;
    const sc = cov * (0.75 + Math.random() * 0.5);
    if (sc > bs){ bs = sc; best = { x, y }; }
  }
  if (!best) return false;
  G.bowls.push({ x: best.x, y: best.y, tw: t, life: t.s.bowls.life, cd: rand(1, 5), born: G.time, seed: Math.random() * 10 });
  if (G.vis) for (let i = 0; i < 10; i++){ const an = rand(0, TAU), v = rand(30, 90); part(best.x, best.y, Math.cos(an) * v, Math.sin(an) * v, 0.5, '#fff6e3', 3, 'dust'); }
  return true;
}

/* The Pasta Pantheon: a carpet of pasta spreads along the trail around it */
PARA.pasta = {
  init: () => ({ R: 30, acc: 0 }),
  tick(t, dt){
    const S = t.sys, C = t.s.carpet;
    if (!C) return;
    S.R = Math.min(1400, S.R + C.grow * dt);
    S.acc += dt;
    if (S.acc >= C.tick){
      S.acc -= C.tick;
      if (G.roundActive) for (const e of query(t.x, t.y, S.R, QP).slice()){
        if (e.dead || e.burrowT > 0) continue;
        damage(e, C.dmg, 'normal', t, { bonusBig: C.bonusBig, bonusBoss: C.bonusBoss, ignoreImmune:true });
      }
    }
  },
  save: S => ({ r: Math.round(S.R) }),
  load(S, d){ S.R = clamp(+d.r || 30, 30, 1400); },
};

/* Apex Pepper Master: the heat scale climbs while it fires and falls while it rests */
const SCOVILLE = ['Mild', 'Bell', 'Jalapeño', 'Habanero', 'Ghost', 'Reaper'];
PARA.gatling = {
  init: () => ({ lvl: 0, up: 0, down: 0, last: -9 }),
  tick(t, dt){
    const S = t.sys, C = t.s.scoville;
    if (!C) return;
    const reaper = !!t.boost.reaper;
    if (reaper){ S.lvl = 5; S.up = 0; S.down = 0; }
    else if (G.time - S.last < 0.4){ S.down = 0; S.up += dt; if (S.up >= C.up && S.lvl < 5){ S.up = 0; S.lvl++; } }
    else { S.up = 0; S.down += dt; if (S.down >= C.down && S.lvl > 0){ S.down = 0; S.lvl--; } }
    t.dmgMul = 1 + C.per * S.lvl;
    const ab = reaper ? t.s.abilities.find(x => x.id === 'reaper') : null;
    t.hitFx = S.lvl >= 3 || ab ? { burn: S.lvl >= 3 ? C.burn : null, burst: ab ? ab.burst : null } : null;
  },
  fired(t){ t.sys.last = G.time; },
};
/* a per-hit extra from a paragon's system (the pepper mill's heat) */
function paraHitFx(e, tw){
  const f = tw.hitFx;
  if (f.burn && !e.dead) addBurn(e, f.burn, tw, true);
  if (f.burst && G.time - (tw.burstAt || 0) > 0.06){ tw.burstAt = G.time; explodeAt(e.x, e.y, f.burst, tw, null); }
}

/* Admiral of the Gravy Seas: ten grappling hooks, used one at a time, recharging together */
PARA.boat = {
  init: () => ({ hooks: 10, gapT: 0, rechargeT: 0 }),
  tick(t, dt){
    const S = t.sys, Hk = t.s.hooks;
    if (!Hk) return;
    if (S.rechargeT > 0){ S.rechargeT -= dt; if (S.rechargeT <= 0){ S.hooks = Hk.n; S.rechargeT = 0; } return; }
    S.gapT -= dt;
    if (S.gapT > 0 || S.hooks <= 0 || t.stunT > 0) return;
    let best = null, bs = -Infinity;
    for (const e of G.enemies){
      if (e.dead || !e.big || e.boss || e.type === 'raccoon' || e.hooked || !onScreen(e) || e.burrowT > 0) continue;
      const need = e.type === 'truck' ? 2 : 1;
      if (need > S.hooks) continue;
      const sc = e.tier * 1e9 + e.hp;
      if (sc > bs){ bs = sc; best = e; }
    }
    if (!best) return;
    S.hooks -= best.type === 'truck' ? 2 : 1;
    S.gapT = Hk.gap;
    if (S.hooks <= 0) S.rechargeT = Hk.recharge;
    hookAway(t, best, false);
  },
  save: S => ({ h: S.hooks, r: Math.round(S.rechargeT * 10) / 10 }),
  load(S, d){
    S.hooks = clamp(Math.floor(+d.h || 0), 0, 10); S.rechargeT = clamp(+d.r || 0, 0, 30);
    if (S.hooks <= 0 && S.rechargeT <= 0) S.hooks = 10;
  },
};
function hookAway(t, e, giant){
  e.hooked = true;
  e.holdT = Math.max(e.holdT, 0.6);
  if (G.vis) G.fx.push({ k:'hook', x1: t.x, y1: t.y, x2: e.x, y2: e.y, e, t:0, life:0.6, giant });
  G.timers.push({ t: 0.55, fn: () => {
    if (e.dead) return;
    damage(e, e.hp + 1, 'normal', t, { ignoreImmune:true });
    if (!e.dead) kill(e, t);
    if (G.vis){ G.fx.push({ k:'boom', x: e.x, y: e.y, r: e.r * 1.4, t:0, life:0.4, c:'#c98a45' }); G.shake = Math.max(G.shake, 0.2); }
  } });
  Hooks.sfx('hook');
}

/* Nautical Hoagie Core: surfaced or submerged; Final Course counts down while a round is on */
PARA.sub = {
  init: () => ({ dive: false, flipAt: -9, wait: 0, fin: null }),
  stats(t, s){
    if (t.sys.dive){
      delete s.atk.main; delete s.atk.missile;
      s.preempt = 0; s.submerged = true;
      if (s.dive) s.buff = Object.assign({}, s.dive.buff);
    } else delete s.atk.reactor;
  },
  tick(t, dt){
    const S = t.sys;
    S.on.hold = S.wait > 0;
    if (S.wait > 0 && G.roundActive){
      S.wait -= dt;
      if (S.wait <= 0){
        if (pestsOn().length) finaleStrike(t, S.fin || t.s.abilities.find(x => x.id === 'finale'));
        else S.wait = 0.05;   // nothing to hit yet: wait for a target
      }
    }
  },
  set(t, key, v){
    if (key !== 'dive') return false;
    const S = t.sys;
    if (!!v === S.dive || G.time - S.flipAt < 0.5) return false;
    S.dive = !!v; S.flipAt = G.time;
    if (G.vis) for (let i = 0; i < 14; i++){ const a = rand(0, TAU), sp = rand(30, 90); part(t.x, t.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.6, 'rgba(225,245,255,0.85)', 3, 'dot'); }
    return true;
  },
  save: S => ({ d: S.dive ? 1 : 0, w: Math.round((S.wait > 0 ? S.wait : 0) * 10) / 10 }),
  load(S, d){ S.dive = !!d.d; S.wait = clamp(+d.w || 0, 0, 60); },
};
function finaleStrike(t, ab){
  if (!ab) return;
  const list = pestsOn();
  if (!list.length) return;
  const first = list.reduce((a, e) => (G.paths[e.path].len - e.d < G.paths[a.path].len - a.d ? e : a));
  const close = list.reduce((a, e) => (Math.hypot(e.x - t.x, e.y - t.y) < Math.hypot(a.x - t.x, a.y - t.y) ? e : a));
  const strong = toughest(list);
  [first, close, strong].forEach((tg, i) => {
    const fx = { k:'missile', x0: t.x, y0: t.y, x1: tg.x, y1: tg.y, e: tg, t: -i * 0.15, life: 0.85 + i * 0.15 };
    if (G.vis) G.fx.push(fx);
    G.timers.push({ t: 0.85 + i * 0.15, fn: () => {
      const x = tg.dead ? fx.x1 : tg.x, y = tg.dead ? fx.y1 : tg.y;
      explodeAt(x, y, { r: ab.r, dmg: ab.small, bonusBig: ab.dmg - ab.small, pierce: ab.pierce, type:'normal', ignoreImmune:true }, t, null);
      const A = ab.after;
      let n = 0;
      for (const e of query(x, y, A.r, QP).slice()){
        if (e.dead || n >= A.pierce) continue;
        n++;
        damage(e, A.dmg, 'normal', t, { bonusBig: A.bonusBig, ignoreImmune:true });
        if (!e.dead && !e.boss && e.type !== 'raccoon') e.stunT = Math.max(e.stunT, A.stun);
      }
      const Pl = ab.pools;
      for (let k = 0; k < Pl.n; k++){ const a = rand(0, TAU), d = rand(0, 90); addPuddle(clamp(x + Math.cos(a) * d, 10, W - 10), clamp(y + Math.sin(a) * d, 10, H - 10), { r: 46, dur: Pl.dur, slow: 1, bigSlow: 1, toxic: true, boil: { dmg: Pl.dmg, tick: 0.5, bigMult: 1 + Pl.bonusBig / Math.max(1, Pl.dmg) } }, t, 46, 30); }
      if (G.vis){ G.fx.push({ k:'ring', x, y, r0: 20, r1: A.r, t:0, life:0.7, c:'#ffd166', w:9 }); G.fx.push({ k:'boom', x, y, r: ab.r, t:0, life:0.6, c:'#f2c230' }); G.fx.push({ k:'flash', c:'rgba(255,240,190,0.35)', t:0, life:0.4 }); G.shake = 0.7; }
      Hooks.sfx('boom');
    } });
  });
  Hooks.sfx('whoosh');
}

/* Whisk Armada: escort copters join the wing one at a time */
PARA.heli = {
  init: () => ({ wing: 2, acc: 0 }),
  tick(t, dt){
    const S = t.sys, Wg = t.s.wing;
    if (!Wg) return;
    if (G.roundActive && S.wing < Wg.max){ S.acc += dt; if (S.acc >= Wg.every){ S.acc = 0; S.wing++; } }
    if (t.s.atk.minis) t.s.atk.minis.count = Math.max(1, S.wing);
    S.on.wing = S.wing > 0;
  },
  save: S => ({ w: S.wing }),
  load(S, d){ S.wing = clamp(Math.floor(+d.w || 0), 0, 8); },
};

/* Galactic Doomsaucer: a tractor beam lifts small pests into its hold */
PARA.saucer = {
  init: () => ({ hold: 0, beamT: 1 }),
  tick(t, dt){
    const S = t.sys, T = t.s.tractor;
    if (!T || !G.roundActive || t.stunT > 0) return;
    S.beamT -= dt * towerSpeed(t);
    if (S.beamT > 0) return;
    S.beamT = T.every;
    if (S.hold >= T.max) return;
    const [x, y] = paraXY(t);
    let best = null, bs = -1;
    for (const e of query(x, y, T.r, QP)){
      if (e.dead || e.big || e.burrowT > 0 || (e.camo && !t.s.camo)) continue;
      const sc = e.tier * 1e6 + e.hp;
      if (sc > bs){ bs = sc; best = e; }
    }
    if (!best) return;
    const look = best.type, bx = best.x, by = best.y;
    G.noKids = true;
    try { damage(best, best.hp + 1, 'normal', t, { ignoreImmune:true }); if (!best.dead) kill(best, t); } finally { G.noKids = false; }
    S.hold++;
    if (G.vis) G.fx.push({ k:'abduct', x0: bx, y0: by, tw: t, look, t:0, life:0.7 });
    Hooks.sfx('whoosh');
  },
  save: S => ({ h: S.hold }),
  load(S, d){ S.hold = clamp(Math.floor(+d.h || 0), 0, 99); },
};

/* The Bottomless Cup: one house blend at a time (all four during a refill) */
const BLEND_ORDER = ['espresso', 'americano', 'mocha', 'coldbrew'];
const BLEND_NAME = { espresso:'Espresso', americano:'Americano', mocha:'Mocha', coldbrew:'Cold Brew' };
PARA.espresso = {
  init: () => ({ blend: 'espresso', refillOn: false, flipAt: -9 }),
  stats(t, s){
    const B = s.blends || {};
    const pick = t.boost && t.boost.refill ? BLEND_ORDER : [t.sys.blend];
    s.buff = Object.assign({}, s.buff);
    for (const id of pick){
      const b = B[id];
      if (!b) continue;
      for (const k in b){
        if (k === 'speed' || k === 'range') s.buff[k] = Math.max(s.buff[k] || 1, b[k]);
        else s.buff[k] = Math.max(s.buff[k] || 0, b[k]);
      }
    }
  },
  tick(t){ const on = !!t.boost.refill; if (on !== t.sys.refillOn){ t.sys.refillOn = on; refreshTowers(); } },
  set(t, key, v){
    if (key !== 'blend' || BLEND_ORDER.indexOf(v) < 0 || t.sys.blend === v) return false;
    t.sys.blend = v; t.sys.flipAt = G.time;
    if (G.vis) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 160, t:0, life:0.5, c: BLEND_COLOR[v], w:5 });
    return true;
  },
  save: S => ({ b: S.blend }),
  load(S, d){ if (BLEND_ORDER.indexOf(d.b) >= 0) S.blend = d.b; },
};
const BLEND_COLOR = { espresso:'#c8814a', americano:'#5aa6d6', mocha:'#8a5a3a', coldbrew:'#7fd3ff' };

/* Golden Bakery Empire: loaves go into a vault; the Bread Exchange sets their price */
PARA.bread = {
  init: () => ({ vault: 0, price: 1, hist: [1], acc: 0 }),
  tick(t, dt){
    const S = t.sys, M = t.s.market;
    if (!M) return;
    S.acc += dt;
    if (S.acc < M.every) return;
    S.acc = 0;
    const l = Math.log(S.price) * 0.88 + (Math.random() - 0.5) * 0.5;
    S.price = clamp(Math.exp(l), M.lo, M.hi);
    S.hist.push(S.price);
    if (S.hist.length > 40) S.hist.shift();
  },
  save: S => ({ v: S.vault, p: Math.round(S.price * 1000) / 1000, h: S.hist.map(v => Math.round(v * 100) / 100) }),
  load(S, d){ S.vault = clamp(Math.floor(+d.v || 0), 0, 9999); S.price = clamp(+d.p || 1, 0.1, 5); if (Array.isArray(d.h)) S.hist = d.h.slice(-40).map(v => clamp(+v || 1, 0.1, 5)); },
};
/* a loaf baked by the empire goes into its vault (sold off at the current price when the vault is full) */
function vaultLoaf(t){
  const S = t.sys;
  S.vault++;
  if (G.vis) G.fx.push({ k:'loafFly', x: t.x + rand(-20, 20), y: t.y - 10, golden: true, t: 0, life: 0.5, to: [t.x, t.y - t.size - 6] });
  if (S.vault >= t.s.market.cap) sellVault(t, 1);
}
function vaultValue(t, mult){ return Math.round((t.sys ? t.sys.vault : 0) * breadValue(t) * (t.sys ? t.sys.price : 1) * (mult || 1)); }
function sellVault(t, mult){
  const S = t.sys;
  if (!S || !S.vault) return 0;
  const v = vaultValue(t, mult);
  S.vault = 0;
  addCash(v); t.cashGen += v;
  G.xp.bread = (G.xp.bread || 0) + v * G.xpMult;
  if (G.vis) G.fx.push({ k:'crate', x: t.x, y: t.y - 10, t:0, life:1.3, v });
  Hooks.sfx('cash');
  return v;
}

/* ---------------------------------------------------------------------
   Paragon abilities
   --------------------------------------------------------------------- */
function runParaAbility(t, ab){
  switch (ab.id){
    case 'bladestorm':
      if (!pestsOn().length) return false;
      t.boost.storm = { mult: ab.mult, t: ab.dur };
      if (G.vis){ G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 240, t:0, life:0.6, c:'#ffd166', w:6 }); for (let i = 0; i < 16; i++){ const a = i / 16 * TAU; part(t.x, t.y, Math.cos(a) * 220, Math.sin(a) * 220, 0.35, '#eef3f5', 3, 'spark'); } }
      Hooks.sfx('whoosh');
      return true;
    case 'brioche': {
      const tg = toughest();
      if (!tg) return false;
      const spec = { kind:'proj', dmg:0, pierce:1, speed:260, size:16, scale:1.5, type:'normal', sprite:'brioche', homing:true, only:true, targetBig:true,
        explode:{ r:150, dmg: Math.round(ab.dmg / 40), bonusBig: ab.dmg, pierce:40, type:'normal', stun:5, stunBig:5, ignoreImmune:true }, expireExplode:true,
        trail: Object.assign({ every:0.25, ignoreImmune:true }, ab.trail) };
      pushProj(t.x, t.y, Math.atan2(tg.y - t.y, tg.x - t.x), spec.speed, 9, spec, t, tg);
      if (G.vis) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 90, t:0, life:0.5, c:'#ffb347', w:5 });
      Hooks.sfx('whoosh');
      return true;
    }
    case 'liquefy':
      if (!pestsOn().length) return false;
      t.boost.liquefy = { mult: 1, t: ab.dur };
      if (G.vis) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 200, t:0, life:0.6, c:'#ff9a52', w:6 });
      Hooks.sfx('sizzle');
      return true;
    case 'meteor': {
      const tg = toughest();
      if (!tg) return false;
      const fx = { k:'meteor', x: tg.x, y: tg.y, e: tg, t:0, life:0.55 };
      if (G.vis) G.fx.push(fx);
      G.timers.push({ t: 0.5, fn: () => {
        const x = tg.dead ? fx.x : tg.x, y = tg.dead ? fx.y : tg.y;
        explodeAt(x, y, { r: ab.r, dmg: ab.small, bonusBig: ab.dmg - ab.small, pierce: ab.pierce, type:'normal', ignoreImmune:true, burn:{ dmg:60, tick:0.5, dur:3 } }, t, null);
        const ball = { kind:'proj', dmg: ab.ballDmg, pierce:2, speed:300, size:8, type:'normal', sprite:'fireball', lava:true, homing:true, ignoreImmune:true };
        for (let i = 0; i < ab.balls; i++) pushProj(x, y, i / ab.balls * TAU, ball.speed, 5, ball, t, null);
        if (G.vis){ G.fx.push({ k:'boom', x, y, r: ab.r, t:0, life:0.7, c:'#ff7a2a' }); G.fx.push({ k:'flash', c:'rgba(255,170,90,0.35)', t:0, life:0.5 }); G.shake = 0.7; }
        Hooks.sfx('boom');
      } });
      Hooks.sfx('whoosh');
      return true;
    }
    case 'rushhour': {
      const S = t.sys;
      if (!S) return false;
      S.stacks = ab.stacks; S.decay = ab.decay; S.per = ab.decay;
      if (G.vis) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 180, t:0, life:0.6, c:'#bfe9ff', w:6 });
      Hooks.sfx('whoosh');
      return true;
    }
    case 'pyre': {
      const S = t.sys;
      if (!S || S.fuel < 1000 || !pestsOn().length) return false;
      const fuel = S.fuel;
      for (const e of pestsOn()) if (Math.hypot(e.x - t.x, e.y - t.y) <= ab.r) addBurn(e, { dmg: ab.dot, tick: 0.5, dur: 30, ii: true }, t, true);
      const n = Math.min(ab.trucks, Math.floor(fuel / ab.per));
      const Sp = trapSpots(t, t.s.range);
      for (let i = 0; i < n; i++) G.timers.push({ t: 0.35 + i * 0.6, soft:true, fn: () => {
        if (G.towers.indexOf(t) < 0 || !Sp.byExit.length) return;
        /* spread along the trail in reach, nearest the pantry first */
        const pt = Sp.byExit[Math.min(Sp.byExit.length - 1, Math.floor(i * Sp.byExit.length / Math.max(n, 4)))];
        raiseUndead(t, 'truck', pt.path, pt.d, { dmg: ab.truck.dmg, boss: ab.truck.dmg, pierce: ab.truck.pierce, life: ab.truck.life, speed: 40,
          split: { look:'basket', n:4, dmg: ab.basket.dmg, pierce: ab.basket.pierce, life: ab.basket.life } });
      } });
      S.fuel = 0; S.mode = 'bellows'; S.birdT = 10; S.form = false;
      if (G.vis){ G.fx.push({ k:'boom', x: t.x, y: t.y, r: ab.r, t:0, life:0.8, c:'#ff5a1f' }); G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 20, r1: ab.r, t:0, life:0.7, c:'#ffb347', w:8 }); G.fx.push({ k:'flash', c:'rgba(255,120,50,0.3)', t:0, life:0.5 }); G.shake = 0.6; }
      Hooks.sfx('boom');
      return true;
    }
    case 'inferno': {
      const S = t.sys;
      if (!S || S.form || S.fuel < ab.drain || !pestsOn().length) return false;
      S.form = true; S.drain = ab.drain; S.formT = ab.max; S.mode = 'fire';
      if (G.vis){ G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 160, t:0, life:0.6, c:'#ff7a2a', w:7 }); for (let i = 0; i < 20; i++){ const a = rand(0, TAU), v = rand(60, 160); part(t.x, t.y, Math.cos(a) * v, Math.sin(a) * v, 0.6, i % 2 ? '#ffb347' : '#ff5a1f', 5, 'flame'); } }
      Hooks.sfx('flame');
      return true;
    }
    case 'deepfry': {
      const list = pestsOn().filter(e => e.layers > 0);
      if (!list.length) return false;
      for (const e of list){
        const n = e.layers;
        damage(e, n * ab.per * (e.big ? ab.big : 1), 'heat', t, { ignoreImmune:true });
        if (!e.dead){ e.layers = 0; if (!e.big) stunE(e, ab.stun); }
        if (G.vis) G.fx.push({ k:'splat', x: e.x, y: e.y, r: 14 + n * 5, t:0, life:0.45, seed: Math.random() * 10 });
      }
      if (G.vis){ G.fx.push({ k:'vat', x: t.x, y: t.y, r: 260, t:0, life:0.7 }); G.shake = 0.3; }
      Hooks.sfx('sizzle');
      return true;
    }
    case 'longnight': {
      if (!pestsOn().length) return false;
      G.glob.night = { t: ab.delay + ab.cold, max: ab.delay + ab.cold, delay: ab.delay, slow: ab.slow };
      G.timers.push({ t: ab.delay, soft:true, fn: () => {
        for (const e of G.enemies){ if (e.dead) continue; freezeE(e, { dur: ab.dur, bigDur: ab.bigDur, ignoreImmune:true }, t); }
        if (G.vis){ G.fx.push({ k:'flash', c:'rgba(200,230,255,0.55)', t:0, life:1 }); G.shake = 0.4; }
        Hooks.sfx('freeze');
      } });
      Hooks.toast('Night falls on the kitchen...', 'info');
      return true;
    }
    case 'meltdown': {
      const S = t.sys;
      if (!S || S.heat < 5) return false;
      const list = pestsOn();
      if (!list.length) return false;
      const base = S.heat * ab.per;
      for (const e of list){ damage(e, base * (e.boss ? ab.boss : e.big ? ab.big : 1), 'normal', t, { ignoreImmune:true }); if (!e.dead) setVuln(e, { amt: 5, dur: 5 }); }
      S.heat = 0;
      if (G.vis){ G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 20, r1: 1300, t:0, life:1, c:'#9ff3ff', w:14 }); G.fx.push({ k:'flash', c:'rgba(159,243,255,0.4)', t:0, life:0.6 }); G.shake = 0.6; }
      Hooks.sfx('boom');
      return true;
    }
    case 'supernova': {
      const tg = toughest();
      if (!tg) return false;
      const ang = Math.atan2(tg.y - t.y, tg.x - t.x);
      setAim(t, 'main', ang);
      const [x1, y1] = edgeHit(t.x, t.y, ang);
      for (const e of pestsOnLine(t.x, t.y, x1, y1, ab.width)){
        damage(e, ab.dmg, 'normal', t, { bigMult: ab.big, ignoreImmune:true });
        if (!e.dead && e.big){ stunE(e, 2); e.crippleMult = 1.5; e.crippleT = 8; }
      }
      if (G.vis){ G.fx.push({ k:'beam', x1: t.x, y1: t.y, x2: x1, y2: y1, t:0, life:0.6, w: ab.width, c:'#ffe7a8', laser:true, seed: Math.random() * 100 }); G.fx.push({ k:'flash', c:'rgba(255,240,200,0.3)', t:0, life:0.35 }); G.shake = 0.4; }
      Hooks.sfx('laser');
      return true;
    }
    case 'avalanche': {
      const list = pestsOn();
      if (!list.length) return false;
      for (const e of list) stunE(e, e.big ? ab.stun * 0.5 : ab.stun);
      const pts = trailPoints();
      const spec = { kind:'lob', sprite:'bigpizza', mortar:true, impact:{ r: ab.r, dmg: ab.dmg, bonusBig: ab.bonusBig, pierce:60, type:'normal', ignoreImmune:true, burn:{ dmg:40, tick:0.5, dur:2 } } };
      for (let i = 0; i < ab.count; i++){
        const pt = pts[Math.floor(Math.random() * pts.length)];
        G.timers.push({ t: i * 0.07, fn: () => G.lobs.push({ x0: pt.x + rand(-60, 60), y0: pt.y - 340, x1: pt.x, y1: pt.y, t: 0, dur: 0.6, spec, tw: t, h: 8, spin: Math.random() * TAU }) });
      }
      if (G.vis) G.fx.push({ k:'flash', c:'rgba(255,214,120,0.25)', t:0, life:0.4 });
      Hooks.sfx('thunk');
      return true;
    }
    case 'overmix': {
      /* a switch: on, it drains cash every second of a round and stops all income; off, back to normal */
      const S = t.sys;
      if (!S) return false;
      if (!S.over && !G.admin.infCash && G.cash < (ab.min || 1000)){ Hooks.toast('Overmix needs at least ' + money0(ab.min || 1000) + ' to start.', 'warn'); return false; }
      S.over = !S.over; S.drainAcc = 0;
      refreshTowers();
      G.noIncome = G.towers.some(o => o.type === 'mixer' && o.sys && o.sys.over);
      if (G.vis){
        G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: S.over ? 260 : 120, t:0, life:0.6, c: S.over ? '#e2383f' : '#f29ac0', w:7 });
        fxText(t.x, t.y - t.size - 16, S.over ? 'OVERMIX!' : 'Back to a gentle stir', S.over ? '#ff8a7a' : '#f7c6dc', 1.1, 15);
      }
      Hooks.sfx('whirl');
      return true;
    }
    case 'boil':
      if (!G.roundActive) return false;
      t.boost.boil = { mult: ab.mult, t: ab.dur };
      if (G.vis) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 160, t:0, life:0.6, c:'#f0d27a', w:6 });
      Hooks.sfx('squish');
      return true;
    case 'pastageddon': {
      /* using it again sets off the mines still on the trail */
      const old = G.traps.filter(tr => tr.tw === t && tr.geddon);
      for (const tr of old){ tr.done = true; explodeAt(tr.x, tr.y, tr.spec.mine, t, tr.spec); }
      if (old.length) G.traps = G.traps.filter(tr => !tr.done);
      const spec = { r: 24, pierce: 1, life: 400, sprite:'ravioli', mine: ab.mine, cluster:{ count:3, r:40, dmg: Math.round(ab.mine.dmg / 30), pierce:10, spread:50, depth:1, type:'normal', bonusBig: Math.round(ab.mine.bonusBig / 100) } };
      let k = 0;
      G.paths.forEach(P => {
        const gap = P.len / (ab.per + 1);
        for (let i = 1; i <= ab.per; i++){
          const q = pathPos(P, gap * i, 0);
          if (q.x < 10 || q.x > W - 10 || q.y < 10 || q.y > H - 10) continue;
          G.timers.push({ t: (k++) * 0.03, fn: () => addTrap(t, spec, { x: q.x, y: q.y, ang: q.ang }, true, { rain: true, life: 400, fly: 0.45, x0: q.x, y0: q.y - 240, geddon: true }) });
        }
      });
      Hooks.sfx('squish');
      return true;
    }
    case 'reaper':
      if (!pestsOn().length) return false;
      t.boost.reaper = { mult: ab.mult, t: ab.dur };
      if (G.vis) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 200, t:0, life:0.6, c:'#ff3b1f', w:7 });
      Hooks.sfx('flame');
      return true;
    case 'leviathan': {
      let best = null, bs = -Infinity;
      for (const e of G.enemies){
        if (e.dead || !e.big || e.hooked || !onScreen(e) || e.burrowT > 0) continue;
        /* the toughest vehicle on the map: a boss first, then raccoons, then by size */
        const sc = (e.boss ? 4e12 : 0) + e.tier * 1e9 + Math.min(e.hp, 9e8);
        if (sc > bs){ bs = sc; best = e; }
      }
      if (!best) return false;
      if (best.boss){
        if (G.vis) G.fx.push({ k:'hook', x1: t.x, y1: t.y, x2: best.x, y2: best.y, e: best, t:0, life:0.6, giant: true });
        G.timers.push({ t: 0.55, fn: () => { if (!best.dead) damage(best, best.maxHp * ab.bossPct, 'normal', t, { ignoreImmune:true }); } });
        best.holdT = Math.max(best.holdT, 0.6);
        Hooks.sfx('hook');
      } else hookAway(t, best, true);
      return true;
    }
    case 'finale': {
      const S = t.sys;
      if (!S || S.wait > 0 || !pestsOn().length) return false;
      S.wait = ab.wait; S.fin = ab;
      if (G.vis) fxText(t.x, t.y - t.size - 16, 'FINAL COURSE: ' + Math.round(ab.wait), '#ffd166', 1.2, 15);
      Hooks.toast('Final Course: missiles away in ' + Math.round(ab.wait) + ' seconds.', 'info');
      return true;
    }
    case 'strafe': {
      const S = t.sys;
      if (!S || S.wing <= 0 || !pestsOn().length) return false;
      const n = S.wing;
      S.wing = 0; S.acc = 0;
      for (let i = 0; i < n; i++){
        const pi = i % G.paths.length, P = G.paths[pi], steps = 24, hit = new Set(), delay = i * 0.2;
        if (G.vis) G.fx.push({ k:'strafe', path: pi, t: -delay, life: 2.4 });
        for (let s = 0; s < steps; s++) G.timers.push({ t: delay + s * 0.1, soft:true, fn: () => {
          const hi = P.len * (1 - s / steps), lo = P.len * (1 - (s + 1) / steps);
          for (const e of G.enemies){
            if (e.dead || e.path !== pi || e.d > hi + ab.r || e.d < lo - ab.r || hit.has(e.id) || e.burrowT > 0) continue;
            hit.add(e.id);
            damage(e, ab.dmg, 'normal', t, { bonusBig: ab.bonusBig, ignoreImmune:true });
          }
        } });
      }
      Hooks.sfx('whoosh');
      return true;
    }
    case 'bombers': {
      const list = pestsOn();
      if (!list.length) return false;
      const tg = toughest(list);
      let bestA = 0, bestN = -1;
      for (let i = 0; i < 12; i++){
        const a = i / 12 * Math.PI, dx = Math.cos(a), dy = Math.sin(a);
        let n = 0;
        for (const e of list){ const px = e.x - tg.x, py = e.y - tg.y; if (Math.abs(px * dy - py * dx) < 60) n++; }
        if (n > bestN){ bestN = n; bestA = a; }
      }
      const [xa, ya] = edgeHit(tg.x, tg.y, bestA + Math.PI), [xb, yb] = edgeHit(tg.x, tg.y, bestA);
      const S = t.sys, extra = S ? S.hold : 0;
      if (S) S.hold = 0;
      const per = ab.per + Math.ceil(extra / 3);
      const nx = -Math.sin(bestA), ny = Math.cos(bestA);
      for (let b = 0; b < 3; b++){
        const off = (b - 1) * 34, x0 = xa + nx * off, y0 = ya + ny * off, x1 = xb + nx * off, y1 = yb + ny * off;
        if (G.vis) G.fx.push({ k:'bombers', x0, y0, x1, y1, t: -0.6 - b * 0.12, life: 2.2 });
        for (let j = 0; j < per; j++){
          const f = (j + 0.5) / per, bx = clamp(x0 + (x1 - x0) * f, 8, W - 8), by = clamp(y0 + (y1 - y0) * f, 8, H - 8);
          G.timers.push({ t: 0.6 + b * 0.12 + f * 1.6 + 0.35, fn: () => {
            explodeAt(bx, by, { r: ab.r, dmg: ab.small, bonusBig: ab.dmg - ab.small, pierce: ab.pierce, type:'normal', ignoreImmune:true }, t, null);
            for (const e of query(bx, by, ab.r, QP)) if (!e.dead) stunE(e, e.big ? ab.stun * 0.5 : ab.stun);
          } });
        }
      }
      Hooks.sfx('whoosh');
      return true;
    }
    case 'refill':
      if (!t.sys) return false;
      t.boost.refill = { mult: 1, t: ab.dur };
      if (G.vis){ G.fx.push({ k:'flash', c:'rgba(255,209,102,0.2)', t:0, life:0.5 }); G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 900, t:0, life:0.9, c:'#c8814a', w:8 }); }
      Hooks.sfx('puff');
      return true;
    case 'marketday': {
      if (!t.sys || !t.sys.vault) return false;
      const v = sellVault(t, ab.mult);
      if (G.vis) fxText(t.x, t.y - t.size - 22, 'Market Day! +' + money0(v), '#ffd166', 1.4, 16);
      return true;
    }
  }
  return null;
}

/* ---------------------------------------------------------------------
   What the panel and the bar under a paragon show about its system
   --------------------------------------------------------------------- */
function paraBar(t){
  const S = t.sys, s = t.s;
  if (!S || !s) return null;
  switch (t.type){
    case 'toaster': { const cd = s.toastStorm ? s.toastStorm.cd : 120; return { v: 1 - S.stormCd / cd, c: S.stormCd <= 0 ? '#ffcf7a' : '#9aa6ab' }; }
    case 'blender': return { v: S.rpm / 100, c: S.rpm >= 100 ? '#ff5a2a' : '#ff9a52' };
    case 'dish': return { pips: true, n: S.stacks, max: 10, c: '#bfe9ff' };
    case 'grill': return { v: S.fuel / (s.fuelCap || 100000), mark: 0.5, c: S.form ? '#ff3b1f' : S.mode === 'bellows' ? '#c9d2d6' : '#ff8a3d', txt: S.form ? 'INFERNO' : S.mode === 'bellows' ? 'BELLOWS' : null, tc: '#ffcf7a' };
    case 'freezer': return { pips: true, n: S.cycle, max: 5, c: '#bfe9ff' };
    case 'micro': return { v: S.heat / 100, c: S.downT > 0 ? '#9aa6ab' : S.heat > 75 ? '#ff5a3c' : S.heat > 40 ? '#ffbe50' : '#9ff3ff', txt: S.downT > 0 ? 'COOLING' : null, tc: '#c9d2d6' };
    case 'oven': return { v: S.orders / ((s.orders && s.orders.need) || 100), c: '#ffcf4d' };
    case 'mixer': return { v: S.mom / 20, c: S.over ? '#ff5a4e' : '#f29ac0' };
    case 'gatling': return { pips: true, n: S.lvl, max: 5, c: '#ff5a2a', cs: ['#f2c14e', '#7ab648', '#ff8a3d', '#e2383f', '#9b1a12'] };
    case 'boat': return S.rechargeT > 0 ? { v: 1 - S.rechargeT / ((s.hooks && s.hooks.recharge) || 10), c: '#9aa6ab' } : { pips: true, n: S.hooks, max: (s.hooks && s.hooks.n) || 10, c: '#e6ecee' };
    case 'sub': return S.wait > 0 ? { v: 1 - S.wait / ((S.fin && S.fin.wait) || 15), c: '#ffd166' } : null;
    case 'heli': return { pips: true, n: S.wing, max: (s.wing && s.wing.max) || 8, c: '#9fbf7a' };
    case 'saucer': return { v: S.hold / ((s.tractor && s.tractor.max) || 40), c: '#b8f0c0' };
    case 'bread': return { v: S.vault / ((s.market && s.market.cap) || 240), c: '#ffd166', txt: '×' + S.price.toFixed(2), tc: S.price >= 1 ? '#9df29a' : '#ff9a8a' };
  }
  return moreParaBar(t);
}
const fmtK = v => Math.round(v).toLocaleString();
function paraUI(t){
  const S = t.sys, s = t.s;
  if (!S || !s) return null;
  const sec = v => (Math.ceil(v * 10) / 10).toFixed(1) + 's';
  switch (t.type){
    case 'knife': return { title:'Rebounds', lines: ['Knives rebound off the kitchen walls twice and slicer wheels three times. After each bounce a blade can cut the same pests again, and hits harder.', 'Slicer wheels split into mezzalunas when half spent, and again when they stop.', 'Rebounds this round: ' + fmtK(S.bounces) + '.'] };
    case 'toaster': {
      const st = s.toastStorm || { cd: 120, boss: 0 };
      return { title:'Toast storm', meter: { v: 1 - S.stormCd / st.cd, c: S.stormCd <= 0 ? '#ffcf7a' : '#9aa6ab', text: S.stormCd <= 0 ? 'Ready' : 'Recharging · ' + Math.ceil(S.stormCd) + 's' },
        lines: ['When a pest reaches the pantry door, a toast storm cooks every pest on screen, whole. Raccoons and bosses take ' + fmtK(st.boss) + ' instead.', 'Ballistic Brioche recharges 10s faster for every leak.'] };
    }
    case 'blender': return { title:'Spin speed', meter: { v: S.rpm / 100, c: S.rpm >= 100 ? '#ff5a2a' : '#ff9a52', text: Math.round(S.rpm) + '% · hits ' + (1 + S.rpm / 100).toFixed(2) + '× as hard' },
      lines: ['Spins up while it shreds and slows down when nothing is near. At full speed it hits twice as hard and drags pests back into the vortex.'] };
    case 'dish': return { title:'Rush Hour', pips: { n: S.stacks, max: 10, c: '#bfe9ff' },
      lines: [S.stacks ? S.stacks + ' stacks: works ' + Math.round((Math.pow(1 / 0.9, S.stacks) - 1) * 100) + '% faster. One wears off every ' + S.per + 's.' : 'Rush Hour gives 10 stacks, each one 11% faster. One wears off every 3s.', 'Every other Prep Station appliance on the map works 11% faster.'] };
    case 'grill': {
      const cap = s.fuelCap || 100000, half = S.fuel >= cap / 2;
      const mode = S.form ? 'Inferno Form: coal spikes, a cascade of flame and walls of fire, burning ' + fmtK(S.drain) + ' fuel a second.'
        : S.mode === 'bellows' ? 'Out of fuel: working the bellows. They refill the tank, faster for every pest the heat beam hits, and nothing else fires until it is full.'
        : half ? 'Stoked: over half a tank, so coal spikes fly twice as fast.' : 'Burning: coal spikes and the phoenix use fuel.';
      const rc = (s.atk.main && s.atk.main.raise && s.atk.main.raise.cost) || 120;
      return { title:'Fuel', meter: { v: S.fuel / cap, c: S.form ? '#ff3b1f' : S.mode === 'bellows' ? '#c9d2d6' : '#ff8a3d', text: fmtK(S.fuel) + ' of ' + fmtK(cap), mark: 0.5 },
        lines: [mode, 'Every pest a coal spike cooks rises as a charred undead and walks back up the trail (' + rc + ' fuel each).' + (S.birdT > 0 ? ' The phoenix returns in ' + Math.ceil(S.birdT) + 's.' : '')] };
    }
    case 'fryer': {
      let n = 0, fried = 0;
      for (const e of G.enemies) if (!e.dead && e.layers > 0){ n++; if (e.layers >= 5) fried++; }
      return { title:'Batter layers', lines: ['Each glob adds a layer of batter, up to 5. Every layer makes a pest take 10% more damage from everything; deep-fried pests (5 layers) burst into boiling oil when cooked.', 'Battered pests on screen: ' + n + (fried ? ' (' + fried + ' deep-fried)' : '') + '.'] };
    }
    case 'freezer': return { title:'Winter’s cycle', pips: { n: S.cycle, max: 5, c: '#bfe9ff', labels: true },
      lines: [S.cycle >= 4 ? 'Next: the roar. Every pest on the map freezes, slows, takes +' + (s.roar ? s.roar.vuln : 8) + ' damage and loses ghost cloaks, mold and immunities.' : 'Next: ice lance ' + (S.cycle + 1) + ' of 4, through everything to the edge of the kitchen.', 'Every sink and puddle is frozen over: any appliance can stand on the ice.'] };
    case 'micro': return { title:'Reactor heat', meter: { v: S.heat / 100, c: S.downT > 0 ? '#9aa6ab' : S.heat > 75 ? '#ff5a3c' : S.heat > 40 ? '#ffbe50' : '#9ff3ff', text: S.downT > 0 ? 'Shut down · back in ' + sec(S.downT) : Math.round(S.heat) + '% · hits ' + (1 + S.heat / 100).toFixed(2) + '× as hard' },
      lines: ['Heats up as it fires and cools when it stops. At 100% it overheats: a blast around it, then it shuts down for ' + ((s.reactor && s.reactor.down) || 4) + 's.', 'Meltdown turns the heat into a wave across the kitchen instead.'] };
    case 'siphon': {
      let n = 0;
      for (const e of G.enemies) if (!e.dead && e.markBy === t) n++;
      return { title:'Marks', pips: { n, max: (s.marks && s.marks.max) || 3, c: '#ffd166' },
        lines: ['Every ' + ((s.marks && s.marks.every) || 3) + 's it marks the toughest pest. Marked pests take 50% more damage from everything, its corks go for them first, and they burst into fizz when cooked.'] };
    }
    case 'oven': { const need = (s.orders && s.orders.need) || 100; return { title:'Orders', meter: { v: S.orders / need, c: '#ffcf4d', text: Math.floor(S.orders) + ' of ' + need },
      lines: ['Every pest its pizzas cook is an order (vehicles count as ' + ((s.orders && s.orders.big) || 10) + '). At ' + need + ', a family-size pizza lands on the toughest pest on the map.'] }; }
    case 'mixer': {
      const bowls = G.bowls.filter(b => b.tw === t).length, bs = s.bakeSale || {};
      const ab = overmixSpec(s), over = !!S.over;
      const crowd = over ? Math.min(ab.max || 5, 1 + 0.5 * (G.pestHP || 0) / (ab.per || 15000)) : 1;
      const cashMul = G.cash >= 5e6 ? 2 : G.cash >= 2.5e6 ? 1.5 : G.cash >= 1e6 ? 1.25 : 1;
      return { title: over ? 'Overmixing' : 'Momentum', meter: { v: S.mom / 20, c: over ? '#ff5a4e' : '#f29ac0', text: 'Throws ' + Math.round(S.mom * 5) + '% faster' },
        lines: ['Every throw speeds up the next, up to twice as fast; half a second without throwing and it starts over.',
          'Dough has spread ' + Math.round(S.R) + ' px across the kitchen: the closer a pest is to the mixer, the more it hurts.',
          'Mixing bowls: ' + bowls + ' of ' + ((s.bowls && s.bowls.max) || 6) + '. Their whirlwinds blow pests and vehicles back up the trail.',
          'Bake sale every round: ' + money0(bakeSaleCash(t, bs)) + ' and a life (' + money0(bs.cash || 240) + ', +' + money0(bs.bowl || 20) + ' a bowl, more for Bread Machines in range), and again when a raccoon or a boss is cooked.',
          cashMul > 1 ? 'With ' + money0(G.cash) + ' in the bank, it hits ' + cashMul + '× as hard.' : 'Hits harder with more cash in the bank: 1.25× from $1M, 1.5× from $2.5M, 2× from $5M.',
          over ? 'Overmix is on: ' + (Math.round(crowd * 100) / 100) + '× damage from the crowd, ' + money0(clamp(Math.floor(G.cash * (ab.drain || 0.01)), ab.min || 1000, ab.cap || 10000)) + ' a second, and no income.' : 'Overmix is off.'] };
    }
    case 'pasta': {
      let mines = 0;
      for (const tr of G.traps) if (tr.tw === t && tr.keep) mines++;
      return { title:'Pasta carpet', meter: { v: Math.min(1, S.R / 1100), c: '#f0d27a', text: S.R >= 1100 ? 'Covers every trail' : 'Spread ' + Math.round(S.R) + ' px' },
        lines: ['A carpet of pasta spreads along the trail from it and shreds everything walking on it every half second.', 'Giant ravioli mines on the trail: ' + mines + '. They keep for 5 minutes.'] };
    }
    case 'gatling': return { title:'Heat scale', pips: { n: S.lvl, max: 5, c: '#ff5a2a', cs: ['#f2c14e', '#7ab648', '#ff8a3d', '#e2383f', '#9b1a12'] },
      lines: [SCOVILLE[S.lvl] + (S.lvl ? ': hits ' + Math.round(S.lvl * 20) + '% harder' + (S.lvl >= 3 ? ' and sets pests alight.' : '.') : ': fire for a while to heat it up.'), 'Climbs a step every 2s of firing and drops one every 1.5s of rest.'] };
    case 'boat': return { title:'Grappling hooks', pips: { n: S.hooks, max: (s.hooks && s.hooks.n) || 10, c: '#e6ecee' },
      lines: [S.rechargeT > 0 ? 'All hooks out: recharging · ' + Math.ceil(S.rechargeT) + 's.' : 'It hooks the toughest vehicle anywhere on the map and drags it off. Food trucks take two hooks; raccoons and bosses are too big.', 'Every water appliance and aircraft on the map works 20% faster.'] };
    case 'sub': return { title:'Mode', buttons: [{ key:'dive', value:false, label:'Surfaced', on: !S.dive, title:'Pickle rockets and missiles that meet every vehicle at the door' }, { key:'dive', value:true, label:'Submerged', on: S.dive, title:'Reactor pulses, faster abilities everywhere, stronger head chefs' }],
      lines: [S.dive ? 'Submerged: its reactor pulses strip cloaks and mold. Every ability on the map recharges 35% faster, and head chefs in range hit ' + ((s.dive && s.dive.hero) || 3) + ' times as hard.' : 'Surfaced: homing pickle storms, mustard missiles at vehicles, and a missile for every vehicle that enters the kitchen.',
        S.wait > 0 ? 'Final Course: missiles away in ' + Math.ceil(S.wait) + 's. Its other attacks are paused.' : 'Final Course counts down only while a round is on.'] };
    case 'heli': return { title:'Escort wing', pips: { n: S.wing, max: (s.wing && s.wing.max) || 8, c: '#9fbf7a' },
      lines: ['A new escort copter joins every ' + ((s.wing && s.wing.every) || 4) + 's while a round is on. Strafing Run sends them all down the trail; the more there are, the harder it hits.'] };
    case 'saucer': return { title:'Hold', meter: { v: S.hold / ((s.tractor && s.tractor.max) || 40), c: '#b8f0c0', text: S.hold + ' of ' + ((s.tractor && s.tractor.max) || 40) + ' pests' },
      lines: ['Its tractor beam lifts the toughest small pest below it into the hold every ' + ((s.tractor && s.tractor.every) || 1.2).toFixed(1) + 's.', 'Carpet Bombing drops everything in the hold as extra bombs.'] };
    case 'espresso': {
      const b = (s.blends || {})[S.blend] || {};
      const fx = [];
      if (b.speed > 1) fx.push(Math.round((b.speed - 1) * 100) + '% faster');
      if (b.range > 1) fx.push('+' + Math.round((b.range - 1) * 100) + '% range');
      if (b.pierce) fx.push('+' + b.pierce + ' pierce');
      if (b.dmg) fx.push('+' + b.dmg + ' damage');
      if (b.energize) fx.push('abilities recharge ' + Math.round(b.energize * 100) + '% faster');
      return { title:'House blend', buttons: BLEND_ORDER.map(id => ({ key:'blend', value:id, label: BLEND_NAME[id], on: S.blend === id })),
        lines: [BLEND_NAME[S.blend] + ': every appliance on the map ' + fx.join(', ') + '.', t.boost && t.boost.refill ? 'Bottomless Refill: every blend is being served.' : 'All blends: ghost sight, no immunities and 20% off.'] };
    }
    case 'bread': {
      const v = vaultValue(t, 1);
      return { title:'Bread Exchange', chart: S.hist.slice(), price: S.price,
        lines: ['Vault: ' + S.vault + ' loaves, worth ' + money0(v) + ' at ×' + S.price.toFixed(2) + '. The price moves every ' + ((s.market && s.market.every) || 4) + 's; a full vault (' + ((s.market && s.market.cap) || 240) + ') sells itself.'],
        sell: { value: v, can: S.vault > 0 } };
    }
  }
  return moreParaUI(t);
}
