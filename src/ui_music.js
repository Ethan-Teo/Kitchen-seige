'use strict';
/* =====================================================================
   Kitchen Siege — music
   A little kitchen-radio tune, played by the browser's synth so nothing
   is downloaded: a walking bass, brushed hi-hat, soft chords and a
   melody that picks its phrases from a small book, so the loop never
   plays quite the same way twice. Three moods: the menu hums quietly,
   a game swings, and a boss round turns minor and urgent.
   ===================================================================== */
const Music = (() => {
  let ctx = null, out = null, timer = null, next = 0, beat = 0, mood = 'menu', bar = 0;
  const BPM = { menu: 96, game: 118, boss: 132 };
  /* chords by mood: [root midi, intervals] for each bar of a four-bar loop */
  const PROG = {
    menu: [[60, [0, 4, 7, 11]], [57, [0, 3, 7, 10]], [65, [0, 4, 7, 11]], [67, [0, 4, 7, 10]]],
    game: [[60, [0, 4, 7, 9]], [69, [0, 3, 7, 10]], [65, [0, 4, 7, 9]], [67, [0, 4, 7, 10]]],
    boss: [[57, [0, 3, 7, 10]], [57, [0, 3, 7, 10]], [65, [0, 4, 7, 11]], [64, [0, 4, 7, 10]]],
  };
  /* melody phrases: scale steps per eighth note (null is a rest) */
  const PHRASES = {
    menu: [[0, null, 2, null, 4, null, 2, null], [4, null, null, 5, 4, null, 2, null], [null, null, 0, null, null, null, null, null], [2, null, 4, null, 7, null, null, null]],
    game: [[0, 2, 4, null, 7, null, 4, 2], [4, 5, 4, 2, 0, null, null, null], [7, null, 9, 7, 4, null, 2, 4], [0, null, 0, 2, 4, 2, 0, null], [null, 4, null, 4, 5, 7, null, null]],
    boss: [[0, 0, 3, null, 0, 0, 2, null], [7, null, 6, 5, 3, null, 0, null], [0, 3, 5, 6, 5, 3, 0, null], [null, 10, null, 7, null, 6, null, 5]],
  };
  const SCALE = { menu: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17], game: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17], boss: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17] };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function on(){ return !!(Profile.settings.sound && Profile.settings.music !== false); }
  function vol(){ return on() ? Profile.settings.volume * 0.32 : 0; }
  function ensure(){
    if (ctx) return ctx;
    ctx = Sfx.ctx();
    if (!ctx) return null;
    out = ctx.createGain(); out.gain.value = vol();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    out.connect(comp); comp.connect(ctx.destination);
    return ctx;
  }
  function voice(f, t0, dur, type, gain, cut, attack){
    const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    fl.type = 'lowpass'; fl.frequency.value = cut || 2400;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + (attack || 0.01)); g.gain.setValueAtTime(gain, t0 + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(fl); fl.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function hat(t0, gain){
    const s = ctx.createBufferSource(), b = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(out); s.start(t0);
  }
  let phrase = null, phraseAt = 0;
  /* one eighth note of the loop, scheduled at t0 */
  function schedule(i, t0){
    const spb = 60 / BPM[mood], e8 = spb / 2;
    const b = Math.floor(i / 8) % 4, step = i % 8, [root, ints] = PROG[mood][b];
    const swing = step % 2 ? e8 * 0.18 : 0;
    const t = t0 + swing;
    /* the bass walks: root, fifth, root, a step toward the next chord */
    if (step % 2 === 0){
      const walk = [0, 7, 0, 7, 12, 7, 0, 5][Math.floor(step / 2) + (b % 2) * 4] || 0;
      voice(hz(root - 12 + walk), t, e8 * 1.7, 'triangle', mood === 'menu' ? 0.16 : 0.22, 900);
    }
    /* chords on two and four, soft */
    if (step === 2 || step === 6) for (const k of ints) voice(hz(root + k), t, e8 * 1.4, 'square', mood === 'menu' ? 0.028 : 0.035, 1500, 0.03);
    /* hi-hat every eighth, louder on the off-beats */
    if (mood !== 'menu') hat(t, step % 2 ? 0.05 : 0.03);
    else if (step % 4 === 0) hat(t, 0.02);
    /* the melody: a new phrase every bar, rested now and then */
    if (step === 0){ phraseAt = i; phrase = (bar % 3 === 2 && mood !== 'boss') ? null : PHRASES[mood][Math.floor(Math.random() * PHRASES[mood].length)]; bar++; }
    if (phrase){
      const n = phrase[i - phraseAt];
      if (n != null) voice(hz(root + 12 + SCALE[mood][n]), t, e8 * 1.1, 'sine', mood === 'menu' ? 0.07 : 0.09, 3000, 0.015);
    }
  }
  function tick(){
    if (!ctx || ctx.state !== 'running') return;
    const spb = 60 / BPM[mood], e8 = spb / 2;
    while (next < ctx.currentTime + 0.4){
      schedule(beat, next);
      beat++; next += e8;
    }
  }
  function start(){
    if (timer || !ensure()) return;
    next = ctx.currentTime + 0.1; beat = 0; bar = 0;
    timer = setInterval(tick, 120);
  }
  function setMood(m){
    if (!PROG[m] || m === mood) return;
    mood = m;
    if (ctx){ next = Math.max(next, ctx.currentTime + 0.05); beat = 0; }
  }
  function setVolume(){ if (out) out.gain.setTargetAtTime(vol(), ctx.currentTime, 0.1); }
  function refresh(){ if (!ctx) Sfx.unlock(); setVolume(); }
  return { start, setMood, setVolume, refresh, get mood(){ return mood; } };
})();
