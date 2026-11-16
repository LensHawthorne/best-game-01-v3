// The world: all game state and the fixed-step simulation. Screens live in
// main.js; this file only knows how the game itself plays: waves, turrets,
// enemies, projectiles, abilities, hull, salvage, score, win and loss.
import { STEP, VIEW, CORE, HULL_MAX, START_SALVAGE, TOTAL_WAVES, HARDPOINTS, TURRETS, TURRET_ORDER, ABILITIES, ABILITY_ORDER, ENEMIES, upgradeCost, sellValue } from './config.js';
import { createRandom } from './random.js';
import { createParticles } from './particles.js';
import { createEconomy, spend, earn, useAbility, abilityReady } from './economy.js';
import { spawnEnemy, applyDamage, updateEnemy } from './enemies.js';
import { createTurret, turretStats, updateTurret } from './turrets.js';
import { buildSpawnQueue, waveClearBonus, isLastWave } from './waves.js';

export const EVENT_NONE = 0;
export const EVENT_BREACH = 1;
export const EVENT_WAVE_CLEAR = 2;
export const EVENT_WIN = 4;
export const EVENT_LOSE = 8;

export function createWorld(seed) {
  const rng = createRandom(seed);
  const particles = createParticles();
  const economy = createEconomy(START_SALVAGE);
  return {
    rng, particles, economy,
    time: 0, screen: 'title', phase: 'build',
    wave: 0, hull: HULL_MAX, score: 0, kills: 0, salvageEarned: 0,
    enemies: [], projectiles: [], bolts: [], strikes: [],
    turrets: [], spawnQueue: [], spawnTimer: 0,
    selectedSlot: -1, selectedType: 'flak', hoverSlot: -1,
    lightningTarget: null, banner: null, bannerUntil: 0,
    overclockUntil: 0, victoryStars: 0, best: 0,
    shotsFired: 0, shotsHit: 0, muted: false,
  };
}

export function resetWorld(world, seed) {
  const fresh = createWorld(seed);
  fresh.best = world.best;
  fresh.muted = world.muted;
  Object.keys(fresh).forEach((k) => { world[k] = fresh[k]; });
  world.screen = 'title';
}

function setBanner(world, text, sub, dur = 2.2) {
  world.banner = { text, sub };
  world.bannerUntil = world.time + dur;
}

function fireTurret(world, turret, target, stats, pos) {
  world.shotsFired += 1;
  if (turret.type === 'coil') {
    // Chain lightning: hit the target, then arc to the nearest others.
    let from = { x: pos.x, y: pos.y };
    let current = target;
    const hitSet = new Set();
    for (let i = 0; i < stats.chain && current; i += 1) {
      const dmg = applyDamage(current, stats.damage, world.time);
      world.shotsHit += 1;
      world.particles.sparkle(current.x, current.y, '#7ee7ff');
      world.bolts.push({ x1: from.x, y1: from.y, x2: current.x, y2: current.y, age: 0, life: 0.18 });
      hitSet.add(current.id);
      from = { x: current.x, y: current.y };
      let next = null; let best = Infinity;
      for (const e of world.enemies) {
        if (e.dead || e.reached || e.phased || hitSet.has(e.id)) continue;
        const d = Math.hypot(e.x - from.x, e.y - from.y);
        if (d < 150 && d < best) { best = d; next = e; }
      }
      current = next;
    }
    return;
  }
  if (turret.type === 'frost') {
    // Chill every foe in range; level 3 freezes them briefly.
    for (const e of world.enemies) {
      if (e.dead || e.reached) continue;
      const d = Math.hypot(e.x - pos.x, e.y - pos.y);
      if (d > stats.range) continue;
      applyDamage(e, stats.damage, world.time);
      e.slowUntil = world.time + 1.6;
      if (stats.freeze) e.freezeUntil = world.time + 0.5;
      world.particles.sparkle(e.x, e.y, '#b8f1ff');
    }
    world.shotsHit += 1;
    return;
  }
  // Flak and harpoon fire a moving shell.
  const angle = Math.atan2(target.y - pos.y, target.x - pos.x);
  const speed = TURRETS[turret.type].speed;
  const shots = stats.twin ? [-0.09, 0.09] : [0];
  for (const off of shots) {
    world.projectiles.push({
      x: pos.x + Math.cos(angle) * 22, y: pos.y + Math.sin(angle) * 22,
      vx: Math.cos(angle + off) * speed, vy: Math.sin(angle + off) * speed,
      damage: stats.damage, type: turret.type, pierce: stats.pierce,
      explosive: stats.explosive, color: TURRETS[turret.type].color,
      life: 2.2, hitSet: new Set(),
    });
  }
}

