"""3D models: every appliance at every build (and its paragon, and every head chef at every level look) is built
and drawn with the WebGL engine, firing and at rest, turned every way; no build may throw, every model must have
sensible bounds, and the 3D pictures must actually land in the atlas (the pixels under each are checked).
Usage: python3 test/models3d.py"""
import asyncio, sys, json, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(ROOT / 'dist' / 'test.html')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        errors = []
        page = await b.new_page(viewport={'width': 900, 'height': 700}, device_scale_factor=1)
        page.on('pageerror', lambda e: errors.append(('pageerror', str(e))))
        page.on('console', lambda m: errors.append(('console.' + m.type, m.text)) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        # this headless browser draws WebGL in software; the game would fall back to its flat-built look there
        await page.add_init_script('window.KS_GL_SOFT = true')
        await page.goto(URL)
        await page.wait_for_timeout(1200)
        res = await page.evaluate('''() => {
          const out = { builds: 0, renders: 0, fails: [], blank: [], models: 0 };
          if (!GL3D.ok()) return { error: 'no webgl2' };
          const cv = document.createElement('canvas'); cv.width = 400; cv.height = 400;
          const g = cv.getContext('2d', { willReadFrequently: true });
          const builds = [];
          for (let a = 0; a <= 5; a++) for (let b2 = 0; b2 <= 5; b2++) for (let c = 0; c <= 5; c++){
            const u = [a, b2, c], nz = u.filter(v => v > 0).length, hi = u.filter(v => v > 2).length;
            if (nz <= 2 && hi <= 1) builds.push(u);
          }
          const types = TOWER_ORDER.slice().concat(HERO_ORDER);
          let id = 50000;
          for (const ty of types){
            const T = TOWERS[ty];
            const list = T.hero ? [1, 10, 15, 20].map(l => ({ up: [0, 0, 0], level: l })) : builds.map(u => ({ up: u })).concat([{ up: [5, 5, 5], par: true }]);
            for (const L of list){
              for (const fire of [0, 0.15]){
                const t = { id: id++, type: ty, x: 200, y: 200, size: T.size, up: L.up, paragon: !!L.par, degree: L.par ? 60 : 0, level: L.level || 1, hero: !!T.hero,
                  aim: (id % 8) * 0.785 - 3.1, aim2: (id % 5) * 1.2 - 3, aimed: true, fireAnim: fire, fire2: fire, rank: id % 3 ? 0 : 9, boost: {}, s: { submerged: id % 2 === 0 } };
                if (T.flyer){ t.flyMode = FLY_MODES[T.flyer][0].id; t.fx = 200; t.fy = 200; }
                try {
                  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 400, 400); g.setTransform(1.6, 0, 0, 1.6, 0, 0);
                  Art.beginFrame();
                  const pre = GL3D.stats().models;
                  if (T.flyer) Art.drawFlyer(g, t, 1 + id * 0.01, {}); else { Art.drawShadows(g, [t], 1 + id * 0.01); Art.drawTower(g, t, 1 + id * 0.01, {}); }
                  if (GL3D.stats().models > pre) out.builds++;
                  out.renders++;
                  /* something was drawn round the spot */
                  const d = g.getImageData(200 * 1.6 - 40, 200 * 1.6 - 40, 80, 80).data;
                  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++;
                  if (n < 300) out.blank.push(ty + ' ' + L.up.join('') + (L.par ? 'P' : '') + (L.level ? ' L' + L.level : '') + ' ' + n);
                } catch (e) { out.fails.push(ty + ' ' + L.up.join('') + (L.par ? 'P' : '') + (L.level ? ' L' + L.level : '') + ': ' + e.message); }
              }
            }
          }
          out.models = GL3D.stats().models;
          out.stats = GL3D.stats();
          /* the kitchens' props: every solid decoration and every water feature gets its 3D pictures, at a thumbnail's
             scale and at a big screen's, and none is empty */
          out.props = 0;
          for (const k of [0.32, 1, 3.4]) for (const id of MAP_ORDER){
            try {
              const c = MapArt.render(id, k, { split: true }), M = MAPS[id];
              const want = M.deco.filter(d => d.solid).length + (M.water || []).reduce((n, w) => n + ({ sink: 1, soda: 3, puddle: 1, melt: 4 }[w.style] || 0), 0);
              if (!c.props || c.props.length !== want) out.fails.push('props ' + id + ' at ' + k + ': ' + (c.props ? c.props.length : 'none') + ' of ' + want);
              for (const p of c.props || []){
                out.props++;
                const g2 = p.img.getContext('2d'), d = g2.getImageData(0, 0, p.img.width, p.img.height).data;
                let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++;
                if (n < p.img.width * p.img.height * 0.04) out.blank.push('prop ' + id + ' at ' + k + ' ' + Math.round(p.x) + ',' + Math.round(p.y) + ' ' + n);
                if (!(p.w > 4 && p.h > 4 && p.w < 400 && p.h < 400)) out.fails.push('prop size ' + id + ' ' + p.w + 'x' + p.h);
              }
              const flat = MapArt.render(id, k);
              if (flat.props && flat.props.length) out.fails.push('baked map still lists props ' + id);
            } catch (e) { out.fails.push('map ' + id + ' at ' + k + ': ' + e.message); }
          }
          return out;
        }''')
        print(json.dumps({k: (v if not isinstance(v, list) else v[:12]) for k, v in res.items()}, indent=1))
        ok = 'error' not in res and not res['fails'] and not res['blank'] and not errors
        print('page errors:', errors[:10])
        print('all passed' if ok else 'FAILURES')
        await b.close()
        sys.exit(0 if ok else 1)

asyncio.run(main())
