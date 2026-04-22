import { openDB, DBSchema, IDBPDatabase, deleteDB } from "idb";
import { AxiosError } from "axios";
import { logError } from "../scripts/sentry";
import { GAME_ENVIRONMENT } from "../constants";
import { getSessionId } from "./game";
import { LOCAL_STORAGE_KEYS } from "./localStorageUtil";
import { localStorageUtil } from "./localStorageUtil";

export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
  CRITICAL,
}

type LogContext = unknown;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext[];
}

interface LogDB extends DBSchema {
  logs: {
    key: string;
    value: string;
    indexes: { "by-timestamp": string };
  };
}

export class WebviewLogger {
  private level: LogLevel;
  private db: IDBPDatabase<LogDB> | null = null;
  private uploadStatusVer: "uploading" | "uploaded" | "failed" | "no_action" =
    "no_action";

  private oldSessions: string[] = JSON.parse(
    localStorageUtil.getItem(LOCAL_STORAGE_KEYS.OLD_SESSIONS) || "[]",
  );
  get uploadStatus() {
    Logger.info("getUploadStatus", this.uploadStatusVer);
    return this.uploadStatusVer;
  }
  set uploadStatus(status: "uploading" | "uploaded" | "failed" | "no_action") {
    Logger.info("setUploadStatus", status);
    this.uploadStatusVer = status;
  }

  private addSessionIdToOldSessions = (sessionId: string) => {
    this.oldSessions.push(sessionId);
    localStorageUtil.setItem(
      LOCAL_STORAGE_KEYS.OLD_SESSIONS,
      JSON.stringify(this.oldSessions),
    );
  };

