'use strict';
/* =====================================================================
   Kitchen Siege — Chef Infinity, the admin unit
   A head chef that only exists behind the admin panel (code 4334 → Admin
   unit). Nothing reaches the counter around him; his lash hits a dozen
   pests anywhere on the map at once; and he has four moves:
     Vacuum Pull       every pest on the map is dragged along the trail
                       to the stretch nearest him and held there
     Pressure Burst    every pest on the map is blown back and battered
     Void Course       a beam from him through the toughest pest to the
                       far wall; everything in it is erased, bosses lose
                       a third of their health
     Unlimited Kitchen for eight seconds the whole kitchen is his: every
                       pest stands frozen and burns away, and every other
                       appliance attacks three times as fast
   A game he is placed in earns no medals, records or Dough.
   ===================================================================== */
const ADMIN_UNIT = 'chef_infinity';
const ADMIN_ORB = { id:'_void', name:'Void Orb', size:7, face:'still', spin:0, pulse:0.4, wobble:0, flicker:0.2, glow:2, glowC:'#8b5cf6', trail:'stars', trailC:'#d7c6ff', trailLen:1,
  layers:[{ k:'ring', c:'#8b5cf6', o:'#2b1a5e', w:1, s:1.2, x:0, y:0, r:0, n:5, a:0.8, spin:1, pulse:0 }, { k:'disc', c:'#1a0b3a', o:'#8b5cf6', w:1, s:0.75, x:0, y:0, r:0, n:5, a:1, spin:0, pulse:0 }, { k:'cross', c:'#ffffff', o:'#8b5cf6', w:0, s:0.5, x:0, y:0, r:0, n:5, a:0.9, spin:3, pulse:0 }] };
Object.assign(ABILITIES, {
  void_pull:   { name:'Vacuum Pull',        desc:'Every pest on the map is dragged along the trail to the stretch nearest Chef Infinity and held there.' },
  void_burst:  { name:'Pressure Burst',     desc:'Every pest on the map is blown back down the trail and battered.' },
  void_course: { name:'Void Course',        desc:'A beam from Chef Infinity through the toughest pest to the far wall erases everything in it.' },
  void_domain: { name:'Unlimited Kitchen',  desc:'For eight seconds every pest stands frozen and burns away, and every other appliance attacks three times as fast.' },
});
HEROES[ADMIN_UNIT] = {
  name:'Chef Infinity', title:'Admin unit', role:'Everything, everywhere', color:'#8b5cf6', cost:0, size:17, admin:true,
  unlock:null,
  blurb:'The admin chef. Nothing reaches the counter around him, his lash strikes a dozen pests anywhere on the map, and his four moves bend the whole kitchen. Games he joins earn no medals, records or Dough.',
  base:{ range:9999, global:true, camo:true, barrier:{ r:170, min:0.04 },
    atk:{
      main:{ kind:'hitscan', rate:0.45, dmg:1200, pierce:1, shots:12, multi:true, type:'normal', bonusBig:6000, bonusBoss:9000, ignoreImmune:true, decamo:true, color:'#c9b3ff' },
      orbs:{ kind:'proj', rate:1.6, dmg:400, pierce:30, speed:420, size:7, type:'normal', sprite:'obj', obj: ADMIN_ORB, count:3, spread:0.5, homing:true, motion:'wave', amp:30, bonusBig:2000, ignoreImmune:true, mode:'strong', color:'#8b5cf6' },
    },
    abilities:[
      { id:'void_pull', cd:25, pull:420, bigPull:200, dmg:1500, hold:1.5 },
      { id:'void_burst', cd:25, push:520, bigPush:260, dmg:5000, bigMul:3, bossPct:0.08, stun:2 },
      { id:'void_course', cd:60, dmg:150000, width:70, bossPct:0.34 },
      { id:'void_domain', cd:120, dur:8, pct:0.012, bossPct:0.004, boost:3 },
    ] },
  levels: Array.from({ length: HERO_MAX - 1 }, () => ({ desc:'Chef Infinity is already everything he will ever be.', apply: () => {} })),
};
TOWERS[ADMIN_UNIT] = { name:'Chef Infinity', cost:0, size:17, hot:'', faction:'chefs', blurb: HEROES[ADMIN_UNIT].blurb, hero:true, admin:true, base: HEROES[ADMIN_UNIT].base, paths:[] };
AdminFlags.unit = false;
function adminUnitOn(){ return !!AdminFlags.unit || sandboxOn(); }
function isAdminUnit(type){ return !!(TOWERS[type] && TOWERS[type].admin); }
/* a game he was ever placed in */
function adminUsed(){ return !!G.adminUsed; }

