'use strict';
/* =====================================================================
   Kitchen Siege — game data
   Logical playfield is 1100 x 680. Everything below is tuned to that.
   ===================================================================== */
const W = 1100, H = 680, PATH_W = 46;
const TYPE_LABEL = { sharp:'Sharp', blast:'Blast', heat:'Heat', cold:'Cold', energy:'Energy', normal:'Impact' };

/* ramp: how much tougher (health) and faster pests get with every wave */
const DIFFS = {
  easy:     { name:'Easy',     lives:200, cost:0.85, win:40,  start:1, cash:650, xp:1.0,  boss:0.8,  ramp:{ hp:0.004, speed:0.0012 }, medal:'Bronze Spoon', blurb:'200 lives, cheaper appliances, 40 rounds' },
  medium:   { name:'Medium',   lives:150, cost:1.0,  win:60,  start:1, cash:650, xp:1.15, boss:1.0,  ramp:{ hp:0.006, speed:0.0018 }, medal:'Silver Ladle',  blurb:'150 lives, standard prices, 60 rounds' },
  hard:     { name:'Hard',     lives:100, cost:1.08, win:80,  start:3, cash:650, xp:1.3,  boss:1.25, ramp:{ hp:0.008, speed:0.0022 }, medal:'Gold Whisk',    blurb:'100 lives, pricier, 80 rounds' },
  michelin: { name:'Michelin', lives:1,   cost:1.2,  win:100, start:6, cash:650, xp:1.6,  boss:1.5,  ramp:{ hp:0.010, speed:0.0028 }, medal:'Michelin Star', blurb:'1 life, premium prices, 100 rounds' },
};
const DIFF_ORDER = ['easy','medium','hard','michelin'];

/* ---------------- Pests ----------------
   hp: health · speed: px/s · r: hit radius · bounty: cash when cooked
   leak: lives lost if it reaches the pantry (children add theirs on top)
   big: vehicle class (resists freezing, slows and knockback)            */
const ENEMIES = {
  ant:      { name:'Ant', hp:1, speed:64, r:7, bounty:1, leak:1, tier:1, desc:'The classic pantry raider. Weak, slow, never alone.' },
  fruitfly: { name:'Fruit Fly', hp:1, speed:108, r:6, bounty:1, leak:1, tier:1, fly:true, desc:'Tiny and twitchy. Fast enough to slip past slow towers.' },
  housefly: { name:'Housefly', hp:2, speed:118, r:8, bounty:2, leak:2, tier:2, fly:true, desc:'Quick and buzzing. Takes a few hits.' },
  weevil:   { name:'Weevil', hp:4, speed:58, r:9, bounty:4, leak:3, tier:3, immune:['sharp'], desc:'Armored grain beetle. Knives and blades glance off its shell.' },
  pillbug:  { name:'Pillbug', hp:4, speed:58, r:9, bounty:4, leak:3, tier:3, immune:['blast'], desc:'Rolls into a ball and shrugs off explosions.' },
  fireant:  { name:'Fire Ant', hp:3, speed:90, r:8, bounty:3, leak:3, tier:3, immune:['heat','energy'], desc:'Unbothered by grills and microwaves.' },
  snowflea: { name:'Snow Flea', hp:3, speed:104, r:7, bounty:3, leak:3, tier:3, immune:['cold'], desc:'Lives in the freezer. Cannot be frozen or chilled.' },
  wisp:     { name:'Moth Wisp', hp:25, speed:60, r:9, bounty:6, leak:4, tier:6, fly:true, desc:'A pale wisp split off the Grave Moth. While any are about, the moth cannot be hurt.' },
  spore:    { name:'Mold Spore', hp:5, speed:62, r:8, bounty:4, leak:3, tier:3, mold:true, desc:'Fuzzy and regrowing. Burning stops it healing.' },
  roach:    { name:'Cockroach', hp:5, speed:82, r:10, bounty:5, leak:4, tier:4, desc:'Tough, fast, and hard to squash.' },
  antball:  { name:'Ant Ball', hp:14, speed:52, r:13, bounty:10, leak:2, tier:5, children:[['ant',6]], desc:'A rolling clump of ants. Bursts into six when cooked.' },
  mouse:    { name:'Mouse', hp:22, speed:72, r:12, bounty:18, leak:8, tier:6, desc:'A sturdy little thief.' },
  rat:      { name:'Rat', hp:55, speed:64, r:15, bounty:38, leak:14, tier:7, desc:'Big, tanky and determined.' },
  cheese:   { name:'Cheese Wheel', hp:220, speed:36, r:24, bounty:50, leak:20, tier:8, big:true, children:[['mouse',2],['antball',2]], desc:'Vehicle. Rolled by mice. Cracks open into mice and ant balls.' },
  basket:   { name:'Picnic Basket', hp:800, speed:30, r:30, bounty:140, leak:40, tier:9, big:true, children:[['cheese',3]], desc:'Vehicle. Hauled by an ant colony, packed with three cheese wheels.' },
  midnight: { name:'Midnight Roach', hp:450, speed:112, r:19, bounty:120, leak:60, tier:9, big:true, camo:true, immune:['sharp','blast'], children:[['roach',6]], childMods:'cm', desc:'Vehicle-class roach. Ghost, fast, immune to sharp and blast. Spills moldy ghost roaches.' },
  truck:    { name:'Food Truck', hp:4200, speed:22, r:38, bounty:380, leak:100, tier:10, big:true, children:[['basket',2],['rat',4]], desc:'Vehicle. A stolen food truck full of picnic baskets.' },
  raccoon:  { name:'Raccoon Bandit', hp:10000, speed:17, r:44, bounty:1000, leak:300, tier:11, big:true, dash:true, children:[['truck',1],['midnight',2]], desc:'Vehicle. The trash panda. Dashes forward every few seconds.' },
  ratking:  { name:'The Rat King', hp:1300, speed:15, r:40, bounty:1500, leak:0, tier:12, big:true, boss:true, children:[['rat',4]], desc:'Boss. Summons mice as it marches. Leaking it ends the game.' },
  flylord:  { name:'The Fly Lord', hp:3000, speed:20, r:40, bounty:2000, leak:0, tier:12, big:true, boss:true, fly:true, children:[['housefly',16]], desc:'Boss. Buzzes in on a cloud of flies and keeps releasing more. Below half health it goes into a frenzy.' },
  skunk:    { name:'The Skunk', hp:9000, speed:14, r:44, bounty:2500, leak:0, tier:12, big:true, boss:true, children:[['rat',6]], desc:'Boss. Sprays stink that knocks out nearby appliances for a few seconds.' },
  mole:     { name:'The Mole', hp:16000, speed:12, r:40, bounty:3500, leak:0, tier:12, big:true, boss:true, children:[['mouse',8]], desc:'Boss. Burrows under the floorboards, where nothing can hit it, and pops up further along with mice.' },
  bigcheese:{ name:'The Big Cheese', hp:30000, speed:9, r:58, bounty:5000, leak:0, tier:13, big:true, boss:true, children:[['cheese',6]], desc:'Boss. A colossal wax-sealed wheel. Every tenth of its health knocked off breaks away as cheese wheels.' },
  greatmold:{ name:'The Great Mold', hp:12000, speed:12, r:46, bounty:3000, leak:0, tier:12, big:true, boss:true, mold:true, children:[['spore',14]], desc:'Boss. Regrows and sheds spores. Burning stops its healing.' },
  queen:    { name:'The Roach Queen', hp:80000, speed:11, r:52, bounty:8000, leak:0, tier:13, big:true, boss:true, children:[['midnight',4]], desc:'Final boss. Hardens her shell twice and calls her brood.' },
  compost:  { name:'The Compost Heap', hp:16000, speed:10, r:56, bounty:3000, leak:0, tier:12, big:true, boss:true, skulls:true, children:[['antball',8],['rat',4]], desc:'Boss. A rotting mountain of scraps that flings pests far up the trail ahead of itself, and dumps a whole heap of them at every skull.' },
  moth:     { name:'The Grave Moth', hp:9000, speed:16, r:48, bounty:2500, leak:0, tier:12, big:true, boss:true, fly:true, skulls:true, children:[['wisp',6]], desc:'Boss. Drains the boosts off nearby appliances and drinks them to heal. At every skull it splits off wisps, and nothing can hurt it until they are gone.' },
  dustdevil:{ name:'The Dust Devil', hp:6500, speed:22, r:46, bounty:2500, leak:0, tier:12, big:true, boss:true, fly:true, windy:true, skulls:true, children:[['housefly',20],['fruitfly',20]], desc:'Boss. A whirlwind of crumbs. Fast, barely slowed, and at every skull it knocks out the appliances around it and spins up even faster.' },
  beetle:   { name:'The Iron Beetle', hp:15000, speed:11, r:52, bounty:3500, leak:0, tier:12, big:true, boss:true, skulls:true, children:[['weevil',10],['pillbug',10]], desc:'Boss. Plated in cast iron: its plates soak up every hit until they break, it shrugs off a different kind of attack every few seconds, and it regrows its plates at every skull.' },
  pepper:   { name:'The Ghost Pepper', hp:12000, speed:13, r:48, bounty:3000, leak:0, tier:12, big:true, boss:true, immune:['heat'], skulls:true, children:[['fireant',30]], desc:'Boss. So hot that appliances near it overheat and shut down. Heat cannot hurt it, and at every skull it flares and scorches everything around it.' },
  phantom:  { name:'The Phantom', hp:10000, speed:15, r:46, bounty:3000, leak:0, tier:12, big:true, boss:true, camo:true, skulls:true, children:[['midnight',3]], desc:'Boss. A ghost: only appliances that spot ghosts can see it. It fades out of reach every few seconds, and at every skull a wave of dread freezes the appliances near it.' },
};
const ENEMY_ORDER = ['ant','fruitfly','housefly','weevil','pillbug','fireant','snowflea','spore','roach','antball','mouse','rat','cheese','basket','midnight','truck','raccoon','ratking','flylord','greatmold','skunk','bigcheese','queen','mole','compost','moth','dustdevil','beetle','pepper','phantom','wisp'];
(function computeLeaks(){
  const leakOf = id => {
    const d = ENEMIES[id];
    if (d._leak != null) return d._leak;
    let t = d.leak || 0;
    if (d.children) for (const [c, n] of d.children) t += n * leakOf(c);
    d._leak = d.boss ? 99999 : t;
    return d._leak;
  };
  for (const id in ENEMIES) leakOf(id);
})();

/* Mastery Mode promotes every spawned pest one rank */
const PROMOTE = {
  ant:'housefly', fruitfly:'housefly', housefly:'*t3', weevil:'roach', pillbug:'roach', fireant:'roach', snowflea:'roach',
  spore:'roach', roach:'antball', antball:'mouse', mouse:'rat', rat:'cheese', cheese:'basket', basket:'truck',
  midnight:'truck', truck:'raccoon', raccoon:'raccoon', ratking:'ratking', greatmold:'greatmold', queen:'queen',
  flylord:'flylord', skunk:'skunk', mole:'mole', bigcheese:'bigcheese',
  compost:'compost', moth:'moth', dustdevil:'dustdevil', beetle:'beetle', pepper:'pepper', phantom:'phantom', wisp:'rat'
};
const T3_POOL = ['weevil','pillbug','fireant','snowflea'];

/* ---------------- Mastery ---------------- */
const RANKS = [
  { name:'Commis',          xp:0,      perk:'Tiers 1 to 3 unlocked' },
  { name:'Line Cook',       xp:400,    perk:'Tier 4 upgrades unlocked' },
  { name:'Chef de Partie',  xp:2500,   perk:'Tower and upgrades 4% cheaper' },
  { name:'Sous Chef',       xp:8000,   perk:'Tier 5 upgrades unlocked' },
  { name:'Head Chef',       xp:20000,  perk:'+6% range' },
  { name:'Executive Chef',  xp:45000,  perk:'Paragon unlocked' },
  { name:'Michelin ★',      xp:100000, perk:'Attacks 6% faster' },
  { name:'Michelin ★★',     xp:220000, perk:'Another 6% cheaper' },
  { name:'Michelin ★★★',    xp:500000, perk:'+1 pierce on every attack, golden trim' },
];
const PERKS = [
  { id:'lives',  name:'Pantry Stock',   cost:1, desc:'Start every game with 25 extra lives (not on Michelin).' },
  { id:'cash',   name:'Petty Cash',     cost:1, desc:'Start every game with $150 extra.' },
  { id:'sharp',  name:'Sharp Start',    cost:1, desc:'Knife Blocks cost $50 less.' },
  { id:'bulk',   name:'Bulk Buying',    cost:2, desc:'All towers and upgrades cost 3% less.' },
  { id:'tips',   name:'Generous Tips',  cost:2, desc:'+$25 at the end of every round.' },
  { id:'resale', name:'Resale Value',   cost:2, desc:'Sell towers for 80% instead of 70%.' },
  { id:'slow',   name:'Slow Cooker',    cost:2, desc:'Burns last 25% longer.' },
  { id:'icebox', name:'Ice Box',        cost:2, desc:'Freezes last 15% longer.' },
  { id:'quick',  name:'Quick Hands',    cost:3, desc:'Ability cooldowns are 10% shorter.' },
  { id:'second', name:'Second Helping', cost:3, desc:'Once per game, survive a fatal leak with 25 lives.' },
];

const PATH_COLORS = ['#e2383f', '#f0a12e', '#2a9d8f'];

/* ---------------- Abilities ----------------
   Listed in shop order. Hotkeys follow their slot in the ability bar.   */
const ABILITIES = {
  barrage:   { name:'Cutlery Barrage', desc:'Knife Blocks throw much faster for a few seconds.' },
  bagel:     { name:'Bagel Strike',    desc:'A giant bagel slams the toughest vehicle.' },
  blitz:     { name:'Breakfast Blitz', desc:'Toast bombs rain down on the toughest pests.' },
  tornado:   { name:'Tornado',         desc:'Blows nearby pests back along the trail.' },
  rinse:     { name:'Rinse Cycle',     desc:'Washes every pest back up the trail and scrubs off armor.' },
  vat:       { name:'Vat Dunk',        desc:'Dunks everything near the fryer in boiling oil.' },
  freeze:    { name:'Flash Freeze',    desc:'Freezes every pest on the map.' },
  sugar:     { name:'Sugar Rush',      desc:'Soda Siphons fire much faster.' },
  supply:    { name:'Supply Drop',     desc:'A crate of cash lands next to the siphon.' },
  delivery:  { name:'Delivery Rush',   desc:'Pizza Ovens bake much faster for a few seconds.' },
  pastarain: { name:'Pasta Rain',      desc:'Ravioli mines rain down along the trail.' },
  storm:     { name:'Popcorn Storm',   desc:'A storm of homing popcorn rockets slams the toughest pests.' },
  galley:    { name:'Galley Hook',     desc:'Hooks the toughest vehicles and drags them off the map. Bosses lose a chunk of health instead.' },
  mustard:   { name:'First Strike',    desc:'A giant mustard missile slams the toughest vehicle.' },
  chinook:   { name:'Chinook Drop',    desc:'A supply copter drops a crate of cash and extra lives.' },
  tactical:  { name:'Tactical Drop',   desc:'A commando lands beside the trail and fires at nearby pests for 15 seconds.' },
  zest:      { name:'Ground Zest',     desc:'A zesty blast hits every pest on screen.' },
  tsar:      { name:'Tsar Bonbon',     desc:'An enormous bonbon bomb hits every pest on screen and stuns them.' },
  rush:      { name:'Caffeine Rush',   desc:'Every tower attacks twice as fast.' },
  bird:      { name:'Fire Bird',       desc:'A bird of flame circles the grill, raining fireballs on pests.' },
  spill:     { name:'Grease Fire',     desc:'Hot oil coats every pest on screen: battered, soaked and seared.' },
  pastastorm:{ name:'Spaghetti Storm', desc:'Pasta nests drop all along the trail.' },
  kernel:    { name:'Kernel Blast',    desc:'A giant kernel bursts over the microwave, cooking almost everything near it.' },
  steamup:   { name:'Full Steam',      desc:'Towers near the espresso machine attack much faster.' },
  sabotage:  { name:'Soy Sabotage',    desc:'Every pest on the map moves at half speed for a while.' },
  takeaim:   { name:'Take Aim',        desc:'Nearby appliances gain range and spot ghost pests for a while.' },
  tonic:     { name:'Transforming Tonic', desc:'The saucepan becomes a sauce monster with a scalding beam.' },
  overclock: { name:'Overclock',       desc:'The strongest appliance nearby attacks much faster for a minute.' },
  roar:      { name:'Roar',            desc:'A mighty roar stuns pests all around the basket.' },
  icejet:    { name:'Ice Jet',         desc:'Bouncing balls of ice hunt the toughest pests and freeze what they hit.' },
  punchdown: { name:'Punch Down',      desc:'Dough hooks rise all over the kitchen, grab a crowd of small pests and knead them flat, leaving chocolate spikes behind.' },
  castle:    { name:'Castle Crush',    desc:'A giant rook rolls down every trail from the pantry, crushing every pest in its way and shoving it back.' },
  charge:    { name:'Cavalry Charge',  desc:'A troop of knights gallops up every trail from the pantry, trampling every pest in its way.' },
  flurry:    { name:'Flurry',          desc:'The chopsticks move in a blur: every attack much faster for a few seconds.' },
  fullspin:  { name:'Full Spin',       desc:'The Lazy Susan spins flat out: whatever rides on it attacks much faster for a few seconds.' },
  gravyflood:{ name:'Gravy Flood',     desc:'A wave of hot gravy floods out from the Lazy Susan, scalding pests and slowing them to a crawl.' },
  /* paragon abilities */
  bladestorm:{ name:'Blade Storm',       desc:'The Thousand Cuts throws everything much faster and flings slicer wheels in every direction.' },
  brioche:   { name:'Ballistic Brioche', desc:'A giant brioche missile hunts the toughest pest, leaving a trail of explosions.' },
  liquefy:   { name:'Liquefy',           desc:'Blades fly much farther and a ring of boiling soup scalds everything nearby.' },
  meteor:    { name:'Molten Meteor',     desc:'A molten meteor slams the toughest pest and bursts into homing fireballs.' },
  rushhour:  { name:'Rush Hour',         desc:'The dish pit works much faster, winding down over 30 seconds.' },
  pyre:      { name:'Phoenix Pyre',      desc:'The fire bird bursts, burning everything near the grill and raising charred food trucks.' },
  inferno:   { name:'Inferno Form',      desc:'The grill merges with its fire bird and pours out flame while its fuel lasts.' },
  deepfry:   { name:'Deep Fry',          desc:'Every battered pest on screen gets dunked: the more layers of batter, the harder it hits.' },
  longnight: { name:'Long Night',        desc:'Night falls: every pest freezes solid and the kitchen stays bitterly cold.' },
  meltdown:  { name:'Meltdown',          desc:'Vents the reactor’s heat as a radiation wave across the whole kitchen.' },
  supernova: { name:'Supernova',         desc:'A supercork blasts in a straight line across the kitchen through the toughest pest.' },
  avalanche: { name:'Pizza Avalanche',   desc:'Pizzas rain down all along the trail and stun every pest.' },
  overmix:   { name:'Overmix',           desc:'Switches overmixing on or off: more reach, tighter aim and damage that grows with the crowd, paid for in cash every second, and no income while it lasts.' },
  boil:      { name:'Rolling Boil',      desc:'The Pantheon makes pasta four times as fast. Once per round.' },
  pastageddon:{ name:'Pastageddon',      desc:'Giant ravioli mines line every trail. Using it again sets the old ones off.' },
  reaper:    { name:'Reaper Mode',       desc:'Top heat: the mill fires twice as fast and every peppercorn bursts into flame.' },
  leviathan: { name:'Leviathan Hook',    desc:'A giant hook drags the toughest vehicle off the map, raccoons included. Twice per round.' },
  finale:    { name:'Final Course',      desc:'After a 15 second countdown, three giant mustard missiles flatten the kitchen.' },
  strafe:    { name:'Strafing Run',      desc:'Every escort copter strafes the whole trail, then the wing rebuilds.' },
  bombers:   { name:'Carpet Bombing',    desc:'Three bomber saucers carpet-bomb a line across the kitchen and empty the hold.' },
  refill:    { name:'Bottomless Refill', desc:'Every blend at once, for every appliance on the map.' },
  marketday: { name:'Market Day',        desc:'Sells every loaf in the vault at double the market price.' },
  smokebomb: { name:'Smoke Bomb',        desc:'Every pest on screen is stunned, loses its ghost cloak and takes extra damage for a while.' },
  shadowstrike:{ name:'Shadow Strike',   desc:'Every shadow clone strikes one of the toughest pests, then the band gathers again.' },
  fanhammer: { name:'Fan the Hammer',    desc:'The sheriff fires everything much faster for a few seconds.' },
  highnoon:  { name:'High Noon',         desc:'Every Wanted pest takes a golden shot, harder for every notch on the sheriff’s belt.' },
  transmute: { name:'Transmute',         desc:'Every vehicle on screen shrinks down a size.' },
  elixir:    { name:'Elixir of Life',    desc:'Every appliance on the map drinks a powerful brew for a while.' },
  overdrive: { name:'Overdrive',         desc:'Every appliance on the map is overclocked and gets a permanent boost.' },
  megabot:   { name:'Mega Sentry',       desc:'A giant sentry rolls out at the front of the pack and fires rockets for a while.' },
  stampede:  { name:'Stampede',          desc:'The menagerie charges up every trail, trampling pests and pushing them back.' },
  feast:     { name:'Feeding Time',      desc:'The great bird carries off the toughest vehicles on screen.' },
  tsunami:   { name:'Tsunami',           desc:'A great wave washes every pest back up the trail and freezes it.' },
  kraken:    { name:'Release the Kraken', desc:'The kraken drags the toughest vehicles under for good.' },
  checkmate: { name:'Checkmate',         desc:'The toughest vehicles on screen are checkmated, off the board for good. A boss is put in check instead.' },
  stalemate: { name:'Stalemate',         desc:'Nobody can move: every pest on the map stops where it stands for a few seconds.' },
  grandpinch:{ name:'Grand Pinch',       desc:'The toughest pests on screen, vehicles included, are lifted and carried back to the entrance. Bosses are held for a moment.' },
};
/* ability hotkeys, in bar order (H, J, K and L pick the water and air appliances) */
const AB_KEYS = ['Z','X','C','V','B','N','M','1','2','3','4','5','6','7','8','9'];

/* how the air appliances can fly; `need` names a stat an upgrade must unlock first */
const FLY_MODES = {
  copter: [
    { id:'follow', name:'Follow', tip:'Flies to wherever you point (patrols by itself when you are not pointing)' },
    { id:'patrol', name:'Patrol', tip:'Guards the area around its pad, flying to the pest it would target' },
    { id:'hover',  name:'Hover',  tip:'Stays over its pad' },
    { id:'chase',  name:'Pursuit', tip:'Hunts pests anywhere on the map', need:'chase', lock:'Pursuit (path 1, tier 2)' },
  ],
  saucer: [
    { id:'circle', name:'Circle', tip:'Loops around its pad' },
    { id:'eight',  name:'Figure 8', tip:'Flies a figure eight across its pad' },
    { id:'wide',   name:'Wide', tip:'A huge loop around the whole kitchen' },
    { id:'tight',  name:'Tight', tip:'A small, fast loop right over its pad', need:'tight', lock:'Tight Loop (path 3, tier 2)' },
  ],
};

/* ---------------- Factions ----------------
   Every appliance belongs to one. They group and filter the shop and the mastery pages. */
const FACTIONS = {
  prep:    { name:'Prep Station',   color:'#d9533c', blurb:'Counter-top basics: cheap, quick and dependable.' },
  line:    { name:'Hot & Cold',     color:'#e0951a', blurb:'Stations that grill, fry, zap and freeze.' },
  special: { name:'Specialty',      color:'#a8508f', blurb:'Clever gadgets with a long reach: corks, pizzas, whirlwinds, pasta and pepper.' },
  fleet:   { name:'Fleet',          color:'#2f7fc8', blurb:'Boats and subs on the water, copters and saucers in the air.' },
  support: { name:'Front of House', color:'#2a9d8f', blurb:'Support appliances that speed up the kitchen and bring in cash.' },
  custom:  { name:'Custom',         color:'#7b5cff', blurb:'Your own designs from the tower builder.' },
};
const FACTION_ORDER = ['prep', 'line', 'special', 'fleet', 'support', 'custom'];
function factionOf(type){ const T = TOWERS[type]; return T && FACTIONS[T.faction] ? T.faction : 'custom'; }

/* ---------------- Towers ----------------
   Each upgrade's apply() edits a fresh copy of the tower's stats.
   Paths apply in order (path 1, then 2, then 3), so crosspaths stack.  */
function pk(deg){ return { k: 1 + deg * 0.01, dd: Math.floor(deg / 10), big: deg >= 100 ? 1.5 : 1 }; }

