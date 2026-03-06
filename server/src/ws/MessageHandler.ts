// === HeatWave PvP — WebSocket Message Handler ===

import type { ClientMessage } from '../../../shared/types';
import { ErrorCode } from '../utils/errors';
import { logger } from '../utils/logger';
import type { ConnectionManager } from './ConnectionManager';
import type { MatchmakingService } from '../matchmaking/MatchmakingService';
import type { GameRoomManager } from '../game/GameRoomManager';

export class MessageHandler {
  constructor(
    private connections: ConnectionManager,
    private matchmaking: MatchmakingService,
    private roomManager: GameRoomManager,
  ) {}

  async handleMessage(userId: string, raw: string): Promise<void> {
    let message: ClientMessage;

    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      this.connections.send(userId, {
        type: 'error',
        payload: { code: ErrorCode.INVALID_MESSAGE, message: 'Invalid JSON' },
      });
      return;
    }

    if (!message.type) {
      this.connections.send(userId, {
        type: 'error',
        payload: { code: ErrorCode.INVALID_MESSAGE, message: 'Missing message type' },
      });
      return;
    }

    try {
      switch (message.type) {
        case 'join_queue':
          await this.matchmaking.addToQueue(userId);
          break;

        case 'leave_queue':
          await this.matchmaking.removeFromQueue(userId);
          break;

        case 'action': {
          const { action, elapsed } = message.payload;
          if (!['cool', 'boost', 'exit'].includes(action)) {
            this.connections.send(userId, {
              type: 'error',
              payload: { code: ErrorCode.INVALID_ACTION, message: `Invalid action: ${action}` },
            });
            return;
          }
          this.roomManager.handlePlayerAction(userId, action, elapsed);
          break;
        }

        case 'ping':
          this.connections.send(userId, {
            type: 'pong',
            payload: { serverTime: Date.now() },
          });
          break;

        default:
          this.connections.send(userId, {
            type: 'error',
            payload: { code: ErrorCode.INVALID_MESSAGE, message: `Unknown type: ${(message as any).type}` },
          });
      }
    } catch (err) {
      logger.error({ userId, messageType: message.type, err }, 'Error handling message');
      this.connections.send(userId, {
        type: 'error',
        payload: { code: ErrorCode.INTERNAL_ERROR, message: 'Internal server error' },
      });
    }
  }
}