function killEnemy(world, e) {
  world.kills += 1;
  world.score += e.score;
  earn(world.economy, e.salvage);
  world.salvageEarned += e.salvage;
  world.particles.floatText(e.x, e.y - e.radius - 6, `+${e.salvage}`, '#ffd94a');
  world.particles.explosion(e.x, e.y, e.boss);
  if (e.kind === 'bomber') {
    // Bombers go out with a blast that hurts their friends.
    for (const other of world.enemies) {
      if (other === e || other.dead || other.reached) continue;
      if (Math.hypot(other.x - e.x, other.y - e.y) < 110) applyDamage(other, 60, world.time);
    }
    world.particles.addShake(3);
  }
  if (e.boss) {
    world.particles.addShake(8);
    setBanner(world, e.kind === 'skykraken' ? 'THE SKYKRAKEN FALLS' : 'DREADNOUGHT DOWN', `+${e.score} score`, 2.6);
  }
}

export function startWave(world) {
  if (world.phase !== 'build' || world.screen !== 'play') return false;
  world.wave += 1;
  world.phase = 'wave';
  world.spawnQueue = buildSpawnQueue(world.wave, world.rng);
  world.spawnTimer = 0;
  setBanner(world, `WAVE ${world.wave}`, world.wave === 6 ? 'Something huge approaches…' : world.wave === TOTAL_WAVES ? 'The Skykraken comes' : `${world.spawnQueue.length} hostiles inbound`, 2.4);
  return true;
}

export function placeTurret(world, slot, type) {
  if (world.turrets.some((t) => t.slot === slot)) return false;
  if (!spend(world.economy, TURRETS[type].cost)) return false;
  world.turrets.push(createTurret(type, slot));
  world.particles.burst(HARDPOINTS[slot].x, HARDPOINTS[slot].y, TURRETS[type].color, 10, 120, 3, 0.6);
  return true;
}

export function upgradeTurret(world, slot) {
  const t = world.turrets.find((x) => x.slot === slot);
  if (!t || t.level >= 3) return false;
  if (!spend(world.economy, upgradeCost(t.type, t.level))) return false;
  t.level += 1;
  world.particles.burst(HARDPOINTS[slot].x, HARDPOINTS[slot].y, '#ffd94a', 14, 140, 3, 0.7);
  return true;
}

export function sellTurret(world, slot) {
  const i = world.turrets.findIndex((x) => x.slot === slot);
  if (i < 0) return false;
  earn(world.economy, sellValue(world.turrets[i].type, world.turrets[i].level));
  world.turrets.splice(i, 1);
  return true;
}

export function castLightning(world, x, y) {
  if (!useAbility(world.economy, 'lightning', world.time)) return false;
  world.strikes.push({ x, y, at: world.time + 0.35, done: false });
  return true;
}

export function castRepair(world) {
  if (!useAbility(world.economy, 'repair', world.time)) return false;
  world.hull = Math.min(HULL_MAX, world.hull + ABILITIES.repair.heal);
  world.particles.floatText(CORE.x, CORE.y - 70, `+${ABILITIES.repair.heal} HULL`, '#3fae6a');
  return true;
}

export function castOverclock(world) {
  if (!useAbility(world.economy, 'overclock', world.time)) return false;
  world.overclockUntil = world.time + ABILITIES.overclock.duration;
  return true;
}

function resolveStrike(world, strike) {
  const def = ABILITIES.lightning;
  world.particles.explosion(strike.x, strike.y, true);
  world.bolts.push({ x1: strike.x, y1: strike.y - 260, x2: strike.x, y2: strike.y, age: 0, life: 0.25, thick: true });
  for (const e of world.enemies) {
    if (e.dead || e.reached) continue;
    if (Math.hypot(e.x - strike.x, e.y - strike.y) < def.radius) applyDamage(e, def.damage, world.time);
  }
}

