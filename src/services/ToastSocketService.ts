// === Toast Socket Service ===
// Socket.IO wrapper for Toast's crash-game server.
// Replaces the raw WebSocket service.

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://api-staging-crash.toaststudios.io';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

type EventListener<T = unknown> = (data: T) => void;
type StatusListener = (status: ConnectionStatus) => void;

class ToastSocketServiceClass {
  private socket: Socket | null = null;
  private status: ConnectionStatus = 'disconnected';

  private statusListeners = new Set<StatusListener>();
  // Stored so we can (re)attach after connect()
  private eventListeners = new Map<string, Set<EventListener>>();

  connect(token: string): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.setStatus('connecting');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      this.setStatus('connected');
    });

    this.socket.on('disconnect', () => {
      this.setStatus('disconnected');
    });

    this.socket.on('connect_error', () => {
      this.setStatus('reconnecting');
    });

    // Re-attach all registered event listeners to the new socket
    for (const [event, listeners] of this.eventListeners) {
      for (const listener of listeners) {
        this.socket.on(event, listener);
      }
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.setStatus('disconnected');
  }

  emit<T = unknown>(event: string, data: T, ack?: (response: unknown) => void): void {
    if (!this.socket?.connected) return;
    if (ack) {
      this.socket.emit(event, data, ack);
    } else {
      this.socket.emit(event, data);
    }
  }

  /**
   * Subscribe to a server event. Returns an unsubscribe function.
   * Safe to call before connect() — listeners are re-attached on connect.
   */
  on<T = unknown>(event: string, listener: EventListener<T>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener as EventListener);

    // If already connected, attach immediately
    this.socket?.on(event, listener);

    return () => this.off(event, listener);
  }

  off<T = unknown>(event: string, listener: EventListener<T>): void {
    this.eventListeners.get(event)?.delete(listener as EventListener);
    this.socket?.off(event, listener);
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}

export const ToastSocketService = new ToastSocketServiceClass();
