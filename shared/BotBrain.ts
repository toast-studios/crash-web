// === HeatWave PvP — Bot AI (Shared) ===
// 4 personality types with distinct decision-making logic
// lastActionTime is injectable for server-side use

import type { BotDecision, BotPersonality, Player } from './types';
import { BOT_ACTION_COOLDOWN } from './constants';

export interface BotContext {
  heat: number;
  elapsed: number;
  alivePlayers: number;
  exitedPlayers: number;
  player: Player;
}

/**
 * RNG interface for injectable randomness (server uses seeded, client uses Math.random).
 */
export type RngFn = () => number;

const defaultRng: RngFn = () => Math.random();

function conservativeDecision(ctx: BotContext, rng: RngFn): BotDecision {
  const { heat, player } = ctx;

  const exitThreshold = 40 + rng() * 20;
  if (heat >= exitThreshold && rng() < 0.15) {
    return { action: 'exit' };
  }

  if (heat > 35 && player.coolCount < 2 && rng() < 0.08) {
    return { action: 'cool' };
  }

  if (heat < 30 && player.boostCount < 1 && rng() < 0.02) {
    return { action: 'boost' };
  }

  return { action: 'none' };
}

function aggressiveDecision(ctx: BotContext, rng: RngFn): BotDecision {
  const { heat, player } = ctx;

  const exitThreshold = 75 + rng() * 15;
  if (heat >= exitThreshold && rng() < 0.12) {
    return { action: 'exit' };
  }

  if (heat < 70 && player.boostCount < 4 && rng() < 0.1) {
    return { action: 'boost' };
  }

  return { action: 'none' };
}

function strategicDecision(ctx: BotContext, rng: RngFn): BotDecision {
  const { heat, player, exitedPlayers } = ctx;

  if (exitedPlayers >= 3 && rng() < 0.2) {
    return { action: 'exit' };
  }
  if (heat > 70 && rng() < 0.15) {
    return { action: 'exit' };
  }

  if (heat < 40 && player.boostCount < 3 && rng() < 0.08) {
    return { action: 'boost' };
  }

  if (heat > 55 && player.coolCount < 2 && rng() < 0.1) {
    return { action: 'cool' };
  }

  return { action: 'none' };
}

function chaoticDecision(ctx: BotContext, rng: RngFn): BotDecision {
  const { heat, player } = ctx;
  const roll = rng();

  if (roll < 0.03 + heat * 0.001) {
    return { action: 'exit' };
  }

  if (roll < 0.08 && player.boostCount < 4) {
    return { action: 'boost' };
  }

  if (roll < 0.12 && player.coolCount < 2) {
    return { action: 'cool' };
  }

  return { action: 'none' };
}

const decisionMap: Record<BotPersonality, (ctx: BotContext, rng: RngFn) => BotDecision> = {
  conservative: conservativeDecision,
  aggressive: aggressiveDecision,
  strategic: strategicDecision,
  chaotic: chaoticDecision,
};

/**
 * Get a bot's decision for the current tick.
 * @param lastActionTimes - injectable Map for tracking cooldowns (server passes per-room map)
 * @param rng - optional RNG function for determinism
 */
export function getBotDecision(
  player: Player,
  heat: number,
  elapsed: number,
  allPlayers: Player[],
  lastActionTimes: Map<string, number>,
  rng: RngFn = defaultRng,
): BotDecision {
  if (player.status !== 'alive' || !player.personality) {
    return { action: 'none' };
  }

  const lastTime = lastActionTimes.get(player.id) ?? 0;
  if (elapsed - lastTime < BOT_ACTION_COOLDOWN) {
    return { action: 'none' };
  }

  const alivePlayers = allPlayers.filter(p => p.status === 'alive').length;
  const exitedPlayers = allPlayers.filter(p => p.status === 'exited').length;

  const ctx: BotContext = {
    heat,
    elapsed,
    alivePlayers,
    exitedPlayers,
    player,
  };

  const decide = decisionMap[player.personality];
  const decision = decide(ctx, rng);

  if (decision.action !== 'none') {
    lastActionTimes.set(player.id, elapsed);
  }

  return decision;
}

/**
 * Reset bot cooldowns for a given action times map.
 */
export function resetBotCooldowns(lastActionTimes: Map<string, number>): void {
  lastActionTimes.clear();
}
