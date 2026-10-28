'use strict';
/* =====================================================================
   Kitchen Siege — skins and custom appliances (the admin tower builder)
   ===================================================================== */

/* ---------------------------------------------------------------------
   Skins: cosmetic finishes, chosen per appliance and earned by mastery
   --------------------------------------------------------------------- */
const SKIN_MAP = {};
for (const s of SKINS) SKIN_MAP[s.id] = s;
function isCustomTower(type){ return !!(TOWERS[type] && TOWERS[type].custom); }
function skinUnlocked(type, id){
  const s = SKIN_MAP[id];
  if (!s) return false;
  if (!s.rank || isCustomTower(type)) return true;
  return masteryRank(type) >= s.rank;
}
function skinOf(type){
  const id = (Profile.skins && Profile.skins[type]) || (TOWERS[type] && TOWERS[type].skin) || 'classic';
  return SKIN_MAP[id] && skinUnlocked(type, id) ? id : 'classic';
}
function setSkin(type, id){
  if (!TOWERS[type] || !skinUnlocked(type, id)) return false;
  Profile.skins = Profile.skins || {};
  Profile.skins[type] = id;
  saveProfile();
  return true;
}
function skinsOwned(type){ return SKINS.filter(s => skinUnlocked(type, s.id)).length; }

/* ---------------------------------------------------------------------
   Custom appliances
   A design is plain data saved in the profile (so it syncs and exports
   with everything else):
     attacks   up to 3, each with its own style, numbers and effect
     abilities up to 2, each a list of effect blocks with a cooldown
     paths     3 paths x 5 tiers; each tier is a list of changes
   It compiles into a normal TOWERS entry, so the engine treats it like
   any other appliance.
   --------------------------------------------------------------------- */
const CUSTOM_MAX = 24, MAX_ATTACKS = 3, MAX_ABILITIES = 2, MAX_ACTIONS = 4, MAX_MODS = 6;
const ATTACK_STYLES = ['throw', 'gatling', 'boomer', 'blast', 'lob', 'spikes', 'pulse', 'flame', 'beam', 'snipe', 'whirl', 'grab'];
const CUSTOM_STYLES = {
  throw:   { name:'Thrower',      desc:'Throws projectiles at pests.' },
  gatling: { name:'Gatling',      desc:'Sprays a fast stream of shots wherever you point, like a Dartling Gunner.' },
  boomer:  { name:'Boomerang',    desc:'Throws boomerangs that curve out and come back, hitting pests both ways.' },
  blast:   { name:'Bomber',       desc:'Fires shells that explode on impact.' },
  lob:     { name:'Mortar',       desc:'Lobs shells that splash where they land.' },
  spikes:  { name:'Spikes',       desc:'Scatters spikes on the trail that pests run over, or mines that blow up.' },
  pulse:   { name:'Pulse',        desc:'Hits the pests all around it at once.' },
  flame:   { name:'Flamethrower', desc:'Sprays a cone at the pests in front of it.' },
  beam:    { name:'Laser',        desc:'Fires a beam through a line of pests.' },
  snipe:   { name:'Sniper',       desc:'Hits its target instantly.' },
  whirl:   { name:'Whirlwind',    desc:'Sends whirlwinds down the trail that blow pests back.' },
  grab:    { name:'Grabber',      desc:'Grabs pests and holds them still, with a dough hook or a soap bubble.' },
};
const CUSTOM_SPRITES = {
  throw:   { knife:'Knife', skewer:'Skewer', cleaver:'Cleaver', cutter:'Pizza cutter', icicle:'Icicle', fry:'French fry', churro:'Churro', donut:'Donut', plate:'Plate', baguette:'Baguette', bubble:'Bubble', popcorn:'Popcorn' },
  gatling: { pepper:'Peppercorn', popcorn:'Popcorn', crumb:'Crumb', fry:'French fry', knife:'Knife', icicle:'Icicle', bubble:'Bubble' },
  boomer:  { plate:'Plate', cutter:'Pizza cutter', donut:'Donut', bagel:'Bagel', waffle:'Waffle', slice:'Pizza slice' },
  blast:   { toast:'Toast', bagel:'Bagel', boulder:'Sourdough', waffle:'Waffle', slice:'Pizza slice', icecube:'Ice cube', donut:'Donut' },
  lob:     { pizza:'Pizza', coal:'Hot coal', flare:'Flare', oil:'Oil drop', kernel:'Popcorn' },
  spikes:  { toothpick:'Toothpicks', spaghetti:'Spaghetti nest', penne:'Penne', lasagna:'Lasagna' },
  grab:    { hook:'Dough hook', bubble:'Soap bubble' },
};
/* upgrades can switch to a few grander projectiles too */
const UPGRADE_SPRITES = {
  throw:   Object.assign({}, CUSTOM_SPRITES.throw, { goldknife:'Golden knife', mezzaluna:'Mezzaluna', slicer:'Deli slicer blade' }),
  gatling: Object.assign({}, CUSTOM_SPRITES.gatling, { goldknife:'Golden knife', shard:'Steel shard' }),
  boomer:  Object.assign({}, CUSTOM_SPRITES.boomer, { platter:'Platter', silver:'Silver tray', mezzaluna:'Mezzaluna', slicer:'Deli slicer blade' }),
  blast:   Object.assign({}, CUSTOM_SPRITES.blast, { bigbagel:'Giant bagel' }),
  lob:     Object.assign({}, CUSTOM_SPRITES.lob, { bigpizza:'Giant pizza' }),
  spikes:  Object.assign({}, CUSTOM_SPRITES.spikes, { linguine:'Linguine nest' }),
  grab:    Object.assign({}, CUSTOM_SPRITES.grab),
};
const ALL_SPRITES = Object.assign({}, UPGRADE_SPRITES.throw, UPGRADE_SPRITES.gatling, UPGRADE_SPRITES.boomer, UPGRADE_SPRITES.blast, UPGRADE_SPRITES.lob);
const SPRITE_SIZE = { knife:6, skewer:6, cleaver:9, cutter:11, icicle:7, fry:6, churro:7, donut:8, plate:9, baguette:9, bubble:6, popcorn:5, toast:9, bagel:10, boulder:12, waffle:9, slice:9, icecube:7, goldknife:6, mezzaluna:16, slicer:24, bigbagel:16, pepper:5, crumb:4, shard:5, platter:12, silver:13 };
const SPRITE_SPIN = { cutter:1, donut:1, plate:1, bagel:1, slice:1, waffle:1, mezzaluna:1, slicer:1, bigbagel:1, platter:1, silver:1 };
const SHAPES = { orb:'Orb', star:'Star', shard:'Shard', ring:'Ring', bolt:'Bolt', cube:'Cube', heart:'Heart' };
const PATTERNS = { aim:'Aimed (spread)', stream:'Stream (one after another)', ring:'Ring all around', spiral:'Spiral', scatter:'Scatter' };
/* what an attack aims at; "auto" follows the appliance's own targeting buttons */
const AIMS = { auto:'Its appliance’s targeting', first:'First pest', last:'Last pest', close:'Closest pest', strong:'Strongest pest', pointer:'Your pointer' };
const ZONES = { none:'None', sticky:'Sticky puddle (slows)', fire:'Burning puddle', boil:'Boiling puddle (damage)', smoke:'Smoke cloud (weakens)' };
const SHAPE_STYLES = ['throw', 'gatling', 'boomer', 'blast', 'lob'];
const PROJ_STYLES = ['throw', 'gatling', 'boomer', 'blast'];
const COUNT_STYLES = ['throw', 'gatling', 'boomer', 'blast', 'lob', 'snipe', 'spikes', 'whirl', 'grab'];
const can = {
  shape: st => SHAPE_STYLES.includes(st),
  pattern: st => st === 'throw' || st === 'blast' || st === 'gatling',
  speed: st => PROJ_STYLES.includes(st),
  bounce: st => st === 'throw' || st === 'gatling',
  chain: st => ['throw', 'gatling', 'boomer', 'snipe'].includes(st),
  split: st => ['throw', 'gatling', 'boomer', 'blast'].includes(st),
  crit: st => SHAPE_STYLES.includes(st),
  zone: st => st === 'blast' || st === 'lob',
  trail: st => PROJ_STYLES.includes(st),
  homing: st => st === 'throw' || st === 'blast' || st === 'gatling',
  burst: st => ['throw', 'gatling', 'boomer', 'snipe'].includes(st),
  count: st => COUNT_STYLES.includes(st),
  /* choosing what it aims at, and aiming at the player's pointer */
  aim: st => st !== 'pulse' && st !== 'spikes',
  pointer: st => ['throw', 'gatling', 'boomer', 'blast', 'lob', 'beam', 'flame', 'snipe'].includes(st),
  inacc: st => st === 'throw' || st === 'blast' || st === 'gatling',
  life: st => PROJ_STYLES.includes(st),
  size: st => SHAPE_STYLES.includes(st) || st === 'spikes',
  /* workshop objects and motions: anything that flies as a projectile */
  obj: st => SHAPE_STYLES.includes(st),
  motion: st => st === 'throw' || st === 'gatling' || st === 'blast',
  wall: st => PROJ_STYLES.includes(st),
};
const CUSTOM_EFFECTS = {
  none:   { name:'None' },
  slow:   { name:'Slow' },
  burn:   { name:'Burn' },
  freeze: { name:'Freeze' },
  stun:   { name:'Stun' },
  knock:  { name:'Knockback' },
  weaken: { name:'Weaken' },
  strip:  { name:'Scrub armor' },
};

/* ---------------- ability building blocks ---------------- */
const AB_AREAS = { range:'In its range', wide:'Wide area', screen:'Whole map' };
const AB_WHO = { self:'This appliance', near:'Nearby appliances', same:'Every copy of it', all:'Every appliance' };
/* field: [label, min, max, step, default] */
const AB_FIELDS = {
  dmg:   ['Damage', 0, 1e8, 1, 100],
  big:   ['Extra to vehicles', 0, 1e8, 1, 0],
  dur:   ['Seconds', 0.1, 60, 0.1, 3],
  slowp: ['Slow by %', 5, 95, 1, 50],
  fastp: ['Faster by %', 5, 1000, 5, 100],
  dist:  ['Distance', 10, 2000, 5, 200],
  amt:   ['Amount', 1, 1e8, 1, 500],
  vuln:  ['Extra damage per hit', 1, 1e6, 1, 5],
  count: ['Bombs', 1, 200, 1, 20],
  r:     ['Blast radius', 10, 300, 1, 70],
};
const AB_ACTIONS = {
  damage: { name:'Damage pests',            fields:['area', 'dmg', 'big'] },
  burn:   { name:'Set pests on fire',       fields:['area', 'dmg', 'dur'] },
  freeze: { name:'Freeze pests',            fields:['area', 'dur'] },
  stun:   { name:'Stun pests',              fields:['area', 'dur'] },
  slow:   { name:'Slow pests',              fields:['area', 'slowp', 'dur'] },
  knock:  { name:'Push pests back',         fields:['area', 'dist'] },
  weaken: { name:'Weaken pests',            fields:['area', 'vuln', 'dur'] },
  strip:  { name:'Scrub armor and ghosts',  fields:['area'] },
  bombs:  { name:'Bomb the toughest pests', fields:['count', 'dmg', 'r'] },
  strike: { name:'Strike the toughest pest', fields:['dmg'] },
  speed:  { name:'Speed up appliances',     fields:['who', 'fastp', 'dur'] },
  cash:   { name:'Earn cash',               fields:['amt'] },
  lives:  { name:'Restore lives',           fields:['amt'] },
};
const ABILITY_TEMPLATES = {
  rush:    { name:'Caffeine Rush',   cd:50, actions:[{ k:'speed', who:'all', fastp:100, dur:10 }] },
  blitz:   { name:'Breakfast Blitz', cd:40, actions:[{ k:'bombs', count:40, dmg:300, r:80 }] },
  tornado: { name:'Tornado',         cd:40, actions:[{ k:'damage', area:'wide', dmg:20, big:0 }, { k:'knock', area:'wide', dist:260 }, { k:'stun', area:'wide', dur:0.6 }] },
  freeze:  { name:'Flash Freeze',    cd:60, actions:[{ k:'freeze', area:'screen', dur:4 }] },
  bagel:   { name:'Bagel Strike',    cd:30, actions:[{ k:'strike', dmg:1000 }] },
  supply:  { name:'Supply Drop',     cd:60, actions:[{ k:'cash', amt:1500 }] },
  nova:    { name:'Heat Nova',       cd:35, actions:[{ k:'damage', area:'range', dmg:150, big:300 }, { k:'burn', area:'range', dmg:20, dur:4 }] },
  rally:   { name:'Kitchen Rally',   cd:45, actions:[{ k:'speed', who:'near', fastp:150, dur:8 }, { k:'lives', amt:10 }] },
};

/* ---------------- upgrade changes ---------------- */
/* atk: targets an attack (or all of them); ab: targets an ability; num: [min, max, step, default] */
const MOD_KINDS = {
  dmg:    { name:'+ Damage',                 group:'Attack', atk:true, num:[0, 1e7, 1, 1] },
  dmgPct: { name:'+ Damage %',               group:'Attack', atk:true, num:[1, 10000, 1, 25] },
  speed:  { name:'Attack speed + %',         group:'Attack', atk:true, num:[1, 2000, 1, 20] },
  pierce: { name:'+ Pests hit',              group:'Attack', atk:true, num:[1, 5000, 1, 2] },
  count:  { name:'+ Projectiles / shots',    group:'Attack', atk:true, num:[1, 20, 1, 1] },
  splash: { name:'Blast radius + %',         group:'Attack', atk:true, num:[1, 500, 1, 20] },
  burst:  { name:'Hits burst for + damage',  group:'Attack', atk:true, num:[1, 1e7, 1, 2] },
  big:    { name:'+ Damage to vehicles',     group:'Attack', atk:true, num:[1, 1e7, 1, 5] },
  vstun:  { name:'Stuns vehicles (seconds)', group:'Attack', atk:true, num:[0.05, 5, 0.05, 0.3] },
  arange: { name:'Attack range + %',         group:'Attack', atk:true, num:[1, 500, 1, 15] },
  effect: { name:'Adds an effect',           group:'Attack', atk:true, num:[1, 12, 1, 3] },
  type:   { name:'Damage type becomes',      group:'Attack', atk:true },
  sprite: { name:'Projectile becomes',       group:'Attack', atk:true },
  homing: { name:'Projectiles home in',      group:'Attack', atk:true },
  unlock: { name:'Unlocks a locked attack',  group:'Attack', atk:true },
  bounce: { name:'+ Bounces',                group:'Attack', atk:true, num:[1, 10, 1, 1] },
  chain:  { name:'+ Chain lightning jumps',  group:'Attack', atk:true, num:[1, 10, 1, 2] },
  split:  { name:'+ Pieces when it splits',  group:'Attack', atk:true, num:[1, 12, 1, 2] },
  crit:   { name:'+ Critical hit power (×)', group:'Attack', atk:true, num:[1, 50, 1, 2] },
  shape:  { name:'Projectile shape becomes', group:'Attack', atk:true },
  color:  { name:'Colour becomes',           group:'Attack', atk:true },
  aim:    { name:'Aim becomes',              group:'Attack', atk:true },
  accuracy:{ name:'More accurate (− spread %)', group:'Attack', atk:true, num:[5, 100, 5, 50] },
  life:   { name:'Lasts / flies longer + %', group:'Attack', atk:true, num:[5, 500, 5, 25] },
  size:   { name:'Bigger shots + %',         group:'Attack', atk:true, num:[5, 300, 5, 25] },
  hold:   { name:'Holds pests + seconds',    group:'Attack', atk:true, num:[0.1, 10, 0.1, 0.5] },
  allTypes:{ name:'Hits every pest type',    group:'Attack', atk:true },
  decamo: { name:'Removes ghost cloaks',     group:'Attack', atk:true },
  range:  { name:'Range + %',                group:'Appliance', num:[1, 500, 1, 15] },
  camo:   { name:'Sees ghost pests',         group:'Appliance' },
  global: { name:'Reaches the whole map',    group:'Appliance' },
  income: { name:'+ Cash per round',         group:'Appliance', num:[5, 1e7, 5, 100] },
  look:   { name:'Look becomes',             group:'Appliance' },
  tint:   { name:'Body colour becomes',      group:'Appliance' },
  bSpeed: { name:'Nearby attack speed + %',  group:'Support', num:[1, 300, 1, 10] },
  bRange: { name:'Nearby range + %',         group:'Support', num:[1, 200, 1, 10] },
  bDmg:   { name:'Nearby + damage',          group:'Support', num:[1, 1000, 1, 1] },
  bPierce:{ name:'Nearby + pests hit',       group:'Support', num:[1, 1000, 1, 1] },
  bCamo:  { name:'Nearby see ghosts',        group:'Support' },
  bDisc:  { name:'Discount nearby + %',      group:'Support', num:[1, 60, 1, 5] },
  abPower:{ name:'Ability stronger + %',     group:'Ability', ab:true, num:[1, 2000, 1, 50] },
  abCd:   { name:'Ability recharges + % faster', group:'Ability', ab:true, num:[1, 90, 1, 20] },
};

