'use strict';
/* =====================================================================
   Kitchen Siege — the Events screen: this week's Boss Night and Race,
   your bests, the Best Times board, and the event clock in play.
   ===================================================================== */
function untilWeekEnd(){
  const ms = weekEnd() - new Date(), d = Math.floor(ms / 86400000), hr = Math.floor(ms % 86400000 / 3600000);
  return d > 0 ? d + (d === 1 ? ' day' : ' days') + (hr ? ' ' + hr + 'h' : '') : hr > 0 ? hr + 'h' : 'under an hour';
}
function eventsDot(){
  const wk = weeklyEvents(), E = Profile.events && Profile.events[wk.week];
  return !E || !E.boss || !E.race;
}
function tierPips(rec, live){
  const row = h('div', { class:'ev-tiers' });
  EV_TIERS.forEach((r, i) => {
    const got = (live ? live.done : rec.tiers) >= i + 1, t = rec.times[i];
    row.append(h('span', { class:'ev-tier' + (got ? ' got' : ''), title: 'Tier ' + (i + 1) + ' at round ' + r + (t ? ' · best ' + fmtClock(t) : '') }, h('b', { text: String(i + 1) }), h('small', { text: 'R' + r })));
  });
  return row;
}
function boardList(kind){
  const list = boardOf(kind);
  if (!list.length) return h('p', { class:'dly-note', text: kind === 'boss' ? 'No boss runs on the board yet. Every tier you clear is a time.' : 'No races on the board yet.' });
  return h('ol', { class:'ev-board' }, list.slice(0, 5).map(e => h('li', {}, h('span', { class:'ev-wk', text: e.week.replace('-W', ' wk ') }), h('span', { class:'ev-lb', text: e.label }), h('b', { class:'num', text: fmtClock(e.score) }))));
}
function showEvents(){
  Sfx.unlock();
  const wk = weeklyEvents(), B = wk.boss, R = wk.race, rb = evRecord(B), rr = evRecord(R);
  const existing = readStoredGame();
  thumbOf(B.map); thumbOf(R.map);
  const bossCard = h('div', { class:'dly-ch ev-card' },
    h('div', { class:'dly-ch-top' }, iconCanvas(thumbs[B.map], 'dly-thumb'),
      h('div', { class:'dly-ch-id' }, h('h3', {}, iconCanvas(Art.pestIcon(B.boss, 64), 'ev-boss'), B.name),
        h('div', { class:'dly-meta' }, h('span', { class:'level ' + MAPS[B.map].level, text: MAPS[B.map].name }), h('span', { text: DIFFS[B.diff].name + ' · rounds 1 to 100' })),
        h('div', { class:'dly-meta' }, h('span', { text: ENEMIES[B.boss].name + ' returns at rounds ' + EV_TIERS.join(', ') + ', tougher each time.' })))),
    tierPips(rb),
    h('div', { class:'dly-reward' }, h('span', { text: rb.tiers ? 'Best: tier ' + rb.tiers + ' in ' + fmtClock(rb.times[rb.tiers - 1]) + ' · ' + rb.tries + (rb.tries === 1 ? ' try' : ' tries') : 'Not played this week' }),
      rb.tiers >= 5 ? null : h('span', { text:'Next tier pays' }), rb.tiers >= 5 ? null : doughEl(EV_REWARD_TIER[rb.tiers])),
    h('button', { class:'btn btn-primary', onclick: () => startEvent(B) }, rb.tiers ? 'Play again' : 'Play Boss Night'));
  const raceCard = h('div', { class:'dly-ch ev-card' },
    h('div', { class:'dly-ch-top' }, iconCanvas(thumbs[R.map], 'dly-thumb'),
      h('div', { class:'dly-ch-id' }, h('h3', { text: R.name }),
        h('div', { class:'dly-meta' }, h('span', { class:'level ' + MAPS[R.map].level, text: MAPS[R.map].name }), h('span', { text: DIFFS[R.diff].name + ' · rounds 1 to ' + R.end })),
        h('div', { class:'dly-meta' }, h('span', { text:'Rounds start by themselves. The clock runs while pests are on the trail; a retry adds ' + EV_RETRY_PENALTY + 's.' })))),
    h('div', { class:'dly-reward' }, h('span', { text: rr.time ? 'Best: ' + fmtClock(rr.time) + ' · ' + rr.tries + (rr.tries === 1 ? ' try' : ' tries') : 'Not raced this week' }), rr.time ? null : h('span', { text:'First finish pays' }), rr.time ? null : doughEl(EV_REWARD_RACE)),
    h('button', { class:'btn btn-primary', onclick: () => startEvent(R) }, rr.time ? 'Race again' : 'Start the race'));
  modal({ title:'Events', cls:'daily events', lead:'Two events a week, the same for everyone. No powers or insta appliances. New ones in ' + untilWeekEnd() + '.',
    content:[
      h('section', { class:'dly-sec' }, h('div', { class:'dly-h' }, h('h3', { text:'Boss Night' }), h('span', { class:'dly-streak', text: wk.week.replace('-W', ' · week ') })), bossCard, h('div', { class:'dly-label', text:'Best times' }), boardList('boss')),
      h('section', { class:'dly-sec' }, h('div', { class:'dly-h' }, h('h3', { text:'The Race' })), raceCard, h('div', { class:'dly-label', text:'Best times' }), boardList('race')),
      tastingSection(existing),
      expeditionSection(),
      h('p', { class:'note', text: slotStartNote() }),
    ],
    actions:[{ label:'Close' }] });
}
/* ---------------------------------------------------------------------
   Boss Battles: the bosses' own game mode
   --------------------------------------------------------------------- */
