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

// Bot AI
export { getBotDecision, resetBotCooldowns } from './BotBrain';
export type { BotContext, RngFn } from './BotBrain';

// Scoring
export { calculateScore, rankPlayers } from './Scoring';
