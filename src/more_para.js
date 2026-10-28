'use strict';
/* =====================================================================
   Kitchen Siege — the second wave's paragons
     The Shadow Mandoline        shadow clones gather; Shadow Strike sends them all
     The Sheriff of Sauce        a bounty board of Wanted pests, and notches for High Noon
     The Philosopher’s Stockpot  the Philosopher’s Stone, fed by every pest it cooks
     The Automat                 its sentries power a grid that speeds up the appliances near it
     The Menagerie               the pack's appetite, and a frenzy when it is full
     The Abyssal Aquarium        the tide, rising and falling: high tide hits harder
   ===================================================================== */

/* ---------------------------------------------------------------------
   The Shadow Mandoline: a shadow clone joins it every few seconds of a round
   --------------------------------------------------------------------- */
function setClones(t, n){
  const S = t.sys;
  S.clones = n; S.on.clones = n > 0;
  for (const s of [t.base, t.s]) if (s && s.atk && s.atk.clones) s.atk.clones.count = Math.max(1, n);
}
PARA.mandoline = {
  init: () => ({ clones: 0, cloneT: 0 }),
  stats(t, s){ const S = t.sys; if (s.atk.clones) s.atk.clones.count = Math.max(1, S.clones); S.on.clones = S.clones > 0; },
  tick(t, dt){
    const S = t.sys, c = t.s && t.s.clones;
    if (!c || !G.roundActive) return;
    if (S.clones >= c.max){ S.cloneT = 0; return; }
    S.cloneT += dt;
    if (S.cloneT < c.every) return;
    S.cloneT = 0;
    setClones(t, S.clones + 1);
    if (G.vis && !lowFx()){
      const a = t.s.atk.clones, [ox, oy] = dronePos(t, a, S.clones - 1, G.time);
      for (let i = 0; i < 8; i++) part(t.x + ox, t.y + oy, rand(-40, 40), rand(-40, 40), 0.5, i % 2 ? '#3a3550' : '#8a83b8', 3.4, 'smoke');
    }
  },
  save: S => ({ c: S.clones }),
  load(S, d){ S.clones = clamp(Math.floor(+d.c || 0), 0, 20); },
};

/* ---------------------------------------------------------------------
   The Sheriff of Sauce: every Wanted pest brought in is a notch on its belt
   --------------------------------------------------------------------- */
const NOTCH_MAX = 20;
PARA.caddy = {
  init: () => ({ notches: 0 }),
  save: S => ({ n: S.notches }),
  load(S, d){ S.notches = clamp(Math.floor(+d.n || 0), 0, NOTCH_MAX); },
};

/* ---------------------------------------------------------------------
   The Philosopher’s Stockpot: the stone fills with every pest it cooks, and
   the lob after it is full turns everything around the toughest pest to gold
   --------------------------------------------------------------------- */
PARA.saucepan = {
  init: () => ({ stone: 0, ready: false }),
  tick(t){
    const S = t.sys, st = t.s && t.s.stone;
    if (!st || !S.ready || t.stunT > 0) return;
    const e = acquire(t, t.s.range, null, 'strong');
    if (!e) return;
    S.ready = false; S.stone = 0;
    const p = predictPos(e, 0.6), x = p.x, y = p.y;
    lobTo(t, { travel: 0.6, sprite:'stone' }, x, y);
    G.timers.push({ t: 0.6, fn: () => stoneBurst(t, x, y, st) });
    Hooks.sfx('thunk');
  },
  save: S => ({ s: Math.round(S.stone), r: S.ready ? 1 : 0 }),
  load(S, d){ S.stone = clamp(+d.s || 0, 0, 1000); S.ready = !!d.r; },
};
function stoneBurst(t, x, y, st){
  for (const e of query(x, y, st.r, QM1).slice()){
    if (e.dead || e.burrowT > 0) continue;
    if (e.boss) damage(e, e.maxHp * st.boss, 'normal', t, II_HIT);
    else if (e.big) damage(e, e.maxHp * st.big, 'normal', t, II_HIT);
    else {
      /* turned to gold: cooked on the spot, for triple cash */
      e.cashMul = Math.max(e.cashMul || 1, 3);
      damage(e, e.hp + 1, 'normal', t, II_HIT);
      if (!e.dead) kill(e, t);
    }
  }
  if (G.vis){
    G.fx.push({ k:'ring', x, y, r0: 10, r1: st.r, t:0, life:0.6, c:'#ffd166', w:7 });
    G.fx.push({ k:'boom', x, y, r: st.r * 0.6, t:0, life:0.5, c:'#fff1b0' });
    if (!lowFx()) for (let i = 0; i < 24; i++){ const a = rand(0, TAU), v = rand(40, 200); part(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.7, i % 3 ? '#ffd166' : '#fff8d6', 3.2, 'spark'); }
    G.shake = Math.max(G.shake, 0.3);
  }
  Hooks.sfx('cash');
}

