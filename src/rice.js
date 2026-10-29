'use strict';
/* =====================================================================
   Kitchen Siege — the Rice Cooker
   A charge-up appliance. It cooks while nothing happens (its attack's
   rate is the cooking time), and once the rice is ready it waits, warm,
   until a pest comes into range; then the lid pops and a burst of steam
   hits every pest around it. You can open the lid early from its panel
   for a weaker burst.
     cook       the attack: a steam burst around the cooker, up to `pierce`
                pests, nearest first
     sticky     rice sticks to what the steam hits: it slows, glues small
                pests in place and makes them take a little more
     store      Keep Warm: with nobody in range, a finished pot is kept warm
                (up to `store` of them) and they all come out, one after
                another, when pests arrive
     timer      a vehicle or boss in range lets every kept pot out at once,
                for `timer` times the damage
     after      an aftershock: a second, weaker burst a moment later
   Abilities: Blow the Valve (pressure), Mochi Pound (sticky), Serve! (warm).
   The engine calls in through riceFire (attacks), riceTick (each frame)
   and runRiceAbility; the panel through riceOpenLid and riceCharge.
   ===================================================================== */
const QRC = [];
Object.assign(ABILITIES, {
  valve: { name:'Blow the Valve', desc:'The pressure valve blows: a run of huge steam bursts, one after another.' },
  mochi: { name:'Mochi Pound',    desc:'A mallet pounds the whole kitchen: every pest on screen is glued in place by rice and takes damage.' },
  serve: { name:'Serve!',         desc:'Every pot it can keep warm is cooked at once and served straight out.' },
});

/* how far the rice is cooked: 0 just served, 1 ready */
function riceCharge(t){
  const a = t && t.s && t.s.atk && t.s.atk.main;
  if (!a || a.kind !== 'cook') return 0;
  return clamp(1 - (t.cd.main || 0) / a.rate, 0, 1);
}
function ricePests(t, a){
  const range = attackRange(t, a), out = [];
  for (const e of query(t.x, t.y, range, QRC)) if (canTarget(t, e, a) && Math.hypot(e.x - t.x, e.y - t.y) <= range + e.r) out.push(e);
  return out;
}
/* one burst of steam: `mul` scales its damage (an early lid, a kept pot let out by the timer) */
function riceBurst(t, a, mul, list){
  list = list || ricePests(t, a);
  if (!list.length) return false;
  list.sort((p, q) => Math.hypot(p.x - t.x, p.y - t.y) - Math.hypot(q.x - t.x, q.y - t.y));
  const spec = mul === 1 ? a : Object.assign({}, a, { dmg: a.dmg * mul, bonusBig: (a.bonusBig || 0) * mul, bonusBoss: (a.bonusBoss || 0) * mul });
  const S = a.sticky;
  let n = 0;
  for (const e of list){
    if (n >= a.pierce) break;
    applyHit(e, spec, t);
    n++;
    if (e.dead || !S) continue;
    if (e.boss){ if (S.boss) slowE(e, S.boss, S.dur); }
    else if (e.big){ if (S.bigSlow < 1) slowE(e, S.bigSlow, S.dur); if (S.bigGlue) stunE(e, S.bigGlue); }
    else { slowE(e, S.slow, S.dur); if (S.glue) stunE(e, S.glue); }
    if (S.vuln) setVuln(e, { amt: S.vuln, dur: Math.max(S.dur, S.glue || 0) });
    e.riceT = Math.max(e.riceT || 0, S.dur);
  }
  t.fireAnim = 0.4;
  t.riceServed = (t.riceServed || 0) + 1;
  if (t.sys && t.sys.bowls != null) t.sys.bowls++;
  if (a.after && mul > 0.2) t.riceAfter = { t: a.after.delay, mul: mul * a.after.mul };
  if (G.vis){
    const R = attackRange(t, a);
    G.fx.push({ k:'ring', x: t.x, y: t.y, r0: t.size, r1: R, t: 0, life: 0.45, c: S ? '#f6f1df' : '#ffffff', w: 3 + Math.min(5, mul * 2) });
    if (!lowFx()) for (let i = 0; i < 14; i++){ const an = rand(0, TAU), v = rand(60, R * 1.8); part(t.x, t.y, Math.cos(an) * v, Math.sin(an) * v, 0.6, i % 4 ? '#f4f7f8' : '#ffffff', 7, 'smoke'); }
    if (S && !lowFx()) for (let i = 0; i < 8; i++){ const an = rand(0, TAU), v = rand(40, R * 1.2); part(t.x, t.y, Math.cos(an) * v, Math.sin(an) * v, 0.5, '#fffdf2', 2.2, 'dot'); }
  }
  Hooks.sfx('steam');
  return true;
}
/* the attack: when the rice is ready, serve it (and everything kept warm); with nobody near, keep a pot warm */
function riceFire(t, a, id){
  if (a.kind !== 'cook') return false;
  const list = ricePests(t, a);
  if (!list.length){
    if (a.store && (t.riceStore || 0) < a.store){ t.riceStore = (t.riceStore || 0) + 1; return true; }
    return false;
  }
  const kept = t.riceStore || 0;
  if (kept && a.timer && list.some(e => e.big || e.boss)){
    t.riceStore = 0;
    riceBurst(t, a, a.timer * (1 + kept), list);
    if (G.vis) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 6, r1: attackRange(t, a) * 1.15, t: 0, life: 0.6, c: '#f2c14e', w: 6 });
    return true;
  }
  riceBurst(t, a, 1, list);
  if (kept){ t.riceQ = (t.riceQ || 0) + kept; t.riceStore = 0; t.riceQT = 0.22; }
  return true;
}
/* open the lid early: a weaker burst, scaled by how far the rice had cooked */
function riceOpenLid(t){
  const a = t && t.s && t.s.atk && t.s.atk.main;
  if (!a || a.kind !== 'cook' || !G.active || G.over) return false;
  const c = riceCharge(t);
  if (c < 0.25) return false;
  if (!ricePests(t, a).length) return false;
  riceBurst(t, a, c >= 1 ? 1 : c * 0.8);
  t.cd.main = a.rate;
  return true;
}
function riceTick(dt){
  for (const e of G.enemies) if (e.riceT > 0) e.riceT -= dt;
  for (const t of G.towers){
    const a = t.s && t.s.atk && t.s.atk.main;
    if (!a || a.kind !== 'cook' || t.stunT > 0) continue;
    /* kept pots, let out one after another */
    if (t.riceQ > 0){
      t.riceQT -= dt;
      if (t.riceQT <= 0){
        t.riceQT = 0.22;
        if (riceBurst(t, a, 1)) t.riceQ--;
        else { t.riceStore = Math.min(a.store || 0, (t.riceStore || 0) + t.riceQ); t.riceQ = 0; }
      }
    }
    /* the aftershock */
    if (t.riceAfter){ t.riceAfter.t -= dt; if (t.riceAfter.t <= 0){ const m = t.riceAfter.mul; t.riceAfter = null; const keep = a.after; a.after = null; riceBurst(t, a, m); a.after = keep; } }
    /* Blow the Valve */
    if (t.riceValve){
      const V = t.riceValve;
      V.acc -= dt;
      if (V.acc <= 0){ V.acc = V.every; riceBurst(t, a, V.mul); V.n--; if (V.n <= 0) t.riceValve = null; }
    }
  }
}
function runRiceAbility(t, ab){
  const a = t.s.atk.main;
  switch (ab.id){
    case 'valve': {
      if (!a || !ricePests(t, a).length) return false;
      t.riceValve = { n: ab.n, every: ab.every, mul: ab.mul, acc: 0 };
      return true;
    }
    case 'mochi': {
      const list = pestsOnScreen().filter(e => !(e.burrowT > 0) && !e.air);
      if (!list.length) return false;
      for (const e of list){
        if (e.boss){ slowE(e, ab.bossSlow || 0.7, ab.dur); }
        else if (e.big){ if (ab.big) stunE(e, ab.dur * 0.5); else slowE(e, 0.5, ab.dur); }
        else stunE(e, ab.dur);
        e.riceT = Math.max(e.riceT || 0, ab.dur);
        damage(e, ab.dmg + (e.big ? ab.bonusBig || 0 : 0), 'normal', t, { ignoreImmune: true });
      }
      if (G.vis){ G.shake = Math.max(G.shake, 0.6); for (const e of list.slice(0, 40)) G.fx.push({ k:'ring', x: e.x, y: e.y, r0: 2, r1: e.r * 2.4, t: 0, life: 0.35, c: '#fffdf2', w: 3 }); }
      Hooks.sfx('steam');
      return true;
    }
    case 'serve': {
      if (!a) return false;
      t.cd.main = 0;
      t.riceStore = a.store || 0;
      if (!ricePests(t, a).length){ if (G.vis) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 4, r1: t.size * 2.2, t: 0, life: 0.5, c: '#f2c14e', w: 4 }); return true; }
      riceFire(t, a, 'main');
      return true;
    }
  }
  return false;
}

