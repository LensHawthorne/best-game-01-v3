// Screenshot scenes behind ?shot=title|play|victory|defeat. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (build a sensible dock, launch waves, fire the lightning
// at the densest cluster, repair when the hull is low), so the frame is what a
// real game looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_VICTORY, SCREEN_DEFEAT } from './render.js';
import { resetWorld, stepWorld, startWave, placeTurret, upgradeTurret, castLightning, castRepair } from './world.js';

// A sensible opening build: flak on the flanks, harpoons in the middle.
const OPENING = [
  { slot: 1, type: 'flak' }, { slot: 2, type: 'harpoon' },
  { slot: 5, type: 'flak' }, { slot: 6, type: 'harpoon' },
  { slot: 0, type: 'coil' }, { slot: 3, type: 'frost' },
  { slot: 4, type: 'flak' }, { slot: 7, type: 'harpoon' },
];

function autopilotBuild(world) {
  // Place the opening dock, as far as salvage reaches; later build phases
  // fill the slots that were still empty and then upgrade.
  for (const b of OPENING) {
    if (!world.turrets.some((t) => t.slot === b.slot)) placeTurret(world, b.slot, b.type);
  }
  for (let round = 0; round < 3; round += 1) {
    for (const t of world.turrets) upgradeTurret(world, t.slot);
  }
}

function autopilotStep(world) {
  // Lightning at the densest cluster every time it is ready.
  if (world.enemies.length >= 4) {
    let best = null; let bestCount = 0;
    for (const e of world.enemies) {
      let count = 0;
      for (const o of world.enemies) {
        if (Math.hypot(o.x - e.x, o.y - e.y) < 100) count += 1;
      }
      if (count > bestCount) { bestCount = count; best = e; }
    }
    if (best && bestCount >= 4) castLightning(world, best.x, best.y);
  }
  if (world.hull < 55) castRepair(world);
  // Build first, then launch: a dock that never finishes loses.
  if (world.phase === 'build') { autopilotBuild(world); startWave(world); }
}

function simulate(world, seconds, pilot) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (pilot) pilot(world);
    stepWorld(world, STEP);
    if (world.screen === 'victory' || world.screen === 'defeat') break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. title: the port idling. play: mid-wave-4 action.
 * victory: a full game the autopilot really wins. defeat: a dock left
 * undefended, so the pirates really break through.
 */
export function stageShot(name, world, seed) {
  resetWorld(world, seed);
  if (name === 'title' || !name) {
    simulate(world, 5, null);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    world.screen = 'play';
    autopilotBuild(world);
    // Mid-wave 4: a fuller dock, a busier sky.
    simulate(world, 80, autopilotStep);
    return { screen: SCREEN_PLAY, best: world.score };
  }
  if (name === 'victory') {
    world.screen = 'play';
    autopilotBuild(world);
    simulate(world, 900, autopilotStep);
    return { screen: world.screen === 'victory' ? SCREEN_VICTORY : SCREEN_PLAY, best: world.score };
  }
  // defeat: no turrets at all, waves launched on sight.
  world.screen = 'play';
  simulate(world, 900, (w) => { if (w.phase === 'build') startWave(w); });
  return { screen: world.screen === 'defeat' ? SCREEN_DEFEAT : SCREEN_PLAY, best: world.score };
}
