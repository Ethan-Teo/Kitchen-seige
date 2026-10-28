'use strict';
/* =====================================================================
   Kitchen Siege — head chefs: one hero per game who levels up from 1 to
   20 as rounds are cleared (or for cash), picking up new tricks and two
   abilities on the way. Hired and picked in the Chefs menu.
   No DOM here, so it runs headless as well.
   ===================================================================== */
const HERO_MAX = 20;
/* XP to go from level L to L + 1 */
function heroNeed(L){ return Math.round(100 * Math.pow(1.25, L - 1)); }
/* XP the head chef on duty earns when a round is cleared */
function heroRoundXP(n){ return n <= 20 ? 20 + 6 * n : n <= 50 ? 20 + 10 * n : 20 + 14 * n; }
/* the XP from level 1 to level L */
function heroTotalXP(L){ let s = 0; for (let k = 1; k < L; k++) s += heroNeed(k); return s; }

const HEROES = {
  chef_blaze: {
    name:'Chef Blaze', title:'Sauté chef', role:'Fire and damage', color:'#e2383f', cost:600, size:17,
    unlock:null,
    blurb:'Flicks flaming chilies that set pests burning. Grows into a one-chef firestorm.',
    base:{ range:150, atk:{ main:{ kind:'proj', rate:0.75, dmg:2, pierce:2, speed:560, size:7, type:'heat', sprite:'chili', count:1, spread:0.18, burn:{ dmg:1, tick:0.5, dur:2 } } } },
    levels:[
      { desc:'Throws 15% faster.', apply:s=>{ s.atk.main.rate /= 1.15; } },
      { desc:'Ability: Flambé, a ring of flame that hits every pest around Blaze and sets them burning.', ab:'flambe', apply:s=>{ s.abilities.push({ id:'flambe', cd:40, dmg:30, burn:3, dur:4, reach:1.6 }); } },
      { desc:'+1 damage and +2 pierce.', apply:s=>{ s.atk.main.dmg += 1; s.atk.main.pierce += 2; } },
      { desc:'Throws two chilies at once.', apply:s=>{ s.atk.main.count = 2; } },
      { desc:'Spots ghost pests and reaches 10% further.', apply:s=>{ s.camo = true; s.range *= 1.1; } },
      { desc:'Burns deal 2 more and last 3s.', apply:s=>{ const b = s.atk.main.burn; b.dmg += 2; b.dur = 3; } },
      { desc:'+2 damage, and chilies scorch fire ants too.', apply:s=>{ s.atk.main.dmg += 2; s.atk.main.ignoreImmune = true; } },
      { desc:'Throws 20% faster.', apply:s=>{ s.atk.main.rate /= 1.2; } },
      { desc:'Ability: Wok Inferno, a giant flaming wok that slams the biggest crowd on the map.', ab:'wok', apply:s=>{ s.abilities.push({ id:'wok', cd:60, dmg:200, big:600, burn:10, dur:5, r:130 }); } },
      { desc:'Three chilies at once.', apply:s=>{ s.atk.main.count = 3; s.atk.main.spread = 0.2; } },
      { desc:'Flambé deals triple damage and burns twice as hot.', apply:s=>{ const ab = s.abilities.find(x=>x.id==='flambe'); ab.dmg *= 3; ab.burn *= 2; } },
      { desc:'+3 damage.', apply:s=>{ s.atk.main.dmg += 3; } },
      { desc:'Every chili hit bursts in a small fiery blast.', apply:s=>{ s.atk.main.burst = { r:26, dmg:3, pierce:3, type:'heat', ignoreImmune:true }; } },
      { desc:'Throws 25% faster, +2 pierce.', apply:s=>{ s.atk.main.rate /= 1.25; s.atk.main.pierce += 2; } },
      { desc:'Wok Inferno hits twice as hard and recharges in 45s.', apply:s=>{ const ab = s.abilities.find(x=>x.id==='wok'); ab.dmg *= 2; ab.big *= 2; ab.cd = 45; } },
      { desc:'+4 damage, and burns deal 4 more.', apply:s=>{ s.atk.main.dmg += 4; s.atk.main.burn.dmg += 4; } },
      { desc:'Four chilies at once, and +20 damage to vehicles.', apply:s=>{ s.atk.main.count = 4; s.atk.main.bonusBig = (s.atk.main.bonusBig || 0) + 20; } },
      { desc:'Throws 30% faster.', apply:s=>{ s.atk.main.rate /= 1.3; } },
      { desc:'Master Chef: +8 damage, +3 pierce, bigger and hotter blasts, and both abilities recharge 30% faster.', apply:s=>{ const a = s.atk.main; a.dmg += 8; a.pierce += 3; a.burst.r = 34; a.burst.dmg += 4; a.burst.pierce += 1; for (const ab of s.abilities) ab.cd *= 0.7; } },
    ],
  },
  chef_gelato: {
    name:'Chef Gelato', title:'Pastry chef', role:'Cold and control', color:'#3f8fc4', cost:650, size:17,
    unlock:{ level:10, dough:1000 },
    blurb:'Lobs scoops of gelato that chill, slow and freeze. Holds the line while the others cook.',
    base:{ range:135, atk:{ main:{ kind:'proj', rate:0.9, dmg:1, pierce:3, speed:500, size:8, type:'cold', sprite:'scoop', count:1, spread:0.2 } } },
    levels:[
      { desc:'Scoops chill pests: 30% slower for 2s.', apply:s=>{ s.atk.main.slow = { mult:0.7, dur:2, bigMult:0.85 }; } },
      { desc:'Ability: Brain Freeze, which freezes every pest in a wide circle around Gelato.', ab:'brainfreeze', apply:s=>{ s.abilities.push({ id:'brainfreeze', cd:35, dur:3, bigDur:1.5, reach:2.2 }); } },
      { desc:'+1 damage and +2 pierce.', apply:s=>{ s.atk.main.dmg += 1; s.atk.main.pierce += 2; } },
      { desc:'A chilly aura slows pests in range by 25%.', apply:s=>{ s.aura = { slow:0.75, bigSlow:1, type:'cold' }; } },
      { desc:'Spots ghost pests.', apply:s=>{ s.camo = true; } },
      { desc:'Scoops freeze small pests solid for 0.6s.', apply:s=>{ s.atk.main.freeze = { dur:0.6 }; } },
      { desc:'Two scoops at a time, 15% faster.', apply:s=>{ s.atk.main.count = 2; s.atk.main.rate /= 1.15; } },
      { desc:'Frozen pests take 1 more damage from every hit.', apply:s=>{ s.atk.main.freeze.brittle = 1; } },
      { desc:'Ability: Big Chill, which slows every pest on the map and makes them take more damage.', ab:'bigchill', apply:s=>{ s.abilities.push({ id:'bigchill', cd:60, dur:10, slow:0.5, bigSlow:0.25, vuln:2 }); } },
      { desc:'+2 damage, and every scoop hit splatters in a small cold blast.', apply:s=>{ s.atk.main.dmg += 2; s.atk.main.burst = { r:30, dmg:1, pierce:4, type:'cold', slow:{ mult:0.7, dur:1.5 } }; } },
      { desc:'Brain Freeze reaches the whole map.', apply:s=>{ s.abilities.find(x=>x.id==='brainfreeze').reach = 0; } },
      { desc:'The aura slows 40%, and vehicles 15%.', apply:s=>{ s.aura.slow = 0.6; s.aura.bigSlow = 0.85; } },
      { desc:'Three scoops at a time, +2 pierce.', apply:s=>{ s.atk.main.count = 3; s.atk.main.pierce += 2; } },
      { desc:'+3 damage, 20% faster.', apply:s=>{ s.atk.main.dmg += 3; s.atk.main.rate /= 1.2; } },
      { desc:'Big Chill lasts 15s, and pests take 4 more damage from every hit.', apply:s=>{ const ab = s.abilities.find(x=>x.id==='bigchill'); ab.dur = 15; ab.vuln = 4; } },
      { desc:'Freezes last 1s, and vehicles hit by a scoop slow 40%.', apply:s=>{ const a = s.atk.main; a.freeze.dur = 1; a.slow.bigMult = 0.6; } },
      { desc:'+12 damage to vehicles, and scoops hit snow fleas too.', apply:s=>{ s.atk.main.bonusBig = (s.atk.main.bonusBig || 0) + 12; s.atk.main.ignoreImmune = true; } },
      { desc:'Scoops 25% faster.', apply:s=>{ s.atk.main.rate /= 1.25; } },
      { desc:'Master Chef: +6 damage, freezes last 1.5s, frozen pests take 2 more damage, stronger splatters, and both abilities recharge 30% faster.', apply:s=>{ const a = s.atk.main; a.dmg += 6; a.freeze.dur = 1.5; a.freeze.brittle = 2; a.burst.dmg += 3; a.burst.r = 36; for (const ab of s.abilities) ab.cd *= 0.7; } },
    ],
  },
  chef_penny: {
    name:'Chef Penny', title:'Café owner', role:'Cash and support', color:'#2a9d8f', cost:500, size:17, xpCost:1.5,
    unlock:{ level:20, dough:2500 },
    blurb:'Runs the front of house: brings in cash every round, speeds up the appliances around her and flicks coins at pests.',
    base:{ range:160, income:40, buff:{ speed:1.05 }, atk:{ main:{ kind:'proj', rate:1.0, dmg:1, pierce:1, speed:620, size:6, type:'normal', sprite:'coin', spin:true, count:1, spread:0.2 } } },
    levels:[
      { desc:'Earns $60 a round.', apply:s=>{ s.income = 60; } },
      { desc:'Ability: Payday, instant cash that grows with every round.', ab:'payday', apply:s=>{ s.abilities.push({ id:'payday', cd:45, cash:100, per:8 }); } },
      { desc:'Appliances in her range cost 8% less to buy and upgrade.', apply:s=>{ s.buff.discount = 0.08; } },
      { desc:'Appliances in range attack 10% faster.', apply:s=>{ s.buff.speed = 1.1; } },
      { desc:'Spots ghost pests, and so do the appliances in range.', apply:s=>{ s.camo = true; s.buff.camo = true; } },
      { desc:'Earns $150 a round.', apply:s=>{ s.income = 150; } },
      { desc:'Appliances in range get +1 pierce.', apply:s=>{ s.buff.pierce = 1; } },
      { desc:'Coins hit 3 pests for 3 damage.', apply:s=>{ s.atk.main.dmg = 3; s.atk.main.pierce = 3; } },
      { desc:'Ability: Grand Opening, which makes every appliance on the map attack faster for a while.', ab:'opening', apply:s=>{ s.abilities.push({ id:'opening', cd:70, dur:15, mult:1.5 }); } },
      { desc:'Earns $300 a round.', apply:s=>{ s.income = 300; } },
      { desc:'Payday pays double.', apply:s=>{ const ab = s.abilities.find(x=>x.id==='payday'); ab.cash *= 2; ab.per *= 2; } },
      { desc:'Appliances in range attack 15% faster and cost 12% less.', apply:s=>{ s.buff.speed = 1.15; s.buff.discount = 0.12; } },
      { desc:'Appliances in range deal +1 damage.', apply:s=>{ s.buff.dmg = 1; } },
      { desc:'Earns $400 a round.', apply:s=>{ s.income = 400; } },
      { desc:'Grand Opening lasts 20s, and appliances attack 75% faster.', apply:s=>{ const ab = s.abilities.find(x=>x.id==='opening'); ab.dur = 20; ab.mult = 1.75; } },
      { desc:'Appliances in range reach 15% further.', apply:s=>{ s.buff.range = 1.15; } },
      { desc:'Earns $650 a round.', apply:s=>{ s.income = 650; } },
      { desc:'Appliances in range attack 20% faster.', apply:s=>{ s.buff.speed = 1.2; } },
      { desc:'Master Chef: earns $1,000 a round, Payday pays triple, and appliances in range deal +2 damage and attack 25% faster.', apply:s=>{ s.income = 1000; const ab = s.abilities.find(x=>x.id==='payday'); ab.cash = 300; ab.per = 24; s.buff.dmg = 2; s.buff.speed = 1.25; } },
    ],
  },
  chef_kenji: {
    name:'Chef Kenji', title:'Sushi master', role:'Speed and precision', color:'#6c5ce7', cost:650, size:17,
    unlock:{ level:15, dough:1800 },
    blurb:'Throws sharpened chopsticks faster than the eye can follow, and spots ghost pests from the start. His critical hits only get bigger.',
    base:{ range:170, camo:true, atk:{ main:{ kind:'proj', rate:0.5, dmg:1, pierce:1, speed:1000, size:6, type:'sharp', sprite:'chopstick', count:1, spread:0.06 } } },
    levels:[
      { desc:'Throws 15% faster.', apply:s=>{ s.atk.main.rate /= 1.15; } },
      { desc:'Ability: Omakase, a volley of golden chopsticks that seek out the toughest pests on the map.', ab:'omakase', apply:s=>{ s.abilities.push({ id:'omakase', cd:35, n:6, dmg:25, big:100 }); } },
      { desc:'Every 5th throw is a critical hit for triple damage.', apply:s=>{ s.atk.main.crit = { every:5, mul:3 }; } },
      { desc:'+1 damage and +1 pierce.', apply:s=>{ s.atk.main.dmg += 1; s.atk.main.pierce += 1; } },
      { desc:'Reaches 15% further, and chopsticks fly faster.', apply:s=>{ s.range *= 1.15; s.atk.main.speed *= 1.2; } },
      { desc:'Throws a pair of chopsticks at once.', apply:s=>{ s.atk.main.count = 2; } },
      { desc:'Critical hits land every 4th throw, for 4× damage.', apply:s=>{ s.atk.main.crit = { every:4, mul:4 }; } },
      { desc:'+2 damage, and chopsticks pin small pests in place for a moment.', apply:s=>{ s.atk.main.dmg += 2; s.atk.main.stun = 0.12; } },
      { desc:'Ability: Knife Dance, which makes Kenji throw twice as fast for a while.', ab:'knifedance', apply:s=>{ s.abilities.push({ id:'knifedance', cd:60, mult:2, dur:8 }); } },
      { desc:'Chopsticks pierce weevil shells, and +1 pierce.', apply:s=>{ s.atk.main.ignoreImmune = true; s.atk.main.pierce += 1; } },
      { desc:'Throws 20% faster.', apply:s=>{ s.atk.main.rate /= 1.2; } },
      { desc:'Omakase throws 10 chopsticks that hit twice as hard.', apply:s=>{ const ab = s.abilities.find(x=>x.id==='omakase'); ab.n = 10; ab.dmg *= 2; ab.big *= 2; } },
      { desc:'+3 damage.', apply:s=>{ s.atk.main.dmg += 3; } },
      { desc:'Critical hits land every 3rd throw.', apply:s=>{ s.atk.main.crit.every = 3; } },
      { desc:'Three chopsticks at once, and +10 damage to vehicles.', apply:s=>{ s.atk.main.count = 3; s.atk.main.bonusBig = (s.atk.main.bonusBig || 0) + 10; } },
      { desc:'Knife Dance lasts 10s, at 2.5× speed.', apply:s=>{ const ab = s.abilities.find(x=>x.id==='knifedance'); ab.dur = 10; ab.mult = 2.5; } },
      { desc:'+4 damage.', apply:s=>{ s.atk.main.dmg += 4; } },
      { desc:'Throws 25% faster.', apply:s=>{ s.atk.main.rate /= 1.25; } },
      { desc:'Master Chef: critical hits deal 6× damage, +8 damage, and both abilities recharge 30% faster.', apply:s=>{ const a = s.atk.main; a.crit.mul = 6; a.dmg += 8; for (const ab of s.abilities) ab.cd *= 0.7; } },
    ],
  },
  chef_nonna: {
    name:'Chef Nonna', title:'Grandmother', role:'Trail and lives', color:'#6a8d2f', cost:550, size:17,
    unlock:{ level:25, dough:3000 },
    blurb:'Rolls meatballs onto the trail for pests to trip over, and keeps the kitchen going with extra lives every round as she levels up.',
    base:{ range:125, atk:{ main:{ kind:'trap', rate:1.6, dmg:2, pierce:4, type:'normal', r:12, life:18, sprite:'meatball', count:1 } } },
    levels:[
      { desc:'Meatballs hit 2 more pests.', apply:s=>{ s.atk.main.pierce += 2; } },
      { desc:'Ability: Sauce!, tomato sauce ladled along the trail that slows pests and simmers them.', ab:'sauce', apply:s=>{ s.abilities.push({ id:'sauce', cd:40, n:6, r:32, dur:8, slow:0.5, bigSlow:0.8, dmg:2, tick:0.5 }); } },
      { desc:'+1 life every round you clear (not on Michelin).', apply:s=>{ s.lifeRound = 1; } },
      { desc:'Rolls meatballs 20% faster.', apply:s=>{ s.atk.main.rate /= 1.2; } },
      { desc:'Bigger meatballs: +1 damage and +2 pierce.', apply:s=>{ const a = s.atk.main; a.dmg += 1; a.pierce += 2; a.r = 13; } },
      { desc:'Two meatballs at a time.', apply:s=>{ s.atk.main.count = 2; } },
      { desc:'+2 lives every round.', apply:s=>{ s.lifeRound = 2; } },
      { desc:'Meatballs knock small pests off their feet for 0.3s.', apply:s=>{ s.atk.main.stun = 0.3; } },
      { desc:'Ability: Mangia!, which calls every pest around Nonna to dinner: small pests stop to eat and vehicles slow down.', ab:'mangia', apply:s=>{ s.abilities.push({ id:'mangia', cd:55, dur:3, bigSlow:0.5, reach:2.6 }); } },
      { desc:'+2 damage, and meatballs last longer on the trail.', apply:s=>{ s.atk.main.dmg += 2; s.atk.main.life = 26; } },
      { desc:'+3 lives every round.', apply:s=>{ s.lifeRound = 3; } },
      { desc:'Sauce! covers more of the trail and simmers three times as hot.', apply:s=>{ const ab = s.abilities.find(x=>x.id==='sauce'); ab.n = 9; ab.dmg = 6; } },
      { desc:'Three meatballs at a time, and +2 pierce.', apply:s=>{ s.atk.main.count = 3; s.atk.main.pierce += 2; } },
      { desc:'+5 lives every round.', apply:s=>{ s.lifeRound = 5; } },
      { desc:'Meatballs deal +20 damage to vehicles.', apply:s=>{ s.atk.main.bonusBig = (s.atk.main.bonusBig || 0) + 20; } },
      { desc:'Mangia! reaches the whole map, and lasts 4s.', apply:s=>{ const ab = s.abilities.find(x=>x.id==='mangia'); ab.reach = 0; ab.dur = 4; } },
      { desc:'+5 damage.', apply:s=>{ s.atk.main.dmg += 5; } },
      { desc:'Rolls meatballs 25% faster.', apply:s=>{ s.atk.main.rate /= 1.25; } },
      { desc:'Master Chef: +10 lives every round, giant meatballs (+10 damage, +6 pierce), and both abilities recharge 30% faster.', apply:s=>{ s.lifeRound = 10; const a = s.atk.main; a.dmg += 10; a.pierce += 6; a.r = 15; for (const ab of s.abilities) ab.cd *= 0.7; } },
    ],
  },
  chef_bruno: {
    name:'Chef Bruno', title:'Butcher', role:'Vehicles and bosses', color:'#9a5b3c', cost:750, size:18,
    unlock:{ level:30, dough:3500 },
    blurb:'Hurls heavy cleavers that bite deepest into vehicles and bosses. Slow, but every throw counts.',
    base:{ range:140, atk:{ main:{ kind:'proj', rate:1.3, dmg:4, pierce:2, speed:520, size:9, scale:1.35, type:'sharp', sprite:'cleaver', spin:true, count:1, spread:0.16, bonusBig:6 } } },
    levels:[
      { desc:'+6 damage to vehicles.', apply:s=>{ s.atk.main.bonusBig += 6; } },
      { desc:'Ability: Tenderize, a meat mallet that pounds the toughest vehicles on the map: they slow down and take more damage from every hit.', ab:'tenderize', apply:s=>{ s.abilities.push({ id:'tenderize', cd:40, n:3, vuln:5, slow:0.6, dur:8 }); } },
      { desc:'+2 damage.', apply:s=>{ s.atk.main.dmg += 2; } },
      { desc:'Throws 15% faster, and +1 pierce.', apply:s=>{ s.atk.main.rate /= 1.15; s.atk.main.pierce += 1; } },
      { desc:'Spots ghost pests.', apply:s=>{ s.camo = true; } },
      { desc:'Cleavers cut through weevil shells, and +6 damage to vehicles.', apply:s=>{ s.atk.main.ignoreImmune = true; s.atk.main.bonusBig += 6; } },
      { desc:'Cleavers wound vehicles: for 2s they take 15% more damage from everything.', apply:s=>{ s.atk.main.cripple = { mult:1.15, dur:2 }; } },
      { desc:'+3 damage, and cleavers stagger vehicles for a moment.', apply:s=>{ s.atk.main.dmg += 3; s.atk.main.bigStun = 0.15; } },
      { desc:'Ability: The Big Chop, a giant cleaver that falls on the toughest pest on the map.', ab:'chop', apply:s=>{ s.abilities.push({ id:'chop', cd:60, dmg:1500, boss:0.05 }); } },
      { desc:'Two cleavers at once.', apply:s=>{ s.atk.main.count = 2; } },
      { desc:'+15 damage to vehicles.', apply:s=>{ s.atk.main.bonusBig += 15; } },
      { desc:'Tenderize pounds 5 vehicles, and they take 10 more damage from every hit.', apply:s=>{ const ab = s.abilities.find(x=>x.id==='tenderize'); ab.n = 5; ab.vuln = 10; } },
      { desc:'Throws 20% faster.', apply:s=>{ s.atk.main.rate /= 1.2; } },
      { desc:'Wounded vehicles take 30% more damage.', apply:s=>{ s.atk.main.cripple.mult = 1.3; } },
      { desc:'The Big Chop deals 3,000 damage plus 10% of a boss’s health, and recharges in 45s.', apply:s=>{ const ab = s.abilities.find(x=>x.id==='chop'); ab.dmg = 3000; ab.boss = 0.1; ab.cd = 45; } },
      { desc:'+6 damage and +2 pierce.', apply:s=>{ s.atk.main.dmg += 6; s.atk.main.pierce += 2; } },
      { desc:'Three cleavers at once, and +30 damage to vehicles.', apply:s=>{ s.atk.main.count = 3; s.atk.main.bonusBig += 30; } },
      { desc:'Throws 25% faster.', apply:s=>{ s.atk.main.rate /= 1.25; } },
      { desc:'Master Chef: cleavers deal double damage to vehicles, +10 damage, and both abilities recharge 30% faster.', apply:s=>{ const a = s.atk.main; a.bigMult = 2; a.dmg += 10; for (const ab of s.abilities) ab.cd *= 0.7; } },
    ],
  },
};
/* in the order they join: Blaze from the start, the others at rising chef levels */
const HERO_ORDER = ['chef_blaze', 'chef_gelato', 'chef_kenji', 'chef_penny', 'chef_nonna', 'chef_bruno'];
Object.assign(ABILITIES, {
  flambe:      { name:'Flambé',        desc:'A ring of flame around Chef Blaze.' },
  wok:         { name:'Wok Inferno',   desc:'A giant flaming wok slams the biggest crowd.' },
  brainfreeze: { name:'Brain Freeze',  desc:'Freezes every pest around Chef Gelato.' },
  bigchill:    { name:'Big Chill',     desc:'Slows every pest on the map and makes them take more damage.' },
  payday:      { name:'Payday',        desc:'Instant cash.' },
  opening:     { name:'Grand Opening', desc:'Every appliance on the map attacks faster for a while.' },
  omakase:     { name:'Omakase',       desc:'Golden chopsticks seek out the toughest pests.' },
  knifedance:  { name:'Knife Dance',   desc:'Chef Kenji throws much faster for a while.' },
  sauce:       { name:'Sauce!',        desc:'Tomato sauce along the trail slows and simmers pests.' },
  mangia:      { name:'Mangia!',       desc:'Pests around Chef Nonna stop to eat.' },
  tenderize:   { name:'Tenderize',     desc:'The toughest vehicles slow down and take more damage.' },
  chop:        { name:'The Big Chop',  desc:'A giant cleaver falls on the toughest pest.' },
});
FACTIONS.chefs = { name:'Head Chef', color:'#ffb02e', blurb:'One per game. Levels up as you clear rounds.' };
/* chefs join the appliance table so they can be placed, drawn, targeted and sold like one,
   but they stay out of TOWER_ORDER, so shops, mastery and challenges never list them */
