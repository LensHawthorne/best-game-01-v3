// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, victory and defeat.
//
// ?seed=N fixes the spawn pattern. ?shot=title|play|victory|defeat (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP, TURRETS, TURRET_ORDER, ABILITIES } from './config.js';
import { createWorld, resetWorld, stepWorld, startWave, placeTurret, upgradeTurret, sellTurret, castLightning, castRepair, castOverclock, EVENT_WIN, EVENT_LOSE } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_VICTORY, SCREEN_DEFEAT } from './render.js';
import { createAudio } from './audio.js';
import { hitPlay, hitStartWave } from './ui.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}
world.best = readBest();

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const scene = stageShot(name, world, seed);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let aimingLightning = false;
  let accumulator = 0;
  let last = performance.now();

  function startGame() {
    resetWorld(world, Math.floor(Math.random() * 4294967296));
    world.best = readBest();
    world.screen = 'play';
    world.phase = 'build';
    screen = SCREEN_PLAY;
    aimingLightning = false;
    accumulator = 0;
    announce('Playing. Build turrets, then launch wave 1.');
  }

  function endGame(won) {
    screen = won ? SCREEN_VICTORY : SCREEN_DEFEAT;
    if (world.score > world.best) {
      world.best = world.score;
      saveBest(world.best);
    }
    announce(won ? `Victory! Score ${world.score}.` : `Defeat on wave ${world.wave}. Score ${world.score}.`);
    if (won) audio.victory(); else audio.defeat();
  }

  function handleClick(click) {
    audio.unlock();
    if (screen === SCREEN_TITLE) { startGame(); return; }
    if (screen === SCREEN_VICTORY || screen === SCREEN_DEFEAT) { startGame(); return; }
    if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; world.screen = 'play'; return; }
    // Play screen.
    if (hitStartWave(click.x, click.y, world)) {
      if (startWave(world)) audio.horn();
      return;
    }
    const hit = hitPlay(click.x, click.y, world);
    if (hit.kind === 'hardpoint') {
      const slot = hit.slot;
      const existing = world.turrets.find((t) => t.slot === slot);
      if (existing) {
        world.selectedSlot = slot;
      } else if (world.selectedType) {
        if (placeTurret(world, slot, world.selectedType)) {
          audio.build();
          world.selectedSlot = slot;
        } else {
          audio.error();
        }
      }
      return;
    }
    if (hit.kind === 'turret-type') {
      world.selectedType = hit.type;
      return;
    }
    if (hit.kind === 'ability') {
      useAbilityKey(hit.key);
      return;
    }
    // A click on the sky: lightning if aiming, else deselect.
    if (aimingLightning) {
      if (castLightning(world, hit.x, hit.y)) audio.lightning();
      aimingLightning = false;
      return;
    }
    world.selectedSlot = -1;
  }

  function useAbilityKey(key) {
    if (key === 'lightning') {
      if (world.economy.abilities.lightning.readyAt <= world.time) {
        aimingLightning = true;
        announce('Lightning armed — click the sky to strike.');
      } else {
        audio.error();
      }
      return;
    }
    if (key === 'repair') {
      if (castRepair(world)) audio.repair(); else audio.error();
      return;
    }
    if (key === 'overclock') {
      if (castOverclock(world)) audio.zap(); else audio.error();
    }
  }

  function handleKey(key) {
    if (key === 'm') {
      audio.setMuted(!audio.isMuted());
      world.muted = audio.isMuted();
      return;
    }
    if (screen === SCREEN_TITLE) {
      if (key === ' ' || key === 'enter') { audio.unlock(); startGame(); }
      return;
    }
    if (screen === SCREEN_VICTORY || screen === SCREEN_DEFEAT) {
      if (key === ' ' || key === 'enter' || key === 'r') { audio.unlock(); startGame(); }
      return;
    }
    if (key === 'p' || key === 'escape') {
      if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; world.screen = 'play'; }
      else if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; world.screen = 'paused'; }
      if (key === 'escape') { aimingLightning = false; world.selectedSlot = -1; }
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (key === 'r') { startGame(); return; }
    if (key === ' ') {
      if (world.phase === 'build' && startWave(world)) audio.horn();
      return;
    }
    if (key >= '1' && key <= '4') {
      world.selectedType = TURRET_ORDER[Number(key) - 1];
      return;
    }
    if (key === 'q') { useAbilityKey('lightning'); return; }
    if (key === 'w') { useAbilityKey('repair'); return; }
    if (key === 'e') { useAbilityKey('overclock'); return; }
    if (key === 'u' && world.selectedSlot >= 0) {
      if (upgradeTurret(world, world.selectedSlot)) audio.build(); else audio.error();
      return;
    }
    if (key === 'x' && world.selectedSlot >= 0) {
      if (sellTurret(world, world.selectedSlot)) { audio.salvage(); world.selectedSlot = -1; }
      return;
    }
  }

  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    for (const click of input.takeClicks()) handleClick(click);
    for (const key of input.takeKeys()) handleKey(key);
    if (screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = stepWorld(world, STEP);
        if (events & EVENT_WIN) endGame(true);
        else if (events & EVENT_LOSE) endGame(false);
        if (world.screen !== 'play') break;
      }
      // Sound effects for turret fire are folded into the world step's
      // projectile creation; the loop keeps the music alive.
    } else if (screen === SCREEN_TITLE || screen === SCREEN_VICTORY || screen === SCREEN_DEFEAT) {
      // Let the sky drift behind the menus.
      world.time += dt;
      world.particles.step(dt);
    }
    renderer.draw(world, screen, world.best);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
