'use strict';
/* =====================================================================
   Kitchen Siege — the second brood of bosses
   Six bosses with skulls: marks on the health bar (two, three or four
   of them as the boss levels up) where it does its big move.
     The Compost Heap   flings pests far up the trail ahead of itself,
                        and dumps a heap of them at every skull
     The Grave Moth     drains timed boosts off nearby appliances to heal;
                        at every skull it splits off wisps and cannot be
                        hurt (and slowly heals) until they are all gone
     The Dust Devil     fast and hard to slow; at every skull it knocks
                        out the appliances around it and speeds up
     The Iron Beetle    cast-iron plates soak up hits until they break;
                        shrugs off a different kind of attack in turn;
                        regrows its plates at every skull
     The Ghost Pepper   appliances near it heat up and shut down when they
                        overheat; heat cannot hurt it; flares at every skull
     The Phantom        a ghost; fades out of reach every few seconds; at
                        every skull a wave of dread freezes appliances
   ===================================================================== */
const SKULLS = { 1: [0.66, 0.33], 3: [0.75, 0.5, 0.25], 6: [0.8, 0.6, 0.4, 0.2] };
function bossSkulls(e){
  if (!e.def.skulls) return [];
  const L = e.lvl || 1;
  return L >= 6 ? SKULLS[6] : L >= 3 ? SKULLS[3] : SKULLS[1];
}
/* true once for each skull the boss's health has just dropped past */
function skullHit(e){
  const th = bossSkulls(e), k = e.skull || 0;
  if (k < th.length && e.hp < e.maxHp * th[k]){ e.skull = k + 1; return true; }
  return false;
}
/* knock out the appliances near (x, y); kind picks the look: stink, gust, heat, dread */
function knockTowers(x, y, R, dur, kind){
  let n = 0;
  for (const t of G.towers){
    if (t.hero && kind === 'dread') continue;
    if (Math.hypot(t.x - x, t.y - y) > R + t.size) continue;
    const d = t.paragon ? dur * 0.5 : dur;
    if (d > (t.stunT || 0)){ t.stunT = d; t.stunBy = kind; }
    n++;
  }
  return n;
}
/* pests spawned somewhere along the boss's trail: ahead (dd > 0) or behind */
function bossDrop(e, type, n, dd, spread, o){
  const P = G.paths[e.path];
  for (let i = 0; i < n; i++){
    const d = clamp(e.d + dd + (Math.random() - 0.5) * spread, 0, P.len - 60);
    spawnEnemy(type, Object.assign({ path: e.path, d, lineage: [e.id], child: true }, o || {}));
  }
}
function bossRing(e, c, r1, w){ if (G.vis) G.fx.push({ k:'ring', x:e.x, y:e.y, r0:e.r * 0.6, r1, t:0, life:0.6, c, w: w || 5 }); }
function bossBits(e, cols, n, v){
  if (!G.vis) return;
  for (let i = 0; i < n; i++){ const a = rand(0, TAU), s = rand(v * 0.3, v); part(e.x, e.y, Math.cos(a) * s, Math.sin(a) * s, 0.7, cols[i % cols.length], 4, 'dot'); }
}
const BEETLE_TYPES = ['sharp', 'blast', 'heat', 'cold', 'energy'];
const BEETLE_NAMES = { sharp:'sharp', blast:'blast', heat:'heat', cold:'cold', energy:'energy' };
function beetlePlate(e){ return e.maxHp * Math.min(0.5, 0.3 + 0.02 * ((e.lvl || 1) - 1)); }