/* ---------------- path templates ---------------- */
const TIER_COST = [0.6, 1, 2, 7, 60];
const PATH_TEMPLATES = {
  power:    { name:'Damage',           short:'Damage',   tiers:['Hard Hitter', 'Heavy Hands', 'Power Surge', 'Devastator', 'Annihilator'] },
  speed:    { name:'Attack speed',     short:'Speed',    tiers:['Quick Hands', 'Rapid Fire', 'Turbo', 'Hyperdrive', 'Lightspeed'] },
  pierce:   { name:'Pierce',           short:'Pierce',   tiers:['Sharp Edge', 'Pass-Through', 'Skewer', 'Lance', 'Endless Edge'] },
  reach:    { name:'Range',            short:'Range',    tiers:['Long Reach', 'Keen Eye', 'Far Sight', 'Eagle Eye', 'All-Seeing'] },
  multi:    { name:'More shots',       short:'Multishot', tiers:['Double Up', 'Triple Threat', 'Spread Shot', 'Barrage', 'Storm'] },
  splash:   { name:'Splash',           short:'Splash',   tiers:['Bigger Bang', 'Shockwave', 'Blast Zone', 'Megablast', 'Cataclysm'] },
  effect:   { name:'Effect strength',  short:'Potency',  tiers:['Potent', 'Stronger Mix', 'Concentrate', 'Overload', 'Pure Essence'] },
  heavy:    { name:'Vehicle damage',   short:'Heavy',    tiers:['Heavy Duty', 'Armor Piercer', 'Shell Cracker', 'Tank Buster', 'Titan Slayer'] },
  income:   { name:'Income',           short:'Income',   tiers:['Tip Jar', 'Side Hustle', 'Catering', 'Franchise', 'Empire'] },
  buffspeed:{ name:'Boost speed',      short:'Hype',     tiers:['Pep Talk', 'Espresso Shot', 'Rally', 'Overclock', 'Frenzy'] },
  buffrange:{ name:'Boost range',      short:'Lookout',  tiers:['Lookout', 'Spotter', 'Watchtower', 'Beacon', 'Lighthouse'] },
  buffpower:{ name:'Boost power',      short:'Prep',     tiers:['Sharpening', 'Seasoning', 'Secret Sauce', 'Chef’s Kiss', 'Masterclass'] },
  discount: { name:'Discounts',        short:'Deals',    tiers:['Coupons', 'Bulk Deals', 'Wholesale', 'Supplier', 'Monopoly'] },
  ability:  { name:'Ability power',    short:'Power-ups', tiers:['Quick Charge', 'Amplify', 'Overcharge', 'Supercharge', 'Ultimate'] },
};
/* what a template puts in tier i, given facts about the design */
function templateMods(key, c, i){
  const M = [];
  switch (key){
    case 'power': M.push({ k:'dmg', a:-1, v: Math.max(1, Math.round(c.dmg * [0.5, 0.5, 1, 3, 10][i])) }); break;
    case 'speed': M.push({ k:'speed', a:-1, v: [15, 20, 30, 60, 120][i] }); break;
    case 'pierce': M.push({ k:'pierce', a:-1, v: Math.max([1, 1, 2, 4, 12][i], Math.round(c.pierce * [0.4, 0.5, 1, 2.5, 8][i])) }); break;
    case 'reach': M.push({ k:'range', v: [15, 15, 20, 25, 35][i] }); if (i === 1) M.push({ k:'camo' }); break;
    case 'multi': M.push({ k:'count', a: c.projIdx, v: [1, 1, 1, 2, 3][i] }); if (i === 4 && c.homingIdx >= 0) M.push({ k:'homing', a: c.homingIdx }); break;
    case 'splash':
      if (c.blastIdx >= 0){
        M.push({ k:'splash', a: c.blastIdx, v: [20, 15, 25, 30, 50][i] }, { k:'pierce', a: c.blastIdx, v: [4, 6, 10, 25, 80][i] });
        if (i >= 2) M.push({ k:'dmg', a: c.blastIdx, v: Math.max(1, Math.round(c.dmg * [0, 0, 0.5, 2, 6][i])) });
      } else if (c.burstIdx >= 0){
        M.push({ k:'burst', a: c.burstIdx, v: Math.max(1, Math.round(c.dmg * [0.5, 0.25, 0.5, 2, 7][i])) });
        if (i >= 1) M.push({ k:'splash', a: c.burstIdx, v: [0, 20, 25, 25, 30][i] });
      }
      break;
    case 'effect': if (c.effIdx >= 0) M.push({ k:'effect', a: c.effIdx, e: c.effKind, v: Math.min(12, c.effPow + [1, 2, 3, 5, 8][i]) }); break;
    case 'heavy':
      M.push({ k:'big', a:-1, v: Math.max(1, Math.round(c.dmg * [1, 2, 4, 15, 60][i])) + [1, 2, 4, 15, 60][i] });
      if (i === 2) M.push({ k:'effect', a:-1, e:'strip', v:1 });
      if (i === 3) M.push({ k:'vstun', a:-1, v:0.3 });
      break;
    case 'income': M.push({ k:'income', v: c.attack ? round5(c.cost * [0.06, 0.1, 0.2, 0.6, 2][i]) : round5(Math.max(20, c.income || 100) * [0.4, 0.6, 1, 2.5, 6][i]) }); break;
    case 'buffspeed': M.push({ k:'bSpeed', v: [5, 5, 10, 15, 30][i] }); break;
    case 'buffrange': M.push({ k:'bRange', v: [5, 5, 8, 10, 15][i] }); if (i === 1) M.push({ k:'bCamo' }); break;
    case 'buffpower': if ([0, 1, 1, 2, 5][i]) M.push({ k:'bDmg', v: [0, 1, 1, 2, 5][i] }); if ([1, 0, 1, 2, 5][i]) M.push({ k:'bPierce', v: [1, 0, 1, 2, 5][i] }); break;
    case 'discount': M.push({ k:'bDisc', v: [5, 5, 5, 10, 15][i] }); break;
    case 'ability':
      for (let k = 0; k < c.abilities; k++){
        if (i === 0 || i === 2) M.push({ k:'abCd', ab:k, v: [15, 0, 20, 0, 0][i] });
        if (i === 1 || i === 3) M.push({ k:'abPower', ab:k, v: [0, 30, 0, 75, 0][i] });
        if (i === 4) M.push({ k:'abPower', ab:k, v:150 }, { k:'abCd', ab:k, v:25 });
      }
      break;
  }
  return M;
}
function templateCtx(d){
  const A = d.attacks;
  const first = A[0];
  const effIdx = A.findIndex(a => a.effect !== 'none' && a.effect !== 'strip');
  return {
    dmg: Math.max(1, first ? first.dmg : 1), pierce: Math.max(1, first ? first.pierce : 1), cost: d.cost, income: d.income, attack: A.length > 0, abilities: d.abilities.length,
    projIdx: A.findIndex(a => can.count(a.style)),
    homingIdx: A.findIndex(a => can.homing(a.style)),
    blastIdx: A.findIndex(a => a.style === 'blast' || a.style === 'lob' || (a.style === 'spikes' && a.mine)),
    burstIdx: A.findIndex(a => can.burst(a.style)),
    effIdx, effKind: effIdx >= 0 ? A[effIdx].effect : 'burn', effPow: effIdx >= 0 ? A[effIdx].effPow : 2,
  };
}
/* the templates that make sense for this design */
function templatesFor(d){
  const c = templateCtx(d), out = [];
  if (c.attack) out.push('power', 'speed', 'pierce');
  if (c.projIdx >= 0) out.push('multi');
  if (c.blastIdx >= 0 || c.burstIdx >= 0) out.push('splash');
  if (c.effIdx >= 0) out.push('effect');
  if (c.attack) out.push('heavy');
  if (!d.global) out.push('reach');
  out.push('income', 'buffspeed', 'buffrange', 'buffpower', 'discount');
  if (c.abilities) out.push('ability');
  return out;
}
function templatePath(d, key, upMul){
  const T = PATH_TEMPLATES[key] || PATH_TEMPLATES.power;
  const c = templateCtx(d);
  return { name:'', tiers: [0, 1, 2, 3, 4].map(i => ({ name: T.tiers[i], cost: round5(d.cost * TIER_COST[i] * (upMul || 100) / 100), desc:'', mods: templateMods(key, c, i) })) };
}

const NUM = (v, lo, hi, def, step) => {
  let n = Number(v);
  if (v === '' || v == null || !isFinite(n)) n = def;
  n = Math.min(hi, Math.max(lo, n));
  return step ? Math.round(Math.round(n / step) * step * 1e6) / 1e6 : n;
};
const round5 = v => Math.max(5, Math.round(v / 5) * 5);
const round2 = v => Math.round(v * 100) / 100;
const pct = v => Math.round(v * 100) + '%';
const cleanText = (v, max, def) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) || def;
function fmtN(v){ v = Number(v) || 0; return (Math.abs(v) >= 100 || Number.isInteger(v) ? Math.round(v) : round2(v)).toLocaleString('en-US'); }

function defaultAttack(style){
  style = CUSTOM_STYLES[style] ? style : 'throw';
  const a = { name:'', style, sprite: CUSTOM_SPRITES[style] ? Object.keys(CUSTOM_SPRITES[style])[0] : '', dmg:2, aps:1.5, pierce:2, count:1, splash:40, type:'sharp', homing:false, big:0, effect:'none', effPow:2, rangePct:100, locked:false,
    shape:'', color:'#ff7a59', psize:8, glow:false, trail:false, pattern:'aim', speedPct:100, bounce:0, chainN:0, chainPct:50, splitN:0, splitPct:40, critEvery:0, critMul:5, zone:'none', zoneR:40, zoneDur:4,
    aim:'auto', inacc:0, lifePct:100, sizePct:100, allTypes:false, decamo:false, hold:1.5, bigs:false, life:15, mine:false, dist:230, push:30,
    obj:'', motion:'straight', amp:35, orbitR:80, wall:0 };
  if (style === 'blast') Object.assign(a, { type:'blast', pierce:12, aps:0.8 });
  if (style === 'lob') Object.assign(a, { type:'blast', pierce:10, aps:0.9 });
  if (style === 'pulse') Object.assign(a, { type:'normal', pierce:10, aps:1, dmg:1, rangePct:70 });
  if (style === 'flame') Object.assign(a, { type:'heat', pierce:5, aps:6, dmg:1, rangePct:80 });
  if (style === 'beam') Object.assign(a, { type:'energy', pierce:6, aps:1.5 });
  if (style === 'snipe') Object.assign(a, { type:'normal', aps:0.8, dmg:4 });
  if (style === 'gatling') Object.assign(a, { type:'sharp', dmg:1, aps:6, pierce:1, aim:'pointer', inacc:6, pattern:'stream', speedPct:120 });
  if (style === 'boomer') Object.assign(a, { type:'normal', dmg:1, aps:1.2, pierce:5 });
  if (style === 'spikes') Object.assign(a, { type:'sharp', dmg:1, aps:0.8, pierce:6, splash:50 });
  if (style === 'whirl') Object.assign(a, { type:'normal', dmg:1, aps:0.45, pierce:10, splash:24 });
  if (style === 'grab') Object.assign(a, { type:'normal', dmg:1, aps:0.5, pierce:1 });
  return a;
}
function defaultAbility(){ return cleanAbility(Object.assign(JSON.parse(JSON.stringify(ABILITY_TEMPLATES.nova)), { unlock: { p:0, t:3 } })); }
function defaultCustom(){
  const d = { v:2, name:'My Appliance', look:'knife', skin:'classic', tint:'', faction:'custom', cost:400, range:150, global:false, camo:false, place:'land', fly:'none',
    income:0, bSpeed:0, bRange:0, bDmg:0, bPierce:0, bCamo:false, bDisc:0,
    attacks:[defaultAttack('throw')], abilities:[], paths:[], created:0 };
  d.paths = ['power', 'speed', 'reach'].map(k => Object.assign(templatePath(d, k), { name: PATH_TEMPLATES[k].short }));
  return d;
}