for (const id of HERO_ORDER){
  const H = HEROES[id];
  TOWERS[id] = { name: H.name, cost: H.cost, size: H.size, hot:'', faction:'chefs', blurb: H.blurb, hero:true, base: H.base, paths:[] };
}
function isHero(type){ return !!(TOWERS[type] && TOWERS[type].hero); }
function heroStats(type, level){
  const H = HEROES[type];
  const s = JSON.parse(JSON.stringify(H.base));
  s.abilities = Array.isArray(s.abilities) ? s.abilities : [];
  for (let L = 2; L <= Math.min(HERO_MAX, level); L++) H.levels[L - 2].apply(s);
  return s;
}
/* the level that brings an ability, or 0 */
function heroAbilityLevel(type, id){ const i = HEROES[type].levels.findIndex(v => v.ab === id); return i < 0 ? 0 : i + 2; }
function heroOnDuty(){ return G.towers.find(t => t.hero && !isAdminUnit(t.type)) || null; }

/* ---------------- hiring and picking ---------------- */
function heroOwned(id){ if (HEROES[id] && HEROES[id].admin) return adminUnitOn(); return !!HEROES[id] && (AdminFlags.unlockAll || sandboxOn() || !!Profile.heroes.owned[id]); }
/* the head chef the shop offers in games: the one picked in the Chefs menu */
function heroPick(){ const p = Profile.heroes.pick; return heroOwned(p) ? p : 'chef_blaze'; }
function setHeroPick(id){ if (!heroOwned(id)) return false; Profile.heroes.pick = id; saveProfile(); return true; }
/* why this head chef can't be placed right now, or null */
function heroBlock(type){
  if (!isHero(type)) return null;
  if (isAdminUnit(type)) return G.towers.some(o => o.type === type) ? 'Only one Chef Infinity per game' : !adminUnitOn() ? 'Admin unit is switched off' : null;
  if (G.towers.some(o => o.hero && !isAdminUnit(o.type))) return 'Only one head chef per game';
  if (!G.attract && !heroOwned(type)) return TOWERS[type].name + ' isn’t hired yet';
  return null;
}
/* chefs that come free at a chef level join as soon as it is reached; returns the new ones */
function syncHeroUnlocks(){
  const lvl = chefLevel(Profile.chef.xp).level, got = [];
  for (const id of HERO_ORDER){
    const U = HEROES[id].unlock;
    if (Profile.heroes.owned[id] || !U || lvl < U.level) continue;
    Profile.heroes.owned[id] = 1;
    got.push(id);
  }
  if (got.length) saveProfile();
  return got;
}
function hireHero(id){
  const H = HEROES[id];
  if (!H || Profile.heroes.owned[id] || !H.unlock || !spendDough(H.unlock.dough)) return false;
  Profile.heroes.owned[id] = 1;
  Profile.heroes.pick = id;
  saveProfile();
  return true;
}
function mergeHeroProfile(out, p){
  const src = p && p.heroes && typeof p.heroes === 'object' ? p.heroes : {};
  out.heroes = { owned:{ chef_blaze:1 }, pick:'chef_blaze', seen:{}, tip: src.tip ? 1 : 0 };
  if (src.owned && typeof src.owned === 'object') for (const id of HERO_ORDER) if (src.owned[id]) out.heroes.owned[id] = 1;
  if (src.seen && typeof src.seen === 'object') for (const id of HERO_ORDER) if (src.seen[id]) out.heroes.seen[id] = 1;
  if (typeof src.pick === 'string' && out.heroes.owned[src.pick]) out.heroes.pick = src.pick;
  return out;
}

