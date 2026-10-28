import asyncio, sys, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(ROOT / 'dist' / 'test.html')
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ks-flows')
OUT.mkdir(parents=True, exist_ok=True)
fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

async def to_page(page, x, y):
    r = await page.evaluate('() => { const r = document.querySelector("#cv").getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }')
    return r[0] + x / 1100 * r[2], r[1] + y / 680 * r[3]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1366, 'height': 820})
        page = await ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(URL)
        await page.wait_for_timeout(800)
        await page.click('#btn-play')
        await page.click('.map-card >> nth=0')
        await page.click('.modal .btn-primary')
        await page.wait_for_timeout(500)
        check(await page.evaluate('() => G.active && !G.attract && G.mapId === "block"'), 'new game started on Butcher Block')
        # place a knife block with real clicks
        await page.click('.card[data-type=knife]')
        x, y = await to_page(page, 228, 210)
        await page.mouse.move(x, y)
        await page.mouse.click(x, y)
        await page.wait_for_timeout(200)
        check(await page.evaluate('() => G.towers.length === 1 && G.towers[0].type === "knife"'), 'knife placed by clicking')
        x2, y2 = await to_page(page, 194, 444)
        await page.keyboard.press('q')
        await page.mouse.move(x2, y2)
        await page.mouse.click(x2, y2)
        check(await page.evaluate('() => G.towers.length === 2'), 'second knife placed via Q hotkey')
        cash0 = await page.evaluate('() => G.cash')
        await page.click('#btn-go')
        await page.click('#btn-speed'); await page.click('#btn-speed')
        check(await page.evaluate('() => G.speed === 3'), 'speed cycles to 3x')
        await page.wait_for_function('() => G.round === 2 && !G.roundActive', timeout=60000)
        cash1 = await page.evaluate('() => G.cash')
        check(cash1 > cash0 + 100, f'round 1 cleared and paid out ({cash0} -> {cash1})')
        # select the tower by clicking it, then buy an upgrade
        await page.mouse.click(x, y)
        await page.wait_for_timeout(200)
        check(await page.is_visible('#tpanel'), 'tower panel opens on click')
        await page.click('#tpanel .upg[data-p="0"]')
        check(await page.evaluate('() => G.towers[0].up[0] === 1'), 'upgrade bought from the panel')
        await page.keyboard.press(',')
        check(await page.evaluate('() => G.towers[0].up[0] === 2 || G.cash < 210'), 'comma hotkey buys path 1')
        await page.screenshot(path=str(OUT / 'a-panel.png'))
        # sell needs two clicks
        n0 = await page.evaluate('() => G.towers.length')
        await page.click('#sell-btn')
        check(await page.evaluate('() => G.towers.length') == n0, 'first sell click only arms')
        await page.click('#sell-btn')
        check(await page.evaluate('() => G.towers.length') == n0 - 1, 'second sell click sells')
        # save and reload
        await page.evaluate('() => saveGameNow()')
        await page.reload()
        await page.wait_for_timeout(800)
        check(await page.is_visible('#btn-continue'), 'continue button after reload')
        await page.click('#btn-continue')
        await page.wait_for_timeout(400)
        check(await page.evaluate('() => G.round === 2 && G.towers.length === 1'), 'continue restores round and towers')
        await page.evaluate('() => { exitToMenu(); }')
        await page.wait_for_timeout(300)
        # hidden clock -> keypad -> admin
        for _ in range(3):
            await page.click('#menu-clock')
        check(await page.is_visible('#keypad'), 'tapping the clock 3 times opens the keypad')
        for d in '1111':
            await page.click(f'#kp-grid button[aria-label="{d}"]')
        await page.click('#kp-grid button[aria-label="Start"]')
        await page.wait_for_timeout(900)
        check(not await page.is_visible('#admin'), 'wrong code is rejected')
        for _ in range(3):
            await page.click('#menu-clock')
        for d in '4334':
            await page.click(f'#kp-grid button[aria-label="{d}"]')
        await page.click('#kp-grid button[aria-label="Start"]')
        await page.wait_for_timeout(300)
        check(await page.is_visible('#admin'), 'code 4334 opens the service menu')
        await page.screenshot(path=str(OUT / 'b-admin-menu.png'))
        await page.click('#admin header button')
        # victory on easy
        await page.evaluate('() => { Store.remove(LS_GAME); startNewGame("diner", "easy", false); Admin.setRound(40); Admin.skipRound(); }')
        await page.wait_for_timeout(1200)
        txt = await page.inner_text('#modal-body')
        check('Kitchen saved' in txt, 'victory modal after clearing round 40 on Easy')
        medals = await page.evaluate('() => Profile.medals.diner')
        check(bool(medals and medals.get('easy')), 'Bronze Spoon medal recorded')
        await page.screenshot(path=str(OUT / 'c-victory.png'))
        await page.click('.modal .btn-primary')
        check(await page.evaluate('() => G.freeplay'), 'freeplay continues')
        # defeat and retry
        await page.evaluate('() => { G.lives = 1; Admin.spawn("rat", 1, {}); G.speed = 3; }')
        await page.wait_for_function('() => G.over', timeout=90000)
        await page.wait_for_timeout(700)
        txt = await page.inner_text('#modal-body')
        check('pantry fell' in txt, 'defeat modal when the last life is lost')
        await page.screenshot(path=str(OUT / 'd-defeat.png'))
        await page.click('.modal .btn-primary')
        await page.wait_for_timeout(300)
        check(await page.evaluate('() => !G.over && G.active && G.lives > 1'), 'retry restores the round-start snapshot')
        # mastery perks purchase
        await page.evaluate('() => { exitToMenu(); Admin.maxMastery(); show("mastery"); buildMastery("perks"); }')
        await page.wait_for_timeout(300)
        await page.click('.perk .btn-gold >> nth=0')
        check(await page.evaluate('() => !!Profile.perks.lives'), 'buying a chef perk')
        await page.screenshot(path=str(OUT / 'e-perks.png'))
        # export / import code round trip
        code = await page.evaluate('() => encodeSave()')
        ok = await page.evaluate('(c) => { const d = decodeSave(c); return !!d.profile && d.profile.perks.lives === 1; }', code)
        check(ok, 'save code round-trips')
        check(len(errors) == 0, 'no page errors: ' + '; '.join(errors[:5]))
        await b.close()
    print('FAILURES:', len(fails))

asyncio.run(main())
