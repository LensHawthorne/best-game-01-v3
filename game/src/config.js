// SKYHARBOR — balance, layout and content tables. One file, every number the
// game tunes lives here, so a balance pass touches nothing else.
export const STEP = 1 / 60;
export const VIEW = { width: 1280, height: 720 };
export const CORE = { x: 640, y: 400 }; // the skyport's heart: what enemies fly at
export const HULL_MAX = 100;
export const START_SALVAGE = 170;
export const TOTAL_WAVES = 12;

// The eight hardpoints on the dock: four on the upper deck, four on the lower.
export const HARDPOINTS = [
  { x: 470, y: 330 }, { x: 580, y: 318 }, { x: 700, y: 318 }, { x: 810, y: 330 },
  { x: 470, y: 486 }, { x: 580, y: 498 }, { x: 700, y: 498 }, { x: 810, y: 486 },
];

// Turret types: key, name, cost, range, fire interval, damage, projectile speed,
// colour, and what each level adds. Level 2: +60% damage, +10% range.
// Level 3: +150% damage, +20% range, and the type's special.
export const TURRETS = {
  flak: {
    name: 'Flak Cannon', key: '1', cost: 40, range: 170, interval: 0.32,
    damage: 9, speed: 620, color: '#ffb347', desc: 'Fast, shreds swarms',
    special: 'Twin barrels',
  },
  harpoon: {
    name: 'Harpoon Launcher', key: '2', cost: 70, range: 300, interval: 1.5,
    damage: 55, speed: 900, color: '#ff6b6b', desc: 'Long range, pierces',
    special: 'Explosive tip',
  },
  coil: {
    name: 'Storm Coil', key: '3', cost: 90, range: 210, interval: 1.1,
    damage: 26, speed: 0, color: '#7ee7ff', desc: 'Chains to 3 foes',
    special: 'Chains to 5 foes',
  },
  frost: {
    name: 'Frost Vent', key: '4', cost: 60, range: 190, interval: 0.9,
    damage: 6, speed: 0, color: '#b8f1ff', desc: 'Slows a crowd',
    special: 'Freezes briefly',
  },
};
export const TURRET_ORDER = ['flak', 'harpoon', 'coil', 'frost'];
export function upgradeCost(type, level) {
  return Math.round(TURRETS[type].cost * (0.9 + 0.7 * level));
}
export function sellValue(type, level) {
  let spent = TURRETS[type].cost;
  for (let l = 1; l < level; l += 1) spent += upgradeCost(type, l);
  return Math.round(spent * 0.7);
}

// Enemy kinds: hp, speed (px/s), radius, breach damage to the hull, salvage paid,
// score paid, and the wave they first appear in.
export const ENEMIES = {
  dartwing: { name: 'Dartwing', hp: 30, speed: 95, radius: 13, breach: 5, salvage: 6, score: 10, firstWave: 1, color: '#e8b34b' },
  raider: { name: 'Balloon Raider', hp: 70, speed: 55, radius: 20, breach: 8, salvage: 10, score: 15, firstWave: 1, color: '#d97b4f' },
  swift: { name: 'Swift', hp: 22, speed: 150, radius: 10, breach: 6, salvage: 7, score: 15, firstWave: 2, color: '#f2e394' },
  ironclad: { name: 'Ironclad', hp: 260, speed: 34, radius: 26, breach: 12, salvage: 18, score: 30, firstWave: 3, color: '#9aa7b8', armor: 0.5 },
  bomber: { name: 'Bomber', hp: 55, speed: 62, radius: 16, breach: 10, salvage: 12, score: 25, firstWave: 4, color: '#ff8a5c' },
  shieldbearer: { name: 'Shieldbearer', hp: 120, speed: 48, radius: 22, breach: 10, salvage: 16, score: 30, firstWave: 5, color: '#8fd0ff', shield: 80 },
  wraith: { name: 'Wraith', hp: 90, speed: 78, radius: 15, breach: 9, salvage: 14, score: 30, firstWave: 6, color: '#c9a7ff', phase: true },
  dreadnought: { name: 'Dreadnought', hp: 2600, speed: 22, radius: 58, breach: 30, salvage: 220, score: 300, firstWave: 6, color: '#b8c4d4', armor: 0.4, boss: true },
  skykraken: { name: 'The Skykraken', hp: 5200, speed: 26, radius: 66, breach: 40, salvage: 500, score: 800, firstWave: 12, color: '#7fe0a8', boss: true },
};

