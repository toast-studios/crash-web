// === HeatWave PvP — Shared Barrel Export ===

// Types
export * from './types';

// Constants
export * from './constants';

// Engine
export {
  getBaseHeatRate,
  getHeatJitter,
  getSeededHeatJitter,
  calculateHeatTick,
  isRoundOver,
  getMultiplier,
  getHeatLevel,
  getHeatColor,
} from './HeatEngine';

// Scoring
export { calculateScore, rankPlayers } from './Scoring';
