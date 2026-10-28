'use strict';
/* =====================================================================
   Kitchen Siege — pests with tricks
   Five pests that join the rounds from round 14 on (the round book stays as it is; they come in on top of it, or
   take a share of a group's place):
     Silverfish     darts aside: dodges a third of thrown projectiles (beams, blasts, sprays and the like still hit)
     Cricket        leaps forward along the trail every few seconds, over whatever is in its way
     Honeypot Ant   heals the pests around it every two seconds
     Centipede      sheds a segment (a silverfish) every time a quarter of its health is knocked off
     Shield Beetle  covers the pests near it in its shell: they take half damage while it is close
   The engine calls in through pestTrick (each pest, each frame), pestDodge (a projectile reaching a pest),
   pestGuard (in damage) and shedSegs (after damage); rounds through newPestGroups.
   ===================================================================== */
const QPT = [];
Object.assign(ENEMIES, {
  silverfish:{ name:'Silverfish', hp:6, speed:98, r:8, bounty:5, leak:4, tier:4, dodge:0.33, trick:true, desc:'Quick and slippery: dodges a third of thrown projectiles. Beams, blasts and sprays still catch it.' },
  cricket:   { name:'Cricket', hp:9, speed:64, r:9, bounty:6, leak:4, tier:4, hop:{ every:3, dist:85 }, trick:true, desc:'Leaps forward along the trail every few seconds, clearing traps and whatever stands in its way.' },
  honeypot:  { name:'Honeypot Ant', hp:20, speed:54, r:11, bounty:16, leak:6, tier:6, heal:{ every:2, r:70, pct:0.08 }, trick:true, desc:'Feeds the pests around it honey every two seconds, healing them. Cook it first.' },
  centipede: { name:'Centipede', hp:52, speed:66, r:14, bounty:30, leak:12, tier:7, segs:{ type:'silverfish', n:3, each:2 }, trick:true, desc:'Sheds two silverfish every time a quarter of its health is knocked off.' },
  shieldbug: { name:'Shield Beetle', hp:64, speed:48, r:14, bounty:36, leak:12, tier:7, guard:{ r:58, cut:0.5 }, trick:true, desc:'Holds its shell over the pests near it: they take half damage while it is close.' },
});
for (const id of ['silverfish', 'cricket', 'honeypot', 'centipede', 'shieldbug']) ENEMIES[id]._leak = ENEMIES[id].leak;
ENEMY_ORDER.splice(ENEMY_ORDER.indexOf('roach') + 1, 0, 'silverfish', 'cricket');
ENEMY_ORDER.splice(ENEMY_ORDER.indexOf('rat') + 1, 0, 'honeypot', 'centipede', 'shieldbug');
/* Mastery Mode promotes them one rank too */
Object.assign(PROMOTE, { silverfish:'antball', cricket:'antball', honeypot:'rat', centipede:'cheese', shieldbug:'cheese' });

