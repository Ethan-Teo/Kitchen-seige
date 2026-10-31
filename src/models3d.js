'use strict';
/* =====================================================================
   Kitchen Siege — the appliances as 3D models
   Each appliance's model is built in code with the 3D engine's builder
   (gl3d.js): boxes, rounded boxes, cylinders, balls, turned profiles,
   extruded outlines and tubes. A model follows its flat art: the same
   parts in the same places, the same upgrades showing (more knives, a saw,
   a gold trim...), standing up from the floor. Units are kitchen pixels,
   x to the right, y down the screen, z up; most models face +x.

   MODELS3D[look] = { build(B, c), key?(t, up, par), body?(t, up, par, skin) }
     c = { t, T, up, par, look, gold, lvl, flying }
   Parts that move get their pose from the appliance as it is drawn
   (anim(time, t)): spinning blades, a toast popping, a knife thrown.
   ===================================================================== */
const MODELS3D = (() => {
  const TAU = Math.PI * 2;
  const L3 = () => Art.look3d;
  /* ---------------- materials ---------------- */
  const STEEL = '#c9d2d6', STEEL_D = '#7f8b90', DARK = '#2a2f33', BLACK = '#1d2124', GOLD = '#f2c14e', GOLD_D = '#b8861b', WOOD = '#9a6a3a', WHITE = '#f4f6f6';
  function steel(B, c){ return B.color(c || STEEL).shine(0.8).glow(0); }
  function plastic(B, c){ return B.color(c).shine(0.3).glow(0); }
  function matte(B, c){ return B.color(c).shine(0.05).glow(0); }
  function gold(B){ return B.color(GOLD).shine(0.9).glow(0); }
  function lit(B, c, e){ return B.color(c).shine(0).glow(e == null ? 0.85 : e); }
  /* ---------------- small helpers ---------------- */
  const fired = (time, t) => t && t.fireAnim > 0;
  const ready = (time, t) => !(t && t.fireAnim > 0);
  /* a flat blade outline: from the heel at x = 0 to the tip at x = L, w wide */
  function bladePoly(L, w){ return [[0, -w / 2], [L * 0.72, -w * 0.42], [L, -w * 0.06], [L, w * 0.12], [0, w / 2]]; }
  /* a shape lying flat: extruded around its middle (thickness h) */
  function slab(B, poly, h){ B.push().at(0, 0, -h / 2).extrude(poly, h).pop(); return B; }
  /* a rod along x from x0 to x1 */
  function rodX(B, x0, x1, r, n){ B.tube([[x0, 0, 0], [x1, 0, 0]], r, n || 8); return B; }
  /* a screw head or a rivet on a surface facing up */
  function rivet(B, r){ B.cyl(r, r * 0.8, r * 0.5, 8); return B; }
  /* a round knob standing up (r, h), with a pointer line */
  function knob(B, r, h, c, mark){
    plastic(B, c || DARK); B.cyl(r, r * 0.92, h, 14);
    if (mark){ B.push().at(r * 0.45, 0, h + 0.02); B.color(mark).shine(0.2); B.flat([[-r * 0.4, -0.35], [r * 0.45, -0.35], [r * 0.45, 0.35], [-r * 0.4, 0.35]]); B.pop(); }
    return B;
  }
  /* a gold rim along the top edge of a rounded box */
  function goldRim(B, w, d, z, r){ B.push(); gold(B); B.hoop(rrPts(w + 0.3, d + 0.3, Math.min(r + 0.15, w / 2, d / 2), z - 0.35, 4), 0.62, 5); B.pop(); return B; }
  /* a star shape (n points) */
  function starPoly(r0, r1, n, a0){ const p = []; for (let i = 0; i < n * 2; i++){ const a = (a0 || -Math.PI / 2) + i / (n * 2) * TAU; const r = i % 2 ? r1 : r0; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }
  function circlePoly(r, n, ry){ const p = []; for (let i = 0; i < n; i++){ const a = i / n * TAU; p.push([Math.cos(a) * r, Math.sin(a) * (ry || r)]); } return p; }
  /* a spin that speeds up and slows down smoothly: the angle is kept on the appliance */
  function spinner(name, speed){
    return (time, t) => {
      if (!t) return;
      const g = t._g3 || (t._g3 = {});
      const last = g[name + 't'];
      const dt = last == null ? 0 : Math.max(0, Math.min(0.25, time - last));
      g[name + 't'] = time;
      g[name] = (g[name] || 0) + dt * (typeof speed === 'function' ? speed(t) : speed);
    };
  }
  const spun = (t, name) => (t && t._g3 && t._g3[name]) || 0;
  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  /* points round a rounded rectangle (w x d, corner radius r) at height z */
  function rrPts(w, d, r, z, seg){
    seg = seg || 4; const out = [];
    const cs = [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, Math.PI / 2], [-w / 2 + r, -d / 2 + r, Math.PI], [w / 2 - r, -d / 2 + r, Math.PI * 1.5]];
    for (const [cx, cy, a0] of cs) for (let i = 0; i <= seg; i++){ const a = a0 + i / seg * Math.PI / 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]); }
    return out;
  }
  /* the dark rubber foot plate an appliance stands on (its body then starts at z = 1) */
  function feet(B, w, d, r){ B.push(); matte(B, '#22272a'); B.rbox(w - 2.4, d - 2.4, 1.1, Math.max(0.5, (r || 3) - 1.2), 0); B.pop(); return B; }
  /* a turret's turn, relative to the body it sits on, so it points at the appliance's second aim */
  const aim2Turn = t => GL3D.turnFor(t && t.aim2 != null ? t.aim2 : -Math.PI / 2, 0) - ((t && t._g3rot) || 0);
  /* a part that keeps still while the body under it turns */
  const still = (time, t) => ({ rz: -((t && t._g3rot) || 0) });
  /* a puff of steam or smoke: rises and grows over a cycle, then starts again (k from 0 to 1) */
  const cycle = (time, speed, off) => ((time * speed + off) % 1 + 1) % 1;
  function puffs(B, n, x, y, z, rise, r, col, alpha, speed){
    for (let i = 0; i < n; i++){
      B.push().at(x, y, z);
      B.part((time, t) => { const k = cycle(time, speed || 0.7, i / n); return { x: Math.sin(time * 1.7 + i * 2.1) * 1.6, z: k * rise, s: 0.45 + k * 1.1 }; }, (time) => cycle(time, speed || 0.7, i / n) < 0.92);
      B.color(col || '#ffffff', alpha == null ? 0.42 : alpha).shine(0); B.sphere(r || 2.4, 10, 6);
      B.endPart();
      B.pop();
    }
    return B;
  }
  /* a flame: a teardrop of fire with a bright core, flickering */
  function flame(B, h, r, col, core, i){
    B.part(time => ({ sz: 0.82 + 0.26 * Math.sin(time * 12 + (i || 0) * 2.3), sx: 1 + 0.08 * Math.sin(time * 9 + (i || 0)), s: 1 }));
    lit(B, core || '#ffe08a', 0.9); B.color(core || '#ffe08a', 0.92);
    B.push().at(0, 0, 0.2).lathe([[0, 0], [r * 0.55, h * 0.12], [r * 0.5, h * 0.32], [r * 0.2, h * 0.55], [0, h * 0.68]], 8, { caps: false }).pop();
    lit(B, col || '#ff8a3d', 0.75); B.color(col || '#ff8a3d', 0.8);
    B.lathe([[0, 0], [r * 0.9, h * 0.12], [r, h * 0.3], [r * 0.6, h * 0.62], [r * 0.18, h * 0.88], [0, h]], 10, { caps: false });
    B.endPart();
    return B;
  }

  /* ---------------- Knife Block ---------------- */
  function knife(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const H = 13;
    /* the saw: a toothed blade spinning flat around the block */
    if (a >= 5 || par){
      B.push().at(-4, 0, 3.2);
      B.part(time => ({ rz: time * (par ? 3 : 1.2) }));
      steel(B, '#dce3e6'); slab(B, starPoly(23.5, 20.6, 24, 0), 0.9);
      steel(B, '#5c666b'); B.at(0, 0, -0.9).cyl(7, 7, 1.8, 16);
      B.color('#2e3437').at(0, 0, 1.8).cyl(2.2, 2.2, 0.6, 10);
      B.endPart();
      B.pop();
    }
    /* handles out of the back, rising at an angle */
    const nH = b >= 4 ? 7 : 5;
    for (let i = 0; i < nH; i++){
      const y = -10 + i * (20 / (nH - 1));
      B.push().at(-8, y, H - 1.5).rotY(0.78 - Math.PI / 2);
      if (b >= 5 || par) gold(B); else plastic(B, '#1f1f22');
      B.push().scale(1, 0.72, 1).capsule(1.8, 10.5, 12).pop();
      steel(B); B.push().at(1.55, 0, 4).sphere(0.5, 6, 4).pop(); B.push().at(1.55, 0, 7.5).sphere(0.5, 6, 4).pop();
      B.pop();
    }
    /* the block */
    B.body().shine(0.12); B.push().at(-1, 0, 0).rbox(26, 28, H, 6, 2.2).pop();
    if (c.gold) goldRim(B, 26, 28, H, 6);
    /* the slots on top */
    B.push().at(-1, 0, H + 0.03); matte(B, '#3a2410');
    for (let i = 0; i < 3; i++){ const x = -7.5 + i * 7; B.flat([[x - 1.5, -8], [x + 1.5, -8], [x + 1.5, 8], [x - 1.5, 8]]); }
    B.pop();
    /* stripes of a butcher's block */
    if (cc >= 5){
      for (let i = 0; i < 3; i++){ B.push().at(-1, 0, 3 + i * 3); matte(B, i % 2 ? WHITE : '#c9363a'); B.rbox(26.5, 28.5, 1.4, 6.2, 0); B.pop(); }
    }
    /* what is ready to throw, at the front */
    B.push().at(12, 0, 7.5);
    B.part(null, ready);
    if (a >= 4 && a < 5){
      /* a whirling glaive */
      steel(B, '#dfe7ea');
      const cres = [];
      for (let i = 0; i <= 10; i++){ const q = -1.3 + i / 10 * 2.6; cres.push([5 + Math.cos(q) * 9, Math.sin(q) * 9]); }
      for (let i = 10; i >= 0; i--){ const q = -1.2 + i / 10 * 2.4; cres.push([3 + Math.cos(q) * 6, Math.sin(q) * 6]); }
      slab(B, cres, 1);
    } else if (a === 3){
      /* a spinning star */
      B.push().at(6, 0, 0);
      B.part(time => ({ rz: time * 6 }));
      steel(B, '#dfe7ea'); slab(B, starPoly(7.5, 3, 6), 1.1);
      B.color('#8e9aa0'); B.at(0, 0, -0.8).cyl(1.6, 1.6, 1.6, 10);
      B.endPart();
      B.pop();
    } else {
      const n = b >= 3 ? 3 : 1;
      for (let i = 0; i < n; i++){
        B.push().rotZ((i - (n - 1) / 2) * 0.22);
        if (cc >= 3 && a < 3){
          /* a kebab: a skewer through three pieces */
          matte(B, '#9a6a3a'); rodX(B, 0, 18, 0.55, 6);
          ['#c9363a', '#7ab648', '#f2c14e'].forEach((col, k) => { B.push().at(6 + k * 5, 0, -1.9); plastic(B, col); B.rbox(3.8, 3.8, 3.8, 1.2, 0.8, 0.8); B.pop(); });
        } else {
          steel(B, b >= 5 ? '#ffe08a' : '#e4ebee'); slab(B, bladePoly(16, 4.4), 0.7);
          B.color('#9aa5aa').push().at(0.2, 0, -0.8).box(0.9, 4.6, 1.6).pop();
        }
        B.pop();
      }
    }
    B.endPart();
    B.pop();
    /* the cleaver lying in front */
    if (cc >= 4){
      B.push().at(-2, 17, 0.4).rotZ(0.08);
      steel(B, '#d9e0e3'); B.rbox(16, 9, 1, 1.5, 0.3);
      plastic(B, '#1f1f22'); B.push().at(-11, 0.5, 0.15).box(7, 3, 1.2).pop();
      B.pop();
    }
    return B;
  }

  /* ---------------- Toaster ---------------- */
  function toaster(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const H = 14, top = H + 1;
    feet(B, 24, 34, 8);
    B.body().shine(0.55); B.push().at(0, 0, 1).rbox(24, 34, H, 8, 3).pop();
    if (c.gold) goldRim(B, 24, 34, top, 8);
    /* a waffle grid pressed into the top */
    if (cc >= 3){
      B.push().at(0, 0, top + 0.02); B.body(0.7).shine(0.1);
      for (let y = -13; y <= 13; y += 5) B.flat(rect(-8.6, y - 0.4, 17.2, 0.8));
      for (let x = -8; x <= 8; x += 5) B.flat(rect(x - 0.4, -13.5, 0.8, 27));
      B.pop();
    }
    /* the slots, and what pops out of them */
    const bread = a >= 3 ? '#b97a3c' : b >= 3 ? '#d2a066' : '#e2b875';
    const bagel = b >= 3 && a < 3;
    for (const sy of [-7, 7]){
      B.push().at(1, sy, top + 0.05); matte(B, '#1c1c1e'); B.flat(rect(-7, -2.3, 14, 4.6)); B.pop();
      B.push().at(1, sy, top - 12);
      B.part((time, t) => ({ z: t && t.fireAnim > 0 ? 8.5 : 4.5 }), (time, t) => (t && t.fireAnim > 0) || ((time * 0.7 + sy) % 3 + 3) % 3 < 0.4);
      if (bagel){ matte(B, bread); B.push().at(0, 0, 8).rotX(Math.PI / 2).torus(3.8, 1.8, 16, 8).pop(); }
      else {
        matte(B, bread); B.rbox(12, 2, 12, 0.9, 2.6);
        B.push().at(0, 0, 0); matte(B, '#f3dcaa'); B.push().at(0, 1.02, 0).box(10, 0.04, 10.4).pop(); B.push().at(0, -1.02, 0).box(10, 0.04, 10.4).pop(); B.pop();
      }
      B.endPart();
      B.pop();
    }
    /* the lever at the back */
    B.push().at(-12, 0, 4); matte(B, '#1c1c1e'); B.box(1.2, 4, 9).pop();
    B.push().at(-14.2, 0, 8.5); plastic(B, '#1f1f22'); B.rbox(4.6, 7.5, 2.6, 1.2, 0.8).pop();
    /* a targeting ring out in front */
    if (b >= 5){
      B.push().at(19, 0, 10); lit(B, '#ff5a4e', 0.65);
      B.push().rotY(Math.PI / 2).torus(5, 0.55, 22, 6).pop();
      B.push().at(0, 0, -6.5).box(0.7, 0.7, 13).pop();
      B.push().at(0, 0, -0.35).box(0.7, 13, 0.7).pop();
      B.pop();
    }
    if (a >= 5 || par){ B.push().at(0, 0, 0.7); lit(B, '#ffd166', 0.55); B.torus(22, 0.7, 40, 6).pop(); }
    return B;
  }

  /* ---------------- Blender ---------------- */
  function blender(B, c){
    const [a, b, cc] = c.up, par = c.par;
    feet(B, 34, 34, 8);
    B.body().shine(0.35); B.push().at(0, 0, 1).rbox(34, 34, 9, 8, 2.5).pop();
    /* a dial and three buttons on the front */
    B.push().at(10, 17, 5.5).rotX(-Math.PI / 2); knob(B, 2.6, 1.4, '#c9d2d6', DARK); B.pop();
    ['#c9363a', '#7ab648', '#f2c14e'].forEach((col, i) => { B.push().at(-9 + i * 4.4, 17, 5.5).rotX(-Math.PI / 2); plastic(B, col); B.cyl(1.4, 1.2, 0.9, 10); B.pop(); });
    /* the collar the jug sits in */
    B.push().at(0, 0, 10); plastic(B, '#1d2124'); B.cyl(14.6, 14, 2.4, 24); B.pop();
    const J = 12.4, JH = 16.5;
    /* what's in the jug */
    const vortex = a >= 5 || par;
    const liq = vortex ? '#2a1640' : a >= 3 ? '#ff8c50' : cc >= 3 ? '#78beff' : null;
    if (liq){
      B.push().at(0, 0, J + 0.4); B.color(liq).shine(0.45).glow(vortex ? 0.15 : 0);
      B.lathe([[0, 0], [11.4, 0], [12.4, 5.5], [13.4, 12.8], [0, 12.8]], 24);
      B.pop();
    }
    /* the blades turning at the bottom (hidden in a full jug) */
    B.prep(spinner('blade', t => t.fireAnim > 0 ? 30 : 4));
    if (!liq){
      B.push().at(0, 0, J + 1.2);
      B.part((time, t) => ({ rz: spun(t, 'blade') }));
      steel(B, '#e4ebee');
      for (let i = 0; i < 4; i++){ B.push().rotZ(i * Math.PI / 2).rotX(i % 2 ? 0.35 : -0.35); slab(B, [[0, -1.3], [10.5, -2.6], [10.5, 0.8], [0, 1.3]], 0.5); B.pop(); }
      steel(B, '#5c666b'); B.push().at(0, 0, -1).cyl(2.4, 2.2, 2, 12).pop();
      B.endPart();
      B.pop();
    }
    /* swirls in the jug: white ripples, or the purple vortex */
    if (vortex || cc >= 3){
      B.push().at(0, 0, J + 13.4);
      B.part((time, t) => ({ rz: -spun(t, 'blade') * (vortex ? 1 : 0.5) }));
      if (vortex){ lit(B, '#be78ff', 0.8); for (let i = 0; i < 4; i++) B.torus(4 + i * 2.5, 0.45, 18, 5, 3.6, i); lit(B, '#000000', 0); B.disc(2.6, 14); }
      else { lit(B, '#ffffff', 0.4); for (let i = 0; i < 3; i++) B.torus(6 + i * 3, 0.35, 14, 4, 2, i * 2.1); }
      B.endPart();
      B.pop();
    }
    /* the glass jug, with a handle and a lid */
    const jar = vortex ? ['#5a3a7a', 0.35] : a >= 3 ? ['#ffb08a', 0.28] : cc >= 3 ? ['#9fd0ff', 0.3] : ['#c8ebff', 0.3];
    B.push().at(0, 0, J); B.color(jar[0], jar[1]).shine(0.9).glow(0);
    B.lathe([[11.8, 0], [12.8, 6], [14.2, JH], [14.6, JH + 0.6]], 26, { caps: false });
    B.pop();
    B.push().at(0, 0, J); plastic(B, '#2b3a44');
    B.tube([[13.2, 0, 3], [18.5, 0, 5], [19.5, 0, 11], [17, 0, 15], [14, 0, 15.5]], 1.3, 8);
    B.pop();
    /* a clear lid in a dark rim, its cap in the middle */
    B.push().at(0, 0, J + JH + 0.5); plastic(B, '#1d2124'); B.torus(14.4, 1, 30, 6);
    B.push().at(0, 0, 0.2); B.color('#dff4ff', 0.18).shine(1); B.cyl(14, 14, 0.4, 28); B.pop();
    plastic(B, '#1d2124'); B.cyl(4.2, 3.8, 2.2, 16);
    B.pop();
    /* little blades flying round it */
    if (b >= 1){
      const n = Math.min(8, 2 + b);
      B.push().at(0, 0, 17);
      B.part(time => ({ rz: time * 2 }));
      for (let i = 0; i < n; i++){
        const an = i / n * TAU;
        B.push().at(Math.cos(an) * 20.5, Math.sin(an) * 20.5, 0).rotZ(an);
        if (b >= 5) gold(B); else steel(B, '#dfe7ea');
        slab(B, [[-3, -2.1], [3.2, 0], [-3, 2.1], [-1.8, 0]], 0.7);
        B.pop();
      }
      B.endPart();
      B.pop();
    }
    return B;
  }

  /* ---------------- Grill ---------------- */
  function grill(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const hot = par || a >= 5 ? 2 : a >= 1 ? 1 : 0;
    /* three splayed legs */
    for (const an of [0, TAU / 3, -TAU / 3]){
      const x0 = Math.cos(an) * 9, y0 = Math.sin(an) * 9, x1 = Math.cos(an) * 15.5, y1 = Math.sin(an) * 15.5;
      matte(B, '#26292c'); B.tube([[x0, y0, 7.5], [x1, y1, 0.9]], 1.15, 8);
      B.push().at(x1, y1, 0); matte(B, '#111315'); B.cyl(1.9, 1.6, 1.2, 10); B.pop();
    }
    /* the kettle */
    B.body().shine(0.5);
    B.lathe([[0, 5], [6, 5.3], [11, 6.6], [15, 8.7], [17.8, 11.2], [19, 13.4, 1], [18.3, 14.1, 1], [17.2, 12.2]], 30, { caps: false });
    if (c.gold){ B.push().at(0, 0, 13.8); gold(B); B.torus(18.8, 0.75, 36, 6); B.pop(); }
    B.push().at(0, 0, 11.4); matte(B, '#1a1c1e'); B.disc(17.4, 28); B.pop();
    /* the coals, glowing */
    const coal = hot === 2 ? '#ffd28a' : hot === 1 ? '#ff8a30' : '#d8551e';
    B.push().at(0, 0, 11.6);
    B.part(time => ({ sz: 1 + 0.12 * Math.sin(time * 5) }));
    for (let i = 0; i < 10; i++){
      const an = i * 2.4, r = (i % 3) * 4.2 + 2.5;
      B.push().at(Math.cos(an) * r, Math.sin(an) * r, 0);
      lit(B, i % 3 ? coal : '#ff6a2a', 0.85); B.scale(1, 1, 0.7).sphere(2.6 + (i % 2) * 0.5, 10, 6);
      B.pop();
    }
    B.endPart();
    B.pop();
    /* the grate */
    steel(B, '#b8c2c6');
    for (let x = -12; x <= 12; x += 4){ const h2 = Math.sqrt(Math.max(0, 15.8 * 15.8 - x * x)); B.tube([[x, -h2, 13.4], [x, h2, 13.4]], 0.42, 6); }
    B.push().at(0, 0, 13.4); B.torus(15.9, 0.5, 30, 5); B.pop();
    /* the handle */
    B.push().at(18.6, 0, 12.6); steel(B, '#8e9aa0'); B.box(2.4, 3.4, 1.6); B.pop();
    B.push().at(19.4, 0, 13.4).rotY(Math.PI / 2); matte(B, '#5a3a1e'); B.capsule(1.7, 8.6, 10); B.pop();
    /* a branding iron lying across it */
    if (a >= 3 && !par){
      B.push().rotZ(-0.7).at(0, 0, 15);
      B.push().at(-30.5, 0, 0).rotY(Math.PI / 2); matte(B, '#5a3a1e'); B.capsule(1.6, 9.5, 10); B.pop();
      steel(B, '#6b777c'); B.tube([[-22, 0, 0], [0, 0, 0]], 0.55, 6);
      B.push().at(2.6, 0, -0.9); lit(B, a >= 5 ? '#ffe08a' : '#ff8a3d', 0.75); B.rbox(7, 8, 1.8, 1.4, 0.4); B.pop();
      B.pop();
    }
    /* flames over the grate */
    if (b >= 3){
      for (let i = 0; i < 3; i++){ B.push().at(-6 + i * 6, (i - 1) * 1.5, 13); flame(B, 11, 2.8, b >= 5 ? '#aa5cff' : '#ff8a3d', b >= 5 ? '#e7c8ff' : '#ffe08a', i); B.pop(); }
    }
    /* a smoker box with its chimney */
    if (cc >= 3){
      B.push().at(-21.5, -12, 0); matte(B, '#6b4a2a'); B.rbox(9, 16, 10, 1.6, 0.8);
      B.push().at(0, -4, 10); steel(B, '#5c666b'); B.cyl(1.6, 1.6, 6, 10); B.pop();
      puffs(B, 3, 0, -4, 16, 18, 2.6, '#d2d2d2', 0.35, 0.55);
      B.pop();
    }
    /* red hot: a ring of heat and rising sparks */
    if (hot === 2){
      B.push().at(0, 0, 0.6); B.part(time => ({ s: 1 + 0.05 * Math.sin(time * 4) })); lit(B, '#ff7a30', 0.7); B.torus(23, 0.8, 40, 6); B.endPart(); B.pop();
      for (let i = 0; i < 3; i++){
        B.push().at(0, 0, 14);
        B.part(time => { const k = cycle(time, 0.9, i / 3); return { x: Math.cos(i * 2 + time) * 7 * k, y: Math.sin(i * 2 + time) * 7 * k, z: k * 20, s: 1 - k * 0.7 }; });
        lit(B, '#ffc85a', 0.95); B.sphere(0.9, 6, 4);
        B.endPart();
        B.pop();
      }
    }
    return B;
  }

  /* ---------------- Freezer ---------------- */
  function freezer(B, c){
    const [a, b, cc] = c.up, par = c.par;
    feet(B, 34, 30, 6);
    B.body().shine(0.35); B.push().at(0, 0, 1).rbox(34, 30, 15, 6, 1.5).pop();
    /* the lid, a little wider, with frost on its corners */
    B.body(1.03).shine(0.45); B.push().at(0, 0, 16).rbox(34.8, 30.8, 3.4, 6.3, 1.6).pop();
    if (c.gold) goldRim(B, 34.8, 30.8, 19.4, 6.3);
    B.push().at(0, 0, 19.42); B.color('#a6dcf2').shine(0.6).glow(0.15);
    for (const [x, y, sx, sy] of [[-16, -14, 1, 1], [16, -14, -1, 1], [-16, 14, 1, -1], [16, 14, -1, -1]]) B.flat([[x + sx * 1.2, y + sy * 1.2], [x + sx * 8.5, y + sy * 1.2], [x + sx * 1.2, y + sy * 8.5]]);
    B.pop();
    /* a snowflake on the lid */
    B.push().at(0, -4, 19.46); B.color(a >= 4 || par ? '#2f8fd8' : '#7fb8d6').shine(0.2).glow(0.1);
    const w = a >= 4 ? 1.6 : 1.1;
    for (let i = 0; i < 3; i++){ B.push().rotZ(i * Math.PI / 3); B.flat(rect(-6.5, -w / 2, 13, w)); for (const s of [-1, 1]){ B.push().at(s * 4.4, 0).rotZ(s > 0 ? 0 : Math.PI); B.flat([[0, -w / 2], [1.8, -2.2], [2.4, -1.6], [0.8, 0.1]]); B.flat([[0, w / 2], [1.8, 2.2], [2.4, 1.6], [0.8, -0.1]]); B.pop(); } B.pop(); }
    B.pop();
    /* the handle on the front, under the lid */
    B.push().at(0, 15.6, 14.2); plastic(B, a >= 3 ? '#1f5f9e' : '#5aa6d6'); B.rbox(12, 2, 2.2, 0.9, 0.6); B.pop();
    B.push().at(0, 15.2, 6); matte(B, '#9fb4bc'); B.box(6, 0.4, 1.6); B.pop();
    /* the ice cannon on top, aiming on its own */
    if (b >= 1){
      B.push().at(0, 2, 19.4);
      B.part((time, t) => ({ rz: aim2Turn(t) }));
      plastic(B, '#c9e8f5'); B.cyl(5.5, 5, 2.2, 18);
      if (b >= 4){
        B.push().at(15, 0, 2.6); B.color('#9fd6f0').shine(0.6); B.rbox(22, 10, 6, 3, 1.4); B.pop();
        B.push().at(26, 0, 5.6); lit(B, '#e8f8ff', 0.6); B.sphere(4, 14, 8); B.pop();
      } else {
        B.push().at(15, 0, 2.2); B.color('#d7f0fb').shine(0.5); B.rbox(14, 12, 6, 2, 1); B.pop();
        B.push().at(15, 0, 8.25); matte(B, '#6aa9c6'); B.flat(rect(-0.4, -5.5, 0.8, 11)); B.flat(rect(-6.5, -0.4, 13, 0.8)); B.pop();
      }
      B.endPart();
      B.pop();
    }
    /* ice crystals drifting round it */
    if (cc >= 2){
      for (let i = 0; i < 5; i++){
        B.push();
        B.part(time => { const an = time * 0.8 + i * TAU / 5, r = 22 + Math.sin(time * 2 + i) * 3; return { x: Math.cos(an) * r, y: Math.sin(an) * r, z: 9 + Math.sin(time * 1.6 + i) * 3, rz: time * 2 + i }; });
        B.color('#ffffff').shine(0.9).glow(0.35); B.push().scale(1, 1, 1.5).sphere(1.5, 4, 2).pop();
        B.endPart();
        B.pop();
      }
    }
    return B;
  }

  /* ---------------- Microwave (its door faces the way it aims) ---------------- */
  function micro(B, c){
    const [a, b, cc] = c.up, par = c.par;
    feet(B, 32, 30, 4);
    B.body().shine(0.4); B.push().at(0, 0, 1).rbox(32, 30, 15, 4, 1.6).pop();
    if (c.gold) goldRim(B, 32, 30, 16, 4);
    /* vents on top */
    B.push().at(-6, 0, 16.03); B.body(0.72).shine(0.1); for (let i = 0; i < 5; i++) B.flat(rect(-6 + i * 3, -10, 1.2, 20)); B.pop();
    /* the door on the front: a window that glows while it cooks, and the handle */
    const gc = a >= 5 || par ? '#7fe9ff' : '#ff9f6b';
    B.push().at(16, 4, 8.5).rotY(Math.PI / 2);
    B.body(0.82).shine(0.3); B.rbox(12.8, 19, 0.8, 1.6, 0.3);
    B.push().at(0, 0, 0.82);
    B.part(null, (time, t) => !(t && (t.fireAnim > 0 || (a >= 3 && t.fireAnim > -0.3)))); B.color('#22303a').shine(0.9).glow(0); B.flat(rect(-5, -7.6, 10, 15.2)); B.endPart();
    B.part(null, (time, t) => !!(t && (t.fireAnim > 0 || (a >= 3 && t.fireAnim > -0.3)))); lit(B, gc, 0.8); B.flat(rect(-5, -7.6, 10, 15.2)); B.endPart();
    B.pop();
    B.pop();
    B.push().at(17.3, -4, 8.5); steel(B, '#dfe7ea'); B.push().at(0, 0, -5).box(1.2, 1.4, 10).pop(); B.pop();
    /* the control panel: a clock and buttons */
    B.push().at(16.05, -10.5, 8.5).rotY(Math.PI / 2);
    matte(B, '#2a2f33'); B.flat(rect(-6, -3.5, 12, 7));
    B.push().at(-3.6, 0, 0.03); lit(B, '#7ee07a', 0.7); B.flat(rect(-1.4, -2.4, 2.8, 4.8)); B.pop();
    B.push().at(0, 0, 0.05); B.color('#c9d2d6').shine(0.3).glow(0);
    for (let i = 0; i < 6; i++) B.flat(rect(0.4 + Math.floor(i / 2) * 1.9, -2.3 + (i % 2) * 2.6, 1.3, 1.6));
    B.pop();
    B.pop();
    /* a bucket of popcorn on top */
    if (b >= 1){
      B.push().at(-6, 5, 16);
      for (let i = 0; i < 12; i++){
        const a0 = i / 12 * TAU, a1 = (i + 1) / 12 * TAU;
        B.color(i % 2 ? '#ffffff' : '#e2383f').shine(0.2).glow(0);
        B.lathe([[4, 0], [5.6, 8]], 2, { arc: a1 - a0, a0, caps: false });
      }
      B.push(); matte(B, '#f2f2ee'); B.disc(4, 12); B.pop();
      if (b >= 3){
        B.color(b >= 4 ? '#e8a23c' : '#fff6da').shine(0.15).glow(0);
        for (let i = 0; i < 9; i++){ const an = i * 2.4, r = i ? 2.6 + (i % 2) * 1.6 : 0; B.push().at(Math.cos(an) * r, Math.sin(an) * r, 8 + (i % 3) * 0.6 + (i ? 0 : 1.4)).sphere(1.7, 8, 5).pop(); }
      }
      B.pop();
    }
    /* an antenna */
    if (cc >= 1){
      B.push().at(-12, -11, 16); steel(B, '#5c666b'); B.tube([[0, 0, 0], [-2, -3, 10]], 0.5, 6);
      B.push().at(-2, -3, 10.6); if (cc >= 4) lit(B, '#7fe9ff', 0.8); else plastic(B, '#ff5a4e'); B.sphere(1.8, 10, 6); B.pop();
      B.pop();
    }
    if (cc >= 4){ lit(B, '#7fe9ff', 0.75); for (const z of [1.2, 15.4]) B.hoop(rrPts(33, 31, 4.4, z, 4), 0.5, 6); }
    return B;
  }

  /* ---------------- Soda Siphon ---------------- */
  function siphon(B, c){
    const [a, b, cc] = c.up, par = c.par;
    /* the gas cartridges standing at the back */
    const cart = b >= 5 ? 3 : b >= 3 ? 2 : 1;
    for (let i = 0; i < cart; i++){ B.push().at(-13.8 - i * 4.6, -10 + i * 2.4, 0); steel(B, '#d9e0e3'); B.capsule(2.4, 11, 12); B.pop(); }
    /* the bottle */
    B.body().shine(0.75);
    B.lathe([[9.5, 0], [10.8, 0.6], [11.4, 2], [11.4, 15.5], [10.4, 18.2], [7.5, 20.4], [6.4, 21]], 26);
    B.push().at(0, 0, 2.5); B.body(0.82).shine(0.4); B.torus(11.6, 0.6, 26, 5); B.at(0, 0, 11.5).torus(11.6, 0.6, 26, 5); B.pop();
    /* the head, its spout and lever */
    B.push().at(0, 0, 20.6);
    if (a >= 5 || par) gold(B); else steel(B);
    B.cyl(7, 6.4, 3.4, 20); B.at(0, 0, 3.4).dome(6.4, 18, 4);
    B.pop();
    const nl = a >= 4 ? 22 : a >= 2 ? 19 : 16;
    steel(B); B.tube([[4, 0, 22.4], [nl - 3, 0, 22.4], [nl, 0, 21.4]], 1.7, 10);
    if (a >= 2){ B.push().at(nl + 0.6, 0, 21.2).rotY(Math.PI / 2); matte(B, '#c99a5c'); B.cyl(2.4, 2, 4.6, 12); B.pop(); }
    steel(B, '#aab4b8'); B.tube([[-1, 0, 25], [-8, 0, 27], [-13, 0, 24.5]], 1, 8);
    /* bubbles drifting round it */
    if (cc >= 1){
      for (let i = 0; i < 3; i++){
        B.push();
        B.part(time => { const an = time + i * 2.1; return { x: Math.cos(an) * 20, y: Math.sin(an) * 20, z: 9 + Math.sin(time * 2 + i) * 2.5 }; });
        B.color('#bff0ff', 0.45).shine(1); B.sphere(2.4, 12, 8);
        B.endPart();
        B.pop();
      }
    }
    /* a crate of bottles beside it, standing still while it turns */
    if (cc >= 4){
      B.part(still);
      B.push().at(16, 13, 0); matte(B, '#a57d55'); B.rbox(12, 10, 5.5, 1, 0.4);
      B.push().at(0, 0, 5.52); matte(B, '#6f5234'); B.flat(rect(-6, -0.3, 12, 0.6)); B.pop();
      for (let i = 0; i < 4; i++){ B.push().at(-3 + (i % 2) * 6, -2.4 + Math.floor(i / 2) * 4.8, 4); B.color('#5aa66a').shine(0.7); B.cyl(1.6, 1.6, 4, 10); B.at(0, 0, 4).cyl(1.6, 0.7, 1.6, 10); B.pop(); }
      B.pop();
      B.endPart();
    }
    return B;
  }

  /* ---------------- Dishwasher (faces the viewer until it aims) ---------------- */
  function dish(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const H = 11, top = H + 1;
    feet(B, 36, 36, 6);
    B.body().shine(0.45); B.push().at(0, 0, 1).rbox(36, 36, H, 6, 2).pop();
    if (c.gold) goldRim(B, 36, 36, top, 6);
    /* the control strip on the front, its lights */
    B.push().at(0, 18.05, 8).rotX(-Math.PI / 2);
    matte(B, '#2a2f33'); B.flat(rect(-14, -2.4, 28, 4.8));
    B.push().at(0, 0, 0.04);
    for (let i = 0; i < 3; i++){
      B.push().at(-8 + i * 5, 0);
      if (i === 1){ B.part(null, (time, t) => !!(t && t.fireAnim > 0)); lit(B, '#ffd166', 0.8); B.disc(1.1, 10); B.endPart(); B.part(null, (time, t) => !(t && t.fireAnim > 0)); matte(B, '#8e9aa0'); B.disc(1.1, 10); B.endPart(); }
      else { if (i === 0) lit(B, '#7ee07a', 0.8); else matte(B, '#8e9aa0'); B.disc(1.1, 10); }
      B.pop();
    }
    B.pop();
    B.pop();
    B.push().at(0, 18.2, 4.5); steel(B, '#dfe7ea'); B.box(20, 1.2, 1.4); B.pop();
    /* the porthole on top, its spray arm turning under the glass */
    B.prep(spinner('arm', t => t.fireAnim > 0 ? 27 : 3.6));
    B.push().at(0, -2, top);
    steel(B, '#aeb8bd'); B.torus(11.8, 0.9, 30, 6);
    matte(B, cc >= 3 ? '#8a6a9a' : '#2e4856'); B.at(0, 0, -0.6).disc(11.6, 30);
    B.part((time, t) => ({ rz: spun(t, 'arm') }));
    B.at(0, 0, 0.1); steel(B, '#e4ebee'); B.rbox(20, 3.4, 0.9, 1.7, 0.3);
    for (const sd of [-1, 1]){ B.push().at(sd * 8, 0, 0.92); lit(B, '#7fd3ff', 0.6); B.disc(1.1, 10); B.pop(); }
    B.endPart();
    steel(B, '#6b777c'); B.cyl(2.3, 2.1, 1.2, 12);
    B.push().at(0, 0, 1.4); B.color('#bfe9ff', 0.22).shine(1); B.cyl(11.4, 11.4, 0.4, 30); B.pop();
    B.pop();
    /* plates standing in the rack */
    const kind = a >= 5 ? 'silver' : a >= 3 ? 'platter' : 'plate';
    const np = a >= 4 ? 3 : a >= 1 ? 2 : 1;
    const pr = kind === 'plate' ? 5 : 6.5;
    for (let i = 0; i < np; i++){
      B.push().at(12.5 - i * 2.4, -12.5, top + pr - 0.6).rotZ(0.6).rotX(Math.PI / 2);
      B.color(kind === 'silver' ? '#dfe7ea' : '#ffffff').shine(kind === 'silver' ? 0.9 : 0.5);
      B.push().at(0, 0, -0.45).lathe([[0, 0], [pr * 0.62, 0], [pr, 0.7], [pr, 1], [pr * 0.6, 0.4], [0, 0.4]], 22).pop();
      if (kind === 'platter'){ B.push().at(0, 0, -0.45 + 0.75); B.color('#4f86c6').shine(0.4); B.annulus(pr * 0.76, pr * 0.9, 22); B.pop(); }
      B.pop();
    }
    if (a >= 5 || par){ B.push().at(13, -9, top); steel(B, '#dfe7ea'); B.dome(6, 18, 6); B.at(0, 0, 6).sphere(1.4, 8, 5); B.pop(); }
    /* bubbles round it */
    if (cc >= 1){
      const n = cc >= 5 ? 8 : cc >= 3 ? 5 : 3;
      for (let i = 0; i < n; i++){
        B.push();
        B.part(time => { const an = time * 0.9 + i * TAU / n, r = 21 + Math.sin(time * 2.2 + i) * 3; return { x: Math.cos(an) * r, y: Math.sin(an) * r, z: 8 + Math.sin(time * 1.7 + i) * 3 }; });
        B.color(cc >= 5 ? ['#ffb3d9', '#b3e6ff', '#d9ffb3', '#fff0b3'][i % 4] : '#c8f0ff', 0.5).shine(1); B.sphere(2.2 + (i % 3) * 0.7, 12, 8);
        B.endPart();
        B.pop();
      }
    }
    /* a bottle of soap at its side */
    if (cc >= 2){ B.push().at(-17.5, 11.5, 0); plastic(B, '#f2a7c8'); B.rbox(7, 7, 10, 2.4, 1.6); B.at(0, 0, 10).cyl(1.6, 1.4, 2.4, 10); B.pop(); }
    /* the sprayer turret, aiming on its own */
    if (b >= 1){
      const L = b >= 5 ? 26 : b >= 3 ? 22 : 18;
      B.push().at(0, -2, top + 1.6);
      B.part((time, t) => ({ rz: aim2Turn(t) }));
      if (b >= 3){ plastic(B, '#f2c14e'); B.push().at(1.5, 0, -1).rbox(9, 10, 4.6, 2.5, 1.2).pop(); }
      if (b >= 5){ B.push().at(-2, 0, 1.6).rotY(Math.PI / 2); plastic(B, '#e2383f'); B.cyl(6, 6, 2.4, 20); B.at(0, 0, 2.4); B.color('#ffffff'); B.disc(2.2, 12); B.pop(); }
      matte(B, '#4b565b'); B.push().at(2, 0, 1.4).rotY(Math.PI / 2).cyl(2.4, 2.2, L - 2, 12).pop();
      B.push().at(L, 0, 1.4).rotY(Math.PI / 2); plastic(B, '#f2c14e'); B.cyl(3.4, 2.6, 5, 12); B.pop();
      B.endPart();
      B.pop();
    }
    return B;
  }

  /* ---------------- Deep Fryer (faces the viewer until it aims) ---------------- */
  function fryer(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const inferno = a >= 5 || par;
    const H = 14, top = H + 1;
    feet(B, 38, 35, 6);
    B.body().shine(0.55); B.push().at(0, -0.5, 1).rbox(38, 35, H, 6, 2).pop();
    if (c.gold) goldRim(B, 38, 35, top, 6);
    /* the vat of oil */
    B.push().at(0, -1.5, top);
    matte(B, '#4b565b'); B.push().at(0, 0, -0.01).rbox(32, 23, 0.35, 4, 0.1).pop();
    B.color(inferno ? '#ee9a2a' : a >= 3 ? '#eab042' : '#f0c862').shine(0.95).glow(0.25); B.push().at(0, 0, -0.4).rbox(29, 20, 0.9, 3, 0).pop();
    const nb = inferno ? 11 : a >= 3 ? 8 : 5;
    for (let i = 0; i < nb; i++){
      B.push().at(-12 + ((i * 7.3) % 24), 6 - ((i * 5.1) % 15), 0.4);
      B.part(time => { const k = cycle(time, 0.8 + (i % 3) * 0.3, i * 0.37); return { s: 0.4 + k * 1.1, z: k * 0.6 }; });
      B.color('#fff6ce', 0.75).shine(1).glow(0.3); B.push().scale(1, 1, 0.6).sphere(1.2, 8, 4).pop();
      B.endPart();
      B.pop();
    }
    B.pop();
    /* the basket: down in the oil, or lifted out full of fries */
    const lift = b >= 3;
    B.push().at(-3, -3, top);
    B.part((time, t) => ({ z: lift && !(t && t.fire2 > 0) ? 6 : -1 }));
    const wire = '#3a4246';
    matte(B, wire);
    B.hoop([[-8, -6.5, 5], [8, -6.5, 5], [8, 6.5, 5], [-8, 6.5, 5]], 0.5, 5);
    B.hoop([[-8, -6.5, 0], [8, -6.5, 0], [8, 6.5, 0], [-8, 6.5, 0]], 0.45, 5);
    for (let k = -4.8; k <= 4.8; k += 3.2){ B.tube([[k, -6.5, 0], [k, 6.5, 0]], 0.3, 4); B.tube([[k, -6.5, 0], [k, -6.5, 5]], 0.3, 4); B.tube([[k, 6.5, 0], [k, 6.5, 5]], 0.3, 4); }
    for (let k = -3.2; k <= 3.2; k += 3.2){ B.tube([[-8, k, 0], [8, k, 0]], 0.3, 4); B.tube([[-8, k, 0], [-8, k, 5]], 0.3, 4); B.tube([[8, k, 0], [8, k, 5]], 0.3, 4); }
    if (lift){
      B.color(b >= 5 ? '#e8a23c' : '#f2c14e').shine(0.2).glow(0.05);
      for (let i = 0; i < 9; i++){ B.push().at(-5 + (i % 3) * 5, -3.5 + Math.floor(i / 3) * 3.5, 2.6 + (i % 2)).rotZ(i * 0.9).rotY(0.3 * ((i % 3) - 1)); B.at(-3.2, 0, 0).rotY(Math.PI / 2).box(1.4, 1.4, 6.4); B.pop(); }
    }
    /* its handle, out to the front */
    steel(B, '#9aa6ab'); B.tube([[6, 6, 5], [12, 14, 6], [14, 18, 5.5]], 0.7, 6);
    B.push().at(14, 18, 5.5).rotZ(0.9).rotY(Math.PI / 2); plastic(B, '#1f1f22'); B.capsule(1.6, 8, 10); B.pop();
    B.endPart();
    B.pop();
    /* knobs and a light on the front */
    B.push().at(-14, 17.05, 7).rotX(-Math.PI / 2);
    B.part(null, time => Math.sin(time * 3) > -0.3); lit(B, '#ff5a4e', 0.8); B.cyl(1.4, 1.4, 0.6, 10); B.endPart();
    B.part(null, time => Math.sin(time * 3) <= -0.3); plastic(B, '#8e2a24'); B.cyl(1.4, 1.4, 0.6, 10); B.endPart();
    B.pop();
    B.push().at(-8, 17.05, 7).rotX(-Math.PI / 2).rotZ(-1 + a * 0.4 + Math.PI / 2); knob(B, 2.2, 1.6, DARK, '#e8eef0'); B.pop();
    /* inferno: flames licking up the front */
    if (inferno) for (let i = 0; i < 6; i++){ B.push().at(-15 + i * 6, 16.6, 0.4); flame(B, 7 + (i % 2) * 2, 2.6, i % 2 ? '#ffc850' : '#ff8030', '#fff3b0', i); B.pop(); }
    /* the treat at its side */
    if (cc >= 1){
      B.push().at(-25, 2, 0);
      if (cc >= 5){
        matte(B, '#e8b96a'); B.cyl(8, 7.6, 1.6, 22);
        B.push().at(0, 0, 1.6); matte(B, '#b8803a'); for (let i = 0; i < 5; i++) B.push().at(Math.cos(i * 1.3) * 3, Math.sin(i * 1.3) * 3, 0).torus(3, 0.6, 12, 4, 4, i).pop(); B.pop();
        B.push().at(0, 0, 1.9); matte(B, '#ffffff'); for (let i = 0; i < 6; i++) B.push().at(Math.cos(i) * 5, Math.sin(i * 1.7) * 5, 0).sphere(0.6, 5, 3).pop(); B.pop();
      } else if (cc >= 4){
        for (let i = 0; i < 3; i++){ B.push().at(0, 4, 1.6).rotZ(-0.4 + i * 0.4).rotX(-0.15).at(0, 7, 0).rotX(Math.PI / 2); matte(B, '#c98a45'); B.cyl(1.6, 1.6, 14, 8, { flat: true, a0: 0.2 }); B.pop(); }
      } else if (cc >= 3){
        matte(B, '#d9a066'); B.push().at(0, 0, 1.7).scale(1, 1, 0.7).torus(4.2, 2.4, 20, 10).pop();
        B.push().at(0, 0, 2.5); B.color('#f29ac0').shine(0.5); B.push().scale(1, 1, 0.6).torus(4.2, 2.1, 20, 8).pop(); B.pop();
        for (let i = 0; i < 5; i++){ B.push().at(Math.cos(i * 1.4) * 4.2, Math.sin(i * 1.4) * 4.2, 3.75).rotZ(i); B.color(['#7ee07a', '#ffd166', '#5aa6d6'][i % 3]); B.box(1.4, 0.6, 0.5); B.pop(); }
      } else {
        B.color('#f2c14e').shine(0.2); for (let i = 0; i < 5; i++){ B.push().at(-4 + i * 2, (i % 2) * 1.2 - 0.6, 4).rotX((i % 2 ? 0.2 : -0.2)).box(1.6, 1.6, 9).pop(); }
        plastic(B, '#e2383f'); B.lathe([[4, 0, 1], [5.2, 7, 1]], 4, { a0: Math.PI / 4, caps: true });
        B.push().at(0, 4.2, 3.6).rotX(-Math.PI / 2 + 0.12); lit(B, '#ffd166', 0.3); B.flat(rect(-1.5, -1.5, 3, 3)); B.pop();
      }
      B.pop();
    }
    return B;
  }

  /* ---------------- Pizza Oven (faces the viewer until it aims) ---------------- */
  function pizzaTop(B, r, big){
    matte(B, '#e0a956'); B.cyl(r, r * 0.96, 1.1, 22);
    B.push().at(0, 0, 1.1); matte(B, '#d9462e'); B.cyl(r * 0.8, r * 0.8, 0.25, 20);
    B.at(0, 0, 0.25); B.color('#f6d66b').shine(0.35); B.cyl(r * 0.72, r * 0.7, 0.3, 20);
    const n = big ? 7 : 4;
    B.at(0, 0, 0.3); matte(B, '#b8322a');
    for (let i = 0; i < n; i++){ const an = i / n * TAU + 0.4, rr2 = r * (i % 2 ? 0.42 : 0.5); B.push().at(Math.cos(an) * rr2, Math.sin(an) * rr2, 0).cyl(r * 0.13, r * 0.13, 0.25, 10).pop(); }
    B.push().at(r * 0.1, -r * 0.12, 0.25); matte(B, '#4a8c3a'); B.push().scale(1.4, 0.8, 0.4).sphere(r * 0.08, 6, 3).pop(); B.pop();
    B.pop();
    return B;
  }
  function oven(B, c){
    const [a, b, cc] = c.up, par = c.par;
    /* the stone hearth */
    B.push().at(0, 0.5, 0); matte(B, '#9aa0a4'); B.rbox(42, 39, 6, 6, 1.5); B.pop();
    /* logs stacked at its side */
    if (b >= 2){
      for (let i = 0; i < 3; i++){
        B.push().at(-25, -11.8 + i * 5, 6 + 2.2 + (i === 1 ? 0 : 0)).rotY(Math.PI / 2);
        matte(B, '#8a5a2b'); B.cyl(2.2, 2.2, 10, 10, { top: false, bottom: false });
        B.push().at(0, 0, 10.01); matte(B, '#d9a066'); B.disc(2.2, 10); B.pop();
        B.push().at(0, 0, -0.01).rotX(Math.PI); matte(B, '#d9a066'); B.disc(2.2, 10); B.pop();
        B.pop();
      }
    }
    /* the dome, its courses of brick */
    const dz = 6, dy = -2;
    B.push().at(0, dy, dz);
    B.body().shine(0.18);
    B.lathe([[17, 0], [16.4, 4], [14.5, 8], [11, 11.4], [6, 13.6], [0, 14.3]], 30, { caps: false });
    B.body(0.72).shine(0.05);
    B.push().at(0, 0, 4.2).torus(16.35, 0.45, 32, 4).pop();
    B.push().at(0, 0, 8.6).torus(14.1, 0.45, 30, 4).pop();
    B.push().at(0, 0, 12.2).torus(9.6, 0.42, 24, 4).pop();
    B.pop();
    if (c.gold || par){ B.push().at(0, dy, dz + 0.3); gold(B); B.torus(17.2, 0.8, 34, 6); B.pop(); }
    /* the mouth: a stone arch, dark inside, the fire glowing */
    B.push().at(0, dy + 13.2, dz).rotX(-Math.PI / 2);
    const arch = (r0, r1) => { const p = []; for (let i = 0; i <= 12; i++){ const q = Math.PI + i / 12 * Math.PI; p.push([Math.cos(q) * r1, Math.sin(q) * r1]); } for (let i = 12; i >= 0; i--){ const q = Math.PI + i / 12 * Math.PI; p.push([Math.cos(q) * r0, Math.sin(q) * r0]); } return p; };
    matte(B, '#b8b0a4'); B.extrude(arch(7.2, 9.4), 3.6);
    const half = r => { const p = []; for (let i = 0; i <= 14; i++){ const q = Math.PI + i / 14 * Math.PI; p.push([Math.cos(q) * r, Math.sin(q) * r]); } return p; };
    B.push().at(0, 0, 1.2); matte(B, '#2a1a12'); B.flat(half(7.3)); B.pop();
    B.push().at(0, 0, 1.25);
    B.part((time, t) => ({ s: 0.85 + 0.1 * Math.sin(time * 9) + (t && t.fireAnim > 0 ? 0.15 : 0) }));
    lit(B, '#ff9a3a', 0.85); B.flat(half(5.6));
    B.endPart();
    B.pop();
    B.pop();
    if (b >= 3) for (let i = 0; i < 3; i++){ B.push().at(-4 + i * 4, dy + 13.8, dz); flame(B, 6.5, 1.9, '#ffb030', '#fff0a0', i); B.pop(); }
    /* the chimney, smoking */
    B.push().at(7, -14, 9); steel(B, '#5a5f63'); B.cyl(3.6, 3.3, 18, 16); B.at(0, 0, 18); matte(B, '#3a3f43'); B.torus(3.3, 0.7, 16, 5); matte(B, '#1a1c1e'); B.disc(2.8, 14); B.pop();
    puffs(B, 3, 7, -14, 28, 18, 2.6, b >= 5 ? '#ffaa5a' : '#e1e1e1', 0.38, 0.6);
    /* the peel with a pizza on it, in front */
    if (a >= 1){
      B.push().at(0, 26, 0.3);
      matte(B, '#c99a5c'); B.cyl(a >= 5 ? 8.6 : 7.2, a >= 5 ? 8.6 : 7.2, 0.8, 22);
      B.push().at(0, (a >= 5 ? 8.6 : 7.2) - 1, 0.4).rotX(-Math.PI / 2); matte(B, '#8a5a2b'); B.capsule(1.3, 9, 8); B.pop();
      B.push().at(0, 0, 0.8); pizzaTop(B, a >= 5 ? 7.6 : 6.2, a >= 3); B.pop();
      B.pop();
    }
    /* boxes ready to go, or a pizza wheel */
    if (cc >= 1){
      B.push().at(21, 12, 0);
      if (cc >= 3){
        const n = cc >= 5 ? 3 : 2;
        for (let i = 0; i < n; i++){ B.push().at(0, 0, i * 2.6).rotZ(i * 0.12 - 0.1); matte(B, '#f4efe6'); B.rbox(12, 12, 2.5, 0.8, 0.3); B.pop(); }
        B.push().at(0, 0, n * 2.6 + 0.02).rotZ((n - 1) * 0.12 - 0.1); matte(B, '#e2383f'); B.flat(rect(-4, -1.5, 8, 3)); B.pop();
      } else {
        B.push().at(0, 0, 5.2).rotX(Math.PI / 2); steel(B, '#dfe7ea'); B.push().at(0, 0, -0.35).cyl(4.6, 4.6, 0.7, 22).pop(); steel(B, '#7f8b90'); B.push().at(0, 0, -0.7).cyl(1.2, 1.2, 1.4, 10).pop(); B.pop();
        B.push().at(0, 0, 5.2).rotX(0.5); plastic(B, '#1f1f22'); B.push().at(0, 0, -11).capsule(1.1, 7, 8).pop(); B.pop();
      }
      B.pop();
    }
    return B;
  }

  /* ---------------- Stand Mixer (faces the viewer until it aims) ---------------- */
  function mixer(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const attach = b >= 3 && b >= a && b >= cc ? 'hook' : cc >= 2 && cc > a ? 'paddle' : 'whisk';
    B.prep(spinner('mix', t => t.fireAnim > 0 || t.fire2 > 0 ? 34 : 7.5));
    /* the foot, and the column at the back */
    B.body().shine(0.55);
    B.push().at(0, -5.5, 0).rbox(24, 31, 4, 9, 1.4).pop();
    B.push().at(0, -16, 3.6).rbox(13, 9, 15, 4, 1.5).pop();
    /* the head, reaching over the bowl */
    B.body().shine(0.6);
    B.push().at(0, -21.5, 20.5).rotX(-Math.PI / 2).scale(1, 0.84, 1).capsule(8.4, 30.6, 20).pop();
    if (cc >= 4 || par){ B.push().at(0, -4, 20.5).rotX(-Math.PI / 2); gold(B); B.scale(1, 0.84, 1).torus(8.55, 0.65, 26, 5); B.pop(); }
    B.push().at(8.2, -13, 20.5).rotZ(0.1); steel(B, '#dfe7ea'); B.box(4, 2.4, 1.6); B.pop();
    B.push().at(0, 4, 12.4); steel(B, '#dfe7ea'); B.cyl(3, 3.4, 2.6, 16); B.pop();
    /* the bowl */
    B.push().at(0, 7, 0);
    steel(B, '#dfe7ea');
    B.lathe([[5.5, 3.6], [9.5, 4.2], [12.2, 7.2], [13.5, 11.6], [13.7, 12.8, 1], [12.9, 12.9, 1], [12.4, 11.4]], 28, { caps: false });
    B.push().at(0, 0, 3.6); steel(B, '#b9c4c9'); B.disc(5.6, 18); B.pop();
    if (attach === 'hook'){
      B.push().at(0, 0.5, 8.6); B.color(b >= 5 || par ? '#f6d98a' : '#f3e1b8').shine(0.15); B.scale(1, 1, 0.62).sphere(b >= 4 ? 9.4 : 8.2, 20, 10); B.pop();
    } else {
      B.push().at(0, 0, 10.6); B.color(a >= 2 ? '#fff8e8' : '#f8e7bf').shine(0.25); B.disc(12.2, 26);
      B.part((time, t) => ({ rz: spun(t, 'mix') * 0.12 }));
      B.at(0, 0, 0.05); B.color('#d8b070').shine(0); for (let i = 0; i < 3; i++) B.torus(3 + i * 2.6, 0.32, 16, 3, 2.2, i * 2.1);
      matte(B, '#5a341b'); const nch = b >= 1 ? 8 : 5;
      for (let i = 0; i < nch; i++){ const an = i * 2.4, r = 3 + (i % 3) * 2.4; B.push().at(Math.cos(an) * r, Math.sin(an) * r, 0.2).scale(1.3, 1, 0.7).sphere(0.9, 6, 4).pop(); }
      B.endPart();
      B.pop();
    }
    B.pop();
    /* the attachment turning under the head */
    B.push().at(0, 4, 12.4);
    B.part((time, t) => ({ rz: spun(t, 'mix') }));
    steel(B, '#9aa6ab'); B.push().at(0, 0, -2).cyl(0.7, 0.7, 2, 8).pop();
    if (attach === 'whisk'){
      const nw = a >= 1 ? 6 : 4;
      steel(B, '#c3ccd1');
      for (let k = 0; k < nw; k++) B.push().at(0, 0, -4.6).rotZ(k * Math.PI / nw).rotX(Math.PI / 2).scale(1, 1.25, 1).torus(3.3, 0.24, 18, 4).pop();
    } else if (attach === 'hook'){
      steel(B, '#c3ccd1'); B.tube([[0, 0, -1.5], [0, 0, -3.4], [3.6, 0, -5.2], [4.4, 0, -8], [2.2, 0, -9], [0.6, 0, -7.8]], 0.75, 8);
    } else {
      steel(B, '#e8eef0'); B.push().at(0, 0, -9.4).rotX(Math.PI / 2); B.at(0, 0, -0.5).extrude([[-4, 0], [4, 0], [6, 7], [3.2, 7.6], [0, 8], [-3.2, 7.6], [-6, 7]], 1); B.pop();
    }
    B.endPart();
    B.pop();
    /* wind off a fast whisk */
    if (a >= 3){
      const big = a >= 5 || par;
      B.push().at(0, 2, 8);
      B.part((time, t) => ({ rz: -spun(t, 'mix') * 0.12 }));
      B.color('#a8c4dc', 0.5).shine(0.3).glow(0.2);
      for (let i = 0; i < (big ? 3 : 2); i++) B.push().at(0, 0, i * 3).torus(big ? 21 + i * 3.5 : 18 + i * 3, 0.7, 24, 5, big ? 2.2 : 1.9, i * 2.1).pop();
      B.endPart();
      B.pop();
    }
    /* sparks off an electric whisk */
    if (a >= 2){
      for (let i = 0; i < 3; i++){
        B.push().at(0, 7, 12);
        B.part(time => { const k = cycle(time, 3, i * 0.33), an = i * 2.1 + Math.floor(time * 3 + i * 0.33) * 1.7; return { x: Math.cos(an) * (12 + k * 4), y: Math.sin(an) * (12 + k * 4), z: k * 3, s: 1 - k * 0.6 }; }, time => cycle(time, 3, i * 0.33) < 0.5);
        lit(B, '#ffe066', 0.95); B.sphere(0.8, 6, 4);
        B.endPart();
        B.pop();
      }
    }
    /* a dollop of thunder meringue on the head */
    if (a >= 4 && !par){
      B.push().at(0, -13, 27.2);
      matte(B, '#fffaf0'); for (let i = 0; i < 3; i++) B.push().at(0, 0, i * 1.6).scale(1, 1, 0.75).sphere(3.8 - i * 1.05, 14, 7).pop();
      B.part(null, time => Math.sin(time * 13) > -0.2);
      lit(B, '#ffe066', 0.95);
      B.tube([[3, 0, 2], [5.6, 0.6, 3.6], [4.8, 0.2, 1.2], [7.4, 0.6, 2.6]], 0.3, 4);
      B.tube([[-3, 0, 1.5], [-5.6, 0.6, 3.2], [-4.6, 0.2, 0.8], [-7.2, 0.6, 2]], 0.3, 4);
      B.endPart();
      B.pop();
    }
    /* the dough hook's rope, reaching for what it holds */
    if (b >= 3){
      B.push().at(0, 3, 9);
      B.part((time, t) => ({ rz: aim2Turn(t) }));
      B.color('#d9c08a').shine(0.15); B.tube([[6, 0, 0], [12, 0, 2], [19, 0, 0]], b >= 4 ? 1.6 : 1.1, 8);
      B.color('#f3e1b8'); B.push().at(20, 0, 0).sphere(b >= 4 ? 3.2 : 2.4, 12, 7).pop();
      B.endPart();
      B.pop();
    }
    /* a bag of flour at the back */
    if (b >= 2){ B.push().at(-8, -21, 0); matte(B, '#f0ebe0'); B.rbox(7, 6, 8, 2, 1.6); B.push().at(0, 3.02, 4).rotX(-Math.PI / 2); matte(B, '#e9d6a6'); B.flat(rect(-2.5, -1.4, 5, 2.8)); B.pop(); B.pop(); }
    /* bitter batter: steam off the top */
    if (cc >= 2) puffs(B, 2, 0, -8, 29, 14, 2.4, '#ffffff', 0.4, 0.9);
    /* fury: fire round it */
    if (cc >= 5 || par){
      for (let i = 0; i < 6; i++){
        B.push().rotZ(i / 6 * TAU).at(20, 0, 0);
        B.part(time => { const k = cycle(time, 2.2, i * 0.37); return { s: 1 - k * 0.8 }; });
        flame(B, 7, 2.2, '#ff7a3c', '#ffd27a', i);
        B.endPart();
        B.pop();
      }
    }
    return B;
  }

  /* ---------------- Pasta Maker ---------------- */
  function pasta(B, c){
    const [a, b, cc] = c.up, par = c.par;
    B.prep(spinner('crank', t => t.fireAnim > 0 ? 21 : 1.5));
    /* the clamp holding it to the counter */
    B.push().at(-18.5, -4, 0); matte(B, '#8e9aa0'); B.rbox(6, 9, 2.4, 1, 0.5); B.at(0, 0, 2.4).rbox(4, 6, 6, 1, 0.5); B.pop();
    B.push().at(-20.5, -4, 0); steel(B, '#6b777c'); B.cyl(1, 1, 9.5, 8); B.at(0, 0, 9.5).torus(1.8, 0.45, 12, 4); B.pop();
    /* the body */
    B.body().shine(0.7); B.push().at(0, -1.5, 0).rbox(32, 27, 12, 4, 1.8).pop();
    if (c.gold || par) goldRim(B, 32, 27, 12, 4);
    /* the rollers, turning in their slot */
    B.push().at(0, 0, 12.02); matte(B, '#4b565b'); B.flat(rect(-12, -5, 24, 12)); B.pop();
    for (const y of [-2, 3]){
      B.push().at(-11, y, 11.4);
      B.part((time, t) => ({ rx: spun(t, 'crank') * (y < 0 ? 1 : -1) }));
      steel(B, '#e4ebee'); B.rotY(Math.PI / 2).cyl(2.2, 2.2, 22, 12, { flat: true });
      B.endPart();
      B.pop();
    }
    /* the crank, turning on the side */
    B.push().at(16, -2, 7.5);
    B.part((time, t) => ({ rx: spun(t, 'crank') }));
    steel(B, '#dfe7ea'); B.push().rotY(Math.PI / 2).cyl(2.6, 2.6, 1.6, 14).pop();
    steel(B, '#6b777c'); B.push().at(1.2, 0, 0).box(1.4, 1.6, 9.5).pop();
    B.push().at(1.2, 0, 9).rotY(Math.PI / 2); plastic(B, '#c9363a'); B.capsule(1.6, 6, 10); B.pop();
    B.endPart();
    B.pop();
    /* pasta coming out of the front */
    if (b >= 3 || par){
      B.push().at(0, 11.6, 6);
      B.part(time => ({ rx: Math.sin(time * 3) * 0.06 }));
      matte(B, '#f0d27a'); B.loft([[[[-9, 0], [9, 0], [9, 0.9], [-9, 0.9]], 0], [[[-9, 2], [9, 2], [9, 2.9], [-9, 2.9]], -3], [[[-9, 6], [9, 6], [9, 6.9], [-9, 6.9]], -5.2], [[[-9, 11], [9, 11], [9, 11.9], [-9, 11.9]], -5.8]]);
      if (b >= 5 || par){ B.push().at(0, 6.6, -5.1); matte(B, '#c9363a'); B.box(14, 2.4, 0.4); B.pop(); }
      B.endPart();
      B.pop();
    } else {
      const n = a >= 5 ? 8 : a >= 3 ? 6 : 4, r = a >= 5 ? 0.85 : 0.6;
      for (let i = 0; i < n; i++){
        const x = -8 + i * (16 / (n - 1));
        B.push().at(x, 11.4, 7);
        B.part(time => ({ rx: Math.sin(time * 3 + i) * 0.12, rz: Math.sin(time * 2 + i * 1.7) * 0.08 }));
        matte(B, a >= 5 ? '#e6c25a' : '#f0d27a'); B.tube([[0, 0, 0], [0, 2.5, -2.5], [(i % 2 ? 1 : -1) * 0.8, 5, -6], [(i % 2 ? 1.6 : -1.2), 8 + (i % 2) * 2, -6.9]], r, 6);
        B.endPart();
        B.pop();
      }
    }
    /* ravioli waiting behind it */
    if (cc >= 2){
      const n = cc >= 5 ? 4 : cc >= 3 ? 3 : 2;
      for (let i = 0; i < n; i++){
        B.push().at(15 + (i % 2) * 6.5, 15 + Math.floor(i / 2) * 6.5, 0).rotZ(0.2 * i);
        B.color(cc >= 4 ? '#e8b445' : '#f2d48a').shine(0.15); B.rbox(6.6, 6.6, 0.7, 1, 0.2); B.at(0, 0, 0.6).rbox(4.4, 4.4, 1.4, 1.4, 0.7);
        B.pop();
      }
    }
    /* a nest of fresh pasta */
    if (a >= 3 && b < 3){ B.push().at(-20, 12, 0); matte(B, '#f0d27a'); for (let i = 0; i < 3; i++) B.push().at(0, 0, 0.9 + i * 0.9).torus(4 - i * 1.1, 0.95, 16, 6).pop(); B.pop(); }
    return B;
  }

  /* ---------------- Pepper Gatling ---------------- */
  function gatling(B, c){
    const [a, b, cc] = c.up, par = c.par;
    B.prep(spinner('barrel', t => t.fireAnim > 0 ? 30 : 5));
    B.prep(spinner('crank', t => t.fireAnim > 0 ? 14 : 1.5));
    /* spice-jar turrets round it, keeping their own facing */
    if (cc >= 4 || par){
      B.part(still);
      for (let i = 0; i < 4; i++){
        const an = i / 4 * TAU + Math.PI / 4;
        B.push().at(Math.cos(an) * 18, Math.sin(an) * 18, 0);
        B.part(time => ({ rz: an + Math.sin(time * 2 + i) * 0.6 }));
        B.color(cc >= 5 || par ? '#ffd166' : '#e9e2d0').shine(0.6); B.cyl(4.2, 4.2, 6.5, 16);
        B.push().at(0, 0, 6.5); plastic(B, ['#c9363a', '#7ab648', '#f2c14e', '#7b4b2a'][i]); B.cyl(4.4, 4.2, 1.6, 16); B.pop();
        B.push().at(3, 0, 4.5).rotY(Math.PI / 2); steel(B, '#6b777c'); B.cyl(1.3, 1.2, 6, 8); B.pop();
        B.endPart();
        B.pop();
      }
      B.endPart();
    }
    /* popcorn rocket pods */
    if (b >= 3 || par){
      for (const sd of [-1, 1]){
        B.push().at(1.5, sd * 15, 2.4); B.color(b >= 5 || par ? '#ffd166' : '#e9e2d0').shine(0.4); B.rbox(17, 9, 7, 3, 1.6);
        for (let k = 0; k < 2; k++){ B.push().at(8.6, -2.2 + k * 4.4, 3.6); matte(B, '#fff6da'); B.sphere(2.2, 10, 6); B.pop(); }
        B.pop();
      }
      if (b >= 5 || par){ B.push().at(-12, 0, 0); B.color('#c99a5c').shine(0.2); B.rbox(12, 9, 9, 4, 1.5); B.at(0, 0, 9); matte(B, '#fff1c6'); B.push().scale(1, 1, 0.6).sphere(4, 12, 6).pop(); B.pop(); }
    }
    /* the barrels, spinning */
    const beam = a >= 4 || par, len = beam ? 27 : a >= 3 ? 24 : 21;
    const bz = 7.5;
    B.push().at(6, 0, bz);
    B.part((time, t) => ({ rx: spun(t, 'barrel') }));
    for (let i = 0; i < 3; i++){
      const q = i / 3 * TAU;
      B.push().at(0, Math.cos(q) * 4.4, Math.sin(q) * 4.4).rotY(Math.PI / 2);
      if (beam) lit(B, '#ff7a4d', 0.35); else steel(B, '#d6dde0');
      B.cyl(1.9, 1.9, len - 6, 10);
      B.pop();
    }
    steel(B, beam ? '#5a1d12' : '#6b777c'); B.push().at(len - 10, 0, 0).rotY(Math.PI / 2).cyl(6.6, 6.6, 4.4, 18).pop();
    B.push().rotY(Math.PI / 2).cyl(5.6, 5.6, 3, 16).pop();
    B.endPart();
    if (cc >= 3 && !beam){ B.push().at(len - 6, 0, 0).rotY(Math.PI / 2); steel(B, '#8e9aa0'); B.lathe([[6.6, 0], [9, 5.4, 1], [8, 5.4, 1], [5.6, 0.4]], 18, { caps: false }); B.pop(); }
    if (a >= 2 || par){
      B.push().at(len - 5, 0, 0);
      B.part(time => ({ s: beam ? 1 + 0.2 * Math.sin(time * 9) : 1 }));
      B.color(a >= 5 || par ? '#ff3c14' : '#ff6e32', 0.55).glow(0.8); B.sphere(beam ? 5.6 : 3.4, 14, 8);
      B.endPart();
      B.pop();
    }
    B.pop();
    /* the mill */
    B.body().shine(0.3);
    B.lathe([[12.6, 0], [13.2, 2], [13.2, 9.5], [12.4, 12], [10, 13.4], [9.5, 13.6, 1]], 30, { caps: false });
    B.body(1.15).shine(0.35); B.push().at(0, 0, 13.6).cyl(9.5, 9.5, 0.01, 26, { bottom: false }).pop();
    B.body(0.72); for (let i = 0; i < 8; i++){ const an = i / 8 * TAU; B.push().at(Math.cos(an) * 13.15, Math.sin(an) * 13.15, 2.5).rotZ(an).box(0.8, 1, 7).pop(); }
    if (c.gold || par){ B.push().at(0, 0, 11.5); gold(B); B.torus(12.6, 0.7, 30, 5); B.pop(); }
    B.push().at(-1, 0, 13.6); matte(B, '#3d2a1e'); B.cyl(4.6, 4.2, 1.6, 16);
    B.at(0, 0, 1.6);
    B.part((time, t) => ({ rz: spun(t, 'crank') }));
    steel(B, '#c9d2d6'); B.push().at(4, 0, 0).box(9, 2.2, 1.2).pop();
    B.push().at(8, 0, 0); plastic(B, a >= 2 || par ? '#ff5a2a' : '#e2383f'); B.cyl(1.7, 1.5, 4.5, 12); B.pop();
    B.endPart();
    B.pop();
    return B;
  }

  /* ---------------- Espresso Machine ---------------- */
  function espresso(B, c){
    const [a, b, cc] = c.up, par = c.par;
    feet(B, 42, 34, 6);
    B.body().shine(0.65); B.push().at(0, 0, 1).rbox(42, 34, 18, 6, 2).pop();
    if (c.gold || par) goldRim(B, 42, 34, 19, 6);
    /* the cup warmer on top, two cups warming on it */
    B.push().at(4, -4, 19.02); matte(B, '#3a4045'); B.flat(rect(-12, -7, 24, 14));
    B.at(0, 0, 0.03); steel(B, '#9aa6ab'); for (let i = 0; i < 4; i++) B.flat(rect(-10 + i * 6.4, -6, 0.9, 12));
    B.pop();
    for (const [x, y] of [[-1, -5], [8, -3]]){ B.push().at(x, y, 19); matte(B, '#ffffff'); B.lathe([[1.6, 0], [2.8, 0.5], [3, 3.6]], 14, { caps: true }); B.push().at(3, 0, 1.9).rotX(Math.PI / 2).torus(1.2, 0.35, 10, 4).pop(); B.at(0, 0, 3.2); matte(B, '#6b3d1f'); B.disc(2.7, 12); B.pop(); }
    /* the front: a dark brewing bay over a drip tray, the gauge, two group heads with their handles */
    B.push().at(0, 17.03, 8).rotX(-Math.PI / 2); matte(B, '#2a2f33'); B.flat(rect(-16, -5.5, 32, 11)); B.pop();
    B.push().at(0, 17, 1); matte(B, '#3a4045'); B.rbox(30, 7, 2.2, 1.4, 0.4); B.at(0, 0, 2.21); steel(B, '#8e9aa0'); for (let i = 0; i < 6; i++) B.flat(rect(-13 + i * 5.2, 1, 2.8, 2)); B.pop();
    for (const x of [-9, 9]){
      B.push().at(x, 18.6, 10.2); steel(B, '#8e9aa0'); B.cyl(3.2, 3.2, 2.2, 16); B.at(0, 0, -1.8); steel(B, '#6b777c'); B.cyl(2.8, 3, 1.8, 16); B.pop();
      B.push().at(x, 20.2, 9.2).rotX(-Math.PI / 2 + 0.3); plastic(B, '#1f1f22'); B.capsule(1.4, 10.5, 10); B.pop();
      B.push().at(x, 18.6, 5.6); matte(B, '#6b3d1f'); B.cyl(0.5, 0.5, 2.8, 6); B.pop();
    }
    /* the pressure gauge, on the top's front edge, its needle trembling */
    B.push().at(0, 14.6, 19).rotX(-0.7);
    steel(B, '#8e9aa0'); B.cyl(4.2, 4.2, 1.6, 18); B.at(0, 0, 1.6); matte(B, '#ffffff'); B.cyl(3.5, 3.5, 0.2, 18); steel(B, '#8e9aa0'); B.torus(3.8, 0.45, 18, 5);
    B.push().at(0, 0, 0.25);
    B.part(time => ({ rz: Math.PI / 2 + Math.sin(time * 2) * 1.2 }));
    matte(B, '#c9363a'); B.push().at(1.3, 0, 0).box(2.8, 0.45, 0.2).pop();
    B.endPart();
    B.pop();
    B.pop();
    /* a milk jug at its side */
    if (b >= 1){ B.push().at(25.5, 9.5, 0); steel(B, '#dfe7ea'); B.lathe([[3.6, 0], [3.9, 4], [3.2, 8.4], [3.6, 9.2]], 16, { caps: false }); B.at(0, 0, 0.1); matte(B, '#ffffff'); B.cyl(3.5, 3.1, 7.6, 14); B.at(0, 0, 7.6); lit(B, '#ffd166', 0.3); B.sphere(1.4, 8, 5); B.pop(); }
    /* a copper steam pipe */
    if (cc >= 1){ B.push(); B.color('#b87333').shine(0.85); B.tube([[-21, -8, 12], [-25, -8, 12], [-27, -8, 14], [-27, -8, 26]], 1.2, 10); B.push().at(-27, -8, 26).sphere(1.9, 10, 6).pop(); B.pop(); }
    /* coffee beans on top */
    if (a >= 1){ matte(B, '#5a3418'); for (let i = 0; i < Math.min(a, 3); i++){ B.push().at(-14 + i * 7, 13, 19.2).rotZ(0.4).scale(1.5, 1, 0.7).sphere(1.6, 10, 6).pop(); } }
    /* steam rising */
    puffs(B, 3, 0, -3, 20, 18, 2.6, '#ffffff', 0.4, 0.75);
    return B;
  }

  /* ---------------- Bread Machine ---------------- */
  function bread(B, c){
    const [a, b, cc] = c.up, par = c.par;
    feet(B, 38, 36, 9);
    B.body().shine(0.35); B.push().at(0, 0, 1).rbox(38, 36, 15, 9, 3).pop();
    if (c.gold || par) goldRim(B, 38, 36, 16, 9);
    /* the lid window, the loaf rising under it */
    B.push().at(0, -3, 16); matte(B, '#2b2622'); B.rbox(24, 18, 0.6, 5, 0.2); B.pop();
    B.push().at(0, -2, 16.4); B.color(a >= 5 || par ? '#f2c14e' : '#c98a45').shine(0.25); B.scale(1, 1, 0.42).sphere(8.6, 20, 10); B.pop();
    B.push().at(0, -2, 16.4); matte(B, '#7a4a20'); for (let i = -1; i <= 1; i++) B.tube([[-4 + i * 4, -3.6, 2.8], [-2.4 + i * 4, -0.6, 3.6], [-1 + i * 4, 1.8, 3.2]], 0.35, 5); B.pop();
    B.push().at(0, -3, 16.6); B.color('#fff2dc', 0.16).shine(1); B.rbox(23, 17, 3.6, 5, 1.2); B.pop();
    /* buttons along the front of the top */
    for (let i = 0; i < 3; i++){ B.push().at(-6 + i * 6, 12.5, 16); plastic(B, i === 0 ? '#7ee07a' : '#c9d2d6'); if (i === 0) B.glow(0.5); B.rbox(4, 3, 0.8, 0.8, 0.3); B.pop(); }
    /* a little window on the front, glowing warm */
    B.push().at(0, 18.05, 8).rotX(-Math.PI / 2); matte(B, '#2b2622'); B.flat(rect(-7.5, -4, 15, 8)); B.at(0, 0, 0.03); lit(B, '#ffb46a', 0.55); B.flat(rect(-6.6, -3.2, 13.2, 6.4)); B.pop();
    /* a sack of flour, and a coin for the bake sale */
    if (b >= 1){
      B.push().at(25, -2, 0); matte(B, '#f0ebe0'); B.rbox(10, 16, 11, 3, 2); B.at(0, 0, 11).rotX(0.3); B.rbox(8, 6, 3, 1, 1); B.pop();
      B.push().at(25, 6.02, 5.5).rotX(-Math.PI / 2); matte(B, '#e9dcb8'); B.flat(rect(-4, -3.5, 8, 7)); B.pop();
      if (b >= 3){ B.push().at(25, -14, 6.2).rotX(Math.PI / 2); gold(B); B.push().at(0, 0, -0.7).cyl(6, 6, 1.4, 24).pop(); B.color('#d9a830').shine(0.8); B.push().at(0, 0, 0.71).torus(4.2, 0.4, 20, 4).pop(); B.pop(); }
    }
    /* a striped awning over the back */
    if (cc >= 3){
      matte(B, '#6b4a2a'); for (const x of [-18, 18]) B.push().at(x, -23, 0).cyl(0.8, 0.8, 21, 8).pop();
      for (let i = 0; i < 5; i++){ B.push().at(-15.2 + i * 7.6, -21, 21).rotX(-0.35); matte(B, i % 2 ? '#ffffff' : '#2a9d8f'); B.box(7.6, 10, 0.7); B.pop(); }
    }
    /* a service bell */
    if (cc === 2){ B.push().at(-24, 12, 0); matte(B, '#2a2f33'); B.cyl(4, 4, 1, 16); B.at(0, 0, 1); steel(B, '#e8d27a'); B.dome(3.2, 14, 5); B.at(0, 0, 3.2).sphere(0.8, 8, 4); B.pop(); }
    puffs(B, 2, -4, -4, 19, 14, 2.3, '#ffffff', 0.35, 0.65);
    return B;
  }

  /* ---------------- Gravy Boat (on the water) ---------------- */
  /* the gravy boat's outline in plan, spout to the front (+x) */
  function hullPts(L, Wd, sx, sy){
    sx = sx || 1; sy = sy || 1;
    const q = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
    const cb = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
    const pts = [];
    for (let i = 0; i < 8; i++){ const t = i / 8; pts.push([q(L, L * 0.55, L * 0.05, t), q(0, -Wd * 0.7, -Wd, t)]); }
    for (let i = 0; i < 10; i++){ const t = i / 10; pts.push([cb(L * 0.05, -L * 0.5, -L * 0.92, -L * 0.92, t), cb(-Wd, -Wd * 1.1, -Wd * 0.88, 0, t)]); }
    for (let i = 0; i < 10; i++){ const t = i / 10; pts.push([cb(-L * 0.92, -L * 0.92, -L * 0.5, L * 0.05, t), cb(0, Wd * 0.88, Wd * 1.1, Wd, t)]); }
    for (let i = 0; i < 8; i++){ const t = i / 8; pts.push([q(L * 0.05, L * 0.55, L, t), q(Wd, Wd * 0.7, 0, t)]); }
    return pts.map(([x, y]) => [x * sx, y * sy]);
  }
  /* a flag on a pole, waving */
  function flag3d(B, x, y, z0, h, col, emblem){
    B.push().at(x, y, z0); matte(B, '#5a3a1e'); B.cyl(0.6, 0.5, h, 8); B.at(0, 0, h).sphere(0.9, 8, 5); B.pop();
    B.push().at(x, y, z0 + h - 0.6);
    B.part(time => ({ rz: Math.sin(time * 5 + x) * 0.25 }));
    B.push().rotX(Math.PI / 2); matte(B, col); B.at(0, 0, -0.25).extrude([[0, 0], [-11, 0.6], [-9, -2.6], [-12, -6], [0, -5]], 0.5); B.pop();
    if (emblem === 'bones'){ B.push().at(-5.5, 0.3, -2.4).rotX(Math.PI / 2); matte(B, '#f4efe6'); B.at(0, 0, 0.01); B.flat(rect(-2.6, -0.35, 5.2, 0.7)); B.push().rotZ(0.9).flat(rect(-2.6, -0.35, 5.2, 0.7)).pop(); B.push().rotZ(-0.9).flat(rect(-2.6, -0.35, 5.2, 0.7)).pop(); B.pop(); }
    else if (emblem === 'coin'){ B.push().at(-5.5, 0.3, -2.4).rotX(Math.PI / 2); lit(B, '#ffd166', 0.3); B.at(0, 0, 0.01); B.disc(1.8, 12); B.pop(); }
    B.endPart();
    B.pop();
    return B;
  }
  function boat(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const isGold = par || a >= 5 || cc >= 5;
    const trim = isGold ? '#e7b53a' : b >= 4 ? '#2e3437' : '#4f86c6';
    const L = 24, Wd = 12.5, H = 7;
    /* the handle at the back */
    B.push().at(-L * 0.9 - 1, 0, 4.2).rotX(Math.PI / 2); B.body().shine(0.6); B.torus(5.2, 1.3, 16, 6, Math.PI, Math.PI / 2); B.pop();
    /* the hull */
    B.body().shine(0.6);
    B.loft([[hullPts(L, Wd, 0.74, 0.62), 0], [hullPts(L, Wd, 0.9, 0.86), 2.4], [hullPts(L, Wd, 0.98, 0.97), 5], [hullPts(L, Wd, 1, 1), H]]);
    B.push().at(0, 0, H - 0.3); B.color(trim).shine(0.5); B.hoop(hullPts(L * 1.005, Wd * 1.01).map(p => [p[0], p[1], 0]), 0.6, 5); B.pop();
    /* the gravy, or a flight deck */
    B.push().at(-1.5, 0, H + 0.02);
    if (a >= 4){
      matte(B, '#6b777c'); B.flat(hullPts(L, Wd, 0.72, 0.64));
      B.at(0, 0, 0.02); matte(B, '#ffffff'); for (let x = -13; x < 12; x += 5.5) B.flat(rect(x, -0.4, 3, 0.8));
      lit(B, '#ffd166', 0.2); B.flat(rect(-12.5, -3.9, 20, 0.7)); B.flat(rect(-12.5, 3.2, 20, 0.7));
    } else { B.color('#8a5a2b').shine(0.8); B.flat(hullPts(L, Wd, 0.72, 0.64)); }
    B.pop();
    /* grapes */
    if ((b >= 1 && b < 3) || (b >= 3 && a < 3 && cc < 3)){
      B.color(b >= 2 ? '#8a2f4f' : '#6f3a8f').shine(0.7);
      for (const [x, y] of [[-10, -6.5], [-7.4, -7.4], [-8.8, -4.4], [-6.2, -4.8]]) B.push().at(x, y, H + 1.8).sphere(2.1, 10, 6).pop();
      if (b >= 2){ B.push().at(-8.2, -6, H + 1.2); B.part(time => ({ s: 1 + 0.08 * Math.sin(time * 7) })); lit(B, '#ff8c3c', 0.7); B.torus(4.8, 0.45, 18, 4); B.endPart(); B.pop(); }
    }
    /* cargo */
    if (cc >= 3){
      for (const [x, y] of [[-12, 4.5], [-6.5, 6]]){ B.push().at(x, y, H); matte(B, '#b98a50'); B.rbox(5.2, 5.2, 4.4, 0.6, 0.3); B.at(0, 0, 4.42); matte(B, '#6f5234'); B.flat(rect(-2.6, -0.3, 5.2, 0.6)); B.pop(); }
      if (cc >= 4) for (let i = 0; i < 3; i++){ B.push().at(-9, -5.5, H + i * 0.9); gold(B); B.cyl(2.6, 2.6, 0.8, 14); B.pop(); }
    }
    /* a crow's nest on its mast */
    if (cc >= 2){ B.push().at(-1, 0, H); matte(B, '#9a6534'); B.cyl(0.8, 0.7, 15, 8); B.at(0, 0, 10); B.lathe([[2.4, 0], [4.2, 0.4], [4.4, 3.4, 1], [3.8, 3.4, 1], [3.6, 0.8]], 14, { caps: false }); B.at(0, 0, 0.8); matte(B, '#6e4320'); B.disc(3.6, 14); B.pop(); }
    /* a meatball cannon */
    if (b >= 3){
      B.push().at(1, 8, H);
      matte(B, '#4b555a'); B.cyl(3.2, 3, 2.4, 14);
      B.push().at(-1, 0, 3.4).rotY(Math.PI / 2 - 0.08); matte(B, '#2e3437'); B.cyl(2.3, 2, 13, 12); B.pop();
      B.push().at(13.6, 0, 4.4); B.part(null, ready); matte(B, '#8a4a2a'); B.sphere(2.4, 12, 7); B.endPart(); B.pop();
      B.pop();
    }
    /* a destroyer turret */
    if (a >= 3){
      const tx = a >= 4 ? 13 : 7;
      B.push().at(tx, 0, H);
      for (const y of a >= 4 ? [-1.6, 1.6] : [0]){ B.push().at(2, y, 2.6).rotY(Math.PI / 2); steel(B, '#4b555a'); B.cyl(1.2, 1.1, 11, 10); B.pop(); }
      if (isGold) gold(B); else steel(B, '#8e9aa0');
      B.dome(4.6, 18, 5);
      B.pop();
    }
    /* flags */
    if (b >= 4) flag3d(B, -15, 0, H, 14, b >= 5 ? '#c9363a' : '#1d2124', 'bones');
    else if (a >= 5 || par) flag3d(B, -15, 0, H, 14, '#ffd166', null);
    else if (cc >= 4) flag3d(B, -15, 0, H, 14, '#2a9d8f', 'coin');
    if (par){ B.push().at(0, 0, H + 0.4); gold(B); B.hoop(hullPts(L + 3, Wd + 3).map(p => [p[0], p[1], 0]), 0.7, 5); B.pop(); }
    return B;
  }

  /* ---------------- Sub Sandwich (on the water) ---------------- */
  function sub(B, c){
    const [a, b, cc] = c.up, par = c.par;
    B.prep(spinner('prop', 14));
    /* the propeller */
    B.push().at(-24, 0, 5.5);
    B.part((time, t) => ({ rx: spun(t, 'prop') }));
    gold(B); for (let i = 0; i < 3; i++){ B.push().rotX(i * TAU / 3).at(0, 0, 0.5).rotY(0.4).scale(0.3, 1, 1).push().scale(1, 0.5, 1).sphere(3.4, 10, 6).pop().pop(); }
    B.endPart();
    steel(B, '#8e9aa0'); B.push().at(1, 0, 0).rotY(-Math.PI / 2).cyl(1.2, 1, 3, 8).pop();
    B.pop();
    /* the bottom of the roll, the fillings, the top */
    B.body(0.92).shine(0.2);
    B.push().at(-21.5, 0, 4.6).rotY(Math.PI / 2).scale(0.55, 1, 1).capsule(9, 43, 20).pop();
    /* lettuce frilling out all round, cheese and tomato poking out */
    const frill = [];
    for (let i = 0; i < 48; i++){ const q = i / 48 * TAU, r = i % 2 ? 1 : 1.12; frill.push([Math.cos(q) * 23.5 * r, Math.sin(q) * 11 * r]); }
    B.push().at(0, 0, 4.4); B.color('#7ab648').shine(0.3); B.extrude(frill, 1.1); B.pop();
    B.color('#f2c14e').shine(0.3);
    for (const [x, sd] of [[-9, -1], [6, 1], [12, -1], [-15, 1]]){ B.push().at(x, sd * 9.5, 5.3); B.extrude([[-3, 0], [3, 0], [0, sd * 4.4]], 0.6); B.pop(); }
    if (b >= 2){ B.color('#d9462e').shine(0.4); for (const [x, sd] of [[-2, 1], [1, -1]]){ B.push().at(x, sd * 10, 5.2).rotX(Math.PI / 2).scale(1, 0.55, 1).cyl(3.4, 3.4, 0.8, 14).pop(); } }
    B.body().shine(0.25);
    B.push().at(-21.5, 0, 5.6).rotY(Math.PI / 2).scale(0.8, 1, 1).lathe([[0, 0], [5, 0.6], [7.6, 2.4], [8.8, 5.5], [9, 8], [9, 35], [8.8, 37.5], [7.6, 40.6], [5, 42.4], [0, 43]], 22, { caps: false }).pop();
    /* sesame seeds */
    matte(B, '#fff6da'); for (const [x, y, r] of [[-14, -4, 0.3], [-8, 4.5, -0.4], [9, -4.2, 0.6], [15, 3.8, 0.2], [-2, -5, 0.1], [4, 5, 0.5], [-17, 2, 0.2]]) B.push().at(x, y, 12.3 - Math.abs(y) * 0.12).rotZ(r).scale(1.4, 0.7, 0.45).sphere(1, 6, 3).pop();
    /* guns at the bow */
    if (cc >= 1){
      const n = cc >= 3 ? 3 : 2;
      for (let i = 0; i < n; i++){ const y = n === 3 ? (i - 1) * 4.6 : (i ? 3.4 : -3.4); B.push().at(18, y, 6.6).rotY(Math.PI / 2); if (cc >= 4) steel(B, '#8e9aa0'); else plastic(B, '#5f8f2a'); B.cyl(1.6, 1.4, 8, 10); B.pop(); }
    }
    /* missile hatches */
    if (b >= 3){
      const n = b >= 5 ? 3 : b >= 4 ? 2 : 1;
      for (let i = 0; i < n; i++){ const x = -15 + i * 5.2; B.push().at(x, -1, 11.6); plastic(B, '#f2c230'); B.rbox(4, 5.2, 1.6, 1.3, 0.6); B.at(0, -1.2, 1.6); plastic(B, '#c9363a'); B.dome(1.2, 10, 3); B.pop(); }
    }
    /* the brine reactor, glowing */
    if (a >= 4 || par){ B.push().at(-9, 3, 12.2); B.part(time => ({ s: 1 + 0.12 * Math.sin(time * 8) })); lit(B, a >= 5 || par ? '#e8ff9a' : '#9be15d', 0.85); B.dome(3, 14, 4); B.endPart(); B.pop(); }
    /* the conning tower: an olive with a toothpick periscope */
    B.push().at(3, 0, 12.4);
    B.color('#4f6a1f').shine(0.6); B.push().scale(1, 0.85, 0.85).sphere(5, 16, 9).pop();
    B.push().at(4.6, 0, 0.6).rotY(Math.PI / 2); lit(B, '#d6322f', 0.2); B.cyl(1.9, 1.9, 0.8, 12); B.pop();
    if (a >= 1){
      matte(B, '#d9b77a'); B.tube([[0, 0, 3.6], [0, 0, 10], [2.4, 0, 12]], 0.6, 6);
      B.push().at(3.2, 0, 12.2); if (a >= 2) lit(B, '#7fd3ff', 0.5); else matte(B, '#9fb3b8'); B.sphere(1.5, 10, 6); B.pop();
    }
    if (cc >= 5 || par){ B.push().at(-1.5, 0, 4); lit(B, '#ffd166', 0.4); B.rotZ(Math.PI / 2); slab(B, starPoly(3.2, 1.4, 5), 0.8); B.pop(); }
    B.pop();
    return B;
  }

  /* ---------------- Whisk Copter (flies) ---------------- */
  function heli(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const chinook = b >= 4 || par;
    B.prep(spinner('rotor', 24));
    /* skids */
    matte(B, '#3d4549');
    for (const sd of [-1, 1]){
      B.tube([[-9, sd * 10.5, 0.8], [8, sd * 10.5, 0.8], [11, sd * 10.5, 2.2]], 0.75, 6);
      for (const x of [-5, 5]) B.tube([[x, sd * 10.5, 0.8], [x, sd * 6, 4.4]], 0.55, 5);
    }
    /* stub wings with chili rockets, or gun pods */
    if (a >= 4 || par){
      B.push().at(-1.5, 0, 5.4); B.body(0.8).shine(0.4); B.rbox(7, 30, 1.4, 1.5, 0.5); B.pop();
      for (const sd of [-1, 1]){ B.push().at(1, sd * 13, 3.6).rotY(Math.PI / 2); plastic(B, '#d9332a'); B.push().at(0, 0, -6).scale(1, 1, 1).lathe([[0, 0], [1.5, 0.6], [1.6, 7], [0.8, 11], [0, 12.4]], 10).pop(); matte(B, '#4f9a45'); B.push().at(0, 0, -7.8).cyl(0.7, 0.9, 2, 6).pop(); B.pop(); }
    } else if (a >= 1){
      for (const sd of [-1, 1]){ B.push().at(-2, sd * 12.5, 4.2).rotY(Math.PI / 2); steel(B, '#6b777c'); B.capsule(1.8, 12, 10); B.pop(); B.push().at(3, sd * 9.5, 5.2); matte(B, '#3d4549'); B.box(2, 5, 1); B.pop(); }
    }
    /* the tail boom, fin and tail rotor */
    B.body(0.86).shine(0.5); B.tube([[-8, 0, 9.5], [-20, 0, 10.4], [-31, 0, 11.2]], [3.1, 2.4, 1.8], 12);
    if (cc >= 5 || a >= 5 || par){ B.push().at(-12, 0, 10); gold(B); B.push().rotY(Math.PI / 2).torus(2.9, 0.5, 14, 4).pop(); B.at(-6, 0, 0.4).push().rotY(Math.PI / 2).torus(2.5, 0.5, 14, 4).pop(); B.pop(); }
    B.push().at(-31, 0, 9).rotX(Math.PI / 2); B.body(0.68).shine(0.4); B.at(0, 0, -0.5).extrude([[2, 0], [-3, 0], [-4.5, 8.5], [-1.5, 8.5]], 1); B.pop();
    if (!chinook){
      B.push().at(-30, 1.6, 13.5);
      B.part((time, t) => ({ ry: spun(t, 'rotor') * 1.25 }));
      steel(B, '#dce4e8'); B.box(9, 0.4, 1.1).at(0, 0, 0).push().rotY(Math.PI / 2).box(9, 0.4, 1.1).pop();
      B.endPart();
      B.pop();
    }
    /* jet exhausts */
    if (b >= 1) for (const sd of [-1, 1]){
      B.push().at(-9, sd * 5, 13.2).rotY(-Math.PI / 2); steel(B, '#4b555a'); B.cyl(2.4, 2.2, 4, 12); B.at(0, 0, 4.02);
      B.part(time => ({ s: 0.85 + 0.25 * Math.sin(time * 20 + sd) })); lit(B, '#ffa03c', 0.9); B.disc(1.6, 10); B.endPart();
      B.pop();
    }
    /* the cabin and its canopy */
    B.body().shine(0.55); B.push().at(0, 0, 9).scale(14.5, 10, 7.6).sphere(1, 22, 12).pop();
    if (b >= 5 || par){ matte(B, '#3a4a2a'); for (const [x, y, r] of [[-6, -4, 3], [2, 5, 2.6], [-2, 1, 2], [-8, 5, 2.2]]) B.push().at(x, y, 9 + Math.sqrt(Math.max(0, 1 - (x * x) / 210 - (y * y) / 100)) * 7.5).scale(1, 1, 0.3).sphere(r, 10, 5).pop(); }
    B.push().at(6, 0, 10.2); B.color(b >= 2 ? '#7ee07a' : '#9fd3ef').shine(1).glow(0.1); B.scale(8, 6.8, 5.6).sphere(1, 18, 10); B.pop();
    if (cc >= 3){ B.push().at(13.4, 0, 9).rotY(Math.PI / 2); steel(B, '#5c666b'); B.lathe([[7, 0], [4.6, 3.6, 1], [0, 3.8]], 12); B.pop(); }
    if (a >= 4 || par){ B.push().at(12, 0, 6.6).rotY(Math.PI / 2); matte(B, '#2e3437'); B.cyl(1.3, 1.1, 10, 8); B.pop(); }
    /* rotors: whisks */
    const rc = a >= 3 || par ? '#bfe3ff' : '#f2f5f6';
    const hubs = chinook ? [[9, 0], [-19, 4]] : [[-1, 0]], R = chinook ? 21 : 24;
    for (const [hx, lift] of hubs){
      B.push().at(hx, 0, 16 + lift);
      steel(B, '#8e9aa0'); B.push().at(0, 0, -3 - lift).cyl(1.1, 1.1, 3.4 + lift, 8).pop();
      B.part((time, t) => ({ rz: t && t.icon ? 0.35 : spun(t, 'rotor') + hx }));
      B.color(rc).shine(0.7);
      for (let i = 0; i < 2; i++) B.push().rotZ(i * Math.PI / 2).scale(1, 0.15, 1).torus(R, 0.5, 30, 4).pop();
      B.endPart();
      B.part(null, (time, t) => !(t && t.icon)); B.color('#ebf2f6', 0.14).shine(0); B.push().at(0, 0, 0.6).disc(R, 30).pop(); B.endPart();
      if (a >= 3 || par) lit(B, '#9fd3ef', 0.3); else steel(B, '#c9d2d6');
      B.push().at(0, 0, -0.6).cyl(3.4, 3, 1.8, 14).pop();
      B.pop();
    }
    return B;
  }

  /* ---------------- Flying Saucer (flies, spinning) ---------------- */
  function saucer(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const R = 19;
    const SP = L3().SPRINKLES;
    B.part((time, t) => ({ rz: t && t.icon ? 0.3 : time * 0.9 }));
    /* sprinkles round the rim */
    if (a >= 5 || par) for (let i = 0; i < 16; i++){ const an = i / 16 * TAU; B.push().at(Math.cos(an) * (R - 0.6), Math.sin(an) * (R - 0.6), 4).rotZ(an).rotY(Math.PI / 2); plastic(B, SP[i % 6]); B.cyl(1.4, 0, 5, 8); B.pop(); }
    /* the saucer itself, with its band and dots */
    matte(B, '#f6f3ec').shine(0.6);
    B.lathe([[0, 0], [8, 0.3], [14.5, 1.6], [18.6, 3.8], [R, 4.6, 1], [18.2, 5.3, 1], [14, 6.2], [9.6, 6.8], [0, 7]], 32);
    const band = par || cc >= 5 ? '#e7b53a' : b >= 4 ? (b >= 5 ? '#ff6fb5' : '#e8d24a') : '#4f86c6';
    B.push().at(0, 0, 5.7); B.color(band).shine(0.5); B.torus(15.6, 0.7, 36, 5); B.pop();
    matte(B, '#ffffff'); for (let i = 0; i < 12; i++){ const an = i / 12 * TAU; B.push().at(Math.cos(an) * 15.6, Math.sin(an) * 15.6, 6.4).sphere(0.75, 6, 4).pop(); }
    /* rim lights, blinking */
    const n = a >= 4 || par ? 12 : 8;
    for (let i = 0; i < n; i++){
      const an = i / n * TAU + 0.13;
      B.push().at(Math.cos(an) * 11.5, Math.sin(an) * 11.5, 6.6);
      B.part(null, time => Math.sin(time * 6 + i * 1.7) > -0.2); lit(B, SP[i % 6], 0.9); B.sphere(1.3, 8, 5); B.endPart();
      B.part(null, time => Math.sin(time * 6 + i * 1.7) <= -0.2); matte(B, '#8a9296'); B.sphere(1.3, 8, 5); B.endPart();
      B.pop();
    }
    /* fins, turrets and meatballs */
    if (a >= 3) for (const sd of [-1, 1]){ B.push().at(sd * (R + 0.5), 0, 4.4); plastic(B, '#ff6fb5'); B.scale(1, 0.55, 0.45).sphere(4.6, 14, 7); B.pop(); }
    if (cc >= 4 || par){
      const k = cc >= 5 || par ? 4 : 2;
      for (let i = 0; i < k; i++){ const an = i / k * TAU + Math.PI / 4; B.push().at(Math.cos(an) * (R - 2.5), Math.sin(an) * (R - 2.5), 5).rotZ(an); if (cc >= 5 || par) gold(B); else steel(B, '#c9d2d6'); B.dome(2.8, 12, 4); B.push().at(1, 0, 1.4).rotY(Math.PI / 2); steel(B, '#4b555a'); B.cyl(0.8, 0.7, 6, 8); B.pop(); B.pop(); }
    }
    if (b >= 1){ const m = b >= 3 ? 3 : 1; for (let i = 0; i < m; i++){ const an = Math.PI / 2 + (i - (m === 3 ? 1 : 0)) * 0.55; B.push().at(Math.cos(an) * 9, Math.sin(an) * 9, 8.4); matte(B, '#8a4a2a'); B.sphere(2.4, 12, 7); B.pop(); } }
    if (par){ B.push().at(0, 0, 4.6); gold(B); B.torus(R + 1, 0.8, 40, 5); B.pop(); }
    B.endPart();
    /* the teacup in the middle, which doesn't spin */
    B.push().at(0, 0, 6.8);
    B.body().shine(0.5); B.lathe([[4.6, 0], [6.8, 1.6], [8.8, 5.6], [9.4, 8.4, 1], [8.7, 8.4, 1], [8.1, 5.8], [6.2, 2.4]], 26, { caps: false });
    B.body(1.3).shine(0.6); B.push().at(0, 0, 2.4).disc(6.3, 22).pop();
    B.body().shine(0.5); B.push().at(9.9, 0, 4.4).rotX(Math.PI / 2).torus(2.9, 0.9, 14, 6, Math.PI * 1.2, -Math.PI * 0.6).pop();
    if (b >= 2 || cc >= 2){ B.push().at(0, 0, 2.5); lit(B, b >= 2 ? '#7ee07a' : '#7fd3ff', 0.9); B.dome(2.2, 12, 3); B.pop(); }
    B.pop();
    return B;
  }

  /* ---------------- Mandoline ---------------- */
  function carrotStar(B, r, isGold){
    B.color(isGold ? '#ffd166' : '#f39a2e').shine(0.4); slab(B, starPoly(r, r * 0.45, 5), 1.1);
    B.push().at(0, 0, 0.57); B.color(isGold ? '#fff4c2' : '#ffc46b'); B.disc(r * 0.36, 12); B.pop();
    return B;
  }
  function mandoline(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const ninja = b >= 3 || par, isGold = a >= 5 || par;
    /* legs at the back, the slicer leaning down to the front */
    steel(B, '#5c666b'); for (const sd of [-1, 1]) B.tube([[-12, sd * 8.5, 6.6], [-19, sd * 14, 0.5]], 0.8, 6);
    B.push().at(-1, 0, 3.6).rotY(0.17);
    B.body().shine(0.4); B.push().at(0, 0, 0).rbox(28, 22, 2.6, 4, 1).pop();
    if (c.gold || par){ B.push().at(0, 0, 2.6); gold(B); B.hoop(rrPts(28.6, 22.6, 4.3, 0, 3), 0.55, 5); B.pop(); }
    B.push().at(-1, 0, 2.62); B.body(ninja ? 0.75 : 1.18).shine(0.3); B.rbox(22, 16, 0.25, 3, 0); B.pop();
    /* the V blade, and the julienne teeth */
    if (isGold) gold(B); else steel(B, '#e6ecee');
    B.tube([[-3, -8, 3.1], [5, 0, 3.1], [-3, 8, 3.1]], 0.75, 6);
    if (a >= 4 || par) for (let i = -3; i <= 3; i++) B.push().at(-6.5, i * 2.2, 2.9).box(5, 0.8, 0.5).pop();
    else if (a >= 2) for (let i = -1; i <= 1; i++) B.push().at(-6, i * 3.2, 2.9).box(4, 0.8, 0.5).pop();
    /* the hand guard */
    B.push().at(-10, 0, 2.8); plastic(B, ninja ? '#26222e' : '#2a9d8f'); B.cyl(4, 3.8, 2.4, 16); B.at(0, 0, 2.4).dome(3.8, 14, 4); B.pop();
    /* a ninja's headband round it, its tails fluttering */
    if (ninja){
      const band = par ? '#ffd166' : '#d9332a';
      B.push().at(3, 0, -0.3); matte(B, band); B.rbox(3, 23, 3.4, 0.8, 0.3); B.pop();
      for (const sd of [-1, 1]){
        B.push().at(3, sd * 11.4, 1.6);
        B.part(time => ({ rz: sd * Math.sin(time * 9 + sd) * 0.15 }));
        matte(B, band); B.tube([[0, 0, 0], [-6, sd * 3, 0.4], [-11, sd * 2.4, 0.2], [-16, sd * 3.6, -0.5]], [0.9, 0.85, 0.8, 0.6], 5);
        B.endPart();
        B.pop();
      }
    }
    if ((cc >= 1 && cc < 3)){ B.push().at(8, -7, 3.4); B.color('#bfe9ff').shine(1).glow(0.1); B.sphere(2.3, 12, 8); B.pop(); }
    B.pop();
    /* a bottle of soy */
    if (b >= 4 || par){ B.push().at(-4, 15.5, 0); B.color('#3a2214').shine(0.7); B.lathe([[3, 0], [3.2, 5], [1.4, 8], [1.2, 9.4]], 14); B.at(0, 0, 9.4); plastic(B, '#d9332a'); B.cyl(1.4, 1.3, 1.6, 10); B.pop(); }
    /* a bundle of toothpicks, a tube of wasabi, blobs of it */
    if (cc === 2){ matte(B, '#d9b77a'); for (let i = 0; i < 3; i++) B.tube([[-5 + i * 3, -17, 0.5], [-3 + i * 3, -11.5, 0.5]], 0.4, 5); }
    if (cc >= 3 || par){ B.push().at(3, -15, 0); plastic(B, '#7ab648'); B.push().at(0, 0, 1.9).rotY(Math.PI / 2).at(0, 0, -6).scale(1, 1.4, 1).capsule(1.9, 12, 10).pop(); B.push().at(7.6, 0, 1.9).rotY(Math.PI / 2); matte(B, '#e6ecee'); B.cyl(1.4, 1.2, 2.6, 10); B.pop(); B.pop(); }
    if (cc >= 4 || par) for (let i = 0; i < (cc >= 5 || par ? 3 : 2); i++){ B.push().at(4 + i * 5.5, 15, 0); B.color('#8fd16a').shine(0.5); B.dome(2.6, 12, 4); B.pop(); }
    /* carrot stars ready to throw */
    const n = a >= 4 || par ? 3 : a >= 3 ? 2 : 1;
    B.part(null, ready);
    for (let i = 0; i < n; i++){ B.push().at(17, (i - (n - 1) / 2) * 7.5, 1.2); carrotStar(B, 3.7, isGold); B.pop(); }
    B.endPart();
    return B;
  }

  /* ---------------- Condiment Caddy ---------------- */
  function squeezeBottle(B, col, r, h){
    plastic(B, col); B.lathe([[r * 0.9, 0], [r, 0.6], [r, h], [r * 0.4, h + r * 1.1], [r * 0.18, h + r * 1.8]], 14);
    B.push().at(0, 0, h + r * 1.8); matte(B, '#f4efe6'); B.cyl(r * 0.18, r * 0.08, r * 0.9, 8); B.pop();
    return B;
  }
  function caddy(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const hot = a >= 5 || par;
    /* the tray */
    B.body().shine(0.55);
    B.lathe([[13, 0], [14, 0.6], [14, 3.4, 1], [13.2, 3.4, 1], [13, 1.2]], 30, { caps: false });
    B.push().at(0, 0, 1.2); B.body(0.75); B.disc(13.1, 28); B.pop();
    if (c.gold || par){ B.push().at(0, 0, 3.4); gold(B); B.torus(14, 0.7, 30, 5); B.pop(); }
    /* the bottles in it */
    if (a >= 3 && cc < 3){
      B.push().at(0, 0, 1.2);
      B.part((time, t) => ({ rz: t && t.fireAnim > 0 ? time * 18 : 0 }));
      for (let i = 0; i < 6; i++){ const an = i / 6 * TAU; B.push().at(Math.cos(an) * 7, Math.sin(an) * 7, 0); squeezeBottle(B, hot ? (i % 2 ? '#ff7a1a' : '#d9332a') : (i % 2 ? '#d9332a' : '#f2c230'), 2.8, 9); B.pop(); }
      B.endPart();
      B.pop();
    } else {
      const bs = cc >= 3 ? ['#f2c230', '#d9332a', '#f2c230'] : ['#d9332a', '#f2c230', '#d9332a', '#f2c230'];
      bs.forEach((bc, i) => { const an = i / bs.length * TAU + 0.6; B.push().at(Math.cos(an) * 6.5, Math.sin(an) * 6.5, 1.2); squeezeBottle(B, bc, 3.3, 9.5); B.pop(); });
    }
    /* the carrying handle arching over */
    steel(B, '#6b777c');
    { const pts = []; for (let i = 0; i <= 12; i++){ const q = i / 12 * Math.PI; pts.push([0, -Math.cos(q) * 12.6, 3 + Math.sin(q) * 19]); } B.tube(pts, 0.9, 6); }
    /* what it fires: squeeze bottles laid along the top, or a mustard shotgun */
    const fz = 17;
    if (cc >= 3){
      const sh = cc >= 5 || par ? '#ff7a1a' : '#f2c230';
      for (const y of [-2.6, 2.6]){ B.push().at(4, y, fz).rotY(Math.PI / 2); plastic(B, sh); B.cyl(2, 2, 18, 12); B.at(0, 0, 18.02); matte(B, '#3a220e'); B.disc(1.1, 10); B.pop(); }
      B.push().at(3.5, 0, fz - 2.5); matte(B, '#7a4a20'); B.rbox(8, 9.2, 4.6, 2, 1); B.pop();
      if (cc >= 4 || par){ plastic(B, '#f2c230'); for (let i = 0; i < 5; i++) B.push().at(-11 + i * 2.6, 9.5 - Math.abs(i - 2) * 0.8, 4).sphere(1.2, 8, 5).pop(); }
    } else {
      const n = a >= 4 || par ? 2 : 1;
      for (let i = 0; i < n; i++){
        const y = n === 2 ? (i ? 4.2 : -4.2) : 0;
        B.push().at(2, y, fz).rotY(Math.PI / 2);
        plastic(B, hot ? '#ff7a1a' : '#d9332a'); B.capsule(3.2, 13.5, 14);
        B.push().at(0, 0, 13); matte(B, '#f4efe6'); B.cyl(2.2, 0.6, 6, 12); B.pop();
        B.pop();
      }
      if (hot) for (let i = 0; i < 2; i++){
        B.push().at(22, 0, fz);
        B.part(time => { const k = cycle(time, 2, i * 0.5); return { x: k * 4, y: Math.sin(time * 9 + i) * 2, s: 1 - k * 0.8 }; });
        B.color('#ffaa3c', 0.8).glow(0.85); B.sphere(2.2, 10, 6);
        B.endPart();
        B.pop();
      }
    }
    /* the sharpshooter: a scope, a long rifle bottle, a sheriff's star */
    if (b >= 1){ B.push().at(-4, 0, fz + 4.4).rotY(Math.PI / 2); matte(B, '#2e3437'); B.cyl(1.6, 1.6, 10, 12); B.at(0, 0, 10.02); lit(B, '#7fd3ff', 0.5); B.disc(1.3, 10); B.pop(); B.push().at(1, 0, fz + 2.4); matte(B, '#2e3437'); B.box(1.4, 1.4, 2.2); B.pop(); }
    if (b >= 3 || par){ B.push().at(-3, 10.5, 9).rotY(Math.PI / 2); B.color(b >= 5 || par ? '#ffd166' : '#f2c230').shine(0.5); B.cyl(1.6, 1.4, 27, 10); B.pop(); }
    if (b >= 4 || par){ B.push().at(-10.5, -10.5, 2.4).rotZ(-Math.PI * 0.75).rotX(-Math.PI / 2 + 0.2); lit(B, '#ffd166', 0.25); B.at(0, 0, -0.4).extrude(starPoly(4, 1.8, 5), 0.8); B.pop(); }
    /* the cowboy hat */
    if (cc >= 1){
      const hc = cc >= 5 ? '#3a2e2a' : '#8a5a2b';
      B.push().at(-6, 0, 13.6);
      matte(B, hc); B.push().scale(1, 0.82, 1).lathe([[0, 0], [5, 0], [8.4, 0.6], [9.4, 1.8, 1], [9, 2, 1], [8, 1.2], [4.6, 0.8], [0, 0.8]], 24, { caps: false }).pop();
      matte(B, cc >= 5 ? '#4a3c36' : '#a06a35'); B.push().scale(1, 0.82, 1).lathe([[4.6, 0.6], [4.8, 3], [4.2, 5.4], [2, 6.2], [0, 5.4]], 18).pop();
      if (cc >= 2){ B.push().at(0, 0, 1.4); matte(B, '#d9332a'); B.scale(1, 0.82, 1).cyl(4.85, 4.8, 1.2, 18); B.pop(); }
      B.pop();
    }
    if (cc >= 5 || par) puffs(B, 3, -14, 0, 8, 14, 3, '#5a3c3c', 0.35, 0.7);
    return B;
  }

  /* ---------------- Saucepan ---------------- */
  function saucepan(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const R = 14 + (a >= 1 || par ? 1.5 : 0), p = par ? -2 : L3().dominant(c.up), tier = p >= 0 ? c.up[p] : 0;
    const sauce = par ? '#ffcf4d' : p === 0 ? (tier >= 5 ? '#b8501a' : tier >= 4 ? '#8a1a14' : '#d9332a') : p === 1 ? (tier >= 4 ? '#7bc043' : '#efd98a') : p === 2 ? (tier >= 5 ? '#9b6ad9' : '#e8b52a') : b >= 1 ? '#cfd96a' : '#e8d48a';
    const H = 11;
    /* the handle */
    B.push().rotZ(2.45).at(R - 1.5, 0, H - 2.2).rotY(Math.PI / 2 - 0.12);
    if (par) gold(B); else plastic(B, '#2e3437');
    B.push().scale(1, 1, 1).push().scale(1.05, 0.65, 1).capsule(2.6, 16.5, 12).pop().pop();
    B.push().at(0, 0, 14.5); steel(B, '#c9d2d6'); B.push().rotX(Math.PI / 2).at(0, 0, -1.8).cyl(0.9, 0.9, 3.6, 8).pop(); B.pop();
    B.pop();
    /* the pot */
    if (par) gold(B); else B.body().shine(0.7);
    B.lathe([[R - 1, 0], [R, 1], [R, H], [R + 0.6, H + 0.6, 1], [R - 0.4, H + 0.8, 1], [R - 0.9, H - 0.6]], 32, { caps: false });
    B.disc(R - 0.9, 28);
    /* the sauce, simmering */
    B.push().at(0, 0, H - 1.6); B.color(sauce).shine(0.75).glow(par ? 0.3 : 0.05); B.disc(R - 0.85, 30); B.pop();
    for (let i = 0; i < 4; i++){
      const an = i * 1.9, rr2 = (R - 6) * 0.7;
      B.push().at(Math.cos(an) * rr2, Math.sin(an) * rr2, H - 1.6);
      B.part(time => { const k = cycle(time, 0.9, i * 0.27); return { s: 0.3 + k * 1.1 }; }, time => cycle(time, 0.9, i * 0.27) < 0.85);
      B.color('#ffffff', 0.45).shine(1); B.dome(1.8, 10, 3);
      B.endPart();
      B.pop();
    }
    /* a dipping cup on the rim */
    if (a >= 2){ B.push().at(R * 0.68, -R * 0.68, H - 1); matte(B, '#f4efe6'); B.lathe([[1.8, 0], [3.4, 0.6], [3.8, 3.4]], 14, { caps: true }); B.at(0, 0, 3); matte(B, '#d9332a'); B.disc(3.3, 12); B.pop(); }
    /* what floats in it */
    const top = H - 1.4;
    if (p === 0 && tier >= 3){ B.push().at(-3, 3, top).rotZ(0.6); plastic(B, tier >= 4 ? '#5a0a0a' : '#e2231a'); B.push().at(-5, 0, 0.6).rotY(Math.PI / 2).lathe([[0, 0], [1.6, 1.5], [1.4, 7], [0.4, 10.5], [0, 11]], 10).pop(); matte(B, '#4f9a45'); B.push().at(-6.4, 0, 0.6).rotY(-Math.PI / 2).cyl(0.7, 0.5, 2, 6).pop(); B.pop(); }
    if ((p === 0 && tier >= 4) || par) puffs(B, 3, 0, -R + 4, H, 16, 3, '#ffffff', 0.35, 0.8);
    if (b >= 2 && !(p === 1 && tier >= 3)) for (let i = 0; i < 2; i++){ B.push().at(-4 + i * 7, 4 - i * 6, top).rotZ(0.5 + i); B.color('#6f9f34').shine(0.4); B.scale(2.8, 1.5, 1.1).sphere(1, 12, 6); B.pop(); }
    if (p === 1 && tier === 3){ B.push().at(0, 0, top); B.part(time => ({ s: 1 + Math.sin(time * 2) * 0.05 })); B.color('#f4d97a').shine(0.4); B.scale(1, 0.94, 0.55).dome(R - 5, 22, 6); B.endPart(); B.pop(); }
    if (p === 1 && tier >= 4){
      const big = tier >= 5, ey = big ? 3.2 : 2.6;
      for (const sd of [-1, 1]){
        B.push().at(sd * 4, -2, top + ey * 0.4); matte(B, '#ffffff'); B.sphere(ey, 14, 8);
        B.part(time => ({ x: Math.sin(time * 1.5) * 0.6 })); matte(B, '#1d2b14'); B.push().at(0, ey * 0.55, ey * 0.62).sphere(ey * 0.45, 10, 6).pop(); B.endPart();
        B.pop();
      }
      if (big){ matte(B, '#ffffff'); for (let i = -2; i <= 2; i++) B.push().at(i * 2.2, 4.4, top).rotX(Math.PI).at(0, 0, -2.2).cyl(0.9, 0, 2.2, 6).pop(); }
    }
    /* a whisk going round */
    if (cc >= 1){
      B.push().at(0, 0, top - 0.5);
      B.part(time => ({ rz: time * 6 }));
      steel(B, '#dce2e6'); for (let i = 0; i < 3; i++) B.push().rotZ(i * 1.05).at(0, 0, 4).rotX(Math.PI / 2).scale(0.45, 1.2, 1).torus(4, 0.25, 16, 4).pop();
      steel(B, '#9aa6ab'); B.tube([[0, 0, 8.6], [0, 0, 14]], 0.7, 6);
      B.endPart();
      B.pop();
    }
    if (cc >= 2) for (let i = 0; i < 3; i++){ const an = 0.4 + i * 0.5; B.push().at(Math.cos(an) * (R + 0.4), Math.sin(an) * (R + 0.4), H - 2.5 - i * 0.8); B.color(sauce).shine(0.7); B.scale(0.8, 0.8, 1.5).sphere(1.4, 8, 6); B.pop(); }
    if (cc >= 3 || par){
      B.push().at(0, 0, top + 0.1);
      B.part(time => ({ rz: time * 0.6 }));
      for (let i = 0; i < 5; i++){ const an = i * 1.3; B.push().at(Math.cos(an) * (R - 6), Math.sin(an) * (R - 6) * 0.8, 0).rotZ(an); lit(B, i % 2 ? '#ffd166' : '#fff4c2', 0.35); B.box(3.2, 2, 0.3); B.pop(); }
      B.endPart();
      B.pop();
    }
    if (cc >= 5){ B.push().at(R + 2.5, 8.5, 0); B.color('#9b6ad9', 0.75).shine(1); B.lathe([[3.4, 0], [3.8, 3], [2, 6.5], [1.2, 8.5]], 14); B.pop(); B.push().at(R + 2.5, 8.5, 8.4); matte(B, '#c9a36a'); B.cyl(1.3, 1.4, 1.8, 8); B.pop(); }
    /* the ladle: resting in the pot, raised once it has thrown */
    B.push().at(0, 0, top);
    B.part((time, t) => t && t.fireAnim > 0 ? { rz: -0.9, ry: -0.35, z: 3 } : { rz: -0.2, ry: 0 });
    if (a >= 5 || par) gold(B); else steel(B, '#dfe7ea');
    B.tube([[-3, 0, 1.2], [R - 2, 0, 5], [R + 6, 0, 10]], 0.85, 6);
    B.push().at(-3, 0, 0.6).lathe([[0, -1.6], [2.4, -1], [3.6, 0.8], [3.6, 1.1, 1]], 14, { caps: false }).pop();
    B.endPart();
    B.pop();
    /* the Philosopher's Stone, floating over the pot */
    if (par){
      B.push().at(0, -2, H + 9);
      B.part(time => ({ z: Math.sin(time * 2.4) * 1.2, rz: time * 1.3 }));
      lit(B, '#e2231a', 0.55); B.push().scale(1, 1, 1.5).sphere(4.2, 4, 2).pop();
      B.endPart();
      B.pop();
    }
    return B;
  }

  /* ---------------- Kitchen Bot ---------------- */
  function bot(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const isGold = par || a >= 5;
    B.prep(spinner('tread', 6));
    /* treads */
    for (const y of [-11, 11]){
      B.push().at(-1, y, 0); matte(B, '#2e3437'); B.rbox(25, 4.4, 5.4, 2.2, 1.2);
      B.push().at(0, y > 0 ? 2.25 : -2.25, 2.7).rotX(y > 0 ? -Math.PI / 2 : Math.PI / 2); steel(B, '#596268'); for (const x of [-8, 0, 8]) B.push().at(x, 0, 0).cyl(1.6, 1.6, 0.4, 10).pop(); B.pop();
      B.pop();
    }
    /* the body */
    B.body().shine(0.5); B.push().at(-1, 0, 3).rbox(22, 20, 9, 5, 2).pop();
    if (par){ B.push().at(-1, 0, 12); gold(B); B.hoop(rrPts(22.6, 20.6, 5.2, 0, 3), 0.6, 5); B.pop(); }
    /* the nail gun(s) */
    const n = cc >= 3 || par ? 2 : 1, L = cc >= 1 || par ? 16 : 13;
    for (let i = 0; i < n; i++){
      const y = n === 2 ? (i ? 3.4 : -3.4) : 0;
      B.push().at(4, y, 8.2).rotY(Math.PI / 2);
      if (isGold) gold(B); else steel(B, '#5c666b');
      B.push().scale(1, 1, 1).rbox(4.4, 4.8, L, 1.6, 0.6).pop();
      B.at(0, 0, L); B.color(cc >= 5 || par ? '#ffd166' : '#d9b77a').shine(0.4); B.cyl(0.7, 0.3, 4, 6);
      B.pop();
    }
    /* the head: a dome with two eyes and an antenna */
    const eye = b >= 4 || par ? '#7fd3ff' : '#2a9d8f';
    B.push().at(-3, 0, 12);
    if (isGold) gold(B); else B.color('#e6ecee').shine(0.7);
    B.cyl(7, 7, 1.4, 22); B.at(0, 0, 1.4).dome(7, 22, 7);
    for (const sd of [-1, 1]){ B.push().at(5.3, sd * 2.4, 3.6); lit(B, eye, 0.75); B.scale(0.6, 1, 1).sphere(1.6, 10, 6); B.pop(); }
    steel(B, '#5c666b'); B.tube([[-3, 0, 5], [-7, -3, 11]], 0.45, 5);
    B.push().at(-7, -3, 11.6);
    B.part(null, time => isGold || Math.sin(time * 6) > 0); lit(B, isGold ? '#ffd166' : '#e2383f', 0.85); B.sphere(1.8, 10, 6); B.endPart();
    B.part(null, time => !isGold && Math.sin(time * 6) <= 0); B.color('#ff9a8a').shine(0.4).glow(0.2); B.sphere(1.8, 10, 6); B.endPart();
    B.pop();
    /* the coil round its head */
    if (b >= 4 || par){ B.part(time => ({ rz: time * 3 })); lit(B, '#7fd3ff', 0.8); const pts = []; for (let i = 0; i < 12; i++){ const q = i / 12 * TAU; pts.push([Math.cos(q) * (9 + (i % 2) * 2), Math.sin(q) * (9 + (i % 2) * 2), 3]); } B.hoop(pts, 0.4, 4); B.endPart(); }
    B.pop();
    /* sentries: a salt shaker, a sprocket, shaker caps */
    if (a >= 1 && a < 4){ B.push().at(-10, 7, 12); matte(B, '#f4f7f8'); B.cyl(3, 3, 4.6, 14); B.at(0, 0, 4.6); steel(B, '#c9d2d6'); B.dome(3, 14, 4); B.pop(); }
    if (a >= 3){
      B.push().at(5, -10.2, 9.5).rotX(Math.PI / 2);
      B.part(time => ({ rz: time * 4 }));
      B.color('#e0a32e').shine(0.7); B.at(0, 0, -0.8).extrude(starPoly(4.6, 3.4, 6, 0), 1.6); B.at(0, 0, 1.6); matte(B, '#7a5410'); B.disc(1.2, 8);
      B.endPart();
      B.pop();
    }
    if (a >= 4) ['#f4f7f8', '#3d3a38', '#bfe9ff', '#ffd166'].forEach((col, i) => { B.push().at(-11 + (i % 2) * 5, 4 + Math.floor(i / 2) * 4.2, 12); plastic(B, col); B.dome(2.1, 12, 4); B.pop(); });
    /* service: a wrench, a tank of foam */
    if (b >= 1 && b < 3){ B.push().at(2, 7.5, 12.05).rotZ(0.3); steel(B, '#9aa6ab'); B.push().at(-0.5, 0, 0).box(9, 1.8, 0.8).pop(); B.push().at(5, 0, 0).cyl(2, 2, 0.8, 10).pop(); B.pop(); }
    if (b >= 3){ B.push().at(-4.5, 13, 3); matte(B, '#f4f7f8'); B.rbox(9, 6, 6, 2.5, 1.5); B.at(0, 0, 6); matte(B, '#ffffff'); for (let i = 0; i < 3; i++) B.push().at(-2.6 + i * 2.6, 0, 0.4).sphere(1.2 + (i % 2) * 0.4, 8, 5).pop(); B.pop(); }
    /* traps: a cage on its back */
    if (cc >= 4){
      const s2 = cc >= 5 ? 1.25 : 1;
      B.push().at(-10, -1, 12).scale(s2);
      matte(B, '#3d4549'); B.hoop([[-3.5, -4.5, 0], [3.5, -4.5, 0], [3.5, 4.5, 0], [-3.5, 4.5, 0]], 0.4, 4); B.hoop([[-3.5, -4.5, 6], [3.5, -4.5, 6], [3.5, 4.5, 6], [-3.5, 4.5, 6]], 0.4, 4);
      steel(B, '#8e9aa0'); for (const [x, y] of [[-3.5, -4.5], [3.5, -4.5], [3.5, 4.5], [-3.5, 4.5], [0, -4.5], [0, 4.5], [-3.5, 0], [3.5, 0]]) B.tube([[x, y, 0], [x, y, 6]], 0.3, 4);
      B.pop();
    }
    return B;
  }

  /* ---------------- Pet Basket ---------------- */
  function fish3d(B, tier, isGold){
    const R = tier >= 4 ? 7.5 : tier >= 3 ? 6.8 : 6;
    B.push().at(0, 0, R);
    B.part(time => ({ x: Math.sin(time * 4) * 1.4, rz: Math.cos(time * 4) * 0.35 }));
    const fc = isGold ? '#ffd166' : tier >= 4 ? '#7d8f9a' : tier >= 2 ? '#8a7a5a' : '#f39a2e';
    plastic(B, fc); B.push().scale(tier >= 4 ? 4.6 : 3.4, tier >= 4 ? 2 : 1.7, tier >= 4 ? 2.4 : 2).sphere(1, 12, 7).pop();
    B.push().at(tier >= 4 ? -4.4 : -3.2, 0, 0).rotY(-Math.PI / 2).scale(0.35, 1, 1).cyl(2.2, 0.2, 2.8, 8).pop();
    if (tier >= 4){ B.push().at(0.5, 0, 2).rotY(-0.5).scale(1, 0.3, 1).cyl(1.6, 0.2, 2.6, 6).pop(); }
    matte(B, '#1d2b33'); for (const sd of [-1, 1]) B.push().at(tier >= 4 ? 3.4 : 2.2, sd * 1.1, 0.5).sphere(0.45, 6, 4).pop();
    if (tier >= 5 || isGold){ matte(B, '#ffffff'); for (let i = 0; i < 3; i++) B.push().at(2.8 + i * 0.6, 0, -0.9).box(0.3, 1.6, 0.9).pop(); }
    B.endPart();
    B.color('#4aa8dc', 0.38).shine(0.9); B.push().scale(1, 1, 0.82).sphere(R * 0.92, 18, 9).pop();
    B.color('#e8f6fc', 0.2).shine(1); B.sphere(R, 20, 10);
    B.pop();
    return B;
  }
  function cat3d(B, tier, isGold){
    const fur = isGold ? '#ffd166' : tier >= 4 ? '#2a2630' : tier >= 2 ? '#c9853a' : '#e8a050';
    const s2 = tier >= 4 ? 1.2 : 1;
    B.push().scale(s2);
    matte(B, fur);
    B.push().at(0, 1.5, 3).scale(6.4, 4.6, 3.6).sphere(1, 16, 8).pop();
    B.push().at(5, 3, 2.4);
    B.part(time => ({ rz: Math.sin(time * 3) * 0.4 }));
    B.tube([[0, 0, 0], [3, 2, 0.4], [3.5, -1.5, 0.8], [2, -3.5, 1]], [1, 0.9, 0.8, 0.6], 6);
    B.endPart();
    B.pop();
    B.push().at(-3.5, -2.2, 6.2);
    B.sphere(3.6, 14, 8);
    for (const sx of [-1, 1]) B.push().at(0.6, sx * 2.2, 2.4).rotX(-sx * 0.35).cyl(1.4, 0, 2.6, 6).pop();
    if (tier >= 3 && tier < 4 && !isGold){ matte(B, '#8a5a2b'); for (let i = 0; i < 3; i++) B.push().at(-1 + i * 1.3, 0, 3.55).box(0.5, 4, 0.1).pop(); }
    for (const sx of [-1, 1]){ B.push().at(-2.6, sx * 1.4, 0.8); if (tier >= 4) lit(B, '#ffd166', 0.6); else matte(B, '#2e7d32'); B.sphere(0.75, 8, 5); B.pop(); }
    if (tier >= 5 || isGold){ matte(B, '#ffffff'); for (const sx of [-1, 1]) B.push().at(-3.2, sx * 0.7, -0.8).rotX(Math.PI).cyl(0.4, 0, 1.6, 5).pop(); }
    B.pop();
    B.pop();
    return B;
  }
  function bird3d(B, tier, isGold){
    const fe = isGold ? '#ffd166' : tier >= 5 ? '#c96a2a' : tier >= 4 ? '#5a3a1e' : tier >= 3 ? '#8a5a2e' : tier >= 2 ? '#a08060' : '#9a7a5a';
    const s2 = tier >= 5 || isGold ? 1.35 : tier >= 4 ? 1.15 : 1;
    B.push().scale(s2);
    matte(B, fe);
    B.push().at(0, 0, 3.2).scale(5, 3.2, 3.2).sphere(1, 14, 8).pop();
    for (const sd of [-1, 1]){
      B.push().at(-0.5, sd * 2.4, 4.4);
      B.part(time => ({ rx: sd * (0.35 + Math.sin(time * 5) * 0.4) }));
      matte(B, Art.look3d.shade(fe, -0.15)); B.push().at(-1, sd * 2.6, 0).scale(2.4, 3.4, 0.7).sphere(1, 10, 5).pop();
      B.endPart();
      B.pop();
    }
    B.push().at(-4.6, 0, 3.6).rotY(-Math.PI / 2 - 0.3).scale(0.35, 1, 1); matte(B, fe); B.cyl(2.4, 0.4, 3.4, 6); B.pop();
    B.push().at(4.2, 0, 5.6); matte(B, tier >= 4 && !isGold ? '#f4efe6' : fe); B.sphere(2.6, 12, 7);
    B.push().at(2.2, 0, -0.2).rotY(Math.PI / 2); matte(B, '#f2c230'); B.cyl(0.9, 0, 2.4, 6); B.pop();
    matte(B, '#1d2b33'); for (const sd of [-1, 1]) B.push().at(1.4, sd * 1.6, 0.7).sphere(0.5, 6, 4).pop();
    if (tier === 2){ B.push().at(1.6, -1.6, 0.8).rotZ(Math.PI / 2).rotX(Math.PI / 2); steel(B, '#f2c230'); B.torus(1.4, 0.2, 12, 3); B.pop(); }
    B.pop();
    matte(B, '#f2a020'); for (const sd of [-1, 1]) B.tube([[0, sd * 1.2, 0], [0.5, sd * 1.2, 0.4], [0.5, sd * 1.2, 1.4]], 0.3, 4);
    B.pop();
    return B;
  }
  function pets(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const isGold = par;
    /* the broom, lying against it */
    B.push().rotZ(-0.7);
    matte(B, '#8a5a2b'); B.tube([[-2, -10.5, 10], [-2, -26, 2.6]], 0.9, 6);
    B.push().at(-2, -30, 0).rotZ(Math.PI); B.color('#e8c25a').shine(0.1); B.extrude([[-5, -4], [5, -4], [7, 4], [-7, 4]], 3); B.pop();
    B.push().at(-2, -26.6, 0.4); matte(B, '#a87a2a'); B.rbox(10, 1.6, 2.6, 0.6, 0.3); B.pop();
    B.pop();
    /* the basket: an oval of wicker with a rim, a red cushion inside */
    B.push().scale(1, 13 / 16, 1);
    B.body().shine(0.15);
    B.lathe([[13.5, 0], [15.2, 2], [16, 6.8], [16.6, 7.6, 1], [15.4, 8.2, 1], [14.6, 6.2]], 30, { caps: false });
    B.disc(13.6, 26);
    B.body(0.78); for (const z of [2.2, 4.6]) B.push().at(0, 0, z).torus(15.7, 0.5, 30, 4).pop();
    B.body(1.05); B.push().at(0, 0, 7.7).torus(16, 0.9, 32, 6).pop();
    if (par){ B.push().at(0, 0, 8.4); gold(B); B.torus(16.2, 0.8, 32, 5); B.pop(); }
    B.push().at(0, 0, 4.4); plastic(B, par ? '#a8272c' : '#c9363a'); B.scale(12, 11.4, 2.4).dome(1, 22, 5); B.pop();
    matte(B, '#ffffff'); for (let i = 0; i < 6; i++) B.push().at(-7 + (i % 3) * 7, -4 + Math.floor(i / 3) * 8, 6.62).disc(0.9, 8).pop();
    B.pop();
    const z0 = 5.6;
    if (a >= 1 || par){ B.push().at(b >= 1 || cc >= 1 || par ? -5 : 0, b >= 1 || cc >= 1 || par ? 2.5 : 0, z0 - 0.6); fish3d(B, par ? 5 : a, isGold); B.pop(); }
    if (b >= 1 || par){ B.push().at(a >= 1 || par ? 5 : 1, a >= 1 || par ? -1 : 1, z0); cat3d(B, par ? 5 : b, isGold); B.pop(); }
    if (cc >= 1 || par){ B.push().at(9, -10, 8.6).rotZ(-0.4); bird3d(B, par ? 5 : cc, isGold); B.pop(); }
    if (a === 0 && b === 0 && cc === 0 && !par){ B.push().at(2, 2, z0).rotZ(0.4); matte(B, '#f4efe6'); B.scale(6, 4, 1.8).dome(1, 14, 4); B.pop(); }
    return B;
  }

  /* ---------------- Lobster Tank ---------------- */
  function lobster(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const water = par ? '#3a6aa8' : a >= 3 ? (a >= 4 ? '#3a2a6a' : '#2a4a7a') : b >= 3 ? '#9fd8f0' : '#6fbfe0';
    const red = par ? '#ffcf4d' : '#e2463a';
    /* the base and frame of the tank */
    matte(B, par ? '#a57412' : '#3d4a52'); B.rbox(30.6, 30.6, 1.8, 5.2, 0.5);
    B.push().at(0, 0, 16); if (par) gold(B); else steel(B, '#8aa4b0'); B.hoop(rrPts(30, 30, 5, 0, 3), 0.7, 5); B.pop();
    /* gravel, and the rock the lobster sits on */
    for (let i = 0; i < 14; i++){ const an = i * 2.4, r = 4 + (i * 3.7) % 9; B.push().at(Math.cos(an) * r, Math.sin(an) * r, 2); matte(B, i % 2 ? '#f0dcb4' : '#d8c49a'); B.sphere(1.2, 6, 4); B.pop(); }
    B.push().at(-2, 0, 1.8); matte(B, '#7d8a90'); B.scale(1.4, 1.1, 0.9).dome(5.4, 14, 5); B.pop();
    /* the abyss: tentacles, then an eye */
    if (a >= 3 || par){
      for (let i = 0; i < 3; i++){
        const x0 = -9 + i * 7;
        B.push().at(x0, 9, 1.8);
        B.part(time => ({ rz: Math.sin(time * 2 + i) * 0.4, rx: Math.sin(time * 1.6 + i) * 0.15 }));
        lit(B, a >= 4 || par ? '#b06ad9' : '#d98ad9', 0.2); B.tube([[0, 0, 0], [1, -1, 4], [3, -2, 8], [4, -1, 11], [3, 1, 12]], [1.3, 1.1, 0.9, 0.6, 0.3], 6);
        B.endPart();
        B.pop();
      }
      if (a >= 5 || par){ B.push().at(-6, 7, 3.4); lit(B, '#ffd166', 0.3); B.sphere(2.6, 12, 7); matte(B, '#1d1030'); B.push().at(0.6, 1.4, 1.6).scale(0.3, 1, 1).sphere(1.4, 8, 5).pop(); B.pop(); }
    }
    /* the lobster, on its rock, claws up out of the water */
    B.push().at(1.5, 0, 7.2).scale(0.82);
    matte(B, red).shine(0.45);
    for (let i = 1; i <= 3; i++) B.push().at(-1.2 - i * 3.4, 0, -0.6 * i).scale(2.6 - i * 0.25, 3.6 - i * 0.4, 2 - i * 0.2).sphere(1, 12, 6).pop();
    B.push().at(-12.6, 0, -2.4).rotY(-0.2); B.extrude([[0, 0], [-3.6, -3.4], [-4.2, 0], [-3.6, 3.4]], 0.8); B.pop();
    B.push().at(2, 0, 0.4).scale(5.4, 4.4, 3.4).sphere(1, 16, 9).pop();
    if (b >= 4){ B.push().at(2, 0, 0.6); lit(B, b >= 5 ? '#ffd166' : '#bfe9ff', 0.25); B.scale(5.9, 4.9, 3.7).sphere(1, 16, 8, true); B.pop(); }
    if (b === 3){ B.color('#e6f6ff').shine(0.8).glow(0.2); for (let i = -1; i <= 1; i++) B.push().at(2 + i * 2.2, 0, 3.4).cyl(0.9, 0, 3, 6).pop(); }
    matte(B, red); for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) B.tube([[i * 2 - 1, sd * 3.4, -0.4], [i * 2 - 2, sd * 6.5, -2.4], [i * 2 - 2.6, sd * 7, -5.2]], 0.42, 4);
    for (const sd of [-1, 1]) B.tube([[6.4, sd * 1.2, 1.2], [11, sd * 4, 4.6], [14, sd * 9, 5]], 0.3, 4);
    matte(B, '#1d2b33'); for (const sd of [-1, 1]) B.push().at(6, sd * 1.6, 2.4).sphere(0.75, 8, 5).pop();
    /* the claws: the big one holds a fork */
    for (const sd of [-1, 1]){
      const big = sd > 0;
      B.push().at(5.6, sd * 3.6, 0.8).rotZ(sd * 0.35);
      matte(B, red); B.tube([[0, 0, 0], [3, 0, 4.5], [5.6, 0, 9.6]], 1, 6);
      B.push().at(8, 0, 10.6).scale(big ? 4 : 3, big ? 2.6 : 2, big ? 2.2 : 1.7).sphere(1, 14, 7).pop();
      B.push().at(11.2, sd * (big ? 0.9 : 0.7), 10.6).rotZ(-sd * 0.25).scale(big ? 2.4 : 1.8, big ? 1 : 0.8, big ? 1 : 0.8).sphere(1, 8, 5).pop();
      B.pop();
    }
    B.part(null, ready);
    B.push().at(8.6, 6.2, 11.6);
    steel(B, b >= 4 || par ? '#bfe9ff' : '#dfe7ea'); B.tube([[0, 0, 0], [8, 0, 0]], 0.45, 5);
    for (const dy of [-0.9, 0, 0.9]) B.tube([[8, dy, 0], [10.6, dy, 0]], 0.25, 4);
    B.tube([[8, -0.9, 0], [8, 0.9, 0]], 0.3, 4);
    B.pop();
    B.endPart();
    B.pop();
    /* ice cubes, bubbles, a conch on the rim */
    if (b >= 2) for (const [x, y] of [[-8, -8], [7, 8]]){ B.push().at(x, y, 13.4).rotZ(x * 0.1); B.color('#e6f8ff', 0.7).shine(1); B.rbox(5, 5, 4.4, 1, 0.8); B.pop(); }
    for (let i = 0; i < 3; i++){
      B.push().at(-8 + i * 6, -6, 2.5);
      B.part(time => { const k = cycle(time, 0.8, i * 0.33); return { z: k * 11, s: 0.6 + k * 0.8 }; });
      B.color('#ffffff', 0.5).shine(1); B.sphere(0.9, 8, 5);
      B.endPart();
      B.pop();
    }
    if (cc >= 3){ B.push().at(10, -10, 16.6).rotZ(-0.4).rotY(Math.PI / 2 - 0.2); B.color(cc >= 5 ? '#ffd166' : '#ffd6e4').shine(0.6); B.lathe([[0, 0], [3, 1.4], [3.2, 2.6], [1.6, 5.4], [0, 7]], 12); B.pop(); }
    /* the water, and the glass */
    B.push().at(0, 0, 1.8); B.color(water, a >= 3 || par ? 0.55 : 0.42).shine(0.6); B.rbox(27.4, 27.4, 12.4, 3.6, 0.3); B.pop();
    B.push().at(0, 0, 1.8); B.color(par ? '#ffd166' : '#c8ebf8', par ? 0.32 : 0.2).shine(1); B.rbox(30, 30, 14.2, 5, 0.4); B.pop();
    return B;
  }
  /* the siren's sonar rings and its note, over the tank */
  function lobsterAfter(g, t, time, sc, up){
    if (t.icon || !up) return;
    const cc = up[2];
    const lf = Art.look3d.lowFx();
    if (cc >= 1 && !lf){ const k = (time * 0.6) % 1; circle(g, 0, -4, 6 + k * 14); g.strokeStyle = 'rgba(255,170,200,' + (0.6 * (1 - k)).toFixed(3) + ')'; g.lineWidth = 1.2; g.stroke(); }
    if (cc >= 4) Art.look3d.musicNote(g, -10, -20 + Math.sin(time * 3) * 1.5, 1, cc >= 5 ? '#ffd166' : '#ff8fc7');
  }

  /* ---------------- Chess Set ---------------- */
  const cub = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
  /* a turned profile ([r, z] from the foot up) from the flat art's right-half outline */
  function halfProfile(half, upto){
    const out = [];
    let px = half[0][0], py = half[0][1];
    out.push([px, 1.1 - py]);
    for (let i = 1; i < half.length && (upto == null || i <= upto); i++){
      const s = half[i];
      if (s.length === 2){ px = s[0]; py = s[1]; out.push([px, 1.1 - py, 1]); }
      else { for (let k = 1; k <= 5; k++){ const t = k / 5; out.push([cub(px, s[0], s[2], s[4], t), 1.1 - cub(py, s[1], s[3], s[5], t)]); } px = s[4]; py = s[5]; }
    }
    return out;
  }
  const PROF = {};
  function pieceProfile(kind){
    if (PROF[kind]) return PROF[kind];
    const H = Art.look3d.PIECE_HALF;
    let p;
    if (kind === 'rook') p = halfProfile(H.rook, 7).concat([[8.7, 24.4, 1], [6.2, 24.4, 1], [6.2, 22.8, 1], [0, 22.8]]);
    else if (kind === 'queen' || kind === 'king') p = halfProfile(H.queen, 9).concat([[7.6, 29.4, 1], [3.4, 28.6, 1], [0, 28.6]]);
    else if (kind === 'knight') p = halfProfile(Art.look3d.FOOT.concat([[0, -3.9]]));
    else p = halfProfile(H[kind]);
    return PROF[kind] = p;
  }
  /* the knight's head in profile (x, height), facing -x */
  let KNIGHT = null;
  function knightOutline(){
    if (KNIGHT) return KNIGHT;
    const segs = [[7.6, -9.0, 8.2, -15.0, 6.2, -20.6], [5.2, -23.6, 3.4, -25.6, 1.0, -26.6], [1.7, -29.7], [-0.8, -27.2], [-1.0, -29.5], [-2.6, -26.6],
      [-5.4, -25.6, -8.0, -23.0, -9.6, -19.4], [-10.4, -17.8, -10.0, -16.0, -8.4, -15.6], [-7.0, -15.2, -5.6, -16.2, -4.2, -16.0], [-2.6, -14.4, -4.4, -10.8, -5.6, -8.4], [-6.4, -6.6, -6.6, -5.0, -6.2, -3.9]];
    let px = 6.2, py = -3.9;
    const out = [[px, 1.1 - py]];
    for (const s of segs){
      if (s.length === 2){ px = s[0]; py = s[1]; out.push([px, 1.1 - py]); }
      else { for (let k = 1; k <= 5; k++){ const t = k / 5; out.push([cub(px, s[0], s[2], s[4], t), 1.1 - cub(py, s[1], s[3], s[5], t)]); } px = s[4]; py = s[5]; }
    }
    out.pop();
    return KNIGHT = out;
  }
  /* a chess piece standing at the origin; its body takes the set's colour (col overrides it) */
  function piece3d(B, kind, o){
    o = o || {};
    const paint = () => { if (o.col) B.color(o.col).shine(0.55).glow(0); else B.body().shine(0.55).glow(0); };
    paint();
    B.lathe(pieceProfile(kind), 22);
    const dark = () => B.color(o.col ? Art.look3d.shade(o.col, -0.45) : '#7a6a4e').shine(0.2).glow(0);
    if (kind === 'pawn'){ paint(); B.push().at(0, 0, 20.5).sphere(5.1, 18, 10).pop(); }
    else if (kind === 'rook'){
      paint(); for (let i = 0; i < 6; i++){ const q = i / 6 * TAU; B.push().at(Math.cos(q) * 7.3, Math.sin(q) * 7.3, 24.4).rotZ(q).box(2.8, 3.6, 2.7).pop(); }
      dark(); B.push().at(0, 7.5, 13).rotX(-Math.PI / 2 - 0.08).flat(rect(-1.1, -2.2, 2.2, 4.4)).pop();
      if (o.trim){ B.push().at(0, 0, 19.6); gold(B); B.torus(8.1, 0.65, 24, 5); B.pop(); }
      if (o.flag){ B.push().at(0, 0, 27); matte(B, '#4a3020'); B.cyl(0.45, 0.45, 7, 6); B.pop(); B.push().at(0, 0, 33.4); B.part(time => ({ rz: Math.sin(time * 6) * 0.3 })); B.rotX(Math.PI / 2); matte(B, '#e2383f'); B.at(0, 0, -0.2).extrude([[0, 0], [7.5, -1.2], [0, -3.4]], 0.4); B.endPart(); B.pop(); }
    } else if (kind === 'bishop'){
      if (o.glow) lit(B, '#ffd166', 0.8); else dark();
      B.push().at(1, 0, 24.2).rotY(-0.75).box(0.9, 6.4, 6.4).pop();
      if (o.trim) gold(B); else paint();
      B.push().at(0, 0, 32.4).sphere(1.9, 10, 6).pop();
      if (o.trim){ B.push().at(0, 0, 18.4); gold(B); B.torus(3.4, 0.55, 18, 4); B.pop(); }
    } else if (kind === 'queen'){
      for (let i = 0; i < 8; i++){ const q = i / 8 * TAU; B.push().at(Math.cos(q) * 7.4, Math.sin(q) * 7.4, 30.4); if (o.trim) lit(B, '#ffe08a', 0.3); else paint(); B.sphere(1.15, 8, 5); B.pop(); }
      paint(); B.push().at(0, 0, 28.6).scale(1, 1, 0.66).dome(3.8, 16, 5).pop(); B.push().at(0, 0, 33.4).sphere(2.2, 12, 7).pop();
      if (o.gem){ B.push().at(0, 4.6, 25.4); lit(B, '#9b5de5', 0.4); B.sphere(1.5, 10, 6); B.pop(); }
    } else if (kind === 'king'){
      if (o.trim) gold(B); else paint();
      B.push().at(0, 0, 28.4).cyl(7.2, 7.4, 1.6, 20).pop();
      paint(); B.push().at(0, 0, 29.6).scale(1, 1, 0.75).dome(4.6, 16, 5).pop();
      if (o.trim) gold(B); else paint();
      B.push().at(0, 0, 37).box(1.8, 1.8, 6).pop(); B.push().at(0, 0, 38).box(5.6, 1.8, 1.8).pop();
    } else if (kind === 'knight'){
      paint();
      B.push().rotX(Math.PI / 2).at(0, 0, -3).extrude(knightOutline(), 6).pop();
      B.color(o.gold ? '#c99a1c' : (o.col ? Art.look3d.shade(o.col, -0.3) : '#bfae88')).shine(0.3);
      B.tube([[6.8, 0, 10], [5.6, 0, 18], [3.6, 0, 24], [1.6, 0, 27.4]], 1.5, 6);
      matte(B, '#2a1a12'); for (const sd of [-1, 1]) B.push().at(-4.5, sd * 3.05, 22.7).sphere(0.95, 8, 5).pop();
      if (o.bridle){
        matte(B, '#5c3418'); B.hoop([[-3, -3.2, 24.7], [-8.4, -3.2, 18], [-8.4, 3.2, 18], [-3, 3.2, 24.7]], 0.45, 4);
        B.push().at(0, 0, 5.2); B.color(o.gold ? '#9b5de5' : '#2a9d8f').shine(0.3); B.cyl(7.2, 6.8, 3, 18); B.pop();
      }
      if (o.armor){
        B.color(o.gold ? '#f2c14e' : '#c9d2d6').shine(0.85);
        for (const sd of [-1, 1]) B.push().at(-5.6, sd * 3.1, 21.8).rotX(sd * Math.PI / 2).at(0, 0, -0.35).extrude([[2.6, 3.2], [-0.4, 3.6], [-3.4, 1.4], [-3.6, -0.6], [-1, -0.4], [1.8, 1.4]], 0.7).pop();
        lit(B, o.gold ? '#9b5de5' : '#e2383f', 0.15); B.tube([[1.2, 0, 28.4], [4, 0, 32], [7.6, 0, 33], [9.4, 0, 31.4]], [1.2, 1.3, 1, 0.4], 6);
      }
      if (o.crown){ B.push().at(-0.4, 0, 27.6); gold(B); B.cyl(2.6, 3, 1.6, 10); for (let i = 0; i < 5; i++){ const q = i / 5 * TAU; B.push().at(Math.cos(q) * 2.6, Math.sin(q) * 2.6, 1.6).cyl(0.7, 0, 2.2, 5).pop(); } B.pop(); }
    }
    return B;
  }
  function chessMain(up){ let p = -1, m = 0; for (let i = 0; i < 3; i++) if (up[i] > m){ m = up[i]; p = i; } return p; }
  const CH_KIND = ['rook', 'bishop', 'knight'];
  function chess(B, c){
    const up = c.up, par = c.par, L = Art.look3d;
    /* the square of board: a wooden frame round sixteen squares */
    matte(B, L.CH_WOOD).shine(0.3); B.rbox(34, 34, 3.4, 2.5, 0.8);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++){ B.push().at(-11.25 + i * 7.5, -11.25 + j * 7.5, 3.4); B.color((i + j) % 2 ? L.CH_DARK : L.CH_LIGHT).shine(0.35); B.box(7.5, 7.5, 0.2); B.pop(); }
    if (par || c.gold){ B.push().at(0, 0, 3.7); gold(B); B.hoop([[-15, -15, 0], [15, -15, 0], [15, 15, 0], [-15, 15, 0]], 0.5, 4); B.pop(); }
    B.anchor(10);
    const hop = (time, t) => ({ z: t && t.fireAnim > 0 ? Math.sin(Math.min(1, Math.max(0, t.fireAnim / 0.2)) * Math.PI) * 2.4 : t && t.fire2 > 0 ? Math.sin(Math.min(1, Math.max(0, t.fire2 / 0.3)) * Math.PI) * 2.6 : 0 });
    /* a knight turns to face what it attacks */
    const faceAim = (time, t) => ({ rz: t && t.aimed && t.aim != null ? GL3D.turnFor(t.aim, 0) + Math.PI : 0 });
    const place = (kind, x, y, k, o, main) => {
      B.push().at(x, y, 3.6);
      if (main) B.part(hop);
      if (kind === 'knight') B.part(faceAim);
      B.scale(k);
      piece3d(B, kind, o);
      if (kind === 'knight') B.endPart();
      if (main) B.endPart();
      B.pop();
    };
    if (par){
      B.push().at(0, 0, 3.75); lit(B, '#d7a6ff', 0.6); B.scale(1, 0.9, 1).torus(12.4, 0.6, 30, 4); B.pop();
      place('queen', 0, 0, 0.94, { trim: true, gem: true }, true);
      return B;
    }
    const p = chessMain(up);
    if (p < 0){ place('pawn', 0, 0, 0.95, {}, true); return B; }
    const tier = up[p], kind = CH_KIND[p];
    let q = -1;
    for (let i = 0; i < 3; i++) if (i !== p && up[i] > 0) q = i;
    if (kind === 'rook'){
      if (tier >= 5){ place('king', -8, -7, 0.62, { trim: true }); place('rook', 2, 1.5, 1.04, { trim: true, flag: true }, true); }
      else if (tier >= 3){ place('king', -6.5, -6, 0.76, { trim: tier >= 4 }); place('rook', 4, 2.5, 0.88, { trim: tier >= 4 }, true); }
      else place('rook', 0, 0, 0.98, {}, true);
    } else if (kind === 'bishop'){
      if (tier >= 5){
        B.push().at(0, 0, 3.6 + 26.5); B.part(hop); B.part(time => ({ rz: time * 0.8 })); lit(B, '#ffd166', 0.85); B.torus(8.2, 0.5, 26, 4); B.endPart(); B.endPart(); B.pop();
        place('queen', -8, -7, 0.64, { trim: true, gem: true });
        place('bishop', 2, 1.5, 1.02, { trim: true, glow: true }, true);
      } else if (tier >= 3){ place('bishop', -6.5, -6, 0.8, { glow: tier >= 4, col: L.CH_EBONY }); place('bishop', 4, 2.5, 0.88, { glow: tier >= 4 }, true); }
      else place('bishop', 0, 0, 0.95, {}, true);
    } else {
      const o = { bridle: tier >= 3, armor: tier >= 4, gold: tier >= 5, crown: tier >= 5 };
      if (tier >= 5) o.col = L.mixHex('#f2c14e', '#ffffff', 0.25);
      place('knight', 0, 0, tier >= 5 ? 1.06 : 0.98, o, true);
    }
    if (q >= 0) place(CH_KIND[q], 10.5, 10.5, 0.5, {});
    return B;
  }

  /* ---------------- Chopsticks ---------------- */
  /* one chopstick along +x from its back end at the origin, L long and w thick, tapering to its tip */
  function stick3d(B, L, w, pal, o){
    o = o || {};
    const r0 = w / 2, r1 = w * 0.2, tp = 0.26, xt = L * (1 - tp), rt = r0 + (r1 - r0) * (1 - tp), sh = o.shine == null ? 0.35 : o.shine;
    B.color(pal.c).shine(sh).glow(0); B.tube([[0, 0, 0], [xt, 0, 0]], [r0, rt], 8);
    B.color(o.tip || pal.tip || pal.c).shine(sh).glow(0); B.tube([[xt, 0, 0], [L, 0, 0]], [rt, r1], 8);
    if (pal.node){ B.color(pal.node).shine(0.3); for (const q of [0.24, 0.52]){ const r = r0 + (r1 - r0) * q; B.push().at(L * q, 0, 0).rotY(Math.PI / 2).torus(r * 1.02, 0.22, 10, 3).pop(); } }
    const band = o.band || pal.band;
    if (band){ B.color(band).shine(0.8).glow(0); B.push().at(L * 0.09, 0, 0).rotY(Math.PI / 2).at(0, 0, -0.65).cyl(r0 * 1.07, r0 * 1.05, 1.3, 10).pop(); }
    return B;
  }
  /* a bamboo leaf lying flat */
  function leaf3d(B){ B.color('#6fae3a').shine(0.3).glow(0); slab(B, [[-4.5, 0], [-2, -1.6], [0, -2.2], [2, -1.6], [4.5, 0], [2, 1.6], [0, 2.2], [-2, 1.6]], 0.3); return B; }
  /* the rest the sticks lie on: its long side across them, centred on (x, 0), H tall */
  function rest3d(B, kind, x, hl, H){
    B.push().at(x, 0, 0);
    if (kind === 'bamboo'){
      const r = H / 2;
      B.color('#8fbf5a').shine(0.45).glow(0); B.push().at(0, 0, r).rotX(Math.PI / 2).at(0, 0, -hl).cyl(r, r, hl * 2, 16).pop();
      B.color('#4f7f2c').shine(0.3); for (const y of [-hl * 0.42, hl * 0.42]) B.push().at(0, y, r).rotX(Math.PI / 2).torus(r * 1.03, 0.32, 16, 3).pop();
      B.color('#c9e2a0').shine(0.2); for (const sd of [-1, 1]) B.push().at(0, sd * hl, r).rotX(-sd * Math.PI / 2).disc(r * 0.72, 14).pop();
    } else if (kind === 'lacquer' || kind === 'ebony'){
      B.color('#2a2220').shine(0.75).glow(0); B.rbox(7.2, hl * 2, H, 2.2, 1);
      if (kind === 'lacquer'){ B.push().at(0, 0, H + 0.02); B.color('#b8282c').shine(0.8); B.flat(rrPts(5, hl * 2 - 2.2, 1.4, 0, 3).map(p => [p[0], p[1]])); B.pop(); }
      else { gold(B); for (const sd of [-1, 1]) B.push().at(0, sd * (hl - 1.1), -0.05).box(7.4, 2.2, H + 0.15).pop(); }
    } else if (kind === 'ingot'){
      gold(B); B.push().scale(1.1, hl / 5.2, 1).lathe([[0, 0], [4.4, 0.3], [5.2, 1.8], [4.8, 3.4, 1], [3.4, 3.2], [2.6, 3.8], [1.6, 5], [0, 5.3]], 24).pop();
    } else if (kind === 'jade'){
      B.color('#3fae8a').shine(0.7).glow(0.05); B.rbox(8, hl * 2 + 1.2, H, 3.2, 1.4);
      gold(B); for (const sd of [-1, 1]) B.push().at(0, sd * (hl - 0.3), -0.05).box(8.2, 1.8, H + 0.15).pop();
    } else {
      /* porcelain, in the appliance's own colour (a skin changes it), with a blue pattern */
      B.body().shine(0.75); B.rbox(7.2, hl * 2, H, 3.4, 1.7);
      B.push().at(0, 0, H + 0.02); B.color('#4f86c6').shine(0.3);
      for (const y of [-hl * 0.55, 0, hl * 0.55]) B.push().at(0, y, 0).flat([[-2, -0.4], [0, 0.6], [2, -0.4], [2, 0.3], [0, 1.3], [-2, 0.3]]).pop();
      B.pop();
    }
    B.pop();
    return B;
  }
  function chopsticks(B, c){
    const L = L3(), S = L.chopStyle(c.up, c.par), pal = L.STICK_PAL[S.pal];
    const RX = 3, hl = S.pairs > 1 ? 11 : 9, RH = 5, back = -16, pivot = -15, bg = 3.2, open = 2.55;
    const shine = S.pal === 'gold' || S.pal === 'grand' ? 0.85 : S.pal === 'lacquer' || S.pal === 'ebony' ? 0.7 : 0.3;
    const o = { tip: S.tips ? '#f2c14e' : null, band: S.band ? '#b8282c' : null, shine };
    rest3d(B, S.rest, RX, hl, RH);
    if (S.leaf) for (const [x, y, a, s] of [[RX + 3.5, hl + 1.5, 0.6, 0.85], [RX + 6, hl - 1, -0.3, 0.7]]){ B.push().at(x, y, 0.3).rotZ(a).scale(s); leaf3d(B); B.pop(); }
    /* the sticks: back ends on the floor, lying over the rest, their tips raised past it; each closes on a pinch and
       darts forward on a flick */
    const z0 = S.w / 2, pitch = Math.atan2(RH, RX - back);
    const fan = S.pairs === 3 ? [-0.3, 0, 0.3] : S.pairs === 2 ? [-0.16, 0.16] : [0];
    for (const fa of fan){
      B.push().at(pivot, 0, 0).rotZ(fa).at(-pivot, 0, 0);
      for (const sd of [-1, 1]){
        const x0 = back + (sd > 0 ? 1.2 : 0), Ls = (S.len - (sd > 0 ? 1 : 0) - x0) / Math.cos(pitch);
        B.push().at(x0, sd * bg, z0).rotZ(Math.atan2(sd * (open - bg), Ls)).rotY(-pitch);
        B.part((time, t) => { const sh = L.chopShut(t); return { x: sh * 3 + L.chopJab(t), rz: -sd * sh * 0.062 }; });
        stick3d(B, Ls, S.w, pal, o);
        B.endPart();
        B.pop();
      }
      B.pop();
    }
    /* Ebony Tongs: a steel spring joins the back ends; the Legend hangs a red tassel off it */
    if (S.p === 1 && S.tier >= 4){
      steel(B, '#aeb8bc'); B.tube([[back + 1.5, -bg, z0 + 0.3], [back - 2.5, -bg - 0.6, z0 + 0.8], [back - 4.6, 0, z0 + 1.1], [back - 2.5, bg + 0.6, z0 + 0.8], [back + 2.5, bg, z0 + 0.3]], 0.8, 6);
      if (S.tier >= 5){
        matte(B, '#c9282c'); for (const d of [-1.6, -0.5, 0.6, 1.7]) B.tube([[back - 4.8, 0, z0 + 0.6], [back - 7, d * 0.8, 0.9], [back - 10.5, d * 1.6, 0.35]], 0.35, 4);
        gold(B); B.push().at(back - 4.8, 0, z0 + 0.9).sphere(1.3, 10, 6).pop();
      }
    }
    /* Golden Dragon: the back ends carved as dragon heads */
    if (S.p === 2 && S.tier >= 5) for (const sd of [-1, 1]){
      B.push().at(back - 1.2 + (sd > 0 ? 1.2 : 0), sd * bg, z0 + 0.3).rotZ(Math.PI + sd * 0.25);
      gold(B); B.push().scale(1.5, 1, 0.9).sphere(1.9, 12, 7).pop();
      for (const s2 of [-1, 1]) B.push().at(-1.4, s2 * 1, 1).rotY(-0.9).cyl(0.5, 0, 2.6, 6).pop();
      lit(B, '#d9332a', 0.3); for (const s2 of [-1, 1]) B.push().at(1.6, s2 * 0.9, 0.9).sphere(0.42, 6, 4).pop();
      B.pop();
    }
    /* Bamboo Tempest: leaves whirl round it */
    if (S.p === 0 && S.tier >= 5){
      B.push().at(2, 0, 9); B.part(time => ({ rz: time * 1.6 }));
      for (let i = 0; i < 5; i++){ B.push().rotZ(i / 5 * TAU).at(18, 0, (i % 2) * 2).rotZ(Math.PI / 2).rotX(0.45); leaf3d(B); B.pop(); }
      B.endPart(); B.pop();
    }
    if (c.par){
      B.push().at(2, 0, 10); B.part(time => ({ rz: time * 2.2 }));
      for (let i = 0; i < 2; i++){ B.push().rotZ(i * Math.PI).at(24, 0, 0); lit(B, '#fff6c2', 0.9); B.sphere(1.2, 8, 5); B.pop(); }
      B.endPart(); B.pop();
    }
    B.extent(32, 17);
    return B;
  }

  /* ---------------- Lazy Susan ---------------- */
  function susan(B, c){
    const [a, b, cc] = c.up, par = c.par, L = L3();
    const n = par ? 4 : 1 + (b >= 1 ? 1 : 0) + (b >= 3 ? 1 : 0);
    const R = 23, foot = 2.2, bear = 1.5, th = b >= 2 || par ? 3.6 : 2.8, z1 = foot + bear, top = z1 + th;
    /* the foot, and the bearing the board turns on (its balls show on Smooth Bearings) */
    matte(B, '#4a3424'); B.cyl(14, 13, foot, 28);
    steel(B, '#8e989c'); B.push().at(0, 0, foot).cyl(12, 12, bear, 28).pop();
    if (a >= 1 || par){ steel(B, '#eef3f5'); for (let i = 0; i < 16; i++){ const q = i / 16 * TAU; B.push().at(Math.cos(q) * 12.2, Math.sin(q) * 12.2, foot + bear / 2).sphere(0.8, 8, 5).pop(); } }
    /* Centrifuge: a blue glow round the board's edge */
    if (a >= 5 && !par){ B.push().at(0, 0, z1 + th / 2); lit(B, '#7fd3ff', 0.8); B.torus(R + 0.5, 0.65, 48, 4); B.pop(); }
    /* the board's top sits on the turntable's spot, where its riders stand */
    B.anchor(top);
    B.extent(25.5, top + 18);
    B.part((time, t) => ({ rz: (t && t.spinA) || 0 }));
    B.push().at(0, 0, z1);
    B.body().shine(0.25); B.lathe([[0, 0], [R - 0.8, 0], [R, 0.7], [R, th - 0.7], [R - 0.7, th], [0, th]], 48);
    B.at(0, 0, th);
    /* the lip round its edge: steel on Whirling Platter, gold on Grand Banquet, a carousel's red and cream panels */
    if (par){
      for (let i = 0; i < 16; i++){ B.push().rotZ((i + 0.5) / 16 * TAU).at(R - 1.7, 0, 0); B.color(i % 2 ? '#fff3dc' : '#c9363a').shine(0.45); B.box(2, 2 * Math.PI * (R - 1.7) / 16 + 0.05, 1); B.pop(); }
      B.push().at(0, 0, 1); gold(B); B.torus(R - 0.7, 0.4, 48, 4); B.torus(R - 2.7, 0.4, 48, 4); B.pop();
    } else {
      if (a >= 4) steel(B, '#c9d2d6'); else if (b >= 5) gold(B); else B.body(0.78).shine(0.3);
      B.torus(R - 1.6, b >= 2 ? 1.1 : 0.8, 48, 5);
    }
    /* rings of grain, and streaks that show it turning */
    B.body(0.84).shine(0.1); for (const r of [5.5, 10, 14.5, 18.5]) B.push().at(0, 0, 0.03).annulus(r - 0.22, r + 0.22, 40).pop();
    B.body(0.7).shine(0.1); for (const [r, a0, a1] of [[16.5, 0.3, 1.1], [8, 2.2, 3.0], [12.5, 4.1, 4.6], [19.8, 3.3, 3.8]]) B.push().at(0, 0, 0.05).scale(1, 1, 0.3).torus(r, 0.4, 10, 3, a1 - a0, a0).pop();
    /* Extra Leaf: the seam where the two halves meet */
    if (b >= 1 && !par){ B.body(0.55); B.push().at(0, 0, 0.06).flat(rect(-R + 2, -0.35, 2 * (R - 2), 0.7)).pop(); }
    /* Banquet Board: a lace doily round the edge */
    if (b >= 3 && !par){
      const outer = [], inner = [];
      for (let i = 0; i < 48; i++){ const q = i / 48 * TAU, r = 20.6 + (i % 2 ? 0 : 1.1); outer.push([Math.cos(q) * r, Math.sin(q) * r]); inner.push([Math.cos(q) * 17.4, Math.sin(q) * 17.4]); }
      B.push().at(0, 0, 0.08); B.color('#fffcf4').shine(0.1).glow(0.05); B.strip(outer, inner);
      B.body(); B.at(0, 0, 0.02); for (let i = 0; i < 24; i++){ const q = (i + 0.5) / 24 * TAU; B.push().at(Math.cos(q) * 19.3, Math.sin(q) * 19.3, 0).disc(0.65, 8).pop(); }
      B.pop();
    }
    /* Spin Cycle: a blue spiral inlaid in it; Sauce Cyclone: a swirl of sauce */
    if (!par && (a >= 3 || cc >= 4)){
      const sauce = cc >= 4 && cc >= a, pts = [];
      for (let i = 0; i <= 40; i++){ const q = i / 40, an = q * TAU * 1.5, r = 3 + q * 15.5; pts.push([Math.cos(an) * r, Math.sin(an) * r, 0.1]); }
      if (sauce) B.color(L.SAUCE_COL[cc]).shine(0.7).glow(0); else B.color('#4f86c6').shine(0.5).glow(0.1);
      B.push().scale(1, 1, 0.5); B.tube(pts, sauce ? 0.9 : 0.42, 5); B.pop();
    }
    /* the seats, marked out */
    if (par) B.color('#8a1a1e').shine(0.2); else B.body(0.62).shine(0.1);
    for (let i = 0; i < n; i++){ const q = i / n * TAU, r = n > 1 ? L.SEAT_RING[n] : 0; B.push().at(Math.cos(q) * r, Math.sin(q) * r, 0.1).annulus(7.15, 7.75, 32).pop(); }
    /* sauce cups between the seats; drips over the edge on Sticky Glaze; a gravy boat on Saucier Supreme */
    if (cc >= 1 && !par){
      const m = n === 3 ? 3 : 4, col = L.SAUCE_COL[cc];
      for (let i = 0; i < m; i++){
        const q = (i + 0.5) / m * TAU, x = Math.cos(q) * 18.5, y = Math.sin(q) * 18.5;
        if (cc >= 3){
          B.color(col).shine(0.7).glow(0);
          B.push().at(Math.cos(q) * 22.4, Math.sin(q) * 22.4, 0.1).scale(1.5, 1, 0.7).sphere(1.3, 8, 5).pop();
          B.push().at(Math.cos(q) * 23.1, Math.sin(q) * 23.1, -1.4).scale(0.8, 0.8, 1.6).sphere(0.9, 8, 5).pop();
        }
        B.push().at(x, y, 0);
        if (cc >= 5 && i === 0){
          B.rotZ(q + Math.PI / 2);
          B.color('#f6f1e6').shine(0.75).glow(0); B.push().scale(1.55, 1, 1).lathe([[0, 0], [2.6, 0.2], [3.3, 1.6], [3.2, 2.8, 1], [2.8, 2.8], [2.2, 1.2], [0, 1.2]], 18).pop();
          B.push().at(4.6, 0, 2.2).rotY(Math.PI / 2).at(0, 0, -0.6).cyl(1.1, 0.5, 2.6, 8).pop();
          B.push().at(-4.8, 0, 1.8).rotX(Math.PI / 2).torus(1.6, 0.4, 10, 4, Math.PI, Math.PI / 2).pop();
          B.color('#7a3a14').shine(0.8); B.push().at(0, 0, 2.3).scale(1.5, 1, 1).disc(2.6, 14).pop();
        } else {
          B.color('#f6f1e6').shine(0.75).glow(0); B.lathe([[0, 0], [2.9, 0], [3.4, 2.3], [3.6, 2.6, 1], [3.1, 2.6], [2.7, 0.9], [0, 0.9]], 16);
          B.color(col).shine(0.75); B.push().at(0, 0, 1.9).disc(2.85, 14).pop();
          if (cc >= 2 && i === 1){
            B.push().at(Math.cos(q + 1.4) * 5, Math.sin(q + 1.4) * 5, 0.9).rotZ(q).rotY(Math.PI / 2).at(0, 0, -3);
            B.color('#d9332a').shine(0.6); B.capsule(0.9, 6, 8); B.color('#4f9a45').shine(0.3); B.push().at(0, 0, -0.8).cyl(0.35, 0.35, 1.2, 6).pop();
            B.pop();
          }
        }
        B.pop();
      }
    }
    /* the carousel: brass poles between the seats, and a crown with a pennant in the middle */
    if (par){
      for (let i = 0; i < 4; i++){
        const q = (i + 0.5) / 4 * TAU;
        B.push().at(Math.cos(q) * 19.5, Math.sin(q) * 19.5, 0);
        gold(B); B.cyl(0.95, 0.95, 15, 10); B.torus(1.6, 0.45, 12, 4); B.push().at(0, 0, 16).sphere(1.9, 12, 7).pop();
        B.color('#c9363a').shine(0.5); for (const z of [4, 8, 12]) B.push().at(0, 0, z).torus(1.05, 0.35, 10, 3).pop();
        B.pop();
      }
      gold(B); B.push().scale(1, 1, 0.7).dome(5, 18, 6).pop(); B.push().at(0, 0, 3.4).cyl(0.5, 0.2, 7, 6).pop();
      B.push().at(0, 0, 10); B.part(time => ({ rz: Math.sin(time * 5) * 0.25 })); B.rotX(Math.PI / 2); matte(B, '#c9363a'); B.at(0, 0, -0.2).extrude([[0, 0], [7.5, -1.2], [0, -3.2]], 0.4); B.endPart(); B.pop();
    } else if (b >= 4 && n >= 3){
      /* the Two-Tier Stand: a little cake up on a stand in the middle */
      steel(B, '#c9d2d6'); B.cyl(1.2, 1.2, 5, 10);
      B.push().at(0, 0, 5); B.color('#f6f1e6').shine(0.7); B.lathe([[0, 0], [6.8, 0.2], [7.6, 0.9, 1], [7, 0.9], [0, 0.7]], 24);
      if (b >= 5){ gold(B); B.push().at(0, 0, 0.8).torus(7.3, 0.35, 32, 4).pop(); }
      B.color('#f4b8c8').shine(0.35); B.push().at(0, 0, 0.7).cyl(5.2, 5.2, 3.4, 24).pop();
      B.color('#ffffff').shine(0.4); B.push().at(0, 0, 4.1).torus(3.6, 0.5, 18, 4).pop();
      B.color('#d9232a').shine(0.8); B.push().at(0.4, -0.4, 5).sphere(1.5, 10, 6).pop();
      B.pop();
    } else if (n > 1){ steel(B, '#c9d2d6'); B.cyl(3, 2.6, 0.9, 16); B.push().at(0, 0, 0.9).scale(1, 1, 0.4).dome(2.6, 14, 4).pop(); }
    else { B.body(0.7).shine(0.2); B.push().at(0, 0, 0.06).disc(1.7, 12).pop(); }
    B.pop();
    B.endPart();
    return B;
  }
  /* the air streaming past a fast turntable's edge, and in the shop two arrows to show it turns */
  function susanAfter(g, t, time, sc, up){
    const a = up ? up[0] : 0, R = 23 * sc, CT = GL3D.CT, LK = Art.look3d;
    g.save(); g.scale(1, CT); g.lineCap = 'round';
    if (t.icon){
      g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = 2;
      for (const a0 of [0.35, 0.35 + Math.PI]){
        const r = R - 6.5;
        g.beginPath(); g.arc(0, 0, r, a0, a0 + 1.5); g.stroke();
        const ex = Math.cos(a0 + 1.5) * r, ey = Math.sin(a0 + 1.5) * r, ta = a0 + 1.5 + Math.PI / 2;
        g.beginPath(); g.moveTo(ex + Math.cos(ta - 2.5) * 4, ey + Math.sin(ta - 2.5) * 4); g.lineTo(ex, ey); g.lineTo(ex + Math.cos(ta + 2.5) * 4, ey + Math.sin(ta + 2.5) * 4); g.stroke();
      }
    } else if ((a >= 2 || t.paragon) && !LK.lowFx()){
      const spin = t.spinA || 0;
      g.lineWidth = 1.4; g.strokeStyle = t.paragon ? 'rgba(255,209,102,0.75)' : a >= 5 ? 'rgba(127,211,255,0.75)' : 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 3; i++){ const an = spin + i * TAU / 3; g.beginPath(); g.arc(0, 0, R + 2.8, an - 0.9, an); g.stroke(); }
    }
    g.restore();
  }

  /* ---------------- Head Chefs ---------------- */
  function chef(B, c){
    const t = c.t, L = Art.look3d.CHEF_LOOK[t.type] || Art.look3d.CHEF_LOOK.chef_blaze, lvl = c.lvl || 1;
    const g10 = lvl >= 10, top = lvl >= 20, big = L.big ? 1.12 : 1;
    const skin = L.skin, skinD = Art.look3d.shade(L.skin, -0.25);
    /* the round mat in the chef's colour */
    B.color(L.scarf).shine(0.25); B.cyl(16.5, 16.5, 1.2, 36);
    B.push().at(0, 0, 1.22); B.color(Art.look3d.mixHex(L.scarf, '#ffffff', 0.45)).glow(0.1);
    for (let i = 0; i < 16; i++) B.push().rotZ(i / 16 * TAU).flat(rect(12.9, -1.3, 1.1, 2.6)).pop();
    B.pop();
    B.push().at(-1, 0, 1.2).scale(big);
    /* the body: a jacket (or Nonna's cardigan), buttons down the front */
    B.body().shine(0.3);
    B.push().at(-1.5, 0, 0).scale(1.05, 1.32, 1).lathe([[6.2, 0], [8.2, 1.4], [9, 6], [8.6, 10], [7, 12.6], [4, 13.8], [0, 14]], 22).pop();
    if (!L.shawl){ steel(B, '#aab4b9'); for (const sy of [-2.4, 2.4]) for (const z of [5, 8.5]) B.push().at(7.6, sy, z).sphere(0.75, 8, 5).pop(); }
    /* at the collar: a scarf, a bow tie, a brooch, or Bruno's apron */
    if (L.shawl){ B.push().at(7.4, 0, 11.2); gold(B); B.sphere(1.6, 10, 6); B.pop(); }
    else if (L.big){
      B.push().at(7.4, 0, 1.6).rotY(Math.PI / 2 - 0.1); matte(B, '#f1e6d6'); B.at(0, 0, -0.4).rbox(10, 11, 0.9, 1.6, 0.3); B.pop();
      matte(B, '#7a4a28'); for (const z of [3.6, 6, 8.4]) B.push().at(8.2, 0, z).box(0.3, 10, 0.6).pop();
      B.push().at(1.5, 0, 12.4); B.color(L.scarf).shine(0.3); B.scale(1, 1.25, 1).torus(5.2, 1.3, 18, 6); B.pop();
    } else if (t.type === 'chef_penny'){
      B.push().at(7.6, 0, 11.6).rotY(Math.PI / 2); gold(B); B.at(0, 0, -0.6).extrude([[0, 0], [-1.8, 3.6], [1.8, 3.6], [0, 0], [-1.8, -3.6], [1.8, -3.6]].slice(0, 3), 1.2); B.at(0, 0, 0).extrude([[0, 0], [-1.8, -3.6], [1.8, -3.6]], 1.2); B.at(0, 0, 0.6).sphere(1.2, 8, 5); B.pop();
    } else {
      B.push().at(1.5, 0, 12.4); B.color(L.scarf).shine(0.3); B.scale(1, 1.25, 1).torus(5.2, 1.3, 18, 6); B.pop();
      B.push().at(6.2, 0, 11.2).rotY(Math.PI / 2 - 0.5); B.color(L.scarf).shine(0.3); B.at(0, 0, -0.7).extrude([[0, -3], [4.4, 0], [0, 3]], 1.4); B.pop();
    }
    /* the left arm resting forward */
    B.body().shine(0.3); B.tube([[-1, -9.6, 11.6], [4, -10.4, 9.6], [8.6, -10.2, 8.6]], 2.6, 10);
    B.push().at(9.6, -10, 8.4); B.color(skin).shine(0.2); B.sphere(2.3, 10, 6); B.pop();
    /* the right arm holding the item out, pushing it forward to throw */
    B.part((time, tt) => ({ x: tt && tt.fireAnim > 0 ? 3 : 0 }));
    B.body().shine(0.3); B.tube([[-1, 9.6, 11.6], [5, 10.4, 10.6], [10.6, 10.2, 10.2]], 2.6, 10);
    B.push().at(11.6, 10, 10.2); B.color(skin).shine(0.2); B.sphere(2.3, 10, 6); B.pop();
    B.push().at(12.5, 10, 10.6);
    const notFired = (time, tt) => !(tt && tt.fireAnim > 0);
    if (L.item === 'pan'){
      matte(B, '#2e3437'); B.tube([[-1, 0, 0], [5, -0.6, 0.4]], 0.9, 6);
      B.push().at(9.5, -1.5, 0.2); steel(B, '#3d4549'); B.lathe([[0, 0], [5.4, 0.2], [5.8, 1.6, 1], [5.2, 1.6, 1], [4.8, 0.6], [0, 0.6]], 18); B.pop();
      B.push().at(9.5, -1.5, 0.9); flame(B, 7, 2.6, '#ffb347', '#ffe08a', 0); B.pop();
      B.part(null, notFired); B.push().at(9.5, -0.6, 1.4).rotZ(-0.4).rotY(Math.PI / 2).at(0, 0, -3); plastic(B, '#d9332a'); B.lathe([[0, 0], [1.2, 1], [1.1, 4.6], [0.3, 6.4], [0, 6.6]], 8); B.pop(); B.endPart();
    } else if (L.item === 'cone'){
      B.push().rotY(Math.PI / 2).at(0, 0, -1); matte(B, '#e0a956'); B.cyl(0.4, 3.2, 8.5, 12); B.pop();
      B.part(null, notFired);
      const SC = Art.look3d.SCOOP_COLORS;
      for (let i = 0; i < 4; i++){ B.part(null, (time, tt) => (((tt && tt.id) || 0) + Math.floor(time * 0.5)) % 4 === i); B.color(SC[i]).shine(0.4); B.push().at(10, 0, 0).sphere(4, 12, 8).pop(); B.endPart(); }
      B.endPart();
    } else if (L.item === 'coin'){
      B.push().at(6, 0, 1);
      B.part(time => ({ rz: time * 3 + ((c.t && c.t.id) || 0) }));
      gold(B); B.rotX(Math.PI / 2).at(0, 0, -0.6).cyl(4.4, 4.4, 1.2, 20); B.at(0, 0, 1.22); B.color('#a57412').shine(0.5); B.torus(3, 0.35, 16, 3);
      B.endPart();
      B.pop();
    } else if (L.item === 'sticks'){
      matte(B, '#c99a5b'); B.tube([[-1, -0.9, 0.3], [11.5, -2.4, 0.8]], 0.5, 5); B.tube([[-1, 0.9, 0.3], [11.5, 0.8, 0.8]], 0.5, 5);
      B.part(null, notFired);
      B.push().at(12.6, -0.8, 0); matte(B, '#fbfbf4'); B.scale(3.7, 2.5, 1.8).sphere(1, 12, 6); B.pop();
      B.push().at(12.8, -1.1, 1.4); B.color('#ff8c5a').shine(0.5); B.scale(3.4, 1.9, 0.8).sphere(1, 12, 6); B.pop();
      B.push().at(12.6, -0.8, 0); matte(B, '#1f3a2a'); B.scale(0.7, 1.05, 1.05).torus(2.6, 0.5, 12, 4); B.pop();
      B.endPart();
    } else if (L.item === 'spoon'){
      matte(B, '#a8763a'); B.tube([[-1, 0, 0], [8, -1, 0.6]], 0.85, 6);
      B.push().at(11.2, -1.3, 0.6); matte(B, '#d9a76a'); B.scale(1.35, 1, 1).lathe([[0, -0.8], [2, -0.6], [2.7, 0.4], [2.7, 0.7, 1]], 14, { caps: false }); B.pop();
      B.part(null, notFired); B.push().at(11.3, -1.4, 0.8); matte(B, '#c9302a'); B.scale(1.3, 1, 1).disc(2.1, 12); B.pop(); B.endPart();
    } else {
      /* Bruno's cleaver */
      matte(B, '#5a3a24'); B.push().rotY(Math.PI / 2).at(0, 0, -1).capsule(1.3, 7, 8).pop();
      B.part((time, tt) => ({ z: tt && tt.fireAnim > 0 ? 0 : 0.5 }));
      B.push().at(9.4, -1.3, 1.6).rotX(Math.PI / 2); steel(B, '#dfe7ea'); B.at(0, 0, -0.5).rbox(9.6, 8.2, 1, 1.2, 0.3); B.pop();
      B.endPart();
    }
    B.pop();
    B.endPart();
    /* the head, and what's on it */
    B.push().at(1, 0, 18.4);
    B.color(skin).shine(0.25); B.sphere(5.6, 18, 10);
    matte(B, '#2a2a2a'); for (const sd of [-1, 1]) B.push().at(4.6, sd * 1.9, 0.9).sphere(0.75, 8, 5).pop();
    B.color(skinD).shine(0.2); B.push().at(5.5, 0, -0.4).sphere(1.1, 8, 5).pop();
    if (L.hat === 'band'){
      matte(B, '#3a3036'); B.push().at(-0.3, 0, 0.6).dome(5.85, 18, 6).pop();
      B.push().at(0, 0, 2); B.color(g10 ? '#ffd166' : '#f4f4f0').shine(0.3); B.torus(5.8, 0.9, 22, 5); B.pop();
      B.color(g10 ? '#ffd166' : '#f4f4f0').shine(0.3); for (const sd of [-1, 1]) B.tube([[-5.6, sd * 0.8, 2], [-8.6, sd * 3, 0.4], [-9.6, sd * 3.6, -1.4]], 0.6, 4);
      B.push().at(5.9, 0, 2.2).rotY(Math.PI / 2); lit(B, '#e2383f', 0.2); B.disc(1.3, 10); B.pop();
      if (top){ B.push().at(0, 0, 6.6); lit(B, '#ffd166', 0.4); slab(B, starPoly(3, 1.3, 5), 0.8); B.pop(); }
    } else if (L.hat === 'bun'){
      matte(B, '#d7dadd'); B.push().at(-0.3, 0, 0.4).dome(6, 18, 6).pop();
      matte(B, '#e8eaec'); for (let i = 0; i < 8; i++){ const q = i / 8 * TAU; if (Math.cos(q) > 0.6) continue; B.push().at(Math.cos(q) * 5.2 - 0.3, Math.sin(q) * 5.2, 1.2).sphere(1.7, 8, 5).pop(); }
      B.push().at(-2, 0, 6.4); matte(B, '#c9cdd2'); B.sphere(3, 12, 7); B.pop();
      if (g10){ B.push().at(-2, 0, 6.6).rotZ(0.6).rotY(Math.PI / 2); gold(B); B.at(0, 0, -4).cyl(0.35, 0.35, 8, 6); B.pop(); }
      B.push().at(3, -4, 3.4); plastic(B, '#e2383f'); B.sphere(1.5, 8, 5); B.at(0.6, 0, 0.6); lit(B, '#ffd166', 0.3); B.sphere(0.6, 6, 4); B.pop();
      if (top){ B.push().at(-2, 0, 9.8); lit(B, '#ffd166', 0.4); slab(B, starPoly(2.6, 1.1, 5), 0.8); B.pop(); }
    } else if (L.hat === 'cap'){
      B.push().at(3.6, 0, -2.6).scale(1, 1.1, 1.2); matte(B, '#4a2a18'); B.sphere(3.6, 12, 7); B.pop();
      B.push().at(-0.4, 0, 3.4); matte(B, '#ffffff'); B.rbox(11.6, 8.6, 3.6, 3.6, 1.6); B.pop();
      B.push().at(-0.4, 0, 5.4); B.color(g10 ? '#ffd166' : '#c3cbcf').shine(0.4); B.box(10.4, g10 ? 1.4 : 0.9, 1.7); B.pop();
      if (top){ B.push().at(-0.4, 0, 7.4); lit(B, '#ffd166', 0.4); slab(B, starPoly(2.6, 1.1, 5), 0.8); B.pop(); }
    } else {
      /* the toque: a band, then the puff on top */
      B.push().at(-0.3, 0, 3.4);
      B.color(g10 ? '#ffd166' : '#e9edef').shine(g10 ? 0.8 : 0.3); B.cyl(5.4, 5.8, 3.4, 20);
      matte(B, '#ffffff'); for (let i = 0; i < 6; i++){ const q = i / 6 * TAU + 0.3; B.push().at(Math.cos(q) * 3.4, Math.sin(q) * 3.4, 4.6).sphere(3, 10, 6).pop(); }
      B.push().at(0, 0, 5.6).sphere(3.8, 12, 7).pop();
      if (top){ B.push().at(0, 0, 9.4); lit(B, '#ffd166', 0.4); slab(B, starPoly(3, 1.3, 5), 0.8); B.pop(); }
      B.pop();
    }
    B.pop();
    /* fired up: sparks off the shoulders */
    if (lvl >= 15) for (let i = 0; i < 3; i++){
      B.part(time => { const k = cycle(time, 0.9, i / 3), a = i * 2.1; return { x: Math.cos(a) * (12 + k * 8) - 2, y: Math.sin(a) * (13 + k * 8), z: 10 + k * 8, s: 1 - k * 0.6 }; }, (time, tt) => !(tt && tt.icon));
      const col = t.type === 'chef_blaze' ? (i % 2 ? '#ffb347' : '#ff5a1f') : t.type === 'chef_gelato' ? '#e8f7ff' : L.spark || '#ffd166';
      lit(B, col, 0.9); B.sphere(1.3, 8, 5);
      B.endPart();
    }
    B.pop();
    return B;
  }
  const chefDef = {
    build: chef,
    key: t => { const l = t.level || 1; return l >= 20 ? 'L3' : l >= 15 ? 'L2' : l >= 10 ? 'L1' : 'L0'; },
    body: (t, up, par, skin) => { const L = Art.look3d.CHEF_LOOK[t.type] || Art.look3d.CHEF_LOOK.chef_blaze; return skin && skin.body ? Art.look3d.mixHex(skin.body === 'rainbow' ? '#ff7a7a' : skin.body, '#ffffff', 0.55) : L.shawl || '#fbfaf5'; },
  };

  /* a sub under water: a blue sheen over it and bubbles rising */
  function subAfter(g, t, time){
    if (t.icon || !(t.s && t.s.submerged)) return;
    g.save(); g.rotate(t.rotNow || 0);
    rr(g, -23, -10, 46, 20, 10); g.fillStyle = 'rgba(90,175,230,0.2)'; g.fill();
    for (let i = 0; i < 3; i++){ const k = (time * 0.7 + i / 3) % 1; circle(g, -14 + i * 12, -6 - k * 8, 1 + k * 1.5); g.strokeStyle = 'rgba(230,248,255,' + (1 - k) * 0.8 + ')'; g.lineWidth = 0.8; g.stroke(); }
    g.restore();
  }
  /* ---------------- Rice Cooker ----------------
     A round pot with a domed lid hinged at the back (-x) and a control panel at the front (+x). The lid pops up as it
     bursts. Pressure: a steel pot with a weighted valve, a gauge, then an industrial steamer's red valve. Sticky: a
     rice paddle leaning on it, a bowl of rice balls, a mochi mallet, then a golden paddle. Keep Warm: an orange warm
     plate under it, a timer dial, then a stack of little pots behind. */
  function rice(B, c){
    const [a, b, cc] = c.up, par = c.par, metal = a >= 3 || par;
    /* the warm plate under it */
    if (cc >= 2 || par){ B.color('#ff9a3c').shine(0.2).glow(0.35); B.push().at(0, 0, 0).cyl(17.5, 17.5, 1.2, 28).pop(); B.glow(0); }
    /* the stack of little pots behind */
    if (cc >= 5 || par) for (const [x, y] of [[-17, -11], [-17, 11], [-22, 0]]){
      if (par) gold(B); else plastic(B, '#f2b07a');
      B.push().at(x, y, 0).cyl(5.5, 5, 7, 18).pop();
      B.color('#fffbea').shine(0.1); B.push().at(x, y, 7).sphere(4.2, 12, 6).pop();
    }
    /* the pot */
    if (metal) steel(B, a >= 5 ? '#9aa6ab' : null); else B.body().shine(0.35).glow(0);
    B.lathe([[13.5, 0], [15, 1], [15.5, 4], [15.5, 13], [14.5, 15.5], [13, 16]], 30);
    /* the hinge and the control panel with its two lights */
    matte(B, '#5c666b'); B.push().at(-16, 0, 13).box(3, 7, 3).pop();
    matte(B, par ? '#2a2220' : '#3a4448'); B.push().at(15.5, 0, 6).rbox(4, 11, 8, 1.6, 0.8).pop();
    B.color('#7ee07a').shine(0.4).glow(0.6); B.push().at(17.6, -2.4, 8).sphere(1.1, 8, 5).pop();
    B.color('#ffb347').shine(0.4).glow(cc >= 1 ? 0.6 : 0.1); B.push().at(17.6, 2.4, 8).sphere(1.1, 8, 5).pop();
    B.glow(0);
    /* the lid: hinged at the back, it lifts as the steam bursts */
    B.push().at(-13, 0, 16);
    B.part((time, t) => { const k = t && t.fireAnim > 0 ? Math.sin((1 - t.fireAnim / 0.4) * Math.PI) : 0; return { ry: -k * 0.55 }; });
    B.push().at(13, 0, 0);
    if (metal) steel(B, '#dfe5e8'); else B.body(1.08).shine(0.45);
    B.lathe([[13.2, 0], [12.5, 2], [10, 4], [6, 5.3], [0.01, 5.8]], 28);
    if (metal){
      matte(B, '#2a2f33'); B.push().at(0, 0, 5.4).cyl(2.8, 2.6, 2.2, 14).pop();
      B.color(a >= 5 ? '#e2383f' : '#f2a03d').shine(0.6); B.push().at(0, 0, 7.4).cyl(1.8, 1.4, 2.2, 12).pop();
      if (a >= 4 || par){ B.color('#f4f6f6').shine(0.4); B.push().at(6, 5, 4).rotX(-0.35).cyl(2.6, 2.6, 0.9, 16).pop(); }
    } else { steel(B); B.push().at(-1, 0, 5.4).box(3, 2.4, 1.6).pop(); }
    if (cc >= 3 || par){ B.color('#fff4d6').shine(0.3); B.push().at(-5, 5, 4.2).rotX(0.3).cyl(2.6, 2.6, 0.9, 16).pop(); }
    B.pop();
    B.endPart();
    B.pop();
    /* the rice paddle leaning on its side, a bowl of rice balls, a mochi mallet */
    if (b >= 1 || par){
      if (b >= 5 || par) gold(B); else B.color('#f4efe0').shine(0.25);
      B.push().at(5, 16.5, 9).rotX(0.35).rotZ(-0.4);
      B.push().scale(1, 0.35, 1).sphere(3.6, 12, 8).pop();
      B.push().at(0, 0, -7).cyl(1.1, 1, 8, 8).pop();
      B.pop();
    }
    if (b >= 3 || par){
      plastic(B, '#2a5f8a'); B.push().at(-9, 18, 0).lathe([[0.01, 0], [3.5, 0.5], [5, 3], [5.2, 4]], 18).pop();
      B.color('#fbf7ea').shine(0.1); for (const [x, y] of [[-10.5, 17], [-7.5, 17.5], [-9, 19.6]]) B.push().at(x, y, 4.5).sphere(1.8, 10, 6).pop();
    }
    if (b >= 4 || par){
      matte(B, '#8a5a2a'); B.push().at(-11, -17, 1.5).rotZ(0.6).rotY(Math.PI / 2).cyl(0.9, 0.9, 11, 8).pop();
      plastic(B, '#c08a4a'); B.push().at(-15, -20, 2.5).rotZ(0.6).box(9, 5, 5).pop();
    }
  }
  /* the rice cooker's cooking ring on the floor round it, and the pots it keeps warm */
  function riceAfter(g, t, time, sc, up){
    if (t.icon || !t.s || typeof riceCharge !== 'function') return;
    const c = riceCharge(t), R = 19 * sc, CT = GL3D.CT;
    g.save(); g.scale(1, CT); g.lineCap = 'round'; g.lineWidth = 2.6;
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
    g.strokeStyle = c >= 1 ? '#7ee07a' : '#ffcf4d'; g.beginPath(); g.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + TAU * c); g.stroke();
    const kept = Math.min(10, t.riceStore || 0);
    for (let i = 0; i < kept; i++){ const an = -1.2 + i * 0.26; g.beginPath(); g.arc(Math.cos(an) * (R + 5), Math.sin(an) * (R + 5), 2.4, 0, TAU); g.fillStyle = '#fffbea'; g.fill(); g.strokeStyle = '#c9a36a'; g.lineWidth = 0.8; g.stroke(); }
    g.restore();
  }
  /* ---------------- Spray Bottle ----------------
     A clear bottle with the liquid showing through, a trigger head on top pointing +x, its nozzle and trigger. Soap
     turns the liquid pink and blows bubbles; mist turns it icy, puffs vapour and finally carries a rain cloud; the
     nozzle path grows a brass nozzle, a pressure tank and hose, a gauge and a long power-washer lance. The Car Wash
     has two spinning roller brushes either side. */
  function spray(B, c){
    const [a, b, cc] = c.up, par = c.par;
    const liquid = par ? '#9fe0ff' : a >= 3 ? '#ff9ad0' : a >= 1 ? '#ffc2e2' : b >= 2 ? '#bfe9ff' : '#7fc8f0';
    /* the Car Wash's roller brushes, spinning along their length */
    if (par){
      for (const y of [-18, 18]){
        B.push().at(-15, y, 5);
        B.part(time => ({ rx: time * 6 * (y > 0 ? 1 : -1) }));
        plastic(B, '#2f7fc8'); B.push().rotY(Math.PI / 2).cyl(4.8, 4.8, 30, 14).pop();
        B.color('#bfe3ff').shine(0.2); for (let i = 0; i < 6; i++){ B.push().at(2 + i * 5, 0, 0).rotX(i * 0.7).at(0, 0, 4.4).box(1.2, 1.2, 1.6).pop(); }
        B.endPart();
        steel(B); B.push().at(-1.5, 0, -5).cyl(0.9, 0.9, 5, 8).pop(); B.push().at(31.5, 0, -5).cyl(0.9, 0.9, 5, 8).pop();
        B.pop();
      }
    }
    /* a pressure tank behind, with its hose up to the head */
    if (cc >= 3){
      B.push().at(-17, 0, 0);
      plastic(B, cc >= 5 ? '#e2383f' : '#f2a03d'); B.capsule(5, 17, 16);
      if (cc >= 4){ B.push().at(0, -5.1, 11).rotX(Math.PI / 2); B.color('#f4f6f6').shine(0.3); B.cyl(2.6, 2.6, 0.8, 16); B.at(0, 0, 0.85); matte(B, '#e2383f'); B.flat([[-0.3, -0.2], [2, -0.2], [2, 0.2], [-0.3, 0.2]]); B.pop(); }
      B.pop();
      matte(B, '#2a2f33'); B.tube([[-17, 0, 17], [-14, 0, 23], [-8, 0, 27.5], [-5, 0, 27.5]], 1.1, 8);
    }
    /* the bottle: clear plastic, the liquid inside, and the dip tube */
    B.color(liquid).shine(0.6).glow(par || b >= 5 ? 0.15 : 0); B.push().at(0, 0, 0.8).cyl(9.3, 9.3, 13.5, 24).pop();
    matte(B, '#5c666b'); B.tube([[2.5, 0, 1.2], [0.5, 0, 22]], 0.45, 6);
    B.color('#eef8fc', 0.38).shine(0.95).glow(0);
    B.lathe([[9.9, 0], [10.6, 0.8], [10.8, 3], [10.8, 15], [9.5, 18.5], [5.2, 21], [4.4, 22]], 26);
    /* the collar and trigger head (the head wears the appliance's colour) */
    if (c.gold || par) gold(B); else { B.body(0.8).shine(0.4).glow(0); }
    B.push().at(0, 0, 21.4).cyl(4.9, 4.9, 2.8, 18).pop();
    B.body().shine(0.4).glow(0);
    B.push().at(3, 0, 24).rbox(18, 9.5, 7, 3.4, 1.4).pop();
    B.body(1.15).shine(0.6); B.push().at(3, 0, 31.02).flat(rect(-6, -2, 12, 4)).pop();
    /* the trigger, pulled back as it fires */
    B.part((time, t) => ({ x: t && t.fireAnim > 0 ? -1.8 : 0 }));
    B.body(0.75).shine(0.4); B.tube([[10.5, 0, 24], [13, 0, 20], [11.5, 0, 15.5]], 1.5, 8);
    B.endPart();
    /* the nozzle: black plastic, then brass, then a long steel lance with a gold tip */
    const nl = cc >= 5 || par ? 18 : cc >= 4 ? 13 : cc >= 1 ? 8 : 5;
    if (cc >= 4 || par){ steel(B); B.push().at(12, 0, 27.5).rotY(Math.PI / 2).cyl(1.5, 1.3, nl, 12).pop(); }
    else { if (cc >= 1) B.color('#d9a441').shine(0.85); else matte(B, '#2a2f33'); B.push().at(12, 0, 27.5).rotY(Math.PI / 2).cyl(2.3, 2.1, nl, 12).pop(); }
    if (cc >= 5 || par) gold(B); else if (cc >= 1) B.color('#d9a441').shine(0.85); else matte(B, '#2a2f33');
    B.push().at(12 + nl, 0, 25).box(3, 5.4, 5).pop();
    /* a puff at the tip as it fires */
    B.push().at(16 + nl, 0, 27.5);
    B.part((time, t) => ({ s: 0.6 + (t && t.fireAnim > 0 ? (0.18 - t.fireAnim) * 6 : 0) }), (time, t) => !!(t && t.fireAnim > 0));
    B.color('#e6f6ff', 0.6).shine(0); B.sphere(3, 10, 6);
    B.endPart();
    B.pop();
    /* soap: bubbles drifting round it, then a crown of foam */
    if (a >= 2 || par){
      for (let i = 0; i < 3; i++){
        B.push();
        B.part(time => { const an = time * 0.8 + i * 2.1; return { x: Math.cos(an) * 17, y: Math.sin(an) * 17, z: 12 + Math.sin(time * 2 + i) * 3 }; });
        B.color('#d8f4ff', 0.45).shine(1); B.sphere(2.6, 12, 8);
        B.endPart();
        B.pop();
      }
    }
    if (a >= 4 || par){ B.color('#ffffff').shine(0.2); for (let i = 0; i < 8; i++){ const an = i / 8 * Math.PI * 2; B.push().at(Math.cos(an) * 5.6, Math.sin(an) * 5.6, 21.5).sphere(1.9 + (i % 3) * 0.4, 10, 6).pop(); } }
    /* mist: vapour from the head, then a rain cloud riding above, still while the bottle turns */
    if (b >= 4 && !par) puffs(B, 3, 0, 0, 31, 12, 2.6, '#f2fbff', 0.45, 0.5);
    if (b >= 5 || par){
      B.part(still);
      B.push().at(0, 0, 40);
      B.part(time => ({ z: Math.sin(time * 1.5) * 1.2 }));
      B.color(par ? '#e9eef2' : '#9aa8b3').shine(0.1);
      for (const [x, y, r] of [[-5, 0, 5], [0, -2, 6.2], [5, 0, 5], [0, 3, 5]]) B.push().at(x, y, 0).sphere(r, 12, 8).pop();
      B.endPart();
      B.part(null, time => Math.sin(time * 5) > 0.9);
      lit(B, '#fff3a0', 0.95); B.tube([[1, 0, -3], [-1, 0, -7], [2, 0, -8], [0, 0, -13]], 0.6, 5);
      B.endPart();
      B.pop();
      B.endPart();
    }
    return B;
  }
  /* ---------------- the registry ---------------- */
  /* the blender's motor base stays dark unless it wears a skin */
  const darkUnlessSkin = dark => (t, up, par, skin) => skin && skin.body ? null : dark;
  const REG = {
    knife: { build: knife },
    toaster: { build: toaster },
    blender: { build: blender, body: darkUnlessSkin('#2b3a44') },
    grill: { build: grill },
    freezer: { build: freezer },
    micro: { build: micro },
    siphon: { build: siphon },
    dish: { build: dish },
    fryer: { build: fryer },
    oven: { build: oven },
    mixer: { build: mixer },
    pasta: { build: pasta },
    gatling: { build: gatling },
    espresso: { build: espresso },
    bread: { build: bread },
    boat: { build: boat },
    sub: { build: sub, alpha: t => !t.icon && t.s && t.s.submerged ? 0.72 : 1, after: subAfter },
    heli: { build: heli },
    saucer: { build: saucer },
    mandoline: { build: mandoline },
    caddy: { build: caddy },
    saucepan: { build: saucepan },
    bot: { build: bot },
    pets: { build: pets, body: (t, up, par) => par ? '#e8b52a' : null },
    lobster: { build: lobster, after: lobsterAfter },
    chess: { build: chess },
    chopsticks: { build: chopsticks, body: (t, up, par, skin) => skin && skin.body ? null : '#f4f1ea' },
    susan: { build: susan, after: susanAfter },
    spray: { build: spray },
    rice: { build: rice, after: riceAfter },
    chef_blaze: chefDef, chef_gelato: chefDef, chef_penny: chefDef, chef_kenji: chefDef, chef_nonna: chefDef, chef_bruno: chefDef,
  };
  return REG;
})();
