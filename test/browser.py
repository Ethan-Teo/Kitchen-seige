import asyncio, sys, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(ROOT / 'dist' / 'test.html')
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ks-shots')
OUT.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errors = []
        page = await b.new_page(viewport={'width': 1366, 'height': 820}, device_scale_factor=1)
        page.on('console', lambda m: errors.append(('console.' + m.type, m.text)) if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: errors.append(('pageerror', str(e))))
        await page.goto(URL)
        await page.wait_for_timeout(1800)
        await page.screenshot(path=str(OUT / '01-menu.png'))
        await page.click('#btn-play')
        await page.wait_for_timeout(500)
        await page.screenshot(path=str(OUT / '02-maps.png'))
        await page.click('.map-card >> nth=0')
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / '03-difficulty.png'))
        await page.click('.modal .btn-primary')
        await page.wait_for_timeout(600)
        # place towers through the page's own functions, then run some rounds fast
        await page.evaluate('''() => {
          Admin.maxMastery();
          G.cash = 200000;
          const spots = [['knife',228,210],['knife',192,444],['toaster',894,426],['grill',894,500],['micro',678,400],['blender',156,390],['freezer',174,516],['espresso',678,282],['bread',470,160],['siphon',1040,420]];
          const put = (type, x, y) => { for (let r=0;r<260;r+=10) for (let an=0;an<6.28;an+=0.5){ const t = placeTower(type, x+Math.cos(an)*r, y+Math.sin(an)*r); if (t) return t; } };
          for (const [t,x,y] of spots) put(t,x,y);
          const T = G.towers;
          const ups = [[3,0,2],[0,4,2],[4,2,0],[2,4,0],[4,0,2],[2,0,3],[0,2,3],[3,0,2],[2,0,3],[2,4,0]];
          T.forEach((t,i) => { const u = ups[i]; for (let p=0;p<3;p++) for (let k=0;k<u[p];k++) upgradeTower(t,p); });
          Admin.setRound(36);
          startRound();
        }''')
        await page.wait_for_timeout(9000)
        await page.screenshot(path=str(OUT / '04-game.png'))
        # select a tower to show the upgrade panel
        await page.evaluate('() => { select(G.towers[0]); }')
        await page.wait_for_timeout(400)
        await page.screenshot(path=str(OUT / '05-panel.png'))
        # placement ghost
        await page.evaluate('() => { select(null); startPlacing("toaster"); }')
        await page.mouse.move(700, 500)
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / '06-ghost.png'))
        await page.keyboard.press('Escape')
        # boss + vehicles + paragon
        await page.evaluate('''() => {
          G.admin.infCash = true;
          const k = G.towers[0];
          const put = (type, x, y) => { for (let r=0;r<260;r+=10) for (let an=0;an<6.28;an+=0.5){ const t = placeTower(type, x+Math.cos(an)*r, y+Math.sin(an)*r); if (t) return t; } };
          const a = put('knife', 330, 420), b = put('knife', 370, 640);
          for (let i=0;i<5;i++){ upgradeTower(k,0); upgradeTower(a,1); upgradeTower(b,2); }
          makeParagon(k);
          Admin.killAll(); G.enemies = [];
          G.roundActive = false;
          Admin.setRound(60); startRound();
        }''')
        await page.wait_for_timeout(7000)
        await page.screenshot(path=str(OUT / '07-boss.png'))
        await page.evaluate('() => { select(G.towers.find(t=>t.paragon)); }')
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / '08-paragon-panel.png'))
        # admin via typing the code
        await page.keyboard.type('4334')
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / '09-admin.png'))
        await page.click('#admin header button')
        # pause & exit to menu, then mastery
        await page.evaluate('() => pauseGame()')
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / '10-pause.png'))
        await page.evaluate('() => { closeModal(); G.paused=false; exitToMenu(); }')
        await page.wait_for_timeout(400)
        await page.click('#btn-mastery')
        await page.wait_for_timeout(400)
        await page.screenshot(path=str(OUT / '11-mastery.png'), full_page=False)
        await page.click('[data-tab=pests]')
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / '12-pests.png'))
        await page.click('[data-tab=perks]')
        await page.wait_for_timeout(200)
        await page.screenshot(path=str(OUT / '13-perks.png'))

        # mobile
        m = await b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        m.on('pageerror', lambda e: errors.append(('mobile pageerror', str(e))))
        await m.goto(URL)
        await m.wait_for_timeout(1500)
        await m.screenshot(path=str(OUT / '20-m-menu.png'))
        await m.evaluate('() => { Store.remove(LS_GAME); startNewGame("diner","medium",false); }')
        await m.wait_for_timeout(500)
        await m.evaluate('() => { G.cash = 5000; startRound(); }')
        await m.wait_for_timeout(4000)
        await m.screenshot(path=str(OUT / '21-m-game.png'), full_page=True)
        dims = await m.evaluate('() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })')
        print('mobile widths', dims)
        await b.close()
        print('ERRORS:', len(errors))
        for e in errors[:30]: print(e)

asyncio.run(main())
