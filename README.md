# Kitchen Siege

A kitchen tower defense: pests march along the trails of a kitchen and your appliances cook them before they reach the pantry.

**Play it:** open `index.html` in a browser, or turn on GitHub Pages for this repo (Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`) and play it at `https://<your-name>.github.io/Kitchen-seige/`.

The whole game is that one file. It needs no server and saves to your browser.

## What's in it
- 29 appliances with three upgrade paths each and a paragon, plus head chefs
- Game modes on every difficulty, weekly events, Boss Battles, the Tasting Menu, Expeditions (five kitchens in a row), daily challenges and a Sandbox
- A tower builder: design attacks, abilities and upgrade paths, draw your own projectiles and model your own 3D appliance bodies
- Co-op for two players: each with their own cash and appliances, sharing the lives
- A Kitchen Editor for kitchens of your own, and a community Gallery to share what you make
- Game stats and a build replay after every game, colour-blind mode and larger text
- Six save slots, and save codes to move your progress between devices

## Co-op
Menu → **Co-op**. One player hosts and picks the kitchen; the other joins.

- On the website (or the file opened locally) the two of you connect directly: the host copies an **invite code** to the guest, the guest pastes it and sends back a **reply code**, and the game connects. It uses WebRTC with public STUN servers, so it works across most home networks; very strict networks (some school or office ones) can block it.
- Inside Claude, the host gets a four-letter **room code** instead.

The host's game is the real one and saves as usual; the guest sees it live and everything the guest does is sent to the host.

## The Gallery
The in-game Gallery shows the entries in `gallery/gallery.json`. To add one, either open a [Gallery submission issue](../../issues/new?template=gallery.md) (the game's **Share yours → Submit on GitHub** button fills one in), or send a pull request adding an entry to `gallery/gallery.json`:

```json
{ "id": "k-my-kitchen", "name": "My Kitchen", "by": "Your name", "blurb": "One line about it.", "code": "KSM1:...", "at": 1793145600000 }
```

`id` is short and unique, `code` is a share code from the game, and `at` is a timestamp. `node test/gallery.js` checks every entry. The live site reads the file directly, so new entries show without rebuilding; rebuilding also bakes them into `index.html` for offline play.

## Working on it
The source is in `src/`. `python3 build.py` puts every script and the stylesheet into one page:

- `dist/kitchen-siege-standalone.html` is the page to host. Copy it over `index.html` before you commit.
- `dist/test.html` is the same game for the browser tests.

Tests:
- `node test/<name>.js` runs a game test (no browser needed), for example `node test/rounds.js`.
- `python3 test/<name>.py` runs a browser test with Playwright and Chromium: `browser`, `flows`, `new_towers`, `utensils_ui`, `spray_ui`, `models3d`, `kitchens_ui`, `expeditions_ui`, `polish_ui`, `gallery_ui`, `coop_ui`.

GitHub Actions runs the game tests on every push (`.github/workflows/tests.yml`).