/* ---------------- cleaning (every stored design passes through here) ---------------- */
function cleanAttack(s){
  s = s && typeof s === 'object' ? s : {};
  const a = defaultAttack(s.style);
  a.name = cleanText(s.name, 20, '');
  const sprites = UPGRADE_SPRITES[a.style];
  if (sprites) a.sprite = sprites[s.sprite] ? s.sprite : Object.keys(CUSTOM_SPRITES[a.style])[0];
  a.dmg = NUM(s.dmg, 0, 1e7, a.dmg, 0.01);
  a.aps = round2(NUM(s.aps, 0.1, 60, a.aps));
  a.pierce = NUM(s.pierce, 1, 5000, a.pierce, 1);
  a.count = NUM(s.count, 1, 12, 1, 1);
  a.splash = NUM(s.splash, 10, 250, 40, 1);
  a.type = TYPE_LABEL[s.type] ? s.type : a.type;
  a.homing = !!s.homing && (a.style === 'throw' || a.style === 'blast');
  a.big = NUM(s.big, 0, 1e7, 0, 1);
  a.effect = CUSTOM_EFFECTS[s.effect] ? s.effect : 'none';
  a.effPow = NUM(s.effPow, 1, 5, 2, 1);
  a.rangePct = NUM(s.rangePct, 20, 400, a.rangePct, 1);
  a.locked = !!s.locked;
  const st = a.style;
  a.shape = can.shape(st) && SHAPES[s.shape] ? s.shape : '';
  a.obj = can.obj(st) && typeof s.obj === 'string' && /^obj\d{1,3}$/.test(s.obj) ? s.obj : '';
  if (a.obj) a.shape = '';
  a.motion = can.motion(st) && MOTIONS[s.motion] ? s.motion : 'straight';
  a.amp = NUM(s.amp, 5, 90, 35, 5);
  a.orbitR = NUM(s.orbitR, 20, 300, 80, 5);
  a.wall = can.wall(st) ? NUM(s.wall, 0, 6, 0, 1) : 0;
  a.color = /^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color.toLowerCase() : a.color;
  a.psize = NUM(s.psize, 4, 30, 8, 1);
  a.glow = !!s.glow;
  a.trail = !!s.trail && can.trail(st);
  a.pattern = can.pattern(st) ? (PATTERNS[s.pattern] ? s.pattern : a.pattern) : 'aim';
  a.speedPct = can.speed(st) ? NUM(s.speedPct, 30, 300, 100, 5) : 100;
  a.bounce = can.bounce(st) ? NUM(s.bounce, 0, 10, 0, 1) : 0;
  a.chainN = can.chain(st) ? NUM(s.chainN, 0, 10, 0, 1) : 0;
  a.chainPct = NUM(s.chainPct, 10, 300, 50, 5);
  a.splitN = can.split(st) ? NUM(s.splitN, 0, 12, 0, 1) : 0;
  a.splitPct = NUM(s.splitPct, 10, 300, 40, 5);
  a.critEvery = can.crit(st) ? NUM(s.critEvery, 0, 20, 0, 1) : 0;
  if (a.critEvery === 1) a.critEvery = 2;
  a.critMul = NUM(s.critMul, 2, 50, 5, 1);
  a.zone = can.zone(st) && ZONES[s.zone] ? s.zone : 'none';
  a.zoneR = NUM(s.zoneR, 15, 150, 40, 1);
  a.zoneDur = NUM(s.zoneDur, 1, 20, 4, 0.5);
  a.aim = can.aim(st) && AIMS[s.aim] && (s.aim !== 'pointer' || can.pointer(st)) ? s.aim : (can.aim(st) ? a.aim : 'auto');
  a.inacc = can.inacc(st) ? NUM(s.inacc, 0, 60, a.inacc, 1) : 0;
  a.lifePct = can.life(st) ? NUM(s.lifePct, 30, 300, 100, 5) : 100;
  a.sizePct = can.size(st) ? NUM(s.sizePct, 50, 300, 100, 5) : 100;
  a.allTypes = !!s.allTypes;
  a.decamo = !!s.decamo;
  a.hold = NUM(s.hold, 0.2, 10, a.hold, 0.1);
  a.bigs = st === 'grab' && !!s.bigs;
  a.life = NUM(s.life, 2, 60, a.life, 0.5);
  a.mine = st === 'spikes' && !!s.mine;
  a.dist = NUM(s.dist, 60, 1200, a.dist, 5);
  a.push = NUM(s.push, 0, 300, a.push, 1);
  return a;
}
function cleanAction(s){
  if (!s || !AB_ACTIONS[s.k]) return null;
  const a = { k: s.k };
  for (const f of AB_ACTIONS[s.k].fields){
    if (f === 'area') a.area = AB_AREAS[s.area] ? s.area : 'range';
    else if (f === 'who') a.who = AB_WHO[s.who] ? s.who : 'near';
    else { const F = AB_FIELDS[f]; a[f] = NUM(s[f], F[1], F[2], F[4], F[3]); }
  }
  return a;
}
function cleanAbility(s){
  s = s && typeof s === 'object' ? s : {};
  const acts = (Array.isArray(s.actions) ? s.actions : []).slice(0, MAX_ACTIONS).map(cleanAction).filter(Boolean);
  return {
    name: cleanText(s.name, 24, 'Special Move'),
    cd: NUM(s.cd, 3, 600, 40, 1),
    unlock: s.unlock && typeof s.unlock === 'object' ? { p: NUM(s.unlock.p, 0, 2, 0, 1), t: NUM(s.unlock.t, 0, 4, 3, 1) } : null,
    actions: acts.length ? acts : [cleanAction({ k:'damage', area:'range', dmg:100 })],
  };
}
/* whether an upgrade change does anything to an attack of this style */
function modFits(k, st){
  switch (k){
    case 'sprite': return !!UPGRADE_SPRITES[st];
    case 'homing': return can.homing(st);
    case 'burst': return can.burst(st);
    case 'count': return can.count(st);
    case 'splash': return !['pulse', 'flame', 'beam', 'grab'].includes(st);
    case 'bounce': return can.bounce(st);
    case 'chain': return can.chain(st);
    case 'split': return can.split(st);
    case 'crit': return can.crit(st);
    case 'shape': return can.shape(st);
    case 'aim': return can.aim(st);
    case 'accuracy': return can.inacc(st);
    case 'life': return can.life(st) || st === 'spikes' || st === 'whirl';
    case 'size': return can.size(st) || st === 'whirl';
    case 'hold': return st === 'grab';
    case 'pierce': return st !== 'grab';
  }
  return true;
}
/* changes that must point at one attack rather than all of them */
const ONE_ATTACK = { unlock:1, sprite:1, aim:1, hold:1 };
function cleanMod(m, d){
  if (!m || !MOD_KINDS[m.k]) return null;
  const K = MOD_KINDS[m.k], o = { k: m.k };
  if (K.atk){
    if (!d.attacks.length) return null;
    let a = Math.round(Number(m.a));
    if (!isFinite(a) || a < -1) a = -1;
    if (a >= d.attacks.length) return null;
    o.a = a;
    if (m.k === 'unlock' && (a < 0 || !d.attacks[a].locked)) return null;
    if (a < 0 && ONE_ATTACK[m.k] && m.k !== 'sprite') return null;
    if (a >= 0 && !modFits(m.k, d.attacks[a].style)) return null;
  }
  if (K.ab){
    const ab = Math.round(Number(m.ab));
    if (!isFinite(ab) || ab < 0 || ab >= d.abilities.length) return null;
    o.ab = ab;
  }
  if (K.num) o.v = NUM(m.v, K.num[0], K.num[1], K.num[3], K.num[2]);
  if (m.k === 'effect') o.e = CUSTOM_EFFECTS[m.e] && m.e !== 'none' ? m.e : 'burn';
  if (m.k === 'type') o.e = TYPE_LABEL[m.e] ? m.e : 'normal';
  if (m.k === 'shape') o.e = SHAPES[m.e] ? m.e : 'star';
  if (m.k === 'color') o.e = /^#[0-9a-f]{6}$/i.test(m.e || '') ? m.e.toLowerCase() : '#ffd166';
  if (m.k === 'look'){ if (!lookChoiceOk(m.e)) return null; o.e = m.e; }
  if (m.k === 'tint') o.e = /^#[0-9a-f]{6}$/i.test(m.e || '') ? m.e.toLowerCase() : '#5aa6d6';
  if (m.k === 'aim'){
    const st = d.attacks[o.a].style;
    o.e = AIMS[m.e] && (m.e !== 'pointer' || can.pointer(st)) ? m.e : (can.pointer(st) ? 'pointer' : 'strong');
  }
  if (m.k === 'sprite'){
    const pool = o.a >= 0 ? UPGRADE_SPRITES[d.attacks[o.a].style] : ALL_SPRITES;
    o.e = pool[m.e] ? m.e : Object.keys(pool)[0];
  }
  return o;
}
function cleanPath(s, d, p){
  s = s && typeof s === 'object' ? s : {};
  const fallback = templatePath(d, ['power', 'speed', 'reach'][p]);
  const tiers = [0, 1, 2, 3, 4].map(i => {
    const t = (Array.isArray(s.tiers) && s.tiers[i]) || fallback.tiers[i];
    return {
      name: cleanText(t.name, 24, fallback.tiers[i].name),
      cost: NUM(t.cost, 5, 1e8, round5(d.cost * TIER_COST[i]), 5),
      desc: cleanText(t.desc, 160, ''),
      mods: (Array.isArray(t.mods) ? t.mods : []).slice(0, MAX_MODS).map(m => cleanMod(m, d)).filter(Boolean),
    };
  });
  return { name: cleanText(s.name, 20, ''), tiers };
}
/* designs saved by the first version of the builder: one attack, generated paths, a preset ability */
const LEGACY_FOCI = { throw:['power', 'speed', 'reach'], blast:['splash', 'speed', 'heavy'], lob:['splash', 'power', 'speed'], pulse:['power', 'speed', 'reach'], flame:['power', 'speed', 'pierce'], beam:['power', 'pierce', 'speed'], snipe:['power', 'speed', 'multi'], farm:['income', 'discount', 'buffspeed'], boost:['buffspeed', 'buffrange', 'buffpower'] };
function fromLegacy(s){
  const style = LEGACY_FOCI[s.style] ? s.style : 'throw';
  const atk = CUSTOM_STYLES[style] ? style : null;
  const d = { v:2, name: s.name, look: s.look, skin: s.skin, cost: NUM(s.cost, 25, 1e6, 400, 5), range: s.range, global: !!s.global, camo: !!s.camo, created: s.created,
    income: style === 'farm' ? NUM(s.income, 0, 1e7, 150, 1) : 0,
    bSpeed: style === 'boost' ? NUM(s.bSpeed, 0, 300, 15, 1) : 0, bRange: style === 'boost' ? s.bRange : 0, bDmg: style === 'boost' ? s.bDmg : 0,
    bPierce: style === 'boost' ? s.bPierce : 0, bCamo: style === 'boost' && !!s.bCamo, bDisc: style === 'boost' ? s.bDisc : 0,
    attacks: atk ? [cleanAttack({ style, sprite: s.sprite, dmg: s.dmg, aps: s.aps, pierce: s.pierce, count: s.count, splash: s.splash, type: s.type, homing: s.homing, big: s.big, effect: s.effect, effPow: s.effPow, rangePct:100 })] : [],
    abilities: [], paths: [] };
  const tpl = ABILITY_TEMPLATES[s.ability];
  const abPath = NUM(s.abPath, 0, 2, 0, 1);
  if (tpl) d.abilities.push(cleanAbility(Object.assign(JSON.parse(JSON.stringify(tpl)), { unlock: { p: abPath, t: 3 } })));
  const upMul = NUM(s.upMul, 10, 1000, 100, 1);
  const allowed = templatesFor(d);
  d.paths = [0, 1, 2].map(p => {
    const want = Array.isArray(s.paths) && s.paths[p] && s.paths[p].focus;
    const key = allowed.includes(want) ? want : (allowed.includes(LEGACY_FOCI[style][p]) ? LEGACY_FOCI[style][p] : allowed[p % allowed.length]);
    const path = templatePath(d, key, upMul);
    path.name = (Array.isArray(s.paths) && s.paths[p] && s.paths[p].name) || PATH_TEMPLATES[key].short;
    if (tpl && abPath === p) path.tiers[4].mods.push({ k:'abPower', ab:0, v:150 }, { k:'abCd', ab:0, v:30 });
    return path;
  });
  return d;
}
function cleanCustom(src){
  let s = src && typeof src === 'object' ? src : {};
  if (s.v !== 2) s = fromLegacy(s);
  const d = { v:2 };
  d.name = cleanText(s.name, 24, 'My Appliance');
  d.look = BASE_TOWER_ORDER.includes(s.look) ? s.look : 'knife';
  d.body = typeof bodyById === 'function' && bodyById(s.body) ? s.body : '';
  d.skin = SKIN_MAP[s.skin] ? s.skin : 'classic';
  d.tint = /^#[0-9a-f]{6}$/i.test(s.tint || '') ? s.tint.toLowerCase() : '';
  d.faction = FACTIONS[s.faction] ? s.faction : 'custom';
  d.cost = NUM(s.cost, 25, 1e6, 400, 5);
  d.range = NUM(s.range, 40, 700, 150, 1);
  d.global = !!s.global;
  d.camo = !!s.camo;
  /* aircraft take off from a pad on dry land; anything else can float instead */
  d.fly = s.fly === 'copter' || s.fly === 'saucer' ? s.fly : 'none';
  d.place = s.place === 'water' && d.fly === 'none' ? 'water' : 'land';
  d.income = NUM(s.income, 0, 1e7, 0, 1);
  d.bSpeed = NUM(s.bSpeed, 0, 300, 0, 1);
  d.bRange = NUM(s.bRange, 0, 200, 0, 1);
  d.bDmg = NUM(s.bDmg, 0, 1000, 0, 1);
  d.bPierce = NUM(s.bPierce, 0, 1000, 0, 1);
  d.bCamo = !!s.bCamo;
  d.bDisc = NUM(s.bDisc, 0, 60, 0, 1);
  d.attacks = (Array.isArray(s.attacks) ? s.attacks : []).slice(0, MAX_ATTACKS).map(cleanAttack);
  d.abilities = (Array.isArray(s.abilities) ? s.abilities : []).slice(0, MAX_ABILITIES).map(cleanAbility);
  d.paths = [0, 1, 2].map(p => cleanPath(Array.isArray(s.paths) ? s.paths[p] : null, d, p));
  d.created = NUM(s.created, 0, 9e15, 0, 1);
  d.paragon = s.paragon ? cleanParagon(s.paragon, d) : null;
  return d;
}

/* starter designs (written in the simple first-version format and converted) */
const CUSTOM_PRESETS = {
  laser:   { name:'Laser Grater', look:'blender', skin:'neon', style:'beam', cost:1500, range:170, aps:2, dmg:3, pierce:6, type:'energy', effect:'none', paths:[{ focus:'power' }, { focus:'pierce' }, { focus:'speed' }], ability:'rush', abPath:2 },
  shaker:  { name:'Spice Shaker', look:'siphon', skin:'molten', style:'pulse', cost:1200, range:95, aps:1.2, dmg:1, pierce:12, type:'heat', effect:'burn', effPow:2, paths:[{ focus:'effect' }, { focus:'speed' }, { focus:'reach' }], ability:'none' },
  waffle:  { name:'Waffle Cannon', look:'toaster', skin:'copper', style:'blast', sprite:'waffle', cost:900, range:165, aps:0.8, dmg:2, pierce:14, splash:46, type:'blast', effect:'stun', effPow:2, paths:[{ focus:'splash' }, { focus:'speed' }, { focus:'heavy' }], ability:'blitz', abPath:0 },
  ice:     { name:'Ice Crusher', look:'freezer', skin:'frosted', style:'throw', sprite:'icicle', cost:700, range:160, aps:1.6, dmg:1, pierce:3, count:2, type:'cold', effect:'slow', effPow:3, paths:[{ focus:'effect' }, { focus:'multi' }, { focus:'power' }], ability:'freeze', abPath:0 },
  chef:    { name:'Sniper Chef', look:'micro', skin:'midnight', style:'snipe', cost:600, range:9999, global:true, aps:0.9, dmg:4, type:'normal', camo:true, effect:'weaken', effPow:2, paths:[{ focus:'power' }, { focus:'speed' }, { focus:'heavy' }], ability:'bagel', abPath:2 },
  vending: { name:'Vending Machine', look:'espresso', skin:'gold', style:'farm', cost:1000, range:120, income:180, paths:[{ focus:'income' }, { focus:'discount' }, { focus:'buffspeed' }], ability:'supply', abPath:0 },
};
/* a two-attack showcase built in the new format */
function chefDeluxe(){
  const d = defaultCustom();
  Object.assign(d, { name:'Grill Master', look:'grill', skin:'molten', cost:1500, range:165 });
  d.attacks = [
    cleanAttack({ name:'Skewers', style:'throw', sprite:'skewer', dmg:2, aps:1.4, pierce:3, type:'sharp' }),
    cleanAttack({ name:'Flame burst', style:'pulse', dmg:1, aps:0.7, pierce:14, type:'heat', effect:'burn', effPow:2, rangePct:60 }),
    cleanAttack({ name:'Charcoal mortar', style:'lob', sprite:'coal', dmg:6, aps:0.5, pierce:16, splash:50, type:'heat', locked:true }),
  ];
  d.abilities = [cleanAbility({ name:'Heat Nova', cd:35, unlock:{ p:1, t:3 }, actions: ABILITY_TEMPLATES.nova.actions })];
  d.paths = [
    { name:'Charcoal', tiers: [
      { name:'Hot Coals', cost:500, mods:[{ k:'unlock', a:2 }] },
      { name:'Bigger Coals', cost:800, mods:[{ k:'splash', a:2, v:25 }, { k:'pierce', a:2, v:8 }] },
      { name:'Lava Rock', cost:1800, mods:[{ k:'dmg', a:2, v:6 }, { k:'effect', a:2, e:'burn', v:4 }] },
      { name:'Volcano', cost:6500, mods:[{ k:'count', a:2, v:2 }, { k:'speed', a:2, v:60 }] },
      { name:'Magma Core', cost:52000, mods:[{ k:'dmg', a:2, v:60 }, { k:'big', a:2, v:300 }, { k:'sprite', a:2, e:'bigpizza' }] },
    ]},
    { name:'Flame', tiers: [
      { name:'Hotter Flame', cost:450, mods:[{ k:'dmg', a:1, v:1 }, { k:'arange', a:1, v:20 }] },
      { name:'Searing', cost:750, mods:[{ k:'effect', a:1, e:'burn', v:4 }] },
      { name:'Firestorm', cost:1700, mods:[{ k:'speed', a:1, v:50 }, { k:'pierce', a:1, v:10 }] },
      { name:'Heat Nova', cost:6000, mods:[{ k:'dmg', a:1, v:6 }] },
      { name:'Supernova', cost:48000, mods:[{ k:'abPower', ab:0, v:300 }, { k:'abCd', ab:0, v:40 }, { k:'dmg', a:1, v:30 }] },
    ]},
    templatePath(d, 'reach'),
  ];
  d.paths[2].name = 'Range';
  d.paragon = {
    name:'Inferno Grill', cost:300000, range:230, camo:true,
    attacks: [
      { name:'Meteor skewers', style:'throw', shape:'shard', color:'#ff7a2a', psize:10, glow:true, trail:true, dmg:40, aps:4, pierce:12, count:3, type:'normal', bounce:3, splitN:4, splitPct:40, critEvery:5, critMul:6 },
      { name:'Firestorm', style:'pulse', color:'#ff5a1f', dmg:25, aps:1.5, pierce:80, type:'heat', effect:'burn', effPow:5, rangePct:70 },
      { name:'Magma mortar', style:'lob', shape:'orb', color:'#ff3d1f', psize:14, glow:true, dmg:150, aps:0.8, pierce:60, splash:80, count:2, type:'heat', zone:'fire', zoneR:60, zoneDur:5 },
    ],
    abilities: [{ name:'Meteor Shower', cd:30, actions:[{ k:'bombs', count:60, dmg:2000, r:90 }, { k:'burn', area:'screen', dmg:200, dur:5 }] }],
  };
  return cleanCustom(d);
}
const PRESET_LIST = { grill:'Grill Master (3 attacks)', laser:'Laser Grater', shaker:'Spice Shaker', waffle:'Waffle Cannon', ice:'Ice Crusher', chef:'Sniper Chef', vending:'Vending Machine' };
function presetDesign(key){
  if (key === 'grill') return chefDeluxe();
  return cleanCustom(JSON.parse(JSON.stringify(CUSTOM_PRESETS[key] || CUSTOM_PRESETS.laser)));
}

/* ---------------------------------------------------------------------
   Attacks
   --------------------------------------------------------------------- */
