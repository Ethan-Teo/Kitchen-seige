"""Co-op in two browser pages: WebRTC with invite and reply codes, then a Claude room (stood in for by a BroadcastChannel).
The guest builds, the host sees it; the guest starts a round; cash is split; ownership holds.
Usage: python3 test/coop_ui.py [shots dir]"""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(ROOT / 'dist' / 'test.html')
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ks-coop'); OUT.mkdir(parents=True, exist_ok=True)
fails = []
def check(ok, what):
    print(('PASS ' if ok else 'FAIL ') + what)
    if not ok: fails.append(what)
ROOM_MOCK = """(() => {
  const ch = new BroadcastChannel('ks-room-mock'), me = Math.random().toString(36).slice(2);
  const rooms = {};
  window.claude = { use: async name => name === 'room' ? { join: async rn => {
    if (rooms[rn]) return rooms[rn];
    let mine = {}, others = {}, subs = [];
    const fire = () => { const peers = [{ peer: me, isMe: true, presence: mine }].concat(Object.keys(others).map(p => ({ peer: p, isMe: false, presence: others[p] }))); subs.forEach(f => f({ peers, joined: [], left: [], updated: [] })); };
    ch.addEventListener('message', ev => { const d = ev.data; if (d.rn !== rn || d.from === me) return; others[d.from] = d.p; fire(); if (d.hello) ch.postMessage({ rn, from: me, p: mine }); });
    const R = { presence: async patch => { mine = Object.assign({}, mine, patch); ch.postMessage({ rn, from: me, p: mine }); }, onPeers: f => { subs.push(f); setTimeout(fire, 0); return () => {}; }, leave: async () => {} };
    ch.postMessage({ rn, from: me, p: mine, hello: 1 });
    return rooms[rn] = R;
  } } : null };
})()"""
async def setup(ctx, room):
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text and 'ERR_' not in m.text else None)
    if room: await pg.add_init_script(ROOM_MOCK)
    await pg.goto(URL); await pg.wait_for_timeout(1200)
    return pg, errs