  private removeSessionIdFromOldSessions = (sessionIds: string[]) => {
    this.oldSessions = this.oldSessions.filter(
      (id) => !sessionIds.includes(id),
    );
    localStorageUtil.setItem(
      LOCAL_STORAGE_KEYS.OLD_SESSIONS,
      JSON.stringify(this.oldSessions),
    );
  };

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }
  private sessionId: string = "";

  private indexedDBSupport = () => {
    return (
      "indexedDB" in window ||
      "webkitIndexedDB" in window ||
      "mozIndexedDB" in window ||
      "msIndexedDB" in window ||
      "oIndexedDB" in window
    );
  };

  public async initialize(): Promise<void> {
    try {
      console.log("Initializing logger");
      if (!this.indexedDBSupport()) {
        console.log("IndexedDB not supported");
        return;
      }

      this.sessionId = getSessionId();
      console.log("Checking if session DB exists");
      if (!this.oldSessions.includes(this.sessionId)) {
        this.addSessionIdToOldSessions(this.sessionId);
      } else {
        console.log("Session DB already exists");
      }

      this.db = await openDB<LogDB>(this.sessionId, 1, {
        upgrade(db) {
          db.createObjectStore("logs", {
            autoIncrement: true,
          });
        },
      });

      console.log(`Logger initialized with session ID: ${this.sessionId}`);
      this.setupGlobalErrorHandler();
    } catch (error) {
      logError(error as Error, {
        message: "Error initializing logger",
      });
    }
  }

  private formatLogContext = (context: LogContext[]) => {
    return context
      .map((context) => {
        if (context instanceof Error) {
          return this.errorToString(context);
        }
        if (typeof context === "object") {
          return JSON.stringify(context);
        }
        return JSON.stringify(context);
      })
      .join(", ");
  };

  private formatLog = (log: LogEntry) => {
    return `${log.timestamp} [${LogLevel[log.level]}] ${log.message} ${this.formatLogContext(log.context)}`;
  };

  private async log(
    level: LogLevel,
    message: string,
    ...context: LogContext[]
  ): Promise<void> {
    try {
      if (level >= this.level) {
        const timestamp = new Date().toISOString();
        const logMessage = this.formatLog({
          timestamp,
          level,
          message,
          context,
        });

        if (
          import.meta.env.VITE_GAME_ENVIRONMENT !== GAME_ENVIRONMENT.PRODUCTION
        ) {
          if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
            console.error(logMessage);
          } else {
            console.log(logMessage);
          }
        }

        if (this.db) {
          try {
            // Check if database is still open before attempting to write
            // IDBDatabase object doesn't have a direct "isOpen" property,
            // but we can catch the error if the connection is closing
            await this.db.put("logs", logMessage);
          } catch (dbError) {
            // Gracefully handle database connection closing errors
            if (
              dbError instanceof DOMException &&
              (dbError.name === "InvalidStateError" ||
                dbError.message.includes("connection is closing") ||
                dbError.message.includes("transaction"))
            ) {
              // Database is closing, mark as null so we don't try again
              this.db = null;
              // Don't log this error to avoid infinite loops
              return;
            }
            // For other database errors, rethrow to be caught by outer catch
            throw dbError;
          }
        }
      }
    } catch (error) {
      console.error("Error logging", error);
      logError(error as Error, {
        message,
        context,
        hint: "error in logger log catch block",
      });
    }
  }

  debug(message: string, ...context: LogContext[]): void {
    this.log(LogLevel.DEBUG, message, ...context);
  }

  info(message: string, ...context: LogContext[]): void {
    this.log(LogLevel.INFO, message, ...context);
  }

  warn(message: string, ...context: LogContext[]): void {
    this.log(LogLevel.WARN, message, ...context);
  }

  error(
    message: string,
    error: Error | unknown,
    ...context: LogContext[]
  ): void {
    this.log(LogLevel.ERROR, message, error, ...context);
    if (error) {
      // Skip logging AxiosError to Sentry here - it's already logged by the API interceptor
      // This prevents duplicate error entries in Sentry
      if (error instanceof AxiosError) {
        return;
      }
      logError(error as Error, {
        message,
        context,
        logLevel: "ERROR",
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
      });
    }
  }

  critical(message: string, ...context: LogContext[]): void {
    this.log(LogLevel.CRITICAL, message, ...context);
    logError(new Error(message), {
      context,
      logLevel: "CRITICAL",
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    });
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  async uploadLogsToServer(userId: string, apiEndpoint: string): Promise<void> {
    try {
      if (this.uploadStatus === "uploaded") {
        Logger.info("Logs already uploaded.");
        return;
      }

      if (this.uploadStatus === "uploading") {
        Logger.info("Logs uploading process already is ongoing!!!");
        return;
      } else {
        this.uploadStatus = "uploading";
      }

      if (!this.db) {
        Logger.info("No database found, skipping upload");
        return;
      }

      Logger.info(
        `found old sessions: ${JSON.stringify(this.oldSessions)}, uploading...`,
      );

      // Get all session logs first before any database operations
      const sessionLogsPromises = this.oldSessions.map(async (sessionId) => {
        if (this.sessionId === sessionId) {
          Logger.info("Skipping upload for current session");
          return { sessionId, logs: [] };
        }
        try {
          const logs = await this.getSessionLogs(sessionId);
          return { sessionId, logs };
        } catch (error) {
          Logger.info("Error getting session logs", sessionId, error);
          return { sessionId, logs: [] };
        }
      });

      const sessionLogs = await Promise.all(sessionLogsPromises);

      // Upload logs in parallel for all sessions except the current one and with logs
      await Promise.all(
        sessionLogs.map(async ({ sessionId, logs }) => {
          if (sessionId !== this.sessionId && logs.length > 0) {
            await this.uploadSessionLogsToServer(
              sessionId,
              userId,
              apiEndpoint,
              logs,
            );
          }
        }),
      );

      Logger.info("Logs uploaded successfully");
      this.uploadStatus = "uploaded";

      // Remove old sessions after successful upload
      const sessionsToRemove = this.oldSessions.filter(
        (id) => id !== this.sessionId,
      );
      this.removeSessionIdFromOldSessions(sessionsToRemove);
    } catch (error) {
      Logger.error("Error uploading logs", error);
      this.uploadStatus = "failed";
    }
  }

  private errorToString = (error: Error | unknown) => {
    if (error instanceof Error) {
      let errorString = `${error.name}: ${error.message}`;

      if (error.stack) {
        errorString += `\nStack trace:\n${error.stack}`;
      }

      if (error.cause) {
        errorString += `\nCaused by: ${this.errorToString(error.cause)}`;
      }

      // Include any custom properties
      const customProps = Object.keys(error).filter(
        (key) => !["name", "message", "stack"].includes(key),
      );
      if (customProps.length > 0) {
        errorString += "\nAdditional properties:";
        customProps.forEach((prop) => {
          errorString += `\n${prop}: ${JSON.stringify(error[prop as keyof Error])}`;
        });
      }

      return errorString;
    } else if (typeof error === "object" && error !== null) {
      return JSON.stringify(error, null, 2);
    } else {
      return String(error);
    }
  };

  private setupGlobalErrorHandler(): void {
    window.addEventListener("error", (event) => {
      this.critical("Uncaught error:", event.error);
      event.preventDefault();
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.critical("Unhandled promise rejection:", event.reason);
      event.preventDefault();
    });

    // Intercept console.warn to log warnings
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      this.warn("Console warning:", ...args);
      originalWarn.apply(console, args);
    };
  }

  get checkAndUploadExistingLogs() {
    return this.uploadLogsToServer;
  }

  private async getSessionLogs(sessionId: string) {
    try {
      const db = await openDB<LogDB>(sessionId, 1);
      const logs = await db.getAll("logs");
      db.close(); // Explicitly close the database connection
      return logs;
    } catch (error) {
      Logger.info("Error getting session logs", sessionId, error);
      return [];
    }
  }

  private async uploadSessionLogsToServer(
    sessionId: string,
    userId: string,
    apiEndpoint: string,
    logs: string[],
  ) {
    try {
      if (logs.length === 0) {
        Logger.info("No logs to upload. sessionId: ", sessionId);
        try {
          await deleteDB(sessionId);
        } catch (deleteError) {
          Logger.info(
            "Error deleting empty session DB",
            sessionId,
            deleteError,
          );
        }
        return;
      }

      Logger.info("Uploading logs.... ", sessionId);
      const fileContent = logs.join("\n");

      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: JSON.stringify({
          file_name: `${userId}_${sessionId}.txt`,
          file_content: fileContent,
          is_webview_log: true,
          game_name: "blackjack",
        }),
      });

      if (response.ok) {
        console.log("Logs uploaded successfully");
        try {
          await deleteDB(sessionId);
          Logger.info("Uploaded logs and deleted old session: ", sessionId);
        } catch (deleteError) {
          Logger.info(
            "Error deleting session DB after upload",
            sessionId,
            deleteError,
          );
        }
      } else {
        Logger.info("Failed to upload logs ", response);
      }
    } catch (error) {
      Logger.error("Error uploading logs", error);
    }
  }
}

export const Logger = new WebviewLogger();