/* effect fields for a power level; `blast` uses the explosion field names */
function effectFields(kind, P, dmg, blast){
  P = Math.max(1, Math.min(12, P));
  const base = Math.max(1, dmg);
  switch (kind){
    case 'slow': { const m = Math.max(0.1, 0.86 - 0.065 * P); return { slow:{ mult: round2(m), dur: round2(0.8 + 0.25 * P), bigMult: round2(1 - (1 - m) * 0.5) } }; }
    case 'burn': return { burn:{ dmg: Math.max(1, Math.round(base * 0.25 * P)), tick:0.5, dur: round2(1.2 + 0.3 * P) } };
    case 'freeze': return { freeze:{ dur: round2(0.35 + 0.15 * P), bigDur: P >= 6 ? round2(0.08 * P) : 0 } };
    case 'stun': return blast ? { stun: round2(0.15 + 0.08 * P), stunBig: P >= 6 ? round2(0.04 * P) : 0 } : { stun: round2(0.15 + 0.08 * P), bigStun: P >= 6 ? round2(0.04 * P) : 0 };
    case 'knock': return { knock: 5 + 5 * P, bigKnock: P >= 6 ? 2 * P : 0 };
    case 'weaken': return { vuln:{ amt: Math.max(1, Math.round(base * 0.2 * P)), dur: round2(2 + 0.3 * P) } };
    case 'strip': return { strip: true };
  }
  return {};
}
function effectText(kind, P, dmg){
  const f = effectFields(kind, P, dmg, false);
  switch (kind){
    case 'slow': return 'slows pests to ' + pct(f.slow.mult) + ' speed for ' + f.slow.dur + 's';
    case 'burn': return 'sets pests on fire for ' + f.burn.dmg + ' every 0.5s for ' + f.burn.dur + 's';
    case 'freeze': return 'freezes pests for ' + f.freeze.dur + 's';
    case 'stun': return 'stuns pests for ' + f.stun + 's';
    case 'knock': return 'knocks pests back';
    case 'weaken': return 'makes pests take +' + f.vuln.amt + ' damage from every hit for ' + f.vuln.dur + 's';
    case 'strip': return 'scrubs the armor off armored pests';
  }
  return '';
}
const blastStyle = st => st === 'blast' || st === 'lob';
/* the part of an attack that holds its damage numbers: the explosion for bombers and mortars */
function hitPart(spec, style){ return (style === 'blast' ? spec.explode : style === 'lob' ? spec.impact : style === 'spikes' ? spec.mine : spec) || spec; }
function zoneSpec(A){
  const r = A.zoneR, dur = A.zoneDur, d = Math.max(1, A.dmg);
  switch (A.zone){
    case 'sticky': return { zone: { r, dur, slow:0.45, bigSlow:0.75 } };
    case 'fire': return { zone: { r, dur, slow:1, bigSlow:1, fire:true, burn:{ dmg: Math.max(1, Math.round(d * 0.3)), tick:0.5, dur:1.5 } } };
    case 'boil': return { zone: { r, dur, slow:0.85, bigSlow:1, boil:{ dmg: Math.max(1, Math.round(d * 0.5)), tick:0.5 } } };
    case 'smoke': return { smoke: { r: r * 1.2, dur, slow:0.85, vuln:{ amt: Math.max(1, Math.round(d * 0.3)), dur:1 } } };
  }
  return {};
}
/* everything a custom attack can add on top of its basic numbers */
function specials(A, sizeNow){
  const o = { color: A.color };
  if (A.shape) Object.assign(o, { sprite:'shape', shape: A.shape, size: A.psize, glow: A.glow, trail: A.trail });
  const OB = A.obj ? objectSpec(A.obj) : null;
  if (OB) Object.assign(o, { sprite:'obj', obj: OB, size: OB.size });
  else if (A.obj) Object.assign(o, { sprite:'shape', shape:'orb', size: A.psize });   /* the object is gone: a plain orb */
  if (A.motion !== 'straight' && can.motion(A.style)){ o.motion = A.motion; if (A.motion === 'wave' || A.motion === 'zigzag') o.amp = A.amp; if (A.motion === 'orbit') o.orbitR = A.orbitR; }
  if (A.wall && can.wall(A.style)) o.wall = A.wall;
  if (can.pattern(A.style) && A.pattern !== 'aim') o.pattern = A.pattern;
  if (A.bounce) o.bounce = A.bounce;
  if (A.chainN) o.zap = { dmg: Math.max(1, round2(A.dmg * A.chainPct / 100)), type: A.type, chain:{ count: A.chainN, range:130 }, color: A.color };
  if (A.splitN) o.split = { count: A.splitN, sprite: OB ? 'obj' : A.shape ? 'shape' : A.sprite, obj: OB || undefined, shape: A.shape, color: A.color, glow: A.glow, size: Math.max(3, Math.round((OB ? OB.size : A.shape ? A.psize : sizeNow) * 0.6)),
    dmg: Math.max(1, round2(A.dmg * A.splitPct / 100)), pierce: 1, speed: 380, life: 0.45, type: A.type, spin: true };
  if (A.critEvery) o.crit = { every: A.critEvery, mul: A.critMul };
  return Object.assign(o, zoneSpec(A));
}
/* aiming and the other general settings an attack can have */
function aimFields(A){
  const o = {};
  if (A.aim === 'pointer' && can.pointer(A.style)) o.aim = 'pointer';
  else if (A.aim && A.aim !== 'auto' && A.aim !== 'pointer' && can.aim(A.style)) o.mode = A.aim;
  if (A.inacc) o.inacc = round2(A.inacc * Math.PI / 180);
  const orbit = can.motion(A.style) && (A.motion === 'orbit' || A.motion === 'spiralout' || A.motion === 'brake');
  if (A.lifePct !== 100 || orbit) o.lifeMul = A.lifePct / 100 * (orbit ? 3 : 1);
  if (A.allTypes) o.ignoreImmune = true;
  if (A.decamo) o.decamo = true;
  return o;
}
function attackFor(A){
  const rate = round2(1 / A.aps) || 0.02, t = A.type;
  const plain = effectFields(A.effect, A.effPow, A.dmg, false);
  const sizeNow = SPRITE_SIZE[A.sprite] || 7;
  const extra = Object.assign({ rangeMul: A.rangePct / 100, _style: A.style, _base: A.dmg }, specials(A, sizeNow), aimFields(A));
  /* bigger or smaller food projectiles (shapes have their own size) */
  const sized = o => {
    if (A.sizePct !== 100 && o.sprite !== 'shape' && o.sprite !== 'obj'){ const k = A.sizePct / 100; o.scale = k; o.size = round2((o.size || 7) * k); }
    return o;
  };
  const blastPart = () => { const ex = Object.assign({ r:A.splash, dmg:A.dmg, pierce:A.pierce, type:t, bonusBig:A.big }, effectFields(A.effect, A.effPow, A.dmg, true)); if (A.decamo) ex.decamo = true; return ex; };
  switch (A.style){
    case 'throw': case 'gatling':
      return sized(Object.assign({ kind:'proj', rate, dmg:A.dmg, pierce:A.pierce, speed: Math.round(640 * A.speedPct / 100), size: sizeNow, type:t, sprite:A.sprite, count:A.count, spread: A.style === 'gatling' ? 0.1 : 0.16, homing:A.homing, bonusBig:A.big, spin: !!SPRITE_SPIN[A.sprite] }, plain, extra));
    case 'boomer':
      return sized(Object.assign({ kind:'proj', boomerang:true, rate, dmg:A.dmg, pierce:A.pierce, speed: Math.round(380 * A.speedPct / 100), size: sizeNow, type:t, sprite:A.sprite, count:A.count, bonusBig:A.big, spin:true }, plain, extra));
    case 'blast':
      return sized(Object.assign({ kind:'proj', rate, dmg:0, pierce:1, speed: Math.round(470 * A.speedPct / 100), size: SPRITE_SIZE[A.sprite] || 9, type:t, sprite:A.sprite, count:A.count, spread:0.22, homing:A.homing, explode: blastPart(), expireExplode:true, spin: !!SPRITE_SPIN[A.sprite] }, extra));
    case 'lob':
      return sized(Object.assign({ kind:'lob', rate, travel:0.45, type:t, sprite:A.sprite, count:A.count, impact: blastPart() }, extra));
    case 'spikes': {
      const r = round2(14 * A.sizePct / 100);
      if (A.mine){
        /* ravioli mines that blow up when a pest steps on them */
        return Object.assign({ kind:'trap', rate, dmg:0, pierce:1, type:t, r: Math.max(12, r + 2), life:A.life, sprite:'ravioli', count:A.count, mineEvery:1, mine: blastPart() }, extra);
      }
      return Object.assign({ kind:'trap', rate, dmg:A.dmg, pierce:A.pierce, type:t, r, life:A.life, sprite:A.sprite, count:A.count, bonusBig:A.big }, plain, extra);
    }
    case 'whirl':
      return Object.assign({}, plain, { kind:'whirl', rate, dmg:A.dmg, pierce:A.pierce, type:t, r:A.splash, speed:170, dist:A.dist, knock: Math.max(A.push, plain.knock || 0), bigKnock: Math.round(A.push * 0.3), count:A.count, bonusBig:A.big }, extra);
    case 'grab': {
      const o = { kind:'grab', rate, count:A.count, dmg:A.dmg, type:t, bonusBig:A.big, bigs:A.bigs };
      /* a dough hook hits when it grabs; a soap bubble holds the pest and pops for double */
      if (A.sprite === 'bubble') Object.assign(o, { dmg:0, bubble:{ dur:A.hold, bigDur: A.bigs ? round2(A.hold * 0.5) : 0, pop: Math.max(1, A.dmg * 2), popBig: Math.max(1, A.dmg * 2 + A.big) } });
      else Object.assign(o, { hook:true, hold:A.hold, bigHold: A.bigs ? round2(A.hold * 0.5) : 0 });
      return Object.assign(o, plain, extra);
    }
    case 'pulse': return Object.assign({ kind:'pulse', rate, dmg:A.dmg, pierce:A.pierce, type:t, bonusBig:A.big, vfx: A.effect === 'freeze' ? 'frost' : 'ring', hot: t === 'heat' }, plain, extra);
    case 'flame': return Object.assign({ kind:'flame', rate, dmg:A.dmg, pierce:A.pierce, type:t, cone:0.6, bonusBig:A.big }, plain, extra);
    case 'beam':  return Object.assign({ kind:'beam', rate, dmg:A.dmg, pierce:A.pierce, type:t, width:8, bonusBig:A.big, laser: t === 'energy' }, plain, extra);
    case 'snipe': return Object.assign({ kind:'hitscan', rate, dmg:A.dmg, pierce:1, type:t, shots:A.count, multi: A.count > 1, bonusBig:A.big }, plain, extra);
  }
  return null;
}
const atkKey = i => i === 0 ? 'main' : 'a' + (i + 1);
function attackLabel(d, i){
  const A = d.attacks[i];
  if (!A) return 'Attack ' + (i + 1);
  if (A.name) return A.name;
  const base = CUSTOM_STYLES[A.style].name;
  return d.attacks.some((o, j) => j !== i && !o.name && o.style === A.style) ? base + ' ' + (i + 1) : base;
}

/* ---------------------------------------------------------------------
   Upgrade changes: text and effect
   --------------------------------------------------------------------- */
function modTarget(d, m){
  if (!MOD_KINDS[m.k].atk || d.attacks.length < 2) return '';
  return m.a < 0 ? ' (all attacks)' : ' (' + attackLabel(d, m.a) + ')';
}
function modText(d, m){
  const v = m.v, T = modTarget(d, m);
  const abName = m.ab != null && d.abilities[m.ab] ? d.abilities[m.ab].name : 'Ability';
  switch (m.k){
    case 'dmg': return '+' + fmtN(v) + ' damage' + T;
    case 'dmgPct': return '+' + fmtN(v) + '% damage' + T;
    case 'speed': return 'Attacks ' + fmtN(v) + '% faster' + T;
    case 'pierce': return 'Hits ' + fmtN(v) + ' more pest' + (v === 1 ? '' : 's') + T;
    case 'count': return '+' + v + ' projectile' + (v === 1 ? '' : 's') + ' per attack' + T;
    case 'splash': return fmtN(v) + '% bigger blasts' + T;
    case 'burst': return 'Hits burst for +' + fmtN(v) + ' damage nearby' + T;
    case 'big': return '+' + fmtN(v) + ' damage to vehicles' + T;
    case 'vstun': return 'Stuns vehicles for ' + v + 's' + T;
    case 'arange': return '+' + fmtN(v) + '% attack range' + T;
    case 'effect': return m.e === 'strip' ? 'Scrubs armor off armored pests' + T : 'Each hit ' + effectText(m.e, v, 2) + T;
    case 'type': return 'Deals ' + TYPE_LABEL[m.e].toLowerCase() + ' damage' + T;
    case 'sprite': return 'Throws ' + (ALL_SPRITES[m.e] || 'new projectiles').toLowerCase() + 's' + T;
    case 'homing': return 'Projectiles home in' + T;
    case 'unlock': return 'New attack: ' + attackLabel(d, m.a);
    case 'bounce': return 'Bounces to ' + v + ' more pest' + (v === 1 ? '' : 's') + T;
    case 'chain': return 'Chain lightning jumps to ' + v + ' more pest' + (v === 1 ? '' : 's') + T;
    case 'split': return 'Splits into ' + v + ' more piece' + (v === 1 ? '' : 's') + T;
    case 'crit': return 'Critical hits deal +' + v + '× damage' + T;
    case 'shape': return 'Fires ' + SHAPES[m.e].toLowerCase() + 's' + T;
    case 'color': return 'New colour' + T;
    case 'aim': return (m.e === 'pointer' ? 'Aims wherever you point' : m.e === 'auto' ? 'Aims with its appliance’s targeting' : 'Aims at the ' + AIMS[m.e].toLowerCase()) + T;
    case 'accuracy': return fmtN(v) + '% less spread' + T;
    case 'life': return 'Lasts or flies ' + fmtN(v) + '% longer' + T;
    case 'size': return fmtN(v) + '% bigger shots' + T;
    case 'hold': return 'Holds pests ' + fmtN(v) + 's longer' + T;
    case 'allTypes': return 'Hits every pest type, immune or not' + T;
    case 'decamo': return 'Hits strip ghost cloaks' + T;
    case 'range': return '+' + fmtN(v) + '% range';
    case 'camo': return 'Sees ghost pests';
    case 'global': return 'Reaches the whole map';
    case 'income': return '+$' + fmtN(v) + ' at the end of every round';
    case 'look': return 'Takes on a new look: ' + lookChoiceName(m.e);
    case 'tint': return 'A new body colour';
    case 'bSpeed': return 'Nearby appliances attack ' + fmtN(v) + '% faster';
    case 'bRange': return 'Nearby appliances get +' + fmtN(v) + '% range';
    case 'bDmg': return 'Nearby appliances deal +' + fmtN(v) + ' damage';
    case 'bPierce': return 'Nearby appliances hit +' + fmtN(v) + ' pests';
    case 'bCamo': return 'Nearby appliances see ghost pests';
    case 'bDisc': return 'Appliances in range cost ' + fmtN(v) + '% less';
    case 'abPower': return abName + ' is ' + fmtN(v) + '% stronger';
    case 'abCd': return abName + ' recharges ' + fmtN(v) + '% faster';
  }
  return '';
}
/* apply one change to a stats object while upgrades are being added up */
function applyMod(s, m){
  const K = MOD_KINDS[m.k];
  if (K.atk){
    const keys = m.a < 0 ? Object.keys(s._atks) : [atkKey(m.a)];
    for (const key of keys){ const A = s._atks[key]; if (A) applyAtkMod(A, m); }
    return;
  }
  const buff = () => (s.buff = s.buff || {});
  switch (m.k){
    case 'range': if (!s.global) s.range *= 1 + m.v / 100; break;
    case 'camo': s.camo = true; break;
    case 'global': s.global = true; s.range = 9999; break;
    case 'income': s.income = (s.income || 0) + m.v; break;
    case 'look': s.look = lookKeyOf(m.e); break;
    case 'tint': s.tint = m.e; break;
    case 'bSpeed': buff().speed = (s.buff.speed || 1) + m.v / 100; break;
    case 'bRange': buff().range = (s.buff.range || 1) + m.v / 100; break;
    case 'bDmg': buff().dmg = (s.buff.dmg || 0) + m.v; break;
    case 'bPierce': buff().pierce = (s.buff.pierce || 0) + m.v; break;
    case 'bCamo': buff().camo = true; break;
    case 'bDisc': buff().discount = Math.min(0.6, (s.buff.discount || 0) + m.v / 100); break;
    case 'abPower': { const ab = s._abs[m.ab]; if (ab) ab.power = round2((ab.power || 1) * (1 + m.v / 100)); break; }
    case 'abCd': { const ab = s._abs[m.ab]; if (ab) ab.cd = Math.max(2, round2(ab.cd * (1 - m.v / 100))); break; }
  }
}
function applyAtkMod(A, m){
  const H = hitPart(A, A._style);
  switch (m.k){
    case 'dmg': H.dmg += m.v; break;
    case 'dmgPct': H.dmg = round2(H.dmg * (1 + m.v / 100)); if (A.burst) A.burst.dmg = round2(A.burst.dmg * (1 + m.v / 100)); break;
    case 'speed': A.rate /= 1 + m.v / 100; break;
    case 'pierce': H.pierce = (H.pierce || 1) + m.v; break;
    case 'count':
      if (A.kind === 'hitscan'){ A.shots = (A.shots || 1) + m.v; A.multi = true; }
      else if (A.kind === 'proj' || A.kind === 'lob'){ A.count = (A.count || 1) + m.v; if (A.spread) A.spread = Math.max(0.08, A.spread * 0.92); }
      else if (A.kind === 'trap' || A.kind === 'whirl' || A.kind === 'grab') A.count = (A.count || 1) + m.v;
      break;
    case 'splash': {
      const f = 1 + m.v / 100;
      if (A.explode) A.explode.r *= f;
      if (A.impact) A.impact.r *= f;
      if (A.burst) A.burst.r *= f;
      if (A.splash) A.splash.r *= f;
      if (A.mine) A.mine.r *= f;
      if (A.kind === 'whirl') A.r *= f;
      break;
    }
    case 'burst': {
      const key = A.kind === 'hitscan' ? 'splash' : A.kind === 'proj' && !A.explode ? 'burst' : null;
      if (!key) break;
      if (A[key]) A[key].dmg += m.v;
      else A[key] = { r:34, dmg: m.v, pierce:8, type: A.type, bonusBig:0 };
      break;
    }
    case 'big': H.bonusBig = (H.bonusBig || 0) + m.v; break;
    case 'vstun': if (H === A) A.bigStun = Math.max(A.bigStun || 0, m.v); else H.stunBig = Math.max(H.stunBig || 0, m.v); break;
    case 'arange': A.rangeMul = (A.rangeMul || 1) * (1 + m.v / 100); break;
    case 'effect': Object.assign(H, effectFields(m.e, m.v, A._base || 1, H !== A)); break;
    case 'type': A.type = m.e; if (H !== A) H.type = m.e; break;
    case 'sprite': if (A.kind === 'proj' || A.kind === 'lob'){ A.sprite = m.e; if (SPRITE_SIZE[m.e]) A.size = SPRITE_SIZE[m.e]; A.spin = !!SPRITE_SPIN[m.e]; } break;
    case 'homing': if (A.kind === 'proj' && !A.boomerang) A.homing = true; break;
    case 'unlock': A._on = true; break;
    case 'bounce': if (A.kind === 'proj' && !A.boomerang) A.bounce = (A.bounce || 0) + m.v; break;
    case 'chain':
      if (A.kind !== 'proj' && A.kind !== 'hitscan') break;
      if (A.zap) A.zap.chain.count += m.v;
      else A.zap = { dmg: Math.max(1, round2(H.dmg * 0.5)), type: A.type, chain:{ count: m.v, range:130 }, color: A.color };
      break;
    case 'split':
      if (A.kind !== 'proj') break;
      if (A.split) A.split.count += m.v;
      else A.split = { count: m.v, sprite: A.sprite, shape: A.shape, color: A.color, glow: A.glow, size: Math.max(3, Math.round((A.size || 7) * 0.6)), dmg: Math.max(1, round2(H.dmg * 0.4)), pierce: 1, speed: 380, life: 0.45, type: A.type, spin: true };
      break;
    case 'crit':
      if (A.kind !== 'proj' && A.kind !== 'lob') break;
      if (A.crit && A.crit.mul) A.crit.mul += m.v; else if (!A.crit) A.crit = { every: 5, mul: 1 + m.v };
      break;
    case 'shape': if (A.kind === 'proj' || A.kind === 'lob'){ A.sprite = 'shape'; A.shape = m.e; A.size = A.size || 8; A.spin = false; } break;
    case 'color': A.color = m.e; if (A.zap) A.zap.color = m.e; if (A.split) A.split.color = m.e; break;
    case 'aim':
      if (m.e === 'pointer'){ A.aim = 'pointer'; delete A.mode; }
      else { delete A.aim; if (m.e === 'auto') delete A.mode; else A.mode = m.e; }
      break;
    case 'accuracy': if (A.inacc) A.inacc = round2(A.inacc * Math.max(0, 1 - m.v / 100)); break;
    case 'life': {
      const f = 1 + m.v / 100;
      if (A.kind === 'proj') A.lifeMul = round2((A.lifeMul || 1) * f);
      if (A.kind === 'trap') A.life = round2((A.life || 20) * f);
      if (A.kind === 'whirl') A.dist = Math.round((A.dist || 230) * f);
      break;
    }
    case 'size': {
      const f = 1 + m.v / 100;
      if (A.kind === 'proj' || A.kind === 'lob'){ if (A.sprite !== 'shape') A.scale = round2((A.scale || 1) * f); A.size = round2((A.size || 7) * f); }
      if (A.kind === 'trap') A.r = round2((A.r || 14) * f);
      if (A.kind === 'whirl') A.r = round2((A.r || 22) * f);
      break;
    }
    case 'hold':
      if (A.bubble){ A.bubble.dur = round2(A.bubble.dur + m.v); if (A.bubble.bigDur) A.bubble.bigDur = round2(A.bubble.bigDur + m.v * 0.5); }
      else if (A.kind === 'grab'){ A.hold = round2((A.hold || 0) + m.v); if (A.bigHold) A.bigHold = round2(A.bigHold + m.v * 0.5); }
      break;
    case 'allTypes': A.ignoreImmune = true; break;
    case 'decamo': A.decamo = true; if (H !== A) H.decamo = true; break;
  }
}
function tierDesc(d, p, i){
  const T = d.paths[p].tiers[i];
  if (T.desc) return T.desc;
  const parts = T.mods.map(m => modText(d, m)).filter(Boolean);
  d.abilities.forEach(B => { if (B.unlock && B.unlock.p === p && B.unlock.t === i) parts.push('Ability: ' + B.name); });
  return parts.length ? parts.join('. ') + '.' : 'No changes yet.';
}

