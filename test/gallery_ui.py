"""The gallery in the browser: browsing, Get, Play, pasting a code, sharing (code + GitHub link), and a shared shelf through a stand-in store.
Usage: python3 test/gallery_ui.py [shots dir]"""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(ROOT / 'dist' / 'test.html')
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ks-gallery'); OUT.mkdir(parents=True, exist_ok=True)
fails = []
def check(ok, what):
    print(('PASS ' if ok else 'FAIL ') + what)
    if not ok: fails.append(what)
MOCK = """(() => {
  const docs = {}; const subs = [];
  const snap = () => ({ docs: Object.keys(docs).map(id => ({ id, exists: true, data: () => docs[id] })) });
  const fire = () => subs.forEach(f => f(snap()));
  const col = { orderBy(){ return col; }, limit(){ return col; }, onSnapshot(f){ subs.push(f); f(snap()); return () => {}; },
    async add(d){ const id = 'd' + Object.keys(docs).length; docs[id] = d; fire(); return { id }; } };
  Store.cloud = { uid: 'me', ref: () => ({ async set(){} }), db: { collection(){ return col; }, doc(p){ return { async set(){}, async update(){}, async get(){ return { exists: false }; }, async delete(){ delete docs[p.split('/')[1]]; fire(); } }; } } };
  window.__docs = docs;
})()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page(viewport={'width': 1366, 'height': 900})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        await page.goto(URL); await page.wait_for_timeout(1200)
        await page.click('#btn-gallery'); await page.wait_for_timeout(500)
        n = await page.evaluate("document.querySelectorAll('.gal-card').length")
        check(n >= 7, 'the gallery shows the featured entries (%d)' % n)
        check(await page.evaluate("document.querySelectorAll('.gal-card canvas.gal-mini').length") >= 3, 'kitchens have little maps')
        await page.screenshot(path=str(OUT / 'gallery.png'))
        await page.click('.gal-kinds button:has-text("Kitchens")'); await page.wait_for_timeout(200)
        check(await page.evaluate("document.querySelectorAll('.gal-card').length") == 3, 'the Kitchens filter shows the three kitchens')
        await page.click('.gal-card[data-id="k-twin"] .gal-get'); await page.wait_for_timeout(300)
        check(await page.evaluate("kitchenList().some(id => kitchenById(id).name === 'Twin Doors')"), 'Get adds Twin Doors to your kitchens')
        await page.click('.gal-card[data-id="k-twin"] button:has-text("Play")'); await page.wait_for_timeout(400)
        check(await page.evaluate("document.querySelector('.modal h2').textContent") == 'Twin Doors', 'Play asks for a difficulty on it')
        await page.click('.modal .btn-primary'); await page.wait_for_timeout(700)
        check(await page.evaluate("G.paths.length === 2 && G.map.name === 'Twin Doors'"), 'and starts a game on its two trails')
        await page.evaluate("exitToMenu()"); await page.wait_for_timeout(300)
        # paste a code
        await page.click('#btn-gallery'); await page.wait_for_timeout(400)
        code = await page.evaluate("bodyCode(Object.assign(prefabBody('robot'), { name: 'Pasted Bot' }))")
        await page.fill('.gal-paste', code); await page.click('button:has-text("Add from code")'); await page.wait_for_timeout(300)
        check(await page.evaluate("bodyList().some(id => bodyById(id).name === 'Pasted Bot')"), 'a pasted code is added')
        # share without a store: code and GitHub link
        await page.click('.modal .btn-primary:has-text("Share yours")'); await page.wait_for_timeout(300)
        await page.fill('.gal-form input[aria-label="By"]', 'Tester')
        await page.click('.modal .btn-primary:has-text("Get the code")'); await page.wait_for_timeout(300)
        href = await page.evaluate("(document.querySelector('.gal-out a') || {}).href || ''")
        check(href.startswith('https://github.com/Ethan-Teo/Kitchen-seige/issues/new'), 'outside Claude, sharing gives a GitHub issue link')
        check((await page.evaluate("document.querySelector('.gal-out textarea').value")).startswith('KS'), 'and the code')
        await page.click('.modal .acts button:has-text("Back")'); await page.wait_for_timeout(300)
        await page.evaluate("closeModal()")
        # inside Claude: a shared shelf
        await page.evaluate(MOCK)
        await page.click('#btn-gallery'); await page.wait_for_timeout(400)
        await page.click('.modal .btn-primary:has-text("Share yours")'); await page.wait_for_timeout(300)
        await page.select_option('.gal-form select', label='Body: Pasted Bot')
        await page.fill('.gal-form input[aria-label="About it"]', 'From the test')
        await page.click('.modal .btn-primary:has-text("Share")'); await page.wait_for_timeout(500)
        check(await page.evaluate("Object.keys(window.__docs).length") == 1, 'inside Claude, sharing posts to the shared shelf')
        await page.click('.gal-kinds button:has-text("All")'); await page.wait_for_timeout(200)
        shared = await page.evaluate("[...document.querySelectorAll('.gal-card .gal-by')].filter(e => /shared here/.test(e.textContent)).length")
        check(shared == 1, 'and it shows on the shelf')
        await page.click('.gal-card button:has-text("Remove")'); await page.wait_for_timeout(300)
        check(await page.evaluate("Object.keys(window.__docs).length") == 0, 'you can remove your own')
        await page.screenshot(path=str(OUT / 'shared.png'))
        check(not errors, 'no page errors ' + json.dumps(errors[:4]))
        await b.close()
    print('FAILURES: %d' % len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
