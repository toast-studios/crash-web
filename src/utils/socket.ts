import { GAME_MODES } from "../constants";
import { apiClient } from "../network/apis";
import {
  API_CONSTANTS,
  CURRENT_PARTNER,
  PARTNER_ID,
} from "../network/constants";
import { attachEventListeners } from "../network/eventListeners";
import { InfoPopup } from "../popups/InfoPopup";
import { ClientEvent } from "./clientEvent";
import { isFreeWin } from "./game";
import { localStorageUtil } from "./localStorageUtil";
import { Logger } from "./logger";
import { navigation } from "./navigation";
import { getQueryParams } from "./window";

/**
 * Get the current screen type to determine appropriate error handling
 */
function getCurrentScreenType(): "lobby" | "game" | "matchmaking" | "other" {
  const currentScreen = navigation.getCurrentScreen();
  if (!currentScreen) return "other";

  const screenName = currentScreen.constructor.name;

  if (
    screenName === "LobbyScreen" ||
    screenName === "LobbyScreenDefaultLayout"
  ) {
    return "lobby";
  } else if (
    screenName === "GameScreen" ||
    screenName === "TournamentGameScreen" ||
    screenName === "CrashGameScreen" ||
    screenName === "CountdownScreen" ||
    screenName === "CrashResultScreen"
  ) {
    return "game";
  } else if (screenName === "MatchMakingScreen") {
    return "matchmaking";
  }

  return "other";
}

export async function connectToSocket(gameAuthToken: string): Promise<boolean> {
  const { socketManager } = await import("../network/SocketManager");
  try {
    Logger.info("connect to socket called", API_CONSTANTS.WEBSOCKET_URL);
    socketManager.init({
      socketUrl: API_CONSTANTS.WEBSOCKET_URL,
      auth: {
        token: gameAuthToken,
      },
    });
    Logger.info("connect to socket called");
    apiClient.setAuthToken(gameAuthToken);
    attachEventListeners();
    await socketManager.connect();
    ClientEvent.AuthSuccess();
    return true;
  } catch (error) {
    if ((error as Error).message === "invalid auth token") {
      handleSocketError(error);
      handleAuthfailedForPlayable();
    } else if ((error as Error).message === "Rejoin failed") {
      if (getQueryParams().mode === "challenger") {
        navigation.closeWebView();
      } else {
        // Use the unified error handling for rejoin failures
        handleSocketError(new Error("Rejoin failed"), false);
      }
    } else if ((error as Error).message === "Disconnected from server") {
      handleSocketError(error);
      handleAuthfailedForPlayable();
    } else if ((error as Error).message === "No token provided") {
      handleSocketError(error);
      handleAuthfailedForPlayable();
    } else {
      handleSocketError(error);
      handleAuthfailedForPlayable();
      navigation.presentPopup(InfoPopup, {
        message: "Unable to connect to server. Please try again later.",
        showOkButton: true,
        okButtonText: "Reconnect",
        onOkPress: () => {
          navigation.presentPopup(InfoPopup, {
            message: "Reconnecting to server...",
            showOkButton: false,
            showLoader: true,
          });
          connectToSocket(gameAuthToken);
        },
      });
    }

    return false;
  }
}

const handleSocketError = (error: Error | unknown, log: boolean = true) => {
  const errorMessage =
    error instanceof Error ? (error as Error).message : "Unknown error";
  if (log) {
    ClientEvent.AuthFailed({
      reason: errorMessage,
    });
    Logger.error("Error connecting to socket", error, errorMessage);
  }

  const currentScreenType = getCurrentScreenType();

  if (isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt) {
    navigation.closeWebView(errorMessage);
  } else {
    // For game and matchmaking screens, show appropriate error popup
    if (currentScreenType === "game" || currentScreenType === "matchmaking") {
      let message: string;
      if (errorMessage === "Rejoin failed") {
        message =
          currentScreenType === "game"
            ? "We are unable to connect to the game. It may have ended. Redirecting back to lobby in 3..."
            : "Unable to find match. Redirecting back to lobby in 3...";
      } else {
        message = "Connection error. Redirecting back to lobby in 3...";
      }

      navigation.presentPopup(InfoPopup, {
        message,
        showOkButton: false,
        showLoader: false,
      });

      // Countdown and redirect to lobby
      let countdown = 3;
      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          navigation.presentPopup(InfoPopup, {
            message: message.replace("3...", `${countdown}...`),
            showOkButton: false,
            showLoader: false,
          });
        } else {
          clearInterval(countdownInterval);
          navigation.dismissPopup();
          navigation.goBackToLobby(true);
        }
      }, 1000);
    } else {
      // For other screens, directly go back to lobby
      navigation.goBackToLobby(false);
    }
  }
};

const handleAuthfailedForPlayable = () => {
  if (API_CONSTANTS.GAME_MODES === GAME_MODES.PLAYABLE) {
    localStorageUtil.reset();
    window.location.reload();
    return false;
  }
  return true;
};
