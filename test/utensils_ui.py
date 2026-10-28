"""Chopsticks and the Lazy Susan in the browser: hotkeys, placing an appliance onto a turntable's seat, picking a
rider or its turntable with the pointer, the turntable's panel, selling, pests drawn up in the air, and the news
for returning players. Runs in 3D, in the solid fallback and with the 3D look off.
Usage: python3 test/utensils_ui.py [shots dir]"""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(ROOT / 'dist' / 'test.html')
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ks-ut')
OUT.mkdir(parents=True, exist_ok=True)
fails = []
def check(ok, what):
    print(('PASS ' if ok else 'FAIL ') + what)
    if not ok: fails.append(what)

async def run(b, mode):
    errors = []
    page = await b.new_page(viewport={'width': 1366, 'height': 820}, device_scale_factor=1)
    page.on('pageerror', lambda e: errors.append(('pageerror', str(e))))
    page.on('console', lambda m: errors.append(('console.' + m.type, m.text)) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    await page.add_init_script('window.KS_GL_SOFT = true')
    await page.goto(URL)
    await page.wait_for_timeout(1200)
    if mode == 'flat': await page.evaluate("Profile.settings.depth = false")
    if mode == 'solid': await page.evaluate("GL3D.ok = () => false")
    await page.click('#btn-play')
    await page.wait_for_timeout(300)
    await page.click('.map-card >> nth=0')
    await page.wait_for_timeout(300)
    await page.click('.modal .btn-primary')
    await page.wait_for_timeout(500)
    await page.evaluate("Admin.maxMastery(); G.cash = 5000000")
    # the hotkeys
    await page.keyboard.press('Shift+Comma')
    check(await page.evaluate("UI.placing") == 'chopsticks', mode + ': < starts placing chopsticks')
    await page.keyboard.press('Escape')
    await page.keyboard.press('Shift+Period')
    check(await page.evaluate("UI.placing") == 'susan', mode + ': > starts placing a Lazy Susan')
    # place the turntable with the pointer somewhere open
    spot = await page.evaluate('''() => { for (let x = 120; x < W - 60; x += 12) for (let y = 120; y < H - 60; y += 12) if (canPlace('susan', x, y) && G.paths.every(P => distToPath(P, x, y) > 70)) return { x, y }; return null; }''')
    box = await page.evaluate("(() => { const r = document.getElementById('cv').getBoundingClientRect(); return { x: r.left, y: r.top, k: r.width / W }; })()")
    to = lambda x, y: (box['x'] + x * box['k'], box['y'] + y * box['k'])
    await page.mouse.move(*to(spot['x'], spot['y']))
    await page.mouse.click(*to(spot['x'], spot['y']))
    await page.wait_for_timeout(200)
    s = await page.evaluate("(() => { const s = G.towers.find(t => t.type === 'susan'); return s ? { x: s.x, y: s.y, id: s.id } : null; })()")
    check(s is not None, mode + ': a Lazy Susan was placed with the pointer')
    if not s:
        await page.close(); return
    # two seats, then a knife block placed over the board snaps onto a seat
    await page.evaluate("(() => { const s = G.towers.find(t => t.type === 'susan'); upgradeTower(s, 1); })()")
    await page.keyboard.press('q')
    await page.mouse.move(*to(s['x'] + 3, s['y'] + 2))
    await page.wait_for_timeout(120)
    gh = await page.evaluate("UI.ghost && { on: !!UI.ghost.on, valid: UI.ghost.valid, x: UI.ghost.x, y: UI.ghost.y }")
    check(bool(gh and gh['on'] and gh['valid']), mode + ': the ghost snaps onto a seat over the board')
    await page.screenshot(path=str(OUT / ('ghost-' + mode + '.png')))
    await page.mouse.click(*to(s['x'] + 3, s['y'] + 2))
    await page.wait_for_timeout(200)
    r = await page.evaluate("(() => { const k = G.towers.find(t => t.type === 'knife'); return k ? { on: !!k.on, seat: k.seat, x: k.x, y: k.y } : null; })()")
    check(bool(r and r['on']), mode + ': the knife block rides the turntable')
    # a second rider, then the turntable is full
    await page.evaluate("placeTower('toaster', %f, %f)" % (s['x'], s['y']))
    full = await page.evaluate("canPlace('blender', %f, %f)" % (s['x'], s['y']))
    check(not full, mode + ': a full turntable takes no more riders')
    # let the board turn, then click on a rider and on the board's edge
    await page.wait_for_timeout(500)
    r = await page.evaluate("(() => { const k = G.towers.find(t => t.type === 'knife'); return { x: k.x, y: k.y }; })()")
    await page.mouse.click(*to(r['x'], r['y']))
    await page.wait_for_timeout(150)
    check(await page.evaluate("UI.sel && UI.sel.type") == 'knife', mode + ': clicking a rider selects it')
    note = await page.evaluate("!!document.querySelector('.ride-note .linkish')")
    check(note, mode + ': the rider panel links to its turntable')
    if note:
        await page.click('.ride-note .linkish')
        await page.wait_for_timeout(150)
        check(await page.evaluate("UI.sel && UI.sel.type") == 'susan', mode + ': the link selects the turntable')
    await page.evaluate("select(null)")
    edge = await page.evaluate('''(() => { const s = G.towers.find(t => t.type === 'susan'), rs = ridersOf(s);
      for (let a = 0; a < 6.28; a += 0.2){ const x = s.x + Math.cos(a) * 21, y = s.y + Math.sin(a) * 21; if (rs.every(r => Math.hypot(r.x - x, r.y - y) > r.size * riderScale(r) + 4)) return { x, y }; } return null; })()''')
    if edge:
        await page.mouse.click(*to(edge['x'], edge['y']))
        await page.wait_for_timeout(150)
        check(await page.evaluate("UI.sel && UI.sel.type") == 'susan', mode + ': clicking the board edge selects the turntable')
    else: check(False, mode + ': found a free spot on the board edge')
    await page.evaluate("select(G.towers.find(t => t.type === 'susan')); updatePanel(true)")
    await page.wait_for_timeout(200)
    seats = await page.evaluate("document.querySelectorAll('.susan-box button.seat').length")
    check(seats == 2, mode + ': the turntable panel lists its 2 riders (%d)' % seats)
    await page.screenshot(path=str(OUT / ('panel-' + mode + '.png')))
    # chopsticks lift pests: some are drawn in the air
    await page.evaluate('''(() => {
      const P = G.paths[0], p = pathPos(P, P.len * 0.3, 0);
      let c = null; for (let r = 30; r < 160 && !c; r += 6) for (let a = 0; a < 6.28 && !c; a += 0.3) c = placeTower('chopsticks', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      for (let k = 0; k < 2; k++) upgradeTower(c, 2);
      Admin.setRound(14); startRound(); G.spawn = [];
      for (let i = 0; i < 6; i++){ const e = spawnEnemy(i % 2 ? 'roach' : 'ant', { path: 0, d: P.len * 0.3 + i * 12 }); const q = pathPos(P, e.d, 0); e.x = q.x; e.y = q.y; e.seg = q.seg; }
      for (const e of G.enemies.slice(-3)) pinch(c, c.s.atk.main, e);
      for (let i = 0; i < 12; i++) step(1 / 60);
      G.paused = true;
    })()''')
    await page.wait_for_timeout(300)
    air = await page.evaluate("G.enemies.filter(e => e.air).length")
    check(air >= 1, mode + ': pests are up in the air (%d)' % air)
    await page.screenshot(path=str(OUT / ('air-' + mode + '.png')))
    await page.evaluate("G.paused = false")
    await page.wait_for_timeout(1500)
    # selling the turntable sells what rides it
    v = await page.evaluate("(() => { const s = G.towers.find(t => t.type === 'susan'); return { v: sellValue(s), own: ownSellValue(s), n: G.towers.length }; })()")
    check(v['v'] > v['own'], mode + ': the turntable sells for more with its riders aboard')
    await page.evaluate("select(G.towers.find(t => t.type === 'susan')); updatePanel(true)")
    await page.click('#sell-btn'); await page.wait_for_timeout(80); await page.click('#sell-btn')
    await page.wait_for_timeout(200)
    left = await page.evaluate("G.towers.filter(t => t.type === 'susan' || t.type === 'knife' || t.type === 'toaster').length")
    check(left == 0, mode + ': selling the turntable sold its riders too')
    check(not errors, mode + ': no page errors ' + json.dumps(errors[:4]))
    await page.close()

async def news(b):
    page = await b.new_page(viewport={'width': 1366, 'height': 820})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.add_init_script('''window.KS_GL_SOFT = true;
      localStorage.setItem('kitchen-siege:profile:v1', JSON.stringify({ v:1, news: 9, stats:{ games: 3 }, mastery:{ knife: 100 } }));''')
    await page.goto(URL)
    await page.wait_for_timeout(1800)
    title = await page.evaluate("(document.querySelector('.modal h2, .modal .m-title') || {}).textContent || ''")
    check('new appliances' in title.lower(), 'news: returning players hear about the two new appliances (%s)' % title)
    await page.screenshot(path=str(OUT / 'news.png'))
    n = await page.evaluate("Profile.news")
    check(n == 10, 'news: the utensil news is seen once (%s)' % n)
    check(not errors, 'news: no page errors ' + json.dumps(errors[:3]))
    await page.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        for mode in ['gl', 'solid', 'flat']:
            await run(b, mode)
        await news(b)
        await b.close()
    print('FAILURES: %d' % len(fails))
    sys.exit(1 if fails else 0)
asyncio.run(main())
