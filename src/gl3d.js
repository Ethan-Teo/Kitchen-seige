'use strict';
/* =====================================================================
   Kitchen Siege — a small 3D engine for the appliances
   Appliances are real 3D models, built in code from boxes, cylinders, balls,
   turned and extruded outlines and tubes. They are lit from the upper left,
   given a cartoon outline (the inverted-hull trick) and a shadow on the floor,
   and drawn with WebGL 2 by a camera looking down at the kitchen.

   Each appliance's picture (and its shadow) is kept in one big atlas: the
   WebGL canvas itself, which the 2D kitchen draws from. A picture is redrawn
   only when its appliance changes (a turn, a shot, an upgrade, its next
   animation frame), and the 2D side never has to read pixels back from the GPU.

   World units are kitchen pixels: x to the right, y down the screen (toward
   the viewer), z up. A model stands on z = 0 and faces the way its flat art
   does (most along +x).

   GL3D.model(key, build)    builds a model once (build(B) adds its shapes)
   GL3D.render(m, o, keep)   draws it into the atlas; keep remembers where
   GL3D.draw(g, slot, ...)   puts a kept picture onto a 2D canvas
   ===================================================================== */
const GL3D = (() => {
  /* the camera looks down at the kitchen this far from straight down */
  const TILT = 0.64, CT = Math.cos(TILT), ST = Math.sin(TILT);
  /* the key light comes from the upper left; shadows fall to the right and down the screen, this far for each
     unit of height (the flat art's shadows fall the same way) */
  const SHADOW = [0.85, 0.34];
  const LIGHT = norm3([-SHADOW[0], -SHADOW[1], 1]);
  const FILL = norm3([0.3, 1, 0.25]);            // a soft bounce from the front, so the walls facing the viewer read
  const VIEW = [0, ST, CT];
  const HALF = norm3([LIGHT[0] + VIEW[0], LIGHT[1] + VIEW[1], LIGHT[2] + VIEW[2]]);
  /* the atlas starts small and grows (starting over) when a kitchen needs more room */
  const ATLAS_SIZES = [[1024, 512], [1024, 1024], [2048, 1024], [2048, 2048]];
  let AW = 1024, AH = 512, asize = 0, software = false;
  let cv = null, gl = null, prog = null, loc = null, broken = false, tried = false, lost = false;
  let ms = null;                                  // the multisampled scratch target, and the plain one it resolves into
  const models = new Map();
  let frame = 0, gen = 1;

  /* ---------------- vectors and matrices (column-major 4x4) ---------------- */
  function norm3(v){ const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function m4(){ const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
  function mul(a, b){
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++){
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function tr(x, y, z){ const m = m4(); m[12] = x; m[13] = y; m[14] = z; return m; }
  function sc(x, y, z){ const m = m4(); m[0] = x; m[5] = y; m[10] = z; return m; }
  function rz(a){ const m = m4(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
  function rx(a){ const m = m4(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
  function ry(a){ const m = m4(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
  /* the inverse of an affine matrix */
  function inv(m){
    const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const det = a * A + b * B + c * C || 1e-9;
    const o = m4();
    o[0] = A / det; o[1] = -(b * i - c * h) / det; o[2] = (b * f - c * e) / det;
    o[4] = B / det; o[5] = (a * i - c * g) / det; o[6] = -(a * f - c * d) / det;
    o[8] = C / det; o[9] = -(a * h - b * g) / det; o[10] = (a * e - b * d) / det;
    o[12] = -(o[0] * m[12] + o[4] * m[13] + o[8] * m[14]);
    o[13] = -(o[1] * m[12] + o[5] * m[13] + o[9] * m[14]);
    o[14] = -(o[2] * m[12] + o[6] * m[13] + o[10] * m[14]);
    return o;
  }
  /* the matrix that turns normals: the inverse transpose of the upper 3x3 */
  function nmat(m){
    const iv = inv(m);
    return new Float32Array([iv[0], iv[4], iv[8], iv[1], iv[5], iv[9], iv[2], iv[6], iv[10]]);
  }
  function xf(m, x, y, z){ return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; }
  function xn(n, x, y, z){ return norm3([n[0] * x + n[3] * y + n[6] * z, n[1] * x + n[4] * y + n[7] * z, n[2] * x + n[5] * y + n[8] * z]); }

  /* ---------------- colours ---------------- */
  const colCache = new Map();
  function rgb(c){
    if (Array.isArray(c)) return c;
    let v = colCache.get(c);
    if (v) return v;
    let m;
    if (typeof c === 'string' && c[0] === '#'){
      let h = c.slice(1); if (h.length === 3) h = h.split('').map(q => q + q).join('');
      const n = parseInt(h.slice(0, 6), 16);
      v = [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
    } else if (typeof c === 'string' && (m = c.match(/rgba?\(([^)]+)\)/))){
      const p = m[1].split(',').map(s => parseFloat(s));
      v = [p[0] / 255, p[1] / 255, p[2] / 255, p.length > 3 ? p[3] : 1];
    } else v = [1, 0, 1, 1];
    if (colCache.size > 4000) colCache.clear();
    colCache.set(c, v);
    return v;
  }

  /* ---------------- the model builder ---------------- */
  /* Shapes are made in their own frame and placed by the builder's current matrix. Every vertex keeps its normal,
     an "outline normal" (the average of the normals meeting at that point, so the cartoon outline doesn't split at
     hard edges), a colour and a material: shine, glow, and whether it takes the appliance's body colour (its skin)
     instead of its own (its own colour then darkens or lightens the body's).
     Parts can move: shapes added inside part(anim) ... endPart() are turned, shifted or scaled every frame by
     anim(time, t), about the frame the part began in; parts nest. show(time, t) can hide a part. */
  function builder(){
    let M = m4(), N = nmat(M), stack = [];
    let C = [1, 1, 1, 1], S = 0.2, E = 0, BF = 0;
    const parts = [];
    let cur = null, prep = null, extR = 0, extZ = 0, anchor = null, keyR = null;
    function newPart(parent, anim, show){
      const p = { parent, pos: [], nrm: [], onr: [], col: [], mat: [], tpos: [], tnrm: [], tonr: [], tcol: [], tmat: [], m0: M, anim, show, idx: parts.length };
      parts.push(p);
      return p;
    }
    cur = newPart(-1, null, null);
    /* adds triangles: P and Nn are flat arrays of local positions and normals, three vertices a triangle */
    function add(P, Nn, smoothOutline){
      const onr = new Array(Nn.length);
      if (smoothOutline !== false){
        const acc = new Map(), key = i => Math.round(P[i] * 40) + ',' + Math.round(P[i + 1] * 40) + ',' + Math.round(P[i + 2] * 40);
        for (let i = 0; i < P.length; i += 3){
          const k = key(i);
          let s = acc.get(k); if (!s){ s = [0, 0, 0]; acc.set(k, s); }
          s[0] += Nn[i]; s[1] += Nn[i + 1]; s[2] += Nn[i + 2];
        }
        for (let i = 0; i < P.length; i += 3){
          const s = norm3(acc.get(key(i)));
          onr[i] = s[0]; onr[i + 1] = s[1]; onr[i + 2] = s[2];
        }
      } else for (let i = 0; i < Nn.length; i++) onr[i] = Nn[i];
      const glass = C[3] < 0.99, part = cur;
      const dp = glass ? part.tpos : part.pos, dn = glass ? part.tnrm : part.nrm, doo = glass ? part.tonr : part.onr, dc = glass ? part.tcol : part.col, dm = glass ? part.tmat : part.mat;
      for (let i = 0; i < P.length; i += 9){
        const v = [], n = [], o = [];
        for (let k = 0; k < 3; k++){
          const j = i + k * 3;
          v.push(xf(M, P[j], P[j + 1], P[j + 2]));
          n.push(xn(N, Nn[j], Nn[j + 1], Nn[j + 2]));
          o.push(xn(N, onr[j], onr[j + 1], onr[j + 2]));
        }
        /* every triangle is wound the same way seen from outside (the way its normals point), whatever its shape or
           placement did */
        const ax = v[1][0] - v[0][0], ay = v[1][1] - v[0][1], az = v[1][2] - v[0][2];
        const bx = v[2][0] - v[0][0], by = v[2][1] - v[0][1], bz = v[2][2] - v[0][2];
        const fx = ay * bz - az * by, fy = az * bx - ax * bz, fz = ax * by - ay * bx;
        if (fx * fx + fy * fy + fz * fz < 1e-12) continue;
        if (fx * (n[0][0] + n[1][0] + n[2][0]) + fy * (n[0][1] + n[1][1] + n[2][1]) + fz * (n[0][2] + n[1][2] + n[2][2]) < 0){ let q = v[1]; v[1] = v[2]; v[2] = q; q = n[1]; n[1] = n[2]; n[2] = q; q = o[1]; o[1] = o[2]; o[2] = q; }
        for (let k = 0; k < 3; k++){
          dp.push(v[k][0], v[k][1], v[k][2]); dn.push(n[k][0], n[k][1], n[k][2]); doo.push(o[k][0], o[k][1], o[k][2]);
          dc.push(C[0], C[1], C[2], C[3]); dm.push(S, E, BF);
        }
      }
    }
    /* a strip of quads between two rings of points (with their normals) */
    function band(r0, n0, r1, n1, closed, P, Nn){
      const n = r0.length, last = closed ? n : n - 1;
      for (let i = 0; i < last; i++){
        const j = (i + 1) % n;
        P.push(...r0[i], ...r1[i], ...r1[j], ...r0[i], ...r1[j], ...r0[j]);
        Nn.push(...n0[i], ...n1[i], ...n1[j], ...n0[i], ...n1[j], ...n0[j]);
      }
    }
    function fan(center, ring, nz, P, Nn){
      const n = ring.length;
      for (let i = 0; i < n; i++){
        const j = (i + 1) % n;
        P.push(...center, ...ring[i], ...ring[j]);
        Nn.push(...nz, ...nz, ...nz);
      }
    }
    const B = {
      /* ---------------- placement ---------------- */
      push(){ stack.push([M, N, C, S, E, BF]); return B; },
      pop(){ [M, N, C, S, E, BF] = stack.pop(); return B; },
      at(x, y, z){ M = mul(M, tr(x || 0, y || 0, z || 0)); N = nmat(M); return B; },
      rotZ(a){ if (a) { M = mul(M, rz(a)); N = nmat(M); } return B; },
      rotX(a){ if (a) { M = mul(M, rx(a)); N = nmat(M); } return B; },
      rotY(a){ if (a) { M = mul(M, ry(a)); N = nmat(M); } return B; },
      scale(x, y, z){ M = mul(M, sc(x, y == null ? x : y, z == null ? x : z)); N = nmat(M); return B; },
      /* ---------------- paint ---------------- */
      /* a colour (with alpha below 1 for glass and water) */
      color(c, a){ const v = rgb(c); C = [v[0], v[1], v[2], a == null ? v[3] : a]; BF = 0; return B; },
      /* the appliance's own body colour (its skin), darkened or lightened by k */
      body(k){ k = k == null ? 1 : k; C = [k, k, k, 1]; BF = 1; return B; },
      shine(s){ S = s; return B; },
      glow(e){ E = e; return B; },
      /* ---------------- moving parts ---------------- */
      part(anim, show){ cur = newPart(cur.idx, anim || null, show || null); return B; },
      endPart(){ cur = parts[cur.parent] || parts[0]; return B; },
      /* fn(time, t) runs once before each drawing, before any part moves (for spins that speed up and slow down) */
      prep(fn){ const old = prep; prep = old ? (a, b) => { old(a, b); fn(a, b); } : fn; return B; },
      /* moving parts can reach past the still model: how far (radius, height) at most */
      extent(R, Z){ extR = Math.max(extR, R || 0); extZ = Math.max(extZ, Z || 0); return B; },
      /* the height that sits on the appliance's spot in the kitchen */
      anchor(z){ anchor = z; return B; },
      /* the radius the picture is framed by, when the model's own reach would frame it too loosely */
      frameR(r){ keyR = r; return B; },

      /* ---------------- shapes ---------------- */
      /* a box from z = 0 up to h, centred on x and y */
      box(w, d, h){
        const x = w / 2, y = d / 2, P = [], Nn = [];
        const f = (a, b, c, e, n) => { P.push(...a, ...b, ...c, ...a, ...c, ...e); for (let i = 0; i < 6; i++) Nn.push(...n); };
        f([-x, -y, h], [x, -y, h], [x, y, h], [-x, y, h], [0, 0, 1]);
        f([-x, -y, 0], [-x, y, 0], [x, y, 0], [x, -y, 0], [0, 0, -1]);
        f([-x, y, 0], [-x, y, h], [x, y, h], [x, y, 0], [0, 1, 0]);
        f([-x, -y, 0], [x, -y, 0], [x, -y, h], [-x, -y, h], [0, -1, 0]);
        f([x, -y, 0], [x, y, 0], [x, y, h], [x, -y, h], [1, 0, 0]);
        f([-x, -y, 0], [-x, -y, h], [-x, y, h], [-x, y, 0], [-1, 0, 0]);
        add(P, Nn);
        return B;
      },
      /* a rounded box: corners rounded by r in plan, its top edge (and bottom edge, with bb) rounded off by b; from
         z = 0 up to h */
      rbox(w, d, h, r, b, bb){
        r = Math.max(0.02, Math.min(r == null ? 2 : r, w / 2 - 0.01, d / 2 - 0.01));
        b = Math.max(0, Math.min(b == null ? r * 0.45 : b, h * 0.45, r));
        bb = Math.max(0, Math.min(bb || 0, h * 0.45, r));
        const seg = r > 6 ? 7 : r > 2.5 ? 5 : 3;
        const out = [], on = [];
        const cs = [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, Math.PI / 2], [-w / 2 + r, -d / 2 + r, Math.PI], [w / 2 - r, -d / 2 + r, Math.PI * 1.5]];
        for (const [cx, cy, a0] of cs) for (let i = 0; i <= seg; i++){ const a = a0 + i / seg * Math.PI / 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); on.push([Math.cos(a), Math.sin(a)]); }
        const P = [], Nn = [];
        const ringAt = (z, ins) => out.map((p, i) => [p[0] - on[i][0] * ins, p[1] - on[i][1] * ins, z]);
        const side = on.map(n => [n[0], n[1], 0]);
        band(ringAt(bb, 0), side, ringAt(h - b, 0), side, true, P, Nn);
        const steps = 3;
        if (b > 0) for (let s = 0; s < steps; s++){
          const a0 = s / steps * Math.PI / 2, a1 = (s + 1) / steps * Math.PI / 2;
          const ring = a => ringAt(h - b + Math.sin(a) * b, b - Math.cos(a) * b), nr = a => on.map(n => [n[0] * Math.cos(a), n[1] * Math.cos(a), Math.sin(a)]);
          band(ring(a0), nr(a0), ring(a1), nr(a1), true, P, Nn);
        }
        if (bb > 0) for (let s = 0; s < steps; s++){
          const a0 = -Math.PI / 2 + s / steps * Math.PI / 2, a1 = -Math.PI / 2 + (s + 1) / steps * Math.PI / 2;
          const ring = a => ringAt(bb + Math.sin(a) * bb, bb - Math.cos(a) * bb), nr = a => on.map(n => [n[0] * Math.cos(a), n[1] * Math.cos(a), Math.sin(a)]);
          band(ring(a0), nr(a0), ring(a1), nr(a1), true, P, Nn);
        }
        fan([0, 0, h], ringAt(h, b), [0, 0, 1], P, Nn);
        fan([0, 0, 0], ringAt(0, bb).slice().reverse(), [0, 0, -1], P, Nn);
        add(P, Nn);
        return B;
      },
      /* a cylinder (a cone or a frustum when r2 differs) from z = 0 up to h; o.a0 turns its facets, o.top/o.bottom
         false leave it open, o.flat makes its sides flat facets */
      cyl(r1, r2, h, n, o){
        o = o || {}; n = n || 20;
        const P = [], Nn = [], b0 = [], b1 = [], ns = [];
        const slope = r1 - r2;
        for (let i = 0; i < n; i++){
          const a = i / n * Math.PI * 2 + (o.a0 || 0), c = Math.cos(a), s = Math.sin(a);
          b0.push([c * r1, s * r1, 0]); b1.push([c * r2, s * r2, h]);
          ns.push(norm3([c * h, s * h, slope]));
        }
        if (o.flat){
          for (let i = 0; i < n; i++){
            const j = (i + 1) % n, a = (i + 0.5) / n * Math.PI * 2 + (o.a0 || 0), nn = norm3([Math.cos(a) * h, Math.sin(a) * h, slope]);
            P.push(...b0[i], ...b1[i], ...b1[j], ...b0[i], ...b1[j], ...b0[j]);
            for (let k = 0; k < 6; k++) Nn.push(...nn);
          }
        } else band(b0, ns, b1, ns, true, P, Nn);
        if (o.bottom !== false && r1 > 0) fan([0, 0, 0], b0.slice().reverse(), [0, 0, -1], P, Nn);
        if (o.top !== false && r2 > 0) fan([0, 0, h], b1, [0, 0, 1], P, Nn);
        add(P, Nn);
        return B;
      },
      /* a turned shape from its profile: [r, z] points; a third value of 1 makes a hard edge there. o.caps false
         leaves the ends open; o.arc turns only part of the way round (from o.a0) */
      lathe(prof, n, o){
        o = o || {}; n = n || 20;
        const arc = o.arc || Math.PI * 2, a0 = o.a0 || 0, closed = arc >= Math.PI * 2 - 1e-6, steps = closed ? n : n + 1;
        const m = prof.length, segN = [];
        for (let j = 0; j < m - 1; j++){ const dr = prof[j + 1][0] - prof[j][0], dz = prof[j + 1][1] - prof[j][1]; segN.push(norm3([dz, 0, -dr])); }
        const P = [], Nn = [];
        for (let j = 0; j < m - 1; j++){
          if (Math.abs(prof[j + 1][0] - prof[j][0]) + Math.abs(prof[j + 1][1] - prof[j][1]) < 1e-6) continue;
          const nA = j > 0 && !prof[j][2] ? norm3([segN[j - 1][0] + segN[j][0], 0, segN[j - 1][2] + segN[j][2]]) : segN[j];
          const nB = j + 1 < m - 1 && !prof[j + 1][2] ? norm3([segN[j][0] + segN[j + 1][0], 0, segN[j][2] + segN[j + 1][2]]) : segN[j];
          const rA = [], rB = [], nnA = [], nnB = [];
          for (let i = 0; i < steps; i++){
            const a = a0 + i / n * arc, c = Math.cos(a), s = Math.sin(a);
            rA.push([c * prof[j][0], s * prof[j][0], prof[j][1]]); rB.push([c * prof[j + 1][0], s * prof[j + 1][0], prof[j + 1][1]]);
            nnA.push([c * nA[0], s * nA[0], nA[2]]); nnB.push([c * nB[0], s * nB[0], nB[2]]);
          }
          band(rA, nnA, rB, nnB, closed, P, Nn);
        }
        if (o.caps !== false && closed){
          const ring = j => { const r = []; for (let i = 0; i < n; i++){ const a = a0 + i / n * Math.PI * 2; r.push([Math.cos(a) * prof[j][0], Math.sin(a) * prof[j][0], prof[j][1]]); } return r; };
          if (prof[0][0] > 0.01) fan([0, 0, prof[0][1]], ring(0).reverse(), [0, 0, prof[1][1] >= prof[0][1] ? -1 : 1], P, Nn);
          if (prof[m - 1][0] > 0.01) fan([0, 0, prof[m - 1][1]], ring(m - 1), [0, 0, prof[m - 1][1] >= prof[m - 2][1] ? 1 : -1], P, Nn);
        }
        add(P, Nn);
        return B;
      },
      /* a ball centred on the origin (an egg or a bean with scale()) */
      sphere(r, n, m){
        n = n || 18; m = m || 10;
        const prof = [];
        for (let i = 0; i <= m; i++){ const p = -Math.PI / 2 + i / m * Math.PI; prof.push([Math.max(0, Math.cos(p) * r), Math.sin(p) * r]); }
        prof[0][0] = 0; prof[m][0] = 0;
        return B.lathe(prof, n, { caps: false });
      },
      /* half a ball, dome up, standing on z = 0 (closed underneath) */
      dome(r, n, m){
        n = n || 18; m = m || 6;
        const prof = [];
        for (let i = 0; i <= m; i++){ const p = i / m * Math.PI / 2; prof.push([Math.max(0, Math.cos(p) * r), Math.sin(p) * r]); }
        prof[m][0] = 0;
        return B.lathe(prof, n, { caps: true });
      },
      /* a capsule standing from z = 0 up to h (rounded ends of radius r) */
      capsule(r, h, n){
        const prof = [], m = 4;
        for (let i = 0; i <= m; i++){ const p = -Math.PI / 2 + i / m * Math.PI / 2; prof.push([Math.cos(p) * r, r + Math.sin(p) * r]); }
        for (let i = 0; i <= m; i++){ const p = i / m * Math.PI / 2; prof.push([Math.cos(p) * r, h - r + Math.sin(p) * r]); }
        prof[0][0] = 0; prof[prof.length - 1][0] = 0;
        return B.lathe(prof, n || 14, { caps: false });
      },
      /* a ring: radius R, thickness r, lying flat around z; arc in radians (from a0) */
      torus(R, r, n, m, arc, a0){
        n = n || 24; m = m || 8; arc = arc || Math.PI * 2; a0 = a0 || 0;
        const closed = arc >= Math.PI * 2 - 1e-6, P = [], Nn = [];
        const steps = closed ? n : n + 1;
        for (let j = 0; j < m; j++){
          const b0 = j / m * Math.PI * 2, b1 = (j + 1) / m * Math.PI * 2;
          const rA = [], rB = [], nA = [], nB = [];
          for (let i = 0; i < steps; i++){
            const a = a0 + i / n * arc, c = Math.cos(a), s = Math.sin(a);
            const p = bb => [c * (R + Math.cos(bb) * r), s * (R + Math.cos(bb) * r), Math.sin(bb) * r];
            const q = bb => [c * Math.cos(bb), s * Math.cos(bb), Math.sin(bb)];
            rA.push(p(b0)); rB.push(p(b1)); nA.push(q(b0)); nB.push(q(b1));
          }
          band(rA, nA, rB, nB, closed, P, Nn);
        }
        add(P, Nn);
        return B;
      },
      /* a flat outline ([x, y] points, either way round) extruded from z = 0 up to h */
      extrude(poly, h, o){
        o = o || {};
        const P = [], Nn = [], n = poly.length;
        let area = 0;
        for (let i = 0; i < n; i++){ const a = poly[i], b = poly[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
        const sgn = area >= 0 ? 1 : -1;
        for (let i = 0; i < n; i++){
          const a = poly[i], b = poly[(i + 1) % n];
          const nx = (b[1] - a[1]) * sgn, ny = (a[0] - b[0]) * sgn, L = Math.hypot(nx, ny) || 1;
          const nn = [nx / L, ny / L, 0];
          P.push(a[0], a[1], 0, b[0], b[1], 0, b[0], b[1], h, a[0], a[1], 0, b[0], b[1], h, a[0], a[1], h);
          for (let k = 0; k < 6; k++) Nn.push(...nn);
        }
        for (const [i, j, k] of earcut(poly)){
          P.push(poly[i][0], poly[i][1], h, poly[j][0], poly[j][1], h, poly[k][0], poly[k][1], h); Nn.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
          if (o.bottom !== false){ P.push(poly[i][0], poly[i][1], 0, poly[k][0], poly[k][1], 0, poly[j][0], poly[j][1], 0); Nn.push(0, 0, -1, 0, 0, -1, 0, 0, -1); }
        }
        add(P, Nn);
        return B;
      },
      /* a tube of radius r (or one radius per point) along a path of [x, y, z] points */
      tube(pts, r, n, o){
        o = o || {}; n = n || 8;
        const m = pts.length;
        if (m < 2) return B;
        const T = [];
        for (let i = 0; i < m; i++){
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)];
          T.push(norm3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]));
        }
        /* a frame carried along the path */
        let up = Math.abs(T[0][2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
        const rings = [], norms = [];
        for (let i = 0; i < m; i++){
          const t = T[i];
          const u = norm3([up[1] * t[2] - up[2] * t[1], up[2] * t[0] - up[0] * t[2], up[0] * t[1] - up[1] * t[0]]);
          const v = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
          up = v;
          const ring = [], nr = [], rr0 = Array.isArray(r) ? r[i] : r;
          for (let k = 0; k < n; k++){
            const a = k / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
            const d = [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s];
            ring.push([pts[i][0] + d[0] * rr0, pts[i][1] + d[1] * rr0, pts[i][2] + d[2] * rr0]); nr.push(d);
          }
          rings.push(ring); norms.push(nr);
        }
        const P = [], Nn = [];
        for (let i = 0; i < m - 1; i++) band(rings[i], norms[i], rings[i + 1], norms[i + 1], true, P, Nn);
        if (o.caps !== false){
          fan(pts[0], rings[0].slice().reverse(), T[0].map(x => -x), P, Nn);
          fan(pts[m - 1], rings[m - 1], T[m - 1], P, Nn);
        }
        add(P, Nn);
        return B;
      },
      /* a closed loop of tube (radius r) through [x, y, z] points: a rim, a trim, a hoop */
      hoop(pts, r, n){
        n = n || 6;
        const m = pts.length;
        if (m < 3) return B;
        const rings = [], norms = [];
        for (let i = 0; i < m; i++){
          const a = pts[(i - 1 + m) % m], b = pts[(i + 1) % m];
          const t = norm3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
          let up = Math.abs(t[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
          const u = norm3([up[1] * t[2] - up[2] * t[1], up[2] * t[0] - up[0] * t[2], up[0] * t[1] - up[1] * t[0]]);
          const v = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
          const ring = [], nr = [];
          for (let k = 0; k < n; k++){
            const q = k / n * Math.PI * 2, c = Math.cos(q), s = Math.sin(q);
            const d = [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s];
            ring.push([pts[i][0] + d[0] * r, pts[i][1] + d[1] * r, pts[i][2] + d[2] * r]); nr.push(d);
          }
          rings.push(ring); norms.push(nr);
        }
        const P = [], Nn = [];
        for (let i = 0; i < m; i++) band(rings[i], norms[i], rings[(i + 1) % m], norms[(i + 1) % m], true, P, Nn);
        add(P, Nn);
        return B;
      },
      /* a shape lofted through outlines at heights: rings = [[poly, z], ...] from the bottom up, every poly the same
         number of [x, y] points; o.top / o.bottom false leave the ends open */
      loft(rings, o){
        o = o || {};
        const m = rings.length, n = rings[0][0].length;
        let area = 0;
        const p0 = rings[0][0];
        for (let i = 0; i < n; i++){ const a = p0[i], b = p0[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
        const pts = rings.map(([poly, z]) => poly.map(p => [p[0], p[1], z]));
        const nrm = pts.map((ring, j) => ring.map((p, i) => {
          const a = ring[(i - 1 + n) % n], b = ring[(i + 1) % n];
          const T = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
          const lo = pts[Math.max(0, j - 1)][i], hi = pts[Math.min(m - 1, j + 1)][i];
          const U = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
          let N = norm3([T[1] * U[2] - T[2] * U[1], T[2] * U[0] - T[0] * U[2], T[0] * U[1] - T[1] * U[0]]);
          if ((area < 0) !== !!o.inward) N = N.map(x => -x);
          return N;
        }));
        const P = [], Nn = [];
        for (let j = 0; j < m - 1; j++) band(pts[j], nrm[j], pts[j + 1], nrm[j + 1], true, P, Nn);
        const cap = (j, up) => { const z = rings[j][1], poly = rings[j][0]; for (const [a, b, c] of earcut(poly)){ P.push(poly[a][0], poly[a][1], z, poly[b][0], poly[b][1], z, poly[c][0], poly[c][1], z); Nn.push(0, 0, up, 0, 0, up, 0, 0, up); } };
        if (o.bottom !== false) cap(0, -1);
        if (o.top !== false) cap(m - 1, 1);
        add(P, Nn);
        return B;
      },
      /* a flat band facing up at z = 0 between two outlines with the same number of [x, y] points (a rim's top) */
      strip(outer, inner){
        const P = [], Nn = [], n = outer.length;
        for (let i = 0; i < n; i++){
          const j = (i + 1) % n, a = outer[i], b = outer[j], c = inner[j], d = inner[i];
          P.push(a[0], a[1], 0, b[0], b[1], 0, c[0], c[1], 0, a[0], a[1], 0, c[0], c[1], 0, d[0], d[1], 0);
          for (let k = 0; k < 6; k++) Nn.push(0, 0, 1);
        }
        add(P, Nn, false);
        return B;
      },
      /* a flat disc facing up at z = 0 (a decal: it gets no outline) */
      disc(r, n, ry){
        n = n || 20;
        const ring = [];
        for (let i = 0; i < n; i++){ const a = i / n * Math.PI * 2; ring.push([Math.cos(a) * r, Math.sin(a) * (ry || r), 0]); }
        const P = [], Nn = [];
        fan([0, 0, 0], ring, [0, 0, 1], P, Nn);
        add(P, Nn, false);
        return B;
      },
      /* a flat outline lying at z = 0, facing up (a decal) */
      flat(poly){
        const P = [], Nn = [];
        for (const [i, j, k] of earcut(poly)){ P.push(poly[i][0], poly[i][1], 0, poly[j][0], poly[j][1], 0, poly[k][0], poly[k][1], 0); Nn.push(0, 0, 1, 0, 0, 1, 0, 0, 1); }
        add(P, Nn, false);
        return B;
      },
      /* a flat ring decal at z = 0 */
      annulus(r0, r1, n){
        n = n || 24;
        const P = [], Nn = [];
        for (let i = 0; i < n; i++){
          const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
          const p = (r, q) => [Math.cos(q) * r, Math.sin(q) * r, 0];
          P.push(...p(r0, a), ...p(r1, a), ...p(r1, b), ...p(r0, a), ...p(r1, b), ...p(r0, b));
          for (let k = 0; k < 6; k++) Nn.push(0, 0, 1);
        }
        add(P, Nn, false);
        return B;
      },
      done(){ return { parts, prep, extR, extZ, anchor, keyR }; },
    };
    return B;
  }
  /* triangulates a simple polygon (ear clipping); returns index triples */
  function earcut(poly){
    const n = poly.length, idx = [];
    for (let i = 0; i < n; i++) idx.push(i);
    let area = 0;
    for (let i = 0; i < n; i++){ const a = poly[i], b = poly[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    if (area < 0) idx.reverse();
    const out = [];
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const inside = (p, a, b, c) => cross(a, b, p) >= -1e-9 && cross(b, c, p) >= -1e-9 && cross(c, a, p) >= -1e-9;
    let guard = 0;
    while (idx.length > 3 && guard++ < 10000){
      let cut = false;
      for (let i = 0; i < idx.length; i++){
        const i0 = idx[(i + idx.length - 1) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length];
        const a = poly[i0], b = poly[i1], c = poly[i2];
        if (cross(a, b, c) <= 1e-9) continue;
        let ear = true;
        for (const j of idx){ if (j === i0 || j === i1 || j === i2) continue; const p = poly[j]; if ((p[0] === a[0] && p[1] === a[1]) || (p[0] === b[0] && p[1] === b[1]) || (p[0] === c[0] && p[1] === c[1])) continue; if (inside(p, a, b, c)){ ear = false; break; } }
        if (!ear) continue;
        out.push([i0, i1, i2]); idx.splice(i, 1); cut = true; break;
      }
      if (!cut){
        /* a degenerate leftover: fan it so nothing is lost */
        for (let i = 1; i + 1 < idx.length; i++) out.push([idx[0], idx[i], idx[i + 1]]);
        idx.length = 0;
        break;
      }
    }
    if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
    return out;
  }

  /* ---------------- WebGL ---------------- */
  const VS = `
attribute vec3 aP; attribute vec3 aN; attribute vec3 aO; attribute vec4 aC; attribute vec4 aM;
uniform mat4 uVP; uniform mat4 uW; uniform mat3 uWN; uniform mat4 uF; uniform float uOut;
varying vec3 vN; varying vec4 vC; varying vec4 vM; varying float vZ;
void main(){
  vec3 n = normalize(uWN * aN);
  vec4 w = uW * vec4(aP, 1.0);
  vZ = w.z;
  if (uOut > 0.0) w.xyz += normalize(uWN * aO) * uOut;
  w = uF * w;
  vN = n; vC = aC; vM = aM;
  gl_Position = uVP * w;
}`;
  const FS = `
precision mediump float;
uniform int uMode; uniform vec3 uL; uniform vec3 uV; uniform vec3 uFill; uniform vec3 uH; uniform vec3 uBody;
uniform float uDark; uniform float uShA; uniform float uAO;
varying vec3 vN; varying vec4 vC; varying vec4 vM; varying float vZ;
void main(){
  if (uMode == 2){ gl_FragColor = vec4(0.0, 0.0, 0.0, uShA); return; }
  vec3 base = mix(vC.rgb, vC.rgb * uBody, vM.z);
  if (uMode == 1){ gl_FragColor = vec4(base * uDark, 1.0); return; }
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  float d = dot(N, uL);
  float key = mix(max(d, 0.0), smoothstep(-0.04, 0.3, d) * 0.85, 0.35);
  float fill = max(dot(N, uFill), 0.0);
  float ao = mix(uAO, 1.0, clamp(vZ / 4.0, 0.0, 1.0));
  /* toon shading: the light falls in three soft bands (shadow, lit, bright), with a little of the smooth
     shading kept so round things still read as round */
  float lit = 0.5 + 0.64 * key + 0.2 * fill;
  float band = 0.58 + 0.36 * smoothstep(0.56, 0.66, lit) + 0.26 * smoothstep(0.92, 1.0, lit);
  vec3 c = base * mix(lit, band, 0.7) * mix(ao, 1.0, 0.25);
  /* a crisp highlight, and a touch more colour */
  float sp = smoothstep(0.55, 0.72, pow(max(dot(N, uH), 0.0), 18.0)) * vM.x;
  c += vec3(0.42 * sp) + base * vM.x * 0.1 * smoothstep(0.55, 1.0, dot(N, uH));
  float rim = pow(1.0 - max(dot(N, uV), 0.0), 3.0) * 0.1;
  c += base * rim;
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(luma), c, 1.16);
  c = mix(c, base * 1.12 + vec3(0.05), vM.y);
  gl_FragColor = vec4(c * vC.a, vC.a);
}`;
  function init(){
    if (tried) return !!gl;
    tried = true;
    try {
      if (typeof document === 'undefined') throw new Error('no document');
      cv = document.createElement('canvas'); cv.width = AW; cv.height = AH;
      gl = cv.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, depth: false, stencil: false });
      if (!gl) throw new Error('no webgl2');
      /* a renderer without a graphics card draws every picture on the processor: too slow for this, so the
         appliances keep their flat-built solid look there */
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const rend = String((dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '');
      software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(rend);
      if (software && !(typeof window !== 'undefined' && window.KS_GL_SOFT)){ const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); cv = null; throw new Error('software renderer'); }
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      loc = {};
      for (const a of ['aP', 'aN', 'aO', 'aC', 'aM']) loc[a] = gl.getAttribLocation(prog, a);
      for (const u of ['uVP', 'uW', 'uWN', 'uF', 'uOut', 'uMode', 'uL', 'uV', 'uFill', 'uH', 'uBody', 'uDark', 'uShA', 'uAO']) loc[u] = gl.getUniformLocation(prog, u);
      /* the world here is left-handed (y runs toward the viewer), so outward faces wind clockwise on screen */
      gl.frontFace(gl.CW);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; models.clear(); ms = null; atlasReset(); });
      cv.addEventListener('webglcontextrestored', () => { lost = false; tried = false; gl = null; init(); });
      return true;
    } catch (e) {
      broken = true; gl = null;
      return false;
    }
  }
  function ok(){ return !broken && !lost && init() && !!gl; }
  /* the scratch targets a picture is drawn in: multisampled (for smooth edges), then resolved into a plain one */
  function targets(w, h){
    if (ms && ms.w >= w && ms.h >= h) return ms;
    const W2 = Math.max(w, ms ? ms.w : 0, 128), H2 = Math.max(h, ms ? ms.h : 0, 128);
    if (ms){ gl.deleteFramebuffer(ms.fb); gl.deleteFramebuffer(ms.rf); gl.deleteRenderbuffer(ms.cb); gl.deleteRenderbuffer(ms.db); gl.deleteRenderbuffer(ms.rb); }
    const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0);
    const cb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, cb);
    if (samples > 1) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, W2, H2); else gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, W2, H2);
    const db = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, db);
    if (samples > 1) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, W2, H2); else gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W2, H2);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, cb);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, db);
    const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, W2, H2);
    const rf = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, rf);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    ms = { fb, rf, cb, db, rb, w: W2, h: H2, samples };
    return ms;
  }

  /* ---------------- the atlas ----------------
     Pictures are packed in shelves (rows of one height) across the WebGL canvas. A freed place is reused by the
     next picture that fits; when nothing fits, the atlas starts over (every kept picture is drawn again). */
  let shelves = [], shelfY = 0, resets = 0, lastReset = -99, forceRoom = false;
  function atlasReset(){ shelves = []; shelfY = 0; gen++; }
  function alloc(w, h){
    w = Math.ceil(w / 4) * 4 + 2; const hh = Math.ceil((h + 2) / 8) * 8;
    if (w > AW || hh > AH) return null;
    for (const s of shelves){
      if (s.h < hh || s.h > hh * 1.4 + 8) continue;
      for (let i = 0; i < s.items.length; i++){
        const it = s.items[i];
        if (!it.free || it.w < w) continue;
        if (it.w > w + 8){ s.items.splice(i + 1, 0, { x: it.x + w, w: it.w - w, free: true }); it.w = w; }
        it.free = false;
        return { x: it.x, y: s.y, w: it.w - 2, h: s.h - 2, shelf: s, item: it, gen };
      }
      if (s.end + w <= AW){ const it = { x: s.end, w, free: false }; s.items.push(it); s.end += w; return { x: it.x, y: s.y, w: w - 2, h: s.h - 2, shelf: s, item: it, gen }; }
    }
    if (shelfY + hh > AH) return null;
    const s = { y: shelfY, h: hh, items: [], end: 0 };
    shelfY += hh; shelves.push(s);
    const it = { x: 0, w, free: false }; s.items.push(it); s.end = w;
    return { x: it.x, y: s.y, w: w - 2, h: hh - 2, shelf: s, item: it, gen };
  }
  function release(slot){
    if (!slot || slot.gen !== gen || !slot.item || slot.item.free) return;
    const s = slot.shelf, items = s.items;
    slot.item.free = true;
    /* merge free neighbours, and give the end of the shelf back */
    for (let i = items.length - 2; i >= 0; i--) if (items[i].free && items[i + 1].free){ items[i].w += items[i + 1].w; items.splice(i + 1, 1); }
    while (items.length && items[items.length - 1].free){ const it = items.pop(); s.end = it.x; }
  }
  /* a place for a picture of w x h device pixels: the one it had if it still fits, else a new one */
  function place(old, w, h){
    if (old && old.gen === gen && old.w >= w && old.h >= h && old.w <= w + 24 && old.h <= h + 24) return old;
    release(old);
    let s = alloc(w, h);
    if (!s && asize + 1 < ATLAS_SIZES.length){
      /* room for more: a bigger atlas, starting over */
      asize++; [AW, AH] = ATLAS_SIZES[asize];
      cv.width = AW; cv.height = AH;
      resets++; atlasReset(); s = alloc(w, h);
    } else if (!s && (forceRoom || frame - lastReset > 30)){ lastReset = frame; resets++; atlasReset(); s = alloc(w, h); }
    return s;
  }

  /* ---------------- models ---------------- */
  /* uploads one part's triangles, sharing the vertices they have in common: each vertex is its position (floats),
     its normal and outline normal (signed bytes), colour and material (bytes), 28 bytes in all */
  const STRIDE = 28;
  function upload(pos, nrm, onr, col, mat){
    const n = pos.length / 3;
    if (!n) return null;
    const tmp = new ArrayBuffer(STRIDE), tf = new Float32Array(tmp, 0, 3), ti = new Int8Array(tmp), tu = new Uint8Array(tmp);
    const q = v => Math.round(Math.max(-1, Math.min(1, v)) * 127);
    const u = v => Math.round(Math.max(0, Math.min(1, v)) * 255);
    const seen = new Map(), out = new Uint8Array(n * STRIDE), idx = new Uint32Array(n);
    let nv = 0;
    for (let i = 0; i < n; i++){
      tf[0] = pos[i * 3]; tf[1] = pos[i * 3 + 1]; tf[2] = pos[i * 3 + 2];
      ti[12] = q(nrm[i * 3]); ti[13] = q(nrm[i * 3 + 1]); ti[14] = q(nrm[i * 3 + 2]); ti[15] = 0;
      ti[16] = q(onr[i * 3]); ti[17] = q(onr[i * 3 + 1]); ti[18] = q(onr[i * 3 + 2]); ti[19] = 0;
      for (let k = 0; k < 4; k++) tu[20 + k] = u(col[i * 4 + k]);
      for (let k = 0; k < 3; k++) tu[24 + k] = u(mat[i * 3 + k]);
      tu[27] = 0;
      const key = String.fromCharCode.apply(null, tu);
      let k = seen.get(key);
      if (k === undefined){ k = nv++; seen.set(key, k); out.set(tu, k * STRIDE); }
      idx[i] = k;
    }
    const vb = gl.createBuffer(), ib = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, out.subarray(0, nv * STRIDE), gl.STATIC_DRAW);
    const small = nv < 65536;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, small ? Uint16Array.from(idx) : idx, gl.STATIC_DRAW);
    for (const a of ['aP', 'aN', 'aO', 'aC', 'aM']) gl.enableVertexAttribArray(loc[a]);
    gl.vertexAttribPointer(loc.aP, 3, gl.FLOAT, false, STRIDE, 0);
    gl.vertexAttribPointer(loc.aN, 3, gl.BYTE, true, STRIDE, 12);
    gl.vertexAttribPointer(loc.aO, 3, gl.BYTE, true, STRIDE, 16);
    gl.vertexAttribPointer(loc.aC, 4, gl.UNSIGNED_BYTE, true, STRIDE, 20);
    gl.vertexAttribPointer(loc.aM, 4, gl.UNSIGNED_BYTE, true, STRIDE, 24);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return { vb, ib, vao, n, type: small ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT, bytes: nv * STRIDE + n * (small ? 2 : 4) };
  }
  /* builds a model once and keeps it on the GPU, with how far it reaches (radius R, height Z) */
  function model(key, build){
    let m = models.get(key);
    if (m){ m.used = frame; return m; }
    if (!ok()) return null;
    const B = builder();
    build(B);
    const d = B.done();
    let R = 1, Z = 1, tris = 0;
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const p of d.parts){
      for (const arr of [p.pos, p.tpos]) for (let i = 0; i < arr.length; i += 3){
        R = Math.max(R, Math.hypot(arr[i], arr[i + 1])); Z = Math.max(Z, arr[i + 2]);
        for (let k = 0; k < 3; k++){ if (arr[i + k] < box[k]) box[k] = arr[i + k]; if (arr[i + k] > box[3 + k]) box[3 + k] = arr[i + k]; }
      }
      tris += (p.pos.length + p.tpos.length) / 9;
    }
    R = Math.max(R, d.extR); Z = Math.max(Z, d.extZ);
    if (!(box[0] <= box[3])) box.splice(0, 6, -1, -1, 0, 1, 1, 1);
    m = { key, parts: [], R: d.keyR || R, Z, box, used: frame, prep: d.prep, anchor: d.anchor, tris, moving: !!d.prep, bytes: 0 };
    for (const p of d.parts){
      const op = upload(p.pos, p.nrm, p.onr, p.col, p.mat), tp = upload(p.tpos, p.tnrm, p.tonr, p.tcol, p.tmat);
      if (p.anim || p.show) m.moving = true;
      m.bytes += (op ? op.bytes : 0) + (tp ? tp.bytes : 0);
      m.parts.push({ op, tp, parent: p.parent, m0: p.m0, m0i: inv(p.m0), anim: p.anim, show: p.show });
    }
    models.set(key, m);
    /* keep the GPU tidy: forget the models not drawn for longest */
    if (models.size > 96){
      const old = [...models.values()].sort((a, b) => a.used - b.used).slice(0, 24);
      for (const o of old){ for (const p of o.parts){ dropBuf(p.op); dropBuf(p.tp); } models.delete(o.key); }
    }
    return m;
  }
  function dropBuf(b){ if (!b) return; gl.deleteBuffer(b.vb); gl.deleteBuffer(b.ib); gl.deleteVertexArray(b.vao); }
  /* each part's frame this moment, and whether it shows */
  function pose(m, W, time, t){
    const out = new Array(m.parts.length);
    for (let i = 0; i < m.parts.length; i++){
      const p = m.parts[i], par = p.parent >= 0 ? out[p.parent] : null;
      let vis = par ? par.vis : true;
      if (vis && p.show) vis = !!p.show(time, t);
      let T = par ? par.T : W;
      if (vis && p.anim){
        const a = p.anim(time, t) || {};
        let A = m4();
        if (a.x || a.y || a.z) A = mul(A, tr(a.x || 0, a.y || 0, a.z || 0));
        if (a.rz) A = mul(A, rz(a.rz));
        if (a.ry) A = mul(A, ry(a.ry));
        if (a.rx) A = mul(A, rx(a.rx));
        if (a.s != null || a.sx != null || a.sy != null || a.sz != null){ const s = a.s == null ? 1 : a.s; A = mul(A, sc(a.sx == null ? s : a.sx, a.sy == null ? s : a.sy, a.sz == null ? s : a.sz)); }
        T = mul(T, mul(p.m0, mul(A, p.m0i)));
      }
      out[i] = { T, vis, N: null };
    }
    return out;
  }
  /* The frame of a model's picture, in kitchen pixels around its spot: the model rises from the floor and its spot
     sits at the anchor height, with room for its shadow to the right and below when it casts one. */
  function frameOf(m, s, cast, lift, tight){
    if (tight && m.box){
      /* a model that never turns (scenery) is framed by its own box, which is far snugger for long, flat things */
      const b = m.box, Z = m.Z * s, za = (m.anchor != null ? m.anchor * s : Z * (lift == null ? 0.5 : lift)), pad = 3.5;
      const x0 = b[0] * s, y0 = b[1] * s, z0 = b[2] * s, x1 = b[3] * s, y1 = b[4] * s, z1 = b[5] * s;
      let right = x1 + pad, bottom = CT * y1 - ST * (z0 - za) + pad;
      if (cast){ right = Math.max(right, x1 + Math.max(0, z1) * SHADOW[0] + pad); bottom = Math.max(bottom, CT * (y1 + Math.max(0, z1) * SHADOW[1]) + ST * za + pad); }
      return { left: -x0 + pad, right, top: -(CT * y0 - ST * (z1 - za)) + pad, bottom, za, Z };
    }
    const R = m.R * s + 1.5, Z = m.Z * s;
    const za = (m.anchor != null ? m.anchor * s : Z * (lift == null ? 0.5 : lift));
    const pad = 3.5;
    const shx = cast ? Z * SHADOW[0] : 0, shy = cast ? Z * SHADOW[1] * CT : 0;
    return { left: R + pad, right: R + pad + shx, top: R * CT + Math.max(0, Z - za) * ST + pad, bottom: R * CT + za * ST + shy + pad, za, Z };
  }
  /* Draws model m into the atlas: o = { k: device pixels per kitchen pixel, rot: its turn, s: its scale, time, t
     (the appliance, for moving parts), dx/dy: a kick in the floor plane, body: its body colour, cast: draw its
     shadow too, lift: the anchor height as a share of its height when the model doesn't set one }.
     keep (an object the caller holds) remembers the places, frame and size; it is returned, or null if the atlas
     had no room. */
  function render(m, o, keep){
    if (!m || !ok()) return null;
    frame++;
    m.used = frame;
    const k = o.k, s = o.s || 1;
    const F = frameOf(m, s, !!o.cast, o.lift, o.tight);
    const w = Math.max(2, Math.ceil((F.left + F.right) * k)), h = Math.max(2, Math.ceil((F.top + F.bottom) * k));
    const w2 = o.cast ? Math.max(2, Math.ceil(w * 0.5)) : 0, h2 = o.cast ? Math.max(2, Math.ceil(h * 0.5)) : 0;
    if (w > 1024 || h > 1024) return null;
    /* o.force: a picture drawn once and copied straight out (a kitchen's prop) may start the atlas over at once */
    forceRoom = !!o.force;
    keep.slot = place(keep.slot, w, h);
    if (!keep.slot){ forceRoom = false; return null; }
    if (o.cast){
      keep.shSlot = place(keep.shSlot, w2, h2);
      if (!keep.shSlot){ release(keep.slot); keep.slot = null; forceRoom = false; return null; }
      /* a reset while placing the shadow can drop the picture's own place */
      if (keep.slot.gen !== gen){ keep.slot = place(null, w, h); if (!keep.slot){ forceRoom = false; return null; } }
    } else if (keep.shSlot){ release(keep.shSlot); keep.shSlot = null; }
    forceRoom = false;
    const T = targets(w, h);
    gl.useProgram(prog);
    /* the camera: x stays x; down the screen is y·cos − (z − za)·sin; nearer is y·sin + z·cos */
    const D = (m.R + m.Z + Math.max(0, -(m.box ? m.box[2] : 0))) * s * 1.6 + 12;
    const sx = 2 * k / w, sy = 2 * k / h;
    const VP = new Float32Array([
      sx, 0, 0, 0,
      0, -CT * sy, -ST / D, 0,
      0, ST * sy, -CT / D, 0,
      sx * F.left - 1, 1 - sy * F.top - sy * ST * F.za, 0, 1,
    ]);
    gl.uniformMatrix4fv(loc.uVP, false, VP);
    gl.uniform3fv(loc.uL, LIGHT); gl.uniform3fv(loc.uV, VIEW); gl.uniform3fv(loc.uFill, FILL); gl.uniform3fv(loc.uH, HALF);
    const body = o.body || [1, 1, 1];
    gl.uniform3f(loc.uBody, body[0], body[1], body[2]);
    gl.uniform1f(loc.uDark, o.dark == null ? 0.3 : o.dark);
    gl.uniform1f(loc.uShA, o.shA == null ? 0.3 : o.shA);
    gl.uniform1f(loc.uAO, o.ao == null ? (o.cast ? 0.74 : 0.92) : o.ao);
    if (m.prep) m.prep(o.time, o.t);
    const W = mul(tr(o.dx || 0, o.dy || 0, o.dz || 0), mul(rz(o.rot || 0), sc(s, s, s)));
    const P = pose(m, W, o.time, o.t);
    const draw = (b, q) => {
      if (!q.N) q.N = nmat(q.T);
      gl.uniformMatrix4fv(loc.uW, false, q.T); gl.uniformMatrix3fv(loc.uWN, false, q.N);
      gl.bindVertexArray(b.vao); gl.drawElements(gl.TRIANGLES, b.n, b.type, 0);
    };
    const ID = m4();
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb);
    gl.enable(gl.SCISSOR_TEST);
    /* 1. the shadow on the floor: the model flattened along the light, at half size (which softens it) */
    if (o.cast){
      gl.viewport(0, 0, w2, h2); gl.scissor(0, 0, w2, h2);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.depthMask(false);
      const Fl = m4(); Fl[8] = SHADOW[0]; Fl[9] = SHADOW[1]; Fl[10] = 0;
      gl.uniformMatrix4fv(loc.uF, false, Fl);
      gl.uniform1i(loc.uMode, 2); gl.uniform1f(loc.uOut, 0);
      for (let i = 0; i < m.parts.length; i++){ const p = m.parts[i], q = P[i]; if (!q.vis) continue; if (p.op) draw(p.op, q); if (p.tp) draw(p.tp, q); }
      resolve(T, w2, h2, keep.shSlot);
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb);
    }
    /* 2. the model: lit, then its outline, then glass and water over it */
    gl.viewport(0, 0, w, h); gl.scissor(0, 0, w, h);
    gl.uniformMatrix4fv(loc.uF, false, ID);
    gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    gl.uniform1i(loc.uMode, 0); gl.uniform1f(loc.uOut, 0);
    for (let i = 0; i < m.parts.length; i++){ const p = m.parts[i], q = P[i]; if (q.vis && p.op) draw(p.op, q); }
    if (o.outline !== false){
      gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
      gl.uniform1i(loc.uMode, 1); gl.uniform1f(loc.uOut, o.outlineW || 1.0);
      for (let i = 0; i < m.parts.length; i++){ const p = m.parts[i], q = P[i]; if (q.vis && p.op) draw(p.op, q); }
      gl.disable(gl.CULL_FACE);
    }
    let glass = false;
    for (let i = 0; i < m.parts.length; i++) if (P[i].vis && m.parts[i].tp){ glass = true; break; }
    if (glass){
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      gl.enable(gl.CULL_FACE);
      gl.uniform1i(loc.uMode, 0); gl.uniform1f(loc.uOut, 0);
      for (const face of [gl.FRONT, gl.BACK]){
        gl.cullFace(face);
        for (let i = 0; i < m.parts.length; i++){ const p = m.parts[i], q = P[i]; if (q.vis && p.tp) draw(p.tp, q); }
      }
      gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    }
    resolve(T, w, h, keep.slot);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
    gl.disable(gl.SCISSOR_TEST);
    keep.gl = true; keep.gen = gen;
    keep.ax = F.left; keep.ay = F.top; keep.kw = w / k; keep.kh = h / k; keep.w = w; keep.h = h; keep.w2 = w2; keep.h2 = h2; keep.k = k;
    keep.za = F.za;
    return keep;
  }
  /* the drawing, resolved to plain pixels, into its place in the atlas (the atlas's rows count up from its foot) */
  function resolve(T, w, h, slot){
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.rf);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.rf);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    const y0 = AH - slot.y - h;
    gl.blitFramebuffer(0, 0, w, h, slot.x, y0, slot.x + w, y0 + h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.enable(gl.SCISSOR_TEST);
  }
  /* a kept picture onto a 2D canvas: sw x sh device pixels of its place, into (dx, dy, dw, dh) */
  function draw(g, slot, sw, sh, dx, dy, dw, dh){
    if (!slot || slot.gen !== gen || !cv) return false;
    g.drawImage(cv, slot.x, slot.y, sw, sh, dx, dy, dw, dh);
    return true;
  }
  function valid(keep){ return !!(keep && keep.gl && keep.gen === gen && keep.slot && keep.slot.gen === gen && (!keep.w2 || (keep.shSlot && keep.shSlot.gen === gen))); }
  function forget(keep){ if (!keep) return; release(keep.slot); release(keep.shSlot); keep.slot = keep.shSlot = null; keep.gl = false; }
  function clear(){
    if (gl) for (const m of models.values()) for (const p of m.parts){ dropBuf(p.op); dropBuf(p.tp); }
    models.clear(); atlasReset();
  }
  /* how far a model reaches on screen, turned by rot at scale s (with its shadow when it casts one), in kitchen
     pixels from its spot: { x0, y0, x1, y1 } */
  function bounds(m, rot, s, cast){
    const F = frameOf(m, s, cast), c = Math.cos(rot || 0), sn = Math.sin(rot || 0), b = m.box;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const take = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
    for (const X of [b[0], b[3]]) for (const Y of [b[1], b[4]]) for (const Zc of [b[2], b[5]]){
      const x = (X * c - Y * sn) * s, y = (X * sn + Y * c) * s, z = Zc * s;
      take(x, CT * y - ST * (z - F.za));
      if (cast) take(x + z * SHADOW[0], CT * (y + z * SHADOW[1]) + ST * F.za);
    }
    return { x0: x0 - 1.5, y0: y0 - 1.5, x1: x1 + 1.5, y1: y1 + 1.5 };
  }
  /* the turn that makes a model facing `face` point along `aim` on screen: the camera squashes the floor up and
     down, so a model has to turn a little further toward the viewer for its aim to look right */
  function turnFor(aim, face){ return Math.atan2(Math.sin(aim), Math.cos(aim) * CT) - face; }
  function stats(){ return { models: models.size, shelves: shelves.length, used: shelfY, atlas: AW + 'x' + AH, resets, gen, broken, lost, software, tris: [...models.values()].reduce((s, m) => s + m.tris, 0), kb: Math.round([...models.values()].reduce((s, m) => s + m.bytes, 0) / 1024) }; }
  return { ok, model, render, draw, valid, forget, clear, frameOf, bounds, turnFor, stats, rgb, CT, ST, TILT, get canvas(){ return cv; }, get gen(){ return gen; } };
})();