/* ---------------------------------------------------------------------
   The Automat: every sentry it has running powers the grid, which speeds
   up every appliance within its range
   --------------------------------------------------------------------- */
PARA.bot = {
  init: () => ({ n: 0 }),
  tick(t){
    const S = t.sys, g = t.s && t.s.grid;
    let n = 0;
    for (const m of G.minions) if (m.tw === t && !m.mega) n++;
    S.n = n;
    G.grid = { t, r: t.s.range, mul: g ? 1 + g.per * Math.min(g.max, n) : 1 };
  },
};
function gridOn(o){ return !!(G.grid && G.grid.mul > 1 && o !== G.grid.t && G.towers.indexOf(G.grid.t) >= 0 && Math.hypot(o.x - G.grid.t.x, o.y - G.grid.t.y) <= G.grid.r + o.size); }

/* ---------------------------------------------------------------------
   The Menagerie: every pest the pets eat feeds the pack's appetite; a full
   belly sends them into a frenzy
   --------------------------------------------------------------------- */
PARA.pets = {
  init: () => ({ food: 0 }),
  save: S => ({ f: Math.round(S.food) }),
  load(S, d){ S.food = clamp(+d.f || 0, 0, 1000); },
};

/* ---------------------------------------------------------------------
   The Abyssal Aquarium: the tide rises through a round; at high tide its
   forks and tentacles hit half again as hard
   --------------------------------------------------------------------- */
const TIDE_ATKS = ['main', 'tentacle'];
PARA.lobster = {
  init: () => ({ tide: 0, high: false }),
  stats(t, s){
    if (!t.sys.high || !s.tide) return;
    const m = s.tide.mult;
    for (const id of TIDE_ATKS){
      const a = s.atk[id];
      if (!a) continue;
      if (a.dmg) a.dmg *= m;
      if (a.bonusBig) a.bonusBig *= m;
      if (a.burst){ a.burst.dmg *= m; if (a.burst.bonusBig) a.burst.bonusBig *= m; }
      if (a.grow) a.grow.max *= m;
    }
  },
  tick(t, dt){
    const S = t.sys, td = t.s && t.s.tide;
    if (!td || !G.roundActive) return;
    S.tide += dt;
    const period = td.every + td.high;
    if (S.tide >= period) S.tide -= period;
    const high = S.tide >= td.every;
    if (high === S.high) return;
    S.high = high;
    refreshTowers();
    if (G.vis && high){ G.fx.push({ k:'ring', x: t.x, y: t.y, r0: 10, r1: 160, t:0, life:0.7, c:'#7fd3ff', w:6 }); fxText(t.x, t.y - t.size - 14, 'HIGH TIDE', '#bfe9ff', 1, 13); }
  },
  save: S => ({ t: Math.round(S.tide * 10) / 10 }),
  load(S, d){ S.tide = clamp(+d.t || 0, 0, 100); },
};

/* ---------------------------------------------------------------------
   Hooks for the engine and the panel
   --------------------------------------------------------------------- */
