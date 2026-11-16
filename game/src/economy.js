// Economy: salvage in, salvage out, and the three Skykeeper abilities with
// their cooldowns. Nothing here touches the screen.
import { ABILITIES, TURRETS } from './config.js';

export function createEconomy(startSalvage) {
  return {
    salvage: startSalvage,
    abilities: {
      lightning: { readyAt: 0 },
      repair: { readyAt: 0 },
      overclock: { readyAt: 0 },
    },
    overclockUntil: 0,
  };
}

export function canAfford(economy, cost) { return economy.salvage >= cost; }

export function spend(economy, cost) {
  if (!canAfford(economy, cost)) return false;
  economy.salvage -= cost;
  return true;
}

export function earn(economy, amount) { economy.salvage += amount; }

export function abilityReady(economy, key, time) {
  return time >= economy.abilities[key].readyAt;
}

export function abilityCooldownLeft(economy, key, time) {
  return Math.max(0, economy.abilities[key].readyAt - time);
}

export function useAbility(economy, key, time) {
  if (!abilityReady(economy, key, time)) return false;
  economy.abilities[key].readyAt = time + ABILITIES[key].cooldown;
  if (key === 'overclock') economy.overclockUntil = time + ABILITIES[key].duration;
  return true;
}

export function turretCost(type) { return TURRETS[type].cost; }