/* ---------------- levels ---------------- */
/* the cash price of the next level: what's left of its XP, at $1.20 an XP ($1.80 for Penny, who pays for herself) */
function heroLevelCost(t){
  if (!t || t.level >= HERO_MAX) return 0;
  return price(Math.max(1, heroNeed(t.level) - t.hxp) * 1.2 * (HEROES[t.type].xpCost || 1), t.type);
}
function addHeroXP(t, v){
  if (!t || !t.hero || t.level >= HERO_MAX || !(v > 0)) return 0;
  t.hxp += v;
  let ups = 0;
  while (t.level < HERO_MAX && t.hxp >= heroNeed(t.level)){
    t.hxp -= heroNeed(t.level);
    t.level++; ups++;
  }
  if (t.level >= HERO_MAX) t.hxp = 0;
  if (!ups) return 0;
  if (G.vis){
    G.fx.push({ k:'ring', x:t.x, y:t.y, r0:t.size, r1:t.size + 70, t:0, life:0.7, c:'#ffd166', w:5 });
    for (let i = 0; i < 24; i++){ const a = rand(0, TAU), sp = rand(40, 170); part(t.x, t.y, Math.cos(a) * sp, Math.sin(a) * sp - 30, 0.8, i % 2 ? '#ffd166' : '#fff4c2', 3, 'spark'); }
    fxText(t.x, t.y - t.size - 12, 'Level ' + t.level + '!', '#ffd166', 1.2, 17);
  }
  refreshTowers();
  if (!G.attract){
    Profile.stats.heroTop = Math.max(Profile.stats.heroTop || 0, t.level);
    for (let L = t.level - ups + 1; L <= t.level; L++) Hooks.heroLevel(t, L);
    checkAchievements();
  }
  return ups;
}
function buyHeroLevel(t){
  if (!t || !t.hero || t.level >= HERO_MAX) return false;
  const c = heroLevelCost(t);
  if (!canAfford(c)) return false;
  spend(c);
  t.invested += c;
  Hooks.sfx('upgrade');
  addHeroXP(t, heroNeed(t.level) - t.hxp);
  return true;
}
/* the head chef on duty learns from every cleared round, and Nonna brings lives (never on Michelin, which is played on one) */
function heroRoundEnd(n){
  const t = heroOnDuty();
  G.lastRoundLives = 0;
  if (!t) return;
  const v = heroLivesPerRound(t);
  if (v){
    G.lives += v; G.lastRoundLives = v;
    if (G.vis) fxText(t.x, t.y - t.size - 26, '+' + v + (v === 1 ? ' life' : ' lives'), '#9df29a', 1.3, 15);
  }
  addHeroXP(t, heroRoundXP(n));
}
function heroLivesPerRound(t){ return t && t.s && t.s.lifeRound && !G.attract && G.diff !== 'michelin' ? t.s.lifeRound : 0; }

