'use strict';
/* =====================================================================
   Kitchen Siege — Expeditions: the screens
   The Events modal's Expedition card, the crew picker, the camp between
   kitchens, the packed appliances in the shop, and the end of a run.
   ===================================================================== */
function exLegsRow(rec){
  for (const m of rec.maps) thumbOf(m);
  return h('div', { class:'tm-legs ex-legs' }, rec.maps.map((m, i) => {
    const rule = i === rec.leg ? exRuleOf(rec, i) : rec.rules[i];
    return h('div', { class:'tm-leg' + (rec.leg > i ? ' done' : rec.leg === i && !rec.over ? ' next' : '') },
      iconCanvas(thumbs[m], 'dly-thumb'), h('b', { text: 'Kitchen ' + (i + 1) }), h('span', { text: MAPS[m].name }),
      h('small', { text: 'Rounds ' + EX_ROUNDS[i][0] + '–' + EX_ROUNDS[i][1] + ' · ' + DIFFS[EX_DIFF[i]].name + (rule ? ' · ' + CH_RULES[rule].name : '') }),
      rec.leg > i ? h('i', { class:'ok', text:'✓' }) : null);
  }));
}
function exCrewRow(types){
  return h('div', { class:'dly-towers' }, types.map(t => h('span', { class:'dly-tw', title: TOWERS[t].name }, iconCanvas(Art.towerIcon(t, 64)), h('small', { text: TOWERS[t].name }))));
}
function exPackRow(pack){
  if (!pack || !pack.length) return null;
  return h('div', { class:'ex-pack' }, pack.map(p => h('span', { class:'ex-pk', title: TOWERS[p.type] ? TOWERS[p.type].name + ' ' + p.up.join('-') : '' },
    TOWERS[p.type] ? iconCanvas(Art.towerIcon(p.type, 64, p.up)) : null, h('small', { class:'num', text: p.up.join('-') }))));
}
function expeditionSection(){
  const rec = exRecord();
  const S = Profile.stats;
  const head = h('div', { class:'dly-h' }, h('h3', { text:'Expedition' }), h('span', { class:'dly-streak', text: 'Five kitchens · ' + (S.expeditions ? fmt(S.expeditions) + ' finished' : 'best: ' + (S.exBest || 0) + ' of 5') }));
  if (!rec || rec.over || rec.done){
    const lead = rec && rec.over ? 'Your last expedition ended in kitchen ' + (rec.leg + 1) + ' of 5.' : rec && rec.done ? 'Your last expedition reached the end. Well cooked!' : 'Five kitchens in a row, rising in difficulty. Lives carry over, your surviving appliances are packed up and placed again for free, and you pick a boon at camp between kitchens. Lose once and the expedition is over.';
    return h('section', { class:'dly-sec' }, head, h('div', { class:'dly-ch ev-card' },
      h('p', { class:'dly-note', text: lead }),
      h('div', { class:'dly-reward' }, h('span', { text:'Each kitchen pays Dough; finishing all five pays' }), doughEl(EX_REWARD.dough), h('span', { text:'+ a ' + CRATES[EX_REWARD.crate].name })),
      h('div', { class:'acts-row' }, h('button', { class:'btn btn-primary', id:'ex-new', onclick: () => { const r = exNew(); showExCrewPicker(r); } }, 'Start an expedition'))));
  }
  const status = rec.offer ? 'At camp after kitchen ' + rec.leg + ' · pick a boon' : rec.leg ? 'Kitchen ' + rec.leg + ' of 5 done · ' + fmt(rec.lives) + ' lives' : rec.crew.length ? 'Ready to set out · ' + fmt(rec.lives) + ' lives' : 'Pick a crew to set out';
  const go = rec.offer ? h('button', { class:'btn btn-primary', id:'ex-go', onclick: () => showExCamp() }, 'Go to camp')
    : !rec.crew.length ? h('button', { class:'btn btn-primary', id:'ex-go', onclick: () => showExCrewPicker(rec) }, 'Pick your crew')
    : h('button', { class:'btn btn-primary', id:'ex-go', onclick: () => startExLeg(rec) }, rec.leg ? 'Continue: kitchen ' + (rec.leg + 1) : 'Start kitchen 1');
  return h('section', { class:'dly-sec' }, head, h('div', { class:'dly-ch ev-card' }, exLegsRow(rec),
    rec.crew.length ? h('div', { class:'dly-label', text:'Your crew' }) : null, rec.crew.length ? exCrewRow(rec.crew) : null,
    rec.pack.length ? h('div', { class:'dly-label', text:'Packed (' + rec.pack.length + '): placed again for free in the next kitchen' }) : null, exPackRow(rec.pack),
    rec.boons.length ? h('p', { class:'dly-note', text:'Boons: ' + rec.boons.map(b => EX_BOONS[b].name).join(', ') + '.' }) : null,
    h('div', { class:'dly-reward' }, h('span', { text: status })),
    h('div', { class:'acts-row' }, go,
      rec.crew.length && !rec.leg ? h('button', { class:'btn', onclick: () => showExCrewPicker(rec) }, 'Change crew') : null,
      h('button', { class:'btn', onclick: () => confirmBox('Abandon this expedition?', 'The run ends here. Dough already paid stays yours.', 'Abandon', () => { exAbandon(); showEvents(); }, showEvents) }, 'Abandon'))));
}
/* pick the crew's kinds; with `add`, just one more kind for a New recruit */
function showExCrewPicker(rec, add){
  const crew = rec.crew.slice(), fixed = add ? rec.crew.slice() : [];
  const max = exKindsMax(rec);
  const types = exTypes();
  const grid = h('div', { class:'crew-grid' }), meter = h('p', { class:'dly-note' });
  const render = () => {
    grid.innerHTML = '';
    for (const t of types){
      const on = crew.includes(t), lock = fixed.includes(t);
      grid.append(h('button', { class:'crew ex-crew' + (on ? ' on' : ''), 'aria-pressed': String(on), disabled: lock || (!on && crew.length >= max), onclick: () => { if (on) crew.splice(crew.indexOf(t), 1); else crew.push(t); render(); } },
        iconCanvas(Art.towerIcon(t, 64)), h('b', { text: TOWERS[t].name }), h('small', { text: FACTIONS[factionOf(t)].name })));
    }
    meter.textContent = crew.length + ' of ' + max + ' kinds' + (crew.length ? '' : ' · pick at least one');
    const ok = $('#ex-crew-ok'); if (ok) ok.disabled = !exCrewOk(crew, rec) || (add && crew.length === fixed.length);
  };
  modal({ title: add ? 'A new recruit' : 'Pick your crew', lead: add ? 'Add one more kind of appliance to the crew for the rest of the expedition.' : 'Up to ' + max + ' kinds of appliance, as many of each as you can afford, for all five kitchens. Your head chef always comes along.', cls:'daily', wide:true,
    content:[meter, grid],
    actions:[{ label:'Back', onClick: add ? showExCamp : showEvents }, { label: add ? 'Recruit' : 'Set out', kind:'primary', onClick: () => {
      if (!exCrewOk(crew, rec)) return;
      if (add){ const t = crew.find(x => !fixed.includes(x)); if (t) exAddRecruit(t); showExReady(); return; }
      rec.crew = crew; saveProfile(); startExLeg(rec);
    } }] });
  const ok = $$('.modal .acts .btn-primary')[0]; if (ok) ok.id = 'ex-crew-ok';
  render();
}
function startExLeg(rec){
  closeModal();
  rec.tries++; saveProfile();
  const ch = exLeg(rec);
  UI.diffPick = ch.diff;
  startNewGame(ch.map, ch.diff, false, ch);
  if (ch.pack.length) toast(ch.pack.length + ' packed appliance' + (ch.pack.length === 1 ? '' : 's') + ' came along: find them above the shop and place them for free.', 'gold');
}
function showExVictory(reward){
  const r = reward && reward.ex;
  if (r && r.last){
    modal({ title:'Expedition complete!', lead:'All five kitchens cooked with ' + fmt(G.lives) + ' lives to spare. ' + (r.crate ? 'Your reward: ' + fmt(r.dough) + ' Dough and a ' + CRATES[r.crate].name + '.' : ''),
      content:[h('div', { class:'big-medal daily' }, svgEl(HAT_SVG)), statBlock([['Rounds', fmt(G.round - G.stats.start)], ['Pests cooked', fmt(G.stats.kills)], ['Lives left', fmt(G.lives)]]), rewardSummary()],
      actions:[r.crate ? { label:'Open your crate', kind:'primary', onClick: () => { exitToMenu(); show('shop'); openCrateFlow(r.crate); } } : { label:'Events', kind:'primary', onClick: () => { exitToMenu(); showEvents(); } }, { label:'Back to menu', onClick: exitToMenu }],
      dismissable:false });
    return;
  }
  const rec = exRecord();
  modal({ title:'Kitchen ' + ((r ? r.leg : 0) + 1) + ' cleared', lead: MAPS[G.mapId].name + ' is safe. ' + fmt(G.lives) + ' lives and ' + (rec ? rec.pack.length : 0) + ' packed appliances come along' + (r && r.dough ? ', and you earned ' + fmt(r.dough) + ' Dough' : '') + '.',
    content:[statBlock([['Rounds', fmt(G.round - G.stats.start)], ['Pests cooked', fmt(G.stats.kills)], ['Lives left', fmt(G.lives)]]), rec ? exPackRow(rec.pack) : null, rewardSummary()],
    actions:[{ label:'Make camp', kind:'primary', onClick: () => { exitToMenu(); showExCamp(); } }, { label:'Back to menu', onClick: exitToMenu }],
    dismissable:false });
}
function showExCamp(){
  const rec = exRecord();
  if (!rec || !rec.offer){ showExReady(); return; }
  if (UI.screen === 'game'){ G.active = false; show('menu'); }
  const cards = h('div', { class:'ex-boons' }, rec.offer.map(id => {
    const B = EX_BOONS[id];
    return h('button', { class:'ex-boon', 'data-boon': id, onclick: () => { exPickBoon(id); Sfx.play('rank'); if (id === 'recruit') showExCrewPicker(rec, true); else showExReady(); } },
      h('span', { class:'ex-bi', 'aria-hidden':'true', text: B.icon }), h('b', { text: B.name }), h('span', { text: B.desc }));
  }));
  modal({ title:'Camp', lead:'A night’s rest before kitchen ' + (rec.leg + 1) + ' (' + MAPS[rec.maps[rec.leg]].name + '). Pick one boon.', cls:'daily', wide:true,
    content:[exLegsRow(rec), cards], actions:[{ label:'Later', onClick: () => closeModal() }], dismissable:false });
}
function showExReady(){
  const rec = exRecord();
  if (!rec) return;
  const rule = exRuleOf(rec, rec.leg);
  modal({ title:'Kitchen ' + (rec.leg + 1) + ' of 5: ' + MAPS[rec.maps[rec.leg]].name, lead: 'Rounds ' + EX_ROUNDS[rec.leg][0] + ' to ' + EX_ROUNDS[rec.leg][1] + ' on ' + DIFFS[EX_DIFF[rec.leg]].name + ', with ' + fmt(rec.lives) + ' lives and ' + money(EX_CASH[rec.leg] + (rec.purse || 0)) + '. ' + (rule ? 'House rule: ' + CH_RULES[rule].name + ' — ' + CH_RULES[rule].desc : 'No house rule.'),
    content:[exCrewRow(rec.crew), exPackRow(rec.pack)],
    actions:[{ label:'Menu', onClick: () => closeModal() }, { label:'Set out', kind:'primary', onClick: () => startExLeg(rec) }] });
}
function showExDefeat(){
  const rec = exRecord();
  modal({ title:'The expedition ends', lead:'The pests broke through on round ' + G.round + ' in kitchen ' + ((G.ch.ex.leg || 0) + 1) + ' of 5. ' + (rec && rec.leg ? 'You cleared ' + rec.leg + (rec.leg === 1 ? ' kitchen' : ' kitchens') + ' on this run.' : ''),
    content:[statBlock([['Rounds survived', fmt(Math.max(0, G.round - G.stats.start))], ['Pests cooked', fmt(G.stats.kills)], ['Best run', (Profile.stats.exBest || 0) + ' of 5']]), rewardSummary(), xpList()],
    actions:[{ label:'New expedition', kind:'primary', onClick: () => { G.active = false; show('menu'); showExCrewPicker(exNew()); } }, { label:'Menu', onClick: () => { G.active = false; show('menu'); } }],
    dismissable:false });
}
/* the shop's packed appliances */
function exShopBits(shop){
  shop.append(h('p', { class:'fnote ch-note', text:'Expedition crew: these ' + G.ch.towers.length + ' kinds, as many as you like.' }));
  const P = G.ch.pack || [];
  if (!P.length) return;
  shop.append(h('div', { class:'fhead', style:'--fc:#c08a4a' }, h('i', { 'aria-hidden':'true' }), 'Packed · free'));
  P.forEach((p, i) => {
    if (!TOWERS[p.type]) return;
    shop.append(h('button', { class:'card ex-packcard', 'data-pack': String(i), title: 'Packed ' + TOWERS[p.type].name + ' ' + p.up.join('-') + ': place it for free', onclick: () => startPackPlace(i) },
      h('span', { class:'hk', text:'🎒' }), iconCanvas(Art.towerIcon(p.type, 64, p.up)), h('span', { class:'nm', text: TOWERS[p.type].name }), h('span', { class:'pr num', text:'Free · ' + p.up.join('-') })));
  });
}
function startPackPlace(i){
  const p = G.ch && G.ch.pack && G.ch.pack[i];
  if (!p || !G.active || G.over) return;
  Sfx.unlock();
  UI.placing = p.type; UI.pasting = { type: p.type, up: p.up.slice(), tg:'first', pack: i }; UI.sel = null; UI.ghost = null; UI.spotPick = null; UI.lockPick = null;
  $('#place-hint').hidden = true;
  if (UI.pointer) setGhost(UI.pointer.x, UI.pointer.y);
  updatePanel(); updateShop(); updateClip(); showInfo(p.type);
  Sfx.play('click');
}
