# best-game-01-v3

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/LensHawthorne/best-game-01-v3/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/LensHawthorne/best-game-01-v3/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**SKYHARBOR — Hold the Last Skyport.** A tower-defence game for make.fun's
**best-game-01** bounty ($1,000, "Make the best game"). You are the Skykeeper
of the last skyport, a brass-and-timber dock floating above a sea of clouds at
sunset. Sky pirates come in twelve waves. Build turrets on the dock, spend
their salvage, and do not let a single one touch the core. 4 turrets x 3
levels, 8 enemies + 2 bosses, 12 waves, a salvage economy, and 3 abilities.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

## How to play

- **Mouse** — click a hardpoint on the dock to build the selected turret;
  click a turret to select it, then **U** to upgrade or **X** to sell it.
- **1–4** — choose a turret: Flak Cannon, Harpoon Launcher, Storm Coil,
  Frost Vent. Each has three levels.
- **Q** — Lightning Strike (click the sky to smite a spot). **W** — Emergency
  Repair (+30 hull). **E** — Overclock (turrets fire twice as fast).
- **SPACE** — launch the next wave. **P** — pause. **R** — restart. **M** — mute.

## The game

- **12 waves** of 8 pirate kinds: Dartwings, Balloon Raiders, Swifts,
  Ironclads, Bombers, Shieldbearers and phasing Wraiths — plus two bosses,
  the **Dreadnought** (wave 6) and **The Skykraken** (wave 12).
- **Salvage economy**: every pirate destroyed pays salvage; spend it on
  turrets and upgrades between waves.
- **Win** by clearing wave 12 (1–3 stars by hull remaining); **lose** when
  the hull reaches 0. Best score is kept in `localStorage`.
- **Feel**: particles, screen shake, floating damage numbers, and a fully
  procedural WebAudio soundscape — effects and a slow sunset pad, no audio
  files. All art is drawn in code; the game makes no network request.

## Files

| File | Job |
| --- | --- |
| `game/index.html` | The page: one canvas, one module script |
| `game/src/main.js` | Boot, the fixed-step loop, screens, input |
| `game/src/world.js` | Game state and the simulation |
| `game/src/config.js` | Balance, turret/enemy/wave tables, palette |
| `game/src/enemies.js` | Enemy kinds, movement, bosses |
| `game/src/turrets.js` | Turret types, targeting, upgrades |
| `game/src/waves.js` | Wave schedule and clear bonus |
| `game/src/economy.js` | Salvage and the three abilities |
| `game/src/render.js` | Every pixel: sky, port, HUD, screens |
| `game/src/ui.js` | Click hit-testing |
| `game/src/particles.js` | Particles, floating text, shake |
| `game/src/audio.js` | Procedural WebAudio effects and music |
| `game/src/random.js` | Seeded random numbers |
| `game/src/shots.js` | Deterministic screenshot scenes |
| `game/src/input.js` | Mouse and keyboard input |
| `main.ts` | Hands the game in: copies `game/` and `screenshots/`, writes `dossier.json` |

## Screenshots

`?shot=title|play|victory|defeat&seed=N` stages each scene by playing the
real rules forward with an autopilot, so every screenshot is a real render of
the game. The victory shot is a full game the autopilot genuinely wins.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=n1cxkcak&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
