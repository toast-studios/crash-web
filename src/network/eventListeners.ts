import CONSTANTS, { CRASH_EVENTS, CRASH_ACTIONS } from "../constants";
import { Lobby, MatchFoundData, StoreData } from "../store/storeTypes";
import type {
  CountdownPayload,
  GameStartPayload,
  GameTableInfoPayload,
  CrashMatchFoundPayload,
  CrashGameConfig,
  CrashGameResultPayload,
  CrashErrorPayload,
  CrashActionAckResponse,
  CrashPlayerStatus,
} from "../types/crashGame";
import { CRASH_TIMING, CRASH_GAME_LIMITS } from "../constants/crashTiming";
import { LOBBY_FORMAT, CURRENCY_CODES } from "../types";
import { Logger } from "../utils/logger";
import { navigation } from "../utils/navigation";
import { API_CONSTANTS, CURRENT_PARTNER, PARTNER_ID } from "./constants";
import { isFreeWin } from "../utils/game";
import { socketManager } from "./SocketManager";
import { ClientEvent } from "../utils/clientEvent";
import { sendMessageToApp } from "../scripts/webToAppCommunication.helper";
import { MatchMakingScreen } from "../screens/NewMatchMakingScreen";
import { CountdownScreen } from "../screens/CountdownScreen";
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

/**
 * Build the player context needed to emit `joinCrashGame`.
 * Pulls from JWT, localStorage, and query params.
 */
