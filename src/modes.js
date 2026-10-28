'use strict';
/* =====================================================================
   Kitchen Siege — game modes
   Every difficulty has its Standard game and a few house styles beside
   it, each with its own medal on every kitchen:
     Easy      Prep Station Only · Fixed Menu (one budget, no income)
     Medium    Hot & Cold Only · Rush Hour (rounds never stop) · Back Door
               (pests come in through the pantry)
     Hard      Specialty Only · Double Trouble (vehicles twice as tough) ·
               Half Portions (half the cash) · Chef's Special (every round
               rearranged)
     Michelin  Chef's Table (no income, no selling, no powers, no retries)
   A mode is a set of rules the engine reads from G.mode; the medal for a
   win is stored under diff + ':' + mode (Standard keeps its old key).
   ===================================================================== */
const MODES = {
  standard: { name:'Standard', medal:'', blurb:'The regular menu.', glyph:'' },
  /* easy */
  prep:     { diff:'easy', name:'Prep Station Only', only:'prep', glyph:'P', medal:'Prep Cook',
              blurb:'Only Prep Station appliances, plus your head chef.' },
  fixed:    { diff:'easy', name:'Fixed Menu', deflation:true, glyph:'F', medal:'Fixed Menu', start:31, end:60, cash:20000,
              blurb:'Rounds 31 to 60 on one budget of $20,000: no cash from pests, rounds or income appliances.' },
  /* medium */
  line:     { diff:'medium', name:'Hot & Cold Only', only:'line', glyph:'L', medal:'Line Cook',
              blurb:'Only Hot & Cold appliances, plus your head chef.' },
  rush:     { diff:'medium', name:'Rush Hour', rush:true, glyph:'R', medal:'Rush Hour',
              blurb:'The rounds never stop: each one starts a few seconds after the last, whether you are ready or not.' },
  reverse:  { diff:'medium', name:'Back Door', reverse:true, glyph:'B', medal:'Back Door',
              blurb:'Pests come in through the pantry and head for the crack in the wall: every trail runs backwards.' },
  /* hard */
  special:  { diff:'hard', name:'Specialty Only', only:'special', glyph:'S', medal:'Specialist',
              blurb:'Only Specialty appliances, plus your head chef.' },
  double:   { diff:'hard', name:'Double Trouble', mod:{ bigHp:2 }, glyph:'D', medal:'Double Trouble',
              blurb:'Every vehicle has twice the health.' },
  half:     { diff:'hard', name:'Half Portions', mod:{ cash:0.5 }, cashMul:0.5, glyph:'½', medal:'Half Portions',
              blurb:'Half the starting cash, half the cash from pests, rounds and income appliances.' },
  alt:      { diff:'hard', name:'Chef’s Special', alt:true, glyph:'A', medal:'Chef’s Special',
              blurb:'Every round rearranged: odd rounds send promoted pests, even rounds send armored vehicles.' },
  /* michelin */
  table:    { diff:'michelin', name:'Chef’s Table', chimps:true, glyph:'T', medal:'Chef’s Table', start:6, cash:650,
              blurb:'The purest test: rounds 6 to 100 with one life, no cash from pests or rounds, no income appliances, no selling, no powers and no retries.' },
};
const MODE_ORDER = ['prep', 'fixed', 'line', 'rush', 'reverse', 'special', 'double', 'half', 'alt', 'table'];
function modesFor(diff){ return MODE_ORDER.filter(id => MODES[id].diff === diff); }
function modeOf(id){ return MODES[id] && id !== 'standard' ? MODES[id] : null; }
/* the medal a win earns: Standard keeps the difficulty's own key */
function medalKey(diff, mode){ return mode && mode !== 'standard' ? diff + ':' + mode : diff; }
function medalName(diff, mode){ const M = modeOf(mode); return M ? DIFFS[diff].name + ' · ' + M.medal : DIFFS[diff].medal; }
/* how many mode medals a kitchen has, and how many there are to get */
function modeMedals(mapId){
  const m = Profile.medals[mapId] || {};
  let got = 0;
  for (const id of MODE_ORDER) if (m[medalKey(MODES[id].diff, id)]) got++;
  return { got, all: MODE_ORDER.length };
}
/* the rules a mode adds on top of its difficulty: applied by setupGame */
function applyMode(id){
  const M = modeOf(id);
  G.mode = M ? id : 'standard';
  G.M = M;
  if (!M) return;
  if (M.mod) for (const k in M.mod) G.mod[k] = typeof M.mod[k] === 'number' && typeof G.mod[k] === 'number' ? G.mod[k] * M.mod[k] : M.mod[k];
  if (M.start) G.round = M.start;
  if (M.end) G.win = M.end;
  if (M.cash != null) G.cash = M.cash;
  if (M.cashMul) G.cash = Math.round(G.cash * M.cashMul);
  if (M.chimps){ G.mod.noSell = true; }
  if (M.sandbox) sandboxStart();
  if (M.reverse) G.paths = MAPS[G.mapId].paths.map(p => buildPath(p.slice().reverse()));
  G.stats.start = G.round;
}
/* no income at all: Fixed Menu and the Chef's Table (addCash lets sales and withdrawals through) */
function modeNoIncome(){ return !!(G.M && (G.M.deflation || G.M.chimps)); }
/* the cash a round's bonus and income appliances bring, by mode */
function modeCashMul(){ return G.M && G.M.cashMul ? G.M.cashMul : 1; }
function modeAllows(type){
  if (!G.M || !G.M.only) return true;
  const T = TOWERS[type];
  return !!T && (!!T.hero || factionOf(type) === G.M.only);
}
function modeNoRetry(){ return !!(G.M && G.M.chimps) || !!(G.ch && G.ch.ex); }
function modeNoPowers(){ return !!(G.M && (G.M.chimps || G.M.deflation)); }
/* Chef's Special: odd rounds are promoted, even rounds send armored vehicles */
function modeGroups(n, groups){
  if (!G.M || !G.M.alt) return groups;
  if (n % 2) groups.forEach((g, i) => { g.type = promote(g.type, i); });
  else groups.forEach(g => { if (ENEMIES[g.type].big && !ENEMIES[g.type].boss && !g.mods.includes('a')) g.mods += 'a'; });
  return groups;
}
/* Rush Hour: the next round starts by itself a few seconds after the last ends; sooner as the game goes on */
function rushGap(n){ return Math.max(2, 6 - n * 0.06); }
function rushTick(dt){
  if (!((G.M && G.M.rush) || (G.ev && G.ev.kind === 'race')) || !G.active || G.over || G.roundActive || G.attract || (G.won && !G.freeplay)) { G.rushLeft = null; return; }
  if (G.rushLeft == null) G.rushLeft = G.ev ? 1.5 : rushGap(G.round);
  G.rushLeft -= dt;
  if (G.rushLeft <= 0){ G.rushLeft = null; startRound(); }
}
/* what a mode says about itself in the pause screen and the mode label */
function modeLabel(){ return G.M ? G.M.name : ''; }
function modeRulesText(){
  const M = G.M;
  if (!M) return '';
  const out = [];
  if (M.sandbox) out.push('infinite cash and lives, everything unlocked, nothing earned');
  if (M.only) out.push(FACTIONS[M.only].name + ' appliances only');
  if (M.deflation) out.push('no income');
  if (M.chimps) out.push('no income, no selling, no powers, no retries');
  if (M.rush) out.push('rounds start by themselves');
  if (M.reverse) out.push('trails run backwards');
  if (M.mod && M.mod.bigHp) out.push('vehicles ×' + M.mod.bigHp + ' health');
  if (M.cashMul) out.push('half cash');
  if (M.alt) out.push('rearranged rounds');
  return out.join(' · ');
}
