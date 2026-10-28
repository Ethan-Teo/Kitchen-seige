'use strict';
/* =====================================================================
   Kitchen Siege — the Sandbox panel
   A floating, draggable panel (same look as the service menu) that only
   exists in a Sandbox game. Opened from the Sandbox button under the
   Start button.
   ===================================================================== */
function sandboxButton(){
  const b = $('#btn-sandbox');
  if (!b) return;
  b.hidden = !sandboxOn();
  if (b.hidden) closeSandbox();
}
function openSandbox(){
  if (!sandboxOn()) return;
  UI.sbxOpen = true;
  buildSandbox();
  $('#sandbox').hidden = false;
  Sfx.play('click');
}
function closeSandbox(){
  UI.sbxOpen = false;
  const p = $('#sandbox');
  if (p) p.hidden = true;
}
function toggleSandbox(){ if (UI.sbxOpen) closeSandbox(); else openSandbox(); }
function buildSandbox(){
  const A = $('#sandbox');
  if (!A) return;
  A.innerHTML = '';
  if (!sandboxOn()){ A.hidden = true; return; }
  const btn = (label, fn, cls, title) => h('button', { class:'a ' + (cls || ''), title: title || '', onclick: () => { fn(); Sfx.play('click'); buildSandbox(); updateHud(); } }, label);
  const tog = (label, on, fn) => btn(label + (on ? ': on' : ': off'), fn, on ? 'on' : '');
  const num = (id, val, w) => { const i = h('input', { type:'number', id, value: String(val), 'aria-label': id }); if (w) i.style.width = w; return i; };
  const head = h('header', {}, h('b', { text:'Sandbox' }), h('button', { 'aria-label':'Close', onclick: closeSandbox, text:'×' }));
  A.append(head);
  dragify(A, head);

  /* money, lives, strength */
  A.append(h('section', {}, h('h5', { text:'Money and lives' }),
    h('div', { class:'r' }, tog('Infinite cash', G.admin.infCash, () => Sandbox.cash(!G.admin.infCash)), tog('Invincible', G.admin.god, () => Sandbox.god(!G.admin.god))),
    h('div', { class:'r' }, h('span', { class:'muted', text:'Your damage' }), SB_DMG.map(s => btn('×' + s, () => Sandbox.dmg(s), G.admin.dmgMult === s ? 'on' : ''))),
    h('div', { class:'r' }, h('span', { class:'muted', text:'Pest health' }), SB_HP.map(s => btn('×' + s, () => Sandbox.hp(s), (G.mod ? G.mod.hp : 1) === s ? 'on' : '')))));

  /* rounds */
  const roundIn = num('sbx-round', G.round, '70px');
  const go = () => Math.max(1, Math.floor(+$('#sbx-round').value) || 1);
  A.append(h('section', {}, h('h5', { text:'Rounds' }),
    h('div', { class:'r' }, btn('◀', () => Sandbox.next(-1), '', 'Previous round'), roundIn, btn('▶', () => Sandbox.next(1), '', 'Next round')),
    h('div', { class:'r' }, btn('Go to round', () => Admin.setRound(go())), btn('Send it now', () => Sandbox.sendRound(go()), 'on', 'Jump to this round and start it')),
    h('div', { class:'r' }, btn('Skip round', () => Admin.skipRound()), btn('Clear pests', () => Admin.killAll(), 'warn')),
    h('div', { class:'r' }, h('span', { class:'muted', text:'Speed' }), [1, 2, 3, 5, 10].map(s => btn(s + '×', () => { G.speed = s; }, G.speed === s ? 'on' : '')))));

  /* pests */
  const groups = [['Pests', id => !ENEMIES[id].big && !ENEMIES[id].boss], ['Vehicles', id => ENEMIES[id].big && !ENEMIES[id].boss], ['Bosses', id => ENEMIES[id].boss]];
  const sel = h('select', { id:'sbx-type', 'aria-label':'Pest' }, groups.map(([label, test]) =>
    h('optgroup', { label }, ENEMY_ORDER.filter(id => ENEMIES[id] && test(id)).map(id => h('option', { value:id, text: ENEMIES[id].name })))));
  sel.value = UI.sbxType && ENEMIES[UI.sbxType] ? UI.sbxType : 'rat';
  sel.addEventListener('change', () => { UI.sbxType = sel.value; });
  const cnt = num('sbx-count', UI.sbxCount || 10, '60px');
  const mod = (k, label) => { const c = h('input', { type:'checkbox', id:'sbx-' + k }); c.checked = !!(UI.sbxMods || {})[k]; c.addEventListener('change', () => { UI.sbxMods = UI.sbxMods || {}; UI.sbxMods[k] = c.checked; }); return h('label', { for:'sbx-' + k }, c, label); };
  A.append(h('section', {}, h('h5', { text:'Send pests' }),
    h('div', { class:'r' }, sel, cnt),
    h('div', { class:'r' }, mod('camo', 'Ghost'), mod('mold', 'Moldy'), mod('armored', 'Armored')),
    h('div', { class:'r' }, btn('Send', () => { UI.sbxType = $('#sbx-type').value; UI.sbxCount = +$('#sbx-count').value || 1; Sandbox.spawn(UI.sbxType, UI.sbxCount, UI.sbxMods || {}); }, 'on')),
    h('div', { class:'muted', text:'Pest and boss strength follow the round number. Go to a later round first for tougher ones.' })));

  /* appliances */
  const s = UI.sel && G.towers.includes(UI.sel) ? UI.sel : null;
  A.append(h('section', {}, h('h5', { text:'Appliances' }),
    h('div', { class:'muted', text: s ? 'Selected: ' + TOWERS[s.type].name + ' ' + s.up.join('-') : 'Select an appliance on the map to max it out.' }),
    h('div', { class:'r' }, [0, 1, 2].map(p => btn('Max to ' + ['5-2-0', '0-5-2', '2-0-5'][p], () => { if (s){ Admin.maxTower(s, p); updatePanel(true); buildAbilities(); } }, s ? '' : 'muted'))),
    h('div', { class:'r' }, btn('Reset cooldowns', () => Admin.resetCooldowns()),
      UI.sbxWipe ? btn('Confirm: sell everything', () => { UI.sbxWipe = false; Sandbox.clearKitchen(); UI.sel = null; updatePanel(true); buildAbilities(); }, 'warn') : btn('Clear kitchen', () => { UI.sbxWipe = true; setTimeout(() => { UI.sbxWipe = false; if (UI.sbxOpen) buildSandbox(); }, 4000); }, 'warn'))));
  A.append(h('section', {}, h('div', { class:'muted', text:'Sandbox games earn no medals, records, Dough or mastery. Every upgrade, skin and chef is unlocked.' })));
}