/* ---------------- abilities ---------------- */
/* the busiest spot: the pest with the most others (vehicles count four) within r.
   Uses the spatial grid, and samples the candidates in very big waves. */
const QC = [];
function crowdSpot(r){
  gridBuild();
  let best = null, bn = -1;
  const list = G.enemies, stride = Math.max(1, Math.ceil(list.length / 160));
  for (let i = 0; i < list.length; i += stride){
    const e = list[i];
    if (e.dead || !onScreen(e) || e.burrowT > 0) continue;
    let n = 0;
    for (const o of query(e.x, e.y, r, QC)) if (!(o.burrowT > 0) && onScreen(o)) n += o.big ? 4 : 1;
    if (n > bn){ bn = n; best = e; }
  }
  return best ? { x: best.x, y: best.y, n: bn, e: best } : null;
}
/* Big Chill: every pest on the map, including ones that arrive while it lasts */
function heroChillTick(dt){
  const c = G.glob.chill;
  c.t -= dt;
  if (c.t <= 0){ G.glob.chill = null; return; }
  c.acc = (c.acc || 0) + dt;
  if (c.acc < 0.1) return;
  c.acc = 0;
  for (const e of G.enemies){
    if (e.dead) continue;
    setVuln(e, { amt: c.vuln, dur: 0.3 });
    if (e.immune && e.immune.indexOf('cold') >= 0) continue;
    slowE(e, 1 - (e.big ? c.bigSlow : c.slow), 0.3);
  }
}
/* how tough a pest is, for abilities that go after the toughest: bosses, then vehicles, then health */
function toughness(e){ return (e.boss ? 4e12 : 0) + (e.big ? 1e12 : 0) + Math.min(e.hp, 9e11); }
/* pests an ability can reach: alive, on the map and above ground */
function heroTargets(t, camo){ return G.enemies.filter(e => !e.dead && onScreen(e) && !(e.burrowT > 0) && (!e.camo || camo || t.s.camo)); }
/* the stretch of trail a chef ladles sauce onto: her own reach, or wider when the trail runs far from her */
function sauceSpots(t){
  let pts = trailPoints().filter(p => Math.hypot(p.x - t.x, p.y - t.y) <= t.s.range * 1.6);
  if (pts.length < 6) pts = trailPoints().slice().sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y)).slice(0, 24);
  return pts.sort((a, b) => a.left - b.left);
}
function runHeroAbility(t, ab){
  switch (ab.id){
    case 'omakase': {
      /* one golden chopstick for each of the toughest pests; with fewer pests about, the toughest get several */
      const list = heroTargets(t, true).sort((p, q) => toughness(q) - toughness(p));
      if (!list.length) return false;
      const spec = { kind:'proj', dmg: ab.dmg, bonusBig: ab.big - ab.dmg, pierce:1, speed:880, size:8, type:'sharp', ignoreImmune:true, sprite:'chopstick', isCrit:true, homing:true, targetBig:true, only:true };
      for (let i = 0; i < ab.n; i++){
        const e = list[i % list.length];
        G.timers.push({ t: i * 0.06, fn: () => {
          if (G.towers.indexOf(t) < 0) return;
          const tg = e.dead ? null : e, ang = tg ? Math.atan2(tg.y - t.y, tg.x - t.x) : rand(0, TAU);
          pushProj(t.x, t.y, ang + rand(-0.6, 0.6), spec.speed, 2.6, spec, t, tg);
        } });
      }
      if (G.vis) G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1:90, t:0, life:0.5, c:'#ffd166', w:5 });
      Hooks.sfx('whoosh');
      return true;
    }
    case 'knifedance':
      if (!heroTargets(t, true).length) return false;
      t.boost.dance = { mult: ab.mult, t: ab.dur };
      if (G.vis){ G.fx.push({ k:'ring', x:t.x, y:t.y, r0:t.size, r1:t.size + 60, t:0, life:0.5, c:'#b9a8ff', w:5 }); fxText(t.x, t.y - t.size - 18, 'Knife Dance!', '#d9cfff', 1.1, 16); }
      Hooks.sfx('whoosh');
      return true;
    case 'tenderize': {
      /* the toughest vehicles on the map, or the toughest pests when no vehicle is about */
      const pool = heroTargets(t, true), bigs = pool.filter(e => e.big);
      const list = (bigs.length ? bigs : pool).sort((p, q) => toughness(q) - toughness(p)).slice(0, ab.n);
      if (!list.length) return false;
      for (const e of list){
        setVuln(e, { amt: ab.vuln, dur: ab.dur });
        slowE(e, ab.slow, ab.dur);
        if (G.vis){ G.fx.push({ k:'mallet', x: e.x, y: e.y, t:0, life:0.45 }); fxText(e.x, e.y - e.r - 12, 'TENDERIZED', '#ffc2b0', 1, 12); }
      }
      Hooks.sfx('whack');
      return true;
    }
    case 'chop': {
      const pool = heroTargets(t, true);
      if (!pool.length) return false;
      let tg = pool[0];
      for (const e of pool) if (toughness(e) > toughness(tg)) tg = e;
      const fx = { k:'chop', x: tg.x, y: tg.y, t:0, life:0.5, e: tg };
      if (G.vis) G.fx.push(fx);
      G.timers.push({ t:0.5, fn: () => {
        let e = tg;
        if (e.dead || e.burrowT > 0){ e = null; let bd = 70; for (const o of G.enemies){ if (o.dead) continue; const d = Math.hypot(o.x - fx.x, o.y - fx.y); if (d < bd){ bd = d; e = o; } } }
        const x = e ? e.x : fx.x, y = e ? e.y : fx.y;
        if (e) damage(e, ab.dmg + (e.boss ? e.maxHp * ab.boss : 0), 'normal', t, { ignoreImmune:true });
        for (const o of query(x, y, 60, QC)) if (o !== e && !o.dead) damage(o, ab.dmg * 0.1, 'normal', t, { ignoreImmune:true });
        if (G.vis){
          G.fx.push({ k:'boom', x, y, r:60, t:0, life:0.45, c:'#e6ecee' });
          G.fx.push({ k:'ring', x, y, r0:16, r1:90, t:0, life:0.55, c:'#ffd166', w:6 });
          for (let i = 0; i < 18; i++){ const a = rand(0, TAU), v = rand(120, 380); part(x, y, Math.cos(a) * v, Math.sin(a) * v - 30, 0.55, i % 2 ? '#e6ecee' : '#c9363a', 3.5, 'spark'); }
          fxText(x, y - 46, 'CHOP!', '#ffffff', 1, 20);
          G.shake = Math.max(G.shake, 0.7);
        }
        Hooks.sfx('boom');
      } });
      Hooks.sfx('whoosh');
      return true;
    }
    case 'sauce': {
      const pts = sauceSpots(t);
      if (!pts.length) return false;
      const spec = { r: ab.r, dur: ab.dur, slow: ab.slow, bigSlow: ab.bigSlow, sauce: { dmg: ab.dmg, tick: ab.tick, ignoreImmune:true } };
      for (let i = 0; i < ab.n; i++){
        const p = pts[Math.min(pts.length - 1, Math.floor((i + 0.5) / ab.n * pts.length))];
        addPuddle(p.x + rand(-4, 4), p.y + rand(-4, 4), spec, t, ab.r * rand(0.9, 1.1), 12);
        if (G.vis) for (let k = 0; k < 4; k++){ const a = rand(0, TAU), v = rand(40, 110); part(p.x, p.y, Math.cos(a) * v, Math.sin(a) * v - 40, 0.45, '#c9302a', 3, 'dot'); }
      }
      Hooks.sfx('splat');
      return true;
    }
    case 'mangia': {
      const R = ab.reach ? t.s.range * ab.reach : Infinity;
      let n = 0;
      for (const e of G.enemies){
        if (e.dead || e.burrowT > 0 || (R !== Infinity && Math.hypot(e.x - t.x, e.y - t.y) > R)) continue;
        if (e.big) slowE(e, ab.bigSlow, ab.dur); else stunE(e, ab.dur);
        n++;
      }
      if (!n) return false;
      if (G.vis){
        if (R === Infinity) G.fx.push({ k:'flash', c:'rgba(255,214,170,0.3)', t:0, life:0.6 });
        else G.fx.push({ k:'ring', x:t.x, y:t.y, r0:t.size, r1:R, t:0, life:0.7, c:'#ffb07a', w:6 });
        fxText(t.x, t.y - t.size - 22, 'Mangia!', '#ffd166', 1.3, 19);
      }
      Hooks.sfx('rank');
      return true;
    }
    case 'flambe': {
      const R = t.s.range * ab.reach;
      for (const e of G.enemies){
        if (e.dead || Math.hypot(e.x - t.x, e.y - t.y) > R) continue;
        damage(e, ab.dmg, 'heat', t, { ignoreImmune:true });
        if (!e.dead) addBurn(e, { dmg: ab.burn, tick:0.5, dur: ab.dur }, t, true);
      }
      if (G.vis){
        G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1:R, t:0, life:0.6, c:'#ff8a3d', w:8 });
        G.fx.push({ k:'boom', x:t.x, y:t.y, r: R * 0.55, t:0, life:0.5, c:'#ffb35c' });
        for (let i = 0; i < 36; i++){ const a = i / 36 * TAU, v = R * rand(3.5, 4.8); part(t.x, t.y, Math.cos(a) * v, Math.sin(a) * v, 0.55, i % 3 ? '#ff8a3d' : '#ffd166', 4, 'flame'); }
      }
      Hooks.sfx('boom');
      return true;
    }
    case 'wok': {
      const spot = crowdSpot(ab.r);
      if (!spot) return false;
      if (G.vis) G.fx.push({ k:'wok', x: spot.x, y: spot.y, t:0, life:0.4 });
      G.timers.push({ t:0.4, fn: () => {
        for (const e of G.enemies){
          if (e.dead || Math.hypot(e.x - spot.x, e.y - spot.y) > ab.r) continue;
          damage(e, e.big ? ab.big : ab.dmg, 'heat', t, { ignoreImmune:true });
          if (!e.dead) addBurn(e, { dmg: ab.burn, tick:0.5, dur: ab.dur }, t, true);
        }
        if (G.vis){
          G.fx.push({ k:'boom', x: spot.x, y: spot.y, r: ab.r, t:0, life:0.6, c:'#ff8a3d' });
          G.fx.push({ k:'ring', x: spot.x, y: spot.y, r0:20, r1: ab.r * 1.2, t:0, life:0.7, c:'#ffd166', w:7 });
          for (let i = 0; i < 30; i++){ const a = rand(0, TAU), v = rand(150, 500); part(spot.x, spot.y, Math.cos(a) * v, Math.sin(a) * v - 40, 0.7, i % 2 ? '#ff5a1f' : '#ffd166', 4, 'flame'); }
          G.shake = Math.max(G.shake, 0.5);
        }
        Hooks.sfx('boom');
      } });
      Hooks.sfx('whoosh');
      return true;
    }
    case 'brainfreeze': {
      const R = ab.reach ? t.s.range * ab.reach : Infinity, k = perk('icebox') ? 1.15 : 1;
      for (const e of G.enemies){
        if (e.dead || (R !== Infinity && Math.hypot(e.x - t.x, e.y - t.y) > R)) continue;
        if (e.immune && e.immune.indexOf('cold') >= 0) continue;
        e.freezeT = Math.max(e.freezeT, (e.big ? ab.bigDur * (e.boss ? 0.5 : 1) : ab.dur) * k);
      }
      if (G.vis){
        if (R === Infinity) G.fx.push({ k:'flash', c:'rgba(191,233,255,0.45)', t:0, life:0.8 });
        else { G.fx.push({ k:'frost', x:t.x, y:t.y, r0:10, r1:R, t:0, life:0.7 }); G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1:R, t:0, life:0.6, c:'#bfe9ff', w:6 }); }
      }
      Hooks.sfx('freeze');
      return true;
    }
    case 'bigchill':
      G.glob.chill = { slow: ab.slow, bigSlow: ab.bigSlow, vuln: ab.vuln, t: ab.dur, max: ab.dur, acc: 1 };
      heroChillTick(0);
      if (G.vis) G.fx.push({ k:'flash', c:'rgba(191,233,255,0.35)', t:0, life:0.9 });
      Hooks.sfx('freeze');
      return true;
    case 'payday': {
      const v = Math.round(ab.cash + ab.per * G.round);
      addCash(v); t.cashGen += v;
      if (G.vis) G.fx.push({ k:'crate', x: t.x, y: t.y - 12, t:0, life:1.3, v });
      Hooks.sfx('cash');
      return true;
    }
    case 'opening':
      G.glob.opening = { mult: ab.mult, t: ab.dur, max: ab.dur };
      if (G.vis){
        G.fx.push({ k:'flash', c:'rgba(255,209,102,0.2)', t:0, life:0.5 });
        for (const o of G.towers) G.fx.push({ k:'ring', x:o.x, y:o.y, r0:o.size, r1:o.size + 26, t:0, life:0.5, c:'#ffd166', w:3 });
      }
      return true;
  }
  return null;
}

/* ---------------- achievements ---------------- */
ACHIEVEMENTS.push(
  { id:'hire1',   name:'Head Chef',     desc:'Put a head chef to work in a game.',  dough:50,  prog: S => [S.heroHires || 0, 1] },
  { id:'hero10',  name:'Rising Star',   desc:'Take a head chef to level 10.',       dough:150, prog: S => [S.heroTop || 0, 10] },
  { id:'hero20',  name:'Master Chef',   desc:'Take a head chef to level 20.',       dough:400, prog: S => [S.heroTop || 0, 20] },
  { id:'brigade', name:'Full Brigade',  desc:'Hire every head chef.',              dough:300, prog: () => [HERO_ORDER.filter(id => Profile.heroes.owned[id]).length, HERO_ORDER.length] },
);
