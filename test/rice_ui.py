"""The Rice Cooker in the browser: the shop card and its key, placing it, its panel (cooking meter, Open the lid,
kept pots), a burst, every path's look in 3D and flat, its abilities' icons, and the news popup.
Usage: python3 test/rice_ui.py [shots dir]"""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(ROOT / 'dist' / 'test.html')
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ks-rice'); OUT.mkdir(parents=True, exist_ok=True)
fails = []
def check(ok, what):
    print(('PASS ' if ok else 'FAIL ') + what)
    if not ok: fails.append(what)
async def run(b, mode):
    page = await b.new_page(viewport={'width': 1366, 'height': 860}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    await page.add_init_script('window.KS_GL_SOFT = true')
    await page.goto(URL); await page.wait_for_timeout(1200)
    if mode == 'flat': await page.evaluate("Profile.settings.depth = false")
    await page.evaluate("startNewGame('block', 'medium', false); Admin.maxMastery(); G.cash = 1e7")
    await page.wait_for_timeout(500)
    check(await page.query_selector('#shop .card[data-type="rice"]') is not None, mode + ': the shop sells the Rice Cooker')
    await page.keyboard.press('Shift+BracketLeft')
    check(await page.evaluate("UI.placing") == 'rice', mode + ': { picks it')
    await page.keyboard.press('Escape')
    # a row of cookers, one per look
    looks = [[0,0,0],[2,0,0],[5,0,0],[0,2,0],[0,5,0],[0,0,2],[0,0,5],[3,2,0],[0,2,4]]
    await page.evaluate("""(looks => { let i = 0; for (let y = 110; y < 640 && i < looks.length; y += 60) for (let x = 120; x < 1060 && i < looks.length; x += 60) if (canPlace('rice', x, y)){ const t = placeTower('rice', x, y); t.up = looks[i++]; } refreshTowers();
      const t = placeTower('rice', 600, 140) || G.towers[G.towers.length - 1]; })(%s)""" % json.dumps(looks))
    await page.evaluate("(() => { const ts = G.towers.filter(t => t.type === 'rice'); ts[ts.length - 1].paragon = true; ts[ts.length - 1].degree = 20; ts[ts.length - 1].up = [5,5,5]; refreshTowers(); })()")
    await page.wait_for_timeout(600)
    await page.screenshot(path=str(OUT / ('row-' + mode + '.png')))
    # play a round: bursts
    await page.evaluate("startRound(); G.speed = 3")
    await page.wait_for_timeout(5000)
    dmg = await page.evaluate("G.towers.filter(t => t.type === 'rice').reduce((a, t) => a + t.dmg, 0)")
    check(dmg > 0, mode + ': the cookers steam pests (%d)' % dmg)
    await page.screenshot(path=str(OUT / ('burst-' + mode + '.png')))
    # the panel
    await page.evaluate("select(G.towers.find(t => t.type === 'rice' && t.up[2] === 5 && !t.paragon)); updatePanel(true)")
    await page.wait_for_timeout(300)
    check(await page.query_selector('#rice-meter') is not None and await page.query_selector('#rice-lid') is not None, mode + ': the panel shows the cooking meter and Open the lid')
    check('Kept warm' in (await page.evaluate("(document.querySelector('#rice-kept') || {}).textContent || ''")), mode + ': and the pots kept warm')
    abil = await page.evaluate("[...document.querySelectorAll('.abil b')].map(e => e.textContent)")
    check(any('Serve' in a for a in abil), mode + ': Serve! is listed (%s)' % abil)
    await page.screenshot(path=str(OUT / ('panel-' + mode + '.png')))
    check(not errors, mode + ': no page errors ' + json.dumps(errors[:4]))
    await page.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for mode in ['gl', 'flat']: await run(b, mode)
        # the news popup for a returning player
        page = await b.new_page(viewport={'width': 1366, 'height': 860})
        await page.goto(URL); await page.wait_for_timeout(1000)
        await page.evaluate("Profile.news = RICE_NEWS; showRiceNews()")
        await page.wait_for_timeout(400)
        t = await page.evaluate("(document.querySelector('.modal h2') || {}).textContent")
        check(t == 'A new appliance: the Rice Cooker', 'returning players meet it in a news popup')
        await page.screenshot(path=str(OUT / 'news.png'))
        await b.close()
    print('FAILURES: %d' % len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
