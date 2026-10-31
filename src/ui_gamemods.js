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
  const addBuff = h('button', { class:'btn btn-small', onclick: () => { if (m.buffs.length >= GM_BUFF_MAX){ toast('Up to ' + GM_BUFF_MAX + ' buffs.', 'warn'); return; } m.buffs.push({ name:'Buff ' + (m.buffs.length + 1), cost:1000, dmg:1.5 }); renderBuffs(); refresh(); } }, '+ Add a buff');
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
      h('h3', { class:'gm-h', text:'Buffs to buy' }), h('p', { class:'dly-note', text:'Buffs appear in the shop during a game. Players buy them with their cash and drag each onto one appliance, which keeps it until it is sold. Extra lives come at once.' }), bBox, addBuff,
      h('div', { class:'dly-label', text:'What it changes' }), summary],
    actions:[{ label:'Back', onClick: back }, { label:'Save', keep:true, onClick: () => { save(false); } }, { label:'Save and switch on', kind:'primary', onClick: () => { if (save(true)) back(); else showModEditor(id, back); } }], onClose: back });
}
/* the new-game picker's note about the mods that are on */
function gmNoteRow(){
  const on = gameModsOn();
  return h('div', { class:'gm-note' + (on.length ? ' on' : '') }, h('span', { text: on.length ? '⚙ Mods on: ' + on.map(id => gameModById(id).name).join(', ') + '. No medals, Dough, mastery or achievements.' : '⚙ No mods on.' }),
    h('button', { class:'btn btn-small', onclick: () => { const mid = UI.lastPickMap; showMods(() => mid ? pickDifficulty(mid) : closeModal()); } }, 'Mods'));
}
/* ---------------- buffs in the shop ----------------
   Drag a buff card onto an appliance (or click the card, then the appliance). Buffs with nothing to put on an
   appliance (extra lives) are bought with a click. */