// Wave schedule: each wave is a list of spawn groups {kind, count, gap}.
function w(groups) { return groups; }
export const WAVES = [
  w([{ kind: 'dartwing', count: 8, gap: 1.1 }, { kind: 'raider', count: 3, gap: 1.6 }]),
  w([{ kind: 'dartwing', count: 12, gap: 0.9 }, { kind: 'swift', count: 5, gap: 1.2 }, { kind: 'raider', count: 4, gap: 1.5 }]),
  w([{ kind: 'dartwing', count: 10, gap: 0.8 }, { kind: 'raider', count: 6, gap: 1.3 }, { kind: 'ironclad', count: 2, gap: 3.0 }, { kind: 'swift', count: 6, gap: 1.0 }]),
  w([{ kind: 'bomber', count: 6, gap: 1.4 }, { kind: 'dartwing', count: 12, gap: 0.7 }, { kind: 'ironclad', count: 3, gap: 2.6 }, { kind: 'raider', count: 6, gap: 1.2 }]),
  w([{ kind: 'shieldbearer', count: 4, gap: 2.0 }, { kind: 'swift', count: 10, gap: 0.8 }, { kind: 'bomber', count: 6, gap: 1.3 }, { kind: 'ironclad', count: 3, gap: 2.4 }]),
  w([{ kind: 'dreadnought', count: 1, gap: 0 }, { kind: 'dartwing', count: 10, gap: 0.8 }, { kind: 'wraith', count: 5, gap: 1.6 }, { kind: 'raider', count: 6, gap: 1.2 }]),
  w([{ kind: 'wraith', count: 8, gap: 1.3 }, { kind: 'ironclad', count: 5, gap: 2.2 }, { kind: 'bomber', count: 8, gap: 1.1 }, { kind: 'shieldbearer', count: 5, gap: 1.8 }]),
  w([{ kind: 'ironclad', count: 6, gap: 2.0 }, { kind: 'swift', count: 14, gap: 0.7 }, { kind: 'wraith', count: 8, gap: 1.2 }, { kind: 'dartwing', count: 14, gap: 0.6 }]),
  w([{ kind: 'shieldbearer', count: 8, gap: 1.6 }, { kind: 'bomber', count: 10, gap: 1.0 }, { kind: 'ironclad', count: 5, gap: 2.0 }, { kind: 'raider', count: 10, gap: 1.0 }]),
  w([{ kind: 'wraith', count: 12, gap: 1.0 }, { kind: 'swift', count: 12, gap: 0.7 }, { kind: 'ironclad', count: 7, gap: 1.8 }, { kind: 'bomber', count: 8, gap: 1.0 }]),
  w([{ kind: 'ironclad', count: 8, gap: 1.7 }, { kind: 'shieldbearer', count: 8, gap: 1.5 }, { kind: 'dartwing', count: 18, gap: 0.5 }, { kind: 'wraith', count: 10, gap: 1.0 }]),
  w([{ kind: 'skykraken', count: 1, gap: 0 }, { kind: 'swift', count: 12, gap: 0.8 }, { kind: 'bomber', count: 8, gap: 1.1 }, { kind: 'wraith', count: 8, gap: 1.2 }, { kind: 'ironclad', count: 4, gap: 2.2 }]),
];
// Health and speed grow a little every wave so late waves stay dangerous.
export function waveHpMul(wave) { return 1 + (wave - 1) * 0.16; }
export function waveSpeedMul(wave) { return 1 + (wave - 1) * 0.025; }

// Skykeeper abilities: cooldown seconds, and what they do.
export const ABILITIES = {
  lightning: { name: 'Lightning Strike', key: 'Q', cooldown: 20, damage: 130, radius: 100, desc: 'Smite a spot' },
  repair: { name: 'Emergency Repair', key: 'W', cooldown: 30, heal: 30, desc: 'Heal hull +30' },
  overclock: { name: 'Overclock', key: 'E', cooldown: 25, duration: 6, desc: 'Turrets fire 2x' },
};
export const ABILITY_ORDER = ['lightning', 'repair', 'overclock'];

export const BEST_KEY = 'skyharbor.best.score';
export const PALETTE = {
  skyTop: '#2b1e4d', skyMid: '#7a3b6e', skyLow: '#e8734a', sun: '#ffd98a',
  cloudFar: 'rgba(255, 214, 170, 0.20)', cloudMid: 'rgba(255, 196, 150, 0.34)',
  cloudNear: 'rgba(255, 224, 196, 0.5)', wood: '#6b4a2f', woodDark: '#4a3220',
  brass: '#d9a441', brassDark: '#8a6420', hull: '#3fae6a', hullLow: '#e84a3f',
  salvage: '#ffd94a', ink: '#241a33', panel: 'rgba(24, 16, 40, 0.82)',
};
