import { Application } from "pixi.js";
import { navigation } from "./navigation";
// import { InfoPopup } from "../popups/InfoPopup";
import { socketManager } from "../network/SocketManager";
import { Logger } from "./logger";
import { connectToSocket } from "./socket";
import { GAME_MODES, VIEW_MODE } from "../constants";
import { localStorageUtil } from "./localStorageUtil";
import { LOCAL_STORAGE_KEYS } from "./localStorageUtil";
import { MAX_HEIGHT, MAX_WIDTH } from "../app";

export function resizeWindowResolution(app: Application) {
  const viewMode = import.meta.env.VITE_VIEW_MODE;
  let maxWidth: number = MAX_WIDTH;
  let maxHeight: number = MAX_HEIGHT;
  if (viewMode === VIEW_MODE.WEB_VIEW) {
    maxWidth = 1920;
    maxHeight = 1080;
  }

  const windowWidth =
    window.innerWidth > maxWidth ? maxWidth : window.innerWidth;
  const windowHeight =
    window.innerHeight > maxHeight ? maxHeight : window.innerHeight;
  const minWidth = 430;
  const minHeight = 934;

  const scaleX = windowWidth < minWidth ? minWidth / windowWidth : 1;
  const scaleY = windowHeight < minHeight ? minHeight / windowHeight : 1;
  const scale = scaleX > scaleY ? scaleX : scaleY;
  const width = windowWidth * scale;
  const height = windowHeight * scale;

  app.renderer.canvas.style.width = `${windowWidth}px`;
  app.renderer.canvas.style.height = `${windowHeight}px`;
  window.scrollTo(0, 0);

  app.renderer.resize(width, height);
  navigation.resize(width, height);
}

/**
 * Get the current screen type to determine socket handling behavior
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
    screenName === "CrashResultScreen"
  ) {
    return "game";
  } else if (screenName === "MatchMakingScreen") {
    return "matchmaking";
  }

  return "other";
}

export function visibilityChange() {
  const gameMode = import.meta.env.VITE_GAME_MODE;
  if (gameMode === GAME_MODES.PRACTICE) {
    Logger.info("FTUE mode, skipping visibility change", document.hidden);
    return;
  }

  const currentScreenType = getCurrentScreenType();

  // Only log socket connection status for game-related screens
  if (currentScreenType === "game" || currentScreenType === "matchmaking") {
    Logger.info("visibilityChange", document.hidden, socketManager.isConnected);
  } else {
    Logger.info(
      "visibilityChange",
      document.hidden,
      "no socket needed for current screen",
    );
  }

  if (document.hidden) {
    navigation.blur();

    // Only disconnect socket if we're on game-related screens
    if (currentScreenType === "game" || currentScreenType === "matchmaking") {
      socketManager.disconnect();
    }
  } else {
    // Only reconnect socket if we're on game-related screens
    if (currentScreenType === "game" || currentScreenType === "matchmaking") {
      const authToken =
        localStorageUtil.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN) || "";
      connectToSocket(authToken);
    }
  }
}

// Add this function to parse query parameters
export function getQueryParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(params);
}

interface WebviewData {
  is_meta_freewin?: boolean;
  sfx_volume?: number;
  bgm_volume?: number;
  is_freewin?: boolean;
  is_drag_enabled?: boolean;
}

interface CustomWindow extends Window {
  webview_data?: WebviewData;
}

export function getWebviewData(): WebviewData | null {
  try {
    Logger.info("window.webview_data", (window as CustomWindow).webview_data);
    return (window as CustomWindow).webview_data ?? null;
  } catch (error) {
    Logger.error("Error getting webview data", error);
    return null;
  }
}
