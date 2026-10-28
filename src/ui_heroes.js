'use strict';
/* =====================================================================
   Kitchen Siege — head chefs in the interface: the hire card above the
   kitchen's shop, the chef's panel (level, XP, the 20-level track and
   abilities), the Chefs screen on the menu, and the notes that pop up
   as chefs level up and join.
   ===================================================================== */
const SWAP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const HERO_KEY = '0';

/* ---------------------------------------------------------------------
   The hire card above the shop: the picked chef and their price, or the
   chef on duty with their level
   --------------------------------------------------------------------- */
function buildHeroCard(){
  const slot = $('#hero-slot');
  if (!slot) return;
  slot.innerHTML = '';
  slot.hidden = !G.active || G.attract;
  if (slot.hidden) return;
  const duty = heroOnDuty(), type = duty ? duty.type : heroPick(), H = HEROES[type];
  const owned = HERO_ORDER.filter(heroOwned);
  const card = h('button', { class:'hero-card' + (duty ? ' duty' : ''), id:'hero-card', style:'--hc:' + H.color, 'data-key': heroCardKey(),
    title: duty ? H.name + ': select to level up' : H.name + ', your head chef' + (IS_TOUCH ? '' : ' (' + HERO_KEY + ')') + '. One per game; levels up as you clear rounds.',
    onclick: () => { Sfx.unlock(); if (heroOnDuty()) select(heroOnDuty()); else startPlacing(heroPick()); },
    onmouseenter: () => showInfo(type), onfocus: () => showInfo(type), onmouseleave: () => showInfo(UI.placing) },
    duty || IS_TOUCH ? null : h('span', { class:'hk', text: HERO_KEY }),
    iconCanvas(Art.chefPortrait(type, 64), 'hc-face'),
    h('span', { class:'hc-body' },
      h('span', { class:'hc-tag', text: duty ? 'Head chef · on duty' : 'Head chef' }),
      h('b', { class:'hc-name', text: H.name }),
      h('span', { class:'hc-sub', id:'hc-sub' })),
    duty ? h('span', { class:'hc-lv', id:'hc-lv' }) : h('span', { class:'pr num', id:'hc-pr' }));
  slot.append(card);
  if (duty || owned.length < 2) UI.heroPicker = false;
  if (!duty && owned.length > 1){
    slot.append(h('button', { class:'hc-swap', 'aria-label':'Switch head chef', 'aria-expanded': String(!!UI.heroPicker), title:'Switch head chef',
      onclick: () => { UI.heroPicker = !UI.heroPicker; Sfx.play('click'); buildHeroCard(); } }, svgEl(SWAP_SVG)));
    /* every hired chef, one tap to bring them */
    if (UI.heroPicker) slot.append(h('div', { class:'hc-pick', role:'group', 'aria-label':'Pick your head chef' }, owned.map(id => {
      const H = HEROES[id];
      return h('button', { style:'--hc:' + H.color, 'aria-pressed': String(id === heroPick()), 'aria-label': H.name + ', ' + H.role, title: H.name + ' · ' + H.role,
        onclick: () => {
          setHeroPick(id); UI.heroPicker = false;
          if (UI.placing && isHero(UI.placing)) cancelPlacing();
          Sfx.play('click'); buildHeroCard(); showInfo(id);
        } }, iconCanvas(Art.chefPortrait(id, 64)));
    })));
  }
  updateHeroCard();
}
function heroCardKey(){ const d = heroOnDuty(); return d ? 'duty:' + d.id : 'free:' + heroPick(); }
function updateHeroCard(){
  const card = $('#hero-card');
  if (!card){ if (G.active && !G.attract && $('#hero-slot') && !$('#hero-slot').hidden) buildHeroCard(); return; }
  if (card.dataset.key !== heroCardKey()){ buildHeroCard(); return; }
  const duty = heroOnDuty();
  const sub = $('#hc-sub');
  if (duty){
    const max = duty.level >= HERO_MAX, txt = max ? 'Master Chef' : Math.floor(duty.hxp / heroNeed(duty.level) * 100) + '% to level ' + (duty.level + 1);
    if (sub.textContent !== txt) sub.textContent = txt;
    const lv = $('#hc-lv'), lt = 'Lv ' + duty.level;
    if (lv.textContent !== lt) lv.textContent = lt;
    card.classList.toggle('sel', UI.sel === duty);
  } else {
    const type = heroPick(), c = towerCost(type), pr = money(c);
    const role = HEROES[type].role;
    if (sub.textContent !== role) sub.textContent = role;
    const el = $('#hc-pr'); if (el.textContent !== pr) el.textContent = pr;
    card.classList.toggle('poor', !canAfford(c));
    card.classList.toggle('sel', UI.placing === type && !UI.pasting);
  }
}
/* the shop's info box for a head chef */
function heroInfo(box, type){
  const H = HEROES[type];
  box.append(h('b', { text: H.name + ' · ' + H.title }), H.blurb + ' ', h('span', { style:{ color:'var(--mint)', fontWeight:600 }, text: 'One head chef per game. Levels up to 20 as you clear rounds, with two abilities on the way.' }));
}