const TOWERS = {
  /* ------------------------------------------------------------ KNIFE */
  knife: {
    name:'Knife Block', cost:200, size:17, hot:'Q', faction:'prep',
    blurb:'Turns to face pests and throws knives at them. Cheap and dependable.',
    base:{ range:140, atk:{ main:{ kind:'proj', rate:0.95, dmg:1, pierce:2, speed:620, size:6, type:'sharp', sprite:'knife', count:1, spread:0.18 } } },
    paths:[
      { name:'Edge', ups:[
        { name:'Honed Edge', cost:140, desc:'Knives slice through 1 more pest.', apply:s=>{ s.atk.main.pierce += 1; } },
        { name:'Whetstone', cost:200, desc:'+2 pierce and knives fly farther.', apply:s=>{ const a=s.atk.main; a.pierce += 2; a.lifeMul = (a.lifeMul||1) * 1.3; } },
        { name:'Pizza Cutter', cost:320, desc:'Throws a rolling pizza cutter: +1 damage and it slices 11 more pests.', apply:s=>{ const a=s.atk.main; a.sprite='cutter'; a.pierce += 11; a.dmg += 1; a.speed = 340; a.size = 11; a.rate *= 1.15; a.lifeMul = (a.lifeMul||1) * 1.5; a.spin = true; } },
        { name:'Mezzaluna', cost:1800, desc:'A rocking double blade. Cuts hard shells, +2 damage, +4 to vehicles, 34 more pierce.', apply:s=>{ const a=s.atk.main; a.sprite='mezzaluna'; a.pierce += 34; a.dmg += 2; a.type='normal'; a.bonusBig = (a.bonusBig||0) + 4; a.size = 16; a.speed = 310; } },
        { name:'Deli Slicer', cost:15000, desc:'A giant slicer blade: +8 damage, 150 more pierce, +16 to vehicles. It splits into 2 mezzalunas, and each of those into 3 more.', apply:s=>{ const a=s.atk.main; a.sprite='slicer'; a.pierce += 150; a.dmg += 8; a.bonusBig += 16; a.size = 24; a.lifeMul *= 1.2; a.split = { count:2, sprite:'mezzaluna', dmg:4, pierce:50, bonusBig:4, size:15, speed:300, type:'normal', spin:true, life:0.8, split:{ count:3, sprite:'mezzaluna', dmg:3, pierce:30, bonusBig:4, size:12, speed:280, type:'normal', spin:true, life:0.6 } }; } },
      ]},
      { name:'Volley', ups:[
        { name:'Quick Wrist', cost:100, desc:'Throws 15% faster.', apply:s=>{ s.atk.main.rate /= 1.15; } },
        { name:"Juggler's Rhythm", cost:190, desc:'Throws 33% faster.', apply:s=>{ s.atk.main.rate /= 1.33; } },
        { name:'Knife Fan', cost:450, desc:'Throws 3 knives in a fan.', apply:s=>{ s.atk.main.count = 3; s.atk.main.spread = 0.2; } },
        { name:'Cutlery Barrage', cost:7200, desc:'Throws twice as fast. Ability: it and up to 9 other Knife Blocks nearby throw 8× as fast for 15s.', apply:s=>{ s.atk.main.rate /= 2; s.abilities.push({ id:'barrage', cd:50, dur:15, mult:8, max:10, global:false }); } },
        { name:'Silverware Tempest', cost:45000, desc:'Silver knives 5× as fast again, with +3 damage and +3 pierce, that cut through shells. Barrage reaches 20 Knife Blocks anywhere on the map.', apply:s=>{ const a=s.atk.main; a.rate /= 5; a.dmg += 3; a.pierce += 3; a.type='normal'; if (a.sprite === 'knife' || a.sprite === 'skewer') a.sprite = 'goldknife'; const ab = s.abilities.find(x=>x.id==='barrage'); ab.max = 20; ab.global = true; } },
      ]},
      { name:'Precision', ups:[
        { name:'Long Reach', cost:90, desc:'+25% range.', apply:s=>{ s.range *= 1.25; } },
        { name:'Keen Eye', cost:200, desc:'+20% range and spots ghost pests.', apply:s=>{ s.range *= 1.2; s.camo = true; } },
        { name:'Kebab Skewers', cost:575, desc:'Heavy skewers: +2 damage, +1 pierce, faster in flight.', apply:s=>{ const a=s.atk.main; if (a.sprite === 'knife') a.sprite = 'skewer'; a.dmg += 2; a.pierce += 1; a.speed *= 1.5; s.range *= 1.1; } },
        { name:"Butcher's Mark", cost:2050, desc:'Every 6th throw is a cleaver for 25 damage (double to vehicles). Throws 20% faster.', apply:s=>{ const a=s.atk.main; a.crit = { every:6, dmg:25, bigMult:2, sprite:'cleaver' }; a.rate /= 1.2; } },
        { name:'Master Butcher', cost:21500, desc:'A cleaver every 3rd throw for 120. +5 damage, +4 pierce, cuts shells, 40% faster.', apply:s=>{ const a=s.atk.main; a.crit = { every:3, dmg:120, bigMult:2, sprite:'cleaver' }; a.dmg += 5; a.pierce += 4; a.type='normal'; a.rate /= 1.4; s.range *= 1.15; } },
      ]},
    ],
    paragon:{ name:'The Thousand Cuts', cost:200000, desc:'Homing gold knives and giant slicer wheels that split twice, all rebounding off the kitchen walls and cutting harder after every bounce.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); const mezz = { count:4, sprite:'mezzaluna', dmg:30+dd*3, pierce:70, bonusBig:Math.round(80*big), size:15, speed:330, type:'normal', spin:true, life:1, wall:1, wallDmg:8+dd }; return { range:230, camo:true, atk:{
        main:{ kind:'proj', rate:0.09/k, dmg:18+dd*2, pierce:Math.round(30*k), speed:900, size:7, type:'normal', sprite:'goldknife', count:6, spread:0.22, homing:true, bonusBig:Math.round((40+dd*6)*big), lifeMul:1.8, wall:2, wallDmg:6+dd, crit:{ every:5, dmg:Math.round((500+dd*60)*big), bigMult:2, sprite:'cleaver' } },
        wheel:{ kind:'proj', rate:1.1/k, count:2, spread:0.3, dmg:60+dd*5, pierce:Math.round(360*k), speed:330, size:28, type:'normal', sprite:'slicer', spin:true, bonusBig:Math.round((240+dd*25)*big), lifeMul:2.4, wall:3, wallDmg:20+dd*2, halfSplit:mezz, split:mezz },
        storm:{ kind:'proj', need:'storm', rate:1.05, count:6, pattern:'ring', dmg:90+dd*8, pierce:Math.round(300*k), speed:380, size:22, type:'normal', sprite:'slicer', spin:true, bonusBig:Math.round((320+dd*30)*big), lifeMul:2, wall:3, wallDmg:20+dd*2 },
      }, abilities:[{ id:'bladestorm', cd:40, dur:8, mult:3 }] }; } },
  },

  /* ---------------------------------------------------------- TOASTER */
  toaster: {
    name:'Toaster', cost:375, size:18, hot:'W', faction:'prep',
    blurb:'Turns to face pests and launches toast that explodes on impact. Great on crowds; pillbugs shrug it off.',
    base:{ range:175, atk:{ main:{ kind:'proj', rate:1.5, dmg:0, pierce:1, speed:430, size:9, type:'blast', sprite:'toast', explode:{ r:44, dmg:1, pierce:22, type:'blast' }, expireExplode:true } } },
    paths:[
      { name:'Bigger Batches', ups:[
        { name:'Thick Slice', cost:250, desc:'Bigger blasts that hit 8 more pests.', apply:s=>{ const e=s.atk.main.explode; e.r *= 1.25; e.pierce += 8; } },
        { name:'Texas Toast', cost:650, desc:'+1 blast damage.', apply:s=>{ const e=s.atk.main.explode; e.dmg += 1; e.pierce += 6; } },
        { name:'Sourdough Boulder', cost:1100, desc:'Dense sourdough: much bigger blasts, +2 damage, 20 more pests per blast.', apply:s=>{ const a=s.atk.main, e=a.explode; a.sprite='boulder'; a.size = 12; e.r *= 1.45; e.dmg += 2; e.pierce += 20; } },
        { name:'Stale Impact', cost:2800, desc:'Rock-hard bread: +3 damage and stuns pests for 0.6s (vehicles 0.2s).', apply:s=>{ const e=s.atk.main.explode; e.stun = 0.6; e.stunBig = 0.2; e.dmg += 3; } },
        { name:'Breadquake', cost:55000, desc:'Earth-shaking loaves: +25 damage, +100 to vehicles, 1.2s stuns, 80 more pests per blast.', apply:s=>{ const a=s.atk.main, e=a.explode; e.dmg += 25; e.r *= 1.35; e.stun = 1.2; e.stunBig = 0.5; e.bonusBig = (e.bonusBig||0) + 100; e.pierce += 80; a.sprite='boulder'; a.size = 15; } },
      ]},
      { name:'Rapid Pop', ups:[
        { name:'Quick Pop', cost:250, desc:'Pops toast 20% faster.', apply:s=>{ s.atk.main.rate /= 1.2; } },
        { name:'Hair Trigger', cost:400, desc:'25% faster, quicker toast, +10% range.', apply:s=>{ s.atk.main.rate /= 1.25; s.atk.main.speed *= 1.3; s.range *= 1.1; } },
        { name:'Bagel Buster', cost:1000, desc:'Bagels deal +12 damage to vehicles.', apply:s=>{ const a=s.atk.main; if (a.sprite === 'toast') a.sprite = 'bagel'; a.explode.bonusBig = (a.explode.bonusBig||0) + 12; } },
        { name:'Bagel Assassin', cost:3450, desc:'+30 to vehicles. Ability: Bagel Strike hits the toughest vehicle for 1,000.', apply:s=>{ s.atk.main.explode.bonusBig += 18; s.abilities.push({ id:'bagel', cd:30, dmg:1000 }); } },
        { name:'Toastinator', cost:26000, desc:'+100 to vehicles and 30% faster. Bagel Strike deals 5,000 every 12s.', apply:s=>{ s.atk.main.explode.bonusBig += 70; s.atk.main.rate /= 1.3; const ab = s.abilities.find(x=>x.id==='bagel'); ab.dmg = 5000; ab.cd = 12; } },
      ]},
      { name:'Clusters', ups:[
        { name:'Longer Cord', cost:200, desc:'+20% range.', apply:s=>{ s.range *= 1.2; } },
        { name:'Crumb Frags', cost:300, desc:'Each blast scatters 8 sharp crumbs.', apply:s=>{ s.atk.main.frag = { count:8, dmg:1, pierce:1, speed:380, life:0.28, type:'sharp', sprite:'crumb' }; } },
        { name:'Waffle Clusters', cost:700, desc:'Blasts scatter 8 mini waffles that explode too.', apply:s=>{ const a=s.atk.main; a.cluster = { count:8, r:28, dmg:1, pierce:10, spread:46, depth:1 }; if (a.sprite === 'toast') a.sprite = 'waffle'; } },
        { name:'Recursive Waffles', cost:2500, desc:'Mini waffles scatter mini waffles. +1 cluster damage.', apply:s=>{ const c=s.atk.main.cluster; c.depth = 2; c.dmg += 1; } },
        { name:'Breakfast Blitz', cost:30000, desc:'Ability: 40 toast bombs (300 each) rain on the toughest pests. Leaks trigger a toast storm that wipes small pests (every 20s).', apply:s=>{ const a=s.atk.main; a.cluster.dmg += 2; a.explode.dmg += 2; s.abilities.push({ id:'blitz', cd:40, bombs:40, dmg:300, r:80 }); s.leakGuard = true; } },
      ]},
    ],
    paragon:{ name:'The Toastpocalypse', cost:240000, desc:'Homing boulder loaves that burst into waffle clusters, bagels that flatten vehicles, and a toast storm that wipes the screen when a pest tries to sneak into the pantry.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:240, camo:true, atk:{
        main:{ kind:'proj', rate:0.32/k, dmg:0, pierce:1, speed:520, size:16, type:'normal', sprite:'boulder', homing:true, lifeMul:1.6, expireExplode:true, explode:{ r:110, dmg:55+dd*6, pierce:Math.round(220*k), type:'normal', stun:0.9, stunBig:0.35, knock:20, bonusBig:Math.round((300+dd*40)*big) }, cluster:{ count:10, r:46, dmg:18+dd*2, pierce:40, spread:80, depth:2 } },
        bagel:{ kind:'proj', rate:0.55/k, dmg:0, pierce:1, speed:700, size:10, type:'normal', sprite:'bagel', homing:true, targetBig:true, lifeMul:2.5, explode:{ r:45, dmg:40, pierce:20, type:'normal', bonusBig:Math.round((1200+dd*150)*big) } },
      }, toastStorm:{ cd:Math.round(120 - deg * 0.4), boss:Math.round((20000+dd*2000)*big) },
      abilities:[{ id:'brioche', cd:30, dmg:Math.round((150000+dd*15000)*big), trail:{ r:90, dmg:300+dd*30, bonusBig:Math.round((6000+dd*600)*big), pierce:60, knock:30, bigKnock:12, type:'normal' } }] }; } },
  },

  /* ---------------------------------------------------------- BLENDER */
  blender: {
    name:'Blender', cost:260, size:17, hot:'E', faction:'prep',
    blurb:'Flings 8 spinning blades out in every direction at once. Short range, but whatever walks past gets sliced.',
    base:{ range:101, atk:{ main:{ kind:'radial', fixed:true, rate:1.12, count:8, dmg:1, pierce:1, speed:560, type:'sharp', sprite:'shard', size:5 } } },
    paths:[
      { name:'Turbo', ups:[
        { name:'Turbo Motor', cost:150, desc:'Spins 33% faster.', apply:s=>{ s.atk.main.rate /= 1.33; } },
        { name:'Overclock', cost:300, desc:'Spins 50% faster again.', apply:s=>{ s.atk.main.rate /= 1.5; } },
        { name:'Hot Soup', cost:600, desc:'Friction heats the jar: blades deal +1 damage, cut through shells and set pests burning.', apply:s=>{ const a=s.atk.main; a.dmg += 1; a.type='normal'; a.burn = { dmg:1, tick:0.5, dur:1.5 }; a.hot = true; } },
        { name:'Industrial Jar', cost:3500, desc:'The blades become a ring of boiling soup that scalds up to 60 pests around it for 3 every spin. 15% more reach.', apply:s=>{ const a=s.atk.main; s.atk.main = { kind:'pulse', rate:a.rate, dmg:a.dmg + 1, pierce:60, type:'normal', hot:true, burn:{ dmg:2, tick:0.5, dur:2 }, vfx:'ring', color:'#ff9a52', knock:a.knock }; s.range *= 1.15; } },
        { name:'Black Hole Blend', cost:45500, desc:'A scalding vortex every 0.15s: +6 damage, +10 to vehicles, 50 more pests. Hurls a molten blade at the toughest pest every 1.3s: a blast of 60, or 600 to vehicles.', apply:s=>{ const a=s.atk.main; a.rate = Math.min(a.rate, 0.15); a.dmg += 6; a.pierce += 50; a.bonusBig = (a.bonusBig||0) + 10; s.range *= 1.15; a.vfx = 'hole'; s.atk.meteor = { kind:'proj', rate:1.3, dmg:0, pierce:1, speed:480, size:10, type:'normal', sprite:'flare', homing:true, targetBig:true, lifeMul:3, rangeMul:2.5, explode:{ r:46, dmg:60, pierce:20, type:'normal', bonusBig:540, burn:{ dmg:20, tick:0.5, dur:2 } }, expireExplode:true }; } },
      ]},
      { name:'Shrapnel', ups:[
        { name:'Loose Lid', cost:110, desc:'Flings 10 blades a spin (a soup ring scalds for 1 more).', apply:s=>{ const a=s.atk.main; if (a.kind === 'radial') a.count = 10; else a.dmg += 1; } },
        { name:'Splinter Lid', cost:110, desc:'Flings 12 blades a spin (a soup ring scalds for 1 more).', apply:s=>{ const a=s.atk.main; if (a.kind === 'radial') a.count = 12; else a.dmg += 1; } },
        { name:'Shard Spray', cost:450, desc:'Flings 16 blades a spin, each hitting 1 more pest.', apply:s=>{ const a=s.atk.main; if (a.kind === 'radial') a.count = 16; a.pierce += 1; } },
        { name:'Shrapnel Cyclone', cost:3200, desc:'Spins three times as fast.', apply:s=>{ s.atk.main.rate /= 3; } },
        { name:'Maelstrom', cost:20000, desc:'32 blades a spin, each with +2 damage and 3 more pests, 30% more reach, and 40% faster again.', apply:s=>{ const a=s.atk.main; if (a.kind === 'radial') a.count = 32; a.dmg += 2; a.pierce += 3; s.range *= 1.3; a.rate /= 1.4; } },
      ]},
      { name:'Vortex', ups:[
        { name:'Wide Jar', cost:100, desc:'+20% range.', apply:s=>{ s.range *= 1.2; } },
        { name:'Pulse Mode', cost:225, desc:'+15% range. Blades hit 1 more pest and knock pests back.', apply:s=>{ const a=s.atk.main; s.range *= 1.15; a.pierce += 1; a.knock = 6; } },
        { name:'Whirlpool', cost:550, desc:'Blades hit 3 more pests, and a constant vortex slows pests in range by 30%.', apply:s=>{ s.aura = { slow:0.7, bigSlow:1 }; const a=s.atk.main; a.pierce += 3; a.knock = 10; } },
        { name:'Tornado Jar', cost:2700, desc:'The vortex slows 50%. Ability: Tornado blows nearby pests back along the trail.', apply:s=>{ s.aura.slow = 0.5; s.abilities.push({ id:'tornado', cd:40, push:260, bigPush:0, dmg:20 }); } },
        { name:'Category 5', cost:15000, desc:'Tornado every 20s for 200 damage, shoving vehicles too. The vortex slows vehicles, and blades deal +4.', apply:s=>{ s.aura.slow = 0.4; s.aura.bigSlow = 0.75; s.atk.main.dmg += 4; const ab = s.abilities.find(x=>x.id==='tornado'); ab.cd = 20; ab.push = 400; ab.bigPush = 120; ab.dmg = 200; } },
      ]},
    ],
    paragon:{ name:'The Singularity', cost:230000, desc:'A blender that spins up as it shreds: the faster it goes the harder it hits, and at full speed it drags pests back into the vortex.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:150, camo:true, atk:{
        main:{ kind:'pulse', rate:0.1/k, dmg:28+dd*3, pierce:Math.round(220*k), type:'normal', vfx:'hole', bonusBig:Math.round((70+dd*8)*big), burn:{ dmg:20, tick:0.5, dur:2 }, rpm:true },
        spray:{ kind:'radial', rate:0.45/k, count:24, dmg:14+dd, pierce:10, speed:520, range:270, type:'normal', sprite:'shard', spiral:true, farMul:{ id:'liquefy', mul:2.5 } },
        soup:{ kind:'pulse', need:'liquefy', rate:1, dmg:250+dd*25, bonusBoss:250, pierce:80, rangeAbs:200, type:'normal', hot:true, burn:{ dmg:30, tick:0.5, dur:2 }, vfx:'ring', color:'#ff9a52' },
      }, aura:{ slow:0.3, bigSlow:0.55 },
      abilities:[{ id:'liquefy', cd:20, dur:9 }, { id:'meteor', cd:60, dmg:Math.round((60000+dd*6000)*big), small:6000+dd*600, r:240, pierce:500, balls:32, ballDmg:900+dd*90 }] }; } },
  },

  /* ------------------------------------------------------- DISHWASHER */
  dish: {
    name:'Dishwasher', cost:315, size:20, hot:'R', faction:'prep',
    blurb:'Turns to face pests and spins plates out in a loop. They slice through pests and fly back like boomerangs.',
    base:{ range:188, atk:{ main:{ kind:'proj', boomerang:true, rate:1.2, dmg:1, pierce:4, speed:380, size:8, type:'normal', sprite:'plate', count:1, spin:true } } },
    paths:[
      { name:'Plate Rack', ups:[
        { name:'Stacked Plates', cost:200, desc:'Plates hit 4 more pests.', apply:s=>{ s.atk.main.pierce += 4; } },
        { name:'Fine China', cost:280, desc:'Bigger, faster plates that hit 4 more pests.', apply:s=>{ const a=s.atk.main; a.speed *= 1.25; a.pierce += 4; a.size = 9; } },
        { name:'Serving Platters', cost:600, desc:'Platters ricochet from pest to pest, up to 6 times, with +1 damage and 4 more pierce.', apply:s=>{ const a=s.atk.main; a.sprite = 'platter'; a.dmg += 1; a.pierce += 4; a.bounce = 6; a.size = 12; } },
        { name:'Dish Rack Barrage', cost:2000, desc:'Throws 2 platters at once with +2 damage and 8 more pierce, and they ricochet 10 times.', apply:s=>{ const a=s.atk.main; a.count = 2; a.dmg += 2; a.pierce += 8; a.bounce = 10; } },
        { name:'Banquet Service', cost:32500, desc:'3 silver platters orbit the dishwasher, shredding pests close by for 20 (+50 to vehicles) ten times a second. Throws 4 platters with +10 damage, 30 more pierce and +20 to vehicles.', apply:s=>{ const a=s.atk.main; a.count = 4; a.dmg += 10; a.pierce += 30; a.bonusBig = (a.bonusBig||0) + 20; a.sprite = 'silver'; a.size = 14; s.atk.orbit = { kind:'pulse', rate:0.1, dmg:20, pierce:16, type:'normal', rangeAbs:58, bonusBig:50, quiet:true }; } },
      ]},
      { name:'Power Wash', ups:[
        { name:'Rinse Jet', cost:100, desc:'Adds a water jet that pushes pests back up the trail.', apply:s=>{ s.atk.jet = { kind:'beam', rate:1.6, dmg:1, pierce:3, type:'normal', width:8, knock:8, water:true, rangeMul:0.8 }; } },
        { name:'High Pressure', cost:300, desc:'The jet pushes harder, deals +1, hits 1 more pest and fires 30% faster.', apply:s=>{ const j=s.atk.jet; j.knock = 16; j.rate /= 1.3; j.dmg += 1; j.pierce += 1; } },
        { name:'Scrub Cycle', cost:1300, desc:'The jet scrubs armor and mold off every pest it hits, and hits 4 more.', apply:s=>{ const j=s.atk.jet; j.strip = true; j.demold = true; j.pierce += 4; } },
        { name:'Pressure Washer', cost:2700, desc:'Jet deals 6, stuns small pests 0.3s and shoves vehicles back.', apply:s=>{ const j=s.atk.jet; j.dmg += 4; j.stun = 0.3; j.bigKnock = 12; j.pierce += 6; j.rate /= 1.3; } },
        { name:'Industrial Dish Pit', cost:50000, desc:'Jet deals 50 (250 to vehicles), fires twice as fast and blasts pests 40 back. Ability: Rinse Cycle washes every pest back up the trail and scrubs off armor.', apply:s=>{ const j=s.atk.jet; j.dmg += 44; j.bonusBig = (j.bonusBig||0) + 200; j.knock = 40; j.bigKnock = 30; j.pierce += 25; j.rate /= 2; s.abilities.push({ id:'rinse', cd:40, push:160, bigPush:60 }); } },
      ]},
      { name:'Soap', ups:[
        { name:'Soap Suds', cost:175, desc:'Plates leave pests sudsy and 25% slower for 1.5s.', apply:s=>{ s.atk.main.slow = { mult:0.75, dur:1.5, bigMult:1 }; } },
        { name:'Bubble Sight', cost:250, desc:'Spots ghost pests.', apply:s=>{ s.camo = true; } },
        { name:'Bubble Trap', cost:1250, desc:'Every 3s, traps a pest in a floating bubble for 2.5s. It pops for 10 damage.', apply:s=>{ s.atk.bubble = { kind:'grab', rate:3, count:1, dmg:0, type:'normal', bubble:{ dur:2.5, pop:10 }, rangeMul:0.9 }; } },
        { name:'Foam Party', cost:4200, desc:'Traps 4 pests at a time. Bubbles pop for 60 into slowing foam.', apply:s=>{ const b=s.atk.bubble; b.count = 4; b.bubble.pop = 60; b.bubble.foam = true; b.rate = 2.5; } },
        { name:'Soap Opera', cost:35000, desc:'Traps 15 pests and even vehicles (1.2s). Bubbles pop for 250, or 1,500 on vehicles.', apply:s=>{ const b=s.atk.bubble; b.count = 15; b.bubble.pop = 250; b.bubble.popBig = 1500; b.bubble.bigDur = 1.2; b.bigs = true; b.rate = 2.0; } },
      ]},
    ],
    paragon:{ name:'The Commercial Dish Pit', cost:230000, desc:'Ricocheting silver platters, three giant platters spinning around it, a press that pins vehicles and bursts, and a kitchen that runs faster around it.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:220, camo:true, buff:{ speed:1.11, only:'prep', global:true }, atk:{
        main:{ kind:'proj', boomerang:true, rate:0.2/k, dmg:40+dd*4, pierce:Math.round(90*k), speed:520, size:15, type:'normal', sprite:'silver', count:5, spin:true, bounce:6, bonusBig:Math.round((120+dd*12)*big) },
        jet:{ kind:'beam', rate:0.25/k, dmg:120+dd*12, pierce:60, type:'normal', width:16, knock:60, bigKnock:30, stun:0.4, strip:true, demold:true, water:true, bonusBig:Math.round((300+dd*30)*big) },
        bubble:{ kind:'grab', rate:1.2/k, count:20, dmg:0, type:'normal', bigs:true, bubble:{ dur:2.5, bigDur:1.2, pop:500+dd*50, popBig:Math.round((4000+dd*400)*big), foam:true } },
        orbit:{ kind:'pulse', rate:0.1/k, dmg:42+dd*4, pierce:200, type:'normal', rangeAbs:62, bonusBig:Math.round((40+dd*4)*big), bonusBoss:150, quiet:true },
        press:{ kind:'proj', bigOnly:true, rate:3/k, dmg:1, pierce:1, speed:440, size:18, type:'normal', sprite:'silver', spin:true, homing:true, only:true, lifeMul:3, rangeMul:1.3, explode:{ r:90, dmg:300+dd*30, pierce:20, type:'normal', bonusBig:Math.round((2500+dd*250)*big), bonusBoss:4000, bigKnock:24, burn:{ dmg:250+dd*25, tick:0.5, dur:4 } } },
      }, abilities:[{ id:'rushhour', cd:45, stacks:10, decay:3 }] }; } },
  },

  /* ------------------------------------------------------------ GRILL */
  grill: {
    name:'Grill', cost:375, size:19, hot:'T', faction:'line',
    blurb:'Turns to face pests and flings glowing coals that sear through two at a time. Fire ants ignore the heat.',
    base:{ range:175, atk:{ main:{ kind:'proj', rate:1.1, dmg:1, pierce:2, speed:460, size:7, type:'heat', sprite:'coal' } } },
    paths:[
      { name:'Sear', ups:[
        { name:'Hotter Coals', cost:150, desc:'Coals seek out pests and set them burning.', apply:s=>{ const a=s.atk.main; a.homing = true; a.burn = { dmg:1, tick:0.5, dur:2 }; } },
        { name:'Grill Marks', cost:600, desc:'+1 damage. Seared pests take +1 damage from every hit for 2s.', apply:s=>{ const a=s.atk.main; a.dmg += 1; a.vuln = { amt:1, dur:2 }; } },
        { name:'Branding Iron', cost:1300, desc:'Flings red-hot coals twice as fast that hit 3 more pests, with 20% more reach.', apply:s=>{ const a=s.atk.main; a.rate /= 2; a.pierce += 3; a.sprite = 'hotcoal'; s.range *= 1.2; } },
        { name:'Charcoal Chimney', cost:10900, desc:'+2 damage and +12 to vehicles. Every 4th coal is a flare-up that bursts into a fire column: 20 damage to 40 pests (+40 to vehicles).', apply:s=>{ const a=s.atk.main; a.dmg += 2; a.bonusBig = (a.bonusBig||0) + 12; a.crit = { every:4, over:{ sprite:'flare', size:10, expireExplode:true, explode:{ r:62, dmg:20, pierce:40, type:'heat', burn:{ dmg:4, tick:0.5, dur:3 }, vuln:{ amt:2, dur:3 }, bonusBig:40 } } }; } },
        { name:'Inferno Pit', cost:31000, desc:'Volcanic coals 7 times a second: 8 damage to 11 pests each, +19 to vehicles, 25% more reach. Every 4th is a flare-up for 60 (+120 to vehicles). Adds dragon-fire breath and ghost sight.', apply:s=>{ const a=s.atk.main; a.rate = 0.14; a.dmg += 4; a.pierce += 6; a.bonusBig += 7; s.range *= 1.25; s.camo = true; a.burn = { dmg:4, tick:0.5, dur:2 }; a.crit = { every:4, over:{ sprite:'flare', size:11, expireExplode:true, explode:{ r:72, dmg:60, pierce:50, type:'heat', burn:{ dmg:10, tick:0.5, dur:3 }, vuln:{ amt:3, dur:3 }, bonusBig:120 } } }; if (!s.atk.flame) s.atk.flame = { kind:'flame', rate:0.07, dmg:2, pierce:3, type:'heat', cone:0.5, rangeMul:0.55, bonusBig:8, burn:{ dmg:1, tick:1.5, dur:3.1 } }; } },
      ]},
      { name:'Flame', ups:[
        { name:'Lump Charcoal', cost:300, desc:'Every 2.2s also lobs a flaming lump that bursts for 2 damage on up to 12 pests and sets them burning.', apply:s=>{ s.atk.lump = { kind:'proj', rate:2.2, dmg:0, pierce:1, speed:420, size:9, type:'heat', sprite:'hotcoal', explode:{ r:36, dmg:2, pierce:12, type:'heat', burn:{ dmg:1, tick:0.5, dur:2 } }, expireExplode:true }; } },
        { name:'Lighter Fluid', cost:800, desc:'Squirts lighter fluid on the trail every 5s: a patch of fire that burns every pest walking through it.', apply:s=>{ s.atk.wall = { kind:'slick', rate:5, travel:0.4, type:'heat', sprite:'oil', puddle:{ r:30, dur:5, slow:1, bigSlow:1, fire:true, burn:{ dmg:1, tick:0.25, dur:0.6 } } }; } },
        { name:'Flame Grill', cost:3000, desc:'Adds a flamethrower that scorches a cone of pests.', apply:s=>{ s.atk.flame = { kind:'flame', rate:0.12, dmg:1, pierce:5, type:'heat', cone:0.5, rangeMul:0.65, burn:{ dmg:1, tick:0.5, dur:1.5 } }; } },
        { name:'Inferno Grill', cost:4000, desc:'Flames deal 2, hit 12 pests and burn for 3 per tick. Ability: Fire Bird calls a bird of flame that circles the grill for 20s, raining fireballs.', apply:s=>{ const f=s.atk.flame; f.dmg += 1; f.pierce += 7; f.burn.dmg = 3; f.rangeMul *= 1.15; f.rate = 0.1; s.atk.bird = { kind:'drones', rate:0.15, count:1, orbit:70, orbitSpeed:2.2, dmg:4, pierce:5, speed:620, size:7, type:'heat', sprite:'fireball', droneLook:'bird', needBoost:'bird', burn:{ dmg:2, tick:0.5, dur:1.5 } }; s.abilities.push({ id:'bird', cd:50, dur:20 }); } },
        { name:'Dragon Grill', cost:54000, desc:'Dragon breath: +6 damage, triple damage to vehicles, 30 pests at once. The fire bird stays for good with +6 damage, and Fire Bird now calls a great lava bird for 20s (30 damage, +60 to vehicles).', apply:s=>{ const f=s.atk.flame; f.dmg += 6; f.bigMult = 3; f.pierce += 18; f.cone = 0.7; f.rangeMul *= 1.3; f.burn.dmg = 10; f.dragon = true; const b=s.atk.bird; delete b.needBoost; b.dmg += 6; b.pierce += 5; b.bonusBig = 12; b.rate = 0.12; s.atk.lava = { kind:'drones', rate:0.1, count:1, orbit:105, orbitSpeed:1.4, phase:Math.PI, dmg:30, pierce:12, speed:700, size:9, scale:1.6, type:'heat', sprite:'fireball', droneLook:'bird', lava:true, needBoost:'bird', bonusBig:60, burn:{ dmg:8, tick:0.5, dur:2 } }; } },
      ]},
      { name:'Smoke', ups:[
        { name:'Hickory', cost:300, desc:'+20% range, and coals hit 1 more pest.', apply:s=>{ s.range *= 1.2; s.atk.main.pierce += 1; } },
        { name:'Smoke Signal', cost:300, desc:'Spots ghost pests.', apply:s=>{ s.camo = true; } },
        { name:'Smokehouse', cost:1700, desc:'Lays smoke on the trail that strips ghost cloaks and makes pests take +1 damage for 4s.', apply:s=>{ s.atk.smoke = { kind:'cloud', rate:2.5, travel:0.5, cloud:{ r:56, dur:3, vuln:{ amt:1, dur:4 }, decamo:true } }; } },
        { name:'Charred Horde', cost:2800, desc:'Smoked pests take +2 damage. Pests cooked near the grill fill its ash pit (up to 500), and it raises them as charred undead that shamble back up the trail, hitting pests in their way. Every 200 ash gives all its attacks +1 damage. Towers in range spot ghosts.', apply:s=>{ s.necro = { cap:500, per:200, max:2, rate:1.5, dmg:2, life:7, plus:0, lifeMul:1, bigs:false }; s.buff = Object.assign(s.buff||{}, { camo:true }); const c=s.atk.smoke && s.atk.smoke.cloud; if (c){ c.vuln.amt = 2; c.r *= 1.2; } } },
        { name:'Lord of Ash', cost:28000, desc:'Smoked pests take +4 damage and double heat damage, and smoked vehicles lose 3% health a second. Coals fly twice as fast. The pit holds 3,000 ash and every 300 gives +1 damage (up to +10). Undead hit 3 harder and last 50% longer, and it raises charred cheese wheels, or charred picnic baskets once the pit holds 2,100.', apply:s=>{ const n=s.necro; n.cap = 3000; n.per = 300; n.max = 10; n.plus = 3; n.lifeMul = 1.5; n.bigs = true; s.atk.main.rate /= 2; s.range *= 1.1; const sm=s.atk.smoke; if (sm){ sm.rate = 1.6; const c=sm.cloud; c.vuln.amt = 4; c.heatMult = 2; c.bigBurn = 0.03; c.r *= 1.15; } } },
      ]},
    ],
    paragon:{ name:'The Eternal Barbecue', cost:250000, desc:'Runs on a tank of fuel. Its homing coal spikes raise every pest they cook as a charred undead, a phoenix of flame circles it, and when the tank runs dry it works the bellows to refill it.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:230, camo:true, buff:{ camo:true }, fuelCap:100000, atk:{
        main:{ kind:'proj', need:'spike', rate:0.275/k, dmg:80+dd*8, pierce:Math.round(40*k), speed:620, size:9, type:'normal', sprite:'flare', homing:true, lifeMul:2.5, ignoreImmune:true, bonusBig:Math.round((300+dd*30)*big), bonusBoss:90, fuel:20, stoke:true, raise:{ dmg:60+dd*6, boss:60, pierce:30, life:16, cost:120 } },
        bird:{ kind:'drones', need:'bird', rate:0.2/k, count:1, orbit:88, orbitSpeed:1.6, dmg:120+dd*12, pierce:60, speed:640, size:9, scale:1.3, type:'normal', sprite:'fireball', droneLook:'bird', lava:true, ignoreImmune:true, bonusBig:Math.round((100+dd*10)*big), bonusBoss:20, fuel:20, burn:{ dmg:20, tick:0.5, dur:2 } },
        burst:{ kind:'radial', need:'bird', rate:2/k, count:8, dmg:160+dd*16, bonusBig:Math.round((200+dd*20)*big), bonusBoss:160, pierce:40, speed:380, range:300, type:'normal', sprite:'fireball', lava:true, size:8, ignoreImmune:true },
        bellows:{ kind:'beam', need:'bellows', rate:0.05, dmg:120+dd*12, bonusBig:Math.round((240+dd*24)*big), pierce:4, width:9, rangeMul:1.5, type:'normal', laser:true, color:'#ff7a2a', ignoreImmune:true, refuel:800 },
        cascade:{ kind:'flame', need:'form', rate:0.1/k, dmg:200+dd*20, bonusBig:Math.round((300+dd*30)*big), bonusBoss:320, pierce:100, type:'normal', cone:1.1, rangeMul:1.05, ignoreImmune:true, color:'#ff7a2a', burn:{ dmg:40, tick:0.5, dur:3 } },
        walls:{ kind:'slick', need:'form', rate:6.5, travel:0.4, type:'heat', sprite:'oil', ignoreImmune:true, puddle:{ r:50, dur:9, slow:1, bigSlow:1, fire:true, burn:{ dmg:25+dd*3, tick:0.25, dur:0.6 } } },
        smoke:{ kind:'cloud', rate:1.4, travel:0.4, cloud:{ r:95, dur:3.5, vuln:{ amt:10+dd, dur:4 }, decamo:true, heatMult:2, bigBurn:0.05 } },
      }, abilities:[{ id:'pyre', cd:40, r:300, dot:600+dd*60, per:9000, trucks:10, truck:{ dmg:Math.round((8000+dd*800)*big), pierce:200, life:10 }, basket:{ dmg:Math.round((1400+dd*140)*big), pierce:50, life:7 } }, { id:'inferno', cd:90, drain:4000, max:25 }] }; } },
  },

  /* ------------------------------------------------------- DEEP FRYER */
  fryer: {
    name:'Deep Fryer', cost:225, size:19, hot:'Y', faction:'line',
    blurb:'Turns to face pests and squirts hot batter at them. Battered pests crawl at half speed for 11 seconds. It deals no damage by itself.',
    base:{ range:200, atk:{ main:{ kind:'proj', rate:1.0, dmg:0, pierce:1, speed:480, size:7, type:'normal', sprite:'batter', batter:{ mult:0.5, dur:11 } } } },
    paths:[
      { name:'Grease', ups:[
        { name:'Thick Grease', cost:100, desc:'Each glob coats 2 pests.', apply:s=>{ s.atk.main.pierce += 1; } },
        { name:'Splatter', cost:970, desc:'Globs splatter, coating up to 5 more pests around the one they hit.', apply:s=>{ const a=s.atk.main; a.burst = { r:34, dmg:0, pierce:5, type:'normal', splat:true, batter:a.batter }; } },
        { name:'Oil Slick', cost:1950, desc:'Squirts three times as fast, and splatters spread wider.', apply:s=>{ const a=s.atk.main; a.rate /= 3; if (a.burst){ a.burst.r *= 1.3; a.burst.pierce += 3; } } },
        { name:'Grease Fire', cost:4000, desc:'Globs set pests burning. Ability: Grease Fire coats every pest on screen in hot oil for 10s: battered, soaked (+1 heat damage taken) and seared (+1 damage from every hit). Vehicles crawl 25% slower.', apply:s=>{ s.atk.main.burn = { dmg:1, tick:0.5, dur:2 }; s.abilities.push({ id:'spill', cd:45, dur:10, slow:0.5, bigSlow:0.75, vuln:1 }); } },
        { name:'Bottomless Vat', cost:16000, desc:'Also floods the trail with slicks of boiling oil (8 every half second, 32 to vehicles). Grease Fire becomes an oil flood: it lasts 20s, coats everything again every second, and seared pests take +3.', apply:s=>{ s.atk.slick = { kind:'slick', rate:2.0, travel:0.35, type:'heat', sprite:'oil', fryer:true, impact:{ r:22, dmg:2, pierce:8, type:'heat' }, puddle:{ r:39, dur:5, slow:0.45, bigSlow:0.75, burn:{ dmg:3, tick:0.5, dur:2 }, soak:true, fire:true, boil:{ dmg:8, tick:0.5, bigMult:4 } } }; const ab = s.abilities.find(x=>x.id==='spill'); ab.dur = 20; ab.storm = 20; ab.vuln = 3; ab.cd = 40; } },
      ]},
      { name:'Fry Basket', ups:[
        { name:'Batter Up', cost:280, desc:'Batter sticks twice as long (22s).', apply:s=>{ s.atk.main.batter.dur *= 2; } },
        { name:'Tempura', cost:400, desc:'Thicker batter: coated pests crawl at 30% speed and take +1 damage from heat while coated.', apply:s=>{ const a=s.atk.main; a.batter.mult = 0.3; a.soak = true; } },
        { name:'Fry Basket', cost:3600, desc:'Batter sticks to vehicles too (25% slower). Every 3s the basket dunks up to 8 nearby pests for 8 damage and a 1.2s stun.', apply:s=>{ s.atk.main.batter.bigMult = 0.75; s.atk.basket = { kind:'pulse', rate:3, dmg:8, pierce:8, type:'heat', stun:1.2, soak:true, vfx:'basket', rangeMul:0.5 }; } },
        { name:'Fish and Chips', cost:4000, desc:'Dunks 14 pests for 22. Vehicles in the basket take 62 and are stunned briefly.', apply:s=>{ const b=s.atk.basket; b.dmg += 14; b.pierce = 14; b.stun = 1.5; b.bonusBig = 40; b.bigStun = 0.3; b.rate = 2.6; } },
        { name:'Deep-Fried Everything', cost:24000, desc:'Batter fries small pests stiff for 1s and slows vehicles 50%. Dunks 40 pests for 80 every 2.2s; vehicles take 480 and freeze in place for 0.8s.', apply:s=>{ const a=s.atk.main; a.stun = 1; a.batter.bigMult = 0.5; const b=s.atk.basket; b.dmg = 80; b.pierce = 40; b.stun = 2; b.bonusBig = 400; b.bigStun = 0.8; b.rate = 2.2; b.rangeMul *= 1.2; } },
      ]},
      { name:'Snack Bar', ups:[
        { name:'Hot Fries', cost:200, desc:'Also flings 3 hot fries at pests.', apply:s=>{ s.atk.snack = { kind:'proj', rate:1.0, dmg:1, pierce:1, speed:520, size:5, type:'normal', sprite:'fry', count:3, spread:0.22, rangeMul:0.8 }; } },
        { name:'Seasoned Fries', cost:300, desc:'5 fries that each hit 2 pests. Battered pests sizzle for 1 damage every second while the batter lasts.', apply:s=>{ const f=s.atk.snack; f.count = 5; f.pierce += 1; const m=s.atk.main, b=m.burn; m.burn = { dmg: b ? b.dmg : 1, tick: b ? b.tick : 1, dur:11 }; } },
        { name:'Doughnut Rings', cost:2000, desc:'Rolls 3 doughnuts that plough through 14 pests for 3 damage. Battered pests sizzle twice as fast.', apply:s=>{ const f=s.atk.snack; f.sprite = 'donut'; f.count = 3; f.dmg += 2; f.pierce = 14; f.speed = 320; f.size = 9; f.spin = true; f.lifeMul = 1.6; f.spread = 0.3; const m=s.atk.main; if (m.burn) m.burn.tick = 0.5; } },
        { name:'Churro Lances', cost:5000, desc:'Fires 3 churros: 10 damage, 24 pierce, +12 to vehicles, and they set pests burning. Battered pests sizzle for 4 a tick.', apply:s=>{ const f=s.atk.snack; f.sprite = 'churro'; f.count = 3; f.dmg = 10; f.pierce = 24; f.bonusBig = 12; f.speed = 620; f.size = 7; f.spin = false; f.burn = { dmg:3, tick:0.5, dur:2 }; f.rate = 0.8; const m=s.atk.main; if (m.burn) m.burn.dmg = 4; } },
        { name:'Funnel Cake Storm', cost:22500, desc:'Hurls 3 giant funnel cakes: 25 damage, 80 pierce, +60 to vehicles. They burst into churros. Battered pests sizzle for 10 a tick.', apply:s=>{ const f=s.atk.snack; f.sprite = 'funnel'; f.dmg = 25; f.pierce = 80; f.bonusBig = 60; f.size = 16; f.speed = 380; f.spin = true; f.lifeMul = 1.8; f.split = { count:6, sprite:'churro', dmg:8, pierce:10, bonusBig:10, size:6, speed:520, type:'normal', life:0.5 }; const m=s.atk.main; if (m.burn) m.burn.dmg = 10; } },
      ]},
    ],
    paragon:{ name:'The Bottomless Fryer', cost:240000, desc:'Lakes of boiling oil, a basket that dunks whole crowds and a funnel cake barrage. Its batter builds up in layers: every layer makes a pest take 10% more damage from everything.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:220, camo:true, atk:{
        main:{ kind:'slick', rate:0.5/k, travel:0.35, type:'heat', sprite:'oil', ignoreImmune:true, fryer:true, impact:{ r:60, dmg:30+dd*3, pierce:60, type:'heat' }, puddle:{ r:85, dur:6, slow:0.3, bigSlow:0.5, burn:{ dmg:45+dd*5, tick:0.4, dur:4 }, soak:true, fire:true, boil:{ dmg:100+dd*10, tick:0.4, bigMult:4, ignoreImmune:true }, batter:{ mult:0.6, dur:2, bigMult:0.85 } } },
        basket:{ kind:'pulse', rate:1.6/k, dmg:250+dd*25, pierce:Math.round(100*k), type:'normal', stun:2, bigStun:1, soak:true, bonusBig:Math.round((2500+dd*250)*big), vfx:'basket', rangeMul:0.9 },
        snack:{ kind:'proj', rate:0.35/k, dmg:60+dd*6, pierce:150, bonusBig:Math.round((300+dd*30)*big), speed:420, size:18, type:'normal', sprite:'funnel', count:3, spread:0.3, spin:true, lifeMul:1.8, split:{ count:8, sprite:'churro', dmg:25, pierce:20, bonusBig:40, size:7, speed:560, type:'normal', life:0.5 } },
        glob:{ kind:'proj', rate:0.12/k, count:2, spread:0.35, dmg:0, pierce:3, speed:520, size:8, type:'normal', sprite:'batter', homing:true, lifeMul:1.6, ignoreImmune:true, batter:{ mult:0.5, dur:11, bigMult:0.75 }, layer:true },
      }, layers:{ max:5, per:0.1, dur:12, fry:{ r:60, dmg:300+dd*30, pierce:30, type:'heat', burn:{ dmg:30, tick:0.5, dur:2 } } },
      abilities:[{ id:'deepfry', cd:30, per:500+dd*50, big:4, stun:1 }] }; } },
  },

  /* ---------------------------------------------------------- FREEZER */
  freezer: {
    name:'Freezer', cost:400, size:18, hot:'U', faction:'line',
    blurb:'Blasts cold air that freezes nearby pests solid. Vehicles only slow down.',
    base:{ range:88, atk:{ main:{ kind:'pulse', rate:2.4, dmg:1, pierce:40, type:'cold', vfx:'frost', freeze:{ dur:1.5 } } } },
    paths:[
      { name:'Permafrost', ups:[
        { name:'Colder Coils', cost:150, desc:'Frozen pests stay 25% slower for 2s after they thaw.', apply:s=>{ s.atk.main.freeze.after = { mult:0.75, dur:2 }; } },
        { name:'Brittle Frost', cost:350, desc:'Frozen pests take +1 damage from every hit.', apply:s=>{ s.atk.main.freeze.brittle = 1; } },
        { name:'Cryo Burst', cost:1500, desc:'Blasts deal 3 damage. Frozen pests shatter into ice shards when cooked.', apply:s=>{ s.atk.main.dmg += 2; s.atk.main.freeze.shatter = { count:4, dmg:2, pierce:1 }; } },
        { name:'Deep Freeze', cost:2300, desc:'+2 damage. Ability: Flash Freeze freezes every pest on the map for 4s (vehicles 2s).', apply:s=>{ const a=s.atk.main; a.dmg += 2; a.freeze.dur += 0.3; s.abilities.push({ id:'freeze', cd:60, dur:4, bigDur:2, ignoreImmune:false }); } },
        { name:'Absolute Zero', cost:28000, desc:'Flash Freeze lasts 6s, freezes snow fleas and recharges in 40s. All pests on the map move 15% slower.', apply:s=>{ const a=s.atk.main; a.dmg += 6; a.freeze.brittle = 2; const ab = s.abilities.find(x=>x.id==='freeze'); ab.dur = 6; ab.bigDur = 3; ab.cd = 40; ab.ignoreImmune = true; s.globalSlow = 0.85; } },
      ]},
      { name:'Ice Maker', ups:[
        { name:'Ice Tray', cost:150, desc:'Also fires ice cubes at longer range.', apply:s=>{ s.atk.ice = { kind:'proj', rate:1.2, dmg:1, pierce:3, speed:480, size:7, type:'cold', sprite:'icecube', rangeMul:1.7 }; } },
        { name:'Crushed Ice', cost:200, desc:'Ice cubes shatter into 4 shards.', apply:s=>{ s.atk.ice.frag = { count:4, dmg:1, pierce:1, speed:300, life:0.22, type:'cold', sprite:'iceshard' }; } },
        { name:'Icicle Lances', cost:1900, desc:'Icicles: 4 sharp damage, 6 pierce, and a brief freeze.', apply:s=>{ const i=s.atk.ice; i.sprite = 'icicle'; i.type = 'sharp'; i.dmg += 3; i.pierce += 3; i.freeze = { dur:0.5 }; i.speed *= 1.5; i.rate = 0.8; } },
        { name:'Glacier Cannon', cost:2750, desc:'Glacier chunks: +10 damage, +20 to vehicles, freeze vehicles 0.4s, burst into 8 icicles.', apply:s=>{ const i=s.atk.ice; i.sprite = 'glacier'; i.size = 12; i.dmg += 10; i.bonusBig = (i.bonusBig||0) + 20; i.freeze = Object.assign(i.freeze || { dur:0.5 }, { bigDur:0.4 }); i.frag = { count:8, dmg:2, pierce:2, speed:360, life:0.3, type:'sharp', sprite:'icicle' }; i.rate = 1.0; } },
        { name:'Iceberg Cannon', cost:30000, desc:'Icebergs: +30 damage, +200 to vehicles, freeze vehicles for 1s.', apply:s=>{ const i=s.atk.ice; i.sprite = 'iceberg'; i.size = 16; i.dmg += 30; i.bonusBig += 180; i.freeze.bigDur = 1.0; i.rate = 0.8; i.frag.count = 12; i.frag.dmg = 4; } },
      ]},
      { name:'Chill Zone', ups:[
        { name:'Bigger Freezer', cost:200, desc:'+20% range. Blasts 10% faster.', apply:s=>{ s.range *= 1.2; s.atk.main.rate /= 1.1; } },
        { name:'Chill Aura', cost:300, desc:'Pests in range are always 15% slower.', apply:s=>{ s.aura = { slow:0.85, bigSlow:1 }; } },
        { name:'Arctic Vents', cost:2750, desc:'Aura slows 35% (vehicles 15%) and spots ghost pests.', apply:s=>{ s.aura.slow = 0.65; s.aura.bigSlow = 0.85; s.camo = true; } },
        { name:'Snowstorm', cost:4000, desc:'+30% range. Aura slows 50% and deals 1 cold damage every 0.5s.', apply:s=>{ s.range *= 1.3; Object.assign(s.aura, { slow:0.5, bigSlow:0.75, dmg:1, tick:0.5, type:'cold' }); } },
        { name:'Polar Vortex', cost:21000, desc:'Huge aura: slows 60% and deals 4 every 0.3s. Towers inside attack 15% faster.', apply:s=>{ s.range *= 1.6; Object.assign(s.aura, { slow:0.4, bigSlow:0.6, dmg:4, tick:0.3, type:'cold' }); s.buff = Object.assign(s.buff||{}, { speed:1.15 }); } },
      ]},
    ],
    paragon:{ name:'Eternal Winter', cost:220000, desc:'Four ice lances that reach the edge of the kitchen, then a roar that freezes every pest on the map, over and over. Its arctic wind slows pests to a crawl, and every sink and puddle freezes over so any appliance can stand on it.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:170, camo:true, globalSlow:0.85, iceFloes:true, atk:{
        main:{ kind:'pulse', rate:0.7/k, dmg:45+dd*5, pierce:Math.round(300*k), type:'cold', vfx:'frost', ignoreImmune:true, freeze:{ dur:1.4, bigDur:0.5, brittle:10+dd, shatter:{ count:6, dmg:20, pierce:3 } } },
        ice:{ kind:'proj', rate:0.28/k, dmg:180+dd*20, pierce:30, speed:560, size:18, type:'normal', sprite:'iceberg', rangeMul:1.6, bonusBig:Math.round((1500+dd*150)*big), freeze:{ dur:1, bigDur:0.9 }, frag:{ count:12, dmg:30, pierce:4, speed:380, life:0.35, type:'normal', sprite:'icicle' } },
      }, aura:{ slow:0.25, bigSlow:0.55, dmg:20+dd*2, tick:0.25, type:'cold' },
      lance:{ rate:4/k, dmg:300+dd*30, bonusBig:Math.round((600+dd*60)*big), bonusBoss:3000, pierce:500, width:14, freeze:{ dur:10 } },
      roar:{ dmg:10, frozen:200+dd*20, freeze:10, bigFreeze:5, slow:0.5, bigSlow:0.75, slowDur:10, vuln:8 },
      abilities:[{ id:'longnight', cd:90, perRound:1, delay:5, dur:10, bigDur:5, cold:25, slow:0.75 }] }; } },
  },

  /* -------------------------------------------------------- MICROWAVE */
  micro: {
    name:'Microwave', cost:2500, size:19, hot:'I', faction:'line',
    blurb:'Turns to face pests and fires a blistering stream of microwave pulses, 22 a second. Pricey, but nothing else comes close. Fire ants resist it.',
    base:{ range:219, atk:{ main:{ kind:'proj', rate:0.045, dmg:1, pierce:1, speed:900, size:5, type:'energy', sprite:'zap' } } },
    paths:[
      { name:'Power Level', ups:[
        { name:'High Power', cost:2000, desc:'Laser pulses: +1 damage and 1 more pest each.', apply:s=>{ const a=s.atk.main; a.dmg += 1; a.pierce += 1; a.laser = true; } },
        { name:'Turntable', cost:2500, desc:'Plasma pulses: 50% faster, +1 damage, and they cut through shells.', apply:s=>{ const a=s.atk.main; a.rate /= 1.5; a.dmg += 1; a.type = 'normal'; a.plasma = true; } },
        { name:'Radar Range', cost:20000, desc:'A searing beam of radiation: 6 damage to 15 pests in a line, 16 times a second.', apply:s=>{ const a=s.atk.main; s.atk.main = { kind:'beam', rate:0.06, dmg:a.dmg + 3, pierce:15, type:a.type, width:10, laser:true, bonusBig:(a.bonusBig||0) + 2 }; } },
        { name:'Nuke Setting', cost:100000, desc:'+16 damage, 25 more pests, +100 to vehicles, a wider beam. Zapped pests take +2 damage from everything for a moment.', apply:s=>{ const a=s.atk.main; a.dmg += 16; a.pierce += 25; a.bonusBig = (a.bonusBig||0) + 100; a.vuln = { amt:2, dur:0.6 }; a.width = 14; a.rate = 0.05; } },
        { name:'Fusion Core', cost:500000, desc:'A fusion reactor: +60 damage, 60 more pests, +500 to vehicles, faster still and 30% more reach. Burns through every immunity.', apply:s=>{ const a=s.atk.main; a.dmg += 60; a.pierce += 60; a.bonusBig += 500; a.rate = 0.035; s.range *= 1.3; a.fusion = true; a.ignoreImmune = true; a.width = 20; } },
      ]},
      { name:'Popcorn', ups:[
        { name:'Popcorn Bag', cost:1500, desc:'+20% range. Also lobs exploding popcorn kernels.', apply:s=>{ s.range *= 1.2; s.atk.pop = { kind:'lob', rate:2.0, travel:0.55, count:1, type:'blast', sprite:'kernel', impact:{ r:32, dmg:2, pierce:10, type:'blast' } }; } },
        { name:'Butter Batch', cost:1900, desc:'+15% range, faster pulses, and 3 kernels per volley.', apply:s=>{ s.range *= 1.15; s.atk.pop.count = 3; const a=s.atk.main; if (a.kind === 'proj') a.speed *= 1.3; } },
        { name:'Popcorn Volley', cost:7500, desc:'A second emitter fires 2 pulses at a time. 6 kernels per volley, each popping into 3 bouncing kernels.', apply:s=>{ const a=s.atk.main; a.count = Math.max(2, a.count || 1); a.spread = 0.12; const p=s.atk.pop; p.count = 6; p.frag = { count:3, dmg:1, pierce:2, speed:260, life:0.35, type:'normal', sprite:'popcorn' }; } },
        { name:'Kettle Corn', cost:25000, desc:'Caramel kernels: +4 damage and 0.3s stuns. Ability: Kernel Blast cooks almost everything near the microwave (2,000 damage, 4,000 to vehicles, 1,000 to bosses).', apply:s=>{ const p=s.atk.pop; p.impact.dmg += 4; p.impact.stun = 0.3; p.rate = 1.5; p.sprite = 'kettle'; s.abilities.push({ id:'kernel', cd:45, dmg:2000, big:4000, boss:1000 }); } },
        { name:'Popcorn Apocalypse', cost:70000, desc:'14 kernels every 0.6s with +10 damage and bigger pops, and pulses deal +4. Kernel Blast deals 10,000 (5,000 to bosses) every 30s.', apply:s=>{ const p=s.atk.pop; p.count = 14; p.rate = 0.6; p.impact.dmg += 10; p.impact.r *= 1.4; p.frag.dmg = 4; s.atk.main.dmg += 4; const ab = s.abilities.find(x=>x.id==='kernel'); ab.dmg = 10000; ab.big = 10000; ab.boss = 5000; ab.cd = 30; } },
      ]},
      { name:'Smart Oven', ups:[
        { name:'Timer Ding', cost:3000, desc:'Ding! Zapped pests are knocked back a little and slowed 30% for a moment.', apply:s=>{ const a=s.atk.main; a.knock = 1.5; a.slow = { mult:0.7, dur:0.4, bigMult:1 }; } },
        { name:'Sensor Cook', cost:1200, desc:'Spots ghost pests. +10% range.', apply:s=>{ s.camo = true; s.range *= 1.1; } },
        { name:'Defrost', cost:5600, desc:'+1 damage, 2 more pests, +3 to vehicles. Zaps strip mold and ghost cloaks and knock pests back harder.', apply:s=>{ const a=s.atk.main; a.dmg += 1; a.pierce += 2; a.bonusBig = (a.bonusBig||0) + 3; a.demold = true; a.decamo = true; a.knock = 3; } },
        { name:'Smart Oven', cost:55000, desc:'Pulses cut through every shell: +6 damage, +20 to vehicles, and each hit arcs to 5 more pests for 4.', apply:s=>{ const a=s.atk.main; a.dmg += 6; a.bonusBig = (a.bonusBig||0) + 20; a.type = 'normal'; a.zap = { dmg:4, pierce:1, type:'normal', chain:{ count:5, range:95 }, color:'#ffcf7a' }; } },
        { name:'Quantum Oven', cost:165000, desc:'+14 damage and +60 to vehicles. Arcs jump to 12 pests for 12, ignore every immunity and stun vehicles for an instant.', apply:s=>{ const a=s.atk.main; a.dmg += 14; a.bonusBig += 60; a.ignoreImmune = true; a.bigStun = 0.05; a.zap = { dmg:12, pierce:1, type:'normal', bonusBig:12, ignoreImmune:true, chain:{ count:12, range:135 }, color:'#bfe9ff' }; } },
      ]},
    ],
    paragon:{ name:'Fusion Reactor Prime', cost:280000, desc:'A reactor-grade beam that arcs through twenty pests, with a popcorn barrage on the side. Firing heats the reactor, and the hotter it runs the harder it hits, up to double. At full heat it overheats, vents and shuts down for a few seconds.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:240, camo:true, atk:{
        main:{ kind:'beam', rate:0.05/k, dmg:38+dd*4, pierce:Math.round(60*k), type:'normal', width:12, laser:true, fusion:true, bonusBig:Math.round((110+dd*12)*big), chain:{ count:20, range:160 }, stun:0.15, bigStun:0.04, demold:true, decamo:true, ignoreImmune:true, need:'online', heat:0.5 },
        pop:{ kind:'lob', need:'online', rate:0.5/k, travel:0.5, count:10, type:'normal', sprite:'kettle', impact:{ r:70, dmg:110+dd*10, pierce:60, type:'normal', stun:0.4 }, frag:{ count:4, dmg:25, pierce:3, speed:280, life:0.35, type:'normal', sprite:'popcorn' } },
      }, reactor:{ cool:8, down:4, vent:Math.round(40*k) },
      abilities:[{ id:'meltdown', cd:30, per:Math.round(150*k), big:3, boss:1.5 }] }; } },
  },

  /* ----------------------------------------------------------- SIPHON */
  siphon: {
    name:'Soda Siphon', cost:350, size:16, hot:'O', faction:'special',
    blurb:'Turns and fires pressurized corks at pests anywhere on the map. Slow, but hurts every pest type.',
    base:{ range:9999, global:true, atk:{ main:{ kind:'hitscan', rate:1.59, dmg:2, pierce:1, type:'normal', shots:1 } } },
    paths:[
      { name:'Pressure', ups:[
        { name:'CO₂ Cartridge', cost:350, desc:'Corks deal 4 damage.', apply:s=>{ s.atk.main.dmg += 2; } },
        { name:'Champagne Cork', cost:1300, desc:'Corks deal 7 damage.', apply:s=>{ s.atk.main.dmg += 3; } },
        { name:'Magnum Cork', cost:2500, desc:'18 damage and +12 to vehicles.', apply:s=>{ const a=s.atk.main; a.dmg += 11; a.bonusBig = (a.bonusBig||0) + 12; } },
        { name:'Cork Cannon', cost:5000, desc:'40 damage and +40 to vehicles. Knocks pests back.', apply:s=>{ const a=s.atk.main; a.dmg += 22; a.bonusBig += 28; a.bigKnock = 10; a.knock = 6; } },
        { name:'Supernova Cork', cost:34000, desc:'200 damage, +200 to vehicles. Stuns vehicles 0.8s; they take 30% more damage for 6s.', apply:s=>{ const a=s.atk.main; a.dmg += 160; a.bonusBig += 160; a.bigStun = 0.8; a.cripple = { mult:1.3, dur:6 }; } },
      ]},
      { name:'Fizz', ups:[
        { name:'Fizzy', cost:400, desc:'Fires 30% faster.', apply:s=>{ s.atk.main.rate /= 1.3; } },
        { name:'Quick Pump', cost:400, desc:'Fires 40% faster.', apply:s=>{ s.atk.main.rate /= 1.4; } },
        { name:'Seltzer Burst', cost:3500, desc:'Fires 3 shots per trigger.', apply:s=>{ s.atk.main.shots = 3; } },
        { name:'Soda Fountain', cost:4750, desc:'Fires twice as fast. Ability: Sugar Rush triples fire rate for 8s.', apply:s=>{ s.atk.main.rate /= 2; s.abilities.push({ id:'sugar', cd:45, dur:8, mult:3, global:false }); } },
        { name:'Elite Fountain', cost:14000, desc:'60% faster and +4 damage. Sugar Rush boosts every Soda Siphon.', apply:s=>{ const a=s.atk.main; a.rate /= 1.6; a.dmg += 4; const ab = s.abilities.find(x=>x.id==='sugar'); ab.global = true; } },
      ]},
      { name:'Bubbles', ups:[
        { name:'Fizz Shrapnel', cost:450, desc:'Corks burst into 4 fizz bubbles.', apply:s=>{ s.atk.main.frag = { count:4, dmg:1, pierce:1, speed:340, life:0.3, type:'normal', sprite:'bubble' }; } },
        { name:'Bubble Sight', cost:300, desc:'Spots ghost pests.', apply:s=>{ s.camo = true; } },
        { name:'Bubble Burst', cost:3000, desc:'Hits splash for 2 damage. 6 bubbles that deal 2.', apply:s=>{ const a=s.atk.main; a.splash = { r:45, dmg:2, pierce:12, type:'normal' }; a.frag.count = 6; a.frag.dmg = 2; } },
        { name:'Supply Drop', cost:7200, desc:'+2 splash damage. Ability: Supply Drop delivers a crate of $1,500.', apply:s=>{ s.abilities.push({ id:'supply', cd:60, cash:1500 }); s.atk.main.splash.dmg += 2; } },
        { name:'Soda Elite', cost:13000, desc:'Huge 8-damage splashes. Supply Drop brings $3,000 every 45s. Every Soda Siphon on the map fires 20% faster.', apply:s=>{ const a=s.atk.main; a.splash.r *= 1.6; a.splash.dmg = 8; a.splash.pierce += 30; a.frag.count = 10; a.frag.dmg = 4; const ab = s.abilities.find(x=>x.id==='supply'); ab.cash = 3000; ab.cd = 45; s.buff = Object.assign(s.buff || {}, { speed:1.2, only:'siphon', global:true }); } },
      ]},
    ],
    paragon:{ name:'The Champagne Supernova', cost:240000, desc:'Twin champagne corks that cripple vehicles and burst into fizz anywhere on the map. Every few seconds it marks the toughest pest: marked pests take 50% more damage from everything and burst into a fizz storm when cooked.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:9999, global:true, camo:true, atk:{
        main:{ kind:'hitscan', rate:0.14/k, dmg:280+dd*30, pierce:1, type:'normal', shots:2, marked:true, bonusBig:Math.round((1000+dd*120)*big), bigStun:0.3, cripple:{ mult:1.4, dur:6 }, splash:{ r:90, dmg:80+dd*8, pierce:60, type:'normal' }, frag:{ count:10, dmg:30, pierce:3, speed:380, life:0.35, type:'normal', sprite:'bubble' } },
      }, marks:{ every:3, max:3, mult:1.5, burst:{ r:120, dmg:600+dd*60, pierce:60, type:'normal', bonusBig:Math.round((1500+dd*150)*big) } },
      abilities:[{ id:'supernova', cd:25, dmg:Math.round((15000+dd*1500)*big), big:3, width:44 }] }; } },
  },

  /* ------------------------------------------------------- PIZZA OVEN */
  oven: {
    name:'Pizza Oven', cost:600, size:21, hot:'P', faction:'special',
    blurb:'Turns its mouth toward the target and lobs pizzas anywhere on the map. Pick a target spot, or let it choose pests itself.',
    base:{ range:9999, global:true, spot:true, atk:{ main:{ kind:'lob', mortar:true, rate:2.0, travel:0.9, type:'blast', sprite:'pizza', spreadR:34, impact:{ r:50, dmg:1, pierce:25, type:'blast' } } } },
    paths:[
      { name:'Deep Dish', ups:[
        { name:'Thick Crust', cost:300, desc:'+25% blast radius.', apply:s=>{ s.atk.main.impact.r *= 1.25; } },
        { name:'Extra Cheese', cost:500, desc:'+1 damage and 10 more pests per blast.', apply:s=>{ const im=s.atk.main.impact; im.dmg += 1; im.pierce += 10; } },
        { name:'Deep Dish', cost:825, desc:'+3 damage and bigger blasts that stun for 0.4s.', apply:s=>{ const im=s.atk.main.impact; im.dmg += 3; im.r *= 1.3; im.stun = 0.4; im.pierce += 15; } },
        { name:'Chicago Bomb', cost:7000, desc:'+20 damage, +60 to vehicles and 1s stuns (vehicles 0.25s).', apply:s=>{ const im=s.atk.main.impact; im.dmg += 20; im.bonusBig = (im.bonusBig||0) + 60; im.stun = 1.0; im.stunBig = 0.25; im.pierce += 30; } },
        { name:'Pizzapocalypse', cost:36000, desc:'+80 damage, +300 to vehicles, huge blasts that stun for 1.2s.', apply:s=>{ const a=s.atk.main, im=a.impact; im.dmg += 80; im.bonusBig += 300; im.r *= 1.4; im.stun = 1.2; im.stunBig = 0.4; im.pierce += 60; a.sprite = 'bigpizza'; } },
      ]},
      { name:'Wood-Fired', ups:[
        { name:'Hotter Stone', cost:400, desc:'Bakes 20% faster.', apply:s=>{ s.atk.main.rate /= 1.2; } },
        { name:'Wood-Fired', cost:500, desc:'Pizzas set pests burning.', apply:s=>{ s.atk.main.impact.burn = { dmg:1, tick:0.5, dur:2 }; } },
        { name:'Pizza Party', cost:900, desc:'3 pizzas per bake.', apply:s=>{ s.atk.main.count = 3; } },
        { name:'Brick Oven Barrage', cost:6500, desc:'Bakes twice as fast. Burns deal 4. Ability: Delivery Rush bakes 4× as fast for 8s.', apply:s=>{ const a=s.atk.main; a.rate /= 2; a.impact.burn.dmg = 4; s.abilities.push({ id:'delivery', cd:45, dur:8, mult:4, global:false }); } },
        { name:'Inferno Oven', cost:38000, desc:'5 pizzas per bake, +12 damage, burns of 12 and 25% faster baking. Delivery Rush bakes 6× as fast.', apply:s=>{ const a=s.atk.main; a.count = 5; a.impact.dmg += 12; a.impact.burn.dmg = 12; a.rate /= 1.25; const ab = s.abilities.find(x=>x.id==='delivery'); ab.mult = 6; } },
      ]},
      { name:'Delivery', ups:[
        { name:'Pizza Cutter', cost:200, desc:'Pizzas split into 6 sharp slices.', apply:s=>{ s.atk.main.frag = { count:6, dmg:1, pierce:2, speed:300, life:0.3, type:'sharp', sprite:'slice' }; } },
        { name:'Steady Peel', cost:400, desc:'Pinpoint aim and ghost sight.', apply:s=>{ s.atk.main.spreadR = 6; s.camo = true; } },
        { name:'Calzone Clusters', cost:1100, desc:'Each pizza scatters 6 calzones that explode.', apply:s=>{ s.atk.main.cluster = { count:6, r:32, dmg:2, pierce:12, spread:50, depth:1, type:'blast' }; } },
        { name:'Stuffed Crust', cost:9500, desc:'Pizzas scrub armor off what they hit. Slices hit 3 more pests for +4; calzones deal +6 and scatter calzones.', apply:s=>{ const a=s.atk.main; a.impact.strip = true; a.frag.pierce += 3; a.frag.dmg += 4; a.cluster.depth = 2; a.cluster.dmg += 6; } },
        { name:'Party Pack', cost:40000, desc:'12 slices for 12 each and big calzone storms that deal 24 (+40 to vehicles).', apply:s=>{ const a=s.atk.main; a.frag.count = 12; a.frag.dmg = 12; a.frag.pierce += 3; a.cluster.dmg = 24; a.cluster.r *= 1.3; a.cluster.bonusBig = 40; a.cluster.count = 7; } },
      ]},
    ],
    paragon:{ name:'Il Forno Supremo', cost:260000, desc:'A brick-oven barrage of giant pizzas anywhere on the map, each one bursting into slices and calzones. Every pest its pizzas cook is an order, and every 100 orders it bakes a family-size pizza for the toughest pest on the map.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:9999, global:true, spot:true, camo:true, atk:{
        main:{ kind:'lob', mortar:true, rate:0.4/k, travel:0.8, count:5, type:'normal', sprite:'bigpizza', spreadR:40, ignoreImmune:true, impact:{ r:110, dmg:120+dd*12, pierce:Math.round(200*k), type:'normal', stun:1.2, stunBig:0.4, burn:{ dmg:40, tick:0.5, dur:3 }, bonusBig:Math.round((900+dd*90)*big) },
          frag:{ count:12, dmg:30, pierce:6, speed:320, life:0.35, type:'normal', sprite:'slice' }, cluster:{ count:8, r:45, dmg:40, pierce:30, spread:70, depth:2, type:'normal', bonusBig:120 } },
      }, orders:{ need:100, big:10, family:{ r:220, dmg:3000+dd*300, pierce:400, type:'normal', bonusBig:Math.round((30000+dd*3000)*big), stun:3, stunBig:1.2, burn:{ dmg:120, tick:0.5, dur:4 }, ignoreImmune:true } },
      abilities:[{ id:'avalanche', cd:50, count:40, dmg:2000+dd*200, bonusBig:Math.round((4000+dd*400)*big), r:90, stun:2 }] }; } },
  },

  /* ------------------------------------------------------ STAND MIXER */
  mixer: {
    name:'Stand Mixer', cost:400, size:19, hot:'A', faction:'special',
    blurb:'Turns to face pests and flings a spray of 5 chocolate chips. Upgrades call down forked lightning and whirlwinds, send dough hooks up through the floor to knead pests away, or work it into a temper that keeps on rising.',
    base:{ range:153, atk:{ main:{ kind:'proj', rate:1.1, dmg:1, pierce:1, speed:620, size:4, type:'sharp', sprite:'chip', count:5, spread:0.11 } } },
    finish:s=>mixerFinish(s),
    paths:[
      { name:'Whisk', ups:[
        { name:'Balloon Whisk', cost:350, desc:'Chips hit 1 more pest and cut through shells.', apply:s=>{ const a=s.atk.main; a.pierce += 1; a.type = 'normal'; } },
        { name:'Electric Whisk', cost:850, desc:'Every 2.3s, forked lightning strikes a pest and splits in two at every pest it hits, arcing through up to 31 of them for 2 damage each.', apply:s=>{ s.atk.zap = { kind:'bolt', rate:2.3, dmg:2, type:'energy', fork:{ n:2, gens:5, range:150 }, color:'#ffe066' }; } },
        { name:'Whirlwind', cost:1700, desc:'Every 2.5s, whips up a whirlwind that chases pests and blows up to 35 of them a long way back up the trail. It does no damage, leaves vehicles and ghosts alone, and can only blow a pest away once.', apply:s=>{ s.atk.whirl = { kind:'tornado', rate:2.5, dmg:0, pierce:35, r:30, speed:300, life:1.05, blow:[220, 440], type:'normal' }; } },
        { name:'Thunder Meringue', cost:4500, desc:'Spots ghosts. Every 6s, a crackling ball of meringue drifts out, sticking every small pest it touches in place for 2s and zapping forked lightning (3 damage) around it three times a second. Lightning hits for 3, and whirlwinds blow 60 pests even further back.', apply:s=>{ s.camo = true; s.atk.zap.dmg = 3; const w=s.atk.whirl; w.pierce = 60; w.blow = [330, 550]; s.atk.ball = { kind:'orb', rate:6, speed:105, life:3.75, r:16, stick:2, zap:{ rate:0.35, dmg:3, type:'energy', fork:{ n:2, gens:5, range:120 }, color:'#fff2a8' } }; } },
        { name:'Hurricane Mixer', cost:60000, desc:'Every 4s, unleashes a superstorm that roams the kitchen for 13s, bouncing off the walls. It hits everything it passes over for 100, again every second, blowing pests and vehicles back up the trail (raccoons and bosses don’t budge, and bosses take no damage), and throws off a meringue ball every 3s. Lightning hits for 30, meringue lightning for 10.', apply:s=>{ s.atk.zap.dmg = 30; s.atk.ball.zap.dmg = 10; s.atk.super = { kind:'storm', rate:4, speed:110, life:12.9, r:68, dmg:100, rehit:1, pierce:200, blow:[330, 500], type:'normal', ballEvery:3 }; } },
      ]},
      { name:'Dough Hook', ups:[
        { name:'Chocolate Chunks', cost:250, desc:'Flings 8 chips at a time.', apply:s=>{ const a=s.atk.main; a.count = 8; a.spread = 0.09; } },
        { name:'Sourdough Starter', cost:350, desc:'Everything it throws scrubs mold off pests. Its chips hit 1% more pests for every life the kitchen has above its starting lives (up to twice as many).', apply:s=>{ s.oak = { per:0.01, max:1 }; } },
        { name:'Dough Hook', cost:1050, desc:'A dough hook rises from the floor anywhere in the kitchen, wraps around one small pest and kneads it away for good (tougher pests take longer, up to about 2s), then leaves a pile of chocolate spikes on the trail where it was: 1 damage to up to 20 pests every 0.3s, for 4.5s. Not vehicles or ghosts.', apply:s=>{ s.atk.hook = { kind:'vine', rate:2.6, rest:1.4, type:'sharp', pile:{ dmg:1, pierce:20, tick:0.3, life:4.5, r:13 } }; } },
        { name:'Bread Proofer', cost:4900, desc:'Holds a bake sale at the end of every round: $120 and a life, plus $10–$120 for each Bread Machine in its range (the bigger the machine, the more). Its chocolate spikes hit harder (2 damage, 30 pests every 0.2s) and last 9s. Ability: Punch Down, dough hooks grab 10 pests at once and knead them flat, leaving spikes behind.', apply:s=>{ s.bounty = { cash:120, farm:[10, 20, 40, 60, 120, 120], cap:10000 }; s.lifeRound = (s.lifeRound || 0) + 1; Object.assign(s.atk.hook.pile, { dmg:2, pierce:30, tick:0.2, life:9 }); s.abilities.push({ id:'punchdown', cd:30, n:10 }); } },
        { name:'Dough Golem', cost:35000, desc:'Sticky dough studded with chocolate spikes creeps out along the trail from the mixer, a little further every second, and hits every pest on it twice a second: 8 damage near the mixer (+32 to vehicles), 4 further out (+16) and 2 everywhere beyond (+8). Chips deal 6, its spike piles 5, and Punch Down grabs 20.', apply:s=>{ s.atk.main.dmg = 6; Object.assign(s.atk.hook.pile, { dmg:5, tick:0.15 }); s.forest = { grow:13, tick:0.5, zones:[[220, 8, 32], [440, 4, 16], [99999, 2, 8]] }; s.abilities.find(x => x.id === 'punchdown').n = 20; } },
      ]},
      { name:'Temper', ups:[
        { name:'Long Cord', cost:100, desc:'+25% range, and its chocolate spikes last a third longer.', apply:s=>{ s.range *= 1.25; s.reach = 1.33; } },
        { name:'Bitter Batter', cost:300, desc:'Works 10% faster, and 1% faster again for every life the kitchen has lost, up to 50% faster in all.', apply:s=>{ s.vengeance = { base:0.1, per:0.01, max:40 }; } },
        { name:'Whipped Frenzy', cost:600, desc:'Works itself into a frenzy during a round: 5% faster for every 10 damage it deals, up to twice as fast. The frenzy dies down if it goes 2s without hitting anything.', apply:s=>{ s.wrath = { per:10, step:0.05, max:20, idle:2 }; } },
        { name:'Dinner Rush', cost:2350, desc:'Every other Stand Mixer in its range works 15% faster and its chips hit 15% more pests. A mixer feels the rush from up to 5 of these at once.', apply:s=>{ s.rush = { speed:0.15, pierce:0.15, max:5 }; } },
        { name:'Kitchen Fury', cost:45000, desc:'+12% range, +3 damage and twice as fast. The more pests in the kitchen, the angrier it gets: chips and lightning deal +1 damage for every 1,500 health of pests on the map, up to +30.', apply:s=>{ s.range *= 1.12; const a=s.atk.main; a.dmg += 3; a.rate /= 2; if (s.atk.zap) s.atk.zap.rate /= 2; s.fury = { per:1500, max:30 }; } },
      ]},
    ],
    paragon:{ name:'The Grand Planetary Mixer', cost:230000, desc:'Throws electrified chips that ricochet from pest to pest, faster with every throw. Dough spreads from it across the whole kitchen, mixing bowls pop up around it and whip up whirlwinds that blow pests and vehicles back, and every round ends with a bake sale. Overmix switches it into a furious mode that hits harder the more pests there are, for a price.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:210, camo:true, atk:{
        main:{ kind:'proj', rate:0.5/k, count:7, spread:0.09, dmg:55+dd*6, pierce:1, bounce:2, speed:640, size:5, homing:true, type:'normal', sprite:'echip', ignoreImmune:true, bonusBoss:Math.round((110+dd*11)*big), bonusMold:55+dd*6, bonusBig:Math.round((200+dd*20)*big) },
      }, ramp:{ step:0.05, max:20, reset:0.51 },
      dough:{ grow:26, tick:0.5, zones:[[220, 30+dd*3, Math.round(300*big)], [440, 15+dd, Math.round(150*big)], [99999, 10+dd, Math.round(100*big)]] },
      bowls:{ every:10, life:60, max:6, rate:18, whirl:{ dmg:20+dd*2, bonusBoss:80, pierce:20, r:30, speed:150, life:2.86, reach:175, blow:[110, 330], cost:{ cheese:5, basket:8, midnight:6, truck:20, raccoon:30 }, type:'normal', ignoreImmune:true } },
      bakeSale:{ lives:1, cash:240, bowl:20, farm:[20, 40, 60, 80, 240, 480], cap:10000 },
      abilities:[{ id:'overmix', cd:9, toggle:true, range:1.35, spread:0.2, per:15000, max:5, drain:0.01, min:1000, cap:10000 }] }; } },
  },

  /* ------------------------------------------------------ PASTA MAKER */
  pasta: {
    name:'Pasta Maker', cost:1000, size:19, hot:'S', faction:'special',
    blurb:'Extrudes tangles of pasta onto the trail nearby. Each nest hits 5 pests before it falls apart, and lasts 50 seconds.',
    base:{ range:149, atk:{ main:{ kind:'trap', rate:1.75, dmg:1, pierce:5, type:'normal', r:14, life:50, sprite:'spaghetti', slow:{ mult:0.8, dur:0.6, bigMult:1 } } } },
    paths:[
      { name:'Spaghetti', ups:[
        { name:'Faster Rollers', cost:600, desc:'Extrudes 30% faster.', apply:s=>{ s.atk.main.rate /= 1.3; } },
        { name:'Thicker Strands', cost:800, desc:'Extrudes 25% faster, and each nest hits 3 more pests.', apply:s=>{ const a=s.atk.main; a.rate /= 1.25; a.pierce += 3; } },
        { name:'Spaghetti Junction', cost:2500, desc:'Bigger nests that hit 5 more pests, tangle them (50% slower for 1.5s) and shred vehicles for +4.', apply:s=>{ const a=s.atk.main; a.r *= 1.4; a.pierce += 5; a.slow = { mult:0.5, dur:1.5, bigMult:1 }; a.bonusBig = (a.bonusBig||0) + 4; } },
        { name:'Pasta Factory', cost:7000, desc:'Extrudes twice as fast. Nests hit 6 more pests for +2 damage. Ability: Spaghetti Storm drops 40 nests all along the trail.', apply:s=>{ const a=s.atk.main; a.rate /= 2; a.pierce += 6; a.dmg += 2; s.abilities.push({ id:'pastastorm', cd:40, count:40 }); } },
        { name:'Infinite Linguine', cost:41000, desc:'A nest every 0.15s: 14 more hits, +8 damage, +10 to vehicles, lasting 60s. Every 15s it carpets the trail with 30 nests on its own.', apply:s=>{ const a=s.atk.main; a.rate = 0.15; a.pierce += 14; a.dmg += 8; a.bonusBig = (a.bonusBig||0) + 10; a.life = 60; a.sprite = 'linguine'; s.atk.carpet = Object.assign({}, a, { kind:'carpet', rate:15, count:30, life:30 }); } },
      ]},
      { name:'Lasagna', ups:[
        { name:'Al Dente', cost:150, desc:'+1 damage.', apply:s=>{ s.atk.main.dmg += 1; } },
        { name:'Penne Spikes', cost:400, desc:'Stiff penne: +1 damage and 2 more hits.', apply:s=>{ const a=s.atk.main; a.dmg += 1; a.pierce += 2; if (a.sprite === 'spaghetti') a.sprite = 'penne'; } },
        { name:'Lasagna Sheets', cost:1300, desc:'Lays lasagna sheets: 8 damage a hit and +20 to vehicles.', apply:s=>{ const a=s.atk.main; a.sprite = 'lasagna'; a.dmg += 5; a.bonusBig = (a.bonusBig||0) + 20; a.r = Math.max(a.r, 16); } },
        { name:'Cannelloni Crush', cost:3600, desc:'Sheets deal 20, +80 to vehicles, and stun vehicles for 0.3s.', apply:s=>{ const a=s.atk.main; a.dmg += 12; a.bonusBig += 60; a.bigStun = 0.3; } },
        { name:'Lasagna Fortress', cost:30000, desc:'Sheets deal 60, +400 to vehicles, stun vehicles 0.6s and hit at least 12 pests.', apply:s=>{ const a=s.atk.main; a.dmg += 40; a.bonusBig += 320; a.bigStun = 0.6; a.pierce = Math.max(a.pierce, 12); } },
      ]},
      { name:'Ravioli', ups:[
        { name:'Longer Chute', cost:800, desc:'+20% range, and each nest hits 3 more pests.', apply:s=>{ s.range *= 1.2; s.atk.main.pierce += 3; } },
        { name:'Ravioli Bombs', cost:600, desc:'Every 3rd nest is a ravioli bomb that explodes when touched.', apply:s=>{ const a=s.atk.main; a.mineEvery = 3; a.mine = { r:40, dmg:2, pierce:15, type:'blast' }; } },
        { name:'Ravioli Mines', cost:2300, desc:'Every nest is a ravioli mine: 6 damage in a wide blast.', apply:s=>{ const a=s.atk.main; a.mineEvery = 1; a.mine = { r:46, dmg:6, pierce:22, type:'blast' }; } },
        { name:'Tortellini Clusters', cost:9500, desc:'Mines deal +8 (+20 to vehicles) and burst into 6 tortellini that explode for 8.', apply:s=>{ const a=s.atk.main; a.mine.dmg += 8; a.mine.bonusBig = (a.mine.bonusBig||0) + 20; a.cluster = { count:6, r:28, dmg:8, pierce:12, spread:44, depth:1, type:'blast' }; } },
        { name:'Pasta Bomb Pantry', cost:125000, desc:'Giant mines: 300 damage (+1,500 to vehicles) in huge blasts that cut every shell, with double clusters of 60. Ability: Pasta Rain drops 30 mines along the trail.', apply:s=>{ const a=s.atk.main; a.mine.dmg = 300; a.mine.r *= 1.8; a.mine.pierce += 40; a.mine.bonusBig = 1500; a.mine.type = 'normal'; a.cluster.depth = 2; a.cluster.dmg = 60; a.cluster.bonusBig = 100; a.cluster.r *= 1.3; a.cluster.type = 'normal'; s.abilities.push({ id:'pastarain', cd:40, count:30 }); } },
      ]},
    ],
    paragon:{ name:'The Pasta Pantheon', cost:250000, desc:'Endless lasagna fortresses and giant ravioli mines that keep for rounds. A carpet of pasta spreads out along the trail from it, shredding everything that walks on it.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:260, camo:true, atk:{
        main:{ kind:'trap', rate:0.1/k, dmg:80+dd*8, pierce:20, type:'normal', r:20, life:40, sprite:'lasagna', bonusBig:Math.round((600+dd*60)*big), bigStun:0.5, ignoreImmune:true, slow:{ mult:0.5, dur:1.5, bigMult:0.8 } },
        mines:{ kind:'trap', rate:1.2/k, dmg:0, pierce:1, type:'normal', r:20, life:300, keep:true, sprite:'ravioli', mineEvery:1, mine:{ r:90, dmg:300+dd*30, pierce:80, type:'normal', bonusBig:Math.round((1500+dd*150)*big) }, cluster:{ count:8, r:40, dmg:60+dd*6, pierce:30, spread:60, depth:2, type:'normal', bonusBig:150 } },
      }, carpet:{ grow:73, tick:0.5, dmg:30+dd*3, bonusBig:Math.round(300*big), bonusBoss:800 },
      abilities:[{ id:'boil', cd:15, dur:15, mult:4, perRound:1 }, { id:'pastageddon', cd:75, per:25, mine:{ r:150, dmg:3000+dd*300, pierce:120, type:'normal', bonusBig:Math.round((25000+dd*2500)*big) } }] }; } },
  },

  /* ---------------------------------------------------------- GATLING */
  gatling: {
    name:'Pepper Gatling', cost:850, size:18, hot:'G', faction:'special',
    blurb:'A spinning pepper mill that turns toward your pointer and sprays peppercorns there, anywhere on the map. Move the mouse (or tap) to aim it, or lock it onto one spot from its panel.',
    base:{ range:160, atk:{ main:{ kind:'proj', aim:'pointer', rate:0.2, dmg:1, pierce:1, speed:820, size:5, type:'sharp', sprite:'pepper', count:1, spread:0.1, inacc:0.16, lifeMul:1.2 } } },
    paths:[
      { name:'Heat', ups:[
        { name:'Fine Grind', cost:300, desc:'A finer grind: far less spread, and each peppercorn hits 1 more pest.', apply:s=>{ const a=s.atk.main; a.inacc *= 0.35; a.pierce += 1; } },
        { name:'Chili Flakes', cost:900, desc:'+1 damage. Fiery flakes deal heat damage, cut through shells and set pests burning.', apply:s=>{ const a=s.atk.main; a.dmg += 1; a.type = 'heat'; a.burn = { dmg:1, tick:0.5, dur:1.5 }; } },
        { name:'Hot Sauce Jet', cost:3000, desc:'Scalding sauce shots: +2 damage, 4 more pests each and faster shots.', apply:s=>{ const a=s.atk.main; a.dmg += 2; a.pierce += 4; a.speed *= 1.3; a.sprite = 'shape'; a.shape = 'orb'; a.color = '#ff5a2a'; a.glow = true; a.size = 7; } },
        { name:'Ghost Pepper Beam', cost:11750, desc:'Becomes a ghost-pepper beam that burns through 25 pests in a line, wherever you point.', apply:s=>{ const a=s.atk.main; s.atk.main = { kind:'beam', aim:'pointer', rate: Math.min(0.14, a.rate * 0.7), dmg: a.dmg + 1, pierce: a.pierce + 20, width:12, type:'heat', laser:true, color:'#ff4d1f', burn:{ dmg:1, tick:0.5, dur:2 }, bonusBig:(a.bonusBig||0) + 4, rangeMul: 3, knock: a.knock }; } },
        { name:'Reaper Ray', cost:75000, desc:'The Carolina Reaper Ray: a huge beam across the whole kitchen with +10 damage, 200 more pests per sweep, +60 to vehicles. Burns through every immunity.', apply:s=>{ const a=s.atk.main; a.dmg += 10; a.pierce += 200; a.width = 22; a.bonusBig = (a.bonusBig||0) + 60; a.ignoreImmune = true; a.rate = Math.min(a.rate, 0.08); a.rangeMul = 9; a.color = '#ff2a00'; a.burn = { dmg:3, tick:0.5, dur:2 }; } },
      ]},
      { name:'Pops', ups:[
        { name:'Steady Crank', cost:250, desc:'Peppercorns fly 40% faster and farther.', apply:s=>{ const a=s.atk.main; if (a.kind === 'proj'){ a.speed *= 1.4; a.lifeMul = (a.lifeMul||1) * 1.3; } } },
        { name:'Faster Crank', cost:950, desc:'Grinds 40% faster.', apply:s=>{ s.atk.main.rate /= 1.4; } },
        { name:'Popcorn Pods', cost:4500, desc:'Adds popcorn rockets that fly toward your pointer, home in on pests and burst for 4 damage.', apply:s=>{ s.atk.pods = { kind:'proj', aim:'pointer', rate:0.6, dmg:0, pierce:1, speed:520, size:6, type:'blast', sprite:'popcorn', homing:true, count:2, spread:0.45, lifeMul:2, explode:{ r:34, dmg:4, pierce:12, type:'blast' }, expireExplode:true }; } },
        { name:'Popcorn Storm', cost:5000, desc:'Pods fire faster and hit harder. Ability: Popcorn Storm sends 80 homing rockets at the toughest pests.', apply:s=>{ const p=s.atk.pods; p.rate = 0.4; p.explode.dmg += 2; s.abilities.push({ id:'storm', cd:45, rockets:80, dmg:12, r:40 }); } },
        { name:'Kernel Panic', cost:65000, desc:'A giant homing kernel every 1.2s deals 700 to vehicles. Pods +6 damage; Popcorn Storm fires 160 rockets.', apply:s=>{ const p=s.atk.pods; p.explode.dmg += 6; p.explode.r *= 1.3; s.atk.mad = { kind:'proj', aim:'pointer', rate:1.2, dmg:0, pierce:1, speed:440, size:14, scale:2.2, type:'normal', sprite:'kettle', homing:true, targetBig:true, lifeMul:3, explode:{ r:60, dmg:40, pierce:20, type:'normal', bonusBig:700, ignoreImmune:true }, expireExplode:true }; const ab = s.abilities.find(x => x.id === 'storm'); ab.rockets = 160; ab.dmg = 30; ab.cd = 35; } },
      ]},
      { name:'Spray', ups:[
        { name:'Coarse Grind', cost:150, desc:'Peppercorns hit 1 more pest.', apply:s=>{ s.atk.main.pierce += 1; } },
        { name:'Cracked Pepper', cost:1200, desc:'+1 damage, 1 more pest and faster peppercorns.', apply:s=>{ const a=s.atk.main; a.dmg += 1; a.pierce += 1; if (a.kind === 'proj') a.speed *= 1.2; } },
        { name:'Peppershot', cost:3000, desc:'Fires 5 peppercorns in a short, wide spray, a little slower. +1 damage each, and they knock small pests back.', apply:s=>{ const a=s.atk.main; if (a.kind === 'proj'){ a.count = 5; a.spread = 0.1; a.inacc = Math.max(a.inacc || 0, 0.1); a.lifeMul = (a.lifeMul||1) * 0.6; a.rate *= 1.3; } a.dmg += 1; a.knock = 6; } },
        { name:'Spice Rack Turrets', cost:12000, desc:'Four spice-jar turrets ring the mill and fire at pests in range on their own: 2 damage, 3 pests each.', apply:s=>{ s.atk.turrets = { kind:'proj', rate:0.25, dmg:2, pierce:3, speed:760, size:5, type:'normal', sprite:'pepper', count:4, pattern:'scatter', rangeMul:1.3 }; } },
        { name:'Spice Exclusion Zone', cost:58000, desc:'Turrets fire 2.5× faster with +4 damage and +6 pests each and reach further, peppercorns +3 damage, and the whole mill sees ghost pests.', apply:s=>{ const u=s.atk.turrets; u.rate /= 2.5; u.dmg += 4; u.pierce += 6; u.rangeMul = 1.6; s.atk.main.dmg += 3; s.camo = true; } },
      ]},
    ],
    paragon:{ name:'Apex Pepper Master', cost:300000, desc:'A blizzard of plasma pepper wherever you point, homing popcorn rockets and a ring of turrets that need no aim. The longer it fires, the hotter it gets: five steps up the heat scale, each hitting 20% harder, until its pepper sets pests alight.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:220, camo:true, atk:{
        main:{ kind:'proj', aim:'pointer', rate:0.04/k, dmg:30+dd*3, pierce:Math.round(12*k), speed:1100, size:7, type:'normal', sprite:'shape', shape:'orb', color:'#ff4df0', glow:true, trail:true, count:3, spread:0.08, inacc:0.05, lifeMul:2, ignoreImmune:true, bonusBig:Math.round((60+dd*6)*big) },
        turrets:{ kind:'proj', rate:0.05/k, dmg:15+dd, pierce:8, speed:900, size:5, type:'normal', sprite:'pepper', count:6, pattern:'scatter', rangeMul:1.6, ignoreImmune:true, bonusBig:Math.round(30*big) },
        pods:{ kind:'proj', aim:'pointer', rate:0.3/k, dmg:0, pierce:1, speed:600, size:8, scale:1.4, type:'normal', sprite:'kettle', homing:true, count:3, spread:0.5, lifeMul:2.2, explode:{ r:60, dmg:80+dd*8, pierce:40, type:'normal', bonusBig:Math.round((400+dd*40)*big) }, expireExplode:true },
      }, scoville:{ up:2, down:1.5, per:0.2, burn:{ dmg:20+dd*2, tick:0.5, dur:2 } },
      abilities:[{ id:'reaper', cd:40, dur:10, mult:2, burst:{ r:42, dmg:40+dd*4, pierce:12, type:'normal', burn:{ dmg:40, tick:0.5, dur:2 } } }] }; } },
  },

  /* ------------------------------------------------------- GRAVY BOAT */
  boat: {
    name:'Gravy Boat', cost:400, size:20, hot:'H', faction:'fleet', water:true,
    blurb:'Sails on water (sinks, spills, puddles and melt pools) and fires skewered olives. It can only be placed on water.',
    base:{ range:262, atk:{ main:{ kind:'proj', rate:1.0, dmg:1, pierce:4, speed:600, size:6, type:'sharp', sprite:'olive', count:1, spread:0.14 } } },
    paths:[
      { name:'Fleet', ups:[
        { name:'Quick Pour', cost:275, desc:'Fires 33% faster.', apply:s=>{ s.atk.main.rate /= 1.33; } },
        { name:'Double Pour', cost:425, desc:'Fires 2 olives at once.', apply:s=>{ s.atk.main.count = Math.max(2, s.atk.main.count); } },
        { name:'Gravy Destroyer', cost:3350, desc:'Fires 3× as fast. Olives hit 1 more pest.', apply:s=>{ const a=s.atk.main; a.rate /= 3; a.pierce += 1; } },
        { name:'Gravy Carrier', cost:8000, desc:'Launches 3 tiny jets that circle the boat and strafe pests (3 damage, 4 pests each). Olives +1 damage.', apply:s=>{ s.atk.jets = { kind:'drones', rate:0.3, count:3, orbit:62, dmg:3, pierce:4, speed:680, size:5, type:'normal', sprite:'pepper', droneLook:'jet' }; s.atk.main.dmg += 1; } },
        { name:'Gravy Flagship', cost:26000, desc:'6 jets fire 2.5× as fast for +6 damage (+4 to vehicles) and hit 2 more pests; olives +4 damage, 3 more pests. Water appliances in range attack 15% faster.', apply:s=>{ const j=s.atk.jets; j.count = 6; j.rate /= 2.5; j.dmg += 6; j.pierce += 2; j.bonusBig = (j.bonusBig||0) + 4; const a=s.atk.main; a.dmg += 4; a.pierce += 3; s.buff = Object.assign(s.buff || {}, { speed:1.15, only:'water' }); } },
      ]},
      { name:'Broadside', ups:[
        { name:'Grape Shot', cost:550, desc:'Adds a grape shot: 5 grapes in a spread, each hitting 2 pests for 1.', apply:s=>{ s.atk.grapes = { kind:'proj', rate:1.1, dmg:1, pierce:2, speed:520, size:5, type:'sharp', sprite:'grape', count:5, spread:0.22, lifeMul:0.8 }; } },
        { name:'Roasted Grapes', cost:500, desc:'Grapes deal +1 heat damage and set pests burning.', apply:s=>{ const g=s.atk.grapes; g.dmg += 1; g.type = 'heat'; g.burn = { dmg:1, tick:0.5, dur:1.5 }; } },
        { name:'Meatball Cannon', cost:900, desc:'Adds a cannon that fires meatballs: 3 damage to 20 pests in a blast.', apply:s=>{ s.atk.cannon = { kind:'proj', rate:1.2, dmg:0, pierce:1, speed:460, size:9, type:'blast', sprite:'meatball', explode:{ r:42, dmg:3, pierce:20, type:'blast' }, expireExplode:true }; } },
        { name:'Galley Pirates', cost:3900, desc:'Two cannons, +2 damage. Ability: Galley Hook drags the toughest vehicle off the map (up to food trucks).', apply:s=>{ const c=s.atk.cannon; c.count = 2; c.spread = 0.3; c.explode.dmg += 2; s.abilities.push({ id:'galley', cd:30, hooks:1, maxTier:10, bossPct:0.08 }); } },
        { name:'Gravy Lord', cost:27000, desc:'Galley Hook takes 3 vehicles, raccoons too, every 20s, and bosses lose 12% of their health. 10 grapes for +4; the cannons fire twice as fast with bigger blasts for +10 (+30 to vehicles).', apply:s=>{ const ab = s.abilities.find(x=>x.id==='galley'); ab.hooks = 3; ab.cd = 20; ab.maxTier = 11; ab.bossPct = 0.12; const g=s.atk.grapes; g.count = 10; g.dmg += 4; g.pierce += 2; const c=s.atk.cannon; c.rate /= 2; c.explode.dmg += 10; c.explode.r *= 1.3; c.explode.pierce += 10; c.explode.bonusBig = (c.explode.bonusBig||0) + 30; } },
      ]},
      { name:'Trade', ups:[
        { name:'Longer Ladle', cost:200, desc:'+20% range.', apply:s=>{ s.range *= 1.2; } },
        { name:"Crow's Nest", cost:350, desc:'Spots ghost pests.', apply:s=>{ s.camo = true; } },
        { name:'Merchant Galley', cost:2400, desc:'Earns $250 each round.', apply:s=>{ s.income = (s.income||0) + 250; } },
        { name:'Favored Trades', cost:5500, desc:'Earns $700 each round. Every appliance sells for 10% more.', apply:s=>{ s.income = (s.income||0) + 450; s.sellBonus = 0.1; } },
        { name:'Trade Empire', cost:23000, desc:'Earns $2,000 each round. Every other water appliance on the map deals +1 damage and hits 1 more pest.', apply:s=>{ s.income = (s.income||0) + 1300; s.buff = Object.assign(s.buff || {}, { dmg:1, pierce:1, only:'water', global:true }); } },
      ]},
    ],
    paragon:{ name:'Admiral of the Gravy Seas', cost:350000, desc:'A flagship fleet: olive broadsides, roasted grape storms, meatball cannons and a swarm of jets. A rack of ten grappling hooks drags vehicles off the map on its own, and every water appliance and aircraft works faster.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:250, camo:true, income:3000+dd*300, sellBonus:0.1, buff:{ speed:1.2, dmg:2, pierce:2, only:'navy', global:true }, hooks:{ n:10, gap:0.25, recharge:10 }, atk:{
        main:{ kind:'proj', rate:0.07/k, dmg:24+dd*3, pierce:Math.round(14*k), speed:780, size:7, type:'normal', sprite:'olive', count:4, spread:0.12, ignoreImmune:true, bonusBig:Math.round((40+dd*4)*big) },
        grapes:{ kind:'proj', rate:0.25/k, dmg:16+dd*2, pierce:4, speed:620, size:5, type:'heat', sprite:'grape', count:12, spread:0.16, lifeMul:0.9, ignoreImmune:true, burn:{ dmg:20, tick:0.5, dur:2 } },
        cannon:{ kind:'proj', rate:0.3/k, dmg:0, pierce:1, speed:520, size:10, type:'normal', sprite:'meatball', scale:1.4, count:2, spread:0.25, explode:{ r:70, dmg:80+dd*8, pierce:60, type:'normal', bonusBig:Math.round((300+dd*30)*big) }, expireExplode:true },
        jets:{ kind:'drones', rate:0.06/k, count:8, orbit:84, dmg:30+dd*3, pierce:6, speed:820, size:6, type:'normal', sprite:'pepper', droneLook:'jet', ignoreImmune:true, bonusBig:Math.round(40*big) },
      }, abilities:[{ id:'leviathan', cd:30, perRound:2, bossPct:0.2 }] }; } },
  },

  /* ----------------------------------------------------- SUB SANDWICH */
  sub: {
    name:'Sub Sandwich', cost:325, size:19, hot:'J', faction:'fleet', water:true,
    blurb:'A submarine sandwich that cruises the water and fires homing pickles. It can only be placed on water.',
    base:{ range:184, atk:{ main:{ kind:'proj', rate:0.75, dmg:1, pierce:2, speed:540, size:6, type:'sharp', sprite:'pickle', homing:true, count:1, spread:0.14 } } },
    paths:[
      { name:'Sonar', ups:[
        { name:'Periscope', cost:130, desc:'+25% range.', apply:s=>{ s.range *= 1.25; } },
        { name:'Sonar Ping', cost:350, desc:'+15% range and spots ghost pests.', apply:s=>{ s.range *= 1.15; s.camo = true; } },
        { name:'Submerge', cost:700, desc:'Dives and pings sonar every 2s: 1 damage to 40 pests in range, stripping their ghost cloaks and mold for good.', apply:s=>{ s.atk.sonar = { kind:'pulse', rate:2, dmg:1, pierce:40, type:'normal', decamo:true, demold:true, color:'#7fd3ff' }; s.submerged = true; } },
        { name:'Brine Reactor', cost:2900, desc:'A brine reactor pulses 5 times a second, hitting up to 60 pests close by for 1 (+2 to vehicles).', apply:s=>{ s.atk.reactor = { kind:'pulse', rate:0.2, dmg:1, pierce:60, type:'normal', rangeMul:0.65, color:'#9be15d', bonusBig:2 }; } },
        { name:'Brine Energizer', cost:27000, desc:'Reactor +4 damage (+20 to vehicles) and reaches further. Abilities of appliances in range recharge 25% faster.', apply:s=>{ const r=s.atk.reactor; r.dmg += 4; r.bonusBig += 18; r.rangeMul = 0.85; s.buff = Object.assign(s.buff || {}, { energize:0.25 }); } },
      ]},
      { name:'Missiles', ups:[
        { name:'Barbed Pickles', cost:400, desc:'Pickles hit 2 more pests and deal +2 to vehicles.', apply:s=>{ const a=s.atk.main; a.pierce += 2; a.bonusBig = (a.bonusBig||0) + 2; } },
        { name:'Spicy Pickles', cost:550, desc:'+1 damage. Spicy pickles deal heat damage and set pests burning.', apply:s=>{ const a=s.atk.main; a.dmg += 1; a.type = 'heat'; a.burn = { dmg:1, tick:0.5, dur:2 }; } },
        { name:'Mustard Missile', cost:1400, desc:'Adds a mustard missile that seeks the toughest pest: 4 damage in a blast, +10 to vehicles.', apply:s=>{ s.atk.missile = { kind:'proj', rate:1.5, dmg:0, pierce:1, speed:480, size:8, type:'blast', sprite:'mustard', homing:true, targetBig:true, lifeMul:2.2, rangeMul:1.6, explode:{ r:42, dmg:4, pierce:20, type:'blast', bonusBig:10 }, expireExplode:true }; } },
        { name:'First Strike', cost:12500, desc:'Missiles +4 damage. Ability: First Strike sends a giant mustard missile at the toughest vehicle for 8,000.', apply:s=>{ s.atk.missile.explode.dmg += 4; s.abilities.push({ id:'mustard', cd:40, dmg:8000 }); } },
        { name:'Pre-emptive Strike', cost:30000, desc:'3 missiles per launch. Every vehicle that enters the kitchen takes a missile for 1,500. First Strike hits for 12,000 every 30s.', apply:s=>{ const m=s.atk.missile; m.count = 3; m.spread = 0.5; s.preempt = 1500; const ab = s.abilities.find(x=>x.id==='mustard'); ab.cd = 30; ab.dmg = 12000; } },
      ]},
      { name:'Guns', ups:[
        { name:'Twin Pickles', cost:300, desc:'Fires 50% faster.', apply:s=>{ s.atk.main.rate /= 1.5; } },
        { name:'Airburst Pickles', cost:900, desc:'Pickles burst into 3 pickle slices.', apply:s=>{ s.atk.main.split = { count:3, dmg:1, pierce:1, speed:420, life:0.3, size:4, scale:0.6, type:'sharp', sprite:'pickle' }; } },
        { name:'Triple Decker', cost:1100, desc:'Fires 35% faster, 2 pickles at a time.', apply:s=>{ const a=s.atk.main; a.rate /= 1.35; a.count = Math.max(2, a.count); } },
        { name:'Armor-Piercing', cost:3200, desc:'+3 damage, 2 more pests, +3 to vehicles, and pickles cut through shells.', apply:s=>{ const a=s.atk.main; a.dmg += 3; a.pierce += 2; a.bonusBig = (a.bonusBig||0) + 3; a.type = 'normal'; if (a.split){ a.split.dmg += 2; a.split.type = 'normal'; } } },
        { name:'Sub Commander', cost:24000, desc:'4 pickles a shot, 40% faster, +12 damage (+12 to vehicles) and 3 more pests; slices +6. Every other Sub Sandwich in range deals +1 damage and hits 2 more pests.', apply:s=>{ const a=s.atk.main; a.dmg += 12; a.count = 4; a.rate /= 1.4; a.pierce += 3; a.bonusBig = (a.bonusBig||0) + 12; if (a.split) a.split.dmg += 6; s.buff = Object.assign(s.buff || {}, { dmg:1, pierce:2, only:'sub' }); } },
      ]},
    ],
    paragon:{ name:'Nautical Hoagie Core', cost:300000, desc:'A nuclear hoagie with two modes. Surfaced, it fires homing pickle storms and meets every vehicle at the door with a missile. Submerged, its reactor scours cloaks and mold off everything nearby, every ability on the map recharges faster and head chefs in range hit three times as hard.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:240, camo:true, preempt:Math.round((8000+dd*800)*big), dive:{ buff:{ energize:0.35, global:true }, hero:3 }, atk:{
        main:{ kind:'proj', rate:0.06/k, dmg:22+dd*2, pierce:Math.round(12*k), speed:700, size:7, type:'normal', sprite:'pickle', homing:true, count:5, spread:0.22, ignoreImmune:true, bonusBig:Math.round((40+dd*4)*big), split:{ count:4, dmg:12+dd, pierce:4, speed:420, life:0.3, size:4, scale:0.6, type:'normal', sprite:'pickle' } },
        reactor:{ kind:'pulse', rate:0.12/k, dmg:90+dd*9, pierce:Math.round(300*k), type:'normal', rangeMul:1, color:'#9be15d', decamo:true, demold:true, ignoreImmune:true, bonusBig:Math.round((180+dd*18)*big) },
        missile:{ kind:'proj', rate:0.4/k, dmg:0, pierce:1, speed:540, size:9, type:'normal', sprite:'mustard', homing:true, targetBig:true, count:3, spread:0.5, lifeMul:2.4, rangeMul:1.6, explode:{ r:60, dmg:60+dd*6, pierce:40, type:'normal', bonusBig:Math.round((800+dd*80)*big) }, expireExplode:true },
      }, abilities:[{ id:'mustard', cd:20, dmg:Math.round((40000+dd*4000)*big) }, { id:'finale', cd:150, startFull:true, wait:15, dmg:Math.round((60000+dd*6000)*big), small:6000+dd*600, r:200, pierce:30, after:{ dmg:3000+dd*300, bonusBig:Math.round((15000+dd*1500)*big), r:420, pierce:120, stun:15 }, pools:{ n:5, dur:36, dmg:10+dd, bonusBig:90 } }] }; } },
  },

  /* ------------------------------------------------------ WHISK COPTER */
  heli: {
    name:'Whisk Copter', cost:1500, size:20, hot:'K', faction:'fleet', flyer:'copter',
    blurb:'A whisk-rotor helicopter that flies from its pad to wherever you point, or patrols by itself, firing kebab skewers. Pick how it flies in its panel.',
    base:{ range:184, atk:{ main:{ kind:'proj', rate:0.57, dmg:1, pierce:3, speed:640, size:6, type:'sharp', sprite:'skewer', count:2, spread:0.12 } } },
    paths:[
      { name:'Rotors', ups:[
        { name:'Quad Skewers', cost:800, desc:'Fires 4 skewers at once.', apply:s=>{ const a=s.atk.main; a.count = Math.max(4, a.count); a.spread = 0.1; } },
        { name:'Pursuit', cost:500, desc:'Unlocks Pursuit: it hunts pests anywhere on the map. Skewers hit 1 more pest.', apply:s=>{ s.chase = true; s.atk.main.pierce += 1; } },
        { name:'Razor Whisks', cost:1850, desc:'Spinning razor whisks slice up to 8 pests right below it for 2, four times a second.', apply:s=>{ s.atk.rotor = { kind:'pulse', rate:0.25, dmg:2, pierce:8, type:'sharp', vfx:'whirl', rangeAbs:46 }; } },
        { name:'Apache Whisk', cost:19600, desc:'Adds a pepper cannon (2 damage, 20 shots a second) and homing chili rockets that blast for 6. Skewers +2 damage.', apply:s=>{ s.atk.gun = { kind:'proj', rate:0.05, dmg:2, pierce:2, speed:900, size:5, type:'normal', sprite:'shape', shape:'orb', color:'#ffd27a', glow:true, inacc:0.06 }; s.atk.missiles = { kind:'proj', rate:1.0, dmg:0, pierce:1, speed:480, size:7, type:'blast', sprite:'chili', homing:true, count:2, spread:0.5, lifeMul:1.8, explode:{ r:38, dmg:6, pierce:15, type:'blast', bonusBig:15 }, expireExplode:true }; s.atk.main.dmg += 2; } },
        { name:'Apache Prime', cost:45000, desc:'A searing plasma cannon (+12 damage, +6 to vehicles) that burns through every immunity. Rockets +20 (+60 to vehicles), skewers +6, razor whisks +6.', apply:s=>{ const g=s.atk.gun; g.dmg += 12; g.pierce += 2; g.bonusBig = (g.bonusBig||0) + 6; g.ignoreImmune = true; g.color = '#ff5a2a'; const m=s.atk.missiles; m.explode.dmg += 20; m.explode.bonusBig += 60; s.atk.main.dmg += 6; if (s.atk.rotor) s.atk.rotor.dmg += 6; } },
      ]},
      { name:'Lift', ups:[
        { name:'Bigger Jets', cost:300, desc:'Flies 60% faster.', apply:s=>{ s.flySpeed = 1.6; } },
        { name:'Night Vision', cost:600, desc:'Spots ghost pests.', apply:s=>{ s.camo = true; } },
        { name:'Downdraft', cost:3500, desc:'Rotor wash blows small pests below it back along the trail.', apply:s=>{ s.atk.draft = { kind:'pulse', rate:0.6, dmg:0, pierce:12, type:'normal', knock:22, rangeAbs:70, vfx:'whirl', color:'#e6f4ff' }; } },
        { name:'Support Chinook', cost:9500, desc:'Skewers +1 damage. Ability: Chinook Drop delivers a crate of $1,200 and 10 lives.', apply:s=>{ s.atk.main.dmg += 1; s.abilities.push({ id:'chinook', cd:50, cash:1200, lives:10 }); } },
        { name:'Special Poperations', cost:30000, desc:'Skewers +3 damage. Ability: Tactical Drop lands a commando who fires 10 times a second for 15s (120 damage a shot). Chinook Drop brings twice as much.', apply:s=>{ s.atk.main.dmg += 3; s.atk.main.pierce += 2; s.abilities.push({ id:'tactical', cd:40, dur:15, dmg:120, rate:0.1, r:200 }); const ab = s.abilities.find(x=>x.id==='chinook'); ab.cash *= 2; ab.lives *= 2; } },
      ]},
      { name:'Blades', ups:[
        { name:'Faster Skewers', cost:250, desc:'Skewers fly 40% faster and hit 1 more pest.', apply:s=>{ const a=s.atk.main; a.speed *= 1.4; a.pierce += 1; } },
        { name:'Faster Firing', cost:350, desc:'Fires 33% faster.', apply:s=>{ s.atk.main.rate /= 1.33; } },
        { name:'Vehicle Shove', cost:3400, desc:'Downward thrust shoves vehicles under it backwards and slows them to 60% speed (bosses 80%).', apply:s=>{ s.atk.shove = { kind:'pulse', rate:0.3, dmg:0, pierce:3, type:'normal', bigOnly:true, bigKnock:6, slow:{ mult:1, bigMult:0.6, dur:0.4 }, rangeAbs:60, ignoreImmune:true, vfx:'whirl', color:'#c9d6dc' }; } },
        { name:'Comanche Defense', cost:8500, desc:'Three mini-copters fly escort and fire skewers: 2 damage, 2 pests each.', apply:s=>{ s.atk.minis = { kind:'drones', rate:0.35, count:3, orbit:42, dmg:2, pierce:2, speed:700, size:5, type:'sharp', sprite:'skewer', droneLook:'mini' }; } },
        { name:'Comanche Commander', cost:35000, desc:'A fourth mini-copter joins; they fire 3× as fast for +6 damage, hit 2 more pests and cut shells. Skewers +4 damage.', apply:s=>{ const m=s.atk.minis; m.count = 4; m.rate /= 3; m.dmg += 6; m.pierce += 2; m.type = 'normal'; s.atk.main.dmg += 4; } },
      ]},
    ],
    paragon:{ name:'Whisk Armada', cost:320000, desc:'A thundering gunship: skewer storms, a plasma cannon, rocket swarms and razor rotors. Escort copters join its wing one at a time, up to eight, and fly with it until it sends them on a strafing run.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:260, camo:true, flySpeed:2, chase:true, atk:{
        main:{ kind:'proj', rate:0.05/k, dmg:20+dd*2, pierce:Math.round(8*k), speed:900, size:6, type:'normal', sprite:'skewer', count:6, spread:0.08, ignoreImmune:true, bonusBig:Math.round((20+dd*2)*big) },
        gun:{ kind:'proj', rate:0.02/k, dmg:24+dd*2, pierce:4, speed:1100, size:5, type:'normal', sprite:'shape', shape:'orb', color:'#ff5a2a', glow:true, inacc:0.05, ignoreImmune:true, bonusBig:Math.round(30*big) },
        missiles:{ kind:'proj', rate:0.35/k, dmg:0, pierce:1, speed:520, size:8, type:'normal', sprite:'chili', homing:true, count:4, spread:0.45, lifeMul:2, explode:{ r:56, dmg:70+dd*7, pierce:40, type:'normal', bonusBig:Math.round((300+dd*30)*big) }, expireExplode:true },
        rotor:{ kind:'pulse', rate:0.12/k, dmg:40+dd*4, pierce:30, type:'normal', vfx:'whirl', rangeAbs:62, ignoreImmune:true },
        minis:{ kind:'drones', need:'wing', rate:0.08/k, count:6, orbit:56, dmg:30+dd*3, pierce:4, speed:820, size:5, type:'normal', sprite:'skewer', droneLook:'mini', ignoreImmune:true },
      }, wing:{ max:8, every:4 },
      abilities:[{ id:'strafe', cd:30, dmg:1500+dd*150, bonusBig:Math.round((4000+dd*400)*big), r:46 }, { id:'chinook', cd:40, cash:6000, lives:25 }] }; } },
  },

  /* ----------------------------------------------------- FLYING SAUCER */
  saucer: {
    name:'Flying Saucer', cost:800, size:19, hot:'L', faction:'fleet', flyer:'saucer',
    blurb:'A saucer that loops over the kitchen, spraying sprinkles in every direction. Pick its flight path in its panel.',
    base:{ range:200, atk:{ main:{ kind:'radial', rate:1.68, count:8, dmg:1, pierce:5, speed:520, type:'sharp', sprite:'sprinkle', size:5 } } },
    paths:[
      { name:'Sprinkles', ups:[
        { name:'Rapid Sprinkles', cost:450, desc:'Sprays 40% faster.', apply:s=>{ s.atk.main.rate /= 1.4; } },
        { name:'Lots More Sprinkles', cost:550, desc:'12 sprinkles per spray.', apply:s=>{ s.atk.main.count = Math.max(12, s.atk.main.count); } },
        { name:'Fighter Saucer', cost:1000, desc:'Adds homing jelly-bean missiles, 3 a volley, that blast for 3 (+8 to vehicles).', apply:s=>{ s.atk.missiles = { kind:'proj', rate:1.2, dmg:0, pierce:1, speed:520, size:7, type:'blast', sprite:'bean', homing:true, count:3, spread:0.5, lifeMul:1.8, explode:{ r:34, dmg:3, pierce:12, type:'blast', bonusBig:8 }, expireExplode:true }; } },
        { name:'Sprinkle Storm', cost:3300, desc:'16 sprinkles, 50% faster, +1 damage.', apply:s=>{ const a=s.atk.main; a.count = Math.max(16, a.count); a.rate /= 1.5; a.dmg += 1; } },
        { name:'Sky Shredder', cost:42500, desc:'32 sprinkles, 50% faster again, +4 damage and 5 more pests each. Missiles +8.', apply:s=>{ const a=s.atk.main; a.count = 32; a.rate /= 1.5; a.dmg += 4; a.pierce += 5; s.atk.missiles.explode.dmg += 8; } },
      ]},
      { name:'Bombs', ups:[
        { name:'Meatball Drop', cost:200, desc:'Drops a meatball bomb on pests below it every 2.5s: 3 damage to 20 pests.', apply:s=>{ s.atk.drop = { kind:'lob', drop:true, rangeAbs:75, rate:2.5, travel:0.55, type:'blast', sprite:'meatball', impact:{ r:44, dmg:3, pierce:20, type:'blast' } }; } },
        { name:'Spy Saucer', cost:350, desc:'Spots ghost pests.', apply:s=>{ s.camo = true; } },
        { name:'Bomber Saucer', cost:900, desc:'Drops 3 bigger meatballs every 1.6s for +2 damage.', apply:s=>{ const d=s.atk.drop; d.count = 3; d.rate = 1.6; d.impact.r *= 1.3; d.impact.dmg += 2; d.rangeAbs = 90; } },
        { name:'Ground Zest', cost:16000, desc:'Meatballs +4 damage. Ability: Ground Zest hits every pest on screen for 1,000 (3,000 to vehicles).', apply:s=>{ s.atk.drop.impact.dmg += 4; s.abilities.push({ id:'zest', cd:50, dmg:1000, big:3000 }); } },
        { name:'Tsar Bonbon', cost:26000, desc:'Meatballs +10 damage (+30 to vehicles). Ability: Tsar Bonbon hits every pest on screen for 12,000 and stuns them for 3s.', apply:s=>{ const im=s.atk.drop.impact; im.dmg += 10; im.bonusBig = (im.bonusBig||0) + 30; const i = s.abilities.findIndex(x=>x.id==='zest'); s.abilities.splice(i < 0 ? s.abilities.length : i, 1, { id:'tsar', cd:50, dmg:12000, big:12000, stun:3 }); } },
      ]},
      { name:'Aim', ups:[
        { name:'Sharper Sprinkles', cost:500, desc:'Sprinkles hit 3 more pests.', apply:s=>{ s.atk.main.pierce += 3; } },
        { name:'Tight Loop', cost:550, desc:'Unlocks the Tight flight path. +30% range.', apply:s=>{ s.tight = true; s.range *= 1.3; } },
        { name:'Never-Miss Sprinkles', cost:2550, desc:'Sprinkles home in on pests.', apply:s=>{ s.atk.main.homing = true; } },
        { name:'Spectre Saucer', cost:23400, desc:'Adds a sprinkle gun firing 2 homing shots every 0.06s, and homing meatball bombs that blast for 6 (+20 to vehicles).', apply:s=>{ s.atk.gun = { kind:'proj', rate:0.06, dmg:2, pierce:3, speed:760, size:5, type:'normal', sprite:'sprinkle', homing:true, count:2, spread:0.3 }; s.atk.bombs = { kind:'proj', rate:0.5, dmg:0, pierce:1, speed:420, size:9, type:'blast', sprite:'meatball', homing:true, lifeMul:1.8, explode:{ r:40, dmg:6, pierce:20, type:'blast', bonusBig:20 }, expireExplode:true }; } },
        { name:'Flying Fortress', cost:90000, desc:'Four gun barrels for +8 damage, two bombs a volley for +16 (+60 to vehicles) that cut shells, sprinkles +3, and it sees ghosts.', apply:s=>{ const g=s.atk.gun; g.count = 4; g.dmg += 8; g.spread = 0.4; const b=s.atk.bombs; b.count = 2; b.spread = 0.4; b.type = 'normal'; b.explode.dmg += 16; b.explode.bonusBig += 60; b.explode.type = 'normal'; s.atk.main.dmg += 3; s.camo = true; } },
      ]},
    ],
    paragon:{ name:'Galactic Doomsaucer', cost:400000, desc:'A mothership raining homing sprinkle storms, gunfire and meatball bombs. Its tractor beam lifts small pests right off the trail into its hold, to be dropped back as bombs.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:260, camo:true, tight:true, flySpeed:1.2, atk:{
        main:{ kind:'radial', rate:0.12/k, count:32, dmg:20+dd*2, pierce:Math.round(12*k), speed:640, type:'normal', sprite:'sprinkle', size:5, homing:true, ignoreImmune:true, bonusBig:Math.round((20+dd*2)*big) },
        gun:{ kind:'proj', rate:0.03/k, dmg:26+dd*3, pierce:6, speed:900, size:5, type:'normal', sprite:'sprinkle', homing:true, count:4, spread:0.3, ignoreImmune:true, bonusBig:Math.round(40*big) },
        bombs:{ kind:'proj', rate:0.25/k, dmg:0, pierce:1, speed:420, size:10, type:'normal', sprite:'meatball', scale:1.3, homing:true, count:3, spread:0.6, lifeMul:2, explode:{ r:70, dmg:120+dd*12, pierce:60, type:'normal', bonusBig:Math.round((600+dd*60)*big) }, expireExplode:true },
        drop:{ kind:'lob', drop:true, rangeAbs:100, rate:0.6/k, travel:0.5, count:4, type:'normal', sprite:'meatball', ignoreImmune:true, impact:{ r:70, dmg:200+dd*20, pierce:60, type:'normal', bonusBig:Math.round((800+dd*80)*big) } },
      }, tractor:{ every:1.2/k, r:90, max:40 },
      abilities:[{ id:'bombers', cd:60, per:8, dmg:Math.round((25000+dd*2500)*big), small:5000+dd*500, r:110, pierce:150, stun:8 }] }; } },
  },

  /* --------------------------------------------------------- ESPRESSO */
  espresso: {
    name:'Espresso Machine', cost:1200, size:22, hot:'D', faction:'support',
    blurb:'Its aroma gives nearby towers 10% more range. Upgrades caffeinate them, steam the pests or brew up cash. Does not attack on its own.',
    base:{ range:175, noTarget:true, atk:{}, buff:{ range:1.1 } },
    paths:[
      { name:'Caffeine', ups:[
        { name:'Double Shot', cost:400, desc:'+15% radius. Nearby towers attack 10% faster.', apply:s=>{ s.range *= 1.15; s.buff.speed = 1.1; } },
        { name:'Ristretto', cost:1500, desc:'Nearby towers attack 15% faster and hit 1 more pest.', apply:s=>{ s.buff.speed = 1.15; s.buff.pierce = 1; } },
        { name:'Espresso Bar', cost:800, desc:'Nearby towers get +22% range.', apply:s=>{ s.buff.range = 1.22; } },
        { name:'Triple Shot', cost:2500, desc:'Nearby towers deal +1 damage.', apply:s=>{ s.buff.dmg = 1; } },
        { name:'Caffeine Rush', cost:25000, desc:'Nearby towers attack 25% faster. Ability: every tower on the map attacks twice as fast for 10s.', apply:s=>{ s.buff.speed = 1.25; s.abilities.push({ id:'rush', cd:50, dur:10, mult:2 }); } },
      ]},
      { name:'Barista', ups:[
        { name:'Tip Jar', cost:320, desc:'Earns $70 each round.', apply:s=>{ s.income = 70; } },
        { name:'Latte Art', cost:520, desc:'Towers bought or upgraded in range cost 10% less.', apply:s=>{ s.buff.discount = 0.1; } },
        { name:'Café', cost:2600, desc:'Earns $300 each round. The discount rises to 15%.', apply:s=>{ s.income = 300; s.buff.discount = 0.15; } },
        { name:'Coffee Franchise', cost:8300, desc:'Earns $1,000 each round.', apply:s=>{ s.income = 1000; } },
        { name:'Coffee Empire', cost:32000, desc:'Earns $3,200 each round. Every tower sells for 10% more.', apply:s=>{ s.income = 3200; s.sellBonus = 0.1; } },
      ]},
      { name:'Steam', ups:[
        { name:'Steam Wand', cost:250, desc:'Towers in range can spot ghost pests.', apply:s=>{ s.buff.camo = true; } },
        { name:'Hot Steam', cost:2000, desc:'Steam bursts deal 2 to up to 20 pests in range and strip ghost cloaks.', apply:s=>{ s.atk.steam = { kind:'pulse', rate:0.6, dmg:2, pierce:20, type:'heat', decamo:true, vfx:'steam' }; } },
        { name:'Pressure Vent', cost:7500, desc:'Towers in range ignore every immunity.', apply:s=>{ s.buff.allTypes = true; } },
        { name:'Boiler', cost:20000, desc:'Steam deals +4, strips mold, and makes pests take +1 damage. Ability: Full Steam makes every tower in range attack 60% faster for 12s.', apply:s=>{ const st=s.atk.steam; st.rate = 0.5; st.dmg += 4; st.demold = true; st.vuln = { amt:1, dur:2 }; s.abilities.push({ id:'steamup', cd:45, dur:12, mult:1.6 }); } },
        { name:'Steam Engine', cost:40000, desc:'Steam deals +20 (+25 to vehicles) to 55 pests. Towers in range attack 20% faster. Full Steam reaches every tower on the map at 2× speed for 15s.', apply:s=>{ const st=s.atk.steam; st.dmg += 20; st.bonusBig = (st.bonusBig||0) + 25; st.pierce += 35; s.buff.speed = Math.max(s.buff.speed || 1, 1.2); const ab = s.abilities.find(x=>x.id==='steamup'); ab.global = true; ab.mult = 2; ab.dur = 15; } },
      ]},
    ],
    paragon:{ name:'The Bottomless Cup', cost:200000, desc:'Every appliance on the map gets ghost sight, ignores immunities and pays 20% less. Pick its house blend for the rest: Espresso for speed, Americano for reach, Mocha for damage, or Cold Brew for faster abilities.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:9999, global:true, camo:true, atk:{
        steam:{ kind:'pulse', rate:0.35/k, dmg:110+dd*12, pierce:Math.round(150*k), type:'normal', rangeAbs:230, bonusBig:Math.round((280+dd*30)*big), decamo:true, demold:true, vuln:{ amt:3, dur:2 }, vfx:'steam' },
      }, buff:{ speed:1, camo:true, allTypes:true, discount:0.2 }, income:5000+dd*500,
      blends:{ espresso:{ speed:1.45 + deg*0.002 }, americano:{ range:1.3, pierce:3, speed:1.1 }, mocha:{ dmg:4, speed:1.1 }, coldbrew:{ energize:0.4, speed:1.15 } },
      abilities:[{ id:'refill', cd:45, dur:12 }] }; } },
  },

  /* ------------------------------------------------------------ BREAD */
  bread: {
    name:'Bread Machine', cost:1250, size:20, hot:'F', faction:'support',
    blurb:'Bakes loaves each round. Hover or tap loaves to sell them before they go stale.',
    base:{ range:60, noTarget:true, atk:{}, bread:{ loaves:4, value:20 } },
    paths:[
      { name:'Batch Size', ups:[
        { name:'Bigger Pan', cost:500, desc:'Bakes 6 loaves a round.', apply:s=>{ s.bread.loaves += 2; } },
        { name:'Twin Paddles', cost:600, desc:'Bakes 8 loaves a round.', apply:s=>{ s.bread.loaves += 2; } },
        { name:'Bakery', cost:3000, desc:'12 loaves a round, +$5 each.', apply:s=>{ s.bread.loaves += 4; s.bread.value += 5; } },
        { name:'Industrial Bakery', cost:19000, desc:'16 artisan loaves a round, +$110 each.', apply:s=>{ s.bread.loaves += 4; s.bread.value += 110; } },
        { name:'Bread Empire', cost:100000, desc:'20 golden loaves a round worth $400 each.', apply:s=>{ s.bread.loaves = 20; s.bread.value = 400; s.bread.golden = true; } },
      ]},
      { name:'Sourdough', ups:[
        { name:'Starter Culture', cost:300, desc:'+$5 per loaf.', apply:s=>{ s.bread.value += 5; } },
        { name:'Rising Dough', cost:800, desc:'+$5 per loaf.', apply:s=>{ s.bread.value += 5; } },
        { name:'Sourdough Bank', cost:3650, desc:'Loaves go into a bank that holds $7,000 and grows 15% each round. Withdraw any time.', apply:s=>{ s.bread.bank = { cap:7000, rate:0.15 }; } },
        { name:'Proofing Vault', cost:7200, desc:'The bank holds $16,000 and grows 20% each round.', apply:s=>{ s.bread.bank = { cap:16000, rate:0.2 }; } },
        { name:'Bread Exchange', cost:100000, desc:'The bank holds $100,000, grows 25% and adds $5,000 every round.', apply:s=>{ s.bread.bank = { cap:100000, rate:0.25, bonus:5000 }; } },
      ]},
      { name:'Delivery', ups:[
        { name:'Crusty Loaves', cost:250, desc:'+$5 per loaf.', apply:s=>{ s.bread.value += 5; } },
        { name:'Delivery Bike', cost:400, desc:'Loaves are collected automatically.', apply:s=>{ s.bread.auto = true; } },
        { name:'Market Stall', cost:2900, desc:'+$10 per loaf and $100 every round.', apply:s=>{ s.bread.value += 10; s.income = (s.income||0) + 100; } },
        { name:'Delivery Network', cost:15000, desc:'+$500 a round for every Bread Machine you own. All Bread Machines bake 15% richer loaves.', apply:s=>{ s.bread.network = 500; s.bread.valueBuff = 0.15; } },
        { name:'Bread Monopoly', cost:60000, desc:'+$4,000 every round. All Bread Machines bake 25% richer loaves.', apply:s=>{ s.income = (s.income||0) + 4000; s.bread.valueBuff = 0.25; } },
      ]},
    ],
    paragon:{ name:'Golden Bakery Empire', cost:260000, desc:'Bakes golden loaves into a vault and trades them on the Bread Exchange, where the price moves every few seconds: sell when it is high. Baguette missiles hunt vehicles, and the empire pays out every round.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:9999, global:true, camo:true, atk:{
        loaf:{ kind:'proj', rate:0.5/k, dmg:0, pierce:1, speed:620, size:12, type:'normal', sprite:'baguette', homing:true, targetBig:true, lifeMul:3, explode:{ r:70, dmg:150+dd*15, pierce:40, type:'normal', bonusBig:Math.round((2200+dd*250)*big) } },
      }, bread:{ loaves:24, value:400+dd*20, auto:true, golden:true, vault:true }, income:6000+dd*600, market:{ every:4, lo:0.4, hi:2.5, cap:240 },
      abilities:[{ id:'marketday', cd:60, mult:2 }] }; } },
  },

  /* ------------------------------------------------------- MANDOLINE */
  mandoline: {
    name:'Mandoline', cost:400, size:17, hot:'[', code:'BracketLeft', faction:'prep',
    blurb:'A spring-loaded slicer that flings star-cut carrot slices. Quick, and it spots ghost pests from the start.',
    base:{ range:175, camo:true, atk:{ main:{ kind:'proj', rate:0.62, dmg:1, pierce:2, speed:640, size:6, type:'sharp', sprite:'star', count:1, spread:0.16 } } },
    paths:[
      { name:'Julienne', ups:[
        { name:'Quick Hands', cost:350, desc:'Slices 40% faster, with 10% more range.', apply:s=>{ s.atk.main.rate /= 1.4; s.range *= 1.1; } },
        { name:'Sharp Stars', cost:350, desc:'Stars cut through 4 pests.', apply:s=>{ s.atk.main.pierce += 2; } },
        { name:'Double Slice', cost:900, desc:'Throws 2 stars at once.', apply:s=>{ s.atk.main.count = 2; } },
        { name:'Brunoise Barrage', cost:2750, desc:'Throws 5 stars at once, +1 damage.', apply:s=>{ const a=s.atk.main; a.count = 5; a.spread = 0.13; a.dmg += 1; } },
        { name:'Grand Mandoline', cost:35000, desc:'Throws 8 golden stars at once, 60% faster, with +4 damage, +4 pierce and +6 to vehicles. They cut through shells.', apply:s=>{ const a=s.atk.main; a.count = 8; a.spread = 0.11; a.dmg += 4; a.pierce += 4; a.bonusBig = (a.bonusBig||0) + 6; a.rate /= 1.6; a.type = 'normal'; a.sprite = 'goldstar'; s.range *= 1.1; } },
      ]},
      { name:'Misdirection', ups:[
        { name:'Distraction', cost:250, desc:'Pests its stars hit sometimes lose their way and stumble back along the trail.', apply:s=>{ s.atk.main.distract = { chance:0.15, dist:55 }; } },
        { name:'Peel Away', cost:400, desc:'Stars peel the ghost cloak off every pest they hit. +1 pierce.', apply:s=>{ s.atk.main.decamo = true; s.atk.main.pierce += 1; } },
        { name:'Kitchen Brigade', cost:1200, desc:'Every Mandoline in its range, itself included, throws 8% faster with 8% more pierce for each Kitchen Brigade around it (up to 20).', apply:s=>{ s.brigade = true; } },
        { name:'Soy Sabotage', cost:5200, desc:'+1 damage. Ability: for 15s every pest on the map moves at half speed (bosses lose a quarter of theirs).', apply:s=>{ s.atk.main.dmg += 1; s.abilities.push({ id:'sabotage', cd:60, dur:15, slow:0.5 }); } },
        { name:'Grand Saboteur', cost:22000, desc:'Throws 2 stars at once with +3 damage, +2 pierce and +4 to vehicles, and 25% more range. Sabotage lasts 25s, every Mandoline throws 30% faster while it lasts, and vehicles that arrive during it start with 25% less health.', apply:s=>{ const a=s.atk.main; s.range *= 1.25; a.count = Math.max(a.count, 2); a.dmg += 3; a.pierce += 2; a.bonusBig = (a.bonusBig||0) + 4; const ab = s.abilities.find(x => x.id === 'sabotage'); if (ab){ ab.dur = 25; ab.weak = 0.25; ab.boost = 1.3; } } },
      ]},
      { name:'Wasabi', ups:[
        { name:'Seeking Stars', cost:300, desc:'Stars home in on pests. +10% range.', apply:s=>{ s.atk.main.homing = true; s.range *= 1.1; } },
        { name:'Toothpick Caltrops', cost:450, desc:'Scatters spiky toothpick caltrops on the trail in its range.', apply:s=>{ s.atk.caltrops = { kind:'trap', rate:4.4, count:1, r:12, dmg:1, pierce:6, life:10, type:'sharp', sprite:'caltrop' }; } },
        { name:'Wasabi Flash', cost:2250, desc:'Every 4th throw is a wasabi flash bomb that stuns small pests for 1s. Stars do +1 damage to stunned or frozen pests.', apply:s=>{ const a=s.atk.main; a.stunBonus = (a.stunBonus||0) + 1; a.crit = { every:4, over:{ count:1, sprite:'flash', dmg:0, pierce:1, homing:true, explode:{ r:56, dmg:1, pierce:40, type:'normal', stun:1, stunBig:0 } } }; } },
        { name:'Sticky Wasabi', cost:5000, desc:'Also throws sticky wasabi at vehicles. It bursts a second later for 500 damage.', apply:s=>{ s.atk.sticky = { kind:'proj', rate:2.5, bigOnly:true, dmg:0, pierce:1, speed:560, size:7, type:'normal', sprite:'wasabi', homing:true, sticky:{ delay:1, dmg:500, ex:{ r:30, dmg:10, pierce:8, type:'normal', ignoreImmune:true } } }; } },
        { name:'Master Wasabi', cost:40000, desc:'Sticky wasabi twice as often, bursting for 2,000. Every other throw is a flash bomb that stuns vehicles too, and stars do +4 to stunned pests.', apply:s=>{ const a=s.atk.main, st=s.atk.sticky; if (st){ st.rate /= 1.8; st.sticky.dmg = 2000; Object.assign(st.sticky.ex, { r:44, dmg:60 }); } a.stunBonus += 3; if (a.crit){ a.crit.every = 2; Object.assign(a.crit.over.explode, { r:64, dmg:4, stunBig:0.5 }); } } },
      ]},
    ],
    paragon:{ name:'The Shadow Mandoline', cost:300000, desc:'Storms of golden stars, wasabi flash bombs and sticky wasabi, with a growing band of shadow clones that throw alongside it.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:250, camo:true, atk:{
        main:{ kind:'proj', rate:0.1/k, count:6, spread:0.12, dmg:16+dd*2, pierce:Math.round(14*k), speed:900, size:7, type:'normal', sprite:'goldstar', homing:true, decamo:true, bonusBig:Math.round((30+dd*4)*big), stunBonus:12+dd, distract:{ chance:0.08, dist:70 },
          crit:{ every:3, over:{ count:1, sprite:'flash', dmg:0, pierce:1, explode:{ r:80, dmg:30+dd*3, pierce:80, type:'normal', stun:1.2, stunBig:0.4 } } } },
        sticky:{ kind:'proj', rate:0.4/k, bigOnly:true, dmg:0, pierce:1, speed:640, size:8, type:'normal', sprite:'wasabi', homing:true, sticky:{ delay:0.8, dmg:Math.round((3000+dd*300)*big), ex:{ r:60, dmg:200+dd*20, pierce:30, type:'normal', ignoreImmune:true } } },
        clones:{ kind:'drones', need:'clones', count:1, droneLook:'shadow', orbit:62, orbitSpeed:1.1, rate:0.3/k, dmg:10+dd, pierce:8, speed:820, size:6, type:'normal', sprite:'star', homing:true, bonusBig:Math.round((20+dd*2)*big) },
        caltrops:{ kind:'trap', rate:1/k, count:2, r:14, dmg:8+dd, pierce:20, life:15, type:'normal', sprite:'caltrop' },
      }, clones:{ every:3, max:6 + Math.floor(dd / 2) }, abilities:[{ id:'smokebomb', cd:30, stun:2, vuln:8+dd, dur:6 }, { id:'shadowstrike', cd:50, dmg:Math.round((3000+dd*300)*big) }] }; } },
  },

  /* -------------------------------------------------- CONDIMENT CADDY */
  caddy: {
    name:'Condiment Caddy', cost:300, size:16, hot:']', code:'BracketRight', faction:'prep',
    blurb:'A spinning caddy of squeeze bottles. Fires quick double squirts of ketchup that land the moment they leave the nozzle.',
    base:{ range:180, atk:{ main:{ kind:'hitscan', rate:1.2, dmg:1, shots:2, type:'sharp', color:'#e2383f', wanted:true, squirt:true } } },
    paths:[
      { name:'Revolver', ups:[
        { name:'Quickdraw', cost:200, desc:'Fires up to 30% faster at pests far from it.', apply:s=>{ s.atk.main.quick = 0.3; } },
        { name:'Standoff', cost:200, desc:'Fires up to 35% faster when only a few pests are in its range.', apply:s=>{ s.atk.main.standoff = 0.35; } },
        { name:'Big Iron', cost:1200, desc:'A six-squirt revolver bottle: 6 squirts a volley, +1 damage, and Standoff speeds it up even more.', apply:s=>{ const a=s.atk.main; a.shots = 6; a.dmg += 1; a.rate *= 1.4; a.standoff = (a.standoff||0) + 0.15; } },
        { name:'Twin Sixes', cost:5800, desc:'Two six-squirt bottles: 12 squirts a volley for 4 damage each.', apply:s=>{ const a=s.atk.main; a.shots = 12; a.dmg += 2; } },
        { name:'The Blazing Sun', cost:16500, desc:'Hot sauce: every squirt does +6 damage and +8 to vehicles, hits any type and sets pests burning. Volleys come 40% faster.', apply:s=>{ const a=s.atk.main; a.dmg += 6; a.bonusBig = (a.bonusBig||0) + 8; a.type = 'normal'; a.ignoreImmune = true; a.burn = { dmg:4, tick:0.5, dur:3 }; a.rate /= 1.4; a.color = '#ff7a1a'; a.hot = true; } },
      ]},
      { name:'Sharpshooter', ups:[
        { name:'Eagle Eye', cost:150, desc:'Spots ghost pests. +10% range.', apply:s=>{ s.camo = true; s.range *= 1.1; } },
        { name:'Bullseye', cost:350, desc:'A squirt can land a bullseye for 4× damage: about 1 in 10 up close, 1 in 4 at the edge of its range.', apply:s=>{ s.atk.main.luck = { near:0.1, far:0.25, mul:4 }; } },
        { name:'Deadeye', cost:3000, desc:'Adds a long rifle bottle: 12 damage (+10 to vehicles) at the toughest pest within 160% of its range, through any shell. Ability: Take Aim.', apply:s=>{ s.atk.rifle = { kind:'hitscan', rate:2, dmg:12, bonusBig:10, type:'normal', ignoreImmune:true, mode:'strong', rangeMul:1.6, color:'#f2c230', wanted:true, rifle:true }; s.abilities.push({ id:'takeaim', cd:40, dur:20, range:1.25, max:6 }); } },
        { name:'Bounty Hunter', cost:6000, desc:'Its rifle marks up to 5 pests as Wanted: they take 50% more damage from everything and pay 3× cash when cooked, and every Caddy aims for them first. The rifle does +20 damage and fires 25% faster.', apply:s=>{ const r=s.atk.rifle; if (r){ r.dmg += 20; r.rate /= 1.25; r.mark = { max:5, mul:1.5, cash:3 }; } } },
        { name:'Golden Justice', cost:42000, desc:'Its rifle fires a golden shot clean across the kitchen through every pest in line: 150 damage, +450 to vehicles.', apply:s=>{ const r=s.atk.rifle; if (r) Object.assign(r, { kind:'beam', rate:1.6, dmg:150, bonusBig:450, pierce:9999, width:12, rangeAbs:1400, rangeMul:1, color:'#ffd166', gold:true }); s.range *= 1.1; } },
      ]},
      { name:'Shotgun', ups:[
        { name:'Lone Ranger', cost:220, desc:'Fires 40% faster with no other appliance within 130 px of it, 20% with one, 10% with two.', apply:s=>{ s.lone = true; } },
        { name:'Nomad', cost:280, desc:'Fires faster with more pests in range, up to 40% with five. When you lose lives it gets angry: +25% range and 25% faster for 10s.', apply:s=>{ s.atk.main.crowd = 0.08; s.nomad = { range:1.25, speed:1.25 }; } },
        { name:'Enforcer', cost:2100, desc:'Swaps its bottle for a mustard shotgun: 6 seeds a blast, 2 damage each, that knock small pests back.', apply:s=>{ const o=s.atk.main; s.atk.main = { kind:'proj', rate:1.1, dmg:2, pierce:2, count:6, spread:0.08, inacc:0.04, speed:900, size:4, lifeMul:0.6, rangeMul:0.85, type:'sharp', sprite:'seed', knock:14, quick:o.quick, standoff:o.standoff, crowd:o.crowd, wanted:true }; } },
        { name:'Avenger', cost:9500, desc:'8 seeds a blast for 4 damage each that burst into shrapnel and knock vehicles back too. When you lose lives it fires twice as fast for 10s.', apply:s=>{ const a=s.atk.main; a.count = 8; a.dmg += 2; a.frag = { count:3, dmg:2, pierce:2, speed:420, life:0.25, type:'sharp', sprite:'seed' }; a.bigKnock = 6; s.nomad = Object.assign({ range:1, speed:1 }, s.nomad, { speed:2 }); } },
        { name:'Hot Sauce Phantom', cost:31000, desc:'Every blast hits like a landmine: seeds burst for 20 around them, do +10 damage (+10 to vehicles), stun small pests briefly and slam vehicles back. Fires 30% faster.', apply:s=>{ const a=s.atk.main; a.dmg += 10; a.bonusBig = (a.bonusBig||0) + 10; a.burst = { r:36, dmg:20, pierce:8, type:'normal' }; a.stun = 0.3; a.bigKnock = 14; a.type = 'normal'; a.rate /= 1.3; a.sprite = 'hotseed'; } },
      ]},
    ],
    paragon:{ name:'The Sheriff of Sauce', cost:250000, desc:'Twin hot-sauce revolvers, a golden rifle that marks pests as Wanted and a landmine shotgun. Wanted pests pay big bounties, and each one it brings in carves a notch for High Noon.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:280, camo:true, atk:{
        main:{ kind:'hitscan', rate:0.1/k, shots:2, dmg:30+dd*3, bonusBig:Math.round((50+dd*5)*big), type:'normal', ignoreImmune:true, wanted:true, burn:{ dmg:10+dd, tick:0.5, dur:3 }, luck:{ near:0.15, far:0.3, mul:4 }, color:'#ff7a1a', hot:true, squirt:true },
        rifle:{ kind:'beam', rate:1.2/k, dmg:250+dd*25, bonusBig:Math.round((1500+dd*150)*big), pierce:9999, width:14, rangeAbs:1400, type:'normal', ignoreImmune:true, mode:'strong', color:'#ffd166', gold:true, mark:{ max:6, mul:2, cash:5 } },
        shotgun:{ kind:'proj', rate:0.7/k, count:10, spread:0.08, inacc:0.04, dmg:30+dd*3, pierce:4, speed:950, size:4, lifeMul:0.5, rangeMul:0.75, type:'normal', sprite:'hotseed', burst:{ r:45, dmg:60+dd*6, pierce:15, type:'normal' }, knock:30, bigKnock:12, stun:0.3 },
      }, abilities:[{ id:'fanhammer', cd:25, dur:6, mult:4 }, { id:'highnoon', cd:60, per:Math.round((800+dd*80)*big), base:3 }] }; } },
  },

  /* --------------------------------------------------------- SAUCEPAN */
  saucepan: {
    name:'Saucepan', cost:550, size:18, hot:';', code:'Semicolon', faction:'line',
    blurb:'Lobs ladles of hot vinegar that splash a crowd and keep eating at it. Upgrades brew tonics for other appliances or turn pests to gold.',
    base:{ range:190, atk:{ main:{ kind:'lob', rate:2, travel:0.5, sprite:'vinegar', impact:{ r:40, dmg:1, pierce:15, type:'normal', acid:{ dmg:1, tick:2, dur:4 } } } } },
    paths:[
      { name:'Brews', ups:[
        { name:'Bigger Pots', cost:250, desc:'Splashes 30% wider and over 7 more pests.', apply:s=>{ const i=s.atk.main.impact; i.r *= 1.3; i.pierce += 7; } },
        { name:'Vinegar Dip', cost:350, desc:'Every 5s it dips a nearby appliance in vinegar for 10s: that appliance hits any type of pest and does +2 damage to vehicles.', apply:s=>{ s.atk.brew = { kind:'brew', rate:5, n:1, dur:10, buff:{ allTypes:true, bigDmg:2 } }; } },
        { name:'Spicy Broth', cost:1400, desc:'Its brew also gives +1 damage, +2 pierce, +10% range and 10% faster attacks for 12s, to up to 3 appliances at a time.', apply:s=>{ const b=s.atk.brew; if (b){ b.n = 3; b.dur = 12; Object.assign(b.buff, { dmg:1, pierce:2, range:1.1, speed:1.1 }); } } },
        { name:'Ghost Pepper Broth', cost:2850, desc:'A fiercer brew every 4s: +2 damage, +3 pierce, +4 to vehicles, +15% range and 15% faster for 20s, to up to 4 appliances.', apply:s=>{ const b=s.atk.brew; if (b){ b.n = 4; b.dur = 20; b.rate = 4; Object.assign(b.buff, { dmg:2, pierce:3, range:1.15, speed:1.15, bigDmg:4 }); } } },
        { name:'Mother Sauce', cost:48000, desc:'Its brew never wears off: +3 damage, +5 pierce, +8 to vehicles, +20% range and 25% faster, to up to 5 appliances at a time. Ladles do +2 damage.', apply:s=>{ const b=s.atk.brew; if (b){ b.n = 5; b.rate = 3; b.perm = true; Object.assign(b.buff, { dmg:3, pierce:5, range:1.2, speed:1.25, bigDmg:8 }); } s.atk.main.impact.dmg += 2; } },
      ]},
      { name:'Reduction', ups:[
        { name:'Stronger Vinegar', cost:250, desc:'Vinegar eats at pests twice as hard and twice as often.', apply:s=>{ const ac=s.atk.main.impact.acid; ac.dmg *= 2; ac.tick /= 2; } },
        { name:'Pickling Brine', cost:475, desc:'+12 damage to vehicles, and it scrubs the armor off pests (halving their health).', apply:s=>{ const i=s.atk.main.impact; i.bonusBig = (i.bonusBig||0) + 12; i.strip = true; } },
        { name:'Unstable Soufflé', cost:2800, desc:'Coats vehicles in soufflé batter: when a coated vehicle is cooked it bursts, hitting everything near it for a tenth of its health plus 300.', apply:s=>{ const i=s.atk.main.impact; i.souffle = { pct:0.1, dmg:300, max:6000, r:110 }; i.bonusBig += 10; } },
        { name:'Transforming Tonic', cost:4200, desc:'Ability: it drinks its own tonic and becomes a sauce monster for 20s, firing a scalding beam.', apply:s=>{ s.atk.monster = { kind:'beam', needTb:'monster', rate:0.05, dmg:4, pierce:6, width:10, bonusBig:6, type:'normal', ignoreImmune:true, color:'#8fd16a', laser:true }; s.abilities.push({ id:'tonic', cd:60, dur:20 }); } },
        { name:'Total Transformation', cost:45000, desc:'Its beam does 16 damage (+30 to vehicles). Transforming Tonic also turns up to 5 nearby appliances into sauce monsters with beams of their own.', apply:s=>{ const m=s.atk.monster; if (m){ m.dmg = 16; m.bonusBig = 30; m.pierce = 10; m.width = 14; } const ab = s.abilities.find(x => x.id === 'tonic'); if (ab) ab.others = 5; s.monsterSpec = { kind:'beam', rate:0.05, dmg:10, pierce:8, width:10, bonusBig:20, type:'normal', ignoreImmune:true, color:'#8fd16a', laser:true }; } },
      ]},
      { name:'Gold Leaf', ups:[
        { name:'Faster Stirring', cost:650, desc:'Lobs 40% faster.', apply:s=>{ s.atk.main.rate /= 1.4; if (s.atk.brew) s.atk.brew.rate /= 1.25; } },
        { name:'Vinegar Puddle', cost:450, desc:'Every 5s it pours a puddle of vinegar on the trail that eats at everything walking through it.', apply:s=>{ s.atk.pool = { kind:'slick', rate:5, travel:0.5, sprite:'vinegar', puddle:{ r:34, dur:6, slow:1, bigSlow:1, sauce:{ dmg:1, tick:0.4 }, vinegar:true } }; } },
        { name:'Gold Leaf', cost:1000, desc:'Shell-backed pests it splashes (weevils and pillbugs) turn to gold: cooked on the spot, for $15 extra.', apply:s=>{ s.atk.main.impact.gild = 15; } },
        { name:'Midas Glaze', cost:2750, desc:'Glazes every pest it splashes: glazed pests lose all their immunities and pay 50% more cash when cooked. +1 damage.', apply:s=>{ const i=s.atk.main.impact; i.glaze = 1.5; i.dmg += 1; } },
        { name:'Master Reduction', cost:40000, desc:'Every 4th ladle is a reduction potion: small pests it splashes boil down into ants (vehicles and bosses resist). Lobs 20% faster, and puddles eat 5× as hard.', apply:s=>{ const a=s.atk.main; a.rate /= 1.2; a.crit = { every:4, over:{ sprite:'shrink', impact: Object.assign({}, a.impact, { shrink:true, r: a.impact.r * 1.2, pierce: a.impact.pierce + 10 }) } }; if (s.atk.pool) s.atk.pool.puddle.sauce.dmg *= 5; } },
      ]},
    ],
    paragon:{ name:'The Philosopher’s Stockpot', cost:240000, desc:'Gilding vinegar, a scalding sauce beam and brews for the whole kitchen. Every pest it cooks feeds the Philosopher’s Stone: when the stone is full, the next lob turns everything around it to gold.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:260, camo:true, atk:{
        main:{ kind:'lob', rate:0.45/k, count:3, travel:0.5, sprite:'vinegar', impact:{ r:70, dmg:50+dd*5, pierce:70, type:'normal', ignoreImmune:true, bonusBig:Math.round((150+dd*15)*big), acid:{ dmg:20+dd*2, tick:0.5, dur:4 }, glaze:2, gild:30, strip:true, souffle:{ pct:0.1, dmg:600, max:20000, r:130 } },
          crit:{ every:4, over:{ sprite:'shrink', impact:{ r:90, dmg:50+dd*5, pierce:90, type:'normal', ignoreImmune:true, shrink:true, glaze:2, acid:{ dmg:20+dd*2, tick:0.5, dur:4 } } } } },
        pool:{ kind:'slick', rate:1.2/k, travel:0.5, sprite:'vinegar', puddle:{ r:50, dur:8, slow:0.85, bigSlow:0.95, sauce:{ dmg:40+dd*4, tick:0.4 }, vinegar:true } },
        beam:{ kind:'beam', rate:0.05, dmg:30+dd*3, pierce:12, width:14, bonusBig:Math.round((60+dd*6)*big), type:'normal', ignoreImmune:true, color:'#8fd16a', laser:true },
        brew:{ kind:'brew', rate:2.5, n:6, dur:15, buff:{ dmg:3, pierce:5, range:1.2, speed:1.25, allTypes:true, bigDmg:10 } },
      }, stone:{ need:150, r:150, big:0.25, boss:0.04 }, abilities:[{ id:'transmute', cd:45, boss:0.1 }, { id:'elixir', cd:60, dur:20, buff:{ dmg:4, pierce:6, range:1.2, speed:1.4, bigDmg:12 } }] }; } },
  },

  /* ------------------------------------------------------- KITCHEN BOT */
  bot: {
    name:'Kitchen Bot', cost:350, size:17, hot:"'", code:'Quote', faction:'support',
    blurb:'A tinkering kitchen robot with a toothpick nail gun. Upgrades build sentries beside the trail, service the appliances around it, or lay pest traps that pay out.',
    base:{ range:175, atk:{ main:{ kind:'proj', rate:0.7, dmg:1, pierce:3, speed:700, size:5, type:'sharp', sprite:'toothpick' } } },
    paths:[
      { name:'Sentries', ups:[
        { name:'Shaker Sentry', cost:500, desc:'Every 10s it builds a salt shaker sentry beside the trail. Sentries fire for 25s.', apply:s=>{ s.atk.build = { kind:'build', rate:10, max:5, life:25, minion:{ looks:['salt'], specs:{ salt:{ kind:'proj', range:115, rate:0.95, dmg:1, pierce:2, speed:620, size:5, type:'sharp', sprite:'salt' } } } }; } },
        { name:'Faster Engineering', cost:400, desc:'Builds sentries twice as often.', apply:s=>{ if (s.atk.build) s.atk.build.rate /= 2; } },
        { name:'Sprockets', cost:575, desc:'It and its sentries fire twice as fast.', apply:s=>{ s.atk.main.rate /= 2; const b=s.atk.build; if (b) for (const k in b.minion.specs) b.minion.specs[k].rate /= 2; } },
        { name:'Sentry Expert', cost:2500, desc:'Builds four kinds of sentry in turn: salt (+3 to vehicles), pepper (explodes), frost (freezes) and spark (chains lightning). Up to 6 at once.', apply:s=>{ const b=s.atk.build, m = b ? (b.minion.specs.salt.rate < 0.9 ? 0.5 : 1) : 1; if (b){ b.max = 6; b.minion = { looks:['salt', 'pepper', 'frost', 'zap'], specs:{
          salt:{ kind:'proj', range:125, rate:0.95 * m, dmg:2, pierce:4, bonusBig:3, speed:660, size:5, type:'sharp', sprite:'salt' },
          pepper:{ kind:'proj', range:125, rate:1.3 * m, dmg:0, pierce:1, speed:520, size:6, type:'normal', sprite:'pepperball', explode:{ r:34, dmg:3, pierce:12, type:'blast' } },
          frost:{ kind:'proj', range:125, rate:1.1 * m, dmg:1, pierce:4, speed:560, size:6, type:'cold', sprite:'frostpellet', freeze:{ dur:0.8 } },
          zap:{ kind:'proj', range:125, rate:1.1 * m, dmg:2, pierce:2, speed:760, size:5, type:'energy', sprite:'spark', zap:{ dmg:2, type:'energy', chain:{ count:3, range:70 }, color:'#ffe08a' } } } }; } } },
        { name:'Sentry Champion', cost:32000, desc:'Builds champion sentries every 2.5s, up to 8: four times the damage, 50% faster, and each bursts for 150 when it runs down. Toothpicks +5 damage, +4 pierce.', apply:s=>{ const a=s.atk.main, b=s.atk.build; a.dmg += 5; a.pierce += 4; a.type = 'normal'; if (b){ b.rate = 2.5; b.max = 8; b.life = 30; b.champ = true; for (const k in b.minion.specs){ const sp = b.minion.specs[k]; sp.rate /= 1.5; sp.pierce += 6; if (sp.dmg) sp.dmg *= 4; if (sp.bonusBig) sp.bonusBig *= 4; if (sp.explode){ sp.explode.dmg *= 4; sp.explode.pierce += 10; } if (sp.zap) sp.zap.dmg *= 4; sp.boomOnEnd = { r:60, dmg:150, pierce:30, type:'normal', ignoreImmune:true }; } } } },
      ]},
      { name:'Service', ups:[
        { name:'Bigger Service Area', cost:250, desc:'+25% range: it reaches, and builds, farther.', apply:s=>{ s.range *= 1.25; } },
        { name:'Deconstruction', cost:350, desc:'Toothpicks do +2 damage to vehicles and pry the armor off pests (halving their health).', apply:s=>{ const a=s.atk.main; a.bonusBig = (a.bonusBig||0) + 2; a.strip = true; } },
        { name:'Dish Soap Foam', cost:800, desc:'Every 3.5s it sprays a patch of foam on the trail that slows pests, washes off ghost cloaks and mold, and stings for a little damage.', apply:s=>{ s.atk.foam = { kind:'slick', rate:3.5, travel:0.45, sprite:'foam', puddle:{ r:32, dur:6, slow:0.75, bigSlow:1, decamo:true, demold:true, foam:true, sauce:{ dmg:1, tick:0.5 } } }; } },
        { name:'Overclock', cost:13500, desc:'Ability: the appliance in its range that has done the most damage attacks 67% faster for 60s.', apply:s=>{ s.abilities.push({ id:'overclock', cd:45, dur:60, mult:1 / 0.6 }); } },
        { name:'Ultraboost', cost:72000, desc:'Overclock reaches the whole map and recharges in 35s, and every use leaves a permanent Ultraboost: 4% faster for good, up to 10 times on each appliance. Toothpicks +3 damage.', apply:s=>{ s.atk.main.dmg += 3; const ab = s.abilities.find(x => x.id === 'overclock'); if (ab){ ab.cd = 35; ab.global = true; ab.ultra = true; } } },
      ]},
      { name:'Traps', ups:[
        { name:'Oversize Toothpicks', cost:450, desc:'Toothpicks pierce 5 more pests.', apply:s=>{ s.atk.main.pierce += 5; s.atk.main.size = 6; } },
        { name:'Pin', cost:220, desc:'Toothpicks pin small pests in place for a moment.', apply:s=>{ s.atk.main.stun = 0.4; } },
        { name:'Double Gun', cost:450, desc:'Fires twice as fast.', apply:s=>{ s.atk.main.rate /= 2; } },
        { name:'Pest Trap', cost:3600, desc:'Sets a cage on the trail that catches pests whole (no vehicles) until it holds 500 lives’ worth, then pays out twice what they were worth. A new cage 12s later. Cages pay out at the end of every round too.', apply:s=>{ s.atk.trap = { kind:'catch', rate:12, cap:500, mult:2 }; } },
        { name:'XXXL Trap', cost:45000, desc:'A giant cage that holds 4,000 lives’ worth and catches cheese wheels, picnic baskets and midnight roaches too, paying out 2.5×. Toothpicks +6 damage and +6 pierce.', apply:s=>{ const a=s.atk.main; a.dmg += 6; a.pierce += 6; if (s.atk.trap) Object.assign(s.atk.trap, { cap:4000, bigTier:9, mult:2.5, r:22, rate:8 }); } },
      ]},
    ],
    paragon:{ name:'The Automat', cost:300000, desc:'A tireless robot kitchen: golden nail guns, an assembly line of champion sentries, soap foam and a vast pest trap. The more sentries it has running, the faster every appliance near it works.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:260, camo:true, atk:{
        main:{ kind:'proj', rate:0.08/k, count:2, spread:0.12, dmg:25+dd*3, pierce:Math.round(14*k), speed:950, size:7, type:'normal', sprite:'goldpick', bonusBig:Math.round((40+dd*4)*big), stun:0.15, strip:true },
        build:{ kind:'build', rate:0.8/k, max:12 + Math.floor(dd / 2), life:30, champ:true, minion:{ looks:['salt', 'pepper', 'frost', 'zap'], specs:{
          salt:{ kind:'proj', range:150, rate:0.25, dmg:20+dd*2, pierce:8, bonusBig:Math.round((60+dd*6)*big), speed:700, size:6, type:'normal', sprite:'salt' },
          pepper:{ kind:'proj', range:150, rate:0.35, dmg:0, pierce:1, speed:560, size:7, type:'normal', sprite:'pepperball', explode:{ r:50, dmg:30+dd*3, pierce:30, type:'normal', bonusBig:Math.round((60+dd*6)*big) } },
          frost:{ kind:'proj', range:150, rate:0.3, dmg:15+dd, pierce:10, speed:600, size:6, type:'normal', ignoreImmune:true, sprite:'frostpellet', freeze:{ dur:1, bigDur:0.3, ii:true } },
          zap:{ kind:'proj', range:150, rate:0.3, dmg:20+dd*2, pierce:3, speed:800, size:6, type:'normal', sprite:'spark', zap:{ dmg:20+dd*2, type:'normal', chain:{ count:6, range:80 }, color:'#ffe08a' } } } } },
        foam:{ kind:'slick', rate:1.5/k, travel:0.45, sprite:'foam', puddle:{ r:44, dur:8, slow:0.6, bigSlow:0.9, decamo:true, demold:true, foam:true, sauce:{ dmg:30+dd*3, tick:0.4 } } },
        trap:{ kind:'catch', rate:6, cap:12000, bigTier:10, mult:3, r:26 },
      }, grid:{ per:0.025, max:12 }, abilities:[{ id:'overdrive', cd:45, dur:30, mult:1.5 }, { id:'megabot', cd:60, dur:20, rate:0.4, dmg:200+dd*20, bonusBig:Math.round((2000+dd*200)*big) }] }; } },
  },

  /* ------------------------------------------------------- PET BASKET */
  pets: {
    name:'Pet Basket', cost:250, size:16, hot:'\\', code:'Backslash', faction:'support',
    blurb:'A wicker basket of kitchen pets. Its broom swats pests close by; train a fish, a cat or a bird to do the real work.',
    base:{ range:100, atk:{ main:{ kind:'pulse', rate:1.4, dmg:1, pierce:4, type:'normal', vfx:'broom' } } },
    paths:[
      { name:'Fish', ups:[
        { name:'Goldfish', cost:160, desc:'A goldfish in a bowl leaps out to bite pests within 160% of its range.', apply:s=>{ s.pet = 'fish'; s.atk.fish = { kind:'hitscan', melee:true, fxk:'chomp', look:'fish', rate:1.1, dmg:2, rangeMul:1.6, type:'normal' }; } },
        { name:'Catfish', cost:810, desc:'A catfish: bites for 6 and slaps small pests back up the trail.', apply:s=>{ const p=s.atk.fish; if (p){ p.dmg = 6; p.knock = 26; p.rate = 1; } } },
        { name:'Pike', cost:2010, desc:'A pike drags small pests under whole, rats included. Pack instinct: its pet is 10% stronger for each nearby basket with the same kind of pet (up to 5).', apply:s=>{ const p=s.atk.fish; if (p){ p.dmg = 28; p.rate = 1.6; p.mode = 'strong'; p.carry = { tier:7 }; } s.pet = 'fish'; s.pack = 0.1; } },
        { name:'Shark', cost:12500, desc:'A shark drags anything up to a cheese wheel under for good. Whatever is inside still spills out.', apply:s=>{ const p=s.atk.fish; if (p){ p.dmg = 150; p.rate = 2.2; p.carry = { tier:99 }; p.drag = { tier:8 }; p.rangeMul = 1.9; } } },
        { name:'Megalodon', cost:45000, desc:'A colossal shark drags anything up to a food truck under for good, anywhere within 250% of its range, and bites everything else for 800. Whatever is inside still spills out.', apply:s=>{ const p=s.atk.fish; if (p){ p.dmg = 800; p.rate = 4.5; p.carry = { tier:99 }; p.drag = { tier:10 }; p.rangeMul = 2.5; p.ignoreImmune = true; } } },
      ]},
      { name:'Cat', ups:[
        { name:'Kitten', cost:175, desc:'A kitten pounces on pests within 130% of its range.', apply:s=>{ if (!s.pet) s.pet = 'cat'; s.atk.cat = { kind:'hitscan', melee:true, fxk:'claw', look:'cat', rate:0.8, dmg:2, rangeMul:1.3, type:'sharp' }; } },
        { name:'Tabby', cost:830, desc:'A tabby: 7 damage a swipe, through any shell.', apply:s=>{ const p=s.atk.cat; if (p){ p.dmg = 7; p.type = 'normal'; p.rate = 0.75; } } },
        { name:'Mouser', cost:2065, desc:'Two swipes at a time for 18, +18 to stunned or frozen pests and +8 to vehicles. Pack instinct: 10% stronger for each nearby basket with a cat (up to 5).', apply:s=>{ const p=s.atk.cat; if (p){ p.dmg = 18; p.shots = 2; p.stunBonus = 18; p.bonusBig = 8; } s.pet = 'cat'; s.pack = 0.1; } },
        { name:'Panther', cost:9500, desc:'60 a swipe (+80 to vehicles). Ability: Roar stuns every pest near the basket, food trucks included.', apply:s=>{ const p=s.atk.cat; if (p){ p.dmg = 60; p.bonusBig = 80; p.stunBonus = 60; } s.abilities.push({ id:'roar', cd:40, stun:2, bigTier:10 }); } },
        { name:'Sabertooth', cost:60000, desc:'280 a swipe (+520 to vehicles), faster. Its roar reaches the whole map, stuns for 3s and hits for 300.', apply:s=>{ const p=s.atk.cat; if (p){ p.dmg = 280; p.bonusBig = 520; p.stunBonus = 200; p.rate = 0.6; p.ignoreImmune = true; } const ab = s.abilities.find(x => x.id === 'roar'); if (ab){ ab.global = true; ab.stun = 3; ab.dmg = 300; } } },
      ]},
      { name:'Bird', ups:[
        { name:'Sparrow', cost:190, desc:'A sparrow carries small pests back up the trail, within 220% of its range.', apply:s=>{ if (!s.pet) s.pet = 'bird'; s.atk.bird = { kind:'hitscan', melee:true, fxk:'swoop', look:'bird', rate:3, dmg:1, knock:120, mode:'first', rangeMul:2.2, type:'normal' }; } },
        { name:'Owl', cost:860, desc:'An owl: spots ghost pests and carries them farther.', apply:s=>{ s.camo = true; const p=s.atk.bird; if (p){ p.dmg = 3; p.knock = 150; p.rate = 2.6; } } },
        { name:'Hawk', cost:2120, desc:'A hawk carries 5 pests at a time. Pack instinct: 10% stronger for each nearby basket with a bird (up to 5).', apply:s=>{ const p=s.atk.bird; if (p){ p.shots = 5; p.multi = true; p.knock = 170; p.dmg = 4; } s.pet = 'bird'; s.pack = 0.1; } },
        { name:'Eagle', cost:9000, desc:'An eagle carries 6 pests at a time, cheese wheels too, and hits for 30.', apply:s=>{ const p=s.atk.bird; if (p){ p.shots = 6; p.dmg = 30; p.lift = { tier:8, dist:160 }; } } },
        { name:'Roc', cost:30000, desc:'A giant bird carries off 10 small pests at a time for good, and drags vehicles up to food trucks back 300 px for 1,500 damage.', apply:s=>{ const p=s.atk.bird; if (p){ p.shots = 10; p.dmg = 80; p.bonusBig = 1420; p.carry = { tier:99 }; p.lift = { tier:10, dist:300 }; p.rate = 2.4; p.rangeMul = 2.6; p.ignoreImmune = true; } } },
      ]},
    ],
    paragon:{ name:'The Menagerie', cost:260000, desc:'A great shark, a sabertooth and a roc in one enormous basket. Every pest they eat feeds the pack’s appetite, and a full belly sends them into a frenzy.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:220, camo:true, pet:'all', atk:{
        main:{ kind:'pulse', rate:0.5/k, dmg:30+dd*3, pierce:30, type:'normal', vfx:'broom' },
        shark:{ kind:'hitscan', melee:true, fxk:'chomp', look:'fish', rate:3/k, dmg:2000+dd*200, mode:'strong', rangeAbs:1400, type:'normal', ignoreImmune:true, carry:{ tier:99 }, drag:{ tier:10, boss:0.01 } },
        cat:{ kind:'hitscan', melee:true, fxk:'claw', look:'cat', rate:0.25/k, shots:3, dmg:150+dd*15, bonusBig:Math.round((400+dd*40)*big), stunBonus:150+dd*15, rangeMul:1.4, type:'normal', ignoreImmune:true },
        roc:{ kind:'hitscan', melee:true, fxk:'swoop', look:'bird', rate:1.8/k, shots:12, multi:true, dmg:120+dd*12, mode:'first', rangeAbs:1400, type:'normal', ignoreImmune:true, carry:{ tier:99 }, lift:{ tier:10, dist:300 }, bonusBig:Math.round((1200+dd*120)*big) },
      }, appetite:{ need:100, big:10, dur:10, mult:2 }, abilities:[{ id:'stampede', cd:40, dmg:600+dd*60, bonusBig:Math.round((3000+dd*300)*big), push:140, bigPush:50 }, { id:'feast', cd:70, n:3, boss:0.1 }] }; } },
  },

  /* ------------------------------------------------------- LOBSTER TANK */
  lobster: {
    name:'Lobster Tank', cost:300, size:18, hot:'=', code:'Equal', faction:'fleet', amphib:true,
    blurb:'A lobster in a glass tank that flings forks with its claw. It works on land or water, and reaches 35% farther from the water.',
    finish:s=>{ if (s.quickClaws) for (const id in s.atk) s.atk[id].rate /= s.quickClaws; },
    base:{ range:125, atk:{ main:{ kind:'proj', rate:1.2, dmg:0, pierce:2, speed:460, size:7, type:'normal', sprite:'fork', burst:{ r:22, dmg:2, pierce:3, type:'normal', wet:true } } } },
    paths:[
      { name:'Abyss', ups:[
        { name:'Quick Claws', cost:150, desc:'Every attack 15% faster.', apply:s=>{ s.quickClaws = 1.15; } },
        { name:'Long Flings', cost:250, desc:'Forks fly 30% faster and farther, with 10% more range.', apply:s=>{ const a=s.atk.main; a.speed *= 1.3; a.lifeMul = (a.lifeMul||1) * 1.3; s.range *= 1.1; } },
        { name:'Abyss Dweller', cost:1800, desc:'A squid in the tank lashes up to 8 pests around it with tentacles. Appliances nearby get +1 pierce.', apply:s=>{ s.atk.tentacle = { kind:'pulse', rate:1.6, dmg:4, pierce:8, rangeMul:0.9, type:'normal', vfx:'ink' }; s.buff = { pierce:1 }; } },
        { name:'Abyssal Warrior', cost:4200, desc:'Inky tentacles: 12 damage (+10 to vehicles) to 12 pests, slowing them. Nearby appliances get +2 pierce.', apply:s=>{ const t=s.atk.tentacle; if (t){ t.dmg = 12; t.bonusBig = 10; t.pierce = 12; t.slow = { mult:0.6, dur:1.5, bigMult:0.85 }; } s.buff = { pierce:2 }; } },
        { name:'Lord of the Abyss', cost:23000, desc:'A kraken in the tank: 50 a lash (+120 to vehicles) to 30 pests, almost twice as often. Nearby appliances get +4 pierce.', apply:s=>{ const t=s.atk.tentacle; if (t){ t.dmg = 50; t.bonusBig = 120; t.pierce = 30; t.rate = 0.9; t.ignoreImmune = true; } s.buff = { pierce:4 }; s.atk.main.burst.dmg += 4; } },
      ]},
      { name:'Ice Water', ups:[
        { name:'Sharper Prongs', cost:200, desc:'Forks pierce 1 more pest and splash 2 more.', apply:s=>{ const a=s.atk.main; a.pierce += 1; a.burst.pierce += 2; } },
        { name:'Tidal Chill', cost:225, desc:'Icy splashes, 30% wider, that freeze small pests for a moment.', apply:s=>{ const b=s.atk.main.burst; b.r *= 1.3; b.freeze = { dur:0.6 }; } },
        { name:'Riptide Champion', cost:2000, desc:'Forks hit harder the farther they fly, up to +12 damage, and splash for 3 more.', apply:s=>{ const a=s.atk.main; a.grow = { rate:24, max:12 }; a.burst.dmg += 3; } },
        { name:'Arctic Knight', cost:8000, desc:'Forks grow stronger twice as fast, up to +30. Ability: Ice Jet fires 8 bouncing balls of ice at the toughest pests.', apply:s=>{ const a=s.atk.main; a.grow = { rate:60, max:30 }; s.abilities.push({ id:'icejet', cd:30, balls:8, dmg:40, bonusBig:80 }); } },
        { name:'Popseidon', cost:52000, desc:'Forks up to +80 and splashes +10. Ice Jet floods the whole kitchen with ice water instead: every pest takes 200 (2,000 to vehicles) and freezes for 3s, even snow fleas.', apply:s=>{ const a=s.atk.main; a.grow = { rate:120, max:80 }; a.burst.dmg += 10; a.burst.freeze = { dur:0.8, bigDur:0.2, ii:true }; const ab = s.abilities.find(x => x.id === 'icejet'); if (ab) Object.assign(ab, { flood:true, cd:40, dmg:200, big:2000, freeze:3 }); } },
      ]},
      { name:'Siren', ups:[
        { name:'Echo Sense', cost:200, desc:'Spots ghost pests, and forks home in on them.', apply:s=>{ s.camo = true; s.atk.main.homing = true; } },
        { name:'Echo Network', cost:280, desc:'+3% range for every Lobster Tank with Echo Network on the map, itself included (up to 10).', apply:s=>{ s.echo = 0.03; } },
        { name:'Siren Song', cost:2000, desc:'Every 3s its song charms up to 12 small pests (rats at most): they walk back up the trail for 1.6s and lose their ghost cloaks, and whatever is burning or eating at them lands at once.', apply:s=>{ s.atk.song = { kind:'song', rate:3, dmg:0, pierce:12, charm:{ dur:1.6, tier:7, pop:true } }; } },
        { name:'Symphonic Resonance', cost:7600, desc:'The song carries 40% farther and charms 20 pests, cheese wheels, picnic baskets and midnight roaches included.', apply:s=>{ const g=s.atk.song; if (g){ g.rangeMul = 1.4; g.pierce = 20; g.charm.bigTier = 9; } } },
        { name:'The Final Harmonic', cost:25000, desc:'The song reaches the whole kitchen: 40 pests at a time, food trucks too, and charmed pests take +5 damage from everything. Appliances nearby recharge their abilities 15% faster.', apply:s=>{ const g=s.atk.song; if (g){ g.global = true; g.rate = 4; g.pierce = 40; Object.assign(g.charm, { dur:1.8, tier:99, bigTier:10, vuln:5 }); } s.buff = Object.assign({}, s.buff, { energize:0.15 }); } },
      ]},
    ],
    paragon:{ name:'The Abyssal Aquarium', cost:260000, desc:'Homing forks that hit harder the farther they fly, a kraken’s tentacles and a siren song that charms everything far around it. The tide rises and falls: at high tide everything hits half again as hard.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:250, camo:true, atk:{
        main:{ kind:'proj', rate:0.15/k, count:3, spread:0.2, homing:true, dmg:0, pierce:6, speed:620, size:8, type:'normal', sprite:'fork', grow:{ rate:200, max:400+dd*40 }, burst:{ r:40, dmg:40+dd*4, pierce:12, type:'normal', bonusBig:Math.round((120+dd*12)*big), freeze:{ dur:0.4, ii:true }, wet:true } },
        tentacle:{ kind:'pulse', rate:0.45/k, dmg:120+dd*12, pierce:40, bonusBig:Math.round((500+dd*50)*big), type:'normal', ignoreImmune:true, vfx:'ink', slow:{ mult:0.5, dur:1.5, bigMult:0.8 } },
        song:{ kind:'song', rate:2/k, dmg:0, pierce:40, rangeMul:1.6, charm:{ dur:1.6, tier:99, bigTier:9, pop:true, vuln:10+dd } },
      }, buff:{ pierce:6 }, tide:{ every:10, high:6, mult:1.5 }, abilities:[{ id:'tsunami', cd:45, dmg:Math.round((800+dd*80)*big), push:220, bigPush:80, freeze:2 }, { id:'kraken', cd:60, n:2, boss:0.15 }] }; } },
  },

  /* --------------------------------------------------------- CHESS SET */
  chess: {
    name:'Chess Set', cost:325, size:17, hot:'↵', code:'Enter', faction:'special',
    blurb:'A chess board fighting a gridlock war. Its pawn hits harder than any other first piece, but only right next to it, and the board drops a wall square on the trail that pests have to chew through, rebuilt in a new place every round. Promote it to a Rook and Bishop that sweep lines, a Knight that leaps and forks, or the Royals: a King who rallies your appliances and a Queen of poison, brands, lightning and ice.',
    base:{ range:120, walls:{ n:1, hp:1, thorns:0 }, atk:{ main:{ kind:'slide', dirs:'pawn', rate:1.25, dmg:5, pierce:1, reach:34, width:20, type:'normal', piece:'pawn' } } },
    finish:s=>chessFinish(s),
    paths:[
      { name:'Rook & Bishop', ups:[
        { name:'Rook', cost:400, desc:'Promotes the pawn to a rook. Every 1.15s it slides along the row or the column through a pest, whichever catches more, hitting up to 6 pests in line for 2 damage.', apply:s=>{ s.atk.rook = { kind:'slide', dirs:'rook', rate:1.15, dmg:2, pierce:6, reach:80, width:22, type:'normal', piece:'rook' }; } },
        { name:'Open File', cost:500, desc:'Rook slides reach twice as far, hit 4 more pests and come 15% faster.', apply:s=>{ const r=s.atk.rook; r.reach *= 2; r.pierce += 4; r.rate /= 1.15; } },
        { name:'Bishop’s Battery', cost:1650, desc:'A bishop joins the rook: its diagonals cross the kitchen and bounce off the walls, hitting 8 pests for 4. The rook slides along the row and the column at once, +2 damage.', apply:s=>{ const r=s.atk.rook; r.cross = true; r.dmg += 2; s.atk.bishop = { kind:'slide', dirs:'bishop', cross:true, full:true, bounce:1, rate:0.8, dmg:4, pierce:8, width:24, type:'normal', piece:'bishop' }; s.camo = true; } },
        { name:'Back Rank', cost:5500, desc:'Rook slides cross the whole kitchen wall to wall: 10 damage (+26 to vehicles) to 22 pests, double near the pantry. Bishop beams bounce twice for 9 (+12 to vehicles).', apply:s=>{ const r=s.atk.rook; r.full = true; r.dmg = 10; r.bonusBig = 26; r.pierce = 22; r.back = { frac:1/3, mul:2 }; const b=s.atk.bishop; if (b){ b.bounce = 2; b.dmg = 9; b.bonusBig = 12; b.pierce = 16; } } },
        { name:'Castle Keep', cost:44000, desc:'Slides deal 40 (+200 to vehicles) to 40 pests a line, twice as fast; bishop beams deal 30 (+150) and bounce four times. Ability: Castle Crush, a giant rook rolls down every trail from the pantry, crushing every pest in its way for 600 (3,000 to vehicles).', apply:s=>{ const r=s.atk.rook; r.dmg = 40; r.bonusBig = 200; r.pierce = 40; r.rate /= 2; const b=s.atk.bishop; if (b){ b.dmg = 30; b.bonusBig = 150; b.bounce = 4; b.pierce = 30; b.rate /= 1.5; } s.abilities.push({ id:'castle', cd:40, dmg:600, bonusBig:2400, push:110, bigPush:35, stun:0.5 }); } },
      ]},
      { name:'Knight', ups:[
        { name:'Knight', cost:450, desc:'Promotes the pawn to a knight. Every 0.7s it leaps onto a pest a knight’s move away, jumping over everything, and stomps up to 8 pests where it lands for 2.', apply:s=>{ s.atk.knight = { kind:'leap', rate:0.7, travel:0.3, hopTime:0.2, hop:110, max:3, impact:{ r:30, dmg:2, pierce:8, type:'normal' }, piece:'knight' }; } },
        { name:'Fork', cost:550, desc:'Every landing forks the 2 toughest pests within 90 px: each takes 6 more (+4 to vehicles), through any shell.', apply:s=>{ s.atk.knight.fork = { n:2, r:90, dmg:6, bonusBig:4, type:'normal', ignoreImmune:true }; } },
        { name:'Knight’s Tour', cost:1900, desc:'After it lands it leaps on to another pest a knight’s move away, up to 3 more times. Stomps hit 10 pests for 3.', apply:s=>{ const k=s.atk.knight; k.tour = 3; Object.assign(k.impact, { dmg:3, pierce:10, r:34 }); } },
        { name:'Cavalry', cost:6200, desc:'Stomps hit for 4 (+12 to vehicles) and stun small pests, forks for 12 (+30 to vehicles). Ability: Cavalry Charge, a troop of knights gallops up every trail, trampling every pest for 60 (300 to vehicles).', apply:s=>{ const k=s.atk.knight; Object.assign(k.impact, { dmg:4, bonusBig:12, stun:0.25 }); if (k.fork) Object.assign(k.fork, { dmg:12, bonusBig:30 }); s.abilities.push({ id:'charge', cd:40, dmg:60, bonusBig:240, push:70, bigPush:20, stun:0.6 }); } },
        { name:'Royal Fork', cost:40000, desc:'Forks reach 220 px and hit the 2 toughest pests for 450 each (900 to vehicles, 1,350 to bosses). Tours run to 5 leaps, 20% faster, and stomps deal 22 (+80 to vehicles). Cavalry Charge tramples for 900.', apply:s=>{ const k=s.atk.knight; k.tour = 5; k.rate /= 1.2; Object.assign(k.impact, { dmg:22, bonusBig:80, r:42, pierce:22 }); k.fork = { n:2, r:220, dmg:450, bonusBig:450, bonusBoss:450, type:'normal', ignoreImmune:true }; const ab = s.abilities.find(x => x.id === 'charge'); if (ab){ ab.dmg = 900; ab.bonusBig = 3600; } } },
      ]},
      { name:'Royals', ups:[
        { name:'King', cost:300, desc:'A King joins the pawn. He never attacks, but appliances in range attack 12% faster. The pawn keeps jabbing.', apply:s=>{ s.buff = Object.assign(s.buff || {}, { speed:1.12 }); s.king = true; } },
        { name:'Gridlock', cost:500, desc:'The board drops 3 wall squares on the trail instead of 1, twice as tough. Pests pile up behind them chewing; hopping and flying pests go over.', apply:s=>{ s.walls = { n:3, hp:2, thorns:0 }; } },
        { name:'Queen', cost:2100, desc:'A Queen joins the King. Every 0.6s she strikes every pest in range with an element in turn: poison (burns over time), brand (+3 damage from every hit), lightning (double damage to the 3 toughest) and ice (freezes small pests).', apply:s=>{ s.atk.queen = { kind:'elements', rate:0.6, dmg:3, pierce:30, poison:3, brand:3, ice:0.6, bolt:3, both:false, type:'normal', piece:'queen' }; } },
        { name:'Royal Court', cost:6000, desc:'Appliances in range attack 20% faster and hit 1 more pest. 4 wall squares that sting pests chewing them. The Queen casts two elements at once for 8. Ability: Stalemate stops every pest on screen for 3s.', apply:s=>{ s.buff = Object.assign(s.buff || {}, { speed:1.2, pierce:1 }); s.walls = { n:4, hp:3, thorns:6 }; const q=s.atk.queen; if (q){ q.dmg = 8; q.poison = 8; q.brand = 6; q.both = true; } s.abilities.push({ id:'stalemate', cd:60, dur:3 }); } },
        { name:'Checkmate', cost:42000, desc:'The Queen casts all four elements at once for 60 (+200 to vehicles) through any shell; walls are six times tougher and sting for 40. Colour Complex: pests on dark squares take 35% more from everything. Ability: Checkmate takes the 2 toughest vehicles off the board (bosses lose 15%).', apply:s=>{ const q=s.atk.queen; if (q){ q.dmg = 60; q.bonusBig = 200; q.poison = 40; q.brand = 30; q.ice = 1; q.all = true; q.ignoreImmune = true; } s.walls = { n:5, hp:6, thorns:40 }; s.board = { mul:1.35 }; s.abilities.push({ id:'checkmate', cd:55, n:2, boss:0.15 }); } },
      ]},
    ],
    paragon:{ name:'The Grand Gambit', cost:260000, desc:'Every piece at once. The Queen slides along all four lines across the kitchen and casts all four elements, her knights leap and fork on their own, the King rallies every appliance near, and the board gridlocks the trail with walls that sting. Pawns march up the trail to be promoted to queens, and pests on the dark squares take more damage from everything.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:250, camo:true, king:true, buff:{ speed:1.25, pierce:2 }, walls:{ n:6, hp:10 + dd * 0.4, thorns:120 + dd * 12 }, atk:{
        queen:{ kind:'slide', dirs:'queen', cross:true, full:true, bounce:2, rate:0.32/k, dmg:70+dd*7, pierce:60, width:28, bonusBig:Math.round((320+dd*32)*big), bonusBoss:Math.round((160+dd*16)*big), type:'normal', ignoreImmune:true, back:{ frac:1/3, mul:2 }, piece:'queen' },
        elements:{ kind:'elements', rate:0.45/k, dmg:120+dd*12, pierce:80, poison:80+dd*8, brand:60+dd*6, ice:1.2, bolt:4, all:true, bonusBig:Math.round((400+dd*40)*big), type:'normal', ignoreImmune:true, piece:'queen' },
        knights:{ kind:'leap', count:2, rate:0.9/k, travel:0.32, hopTime:0.2, hop:150, max:8, tour:6, impact:{ r:46, dmg:60+dd*6, pierce:30, bonusBig:Math.round((220+dd*22)*big), type:'normal', ignoreImmune:true, stun:0.3 }, fork:{ n:2, r:260, dmg:900+dd*90, bonusBig:Math.round((1800+dd*180)*big), bonusBoss:Math.round((900+dd*90)*big), type:'normal', ignoreImmune:true }, piece:'knight' },
      }, board:{ mul: 1.5 + dd * 0.025 },
      pawns:{ every:2.5, cap:10, pierce:25+dd, speed:85, max:4, life:20, hit:{ dmg:40+dd*4, bonusBig:Math.round((120+dd*12)*big), type:'normal', ignoreImmune:true },
        queen:{ kind:'slide', dirs:'queen', cross:true, full:true, rate:0.7, range:240, dmg:30+dd*3, pierce:30, width:24, bonusBig:Math.round((120+dd*12)*big), type:'normal', ignoreImmune:true, piece:'queen' } },
      abilities:[{ id:'checkmate', cd:50, n:3, boss:0.15 }, { id:'stalemate', cd:60, dur:4 }] }; } },
  },
  /* ------------------------------------------------------- CHOPSTICKS */
  chopsticks: {
    name:'Chopsticks', cost:300, size:15, hot:'<', faction:'special',
    blurb:'A pair of chopsticks that pinches a pest, lifts it off the trail and drops it back where it came from. Flick pests in a blur, lift bigger and bigger ones, or throw the one it holds into the pests behind.',
    base:{ range:125, atk:{ main:{ kind:'pinch', rate:2.2, n:1, tier:4, bigTier:0, back:70, carry:0.55, dmg:1, type:'normal' } } },
    paths:[
      { name:'Bamboo', ups:[
        { name:'Quick Flick', cost:160, desc:'Flicks a pest every 0.7s for 1 damage, nudging it back a little.', apply:s=>{ s.atk.flick = { kind:'hitscan', melee:true, fxk:'flick', look:'bamboo', rate:0.7, dmg:1, knock:6, type:'normal' }; } },
        { name:'Twin Pair', cost:320, desc:'A second pair: flicks 2 pests at a time, 40% faster.', apply:s=>{ const f=s.atk.flick; if (f){ f.shots = 2; f.multi = true; f.rate /= 1.4; } } },
        { name:'Bamboo Grove', cost:1150, desc:'Flicks 3 pests at a time for 3 damage, 4 times a second. Pinches come 30% faster.', apply:s=>{ const f=s.atk.flick; if (f){ f.shots = 3; f.dmg = 3; f.rate = 0.25; } s.atk.main.rate /= 1.3; } },
        { name:'Thousand Flicks', cost:5200, desc:'Flicks 5 pests at a time for 8 (+12 to vehicles), 8 times a second. Ability: Flurry, every attack 4× as fast for 8s.', apply:s=>{ const f=s.atk.flick; if (f){ f.shots = 5; f.dmg = 8; f.bonusBig = 12; f.rate = 0.125; } s.abilities.push({ id:'flurry', cd:45, dur:8, mult:4 }); } },
        { name:'Bamboo Tempest', cost:36000, desc:'Flicks 8 pests at a time for 30 (+90 to vehicles) through any shell, 12 times a second. Flurry is 6× as fast for 10s.', apply:s=>{ const f=s.atk.flick; if (f){ f.shots = 8; f.dmg = 30; f.bonusBig = 90; f.rate = 1 / 12; f.ignoreImmune = true; } const ab = s.abilities.find(x => x.id === 'flurry'); if (ab){ ab.mult = 6; ab.dur = 10; } } },
      ]},
      { name:'Lacquer', ups:[
        { name:'Lacquered Tips', cost:220, desc:'Lifts ant balls too, and carries pests 40% farther back.', apply:s=>{ const p=s.atk.main; p.tier = Math.max(p.tier, 5); p.back *= 1.4; } },
        { name:'Long Reach', cost:420, desc:'+20% range, spots ghost pests and pinches 25% faster.', apply:s=>{ s.range *= 1.2; s.camo = true; s.atk.main.rate /= 1.25; } },
        { name:'Serving Chopsticks', cost:1900, desc:'Lifts mice and rats too, 2 at a time. Pests it drops are dazed for 1s.', apply:s=>{ const p=s.atk.main; p.tier = Math.max(p.tier, 7); p.n = Math.max(p.n, 2); p.daze = Math.max(p.daze || 0, 1); } },
        { name:'Ebony Tongs', cost:7200, desc:'Lifts cheese wheels, picnic baskets and midnight roaches too, 3 at a time, and carries everything twice as far. Drops hit for 20 (+60 to vehicles).', apply:s=>{ const p=s.atk.main; p.bigTier = Math.max(p.bigTier || 0, 9); p.n = Math.max(p.n, 3); p.back *= 2; p.dmg = Math.max(p.dmg, 20); p.bonusBig = (p.bonusBig || 0) + 60; } },
        { name:'Lacquered Legend', cost:40000, desc:'Lifts food trucks and raccoons too, 4 at a time, twice as often, and carries everything 3× as far again. Drops hit for 150 (+800 to vehicles).', apply:s=>{ const p=s.atk.main; p.bigTier = 11; p.n = Math.max(p.n, 4); p.back *= 3; p.rate /= 2; p.dmg = Math.max(p.dmg, 150); p.bonusBig = Math.max(p.bonusBig || 0, 800); } },
      ]},
      { name:'Gold', ups:[
        { name:'Gold Tips', cost:260, desc:'Throws the pest it lifts into the pests behind it: the landing hits up to 6 pests for 2.', apply:s=>{ s.atk.main.toss = { r:28, dmg:2, pierce:6, type:'normal' }; } },
        { name:'Golden Toss', cost:480, desc:'Throws 30% faster, and the landing hits 10 pests for 4 and stuns small ones for 0.4s.', apply:s=>{ const p=s.atk.main; p.rate /= 1.3; Object.assign(p.toss, { dmg:4, pierce:10, stun:0.4 }); } },
        { name:'Midas Throw', cost:2100, desc:'Lifts mice and rats too, 2 at a time. Landings hit 14 pests for 12 (+30 to vehicles), and pests a throw pops are worth double cash.', apply:s=>{ const p=s.atk.main; p.n = Math.max(p.n, 2); p.tier = Math.max(p.tier, 7); Object.assign(p.toss, { r:36, dmg:12, pierce:14, bonusBig:30, midas:2 }); } },
        { name:'Golden Hurl', cost:6800, desc:'Lifts cheese wheels too, and hurls hard: landings hit 24 pests for 45 (+150 to vehicles) and stun small ones for 0.8s. The pest it throws takes triple.', apply:s=>{ const p=s.atk.main; p.bigTier = Math.max(p.bigTier || 0, 8); Object.assign(p.toss, { r:46, dmg:45, pierce:24, bonusBig:150, stun:0.8, self:3 }); } },
        { name:'Golden Dragon', cost:38000, desc:'Lifts picnic baskets and midnight roaches too, and throws 3 pests at a time, 50% more often, at the toughest pests behind them. Landings hit 40 pests for 240 (+900 to vehicles, +400 to bosses) through any shell, and what they pop pays triple.', apply:s=>{ const p=s.atk.main; p.n = Math.max(p.n, 3); p.rate /= 1.5; p.bigTier = Math.max(p.bigTier || 0, 9); Object.assign(p.toss, { r:60, dmg:240, pierce:40, bonusBig:900, bonusBoss:400, stun:1, midas:3, aim:'strong', ignoreImmune:true }); } },
      ]},
    ],
    paragon:{ name:'Grandmaster Chopsticks', cost:250000, desc:'Lifts anything short of a boss, vehicles included, and drops it back at the entrance. Its flicks come in a blur, and the pests it hurls land like meteors.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:240, camo:true, atk:{
        main:{ kind:'pinch', rate:0.6/k, n:5, tier:99, bigTier:11, back:99999, carry:0.65, dmg:80+dd*8, bonusBig:Math.round((600+dd*60)*big), daze:1.2, type:'normal', ignoreImmune:true },
        hurl:{ kind:'pinch', rate:1.1/k, n:3, tier:99, bigTier:9, back:300, carry:0.5, dmg:40+dd*4, type:'normal', ignoreImmune:true, toss:{ r:70, dmg:320+dd*32, pierce:50, bonusBig:Math.round((1200+dd*120)*big), bonusBoss:Math.round((600+dd*60)*big), stun:1, midas:3, self:3, aim:'strong', type:'normal', ignoreImmune:true } },
        flick:{ kind:'hitscan', melee:true, fxk:'flick', look:'grand', rate:0.05/k, shots:10, multi:true, dmg:60+dd*6, bonusBig:Math.round((180+dd*18)*big), knock:10, type:'normal', ignoreImmune:true },
      }, focus:{ need:30 }, abilities:[{ id:'flurry', cd:40, dur:10, mult:6 }, { id:'grandpinch', cd:60, n:4, hold:2 }] }; } },
  },

  /* ------------------------------------------------------- LAZY SUSAN */
  susan: {
    name:'Lazy Susan', cost:375, size:26, hot:'>', faction:'support',
    blurb:'A wooden turntable you place other appliances on. Whatever rides on it turns slowly round and attacks 10% faster. Spin it faster, make room for more, or fling sauce off its edge.',
    base:{ range:110, noTarget:true, seats:1, spin:1.1, atk:{} },
    paths:[
      { name:'Spin', ups:[
        { name:'Smooth Bearings', cost:250, desc:'Whatever rides on it attacks 25% faster.', apply:s=>{ s.spin = Math.max(s.spin, 1.25); } },
        { name:'Quick Turn', cost:520, desc:'Riders attack 40% faster.', apply:s=>{ s.spin = Math.max(s.spin, 1.4); } },
        { name:'Spin Cycle', cost:2300, desc:'Riders attack 65% faster and spot ghost pests.', apply:s=>{ s.spin = Math.max(s.spin, 1.65); s.riderCamo = true; } },
        { name:'Whirling Platter', cost:7800, desc:'Riders attack twice as fast with +1 pierce. Ability: Full Spin, riders attack 3× as fast for 8s.', apply:s=>{ s.spin = Math.max(s.spin, 2); s.riderPierce = (s.riderPierce || 0) + 1; s.abilities.push({ id:'fullspin', cd:45, dur:8, mult:3 }); } },
        { name:'Centrifuge', cost:40000, desc:'Riders attack 3× as fast with +2 pierce and +1 damage. Full Spin is 4× as fast for 10s.', apply:s=>{ s.spin = Math.max(s.spin, 3); s.riderPierce = (s.riderPierce || 0) + 1; s.riderDmg = (s.riderDmg || 0) + 1; const ab = s.abilities.find(x => x.id === 'fullspin'); if (ab){ ab.mult = 4; ab.dur = 10; } } },
      ]},
      { name:'Size', ups:[
        { name:'Extra Leaf', cost:420, desc:'Room for a second appliance on top.', apply:s=>{ s.seats = Math.max(s.seats, 2); } },
        { name:'Raised Board', cost:600, desc:'Riders sit up higher: +12% range.', apply:s=>{ s.riderRange = Math.max(s.riderRange || 1, 1.12); } },
        { name:'Banquet Board', cost:2900, desc:'Room for a third appliance on top.', apply:s=>{ s.seats = Math.max(s.seats, 3); } },
        { name:'Two-Tier Stand', cost:9200, desc:'Riders get +20% range and +1 damage.', apply:s=>{ s.riderRange = Math.max(s.riderRange || 1, 1.2); s.riderDmg = (s.riderDmg || 0) + 1; } },
        { name:'Grand Banquet', cost:34000, desc:'Riders get +30% range, +2 damage and +2 pierce, and their abilities recharge 30% faster.', apply:s=>{ s.riderRange = Math.max(s.riderRange || 1, 1.3); s.riderDmg = (s.riderDmg || 0) + 1; s.riderPierce = (s.riderPierce || 0) + 2; s.riderEnergize = 0.3; } },
      ]},
      { name:'Sauce', ups:[
        { name:'Sauce Dish', cost:200, desc:'Flings 4 drops of sauce off its edge every 1.4s as it turns: 1 damage each, slowing small pests a little.', apply:s=>{ s.atk.sauce = { kind:'radial', rate:1.4, count:4, dmg:1, pierce:2, speed:240, size:6, type:'normal', sprite:'sauce', color:'#c9362a', from:20, tang:0.3, slow:{ mult:0.75, dur:1 } }; } },
        { name:'Hot Sauce', cost:380, desc:'6 drops at a time that set pests burning.', apply:s=>{ const a=s.atk.sauce; a.count = 6; a.burn = { dmg:1, tick:0.5, dur:2 }; a.color = '#e2462a'; } },
        { name:'Sticky Glaze', cost:1700, desc:'8 drops for 3 damage through 3 pests. The glaze slows small pests to half speed for 2s, vehicles by 20%.', apply:s=>{ const a=s.atk.sauce; a.count = 8; a.dmg = 3; a.pierce = 3; a.slow = { mult:0.5, dur:2, bigMult:0.8 }; a.color = '#b8501a'; } },
        { name:'Sauce Cyclone', cost:6900, desc:'12 drops every 0.55s for 8 (+16 to vehicles) through 4 pests, burning harder.', apply:s=>{ const a=s.atk.sauce; a.count = 12; a.rate = 0.55; a.dmg = 8; a.bonusBig = 16; a.pierce = 4; a.burn = { dmg:3, tick:0.5, dur:2 }; } },
        { name:'Saucier Supreme', cost:30000, desc:'16 drops every 0.3s for 28 (+90 to vehicles) through 6 pests and any shell. Ability: Gravy Flood scalds every pest far around it for 300 (1,000 to vehicles) and slows them by 70% for 4s.', apply:s=>{ const a=s.atk.sauce; a.count = 16; a.rate = 0.3; a.dmg = 28; a.bonusBig = 90; a.pierce = 6; a.ignoreImmune = true; a.burn = { dmg:8, tick:0.5, dur:2 }; a.color = '#8a3a14'; s.abilities.push({ id:'gravyflood', cd:45, rangeMul:2.5, slow:0.3, bigSlow:0.65, dur:4, dmg:300, bonusBig:700 }); } },
      ]},
    ],
    paragon:{ name:'The Carousel', cost:240000, desc:'A grand carousel with room for four appliances. They ride round and round, attacking far faster with more range, damage and pierce, while hot gravy flies off its edge. The longer a round lasts, the faster it turns.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:200, noTarget:true, seats:4, spin:3 + dd * 0.08, riderRange:1.35, riderDmg:3 + Math.floor(dd / 3), riderPierce:3, riderCamo:true, riderEnergize:0.35, windup:{ per:0.03, max:0.6 }, atk:{
        sauce:{ kind:'radial', rate:0.22/k, count:20, dmg:40+dd*4, pierce:8, speed:300, size:7, type:'normal', ignoreImmune:true, sprite:'sauce', color:'#8a4a1f', from:25, tang:0.3, bonusBig:Math.round((120+dd*12)*big), slow:{ mult:0.5, dur:1.5, bigMult:0.75 }, burn:{ dmg:10+dd, tick:0.5, dur:2 } },
      }, abilities:[{ id:'fullspin', cd:40, dur:10, mult:5 }, { id:'gravyflood', cd:50, rangeMul:3, slow:0.3, bigSlow:0.6, dur:4, dmg:1200+dd*120, bonusBig:Math.round((4000+dd*400)*big) }] }; } },
  },

  /* ------------------------------------------------------- SPRAY BOTTLE */
  spray: {
    name:'Spray Bottle', cost:280, size:14, hot:'?', faction:'prep',
    blurb:'A trigger spray bottle that mists the pests in front of it and soaks them: wet pests take more from cold and energy hits. Fill it with soap that makes pests slip back down the trail, with icy water that sets up combos for your other appliances, or twist the nozzle to a pressure jet.',
    base:{ range:125, atk:{ main:{ kind:'spray', rate:0.85, dmg:1, pierce:5, cone:0.8, type:'normal', wet:{ dur:3, cold:1, energy:1 } } } },
    paths:[
      { name:'Soap', ups:[
        { name:'Dish Soap', cost:170, desc:'Lathers what it sprays for 4s. Lathered pests slip 30 back down the trail now and then.', apply:s=>{ s.atk.main.lather = { dur:4, chance:0.35, dist:30, bigDist:0, bump:0, vuln:0 }; } },
        { name:'Bubble Mix', cost:330, desc:'Blows 3 bubbles every 2s that drift back up the trail. Each pops on the first pest it meets for 3, lathering every pest near it.', apply:s=>{ s.atk.bubbles = { kind:'bubbles', rate:2, count:3, dmg:3, r:30, speed:42, life:7, type:'normal' }; } },
        { name:'Slip ’n’ Slide', cost:1400, desc:'Lathered pests slip more often and twice as far, crashing into the pests behind them for 4 each. Lather takes on vehicles too: they slip a third as far.', apply:s=>{ const L=s.atk.main.lather; if (L){ L.chance = 0.6; L.dist = 60; L.bigDist = 20; L.bump = 4; } } },
        { name:'Foam Cannon', cost:5200, desc:'Every third spray leaves a patch of foam on the trail for 6s: pests crossing it crawl at half speed and slip three times as often. Ability: Bubble Bath traps the 12 toughest pests on screen (not vehicles) in soap bubbles, floats them 150 back and holds them 3s; then they pop for 60.', apply:s=>{ s.atk.main.foam = { every:3, r:34, life:6, slow:0.5 }; s.abilities.push({ id:'bubblebath', cd:40, n:12, back:150, hold:3, pop:60, big:false }); } },
        { name:'Squeaky Clean', cost:34000, desc:'Lathered pests take 50% more damage from everything, slip 90 back and crash into the pests behind for 20. Bubbles pop for 60, 4 at a time every 0.7s. Bubble Bath takes 30 pests, vehicles too (not bosses), floats them 220 back and pops them for 800 (2,400 to vehicles).', apply:s=>{ const L=s.atk.main.lather; if (L){ L.vuln = 0.5; L.dist = 90; L.bigDist = 30; L.bump = 20; } const b=s.atk.bubbles; if (b){ b.dmg = 60; b.count = 4; b.rate = 0.7; b.r = 40; } const ab=s.abilities.find(x=>x.id==='bubblebath'); if (ab){ ab.n = 30; ab.big = true; ab.back = 220; ab.pop = 800; ab.popBig = 2400; } } },
      ]},
      { name:'Mist', ups:[
        { name:'Fine Mist', cost:150, desc:'A wider spray that soaks 3 more pests and keeps them wet 5s.', apply:s=>{ const m=s.atk.main; m.cone *= 1.35; m.pierce += 3; m.wet.dur = 5; } },
        { name:'Ice Water', cost:360, desc:'Wet pests crawl 20% slower, and a cold hit from any appliance freezes a wet pest solid for 0.6s.', apply:s=>{ const w=s.atk.main.wet; w.chill = 0.8; w.freeze = 0.6; } },
        { name:'Conductor', cost:1450, desc:'Wet pests take 50% more from energy and heat. Heat on a wet pest flashes it to steam, scalding 6 pests around it for 5.', apply:s=>{ const w=s.atk.main.wet; w.energyMul = 1.5; w.heatMul = 1.5; w.steam = { n:6, dmg:5, r:40 }; } },
        { name:'Humidifier', cost:5000, desc:'Keeps every pest in its range wet, and every hit on a wet pest deals +2. Ability: Downpour soaks every pest on screen for 12s, and they take double from cold, energy and heat while it rains.', apply:s=>{ const w=s.atk.main.wet; w.all = (w.all || 0) + 2; s.humid = true; s.abilities.push({ id:'downpour', cd:50, dur:12, bolts:0 }); } },
        { name:'Monsoon', cost:32000, desc:'Every hit on a wet pest deals +10, and wet vehicles crawl 25% slower. Steam bursts scald 12 pests for 40. Downpour calls down lightning: 4 bolts a second, each hitting a wet pest for 400 (+1,200 to vehicles).', apply:s=>{ const w=s.atk.main.wet; w.all = 10; w.bigSlow = 0.75; w.steam = { n:12, dmg:40, r:55 }; const ab=s.abilities.find(x=>x.id==='downpour'); if (ab){ ab.bolts = 4; ab.boltDmg = 400; ab.boltBig = 1200; } } },
      ]},
      { name:'Nozzle', ups:[
        { name:'Twist Nozzle', cost:200, desc:'Twist the nozzle to Stream in its panel: a jet 70% longer that hits 4 pests in a line for 2 and pushes small pests 12 back. Both settings soak and lather.', apply:s=>{ s.atk.main.stream = { rangeMul:1.7, pierce:4, dmg:2, knock:12, bigKnock:0, width:10 }; } },
        { name:'Scrub Jet', cost:430, desc:'The stream scrubs ghost cloaks and mold off what it hits, and both settings spray 25% faster.', apply:s=>{ const st=s.atk.main.stream; if (st){ st.decamo = true; st.demold = true; } s.atk.main.rate /= 1.25; } },
        { name:'Power Jet', cost:1750, desc:'The stream hits 8 pests for 7, strips armor, and pushes harder: small pests 24 back, vehicles 6.', apply:s=>{ const st=s.atk.main.stream; if (st){ st.pierce = 8; st.dmg = 7; st.strip = true; st.knock = 24; st.bigKnock = 6; } } },
        { name:'Pressure Washer', cost:6400, desc:'The stream hits 12 pests for 20 (+50 to vehicles), 3 times a second, pushing small pests 30 back. Ability: Hydro Blast fires a huge jet down the line with the most pests: everything in it but bosses takes 400 (800 for vehicles) and is blasted 220 back (vehicles 110).', apply:s=>{ const st=s.atk.main.stream; if (st){ st.pierce = 12; st.dmg = 20; st.bonusBig = 50; st.knock = 30; st.rate = 0.33; } s.abilities.push({ id:'hydroblast', cd:45, push:220, dmg:400, bonusBig:400, width:46 }); } },
        { name:'Power Washer 9000', cost:40000, desc:'The stream hits 20 pests for 80 (+300 to vehicles, +150 to bosses) through any shell, 6 times a second, pushing vehicles 14 back. Hydro Blast hits for 4,000 (8,000 to vehicles) and blasts 450 back.', apply:s=>{ const st=s.atk.main.stream; if (st){ st.pierce = 20; st.dmg = 80; st.bonusBig = 300; st.bonusBoss = 150; st.bigKnock = 14; st.rate = 1 / 6; st.ignoreImmune = true; } const ab=s.abilities.find(x=>x.id==='hydroblast'); if (ab){ ab.push = 450; ab.dmg = 4000; ab.bonusBig = 4000; ab.width = 60; } } },
      ]},
    ],
    paragon:{ name:'The Car Wash', cost:230000, desc:'A drive-through car wash. It mists and jets at once, keeps everything near it wet and lathered, lays foam and pours out bubbles, and runs a wash cycle through every round: Rinse, Soap, Wax and Dry. Its Bubble Bath, Downpour and Hydro Blast all come round quickly.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:210, camo:true, humid:true, atk:{
        main:{ kind:'spray', rate:0.14/k, dmg:30+dd*3, pierce:30, cone:1.3, type:'normal', ignoreImmune:true, both:true,
          wet:{ dur:6, cold:2, energy:2, chill:0.6, freeze:0.8, energyMul:2, heatMul:2, steam:{ n:16, dmg:120+dd*12, r:70 }, all:25+dd*2, bigSlow:0.6 },
          lather:{ dur:6, chance:1.2, dist:120, bigDist:45, bump:80+dd*8, vuln:0.75 },
          foam:{ every:2, r:46, life:8, slow:0.35 },
          stream:{ rangeMul:2, pierce:40, dmg:250+dd*25, bonusBig:Math.round((900+dd*90)*big), bonusBoss:Math.round((500+dd*50)*big), knock:40, bigKnock:22, width:16, decamo:true, demold:true, strip:true, ignoreImmune:true, rate:0.1/k } },
        bubbles:{ kind:'bubbles', rate:0.35/k, count:6, dmg:200+dd*20, bonusBig:Math.round((600+dd*60)*big), r:50, speed:55, life:8, type:'normal' },
      }, abilities:[{ id:'bubblebath', cd:35, n:40, back:300, hold:4, pop:3000+dd*300, popBig:Math.round((9000+dd*900)*big), big:true }, { id:'downpour', cd:45, dur:15, bolts:8, boltDmg:2000+dd*200, boltBig:Math.round((6000+dd*600)*big) }, { id:'hydroblast', cd:35, push:600, dmg:12000+dd*1200, bonusBig:Math.round((12000+dd*1200)*big), width:80 }] }; } },
  },
  /* ------------------------------------------------------- RICE COOKER */
  rice: {
    name:'Rice Cooker', cost:400, size:16, hot:'{', faction:'line',
    blurb:'Cooks quietly, then pops its lid: a burst of steam scalds every pest around it at once. Once the rice is ready it waits, warm, until pests come close, and you can open the lid early from its panel for a weaker burst. Build up the pressure, make the rice sticky, or keep pots warm to serve all at once.',
    base:{ range:95, noTarget:true, atk:{ main:{ kind:'cook', rate:3.2, dmg:6, pierce:25, type:'heat' } } },
    paths:[
      { name:'Pressure', ups:[
        { name:'Bigger Pot', cost:180, desc:'Steam bursts deal 9 and reach 10% further.', apply:s=>{ s.atk.main.dmg = 9; s.range *= 1.1; } },
        { name:'Quick Cook', cost:420, desc:'Cooks 35% faster.', apply:s=>{ s.atk.main.rate /= 1.35; } },
        { name:'Pressure Cooker', cost:1900, desc:'A sealed pot: bursts deal 28 (+60 to vehicles), get through any shell and strip armor.', apply:s=>{ const a=s.atk.main; a.dmg = 28; a.bonusBig = 60; a.ignoreImmune = true; a.strip = true; } },
        { name:'Pressure Valve', cost:6200, desc:'Every burst is followed by a second at 60% half a second later. Ability: Blow the Valve lets out 6 bursts at triple damage in 2 seconds.', apply:s=>{ s.atk.main.after = { delay:0.5, mul:0.6 }; s.abilities.push({ id:'valve', cd:45, n:6, every:0.33, mul:3 }); } },
        { name:'Industrial Steamer', cost:42000, desc:'Bursts deal 320 (+1,100 to vehicles, +500 to bosses) and reach 30% further. Blow the Valve bursts deal 5 times the damage.', apply:s=>{ const a=s.atk.main; a.dmg = 320; a.bonusBig = 1100; a.bonusBoss = 500; s.range *= 1.3; const ab=s.abilities.find(x=>x.id==='valve'); if (ab) ab.mul = 5; } },
      ]},
      { name:'Sticky', ups:[
        { name:'Sticky Rice', cost:200, desc:'Steamed pests are coated in rice: 40% slower for 2s (vehicles 15%).', apply:s=>{ s.atk.main.sticky = { slow:0.6, bigSlow:0.85, dur:2, glue:0, vuln:0 }; } },
        { name:'Glutinous', cost:450, desc:'Small pests are glued in place for 0.5s, and rice-coated pests take +1 from every hit.', apply:s=>{ const S=s.atk.main.sticky; if (S){ S.glue = 0.5; S.vuln = 1; } } },
        { name:'Rice Balls', cost:1500, desc:'Also lobs 3 rice balls every 1.4s at pests further out (range 210): 6 damage each, slowing what they hit.', apply:s=>{ s.noTarget = false; s.atk.balls = { kind:'proj', rate:1.4, dmg:6, pierce:2, speed:420, size:6, type:'normal', sprite:'shape', shape:'orb', color:'#fbf7ea', count:3, spread:0.25, rangeAbs:210, slow:{ mult:0.7, dur:1.5, bigMult:0.9 } }; } },
        { name:'Mochi Mallet', cost:5200, desc:'Glue lasts 1s, coated pests take +4 from every hit, and vehicles crawl at 60%. Ability: Mochi Pound glues every pest on screen for 2.5s (vehicles slowed, bosses 30% slower) and deals 150.', apply:s=>{ const S=s.atk.main.sticky; if (S){ S.glue = 1; S.vuln = 4; S.bigSlow = 0.6; } s.abilities.push({ id:'mochi', cd:50, dur:2.5, dmg:150, big:false, bossSlow:0.7 }); } },
        { name:'Rice Paddy', cost:34000, desc:'Glue lasts 1.6s and holds vehicles for 0.5s; coated pests take +25 from every hit and bosses crawl 30% slower. Mochi Pound deals 2,500 (+5,000 to vehicles), holds vehicles too and lasts 4s.', apply:s=>{ const S=s.atk.main.sticky; if (S){ S.glue = 1.6; S.bigGlue = 0.5; S.vuln = 25; S.boss = 0.7; } const ab=s.abilities.find(x=>x.id==='mochi'); if (ab){ ab.dmg = 2500; ab.bonusBig = 5000; ab.big = true; ab.dur = 4; ab.bossSlow = 0.6; } } },
      ]},
      { name:'Keep Warm', ups:[
        { name:'Keep Warm', cost:160, desc:'With no pests near, it keeps up to 2 finished pots warm. When pests arrive they all come out, one after another.', apply:s=>{ s.atk.main.store = 2; } },
        { name:'Warm Plate', cost:420, desc:'Appliances in its range attack 10% faster.', apply:s=>{ s.buff = Object.assign(s.buff || {}, { speed:1.1 }); } },
        { name:'Rice Timer', cost:1700, desc:'Keeps up to 4 pots warm. When a vehicle or boss comes into range, every kept pot comes out at once in one burst at double damage.', apply:s=>{ s.atk.main.store = 4; s.atk.main.timer = 2; } },
        { name:'Steam Table', cost:5400, desc:'Appliances in its range attack 20% faster and hit 1 more pest. Ability: Serve! cooks every pot it can keep warm at once and serves them straight out.', apply:s=>{ s.buff = Object.assign(s.buff || {}, { speed:1.2, pierce:1 }); s.abilities.push({ id:'serve', cd:40 }); } },
        { name:'Banquet Hall', cost:30000, desc:'Keeps up to 10 pots warm, the timer burst deals triple, bursts deal 60 and reach 25% further. Serve! recharges in 25s.', apply:s=>{ const a=s.atk.main; a.store = 10; a.timer = 3; a.dmg = Math.max(a.dmg, 60); s.range *= 1.25; const ab=s.abilities.find(x=>x.id==='serve'); if (ab) ab.cd = 25; } },
      ]},
    ],
    paragon:{ name:'The Thousand-Bowl Banquet', cost:220000, desc:'A banquet kitchen of rice cookers. It cooks in moments, glues everything it steams, keeps ten pots warm, warms every appliance near it, and every twelve bowls it serves bring out the Feast across the whole kitchen. Blow the Valve, Mochi Pound and Serve! all come round quickly.',
      make:(deg)=>{ const {k,dd,big}=pk(deg); return { range:190, camo:true, buff:{ speed:1.25, pierce:1 }, atk:{
        main:{ kind:'cook', rate:0.7/k, dmg:500+dd*50, pierce:80, type:'heat', ignoreImmune:true, strip:true, bonusBig:Math.round((1500+dd*150)*big), bonusBoss:Math.round((800+dd*80)*big), store:10, timer:3, after:{ delay:0.4, mul:0.6 },
          sticky:{ slow:0.5, bigSlow:0.6, dur:2.5, glue:1.4, bigGlue:0.5, vuln:40+dd*4, boss:0.65 } },
        balls:{ kind:'proj', rate:0.35/k, dmg:80+dd*8, pierce:4, speed:480, size:7, type:'normal', sprite:'shape', shape:'orb', color:'#fbf7ea', count:5, spread:0.3, rangeAbs:280, ignoreImmune:true, slow:{ mult:0.6, dur:1.5, bigMult:0.8 } },
      }, abilities:[{ id:'valve', cd:35, n:8, every:0.25, mul:6 }, { id:'mochi', cd:40, dur:4, dmg:8000+dd*800, bonusBig:Math.round((16000+dd*1600)*big), big:true, bossSlow:0.55 }, { id:'serve', cd:20 }] }; } },
  },
};
const TOWER_ORDER = ['knife','toaster','blender','dish','grill','fryer','freezer','micro','siphon','oven','mixer','pasta','gatling','boat','sub','heli','saucer','espresso','bread','mandoline','caddy','saucepan','bot','pets','lobster','chess','chopsticks','susan','spray','rice'];
/* the built-in appliances; custom ones from the admin tower builder are appended to TOWER_ORDER at runtime */
const BASE_TOWER_ORDER = TOWER_ORDER.slice();

