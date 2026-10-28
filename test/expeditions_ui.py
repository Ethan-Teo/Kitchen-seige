"""Expeditions in the browser: the Events card, the crew picker, a kitchen, camp, packed appliances in the shop, defeat.
Usage: python3 test/expeditions_ui.py [shots dir]"""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(ROOT / 'dist' / 'test.html')
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ks-ex'); OUT.mkdir(parents=True, exist_ok=True)
fails = []
def check(ok, what):
    print(('PASS ' if ok else 'FAIL ') + what)
    if not ok: fails.append(what)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page(viewport={'width': 1366, 'height': 900})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        await page.goto(URL); await page.wait_for_timeout(1200)
        await page.click('#btn-events'); await page.wait_for_timeout(500)
        check(await page.query_selector('#ex-new') is not None, 'Events has an Expedition card')
        await page.click('#ex-new'); await page.wait_for_timeout(400)
        btns = await page.query_selector_all('.ex-crew')
        check(len(btns) > 10, 'the crew picker lists the appliances (%d)' % len(btns))
        for i in range(7): await page.evaluate("i => document.querySelectorAll('.ex-crew')[i].click()", i)
        n = await page.evaluate("document.querySelectorAll('.ex-crew.on').length")
        check(n == 6, 'no more than six kinds (%d)' % n)
        await page.screenshot(path=str(OUT / 'crew.png'))
        await page.click('#ex-crew-ok'); await page.wait_for_timeout(800)
        st = await page.evaluate("({ s: UI.screen, ex: !!(G.ch && G.ch.ex), label: document.querySelector('#mode-label').textContent })")
        check(st['s'] == 'game' and st['ex'] and 'Expedition 1/5' in st['label'], 'kitchen 1 starts ' + json.dumps(st))
        # clear it quickly
        await page.evaluate("""G.cash = 1e7; let k = 0; for (let x = 120; x < 1000 && k < 6; x += 70) for (let y = 100; y < 620 && k < 6; y += 70){ const t = G.ch.towers[k % G.ch.towers.length]; if (canPlace(t, x, y)){ const tw = placeTower(t, x, y); if (tw){ tw.up = exCleanUp(t,[3,2,0]); k++; } } } refreshTowers(); G.round = G.ch.end; G.lives = 1e6; startRound(); G.speed = 3;
          for (let n = 0; n < 60*400 && G.roundActive; n++) step(1/60);""")
        await page.wait_for_timeout(1200)
        title = await page.evaluate("(document.querySelector('.modal h2')||{}).textContent")
        check(title == 'Kitchen 1 cleared', 'the cleared modal shows (%s)' % title)
        await page.click('.modal .btn-primary'); await page.wait_for_timeout(500)
        boons = await page.query_selector_all('.ex-boon')
        check(len(boons) == 3, 'camp offers three boons')
        await page.screenshot(path=str(OUT / 'camp.png'))
        pick = await page.evaluate("[...document.querySelectorAll('.ex-boon')].map(e => e.dataset.boon).find(b => b !== 'recruit')")
        await page.click('.ex-boon[data-boon="%s"]' % pick); await page.wait_for_timeout(400)
        check((await page.evaluate("(document.querySelector('.modal h2')||{}).textContent")).startswith('Kitchen 2 of 5'), 'then the next kitchen is shown')
        await page.click('.modal .btn-primary'); await page.wait_for_timeout(800)
        packs = await page.query_selector_all('.ex-packcard')
        check(len(packs) >= 1, 'packed appliances show in the shop (%d)' % len(packs))
        await page.screenshot(path=str(OUT / 'pack.png'))
        cash = await page.evaluate("G.cash"); n0 = await page.evaluate("G.towers.length")
        await packs[0].click(); await page.wait_for_timeout(200)
        spot = await page.evaluate("(() => { const t = UI.placing; for (let x = 120; x < 1000; x += 30) for (let y = 100; y < 600; y += 30) if (canPlace(t, x, y)) return [x, y]; })()")
        await page.evaluate("tryPlace(%d, %d)" % tuple(spot)); await page.wait_for_timeout(300)
        check(await page.evaluate("G.towers.length") == n0 + 1 and await page.evaluate("G.cash") == cash, 'a packed appliance places for free')
        check(len(await page.query_selector_all('.ex-packcard')) == len(packs) - 1, 'and leaves the shop')
        await page.evaluate("G.lives = 0; gameOver()"); await page.wait_for_timeout(800)
        check((await page.evaluate("(document.querySelector('.modal h2')||{}).textContent")) == 'The expedition ends', 'losing ends the expedition')
        check(not errors, 'no page errors ' + json.dumps(errors[:4]))
        await b.close()
    print('FAILURES: %d' % len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
