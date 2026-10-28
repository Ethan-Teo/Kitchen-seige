'use strict';
/* =====================================================================
   Kitchen Siege — progression screens: the chef bar on the menu, Daily
   specials (chest and challenge), the Pantry Shop, crate reveals, the
   achievements tab, the in-game Powers tray and the reward summaries.
   ===================================================================== */
const DOUGH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" class="dico"><circle cx="12" cy="12" r="10.6" fill="#f2c14e" stroke="#a57412" stroke-width="1.6"/><circle cx="12" cy="12" r="7.7" fill="#ffd36b" stroke="#c99a1c" stroke-width="1"/><path d="M7.3 14.3c0-2.9 2.1-5 4.7-5s4.7 2.1 4.7 5c0 .5-.4.8-.9.8H8.2c-.5 0-.9-.3-.9-.8z" fill="#d48e45" stroke="#7a4a20" stroke-width=".9"/><path d="M9.5 11.8l.9 1.1M12 11v1.4M14.5 11.8l-.9 1.1" stroke="#fff2d6" stroke-width=".9" stroke-linecap="round"/></svg>';
const HAT_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true" class="hico"><path d="M8.5 19.2C5 18.8 2.8 16.1 3.3 12.8c.5-3.1 3.5-5.1 6.6-4.5C11 5.5 13.4 3.9 16 3.9s5 1.6 6.1 4.4c3.1-.6 6.1 1.4 6.6 4.5.5 3.3-1.7 6-5.2 6.4v6.2c0 .8-.6 1.4-1.4 1.4H9.9c-.8 0-1.4-.6-1.4-1.4z" fill="#fff" stroke="#1d2b33" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.5 21.6h15" stroke="#1d2b33" stroke-width="1.5"/></svg>';
const BOLT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.6 2.5L5 13.6h5.6L9.4 21.5 19 9.9h-5.7z" fill="currentColor" stroke="#1d2b33" stroke-width="1.4" stroke-linejoin="round"/></svg>';
function svgEl(markup){ const t = document.createElement('template'); t.innerHTML = markup.trim(); return t.content.firstChild; }
function doughEl(n, cls){ return h('span', { class:'dough' + (cls ? ' ' + cls : '') }, svgEl(DOUGH_SVG), h('b', { class:'num', text: fmt(n) })); }
/* a toast that also works away from the kitchen (menu, shop, mastery) */
function notify(msg, kind){
  if (UI.screen === 'game'){ toast(msg, kind); return; }
  let box = $('#menu-toasts');
  if (!box){ box = h('div', { class:'toasts menu-toasts', id:'menu-toasts', 'aria-live':'polite' }); document.body.append(box); }
  const t = h('div', { class:'toast' + (kind ? ' t-' + kind : ''), text: msg });
  box.append(t);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, kind === 'gold' ? 4200 : 3200);
}
const _chCache = {};
function todaysChallenge(){ const k = dayKey(); return _chCache[k] || (_chCache[k] = dailyChallenge(k)); }
function untilMidnight(){
  const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const m = Math.max(1, Math.round((next - now) / 60000));
  return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm';
}

/* ---------------------------------------------------------------------
   Menu: chef level, Dough, and dots on Daily and Shop when something waits
   --------------------------------------------------------------------- */
function chefBar(){
  const L = chefLevel(Profile.chef.xp);
  return h('div', { class:'chefbar' },
    h('button', { class:'chef-badge', title:'Chef level ' + L.level + '. See your achievements.', 'aria-label':'Chef level ' + L.level + ', achievements', onclick: () => { Sfx.unlock(); UI.mtab = 'ach'; show('mastery'); } }, svgEl(HAT_SVG), h('b', { text: String(L.level) })),
    h('div', { class:'chef-xp' },
      h('div', { class:'chef-xp-t' }, h('span', { text:'Chef level ' + L.level }), h('span', { class:'num', text: fmt(L.into) + ' / ' + fmt(L.need) + ' XP' })),
      h('div', { class:'chef-xp-bar' }, h('i', { style:{ width: (L.pct * 100).toFixed(1) + '%' } }))),
    h('button', { class:'dough-pill', title:'Dough. Spend it in the Pantry Shop.', 'aria-label': fmt(Profile.dough) + ' Dough, open the Pantry Shop', onclick: () => { Sfx.unlock(); show('shop'); } }, svgEl(DOUGH_SVG), h('b', { class:'num', text: fmt(Profile.dough) })));
}
function refreshChefBar(){
  const slot = $('#chefbar-slot');
  if (slot) slot.replaceChildren(chefBar());
  refreshMenuDots();
}
function refreshMenuDots(){
  const d = $('#daily-dot');
  if (d){ const ready = dailyStatus().ready, todo = !Profile.daily.ch[todaysChallenge().date]; d.hidden = !(ready || todo); d.classList.toggle('soft', !ready); }
  const s = $('#shop-dot');
  if (s){ const n = Object.values(Profile.crates).reduce((a, b) => a + b, 0); s.hidden = !n; s.textContent = n ? String(n) : ''; }
  const c = $('#chefs-dot');
  if (c) c.hidden = !chefsDot();
  const e = $('#events-dot');
  if (e){ e.hidden = !eventsDot(); e.classList.add('soft'); }
}

/* ---------------------------------------------------------------------
   Daily specials: the chest track and today's challenge
   --------------------------------------------------------------------- */