/* ---------------- the paragon: a banquet, course by course ---------------- */
const FEAST_BOWLS = 12;
PARA.rice = {
  init: () => ({ bowls: 0, feasts: 0, glow: 0 }),
  tick(t, dt){
    const S = t.sys;
    if (S.glow > 0) S.glow -= dt;
    if (S.bowls < FEAST_BOWLS || !G.roundActive) return;
    S.bowls = 0; S.feasts++; S.glow = 1;
    const a = t.s.atk.main, list = pestsOnScreen().filter(e => !(e.burrowT > 0));
    for (const e of list){
      damage(e, a.dmg * 4, 'heat', t, { ignoreImmune: true, bonusBig: (a.bonusBig || 0) * 4, bonusBoss: (a.bonusBoss || 0) * 2 });
      if (!e.dead){ if (e.boss) slowE(e, 0.6, 1.5); else stunE(e, e.big ? 0.6 : 1.2); e.riceT = Math.max(e.riceT || 0, 1.2); }
    }
    if (G.vis){ G.shake = Math.max(G.shake, 0.8); G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 900, t: 0, life: 0.9, c: '#f2c14e', w: 8 }); }
    Hooks.sfx('steam');
  },
  round(t, when){ if (when === 'start') t.sys.glow = 0; },
  save: S => ({ b: S.bowls || 0, f: S.feasts || 0 }),
  load(S, d){ S.bowls = clamp(Math.floor(+d.b || 0), 0, FEAST_BOWLS); S.feasts = clamp(Math.floor(+d.f || 0), 0, 1e7); },
};
function riceParaBar(t){ const S = t.sys; return { v: S.bowls / FEAST_BOWLS, c: '#f2c14e', txt: S.bowls + '/' + FEAST_BOWLS + ' BOWLS' }; }
function riceParaUI(t){
  const S = t.sys;
  return { title:'The banquet', meter: { v: S.bowls / FEAST_BOWLS, c: '#f2c14e', text: S.bowls + ' of ' + FEAST_BOWLS + ' bowls served' },
    lines: ['Every steam burst serves a bowl. Each ' + FEAST_BOWLS + ' bowls served bring out the Feast: every pest on screen takes four times a burst’s damage through any shell and is glued in place (bosses are slowed).', 'Feasts so far: ' + fmt(S.feasts || 0) + '.'] };
}