async def play(host, guest, label):
    # the guest builds a knife
    spot = await guest.evaluate("(() => { for (let x = 140; x < 1000; x += 37) for (let y = 100; y < 600; y += 37) if (canPlace('knife', x, y)) return [x, y]; })()")
    await guest.evaluate("UI.placing = 'knife'; tryPlace(%d, %d)" % tuple(spot))
    await host.wait_for_timeout(1200)
    own = await host.evaluate("G.towers.filter(t => t.own === 1).length")
    check(own == 1, label + ': the guest’s appliance appears in the host’s game')
    await guest.wait_for_timeout(1500)
    check(await guest.evaluate("G.towers.some(t => t.own === 1 && t.type === 'knife')"), label + ': and back on the guest’s screen')
    gcash = await guest.evaluate("G.cash")
    check(gcash < await host.evaluate("Coop.wallet[1] + 1") + 1 and gcash > 0, label + ': the guest sees its own purse ($%d)' % gcash)
    # the guest starts a round; pests show on both
    await guest.evaluate("startRound()")
    await host.wait_for_timeout(2500)
    check(await host.evaluate("G.roundActive || G.round > 1"), label + ': the guest started a round')
    n = await guest.evaluate("G.enemies.length")
    check(n > 0, label + ': the guest sees the pests (%d)' % n)
    # the host can’t sell the guest’s
    check(await host.evaluate("sellTower(G.towers.find(t => t.own === 1)) === 0"), label + ': the host can’t sell the guest’s appliance')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-fake-ui-for-media-stream'])
        # ---------- WebRTC ----------
        ctx = await b.new_context(viewport={'width': 1280, 'height': 860})
        host, he = await setup(ctx, False); guest, ge = await setup(ctx, False)
        await host.click('#btn-coop'); await host.wait_for_timeout(300)
        await host.click('#coop-host'); await host.wait_for_timeout(300)
        await host.click('.modal .btn-primary:has-text("Open the kitchen")')
        await host.wait_for_selector('.coop-steps textarea[readonly]', timeout=15000)
        invite = await host.evaluate("document.querySelector('.coop-steps textarea[readonly]').value")
        check(invite.startswith('KSP1:'), 'the host gets an invite code (%d chars)' % len(invite))
        await host.screenshot(path=str(OUT / 'invite.png'))
        await guest.click('#btn-coop'); await guest.wait_for_timeout(300)
        await guest.click('#coop-join'); await guest.wait_for_timeout(300)
        await guest.fill('.modal input[aria-label="Your name"]', 'Pal')
        await guest.fill('.modal textarea[aria-label="Invite code"]', invite)
        await guest.click('.modal .btn-primary:has-text("Make my reply code")')
        await guest.wait_for_selector('.coop-steps textarea[readonly]', timeout=15000)
        reply = await guest.evaluate("document.querySelector('.coop-steps textarea[readonly]').value")
        check(reply.startswith('KSR1:'), 'the guest gets a reply code')
        await host.fill('.modal textarea[aria-label="Reply code"]', reply)
        await host.click('#coop-accept')
        await host.wait_for_timeout(5000)
        print('DBG host', await host.evaluate("JSON.stringify({ alive: Net.alive, on: Coop.on, role: Coop.role, pc: Net.pc && Net.pc.connectionState, ice: Net.pc && Net.pc.iceConnectionState, dc: Net.dc && Net.dc.readyState, active: G.active })"))
        print('DBG guest', await guest.evaluate("JSON.stringify({ alive: Net.alive, on: Coop.on, role: Coop.role, pc: Net.pc && Net.pc.connectionState, ice: Net.pc && Net.pc.iceConnectionState, dc: Net.dc && Net.dc.readyState, st: UI.coopStarted, modal: document.querySelector('.modal h2').textContent })"))
        await guest.wait_for_function("UI.coopStarted === true", timeout=15000)
        check(await host.evaluate("Coop.on && Coop.role === 'host'") and await guest.evaluate("UI.screen === 'game' && G.mapId === 'block' || UI.screen === 'game'"), 'connected: the guest’s screen shows the host’s kitchen')
        check(await host.evaluate("Coop.names[1]") == 'Pal', 'the host sees the guest’s name')
        await play(host, guest, 'WebRTC')
        await guest.screenshot(path=str(OUT / 'guest.png')); await host.screenshot(path=str(OUT / 'host.png'))
        await guest.evaluate("exitToMenu()"); await host.wait_for_timeout(1500)
        check(await host.evaluate("!Net.alive"), 'when the guest leaves, the host knows')
        check(not he and not ge, 'no page errors ' + json.dumps((he + ge)[:4]))
        await ctx.close()
        # ---------- a Claude room ----------
        ctx = await b.new_context(viewport={'width': 1280, 'height': 860})
        host, he = await setup(ctx, True); guest, ge = await setup(ctx, True)
        await host.click('#btn-coop'); await host.wait_for_timeout(400)
        await host.click('#coop-host'); await host.wait_for_timeout(300)
        await host.click('.modal .btn-primary:has-text("Open the kitchen")')
        await host.wait_for_selector('.coop-code.big', timeout=5000)
        code = await host.evaluate("document.querySelector('.coop-code.big').textContent")
        check(len(code) == 4, 'inside Claude the host gets a room code (%s)' % code)
        await guest.click('#btn-coop'); await guest.wait_for_timeout(400)
        await guest.click('#coop-join'); await guest.wait_for_timeout(300)
        await guest.fill('.modal input[aria-label="Room code"]', code)
        await guest.click('.modal .btn-primary:has-text("Join")')
        await guest.wait_for_function("UI.coopStarted === true", timeout=15000)
        check(True, 'the guest joins with the code')
        await play(host, guest, 'Room')
        await guest.screenshot(path=str(OUT / 'guest_room.png'))
        check(not he and not ge, 'no page errors ' + json.dumps((he + ge)[:4]))
        await b.close()
    print('FAILURES: %d' % len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
