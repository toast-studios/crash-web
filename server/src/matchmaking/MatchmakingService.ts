// === HeatWave PvP — Matchmaking Service ===
// Redis-backed queue with automatic bot backfill.

import type Redis from 'ioredis';
import {
  MATCHMAKING_TIMEOUT_MS,
  MATCHMAKING_POLL_INTERVAL_MS,
  MIN_REAL_PLAYERS,
  TOTAL_PLAYERS,
  BET_AMOUNT,
} from '../../../shared/constants';
import type { ConnectionManager } from '../ws/ConnectionManager';
import type { GameRoomManager } from '../game/GameRoomManager';
import { deductBalance, getBalance } from '../db/queries';
import { ErrorCode } from '../utils/errors';
import { logger } from '../utils/logger';

const QUEUE_KEY = 'heatwave:matchmaking:queue';

export class MatchmakingService {
  private connections: ConnectionManager;
  private roomManager: GameRoomManager;
  private redis: Redis;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(connections: ConnectionManager, roomManager: GameRoomManager, redis: Redis) {
    this.connections = connections;
    this.roomManager = roomManager;
    this.redis = redis;
  }

  start(): void {
    this.pollTimer = setInterval(() => this.processQueue(), MATCHMAKING_POLL_INTERVAL_MS);
    logger.info('MatchmakingService started');
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Add a player to the matchmaking queue.
   */
  async addToQueue(userId: string): Promise<void> {
    // Check if already in queue
    const score = await this.redis.zscore(QUEUE_KEY, userId);
    if (score !== null) {
      this.connections.send(userId, {
        type: 'error',
        payload: { code: ErrorCode.ALREADY_IN_QUEUE, message: 'Already in queue' },
      });
      return;
    }

    // Check if already in a room
    if (this.connections.getRoom(userId)) {
      this.connections.send(userId, {
        type: 'error',
        payload: { code: ErrorCode.ALREADY_IN_QUEUE, message: 'Already in a game' },
      });
      return;
    }

    // Check balance
    const balance = await getBalance(userId);
    if (balance < BET_AMOUNT) {
      this.connections.send(userId, {
        type: 'error',
        payload: { code: ErrorCode.INSUFFICIENT_BALANCE, message: `Need $${BET_AMOUNT}, have $${balance}` },
      });
      return;
    }

    // Add to sorted set with timestamp as score
    await this.redis.zadd(QUEUE_KEY, Date.now(), userId);

    logger.info({ userId }, 'Player joined queue');

    // Send queue status
    const position = await this.getQueuePosition(userId);
    this.connections.send(userId, {
      type: 'queue_status',
      payload: { position, estimated_wait_ms: Math.max(0, MATCHMAKING_TIMEOUT_MS - 0) },
    });
  }

  /**
   * Remove a player from the queue.
   */
  async removeFromQueue(userId: string): Promise<void> {
    const removed = await this.redis.zrem(QUEUE_KEY, userId);
    if (removed > 0) {
      logger.info({ userId }, 'Player left queue');
    }
  }

  /**
   * Process the queue — called every MATCHMAKING_POLL_INTERVAL_MS.
   */
  private async processQueue(): Promise<void> {
    if (this.redis.status !== 'ready') return; // skip if Redis not connected
    try {
      const queueSize = await this.redis.zcard(QUEUE_KEY);
      if (queueSize === 0) return;

      // Get all entries with scores (timestamps)
      const entries = await this.redis.zrangebyscore(QUEUE_KEY, '-inf', '+inf', 'WITHSCORES');

      // Parse into userId/timestamp pairs
      const queue: Array<{ userId: string; joinedAt: number }> = [];
      for (let i = 0; i < entries.length; i += 2) {
        queue.push({ userId: entries[i], joinedAt: parseInt(entries[i + 1], 10) });
      }

      if (queue.length === 0) return;

      // If we have enough for a full room (10 players), match immediately
      if (queue.length >= TOTAL_PLAYERS) {
        const batch = queue.slice(0, TOTAL_PLAYERS);
        await this.createMatch(batch.map(e => e.userId));
        return;
      }

      // Check if oldest entry has waited long enough
      const now = Date.now();
      const oldestWait = now - queue[0].joinedAt;

      if (oldestWait >= MATCHMAKING_TIMEOUT_MS && queue.length >= MIN_REAL_PLAYERS) {
        // Create room with available players + bot backfill
        await this.createMatch(queue.map(e => e.userId));
        return;
      }

      // Send queue updates to all waiting players
      for (let i = 0; i < queue.length; i++) {
        const waitMs = now - queue[i].joinedAt;
        this.connections.send(queue[i].userId, {
          type: 'queue_status',
          payload: {
            position: i + 1,
            estimated_wait_ms: Math.max(0, MATCHMAKING_TIMEOUT_MS - waitMs),
          },
        });
      }
    } catch (err) {
      logger.error({ err }, 'Error processing matchmaking queue');
    }
  }

  /**
   * Create a match from the given user IDs.
   * Deducts bet from all players, then creates a room.
   */
  private async createMatch(userIds: string[]): Promise<void> {
    // Remove all matched players from queue
    if (userIds.length > 0) {
      await this.redis.zrem(QUEUE_KEY, ...userIds);
    }

    // Deduct bet from all human players
    const validPlayers: Array<{ userId: string; displayName: string }> = [];

    for (const userId of userIds) {
      try {
        const success = await deductBalance(userId, BET_AMOUNT);
        if (success) {
          validPlayers.push({
            userId,
            displayName: this.connections.getDisplayName(userId),
          });
        } else {
          // Insufficient funds — notify and skip
          this.connections.send(userId, {
            type: 'error',
            payload: { code: ErrorCode.INSUFFICIENT_BALANCE, message: 'Insufficient balance for bet' },
          });
        }
      } catch (err) {
        logger.error({ userId, err }, 'Failed to deduct bet');
        this.connections.send(userId, {
          type: 'error',
          payload: { code: ErrorCode.INTERNAL_ERROR, message: 'Failed to process bet' },
        });
      }
    }

    if (validPlayers.length === 0) {
      logger.warn('No valid players after bet deduction');
      return;
    }

    // Create room
    const roomId = this.roomManager.createRoom(validPlayers);
    logger.info({ roomId, playerCount: validPlayers.length }, 'Match created');
  }

  private async getQueuePosition(userId: string): Promise<number> {
    const rank = await this.redis.zrank(QUEUE_KEY, userId);
    return rank !== null ? rank + 1 : 0;
  }
}