function buildCrashPlayerContext(): {
  gameUserId: string;
  registrationId: string;
  partnerId: string;
  partnerUserId: string;
  username: string;
  profilePicture: string;
  lobbyFormat: string;
} | null {
  const authToken =
    localStorageUtil.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN) ?? "";
  const jwtData = authToken ? getJWTData(authToken) : null;

  if (!jwtData?.guid) {
    Logger.error(
      "buildCrashPlayerContext: no guid in JWT",
      new Error("Missing guid"),
    );
    return null;
  }

  const lobbyFormat =
    localStorageUtil.getItem(LOCAL_STORAGE_KEYS.QUERY_LOBBY_FORMAT) ?? "duel";

  return {
    gameUserId: jwtData.guid as string,
    registrationId: (jwtData.registrationId as string) ?? "",
    partnerId: CURRENT_PARTNER ?? "",
    partnerUserId: (jwtData.partnerUserId as string) ?? "",
    username: (jwtData.un as string) ?? "",
    profilePicture:
      localStorageUtil.getItem(LOCAL_STORAGE_KEYS.PLAYER_PROFILE_PICTURE) ?? "",
    lobbyFormat,
  };
}

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
        await navigation.dismissPopup();

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
    (data: GameTableInfoPayload) => {
      Logger.info("CRASH GAME_TABLE_INFO", data);
      crashGameConfig = data.gameConfig;

      const ctx = buildCrashPlayerContext();
      if (!ctx) {
        Logger.error(
          "CRASH GAME_TABLE_INFO: cannot build player context",
          new Error("No context"),
        );
        return;
      }

      const myPlayer =
        data.players.find((p) => p.gameUserId === ctx.gameUserId) ??
        data.players[0];
      currentGameUserId = myPlayer?.gameUserId ?? ctx.gameUserId;

      socketManager.emit<CrashActionAckResponse>(
        CRASH_ACTIONS.JOIN_CRASH_GAME,
        {
          matchId: data.matchId,
          totalPlayers: CRASH_GAME_LIMITS.TOTAL_PLAYERS,
          countdownSeconds: CRASH_TIMING.COUNTDOWN_SECONDS,
          lobbyFormat: ctx.lobbyFormat,
          playerDetails: {
            gameUserId: ctx.gameUserId,
            registrationId: ctx.registrationId,
            partnerId: ctx.partnerId,
            partnerUserId: ctx.partnerUserId,
            username: ctx.username,
            profilePicture: ctx.profilePicture,
            lobbyDetails: {},
          },
        },
        (response) => {
          if (response?.error) {
            Logger.error("joinCrashGame rejected", response.message);
          }
        },
      );
    },
  );

  socketManager.on<CrashMatchFoundPayload>(
    CRASH_EVENTS.MATCH_FOUND,
    (data: CrashMatchFoundPayload) => {
      Logger.info("CRASH MATCH_FOUND", data);
      currentGameUserId = data.yourGameUserId;

      const ctx = buildCrashPlayerContext();
      if (!ctx) {
        Logger.error(
          "CRASH MATCH_FOUND: cannot build player context",
          new Error("No context"),
        );
        return;
      }

      socketManager.emit<CrashActionAckResponse>(
        CRASH_ACTIONS.JOIN_CRASH_GAME,
        {
          matchId: data.matchId,
          totalPlayers: CRASH_GAME_LIMITS.TOTAL_PLAYERS,
          countdownSeconds: data.countdownSeconds,
          lobbyFormat: ctx.lobbyFormat,
          playerDetails: {
            gameUserId: data.yourGameUserId,
            registrationId: ctx.registrationId,
            partnerId: ctx.partnerId,
            partnerUserId: ctx.partnerUserId,
            username: ctx.username,
            profilePicture: ctx.profilePicture,
            lobbyDetails: {},
          },
        },
        (response) => {
          if (response?.error) {
            Logger.error(
              "joinCrashGame rejected (matchFound)",
              response.message,
            );
          }
        },
      );
    },
  );

  socketManager.on<CountdownPayload>(
    CRASH_EVENTS.COUNTDOWN,
    async (data: CountdownPayload) => {
      Logger.info("COUNTDOWN", data);

      const currentScreen = navigation.getCurrentScreen();
      const isAlreadyOnCountdown =
        currentScreen?.constructor.name === "CountdownScreen";

      if (!isAlreadyOnCountdown) {
        try {
          await navigation.showScreen(CountdownScreen, {
            secondsRemaining: data.secondsRemaining,
          });
        } catch (error) {
          Logger.error(
            "Error on showScreen CountdownScreen event COUNTDOWN",
            error,
            data,
          );
        }
      }
    },
  );

  socketManager.on<GameStartPayload>(
    CRASH_EVENTS.GAME_START,
    async (data: GameStartPayload) => {
      Logger.info("GAME_START", data);

      try {
        ClientEvent.GameStateChange({
          gameState: "Gameplay",
        });
        ClientEvent.GameStarted({ amount: 0 });

        await navigation.showScreen(CrashGameScreen, {
          ...data,
          gameConfig: crashGameConfig ?? undefined,
        });

        sendMessageToApp({
          eventName: "close_loader",
          context: {
            eventRef: "GAME_START",
          },
        });
      } catch (error) {
        Logger.error(
          "Error on showScreen CrashGameScreen event GAME_START",
          error,
          data,
        );
      }
    },
  );

  socketManager.on<CrashGameResultPayload>(
    CRASH_EVENTS.GAME_RESULT_SCREEN,
    async (data: CrashGameResultPayload) => {
      Logger.info("GAME_RESULT_SCREEN", data);

      const myPlayerId = currentGameUserId ?? "";

      // TEMP: Server is sending old blackjack-style payload instead of crash game payload
      // Transform it to match what CrashResultScreen expects
      const rawData = data as unknown as {
        matchId: string;
        winnerId?: string;
        looserId?: string;
        winnerPoints?: number;
        looserPoints?: number;
        gameEndType?: string;
        elapsed?: number;
        yourRank?: number;
        yourPrize?: number;
        yourSurvivalTime?: number;
        players?: Array<{
          id: string;
          name: string;
          status: CrashPlayerStatus;
          survivalTime: number;
          boostCount: number;
          coolCount: number;
          prize: number;
          rank: number;
        }>;
      };

      const isWinner = rawData.winnerId === myPlayerId;
      const isLoser = rawData.looserId === myPlayerId;

      ClientEvent.GameStateChange({ gameState: "ResultScreen" });
      ClientEvent.GameEnded({
        matchId: rawData.matchId,
        lobbyFormat: LOBBY_FORMAT.DUEL,
        gameResult: isWinner ? "player_won" : isLoser ? "player_lost" : "draw",
        amount: rawData.yourPrize ?? 0,
        user: {
          username: "",
          score: rawData.yourSurvivalTime ?? 0,
          profilePicture: "",
          rank: rawData.yourRank ?? 0,
          winAmount: rawData.yourPrize ?? 0,
          isTie: false,
        },
        opponent: {
          username: "",
          score: 0,
          profilePicture: "",
          isTie: false,
        },
        currencyCode: CURRENCY_CODES.PLAY_COINS,
      });
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
          matchId: rawData.matchId,
          elapsed: rawData.elapsed ?? 0,
          yourRank: rawData.yourRank ?? (isWinner ? 1 : isLoser ? 2 : 0),
          yourPrize: rawData.yourPrize ?? 0,
          yourSurvivalTime:
            rawData.yourSurvivalTime ??
            (isWinner
              ? (rawData.winnerPoints ?? 0)
              : isLoser
                ? (rawData.looserPoints ?? 0)
                : 0),
          players: rawData.players ?? [],
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
