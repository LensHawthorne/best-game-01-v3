// Enemies: what flies at the skyport, how it moves, and what it does when it
// dies or breaches the core. Bosses carry their own phase behaviour here.
import { CORE, ENEMIES, waveHpMul, waveSpeedMul } from './config.js';

let nextId = 1;

export function spawnEnemy(kind, wave, rng, side) {
  const def = ENEMIES[kind];
  const y = rng.range(70, 650);
  const x = side === 'left' ? -50 : 1330;
  return {
    id: nextId += 1, kind, def,
    x, y, startY: y,
    hp: def.hp * waveHpMul(wave), maxHp: def.hp * waveHpMul(wave),
    shield: def.shield || 0, maxShield: def.shield || 0,
    speed: def.speed * waveSpeedMul(wave) * rng.range(0.9, 1.1),
    radius: def.radius, breach: def.breach, salvage: def.salvage, score: def.score,
    wobble: rng.range(0, Math.PI * 2), wobbleSpeed: rng.range(1.2, 2.4),
    slowUntil: 0, freezeUntil: 0, phaseUntil: 0, phased: false,
    flash: 0, dead: false, reached: false, spawnMinionsAt: 0.66,
    trail: 0, boss: !!def.boss, armor: def.armor || 0, phaseKind: def.phase || false,
  };
}

export function applyDamage(enemy, raw, time) {
  let dmg = raw;
  if (enemy.shield > 0) {
    const absorbed = Math.min(enemy.shield, dmg);
    enemy.shield -= absorbed;
    dmg -= absorbed;
  }
  if (enemy.armor && dmg > 0) dmg *= (1 - enemy.armor);
  enemy.hp -= dmg;
  enemy.flash = 0.09;
  if (enemy.hp <= 0) enemy.dead = true;
  return dmg;
}

export function updateEnemy(e, dt, time, state, events) {
  if (e.flash > 0) e.flash -= dt;
  // Wraiths blink out of phase: untargetable while phased.
  if (e.phaseKind) {
    const cycle = (time + e.wobble) % 6;
    const wantPhase = cycle > 4.2;
    if (wantPhase && !e.phased) { e.phased = true; e.phaseUntil = time + 1.8; }
    if (e.phased && time >= e.phaseUntil) e.phased = false;
  }
  let speed = e.speed;
  if (time < e.slowUntil) speed *= 0.45;
  if (time < e.freezeUntil) speed = 0;
  // Skykraken enrages below half health.
  if (e.kind === 'skykraken' && e.hp < e.maxHp * 0.5) speed *= 1.45;
  const dx = CORE.x - e.x;
  const dy = CORE.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const wob = Math.sin(time * e.wobbleSpeed + e.wobble) * 14;
  const nx = dx / dist;
  const ny = dy / dist;
  e.x += nx * speed * dt;
  e.y += (ny * speed + wob * 0.4) * dt;
  e.trail -= dt;
  if (e.trail <= 0) {
    e.trail = e.boss ? 0.08 : 0.22;
    events.smoke(e.x, e.y + e.radius * 0.6);
  }
  // Bosses shed minions as they lose health.
  if (e.boss && e.hp < e.maxHp * e.spawnMinionsAt) {
    e.spawnMinionsAt -= 0.33;
    events.minions(e);
  }
  if (dist < 52) {
    e.reached = true;
    events.breach(e);
  }
}
