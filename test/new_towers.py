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
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUT / 'n01-menu.png'))
        # icon sheet
        await page.evaluate('''() => {
          const wrap = document.createElement('div');
          wrap.id = 'sheet';
          wrap.style.cssText = 'position:fixed;inset:0;background:#f4efe6;z-index:99;display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:8px;overflow:auto';
          const ups = [[0,0,0],[3,0,0],[5,2,0],[0,3,0],[2,5,0],[0,0,3],[0,2,5]];
          for (const type of TOWER_ORDER){
            for (const u of ups){
              const c = Art.towerIcon(type, 96, u, false);
              const cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c,0,0);
              cv.style.cssText = 'width:96px;height:96px;background:#e8dcc6;border-radius:8px';
              cv.title = type + u.join('');
              wrap.append(cv);
            }
          }
          document.body.append(wrap);
        }''')
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / 'n02-icons.png'), full_page=False)
        await page.evaluate('() => document.getElementById("sheet").remove()')
        await page.click('#btn-play')
        await page.wait_for_timeout(300)
        await page.click('.map-card >> nth=0')
        await page.wait_for_timeout(300)
        await page.click('.modal .btn-primary')
        await page.wait_for_timeout(600)
        await page.screenshot(path=str(OUT / 'n03-shop.png'))
        await page.evaluate('''() => {
          Admin.maxMastery();
          G.cash = 2000000;
          const put = (type, x, y) => { for (let r=0;r<260;r+=8) for (let an=0;an<6.28;an+=0.4){ const t = placeTower(type, x+Math.cos(an)*r, y+Math.sin(an)*r); if (t) return t; } };
          const plan = [['dish',228,210,[4,0,2]],['dish',192,444,[0,4,2]],['grill',894,426,[4,2,0]],['fryer',894,500,[2,0,4]],['fryer',678,400,[4,0,2]],
            ['mixer',156,390,[4,0,2]],['mixer',470,160,[0,4,2]],['pasta',440,470,[0,2,4]],['pasta',678,282,[2,4,0]],['oven',1040,420,[2,0,4]],['dish',620,620,[0,2,4]],['mixer',720,600,[2,0,4]]];
          for (const [t,x,y,u] of plan){ const tw = put(t,x,y); if (!tw) { console.log('no spot', t); continue; } for (let p=0;p<3;p++) for (let k=0;k<u[p];k++) upgradeTower(tw,p); }
          Admin.setRound(30);
          startRound();
          G.speed = 1;
        }''')
        await page.wait_for_timeout(7000)
        await page.screenshot(path=str(OUT / 'n04-game.png'))
        await page.wait_for_timeout(4000)
        await page.screenshot(path=str(OUT / 'n05-game.png'))
        await page.evaluate('() => { select(G.towers.find(t => t.type === "oven")); }')
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / 'n06-oven-panel.png'))
        await page.click('.spot-row .seg button >> nth=1')
        await page.mouse.move(560, 360)
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / 'n07-spot-pick.png'))
        await page.mouse.click(560, 360)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUT / 'n08-spot-set.png'))
        await page.evaluate('() => { select(G.towers.find(t => t.type === "pasta")); }')
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / 'n09-pasta-panel.png'))
        print('errors:', errors[:20])
        await b.close()

asyncio.run(main())
