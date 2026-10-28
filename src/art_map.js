'use strict';
/* =====================================================================
   Kitchen Siege — drawing helpers and map backgrounds
   ===================================================================== */
function mkCanvas(w, h){ const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function hexToRgb(h){ h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(hex, amt){
  const [r, g, b] = hexToRgb(hex);
  const f = amt < 0 ? 0 : 255, t = Math.abs(amt);
  return 'rgb(' + Math.round(r + (f - r) * t) + ',' + Math.round(g + (f - g) * t) + ',' + Math.round(b + (f - b) * t) + ')';
}
function rgba(hex, a){ const [r, g, b] = hexToRgb(hex); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; }
function rr(g, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function circle(g, x, y, r){ g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); }
function ell(g, x, y, rx, ry, rot){ g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
function strokePolyline(g, pts){ g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); }
function fillStroke(g, fill, stroke, lw){ if (fill){ g.fillStyle = fill; g.fill(); } if (stroke){ g.strokeStyle = stroke; g.lineWidth = lw || 1; g.stroke(); } }

const MapArt = (() => {
  const THEME = {
    block:   { border:'#1d5543', shadow:'rgba(60,30,8,0.28)' },
    diner:   { border:'#5e161c', shadow:'rgba(0,0,0,0.35)' },
    pantry:  { border:'#7d5a2c', shadow:'rgba(0,0,0,0.35)' },
    freezer: { border:'#2a3a44', shadow:'rgba(20,40,60,0.35)' },
  };

  function strokePaths(g, paths, width, color, dash){
    g.save();
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.lineWidth = width; g.strokeStyle = color;
    if (dash) g.setLineDash(dash);
    g.beginPath();
    for (const pts of paths) pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.stroke();
    g.restore();
  }
  function maskedLayer(k, paths, width, paint){
    const c = mkCanvas(W * k, H * k), g = c.getContext('2d');
    g.scale(k, k);
    paint(g);
    g.globalCompositeOperation = 'destination-in';
    strokePaths(g, paths, width, '#000');
    return c;
  }

  /* ---------- backgrounds ---------- */
  function bgBlock(g, rnd){
    g.fillStyle = '#d7a466'; g.fillRect(0, 0, W, H);
    const tones = ['#e0b072', '#d39c5c', '#dbaa6c', '#cc955a', '#e5bb80', '#d5a263', '#dca46a'];
    let x = 0;
    while (x < W){
      const w = 26 + rnd() * 22;
      g.fillStyle = tones[Math.floor(rnd() * tones.length)];
      g.fillRect(x, 0, w + 1, H);
      for (let i = 0; i < 6; i++){
        const gx = x + 2 + rnd() * (w - 4), amp = 0.6 + rnd() * 2.2, ph = rnd() * 6, fr = 0.006 + rnd() * 0.01;
        g.strokeStyle = 'rgba(110,62,24,' + (0.07 + rnd() * 0.09) + ')';
        g.lineWidth = 0.6 + rnd() * 0.9;
        g.beginPath(); g.moveTo(gx, 0);
        for (let y = 0; y <= H; y += 20) g.lineTo(gx + Math.sin(y * fr + ph) * amp, y);
        g.stroke();
      }
      let jy = rnd() * 220;
      while (jy < H){ g.fillStyle = 'rgba(90,50,20,0.16)'; g.fillRect(x, jy, w, 1.5); g.fillStyle = 'rgba(255,235,200,0.18)'; g.fillRect(x, jy + 1.5, w, 1); jy += 160 + rnd() * 140; }
      g.fillStyle = 'rgba(80,45,15,0.25)'; g.fillRect(x, 0, 1, H);
      x += w;
    }
    for (let i = 0; i < 55; i++){
      const cx = rnd() * W, cy = rnd() * H, len = 8 + rnd() * 26, a = rnd() * Math.PI;
      g.strokeStyle = 'rgba(255,242,220,' + (0.15 + rnd() * 0.2) + ')'; g.lineWidth = 0.7;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); g.stroke();
    }
  }
  function matTexture(g){
    g.fillStyle = '#2e7a61'; g.fillRect(0, 0, W, H);
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(255,255,255,0.10)';
    for (let x = 0; x < W; x += 12){ g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
    for (let y = 0; y < H; y += 12){ g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.07)';
    for (let d = -H; d < W; d += 96){ g.beginPath(); g.moveTo(d, 0); g.lineTo(d + H, H); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.26)';
    for (let x = 0; x < W; x += 60){ g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
    for (let y = 0; y < H; y += 60){ g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.42)'; g.font = '600 8px "Barlow Condensed", sans-serif';
    for (let x = 60; x < W; x += 60) for (let y = 60; y < H; y += 60) g.fillText(String(x / 60), x + 2, y - 2);
  }
  function bgDiner(g, rnd){
    const s = 40;
    for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s){
      const dark = ((x / s + y / s) % 2) === 1;
      const v = (rnd() - 0.5) * 10;
      g.fillStyle = dark ? 'rgb(' + (36 + v) + ',' + (50 + v) + ',' + (58 + v) + ')' : 'rgb(' + (240 + v) + ',' + (236 + v) + ',' + (226 + v) + ')';
      g.fillRect(x, y, s, s);
      if (!dark && rnd() < 0.18){ g.fillStyle = 'rgba(160,140,110,0.08)'; g.fillRect(x + rnd() * 20, y + rnd() * 20, 8 + rnd() * 10, 3 + rnd() * 6); }
    }
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
    for (let x = 0; x <= W; x += s){ g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
    for (let y = 0; y <= H; y += s){ g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
    const lg = g.createLinearGradient(0, 0, W, H);
    lg.addColorStop(0, 'rgba(255,255,255,0.10)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.12)');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
  }
  function runnerTexture(g){
    g.fillStyle = '#b8323a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(80,0,10,0.16)'; g.lineWidth = 1;
    for (let d = -H; d < W; d += 6){ g.beginPath(); g.moveTo(d, 0); g.lineTo(d + H, H); g.stroke(); }
    g.strokeStyle = 'rgba(255,200,200,0.06)';
    for (let d = 0; d < W + H; d += 9){ g.beginPath(); g.moveTo(d, 0); g.lineTo(d - H, H); g.stroke(); }
  }
  function bgPantry(g, rnd){
    g.fillStyle = '#4e321e'; g.fillRect(0, 0, W, H);
    const ph = 85;
    for (let y = -20; y < H; y += ph){
      const lg = g.createLinearGradient(0, y, 0, y + ph);
      lg.addColorStop(0, '#94613a'); lg.addColorStop(1, '#7a4d2b');
      g.fillStyle = lg; g.fillRect(0, y + 5, W, ph - 10);
      for (let i = 0; i < 9; i++){
        const gy = y + 8 + rnd() * (ph - 18);
        g.strokeStyle = 'rgba(60,32,14,' + (0.12 + rnd() * 0.12) + ')'; g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(0, gy);
        for (let x = 0; x <= W; x += 30) g.lineTo(x, gy + Math.sin(x * 0.01 + i) * 1.5);
        g.stroke();
      }
      g.fillStyle = 'rgba(205,160,110,0.55)'; g.fillRect(0, y + 5, W, 2);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + ph - 6, W, 5);
      for (let x = 60 + rnd() * 80; x < W; x += 180 + rnd() * 140){ g.fillStyle = 'rgba(40,24,10,0.5)'; circle(g, x, y + ph / 2, 2.2); g.fill(); }
    }
  }
  function kraftTexture(g, rnd){
    g.fillStyle = '#d0ab70'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++){
      const x = rnd() * W, y = rnd() * H, a = rnd() * Math.PI, l = 2 + rnd() * 5;
      g.strokeStyle = rnd() < 0.5 ? 'rgba(120,80,40,0.16)' : 'rgba(255,240,210,0.16)'; g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  }
  function bgFreezer(g, rnd){
    g.fillStyle = '#a3b9c6'; g.fillRect(0, 0, W, H);
    const s = 22;
    for (let y = 0; y < H + s; y += s) for (let x = 0; x < W + s; x += s){
      const flip = ((x / s + y / s) % 2) === 0;
      const ox = x + (y / s % 2 ? s / 2 : 0);
      g.save(); g.translate(ox, y); g.rotate(flip ? Math.PI / 4 : -Math.PI / 4);
      g.fillStyle = 'rgba(70,95,110,0.35)'; rr(g, -6, -1.2, 12, 3.6, 1.8); g.fill();
      g.fillStyle = 'rgba(235,245,250,0.6)'; rr(g, -6, -2.4, 12, 3, 1.5); g.fill();
      g.restore();
    }
    for (let i = 0; i < 900; i++){ g.fillStyle = 'rgba(255,255,255,' + (0.2 + rnd() * 0.5) + ')'; circle(g, rnd() * W, rnd() * H, rnd() * 1.4); g.fill(); }
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]){
      const rg = g.createRadialGradient(cx, cy, 10, cx, cy, 330);
      rg.addColorStop(0, 'rgba(255,255,255,0.75)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
  }
  function gratingTexture(g){
    g.fillStyle = '#4b6170'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 10) for (let x = 0; x < W; x += 10){
      g.fillStyle = '#22303a'; g.fillRect(x + 2, y + 2, 6, 6);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + 2, y + 8, 6, 1);
    }
  }

  /* ---------- decorations ---------- */
  function shadowBlob(g, x, y, rx, ry){ g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, x, y, rx, ry); g.fill(); }
  function deco(g, d, rnd){
    switch (d.k){
      case 'board': {
        g.fillStyle = 'rgba(70,35,10,0.25)'; rr(g, d.x + 4, d.y + 6, d.w, d.h, 12); g.fill();
        rr(g, d.x, d.y, d.w, d.h, 12); fillStroke(g, '#c18a50', '#8d5a2b', 2);
        g.save(); rr(g, d.x, d.y, d.w, d.h, 12); g.clip();
        for (let i = 0; i < 9; i++){ g.strokeStyle = 'rgba(120,70,30,0.18)'; g.beginPath(); const yy = d.y + 6 + i * (d.h / 9); g.moveTo(d.x, yy); g.bezierCurveTo(d.x + d.w * 0.3, yy + 3, d.x + d.w * 0.6, yy - 3, d.x + d.w, yy + 1); g.stroke(); }
        g.restore();
        rr(g, d.x + 9, d.y + 9, d.w - 18, d.h - 18, 8); g.strokeStyle = 'rgba(110,60,20,0.45)'; g.lineWidth = 2; g.stroke();
        circle(g, d.x + d.w - 16, d.y + 16, 6); fillStroke(g, '#7a4a20', '#5e3714', 1);
        // a sliced tomato on the board
        circle(g, d.x + d.w * 0.38, d.y + d.h * 0.52, 15); fillStroke(g, '#e2453c', '#a5241e', 1.5);
        circle(g, d.x + d.w * 0.38, d.y + d.h * 0.52, 10); g.fillStyle = '#f07a5f'; g.fill();
        for (let i = 0; i < 4; i++){ const a = i / 4 * TAU + 0.4; ell(g, d.x + d.w * 0.38 + Math.cos(a) * 5.5, d.y + d.h * 0.52 + Math.sin(a) * 5.5, 2.4, 1.4, a); g.fillStyle = '#f6d36b'; g.fill(); }
        circle(g, d.x + d.w * 0.62, d.y + d.h * 0.5, 13); fillStroke(g, '#e2453c', '#a5241e', 1.5);
        circle(g, d.x + d.w * 0.62, d.y + d.h * 0.5, 9); g.fillStyle = '#f07a5f'; g.fill();
        break;
      }
      case 'lemons': {
        shadowBlob(g, d.x + 4, d.y + 6, d.r, d.r * 0.9);
        circle(g, d.x, d.y, d.r); fillStroke(g, '#eaf1f2', '#9fb3b8', 2);
        circle(g, d.x, d.y, d.r - 5); fillStroke(g, '#d9e5e8', null);
        const ls = [[-9, -6], [8, -8], [0, 8], [-11, 9], [11, 7]];
        for (const [lx, ly] of ls){ ell(g, d.x + lx, d.y + ly, 9, 7, rnd()); fillStroke(g, '#f5d23c', '#c9a51c', 1.2); ell(g, d.x + lx - 2, d.y + ly - 2, 3, 2); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); }
        ell(g, d.x + 14, d.y - 14, 7, 3, -0.6); fillStroke(g, '#4f9a45', '#2f6d2a', 1);
        break;
      }
      case 'pin': {
        g.fillStyle = 'rgba(70,35,10,0.25)'; rr(g, d.x + 4, d.y + 6, d.w, d.h, d.h / 2); g.fill();
        rr(g, d.x, d.y + 6, 30, d.h - 12, 5); fillStroke(g, '#9a6534', '#6e4320', 1.5);
        rr(g, d.x + d.w - 30, d.y + 6, 30, d.h - 12, 5); fillStroke(g, '#9a6534', '#6e4320', 1.5);
        rr(g, d.x + 26, d.y, d.w - 52, d.h, d.h / 2); fillStroke(g, '#e6c592', '#b58d55', 1.5);
        g.fillStyle = 'rgba(255,255,255,0.35)'; rr(g, d.x + 32, d.y + 4, d.w - 64, 5, 2.5); g.fill();
        break;
      }
      case 'garlic': {
        shadowBlob(g, d.x + 3, d.y + 5, d.r, d.r * 0.85);
        for (let i = 0; i < 6; i++){ const a = i / 6 * TAU; ell(g, d.x + Math.cos(a) * 7, d.y + Math.sin(a) * 7, 9, 7, a); fillStroke(g, '#f4eee6', '#c9b7c9', 1); }
        circle(g, d.x, d.y, 6); fillStroke(g, '#efe6ef', '#b9a4ba', 1);
        circle(g, d.x, d.y, 2); g.fillStyle = '#a58c6a'; g.fill();
        break;
      }
      case 'salt': {
        shadowBlob(g, d.x + 3, d.y + 5, d.r, d.r * 0.8);
        circle(g, d.x, d.y, d.r); fillStroke(g, 'rgba(235,245,250,0.85)', '#9fb1b8', 1.5);
        circle(g, d.x, d.y, d.r - 4); fillStroke(g, '#c8d2d6', '#8a989e', 1);
        for (let i = 0; i < 5; i++){ const a = i / 5 * TAU; circle(g, d.x + Math.cos(a) * 4, d.y + Math.sin(a) * 4, 1.1); g.fillStyle = '#4a575c'; g.fill(); }
        break;
      }
      case 'herbs': {
        for (let i = 0; i < 9; i++){ const a = rnd() * TAU, r = rnd() * d.r; ell(g, d.x + Math.cos(a) * r, d.y + Math.sin(a) * r, 4.5, 2, rnd() * TAU); g.fillStyle = rnd() < 0.5 ? '#4f9a45' : '#3c7d36'; g.fill(); }
        break;
      }
      case 'flour': {
        for (let i = 0; i < 90; i++){ const a = rnd() * TAU, r = Math.pow(rnd(), 0.7) * d.r; circle(g, d.x + Math.cos(a) * r, d.y + Math.sin(a) * r, 0.6 + rnd() * 2.2); g.fillStyle = 'rgba(255,253,245,' + (0.25 + rnd() * 0.45) + ')'; g.fill(); }
        break;
      }
      case 'stool': {
        shadowBlob(g, d.x + 4, d.y + 6, d.r + 2, d.r * 0.9);
        circle(g, d.x, d.y, d.r); fillStroke(g, '#c9d2d6', '#8e9aa0', 2);
        circle(g, d.x, d.y, d.r - 4); fillStroke(g, '#d6403f', '#9e2526', 1.5);
        for (let i = 0; i < 6; i++){ const a = i / 6 * TAU; g.strokeStyle = 'rgba(120,10,10,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x + Math.cos(a) * (d.r - 5), d.y + Math.sin(a) * (d.r - 5)); g.stroke(); }
        circle(g, d.x, d.y, 2.5); g.fillStyle = '#7e1c1d'; g.fill();
        ell(g, d.x - 5, d.y - 6, 6, 3, -0.5); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
        break;
      }
      case 'booth': {
        g.fillStyle = 'rgba(0,0,0,0.3)'; rr(g, d.x + 5, d.y + 7, d.w, d.h, 10); g.fill();
        rr(g, d.x, d.y, d.w, 30, 10); fillStroke(g, '#c9363a', '#7e1c1d', 2);
        rr(g, d.x, d.y + d.h - 30, d.w, 30, 10); fillStroke(g, '#c9363a', '#7e1c1d', 2);
        for (let i = 1; i < 4; i++){ g.strokeStyle = 'rgba(80,0,0,0.3)'; g.beginPath(); g.moveTo(d.x + i * d.w / 4, d.y + 4); g.lineTo(d.x + i * d.w / 4, d.y + 26); g.moveTo(d.x + i * d.w / 4, d.y + d.h - 26); g.lineTo(d.x + i * d.w / 4, d.y + d.h - 4); g.stroke(); }
        rr(g, d.x + 10, d.y + 34, d.w - 20, d.h - 68, 6); fillStroke(g, '#f2efe6', '#aeb6ba', 3);
        circle(g, d.x + d.w * 0.35, d.y + d.h / 2, 10); fillStroke(g, '#ffffff', '#c9cfd2', 1);
        circle(g, d.x + d.w * 0.35, d.y + d.h / 2, 6); g.fillStyle = '#7a4a22'; g.fill();
        rr(g, d.x + d.w * 0.58, d.y + d.h / 2 - 9, 26, 18, 3); fillStroke(g, '#f6e3b0', '#c9a96b', 1);
        break;
      }
      case 'jukebox': {
        g.fillStyle = 'rgba(0,0,0,0.3)'; rr(g, d.x + 5, d.y + 7, d.w, d.h, 18); g.fill();
        rr(g, d.x, d.y, d.w, d.h, 18); fillStroke(g, '#6b3d1f', '#3e2210', 2);
        const cols = ['#ff5a4e', '#ffd166', '#7ee0c3', '#7fb3ff'];
        cols.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.arc(d.x + d.w / 2, d.y + d.h * 0.48, d.w / 2 - 8 - i * 6, Math.PI, TAU); g.stroke(); });
        rr(g, d.x + 12, d.y + d.h * 0.56, d.w - 24, d.h * 0.32, 6); fillStroke(g, '#2a2f33', '#111', 1);
        for (let i = 0; i < 4; i++){ g.fillStyle = cols[i]; g.fillRect(d.x + 18 + i * 13, d.y + d.h * 0.62, 8, 5); }
        break;
      }
      case 'jar': {
        shadowBlob(g, d.x + 4, d.y + 6, d.r + 1, d.r * 0.85);
        circle(g, d.x, d.y, d.r); fillStroke(g, 'rgba(225,240,245,0.55)', 'rgba(140,170,180,0.9)', 2);
        circle(g, d.x, d.y, d.r - 5); g.fillStyle = d.c || '#e0773a'; g.fill();
        for (let i = 0; i < 10; i++){ circle(g, d.x + (rnd() - 0.5) * d.r, d.y + (rnd() - 0.5) * d.r, 1.5 + rnd() * 2); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill(); }
        circle(g, d.x, d.y, d.r - 1); g.strokeStyle = '#c9a54a'; g.lineWidth = 3; g.stroke();
        ell(g, d.x - d.r * 0.35, d.y - d.r * 0.4, d.r * 0.3, d.r * 0.14, -0.7); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill();
        break;
      }
      case 'can': {
        shadowBlob(g, d.x + 4, d.y + 6, d.r + 1, d.r * 0.85);
        circle(g, d.x, d.y, d.r); fillStroke(g, '#c7d0d4', '#7f8b90', 2);
        circle(g, d.x, d.y, d.r - 4); g.strokeStyle = '#98a5aa'; g.lineWidth = 1.5; g.stroke();
        circle(g, d.x, d.y, d.r - 8); g.strokeStyle = '#a9b4b8'; g.lineWidth = 1; g.stroke();
        rr(g, d.x - 7, d.y - 3, 14, 6, 3); fillStroke(g, '#dfe5e8', '#7f8b90', 1);
        break;
      }
      case 'box': {
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(d.x + 5, d.y + 6, d.w, d.h);
        g.fillStyle = '#f2c14e'; g.fillRect(d.x, d.y, d.w, d.h);
        g.fillStyle = '#e2383f'; g.fillRect(d.x, d.y, d.w, 12);
        g.fillStyle = '#ffffff'; g.font = '700 10px "Barlow Condensed", sans-serif'; g.fillText('CRUNCH-O', d.x + 6, d.y + 10);
        circle(g, d.x + d.w / 2, d.y + d.h / 2 + 6, 11); fillStroke(g, '#ffffff', '#c9a54a', 1);
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.strokeRect(d.x + 0.5, d.y + 0.5, d.w, d.h);
        break;
      }
      case 'sack': {
        shadowBlob(g, d.x + 4, d.y + 6, d.r + 2, d.r * 0.9);
        circle(g, d.x, d.y, d.r); fillStroke(g, '#c9ad7f', '#8d7246', 2);
        for (let i = -d.r; i < d.r; i += 4){ g.strokeStyle = 'rgba(110,80,40,0.25)'; g.beginPath(); g.moveTo(d.x + i, d.y - d.r); g.lineTo(d.x + i, d.y + d.r); g.stroke(); }
        circle(g, d.x, d.y - 4, 7); fillStroke(g, '#b49465', '#7d6136', 1.5);
        g.fillStyle = '#5e4a2b'; g.font = '700 9px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.fillText('FLOUR', d.x, d.y + 14); g.textAlign = 'start';
        break;
      }
      case 'crate': {
        g.fillStyle = 'rgba(20,40,60,0.3)'; g.fillRect(d.x + 6, d.y + 7, d.w, d.h);
        g.fillStyle = '#a57d55'; g.fillRect(d.x, d.y, d.w, d.h);
        g.strokeStyle = '#6f5234'; g.lineWidth = 2; g.strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2);
        for (let i = 1; i < 4; i++){ g.fillStyle = 'rgba(80,55,30,0.4)'; g.fillRect(d.x, d.y + i * d.h / 4, d.w, 1.5); }
        g.strokeStyle = '#6f5234'; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x + d.w, d.y + d.h); g.moveTo(d.x + d.w, d.y); g.lineTo(d.x, d.y + d.h); g.stroke();
        g.fillStyle = 'rgba(240,250,255,0.75)'; g.fillRect(d.x, d.y, d.w, 6);
        for (let i = 0; i < 30; i++){ circle(g, d.x + rnd() * d.w, d.y + rnd() * d.h, rnd() * 1.6); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill(); }
        break;
      }
      case 'peas': {
        g.fillStyle = 'rgba(20,40,60,0.3)'; rr(g, d.x + 5, d.y + 6, d.w, d.h, 10); g.fill();
        rr(g, d.x, d.y, d.w, d.h, 10); fillStroke(g, '#3f9a52', '#24663a', 2);
        for (let i = 0; i < 26; i++){ circle(g, d.x + 12 + rnd() * (d.w - 24), d.y + 12 + rnd() * (d.h - 24), 4); fillStroke(g, '#86d26f', '#4c9c3f', 1); }
        rr(g, d.x + d.w / 2 - 34, d.y + d.h / 2 - 9, 68, 18, 4); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
        g.fillStyle = '#24663a'; g.font = '700 11px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.fillText('FROZEN PEAS', d.x + d.w / 2, d.y + d.h / 2 + 4); g.textAlign = 'start';
        break;
      }
      case 'pillar': {
        shadowBlob(g, d.x + 5, d.y + 7, d.r + 2, d.r * 0.9);
        circle(g, d.x, d.y, d.r); fillStroke(g, 'rgba(210,240,255,0.9)', '#8fc3dc', 2);
        for (let i = 0; i < 6; i++){ const a = i / 6 * TAU; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x + Math.cos(a) * d.r * 0.8, d.y + Math.sin(a) * d.r * 0.8); g.stroke(); }
        ell(g, d.x - 9, d.y - 10, 8, 4, -0.6); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
        break;
      }
      case 'frost': {
        for (let i = 0; i < 70; i++){ const a = rnd() * TAU, r = Math.pow(rnd(), 0.6) * d.r; circle(g, d.x + Math.cos(a) * r, d.y + Math.sin(a) * r, 0.8 + rnd() * 2.4); g.fillStyle = 'rgba(255,255,255,' + (0.3 + rnd() * 0.5) + ')'; g.fill(); }
        break;
      }
    }
  }

  /* ---------- water: where boats and subs float ---------- */
  function waterShape(g, w, grow){
    grow = grow || 0;
    if (w.rx){ ell(g, w.x, w.y, w.rx + grow, w.ry + grow); return; }
    rr(g, w.x - grow, w.y - grow, w.w + grow * 2, w.h + grow * 2, (w.r || 0) + grow);
  }
  /* an irregular spill outline around an ellipse (never more than ~5% outside it) */
  function blob(g, w, seed, grow, wob){
    const n = 48, a = seed * 1.7, b = seed * 3.1;
    g.beginPath();
    for (let i = 0; i <= n; i++){
      const an = i / n * TAU, k = 1 - wob + Math.sin(an * 3 + a) * wob * 0.6 + Math.sin(an * 5 + b) * wob * 0.4;
      const x = w.x + Math.cos(an) * (w.rx * k + grow), y = w.y + Math.sin(an) * (w.ry * k + grow);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
  }
  /* the water, flat; with solid set, the parts made in 3D (a sink's rim and taps, a tipped cup, ice) are left out */
  function drawWater(g, w, i, solid){
    const rnd = mulberry32(911 + i * 37 + Math.round(w.x));
    switch (w.style){
      case 'sink': {
        const R = w.rim || 10, cx = w.x + w.w / 2;
        if (!solid){
          g.fillStyle = 'rgba(0,0,0,0.28)'; rr(g, w.x - R + 4, w.y - R + 6, w.w + R * 2, w.h + R * 2, (w.r || 0) + R); g.fill();
          const lg = g.createLinearGradient(w.x - R, w.y - R, w.x + w.w + R, w.y + w.h + R);
          lg.addColorStop(0, '#f4f8fa'); lg.addColorStop(0.45, '#c3ced3'); lg.addColorStop(1, '#8e9ba1');
          rr(g, w.x - R, w.y - R, w.w + R * 2, w.h + R * 2, (w.r || 0) + R); fillStroke(g, lg, '#66747a', 1.5);
        }
        rr(g, w.x - 1, w.y - 1, w.w + 2, w.h + 2, (w.r || 0) + 1); g.fillStyle = '#6f7d83'; g.fill();
        const wg = g.createLinearGradient(0, w.y, 0, w.y + w.h);
        wg.addColorStop(0, '#7cc2e0'); wg.addColorStop(1, '#3f88b2');
        rr(g, w.x + 2, w.y + 2, w.w - 4, w.h - 4, Math.max(2, (w.r || 0) - 2)); g.fillStyle = wg; g.fill();
        /* the drain under the water */
        const dy = w.y + w.h - 30;
        circle(g, cx, dy, 10); fillStroke(g, 'rgba(60,80,92,0.55)', 'rgba(220,235,240,0.6)', 1.5);
        g.strokeStyle = 'rgba(30,45,55,0.55)'; g.lineWidth = 1.4; for (let k = -1; k <= 1; k++){ g.beginPath(); g.moveTo(cx - 6, dy + k * 3.2); g.lineTo(cx + 6, dy + k * 3.2); g.stroke(); }
        /* faucet and taps on the back rim */
        if (!solid){
          for (const [sx, c] of [[-26, '#e2383f'], [26, '#4f86c6']]){ circle(g, cx + sx, w.y - R * 0.45, 6); fillStroke(g, '#e8eef0', '#7f8b90', 1.2); circle(g, cx + sx, w.y - R * 0.45, 2.4); g.fillStyle = c; g.fill(); }
          rr(g, cx - 4, w.y - R - 2, 8, R + 30, 4); fillStroke(g, '#dfe7ea', '#7f8b90', 1.2);
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(cx - 2.5, w.y - R, 1.6, 24);
          circle(g, cx, w.y + 27, 3.6); fillStroke(g, '#c9d2d6', '#6b777c', 1);
        }
        /* soap suds in a corner */
        for (let k = 0; k < 9; k++){ circle(g, w.x + 14 + rnd() * 26, w.y + w.h - 14 - rnd() * 22, 2 + rnd() * 4); g.fillStyle = 'rgba(250,253,255,0.75)'; g.fill(); g.strokeStyle = 'rgba(190,215,230,0.8)'; g.lineWidth = 0.8; g.stroke(); }
        break;
      }
      case 'soda': {
        blob(g, w, 3, 6, 0.05); g.fillStyle = 'rgba(122,58,30,0.45)'; g.fill();
        blob(g, w, 3, 0, 0.05); g.fillStyle = '#4a1d12'; g.fill();
        blob(g, w, 3, -7, 0.05); g.fillStyle = '#5e2716'; g.fill();
        ell(g, w.x - w.rx * 0.25, w.y - w.ry * 0.35, w.rx * 0.38, w.ry * 0.12, -0.5); g.fillStyle = 'rgba(255,220,190,0.18)'; g.fill();
        for (let k = 0; k < 70; k++){ const an = rnd() * TAU, rr2 = 0.55 + rnd() * 0.4; circle(g, w.x + Math.cos(an) * w.rx * rr2, w.y + Math.sin(an) * w.ry * rr2, 0.6 + rnd() * 1.6); g.fillStyle = 'rgba(255,236,210,' + (0.25 + rnd() * 0.35) + ')'; g.fill(); }
        if (solid) break;
        for (const [ox, oy, r] of [[0.3, 0.25, 0.4], [-0.35, 0.45, -0.3]]){ g.save(); g.translate(w.x + ox * w.rx, w.y + oy * w.ry); g.rotate(r); rr(g, -7, -7, 14, 14, 3); fillStroke(g, 'rgba(225,245,255,0.55)', 'rgba(255,255,255,0.8)', 1); g.restore(); }
        /* the cup that tipped over */
        g.save(); g.translate(w.x - w.rx * 0.78, w.y - w.ry * 0.86); g.rotate(-0.7);
        g.fillStyle = 'rgba(0,0,0,0.25)'; rr(g, -14, -8, 30, 18, 4); g.fill();
        g.beginPath(); g.moveTo(-14, -9); g.lineTo(14, -6); g.lineTo(14, 6); g.lineTo(-14, 9); g.closePath(); fillStroke(g, '#f4efe6', '#b9b2a6', 1);
        g.save(); g.clip(); for (let k = -12; k < 16; k += 7){ g.fillStyle = '#e2383f'; g.fillRect(k, -10, 3.5, 20); } g.restore();
        ell(g, 14, 0, 2.6, 6.2); fillStroke(g, '#5e2716', '#b9b2a6', 1);
        g.strokeStyle = '#ffd166'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(12, 1); g.lineTo(24, 4); g.stroke();
        g.restore();
        break;
      }
      case 'puddle': {
        blob(g, w, 7, 5, 0.06); g.fillStyle = 'rgba(40,24,10,0.35)'; g.fill();
        blob(g, w, 7, 0, 0.06); g.fillStyle = 'rgba(96,160,198,0.92)'; g.fill();
        blob(g, w, 7, -9, 0.06); g.fillStyle = 'rgba(128,188,220,0.55)'; g.fill();
        ell(g, w.x - w.rx * 0.3, w.y - w.ry * 0.38, w.rx * 0.36, w.ry * 0.1, -0.3); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
        ell(g, w.x + w.rx * 0.35, w.y + w.ry * 0.3, w.rx * 0.18, w.ry * 0.06, -0.3); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fill();
        if (solid) break;
        /* the jug that leaked it */
        g.save(); g.translate(w.x + w.rx * 0.95, w.y + w.ry * 0.9); g.rotate(0.5);
        g.fillStyle = 'rgba(0,0,0,0.3)'; rr(g, -11, -9, 26, 22, 6); g.fill();
        rr(g, -13, -11, 24, 22, 6); fillStroke(g, 'rgba(225,240,248,0.85)', '#8fb3c4', 1.4);
        rr(g, -13, -2, 24, 13, 5); g.fillStyle = 'rgba(96,160,198,0.7)'; g.fill();
        rr(g, 9, -4, 7, 8, 2); fillStroke(g, '#4f86c6', '#2f5f8f', 1);
        g.restore();
        break;
      }
      case 'melt': {
        blob(g, w, 11, 8, 0.07); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill();
        blob(g, w, 11, 0, 0.07); g.fillStyle = '#8fcfe6'; g.fill();
        blob(g, w, 11, -10, 0.07); g.fillStyle = '#76bfdc'; g.fill();
        if (!solid) for (let k = 0; k < 4; k++){
          const an = rnd() * TAU, rr2 = 0.25 + rnd() * 0.45, x = w.x + Math.cos(an) * w.rx * rr2, y = w.y + Math.sin(an) * w.ry * rr2, r = 5 + rnd() * 6;
          g.beginPath(); for (let j = 0; j < 6; j++){ const a2 = j / 6 * TAU + rnd() * 0.5, q = r * (0.7 + rnd() * 0.4); j ? g.lineTo(x + Math.cos(a2) * q, y + Math.sin(a2) * q) : g.moveTo(x + Math.cos(a2) * q, y + Math.sin(a2) * q); } g.closePath();
          fillStroke(g, 'rgba(240,250,255,0.9)', 'rgba(150,200,225,0.9)', 1);
        }
        ell(g, w.x - w.rx * 0.3, w.y - w.ry * 0.4, w.rx * 0.3, w.ry * 0.08, -0.25); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
        break;
      }
    }
  }
  /* moving ripples and fizz, drawn over the background each frame */
  function waterFx(g, w, t){
    g.save();
    waterShape(g, w, w.rx ? -4 : -3); g.clip();
    const x0 = w.rx ? w.x - w.rx : w.x, y0 = w.rx ? w.y - w.ry : w.y, ww = w.rx ? w.rx * 2 : w.w, hh = w.rx ? w.ry * 2 : w.h;
    if (w.style === 'soda'){
      for (let i = 0; i < 14; i++){
        const k = (t * 0.35 + i * 0.137) % 1, x = x0 + ((i * 0.618) % 1) * ww + Math.sin(t * 2 + i) * 3, y = y0 + hh * (1 - k);
        circle(g, x, y, 1 + (i % 3) * 0.7); g.strokeStyle = 'rgba(255,236,210,' + (0.6 * Math.sin(k * Math.PI)).toFixed(3) + ')'; g.lineWidth = 0.8; g.stroke();
      }
    } else {
      g.strokeStyle = w.style === 'melt' ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.26)'; g.lineWidth = 1.5; g.lineCap = 'round';
      for (let i = 0; i < 7; i++){
        const y = y0 + ((i * 0.31 + t * 0.03) % 1) * hh, x = x0 + ((i * 0.57 + t * 0.012) % 1) * ww, len = 14 + (i % 3) * 8;
        g.beginPath(); g.moveTo(x - len / 2, y);
        g.quadraticCurveTo(x - len / 4, y - 2.5, x, y); g.quadraticCurveTo(x + len / 4, y + 2.5, x + len / 2, y); g.stroke();
      }
      if (w.style === 'sink'){
        /* a drip from the faucet every couple of seconds */
        const cx = w.x + w.w / 2, k = (t * 0.45) % 1, dy = w.y + 34;
        if (k < 0.2){ circle(g, cx, dy - 4 + k * 20, 1.8); g.fillStyle = 'rgba(220,245,255,0.9)'; g.fill(); }
        else { const q = (k - 0.2) / 0.8; ell(g, cx, dy + 2, 3 + q * 26, (3 + q * 26) * 0.6); g.strokeStyle = 'rgba(235,250,255,' + (0.7 * (1 - q)).toFixed(3) + ')'; g.lineWidth = 1.2; g.stroke(); }
      }
    }
    g.restore();
  }
  /* where water appliances can go, shown while placing one */
  function waterHint(g, w, t){
    g.save();
    waterShape(g, w, w.rx ? 2 : 1);
    g.fillStyle = 'rgba(127,211,255,' + (0.1 + Math.sin(t * 4) * 0.05).toFixed(3) + ')'; g.fill();
    g.strokeStyle = 'rgba(235,250,255,0.95)'; g.lineWidth = 2.5; g.setLineDash([8, 6]); g.lineDashOffset = -t * 20; g.stroke();
    g.restore();
  }

  /* entrance: a crack the pests crawl out of. exit: the pantry door. */
  function edgeOf(x, y){ if (x <= 0) return 'l'; if (x >= W) return 'r'; if (y <= 0) return 't'; return 'b'; }
  function entrance(g, pts){
    const [x0, y0] = pts[0], [x1, y1] = pts[1];
    const side = edgeOf(x0, y0);
    const ex = side === 'l' ? 0 : side === 'r' ? W : x1, ey = side === 't' ? 0 : side === 'b' ? H : y1;
    g.save(); g.translate(ex, ey);
    g.rotate({ l: 0, r: Math.PI, t: Math.PI / 2, b: -Math.PI / 2 }[side]);
    g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, 0, 3, 18, 34); g.fill();
    g.fillStyle = '#1a120d'; g.beginPath(); g.ellipse(0, 0, 14, 30, 0, -Math.PI / 2, Math.PI / 2); g.fill();
    g.fillStyle = '#3a2a1f'; g.beginPath(); g.ellipse(0, 0, 9, 22, 0, -Math.PI / 2, Math.PI / 2); g.fill();
    for (let i = 0; i < 10; i++){ circle(g, 14 + Math.random() * 30, (Math.random() - 0.5) * 30, 1 + Math.random() * 1.5); g.fillStyle = 'rgba(120,80,40,0.6)'; g.fill(); }
    g.restore();
  }
  function exitDoor(g, pts){
    const [x0, y0] = pts[pts.length - 1], [x1, y1] = pts[pts.length - 2];
    const side = edgeOf(x0, y0);
    const ex = side === 'l' ? 0 : side === 'r' ? W : x1, ey = side === 't' ? 0 : side === 'b' ? H : y1;
    g.save(); g.translate(ex, ey);
    g.rotate({ l: 0, r: Math.PI, t: Math.PI / 2, b: -Math.PI / 2 }[side]);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, -36, 22, 72);
    g.fillStyle = '#7a4a26'; g.fillRect(0, -34, 16, 68);
    g.fillStyle = '#9b6235'; g.fillRect(2, -31, 12, 62);
    g.strokeStyle = '#5a3418'; g.lineWidth = 1; g.strokeRect(2.5, -30.5, 11, 28); g.strokeRect(2.5, 2.5, 11, 28);
    circle(g, 12, 0, 2); g.fillStyle = '#f2c14e'; g.fill();
    g.restore();
    // label sign
    const lx = clamp(ex + (side === 'l' ? 40 : side === 'r' ? -40 : 0), 40, W - 40);
    const ly = clamp(ey + (side === 't' ? 40 : side === 'b' ? -40 : 0), 18, H - 18);
    const off = (side === 't' || side === 'b') ? 52 : 0;
    g.save(); g.translate(lx + off, ly + (side === 'l' || side === 'r' ? -50 : 0));
    rr(g, -30, -10, 60, 20, 5); fillStroke(g, '#fff6e3', '#7a4a26', 1.5);
    g.fillStyle = '#7a4a26'; g.font = '700 12px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PANTRY', 0, 1);
    g.restore();
  }

  /* light falling across the floor from the upper left, as it falls on the appliances */
  function floorLight(g){
    const lg = g.createRadialGradient(W * 0.12, -H * 0.25, 60, W * 0.12, -H * 0.25, W * 1.2);
    lg.addColorStop(0, 'rgba(255,247,228,0.2)'); lg.addColorStop(0.55, 'rgba(255,247,228,0.05)'); lg.addColorStop(1, 'rgba(255,247,228,0)');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
  }
  /* how thick each kitchen's trail is in 3D: a cutting mat, a runner, a strip of paper, a steel walkway */
  const TRAIL_T = { block: 2.5, diner: 3, pantry: 1.6, freezer: 4 };
  /* render(id, k): the map's background at scale k. In 3D its props are models; with opt.split they are left out of
     the picture and listed on it (canvas.props, back to front) to be drawn among the appliances. */
  function render(mapId, k, opt){
    opt = opt || {};
    const M = MAPS[mapId];
    const rnd = mulberry32(MAP_ORDER.indexOf(mapId) * 977 + 31);
    const c = mkCanvas(W * k, H * k), g = c.getContext('2d');
    g.scale(k, k);
    const th = THEME[M.theme];
    /* the props in 3D, each a picture of its own (any that can't be made are drawn flat) */
    const d3 = typeof PROPS3D !== 'undefined' && PROPS3D.on();
    const solidPic = new Map(), waterPics = [], pics = [];
    if (d3){
      for (const d of M.deco) if (d.solid){ const p = PROPS3D.deco(k, d); if (p){ solidPic.set(d, p); pics.push(p); } }
      (M.water || []).forEach((w, i) => { const ps = PROPS3D.water(k, w, i); waterPics[i] = ps; if (ps) for (const p of ps) if (!p.under) pics.push(p); });
      PROPS3D.done();
    }
    if (M.theme === 'block') bgBlock(g, rnd);
    else if (M.theme === 'diner') bgDiner(g, rnd);
    else if (M.theme === 'pantry') bgPantry(g, rnd);
    else bgFreezer(g, rnd);
    if (d3) floorLight(g);
    for (const d of M.deco) if (!d.solid) deco(g, d, rnd);
    (M.water || []).forEach((w, i) => {
      const ps = waterPics[i];
      drawWater(g, w, i, !!ps);
      if (ps) for (const p of ps) if (p.under){ g.drawImage(p.shadow, p.x, p.y, p.w, p.h); g.drawImage(p.img, p.x, p.y, p.w, p.h); }
    });
    const paths = opt.reverse ? M.paths.map(p => p.slice().reverse()) : M.paths;
    if (d3){
      /* the trail has a little thickness: its shadow falls down and right, its front edge shows */
      const T = TRAIL_T[M.theme] || 2.5, wall = GL3D.ST * T;
      g.save(); g.translate(0.85 * T + 1, 0.34 * GL3D.CT * T + wall + 1.5); strokePaths(g, paths, PATH_W + 9, th.shadow); g.restore();
      if (M.theme === 'freezer') strokePaths(g, paths, PATH_W + 16, 'rgba(235,248,255,0.5)');
      g.save(); g.translate(0, wall); strokePaths(g, paths, PATH_W + 6, shade(th.border, -0.4)); g.restore();
      g.save(); g.translate(-0.9, -0.9); strokePaths(g, paths, PATH_W + 6, 'rgba(255,255,255,0.32)'); g.restore();
    } else {
      g.save(); g.translate(3, 5); strokePaths(g, paths, PATH_W + 10, th.shadow); g.restore();
      if (M.theme === 'freezer') strokePaths(g, paths, PATH_W + 16, 'rgba(235,248,255,0.5)');
    }
    strokePaths(g, paths, PATH_W + 6, th.border);
    if (M.theme === 'block') g.drawImage(maskedLayer(k, paths, PATH_W, matTexture), 0, 0, W, H);
    else if (M.theme === 'diner'){
      strokePaths(g, paths, PATH_W, '#b8323a');
      strokePaths(g, paths, PATH_W - 10, '#e8b54a');
      g.drawImage(maskedLayer(k, paths, PATH_W - 15, runnerTexture), 0, 0, W, H);
    } else if (M.theme === 'pantry'){
      g.drawImage(maskedLayer(k, paths, PATH_W, g2 => kraftTexture(g2, mulberry32(7))), 0, 0, W, H);
      strokePaths(g, paths, 2, 'rgba(120,85,40,0.55)', [10, 9]);
    } else {
      g.drawImage(maskedLayer(k, paths, PATH_W, gratingTexture), 0, 0, W, H);
      strokePaths(g, paths, PATH_W + 2, 'rgba(230,246,255,0.35)', [2, 7]);
    }
    for (const d of M.deco) if (d.solid && !solidPic.has(d)) deco(g, d, rnd);
    for (const p of pics) g.drawImage(p.shadow, p.x, p.y, p.w, p.h);
    pics.sort((a, b) => a.sy - b.sy);
    if (opt.split) c.props = pics;
    else for (const p of pics) g.drawImage(p.img, p.x, p.y, p.w, p.h);
    for (const pts of paths){ entrance(g, pts); exitDoor(g, pts); }
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.22)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    return c;
  }
  return { render, waterFx, waterHint };
})();