/* ---------------- Skins ----------------
   Cosmetic finishes for any appliance. Earned by mastery rank. */
const SKINS = [
  { id:'classic',  name:'Classic',    rank:0, desc:'The finish it came out of the box with.' },
  { id:'mint',     name:'Retro Mint', rank:1, body:'#8fd6bd', desc:'A pastel diner finish.' },
  { id:'copper',   name:'Copper Pot', rank:2, body:'#c47640', fx:'shine', desc:'Hammered copper with a polished glint.' },
  { id:'candy',    name:'Candy Pop',  rank:2, body:'#f29bc1', fx:'sprinkles', desc:'Bubblegum pink with orbiting sprinkles.' },
  { id:'midnight', name:'Midnight',   rank:3, body:'#283454', fx:'stars', desc:'Deep navy with twinkling stars.' },
  { id:'frosted',  name:'Frosted',    rank:3, body:'#cbe8fa', fx:'frost', desc:'Ice blue with drifting snowflakes.' },
  { id:'molten',   name:'Molten',     rank:4, body:'#4e1b12', fx:'embers', desc:'Scorched black-red with rising embers.' },
  { id:'neon',     name:'Neon',       rank:5, body:'#1e1e36', fx:'neon', desc:'Dark chrome with a colour-shifting neon ring.' },
  { id:'gold',     name:'Solid Gold', rank:6, body:'#e7b53a', fx:'sparkle', desc:'Gleaming gold that sparkles.' },
  { id:'rainbow',  name:'Rainbow',    rank:8, body:'rainbow', fx:'rainbow', desc:'Cycles through every colour.' },
];

