// === HeatWave PvP — Database Queries ===

import type { Player } from '../../../shared/types';
import { STARTING_BALANCE } from '../../../shared/constants';
import { getSupabaseAdmin } from './supabaseClient';
import { logger } from '../utils/logger';

/**
 * Get a user's current balance.
 */
export async function getBalance(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('users')
    .select('balance')
    .eq('id', userId)
    .single();

  if (error) {
    logger.error({ userId, error }, 'Failed to get balance');
    return STARTING_BALANCE; // fallback
  }

  return data?.balance ?? STARTING_BALANCE;
}

/**
 * Atomically deduct balance using the deduct_balance RPC.
 * Returns true if deduction succeeded, false if insufficient funds.
 */
export async function deductBalance(userId: string, amount: number): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('deduct_balance', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    logger.error({ userId, amount, error }, 'Failed to deduct balance');
    return false;
  }

  return data === true;
}

/**
 * Credit a user's balance.
 */
export async function creditBalance(userId: string, amount: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc('credit_balance', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    logger.error({ userId, amount, error }, 'Failed to credit balance');
  }
}

/**
 * Record the result of a completed match.
 * @param playerIdToUserId - Map from player.id → real userId for human players
 */
export async function recordMatchResult(
  roomId: string,
  players: Player[],
  elapsed: number,
  playerIdToUserId: Map<string, string>,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Insert match record
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      id: roomId,
      started_at: new Date(Date.now() - elapsed * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      duration_seconds: elapsed,
      heat_at_end: 100,
      player_count: players.length,
    })
    .select('id')
    .single();

  if (matchError) {
    logger.error({ roomId, matchError }, 'Failed to insert match');
    return;
  }

  // Insert match_players records
  const playerRows = players.map(p => ({
    match_id: match.id,
    user_id: p.isBot ? null : (playerIdToUserId.get(p.id) ?? null),
    player_name: p.name,
    is_bot: p.isBot,
    rank: p.rank,
    score: p.score,
    prize: p.prize,
    exit_time: p.exitTime,
    status: p.status,
    boosts_used: p.boostCount,
    cools_used: p.coolCount,
  }));

  const { error: playersError } = await supabase
    .from('match_players')
    .insert(playerRows);

  if (playersError) {
    logger.error({ roomId, playersError }, 'Failed to insert match players');
  }

  logger.info({ roomId, playerCount: players.length }, 'Match result recorded');
}
