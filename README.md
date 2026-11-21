[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/mutroll/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/mutroll/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

The Quiet Archive is a top-down stealth game that plays offline in a desktop browser from static files: sneak through a night museum past five patrolling archivist-guards and their torch cones, hide behind shelves and in dark shadow patches, toss pebbles to pull guards away, collect three seal fragments, and reach the green exit unseen. Guards patrol routes you can learn, grow suspicious before they raise the alarm, and give chase only when their detection meter fills — so patience, timing and a well-thrown pebble beat a sprint. Play it with `node serve.ts` and open http://localhost:8080.

## How to play

- **WASD / arrow keys** — move. **Shift** — sneak (slower, quieter, harder to spot).
- **Click** — toss a pebble; the nearest guard goes to investigate the noise. You carry 3.
- **Goal** — reach the green EXIT unseen. The 3 gold seal fragments are optional, and taking all three makes it a flawless heist.
- **R** — restart, **P** — pause, **M** — mute.

## Files

- `game/` — the game itself: `index.html` plus `src/` modules, one job each (`level.js` the museum floor, `guards.js` patrols and vision, `player.js` movement and pebbles, `world.js` the simulation, `render.js` the canvas painter, `audio.js` synthesized sound, `shots.js` the staged screenshot scenes, `main.js` the boot and loop).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`.
- `screenshots/` — four real renders of the game's own code.