/* ---------------- Maps ----------------
   paths: polylines in playfield coordinates. Pests start at the first point.
   deco: decorations drawn on the map; solid ones block tower placement.   */
const MAPS = {
  block: {
    name:'Butcher Block', level:'Beginner', theme:'block',
    blurb:'A long, winding trail across the cutting board, with a sink for boats. Plenty of room to build.',
    paths:[[[-40,110],[320,110],[320,330],[110,330],[110,560],[560,560],[560,230],[800,230],[800,560],[985,560],[985,-40]]],
    deco:[
      { k:'board', x:600, y:30, w:150, h:86, solid:true },
      { k:'lemons', x:52, y:225, r:34, solid:true },
      { k:'pin', x:250, y:640, w:210, h:26, solid:true },
      { k:'garlic', x:1060, y:640, r:20, solid:true },
      { k:'salt', x:1065, y:300, r:15, solid:true },
      { k:'herbs', x:440, y:190, r:26 },
      { k:'flour', x:400, y:440, r:60 },
      { k:'flour', x:880, y:120, r:40 },
    ],
    water:[{ style:'sink', x:618, y:320, w:124, h:250, r:16, rim:10 }],
  },
  diner: {
    name:'Diner Floor', level:'Intermediate', theme:'diner',
    blurb:'Pests cut across the checkerboard on a red runner, past a soda spill. Corners matter here.',
    paths:[[[-40,340],[260,340],[260,110],[560,110],[560,570],[850,570],[850,340],[1140,340]]],
    deco:[
      { k:'stool', x:700, y:120, r:24, solid:true },
      { k:'stool', x:790, y:120, r:24, solid:true },
      { k:'stool', x:880, y:120, r:24, solid:true },
      { k:'booth', x:40, y:470, w:150, h:130, solid:true },
      { k:'jukebox', x:990, y:560, w:84, h:100, solid:true },
      { k:'stool', x:380, y:420, r:22, solid:true },
    ],
    water:[{ style:'soda', x:705, y:380, rx:80, ry:115 }],
  },
  pantry: {
    name:'Pantry Shelves', level:'Advanced', theme:'pantry',
    blurb:'Two trails through the shelves that cross twice, around a puddle. Pests alternate between them.',
    paths:[
      [[-40,120],[380,120],[380,560],[700,560],[700,250],[1140,250]],
      [[-40,450],[200,450],[200,300],[560,300],[560,90],[880,90],[880,470],[1140,470]],
    ],
    deco:[
      { k:'jar', x:56, y:290, r:28, solid:true, c:'#e0773a' },
      { k:'can', x:1060, y:610, r:26, solid:true },
      { k:'jar', x:1050, y:90, r:26, solid:true, c:'#7a3e8c' },
      { k:'box', x:470, y:610, w:96, h:52, solid:true },
      { k:'can', x:300, y:620, r:22, solid:true },
      { k:'sack', x:790, y:380, r:30, solid:true },
    ],
    water:[{ style:'puddle', x:540, y:430, rx:105, ry:75 }],
  },
  freezer: {
    name:'Walk-in Freezer', level:'Expert', theme:'freezer',
    blurb:'A short sprint across steel grating, past two melt pools. Every second of delay counts.',
    paths:[[[-40,340],[480,340],[480,120],[800,120],[800,560],[1140,560]]],
    deco:[
      { k:'crate', x:70, y:70, w:130, h:90, solid:true },
      { k:'crate', x:980, y:160, w:110, h:100, solid:true },
      { k:'peas', x:280, y:580, w:150, h:70, solid:true },
      { k:'pillar', x:640, y:430, r:30, solid:true },
      { k:'frost', x:930, y:420, r:50 },
    ],
    water:[{ style:'melt', x:640, y:260, rx:95, ry:70 }, { style:'melt', x:640, y:585, rx:90, ry:50 }],
  },
  /* ---------------- more kitchens, by tier ---------------- */
  bar: {
    name:'Breakfast Bar', level:'Beginner', theme:'diner',
    blurb:'A long zigzag along the counter with room everywhere. Pests spend a long time in range: a gentle start.',
    paths:[[[-40,150],[300,150],[300,520],[640,520],[640,150],[960,150],[960,520],[1140,520]]],
    deco:[
      { k:'stool', x:120, y:330, r:22, solid:true },
      { k:'stool', x:190, y:430, r:22, solid:true },
      { k:'booth', x:710, y:280, w:130, h:110, solid:true },
      { k:'jukebox', x:1010, y:20, w:84, h:100, solid:true },
    ],
    water:[{ style:'soda', x:480, y:340, rx:70, ry:90 }],
  },
  corner: {
    name:'Cutting Corner', level:'Beginner', theme:'block',
    blurb:'The trail spirals in across the board, then cuts straight out through its own loop. Long, with one crossing.',
    paths:[[[-40,600],[1000,600],[1000,100],[150,100],[150,450],[820,450],[820,250],[320,250],[320,-40]]],
    deco:[
      { k:'lemons', x:560, y:340, r:34, solid:true },
      { k:'pin', x:420, y:520, w:210, h:26, solid:true },
      { k:'garlic', x:60, y:300, r:20, solid:true },
      { k:'salt', x:1062, y:330, r:15, solid:true },
      { k:'flour', x:460, y:170, r:44 },
    ],
    water:[{ style:'sink', x:600, y:290, w:110, h:120, r:16, rim:10 }],
  },
  soup: {
    name:'Soup Station', level:'Intermediate', theme:'pantry',
    blurb:'One trail bends twice around a big spill: boats and subs rule the middle, the shelves crowd the edges.',
    paths:[[[-40,340],[260,340],[260,110],[520,110],[520,560],[800,560],[800,200],[1140,200]]],
    deco:[
      { k:'jar', x:90, y:520, r:28, solid:true, c:'#e0773a' },
      { k:'can', x:380, y:460, r:26, solid:true },
      { k:'box', x:960, y:420, w:96, h:52, solid:true },
      { k:'sack', x:150, y:160, r:30, solid:true },
      { k:'jar', x:1040, y:560, r:26, solid:true, c:'#7a3e8c' },
    ],
    water:[{ style:'puddle', x:650, y:330, rx:92, ry:90 }],
  },
  rack: {
    name:'Spice Rack', level:'Intermediate', theme:'block',
    blurb:'Two entrances feed one trail: pests from the top and the bottom meet halfway and march out together.',
    paths:[
      [[-40,120],[400,120],[400,380],[700,380],[700,600],[1140,600]],
      [[-40,500],[220,500],[220,380],[700,380],[700,600],[1140,600]],
    ],
    deco:[
      { k:'board', x:560, y:80, w:150, h:86, solid:true },
      { k:'lemons', x:920, y:300, r:34, solid:true },
      { k:'pin', x:300, y:640, w:210, h:26, solid:true },
      { k:'garlic', x:80, y:300, r:20, solid:true },
      { k:'salt', x:1050, y:450, r:15, solid:true },
      { k:'herbs', x:520, y:470, r:26 },
    ],
    water:[{ style:'sink', x:870, y:120, w:120, h:200, r:16, rim:10 }],
  },
  cold: {
    name:'Cold Storage', level:'Advanced', theme:'freezer',
    blurb:'Two short trails cross twice on the grating: one from the wall, one down from the ceiling hatch. Melt pools take the best spots.',
    paths:[
      [[-40,200],[500,200],[500,560],[1140,560]],
      [[560,-40],[560,420],[200,420],[200,720]],
    ],
    deco:[
      { k:'crate', x:900, y:40, w:130, h:90, solid:true },
      { k:'crate', x:40, y:540, w:110, h:100, solid:true },
      { k:'pillar', x:760, y:340, r:30, solid:true },
      { k:'peas', x:300, y:600, w:150, h:70, solid:true },
      { k:'frost', x:900, y:330, r:50 },
    ],
    water:[{ style:'melt', x:330, y:310, rx:90, ry:70 }, { style:'melt', x:820, y:460, rx:80, ry:50 }],
  },
  rushd: {
    name:'Dinner Rush', level:'Advanced', theme:'diner',
    blurb:'The runner loops the dining room and comes back through its own crossing, so every pest passes the middle twice.',
    paths:[[[-40,340],[300,340],[300,120],[700,120],[700,560],[300,560],[300,340],[1140,340]]],
    deco:[
      { k:'booth', x:430, y:200, w:150, h:100, solid:true },
      { k:'stool', x:900, y:150, r:24, solid:true },
      { k:'stool', x:980, y:150, r:24, solid:true },
      { k:'stool', x:120, y:500, r:22, solid:true },
      { k:'stool', x:430, y:470, r:22, solid:true },
      { k:'jukebox', x:980, y:520, w:84, h:100, solid:true },
      { k:'booth', x:40, y:80, w:150, h:130, solid:true },
    ],
    water:[{ style:'soda', x:890, y:490, rx:60, ry:70 }],
  },
  back: {
    name:'Back of House', level:'Expert', theme:'pantry',
    blurb:'Three trails through the stockroom, crossing four times. Pests take turns on each, and nowhere covers them all.',
    paths:[
      [[-40,100],[300,100],[300,400],[1140,400]],
      [[-40,600],[600,600],[600,250],[1140,250]],
      [[450,-40],[450,500],[850,500],[850,720]],
    ],
    deco:[
      { k:'jar', x:100, y:330, r:28, solid:true, c:'#e0773a' },
      { k:'box', x:1000, y:120, w:96, h:52, solid:true },
      { k:'can', x:160, y:470, r:26, solid:true },
      { k:'sack', x:720, y:120, r:30, solid:true },
      { k:'jar', x:1040, y:640, r:26, solid:true, c:'#7a3e8c' },
    ],
    water:[{ style:'puddle', x:720, y:330, rx:70, ry:40 }],
  },
  deep: {
    name:'Deep Freeze', level:'Expert', theme:'freezer',
    blurb:'A short dash past three melt pools that cover most of the floor. Dry land is scarce: the fleet earns its keep.',
    paths:[[[-40,340],[350,340],[350,160],[750,160],[750,520],[1140,520]]],
    deco:[
      { k:'crate', x:60, y:60, w:130, h:90, solid:true },
      { k:'pillar', x:560, y:620, r:30, solid:true },
      { k:'crate', x:950, y:590, w:110, h:80, solid:true },
      { k:'frost', x:120, y:250, r:50 },
    ],
    water:[{ style:'melt', x:180, y:540, rx:140, ry:110 }, { style:'melt', x:550, y:420, rx:160, ry:110 }, { style:'melt', x:950, y:300, rx:120, ry:130 }],
  },
};
const MAP_ORDER = ['block','bar','corner','diner','soup','rack','pantry','cold','rushd','freezer','back','deep'];
const MAP_TIERS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

