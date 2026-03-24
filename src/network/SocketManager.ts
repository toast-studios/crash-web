import { io, Socket } from "socket.io-client";
import { Logger } from "../utils/logger";
import { navigation } from "../utils/navigation";
import { InfoPopup } from "../popups/InfoPopup";

export interface ISocketManager {
  init(options: {
    auth: {
      [key: string]: unknown;
    };

    socketUrl: string;
  }): void;
  connect(): Promise<void>;
  disconnect(): void;
  on(event: string, callback: (data: unknown) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, callback?: (data: any) => void): void;
  onAny(
    callback: (
      event: string,
      data: { error: boolean; message: string; data: unknown },
    ) => void,
  ): void;
  emit(
    event: string,
    data: NonNullable<unknown>,
    callback?: (data: {
      data: unknown;
      message: string;
      error: boolean;
    }) => void,
  ): void;
}

class SocketManager implements ISocketManager {
  private socket: Socket | undefined;
  private pingInterval: NodeJS.Timeout | null = null;
  private pingTimeout: NodeJS.Timeout | null = null;
  private failedPingAttempts = 0;
  private readonly MAX_PING_ATTEMPTS = 2;
  private readonly PING_INTERVAL = 2000; // 2 seconds
  private readonly PING_TIMEOUT = 2000; // 2 seconds timeout

  public init({
    auth,
    socketUrl,
  }: {
    auth: {
      [key: string]: unknown;
    };
    socketUrl: string;
  }) {
    try {
      this.socket = io(socketUrl, {
        auth: auth,
        autoConnect: false,
        transports: ["websocket", "polling"],
        withCredentials: true,
        extraHeaders: {
          "Access-Control-Allow-Origin": "*",
        },

        // * reconnection handling
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
      });

      Logger.info(
        "============================ Socket initialized =========================",
        "Server URL: " + socketUrl,
        "Socket ID: " + this.socket.id,
        "Socket connected: " + this.socket.connected,
      );
    } catch (error) {
      Logger.error("Error initializing socket", error);
    }
  }

  private startPingInterval() {
    // Clear any existing interval before starting a new one so rapid
    // connect/reconnect cycles don't accumulate parallel ping loops.
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.pingInterval = setInterval(() => {
      try {
        this.socketInstance.emit("ping", null, () => {
          this.resetPingTimeout();
        });
      } catch (error) {
        Logger.error("error in ping interval", error);
        this.setPingTimeout();
      }
    }, this.PING_INTERVAL);
  }

  private setPingTimeout() {
    this.pingTimeout = setTimeout(() => {
      this.handlePingFailure();
    }, this.PING_TIMEOUT);
  }

  private resetPingTimeout() {
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }

  private handlePingFailure() {
    this.failedPingAttempts++;
    if (this.failedPingAttempts >= this.MAX_PING_ATTEMPTS) {
      this.showDisconnectionPopup();
      this.disconnect();
    }
  }

  private showDisconnectionPopup() {
    Logger.error("Connection lost, Showing popup", null);
    // Implement your popup logic here
    navigation.presentPopup(InfoPopup, {
      message: "Connection lost, Please check your internet connection",
      showOkButton: true,
      okButtonText: "Reconnect",
      onOkPress: () => {
        navigation.presentPopup(InfoPopup, {
          message: "Reconnecting to server...",
          showOkButton: false,
          showLoader: true,
        });
        this.startPingInterval();
        this.connect();
      },
    });
  }

  public async connect() {
    Logger.info("Connecting to socket", this.socket?.connected);
    if (!this.socket?.connected) {
      this.socketInstance.connect();
    }
    await new Promise<void>((resolve, reject) => {
      // Use `once` so these one-shot handshake listeners don't accumulate across
      // repeated connect() calls (e.g. on each visibilitychange reconnect).
      const onConnect = () => {
        Logger.info("Connected to server", this.socket?.id);
        this.startPingInterval();
        resolve();
      };

      const onConnectError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onError = (error: Error) => {
        Logger.error("error listener", error);
        cleanup();
        reject(error);
      };

      const onDisconnect = () => {
        cleanup();
        reject(new Error("Disconnected from server"));
      };

      const cleanup = () => {
        this.socket?.off("connect", onConnect);
        this.socket?.off("connect_error", onConnectError);
        this.socket?.off("error", onError);
        this.socket?.off("disconnect", onDisconnect);
      };

      this.socket?.once("connect", () => {
        cleanup();
        onConnect();
      });
      this.socket?.once("connect_error", onConnectError);
      this.socket?.once("error", onError);
      this.socket?.once("disconnect", onDisconnect);
    });
  }

  private get socketInstance() {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }
    return this.socket;
  }

  public disconnect() {
    try {
      this.failedPingAttempts = 0;
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      if (this.pingTimeout) {
        clearTimeout(this.pingTimeout);
        this.pingTimeout = null;
      }
      if (this.socket && this.socket.connected) {
        this.socketInstance.offAny();
        this.socketInstance.disconnect();
      }
    } catch (error) {
      Logger.error("Error disconnecting from server", error);
    }
  }

  public on<T>(event: string, callback: (data: T) => void) {
    this.socketInstance.on(event, callback);
  }

  public onAny(
    callback: (
      event: string,
      data: {
        error: boolean;
        message: string;
        data: unknown;
      },
    ) => void,
  ) {
    this.socketInstance.onAny(callback);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public off(event: string, callback?: (data: any) => void) {
    if (callback) {
      this.socketInstance.off(event, callback);
    } else {
      this.socketInstance.off(event);
    }
  }

  // public emit(
  //   event: string,
  //   data: NonNullable<unknown>,
  //   callback?: (data: {
  //     data: unknown;
  //     message: string;
  //     error: boolean;
  //   }) => void,
  // ) {
  //   this.socketInstance.emit(event, data, callback);
  // }

  public emit<T>(
    event: string,
    data: NonNullable<unknown>,
    callback?: (data: { data: T; message: string; error: boolean }) => void,
  ) {
    this.socketInstance.emit(event, data, callback);
  }

  public get isConnected() {
    if (!this.socket) {
      return false;
    }
    return this.socket.connected;
  }
}

const socketManager = new SocketManager();

export { socketManager };
