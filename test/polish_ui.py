"""Polish in the browser: game stats, the build replay, colour-blind mode, text size, favourites, the stats button on the end screens.
Usage: python3 test/polish_ui.py [shots dir]"""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(ROOT / 'dist' / 'test.html')
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ks-polish'); OUT.mkdir(parents=True, exist_ok=True)
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
        await page.evaluate("startNewGame('block', 'easy', false)"); await page.wait_for_timeout(600)
        await page.evaluate("""G.cash = 1e6; const sp = t => { for (let x = 120; x < 1000; x += 41) for (let y = 90; y < 620; y += 41) if (canPlace(t, x, y)) return [x, y]; };
          for (const t of ['knife','toaster','knife','blender']) { const s = sp(t); if (s) placeTower(t, ...s); }
          for (let r = 0; r < 4; r++){ startRound(); for (let n = 0; n < 60*120 && G.roundActive; n++) step(1/60); if (r === 1){ upgradeTower(G.towers[0], 0); upgradeTower(G.towers[0], 0); const s = sp('grill'); placeTower('grill', ...s); } }""")
        await page.wait_for_timeout(300)
        # favourites by right-click
        await page.click('#shop .card[data-type="toaster"]', button='right'); await page.wait_for_timeout(300)
        check(await page.query_selector('#shop .card.fav[data-type="toaster"]') is not None, 'right-click stars an appliance into Favourites')
        await page.click('#shop .card.fav[data-type="toaster"]'); await page.wait_for_timeout(200)
        fb = await page.query_selector('#shop-info .fav-btn.on')
        check(fb is not None, 'its info shows it starred')
        await page.click('#shop-info .fav-btn'); await page.wait_for_timeout(200)
        check(await page.query_selector('#shop .card.fav') is None, 'and the button unstars it')
        await page.evaluate("cancelPlacing()")
        # stats from the pause menu
        await page.evaluate("pauseGame()"); await page.wait_for_timeout(300)
        await page.click('.modal .acts button:has-text("Game stats")'); await page.wait_for_timeout(400)
        check(await page.evaluate("document.querySelectorAll('.gs-chart path').length") == 2, 'the stats screen draws two charts')
        check(await page.evaluate("document.querySelectorAll('.gs-row').length") >= 3, 'and lists the hardest workers')
        await page.screenshot(path=str(OUT / 'stats.png'))
        await page.click('.modal .btn-primary:has-text("Watch the build")'); await page.wait_for_timeout(400)
        lab = await page.evaluate("document.querySelector('.rp-label').textContent")
        check('appliance' in lab, 'the replay shows the build (%s)' % lab)
        await page.evaluate("const s = document.querySelector('.rp-ctl input'); s.value = 0; s.dispatchEvent(new Event('input'))")
        lab0 = await page.evaluate("document.querySelector('.rp-label').textContent")
        check(lab0 != lab and 'Before round 1' in lab0, 'scrubbing back shows round 1 (%s)' % lab0)
        await page.screenshot(path=str(OUT / 'replay.png'))
        await page.click('.modal .acts button:has-text("Back")'); await page.wait_for_timeout(200)
        await page.click('.modal .acts button:has-text("Back")'); await page.wait_for_timeout(200)
        check(await page.evaluate("document.querySelector('.modal h2').textContent") == 'Paused', 'Back returns to the pause menu')
        # colour-blind and text size
        await page.click('label[for="set-cb"]'); await page.wait_for_timeout(200)
        check(await page.evaluate("document.body.classList.contains('cb') && Profile.settings.cb === true"), 'colour-blind mode switches on')
        await page.click('.modal [data-size="larger"]'); await page.wait_for_timeout(200)
        check(await page.evaluate("document.body.classList.contains('txt-xl')"), 'text size switches to Larger')
        await page.screenshot(path=str(OUT / 'settings.png'))
        await page.click('.modal [data-size="normal"]')
        await page.click('.modal .btn-primary'); await page.wait_for_timeout(200)
        # the victory screen's stats button comes back to it
        await page.evaluate("G.round = G.win; G.lives = 1e6; G.cash = 1e7; startRound(); for (let n = 0; n < 60*400 && G.roundActive; n++) step(1/60);")
        await page.wait_for_timeout(900)
        t1 = await page.evaluate("document.querySelector('.modal h2').textContent")
        await page.click('#btn-gstats'); await page.wait_for_timeout(300)
        await page.click('.modal .acts button:has-text("Back")'); await page.wait_for_timeout(300)
        t2 = await page.evaluate("document.querySelector('.modal h2').textContent")
        check(t1 == 'Kitchen saved!' and t2 == t1 and await page.query_selector('#btn-gstats') is not None, 'the win screen has Game stats and comes back (%s / %s)' % (t1, t2))
        check(not errors, 'no page errors ' + json.dumps(errors[:4]))
        await b.close()
    print('FAILURES: %d' % len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
