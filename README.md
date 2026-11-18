# Lumenhold — Tower Defence of the Last Lantern

An original HTML5 tower-defence game, built for make.fun's **best-game-01**
bounty. No libraries, no network, no assets: one canvas, plain ES modules,
and WebAudio sounds synthesized in code.

## The game

Night falls on a small garden and shades march down the winding road toward
the Last Lantern. Build towers on the grass, spend the gold the shades drop,
and hold the lantern through **15 waves** — a boss, the Dreadmaw, lumbers in
every 5th wave.

- **3 tower types, 3 upgrade levels each**
  - **Spark Spire (50g)** — fast bolts, cheap and reliable.
  - **Frost Obelisk (70g)** — chills foes, slowing them 45%.
  - **Ember Cannon (110g)** — slow shells that burst and splash.
- **Economy that matters** — kill bounties, a wave-clear bonus, and 5% bank
  interest (capped) on the gold you hold when a wave clears. Towers sell
  back at 70%.
- **5 enemy kinds** — quick Motes, steady Glooms, speedy Darts, armoured
  Bulwarks (they shrug off a little of every hit), and the Dreadmaw boss.
- **Complete loop** — title screen with how-to-play, HUD (gold, lives,
  wave, score, foes left), wave banner, pause, 1×/2× speed, mute, victory
  screen with stars, game-over screen with stats, restart, best score kept
  in `localStorage`.
- **Feel** — particles, muzzle flashes, hit flashes, floating gold text,
  screen shake on leaks, and synthesized sound effects plus a quiet night
  pad (WebAudio, mutable with `M`).

## Controls

| Input | Action |
| --- | --- |
| Click tower card / `1` `2` `3` | Choose tower type |
| Click grass tile | Build (shows range preview first) |
| Click a built tower | Select it — upgrade (`U`) or sell |
| `Space` / Send Wave button | Start the next wave |
| `P` | Pause · `F` speed · `M` sound · `Esc` deselect |

## Play it

```sh
node serve.ts   # serves game/ at http://localhost:8080
```

Or open `game/index.html` from any static server. The game runs fully
offline; it loads nothing from the network.

## Layout

```
game/
  index.html        page shell + canvas
  src/
    config.js       all tuning: towers, enemies, waves, palette
    random.js       seeded RNG (deterministic screenshot scenes)
    audio.js        synthesized WebAudio SFX + night pad
    path.js         road waypoints, buildable grid, garden decor
    enemies.js      shade movement, slowing, damage, death
    towers.js       tower targeting (furthest along path), firing
    waves.js        wave composition (15 waves, boss every 5th)
    game.js         state machine, economy, combat, projectiles
    render.js       every pixel: world, HUD, shop, menus
    input.js        mouse + keyboard
    shots.js        deterministic ?shot=start|play|end scenes
    main.js         bootstrap + frame loop
screenshots/       1-start, 2-play, 3-end (real renders of the game)
main.ts             hands game/ + screenshots/ to /output with a dossier
vendor/            makefun-game.ts, the kit's dossier library, unchanged
```

## Screenshots

The three screenshots are real renders of the game's own code, taken in
headless Chromium at 1280×720 via the deterministic `?shot=` scenes
(`shots.json`): the title screen, mid-wave play with the HUD, and the
victory screen with stats and Play Again.

## License

MIT — see `LICENSE`.
