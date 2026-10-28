'use strict';
/* =====================================================================
   Kitchen Siege — the first-game walkthrough
   Six short steps shown over the kitchen on a player's first game, each
   one ticked off by the thing it asks for: pick an appliance, place it,
   start a round, select it, upgrade it, then carry on. Each step lights
   up the part of the screen it talks about. Skippable, never shown again.
   ===================================================================== */
const TUT_STEPS = [
  { h:'Pick an appliance', t: () => VERB + ' the Knife Block in the shop (or press Q).', mark:'#shop .card[data-type="knife"]', done: () => !!UI.placing || G.towers.some(t => !t.hero) },
  { h:'Place it by the trail', t: () => VERB + ' the kitchen floor next to the green trail. Appliances reach as far as the circle shows.', mark:'#cv', done: () => G.towers.some(t => !t.hero) },
  { h:'Start the round', t: () => 'Press Start (or Space). Pests follow the trail to the pantry; every one that gets through costs lives.', mark:'#btn-go', done: () => G.roundActive || G.round > 1 },
  { h:'Select your appliance', t: () => VERB + ' the Knife Block to see its three upgrade paths.', mark:'#cv', done: () => !!UI.sel && !UI.sel.hero },
  { h:'Buy an upgrade', t: () => 'Each path makes it stronger in its own way. Pick one and buy the first tier when you can afford it.', mark:'#tpanel', done: () => G.towers.some(t => !t.hero && t.up.some(v => v > 0)) },
  { h:'Keep cooking', t: () => 'Every cleared round pays a bonus. Your head chef waits above the shop, and the Powers button sits at the bottom right. Good luck!', mark:'', done: () => false, last: true },
];
let tutStep = -1, tutLastT = 0;
function tutOn(){ return tutStep >= 0; }
function tutStart(){
  if (Profile.tut || G.ch || G.ev || G.attract) return;
  tutStep = 0; tutShow();
}
function tutEnd(){
  if (tutStep < 0) return;
  tutStep = -1; Profile.tut = 1; saveProfile();
  $('#tut').hidden = true; tutMark('');
}
function tutMark(sel){
  for (const el of $$('.tut-mark')) el.classList.remove('tut-mark');
  if (sel){ const el = $(sel); if (el) el.classList.add('tut-mark'); }
}
function tutShow(){
  const S = TUT_STEPS[tutStep];
  const box = $('#tut'); box.hidden = false;
  $('#tut-n').textContent = String(tutStep + 1);
  $('#tut-h').textContent = S.h; $('#tut-t').textContent = S.t();
  $('#tut-skip').textContent = S.last ? 'Got it' : 'Skip';
  tutMark(S.mark);
  tutLastT = UI.time;
}
function tutTick(){
  if (tutStep < 0 || UI.screen !== 'game' || !G.active) return;
  const S = TUT_STEPS[tutStep];
  if (S.last){ if (G.round >= 3) tutEnd(); return; }
  if (S.done()){
    tutStep++;
    if (tutStep >= TUT_STEPS.length) tutEnd(); else { tutShow(); Sfx.play('click'); }
  }
}