function bbPips(rec, n){
  const row = h('div', { class:'ev-tiers bb-pips' });
  for (let i = 0; i < n; i++) row.append(h('span', { class:'ev-tier' + (rec.tiers > i ? ' got' : ''), title: 'Tier ' + (i + 1) + (rec.times[i] ? ' · best ' + fmtClock(rec.times[i]) : '') }, h('b', { text: String(i + 1) })));
  return row;
}
function showBosses(){
  Sfx.unlock();
  const elite = !!UI.bbElite, map = MAPS[UI.bbMap] ? UI.bbMap : MAP_ORDER[0];
  const existing = readStoredGame();
  const side = elite ? 'elite' : 'normal';
  const recOf = key => ((Profile.battles || {})[key] || {})[side] || { tiers: 0, times: [], tries: 0 };
  const sideBtn = (on, label) => h('button', { class:'btn btn-small' + (elite === on ? ' btn-primary' : ''), onclick: () => { UI.bbElite = on; closeModal(); showBosses(); } }, label);
  const mapSel = h('select', { class:'bb-map', onchange: ev => { UI.bbMap = ev.target.value; } },
    MAP_ORDER.map(m => { const o = h('option', { value: m, text: MAPS[m].name + ' (' + MAPS[m].level + ')' }); if (m === map) o.selected = true; return o; }));
  const go = ev => startEvent(ev);
  const cards = BOSS_CYCLE.map(b => {
    const rec = recOf(b), done = rec.tiers >= EV_TIERS.length;
    return h('div', { class:'bb-card' + (done ? ' done' : '') },
      h('div', { class:'bb-top' }, iconCanvas(Art.pestIcon(b, 64), 'bb-ico'),
        h('div', { class:'bb-id' }, h('b', { text: ENEMIES[b].name.replace(/^The /, '') }), h('small', { text: BOSS_HINT[b] || '' }))),
      bbPips(rec, EV_TIERS.length),
      h('div', { class:'bb-foot' }, h('span', { class:'num', text: done ? 'Best ' + fmtClock(rec.times[EV_TIERS.length - 1]) : rec.tiers ? 'Tier ' + rec.tiers + ' of 5' : 'Not beaten' }),
        h('button', { class:'btn btn-small btn-primary', onclick: () => go(battleEvent(b, UI.bbMap || map, elite)) }, 'Fight')));
  });
  const rr = recOf('_rush'), rushDone = rr.tiers >= BB_RUSH_TIERS.length;
  const rush = h('div', { class:'bb-card bb-rush' + (rushDone ? ' done' : '') },
    h('div', { class:'bb-top' }, h('div', { class:'bb-strip' }, BOSS_CYCLE.map(b => iconCanvas(Art.pestIcon(b, 64), 'bb-mini'))),
      h('div', { class:'bb-id' }, h('b', { text:'Boss Rush' }), h('small', { text:'All ' + BOSS_CYCLE.length + ' bosses in turn, one every five rounds from round ' + BB_RUSH_TIERS[0] + ' to ' + BB_RUSH_TIERS[BB_RUSH_TIERS.length - 1] + '.' }))),
    bbPips(rr, BB_RUSH_TIERS.length),
    h('div', { class:'bb-foot' }, h('span', { class:'num', text: rushDone ? 'Best ' + fmtClock(rr.times[BB_RUSH_TIERS.length - 1]) : rr.tiers ? rr.tiers + ' of ' + BB_RUSH_TIERS.length + ' bosses' : 'Not tried' }),
      rushDone ? null : h('span', { class:'bb-pay' }, 'Clearing it pays ', doughEl(BB_REWARD_RUSH * (elite ? BB_ELITE.pay : 1))),
      h('button', { class:'btn btn-small btn-primary', onclick: () => go(rushEvent(UI.bbMap || map, elite)) }, 'Start the rush')));
  modal({ title:'Boss Battles', cls:'daily events bosses', lead:'Bosses have their own fights. Start at round ' + BB_START[0] + ' with $' + fmt(BB_START[1]) + '; the boss comes at rounds ' + EV_TIERS.join(', ') + ', tougher each time. Every tier you clear for the first time pays Dough. No powers or insta appliances.',
    content:[
      h('div', { class:'bb-bar' }, h('div', { class:'bb-side' }, sideBtn(false, 'Normal'), sideBtn(true, 'Elite')), h('label', { class:'bb-mapl' }, h('span', { text:'Kitchen' }), mapSel)),
      h('p', { class:'dly-note', text: elite ? 'Elite: Hard prices and pests, and every boss is ' + BB_ELITE.lvl + ' levels higher (more skulls) with ' + Math.round((BB_ELITE.hp - 1) * 100) + '% more health. Pays double.' : 'Normal: Medium prices and pests.' }),
      rush,
      h('div', { class:'bb-grid' }, cards),
      h('p', { class:'note', text: slotStartNote() }),
    ],
    actions:[{ label:'Close' }] });
}
function startEvent(ev){
  closeModal();
  UI.diffPick = ev.diff;
  Profile.news = NEWS;
  newGame(ev.map, ev.diff, false, null, 'standard', ev);
  enterGame();
  if (ev.kind === 'boss' || ev.kind === 'battle') toast(ev.name + ': ' + ENEMIES[ev.boss].name + ' comes at rounds ' + EV_TIERS.join(', ') + '. The clock runs while rounds are in play.', 'gold');
  else if (ev.kind === 'rush') toast('Boss Rush: a new boss every five rounds from round ' + BB_RUSH_TIERS[0] + ', starting with ' + ENEMIES[ev.order[0]].name + '.', 'gold');
  else toast(ev.name + ': clear ' + ev.end + ' rounds against the clock. Rounds start by themselves.', 'gold');
}
/* the clock in the top bar during an event */
function eventLabel(){
  if (!G.ev) return null;
  const t = fmtClock(evScore());
  if (G.ev.kind === 'rush'){ const k = G.ev.done, next = G.ev.tiers[k]; return G.ev.name + ' · ' + t + (next ? ' · ' + ENEMIES[G.ev.order[k]].name.replace(/^The /, '') + ' at R' + next : ''); }
  if (isBossEv(G.ev)){ const next = G.ev.tiers[G.ev.done]; return G.ev.name + ' · ' + t + (next ? ' · tier ' + (G.ev.done + 1) + ' at R' + next : ''); }
  return G.ev.name + ' · ' + t + ' · to R' + G.ev.end;
}
function eventCleared(got){
  if (!G.ev) return;
  if (G.ev.kind === 'rush' && !got.last){
    toast(ENEMIES[got.boss].name + ' beaten (' + got.tier + ' of ' + G.ev.tiers.length + ') · ' + fmtClock(got.score) + '. Next: ' + ENEMIES[G.ev.order[got.tier]].name + ' at round ' + G.ev.tiers[got.tier] + '.', 'gold');
    Sfx.play('rank');
  } else if (isBossEv(G.ev) && got.tier < G.ev.tiers.length){
    toast('Tier ' + got.tier + ' cleared in ' + fmtClock(got.score) + (got.better ? ' · a new best' : '') + (got.dough ? ' · +' + got.dough + ' Dough' : ''), 'gold');
    Sfx.play('rank');
  }
}
function showEventVictory(){
  const ev = G.ev, score = evScore(), fight = ev.kind === 'battle' || ev.kind === 'rush';
  const rec = fight ? bbRecord(ev) : evRecord(ev), boss = isBossEv(ev), nT = ev.tiers.length;
  const medal = h('div', { class:'big-medal daily' }, ev.kind === 'rush' ? h('span', { text:'☠' }) : boss ? iconCanvas(Art.pestIcon(ev.boss, 64), 'hico') : h('span', { text:'⏱' }));
  const best = boss ? rec.times[nT - 1] >= score : rec.time >= score;
  const title = ev.kind === 'rush' ? 'Boss Rush cleared!' : boss ? ENEMIES[ev.boss].name + ' is done for' : 'Race finished!';
  const lead = (ev.kind === 'rush' ? 'All ' + nT + ' bosses beaten in ' : boss ? 'All five tiers cleared in ' : ev.end + ' rounds in ') + fmtClock(score) + (best ? (fight ? ' · your best.' : ' · your best this week.') : '.') + (ev.elite ? ' Elite.' : '') + (ev.retries ? ' Includes ' + ev.retries * EV_RETRY_PENALTY + 's of retry penalties.' : '');
  modal({ title, lead,
    content:[medal, statBlock([['Clock', fmtClock(score)], ['Pests cooked', fmt(G.stats.kills)], ['Retries', String(ev.retries)]]), rewardSummary(), xpList()],
    actions:[{ label: fight ? 'Boss Battles' : 'Events', kind:'primary', onClick: () => { exitToMenu(); fight ? showBosses() : showEvents(); } }, { label:'Back to menu', onClick: exitToMenu }],
    dismissable:false });
}