/* ---------------------------------------------------------------------
   The chef's panel
   --------------------------------------------------------------------- */
function buildHeroPanel(t){
  const P = $('#tpanel'); P.innerHTML = '';
  const H = HEROES[t.type];
  P.append(h('div', { class:'tp-head hero-head', style:'--hc:' + H.color },
    iconCanvas(Art.chefPortrait(t.type, 64)),
    h('div', { class:'tp-title' }, h('div', { class:'tp-name', text: H.name }), h('div', { class:'tp-sub', text: (t.level >= HERO_MAX ? 'Master Chef' : 'Level ' + t.level) + ' · ' + H.title })),
    h('button', { class:'icon-btn', 'aria-label':'Close', title:'Close (Esc)', onclick: () => select(null), text:'×' })));
  P.append(h('div', { class:'tp-stats', id:'tp-stats' }));
  const chips = buffChips(t);
  if (chips.length) P.append(h('div', { class:'buffs' }, chips.map(c => h('span', { text: c }))));
  const seg = h('div', { class:'seg', role:'group', 'aria-label':'Targeting' });
  for (const k of targetModes(t)) seg.append(h('button', { 'aria-pressed': String(t.tg === k), title:'Target ' + TARGET_TIP[k] + ' (Tab cycles)', onclick: () => { t.tg = k; updatePanel(true); }, text: targetLabel(t, k) }));
  P.append(seg);
  if (isAdminUnit(t.type)) P.append(h('p', { class:'bnote', style:'margin:6px 0', text:'Admin unit. Nothing reaches the counter around him; pests crawl to a near standstill at his feet. This game earns no medals, records or Dough.' }));
  else P.append(heroLevelBox(t));
  if (UI.abPreview && UI.abPreview.t && !UI.abPreview.until) UI.abPreview = null;
  P.append(heroAbilities(t));
  P.append(h('div', { class:'tp-foot' }, sellButton(t, isAdminUnit(t.type) ? 'He can be placed again from the shop' : 'Its level starts again from 1 if you hire it again')));
}
/* what a level brings, in words */
function heroLevelText(type, L){ return L <= 1 ? HEROES[type].blurb : HEROES[type].levels[L - 2].desc; }
function heroLevelBox(t){
  const H = HEROES[t.type], max = t.level >= HERO_MAX;
  const box = h('div', { class:'hlv' + (max ? ' max' : ''), style:'--hc:' + H.color });
  box.append(h('div', { class:'hlv-top' },
    h('span', { class:'hlv-badge', 'aria-hidden':'true', text: String(t.level) }),
    h('div', { class:'hlv-mid' },
      h('div', { class:'hlv-t' }, h('b', { text: max ? 'Master Chef' : 'Level ' + t.level + ' of ' + HERO_MAX }), h('span', { class:'hlv-xp num', id:'hlv-xp' })),
      h('div', { class:'hlv-bar' }, h('i', { id:'hlv-fill' })),
      h('small', { class:'hlv-note', id:'hlv-note' }))));
  const next = h('p', { class:'hlv-next', id:'hlv-next' });
  const showLv = L => {
    const own = L <= t.level, lvAb = L > 1 && H.levels[L - 2].ab;
    next.replaceChildren(h('b', { text: (own ? 'Level ' + L : L === t.level + 1 ? 'Next · level ' + L : 'Level ' + L) + (lvAb ? ' · new ability' : '') + ': ' }), heroLevelText(t.type, L).replace(/^Ability: /, ''));
    next.classList.toggle('own', own);
  };
  const track = h('div', { class:'hlv-track', role:'group', 'aria-label':'The 20 levels: pick one to read what it brings' });
  for (let L = 1; L <= HERO_MAX; L++){
    const lvAb = L > 1 && H.levels[L - 2].ab;
    const pip = h('button', { class:'hlv-pip' + (L <= t.level ? ' on' : '') + (lvAb ? ' lv-ab' : '') + (L === t.level + 1 ? ' up-next' : '') + (L === HERO_MAX ? ' top' : ''),
      'aria-label': 'Level ' + L + (L <= t.level ? ', reached' : '') + ': ' + heroLevelText(t.type, L), onclick: ev => { ev.stopPropagation(); showLv(L); } }, L === HERO_MAX ? '★' : String(L));
    pip.addEventListener('pointerenter', ev => { if (ev.pointerType === 'mouse') showLv(L); });
    track.append(pip);
  }
  track.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') showLv(Math.min(HERO_MAX, t.level + (max ? 0 : 1))); });
  box.append(track, next);
  showLv(Math.min(HERO_MAX, t.level + (max ? 0 : 1)));
  if (!max) box.append(h('button', { class:'hlv-buy', id:'hlv-buy', title:'Buy level ' + (t.level + 1) + ' now' + (IS_TOUCH ? '' : ' (,)'), onclick: () => heroBuyUI(t) },
    h('span', { text:'Level up now' }), h('span', { class:'price num', id:'hlv-cost' })));
  return box;
}
function refreshHeroBox(t){
  const xpEl = $('#hlv-xp');
  if (!xpEl) return;
  const max = t.level >= HERO_MAX, need = heroNeed(t.level);
  const txt = max ? 'Level 20 reached' : fmt(t.hxp) + ' / ' + fmt(need) + ' XP';
  if (xpEl.textContent !== txt) xpEl.textContent = txt;
  $('#hlv-fill').style.width = (max ? 100 : clamp(t.hxp / need * 100, 0, 100)) + '%';
  const note = $('#hlv-note');
  const nt = max ? 'Every level unlocked.' : '+' + fmt(heroRoundXP(G.round)) + ' XP when ' + (G.roundActive ? 'this round is cleared' : 'round ' + G.round + ' is cleared');
  if (note.textContent !== nt) note.textContent = nt;
  const btn = $('#hlv-buy');
  if (btn){
    const c = heroLevelCost(t), ok = canAfford(c);
    const ct = money(c), pr = $('#hlv-cost');
    if (pr.textContent !== ct) pr.textContent = ct;
    btn.classList.toggle('can', ok); btn.classList.toggle('poor', !ok);
  }
}
/* the chef's abilities, with the ones still to come shown locked */
function heroAbilities(t){
  const H = HEROES[t.type];
  const wrap = t.s.abilities.length ? abilitySection(t) : h('div', { class:'abils' });
  let head = wrap.querySelector('.abils-head');
  if (!head){ head = h('div', { class:'abils-head' }); wrap.prepend(head); }
  head.textContent = 'Abilities';
  for (const lv of H.levels){
    if (!lv.ab || t.s.abilities.some(a => a.id === lv.ab)) continue;
    const L = heroAbilityLevel(t.type, lv.ab), s = heroStats(t.type, L), ab = s.abilities.find(a => a.id === lv.ab);
    const D = abilityDetails(ab, s);
    wrap.append(h('div', { class:'abil locked', style:'--ac:' + Art.abilityColor(ab) },
      iconCanvas(Art.abilityIcon(ab, 64)),
      h('div', { class:'abil-body' },
        h('div', { class:'abil-head' }, h('b', { text: D.name }), h('span', { class:'abil-st', text:'At level ' + L })),
        h('p', { text: D.text }))));
  }
  return wrap;
}
function heroBuyUI(t){
  t = t || UI.sel;
  if (!t || !t.hero) return;
  const H = HEROES[t.type];
  if (t.level >= HERO_MAX){ Sfx.play('error'); toast(H.name + ' is already a Master Chef.', ''); return; }
  const c = heroLevelCost(t);
  if (!canAfford(c)){ Sfx.play('error'); toast('Level ' + (t.level + 1) + ' costs ' + money(c) + '. Need ' + money(c - G.cash) + ' more.', 'warn'); return; }
  buyHeroLevel(t);
  updatePanel(true);
}

