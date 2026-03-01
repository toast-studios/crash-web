// === HeatWave PvP — Scoring & Ranking (Shared) ===

import type { Player } from './types';
import { BOOST_TIME_BONUS, PRIZE_DISTRIBUTION, PRIZE_POOL } from './constants';

/**
 * Calculate a player's score.
 * Score = exitTime + (boostCount * BOOST_TIME_BONUS)
 * Bust players get score based on when they busted (round end time).
 */
export function calculateScore(player: Player, roundEndTime: number): number {
  if (player.status === 'exited' && player.exitTime !== null) {
    return player.exitTime + player.boostCount * BOOST_TIME_BONUS;
  }
  return roundEndTime + player.boostCount * BOOST_TIME_BONUS;
}

/**
 * Rank all players and assign prizes.
 * Rules:
 *  - Exited players rank above bust players
 *  - Among exited: higher score = better rank
 *  - Among busted: more boosts = higher rank (courage bonus)
 *  - Top 3 get prize money from pool
 */
export function rankPlayers(players: Player[], roundEndTime: number): Player[] {
  const scored = players.map(p => ({
    ...p,
    score: calculateScore(p, roundEndTime),
  }));

  const exited = scored.filter(p => p.status === 'exited');
  const bust = scored.filter(p => p.status === 'bust');

  exited.sort((a, b) => b.score - a.score);
  bust.sort((a, b) => b.boostCount - a.boostCount);

  const ranked = [...exited, ...bust];

  return ranked.map((player, index) => ({
    ...player,
    rank: index + 1,
    prize: index < PRIZE_DISTRIBUTION.length
      ? Math.round(PRIZE_POOL * PRIZE_DISTRIBUTION[index])
      : 0,
  }));
}