/* ---------------------------------------------------------------------
   Abilities
   --------------------------------------------------------------------- */
const abId = (id, k) => id + '_ab' + k;
function actionText(a){
  const where = a.area === 'screen' ? 'every pest on the map' : a.area === 'wide' ? 'pests in a wide area' : 'pests in range';
  switch (a.k){
    case 'damage': return 'Deals ' + fmtN(a.dmg) + ' to ' + where + (a.big ? ' (+' + fmtN(a.big) + ' to vehicles)' : '');
    case 'burn': return 'Sets ' + where + ' on fire for ' + fmtN(a.dmg) + ' every 0.5s for ' + a.dur + 's';
    case 'freeze': return 'Freezes ' + where + ' for ' + a.dur + 's';
    case 'stun': return 'Stuns ' + where + ' for ' + a.dur + 's';
    case 'slow': return 'Slows ' + where + ' by ' + a.slowp + '% for ' + a.dur + 's';
    case 'knock': return 'Pushes ' + where + ' back';
    case 'weaken': return (a.area === 'screen' ? 'Every pest on the map takes' : a.area === 'wide' ? 'Pests in a wide area take' : 'Pests in range take') + ' +' + fmtN(a.vuln) + ' damage per hit for ' + a.dur + 's';
    case 'strip': return 'Scrubs armor, ghost cloaks and mold off ' + where;
    case 'bombs': return 'Drops ' + a.count + ' bombs on the toughest pests for ' + fmtN(a.dmg) + ' each';
    case 'strike': return 'Hits the toughest pest for ' + fmtN(a.dmg);
    case 'speed': return AB_WHO[a.who] + ' attack ' + a.fastp + '% faster for ' + a.dur + 's';
    case 'cash': return 'Earns $' + fmtN(a.amt);
    case 'lives': return 'Restores ' + fmtN(a.amt) + ' lives';
  }
  return '';
}
function abilityText(B){ return B.actions.map(actionText).join('. ') + '.'; }
function abilitySpec(id, k, B){ return { id: abId(id, k), cd: B.cd, custom: true, power: 1, actions: JSON.parse(JSON.stringify(B.actions)) }; }
/* runs a custom ability; returns false when it had nothing to do (so no cooldown is spent) */
function runCustomAbility(t, ab){
  const P = ab.power || 1, longer = 1 + (P - 1) * 0.5;
  let did = false;
  const reach = area => area === 'screen' || t.s.global ? Infinity : area === 'wide' ? Math.max(220, t.s.range * 2.5) : t.s.range;
  const pests = area => { const R = reach(area); return G.enemies.filter(e => !e.dead && onScreen(e) && !(e.burrowT > 0) && (R === Infinity || Math.hypot(e.x - t.x, e.y - t.y) <= R)); };
  const show = (area, c) => {
    if (!G.vis) return;
    const R = reach(area);
    if (R === Infinity) G.fx.push({ k:'flash', c, t:0, life:0.55 });
    else G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1:R, t:0, life:0.6, c: c.replace(/,[\d.]+\)$/, ',1)'), w:5 });
  };
  for (const a of ab.actions){
    switch (a.k){
      case 'damage': { const L = pests(a.area); for (const e of L) damage(e, a.dmg * P + (e.big ? a.big * P : 0), 'normal', t, { ignoreImmune:true }); if (L.length){ did = true; show(a.area, 'rgba(255,209,102,0.3)'); } break; }
      case 'burn': { const L = pests(a.area); for (const e of L) addBurn(e, { dmg: a.dmg * P, tick:0.5, dur: a.dur * longer }, t, true); if (L.length){ did = true; show(a.area, 'rgba(255,138,61,0.3)'); } break; }
      case 'freeze': { const L = pests(a.area); for (const e of L) freezeE(e, { dur: a.dur * longer, bigDur: a.dur * longer * 0.5, ii:true }, t); if (L.length){ did = true; show(a.area, 'rgba(191,233,255,0.45)'); Hooks.sfx('freeze'); } break; }
      case 'stun': { const L = pests(a.area); for (const e of L) stunE(e, a.dur * longer * (e.big ? 0.5 : 1)); if (L.length){ did = true; show(a.area, 'rgba(255,246,168,0.3)'); } break; }
      case 'slow': { const L = pests(a.area); for (const e of L) slowE(e, 1 - a.slowp / 100, a.dur * longer); if (L.length){ did = true; show(a.area, 'rgba(163,231,160,0.3)'); } break; }
      case 'knock': {
        const L = pests(a.area);
        for (const e of L) if (!e.boss) knockE(e, a.dist * longer * (e.big ? 0.35 : 1));
        if (L.length){ did = true; if (G.vis) G.tornados.push({ x: t.x, y: t.y, t: 0, life: 1.2, r: Math.min(reach(a.area), 600) }); Hooks.sfx('whirl'); }
        break;
      }
      case 'weaken': { const L = pests(a.area); for (const e of L) setVuln(e, { amt: a.vuln * P, dur: a.dur * longer }); if (L.length){ did = true; show(a.area, 'rgba(208,139,255,0.3)'); } break; }
      case 'strip': { const L = pests(a.area); for (const e of L){ stripArmor(e); e.camo = false; e.mold = false; } if (L.length){ did = true; show(a.area, 'rgba(191,233,255,0.35)'); } break; }
      case 'bombs': {
        const L = G.enemies.filter(e => !e.dead && onScreen(e)).sort((x, y) => y.tier - x.tier || y.hp - x.hp);
        if (!L.length) break;
        did = true;
        const n = Math.round(a.count * P);
        for (let i = 0; i < n; i++){
          const e = L[i % L.length], ox = rand(-20, 20), oy = rand(-20, 20);
          G.timers.push({ t: 0.35 + i * 0.035, fn: () => explodeAt(e.x + ox, e.y + oy, { r: a.r, dmg: a.dmg, pierce: 40, type:'normal', ignoreImmune:true }, t, null) });
          if (G.vis) G.fx.push({ k:'drop', x: e.x + ox, y: e.y + oy, t: -i * 0.035, life: 0.35 });
        }
        break;
      }
      case 'strike': {
        let best = null, bs = -Infinity;
        for (const e of G.enemies){ if (e.dead || !onScreen(e)) continue; const sc = (e.boss ? 2e12 : e.big ? 1e12 : 0) + e.hp; if (sc > bs){ bs = sc; best = e; } }
        if (!best) break;
        did = true;
        const e = best;
        if (G.vis) G.fx.push({ k:'drop', x: e.x, y: e.y, t: 0, life: 0.35 });
        G.timers.push({ t: 0.35, fn: () => { if (e.dead) return; damage(e, a.dmg * P, 'normal', t, { ignoreImmune:true }); if (G.vis) G.fx.push({ k:'boom', x: e.x, y: e.y, r: 46, t:0, life:0.35, c:'#ffc46b' }); Hooks.sfx('boom'); } });
        break;
      }
      case 'speed': {
        const R = Math.max(200, t.s.range * 1.5);
        const list = a.who === 'self' ? [t] : a.who === 'same' ? G.towers.filter(o => o.type === t.type) : a.who === 'all' ? G.towers : G.towers.filter(o => Math.hypot(o.x - t.x, o.y - t.y) <= R);
        for (const o of list) o.boost[ab.id] = { mult: 1 + Math.min(10, a.fastp / 100 * longer), t: a.dur * longer };
        if (list.length){ did = true; if (G.vis) G.fx.push(a.who === 'all' ? { k:'flash', c:'rgba(255,209,102,0.18)', t:0, life:0.5 } : { k:'ring', x:t.x, y:t.y, r0:10, r1: a.who === 'self' ? 60 : R, t:0, life:0.6, c:'#ffd166', w:5 }); }
        break;
      }
      case 'cash': {
        const v = Math.round(a.amt * P);
        addCash(v); t.cashGen += v; did = true;
        if (G.vis) G.fx.push({ k:'crate', x: clamp(t.x + rand(-50, 50), 30, W - 30), y: clamp(t.y + rand(-40, 40), 30, H - 30), t:0, life:1.3, v });
        Hooks.sfx('cash');
        break;
      }
      case 'lives': {
        const v = Math.round(a.amt * P);
        G.lives += v; did = true;
        if (G.vis) fxText(t.x, t.y - 26, '+' + fmtN(v) + ' lives', '#9df29a', 1.1, 15);
        break;
      }
    }
  }
  return did;
}

/* ---------------------------------------------------------------------
   Compiling a design into an appliance
   --------------------------------------------------------------------- */
function roleOf(d){
  const live = d.attacks.filter(a => !a.locked);
  if (live.length > 1) return 'Multi-attack';
  if (live.length) return CUSTOM_STYLES[live[0].style].name;
  if (d.attacks.length) return CUSTOM_STYLES[d.attacks[0].style].name;
  if (d.bSpeed || d.bRange || d.bDmg || d.bPierce || d.bCamo || d.bDisc) return 'Support';
  return d.income ? 'Money maker' : 'Support';
}
function pluralWord(w, n){ w = w.toLowerCase(); if (n === 1) return w; if (/fe$/.test(w)) return w.slice(0, -2) + 'ves'; if (/(popcorn)$/.test(w)) return w; return w + 's'; }
const SPIKE_WORDS = { toothpick:['a pile of toothpicks', 'piles of toothpicks'], spaghetti:['a spaghetti nest', 'spaghetti nests'], penne:['a pile of penne', 'piles of penne'], lasagna:['a lasagna sheet', 'lasagna sheets'], linguine:['a linguine nest', 'linguine nests'] };
function attackSentence(A){
  const sprite = A.shape ? SHAPES[A.shape] : (UPGRADE_SPRITES[A.style] || {})[A.sprite];
  const per = A.aps === 1 ? 'once a second' : A.aps === 2 ? 'twice a second' : A.aps >= 1 ? round2(A.aps) + ' times a second' : 'every ' + round2(1 / A.aps) + 's';
  const pl = n => n === 1 ? '' : 's';
  let s;
  switch (A.style){
    case 'throw': s = 'Throws ' + (A.count > 1 ? A.count + ' ' : /^[aeiou]/i.test(sprite || 'p') ? 'an ' : 'a ') + pluralWord(sprite || 'projectile', A.count) + ' ' + per + ' for ' + fmtN(A.dmg) + ' damage, hitting ' + A.pierce + ' pest' + pl(A.pierce); break;
    case 'blast': s = 'Fires ' + (sprite || 'shell').toLowerCase() + ' bombs ' + per + ' that blast ' + A.pierce + ' pests for ' + fmtN(A.dmg); break;
    case 'lob': s = 'Lobs ' + (sprite || 'shell').toLowerCase() + ' ' + per + ', splashing ' + A.pierce + ' pests for ' + fmtN(A.dmg); break;
    case 'pulse': s = 'Pulses ' + per + ', hitting up to ' + A.pierce + ' pests around it for ' + fmtN(A.dmg); break;
    case 'flame': s = 'Sprays fire ' + per + ', hitting up to ' + A.pierce + ' pests for ' + fmtN(A.dmg); break;
    case 'beam': s = 'Fires a beam ' + per + ' through ' + A.pierce + ' pests for ' + fmtN(A.dmg); break;
    case 'gatling': s = 'Sprays ' + pluralWord(sprite || 'shot', 2) + ' ' + (A.aim === 'pointer' ? 'wherever you point' : 'at pests') + ' ' + per + (A.count > 1 ? ', ' + A.count + (A.pattern === 'stream' ? ' in a burst' : ' at a time') : '') + ', each for ' + fmtN(A.dmg) + ' damage and hitting ' + A.pierce + ' pest' + pl(A.pierce); break;
    case 'boomer': s = 'Throws ' + (A.count > 1 ? A.count + ' ' : 'a ') + (sprite || 'boomerang').toLowerCase() + ' boomerang' + (A.count > 1 ? 's' : '') + ' ' + per + ' that curve' + (A.count > 1 ? '' : 's') + ' out and back, hitting up to ' + A.pierce + ' pest' + pl(A.pierce) + ' for ' + fmtN(A.dmg); break;
    case 'spikes': s = A.mine
      ? 'Plants ' + (A.count > 1 ? A.count + ' ravioli mines' : 'a ravioli mine') + ' on the trail ' + per + ' that blast' + (A.count > 1 ? '' : 's') + ' ' + A.pierce + ' pest' + pl(A.pierce) + ' for ' + fmtN(A.dmg) + ' when stepped on'
      : 'Scatters ' + (A.count > 1 ? A.count + ' ' + (SPIKE_WORDS[A.sprite] || SPIKE_WORDS.toothpick)[1] : (SPIKE_WORDS[A.sprite] || SPIKE_WORDS.toothpick)[0]) + ' on the trail ' + per + '; each hits ' + A.pierce + ' pest' + pl(A.pierce) + ' for ' + fmtN(A.dmg);
      s += A.mine ? '; ' + (A.count > 1 ? 'mines last ' : 'it lasts ') + A.life + 's' : ' and lasts ' + A.life + 's'; break;
    case 'whirl': s = 'Sends ' + (A.count > 1 ? A.count + ' whirlwinds' : 'a whirlwind') + ' down the trail ' + per + ', hitting up to ' + A.pierce + ' pest' + pl(A.pierce) + ' for ' + fmtN(A.dmg) + (A.push ? ' and blowing them back' : ''); break;
    case 'grab': s = A.sprite === 'bubble'
      ? 'Traps ' + (A.count > 1 ? A.count + ' pests' : 'a pest') + ' in a soap bubble ' + per + ' for ' + A.hold + 's; it pops for ' + fmtN(Math.max(1, A.dmg * 2))
      : 'Grabs ' + (A.count > 1 ? A.count + ' pests' : 'a pest') + ' with a dough hook ' + per + ', holding ' + (A.count > 1 ? 'them' : 'it') + ' for ' + A.hold + 's' + (A.dmg ? ' and hitting for ' + fmtN(A.dmg) : '');
      if (A.bigs) s += ' (vehicles too, for half as long)'; break;
    default: s = 'Hits ' + (A.count > 1 ? A.count + ' pests' : 'a pest') + ' ' + per + ' for ' + fmtN(A.dmg);
  }
  if (A.aim === 'pointer' && A.style !== 'gatling' && can.pointer(A.style)) s += ', aimed wherever you point';
  else if (A.aim !== 'auto' && A.aim !== 'pointer' && can.aim(A.style)) s += ', aiming at the ' + AIMS[A.aim].toLowerCase();
  if (A.pattern === 'ring') s += ', firing in a ring'; else if (A.pattern === 'spiral') s += ', in spirals'; else if (A.pattern === 'scatter') s += ', scattered';
  if (A.effect !== 'none') s += '; each hit ' + effectText(A.effect, A.effPow, A.dmg);
  if (A.big) s += ' (+' + fmtN(A.big) + ' to vehicles)';
  if (A.bounce) s += '; bounces to ' + A.bounce + ' more pest' + pl(A.bounce);
  if (A.chainN) s += '; chain lightning jumps to ' + A.chainN + ' more for ' + fmtN(Math.max(1, A.dmg * A.chainPct / 100));
  if (A.splitN) s += '; splits into ' + A.splitN + ' pieces for ' + fmtN(Math.max(1, A.dmg * A.splitPct / 100)) + ' each';
  if (A.critEvery) s += '; every ' + (A.critEvery === 2 ? '2nd' : A.critEvery === 3 ? '3rd' : A.critEvery + 'th') + ' attack is a ' + A.critMul + '× critical hit';
  if (A.zone !== 'none') s += '; leaves a ' + ZONES[A.zone].replace(/ \(.*\)$/, '').toLowerCase();
  if (A.allTypes) s += '; hits every pest type';
  if (A.decamo) s += '; strips ghost cloaks';
  if (A.motion && A.motion !== 'straight' && can.motion(A.style)) s += ({ wave:', weaving as they fly', zigzag:', zigzagging as they fly', orbit:', circling it for as long as they last', spiralout:', spiralling out from it', accel:', gathering speed', brake:', braking to a crawl', drunk:', wandering about' })[A.motion] || '';
  if (A.wall && can.wall(A.style)) s += ', bouncing off the walls ' + (A.wall === 1 ? 'once' : A.wall + ' times');
  return s + '.';
}
function describeCustom(d){
  const parts = [];
  d.attacks.forEach((A, i) => { if (!A.locked) parts.push((d.attacks.length > 1 ? attackLabel(d, i) + ': ' : '') + attackSentence(A)); });
  const locked = d.attacks.filter(a => a.locked).length;
  if (locked) parts.push('Gains ' + (locked === 1 ? 'another attack' : locked + ' more attacks') + ' through upgrades.');
  if (d.income) parts.push('Earns $' + fmtN(d.income) + ' every round.');
  const b = [];
  if (d.bSpeed) b.push(d.bSpeed + '% faster attacks');
  if (d.bRange) b.push('+' + d.bRange + '% range');
  if (d.bDmg) b.push('+' + d.bDmg + ' damage');
  if (d.bPierce) b.push('+' + d.bPierce + ' pierce');
  if (d.bCamo) b.push('ghost sight');
  if (d.bDisc) b.push(d.bDisc + '% discounts');
  if (b.length) parts.push('Gives nearby appliances ' + b.join(', ') + '.');
  if (d.abilities.length) parts.push('Abilit' + (d.abilities.length > 1 ? 'ies' : 'y') + ': ' + d.abilities.map(B => B.name + (B.unlock ? ' (path ' + (B.unlock.p + 1) + ', tier ' + (B.unlock.t + 1) + ')' : '')).join(', ') + '.');
  if (d.camo) parts.push('Sees ghost pests.');
  if (d.place === 'water') parts.push('Floats: it can only be placed on water.');
  if (d.fly === 'copter') parts.push('Flies from a pad like a copter, following your pointer or patrolling.');
  if (d.fly === 'saucer') parts.push('Flies from a pad like a saucer, looping over the kitchen.');
  if (!parts.length) parts.push('A blank appliance. Give it an attack, income or a boost.');
  return parts.join(' ');
}
function compileCustom(id, d){
  const L = TOWERS[d.look], body = d.body ? bodyById(d.body) : null;
  const base = { range: d.global ? 9999 : d.range, atk:{}, _atks:{}, _abs:[] };
  if (d.global) base.global = true;
  if (d.camo) base.camo = true;
  d.attacks.forEach((A, i) => { const spec = attackFor(A); spec._on = !A.locked; base._atks[atkKey(i)] = spec; });
  d.abilities.forEach((B, k) => { const spec = abilitySpec(id, k, B); spec._on = !B.unlock; base._abs.push(spec); });
  if (d.income) base.income = d.income;
  const b = {};
  if (d.bSpeed) b.speed = 1 + d.bSpeed / 100;
  if (d.bRange) b.range = 1 + d.bRange / 100;
  if (d.bDmg) b.dmg = d.bDmg;
  if (d.bPierce) b.pierce = d.bPierce;
  if (d.bCamo) b.camo = true;
  if (d.bDisc) b.discount = d.bDisc / 100;
  if (Object.keys(b).length) base.buff = b;
  base.noTarget = !d.attacks.some(a => !a.locked);
  const paths = d.paths.map((P, p) => ({
    name: P.name || 'Path ' + (p + 1),
    ups: P.tiers.map((T, i) => {
      const mods = T.mods.slice();
      const unlocks = [];
      d.abilities.forEach((B, k) => { if (B.unlock && B.unlock.p === p && B.unlock.t === i) unlocks.push(k); });
      const lookMod = mods.filter(m => m.k === 'look').pop(), tintMod = mods.filter(m => m.k === 'tint').pop();
      return { name: T.name, cost: T.cost, desc: tierDesc(d, p, i), look: lookMod ? lookKeyOf(lookMod.e) : undefined, tint: tintMod ? tintMod.e : undefined, apply: s => { for (const k of unlocks) if (s._abs[k]) s._abs[k]._on = true; for (const m of mods) applyMod(s, m); } };
    }),
  }));
  /* after upgrades are added up: keep only the attacks and abilities that are switched on */
  const finish = s => {
    s.atk = {};
    for (const key in s._atks){ const A = s._atks[key]; if (A._on){ delete A._on; s.atk[key] = A; } }
    for (const ab of s._abs) if (ab._on){ delete ab._on; s.abilities.push(ab); }
    delete s._atks; delete s._abs;
    s.noTarget = !Object.keys(s.atk).length;
  };
  const P = d.paragon;
  const paragon = P ? { name: P.name, cost: P.cost, desc: describeParagon(P), look: P.look ? lookKeyOf(P.look) : undefined, tint: P.tint || undefined, make: deg => paragonStats(id, P, deg) } : null;
  return { name: d.name, cost: d.cost, size: body ? body.size : L.size, hot:'', faction: d.faction, custom:true, look: body ? bodyLook(d.body) : d.look, skin: d.skin, tint: d.tint, role: roleOf(d), body: d.body || undefined,
    water: d.place === 'water' || undefined, flyer: d.fly !== 'none' ? d.fly : undefined,
    blurb: describeCustom(d), base, paths, finish, paragon };
}

