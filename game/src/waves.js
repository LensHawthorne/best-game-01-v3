// Waves: turning a wave definition into a timed spawn queue, and counting
// what a wave is worth when it is cleared.
import { WAVES, TOTAL_WAVES } from './config.js';

export function buildSpawnQueue(wave, rng) {
  const queue = [];
  let t = 0.5;
  for (const group of WAVES[wave - 1]) {
    for (let i = 0; i < group.count; i += 1) {
      queue.push({ kind: group.kind, at: t });
      t += group.gap;
    }
    t += 1.2; // a breath between groups
  }
  return queue;
}

export function waveClearBonus(wave, hull) {
  return wave * 100 + Math.round(hull);
}

export function isLastWave(wave) { return wave >= TOTAL_WAVES; }