/* ---------------------------------------------------------------------
   The Tasting Menu: three courses, one crew
   --------------------------------------------------------------------- */
function crewSize(crew){ return Object.keys(crew).reduce((a, k) => a + (crew[k] || 0), 0); }
function crewKinds(crew){ return Object.keys(crew).filter(k => crew[k] > 0).length; }
function tastingSection(existing){
  const T = weeklyTasting(), rec = tmRecord(T);
  for (const m of T.maps) thumbOf(m);
  const legs = h('div', { class:'tm-legs' }, T.maps.map((m, i) => h('div', { class:'tm-leg' + (rec.leg > i ? ' done' : rec.leg === i ? ' next' : '') },
    iconCanvas(thumbs[m], 'dly-thumb'), h('b', { text: 'Course ' + (i + 1) }), h('span', { text: MAPS[m].name }), h('small', { text: 'Rounds ' + TM_ROUNDS[i][0] + '–' + TM_ROUNDS[i][1] + (i === 2 ? ' · ' + CH_RULES[T.rule].name : '') }), rec.leg > i ? h('i', { class:'ok', text:'✓' }) : null)));
  const crew = rec.crew ? h('div', { class:'dly-towers' }, Object.keys(rec.crew).filter(k => rec.crew[k] > 0).map(t => h('span', { class:'dly-tw', title: TOWERS[t].name }, iconCanvas(Art.towerIcon(t, 64)), h('small', { text: TOWERS[t].name + ' ×' + rec.crew[t] })))) : null;
  const status = rec.done ? 'Finished this week ✓ · reward claimed' : rec.leg ? 'Course ' + rec.leg + ' of 3 done · ' + rec.lives + ' lives left' : 'Not started this week';
  const btn = h('button', { class:'btn btn-primary', onclick: () => rec.crew ? startTastingLeg(T, rec, Math.min(2, rec.leg)) : showCrewPicker(T, rec) },
    rec.done ? 'Cook it again' : rec.leg ? (rec.leg >= 3 ? 'Cook it again' : 'Continue: course ' + (rec.leg + 1)) : rec.crew ? 'Start course 1' : 'Pick your crew');
  const card = h('div', { class:'dly-ch ev-card' }, legs,
    h('div', { class:'dly-label', text: rec.crew ? 'Your crew' : 'Your crew: up to ' + TM_KINDS_MAX + ' kinds, ' + TM_CREW_MAX + ' appliances in all' }), crew,
    h('div', { class:'dly-reward' }, h('span', { text: status }), rec.done ? null : h('span', { text:'Finishing all three pays' }), rec.done ? null : doughEl(TM_REWARD.dough), rec.done ? null : h('span', { text:'+ a ' + CRATES[TM_REWARD.crate].name })),
    h('div', { class:'acts-row' }, btn, rec.crew && !rec.leg ? h('button', { class:'btn', onclick: () => showCrewPicker(T, rec) }, 'Change crew') : null));
  return h('section', { class:'dly-sec' }, h('div', { class:'dly-h' }, h('h3', { text:'Tasting Menu' }), h('span', { class:'dly-streak', text:'Three kitchens, one crew' })), card);
}
function showCrewPicker(T, rec){
  const crew = Object.assign({}, rec.crew || {});
  const types = TOWER_ORDER.filter(t => TOWERS[t] && !TOWERS[t].hero && !TOWERS[t].custom);
  const grid = h('div', { class:'crew-grid' }), meter = h('p', { class:'dly-note' });
  const render = () => {
    grid.innerHTML = '';
    const n = crewSize(crew), kinds = crewKinds(crew);
    for (const t of types){
      const c = crew[t] || 0, canAdd = n < TM_CREW_MAX && (c > 0 || kinds < TM_KINDS_MAX);
      grid.append(h('div', { class:'crew' + (c ? ' on' : '') }, iconCanvas(Art.towerIcon(t, 64)), h('b', { text: TOWERS[t].name }), h('span', { class:'crew-n' },
        h('button', { class:'btn btn-small', disabled: !c, 'aria-label':'fewer', onclick: () => { crew[t] = c - 1; render(); } }, '−'), h('i', { text: String(c) }),
        h('button', { class:'btn btn-small', disabled: !canAdd, 'aria-label':'more', onclick: () => { crew[t] = c + 1; render(); } }, '+'))));
    }
    meter.textContent = n + ' of ' + TM_CREW_MAX + ' appliances · ' + kinds + ' of ' + TM_KINDS_MAX + ' kinds' + (n ? '' : ' · pick at least one');
    const ok = $('#crew-ok'); if (ok) ok.disabled = !tmCrewOk(crew);
  };
  render();
  modal({ title:'Pick your crew', lead:'The same crew cooks all three courses. Each course can place no more of a kind than the crew holds; your head chef always comes along.', cls:'daily', wide:true,
    content:[meter, grid],
    actions:[{ label:'Back', onClick: showEvents }, { label:'Set sail', kind:'primary', onClick: () => { if (!tmCrewOk(crew)) return; rec.crew = crew; saveProfile(); startTastingLeg(T, rec, 0); } }] });
  const ok = $$('.modal .acts .btn-primary')[0]; if (ok) ok.id = 'crew-ok';
  render();
}
function startTastingLeg(T, rec, leg){
  closeModal();
  rec.tries++; saveProfile();
  const ch = tmLeg(T, rec, leg);
  UI.diffPick = ch.diff;
  startNewGame(ch.map, ch.diff, false, ch);
}
function showTastingVictory(reward){
  const r = reward && reward.tm, T = weeklyTasting(), rec = tmRecord(T);
  const last = r && r.last;
  modal({ title: last ? 'Tasting Menu complete!' : 'Course ' + ((r ? r.leg : 0) + 1) + ' served', lead: last ? 'All three kitchens cooked. ' + (r.dough ? 'This week’s reward: ' + fmt(r.dough) + ' Dough and a ' + CRATES[r.crate].name + '.' : 'You already claimed this week’s reward.') : MAPS[G.mapId].name + ' is clear with ' + fmt(G.lives) + ' lives left. They carry over to the next course.',
    content:[h('div', { class:'big-medal daily' }, svgEl(HAT_SVG)), statBlock([['Rounds', fmt(G.round - G.stats.start)], ['Pests cooked', fmt(G.stats.kills)], ['Lives left', fmt(G.lives)]]), rewardSummary()],
    actions:[last ? (r && r.crate ? { label:'Open your crate', kind:'primary', onClick: () => { exitToMenu(); show('shop'); openCrateFlow(r.crate); } } : { label:'Events', kind:'primary', onClick: () => { exitToMenu(); showEvents(); } })
      : { label:'Next course', kind:'primary', onClick: () => { G.active = false; startTastingLeg(T, rec, Math.min(2, rec.leg)); } },
      { label:'Back to menu', onClick: exitToMenu }],
    dismissable:false });
}
