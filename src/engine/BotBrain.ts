// === HeatWave PvP — Bot AI (Client Wrapper) ===
// Wraps shared BotBrain with a module-level lastActionTime map for backward compatibility

import { getBotDecision as sharedGetBotDecision, resetBotCooldowns as sharedResetBotCooldowns } from '../../shared/BotBrain';
import type { BotDecision, Player } from '../../shared/types';

// Module-level state for client-side usage (backward compatible with original API)
const lastActionTime: Map<string, number> = new Map();

export function getBotDecision(
  player: Player,
  heat: number,
  elapsed: number,
  allPlayers: Player[],
): BotDecision {
  return sharedGetBotDecision(player, heat, elapsed, allPlayers, lastActionTime);
}

export function resetBotCooldowns(): void {
  sharedResetBotCooldowns(lastActionTime);
}
