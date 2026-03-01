// === HeatWave PvP — Heat Engine (Shared) ===
// Pure functions for heat calculation and multiplier progression

import {
  BASE_HEAT_PER_TICK,
  HEAT_ACCELERATION,
  HEAT_JITTER_RANGE,
  HEAT_MAX,
  TICKS_PER_SECOND,
} from './constants';

/**
 * Calculate the base heat rate per tick at a given elapsed time.
 * Rate accelerates over time: starts ~3%/sec, reaches ~7%/sec by 10s.
 */
export function getBaseHeatRate(elapsedSeconds: number): number {
  return BASE_HEAT_PER_TICK + (elapsedSeconds * HEAT_ACCELERATION) / TICKS_PER_SECOND;
}

/**
 * Generate random jitter for heat oscillation (client-side, non-deterministic).
 * Uniform distribution in [-HEAT_JITTER_RANGE, +HEAT_JITTER_RANGE].
 */
export function getHeatJitter(): number {
  return (Math.random() * 2 - 1) * HEAT_JITTER_RANGE / TICKS_PER_SECOND;
}

/**
 * Generate seeded jitter for server-side determinism.
 * Pass a seeded RNG function that returns [0, 1).
 */
export function getSeededHeatJitter(rng: () => number): number {
  return (rng() * 2 - 1) * HEAT_JITTER_RANGE / TICKS_PER_SECOND;
}

/**
 * Calculate new heat value for a single tick.
 * Optionally pass a jitter override for server determinism.
 */
export function calculateHeatTick(
  currentHeat: number,
  elapsedSeconds: number,
  rateModifier: number,
  jitterOverride?: number,
): number {
  const baseRate = getBaseHeatRate(elapsedSeconds);
  const jitter = jitterOverride !== undefined ? jitterOverride : getHeatJitter();
  const newHeat = currentHeat + baseRate + rateModifier + jitter;
  return Math.max(0, Math.min(HEAT_MAX, newHeat));
}

/**
 * Check if round has ended (heat >= 100).
 */
export function isRoundOver(heat: number): boolean {
  return heat >= HEAT_MAX;
}

/**
 * Get the multiplier display value based on elapsed time.
 */
export function getMultiplier(elapsedSeconds: number): string {
  return elapsedSeconds.toFixed(2);
}

/**
 * Get the heat danger level for visual effects.
 */
export function getHeatLevel(heat: number): 'low' | 'mid' | 'high' | 'critical' {
  if (heat < 40) return 'low';
  if (heat < 65) return 'mid';
  if (heat < 85) return 'high';
  return 'critical';
}

/**
 * Get heat color based on current level.
 */
export function getHeatColor(heat: number): string {
  if (heat < 40) return '#00ff88';
  if (heat < 65) return '#ffaa00';
  if (heat < 85) return '#ff5533';
  return '#ff0000';
}
