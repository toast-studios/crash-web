// === HeatWave PvP — Game Room Manager ===
// Creates/destroys rooms, routes actions to rooms, handles persistence.

import { v4 as uuidv4 } from 'uuid';
import type { Player, BotPersonality } from '../../../shared/types';
import { BOT_CONFIGS, BET_AMOUNT, ROOM_CLEANUP_DELAY_MS, TOTAL_PLAYERS } from '../../../shared/constants';
import type { ConnectionManager } from '../ws/ConnectionManager';
import { GameRoom } from './GameRoom';
import { recordMatchResult, creditBalance, getBalance } from '../db/queries';
import { logger } from '../utils/logger';

interface HumanEntry {
  userId: string;
  displayName: string;
}

export class GameRoomManager {
  private rooms = new Map<string, GameRoom>();
  private cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private connections: ConnectionManager;

  constructor(connections: ConnectionManager) {
    this.connections = connections;
  }

  /**
   * Create a new room with the given human players, backfilled with bots to reach TOTAL_PLAYERS.
   */
  createRoom(humans: HumanEntry[]): string {
    const roomId = uuidv4();
    const botCount = TOTAL_PLAYERS - humans.length;

    // Shuffle bot configs and take what we need
    const shuffled = [...BOT_CONFIGS].sort(() => Math.random() - 0.5);
    const bots: Player[] = shuffled.slice(0, botCount).map((config, i) => ({
      id: `bot-${i}`,
      name: config.name,
      isHuman: false,
      isBot: true,
      personality: config.personality as BotPersonality,
      status: 'alive' as const,
      exitTime: null,
      boostCount: 0,
      coolCount: 0,
      score: 0,
      prize: 0,
      rank: null,
    }));

    const room = new GameRoom(
      roomId,
      humans,
      bots,
      this.connections,
      (id, players, elapsed) => this.handleRoomEnd(id, players, elapsed),
    );

    this.rooms.set(roomId, room);

    // Assign room to all humans
    for (const h of humans) {
      this.connections.setRoom(h.userId, roomId);
    }

    // Start countdown
    room.startCountdown();

    logger.info({ roomId, humans: humans.length, bots: botCount }, 'Room created');
    return roomId;
  }

  /**
   * Route a player's action to their room.
   */
  handlePlayerAction(userId: string, action: 'cool' | 'boost' | 'exit'): void {
    const roomId = this.connections.getRoom(userId);
    if (!roomId) {
      this.connections.send(userId, {
        type: 'error',
        payload: { code: 'NOT_IN_ROOM', message: 'You are not in a room' },
      });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.connections.send(userId, {
        type: 'error',
        payload: { code: 'NOT_IN_ROOM', message: 'Room no longer exists' },
      });
      return;
    }

    room.handleAction(userId, action);
  }

  /**
   * Handle a player disconnecting from a room.
   */
  handlePlayerDisconnect(userId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // For now, the bot will auto-exit the player if they disconnect during a running game
    // (they lose their remaining actions but keep their current state)
    logger.info({ userId, roomId }, 'Player disconnected from room');
  }

  /**
   * Called when a room's round ends.
   */
  private async handleRoomEnd(roomId: string, players: Player[], elapsed: number): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const humanUserIds = room.getPlayerIds();

    // Credit prizes and record results in database
    try {
      // Credit balance for prize winners
      for (const userId of humanUserIds) {
        const result = room.getPlayerResult(userId);
        if (result && result.prize > 0) {
          await creditBalance(userId, result.prize);
        }
      }

      // Record match result
      const playerIdToUserId = room.getPlayerIdToUserId();
      await recordMatchResult(roomId, players, elapsed, playerIdToUserId);

      // Send updated round_over with real balances
      for (const userId of humanUserIds) {
        const result = room.getPlayerResult(userId);
        if (result) {
          const newBalance = await getBalance(userId);
          this.connections.send(userId, {
            type: 'round_over',
            payload: {
              players,
              your_rank: result.rank,
              your_prize: result.prize,
              your_profit: result.prize - BET_AMOUNT,
              new_balance: newBalance,
              elapsed,
            },
          });
        }
      }
    } catch (err) {
      logger.error({ roomId, err }, 'Failed to persist round results');
    }

    // Clear room assignments
    for (const userId of humanUserIds) {
      this.connections.setRoom(userId, null);
    }

    // Schedule cleanup
    const timer = setTimeout(() => {
      this.destroyRoom(roomId);
    }, ROOM_CLEANUP_DELAY_MS);
    this.cleanupTimers.set(roomId, timer);
  }

  private destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.destroy();
      this.rooms.delete(roomId);
    }
    this.cleanupTimers.delete(roomId);
    logger.info({ roomId }, 'Room cleaned up');
  }

  getActiveRoomCount(): number {
    return this.rooms.size;
  }

  destroyAll(): void {
    for (const [roomId, room] of this.rooms) {
      room.destroy();
    }
    this.rooms.clear();
    for (const timer of this.cleanupTimers.values()) {
      clearTimeout(timer);
    }
    this.cleanupTimers.clear();
  }
}