function gmBuffCards(shop){
  const B = typeof gmBuffs === 'function' ? gmBuffs() : [];
  if (!B.length) return;
  shop.append(h('div', { class:'fhead', style:'--fc:#9b4fd1' }, h('i', { 'aria-hidden':'true' }), '⚡ Buffs · drag onto an appliance'));
  B.forEach((b, i) => {
    const card = h('button', { class:'card buffcard' + (b.name === 'God Boost' ? ' god' : ''), 'data-buff': String(i), title: b.name + ': ' + buffSummary(b) + (gmBuffOnly(b) ? '' : '. Drag it onto an appliance.'),
      onmouseenter: () => gmBuffInfo(b), onfocus: () => gmBuffInfo(b), onmouseleave: () => { if (UI.buffPick == null) showInfo(UI.placing); } },
      h('span', { class:'hk', text:'⚡' }), h('span', { class:'buff-ic', text: b.name === 'God Boost' ? '👑' : '⚡' }), h('span', { class:'nm', text: b.name }), h('span', { class:'pr num', text: money(b.cost) }), h('span', { class:'st' }));
    card.addEventListener('pointerdown', ev => gmBuffDragStart(ev, i, card));
    card.addEventListener('click', ev => { ev.preventDefault(); });
    card.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); gmBuffPick(i); } });
    shop.append(card);
  });
}
function gmBuffInfo(b){
  const box = $('#shop-info'); if (!box) return;
  box.innerHTML = '';
  box.append(h('b', { text: b.name + ' · ' + money(b.cost) }), buffSummary(b) + '.' + (gmBuffOnly(b) ? ' Click to buy.' : ' Drag it onto an appliance (or click it, then the appliance). It keeps the buff until you sell it.'));
}
/* put a buff on an appliance, or buy a buff that needs none */
function gmBuffApply(i, t){
  const b = gmBuffs()[i];
  const r = buyGameBuff(i, t);
  if (!r.ok){ Sfx.play('error'); toast(r.why + '.', 'warn'); return false; }
  if (t && !gmBuffOnly(b)){
    toast(TOWERS[t.type].name + ' has ' + b.name + ': ' + buffSummary(b, true).replace(' on one appliance, until it is sold', '') + ', until you sell it.', 'gold');
    if (G.vis) G.fx.push({ k:'ring', x: t.x, y: t.y, r0: t.size, r1: t.size + 46, t: 0, life: 0.6, c: '#c77dff', w: 5 });
    select(t);
  } else toast(b.name + '! ' + buffSummary(b, true) + '.', 'gold');
  buildAbilities(); updatePanel(true); gmBuffCardsUpdate();
  return true;
}
function gmBuffPick(i){
  const b = gmBuffs()[i];
  if (!b) return;
  if (gmBuffOnly(b)){ gmBuffApply(i, null); return; }
  if (UI.buffPick === i){ gmBuffCancel(); return; }
  const why = gmBuffWhy(i, null);
  if (why && !/Drop it on/.test(why)){ Sfx.play('error'); toast(why + '.', 'warn'); return; }
  if (UI.placing) cancelPlacing();
  UI.buffPick = i; UI.sel = null; updatePanel();
  gmBuffCardsUpdate();
  Sfx.play('click');
  toast(VERB + ' an appliance to give it ' + b.name + '. Right-click or Esc cancels.', 'info');
}
function gmBuffCancel(){ UI.buffPick = null; UI.buffDrag = null; const g = $('#buff-ghost'); if (g) g.remove(); gmBuffCardsUpdate(); }
function gmBuffDragStart(ev, i, card){
  if (ev.button !== 0 && ev.pointerType === 'mouse') return;
  const b = gmBuffs()[i];
  UI.buffDrag = { i, x0: ev.clientX, y0: ev.clientY, moved: false };
  const move = e => {
    const D = UI.buffDrag; if (!D) return;
    if (!D.moved && Math.hypot(e.clientX - D.x0, e.clientY - D.y0) > 8 && !gmBuffOnly(b)){
      D.moved = true; UI.buffPick = i;
      document.body.append(h('div', { class:'buff-ghost', id:'buff-ghost' }, h('span', { text: b.name === 'God Boost' ? '👑' : '⚡' }), h('b', { text: b.name })));
    }
    if (D.moved){
      const g = $('#buff-ghost'); if (g){ g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px'; }
      const r = $('#cv').getBoundingClientRect();
      UI.pointer = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom ? toLogical(e) : null;
    }
  };
  const up = e => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    const D = UI.buffDrag; UI.buffDrag = null;
    const g = $('#buff-ghost'); if (g) g.remove();
    if (!D) return;
    if (!D.moved){ gmBuffPick(i); return; }
    UI.buffPick = null;
    const r = $('#cv').getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom){
      const p = toLogical(e), t = towerAt(p.x, p.y);
      if (t) gmBuffApply(i, t); else { Sfx.play('error'); toast('Drop it right on an appliance.', 'warn'); }
    }
    gmBuffCardsUpdate();
  };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}
