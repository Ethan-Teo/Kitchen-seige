'use strict';
/* =====================================================================
   Kitchen Siege — the kitchens' props in 3D
   The things standing about each kitchen (a cutting board, a plate of
   lemons, diner stools, a jukebox, pantry jars, freezer crates...), the
   sink's steel rim and faucet, and what spilled the spills, built with the
   same 3D engine as the appliances: same camera, same light from the upper
   left, same outlines and shadows. Without WebGL 2 (or with 3D off) the
   flat props stand in.

   Each prop is drawn once into a picture of its own. Its shadow goes into
   the map's background; the prop itself is drawn among the appliances, in
   depth order, so an appliance standing behind a jar is hidden by it.
   Each one stands in the area it blocks: its picture is centred on that
   area and about as big.

   PROPS3D.on()           whether props are drawn in 3D now
   PROPS3D.deco(k, d)     the picture of decoration d (from MAPS[...].deco), or null: draw it flat then
   PROPS3D.water(k, w, i) the pictures of water feature w's 3D parts (rims, taps, the cup that spilled), or null
   PROPS3D.done()         gives the pictures' places in the 3D atlas back
   A picture is { img, shadow, x, y, w, h, sy, under }: img and its shadow cover x, y, w, h (playfield units); sy is
   the depth it is drawn at among the appliances; under marks a part lying flat in the background (the sink's rim).
   ===================================================================== */
