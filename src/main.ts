import { GAME_ENVIRONMENT } from "./constants";
import { initSentry, logError } from "./scripts/sentry";
import { getJWTData } from "./utils/jwt";
import { Logger } from "./utils/logger";
import { navigation } from "./utils/navigation";
import { getQueryParams } from "./utils/window";
import { localStorageUtil, LOCAL_STORAGE_KEYS } from "./utils/localStorageUtil";
import { LOBBY_FORMAT } from "./types";

/**
 * Shows a minimal HTML error overlay when the popup system is not yet available.
 * Avoids alert() which blocks the JS thread and crashes some Android webviews.
 */
function showFatalErrorOverlay(message: string): void {
  try {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:#0d0d2b;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;padding:24px;font-family:sans-serif;text-align:center;";
    overlay.innerHTML = `<p style="font-size:16px;margin-bottom:16px;">Something went wrong. Please reload.</p><p style="font-size:12px;color:#888;word-break:break-all;">${message}</p><button onclick="window.location.reload()" style="margin-top:20px;padding:10px 24px;background:#e05c00;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;">Reload</button>`;
    document.body.appendChild(overlay);
  } catch {
    // If DOM is unavailable, silently fail — crashing here would mask the original error.
  }
}

// Helper function to dispatch loading progress
const dispatchProgress = (
  step: string,
  percentage: number,
  message: string,
) => {
  window.dispatchEvent(
    new CustomEvent("loadingProgress", {
      detail: { step, percentage, message },
    }),
  );
};

/**
 * Global safety net for unhandled promise rejections.
 * Without this, a rejected promise from any socket event, asset load, or animation
 * will silently crash the JS context in some Android webviews.
 */
window.addEventListener("unhandledrejection", (event) => {
  const reason =
    event.reason instanceof Error
      ? event.reason.message
      : String(event.reason ?? "Unknown promise rejection");
  Logger.error("Unhandled promise rejection", event.reason, { reason });
  logError(event.reason instanceof Error ? event.reason : new Error(reason), {
    message: "Unhandled promise rejection",
    reason,
  });
  // Prevent the default which would terminate the JS context in some environments.
  event.preventDefault();
});

export const init = async () => {
  try {
    // App initialization started
    dispatchProgress("appInit", 10, "Initializing game...");

    if (import.meta.env.VITE_GAME_ENVIRONMENT === GAME_ENVIRONMENT.PRODUCTION) {
      initSentry();
    }
    await Logger.initialize();

    const authParams = getQueryParams();
    if (authParams && authParams.at) {
      const jwtData = getJWTData(authParams.at);

      if (jwtData?.guid) {
        await Logger.checkAndUploadExistingLogs(
          jwtData?.guid as string,
          "https://cdv9p0l9h0.execute-api.ap-south-1.amazonaws.com",
        );
      }
      if (jwtData?.pp) {
        // * set player profile picture fot ftue sync
        localStorageUtil.setItem(
          LOCAL_STORAGE_KEYS.PLAYER_PROFILE_PICTURE,
          jwtData.pp as string,
        );
      }
    } else {
      Logger.info("No auth token found on log upload");
    }

    // Handle lobbyFormat query parameter
    if (authParams?.lobbyFormat) {
      const lobbyFormatParam = authParams.lobbyFormat.toLowerCase();
      if (
        lobbyFormatParam === LOBBY_FORMAT.DUEL ||
        lobbyFormatParam === LOBBY_FORMAT.TOURNAMENT
      ) {
        localStorageUtil.setItem(
          LOCAL_STORAGE_KEYS.QUERY_LOBBY_FORMAT,
          lobbyFormatParam,
        );
        Logger.info("Lobby format set from query param:", lobbyFormatParam);
      } else {
        Logger.warn("Invalid lobbyFormat query param:", authParams.lobbyFormat);
      }
    }

    // Handle profile picture query parameters
    if (authParams?.playerProfilePicture) {
      localStorageUtil.setItem(
        LOCAL_STORAGE_KEYS.PLAYER_PROFILE_PICTURE,
        authParams.playerProfilePicture,
      );
      Logger.info(
        "Player profile picture set from query param:",
        authParams.playerProfilePicture,
      );
    }

    if (authParams?.opponentProfilePicture) {
      localStorageUtil.setItem(
        LOCAL_STORAGE_KEYS.OPPONENT_PROFILE_PICTURE,
        authParams.opponentProfilePicture,
      );
      Logger.info(
        "Opponent profile picture set from query param:",
        authParams.opponentProfilePicture,
      );
    }

    Logger.info(
      "import.meta.env.VITE_GAME_MODE",
      import.meta.env.VITE_GAME_MODE,
    );
    Logger.info(
      "import.meta.env.VITE_GAME_ENVIRONMENT",
      import.meta.env.VITE_GAME_ENVIRONMENT,
    );
    Logger.info(
      "import.meta.env.VITE_WEB_VERSION",
      import.meta.env.VITE_WEB_VERSION,
    );

    Logger.info(
      "import.meta.env.VITE_PARTNER_ID",
      import.meta.env.VITE_PARTNER_ID,
    );

    Logger.info(
      "import.meta.env.VITE_VIEW_MODE",
      import.meta.env.VITE_VIEW_MODE,
    );

    // App initialization complete
    dispatchProgress("appInit", 25, "Game initialized");

    const app = await import("./app");
    await app.initApp();
  } catch (error) {
    const message = (error as Error).message ?? "Unknown error";
    logError(error as Error, { message: "Error initializing app" });
    showFatalErrorOverlay("Error initializing app: " + message);
    // TODO: send app exit event
    return navigation.closeWebView("Error initializing app");
  }
};