function rewardMini(C){
  const box = h('div', { class:'dly-gift' }, doughEl(C.dough, 'sm'));
  for (const [k, what] of C.items){
    if (k === 'power') box.append(iconCanvas(Art.powerIcon(what, 64), 'dly-ic'));
    else if (k === 'crate') box.append(iconCanvas(Art.crateIcon(what, 64), 'dly-ic'));
    else if (k === 'insta') box.append(h('span', { class:'dly-insta', style:'--rc:' + RARITY[what].color, title: RARITY[what].name + ' insta appliance', text:'?' }));
  }
  return box;
}
function showDaily(){
  Sfx.unlock();
  const st = dailyStatus(), ch = todaysChallenge(), done = !!Profile.daily.ch[ch.date];
  const track = h('div', { class:'dly-track' });
  for (let d = 1; d <= 7; d++){
    const isDone = st.ready ? d < st.day : d <= st.day, isToday = d === st.day;
    track.append(h('div', { class:'dly-day' + (isDone ? ' done' : '') + (isToday ? ' today' : '') + (d === 7 ? ' big' : '') },
      h('span', { class:'dd', text: isToday ? 'Today' : 'Day ' + d }), rewardMini(DAILY_CHEST[d - 1]), isDone ? h('span', { class:'ok', 'aria-label':'opened', text:'✓' }) : null));
  }
  const streakTxt = st.ready
    ? (st.lost ? 'Your streak ended, so the track starts again. Open a chest every day to climb it.' : st.streak > 1 ? 'Day ' + st.streak + ' in a row. Open today’s chest to keep the streak going.' : 'Open a chest every day: each day in a row gets a bigger one.')
    : 'Opened today. Day ' + st.streak + ' in a row. The next chest is ready in ' + untilMidnight() + '.';
  const chestBtn = h('button', { class:'btn btn-gold', disabled: !st.ready, onclick: () => {
    const res = claimDaily();
    if (!res){ Sfx.play('error'); return; }
    refreshChefBar();
    showReveal({ title:'Daily chest · day ' + res.day, art: res.day === 7 ? 'gold' : 'chef', got: res.got, lead: res.streak > 1 ? 'Day ' + res.streak + ' in a row!' : 'Come back tomorrow for a bigger chest.', back: showDaily });
  } }, st.ready ? 'Open today’s chest' : 'Opened today');
  thumbOf(ch.map);
  const towers = h('div', { class:'dly-towers' });
  for (const t of ch.towers) towers.append(h('span', { class:'dly-tw', title: TOWERS[t].name }, iconCanvas(Art.towerIcon(t, 64)), h('small', { text: TOWERS[t].name })));
  const existing = readStoredGame();
  const card = h('div', { class:'dly-ch' + (done ? ' done' : '') },
    h('div', { class:'dly-ch-top' }, iconCanvas(thumbs[ch.map], 'dly-thumb'),
      h('div', { class:'dly-ch-id' }, h('h3', { text: ch.name }),
        h('div', { class:'dly-meta' }, h('span', { class:'level ' + MAPS[ch.map].level, text: MAPS[ch.map].name }), h('span', { text: DIFFS[ch.diff].name + ' · rounds ' + ch.start + ' to ' + ch.end })),
        h('div', { class:'dly-meta' }, h('span', { text:'Start with ' + money(ch.cash) + ' and ' + ch.lives + ' lives' })))),
    h('ul', { class:'dly-rules' }, ch.rules.map(r => h('li', {}, h('b', { text: CH_RULES[r].name }), h('span', { text: CH_RULES[r].desc }))),
      h('li', {}, h('b', { text:'Pantry closed' }), h('span', { text:'No powers or insta appliances.' }))),
    h('div', { class:'dly-label', text:'Only these appliances' }), towers,
    h('div', { class:'dly-reward' }, h('span', { text: done ? 'Completed today ✓ · reward claimed' : 'First win today pays' }), done ? null : doughEl(ch.reward.dough), done ? null : h('span', { text:'+ a ' + CRATES[ch.reward.crate].name })));
  modal({ title:'Daily specials', cls:'daily',
    content:[
      h('section', { class:'dly-sec' }, h('div', { class:'dly-h' }, h('h3', { text:'Daily chest' }), h('span', { class:'dly-streak', text: st.streak > 1 || !st.ready ? 'Streak ' + st.streak : '' })), track, h('p', { class:'dly-note', text: streakTxt }), chestBtn),
      h('section', { class:'dly-sec' }, h('div', { class:'dly-h' }, h('h3', { text:'Today’s challenge' }), h('span', { class:'dly-streak', text:'New one in ' + untilMidnight() })), card,
        h('p', { class:'note', text: slotStartNote() })),
    ],
    actions:[{ label:'Close' }, { label: done ? 'Play again' : 'Play challenge', kind:'primary', onClick: () => startChallenge(ch) }] });
}
function challengeRulesText(ch){ return ch.rules.map(r => CH_RULES[r].name + ': ' + CH_RULES[r].desc).join(' '); }
function startChallenge(ch){
  UI.diffPick = ch.diff;
  startNewGame(ch.map, ch.diff, false, ch);
}

/* ---------------------------------------------------------------------
   Pantry Shop: crates, powers and the insta appliance collection
   --------------------------------------------------------------------- */
function oddsText(odds){ const tot = Object.values(odds).reduce((a, b) => a + b, 0); return RARITY_ORDER.filter(r => odds[r]).map(r => RARITY[r].name + ' ' + Math.round(odds[r] / tot * 100) + '%').join(' · '); }
function psSection(title, blurb, body){ return h('section', { class:'ps-sec' }, h('div', { class:'ps-h' }, h('h3', { text: title }), h('p', { text: blurb })), body); }
/* how many the shop's Buy buttons buy at a time: a fixed number, or as many as the Dough covers */
const BUY_QTY = [1, 5, 10, 25, 'max'];
function buyCount(cost){ const q = UI.buyQty || 1; return q === 'max' ? Math.max(1, Math.floor(Profile.dough / cost)) : q; }
function buyBtn(cost, what, fn){
  const n = buyCount(cost), total = cost * n;
  return h('button', { class:'btn btn-small btn-gold', disabled: Profile.dough < total, 'aria-label':'Buy ' + (n > 1 ? n + ' × ' : '') + what + ' for ' + fmt(total) + ' Dough', onclick: () => fn(n) },
    n > 1 ? 'Buy ' + fmt(n) + ' ' : 'Buy ', doughEl(total, 'sm'));
}
function crateName(id, n){ return n === 1 ? 'a ' + CRATES[id].name : fmt(n) + ' ' + CRATES[id].name + 's'; }
function buildPantry(){
  const body = $('#shop-body');
  if (!body) return;
  body.innerHTML = '';
  $('#shop-dough').replaceChildren(doughEl(Profile.dough));
  const q = UI.buyQty || 1;
  body.append(h('div', { class:'ps-qty' }, h('span', { text:'Buy at a time' }),
    h('div', { class:'seg seg5', role:'group', 'aria-label':'How many each Buy button buys' },
      BUY_QTY.map(v => h('button', { 'aria-pressed': String(q === v), title: v === 'max' ? 'As many as your Dough covers' : '', onclick: () => { UI.buyQty = v; Sfx.play('click'); buildPantry(); } }, v === 'max' ? 'Max' : '×' + v)))));
  const crates = h('div', { class:'ps-crates' });
  for (const id of CRATE_ORDER){
    const C = CRATES[id], have = Profile.crates[id] || 0, many = Math.min(have, OPEN_MAX);
    crates.append(h('div', { class:'ps-crate ' + id },
      h('div', { class:'ps-crate-art' }, iconCanvas(Art.crateIcon(id, 128)), have ? h('span', { class:'ps-badge', text: '×' + fmt(have) }) : null),
      h('div', { class:'ps-crate-b' }, h('h4', { text: C.name }), h('p', { text: C.desc }), h('p', { class:'ps-odds', text: oddsText(C.odds) }),
        h('div', { class:'ps-acts' },
          have ? h('button', { class:'btn btn-small btn-primary', onclick: () => openCrateFlow(id) }, 'Open') : null,
          have > 1 ? h('button', { class:'btn btn-small btn-primary', title: have > OPEN_MAX ? 'Opens ' + fmt(OPEN_MAX) + ' at a time' : '', onclick: () => openCratesFlow(id, many) }, (have > OPEN_MAX ? 'Open ' + fmt(OPEN_MAX) : 'Open all') + ' (' + fmt(have) + ')') : null,
          buyBtn(C.cost, C.name, n => { if (buyCrate(id, n)){ Sfx.play('cash'); notify('Bought ' + crateName(id, n) + '.', 'gold'); buildPantry(); refreshMenuDots(); } else Sfx.play('error'); })))));
  }
  body.append(psSection('Crates', 'Each holds an insta appliance, powers and Dough. You also earn crates every fifth chef level, from the daily chest and from daily challenges.', crates));
  const pw = h('div', { class:'ps-powers' });
  for (const id of POWER_ORDER){
    const P = POWERS[id], have = Profile.powers[id] || 0;
    pw.append(h('div', { class:'ps-power' },
      h('div', { class:'ps-pi' }, iconCanvas(Art.powerIcon(id, 64)), have ? h('span', { class:'ps-badge', text: '×' + fmt(have) }) : null),
      h('div', { class:'ps-pb' }, h('h4', { text: P.name }), h('p', { text: P.desc })),
      buyBtn(P.cost, P.name, n => { if (buyPower(id, n)){ Sfx.play('cash'); if (n > 1) notify('Bought ' + fmt(n) + ' × ' + P.name + '.', 'gold'); buildPantry(); } else Sfx.play('error'); })));
  }
  body.append(psSection('Powers', 'Use them during a game from the Powers button at the bottom right of the kitchen. They stay in the pantry during daily challenges and on Michelin.', pw));
  const list = instaList(), coll = h('div', { class:'ps-insta' });
  for (const key of list){
    const it = parseInsta(key), R = RARITY[instaRarity(it.up)], n = Profile.insta[key];
    coll.append(h('div', { class:'ps-it ' + instaRarity(it.up), style:'--rc:' + R.color, title: TOWERS[it.type].name + ' ' + it.up.join('-') + ' (' + R.name + ')' },
      iconCanvas(Art.towerIcon(it.type, 64, it.up)), h('b', { text: TOWERS[it.type].name }), h('span', { class:'num', text: it.up.join('-') }), h('em', { text: R.name }), n > 1 ? h('i', { class:'ps-badge', text:'×' + n }) : null));
  }
  if (!list.length) coll.append(h('p', { class:'ps-empty', text:'Nothing here yet. Open crates to collect ready-made, upgraded appliances.' }));
  body.append(psSection('Insta appliances', 'Ready-made appliances with their upgrades. Place one for free from the Powers button in a game; it sells like a bought one.', coll));
}