/* a click on the kitchen while a buff is picked */
function gmBuffClick(p, ev){
  if (UI.buffPick == null) return false;
  if (ev && ev.button === 2){ gmBuffCancel(); return true; }
  const i = UI.buffPick, t = towerAt(p.x, p.y);
  if (!t){ Sfx.play('error'); toast(VERB + ' one of your appliances (right-click cancels).', 'warn'); return true; }
  UI.buffPick = null;
  gmBuffApply(i, t);
  return true;
}
/* on the kitchen: a ring under the appliance a buff would go on, and a glow under buffed ones */
function gmDrawBuffs(ctx, time){
  if (!G.mods) return;
  ctx.save();
  for (const t of G.towers){
    if (!t.gb || !t.gb.length) continue;
    const god = t.gb.some(i => (gmBuffs()[i] || {}).name === 'God Boost');
    const pul = 0.5 + 0.5 * Math.sin(time * 3 + t.id);
    ctx.beginPath(); ctx.arc(t.x, t.y, t.size + 5 + pul * 2, 0, TAU);
    ctx.strokeStyle = god ? 'rgba(242,193,78,' + (0.6 + pul * 0.35).toFixed(3) + ')' : 'rgba(199,125,255,' + (0.45 + pul * 0.3).toFixed(3) + ')';
    ctx.lineWidth = god ? 4 : 2.5; ctx.stroke();
  }
  if (UI.buffPick != null && UI.pointer){
    const t = towerAt(UI.pointer.x, UI.pointer.y);
    if (t){
      const ok = !gmBuffWhy(UI.buffPick, t);
      ctx.beginPath(); ctx.arc(t.x, t.y, t.size + 12, 0, TAU);
      ctx.setLineDash([6, 5]); ctx.lineDashOffset = -time * 20;
      ctx.strokeStyle = ok ? 'rgba(199,125,255,0.95)' : 'rgba(226,56,63,0.9)'; ctx.lineWidth = 3; ctx.stroke();
    }
  }
  ctx.restore();
}
function gmBuffCardsUpdate(){
  const cards = $$('#shop .buffcard');
  if (!cards.length) return;
  const B = gmBuffs();
  for (const c of cards){
    const i = +c.dataset.buff, b = B[i]; if (!b) continue;
    const n = (G.gmBought && G.gmBought[i]) || 0, held = gmBuffHolders(i).length;
    const out = !!(b.max && n >= b.max);
    c.classList.toggle('poor', !out && !canAfford(b.cost));
    c.classList.toggle('on', held > 0);
    c.classList.toggle('sel', UI.buffPick === i);
    c.classList.toggle('done', out);
    const st = c.querySelector('.st');
    const txt = held ? '×' + held : out ? 'SOLD' : '';
    if (st.textContent !== txt) st.textContent = txt;
  }
}
/* the buffs an appliance holds, for its panel */
function gmBuffPanel(t){
  if (!G.mods || !t.gb || !t.gb.length) return null;
  const B = gmBuffs();
  return h('div', { class:'gm-held' }, h('b', { text:'⚡ Buffs' }), t.gb.map(i => B[i] ? h('span', { class:'gm-chip' + (B[i].name === 'God Boost' ? ' god' : ''), title: buffSummary(B[i], true), text: B[i].name }) : null), h('small', { text:'Kept until you sell it. Selling loses them.' }));
}
/* ---------------- the pause menu's Mods tab ---------------- */
function showPauseMods(){
  const M = G.mods, B = gmBuffs();
  const content = [];
  if (!M) content.push(h('p', { class:'gm-status', text:'This game has no mods. Mods you switch on apply to your next new game.' }));
  else {
    content.push(h('p', { class:'gm-status on', text:'This game’s mods: ' + M.names.join(', ') + '. No medals, Dough, mastery or achievements.' }));
    const pseudo = { rules: M.rules, flags: M.flags, towers: M.towers, pests: M.pests, buffs: [] };
    const sum = gameModSummary(pseudo);
    content.push(h('p', { class:'gm-summary', text: /^Changes nothing/.test(sum) ? 'The rules are as normal; this game’s mods only add buffs.' : sum }));
    if (B.length){
      content.push(h('div', { class:'dly-label', text:'Buffs' }));
      content.push(h('div', { class:'gm-list' }, B.map((b, i) => {
        const holders = gmBuffHolders(i), n = (G.gmBought && G.gmBought[i]) || 0;
        return h('div', { class:'gm-row gm-brow' + (holders.length ? ' on' : '') },
          h('span', { class:'gal-glyph sm', text: b.name === 'God Boost' ? '👑' : '⚡' }),
          h('div', { class:'gm-txt' }, h('b', { text: b.name + ' · ' + money(b.cost) }), h('span', { text: buffSummary(b) }),
            h('small', { text: holders.length ? 'On: ' + holders.map(t => TOWERS[t.type].name + ' ' + (t.paragon ? 'Paragon' : t.up.join('-'))).join(', ') : n ? 'Bought ' + n + '×' : 'Not bought yet' })),
          h('div', { class:'gal-acts' }, h('button', { class:'btn btn-small', onclick: () => { closeModal(); G.paused = false; gmBuffPick(i); } }, gmBuffOnly(b) ? 'Buy' : 'Use')));
      })));
    }
  }
  modal({ title:'Mods', lead: M ? 'The mods this game was started with stay with it. To change mods, open the Mod Maker: your changes apply to your next new game.' : '', wide:true, cls:'gamemods',
    content, actions:[{ label:'Back', onClick: pauseGame }, { label:'Open the Mod Maker', kind:'primary', onClick: () => showMods(pauseGame) }], onClose: pauseGame });
}
