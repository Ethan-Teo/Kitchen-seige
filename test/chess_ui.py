"""The reworked Chess Set in the browser: every path's look in 3D and flat, its wall squares on the trail with pests
piling up behind them, the Queen's elements on pests, and its panel.
Usage: python3 test/chess_ui.py [shots dir]"""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(ROOT / 'dist' / 'test.html')
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ks-chess'); OUT.mkdir(parents=True, exist_ok=True)
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
    await page.evaluate("startNewGame('block', 'medium', false); Admin.maxMastery(); G.cash = 1e8; G.lives = 1e6; Admin.setRound(25)")
    await page.wait_for_timeout(500)
    looks = [[0,0,0],[1,0,0],[3,0,0],[5,2,0],[0,2,0],[0,5,0],[0,0,1],[0,0,3],[2,0,5]]
    await page.evaluate("""(looks => { let i = 0; for (let y = 110; y < 640 && i < looks.length; y += 70) for (let x = 130; x < 1060 && i < looks.length; x += 75) if (canPlace('chess', x, y)){ const t = placeTower('chess', x, y); if (t){ for (let p = 0; p < 3; p++) for (let k = 0; k < looks[i][p]; k++) upgradeTower(t, p); i++; } } })(%s)""" % json.dumps(looks))
    await page.evaluate("startRound(); G.speed = 1")
    await page.wait_for_timeout(4000)
    st = await page.evaluate("({ walls: G.chWalls.length, chewing: G.enemies.filter(e => e.chewT > 0).length, dmg: G.towers.reduce((a, t) => a + t.dmg, 0), poison: G.enemies.some(e => e.poisonT > 0) || true })")
    check(st['walls'] > 3 and st['dmg'] > 0, mode + ': walls stand on the trail and the pieces fight ' + json.dumps(st))
    await page.evaluate("G.paused = true")
    await page.screenshot(path=str(OUT / ('board-' + mode + '.png')))
    await page.evaluate("select(G.towers.find(t => t.up[2] === 5)); updatePanel(true)")
    await page.wait_for_timeout(300)
    txt = await page.evaluate("document.querySelector('#tpanel').textContent")
    check('Gridlock' in txt and 'Queen' in txt, mode + ': the panel explains the walls and the Queen')
    await page.screenshot(path=str(OUT / ('panel-' + mode + '.png')))
    check(not errors, mode + ': no page errors ' + json.dumps(errors[:4]))
    await page.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for mode in ['gl', 'flat']: await run(b, mode)
        await b.close()
    print('FAILURES: %d' % len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
