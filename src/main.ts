import { GAME_ENVIRONMENT } from "./constants";
import { initSentry, logError } from "./scripts/sentry";
import { getJWTData } from "./utils/jwt";
import { Logger } from "./utils/logger";
import { navigation } from "./utils/navigation";
import { getQueryParams } from "./utils/window";
import { localStorageUtil, LOCAL_STORAGE_KEYS } from "./utils/localStorageUtil";
import { LOBBY_FORMAT } from "./types";

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
    alert("Error initializing app : " + (error as Error).message);
    logError(error as Error, {
      message: "Error initializing app",
    });
    // TODO: send app exit event
    return navigation.closeWebView("Error initializing app");
  }
};
