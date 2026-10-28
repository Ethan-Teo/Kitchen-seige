"""The Spray Bottle in the browser: its hotkey, placing it, buying the nozzle and twisting it in the panel, the
attack lines, the effects it draws (mist, jet, bubbles, foam, rain), its abilities, and the news for returning
players. Runs in 3D, in the solid fallback and with the 3D look off.
Usage: python3 test/spray_ui.py [shots dir]"""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(ROOT / 'dist' / 'test.html')
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ks-spray')
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
    # the hotkey, then placing it where the knife block test spot is
    await page.keyboard.press('Shift+Slash')
    check(await page.evaluate("UI.placing") == 'spray', mode + ': ? starts placing a Spray Bottle')
    await page.keyboard.press('Escape')
    t = await page.evaluate("(() => { const t = placeTower('spray', 380, 200); select(t); return !!t; })()")
    check(t, mode + ': it places')
    lines = await page.evaluate("[...document.querySelectorAll('#panel .atk-line, #panel .atk, #panel [class*=atk]')].map(e => e.textContent).join(' | ')")
    # buy Twist Nozzle through the panel's third path
    await page.evaluate("buyUpgrade(2)")
    await page.wait_for_timeout(300)
    seg = await page.query_selector('[aria-label=Nozzle]')
    check(seg is not None, mode + ': Twist Nozzle shows the nozzle switch in its panel')
    check(await page.evaluate("UI.sel.s.atk.main.streaming === true"), mode + ': and it is twisted to Stream')
    if seg:
        await page.click('[aria-label=Nozzle] button:has-text("Mist")')
        await page.wait_for_timeout(200)
        check(await page.evaluate("UI.sel.nozzle === 'mist' && !UI.sel.s.atk.main.streaming"), mode + ': clicking Mist twists it back')
        await page.click('[aria-label=Nozzle] button:has-text("Stream")')
        await page.wait_for_timeout(200)
        check(await page.evaluate("UI.sel.nozzle === 'stream' && UI.sel.s.atk.main.streaming"), mode + ': and Stream again')
    # play: a soap bottle, a mist bottle with the rain, the pressure washer
    await page.evaluate("""(() => {
      const t = UI.sel; t.up = [0, 2, 4];
      const a = placeTower('spray', 500, 420); a.up = [4, 2, 0];
      const c = placeTower('spray', 250, 250); c.up = [0, 5, 0];
      refreshTowers(); G.round = 30; startRound(); G.speed = 3;
    })()""")
    await page.wait_for_timeout(5000)
    await page.evaluate("""(() => { for (const t of G.towers) for (const k in t.ab) t.ab[k] = 0;
      for (const id of ['downpour', 'bubblebath', 'hydroblast']) useAbility(id); })()""")
    await page.wait_for_timeout(1500)
    st = await page.evaluate("({ dmg: G.towers.filter(t => t.type === 'spray').map(t => Math.round(t.dmg)), rain: !!G.glob.downpour, wet: G.enemies.filter(e => !e.dead && e.wetT > 0).length })")
    check(sum(st['dmg']) > 0 and st['rain'], mode + ': the bottles fight and the rain falls ' + json.dumps(st))
    await page.screenshot(path=str(OUT / ('spray_' + mode + '.png')))
    check(not errors, mode + ': no page errors ' + json.dumps(errors[:4]))
    await page.close()

async def news(b):
    page = await b.new_page(viewport={'width': 1366, 'height': 820})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.add_init_script('''window.KS_GL_SOFT = true;
      localStorage.setItem('kitchen-siege:profile:v1', JSON.stringify({ v:1, news: 11, stats:{ games: 3 }, mastery:{ knife: 100 } }));''')
    await page.goto(URL)
    await page.wait_for_timeout(1800)
    title = await page.evaluate("(document.querySelector('.modal h2, .modal .m-title') || {}).textContent || ''")
    check('spray bottle' in title.lower(), 'news: returning players hear about the Spray Bottle (%s)' % title)
    await page.screenshot(path=str(OUT / 'news.png'))
    n = await page.evaluate("Profile.news")
    check(n == 12, 'news: it is seen once (%s)' % n)
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