/* ---------------------------------------------------------------------
   Chef abilities in words, and what they would hit right now
   --------------------------------------------------------------------- */
const HERO_ABS = { flambe:1, wok:1, brainfreeze:1, bigchill:1, payday:1, opening:1, omakase:1, knifedance:1, sauce:1, mangia:1, tenderize:1, chop:1 };
function heroAbilityText(ab){
  const n = fmtN, sec = abSec, pct = v => Math.round(v * 100) + '%';
  switch (ab.id){
    case 'flambe': return 'A ring of flame bursts out around Chef Blaze: ' + n(ab.dmg) + ' damage to every pest in reach, then a burn of ' + n(ab.burn) + ' every 0.5s for ' + sec(ab.dur) + '. Even fire ants burn.';
    case 'wok': return 'A giant flaming wok drops onto the biggest crowd on the map: ' + n(ab.dmg) + ' damage to everything under it (' + n(ab.big) + ' to vehicles), then a burn of ' + n(ab.burn) + ' every 0.5s for ' + sec(ab.dur) + '.';
    case 'brainfreeze': {
      const k = perk('icebox') ? 1.15 : 1;
      return 'Freezes every pest ' + (ab.reach ? 'in a wide circle around Chef Gelato' : 'on the map') + ' for ' + sec(ab.dur * k) + '. Vehicles freeze for ' + sec(ab.bigDur * k) + ', bosses for ' + sec(ab.bigDur * 0.5 * k) + '. Snow fleas can’t be frozen.';
    }
    case 'bigchill': return 'For ' + sec(ab.dur) + ', every pest on the map, even ones that arrive later, moves ' + pct(ab.slow) + ' slower (vehicles ' + pct(ab.bigSlow) + ', bosses less) and takes ' + n(ab.vuln) + ' more damage from every hit.';
    case 'payday': { const live = G.active && !G.attract, v = Math.round(ab.cash + ab.per * (live ? G.round : 1)); return 'Instant cash: ' + money(v) + (live ? ' right now' : ' on round 1') + '. It pays ' + money(ab.per) + ' more for every round.'; }
    case 'opening': return 'Every appliance on the map attacks ' + ab.mult + '× as fast for ' + sec(ab.dur) + '.';
    case 'omakase': return 'Chef Kenji throws ' + n(ab.n) + ' golden chopsticks that seek out the toughest pests on the map: ' + n(ab.dmg) + ' damage each (' + n(ab.big) + ' to vehicles). They find ghosts and pierce any shell.';
    case 'knifedance': return 'Chef Kenji throws ' + ab.mult + '× as fast for ' + sec(ab.dur) + '.';
    case 'sauce': return 'Chef Nonna ladles tomato sauce onto ' + n(ab.n) + ' spots along the trail near her. For ' + sec(ab.dur) + ' it slows small pests ' + pct(1 - ab.slow) + ' (vehicles ' + pct(1 - ab.bigSlow) + ') and simmers everything in it for ' + n(ab.dmg) + ' every ' + sec(ab.tick) + '.';
    case 'mangia': return 'Every pest ' + (ab.reach ? 'in a wide circle around Chef Nonna' : 'on the map') + ' stops to eat for ' + sec(ab.dur) + ' (bosses for less). Vehicles slow down ' + pct(1 - ab.bigSlow) + ' instead.';
    case 'tenderize': return 'A meat mallet pounds the ' + n(ab.n) + ' toughest vehicles on the map (the toughest pests when no vehicle is about). For ' + sec(ab.dur) + ' they move ' + pct(1 - ab.slow) + ' slower and take ' + n(ab.vuln) + ' more damage from every hit.';
    case 'chop': return 'A giant cleaver falls on the toughest pest on the map: ' + n(ab.dmg) + ' damage, plus ' + pct(ab.boss) + ' of a boss’s health. Pests right beside it take ' + n(ab.dmg * 0.1) + '.';
  }
  return '';
}
function heroAbilityAim(t, ab, A){
  const onMap = () => G.enemies.filter(e => !e.dead && onScreen(e));
  switch (ab.id){
    case 'flambe': {
      const R = t.s.range * ab.reach;
      A.rings.push({ x: t.x, y: t.y, r: R });
      A.live = G.enemies.some(e => !e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= R);
      break;
    }
    case 'wok': {
      const spot = crowdSpot(ab.r);
      if (spot) A.rings.push({ x: spot.x, y: spot.y, r: ab.r }); else A.live = false;
      break;
    }
    case 'brainfreeze': {
      const cold = e => e.immune && e.immune.indexOf('cold') >= 0;
      if (ab.reach){
        const R = t.s.range * ab.reach;
        A.rings.push({ x: t.x, y: t.y, r: R });
        A.live = G.enemies.some(e => !e.dead && !cold(e) && Math.hypot(e.x - t.x, e.y - t.y) <= R);
      } else { A.screen = true; A.live = G.enemies.some(e => !e.dead && !cold(e)); }
      break;
    }
    case 'bigchill': A.screen = true; A.live = onMap().length > 0; break;
    case 'payday': A.gain = '+' + money(Math.round(ab.cash + ab.per * G.round)); break;
    case 'opening': A.towers = G.towers.slice(); A.live = onMap().length > 0; break;
    case 'omakase': {
      const L = heroTargets(t, true).sort((p, q) => toughness(q) - toughness(p));
      A.marks = L.slice(0, Math.min(16, ab.n)); A.live = L.length > 0;
      break;
    }
    case 'knifedance': A.towers = [t]; A.live = heroTargets(t, true).length > 0; break;
    case 'tenderize': {
      const pool = heroTargets(t, true), bigs = pool.filter(e => e.big);
      A.marks = (bigs.length ? bigs : pool).sort((p, q) => toughness(q) - toughness(p)).slice(0, ab.n); A.live = A.marks.length > 0;
      break;
    }
    case 'chop': {
      const pool = heroTargets(t, true);
      let tg = null; for (const e of pool) if (!tg || toughness(e) > toughness(tg)) tg = e;
      if (tg){ A.marks.push(tg); A.rings.push({ x: tg.x, y: tg.y, r: 60 }); } else A.live = false;
      break;
    }
    case 'sauce': {
      const pts = sauceSpots(t);
      for (let i = 0; i < ab.n && pts.length; i++){ const p = pts[Math.min(pts.length - 1, Math.floor((i + 0.5) / ab.n * pts.length))]; A.rings.push({ x: p.x, y: p.y, r: ab.r, soft: true }); }
      A.live = pts.length > 0 && (G.roundActive || onMap().length > 0);
      break;
    }
    case 'mangia': {
      if (ab.reach){
        const R = t.s.range * ab.reach;
        A.rings.push({ x: t.x, y: t.y, r: R });
        A.live = G.enemies.some(e => !e.dead && !(e.burrowT > 0) && Math.hypot(e.x - t.x, e.y - t.y) <= R);
      } else { A.screen = true; A.live = G.enemies.some(e => !e.dead && !(e.burrowT > 0)); }
      break;
    }
  }
  return A;
}

