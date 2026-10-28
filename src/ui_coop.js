'use strict';
/* =====================================================================
   Kitchen Siege — co-op: the lobby, the two ways to connect, and the
   network loop.
   Inside Claude, the two players meet in a named room (a four-letter
   code); each one's latest message rides in their room presence. On the
   web (GitHub Pages, or the file opened locally), they connect directly
   with WebRTC: the host gives an invite code, the guest answers with a
   reply code, and the game runs over the data channel.
   ===================================================================== */
const COOP_STUN = [{ urls:'stun:stun.l.google.com:19302' }, { urls:'stun:stun1.l.google.com:19302' }];
const Net = { kind:null, send:null, close:null, onMsg:null, lastFrame:0, lastTowers:0, tPart:0, tParts:null, sig:'', room:null, pc:null, dc:null, peer:null, unsub:null, alive:false };

/* ---------------- codes for the WebRTC handshake ---------------- */
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
async function squeeze(text, prefix){
  const bytes = new TextEncoder().encode(text);
  if (typeof CompressionStream === 'function'){
    try { const buf = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer(); return prefix + 'z' + b64u(buf); } catch (e) {}
  }
  return prefix + 'p' + b64u(bytes);
}
async function unsqueeze(code, prefix){
  code = String(code || '').trim().replace(/\s+/g, '');
  if (!code.startsWith(prefix)) throw new Error('That code should start with ' + prefix);
  const mode = code[prefix.length], body = unb64u(code.slice(prefix.length + 1));
  if (mode === 'z'){
    if (typeof DecompressionStream !== 'function') throw new Error('This browser can’t read that code.');
    return await new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  }
  return new TextDecoder().decode(body);
}
function iceDone(pc, ms){
  return new Promise(res => {
    if (pc.iceGatheringState === 'complete') return res();
    const t = setTimeout(res, ms || 4000);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete'){ clearTimeout(t); res(); } });
  });
}
function rtcWire(dc){
  Net.dc = dc;
  dc.onopen = () => { Net.alive = true; coopConnected(); };
  dc.onclose = () => { Net.alive = false; coopLost(); };
  dc.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (Net.onMsg) Net.onMsg(m); };
  Net.send = m => { if (dc.readyState === 'open') try { dc.send(JSON.stringify(m)); } catch (e) {} };
  Net.close = () => { try { dc.close(); } catch (e) {} try { Net.pc.close(); } catch (e) {} };
}
async function rtcHostOffer(){
  const pc = new RTCPeerConnection({ iceServers: COOP_STUN });
  Net.pc = pc; Net.kind = 'rtc';
  rtcWire(pc.createDataChannel('ks', { ordered: true }));
  await pc.setLocalDescription(await pc.createOffer());
  await iceDone(pc);
  return squeeze(JSON.stringify({ t: pc.localDescription.type, s: pc.localDescription.sdp }), 'KSP1:');
}
async function rtcHostAccept(reply){
  const d = JSON.parse(await unsqueeze(reply, 'KSR1:'));
  await Net.pc.setRemoteDescription({ type: d.t, sdp: d.s });
}
async function rtcGuestAnswer(invite){
  const d = JSON.parse(await unsqueeze(invite, 'KSP1:'));
  const pc = new RTCPeerConnection({ iceServers: COOP_STUN });
  Net.pc = pc; Net.kind = 'rtc';
  pc.ondatachannel = ev => rtcWire(ev.channel);
  await pc.setRemoteDescription({ type: d.t, sdp: d.s });
  await pc.setLocalDescription(await pc.createAnswer());
  await iceDone(pc);
  return squeeze(JSON.stringify({ t: pc.localDescription.type, s: pc.localDescription.sdp }), 'KSR1:');
}

