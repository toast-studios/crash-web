// === HeatWave PvP — WebSocket Service ===
// Singleton WS manager with auto-reconnect, event listeners, and message queuing.

import type { ClientMessage, ServerMessage } from '../../shared/types';

// For local development, use ws:// (no TLS). For production, use wss://your-server.fly.dev/ws
const WS_SERVER_URL = 'ws://localhost:3000/ws';

type MessageListener = (message: ServerMessage) => void;
type StatusListener = (status: ConnectionStatus) => void;

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000; // 1s
const PING_INTERVAL = 5000; // 5s

class WebSocketServiceClass {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();

  /**
   * Connect to the WebSocket server with the given auth token.
   */
  connect(token: string): void {
    // Close existing connection before creating a new one
    if (this.ws) {
      const old = this.ws;
      this.ws = null;
      old.onclose = null; // prevent auto-reconnect from old socket
      old.onmessage = null;
      old.onerror = null;
      old.close();
    }
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.token = token;
    this.reconnectAttempts = 0;
    this.doConnect();
  }

  private doConnect(): void {
    if (!this.token) return;

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(`${WS_SERVER_URL}?token=${this.token}`);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as ServerMessage;
          this.notifyListeners(message);
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = (event) => {
        this.stopPing();
        if (event.code === 4001) {
          // Auth failure — don't reconnect
          this.setStatus('disconnected');
          return;
        }
        this.attemptReconnect();
      };

      this.ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch {
      this.attemptReconnect();
    }
  }

  /**
   * Send a message to the server.
   */
  send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Disconnect and stop reconnection.
   */
  disconnect(): void {
    this.token = null;
    this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // prevent reconnect
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  /**
   * Subscribe to all incoming server messages.
   */
  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /**
   * Subscribe to connection status changes.
   */
  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private notifyListeners(message: ServerMessage): void {
    for (const listener of this.messageListeners) {
      listener(message);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setStatus('disconnected');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;

    // Exponential backoff: 1s, 2s, 4s, 8s... capped at 30s
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1),
      30000,
    );

    this.reconnectTimer = setTimeout(() => {
      this.doConnect();
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping', payload: {} });
    }, PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

// Singleton export
export const WebSocketService = new WebSocketServiceClass();