/* ---------------------------------------------------------------------
   Custom paragons: their own attacks, abilities and support, scaled by
   degree (damage up to x3, attack speed and pierce up to x2 at 100)
   --------------------------------------------------------------------- */
function defaultParagon(d){
  return cleanParagon({ name: d.name + ' Prime', cost: d.cost * 400, range: Math.min(700, Math.round(d.range * 1.4)), global: d.global, camo: true,
    attacks: (d.attacks.length ? d.attacks : [defaultAttack('throw')]).map(paragonAttackFrom),
    abilities: d.abilities.map(B => Object.assign({}, B, { unlock: null, cd: Math.max(3, Math.round(B.cd * 0.7)) })),
    income: d.income * 5, bSpeed: d.bSpeed ? d.bSpeed + 15 : 0, bRange: d.bRange, bDmg: d.bDmg ? d.bDmg + 2 : 0, bPierce: d.bPierce, bCamo: d.bCamo, bDisc: d.bDisc }, d);
}
/* an appliance attack made paragon-strong: 20x damage, 2x speed, 5x pests hit */
function paragonAttackFrom(a){ return Object.assign({}, a, { locked:false, dmg: Math.max(1, a.dmg) * 20, aps: Math.min(60, a.aps * 2), pierce: Math.min(5000, a.pierce * 5), big: Math.max(a.big * 10, 50) }); }
function cleanParagon(s, d){
  s = s && typeof s === 'object' ? s : {};
  const out = {
    name: cleanText(s.name, 24, ((d && d.name) || 'My Appliance').slice(0, 18) + ' Prime'),
    cost: NUM(s.cost, 1000, 1e8, Math.min(1e8, round5(((d && d.cost) || 400) * 400)), 5),
    desc: cleanText(s.desc, 200, ''),
    range: NUM(s.range, 40, 700, 200, 1),
    global: !!s.global, camo: s.camo !== false,
    income: NUM(s.income, 0, 1e8, 0, 1),
    bSpeed: NUM(s.bSpeed, 0, 300, 0, 1), bRange: NUM(s.bRange, 0, 200, 0, 1), bDmg: NUM(s.bDmg, 0, 1000, 0, 1), bPierce: NUM(s.bPierce, 0, 1000, 0, 1), bCamo: !!s.bCamo, bDisc: NUM(s.bDisc, 0, 60, 0, 1),
    attacks: (Array.isArray(s.attacks) ? s.attacks : []).slice(0, MAX_ATTACKS).map(a => cleanAttack(Object.assign({}, a, { locked:false }))),
    abilities: (Array.isArray(s.abilities) ? s.abilities : []).slice(0, MAX_ABILITIES).map(B => cleanAbility(Object.assign({}, B, { unlock:null }))),
    look: typeof lookChoiceOk === 'function' && lookChoiceOk(s.look) ? s.look : '',
    tint: /^#[0-9a-f]{6}$/i.test(s.tint || '') ? s.tint.toLowerCase() : '',
  };
  return out;
}
const pabId = (id, k) => id + '_pab' + k;
function paragonScale(deg){ return { dmg: 1 + deg * 0.02, speed: 1 + deg * 0.01, pierce: 1 + deg * 0.01, big: 1 + deg * 0.03, power: 1 + deg * 0.01, cd: Math.max(0.5, 1 - deg * 0.003), income: 1 + deg * 0.02 }; }
function paragonStats(id, P, deg){
  const k = paragonScale(deg);
  const s = { range: P.global ? 9999 : P.range, atk:{}, abilities:[] };
  if (P.global) s.global = true;
  if (P.camo) s.camo = true;
  P.attacks.forEach((A, i) => {
    const B = Object.assign({}, A, { dmg: round2(A.dmg * k.dmg), aps: Math.min(60, round2(A.aps * k.speed)), pierce: Math.round(A.pierce * k.pierce), big: Math.round(A.big * k.big) });
    s.atk[atkKey(i)] = attackFor(B);
  });
  P.abilities.forEach((B, j) => { const ab = abilitySpec(id, j, B); ab.id = pabId(id, j); ab.power = round2(k.power); ab.cd = Math.max(2, round2(B.cd * k.cd)); s.abilities.push(ab); });
  if (P.income) s.income = Math.round(P.income * k.income);
  const b = {};
  if (P.bSpeed) b.speed = 1 + P.bSpeed / 100;
  if (P.bRange) b.range = 1 + P.bRange / 100;
  if (P.bDmg) b.dmg = P.bDmg;
  if (P.bPierce) b.pierce = P.bPierce;
  if (P.bCamo) b.camo = true;
  if (P.bDisc) b.discount = P.bDisc / 100;
  if (Object.keys(b).length) s.buff = b;
  if (P.look) s.look = lookKeyOf(P.look);
  if (P.tint) s.tint = P.tint;
  s.noTarget = !Object.keys(s.atk).length;
  return s;
}
function describeParagon(P){
  if (P.desc) return P.desc;
  const fake = { attacks: P.attacks, abilities: P.abilities.map(B => Object.assign({}, B, { unlock:null })), income: P.income, bSpeed: P.bSpeed, bRange: P.bRange, bDmg: P.bDmg, bPierce: P.bPierce, bCamo: P.bCamo, bDisc: P.bDisc, camo: P.camo };
  return describeCustom(fake) + ' Grows stronger with its degree.';
}

/* bring TOWERS, TOWER_ORDER and ABILITIES in line with the designs in the profile */
/* the look a custom appliance wears with these upgrades (its last "Look becomes" change, if any) */
function customLookAt(type, up, par){
  const T = TOWERS[type];
  if (!T || !T.custom) return null;
  if (par && T.paragon && T.paragon.look) return T.paragon.look;
  let look = null;
  T.paths.forEach((P, p) => { const n = par ? 5 : ((up && up[p]) || 0); for (let i = 0; i < n && i < P.ups.length; i++) if (P.ups[i].look) look = P.ups[i].look; });
  return look;
}
function customTintAt(type, up, par){
  const T = TOWERS[type];
  if (!T || !T.custom) return null;
  if (par && T.paragon && T.paragon.tint) return T.paragon.tint;
  let tint = null;
  T.paths.forEach((P, p) => { const n = par ? 5 : ((up && up[p]) || 0); for (let i = 0; i < n && i < P.ups.length; i++) if (P.ups[i].tint) tint = P.ups[i].tint; });
  return tint;
}
/* the same, from an unsaved design */
function designLookAt(d, up, par){
  if (par && d.paragon && d.paragon.look && lookChoiceOk(d.paragon.look)) return lookKeyOf(d.paragon.look);
  let look = null;
  d.paths.forEach((P, p) => { const n = par ? 5 : ((up && up[p]) || 0); for (let i = 0; i < n && i < P.tiers.length; i++) for (const m of P.tiers[i].mods) if (m.k === 'look' && lookChoiceOk(m.e)) look = lookKeyOf(m.e); });
  return look;
}
function designTintAt(d, up, par){
  if (par && d.paragon && d.paragon.tint) return d.paragon.tint;
  let tint = null;
  d.paths.forEach((P, p) => { const n = par ? 5 : ((up && up[p]) || 0); for (let i = 0; i < n && i < P.tiers.length; i++) for (const m of P.tiers[i].mods) if (m.k === 'tint') tint = m.e; });
  return tint;
}
function syncCustomTowers(){
  if (typeof syncBodies === 'function') syncBodies();
  if (typeof registerKitchens === 'function') registerKitchens();
  const defs = (Profile && Profile.custom) || {};
  for (const id of Object.keys(TOWERS)) if (TOWERS[id].custom && !defs[id]) delete TOWERS[id];
  for (const id of Object.keys(ABILITIES)) if (ABILITIES[id].custom) delete ABILITIES[id];
  const order = [];
  for (const id of Object.keys(defs)){
    if (!/^c_[a-z0-9]{3,16}$/.test(id) || BASE_TOWER_ORDER.includes(id)){ delete defs[id]; continue; }
    try {
      const d = cleanCustom(defs[id]);
      defs[id] = d;
      TOWERS[id] = compileCustom(id, d);
      d.abilities.forEach((B, k) => { ABILITIES[abId(id, k)] = { name: B.name, desc: abilityText(B), custom: true }; });
      if (d.paragon) d.paragon.abilities.forEach((B, k) => { ABILITIES[pabId(id, k)] = { name: B.name, desc: abilityText(B) + ' Stronger with paragon degree.', custom: true }; });
      order.push(id);
    } catch (err) { console.error('custom appliance', id, err); delete TOWERS[id]; }
  }
  order.sort((a, b) => (defs[a].created || 0) - (defs[b].created || 0) || (a < b ? -1 : 1));
  TOWER_ORDER.length = 0;
  TOWER_ORDER.push(...BASE_TOWER_ORDER, ...order);
  if (typeof G !== 'undefined' && G.active){
    if (G.towers.some(t => !TOWERS[t.type])) G.towers = G.towers.filter(t => TOWERS[t.type]);
    if (G.towers.length) refreshTowers();
  }
}
function customList(){ return TOWER_ORDER.filter(isCustomTower); }
function newCustomId(){
  let id;
  do { id = 'c_' + (Date.now() % 1e9).toString(36) + Math.floor(Math.random() * 1296).toString(36); } while (TOWERS[id] || (Profile.custom || {})[id]);
  return id;
}
function saveCustomTower(design, id){
  Profile.custom = Profile.custom || {};
  if (!id && Object.keys(Profile.custom).length >= CUSTOM_MAX) return null;
  const isNew = !id || !Profile.custom[id];
  id = id || newCustomId();
  const d = cleanCustom(Object.assign({}, design, { created: isNew ? Date.now() : (Profile.custom[id].created || Date.now()) }));
  Profile.custom[id] = d;
  if (Profile.skins) delete Profile.skins[id];
  syncCustomTowers();
  saveProfile();
  return id;
}
/* removes the design; any copies standing in the current game are refunded in full */
function deleteCustomTower(id){
  let refund = 0, removed = 0;
  if (G.active){
    for (const t of G.towers) if (t.type === id){ refund += t.invested; removed++; }
    if (removed){ G.towers = G.towers.filter(t => t.type !== id); G.cash += refund; }
  }
  if (Profile.custom) delete Profile.custom[id];
  if (Profile.skins) delete Profile.skins[id];
  syncCustomTowers();
  if (G.active) refreshTowers();
  saveProfile();
  return { refund, removed };
}
/* ---------------------------------------------------------------------
   Sharing single designs as codes
   --------------------------------------------------------------------- */
