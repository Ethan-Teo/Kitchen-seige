'use strict';
/* =====================================================================
   Kitchen Siege — sprites: pests, appliances, projectiles, effects
   ===================================================================== */
const Art = (() => {
  let SK = 2; // sprite cache resolution multiplier
  const cache = new Map();

  /* ---------------- pests ---------------- */
  function legs(g, xs, len, f, color, lw){
    g.strokeStyle = color; g.lineWidth = lw || 1; g.lineCap = 'round'; g.lineJoin = 'round';
    xs.forEach((x, i) => {
      for (const side of [-1, 1]){
        const fwd = ((i + (side > 0 ? 1 : 0) + f) % 2) ? 1.6 : -1.2;
        g.beginPath();
        g.moveTo(x, side * 1.2);
        g.lineTo(x + fwd * 0.6, side * len * 0.55);
        g.lineTo(x + fwd * 1.4 + (i - 1) * 1.2, side * len);
        g.stroke();
      }
    });
  }
  function antennae(g, x, len, spread, color, lw){
    g.strokeStyle = color; g.lineWidth = lw || 0.9; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, -1); g.quadraticCurveTo(x + len * 0.5, -spread * 1.4, x + len, -spread);
    g.moveTo(x, 1); g.quadraticCurveTo(x + len * 0.5, spread * 1.4, x + len, spread);
    g.stroke();
  }
  function sheen(g, x, y, rx, ry, a){ ell(g, x, y, rx, ry, a || 0); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fill(); }
  function antBody(g, f, c1, c2, out){
    legs(g, [-1.2, 0.4, 2], 7, f, out, 1);
    antennae(g, 6.2, 5, 3.4, out, 0.9);
    ell(g, -5, 0, 4.6, 3.6); fillStroke(g, c1, out, 0.8);
    ell(g, -0.2, 0, 2.6, 2.1); fillStroke(g, c2, out, 0.8);
    circle(g, 4.6, 0, 2.8); fillStroke(g, c1, out, 0.8);
    sheen(g, -6, -1.4, 1.8, 0.9);
    circle(g, 5.8, -1.1, 0.6); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
    circle(g, 5.8, 1.1, 0.6); g.fill();
  }
  function wings(g, f, len, wid, color){
    const a = f ? 0.35 : 0.85;
    g.fillStyle = color; g.strokeStyle = 'rgba(80,90,100,0.35)'; g.lineWidth = 0.6;
    for (const s of [-1, 1]){ g.save(); g.rotate(s * a); ell(g, -len * 0.55, s * wid * 0.6, len * 0.6, wid * 0.5); g.fill(); g.stroke(); g.restore(); }
  }
  const PEST = {
    ant(g, f){ antBody(g, f, '#3a2418', '#4a2f1f', '#1a0f09'); },
    /* a silver teardrop with scaled bands and three tail bristles */
    silverfish(g, f){
      legs(g, [-1, 1, 3], 5, f, '#5d6670', 0.7);
      g.strokeStyle = '#7f8b95'; g.lineWidth = 0.7; g.lineCap = 'round';
      for (const s of [-1, 0, 1]){ g.beginPath(); g.moveTo(-6.5, 0); g.lineTo(-12, s * 3.2 + (f ? s * 0.6 : 0)); g.stroke(); }
      antennae(g, 4.5, 6, 4, '#7f8b95', 0.7);
      g.beginPath(); g.moveTo(5, 0); g.quadraticCurveTo(3, -3.6, -2, -3.2); g.quadraticCurveTo(-6, -2.2, -7.5, 0); g.quadraticCurveTo(-6, 2.2, -2, 3.2); g.quadraticCurveTo(3, 3.6, 5, 0); g.closePath();
      fillStroke(g, '#c9d2d6', '#5d6670', 0.8);
      g.strokeStyle = 'rgba(93,102,112,0.55)'; g.lineWidth = 0.6; for (let x = -5; x <= 2; x += 1.8){ g.beginPath(); g.moveTo(x, -2.8); g.lineTo(x + 0.6, 2.8); g.stroke(); }
      sheen(g, -1, -1.4, 3, 0.9);
    },
    /* a green cricket with its big folded jumping legs */
    cricket(g, f){
      legs(g, [1, 2.6], 5, f, '#3c5a24', 0.9);
      g.strokeStyle = '#3c5a24'; g.lineWidth = 1.5; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const s of [-1, 1]){ g.beginPath(); g.moveTo(-1, s * 2); g.lineTo(-5, s * (6.5 + f)); g.lineTo(-10, s * (3 + f * 0.5)); g.stroke(); }
      antennae(g, 4.5, 9, 5, '#3c5a24', 0.6);
      ell(g, -2.5, 0, 6, 3.4); fillStroke(g, '#6f9a3a', '#3c5a24', 0.8);
      g.strokeStyle = 'rgba(40,60,20,0.5)'; g.lineWidth = 0.6; for (let x = -6; x <= 0; x += 2){ g.beginPath(); g.moveTo(x, -3); g.lineTo(x, 3); g.stroke(); }
      ell(g, 3.6, 0, 2.4, 2.6); fillStroke(g, '#7fae46', '#3c5a24', 0.8);
      circle(g, 4.6, -1.6, 0.8); g.fillStyle = '#1d2124'; g.fill(); circle(g, 4.6, 1.6, 0.8); g.fill();
      sheen(g, -3, -1.4, 3, 0.8);
    },
    /* an ant carrying a great round belly of honey */
    honeypot(g, f){
      legs(g, [1, 2.4, 3.8], 6, f, '#2a1a10', 0.9);
      antennae(g, 7.5, 4.5, 3, '#2a1a10', 0.8);
      circle(g, -4, 0, 6.6); fillStroke(g, '#f0a12e', '#8a5410', 1);
      g.strokeStyle = 'rgba(138,84,16,0.45)'; g.lineWidth = 0.8; for (const r of [2.6, 4.6]){ g.beginPath(); g.arc(-4, 0, r, -1.2, 1.2); g.stroke(); }
      ell(g, -6, -2.6, 2.6, 1.4, -0.4); g.fillStyle = 'rgba(255,248,214,0.8)'; g.fill();
      ell(g, 2.4, 0, 2.2, 1.8); fillStroke(g, '#3a2418', '#1a0f09', 0.7);
      circle(g, 6, 0, 2.4); fillStroke(g, '#3a2418', '#1a0f09', 0.7);
    },
    /* a long reddish centipede, segment after segment, legs all along it */
    centipede(g, f){
      g.strokeStyle = '#6a2a14'; g.lineWidth = 0.8; g.lineCap = 'round';
      for (let i = 0; i < 6; i++){ const x = -11 + i * 3.8; for (const s of [-1, 1]){ const k = ((i + f + (s > 0 ? 1 : 0)) % 2) ? 1.2 : -1.2; g.beginPath(); g.moveTo(x, s * 2); g.lineTo(x + k, s * 6); g.stroke(); } }
      antennae(g, 9, 5, 4, '#6a2a14', 0.7);
      for (let i = 0; i < 6; i++){ const x = -11 + i * 3.8; ell(g, x, Math.sin(i * 1.3 + f) * 0.6, 2.4, 2.9); fillStroke(g, i % 2 ? '#b24a24' : '#c8602c', '#6a2a14', 0.7); }
      circle(g, 10, 0, 2.6); fillStroke(g, '#8a3018', '#4a1a0c', 0.7);
      sheen(g, -2, -1.6, 6, 0.6);
    },
    /* a broad shield-shaped beetle in green bronze */
    shieldbug(g, f){
      legs(g, [-2, 0.5, 3], 7.5, f, '#2a3320', 1.1);
      antennae(g, 7, 5, 4, '#2a3320', 0.8);
      g.beginPath(); g.moveTo(7, 0); g.lineTo(3, -6.5); g.lineTo(-6, -6); g.lineTo(-10, 0); g.lineTo(-6, 6); g.lineTo(3, 6.5); g.closePath();
      fillStroke(g, '#5f7a3a', '#2a3320', 1);
      g.beginPath(); g.moveTo(3, -6); g.lineTo(-2, 0); g.lineTo(3, 6); g.strokeStyle = 'rgba(42,51,32,0.6)'; g.lineWidth = 0.8; g.stroke();
      g.beginPath(); g.moveTo(-2, 0); g.lineTo(-9, 0); g.stroke();
      circle(g, 7.6, 0, 2); fillStroke(g, '#3c4a28', '#2a3320', 0.7);
      sheen(g, -3, -3, 3.5, 1.2, -0.3);
      g.strokeStyle = 'rgba(242,193,78,0.6)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-6, -5.4); g.lineTo(2.6, -5.9); g.stroke();
    },
    fireant(g, f){ antBody(g, f, '#d4511c', '#e0692c', '#7a2508'); circle(g, -5, 0, 1.4); g.fillStyle = 'rgba(255,214,102,0.8)'; g.fill(); },
    fruitfly(g, f){
      legs(g, [-0.5, 1, 2.4], 4.5, f, '#5a3a1e', 0.7);
      wings(g, f, 7, 6, 'rgba(225,240,255,0.6)');
      ell(g, -3.2, 0, 3.4, 2.6); fillStroke(g, '#b07a3a', '#5a3a1e', 0.7);
      g.fillStyle = '#6a4220'; g.fillRect(-5, -2.2, 1, 4.4); g.fillRect(-3, -2.5, 1, 5);
      ell(g, 0.6, 0, 2.6, 2.3); fillStroke(g, '#c99556', '#5a3a1e', 0.7);
      circle(g, 3, -1.4, 1.3); g.fillStyle = '#d6322f'; g.fill(); circle(g, 3, 1.4, 1.3); g.fill();
    },
    housefly(g, f){
      legs(g, [-1, 1, 3], 6, f, '#1c1f22', 0.9);
      wings(g, f, 10, 8, 'rgba(220,232,245,0.55)');
      ell(g, -4, 0, 4.6, 3.6); fillStroke(g, '#3b4146', '#16191b', 0.8);
      g.fillStyle = 'rgba(200,190,150,0.35)'; g.fillRect(-6.5, -3, 1.2, 6); g.fillRect(-4, -3.5, 1.2, 7);
      ell(g, 1.2, 0, 3.4, 3); fillStroke(g, '#4a5157', '#16191b', 0.8);
      g.strokeStyle = 'rgba(20,20,20,0.6)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-0.6, -1); g.lineTo(3, -1); g.moveTo(-0.6, 1); g.lineTo(3, 1); g.stroke();
      circle(g, 4.6, -1.9, 2); g.fillStyle = '#9c2d1f'; g.fill(); circle(g, 4.6, 1.9, 2); g.fill();
      sheen(g, -4.5, -1.5, 1.6, 0.8);
    },
    weevil(g, f){
      legs(g, [-1.5, 0.5, 2.5], 7.5, f, '#3c2c20', 1.1);
      g.fillStyle = '#5a4636'; rr(g, 4, -1, 7, 2, 1); g.fill();
      antennae(g, 8, 4, 3, '#3c2c20', 0.8);
      ell(g, -2.5, 0, 6.5, 5); fillStroke(g, '#6d5644', '#3c2c20', 1);
      g.strokeStyle = 'rgba(40,28,20,0.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-8.5, 0); g.lineTo(3, 0); g.stroke();
      for (let i = -6; i < 3; i += 2.5){ circle(g, i, -2.4, 0.6); g.fillStyle = 'rgba(40,28,20,0.5)'; g.fill(); circle(g, i, 2.4, 0.6); g.fill(); }
      ell(g, 4.2, 0, 2.6, 2.6); fillStroke(g, '#7a624e', '#3c2c20', 0.8);
      sheen(g, -4, -2.4, 3, 1.2);
    },
    pillbug(g, f){
      legs(g, [-4, -2, 0, 2], 6.2, f, '#3f454c', 0.8);
      antennae(g, 6, 3.5, 3, '#3f454c', 0.8);
      ell(g, -1, 0, 7.4, 5.4); fillStroke(g, '#727c88', '#3f454c', 1);
      g.strokeStyle = 'rgba(210,220,230,0.55)'; g.lineWidth = 0.9;
      for (let i = -6; i <= 4; i += 2){ g.beginPath(); g.ellipse(i, 0, 1.2, 5.1, 0, -Math.PI / 2, Math.PI / 2); g.stroke(); }
      sheen(g, -2, -2.8, 4, 1.2);
      ell(g, 5.6, 0, 1.6, 2.6); fillStroke(g, '#5d6670', '#3f454c', 0.8);
    },
    snowflea(g, f){
      g.strokeStyle = '#7fa9bd'; g.lineWidth = 1.1; g.lineCap = 'round';
      for (const s of [-1, 1]){ g.beginPath(); g.moveTo(-1, s); g.lineTo(-4 - f * 2, s * (5 - f)); g.lineTo(-1 - f * 2, s * 6.5); g.stroke(); }
      legs(g, [0.5, 2], 4, f, '#7fa9bd', 0.7);
      antennae(g, 4.5, 3.5, 2.5, '#7fa9bd', 0.7);
      ell(g, -1, 0, 4.6, 3); fillStroke(g, '#dff0f8', '#7fa9bd', 0.8);
      circle(g, 3.6, 0, 2.2); fillStroke(g, '#e8f6fc', '#7fa9bd', 0.8);
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.6;
      for (let i = 0; i < 3; i++){ const a = i * Math.PI / 3; g.beginPath(); g.moveTo(-1 - Math.cos(a) * 2, -Math.sin(a) * 2); g.lineTo(-1 + Math.cos(a) * 2, Math.sin(a) * 2); g.stroke(); }
    },
    spore(g, f){
      for (let i = 0; i < 12; i++){ const a = i / 12 * TAU + f * 0.13; circle(g, Math.cos(a) * 6.4, Math.sin(a) * 6.4, 2.1); g.fillStyle = '#a5cf82'; g.fill(); }
      circle(g, 0, 0, 6.6); fillStroke(g, '#7aa95c', '#4c7a37', 0.8);
      circle(g, -2.2, 2, 1.6); g.fillStyle = '#4f7d3a'; g.fill(); circle(g, 2.4, -2.6, 1.1); g.fill(); circle(g, -1, -3, 0.8); g.fill();
      circle(g, 2.6, -1, 1.1); g.fillStyle = '#ffffff'; g.fill(); circle(g, 2.6, 1.6, 1.1); g.fill();
      circle(g, 3, -1, 0.5); g.fillStyle = '#1b2a14'; g.fill(); circle(g, 3, 1.6, 0.5); g.fill();
    },
    roach(g, f, c1, c2, out){
      c1 = c1 || '#6b3a1f'; c2 = c2 || '#8a4f2a'; out = out || '#3a1d0d';
      legs(g, [-3, 0, 3], 9.5, f, out, 1.1);
      g.strokeStyle = out; g.lineWidth = 0.8; g.beginPath();
      g.moveTo(7, -1.5); g.bezierCurveTo(12, -6, 14, -4, 15, -9); g.moveTo(7, 1.5); g.bezierCurveTo(12, 6, 14, 4, 15, 9); g.stroke();
      ell(g, -1.5, 0, 9, 5.6); fillStroke(g, c1, out, 1);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-10, 0); g.lineTo(3, 0); g.stroke();
      ell(g, 5, 0, 3.6, 4.6); fillStroke(g, c2, out, 0.9);
      ell(g, 5.2, 0, 1.8, 2.8); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
      sheen(g, -3, -2.6, 4.5, 1.2);
    },
    antball(g, f){
      circle(g, 0, 0, 12); fillStroke(g, '#4a2c1c', '#24140c', 1.2);
      const n = 11;
      for (let i = 0; i < n; i++){
        const a = i / n * TAU + f * 0.28, r = 7 + (i % 3);
        g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r); g.rotate(a + Math.PI / 2);
        g.strokeStyle = '#1a0f09'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-3, -1.5); g.lineTo(3, 1.5); g.moveTo(-3, 1.5); g.lineTo(3, -1.5); g.stroke();
        ell(g, 0, 0, 2.4, 1.6); g.fillStyle = '#3a2418'; g.fill();
        circle(g, 2.2, 0, 1.2); g.fill();
        g.restore();
      }
      for (let i = 0; i < 6; i++){ const a = i / 6 * TAU - f * 0.3; circle(g, Math.cos(a) * 3.5, Math.sin(a) * 3.5, 1.6); g.fillStyle = '#5c3a26'; g.fill(); }
      sheen(g, -4, -5, 3.5, 1.6, -0.5);
    },
    mouse(g, f, big){
      const s = big ? 1.3 : 1;
      const body = big ? '#5f5a55' : '#9aa1a8', out = big ? '#2f2b28' : '#5b6167', ear = big ? '#a77e7a' : '#e2a6a6';
      g.strokeStyle = big ? '#b88180' : '#e0a0a0'; g.lineWidth = 1.4 * s; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-9 * s, 0); g.bezierCurveTo(-15 * s, (f ? 5 : -5) * s, -18 * s, (f ? -4 : 4) * s, -24 * s, (f ? 2 : -2) * s); g.stroke();
      g.fillStyle = ear;
      for (const sd of [-1, 1]){ circle(g, -4 * s + f * 0.6 * s * sd, sd * 6.2 * s, 1.6 * s); g.fill(); circle(g, 3.6 * s - f * 0.6 * s * sd, sd * 5.2 * s, 1.5 * s); g.fill(); }
      ell(g, -1.5 * s, 0, 9 * s, 6.4 * s); fillStroke(g, body, out, 1);
      ell(g, 6.5 * s, 0, 4.6 * s, 3.8 * s); fillStroke(g, body, out, 1);
      for (const sd of [-1, 1]){ circle(g, 4.4 * s, sd * 4.6 * s, 2.8 * s * (big ? 0.8 : 1)); fillStroke(g, ear, out, 0.8); }
      circle(g, 11 * s, 0, 1.3 * s); g.fillStyle = '#e57f8a'; g.fill();
      circle(g, 8 * s, -1.9 * s, 0.9 * s); g.fillStyle = big ? '#b8262c' : '#141414'; g.fill(); circle(g, 8 * s, 1.9 * s, 0.9 * s); g.fill();
      g.strokeStyle = 'rgba(40,40,40,0.55)'; g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(10 * s, -1); g.lineTo(14 * s, -3.5 * s); g.moveTo(10 * s, 1); g.lineTo(14 * s, 3.5 * s); g.moveTo(10 * s, 0); g.lineTo(14.5 * s, 0); g.stroke();
      sheen(g, -3 * s, -2.6 * s, 4 * s, 1.5 * s);
    },
    rat(g, f){ PEST.mouse(g, f, true); },
    wisp(g, f){
      const w = f ? 1 : -1;
      g.beginPath(); g.moveTo(7, 0); g.bezierCurveTo(6, -6.5, -2, -7, -5, -3.5); g.quadraticCurveTo(-9, -2 * w, -13, -3 + w); g.quadraticCurveTo(-8, 0, -13, 3 + w); g.quadraticCurveTo(-9, 2 * w, -5, 3.5); g.bezierCurveTo(-2, 7, 6, 6.5, 7, 0); g.closePath();
      fillStroke(g, 'rgba(232,224,255,0.92)', '#8f7fc4', 0.9);
      ell(g, 0, 0, 3.8, 3); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill();
      circle(g, 3.2, -1.8, 1.2); g.fillStyle = '#5a3f9e'; g.fill(); circle(g, 3.2, 1.8, 1.2); g.fill();
    },
  };

  function spriteFor(type, f){
    const key = type + f + ':' + SK;
    let c = cache.get(key);
    if (c) return c;
    const def = ENEMIES[type];
    const half = def.r * 2.2 + (type === 'mouse' || type === 'rat' ? def.r * 0.9 : 4);
    c = mkCanvas(half * 2 * SK, half * 2 * SK);
    const g = c.getContext('2d');
    g.scale(SK, SK); g.translate(half, half);
    PEST[type](g, f);
    c._half = half;
    outlineSprite(c, 1.35);
    cache.set(key, c);
    return c;
  }
  /* a bold dark outline round a sprite, so pests read as crisply as the toon-shaded appliances: the sprite's
     silhouette is stamped round itself in a ring and darkened, then the sprite goes back on top */
  function outlineSprite(c, w){
    const o = mkCanvas(c.width, c.height), g = o.getContext('2d'), px = w * SK;
    for (let i = 0; i < 8; i++){ const a = i / 8 * TAU; g.drawImage(c, Math.cos(a) * px, Math.sin(a) * px); }
    g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(28,22,20,0.9)'; g.fillRect(0, 0, o.width, o.height);
    g.globalCompositeOperation = 'source-over'; g.drawImage(c, 0, 0);
    const cg = c.getContext('2d'); cg.save(); cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalCompositeOperation = 'copy'; cg.drawImage(o, 0, 0); cg.restore();
  }
  /* a gold-plated copy of a pest sprite, for the Golden Roach */
  function goldSprite(type, f){
    const key = 'gold:' + type + f + ':' + SK;
    let c = cache.get(key);
    if (c) return c;
    const src = spriteFor(type, f);
    c = mkCanvas(src.width, src.height);
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, 0, c.width, c.height);
    gr.addColorStop(0, 'rgba(255,236,150,0.92)'); gr.addColorStop(0.5, 'rgba(242,193,78,0.88)'); gr.addColorStop(1, 'rgba(196,128,20,0.9)');
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    c._half = src._half;
    cache.set(key, c);
    return c;
  }

  /* big pests and bosses are drawn live */
  function hpBar(g, e, w, y){
    const p = clamp(e.hp / e.maxHp, 0, 1);
    g.fillStyle = 'rgba(20,24,28,0.75)'; rr(g, -w / 2 - 1, y - 1, w + 2, 6, 3); g.fill();
    const cb = typeof cbOn === 'function' && cbOn();
    g.fillStyle = p > 0.5 ? (cb ? '#5aa9ff' : '#7ee07a') : p > 0.25 ? '#ffd166' : (cb ? '#ff9a1f' : '#ff5a4e'); rr(g, -w / 2, y, Math.max(2, w * p), 4, 2); g.fill();
  }
  const BIG = {
    cheese(g, e, t){
      for (const sd of [-1, 1]){ g.save(); g.translate(-24, sd * 13); g.scale(0.55, 0.55); PEST.mouse(g, Math.floor(t * 8) % 2); g.restore(); }
      g.save(); g.rotate(t * 1.6);
      circle(g, 0, 0, 24); fillStroke(g, '#d79b2b', '#9c6a14', 2);
      circle(g, 0, 0, 20); g.fillStyle = '#f2c14e'; g.fill();
      for (const [hx, hy, hr] of [[-7, -6, 3.4], [6, -9, 2.4], [8, 5, 3.6], [-4, 9, 2.2], [-12, 3, 1.8], [1, 0, 1.6]]){ circle(g, hx, hy, hr); g.fillStyle = '#d9a33a'; g.fill(); }
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 21, -0.35, 0.35); g.closePath(); g.fillStyle = '#e8b445'; g.fill(); g.strokeStyle = '#b9832a'; g.lineWidth = 1; g.stroke();
      g.restore();
      sheen(g, -8, -10, 7, 3, -0.5);
    },
    basket(g, e, t){
      const f = Math.floor(t * 8) % 2;
      for (let i = 0; i < 8; i++){ const x = -22 + (i % 4) * 14, y = i < 4 ? -21 : 21; g.save(); g.translate(x, y); g.scale(0.7, 0.7); PEST.ant(g, (f + i) % 2); g.restore(); }
      rr(g, -27, -19, 54, 38, 7); fillStroke(g, '#c99456', '#7d5428', 2);
      g.save(); rr(g, -27, -19, 54, 38, 7); g.clip();
      for (let y = -19; y < 19; y += 5) for (let x = -27; x < 27; x += 8){ g.fillStyle = ((x + y) / 5 | 0) % 2 ? 'rgba(125,84,40,0.35)' : 'rgba(255,230,180,0.25)'; g.fillRect(x + (y / 5 % 2 ? 4 : 0), y, 6, 3); }
      g.restore();
      g.save(); rr(g, -24, -16, 30, 32, 4); g.clip();
      for (let y = -16; y < 16; y += 6) for (let x = -24; x < 6; x += 6){ g.fillStyle = ((x / 6 + y / 6) & 1) ? '#e2383f' : '#fff6ea'; g.fillRect(x, y, 6, 6); }
      g.restore();
      g.strokeStyle = '#8b5a2b'; g.lineWidth = 3; g.beginPath(); g.moveTo(-6, -19); g.bezierCurveTo(-6, -30, 14, -30, 14, -19); g.stroke();
    },
    midnight(g, e, t){
      g.save(); g.scale(1.9, 1.9);
      PEST.roach(g, Math.floor(t * 10) % 2, '#2a1f38', '#3d2b52', '#120b1a');
      g.restore();
      circle(g, 11, -3, 1.6); g.fillStyle = '#d8b4ff'; g.fill(); circle(g, 11, 3, 1.6); g.fill();
      g.strokeStyle = 'rgba(190,140,255,0.55)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(-3, 0, 14, 8, 0, -2.4, -0.6); g.stroke();
    },
    truck(g, e, t){
      g.fillStyle = 'rgba(0,0,0,0.25)'; rr(g, -38, -22, 78, 48, 8); g.fill();
      g.fillStyle = '#26292c'; for (const [x, y] of [[-26, -24], [16, -24], [-26, 20], [16, 20]]) rr(g, x, y, 14, 5, 2), g.fill();
      rr(g, -38, -22, 58, 44, 6); fillStroke(g, '#f4efe6', '#9a948a', 2);
      g.fillStyle = '#e2383f'; g.fillRect(-38, -4, 58, 8);
      for (let i = 0; i < 6; i++){ g.fillStyle = i % 2 ? '#ffffff' : '#e2383f'; g.fillRect(-34 + i * 8, -22, 8, 7); }
      rr(g, -30, 8, 36, 11, 2); fillStroke(g, '#7fa9bd', '#4b6a78', 1);
      rr(g, 18, -20, 22, 40, 8); fillStroke(g, '#e2383f', '#8e1d22', 2);
      rr(g, 26, -16, 10, 32, 4); g.fillStyle = '#2b3a44'; g.fill();
      circle(g, 30, 0, 4); g.fillStyle = '#5f5a55'; g.fill(); circle(g, 29, -3.5, 1.6); g.fill(); circle(g, 29, 3.5, 1.6); g.fill();
      g.fillStyle = '#1d2b33'; g.font = '700 9px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.save(); g.rotate(0); g.fillText('TACO RAT', -9, -12); g.restore();
    },
    raccoon(g, e, t){
      const sw = Math.sin(t * 6) * 0.25;
      g.save(); g.translate(-30, 0); g.rotate(sw);
      for (let i = 0; i < 6; i++){ ell(g, -i * 6, 0, 5, 6 - i * 0.4); g.fillStyle = i % 2 ? '#3c3f42' : '#a9aeb2'; g.fill(); }
      g.restore();
      circle(g, 4, 30, 13); fillStroke(g, '#a07a4a', '#5f4425', 2);
      g.fillStyle = '#ffd166'; g.font = '700 12px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 4, 31);
      ell(g, -4, 0, 30, 24); fillStroke(g, '#858b90', '#45494d', 2);
      ell(g, -8, 0, 20, 14); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill();
      circle(g, 26, 0, 15); fillStroke(g, '#93999e', '#45494d', 2);
      for (const sd of [-1, 1]){ circle(g, 20, sd * 13, 5); fillStroke(g, '#5f6468', '#2c2f31', 1.2); circle(g, 20, sd * 13, 2.4); g.fillStyle = '#d9a3a3'; g.fill(); }
      ell(g, 30, 0, 6, 12); g.fillStyle = '#1d1f21'; g.fill();
      ell(g, 36, 0, 5, 7); g.fillStyle = '#e9e9e9'; g.fill();
      circle(g, 41, 0, 2.6); g.fillStyle = '#1d1f21'; g.fill();
      circle(g, 30, -5, 2); g.fillStyle = '#fff'; g.fill(); circle(g, 30, 5, 2); g.fill();
      circle(g, 30.6, -5, 1); g.fillStyle = '#111'; g.fill(); circle(g, 30.6, 5, 1); g.fill();
      if (e.dashT > 0){ g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; for (let i = 0; i < 4; i++){ g.beginPath(); g.moveTo(-40 - i * 4, -18 + i * 12); g.lineTo(-60 - i * 4, -18 + i * 12); g.stroke(); } }
    },
    ratking(g, e, t){
      const f = Math.floor(t * 6) % 2;
      g.strokeStyle = '#c98b8b'; g.lineWidth = 2.2;
      for (let i = 0; i < 5; i++){ const a = (i - 2) * 0.35; g.beginPath(); g.moveTo(-20, 0); g.bezierCurveTo(-34, Math.sin(t * 3 + i) * 10 + a * 30, -44, a * 40, -58, a * 50 + Math.sin(t * 2 + i) * 6); g.stroke(); }
      circle(g, -30, 0, 7); fillStroke(g, '#c98b8b', '#8e5555', 1.5);
      ell(g, -4, 0, 30, 24); fillStroke(g, '#6d2b8f', '#3d1452', 2);
      for (const [x, y, a] of [[-14, -18, -0.9], [-14, 18, 0.9]]){ g.save(); g.translate(x, y); g.rotate(a); g.scale(0.85, 0.85); PEST.mouse(g, f, true); g.restore(); }
      g.save(); g.translate(2, 0); g.scale(1.9, 1.9); PEST.mouse(g, f, true); g.restore();
      g.save(); g.translate(14, 0);
      g.fillStyle = '#ffd166'; g.strokeStyle = '#b8861b'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-8, -9); g.lineTo(-8, 9); g.lineTo(4, 9); g.lineTo(8, 5); g.lineTo(2, 3); g.lineTo(8, 0); g.lineTo(2, -3); g.lineTo(8, -5); g.lineTo(4, -9); g.closePath(); g.fill(); g.stroke();
      circle(g, -2, 0, 2.2); g.fillStyle = '#e2383f'; g.fill();
      g.restore();
    },
    greatmold(g, e, t){
      const pulse = 1 + Math.sin(t * 2.4) * 0.04;
      g.save(); g.scale(pulse, pulse);
      g.beginPath();
      for (let i = 0; i <= 40; i++){ const a = i / 40 * TAU; const r = 44 + Math.sin(a * 5 + t * 1.5) * 3 + Math.sin(a * 9 - t) * 2; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); fillStroke(g, '#6f9e4f', '#3e6a2c', 2.5);
      for (let i = 0; i < 26; i++){ const a = i / 26 * TAU + t * 0.2; circle(g, Math.cos(a) * 44, Math.sin(a) * 44, 4.5); g.fillStyle = 'rgba(184,220,150,0.7)'; g.fill(); }
      for (const [x, y, r] of [[-18, 14, 7], [12, -20, 5], [-24, -10, 4], [20, 18, 6], [-4, 26, 3.5], [26, -4, 3]]){ circle(g, x, y, r); g.fillStyle = '#4a7337'; g.fill(); }
      for (const sd of [-1, 1]){
        ell(g, 18, sd * 11, 8, 7); fillStroke(g, '#f4f7ef', '#3e6a2c', 1.5);
        circle(g, 21, sd * 11, 3.4); g.fillStyle = '#1b2a14'; g.fill();
        g.strokeStyle = '#2c4d1f'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, sd * 3); g.lineTo(24, sd * 18); g.stroke();
      }
      g.restore();
    },
    flylord(g, e, t){
      const fr = e.halfDone;
      g.fillStyle = 'rgba(0,0,0,0.16)'; ell(g, -6, 14, 32, 18); g.fill();
      const flap = Math.sin(t * 70);
      g.strokeStyle = '#121614'; g.lineWidth = 2; g.lineCap = 'round';
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i++){ const x = -2 + i * 9; g.beginPath(); g.moveTo(x, sd * 8); g.lineTo(x + (i - 1) * 5, sd * 22); g.lineTo(x + (i - 1) * 8 + 4, sd * 28); g.stroke(); }
      for (const sd of [-1, 1]){ g.save(); g.rotate(sd * (0.55 + flap * 0.28)); ell(g, -20, sd * 20, 30, 12); g.fillStyle = 'rgba(220,232,245,0.5)'; g.fill(); g.strokeStyle = 'rgba(80,95,110,0.55)'; g.lineWidth = 1.2; g.stroke(); g.beginPath(); g.moveTo(-2, sd * 4); g.lineTo(-40, sd * 22); g.stroke(); g.restore(); }
      ell(g, -16, 0, 21, 15); fillStroke(g, '#2f3a33', '#121614', 2);
      g.fillStyle = 'rgba(200,190,150,0.35)'; for (let i = -30; i < -2; i += 7) g.fillRect(i, -13, 3, 26);
      ell(g, 5, 0, 13, 13); fillStroke(g, '#3b4740', '#121614', 2);
      g.strokeStyle = 'rgba(15,20,18,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-3, -6); g.lineTo(12, -6); g.moveTo(-3, 6); g.lineTo(12, 6); g.stroke();
      ell(g, 20, 0, 9, 12); fillStroke(g, '#28302c', '#121614', 1.5);
      for (const sd of [-1, 1]){ circle(g, 23, sd * 8.5, 7.5); fillStroke(g, fr ? '#ff3b30' : '#a8281e', '#4a0f0a', 1.2); circle(g, 24.5, sd * 7, 2); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill(); }
      g.fillStyle = '#ffd166'; g.strokeStyle = '#a57412'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(10, -6); g.lineTo(10, 6); g.lineTo(17, 6); g.lineTo(14, 3); g.lineTo(18, 0); g.lineTo(14, -3); g.lineTo(17, -6); g.closePath(); g.fill(); g.stroke();
      if (fr){ g.strokeStyle = 'rgba(255,90,78,' + (0.4 + Math.sin(t * 18) * 0.25) + ')'; g.lineWidth = 3; circle(g, 0, 0, 44); g.stroke(); }
    },
    skunk(g, e, t){
      const sp = e.sprayT > 0;
      g.save(); g.translate(-28, 0); g.rotate(Math.sin(t * 2.2) * 0.18);
      ell(g, -16, 0, sp ? 26 : 21, sp ? 20 : 15); fillStroke(g, '#1d1f22', '#000', 2);
      ell(g, -16, 0, sp ? 20 : 16, sp ? 5.5 : 4.5); g.fillStyle = '#f4f4f0'; g.fill();
      if (sp){ for (let i = 0; i < 5; i++){ const a = Math.PI + (i - 2) * 0.35; circle(g, -40 + Math.cos(a) * 10, Math.sin(a) * 14, 8 + i % 2 * 3); g.fillStyle = 'rgba(160,210,90,0.45)'; g.fill(); } }
      g.restore();
      for (const [x, y] of [[-14, -20], [-14, 20], [14, -18], [14, 18]]){ ell(g, x, y, 5, 4); g.fillStyle = '#121315'; g.fill(); }
      ell(g, -2, 0, 30, 21); fillStroke(g, '#25282c', '#0b0c0d', 2);
      g.fillStyle = '#f4f4f0';
      for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(26, sd * 2); g.quadraticCurveTo(4, sd * 12, -30, sd * 8); g.quadraticCurveTo(4, sd * 6, 26, sd * 0.5); g.closePath(); g.fill(); }
      ell(g, 30, 0, 12, 10); fillStroke(g, '#2a2d31', '#0b0c0d', 1.5);
      ell(g, 31, 0, 8, 2.2); g.fillStyle = '#f4f4f0'; g.fill();
      for (const sd of [-1, 1]){ circle(g, 24, sd * 9, 4); fillStroke(g, '#2a2d31', '#0b0c0d', 1); circle(g, 35, sd * 4.5, 1.6); g.fillStyle = '#0b0c0d'; g.fill(); circle(g, 35.4, sd * 4.5 - 0.6, 0.5); g.fillStyle = '#fff'; g.fill(); }
      circle(g, 42, 0, 2.6); g.fillStyle = '#e57f8a'; g.fill();
    },
    mole(g, e, t){
      const dig = Math.sin(t * 9);
      for (const sd of [-1, 1]){ g.save(); g.translate(14, sd * 21); g.rotate(sd * (0.45 + dig * 0.12)); ell(g, 0, 0, 9, 7); fillStroke(g, '#e7a5a0', '#9c5a55', 1.2); for (let i = 0; i < 5; i++){ g.strokeStyle = '#f5ece4'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(6, -5 + i * 2.5); g.lineTo(13, -6 + i * 3); g.stroke(); } g.restore(); }
      ell(g, -6, 0, 30, 24); fillStroke(g, '#4a3f3a', '#231d1a', 2);
      g.strokeStyle = 'rgba(120,100,90,0.45)'; g.lineWidth = 1; for (let i = 0; i < 9; i++){ const a = i * 0.7 + 1, r = 12 + (i % 3) * 4; g.beginPath(); g.moveTo(-6 + Math.cos(a) * r, Math.sin(a) * r * 0.8); g.lineTo(-10 + Math.cos(a) * r, Math.sin(a) * r * 0.8 + 2); g.stroke(); }
      ell(g, -12, -8, 10, 4, -0.3); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill();
      ell(g, 23, 0, 12, 10); fillStroke(g, '#544640', '#231d1a', 1.5);
      for (let i = 0; i < 11; i++){ const a = i / 11 * TAU; g.save(); g.translate(36, 0); g.rotate(a); ell(g, 4.5, 0, 3.6, 1.4); g.fillStyle = '#f08fa0'; g.fill(); g.restore(); }
      circle(g, 36, 0, 2.6); g.fillStyle = '#e06d84'; g.fill();
      circle(g, 27, -5, 1); g.fillStyle = '#111'; g.fill(); circle(g, 27, 5, 1); g.fill();
    },
    bigcheese(g, e, t){
      for (const sd of [-1, 0, 1]){ g.save(); g.translate(-66, sd * 24); g.scale(0.75, 0.75); PEST.mouse(g, (Math.floor(t * 8) + sd + 3) % 2); g.restore(); }
      const lost = e.chunks || 0;
      g.save(); g.rotate(t * 0.45);
      for (let i = lost; i < 10; i++){
        const a0 = i / 10 * TAU, a1 = a0 + TAU / 10;
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 58, a0, a1); g.closePath(); g.fillStyle = '#c9363a'; g.fill(); g.strokeStyle = '#7a1d22'; g.lineWidth = 2; g.stroke();
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 49, a0 + 0.02, a1 - 0.02); g.closePath(); g.fillStyle = '#f2c14e'; g.fill();
        const m = (a0 + a1) / 2;
        for (const [rr2, hr] of [[18, 3.4], [33, 4.2], [42, 2.4]]){ circle(g, Math.cos(m + (i % 2 ? 0.08 : -0.08)) * rr2, Math.sin(m + (i % 2 ? 0.08 : -0.08)) * rr2, hr); g.fillStyle = '#d9a33a'; g.fill(); }
      }
      if (lost > 0){ g.strokeStyle = '#ffe7a0'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(58, 0); const a = lost / 10 * TAU; g.moveTo(0, 0); g.lineTo(Math.cos(a) * 58, Math.sin(a) * 58); g.stroke(); }
      g.restore();
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -30); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -30); g.lineTo(20, -25); g.lineTo(0, -19); g.closePath(); g.fill(); g.strokeStyle = '#c9363a'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#c9363a'; g.font = '700 7px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BIG', 8, -24.5);
      sheen(g, -18, -22, 14, 5, -0.5);
    },
    queen(g, e, t){
      const f = Math.floor(t * 6) % 2;
      g.save(); g.scale(4.2, 4.2);
      PEST.roach(g, f, '#5a2020', '#7a2a2a', '#2a0b0b');
      g.restore();
      g.strokeStyle = 'rgba(255,209,102,0.7)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(-6, 0, 34, 20, 0, 0, TAU); g.stroke();
      for (let i = -30; i < 20; i += 8){ g.beginPath(); g.moveTo(i, -18); g.quadraticCurveTo(i + 4, 0, i, 18); g.strokeStyle = 'rgba(255,209,102,0.25)'; g.lineWidth = 1; g.stroke(); }
      g.save(); g.translate(24, 0);
      g.fillStyle = '#ffd166'; g.strokeStyle = '#b8861b'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-6, -12); g.lineTo(-6, 12); g.lineTo(6, 12); g.lineTo(11, 7); g.lineTo(4, 4); g.lineTo(11, 0); g.lineTo(4, -4); g.lineTo(11, -7); g.lineTo(6, -12); g.closePath(); g.fill(); g.stroke();
      g.restore();
      circle(g, 30, -6, 2.6); g.fillStyle = '#ff3b3b'; g.fill(); circle(g, 30, 6, 2.6); g.fill();
      if (e.shieldT > 0){ g.strokeStyle = 'rgba(255,209,102,' + (0.5 + Math.sin(t * 20) * 0.3) + ')'; g.lineWidth = 5; circle(g, 0, 0, 58); g.stroke(); }
    },
    compost(g, e, t){
      const dump = e.shieldT > 0, bob = Math.sin(t * 2) * 1.5;
      for (let i = 0; i < 5; i++){ const a = t * 2.2 + i * 1.3, rr0 = 50 + Math.sin(t * 3 + i) * 6; g.save(); g.translate(Math.cos(a) * rr0, Math.sin(a) * rr0); g.scale(0.7, 0.7); PEST.housefly(g, Math.floor(t * 20 + i) % 2); g.restore(); }
      g.save(); g.scale(dump ? 1.08 : 1, dump ? 1.08 : 1);
      g.beginPath();
      for (let i = 0; i <= 36; i++){ const a = i / 36 * TAU, r = 50 + Math.sin(a * 6 + 1) * 4 + Math.sin(a * 11) * 2.5; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.92) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.92); }
      g.closePath(); fillStroke(g, '#6b4a2a', '#3b2614', 2.5);
      ell(g, -6, -4, 38, 32); g.fillStyle = '#7d5a33'; g.fill();
      ell(g, -10, -8, 24, 18); g.fillStyle = '#8f6b3e'; g.fill();
      /* scraps */
      g.save(); g.translate(-22, 22); g.rotate(0.6);
      g.fillStyle = '#f2d14b'; g.strokeStyle = '#a88a1c'; g.lineWidth = 1.2;
      for (const sd of [-1, 0, 1]){ g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sd * 9 - 4, 8, sd * 12 - 8, 16); g.quadraticCurveTo(sd * 6, 9, 2, 0); g.closePath(); g.fill(); g.stroke(); }
      g.restore();
      g.save(); g.translate(18, 24); ell(g, 0, 0, 7, 9); fillStroke(g, '#f4ecd0', '#b9a978', 1.2); ell(g, 0, 0, 3, 7); g.fillStyle = '#d9c99a'; g.fill(); g.restore();
      g.save(); g.translate(-28, -18); g.rotate(-0.4); g.beginPath(); g.arc(0, 0, 8, Math.PI * 0.1, Math.PI * 1.1); g.lineTo(-6, 2); g.lineTo(-2, -2); g.lineTo(2, 2); g.lineTo(6, -1); g.closePath(); fillStroke(g, '#fbf7ee', '#c8bfa8', 1); g.restore();
      g.save(); g.translate(8, -28); g.rotate(0.3); g.strokeStyle = '#e8e2d4'; g.lineWidth = 2; g.beginPath(); g.moveTo(-12, 0); g.lineTo(12, 0); for (let i = -8; i <= 8; i += 4){ g.moveTo(i, 0); g.lineTo(i - 2, -5); g.moveTo(i, 0); g.lineTo(i - 2, 5); } g.stroke(); g.restore();
      for (const [x, y, r] of [[-30, 2, 6], [28, -6, 5], [-4, 30, 4], [30, 14, 3.5]]){ circle(g, x, y, r); g.fillStyle = 'rgba(122,169,92,0.9)'; g.fill(); }
      g.restore();
      for (const sd of [-1, 1]){ ell(g, 26, sd * 11 + bob * 0.3, 8, 9); fillStroke(g, '#f6f1e2', '#3b2614', 1.5); circle(g, 29, sd * 11 + bob * 0.3, 3.8); g.fillStyle = '#2b1a0c'; g.fill(); circle(g, 30.5, sd * 10, 1.2); g.fillStyle = '#fff'; g.fill(); }
      g.strokeStyle = '#3b2614'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(38, -10); g.quadraticCurveTo(44, 0, 38, 10); g.stroke();
    },
    moth(g, e, t){
      const flap = Math.sin(t * 7), soul = e.soul;
      if (soul){ const gr = g.createRadialGradient(0, 0, 10, 0, 0, 70); gr.addColorStop(0, 'rgba(190,160,255,0.45)'); gr.addColorStop(1, 'rgba(190,160,255,0)'); g.fillStyle = gr; circle(g, 0, 0, 70); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,0.14)'; ell(g, -4, 16, 40, 22); g.fill();
      for (const sd of [-1, 1]){
        g.save(); g.scale(1, sd); g.rotate(-flap * 0.12);
        /* fore wing */
        g.beginPath(); g.moveTo(6, 4); g.bezierCurveTo(18, 30, 4, 54, -14, 50); g.bezierCurveTo(-24, 40, -16, 20, -4, 6); g.closePath();
        fillStroke(g, soul ? '#cbbdf2' : '#b8ad9c', '#4b4238', 2);
        /* hind wing */
        g.beginPath(); g.moveTo(-6, 6); g.bezierCurveTo(-10, 30, -34, 40, -40, 26); g.bezierCurveTo(-42, 16, -24, 8, -10, 4); g.closePath();
        fillStroke(g, soul ? '#b3a3e6' : '#9f937f', '#4b4238', 2);
        /* a skull-like eyespot */
        circle(g, -2, 30, 8.5); g.fillStyle = soul ? '#efe8ff' : '#e9e1d0'; g.fill(); g.strokeStyle = '#4b4238'; g.lineWidth = 1.2; g.stroke();
        circle(g, -4.5, 28.5, 2.4); g.fillStyle = '#2a2420'; g.fill(); circle(g, 0.8, 28.5, 2.4); g.fill();
        g.fillRect(-3.4, 33, 1.2, 3); g.fillRect(-0.6, 33, 1.2, 3);
        g.strokeStyle = 'rgba(75,66,56,0.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(2, 8); g.quadraticCurveTo(-6, 26, -12, 46); g.moveTo(-8, 8); g.quadraticCurveTo(-24, 20, -36, 26); g.stroke();
        g.restore();
      }
      ell(g, -10, 0, 22, 9); fillStroke(g, '#6e6356', '#2f2922', 2);
      g.strokeStyle = 'rgba(47,41,34,0.45)'; g.lineWidth = 1; for (let x = -26; x < 6; x += 6){ g.beginPath(); g.moveTo(x, -8); g.lineTo(x, 8); g.stroke(); }
      ell(g, 12, 0, 9, 9); fillStroke(g, '#d9d0bf', '#4b4238', 1.6);
      for (const sd of [-1, 1]){
        circle(g, 18, sd * 5, 3.2); g.fillStyle = soul ? '#a98bff' : '#1f1a16'; g.fill();
        g.strokeStyle = '#4b4238'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(20, sd * 4); g.quadraticCurveTo(34, sd * 10, 40, sd * 20); g.stroke();
        for (let i = 0; i < 5; i++){ const k = i / 5; const x = 22 + k * 16, y = sd * (5 + k * 14); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y - sd * 3); g.stroke(); }
      }
    },
    dustdevil(g, e, t){
      g.save(); g.rotate(-e.rot);
      g.fillStyle = 'rgba(0,0,0,0.12)'; ell(g, 3, 6, 44, 30); g.fill();
      for (let ring = 0; ring < 5; ring++){
        const r = 46 - ring * 8, sp = (5 - ring) * 1.4;
        g.strokeStyle = ring % 2 ? 'rgba(201,172,122,0.9)' : 'rgba(226,206,164,0.95)'; g.lineWidth = 6 - ring * 0.6; g.lineCap = 'round';
        for (let k = 0; k < 3; k++){ const a0 = t * sp + k * TAU / 3 + ring; g.beginPath(); g.arc(0, 0, r, a0, a0 + 1.5); g.stroke(); }
      }
      for (let i = 0; i < 18; i++){ const a = t * (3 + (i % 3)) + i * 1.7, r = 14 + (i * 7) % 36; circle(g, Math.cos(a) * r, Math.sin(a) * r, 1.5 + (i % 3)); g.fillStyle = i % 2 ? '#9a6e3a' : '#e8c98f'; g.fill(); }
      circle(g, 0, 0, 13); fillStroke(g, '#d8bd85', '#8a6a3a', 1.5);
      g.restore();
      for (const sd of [-1, 1]){
        g.beginPath(); g.moveTo(2, sd * 3); g.lineTo(10, sd * 9); g.lineTo(4, sd * 10); g.closePath(); g.fillStyle = '#fff6df'; g.fill();
        circle(g, 6.5, sd * 7.8, 1.6); g.fillStyle = '#3a2410'; g.fill();
        g.strokeStyle = '#3a2410'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(1, sd * 2.5); g.lineTo(11, sd * 6); g.stroke();
      }
      if (e.dashT > 0){ g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; for (let i = 0; i < 4; i++){ g.beginPath(); g.moveTo(-50 - i * 4, -20 + i * 13); g.lineTo(-72 - i * 4, -20 + i * 13); g.stroke(); } }
    },
    beetle(g, e, t){
      const plated = e.plate > 0, f = Math.floor(t * 6) % 2;
      const tint = { sharp:'#c9d2d6', blast:'#ff8a3d', heat:'#e2383f', cold:'#7fd3ff', energy:'#ffd166' }[(e.immune || ['sharp'])[0]];
      g.strokeStyle = '#1d2124'; g.lineWidth = 3.5; g.lineCap = 'round';
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i++){ const x = 14 - i * 18, sw = (f ? 1 : -1) * (i % 2 ? 4 : -4); g.beginPath(); g.moveTo(x, sd * 18); g.lineTo(x + 6 + sw, sd * 40); g.lineTo(x + 2 + sw, sd * 50); g.stroke(); }
      ell(g, -8, 0, 40, 32); fillStroke(g, '#3a4146', '#14181b', 2.5);
      if (plated){
        for (const sd of [-1, 1]){
          g.beginPath(); g.moveTo(10, sd * 1.5); g.bezierCurveTo(8, sd * 34, -40, sd * 36, -46, sd * 6); g.lineTo(-46, sd * 1.5); g.closePath();
          fillStroke(g, '#8c979d', '#2d3438', 2);
          g.strokeStyle = 'rgba(45,52,56,0.6)'; g.lineWidth = 1.3; for (const x of [-30, -14, 0]){ g.beginPath(); g.moveTo(x, sd * 4); g.quadraticCurveTo(x - 3, sd * 20, x - 8, sd * 30); g.stroke(); }
          for (const [x, y] of [[-36, 10], [-22, 20], [-6, 22], [4, 12]]){ circle(g, x, sd * y, 1.8); g.fillStyle = '#e3e8ea'; g.fill(); }
        }
        g.strokeStyle = tint; g.lineWidth = 2.5; g.globalAlpha = 0.7 + Math.sin(t * 6) * 0.2; g.beginPath(); g.ellipse(-8, 0, 43, 35, 0, 0, TAU); g.stroke(); g.globalAlpha = 1;
        sheen(g, -20, -16, 14, 4, -0.2);
      } else {
        g.strokeStyle = 'rgba(20,24,27,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-46, 0); g.lineTo(8, 0); g.stroke();
        for (const [x, y] of [[-30, 12], [-14, -16], [-2, 10], [-36, -10]]){ g.strokeStyle = 'rgba(200,210,214,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5, y + 4); g.lineTo(x + 2, y + 8); g.stroke(); }
      }
      ell(g, 20, 0, 15, 17); fillStroke(g, '#4a5359', '#14181b', 2);
      g.beginPath(); g.moveTo(28, -6); g.quadraticCurveTo(50, -6, 56, -18); g.quadraticCurveTo(52, -2, 34, 4); g.closePath(); fillStroke(g, '#5d666b', '#14181b', 1.8);
      for (const sd of [-1, 1]){ circle(g, 28, sd * 11, 3); g.fillStyle = tint; g.fill(); }
    },
    pepper(g, e, t){
      const L = e.lvl || 1, R = Math.min(240, 150 + 6 * (L - 1)), fl = e.shieldT > 0;
      g.save(); g.setLineDash([6, 8]); g.lineDashOffset = -t * 20; g.strokeStyle = 'rgba(255,120,50,0.35)'; g.lineWidth = 2; circle(g, 0, 0, R); g.stroke(); g.restore();
      const gr = g.createRadialGradient(0, 0, 20, 0, 0, fl ? 90 : 64); gr.addColorStop(0, 'rgba(255,140,60,0.4)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; circle(g, 0, 0, fl ? 90 : 64); g.fill();
      const f = Math.floor(t * 7) % 2;
      g.strokeStyle = '#5b1610'; g.lineWidth = 3; g.lineCap = 'round';
      for (const sd of [-1, 1]) for (const x of [-14, 6]){ const sw = (f ? 1 : -1) * (x < 0 ? 4 : -4); g.beginPath(); g.moveTo(x, sd * 16); g.lineTo(x + sw, sd * 30); g.stroke(); }
      g.beginPath(); g.moveTo(-42, 0); g.bezierCurveTo(-40, -26, 4, -26, 30, -12); g.quadraticCurveTo(46, 0, 30, 12); g.bezierCurveTo(4, 26, -40, 26, -42, 0); g.closePath();
      fillStroke(g, fl ? '#ff4a2a' : '#d9261c', '#5b1610', 2.5);
      g.strokeStyle = 'rgba(91,22,16,0.45)'; g.lineWidth = 1.5; for (const y of [-10, 0, 10]){ g.beginPath(); g.moveTo(-34, y * 0.8); g.bezierCurveTo(-14, y * 1.4, 10, y * 1.2, 30, y * 0.5); g.stroke(); }
      sheen(g, -10, -12, 18, 4, -0.1);
      g.beginPath(); g.moveTo(-40, -8); g.quadraticCurveTo(-56, -10, -60, 2); g.quadraticCurveTo(-54, 0, -48, 8); g.quadraticCurveTo(-46, 2, -40, 8); g.closePath(); fillStroke(g, '#4f8a3a', '#24451a', 1.8);
      g.strokeStyle = '#4f8a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(-56, 0); g.quadraticCurveTo(-66, -6, -64, -16); g.stroke();
      for (const sd of [-1, 1]){
        g.beginPath(); g.moveTo(16, sd * 4); g.lineTo(28, sd * 9); g.lineTo(18, sd * 12); g.closePath(); g.fillStyle = '#fff3c4'; g.fill();
        circle(g, 21, sd * 8.5, 2); g.fillStyle = '#2a0805'; g.fill();
        g.strokeStyle = '#2a0805'; g.lineWidth = 2; g.beginPath(); g.moveTo(14, sd * 3); g.lineTo(30, sd * 7); g.stroke();
      }
      for (let i = 0; i < 4; i++){ const k = (t * 0.9 + i * 0.25) % 1; g.strokeStyle = 'rgba(255,200,140,' + (0.5 * (1 - k)).toFixed(3) + ')'; g.lineWidth = 2; g.beginPath(); for (let s = 0; s <= 6; s++){ const x = -30 + i * 18 + Math.sin(s + t * 5 + i) * 3, y = -20 - k * 30 - s * 3; s ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    },
    phantom(g, e, t){
      const fade = e.fadeT > 0;
      g.save(); g.globalAlpha *= fade ? 0.28 + Math.sin(t * 14) * 0.08 : 0.92;
      const gr = g.createRadialGradient(0, 0, 10, 0, 0, 62); gr.addColorStop(0, 'rgba(170,230,220,0.35)'); gr.addColorStop(1, 'rgba(170,230,220,0)'); g.fillStyle = gr; circle(g, 0, 0, 62); g.fill();
      g.beginPath(); g.moveTo(34, 0); g.bezierCurveTo(32, -30, -6, -36, -20, -30);
      for (let i = 0; i <= 6; i++){ const y = -30 + i * 10, x = -36 - (i % 2 ? 10 : 0) - Math.sin(t * 6 + i) * 4; g.lineTo(x, y); }
      g.lineTo(-20, 30); g.bezierCurveTo(-6, 36, 32, 30, 34, 0); g.closePath();
      fillStroke(g, '#eef7f5', '#5f8f88', 2);
      g.strokeStyle = 'rgba(95,143,136,0.35)'; g.lineWidth = 1.4; for (const y of [-16, 0, 16]){ g.beginPath(); g.moveTo(24, y * 0.5); g.quadraticCurveTo(0, y * 1.2, -30, y * 1.3); g.stroke(); }
      g.strokeStyle = '#5f8f88'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(32, -5); g.bezierCurveTo(44, -14, 48, -10, 54, -22); g.moveTo(32, 5); g.bezierCurveTo(44, 14, 48, 10, 54, 22); g.stroke();
      for (const sd of [-1, 1]){ ell(g, 20, sd * 9, 6, 4.5, sd * 0.3); g.fillStyle = '#123b36'; g.fill(); circle(g, 21.5, sd * 9, 1.8); g.fillStyle = '#7fffe3'; g.fill(); }
      ell(g, 8, 0, 4, 6); g.fillStyle = '#123b36'; g.fill();
      g.restore();
    },
  };

  /* the shadow of a pest up in a pair of chopsticks, on the floor under it, smaller the higher it is */
  function drawAirShadow(g, e){
    const k = 1 - Math.min(0.6, (e.z || 0) / 110);
    g.fillStyle = 'rgba(0,0,0,' + (0.2 * k).toFixed(3) + ')'; ell(g, e.x + 2, e.y + 3, e.r * 1.05 * k, e.r * 0.8 * k); g.fill();
  }
  function drawMound(g, e, t){
    g.save(); g.translate(e.x, e.y);
    g.rotate(e.rot);
    for (let i = 0; i < 4; i++){ const k = (t * 3 + i * 0.25) % 1; circle(g, -e.r * 0.6 - k * 40, Math.sin(i * 2.3 + t * 4) * 10, 5 * (1 - k)); g.fillStyle = 'rgba(110,74,40,' + (0.6 * (1 - k)) + ')'; g.fill(); }
    ell(g, 0, 0, e.r * 0.85, e.r * 0.6); fillStroke(g, '#7a5230', '#4a3018', 2);
    ell(g, -4, -4, e.r * 0.5, e.r * 0.3); g.fillStyle = '#946638'; g.fill();
    for (let i = 0; i < 7; i++){ const a = i * 0.9 + e.id; circle(g, Math.cos(a) * e.r * 0.5, Math.sin(a) * e.r * 0.35, 2.5 + (i % 3)); g.fillStyle = i % 2 ? '#5f3d1d' : '#a9784a'; g.fill(); }
    g.restore();
    g.save(); g.translate(e.x, e.y); hpBar(g, e, Math.max(30, e.r * 1.6), -e.r - 12); g.restore();
  }
  function drawPest(g, e, t){
    const def = e.def;
    if (e.burrowT > 0){ drawMound(g, e, t); return; }
    g.save();
    g.translate(e.x, e.y);
    /* up in a pair of chopsticks: drawn above the floor (its shadow went down with the others, drawAirShadow) */
    const A = e.air;
    if (A) g.translate(0, -(e.z || 0));
    else if (!def.fly){ g.fillStyle = 'rgba(0,0,0,0.18)'; ell(g, 2, 3, e.r * 1.05, e.r * 0.8); g.fill(); }
    /* blown off its feet by a mixer's whirlwind: a gust under it, and it spins in the air */
    const air = e.blowD > 0 ? Math.min(1, e.blowD / 50) : 0;
    if (air > 0){
      g.save(); g.rotate(-t * 9 + e.id);
      g.strokeStyle = 'rgba(235,245,250,' + (0.8 * air).toFixed(3) + ')'; g.lineWidth = 1.6; g.lineCap = 'round';
      for (let i = 0; i < 2; i++){ g.beginPath(); g.arc(0, 2, e.r * (0.9 + i * 0.35), i * 2.6, i * 2.6 + 2.1); g.stroke(); }
      g.restore();
      g.translate(0, -7 * air);
    }
    /* a cricket mid-leap: up off the floor */
    if (e.hopT > 0) g.translate(0, -Math.sin(Math.PI * (1 - e.hopT / 0.35)) * 12);
    if (e.camo) g.globalAlpha = 0.42;
    const frozen = e.freezeT > 0, stunned = e.stunT > 0;
    const moving = !frozen && !stunned;
    const fr = moving ? Math.floor((e.anim + e.id * 0.13) * (def.fly ? 22 : 9)) % 2 : 0;
    g.save();
    g.rotate(e.rot + (air > 0 ? t * 12 : 0));
    /* kneaded by a dough hook: it shrinks as it goes */
    if (e.holdT > 0 && e.hold && e.hold.k === 'vine'){ const q = 1 - clamp(e.holdT / e.hold.dur, 0, 1); g.scale(1 - 0.45 * q, 1 - 0.45 * q); }
    if (e.gold){
      const pul = 1 + Math.sin(t * 5 + e.id) * 0.12;
      const gr = g.createRadialGradient(0, 0, e.r * 0.4, 0, 0, e.r * 3 * pul);
      gr.addColorStop(0, 'rgba(255,214,102,0.7)'); gr.addColorStop(1, 'rgba(255,214,102,0)');
      g.fillStyle = gr; circle(g, 0, 0, e.r * 3 * pul); g.fill();
    }
    if (e.gold) g.scale(1.3, 1.3);
    if (BIG[e.type]){
      BIG[e.type](g, e, moving ? e.anim : 0);
    } else {
      const spr = e.gold ? goldSprite(e.type, fr) : spriteFor(e.type, fr);
      const h = spr._half;
      if (def.fly){ g.fillStyle = 'rgba(0,0,0,0.16)'; ell(g, -2, 7, e.r * 0.9, e.r * 0.5); g.fill(); }
      g.drawImage(spr, -h, -h, h * 2, h * 2);
    }
    if (e.armored){
      const cr = Math.min(e.r * 0.7, 14);
      g.save(); g.translate(-e.r * 0.2, 0);
      circle(g, 0, 0, cr + 1.5); g.fillStyle = '#7e8a90'; g.fill();
      for (let i = 0; i < 16; i++){ const a = i / 16 * TAU; circle(g, Math.cos(a) * cr, Math.sin(a) * cr, 1.6); g.fillStyle = '#c9d2d6'; g.fill(); }
      circle(g, 0, 0, cr * 0.8); fillStroke(g, '#e2383f', '#8e1d22', 1);
      circle(g, 0, 0, cr * 0.4); g.fillStyle = '#ffd166'; g.fill();
      g.restore();
    }
    if (e.mold && e.type !== 'spore' && e.type !== 'greatmold'){
      for (let i = 0; i < 6; i++){ const a = i * 2.1 + e.id; const rr2 = e.r * 0.55; circle(g, Math.cos(a) * rr2, Math.sin(a) * rr2 * 0.8, 2 + (i % 2)); g.fillStyle = 'rgba(122,169,92,0.85)'; g.fill(); }
    }
    g.restore();
    if (e.camo){
      g.globalAlpha = 1;
      g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 1.2; g.setLineDash([3, 3]);
      circle(g, 0, 0, e.r + 3); g.stroke(); g.setLineDash([]);
    }
    if (e.gold) for (let i = 0; i < 3; i++){
      const ph = t * 2.2 + i * 2.09 + e.id, tw = 0.5 + 0.5 * Math.sin(t * 7 + i * 1.7);
      const sx = Math.cos(ph) * e.r * 1.5, sy = Math.sin(ph) * e.r * 1.2, sr = 2 + tw * 3;
      g.fillStyle = 'rgba(255,248,214,' + (0.5 + tw * 0.5) + ')';
      g.beginPath(); g.moveTo(sx, sy - sr); g.quadraticCurveTo(sx, sy, sx + sr, sy); g.quadraticCurveTo(sx, sy, sx, sy + sr); g.quadraticCurveTo(sx, sy, sx - sr, sy); g.quadraticCurveTo(sx, sy, sx, sy - sr); g.fill();
    }
    if (e.flashT > 0){ g.globalAlpha = e.big ? 0.2 : 0.5; circle(g, 0, 0, e.r * (e.big ? 0.7 : 0.9)); g.fillStyle = '#ffffff'; g.fill(); g.globalAlpha = 1; }
    /* under a shield beetle's cover: a faint green shell over it */
    if (e.guardUntil > G.time && !e.def.guard){ g.beginPath(); g.arc(0, 0, e.r * 1.25, Math.PI * 1.05, Math.PI * 1.95); g.strokeStyle = 'rgba(160,200,90,0.85)'; g.lineWidth = 1.8; g.stroke(); circle(g, 0, 0, e.r * 1.2); g.fillStyle = 'rgba(140,190,80,0.12)'; g.fill(); }
    /* soaked by a spray bottle: a wet sheen and drips; lathered: soap foam, and a skid when it slips */
    if (e.sprayed){
      if (e.wetT > 0){
        ell(g, 0, 0, e.r * 0.92, e.r * 0.74); g.fillStyle = 'rgba(120,190,240,0.26)'; g.fill();
        ell(g, -e.r * 0.32, -e.r * 0.34, e.r * 0.28, e.r * 0.11, -0.6); g.fillStyle = 'rgba(235,248,255,0.75)'; g.fill();
        const k = (t * 1.6 + e.id * 0.37) % 1; circle(g, e.r * 0.45, e.r * 0.2 + k * e.r * 0.7, 1.2 + (1 - k) * 0.6); g.fillStyle = 'rgba(150,210,255,' + (0.9 * (1 - k)).toFixed(3) + ')'; g.fill();
      }
      if (e.latherT > 0){
        const n = e.big ? 6 : 4;
        for (let i = 0; i < n; i++){ const an = i * 2.4 + e.id, rr0 = e.r * (0.35 + (i % 3) * 0.18); circle(g, Math.cos(an) * rr0, Math.sin(an) * rr0 * 0.8 - e.r * 0.1, (e.big ? 3.4 : 2.2) + Math.sin(t * 3 + i) * 0.4); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill(); g.strokeStyle = 'rgba(160,200,230,0.8)'; g.lineWidth = 0.6; g.stroke(); }
      }
      if (e.slipT > 0){ g.strokeStyle = 'rgba(255,255,255,' + (e.slipT * 2).toFixed(3) + ')'; g.lineWidth = 1.6; g.lineCap = 'round'; for (const y of [-e.r * 0.4, e.r * 0.4]){ g.beginPath(); g.moveTo(e.r * 0.9, y); g.lineTo(e.r * 1.9, y); g.stroke(); } }
    }
    /* coated in sticky rice: grains stuck all over it */
    if (e.riceT > 0){ const n = e.big ? 9 : 5; for (let i = 0; i < n; i++){ const an = i * 2.39 + e.id * 0.7, d = e.r * (0.25 + (i % 3) * 0.22); g.save(); g.translate(Math.cos(an) * d, Math.sin(an) * d * 0.85); g.rotate(an * 1.7); ell(g, 0, 0, e.big ? 2.6 : 1.8, e.big ? 1.2 : 0.85); fillStroke(g, '#fffdf2', 'rgba(150,140,110,0.8)', 0.5); g.restore(); } }
    if (e.soakT > 0){ ell(g, 0, 0, e.r * 0.9, e.r * 0.7); g.fillStyle = 'rgba(214,160,52,0.28)'; g.fill(); ell(g, -e.r * 0.3, -e.r * 0.3, e.r * 0.25, e.r * 0.12, -0.6); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill(); }
    if (e.glazed){ circle(g, 0, 0, e.r * 0.92); g.fillStyle = 'rgba(255,200,80,0.2)'; g.fill(); g.strokeStyle = 'rgba(255,214,120,0.75)'; g.lineWidth = 1.3; g.stroke(); ell(g, -e.r * 0.35, -e.r * 0.4, e.r * 0.3, e.r * 0.12, -0.6); g.fillStyle = 'rgba(255,250,220,0.8)'; g.fill(); }
    if (e.acid){ for (let i = 0; i < (e.big ? 4 : 2); i++){ const ph = (t * 1.3 + i * 0.47 + e.id * 0.13) % 1, an = i * 2.3 + e.id; circle(g, Math.cos(an) * e.r * 0.5, Math.sin(an) * e.r * 0.5 + ph * 4, 1.3 + (1 - ph) * 1.2); g.fillStyle = 'rgba(200,214,70,' + (0.9 * (1 - ph)).toFixed(3) + ')'; g.fill(); } }
    if (e.souffle){ for (let i = 0; i < 4; i++){ const an = i * 1.6 + e.id; circle(g, Math.cos(an) * e.r * 0.62, Math.sin(an) * e.r * 0.5, 2.4 + (i % 2)); g.fillStyle = 'rgba(244,217,122,0.85)'; g.fill(); } }
    if (e.charmT > 0) musicNote(g, e.r * 0.5, -e.r - 6 + Math.sin(t * 6 + e.id) * 2, 1, '#ff8fc7');
    if (e.batterT > 0){ for (let i = 0; i < 5; i++){ const a = i * 1.9 + e.id; circle(g, Math.cos(a) * e.r * 0.55, Math.sin(a) * e.r * 0.45, 1.6 + (i % 2)); g.fillStyle = 'rgba(240,205,130,0.85)'; g.fill(); } }
    if (e.layers > 0){
      /* the paragon fryer's batter, built up in layers: a thicker golden crust for each */
      const L = e.layers;
      g.strokeStyle = 'rgba(214,150,50,' + (0.35 + L * 0.1) + ')'; g.lineWidth = 1 + L * 0.8; circle(g, 0, 0, e.r * 0.85 + L * 0.6); g.stroke();
      if (L >= 5){ g.strokeStyle = 'rgba(255,214,120,' + (0.5 + 0.3 * Math.sin(t * 8 + e.id)) + ')'; g.lineWidth = 1.5; circle(g, 0, 0, e.r + 5); g.stroke(); }
    }
    if (frozen){
      circle(g, 0, 0, e.r + 2); g.fillStyle = 'rgba(190,232,255,0.55)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1;
      for (let i = 0; i < 5; i++){ const a = i / 5 * TAU + e.id; g.beginPath(); g.moveTo(Math.cos(a) * e.r * 0.3, Math.sin(a) * e.r * 0.3); g.lineTo(Math.cos(a) * (e.r + 2), Math.sin(a) * (e.r + 2)); g.stroke(); }
    }
    if (e.burn){
      for (let i = 0; i < (e.big ? 5 : 2); i++){
        const ph = t * 9 + i * 2.3 + e.id;
        const fx = Math.cos(i * 2.4 + e.id) * e.r * 0.5, fy = Math.sin(i * 2.4 + e.id) * e.r * 0.5;
        const hgt = 6 + Math.sin(ph) * 2 + (e.big ? 6 : 0);
        g.beginPath(); g.moveTo(fx - 3, fy); g.quadraticCurveTo(fx, fy - hgt * 1.4, fx + 3, fy); g.closePath();
        g.fillStyle = 'rgba(255,138,61,0.9)'; g.fill();
        g.beginPath(); g.moveTo(fx - 1.5, fy); g.quadraticCurveTo(fx, fy - hgt * 0.8, fx + 1.5, fy); g.closePath();
        g.fillStyle = 'rgba(255,224,102,0.95)'; g.fill();
      }
    }
    if (e.vulnT > 0 && e.vulnAmt > 0){ g.strokeStyle = 'rgba(150,150,150,0.5)'; g.lineWidth = 2; circle(g, 0, 0, e.r + 5 + Math.sin(t * 6) * 1.5); g.stroke(); }
    if (e.holdT > 0 && e.hold){
      if (e.hold.k === 'bubble'){
        const R = e.r + 7 + Math.sin(t * 5 + e.id) * 1.2;
        circle(g, 0, 0, R); g.fillStyle = 'rgba(190,235,255,0.22)'; g.fill();
        g.strokeStyle = 'hsla(' + ((t * 120 + e.id * 30) % 360) + ',70%,80%,0.85)'; g.lineWidth = 1.6; g.stroke();
        ell(g, -R * 0.4, -R * 0.45, R * 0.3, R * 0.14, -0.6); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill();
      } else if (e.hold.k === 'void'){
        g.strokeStyle = 'rgba(139,92,246,0.85)'; g.lineWidth = 2; g.setLineDash([3, 4]); g.lineDashOffset = -t * 20; circle(g, 0, 0, e.r + 5); g.stroke(); g.setLineDash([]);
      } else if (e.hold.k === 'pinch'){
        /* the Grandmaster's chopsticks holding a boss where it stands */
        holdSticks(g, e.hold.look, e.r, 0);
      } else if (e.hold.k === 'vine'){
        /* a mixer's dough hook, up through the floor and wrapped around it, tighter as it kneads */
        const q = 1 - clamp(e.holdT / e.hold.dur, 0, 1), R = e.r + 4 - q * e.r * 0.4;
        g.lineCap = 'round';
        for (const [w, c] of [[5.5, '#c9a46a'], [3, '#f3e1b8']]){ g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(R * 0.8, R + 3); g.quadraticCurveTo(R * 1.5, 0, R * 0.4, -R * 0.85); g.stroke(); }
        for (let i = 0; i < 3; i++){ const a = t * 5 + i * 2.1; g.strokeStyle = i % 2 ? 'rgba(201,164,106,0.95)' : 'rgba(243,225,184,0.95)'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, R, R * 0.45, a, 0, Math.PI * 1.2); g.stroke(); }
      } else {
        g.strokeStyle = 'rgba(243,225,184,0.95)'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(e.hold.x - e.x, e.hold.y - e.y); g.quadraticCurveTo((e.hold.x - e.x) * 0.5 + 6, (e.hold.y - e.y) * 0.5 - 8, 0, 0); g.stroke();
        g.strokeStyle = 'rgba(201,164,106,0.9)'; g.lineWidth = 1; g.stroke();
        circle(g, 0, 0, e.r * 0.55); g.fillStyle = 'rgba(243,225,184,0.75)'; g.fill();
      }
    }
    if (stunned && !frozen){
      for (let i = 0; i < 3; i++){ const a = t * 6 + i * TAU / 3; star(g, Math.cos(a) * (e.r + 3), -e.r - 4 + Math.sin(a) * 3, 2.6, '#ffd166'); }
    }
    if (A){
      /* the chopsticks carrying it: they let go early in a throw, or open as they set it down */
      const q = Math.min(1, A.t / A.dur), open = A.toss ? clamp(q / 0.3, 0, 1) : clamp((q - 0.86) / 0.14, 0, 1);
      if (!A.toss || q < 0.36){ g.save(); g.globalAlpha = A.toss ? 1 - clamp((q - 0.22) / 0.14, 0, 1) : 1; holdSticks(g, A.look, e.r * (e.gold ? 1.3 : 1), open); g.restore(); }
    }
    if (e.big){
      const w = Math.max(30, e.r * 1.6);
      hpBar(g, e, w, -e.r - 12);
      if (e.armored){ g.fillStyle = '#c9d2d6'; g.font = '700 9px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.fillText('ARMORED', 0, -e.r - 15); }
      else if (e.boss && e.lvl > 1){ g.font = '700 10px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(29,43,51,0.85)'; g.strokeText('LV ' + e.lvl, 0, -e.r - 15); g.fillStyle = '#ffb27a'; g.fillText('LV ' + e.lvl, 0, -e.r - 15); }
    } else if (e.gold || (e.hp < e.maxHp && e.maxHp >= 10)){
      hpBar(g, e, e.gold ? 26 : 18, -e.r - 8);
    }
    g.restore();
  }
  /* a little quaver, for siren songs */
  function musicNote(g, x, y, s, c){
    g.save(); g.translate(x, y); g.scale(s, s);
    ell(g, -1.6, 2.6, 2.1, 1.6, -0.4); g.fillStyle = c; g.fill();
    g.strokeStyle = c; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0.3, 2.2); g.lineTo(0.3, -4.5); g.quadraticCurveTo(2.8, -3.2, 3.2, -1.2); g.stroke();
    g.restore();
  }
  function star(g, x, y, r, c){
    g.beginPath();
    for (let i = 0; i < 10; i++){ const a = i / 10 * TAU - Math.PI / 2; const rr2 = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    g.closePath(); g.fillStyle = c; g.fill();
  }

  /* ---------------- appliances ---------------- */
  const BODY = {
    knife:   ['#a8703d', '#8f2f2f', '#c08a2e', '#2f6f63'],
    toaster: ['#cfd7dc', '#f1e3c4', '#d9443d', '#8fd3bd'],
    blender: ['#2b3a44', '#5a2a1a', '#3a2f55', '#1f4f6a'],
    dish:    ['#c9d2d6', '#efe9dc', '#9fc6dc', '#f2c9dc'],
    grill:   ['#26292c', '#4a1610', '#3b1414', '#3a3f44'],
    fryer:   ['#c9d2d6', '#d9b26a', '#b9c4c9', '#f3c7a0'],
    oven:    ['#c4643a', '#b9542e', '#9a3f22', '#d0703c'],
    mixer:   ['#e2383f', '#7fb3d9', '#f2c14e', '#2a9d8f'],
    pasta:   ['#d9e0e3', '#f0d27a', '#e6b04a', '#c9a227'],
    freezer: ['#f4f8fa', '#dbeefa', '#e9f4f7', '#e6f6f2'],
    micro:   ['#e9edef', '#ffd9cf', '#f7e6c4', '#d7ecf4'],
    siphon:  ['#5aa6d6', '#c9a227', '#d6455a', '#5ac08f'],
    espresso:['#c9d2d6', '#d8b98c', '#e6e2d6', '#c58b5a'],
    bread:   ['#f7f3ea', '#f6dfaa', '#e9dcc6', '#f3e1c9'],
    gatling: ['#7a5236', '#8a3d22', '#9a7a44', '#5f6e52'],
    boat:    ['#f4efe6', '#dfe7ef', '#efe2e6', '#e9f0e2'],
    sub:     ['#e0a956', '#d99a4a', '#d8a35a', '#c98f45'],
    heli:    ['#e2383f', '#c9363a', '#5f6e52', '#2f6f9f'],
    saucer:  ['#8fd6bd', '#ff9ad0', '#f2c14e', '#7fb3ff'],
    mandoline:['#dfe3e6', '#f0a12e', '#3d3550', '#7ab648'],
    caddy:   ['#b8c2c7', '#c9443a', '#c9a227', '#8a5a2b'],
    saucepan:['#aab3b8', '#c4643a', '#7a9a6a', '#d9b44a'],
    bot:     ['#c9d2d6', '#e0a32e', '#6fa8d9', '#8fae6a'],
    pets:    ['#c98a45', '#b98a55', '#c9783f', '#a8804a'],
    lobster: ['#9fd3e8', '#6a7ab8', '#bfe9ff', '#f2b8cc'],
    chess:   ['#f3e7cb', '#f3e7cb', '#f3e7cb', '#f3e7cb'],
    chopsticks:['#f4f1ea', '#8fbf5a', '#2a2220', '#f4f1ea'],
    spray:   ['#2a9d8f', '#f278b4', '#5aa6d6', '#f2a03d'],
    rice:    ['#f4f1ea', '#c9d2d6', '#f6e7b0', '#f2b07a'],
    susan:   ['#c99a62', '#d8aa6e', '#8f5c36', '#a8603e'],
  };
  function dominant(up){ let p = -1, m = 2; for (let i = 0; i < 3; i++) if (up[i] > m){ m = up[i]; p = i; } return p; }
  /* skins: while an appliance is being drawn, SKIN holds its finish */
  const SKIN_BY_ID = {};
  for (const s of SKINS) SKIN_BY_ID[s.id] = s;
  let SKIN = null, SKIN_T = 0, SKIN_SEED = 0;
  let SPIN_K = 1;   // how many frames a frame-counted spin should advance in this paint (more when a kept 3D picture skipped some)
  const _mix = new Map();
  function toHex(r, g, b){ return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  function mixHex(a, b, k){
    const key = a + b + k;
    let c = _mix.get(key);
    if (!c){ const A = hexToRgb(a), B = hexToRgb(b); c = toHex(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k); _mix.set(key, c); }
    return c;
  }
  function hslHex(h, s, l){
    h = ((h % 360) + 360) % 360;
    const key = 'h' + h + s + l;
    let c = _mix.get(key);
    if (c) return c;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    c = toHex(f(h / 360 + 1 / 3) * 255, f(h / 360) * 255, f(h / 360 - 1 / 3) * 255);
    _mix.set(key, c);
    return c;
  }
  /* the body colour the appliance being drawn wears right now (its skin or its own colour), or null for its own look's */
  function skinBodyNow(){ return SKIN && SKIN.body ? skinBody(SKIN) : null; }
  function skinBody(s){ return s.body === 'rainbow' ? hslHex(Math.round((SKIN_T * 50 + SKIN_SEED * 40) / 3) * 3, 0.72, 0.6) : s.body; }
  function bodyColor(type, up, par){
    if (par) return '#f2c14e';
    const p = dominant(up);
    if (SKIN && SKIN.body){ const b = skinBody(SKIN); return p < 0 ? b : mixHex(b, PATH_COLORS[p], 0.16); }
    return BODY[type][p + 1];
  }
  /* the colour shown on a skin swatch */
  function skinSwatch(type, id){
    const T = TOWERS[type], look = (T && T.look) || type;
    const s = SKIN_BY_ID[id];
    if (!s || !s.body) return (BODY[look] || BODY.knife)[0];
    return s.body;
  }

  function drawKnife(g, t, up, time, par){
    const [a, b, c] = up;
    const fired = t.fireAnim > 0;
    if (a >= 5 || par){ g.save(); g.translate(-4, 0); g.rotate(time * (par ? 3 : 1.2)); circle(g, 0, 0, 22); fillStroke(g, 'rgba(220,228,232,0.9)', '#8e9aa0', 1.5); for (let i = 0; i < 24; i++){ const an = i / 24 * TAU; g.beginPath(); g.moveTo(Math.cos(an) * 20, Math.sin(an) * 20); g.lineTo(Math.cos(an + 0.13) * 23.5, Math.sin(an + 0.13) * 23.5); g.lineTo(Math.cos(an + 0.26) * 20, Math.sin(an + 0.26) * 20); g.fillStyle = '#e8eef0'; g.fill(); } circle(g, 0, 0, 7); fillStroke(g, '#5c666b', '#2e3437', 1); g.restore(); }
    const col = bodyColor('knife', up, par);
    // handles out the back
    const nH = b >= 4 ? 7 : 5;
    for (let i = 0; i < nH; i++){
      const y = -10 + i * (20 / (nH - 1));
      rr(g, -21, y - 1.8, 9, 3.6, 1.5); fillStroke(g, b >= 5 || par ? '#c9a227' : '#1f1f22', '#000', 0.6);
      circle(g, -18, y, 0.6); g.fillStyle = '#c9d2d6'; g.fill();
    }
    rr(g, -14, -14, 26, 28, 6); fillStroke(g, col, shade(col, -0.4), 1.5);
    g.fillStyle = 'rgba(255,255,255,0.18)'; rr(g, -12, -12, 22, 8, 4); g.fill();
    if (t.rank >= 8 || par){ g.strokeStyle = '#ffd166'; g.lineWidth = 2; rr(g, -13, -13, 24, 26, 5); g.stroke(); }
    for (let i = 0; i < 3; i++){ g.fillStyle = 'rgba(30,15,5,0.55)'; g.fillRect(-9 + i * 7, -8, 3, 16); }
    if (c >= 5){ for (let i = 0; i < 4; i++){ g.fillStyle = i % 2 ? '#ffffff' : '#c9363a'; g.fillRect(-14, -3 + i * 1.6 - 1.6, 26, 1.6); } }
    // what is ready to throw
    g.save(); g.translate(13, 0);
    if (!fired){
      if (a >= 4 && a < 5){ g.beginPath(); g.arc(4, 0, 9, -1.3, 1.3); g.lineTo(2, 7); g.arc(2, 0, 6, 1.2, -1.2, true); g.closePath(); fillStroke(g, '#dfe7ea', '#7f8b90', 1); }
      else if (a === 3){ circle(g, 6, 0, 7); fillStroke(g, '#dfe7ea', '#7f8b90', 1); for (let i = 0; i < 6; i++){ const an = i / 6 * TAU + time * 6; g.strokeStyle = '#8e9aa0'; g.beginPath(); g.moveTo(6, 0); g.lineTo(6 + Math.cos(an) * 6, Math.sin(an) * 6); g.stroke(); } }
      else {
        const n = b >= 3 ? 3 : 1;
        for (let i = 0; i < n; i++){
          g.save(); g.rotate((i - (n - 1) / 2) * 0.22);
          if (c >= 3 && a < 3){ g.fillStyle = '#9a6a3a'; g.fillRect(0, -1, 18, 2); for (let k = 0; k < 3; k++){ rr(g, 4 + k * 5, -3, 4, 6, 1.5); g.fillStyle = ['#c9363a', '#7ab648', '#f2c14e'][k]; g.fill(); } }
          else { g.beginPath(); g.moveTo(0, -2.2); g.lineTo(16, -0.4); g.lineTo(16, 0.6); g.lineTo(0, 2.2); g.closePath(); fillStroke(g, b >= 5 ? '#ffe08a' : '#e4ebee', '#7f8b90', 0.7); }
          g.restore();
        }
      }
    }
    g.restore();
    if (c >= 4){ g.save(); g.translate(-2, 16); rr(g, -8, -4, 16, 9, 1.5); fillStroke(g, '#d9e0e3', '#6b777c', 1); g.fillStyle = '#1f1f22'; g.fillRect(-14, -1, 7, 3); g.restore(); }
  }
  function drawToaster(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('toaster', up, par);
    rr(g, -12, -17, 24, 34, 8); fillStroke(g, col, shade(col, -0.45), 1.6);
    g.fillStyle = 'rgba(255,255,255,0.35)'; rr(g, -9, -14, 6, 28, 3); g.fill();
    if (c >= 3){ g.save(); rr(g, -12, -17, 24, 34, 8); g.clip(); g.strokeStyle = 'rgba(120,70,20,0.35)'; g.lineWidth = 1; for (let i = -17; i < 17; i += 5){ g.beginPath(); g.moveTo(-12, i); g.lineTo(12, i); g.stroke(); } for (let i = -12; i < 12; i += 5){ g.beginPath(); g.moveTo(i, -17); g.lineTo(i, 17); g.stroke(); } g.restore(); }
    const pop = t.fireAnim > 0 ? 1 : 0;
    for (const sy of [-7, 7]){
      rr(g, -6, sy - 3, 14, 6, 2); g.fillStyle = '#2a2a2a'; g.fill();
      if (pop || (time * 0.7 + sy) % 3 < 0.4){
        const bread = a >= 3 ? '#b97a3c' : b >= 3 ? '#d2a066' : '#e2b875';
        if (b >= 3 && a < 3){ circle(g, 2, sy, 5); fillStroke(g, bread, '#7a4a20', 1); circle(g, 2, sy, 1.8); g.fillStyle = '#2a2a2a'; g.fill(); }
        else { rr(g, -4, sy - 3.5, 12, 7, 2.5); fillStroke(g, bread, '#7a4a20', 1); }
      }
    }
    rr(g, -16, -4, 5, 8, 2); fillStroke(g, '#1f1f22', '#000', 0.6);
    if (b >= 5){ g.strokeStyle = '#ff5a4e'; g.lineWidth = 1.5; circle(g, 18, 0, 5); g.stroke(); g.beginPath(); g.moveTo(12, 0); g.lineTo(24, 0); g.moveTo(18, -6); g.lineTo(18, 6); g.stroke(); }
    if (a >= 5 || par){ circle(g, 0, 0, 22); g.strokeStyle = 'rgba(255,209,102,0.5)'; g.lineWidth = 2; g.stroke(); }
  }
  function drawBlender(g, t, up, time, par){
    const [a, b, c] = up;
    const bcol = SKIN && SKIN.body ? bodyColor('blender', up, par) : '#2b3a44';
    rr(g, -17, -17, 34, 34, 8); fillStroke(g, bcol, shade(bcol, -0.45), 1.5);
    circle(g, 12, 12, 3); g.fillStyle = '#c9d2d6'; g.fill();
    const jar = a >= 5 || par ? '#2a1640' : a >= 3 ? 'rgba(255,140,80,0.75)' : c >= 3 ? 'rgba(120,190,255,0.6)' : 'rgba(200,235,255,0.55)';
    circle(g, 0, 0, 14); fillStroke(g, jar, 'rgba(255,255,255,0.8)', 2);
    const spd = t.fireAnim > 0 ? 30 : 4;
    t._spin = (t._spin || 0) + spd * 0.016 * SPIN_K;
    if (a >= 5 || par){
      for (let i = 0; i < 4; i++){ g.strokeStyle = 'rgba(190,120,255,' + (0.7 - i * 0.15) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 4 + i * 2.5, t._spin + i, t._spin + i + 3.6); g.stroke(); }
      circle(g, 0, 0, 3); g.fillStyle = '#000'; g.fill();
    } else {
      g.save(); g.rotate(t._spin);
      for (let i = 0; i < 4; i++){ g.rotate(TAU / 4); g.beginPath(); g.moveTo(0, -1.5); g.lineTo(11, -3); g.lineTo(11, 1); g.lineTo(0, 1.5); g.closePath(); fillStroke(g, '#e4ebee', '#7f8b90', 0.6); }
      g.restore();
      circle(g, 0, 0, 2.5); g.fillStyle = '#5c666b'; g.fill();
    }
    if (c >= 3){ g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1; for (let i = 0; i < 3; i++){ g.beginPath(); g.arc(0, 0, 6 + i * 3, -t._spin * 0.5 + i * 2, -t._spin * 0.5 + i * 2 + 2); g.stroke(); } }
    if (b >= 1){ const n = Math.min(8, 2 + b); for (let i = 0; i < n; i++){ const an = i / n * TAU + time * 2; g.save(); g.translate(Math.cos(an) * 20, Math.sin(an) * 20); g.rotate(an); g.beginPath(); g.moveTo(-3, -2); g.lineTo(3, 0); g.lineTo(-3, 2); g.closePath(); g.fillStyle = b >= 5 ? '#ffd166' : '#dfe7ea'; g.fill(); g.restore(); } }
    ell(g, -5, -6, 4, 2, -0.6); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
  }
  function drawGrill(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('grill', up, par);
    const hot = par || a >= 5 ? 2 : a >= 1 ? 1 : 0;
    if (hot === 2){ const pr = 0.5 + Math.sin(time * 4) * 0.5; circle(g, 0, 0, 23 + pr * 2); g.fillStyle = 'rgba(255,120,40,' + (0.18 + pr * 0.12) + ')'; g.fill(); }
    circle(g, 0, 0, 19); fillStroke(g, col, '#0d0f10', 1.6);
    circle(g, 0, 0, 15.5); g.fillStyle = '#1a1c1e'; g.fill();
    for (let i = 0; i < 10; i++){
      const an = i * 2.4, r = (i % 3) * 4.2 + 2.5, gl = Math.sin(time * 5 + i * 1.3) * 0.5 + 0.5;
      circle(g, Math.cos(an) * r, Math.sin(an) * r, 2.7 + (i % 2) * 0.5);
      g.fillStyle = hot === 2 ? 'rgb(255,' + (190 + gl * 60 | 0) + ',' + (110 + gl * 90 | 0) + ')' : hot === 1 ? 'rgb(255,' + (110 + gl * 70 | 0) + ',40)' : 'rgb(' + (200 + gl * 55 | 0) + ',' + (70 + gl * 40 | 0) + ',30)';
      g.fill();
    }
    g.strokeStyle = '#b8c2c6'; g.lineWidth = 1.2;
    for (let i = -12; i <= 12; i += 4){ const h2 = Math.sqrt(Math.max(0, 15.5 * 15.5 - i * i)); g.beginPath(); g.moveTo(i, -h2); g.lineTo(i, h2); g.stroke(); }
    rr(g, 17, -2.5, 10, 5, 2); fillStroke(g, '#5a3a1e', '#2a180a', 0.6);
    if (a >= 3 && !par){
      g.save(); g.rotate(-0.7);
      g.fillStyle = '#5a3a1e'; rr(g, -30, -2, 9, 4, 2); g.fill();
      g.fillStyle = '#6b777c'; g.fillRect(-22, -1, 22, 2);
      rr(g, -1, -4, 7, 8, 1.5); fillStroke(g, a >= 5 ? '#ffe08a' : '#ff8a3d', '#7a2a0a', 0.8);
      g.restore();
    }
    if (b >= 3){ for (let i = 0; i < 3; i++){ const fx = -6 + i * 6, hh = 7 + Math.sin(time * 12 + i) * 3; g.beginPath(); g.moveTo(fx - 3, 0); g.quadraticCurveTo(fx, -hh * 1.6, fx + 3, 0); g.closePath(); g.fillStyle = b >= 5 ? 'rgba(170,92,255,0.85)' : 'rgba(255,138,61,0.85)'; g.fill(); } }
    const ux = -Math.sin(t.rotNow || 0), uy = -Math.cos(t.rotNow || 0);
    if (c >= 3){ rr(g, -26, -20, 9, 16, 2); fillStroke(g, '#6b4a2a', '#3a2614', 1); for (let i = 0; i < 3; i++){ const rise = 4 + ((time * 18 + i * 9) % 26), side = Math.sin(time + i) * 3; circle(g, -21.5 + ux * rise - uy * side, -18 + uy * rise + ux * side, 3 + i); g.fillStyle = 'rgba(210,210,210,' + (0.35 - i * 0.08) + ')'; g.fill(); } }
    if (hot === 2){ for (let i = 0; i < 3; i++){ const k = (time * 0.9 + i / 3) % 1, rise = 6 + k * 22, side = Math.sin(i * 2 + time) * 8; circle(g, ux * rise - uy * side, uy * rise + ux * side, 1.6 * (1 - k)); g.fillStyle = 'rgba(255,200,90,' + (1 - k) + ')'; g.fill(); } }
    if (par){ g.strokeStyle = 'rgba(255,209,102,0.8)'; g.lineWidth = 2; circle(g, 0, 0, 19); g.stroke(); }
  }
  function drawFreezer(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('freezer', up, par);
    rr(g, -17, -15, 34, 30, 6); fillStroke(g, col, '#8fa3ac', 1.6);
    g.fillStyle = 'rgba(160,215,240,0.55)';
    for (const [x, y, sx, sy] of [[-17, -15, 1, 1], [17, -15, -1, 1], [-17, 15, 1, -1], [17, 15, -1, -1]]){ g.beginPath(); g.moveTo(x, y); g.lineTo(x + sx * 9, y); g.lineTo(x, y + sy * 9); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(-15, -1, 30, 2);
    rr(g, -6, 9, 12, 3.5, 1.5); g.fillStyle = a >= 3 ? '#1f5f9e' : '#5aa6d6'; g.fill();
    g.save(); g.translate(0, -5);
    g.strokeStyle = a >= 4 || par ? '#2f8fd8' : '#7fb8d6'; g.lineWidth = a >= 4 ? 2 : 1.4; g.lineCap = 'round';
    for (let i = 0; i < 3; i++){ g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.moveTo(4, -2); g.lineTo(5, 0); g.lineTo(4, 2); g.moveTo(-4, -2); g.lineTo(-5, 0); g.lineTo(-4, 2); g.stroke(); }
    g.restore();
    if (b >= 1){
      g.save(); g.rotate((t.aim2 != null ? t.aim2 : -Math.PI / 2) - (t.rotNow || 0));
      if (b >= 4){ rr(g, 4, -5, 22, 10, 3); fillStroke(g, '#9fd6f0', '#4c8fb0', 1.2); circle(g, 26, 0, 4); g.fillStyle = '#e8f8ff'; g.fill(); }
      else if (b >= 1){ rr(g, 8, -6, 14, 12, 2); fillStroke(g, '#d7f0fb', '#6aa9c6', 1); g.strokeStyle = '#6aa9c6'; g.beginPath(); g.moveTo(15, -6); g.lineTo(15, 6); g.moveTo(8, 0); g.lineTo(22, 0); g.stroke(); }
      g.restore();
    }
    if (c >= 2){ for (let i = 0; i < 5; i++){ const an = time * 0.8 + i * TAU / 5, r = 22 + Math.sin(time * 2 + i) * 3; circle(g, Math.cos(an) * r, Math.sin(an) * r, 1.6); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill(); } }
  }
  function drawMicro(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('micro', up, par);
    rr(g, -16, -15, 32, 30, 4); fillStroke(g, col, '#7f8b90', 1.6);
    const glow = t.fireAnim > 0 || (a >= 3 && t.fireAnim > -0.3);
    rr(g, -12, -11, 18, 22, 3); g.fillStyle = glow ? (a >= 5 || par ? '#7fe9ff' : '#ff9f6b') : '#22303a'; g.fill();
    circle(g, -3, 0, 7); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.stroke();
    g.save(); g.translate(-3, 0); g.rotate(time * 2); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(-1, -6, 2, 12); g.restore();
    g.fillStyle = '#2a2f33'; g.fillRect(8, -11, 6, 22);
    g.fillStyle = '#7ee07a'; g.font = '700 5px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.fillText(glow ? '0:0' + (Math.floor(time * 4) % 10) : '12:00', 11, -6);
    for (let i = 0; i < 6; i++){ g.fillStyle = '#c9d2d6'; g.fillRect(9 + (i % 2) * 2.6, -2 + Math.floor(i / 2) * 3.2, 1.8, 1.8); }
    if (b >= 1){ g.save(); g.rotate(-(t.rotNow || 0)); g.translate(0, -18); rr(g, -6, -6, 12, 10, 2); fillStroke(g, '#ffffff', '#c9363a', 1); g.fillStyle = '#e2383f'; g.fillRect(-6, -2, 12, 2.5); if (b >= 3){ for (let i = 0; i < 4; i++){ circle(g, -4 + i * 2.8, -7, 2); g.fillStyle = b >= 4 ? '#e8a23c' : '#fff6da'; g.fill(); } } g.restore(); }
    if (c >= 1){ g.strokeStyle = '#5c666b'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(14, -15); g.lineTo(20, -22); g.stroke(); circle(g, 20, -22, 2); g.fillStyle = c >= 4 ? '#7fe9ff' : '#ff5a4e'; g.fill(); }
    if (c >= 4){ g.strokeStyle = 'rgba(127,233,255,0.7)'; g.lineWidth = 1; rr(g, -17, -16, 34, 32, 5); g.stroke(); }
  }
  function drawSiphon(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('siphon', up, par);
    const cart = b >= 5 ? 3 : b >= 3 ? 2 : 1;
    for (let i = 0; i < cart; i++){ rr(g, -16 - i * 5, -18 + i * 2, 5, 12, 2.5); fillStroke(g, '#d9e0e3', '#6b777c', 0.8); }
    circle(g, 0, 0, 14); fillStroke(g, col, shade(col, -0.45), 1.6);
    ell(g, -4, -5, 6, 3, -0.6); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill();
    for (let i = 0; i < 4; i++){ circle(g, -2 + Math.sin(time * 3 + i) * 5, 6 - ((time * 10 + i * 4) % 14), 1.2); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill(); }
    circle(g, 0, 0, 7); fillStroke(g, a >= 5 || par ? '#ffd166' : '#c9d2d6', '#6b777c', 1);
    const nl = a >= 4 ? 22 : a >= 2 ? 19 : 16;
    rr(g, 4, -3, nl, 6, 2.5); fillStroke(g, '#c9d2d6', '#6b777c', 1);
    if (a >= 2){ rr(g, nl + 1, -3.5, 6, 7, 2); fillStroke(g, '#c99a5c', '#7a5428', 0.8); }
    if (c >= 4){ g.save(); g.rotate(-(t.rotNow || 0)); rr(g, 10, 8, 12, 10, 1.5); fillStroke(g, '#a57d55', '#6f5234', 1); g.strokeStyle = '#6f5234'; g.beginPath(); g.moveTo(10, 13); g.lineTo(22, 13); g.stroke(); g.restore(); }
    if (c >= 1){ for (let i = 0; i < 3; i++){ const an = time + i * 2.1; circle(g, Math.cos(an) * 20, Math.sin(an) * 20, 2.4); g.strokeStyle = 'rgba(190,240,255,0.8)'; g.lineWidth = 1; g.stroke(); } }
  }
  /* the Rice Cooker, from above: a round pot with a domed lid, a hinge at the back (-x) and a control panel at the
     front (+x) with its cook and warm lights. A ring round the lid fills as the rice cooks, and the lid pops up as it
     bursts. Pressure turns it into a steel pressure pot with a weighted valve, a gauge and finally an industrial
     steamer; Sticky leans a rice paddle on it, then a bowl of rice balls, a mochi mallet and a golden paddle; Keep
     Warm adds a warm glow, a timer dial, a steam tray and, at the top, a stack of little pots. Kept pots sit round it
     as small bowls. */
  function drawRice(g, t, up, time, par){
    const [a, b, c] = up;
    const body = bodyColor('rice', up, par), fire = t.fireAnim > 0;
    const steel = a >= 3 || par;
    const charge = typeof riceCharge === 'function' && t.s ? riceCharge(t) : 1;
    /* Keep Warm: a warm glow under it */
    if ((c >= 2 || par) && !lowFx()){ const gr = g.createRadialGradient(0, 0, 8, 0, 0, 26); gr.addColorStop(0, 'rgba(255,170,80,0.35)'); gr.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = gr; circle(g, 0, 0, 26); g.fill(); }
    /* the stack of little pots behind (Banquet Hall, the paragon) */
    if (c >= 5 || par) for (const [x, y] of [[-16, -12], [-16, 12], [-21, 0]]){ circle(g, x, y, 6); fillStroke(g, par ? '#f2c14e' : '#f2b07a', '#7a4a1a', 1); circle(g, x, y, 3.6); g.fillStyle = '#fffbea'; g.fill(); }
    /* the pot */
    circle(g, 0, 0, 15); fillStroke(g, steel ? (a >= 5 ? '#9aa6ab' : '#c9d2d6') : body, steel ? '#4d585d' : shade(body, -0.45), 1.6);
    /* the hinge at the back and the control panel at the front */
    rr(g, -17, -4, 4, 8, 1.6); fillStroke(g, '#5c666b', '#2a2f33', 0.8);
    rr(g, 10, -6, 7, 12, 2.4); fillStroke(g, par ? '#2a2220' : '#3a4448', '#1a1f22', 0.9);
    const ready = charge >= 1;
    circle(g, 13.5, -2.6, 1.6); g.fillStyle = ready ? '#7ee07a' : '#ff6b4a'; g.fill();
    circle(g, 13.5, 2.6, 1.6); g.fillStyle = (t.riceStore > 0 || c >= 1) ? '#ffb347' : '#5a3a2a'; g.fill();
    /* the charge ring round the lid */
    g.lineWidth = 2.4; g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.arc(0, 0, 12.2, 0, TAU); g.stroke();
    g.strokeStyle = ready ? '#7ee07a' : '#ffcf4d'; g.beginPath(); g.arc(0, 0, 12.2, -Math.PI / 2, -Math.PI / 2 + TAU * charge); g.stroke();
    /* the lid: lifted as it bursts */
    const lift = fire ? Math.sin((1 - t.fireAnim / 0.4) * Math.PI) * 3.5 : 0;
    g.save(); g.translate(-lift * 0.6, -lift);
    circle(g, 0, 0, 10.2); fillStroke(g, steel ? '#dfe5e8' : shade(body, 0.06), steel ? '#5c666b' : shade(body, -0.4), 1.1);
    ell(g, -3.2, -3.4, 4, 2, -0.6); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
    /* the steam vent, or the pressure valve and its gauge */
    if (steel){
      circle(g, 0, 0, 3.4); fillStroke(g, '#2a2f33', '#111', 0.8);
      circle(g, 0, 0, 1.7); g.fillStyle = a >= 5 ? '#e2383f' : '#f2a03d'; g.fill();
      if (a >= 4 || par){ circle(g, 5.5, 4.5, 2.6); fillStroke(g, '#f4f6f6', '#2a2f33', 0.7); g.strokeStyle = '#e2383f'; g.lineWidth = 0.8; const ga = -2.4 + charge * 2.8; g.beginPath(); g.moveTo(5.5, 4.5); g.lineTo(5.5 + Math.cos(ga) * 2, 4.5 + Math.sin(ga) * 2); g.stroke(); }
    } else { rr(g, -1.5, -5.5, 3, 4, 1.2); fillStroke(g, '#c9d2d6', '#5c666b', 0.6); }
    /* the timer dial (Rice Timer) */
    if (c >= 3 || par){ circle(g, -4.5, 4.5, 2.6); fillStroke(g, '#fff4d6', '#7a4a1a', 0.7); g.strokeStyle = '#7a4a1a'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-4.5, 4.5); g.lineTo(-4.5 + Math.cos(time * 2) * 1.8, 4.5 + Math.sin(time * 2) * 1.8); g.stroke(); }
    g.restore();
    /* Sticky: a rice paddle leaning on it, a bowl of rice balls, a mallet */
    if (b >= 1 || par){
      g.save(); g.translate(4, 15); g.rotate(-0.5);
      rr(g, -1.3, -2, 2.6, 9, 1.2); fillStroke(g, b >= 5 || par ? '#f2c14e' : '#f4efe0', b >= 5 || par ? '#8a6a10' : '#9c9078', 0.7);
      ell(g, 0, -4.5, 3.4, 4.2); fillStroke(g, b >= 5 || par ? '#f2c14e' : '#f4efe0', b >= 5 || par ? '#8a6a10' : '#9c9078', 0.7);
      for (let i = 0; i < 3; i++){ circle(g, -1 + i, -5 + (i % 2), 0.7); g.fillStyle = '#ffffff'; g.fill(); }
      g.restore();
    }
    if (b >= 3 || par){ circle(g, -8, 16, 4.6); fillStroke(g, '#2a5f8a', '#163f66', 0.8); for (const [x, y] of [[-9.5, 15], [-6.5, 15.5], [-8, 17.6]]){ circle(g, x, y, 1.6); fillStroke(g, '#fbf7ea', '#9c9078', 0.5); } }
    if (b >= 4 || par){ g.save(); g.translate(-10, -15); g.rotate(0.6); rr(g, -1, -1, 2, 10, 1); fillStroke(g, '#8a5a2a', '#4a2a10', 0.6); rr(g, -4, -4.5, 8, 4.5, 1.6); fillStroke(g, '#a8703a', '#4a2a10', 0.7); g.restore(); }
    /* kept pots: little bowls round the front */
    const kept = Math.min(10, t.riceStore || 0);
    for (let i = 0; i < kept; i++){ const an = -1.2 + i * 0.26; circle(g, Math.cos(an) * 21, Math.sin(an) * 21, 2.4); fillStroke(g, '#fffbea', '#c9a36a', 0.7); }
    /* the burst of steam as the lid pops */
    if (fire && !lowFx()){
      const k = 1 - t.fireAnim / 0.4;
      for (let i = 0; i < 6; i++){ const an = i / 6 * TAU + k; circle(g, Math.cos(an) * (8 + k * 14), Math.sin(an) * (8 + k * 14), 3 + k * 4); g.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)).toFixed(3) + ')'; g.fill(); }
    } else if (ready && !lowFx()){
      const k = (time * 0.8) % 1; circle(g, 0, -k * 10, 2 + k * 3); g.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - k)).toFixed(3) + ')'; g.fill();
    }
  }
  /* the Spray Bottle: a round bottle seen from above with its trigger head on top, pointing +x. What is in it shows
     through the plastic (water, soap, icy mist); the nozzle path grows a brass nozzle, a hose and pressure tank, and a
     power-washer lance. The Car Wash has roller brushes either side. */
  function drawSpray(g, t, up, time, par){
    const [a, b, c] = up;
    const head = bodyColor('spray', up, par), fire = t.fireAnim > 0;
    const liquid = par ? '#9fe0ff' : a >= 3 ? '#ff9ad0' : a >= 1 ? '#ffc2e2' : b >= 2 ? '#bfe9ff' : '#7fc8f0';
    /* the Car Wash's roller brushes */
    if (par){
      for (const y of [-14.5, 14.5]){
        rr(g, -13, y - 3.8, 24, 7.6, 3.8); fillStroke(g, '#2f7fc8', '#163f66', 1);
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1;
        for (let i = 0; i < 6; i++){ const x = -11 + ((i * 3.9 + time * 30) % 22); g.beginPath(); g.moveTo(x, y - 3.2); g.lineTo(x - 2, y + 3.2); g.stroke(); }
      }
    }
    /* a pressure tank behind, hosed to the head */
    if (c >= 3){
      rr(g, -26, -6, 10, 12, 5); fillStroke(g, c >= 5 ? '#e2383f' : '#f2a03d', '#7a3a10', 1);
      ell(g, -23, -3, 2.5, 1.2, -0.5); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill();
      g.strokeStyle = '#2a2f33'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-16, 2); g.quadraticCurveTo(-10, 12, -3, 5); g.stroke();
      if (c >= 4){ circle(g, -21, 0, 3); fillStroke(g, '#f4f6f6', '#2a2f33', 0.8); g.strokeStyle = '#e2383f'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-21, 0); g.lineTo(-21 + Math.cos(-0.8 + Math.sin(time * 3) * 0.4) * 2.4, Math.sin(-0.8 + Math.sin(time * 3) * 0.4) * 2.4); g.stroke(); }
    }
    /* the bottle: clear plastic with the liquid inside */
    circle(g, 0, 0, 12); fillStroke(g, 'rgba(232,244,250,0.9)', '#7f9aa6', 1.4);
    circle(g, 0, 0, 9.6); g.fillStyle = liquid; g.fill();
    ell(g, -4, -4.5, 4.5, 2, -0.6); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
    if (b >= 2 && a < 1){ g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 0.8; for (let i = 0; i < 6; i++){ const an = i / 6 * TAU; g.beginPath(); g.moveTo(Math.cos(an) * 6.5, Math.sin(an) * 6.5); g.lineTo(Math.cos(an) * 9.4, Math.sin(an) * 9.4); g.stroke(); } }
    if (a >= 1) for (let i = 0; i < 5; i++){ const an = i * 1.3 + time * 0.6; circle(g, Math.cos(an) * 6, Math.sin(an) * 6, 1.2 + (i % 2)); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill(); }
    /* the trigger head, its nozzle and the trigger under it */
    const nl = c >= 5 || par ? 26 : c >= 4 ? 21 : c >= 1 ? 17 : 14;
    rr(g, 4, 3, 7, 4, 1.8); fillStroke(g, shade(head, -0.2), shade(head, -0.55), 0.8);
    rr(g, -6, -4.6, 18, 9.2, 4); fillStroke(g, head, shade(head, -0.5), 1.2);
    g.fillStyle = 'rgba(255,255,255,0.3)'; rr(g, -4, -3.4, 13, 2.6, 1.3); g.fill();
    if (c >= 4 || par){ rr(g, 10, -1.8, nl - 8, 3.6, 1.8); fillStroke(g, '#c9d2d6', '#5c666b', 0.8); if (c >= 5 || par){ rr(g, nl - 4, -2.6, 3, 5.2, 1); fillStroke(g, '#f2c14e', '#8a6a10', 0.7); } }
    rr(g, nl - (c >= 4 || par ? 2 : 4), -3, 4.5, 6, 1.4); fillStroke(g, c >= 1 ? '#d9a441' : '#2a2f33', c >= 1 ? '#7a5a14' : '#111', 0.8);
    if (c >= 1){ g.strokeStyle = '#7a5a14'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(nl - 1, -3); g.lineTo(nl - 1, 3); g.stroke(); }
    /* the spray as it fires: a puff of mist or a jet start */
    if (fire && !lowFx()){
      const k = 1 - t.fireAnim / 0.18;
      for (let i = 0; i < 4; i++){ circle(g, nl + 3 + k * 10 + i * 2.5, Math.sin(i * 2.1) * (2 + k * 5), 2.2 + k * 2.5 - i * 0.3); g.fillStyle = 'rgba(220,242,255,' + (0.7 * (1 - k)).toFixed(3) + ')'; g.fill(); }
    }
    /* soap: a foam crown, then sparkles */
    if (a >= 4 || par){ for (let i = 0; i < 7; i++){ const an = i / 7 * TAU + 0.3; circle(g, Math.cos(an) * 10.5, Math.sin(an) * 10.5, 2.6 + (i % 3) * 0.6); fillStroke(g, '#ffffff', 'rgba(170,210,235,0.9)', 0.6); } }
    if ((a >= 5 || par) && !lowFx()) for (let i = 0; i < 3; i++){ const ph = time * 2 + i * 2.1; star(g, Math.cos(ph) * 16, Math.sin(ph) * 14, 2 + Math.sin(time * 7 + i) * 0.8, '#fffbe6'); }
    if (a >= 2) for (let i = 0; i < 3; i++){ const k = (time * 0.5 + i / 3) % 1, an = i * 2.1 + time * 0.4; circle(g, Math.cos(an) * (14 + k * 8), Math.sin(an) * (14 + k * 8), 2 + k * 1.5); g.strokeStyle = 'rgba(200,240,255,' + (0.9 * (1 - k)).toFixed(3) + ')'; g.lineWidth = 0.9; g.stroke(); }
    /* mist: humidifier puffs, then a little rain cloud */
    if (b >= 4 && !lowFx()) for (let i = 0; i < 3; i++){ const k = (time * 0.6 + i / 3) % 1, an = i * 2.4; circle(g, Math.cos(an) * (12 + k * 10), Math.sin(an) * (12 + k * 10), 3 + k * 4); g.fillStyle = 'rgba(235,248,255,' + (0.35 * (1 - k)).toFixed(3) + ')'; g.fill(); }
    if (b >= 5){
      g.save(); g.rotate(-(t.rotNow || 0));
      for (const [x, y, r] of [[-5, -20, 5], [0, -22, 6], [5, -20, 5]]){ circle(g, x, y, r); g.fillStyle = '#9aa8b3'; g.fill(); }
      g.strokeStyle = 'rgba(160,210,255,0.9)'; g.lineWidth = 1; for (let i = 0; i < 3; i++){ const k = (time * 2 + i / 3) % 1; g.beginPath(); g.moveTo(-4 + i * 4, -16 + k * 6); g.lineTo(-5 + i * 4, -13 + k * 6); g.stroke(); }
      if (Math.sin(time * 5) > 0.92){ g.strokeStyle = '#fff3a0'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(1, -17); g.lineTo(-1, -13); g.lineTo(2, -12); g.lineTo(0, -8); g.stroke(); }
      g.restore();
    }
    if (par){ g.strokeStyle = '#ffd166'; g.lineWidth = 2; circle(g, 0, 0, 12.6); g.stroke(); }
  }
  function drawEspresso(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('espresso', up, par);
    rr(g, -21, -17, 42, 34, 6); fillStroke(g, col, '#6b777c', 1.6);
    g.fillStyle = 'rgba(255,255,255,0.3)'; rr(g, -19, -15, 38, 6, 3); g.fill();
    for (const x of [-9, 9]){ circle(g, x, 2, 6); fillStroke(g, '#2a2f33', '#000', 1); rr(g, x - 1.5, 6, 3, 9, 1.5); g.fillStyle = '#1f1f22'; g.fill(); circle(g, x, 2, 3.2); g.fillStyle = '#6b3d1f'; g.fill(); }
    circle(g, 0, -9, 4); fillStroke(g, '#ffffff', '#8e9aa0', 1);
    g.strokeStyle = '#c9363a'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -9); g.lineTo(Math.cos(time * 2) * 3, -9 + Math.sin(time * 2) * 3); g.stroke();
    if (b >= 1){ rr(g, 22, 4, 8, 11, 2); fillStroke(g, 'rgba(220,240,245,0.7)', '#8e9aa0', 1); circle(g, 26, 11, 2); g.fillStyle = '#ffd166'; g.fill(); }
    if (c >= 1){ g.strokeStyle = '#b87333'; g.lineWidth = 2; g.beginPath(); g.moveTo(-21, -8); g.lineTo(-27, -8); g.lineTo(-27, -16); g.stroke(); }
    if (a >= 1){ for (let i = 0; i < Math.min(a, 3); i++){ ell(g, -14 + i * 7, 13, 2.4, 1.6, 0.4); g.fillStyle = '#5a3418'; g.fill(); } }
    for (let i = 0; i < 3; i++){ const sy = -18 - ((time * 16 + i * 8) % 22); circle(g, Math.sin(time * 2 + i) * 4, sy, 2.5 + i * 0.8); g.fillStyle = 'rgba(255,255,255,' + (0.45 - i * 0.12) + ')'; g.fill(); }
    if (par){ g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 2; rr(g, -22, -18, 44, 36, 7); g.stroke(); }
  }
  function drawBread(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('bread', up, par);
    rr(g, -19, -18, 38, 36, 9); fillStroke(g, col, '#9a8f7a', 1.6);
    rr(g, -12, -12, 24, 18, 5); g.fillStyle = '#2b2622'; g.fill();
    ell(g, 0, -2, 9, 6); g.fillStyle = a >= 5 || par ? '#f2c14e' : '#c98a45'; g.fill();
    g.strokeStyle = 'rgba(90,50,20,0.5)'; g.lineWidth = 1; for (let i = -1; i <= 1; i++){ g.beginPath(); g.moveTo(-4 + i * 4, -5); g.lineTo(-1 + i * 4, 1); g.stroke(); }
    for (let i = 0; i < 3; i++){ g.fillStyle = i === 0 ? '#7ee07a' : '#c9d2d6'; g.fillRect(-8 + i * 6, 10, 4, 3); }
    if (b >= 1){ rr(g, 20, -10, 10, 16, 3); fillStroke(g, 'rgba(240,235,220,0.9)', '#8e9aa0', 1); g.fillStyle = '#e9dcb8'; g.fillRect(21, -2, 8, 7); if (b >= 3){ circle(g, 25, -16, 6); fillStroke(g, '#ffd166', '#b8861b', 1); g.fillStyle = '#7a5410'; g.font = '700 7px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 25, -15.5); } }
    if (c >= 3){ for (let i = 0; i < 5; i++){ g.fillStyle = i % 2 ? '#ffffff' : '#2a9d8f'; g.fillRect(-19 + i * 7.6, -24, 7.6, 6); } }
    if (c >= 2 && c < 3){ circle(g, -24, 12, 4); g.strokeStyle = '#2a2f33'; g.lineWidth = 1.4; g.stroke(); }
    for (let i = 0; i < 2; i++){ const sy = -20 - ((time * 12 + i * 10) % 18); circle(g, -6 + i * 10, sy, 2.4); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill(); }
  }

  /* ---------------- the second wave ---------------- */
  /* a star-cut carrot slice */
  function carrotStar(g, x, y, r, gold){
    star(g, x, y, r, gold ? '#ffd166' : '#f39a2e');
    circle(g, x, y, r * 0.36); g.fillStyle = gold ? '#fff4c2' : '#ffc46b'; g.fill();
  }
  /* the Mandoline: a slicer frame with a V blade, its hand guard at the back, slices ready at the front */
  function drawMandoline(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('mandoline', up, par), dark = shade(col, -0.45);
    const ninja = b >= 3 || par, gold = a >= 5 || par;
    g.strokeStyle = '#5c666b'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-13, -9); g.lineTo(-19, -14); g.moveTo(-13, 9); g.lineTo(-19, 14); g.stroke();
    rr(g, -15, -11, 28, 22, 4); fillStroke(g, col, dark, 1.5);
    rr(g, -12, -8, 22, 16, 3); g.fillStyle = ninja ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.35)'; g.fill();
    const steel = gold ? '#ffd166' : '#e6ecee';
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(40,48,52,0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-3, -8); g.lineTo(5, 0); g.lineTo(-3, 8); g.stroke();
    g.strokeStyle = steel; g.lineWidth = 1.8; g.stroke();
    if (a >= 4 || par){ g.fillStyle = steel; for (let i = -3; i <= 3; i++) g.fillRect(-9, i * 2.2 - 0.4, 5, 0.8); }
    else if (a >= 2){ g.fillStyle = 'rgba(230,236,238,0.8)'; for (let i = -1; i <= 1; i++) g.fillRect(-8, i * 3.2 - 0.4, 4, 0.8); }
    /* the hand guard */
    circle(g, -10, 0, 4); fillStroke(g, ninja ? '#26222e' : '#2a9d8f', '#1d2b33', 1);
    circle(g, -10.6, -0.6, 1.5); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
    /* Misdirection: a red headband with fluttering tails, then a bottle of soy for sabotage */
    if (b >= 1 && b < 3){ g.fillStyle = 'rgba(29,43,51,0.6)'; g.font = '700 8px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 9, -6.5); }
    if (ninja){
      const band = par ? '#ffd166' : '#d9332a';
      g.fillStyle = band; g.fillRect(1.5, -11, 3, 22);
      g.strokeStyle = band; g.lineWidth = 1.8;
      for (const s of [-1, 1]){ const w = Math.sin(time * 9 + s) * 2; g.beginPath(); g.moveTo(3, s * 11); g.quadraticCurveTo(-5, s * (15 + w), -13, s * (13 + w)); g.stroke(); }
    }
    if (b >= 4 || par){ rr(g, -7, 11.5, 6, 7, 2); fillStroke(g, '#3a2214', '#140a05', 0.8); rr(g, -5.5, 9.5, 3, 3, 1); g.fillStyle = '#d9332a'; g.fill(); }
    /* Wasabi: a lens, a bundle of toothpicks, a tube of wasabi, then sticky blobs */
    if (c >= 1 && c < 3){ circle(g, 8, -7, 2.3); fillStroke(g, '#bfe9ff', '#2a4a5a', 0.8); }
    if (c === 2){ g.strokeStyle = '#d9b77a'; g.lineWidth = 1.3; for (let i = 0; i < 3; i++){ g.beginPath(); g.moveTo(-5 + i * 3, -17); g.lineTo(-3 + i * 3, -11.5); g.stroke(); } }
    if (c >= 3 || par){ rr(g, -3, -18, 12, 6, 2.5); fillStroke(g, '#7ab648', '#3f6a1a', 0.9); rr(g, 8.5, -16.6, 3, 3.2, 1); g.fillStyle = '#e6ecee'; g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-1, -16.5, 6, 1); }
    if (c >= 4 || par){ for (let i = 0; i < (c >= 5 || par ? 3 : 2); i++){ circle(g, 4 + i * 5.5, 14, 2.6); fillStroke(g, '#8fd16a', '#3f6a1a', 0.7); } }
    /* what is ready to throw */
    if (!(t.fireAnim > 0)){
      const n = a >= 4 || par ? 3 : a >= 3 ? 2 : 1;
      for (let i = 0; i < n; i++) carrotStar(g, 16, (i - (n - 1) / 2) * 7.5, 3.7, gold);
    }
    if (par){ g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 1.6; rr(g, -15.5, -11.5, 29, 23, 4.5); g.stroke(); }
  }
  /* the Condiment Caddy: a wire caddy of squeeze bottles, its firing bottle pointing ahead */
  function drawCaddy(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('caddy', up, par), dark = shade(col, -0.45);
    const hot = a >= 5 || par, spin = t.fireAnim > 0 ? time * 18 : 0;
    circle(g, 0, 0, 14); fillStroke(g, col, dark, 1.6);
    circle(g, 0, 0, 10.5); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.stroke();
    if (a >= 3 && c < 3){
      /* a revolver cylinder of six bottles */
      for (let i = 0; i < 6; i++){ const an = i / 6 * TAU + spin; circle(g, Math.cos(an) * 7, Math.sin(an) * 7, 2.8); fillStroke(g, hot ? (i % 2 ? '#ff7a1a' : '#d9332a') : (i % 2 ? '#d9332a' : '#f2c230'), '#5a1a10', 0.7); }
    } else {
      const bs = c >= 3 ? ['#f2c230', '#d9332a', '#f2c230'] : ['#d9332a', '#f2c230', '#d9332a', '#f2c230'];
      bs.forEach((bc, i) => { const an = i / bs.length * TAU + 0.6; circle(g, Math.cos(an) * 6.5, Math.sin(an) * 6.5, 3.3); fillStroke(g, bc, shade(bc, -0.4), 0.8); circle(g, Math.cos(an) * 6.5 - 0.8, Math.sin(an) * 6.5 - 0.8, 1); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill(); });
    }
    g.strokeStyle = '#6b777c'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -12); g.lineTo(0, 12); g.stroke();
    if (c >= 3){
      /* a double-barrelled mustard shotgun */
      const sh = c >= 5 || par ? '#ff7a1a' : '#f2c230';
      for (const y of [-2.6, 2.6]){ rr(g, 4, y - 2, 18, 4, 1.5); fillStroke(g, sh, '#8a6a10', 0.8); circle(g, 22, y, 1.1); g.fillStyle = '#3a220e'; g.fill(); }
      rr(g, 1, -4.6, 7, 9.2, 2); fillStroke(g, '#7a4a20', '#3a220e', 0.8);
      if (c >= 4 || par){ g.fillStyle = '#f2c230'; for (let i = 0; i < 5; i++){ circle(g, -11 + i * 2.6, 11 - Math.abs(i - 2) * 0.8, 1.2); g.fill(); } }
    } else {
      const n = a >= 4 || par ? 2 : 1;
      for (let i = 0; i < n; i++){
        const y = n === 2 ? (i ? 4.2 : -4.2) : 0;
        rr(g, 2, y - 3.2, 13, 6.4, 2.6); fillStroke(g, hot ? '#ff7a1a' : '#d9332a', '#6a1410', 0.9);
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(4, y - 2.2, 8, 1);
        g.beginPath(); g.moveTo(15, y - 1.6); g.lineTo(21, y - 0.6); g.lineTo(21, y + 0.6); g.lineTo(15, y + 1.6); g.closePath(); fillStroke(g, '#f4efe6', '#8e9aa0', 0.7);
      }
      if (hot && !lowFx()){ for (let i = 0; i < 2; i++){ const k = (time * 2 + i * 0.5) % 1; circle(g, 22 + k * 4, Math.sin(time * 9 + i) * 2, 2.2 * (1 - k) + 0.4); g.fillStyle = 'rgba(255,170,60,' + (0.8 * (1 - k)) + ')'; g.fill(); } }
    }
    /* the sharpshooter: a scope, then a long rifle bottle and a sheriff's star */
    if (b >= 1){ rr(g, -4, -16.5, 10, 4, 2); fillStroke(g, '#2e3437', '#15191b', 0.8); circle(g, 6, -14.5, 1.6); g.fillStyle = '#7fd3ff'; g.fill(); }
    if (b >= 3 || par){ rr(g, -3, 8.5, 27, 3.2, 1.4); fillStroke(g, b >= 5 || par ? '#ffd166' : '#f2c230', '#8a6a10', 0.7); }
    if (b >= 4 || par) star(g, -10, -9, 3.8, '#ffd166');
    /* the shotgun path: a cowboy hat with a red band */
    if (c >= 1){ ell(g, -6, 0, 8, 6.5); fillStroke(g, c >= 5 ? '#3a2e2a' : '#8a5a2b', '#2a1a0a', 1); ell(g, -6, 0, 4.5, 3.6); fillStroke(g, c >= 5 ? '#4a3c36' : '#a06a35', '#2a1a0a', 0.8); if (c >= 2){ g.strokeStyle = '#d9332a'; g.lineWidth = 1.2; ell(g, -6, 0, 4.9, 4); g.stroke(); } }
    if ((c >= 5 || par) && !lowFx()){ for (let i = 0; i < 3; i++){ const k = (time * 0.7 + i * 0.33) % 1; circle(g, -15 - k * 8, Math.sin(time * 3 + i) * 6, 3 + k * 4); g.fillStyle = 'rgba(90,60,60,' + (0.35 * (1 - k)) + ')'; g.fill(); } }
    if (par){ g.strokeStyle = '#ffd166'; g.lineWidth = 2; circle(g, 0, 0, 14.5); g.stroke(); }
  }
  /* the Saucepan: a pot of bubbling vinegar with its handle out to the side; the sauce shows what it brews */
  function drawSaucepan(g, t, up, time, par){
    const [a, b, c] = up;
    const R = 14 + (a >= 1 || par ? 1.5 : 0), p = par ? -2 : dominant(up), tier = p >= 0 ? up[p] : 0;
    g.save(); g.rotate(2.45);
    rr(g, R - 3, -2.6, 16, 5.2, 2.4); fillStroke(g, par ? '#b8861b' : '#2e3437', '#15191b', 1);
    circle(g, R + 10, 0, 1.4); g.fillStyle = '#c9d2d6'; g.fill();
    g.restore();
    const potCol = par ? '#f2c14e' : bodyColor('saucepan', up, par);
    circle(g, 0, 0, R); fillStroke(g, potCol, par ? '#a57412' : shade(potCol, -0.5), 1.8);
    circle(g, 0, 0, R - 1.2); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.stroke();
    const sauce = par ? '#ffcf4d' : p === 0 ? (tier >= 5 ? '#b8501a' : tier >= 4 ? '#8a1a14' : '#d9332a') : p === 1 ? (tier >= 4 ? '#7bc043' : '#efd98a') : p === 2 ? (tier >= 5 ? '#9b6ad9' : '#e8b52a') : b >= 1 ? '#cfd96a' : '#e8d48a';
    circle(g, 0, 0, R - 3); g.fillStyle = sauce; g.fill();
    ell(g, -R * 0.3, -R * 0.35, R * 0.35, R * 0.15, -0.5); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fill();
    for (let i = 0; i < 4; i++){ const k = (time * 0.9 + i * 0.27) % 1, an = i * 1.9 + (t.id || 0); circle(g, Math.cos(an) * (R - 6) * 0.7, Math.sin(an) * (R - 6) * 0.7, 1 + k * 2.2); g.strokeStyle = 'rgba(255,255,255,' + (0.75 * (1 - k)) + ')'; g.lineWidth = 0.9; g.stroke(); }
    /* Brews: a dipping cup on the rim, then a chili, then ghost-pepper steam, then a golden ladle */
    if (a >= 2){ rr(g, R - 4, -R + 1, 7, 6, 2); fillStroke(g, '#f4efe6', '#9aa3a8', 0.8); ell(g, R - 0.5, -R + 2.2, 2.6, 0.9); g.fillStyle = '#d9332a'; g.fill(); }
    if (p === 0 && tier >= 3){ g.save(); g.translate(-3, 3); g.rotate(0.6); g.beginPath(); g.moveTo(-5, -1.6); g.quadraticCurveTo(2, -2.8, 6, 0.6); g.quadraticCurveTo(1, 2, -5, 1.6); g.closePath(); fillStroke(g, tier >= 4 ? '#5a0a0a' : '#e2231a', '#3a0a08', 0.6); g.fillStyle = '#4f9a45'; g.fillRect(-6.6, -1.2, 2, 2.4); g.restore(); }
    if ((p === 0 && tier >= 4) || par){ for (let i = 0; i < 3; i++){ const k = (time * 0.8 + i * 0.33) % 1; circle(g, -5 + i * 5 + Math.sin(time * 3 + i) * 2, -R - k * 14, 2.4 + k * 2.6); g.fillStyle = 'rgba(255,255,255,' + (0.4 * (1 - k)) + ')'; g.fill(); } }
    /* Reduction: pickles, a rising soufflé, then the monster's eyes */
    if (b >= 2 && !(p === 1 && tier >= 3)){ for (let i = 0; i < 2; i++){ ell(g, -4 + i * 7, 4 - i * 6, 2.8, 1.5, 0.5 + i); fillStroke(g, '#6f9f34', '#3f6a1a', 0.6); } }
    if (p === 1 && tier === 3){ const pu = 1 + Math.sin(time * 2) * 0.05; ell(g, 0, 0, (R - 5) * pu, (R - 6) * pu); fillStroke(g, '#f4d97a', '#c9a031', 0.9); ell(g, -2.5, -3, 3.5, 1.6, -0.4); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill(); }
    if (p === 1 && tier >= 4){
      const big = tier >= 5, ey = big ? 3.2 : 2.6;
      for (const s of [-1, 1]){ circle(g, s * 4, -2, ey); fillStroke(g, '#ffffff', '#2a4a14', 0.8); circle(g, s * 4 + Math.sin(time * 1.5) * 0.9, -1.6, ey * 0.45); g.fillStyle = '#1d2b14'; g.fill(); }
      if (big){ g.fillStyle = '#ffffff'; for (let i = -2; i <= 2; i++){ g.beginPath(); g.moveTo(i * 2.2 - 1, 4); g.lineTo(i * 2.2, 6.4); g.lineTo(i * 2.2 + 1, 4); g.closePath(); g.fill(); } }
    }
    /* Gold Leaf: a whisk, drips, gold flakes, a glaze, then a reduction potion */
    if (c >= 1){ g.save(); g.rotate(time * (c >= 1 ? 6 : 0)); g.strokeStyle = 'rgba(220,226,230,0.85)'; g.lineWidth = 1; for (let i = 0; i < 3; i++){ ell(g, 0, 0, 2.2 + i * 1.1, R - 6, i * 1.05); g.stroke(); } g.restore(); }
    if (c >= 2){ for (let i = 0; i < 3; i++){ const an = 0.4 + i * 0.5; ell(g, Math.cos(an) * (R + 1), Math.sin(an) * (R + 1) + 1.5, 1.8, 2.6, an); g.fillStyle = sauce; g.fill(); } }
    if (c >= 3 || par){ for (let i = 0; i < 5; i++){ const an = i * 1.3 + time * 0.6; g.save(); g.translate(Math.cos(an) * (R - 6), Math.sin(an) * (R - 6) * 0.8); g.rotate(an); g.fillStyle = i % 2 ? '#ffd166' : '#fff4c2'; g.fillRect(-1.6, -1, 3.2, 2); g.restore(); } }
    if (c >= 5){ rr(g, R - 1, 4, 6, 9, 2); fillStroke(g, 'rgba(155,106,217,0.9)', '#4a2a7a', 0.9); rr(g, R + 0.5, 1.5, 3, 3, 1); g.fillStyle = '#c9a36a'; g.fill(); }
    /* the ladle: resting in the pot, raised when it has just thrown */
    const up2 = t.fireAnim > 0;
    g.save(); g.rotate(up2 ? -0.9 : -0.2);
    g.strokeStyle = a >= 5 || par ? '#ffd166' : '#c9d2d6'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(up2 ? 2 : -2, 0); g.lineTo(up2 ? R + 8 : R + 4, up2 ? -6 : -3); g.stroke();
    circle(g, up2 ? 1 : -3, 0, 3.6); fillStroke(g, a >= 5 || par ? '#ffd166' : '#dfe7ea', '#6b777c', 0.8);
    g.restore();
    if (par){
      /* the Philosopher's Stone, glowing over the pot */
      const gl = 0.6 + Math.sin(time * 4) * 0.25;
      circle(g, 0, -2, 7); g.fillStyle = 'rgba(255,90,80,' + (0.25 * gl) + ')'; g.fill();
      g.beginPath(); g.moveTo(0, -7); g.lineTo(4, -2); g.lineTo(0, 3); g.lineTo(-4, -2); g.closePath(); fillStroke(g, '#e2231a', '#7a0a0a', 0.9);
      g.beginPath(); g.moveTo(0, -7); g.lineTo(1.6, -2); g.lineTo(0, 3); g.closePath(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
    }
  }
  /* the Kitchen Bot: a little robot on treads, a domed head with an antenna, its nail gun pointing ahead */
  function drawBot(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('bot', up, par), dark = shade(col, -0.45);
    const gold = par || a >= 5;
    /* treads */
    for (const y of [-12.5, 8.5]){ rr(g, -13, y, 24, 4, 2); fillStroke(g, '#2e3437', '#15191b', 0.8); g.fillStyle = '#596268'; for (let i = 0; i < 6; i++) g.fillRect(-11.5 + i * 4 + (time * 6 % 4), y + 1, 1.4, 2); }
    rr(g, -12, -10, 22, 20, 5); fillStroke(g, col, dark, 1.5);
    g.fillStyle = 'rgba(255,255,255,0.28)'; rr(g, -10, -8.5, 18, 5, 2.5); g.fill();
    /* the nail gun */
    const n = c >= 3 || par ? 2 : 1;
    for (let i = 0; i < n; i++){
      const y = n === 2 ? (i ? 3.4 : -3.4) : 0;
      rr(g, 4, y - 2.4, c >= 1 || par ? 16 : 13, 4.8, 1.6); fillStroke(g, gold ? '#ffd166' : '#5c666b', '#2e3437', 0.8);
      g.fillStyle = c >= 5 || par ? '#ffd166' : '#d9b77a'; g.fillRect(c >= 1 || par ? 18 : 15, y - 0.7, 4, 1.4);
    }
    /* the head */
    circle(g, -3, 0, 7); fillStroke(g, gold ? '#ffd166' : '#e6ecee', '#5c666b', 1.1);
    circle(g, -1, -2, 2); g.fillStyle = b >= 4 || par ? '#7fd3ff' : '#2a9d8f'; g.fill();
    circle(g, -1, 2, 2); g.fillStyle = b >= 4 || par ? '#7fd3ff' : '#2a9d8f'; g.fill();
    g.strokeStyle = '#5c666b'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-13, -5); g.stroke();
    circle(g, -13, -5, 1.8); g.fillStyle = gold ? '#ffd166' : Math.sin(time * 6) > 0 ? '#e2383f' : '#ff9a8a'; g.fill();
    /* Sentries: a salt shaker on its back, sprockets, then four shaker caps */
    if (a >= 1 && a < 4){ circle(g, -10, 7, 3.2); fillStroke(g, '#f4f7f8', '#9aa6ab', 0.8); circle(g, -10, 7, 1.6); g.fillStyle = '#c9d2d6'; g.fill(); }
    if (a >= 3){ g.save(); g.translate(5, -10); g.rotate(time * 4); for (let i = 0; i < 6; i++){ g.save(); g.rotate(i * TAU / 6); g.fillStyle = '#b8861b'; g.fillRect(-0.9, -4.6, 1.8, 2); g.restore(); } circle(g, 0, 0, 3.2); fillStroke(g, '#e0a32e', '#7a5410', 0.7); g.restore(); }
    if (a >= 4){ ['#f4f7f8', '#3d3a38', '#bfe9ff', '#ffd166'].forEach((cc, i) => { circle(g, -11 + (i % 2) * 5, 4 + Math.floor(i / 2) * 4.2, 2.1); fillStroke(g, cc, '#2e3437', 0.6); }); }
    /* Service: a wrench, then a tank of soap foam, then an overclock coil */
    if (b >= 1 && b < 3){ g.save(); g.translate(2, 8); g.rotate(0.3); g.fillStyle = '#9aa6ab'; g.fillRect(-5, -0.9, 9, 1.8); circle(g, 5, 0, 2); g.fill(); g.restore(); }
    if (b >= 3){ rr(g, -9, 10, 9, 6, 2.5); fillStroke(g, '#f4f7f8', '#9aa6ab', 0.8); for (let i = 0; i < 3; i++){ circle(g, -7 + i * 2.6, 9.6, 1.2 + (i % 2) * 0.4); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill(); } }
    if (b >= 4 || par){ g.strokeStyle = '#7fd3ff'; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i <= 6; i++){ const an = i / 6 * TAU + time * 3; g.lineTo(-3 + Math.cos(an) * (9 + (i % 2) * 2), Math.sin(an) * (9 + (i % 2) * 2)); } g.stroke(); }
    /* Traps: a cage on its back */
    if (c >= 4){ const s2 = c >= 5 ? 1.25 : 1; g.save(); g.translate(-9, -1); g.scale(s2, s2); rr(g, -4, -4.5, 7, 9, 1.5); fillStroke(g, 'rgba(60,70,76,0.3)', '#3d4549', 1); g.strokeStyle = '#8e9aa0'; g.lineWidth = 0.7; for (let i = 1; i < 3; i++){ g.beginPath(); g.moveTo(-4 + i * 2.3, -4.5); g.lineTo(-4 + i * 2.3, 4.5); g.stroke(); } g.restore(); }
    if (par){ g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 1.6; rr(g, -12.5, -10.5, 23, 21, 5.5); g.stroke(); }
  }
  /* a goldfish bowl, a cat or a bird, in or on the pet basket */
  function petFish(g, x, y, tier, time, gold){
    const R = tier >= 4 ? 7.5 : tier >= 3 ? 6.8 : 6;
    circle(g, x, y, R); fillStroke(g, 'rgba(140,205,240,0.75)', '#d9eef7', 1.2);
    const sw = Math.sin(time * 4) * 1.5;
    g.save(); g.translate(x + sw, y + 0.5);
    const fc = gold ? '#ffd166' : tier >= 4 ? '#7d8f9a' : tier >= 2 ? '#8a7a5a' : '#f39a2e';
    ell(g, 0, 0, tier >= 4 ? 4.6 : 3.4, tier >= 4 ? 2.2 : 2); g.fillStyle = fc; g.fill();
    g.beginPath(); g.moveTo(-3, 0); g.lineTo(-5.6, -2); g.lineTo(-5.6, 2); g.closePath(); g.fill();
    if (tier >= 4){ g.beginPath(); g.moveTo(-0.5, -2); g.lineTo(1, -4.4); g.lineTo(2, -1.8); g.closePath(); g.fill(); }
    if (tier >= 5 || gold){ g.strokeStyle = '#ffffff'; g.lineWidth = 0.7; g.beginPath(); for (let i = 0; i < 4; i++){ g.moveTo(2.2 + i * 0.7, 0.6); g.lineTo(2.5 + i * 0.7, 1.6); } g.stroke(); }
    circle(g, 2, -0.6, 0.6); g.fillStyle = '#1d2b33'; g.fill();
    g.restore();
    ell(g, x - R * 0.35, y - R * 0.4, R * 0.3, R * 0.14, -0.6); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
  }
  function petCat(g, x, y, tier, time, gold){
    const fur = gold ? '#ffd166' : tier >= 4 ? '#2a2630' : tier >= 2 ? '#c9853a' : '#e8a050', dk = shade(fur, -0.4);
    const s2 = tier >= 4 ? 1.2 : 1;
    g.save(); g.translate(x, y); g.scale(s2, s2);
    ell(g, 0, 1.5, 6.4, 4.6); fillStroke(g, fur, dk, 0.8);
    g.strokeStyle = fur; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(5, 3); g.quadraticCurveTo(8.5, 5 + Math.sin(time * 3) * 1.5, 7, 0); g.stroke();
    circle(g, -3.5, -2.2, 3.6); fillStroke(g, fur, dk, 0.8);
    for (const sx of [-1, 1]){ g.beginPath(); g.moveTo(-3.5 + sx * 1.2, -5); g.lineTo(-3.5 + sx * 3.2, -6.8); g.lineTo(-3.5 + sx * 3.2, -3.4); g.closePath(); g.fillStyle = fur; g.fill(); }
    if (tier >= 3 && tier < 4 && !gold){ g.strokeStyle = dk; g.lineWidth = 0.8; for (let i = 0; i < 3; i++){ g.beginPath(); g.moveTo(-1 + i * 2.2, -1.8); g.lineTo(0 + i * 2.2, 1.2); g.stroke(); } }
    for (const sx of [-1, 1]){ circle(g, -3.5 + sx * 1.3, -2.6, 0.7); g.fillStyle = tier >= 4 ? '#ffd166' : '#2e7d32'; g.fill(); }
    if (tier >= 5 || gold){ g.fillStyle = '#ffffff'; for (const sx of [-1, 1]){ g.beginPath(); g.moveTo(-3.5 + sx * 0.8, -0.6); g.lineTo(-3.5 + sx * 0.6, 2); g.lineTo(-3.5 + sx * 0.2, -0.6); g.closePath(); g.fill(); } }
    g.restore();
  }
  function petBird(g, x, y, tier, time, gold){
    const fe = gold ? '#ffd166' : tier >= 5 ? '#c96a2a' : tier >= 4 ? '#5a3a1e' : tier >= 3 ? '#8a5a2e' : tier >= 2 ? '#a08060' : '#9a7a5a';
    const s2 = tier >= 5 || gold ? 1.35 : tier >= 4 ? 1.15 : 1, flap = Math.sin(time * 5) * 0.25;
    g.save(); g.translate(x, y); g.scale(s2, s2);
    for (const sd of [-1, 1]){ g.save(); g.rotate(sd * (0.4 + flap)); ell(g, 0, sd * 4.4, 2.2, 5); g.fillStyle = shade(fe, -0.15); g.fill(); g.restore(); }
    ell(g, 0, 0, 5, 3.2); fillStroke(g, fe, shade(fe, -0.4), 0.8);
    circle(g, 4.2, 0, 2.6); g.fillStyle = tier >= 4 && !gold ? '#f4efe6' : fe; g.fill();
    g.beginPath(); g.moveTo(6.4, -0.8); g.lineTo(8.6, 0); g.lineTo(6.4, 0.8); g.closePath(); g.fillStyle = '#f2c230'; g.fill();
    circle(g, 4.8, -0.9, 0.6); g.fillStyle = '#1d2b33'; g.fill();
    if (tier === 2){ circle(g, 4.6, -1, 1.4); g.strokeStyle = '#f2c230'; g.lineWidth = 0.6; g.stroke(); }
    g.restore();
  }
  /* the Pet Basket: a wicker basket with a broom, its pets in and on it */
  function drawPets(g, t, up, time, par){
    const [a, b, c] = up;
    const col = par ? '#e8b52a' : bodyColor('pets', up, par), dark = shade(col, -0.45);
    /* the broom, leaning on it */
    g.save(); g.rotate(-0.7);
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-2, -12); g.lineTo(-2, -26); g.stroke();
    g.beginPath(); g.moveTo(-7, -26); g.lineTo(3, -26); g.lineTo(5, -34); g.lineTo(-9, -34); g.closePath(); fillStroke(g, '#e8c25a', '#a87a2a', 0.8);
    g.strokeStyle = 'rgba(168,122,42,0.8)'; g.lineWidth = 0.6; for (let i = 0; i < 5; i++){ g.beginPath(); g.moveTo(-6 + i * 2.4, -26); g.lineTo(-7.5 + i * 3, -34); g.stroke(); }
    g.restore();
    ell(g, 0, 0, 16, 13); fillStroke(g, col, dark, 1.5);
    /* the weave */
    g.save(); ell(g, 0, 0, 16, 13); g.clip();
    g.strokeStyle = shade(col, -0.25); g.lineWidth = 1;
    for (let y = -12; y <= 12; y += 3.4){ g.beginPath(); for (let x = -16; x <= 16; x += 2){ g.lineTo(x, y + Math.sin(x * 0.8 + y) * 0.8); } g.stroke(); }
    g.restore();
    ell(g, 0, 0, 12, 9.5); g.fillStyle = par ? '#a8272c' : '#c9363a'; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 6; i++){ circle(g, -8 + (i % 3) * 8, -3 + Math.floor(i / 3) * 6, 1); g.fill(); }
    const gold = par;
    if (a >= 1 || par) petFish(g, b >= 1 || c >= 1 || par ? -5 : 0, b >= 1 || c >= 1 || par ? 2.5 : 0, par ? 5 : a, time, gold);
    if (b >= 1 || par) petCat(g, a >= 1 || par ? 5 : 1, a >= 1 || par ? -1 : 1, par ? 5 : b, time, gold);
    if (c >= 1 || par) petBird(g, 9, -10, par ? 5 : c, time, gold);
    if (a === 0 && b === 0 && c === 0 && !par){ ell(g, 2, 2, 6, 4, 0.4); g.fillStyle = '#f4efe6'; g.fill(); }
    if (par){ g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 1.8; ell(g, 0, 0, 16.5, 13.5); g.stroke(); }
  }
  /* the Lobster Tank: a glass tank of water, the lobster's big claw pointing ahead with a fork in it */
  function drawLobster(g, t, up, time, par){
    const [a, b, c] = up;
    const water = par ? '#3a6aa8' : a >= 3 ? (a >= 4 ? '#3a2a6a' : '#2a4a7a') : b >= 3 ? '#9fd8f0' : '#6fbfe0';
    rr(g, -15, -15, 30, 30, 5); fillStroke(g, par ? 'rgba(255,209,102,0.55)' : 'rgba(200,235,248,0.7)', par ? '#a57412' : '#5c7a88', 1.6);
    rr(g, -12.5, -12.5, 25, 25, 3.5); g.fillStyle = water; g.fill();
    /* gravel and a few bubbles */
    g.fillStyle = 'rgba(240,220,180,0.7)'; for (let i = 0; i < 6; i++){ circle(g, -10 + i * 4, 10 + (i % 2), 1.2); g.fill(); }
    for (let i = 0; i < 3; i++){ const k = (time * 0.8 + i * 0.33) % 1; circle(g, -8 + i * 6, 10 - k * 20, 0.8 + k); g.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)).toFixed(3) + ')'; g.lineWidth = 0.7; g.stroke(); }
    /* the abyss: tentacles curling up from the depths, then an eye */
    if (a >= 3 || par){
      g.strokeStyle = a >= 4 || par ? '#b06ad9' : '#d98ad9'; g.lineWidth = 2.2; g.lineCap = 'round';
      for (let i = 0; i < 3; i++){ const x0 = -9 + i * 7, w = Math.sin(time * 2 + i) * 3; g.beginPath(); g.moveTo(x0, 12); g.quadraticCurveTo(x0 + w, 2, x0 + 3 + w, -6); g.stroke(); }
      if (a >= 5 || par){ ell(g, -6, 7, 3.4, 2.4); fillStroke(g, '#ffd166', '#5a2a7a', 0.8); ell(g, -6, 7, 1, 2); g.fillStyle = '#1d1030'; g.fill(); }
    }
    /* ice water: ice cubes */
    if (b >= 2){ for (const [x, y] of [[-8, -8], [7, 8]]){ rr(g, x - 2.5, y - 2.5, 5, 5, 1); fillStroke(g, 'rgba(230,248,255,0.9)', '#9fd3e8', 0.7); } }
    /* the lobster */
    const red = par ? '#ffcf4d' : '#e2463a', dk = par ? '#a57412' : '#8a1a14';
    for (let i = 1; i <= 3; i++){ ell(g, -4 - i * 3.4, 0, 2.6 - i * 0.25, 3.6 - i * 0.4); fillStroke(g, red, dk, 0.7); }
    g.beginPath(); g.moveTo(-14, -3); g.lineTo(-17, 0); g.lineTo(-14, 3); g.closePath(); g.fillStyle = red; g.fill();
    ell(g, -1, 0, 5.4, 4.4); fillStroke(g, red, dk, 0.9);
    g.strokeStyle = dk; g.lineWidth = 0.8; for (const sd of [-1, 1]) for (let i = 0; i < 3; i++){ g.beginPath(); g.moveTo(-3 + i * 2, sd * 3.6); g.lineTo(-4 + i * 2, sd * 6.5); g.stroke(); }
    g.strokeStyle = red; g.lineWidth = 0.7; for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(3, sd * 1.2); g.quadraticCurveTo(9, sd * 4, 12, sd * 9); g.stroke(); }
    for (const sd of [-1, 1]){ circle(g, 3.2, sd * 1.6, 0.8); g.fillStyle = '#1d2b33'; g.fill(); }
    /* the claws: the big one holds a fork, unless it was just thrown */
    for (const sd of [-1, 1]){
      const big = sd > 0;
      g.save(); g.translate(3, sd * 4); g.rotate(sd * 0.35);
      g.strokeStyle = red; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(5, 0); g.stroke();
      ell(g, 8, 0, big ? 4 : 3, big ? 2.6 : 2); fillStroke(g, red, dk, 0.8);
      g.restore();
    }
    if (!(t.fireAnim > 0)){ g.strokeStyle = b >= 4 || par ? '#bfe9ff' : '#dfe7ea'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(9, 5); g.lineTo(19, 5); g.moveTo(17, 3.6); g.lineTo(19.5, 3.6); g.moveTo(17, 5); g.lineTo(19.5, 5); g.moveTo(17, 6.4); g.lineTo(19.5, 6.4); g.stroke(); }
    /* ice water: a frosty crown, then arctic armor */
    if (b >= 3 && b < 4){ g.fillStyle = '#e6f6ff'; for (let i = -1; i <= 1; i++){ g.beginPath(); g.moveTo(-1 + i * 2.2, -3); g.lineTo(i * 2.2, -6.5); g.lineTo(1 + i * 2.2, -3); g.closePath(); g.fill(); } }
    if (b >= 4){ ell(g, -1, 0, 5.8, 4.8); g.strokeStyle = b >= 5 ? '#ffd166' : '#bfe9ff'; g.lineWidth = 1.6; g.stroke(); }
    /* the siren: sonar rings, a conch, notes */
    if (c >= 1 && !lowFx()){ const k = (time * 0.6) % 1; circle(g, 0, 0, 6 + k * 12); g.strokeStyle = 'rgba(255,170,200,' + (0.6 * (1 - k)).toFixed(3) + ')'; g.lineWidth = 1; g.stroke(); }
    if (c >= 3){ g.save(); g.translate(8, -9); g.rotate(-0.4); g.beginPath(); g.moveTo(-4, 0); g.quadraticCurveTo(0, -4, 4, -1); g.quadraticCurveTo(1, 3, -4, 0); fillStroke(g, c >= 5 ? '#ffd166' : '#ffd6e4', '#c96a8a', 0.8); g.restore(); }
    if (c >= 4) musicNote(g, -9, -8 + Math.sin(time * 3) * 1.5, 0.9, c >= 5 ? '#ffd166' : '#ff8fc7');
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-12, -12); g.lineTo(-6, -12); g.stroke();
  }
  function plateTop(g, x, y, r, kind){
    const silver = kind === 'silver';
    circle(g, x, y, r); fillStroke(g, silver ? '#dfe7ea' : '#ffffff', silver ? '#6f7b80' : '#9aa6ab', 1);
    circle(g, x, y, r * 0.64); g.fillStyle = silver ? '#f1f5f6' : '#f3eee4'; g.fill(); g.strokeStyle = silver ? 'rgba(110,120,125,0.6)' : 'rgba(160,166,170,0.75)'; g.lineWidth = 0.8; g.stroke();
    if (kind === 'platter'){ circle(g, x, y, r * 0.83); g.strokeStyle = '#4f86c6'; g.lineWidth = Math.max(1, r * 0.12); g.stroke(); }
  }
  function drawDish(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('dish', up, par);
    rr(g, -18, -18, 36, 36, 6); fillStroke(g, col, shade(col, -0.42), 1.6);
    g.fillStyle = 'rgba(255,255,255,0.3)'; rr(g, -16, -16, 32, 6, 3); g.fill();
    g.fillStyle = '#2a2f33'; rr(g, -14, 11, 28, 5, 2); g.fill();
    for (let i = 0; i < 3; i++){ circle(g, -8 + i * 5, 13.5, 1.1); g.fillStyle = i === 0 ? '#7ee07a' : i === 1 && t.fireAnim > 0 ? '#ffd166' : '#8e9aa0'; g.fill(); }
    circle(g, 0, -2, 11.5); g.fillStyle = c >= 3 ? 'rgba(200,170,210,0.75)' : 'rgba(46,72,86,0.7)'; g.fill();
    t._spin = (t._spin || 0) + (t.fireAnim > 0 ? 0.45 : 0.06) * SPIN_K;
    g.save(); g.translate(0, -2); g.rotate(t._spin);
    rr(g, -10, -1.7, 20, 3.4, 1.7); fillStroke(g, '#e4ebee', '#6b777c', 0.7);
    for (const sd of [-1, 1]){ circle(g, sd * 8, 0, 1.1); g.fillStyle = '#7fd3ff'; g.fill(); }
    g.restore();
    circle(g, 0, -2, 2.3); g.fillStyle = '#6b777c'; g.fill();
    if (t.fireAnim > 0){ for (let i = 0; i < 6; i++){ const an = t._spin * 2 + i; circle(g, Math.cos(an) * 8, -2 + Math.sin(an) * 8, 1); g.fillStyle = 'rgba(190,235,255,0.9)'; g.fill(); } }
    // plates waiting on the rack
    const kind = a >= 5 ? 'silver' : a >= 3 ? 'platter' : 'plate';
    const np = a >= 4 ? 3 : a >= 1 ? 2 : 1;
    for (let i = 0; i < np; i++) plateTop(g, 13 - i * 1.5, -13 + i * 2.5, kind === 'plate' ? 5 : 6.5, kind);
    if (a >= 5 || par){ g.beginPath(); g.arc(13, -9, 6, Math.PI, TAU); g.closePath(); fillStroke(g, '#dfe7ea', '#7f8b90', 1); circle(g, 13, -15.5, 1.4); g.fillStyle = '#7f8b90'; g.fill(); }
    if (c >= 1){ const n = c >= 5 ? 8 : c >= 3 ? 5 : 3; for (let i = 0; i < n; i++){ const an = time * 0.9 + i * TAU / n, r = 21 + Math.sin(time * 2.2 + i) * 3; circle(g, Math.cos(an) * r, Math.sin(an) * r, 2.2 + (i % 3) * 0.7); g.strokeStyle = c >= 5 ? 'hsla(' + ((time * 90 + i * 45) % 360) + ',80%,75%,0.9)' : 'rgba(200,240,255,0.9)'; g.lineWidth = 1; g.stroke(); } }
    if (c >= 2){ rr(g, -21, 6, 7, 11, 2); fillStroke(g, '#f2a7c8', '#a34d78', 0.9); g.fillStyle = '#a34d78'; g.fillRect(-19.5, 4, 4, 2.5); }
    if (b >= 1){
      g.save(); g.rotate((t.aim2 != null ? t.aim2 : -Math.PI / 2) - (t.rotNow || 0));
      const L = b >= 5 ? 26 : b >= 3 ? 22 : 18;
      rr(g, 2, -2.5, L, 5, 2); fillStroke(g, '#4b565b', '#22282b', 1);
      rr(g, L, -3.5, 5, 7, 1.5); fillStroke(g, '#f2c14e', '#9c6a14', 0.8);
      if (b >= 3){ rr(g, -3, -5, 9, 10, 2.5); fillStroke(g, '#f2c14e', '#9c6a14', 1); }
      if (b >= 5){ circle(g, -2, 0, 6); fillStroke(g, '#e2383f', '#8e1d22', 1); circle(g, -2, 0, 2.2); g.fillStyle = '#fff'; g.fill(); }
      g.restore();
    }
    if (par){ g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 2; rr(g, -19, -19, 38, 38, 7); g.stroke(); }
  }
  function drawFryer(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('fryer', up, par);
    const inferno = a >= 5 || par;
    if (inferno){ for (let i = 0; i < 6; i++){ const fx = -15 + i * 6, hh = 5 + Math.sin(time * 11 + i * 1.7) * 2; g.beginPath(); g.moveTo(fx - 3, 16); g.quadraticCurveTo(fx, 17 + hh * 1.5, fx + 3, 16); g.closePath(); g.fillStyle = i % 2 ? 'rgba(255,200,80,0.9)' : 'rgba(255,128,48,0.9)'; g.fill(); } }
    rr(g, -19, -18, 38, 35, 6); fillStroke(g, col, shade(col, -0.45), 1.6);
    g.fillStyle = 'rgba(255,255,255,0.32)'; rr(g, -17, -16, 34, 3.5, 1.75); g.fill();
    rr(g, -16, -13, 32, 23, 4); g.fillStyle = '#4b565b'; g.fill();
    const og = g.createLinearGradient(0, -12, 0, 9);
    og.addColorStop(0, inferno ? '#ee9a2a' : a >= 3 ? '#eab042' : '#f0c862'); og.addColorStop(1, inferno ? '#a5520e' : a >= 3 ? '#b87a1e' : '#c99632');
    rr(g, -14.5, -11.5, 29, 20, 3); g.fillStyle = og; g.fill();
    const nb = inferno ? 11 : a >= 3 ? 8 : 5;
    for (let i = 0; i < nb; i++){ const k = (time * (0.8 + (i % 3) * 0.3) + i * 0.37) % 1; circle(g, -12 + ((i * 7.3) % 24), 6 - k * 15, 0.6 + k * 1.5); g.fillStyle = 'rgba(255,246,206,' + (0.9 - k * 0.6) + ')'; g.fill(); }
    ell(g, -8, -9, 5, 1.3, -0.1); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill();
    const lift = b >= 3 && !(t.fire2 > 0);
    const bx = -3, by = lift ? -5 : -2;
    g.save(); g.translate(bx, by);
    if (lift){ g.fillStyle = 'rgba(0,0,0,0.25)'; rr(g, -7, -4, 16, 13, 2.5); g.fill(); }
    rr(g, -8, -6, 16, 13, 2.5); g.fillStyle = 'rgba(60,66,70,0.28)'; g.fill();
    if (lift){ for (let i = 0; i < 6; i++){ g.save(); g.translate(-4.5 + (i % 3) * 4.5, -2.5 + Math.floor(i / 3) * 5); g.rotate(i * 0.9); rr(g, -3, -1, 6, 2.2, 1); g.fillStyle = b >= 5 ? '#e8a23c' : '#f2c14e'; g.fill(); g.restore(); } }
    g.strokeStyle = 'rgba(45,50,54,0.85)'; g.lineWidth = 0.6; g.beginPath();
    for (let k = -4.8; k <= 4.8; k += 3.2){ g.moveTo(k, -6); g.lineTo(k, 7); }
    for (let k = -2.8; k <= 5; k += 3.2){ g.moveTo(-8, k); g.lineTo(8, k); }
    g.stroke();
    g.strokeStyle = '#3a4246'; g.lineWidth = 1.2; rr(g, -8, -6, 16, 13, 2.5); g.stroke();
    if (!lift){ rr(g, -8, 0, 16, 7, 2); g.fillStyle = inferno ? 'rgba(200,110,25,0.6)' : 'rgba(210,150,45,0.6)'; g.fill(); }
    if (lift){ for (let i = 0; i < 2; i++){ const k = (time * 1.6 + i * 0.5) % 1; circle(g, -3 + i * 6, 8 + k * 6, 1); g.fillStyle = 'rgba(240,190,80,' + (1 - k) + ')'; g.fill(); } }
    g.restore();
    g.strokeStyle = '#9aa6ab'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(bx + 6, by + 6); g.lineTo(12, 15); g.stroke();
    g.save(); g.translate(12, 15); g.rotate(-0.55); rr(g, -1.9, 0, 3.8, 9, 1.9); fillStroke(g, '#1f1f22', '#000', 0.5); g.restore();
    const on = Math.sin(time * 3) > -0.3;
    circle(g, -14, 13.5, 1.5); g.fillStyle = on ? '#ff5a4e' : '#8e2a24'; g.fill();
    circle(g, -8.5, 13.5, 2.1); fillStroke(g, '#2a2f33', '#000', 0.6); g.strokeStyle = '#e8eef0'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-8.5, 13.5); g.lineTo(-8.5 + Math.cos(-1 + a * 0.4) * 1.8, 13.5 + Math.sin(-1 + a * 0.4) * 1.8); g.stroke();
    if (c >= 1){
      g.save(); g.translate(-24, 2);
      if (c >= 5){ circle(g, 0, 0, 8); fillStroke(g, '#e8b96a', '#9a6a2a', 1); g.strokeStyle = '#b8803a'; g.lineWidth = 1.2; for (let i = 0; i < 5; i++){ g.beginPath(); g.arc(Math.cos(i * 1.3) * 3, Math.sin(i * 1.3) * 3, 3, i, i + 4); g.stroke(); } for (let i = 0; i < 6; i++){ circle(g, Math.cos(i) * 5, Math.sin(i * 1.7) * 5, 0.8); g.fillStyle = '#fff'; g.fill(); } }
      else if (c >= 4){ for (let i = 0; i < 3; i++){ g.save(); g.rotate(-0.4 + i * 0.4); rr(g, -1.6, -9, 3.2, 14, 1.6); fillStroke(g, '#c98a45', '#7a4a20', 0.7); g.restore(); } }
      else if (c >= 3){ circle(g, 0, 0, 6.5); fillStroke(g, '#d9a066', '#8a5a2b', 1); circle(g, 0, 0, 5); g.fillStyle = '#f29ac0'; g.fill(); circle(g, 0, 0, 2.2); g.fillStyle = '#d9a066'; g.fill(); for (let i = 0; i < 5; i++){ g.fillStyle = ['#7ee07a', '#ffd166', '#5aa6d6'][i % 3]; g.fillRect(Math.cos(i * 1.4) * 3.6 - 0.6, Math.sin(i * 1.4) * 3.6 - 0.6, 1.4, 1.4); } }
      else { for (let i = 0; i < 5; i++){ rr(g, -4 + i * 2, -8 + (i % 2) * 2, 1.8, 8, 0.8); g.fillStyle = '#f2c14e'; g.fill(); } g.fillStyle = '#e2383f'; g.beginPath(); g.moveTo(-5, -2); g.lineTo(5, -2); g.lineTo(4, 7); g.lineTo(-4, 7); g.closePath(); g.fill(); g.fillStyle = '#ffd166'; g.fillRect(-1.5, 1, 3, 3); }
      g.restore();
    }
    if (par){ g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 2; rr(g, -20, -19, 40, 37, 7); g.stroke(); }
  }
  function pizzaTop(g, r, big){
    circle(g, 0, 0, r); fillStroke(g, '#e0a956', '#9a6a2a', 1);
    circle(g, 0, 0, r * 0.8); g.fillStyle = '#d9462e'; g.fill();
    circle(g, 0, 0, r * 0.72); g.fillStyle = '#f6d66b'; g.fill();
    const n = big ? 7 : 4;
    for (let i = 0; i < n; i++){ const an = i / n * TAU + 0.4, rr2 = r * (i % 2 ? 0.42 : 0.5); circle(g, Math.cos(an) * rr2, Math.sin(an) * rr2, r * 0.13); g.fillStyle = '#b8322a'; g.fill(); }
    circle(g, r * 0.1, -r * 0.12, r * 0.08); g.fillStyle = '#4a8c3a'; g.fill();
  }
  function drawOven(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('oven', up, par);
    rr(g, -21, -19, 42, 39, 6); fillStroke(g, '#9aa0a4', '#4b565b', 1.4);
    if (b >= 2){ for (let i = 0; i < 3; i++){ rr(g, -25, -14 + i * 5, 10, 4.5, 2); fillStroke(g, '#8a5a2b', '#4a2c12', 0.7); circle(g, -15, -11.8 + i * 5, 1.6); g.fillStyle = '#d9a066'; g.fill(); } }
    circle(g, 0, -2, 17); fillStroke(g, col, shade(col, -0.45), 1.6);
    g.strokeStyle = shade(col, -0.28); g.lineWidth = 0.8;
    for (const r of [6.5, 12]){ circle(g, 0, -2, r); g.stroke(); }
    g.beginPath();
    for (let i = 0; i < 12; i++){ const an = i / 12 * TAU + (i % 2) * 0.2; g.moveTo(Math.cos(an) * 6.5, -2 + Math.sin(an) * 6.5); g.lineTo(Math.cos(an) * 12, -2 + Math.sin(an) * 12); const an2 = an + 0.26; g.moveTo(Math.cos(an2) * 12, -2 + Math.sin(an2) * 12); g.lineTo(Math.cos(an2) * 17, -2 + Math.sin(an2) * 17); }
    g.stroke();
    ell(g, -5, -9, 6, 3, -0.5); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill();
    const fl = 0.6 + Math.sin(time * 9) * 0.2 + (t.fireAnim > 0 ? 0.3 : 0);
    g.beginPath(); g.arc(0, 15, 8.5, Math.PI, TAU); g.closePath(); g.fillStyle = '#2a1a12'; g.fill();
    g.beginPath(); g.arc(0, 15, 6.5, Math.PI, TAU); g.closePath(); g.fillStyle = 'rgba(255,' + (120 + fl * 80 | 0) + ',40,' + clamp(fl, 0, 1) + ')'; g.fill();
    if (b >= 3){ for (let i = 0; i < 3; i++){ const fx = -4 + i * 4, hh = 4 + Math.sin(time * 13 + i) * 1.5; g.beginPath(); g.moveTo(fx - 2, 15); g.quadraticCurveTo(fx, 15 - hh * 1.4, fx + 2, 15); g.closePath(); g.fillStyle = 'rgba(255,220,100,0.95)'; g.fill(); } }
    circle(g, 7, -14, 3.6); fillStroke(g, '#5a5f63', '#2a2f33', 1);
    circle(g, 7, -14, 1.8); g.fillStyle = '#1a1c1e'; g.fill();
    const ux = -Math.sin(t.rotNow || 0), uy = -Math.cos(t.rotNow || 0);
    for (let i = 0; i < 3; i++){ const k = (time * 0.6 + i / 3) % 1, rise = 2 + k * 18, side = Math.sin(time * 1.5 + i) * 3; circle(g, 7 + ux * rise - uy * side, -14 + uy * rise + ux * side, 2 + k * 3); g.fillStyle = b >= 5 ? 'rgba(255,170,90,' + (0.5 * (1 - k)) + ')' : 'rgba(225,225,225,' + (0.45 * (1 - k)) + ')'; g.fill(); }
    if (a >= 1){
      g.save(); g.translate(0, 20);
      rr(g, -2, 2, 4, 9, 1.5); fillStroke(g, '#8a5a2b', '#4a2c12', 0.6);
      circle(g, 0, 0, a >= 5 ? 8 : 6.5); fillStroke(g, '#c99a5c', '#7a5428', 0.8);
      g.save(); g.scale(a >= 5 ? 1 : 0.85, a >= 5 ? 1 : 0.85); pizzaTop(g, 6.5, a >= 3); g.restore();
      g.restore();
    }
    if (c >= 1){
      g.save(); g.translate(19, 9);
      if (c >= 3){ for (let i = 0; i < (c >= 5 ? 3 : 2); i++){ rr(g, -6, -6 - i * 3, 12, 12, 1.5); fillStroke(g, '#f4efe6', '#9a948a', 0.8); } g.fillStyle = '#e2383f'; g.fillRect(-4, -4 - (c >= 5 ? 6 : 3), 8, 3); }
      else { circle(g, 0, 0, 4.5); fillStroke(g, '#dfe7ea', '#7f8b90', 1); g.strokeStyle = '#7f8b90'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-4.5, 0); g.lineTo(4.5, 0); g.moveTo(0, -4.5); g.lineTo(0, 4.5); g.stroke(); rr(g, -1, 4, 2, 7, 1); g.fillStyle = '#1f1f22'; g.fill(); }
      g.restore();
    }
    if (par){ g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 2; circle(g, 0, -2, 19); g.stroke(); }
  }
  /* a stand mixer seen from above: the bowl in front (+y), the motor head reaching over it from the column at the back.
     It turns like a turret, bowl first, and flings chips out of the bowl. */
  function drawMixer(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('mixer', up, par);
    const dark = shade(col, -0.45);
    const busy = t.fireAnim > 0 || t.fire2 > 0;
    t._spin = (t._spin || 0) + (busy ? 0.55 : 0.12) * SPIN_K;
    if (a >= 5 || par){ g.save(); g.rotate(-t._spin * 0.5); for (let i = 0; i < 3; i++){ g.strokeStyle = 'rgba(120,150,175,' + (0.55 - i * 0.12) + ')'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 2, 21 + i * 3.5, i * 2.1, i * 2.1 + 2.2); g.stroke(); } g.restore(); }
    else if (a >= 3){ g.save(); g.translate(0, 4); g.rotate(-t._spin * 0.4); g.strokeStyle = 'rgba(150,175,195,0.5)'; g.lineWidth = 1.8; g.lineCap = 'round'; for (let i = 0; i < 2; i++){ g.beginPath(); g.arc(0, 0, 18 + i * 3, i * 3.1, i * 3.1 + 1.9); g.stroke(); } g.restore(); }
    /* a temper rising: a hot glow that swells with its frenzy, and fire once it's furious */
    if (c >= 3 || (par && t.sys && t.sys.over)){
      const fz = par ? 1 : clamp((t.wrathN || 0) / 20, 0, 1), hot = c >= 5 || par;
      const R0 = 22 + fz * 6 + Math.sin(time * 9) * 1.2;
      const gr = g.createRadialGradient(0, 0, 8, 0, 0, R0);
      gr.addColorStop(0, 'rgba(255,120,60,0)'); gr.addColorStop(0.7, 'rgba(255,110,60,' + (0.12 + fz * 0.3).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(226,56,63,0)');
      g.fillStyle = gr; circle(g, 0, 0, R0); g.fill();
      if (hot && !lowFx()) for (let i = 0; i < 6; i++){
        const an = i / 6 * TAU + time * 0.8, ph = (time * 2.2 + i * 0.37) % 1, rr0 = 18 + ph * 6;
        const fx = Math.cos(an) * rr0, fy = Math.sin(an) * rr0, hgt = (6 + fz * 5) * (1 - ph);
        g.beginPath(); g.moveTo(fx - 2.6, fy); g.quadraticCurveTo(fx, fy - hgt * 1.5, fx + 2.6, fy); g.closePath();
        g.fillStyle = 'rgba(255,' + (110 + Math.round(ph * 80)) + ',60,' + (0.75 * (1 - ph)).toFixed(3) + ')'; g.fill();
      }
    }
    /* the foot under it all */
    rr(g, -12, -21, 24, 31, 9); fillStroke(g, col, dark, 1.3);
    /* bitter batter: puffs of steam off the top */
    if (c >= 2 && !lowFx()) for (let i = 0; i < 2; i++){ const ph = (time * 0.9 + i * 0.5) % 1; circle(g, -6 + i * 12 + Math.sin(time * 2 + i) * 2, -22 - ph * 12, 2 + ph * 3); g.fillStyle = 'rgba(255,255,255,' + (0.45 * (1 - ph)).toFixed(3) + ')'; g.fill(); }
    /* the bowl, with batter going round and chips in it */
    const attach = b >= 3 && b >= a && b >= c ? 'hook' : c >= 2 && c > a ? 'paddle' : 'whisk';
    circle(g, 0, 7, 13.5); fillStroke(g, '#dfe7ea', '#7f8b90', 1.2);
    circle(g, 0, 7, 11.2); g.fillStyle = '#b9c4c9'; g.fill();
    if (attach === 'hook'){ circle(g, 0, 7.5, b >= 4 ? 9.5 : 8.2); fillStroke(g, b >= 5 || par ? '#f6d98a' : '#f3e1b8', '#c9a46a', 0.9); g.strokeStyle = 'rgba(201,164,106,0.7)'; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 7.5, 5, t._spin, t._spin + 3.4); g.stroke(); }
    else {
      circle(g, 0, 7, 10); g.fillStyle = a >= 2 ? '#fff8e8' : '#f8e7bf'; g.fill();
      g.strokeStyle = 'rgba(200,160,90,0.55)'; g.lineWidth = 0.9; g.lineCap = 'round';
      for (let i = 0; i < 3; i++){ g.beginPath(); g.arc(0, 7, 3 + i * 2.4, t._spin * 0.8 + i * 2.1, t._spin * 0.8 + i * 2.1 + 2.2); g.stroke(); }
      const nch = b >= 1 ? 8 : 5;
      for (let i = 0; i < nch; i++){ const an = i * 2.4 + t._spin * 0.8, r = 3 + (i % 3) * 2.2; ell(g, Math.cos(an) * r, 7 + Math.sin(an) * r, 1.3, 1.05, an); g.fillStyle = '#5a341b'; g.fill(); }
    }
    /* the attachment turning under the head's nose */
    g.save(); g.translate(0, 9);
    g.strokeStyle = '#7f8b90'; g.lineCap = 'round';
    if (attach === 'whisk'){
      const nw = a >= 1 ? 6 : 4; g.lineWidth = 0.9;
      for (let k = 0; k < nw; k++){ g.save(); g.rotate(t._spin + k * Math.PI / nw); ell(g, 0, 0, 6.5, 1.6); g.stroke(); g.restore(); }
    } else if (attach === 'hook'){
      g.rotate(t._spin); g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(6, 0.5, 6, 4); g.quadraticCurveTo(5.5, 7, 2.5, 6); g.stroke();
    } else {
      g.rotate(t._spin); g.beginPath(); g.moveTo(-6, -1.5); g.lineTo(6, -1.5); g.lineTo(4, 2); g.lineTo(-4, 2); g.closePath(); fillStroke(g, '#e8eef0', '#6b777c', 0.8);
    }
    g.restore();
    /* sparks off an electric whisk */
    if (a >= 2){ for (let i = 0; i < 3; i++){ const k = (time * 3 + i * 0.33) % 1; if (k > 0.5) continue; const an = i * 2.1 + Math.floor(time * 3 + i * 0.33) * 1.7; const r0 = 12, x = Math.cos(an) * r0, y = 7 + Math.sin(an) * r0; g.strokeStyle = 'rgba(255,224,102,' + (1 - k * 2) + ')'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * 3 + 1.5, y + Math.sin(an) * 3 - 1); g.lineTo(x + Math.cos(an) * 5.5, y + Math.sin(an) * 5.5); g.stroke(); } }
    /* the motor head, reaching from the column over the bowl */
    g.beginPath();
    g.moveTo(0, -22);
    g.bezierCurveTo(6.2, -22, 8.6, -18, 8.6, -12);
    g.lineTo(7.2, 0.5);
    g.bezierCurveTo(6.6, 6.5, 3.6, 8.6, 0, 8.6);
    g.bezierCurveTo(-3.6, 8.6, -6.6, 6.5, -7.2, 0.5);
    g.lineTo(-8.6, -12);
    g.bezierCurveTo(-8.6, -18, -6.2, -22, 0, -22);
    g.closePath(); fillStroke(g, col, dark, 1.4);
    ell(g, -3.4, -9, 2, 8.5, 0.05); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fill();
    g.strokeStyle = shade(col, -0.25); g.lineWidth = 0.9; g.lineCap = 'round';
    g.beginPath(); for (const y of [-18.5, -16.5, -14.5]){ g.moveTo(-3.5, y); g.lineTo(3.5, y); } g.stroke();
    rr(g, 8, -13.5, 4, 2.4, 1.2); fillStroke(g, '#dfe7ea', '#6b777c', 0.7);
    circle(g, 0, 3.4, 3.2); fillStroke(g, '#dfe7ea', '#6b777c', 1);
    circle(g, 0, 3.4, 1.3); g.fillStyle = '#9aa6ab'; g.fill();
    if (c >= 4 || par){ g.strokeStyle = 'rgba(255,209,102,0.85)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-6.4, -4); g.lineTo(6.4, -4); g.stroke(); }
    /* a dollop of thunder meringue on top of the head, crackling */
    if (a >= 4 && !par){
      g.save(); g.translate(0, -13);
      for (let i = 0; i < 3; i++){ circle(g, 0, -i * 1.7, 3.8 - i * 1.05); fillStroke(g, '#fffaf0', '#cfc6b4', 0.7); }
      g.strokeStyle = 'rgba(255,224,102,' + (0.55 + 0.45 * Math.sin(time * 13)).toFixed(3) + ')'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(3, -2); g.lineTo(5.6, -3.6); g.lineTo(4.8, -1.2); g.lineTo(7.4, -2.6); g.stroke();
      g.beginPath(); g.moveTo(-3, -1); g.lineTo(-5.6, -2.8); g.lineTo(-4.6, -0.4); g.lineTo(-7.2, -1.4); g.stroke();
      g.restore();
    }
    /* the dough hook's reach: a stretchy rope toward whatever it holds */
    if (b >= 3){ g.save(); g.translate(0, 3); g.rotate((t.aim2 != null ? t.aim2 : 0.6) - (t.rotNow || 0)); g.strokeStyle = '#d9c08a'; g.lineWidth = b >= 4 ? 3.2 : 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(6, 0); g.quadraticCurveTo(13, -4, 19, 0); g.stroke(); circle(g, 20, 0, b >= 4 ? 3.2 : 2.4); g.fillStyle = '#f3e1b8'; g.fill(); g.restore(); }
    if (b >= 2){ rr(g, -11.5, -24, 7, 6, 2); fillStroke(g, 'rgba(240,235,220,0.95)', '#9a8f7a', 0.8); g.fillStyle = '#e9d6a6'; g.fillRect(-10.5, -21.5, 5, 2.8); }
    if (par){ g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 2; circle(g, 0, 0, 23); g.stroke(); }
  }
  function drawPasta(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('pasta', up, par);
    t._crank = (t._crank || 0) + (t.fireAnim > 0 ? 0.35 : 0.025) * SPIN_K;
    // pasta coming out of the rollers
    if (b >= 3 || par){ g.save(); g.translate(0, 12); rr(g, -9, 0, 18, 10 + Math.sin(time * 3) * 1.5, 1.5); fillStroke(g, '#f0d27a', '#b8903a', 0.8); g.strokeStyle = '#b8903a'; g.lineWidth = 0.8; g.beginPath(); for (let x = -9; x <= 9; x += 3) g.lineTo(x, 10 + ((x / 3) % 2 ? 1.5 : 0) + Math.sin(time * 3) * 1.5); g.stroke(); if (b >= 5 || par){ g.fillStyle = '#c9363a'; g.fillRect(-7, 3, 14, 2.5); } g.restore(); }
    else { const n = a >= 5 ? 8 : a >= 3 ? 6 : 4; g.strokeStyle = a >= 5 ? '#e6c25a' : '#f0d27a'; g.lineWidth = a >= 5 ? 2 : 1.4; g.lineCap = 'round'; for (let i = 0; i < n; i++){ const x = -8 + i * (16 / (n - 1)); g.beginPath(); g.moveTo(x, 10); g.quadraticCurveTo(x + Math.sin(time * 3 + i) * 3, 16, x + Math.sin(time * 2 + i * 1.7) * 2, 21 + (i % 2) * 2); g.stroke(); } }
    rr(g, -16, -15, 32, 27, 4); fillStroke(g, col, shade(col, -0.45), 1.5);
    g.fillStyle = 'rgba(255,255,255,0.4)'; rr(g, -14, -13, 28, 4, 2); g.fill();
    rr(g, -12, -5, 24, 12, 3); g.fillStyle = '#4b565b'; g.fill();
    for (const y of [-3.5, 1.5]){ rr(g, -11, y, 22, 4, 2); g.fillStyle = '#e4ebee'; g.fill(); g.strokeStyle = 'rgba(100,110,115,0.6)'; g.lineWidth = 0.6; g.beginPath(); for (let x = -9; x < 11; x += 2.5){ const xx = x + ((t._crank * 6) % 2.5); g.moveTo(xx, y + 0.5); g.lineTo(xx, y + 3.5); } g.stroke(); }
    g.save(); g.translate(17, -2); g.rotate(t._crank);
    g.fillStyle = '#6b777c'; g.fillRect(-1, -1, 10, 2); circle(g, 0, 0, 2.6); fillStroke(g, '#dfe7ea', '#6b777c', 0.8);
    rr(g, 7.5, -3, 4, 6, 2); fillStroke(g, '#c9363a', '#7a1d22', 0.8);
    g.restore();
    rr(g, -21, -10, 6, 12, 1.5); fillStroke(g, '#8e9aa0', '#4b565b', 0.8);
    if (c >= 2){ for (let i = 0; i < (c >= 5 ? 4 : c >= 3 ? 3 : 2); i++){ g.save(); g.translate(-13 + i * 7, -21); g.rotate(0.2 * i); rr(g, -3, -3, 6, 6, 1); fillStroke(g, c >= 4 ? '#e8b445' : '#f2d48a', '#a87a2a', 0.8); g.strokeStyle = 'rgba(168,122,42,0.8)'; g.lineWidth = 0.5; rr(g, -2, -2, 4, 4, 0.5); g.stroke(); g.restore(); } }
    if (a >= 3 && b < 3){ circle(g, -20, 12, 5); fillStroke(g, '#f0d27a', '#b8903a', 0.8); g.strokeStyle = '#d9b450'; g.lineWidth = 0.8; for (let i = 0; i < 3; i++){ g.beginPath(); g.arc(-20, 12, 1.5 + i * 1.2, i, i + 4); g.stroke(); } }
    if (par){ g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 2; rr(g, -17, -16, 34, 29, 5); g.stroke(); }
  }
  function drawGatling(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('gatling', up, par);
    const firing = t.fireAnim > 0;
    /* spice-jar turrets keep their own facing */
    if (c >= 4 || par){
      g.save(); g.rotate(-(t.rotNow || 0));
      for (let i = 0; i < 4; i++){
        const an = i / 4 * TAU + Math.PI / 4, x = Math.cos(an) * 17, y = Math.sin(an) * 17, aim = an + Math.sin(time * 2 + i) * 0.6;
        g.save(); g.translate(x, y); g.rotate(aim);
        rr(g, 0, -1.4, 7.5, 2.8, 1.2); g.fillStyle = '#6b777c'; g.fill();
        circle(g, 0, 0, 4.4); fillStroke(g, c >= 5 || par ? '#ffd166' : '#e9e2d0', '#8e9aa0', 1);
        circle(g, 0, 0, 2.2); g.fillStyle = ['#c9363a', '#7ab648', '#f2c14e', '#7b4b2a'][i]; g.fill();
        g.restore();
      }
      g.restore();
    }
    /* popcorn rocket pods on the sides */
    if (b >= 3 || par){
      for (const sd of [-1, 1]){
        rr(g, -7, sd * 15 - 4.5, 17, 9, 3); fillStroke(g, b >= 5 || par ? '#ffd166' : '#e9e2d0', '#8e9aa0', 1);
        for (let k = 0; k < 2; k++){ circle(g, 11, sd * 15 - 2 + k * 4, 2.2); g.fillStyle = '#fff6da'; g.fill(); }
      }
      if (b >= 5 || par){ rr(g, -14, -4, 12, 8, 4); fillStroke(g, '#c99a5c', '#7a5428', 1); circle(g, -2, 0, 3.4); g.fillStyle = '#fff1c6'; g.fill(); }
    }
    /* the spinning barrels */
    const beam = a >= 4 || par, len = beam ? 27 : a >= 3 ? 24 : 21;
    const spin = time * (firing ? 30 : 5);
    const bars = [0, 1, 2].map(i => [Math.sin(spin + i * TAU / 3), Math.cos(spin + i * TAU / 3)]).sort((p, q) => p[1] - q[1]);
    for (const [s, dz] of bars){
      rr(g, 6, s * 4.4 - 1.9, len - 6, 3.8, 1.7);
      g.fillStyle = beam ? (dz > 0 ? '#ff7a4d' : '#a83a22') : dz > 0 ? '#d6dde0' : '#8e9aa0'; g.fill();
    }
    rr(g, len - 4, -6.5, 4.5, 13, 2); fillStroke(g, beam ? '#5a1d12' : '#6b777c', '#2e3437', 0.8);
    if (c >= 3 && !beam){ g.beginPath(); g.moveTo(len, -6.5); g.lineTo(len + 5, -9); g.lineTo(len + 5, 9); g.lineTo(len, 6.5); g.closePath(); fillStroke(g, '#8e9aa0', '#4b555a', 0.8); }
    if (a >= 2 || par){
      const glow = beam ? 6 + Math.sin(time * 9) * 1.2 : 3.6;
      circle(g, len + 1, 0, glow); g.fillStyle = a >= 5 || par ? 'rgba(255,60,20,0.75)' : 'rgba(255,110,50,0.55)'; g.fill();
    }
    /* the mill */
    circle(g, 0, 0, 13); fillStroke(g, col, shade(col, -0.42), 1.6);
    circle(g, 0, 0, 9.5); g.fillStyle = shade(col, 0.14); g.fill();
    for (let i = 0; i < 8; i++){ const an = i / 8 * TAU; g.strokeStyle = shade(col, -0.25); g.lineWidth = 1; g.beginPath(); g.moveTo(Math.cos(an) * 9.5, Math.sin(an) * 9.5); g.lineTo(Math.cos(an) * 13, Math.sin(an) * 13); g.stroke(); }
    circle(g, -1, 0, 4.6); fillStroke(g, '#3d2a1e', '#1d130c', 1);
    g.save(); g.translate(-1, 0); g.rotate(time * (firing ? 14 : 1.5));
    rr(g, -1, -1.1, 9, 2.2, 1); g.fillStyle = '#c9d2d6'; g.fill();
    circle(g, 8, 0, 2); g.fillStyle = a >= 2 || par ? '#ff5a2a' : '#e2383f'; g.fill();
    g.restore();
    if (par){ g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 2; circle(g, 0, 0, 15); g.stroke(); }
  }
  /* ---------------- water and air appliances ---------------- */
  /* a gravy-boat hull, spout to the front (+x) */
  function hullPath(g, L, Wd){
    g.beginPath();
    g.moveTo(L, 0);
    g.quadraticCurveTo(L * 0.55, -Wd * 0.7, L * 0.05, -Wd);
    g.bezierCurveTo(-L * 0.5, -Wd * 1.1, -L * 0.92, -Wd * 0.88, -L * 0.92, 0);
    g.bezierCurveTo(-L * 0.92, Wd * 0.88, -L * 0.5, Wd * 1.1, L * 0.05, Wd);
    g.quadraticCurveTo(L * 0.55, Wd * 0.7, L, 0);
    g.closePath();
  }
  function meatball(g, r){
    circle(g, 0, 0, r); fillStroke(g, '#8a4a2a', '#4f2614', Math.max(0.8, r * 0.14));
    g.fillStyle = 'rgba(70,30,14,0.55)';
    for (const [x, y, s] of [[-0.35, 0.2, 0.22], [0.3, -0.25, 0.18], [0.2, 0.42, 0.16]]){ circle(g, x * r, y * r, s * r); g.fill(); }
    ell(g, -r * 0.3, -r * 0.35, r * 0.34, r * 0.2, -0.6); g.fillStyle = 'rgba(255,220,190,0.45)'; g.fill();
    ell(g, r * 0.25, r * 0.05, r * 0.32, r * 0.18, 0.4); g.fillStyle = 'rgba(200,40,30,0.55)'; g.fill();
  }
  function flag(g, x, y, col, time, emblem){
    g.save(); g.translate(x, y);
    circle(g, 0, 0, 1.6); g.fillStyle = '#5a3a1e'; g.fill();
    const w = Math.sin(time * 5 + x) * 1.6;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-11, -2 + w * 0.3); g.quadraticCurveTo(-7, 2 + w, -12, 6 + w * 0.5); g.lineTo(0, 4); g.closePath();
    fillStroke(g, col, shade(col, -0.45), 0.8);
    if (emblem === 'bones'){ g.strokeStyle = '#f4efe6'; g.lineWidth = 1; g.beginPath(); g.moveTo(-8, 0); g.lineTo(-3, 4); g.moveTo(-8, 4); g.lineTo(-3, 0); g.stroke(); circle(g, -5.5, 2, 1.2); g.fillStyle = '#f4efe6'; g.fill(); }
    else if (emblem === 'coin'){ circle(g, -5.5, 2.2, 2); g.fillStyle = '#ffd166'; g.fill(); }
    g.restore();
  }
  function drawBoat(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('boat', up, par);
    const gold = par || a >= 5 || c >= 5;
    const trim = gold ? '#e7b53a' : b >= 4 ? '#2e3437' : '#4f86c6';
    const L = 24, Wd = 12.5;
    g.lineCap = 'round';
    for (const [lw, cc] of [[4.8, shade(col, -0.45)], [2.6, col]]){ g.strokeStyle = cc; g.lineWidth = lw; g.beginPath(); g.ellipse(-L * 0.9, 0, 7, 8, 0, Math.PI * 0.5, Math.PI * 1.5); g.stroke(); }
    hullPath(g, L, Wd); fillStroke(g, col, shade(col, -0.45), 1.6);
    g.fillStyle = 'rgba(255,255,255,0.35)'; ell(g, -6, -Wd * 0.72, 9, 2.2, -0.08); g.fill();
    hullPath(g, L * 0.86, Wd * 0.8); g.strokeStyle = trim; g.lineWidth = 1.4; g.stroke();
    /* the gravy, or a flight deck */
    g.save(); g.translate(-1.5, 0);
    hullPath(g, L * 0.72, Wd * 0.64); g.fillStyle = a >= 4 ? '#6b777c' : '#8a5a2b'; g.fill();
    g.restore();
    if (a >= 4){
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1; g.setLineDash([3, 2.5]); g.beginPath(); g.moveTo(-14, 0); g.lineTo(12, 0); g.stroke(); g.setLineDash([]);
      g.strokeStyle = '#ffd166'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-14, -3.5); g.lineTo(8, -3.5); g.moveTo(-14, 3.5); g.lineTo(8, 3.5); g.stroke();
    } else { ell(g, -5, -3, 6.5, 1.8, -0.12); g.fillStyle = 'rgba(255,230,190,0.4)'; g.fill(); circle(g, 4, 3, 1.1); g.fillStyle = 'rgba(255,240,210,0.5)'; g.fill(); }
    /* grapes */
    if (b >= 1 && b < 3 || (b >= 3 && a < 3 && c < 3)){
      const gc = b >= 2 ? '#8a2f4f' : '#6f3a8f';
      for (const [x, y] of [[-10, -6.5], [-7.4, -7.4], [-8.8, -4.4], [-6.2, -4.8]]){ circle(g, x, y, 2.1); fillStroke(g, gc, '#3b1a4f', 0.6); }
      if (b >= 2){ circle(g, -8.2, -6, 4.6); g.strokeStyle = 'rgba(255,140,60,' + (0.35 + Math.sin(time * 7) * 0.15) + ')'; g.lineWidth = 1.2; g.stroke(); }
    }
    /* cargo */
    if (c >= 3){
      for (const [x, y] of [[-12, 4.5], [-6.5, 6]]){ rr(g, x - 2.6, y - 2.6, 5.2, 5.2, 0.8); fillStroke(g, '#b98a50', '#6f5234', 0.7); g.strokeStyle = 'rgba(80,55,30,0.6)'; g.beginPath(); g.moveTo(x - 2.6, y); g.lineTo(x + 2.6, y); g.stroke(); }
      if (c >= 4){ for (let i = 0; i < 3; i++){ ell(g, -9, -5.5 + i * -1.1, 2.6, 1.2); fillStroke(g, '#ffd166', '#a57412', 0.5); } }
    }
    /* crow's nest */
    if (c >= 2){ circle(g, -1, 0, 4.4); fillStroke(g, '#9a6534', '#5e3714', 0.9); circle(g, -1, 0, 2.2); g.fillStyle = '#6e4320'; g.fill(); }
    /* meatball cannon */
    if (b >= 3){
      g.save(); g.translate(1, 8);
      rr(g, -2, -2.3, 14, 4.6, 1.6); fillStroke(g, '#2e3437', '#111', 0.8);
      circle(g, -2, 0, 3.2); fillStroke(g, '#4b555a', '#1d2124', 0.8);
      if (t.fireAnim <= 0){ g.translate(12.5, 0); meatball(g, 2.4); }
      g.restore();
    }
    /* destroyer turret */
    if (a >= 3){
      const tx = a >= 4 ? 13 : 7;
      rr(g, tx, -1.5, 12, 3, 1.2); g.fillStyle = '#4b555a'; g.fill();
      if (a >= 4){ rr(g, tx, 1.6, 10, 2.4, 1); g.fill(); }
      circle(g, tx, 0, 4.6); fillStroke(g, gold ? '#ffd166' : '#8e9aa0', '#4b555a', 1);
      circle(g, tx - 0.8, -1, 1.4); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
    }
    if (b >= 4) flag(g, -15, 0, b >= 5 ? '#c9363a' : '#1d2124', time, 'bones');
    else if (a >= 5 || par) flag(g, -15, 0, '#ffd166', time, null);
    else if (c >= 4) flag(g, -15, 0, '#2a9d8f', time, 'coin');
    if (par){ hullPath(g, L + 3, Wd + 3); g.strokeStyle = 'rgba(255,209,102,0.85)'; g.lineWidth = 2; g.stroke(); }
  }
  function drawSub(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('sub', up, par);
    const under = !t.icon && t.s && t.s.submerged;
    g.save();
    if (under) g.globalAlpha *= 0.86;
    /* propeller */
    g.save(); g.translate(-23, 0); g.rotate(time * 14);
    for (let i = 0; i < 3; i++){ g.rotate(TAU / 3); ell(g, 0, 3, 1.6, 3.2); g.fillStyle = '#c9a227'; g.fill(); }
    g.restore();
    /* lettuce frills and cheese poking out of the roll */
    g.fillStyle = '#7ab648';
    for (const sd of [-1, 1]){
      g.beginPath(); g.moveTo(-17, sd * 7);
      for (let i = 0; i <= 10; i++){ const x = -17 + i * 3.4; g.lineTo(x, sd * (10.6 + (i % 2) * 1.8)); }
      g.lineTo(17, sd * 7); g.closePath(); g.fill();
    }
    g.fillStyle = '#f2c14e';
    for (const [x, sd] of [[-9, -1], [6, 1], [12, -1]]){ g.beginPath(); g.moveTo(x - 3, sd * 8); g.lineTo(x, sd * 12.5); g.lineTo(x + 3, sd * 8); g.closePath(); g.fill(); }
    if (b >= 2){ g.fillStyle = '#d9462e'; for (const [x, sd] of [[-2, 1], [1, -1]]){ ell(g, x, sd * 10.6, 3.4, 1.6); g.fill(); } }
    /* the roll */
    rr(g, -22, -9, 44, 18, 9); fillStroke(g, col, shade(col, -0.42), 1.5);
    g.fillStyle = 'rgba(255,255,255,0.22)'; rr(g, -18, -7.5, 34, 4.5, 2.2); g.fill();
    g.strokeStyle = shade(col, -0.3); g.lineWidth = 1; g.beginPath(); g.moveTo(-17, 1.5); g.quadraticCurveTo(0, 3.5, 17, 1.5); g.stroke();
    g.fillStyle = '#fff6da';
    for (const [x, y, r] of [[-14, -4, 0.3], [-8, 4.5, -0.4], [9, -4.2, 0.6], [15, 3.8, 0.2], [-2, -5, 0.1]]){ ell(g, x, y, 1.4, 0.7, r); g.fill(); }
    /* guns at the bow */
    if (c >= 1){
      const n = c >= 3 ? 3 : 2;
      for (let i = 0; i < n; i++){ const y = n === 3 ? (i - 1) * 4.6 : (i ? 3.4 : -3.4); rr(g, 16, y - 1.6, 9, 3.2, 1.4); fillStroke(g, c >= 4 ? '#8e9aa0' : '#5f8f2a', c >= 4 ? '#4b555a' : '#3f6a1a', 0.7); }
    }
    /* missile hatch */
    if (b >= 3){
      const n = b >= 5 ? 3 : b >= 4 ? 2 : 1;
      for (let i = 0; i < n; i++){ const x = -15 + i * 5.2; rr(g, x - 2, -2.6, 4, 5.2, 1.4); fillStroke(g, '#f2c230', '#a8801a', 0.7); circle(g, x, -2.4, 1.1); g.fillStyle = '#c9363a'; g.fill(); }
    }
    /* conning tower: an olive on a toothpick */
    circle(g, 3, 0, 5); fillStroke(g, '#4f6a1f', '#2d3e10', 1);
    circle(g, 4.2, 0, 1.8); g.fillStyle = '#d6322f'; g.fill();
    if (a >= 1){ g.strokeStyle = '#d9b77a'; g.lineWidth = 1.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(3, 0); g.lineTo(11, 0); g.stroke(); circle(g, 11.5, 0, 1.5); g.fillStyle = a >= 2 ? '#7fd3ff' : '#9fb3b8'; g.fill(); }
    if (c >= 5 || par){ star(g, 3, 0, 3, '#ffd166'); }
    if (par){ rr(g, -24, -11, 48, 22, 11); g.strokeStyle = 'rgba(255,209,102,0.85)'; g.lineWidth = 2; g.stroke(); }
    g.restore();
    if (under){
      rr(g, -23, -10, 46, 20, 10); g.fillStyle = 'rgba(90,175,230,0.2)'; g.fill();
      for (let i = 0; i < 3; i++){ const k = (time * 0.7 + i / 3) % 1; circle(g, -14 + i * 12, -6 - k * 8, 1 + k * 1.5); g.strokeStyle = 'rgba(230,248,255,' + (1 - k) * 0.8 + ')'; g.lineWidth = 0.8; g.stroke(); }
    }
    /* the brine reactor glows through the water */
    if (a >= 4 || par){
      const pulse = 0.5 + Math.sin(time * 8) * 0.25;
      circle(g, -9, 0, 4.4); g.fillStyle = 'rgba(155,225,93,' + (0.55 + pulse * 0.4).toFixed(3) + ')'; g.fill();
      circle(g, -9, 0, 2.1); g.fillStyle = a >= 5 || par ? '#fff7a8' : '#e2ffc0'; g.fill();
      if (a >= 5 || par){ g.strokeStyle = 'rgba(200,255,140,' + pulse.toFixed(3) + ')'; g.lineWidth = 1.2; circle(g, -9, 0, 6.5 + pulse * 2); g.stroke(); }
    }
  }
  /* a whisk seen from above: wire loops crossing at the hub */
  function whiskRotor(g, R, ang, n, col, alpha){
    g.save(); g.rotate(ang); g.globalAlpha *= alpha;
    g.lineWidth = 1.2;
    for (let i = 0; i < n; i++){
      g.save(); g.rotate(i / n * Math.PI);
      g.beginPath(); g.ellipse(0, 0, R, R * 0.12, 0, 0, TAU);
      g.strokeStyle = 'rgba(40,50,56,0.45)'; g.lineWidth = 2.6; g.stroke();
      g.strokeStyle = col; g.lineWidth = 1.2; g.stroke();
      g.restore();
    }
    g.restore();
  }
  function drawHeli(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('heli', up, par);
    const chinook = b >= 4 || par;
    /* tail boom, fin and tail rotor */
    rr(g, -31, -2.4, 24, 4.8, 2.4); fillStroke(g, shade(col, -0.12), shade(col, -0.5), 1);
    rr(g, -33, -1.4, 6, 2.8, 1); g.fillStyle = shade(col, -0.35); g.fill();
    if (!chinook){ g.save(); g.translate(-30, 5); g.rotate(time * 30); g.strokeStyle = 'rgba(220,228,232,0.9)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-4, 0); g.lineTo(4, 0); g.stroke(); g.restore(); }
    /* skids */
    g.strokeStyle = '#3d4549'; g.lineWidth = 1.5; g.lineCap = 'round';
    for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(-9, sd * 10.5); g.lineTo(10, sd * 10.5); g.stroke(); }
    /* stub wings with chili rockets */
    if (a >= 4 || par){
      rr(g, -5, -15, 7, 30, 2); fillStroke(g, shade(col, -0.2), shade(col, -0.5), 1);
      for (const sd of [-1, 1]){ g.save(); g.translate(1, sd * 13); g.beginPath(); g.moveTo(-6, -1.6); g.quadraticCurveTo(2, -3, 7, 0); g.quadraticCurveTo(2, 3, -6, 1.6); g.closePath(); fillStroke(g, '#d9332a', '#8a1a14', 0.7); g.fillStyle = '#4f9a45'; g.fillRect(-7.5, -1.2, 2, 2.4); g.restore(); }
    } else if (a >= 1){
      for (const sd of [-1, 1]){ rr(g, -2, sd * 12.5 - 1.8, 12, 3.6, 1.6); fillStroke(g, '#6b777c', '#3d4549', 0.8); }
    }
    /* jet exhausts */
    if (b >= 1){ for (const sd of [-1, 1]){ circle(g, -10, sd * 5, 2.4); fillStroke(g, '#4b555a', '#2e3437', 0.7); circle(g, -11.5, sd * 5, 1.4); g.fillStyle = 'rgba(255,160,60,' + (0.5 + Math.sin(time * 20 + sd) * 0.3) + ')'; g.fill(); } }
    /* cabin */
    ell(g, 0, 0, 14.5, 10); fillStroke(g, col, shade(col, -0.45), 1.5);
    if (b >= 5 || par){ g.fillStyle = 'rgba(40,50,30,0.35)'; for (const [x, y, r] of [[-6, -4, 3], [2, 5, 2.6], [-2, 1, 2]]){ circle(g, x, y, r); g.fill(); } }
    ell(g, 6, 0, 7.5, 6.5); g.fillStyle = b >= 2 ? '#7ee07a' : '#9fd3ef'; g.fill();
    ell(g, 7.5, -2.2, 3.4, 1.6, -0.3); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
    if (c >= 3){ g.beginPath(); g.moveTo(13, -7); g.lineTo(17, -4); g.lineTo(17, 4); g.lineTo(13, 7); g.closePath(); fillStroke(g, '#5c666b', '#2e3437', 0.9); }
    if (a >= 4 || par){ rr(g, 12, -1.3, 10, 2.6, 1); g.fillStyle = '#2e3437'; g.fill(); }
    if (c >= 5 || a >= 5 || par){ g.strokeStyle = '#ffd166'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-12, 0); g.lineTo(-4, 0); g.stroke(); }
    /* rotors: whisks */
    const spin = t.icon ? 0.35 : time * 24, rc = a >= 3 || par ? '#bfe3ff' : '#f2f5f6';
    const hubs = chinook ? [9, -19] : [-1], R = chinook ? 21 : 24;
    for (const hx of hubs){
      g.save(); g.translate(hx, 0);
      if (!t.icon){ circle(g, 0, 0, R); g.fillStyle = 'rgba(235,242,246,0.16)'; g.fill(); g.strokeStyle = 'rgba(235,242,246,0.35)'; g.lineWidth = 1; g.stroke(); }
      whiskRotor(g, R, spin + hx, 2, rc, t.icon ? 0.95 : 0.7);
      circle(g, 0, 0, 3.4); fillStroke(g, a >= 3 || par ? '#9fd3ef' : '#c9d2d6', '#5c666b', 1);
      g.restore();
    }
    if (par){ ell(g, 0, 0, 17, 12.5); g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 2; g.stroke(); }
  }
  function drawSaucer(g, t, up, time, par){
    const [a, b, c] = up;
    const col = bodyColor('saucer', up, par);
    const R = 19, spin = t.icon ? 0.3 : time * 0.9;
    g.save(); g.rotate(spin);
    /* the saucer */
    if (a >= 5 || par){ for (let i = 0; i < 16; i++){ const an = i / 16 * TAU; g.beginPath(); g.moveTo(Math.cos(an - 0.12) * R, Math.sin(an - 0.12) * R); g.lineTo(Math.cos(an) * (R + 4.5), Math.sin(an) * (R + 4.5)); g.lineTo(Math.cos(an + 0.12) * R, Math.sin(an + 0.12) * R); g.fillStyle = SPRINKLES[i % 6]; g.fill(); } }
    circle(g, 0, 0, R); fillStroke(g, '#f6f3ec', '#9fb0b6', 1.4);
    const band = par || c >= 5 ? '#e7b53a' : b >= 4 ? (b >= 5 ? '#ff6fb5' : '#e8d24a') : '#4f86c6';
    circle(g, 0, 0, R - 3.6); g.strokeStyle = band; g.lineWidth = 1.8; g.stroke();
    for (let i = 0; i < 12; i++){ const an = i / 12 * TAU; circle(g, Math.cos(an) * (R - 3.6), Math.sin(an) * (R - 3.6), 0.9); g.fillStyle = '#ffffff'; g.fill(); }
    /* rim lights */
    const n = a >= 4 || par ? 12 : 8;
    for (let i = 0; i < n; i++){
      const an = i / n * TAU + 0.13, on = Math.sin(time * 6 + i * 1.7) > -0.2;
      circle(g, Math.cos(an) * (R - 7.5), Math.sin(an) * (R - 7.5), 1.5); g.fillStyle = on ? SPRINKLES[i % 6] : 'rgba(120,130,135,0.5)'; g.fill();
    }
    /* turrets, fins and bomb hatches on the rim */
    if (c >= 4 || par){
      const k = c >= 5 || par ? 4 : 2;
      for (let i = 0; i < k; i++){ const an = i / k * TAU + Math.PI / 4; g.save(); g.translate(Math.cos(an) * (R - 2), Math.sin(an) * (R - 2)); g.rotate(an); rr(g, 0, -1.2, 7, 2.4, 1); g.fillStyle = '#4b555a'; g.fill(); circle(g, 0, 0, 3); fillStroke(g, c >= 5 || par ? '#ffd166' : '#c9d2d6', '#5c666b', 0.8); g.restore(); }
    }
    if (a >= 3){ for (const sd of [-1, 1]){ g.save(); g.rotate(sd > 0 ? 0 : Math.PI); ell(g, R + 1, 0, 4.5, 2.4); fillStroke(g, '#ff6fb5', '#b03a78', 0.8); g.restore(); } }
    if (b >= 1){ for (let i = 0; i < (b >= 3 ? 3 : 1); i++){ const an = Math.PI / 2 + (i - (b >= 3 ? 1 : 0)) * 0.55; g.save(); g.translate(Math.cos(an) * (R - 10.5), Math.sin(an) * (R - 10.5)); meatball(g, 2.4); g.restore(); } }
    g.restore();
    /* the teacup dome (it doesn't spin) */
    circle(g, 0, 0, 9.5); fillStroke(g, col, shade(col, -0.42), 1.3);
    circle(g, 0, 0, 6.6); g.fillStyle = shade(col, 0.22); g.fill();
    circle(g, 0, 0, 6.6); g.strokeStyle = shade(col, -0.2); g.lineWidth = 0.8; g.stroke();
    g.lineCap = 'round';
    g.strokeStyle = shade(col, -0.42); g.lineWidth = 3.4; g.beginPath(); g.ellipse(10.4, 0, 3.4, 4.2, 0, -Math.PI / 2, Math.PI / 2); g.stroke();
    g.strokeStyle = col; g.lineWidth = 1.8; g.beginPath(); g.ellipse(10.4, 0, 3.4, 4.2, 0, -Math.PI / 2, Math.PI / 2); g.stroke();
    ell(g, -2.8, -3.2, 3, 1.5, -0.6); g.fillStyle = 'rgba(255,255,255,0.65)'; g.fill();
    if (b >= 2 || c >= 2){ circle(g, 0, 0, 2.2); g.fillStyle = b >= 2 ? '#7ee07a' : '#7fd3ff'; g.fill(); }
    if (par){ circle(g, 0, 0, R + 2); g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 2; g.stroke(); }
  }
  /* landing pads for aircraft: a trivet helipad or a cork coaster */
  function drawPad(g, t, kind, time, opt, up){
    const R = t.size * 1.05;
    g.save(); g.translate(t.x, t.y);
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, 2.5, 3.5, R * 1.04, R * 0.9); g.fill();
    if (kind === 'saucer'){
      circle(g, 0, 0, R); fillStroke(g, '#c99a62', '#8a6236', 1.5);
      g.fillStyle = 'rgba(110,70,30,0.35)';
      for (let i = 0; i < 14; i++){ const an = i * 2.4, rr2 = R * (0.2 + (i % 5) * 0.16); circle(g, Math.cos(an) * rr2, Math.sin(an) * rr2, 0.9); g.fill(); }
      circle(g, 0, 0, R * 0.62); g.strokeStyle = 'rgba(255,240,210,0.75)'; g.lineWidth = 1.4; g.setLineDash([3, 3]); g.stroke(); g.setLineDash([]);
      circle(g, 0, 0, 2.4); g.fillStyle = 'rgba(255,240,210,0.85)'; g.fill();
    } else {
      circle(g, 0, 0, R); fillStroke(g, '#4b555a', '#2e3437', 1.5);
      circle(g, 0, 0, R - 3.2); g.strokeStyle = '#ffd166'; g.lineWidth = 1.4; g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-5, -6.5); g.lineTo(-5, 6.5); g.moveTo(5, -6.5); g.lineTo(5, 6.5); g.moveTo(-5, 0); g.lineTo(5, 0); g.stroke();
    }
    if (t.paragon || (up && up.some(v => v === 5))){ g.strokeStyle = 'rgba(255,209,102,0.55)'; g.lineWidth = 2; g.setLineDash([4, 5]); g.lineDashOffset = -time * 12; circle(g, 0, 0, R + 4); g.stroke(); g.setLineDash([]); }
    if (opt.selected){ g.strokeStyle = '#ffffff'; g.lineWidth = 2; circle(g, 0, 0, R + 2); g.stroke(); }
    g.restore();
  }
  /* the aircraft itself, drawn above everything else at its flight position */
  function drawFlyer(g, t, time, opt){
    opt = opt || {};
    const x = t.fx != null ? t.fx : t.x, y = t.fy != null ? t.fy : t.y;
    const sc = t.paragon ? 1.25 : 1;
    const away = Math.hypot(x - t.x, y - t.y);
    if (opt.selected && away > t.size){
      g.save(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.5; g.setLineDash([3, 5]); g.lineDashOffset = -time * 20;
      g.beginPath(); g.moveTo(t.x, t.y); g.lineTo(x, y); g.stroke(); g.restore();
    }
    g.fillStyle = 'rgba(0,0,0,0.18)'; ell(g, x + 9, y + 15, t.size * 0.95 * sc, t.size * 0.7 * sc); g.fill();
    const f = flyerView(t);
    drawTower(g, f, time, { selected: opt.selected, flying: true });
    t.rotNow = f.rotNow;
  }
  /* the aircraft as it flies: where it is, flying (its moving parts keep their state on the appliance itself) */
  function flyerView(t){
    if (!t._g3) t._g3 = {};
    return Object.assign({}, t, { x: t.fx != null ? t.fx : t.x, y: t.fy != null ? t.fy : t.y, icon: false, flying: true });
  }
  function drawJet(g, gold){
    g.fillStyle = 'rgba(0,0,0,0.15)'; ell(g, 3, 6, 6, 3); g.fill();
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-1, -6.5); g.lineTo(-3, -6.5); g.lineTo(-1, -1.2); g.lineTo(-6, -1.2); g.lineTo(-7.5, -3.5); g.lineTo(-8.5, -3.5); g.lineTo(-7.5, 0);
    g.lineTo(-8.5, 3.5); g.lineTo(-7.5, 3.5); g.lineTo(-6, 1.2); g.lineTo(-1, 1.2); g.lineTo(-3, 6.5); g.lineTo(-1, 6.5); g.closePath();
    fillStroke(g, gold ? '#ffd166' : '#dfe5e8', '#5c666b', 0.8);
    ell(g, 3, 0, 2.2, 1.1); g.fillStyle = '#4f86c6'; g.fill();
  }
  function drawMini(g, time, i, gold){
    g.fillStyle = 'rgba(0,0,0,0.15)'; ell(g, 3, 6, 5, 3); g.fill();
    g.strokeStyle = gold ? '#a57412' : '#3d4549'; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-1, 0); g.lineTo(-8, 0); g.stroke();
    ell(g, 0.5, 0, 4.6, 3.4); fillStroke(g, gold ? '#ffd166' : '#5f6e52', '#2d3527', 0.8);
    ell(g, 2.6, 0, 2, 1.8); g.fillStyle = '#9fd3ef'; g.fill();
    g.save(); g.translate(0, 0); g.rotate(time * 30 + i); g.strokeStyle = 'rgba(230,236,240,0.85)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.moveTo(0, -7); g.lineTo(0, 7); g.stroke(); g.restore();
  }
  /* a bird of flame (a great lava bird when big), facing +x, wings beating */
  function drawBird(g, time, i, lava){
    const flap = Math.sin(time * 13 + i * 2), sc = lava ? 1.55 : 1;
    g.scale(sc, sc);
    const glow = g.createRadialGradient(0, 0, 1, 0, 0, 14); glow.addColorStop(0, lava ? 'rgba(255,90,30,0.45)' : 'rgba(255,170,60,0.45)'); glow.addColorStop(1, 'rgba(255,120,40,0)');
    circle(g, 0, 0, 14); g.fillStyle = glow; g.fill();
    const c1 = lava ? '#ff4a12' : '#ff8a2a', c2 = lava ? '#ffb347' : '#ffd166', c3 = lava ? '#7a1a0a' : '#c2410c';
    /* the tail: three flickering plumes */
    for (let k = -1; k <= 1; k++){ const L = 11 + Math.sin(time * 18 + k * 2 + i) * 2; g.beginPath(); g.moveTo(-3, 0); g.quadraticCurveTo(-L * 0.6, k * 5, -L, k * 3.5 + Math.sin(time * 12 + k) * 1.5); g.quadraticCurveTo(-L * 0.55, k * 1.2, -3, 0); g.fillStyle = k ? c1 : c2; g.fill(); }
    /* wings up and down the screen, beating */
    for (const sd of [-1, 1]){ const span = 9 + flap * 2.5; g.beginPath(); g.moveTo(2, sd * 1.5); g.quadraticCurveTo(-1, sd * span * 0.8, -6, sd * span); g.quadraticCurveTo(-3.5, sd * span * 0.45, -4, sd * 1.5); g.closePath(); fillStroke(g, c1, c3, 0.7); g.beginPath(); g.moveTo(0.5, sd * 1.5); g.quadraticCurveTo(-2, sd * span * 0.55, -5, sd * span * 0.75); g.strokeStyle = c2; g.lineWidth = 1; g.stroke(); }
    ell(g, 0.5, 0, 5, 2.8); fillStroke(g, c2, c3, 0.7);
    circle(g, 4.6, 0, 2.3); g.fillStyle = c2; g.fill();
    g.beginPath(); g.moveTo(6.4, -0.8); g.lineTo(8.8, 0); g.lineTo(6.4, 0.8); g.closePath(); g.fillStyle = '#5a2a0a'; g.fill();
    circle(g, 5.2, -0.7, 0.6); g.fillStyle = '#2a0f05'; g.fill();
  }
  /* a shadow clone of the paragon Mandoline: a dark slicer in a violet haze */
  function drawShadowClone(g, time, i){
    g.save(); g.rotate(-Math.PI / 2 + Math.sin(time * 3 + i) * 0.3);
    if (!lowFx()){ circle(g, 0, 0, 12); g.fillStyle = 'rgba(110,90,190,0.18)'; g.fill(); }
    g.globalAlpha *= 0.85;
    rr(g, -9, -6.5, 17, 13, 3); fillStroke(g, '#2a2438', '#120f1a', 1);
    g.strokeStyle = '#b8b0ff'; g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-2, -5); g.lineTo(3, 0); g.lineTo(-2, 5); g.stroke();
    g.fillStyle = '#d9332a'; g.fillRect(0.5, -6.5, 2, 13);
    circle(g, -6, 0, 2.4); g.fillStyle = '#4a4560'; g.fill();
    carrotStar(g, 10, 0, 2.6, true);
    g.restore();
  }
  /* a sentry the Kitchen Bot built beside the trail: a little shaker that hops into place */
  const MINION_COL = { salt:['#f4f7f8', '#9aa6ab'], pepper:['#3d3a38', '#151312'], chili:['#e2383f', '#7a1414'], frost:['#bfe9ff', '#3f8fc4'], zap:['#ffd166', '#a57412'], mega:['#c9d2d6', '#4b565b'] };
  function drawMinion(g, m, t){
    const k = clamp(m.t / 0.35, 0, 1);
    const x = m.x0 + (m.x - m.x0) * k, y = m.y0 + (m.y - m.y0) * k - Math.sin(k * Math.PI) * 30;
    const fade = clamp(m.life / 0.5, 0, 1);
    const [c1, c2] = MINION_COL[m.look] || MINION_COL.salt;
    const B = m.tw && m.tw.s && m.tw.s.atk && m.tw.s.atk.build, champ = !!(B && B.champ) || m.mega;
    g.save(); g.globalAlpha *= fade; g.translate(x, y);
    if (m.mega) g.scale(2, 2);
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, 2, 4, 8, 5); g.fill();
    if (champ && !lowFx()){ circle(g, 0, 0, 9.5); g.fillStyle = 'rgba(255,209,102,0.22)'; g.fill(); }
    circle(g, 0, 0, 7); fillStroke(g, c1, c2, 1.2);
    circle(g, 0, 0, 4.4); fillStroke(g, champ ? '#ffd166' : '#c9d2d6', '#6b777c', 0.8);
    g.fillStyle = '#4b565b'; for (const [hx, hy] of [[-1.5, -1.2], [1.5, -1.2], [0, 1.5]]){ circle(g, hx, hy, 0.6); g.fill(); }
    g.rotate(m.ang);
    rr(g, 4, -1.6, m.fire > 0 ? 5 : 6.5, 3.2, 1); fillStroke(g, '#5c666b', '#2e3437', 0.6);
    if (m.fire > 0) star(g, 11.5, 0, 2.4, m.look === 'frost' ? '#bfe9ff' : m.look === 'chili' ? '#ff9a3d' : '#ffd166');
    g.restore();
    /* a countdown ring in its last seconds */
    if (m.life < 3 && !m.mega){ g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 9.5, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(m.life / 3, 0, 1)); g.stroke(); }
  }
  /* timed buffs on an appliance: a sauce monster's goo, a brew's steam, an overclock's sparks */
  function drawTimedFx(g, t, time, sc){
    const on = k => t.tb[k] && t.tb[k].until > G.time;
    const R = t.size * sc;
    g.save(); g.translate(t.x, t.y);
    if (on('monster')){
      const pul = 1 + Math.sin(time * 6 + (t.id || 0)) * 0.06;
      circle(g, 0, 0, R * 1.25 * pul); g.fillStyle = 'rgba(143,209,106,0.22)'; g.fill();
      g.strokeStyle = 'rgba(111,191,58,0.85)'; g.lineWidth = 2; g.stroke();
      for (let i = 0; i < 3; i++){ const an = 0.6 + i * 0.9, k2 = (time * 0.8 + i * 0.3) % 1; ell(g, Math.cos(an) * R * 1.2, Math.sin(an) * R * 1.2 + k2 * 5, 1.8, 2.6 + k2 * 2); g.fillStyle = 'rgba(143,209,106,' + (0.9 * (1 - k2)).toFixed(3) + ')'; g.fill(); }
      for (const s of [-1, 1]){ circle(g, s * 4, -R - 3, 2.4); fillStroke(g, '#ffffff', '#2a4a14', 0.8); circle(g, s * 4, -R - 2.6, 1.1); g.fillStyle = '#1d2b14'; g.fill(); }
    }
    if ((on('brew') || on('elixir')) && !lowFx()){
      const c = on('elixir') ? '143,209,106' : t.tb.brew && t.tb.brew.until === Infinity ? '255,209,102' : '255,138,82';
      for (let i = 0; i < 3; i++){ const k2 = (time * 0.7 + i * 0.33 + (t.id || 0) * 0.1) % 1; circle(g, -R * 0.5 + i * R * 0.5, -R * 0.6 - k2 * 16, 1.4 + k2 * 2.2); g.fillStyle = 'rgba(' + c + ',' + (0.75 * (1 - k2)).toFixed(3) + ')'; g.fill(); }
    }
    if (on('clock') && !lowFx()){
      g.strokeStyle = 'rgba(127,211,255,0.85)'; g.lineWidth = 1.4; g.lineCap = 'round';
      for (let i = 0; i < 2; i++){ const an = time * 5 + i * Math.PI, x0 = Math.cos(an) * R * 1.2, y0 = Math.sin(an) * R * 1.2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + 3, y0 - 3); g.lineTo(x0 + 1, y0 - 1); g.lineTo(x0 + 4, y0 - 5); g.stroke(); }
    }
    if (on('aim')){ g.rotate(time * 0.8); g.strokeStyle = 'rgba(242,194,48,0.75)'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 4; i++){ const an = i * Math.PI / 2; g.moveTo(Math.cos(an) * (R * 1.25), Math.sin(an) * (R * 1.25)); g.lineTo(Math.cos(an) * (R * 1.25 + 5), Math.sin(an) * (R * 1.25 + 5)); } g.stroke(); }
    if (on('angry') && !lowFx()){ for (let i = 0; i < 2; i++){ const k2 = (time * 1.4 + i * 0.5) % 1; circle(g, (i ? 1 : -1) * R * 0.5, -R * 0.7 - k2 * 12, 2 + k2 * 3); g.fillStyle = 'rgba(255,120,90,' + (0.6 * (1 - k2)).toFixed(3) + ')'; g.fill(); } }
    g.restore();
  }
  /* escort jets and mini-copters, circling their appliance */
  function drawDrones(g, t, time){
    if (!t.s || !t.s.atk) return;
    const T = TOWERS[t.type];
    const cx = T && T.flyer && t.fx != null ? t.fx : t.x, cy = T && T.flyer && t.fy != null ? t.fy : t.y;
    for (const id in t.s.atk){
      const a = t.s.atk[id];
      if (a.kind !== 'drones') continue;
      if (a.needBoost && !(t.boost && t.boost[a.needBoost])) continue;   // a summoned bird, gone when its ability ends
      if (a.need && !(t.sys && t.sys.on && t.sys.on[a.need])) continue;   // switched off by its paragon system
      const n = a.count || 1, gold = t.paragon || (t.up && t.up.some(v => v === 5));
      for (let i = 0; i < n; i++){
        const [ox, oy] = dronePos(t, a, i, time);
        g.save(); g.translate(cx + ox, cy + oy); g.rotate(Math.atan2(oy, ox) + Math.PI / 2);
        if (a.droneLook === 'mini') drawMini(g, time, i, gold); else if (a.droneLook === 'bird') drawBird(g, time, i, a.lava); else if (a.droneLook === 'shadow') drawShadowClone(g, time, i); else drawJet(g, gold);
        g.restore();
      }
    }
  }
  /* ripples around anything floating on water */
  function drawWake(g, t, time, sc){
    const R = t.size * 1.25 * sc, k = (time * 0.6 + (t.id || 0) * 0.37) % 1;
    g.save(); g.translate(t.x, t.y);
    g.strokeStyle = 'rgba(235,248,255,' + (0.5 * (1 - k)).toFixed(3) + ')'; g.lineWidth = 1.4;
    ell(g, 0, 0, R * (1 + k * 0.45), R * 0.82 * (1 + k * 0.45)); g.stroke();
    g.strokeStyle = 'rgba(235,248,255,0.35)'; ell(g, 0, 0, R * 1.02, R * 0.84); g.stroke();
    g.restore();
  }
  /* ---------------- head chefs ----------------
     Seen from above, facing +x: white jacket, the head under a puffy toque,
     and what each one throws held out in the right hand. */
  const CHEF_LOOK = {
    chef_blaze:  { scarf:'#e2383f', scarfD:'#8f1d22', skin:'#eebf94', item:'pan' },
    chef_gelato: { scarf:'#5aa6d6', scarfD:'#2c6fa8', skin:'#f4cfae', item:'cone' },
    chef_penny:  { scarf:'#2a9d8f', scarfD:'#1f6f66', skin:'#d9a27a', item:'coin' },
    chef_kenji:  { scarf:'#6c5ce7', scarfD:'#3b2f9e', skin:'#f1c9a5', item:'sticks', hat:'band', spark:'#d9cfff' },
    chef_nonna:  { scarf:'#6a8d2f', scarfD:'#45601b', skin:'#f2c8a8', item:'spoon', hat:'bun', spark:'#ff8a6a', shawl:'#7d9f3f' },
    chef_bruno:  { scarf:'#9a5b3c', scarfD:'#5e3420', skin:'#e0ac85', item:'cleaver', hat:'cap', spark:'#ffd166', big:true },
    chef_infinity:{ scarf:'#8b5cf6', scarfD:'#3b1f8a', skin:'#f1c9a5', item:'orb', spark:'#d7c6ff', admin:true },
  };
  /* what each head chef wears on their head, seen from above (the toque, unless they wear something else) */
  function chefHat(g, L, lvl){
    const gold = lvl >= 10, top = lvl >= 20;
    if (L.hat === 'band'){
      /* Kenji: dark hair under a hachimaki, tied at the back, a red sun at the front */
      circle(g, 1, 0, 6.2); fillStroke(g, '#3a3036', '#16121a', 1);
      g.fillStyle = gold ? '#ffd166' : '#f4f4f0';
      g.beginPath(); g.moveTo(-4.4, -1.2); g.lineTo(-9.6, -3.8); g.lineTo(-8.6, -1.4); g.closePath(); g.moveTo(-4.4, 1.2); g.lineTo(-9.8, 2.8); g.lineTo(-8.4, 0.6); g.closePath(); g.fill();
      g.strokeStyle = gold ? '#ffd166' : '#f4f4f0'; g.lineWidth = 1.8; circle(g, 1, 0, 5.3); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.8; g.beginPath(); g.arc(0, -0.8, 2.6, 3.6, 5.2); g.stroke();
      circle(g, 6, 0, 1.25); g.fillStyle = '#e2383f'; g.fill();
      if (top) star(g, 0.5, 0, 2.8, '#ffd166');
    } else if (L.hat === 'bun'){
      /* Nonna: grey curls with a bun on top and a red flower */
      circle(g, 1, 0, 6.5); fillStroke(g, '#d7dadd', '#9aa1a8', 1);
      g.fillStyle = '#e8eaec'; for (let i = 0; i < 8; i++){ const a = i / 8 * TAU; circle(g, 1 + Math.cos(a) * 5.1, Math.sin(a) * 5.1, 1.6); g.fill(); }
      circle(g, -1.4, 0, 3.3); fillStroke(g, '#c9cdd2', '#8f969d', 0.9);
      g.strokeStyle = '#a5abb1'; g.lineWidth = 0.7; g.beginPath(); g.arc(-2.2, -0.6, 1.6, 0.4, 2.2); g.stroke(); g.beginPath(); g.arc(-0.6, 0.6, 1.6, 3.5, 5.3); g.stroke();
      if (gold){ g.strokeStyle = '#ffd166'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-4.6, -2.6); g.lineTo(1.8, 2.6); g.stroke(); }
      circle(g, 4.2, -4, 1.5); g.fillStyle = '#e2383f'; g.fill(); circle(g, 4.2, -4, 0.6); g.fillStyle = '#ffd166'; g.fill();
      if (top) star(g, -1.4, 0, 2.6, '#ffd166');
    } else if (L.hat === 'cap'){
      /* Bruno: a bald head with a beard at the front, under a butcher's paper cap */
      circle(g, 1, 0, 6.8); fillStroke(g, L.skin, shade(L.skin, -0.4), 1);
      g.fillStyle = '#4a2a18'; g.beginPath(); g.arc(1, 0, 6.8, -1.05, 1.05); g.arc(1, 0, 4.4, 1.05, -1.05, true); g.closePath(); g.fill();
      rr(g, -5.6, -4.3, 11.6, 8.6, 3.6); fillStroke(g, '#ffffff', '#aab4b9', 1);
      g.strokeStyle = gold ? '#ffd166' : '#c3cbcf'; g.lineWidth = gold ? 1.4 : 0.9; g.beginPath(); g.moveTo(-5, 0); g.lineTo(5.4, 0); g.stroke();
      if (top) star(g, 0.2, 0, 2.6, '#ffd166');
    } else {
      circle(g, 1, 0, 6.2); fillStroke(g, L.skin, shade(L.skin, -0.4), 1);
      g.save(); toque(g, 6.4, lvl, top); g.restore();
    }
  }
  const SCOOP_COLORS = ['#ff9ac0', '#9be3c4', '#fff1c9', '#c99a6a'];
  function toque(g, r, lvl, gold){
    /* the band, then the puff on top */
    circle(g, 0, 0, r * 1.06); fillStroke(g, lvl >= 10 ? '#ffd166' : '#e9edef', lvl >= 10 ? '#b8861b' : '#aab4b9', 1);
    g.beginPath();
    for (let i = 0; i < 6; i++){ const a = i / 6 * TAU + 0.3; g.moveTo(Math.cos(a) * r * 0.55 + r * 0.42, Math.sin(a) * r * 0.55); g.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.42, 0, TAU); }
    g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#c3cbcf'; g.lineWidth = 0.8; g.stroke();
    circle(g, 0, 0, r * 0.62); g.fillStyle = '#ffffff'; g.fill();
    circle(g, -r * 0.2, -r * 0.22, r * 0.28); g.fillStyle = 'rgba(220,228,232,0.7)'; g.fill();
    if (gold) star(g, 0, 0, r * 0.5, '#ffd166');
  }
  function drawChef(g, t, up, time, par){
    const L = CHEF_LOOK[t.type] || CHEF_LOOK.chef_blaze, lvl = t.level || 1;
    const fired = t.fireAnim > 0, push = fired ? 3 : 0;
    const jacket = SKIN && SKIN.body ? mixHex(skinBody(SKIN), '#ffffff', 0.55) : L.shawl || '#fbfaf5';
    const big = L.big ? 1.12 : 1;
    /* a round mat in the chef's colour, so a head chef stands out from the appliances */
    circle(g, 0, 0, 16.5); fillStroke(g, L.scarf, L.scarfD, 1.5);
    circle(g, 0, 0, 13.4); g.strokeStyle = mixHex(L.scarf, '#ffffff', 0.45); g.lineWidth = 1.2; g.setLineDash([3, 2.4]); g.stroke(); g.setLineDash([]);
    /* arms: the left rests forward, the right holds the item out */
    rr(g, -3, -12.8, 12.5, 5.6, 2.8); fillStroke(g, jacket, '#7f8b90', 1);
    circle(g, 10, -10, 2.7); fillStroke(g, L.skin, shade(L.skin, -0.4), 0.8);
    rr(g, -2, 7.2, 13.5 + push, 5.6, 2.8); fillStroke(g, jacket, '#7f8b90', 1);
    const hx = 12.5 + push, hy = 10;
    /* what they throw */
    g.save(); g.translate(hx, hy);
    if (L.item === 'pan'){
      g.strokeStyle = '#2e3437'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-1, 0); g.lineTo(4.5, -1); g.stroke();
      circle(g, 9.5, -1.5, 5.8); fillStroke(g, '#3d4549', '#1f2427', 1.1);
      circle(g, 9.5, -1.5, 4.2); g.fillStyle = '#596268'; g.fill();
      const f = 0.75 + Math.sin(time * 14 + (t.id || 0)) * 0.25 + (fired ? 0.5 : 0);
      g.beginPath(); g.moveTo(6.3, -1.5); g.quadraticCurveTo(7.7, -5.5 - f * 4, 9.5, -2.5 - f * 7); g.quadraticCurveTo(11.3, -5.5 - f * 4, 12.7, -1.5); g.closePath(); g.fillStyle = '#ffb347'; g.fill();
      g.beginPath(); g.moveTo(7.9, -1.5); g.quadraticCurveTo(9.5, -4 - f * 3, 11.1, -1.5); g.closePath(); g.fillStyle = '#ffe08a'; g.fill();
      if (!fired){ g.save(); g.translate(9.5, 0.8); g.rotate(-0.4); g.beginPath(); g.moveTo(-3, -1); g.quadraticCurveTo(0, -2, 3.2, 0.4); g.quadraticCurveTo(0, 1.4, -3, 1); g.closePath(); fillStroke(g, '#d9332a', '#8a1a14', 0.6); g.restore(); }
    } else if (L.item === 'cone'){
      g.beginPath(); g.moveTo(-1, 0); g.lineTo(7.5, -3.2); g.lineTo(7.5, 3.2); g.closePath(); fillStroke(g, '#e0a956', '#9a6a2b', 0.9);
      g.strokeStyle = 'rgba(154,106,43,0.7)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(3, -1.5); g.lineTo(5.6, 1.7); g.moveTo(5.2, -2.2); g.lineTo(3.2, 1.3); g.stroke();
      if (!fired){ const c = SCOOP_COLORS[((t.id || 0) + Math.floor(time * 0.5)) % 4]; circle(g, 10, 0, 4.2); fillStroke(g, c, shade(c, -0.3), 0.9); circle(g, 8.9, -1.3, 1.1); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill(); }
    } else if (L.item === 'sticks'){
      /* chopsticks pinching a piece of nigiri */
      g.strokeStyle = '#c99a5b'; g.lineWidth = 1.3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-1, -0.9); g.lineTo(11.5, -2.4); g.moveTo(-1, 0.9); g.lineTo(11.5, 0.8); g.stroke();
      if (!fired){
        ell(g, 12.6, -0.8, 3.7, 2.5); fillStroke(g, '#fbfbf4', '#bdbdb2', 0.7);
        ell(g, 12.8, -1.1, 3.3, 1.8); g.fillStyle = '#ff8c5a'; g.fill();
        g.strokeStyle = 'rgba(255,240,225,0.9)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(11.2, -2.4); g.lineTo(12.2, 0.2); g.moveTo(13, -2.6); g.lineTo(14, -0.1); g.stroke();
        g.fillStyle = '#1f3a2a'; g.fillRect(12.2, -3.4, 1.3, 5);
      }
    } else if (L.item === 'spoon'){
      /* a wooden spoon with sauce on it */
      g.strokeStyle = '#a8763a'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-1, 0); g.lineTo(8, -1); g.stroke();
      ell(g, 11.2, -1.3, 3.6, 2.6); fillStroke(g, '#d9a76a', '#8a5a2b', 0.9);
      if (!fired){ ell(g, 11.3, -1.4, 2.5, 1.7); g.fillStyle = '#c9302a'; g.fill(); circle(g, 10.6, -2, 0.6); g.fillStyle = 'rgba(255,220,200,0.8)'; g.fill(); }
    } else if (L.item === 'orb'){
      /* three void orbs circling an open hand: red, blue and the purple they make together */
      const a0 = time * 2.4 + (t.id || 0);
      for (let i = 0; i < 3; i++){
        const a = a0 + i * TAU / 3, r = 7 + (fired ? 3 : 0), c = ['#ff4a4a', '#4a8cff', '#b06bff'][i];
        g.save(); g.globalCompositeOperation = 'lighter'; circle(g, 7 + Math.cos(a) * r, Math.sin(a) * r * 0.6, 4.5); g.fillStyle = rgbaStr(c, 0.35); g.fill(); g.restore();
        circle(g, 7 + Math.cos(a) * r, Math.sin(a) * r * 0.6, 2.4); fillStroke(g, c, shade(c, -0.45), 0.8);
      }
    } else if (L.item === 'cleaver'){
      /* a heavy cleaver */
      rr(g, -1, -1.4, 6.5, 2.8, 1.2); fillStroke(g, '#5a3a24', '#2e1d12', 0.7);
      g.save(); g.translate(0, fired ? 0 : -0.5);
      rr(g, 4.6, -5.4, 9.6, 8.2, 1.2); fillStroke(g, '#dfe7ea', '#6b777c', 1);
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(5.4, 1.4, 8, 0.9);
      circle(g, 12, -3.2, 0.9); g.fillStyle = '#6b777c'; g.fill();
      g.restore();
    } else {
      const k = Math.abs(Math.cos(time * 3 + (t.id || 0)));
      ell(g, 6, 0, 4.4 * (0.35 + 0.65 * k), 4.4); fillStroke(g, '#ffd166', '#a57412', 1);
      if (k > 0.5){ g.fillStyle = '#a57412'; g.font = '700 6px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 6, 0.4); }
    }
    g.restore();
    circle(g, hx, hy, 2.7); fillStroke(g, L.skin, shade(L.skin, -0.4), 0.8);
    /* shoulders in the white jacket (Nonna's shawl), with a scarf, bow tie or brooch at the collar */
    ell(g, -2.5, 0, 9.6 * big, 12.4 * big); fillStroke(g, jacket, L.shawl ? shade(L.shawl, -0.35) : '#7f8b90', 1.3);
    g.fillStyle = 'rgba(29,43,51,0.14)'; ell(g, -5.6, 0, 4.2 * big, 9.6 * big); g.fill();
    if (L.shawl){
      g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 0.8;
      for (const r of [5, 8]){ g.beginPath(); g.ellipse(-2.5, 0, r * 0.78, r, 0, -1.2, 1.2); g.stroke(); }
      circle(g, 7.4, 0, 1.9); fillStroke(g, '#ffd166', '#a57412', 0.8);
    } else if (L.big){
      /* Bruno's striped butcher's apron over the jacket */
      rr(g, 1.5, -6.5, 6.5, 13, 2); fillStroke(g, '#f1e6d6', '#8a6a4a', 0.8);
      g.strokeStyle = 'rgba(122,74,40,0.75)'; g.lineWidth = 0.9; g.beginPath(); for (const y of [-4.2, -1.4, 1.4, 4.2]){ g.moveTo(1.8, y); g.lineTo(7.8, y); } g.stroke();
      g.beginPath(); g.moveTo(5.6, -5); g.quadraticCurveTo(10.6, 0, 5.6, 5); g.lineTo(11.6, 0); g.closePath(); fillStroke(g, L.scarf, L.scarfD, 0.9);
    } else if (t.type === 'chef_penny'){
      g.beginPath(); g.moveTo(7.4, 0); g.lineTo(10.4, -3.6); g.lineTo(10.4, 3.6); g.closePath(); g.moveTo(7.4, 0); g.lineTo(4.4, -3.6); g.lineTo(4.4, 3.6); g.closePath(); fillStroke(g, '#ffd166', '#a57412', 0.8);
      circle(g, 7.4, 0, 1.3); g.fillStyle = '#b8861b'; g.fill();
    } else {
      g.beginPath(); g.moveTo(3.6, -6); g.quadraticCurveTo(9, 0, 3.6, 6); g.lineTo(11.4, 0); g.closePath(); fillStroke(g, L.scarf, L.scarfD, 0.9);
    }
    /* the head, and what's on it */
    chefHat(g, L, lvl);
    /* fired up: a few sparks off the shoulders at high levels */
    if (lvl >= 15 && !t.icon){
      for (let i = 0; i < 3; i++){
        const k = (time * 0.9 + i / 3 + (t.id || 0) * 0.13) % 1, a = i * 2.1 + (t.id || 0);
        g.globalAlpha = (1 - k) * 0.85;
        const c = t.type === 'chef_blaze' ? (i % 2 ? '#ffb347' : '#ff5a1f') : t.type === 'chef_gelato' ? '#e8f7ff' : L.spark || '#ffd166';
        circle(g, Math.cos(a) * (12 + k * 8) - 2, Math.sin(a) * (13 + k * 8), 1.6 * (1 - k * 0.4)); g.fillStyle = c; g.fill();
      }
      g.globalAlpha = 1;
    }
  }
  /* the head chef's level, on a gold disc below and to the right */
  function drawHeroBadge(g, t){
    const R = t.size, lvl = t.level || 1;
    g.save(); g.translate(t.x + R * 0.82, t.y + R * 0.8);
    circle(g, 0, 0, 6.6); fillStroke(g, lvl >= 20 ? '#ff6f3c' : '#ffd166', '#1d2b33', 1.4);
    g.fillStyle = lvl >= 20 ? '#ffffff' : '#1d2b33'; g.font = '700 ' + (lvl >= 10 ? 8.5 : 9.5) + 'px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(lvl), 0, 0.6);
    g.restore();
  }
  /* Chef Infinity's counter: a thin violet ring around the stretch nothing can cross, with six slow orbs on it */
  function drawVoidAura(g, t, time){
    const R = (t.s && t.s.barrier ? t.s.barrier.r : 170);
    g.save();
    g.strokeStyle = 'rgba(139,92,246,0.35)'; g.lineWidth = 2; g.setLineDash([6, 10]); g.lineDashOffset = -time * 30; circle(g, t.x, t.y, R); g.stroke(); g.setLineDash([]);
    const gr = g.createRadialGradient(t.x, t.y, R * 0.2, t.x, t.y, R); gr.addColorStop(0, 'rgba(139,92,246,0.16)'); gr.addColorStop(1, 'rgba(139,92,246,0)'); g.fillStyle = gr; circle(g, t.x, t.y, R); g.fill();
    for (let i = 0; i < 6; i++){ const a = i / 6 * TAU + time * 0.5, c = i % 2 ? '#4a8cff' : '#ff4a4a'; circle(g, t.x + Math.cos(a) * R, t.y + Math.sin(a) * R, 3); g.fillStyle = c; g.fill(); }
    g.restore();
  }
  /* Gelato's chilly aura: a ring of drifting snowflakes at the edge of her reach */
  function drawChefAura(g, t, time){
    const R = t.s.range;
    g.save(); g.strokeStyle = 'rgba(232,247,255,0.8)'; g.lineWidth = 1.2; g.lineCap = 'round';
    for (let i = 0; i < 10; i++){ const a = i / 10 * TAU + time * 0.15; flake(g, t.x + Math.cos(a) * R * 0.94, t.y + Math.sin(a) * R * 0.94, 3.2, time * 0.8 + i); }
    g.restore();
  }

  /* a portrait for menus and cards: head and shoulders, facing you */
  function chefPortrait(type, size){
    const key = 'chef:' + type + ':' + size + ':' + SK;
    let c = iconCache.get(key);
    if (c) return c;
    c = mkCanvas(size * SK, size * SK);
    const g = c.getContext('2d');
    g.scale(SK, SK); g.scale(size / 100, size / 100);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const L = CHEF_LOOK[type] || CHEF_LOOK.chef_blaze, ink = '#1d2b33';
    /* shoulders and jacket (Bruno is broader; Nonna wears a cardigan) */
    const wide = L.big ? 4 : 0;
    g.beginPath(); g.moveTo(12 - wide, 101); g.bezierCurveTo(13 - wide, 84, 22 - wide, 76, 38, 73); g.lineTo(62, 73); g.bezierCurveTo(78 + wide, 76, 87 + wide, 84, 88 + wide, 101); g.closePath();
    fillStroke(g, L.shawl ? '#efe3c8' : '#fbfaf5', ink, 2.4);
    if (!L.shawl){
      g.strokeStyle = '#c3cbcf'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(50, 78); g.lineTo(50, 101); g.stroke();
      g.fillStyle = '#aab4b9'; for (const bx of [42, 58]) for (const by of [84, 93]){ circle(g, bx, by, 1.9); g.fill(); }
    }
    /* neck, then scarf, bow tie, shawl or apron */
    rr(g, 43, 62, 14, 14, 4); fillStroke(g, L.skin, ink, 2);
    if (L.shawl){
      /* a knitted shawl over the cardigan, pinned with a gold brooch */
      for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(50, 74); g.quadraticCurveTo(50 + sd * 20, 70, 50 + sd * 36, 86); g.lineTo(50 + sd * 34, 101); g.lineTo(50 + sd * 14, 101); g.quadraticCurveTo(50 + sd * 6, 88, 50, 82); g.closePath(); fillStroke(g, L.shawl, ink, 2); }
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.4; for (const sd of [-1, 1]) for (const k of [0.35, 0.65]){ g.beginPath(); g.moveTo(50 + sd * 36 * k, 74 + 12 * k); g.lineTo(50 + sd * (14 + 20 * k), 101); g.stroke(); }
      circle(g, 50, 80, 4); fillStroke(g, '#ffd166', ink, 1.8); circle(g, 50, 80, 1.6); g.fillStyle = '#e2383f'; g.fill();
    } else if (L.big){
      /* a striped butcher's apron, and a neckerchief */
      g.beginPath(); g.moveTo(33, 101); g.lineTo(35, 82); g.lineTo(65, 82); g.lineTo(67, 101); g.closePath(); fillStroke(g, '#f1e6d6', ink, 2);
      g.save(); g.beginPath(); g.moveTo(33, 101); g.lineTo(35, 82); g.lineTo(65, 82); g.lineTo(67, 101); g.closePath(); g.clip();
      g.fillStyle = 'rgba(122,74,40,0.7)'; for (let x = 36; x < 68; x += 7) g.fillRect(x, 80, 3, 22); g.restore();
      g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.moveTo(38, 82); g.lineTo(42, 72); g.moveTo(62, 82); g.lineTo(58, 72); g.stroke();
      g.beginPath(); g.moveTo(39, 71); g.quadraticCurveTo(50, 79, 61, 71); g.lineTo(55, 84); g.lineTo(50, 79); g.lineTo(45, 84); g.closePath(); fillStroke(g, L.scarf, ink, 2);
    } else if (type === 'chef_penny'){
      g.beginPath(); g.moveTo(50, 76); g.lineTo(39, 70); g.lineTo(39, 82); g.closePath(); g.moveTo(50, 76); g.lineTo(61, 70); g.lineTo(61, 82); g.closePath(); fillStroke(g, '#ffd166', ink, 2);
      circle(g, 50, 76, 3.2); fillStroke(g, '#e8a21a', ink, 1.6);
      g.beginPath(); g.moveTo(31, 101); g.lineTo(33, 86); g.lineTo(67, 86); g.lineTo(69, 101); g.closePath(); fillStroke(g, '#2a9d8f', ink, 2);
    } else {
      g.beginPath(); g.moveTo(38, 72); g.quadraticCurveTo(50, 80, 62, 72); g.lineTo(55, 88); g.lineTo(50, 81); g.lineTo(45, 88); g.closePath(); fillStroke(g, L.scarf, ink, 2);
    }
    /* hair at the sides (Gelato's curls, Penny's bob, Nonna's grey curls, Kenji's dark crop) */
    if (type === 'chef_gelato'){ for (const [x, y] of [[31, 44], [32, 51], [69, 44], [68, 51]]){ circle(g, x, y, 4.6); fillStroke(g, '#c98a45', ink, 1.8); } }
    if (type === 'chef_penny'){ for (const s of [-1, 1]){ g.beginPath(); g.moveTo(50 + s * 12, 34); g.quadraticCurveTo(50 + s * 23, 40, 50 + s * 20, 62); g.lineTo(50 + s * 13, 60); g.closePath(); fillStroke(g, '#4a2c1c', ink, 1.8); } }
    if (L.hat === 'bun'){ for (const [x, y] of [[31, 40], [30, 48], [32, 56], [69, 40], [70, 48], [68, 56]]){ circle(g, x, y, 4.4); fillStroke(g, '#dfe2e5', ink, 1.8); } }
    if (L.hat === 'band'){ for (const s of [-1, 1]){ g.beginPath(); g.moveTo(50 + s * 13, 36); g.quadraticCurveTo(50 + s * 19, 42, 50 + s * 16.5, 52); g.lineTo(50 + s * 13.5, 50); g.closePath(); fillStroke(g, '#26262e', ink, 1.6); } }
    /* face */
    for (const s of [-1, 1]){ circle(g, 50 + s * 16.5, 52, 4.4); fillStroke(g, L.skin, ink, 2); }
    if (L.hat === 'bun'){ for (const s of [-1, 1]){ circle(g, 50 + s * 17, 57.5, 1.8); fillStroke(g, '#ffd166', ink, 1); } }
    ell(g, 50, 50, 16 + (L.big ? 1.5 : 0), 18); fillStroke(g, L.skin, ink, 2.4);
    g.fillStyle = L.hat === 'bun' ? 'rgba(255,110,110,0.5)' : 'rgba(255,120,120,0.35)'; circle(g, 40, 57, L.hat === 'bun' ? 4.4 : 3.6); g.fill(); circle(g, 60, 57, L.hat === 'bun' ? 4.4 : 3.6); g.fill();
    if (L.hat !== 'bun'){
      g.fillStyle = ink; circle(g, 43.5, 49, 2.3); g.fill(); circle(g, 56.5, 49, 2.3); g.fill();
      g.fillStyle = '#ffffff'; circle(g, 44.2, 48.2, 0.8); g.fill(); circle(g, 57.2, 48.2, 0.8); g.fill();
    }
    if (type === 'chef_kenji'){
      /* level brows and a quiet, sure smile */
      g.strokeStyle = '#26262e'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(38.5, 44); g.lineTo(47, 44.5); g.moveTo(61.5, 44); g.lineTo(53, 44.5); g.stroke();
      g.strokeStyle = ink; g.lineWidth = 1.8; g.beginPath(); g.moveTo(45, 59); g.quadraticCurveTo(50, 61.5, 55, 58.5); g.stroke();
    } else if (type === 'chef_nonna'){
      /* happy closed eyes, a warm smile */
      g.strokeStyle = ink; g.lineWidth = 2.2; for (const x of [43.5, 56.5]){ g.beginPath(); g.arc(x, 51, 3.2, 1.12 * Math.PI, 1.88 * Math.PI); g.stroke(); }
      g.strokeStyle = '#b8b8b8'; g.lineWidth = 1.6; for (const x of [43.5, 56.5]){ g.beginPath(); g.arc(x, 45.5, 4, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke(); }
      g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.arc(50, 56.5, 6, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
    } else if (type === 'chef_bruno'){
      /* bushy brows, a short dark beard and a big grin */
      g.fillStyle = '#4a2a18'; g.beginPath(); g.moveTo(34.5, 52); g.quadraticCurveTo(35, 70, 50, 70.5); g.quadraticCurveTo(65, 70, 65.5, 52); g.quadraticCurveTo(60, 60, 50, 60); g.quadraticCurveTo(40, 60, 34.5, 52); g.closePath(); fillStroke(g, '#4a2a18', ink, 1.8);
      g.fillStyle = '#3a2012'; g.beginPath(); g.moveTo(41, 58); g.quadraticCurveTo(50, 53, 59, 58); g.quadraticCurveTo(50, 57, 41, 58); g.closePath(); g.fill();
      g.strokeStyle = '#3a2012'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(37.5, 43); g.lineTo(47.5, 44.5); g.moveTo(62.5, 43); g.lineTo(52.5, 44.5); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(44.5, 61); g.quadraticCurveTo(50, 66, 55.5, 61); g.closePath(); g.fill(); g.strokeStyle = ink; g.lineWidth = 1.4; g.stroke();
    } else if (type === 'chef_blaze'){
      /* fierce brows and a big curled moustache */
      g.strokeStyle = '#6b2e1a'; g.lineWidth = 2.8; g.beginPath(); g.moveTo(38.5, 42.5); g.lineTo(47, 45); g.moveTo(61.5, 42.5); g.lineTo(53, 45); g.stroke();
      g.beginPath(); g.moveTo(50, 56); g.bezierCurveTo(45, 54, 38, 55, 36, 60); g.bezierCurveTo(38, 58, 43, 59, 50, 60); g.bezierCurveTo(57, 59, 62, 58, 64, 60); g.bezierCurveTo(62, 55, 55, 54, 50, 56); g.closePath(); fillStroke(g, '#8a3d22', ink, 1.4);
      g.strokeStyle = ink; g.lineWidth = 1.8; g.beginPath(); g.arc(50, 61, 3.4, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    } else if (type === 'chef_gelato'){
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 2; for (const x of [43.5, 56.5]){ g.beginPath(); g.arc(x, 45, 4, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); }
      g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.arc(50, 56, 6.5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    } else {
      /* round glasses and a confident smile */
      g.strokeStyle = ink; g.lineWidth = 1.8; circle(g, 43.5, 49, 5.2); g.stroke(); circle(g, 56.5, 49, 5.2); g.stroke(); g.beginPath(); g.moveTo(48.7, 49); g.lineTo(51.3, 49); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.moveTo(44, 58); g.quadraticCurveTo(51, 63.5, 57, 57.5); g.stroke();
    }
    if (L.hat === 'band'){
      /* dark hair, and a hachimaki with a red sun, its knot tails at the side */
      g.beginPath(); g.moveTo(34, 44); g.bezierCurveTo(32, 24, 68, 24, 66, 44); g.lineTo(62, 39); g.lineTo(38, 39); g.closePath(); fillStroke(g, '#26262e', ink, 2);
      rr(g, 32.5, 35, 35, 8, 3); fillStroke(g, '#f4f4f0', ink, 2);
      circle(g, 50, 39, 3.2); g.fillStyle = '#e2383f'; g.fill();
      for (const [dx, dy] of [[0, 0], [3, 6]]){ g.beginPath(); g.moveTo(66, 38 + dy * 0.3); g.lineTo(76 + dx, 44 + dy); g.lineTo(73 + dx, 47 + dy); g.lineTo(65, 41 + dy * 0.3); g.closePath(); fillStroke(g, '#f4f4f0', ink, 1.6); }
    } else if (L.hat === 'bun'){
      /* grey curls on top and a bun, with a red flower */
      g.beginPath(); g.moveTo(33, 46); g.bezierCurveTo(30, 24, 70, 24, 67, 46); g.quadraticCurveTo(60, 34, 50, 35); g.quadraticCurveTo(40, 34, 33, 46); g.closePath(); fillStroke(g, '#dfe2e5', ink, 2);
      g.strokeStyle = '#b5bbc1'; g.lineWidth = 1.4; for (const [x, y] of [[41, 31], [50, 29], [59, 31]]){ g.beginPath(); g.arc(x, y, 3, 0.2, Math.PI * 1.6); g.stroke(); }
      circle(g, 50, 19, 9); fillStroke(g, '#dfe2e5', ink, 2);
      g.strokeStyle = '#b5bbc1'; g.lineWidth = 1.3; g.beginPath(); g.arc(47, 17, 4.5, 0.6, 2.2); g.stroke(); g.beginPath(); g.arc(53, 21, 4.5, 3.7, 5.3); g.stroke();
      g.strokeStyle = '#c99a1c'; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(40, 14); g.lineTo(58, 22); g.stroke();
      circle(g, 40, 14, 1.8); g.fillStyle = '#ffd166'; g.fill();
      circle(g, 61, 24, 3.6); fillStroke(g, '#e2383f', ink, 1.4); circle(g, 61, 24, 1.3); g.fillStyle = '#ffd166'; g.fill();
    } else if (L.hat === 'cap'){
      /* a butcher's paper cap */
      g.beginPath(); g.moveTo(30.5, 37); g.quadraticCurveTo(33, 22, 50, 20); g.quadraticCurveTo(67, 22, 69.5, 37); g.closePath(); fillStroke(g, '#ffffff', ink, 2.2);
      rr(g, 30, 33.5, 40, 6.5, 2.5); fillStroke(g, '#f1f3f4', ink, 2);
      g.strokeStyle = '#c3cbcf'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(50, 21.5); g.lineTo(50, 33); g.stroke();
    } else {
      /* the toque: band and puff */
      rr(g, 32.5, 27, 35, 10, 2.5); fillStroke(g, '#ffffff', ink, 2.2);
      g.beginPath(); g.moveTo(33.5, 28.5); g.bezierCurveTo(22, 27, 21, 11, 33, 11); g.bezierCurveTo(33, 1, 47, -1, 50, 7); g.bezierCurveTo(54, -1, 68, 1, 67, 11); g.bezierCurveTo(79, 11, 78, 27, 66.5, 28.5); g.closePath();
      fillStroke(g, '#ffffff', ink, 2.2);
      g.strokeStyle = '#d5dcdf'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(42, 26); g.quadraticCurveTo(41, 18, 44, 12); g.moveTo(58, 26); g.quadraticCurveTo(59, 18, 56, 12); g.stroke();
    }
    if (type === 'chef_gelato'){ circle(g, 62, 19, 3.6); fillStroke(g, '#ff6f91', ink, 1.4); g.fillStyle = '#4f9a45'; g.fillRect(61, 13.5, 2, 3); }
    /* what each one holds up */
    g.save();
    if (L.item === 'pan'){
      g.translate(80, 74); g.rotate(-0.35);
      g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.moveTo(-14, 16); g.lineTo(-4, 6); g.stroke();
      g.strokeStyle = '#3d4549'; g.lineWidth = 3; g.stroke();
      ell(g, 4, 0, 13, 6); fillStroke(g, '#3d4549', ink, 2);
      ell(g, 4, -1, 10, 3.6); g.fillStyle = '#596268'; g.fill();
      g.beginPath(); g.moveTo(-5, -1); g.bezierCurveTo(-4, -12, 2, -10, 1, -20); g.bezierCurveTo(6, -14, 8, -18, 9, -24); g.bezierCurveTo(14, -16, 15, -8, 13, -1); g.closePath(); fillStroke(g, '#ffb347', ink, 1.6);
      g.beginPath(); g.moveTo(-0.5, -1.5); g.bezierCurveTo(0, -8, 4, -7, 4, -13); g.bezierCurveTo(8, -9, 9, -5, 8.5, -1.5); g.closePath(); g.fillStyle = '#ffe08a'; g.fill();
    } else if (L.item === 'cone'){
      g.translate(82, 78);
      g.beginPath(); g.moveTo(-8, -4); g.lineTo(8, -4); g.lineTo(0, 20); g.closePath(); fillStroke(g, '#e0a956', ink, 2);
      g.strokeStyle = 'rgba(122,74,32,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-5, 1); g.lineTo(4, 10); g.moveTo(5, 1); g.lineTo(-3, 12); g.stroke();
      circle(g, 0, -9, 9); fillStroke(g, '#9be3c4', ink, 2);
      circle(g, 0, -19, 7.5); fillStroke(g, '#ff9ac0', ink, 2);
      circle(g, -2.5, -21.5, 2); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
    } else if (L.item === 'sticks'){
      /* chopsticks holding up a piece of nigiri */
      g.translate(74, 84); g.rotate(-0.62); g.scale(0.92, 0.92);
      g.strokeStyle = ink; g.lineWidth = 4.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-14, 4); g.lineTo(12, -1); g.moveTo(-14, 10); g.lineTo(12, 5); g.stroke();
      g.strokeStyle = '#d9a86a'; g.lineWidth = 2.4; g.stroke();
      ell(g, 18, 2, 9, 6); fillStroke(g, '#fbfbf4', ink, 2);
      ell(g, 18.5, -1, 8.6, 4.6); fillStroke(g, '#ff8c5a', ink, 1.8);
      g.strokeStyle = 'rgba(255,240,225,0.9)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(14, -4); g.lineTo(16.5, 2); g.moveTo(19.5, -4.5); g.lineTo(22, 1.5); g.stroke();
      g.fillStyle = '#1f3a2a'; g.fillRect(16.5, -5.5, 3.6, 12.5);
    } else if (L.item === 'spoon'){
      /* a wooden spoon, dripping with sauce */
      g.translate(82, 82); g.rotate(0.35);
      g.strokeStyle = ink; g.lineWidth = 5.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 20); g.lineTo(0, -4); g.stroke();
      g.strokeStyle = '#c8935a'; g.lineWidth = 3; g.stroke();
      ell(g, 0, -13, 7.5, 10); fillStroke(g, '#d9a76a', ink, 2);
      ell(g, 0, -14, 5, 6.8); g.fillStyle = '#c9302a'; g.fill();
      g.beginPath(); g.moveTo(3, -6); g.quadraticCurveTo(5.5, 1, 4, 4); g.quadraticCurveTo(2, 1, 3, -6); g.fill();
      circle(g, -1.6, -16.5, 1.6); g.fillStyle = 'rgba(255,220,200,0.85)'; g.fill();
    } else if (L.item === 'cleaver'){
      /* a big cleaver, held up */
      g.translate(76, 80); g.rotate(-0.6); g.scale(0.9, 0.9);
      rr(g, -16, -3, 14, 6, 2.5); fillStroke(g, '#6a4128', ink, 2);
      g.fillStyle = '#c9d2d6'; circle(g, -12, 0, 1.2); g.fill(); circle(g, -6, 0, 1.2); g.fill();
      g.beginPath(); g.moveTo(-3, -11); g.lineTo(19, -11); g.quadraticCurveTo(22, -11, 22, -8); g.lineTo(22, 9); g.lineTo(-3, 9); g.closePath(); fillStroke(g, '#e6ecee', ink, 2);
      g.fillStyle = 'rgba(160,172,178,0.55)'; g.fillRect(-1, -9, 21, 4);
      g.strokeStyle = '#ffffff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 7); g.lineTo(20, 7); g.stroke();
      circle(g, 15, -5.5, 2.4); g.fillStyle = '#8e9aa0'; g.fill(); g.strokeStyle = ink; g.lineWidth = 1.2; g.stroke();
      star(g, 22, -15, 3.2, '#ffffff');
    } else {
      g.translate(81, 76);
      circle(g, 0, 0, 11); fillStroke(g, '#ffd166', ink, 2.2);
      circle(g, 0, 0, 7.6); g.strokeStyle = '#c99a1c'; g.lineWidth = 1.4; g.stroke();
      g.fillStyle = '#a57412'; g.font = '700 13px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 1);
      star(g, 9, -10, 3.6, '#fff4c2');
    }
    g.restore();
    iconCache.set(key, c);
    return c;
  }
  /* ---------------- the chess set ----------------
     A square of a chess board is the body (a low wooden block); the pieces stand up on it, lit from the left.
     Each piece is drawn foot at (0, 0), standing up the screen. */
  const CH_LIGHT = '#f0dcb2', CH_DARK = '#9b6a3b', CH_WOOD = '#5a3820', CH_EBONY = '#4a3328';
  function pieceGrad(g, col, w){
    const lg = g.createLinearGradient(-w, 0, w, 0);
    lg.addColorStop(0, shade(col, 0.42)); lg.addColorStop(0.38, col); lg.addColorStop(1, shade(col, -0.34));
    return lg;
  }
  /* a symmetric outline from its right half: it starts on the centre line at the foot, then [x, y] (a line) or
     [c1x, c1y, c2x, c2y, x, y] (a curve), and ends on the centre line at the top */
  function symPath(g, half){
    g.beginPath();
    g.moveTo(half[0][0], half[0][1]);
    for (let i = 1; i < half.length; i++){ const s = half[i]; if (s.length === 2) g.lineTo(s[0], s[1]); else g.bezierCurveTo(s[0], s[1], s[2], s[3], s[4], s[5]); }
    for (let i = half.length - 1; i >= 1; i--){
      const s = half[i], p = half[i - 1], px = p.length === 2 ? p[0] : p[4], py = p.length === 2 ? p[1] : p[5];
      if (s.length === 2) g.lineTo(-px, py); else g.bezierCurveTo(-s[2], s[3], -s[0], s[1], -px, py);
    }
    g.closePath();
  }
  const FOOT = [[0, 1.1], [5.6, 1.1, 9.4, 0.5, 9.4, -1.1], [9.4, -2.6], [9.1, -3.4, 7.9, -3.7, 7.3, -3.9]];
  const PIECE_HALF = {
    pawn: FOOT.concat([[6.3, -4.3, 5.0, -5.2, 4.4, -6.9], [3.6, -9.4, 2.9, -11.1, 2.9, -12.3], [5.7, -12.6], [6.2, -13.2, 6.2, -13.9, 5.5, -14.3], [3.0, -14.7], [0, -14.9]]),
    rook: FOOT.concat([[7.0, -4.4, 6.2, -5.3, 6.0, -6.7], [5.5, -11.5, 5.5, -15.4, 6.5, -17.4], [8.3, -17.6], [8.3, -19.7], [8.7, -20.1], [8.7, -25.4], [5.4, -25.4], [5.4, -22.9], [2.0, -22.9], [2.0, -25.4], [0, -25.4]]),
    bishop: FOOT.concat([[6.6, -4.4, 5.2, -5.1, 4.6, -6.9], [3.4, -10.6, 2.6, -13.0, 2.6, -14.6], [5.6, -15.0], [6.1, -15.6, 6.1, -16.3, 5.4, -16.7], [2.7, -17.1], [5.9, -18.6, 6.5, -23.4, 3.7, -26.7], [2.2, -28.4, 1.0, -29.4, 0, -29.8]]),
    queen: FOOT.concat([[7.6, -4.4, 6.4, -5.5, 5.6, -7.5], [4.2, -12.0, 3.2, -16.0, 3.2, -18.5], [6.5, -19.0], [7.0, -19.7, 7.0, -20.5, 6.3, -21.0], [3.4, -21.4], [5.4, -23.4, 7.4, -26.4, 7.9, -28.6], [6.1, -27.2], [4.8, -29.8], [3.1, -27.6], [1.6, -30.2], [0, -28.2]]),
  };
  /* front-facing grooves round a turned piece: [y, half-width] */
  const PIECE_RIMS = { pawn: [[-3.9, 7.3], [-12.4, 5.6]], rook: [[-3.9, 7.3], [-17.5, 8.3]], bishop: [[-3.9, 7.3], [-15.0, 5.6]], queen: [[-3.9, 7.3], [-19.0, 6.5]] };
  function rims(g, list, col){
    g.lineWidth = 0.8; g.strokeStyle = shade(col, -0.42);
    for (const [y, w] of list){ g.beginPath(); g.ellipse(0, y, w, w * 0.26, 0, 0.12, Math.PI - 0.12); g.stroke(); }
  }
  /* a turned piece (pawn, rook, bishop or queen) in colour col; o: { trim: gold bands, glow, gem, flag } */
  function turnedPiece(g, kind, col, o){
    o = o || {};
    const out = o.out || shade(col, -0.62);
    symPath(g, PIECE_HALF[kind]);
    g.fillStyle = pieceGrad(g, col, 9.4); g.fill();
    g.strokeStyle = out; g.lineWidth = 1.1; g.lineJoin = 'round'; g.stroke();
    rims(g, PIECE_RIMS[kind], col);
    if (kind === 'pawn'){
      /* its round head */
      circle(g, 0, -19.4, 5.1);
      const rg = g.createRadialGradient(-1.8, -21.2, 0.4, 0, -19.4, 5.4);
      rg.addColorStop(0, shade(col, 0.55)); rg.addColorStop(0.55, col); rg.addColorStop(1, shade(col, -0.32));
      g.fillStyle = rg; g.fill(); g.strokeStyle = out; g.lineWidth = 1.1; g.stroke();
    } else if (kind === 'rook'){
      /* the parapet's band, and a window */
      g.fillStyle = shade(col, -0.25); g.fillRect(-8.3, -20.1, 16.6, 0.9);
      rr(g, -1.1, -14.2, 2.2, 4.4, 1.1); g.fillStyle = shade(col, -0.55); g.fill();
      if (o.trim){ g.fillStyle = '#e8b93a'; g.fillRect(-8.3, -19.2, 16.6, 1.5); g.fillStyle = '#fff2b8'; g.fillRect(-7.6, -19.0, 4, 0.6); }
      if (o.flag){
        g.strokeStyle = '#4a3020'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -25.4); g.lineTo(0, -32); g.stroke();
        const wv = Math.sin((o.time || 0) * 6) * 1.2;
        g.beginPath(); g.moveTo(0, -32); g.quadraticCurveTo(4, -31.4 + wv, 7.5, -30.4 + wv); g.lineTo(0, -28.8); g.closePath();
        g.fillStyle = '#e2383f'; g.fill(); g.strokeStyle = '#8a1e22'; g.lineWidth = 0.6; g.stroke();
      }
    } else if (kind === 'bishop'){
      /* the slit in its mitre, and the ball on top */
      g.strokeStyle = o.glow ? '#ffd166' : shade(col, -0.58); g.lineWidth = o.glow ? 1.6 : 1.3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(2.9, -25.4); g.lineTo(-1.0, -21.2); g.stroke();
      if (o.glow){ g.strokeStyle = 'rgba(255,240,180,0.85)'; g.lineWidth = 0.6; g.stroke(); }
      circle(g, 0, -31.3, 1.8); g.fillStyle = o.trim ? '#f2c14e' : col; g.fill(); g.strokeStyle = out; g.lineWidth = 0.9; g.stroke();
      if (o.trim){ g.strokeStyle = '#e8b93a'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, -17.6, 3.6, 1, 0, 0, Math.PI); g.stroke(); }
    } else if (kind === 'queen'){
      /* her crown: a ball on every point, a dome and a jewel */
      for (const x of [-7.9, -4.8, -1.6, 1.6, 4.8, 7.9]){ const y = Math.abs(x) > 7 ? -29.3 : Math.abs(x) > 4 ? -30.5 : -30.9; circle(g, x, y, 1.15); g.fillStyle = o.trim ? '#ffe08a' : shade(col, 0.2); g.fill(); g.strokeStyle = out; g.lineWidth = 0.7; g.stroke(); }
      ell(g, 0, -28.9, 3.8, 2.5); g.fillStyle = pieceGrad(g, col, 4); g.fill(); g.strokeStyle = out; g.lineWidth = 0.9; g.stroke();
      circle(g, 0, -32.4, 2.2); g.fillStyle = col; g.fill(); g.strokeStyle = out; g.lineWidth = 0.9; g.stroke();
      if (o.gem){ circle(g, 0, -24.4, 1.5); g.fillStyle = '#9b5de5'; g.fill(); g.strokeStyle = '#4a2370'; g.lineWidth = 0.6; g.stroke(); circle(g, -0.5, -24.9, 0.5); g.fillStyle = '#efe0ff'; g.fill(); }
    }
  }
  /* a knight: a horse's head on a round foot, facing left (face 1 turns it right) */
  function knightPiece(g, col, o){
    o = o || {};
    const out = o.out || shade(col, -0.62);
    g.save();
    if (o.face > 0) g.scale(-1, 1);
    symPath(g, FOOT.concat([[0, -3.9]]));
    g.fillStyle = pieceGrad(g, col, 9.4); g.fill(); g.strokeStyle = out; g.lineWidth = 1.1; g.stroke();
    g.beginPath();
    g.moveTo(6.2, -3.9);
    g.bezierCurveTo(7.6, -9.0, 8.2, -15.0, 6.2, -20.6);
    g.bezierCurveTo(5.2, -23.6, 3.4, -25.6, 1.0, -26.6);
    g.lineTo(1.7, -29.7); g.lineTo(-0.8, -27.2); g.lineTo(-1.0, -29.5); g.lineTo(-2.6, -26.6);
    g.bezierCurveTo(-5.4, -25.6, -8.0, -23.0, -9.6, -19.4);
    g.bezierCurveTo(-10.4, -17.8, -10.0, -16.0, -8.4, -15.6);
    g.bezierCurveTo(-7.0, -15.2, -5.6, -16.2, -4.2, -16.0);
    g.bezierCurveTo(-2.6, -14.4, -4.4, -10.8, -5.6, -8.4);
    g.bezierCurveTo(-6.4, -6.6, -6.6, -5.0, -6.2, -3.9);
    g.closePath();
    const lg = g.createLinearGradient(-9.6, 0, 8.2, 0);
    lg.addColorStop(0, shade(col, 0.38)); lg.addColorStop(0.45, col); lg.addColorStop(1, shade(col, -0.34));
    g.fillStyle = lg; g.fill(); g.strokeStyle = out; g.lineWidth = 1.1; g.lineJoin = 'round'; g.stroke();
    /* mane, eye and nostril */
    g.strokeStyle = o.gold ? '#c99a1c' : shade(col, -0.4); g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath(); for (let i = 0; i < 5; i++){ const k = i / 4, x = 6.6 - k * 4.6, y = -9 - k * 15; g.moveTo(x, y); g.lineTo(x - 1.6, y - 1.2); } g.stroke();
    circle(g, -4.5, -21.6, 0.95); g.fillStyle = '#2a1a12'; g.fill();
    circle(g, -8.9, -17.3, 0.55); g.fillStyle = shade(col, -0.55); g.fill();
    if (o.bridle){
      g.strokeStyle = 'rgba(92,52,24,0.85)'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(-3.0, -23.6); g.quadraticCurveTo(-5.6, -18.2, -8.0, -16.6); g.stroke();
      circle(g, -3.1, -18.6, 0.9); g.fillStyle = '#c9363a'; g.fill();
      g.beginPath(); g.moveTo(-6.6, -4.4); g.quadraticCurveTo(0, -8.2, 6.8, -4.4); g.lineTo(6.2, -7.6); g.quadraticCurveTo(0, -11, -6.0, -7.4); g.closePath();
      g.fillStyle = o.gold ? '#9b5de5' : '#2a9d8f'; g.fill(); g.strokeStyle = o.gold ? '#e8b93a' : '#1d6e64'; g.lineWidth = 0.6; g.stroke();
    }
    if (o.armor){
      g.beginPath(); g.moveTo(-2.8, -25.8); g.bezierCurveTo(-5.6, -24.8, -7.8, -22.4, -9.0, -19.6); g.lineTo(-6.6, -19.2); g.bezierCurveTo(-5.6, -21.4, -4.0, -23.4, -1.6, -24.2); g.closePath();
      g.fillStyle = o.gold ? '#f2c14e' : '#c9d2d6'; g.fill(); g.strokeStyle = o.gold ? '#8a6410' : '#5f6a70'; g.lineWidth = 0.7; g.stroke();
      /* a plume */
      g.beginPath(); g.moveTo(1.4, -27.4); g.quadraticCurveTo(5.6, -33.6, 9.4, -30.4); g.quadraticCurveTo(5.4, -30.6, 2.6, -26.0); g.closePath();
      g.fillStyle = o.gold ? '#9b5de5' : '#e2383f'; g.fill();
    }
    if (o.crown){
      g.beginPath(); g.moveTo(-3.2, -27.0); g.lineTo(-3.6, -31.4); g.lineTo(-1.8, -29.4); g.lineTo(-0.2, -32.2); g.lineTo(1.2, -29.4); g.lineTo(2.8, -31.2); g.lineTo(2.4, -26.8); g.closePath();
      g.fillStyle = '#f2c14e'; g.fill(); g.strokeStyle = '#8a6410'; g.lineWidth = 0.7; g.stroke();
    }
    g.restore();
  }
  /* any piece, at (x, y) and scale k */
  function pieceAt(g, kind, x, y, k, col, o){
    g.save(); g.translate(x, y); if (k !== 1) g.scale(k, k);
    if (kind === 'knight') knightPiece(g, col, o); else turnedPiece(g, kind, col, o);
    g.restore();
  }
  /* the square of board it stands on: 4 by 4, with a wooden frame */
  function chessTile(g, gold){
    rr(g, -17, -17, 34, 34, 2.5); fillStroke(g, CH_WOOD, '#2e1c10', 1);
    const n = 4, s = 30 / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++){ g.fillStyle = (i + j) % 2 ? CH_DARK : CH_LIGHT; g.fillRect(-15 + i * s, -15 + j * s, s + 0.05, s + 0.05); }
    g.strokeStyle = gold ? '#e8b93a' : 'rgba(40,24,12,0.65)'; g.lineWidth = gold ? 1.4 : 0.8; g.strokeRect(-15, -15, 30, 30);
  }
  /* which piece a build shows: the path furthest along (the earlier path on a tie), or -1 for the pawn */
  function chessMain(up){ let p = -1, m = 0; for (let i = 0; i < 3; i++) if (up[i] > m){ m = up[i]; p = i; } return p; }
  const CH_KIND = ['rook', 'bishop', 'knight'];
  function drawChess(g, t, up, time, par){
    const col = bodyColor('chess', up, par);
    chessTile(g, par || t.rank >= 8);
    const hop = t.fireAnim > 0 ? Math.sin(clamp(t.fireAnim / 0.2, 0, 1) * Math.PI) * 2.4 : t.fire2 > 0 ? Math.sin(clamp(t.fire2 / 0.3, 0, 1) * Math.PI) * 2.6 : 0;
    const face = t.aimed && t.aim != null && Math.cos(t.aim) > 0.05 ? 1 : -1;
    if (par){
      /* the Checkmate Queen: gold, with a jewel in her crown */
      g.save(); g.globalAlpha *= 0.5; g.strokeStyle = '#d7a6ff'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, 8, 13, 4, 0, 0, TAU); g.stroke(); g.restore();
      pieceAt(g, 'queen', 0, 9 - hop, 0.94, col, { trim: true, gem: true });
      return;
    }
    const p = chessMain(up);
    if (p < 0){ pieceAt(g, 'pawn', 0, 8 - hop, 0.95, col); return; }
    const tier = up[p], kind = CH_KIND[p];
    /* a second piece from the other path, small at the front corner */
    let q = -1;
    for (let i = 0; i < 3; i++) if (i !== p && up[i] > 0) q = i;
    if (kind === 'rook'){
      if (tier >= 5) pieceAt(g, 'rook', 0, 9 - hop, 1.14, col, { trim: true, flag: true, time });
      else if (tier >= 3){ pieceAt(g, 'rook', -6.5, 3.5, 0.8, col, { trim: tier >= 4 }); pieceAt(g, 'rook', 4, 10 - hop, 0.9, col, { trim: tier >= 4 }); }
      else pieceAt(g, 'rook', 0, 8 - hop, 0.98, col);
    } else if (kind === 'bishop'){
      if (tier >= 5){
        g.save(); g.strokeStyle = 'rgba(255,209,102,0.75)'; g.lineWidth = 1.3; g.beginPath(); g.ellipse(0, -22.5 - hop, 8.5, 3, 0, 0, TAU); g.stroke(); g.restore();
        pieceAt(g, 'bishop', 0, 9 - hop, 1.12, col, { trim: true, glow: true });
      } else if (tier >= 3){ pieceAt(g, 'bishop', -6.5, 3.5, 0.82, CH_EBONY, { glow: tier >= 4, out: '#1c110b' }); pieceAt(g, 'bishop', 4, 10 - hop, 0.9, col, { glow: tier >= 4 }); }
      else pieceAt(g, 'bishop', 0, 8 - hop, 0.95, col);
    } else {
      const o = { face, bridle: tier >= 3, armor: tier >= 4, gold: tier >= 5, crown: tier >= 5 };
      pieceAt(g, 'knight', 0, 8 - hop, tier >= 5 ? 1.1 : 1, tier >= 5 ? mixHex('#f2c14e', '#ffffff', 0.25) : col, o);
    }
    if (q >= 0) pieceAt(g, CH_KIND[q], 10.5, 13, 0.5, col, { face });
  }
  /* the dark squares of the kitchen floor under a Colour Complex, wherever the trail runs */
  let boardSq = { key: '', list: [] };
  function boardSquares(){
    const key = G.mapId + ':' + G.paths.length;
    if (boardSq.key === key) return boardSq.list;
    const seen = new Set(), list = [];
    for (const p of trailPoints()){
      for (const o of [-20, 0, 20]){
        const x = p.x - Math.sin(p.ang) * o, y = p.y + Math.cos(p.ang) * o;
        const i = Math.floor(x / SQ), j = Math.floor(y / SQ);
        if (((i + j) & 1) !== 1) continue;
        const k = i + ':' + j;
        if (seen.has(k)) continue;
        seen.add(k); list.push([i * SQ, j * SQ]);
      }
    }
    boardSq = { key, list };
    return list;
  }
  function drawBoard(g, t){
    if (!G.board) return;
    const list = boardSquares(), pulse = 0.16 + 0.04 * Math.sin(t * 2.2);
    g.save();
    g.fillStyle = 'rgba(52,28,86,' + pulse.toFixed(3) + ')';
    for (const [x, y] of list) g.fillRect(x, y, SQ, SQ);
    g.strokeStyle = 'rgba(215,166,255,0.16)'; g.lineWidth = 1;
    for (const [x, y] of list) g.strokeRect(x + 0.5, y + 0.5, SQ - 1, SQ - 1);
    g.restore();
  }
  /* a knight in mid-leap: its shadow on the floor, the knight up in the air, a faint trail of its L */
  function drawLeap(g, L, t){
    const a = L.spec, glow = a.piece === 'knight' && L.tw && L.tw.paragon ? '#d7a6ff' : '#7fe0c8';
    g.save();
    g.globalAlpha = 0.5;
    g.strokeStyle = glow; g.lineWidth = 1.4; g.setLineDash([3, 4]);
    const dx = L.x1 - L.x0, dy = L.y1 - L.y0, cx = Math.abs(dx) >= Math.abs(dy) ? L.x1 : L.x0, cy = Math.abs(dx) >= Math.abs(dy) ? L.y0 : L.y1;
    g.beginPath(); g.moveTo(L.x0, L.y0); g.lineTo(cx, cy); g.lineTo(L.x1, L.y1); g.stroke(); g.setLineDash([]);
    g.globalAlpha = 0.25; ell(g, L.x, L.y + 2, 8, 3); g.fillStyle = '#000'; g.fill();
    g.globalAlpha = 1;
    const k = L.tw && L.tw.paragon ? 0.72 : 0.62, col = L.tw && L.tw.paragon ? '#f6dd8a' : '#f6ecd6';
    g.translate(L.x, L.y - L.z + 7);
    circle(g, 0, -10, 13); g.fillStyle = rgbaStr(glow, 0.18); g.fill();
    pieceAt(g, 'knight', 0, 0, k, col, { face: L.face, armor: !!(L.tw && L.tw.up && L.tw.up[2] >= 4) || !!(L.tw && L.tw.paragon), gold: !!(L.tw && (L.tw.paragon || (L.tw.up && L.tw.up[2] >= 5))) });
    g.restore();
  }
  /* a pawn promoted to a queen beside the trail: she fades in, glows while she lasts, and fades out */
  function drawQueenlet(g, q, t){
    const a = clamp(q.t / 0.35, 0, 1) * clamp(q.life / 1.2, 0, 1);
    if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.translate(q.x, q.y);
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, 2, 4, 9, 3.5); g.fill();
    g.strokeStyle = 'rgba(215,166,255,0.8)'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 3, 11, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(q.life / q.max, 0, 1)); g.stroke();
    pieceAt(g, 'queen', 0, 4 - (q.fire > 0 ? 2 : 0), 0.62, '#f6dd8a', { trim: true, gem: true });
    g.restore();
  }
  /* one of the Queen's pawns marching up the trail */
  function drawMarchPawn(g, w, t){
    const a = clamp(w.t / 0.3, 0, 1) * clamp(w.left / 30, 0, 1) * (0.55 + 0.45 * clamp(w.pierce / (w.pmax || 1), 0, 1));
    if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.translate(w.x, w.y);
    g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, 1.5, 3, 7, 2.6); g.fill();
    pieceAt(g, 'pawn', 0, 3 - Math.abs(Math.sin(t * 9 + w.seed)) * 2.2, 0.55, '#f6dd8a', { out: '#6a4a10' });
    g.restore();
  }
  /* ---------------- chopsticks ----------------
     A pair of chopsticks lying across a little rest near their tips, pointing +x: the tips close as they pinch and
     dart forward as they flick. The look follows the path furthest along: bamboo (more pairs, then a jade-green
     tempest), red lacquer turning to ebony tongs, or gold; the Grandmaster is jade and gold. */
  const STICK_PAL = {
    plain:   { c:'#e3c391', d:'#8a5a2b', tip:'#c9985c', hi:'#f8e6c6' },
    bamboo:  { c:'#dcc781', d:'#7d6a2e', tip:'#c4ad5f', hi:'#f5e9bb', node:'#9c8540' },
    tempest: { c:'#a3d66e', d:'#2f6a1a', tip:'#e4f6b4', hi:'#dcf6bc', node:'#4f8a2e' },
    lacquer: { c:'#b8282c', d:'#560e11', tip:'#f2c14e', hi:'#ea7a72', band:'#f2c14e' },
    ebony:   { c:'#30282a', d:'#0c0908', tip:'#e6c35a', hi:'#7c6c64', band:'#c9a227' },
    goldtip: { c:'#e3c391', d:'#8a5a2b', tip:'#f2c14e', hi:'#f8e6c6' },
    gold:    { c:'#f2c14e', d:'#946410', tip:'#fff2b8', hi:'#fff6d6', band:'#fff2b8' },
    grand:   { c:'#3fae8a', d:'#15503c', tip:'#f2c14e', hi:'#a6ead0', band:'#f2c14e' },
  };
  const REST_COL = { porcelain:'#f4f1ea', bamboo:'#8fbf5a', lacquer:'#2a2220', ebony:'#2a2220', ingot:'#f2c14e', jade:'#3fae8a' };
  /* what a build looks like: the sticks' finish, the rest, how many pairs, how long and how thick */
  function chopStyle(up, par){
    if (par) return { pal:'grand', rest:'jade', pairs:1, len:25, w:3.9, p:-1, tier:5, par:true };
    let p = -1, m = 0;
    for (let i = 0; i < 3; i++) if (up[i] > m){ m = up[i]; p = i; }
    const S = { pal:'plain', rest:'porcelain', pairs:1, len:20, w:3.3, p, tier:m };
    if (p === 0){ S.pal = m >= 5 ? 'tempest' : 'bamboo'; S.rest = 'bamboo'; S.pairs = m >= 3 ? 3 : m >= 2 ? 2 : 1; }
    else if (p === 1){ S.pal = m >= 4 ? 'ebony' : 'lacquer'; S.rest = m >= 4 ? 'ebony' : 'lacquer'; if (m >= 2) S.len += 4; if (m >= 3){ S.len += 2; S.w = 4; } }
    else if (p === 2){ S.pal = m >= 3 ? 'gold' : 'goldtip'; S.rest = m >= 4 ? 'ingot' : 'porcelain'; }
    /* a second path shows a little: gold tips, a red band, a bamboo leaf on the rest */
    S.tips = p !== 2 && up[2] > 0; S.band = p !== 1 && up[1] > 0; S.leaf = p !== 0 && up[0] > 0;
    return S;
  }
  /* how shut the tips are (0 open, 1 shut): they close fast on a pinch, hold, then open again */
  function chopShut(t){
    if (!t || !(t.fireAnim > 0)) return 0;
    const q = 1 - clamp(t.fireAnim / 0.3, 0, 1);
    return q < 0.25 ? q / 0.25 : q > 0.72 ? (1 - q) / 0.28 : 1;
  }
  /* a flick: the sticks dart forward and back */
  function chopJab(t){ return t && t.fire2 > 0 ? Math.sin(clamp(t.fire2 / 0.2, 0, 1) * Math.PI) * 6 : 0; }
  /* one chopstick from its back end (x0, y0) to its tip (x1, y1), w thick at the back and tapering; o: { tip, band } */
  function chopstick(g, x0, y0, x1, y1, w, pal, o){
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 1) return;
    const wt = w * 0.42, tp = 0.26, tipC = (o && o.tip) || pal.tip, band = (o && o.band) || pal.band;
    g.save(); g.translate(x0, y0); g.rotate(Math.atan2(y1 - y0, x1 - x0));
    const outline = () => { g.beginPath(); g.moveTo(0, -w / 2); g.lineTo(L, -wt / 2); g.quadraticCurveTo(L + wt * 0.7, 0, L, wt / 2); g.lineTo(0, w / 2); g.closePath(); };
    outline(); g.fillStyle = pal.c; g.fill();
    if (tipC){
      const x = L * (1 - tp), wx = w + (wt - w) * (1 - tp);
      g.beginPath(); g.moveTo(x, -wx / 2); g.lineTo(L, -wt / 2); g.quadraticCurveTo(L + wt * 0.7, 0, L, wt / 2); g.lineTo(x, wx / 2); g.closePath();
      g.fillStyle = tipC; g.fill();
    }
    if (pal.node){ g.strokeStyle = pal.node; g.lineWidth = 0.7; for (const q of [0.24, 0.52]){ const x = L * q, wx = w + (wt - w) * q; g.beginPath(); g.moveTo(x, -wx / 2); g.lineTo(x, wx / 2); g.stroke(); } }
    if (band){ g.fillStyle = band; g.fillRect(L * 0.09, -w / 2, Math.max(1, w * 0.42), w); }
    g.save(); g.globalAlpha *= 0.75; g.strokeStyle = pal.hi; g.lineWidth = Math.max(0.5, w * 0.2); g.lineCap = 'round';
    g.beginPath(); g.moveTo(1, -w * 0.2); g.lineTo(L * 0.8, -wt * 0.3); g.stroke(); g.restore();
    outline(); g.strokeStyle = pal.d; g.lineWidth = 0.7; g.lineJoin = 'round'; g.stroke();
    g.restore();
  }
  /* the rest the sticks lie on, its long side across them, centred on (x, 0) */
  function chopRest(g, kind, x, hl){
    const w = 7.2;
    switch (kind){
      case 'bamboo':
        rr(g, x - w / 2, -hl, w, hl * 2, w / 2); fillStroke(g, '#8fbf5a', '#3d6a22', 0.9);
        g.strokeStyle = '#4f7f2c'; g.lineWidth = 1;
        for (const y of [-hl * 0.42, hl * 0.42]){ g.beginPath(); g.moveTo(x - w / 2 + 0.5, y); g.lineTo(x + w / 2 - 0.5, y); g.stroke(); }
        g.strokeStyle = 'rgba(232,250,205,0.65)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x - 1.5, -hl + 2.2); g.lineTo(x - 1.5, hl - 2.2); g.stroke();
        break;
      case 'lacquer': case 'ebony':
        rr(g, x - w / 2, -hl, w, hl * 2, 2); fillStroke(g, '#2a2220', '#0c0908', 0.9);
        if (kind === 'lacquer'){ rr(g, x - w / 2 + 1.1, -hl + 1.1, w - 2.2, hl * 2 - 2.2, 1.3); g.fillStyle = '#b8282c'; g.fill(); }
        else { g.fillStyle = '#c9a227'; g.fillRect(x - w / 2 + 0.4, -hl + 0.4, w - 0.8, 2); g.fillRect(x - w / 2 + 0.4, hl - 2.4, w - 0.8, 2); }
        break;
      case 'ingot':
        /* a gold ingot: a little boat of gold with a mound in the middle */
        g.beginPath(); g.moveTo(x, -hl - 1.5);
        g.quadraticCurveTo(x + w * 0.95, -hl * 0.55, x + w * 0.5, 0); g.quadraticCurveTo(x + w * 0.95, hl * 0.55, x, hl + 1.5);
        g.quadraticCurveTo(x - w * 0.95, hl * 0.55, x - w * 0.5, 0); g.quadraticCurveTo(x - w * 0.95, -hl * 0.55, x, -hl - 1.5); g.closePath();
        fillStroke(g, '#f2c14e', '#946410', 0.9);
        ell(g, x, 0, w * 0.34, hl * 0.4); g.fillStyle = '#ffe08a'; g.fill(); g.strokeStyle = '#b8861b'; g.lineWidth = 0.6; g.stroke();
        ell(g, x - 0.8, -hl * 0.18, 0.8, hl * 0.14); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
        break;
      case 'jade':
        rr(g, x - w / 2 - 0.4, -hl - 0.6, w + 0.8, hl * 2 + 1.2, 3); fillStroke(g, '#3fae8a', '#15503c', 0.9);
        g.fillStyle = '#f2c14e'; g.fillRect(x - w / 2, -hl - 0.2, w, 1.8); g.fillRect(x - w / 2, hl - 1.6, w, 1.8);
        g.strokeStyle = 'rgba(200,255,230,0.6)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x - 1.6, -hl + 3); g.quadraticCurveTo(x + 1.2, 0, x - 1.6, hl - 3); g.stroke();
        break;
      default:
        /* porcelain with a blue pattern (a skin recolours it) */
        rr(g, x - w / 2, -hl, w, hl * 2, w / 2); fillStroke(g, SKIN && SKIN.body ? skinBody(SKIN) : '#f4f1ea', '#9aa4aa', 0.9);
        g.strokeStyle = '#4f86c6'; g.lineWidth = 0.8;
        for (const y of [-hl * 0.55, 0, hl * 0.55]){ g.beginPath(); g.moveTo(x - 2, y - 0.8); g.quadraticCurveTo(x, y + 1, x + 2, y - 0.8); g.stroke(); }
    }
  }
  function bambooLeaf(g, x, y, a, s){
    g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
    g.beginPath(); g.moveTo(-4.5, 0); g.quadraticCurveTo(0, -2.2, 4.5, 0); g.quadraticCurveTo(0, 2.2, -4.5, 0); g.closePath();
    fillStroke(g, '#6fae3a', '#2f5f1a', 0.5);
    g.strokeStyle = 'rgba(220,245,190,0.7)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(-3.6, 0); g.lineTo(3.6, 0); g.stroke();
    g.restore();
  }
  const CH_FAN = [[0], [-0.16, 0.16], [-0.3, 0, 0.3]];
  function drawChopsticks(g, t, up, time, par){
    const S = chopStyle(up, par), pal = STICK_PAL[S.pal];
    const shut = chopShut(t), jab = chopJab(t);
    const RX = 3, hl = S.pairs > 1 ? 11 : 9, back = -16, pivot = -15, fan = CH_FAN[S.pairs - 1];
    if (par){
      g.save(); g.globalAlpha *= 0.55; g.strokeStyle = '#ffd166'; g.lineWidth = 1.4; g.setLineDash([3, 3]); g.lineDashOffset = -time * 8;
      g.beginPath(); g.ellipse(2, 0, 25, 14, 0, 0, TAU); g.stroke(); g.setLineDash([]); g.restore();
    }
    /* Thousand Flicks and up: the sticks move too fast to see, a blur either side of them */
    if (S.p === 0 && S.tier >= 4){
      g.save(); g.globalAlpha *= 0.22;
      for (const d of [-1, 1]) for (const a of fan){ g.save(); g.translate(pivot, 0); g.rotate(a + d * 0.14); g.translate(-pivot, 0); chopstick(g, back, -2.4, S.len + 2, 0, S.w, pal); g.restore(); }
      g.restore();
    }
    chopRest(g, S.rest, RX, hl);
    if (S.leaf){ bambooLeaf(g, RX + 3.5, hl + 1.5, 0.6, 0.85); bambooLeaf(g, RX + 6, hl - 1, -0.3, 0.7); }
    const L = S.len + shut * 3 + jab, gap = 2.2 * (1 - shut) + 0.35, bg = 3.2;
    const o = { tip: S.tips ? '#f2c14e' : null, band: S.band ? '#b8282c' : null };
    for (const a of fan){
      g.save(); g.translate(pivot, 0); g.rotate(a); g.translate(-pivot, 0);
      chopstick(g, back, -bg, L, -gap, S.w, pal, o);
      chopstick(g, back + 1.2, bg, L - 1, gap, S.w, pal, o);
      g.restore();
    }
    /* Ebony Tongs: a steel spring joins the back ends; the Legend hangs a red tassel off it */
    if (S.p === 1 && S.tier >= 4){
      g.lineCap = 'round';
      if (S.tier >= 5){
        g.strokeStyle = '#c9282c'; g.lineWidth = 1.1;
        for (const d of [-1.6, -0.5, 0.6, 1.7]){ g.beginPath(); g.moveTo(back - 4.6, 0); g.quadraticCurveTo(back - 7, d * 0.8, back - 10.5, d * 1.6 + Math.sin(time * 3 + d) * 0.6); g.stroke(); }
        circle(g, back - 4.8, 0, 1.4); fillStroke(g, '#f2c14e', '#946410', 0.5);
        g.fillStyle = '#e6c35a'; for (const q of [0.35, 0.55, 0.75]) for (const sd of [-1, 1]){ circle(g, back + (L - back) * q, sd * (bg + (gap - bg) * q), 0.55); g.fill(); }
      }
      g.strokeStyle = '#5c666b'; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(back + 1, -bg); g.bezierCurveTo(back - 5, -bg - 1, back - 5, bg + 1, back + 2, bg); g.stroke();
      g.strokeStyle = '#dfe7ea'; g.lineWidth = 0.8; g.stroke();
    }
    /* Golden Dragon: the back ends carved as dragon heads, glinting */
    if (S.p === 2 && S.tier >= 5){
      for (const sd of [-1, 1]){
        const x = back - 1.2 + (sd > 0 ? 1.2 : 0), y = sd * bg;
        g.save(); g.translate(x, y); g.rotate(Math.PI + sd * 0.25);
        g.beginPath(); g.moveTo(-2, -1.9); g.quadraticCurveTo(2.6, -2.4, 3.6, 0); g.quadraticCurveTo(2.6, 2.4, -2, 1.9); g.closePath(); fillStroke(g, '#f2c14e', '#946410', 0.6);
        g.strokeStyle = '#946410'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-1.6, -1.6); g.lineTo(-3.4, -2.8); g.moveTo(-1.6, 1.6); g.lineTo(-3.4, 2.8); g.stroke();
        circle(g, 1.2, -0.9, 0.5); g.fillStyle = '#d9332a'; g.fill();
        g.restore();
      }
      glint(g, L - 2, -gap - 1.5, 2.2 + Math.sin(time * 5) * 0.8, 0.85);
    }
    /* Bamboo Tempest: leaves whirl round it */
    if (S.p === 0 && S.tier >= 5) for (let i = 0; i < 5; i++){ const an = time * 1.6 + i * TAU / 5; bambooLeaf(g, 2 + Math.cos(an) * 19, Math.sin(an) * 15, an + Math.PI / 2, 0.9); }
    if (par){ for (let i = 0; i < 2; i++){ const an = time * 2.2 + i * Math.PI; glint(g, 2 + Math.cos(an) * 24, Math.sin(an) * 13, 2.6, 0.9); } }
  }
  /* chopsticks holding something from above: their tips round (0, 0), something r big between them, reaching up
     and to the right; open (0 to 1) parts the tips as they let go */
  function holdSticks(g, look, r, open){
    const pal = STICK_PAL[look] || STICK_PAL.plain, rr2 = Math.min(r, 44), L = 24 + rr2 * 1.25, w = 2.6 + rr2 * 0.05;
    const an = -1.05, ca = Math.cos(an), sa = Math.sin(an), px = -sa, py = ca;
    const grip = rr2 * 0.62 + open * 7, end = 2.6 + rr2 * 0.04;
    for (const sd of [-1, 1]) chopstick(g, ca * L + px * sd * end, sa * L + py * sd * end, px * sd * grip, py * sd * grip, w, pal);
  }

  /* ---------------- the lazy susan ----------------
     A round wooden board turning on a bearing. Whatever rides on it is drawn by itself, on top, so the board shows
     where its seats are; the grain, the inlays and the sauce cups turn with it. */
  const SEAT_RING = [0, 0, 12, 14, 16];
  const SAUCE_COL = ['#c9362a', '#c9362a', '#e2462a', '#b8501a', '#b8501a', '#8a3a14'];
  function susanSeats(t, up, par){ return par ? 4 : Math.max(1, Math.min(4, (t.s && t.s.seats) || (1 + (up[1] >= 1 ? 1 : 0) + (up[1] >= 3 ? 1 : 0)))); }
  /* a gravy boat seen from above, pointing +x */
  function gravyBoat(g, x, y, a){
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.moveTo(6.2, 0); g.quadraticCurveTo(3, -3.6, -3.4, -2.8); g.quadraticCurveTo(-5.2, 0, -3.4, 2.8); g.quadraticCurveTo(3, 3.6, 6.2, 0); g.closePath();
    fillStroke(g, '#f6f1e6', '#9aa4aa', 0.7);
    ell(g, 0, 0, 3.6, 1.9); g.fillStyle = '#7a3a14'; g.fill();
    g.strokeStyle = '#f6f1e6'; g.lineWidth = 1.2; g.beginPath(); g.arc(-4.6, 0, 1.8, Math.PI * 0.55, Math.PI * 1.45); g.stroke();
    g.restore();
  }
  function drawSusan(g, t, up, time, par){
    const [a, b, c] = up, R = 23, n = susanSeats(t, up, par), spin = t.spinA || 0;
    const wood = bodyColor('susan', up, par), dark = shade(wood, -0.5);
    /* Quick Turn and faster: the air streams past its edge */
    if ((a >= 2 || par) && !t.icon){
      g.save(); g.lineCap = 'round'; g.lineWidth = 1.4; g.strokeStyle = par ? 'rgba(255,209,102,0.75)' : a >= 5 ? 'rgba(127,211,255,0.75)' : 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 3; i++){ const an = spin + i * TAU / 3; g.beginPath(); g.arc(0, 0, R + 2.8, an - 0.9, an); g.stroke(); }
      g.restore();
    }
    if (a >= 5 && !par && !t.icon){ g.save(); g.globalAlpha *= 0.5 + 0.2 * Math.sin(time * 6); g.strokeStyle = '#7fd3ff'; g.lineWidth = 3; circle(g, 0, 0, R + 0.8); g.stroke(); g.restore(); }
    /* the board */
    circle(g, 0, 0, R); fillStroke(g, wood, dark, 1.2);
    /* the lip round its edge: steel on Whirling Platter, gold on Grand Banquet (a carousel's is striped, below) */
    if (!par){
      g.strokeStyle = a >= 4 ? '#c9d2d6' : b >= 5 ? '#e8b93a' : shade(wood, -0.22); g.lineWidth = b >= 2 ? 3.2 : 2.2; circle(g, 0, 0, R - 1.6); g.stroke();
      if (b >= 2){ g.strokeStyle = rgbaStr(dark, 0.6); g.lineWidth = 0.8; circle(g, 0, 0, R - 3.6); g.stroke(); }
    }
    /* rings of grain */
    g.strokeStyle = rgbaStr(shade(wood, -0.35), 0.32); g.lineWidth = 0.7;
    for (const r of [5.5, 10, 14.5, 18.5]){ circle(g, 0, 0, r); g.stroke(); }
    /* everything set into the board turns with it */
    g.save(); g.rotate(spin);
    g.strokeStyle = rgbaStr(shade(wood, -0.4), 0.45); g.lineWidth = 0.9; g.lineCap = 'round';
    for (const [r, a0, a1] of [[16.5, 0.3, 1.1], [8, 2.2, 3.0], [12.5, 4.1, 4.6], [19.8, 3.3, 3.8]]){ g.beginPath(); g.arc(0, 0, r, a0, a1); g.stroke(); }
    ell(g, 11, -6, 1.6, 1.1, 0.5); g.fillStyle = rgbaStr(shade(wood, -0.45), 0.6); g.fill();
    if (par){
      /* the carousel's rim: red and cream panels in gold */
      g.lineWidth = 3.4;
      for (let i = 0; i < 16; i++){ g.strokeStyle = i % 2 ? '#fff3dc' : '#c9363a'; g.beginPath(); g.arc(0, 0, R - 1.7, i / 16 * TAU, (i + 1) / 16 * TAU); g.stroke(); }
      g.strokeStyle = '#b8861b'; g.lineWidth = 0.8; circle(g, 0, 0, R - 3.6); g.stroke();
    }
    /* Extra Leaf: the seam where the two halves meet */
    if (b >= 1 && !par){ g.strokeStyle = rgbaStr(dark, 0.55); g.lineWidth = 0.9; g.beginPath(); g.moveTo(-R + 2, 0); g.lineTo(R - 2, 0); g.stroke(); }
    /* Banquet Board: a lace doily round the edge */
    if (b >= 3 && !par){
      g.beginPath();
      for (let i = 0; i <= 48; i++){ const an = i / 48 * TAU, r = 20.6 + (i % 2 ? 0 : 1.1); i ? g.lineTo(Math.cos(an) * r, Math.sin(an) * r) : g.moveTo(Math.cos(an) * r, Math.sin(an) * r); }
      g.closePath(); g.moveTo(17.4, 0); g.arc(0, 0, 17.4, TAU, 0, true);
      g.fillStyle = 'rgba(255,252,244,0.88)'; g.fill('evenodd');
      g.fillStyle = rgbaStr(wood, 0.9); for (let i = 0; i < 24; i++){ const an = (i + 0.5) / 24 * TAU; circle(g, Math.cos(an) * 19.3, Math.sin(an) * 19.3, 0.65); g.fill(); }
    }
    /* Spin Cycle: a blue spiral inlaid in it; Sauce Cyclone: a swirl of sauce */
    if (!par && (a >= 3 || c >= 4)){
      const sauce = c >= 4 && c >= a;
      g.strokeStyle = sauce ? rgbaStr(SAUCE_COL[c], 0.8) : 'rgba(79,134,198,0.8)'; g.lineWidth = sauce ? 2 : 1.2;
      g.beginPath(); for (let i = 0; i <= 40; i++){ const q = i / 40, an = q * TAU * 1.5, r = 3 + q * 15.5; i ? g.lineTo(Math.cos(an) * r, Math.sin(an) * r) : g.moveTo(Math.cos(an) * r, Math.sin(an) * r); } g.stroke();
    }
    /* the seats, marked out */
    g.setLineDash([2, 2]); g.lineWidth = 1; g.strokeStyle = par ? 'rgba(138,26,30,0.45)' : rgbaStr(dark, 0.35);
    for (let i = 0; i < n; i++){ const an = i / n * TAU, r = n > 1 ? SEAT_RING[n] : 0; circle(g, Math.cos(an) * r, Math.sin(an) * r, 7.5); g.stroke(); }
    g.setLineDash([]);
    /* sauce cups between the seats; drips over the edge on Sticky Glaze; a gravy boat on Saucier Supreme */
    if (c >= 1 && !par){
      const m = n === 3 ? 3 : 4, col = SAUCE_COL[c];
      for (let i = 0; i < m; i++){
        const an = (i + 0.5) / m * TAU, x = Math.cos(an) * 18.5, y = Math.sin(an) * 18.5;
        if (c >= 3){ ell(g, Math.cos(an) * 22.4, Math.sin(an) * 22.4, 1.9, 1.3, an); g.fillStyle = col; g.fill(); }
        if (c >= 5 && i === 0){ gravyBoat(g, x, y, an + Math.PI / 2); continue; }
        circle(g, x, y, 3.5); fillStroke(g, '#f6f1e6', '#9aa4aa', 0.7);
        circle(g, x, y, 2.5); g.fillStyle = col; g.fill();
        circle(g, x - 0.8, y - 0.8, 0.7); g.fillStyle = 'rgba(255,255,255,0.65)'; g.fill();
        if (c >= 2 && i === 1){ g.save(); g.translate(x + Math.cos(an + 1.4) * 5, y + Math.sin(an + 1.4) * 5); g.rotate(an); g.beginPath(); g.moveTo(-3, -0.8); g.quadraticCurveTo(1, -1.6, 3.4, 0.8); g.quadraticCurveTo(0.6, 1, -3, 0.8); g.closePath(); fillStroke(g, '#d9332a', '#8a1a14', 0.5); g.fillStyle = '#4f9a45'; g.fillRect(-4, -0.6, 1.2, 1.2); g.restore(); }
      }
    }
    /* the carousel: brass poles between the seats */
    if (par) for (let i = 0; i < 4; i++){
      const an = (i + 0.5) / 4 * TAU, x = Math.cos(an) * 19.5, y = Math.sin(an) * 19.5;
      circle(g, x, y, 2.3); fillStroke(g, '#f2c14e', '#946410', 0.7); circle(g, x - 0.7, y - 0.7, 0.8); g.fillStyle = '#fff6d6'; g.fill();
    }
    g.restore();
    /* the middle: the carousel's crown, a cake on the Two-Tier Stand, or the hub */
    if (par){
      circle(g, 0, 0, 5); fillStroke(g, '#f2c14e', '#946410', 0.8); circle(g, -1.4, -1.4, 1.6); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
      const wv = Math.sin(time * 5) * 1.2;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(4, -1 + wv, 8, wv * 0.5); g.lineTo(0, 2.6); g.closePath(); fillStroke(g, '#c9363a', '#7a1a1e', 0.5);
    } else if (b >= 4 && n >= 3){
      circle(g, 0, 0, 7.6); fillStroke(g, '#f6f1e6', b >= 5 ? '#c9a227' : '#9aa4aa', b >= 5 ? 1.4 : 0.8);
      circle(g, 0, 0, 5.2); fillStroke(g, '#f4b8c8', '#c96a86', 0.8);
      g.strokeStyle = '#ffffff'; g.lineWidth = 1; circle(g, 0, 0, 3.6); g.stroke();
      circle(g, 0.4, -0.4, 1.5); fillStroke(g, '#d9232a', '#7a1012', 0.5);
    } else if (n > 1){ circle(g, 0, 0, 3); fillStroke(g, '#c9d2d6', '#5c666b', 0.8); circle(g, -0.8, -0.8, 1); g.fillStyle = '#ffffff'; g.fill(); }
    else { circle(g, 0, 0, 1.7); g.fillStyle = shade(wood, -0.3); g.fill(); }
    /* in the shop: two arrows round the edge, to show it turns */
    if (t.icon){
      g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = 2; g.lineCap = 'round';
      for (const a0 of [0.35, 0.35 + Math.PI]){
        g.beginPath(); g.arc(0, 0, R - 6.5, a0, a0 + 1.5); g.stroke();
        const ex = Math.cos(a0 + 1.5) * (R - 6.5), ey = Math.sin(a0 + 1.5) * (R - 6.5), ta = a0 + 1.5 + Math.PI / 2;
        g.beginPath(); g.moveTo(ex + Math.cos(ta - 2.5) * 4, ey + Math.sin(ta - 2.5) * 4); g.lineTo(ex, ey); g.lineTo(ex + Math.cos(ta + 2.5) * 4, ey + Math.sin(ta + 2.5) * 4); g.stroke();
      }
    }
  }
  const TOWER_DRAW = { knife:drawKnife, toaster:drawToaster, blender:drawBlender, dish:drawDish, grill:drawGrill, fryer:drawFryer, freezer:drawFreezer, micro:drawMicro, siphon:drawSiphon, oven:drawOven, mixer:drawMixer, pasta:drawPasta, espresso:drawEspresso, bread:drawBread, gatling:drawGatling,
    boat:drawBoat, sub:drawSub, heli:drawHeli, saucer:drawSaucer, mandoline:drawMandoline, caddy:drawCaddy, saucepan:drawSaucepan, bot:drawBot, pets:drawPets, lobster:drawLobster, chess:drawChess, chopsticks:drawChopsticks, susan:drawSusan, spray:drawSpray, rice:drawRice, chef_blaze:drawChef, chef_gelato:drawChef, chef_penny:drawChef, chef_kenji:drawChef, chef_nonna:drawChef, chef_bruno:drawChef };
  /* Looks that turn to face what they attack, and which way their art faces before it turns (radians). Most point
     along +x; the boxy front-panel appliances face down the screen (+y), toward the viewer, and keep that pose until
     their first shot. Radial and area appliances (blender, freezer, pasta maker, saucer) and support ones don't turn. */
  const ROTATES = { knife:0, toaster:0, micro:0, siphon:0, gatling:0, boat:0, sub:0, heli:0, grill:0, mandoline:0, caddy:0, bot:0, lobster:0, chopsticks:0, spray:0,
    dish: Math.PI / 2, fryer: Math.PI / 2, oven: Math.PI / 2, mixer: Math.PI / 2,
    chef_blaze:0, chef_gelato:0, chef_penny:0, chef_kenji:0, chef_nonna:0, chef_bruno:0 };
  function turnOf(t, look){
    const f = ROTATES[look];
    if (f == null) return 0;
    if (f !== 0 && !t.aimed) return 0;
    return (t.aim != null ? t.aim : -Math.PI / 2) - f;
  }
  /* the throw: each shot rocks the appliance back along its facing, then it settles (chopsticks reach forward
     instead, in their own art) */
  function recoil(t){ return t.fireAnim > 0 ? -Math.min(t.fireAnim, 0.22) * 13 : 0; }
  const NO_KICK = { chopsticks: true };
  function kickOf(t, look){ return NO_KICK[look] ? 0 : recoil(t); }
  /* looks that sit on a landing pad when they are not flying */
  const PAD_LOOK = { heli:'copter', saucer:'saucer' };

  function glint(g, x, y, r, a){
    g.save(); g.globalAlpha *= a; g.fillStyle = '#fffbe6';
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
    g.restore();
  }
  function flake(g, x, y, r, rot){
    g.save(); g.translate(x, y); g.rotate(rot);
    g.beginPath();
    for (let i = 0; i < 3; i++){ const a = i / 3 * Math.PI; g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(-Math.cos(a) * r, -Math.sin(a) * r); }
    g.stroke(); g.restore();
  }
  const SPRINKLES = ['#ff5d8f', '#ffd23f', '#3ec1d3', '#9b5de5', '#06d6a0', '#ff8c42'];
  /* the animated extras a skin adds around an appliance */
  function drawSkinFx(g, t, s, time, sc){
    const R = t.size * sc, seed = ((t.id || 0) * 1.7) % TAU;
    g.save(); g.translate(t.x, t.y);
    switch (s.fx){
      case 'shine': {
        const k = (time * 0.32 + seed) % 1;
        if (k < 0.4) glint(g, -R * 0.55 + k / 0.4 * R * 1.1, -R * 0.5 + k / 0.4 * R * 0.35, 3.6, Math.sin(k / 0.4 * Math.PI));
        break;
      }
      case 'sparkle':
        for (let i = 0; i < 3; i++){
          const a = Math.sin(time * 2.6 + i * 2.1 + seed);
          if (a > 0.05){ const an = i * 2.1 + seed; glint(g, Math.cos(an) * R * 0.78, Math.sin(an) * R * 0.78, 3 + a * 2, a); }
        }
        break;
      case 'stars':
        for (let i = 0; i < 5; i++){
          const an = i / 5 * TAU + seed, rr2 = R * (1.08 + (i % 2) * 0.2);
          g.globalAlpha = 0.3 + 0.7 * Math.max(0, Math.sin(time * 2 + i * 1.7));
          star(g, Math.cos(an) * rr2, Math.sin(an) * rr2, 2.4, '#fff4c2');
        }
        g.globalAlpha = 1;
        break;
      case 'frost':
        g.strokeStyle = 'rgba(232,247,255,0.95)'; g.lineWidth = 1.1; g.lineCap = 'round';
        for (let i = 0; i < 4; i++){ const an = i / 4 * TAU + time * 0.25 + seed; flake(g, Math.cos(an) * R * 1.14, Math.sin(an) * R * 1.14, 3.2, time * 0.6 + i); }
        break;
      case 'embers':
        for (let i = 0; i < 5; i++){
          const k = (time * 0.55 + i / 5 + seed) % 1;
          g.globalAlpha = (1 - k) * 0.9;
          circle(g, Math.sin(i * 2.3 + seed) * R * 0.75 + Math.sin(time * 2 + i) * 2, -R * 0.2 - k * R * 1.3, 1.7 * (1 - k * 0.5));
          g.fillStyle = i % 2 ? '#ffb347' : '#ff5a1f'; g.fill();
        }
        g.globalAlpha = 1;
        break;
      case 'neon': {
        const hue = Math.round(time * 60 + seed * 30) % 360;
        g.strokeStyle = 'hsla(' + hue + ',100%,60%,0.25)'; g.lineWidth = 6; circle(g, 0, 0, R * 1.22); g.stroke();
        g.strokeStyle = 'hsla(' + hue + ',100%,66%,0.95)'; g.lineWidth = 2; circle(g, 0, 0, R * 1.22); g.stroke();
        break;
      }
      case 'sprinkles':
        for (let i = 0; i < 6; i++){
          const an = i / 6 * TAU + time * 0.4 + seed;
          g.save(); g.translate(Math.cos(an) * R * 1.16, Math.sin(an) * R * 1.16); g.rotate(an * 2 + i);
          rr(g, -2.5, -0.95, 5, 1.9, 0.95); g.fillStyle = SPRINKLES[i]; g.fill(); g.restore();
        }
        break;
      case 'rainbow':
        g.lineWidth = 2.5;
        for (let i = 0; i < 6; i++){
          const a0 = i / 6 * TAU + time * 0.8;
          g.strokeStyle = 'hsla(' + Math.round(i * 60 + time * 50) % 360 + ',90%,60%,0.85)';
          g.beginPath(); g.arc(0, 0, R * 1.2, a0, a0 + TAU / 6 - 0.1); g.stroke();
        }
        break;
    }
    g.restore();
  }
  /* custom appliances wear a small star badge so they stand apart from the originals */
  function drawCustomBadge(g, t, sc){
    const R = t.size * sc;
    g.save(); g.translate(t.x + R * 0.8, t.y + R * 0.72);
    circle(g, 0, 0, 6.2); fillStroke(g, '#7b5cff', '#ffffff', 1.4);
    star(g, 0, 0.3, 3.9, '#ffffff');
    g.restore();
  }
  /* ---------------- solid (3D) appliances ----------------
     Appliances stand as solid objects: the top-down art is painted into a small offscreen canvas at
     screen resolution, a darkened copy of it is stacked beneath, layer by layer, to make the sides
     (shaded darker toward the floor), and the top sits raised by the appliance's height above a
     soft shadow. Ground marks (rings, range, shadow) stay on the floor. */
  const SOLID = {};
  function solidCanvas(key, w, hgt){
    let c = SOLID[key];
    if (!c) c = SOLID[key] = mkCanvas(Math.max(64, w), Math.max(64, hgt));
    else if (c.width < w || c.height < hgt){ c.width = Math.max(c.width, w); c.height = Math.max(c.height, hgt); }
    return c;
  }
  /* the 3D look follows its own switch only; Performance mode keeps it but redraws it less often */
  function depthOn(){ return !(typeof Profile !== 'undefined' && Profile.settings && Profile.settings.depth === false); }
  function lightSolids(){ return typeof perfMode === 'function' && perfMode(); }
  /* how tall each appliance stands, as a share of its size: a plate is low, a blender jug or a freezer is tall */
  const HEIGHT = { knife:0.78, toaster:0.78, blender:1.0, dish:0.4, grill:0.62, fryer:0.8, freezer:1.06, micro:0.8, siphon:0.8, oven:0.94,
    mixer:0.88, pasta:0.68, gatling:0.72, espresso:0.96, bread:0.84, mandoline:0.46, caddy:0.86, saucepan:0.66, bot:0.9, pets:0.42, lobster:0.92, chess:0.3,
    chopsticks:0.36, susan:0.25, spray:0.95, rice:0.7 };
  /* how tall an appliance stands, in kitchen pixels */
  function solidDepth(T, t, sc){
    if (!T) return 0;
    if (t.flying || T.flyer) return 0;   // aircraft are drawn flat, with their shadow on the ground below
    if (T.water) return 3.5;
    if (T.hero) return 7;
    return Math.round(t.size * (HEIGHT[lookOf(t, T)] || 0.72) * sc * 2) / 2;
  }
  /* how far an appliance's art can reach from its centre (measured over every build and paragon) */
  const REACH = { grill:2.8, heli:2.5, espresso:2.2, bread:2.2, chess:2.3 };
  const TURN_STEP = Math.PI / 60;   // a kept picture is redrawn when its appliance turns 3 degrees
  function bodyReach(T, t, sc){ return t.size * (REACH[lookOf(t, T)] || 2.05) * sc + 4; }
  /* how far this build's art actually reaches, measured once per build: most builds are far smaller than the
     largest one, and the 3D layers cost by the pixel */
  const reachSeen = new Map();
  let reachCanvas = null;
  function artReach(T, t, look, up, sc){
    const key = look + '|' + up.join('') + '|' + (t.paragon ? 1 : 0) + '|' + (t.level || 0) + '|' + (t.rank >= 8 ? 1 : 0) + '|' + (t.flying ? 1 : 0) + '|' + sc;
    let r = reachSeen.get(key);
    if (r != null) return r;
    const R0 = bodyReach(T, t, sc), S = Math.ceil(R0 * 2);
    r = R0;
    try {
      if (!reachCanvas){ reachCanvas = mkCanvas(S, S); }
      if (reachCanvas.width < S || reachCanvas.height < S){ reachCanvas.width = Math.max(reachCanvas.width, S); reachCanvas.height = Math.max(reachCanvas.height, S); }
      const g = reachCanvas.getContext('2d', { willReadFrequently: true });
      const probe = Object.assign({}, t, { fireAnim: 0, fire2: 0 });
      let far = 0;
      for (const tm of [0.37, 1.91, 3.3]){
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.clearRect(0, 0, S, S);
        g.translate(S / 2, S / 2);
        g.save(); try { paintBody(g, probe, T, look, up, null, tm, sc, 0); } finally { g.restore(); }
        const d = g.getImageData(0, 0, S, S).data;
        for (let y = 0; y < S; y++){
          const dy = y + 0.5 - S / 2;
          for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3] > 3){ const q = Math.hypot(x + 0.5 - S / 2, dy); if (q > far) far = q; }
        }
      }
      /* room for recoil and a soft edge */
      if (far > 0) r = Math.min(R0, far + 5);
    } catch (e) { r = R0; }
    reachSeen.set(key, r);
    return r;
  }
  /* Finished appliances are kept, one picture per appliance (with its shadow), and redrawn only when their look
     changes: a turn of a few degrees, recoil, an upgrade, or, while the kitchen is running, the next frame of their
     animation (about 14 a second). Redraws share a small budget each frame; past it, an appliance shows its last
     picture for a frame or two, so a full kitchen stays smooth. */
  const solidCache = new Map();
  const SOLID_BUDGET = 5, SOLID_MAX_AGE = 4, SOLID_ANIM_MS = 70;
  /* the light comes from the upper left: shadows fall to the right and a little down, this far for each pixel of height */
  const SHADOW_X = 0.85, SHADOW_Y = 0.34;
  let solidFrame = 0, solidSpent = 0;
  function beginFrame(){
    solidFrame++; solidSpent = 0; glSpent = 0;
    if (solidFrame % 300 === 0){
      for (const [id, v] of solidCache) if (solidFrame - v.used > 300) solidCache.delete(id);
      for (const [id, v] of glCache) if (solidFrame - (v.used || 0) > 300){ GL3D.forget(v); glCache.delete(id); }
    }
  }
  function clearSolids(){ solidCache.clear(); glForgetAll(); }
  function nowMs(){ return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
  function resetCtx(c){ c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }

  /* What each appliance is built from in 3D: the outline of its body (rounded boxes, cylinders, hulls) as drawn on its
     top, in the appliance's own frame before it turns. The walls are drawn from these outlines as real faces; parts
     reaching past the body (knives, handles, attachments) ride on top and cast their own shadows. */
  const FORM = {
    knife:   { parts:[{ x:-14, y:-14, w:26, h:28, r:6 }] },
    toaster: { parts:[{ x:-12, y:-17, w:24, h:34, r:8 }] },
    blender: { parts:[{ x:-17, y:-17, w:34, h:34, r:8 }], color: () => SKIN && SKIN.body ? null : '#2b3a44', front:'buttons' },
    dish:    { parts:[{ x:-18, y:-18, w:36, h:36, r:6 }], front:'handle' },
    grill:   { parts:[{ cx:0, cy:0, rx:19 }], legs:true },
    fryer:   { parts:[{ x:-19, y:-18, w:38, h:35, r:6 }], front:'knobs' },
    freezer: { parts:[{ x:-17, y:-15, w:34, h:30, r:6 }], front:'lid' },
    micro:   { parts:[{ x:-16, y:-15, w:32, h:30, r:4 }] },
    siphon:  { parts:[{ cx:0, cy:0, rx:14 }], bands:[0.2] },
    oven:    { parts:[{ x:-21, y:-19, w:42, h:39, r:6 }], color: () => '#9aa0a4', front:'mouth' },
    mixer:   { parts:[{ x:-12, y:-21, w:24, h:31, r:9 }, { cx:0, cy:7, rx:13.5, color:'#c3ccd1' }] },
    pasta:   { parts:[{ x:-16, y:-15, w:32, h:27, r:4 }], front:'dial' },
    espresso:{ parts:[{ x:-21, y:-17, w:42, h:34, r:6 }], front:'tray' },
    bread:   { parts:[{ x:-19, y:-18, w:38, h:36, r:9 }], front:'window' },
    gatling: { parts:[{ cx:0, cy:0, rx:13 }], bands:[0.22] },
    boat:    { parts:[{ hull:[24, 12.5] }] },
    sub:     { parts:[{ x:-18, y:-8.5, w:36, h:17, r:8.5 }] },
    chef:    { parts:[{ cx:0, cy:0, rx:16.5 }] },
    mandoline:{ parts:[{ x:-15, y:-11, w:28, h:22, r:4 }] },
    caddy:   { parts:[{ cx:0, cy:0, rx:14 }], bands:[0.3] },
    saucepan:{ parts:[{ cx:0, cy:0, rx:15 }], bands:[0.25] },
    bot:     { parts:[{ x:-12, y:-10, w:22, h:20, r:5 }] },
    pets:    { parts:[{ cx:0, cy:0, rx:16, ry:13 }], bands:[0.5] },
    lobster: { parts:[{ x:-15, y:-15, w:30, h:30, r:5 }], color: () => SKIN && SKIN.body ? null : '#a8d8ea' },
    chess:   { parts:[{ x:-17, y:-17, w:34, h:34, r:2.5 }], color: () => CH_WOOD },
    spray:   { parts:[{ cx:0, cy:0, rx:12 }], color: () => SKIN && SKIN.body ? null : '#d8ecf5', bands:[0.55] },
    rice:    { parts:[{ cx:0, cy:0, rx:15 }], bands:[0.45] },
    chopsticks:{ parts:[{ x:-0.6, y:-9, w:7.2, h:18, r:3.4 }], color: (t, P) => { const k = P ? chopStyle(P.up, t.paragon).rest : 'porcelain'; return k === 'porcelain' ? null : REST_COL[k]; } },
    susan:   { parts:[{ cx:0, cy:0, rx:23 }] },
  };
  /* points around one part's outline, in its own frame */
  function partOutline(P){
    const pts = [];
    if (P.hull){
      const [L, Wd] = P.hull, q = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
      const cb = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
      for (let i = 0; i < 8; i++){ const t = i / 8; pts.push([q(L, L * 0.55, L * 0.05, t), q(0, -Wd * 0.7, -Wd, t)]); }
      for (let i = 0; i < 10; i++){ const t = i / 10; pts.push([cb(L * 0.05, -L * 0.5, -L * 0.92, -L * 0.92, t), cb(-Wd, -Wd * 1.1, -Wd * 0.88, 0, t)]); }
      for (let i = 0; i < 10; i++){ const t = i / 10; pts.push([cb(-L * 0.92, -L * 0.92, -L * 0.5, L * 0.05, t), cb(0, Wd * 0.88, Wd * 1.1, Wd, t)]); }
      for (let i = 0; i < 8; i++){ const t = i / 8; pts.push([q(L * 0.05, L * 0.55, L, t), q(Wd, Wd * 0.7, 0, t)]); }
    } else if (P.rx){
      const n = 40;
      for (let i = 0; i < n; i++){ const a = i / n * TAU; pts.push([P.cx + Math.cos(a) * P.rx, P.cy + Math.sin(a) * (P.ry || P.rx)]); }
    } else {
      const r = Math.min(P.r || 0, P.w / 2, P.h / 2), seg = 6;
      const cs = [[P.x + P.w - r, P.y + r, -Math.PI / 2], [P.x + P.w - r, P.y + P.h - r, 0], [P.x + r, P.y + P.h - r, Math.PI / 2], [P.x + r, P.y + r, Math.PI]];
      for (const [cx, cy, a0] of cs) for (let i = 0; i <= seg; i++){ const a = a0 + i / seg * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    }
    return pts;
  }
  /* the smallest convex outline around a set of points (for the shadow a body casts) */
  function convexHull(pts){
    const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (P.length < 3) return P;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const p of P){ while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = P.length - 1; i >= 0; i--){ const p = P[i]; while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
    hi.pop(); lo.pop();
    return lo.concat(hi);
  }
  /* The walls of an extruded outline, as faces: each edge that turns toward the viewer becomes a wall. Shading is
     smooth across the faces (each corner takes the light of its two edges): lighter where a wall faces the light
     (from the upper left), darker turning away from it, and darker toward the floor. A lit chamfer runs under the
     top's edge and a dark contact line along the floor. poly is in device pixels, zp the walls' height. */
  function drawWalls(g, poly, zp, k, base, bands){
    const n = poly.length;
    let mx = 0, my = 0;
    for (const p of poly){ mx += p[0]; my += p[1]; }
    mx /= n; my /= n;
    const en = [];
    for (let i = 0; i < n; i++){
      const a = poly[i], b = poly[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0];
      const L = Math.hypot(nx, ny) || 1;
      nx /= L; ny /= L;
      if (nx * ((a[0] + b[0]) / 2 - mx) + ny * ((a[1] + b[1]) / 2 - my) < 0){ nx = -nx; ny = -ny; }
      en.push([nx, ny]);
    }
    const lumAt = i => { const p = en[(i - 1 + n) % n], q = en[i], vx = p[0] + q[0], vy = p[1] + q[1], L = Math.hypot(vx, vy) || 1; return clamp(0.66 - 0.36 * vx / L + 0.06 * vy / L, 0.22, 1); };
    const col = l => shade(base, clamp(l - 1.02, -1, 1));
    const faces = [];
    for (let i = 0; i < n; i++) if (en[i][1] > 0.02) faces.push({ a: poly[i], b: poly[(i + 1) % n], la: lumAt(i), lb: lumAt((i + 1) % n) });
    g.lineJoin = 'round';
    const quad = f => { g.beginPath(); g.moveTo(f.a[0], f.a[1]); g.lineTo(f.b[0], f.b[1]); g.lineTo(f.b[0], f.b[1] + zp); g.lineTo(f.a[0], f.a[1] + zp); g.closePath(); };
    for (const f of faces){
      let fill;
      if (Math.abs(f.b[0] - f.a[0]) > 0.5){ fill = g.createLinearGradient(f.a[0], 0, f.b[0], 0); fill.addColorStop(0, col(f.la)); fill.addColorStop(1, col(f.lb)); }
      else fill = col((f.la + f.lb) / 2);
      quad(f); g.fillStyle = fill; g.fill(); g.strokeStyle = fill; g.lineWidth = 0.7; g.stroke();
    }
    /* darker toward the floor */
    for (const f of faces){
      const y0 = Math.min(f.a[1], f.b[1]), ao = g.createLinearGradient(0, y0, 0, Math.max(f.a[1], f.b[1]) + zp);
      ao.addColorStop(0, 'rgba(255,255,255,0.05)'); ao.addColorStop(0.45, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(0,0,0,0.3)');
      quad(f); g.fillStyle = ao; g.fill();
    }
    g.lineCap = 'round';
    for (const fr of bands || []){
      g.beginPath(); for (const f of faces){ g.moveTo(f.a[0], f.a[1] + zp * fr); g.lineTo(f.b[0], f.b[1] + zp * fr); }
      g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 1 * k; g.stroke();
      g.beginPath(); for (const f of faces){ g.moveTo(f.a[0], f.a[1] + zp * fr + 1 * k); g.lineTo(f.b[0], f.b[1] + zp * fr + 1 * k); }
      g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 0.8 * k; g.stroke();
    }
    g.beginPath(); for (const f of faces){ g.moveTo(f.a[0], f.a[1] + 0.9 * k); g.lineTo(f.b[0], f.b[1] + 0.9 * k); }
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1.1 * k; g.stroke();
    g.beginPath(); for (const f of faces){ g.moveTo(f.a[0], f.a[1] + zp - 0.5 * k); g.lineTo(f.b[0], f.b[1] + zp - 0.5 * k); }
    g.strokeStyle = 'rgba(0,0,0,0.38)'; g.lineWidth = 1.2 * k; g.stroke();
    return faces;
  }
  /* details on the front wall of an appliance that doesn't turn: (x0, x1) the straight stretch of its front edge and
     y its top, all in device pixels; u is one kitchen pixel */
  const FRONT = {
    handle(g, x0, x1, y, zp, u){ const w = x1 - x0; rr(g, x0 + w * 0.14, y + zp * 0.2, w * 0.72, Math.max(2 * u, zp * 0.13), 1.5 * u); fillStroke(g, '#dfe7ea', '#4b565b', 0.8 * u); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x0, y + zp * 0.8, w, zp * 0.2 - 0.5 * u); },
    knobs(g, x0, x1, y, zp, u){ const w = x1 - x0, r = Math.min(zp * 0.17, 2.6 * u); for (const f of [0.18, 0.36]){ circle(g, x0 + w * f, y + zp * 0.48, r); fillStroke(g, '#2a2f33', '#000', 0.6 * u); g.fillStyle = '#c9d2d6'; g.fillRect(x0 + w * f - 0.4 * u, y + zp * 0.48 - r, 0.8 * u, r); } circle(g, x0 + w * 0.82, y + zp * 0.48, r * 0.55); g.fillStyle = '#ff5a4e'; g.fill(); },
    lid(g, x0, x1, y, zp, u){ const w = x1 - x0; g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x0, y + zp * 0.28, w, Math.max(1, 0.9 * u)); rr(g, x0 + w * 0.44, y + zp * 0.34, w * 0.12, zp * 0.22, 1 * u); fillStroke(g, '#c9d2d6', '#4b565b', 0.6 * u); },
    mouth(g, x0, x1, y, zp, u){ const w = x1 - x0, cx = x0 + w / 2, r = Math.min(w * 0.24, zp * 0.82); g.save(); g.beginPath(); g.moveTo(cx - r, y + zp); g.arc(cx, y + zp, r, Math.PI, 0); g.closePath(); g.fillStyle = '#2a1a12'; g.fill(); g.clip(); const fg = g.createRadialGradient(cx, y + zp, 0, cx, y + zp, r); fg.addColorStop(0, 'rgba(255,214,110,0.95)'); fg.addColorStop(0.55, 'rgba(255,128,48,0.75)'); fg.addColorStop(1, 'rgba(120,40,10,0)'); g.fillStyle = fg; g.fillRect(cx - r, y, r * 2, zp); g.restore(); g.strokeStyle = '#4b565b'; g.lineWidth = 1 * u; g.beginPath(); g.arc(cx, y + zp, r, Math.PI, 0); g.stroke(); },
    dial(g, x0, x1, y, zp, u){ const w = x1 - x0, r = Math.min(zp * 0.22, 3 * u); circle(g, x0 + w * 0.8, y + zp * 0.5, r); fillStroke(g, '#dfe7ea', '#4b565b', 0.7 * u); g.strokeStyle = '#4b565b'; g.lineWidth = 0.8 * u; g.beginPath(); g.moveTo(x0 + w * 0.8, y + zp * 0.5); g.lineTo(x0 + w * 0.8, y + zp * 0.5 - r * 0.8); g.stroke(); },
    tray(g, x0, x1, y, zp, u){ const w = x1 - x0; rr(g, x0 + w * 0.18, y + zp * 0.55, w * 0.64, zp * 0.3, 1.2 * u); fillStroke(g, '#3a4045', '#1f2427', 0.7 * u); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 0.6 * u; g.beginPath(); for (let i = 1; i < 6; i++){ const x = x0 + w * (0.18 + 0.64 * i / 6); g.moveTo(x, y + zp * 0.6); g.lineTo(x, y + zp * 0.8); } g.stroke(); },
    window(g, x0, x1, y, zp, u){ const w = x1 - x0; rr(g, x0 + w * 0.3, y + zp * 0.22, w * 0.4, zp * 0.46, 1.5 * u); fillStroke(g, '#2b2622', '#1a1512', 0.7 * u); const wg = g.createLinearGradient(0, y + zp * 0.22, 0, y + zp * 0.68); wg.addColorStop(0, 'rgba(255,190,110,0.55)'); wg.addColorStop(1, 'rgba(255,150,60,0.15)'); g.fillStyle = wg; rr(g, x0 + w * 0.32, y + zp * 0.26, w * 0.36, zp * 0.38, 1.2 * u); g.fill(); },
    buttons(g, x0, x1, y, zp, u){ const w = x1 - x0, r = Math.min(zp * 0.12, 1.9 * u); ['#c9363a', '#7ab648', '#f2c14e'].forEach((c, i) => { circle(g, x0 + w * (0.32 + i * 0.18), y + zp * 0.5, r); fillStroke(g, c, 'rgba(0,0,0,0.5)', 0.5 * u); }); },
  };
  /* Builds the 3D picture of one appliance, or hands back the kept one:
       .c   the appliance: its top centred at (S/2, S/2), its sides reaching z further down;
       .sh  its shadow on the floor, at half resolution, starting from its footprint (the top moved down by z).
     paint(ctx, time) draws the top centred on (0, 0); br is the body's radius, which the lighting is sized to. */
  function solidBuild(k, R, z, br, paint, time, slot, lookKey, cast, form){
    const S = Math.ceil(R * 2), pw = Math.ceil(S * k), zp = z * k, ph = Math.ceil((S + z) * k);
    const sx = cast ? z * SHADOW_X : 0, sy = cast ? z * SHADOW_Y : 0;
    const shw = cast ? Math.ceil((S + sx) * k * 0.5) : 0, shh = cast ? Math.ceil((S + sy) * k * 0.5) : 0;
    const geo = pw * 1e4 + ph;
    let keep;
    if (slot != null){
      keep = solidCache.get(slot);
      const key = lookKey + (cast ? '|s' : '');
      if (keep && keep.geo === geo){
        keep.used = solidFrame;
        const light = lightSolids();
        if (keep.key === key && (keep.frame === solidFrame || keep.time === time || nowMs() - keep.at < (light ? SOLID_ANIM_MS * 2 : SOLID_ANIM_MS))) return keep;
        if (solidSpent >= (light ? SOLID_BUDGET * 0.6 : SOLID_BUDGET) && solidFrame - keep.frame < (light ? SOLID_MAX_AGE + 2 : SOLID_MAX_AGE)) return keep;
      }
      if (!keep){ keep = { c: mkCanvas(pw, ph), frame: solidFrame - 1 }; solidCache.set(slot, keep); }
      keep.key = key;
    } else keep = { temp: true };
    const t0 = nowMs();
    const comp = keep.temp ? solidCanvas('comp', pw + 2, ph + 2) : keep.c;
    if (!keep.temp && (comp.width !== pw || comp.height !== ph)){ comp.width = pw; comp.height = ph; }
    /* 1. the top, lit from the upper left, with a soft gloss. Scratch canvases are shared and only grow, so each is
          cleared a little past the part in use: smoothing samples one pixel beyond it */
    SPIN_K = keep.temp ? 1 : Math.max(1, Math.min(8, solidFrame - keep.frame));
    const art = solidCanvas('art', pw + 2, pw + 2), ag = art.getContext('2d');
    resetCtx(ag); ag.clearRect(0, 0, pw + 2, pw + 2);
    ag.setTransform(k, 0, 0, k, pw / 2, pw / 2);
    ag.save(); try { paint(ag, time); } finally { ag.restore(); SPIN_K = 1; }
    ag.setTransform(1, 0, 0, 1, 0, 0);
    const c0 = pw / 2, bk = br * k;
    ag.globalCompositeOperation = 'source-atop';
    const lg = ag.createLinearGradient(c0 - bk, c0 - bk, c0 + bk, c0 + bk);
    lg.addColorStop(0, 'rgba(255,255,255,0.26)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(10,20,30,0.2)');
    ag.fillStyle = lg; ag.fillRect(0, 0, pw, pw);
    const gx = c0 - bk * 0.4, gy = c0 - bk * 0.46, gl = ag.createRadialGradient(gx, gy, 0, gx, gy, bk * 0.72);
    gl.addColorStop(0, 'rgba(255,255,255,0.32)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ag.fillStyle = gl; ag.fillRect(0, 0, pw, pw);
    ag.globalCompositeOperation = 'source-over';
    const cg = comp.getContext('2d');
    resetCtx(cg); cg.clearRect(0, 0, pw + 2, ph + 2);
    const u = k * (form ? form.sc : 1);
    /* 2. the shadow on the floor, starting from the footprint (the top moved down by z): the body sweeps its outline
          away from the light like a real block does, and everything on top (handles, knives, attachments) lands one
          full throw of the light away. At half resolution, which softens its edge. */
    if (cast){
      const shc = keep.temp ? solidCanvas('shadow', shw + 2, shh + 2) : (keep.sh || (keep.sh = mkCanvas(shw, shh)));
      if (!keep.temp && (shc.width !== shw || shc.height !== shh)){ shc.width = shw; shc.height = shh; }
      const xg = shc.getContext('2d'), hk = k * 0.5;
      resetCtx(xg); xg.clearRect(0, 0, shw + 2, shh + 2);
      xg.fillStyle = '#000';
      if (form) for (const poly of form.polys){
        const pts = poly.map(([x, y]) => [S / 2 + x, S / 2 + y]);
        const hull = convexHull(pts.concat(pts.map(([x, y]) => [x + sx, y + sy])));
        xg.beginPath(); hull.forEach(([x, y], i) => i ? xg.lineTo(x * hk, y * hk) : xg.moveTo(x * hk, y * hk)); xg.closePath(); xg.fill();
      }
      /* the top's own outline, solid parts only: squaring the coverage twice keeps bodies whole and drops glows,
         steam and sparkles, which cast no shadow */
      const sw = Math.ceil(pw * 0.5), sil = solidCanvas('side', sw + 2, sw + 2), sd = sil.getContext('2d');
      resetCtx(sd); sd.clearRect(0, 0, sw + 2, sw + 2);
      sd.drawImage(art, 0, 0, pw, pw, 0, 0, pw * 0.5, pw * 0.5);
      sd.globalCompositeOperation = 'destination-in';
      sd.drawImage(sil, 0, 0, sw, sw, 0, 0, sw, sw);
      sd.drawImage(sil, 0, 0, sw, sw, 0, 0, sw, sw);
      sd.globalCompositeOperation = 'source-over';
      xg.drawImage(sil, 0, 0, sw, sw, sx * hk, sy * hk, sw, sw);
      xg.globalCompositeOperation = 'source-in';
      const f0 = S * hk * 0.5, fg = xg.createLinearGradient(f0, f0, f0 + sx * hk, f0 + sy * hk);
      fg.addColorStop(0, 'rgba(14,18,24,0.36)'); fg.addColorStop(1, 'rgba(14,18,24,0.14)');
      xg.fillStyle = fg; xg.fillRect(0, 0, shw + 2, shh + 2);
      xg.globalCompositeOperation = 'source-over';
      keep.sh = shc;
    }
    /* 3. the walls, as real faces of the body's outline, with the details on the front of appliances that don't turn */
    if (form && zp > 0.4){
      const c = pw / 2;
      /* a kettle grill is a bowl standing on three legs, which turn with it (the far ones hide behind the bowl) */
      const wall = form.legs ? zp * 0.58 : zp;
      if (form.legs){
        cg.lineCap = 'round';
        const legs = [0, TAU / 3, -TAU / 3].map(a => a - (form.rot || 0)).sort((p, q) => Math.cos(p) - Math.cos(q));
        for (const ax of legs){
          const w = Math.cos(ax) > 0.9 ? 2.8 : 2.4;
          const x = c + Math.sin(ax) * 14 * u, y0 = c + Math.cos(ax) * 12 * u + wall * 0.5;
          const y1 = c + Math.cos(ax) * 16 * u + zp;
          cg.strokeStyle = '#111315'; cg.lineWidth = w * u; cg.beginPath(); cg.moveTo(x, y0); cg.lineTo(x + Math.sin(ax) * 4 * u, y1); cg.stroke();
          cg.strokeStyle = 'rgba(255,255,255,0.18)'; cg.lineWidth = 0.7 * u; cg.beginPath(); cg.moveTo(x - 0.6 * u, y0); cg.lineTo(x + Math.sin(ax) * 4 * u - 0.6 * u, y1); cg.stroke();
        }
      }
      /* far parts first, so nearer walls overlap them */
      const midY = p => p.reduce((m, v) => m + v[1], 0) / p.length;
      const order = form.polys.map((p, i) => i);
      if (order.length > 1) order.sort((i, j) => midY(form.polys[i]) - midY(form.polys[j]));
      for (const i of order){
        const dev = form.polys[i].map(([x, y]) => [c + x * k, c + y * k]);
        drawWalls(cg, dev, wall, k, (form.cols && form.cols[i]) || form.base, form.bands);
      }
      if (form.front && FRONT[form.front]){
        /* the front edge runs left to right while it faces the viewer; its details fade out as it turns away */
        const f = form.frontSeg, ax = c + f[0] * k, ay = c + f[1] * k, dx = (f[2] - f[0]) * k, dy = (f[3] - f[1]) * k, L = Math.hypot(dx, dy);
        const vis = L > 2 ? clamp((dx / L - 0.25) / 0.35, 0, 1) : 0;
        if (vis > 0){
          cg.save(); cg.globalAlpha = vis; cg.lineCap = 'round'; cg.lineJoin = 'round';
          cg.transform(dx / L, dy / L, 0, 1, ax, ay);
          try { FRONT[form.front](cg, 0, L, 0, zp, u); } finally { cg.restore(); }
        }
      }
    }
    /* 4. the top */
    cg.drawImage(art, 0, 0, pw, pw, 0, 0, pw, pw);
    keep.c = comp;
    keep.S = S; keep.pw = pw; keep.ph = ph; keep.k = k; keep.z = z; keep.shw = shw; keep.shh = shh;
    if (!keep.temp){ const now = nowMs(); solidSpent += now - t0; keep.geo = geo; keep.at = now; keep.time = time; keep.frame = solidFrame; keep.used = solidFrame; }
    return keep;
  }
  /* the appliance's picture onto the scene, lined up with the screen's pixels so it stays sharp */
  function blitSolid(g, x, y, s){
    const m = g.getTransform ? g.getTransform() : { a:1, b:0, d:1, e:0, f:0 };
    let dx = x - (s.gl ? s.ax : s.S / 2), dy = y - (s.gl ? s.ay : s.S / 2);
    if (Math.abs(m.b) < 1e-6 && m.a > 0){ dx = (Math.round(dx * m.a + m.e) - m.e) / m.a; dy = (Math.round(dy * m.d + m.f) - m.f) / m.d; }
    if (s.gl){ GL3D.draw(g, s.slot, s.w, s.h, dx, dy, s.kw, s.kh); return; }
    g.drawImage(s.c, 0, 0, s.pw, s.ph, dx, dy, s.pw / s.k, s.ph / s.k);
  }
  function blitShadow(g, x, y, s){
    if (s.gl){ if (s.shSlot && s.w2) GL3D.draw(g, s.shSlot, s.w2, s.h2, x - s.ax, y - s.ay, s.kw, s.kh); return; }
    if (!s.sh || !s.shw) return;
    g.drawImage(s.sh, 0, 0, s.shw, s.shh, x - s.S / 2, y - s.S / 2 + s.z, s.shw / (s.k * 0.5), s.shh / (s.k * 0.5));
  }
  /* how an appliance is drawn: its look, build, skin, scale, height and turn */
  function solidSpec(t, T, opt){
    const look = lookOf(t, T);
    const skinId = t.skin || (typeof skinOf === 'function' ? skinOf(t.type) : 'classic');
    const skin0 = skinId !== 'classic' ? SKIN_BY_ID[skinId] || null : null;
    const tint = (t.s && t.s.tint) || t.tint || (T && T.tint);
    const skin = tint ? { body: tint, fx: skin0 ? skin0.fx : null } : skin0;
    const up = t.paragon ? [5, 5, 5] : (t.up || [0, 0, 0]);
    /* riding a Lazy Susan: a little smaller, standing on its board */
    const ride = t.on && !t.icon && typeof riderScale === 'function' ? t.on : null;
    const sc = (t.paragon ? 1.25 : 1) * (ride ? riderScale(t) : 1);
    const z = !(opt && opt.flat) && depthOn() ? solidDepth(T, t, sc) : 0;
    const rot = turnOf(t, look);
    return { look, skinId, tint, skin, up, sc, z, rot, cast: z > 0 && !t.flying && !(T && T.water), ride };
  }
  /* how far up the screen a rider is drawn from its seat: it stands on the board's top, which the turntable's
     picture puts on the turntable's spot (in 3D the floor also squashes toward the viewer) */
  function riderLift(t, P, solid){
    if (!P.ride) return 0;
    if (solid && solid.gl) return (t.y - P.ride.y) * (1 - GL3D.CT) + (solid.za || 0) * GL3D.ST;
    return P.z;
  }
  /* ---------------- real 3D appliances ----------------
     With WebGL 2 at hand, appliances are real 3D models: gl3d.js draws them and models3d.js builds every
     appliance's model. Their pictures live in the 3D engine's atlas and are kept like the solid pictures here:
     redrawn when the appliance turns, fires, changes or moves on to its next animation frame, within a budget per
     frame. Without WebGL 2 the solid pictures below stand in. */
  const glCache = new Map();
  const glTemp = {};
  const GL_ANIM_MS = 40, GL_BUDGET = 6;
  let glSpent = 0;
  function glOn(){ return depthOn() && typeof GL3D !== 'undefined' && typeof MODELS3D !== 'undefined' && GL3D.ok(); }
  /* everything that changes an appliance's model (its shapes, not its pose or colour) */
  function glModelKey(t, P, def){
    const extra = def.key ? def.key(t, P.up, !!t.paragon) : '';
    return P.look + '|' + P.up.join('') + '|' + (t.paragon ? 'P' : '') + '|' + (t.rank >= 8 ? 'g' : '') + '|' + extra + (t.flying ? '|f' : '');
  }
  function glModel(t, T, P, def){
    return GL3D.model(glModelKey(t, P, def), B => def.build(B, { t, T, up: P.up, par: !!t.paragon, look: P.look, gold: t.rank >= 8 || !!t.paragon, lvl: t.level || 1, flying: !!t.flying }));
  }
  /* the turn that makes a model point where its appliance aims (the camera squashes the floor a little) */
  function glTurn(t, P){
    const face = ROTATES[P.look];
    if (face == null) return { rot: 0, face: null };
    if (P.rot === 0 && face !== 0 && !t.aimed) return { rot: 0, face };
    return { rot: GL3D.turnFor(P.rot + face, face), face };
  }
  function glBody(t, P, def, time){
    SKIN = P.skin; SKIN_T = time; SKIN_SEED = (t.id || 0) * 0.37;
    try { return (def.body && def.body(t, P.up, !!t.paragon, P.skin)) || (BODY[P.look] ? bodyColor(P.look, P.up, t.paragon) : '#c9d2d6'); }
    finally { SKIN = null; }
  }
  function glSolid(g, t, T, P, time){
    const def = MODELS3D[P.look];
    if (!def) return null;
    const mt = g.getTransform ? g.getTransform() : { a:1, b:0 };
    const k = Math.min(2.6, Math.max(0.5, Math.hypot(mt.a, mt.b)));
    const slot = t.icon || t.id == null ? null : t.id + (t.flying ? 'f' : '');
    let keep;
    if (slot != null){ keep = glCache.get(slot); if (!keep){ keep = { frame: -1 }; glCache.set(slot, keep); } }
    else keep = glTemp;
    const m = glModel(t, T, P, def);
    if (!m) return null;
    const { rot, face } = glTurn(t, P);
    const body = glBody(t, P, def, time);
    const lookKey = [m.key, Math.round(rot / TURN_STEP), t.fireAnim > 0 ? Math.ceil(t.fireAnim * 20) : 0, t.fire2 > 0 ? Math.ceil(t.fire2 * 10) : 0,
      t.aim2 != null ? Math.round(t.aim2 / TURN_STEP) : '', body, k, P.cast ? 1 : 0, t.flyMode || '', t.bank > 0 ? 1 : 0, t.loafQ || 0, P.sc, P.ride ? 'r' : ''].join('|');
    if (slot != null && GL3D.valid(keep) && keep.k === k){
      keep.used = solidFrame;
      if (keep.frame === solidFrame) return keep;
      const light = lightSolids();
      if (keep.key === lookKey && (!m.moving || keep.time === time || nowMs() - keep.at < (light ? GL_ANIM_MS * 2 : GL_ANIM_MS))) return keep;
      if (glSpent >= (light ? GL_BUDGET * 0.6 : GL_BUDGET) && solidFrame - keep.frame < (light ? SOLID_MAX_AGE + 2 : SOLID_MAX_AGE)) return keep;
    }
    const t0 = nowMs();
    const kick = face != null ? kickOf(t, P.look) * P.sc : 0, fw = (face || 0) + rot;
    t._g3rot = rot;
    const r = GL3D.render(m, { k, rot, s: P.sc, time, t, dx: kick * Math.cos(fw), dy: kick * Math.sin(fw), body: GL3D.rgb(body), cast: P.cast, lift: P.ride ? 0 : undefined }, keep);
    if (!r) return null;
    keep.key = lookKey; keep.time = time; keep.at = nowMs(); keep.frame = solidFrame; keep.used = solidFrame;
    glSpent += keep.at - t0;
    return keep;
  }
  function glForgetAll(){ if (typeof GL3D !== 'undefined') for (const k of glCache.values()) GL3D.forget(k); glCache.clear(); }
  /* the 3D picture for this appliance as it looks right now */
  function solidFor(g, t, T, P, time){
    if (glOn()){ const r = glSolid(g, t, T, P, time); if (r) return r; }
    const m = g.getTransform ? g.getTransform() : { a:1, b:0 };
    const k = Math.min(2.2, Math.max(0.5, Math.hypot(m.a, m.b)));
    /* everything that changes how this appliance looks, apart from its animation over time */
    const slot = t.icon || t.id == null ? null : t.id + (t.flying ? 'f' : '');
    const lookKey = slot == null ? '' : [P.look, P.up.join(''), t.paragon ? t.degree : '', P.skinId, P.tint || '', t.level || '', t.rank || 0,
      Math.round(P.rot / TURN_STEP), t.aim2 != null ? Math.round(t.aim2 / TURN_STEP) : '', t.fireAnim > 0 ? Math.ceil(t.fireAnim * 20) : 0, t.fire2 > 0 ? 1 : 0,
      t.flyMode || '', t.bank > 0 ? 1 : 0, t.loafQ || 0, P.sc].join('|');
    return solidBuild(k, artReach(T, t, P.look, P.up, P.sc), P.z, t.size * 1.25 * P.sc, (ag, tm) => paintBody(ag, t, T, P.look, P.up, P.skin, tm, P.sc, P.rot), time, slot, lookKey, P.cast, solidForm(t, T, P));
  }
  /* the body this appliance is built from right now: its outlines turned, scaled and kicked back like its top, the
     colour of its walls, and where the details on its front go */
  function solidForm(t, T, P){
    const hero = !!(T && T.hero);
    const f = FORM[hero ? 'chef' : P.look] || { parts:[{ cx:0, cy:0, rx: t.size * 0.9 }] };
    const fw = ROTATES[hero ? t.type : P.look], kick = fw != null ? kickOf(t, P.look) : 0, kx = kick * Math.cos(fw || 0), ky = kick * Math.sin(fw || 0);
    const sc = P.sc, c = Math.cos(P.rot), sn = Math.sin(P.rot);
    const turn = (x, y) => { const X = (x + kx) * sc, Y = (y + ky) * sc; return [X * c - Y * sn, X * sn + Y * c]; };
    const polys = f.parts.map(part => partOutline(part).map(([x, y]) => turn(x, y)));
    let base = null;
    if (hero) base = (CHEF_LOOK[t.type] || CHEF_LOOK.chef_blaze).scarf;
    else {
      SKIN = P.skin;
      try { base = (f.color && f.color(t, P)) || (BODY[P.look] ? bodyColor(P.look, P.up, t.paragon) : '#9aa0a4'); } finally { SKIN = null; }
    }
    /* the straight stretch of the front edge, turned with the body: its details go on whichever wall it becomes */
    let frontSeg = null;
    if (f.front){ const q = f.parts[0], r = Math.min(q.r || 0, q.w / 2, q.h / 2); frontSeg = turn(q.x + r, q.y + q.h).concat(turn(q.x + q.w - r, q.y + q.h)); }
    return { polys, cols: f.parts.map(pt => pt.color || null), base, bands: f.bands, legs: f.legs, front: frontSeg ? f.front : null, frontSeg, sc, rot: P.rot };
  }
  /* every appliance's shadow, drawn on the floor before the pests so they walk over it */
  function drawShadows(g, towers, time){
    if (!depthOn()) return;
    const gl3 = glOn();
    if (!gl3){
      for (const t of towers){
        const T = TOWERS[t.type];
        if (!T || T.flyer || T.water) continue;
        const P = solidSpec(t, T);
        if (!P.cast || P.ride) continue;
        blitShadow(g, t.x, t.y, solidFor(g, t, T, P, time));
      }
      return;
    }
    /* in 3D every appliance on the ground is drawn first, all together (so the atlas changes once a frame), and
       then their shadows go down; if the atlas had to start over part way, the round is drawn again */
    const todo = [];
    const pass = () => {
      todo.length = 0;
      for (const t of towers){
        const T = TOWERS[t.type];
        if (!T) continue;
        /* aircraft are drawn later, above everything, but their pictures are made now with the rest */
        if (T.flyer){ if (MODELS3D[lookOf(t, T)]){ const f = flyerView(t); solidFor(g, f, T, solidSpec(f, T), time); } continue; }
        const P = solidSpec(t, T);
        todo.push([t, solidFor(g, t, T, P, time), P.cast && !P.ride]);
      }
    };
    const g0 = GL3D.gen;
    pass();
    if (GL3D.gen !== g0) pass();
    for (const [t, s, cast] of todo) if (cast && s) blitShadow(g, t.x, t.y, s);
  }
  /* the appliance itself, turned to its aim, centred on (0, 0) */
  /* the look an appliance wears right now: an upgrade can change it (custom appliances), else its type's */
  function lookOf(t, T){ return (t && t.s && t.s.look) || (T && T.look) || (t && t.type) || ''; }
  /* looks added at run time (the Body Workshop): def = { draw, form, rotates, height }, or null to drop one */
  function registerLook(look, def){
    if (!def){ delete TOWER_DRAW[look]; delete FORM[look]; delete ROTATES[look]; delete HEIGHT[look]; return; }
    TOWER_DRAW[look] = def.draw;
    if (def.form) FORM[look] = def.form; else delete FORM[look];
    if (def.rotates != null) ROTATES[look] = def.rotates; else delete ROTATES[look];
    if (def.height) HEIGHT[look] = def.height; else delete HEIGHT[look];
    solidCache.clear(); glForgetAll();
  }
  function paintBody(g, t, T, look, up, skin, time, sc, rot){
    g.rotate(rot);
    if (sc !== 1) g.scale(sc, sc);
    const fw = ROTATES[look];
    if (fw != null && t.fireAnim > 0){ const k = kickOf(t, look); g.translate(k * Math.cos(fw), k * Math.sin(fw)); }
    t.rotNow = rot;
    SKIN = skin; SKIN_T = time; SKIN_SEED = (t.id || 0) * 0.37;
    try { (TOWER_DRAW[look] || drawKnife)(g, t, up, time, t.paragon); }
    finally { SKIN = null; }
  }
  function drawTower(g, t, time, opt){
    opt = opt || {};
    const T = TOWERS[t.type];
    const look = lookOf(t, T);
    const fly = T && T.flyer;
    /* aircraft: only the pad is on the ground; drawFlyer draws the craft above everything */
    if (fly && !t.icon && !t.flying){ drawPad(g, t, fly, time, opt, t.paragon ? [5, 5, 5] : (t.up || [0, 0, 0])); return; }
    const P = solidSpec(t, T, opt), { skin, up, sc, z, rot } = P;
    if (T && (T.water || t.wet) && !t.icon) drawWake(g, t, time, sc);
    if (!fly && PAD_LOOK[look] && !t.icon) drawPad(g, t, PAD_LOOK[look], time, {}, up);
    const hero = !!(T && T.hero);
    if (hero && t.s && t.s.aura && !t.icon && !(typeof lowFx === 'function' && lowFx())) drawChefAura(g, t, time);
    if (hero && t.s && t.s.barrier && !t.icon) drawVoidAura(g, t, time);
    /* standing up, the appliance is built first so its shadow can go down before the rings (aircraft are real
       models too in 3D, flying with their shadow far below) */
    const solid = z > 0 || (fly && !opt.flat && glOn() && MODELS3D[look]) ? solidFor(g, t, T, P, time) : null;
    /* a rider stands on its turntable's board: drawn higher, its shadow on the board, its rings a little smaller */
    const lift = P.ride ? riderLift(t, P, solid) : 0, X = t.x, Y = t.y - lift, rk = P.ride ? riderScale(t) : 1;
    const top = lift ? Object.create(t, { y: { value: Y, writable: true } }) : t;
    if (solid && P.cast && (P.ride || !opt.noShadow)) blitShadow(g, X, Y, solid);
    /* on the floor: a shadow (when there is no cast one) and the rings */
    g.save();
    g.translate(X, Y);
    if (fly && t.icon){ g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, 7, 11, t.size * 0.9 * sc, t.size * 0.7 * sc); g.fill(); }
    else if (!t.flying && !P.cast){
      g.fillStyle = T && T.water ? 'rgba(20,50,70,0.18)' : 'rgba(0,0,0,0.25)';
      ell(g, 3 + z * 0.3, 5 + z * 0.8, t.size * 1.15 * sc, t.size * 0.95 * sc); g.fill();
    }
    if (t.paragon){
      for (let i = 0; i < 3; i++){ g.strokeStyle = 'rgba(255,209,102,' + (0.45 - i * 0.12) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, (t.size * 1.6 + i * 5) * rk, time * (1 + i * 0.4) + i, time * (1 + i * 0.4) + i + 4); g.stroke(); }
    } else if (up.some(v => v === 5) || (hero && (t.level || 1) >= 20)){
      g.strokeStyle = 'rgba(255,209,102,0.55)'; g.lineWidth = 2; g.setLineDash([4, 5]); g.lineDashOffset = -time * 12;
      circle(g, 0, 0, t.size * 1.45 * rk); g.stroke(); g.setLineDash([]);
    }
    if (opt.selected){ g.strokeStyle = '#ffffff'; g.lineWidth = 2; circle(g, 0, 0, t.size * 1.3 * sc); g.stroke(); }
    if ((t.boost && Object.keys(t.boost).length) || (!t.icon && t.s && G.glob && G.glob.opening)){ g.strokeStyle = 'rgba(255,209,102,0.9)'; g.lineWidth = 2.5; circle(g, 0, 0, t.size * 1.2 * rk + Math.sin(time * 14) * 2); g.stroke(); }
    g.restore();
    /* the appliance */
    t.rotNow = rot;
    const a0 = g.globalAlpha;
    if (t.stunT > 0) g.globalAlpha *= 0.72;
    const d3 = solid && solid.gl ? MODELS3D[look] : null;
    if (d3 && d3.alpha) g.globalAlpha *= d3.alpha(t);
    if (solid) blitSolid(g, X, Y, solid);
    else { g.save(); g.translate(X, Y); paintBody(g, t, T, look, up, skin, time, sc, rot); g.restore(); }
    g.globalAlpha = a0;
    /* a few models keep a flat touch on top: rings of sound, a shimmer of water */
    if (d3 && d3.after){ g.save(); g.translate(X, Y); try { d3.after(g, t, time, sc, up); } finally { g.restore(); } }
    if (t.paragon && t.sys && !t.icon) drawParaTop(g, top, time, sc);
    /* Banquet Service: silver platters orbiting at counter height, drawn every frame so they glide */
    if (look === 'dish' && (up[0] >= 5 || t.paragon) && !t.icon){
      const R = t.paragon ? 60 : 40 * sc, ps = t.paragon ? 10 : 6.5;
      for (let i = 0; i < 3; i++){
        const an = time * 4.2 + i * TAU / 3 + (t.id || 0);
        g.save(); g.translate(X + Math.cos(an) * R, Y + Math.sin(an) * R * 0.92 - z * 0.6);
        g.fillStyle = 'rgba(0,0,0,0.16)'; ell(g, 3, 5 + z * 0.4, ps, ps * 0.5); g.fill();
        plateTop(g, 0, 0, ps, 'silver');
        g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, ps + 2, an + 1.2, an + 2.4); g.stroke();
        g.restore();
      }
    }
    /* marks that sit on the appliance's top */
    if (skin && skin.fx && !t.paragon && !(typeof lowFx === 'function' && lowFx())) drawSkinFx(g, top, skin, time, sc);
    if (T && T.custom) drawCustomBadge(g, top, sc);
    if (hero && !t.icon) drawHeroBadge(g, top);
    if (t.tb && !t.icon) drawTimedFx(g, top, time, sc);
    if (t.heat > 0.05 && !(t.stunT > 0)){
      g.save(); g.translate(top.x, top.y);
      g.strokeStyle = 'rgba(40,20,10,0.45)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, t.size * 1.2, -Math.PI / 2, Math.PI * 1.5); g.stroke();
      g.strokeStyle = t.heat > 0.7 ? '#ff4a2a' : '#ff8a3d'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, t.size * 1.2, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, t.heat)); g.stroke();
      g.restore();
    }
    if (t.stunT > 0 && t.stunBy && t.stunBy !== 'stink'){
      const C = { gust:['rgba(226,206,164,0.3)', 'rgba(150,120,70,0.85)'], heat:['rgba(255,120,50,0.3)', 'rgba(255,90,40,0.9)'], dread:['rgba(127,255,227,0.22)', 'rgba(60,170,150,0.9)'] }[t.stunBy] || ['rgba(255,255,255,0.2)', '#888'];
      g.save(); g.translate(top.x, top.y);
      circle(g, 0, 0, t.size * 1.25); g.fillStyle = C[0]; g.fill();
      g.strokeStyle = C[1]; g.lineWidth = 2; g.lineCap = 'round';
      if (t.stunBy === 'gust') for (let i = 0; i < 3; i++){ const a0 = time * 5 + i * 2.1; g.beginPath(); g.arc(0, -t.size * 0.3, t.size * (0.5 + i * 0.2), a0, a0 + 1.8); g.stroke(); }
      else if (t.stunBy === 'heat') for (let i = 0; i < 3; i++){ const x = -8 + i * 8, k = (time * 0.9 + i * 0.33) % 1; g.globalAlpha = 1 - k; g.beginPath(); g.moveTo(x - 3, -t.size * 0.4 - k * 14); g.quadraticCurveTo(x, -t.size * 0.4 - k * 14 - 9, x + 3, -t.size * 0.4 - k * 14); g.closePath(); g.fillStyle = '#ff8a3d'; g.fill(); g.globalAlpha = 1; }
      else { g.setLineDash([4, 4]); circle(g, 0, 0, t.size * 1.25); g.stroke(); g.setLineDash([]); for (let i = 0; i < 3; i++){ const a = i / 3 * TAU + time; g.beginPath(); g.moveTo(Math.cos(a) * 4, Math.sin(a) * 4 - t.size * 0.4); g.lineTo(Math.cos(a) * 10, Math.sin(a) * 10 - t.size * 0.4); g.stroke(); } }
      g.restore();
    } else if (t.stunT > 0){
      g.save(); g.translate(top.x, top.y);
      circle(g, 0, 0, t.size * 1.25); g.fillStyle = 'rgba(150,200,80,0.28)'; g.fill();
      g.strokeStyle = 'rgba(110,160,50,0.85)'; g.lineWidth = 2; g.lineCap = 'round';
      for (let i = 0; i < 3; i++){
        const x = -8 + i * 8, k = (time * 0.8 + i * 0.33) % 1;
        g.beginPath(); for (let s = 0; s <= 8; s++){ const yy = -t.size * 0.4 - s * 3 - k * 10; const xx = x + Math.sin(s * 0.9 + time * 6 + i) * 3; s ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke();
      }
      g.restore();
    }
  }

  /* ---------------- projectiles ---------------- */
  /* custom projectiles: a simple shape in any colour, with optional glow and trail */
  function drawShape(g, shape, color, R, ang, spin, glow, trail){
    color = /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#ff7a59';
    const dark = shade(color, -0.42);
    if (trail){
      g.save(); g.lineCap = 'round';
      g.strokeStyle = rgbaStr(color, 0.28); g.lineWidth = R * 1.5;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-Math.cos(ang) * R * 5, -Math.sin(ang) * R * 5); g.stroke();
      g.strokeStyle = rgbaStr(color, 0.5); g.lineWidth = R * 0.7;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-Math.cos(ang) * R * 3, -Math.sin(ang) * R * 3); g.stroke();
      g.restore();
    }
    if (glow){ g.save(); g.globalCompositeOperation = 'lighter'; circle(g, 0, 0, R * 2.1); g.fillStyle = rgbaStr(color, 0.22); g.fill(); circle(g, 0, 0, R * 1.4); g.fillStyle = rgbaStr(color, 0.25); g.fill(); g.restore(); }
    g.save();
    switch (shape){
      case 'star': g.rotate(spin); star(g, 0, 0, R * 1.35, color); g.strokeStyle = dark; g.lineWidth = 0.8; g.stroke(); break;
      case 'shard': g.rotate(ang); g.beginPath(); g.moveTo(R * 1.7, 0); g.lineTo(0, R * 0.62); g.lineTo(-R * 1.25, 0); g.lineTo(0, -R * 0.62); g.closePath(); fillStroke(g, color, dark, 0.8); g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(R * 1.1, 0); g.lineTo(0, -R * 0.4); g.lineTo(-R * 0.4, 0); g.closePath(); g.fill(); break;
      case 'ring': circle(g, 0, 0, R); g.strokeStyle = color; g.lineWidth = Math.max(1.5, R * 0.5); g.stroke(); circle(g, 0, 0, R); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = Math.max(0.6, R * 0.15); g.stroke(); break;
      case 'bolt': g.rotate(ang); g.beginPath(); g.moveTo(R * 1.7, 0); g.lineTo(-R, R * 0.85); g.lineTo(-R * 0.35, 0); g.lineTo(-R, -R * 0.85); g.closePath(); fillStroke(g, color, dark, 0.8); break;
      case 'cube': g.rotate(spin); rr(g, -R * 0.85, -R * 0.85, R * 1.7, R * 1.7, R * 0.3); fillStroke(g, color, dark, 0.9); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-R * 0.55, -R * 0.55, R * 0.5, R * 0.35); break;
      case 'heart': {
        g.rotate(ang + Math.PI / 2); g.scale(R / 6, R / 6);
        g.beginPath(); g.moveTo(0, 5); g.bezierCurveTo(-7, 0, -6, -6, 0, -3); g.bezierCurveTo(6, -6, 7, 0, 0, 5); g.closePath();
        fillStroke(g, color, dark, 1); break;
      }
      default: circle(g, 0, 0, R); fillStroke(g, color, dark, 0.8); circle(g, -R * 0.35, -R * 0.35, R * 0.32); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
    }
    g.restore();
  }

  /* ---------------- attack objects from the Projectile Workshop ----------------
     o: an object spec (objectSpec); R: the drawn radius; ang: the way it flies; age: seconds in flight */
  function objLayer(g, L, R, age){
    const sz = R * L.s * (L.pulse ? 1 + Math.sin(age * 9 + L.x * 3) * L.pulse * 0.35 : 1);
    g.save();
    g.translate(L.x * R, L.y * R);
    g.rotate(L.r * Math.PI / 180 + (L.spin ? age * L.spin * TAU : 0));
    g.globalAlpha *= L.a;
    const fill = L.c, line = L.w > 0 ? L.o : null, lw = L.w * Math.max(0.6, R * 0.12);
    switch (L.k){
      case 'disc': circle(g, 0, 0, sz); fillStroke(g, fill, line, lw); break;
      case 'ring': circle(g, 0, 0, sz); g.strokeStyle = fill; g.lineWidth = Math.max(1, sz * 0.35); g.stroke(); if (line){ g.strokeStyle = line; g.lineWidth = lw * 0.6; circle(g, 0, 0, sz * 1.17); g.stroke(); circle(g, 0, 0, sz * 0.83); g.stroke(); } break;
      case 'star': { const n = L.n, r2 = sz * 0.45; g.beginPath(); for (let i = 0; i < n * 2; i++){ const a = i / (n * 2) * TAU - Math.PI / 2, r = i % 2 ? r2 : sz; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); fillStroke(g, fill, line, lw); break; }
      case 'poly': { const n = L.n; g.beginPath(); for (let i = 0; i < n; i++){ const a = i / n * TAU - Math.PI / 2; i ? g.lineTo(Math.cos(a) * sz, Math.sin(a) * sz) : g.moveTo(Math.cos(a) * sz, Math.sin(a) * sz); } g.closePath(); fillStroke(g, fill, line, lw); break; }
      case 'blade': { const n = L.n; g.beginPath(); for (let i = 0; i < n; i++){ const a = i / n * TAU; g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a + 0.5) * sz * 0.9, Math.sin(a + 0.5) * sz * 0.9, Math.cos(a) * sz * 1.4, Math.sin(a) * sz * 1.4); g.quadraticCurveTo(Math.cos(a - 0.15) * sz * 0.7, Math.sin(a - 0.15) * sz * 0.7, 0, 0); } fillStroke(g, fill, line, lw * 0.7); break; }
      case 'spike': { const n = L.n; g.beginPath(); for (let i = 0; i < n; i++){ const a = i / n * TAU, b = 0.28 / Math.max(1, n / 6); g.moveTo(Math.cos(a - b) * sz * 0.35, Math.sin(a - b) * sz * 0.35); g.lineTo(Math.cos(a) * sz * 1.4, Math.sin(a) * sz * 1.4); g.lineTo(Math.cos(a + b) * sz * 0.35, Math.sin(a + b) * sz * 0.35); } g.closePath(); fillStroke(g, fill, line, lw * 0.7); break; }
      case 'crescent': g.beginPath(); g.arc(0, 0, sz, -Math.PI * 0.8, Math.PI * 0.8); g.arc(sz * 0.45, 0, sz * 0.78, Math.PI * 0.78, -Math.PI * 0.78, true); g.closePath(); fillStroke(g, fill, line, lw); break;
      case 'flame': { const fl = Math.sin(age * 23) * 0.12; g.beginPath(); g.moveTo(sz * 1.5, 0); g.quadraticCurveTo(sz * 0.6, -sz * (0.9 + fl), -sz * 0.4, -sz * 0.75); g.quadraticCurveTo(-sz * 1.3 - fl * sz, -sz * 0.2, -sz * 1.1, 0); g.quadraticCurveTo(-sz * 1.3 + fl * sz, sz * 0.2, -sz * 0.4, sz * 0.75); g.quadraticCurveTo(sz * 0.6, sz * (0.9 - fl), sz * 1.5, 0); g.closePath(); fillStroke(g, fill, line, lw); break; }
      case 'dots': { const n = L.n; for (let i = 0; i < n; i++){ const a = i / n * TAU; circle(g, Math.cos(a) * sz, Math.sin(a) * sz, Math.max(1, sz * 0.3)); fillStroke(g, fill, line, lw * 0.6); } break; }
      case 'streak': g.lineCap = 'round'; g.strokeStyle = fill; g.lineWidth = Math.max(1, sz * 0.7); g.globalAlpha *= 0.55; g.beginPath(); g.moveTo(sz * 0.4, 0); g.lineTo(-sz * 2.2, 0); g.stroke(); g.globalAlpha /= 0.55; g.lineWidth = Math.max(0.6, sz * 0.3); g.beginPath(); g.moveTo(sz * 0.4, 0); g.lineTo(-sz * 1.4, 0); g.stroke(); break;
      case 'cross': g.lineCap = 'round'; g.strokeStyle = fill; g.lineWidth = Math.max(1, sz * 0.3); g.beginPath(); g.moveTo(-sz, 0); g.lineTo(sz, 0); g.moveTo(0, -sz); g.lineTo(0, sz); g.stroke(); if (line){ g.strokeStyle = line; g.lineWidth = Math.max(0.5, sz * 0.1); g.stroke(); } break;
      case 'eye': ell(g, 0, 0, sz, sz * 0.62); fillStroke(g, '#ffffff', line, lw); circle(g, sz * 0.2, 0, sz * 0.4); g.fillStyle = fill; g.fill(); circle(g, sz * 0.3, -sz * 0.15, sz * 0.14); g.fillStyle = '#ffffff'; g.fill(); break;
    }
    g.restore();
  }
  function drawObject(g, o, R, ang, spin, age){
    if (!o || !o.layers) return;
    age = age || 0;
    g.save();
    if (o.flicker) g.globalAlpha *= 1 - o.flicker * 0.5 * (0.5 + 0.5 * Math.sin(age * 37 + Math.sin(age * 51) * 2));
    const pulse = o.pulse ? 1 + Math.sin(age * 8) * o.pulse * 0.3 : 1;
    if (o.glow && !lowFx()){ g.save(); g.globalCompositeOperation = 'lighter'; circle(g, 0, 0, R * (1.3 + o.glow * 0.9) * pulse); g.fillStyle = rgbaStr(o.glowC, 0.1 + o.glow * 0.06); g.fill(); circle(g, 0, 0, R * (0.9 + o.glow * 0.45) * pulse); g.fillStyle = rgbaStr(o.glowC, 0.12 + o.glow * 0.08); g.fill(); g.restore(); }
    let rot = o.face === 'fly' ? ang : o.face === 'spin' ? spin : 0;
    if (o.spin) rot += age * o.spin * TAU;
    if (o.wobble) rot += Math.sin(age * 10) * o.wobble * 0.6;
    g.rotate(rot);
    g.scale(pulse, pulse);
    for (const L of o.layers) objLayer(g, L, R, age);
    g.restore();
  }
  function drawProj(g, p){
    const s = p.spec, sp = s.sprite;
    g.save(); g.translate(p.x, p.y);
    if (s.scale && s.scale !== 1 && sp !== 'shape') g.scale(s.scale, s.scale);
    const ang = Math.atan2(p.vy, p.vx);
    switch (sp){
      case 'sauce': {
        /* a drop of sauce flung off a turntable, its tail trailing */
        g.rotate(ang);
        const c = /^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color : '#c9362a';
        if (!lowFx()){ g.fillStyle = rgbaStr(c, 0.3); ell(g, -6, 0, 4.6, 1.5); g.fill(); }
        g.beginPath(); g.moveTo(-5.5, 0); g.quadraticCurveTo(-1, -3.1, 1.6, -2.9); g.arc(1.6, 0, 2.9, -Math.PI / 2, Math.PI / 2); g.quadraticCurveTo(-1, 3.1, -5.5, 0); g.closePath();
        fillStroke(g, c, shade(c, -0.42), 0.8);
        ell(g, 1.6, -1.2, 1.3, 0.7); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
        break;
      }
      case 'pepper': {
        /* a peppercorn, with a faint streak behind it */
        g.strokeStyle = 'rgba(60,40,28,0.35)'; g.lineWidth = 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-Math.cos(ang) * 9, -Math.sin(ang) * 9); g.stroke();
        circle(g, 0, 0, 2.9); fillStroke(g, '#3d2a1e', '#1d130c', 0.8);
        circle(g, -0.9, -1, 0.9); g.fillStyle = 'rgba(255,235,210,0.7)'; g.fill();
        break;
      }
      case 'shape': drawShape(g, s.shape, s.color, (s.size || 8) * 0.75, ang, p.spin, s.glow, s.trail); break;
      case 'obj': drawObject(g, s.obj, (s.size || 8) * 0.75, ang, p.spin, p.max != null ? p.max - p.life : (p.age || 0)); break;
      case 'olive':
        g.rotate(ang);
        g.strokeStyle = '#d9b77a'; g.lineWidth = 1.3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-8, 0); g.lineTo(6.5, 0); g.stroke();
        ell(g, 0, 0, 4.4, 3.5); fillStroke(g, '#6f8f2a', '#3f5414', 0.8);
        circle(g, 2.3, 0, 1.4); g.fillStyle = '#d6322f'; g.fill();
        ell(g, -1.3, -1.4, 1.6, 0.8); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill(); break;
      case 'grape':
        if (s.burn){ circle(g, 0, 0, 5); g.fillStyle = 'rgba(255,140,60,0.35)'; g.fill(); }
        circle(g, 0, 0, 3.2); fillStroke(g, s.burn ? '#8a2f4f' : '#6f3a8f', '#3b1a4f', 0.7);
        circle(g, -1, -1.1, 0.9); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill(); break;
      case 'meatball': g.rotate(p.spin * 0.3); meatball(g, (p.size || 8) * 0.62); break;
      case 'pickle':
        g.rotate(ang); rr(g, -6, -2.7, 12, 5.4, 2.7); fillStroke(g, s.burn ? '#9aa83a' : '#6f9f34', '#3f6a1a', 0.8);
        g.fillStyle = 'rgba(210,240,160,0.75)'; for (const x of [-3.2, 0, 3.2]) { circle(g, x, -1, 0.7); g.fill(); }
        if (s.burn){ circle(g, -6.5, 0, 1.8); g.fillStyle = 'rgba(255,138,61,0.75)'; g.fill(); } break;
      case 'mustard':
        g.rotate(ang);
        g.beginPath(); g.moveTo(-7, -2); g.lineTo(-13 - Math.random() * 3, 0); g.lineTo(-7, 2); g.closePath(); g.fillStyle = 'rgba(255,170,60,0.85)'; g.fill();
        rr(g, -8, -3.2, 12, 6.4, 2.4); fillStroke(g, '#f2c230', '#a8801a', 0.9);
        g.beginPath(); g.moveTo(4, -2.4); g.lineTo(9, 0); g.lineTo(4, 2.4); g.closePath(); fillStroke(g, '#d9332a', '#8a1a14', 0.7);
        g.fillStyle = '#c9363a'; g.fillRect(-4, -3.2, 2.2, 6.4);
        g.fillStyle = '#a8801a'; g.beginPath(); g.moveTo(-8, -3.2); g.lineTo(-10, -5.4); g.lineTo(-6, -3.2); g.moveTo(-8, 3.2); g.lineTo(-10, 5.4); g.lineTo(-6, 3.2); g.fill(); break;
      case 'sprinkle': {
        g.rotate(ang); const c = SPRINKLES[Math.floor((p.spin || 0) * 7) % 6];
        rr(g, -3.6, -1.25, 7.2, 2.5, 1.25); g.fillStyle = c; g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(-2.4, -1, 4, 0.7); break;
      }
      case 'chili':
        g.rotate(ang);
        g.beginPath(); g.moveTo(-7, -1.6); g.lineTo(-12 - Math.random() * 3, 0); g.lineTo(-7, 1.6); g.closePath(); g.fillStyle = 'rgba(255,190,80,0.85)'; g.fill();
        g.beginPath(); g.moveTo(-7, -2.2); g.quadraticCurveTo(2, -3.6, 8, 0.6); g.quadraticCurveTo(1, 2.4, -7, 2.2); g.closePath(); fillStroke(g, '#d9332a', '#8a1a14', 0.8);
        g.fillStyle = '#4f9a45'; g.fillRect(-8.6, -1.6, 2.4, 3.2); break;
      case 'scoop': {
        const c = SCOOP_COLORS[Math.floor((p.spin || 0) * 10) % 4];
        g.rotate(ang);
        g.fillStyle = rgbaStr(c, 0.4); ell(g, -5, 0, 4, 1.6); g.fill();
        circle(g, 0, 0, 4.6); fillStroke(g, c, shade(c, -0.32), 0.9);
        g.beginPath(); g.moveTo(-1.5, 3.6); g.quadraticCurveTo(-0.5, 6.5, 0.8, 3.8); g.fillStyle = c; g.fill();
        circle(g, 1.2, -1.6, 1.3); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill(); break;
      }
      case 'chopstick': {
        /* a pair of sharpened chopsticks, golden on a critical hit */
        g.rotate(ang);
        const gold = s.isCrit, c = gold ? '#ffd166' : '#d9b07a', d = gold ? '#b8861b' : '#8a5a2b';
        if (gold && !lowFx()){ g.strokeStyle = 'rgba(255,209,102,0.35)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-13, 0); g.lineTo(5, 0); g.stroke(); }
        g.lineCap = 'round';
        for (const y of [-1.1, 1.1]){
          g.strokeStyle = d; g.lineWidth = 2.1; g.beginPath(); g.moveTo(-8, y * 1.25); g.lineTo(7, y * 0.55); g.stroke();
          g.strokeStyle = c; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-8, y * 1.25); g.lineTo(7, y * 0.55); g.stroke();
        }
        if (gold) star(g, 7.5, 0, 2.6, '#fff4c2');
        break;
      }
      case 'coin': {
        const k = Math.abs(Math.cos(p.spin));
        ell(g, 0, 0, 4.2 * (0.3 + 0.7 * k), 4.2); fillStroke(g, k > 0.6 ? '#ffd166' : '#e8b52a', '#a57412', 0.9);
        if (k > 0.6){ ell(g, -1, -1.2, 1.2 * k, 1.6); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill(); } break;
      }
      case 'bean':
        g.rotate(ang);
        if (!lowFx()){ circle(g, 0, 0, 6.5); g.fillStyle = 'rgba(255,111,181,0.22)'; g.fill(); }
        g.beginPath(); g.ellipse(0, 0, 5.2, 3, 0, 0, TAU); fillStroke(g, '#ff6fb5', '#b03a78', 0.8);
        ell(g, -1.2, -1.2, 2, 0.8, -0.2); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill(); break;
      case 'knife': case 'goldknife':
        g.rotate(ang); g.beginPath(); g.moveTo(-2, -1.8); g.lineTo(9, -0.3); g.lineTo(9, 0.5); g.lineTo(-2, 1.8); g.closePath();
        fillStroke(g, sp === 'goldknife' ? '#ffd166' : '#eef3f5', '#6b777c', 0.6);
        rr(g, -9, -1.6, 7, 3.2, 1.2); g.fillStyle = sp === 'goldknife' ? '#9a6a10' : '#1f1f22'; g.fill(); break;
      case 'skewer':
        g.rotate(ang); g.fillStyle = '#9a6a3a'; g.fillRect(-10, -0.9, 20, 1.8);
        ['#c9363a', '#7ab648', '#f2c14e'].forEach((c, i) => { rr(g, -6 + i * 5, -2.6, 4, 5.2, 1.5); g.fillStyle = c; g.fill(); }); break;
      case 'cleaver':
        g.rotate(p.spin); rr(g, -7, -5, 12, 10, 1.5); fillStroke(g, '#dfe7ea', '#6b777c', 1); g.fillStyle = '#1f1f22'; g.fillRect(4, -1.5, 8, 3); circle(g, -4, -2, 1.2); g.fillStyle = '#6b777c'; g.fill(); break;
      case 'cutter':
        g.rotate(p.spin); circle(g, 0, 0, p.size); fillStroke(g, 'rgba(230,236,238,0.95)', '#7f8b90', 1.2);
        for (let i = 0; i < 6; i++){ const a = i / 6 * TAU; g.strokeStyle = '#8e9aa0'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size); g.stroke(); }
        circle(g, 0, 0, 2.5); g.fillStyle = '#c9363a'; g.fill(); break;
      case 'mezzaluna':
        g.rotate(p.spin); g.beginPath(); g.arc(0, 0, p.size, -2.2, 2.2); g.arc(-p.size * 0.35, 0, p.size * 0.75, 1.9, -1.9, true); g.closePath();
        fillStroke(g, '#e6ecee', '#6b777c', 1); g.fillStyle = '#7a4a26'; g.fillRect(-p.size * 0.9, -p.size * 0.95, 4, 4); g.fillRect(-p.size * 0.9, p.size * 0.6, 4, 4); break;
      case 'slicer':
        g.rotate(p.spin); circle(g, 0, 0, p.size); fillStroke(g, 'rgba(232,238,240,0.95)', '#6b777c', 1.5);
        for (let i = 0; i < 18; i++){ const a = i / 18 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * p.size, Math.sin(a) * p.size); g.lineTo(Math.cos(a + 0.18) * (p.size + 3), Math.sin(a + 0.18) * (p.size + 3)); g.lineTo(Math.cos(a + 0.34) * p.size, Math.sin(a + 0.34) * p.size); g.fillStyle = '#f4f7f8'; g.fill(); }
        circle(g, 0, 0, p.size * 0.35); fillStroke(g, '#5c666b', '#2e3437', 1); break;
      case 'toast': case 'waffle':
        g.rotate(p.spin * 0.3); rr(g, -6, -6, 12, 12, 2.5); fillStroke(g, '#e2b875', '#8a5a2b', 1.4);
        if (sp === 'waffle'){ g.strokeStyle = 'rgba(138,90,43,0.7)'; g.lineWidth = 0.8; for (let i = -3; i <= 3; i += 3){ g.beginPath(); g.moveTo(i, -5); g.lineTo(i, 5); g.moveTo(-5, i); g.lineTo(5, i); g.stroke(); } }
        else { rr(g, -4, -4, 8, 8, 1.5); g.fillStyle = '#f2d39b'; g.fill(); } break;
      case 'boulder':
        g.rotate(p.spin * 0.4); circle(g, 0, 0, p.size); fillStroke(g, '#b97a3c', '#6e4320', 1.5);
        g.strokeStyle = 'rgba(255,230,190,0.7)'; g.lineWidth = 1.5; for (let i = -1; i <= 1; i++){ g.beginPath(); g.moveTo(-p.size * 0.5, i * p.size * 0.4); g.lineTo(p.size * 0.5, i * p.size * 0.4 + 2); g.stroke(); } break;
      case 'bagel': case 'bigbagel':
        g.rotate(p.spin * 0.5); circle(g, 0, 0, p.size); fillStroke(g, '#d39b52', '#7a4a20', 1.4);
        circle(g, 0, 0, p.size * 0.35); g.fillStyle = 'rgba(40,30,20,0.7)'; g.fill();
        for (let i = 0; i < 8; i++){ const a = i / 8 * TAU; ell(g, Math.cos(a) * p.size * 0.65, Math.sin(a) * p.size * 0.65, 1.2, 0.6, a); g.fillStyle = '#fff6da'; g.fill(); }
        if (sp === 'bigbagel'){ g.strokeStyle = 'rgba(255,90,78,0.8)'; g.lineWidth = 2; circle(g, 0, 0, p.size + 4); g.stroke(); } break;
      case 'baguette':
        g.rotate(ang); rr(g, -13, -3.5, 26, 7, 3.5); fillStroke(g, '#e0a956', '#8a5a2b', 1);
        g.strokeStyle = 'rgba(255,240,200,0.8)'; for (let i = -8; i <= 8; i += 6){ g.beginPath(); g.moveTo(i - 2, -2); g.lineTo(i + 2, 2); g.stroke(); } break;
      case 'crumb': circle(g, 0, 0, 2.4); g.fillStyle = '#c98a45'; g.fill(); break;
      case 'shard': g.rotate(p.spin); g.beginPath(); g.moveTo(-3, -2); g.lineTo(4, 0); g.lineTo(-3, 2); g.closePath(); fillStroke(g, '#eef3f5', '#7f8b90', 0.6); break;
      case 'icecube': g.rotate(p.spin * 0.3); rr(g, -4.5, -4.5, 9, 9, 2); fillStroke(g, 'rgba(200,238,255,0.9)', '#6aa9c6', 1); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(-3, -3, 3, 2); break;
      case 'iceshard': g.rotate(ang); g.beginPath(); g.moveTo(-3, -1.6); g.lineTo(4, 0); g.lineTo(-3, 1.6); g.closePath(); g.fillStyle = '#cdeefc'; g.fill(); break;
      case 'icicle': g.rotate(ang); g.beginPath(); g.moveTo(-8, -2.6); g.lineTo(9, 0); g.lineTo(-8, 2.6); g.closePath(); fillStroke(g, '#bfe7fb', '#5aa6d6', 0.8); break;
      case 'glacier': case 'iceberg': {
        g.rotate(p.spin * 0.2); const r = p.size;
        g.beginPath(); for (let i = 0; i < 7; i++){ const a = i / 7 * TAU, rr2 = r * (0.8 + (i % 3) * 0.12); i ? g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : g.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.closePath();
        fillStroke(g, 'rgba(215,242,255,0.95)', '#5aa6d6', 1.5); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(-r * 0.4, -r * 0.4, r * 0.4, r * 0.25); break;
      }
      case 'popcorn': case 'kernel': case 'kettle': {
        const c = sp === 'kettle' ? '#e8a23c' : '#fff6da';
        for (let i = 0; i < 4; i++){ circle(g, Math.cos(i * 1.7) * 2.2, Math.sin(i * 1.7) * 2.2, 2.6); g.fillStyle = c; g.fill(); }
        circle(g, 0, 0, 1.4); g.fillStyle = '#f2c14e'; g.fill(); break;
      }
      case 'bubble': circle(g, 0, 0, 3.4); g.strokeStyle = 'rgba(190,240,255,0.95)'; g.lineWidth = 1.2; g.stroke(); circle(g, -1, -1, 0.9); g.fillStyle = '#fff'; g.fill(); break;
      case 'plate': case 'platter': case 'silver': {
        const r = p.size;
        g.fillStyle = 'rgba(0,0,0,0.15)'; ell(g, 2, 3, r, r * 0.8); g.fill();
        g.rotate(p.spin * 0.6);
        plateTop(g, 0, 0, r, sp);
        g.strokeStyle = sp === 'silver' ? '#c9a227' : '#4f86c6'; g.lineWidth = Math.max(1.2, r * 0.16); g.beginPath(); g.arc(0, 0, r * 0.83, 0, 1.3); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.83, Math.PI, Math.PI + 1.3); g.stroke();
        if (sp === 'silver'){ ell(g, -r * 0.3, -r * 0.3, r * 0.35, r * 0.16, -0.6); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill(); }
        break;
      }
      case 'fry': g.rotate(ang); rr(g, -6, -1.4, 12, 2.8, 1.2); fillStroke(g, '#f2c14e', '#b8861b', 0.6); break;
      case 'donut': {
        g.rotate(p.spin * 0.4); const r = p.size;
        circle(g, 0, 0, r); fillStroke(g, '#d9a066', '#8a5a2b', 1);
        circle(g, 0, 0, r * 0.82); g.fillStyle = '#f29ac0'; g.fill();
        circle(g, 0, 0, r * 0.34); g.fillStyle = 'rgba(60,40,30,0.75)'; g.fill();
        for (let i = 0; i < 6; i++){ g.fillStyle = ['#7ee07a', '#ffd166', '#5aa6d6'][i % 3]; g.fillRect(Math.cos(i * 1.1) * r * 0.58 - 0.7, Math.sin(i * 1.1) * r * 0.58 - 0.7, 1.6, 1.6); }
        break;
      }
      case 'churro':
        g.rotate(ang); rr(g, -9, -2.2, 18, 4.4, 2); fillStroke(g, '#c98a45', '#7a4a20', 0.8);
        g.strokeStyle = 'rgba(122,74,32,0.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-8, -0.8); g.lineTo(8, -0.8); g.moveTo(-8, 0.8); g.lineTo(8, 0.8); g.stroke();
        for (let i = -6; i <= 6; i += 3){ circle(g, i, (i % 2 ? 1 : -1) * 1.2, 0.5); g.fillStyle = '#fff6da'; g.fill(); }
        if (p.spec.burn){ circle(g, 9, 0, 2.2); g.fillStyle = 'rgba(255,138,61,0.8)'; g.fill(); }
        break;
      case 'funnel': {
        g.rotate(p.spin * 0.25); const r = p.size;
        circle(g, 0, 0, r); g.fillStyle = 'rgba(232,185,106,0.35)'; g.fill();
        g.strokeStyle = '#d9a056'; g.lineWidth = 2.6; g.lineCap = 'round';
        for (let i = 0; i < 6; i++){ g.beginPath(); g.arc(Math.cos(i * 1.05) * r * 0.45, Math.sin(i * 1.05) * r * 0.45, r * 0.45, i, i + 4.2); g.stroke(); }
        for (let i = 0; i < 10; i++){ circle(g, Math.cos(i * 2.3) * r * 0.7, Math.sin(i * 1.9) * r * 0.6, 1.1); g.fillStyle = '#ffffff'; g.fill(); }
        break;
      }
      case 'zap': {
        /* a microwave pulse: a hot streak with a bright core (red as a laser, cyan as plasma) */
        const c = s.plasma ? [159, 243, 255] : s.laser ? [255, 96, 80] : [255, 176, 103];
        const col = a => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
        g.rotate(ang); g.lineCap = 'round';
        g.strokeStyle = col(0.28); g.lineWidth = 5.5; g.beginPath(); g.moveTo(-15, 0); g.lineTo(0, 0); g.stroke();
        g.strokeStyle = col(0.75); g.lineWidth = 2.6; g.beginPath(); g.moveTo(-9, 0); g.lineTo(1.5, 0); g.stroke();
        ell(g, 1, 0, 3.4, 2.3); g.fillStyle = col(0.9); g.fill();
        ell(g, 1.4, 0, 1.6, 1.1); g.fillStyle = '#ffffff'; g.fill();
        break;
      }
      case 'chip': case 'echip':
        /* a chocolate chip, tip first (the paragon's crackle with electricity) */
        g.rotate(ang);
        if (sp === 'echip'){
          ell(g, -5, 0, 8, 3.4); g.fillStyle = 'rgba(255,224,102,0.28)'; g.fill();
          circle(g, 0, 0, 6.2); g.fillStyle = 'rgba(255,240,170,0.3)'; g.fill();
        }
        g.beginPath(); g.moveTo(4.4, 0); g.quadraticCurveTo(1, -3.2, -2.6, -2.4); g.quadraticCurveTo(-4.2, 0, -2.6, 2.4); g.quadraticCurveTo(1, 3.2, 4.4, 0); g.closePath();
        fillStroke(g, '#5a341b', sp === 'echip' ? '#ffe066' : '#2e1a0c', sp === 'echip' ? 1.1 : 0.7);
        ell(g, -0.6, -1, 1.5, 0.7, -0.3); g.fillStyle = 'rgba(255,225,190,0.45)'; g.fill();
        if (sp === 'echip' && !lowFx()){
          const k = (p.spin * 3) % TAU;
          g.strokeStyle = 'rgba(255,248,200,0.95)'; g.lineWidth = 1; g.lineCap = 'round';
          g.beginPath(); g.moveTo(Math.cos(k) * 3, Math.sin(k) * 3); g.lineTo(Math.cos(k + 0.4) * 6.5, Math.sin(k + 0.4) * 6.5 + 1); g.lineTo(Math.cos(k + 0.2) * 8.5, Math.sin(k + 0.2) * 8.5); g.stroke();
        }
        break;
      case 'batter': {
        /* a glob of hot batter with a drip trailing behind */
        g.rotate(ang);
        ell(g, -6, 0, 6, 1.7); g.fillStyle = 'rgba(240,200,98,0.5)'; g.fill();
        g.beginPath(); g.moveTo(5, 0); g.bezierCurveTo(4, -4.6, -3, -4.6, -4, -1.2); g.quadraticCurveTo(-7, 0, -4, 1.2); g.bezierCurveTo(-3, 4.6, 4, 4.6, 5, 0); g.closePath();
        fillStroke(g, '#f2c862', '#b8861b', 0.9);
        ell(g, 1.5, -1.5, 1.8, 0.9, -0.3); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
        break;
      }
      case 'coal': case 'hotcoal': case 'flare':
        if (sp !== 'coal'){ g.save(); g.rotate(ang); for (let i = 1; i <= 3; i++){ circle(g, -i * 4.5, Math.sin(p.spin + i) * 1.2, (sp === 'flare' ? 4.6 : 3.4) - i * 0.8); g.fillStyle = 'rgba(255,' + (120 + i * 35) + ',50,' + (0.55 - i * 0.13) + ')'; g.fill(); } g.restore(); }
        drawCoal(g, sp, p.spin);
        break;
      case 'fireball': {
        /* a fire bird's fireball: a tail of flame behind a white-hot core */
        g.rotate(ang);
        const lava = s.lava;
        for (let i = 3; i >= 1; i--){ circle(g, -i * 3.6, Math.sin(p.spin * 2 + i) * 1.1, 4.2 - i * 0.7); g.fillStyle = lava ? 'rgba(255,' + (70 + i * 30) + ',30,' + (0.75 - i * 0.16) + ')' : 'rgba(255,' + (140 + i * 25) + ',50,' + (0.75 - i * 0.16) + ')'; g.fill(); }
        circle(g, 0, 0, 4.3); g.fillStyle = lava ? '#ff5a1f' : '#ff9a3d'; g.fill();
        circle(g, 0.6, 0, 2.3); g.fillStyle = '#fff1a8'; g.fill();
        break;
      }
      case 'slice':
        g.rotate(ang + p.spin * 0.15);
        g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -4.5); g.lineTo(-4, 4.5); g.closePath(); fillStroke(g, '#f6d66b', '#c9802a', 0.8);
        rr(g, -5.5, -5, 2.5, 10, 1.2); g.fillStyle = '#e0a956'; g.fill();
        circle(g, -0.5, 0, 1.3); g.fillStyle = '#b8322a'; g.fill(); break;
      case 'brioche': {
        /* a giant brioche missile: a glazed bun with a smoky trail */
        g.rotate(ang);
        for (let i = 1; i <= 3; i++){ circle(g, -i * 7, Math.sin(p.spin + i) * 1.5, 6 - i * 1.2); g.fillStyle = 'rgba(255,' + (150 + i * 25) + ',70,' + (0.55 - i * 0.12) + ')'; g.fill(); }
        circle(g, 0, 0, 8); fillStroke(g, '#d98a3a', '#7a4214', 1.2);
        for (const [x, y, r] of [[-2.5, -2.5, 3.6], [2.5, -2, 3.2], [0, 3, 3.4]]){ circle(g, x, y, r); g.fillStyle = '#e8a54a'; g.fill(); }
        circle(g, 0.5, -0.5, 2.6); fillStroke(g, '#f2c14e', '#a85a1a', 0.6);
        ell(g, -2.6, -3.4, 2, 0.9, -0.5); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
        break;
      }
      /* the second wave */
      case 'star': case 'goldstar': {
        const gold = sp === 'goldstar';
        if (gold && !lowFx()){ circle(g, 0, 0, 7); g.fillStyle = 'rgba(255,209,102,0.25)'; g.fill(); }
        g.rotate((p.max - p.life) * 22 + p.spin);
        carrotStar(g, 0, 0, gold ? 5 : 4.4, gold);
        break;
      }
      case 'flash':
        g.rotate((p.max - p.life) * 8);
        circle(g, 0, 0, 4.6); fillStroke(g, '#7ab648', '#2f5214', 0.9);
        circle(g, -1.2, -1.2, 1.4); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
        g.strokeStyle = '#d9b77a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(3, -3); g.quadraticCurveTo(5, -5.5, 6.5, -5.5); g.stroke();
        star(g, 6.8, -5.8, 2, Math.floor((p.max - p.life) * 20) % 2 ? '#ffd166' : '#ffffff');
        break;
      case 'wasabi':
        g.rotate(ang);
        if (!lowFx()){ circle(g, -4, 0, 3.4); g.fillStyle = 'rgba(143,209,106,0.35)'; g.fill(); }
        g.beginPath(); g.moveTo(5, 0); g.bezierCurveTo(3, -4.6, -4, -4.2, -4.4, 0); g.bezierCurveTo(-4, 4.2, 3, 4.6, 5, 0); fillStroke(g, '#8fd16a', '#3f6a1a', 0.9);
        circle(g, 1, -1.4, 1.1); g.fillStyle = 'rgba(255,255,255,0.65)'; g.fill();
        break;
      case 'seed': case 'hotseed': {
        const hot = sp === 'hotseed';
        g.strokeStyle = hot ? 'rgba(255,120,40,0.45)' : 'rgba(242,194,48,0.4)'; g.lineWidth = 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-Math.cos(ang) * 7, -Math.sin(ang) * 7); g.stroke();
        circle(g, 0, 0, 2.2); fillStroke(g, hot ? '#ff7a1a' : '#f2c230', hot ? '#8a2a0a' : '#8a6a10', 0.6);
        break;
      }
      case 'toothpick': case 'goldpick': {
        const gold = sp === 'goldpick', L = (p.size || 5) >= 6 ? 7 : 5.5;
        g.rotate(ang); g.lineCap = 'round';
        g.strokeStyle = gold ? '#b8861b' : '#a87a4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L - 1.5, 0); g.stroke();
        g.strokeStyle = gold ? '#ffd166' : '#e8c99a'; g.lineWidth = 1.2; g.stroke();
        g.fillStyle = gold ? '#fff4c2' : '#f4e2c2'; g.beginPath(); g.moveTo(L - 2, -1); g.lineTo(L + 1.6, 0); g.lineTo(L - 2, 1); g.closePath(); g.fill();
        break;
      }
      case 'salt': g.rotate((p.max - p.life) * 14); rr(g, -2.2, -2.2, 4.4, 4.4, 0.6); fillStroke(g, '#ffffff', '#b9c4c9', 0.7); break;
      case 'pepperball': circle(g, 0, 0, 3.4); fillStroke(g, '#2a2624', '#0e0c0b', 0.8); circle(g, -1, -1.1, 1); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); break;
      case 'frostpellet': g.rotate(ang); g.beginPath(); g.moveTo(4, 0); g.lineTo(0, 2.4); g.lineTo(-3.4, 0); g.lineTo(0, -2.4); g.closePath(); fillStroke(g, '#dff4ff', '#7fb8d8', 0.8); break;
      case 'spark': {
        g.rotate(ang);
        if (!lowFx()){ circle(g, 0, 0, 5); g.fillStyle = 'rgba(255,224,138,0.3)'; g.fill(); }
        g.strokeStyle = '#fff4c2'; g.lineWidth = 1.6; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(-4, -1.5); g.lineTo(-1, 1.2); g.lineTo(1, -1.2); g.lineTo(4, 1.4); g.stroke();
        break;
      }
      case 'rocket':
        g.rotate(ang);
        g.beginPath(); g.moveTo(-6, -1.8); g.lineTo(-11 - Math.random() * 4, 0); g.lineTo(-6, 1.8); g.closePath(); g.fillStyle = 'rgba(255,170,60,0.9)'; g.fill();
        rr(g, -6.5, -2.6, 10, 5.2, 2); fillStroke(g, '#dfe7ea', '#5c666b', 0.8);
        g.beginPath(); g.moveTo(3.5, -2.2); g.lineTo(7.5, 0); g.lineTo(3.5, 2.2); g.closePath(); g.fillStyle = '#e2383f'; g.fill();
        g.fillStyle = '#e2383f'; g.beginPath(); g.moveTo(-6.5, -2.6); g.lineTo(-8.5, -4.6); g.lineTo(-4.5, -2.6); g.moveTo(-6.5, 2.6); g.lineTo(-8.5, 4.6); g.lineTo(-4.5, 2.6); g.fill();
        break;
      case 'fork': {
        /* a fork flung tines first, glinting when it has flown far (a riptide fork hits harder) */
        g.rotate(ang);
        const hot = p.edge > 0 && s.grow, k2 = hot ? clamp(p.edge / s.grow.max, 0, 1) : 0;
        if (hot && !lowFx()){ circle(g, 2, 0, 5 + k2 * 4); g.fillStyle = 'rgba(160,220,255,' + (0.15 + k2 * 0.3).toFixed(3) + ')'; g.fill(); }
        g.strokeStyle = '#c9d2d6'; g.lineWidth = 1.6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-7, 0); g.lineTo(2, 0); g.stroke();
        g.strokeStyle = '#eef3f5'; g.lineWidth = 1;
        g.beginPath(); for (const y of [-2, -0.7, 0.7, 2]){ g.moveTo(2, y * 0.6); g.lineTo(7, y); } g.stroke();
        g.beginPath(); g.moveTo(2, -1.4); g.lineTo(2, 1.4); g.stroke();
        break;
      }
      case 'iceball': {
        if (!lowFx()){ circle(g, 0, 0, 8); g.fillStyle = 'rgba(190,233,255,0.3)'; g.fill(); }
        circle(g, 0, 0, 5); fillStroke(g, '#e6f6ff', '#7fb8d8', 1);
        g.strokeStyle = '#9fd3e8'; g.lineWidth = 0.8; g.save(); g.rotate((p.max - p.life) * 6); for (let i = 0; i < 3; i++){ const a2 = i * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a2) * 3.4, Math.sin(a2) * 3.4); g.lineTo(-Math.cos(a2) * 3.4, -Math.sin(a2) * 3.4); g.stroke(); } g.restore();
        break;
      }
      default: circle(g, 0, 0, p.size * 0.6); g.fillStyle = '#ffffff'; g.fill();
    }
    g.restore();
  }
  /* a lump of charcoal: plain, glowing hot, or a flare-up */
  function drawCoal(g, sp, spin){
    const big = sp === 'flare', hot = sp === 'hotcoal';
    if (hot){ circle(g, 0, 0, 7); g.fillStyle = 'rgba(255,140,50,0.35)'; g.fill(); }
    g.save(); g.rotate(spin);
    g.beginPath(); for (let i = 0; i < 7; i++){ const an = i / 7 * TAU, r = (big ? 6.5 : 4.6) * (0.82 + (i % 3) * 0.12); i ? g.lineTo(Math.cos(an) * r, Math.sin(an) * r) : g.moveTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath();
    fillStroke(g, big ? '#ff9a3d' : '#3a2a22', big ? '#c2410c' : '#14100c', 1);
    g.strokeStyle = big ? '#fff1a8' : '#ff7a2a'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-2.5, -1); g.lineTo(0.5, 0.5); g.lineTo(2.5, -1.5); g.moveTo(-1, 2); g.lineTo(1.5, 2.5); g.stroke();
    g.restore();
  }
  function drawLob(g, L){
    const k = clamp(L.t / L.dur, 0, 1);
    const x = L.x0 + (L.x1 - L.x0) * k, y = L.y0 + (L.y1 - L.y0) * k, h = Math.sin(k * Math.PI) * L.h;
    if (L.drop){
      /* falling straight down from an aircraft: it shrinks toward the ground while its shadow grows */
      g.fillStyle = 'rgba(0,0,0,' + (0.1 + k * 0.2).toFixed(3) + ')'; ell(g, L.x1 + (1 - k) * 8, L.y1 + (1 - k) * 12, 3 + k * 4, 2 + k * 2.5); g.fill();
      g.save(); g.translate(x, y); const z = 1.6 - k * 0.7; g.scale(z, z); g.rotate(L.spin + k * 3);
      meatball(g, L.spec.sprite === 'meatball' ? 5 : 4.5);
      g.restore();
      return;
    }
    g.fillStyle = 'rgba(0,0,0,0.18)'; ell(g, x, y, 4 + k * 2, 2.5 + k); g.fill();
    g.save(); g.translate(x, y - h);
    const sp = L.cloud ? 'smoke' : L.spec.sprite;
    if (L.spec.scale && L.spec.scale !== 1 && sp !== 'shape') g.scale(L.spec.scale, L.spec.scale);
    if (sp === 'shape'){ drawShape(g, L.spec.shape, L.spec.color, (L.spec.size || 8) * 0.75, L.spin + k * 6, L.spin + k * 6, L.spec.glow, false); }
    else if (sp === 'obj'){ drawObject(g, L.spec.obj, (L.spec.size || 8) * 0.75, L.spin + k * 6, L.spin + k * 6, k * L.dur); }
    else if (sp === 'coal' || sp === 'hotcoal' || sp === 'flare'){
      if (sp === 'flare'){ for (let i = 0; i < 3; i++){ circle(g, -Math.cos(k * 3 + i) * 2, 3 + i * 3.5, 4.5 - i); g.fillStyle = 'rgba(255,' + (150 + i * 30) + ',60,' + (0.6 - i * 0.15) + ')'; g.fill(); } }
      drawCoal(g, sp, L.spin + k * 6);
    }
    else if (sp === 'pizza' || sp === 'bigpizza'){ g.rotate(L.spin + k * 9); pizzaTop(g, sp === 'bigpizza' ? 13 : 9, sp === 'bigpizza'); }
    else if (sp === 'meatball'){ g.rotate(L.spin + k * 6); meatball(g, 5); }
    else if (sp === 'oil'){ circle(g, 0, 0, 5); fillStroke(g, '#e0a83a', '#9c6a14', 1); circle(g, -1.5, -1.5, 1.4); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill(); }
    else if (sp === 'smoke'){ for (let i = 0; i < 3; i++){ circle(g, Math.cos(i * 2) * 3, Math.sin(i * 2) * 3, 4.5); g.fillStyle = 'rgba(200,200,200,0.7)'; g.fill(); } }
    else if (sp === 'vinegar' || sp === 'shrink'){
      /* a ladleful of hot vinegar (or a reduction potion) tumbling through the air */
      const pur = sp === 'shrink';
      g.rotate(L.spin + k * 7);
      g.beginPath(); g.moveTo(0, -5.5); g.bezierCurveTo(5, -2, 5.5, 4, 0, 5.5); g.bezierCurveTo(-5.5, 4, -5, -2, 0, -5.5);
      fillStroke(g, pur ? 'rgba(155,106,217,0.92)' : 'rgba(214,206,96,0.9)', pur ? '#4a2a7a' : '#7a7020', 0.9);
      ell(g, -1.6, -1, 1.3, 2.2, 0.3); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
      if (!lowFx()) for (let i = 0; i < 2; i++){ circle(g, Math.cos(i * 3 + k * 9) * 6, Math.sin(i * 3 + k * 9) * 6, 1); g.fillStyle = pur ? '#d6c0ff' : '#f2e98a'; g.fill(); }
    }
    else if (sp === 'foam'){ g.rotate(L.spin + k * 4); for (const [x, y, r] of [[-2, -1, 3.4], [2.2, 0.5, 3], [0, 2.4, 2.6], [1, -2.6, 2.2]]){ circle(g, x, y, r); fillStroke(g, 'rgba(250,253,255,0.95)', '#b9d6e6', 0.7); } }
    else if (sp === 'brewcup'){
      /* a steaming cup of brew for another appliance */
      g.rotate(Math.sin(k * Math.PI) * 0.6);
      rr(g, -4, -3, 8, 7, 2); fillStroke(g, '#f4efe6', '#9aa3a8', 0.8);
      ell(g, 0, -2.6, 3.2, 1); g.fillStyle = '#d9332a'; g.fill();
      g.strokeStyle = '#f4efe6'; g.lineWidth = 1.2; g.beginPath(); g.arc(4.6, 0.6, 1.8, -1.2, 1.2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-1, -4); g.quadraticCurveTo(0.5, -6, -0.5, -8); g.stroke();
    }
    else if (sp === 'stone'){
      /* the Philosopher's Stone */
      g.rotate(L.spin + k * 5);
      circle(g, 0, 0, 9); g.fillStyle = 'rgba(255,120,90,0.25)'; g.fill();
      g.beginPath(); g.moveTo(0, -7); g.lineTo(5, -1.5); g.lineTo(0, 7); g.lineTo(-5, -1.5); g.closePath(); fillStroke(g, '#e2231a', '#7a0a0a', 1);
      g.beginPath(); g.moveTo(0, -7); g.lineTo(2, -1.5); g.lineTo(0, 7); g.closePath(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
      star(g, 4, -5, 2.4, '#fff4c2');
    }
    else { const c = sp === 'kettle' ? '#e8a23c' : '#fff6da'; for (let i = 0; i < 4; i++){ circle(g, Math.cos(i * 1.7) * 2.4, Math.sin(i * 1.7) * 2.4, 2.8); g.fillStyle = c; g.fill(); } }
    g.restore();
  }

  /* ---------------- zones ---------------- */
  function drawPuddle(g, pd, t){
    const life = clamp(1 - pd.t / pd.dur, 0, 1);
    const a = Math.min(1, life * 3) * (pd.t < 0.15 ? pd.t / 0.15 : 1);
    const p = pd.spec;
    g.save(); g.translate(pd.x, pd.y); g.globalAlpha = a;
    g.beginPath();
    for (let i = 0; i <= 18; i++){ const an = i / 18 * TAU; const r = pd.r * (0.88 + Math.sin(an * 3 + pd.seed) * 0.07 + Math.sin(an * 5 + pd.seed * 2) * 0.05); i ? g.lineTo(Math.cos(an) * r, Math.sin(an) * r) : g.moveTo(Math.cos(an) * r, Math.sin(an) * r); }
    g.closePath();
    const vin = p.vinegar, foam = p.foam;
    g.fillStyle = foam ? 'rgba(235,245,252,0.62)' : vin ? 'rgba(206,198,86,0.5)' : p.toxic ? 'rgba(170,205,40,0.5)' : p.sauce ? 'rgba(196,40,30,0.62)' : p.fire ? 'rgba(204,120,30,0.55)' : 'rgba(214,160,52,0.5)'; g.fill();
    g.strokeStyle = foam ? 'rgba(170,205,225,0.7)' : vin ? 'rgba(120,112,30,0.45)' : p.sauce ? 'rgba(120,20,14,0.5)' : 'rgba(140,90,20,0.45)'; g.lineWidth = 1.5; g.stroke();
    ell(g, -pd.r * 0.3, -pd.r * 0.3, pd.r * 0.28, pd.r * 0.12, -0.5); g.fillStyle = p.sauce && !vin ? 'rgba(255,200,180,0.45)' : 'rgba(255,250,220,0.55)'; g.fill();
    if (vin || foam){
      /* vinegar fizzes; dish soap foams */
      for (let i = 0; i < 5; i++){ const k = (t * 1.1 + i * 0.21 + pd.seed) % 1, an = i * 1.37 + pd.seed; circle(g, Math.cos(an) * pd.r * 0.55, Math.sin(an) * pd.r * 0.42, foam ? 2.5 + (i % 3) * 1.5 : 0.8 + k * 2); g.strokeStyle = foam ? 'rgba(255,255,255,0.85)' : 'rgba(250,245,200,' + (0.85 * (1 - k)) + ')'; g.lineWidth = 1; g.stroke(); }
    } else if (p.sauce){
      /* basil leaves and a slow simmer */
      for (let i = 0; i < 3; i++){ const an = pd.seed + i * 2.1, rr2 = pd.r * 0.45; g.save(); g.translate(Math.cos(an) * rr2, Math.sin(an) * rr2 * 0.8); g.rotate(an); ell(g, 0, 0, 3.4, 1.7); g.fillStyle = '#4f9a45'; g.fill(); g.restore(); }
      for (let i = 0; i < 4; i++){ const k = (t * 0.9 + i * 0.27 + pd.seed) % 1, an = i * 1.7 + pd.seed; circle(g, Math.cos(an) * pd.r * 0.55, Math.sin(an) * pd.r * 0.42, 1 + k * 2.4); g.strokeStyle = 'rgba(255,150,130,' + (0.8 * (1 - k)) + ')'; g.lineWidth = 1; g.stroke(); }
    }
    if (p.boil){ for (let i = 0; i < 6; i++){ const k = (t * 1.3 + i * 0.29 + pd.seed) % 1, an = i * 2.1 + pd.seed; circle(g, Math.cos(an) * pd.r * 0.5, Math.sin(an) * pd.r * 0.4, 1.5 + k * 3); g.strokeStyle = 'rgba(255,240,190,' + (1 - k) + ')'; g.lineWidth = 1; g.stroke(); } }
    if (p.fire){
      const n = Math.max(3, Math.round(pd.r / 9));
      for (let i = 0; i < n; i++){
        const an = i / n * TAU + pd.seed, rr2 = pd.r * 0.55;
        const fx = Math.cos(an) * rr2, fy = Math.sin(an) * rr2 * 0.8, h = 8 + Math.sin(t * 10 + i * 1.7 + pd.seed) * 3;
        g.beginPath(); g.moveTo(fx - 4, fy); g.quadraticCurveTo(fx, fy - h * 1.5, fx + 4, fy); g.closePath(); g.fillStyle = 'rgba(255,138,61,0.85)'; g.fill();
        g.beginPath(); g.moveTo(fx - 2, fy); g.quadraticCurveTo(fx, fy - h * 0.9, fx + 2, fy); g.closePath(); g.fillStyle = 'rgba(255,224,102,0.9)'; g.fill();
      }
    }
    g.restore();
  }
  function drawCloud(g, c, t){
    const life = clamp(c.t / c.dur, 0, 1);
    const a = (life < 0.15 ? life / 0.15 : 1) * (1 - Math.max(0, (life - 0.7) / 0.3));
    if (c.spec.foam){
      g.save(); g.translate(c.x, c.y); g.globalAlpha = a * 0.9;
      for (let i = 0; i < 12; i++){ const an = i * 2.4 + c.seed, rr2 = c.r * (0.25 + (i % 4) * 0.18); const br = c.r * (0.2 + (i % 3) * 0.06); circle(g, Math.cos(an) * rr2, Math.sin(an) * rr2, br); g.fillStyle = 'rgba(250,252,255,0.55)'; g.fill(); g.strokeStyle = 'rgba(200,225,240,0.6)'; g.lineWidth = 1; g.stroke(); }
      g.restore();
      return;
    }
    g.save(); g.translate(c.x, c.y); g.globalAlpha = a * 0.75;
    for (let i = 0; i < 7; i++){
      const an = i / 7 * TAU + c.seed + t * 0.3, r = c.r * 0.45;
      circle(g, Math.cos(an) * r, Math.sin(an) * r, c.r * 0.5); g.fillStyle = i % 2 ? 'rgba(180,180,180,0.35)' : 'rgba(215,215,215,0.32)'; g.fill();
    }
    g.restore();
  }
  /* the body of a trap, drawn around (0, 0) at size r (everything but its blinking light) */
  function drawTrapBody(g, sprite, r, dot){
    switch (sprite){
      case 'meatball':
        /* a meatball in a splash of sauce */
        ell(g, 0.5, 1.2, r * 0.95, r * 0.72); g.fillStyle = 'rgba(190,40,30,0.55)'; g.fill();
        meatball(g, r * 0.68);
        break;
      case 'ravioli':
        rr(g, -r * 0.75, -r * 0.75, r * 1.5, r * 1.5, 3); fillStroke(g, '#f2d48a', '#b8903a', 1.2);
        g.strokeStyle = 'rgba(184,144,58,0.9)'; g.lineWidth = 1; g.setLineDash([2, 1.6]); rr(g, -r * 0.6, -r * 0.6, r * 1.2, r * 1.2, 2); g.stroke(); g.setLineDash([]);
        circle(g, 0, 0, r * 0.32); g.fillStyle = '#d9462e'; g.fill();
        break;
      case 'lasagna':
        g.beginPath(); for (let i = 0; i <= 8; i++){ const xx = -r + i * r / 4; g.lineTo(xx, -r * 0.7 + (i % 2 ? -1.6 : 0)); } for (let i = 8; i >= 0; i--){ const xx = -r + i * r / 4; g.lineTo(xx, r * 0.7 + (i % 2 ? 1.6 : 0)); } g.closePath();
        fillStroke(g, '#f0d27a', '#b8903a', 1);
        g.fillStyle = '#c9363a'; g.fillRect(-r * 0.8, -r * 0.18, r * 1.6, r * 0.36);
        g.fillStyle = '#fff6da'; for (let i = 0; i < 3; i++){ circle(g, -r * 0.5 + i * r * 0.5, -r * 0.35, 1.3); g.fill(); }
        break;
      case 'penne':
        for (let i = 0; i < 6; i++){ g.save(); g.rotate(i * 1.05); g.translate(r * 0.35, 0); rr(g, -4, -1.6, 8, 3.2, 0.8); fillStroke(g, '#e8c25a', '#a87a2a', 0.7); g.restore(); }
        break;
      case 'caltrop':
        /* a toothpick caltrop: four points, one always sticking up */
        for (let i = 0; i < 4; i++){
          g.save(); g.rotate(i * Math.PI / 2 + 0.3);
          g.strokeStyle = '#c9a36a'; g.lineWidth = 1.8; g.lineCap = 'round';
          g.beginPath(); g.moveTo(0, 0); g.lineTo(r * 0.8, 0); g.stroke();
          g.fillStyle = '#fff3d6'; g.beginPath(); g.moveTo(r * 0.8, -0.9); g.lineTo(r * 1.02, 0); g.lineTo(r * 0.8, 0.9); g.closePath(); g.fill();
          g.restore();
        }
        circle(g, 0, 0, 2.2); fillStroke(g, '#7ab648', '#3f6a1a', 0.6);
        break;
      case 'cage': {
        /* a pest trap: a wire cage with a spring door */
        rr(g, -r * 0.9, -r * 0.75, r * 1.8, r * 1.5, 3); fillStroke(g, 'rgba(60,70,76,0.35)', '#3d4549', 1.6);
        g.strokeStyle = '#8e9aa0'; g.lineWidth = 1;
        for (let i = 1; i < 5; i++){ const x = -r * 0.9 + i * r * 0.36; g.beginPath(); g.moveTo(x, -r * 0.75); g.lineTo(x, r * 0.75); g.stroke(); }
        g.beginPath(); g.moveTo(-r * 0.9, 0); g.lineTo(r * 0.9, 0); g.stroke();
        rr(g, -r * 0.3, -r * 0.95, r * 0.6, r * 0.3, 1.5); fillStroke(g, '#c9a227', '#7a5a10', 0.8);
        break;
      }
      case 'toothpick':
        /* a scatter of toothpicks pointing every way */
        for (let i = 0; i < 6; i++){
          g.save(); g.rotate(i * 1.05 + (i % 2) * 0.4);
          g.strokeStyle = '#d9b77a'; g.lineWidth = 1.6; g.lineCap = 'round';
          g.beginPath(); g.moveTo(-r * 0.15, 0); g.lineTo(r * 0.85, 0); g.stroke();
          g.fillStyle = '#fff3d6'; g.beginPath(); g.moveTo(r * 0.85, -0.8); g.lineTo(r * 1.05, 0); g.lineTo(r * 0.85, 0.8); g.closePath(); g.fill();
          g.restore();
        }
        circle(g, 0, 0, 2); g.fillStyle = '#b8903a'; g.fill();
        break;
      default: {
        const lin = sprite === 'linguine';
        g.strokeStyle = lin ? '#e6c25a' : '#f0d27a'; g.lineWidth = lin ? 2.4 : 1.6; g.lineCap = 'round';
        for (let i = 0; i < (lin ? 4 : 5); i++){ g.beginPath(); g.ellipse(Math.cos(i * 1.3) * 2, Math.sin(i * 1.7) * 2, r * 0.8, r * 0.5, i * 0.7, 0, TAU); g.stroke(); }
        g.strokeStyle = 'rgba(168,122,42,0.6)'; g.lineWidth = 0.7; g.beginPath(); g.arc(0, 0, r * 0.5, 0, 4); g.stroke();
        if (dot){ circle(g, 1, -1, 2.6); g.fillStyle = '#c9363a'; g.fill(); }
      }
    }
  }
  /* traps come in crowds and mostly sit still, so each look, size and turn (one of 16) is drawn once
     and only stamped after that: no rotating or path-filling per trap per frame */
  const TRAP_TURNS = 16;
  function trapSprite(sprite, r, dot, turn){
    const rq = Math.round(r * 2) / 2;
    const key = 'trap:' + sprite + ':' + rq + (dot ? ':d' : '') + ':' + turn + ':' + SK;
    let c = cache.get(key);
    if (c) return c;
    const half = Math.ceil(rq * 1.3 + 5);
    c = mkCanvas(half * 2 * SK, half * 2 * SK);
    const g = c.getContext('2d'); g.scale(SK, SK); g.translate(half, half); g.rotate(turn * TAU / TRAP_TURNS);
    drawTrapBody(g, sprite, rq, dot);
    c._half = half;
    cache.set(key, c);
    return c;
  }
  function drawTrap(g, tr, t){
    const fk = clamp(tr.t / tr.fly, 0, 1);
    let x, y, drop = 1;
    if (tr.rain){
      /* dropped from above: a growing shadow on the trail, the mine shrinking down onto it */
      x = tr.x; y = tr.y; drop = 1 + (1 - fk) * 1.6;
      if (fk < 1){ g.fillStyle = 'rgba(0,0,0,' + (0.1 + fk * 0.2) + ')'; ell(g, x + 2, y + 3, tr.r * (0.5 + fk * 0.5), tr.r * (0.35 + fk * 0.35)); g.fill(); }
      y -= (1 - fk) * 18;
    } else { x = tr.x0 + (tr.x - tr.x0) * fk; y = tr.y0 + (tr.y - tr.y0) * fk - Math.sin(fk * Math.PI) * 26; }
    const fade = clamp(tr.life / 1.5, 0, 1) * (tr.rain ? 0.35 + fk * 0.65 : 1);
    if (fade <= 0) return;
    const rav = tr.sprite === 'ravioli', r = tr.r;
    const sc = (tr.mine ? 1 : 0.62 + 0.38 * (tr.pierce / tr.max)) * drop * (rav ? 1 + Math.sin(t * 6 + tr.seed) * 0.05 : 1);
    const rot = tr.rot + (tr.rain ? (1 - fk) * 3 : 0);
    const turn = ((Math.round(rot / TAU * TRAP_TURNS) % TRAP_TURNS) + TRAP_TURNS) % TRAP_TURNS;
    const spr = trapSprite(tr.sprite, r, !!(tr.spec && tr.spec.slow && tr.spec.slow.mult <= 0.5), turn), h = spr._half * sc;
    const ga = g.globalAlpha;
    if (fade < 1) g.globalAlpha = ga * fade;
    g.drawImage(spr, x - h, y - h, h * 2, h * 2);
    if (tr.catch){
      /* how full the cage is, and the pests inside it */
      const k = clamp(tr.held / tr.cap, 0, 1), w = r * 2;
      const n = Math.min(6, Math.ceil(k * 6));
      for (let i = 0; i < n; i++){ circle(g, x - r * 0.5 + (i % 3) * r * 0.5, y - r * 0.28 + Math.floor(i / 3) * r * 0.56, 2.1); g.fillStyle = '#3a2418'; g.fill(); }
      g.fillStyle = 'rgba(29,43,51,0.75)'; rr(g, x - w / 2, y - r - 9, w, 4, 2); g.fill();
      g.fillStyle = tr.full ? (Math.floor(t * 8) % 2 ? '#ffd166' : '#fff4c2') : '#9df29a'; rr(g, x - w / 2, y - r - 9, Math.max(2, w * k), 4, 2); g.fill();
    }
    if (rav){
      /* the blinking light on a mine */
      const a = turn * TAU / TRAP_TURNS, lx = r * 0.5 * sc, ly = -r * 0.5 * sc;
      circle(g, x + lx * Math.cos(a) - ly * Math.sin(a), y + lx * Math.sin(a) + ly * Math.cos(a), 1.4 * sc);
      g.fillStyle = Math.sin(t * 10 + tr.seed) > 0 ? '#ff5a4e' : '#ffd166'; g.fill();
    }
    g.globalAlpha = ga;
  }
  function drawWhirl(g, w, t){
    if (w.undead){ drawUndead(g, w, t); return; }
    if (w.pawn){ drawMarchPawn(g, w, t); return; }
    const fadeIn = clamp(w.t / 0.15, 0, 1), fadeOut = clamp(w.left / 40, 0, 1);
    g.save(); g.translate(w.x, w.y); g.globalAlpha = fadeIn * fadeOut;
    const hur = w.spec.hurricane;
    const rot = -t * (hur ? 14 : 11) - w.seed;
    g.fillStyle = hur ? 'rgba(150,175,200,0.3)' : 'rgba(230,242,250,0.3)'; circle(g, 0, 0, w.r); g.fill();
    for (let i = 0; i < 4; i++){
      const r0 = w.r * (0.3 + i * 0.2), a0 = rot + i * 1.7;
      g.strokeStyle = hur ? 'rgba(40,55,75,0.35)' : 'rgba(60,90,110,0.3)'; g.lineWidth = hur ? 5 : 4;
      g.beginPath(); g.arc(0, 0, r0, a0, a0 + 2.4); g.stroke();
      g.strokeStyle = hur ? 'rgba(120,140,165,' + (0.95 - i * 0.12) + ')' : 'rgba(255,255,255,' + (0.95 - i * 0.12) + ')';
      g.lineWidth = hur ? 3 : 2.2;
      g.beginPath(); g.arc(0, 0, r0, a0, a0 + 2.4); g.stroke();
    }
    if (!lowFx()) for (let i = 0; i < 3; i++){ const an = rot * 1.3 + i * 2.1, rr2 = w.r * 0.75; circle(g, Math.cos(an) * rr2, Math.sin(an) * rr2, 1.6); g.fillStyle = hur ? '#5d6f80' : '#e8d9b8'; g.fill(); }
    g.restore();
  }
  /* the stand mixer's storms: a whirlwind (white), a bowl's whirlwind (batter) or a roaming superstorm */
  function drawStorm(g, s, t){
    const fadeIn = clamp(s.t / 0.2, 0, 1), fadeOut = clamp(s.life / 0.4, 0, 1);
    g.save(); g.translate(s.x, s.y); g.globalAlpha = fadeIn * fadeOut;
    if (s.k === 'super'){
      const R = s.r, rot = -t * 3.2 - s.seed;
      const gr = g.createRadialGradient(0, 0, R * 0.15, 0, 0, R);
      gr.addColorStop(0, 'rgba(70,86,104,0.55)'); gr.addColorStop(0.65, 'rgba(96,114,134,0.32)'); gr.addColorStop(1, 'rgba(120,140,160,0)');
      g.fillStyle = gr; circle(g, 0, 0, R); g.fill();
      g.lineCap = 'round';
      for (let i = 0; i < 5; i++){
        const r0 = R * (0.22 + i * 0.16), a0 = rot * (1.25 - i * 0.12) + i * 1.3;
        g.strokeStyle = 'rgba(40,52,68,' + (0.4 - i * 0.05) + ')'; g.lineWidth = 7 - i;
        g.beginPath(); g.arc(0, 0, r0, a0, a0 + 2.2); g.stroke();
        g.strokeStyle = 'rgba(214,226,236,' + (0.85 - i * 0.12) + ')'; g.lineWidth = 3 - i * 0.35;
        g.beginPath(); g.arc(0, 0, r0, a0 + 0.15, a0 + 2.05); g.stroke();
      }
      /* lightning flickers inside it */
      if (!lowFx() && Math.sin(t * 17 + s.seed * 3) > 0.55){
        const an = Math.floor(t * 9 + s.seed) * 2.4, r1 = R * 0.75;
        g.strokeStyle = 'rgba(255,240,160,0.95)'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an + 0.3) * r1 * 0.45, Math.sin(an + 0.3) * r1 * 0.45); g.lineTo(Math.cos(an - 0.2) * r1 * 0.7, Math.sin(an - 0.2) * r1 * 0.7); g.lineTo(Math.cos(an) * r1, Math.sin(an) * r1); g.stroke();
      }
      g.restore(); return;
    }
    const bowl = s.k === 'bowl', R = s.r, rot = -t * 11 - s.seed;
    g.fillStyle = bowl ? 'rgba(242,223,182,0.32)' : 'rgba(230,242,250,0.3)'; circle(g, 0, 0, R); g.fill();
    for (let i = 0; i < 4; i++){
      const r0 = R * (0.3 + i * 0.2), a0 = rot + i * 1.7;
      g.strokeStyle = bowl ? 'rgba(150,110,60,0.3)' : 'rgba(60,90,110,0.3)'; g.lineWidth = 4;
      g.beginPath(); g.arc(0, 0, r0, a0, a0 + 2.4); g.stroke();
      g.strokeStyle = bowl ? 'rgba(250,236,204,' + (0.95 - i * 0.12) + ')' : 'rgba(255,255,255,' + (0.95 - i * 0.12) + ')'; g.lineWidth = 2.2;
      g.beginPath(); g.arc(0, 0, r0, a0, a0 + 2.4); g.stroke();
    }
    if (!lowFx()) for (let i = 0; i < 3; i++){ const an = rot * 1.3 + i * 2.1, rr2 = R * 0.75; circle(g, Math.cos(an) * rr2, Math.sin(an) * rr2, 1.7); g.fillStyle = bowl ? '#5a341b' : '#e8d9b8'; g.fill(); }
    g.restore();
  }
  /* a ball of thunder meringue: a swirled white peak in a crackling glow */
  function drawOrb(g, o, t){
    const fade = clamp(o.life / 0.35, 0, 1), born = clamp((o.max - o.life) / 0.2, 0, 1);
    g.save(); g.translate(o.x, o.y); g.globalAlpha = fade; g.scale(0.5 + 0.5 * born, 0.5 + 0.5 * born);
    const R = o.r;
    const gr = g.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 1.7);
    gr.addColorStop(0, 'rgba(255,246,190,0.55)'); gr.addColorStop(1, 'rgba(255,224,102,0)');
    g.fillStyle = gr; circle(g, 0, 0, R * 1.7); g.fill();
    g.rotate(t * 2 + o.seed);
    for (let i = 0; i < 4; i++){ circle(g, 0, -i * R * 0.16, R * (0.62 - i * 0.13)); fillStroke(g, i % 2 ? '#fffdf6' : '#f6f0e2', '#d9cfba', 0.8); }
    g.strokeStyle = 'rgba(217,207,186,0.9)'; g.lineWidth = 0.9;
    g.beginPath(); g.arc(0, 0, R * 0.42, 0.3, 2.6); g.stroke();
    if (!lowFx()) for (let i = 0; i < 3; i++){
      if (Math.sin(t * 23 + i * 2 + o.seed) < 0.2) continue;
      const an = i * 2.1 + Math.floor(t * 12) * 0.9;
      g.strokeStyle = 'rgba(255,236,120,0.95)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(Math.cos(an) * R * 0.6, Math.sin(an) * R * 0.6); g.lineTo(Math.cos(an + 0.25) * R * 0.95, Math.sin(an + 0.25) * R * 0.95); g.lineTo(Math.cos(an - 0.1) * R * 1.25, Math.sin(an - 0.1) * R * 1.25); g.stroke();
    }
    g.restore();
  }
  /* one chocolate spike: a sharp shard with a lit edge (zone 0-2: small and milky to big and dark) */
  function spike(g, x, y, ang, len, zone){
    const w = len * 0.42;
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = 'rgba(40,22,10,0.25)'; g.beginPath(); g.moveTo(len + 1.2, 1.2); g.lineTo(1, -w + 1.2); g.lineTo(1, w + 1.2); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(len, 0); g.lineTo(0, -w); g.quadraticCurveTo(-w * 0.6, 0, 0, w); g.closePath();
    fillStroke(g, zone >= 2 ? '#3d2210' : zone ? '#5a341b' : '#7a4a26', '#24130a', 0.6);
    g.strokeStyle = 'rgba(255,226,190,0.55)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(len * 0.85, -w * 0.12); g.lineTo(len * 0.15, -w * 0.72); g.stroke();
    g.restore();
  }
  /* a pile of chocolate spikes left on the trail by a dough hook (like a bramble of thorns) */
  function drawPile(g, p, t){
    const left = p.life - p.t, fade = clamp(left / 0.8, 0, 1), born = clamp(p.t / 0.2, 0, 1);
    g.save(); g.translate(p.x, p.y); g.globalAlpha = fade; g.scale(0.4 + 0.6 * born, 0.4 + 0.6 * born);
    g.fillStyle = 'rgba(60,35,18,0.2)'; ell(g, 1, 2, p.r * 1.1, p.r * 0.8); g.fill();
    const big = p.spec.dmg >= 5 ? 2 : p.spec.dmg >= 2 ? 1 : 0, n = 6 + big * 2;
    /* spikes splayed out from the middle in every direction, the biggest standing up in the middle */
    for (let i = 0; i < n; i++){
      const an = i / n * TAU + p.seed, rr2 = p.r * (0.18 + (i % 2) * 0.12);
      spike(g, Math.cos(an) * rr2, Math.sin(an) * rr2 * 0.8, an + Math.sin(i * 1.7 + p.seed) * 0.35, p.r * (0.62 + (i % 3) * 0.1) + big, big);
    }
    for (let i = 0; i < 3; i++){ const an = i * 2.1 + p.seed * 2; spike(g, Math.cos(an) * 1.5, Math.sin(an) * 1.2 - 1, an - Math.PI / 2, p.r * 0.5 + big, Math.min(2, big + 1)); }
    g.restore();
  }
  function drawLoaf(g, L, t){
    const k = clamp(L.t / 0.35, 0, 1);
    const x = L.sx + (L.x - L.sx) * k, y = L.sy + (L.y - L.sy) * k - Math.sin(k * Math.PI) * 26;
    const blink = L.life - L.t < 3 && Math.floor(t * 8) % 2 === 0;
    if (blink) return;
    g.save(); g.translate(x, y + Math.sin(t * 3 + L.v) * 1.2);
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, 2, 6, 11, 4); g.fill();
    rr(g, -11, -7, 22, 13, 6); fillStroke(g, L.golden ? '#f2c14e' : '#d08d45', L.golden ? '#a57412' : '#7a4a20', 1.4);
    g.strokeStyle = 'rgba(255,240,200,0.8)'; g.lineWidth = 1.4; for (let i = -1; i <= 1; i++){ g.beginPath(); g.moveTo(-3 + i * 6, -5); g.lineTo(1 + i * 6, 3); g.stroke(); }
    if (L.golden){ star(g, 9, -8, 3, '#fff6c2'); }
    g.restore();
  }

  /* ---------------- effects ---------------- */
  function drawFx(g, f, t){
    const k = clamp(f.t / f.life, 0, 1);
    if (f.t < 0) return;
    switch (f.k){
      case 'ring': case 'whirl': case 'frost': case 'steam': case 'hole': {
        const r = f.r0 + (f.r1 - f.r0) * Math.sqrt(k);
        g.save();
        if (f.k === 'frost'){
          const rg = g.createRadialGradient(f.x, f.y, r * 0.2, f.x, f.y, r);
          rg.addColorStop(0, 'rgba(210,240,255,0)'); rg.addColorStop(0.8, 'rgba(210,240,255,' + 0.35 * (1 - k) + ')'); rg.addColorStop(1, 'rgba(255,255,255,' + 0.6 * (1 - k) + ')');
          g.fillStyle = rg; circle(g, f.x, f.y, r); g.fill();
        } else if (f.k === 'whirl' || f.k === 'hole'){
          g.strokeStyle = f.k === 'hole' ? 'rgba(160,100,255,' + (1 - k) * 0.8 + ')' : rgbaStr(f.c, (1 - k) * 0.7); g.lineWidth = 3;
          for (let i = 0; i < 3; i++){ g.beginPath(); g.arc(f.x, f.y, r * (0.6 + i * 0.18), k * 6 + i * 2.1, k * 6 + i * 2.1 + 1.6); g.stroke(); }
        } else if (f.k === 'steam'){
          for (let i = 0; i < 8; i++){ const a = i / 8 * TAU; circle(g, f.x + Math.cos(a) * r * 0.8, f.y + Math.sin(a) * r * 0.8, 6 + k * 6); g.fillStyle = 'rgba(255,255,255,' + 0.35 * (1 - k) + ')'; g.fill(); }
        } else {
          g.strokeStyle = rgbaStr(f.c, 1 - k); g.lineWidth = f.w || 3; circle(g, f.x, f.y, r); g.stroke();
        }
        g.restore(); break;
      }
      case 'cooked': {
        /* a cooked pest: it curls up, spins once, darkens and fades while smoke puffs off it */
        const q = k, sc = 1 - q * 0.75, spr = !f.big && !BIG[f.type] ? (f.gold ? goldSprite(f.type, 0) : spriteFor(f.type, 0)) : null;
        g.save(); g.translate(f.x, f.y - q * 10);
        for (let i = 0; i < 3; i++){ const ph = (q + i * 0.3) % 1; circle(g, Math.sin(f.seed + i * 2.1) * f.r * 0.5 * (1 + ph), -ph * (f.big ? 40 : 22) - 4, (f.big ? 7 : 3.5) * (0.6 + ph)); g.fillStyle = 'rgba(80,70,64,' + (0.4 * (1 - ph)).toFixed(3) + ')'; g.fill(); }
        if (spr){
          g.globalAlpha = 1 - q * q; g.rotate(f.rot + q * Math.PI * 1.2); g.scale(sc, sc);
          const hh = spr._half; g.drawImage(spr, -hh, -hh, hh * 2, hh * 2);
          g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(40,24,12,' + (q * 0.6).toFixed(3) + ')'; g.fillRect(-hh, -hh, hh * 2, hh * 2);
        }
        g.restore(); break;
      }
      case 'boom': {
        const r = f.r * (0.45 + 0.55 * Math.sqrt(k));
        g.save();
        const rg = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        rg.addColorStop(0, 'rgba(255,250,230,' + 0.9 * (1 - k) + ')'); rg.addColorStop(0.5, rgbaStr(f.c, 0.7 * (1 - k))); rg.addColorStop(1, rgbaStr(f.c, 0));
        g.fillStyle = rg; circle(g, f.x, f.y, r); g.fill();
        g.strokeStyle = 'rgba(255,255,255,' + 0.5 * (1 - k) + ')'; g.lineWidth = 2; circle(g, f.x, f.y, r); g.stroke();
        g.restore(); break;
      }
      case 'splat': {
        /* a splash of batter that spreads and soaks in */
        const r = f.r * (0.5 + 0.5 * Math.sqrt(k)), a = 1 - k;
        g.save(); g.translate(f.x, f.y);
        const edge = [];
        for (let i = 0; i < 24; i++){ const an = i / 24 * TAU, q = r * (0.82 + 0.14 * Math.sin(an * 3 + f.seed) + 0.06 * Math.sin(an * 7 + f.seed * 2)); edge.push([Math.cos(an) * q, Math.sin(an) * q]); }
        g.beginPath();
        edge.forEach((p0, i) => { const p1 = edge[(i + 1) % edge.length], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2; i ? g.quadraticCurveTo(p0[0], p0[1], mx, my) : g.moveTo(mx, my); });
        g.closePath();
        const sg = g.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r);
        sg.addColorStop(0, 'rgba(255,236,170,' + 0.6 * a + ')'); sg.addColorStop(1, 'rgba(232,186,80,' + 0.45 * a + ')');
        g.fillStyle = sg; g.fill(); g.strokeStyle = 'rgba(184,134,27,' + 0.5 * a + ')'; g.lineWidth = 1.2; g.stroke();
        for (let i = 0; i < 6; i++){ const an = i * 1.05 + f.seed, q = r * (1.05 + (i % 2) * 0.2); circle(g, Math.cos(an) * q, Math.sin(an) * q, 2.2 * a + 0.6); g.fillStyle = 'rgba(242,200,98,' + 0.8 * a + ')'; g.fill(); }
        g.restore(); break;
      }
      case 'mini': { const r = 6 + k * 16; g.fillStyle = 'rgba(255,200,110,' + 0.7 * (1 - k) + ')'; circle(g, f.x, f.y, r); g.fill(); break; }
      case 'basket': {
        const r = f.r0 + (f.r1 - f.r0) * Math.sqrt(k);
        g.save(); g.globalAlpha = 1 - k;
        g.strokeStyle = 'rgba(217,164,65,0.9)'; g.lineWidth = 6 * (1 - k) + 1.5; circle(g, f.x, f.y, r); g.stroke();
        g.strokeStyle = 'rgba(80,88,92,0.7)'; g.lineWidth = 1; g.setLineDash([3, 3]); circle(g, f.x, f.y, r * 0.92); g.stroke(); g.setLineDash([]);
        for (let i = 0; i < 10; i++){ const an = i / 10 * TAU + k; circle(g, f.x + Math.cos(an) * r, f.y + Math.sin(an) * r, 2.5 * (1 - k) + 0.8); g.fillStyle = '#ffe08a'; g.fill(); }
        g.restore(); break;
      }
      case 'chop': {
        /* a giant cleaver drops onto the toughest pest, following it as it falls */
        if (f.e && !f.e.dead){ f.x = f.e.x; f.y = f.e.y; }
        g.fillStyle = 'rgba(0,0,0,' + (0.1 + 0.32 * k) + ')'; ell(g, f.x + 6, f.y + 6, 16 + k * 24, 6 + k * 8); g.fill();
        g.save(); g.translate(f.x + (1 - k) * 30, f.y - 20 - (1 - k) * (1 - k) * 280); g.rotate(-0.5 + k * 0.5); g.scale(1.6, 1.6);
        rr(g, -24, -4, 16, 8, 3); fillStroke(g, '#6a4128', '#2e1d12', 1.4);
        g.beginPath(); g.moveTo(-9, -16); g.lineTo(18, -16); g.quadraticCurveTo(22, -16, 22, -12); g.lineTo(22, 16); g.lineTo(-9, 16); g.closePath(); fillStroke(g, '#e6ecee', '#4b565b', 1.6);
        g.fillStyle = 'rgba(160,172,178,0.5)'; g.fillRect(-7, -14, 27, 6);
        g.strokeStyle = '#ffffff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-7, 13.5); g.lineTo(20, 13.5); g.stroke();
        circle(g, 15, -8, 2.6); g.fillStyle = '#8e9aa0'; g.fill();
        g.restore(); break;
      }
      case 'mallet': {
        /* a meat mallet pounds down once */
        const sw = k < 0.45 ? k / 0.45 : 1, a = -1.3 + sw * 1.3;
        g.save(); g.translate(f.x - 6, f.y - 14); g.rotate(a); g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        g.strokeStyle = '#8a5a2b'; g.lineWidth = 3.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-14, 0); g.lineTo(4, 0); g.stroke();
        rr(g, 2, -7, 9, 14, 2); fillStroke(g, '#c9d2d6', '#4b565b', 1.2);
        g.fillStyle = '#7f8b90'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++){ circle(g, 9.4 + j * 0, -4.5 + i * 4.5, 0.9); g.fill(); }
        g.restore();
        if (k > 0.42){ g.save(); g.globalAlpha = 1 - k; star(g, f.x, f.y, 6 + (k - 0.42) * 22, 'rgba(255,255,255,0.95)'); g.restore(); }
        break;
      }
      case 'flick': {
        /* a pair of chopsticks darting in from the appliance to flick the pest, then back */
        const an = Math.atan2(f.y - f.y0, f.x - f.x0), q = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7;
        g.save(); g.translate(f.x, f.y); g.rotate(an);
        if (!lowFx()){
          g.globalAlpha = Math.min(1, (1 - k) * 3);
          const pal = STICK_PAL[f.look] || STICK_PAL.bamboo, tip = -3 + q * 4, back = tip - 24;
          chopstick(g, back, -2.6, tip, -0.5, 2.2, pal); chopstick(g, back + 1, 2.6, tip - 0.6, 0.5, 2.2, pal);
        }
        if (k < 0.45){ g.globalAlpha = (1 - k / 0.45) * 0.9; star(g, 2.5, 0, 3.5 + k * 9, '#fffbe6'); }
        g.restore(); break;
      }
      case 'whack': {
        const a = Math.atan2(f.y - f.y0, f.x - f.x0);
        g.save(); g.translate(f.x, f.y); g.globalAlpha = 1 - k;
        star(g, 0, 0, 7 + k * 5, 'rgba(255,255,255,0.9)');
        g.strokeStyle = 'rgba(255,240,200,0.9)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 10 + k * 6, a + Math.PI - 0.9, a + Math.PI + 0.9); g.stroke();
        g.restore(); break;
      }
      case 'gust': {
        const r = f.r * Math.sqrt(k);
        g.save(); g.globalAlpha = (1 - k) * 0.85; g.lineCap = 'round';
        for (let i = 0; i < 4; i++){ g.strokeStyle = i % 2 ? 'rgba(226,206,164,0.9)' : 'rgba(255,255,255,0.75)'; g.lineWidth = 4 - i * 0.6; const a0 = k * 8 + i * 1.6; g.beginPath(); g.arc(f.x, f.y, r * (0.45 + i * 0.18), a0, a0 + 2.4); g.stroke(); }
        g.strokeStyle = 'rgba(201,172,122,0.9)'; g.lineWidth = 3; circle(g, f.x, f.y, r); g.stroke();
        g.restore(); break;
      }
      case 'flare': {
        const r = f.r * Math.sqrt(k);
        g.save(); g.globalAlpha = (1 - k) * 0.9;
        const gr = g.createRadialGradient(f.x, f.y, r * 0.2, f.x, f.y, r); gr.addColorStop(0, 'rgba(255,214,102,0.5)'); gr.addColorStop(0.7, 'rgba(255,110,40,0.35)'); gr.addColorStop(1, 'rgba(255,60,30,0)');
        g.fillStyle = gr; circle(g, f.x, f.y, r); g.fill();
        g.strokeStyle = 'rgba(255,90,40,0.9)'; g.lineWidth = 4; circle(g, f.x, f.y, r); g.stroke();
        g.restore(); break;
      }
      case 'dread': {
        const r = f.r * Math.sqrt(k);
        g.save(); g.globalAlpha = (1 - k) * 0.8;
        g.fillStyle = 'rgba(120,200,190,0.16)'; circle(g, f.x, f.y, r); g.fill();
        g.strokeStyle = 'rgba(127,255,227,0.85)'; g.lineWidth = 3; g.setLineDash([10, 8]); circle(g, f.x, f.y, r); g.stroke(); g.setLineDash([]);
        g.restore(); break;
      }
      case 'domain': {
        /* Unlimited Kitchen: the whole kitchen goes violet, with slow rings rolling out from the chef */
        const a = k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1;
        g.save(); g.globalAlpha = a;
        g.fillStyle = 'rgba(28,10,64,0.42)'; g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++){ const q = (t * 0.25 + i / 5) % 1; g.strokeStyle = 'rgba(139,92,246,' + (0.5 * (1 - q)).toFixed(3) + ')'; g.lineWidth = 3; circle(g, f.x, f.y, 40 + q * 1500); g.stroke(); }
        for (let i = 0; i < 12; i++){ const an = i / 12 * TAU + t * 0.1; g.strokeStyle = 'rgba(215,198,255,0.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x + Math.cos(an) * 1600, f.y + Math.sin(an) * 1600); g.stroke(); }
        g.restore(); break;
      }
      case 'drain': {
        const r = f.r * (1 - k);
        g.save(); g.globalAlpha = 0.7 * (1 - k * 0.6);
        g.strokeStyle = 'rgba(190,160,255,0.85)'; g.lineWidth = 2.5; g.setLineDash([4, 6]); circle(g, f.x, f.y, Math.max(4, r)); g.stroke(); g.setLineDash([]);
        g.restore(); break;
      }
      case 'fling': {
        g.save(); g.globalAlpha = 1 - k;
        for (let i = 0; i < 6; i++){ const a = i * 1.05, d = 20 + k * 70; circle(g, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 3); g.fillStyle = i % 2 ? '#7d5a33' : '#6f9e4f'; g.fill(); }
        g.restore(); break;
      }
      case 'stink': {
        const r = f.r * Math.sqrt(k);
        g.save(); g.globalAlpha = (1 - k) * 0.85;
        for (let i = 0; i < 12; i++){ const a = i / 12 * TAU + k * 2; circle(g, f.x + Math.cos(a) * r * 0.75, f.y + Math.sin(a) * r * 0.75, r * 0.28); g.fillStyle = i % 2 ? 'rgba(150,200,80,0.35)' : 'rgba(190,220,110,0.3)'; g.fill(); }
        g.strokeStyle = 'rgba(110,160,50,0.9)'; g.lineWidth = 3; circle(g, f.x, f.y, r); g.stroke();
        g.restore(); break;
      }
      case 'punch': {
        /* Punch Down: a dough hook bursts up through the floor, squeezes, and sinks back */
        const up = k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6, R = f.r || 14;
        g.save(); g.translate(f.x, f.y); g.globalAlpha = Math.min(1, 1.6 - k * 1.4);
        g.strokeStyle = 'rgba(201,164,106,0.7)'; g.lineWidth = 2; circle(g, 0, 2, R * (0.6 + k * 0.7)); g.stroke();
        g.lineCap = 'round';
        for (const [w, c] of [[7, '#c9a46a'], [4.5, '#f3e1b8']]){
          g.strokeStyle = c; g.lineWidth = w;
          g.beginPath(); g.moveTo(-R * 0.2, 4); g.quadraticCurveTo(-R * 0.9, -R * up * 0.6, -R * 0.1, -R * up * 1.1); g.quadraticCurveTo(R * 0.7, -R * up * 1.25, R * 0.5, -R * up * 0.45); g.stroke();
        }
        for (let i = 0; i < 3; i++){ const a = i * 2.1 + k * 4; circle(g, Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.5 + 3, 1.6); g.fillStyle = '#5a341b'; g.fill(); }
        g.restore(); break;
      }
      case 'gust': {
        g.save(); g.globalAlpha = 1 - k; g.strokeStyle = 'rgba(235,245,250,0.85)'; g.lineWidth = 2; g.setLineDash([5, 5]); g.lineDashOffset = -k * 30;
        const mx = (f.x1 + f.x2) / 2 + (f.y2 - f.y1) * 0.15, my = (f.y1 + f.y2) / 2 - (f.x2 - f.x1) * 0.15;
        g.beginPath(); g.moveTo(f.x1, f.y1); g.quadraticCurveTo(mx, my, f.x2, f.y2); g.stroke(); g.setLineDash([]);
        g.restore(); break;
      }
      case 'rinse': {
        g.save();
        const x = -120 + k * (W + 240);
        const grd = g.createLinearGradient(x - 160, 0, x + 40, 0);
        grd.addColorStop(0, 'rgba(127,211,255,0)'); grd.addColorStop(0.75, 'rgba(127,211,255,' + 0.35 * (1 - k * 0.5) + ')'); grd.addColorStop(1, 'rgba(255,255,255,' + 0.6 * (1 - k * 0.5) + ')');
        g.fillStyle = grd; g.fillRect(x - 160, 0, 200, H);
        for (let i = 0; i < 14; i++){ const yy = (i / 14) * H + Math.sin(k * 10 + i) * 10; circle(g, x + Math.sin(i * 3.1) * 12, yy, 4 + (i % 3) * 2); g.fillStyle = 'rgba(255,255,255,' + 0.7 * (1 - k) + ')'; g.fill(); }
        g.restore(); break;
      }
      case 'beam': {
        g.save(); g.globalCompositeOperation = 'lighter';
        const a = 1 - k;
        if (f.water){
          const dx = f.x2 - f.x1, dy = f.y2 - f.y1, len = Math.hypot(dx, dy) || 1;
          g.globalCompositeOperation = 'source-over';
          g.lineCap = 'round';
          g.strokeStyle = 'rgba(127,211,255,' + 0.55 * a + ')'; g.lineWidth = f.w * 1.5; g.beginPath(); g.moveTo(f.x1, f.y1); g.lineTo(f.x2, f.y2); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,' + 0.8 * a + ')'; g.lineWidth = Math.max(1.5, f.w * 0.4); g.beginPath(); g.moveTo(f.x1, f.y1); g.lineTo(f.x2, f.y2); g.stroke();
          for (let i = 0; i < 6; i++){ const s2 = (i / 6 + k * 2) % 1; circle(g, f.x1 + dx * s2 + Math.sin(i * 7 + t * 30) * 3, f.y1 + dy * s2 + Math.cos(i * 5 + t * 30) * 3, 1.6); g.fillStyle = 'rgba(220,245,255,' + a + ')'; g.fill(); }
          circle(g, f.x2, f.y2, 5 + k * 6); g.strokeStyle = 'rgba(200,240,255,' + a + ')'; g.lineWidth = 1.5; g.stroke();
        } else if (f.bolt){
          /* forked lightning: a jagged white-hot line in a glow */
          const dx = f.x2 - f.x1, dy = f.y2 - f.y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, n = Math.max(3, Math.round(len / 14));
          const pts = [];
          const hash = q => { const v = Math.sin(q * 78.233 + (f.seed || 0) * 12.9898) * 43758.5453; return v - Math.floor(v) - 0.5; };
          for (let i = 0; i <= n; i++){ const s2 = i / n, j = i && i < n ? hash(i) * 16 : 0; pts.push([f.x1 + dx * s2 + nx * j, f.y1 + dy * s2 + ny * j]); }
          g.lineJoin = 'round'; g.lineCap = 'round';
          for (const [w, c] of [[6, rgbaStr(f.c, 0.3 * a)], [2.2, rgbaStr(f.c, 0.95 * a)], [1, 'rgba(255,255,255,' + a + ')']]){ g.strokeStyle = c; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
        } else if (f.laser){
          g.strokeStyle = rgbaStr(f.c, 0.35 * a); g.lineWidth = f.w * 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(f.x1, f.y1); g.lineTo(f.x2, f.y2); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,' + 0.9 * a + ')'; g.lineWidth = Math.max(1.5, f.w * 0.45); g.beginPath(); g.moveTo(f.x1, f.y1); g.lineTo(f.x2, f.y2); g.stroke();
        } else {
          const dx = f.x2 - f.x1, dy = f.y2 - f.y1, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
          g.strokeStyle = rgbaStr(f.c, 0.85 * a); g.lineWidth = 2.5; g.beginPath();
          for (let i = 0; i <= 30; i++){ const s = i / 30, w = Math.sin(s * len * 0.25 + t * 40) * f.w * 0.6; const px = f.x1 + dx * s + nx * w, py = f.y1 + dy * s + ny * w; i ? g.lineTo(px, py) : g.moveTo(px, py); }
          g.stroke();
          g.strokeStyle = rgbaStr(f.c, 0.25 * a); g.lineWidth = f.w * 2; g.beginPath(); g.moveTo(f.x1, f.y1); g.lineTo(f.x2, f.y2); g.stroke();
        }
        g.restore(); break;
      }
      case 'tracer': {
        if (f.squirt){
          /* a squirt of sauce: a quick streak with a drop at its head */
          const q = Math.min(1, k * 3), x2 = f.x1 + (f.x2 - f.x1) * q, y2 = f.y1 + (f.y2 - f.y1) * q, q0 = Math.max(0, q - 0.45);
          g.save(); g.lineCap = 'round';
          g.strokeStyle = rgbaStr(f.c || '#e2383f', 0.9 * (1 - k)); g.lineWidth = 2.6; g.beginPath(); g.moveTo(f.x1 + (f.x2 - f.x1) * q0, f.y1 + (f.y2 - f.y1) * q0); g.lineTo(x2, y2); g.stroke();
          circle(g, x2, y2, 2.2 * (1 - k) + 0.6); g.fillStyle = rgbaStr(f.c || '#e2383f', 1 - k); g.fill();
          g.restore(); break;
        }
        g.strokeStyle = 'rgba(255,246,224,' + (1 - k) + ')'; g.lineWidth = 2; g.beginPath(); g.moveTo(f.x1, f.y1); g.lineTo(f.x1 + (f.x2 - f.x1) * Math.min(1, k * 3), f.y1 + (f.y2 - f.y1) * Math.min(1, k * 3)); g.stroke(); break; }
      case 'pop': { g.save(); g.translate(f.x, f.y); for (let i = 0; i < 6; i++){ const a = i / 6 * TAU; g.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')'; g.lineWidth = 2; g.beginPath(); g.moveTo(Math.cos(a) * (3 + k * 6), Math.sin(a) * (3 + k * 6)); g.lineTo(Math.cos(a) * (7 + k * 9), Math.sin(a) * (7 + k * 9)); g.stroke(); } g.restore(); break; }
      case 'zap': {
        g.save(); g.globalCompositeOperation = 'lighter';
        if (f.segs){
          /* forked lightning: every branch a jagged arc in a glow (the jags are fixed for its whole life) */
          if (!f.jag){ f.jag = f.segs.map(([x1, y1, x2, y2]) => { const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, n = Math.max(2, Math.round(len / 16)), pts = []; for (let i = 0; i <= n; i++){ const s2 = i / n, j = i && i < n ? (Math.random() - 0.5) * 12 : 0; pts.push([x1 + dx * s2 + nx * j, y1 + dy * s2 + ny * j]); } return pts; }); }
          const a = 1 - k;
          const passes = lowFx() ? [[2, rgbaStr(f.c || '#ffe066', a)]] : [[5, rgbaStr(f.c || '#ffe066', 0.28 * a)], [2, rgbaStr(f.c || '#ffe066', 0.95 * a)], [0.9, 'rgba(255,255,255,' + a + ')']];
          g.lineJoin = 'round'; g.lineCap = 'round';
          for (const [w, c] of passes){ g.strokeStyle = c; g.lineWidth = w; g.beginPath(); for (const pts of f.jag) pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
          g.restore(); break;
        }
        g.strokeStyle = f.c ? rgbaStr(f.c, 1 - k) : 'rgba(160,230,255,' + (1 - k) + ')'; g.lineWidth = 2;
        g.beginPath();
        for (let i = 0; i < f.pts.length; i++){
          const [x, y] = f.pts[i];
          if (!i){ g.moveTo(x, y); continue; }
          const [px, py] = f.pts[i - 1];
          for (let s = 1; s <= 4; s++){ const q = s / 4; g.lineTo(px + (x - px) * q + (s < 4 ? (Math.random() - 0.5) * 10 : 0), py + (y - py) * q + (s < 4 ? (Math.random() - 0.5) * 10 : 0)); }
        }
        g.stroke(); g.restore(); break;
      }
      case 'text': {
        g.save(); g.globalAlpha = 1 - k * k;
        g.font = '700 ' + (f.size || 14) + 'px "Barlow Condensed", sans-serif'; g.textAlign = 'center';
        g.lineWidth = 3; g.strokeStyle = 'rgba(20,24,28,0.8)'; g.strokeText(f.txt, f.x, f.y - k * 22);
        g.fillStyle = f.c; g.fillText(f.txt, f.x, f.y - k * 22);
        g.restore(); break;
      }
      case 'flash': { g.fillStyle = f.c; g.globalAlpha = 1 - k; g.fillRect(0, 0, W, H); g.globalAlpha = 1; break; }
      case 'cooked': {
        /* a pest cooked: it curls up, spins once, puffs smoke and fades; vehicles crumple and drop their lid */
        const def = ENEMIES[f.type];
        if (!def) break;
        g.save(); g.translate(f.x, f.y);
        for (let i = 0; i < (f.big ? 5 : 3); i++){
          const q = (k + i * 0.17) % 1, an = f.seed + i * 2.1;
          circle(g, Math.cos(an) * f.r * 0.5 + Math.sin(q * 6 + i) * 3, -q * (f.big ? 42 : 26) + Math.sin(an) * f.r * 0.3, (2.5 + q * 5) * (f.big ? 1.6 : 1));
          g.fillStyle = 'rgba(70,60,56,' + (0.45 * (1 - q)).toFixed(3) + ')'; g.fill();
        }
        g.globalAlpha = 1 - k * k; g.rotate(f.rot + k * (f.big ? 0.4 : 3.2)); const s = f.big ? 1 - k * 0.35 : 1 - k * 0.6; g.scale(s, s * (1 - k * 0.3));
        if (BIG[f.type]) BIG[f.type](g, { r: f.r, id: 0, type: f.type, chunks: 0, lvl: 1 }, 0);
        else { const spr = f.gold ? goldSprite(f.type, 0) : spriteFor(f.type, 0), hh = spr._half; g.drawImage(spr, -hh, -hh, hh * 2, hh * 2); }
        g.restore(); break;
      }
      case 'cooked': {
        /* a cooked pest: it curls up and spins as it shrinks away, a puff of steam rising off it */
        const q = 1 - k, sc = (0.35 + 0.65 * q) * (f.gold ? 1.3 : 1), rise = k * (f.big ? 14 : 9);
        g.save(); g.translate(f.x, f.y - rise); g.globalAlpha = q * q;
        g.rotate(f.rot + k * (f.seed > 5 ? 5 : -5)); g.scale(sc, sc);
        if (BIG[f.type]){ g.scale(0.5, 0.5); BIG[f.type](g, { r: f.r, id: f.seed, chunks: 0, hp: 1, maxHp: 1, type: f.type, big: true }, 0); }
        else { const spr = f.gold ? goldSprite(f.type, 0) : spriteFor(f.type, 0), hh = spr._half; g.drawImage(spr, -hh, -hh, hh * 2, hh * 2); }
        g.restore();
        g.save(); g.globalAlpha = Math.sin(k * Math.PI) * 0.5;
        for (let i = 0; i < 3; i++){ const an = f.seed + i * 2.1, rr2 = f.r * 0.45 + k * (f.big ? 22 : 11); circle(g, f.x + Math.cos(an) * rr2 * 0.6, f.y - rise - k * 10 - i * 3, 2.5 + k * (f.big ? 7 : 4)); g.fillStyle = '#ffffff'; g.fill(); }
        g.restore(); break;
      }
      case 'drop': {
        const kk = clamp(f.t / f.life, 0, 1);
        g.fillStyle = 'rgba(0,0,0,' + 0.3 * kk + ')'; ell(g, f.x, f.y, 6 + kk * 6, 3 + kk * 3); g.fill();
        g.save(); g.translate(f.x, f.y - (1 - kk) * 160); g.rotate(kk * 4); rr(g, -6, -6, 12, 12, 2.5); fillStroke(g, '#e2b875', '#8a5a2b', 1.4); g.restore();
        break;
      }
      case 'wok': {
        /* a giant flaming wok drops out of the sky onto the crowd */
        g.fillStyle = 'rgba(0,0,0,' + (0.12 + 0.3 * k) + ')'; ell(g, f.x, f.y + 4, 14 + k * 26, 6 + k * 10); g.fill();
        g.save(); g.translate(f.x, f.y - (1 - k) * (1 - k) * 260); g.scale(0.7 + k * 0.5, 0.7 + k * 0.5); g.rotate((1 - k) * 0.6);
        for (const s of [-1, 1]){ rr(g, s * 30 - (s > 0 ? 0 : 8), -5, 8, 6, 3); fillStroke(g, '#2e3437', '#15191b', 1.2); }
        g.beginPath(); g.ellipse(0, 0, 32, 14, 0, 0, Math.PI); g.closePath(); fillStroke(g, '#3d4549', '#15191b', 2);
        ell(g, 0, 0, 32, 7); fillStroke(g, '#596268', '#15191b', 1.6);
        for (let i = 0; i < 5; i++){ const x = -20 + i * 10, hgt = 16 + Math.sin(t * 22 + i * 1.7) * 6;
          g.beginPath(); g.moveTo(x - 6, 0); g.quadraticCurveTo(x - 4, -hgt * 0.6, x, -hgt); g.quadraticCurveTo(x + 4, -hgt * 0.6, x + 6, 0); g.closePath(); g.fillStyle = i % 2 ? '#ffb347' : '#ff7a2a'; g.fill(); }
        g.restore(); break;
      }
      case 'vat': {
        const r = f.r * Math.sqrt(k);
        g.strokeStyle = 'rgba(214,160,52,' + (1 - k) + ')'; g.lineWidth = 10 * (1 - k) + 2; circle(g, f.x, f.y, r); g.stroke();
        for (let i = 0; i < 12; i++){ const a = i / 12 * TAU; circle(g, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, 4 * (1 - k) + 1); g.fillStyle = 'rgba(255,224,140,' + (1 - k) + ')'; g.fill(); }
        break;
      }
      case 'crate': {
        const fall = clamp(f.t / 0.5, 0, 1);
        const y = f.y - (1 - fall) * 120;
        g.save(); g.translate(f.x, y);
        if (fall < 1){ g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-8, -6); g.lineTo(0, -26); g.lineTo(8, -6); g.stroke(); g.beginPath(); g.arc(0, -30, 14, Math.PI, TAU); g.fillStyle = '#e2383f'; g.fill(); }
        rr(g, -9, -9, 18, 16, 2); fillStroke(g, '#a57d55', '#6f5234', 1.5);
        g.fillStyle = '#ffd166'; g.font = '700 10px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.fillText('$', 0, 3);
        g.restore();
        if (fall >= 1){ g.save(); g.globalAlpha = 1 - (f.t - 0.5) / (f.life - 0.5); g.font = '700 16px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,24,28,0.8)'; const txt = '+$' + f.v.toLocaleString(); g.strokeText(txt, f.x, f.y - 22 - (f.t - 0.5) * 30); g.fillStyle = '#ffd166'; g.fillText(txt, f.x, f.y - 22 - (f.t - 0.5) * 30); g.restore(); }
        break;
      }
      case 'hook': {
        const e = f.e, x2 = e && !e.dead ? e.x : f.x2, y2 = e && !e.dead ? e.y : f.y2;
        const reach = Math.min(1, k * 2.4), hx = f.x1 + (x2 - f.x1) * reach, hy = f.y1 + (y2 - f.y1) * reach;
        g.save(); g.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
        const gk = f.giant ? 2.2 : 1;
        g.strokeStyle = 'rgba(60,40,24,0.9)'; g.lineWidth = 2.2 * gk; g.setLineDash([4 * gk, 2.5 * gk]);
        g.beginPath(); g.moveTo(f.x1, f.y1); g.lineTo(hx, hy); g.stroke(); g.setLineDash([]);
        g.strokeStyle = '#dfe7ea'; g.lineWidth = 2.6 * gk; g.lineCap = 'round';
        g.beginPath(); g.arc(hx, hy + 3.5 * gk, 5 * gk, -0.2, Math.PI + 0.7); g.stroke();
        g.restore(); break;
      }
      case 'commando': {
        const land = clamp(f.t / 0.4, 0, 1), out = clamp((f.life - f.t) / 0.4, 0, 1);
        g.save(); g.globalAlpha = out;
        g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, f.x + 2, f.y + 4, 8 * (0.5 + land * 0.5), 5 * (0.5 + land * 0.5)); g.fill();
        g.translate(f.x, f.y - (1 - land) * 70);
        if (land < 1){
          g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-12, -16); g.moveTo(6, 0); g.lineTo(12, -16); g.stroke();
          g.beginPath(); g.arc(0, -16, 13, Math.PI, TAU); g.closePath(); fillStroke(g, '#e2383f', '#8f1d22', 1);
        }
        circle(g, 0, 0, 7.5); fillStroke(g, '#5f6e52', '#2d3527', 1.2);
        g.save(); g.rotate(f.ang);
        rr(g, 2, -1.6, 12, 3.2, 1); g.fillStyle = '#2e3437'; g.fill();
        if (t - f.shot < 0.06){ star(g, 15.5, 0, 4.5, '#ffd166'); }
        g.restore();
        circle(g, 0, 0, 5); fillStroke(g, '#7d8f5a', '#3a4528', 1);
        g.fillStyle = '#f4efe6'; rr(g, -3.5, -9.5, 7, 4.5, 2); g.fill();
        g.restore(); break;
      }
      case 'meteor': {
        /* a molten meteor falling onto its mark */
        if (f.e && !f.e.dead){ f.x = f.e.x; f.y = f.e.y; }
        const x = f.x + (1 - k) * 260, y = f.y - (1 - k) * 420;
        g.fillStyle = 'rgba(0,0,0,' + (0.1 + 0.35 * k) + ')'; ell(g, f.x, f.y, 12 + k * 30, 6 + k * 14); g.fill();
        g.save(); g.translate(x, y); g.rotate(Math.atan2(420, -260));
        for (let i = 4; i >= 1; i--){ circle(g, -i * 14, Math.sin(t * 20 + i) * 2, 16 - i * 2.5); g.fillStyle = 'rgba(255,' + (90 + i * 30) + ',40,' + (0.55 - i * 0.1) + ')'; g.fill(); }
        circle(g, 0, 0, 18); fillStroke(g, '#5a2a14', '#2a120a', 2);
        g.strokeStyle = '#ff9a3d'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-8, -4); g.lineTo(0, 2); g.lineTo(7, -6); g.moveTo(-3, 9); g.lineTo(4, 5); g.stroke();
        g.restore(); break;
      }
      case 'missile': {
        /* a giant mustard missile arcing onto its mark */
        if (f.e && !f.e.dead){ f.x1 = f.e.x; f.y1 = f.e.y; }
        const at = q => [f.x0 + (f.x1 - f.x0) * q, f.y0 + (f.y1 - f.y0) * q - Math.sin(q * Math.PI) * 120];
        const [x, y] = at(k), [x2, y2] = at(Math.min(1, k + 0.03));
        g.save(); g.translate(x, y); g.rotate(Math.atan2(y2 - y, x2 - x)); g.scale(2.2, 2.2);
        g.beginPath(); g.moveTo(-7, -2); g.lineTo(-15 - Math.random() * 4, 0); g.lineTo(-7, 2); g.closePath(); g.fillStyle = 'rgba(255,170,60,0.9)'; g.fill();
        rr(g, -8, -3.2, 12, 6.4, 2.4); fillStroke(g, '#f2c230', '#a8801a', 0.9);
        g.beginPath(); g.moveTo(4, -2.4); g.lineTo(9, 0); g.lineTo(4, 2.4); g.closePath(); fillStroke(g, '#d9332a', '#8a1a14', 0.7);
        g.restore();
        if (!lowFx()) part(x, y, rand(-10, 10), rand(-10, 10), 0.6, 'rgba(230,230,230,0.5)', 5, 'smoke');
        break;
      }
      case 'strafe': {
        /* an escort copter sweeping the trail from the pantry back to the entrance */
        const P = G.paths[f.path];
        if (!P) break;
        const d = P.len * (1 - k), q = pathPos(P, d, 0), q2 = pathPos(P, Math.max(0, d - 6), 0);
        g.save(); g.translate(q.x, q.y - 4); g.rotate(Math.atan2(q2.y - q.y, q2.x - q.x)); g.scale(1.5, 1.5);
        drawMini(g, t, f.path, true);
        if (Math.floor(t * 30) % 2) star(g, 9, 0, 2.6, '#ffd166');
        g.restore();
        break;
      }
      case 'bombers': {
        /* a bomber saucer crossing the kitchen */
        const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k;
        g.save(); g.translate(x, y); g.rotate(Math.atan2(f.y1 - f.y0, f.x1 - f.x0));
        g.fillStyle = 'rgba(0,0,0,0.18)'; ell(g, 10, 22, 22, 9); g.fill();
        ell(g, 0, 0, 22, 9); fillStroke(g, '#4a3f6b', '#221a38', 1.4);
        ell(g, 2, -2, 9, 5); g.fillStyle = 'rgba(160,230,255,0.85)'; g.fill();
        for (let i = 0; i < 5; i++){ circle(g, -14 + i * 7, 5, 1.6); g.fillStyle = Math.floor(t * 8 + i) % 2 ? '#ff6fb5' : '#ffd166'; g.fill(); }
        g.restore(); break;
      }
      case 'abduct': {
        /* the tractor beam lifting a pest into the mothership */
        const tw = f.tw, sx = tw && tw.fx != null ? tw.fx : f.x0, sy = tw && tw.fy != null ? tw.fy : f.y0 - 60;
        const a = Math.sin(k * Math.PI);
        g.save(); g.globalAlpha = a * 0.55;
        const gr = g.createLinearGradient(sx, sy, f.x0, f.y0); gr.addColorStop(0, 'rgba(190,255,200,0.9)'); gr.addColorStop(1, 'rgba(190,255,200,0.15)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(sx - 8, sy); g.lineTo(sx + 8, sy); g.lineTo(f.x0 + 22, f.y0); g.lineTo(f.x0 - 22, f.y0); g.closePath(); g.fill();
        g.restore();
        const px = f.x0 + (sx - f.x0) * k, py = f.y0 + (sy - f.y0) * k, s = 1 - k * 0.7;
        const ic = pestIcon(ENEMIES[f.look] ? f.look : 'ant', 28);
        g.save(); g.globalAlpha = 1 - k * 0.5; g.translate(px, py); g.rotate(k * 6); g.scale(s, s); g.drawImage(ic, -14, -14, 28, 28); g.restore();
        break;
      }
      /* the second wave */
      case 'stick': {
        /* sticky wasabi riding on a vehicle, its light blinking faster until it bursts */
        if (f.e && !f.e.dead){ f.x = f.e.x + f.ox; f.y = f.e.y + f.oy; }
        if (f.x == null) break;
        const bl = Math.floor(f.t * (6 + k * 16)) % 2;
        g.save(); g.translate(f.x, f.y);
        g.beginPath(); g.moveTo(5, 0); g.bezierCurveTo(3, -4.8, -4, -4.4, -4.6, 0); g.bezierCurveTo(-4, 4.4, 3, 4.8, 5, 0); fillStroke(g, '#8fd16a', '#3f6a1a', 1);
        circle(g, 0, 0, 1.6); g.fillStyle = bl ? '#ff5a4e' : '#ffd166'; g.fill();
        g.restore(); break;
      }
      case 'slash': {
        /* a shadow clone darting through its mark */
        const a = 1 - k, q = Math.min(1, k * 4), x = f.x0 + (f.x1 - f.x0) * q, y = f.y0 + (f.y1 - f.y0) * q;
        g.save(); g.lineCap = 'round';
        g.strokeStyle = 'rgba(40,30,60,' + (0.6 * a).toFixed(3) + ')'; g.lineWidth = 5; g.beginPath(); g.moveTo(f.x0, f.y0); g.lineTo(x, y); g.stroke();
        g.strokeStyle = 'rgba(190,180,255,' + (0.9 * a).toFixed(3) + ')'; g.lineWidth = 1.6; g.stroke();
        if (q >= 1){ const an = Math.atan2(f.y1 - f.y0, f.x1 - f.x0); g.translate(f.x1, f.y1); g.rotate(an + Math.PI / 2); g.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; g.lineWidth = 2.4; g.beginPath(); g.arc(0, 0, 12 + k * 8, -1, 1); g.stroke(); }
        g.restore(); break;
      }
      case 'aim': {
        /* Take Aim: a crosshair closing in on each appliance */
        const r = f.r * (1.6 - 0.6 * Math.min(1, k * 2.5));
        g.save(); g.translate(f.x, f.y); g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; g.rotate(k * 2);
        g.strokeStyle = '#f2c230'; g.lineWidth = 2; circle(g, 0, 0, r); g.stroke();
        g.beginPath(); for (let i = 0; i < 4; i++){ const an = i * Math.PI / 2; g.moveTo(Math.cos(an) * (r - 5), Math.sin(an) * (r - 5)); g.lineTo(Math.cos(an) * (r + 5), Math.sin(an) * (r + 5)); } g.stroke();
        g.restore(); break;
      }
      case 'song': {
        /* a siren song spreading out in rings */
        g.save(); g.globalAlpha = 1 - k; g.lineWidth = 2; g.setLineDash([2, 8]); g.lineDashOffset = -t * 30;
        for (let i = 0; i < 3; i++){ const r = f.r * Math.min(1, k * 1.2) - i * 14; if (r <= 2) continue; g.strokeStyle = i % 2 ? 'rgba(255,143,199,0.75)' : 'rgba(127,211,255,0.75)'; circle(g, f.x, f.y, r); g.stroke(); }
        g.restore(); break;
      }
      case 'note': { g.save(); g.globalAlpha = 1 - k; musicNote(g, f.x + Math.sin(k * 6 + f.seed) * 4, f.y - k * 18, 1.1, f.seed % 2 > 1 ? '#7fd3ff' : '#ff8fc7'); g.restore(); break; }
      case 'broom': {
        /* the pet basket's broom sweeping round */
        const r = f.r0 + (f.r1 - f.r0) * Math.min(1, k * 1.4), a0 = k * 5;
        g.save(); g.globalAlpha = 1 - k; g.lineCap = 'round';
        for (let i = 0; i < 9; i++){ const an = a0 + i * 0.12; g.strokeStyle = i % 2 ? 'rgba(232,194,90,0.85)' : 'rgba(200,150,60,0.8)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(f.x + Math.cos(an) * r * 0.55, f.y + Math.sin(an) * r * 0.55); g.lineTo(f.x + Math.cos(an - 0.2) * r, f.y + Math.sin(an - 0.2) * r); g.stroke(); }
        g.restore(); break;
      }
      case 'ink': {
        /* tentacles lashing out of a cloud of ink */
        const r = f.r0 + (f.r1 - f.r0) * Math.sqrt(k);
        g.save(); g.globalAlpha = 1 - k;
        circle(g, f.x, f.y, r * 0.95); g.fillStyle = 'rgba(60,30,90,' + (0.12 * (1 - k)).toFixed(3) + ')'; g.fill();
        g.strokeStyle = 'rgba(176,106,217,0.85)'; g.lineWidth = 3; g.lineCap = 'round';
        for (let i = 0; i < 6; i++){ const an = i / 6 * TAU + (f.x + f.y) * 0.01; g.beginPath(); g.moveTo(f.x + Math.cos(an) * 10, f.y + Math.sin(an) * 10); g.quadraticCurveTo(f.x + Math.cos(an + 0.5) * r * 0.6, f.y + Math.sin(an + 0.5) * r * 0.6, f.x + Math.cos(an) * r, f.y + Math.sin(an) * r); g.stroke(); }
        g.restore(); break;
      }
      case 'chomp': {
        /* a fish leaping up to bite: jaws snapping shut over the pest, with a splash */
        const close = Math.min(1, k * 3), op = (1 - close) * 0.9 + 0.1, a = 1 - Math.max(0, k - 0.5) * 2;
        g.save(); g.translate(f.x, f.y); g.globalAlpha = a;
        const big = f.big ? 1.8 : 1;
        g.scale(big, big);
        g.fillStyle = '#7d8f9a'; g.strokeStyle = '#3d4a52'; g.lineWidth = 1;
        for (const sd of [-1, 1]){ g.save(); g.rotate(sd * op * 0.6); g.beginPath(); g.moveTo(-10, 0); g.quadraticCurveTo(-2, sd * 9, 10, sd * 1); g.lineTo(-10, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++){ g.beginPath(); g.moveTo(-6 + i * 4, sd * 1); g.lineTo(-5 + i * 4, sd * 3.4); g.lineTo(-4 + i * 4, sd * 1); g.fill(); } g.fillStyle = '#7d8f9a'; g.restore(); }
        if (k > 0.3){ g.globalAlpha = a * 0.8; for (let i = 0; i < 6; i++){ const an = i / 6 * TAU, rr2 = 8 + (k - 0.3) * 26; circle(g, Math.cos(an) * rr2, Math.sin(an) * rr2 * 0.7, 1.6); g.fillStyle = '#bfe9ff'; g.fill(); } }
        g.restore(); break;
      }
      case 'claw': {
        /* three claw marks raking across the pest */
        const q = Math.min(1, k * 4), a = 1 - Math.max(0, k - 0.4) / 0.6;
        g.save(); g.translate(f.x, f.y); g.rotate(Math.atan2(f.y - f.y0, f.x - f.x0) + 0.8); g.globalAlpha = a;
        g.lineCap = 'round';
        for (let i = -1; i <= 1; i++){ g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-9, i * 4); g.lineTo(-9 + 18 * q, i * 4 - 3 * q); g.stroke(); g.strokeStyle = 'rgba(217,51,42,0.6)'; g.lineWidth = 0.8; g.stroke(); }
        g.restore(); break;
      }
      case 'swoop': {
        /* a bird diving from the basket onto a pest, then carrying it off up and away */
        if (f.e && !f.e.dead && k < 0.5){ f.x = f.e.x; f.y = f.e.y; }
        const big = f.big ? 2 : 1;
        let x, y, ang;
        if (k < 0.5){ const q = k / 0.5; x = f.x0 + (f.x - f.x0) * q; y = f.y0 + (f.y - f.y0) * q - Math.sin(q * Math.PI) * 30; ang = Math.atan2(f.y - f.y0, f.x - f.x0); }
        else { const q = (k - 0.5) / 0.5; x = f.x + q * 30; y = f.y - q * 60; ang = -Math.PI / 2 + 0.4; }
        g.save(); g.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1; g.translate(x, y); g.rotate(ang); g.scale(big, big);
        const flap = Math.sin(t * 30) * 0.35;
        for (const sd of [-1, 1]){ g.save(); g.rotate(sd * (0.5 + flap)); ell(g, -1, sd * 5.5, 2.6, 6.5); g.fillStyle = f.big ? '#c96a2a' : '#7a5a3a'; g.fill(); g.restore(); }
        ell(g, 0, 0, 5.5, 3.4); g.fillStyle = f.big ? '#e0904a' : '#9a7a5a'; g.fill();
        circle(g, 4.6, 0, 2.6); g.fill();
        g.beginPath(); g.moveTo(6.6, -0.8); g.lineTo(9, 0); g.lineTo(6.6, 0.8); g.closePath(); g.fillStyle = '#f2c230'; g.fill();
        if (k >= 0.5){ circle(g, -1, 4.5, 3); g.fillStyle = 'rgba(60,40,30,0.85)'; g.fill(); }
        g.restore(); break;
      }
      case 'splash': {
        /* water splashing up from a lobster's fork */
        const r = f.r * (0.4 + 0.6 * Math.sqrt(k)), a = 1 - k;
        g.save(); g.globalAlpha = a;
        g.strokeStyle = 'rgba(160,220,255,0.9)'; g.lineWidth = 2; circle(g, f.x, f.y, r); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1; circle(g, f.x, f.y, r * 0.65); g.stroke();
        for (let i = 0; i < 6; i++){ const an = i / 6 * TAU + f.seed, q = r * 0.9; circle(g, f.x + Math.cos(an) * q, f.y + Math.sin(an) * q - k * 8, 1.6 * a + 0.5); g.fillStyle = '#dff4ff'; g.fill(); }
        g.restore(); break;
      }
      case 'stampede': {
        /* a herd of pets thundering up the trail from the pantry */
        const P = G.paths[f.path];
        if (!P) break;
        const d = P.len * (1 - k);
        g.save();
        for (let i = 0; i < 5; i++){
          const q = pathPos(P, Math.max(0, d + i * 14 - 28), 0), j = Math.sin(i * 2.3 + f.seed) * 10;
          const x = q.x - Math.sin(q.ang) * j, y = q.y + Math.cos(q.ang) * j;
          circle(g, x - Math.cos(q.ang) * 10, y - Math.sin(q.ang) * 10, 7); g.fillStyle = 'rgba(200,170,120,0.35)'; g.fill();
          g.save(); g.translate(x, y + Math.abs(Math.sin(t * 20 + i)) * -3); g.rotate(q.ang + Math.PI);
          ell(g, 0, 0, 7, 4.2); fillStroke(g, i % 2 ? '#a06a35' : '#c9853a', '#4a2c12', 0.8);
          circle(g, 6.5, 0, 3); g.fillStyle = i % 2 ? '#a06a35' : '#c9853a'; g.fill();
          g.restore();
        }
        g.restore(); break;
      }
      case 'kraken': {
        /* a kraken's tentacle bursting up around a vehicle and dragging it under */
        if (f.e && !f.e.dead){ f.x = f.e.x; f.y = f.e.y; }
        const up = Math.min(1, k * 2.5), down = Math.max(0, (k - 0.6) / 0.4);
        g.save(); g.translate(f.x, f.y);
        circle(g, 0, 0, 30 * up); g.fillStyle = 'rgba(40,80,140,' + (0.35 * (1 - down)).toFixed(3) + ')'; g.fill();
        g.strokeStyle = '#8a3ab0'; g.lineWidth = 6 * (1 - down) + 1; g.lineCap = 'round';
        for (let i = 0; i < 3; i++){ const an = i / 3 * TAU + (f.seed || 0); g.beginPath(); g.moveTo(Math.cos(an) * 34, Math.sin(an) * 34); g.quadraticCurveTo(Math.cos(an + 1) * 28 * up, Math.sin(an + 1) * 28 * up, Math.cos(an + 2) * 8 * up, Math.sin(an + 2) * 8 * up); g.stroke(); }
        g.strokeStyle = 'rgba(240,200,255,0.8)'; g.lineWidth = 1.2;
        for (let i = 0; i < 3; i++){ const an = i / 3 * TAU + (f.seed || 0); for (let j = 1; j < 4; j++){ circle(g, Math.cos(an + j * 0.4) * (34 - j * 7) * up, Math.sin(an + j * 0.4) * (34 - j * 7) * up, 1.2); g.stroke(); } }
        g.restore(); break;
      }
      case 'slide': {
        /* a chess piece's sweep: a band of light along each line it moved on, its squares ticked off, and a ghost
           of the piece rising off the pest it took */
        const a = 1 - k;
        g.save(); g.lineCap = 'round';
        const busy = f.segs.length > 4 ? 0.7 : 1;   // long, bouncing lines are drawn lighter
        g.strokeStyle = rgbaStr(f.c, 0.2 * a * busy); g.lineWidth = f.w;
        g.beginPath(); for (const s of f.segs){ g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); } g.stroke();
        g.strokeStyle = rgbaStr(f.c, 0.9 * a * busy); g.lineWidth = 2.6;
        g.beginPath(); for (const s of f.segs){ g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); } g.stroke();
        g.strokeStyle = 'rgba(255,255,255,' + (0.85 * a).toFixed(3) + ')'; g.lineWidth = 1;
        g.stroke();
        if (!lowFx()){
          g.fillStyle = rgbaStr(f.c, 0.75 * a);
          for (const s of f.segs){
            const dx = s[2] - s[0], dy = s[3] - s[1], L = Math.hypot(dx, dy);
            if (L < 1) continue;
            const ux = dx / L, uy = dy / L;
            for (let d = SQ; d < L; d += SQ){ const x = s[0] + ux * d, y = s[1] + uy * d; g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-2.2, -2.2, 4.4, 4.4); g.restore(); }
          }
        }
        g.globalAlpha = a;
        g.translate(f.x, f.y - 4 - k * 10);
        circle(g, 0, -6, 9); g.fillStyle = rgbaStr(f.c, 0.25); g.fill();
        pieceAt(g, f.piece === 'knight' ? 'pawn' : f.piece, 0, 4, 0.42, f.piece === 'queen' ? '#f6dd8a' : '#f6ecd6', { trim: f.piece === 'queen', gem: f.piece === 'queen' });
        g.restore(); break;
      }
      case 'stomp': {
        /* a knight's landing: a ring of dust and its hoof prints */
        const r = f.r * (0.45 + 0.55 * Math.sqrt(k)), a = 1 - k;
        g.save();
        g.strokeStyle = 'rgba(231,217,189,' + (0.85 * a).toFixed(3) + ')'; g.lineWidth = 3 * a + 1; circle(g, f.x, f.y, r); g.stroke();
        g.strokeStyle = 'rgba(96,66,36,' + (0.55 * a).toFixed(3) + ')'; g.lineWidth = 1.5;
        for (const s of [-1, 1]){ g.beginPath(); g.arc(f.x + s * 4, f.y + 2, 2.6, Math.PI * 0.15, Math.PI * 1.85); g.stroke(); }
        g.restore(); break;
      }
      case 'fork': {
        /* the fork: the knight strikes at both pests at once */
        const a = 1 - k, e = Math.min(1, k * 2.4);
        g.save(); g.lineCap = 'round';
        for (const [x, y] of f.to){
          const ex = f.x + (x - f.x) * e, ey = f.y - 6 + (y - f.y + 6) * e;
          g.strokeStyle = 'rgba(127,224,200,' + (0.9 * a).toFixed(3) + ')'; g.lineWidth = 2.6;
          g.beginPath(); g.moveTo(f.x, f.y - 6); g.lineTo(ex, ey); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,' + (0.9 * a).toFixed(3) + ')'; g.lineWidth = 1; g.stroke();
          if (e >= 1){ circle(g, x, y, 5 + k * 12); g.strokeStyle = 'rgba(127,224,200,' + Math.min(1, a * 1.4).toFixed(3) + ')'; g.lineWidth = 2; g.stroke(); }
        }
        g.restore(); break;
      }
      case 'rookroll': {
        /* Castle Crush: a giant rook tumbling down the trail from the pantry */
        const P = G.paths[f.path];
        if (!P) break;
        const d = Math.max(0, P.len * (1 - k)), q = pathPos(P, d, 0);
        if (q.x < -40 || q.x > W + 40 || q.y < -40 || q.y > H + 40) break;
        g.save(); g.translate(q.x, q.y);
        if (!lowFx()) for (let i = 1; i < 4; i++){ const b = pathPos(P, Math.min(P.len, d + i * 16), 0); circle(g, b.x - q.x, b.y - q.y, 9 - i * 2); g.fillStyle = 'rgba(210,190,150,' + (0.3 - i * 0.07).toFixed(3) + ')'; g.fill(); }
        g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, 3, 14, 18, 6); g.fill();
        g.rotate(-d / 15);
        pieceAt(g, 'rook', 0, 19, 1.5, '#f3e7cb', { trim: true });
        g.restore(); break;
      }
      case 'cavalry': {
        /* Cavalry Charge: a troop of knights galloping up the trail from the pantry */
        const P = G.paths[f.path];
        if (!P) break;
        const d = P.len * (1 - k);
        g.save();
        for (let i = 0; i < 4; i++){
          const q = pathPos(P, clamp(d + i * 22 - 30, 0, P.len), 0), j = Math.sin(i * 2.3 + f.seed) * 9;
          const x = q.x - Math.sin(q.ang) * j, y = q.y + Math.cos(q.ang) * j;
          if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
          circle(g, x + Math.cos(q.ang) * 12, y + Math.sin(q.ang) * 12, 7); g.fillStyle = 'rgba(210,190,150,0.3)'; g.fill();
          pieceAt(g, 'knight', x, y + 8 - Math.abs(Math.sin(t * 16 + i * 1.3)) * 4, 0.7, '#f6ecd6', { face: Math.cos(q.ang) > 0 ? -1 : 1, armor: true });
        }
        g.restore(); break;
      }
      case 'checkmate': {
        /* checkmate: a crown drops over the pest, then topples */
        if (f.e && !f.e.dead){ f.x = f.e.x; f.y = f.e.y; }
        const drop = Math.min(1, k * 2), fall = Math.max(0, (k - 0.55) / 0.45), a = 1 - Math.max(0, (k - 0.75) / 0.25);
        g.save(); g.globalAlpha = a; g.translate(f.x, f.y - 26 * (1 - drop) * (1 - drop) - 6);
        circle(g, 0, 6, 16 * drop); g.strokeStyle = 'rgba(215,166,255,0.8)'; g.lineWidth = 2.5; g.stroke();
        g.rotate(fall * Math.PI / 2);
        g.beginPath(); g.moveTo(-9, 2); g.lineTo(-10, -8); g.lineTo(-5, -3); g.lineTo(0, -11); g.lineTo(5, -3); g.lineTo(10, -8); g.lineTo(9, 2); g.closePath();
        g.fillStyle = '#f2c14e'; g.fill(); g.strokeStyle = '#8a6410'; g.lineWidth = 1.2; g.stroke();
        circle(g, 0, -2.5, 1.6); g.fillStyle = '#9b5de5'; g.fill();
        g.restore();
        if (k < 0.6 && !f.boss) fxLabel(g, f.x, f.y - 40, 'CHECKMATE', '#e9d2ff', 1 - k / 0.6);
        else if (k < 0.6) fxLabel(g, f.x, f.y - 40, 'CHECK', '#e9d2ff', 1 - k / 0.6);
        break;
      }
      case 'stalemate': {
        /* stalemate: nobody can move */
        const a = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
        g.save(); g.globalAlpha = a * 0.85;
        const y = H / 2;
        g.fillStyle = 'rgba(30,20,50,0.55)'; g.fillRect(0, y - 30, W, 60);
        for (let i = 0; i < W / 30; i++){ g.fillStyle = i % 2 ? 'rgba(240,220,178,0.5)' : 'rgba(155,106,59,0.5)'; g.fillRect(i * 30, y - 34, 30, 4); g.fillRect(i * 30, y + 30, 30, 4); }
        g.restore();
        fxLabel(g, W / 2, y + 12, 'STALEMATE', '#e9d2ff', a, 34);
        break;
      }
      case 'loafFly': {
        const tx = f.to ? f.to[0] : 40, ty = f.to ? f.to[1] : 24;
        const x = f.x + (tx - f.x) * k * k, y = f.y + (ty - f.y) * k * k;
        g.save(); g.translate(x, y); g.scale(1 - k * 0.5, 1 - k * 0.5);
        rr(g, -9, -6, 18, 11, 5); fillStroke(g, f.golden ? '#f2c14e' : '#d08d45', '#7a4a20', 1.2);
        g.restore(); break;
      }
    }
  }
  const _rgbCache = new Map();
  /* a word over the kitchen, outlined so it reads on any floor */
  function fxLabel(g, x, y, txt, c, a, size){
    if (!(a > 0)) return;
    g.save(); g.globalAlpha = Math.min(1, a);
    g.font = '700 ' + (size || 15) + 'px "Barlow Condensed", sans-serif'; g.textAlign = 'center';
    g.lineWidth = 3.5; g.strokeStyle = 'rgba(20,16,30,0.85)'; g.strokeText(txt, x, y);
    g.fillStyle = c; g.fillText(txt, x, y);
    g.restore();
  }
  function rgbaStr(c, a){
    let rgb = _rgbCache.get(c);
    if (!rgb){ rgb = c[0] === '#' ? hexToRgb(c) : [255, 255, 255]; _rgbCache.set(c, rgb); }
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + Math.max(0, a).toFixed(3) + ')';
  }
  function drawPart(g, p){
    const k = p.t / p.life;
    g.globalAlpha = 1 - k;
    if (p.k === 'flame'){
      g.fillStyle = p.c; circle(g, p.x, p.y, p.s * (1 - k * 0.6)); g.fill();
    } else if (p.k === 'smoke' || p.k === 'dust'){
      g.fillStyle = p.c; circle(g, p.x, p.y, p.s * (1 + k)); g.fill();
    } else if (p.k === 'spark'){
      g.fillStyle = p.c; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    } else if (p.k === 'bubble'){
      circle(g, p.x, p.y, p.s * (1 + k * 0.4)); g.strokeStyle = p.c; g.lineWidth = 1; g.stroke(); circle(g, p.x - p.s * 0.3, p.y - p.s * 0.3, p.s * 0.25); g.fillStyle = '#ffffff'; g.fill();
    } else if (p.k === 'star'){
      star(g, p.x, p.y, p.s * (1 - k * 0.5), p.c);
    } else if (p.k === 'ice'){
      g.strokeStyle = p.c; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 3; i++){ const a = i / 3 * Math.PI + k * 2; g.moveTo(p.x - Math.cos(a) * p.s, p.y - Math.sin(a) * p.s); g.lineTo(p.x + Math.cos(a) * p.s, p.y + Math.sin(a) * p.s); } g.stroke();
    } else {
      g.fillStyle = p.c; circle(g, p.x, p.y, p.s); g.fill();
    }
    g.globalAlpha = 1;
  }
  function drawTornado(g, tn, t){
    const k = tn.t / tn.life;
    g.save(); g.translate(tn.x, tn.y); g.globalAlpha = 1 - k;
    for (let i = 0; i < 10; i++){
      g.strokeStyle = 'rgba(220,230,235,0.8)'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, tn.r * (0.15 + i * 0.09) * (0.5 + k * 0.5), t * 8 + i, t * 8 + i + 2.4); g.stroke();
    }
    g.restore();
  }

  /* ---------------- paragon systems ---------------- */
  /* a charred undead copy of a pest: its sprite burnt to ash grey (vehicles drawn once, still) */
  function undeadSprite(type){
    const key = 'undead:' + type + ':' + SK;
    let c = cache.get(key);
    if (c) return c;
    const def = ENEMIES[type] || ENEMIES.ant;
    let src, half;
    if (BIG[type]){
      half = def.r * 1.7 + 10;
      src = mkCanvas(half * 2 * SK, half * 2 * SK);
      const g0 = src.getContext('2d'); g0.scale(SK, SK); g0.translate(half, half);
      try { BIG[type](g0, { type, def, r: def.r, x: 0, y: 0, anim: 0, hp: 1, maxHp: 1, id: 1, rot: 0 }, 0.4); } catch (err) {}
    } else { src = spriteFor(PEST[type] ? type : 'ant', 0); half = src._half; }
    c = mkCanvas(src.width, src.height);
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, 0, c.width, c.height);
    gr.addColorStop(0, 'rgba(92,92,100,0.82)'); gr.addColorStop(0.6, 'rgba(46,44,50,0.86)'); gr.addColorStop(1, 'rgba(24,22,26,0.9)');
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    /* glowing cracks of ember */
    g.strokeStyle = 'rgba(255,128,48,0.75)'; g.lineWidth = Math.max(1, c.width / 60); g.lineCap = 'round';
    const rnd = (n => () => (n = (n * 9301 + 49297) % 233280) / 233280)(type.length * 77 + 13);
    for (let i = 0; i < 6; i++){
      const x = c.width * (0.3 + rnd() * 0.4), y = c.height * (0.3 + rnd() * 0.4), L = c.width * (0.06 + rnd() * 0.08), a = rnd() * TAU;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.lineTo(x + Math.cos(a + 0.8) * L * 1.6, y + Math.sin(a + 0.8) * L * 1.6); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    c._half = half;
    cache.set(key, c);
    return c;
  }
  /* a charred undead shambling back up the trail */
  function drawUndead(g, w, t){
    const P = G.paths[w.path], sg = P && P.segs[w.seg];
    const ang = (sg ? sg.ang : 0) + Math.PI;
    const a = clamp(w.t / 0.35, 0, 1) * clamp(w.left / (w.speed * 0.6), 0, 1);
    if (a <= 0) return;
    const def = ENEMIES[w.undead] || ENEMIES.ant;
    g.save(); g.translate(w.x, w.y);
    const R = def.r * (w.big ? 1.5 : 1.7) + 4;
    g.globalAlpha = a;
    const gl = g.createRadialGradient(0, 0, 1, 0, 0, R);
    gl.addColorStop(0, 'rgba(255,110,40,0.34)'); gl.addColorStop(1, 'rgba(255,110,40,0)');
    g.fillStyle = gl; circle(g, 0, 0, R); g.fill();
    if (w.t < 0.35){ g.strokeStyle = 'rgba(60,60,66,' + (0.6 * (1 - w.t / 0.35)) + ')'; g.lineWidth = 3; circle(g, 0, 0, def.r * (1 + w.t * 3)); g.stroke(); }
    g.rotate(ang);
    const spr = undeadSprite(w.undead), h = spr._half;
    const bob = Math.sin(t * 9 + w.seed) * 0.7;
    g.save();
    if (w.undead === 'cheese') g.rotate(-t * 1.4);
    g.globalAlpha = a * 0.94;
    g.drawImage(spr, -h, -h + bob, h * 2, h * 2);
    g.restore();
    if (!w.big){
      const ex = h * 0.26;
      for (const s of [-1, 1]){ circle(g, ex, s * Math.max(1.2, def.r * 0.18), Math.max(0.9, def.r * 0.12)); g.fillStyle = '#ffb347'; g.fill(); }
    } else {
      g.strokeStyle = 'rgba(255,150,60,' + (0.55 + 0.25 * Math.sin(t * 6 + w.seed)) + ')'; g.lineWidth = 2; circle(g, 0, 0, def.r + 3); g.stroke();
    }
    g.restore();
    if (!lowFx() && Math.random() < (w.big ? 0.4 : 0.1)) part(w.x + rand(-0.4, 0.4) * w.r, w.y + rand(-0.4, 0.4) * w.r, rand(-8, 8), rand(-32, -14), 0.8, 'rgba(70,70,76,0.35)', w.big ? 6 : 3.5, 'smoke');
  }
  /* a marked pest: a gold crosshair turning around it */
  function drawMark(g, e, t){
    if (e.wanted){
      /* Wanted: a sheriff's star over the pest and a dashed ring */
      const y = -e.r - 9 + Math.sin(t * 4 + e.id) * 1.2;
      g.save(); g.translate(e.x, e.y);
      g.strokeStyle = 'rgba(217,51,42,0.7)'; g.lineWidth = 1.4; g.setLineDash([3, 3]); g.lineDashOffset = -t * 8; circle(g, 0, 0, e.r + 4); g.stroke(); g.setLineDash([]);
      circle(g, 0, y, 5.6); g.fillStyle = 'rgba(29,43,51,0.55)'; g.fill();
      star(g, 0, y, 5, '#ffd166'); circle(g, 0, y, 1.4); g.fillStyle = '#a57412'; g.fill();
      g.restore();
      if (!e.markBy) return;
    }
    const r = e.r + 7 + Math.sin(t * 5 + e.id) * 1.5;
    g.save(); g.translate(e.x, e.y); g.rotate(t * 1.4 + e.id);
    g.strokeStyle = 'rgba(29,43,51,0.45)'; g.lineWidth = 3.6; circle(g, 0, 0, r); g.stroke();
    g.strokeStyle = '#ffd166'; g.lineWidth = 1.8; g.setLineDash([6, 4]); circle(g, 0, 0, r); g.stroke(); g.setLineDash([]);
    g.beginPath(); for (let i = 0; i < 4; i++){ const an = i * Math.PI / 2; g.moveTo(Math.cos(an) * (r - 4), Math.sin(an) * (r - 4)); g.lineTo(Math.cos(an) * (r + 6), Math.sin(an) * (r + 6)); } g.stroke();
    g.restore();
  }
  /* the trail inside a circle, as one stroke (for the dough and the pasta carpet) */
  function trailInCircle(g, x, y, R, w, style, dash){
    g.save();
    g.beginPath(); g.arc(x, y, R, 0, TAU); g.clip();
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = style; g.lineWidth = w;
    if (dash) g.setLineDash(dash);
    for (const P of G.paths){ g.beginPath(); P.pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke(); }
    g.restore();
  }
  function drawDough(g, tw, t){
    const R = tw.sys ? tw.sys.R : tw.forestR;
    trailInCircle(g, tw.x, tw.y, R, PATH_W * 0.92, 'rgba(242,218,166,0.72)');
    trailInCircle(g, tw.x, tw.y, Math.min(R, 440), PATH_W * 0.76, 'rgba(234,202,138,0.42)');
    trailInCircle(g, tw.x, tw.y, Math.min(R, 220), PATH_W * 0.6, 'rgba(222,184,110,0.45)');
    /* bubbles in the dough, and the chocolate spikes studded all along it (like a bramble's thorns):
       bigger and darker near the mixer, where the dough hurts most */
    g.save(); g.beginPath(); g.arc(tw.x, tw.y, R, 0, TAU); g.clip();
    for (const P of G.paths) for (let d = 20; d < P.len; d += 46){
      const q = pathPos(P, d, 0), k = (t * 0.5 + d * 0.013) % 1;
      if (Math.hypot(q.x - tw.x, q.y - tw.y) > R) continue;
      circle(g, q.x + Math.sin(d) * 10, q.y + Math.cos(d * 1.3) * 10, 1.5 + k * 3); g.strokeStyle = 'rgba(255,248,226,' + (0.7 * (1 - k)) + ')'; g.lineWidth = 1; g.stroke();
    }
    /* (drawn in batches, one path per colour, so a whole kitchen of dough stays cheap) */
    const step = lowFx() ? 30 : 17, tri = [[], [], []];
    for (const P of G.paths) for (let d = 8, i = 0; d < P.len; d += step, i++){
      const q = pathPos(P, d, 0), dist = Math.hypot(q.x - tw.x, q.y - tw.y);
      if (dist > R) continue;
      const zone = dist <= 220 ? 2 : dist <= 440 ? 1 : 0;
      const side = i % 2 ? 1 : -1, off = PATH_W * (0.18 + ((i * 7) % 5) * 0.06) * side;
      const x = q.x - Math.sin(q.ang) * off, y = q.y + Math.cos(q.ang) * off;
      const a = q.ang + side * (1.1 + ((i * 3) % 4) * 0.35), len = 5 + zone * 1.7, w = len * 0.45;
      const ca = Math.cos(a), sa = Math.sin(a);
      tri[zone].push([x + ca * len, y + sa * len, x + sa * w, y - ca * w, x - sa * w, y + ca * w]);
    }
    g.fillStyle = 'rgba(40,22,10,0.25)'; g.beginPath();
    for (const L of tri) for (const s of L){ g.moveTo(s[0] + 1.2, s[1] + 1.2); g.lineTo(s[2] + 1.2, s[3] + 1.2); g.lineTo(s[4] + 1.2, s[5] + 1.2); g.closePath(); }
    g.fill();
    g.strokeStyle = '#24130a'; g.lineWidth = 0.6;
    tri.forEach((L, z) => {
      if (!L.length) return;
      g.beginPath(); for (const s of L){ g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.lineTo(s[4], s[5]); g.closePath(); }
      g.fillStyle = z >= 2 ? '#3d2210' : z ? '#5a341b' : '#7a4a26'; g.fill(); g.stroke();
    });
    g.strokeStyle = 'rgba(255,226,190,0.5)'; g.lineWidth = 0.7; g.beginPath();
    for (const L of tri) for (const s of L){ g.moveTo(s[0] * 0.8 + s[2] * 0.2, s[1] * 0.8 + s[3] * 0.2); g.lineTo(s[0] * 0.2 + s[2] * 0.8, s[1] * 0.2 + s[3] * 0.8); }
    g.stroke();
    g.restore();
    if (R < 1300){ g.save(); g.strokeStyle = 'rgba(232,196,120,0.55)'; g.lineWidth = 2; g.setLineDash([3, 7]); g.lineDashOffset = -t * 10; circle(g, tw.x, tw.y, R); g.stroke(); g.restore(); }
  }
  function drawCarpet(g, tw, t){
    const R = tw.sys.R;
    trailInCircle(g, tw.x, tw.y, R, PATH_W * 0.86, 'rgba(240,210,122,0.22)');
    g.save(); g.beginPath(); g.arc(tw.x, tw.y, R, 0, TAU); g.clip();
    g.lineCap = 'round';
    for (const P of G.paths){
      for (const [off, c, w] of [[-12, 'rgba(240,206,110,0.8)', 2.2], [-4, 'rgba(230,190,90,0.75)', 1.8], [5, 'rgba(244,214,128,0.8)', 2.2], [13, 'rgba(226,186,86,0.7)', 1.6]]){
        g.strokeStyle = c; g.lineWidth = w;
        g.beginPath();
        for (let d = 0; d <= P.len; d += 8){
          const q = pathPos(P, d, 0), wob = Math.sin(d * 0.11 + off) * 3;
          const x = q.x - Math.sin(q.ang) * (off + wob), y = q.y + Math.cos(q.ang) * (off + wob);
          d ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
    }
    g.restore();
    if (R < 1300){ g.save(); g.strokeStyle = 'rgba(240,210,122,0.6)'; g.lineWidth = 2; g.setLineDash([2, 6]); g.lineDashOffset = t * 12; circle(g, tw.x, tw.y, R); g.stroke(); g.restore(); }
  }
  /* a mixing bowl the planetary mixer set down, whisking up whirlwinds */
  function drawBowl(g, b, t){
    const born = clamp((t - b.born) / 0.35, 0, 1), fade = clamp(b.life / 2, 0, 1);
    g.save(); g.translate(b.x, b.y); g.globalAlpha = fade; g.scale(0.6 + 0.4 * born, 0.6 + 0.4 * born);
    g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, 3, 4, 17, 14); g.fill();
    circle(g, 0, 0, 16); fillStroke(g, '#e8eef0', '#7f8b90', 1.6);
    circle(g, 0, 0, 12.5); g.fillStyle = '#f2dfb6'; g.fill();
    const spin = (b.spin && t - b.spin < 0.8 ? t * 14 : t * 2) + b.seed;
    g.strokeStyle = '#c9a36a'; g.lineWidth = 1.4; g.lineCap = 'round';
    for (let i = 0; i < 3; i++){ g.beginPath(); g.arc(0, 0, 3 + i * 3, spin + i, spin + i + 3.6); g.stroke(); }
    g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 16, -2.6, -1.6); g.stroke();
    g.restore();
  }
  function drawParaFloor(g, t){
    for (const tw of G.paraList || []){
      if (!tw.sys) continue;
      if (tw.type === 'mixer' && tw.sys.R) drawDough(g, tw, t);
      else if (tw.type === 'pasta' && tw.sys.R) drawCarpet(g, tw, t);
    }
    /* a Dough Golem's dough */
    for (const tw of G.towers) if (tw.type === 'mixer' && !tw.paragon && tw.forestR && tw.s && tw.s.forest) drawDough(g, tw, t);
    for (const b of G.bowls || []) drawBowl(g, b, t);
  }
  /* ice over every sink and puddle while Eternal Winter stands */
  function drawIce(g, w, t){
    g.save();
    if (w.rx) ell(g, w.x, w.y, w.rx - 2, w.ry - 2); else rr(g, w.x + 2, w.y + 2, w.w - 4, w.h - 4, Math.max(2, (w.r || 0) - 2));
    const x0 = w.rx ? w.x - w.rx : w.x, y0 = w.rx ? w.y - w.ry : w.y, ww = w.rx ? w.rx * 2 : w.w, hh = w.rx ? w.ry * 2 : w.h;
    const gr = g.createLinearGradient(x0, y0, x0 + ww, y0 + hh);
    gr.addColorStop(0, 'rgba(240,250,255,0.9)'); gr.addColorStop(0.5, 'rgba(206,236,252,0.85)'); gr.addColorStop(1, 'rgba(180,222,245,0.88)');
    g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2; g.stroke();
    g.clip();
    g.strokeStyle = 'rgba(120,180,215,0.55)'; g.lineWidth = 1.1;
    const rnd = (n => () => (n = (n * 9301 + 49297) % 233280) / 233280)(Math.round(w.x + w.y));
    for (let i = 0; i < 9; i++){
      let x = x0 + rnd() * ww, y = y0 + rnd() * hh;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++){ x += (rnd() - 0.5) * 40; y += (rnd() - 0.5) * 40; g.lineTo(x, y); }
      g.stroke();
    }
    const k = (t * 0.25) % 1;
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.moveTo(x0 + ww * (k * 1.6 - 0.3), y0); g.lineTo(x0 + ww * (k * 1.6 - 0.1), y0); g.lineTo(x0 + ww * (k * 1.6 - 0.4), y0 + hh); g.lineTo(x0 + ww * (k * 1.6 - 0.6), y0 + hh); g.closePath(); g.fill();
    g.restore();
  }
  /* a small bar under a paragon for its system (fuel, heat, hooks...) */
  function drawParaMeters(g, t){
    if (typeof paraBar !== 'function') return;
    for (const tw of G.paraList || []){
      const m = paraBar(tw);
      if (!m) continue;
      const fl = TOWERS[tw.type].flyer && tw.fx != null;
      const x = fl ? tw.fx : tw.x, y = (fl ? tw.fy : tw.y) + tw.size * 1.3 + 12;
      const w = 48;
      g.save();
      g.fillStyle = 'rgba(20,24,28,0.75)'; rr(g, x - w / 2 - 2, y - 2, w + 4, 9, 4.5); g.fill();
      if (m.pips){
        const step = w / m.max;
        for (let i = 0; i < m.max; i++){ rr(g, x - w / 2 + i * step + 0.6, y, step - 1.2, 5, 1.5); g.fillStyle = i < m.n ? (m.cs ? m.cs[i] : m.c) : 'rgba(255,255,255,0.16)'; g.fill(); }
      } else {
        g.fillStyle = m.c; rr(g, x - w / 2, y, Math.max(2.5, w * clamp(m.v, 0, 1)), 5, 2.5); g.fill();
        if (m.mark != null){ g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x - w / 2 + w * m.mark - 0.5, y - 1, 1, 7); }
      }
      if (m.txt){
        g.font = '700 10px "Barlow Condensed", sans-serif'; g.textAlign = 'center';
        g.lineWidth = 3; g.strokeStyle = 'rgba(20,24,28,0.85)'; g.strokeText(m.txt, x, y + 18);
        g.fillStyle = m.tc || '#ffffff'; g.fillText(m.txt, x, y + 18);
      }
      g.restore();
    }
  }
  /* extras drawn on top of a paragon for what its system is doing */
  function drawParaTop(g, tw, time, sc){
    const S = tw.sys;
    if (!S) return;
    const R = tw.size * sc;
    g.save(); g.translate(tw.x, tw.y);
    switch (tw.type){
      case 'grill':
        if (S.form){
          for (let i = 0; i < 9; i++){
            const an = i / 9 * TAU + time * 0.8, hgt = 16 + Math.sin(time * 11 + i * 1.7) * 6, x = Math.cos(an) * R * 0.9, y = Math.sin(an) * R * 0.8;
            g.beginPath(); g.moveTo(x - 6, y); g.quadraticCurveTo(x, y - hgt * 1.6, x + 6, y); g.closePath(); g.fillStyle = 'rgba(255,110,40,0.8)'; g.fill();
            g.beginPath(); g.moveTo(x - 3, y); g.quadraticCurveTo(x, y - hgt, x + 3, y); g.closePath(); g.fillStyle = 'rgba(255,224,120,0.9)'; g.fill();
          }
          g.save(); g.translate(0, -R * 0.4); g.rotate(-Math.PI / 2); g.scale(1.4, 1.4); drawBird(g, time, 0, true); g.restore();
        } else if (S.mode === 'bellows'){
          const k = (time * 2) % 1;
          g.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)) + ')'; g.lineWidth = 2;
          for (const s of [-1, 1]){ g.beginPath(); g.arc(s * R * 1.1, -R * 0.2, 4 + k * 9, 0, TAU); g.stroke(); }
        }
        break;
      case 'micro': {
        const h = S.heat / 100;
        if (h > 0.05 || S.downT > 0){
          const c = S.downT > 0 ? '200,210,215' : h > 0.75 ? '255,90,60' : h > 0.4 ? '255,190,80' : '159,243,255';
          const gr = g.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 1.9);
          gr.addColorStop(0, 'rgba(' + c + ',0)'); gr.addColorStop(0.7, 'rgba(' + c + ',' + (0.12 + h * 0.3 + (h > 0.85 ? Math.sin(time * 18) * 0.1 : 0)) + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)');
          g.fillStyle = gr; circle(g, 0, 0, R * 1.9); g.fill();
          if (S.downT > 0 && !lowFx() && Math.random() < 0.3) part(tw.x + rand(-R, R), tw.y - R * 0.5, rand(-10, 10), rand(-50, -25), 0.9, 'rgba(240,245,248,0.5)', 5, 'smoke');
        }
        break;
      }
      case 'blender': {
        const k = S.rpm / 100;
        if (k > 0.05){ g.strokeStyle = 'rgba(255,154,82,' + (0.25 + k * 0.5) + ')'; g.lineWidth = 2 + k * 2; for (let i = 0; i < 3; i++){ const a0 = time * (4 + k * 18) + i * TAU / 3; g.beginPath(); g.arc(0, 0, R * 1.35, a0, a0 + 0.9 + k); g.stroke(); } }
        break;
      }
      case 'gatling':
        if (S.lvl > 0){ const k = S.lvl / 5; const gr = g.createRadialGradient(0, 0, R * 0.4, 0, 0, R * 1.7); gr.addColorStop(0, 'rgba(255,80,30,0)'); gr.addColorStop(0.7, 'rgba(255,80,30,' + (0.1 + k * 0.32) + ')'); gr.addColorStop(1, 'rgba(255,80,30,0)'); g.fillStyle = gr; circle(g, 0, 0, R * 1.7); g.fill(); }
        break;
      case 'mixer':
        /* overmixing: a red ring that throbs, and sparks flying off */
        if (S.over){
          g.strokeStyle = 'rgba(255,90,78,' + (0.55 + 0.3 * Math.sin(time * 12)).toFixed(3) + ')'; g.lineWidth = 4; circle(g, 0, 0, R * 1.5); g.stroke();
          if (!lowFx()) for (let i = 0; i < 4; i++){ const an = time * 5 + i * TAU / 4, rr2 = R * (1.5 + 0.25 * Math.sin(time * 9 + i)); circle(g, Math.cos(an) * rr2, Math.sin(an) * rr2, 1.8); g.fillStyle = '#ffd166'; g.fill(); }
        } else if (S.mom > 0){ g.strokeStyle = 'rgba(242,154,192,' + (0.15 + S.mom / 40).toFixed(3) + ')'; g.lineWidth = 2; circle(g, 0, 0, R * 1.35); g.stroke(); }
        break;
      case 'espresso': {
        const c = typeof BLEND_COLOR !== 'undefined' ? BLEND_COLOR[S.blend] : '#c8814a';
        g.strokeStyle = rgbaStr(c, 0.55); g.lineWidth = 3; g.setLineDash([8, 6]); g.lineDashOffset = -time * 16; circle(g, 0, 0, R * 1.55); g.stroke(); g.setLineDash([]);
        if (tw.boost && tw.boost.refill) for (const [i, k] of ['espresso', 'americano', 'mocha', 'coldbrew'].entries()){ const an = time * 2 + i * TAU / 4; circle(g, Math.cos(an) * R * 1.55, Math.sin(an) * R * 1.55, 4); g.fillStyle = BLEND_COLOR[k]; g.fill(); }
        break;
      }
      case 'sub':
        if (S.wait > 0){
          g.font = '700 22px "Barlow Condensed", sans-serif'; g.textAlign = 'center';
          g.lineWidth = 4; g.strokeStyle = 'rgba(29,43,51,0.9)'; g.strokeText(Math.ceil(S.wait), 0, -R - 16);
          g.fillStyle = Math.floor(time * 4) % 2 ? '#ffd166' : '#ff5a4e'; g.fillText(Math.ceil(S.wait), 0, -R - 16);
        }
        break;
      case 'bread':
        if (S.vault > 0){
          const n = Math.min(6, Math.ceil(S.vault / 20));
          for (let i = 0; i < n; i++){ g.save(); g.translate(R * 1.25 + (i % 3) * 7 - 7, R * 0.4 - Math.floor(i / 3) * 6); rr(g, -6, -3.5, 12, 7, 3.5); fillStroke(g, '#f2c14e', '#a57412', 0.8); g.restore(); }
        }
        break;
    }
    g.restore();
  }

  /* ---------------- icons ---------------- */
  const iconCache = new Map();
  /* a few looks frame better in the shop turned another way, or a little smaller (a wide turntable) */
  const ICON_AIM = {}, ICON_FIT = { susan: 0.8 };
  function towerIcon(type, size, up, par, skin, tint){
    up = up || [0, 0, 0];
    const T = TOWERS[type];
    if (!T) return mkCanvas(size * SK, size * SK);
    skin = skin || (typeof skinOf === 'function' ? skinOf(type) : 'classic');
    tint = tint || (T.custom && typeof customTintAt === 'function' && customTintAt(type, up, par)) || T.tint || '';
    const upLook = (T.custom && typeof customLookAt === 'function' && customLookAt(type, up, par)) || T.look || type;
    const gl3 = glOn() && !!MODELS3D[upLook];
    const key = type + up.join('') + (par ? 'P' : '') + size + ':' + SK + ':' + skin + ':' + upLook + ':' + tint + (gl3 ? ':gl' : depthOn() ? ':3d' : '') + (MODELS3D[upLook] && MODELS3D[upLook].key ? ':' + MODELS3D[upLook].key() : '');
    let c = iconCache.get(key);
    if (c) return c;
    c = mkCanvas(size * SK, size * SK);
    const g = c.getContext('2d');
    g.scale(SK, SK);
    const fake = { type, x: size / 2, y: size / 2 + 2, size: T.size, up, paragon: !!par, aim: -Math.PI / 4, aim2: -Math.PI / 4, fireAnim: 0, rank: 0, boost: {}, skin, tint, id: 3, icon: true, s: { look: upLook } };
    if (gl3){
      /* a real model, turned to show its front, framed by how far it actually reaches (and its shadow), centred */
      fake.x = 0; fake.y = 0; fake.aim = fake.aim2 = ICON_AIM[upLook] != null ? ICON_AIM[upLook] : Math.PI / 4;
      const P = solidSpec(fake, T), def = MODELS3D[P.look], m = glModel(fake, T, P, def);
      if (m){
        const b = GL3D.bounds(m, glTurn(fake, P).rot, P.sc, P.cast), bw = b.x1 - b.x0, bh = b.y1 - b.y0;
        const scl = Math.min(size / 64 * 1.5, size * 0.92 / bw, size * 0.92 / bh);
        g.translate(size / 2 - (b.x0 + bw / 2) * scl, size / 2 - (b.y0 + bh / 2) * scl);
        g.scale(scl, scl);
        drawTower(g, fake, 0.6, {});
        iconCache.set(key, c);
        return c;
      }
      fake.x = size / 2; fake.y = size / 2 + 2; fake.aim = fake.aim2 = -Math.PI / 4;
    }
    /* standing up, an appliance needs room for its sides below: lift it by half its height and shrink it a little */
    let fit = 1;
    if (depthOn()){ const z = solidDepth(T, fake, par ? 1.25 : 1), body = T.size * 2.4 * (par ? 1.25 : 1); fake.y -= z * 0.5; fit = body / (body + z * 0.7); }
    const sc = size / 64 * fit * (ICON_FIT[upLook] || 1);
    g.translate(size / 2, size / 2); g.scale(sc * 1.15, sc * 1.15); g.translate(-size / 2, -size / 2);
    drawTower(g, fake, 0.6, {});
    iconCache.set(key, c);
    return c;
  }
  function pestIcon(type, size){
    const key = 'p' + type + size + ':' + SK;
    let c = iconCache.get(key);
    if (c) return c;
    c = mkCanvas(size * SK, size * SK);
    const g = c.getContext('2d');
    g.scale(SK, SK);
    const def = ENEMIES[type];
    const ext = def.big ? def.r * 1.45 + 6 : (type === 'mouse' || type === 'rat') ? def.r * 1.9 : def.r * 1.45;
    const sc = (size / 2) / ext;
    g.translate(size / 2, size / 2); g.scale(sc, sc);
    const e = { x:0, y:0, r:def.r, def, type, rot:-Math.PI / 2, anim:0, id:3, hp:1, maxHp:1, big:def.big, camo:false, freezeT:0, stunT:0, burn:null, soakT:0, vulnT:0, flashT:0, shieldT:0, dashT:0 };
    if (BIG[type]){ g.save(); g.rotate(-Math.PI / 2); BIG[type](g, e, 0.3); g.restore(); }
    else { const s = spriteFor(type, 0); g.save(); g.rotate(-Math.PI / 2); g.drawImage(s, -s._half, -s._half, s._half * 2, s._half * 2); g.restore(); }
    iconCache.set(key, c);
    return c;
  }
  /* ---------------- ability icons ----------------
     Each ability gets its own picture on a coloured disc, drawn in a 20 x 20 box around the centre. */
  const AB_ART = {
    knives: ['#e2383f', g => { g.rotate(-Math.PI / 4); g.lineCap = 'round'; for (const oy of [-5, 0, 5]){ g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-11.6, oy); g.lineTo(-9.4, oy); g.stroke(); g.beginPath(); g.moveTo(-1, oy - 1.5); g.lineTo(8.6, oy - 1.5); g.quadraticCurveTo(6, oy + 1.8, -1, oy + 1.8); g.closePath(); fillStroke(g, '#f4f7f8', '#5c666b', 0.6); rr(g, -8, oy - 1.4, 7.2, 2.8, 1.2); g.fillStyle = '#2a2a2a'; g.fill(); g.fillStyle = '#c9d2d6'; circle(g, -5.6, oy, 0.5); g.fill(); circle(g, -3.4, oy, 0.5); g.fill(); } }],
    bagel: ['#f0a12e', g => { circle(g, 0, 0, 7.2); fillStroke(g, '#d39b52', '#7a4a20', 1); circle(g, 0, 0, 2.6); g.fillStyle = '#9a5f1c'; g.fill(); g.fillStyle = '#fff6da'; for (let i = 0; i < 8; i++){ const a = i / 8 * TAU; ell(g, Math.cos(a) * 4.9, Math.sin(a) * 4.9, 1, 0.5, a); g.fill(); } }],
    toast: ['#c9363a', g => { rr(g, -6.5, -4.5, 12, 11, 3); fillStroke(g, '#e2b875', '#8a5a2b', 1); rr(g, -4.5, -2.5, 8, 7, 1.5); g.fillStyle = '#f2d39b'; g.fill(); star(g, 5.5, -5.5, 4.2, '#ffd166'); }],
    swirl: ['#5f8fb8', g => { g.strokeStyle = '#ffffff'; g.lineWidth = 1.8; g.lineCap = 'round'; for (let i = 0; i < 3; i++){ g.beginPath(); g.arc(0, 0, 2.4 + i * 2.6, i * 2.1, i * 2.1 + 4.3); g.stroke(); } }],
    wave: ['#2f6f9f', g => { g.beginPath(); g.moveTo(0, -8); g.bezierCurveTo(6, -1, 6.5, 6, 0, 7.5); g.bezierCurveTo(-6.5, 6, -6, -1, 0, -8); fillStroke(g, '#bfe9ff', '#ffffff', 1); ell(g, -2, 1, 1.3, 2.6, -0.3); g.fillStyle = '#ffffff'; g.fill(); }],
    pot: ['#b8861b', g => { rr(g, -7, -2, 14, 9, 3); g.fillStyle = '#3d4549'; g.fill(); g.fillStyle = '#5c666b'; g.fillRect(-8, -3, 16, 2.4); ell(g, 0, -2.2, 6.2, 1.4); g.fillStyle = '#f2c14e'; g.fill(); g.strokeStyle = '#fff3c4'; g.lineWidth = 1; for (const [x, y, r] of [[-3, -5.5, 1.3], [1, -7.4, 1], [4, -5, 1.4]]){ circle(g, x, y, r); g.stroke(); } }],
    snow: ['#3f8fc4', g => { g.strokeStyle = '#ffffff'; g.lineWidth = 1.7; g.lineCap = 'round'; for (let i = 0; i < 3; i++){ g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.moveTo(0, -8); g.lineTo(0, 8); for (const s of [-1, 1]){ g.moveTo(0, s * 5); g.lineTo(-2.4, s * 7.2); g.moveTo(0, s * 5); g.lineTo(2.4, s * 7.2); } g.stroke(); g.restore(); } }],
    fizz: ['#d6455a', g => { g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; for (const [x, y, r] of [[-3, 4, 2.8], [2.5, 1, 2], [-1, -3.5, 1.6], [3.5, -5, 1.3], [-4.2, -6.2, 1.1]]){ circle(g, x, y, r); g.stroke(); } }],
    crate: ['#2a9d8f', g => { rr(g, -7, -6, 14, 12, 1.5); fillStroke(g, '#b98a50', '#6f5234', 1); g.fillStyle = '#ffd166'; g.font = '700 10px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 0.5); }],
    pizza: ['#c4643a', g => { g.beginPath(); g.moveTo(0, 8); g.lineTo(-7, -5); g.quadraticCurveTo(0, -9, 7, -5); g.closePath(); fillStroke(g, '#f6d66b', '#c9802a', 1); g.strokeStyle = '#e0a956'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-7, -5); g.quadraticCurveTo(0, -9, 7, -5); g.stroke(); g.fillStyle = '#b8322a'; for (const [x, y] of [[-2, -2], [2, -1.5], [0, 2.5]]){ circle(g, x, y, 1.4); g.fill(); } }],
    ravioli: ['#d08d2a', g => { rr(g, -6.5, -6.5, 13, 13, 2.5); fillStroke(g, '#f2d48a', '#8a6a24', 1); g.setLineDash([1.6, 1.2]); g.strokeStyle = '#b8903a'; rr(g, -4.6, -4.6, 9.2, 9.2, 1.5); g.stroke(); g.setLineDash([]); circle(g, 0, 0, 2); g.fillStyle = '#d9462e'; g.fill(); }],
    popcorn: ['#c9363a', g => { for (const [x, y, r] of [[-3, 2, 3.4], [3, 2, 3.2], [0, -2.5, 3.6], [-4, -3.5, 2.4], [4, -3.5, 2.5], [0, 5, 2.4]]){ circle(g, x, y, r); fillStroke(g, '#fff6da', '#d9b450', 0.7); } }],
    hook: ['#2e3437', g => { g.lineCap = 'round'; g.strokeStyle = '#c9a36a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(2.5, -11.5); g.lineTo(2.5, -8.4); g.stroke(); g.strokeStyle = '#e6ecee'; g.lineWidth = 1.5; circle(g, 2.5, -6.6, 1.8); g.stroke(); g.lineWidth = 2.6; g.beginPath(); g.moveTo(2.5, -4.8); g.lineTo(2.5, 2); g.arc(-1.5, 2, 4, 0, Math.PI, false); g.lineTo(-5.5, -1); g.stroke(); g.fillStyle = '#e6ecee'; g.beginPath(); g.moveTo(-8, 0.2); g.lineTo(-5.5, -4.8); g.lineTo(-3.4, 0); g.closePath(); g.fill(); }],
    missile: ['#3d4549', g => { g.rotate(-Math.PI / 4); g.beginPath(); g.moveTo(-7, -1.8); g.lineTo(-11, 0); g.lineTo(-7, 1.8); g.closePath(); g.fillStyle = '#ff9a3d'; g.fill(); rr(g, -7.5, -2.8, 11, 5.6, 2.2); fillStroke(g, '#f2c230', '#a8801a', 0.8); g.beginPath(); g.moveTo(3.5, -2.2); g.lineTo(8, 0); g.lineTo(3.5, 2.2); g.closePath(); g.fillStyle = '#d9332a'; g.fill(); }],
    aid: ['#5f6e52', g => { rr(g, -7, -1, 10, 8, 1.2); fillStroke(g, '#b98a50', '#6f5234', 0.9); g.save(); g.translate(3, -3.5); g.scale(0.62, 0.62); g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-8, 0, -6, -7, 0, -3); g.bezierCurveTo(6, -7, 8, 0, 0, 6); g.closePath(); fillStroke(g, '#ff5a6e', '#ffffff', 1.6); g.restore(); }],
    chute: ['#4f86c6', g => { g.beginPath(); g.arc(0, -2, 8, Math.PI, TAU); g.closePath(); fillStroke(g, '#e2383f', '#ffffff', 0.8); g.strokeStyle = '#ffffff'; g.lineWidth = 0.8; g.beginPath(); for (const x of [-8, -3, 3, 8]){ g.moveTo(x, -2); g.lineTo(0, 5.5); } g.stroke(); circle(g, 0, 6.5, 2); g.fillStyle = '#2d3527'; g.fill(); }],
    lemon: ['#5f9a3a', g => { circle(g, 0, 0, 7.2); fillStroke(g, '#f5d23c', '#c9a51c', 1); circle(g, 0, 0, 5.6); g.fillStyle = '#fff2a8'; g.fill(); g.strokeStyle = '#f5d23c'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 8; i++){ const a = i / 8 * TAU; g.moveTo(0, 0); g.lineTo(Math.cos(a) * 5.6, Math.sin(a) * 5.6); } g.stroke(); }],
    bonbon: ['#7b3fbf', g => { for (const s of [-1, 1]){ g.beginPath(); g.moveTo(s * 4.5, 0); g.lineTo(s * 9, -4); g.lineTo(s * 9, 4); g.closePath(); fillStroke(g, '#ffd1e6', '#b03a78', 0.7); } ell(g, 0, 0, 5.4, 4.4); fillStroke(g, '#ff6fb5', '#b03a78', 0.8); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-2, -4); g.lineTo(-1, 4); g.moveTo(1.5, -4); g.lineTo(2.5, 4); g.stroke(); }],
    cup: ['#7b4b2a', g => { g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.2; g.lineCap = 'round'; for (const x of [-2.5, 1]){ g.beginPath(); g.moveTo(x, -4); g.quadraticCurveTo(x + 2, -6, x, -8); g.stroke(); } rr(g, -6, -3, 10, 9, 2.4); fillStroke(g, '#f4efe6', '#b9b2a6', 0.8); ell(g, -1, -2.4, 4.2, 1.1); g.fillStyle = '#5a3a1e'; g.fill(); g.strokeStyle = '#f4efe6'; g.lineWidth = 1.8; g.beginPath(); g.arc(4.6, 1.4, 2.4, -1.2, 1.2); g.stroke(); }],
    burst: ['#e2383f', g => { star(g, 0, 0, 8.5, '#ffffff'); circle(g, 0, 0, 2.6); g.fillStyle = '#ffd166'; g.fill(); }],
    flame: ['#e07a1f', g => { g.beginPath(); g.moveTo(0, -8.5); g.bezierCurveTo(5, -3, 7, 2, 0, 8); g.bezierCurveTo(-7, 2, -4, -2, 0, -8.5); g.fillStyle = '#ffd166'; g.fill(); g.beginPath(); g.moveTo(0, -2); g.bezierCurveTo(3, 1, 3, 5, 0, 6.5); g.bezierCurveTo(-3, 5, -2, 1, 0, -2); g.fillStyle = '#ff5a2a'; g.fill(); }],
    stars: ['#6a4bd8', g => { for (let i = 0; i < 3; i++){ const a = i / 3 * TAU - Math.PI / 2; star(g, Math.cos(a) * 4.4, Math.sin(a) * 4.4, 3.4, '#ffd166'); } }],
    clock: ['#2a9d8f', g => { circle(g, 0, 0, 7); fillStroke(g, '#ffffff', '#1f7469', 1); g.strokeStyle = '#1d2b33'; g.lineWidth = 1.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -4.6); g.moveTo(0, 0); g.lineTo(3.2, 1.6); g.stroke(); }],
    crack: ['#5c666b', g => { g.beginPath(); g.moveTo(0, -8); g.lineTo(6.5, -5); g.lineTo(5.5, 3); g.lineTo(0, 8); g.lineTo(-5.5, 3); g.lineTo(-6.5, -5); g.closePath(); fillStroke(g, '#dfe7ea', '#ffffff', 0.8); g.strokeStyle = '#e2383f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0.5, -7); g.lineTo(-1.5, -2); g.lineTo(1.5, 0.5); g.lineTo(-0.5, 6); g.stroke(); }],
    sparkle: ['#4f86c6', g => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -8.5); g.quadraticCurveTo(0.8, -0.8, 8.5, 0); g.quadraticCurveTo(0.8, 0.8, 0, 8.5); g.quadraticCurveTo(-0.8, 0.8, -8.5, 0); g.quadraticCurveTo(-0.8, -0.8, 0, -8.5); g.fill(); }],
    bomb: ['#c9363a', g => { circle(g, -1, 1.5, 6.2); g.fillStyle = '#1d2124'; g.fill(); circle(g, -3, -0.5, 1.6); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill(); g.strokeStyle = '#d9b77a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(3, -3); g.quadraticCurveTo(5, -6, 6.5, -6.5); g.stroke(); star(g, 7, -7, 2.6, '#ffd166'); }],
    target: ['#e2383f', g => { for (const [r, c] of [[7.5, '#ffffff'], [5, '#e2383f'], [2.6, '#ffffff']]){ circle(g, 0, 0, r); g.fillStyle = c; g.fill(); } circle(g, 0, 0, 1); g.fillStyle = '#e2383f'; g.fill(); }],
    bolt: ['#e8a21a', g => { g.beginPath(); g.moveTo(2, -8.5); g.lineTo(-5, 1); g.lineTo(-0.5, 1); g.lineTo(-2, 8.5); g.lineTo(5, -1.5); g.lineTo(0.5, -1.5); g.closePath(); fillStroke(g, '#ffffff', '#1d2b33', 0.8); }],
    coin: ['#2a9d8f', g => { circle(g, 0, 0, 7); fillStroke(g, '#ffd166', '#a57412', 1.2); g.fillStyle = '#a57412'; g.font = '700 10px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 0.5); }],
    pan: ['#e2383f', g => { g.strokeStyle = '#2e3437'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(3, 4.5); g.lineTo(9.5, 8.5); g.stroke(); ell(g, -2, 3, 7.2, 3.6); fillStroke(g, '#3d4549', '#1f2427', 1); ell(g, -2, 2.5, 5.4, 2.2); g.fillStyle = '#596268'; g.fill(); g.beginPath(); g.moveTo(-7.5, 2); g.bezierCurveTo(-7, -4, -4, -3, -4.5, -8); g.bezierCurveTo(-1.5, -5, -0.5, -7, 0, -10); g.bezierCurveTo(3, -6, 4, -2, 3.5, 2); g.closePath(); g.fillStyle = '#ffb347'; g.fill(); g.beginPath(); g.moveTo(-4.5, 1.6); g.bezierCurveTo(-4, -2, -2, -2, -2, -5); g.bezierCurveTo(0, -3, 1, -1, 0.8, 1.6); g.closePath(); g.fillStyle = '#ffe08a'; g.fill(); }],
    wok: ['#a8272c', g => { for (const s of [-1, 1]){ rr(g, s * 8.6 - 1.6, 0.4, 3.2, 2.4, 1.2); g.fillStyle = '#1f2427'; g.fill(); } g.beginPath(); g.ellipse(0, 1.6, 8.6, 5.6, 0, 0, Math.PI); g.closePath(); fillStroke(g, '#3d4549', '#15191b', 0.9); ell(g, 0, 1.6, 8.6, 2.2); fillStroke(g, '#596268', '#15191b', 0.7); for (let i = 0; i < 3; i++){ const x = -4.5 + i * 4.5, hgt = i === 1 ? 10 : 7.5; g.beginPath(); g.moveTo(x - 2.6, 1); g.quadraticCurveTo(x - 1.6, -hgt * 0.5, x, -hgt); g.quadraticCurveTo(x + 1.6, -hgt * 0.5, x + 2.6, 1); g.closePath(); g.fillStyle = i === 1 ? '#ffd166' : '#ff8a3d'; g.fill(); } }],
    brain: ['#3f8fc4', g => { g.beginPath(); g.moveTo(-4.5, 0); g.lineTo(4.5, 0); g.lineTo(0, 9.5); g.closePath(); fillStroke(g, '#e0a956', '#8a5a2b', 0.9); circle(g, 0, -3, 5.4); fillStroke(g, '#bfe9ff', '#ffffff', 1); g.strokeStyle = '#3f8fc4'; g.lineWidth = 1.1; g.lineCap = 'round'; for (let i = 0; i < 3; i++){ g.save(); g.translate(0, -3); g.rotate(i * Math.PI / 3); g.beginPath(); g.moveTo(0, -3.4); g.lineTo(0, 3.4); g.stroke(); g.restore(); } g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-8.5, -8); g.lineTo(-6, -6); g.moveTo(8.5, -8); g.lineTo(6, -6); g.moveTo(0, -11.5); g.lineTo(0, -9.4); g.stroke(); }],
    thermo: ['#2c6fa8', g => { rr(g, -2.2, -9, 4.4, 13, 2.2); fillStroke(g, '#ffffff', '#ffffff', 0.5); circle(g, 0, 5.5, 3.8); fillStroke(g, '#7fd3ff', '#ffffff', 1); g.fillStyle = '#7fd3ff'; g.fillRect(-1, -1, 2, 6); g.strokeStyle = '#2c6fa8'; g.lineWidth = 0.8; g.beginPath(); for (const y of [-6.5, -3.8, -1.1]){ g.moveTo(2.2, y); g.lineTo(0.6, y); } g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.lineCap = 'round'; for (const [x, y] of [[-6.5, -5], [6.8, -1.5]]){ for (let i = 0; i < 3; i++){ const a = i / 3 * Math.PI; g.beginPath(); g.moveTo(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6); g.lineTo(x - Math.cos(a) * 2.6, y - Math.sin(a) * 2.6); g.stroke(); } } }],
    cash: ['#2a9d8f', g => { g.save(); g.rotate(-0.25); rr(g, -8.5, -6.5, 15, 8.5, 1.4); fillStroke(g, '#9fe0a0', '#3f8a46', 0.9); circle(g, -1, -2.2, 2.4); g.strokeStyle = '#3f8a46'; g.lineWidth = 0.8; g.stroke(); g.restore(); for (const [x, y] of [[3, 6.5], [3, 3.6], [3, 0.7]]){ ell(g, x, y, 5.2, 1.9); fillStroke(g, '#ffd166', '#a57412', 0.8); } }],
    sticks: ['#6c5ce7', g => { g.lineCap = 'round'; for (const [x0, y0, x1, y1] of [[-9, 7, 6, -8], [-6, 9.5, 9, -5.5]]){ g.strokeStyle = '#b8861b'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = '#ffd166'; g.lineWidth = 1.5; g.stroke(); } for (const [x, y] of [[-2.5, -6.5], [5, 2], [-7.5, -1]]) star(g, x, y, 2.4, '#ffffff'); }],
    blades: ['#4b3fb0', g => { g.save(); for (let i = 0; i < 3; i++){ g.rotate(TAU / 3); g.beginPath(); g.moveTo(1.5, -1.2); g.lineTo(10.5, -2.6); g.lineTo(10.5, 0.4); g.lineTo(1.5, 1.4); g.closePath(); fillStroke(g, '#eef3f5', '#9aa6ab', 0.6); rr(g, -5, -1.2, 5.5, 2.4, 1); g.fillStyle = '#26262e'; g.fill(); } g.restore(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.1; g.beginPath(); g.arc(0, 0, 11, -0.6, 0.9); g.stroke(); g.beginPath(); g.arc(0, 0, 11, 2.5, 4); g.stroke(); circle(g, 0, 0, 1.8); g.fillStyle = '#ffd166'; g.fill(); }],
    sauce: ['#a8272c', g => { rr(g, -8, -1, 16, 9.5, 3); fillStroke(g, '#596268', '#2e3437', 0.9); ell(g, 0, -1, 8, 2.8); fillStroke(g, '#c9302a', '#7a1a14', 0.8); for (const [x, y] of [[-3, -2], [3.5, -1]]){ ell(g, x, y, 2, 1); g.fillStyle = '#4f9a45'; g.fill(); } g.strokeStyle = '#d9a76a'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(2, -1.5); g.lineTo(8.5, -10); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.75)'; for (const [x, y, r] of [[-4, -6, 1.4], [0, -8.5, 1.1], [-1.5, -4.8, 0.9]]){ circle(g, x, y, r); g.fill(); } }],
    plate: ['#6a8d2f', g => { ell(g, 0, 2, 10, 6.6); fillStroke(g, '#ffffff', '#c3cbcf', 0.9); ell(g, 0, 2, 7, 4.4); g.fillStyle = '#f1f3f4'; g.fill(); g.strokeStyle = '#f0c35a'; g.lineWidth = 1.2; for (let i = 0; i < 5; i++){ g.beginPath(); g.ellipse(Math.cos(i * 1.3) * 1.4, 1.8 + Math.sin(i * 1.7) * 0.8, 4.8, 2.6, i * 0.7, 0, TAU); g.stroke(); } for (const [x, y] of [[-1.8, 1.2], [2, 2.6], [0.4, -0.2]]){ circle(g, x, y, 1.8); fillStroke(g, '#8a4a2a', '#4f2614', 0.5); } g.strokeStyle = '#ffffff'; g.lineWidth = 1.1; g.lineCap = 'round'; for (const x of [-3, 0, 3]){ g.beginPath(); g.moveTo(x, -5); g.quadraticCurveTo(x + 1.5, -7.5, x, -10); g.stroke(); } }],
    mallet: ['#9a5b3c', g => { g.save(); g.rotate(-0.7); g.strokeStyle = '#6a4128'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-1, 10); g.lineTo(-1, -2); g.stroke(); rr(g, -7.5, -9, 13, 7.5, 1.6); fillStroke(g, '#c9d2d6', '#4b565b', 0.9); g.fillStyle = '#7f8b90'; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++){ circle(g, -5 + i * 2.8, -7 + j * 3.4, 0.6); g.fill(); } g.restore(); star(g, 7, 6, 3, '#ffffff'); star(g, 9, -1, 2, '#ffd166'); }],
    cleaver: ['#5e3420', g => { g.save(); g.rotate(-0.45); rr(g, -11, -1.8, 7, 3.6, 1.5); fillStroke(g, '#6a4128', '#2e1d12', 0.8); g.beginPath(); g.moveTo(-4.5, -6.5); g.lineTo(9, -6.5); g.quadraticCurveTo(11, -6.5, 11, -4.5); g.lineTo(11, 6.5); g.lineTo(-4.5, 6.5); g.closePath(); fillStroke(g, '#e6ecee', '#4b565b', 0.9); g.strokeStyle = '#ffffff'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-3.5, 5.2); g.lineTo(10, 5.2); g.stroke(); circle(g, 7.2, -3.5, 1.2); g.fillStyle = '#8e9aa0'; g.fill(); g.restore(); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-9, -9); g.lineTo(-5.5, -6); g.moveTo(-10.5, -4.5); g.lineTo(-7, -3); g.stroke(); }],
    ribbon: ['#d9533c', g => { g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-10, 1); g.lineTo(10, 1); g.stroke(); for (const s of [-1, 1]){ g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(s * 5, -7, s * 9, -4, s * 7.5, 0); g.bezierCurveTo(s * 9, 4, s * 5, 6, 0, 0); g.closePath(); fillStroke(g, '#ffd166', '#b8861b', 0.8); g.beginPath(); g.moveTo(0, 0.5); g.lineTo(s * 3.6, 8.5); g.lineTo(s * 1.4, 8.8); g.closePath(); g.fillStyle = '#ffd166'; g.fill(); } circle(g, 0, 0.3, 2); fillStroke(g, '#e8a21a', '#b8861b', 0.7); star(g, -7, -8, 2.2, '#ffffff'); star(g, 7.5, -8.5, 1.8, '#ffffff'); }],
    firebird: ['#c2410c', g => { g.save(); g.rotate(-0.5); drawBird(g, 0.3, 0, false); g.restore(); }],
    oil: ['#b8861b', g => { g.beginPath(); g.moveTo(0, -9); g.bezierCurveTo(5.5, -2, 7, 2.5, 0, 8.5); g.bezierCurveTo(-7, 2.5, -5.5, -2, 0, -9); fillStroke(g, '#f2c862', '#ffffff', 1); ell(g, -2, 1, 1.4, 2.8, -0.3); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill(); for (let i = 0; i < 3; i++){ const x = -6 + i * 6, hh = i === 1 ? 6 : 4.5; g.beginPath(); g.moveTo(x - 2, 9.5); g.quadraticCurveTo(x, 9.5 - hh, x + 2, 9.5); g.closePath(); g.fillStyle = '#ff5a2a'; g.fill(); } }],
    nest: ['#c9a031', g => { g.strokeStyle = '#fff1c4'; g.lineWidth = 1.6; g.lineCap = 'round'; for (let i = 0; i < 5; i++){ g.beginPath(); g.ellipse(Math.cos(i * 1.3) * 1.6, Math.sin(i * 1.7) * 1.2, 7.5, 3.6, i * 0.65, 0, TAU); g.stroke(); } for (const [x, y] of [[-7, -8], [6, -9], [8.5, 6]]){ g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x * 0.75, y * 0.75); g.stroke(); } }],
    kernel: ['#e8a21a', g => { g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.3; g.lineCap = 'round'; for (let i = 0; i < 8; i++){ const a = i / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 7.5, Math.sin(a) * 7.5); g.lineTo(Math.cos(a) * 10.5, Math.sin(a) * 10.5); g.stroke(); } for (const [x, y, r] of [[-2.5, 1.5, 3.4], [2.5, 1.5, 3.2], [0, -2.5, 3.6], [-3.5, -3, 2.3], [3.6, -3, 2.4]]){ circle(g, x, y, r); fillStroke(g, '#fff6da', '#c9a51c', 0.7); } }],
    steam: ['#6b777c', g => { g.strokeStyle = '#ffffff'; g.lineWidth = 1.8; g.lineCap = 'round'; for (const x of [-4.5, 0, 4.5]){ g.beginPath(); g.moveTo(x, 6); g.bezierCurveTo(x + 3, 3, x - 3, -1, x, -4); g.bezierCurveTo(x + 2.5, -6, x - 1, -8, x + 1, -10); g.stroke(); } g.fillStyle = '#ffd166'; g.beginPath(); g.moveTo(5.5, 3); g.lineTo(9.5, 3); g.lineTo(7.5, 9.5); g.closePath(); g.fill(); }],
    heart: ['#d6455a', g => { g.beginPath(); g.moveTo(0, 7); g.bezierCurveTo(-9, 0, -7, -8, 0, -3.5); g.bezierCurveTo(7, -8, 9, 0, 0, 7); g.closePath(); fillStroke(g, '#ffffff', '#ffffff', 0.5); }],
    bladestorm: ['#8a6a10', g => { for (let i = 0; i < 6; i++){ g.save(); g.rotate(i * TAU / 6); g.translate(5, 0); g.beginPath(); g.moveTo(-1, -1.6); g.lineTo(6, -0.3); g.lineTo(6, 0.4); g.lineTo(-1, 1.6); g.closePath(); fillStroke(g, '#ffd166', '#7a5a10', 0.5); g.fillStyle = '#4a3a10'; g.fillRect(-4, -1.1, 3, 2.2); g.restore(); } circle(g, 0, 0, 2.4); g.fillStyle = '#ffffff'; g.fill(); }],
    brioche: ['#a85a1a', g => { g.strokeStyle = 'rgba(255,200,120,0.8)'; g.lineWidth = 1.4; g.lineCap = 'round'; for (const y of [-3, 0, 3]){ g.beginPath(); g.moveTo(-10, y + 3); g.lineTo(-5, y + 1.5); g.stroke(); } circle(g, 2, 0, 6.8); fillStroke(g, '#d98a3a', '#7a4214', 1); for (const [x, y, r] of [[0, -2.5, 2.8], [4.5, -1.5, 2.6], [2, 3, 2.8]]){ circle(g, x, y, r); g.fillStyle = '#eaa94a'; g.fill(); } circle(g, 2.2, 0, 2); fillStroke(g, '#f2c14e', '#a85a1a', 0.5); }],
    liquefy: ['#c4643a', g => { circle(g, 0, 0, 8.6); g.strokeStyle = '#ff9a52'; g.lineWidth = 2.6; g.stroke(); circle(g, 0, 0, 5.4); g.fillStyle = '#ffcf9a'; g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; for (let i = 0; i < 3; i++){ const a = i * 2.1; g.beginPath(); g.arc(0, 0, 3.2, a, a + 1.4); g.stroke(); } }],
    meteor: ['#5a2a14', g => { g.save(); g.rotate(0.9); for (let i = 3; i >= 1; i--){ circle(g, -i * 3.6, 0, 5 - i); g.fillStyle = 'rgba(255,' + (100 + i * 40) + ',40,' + (0.85 - i * 0.18) + ')'; g.fill(); } circle(g, 2, 0, 5.4); fillStroke(g, '#7a3a18', '#2a120a', 0.8); g.strokeStyle = '#ffb347'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -2); g.lineTo(2, 0.5); g.lineTo(4.5, -1.5); g.stroke(); g.restore(); }],
    rushhour: ['#2f7fc8', g => { for (const [y, w] of [[3.5, 9], [0, 8], [-3.5, 7]]){ ell(g, 1.5, y, w, 2.4); fillStroke(g, '#ffffff', '#9fb6c4', 0.7); } g.strokeStyle = '#ffd166'; g.lineWidth = 1.5; g.lineCap = 'round'; for (const y of [-6, -1, 4]){ g.beginPath(); g.moveTo(-10.5, y); g.lineTo(-6.5, y); g.stroke(); } }],
    pyre: ['#b8320c', g => { star(g, 0, 0, 10, 'rgba(255,214,102,0.85)'); g.save(); g.rotate(-Math.PI / 2); g.scale(0.85, 0.85); drawBird(g, 0.2, 0, true); g.restore(); }],
    inferno: ['#7a1a0a', g => { for (let i = 0; i < 5; i++){ const x = -8 + i * 4, hh = i === 2 ? 12 : i % 2 ? 9 : 6.5; g.beginPath(); g.moveTo(x - 2.6, 6); g.quadraticCurveTo(x - 1.4, 6 - hh * 0.5, x, 6 - hh); g.quadraticCurveTo(x + 1.4, 6 - hh * 0.5, x + 2.6, 6); g.closePath(); g.fillStyle = i === 2 ? '#ffd166' : '#ff6a2a'; g.fill(); } rr(g, -8.5, 5, 17, 4, 1.4); fillStroke(g, '#3d4549', '#15191b', 0.7); }],
    deepfry: ['#b8861b', g => { rr(g, -7.5, -3, 15, 9, 2); g.fillStyle = '#5c666b'; g.fill(); g.strokeStyle = '#c9d2d6'; g.lineWidth = 0.7; for (let x = -6; x <= 6; x += 3){ g.beginPath(); g.moveTo(x, -3); g.lineTo(x, 6); g.stroke(); } for (let y = -1; y <= 5; y += 3){ g.beginPath(); g.moveTo(-7.5, y); g.lineTo(7.5, y); g.stroke(); } g.strokeStyle = '#2e3437'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(7.5, -2); g.lineTo(11, -7); g.stroke(); for (const [x, y, r] of [[-4, -5.5, 1.6], [0, -7.5, 1.2], [3.5, -5.5, 1.7]]){ circle(g, x, y, r); g.strokeStyle = '#fff3c4'; g.lineWidth = 0.9; g.stroke(); } }],
    longnight: ['#1d2b55', g => { g.beginPath(); g.arc(-1, 0, 7, 0, TAU); g.arc(2.6, -2.4, 6, 0, TAU, true); g.fillStyle = '#e6f4ff'; g.fill('evenodd'); g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.lineCap = 'round'; for (const [x, y] of [[6, 5], [-7, 7], [7, -7]]){ for (let i = 0; i < 3; i++){ const a = i * Math.PI / 3; g.beginPath(); g.moveTo(x - Math.cos(a) * 2, y - Math.sin(a) * 2); g.lineTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2); g.stroke(); } } }],
    meltdown: ['#1f6f66', g => { circle(g, 0, 0, 8.5); g.fillStyle = '#ffd166'; g.fill(); g.fillStyle = '#1d2124'; for (let i = 0; i < 3; i++){ const a = -Math.PI / 2 + i * TAU / 3; g.beginPath(); g.moveTo(Math.cos(a - 0.5) * 2.6, Math.sin(a - 0.5) * 2.6); g.arc(0, 0, 7.4, a - 0.5, a + 0.5); g.lineTo(Math.cos(a + 0.5) * 2.6, Math.sin(a + 0.5) * 2.6); g.closePath(); g.fill(); } circle(g, 0, 0, 1.8); g.fill(); }],
    supernova: ['#b8861b', g => { star(g, 0, 0, 10, '#fff4c2'); g.save(); g.rotate(-0.6); rr(g, -3, -4, 6, 8, 2); fillStroke(g, '#d9a066', '#7a4a20', 0.8); g.fillStyle = '#7a4a20'; for (let i = -2; i <= 2; i += 2) g.fillRect(i - 0.4, -3, 0.8, 6); g.restore(); }],
    avalanche: ['#c4643a', g => { for (const [x, y, s] of [[-5, -4, 0.6], [4, -6, 0.5], [0, 3, 0.75]]){ g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(0, 8); g.lineTo(-7, -5); g.quadraticCurveTo(0, -9, 7, -5); g.closePath(); fillStroke(g, '#f6d66b', '#c9802a', 1.2); g.fillStyle = '#b8322a'; circle(g, 0, 0, 1.8); g.fill(); g.restore(); } g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1; g.lineCap = 'round'; for (const x of [-8, 8, -1]){ g.beginPath(); g.moveTo(x, -10); g.lineTo(x - 1.5, -7); g.stroke(); } }],
    overmix: ['#a8508f', g => { g.save(); g.rotate(-0.5); g.strokeStyle = '#c9d2d6'; g.lineWidth = 1.6; for (let i = 0; i < 3; i++){ g.beginPath(); g.ellipse(0, 3, 3 + i * 1.6, 6, 0, 0, TAU); g.stroke(); } g.strokeStyle = '#8a5a3a'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -3); g.lineTo(0, -10); g.stroke(); g.restore(); star(g, 7, -6, 3, '#ffd166'); star(g, -7.5, 5, 2.4, '#ffffff'); }],
    boil: ['#c9a031', g => { rr(g, -8, -1, 16, 9, 2.5); fillStroke(g, '#5c666b', '#2e3437', 0.9); g.fillStyle = '#7a868b'; g.fillRect(-9.5, -2, 19, 2.2); g.strokeStyle = '#fff1c4'; g.lineWidth = 1.3; g.lineCap = 'round'; for (const x of [-4, 0, 4]){ g.beginPath(); g.moveTo(x, -2); g.bezierCurveTo(x + 2, -5, x - 2, -7, x + 1, -10); g.stroke(); } }],
    geddon: ['#8a2a1a', g => { rr(g, -7, -5, 14, 14, 3); fillStroke(g, '#f2d48a', '#8a6a24', 1); circle(g, 0, 2, 3); g.fillStyle = '#d9462e'; g.fill(); g.strokeStyle = '#d9b77a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(3, -5); g.quadraticCurveTo(6, -9, 9, -8); g.stroke(); star(g, 9, -8.5, 2.8, '#ffd166'); }],
    reaper: ['#7a0a0a', g => { g.beginPath(); g.moveTo(-1, -6); g.bezierCurveTo(7, -7, 8, 3, 2, 9); g.bezierCurveTo(-2, 6, -6, 2, -5, -3); g.closePath(); fillStroke(g, '#e2231a', '#ffb347', 0.9); g.fillStyle = '#4f9a45'; g.beginPath(); g.moveTo(-3, -6); g.lineTo(1, -10); g.lineTo(2, -6); g.closePath(); g.fill(); ell(g, -1.5, -1, 1.4, 3, 0.4); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill(); }],
    leviathan: ['#1f4f7a', g => { g.lineCap = 'round'; g.strokeStyle = '#e6ecee'; g.lineWidth = 3; g.beginPath(); g.moveTo(3, -10); g.lineTo(3, 2); g.arc(-1.5, 2, 4.5, 0, Math.PI, false); g.lineTo(-6, -2); g.stroke(); g.fillStyle = '#e6ecee'; g.beginPath(); g.moveTo(-9, -1); g.lineTo(-6, -6.5); g.lineTo(-3.5, -1); g.closePath(); g.fill(); g.strokeStyle = 'rgba(160,215,255,0.9)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10, 9); g.quadraticCurveTo(-5, 6, 0, 9); g.quadraticCurveTo(5, 12, 10, 9); g.stroke(); }],
    finale: ['#3d4549', g => { for (const [dx, dy, s] of [[-5, 3, 0.7], [0, -2, 0.85], [5, 4, 0.7]]){ g.save(); g.translate(dx, dy); g.rotate(-Math.PI / 2); g.scale(s, s); g.beginPath(); g.moveTo(-7, -1.8); g.lineTo(-11, 0); g.lineTo(-7, 1.8); g.closePath(); g.fillStyle = '#ff9a3d'; g.fill(); rr(g, -7.5, -2.8, 11, 5.6, 2.2); fillStroke(g, '#f2c230', '#a8801a', 0.8); g.beginPath(); g.moveTo(3.5, -2.2); g.lineTo(8, 0); g.lineTo(3.5, 2.2); g.closePath(); g.fillStyle = '#d9332a'; g.fill(); g.restore(); } }],
    strafe: ['#5f6e52', g => { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.setLineDash([2, 2]); g.beginPath(); g.moveTo(-10, 9); g.lineTo(10, -9); g.stroke(); g.setLineDash([]); for (const [x, y] of [[-6, 5], [0, 0], [6, -5]]){ g.save(); g.translate(x, y); g.rotate(-Math.PI / 4); g.scale(0.62, 0.62); drawMini(g, 0, x, true); g.restore(); } }],
    bombers: ['#4a3f6b', g => { ell(g, 0, -4, 9, 3.6); fillStroke(g, '#7b6bb0', '#221a38', 0.8); ell(g, 1, -5.2, 3.6, 2); g.fillStyle = 'rgba(160,230,255,0.9)'; g.fill(); for (const [x, y] of [[-4, 3], [1, 6], [5, 2.5]]){ circle(g, x, y, 1.8); g.fillStyle = '#1d2124'; g.fill(); } star(g, 1, 9.5, 2.4, '#ff6fb5'); }],
    refill: ['#7b4b2a', g => { ['#c8814a', '#5aa6d6', '#8a5a3a', '#7fd3ff'].forEach((c, i) => { const a = i * TAU / 4 - Math.PI / 4, x = Math.cos(a) * 5, y = Math.sin(a) * 5; ell(g, x, y, 3.4, 2.4, a); fillStroke(g, c, '#ffffff', 0.7); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - Math.cos(a) * 2.4, y - Math.sin(a) * 2.4); g.lineTo(x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4); g.stroke(); }); circle(g, 0, 0, 1.8); g.fillStyle = '#ffd166'; g.fill(); }],
    /* the second wave */
    soy: ['#5a3418', g => { rr(g, -4.5, -3, 9, 12, 3); fillStroke(g, '#2a160a', '#ffffff', 0.9); rr(g, -2.5, -8.5, 5, 6, 1.6); fillStroke(g, '#e2383f', '#ffffff', 0.8); rr(g, -3.5, 0.5, 7, 4, 1); g.fillStyle = '#f4efe6'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.1; g.lineCap = 'round'; for (const x of [-9, 8]){ g.beginPath(); g.moveTo(x, -3); g.lineTo(x + (x < 0 ? 2 : -2), 3); g.stroke(); } }],
    aim: ['#8a6a10', g => { g.strokeStyle = '#ffd166'; g.lineWidth = 1.8; circle(g, 0, 0, 6.5); g.stroke(); g.beginPath(); for (let i = 0; i < 4; i++){ const an = i * Math.PI / 2; g.moveTo(Math.cos(an) * 3, Math.sin(an) * 3); g.lineTo(Math.cos(an) * 10, Math.sin(an) * 10); } g.stroke(); circle(g, 0, 0, 1.4); g.fillStyle = '#ffffff'; g.fill(); }],
    tonic: ['#3f7a2a', g => { rr(g, -2, -9, 4, 5, 1); fillStroke(g, '#c9a36a', '#ffffff', 0.7); g.beginPath(); g.moveTo(-2, -4.5); g.lineTo(-7, 5); g.quadraticCurveTo(0, 10, 7, 5); g.lineTo(2, -4.5); g.closePath(); fillStroke(g, '#8fd16a', '#ffffff', 1); for (const sx of [-1, 1]){ circle(g, sx * 2.4, 3, 1.5); g.fillStyle = '#ffffff'; g.fill(); circle(g, sx * 2.4, 3.3, 0.7); g.fillStyle = '#1d2b14'; g.fill(); } }],
    smoke: ['#3d3550', g => { for (const [x, y, r] of [[-4, 2, 5], [3, 3, 4.5], [0, -3, 5], [5, -4, 3]]){ circle(g, x, y, r); g.fillStyle = 'rgba(220,215,235,0.9)'; g.fill(); } star(g, -6, -7, 2.4, '#ffd166'); }],
    shadow: ['#2a2438', g => { g.lineCap = 'round'; for (const [o, c] of [[-4, 'rgba(184,176,255,0.55)'], [0, '#e6e2ff']]){ g.strokeStyle = c; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-9 + o, 8); g.lineTo(8 + o, -8); g.stroke(); } star(g, 7, -7, 3.4, '#ffd166'); star(g, -7, 7, 2.2, '#f39a2e'); }],
    hammer: ['#a8272c', g => { circle(g, 0, 0, 7.5); fillStroke(g, '#596268', '#ffffff', 1); for (let i = 0; i < 6; i++){ const an = i / 6 * TAU; circle(g, Math.cos(an) * 4.4, Math.sin(an) * 4.4, 1.7); g.fillStyle = i % 2 ? '#ff7a1a' : '#ffd166'; g.fill(); } circle(g, 0, 0, 1.4); g.fillStyle = '#2e3437'; g.fill(); }],
    noon: ['#c46a1a', g => { circle(g, 0, 0, 5); g.fillStyle = '#ffd166'; g.fill(); g.strokeStyle = '#ffd166'; g.lineWidth = 1.6; g.lineCap = 'round'; for (let i = 0; i < 8; i++){ const an = i / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(an) * 7, Math.sin(an) * 7); g.lineTo(Math.cos(an) * 10, Math.sin(an) * 10); g.stroke(); } star(g, 0, 0, 3.6, '#a8272c'); }],
    transmute: ['#5a3a8a', g => { g.strokeStyle = '#e6d6ff'; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, 7, 0.4, 5.2); g.stroke(); g.fillStyle = '#e6d6ff'; g.beginPath(); g.moveTo(7.5, -1); g.lineTo(9.5, 4); g.lineTo(4.5, 2.6); g.closePath(); g.fill(); g.beginPath(); g.moveTo(0, -3.5); g.lineTo(3, 0.5); g.lineTo(0, 4.5); g.lineTo(-3, 0.5); g.closePath(); fillStroke(g, '#ffd166', '#a57412', 0.7); }],
    elixir: ['#2f6a3a', g => { rr(g, -2, -9.5, 4, 4.5, 1); fillStroke(g, '#c9a36a', '#ffffff', 0.7); g.beginPath(); g.moveTo(-2, -5); g.lineTo(-6.5, 3); g.quadraticCurveTo(0, 9.5, 6.5, 3); g.lineTo(2, -5); g.closePath(); fillStroke(g, '#ffd166', '#ffffff', 1); ell(g, -2, 1.5, 1.2, 2.2, 0.3); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill(); star(g, 7, -6, 2.4, '#ffffff'); star(g, -7.5, -2, 1.8, '#ffffff'); }],
    overclock: ['#1f5f8a', g => { g.save(); g.rotate(0.3); for (let i = 0; i < 8; i++){ g.save(); g.rotate(i * TAU / 8); g.fillStyle = '#dfe7ea'; g.fillRect(-1.6, -9, 3.2, 3); g.restore(); } circle(g, 0, 0, 6.6); fillStroke(g, '#dfe7ea', '#ffffff', 0.6); g.restore(); g.beginPath(); g.moveTo(1, -6); g.lineTo(-3, 1); g.lineTo(0, 1); g.lineTo(-1, 6); g.lineTo(3, -1); g.lineTo(0, -1); g.closePath(); fillStroke(g, '#7fd3ff', '#1f5f8a', 0.6); }],
    roar: ['#8a5a1a', g => { g.beginPath(); g.arc(0, 1, 8, 0.15 * Math.PI, 0.85 * Math.PI, true); g.closePath(); fillStroke(g, '#5a1a10', '#ffffff', 1); g.fillStyle = '#ffffff'; for (const x of [-5, 5]){ g.beginPath(); g.moveTo(x - 1.6, -1.5); g.lineTo(x, 3); g.lineTo(x + 1.6, -1.5); g.closePath(); g.fill(); } g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2; g.lineCap = 'round'; for (const r of [10, 12.5]){ g.beginPath(); g.arc(0, 1, r, -0.5, 0.5); g.stroke(); } }],
    icejet: ['#2c6fa8', g => { circle(g, 2, 2, 6); fillStroke(g, '#dff4ff', '#ffffff', 1); g.strokeStyle = '#7fd3ff'; g.lineWidth = 1; for (let i = 0; i < 3; i++){ const a = i * Math.PI / 3; g.beginPath(); g.moveTo(2 + Math.cos(a) * 4, 2 + Math.sin(a) * 4); g.lineTo(2 - Math.cos(a) * 4, 2 - Math.sin(a) * 4); g.stroke(); } g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.4; g.lineCap = 'round'; for (const o of [-3, 0, 3]){ g.beginPath(); g.moveTo(-9, -4 + o); g.lineTo(-4.5, -1.5 + o); g.stroke(); } }],
    overdrive: ['#2a3f8a', g => { for (const [x, y, r, sp] of [[-3, -2, 5.5, 1], [4, 4, 4, -1]]){ g.save(); g.translate(x, y); g.rotate(sp * 0.4); for (let i = 0; i < 8; i++){ g.save(); g.rotate(i * TAU / 8); g.fillStyle = '#dfe7ea'; g.fillRect(-1.2, -r - 2, 2.4, 2.4); g.restore(); } circle(g, 0, 0, r); fillStroke(g, '#dfe7ea', '#ffffff', 0.6); circle(g, 0, 0, r * 0.35); g.fillStyle = '#2a3f8a'; g.fill(); g.restore(); } star(g, 7, -7, 2.6, '#ffd166'); }],
    megabot: ['#4b565b', g => { rr(g, -7, -6, 14, 12, 3); fillStroke(g, '#c9d2d6', '#ffffff', 1); for (const x of [-3, 3]){ circle(g, x, -1, 2); g.fillStyle = '#7fd3ff'; g.fill(); } g.fillStyle = '#2e3437'; g.fillRect(-4, 3, 8, 1.6); g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -6); g.lineTo(0, -9.5); g.stroke(); circle(g, 0, -10, 1.4); g.fillStyle = '#e2383f'; g.fill(); }],
    stampede: ['#6a4a2a', g => { for (const [x, y, r] of [[-5, -4, 0.9], [4, -1, 0.9], [-3, 5, 0.9]]){ g.save(); g.translate(x, y); g.rotate(r); ell(g, 0, 0, 3, 3.6); g.fillStyle = '#f4efe6'; g.fill(); for (const s of [-1, 1]){ circle(g, s * 2.6, -4, 1.3); g.fill(); } g.restore(); } }],
    feast: ['#2a6a8a', g => { g.strokeStyle = '#f4efe6'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-9, -2); g.quadraticCurveTo(-4, -8, 0, -4); g.quadraticCurveTo(4, -8, 9, -2); g.stroke(); g.strokeStyle = '#ffd166'; g.lineWidth = 1.6; for (const x of [-3, 0, 3]){ g.beginPath(); g.moveTo(x, -2); g.lineTo(x * 1.3, 5); g.stroke(); } rr(g, -5, 5, 10, 4.5, 1.5); fillStroke(g, '#e2383f', '#ffffff', 0.7); }],
    tsunami: ['#1f5f8a', g => { g.beginPath(); g.moveTo(-10, 8); g.bezierCurveTo(-9, -4, 2, -10, 8, -4); g.bezierCurveTo(3, -5, 0, -1, 3, 2); g.bezierCurveTo(5, 4, 9, 3, 10, 8); g.closePath(); fillStroke(g, '#bfe9ff', '#ffffff', 1); g.fillStyle = '#ffffff'; for (const [x, y] of [[6, -6], [8.5, -3]]){ circle(g, x, y, 1.2); g.fill(); } }],
    kraken: ['#3a1f5a', g => { g.strokeStyle = '#d98ad9'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-6, 10); g.bezierCurveTo(-8, 2, 4, 2, 2, -4); g.bezierCurveTo(0, -9, -6, -8, -5, -4); g.stroke(); g.strokeStyle = '#f4d6f4'; g.lineWidth = 1; for (let i = 0; i < 4; i++){ circle(g, -5 + i * 2.4, 6 - i * 3, 0.9); g.stroke(); } g.strokeStyle = 'rgba(160,215,255,0.9)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10, 9); g.quadraticCurveTo(-5, 6, 0, 9); g.quadraticCurveTo(5, 12, 10, 9); g.stroke(); }],
    punchdown: ['#8a6a3a', g => { g.lineCap = 'round'; for (const [w, c] of [[5.5, '#c9a46a'], [3.2, '#f3e1b8']]){ g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(-2, 10); g.quadraticCurveTo(-9, 1, -2, -6); g.quadraticCurveTo(5, -10, 6, -3); g.stroke(); } for (const [x, y] of [[-8, 7], [7, 6], [1, 9]]){ g.save(); g.translate(x, y); g.rotate(x * 0.3); g.beginPath(); g.moveTo(2.6, 0); g.quadraticCurveTo(0.6, -2, -1.6, -1.5); g.quadraticCurveTo(-2.5, 0, -1.6, 1.5); g.quadraticCurveTo(0.6, 2, 2.6, 0); g.closePath(); g.fillStyle = '#4a2a14'; g.fill(); g.restore(); } star(g, 7.5, -8, 2.4, '#ffd166'); }],
    castle: ['#b5452f', g => { g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.4; g.lineCap = 'round'; for (const y of [-4, 0.5, 5]){ g.beginPath(); g.moveTo(-10.5, y); g.lineTo(-6, y); g.stroke(); } pieceAt(g, 'rook', 2.5, 8, 0.6, '#f3e7cb', { trim: true }); }],
    charge: ['#2a8f80', g => { g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.4; g.lineCap = 'round'; for (const y of [-4, 0.5, 5]){ g.beginPath(); g.moveTo(6, y); g.lineTo(10.5, y); g.stroke(); } pieceAt(g, 'knight', -1, 8.5, 0.56, '#f3e7cb', { armor: true }); }],
    void_pull: ['#2b47b8', g => { g.strokeStyle = '#dfe9ff'; g.lineWidth = 1.6; for (let i = 0; i < 4; i++){ const a = i / 4 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a) * 3.5, Math.sin(a) * 3.5); g.stroke(); } circle(g, 0, 0, 3); g.fillStyle = '#4a8cff'; g.fill(); circle(g, 0, 0, 1.4); g.fillStyle = '#fff'; g.fill(); }],
    void_burst: ['#b8252b', g => { g.strokeStyle = '#ffe0e0'; g.lineWidth = 1.6; for (let i = 0; i < 6; i++){ const a = i / 6 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 3.5, Math.sin(a) * 3.5); g.lineTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5); g.stroke(); } circle(g, 0, 0, 3); g.fillStyle = '#ff4a4a'; g.fill(); }],
    void_course: ['#5b2bd9', g => { g.rotate(-0.6); g.fillStyle = 'rgba(215,198,255,0.5)'; g.fillRect(-11, -3.5, 22, 7); g.fillStyle = '#ffffff'; g.fillRect(-11, -1.2, 22, 2.4); circle(g, -5, 0, 3); g.fillStyle = '#1a0b3a'; g.fill(); }],
    void_domain: ['#1a0b3a', g => { g.strokeStyle = '#8b5cf6'; g.lineWidth = 1.4; for (const r of [4, 7, 10]){ circle(g, 0, 0, r); g.stroke(); } g.fillStyle = '#d7c6ff'; g.font = '700 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('\u221e', 0, 0.5); }],
    checkmate: ['#5b3a8a', g => { g.save(); g.translate(-0.5, 4.5); g.rotate(-1.25); pieceAt(g, 'queen', 0, 7, 0.4, '#f2c14e', { trim: true, gem: true }); g.restore(); g.fillStyle = '#ffffff'; g.font = '700 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('#', 5.5, -5.5); }],
    stalemate: ['#3f6aa0', g => { pieceAt(g, 'pawn', -4.6, 9, 0.46, '#f3e7cb'); pieceAt(g, 'pawn', 4.6, 9, 0.46, CH_EBONY, { out: '#1c110b' }); g.fillStyle = '#ffffff'; g.fillRect(-2.8, -9, 5.6, 1.5); g.fillRect(-2.8, -6, 5.6, 1.5); }],
    market: ['#2a9d8f', g => { g.strokeStyle = '#ffffff'; g.lineWidth = 1.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-9, 4); g.lineTo(-4, -1); g.lineTo(0, 1.5); g.lineTo(7, -6); g.stroke(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(9.5, -8.5); g.lineTo(4, -7); g.lineTo(8, -3); g.closePath(); g.fill(); rr(g, -7, 5, 12, 5, 2.5); fillStroke(g, '#f2c14e', '#a57412', 0.8); }],
    flurry: ['#4f8a2e', g => { g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.3; g.lineCap = 'round'; for (const [y, l] of [[-6, 5], [-1.5, 7], [3, 5]]){ g.beginPath(); g.moveTo(-10.5, y); g.lineTo(-10.5 + l, y); g.stroke(); } chopstick(g, -6, -4, 9.5, -0.9, 2.6, STICK_PAL.bamboo); chopstick(g, -5, 2.4, 9.5, 0.5, 2.6, STICK_PAL.bamboo); star(g, 9.5, -6, 3, '#fffbe6'); star(g, 6, 7, 2.2, '#fffbe6'); }],
    fullspin: ['#b8761f', g => { circle(g, 0, 0, 7.6); fillStroke(g, '#d8aa6e', '#ffffff', 1.1); circle(g, 0, 0, 2); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.7; g.lineCap = 'round'; for (const a0 of [0.3, 0.3 + Math.PI]){ g.beginPath(); g.arc(0, 0, 10.2, a0, a0 + 1.9); g.stroke(); const ex = Math.cos(a0 + 1.9) * 10.2, ey = Math.sin(a0 + 1.9) * 10.2, ta = a0 + 1.9 + Math.PI / 2; g.beginPath(); g.moveTo(ex + Math.cos(ta - 2.4) * 3.4, ey + Math.sin(ta - 2.4) * 3.4); g.lineTo(ex, ey); g.lineTo(ex + Math.cos(ta + 2.4) * 3.4, ey + Math.sin(ta + 2.4) * 3.4); g.stroke(); } }],
    valve: ['#8a3a1a', g => { circle(g, 0, 3, 7); fillStroke(g, '#c9d2d6', '#ffffff', 1); circle(g, 0, 3, 2.4); g.fillStyle = '#e2383f'; g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.7; g.lineCap = 'round'; for (const x of [-4, 0, 4]){ g.beginPath(); g.moveTo(x, -4); g.bezierCurveTo(x + 2.5, -6, x - 2.5, -8, x, -10.5); g.stroke(); } }],
    mochi: ['#7a5a2a', g => { g.save(); g.rotate(-0.6); rr(g, -1.2, -2, 2.4, 12, 1); fillStroke(g, '#8a5a2a', '#ffffff', 0.7); rr(g, -6, -8, 12, 6.5, 2.4); fillStroke(g, '#c08a4a', '#ffffff', 0.9); g.restore(); ell(g, 3, 7, 7, 3.2); fillStroke(g, '#fffdf2', '#ffffff', 0.8); }],
    serve: ['#b8761f', g => { ell(g, 0, 3, 9, 4); fillStroke(g, '#f4f1ea', '#ffffff', 1); g.beginPath(); g.arc(0, 2, 7, Math.PI, 0); g.closePath(); g.fillStyle = '#fffdf2'; g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.lineCap = 'round'; for (const x of [-3, 2]){ g.beginPath(); g.moveTo(x, -3); g.bezierCurveTo(x + 2, -5, x - 2, -7, x, -9.5); g.stroke(); } }],
    bubblebath: ['#2f8fc8', g => { for (const [x, y, r] of [[-3, 2, 7], [5, -4, 4.5], [6, 5, 3]]){ circle(g, x, y, r); g.fillStyle = 'rgba(220,245,255,0.35)'; g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.stroke(); circle(g, x - r * 0.35, y - r * 0.35, r * 0.22); g.fillStyle = '#ffffff'; g.fill(); } ell(g, -3, 3, 3, 2); g.fillStyle = '#5a3d2a'; g.fill(); }],
    downpour: ['#3a5f8a', g => { for (const [x, y, r] of [[-5, -3, 4.5], [0, -5, 5.5], [5, -3, 4.5], [0, -1, 5]]){ circle(g, x, y, r); g.fillStyle = '#dfe8ef'; g.fill(); } g.strokeStyle = '#9fd3ff'; g.lineWidth = 1.4; g.lineCap = 'round'; for (const x of [-6, -1, 4]){ g.beginPath(); g.moveTo(x, 4); g.lineTo(x - 1.5, 8.5); g.stroke(); } g.strokeStyle = '#ffd166'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(3, 3); g.lineTo(1, 7); g.lineTo(4, 7); g.lineTo(2, 11); g.stroke(); }],
    hydroblast: ['#1f6fa8', g => { g.save(); g.rotate(-0.5); rr(g, -10, -2.5, 9, 5, 2); fillStroke(g, '#f2a03d', '#7a3a10', 0.9); g.fillStyle = '#bfe9ff'; g.beginPath(); g.moveTo(-1, -2); g.lineTo(11, -5); g.lineTo(11, 5); g.lineTo(-1, 2); g.closePath(); g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 1; for (const y of [-2.5, 0, 2.5]){ g.beginPath(); g.moveTo(2, y * 0.6); g.lineTo(10, y * 1.4); g.stroke(); } g.restore(); }],
    gravyflood: ['#7a3a14', g => { g.fillStyle = '#c9762a'; g.beginPath(); g.moveTo(-1, 1.5); g.quadraticCurveTo(1.5, 6, 0.5, 9); g.lineTo(-2.5, 9); g.quadraticCurveTo(-2, 5, -3, 2); g.closePath(); g.fill(); ell(g, -1, 9.2, 7.5, 1.8); g.fill(); g.save(); g.rotate(-0.45); g.beginPath(); g.moveTo(9, -2); g.quadraticCurveTo(4, -7, -4, -5.5); g.quadraticCurveTo(-7.5, -2, -4, 0.8); g.quadraticCurveTo(3, 1.6, 9, -2); g.closePath(); fillStroke(g, '#f6f1e6', '#ffffff', 0.9); g.strokeStyle = '#f6f1e6'; g.lineWidth = 1.5; g.beginPath(); g.arc(-6, -2.4, 2.4, Math.PI * 0.5, Math.PI * 1.5); g.stroke(); g.restore(); }],
    grandpinch: ['#1d6e5a', g => { rr(g, -6.5, 1.5, 13, 7, 2); fillStroke(g, '#e2383f', '#ffffff', 0.9); g.fillStyle = '#bfe9ff'; g.fillRect(-4.6, 3, 3.4, 2.6); g.fillRect(-0.4, 3, 3.4, 2.6); for (const x of [-3.5, 3.5]){ circle(g, x, 8.6, 1.6); g.fillStyle = '#2a2a2a'; g.fill(); } chopstick(g, 2, -11, -3.8, 1.8, 2.6, STICK_PAL.grand); chopstick(g, 7.5, -10, 4.2, 1.8, 2.6, STICK_PAL.grand); }],
  };
  const AB_LOOK = { barrage:'knives', bagel:'bagel', blitz:'toast', tornado:'swirl', rinse:'wave', vat:'pot', freeze:'snow', sugar:'fizz', supply:'crate', delivery:'pizza', pastarain:'ravioli',
    storm:'popcorn', galley:'hook', mustard:'missile', chinook:'aid', tactical:'chute', zest:'lemon', tsar:'bonbon', rush:'cup',
    flambe:'pan', wok:'wok', brainfreeze:'brain', bigchill:'thermo', payday:'cash', opening:'ribbon',
    omakase:'sticks', knifedance:'blades', sauce:'sauce', mangia:'plate', tenderize:'mallet', chop:'cleaver',
    void_pull:'void_pull', void_burst:'void_burst', void_course:'void_course', void_domain:'void_domain',
    bird:'firebird', spill:'oil', pastastorm:'nest', kernel:'kernel', steamup:'steam',
    sabotage:'soy', takeaim:'aim', tonic:'tonic', overclock:'overclock', roar:'roar', icejet:'icejet', punchdown:'punchdown',
    bladestorm:'bladestorm', brioche:'brioche', liquefy:'liquefy', meteor:'meteor', rushhour:'rushhour', pyre:'pyre', inferno:'inferno', deepfry:'deepfry', longnight:'longnight', meltdown:'meltdown',
    supernova:'supernova', avalanche:'avalanche', overmix:'overmix', boil:'boil', pastageddon:'geddon', reaper:'reaper', leviathan:'leviathan', finale:'finale', strafe:'strafe', bombers:'bombers', refill:'refill', marketday:'market',
    smokebomb:'smoke', shadowstrike:'shadow', fanhammer:'hammer', highnoon:'noon', transmute:'transmute', elixir:'elixir', overdrive:'overdrive', megabot:'megabot', stampede:'stampede', feast:'feast', tsunami:'tsunami', kraken:'kraken',
    castle:'castle', charge:'charge', checkmate:'checkmate', stalemate:'stalemate', flurry:'flurry', fullspin:'fullspin', gravyflood:'gravyflood', grandpinch:'grandpinch', bubblebath:'bubblebath', downpour:'downpour', hydroblast:'hydroblast', valve:'valve', mochi:'mochi', serve:'serve' };
  const CUSTOM_AB_LOOK = { damage:'burst', burn:'flame', freeze:'snow', stun:'stars', slow:'clock', knock:'swirl', weaken:'crack', strip:'sparkle', bombs:'bomb', strike:'target', speed:'bolt', cash:'coin', lives:'heart' };
  /* which picture an ability uses: built-ins by id, custom ones by their first action */
  function abilityLook(ab){
    if (!ab) return 'burst';
    if (AB_LOOK[ab.id]) return AB_LOOK[ab.id];
    const k = ab.actions && ab.actions[0] && ab.actions[0].k;
    return CUSTOM_AB_LOOK[k] || 'burst';
  }
  function abilityColor(ab){ const A = AB_ART[abilityLook(ab)]; return A ? A[0] : '#e2383f'; }
  function abilityIcon(ab, size){
    const look = abilityLook(ab), key = 'ab:' + look + ':' + size + ':' + SK;
    let c = iconCache.get(key);
    if (c) return c;
    c = mkCanvas(size * SK, size * SK);
    const g = c.getContext('2d');
    g.scale(SK, SK); g.translate(size / 2, size / 2);
    const [bg, draw] = AB_ART[look] || AB_ART.burst;
    circle(g, 0, 0, size / 2); g.fillStyle = bg; g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, size / 2, 0, TAU); g.clip();
    const sh = g.createLinearGradient(0, -size / 2, 0, size / 2); sh.addColorStop(0, 'rgba(255,255,255,0.22)'); sh.addColorStop(0.55, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.14)');
    g.fillStyle = sh; g.fillRect(-size / 2, -size / 2, size, size);
    g.restore();
    const k = size / 26;
    g.scale(k, k);
    g.lineJoin = 'round';
    try { draw(g); } catch (e) {}
    iconCache.set(key, c);
    return c;
  }
  /* ---------------- powers ----------------
     Same disc style as the ability icons, so the two read as a family. */
  const POWER_ART = {
    tipjar: ['#2a9d8f', g => { rr(g, -6.5, -5, 13, 13.5, 3); fillStroke(g, 'rgba(225,246,255,0.55)', '#ffffff', 1.1); rr(g, -7, -8.2, 14, 3.4, 1.2); fillStroke(g, '#c9a36a', '#8a6a3a', 0.7); for (const [x, y] of [[-2.6, 5], [2.6, 5], [0, 1.6], [-2.2, -1.6]]){ circle(g, x, y, 2.3); fillStroke(g, '#ffd166', '#a57412', 0.7); } g.fillStyle = '#a57412'; g.font = '700 4px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 2.6, 5.2); }],
    traps:  ['#8a5a2b', g => { rr(g, -9, -5.5, 18, 11, 1.6); fillStroke(g, '#e8c48a', '#6f4a22', 0.9); g.strokeStyle = '#6f4a22'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(-9, -1.8); g.lineTo(9, -1.8); g.moveTo(-9, 1.8); g.lineTo(9, 1.8); g.stroke(); g.strokeStyle = '#e6ecee'; g.lineWidth = 1.5; rr(g, -7, -3.6, 9, 7.2, 1); g.stroke(); g.beginPath(); g.moveTo(2, 0); g.lineTo(5, 0); g.stroke(); g.beginPath(); g.moveTo(4.2, -3); g.lineTo(8.6, 0); g.lineTo(4.2, 3.4); g.closePath(); fillStroke(g, '#ffd166', '#c9a51c', 0.6); circle(g, 5.6, 0.4, 0.7); g.fillStyle = '#e8b52a'; g.fill(); }],
    boost:  ['#d9533c', g => { for (const [dx, sc] of [[-3.2, 0.82], [3.4, 0.82]]){ g.save(); g.translate(dx, 0); g.scale(sc, sc); g.beginPath(); g.moveTo(2, -9); g.lineTo(-5, 1); g.lineTo(-0.5, 1); g.lineTo(-2, 9); g.lineTo(5, -1.5); g.lineTo(0.5, -1.5); g.closePath(); fillStroke(g, '#ffd166', '#ffffff', 1); g.restore(); } }],
    restock:['#6a8f3d', g => { rr(g, -7.5, -1, 15, 8.5, 1.4); fillStroke(g, '#c49a5a', '#6f5234', 0.9); g.strokeStyle = '#6f5234'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-7.5, 3); g.lineTo(7.5, 3); g.stroke(); g.save(); g.translate(0, -4.5); g.scale(0.7, 0.7); g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-8, 0, -6, -7, 0, -3); g.bezierCurveTo(6, -7, 8, 0, 0, 6); g.closePath(); fillStroke(g, '#ff5a6e', '#ffffff', 1.6); g.restore(); }],
    sweep:  ['#4f86c6', g => { g.lineCap = 'round'; g.strokeStyle = '#a8763a'; g.lineWidth = 2; g.beginPath(); g.moveTo(7, -9); g.lineTo(-0.5, 1.5); g.stroke(); g.save(); g.translate(-2.4, 4); g.rotate(0.62); g.beginPath(); g.moveTo(-3, -2.4); g.lineTo(3, -2.4); g.lineTo(5, 5); g.lineTo(-5, 5); g.closePath(); fillStroke(g, '#f2d06b', '#b8902a', 0.7); g.strokeStyle = '#b8902a'; g.lineWidth = 0.5; g.beginPath(); for (const x of [-2.4, 0, 2.4]){ g.moveTo(x * 0.8, -1.5); g.lineTo(x * 1.3, 4.5); } g.stroke(); g.restore(); star(g, 6, 3.5, 2.6, '#ffffff'); star(g, -6.5, -5.5, 2, '#ffffff'); }],
    freeze: ['#2c6fa8', g => { g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.2; g.lineCap = 'round'; for (let i = 0; i < 8; i++){ const a = i / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); g.lineTo(Math.cos(a) * 10.5, Math.sin(a) * 10.5); g.stroke(); } rr(g, -6, -6, 12, 12, 2.6); fillStroke(g, 'rgba(225,246,255,0.95)', '#ffffff', 1); g.strokeStyle = '#3f8fc4'; g.lineWidth = 1.2; for (let i = 0; i < 3; i++){ g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.moveTo(0, -4); g.lineTo(0, 4); g.stroke(); g.restore(); } }],
    storm:  ['#a8272c', g => { g.lineCap = 'round'; for (const [x, y, w] of [[5, -8, 2.2], [8.5, -4, 1.6], [1, -9.5, 1.4]]){ g.strokeStyle = 'rgba(255,209,102,0.85)'; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + 6); g.stroke(); } circle(g, -2, 2.5, 6.4); g.fillStyle = '#ff8a3d'; g.fill(); circle(g, -2.6, 3, 4.2); g.fillStyle = '#ffd166'; g.fill(); circle(g, -3, 3.4, 2); g.fillStyle = '#fff8d6'; g.fill(); }],
  };
  function powerIcon(id, size){
    const key = 'pw:' + id + ':' + size + ':' + SK;
    let c = iconCache.get(key);
    if (c) return c;
    c = mkCanvas(size * SK, size * SK);
    const g = c.getContext('2d');
    g.scale(SK, SK); g.translate(size / 2, size / 2);
    const [bg, draw] = POWER_ART[id] || POWER_ART.tipjar;
    circle(g, 0, 0, size / 2); g.fillStyle = bg; g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, size / 2, 0, TAU); g.clip();
    const sh = g.createLinearGradient(0, -size / 2, 0, size / 2); sh.addColorStop(0, 'rgba(255,255,255,0.22)'); sh.addColorStop(0.55, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.16)');
    g.fillStyle = sh; g.fillRect(-size / 2, -size / 2, size, size);
    g.restore();
    g.scale(size / 26, size / 26); g.lineJoin = 'round';
    try { draw(g); } catch (e) {}
    iconCache.set(key, c);
    return c;
  }
  function powerColor(id){ const A = POWER_ART[id]; return A ? A[0] : '#2a9d8f'; }
  /* crates: a wooden Chef's Crate or a Golden Crate, shut or flung open */
  function crateIcon(id, size, open){
    const key = 'crate:' + id + ':' + size + ':' + (open ? 1 : 0) + ':' + SK;
    let c = iconCache.get(key);
    if (c) return c;
    c = mkCanvas(size * SK, size * SK);
    const g = c.getContext('2d');
    g.scale(SK, SK); g.translate(size / 2, size / 2); g.scale(size / 100, size / 100);
    const gold = id === 'gold';
    const wood = gold ? ['#f7d774', '#e3a92c', '#9a6a12'] : ['#d9a865', '#b98345', '#6f4a22'];
    if (open){ g.translate(0, 8); g.scale(0.92, 0.92); }
    if (open){
      const gl = g.createRadialGradient(0, -6, 4, 0, -6, 60);
      gl.addColorStop(0, 'rgba(255,246,200,0.95)'); gl.addColorStop(1, 'rgba(255,246,200,0)');
      g.fillStyle = gl; g.fillRect(-50, -50, 100, 100);
      g.strokeStyle = 'rgba(255,240,180,0.7)'; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 9; i++){ const a = -Math.PI / 2 + (i - 4) * 0.28; g.beginPath(); g.moveTo(Math.cos(a) * 18, -4 + Math.sin(a) * 18); g.lineTo(Math.cos(a) * 46, -4 + Math.sin(a) * 46); g.stroke(); }
    }
    /* box */
    g.fillStyle = 'rgba(0,0,0,0.18)'; ell(g, 0, 40, 38, 6); g.fill();
    rr(g, -36, -6, 72, 44, 5); fillStroke(g, wood[0], wood[2], 2.5);
    g.strokeStyle = wood[1]; g.lineWidth = 1.6;
    for (const y of [8, 22]){ g.beginPath(); g.moveTo(-34, y); g.lineTo(34, y); g.stroke(); }
    g.fillStyle = wood[1]; rr(g, -36, -6, 9, 44, 3); g.fill(); rr(g, 27, -6, 9, 44, 3); g.fill();
    g.fillStyle = gold ? '#fff3c4' : '#c9d2d6'; for (const x of [-31.5, 31.5]) for (const y of [0, 32]){ circle(g, x, y, 1.8); g.fill(); }
    /* stamp: a chef's hat, or a star on gold */
    g.save(); g.translate(0, 16);
    if (gold){ star(g, 0, 0, 11, '#fff7d6'); star(g, 0, 0, 7, '#e3a92c'); }
    else {
      g.fillStyle = 'rgba(111,74,34,0.55)';
      g.beginPath(); g.arc(-6, -3, 5, Math.PI * 0.8, Math.PI * 1.9); g.arc(0, -6, 6, Math.PI * 1.1, Math.PI * 1.9); g.arc(6, -3, 5, Math.PI * 1.1, Math.PI * 0.2); g.lineTo(6, 6); g.lineTo(-6, 6); g.closePath(); g.fill();
    }
    g.restore();
    /* lid */
    g.save();
    if (open){ g.translate(-36, -6); g.rotate(-0.62); g.translate(36, 6); }
    rr(g, -39, -18, 78, 14, 4); fillStroke(g, wood[0], wood[2], 2.5);
    g.strokeStyle = wood[1]; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-37, -11); g.lineTo(37, -11); g.stroke();
    rr(g, -6, -16, 12, 10, 2); fillStroke(g, gold ? '#fff3c4' : '#c9d2d6', wood[2], 1.2);
    g.restore();
    iconCache.set(key, c);
    return c;
  }
  /* a mousetrap set on the trail (Mousetraps power) */
  function drawPowerTrap(g, tr, t){
    const gone = tr.left <= 0, age = gone ? t - (tr.goneAt != null ? tr.goneAt : (tr.goneAt = t)) : 0;
    g.save(); g.translate(tr.x, tr.y); g.rotate(tr.ang || 0); g.scale(1.3, 1.3);
    if (gone) g.globalAlpha = clamp(1 - age / 0.6, 0, 1);
    const snap = tr.t - tr.snap < 0.18;
    g.fillStyle = 'rgba(0,0,0,0.2)'; rr(g, -11, -6, 24, 15, 2.5); g.fill();
    rr(g, -12, -7.5, 24, 15, 2.5); fillStroke(g, '#e8c48a', '#6f4a22', 1.2);
    g.strokeStyle = '#b58a52'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-12, -2.5); g.lineTo(12, -2.5); g.moveTo(-12, 2.5); g.lineTo(12, 2.5); g.stroke();
    g.strokeStyle = '#dfe7ea'; g.lineWidth = 1.8;
    if (gone || snap){ rr(g, -9, -5, 9, 10, 1.2); g.stroke(); }
    else { g.beginPath(); g.moveTo(-1, -5); g.lineTo(-10, -5); g.lineTo(-10, 5); g.lineTo(-1, 5); g.stroke(); }
    g.beginPath(); g.moveTo(0, -6); g.lineTo(0, 6); g.stroke();
    if (!gone){ g.beginPath(); g.moveTo(4, -3.5); g.lineTo(9.5, 0); g.lineTo(4, 4); g.closePath(); fillStroke(g, '#ffd166', '#c9a51c', 0.8); }
    for (let i = 0; i < (tr.max || 6); i++){ circle(g, -10 + i * 4, 10.5, 1.3); g.fillStyle = i < tr.left ? '#ffd166' : 'rgba(29,43,51,0.35)'; g.fill(); }
    g.restore();
  }
  function setScale(k){ const n = clamp(Math.round(k * 2) / 2, 1, 3); if (n !== SK){ SK = n; cache.clear(); iconCache.clear(); } }
  function clearIcons(){ iconCache.clear(); clearSolids(); }
  /* how far an appliance's own art reaches from its centre (for tests that size the 3D canvases) */
  function measureBody(type, up, par, level, aim){
    const T = TOWERS[type], c = mkCanvas(400, 400), g = c.getContext('2d');
    const t = { type, x:0, y:0, size:T.size, up: up || [0, 0, 0], paragon: !!par, degree:50, aim: aim || 0, aim2: aim || 0, fireAnim:0, boost:{}, level: level || 1, id:7, icon:true, rank:0 };
    g.translate(200, 200);
    paintBody(g, t, T, lookOf(t, T), par ? [5, 5, 5] : t.up, null, 1.2, par ? 1.25 : 1, turnOf(t, lookOf(t, T)));
    const d = g.getImageData(0, 0, 400, 400).data;
    let r = 0;
    for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) if (d[(y * 400 + x) * 4 + 3] > 8){ const q = Math.hypot(x - 200, y - 200); if (q > r) r = q; }
    return { r, reach: bodyReach(T, t, par ? 1.25 : 1) };
  }

  /* what the 3D models share with the flat art: colours and looks */
  const look3d = { CHEF_LOOK, SCOOP_COLORS, SPRINKLES, CH_LIGHT, CH_DARK, CH_WOOD, CH_EBONY, FOOT, PIECE_HALF, BODY, mixHex, shade, glOn, dominant,
    STICK_PAL, chopStyle, chopShut, chopJab, SEAT_RING, SAUCE_COL, susanSeats,
    circle, ell, rr, fillStroke, star, musicNote, lowFx: () => typeof lowFx === 'function' && lowFx() };
  return { look3d, registerLook, lookOf, skinBodyNow, beginFrame, drawShadows, clearIcons, measureBody, chefPortrait, drawPest, drawAirShadow, drawTower, drawFlyer, drawDrones, drawMinion, drawProj, drawObject, drawLob, drawPuddle, drawCloud, drawLoaf, drawFx, drawPart, drawTornado, drawTrap, drawWhirl, drawStorm, drawOrb, drawPile, drawLeap, drawQueenlet, drawBoard, towerIcon, pestIcon, abilityIcon, abilityLook, abilityColor, powerIcon, powerColor, crateIcon, drawPowerTrap, setScale, star, skinSwatch,
    drawMark, drawParaFloor, drawParaMeters, drawIce, undeadSprite };
})();