function moreParaKill(e, tw){
  const w = e.wanted;
  if (w && w.sys && w.type === 'caddy' && w.sys.notches < NOTCH_MAX && G.towers.indexOf(w) >= 0) w.sys.notches++;
  if (tw && tw.sys && tw.type === 'pets' && tw.s.appetite && !tw.boost.frenzy){
    const ap = tw.s.appetite;
    tw.sys.food += e.big ? ap.big : 1;
    if (tw.sys.food >= ap.need){
      tw.sys.food = 0;
      tw.boost.frenzy = { mult: ap.mult, t: ap.dur };
      if (G.vis){ G.fx.push({ k:'ring', x: tw.x, y: tw.y, r0: 10, r1: 140, t:0, life:0.6, c:'#ffcf7a', w:6 }); fxText(tw.x, tw.y - tw.size - 14, 'FRENZY', '#ffcf7a', 1, 14); }
      Hooks.sfx('boom');
    }
  }
  if (tw && tw.sys && tw.type === 'saucepan' && tw.s.stone && !tw.sys.ready){
    tw.sys.stone += e.big ? 10 : 1;
    if (tw.sys.stone >= tw.s.stone.need){ tw.sys.stone = tw.s.stone.need; tw.sys.ready = true; }
  }
}
function runMoreParaAbility(t, ab){
  switch (ab.id){
    case 'smokebomb': {
      const list = pestsOnScreen();
      if (!list.length) return false;
      for (const e of list){
        e.camo = false;
        stunE(e, e.big ? ab.stun * 0.4 : ab.stun);
        setVuln(e, { amt: ab.vuln, dur: ab.dur });
      }
      if (G.vis){
        G.fx.push({ k:'flash', c:'rgba(60,55,80,0.35)', t:0, life:0.8 });
        if (!lowFx()) for (let i = 0; i < 26; i++){ const a = rand(0, TAU), v = rand(30, 160); part(t.x, t.y, Math.cos(a) * v, Math.sin(a) * v, 0.9, i % 2 ? '#4a4560' : '#9a94c0', 6, 'smoke'); }
      }
      Hooks.sfx('puff');
      return true;
    }
    case 'shadowstrike': {
      const S = t.sys;
      if (!S || S.clones <= 0) return false;
      const list = toughestN(S.clones, pestsOnScreen());
      if (!list.length) return false;
      const a = t.s.atk.clones, n = S.clones;
      for (let i = 0; i < n; i++){
        const e = list[i % list.length], [ox, oy] = a ? dronePos(t, a, i, G.time) : [0, 0];
        const x0 = t.x + ox, y0 = t.y + oy;
        G.timers.push({ t: 0.04 + i * 0.05, soft: true, fn: () => {
          if (e.dead) return;
          if (G.vis) G.fx.push({ k:'slash', x0, y0, x1: e.x, y1: e.y, t:0, life:0.35 });
          damage(e, ab.dmg, 'normal', t, II_HIT);
        } });
      }
      setClones(t, 0);
      Hooks.sfx('whoosh');
      return true;
    }
    case 'fanhammer': {
      if (!pestsOnScreen().length) return false;
      t.boost.fan = { mult: ab.mult, t: ab.dur };
      if (G.vis) G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1:120, t:0, life:0.5, c:'#ff7a1a', w:5 });
      Hooks.sfx('cork');
      return true;
    }
    case 'highnoon': {
      const S = t.sys;
      if (!S) return false;
      const on = pestsOnScreen();
      let list = on.filter(e => e.wanted === t);
      if (list.length < 6) list = list.concat(toughestN(6 - list.length, on.filter(e => e.wanted !== t)));
      if (!list.length) return false;
      const dmg = (ab.base + S.notches) * ab.per;
      list.forEach((e, i) => G.timers.push({ t: 0.25 + i * 0.07, soft: true, fn: () => {
        if (e.dead) return;
        if (G.vis){ G.fx.push({ k:'tracer', x1: t.x, y1: t.y - 10, x2: e.x, y2: e.y, t:0, life:0.25, c:'#ffd166' }); G.fx.push({ k:'pop', x: e.x, y: e.y, t:0, life:0.3 }); }
        damage(e, dmg, 'normal', t, II_HIT);
        if (!e.dead) stunE(e, 1);
        Hooks.sfx('cork');
      } }));
      S.notches = 0;
      if (G.vis){ G.fx.push({ k:'flash', c:'rgba(255,200,90,0.3)', t:0, life:0.6 }); G.fx.push({ k:'ring', x:t.x, y:t.y, r0:10, r1:300, t:0, life:0.6, c:'#ffd166', w:6 }); }
      return true;
    }
    case 'transmute': {
      const list = pestsOnScreen().filter(e => e.big);
      if (!list.length) return false;
      for (const e of list){
        if (e.boss) damage(e, e.maxHp * ab.boss, 'normal', t, II_HIT);
        else shrinkVehicle(e);
      }
      if (G.vis) G.fx.push({ k:'flash', c:'rgba(185,140,255,0.3)', t:0, life:0.6 });
      Hooks.sfx('splash');
      return true;
    }
    case 'elixir': {
      let any = false;
      for (const o of G.towers) if (o.s && Object.keys(o.s.atk).length && addTempBuff(o, 'elixir', ab.buff, ab.dur)) any = true;
      if (!any) return false;
      refreshTowers();
      if (G.vis){ G.fx.push({ k:'flash', c:'rgba(143,209,106,0.25)', t:0, life:0.6 }); for (const o of G.towers) G.fx.push({ k:'ring', x:o.x, y:o.y, r0:o.size * 0.6, r1:o.size + 18, t:0, life:0.5, c:'#8fd16a', w:3 }); }
      Hooks.sfx('splash');
      return true;
    }
    case 'overdrive': {
      let any = false;
      for (const o of G.towers){
        if (!o.s || !Object.keys(o.s.atk).length) continue;
        addTempBuff(o, 'clock', { speed: ab.mult }, ab.dur);
        o.ub = Math.min(10, (o.ub || 0) + 1);
        any = true;
        if (G.vis) G.fx.push({ k:'ring', x: o.x, y: o.y, r0: o.size * 0.6, r1: o.size + 20, t:0, life:0.5, c:'#7fd3ff', w:3 });
      }
      if (!any) return false;
      refreshTowers();
      if (G.vis) G.fx.push({ k:'flash', c:'rgba(127,211,255,0.25)', t:0, life:0.6 });
      Hooks.sfx('zap');
      return true;
    }
    case 'megabot': {
      /* a giant sentry beside the trail, near the front of the pack */
      let lead = null, bs = -Infinity;
      for (const e of G.enemies){ if (e.dead || !onScreen(e)) continue; const sc = score(e, t, 'first'); if (sc > bs){ bs = sc; lead = e; } }
      if (!lead) return false;
      let spot = null;
      const sd = Math.random() < 0.5 ? -1 : 1;
      for (const back of [-50, -90, -20, -150, 30]){ const q = pathPointAhead(lead, back); spot = besideTrail(q.x, q.y, q.ang, sd * 1.4); if (spot.ok) break; }
      const spec = { kind:'proj', range: 340, rate: ab.rate, dmg: 0, pierce: 1, speed: 540, size: 9, type:'normal', sprite:'rocket', homing: true, targetBig: true, lifeMul: 2,
        explode: { r: 70, dmg: ab.dmg, pierce: 40, type:'normal', bonusBig: ab.bonusBig, ignoreImmune: true } };
      finalizeAttack(spec, 0);
      G.minions.push({ x: spot.x, y: spot.y, x0: t.x, y0: t.y, tw: t, look:'mega', mega: true, spec, life: ab.dur, max: ab.dur, t: 0, cd: 0.6, ang: Math.atan2(lead.y - spot.y, lead.x - spot.x), fire: 0, id: G.nextId++ });
      if (G.vis) G.fx.push({ k:'ring', x: spot.x, y: spot.y, r0: 8, r1: 60, t: 0.3, life: 0.8, c:'#ffd166', w:5 });
      Hooks.sfx('place');
      return true;
    }
    case 'stampede': {
      const list = pestsOnScreen();
      if (!list.length) return false;
      /* the herd runs from the pantry back to the entrance, reaching each pest in turn */
      list.forEach(e => G.timers.push({ t: 0.05 + clamp(1 - e.d / Math.max(1, G.paths[e.path].len), 0, 1) * 1.1, soft: true, fn: () => {
        if (e.dead) return;
        damage(e, ab.dmg + (e.big ? ab.bonusBig : 0), 'normal', t, II_HIT);
        if (e.dead || e.boss) return;
        knockE(e, e.big ? ab.bigPush : ab.push);
        if (!e.big) stunE(e, 0.5);
      } }));
      if (G.vis){ G.paths.forEach((P, i) => G.fx.push({ k:'stampede', path: i, t:0, life:1.2, seed: Math.random() * 10 })); G.shake = Math.max(G.shake, 0.5); }
      Hooks.sfx('boom');
      return true;
    }
    case 'feast': {
      const on = pestsOnScreen();
      let list = toughestN(ab.n, on.filter(e => e.big && !e.boss));
      if (list.length < ab.n) list = list.concat(on.filter(e => e.boss).slice(0, ab.n - list.length));
      if (!list.length) return false;
      list.forEach((e, i) => {
        if (G.vis) G.fx.push({ k:'swoop', x: e.x, y: e.y, x0: t.x, y0: t.y, e, t: -i * 0.12, life: 0.9, look:'bird', big: true });
        G.timers.push({ t: 0.45 + i * 0.12, soft: true, fn: () => {
          if (e.dead) return;
          if (e.boss) damage(e, e.maxHp * ab.boss, 'normal', t, II_HIT);
          else { damage(e, e.hp + 1, 'normal', t, II_HIT); if (!e.dead) kill(e, t); }
        } });
      });
      Hooks.sfx('whoosh');
      return true;
    }
    case 'tsunami': {
      const list = pestsOnScreen();
      if (!list.length) return false;
      for (const e of list){
        damage(e, ab.dmg, 'normal', t, II_HIT);
        if (e.dead) continue;
        if (!e.boss) knockE(e, e.big ? ab.bigPush : ab.push);
        freezeE(e, { dur: ab.freeze, bigDur: ab.freeze * 0.5, ii: true }, t);
      }
      if (G.vis){ G.fx.push({ k:'rinse', t:0, life:1.1 }); G.fx.push({ k:'flash', c:'rgba(127,211,255,0.3)', t:0, life:0.7 }); G.shake = Math.max(G.shake, 0.4); }
      Hooks.sfx('splash');
      return true;
    }
    case 'kraken': {
      const on = pestsOnScreen();
      let list = toughestN(ab.n, on.filter(e => e.big && !e.boss));
      if (list.length < ab.n) list = list.concat(on.filter(e => e.boss).slice(0, ab.n - list.length));
      if (!list.length) return false;
      list.forEach((e, i) => {
        e.holdT = Math.max(e.holdT, 0.8);
        if (G.vis) G.fx.push({ k:'kraken', x: e.x, y: e.y, e, t: -i * 0.1, life: 1.1, seed: Math.random() * 10 });
        G.timers.push({ t: 0.7 + i * 0.1, soft: true, fn: () => {
          if (e.dead) return;
          if (e.boss) damage(e, e.maxHp * ab.boss, 'normal', t, II_HIT);
          else { damage(e, e.hp + 1, 'normal', t, II_HIT); if (!e.dead) kill(e, t); }
          if (G.vis){ G.fx.push({ k:'splash', x: e.x, y: e.y, r: e.r * 2, t:0, life:0.5, seed: Math.random() * 10 }); G.shake = Math.max(G.shake, 0.25); }
        } });
      });
      Hooks.sfx('hook');
      return true;
    }
  }
  return null;
}
function moreParaBar(t){
  const S = t.sys, s = t.s;
  switch (t.type){
    case 'mandoline': return { pips: true, n: S.clones, max: (s.clones && s.clones.max) || 6, c: '#8a83b8' };
    case 'caddy': return { v: S.notches / NOTCH_MAX, c: '#ffd166' };
    case 'saucepan': return { v: S.stone / ((s.stone && s.stone.need) || 150), c: S.ready ? '#fff1b0' : '#ffd166', txt: S.ready ? 'STONE' : null, tc: '#7a5410' };
    case 'bot': return { pips: true, n: Math.min(S.n, (s.grid && s.grid.max) || 12), max: (s.grid && s.grid.max) || 12, c: '#7fd3ff' };
    case 'pets': return t.boost.frenzy ? { v: t.boost.frenzy.t / ((s.appetite && s.appetite.dur) || 10), c: '#ff9a3d', txt: 'FRENZY', tc: '#ffcf7a' } : { v: S.food / ((s.appetite && s.appetite.need) || 100), c: '#ffcf7a' };
    case 'lobster': { const td = s.tide || { every: 10, high: 6 }; return S.high ? { v: 1 - (S.tide - td.every) / td.high, c: '#7fd3ff', txt: 'HIGH TIDE', tc: '#bfe9ff' } : { v: S.tide / td.every, c: '#4f86c6' }; }
  }
  return chessParaBar(t);
}
function moreParaUI(t){
  const S = t.sys, s = t.s, n = v => Math.round(v).toLocaleString();
  switch (t.type){
    case 'mandoline': {
      const c = s.clones || { every: 3, max: 6 }, ab = (s.abilities || []).find(x => x.id === 'shadowstrike');
      return { title:'Shadow clones', pips: { n: S.clones, max: c.max, c: '#8a83b8' },
        lines: ['A shadow clone joins it every ' + c.every + 's while a round is on, up to ' + c.max + '. Each one throws stars of its own.',
          'Shadow Strike sends every clone at the toughest pests on screen' + (ab ? ', ' + n(ab.dmg) + ' damage each' : '') + ', and the band starts gathering again.'] };
    }
    case 'caddy': {
      const r = s.atk.rifle, m = r && r.mark ? r.mark : { max: 6, mul: 2, cash: 5 }, ab = (s.abilities || []).find(x => x.id === 'highnoon');
      let wanted = 0;
      for (const e of G.enemies) if (!e.dead && e.wanted === t) wanted++;
      return { title:'Bounty board', meter: { v: S.notches / NOTCH_MAX, c: '#ffd166', text: S.notches + ' of ' + NOTCH_MAX + ' notches · ' + wanted + ' Wanted' },
        lines: ['Its golden rifle marks up to ' + m.max + ' pests as Wanted: they take ' + m.mul + '× damage from everything and pay ' + m.cash + '× cash when cooked.',
          'Every Wanted pest cooked carves a notch. High Noon spends them all: each Wanted pest takes ' + (ab ? n(ab.per) : '800') + ' for every notch, plus ' + (ab ? ab.base : 3) + ' more.'] };
    }
    case 'saucepan': {
      const st = s.stone || { need: 150, big: 0.25, boss: 0.04 };
      return { title:'Philosopher’s Stone', meter: { v: S.stone / st.need, c: S.ready ? '#fff1b0' : '#ffd166', text: S.ready ? 'Full: the next lob is the stone' : Math.floor(S.stone) + ' of ' + st.need },
        lines: ['Every pest it cooks feeds the stone (vehicles count as 10). When it is full, it lobs the stone at the toughest pest in range: every small pest nearby turns to gold, cooked on the spot for triple cash; vehicles lose ' + Math.round(st.big * 100) + '% of their health and bosses ' + Math.round(st.boss * 100) + '%.'] };
    }
    case 'bot': {
      const g = s.grid || { per: 0.025, max: 12 }, k = Math.min(g.max, S.n);
      let near = 0;
      for (const o of G.towers) if (o !== t && Math.hypot(o.x - t.x, o.y - t.y) <= s.range + o.size) near++;
      return { title:'Power grid', pips: { n: k, max: g.max, c: '#7fd3ff' },
        lines: ['Every sentry it has running powers the grid: the ' + near + ' appliance' + (near === 1 ? '' : 's') + ' in its range work ' + Math.round(g.per * 100) + '% faster for each one, up to ' + Math.round(g.per * g.max * 100) + '% with ' + g.max + '.',
          'Right now: ' + S.n + ' sentr' + (S.n === 1 ? 'y' : 'ies') + ', +' + Math.round(g.per * k * 100) + '% speed.'] };
    }
    case 'pets': {
      const ap = s.appetite || { need: 100, big: 10, dur: 10, mult: 2 };
      return { title:'Appetite', meter: t.boost.frenzy ? { v: t.boost.frenzy.t / ap.dur, c: '#ff9a3d', text: 'Frenzy · ' + Math.ceil(t.boost.frenzy.t) + 's' } : { v: S.food / ap.need, c: '#ffcf7a', text: Math.floor(S.food) + ' of ' + ap.need },
        lines: ['Every pest the pack cooks feeds its appetite (vehicles count as ' + ap.big + '). A full belly sends the pack into a frenzy: everything ' + ap.mult + '× as fast for ' + ap.dur + 's.'] };
    }
    case 'lobster': {
      const td = s.tide || { every: 10, high: 6, mult: 1.5 };
      return { title:'Tide', meter: S.high ? { v: 1 - (S.tide - td.every) / td.high, c: '#7fd3ff', text: 'High tide · ' + Math.ceil(td.every + td.high - S.tide) + 's' } : { v: S.tide / td.every, c: '#4f86c6', text: 'Rising · high tide in ' + Math.ceil(td.every - S.tide) + 's' },
        lines: ['The tide rises for ' + td.every + 's of every round, then stays high for ' + td.high + 's: at high tide its forks and tentacles hit ' + Math.round((td.mult - 1) * 100) + '% harder.'] };
    }
  }
  return chessParaUI(t);
}
