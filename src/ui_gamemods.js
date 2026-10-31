'use strict';
/* =====================================================================
   Kitchen Siege — the Mod Maker: your mods, switching them on, making
   and editing them, share codes and presets.
   ===================================================================== */
function showMods(back){
  Sfx.unlock();
  const list = h('div', { class:'gm-list' });
  const on = new Set(gameModsOn());
  const ids = gameModList();
  if (!ids.length) list.append(h('p', { class:'dly-note', text:'No mods yet. Make one, start from an example, or paste a code.' }));
  for (const id of ids){
    const m = gameModById(id);
    const sw = h('input', { type:'checkbox', 'aria-label':'Use ' + m.name });
    sw.checked = on.has(id);
    sw.addEventListener('change', () => { setGameModOn(id, sw.checked); Sfx.play('click'); showMods(back); });
    list.append(h('div', { class:'gm-row' + (on.has(id) ? ' on' : ''), 'data-id': id },
      h('label', { class:'switch' }, sw, h('i')),
      h('div', { class:'gm-txt' }, h('b', { text: m.name }), m.by ? h('span', { class:'gal-by', text:'by ' + m.by }) : null, h('span', { text: m.blurb || gameModSummary(m) }), m.blurb ? h('small', { text: gameModSummary(m) }) : null),
      h('div', { class:'gal-acts' },
        h('button', { class:'btn btn-small', onclick: () => showModEditor(id, () => showMods(back)) }, 'Edit'),
        h('button', { class:'btn btn-small', onclick: () => { copyText(gameModCode(m)); toast('Mod code copied.', 'info'); } }, 'Copy code'),
        h('button', { class:'btn btn-small', onclick: () => confirmBox('Delete ' + m.name + '?', 'The mod is gone for good. Saved games that used it keep their copy.', 'Delete', () => { deleteGameMod(id); showMods(back); }, () => showMods(back)) }, 'Delete'))));
  }
  const paste = h('textarea', { class:'gal-paste', rows: 2, placeholder:'Paste a mod code (KSX1:…)', 'aria-label':'Mod code' });
  const presets = h('div', { class:'gm-presets' }, Object.keys(GM_PRESETS).map(k => h('button', { class:'btn btn-small', title: GM_PRESETS[k].blurb, onclick: () => {
    const id = saveGameMod(Object.assign(defaultGameMod(), JSON.parse(JSON.stringify(GM_PRESETS[k]))));
    if (!id){ toast('You have ' + GMOD_MAX + ' mods already.', 'warn'); return; }
    Sfx.play('upgrade'); showModEditor(id, () => showMods(back));
  } }, GM_PRESETS[k].name)));
  const n = on.size;
  modal({ title:'Mods', lead:'Mods change the rules of your games: prices, damage, pest health and speed, starting cash and lives, banned appliances and more. Switch mods on here and they apply to every new ordinary game (not dailies, events, expeditions or the Tasting Menu). Modded games earn no medals, Dough, mastery XP or achievements.', wide:true, cls:'gamemods',
    content:[h('p', { class:'gm-status' + (n ? ' on' : ''), text: n ? n + (n === 1 ? ' mod is' : ' mods are') + ' on: ' + gameModsOn().map(id => gameModById(id).name).join(', ') + '.' : 'No mods are on: games play as normal.' }), list,
      h('div', { class:'dly-label', text:'Start from an example' }), presets,
      h('div', { class:'gal-pastebox' }, paste, h('button', { class:'btn btn-small', onclick: () => {
        try { const m = gameModFromCode(paste.value); const id = saveGameMod(m); if (!id) throw new Error('You have ' + GMOD_MAX + ' mods already.'); Sfx.play('upgrade'); toast('Added ' + m.name + '.', 'gold'); showMods(back); }
        catch (e){ Sfx.play('error'); toast(e.message, 'warn'); }
      } }, 'Add from code'))],
    actions:[{ label:'Back', onClick: back || null }, { label:'Make a mod', kind:'primary', onClick: () => showModEditor(null, () => showMods(back)) }], onClose: back });
}
/* a number field for a setting: blank means unchanged */
function gmField(label, val, lo, hi, step, set, hint){
  const inp = h('input', { type:'number', min: String(lo), max: String(hi), step: String(step), placeholder: hint == null ? '' : String(hint), 'aria-label': label });
  if (val != null) inp.value = String(val);
  inp.addEventListener('input', () => set(inp.value === '' ? null : Number(inp.value)));
  return h('label', { class:'gm-field' }, h('span', { text: label }), inp);
}
function showModEditor(id, back){
  const m = JSON.parse(JSON.stringify(id ? gameModById(id) : defaultGameMod()));
  if (!Array.isArray(m.buffs)) m.buffs = [];
  const summary = h('p', { class:'gm-summary' });
  const refresh = () => { summary.textContent = gameModSummary(cleanGameMod(m)); };
  const text = (k, label, max, ph) => { const i = h('input', { type:'text', maxlength: String(max), placeholder: ph || '', 'aria-label': label, value: m[k] || '' }); i.addEventListener('input', () => { m[k] = i.value; }); return h('label', { class:'gm-field wide' }, h('span', { text: label }), i); };
  /* rules */
  const rules = h('div', { class:'gm-grid' });
  for (const k in GM_RULES){
    const [label, lo, hi, def] = GM_RULES[k];
    rules.append(gmField(label, m.rules[k], lo, hi, k === 'cash' ? 50 : ['lives', 'win', 'maxTier'].includes(k) ? 1 : 0.05, v => { if (v == null) delete m.rules[k]; else m.rules[k] = v; refresh(); }, def == null ? 'normal' : def));
  }
  const flags = h('div', { class:'gm-flags' }, [['noAbilities', 'No abilities'], ['noSell', 'No selling'], ['noPowers', 'No powers or insta appliances']].map(([k, label]) => {
    const c = h('input', { type:'checkbox' }); c.checked = !!m.flags[k];
    c.addEventListener('change', () => { if (c.checked) m.flags[k] = true; else delete m.flags[k]; refresh(); });
    return h('label', { class:'toggle-inline' }, c, ' ' + label);
  }));
  /* per appliance and per pest */
  const types = BASE_TOWER_ORDER.filter(t => TOWERS[t] && !TOWERS[t].hero && !TOWERS[t].admin);
  const pests = ENEMY_ORDER.filter(p => ENEMIES[p]);
  const tBox = h('div', { class:'gm-rows' }), pBox = h('div', { class:'gm-rows' });
  const renderTowers = () => {
    tBox.innerHTML = '';
    for (const t of Object.keys(m.towers)){
      const o = m.towers[t];
      const row = h('div', { class:'gm-trow' }, h('div', { class:'gm-who' }, t === 'all' ? h('span', { class:'gal-glyph sm', text:'★' }) : iconCanvas(Art.towerIcon(t, 64)), h('b', { text: t === 'all' ? 'All appliances' : TOWERS[t].name }),
        h('button', { class:'icon-btn', 'aria-label':'Remove', title:'Remove', onclick: () => { delete m.towers[t]; renderTowers(); refresh(); }, text:'×' })));
      const g = h('div', { class:'gm-grid' });
      for (const k in GM_TOWER){ const [label, lo, hi, def] = GM_TOWER[k]; g.append(gmField(label, o[k], lo, hi, k === 'pierce' ? 1 : 0.05, v => { if (v == null) delete o[k]; else o[k] = v; refresh(); }, def)); }
      if (t !== 'all'){ const c = h('input', { type:'checkbox' }); c.checked = !!o.ban; c.addEventListener('change', () => { if (c.checked) o.ban = true; else delete o.ban; refresh(); }); g.append(h('label', { class:'toggle-inline' }, c, ' Banned from the shop')); }
      row.append(g);
      tBox.append(row);
    }
  };
  const renderPests = () => {
    pBox.innerHTML = '';
    for (const p of Object.keys(m.pests)){
      const o = m.pests[p];
      const row = h('div', { class:'gm-trow' }, h('div', { class:'gm-who' }, p === 'all' ? h('span', { class:'gal-glyph sm', text:'★' }) : iconCanvas(Art.pestIcon(p, 64)), h('b', { text: p === 'all' ? 'All pests' : ENEMIES[p].name }),
        h('button', { class:'icon-btn', 'aria-label':'Remove', title:'Remove', onclick: () => { delete m.pests[p]; renderPests(); refresh(); }, text:'×' })));
      const g = h('div', { class:'gm-grid' });
      for (const k in GM_PEST){ const [label, lo, hi, def] = GM_PEST[k]; g.append(gmField(label, o[k], lo, hi, 0.05, v => { if (v == null) delete o[k]; else o[k] = v; refresh(); }, def)); }
      row.append(g);
      pBox.append(row);
    }
  };
  const tPick = h('select', { 'aria-label':'Add an appliance' }, [h('option', { value:'' }, 'Add an appliance…'), h('option', { value:'all' }, 'All appliances')].concat(types.map(t => h('option', { value: t }, TOWERS[t].name))));
  tPick.addEventListener('change', () => { const v = tPick.value; tPick.value = ''; if (!v) return; if (!m.towers[v]) m.towers[v] = {}; renderTowers(); refresh(); });
  const pPick = h('select', { 'aria-label':'Add a pest' }, [h('option', { value:'' }, 'Add a pest…'), h('option', { value:'all' }, 'All pests')].concat(pests.map(p => h('option', { value: p }, ENEMIES[p].name))));
  pPick.addEventListener('change', () => { const v = pPick.value; pPick.value = ''; if (!v) return; if (!m.pests[v]) m.pests[v] = {}; renderPests(); refresh(); });
  /* buffs to buy during a game */
  const bBox = h('div', { class:'gm-rows' });
  const renderBuffs = () => {
    bBox.innerHTML = '';
    m.buffs.forEach((b, i) => {
      const nm = h('input', { type:'text', maxlength:'24', value: b.name || '', 'aria-label':'Buff name', class:'gm-bname' });
      nm.addEventListener('input', () => { b.name = nm.value; refresh(); });
      const g = h('div', { class:'gm-grid' });
      for (const k in GM_BUFF){ const [label, lo, hi, def] = GM_BUFF[k]; g.append(gmField(label, b[k], lo, hi, ['cost'].includes(k) ? 100 : ['dur', 'pierce', 'lives', 'max'].includes(k) ? 1 : 0.05, v => { if (v == null) delete b[k]; else b[k] = v; refresh(); }, def)); }
      for (const [k, label] of [['camo', 'See ghosts'], ['allTypes', 'Hit any pest type']]){ const c = h('input', { type:'checkbox' }); c.checked = !!b[k]; c.addEventListener('change', () => { if (c.checked) b[k] = true; else delete b[k]; refresh(); }); g.append(h('label', { class:'toggle-inline' }, c, ' ' + label)); }
      bBox.append(h('div', { class:'gm-trow gm-buff' }, h('div', { class:'gm-who' }, h('span', { class:'gal-glyph sm', text:'⚡' }), nm,
        h('button', { class:'icon-btn', 'aria-label':'Remove', title:'Remove', onclick: () => { m.buffs.splice(i, 1); renderBuffs(); refresh(); }, text:'×' })), g));
    });
  };
  const addBuff = h('button', { class:'btn btn-small', onclick: () => { if (m.buffs.length >= GM_BUFF_MAX){ toast('Up to ' + GM_BUFF_MAX + ' buffs.', 'warn'); return; } m.buffs.push({ name:'Buff ' + (m.buffs.length + 1), cost:1000, dur:30, dmg:1.5 }); renderBuffs(); refresh(); } }, '+ Add a buff');
  renderBuffs();
  renderTowers(); renderPests(); refresh();
  const save = (andOn) => {
    const c = cleanGameMod(m);
    const nid = saveGameMod(c, id || null);
    if (!nid){ toast('You have ' + GMOD_MAX + ' mods already.', 'warn'); return false; }
    id = nid;
    if (andOn) setGameModOn(nid, true);
    Sfx.play('upgrade'); toast('Saved ' + c.name + (andOn ? ' and switched it on.' : '.'), 'gold');
    return true;
  };
  modal({ title: id ? 'Edit mod' : 'Make a mod', lead:'Leave a box empty to keep the game’s normal value. Multipliers (×) of 1 change nothing.', wide:true, cls:'gamemods gm-editor',
    content:[h('div', { class:'gm-grid gm-meta' }, text('name', 'Name', 28, 'My Mod'), text('by', 'By', 24, 'Your name'), text('blurb', 'About it', 160, 'One line about what it does')),
      h('h3', { class:'gm-h', text:'Rules' }), rules, flags,
      h('h3', { class:'gm-h', text:'Appliances' }), tBox, tPick,
      h('h3', { class:'gm-h', text:'Pests' }), pBox, pPick,
      h('h3', { class:'gm-h', text:'Buffs to buy' }), h('p', { class:'dly-note', text:'Buffs appear in the shop during a game. Players buy them with their cash; timed ones run while rounds are on, and a length of 0 lasts the rest of the game. They boost every appliance.' }), bBox, addBuff,
      h('div', { class:'dly-label', text:'What it changes' }), summary],
    actions:[{ label:'Back', onClick: back }, { label:'Save', keep:true, onClick: () => { save(false); } }, { label:'Save and switch on', kind:'primary', onClick: () => { if (save(true)) back(); else showModEditor(id, back); } }], onClose: back });
}
/* the new-game picker's note about the mods that are on */
function gmNoteRow(){
  const on = gameModsOn();
  return h('div', { class:'gm-note' + (on.length ? ' on' : '') }, h('span', { text: on.length ? '⚙ Mods on: ' + on.map(id => gameModById(id).name).join(', ') + '. No medals, Dough, mastery or achievements.' : '⚙ No mods on.' }),
    h('button', { class:'btn btn-small', onclick: () => { const mid = UI.lastPickMap; showMods(() => mid ? pickDifficulty(mid) : closeModal()); } }, 'Mods'));
}
/* ---------------- buffs in the shop ---------------- */
function gmBuffCards(shop){
  const B = typeof gmBuffs === 'function' ? gmBuffs() : [];
  if (!B.length) return;
  shop.append(h('div', { class:'fhead', style:'--fc:#9b4fd1' }, h('i', { 'aria-hidden':'true' }), '⚡ Buffs'));
  B.forEach((b, i) => shop.append(h('button', { class:'card buffcard' + (b.name === 'God Boost' ? ' god' : ''), 'data-buff': String(i), title: b.name + ': ' + buffSummary(b), onclick: () => {
    const r = buyGameBuff(i);
    if (!r.ok){ Sfx.play('error'); toast(r.why + '.', 'warn'); return; }
    toast(b.name + '! ' + buffSummary(b, true) + '.', 'gold');
    if (G.vis) for (const t of G.towers) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: t.size, r1: t.size + 30, t: 0, life: 0.5, c: '#c77dff', w: 3 });
    buildAbilities(); updatePanel(true); gmBuffCardsUpdate(true);
  }, onmouseenter: () => gmBuffInfo(b), onfocus: () => gmBuffInfo(b), onmouseleave: () => showInfo(UI.placing) },
    h('span', { class:'hk', text:'⚡' }), h('span', { class:'buff-ic', text: b.name === 'God Boost' ? '👑' : '⚡' }), h('span', { class:'nm', text: b.name }), h('span', { class:'pr num', text: money(b.cost) }), h('span', { class:'st' }))));
}
function gmBuffInfo(b){
  const box = $('#shop-info'); if (!box) return;
  box.innerHTML = '';
  box.append(h('b', { text: b.name + ' · ' + money(b.cost) }), buffSummary(b) + '. Buffs boost every appliance you have, and the ones you build later.');
}
function gmBuffCardsUpdate(){
  const cards = $$('#shop .buffcard');
  if (!cards.length) return;
  const B = gmBuffs();
  for (const c of cards){
    const i = +c.dataset.buff, b = B[i]; if (!b) continue;
    const a = gmBuffActive(i), n = (G.gmBought && G.gmBought[i]) || 0;
    const out = (b.max && n >= b.max) || (a && !(a.left < Infinity));
    c.classList.toggle('poor', !out && !canAfford(b.cost));
    c.classList.toggle('on', !!a);
    c.classList.toggle('done', !!out);
    const st = c.querySelector('.st');
    const txt = a ? (a.left < Infinity ? Math.ceil(a.left) + 's' : 'ON') : out ? 'SOLD' : '';
    if (st.textContent !== txt) st.textContent = txt;
  }
}
