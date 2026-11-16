// Turrets: the four types, their targeting, firing and upgrades. A turret
// always shoots the foe nearest the core that it can reach.
import { TURRETS, HARDPOINTS, upgradeCost } from './config.js';

export function createTurret(type, slot) {
  return { type, slot, level: 1, cooldown: 0, angle: -Math.PI / 2, flash: 0, kills: 0 };
}

export function turretStats(t) {
  const def = TURRETS[t.type];
  const dmgMul = t.level === 1 ? 1 : t.level === 2 ? 1.6 : 2.5;
  const rangeMul = t.level === 1 ? 1 : t.level === 2 ? 1.1 : 1.2;
  return {
    damage: def.damage * dmgMul,
    range: def.range * rangeMul,
    interval: def.interval,
    chain: t.type === 'coil' ? (t.level === 3 ? 5 : 3) : 0,
    pierce: t.type === 'harpoon',
    explosive: t.type === 'harpoon' && t.level === 3,
    freeze: t.type === 'frost' && t.level === 3,
    twin: t.type === 'flak' && t.level === 3,
  };
}

function dist2(ax, ay, bx, by) { const dx = ax - bx; const dy = ay - by; return dx * dx + dy * dy; }

export function pickTarget(turret, enemies, time) {
  const pos = HARDPOINTS[turret.slot];
  const stats = turretStats(turret);
  let best = null;
  let bestScore = Infinity;
  for (const e of enemies) {
    if (e.dead || e.reached) continue;
    if (e.phased) continue;
    const d2 = dist2(pos.x, pos.y, e.x, e.y);
    if (d2 > stats.range * stats.range) continue;
    // Nearest the core wins: the most dangerous foe first.
    const toCore = Math.hypot(e.x - 640, e.y - 400);
    if (toCore < bestScore) { bestScore = toCore; best = e; }
  }
  return best;
}

export function updateTurret(turret, dt, time, state, fire) {
  if (turret.cooldown > 0) turret.cooldown -= dt;
  if (turret.flash > 0) turret.flash -= dt;
  const target = pickTarget(turret, state.enemies, time);
  if (!target) return;
  const pos = HARDPOINTS[turret.slot];
  turret.angle = Math.atan2(target.y - pos.y, target.x - pos.x);
  if (turret.cooldown > 0) return;
  const stats = turretStats(turret);
  let interval = stats.interval;
  if (state.overclockUntil > time) interval *= 0.5;
  turret.cooldown = interval;
  turret.flash = 0.08;
  fire(turret, target, stats, pos);
}

export { upgradeCost };