/* ---------------------------------------------------------------------
   Opening crates and chests
   --------------------------------------------------------------------- */
function openCrateFlow(id){
  const res = openCrate(id);
  if (!res){ Sfx.play('error'); return; }
  refreshMenuDots();
  showReveal({ title: CRATES[id].name, art: id, got: res.got, again: Profile.crates[id] > 0 ? () => openCrateFlow(id) : null, againLabel: 'Open another (' + fmt(Profile.crates[id] || 0) + ')' });
}
/* several crates at once: one reveal with everything they held, best first */
function openCratesFlow(id, n){
  const res = openCrates(id, n);
  if (!res){ Sfx.play('error'); return; }
  refreshMenuDots();
  const left = Profile.crates[id] || 0, C = CRATES[id];
  const count = {};
  for (const g of res.got) if (g.k === 'insta') count[g.rarity] = (count[g.rarity] || 0) + g.n;
  const lead = 'Insta appliances: ' + RARITY_ORDER.slice().reverse().filter(r => count[r]).map(r => fmt(count[r]) + ' ' + RARITY[r].name.toLowerCase()).join(', ') + '.';
  showReveal({ title: fmt(res.n) + ' ' + C.name + 's', art: id, count: res.n, got: res.got, lead,
    again: left > 0 ? () => openCratesFlow(id, Math.min(left, OPEN_MAX)) : null,
    againLabel: (left > 1 ? (left > OPEN_MAX ? 'Open ' + fmt(OPEN_MAX) : 'Open all') : 'Open the last one') + ' (' + fmt(left) + ')' });
}
function rewardCard(g){
  if (g.k === 'dough') return h('div', { class:'rw-card dough-card' }, svgEl(DOUGH_SVG), h('b', { class:'num', text: '+' + fmt(g.n) }), h('span', { text:'Dough' }));
  if (g.k === 'power') return h('div', { class:'rw-card' }, iconCanvas(Art.powerIcon(g.id, 64)), h('b', { text: POWERS[g.id].name }), h('span', { text: '×' + g.n + ' power' }));
  if (g.k === 'crate') return h('div', { class:'rw-card' }, iconCanvas(Art.crateIcon(g.id, 64)), h('b', { text: CRATES[g.id].name }), h('span', { text: '×' + g.n }));
  const R = RARITY[g.rarity] || RARITY.common;
  return h('div', { class:'rw-card insta ' + g.rarity, style:'--rc:' + R.color }, iconCanvas(Art.towerIcon(g.type, 64, g.up)), h('b', { text: TOWERS[g.type].name + ' ' + g.up.join('-') }), h('span', { class:'rw-rar', text: R.name + ' insta appliance' }),
    g.n > 1 ? h('i', { class:'ps-badge', text: '×' + g.n }) : null);
}
/* the most reward cards a reveal draws; the rest are summed up on one last card */
const REVEAL_CARDS = 36;
function showReveal(o){
  const many = o.count > 1;
  const stage = h('div', { class:'crate-stage' }, iconCanvas(Art.crateIcon(o.art, 160), 'crate-art shake'), many ? h('span', { class:'crate-count', text: '×' + fmt(o.count) }) : null);
  const items = h('div', { class:'crate-items' });
  const acts = [];
  if (o.again) acts.push({ label: o.againLabel || 'Open another', kind:'primary', onClick: o.again });
  acts.push({ label: o.back ? 'Back' : 'Collect', kind: o.again ? '' : 'primary', onClick: () => { if (o.back) o.back(); else if (UI.screen === 'shop') buildPantry(); refreshChefBar(); } });
  modal({ title: o.title, lead: o.lead || '', cls:'reveal', content:[stage, items], actions: acts, dismissable:false, noFocus:true });
  Sfx.play('whoosh');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    stage.replaceChildren(iconCanvas(Art.crateIcon(o.art, 160, true), 'crate-art pop'), many ? h('span', { class:'crate-count', text: '×' + fmt(o.count) }) : null);
    const best = o.got.filter(g => g.k === 'insta').map(g => RARITY_ORDER.indexOf(g.rarity)).reduce((a, b) => Math.max(a, b), -1);
    Sfx.play(best >= 2 ? 'victory' : 'rank');
    if (best >= 2) stage.classList.add('glow-' + RARITY_ORDER[best]);
    const shown = o.got.length > REVEAL_CARDS ? o.got.slice(0, REVEAL_CARDS - 1) : o.got, rest = o.got.slice(shown.length);
    const gap = many ? Math.min(0.16, 2.4 / Math.max(1, shown.length)) : 0.16;
    shown.forEach((g, i) => { const c = rewardCard(g); c.style.animationDelay = (reduce ? 0 : 0.12 + i * gap) + 's'; items.append(c); });
    if (rest.length){
      const n = rest.reduce((a, g) => a + (g.k === 'dough' ? 0 : g.n), 0);
      const c = h('div', { class:'rw-card rw-more' }, h('b', { class:'num', text: '+' + fmt(n) }), h('span', { text:'more, all in your collection' }));
      c.style.animationDelay = (reduce ? 0 : 0.12 + shown.length * gap) + 's'; items.append(c);
    }
    if (UI.screen === 'shop') buildPantry();
  }, reduce ? 50 : 850);
}

/* ---------------------------------------------------------------------
   Achievements (a tab in Mastery)
   --------------------------------------------------------------------- */
function buildAchievementsTab(body){
  const L = chefLevel(Profile.chef.xp), done = ACHIEVEMENTS.filter(A => Profile.ach[A.id]).length;
  let nextCrate = null; for (let k = L.level + 1; !nextCrate && k < L.level + 30; k++){ const R = levelReward(k); if (R.crate) nextCrate = 'Next crate at level ' + k + ': a ' + CRATES[R.crate].name + '.'; }
  body.append(h('div', { class:'ach-head' },
    h('div', { class:'ach-lvl' }, svgEl(HAT_SVG), h('b', { text: String(L.level) })),
    h('div', { class:'ach-sum' }, h('h3', { text:'Chef level ' + L.level }),
      h('div', { class:'chef-xp-bar' }, h('i', { style:{ width: (L.pct * 100).toFixed(1) + '%' } })),
      h('p', { text: fmt(L.into) + ' / ' + fmt(L.need) + ' XP to level ' + (L.level + 1) + ', which pays ' + levelReward(L.level + 1).dough + ' Dough. ' + (nextCrate || '') + ' Every round you clear earns XP.' })),
    h('div', { class:'ach-count' }, h('b', { class:'num', text: done + ' / ' + ACHIEVEMENTS.length }), h('span', { text:'achievements' }), doughEl(Profile.dough, 'sm'))));
  const rows = ACHIEVEMENTS.map(A => ({ A, p: achProgress(A) }));
  rows.sort((a, b) => (a.p.done - b.p.done) || (b.p.cur / b.p.goal - a.p.cur / a.p.goal));
  const grid = h('div', { class:'ach-grid' });
  for (const { A, p } of rows){
    grid.append(h('div', { class:'ach' + (p.done ? ' done' : '') },
      h('div', { class:'ach-ic', 'aria-hidden':'true', text: p.done ? '✓' : Math.floor(p.cur / p.goal * 100) + '%' }),
      h('div', { class:'ach-b' }, h('h4', { text: A.name }), h('p', { text: A.desc }),
        p.done ? null : h('div', { class:'ach-bar' }, h('i', { style:{ width: clamp(p.cur / p.goal * 100, 0, 100) + '%' } })),
        p.done ? null : h('span', { class:'ach-p num', text: fmt(p.cur) + ' / ' + fmt(p.goal) })),
      doughEl(A.dough, 'sm')));
  }
  body.append(grid);
}

