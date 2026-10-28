'use strict';
/* =====================================================================
   Kitchen Siege — Sandbox
   A game with no stakes, for trying things out. Pick it with the Sandbox
   switch when you start a new game (any kitchen, any difficulty):
     · cash and lives never run out (both can be switched off again)
     · every upgrade, skin and head chef is unlocked, Chef Infinity included
     · the Sandbox panel sends any pest, boss or round when you ask for it,
       jumps to any round, scales pest health and your damage, maxes a
       selected appliance, and wipes the kitchen clean
     · nothing is earned: no medals, records, achievements, Dough, mastery
       or chef XP
   It never ends: there is no final round.
   ===================================================================== */
MODES.sandbox = { name:'Sandbox', sandbox:true, glyph:'∞', medal:'', blurb:'Infinite cash and lives, everything unlocked, and a panel that sends any pest or round on demand. Nothing is earned.' };

function sandboxOn(){ return !!(G.active && !G.attract && G.M && G.M.sandbox); }
/* applyMode calls this when a game starts as a sandbox */
function sandboxStart(){
  G.freeplay = true;
  G.adminUsed = true;     // no medals, records or Dough (the same gate Chef Infinity uses)
  G.sbOwned = true;       // the flags below are ours: setupGame takes them back for the next game
  G.admin.infCash = true; G.admin.god = true; G.admin.dmgMult = 1;
  G.cash = 9999999;
}
/* a normal game must never inherit a sandbox's flags */
function sandboxEnd(){
  if (!G.sbOwned) return;
  G.sbOwned = false;
  G.admin.infCash = false; G.admin.god = false; G.admin.dmgMult = 1;
  if (G.mod){ G.mod.hp = 1; }
}
const SB_HP = [0.25, 0.5, 1, 2, 5, 20];
const SB_DMG = [1, 2, 10, 100];
/* the switches worth keeping across a save */
function sbSave(){ return { c: G.admin.infCash ? 1 : 0, g: G.admin.god ? 1 : 0, d: G.admin.dmgMult, h: G.mod ? G.mod.hp : 1 }; }
function sbLoad(s){
  if (!s || typeof s !== 'object') return;
  G.admin.infCash = !!s.c; G.admin.god = !!s.g;
  G.admin.dmgMult = SB_DMG.indexOf(+s.d) >= 0 ? +s.d : 1;
  if (G.mod) G.mod.hp = SB_HP.indexOf(+s.h) >= 0 ? +s.h : 1;
}
/* the sandbox's own actions (the service menu has the rest) */
const Sandbox = {
  /* the nth round's pests, sent right now */
  sendRound(n){
    if (!sandboxOn()) return false;
    Admin.setRound(n);
    return startRound();
  },
  next(d){ if (sandboxOn()) Admin.setRound(clamp(G.round + d, 1, 999)); },
  /* pests of one kind; bosses go through the same door */
  spawn(type, count, mods){ if (sandboxOn() && ENEMIES[type]) Admin.spawn(type, clamp(Math.floor(count) || 1, 1, 200), mods || {}); },
  /* sell every appliance back and clear the field */
  clearKitchen(){
    if (!sandboxOn()) return 0;
    Admin.killAll(); G.enemies = [];
    const n = G.towers.length;
    for (const t of G.towers.slice()) if (G.towers.includes(t)) sellTower(t);
    G.roundActive = false; G.spawn = null;
    return n;
  },
  hp(m){ if (sandboxOn() && G.mod) G.mod.hp = m; },
  dmg(m){ if (sandboxOn()) G.admin.dmgMult = m; },
  cash(on){ if (sandboxOn()){ G.admin.infCash = !!on; if (!on) G.cash = Math.min(G.cash, 100000); } },
  god(on){ if (sandboxOn()) G.admin.god = !!on; },
};