const PROPS3D = (() => {
  const TAU = Math.PI * 2;
  const CT = typeof GL3D !== 'undefined' ? GL3D.CT : Math.cos(0.64), ST = typeof GL3D !== 'undefined' ? GL3D.ST : Math.sin(0.64);
  function steel(B, c){ return B.color(c || '#c9d2d6').shine(0.8).glow(0); }
  function plastic(B, c){ return B.color(c).shine(0.35).glow(0); }
  function matte(B, c){ return B.color(c).shine(0.05).glow(0); }
  function wood(B, c){ return B.color(c).shine(0.15).glow(0); }
  function lit(B, c, e){ return B.color(c).shine(0).glow(e == null ? 0.85 : e); }
  function ice(B, c){ return B.color(c || '#bfe6f7').shine(0.95).glow(0.14); }
  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  /* points round a rounded rectangle, w x d with corners of radius r (seg points to a corner) */
  function rrPts(w, d, r, seg){
    seg = seg || 5; r = Math.max(0.3, Math.min(r, w / 2 - 0.01, d / 2 - 0.01));
    const out = [];
    const cs = [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, Math.PI / 2], [-w / 2 + r, -d / 2 + r, Math.PI], [w / 2 - r, -d / 2 + r, Math.PI * 1.5]];
    for (const [cx, cy, a0] of cs) for (let i = 0; i <= seg; i++){ const a = a0 + i / seg * Math.PI / 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return out;
  }
  const at3 = (pts, z) => pts.map(p => [p[0], p[1], z]);
  /* a thin flat line along a path (wood grain, seams, grooves) */
  function ribbon(B, pts, w){
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++){
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      L.push([pts[i][0] + nx * w / 2, pts[i][1] + ny * w / 2]); R.push([pts[i][0] - nx * w / 2, pts[i][1] - ny * w / 2]);
    }
    for (let i = 0; i + 1 < pts.length; i++) B.flat([L[i], L[i + 1], R[i + 1], R[i]]);
    return B;
  }
  /* a flat shape on a face looking at the viewer (+y), at depth y: points are [x, height] */
  function front(B, poly, y, z){ B.push().at(0, y, z || 0).rotX(-Math.PI / 2).flat(poly.map(([x, h]) => [x, -h])).pop(); return B; }
  function starPoly(r0, r1, n){ const p = []; for (let i = 0; i < n * 2; i++){ const a = -Math.PI / 2 + i / (n * 2) * TAU; p.push([Math.cos(a) * (i % 2 ? r1 : r0), Math.sin(a) * (i % 2 ? r1 : r0)]); } return p; }
  /* the depth (front to back) a rectangular prop of height Z is built with, so its picture is as tall as its area */
  const depthFor = (h, Z) => Math.max(h * 0.4, (h - ST * Z) / CT);

  /* ---------------- the props ----------------
     each is built round the middle of its area, standing on z = 0 */
  const BUILD = {
    /* a cutting board with a tomato slice and a whole tomato */
    board(B, d){
      const w = d.w, T = 7, h = depthFor(d.h, T);
      B.anchor(T / 2);
      wood(B, '#c18a50'); B.rbox(w, h, T, 12, 2);
      B.push().at(0, 0, T + 0.02); wood(B, '#b07a42');
      for (let i = 0; i < 10; i++){ const y = -h / 2 + 7 + i * (h - 14) / 9, pts = []; for (let x = -w / 2 + 6; x <= w / 2 - 6; x += 9) pts.push([x, y + Math.sin(x * 0.05 + i * 1.7) * 1.4]); ribbon(B, pts, 0.8); }
      B.pop();
      /* the juice groove */
      B.push().at(0, 0, T + 0.04); wood(B, '#8d5a2b'); B.strip(rrPts(w - 15, h - 15, 9), rrPts(w - 19, h - 19, 7)); B.pop();
      /* the hanging hole */
      B.push().at(w / 2 - 15, -h / 2 + 15, 0); matte(B, '#3a2410'); B.cyl(5.2, 5.2, T + 0.1, 16);
      wood(B, '#7a4a20'); B.at(0, 0, T + 0.06).strip(rrPts(13.4, 13.4, 6.6, 4), rrPts(10.6, 10.6, 5.2, 4)); B.pop();
      /* a slice */
      B.push().at(-w * 0.13, h * 0.05, T);
      plastic(B, '#e2453c'); B.cyl(15, 15, 2.6, 26);
      B.at(0, 0, 2.62); matte(B, '#f07a5f'); B.disc(11.5, 24);
      B.at(0, 0, 0.02); matte(B, '#f6a08a'); B.disc(3.8, 12);
      matte(B, '#f6d36b'); for (let i = 0; i < 5; i++){ const a = i / 5 * TAU + 0.4; B.push().at(Math.cos(a) * 6.8, Math.sin(a) * 6.8, 0.03).rotZ(a).scale(1.8, 1, 1).disc(1.2, 8).pop(); }
      B.pop();
      /* a whole one */
      B.push().at(w * 0.14, -h * 0.04, T);
      B.color('#e2453c').shine(0.6).glow(0); B.push().at(0, 0, 10.4).scale(1, 1, 0.8).sphere(13, 22, 12).pop();
      matte(B, '#4f9a45'); B.push().at(0, 0, 20.4).extrude(starPoly(5.6, 1.8, 5), 0.8).pop();
      B.push().at(0, 0, 20.8).cyl(0.9, 0.7, 2.8, 6).pop();
      B.pop();
    },
    /* a plate of lemons and a leaf */
    lemons(B, d){
      const r = d.r;
      B.anchor(5);
      B.color('#eef4f5').shine(0.6).glow(0);
      B.lathe([[0, 0], [r - 9, 0], [r - 7, 1.2], [r - 1, 3.6], [r, 4.4, 1], [r - 1.6, 4.6, 1], [r - 9, 1.8], [0, 1.8]], 34);
      B.push().at(0, 0, 4.25); B.color('#9fb3b8').shine(0.4); B.torus(r - 0.8, 0.5, 34, 4); B.pop();
      const ls = [[-9, -6, 0.4], [8, -8, 1.9], [0, 8, 2.8], [-11, 9, 0.9], [11, 7, 2.2]];
      for (const [x, y, a] of ls){
        B.push().at(x * r / 34, y * r / 34, 7).rotZ(a);
        B.color('#f5d23c').shine(0.5); B.push().scale(9.4, 7, 5.6).sphere(1, 16, 9).pop();
        B.color('#e9c12a'); for (const sd of [-1, 1]) B.push().at(sd * 9.2, 0, 0).sphere(1.7, 8, 5).pop();
        B.pop();
      }
      B.push().at(14 * r / 34, -14 * r / 34, 6).rotZ(-0.6); matte(B, '#4f9a45'); B.scale(7.5, 3.2, 1).sphere(1, 12, 5); B.pop();
    },
    /* a rolling pin lying on the counter */
    pin(B, d){
      const w = d.w, R = d.h / 2 - 1, L = w - 56;
      B.anchor(R);
      B.push().at(-L / 2, 0, R).rotY(Math.PI / 2); wood(B, '#e6c592'); B.cyl(R, R, L, 28); B.pop();
      for (const sd of [-1, 1]){
        B.push().at(sd * L / 2, 0, R).rotY(sd * Math.PI / 2);
        wood(B, '#9a6534'); B.cyl(4.4, 4.4, 4, 12); B.at(0, 0, 3.6).capsule(5.2, 24, 12);
        B.pop();
      }
    },
    /* a bulb of garlic */
    garlic(B, d){
      B.anchor(9);
      for (let i = 0; i < 7; i++){
        const a = i / 7 * TAU;
        B.push().at(Math.cos(a) * 8.4, Math.sin(a) * 8.4, 0).rotZ(a).rotY(-0.42);
        B.color(i % 3 ? '#f4eee6' : '#eedcec').shine(0.35).glow(0); B.scale(1, 0.8, 1).capsule(6.8, 17, 12);
        B.pop();
      }
      B.color('#f6f0ea'); B.push().at(0, 0, 8).sphere(7, 16, 9).pop();
      B.color('#d9c9a6').shine(0.2); B.push().at(0, 0, 14).cyl(2, 0.8, 9, 8).pop();
    },
    /* a salt shaker: salt behind glass under a steel cap */
    salt(B, d){
      const r = d.r;
      B.anchor(11);
      matte(B, '#ffffff'); B.cyl(r - 2.4, r - 2.4, 11, 20); B.push().at(0, 0, 11).scale(1, 1, 0.25).dome(r - 2.4, 20, 3).pop();
      B.push().at(0, 0, 18); steel(B, '#c8d2d6'); B.cyl(r - 0.4, r - 0.7, 4, 24); B.at(0, 0, 4).scale(1, 1, 0.26).dome(r - 0.7, 24, 4); B.pop();
      matte(B, '#4a575c'); for (let i = 0; i < 5; i++){ const a = i / 5 * TAU; B.push().at(Math.cos(a) * 4, Math.sin(a) * 4, 25.2).sphere(0.95, 6, 4).pop(); }
      B.color('#dcecf2', 0.3).shine(1).glow(0); B.lathe([[r - 1, 0], [r, 1], [r, 18.2]], 24, { caps: false });
    },
    /* a diner stool: a chrome stem, a red seat */
    stool(B, d){
      const r = d.r;
      B.anchor(9);
      steel(B, '#c9d2d6'); B.cyl(r * 0.62, r * 0.55, 1.8, 24);
      B.push().at(0, 0, 1.8); steel(B, '#aab4b8'); B.cyl(2.6, 2.6, 11, 12); B.pop();
      B.push().at(0, 0, 12.4); steel(B, '#c9d2d6'); B.cyl(r - 2.4, r - 1.2, 1.8, 28); B.pop();
      B.push().at(0, 0, 14); B.color('#d6403f').shine(0.55).glow(0); B.lathe([[r - 1.4, 0], [r - 0.6, 2.4], [r - 3, 4.6], [r * 0.5, 5.3], [0, 5.5]], 30); B.pop();
      B.push().at(0, 0, 14.6); steel(B); B.torus(r - 0.9, 0.95, 32, 6); B.pop();
      matte(B, '#9e2526');
      for (let i = 0; i < 6; i++){ const a = i / 6 * TAU, c = Math.cos(a), s = Math.sin(a); B.tube([[c * 2, s * 2, 19.5], [c * r * 0.5, s * r * 0.5, 19.3], [c * (r - 4.4), s * (r - 4.4), 18.6]], 0.34, 4, { caps: false }); }
      B.push().at(0, 0, 19.3); matte(B, '#7e1c1d'); B.sphere(1.7, 8, 5); B.pop();
    },
    /* a diner booth: two red benches and a table with coffee and toast */
    booth(B, d){
      const w = d.w, Z = 25, h = depthFor(d.h, Z);
      B.anchor(Z / 2);
      for (const sd of [-1, 1]){
        B.push().at(0, sd * (h / 2 - 15), 0); B.color('#c9363a').shine(0.45).glow(0); B.rbox(w, 30, 9, 8, 3); B.pop();
        B.push().at(0, sd * (h / 2 - 4.6), 8.4); B.color('#b52e33').shine(0.45); B.rbox(w, 9.2, Z - 8.4, 4, 3.4); B.pop();
        matte(B, '#7e1c1d');
        for (let i = 1; i < 4; i++){
          const x = -w / 2 + i * w / 4;
          B.push().at(x, sd * (h / 2 - 17), 9.02).flat(rect(-0.5, -11, 1, 22)).pop();
          if (sd < 0) front(B, rect(x - 0.5, 11, 1, 12.5), -h / 2 + 9.25);
        }
      }
      /* the table on its pedestal */
      B.push(); steel(B, '#9aa6ab'); B.cyl(11, 10, 1.2, 20); B.at(0, 0, 1.2).cyl(2.4, 2.4, 13, 10); B.pop();
      B.push().at(0, 0, 14.2); matte(B, '#f2efe6'); B.rbox(w - 20, h - 68, 1.8, 6, 0.4); B.pop();
      B.push().at(0, 0, 15.1); steel(B, '#aeb6ba'); B.hoop(at3(rrPts(w - 19.4, h - 67.4, 6.2, 4), 0), 0.75, 5); B.pop();
      /* a cup of coffee on its saucer */
      B.push().at(-w * 0.15, 0, 16);
      matte(B, '#ffffff'); B.lathe([[0, 0], [8, 0], [10, 1.2, 1], [9.2, 1.4, 1], [0, 0.6]], 22);
      B.at(0, 0, 0.6); B.lathe([[3.4, 0], [5.6, 0.6], [6.4, 6.2, 1], [5.7, 6.2, 1], [5, 1.4]], 18, { caps: false });
      B.push().at(6.6, 0, 3.4).rotX(Math.PI / 2).torus(2.1, 0.55, 12, 4).pop();
      B.at(0, 0, 5); matte(B, '#6b3d1c'); B.disc(5.5, 16);
      B.pop();
      /* toast on a plate */
      B.push().at(w * 0.17, 0, 16);
      matte(B, '#ffffff'); B.lathe([[0, 0], [10, 0], [12.4, 1.2, 1], [11.6, 1.4, 1], [0, 0.6]], 24);
      B.at(0, 0, 0.6).rotZ(0.2); wood(B, '#c98a45'); B.rbox(17, 14, 2.8, 3, 1); B.at(0, 0, 2.82); matte(B, '#f6e3b0'); B.flat(rrPts(14.4, 11.4, 2.2, 3));
      B.at(1, -0.5, 0.02); matte(B, '#fff4c8'); B.flat(rrPts(4.6, 3.6, 0.8, 2));
      B.pop();
    },
    /* a jukebox: a wooden arch with neon tubes on its face */
    jukebox(B, d){
      const w = d.w, R = w / 2, Hh = 90, D = 44, fy = D / 2;
      B.anchor(Hh / 2);
      const arch = [[-R, 0], [R, 0]];
      for (let i = 0; i <= 18; i++){ const q = i / 18 * Math.PI; arch.push([Math.cos(q) * R, Hh - R + Math.sin(q) * R]); }
      B.push().at(0, fy, 0).rotX(Math.PI / 2); wood(B, '#6b3d1f').shine(0.35); B.extrude(arch, D); B.pop();
      B.push(); wood(B, '#3e2210'); B.rbox(w + 3, D + 3, 4, 2, 0.6); B.pop();
      /* the neon arches */
      const cols = ['#ff5a4e', '#ffd166', '#7ee0c3', '#7fb3ff'];
      cols.forEach((c, i) => { B.push().at(0, fy + 1.3, Hh - R).rotX(Math.PI / 2); lit(B, c, 0.8); B.torus(R - 6 - i * 5.2, 1.5, 24, 6, Math.PI, 0); B.pop(); });
      /* the window onto the records */
      const win = [];
      for (let i = 0; i <= 16; i++){ const q = i / 16 * Math.PI; win.push([Math.cos(q) * 14, Hh - R + Math.sin(q) * 14]); }
      win.push([-14, Hh - R - 6], [14, Hh - R - 6]);
      matte(B, '#2a2f33'); front(B, win.map(([x, z]) => [x * 1.12, Hh - R + (z - Hh + R) * 1.12]), fy + 0.05);
      lit(B, '#ffe7b0', 0.5); front(B, win, fy + 0.1);
      matte(B, '#3a3f44'); for (let i = 0; i < 5; i++) front(B, rect(-11 + i * 4.6, Hh - R - 4, 2.4, 12), fy + 0.15);
      /* the selector buttons */
      steel(B, '#c9a54a'); front(B, rect(-R + 9, 33, (R - 9) * 2, 9), fy + 0.05);
      cols.forEach((c, i) => { B.push().at((i - 1.5) * 13, fy + 1, 35.2); plastic(B, c); B.rbox(8, 2, 4.4, 0.9, 0.4); B.pop(); });
      /* the speaker grille */
      matte(B, '#3e2210'); front(B, rect(-R + 9, 7, (R - 9) * 2, 21), fy + 0.05);
      steel(B, '#c9a54a'); for (let i = 0; i < 7; i++) front(B, rect(-R + 13 + i * (R * 2 - 26) / 6 - 0.7, 9, 1.4, 17), fy + 0.1);
      /* gold trim round the face */
      steel(B, '#d6b45a'); B.tube([[R, fy + 0.5, 0.5]].concat(arch.slice(2).map(([x, z]) => [x * 1.003, fy + 0.5, z])).concat([[-R, fy + 0.5, 0.5]]), 1, 6, { caps: true });
    },
    /* a glass jar of jam (or pickled plums) with a gold lid */
    jar(B, d){
      const r = d.r, c = d.c || '#e0773a';
      B.anchor(16);
      B.color(c).shine(0.55).glow(0); B.lathe([[0, 1], [r - 2.6, 1], [r - 2.6, 22], [r - 4.4, 24.5], [0, 25]], 28);
      B.color(shade(c, 0.28)).shine(0.4); for (let i = 0; i < 8; i++){ const a = i * 2.3 + 0.6, q = (i * 0.37) % 1; B.push().at(Math.cos(a) * (r - 2.7), Math.sin(a) * (r - 2.7), 4 + q * 16).sphere(1.8, 8, 5).pop(); }
      B.push().at(0, 0, 30.4); B.color('#c9a54a').shine(0.85); B.cyl(r - 3, r - 3, 5, 30); B.at(0, 0, 5).cyl(r - 3, r - 4.2, 0.9, 30);
      for (const z of [1.2, 2.5, 3.8]) B.push().at(0, 0, z - 5).torus(r - 3, 0.4, 30, 4).pop();
      B.pop();
      /* a paper label on its front */
      matte(B, '#f3ead6'); B.lathe([[r + 0.3, 8], [r + 0.3, 19]], 10, { arc: 1.3, a0: Math.PI / 2 - 0.65, caps: false });
      B.color(c).shine(0); B.lathe([[r + 0.35, 11.5], [r + 0.35, 15.5]], 10, { arc: 1.3, a0: Math.PI / 2 - 0.65, caps: false });
      B.color('#e1f0f5', 0.3).shine(1); B.lathe([[r - 2, 0], [r, 1.5], [r, 26], [r - 3, 29.2], [r - 3.3, 30.6]], 32, { caps: false });
    },
    /* a tin can with a red label and a ring pull */
    can(B, d){
      const r = d.r, Z = 34;
      B.anchor(15);
      steel(B, '#c7d0d4'); B.cyl(r, r, Z, 32);
      for (const z of [0.9, Z - 0.6]) B.push().at(0, 0, z).torus(r - 0.1, 1, 32, 5).pop();
      steel(B, '#b9c3c8'); for (const z of [4, 30]) B.push().at(0, 0, z).torus(r, 0.45, 32, 4).pop();
      B.push().at(0, 0, 7); B.color('#d9463c').shine(0.3); B.cyl(r + 0.35, r + 0.35, 20, 32, { top: false, bottom: false });
      B.at(0, 0, 8.4); matte(B, '#f4efe6'); B.cyl(r + 0.4, r + 0.4, 3.2, 32, { top: false, bottom: false }); B.pop();
      B.push().at(0, 0, Z + 0.02); steel(B, '#98a5aa'); B.strip(rrPts(r * 2 - 2, r * 2 - 2, r, 6), rrPts(r * 2 - 6.4, r * 2 - 6.4, r, 6));
      B.at(0, 0, 0.1); steel(B, '#dfe5e8'); B.push().at(-1, 0, 0).rbox(14, 6, 0.7, 3, 0.2).pop(); B.push().at(5, 0, 0.3).torus(2.2, 0.55, 12, 4).pop();
      B.pop();
    },
    /* a box of cereal lying on its back */
    box(B, d){
      const w = d.w, Z = 16, h = depthFor(d.h, Z);
      B.anchor(Z / 2);
      B.color('#f2c14e').shine(0.25).glow(0); B.rbox(w, h, Z, 1.6, 0.6);
      B.push().at(0, -h / 2 + 7, Z + 0.02); matte(B, '#e2383f'); B.flat(rect(-w / 2 + 0.8, -6.2, w - 1.6, 12.4)); B.pop();
      matte(B, '#e2383f'); front(B, rect(-w / 2 + 0.8, 6, w - 1.6, 4), h / 2 + 0.03);
      B.push().at(w * 0.08, 6, Z + 0.02); matte(B, '#ffffff'); B.disc(11, 24); B.at(0, 0, 0.02); B.color('#c9a54a').shine(0.4); B.annulus(10, 11.2, 24);
      wood(B, '#e8b04a'); for (let i = 0; i < 7; i++){ const a = i * 2.2, q = 2 + (i % 3) * 2.6; B.push().at(Math.cos(a) * q, Math.sin(a) * q, 0.05).torus(1.4, 0.55, 8, 3).pop(); }
      B.pop();
    },
    /* a sack of flour, tied at the top */
    sack(B, d){
      const r = d.r;
      B.anchor(18);
      B.color('#c9ad7f').shine(0.08).glow(0);
      B.lathe([[0, 0], [r * 0.88, 0], [r * 0.97, 3], [r, 10], [r, 20], [r * 0.95, 27], [r * 0.7, 33], [r * 0.36, 36.5, 1], [r * 0.42, 38], [r * 0.55, 41.5], [r * 0.32, 44], [0, 44.4]], 26);
      B.push().at(0, 0, 36.8); matte(B, '#7d6136'); B.torus(r * 0.37, 1.3, 18, 5); B.pop();
      matte(B, '#b49465');
      for (let i = 0; i < 14; i++){ const a = i / 14 * TAU + 0.11, c = Math.cos(a), s = Math.sin(a); if (s > 0.55) continue; B.tube([[c * r * 0.97, s * r * 0.97, 3], [c * r * 1.004, s * r * 1.004, 10], [c * r * 1.004, s * r * 1.004, 20], [c * r * 0.95, s * r * 0.95, 27]], 0.3, 3, { caps: false }); }
      matte(B, '#efe2c4'); B.lathe([[r + 0.3, 8], [r + 0.3, 20], [r * 0.95 + 0.3, 27]], 12, { arc: 1.2, a0: Math.PI / 2 - 0.6, caps: false });
    },
    /* a wooden crate in the freezer, frost on its lid */
    crate(B, d){
      const w = d.w, Hh = 28, h = depthFor(d.h, Hh);
      B.anchor(Hh / 2);
      wood(B, '#a57d55'); B.box(w, h, Hh);
      wood(B, '#7d5a3a');
      for (const [x, y, bw, bd] of [[0, -h / 2 + 2.5, w, 5], [0, h / 2 - 2.5, w, 5], [-w / 2 + 2.5, 0, 5, h], [w / 2 - 2.5, 0, 5, h]]) B.push().at(x, y, Hh).box(bw, bd, 1.2).pop();
      for (let i = 1; i < 4; i++) B.push().at(0, -h / 2 + i * h / 4, Hh + 0.02).flat(rect(-w / 2 + 5, -0.6, w - 10, 1.2)).pop();
      for (const sx of [-1, 1]) B.push().at(sx * (w / 2 - 3), h / 2 + 0.5, 0).box(6, 1, Hh).pop();
      B.push().at(0, h / 2 + 0.4, 0).box(w - 12, 1, 5).pop();
      B.push().at(0, h / 2 + 0.4, Hh - 5).box(w - 12, 1, 5).pop();
      const ang = Math.atan2(Hh - 10, w - 12);
      B.push().at(0, h / 2 + 0.5, Hh / 2).rotY(-ang).at(0, 0, -2.5).box(Math.hypot(w - 12, Hh - 10), 0.9, 5).pop();
      /* frost along the lid's back edge and over its front */
      B.push().at(0, 0, Hh + 1.25); B.color('#f4fbfe').shine(0.5).glow(0.45);
      B.flat([[-w / 2 + 1, -h / 2 + 1], [w / 2 - 1, -h / 2 + 1], [w / 2 - 1, -h / 2 + 9], [w * 0.25, -h / 2 + 12], [w * 0.05, -h / 2 + 7.5], [-w * 0.2, -h / 2 + 13], [-w / 2 + 1, -h / 2 + 8]]);
      B.pop();
      B.color('#f4fbfe').shine(0.5).glow(0.45); front(B, [[-w / 2 + 1, Hh + 1.1], [w / 2 - 1, Hh + 1.1], [w / 2 - 1, Hh - 2.5], [w * 0.3, Hh - 4], [w * 0.05, Hh - 2.2], [-w * 0.28, Hh - 4.6], [-w / 2 + 1, Hh - 2.4]], h / 2 + 1.05);
    },
    /* a bag of frozen peas, a few spilled */
    peas(B, d){
      const w = d.w, Z = 12, h = depthFor(d.h, Z);
      B.anchor(Z / 2);
      const L = [[0.95, 0.9, 0], [1, 1, 3], [0.97, 0.95, 7], [0.85, 0.76, 10.4], [0.6, 0.44, Z]];
      B.color('#3f9a52').shine(0.6).glow(0);
      B.loft(L.map(([a, b, z]) => [rrPts(w * a - 6, h * b, 9 * b + 1, 4), z]));
      for (const sx of [-1, 1]){ B.push().at(sx * (w / 2 - 2.5), 0, 0); B.color('#358a47').shine(0.4); B.rbox(5, h * 0.92, 2.4, 1, 0.4); B.pop(); }
      /* how high the bag's top is at a point on it */
      const topAt = (x, y) => {
        const q = Math.max(Math.abs(x) / (w / 2 - 3), Math.abs(y) / (h / 2));
        if (q <= L[L.length - 1][0]) return Z;
        for (let i = L.length - 1; i > 1; i--){ const a = L[i], b = L[i - 1]; if (q >= a[0] && q <= b[0]) return a[2] + (b[2] - a[2]) * (q - a[0]) / (b[0] - a[0]); }
        return 3;
      };
      B.color('#86d26f').shine(0.5);
      for (let i = 0; i < 30; i++){
        const a = i * 2.39996, q = Math.sqrt((i + 0.5) / 30), x = Math.cos(a) * (w / 2 - 14) * q, y = Math.sin(a) * (h / 2 - 9) * q;
        if (Math.abs(x) < 39 && Math.abs(y) < 12) continue;
        B.push().at(x, y, topAt(x, y) - 0.8).sphere(3, 10, 6).pop();
      }
      for (const [x, y] of [[w / 2 + 6, h * 0.22], [w / 2 + 12, h * 0.34], [-w / 2 - 5, -h * 0.28], [w * 0.12, h / 2 + 5]]) B.push().at(x, y, 3).sphere(3, 10, 6).pop();
      B.push().at(0, 0, Z + 0.04); matte(B, '#ffffff'); B.flat(rrPts(70, 18, 4, 3)); B.pop();
    },
    /* a pillar of ice, frost round its foot */
    pillar(B, d){
      const r = d.r;
      B.anchor(20);
      B.push().at(0, 0, 0.3); B.color('#ffffff').shine(0.3).glow(0.7); B.annulus(r * 0.85, r + 6, 30); B.pop();
      ice(B, '#b6e0f4'); B.cyl(r * 0.9, r * 0.8, 46, 6, { flat: true, a0: 0.3 });
      ice(B, '#d2eefa'); B.push().at(0, 0, 46).cyl(r * 0.8, r * 0.5, 4, 6, { flat: true, a0: 0.3 }).pop();
      B.push().at(0, 0, 49.6); B.color('#ffffff').shine(0.4).glow(0.55); B.scale(1, 1, 0.45).dome(r * 0.55, 12, 3); B.pop();
    },
  };
  /* words printed on a prop, drawn flat over its picture (squashed like the face they're on) */
  const LABELS = {
    box: (g, d, x, y, za) => { const h = depthFor(d.h, 16); text(g, 'CRUNCH-O', x - d.w / 2 + 6, y + CT * (-h / 2 + 7) - ST * (16 - za), CT, 10, '#ffffff', 'left', d.w - 30); },
    sack: (g, d, x, y, za) => text(g, 'FLOUR', x, y + CT * (d.r + 0.3) - ST * (15 - za), ST * 1.12, 11, '#5e4a2b', 'center', d.r * 1.05),
    peas: (g, d, x, y, za) => text(g, 'FROZEN PEAS', x, y - ST * (12 - za), CT, 11, '#24663a', 'center', 62),
  };
  /* text at (x, y), squashed to sy, no wider than maxW */
  function text(g, s, x, y, sy, size, color, align, maxW){
    g.save(); g.translate(x, y);
    g.font = '700 ' + size + 'px "Barlow Condensed", sans-serif'; g.textAlign = align || 'center'; g.textBaseline = 'middle';
    const tw = g.measureText(s).width;
    g.scale(maxW && tw > maxW ? maxW / tw : 1, sy);
    g.fillStyle = color; g.fillText(s, 0, 0.5);
    g.restore();
  }

  /* ---------------- water ---------------- */
  /* the sink's steel rim, built round the basin's middle; its outline is stretched front to back so that, seen
     tilted, it lies exactly round the water drawn flat in the background */
  const RIM_H = 4;
  function sinkRim(B, wt){
    const R = wt.rim || 10, w = wt.w, h = wt.h, r = wt.r || 0;
    const sy = pts => pts.map(([x, y]) => [x, y / CT]);
    const outer = sy(rrPts(w + R * 2, h + R * 2, r + R, 6)), inner = sy(rrPts(w, h, Math.max(0.5, r), 6));
    B.anchor(RIM_H);
    steel(B, '#c3ced3').shine(0.65);
    B.push().at(0, 0, RIM_H).strip(outer, inner).pop();
    B.loft([[outer, 0], [outer, RIM_H]], { top: false, bottom: false });
    steel(B, '#8e9ba1'); B.loft([[inner, -3], [inner, RIM_H]], { top: false, bottom: false, inward: true });
    B.push().at(0, 0, RIM_H + 0.02); B.color('#f4f8fa').shine(0.4).glow(0.25); B.strip(sy(rrPts(w + R * 1.2, h + R * 1.2, r + R * 0.6, 6)), sy(rrPts(w + R * 0.9, h + R * 0.9, r + R * 0.45, 6))); B.pop();
  }
  /* the taps and the faucet on the sink's back rim, in the rim's frame */
  function faucet(B, wt){
    const R = wt.rim || 10, h = wt.h, yb = (-h / 2 - R * 0.45) / CT;
    B.anchor(RIM_H);
    for (const [sx, c] of [[-26, '#e2383f'], [26, '#4f86c6']]){
      B.push().at(sx, yb, RIM_H); steel(B, '#e8eef0'); B.cyl(5.6, 5, 3, 16); B.at(0, 0, 3).cyl(2.2, 2.2, 3, 10);
      B.at(0, 0, 3); steel(B, '#dfe7ea'); B.push().box(10, 2.2, 1.8).pop(); B.push().box(2.2, 10, 1.8).pop();
      B.at(0, 0, 1.8); plastic(B, c); B.cyl(2, 2, 0.8, 10); B.pop();
    }
    /* the spout: up from the rim and over the water, ending above where the drips fall */
    const zs = 12, ys = (30 - h / 2 + ST * (zs - RIM_H)) / CT;
    B.push().at(0, yb, RIM_H); steel(B, '#dfe7ea'); B.cyl(4.6, 4.1, 4, 14); B.pop();
    const pts = [[0, yb, RIM_H + 3], [0, yb, RIM_H + 12]];
    const P0 = [yb, RIM_H + 12], P1 = [yb, RIM_H + 27], P2 = [ys, zs + 24], P3 = [ys, zs];
    for (let i = 1; i <= 14; i++){
      const t = i / 14, u = 1 - t;
      pts.push([0, u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]]);
    }
    steel(B, '#eef3f5'); B.tube(pts, 2.3, 10);
    B.push().at(0, ys, zs - 1.6); steel(B, '#9aa6ab'); B.cyl(2.8, 2.8, 2, 12); B.pop();
  }
  /* the paper cup that tipped over (its open end to +x), with its straw */
  function cup(B){
    B.anchor(8.6);
    B.push().at(-14, 0, 8.6).rotY(Math.PI / 2);
    for (let i = 0; i < 12; i++){ const a0 = i / 12 * TAU; B.color(i % 2 ? '#e2383f' : '#f4efe6').shine(0.25).glow(0); B.lathe([[6.4, 0], [8.8, 28]], 2, { arc: TAU / 12, a0, caps: false }); }
    matte(B, '#f4efe6'); B.disc(6.4, 16);
    B.push().at(0, 0, 27.8); matte(B, '#f4efe6'); B.torus(8.8, 0.6, 24, 4); B.pop();
    B.push().at(0, 0, 26.6); matte(B, '#5e2716'); B.disc(8.4, 20); B.pop();
    B.pop();
    plastic(B, '#ffd166'); B.tube([[8, 1.5, 10.5], [27, 4, 6.5]], 1.1, 8);
  }
  function iceCube(B, s){ B.anchor(4.5 * s); ice(B, '#d6f1fb'); B.rbox(14 * s, 14 * s, 9 * s, 3 * s, 2.4 * s); B.push().at(-2 * s, -2 * s, 9 * s + 0.03); B.color('#ffffff').shine(0).glow(0.8); B.flat(rrPts(5 * s, 3 * s, 1.4 * s, 2)); B.pop(); }
  function iceChunk(B, s, a){ B.anchor(2 * s); ice(B, '#e2f5fc'); B.cyl(7 * s, 6 * s, 4 * s, 6, { flat: true, a0: a }); B.push().at(-1.5 * s, -1.5 * s, 4 * s + 0.03); B.color('#ffffff').shine(0).glow(0.8); B.disc(2 * s, 8, 1.2 * s); B.pop(); }
  /* the jug that leaked the puddle, lying on its side, spout to +x */
  function jug(B){
    B.anchor(7);
    plastic(B, '#4f86c6'); B.push().at(12.5, 0, 7).rotY(Math.PI / 2).cyl(3.8, 3.8, 5, 14).pop();
    B.push().at(0, 0, 0.5); B.color('#5b9bc4').shine(0.6).glow(0.1); B.rbox(23, 20, 7.5, 5, 2); B.pop();
    B.color('#e6f2f8', 0.5).shine(1).glow(0); B.rbox(26, 22, 14, 6, 4);
  }

  /* ---------------- pictures ---------------- */
  function on(){ return typeof GL3D !== 'undefined' && typeof Art !== 'undefined' && !!Art.look3d && Art.look3d.glOn(); }
  const keep = {};
  /* renders model m standing at (x, y) and copies it (and its shadow) out of the atlas */
  function picture(k, m, x, y, sy, label, shA){
    const kk = Math.min(k, 3);
    if (!GL3D.render(m, { k: kk, rot: 0, s: 1, time: 0, t: null, cast: true, lift: 0, tight: true, shA: shA || 0.28, force: true }, keep)) return null;
    const x0 = x - keep.ax, y0 = y - keep.ay, w = keep.kw, h = keep.kh;
    const img = mkCanvas(w * k, h * k), g = img.getContext('2d');
    GL3D.draw(g, keep.slot, keep.w, keep.h, 0, 0, img.width, img.height);
    const shadow = mkCanvas(keep.w2, keep.h2);
    GL3D.draw(shadow.getContext('2d'), keep.shSlot, keep.w2, keep.h2, 0, 0, shadow.width, shadow.height);
    if (label){ g.setTransform(img.width / w, 0, 0, img.height / h, -x0 * img.width / w, -y0 * img.height / h); label(g, m.anchor || 0); }
    return { img, shadow, x: x0, y: y0, w, h, sy };
  }
  function spot(d){ return d.w != null ? [d.x + d.w / 2, d.y + d.h / 2] : [d.x, d.y]; }
  function deco(k, d){
    const b = BUILD[d.k];
    if (!b || !on()) return null;
    const m = GL3D.model('prop:' + d.k + ':' + [d.w, d.h, d.r, d.c].join(','), B => b(B, d));
    if (!m) return null;
    const [x, y] = spot(d), lab = LABELS[d.k];
    return picture(k, m, x, y, y, lab ? (g, za) => lab(g, d, x, y, za) : null);
  }
  function water(k, w, i){
    if (!on()) return null;
    const jobs = [];
    if (w.style === 'sink'){
      const R = w.rim || 10, key = [w.w, w.h, w.r, R].join(','), cx = w.x + w.w / 2, cy = w.y + w.h / 2;
      jobs.push({ m: GL3D.model('prop:sinkrim:' + key, B => sinkRim(B, w)), x: cx, y: cy, sy: cy, under: true });
      jobs.push({ m: GL3D.model('prop:faucet:' + key, B => faucet(B, w)), x: cx, y: cy, sy: w.y - R * 0.45, shA: 0.15 });
    } else if (w.style === 'soda'){
      jobs.push({ m: GL3D.model('prop:ice:1', B => { B.rotZ(0.4); iceCube(B, 1); }), x: w.x + 0.3 * w.rx, y: w.y + 0.25 * w.ry });
      jobs.push({ m: GL3D.model('prop:ice:0.9', B => { B.rotZ(-0.3); iceCube(B, 0.9); }), x: w.x - 0.35 * w.rx, y: w.y + 0.45 * w.ry });
      jobs.push({ m: GL3D.model('prop:cup', B => { B.rotZ(0.9); cup(B); }), x: w.x - w.rx * 0.78, y: w.y - w.ry * 0.86 });
    } else if (w.style === 'puddle') jobs.push({ m: GL3D.model('prop:jug', B => { B.rotZ(0.5); jug(B); }), x: w.x + w.rx * 0.95, y: w.y + w.ry * 0.9 });
    else if (w.style === 'melt'){
      const rnd = mulberry32(5501 + i * 37 + Math.round(w.x));
      for (let n = 0; n < 4; n++){
        const an = rnd() * TAU, q = 0.25 + rnd() * 0.45, s = Math.round((0.75 + rnd() * 0.6) * 10) / 10, a = Math.round(rnd() * 10) / 10;
        jobs.push({ m: GL3D.model('prop:chunk:' + s + ':' + a, B => iceChunk(B, s, a)), x: w.x + Math.cos(an) * w.rx * q, y: w.y + Math.sin(an) * w.ry * q });
      }
    }
    const out = [];
    for (const j of jobs){
      if (!j.m) return null;
      const p = picture(k, j.m, j.x, j.y, j.sy != null ? j.sy : j.y, null, j.shA);
      if (!p) return null;
      p.under = !!j.under;
      out.push(p);
    }
    return out;
  }
  function done(){ if (typeof GL3D !== 'undefined') GL3D.forget(keep); }
  return { on, deco, water, done, has: d => !!BUILD[d.k] };
})();
