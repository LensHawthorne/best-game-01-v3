// UI hit-testing: where a click lands, and what it means. Drawing lives in
// render.js; this file only answers "what did the player click?".
import { HARDPOINTS, TURRET_ORDER, ABILITY_ORDER } from './config.js';

function inRect(x, y, rx, ry, rw, rh) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

/** During play: hardpoints, the build bar, the ability buttons, the start-wave area. */
export function hitPlay(x, y, world) {
  for (let i = 0; i < HARDPOINTS.length; i += 1) {
    const hp = HARDPOINTS[i];
    if (Math.hypot(x - hp.x, y - hp.y) < 26) return { kind: 'hardpoint', slot: i };
  }
  for (let i = 0; i < TURRET_ORDER.length; i += 1) {
    if (inRect(x, y, 24 + i * 168, 660, 160, 40)) return { kind: 'turret-type', type: TURRET_ORDER[i] };
  }
  for (let i = 0; i < ABILITY_ORDER.length; i += 1) {
    if (inRect(x, y, 716 + i * 176, 660, 168, 40)) return { kind: 'ability', key: ABILITY_ORDER[i] };
  }
  return { kind: 'sky', x, y };
}

/** The big Start Wave button area during the build phase. */
export function hitStartWave(x, y, world) {
  if (world.phase === 'build' && inRect(x, y, 480, 560, 320, 56)) return true;
  return false;
}

export function hitTitle(x, y) {
  return true; // any click on the title starts the game
}

export function hitEnd(x, y) {
  return true; // any click on an end screen restarts
}
