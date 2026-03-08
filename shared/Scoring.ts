// === HeatWave PvP — Scoring & Ranking (Shared) ===

import type { Player } from './types';
import { BOOST_TIME_BONUS, PRIZE_POOL } from './constants';

/**
 * Compute prize distribution based on player count.
 * - 2 players: winner takes 100%
 * - N players: top ceil(N/3) get prizes with decreasing shares
 */
export function getPrizeDistribution(playerCount: number): number[] {
  if (playerCount <= 1) return [1.0];
  if (playerCount === 2) return [1.0];

  const prizeSlots = Math.ceil(playerCount / 3);

  if (prizeSlots === 1) return [1.0];

  // Generate decreasing weights: prizeSlots, prizeSlots-1, ..., 1
  const weights: number[] = [];
  for (let i = prizeSlots; i >= 1; i--) {
    weights.push(i);
  }
  const total = weights.reduce((sum, w) => sum + w, 0);

  return weights.map(w => w / total);
}

/**
 * Calculate a player's score.
 * Score = exitTime + (boostCount * BOOST_TIME_BONUS)
 * Bust players get score based on when they busted (round end time).
 */
export function calculateScore(player: Player, roundEndTime: number): number {
  if (player.status === 'exited' && player.exitTime !== null) {
    return player.exitTime + player.boostCount * BOOST_TIME_BONUS;
  }
  // Bust players: score = round end time, no boost bonus
  // (bust ranking uses boostCount directly, not score)
  return roundEndTime;
}

/**
 * Rank all players and assign prizes.
 * Rules:
 *  - Exited players rank above bust players
 *  - Among exited: higher score = better rank
 *  - Among busted: more boosts = higher rank (courage bonus)
 *  - Top players get prize money from pool (dynamic based on player count)
 */
export function rankPlayers(players: Player[], roundEndTime: number): Player[] {
  const prizeDistribution = getPrizeDistribution(players.length);

  const scored = players.map(p => ({
    ...p,
    score: calculateScore(p, roundEndTime),
  }));

  const exited = scored.filter(p => p.status === 'exited');
  const bust = scored.filter(p => p.status === 'bust');

  exited.sort((a, b) => b.score - a.score);
  bust.sort((a, b) => b.boostCount - a.boostCount);

  const ranked = [...exited, ...bust];

  return ranked.map((player, index) => {
    const exitedIndex = exited.findIndex(p => p.id === player.id);
    const prize = exitedIndex !== -1 && exitedIndex < prizeDistribution.length
      ? Math.round(PRIZE_POOL * prizeDistribution[exitedIndex])
      : 0;
    return { ...player, rank: index + 1, prize };
  });
}