/* ---------------- Rounds ----------------
   Each group: [type, count, spacing (s), start (s), mods]
   mods: c = ghost (camo), m = moldy (regrows), a = armored (double health), B = boss bar */
/* ---------------- The round book ----------------
   Rounds 1 to 100 follow the classic tower defense progression, pest for pest:
     ant · fruit fly · housefly · cockroach   the small fry, one rank apiece
     pillbug · snow flea · fire ant · weevil  the immune ones (blast, cold, heat, sharp)
     ant ball · mouse · rat                    the tough ones
     cheese wheel · picnic basket · food truck · raccoon   the vehicles
     midnight roach                            the fast ghost vehicle
   Mods after a count: c ghost, m moldy (regrows), a armored.
   Groups follow each other with some overlap (see bookRound). */
const ROUND_BOOK = {
  1:'ant 20', 2:'ant 35', 3:'ant 25, fruitfly 5', 4:'ant 35, fruitfly 18', 5:'ant 5, fruitfly 27',
  6:'ant 15, fruitfly 15, housefly 4', 7:'ant 20, fruitfly 20, housefly 5', 8:'ant 10, fruitfly 20, housefly 14',
  9:'housefly 30', 10:'fruitfly 102',
  11:'ant 10, fruitfly 10, housefly 12, roach 3', 12:'fruitfly 15, housefly 10, roach 5', 13:'fruitfly 50, housefly 23',
  14:'ant 49, fruitfly 15, housefly 10, roach 9', 15:'ant 20, fruitfly 15, housefly 12, roach 15',
  16:'housefly 40, roach 8', 17:'roach 12 m', 18:'housefly 80', 19:'housefly 10, roach 4, roach 5 m, roach 15',
  20:'pillbug 6',
  21:'roach 54', 22:'snowflea 16', 23:'pillbug 7, snowflea 7', 24:'fruitfly 20, housefly 1 c', 25:'roach 25 m, fireant 10',
  26:'roach 23, antball 4', 27:'ant 100, fruitfly 60, housefly 45, roach 45', 28:'weevil 6', 29:'roach 50, roach 15 m', 30:'weevil 9',
  31:'pillbug 8, snowflea 8, antball 8, antball 2 m', 32:'pillbug 15, snowflea 20, fireant 10', 33:'ant 20 c, roach 13 c',
  34:'roach 160, antball 6', 35:'roach 35, pillbug 30, snowflea 25, mouse 5', 36:'roach 140, housefly 20 cm',
  37:'pillbug 25, snowflea 25, snowflea 7 c, antball 10, weevil 15', 38:'roach 42, snowflea 17, antball 10, weevil 14, rat 2',
  39:'pillbug 10, snowflea 10, antball 20, mouse 18, mouse 2 m', 40:'cheese 1',
  41:'pillbug 60, antball 60', 42:'mouse 6 m, mouse 5 c', 43:'mouse 10, rat 7', 44:'antball 50',
  45:'roach 180, fireant 10 c, weevil 4 a, mouse 25', 46:'rat 6 a', 47:'roach 70 c, rat 12',
  48:'roach 40 m, fireant 30 cm, mouse 40, rat 3 a', 49:'housefly 343, antball 20, mouse 20, mouse 10 m, rat 18',
  50:'ant 20, weevil 8 a, rat 20, cheese 2',
  51:'mouse 10 m, rat 15 c', 52:'mouse 25, rat 10, cheese 2', 53:'roach 80 c, cheese 3', 54:'rat 35, cheese 2', 55:'rat 45, cheese 1',
  56:'mouse 40 c, cheese 1', 57:'mouse 40, cheese 4', 58:'rat 15, rat 10 a, cheese 5', 59:'weevil 50 c, rat 20, rat 10 m', 60:'basket 1',
  61:'antball 150 m, cheese 5', 62:'fireant 250, mouse 15 cm, cheese 5, cheese 2 a', 63:'weevil 75, rat 122', 64:'cheese 6, cheese 3 a',
  65:'antball 100, mouse 70, rat 50, cheese 3, basket 2', 66:'cheese 8, cheese 3 a', 67:'rat 13 cma, cheese 8', 68:'cheese 4, basket 1',
  69:'pillbug 40 m, weevil 40 a, rat 50', 70:'snowflea 120 cm, mouse 200, cheese 4',
  71:'rat 30, cheese 10', 72:'rat 38 m, basket 2', 73:'cheese 8, basket 2', 74:'rat 50, rat 60 a, rat 25 cma, basket 1',
  75:'weevil 14, weevil 14 a, cheese 3 a, basket 7', 76:'rat 60 m', 77:'cheese 11, basket 5',
  78:'fireant 80, mouse 150, rat 75, rat 72 c, basket 1', 79:'mouse 500 m, basket 4, basket 2 a', 80:'truck 1',
  81:'basket 17', 82:'basket 10, basket 5 a', 83:'rat 40, rat 40 m, rat 40 a, cheese 30', 84:'cheese 50, basket 10', 85:'truck 2',
  86:'basket 5 a', 87:'truck 4', 88:'cheese 18, basket 8, truck 2', 89:'cheese 20 a, basket 8 a', 90:'weevil 50 cma, midnight 3',
  91:'rat 100 a, basket 20', 92:'cheese 50 a, truck 4', 93:'basket 10 a, midnight 6', 94:'basket 25, truck 6',
  95:'fireant 500 cm, weevil 250 cma, cheese 50 a, midnight 30', 96:'cheese 40 a, basket 30, truck 6', 97:'truck 2 a',
  98:'basket 30 a, truck 8', 99:'cheese 60, midnight 9 a', 100:'raccoon 1',
};
/* how long a group takes to come out, by size: small pests stream in, vehicles roll in one by one */
const BOOK_GAP = { cheese: 1.5, basket: 2.6, truck: 4.5, midnight: 0.9, raccoon: 6 };
function bookRound(spec){
  const out = [];
  let start = 0;
  for (const part of spec.split(',')){
    const [type, cs, mods] = part.trim().split(/\s+/), count = +cs;
    const big = BOOK_GAP[type];
    const dur = count < 2 ? 0 : big ? big * (count - 1) : Math.min(22, 1.5 + count * 0.3);
    out.push([type, count, count < 2 ? 1 : +(dur / (count - 1)).toFixed(3), +start.toFixed(1), mods || '']);
    start += Math.max(1.5, dur * 0.45);
  }
  return out;
}
const FIXED_ROUNDS = {};
for (const n in ROUND_BOOK) FIXED_ROUNDS[n] = bookRound(ROUND_BOOK[n]);

