# Kitchen Siege

A kitchen tower defense: pests march along the trails of a kitchen and your appliances cook them before they reach the pantry.

**Play it:** open `index.html` in a browser, or turn on GitHub Pages for this repo (Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`) and play it at `https://<your-name>.github.io/Kitchen-seige/`.

The whole game is that one file. It needs no server and saves to your browser.

## What's in it
- 29 appliances with three upgrade paths each and a paragon, plus head chefs
- Game modes on every difficulty, weekly events, Boss Battles, the Tasting Menu, daily challenges and a Sandbox
- A tower builder: design attacks, abilities and upgrade paths, draw your own projectiles and model your own 3D appliance bodies
- Six save slots, and save codes to move your progress between devices

## Working on it
The source is in `src/`. `python3 build.py` puts every script and the stylesheet into one page:

- `dist/kitchen-siege-standalone.html` is the page to host. Copy it over `index.html` before you commit.
- `dist/test.html` is the same game for the browser tests.

Tests:
- `node test/<name>.js` runs a game test (no browser needed), for example `node test/rounds.js`.
- `python3 test/<name>.py` runs a browser test with Playwright and Chromium: `browser`, `flows`, `new_towers`, `utensils_ui`, `spray_ui`, `models3d`.

GitHub Actions runs the game tests on every push (`.github/workflows/tests.yml`).