const SHARE_PREFIX = 'KSA1:';
/* the workshop objects a design fires, by id */
function designObjects(d){
  const out = {};
  const grab = A => { if (A.obj && objectById(A.obj)) out[A.obj] = cleanObject(objectById(A.obj)); };
  (d.attacks || []).forEach(grab);
  if (d.paragon) (d.paragon.attacks || []).forEach(grab);
  return out;
}
/* the workshop bodies a design wears or grows into, by id */
function designBodies(d){
  const out = {};
  if (d.body && bodyById(d.body)) out[d.body] = cleanBody(bodyById(d.body));
  for (const P of d.paths) for (const T of P.tiers) for (const m of T.mods) if (m.k === 'look' && m.e.startsWith('b:') && bodyById(m.e.slice(2))) out[m.e.slice(2)] = cleanBody(bodyById(m.e.slice(2)));
  if (d.paragon && d.paragon.look && d.paragon.look.startsWith('b:') && bodyById(d.paragon.look.slice(2))) out[d.paragon.look.slice(2)] = cleanBody(bodyById(d.paragon.look.slice(2)));
  return out;
}
function designCode(d){
  const c = cleanCustom(d);
  delete c.created;
  const objs = designObjects(c);
  if (Object.keys(objs).length) c.objs = objs;   /* travels with the design */
  const bodies = designBodies(c);
  if (Object.keys(bodies).length) c.bodies = bodies;
  return SHARE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(c))));
}
/* objects that came with an imported design go into the library (ids remapped to free ones) */
function adoptDesignObjects(raw, d){
  const objs = raw && raw.objs && typeof raw.objs === 'object' ? raw.objs : null;
  if (!objs) return d;
  const map = {};
  for (const id in objs){
    const o = cleanObject(objs[id]);
    /* the same object already here (same drawing) is reused */
    const same = objectList().find(k => JSON.stringify(Object.assign({}, objectById(k), { created: 0 })) === JSON.stringify(Object.assign({}, o, { created: 0 })));
    map[id] = same || saveObject(o) || '';
  }
  const fix = A => { if (A.obj && map[A.obj] != null){ A.obj = map[A.obj]; if (!A.obj) A.shape = 'orb'; } };
  d.attacks.forEach(fix);
  if (d.paragon) d.paragon.attacks.forEach(fix);
  return d;
}
/* bodies that came with an imported design go into the library first, so the design's references to them survive cleaning */
function adoptDesignBodies(raw){
  const bodies = raw && raw.bodies && typeof raw.bodies === 'object' ? raw.bodies : null;
  if (!bodies) return raw;
  const map = {};
  for (const id in bodies){
    const b = cleanBody(bodies[id]);
    const same = bodyList().find(k => JSON.stringify(Object.assign({}, bodyById(k), { created: 0, _rev: 0 })) === JSON.stringify(Object.assign({}, b, { created: 0, _rev: 0 })));
    map[id] = same || saveBody(b) || '';
  }
  const out = JSON.parse(JSON.stringify(raw));
  if (out.body && map[out.body] != null) out.body = map[out.body];
  if (out.paragon && typeof out.paragon.look === 'string' && out.paragon.look.startsWith('b:') && map[out.paragon.look.slice(2)] != null) out.paragon.look = 'b:' + map[out.paragon.look.slice(2)];
  if (Array.isArray(out.paths)) for (const P of out.paths) if (P && Array.isArray(P.tiers)) for (const T of P.tiers) if (T && Array.isArray(T.mods)) for (const m of T.mods) if (m && m.k === 'look' && typeof m.e === 'string' && m.e.startsWith('b:') && map[m.e.slice(2)] != null) m.e = 'b:' + map[m.e.slice(2)];
  return out;
}
function designFromCode(code){
  code = String(code || '').trim().replace(/\s+/g, '');
  if (!code) throw new Error('Paste a design code first.');
  if (!code.startsWith(SHARE_PREFIX)) throw new Error('A design code starts with ' + SHARE_PREFIX);
  let obj;
  try { obj = JSON.parse(decodeURIComponent(escape(atob(code.slice(SHARE_PREFIX.length))))); }
  catch (e) { throw new Error('That code is damaged or incomplete.'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('That code has no design in it.');
  const withBodies = adoptDesignBodies(obj);
  return adoptDesignObjects(obj, cleanCustom(withBodies));
}

/* ---------------------------------------------------------------------
   Balance estimates for the builder
   --------------------------------------------------------------------- */
/* rough single-target and crowd damage per second of finished stats */
function statsDps(s){
  let single = 0, crowd = 0;
  for (const id in s.atk){
    const a = s.atk[id];
    if (!a || !a.rate) continue;
    /* the stand mixer's lightning, meringue and storms (whirlwinds and dough hooks don't do damage as such) */
    if (a.kind === 'bolt'){ const aps = 1 / Math.max(0.01, a.rate); single += a.dmg * aps; crowd += a.dmg * Math.min(Math.pow(2, a.fork.gens) - 1, 15) * aps; continue; }
    if (a.kind === 'orb'){ const aps = 1 / Math.max(0.01, a.rate), zaps = a.life / a.zap.rate; single += a.zap.dmg * zaps * aps * 0.5; crowd += a.zap.dmg * zaps * 8 * aps; continue; }
    if (a.kind === 'storm'){ const aps = 1 / Math.max(0.01, a.rate); single += a.dmg * Math.min(a.life / (a.rehit || 1), 12) * aps * 0.25; crowd += a.dmg * Math.min(a.pierce, 60) * aps; continue; }
    if (a.kind === 'tornado' || a.kind === 'vine') continue;
    /* the chess set's slides (a line or several at once) and knight leaps (a stomp, a fork and a tour) */
    if (a.kind === 'slide'){ const aps = 1 / Math.max(0.01, a.rate), L = a.cross ? (SLIDE_SETS[a.dirs] || SLIDE_SETS.rook).length : 1; single += a.dmg * L * aps; crowd += a.dmg * Math.min(a.pierce, 30) * L * aps * 0.5; continue; }
    if (a.kind === 'leap'){ const aps = (a.count || 1) / Math.max(0.01, a.rate), hops = 1 + (a.tour || 0), I = a.impact, F = a.fork; single += (I.dmg + (F ? F.dmg : 0)) * aps; crowd += (I.dmg * Math.min(I.pierce, 30) + (F ? F.dmg * F.n : 0)) * hops * aps; continue; }
    /* chopsticks: what a drop does, and a throw's landing among the pests behind it */
    if (a.kind === 'pinch'){ const aps = 1 / Math.max(0.01, a.rate), T = a.toss, n = a.n || 1; single += ((a.dmg || 0) + (T ? T.dmg * (T.self || 1) : 0)) * aps; crowd += ((a.dmg || 0) * n + (T ? T.dmg * Math.min(T.pierce, 30) * n : 0)) * aps; continue; }
    const H = a.explode || a.impact || a.mine || a;
    const per = a.kind === 'hitscan' ? (a.shots || 1) : (a.count || 1);
    const aps = 1 / Math.max(0.01, a.rate);
    const critAvg = a.crit && a.crit.mul ? 1 + (a.crit.mul - 1) / a.crit.every : 1;
    let hit = (H.dmg || 0) * critAvg;
    if (a.kind === 'grab' && a.bubble) hit += a.bubble.pop || 0;
    if (a.sticky) hit += a.sticky.dmg || 0;
    if (a.luck) hit *= 1 + (a.luck.mul - 1) * (a.luck.near + a.luck.far) / 2;
    if (H.burn) hit += H.burn.dmg * (H.burn.dur / Math.max(0.1, H.burn.tick)) * 0.5;
    const one = hit * (a.kind === 'radial' ? 1 : per) * aps;   // a ring of blades: only one or so finds any single pest
    const pierce = a.kind === 'hitscan' || a.kind === 'grab' ? 1 : Math.min(H.pierce || a.pierce || 1, 30);
    let extra = 0;
    if (a.burst) extra += a.burst.dmg * Math.min(a.burst.pierce || 1, 8);
    if (a.splash) extra += a.splash.dmg * Math.min(a.splash.pierce || 1, 8);
    if (a.zap) extra += a.zap.dmg * a.zap.chain.count;
    if (a.split) extra += a.split.dmg * a.split.count;
    if (a.bounce) extra += hit * a.bounce;
    single += one;
    crowd += (a.kind === 'radial' ? hit * Math.min(per, 8) * aps : one) * pierce + extra * per * aps;
  }
  return { single, crowd };
}
const powerOf = n => n.single + n.crowd * 0.25;
let BUILTIN_VALUE = 0;
/* the typical damage-for-the-price of the built-in attacking appliances */
function builtinValue(){
  if (BUILTIN_VALUE) return BUILTIN_VALUE;
  const vals = [];
  for (const type of BASE_TOWER_ORDER){
    const T = TOWERS[type];
    if (T.base.noTarget || !T.base.atk || !Object.keys(T.base.atk).length) continue;
    const s = computeStats({ type, up:[0, 0, 0], paragon:false, degree:0 });
    const v = powerOf(statsDps(s));
    if (v > 0) vals.push(v / T.cost);
  }
  vals.sort((a, b) => a - b);
  /* the upper middle: utility appliances (bubbles, traps, the sniper) look weak on damage alone */
  BUILTIN_VALUE = vals[Math.floor(vals.length * 0.67)] || 0.01;
  return BUILTIN_VALUE;
}
/* stats of an unsaved design at some upgrade levels (or as a paragon of a degree) */
function previewStats(d, up, deg){
  const tmp = 'c_previewz';
  const had = TOWERS[tmp];
  try {
    TOWERS[tmp] = compileCustom(tmp, cleanCustom(d));
    if (deg != null) return TOWERS[tmp].paragon ? computeStats({ type: tmp, up:[5, 5, 5], paragon:true, degree:deg }) : null;
    return computeStats({ type: tmp, up: up || [0, 0, 0], paragon:false, degree:0 });
  } finally { if (had) TOWERS[tmp] = had; else delete TOWERS[tmp]; }
}
const RATING_WORDS = [[0.6, 'Weak for its price'], [1.5, 'Fair'], [3, 'Strong'], [Infinity, 'Overpowered']];
function designRating(d){
  d = cleanCustom(d);
  const base = statsDps(previewStats(d));
  const pw = powerOf(base);
  const best = (a, b) => { const x = statsDps(previewStats(d, a)), y = statsDps(previewStats(d, b)); return powerOf(x) >= powerOf(y) ? { up: a, n: x } : { up: b, n: y }; };
  const paths = [best([5, 2, 0], [5, 0, 2]), best([2, 5, 0], [0, 5, 2]), best([2, 0, 5], [0, 2, 5])];
  const para = d.paragon ? statsDps(previewStats(d, null, 50)) : null;
  if (pw <= 0) return { attack:false, base, paths, para, payback: d.income > 0 ? Math.ceil(d.cost / d.income) : 0 };
  const ratio = (pw / d.cost) / builtinValue();
  return { attack:true, base, paths, para, ratio, word: RATING_WORDS.find(r => ratio < r[0])[1], fair: Math.min(1e6, round5(d.cost * ratio)) };
}

/* rough damage numbers for the builder's preview */
function customNumbers(d){
  let single = 0, crowd = 0, any = false;
  for (const A of d.attacks){
    if (A.locked) continue;
    any = true;
    const per = can.count(A.style) ? A.count : 1;
    const dmg = A.style === 'grab' && A.sprite === 'bubble' ? A.dmg * 2 : A.dmg;
    single += dmg * per * A.aps;
    crowd += dmg * per * A.aps * (A.style === 'snipe' || A.style === 'grab' ? 1 : Math.min(A.pierce, 40));
  }
  return any ? { single, crowd } : null;
}

/* ---------------------------------------------------------------------
   Builder helpers: tiers in the test range, edits that keep upgrade
   changes pointing at the right things, a checkup and random designs
   --------------------------------------------------------------------- */
/* set path p to tier L while keeping the crosspath rules: two paths at most, only one past tier 2 */
function tierPick(up, p, L){
  const u = [0, 1, 2].map(i => Math.max(0, Math.min(5, Math.round(Number(up && up[i]) || 0))));
  u[p] = Math.max(0, Math.min(5, L));
  if (u[p] > 2) for (let q = 0; q < 3; q++) if (q !== p) u[q] = Math.min(u[q], 2);
  const others = [0, 1, 2].filter(q => q !== p && u[q] > 0);
  if (u[p] > 0 && others.length > 1) u[u[others[0]] < u[others[1]] ? others[0] : others[1]] = 0;
  return u;
}
/* price of the appliance plus every tier up to these levels */
function tierCost(d, up){
  let c = d.cost;
  for (let p = 0; p < 3; p++) for (let i = 0; i < (up[p] || 0); i++) c += d.paths[p].tiers[i].cost;
  return c;
}
/* the numbers of each attack that is switched on in finished stats, in the design's order */
function attackStatsAt(d, s, para){
  const src = para ? (d.paragon ? d.paragon.attacks : []) : d.attacks;
  const out = [];
  src.forEach((A, i) => {
    const a = s && s.atk[atkKey(i)];
    if (!a) return;
    const H = hitPart(a, a._style);
    const scan = a.kind === 'hitscan';
    const tags = [];
    if (H.burn) tags.push('burns');
    if (H.freeze) tags.push('freezes');
    if (H.slow) tags.push('slows');
    if (H.stun || H.bigStun || H.stunBig) tags.push('stuns');
    if (H.knock) tags.push('knocks back');
    if (H.vuln) tags.push('weakens');
    if (H.strip) tags.push('scrubs armor');
    if (a.homing) tags.push('homing');
    if (a.burst || (scan && a.splash)) tags.push('bursts');
    if (a.zap) tags.push('chain ' + a.zap.chain.count);
    if (a.split) tags.push('splits ' + a.split.count);
    if (a.bounce) tags.push('bounces ' + a.bounce);
    if (a.crit && a.crit.mul) tags.push('crit ' + round2(a.crit.mul) + '×');
    if (a.zone || a.smoke) tags.push('puddle');
    out.push({ i, name: para ? (A.name || CUSTOM_STYLES[A.style].name) : attackLabel(d, i), style: a._style || A.style,
      dmg: H.dmg || 0, big: H.bonusBig || 0, aps: 1 / Math.max(0.01, a.rate), shots: scan ? (a.shots || 1) : (a.count || 1),
      pierce: scan ? 1 : (H.pierce || a.pierce || 1), radius: H !== a ? H.r : null, type: a.dtype || a.type || 'normal',
      range: s.global ? Infinity : s.range * (a.rangeMul || 1), tags });
  });
  return out;
}

/* moving and copying parts of a design; upgrade changes and unlocks follow what they point at */
function swapAttacks(d, i, j){
  if (i === j || !d.attacks[i] || !d.attacks[j]) return false;
  [d.attacks[i], d.attacks[j]] = [d.attacks[j], d.attacks[i]];
  for (const P of d.paths) for (const T of P.tiers) for (const m of T.mods){
    if (!MOD_KINDS[m.k] || !MOD_KINDS[m.k].atk) continue;
    if (m.a === i) m.a = j; else if (m.a === j) m.a = i;
  }
  return true;
}
function swapAbilities(d, i, j){
  if (i === j || !d.abilities[i] || !d.abilities[j]) return false;
  [d.abilities[i], d.abilities[j]] = [d.abilities[j], d.abilities[i]];
  for (const P of d.paths) for (const T of P.tiers) for (const m of T.mods){
    if (!MOD_KINDS[m.k] || !MOD_KINDS[m.k].ab) continue;
    if (m.ab === i) m.ab = j; else if (m.ab === j) m.ab = i;
  }
  return true;
}
function swapPaths(d, p, q){
  if (p === q || !d.paths[p] || !d.paths[q]) return false;
  [d.paths[p], d.paths[q]] = [d.paths[q], d.paths[p]];
  for (const B of d.abilities) if (B.unlock){ if (B.unlock.p === p) B.unlock.p = q; else if (B.unlock.p === q) B.unlock.p = p; }
  return true;
}
const copyName = (n, max) => n ? (n.length + 5 > max ? n.slice(0, max - 5) : n) + ' copy' : '';
/* a copy goes right after the original; later changes shift along with it */
function copyAttackAt(d, i){
  if (!d.attacks[i] || d.attacks.length >= MAX_ATTACKS) return false;
  const A = JSON.parse(JSON.stringify(d.attacks[i]));
  A.name = copyName(A.name, 20);
  d.attacks.splice(i + 1, 0, A);
  for (const P of d.paths) for (const T of P.tiers) for (const m of T.mods) if (MOD_KINDS[m.k] && MOD_KINDS[m.k].atk && m.a > i) m.a++;
  return true;
}
function copyAbilityAt(d, k){
  if (!d.abilities[k] || d.abilities.length >= MAX_ABILITIES) return false;
  const B = JSON.parse(JSON.stringify(d.abilities[k]));
  B.name = copyName(B.name, 24);
  d.abilities.splice(k + 1, 0, B);
  for (const P of d.paths) for (const T of P.tiers) for (const m of T.mods) if (MOD_KINDS[m.k] && MOD_KINDS[m.k].ab && m.ab > k) m.ab++;
  return true;
}

/* ---------------- checkup: things that stop a design working, and tips ---------------- */
const IMMUNE_NAMES = { weevil:'Weevils', pillbug:'Pillbugs', fireant:'Fire Ants', snowflea:'Snow Fleas', midnight:'Midnight Roaches' };
function listWords(a){ return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
function designCheckup(src, rating){
  const d = cleanCustom(src), out = [];
  const add = (lvl, text, go, fix) => out.push({ lvl, text, go: go || null, fix: fix || null });
  const live = d.attacks.filter(a => !a.locked);
  const support = d.income || d.bSpeed || d.bRange || d.bDmg || d.bPierce || d.bCamo || d.bDisc;
  const mods = []; d.paths.forEach((P, p) => P.tiers.forEach((T, t) => T.mods.forEach(m => mods.push(Object.assign({ p, t }, m)))));
  if (!d.attacks.length && !support && !d.abilities.length) add('bad', 'It has no attack, money, boost or ability, so it does nothing yet.', { tab:'attacks' });
  else if (d.attacks.length && !live.length && !support) add('warn', 'Every attack is locked, so it does nothing until it is upgraded.', { tab:'attacks', card:'atk-0' });
  d.attacks.forEach((A, i) => {
    const name = '“' + attackLabel(d, i) + '”';
    if (A.locked && !mods.some(m => m.k === 'unlock' && m.a === i)){
      /* offer the cheapest tier on the first path with room for one more change */
      let spot = null;
      for (const t of [0, 1, 2, 3, 4]){ for (let p = 0; p < 3 && !spot; p++) if (d.paths[p].tiers[t].mods.length < MAX_MODS) spot = { p, t }; if (spot) break; }
      add('bad', name + ' is locked and no upgrade unlocks it.', { tab:'attacks', card:'atk-' + i },
        spot ? { label:'Unlock at path ' + (spot.p + 1) + ' tier ' + (spot.t + 1), kind:'unlock', a:i, p: spot.p, t: spot.t } : null);
    }
    const boosted = mods.some(m => (m.a === i || m.a === -1) && ['dmg', 'dmgPct', 'burst', 'effect', 'chain', 'split'].includes(m.k));
    if (A.dmg <= 0 && A.effect === 'none' && A.zone === 'none' && !A.chainN && !A.splitN && !boosted) add('bad', name + ' deals no damage and has no effect.', { tab:'attacks', card:'atk-' + i });
  });
  d.paths.forEach((P, p) => {
    const pname = P.name || 'Path ' + (p + 1);
    const empty = [], cheaper = [];
    P.tiers.forEach((T, t) => {
      const ab = d.abilities.some(B => B.unlock && B.unlock.p === p && B.unlock.t === t);
      if (!T.mods.length && !ab) empty.push(t + 1);
      if (t > 0 && T.cost < P.tiers[t - 1].cost) cheaper.push(t + 1);
    });
    if (empty.length) add('warn', pname + ': tier' + (empty.length > 1 ? 's ' : ' ') + listWords(empty) + (empty.length > 1 ? ' do' : ' does') + ' nothing yet.', { tab:'upgrades', path:p, card:'tier-' + p + '-' + (empty[0] - 1) });
    if (cheaper.length) add('tip', pname + ': tier ' + cheaper[0] + ' costs less than tier ' + (cheaper[0] - 1) + '.', { tab:'upgrades', path:p, card:'tier-' + p + '-' + (cheaper[0] - 1) },
      { label:'Use standard prices', kind:'prices', p });
  });
  if (d.attacks.length){
    if (!d.camo && !mods.some(m => m.k === 'camo')){
      /* suggest tier 2 of a range path, or of the last path */
      let p = d.paths.findIndex(P => P.tiers.some(T => T.mods.some(m => m.k === 'range')));
      if (p < 0) p = 2;
      const t = [1, 2, 0, 3].find(i => d.paths[p].tiers[i].mods.length < MAX_MODS);
      add('tip', 'It can never see ghost pests. Tick “Sees ghost pests” in Basics or add it to an upgrade.', { tab:'basics', card:'camo' },
        t != null ? { label:'Add to path ' + (p + 1) + ' tier ' + (t + 1), kind:'camo', p, t } : null);
    }
    const types = new Set(d.attacks.map(a => a.type));
    for (const m of mods) if (m.k === 'type') types.add(m.e);
    const safe = Object.keys(IMMUNE_NAMES).filter(k => [...types].every(t => ENEMIES[k].immune.includes(t)));
    if (safe.length) add('tip', listWords(safe.map(k => IMMUNE_NAMES[k])) + (safe.length > 1 ? ' are' : ' is') + ' immune to ' + listWords([...types].map(t => TYPE_LABEL[t].toLowerCase())) + ' damage, which is all it deals. Another damage type on an attack or upgrade fixes that.', { tab:'attacks', card:'atk-0' });
  }
  if (d.paragon){
    const P = d.paragon;
    if (!P.attacks.length && !P.income && !P.abilities.length && !(P.bSpeed || P.bRange || P.bDmg || P.bPierce || P.bCamo || P.bDisc)) add('bad', 'The paragon has no attack, money, boost or ability.', { tab:'paragon' });
  }
  let R = rating || null;
  if (!R) try { R = designRating(d); } catch (e) { R = null; }
  if (R && R.attack){
    if (R.ratio >= 3) add('warn', 'It is overpowered for its price. About ' + money5(R.fair) + ' would be fair.', { tab:'basics', card:'cost' }, { label:'Use ' + money5(R.fair), kind:'price', v: R.fair });
    else if (R.ratio < 0.45) add('tip', 'It is weak for its price. About ' + money5(R.fair) + ' would be fair.', { tab:'basics', card:'cost' }, { label:'Use ' + money5(R.fair), kind:'price', v: Math.max(25, R.fair) });
  }
  if (d.name === 'My Appliance') add('tip', 'Give it a name of its own.', { tab:'basics', card:'name' });
  const rank = { bad:0, warn:1, tip:2 };
  return out.sort((a, b) => rank[a.lvl] - rank[b.lvl]);
}
const money5 = v => '$' + Math.round(v).toLocaleString('en-US');

/* ---------------- a whole collection as one code: every design, with the objects and bodies they use ---------------- */
const COLLECTION_PREFIX = 'KSC1:';
function collectionCode(){
  const designs = {};
  for (const id in (Profile.custom || {})){ const c = cleanCustom(Profile.custom[id]); delete c.created; const objs = designObjects(c); if (Object.keys(objs).length) c.objs = objs; const bodies = designBodies(c); if (Object.keys(bodies).length) c.bodies = bodies; designs[id] = c; }
  const objs = {}; for (const id of objectList()) objs[id] = cleanObject(objectById(id));
  const bodies = {}; for (const id of bodyList()) bodies[id] = cleanBody(bodyById(id));
  return COLLECTION_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify({ designs, objs, bodies }))));
}
/* brings every design, object and body in a collection code into the library (skipping ones already here); returns the counts */
function importCollection(code){
  code = String(code || '').trim().replace(/\s+/g, '');
  if (!code.startsWith(COLLECTION_PREFIX)) throw new Error('A collection code starts with ' + COLLECTION_PREFIX);
  let raw;
  try { raw = JSON.parse(decodeURIComponent(escape(atob(code.slice(COLLECTION_PREFIX.length))))); } catch (e) { throw new Error('That code is damaged or incomplete.'); }
  if (!raw || typeof raw !== 'object') throw new Error('That code has no collection in it.');
  const got = { designs: 0, objs: 0, bodies: 0, skipped: 0 };
  const fp = (o, drop) => JSON.stringify(Object.assign({}, o, drop));
  for (const id in (raw.objs || {})){ const o = cleanObject(raw.objs[id]); if (objectList().some(k => fp(objectById(k), { created: 0 }) === fp(o, { created: 0 }))) continue; if (saveObject(o)) got.objs++; else got.skipped++; }
  for (const id in (raw.bodies || {})){ const b = cleanBody(raw.bodies[id]); if (bodyList().some(k => fp(bodyById(k), { created: 0, _rev: 0 }) === fp(b, { created: 0, _rev: 0 }))) continue; if (saveBody(b)) got.bodies++; else got.skipped++; }
  for (const id in (raw.designs || {})){
    const d = adoptDesignObjects(raw.designs[id], cleanCustom(adoptDesignBodies(raw.designs[id])));
    const same = Object.keys(Profile.custom || {}).some(k => fp(Profile.custom[k], { created: 0 }) === fp(d, { created: 0 }));
    if (same) continue;
    if (saveCustomTower(d)) got.designs++; else got.skipped++;
  }
  return got;
}
/* ---------------- Remix: a built-in appliance as a starting design ----------------
   Its look, price, range, ghost sight and main attack are read off the real appliance; the paths keep the real
   upgrade names and prices, with changes that suit the attack. */