/* ---------------------------------------------------------------------
   In the kitchen: the Powers button and tray, mousetrap aiming,
   insta appliance placement
   --------------------------------------------------------------------- */
function pantryOpen(){ return G.active && !G.attract && !G.ch && G.diff !== 'michelin'; }
function updatePowerButton(){
  const b = $('#pw-btn');
  if (!b) return;
  const show = UI.screen === 'game' && pantryOpen();
  b.hidden = !show;
  $('#stage').classList.toggle('has-pw', show);
  if (!show){ closePowerTray(); return; }
  const n = Object.values(Profile.powers).reduce((a, v) => a + v, 0) + Object.values(Profile.insta).reduce((a, v) => a + v, 0);
  const c = $('#pw-n'); c.textContent = n ? String(n) : ''; c.hidden = !n;
  b.classList.toggle('picking', !!UI.powerPick);
}
function togglePowerTray(){
  const tray = $('#pw-tray');
  if (!tray.hidden){ closePowerTray(); return; }
  Sfx.unlock(); Sfx.play('click');
  if (UI.powerPick){ UI.powerPick = null; updatePowerButton(); }
  buildPowerTray();
  tray.hidden = false;
  placePowerTray();
  $('#pw-btn').setAttribute('aria-expanded', 'true');
}
/* the tray sits above the Powers button, or below a small kitchen (phones held upright) */
function placePowerTray(){
  const tray = $('#pw-tray');
  if (!tray || tray.hidden) return;
  const col = $('#stage-col').getBoundingClientRect(), sr = $('#stage').getBoundingClientRect();
  tray.style.width = Math.min(390, sr.width - 20) + 'px';
  tray.style.right = (col.right - sr.right + 10) + 'px';
  tray.style.maxHeight = 'none';
  const ht = tray.offsetHeight, room = sr.height - 92, below = window.innerHeight - sr.bottom - 14;
  const under = ht > room && below > Math.min(ht, 220);
  tray.classList.toggle('under', under);
  if (under){ tray.style.top = (sr.bottom - col.top + 10) + 'px'; tray.style.bottom = 'auto'; tray.style.maxHeight = Math.max(160, below) + 'px'; }
  else { tray.style.top = 'auto'; tray.style.bottom = (col.bottom - sr.bottom + 76) + 'px'; tray.style.maxHeight = Math.max(120, room) + 'px'; }
}
function closePowerTray(){ const t = $('#pw-tray'); if (t) t.hidden = true; const b = $('#pw-btn'); if (b) b.setAttribute('aria-expanded', 'false'); UI.pwArm = null; }
function buildPowerTray(){
  const tray = $('#pw-tray');
  tray.innerHTML = '';
  tray.append(h('div', { class:'pw-h' }, h('b', { text:'Powers' }), doughEl(Profile.dough, 'sm'), h('button', { class:'icon-btn pw-x', 'aria-label':'Close', onclick: closePowerTray, text:'×' })));
  const row = h('div', { class:'pw-row' });
  for (const id of POWER_ORDER){
    const P = POWERS[id], n = Profile.powers[id] || 0, armed = UI.pwArm === id;
    row.append(h('button', { class:'pw-it' + (n ? '' : ' none') + (armed ? ' armed' : ''), title: P.name + ': ' + P.desc + (n ? '' : ' None left: ' + VERB.toLowerCase() + ' twice to buy one for ' + P.cost + ' Dough.'), 'aria-label': P.name + (n ? ', ' + n + ' left' : ', buy for ' + P.cost + ' Dough'), onclick: () => powerClick(id) },
      iconCanvas(Art.powerIcon(id, 64)), h('span', { class:'pw-nm', text: armed ? 'Buy?' : P.name }), n ? h('span', { class:'pw-c', text: '×' + n }) : h('span', { class:'pw-c buy' }, svgEl(DOUGH_SVG), String(P.cost))));
  }
  tray.append(row);
  setTimeout(placePowerTray, 0);
  const insta = instaList();
  if (insta.length){
    tray.append(h('div', { class:'pw-h' }, h('b', { text:'Insta appliances' }), h('span', { class:'pw-sub', text:'free to place' })));
    const r2 = h('div', { class:'pw-row' });
    for (const key of insta){
      const it = parseInsta(key), R = RARITY[instaRarity(it.up)], n = Profile.insta[key];
      r2.append(h('button', { class:'pw-it insta', style:'--rc:' + R.color, title: TOWERS[it.type].name + ' ' + it.up.join('-') + ' (' + R.name + '): place it for free', onclick: () => startInsta(key) },
        iconCanvas(Art.towerIcon(it.type, 64, it.up)), h('span', { class:'pw-nm', text: it.up.join('-') }), n > 1 ? h('span', { class:'pw-c', text:'×' + n }) : null));
    }
    tray.append(r2);
  }
}
function powerClick(id){
  const P = POWERS[id], n = Profile.powers[id] || 0;
  if (!n){
    if (UI.pwArm !== id){ UI.pwArm = id; Sfx.play('click'); buildPowerTray(); clearTimeout(UI.pwArmT); UI.pwArmT = setTimeout(() => { if (UI.pwArm === id){ UI.pwArm = null; if (!$('#pw-tray').hidden) buildPowerTray(); } }, 3000); return; }
    UI.pwArm = null;
    if (buyPower(id)){ Sfx.play('cash'); toast('Bought a ' + P.name + ' for ' + P.cost + ' Dough.', 'gold'); }
    else { Sfx.play('error'); toast('Not enough Dough: ' + P.name + ' costs ' + P.cost + '.', 'warn'); }
    buildPowerTray(); updatePowerButton();
    return;
  }
  if (P.target === 'trail'){
    closePowerTray(); cancelPlacing(); select(null);
    UI.powerPick = id; updatePowerButton();
    toast(VERB + ' the trail to set the mousetraps.' + (IS_TOUCH ? '' : ' Right-click or Esc cancels.'), 'info');
    return;
  }
  const r = usePower(id);
  if (!r.ok){ Sfx.play('error'); toast(r.why + '.', 'warn'); return; }
  if (id === 'boost') toast('Double Shot! Every appliance attacks twice as fast for 15 seconds.', 'gold');
  else if (id === 'freeze') toast('Freezer Burst!', 'gold');
  else if (id === 'sweep') toast('Clean Sweep: ghosts, armor and mold scrubbed off.', 'gold');
  else if (id === 'storm') toast('Sizzle Storm!', 'gold');
  closePowerTray(); updatePowerButton();
}
/* clicking the kitchen while aiming mousetraps; returns true when handled */
function powerPickAt(p, ev){
  if (!UI.powerPick) return false;
  if (ev && ev.button === 2){ UI.powerPick = null; updatePowerButton(); return true; }
  const r = usePower(UI.powerPick, p);
  if (!r.ok){ Sfx.play('error'); toast(r.why + '.', 'warn'); return true; }
  UI.powerPick = null; updatePowerButton();
  return true;
}
function startInsta(key){
  const it = parseInsta(key);
  if (!it) return;
  const why = powerBlock();
  if (why){ Sfx.play('error'); toast(why + '.', 'warn'); return; }
  closePowerTray();
  UI.powerPick = null;
  UI.placing = it.type; UI.pasting = { type: it.type, up: it.up.slice(), tg:'first', insta: key }; UI.sel = null; UI.ghost = null; UI.spotPick = null; UI.lockPick = null;
  $('#place-hint').hidden = true;
  if (UI.pointer) setGhost(UI.pointer.x, UI.pointer.y);
  updatePanel(); updateShop(); updateClip(); showInfo(it.type);
  Sfx.play('click');
  toast(VERB + ' the kitchen to place your insta ' + TOWERS[it.type].name + ' ' + it.up.join('-') + '. It’s free.', 'info');
}
/* where the mousetraps would go */
function drawTrapGhost(ctx, time){
  if (UI.powerPick !== 'traps' || !UI.pointer) return;
  const spot = trailSpotNear(UI.pointer.x, UI.pointer.y, 60);
  if (!spot){
    const { x, y } = UI.pointer;
    ctx.save(); ctx.strokeStyle = 'rgba(226,56,63,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 8); ctx.moveTo(x + 8, y - 8); ctx.lineTo(x - 8, y + 8); ctx.stroke(); ctx.restore();
    return;
  }
  const P = G.paths[spot.path];
  ctx.save(); ctx.globalAlpha = 0.7 + Math.sin(time * 6) * 0.15;
  for (let i = 0; i < 3; i++){ const q = pathPos(P, clamp(spot.d + (i - 1) * 26, 0, P.len - 1), 0); Art.drawPowerTrap(ctx, { x: q.x, y: q.y, ang: q.ang, left: 6, max: 6, t: 1, snap: -9 }, time); }
  ctx.restore();
}

