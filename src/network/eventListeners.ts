import CONSTANTS, { CRASH_EVENTS } from "../constants";
import { Lobby, MatchFoundData, StoreData } from "../store/storeTypes";
import type {
  GameTableInfoPayload,
  CrashMatchFoundPayload,
  CrashGameConfig,
  CrashGameResultPayload,
  CrashErrorPayload,
} from "../types/crashGame";
import { CRASH_TIMING } from "../constants/crashTiming";
import { LOBBY_FORMAT, CURRENCY_CODES } from "../types";
import { Logger } from "../utils/logger";
import { navigation } from "../utils/navigation";
import { API_CONSTANTS, CURRENT_PARTNER, PARTNER_ID } from "./constants";
import { isFreeWin } from "../utils/game";
import { socketManager } from "./SocketManager";
import { ClientEvent } from "../utils/clientEvent";
import { sendMessageToApp } from "../scripts/webToAppCommunication.helper";
import { MatchMakingScreen } from "../screens/NewMatchMakingScreen";
import { CrashGameScreen } from "../screens/CrashGameScreen";
import { CrashResultScreen } from "../screens/CrashResultScreen";
import { InfoPopup } from "../popups/InfoPopup";
import { getJWTData } from "../utils/jwt";
import {
  localStorageUtil,
  LOCAL_STORAGE_KEYS,
} from "../utils/localStorageUtil";

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

  socketManager.on(
    CONSTANTS.EVENTS.GAME_TABLE_INFO,
    async (data: StoreData) => {
      Logger.info("GAME_TABLE_INFO", data);
      currentGameUserId = data.gameUserId;

      if (data.isReconnection) {
        Logger.info("Reconnecting...");
      }
      if (data.countdownSeconds) {
        const lobbyDetails = data.players[data.gameUserId].lobbyDetails;
        if (lobbyDetails) {
          navigation.showScreen(MatchMakingScreen, {
            fromRematchModel: true,
            remainingTime: data.countdownSeconds,
            username: data.players[data.gameUserId].username,
            playerProfilePicture: data.players[data.gameUserId].profilePicture,
            playerFallbackImageUrl:
              data.players[data.gameUserId].fallbackImageUrl,
            lobbyDetails: {
              ...lobbyDetails,
              _id: (
                data.players[data.gameUserId].lobbyDetails as unknown as {
                  lobbyId: string;
                }
              ).lobbyId,
            },
          });
        }
        return;
      }
    },
  );

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

      const authToken =
        localStorageUtil.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN) ?? "";
      const jwtData = authToken ? getJWTData(authToken) : null;

      if (!jwtData?.guid) {
        Logger.error(
          "CRASH GAME_TABLE_INFO: no guid in JWT",
          new Error("Missing guid"),
        );
        return;
      }

      const myPlayer =
        data.players.find((p) => p.gameUserId === (jwtData.guid as string)) ??
        data.players[0];
      currentGameUserId = myPlayer?.gameUserId ?? (jwtData.guid as string);

      // Reconnection into a finished game — skip the game screen entirely;
      // the gameResultScreen event will handle navigation to the result screen.
      if (
        data.isReconnection &&
        data.gameStateSync?.phase === "roundOver"
      ) {
        Logger.info(
          "CRASH GAME_TABLE_INFO: reconnection into roundOver — waiting for gameResultScreen",
        );
        return;
      }

      try {
        ClientEvent.GameStateChange({ gameState: "Gameplay" });

        await navigation.showScreen(CrashGameScreen, {
          matchId: data.matchId,
          isReconnection: data.isReconnection,
          gameConfig: data.gameConfig,
          players: data.players,
          gameStateSync: data.gameStateSync,
        });

        sendMessageToApp({
          eventName: "close_loader",
          context: { eventRef: "GAME_TABLE_INFO" },
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

  socketManager.on<CrashGameResultPayload>(
    CRASH_EVENTS.GAME_RESULT_SCREEN,
    async (data: CrashGameResultPayload) => {
      Logger.info("GAME_RESULT_SCREEN", data);

      const myPlayerId = currentGameUserId ?? "";
      const isWinner = data.winnerId === myPlayerId;
      const isLoser = data.looserId === myPlayerId;

      ClientEvent.GameStateChange({ gameState: "ResultScreen" });

      // Build GameEndedContext based on lobby format
      if (data.lobbyFormat === LOBBY_FORMAT.DUEL) {
        const opponentPlayer = data.players.find((p) => p.id !== myPlayerId);

        ClientEvent.GameEnded({
          matchId: data.matchId,
          lobbyFormat: LOBBY_FORMAT.DUEL,
          gameResult: isWinner
            ? "player_won"
            : isLoser
              ? "player_lost"
              : "draw",
          amount: data.yourPrize,
          user: {
            username: data.yourUsername,
            score: data.yourSurvivalTime,
            profilePicture: data.yourProfilePicture,
            rank: data.yourRank,
            winAmount: data.yourPrize,
            isTie: data.gameEndType === "DRAW",
          },
          opponent: {
            username: opponentPlayer?.username ?? "",
            score: opponentPlayer?.survivalTime ?? 0,
            profilePicture: opponentPlayer?.profilePicture ?? "",
            rank: opponentPlayer?.rank,
            winAmount: opponentPlayer?.prize,
            isTie: data.gameEndType === "DRAW",
          },
          currencyCode: data.currencyCode as CURRENCY_CODES,
        });
      } else if (data.lobbyFormat === LOBBY_FORMAT.TOURNAMENT) {
        const opponents = data.players
          .filter((p) => p.id !== myPlayerId)
          .map((p) => ({
            username: p.username,
            score: p.survivalTime,
            profilePicture: p.profilePicture,
            rank: p.rank,
            winAmount: p.prize,
            isTie: false,
          }));

        ClientEvent.GameEnded({
          matchId: data.matchId,
          lobbyFormat: LOBBY_FORMAT.TOURNAMENT,
          gameResult: data.yourRank === 1 ? "player_won" : "player_lost",
          amount: data.yourPrize,
          user: {
            username: data.yourUsername,
            score: data.yourSurvivalTime,
            profilePicture: data.yourProfilePicture,
            rank: data.yourRank,
            winAmount: data.yourPrize,
            isTie: false,
          },
          opponent: opponents,
          currencyCode: data.currencyCode as CURRENCY_CODES,
        });
      }

      ClientEvent.GameClose();

      try {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, CRASH_TIMING.RESULT_SCREEN_NAV_DELAY_MS);
        });

        const onNextRound =
          isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt
            ? () => navigation.closeWebView()
            : () => navigation.goBackToLobby(true);

        await navigation.showScreen(CrashResultScreen, {
          matchId: data.matchId,
          yourRank: data.yourRank,
          yourPrize: data.yourPrize,
          yourSurvivalTime: data.yourSurvivalTime,
          players: data.players,
          myPlayerId,
          didWin: isWinner,
          onNextRound,
        });
      } catch (error) {
        Logger.error(
          "Error on showScreen CrashResultScreen event GAME_RESULT_SCREEN",
          error,
          data,
        );
      }
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