function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function genRound(n){
  const rng = mulberry32(n * 7919 + 13);
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const g = [];
  let start = 0;
  const mods = () => {
    let m = '';
    if (n >= 24 && rng() < 0.3) m += 'c';
    if (n >= 16 && rng() < 0.35) m += 'm';
    if (n >= 28 && rng() < 0.3) m += 'a';
    return m;
  };
  // swarms of small pests
  const smallPool = n < 60 ? ['roach','antball','mouse','rat','fireant','snowflea','weevil','pillbug','housefly'] : ['antball','mouse','rat','rat','roach','fireant','snowflea'];
  const swarms = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < swarms; i++){
    const t = pick(smallPool);
    const scale = { roach:1.6, antball:1.0, mouse:0.8, rat:0.55, fireant:2.2, snowflea:2.2, weevil:1.8, pillbug:1.8, housefly:2.4 }[t] || 1;
    const count = Math.round((14 + n * 0.75) * scale * (0.7 + rng() * 0.6));
    const spacing = Math.max(0.08, 0.5 - n * 0.004 - rng() * 0.12);
    g.push([t, count, +spacing.toFixed(2), +start.toFixed(1), mods()]);
    start += count * spacing * (0.35 + rng() * 0.3);
  }
  // vehicles
  if (n > 40){
    const cheese = Math.min(26, Math.floor((n - 38) / 2.2) + Math.floor(rng() * 3));
    if (cheese > 0) g.push(['cheese', cheese, +(Math.max(0.5, 2.2 - n * 0.02)).toFixed(2), +(start * 0.5).toFixed(1), n >= 46 && rng() < 0.4 ? 'a' : '']);
  }
  if (n > 50){
    const baskets = Math.min(14, Math.floor((n - 48) / 4) + (rng() < 0.4 ? 1 : 0));
    if (baskets > 0) g.push(['basket', baskets, 2.4, +(start * 0.4 + 3).toFixed(1), n >= 66 && rng() < 0.4 ? 'a' : '']);
  }
  if (n > 75){
    const trucks = Math.min(10, Math.floor((n - 73) / 5));
    if (trucks > 0) g.push(['truck', trucks, 3.5, 6, n >= 86 && rng() < 0.4 ? 'a' : '']);
  }
  if (n > 90){
    const mids = Math.min(30, Math.floor((n - 88) * 1.3));
    if (mids > 0) g.push(['midnight', mids, 0.8, 4, '']);
  }
  if (n > 100){
    const coons = Math.min(8, Math.floor((n - 96) / 6));
    if (coons > 0) g.push(['raccoon', coons, 5, 8, n > 120 ? 'a' : '']);
  }
  return g;
}