/* ---------------- a Claude room ---------------- */
async function roomApi(){
  const c = typeof window !== 'undefined' ? window.claude : null;
  if (!c || typeof c.use !== 'function') return null;
  try { return await c.use('room'); } catch (e) { return null; }
}
function roomCode(){ const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
async function roomOpen(code, role){
  const api = await roomApi();
  if (!api) throw new Error('Rooms aren’t available here.');
  const r = await api.join('ks-coop-' + code.toLowerCase());
  Net.room = r; Net.kind = 'room';
  const mine = role === 'host' ? 'host' : 'guest', theirs = role === 'host' ? 'guest' : 'host';
  let lastSeen = null;
  Net.unsub = r.onPeers(ch => {
    const p = ch.peers.find(x => !x.isMe && x.presence && x.presence.ks === theirs);
    if (!p){ if (Net.alive){ Net.alive = false; coopLost(); } return; }
    if (!Net.alive){ Net.alive = true; Net.peer = p.peer; coopConnected(); }
    const m = p.presence.m;
    if (m && m !== lastSeen){ lastSeen = m; if (Net.onMsg) Net.onMsg(m); }
  });
  Net.send = m => { r.presence({ ks: mine, m }).catch(() => {}); };
  Net.close = () => { try { Net.unsub && Net.unsub(); } catch (e) {} r.leave().catch(() => {}); };
  r.presence({ ks: mine, m: null }).catch(() => {});
  return r;
}

/* ---------------- the network loop ---------------- */
function coopNetTick(){
  if (!Coop.on || !Net.send || !Net.alive) return;
  const now = performance.now();
  if (coopHost()){
    /* the appliances: when they change, and every couple of seconds */
    const sig = G.towers.map(t => t.id + ':' + t.up.join('') + ':' + (t.own || 0) + ':' + t.tg + ':' + (t.paragon ? t.degree : 0) + ':' + (t.level || 0)).join('|');
    if (sig !== Net.sig){ Net.sig = sig; Coop.tv++; Net.tParts = null; }
    const room = Net.kind === 'room';
    if (!Net.tParts || Net.tParts[0].tv !== Coop.tv){ Net.tParts = coopTowerParts(room ? 3000 : 0); Net.tPart = 0; Net.towersDue = now; }
    const towersTurn = now >= Net.towersDue;
    if (now - Net.lastFrame < (room ? 70 : 60)) return;
    Net.lastFrame = now;
    if (towersTurn){
      Net.send(Net.tParts[Net.tPart]);
      Net.tPart++;
      if (Net.tPart >= Net.tParts.length){ Net.tPart = 0; Net.towersDue = now + (Net.resend > 0 ? 250 : 2000); Net.resend = Math.max(0, (Net.resend || 0) - 1); }
      return;
    }
    if (Net.lastTv !== Coop.tv){ Net.lastTv = Coop.tv; Net.resend = 2; }
    Net.send(coopFrame(room ? COOP_ENEMY_CAP_ROOM : 1500));
  } else if (coopGuest()){
    if (now - Net.lastFrame < 120 && !Coop.dirty) return;
    Net.lastFrame = now;
    Net.send(coopPacket());
  }
}
function coopNetMsg(m){
  if (!m || typeof m !== 'object') return;
  if (coopHost() && m.k === 'c') coopHostReceive(m);
  else if (coopGuest()){
    if (m.k === 't'){
      if (!UI.coopStarted) coopGuestBegin(m);
      if (coopApplyTowers(m) && UI.screen === 'game'){ buildShop(); buildAbilities(); updatePanel(true); }
    } else if (m.k === 'e' && UI.coopStarted) coopApplyFrame(m);
  }
}
Net.onMsg = coopNetMsg;
/* the guest's first look at the host's appliances also says which kitchen: set the puppet game up on it */
function coopGuestBegin(m){
  if (m.km) adoptKitchen(m.map, m.km);
  if (!MAPS[m.map]) return;
  closeModal();
  setupGame(m.map, DIFFS[m.diff] ? m.diff : 'medium', false, null, m.mode && MODES[m.mode] ? m.mode : 'standard');
  G.ptraps = [];
  UI.coopStarted = true;
  enterGame();
  toast('Connected to ' + Coop.names[0] + '’s kitchen. Your cash is yours; the lives are shared.', 'gold');
}
function coopConnected(){
  Sfx.play('rank');
  if (Net.role === 'host'){
    if (!G.active){ return; }
    coopHostStart(Net.kind === 'room' ? COOP_ENEMY_CAP_ROOM : 1500);
    closeModal();
    G.paused = false;
    if (UI.screen !== 'game') enterGame();
    toast('Your partner joined! Cash from now on is split between you; each of you builds with your own.', 'gold');
    updateCoopBadge();
  } else toast('Connected. Waiting for the kitchen…', 'info');
}
function coopLost(){
  if (!Coop.on) return;
  toast(coopHost() ? 'Your partner left. Their appliances keep cooking.' : 'Lost the connection to the host.', 'warn');
  updateCoopBadge();
}
function coopLeave(){
  const wasGuest = coopGuest(), wasHost = coopHost();
  if (wasHost){ G.cash = Math.floor(G.cash + Coop.wallet[1]); }
  try { Net.close && Net.close(); } catch (e) {}
  Object.assign(Net, { kind:null, role:null, send:null, close:null, room:null, pc:null, dc:null, alive:false, tParts:null, sig:'' });
  coopReset();
  UI.coopStarted = false;
  updateCoopBadge();
  if (wasGuest){ G.active = false; G.enemies = []; G.towers = []; }
}
function updateCoopBadge(){
  const b = $('#coop-badge');
  if (!b) return;
  b.hidden = !Coop.on;
  if (!Coop.on) return;
  const other = Coop.role === 'host' ? Coop.names[1] : Coop.names[0];
  b.textContent = (Net.alive ? '● ' : '○ ') + 'Co-op with ' + other + ' · their cash ' + money(Math.floor(Coop.wallet[Coop.role === 'host' ? 1 : 0]));
  b.classList.toggle('off', !Net.alive);
}

/* ---------------- the lobby ---------------- */
async function showCoop(){
  Sfx.unlock();
  const room = await roomApi();
  modal({ title:'Co-op', lead:'Defend one kitchen together. Each of you has your own cash and builds your own appliances; the kitchen’s earnings are split and the lives are shared.' + (room ? ' You’re inside Claude, so you meet with a four-letter room code.' : ' You connect directly: the host sends an invite code, the guest sends back a reply code.'),
    content:[h('div', { class:'coop-pick' },
      h('button', { class:'coop-opt', id:'coop-host', onclick: () => coopHostSetup(!!room) }, h('b', { text:'Host a game' }), h('span', { text:'Pick the kitchen. Your game is the real one; you can also bring the game you have saved.' })),
      h('button', { class:'coop-opt', id:'coop-join', onclick: () => coopJoinSetup(!!room) }, h('b', { text:'Join a game' }), h('span', { text: room ? 'Enter your friend’s room code.' : 'Paste your friend’s invite code.' })))],
    actions:[{ label:'Back' }] });
}
function coopHostSetup(useRoom){
  const maps = MAP_ORDER.concat(kitchenList().map(kitchenMapId)).filter(m => MAPS[m]);
  const sel = h('select', { 'aria-label':'Kitchen' }, maps.map(m => h('option', { value: m }, MAPS[m].name + ' · ' + MAPS[m].level)));
  const diff = h('select', { 'aria-label':'Difficulty' }, ['easy', 'medium', 'hard', 'michelin'].map(d => h('option', { value: d }, DIFFS[d].name)));
  diff.value = 'medium';
  const saved = readStoredGame();
  const cont = h('label', { class:'toggle-inline' }, h('input', { type:'checkbox', id:'coop-cont', disabled: !saved }), ' Bring my saved game' + (saved ? ' (' + slotLabel(saved) + ')' : ' (none)'));
  modal({ title:'Host a game', lead:'Choose where to cook. The game starts when your partner connects; you can build while you wait.', cls:'coop',
    content:[h('div', { class:'gal-form' }, h('label', { text:'Kitchen' }), sel, h('label', { text:'Difficulty' }), diff), cont],
    actions:[{ label:'Back', onClick: showCoop }, { label:'Open the kitchen', kind:'primary', onClick: async () => {
      const useSave = $('#coop-cont') && $('#coop-cont').checked && saved;
      if (useSave){ loadGame(saved); } else { pickSlot(slotForNew()); newGame(sel.value, diff.value, false); }
      enterGame();
      G.paused = true;
      Net.role = 'host';
      if (useRoom){
        const code = roomCode();
        try { await roomOpen(code, 'host'); } catch (e) { toast(e.message, 'warn'); G.paused = false; return; }
        coopWaitModal('Room code: ' + code, 'Tell your partner to choose Co-op → Join and enter this code.', h('div', { class:'coop-code big', text: code }));
      } else {
        let invite = '';
        try { invite = await rtcHostOffer(); } catch (e) { toast('Couldn’t start a connection here: ' + (e.message || e), 'warn'); G.paused = false; return; }
        const ta = h('textarea', { class:'gal-paste', rows: 3, readonly: true }); ta.value = invite;
        const reply = h('textarea', { class:'gal-paste', rows: 3, placeholder:'Paste the reply code (KSR1:…)', 'aria-label':'Reply code' });
        coopWaitModal('Invite your partner', 'Send this invite code to your partner (it works once). They paste it into Co-op → Join and send you back a reply code.',
          h('div', { class:'coop-steps' }, h('b', { text:'1. Your invite code' }), ta, h('button', { class:'btn btn-small', onclick: () => { copyText(invite); toast('Invite copied.', 'info'); } }, 'Copy invite'),
            h('b', { text:'2. Their reply code' }), reply, h('button', { class:'btn btn-small btn-primary', id:'coop-accept', onclick: async () => {
              try { await rtcHostAccept(reply.value); toast('Connecting…', 'info'); } catch (e) { toast(e.message || 'That reply code didn’t work.', 'warn'); }
            } }, 'Connect')));
      }
    } }] });
}
function coopWaitModal(title, lead, body){
  modal({ title, lead, cls:'coop', content:[body, h('p', { class:'dly-note', text:'Waiting for your partner…' })],
    actions:[{ label:'Cancel', onClick: () => { coopLeave(); G.paused = false; } }, { label:'Play alone for now', onClick: () => { G.paused = false; } }], dismissable:false });
}
function coopJoinSetup(useRoom){
  const name = h('input', { type:'text', maxlength:'20', placeholder:'Your name', 'aria-label':'Your name', value: Profile.settings.galBy || '' });
  if (useRoom){
    const code = h('input', { type:'text', maxlength:'4', placeholder:'ABCD', 'aria-label':'Room code', class:'coop-code-in' });
    modal({ title:'Join a game', lead:'Enter the room code your partner sees.', cls:'coop', content:[h('div', { class:'gal-form' }, h('label', { text:'Name' }), name, h('label', { text:'Code' }), code)],
      actions:[{ label:'Back', onClick: showCoop }, { label:'Join', kind:'primary', keep:true, onClick: async () => {
        const c = code.value.trim().toUpperCase();
        if (!/^[A-Z]{4}$/.test(c)){ toast('A room code is four letters.', 'warn'); return; }
        if (G.active && !G.attract) exitToMenu();
        coopGuestStart(); Net.role = 'guest'; Coop.names[1] = cleanText(name.value, 20, 'Guest'); Profile.settings.galBy = name.value.trim(); saveProfile();
        try { await roomOpen(c, 'guest'); } catch (e) { coopLeave(); toast(e.message, 'warn'); return; }
        modal({ title:'Joining ' + c, lead:'Waiting for the host…', actions:[{ label:'Cancel', onClick: coopLeave }], dismissable:false });
      } }] });
    return;
  }
  const inv = h('textarea', { class:'gal-paste', rows: 3, placeholder:'Paste the invite code (KSP1:…)', 'aria-label':'Invite code' });
  const out = h('div', { class:'coop-steps' });
  modal({ title:'Join a game', lead:'Paste your partner’s invite code, then send them the reply code it gives you.', cls:'coop', content:[h('div', { class:'gal-form' }, h('label', { text:'Name' }), name), inv, out],
    actions:[{ label:'Back', onClick: () => { coopLeave(); showCoop(); } }, { label:'Make my reply code', kind:'primary', keep:true, onClick: async () => {
      if (G.active && !G.attract){ saveGameNow && saveGameNow(); G.active = false; }
      coopGuestStart(); Net.role = 'guest'; Coop.names[1] = cleanText(name.value, 20, 'Guest'); Profile.settings.galBy = name.value.trim(); saveProfile();
      let reply;
      try { reply = await rtcGuestAnswer(inv.value); } catch (e) { coopLeave(); toast(e.message || 'That invite code didn’t work.', 'warn'); return; }
      const ta = h('textarea', { class:'gal-paste', rows: 3, readonly: true }); ta.value = reply;
      out.innerHTML = '';
      out.append(h('b', { text:'Your reply code: send it to the host' }), ta, h('button', { class:'btn btn-small', onclick: () => { copyText(reply); toast('Reply copied.', 'info'); } }, 'Copy reply'), h('p', { class:'dly-note', text:'The game opens as soon as the host connects.' }));
      copyText(reply);
    } }], dismissable:false });
}
function coopEndModal(won){
  if (!coopGuest()) return;
  modal({ title: won ? 'Kitchen saved!' : 'The pantry fell', lead: won ? 'You and ' + Coop.names[0] + ' cleared ' + MAPS[G.mapId].name + '.' : 'The pests broke through on round ' + G.round + '.', content:[statBlock([['Round', fmt(G.round)], ['Your appliances', fmt(G.towers.filter(t => t.own === 1).length)]])],
    actions:[{ label:'Keep watching', onClick: () => {} }, { label:'Leave', kind:'primary', onClick: () => { coopLeave(); exitToMenu(); } }], dismissable:false });
}
Hooks.coopEnd = won => setTimeout(() => coopEndModal(won), 300);
/* draw the shots the host's frame carried (the guest draws no real projectiles) */
function coopDrawShots(ctx){
  if (!coopGuest() || !Coop.shots) return;
  ctx.save(); ctx.fillStyle = 'rgba(255,240,200,0.95)'; ctx.strokeStyle = 'rgba(60,40,20,0.55)'; ctx.lineWidth = 1;
  for (const [x, y] of Coop.shots){ ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
/* whose appliance: a ring under each of your partner's */
function coopDrawOwners(ctx){
  if (!Coop.on) return;
  ctx.save(); ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
  for (const t of G.towers){
    if ((t.own || 0) === Coop.me) continue;
    ctx.strokeStyle = 'rgba(155,79,209,0.75)'; ctx.beginPath(); ctx.arc(t.x, t.y, t.size + 6, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