const REMIX_STYLE = { spray:'flame', proj:'throw', pulse:'pulse', radial:'pulse', hitscan:'snipe', beam:'beam', bolt:'beam', lob:'lob', flame:'flame', tornado:'whirl', grab:'grab', catch:'grab', trap:'spikes', slick:'lob', cloud:'lob' };
function remixDesign(type){
  const T = TOWERS[type];
  if (!T || T.custom || T.hero) return null;
  const d = defaultCustom();
  d.name = T.name + ' Remix'; d.look = type; d.faction = FACTIONS[T.faction] ? T.faction : 'custom';
  d.cost = NUM(T.cost, 25, 1e6, 400, 5);
  d.range = NUM(T.base.range, 40, 700, 150, 1); d.global = !!T.base.global; d.camo = !!T.base.camo;
  d.place = T.water ? 'water' : 'land'; d.fly = T.flyer === 'copter' || T.flyer === 'saucer' ? T.flyer : 'none';
  if (T.base.income) d.income = NUM(T.base.income, 0, 1e7, 0, 1);
  if (T.base.buff){ const b = T.base.buff; if (b.speed) d.bSpeed = Math.round((b.speed - 1) * 100); if (b.range) d.bRange = Math.round((b.range - 1) * 100); if (b.dmg) d.bDmg = b.dmg; if (b.pierce) d.bPierce = b.pierce; if (b.camo) d.bCamo = true; if (b.discount) d.bDisc = Math.round(b.discount * 100); }
  d.attacks = [];
  const atks = T.base.atk || {};
  for (const key of Object.keys(atks).slice(0, MAX_ATTACKS)){
    const a = atks[key], style = REMIX_STYLE[a.kind];
    if (!style) continue;
    const A = defaultAttack(style);
    const hit = a.explode || a.impact || a;
    A.dmg = NUM(hit.dmg != null ? hit.dmg : a.dmg, 1, 1e7, A.dmg, 0.5);
    A.aps = NUM(a.rate, 0.05, 60, A.aps, 0.05);
    A.pierce = NUM(a.pierce, 1, 5000, A.pierce, 1);
    if (can.count(style)) A.count = NUM(a.count || a.shots, 1, 20, 1, 1);
    if (a.explode && a.explode.r) A.splash = NUM(a.explode.r, 10, 400, A.splash, 1);
    if (TYPE_LABEL[hit.type || a.type]) A.type = hit.type || a.type;
    if (a.homing && can.homing(style)) A.homing = true;
    if (a.bonusBig) A.big = NUM(a.bonusBig, 0, 1e7, 0, 1);
    if (a.range && !d.global) A.rangePct = NUM(Math.round(a.range / d.range * 100), 10, 300, 100, 5);
    if (CUSTOM_SPRITES[style] && CUSTOM_SPRITES[style][a.sprite]) A.sprite = a.sprite;
    if (a.slow) { A.effect = 'slow'; A.effPow = 3; } else if (a.burn) { A.effect = 'burn'; A.effPow = 3; } else if (a.freeze) { A.effect = 'freeze'; A.effPow = 2; } else if (a.stun) { A.effect = 'stun'; A.effPow = 2; }
    d.attacks.push(cleanAttack(A));
  }
  if (!d.attacks.length) d.attacks = [cleanAttack(defaultAttack('throw'))];
  const allowed = templatesFor(d);
  const picks = ['power', 'speed', 'reach'].map(k => allowed.includes(k) ? k : allowed[0]);
  d.paths = [0, 1, 2].map(p => {
    const path = templatePath(d, picks[p]);
    const real = T.paths && T.paths[p];
    path.name = real && real.name ? real.name.slice(0, 20) : PATH_TEMPLATES[picks[p]].short;
    if (real) path.tiers.forEach((tier, i) => { const u = real.ups && real.ups[i]; if (u){ tier.name = cleanText(u.name, 24, tier.name); tier.cost = NUM(u.cost, 5, 1e8, tier.cost, 5); } });
    return path;
  });
  return cleanCustom(d);
}
/* ---------------- Surprise me: a random but sensible design ---------------- */
const RANDOM_ADJ = ['Turbo', 'Mega', 'Hyper', 'Atomic', 'Frosty', 'Blazing', 'Thunder', 'Golden', 'Shadow', 'Cosmic', 'Spicy', 'Sizzling', 'Rapid', 'Mighty', 'Royal', 'Neon', 'Crispy', 'Volcanic', 'Arctic', 'Electric', 'Sneaky', 'Grumpy', 'Lucky', 'Galactic', 'Rusty', 'Supreme'];
const RANDOM_NOUN = ['Toaster', 'Blender', 'Whisk', 'Kettle', 'Grater', 'Skillet', 'Waffle Iron', 'Fridge', 'Mixer', 'Spatula', 'Wok', 'Ladle', 'Juicer', 'Peeler', 'Oven', 'Rolling Pin', 'Colander', 'Teapot', 'Griddle', 'Slicer', 'Steamer', 'Can Opener', 'Egg Timer', 'Pepper Mill'];
const RANDOM_TYPES = { throw:['sharp', 'sharp', 'normal', 'cold'], blast:['blast', 'blast', 'heat'], lob:['blast', 'heat', 'cold'], pulse:['normal', 'heat', 'cold'], flame:['heat'], beam:['energy', 'energy', 'heat'], snipe:['normal', 'sharp'],
  gatling:['sharp', 'normal', 'heat'], boomer:['normal', 'sharp'], spikes:['sharp', 'normal'], whirl:['normal'], grab:['normal'] };
const RANDOM_EFFECTS = { cold:['freeze', 'slow', 'slow'], heat:['burn', 'burn', 'weaken'], any:['slow', 'burn', 'stun', 'knock', 'weaken', 'freeze'] };
function randomColor(rnd){
  const hue = rnd() * 360, s = 0.6 + rnd() * 0.3, l = 0.5 + rnd() * 0.12;
  const f = n => { const k = (n + hue / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}
function randomDesign(rnd){
  rnd = rnd || Math.random;
  const one = a => a[Math.floor(rnd() * a.length)];
  const chance = p => rnd() < p;
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const weighted = list => { let n = rnd() * list.reduce((s, x) => s + x[1], 0); for (const [k, w] of list){ n -= w; if (n <= 0) return k; } return list[0][0]; };
  const d = defaultCustom();
  d.look = one(BASE_TOWER_ORDER);
  /* usually named after what it looks like ("Atomic Toaster"), sometimes something else entirely */
  const own = TOWERS[d.look].name.replace(/^The /, '');
  const noun = chance(0.6) && own.length <= 15 ? own : one(RANDOM_NOUN);
  d.name = (one(RANDOM_ADJ) + ' ' + noun).slice(0, 24);
  d.skin = one(SKINS).id;
  if (chance(0.3)) d.tint = randomColor(rnd);
  d.range = int(130, 200);
  d.camo = chance(0.35);
  const n = chance(0.5) ? 1 : chance(0.7) ? 2 : 3;
  d.attacks = [];
  for (let k = 0; k < n; k++){
    const style = weighted([['throw', 4], ['gatling', 2], ['boomer', 2], ['blast', 2], ['lob', 2], ['spikes', 1], ['pulse', 2], ['flame', 1], ['beam', 1], ['snipe', 1], ['whirl', 1], ['grab', 1]]);
    const A = defaultAttack(style);
    if (CUSTOM_SPRITES[style]) A.sprite = one(Object.keys(CUSTOM_SPRITES[style]));
    A.type = one(RANDOM_TYPES[style]);
    A.dmg = Math.max(1, Math.round(A.dmg * (0.75 + rnd())));
    A.aps = round2(A.aps * (0.7 + rnd() * 0.7));
    A.pierce = Math.max(1, Math.round(A.pierce * (0.7 + rnd() * 0.8)));
    if (['throw', 'blast', 'lob', 'snipe', 'boomer', 'spikes'].includes(style) && chance(0.3)) A.count = int(2, 3);
    if (style === 'gatling' && chance(0.4)) A.count = int(2, 4);
    if (style === 'spikes' && chance(0.3)) A.mine = true;
    if (style === 'grab' && chance(0.5)) A.sprite = 'bubble';
    if (chance(0.4)){ A.effect = one(RANDOM_EFFECTS[A.type] || RANDOM_EFFECTS.any); A.effPow = int(1, 3); }
    A.color = randomColor(rnd);
    if (can.shape(style) && chance(0.45)){ A.shape = one(Object.keys(SHAPES)); A.psize = int(6, 12); A.glow = chance(0.6); A.trail = can.trail(style) && chance(0.5); }
    if (can.pattern(style) && A.count > 1 && chance(0.3)) A.pattern = one(['ring', 'spiral', 'scatter']);
    if (can.bounce(style) && chance(0.2)) A.bounce = int(1, 3);
    if (can.chain(style) && chance(0.2)) A.chainN = int(1, 3);
    if (can.split(style) && chance(0.15)) A.splitN = int(2, 5);
    if (can.crit(style) && chance(0.2)){ A.critEvery = int(3, 6); A.critMul = int(3, 8); }
    if (can.zone(style) && chance(0.3)) A.zone = one(['sticky', 'fire', 'boil', 'smoke']);
    A.locked = k > 0 && chance(0.5);
    d.attacks.push(cleanAttack(A));
  }
  const nAb = chance(0.5) ? 0 : chance(0.8) ? 1 : 2;
  const abKeys = Object.keys(ABILITY_TEMPLATES).sort(() => rnd() - 0.5).slice(0, nAb);
  d.abilities = abKeys.map(k => cleanAbility(Object.assign(JSON.parse(JSON.stringify(ABILITY_TEMPLATES[k])), { unlock: chance(0.2) ? null : { p: int(0, 2), t: int(2, 3) } })));
  if (chance(0.12)) d.income = int(4, 16) * 5;
  else if (chance(0.12)) d.bSpeed = int(2, 4) * 5;
  /* three different upgrade paths that suit it */
  const weight = { power:3, speed:3, pierce:2, multi:2, splash:2, effect:2, heavy:1, reach:2, income:0.4, buffspeed:0.4, buffrange:0.3, buffpower:0.3, discount:0.3, ability:1.2 };
  let pool = templatesFor(cleanCustom(d)).map(k => [k, weight[k] || 0.3]);
  const keys = [];
  while (keys.length < 3 && pool.length){ const k = weighted(pool); keys.push(k); pool = pool.filter(x => x[0] !== k); }
  while (keys.length < 3) keys.push('power');
  d.paths = keys.map(k => Object.assign(templatePath(cleanCustom(d), k), { name: PATH_TEMPLATES[k].short }));
  d.attacks.forEach((A, i) => {
    if (!A.locked) return;
    for (let tries = 0; tries < 6; tries++){
      const T = d.paths[int(0, 2)].tiers[int(0, 2)];
      if (T.mods.length < MAX_MODS){ T.mods.unshift({ k:'unlock', a:i }); break; }
    }
  });
  /* a flashy finish on one tier 5 */
  const flair = d.attacks.findIndex(a => can.shape(a.style));
  const T5 = d.paths[int(0, 2)].tiers[4];
  if (flair >= 0 && T5.mods.length < MAX_MODS) T5.mods.push(chance(0.5) ? { k:'shape', a: flair, e: one(Object.keys(SHAPES)) } : { k:'color', a: flair, e: randomColor(rnd) });
  /* aim for a shop-friendly price: tone the numbers down until a fair price fits the budget */
  const budget = int(60, 280) * 5;
  let c = cleanCustom(d), R = designRating(c);
  for (let k = 0; k < 4 && R.attack && R.fair > budget * 1.15; k++){
    const f = Math.sqrt(budget / R.fair);
    for (const A of d.attacks){ A.dmg = Math.max(1, round2(A.dmg * f)); A.aps = Math.max(0.3, round2(A.aps * f)); }
    c = cleanCustom(d); R = designRating(c);
  }
  d.cost = R.attack ? Math.min(5000, Math.max(150, round5(R.fair))) : (d.income ? round5(d.income * 6) : 600);
  d.paths.forEach(P => P.tiers.forEach((T, i) => { T.cost = round5(d.cost * TIER_COST[i]); }));
  c = cleanCustom(d);
  if (chance(0.35)) c.paragon = defaultParagon(c);
  return cleanCustom(c);
}
