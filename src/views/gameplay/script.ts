import { apiClient } from "../../network/apis";
import { InfoPopup } from "../../popups/InfoPopup";
import { getJWTData } from "../../utils/jwt";
import { Logger } from "../../utils/logger";
import { navigation } from "../../utils/navigation";
import { isFreeWin } from "../../utils/game";
import { connectToSocket } from "../../utils/socket";
import { getQueryParams, getWebviewData } from "../../utils/window";
import { getSessionId } from "../../utils/playable";
import { init } from "../../main";
import {
  LOCAL_STORAGE_KEYS,
  localStorageUtil,
} from "../../utils/localStorageUtil";
import { CURRENT_PARTNER, PARTNER_ID } from "../../network/constants";
import { startPractice } from "../practice/practiceInitializer";

const startGameplay = async () => {
  try {
    const authParams = getQueryParams();
    if (authParams && authParams.at) {
      // * set auth
      apiClient.setAuthToken(authParams.at);
      const jwtData = getJWTData(authParams.at);
      localStorageUtil.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, authParams.at);

      const webviewData = getWebviewData();
      // Store is_meta_freewin in localStorage if present
      if (webviewData?.is_meta_freewin !== undefined) {
        localStorageUtil.setItem(LOCAL_STORAGE_KEYS.IS_META_FREEWIN, "true");
        localStorageUtil.setItem(LOCAL_STORAGE_KEYS.IS_FREEWIN, "true");
      }
      if (webviewData?.is_freewin !== undefined) {
        localStorageUtil.setItem(LOCAL_STORAGE_KEYS.IS_FREEWIN, "true");
      }
      if (webviewData?.is_drag_enabled !== undefined) {
        localStorageUtil.setItem(LOCAL_STORAGE_KEYS.IS_DRAG_ENABLED, "true");
      }

      if (jwtData?.guid) {
        localStorageUtil.setItem(
          LOCAL_STORAGE_KEYS.USER_ID,
          jwtData.guid as string,
        );
      }

      if (jwtData?.parp) {
        // ! right now device id is parp id
        localStorageUtil.setItem(
          LOCAL_STORAGE_KEYS.SESSION_ID,
          jwtData.parp as string,
        );
      }

      Logger.info("jwtData", jwtData);
      Logger.info("sessionId", getSessionId());
      Logger.info("isFreeWin", isFreeWin());
      if (isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt) {
        // * no lobby, no rejoin, for free win or Butr
        // Note: Game counter is now incremented in GameScreen.handleGameEndEvent for all partners
        connectToSocket(authParams.at);
        return;
      }

      if (jwtData?.guid) {
        // * set user id
        const rejoin = await apiClient.getRejoinGameData(
          jwtData.guid as string,
        );
        Logger.info("rejoin", rejoin);
        if (Object.keys(rejoin).length > 0) {
          // * connect to socket
          connectToSocket(authParams.at);
          return;
        }
      }

      // * show ftue if onboarding is true
      // ! player will see ftue again if try to re auth before onboarding is completed
      if (authParams.onboarding === "true") {
        Logger.info("onboarding is true");
        const isOnboardingCompleted =
          localStorageUtil.getItem(LOCAL_STORAGE_KEYS.IS_ON_BOARDING) ===
          "completed";
        if (!isOnboardingCompleted) {
          localStorageUtil.setItem(LOCAL_STORAGE_KEYS.IS_ON_BOARDING, "true");
          startPractice();
          return;
        }
      }

      if (getQueryParams().mode === "challenger") {
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
            connectToSocket(authParams.at);
          },
        });
        return;
      }

      navigation.goBackToLobby(false);
    } else {
      Logger.error("No auth token found", authParams);
      navigation.presentPopup(InfoPopup, {
        message: "Something went wrong, Please restart the game",
        showLoader: true,
        showOkButton: false,
      });
      // TODO: send auth failed event and app exit event
      navigation.closeWebView("No auth token found");
    }
  } catch (error) {
    Logger.error("Error starting gameplay", error);
    navigation.closeWebView("Error starting gameplay");
  }
};

(async () => {
  await init();
  await startGameplay();
})();