/* the moves; called from bossTick for these bosses */
function bossTick2(e, dt, L){
  if (e.type === 'compost'){
    e.flingCd = (e.flingCd == null ? 2 : e.flingCd) - dt;
    if (e.flingCd <= 0){
      e.flingCd = Math.max(2, 4.5 - 0.2 * (L - 1));
      const pool = L >= 7 ? ['rat', 'rat', 'mouse', 'cheese'] : L >= 4 ? ['mouse', 'rat', 'antball'] : ['roach', 'antball', 'mouse'];
      const n = Math.min(10, 2 + Math.floor(L / 2));
      for (let i = 0; i < n; i++) bossDrop(e, pool[i % pool.length], 1, rand(90, 240), 40);
      if (G.vis) G.fx.push({ k:'fling', x:e.x, y:e.y, t:0, life:0.5 });
      Hooks.sfx('squeak');
    }
    if (skullHit(e)){
      const n = Math.min(40, 12 + 3 * L);
      bossDrop(e, 'antball', Math.ceil(n * 0.4), 140, 220);
      bossDrop(e, L >= 4 ? 'rat' : 'mouse', Math.ceil(n * 0.4), 60, 260);
      bossDrop(e, L >= 5 ? 'cheese' : 'rat', Math.max(1, Math.floor(L / 2)), 200, 120);
      e.shieldT = 1.5;
      bossRing(e, '#7a5a2b', e.r * 3, 7); bossBits(e, ['#7a5a2b', '#6f9e4f', '#c9a36b'], 22, 220);
      Hooks.sfx('crack');
      Hooks.toast('The Compost Heap dumps its load!', 'warn');
    }
    if (e.shieldT > 0) e.shieldT -= dt;
  } else if (e.type === 'moth'){
    /* drain: timed boosts on appliances near it go out, and it heals for each */
    e.drainCd = (e.drainCd == null ? 3 : e.drainCd) - dt;
    if (e.drainCd <= 0){
      e.drainCd = Math.max(2.5, 5 - 0.2 * (L - 1));
      const R = Math.min(300, 190 + 8 * (L - 1));
      let n = 0;
      for (const t of G.towers){
        if (!t.tb || Math.hypot(t.x - e.x, t.y - e.y) > R + t.size) continue;
        for (const k in t.tb) if (t.tb[k].until > G.time){ t.tb[k].until = G.time; n++; }
      }
      if (n){
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.015 * n);
        if (typeof refreshTowers === 'function') refreshTowers();
        if (G.vis) fxText(e.x, e.y - e.r - 10, 'DRAINED ×' + n, '#d7c6ff', 1, 13);
      }
      if (G.vis) G.fx.push({ k:'drain', x:e.x, y:e.y, r:R, t:0, life:0.9 });
    }
    /* soulbound: no harm while its wisps are about, and it heals slowly */
    if (e.soul){
      const alive = G.enemies.some(o => !o.dead && o.type === 'wisp' && o.soulOf === e.id);
      if (alive){ e.shieldT = 0.2; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.003 * dt); }
      else { e.soul = false; e.shieldT = 0; Hooks.toast('The Grave Moth is exposed!', 'info'); }
    } else if (skullHit(e)){
      e.soul = true; e.shieldT = 0.2;
      const n = Math.min(14, 4 + L);
      const P = G.paths[e.path];
      for (let i = 0; i < n; i++){
        const w = spawnEnemy('wisp', { path: e.path, d: clamp(e.d - 40 - i * 26, 0, P.len - 60), lineage: [e.id], child: true, camo: L >= 4 && i % 2 === 1, hpMul: 1 + 0.25 * (L - 1) });
        w.soulOf = e.id;
      }
      bossRing(e, '#d7c6ff', e.r * 3.2, 6);
      Hooks.sfx('buzz');
      Hooks.toast('The Grave Moth splits off ' + n + ' wisps. Cook them to expose it!', 'warn');
    }
  } else if (e.type === 'dustdevil'){
    if (skullHit(e)){
      const R = Math.min(320, 220 + 10 * (L - 1)), dur = Math.min(6, 3 + 0.25 * (L - 1));
      const n = knockTowers(e.x, e.y, R, dur, 'gust');
      e.speed *= 1.1; e.dashT = 1;
      if (G.vis){ G.fx.push({ k:'gust', x:e.x, y:e.y, r:R, t:0, life:1.1 }); G.shake = Math.max(G.shake || 0, 0.4); }
      Hooks.sfx('spray');
      if (n) Hooks.toast('The Dust Devil knocks out ' + n + ' appliance' + (n === 1 ? '' : 's') + '!', 'warn');
    }
    if (e.dashT > 0) e.dashT -= dt;
  } else if (e.type === 'beetle'){
    if (e.plate == null){ e.plate = e.plateMax = beetlePlate(e); e.immune = [BEETLE_TYPES[0]]; e.shellK = 0; e.shellT = 0; }
    e.shellT += dt;
    if (e.shellT >= Math.max(3.5, 6 - 0.2 * (L - 1))){
      e.shellT = 0; e.shellK = (e.shellK + 1) % BEETLE_TYPES.length;
      e.immune = L >= 6 ? [BEETLE_TYPES[e.shellK], BEETLE_TYPES[(e.shellK + 2) % BEETLE_TYPES.length]] : [BEETLE_TYPES[e.shellK]];
    }
    if (skullHit(e)){
      e.plate = e.plateMax = beetlePlate(e);
      bossMinions(e, 'weevil', Math.min(12, 3 + L), 14, { armored: L >= 3 });
      bossMinions(e, 'pillbug', Math.min(12, 3 + L), 14, { armored: L >= 3 });
      bossRing(e, '#9aa5ab', e.r * 2.4, 6); bossBits(e, ['#5d666b', '#9aa5ab'], 16, 160);
      Hooks.sfx('crack');
      Hooks.toast('The Iron Beetle grows new plates!', 'warn');
    }
  } else if (e.type === 'pepper'){
    /* its heat builds up on appliances near it; full up, they shut down */
    const R = Math.min(240, 150 + 6 * (L - 1)), rate = 1 / Math.max(3, 6 - 0.2 * (L - 1));
    for (const t of G.towers){
      if (t.hero) continue;
      const near = Math.hypot(t.x - e.x, t.y - e.y) <= R + t.size;
      if (near && !(t.stunT > 0)){
        t.heat = (t.heat || 0) + rate * dt * (t.paragon ? 0.5 : 1);
        if (t.heat >= 1){ t.heat = 0; t.stunT = Math.min(5, 3 + 0.2 * (L - 1)); t.stunBy = 'heat'; if (G.vis) fxText(t.x, t.y - t.size - 8, 'OVERHEATED', '#ff8a3d', 1, 12); }
      }
    }
    if (skullHit(e)){
      const n = knockTowers(e.x, e.y, R + 90, Math.min(4, 2.5 + 0.15 * (L - 1)), 'heat');
      e.shieldT = 2;
      bossMinions(e, 'fireant', Math.min(30, 8 + 2 * L), 6);
      if (G.vis){ G.fx.push({ k:'flare', x:e.x, y:e.y, r:R + 90, t:0, life:0.9 }); G.shake = Math.max(G.shake || 0, 0.5); }
      Hooks.sfx('boom');
      Hooks.toast('The Ghost Pepper flares' + (n ? ' and scorches ' + n + ' appliance' + (n === 1 ? '' : 's') : '') + '!', 'warn');
    }
    if (e.shieldT > 0) e.shieldT -= dt;
  } else if (e.type === 'phantom'){
    e.fadeCd = (e.fadeCd == null ? 8 : e.fadeCd) - dt;
    if (e.fadeT > 0){ e.fadeT -= dt; e.shieldT = Math.max(e.shieldT, 0.05); if (e.fadeT <= 0){ e.shieldT = 0; } }
    else if (e.fadeCd <= 0){ e.fadeCd = Math.max(6, 10 - 0.3 * (L - 1)); e.fadeT = Math.min(2.6, 1.5 + 0.1 * (L - 1)); e.shieldT = e.fadeT; }
    if (skullHit(e)){
      const R = Math.min(320, 230 + 8 * (L - 1));
      const n = knockTowers(e.x, e.y, R, Math.min(4, 2.2 + 0.15 * (L - 1)), 'dread');
      bossMinions(e, 'roach', Math.min(18, 6 + L), 10, { camo: true });
      if (L >= 4) bossMinions(e, 'midnight', Math.min(4, Math.floor(L / 3)), 30);
      if (G.vis) G.fx.push({ k:'dread', x:e.x, y:e.y, r:R, t:0, life:1.2 });
      Hooks.sfx('freeze');
      Hooks.toast('A wave of dread' + (n ? ' freezes ' + n + ' appliance' + (n === 1 ? '' : 's') : ' rolls out') + '!', 'warn');
    }
  }
}
/* the Iron Beetle's plates take the hit first: returns what they soaked, or -1 if none */
function plateSoak(e, d, tw){
  if (!(e.plate > 0)) return -1;
  const used = Math.min(e.plate, d);
  e.plate -= used; e.hitT = G.time; e.flashT = 0.06;
  G.stats.damage += used;
  if (tw){ tw.dmg += used; G.xp[tw.type] = (G.xp[tw.type] || 0) + used * G.xpMult; }
  if (e.plate <= 0){
    e.plate = 0;
    if (G.vis){ bossBits(e, ['#5d666b', '#9aa5ab', '#c9d2d6'], 20, 200); bossRing(e, '#c9d2d6', e.r * 2, 4); }
    Hooks.sfx('crack');
    Hooks.toast('The Iron Beetle’s plates crack!', 'info');
  }
  return used;
}
/* a gusty boss is hard to slow, stun or freeze */
function windResist(e){ return e.def.windy ? 0.25 : 1; }
/* what the boss bar says it is doing */
function bossStatus(e){
  if (e.type === 'moth' && e.soul) return 'Soulbound';
  if (e.type === 'phantom' && e.fadeT > 0) return 'Faded';
  if (e.type === 'beetle' && e.immune) return (e.plate > 0 ? 'Plated · ' : '') + 'shrugs off ' + e.immune.map(k => BEETLE_NAMES[k]).join(' + ');
  if (e.type === 'pepper' && e.shieldT > 0) return 'Flaring';
  if (e.type === 'compost' && e.shieldT > 0) return 'Dumping';
  return '';
}
/* what a knocked-out appliance's panel says */
function stunReason(t){
  return ({ gust:'Knocked out by the Dust Devil', heat:'Overheated', dread:'Frozen in dread' })[t.stunBy] || 'Knocked out by stink';
}
const BOSS_HINT2 = {
  compost:'Flings pests up the trail ahead and dumps a heap at each skull.',
  moth:'Drains boosts to heal. Cook its wisps to expose it.',
  dustdevil:'Fast and hard to slow. Knocks out appliances at each skull.',
  beetle:'Break its plates; it shrugs off a different attack in turn.',
  pepper:'Overheats appliances near it. Heat cannot hurt it.',
  phantom:'A ghost that fades out of reach. Needs ghost spotting.',
};