function stepProjectiles(world, dt) {
  for (let i = world.projectiles.length - 1; i >= 0; i -= 1) {
    const p = world.projectiles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    let dead = p.life <= 0 || p.x < -60 || p.x > 1340 || p.y < -60 || p.y > 780;
    if (!dead) {
      for (const e of world.enemies) {
        if (e.dead || e.reached || e.phased || p.hitSet.has(e.id)) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + 7) {
          applyDamage(e, p.damage, world.time);
          world.shotsHit += 1;
          p.hitSet.add(e.id);
          world.particles.sparkle(p.x, p.y, p.color);
          if (p.explosive) {
            world.particles.explosion(p.x, p.y, false);
            for (const o of world.enemies) {
              if (o === e || o.dead || o.reached) continue;
              if (Math.hypot(o.x - p.x, o.y - p.y) < 80) applyDamage(o, p.damage * 0.6, world.time);
            }
          }
          if (!p.pierce) { dead = true; break; }
        }
      }
    }
    if (dead) world.projectiles.splice(i, 1);
  }
}

function stepSpawns(world, dt) {
  if (world.spawnQueue.length === 0) return;
  world.spawnTimer += dt;
  while (world.spawnQueue.length > 0 && world.spawnTimer >= world.spawnQueue[0].at) {
    const next = world.spawnQueue.shift();
    const side = world.rng.chance(0.5) ? 'left' : 'right';
    world.enemies.push(spawnEnemy(next.kind, world.wave, world.rng, side));
  }
}

function stepWave(world, dt) {
  stepSpawns(world, dt);
  // Turrets fire.
  for (const t of world.turrets) {
    updateTurret(t, dt, world.time, world, (turret, target, stats, pos) => {
      fireTurret(world, turret, target, stats, pos);
      if (turret.type === 'flak') world.particles.burst(pos.x, pos.y, '#ffb347', 2, 60, 2, 0.25);
    });
  }
  stepProjectiles(world, dt);
  // Lightning strikes land.
  for (const s of world.strikes) {
    if (!s.done && world.time >= s.at) { s.done = true; resolveStrike(world, s); }
  }
  world.strikes = world.strikes.filter((s) => !s.done || world.time - s.at < 0.3);
  // Enemies advance.
  const events = {
    smoke(x, y) { world.particles.smoke(x, y); },
    minions(boss) {
      for (let i = 0; i < 3; i += 1) {
        const m = spawnEnemy('dartwing', world.wave, world.rng, world.rng.chance(0.5) ? 'left' : 'right');
        m.x = boss.x + world.rng.range(-60, 60);
        m.y = boss.y + world.rng.range(-40, 40);
        world.enemies.push(m);
      }
    },
    breach(e) {
      world.hull = Math.max(0, world.hull - e.breach);
      world.particles.explosion(CORE.x, CORE.y, false);
      world.particles.addShake(5);
      world.particles.floatText(CORE.x, CORE.y - 80, `-${e.breach} HULL`, '#e84a3f');
    },
  };
  for (const e of world.enemies) updateEnemy(e, dt, world.time, world, events);
  // Deaths pay out.
  for (const e of world.enemies) {
    if (e.dead && !e.paid) { e.paid = true; killEnemy(world, e); }
  }
  world.enemies = world.enemies.filter((e) => !e.dead && !e.reached);
  // Bolts fade.
  for (let i = world.bolts.length - 1; i >= 0; i -= 1) {
    world.bolts[i].age += dt;
    if (world.bolts[i].age >= world.bolts[i].life) world.bolts.splice(i, 1);
  }
  // Wave cleared?
  if (world.spawnQueue.length === 0 && world.enemies.length === 0 && world.phase === 'wave') {
    const bonus = waveClearBonus(world.wave, world.hull);
    world.score += bonus;
    world.phase = 'clear';
    if (isLastWave(world.wave)) {
      world.victoryStars = world.hull >= 70 ? 3 : world.hull >= 40 ? 2 : 1;
      world.score += world.hull * 5;
      world.screen = 'victory';
      return EVENT_WIN;
    }
    setBanner(world, `WAVE ${world.wave} CLEARED`, `+${bonus} bonus — build, then launch wave ${world.wave + 1}`, 2.6);
    world.phase = 'build';
    return EVENT_WAVE_CLEAR;
  }
  if (world.hull <= 0) {
    world.screen = 'defeat';
    return EVENT_LOSE;
  }
  return EVENT_NONE;
}

/** Advance the world one fixed step. Returns an event mask. */
export function stepWorld(world, dt) {
  world.time += dt;
  world.particles.step(dt);
  if (world.screen !== 'play') return EVENT_NONE;
  if (world.phase === 'wave') return stepWave(world, dt);
  return EVENT_NONE;
}

export { TURRET_ORDER, ABILITY_ORDER, upgradeCost, sellValue };
