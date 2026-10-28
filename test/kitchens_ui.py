"""The Kitchen Editor in the browser: opening it from the kitchen grid, drawing a trail with clicks, pouring water,
placing props, the checks, saving, playing the kitchen, editing it again, share codes, and undo.
Usage: python3 test/kitchens_ui.py [shots dir]"""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(ROOT / 'dist' / 'test.html')
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ks-kitchens')
OUT.mkdir(parents=True, exist_ok=True)
fails = []
def check(ok, what):
    print(('PASS ' if ok else 'FAIL ') + what)
    if not ok: fails.append(what)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page(viewport={'width': 1366, 'height': 900}, device_scale_factor=1)
        errors = []
        page.on('pageerror', lambda e: errors.append(('pageerror', str(e))))
        page.on('console', lambda m: errors.append(('console.' + m.type, m.text)) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        await page.goto(URL)
        await page.wait_for_timeout(1200)
        await page.click('#btn-play')
        await page.wait_for_timeout(400)
        new = await page.query_selector('.map-new')
        check(new is not None, 'the kitchen grid has a Build a kitchen card')
        await new.click()
        await page.wait_for_timeout(700)
        cv = await page.query_selector('.ked-canvas')
        check(cv is not None, 'the editor opens with its kitchen')
        box = await cv.bounding_box()
        K = lambda x, y: (box['x'] + x / 1100 * box['width'], box['y'] + y / 680 * box['height'])
        # a fresh trail: replace the starting one by adding points, then drag a point
        n0 = await page.evaluate("UI.ked.k.paths[0].length")
        for x, y in [(300, 600), (550, 600), (550, 250)]:
            await page.mouse.click(*K(x, y)); await page.wait_for_timeout(120)
        n1 = await page.evaluate("UI.ked.k.paths[0].length")
        check(n1 == n0 + 3, 'clicks add points to the trail (%d -> %d)' % (n0, n1))
        pt = await page.evaluate("UI.ked.k.paths[0][2]")
        await page.mouse.move(*K(pt[0], pt[1])); await page.mouse.down(); await page.mouse.move(*K(pt[0] + 60, pt[1] + 40), steps=4); await page.mouse.up()
        await page.wait_for_timeout(300)
        pt2 = await page.evaluate("UI.ked.k.paths[0][2]")
        check(pt2 != pt, 'a point drags to a new place (%s -> %s)' % (pt, pt2))
        # undo puts it back
        await page.keyboard.press('Control+z'); await page.wait_for_timeout(200)
        check(await page.evaluate("JSON.stringify(UI.ked.k.paths[0][2])") == json.dumps(pt).replace(' ', ''), 'Ctrl+Z undoes the move')
        # water: pour a puddle by dragging
        await page.click('.ked-top [aria-label=Tool] button:has-text("Water")')
        await page.select_option('.ked-opts select', 'puddle')
        await page.mouse.move(*K(800, 380)); await page.mouse.down(); await page.mouse.move(*K(950, 480), steps=5); await page.mouse.up()
        await page.wait_for_timeout(300)
        check(await page.evaluate("UI.ked.k.water.length === 1 && UI.ked.k.water[0].style === 'puddle'"), 'dragging pours a puddle')
        # props: place a cutting board and a jar
        await page.click('.ked-top [aria-label=Tool] button:has-text("Props")')
        await page.click('.ked-prop:has-text("Jar")')
        await page.mouse.click(*K(100, 120)); await page.wait_for_timeout(200)
        await page.click('.ked-prop:has-text("Cutting board")')
        await page.mouse.click(*K(950, 120)); await page.wait_for_timeout(300)
        check(await page.evaluate("UI.ked.k.deco.length === 2"), 'clicks place props')
        await page.fill('.ked-meta input[aria-label="Kitchen name"]', 'Browser Kitchen')
        await page.select_option('.ked-meta select', 'freezer')
        await page.wait_for_timeout(500)
        await page.screenshot(path=str(OUT / 'editor.png'))
        ok_txt = await page.evaluate("document.querySelector('.ked-problems').textContent")
        check('Ready to play' in ok_txt, 'the checks pass (%s)' % ok_txt)
        # play it
        await page.click('.ked-acts button:has-text("Play it")')
        await page.wait_for_timeout(600)
        title = await page.evaluate("(document.querySelector('.modal h2') || {}).textContent")
        check(title == 'Browser Kitchen', 'Play it saves the kitchen and asks for a difficulty (%s)' % title)
        await page.click('.modal .btn-primary')
        await page.wait_for_timeout(800)
        st = await page.evaluate("({ map: G.mapId, theme: G.map.theme, water: G.map.water.length, screen: UI.screen })")
        check(st['map'].startswith('cm_') and st['theme'] == 'freezer' and st['water'] == 1 and st['screen'] == 'game', 'the game starts on it ' + json.dumps(st))
        await page.evaluate("G.cash = 100000; placeTower('knife', 400, 300); startRound(); G.speed = 3")
        await page.wait_for_timeout(2500)
        await page.screenshot(path=str(OUT / 'playing.png'))
        check(await page.evaluate("G.enemies.length > 0 || G.round > 1"), 'pests walk its trail')
        # back to the grid: its card, and editing it again
        await page.evaluate("exitToMenu(); show('maps')")
        await page.wait_for_timeout(500)
        cards = await page.evaluate("[...document.querySelectorAll('.map-wrap .map-card h3')].map(e => e.textContent)")
        check('Browser Kitchen' in cards, 'it has a card under Your kitchens')
        await page.click('.map-wrap .map-edit')
        await page.wait_for_timeout(600)
        check(await page.evaluate("UI.ked && UI.ked.k.name === 'Browser Kitchen' && UI.ked.k.deco.length === 2"), 'Edit opens it again as saved')
        await page.click('.ked-acts button:has-text("Share code")')
        code = await page.evaluate("document.querySelector('.ked-code').value")
        check(code.startswith('KSM1:'), 'Share code gives a kitchen code')
        await page.click('.ked-acts button:has-text("Close")')
        check(not errors, 'no page errors ' + json.dumps(errors[:4]))
        await b.close()
    print('FAILURES: %d' % len(fails))
    sys.exit(1 if fails else 0)
asyncio.run(main())
