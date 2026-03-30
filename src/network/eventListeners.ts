import CONSTANTS, { CRASH_EVENTS } from "../constants";
import { Lobby, MatchFoundData } from "../store/storeTypes";
import type {
  GameTableInfoPayload,
  CrashMatchFoundPayload,
  CrashGameConfig,
  CrashErrorPayload,
} from "../types/crashGame";
import { Logger } from "../utils/logger";
import { navigation } from "../utils/navigation";
import { API_CONSTANTS } from "./constants";
import { socketManager } from "./SocketManager";
import { ClientEvent } from "../utils/clientEvent";
import { sendMessageToApp } from "../scripts/webToAppCommunication.helper";
import { MatchMakingScreen } from "../screens/NewMatchMakingScreen";
import { CrashGameScreen } from "../screens/CrashGameScreen";
import { InfoPopup } from "../popups/InfoPopup";

let currentGameUserId: string | null = null;

/** Crash game config received from gameTableInfo, persists until the next game. */
let crashGameConfig: CrashGameConfig | null = null;

export const attachEventListeners = () => {
  // --- Existing matchmaking handlers (kept as-is) ---

  socketManager.on(
    CONSTANTS.EVENTS.WAITING_FOR_OPPONENT,
    async (data: {
      remainingTime: number;
      profileInfo: {
        pp: string;
        ppFallback: string;
        un: string;
        id: string;
      };
      lobbyDetails: Lobby;
    }) => {
      Logger.info("WAITING_FOR_OPPONENT", data);
      try {
        ClientEvent.WaitingForOpponent({
          remainingTime: data.remainingTime,
        });
        ClientEvent.GameStateChange({
          gameState: "Matchmaking",
        });
        // await navigation.dismissPopup();

        await navigation.showScreen(MatchMakingScreen, {
          fromRematchModel: false,
          username: data.profileInfo.un,
          remainingTime: data.remainingTime,
          playerProfilePicture: data.profileInfo.pp,
          playerFallbackImageUrl: data.profileInfo.ppFallback,
          lobbyDetails: {
            ...data.lobbyDetails,
            _id: (data.lobbyDetails as unknown as { lobbyId: string }).lobbyId,
          },
        });
      } catch (error) {
        Logger.error(
          "Error on showScreen MatchMakingScreen event WAITING_FOR_OPPONENT",
          error,
          data,
        );
      }

      if (data.remainingTime > 10) {
        try {
          Logger.checkAndUploadExistingLogs(
            data.profileInfo.id,
            API_CONSTANTS.LOG_UPLOAD_URL,
          );
        } catch (error) {
          Logger.error("Error uploading logs", error);
        }
      }
    },
  );

  // socketManager.on(
  //   CONSTANTS.EVENTS.GAME_TABLE_INFO,
  //   async (data: StoreData) => {
  //     Logger.info("GAME_TABLE_INFO", data);
  //     currentGameUserId = data.gameUserId;

  //     if (data.isReconnection) {
  //       Logger.info("Reconnecting...");
  //     }
  //     if (data.countdownSeconds) {
  //       const lobbyDetails = data.players[data.gameUserId].lobbyDetails;
  //       if (lobbyDetails) {
  //         navigation.showScreen(MatchMakingScreen, {
  //           fromRematchModel: true,
  //           remainingTime: data.countdownSeconds,
  //           username: data.players[data.gameUserId].username,
  //           playerProfilePicture: data.players[data.gameUserId].profilePicture,
  //           playerFallbackImageUrl:
  //             data.players[data.gameUserId].fallbackImageUrl,
  //           lobbyDetails: {
  //             ...lobbyDetails,
  //             _id: (
  //               data.players[data.gameUserId].lobbyDetails as unknown as {
  //                 lobbyId: string;
  //               }
  //             ).lobbyId,
  //           },
  //         });
  //       }
  //       return;
  //     }
  //   },
  // );

  socketManager.on(CONSTANTS.EVENTS.MATCH_FOUND, (data: MatchFoundData) => {
    ClientEvent.MatchFound(
      (data?.opponents || []).filter(
        (opponent) => opponent.gameUserId !== data.gameUserId,
      ),
    );
  });

  socketManager.on(CONSTANTS.EVENTS.MATCH_NOT_FOUND, () => {
    ClientEvent.MatchNotFound();
    navigation.dismissPopup();
  });

  // --- Crash Game (HeatWave PvP) event handlers ---

  socketManager.on<GameTableInfoPayload>(
    CRASH_EVENTS.GAME_TABLE_INFO,
    async (data: GameTableInfoPayload) => {
      Logger.info("CRASH GAME_TABLE_INFO", data);
      crashGameConfig = data.gameConfig;

      const myPlayer = data.players.find(
        (p) => p.gameUserId === data.gameUserId,
      );

      if (!myPlayer) {
        Logger.error(
          "CRASH GAME_TABLE_INFO: myPlayer not found in players array",
          new Error("Missing player"),
        );
        return;
      }

      currentGameUserId = data.gameUserId;

      try {
        ClientEvent.GameStateChange({ gameState: "Gameplay" });

        await navigation.showScreen(CrashGameScreen, {
          matchId: data.matchId,
          isReconnection: data.isReconnection,
          gameUserId: data.gameUserId,
          gameConfig: data.gameConfig,
          players: data.players,
          gameStateSync: data.gameStateSync,
        });
        sendMessageToApp({
          eventName: "close_loader",
          context: { eventRef: "GAME_TABLE_INFO" },
        });

        ClientEvent.GameStarted({
          amount: myPlayer.lobbyDetails?.entryFee ?? 0,
        });
      } catch (error) {
        Logger.error(
          "Error on showScreen CrashGameScreen event CRASH GAME_TABLE_INFO",
          error,
          data,
        );
      }
    },
  );

  socketManager.on<CrashMatchFoundPayload>(
    CRASH_EVENTS.MATCH_FOUND,
    (data: CrashMatchFoundPayload) => {
      Logger.info("CRASH MATCH_FOUND", data);
      currentGameUserId = data.yourGameUserId;
    },
  );

  socketManager.on<CrashErrorPayload>(
    CRASH_EVENTS.GAME_ERROR,
    (data: CrashErrorPayload) => {
      Logger.error("CRASH GAME_ERROR", data.message);
      navigation.presentPopup(InfoPopup, {
        message: data.message || "A game error occurred.",
        showOkButton: true,
        okButtonText: "OK",
      });
    },
  );

  socketManager.on(
    CRASH_EVENTS.MATCH_NOT_FOUND,
    (data: { matchId: string }) => {
      Logger.error("CRASH MATCH_NOT_FOUND", data.matchId);
      navigation.dismissPopup();
      navigation.presentPopup(InfoPopup, {
        message: "Match not found. Please try again.",
        showOkButton: true,
        okButtonText: "OK",
      });
    },
  );
};

/** Returns the stored crash game config (set by gameTableInfo). */
export function getCrashGameConfig(): CrashGameConfig | null {
  return crashGameConfig;
}

/** Returns the current game user ID (set by gameTableInfo / matchFound). */
export function getCurrentGameUserId(): string | null {
  return currentGameUserId;
}