/* ---------------- Bosses ----------------
   Bosses have their own game mode now (Boss Battles, the Boss Rush and Boss
   Night, see events.js); ordinary games and freeplay have none. The schedule
   below is kept for the boss levels and the old freeplay cycle.
   101-150: a boss every 10 waves. 151-200: every 5 waves, two at once on
   every 10th. Past 200: every other wave, three at once on every 10th.
   Bosses also level up as the waves climb (see bossLevel). */
const BOSS_CYCLE = ['ratking','dustdevil','flylord','moth','greatmold','phantom','skunk','pepper','compost','beetle','bigcheese','mole','queen'];
function bossSlots(n){
  if (n <= 100) return 0;
  if (n <= 150) return n % 10 === 0 ? 1 : 0;
  if (n <= 200) return n % 10 === 0 ? 2 : n % 5 === 0 ? 1 : 0;
  return n % 10 === 0 ? 3 : n % 2 === 0 ? 1 : 0;
}
function bossesFor(n){
  const k = n > 200 ? Math.floor(n / 2) : Math.floor(n / 5), out = [];
  for (let i = 0; i < bossSlots(n); i++) out.push(BOSS_CYCLE[(k + i * 3) % BOSS_CYCLE.length]);
  return out;
}
function bossLevel(n){ return n <= 100 ? 1 : 1 + Math.floor((n - 100) / 10); }
const BOSS_LEVEL_HP = 1.1; /* each boss level adds 10% health, compounding */
function nextBossWave(n){ for (let k = n; k < n + 60; k++) if (roundGroupsRaw(k).some(g => ENEMIES[g[0]].boss)) return k; return 0; }
function roundGroupsRaw(n){ return FIXED_ROUNDS[n] || genRound(n); }