/* ---------------- each frame ---------------- */
function pestTrick(e, dt){
  const D = e.def;
  const held = e.freezeT > 0 || e.stunT > 0 || e.holdT > 0 || e.air || e.burrowT > 0;
  if (e.hopT > 0) e.hopT -= dt;
  if (D.hop && !held){
    e.hopCd = (e.hopCd == null ? D.hop.every * (0.4 + ((e.id * 37) % 10) / 10) : e.hopCd) - dt;
    if (e.hopCd <= 0){
      e.hopCd = D.hop.every;
      const P = G.paths[e.path];
      if (P){ e.d = Math.min(P.len - 1, e.d + D.hop.dist); const q = pathPos(P, e.d, e.seg); e.x = q.x; e.y = q.y; e.seg = q.seg; e.hopT = 0.35; }
    }
  }
  if (D.heal && !held){
    e.healCd = (e.healCd == null ? D.heal.every : e.healCd) - dt;
    if (e.healCd <= 0){
      e.healCd = D.heal.every;
      let n = 0;
      for (const o of query(e.x, e.y, D.heal.r, QPT)){
        if (o === e || o.dead || o.boss || o.hp >= o.maxHp) continue;
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * D.heal.pct); n++;
      }
      if (n && G.vis && !lowFx()) G.fx.push({ k:'ring', x: e.x, y: e.y, r0: e.r, r1: D.heal.r, t: 0, life: 0.45, c: '#f2c14e', w: 3 });
    }
  }
  if (D.guard && !(e.burrowT > 0)){
    e.guardCd = (e.guardCd || 0) - dt;
    if (e.guardCd <= 0){
      e.guardCd = 0.25;
      for (const o of query(e.x, e.y, D.guard.r, QPT)) if (o !== e && !o.dead && !o.boss){ o.guardUntil = G.time + 0.4; o.guardCut = D.guard.cut; }
    }
  }
}
/* a thrown projectile reaching a pest that dodges: true when it darts aside (the projectile then passes it) */
function pestDodge(e, p){
  const ch = e.def.dodge;
  if (!ch || e.freezeT > 0 || e.stunT > 0 || e.holdT > 0) return false;
  if (Math.random() >= ch) return false;
  p.hit.add(e.id);
  if (G.vis && !lowFx() && Math.random() < 0.5) fxText(e.x, e.y - e.r - 5, 'MISS', '#dfe8ee', 0.45, 10);
  return true;
}
/* in damage: a shield beetle's cover */
function pestGuard(e, d){ return e.guardUntil > G.time ? d * (e.guardCut || 0.5) : d; }
/* after damage: a centipede sheds segments as its health goes */
function shedSegs(e){
  const S = e.def.segs;
  if (e.segsLeft == null) e.segsLeft = S.n;
  /* how many should have come off by now: one for every quarter of its health lost (all of them when it dies) */
  const lost = e.hp <= 0 ? S.n : Math.min(S.n, Math.floor((1 - Math.max(0, e.hp) / e.maxHp) * (S.n + 1)));
  const shed = lost - (S.n - e.segsLeft);
  if (shed <= 0) return;
  e.segsLeft -= shed;
  for (let i = 0; i < shed * S.each; i++){
    const c = spawnEnemy(S.type, { path: e.path, d: Math.max(0, e.d - 10 - i * 8), child: true, lineage: [e.id] });
    if (c && e.camo) c.camo = true;
  }
  if (G.vis && !lowFx()) G.fx.push({ k:'pop', x: e.x, y: e.y, t: 0, life: 0.25 });
}

/* ---------------- the rounds ---------------- */
/* they come in on top of the round book from round 14, a little more often as the game goes on; the same every
   game, so a round always sends the same pests */
function newPestGroups(n, groups){
  if (n < 14) return groups;
  const out = groups.slice(), last = groups.reduce((m, g) => Math.max(m, g.start + g.spacing * Math.max(0, g.count - 1)), 0);
  const hm = Math.sqrt(groups.reduce((m, g) => Math.max(m, g.hpMul || 1), 1));
  const add = (type, count, start, spacing) => { if (count > 0) out.push({ type, count, spacing, start, mods:'', hpMul: hm }); };
  /* silverfish take a share of the roaches */
  if (n % 2 === 0) for (const g of groups) if ((g.type === 'roach' || g.type === 'housefly') && g.count >= 5){ const k = Math.round(g.count * 0.35); g.count -= k; add('silverfish', k, g.start + 0.6, g.spacing * 1.2); }
  if (n >= 18 && n % 3 === 0) add('cricket', Math.round(6 + n / 5), last * 0.3, 0.45);
  if (n >= 26 && n % 4 === 2) add('honeypot', Math.round(2 + n / 18), last * 0.5, 1.2);
  if (n >= 32 && n % 5 === 2) add('centipede', Math.round(3 + n / 12), last * 0.4, 0.9);
  /* shield beetles walk with the vehicles */
  if (n >= 38) for (const g of groups) if (ENEMIES[g.type] && ENEMIES[g.type].big && !ENEMIES[g.type].boss && n % 3 !== 1){ add('shieldbug', Math.min(12, Math.max(2, Math.round(g.count * 1.5))), g.start, Math.max(0.6, g.spacing)); break; }
  return out;
}