/* ---------------------------------------------------------------------
   The Chefs screen: hire, pick, and read every level
   --------------------------------------------------------------------- */
function buildChefs(){
  const body = $('#chefs-body');
  if (!body) return;
  body.innerHTML = '';
  $('#chefs-dough').replaceChildren(doughEl(Profile.dough));
  const lvl = chefLevel(Profile.chef.xp).level;
  body.append(h('p', { class:'chefs-lead', text:'Take one head chef into every game. They learn as you clear rounds, from level 1 to level 20, and pick up two abilities on the way. Level them up sooner with cash from their panel.' }));
  const grid = h('div', { class:'chefs-grid' });
  for (const id of HERO_ORDER){
    const H = HEROES[id], owned = heroOwned(id), picked = owned && heroPick() === id, U = H.unlock;
    const abs = H.levels.filter(L => L.ab).map(L => { const lv = heroAbilityLevel(id, L.ab), ab = heroStats(id, lv).abilities.find(a => a.id === L.ab); return { lv, ab }; });
    const status = picked ? h('span', { class:'cf-pill on', text:'In your kitchen' }) : owned ? h('span', { class:'cf-pill', text:'Hired' }) : h('span', { class:'cf-pill lock', text:'Not hired yet' });
    let acts;
    if (picked) acts = h('p', { class:'cf-note', text:'Waits above the shop in every game. Placing ' + H.name + ' costs ' + money(H.cost) + ' on Medium.' });
    else if (owned) acts = h('button', { class:'btn btn-small btn-primary', onclick: () => { setHeroPick(id); Sfx.play('click'); notify(H.name + ' will join your next games.', 'gold'); buildChefs(); } }, 'Take ' + H.name.replace('Chef ', '') + ' into games');
    else acts = h('div', { class:'cf-hire' },
      h('p', { class:'cf-note', text: 'Joins for free at chef level ' + U.level + ' (you are level ' + lvl + '), or hire now:' }),
      h('button', { class:'btn btn-small btn-gold', disabled: Profile.dough < U.dough, onclick: () => {
        if (hireHero(id)){
          Sfx.play('rank'); notify(H.name + ' joined your kitchen!', 'gold');
          for (const A of checkAchievements(true)) notify('Achievement: ' + A.name + '! +' + A.dough + ' Dough', 'gold');
          buildChefs(); refreshMenuDots();
        }
        else { Sfx.play('error'); notify('Not enough Dough: ' + H.name + ' costs ' + fmt(U.dough) + '.', 'warn'); }
      } }, 'Hire for ', doughEl(U.dough, 'sm')));
    const levels = h('ol', { class:'cf-levels' });
    for (let L = 2; L <= HERO_MAX; L++){ const lv = H.levels[L - 2]; levels.append(h('li', { class: (lv.ab ? 'lv-ab' : '') + (L === HERO_MAX ? ' top' : ''), value: String(L) }, h('b', { text: 'Level ' + L + (lv.ab ? ' · ability' : L === HERO_MAX ? ' · Master Chef' : '') }), ' ', lv.desc)); }
    grid.append(h('article', { class:'cf' + (picked ? ' picked' : '') + (owned ? '' : ' locked'), style:'--hc:' + H.color },
      h('div', { class:'cf-top' },
        h('div', { class:'cf-face' }, iconCanvas(Art.chefPortrait(id, 128))),
        h('div', { class:'cf-id' }, h('h3', { text: H.name }), h('div', { class:'cf-title', text: H.title + ' · ' + H.role }), status)),
      h('p', { class:'cf-blurb', text: H.blurb }),
      h('div', { class:'cf-abs' }, abs.map(({ lv, ab }) => h('div', { class:'cf-ab', style:'--ac:' + Art.abilityColor(ab), title: abilityDetails(ab, heroStats(id, lv)).text },
        iconCanvas(Art.abilityIcon(ab, 64)), h('span', {}, h('b', { text: ABILITIES[ab.id].name }), h('small', { text:'Level ' + lv }))))),
      acts,
      h('details', { class:'cf-more' }, h('summary', { text:'All 20 levels' }), levels)));
  }
  body.append(grid);
  /* everything owned has now been seen */
  let seen = false;
  for (const id of HERO_ORDER) if (heroOwned(id) && !Profile.heroes.seen[id]){ Profile.heroes.seen[id] = 1; seen = true; }
  if (seen){ saveProfile(); refreshMenuDots(); }
}
/* a dot on the Chefs button while a newly joined chef is waiting to be met */
function chefsDot(){ return HERO_ORDER.some(id => Profile.heroes.owned[id] && !Profile.heroes.seen[id]); }

/* ---------------------------------------------------------------------
   Hooks
   --------------------------------------------------------------------- */
function wireHeroHooks(){
  Hooks.heroLevel = (t, L) => {
    if (G.attract || UI.screen !== 'game') return;
    const H = HEROES[t.type], lv = H.levels[L - 2];
    if (L === HERO_MAX) toast(H.name + ' is a Master Chef! ' + lv.desc.replace(/^Master Chef: /, ''), 'gold');
    else if (lv.ab) toast(H.name + ' reached level ' + L + '. New ability: ' + ABILITIES[lv.ab].name + '!', 'gold');
    else toast(H.name + ' reached level ' + L + ': ' + lv.desc, 'info');
    Sfx.play(lv.ab || L === HERO_MAX ? 'rank' : 'upgrade');
    if (UI.sel === t) updatePanel(true);
  };
  Hooks.heroUnlock = id => {
    if (G.attract) return;
    notify(HEROES[id].name + ' joined your kitchen! Meet them in Chefs on the menu.', 'gold');
    Sfx.play('rank');
    refreshMenuDots();
  };
}