/* nothing reaches the counter: pests crawl slower the closer they get, to a near standstill at his feet */
function barrierTick(t, b, dt){
  t.barAcc = (t.barAcc || 0) + dt;
  if (t.barAcc < 0.1) return;
  t.barAcc = 0;
  const R = b.r;
  for (const e of query(t.x, t.y, R, Q4)){
    if (e.dead) continue;
    const d = Math.hypot(e.x - t.x, e.y - t.y) / R;
    const mult = Math.max(b.min, Math.pow(Math.min(1, d), 1.6));
    slowE(e, mult, 0.25);
  }
}
/* the point on each trail nearest the chef, as a trail distance */
function nearestTrailD(t){
  const out = [];
  G.paths.forEach((P, pi) => {
    let best = 0, bd = Infinity;
    for (let d = 0; d <= P.len; d += 12){ const q = pathPos(P, d, 0); const dd = (q.x - t.x) ** 2 + (q.y - t.y) ** 2; if (dd < bd){ bd = dd; best = d; } }
    out[pi] = best;
  });
  return out;
}
function adminAbility(t, ab){
  switch (ab.id){
    case 'void_pull': {
      const to = nearestTrailD(t);
      let n = 0;
      for (const e of G.enemies){
        if (e.dead || e.burrowT > 0) continue;
        const target = to[e.path] || 0, pull = e.boss ? ab.bigPull * 0.5 : e.big ? ab.bigPull : ab.pull;
        const delta = target - e.d;
        e.d += Math.sign(delta) * Math.min(Math.abs(delta), pull);
        e.d = Math.max(0, Math.min(G.paths[e.path].len - 1, e.d));
        const q = pathPos(G.paths[e.path], e.d, 0); e.x = q.x; e.y = q.y; e.seg = q.seg;
        e.holdT = Math.max(e.holdT || 0, e.boss ? ab.hold * 0.4 : ab.hold); e.hold = { k:'void' };
        damage(e, ab.dmg, 'normal', t, { ignoreImmune:true });
        n++;
      }
      if (G.vis){ G.fx.push({ k:'drain', x:t.x, y:t.y, r: 900, t:0, life:0.7 }); G.fx.push({ k:'flash', c:'rgba(90,120,255,0.35)', t:0, life:0.4 }); G.shake = Math.max(G.shake || 0, 0.4); }
      Hooks.sfx('freeze');
      Hooks.toast('Vacuum Pull: ' + n + ' pest' + (n === 1 ? '' : 's') + ' dragged in.', 'info');
      return true;
    }
    case 'void_burst': {
      let n = 0;
      for (const e of G.enemies){
        if (e.dead || e.burrowT > 0) continue;
        const push = e.boss ? ab.bigPush * 0.5 : e.big ? ab.bigPush : ab.push;
        e.d = Math.max(0, e.d - push);
        const q = pathPos(G.paths[e.path], e.d, 0); e.x = q.x; e.y = q.y; e.seg = q.seg;
        if (e.boss) damage(e, e.maxHp * ab.bossPct, 'normal', t, { ignoreImmune:true });
        else damage(e, ab.dmg * (e.big ? ab.bigMul : 1), 'normal', t, { ignoreImmune:true });
        if (!e.dead) stunE(e, ab.stun);
        n++;
      }
      if (G.vis){ G.fx.push({ k:'ring', x:t.x, y:t.y, r0:20, r1:1300, t:0, life:0.7, c:'#ff4a4a', w:14 }); G.fx.push({ k:'flash', c:'rgba(255,70,70,0.35)', t:0, life:0.4 }); G.shake = Math.max(G.shake || 0, 0.7); }
      Hooks.sfx('boom');
      Hooks.toast('Pressure Burst: ' + n + ' pest' + (n === 1 ? '' : 's') + ' blown back.', 'info');
      return true;
    }
    case 'void_course': {
      let tg = null, best = -1;
      for (const e of G.enemies){ if (e.dead || e.burrowT > 0 || !onScreen(e)) continue; const v = toughness(e); if (v > best){ best = v; tg = e; } }
      if (!tg) return false;
      const ang = Math.atan2(tg.y - t.y, tg.x - t.x), dx = Math.cos(ang), dy = Math.sin(ang);
      /* to the far wall */
      let far = 0; for (const k of [(dx > 0 ? W + 40 - t.x : -40 - t.x) / dx, (dy > 0 ? H + 40 - t.y : -40 - t.y) / dy]) if (isFinite(k) && k > 0) far = far ? Math.min(far, k) : k;
      far = far || 1400;
      let n = 0;
      for (const e of G.enemies){
        if (e.dead || e.burrowT > 0) continue;
        const px = e.x - t.x, py = e.y - t.y, along = px * dx + py * dy;
        if (along < -e.r || along > far) continue;
        if (Math.abs(px * dy - py * dx) > ab.width * 0.5 + e.r) continue;
        if (e.boss) damage(e, e.maxHp * ab.bossPct, 'normal', t, { ignoreImmune:true });
        else damage(e, ab.dmg, 'normal', t, { ignoreImmune:true });
        n++;
      }
      if (G.vis){
        G.fx.push({ k:'beam', x1:t.x, y1:t.y, x2:t.x + dx * far, y2:t.y + dy * far, t:0, life:0.6, w: ab.width, c:'#8b5cf6', laser:false });
        G.fx.push({ k:'beam', x1:t.x, y1:t.y, x2:t.x + dx * far, y2:t.y + dy * far, t:0, life:0.45, w: ab.width * 0.35, c:'#ffffff', laser:true });
        G.fx.push({ k:'flash', c:'rgba(139,92,246,0.4)', t:0, life:0.5 }); G.shake = Math.max(G.shake || 0, 0.8);
      }
      Hooks.sfx('boom');
      Hooks.toast('Void Course: ' + n + ' pest' + (n === 1 ? '' : 's') + ' erased.', 'warn');
      return true;
    }
    case 'void_domain': {
      G.glob.domain = { t: ab.dur, max: ab.dur, tw: t, pct: ab.pct, bossPct: ab.bossPct, boost: ab.boost, acc: 0 };
      if (G.vis){ G.fx.push({ k:'domain', x:t.x, y:t.y, t:0, life: ab.dur }); G.fx.push({ k:'flash', c:'rgba(30,10,60,0.6)', t:0, life:0.6 }); G.shake = Math.max(G.shake || 0, 0.6); }
      Hooks.sfx('ability');
      Hooks.toast('Unlimited Kitchen: the whole kitchen is his for ' + ab.dur + ' seconds.', 'warn');
      return true;
    }
  }
  return null;
}
/* the domain, every frame it is open */
function domainTick(dt){
  const D = G.glob.domain;
  if (!D) return;
  D.t -= dt; D.acc += dt;
  if (D.t <= 0){ G.glob.domain = null; for (const o of G.towers) delete o.boost.domain; return; }
  for (const o of G.towers) if (o !== D.tw) o.boost.domain = { mult: D.boost, t: 0.2 };
  for (const e of G.enemies){ if (e.dead) continue; e.freezeT = Math.max(e.freezeT, 0.2); e.stunT = Math.max(e.stunT, 0.2); }
  while (D.acc >= 0.1){
    D.acc -= 0.1;
    for (const e of G.enemies){ if (e.dead || e.burrowT > 0) continue; damage(e, Math.max(1, e.maxHp * (e.boss ? D.bossPct : D.pct)), 'normal', D.tw, { ignoreImmune:true }); }
  }
}