/* ---------------------------------------------------------------------
   End of game: Dough and chef XP from this game
   --------------------------------------------------------------------- */
function rewardSummary(){
  const L = chefLevel(Profile.chef.xp);
  return h('div', { class:'rw' },
    h('div', { class:'rw-row' }, doughEl(G.doughGame || 0, 'big'), h('span', { text:'Dough earned this game · you have ' + fmt(Profile.dough) })),
    h('div', { class:'rw-row' }, h('span', { class:'rw-lvl' }, svgEl(HAT_SVG), h('b', { text: String(L.level) })),
      h('div', { class:'rw-xp' }, h('span', { text:'Chef level ' + L.level + ' · +' + fmt(G.chefXpGame || 0) + ' XP this game' }), h('div', { class:'chef-xp-bar' }, h('i', { style:{ width: (L.pct * 100).toFixed(1) + '%' } })))),
    heroOnDuty() ? h('div', { class:'rw-row' }, iconCanvas(Art.chefPortrait(heroOnDuty().type, 64), 'rw-chef'), h('span', { text: HEROES[heroOnDuty().type].name + ' finished at level ' + heroOnDuty().level + (heroOnDuty().level >= HERO_MAX ? ': Master Chef!' : '.') })) : null);
}
function showChallengeVictory(reward){
  if (G.ch && G.ch.tm){ showTastingVictory(reward); return; }
  const C = reward && reward.crate ? CRATES[reward.crate] : null;
  modal({ title:'Challenge complete!', lead: G.ch.name + ' on ' + MAPS[G.mapId].name + ' is done. ' + (reward && reward.first ? 'Today’s reward: ' + fmt(G.ch.reward.dough) + ' Dough and a ' + C.name + '.' : 'You already claimed today’s reward. A new challenge arrives at midnight.'),
    content:[h('div', { class:'big-medal daily' }, svgEl(HAT_SVG)), statBlock([['Rounds', fmt(G.round - G.stats.start)], ['Pests cooked', fmt(G.stats.kills)], ['Cash earned', money(G.stats.earned)]]), rewardSummary()],
    actions:[
      reward && reward.first ? { label:'Open your crate', kind:'primary', onClick: () => { exitToMenu(); show('shop'); openCrateFlow(reward.crate); } } : null,
      { label:'Keep cooking', onClick: () => { continueFreeplay(); toast('Freeplay! Rounds keep getting tougher.', 'gold'); } },
      { label:'Back to menu', onClick: exitToMenu }].filter(Boolean),
    dismissable:false });
}

/* ---------------------------------------------------------------------
   Hooks and first run
   --------------------------------------------------------------------- */
function wireMetaHooks(){
  Hooks.levelUp = (L, R) => {
    if (G.attract) return;
    notify('Chef level ' + L + '! +' + R.dough + ' Dough' + (R.crate ? ' and a ' + CRATES[R.crate].name : '') + '.', 'gold');
    Sfx.play('rank');
    refreshChefBar();
  };
  Hooks.achievement = A => { if (G.attract) return; notify('Achievement: ' + A.name + '! +' + A.dough + ' Dough', 'gold'); Sfx.play('rank'); };
  Hooks.dough = () => {
    if (UI.screen === 'menu'){ clearTimeout(UI.doughT); UI.doughT = setTimeout(refreshChefBar, 60); }
    if (UI.screen === 'shop'){ const d = $('#shop-dough'); if (d) d.replaceChildren(doughEl(Profile.dough)); }
  };
  Hooks.golden = (what, e, cash, dough) => {
    if (G.attract || !G.vis) return;
    if (what === 'spawn'){ toast('A Golden Roach! Cook it before it escapes for bonus cash and Dough.', 'gold'); Sfx.play('squeak'); }
    else if (what === 'cooked'){ toast('Golden Roach cooked! +' + money(cash) + ' and +' + dough + ' Dough.', 'gold'); Sfx.play('cash'); }
    else toast('The Golden Roach got away. No lives lost.', '');
  };
}
/* older saves: award achievements already earned, and introduce what's new once */
function metaBoot(){
  /* rounds cleared before chef levels existed still count: 20 XP each, once */
  let retro = null;
  if (!Profile.retro){
    Profile.retro = 1;
    const rounds = Profile.stats.rounds || 0;
    if (rounds > 0){
      const d0 = Profile.dough, c0 = Object.values(Profile.crates).reduce((a, b) => a + b, 0);
      const hook = Hooks.levelUp; Hooks.levelUp = () => {};
      try { addChefXP(Math.min(rounds * 20, 30000)); } finally { Hooks.levelUp = hook; }
      retro = { rounds, level: chefLevel(Profile.chef.xp).level, dough: Profile.dough - d0, crates: Object.values(Profile.crates).reduce((a, b) => a + b, 0) - c0 };
    }
    saveProfile();
  }
  const joined = syncHeroUnlocks();
  const old = checkAchievements(true);
  /* only players who were here before this update get the tour; new players find it all on the menu */
  const returning = (Profile.stats.games || 0) > 0 || Object.keys(Profile.mastery).length > 0;
  if (!(Profile.news >= NEWS) && returning && UI.screen === 'menu' && !UI.modalOpen) setTimeout(() => Profile.news >= BIG_NEWS ? showSprayNews() : Profile.news >= UTENSIL_NEWS ? showBigNews() : Profile.news >= CHESS_NEWS ? showUtensilNews() : Profile.news >= MIXER_NEWS ? showChessNews() : Profile.news >= APPLIANCE_NEWS ? showMixerNews() : Profile.news >= 5 ? showApplianceNews(Profile.news) : Profile.news === 4 ? showParagonNews() : Profile.news === 3 ? showRework() : Profile.news === 2 ? showNewChefs(joined) : Profile.news === 1 ? showChefNews(joined) : showWhatsNew(old, retro, joined), 400);
  refreshMenuDots();
}
/* the news a player has seen: 1 the progression tour, 2 the head chefs, 3 the second three chefs, 4 the appliance rework, 5 paragon systems,
   6 and 7 the new appliances, a group at a time, 8 the Stand Mixer's rework, 9 the Chess Set, 10 the Chopsticks and the Lazy Susan */
