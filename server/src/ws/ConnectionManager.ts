// === HeatWave PvP — WebSocket Connection Manager ===

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { ServerMessage } from '../../../shared/types';
import { HEARTBEAT_INTERVAL_MS, RECONNECT_GRACE_PERIOD_MS } from '../../../shared/constants';
import { logger } from '../utils/logger';

interface Connection {
  ws: WebSocket;
  userId: string;
  displayName: string;
  roomId: string | null;
  reconnectToken: string;
  isAlive: boolean;
  disconnectedAt: number | null;
}

export class ConnectionManager {
  private connections = new Map<string, Connection>(); // userId → Connection
  private reconnectTokens = new Map<string, string>(); // token → userId
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private gracePeriodTimers = new Map<string, ReturnType<typeof setTimeout>>(); // userId → timer

  // Callback for when a player fully disconnects (grace period expired)
  onPlayerDisconnect?: (userId: string, roomId: string | null) => void;

  start(): void {
    this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), HEARTBEAT_INTERVAL_MS);
    logger.info('ConnectionManager heartbeat started');
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const timer of this.gracePeriodTimers.values()) {
      clearTimeout(timer);
    }
    this.gracePeriodTimers.clear();
  }

  /**
   * Register a new authenticated connection.
   * If the user was previously connected (reconnect), replace the old socket.
   */
  register(ws: WebSocket, userId: string, displayName: string): string {
    const existing = this.connections.get(userId);

    if (existing) {
      // Reconnection — cancel grace period, replace socket
      const graceTimer = this.gracePeriodTimers.get(userId);
      if (graceTimer) {
        clearTimeout(graceTimer);
        this.gracePeriodTimers.delete(userId);
      }

      // Close old socket if still open
      if (existing.ws.readyState === WebSocket.OPEN) {
        existing.ws.close(4000, 'Replaced by new connection');
      }

      existing.ws = ws;
      existing.isAlive = true;
      existing.disconnectedAt = null;
      logger.info({ userId, roomId: existing.roomId }, 'Player reconnected');
      return existing.reconnectToken;
    }

    // New connection
    const reconnectToken = uuidv4();
    this.connections.set(userId, {
      ws,
      userId,
      displayName,
      roomId: null,
      reconnectToken,
      isAlive: true,
      disconnectedAt: null,
    });
    this.reconnectTokens.set(reconnectToken, userId);

    logger.info({ userId, displayName }, 'Player connected');
    return reconnectToken;
  }

  /**
   * Handle WebSocket disconnect — starts grace period.
   */
  handleDisconnect(userId: string, ws: WebSocket): void {
    const conn = this.connections.get(userId);
    if (!conn) return;

    // If the disconnecting socket is not the currently registered one,
    // it was replaced by a newer connection — ignore this close event.
    if (conn.ws !== ws) return;

    conn.disconnectedAt = Date.now();
    conn.isAlive = false;

    logger.info({ userId, roomId: conn.roomId }, 'Player disconnected, starting grace period');

    const timer = setTimeout(() => {
      this.gracePeriodTimers.delete(userId);
      this.fullyRemove(userId);
    }, RECONNECT_GRACE_PERIOD_MS);

    this.gracePeriodTimers.set(userId, timer);
  }

  private fullyRemove(userId: string): void {
    const conn = this.connections.get(userId);
    if (!conn) return;

    logger.info({ userId, roomId: conn.roomId }, 'Player fully removed after grace period');

    this.reconnectTokens.delete(conn.reconnectToken);
    this.connections.delete(userId);

    if (this.onPlayerDisconnect) {
      this.onPlayerDisconnect(userId, conn.roomId);
    }
  }

  /**
   * Send a message to a specific user.
   */
  send(userId: string, message: ServerMessage): void {
    const conn = this.connections.get(userId);
    if (!conn || conn.ws.readyState !== WebSocket.OPEN) return;

    try {
      conn.ws.send(JSON.stringify(message));
    } catch (err) {
      logger.error({ userId, err }, 'Failed to send message');
    }
  }

  /**
   * Broadcast to all users in a specific room.
   */
  broadcast(roomId: string, message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const conn of this.connections.values()) {
      if (conn.roomId === roomId && conn.ws.readyState === WebSocket.OPEN) {
        try {
          conn.ws.send(data);
        } catch (err) {
          logger.error({ userId: conn.userId, err }, 'Broadcast send failed');
        }
      }
    }
  }

  /**
   * Send a personalized message to each human player in a room.
   */
  sendPersonalized(roomId: string, buildMessage: (userId: string) => ServerMessage | null): void {
    for (const conn of this.connections.values()) {
      if (conn.roomId === roomId && conn.ws.readyState === WebSocket.OPEN) {
        const message = buildMessage(conn.userId);
        if (message) {
          try {
            conn.ws.send(JSON.stringify(message));
          } catch (err) {
            logger.error({ userId: conn.userId, err }, 'Personalized send failed');
          }
        }
      }
    }
  }

  setRoom(userId: string, roomId: string | null): void {
    const conn = this.connections.get(userId);
    if (conn) conn.roomId = roomId;
  }

  getRoom(userId: string): string | null {
    return this.connections.get(userId)?.roomId ?? null;
  }

  getDisplayName(userId: string): string {
    return this.connections.get(userId)?.displayName ?? 'Unknown';
  }

  isConnected(userId: string): boolean {
    const conn = this.connections.get(userId);
    return !!conn && conn.ws.readyState === WebSocket.OPEN;
  }

  getOnlineCount(): number {
    let count = 0;
    for (const conn of this.connections.values()) {
      if (conn.ws.readyState === WebSocket.OPEN) count++;
    }
    return count;
  }

  private checkHeartbeats(): void {
    for (const conn of this.connections.values()) {
      if (conn.ws.readyState !== WebSocket.OPEN) continue;

      if (!conn.isAlive) {
        logger.warn({ userId: conn.userId }, 'Heartbeat timeout, terminating');
        const staleWs = conn.ws;
        conn.ws.terminate();
        this.handleDisconnect(conn.userId, staleWs);
        continue;
      }

      conn.isAlive = false;
      conn.ws.ping();
    }
  }

  /**
   * Mark a connection as alive (called when pong received).
   */
  markAlive(userId: string): void {
    const conn = this.connections.get(userId);
    if (conn) conn.isAlive = true;
  }
}