/* ---------------- Escalation ----------------
   Every wave should be a little harder than the one before. Each round's
   composition is scaled onto a smooth, rising threat curve (total health to
   clear, weighted by speed and modifiers), so no round is a breather after a
   spike. On top of that, pests gain health and speed every wave (see DIFFS.ramp). */
const THREAT_ANCHORS = [[1,20],[10,100],[20,380],[30,1050],[40,2500],[50,4600],[60,9800],[70,18500],[80,28500],[90,46000],[100,72000]];
const THREAT_FREEPLAY = 1.035;
function threatTarget(n){
  const A = THREAT_ANCHORS;
  if (n <= A[0][0]) return A[0][1];
  const last = A[A.length - 1];
  if (n >= last[0]) return last[1] * Math.pow(THREAT_FREEPLAY, n - last[0]);
  for (let i = 1; i < A.length; i++){
    const [n1, t1] = A[i];
    if (n <= n1){ const [n0, t0] = A[i - 1]; return t0 * Math.pow(t1 / t0, (n - n0) / (n1 - n0)); }
  }
  return last[1];
}
const _fullHp = {};
function fullHp(id){
  if (_fullHp[id] != null) return _fullHp[id];
  const d = ENEMIES[id];
  let h = d.hp;
  if (d.children) for (const [c, k] of d.children) h += k * fullHp(c);
  return (_fullHp[id] = h);
}
function groupThreat(g){
  const d = ENEMIES[g.type];
  let w = fullHp(g.type) * Math.sqrt(d.speed / 64) * (g.hpMul || 1);
  if (g.mods.includes('a')) w *= 2;
  if (g.mods.includes('c')) w *= 1.3;
  if (g.mods.includes('m')) w *= 1.2;
  if (d.immune) w *= 1.15;
  return w * g.count;
}
function roundThreat(groups){ let t = 0; for (const g of groups) if (!ENEMIES[g.type].boss) t += groupThreat(g); return t; }
/* Book rounds (1 to 100) keep their shape: a round that is light or heavy
   next to its neighbours stays so (a lone cheese wheel at 40, a flood at 49),
   only softened, while the stretch as a whole sits on the threat curve.
   A handful of vehicles keeps its number and changes its health instead. */
const BOOK_SHAPE = 0.7, BOOK_CAP = 180;
const _bookRaw = {};
function bookRaw(n){
  if (_bookRaw[n] != null) return _bookRaw[n];
  const g = FIXED_ROUNDS[n].map(([type, count, spacing, start, mods]) => ({ type, count, spacing, start, mods: mods || '', hpMul: 1 }));
  return (_bookRaw[n] = roundThreat(g));
}
function bookShape(n){
  let s = 0, k = 0;
  for (let i = Math.max(1, n - 5); i <= Math.min(100, n + 5); i++) if (FIXED_ROUNDS[i]){ s += Math.log(bookRaw(i)); k++; }
  const r = bookRaw(n) / Math.exp(s / k);
  return Math.pow(Math.min(1.6, Math.max(0.3, r)), BOOK_SHAPE);
}
/* small fry come in bigger crowds; tougher pests split the change between
   crowd size and health, so a round of six pillbugs is a short line of hardy
   ones, not forty */
function fitCounts(pests, k){
  for (const g of pests){
    const d = ENEMIES[g.type];
    if (d.big && g.count <= 4) continue;
    const split = d.hp >= 3 ? 0.65 : 1;
    let c = Math.min(BOOK_CAP, Math.max(1, Math.round(g.count * Math.pow(k, split))));
    if (split < 1) g.hpMul = Math.min(2.2, Math.max(0.6, Math.pow(k, 1 - split)));
    if (c > 1 && g.count > 1) g.spacing = Math.max(0.05, +(g.spacing * (g.count - 1) / (c - 1)).toFixed(3));
    g.count = c;
  }
}
/* a lone vehicle (or a pair) is the round's test: it stays near the curve */
function loneVehicles(groups){ return groups.every(g => ENEMIES[g.type].big) && groups.reduce((a, g) => a + g.count, 0) <= 4; }
function smoothRound(n, groups){
  const pests = groups.filter(g => !ENEMIES[g.type].boss);
  const cur = roundThreat(pests);
  if (!(cur > 0)) return groups;
  const book = n <= 100 && FIXED_ROUNDS[n];
  /* the first ten rounds are played exactly as written */
  if (book && n <= 10) return groups;
  if (book){
    const lone = loneVehicles(pests);
    const target = threatTarget(n) * (lone ? Math.max(0.45, bookShape(n)) : bookShape(n));
    fitCounts(pests, target / cur);
    const resid = target / roundThreat(pests), top = lone ? 4 : 3;
    if (Math.abs(resid - 1) > 0.04) for (const g of pests) if (ENEMIES[g.type].hp >= 10) g.hpMul = Math.min(top, Math.max(0.5, g.hpMul * resid));
    return groups;
  }
  const boss = pests.length < groups.length;
  const target = threatTarget(n) * (boss ? 0.6 : 1);
  const k = Math.min(2.4, Math.max(0.45, target / cur));
  for (const g of pests){
    const c = Math.max(1, Math.round(g.count * k));
    if (c > 1 && g.count > 1) g.spacing = Math.max(0.05, +(g.spacing * (g.count - 1) / (c - 1)).toFixed(3));
    g.count = c;
  }
  /* counts are whole numbers, so a lone truck cannot be 1.6 trucks: nudge the
     health of the tougher pests in the round to land on the curve */
  const resid = target / roundThreat(pests);
  if (Math.abs(resid - 1) > 0.04) for (const g of pests) if (ENEMIES[g.type].hp >= 10) g.hpMul = Math.min(1.35, Math.max(0.75, resid));
  return groups;
}
function roundGroups(n){
  const src = roundGroupsRaw(n);
  const groups = src.map(([type, count, spacing, start, mods]) => ({ type, count, spacing, start, mods: mods || '', hpMul: 1 }));
  return smoothRound(n, groups);
}
/* per-wave growth on top of the curve, by difficulty */
function waveRamp(n, D){
  const r = (D && D.ramp) || DIFFS.medium.ramp, k = Math.max(0, n - 1);
  const hp = 1 + r.hp * k;
  return { hp, speed: 1 + r.speed * k, cash: Math.sqrt(hp) };
}

/* Extra health and speed for freeplay (past round 100), on top of the wave ramp */
function hpScale(n, big, boss){
  if (n <= 100) return 1;
  if (boss) return 1 + Math.pow((n - 100) / 20, 1.6);
  if (!big) return 1 + (n - 100) * 0.04;
  return 1 + (n - 100) * 0.06 + Math.pow(Math.max(0, n - 120) / 40, 2);
}
function speedScale(n){
  return n <= 100 ? 1 : 1 + Math.min(0.8, (n - 100) * 0.01);
}
function cashScale(n){
  if (n <= 50) return 1;
  if (n <= 60) return 0.5;
  if (n <= 85) return 0.25;
  if (n <= 100) return 0.12;
  return 0.06;
}