const NEW_APPLIANCES = [['mandoline', 'caddy', 'saucepan'], ['bot', 'pets', 'lobster']];
const APPLIANCE_NEWS = 5 + NEW_APPLIANCES.length;
const MIXER_NEWS = APPLIANCE_NEWS + 1;
const CHESS_NEWS = MIXER_NEWS + 1;
const UTENSIL_NEWS = CHESS_NEWS + 1;
const BIG_NEWS = UTENSIL_NEWS + 1;
const NEWS = BIG_NEWS + 1;
/* players who have seen everything else hear about the modes, kitchens and events */
function showBigNews(){
  if (UI.modalOpen || UI.screen !== 'menu') return;
  Profile.news = BIG_NEWS; saveProfile();   // the Spray Bottle comes next time
  const li = (b, t) => h('li', {}, h('b', { text: b }), ' ' + t);
  const row = h('div', { class:'news-chefs' }, ['corner', 'cold', 'back'].filter(id => MAPS[id]).map(id => { thumbOf(id); return h('div', { class:'news-chef' }, iconCanvas(thumbs[id]), h('b', { text: MAPS[id].name }), h('span', { text: MAPS[id].level })); }));
  modal({ title:'A bigger kitchen', lead:'Game modes on every difficulty, eight new kitchens, weekly events and a fresh coat of paint.', cls:'chef-news',
    content:[row, h('ul', { class:'news' },
      li('House styles.', 'Every difficulty now has modes beside Standard: Prep Station Only, Fixed Menu, Hot & Cold Only, Rush Hour, Back Door, Specialty Only, Double Trouble, Half Portions, Chef’s Special and the Chef’s Table. Each has its own medal on every kitchen.'),
      li('Eight new kitchens.', 'Two in every tier, from the Breakfast Bar to Deep Freeze, with crossings, double entrances and three-trail stockrooms.'),
      li('Events.', 'Every week brings a Boss Night, where one boss returns five times, tougher each time, and a Race against the clock. Your best times go on the board.'),
      li('Feel.', 'Pests curl up and steam when cooked, damage numbers are in Settings, a kitchen radio plays, the 3D models have a cleaner cartoon look, and first games get a walkthrough.'))],
    actions:[{ label:'Got it' }, { label:'See the events', kind:'primary', onClick: showEvents }] });
}
/* players who have seen everything else meet the Spray Bottle */
function showSprayNews(){
  if (UI.modalOpen || UI.screen !== 'menu' || !TOWERS.spray) return;
  Profile.news = NEWS; saveProfile();
  const li = (b, t) => h('li', {}, h('b', { text: b }), ' ' + t);
  const T = TOWERS.spray, P = T.paths;
  const cards = [[[0, 0, 0], T.name, money(T.cost) + ' · key ' + T.hot], [[5, 0, 0], P[0].ups[4].name, P[0].name], [[0, 5, 0], P[1].ups[4].name, P[1].name], [[0, 0, 5], P[2].ups[4].name, P[2].name]];
  const row = h('div', { class:'news-chefs' }, cards.map(([up, b, sp]) => h('div', { class:'news-chef' }, iconCanvas(Art.towerIcon('spray', 96, up)), h('b', { text: b }), h('span', { text: sp }))),
    h('div', { class:'news-chef' }, iconCanvas(Art.towerIcon('spray', 96, [5, 5, 5], true)), h('b', { text: T.paragon.name }), h('span', { text: 'Paragon' })));
  modal({ title:'A new appliance: the Spray Bottle', lead:'It mists the pests in front of it and soaks them. Wet pests take more from cold and energy, so it makes your other appliances hit harder.', cls:'chef-news',
    content:[row, h('ul', { class:'news' },
      li('Soap.', 'Lathered pests slip back down the trail now and then, crashing into the pests behind them. Bubbles drift up the trail and pop on pests, foam makes everything crossing it slip, and Bubble Bath floats the toughest pests back in soap bubbles.'),
      li('Mist.', 'Combos with your other appliances: wet pests freeze solid when something cold hits them and burst into scalding steam when something hot does. The Humidifier keeps everything near it wet, and Downpour soaks the whole kitchen, with lightning on the Monsoon.'),
      li('Nozzle.', 'Twist the nozzle to Stream in its panel for a long jet that pushes pests back and scrubs off ghost cloaks, mold and armor. It grows into a pressure washer with a Hydro Blast down the busiest line of pests.'),
      li('The Car Wash.', 'Its paragon mists and jets at once, lays foam, pours out bubbles and keeps all three abilities coming.'))],
    actions:[{ label:'Got it', kind:'primary' }] });
}
/* players who have seen everything else meet the Chopsticks and the Lazy Susan */
function showUtensilNews(){
  if (UI.modalOpen || UI.screen !== 'menu' || !TOWERS.chopsticks || !TOWERS.susan) return;
  Profile.news = UTENSIL_NEWS; saveProfile();   // the modes, kitchens and events come next time
  const li = (b, t) => h('li', {}, h('b', { text: b }), ' ' + t);
  const C = TOWERS.chopsticks, S = TOWERS.susan;
  const cards = [['chopsticks', [0, 0, 0], C.name, money(C.cost) + ' · ' + C.hot], ['chopsticks', [0, 5, 0], C.paths[1].ups[4].name, C.paths[1].name], ['chopsticks', [5, 5, 5], C.paragon.name, 'Paragon', true],
    ['susan', [0, 0, 0], S.name, money(S.cost) + ' · ' + S.hot], ['susan', [0, 5, 0], S.paths[1].ups[4].name, S.paths[1].name], ['susan', [5, 5, 5], S.paragon.name, 'Paragon', true]];
  const row = h('div', { class:'news-chefs' }, cards.map(([type, up, b, sp, par]) => h('div', { class:'news-chef' }, iconCanvas(Art.towerIcon(type, 96, up, !!par)), h('b', { text: b }), h('span', { text: sp }))));
  modal({ title:'Two new appliances', lead:'A pair of chopsticks that picks pests up and puts them back where they came from, and a turntable for your other appliances.', cls:'chef-news',
    content:[row, h('ul', { class:'news' },
      li('Chopsticks.', 'Pinch a pest, lift it off the trail and drop it further back. Flick pests in a blur on the Bamboo path, lift mice, rats and even vehicles on the Lacquer path, or throw what they hold into the pests behind on the Gold path.'),
      li('Lazy Susan.', 'Place it, then place other appliances on top: whatever rides it turns with the board and attacks faster. Spin it faster, make room for up to three riders, or fling sauce off its edge as it turns.'),
      li('Paragons.', C.paragon.name + ' lifts anything short of a boss back to the entrance. ' + S.paragon.name + ' carries four appliances and winds up faster the longer a round runs.'))],
    actions:[{ label:'Got it', kind:'primary' }] });
}
/* players who have seen everything else meet the Chess Set */
function showChessNews(){
  if (UI.modalOpen || UI.screen !== 'menu' || !TOWERS.chess) return;
  Profile.news = CHESS_NEWS; saveProfile();   // the Chopsticks and the Lazy Susan come next time
  const li = (b, t) => h('li', {}, h('b', { text: b }), ' ' + t);
  const T = TOWERS.chess, P = T.paths;
  const cards = [[[0, 0, 0], 'Pawn', money(T.cost) + ' · ' + T.hot], [[5, 0, 0], P[0].ups[4].name, P[0].name], [[0, 5, 0], P[1].ups[4].name, P[1].name], [[0, 0, 5], P[2].ups[4].name, P[2].name]];
  const row = h('div', { class:'news-chefs' }, cards.map(([up, b, sp]) => h('div', { class:'news-chef' }, iconCanvas(Art.towerIcon('chess', 96, up)), h('b', { text: b }), h('span', { text: sp }))),
    h('div', { class:'news-chef' }, iconCanvas(Art.towerIcon('chess', 96, [5, 5, 5], true)), h('b', { text: T.paragon.name }), h('span', { text: 'Paragon' })));
  modal({ title:'A new appliance: the Chess Set', lead:'It starts as a pawn. Each path promotes it to a different piece, and its paragon is the Queen.', cls:'chef-news',
    content:[row, h('ul', { class:'news' },
      li('Rook.', 'Slides along the row or the column through a pest, hitting everything in line. Doubled Rooks take both at once, Back Rank crosses the kitchen and hits twice as hard near the pantry, and the Castle Keep rolls a giant rook down the trail.'),
      li('Bishop.', 'Quick slides along the diagonals that spot ghost pests and later bounce off the kitchen walls. Colour Complex turns the floor into its board: pests on the dark squares take more damage from everything.'),
      li('Knight.', 'Leaps onto pests in an L and stomps where it lands, forks the two toughest pests nearby, tours on from pest to pest, and charges up the trail with its cavalry.'),
      li('The Checkmate Queen.', 'Slides along all four lines at once, wall to wall, with knights of her own. Pawns march up the trail to be promoted to queens. Checkmate takes the toughest vehicles off the board, and Stalemate stops every pest where it stands.'))],
    actions:[{ label:'Got it', kind:'primary' }] });
}
/* players who have seen everything else hear about the Stand Mixer's rework */
function showMixerNews(){
  if (UI.modalOpen || UI.screen !== 'menu') return;
  Profile.news = MIXER_NEWS; saveProfile();   // the Chess Set comes next time
  const li = (b, t) => h('li', {}, h('b', { text: b }), ' ' + t);
  const P = TOWERS.mixer.paths;
  const row = h('div', { class:'news-chefs' }, [[5, 0, 0], [0, 5, 0], [0, 0, 5]].map((up, i) => h('div', { class:'news-chef' }, iconCanvas(Art.towerIcon('mixer', 96, up)), h('b', { text: P[i].ups[4].name }), h('span', { text: P[i].name }))));
  modal({ title:'The Stand Mixer, reworked', lead:'Three new ways to mix: storms, dough hooks and a temper that keeps rising, and a new Grand Planetary Mixer to go with them.', cls:'chef-news',
    content:[row, h('ul', { class:'news' },
      li('Whisk.', 'Forked lightning that splits at every pest it hits, whirlwinds that blow pests back up the trail, thunder meringue that sticks them in place, and superstorms that roam the kitchen.'),
      li('Dough Hook.', 'Dough hooks rise from the floor anywhere to knead pests away and leave chocolate spikes behind. Bake sales bring in cash and lives, Punch Down grabs a crowd at once, and the Dough Golem spreads spiky dough along the whole trail.'),
      li('Temper.', 'Faster for every life you lose, a frenzy that builds while it fights, Dinner Rush for mixers that work together, and Kitchen Fury, which hits harder the more pests there are.'),
      li('The Grand Planetary Mixer.', 'Electrified chips that ricochet and speed up with every throw, dough over the whole kitchen, mixing bowls whose whirlwinds blow pests back, bake sales, and Overmix: a switch that trades cash and income for huge damage.'))],
    actions:[{ label:'Got it', kind:'primary' }] });
}
/* players who already met every chef hear about the reworked appliances */
function showRework(){
  if (UI.modalOpen || UI.screen !== 'menu') return;
  Profile.news = 4; saveProfile();   // the paragon news comes next time
  const li = (b, t) => h('li', {}, h('b', { text: b }), ' ' + t);
  const row = h('div', { class:'news-chefs' }, ['blender', 'grill', 'fryer', 'mixer', 'micro'].map(type => h('div', { class:'news-chef' }, iconCanvas(Art.towerIcon(type, 96)), h('b', { text: TOWERS[type].name }), h('span', { text: money(TOWERS[type].cost) }))));
  modal({ title:'Every appliance reworked', lead:'Appliances now swing round to face what they attack, and each one plays its own part, with new prices to match.', cls:'chef-news',
    content:[row, h('ul', { class:'news' },
      li('Turn and fire.', 'Knife Blocks, toasters, grills, dishwashers, fryers, pizza ovens, mixers and the rest turn to face their target and kick back with every shot. Blenders, freezers and pasta makers still work all around them.'),
      li('New attacks.', 'The Blender flings 8 blades in every direction. The Grill flings coals. The Deep Fryer squirts batter that slows pests to half speed. The Stand Mixer throws chocolate chips. The Microwave fires 22 pulses a second.'),
      li('New prices.', 'Most appliances cost less to start, while the Microwave is now a ' + money(TOWERS.micro.cost) + ' powerhouse. Ranges, speeds and every upgrade price were retuned, and the top upgrades hit much harder.'),
      li('New abilities.', 'Fire Bird, Grease Fire, Spaghetti Storm, Kernel Blast and Full Steam.'))],
    actions:[{ label:'Got it', kind:'primary' }] });
}
/* players who saw the rework hear about the paragon systems and the grill's undead */
function showParagonNews(){
  if (UI.modalOpen || UI.screen !== 'menu') return;
  Profile.news = 5; saveProfile();   // the new appliances come next time
  const li = (b, t) => h('li', {}, h('b', { text: b }), ' ' + t);
  const row = h('div', { class:'news-chefs' }, ['grill', 'micro', 'freezer', 'sub', 'bread'].map(type => h('div', { class:'news-chef' }, iconCanvas(Art.towerIcon(type, 96, [5, 5, 5], true)), h('b', { text: TOWERS[type].paragon.name }), h('span', { text: 'Paragon' }))));
  modal({ title:'Paragons with a mind of their own', lead:'Every paragon now runs a system of its own, shown in its panel and on a bar under it, and has its own new abilities.', cls:'chef-news',
    content:[row, h('ul', { class:'news' },
      li('A system each.', 'The Eternal Barbecue burns fuel and works the bellows when it runs dry. Fusion Reactor Prime heats up until it overheats. Eternal Winter lances four times, then roars. The Admiral keeps a rack of grappling hooks, the Golden Bakery trades on the Bread Exchange, and the rest have theirs.'),
      li('22 new abilities.', 'Phoenix Pyre, Inferno Form, Meltdown, Long Night, Final Course, Carpet Bombing, Market Day and more.'),
      li('The grill raises the dead.', 'Its Smoke path now ends in Charred Horde and Lord of Ash: pests cooked nearby fill an ash pit and rise as charred undead that walk back up the trail.'),
      li('Modes and blends.', 'Switch the Nautical Hoagie Core between surfaced and submerged, and pick the Bottomless Cup’s house blend, from their panels.'))],
    actions:[{ label:'Got it', kind:'primary' }] });
}
/* players who have seen everything else meet the appliances added since they last played */
function showApplianceNews(from){
  if (UI.modalOpen || UI.screen !== 'menu') return;
  Profile.news = APPLIANCE_NEWS; saveProfile();   // the Stand Mixer's rework comes next time
  const types = NEW_APPLIANCES.slice(Math.max(0, from - 5)).flat().filter(t => TOWERS[t]);
  if (!types.length) return;
  const li = (b, t) => h('li', {}, h('b', { text: b }), ' ' + t);
  const row = h('div', { class:'news-chefs' }, types.map(type => h('div', { class:'news-chef' }, iconCanvas(Art.towerIcon(type, 96)), h('b', { text: TOWERS[type].name }), h('span', { text: money(TOWERS[type].cost) + ' · ' + TOWERS[type].hot }))));
  const lines = {
    mandoline: li('Mandoline.', 'Flings star-cut carrot slices and spots ghost pests from the start. Upgrade it to throw eight stars at once, to sabotage the whole trail with soy sauce, or to stick wasabi bombs on vehicles.'),
    caddy: li('Condiment Caddy.', 'Squirts of ketchup that land the moment they leave the nozzle. Twin revolver bottles, a golden rifle that marks pests as Wanted for big bounties, or a mustard shotgun that hits like a landmine.'),
    saucepan: li('Saucepan.', 'Lobs vinegar that keeps eating at pests. Brew tonics that make the appliances around it stronger, turn into a sauce monster, or glaze pests in gold for extra cash.'),
    bot: li('Kitchen Bot.', 'A little robot with a toothpick nail gun. Build salt, pepper, frost and spark sentries beside the trail, overclock your best appliance, or set pest traps that pay out what they catch.'),
    pets: li('Pet Basket.', 'Train a fish, a cat or a bird. Sharks drag vehicles under, sabertooths roar the trail to a standstill, and a giant roc carries pests off for good.'),
    lobster: li('Lobster Tank.', 'Works on land or water, with more reach on water. A kraken in the tank, forks that freeze and flood the kitchen, or a siren song that sends pests walking back up the trail.'),
  };
  const count = ['A new appliance', 'Two new appliances', 'Three new appliances', 'Four new appliances', 'Five new appliances', 'Six new appliances'][types.length - 1] || types.length + ' new appliances';
  modal({ title: count, lead:'Each with three paths of five upgrades, abilities of its own and a paragon with a system to master.', cls:'chef-news',
    content:[row, h('ul', { class:'news' }, types.map(t => lines[t]).filter(Boolean), li('Paragons.', types.map(t => TOWERS[t].paragon.name).join(', ') + '.'))],
    actions:[{ label:'Got it', kind:'primary' }] });
}
function showWhatsNew(old, retro, joined){
  if (UI.modalOpen || UI.screen !== 'menu') return;
  Profile.news = NEWS; saveProfile();
  const li = (b, t) => h('li', {}, h('b', { text: b }), ' ' + t);
  const earned = (old || []).reduce((a, A) => a + A.dough, 0);
  modal({ title:'New in the kitchen', lead:'More to cook for, every day.',
    content:[h('ul', { class:'news' },
      li('Dough and chef levels.', 'Every round you clear earns Dough and chef XP. Each level pays Dough, and every fifth level a crate.'),
      li('Daily specials.', 'A free chest every day, bigger for every day in a row, and a new challenge at midnight.'),
      li('Pantry Shop.', 'Spend Dough on powers and crates. Crates hold insta appliances: ready-made upgraded appliances you place for free.'),
      li('Powers.', 'Use them from the button at the bottom right of the kitchen: cash, mousetraps, Double Shot, lives, freezes and more.'),
      li('The Golden Roach.', 'Now and then a slippery golden cockroach darts through a round. Cook it before it escapes for bonus cash and Dough.'),
      li('Head chefs.', 'Hire one hero per game. They level up from 1 to 20 as you clear rounds and pick up two abilities. Meet them in Chefs.'),
      li('Achievements.', ACHIEVEMENTS.length + ' to unlock, each paying Dough. Find them in Mastery.')),
      joinedNote(joined),
      retro && retro.level > 1 ? h('div', { class:'news-gain' }, h('span', { class:'rw-lvl' }, svgEl(HAT_SVG), h('b', { text: String(retro.level) })), h('span', { text:'Your ' + fmt(retro.rounds) + ' past rounds count: chef level ' + retro.level + ', ' + fmt(retro.dough) + ' Dough' + (retro.crates ? ' and ' + retro.crates + ' crate' + (retro.crates === 1 ? '' : 's') + ' to open in the shop' : '') + '.' })) : null,
      earned ? h('div', { class:'news-gain' }, doughEl(earned, 'big'), h('span', { text:'for ' + old.length + ' achievement' + (old.length === 1 ? '' : 's') + ' you already earned' })) : null],
    actions:[{ label:'Got it' }, { label:'Open the daily chest', kind:'primary', onClick: showDaily }] });
  refreshChefBar();
}
/* returning players who already saw the progression tour meet the head chefs */
function joinedNote(joined){
  if (!joined || !joined.length) return null;
  return h('div', { class:'news-gain' }, ...joined.map(id => iconCanvas(Art.chefPortrait(id, 64), 'rw-chef')), h('span', { text: joined.map(id => HEROES[id].name).join(' and ') + (joined.length > 1 ? ' have' : ' has') + ' already joined you, thanks to your chef level.' }));
}
function showChefNews(joined){
  if (UI.modalOpen || UI.screen !== 'menu') return;
  Profile.news = NEWS; saveProfile();
  const row = h('div', { class:'news-chefs' }, HERO_ORDER.map(id => h('div', { class:'news-chef', style:'--hc:' + HEROES[id].color }, iconCanvas(Art.chefPortrait(id, 128)), h('b', { text: HEROES[id].name }), h('span', { text: HEROES[id].role }))));
  modal({ title:'Head chefs are here', lead:'Bring a hero into every game. They level up from 1 to 20 as you clear rounds, and pick up two abilities on the way.', cls:'chef-news',
    content:[row, h('ul', { class:'news' },
      h('li', {}, h('b', { text:'Chef Blaze' }), ' is yours already and waits above the shop in your next game.'),
      h('li', {}, h('b', { text:'The other ' + (HERO_ORDER.length - 1) }), ' join for free as your chef level rises (' + HERO_ORDER.filter(id => HEROES[id].unlock).map(id => HEROES[id].name.replace('Chef ', '') + ' at ' + HEROES[id].unlock.level).join(', ') + '), or hire them sooner for Dough.')),
      joinedNote(joined)],
    actions:[{ label:'Later' }, { label:'Meet the chefs', kind:'primary', onClick: () => show('chefs') }] });
}
/* players who already met the first three chefs meet the next three */
function showNewChefs(joined){
  if (UI.modalOpen || UI.screen !== 'menu') return;
  Profile.news = NEWS; saveProfile();
  const ids = ['chef_kenji', 'chef_nonna', 'chef_bruno'].filter(id => HEROES[id] && HERO_ORDER.includes(id));
  const lvl = chefLevel(Profile.chef.xp).level;
  const row = h('div', { class:'news-chefs' }, ids.map(id => h('div', { class:'news-chef', style:'--hc:' + HEROES[id].color }, iconCanvas(Art.chefPortrait(id, 128)), h('b', { text: HEROES[id].name }), h('span', { text: HEROES[id].role }))));
  const li = id => { const H = HEROES[id], A = H.levels.filter(L => L.ab).map(L => ABILITIES[L.ab].name).join(' and ');
    return h('li', {}, h('b', { text: H.name + ', ' + H.title.toLowerCase() + '.' }), ' ' + H.blurb + ' Abilities: ' + A + '. ' + (heroOwned(id) ? 'Already in your kitchen.' : 'Joins at chef level ' + H.unlock.level + ' (you are ' + lvl + '), or hire now for ' + fmt(H.unlock.dough) + ' Dough.')); };
  modal({ title:'Three new head chefs', lead:'More heroes to bring into your games, each with 20 levels and two abilities.', cls:'chef-news',
    content:[row, h('ul', { class:'news' }, ids.map(li)), joinedNote(joined)],
    actions:[{ label:'Later' }, { label:'Meet the chefs', kind:'primary', onClick: () => show('chefs') }] });
}
