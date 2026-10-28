#!/usr/bin/env python3
"""Inline the stylesheet and scripts into a single artifact page."""
import pathlib, sys
root = pathlib.Path(__file__).parent
src = root / 'src'
shell = (src / 'shell.html').read_text()
css = (src / 'style.css').read_text()
js = '\n'.join((src / f).read_text() for f in ['data.js', 'engine.js', 'paragon.js', 'more.js', 'more_para.js', 'mixer.js', 'chess.js', 'utensils.js', 'spray.js', 'custom.js', 'objects.js', 'bodies.js', 'kitchens.js', 'meta.js', 'modes.js', 'events.js', 'tasting.js', 'bosses.js', 'heroes.js', 'admin_unit.js', 'sandbox.js', 'pests.js', 'expeditions.js', 'art_map.js', 'art.js', 'gl3d.js', 'models3d.js', 'props3d.js', 'ui_custom.js', 'ui_objects.js', 'ui_bodies.js', 'ui_kitchens.js', 'ui_sandbox.js', 'ui_music.js', 'ui_tutorial.js', 'ui_meta.js', 'ui_events.js', 'ui_expeditions.js', 'ui_heroes.js', 'ui.js'])
if '</script' in js.lower():
    sys.exit('script contains a closing script tag')
out = shell.replace('/*__CSS__*/', css).replace('/*__JS__*/', js)
dist = root / 'dist'
dist.mkdir(exist_ok=True)
(dist / 'kitchen-siege.html').write_text(out)
# a standalone copy with a document skeleton, for local browser testing
(dist / 'test.html').write_text('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>' + out + '</body></html>')
# the whole game as one ordinary web page, to copy, keep or host anywhere: title, fonts and styles in the head
cut = out.index('</style>', out.index('<style>')) + len('</style>')
(dist / 'kitchen-siege-standalone.html').write_text('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  + out[:cut] + '\n<style>[hidden]{display:none!important}body{margin:0}</style>\n</head>\n<body>\n' + out[cut:].lstrip('\n') + '\n</body>\n</html>\n')
(dist / 'bundle.js').write_text(js)
print('built', len(out) // 1024, 'KB')
