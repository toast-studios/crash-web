/**
 * Speed Mini App Entry Point
 *
 * This view handles Speed Wallet Mini App integration.
 * It accepts Speed URL parameters and converts them to Toast game-auth format.
 *
 * Speed URL Parameters:
 * - account_id: Speed user's account identifier
 * - account_balance: User's current balance (in satoshis)
 * - ln_address: Lightning Network address
 * - lang: User's language preference
 * - username: (optional) User's display name
 * - profile_picture: (optional) User's profile picture URL
 *
 * Toast game-auth Requirements:
 * Query: { partnerId, gameName }
 * Body: { playerId, deviceType, deviceId?, username?, profilePicture?, appVersion?, overrides?, partnerParams? }
 */

import { init } from "../../main";
import { Logger } from "../../utils/logger";
import { navigation } from "../../utils/navigation";
import { InfoPopup } from "../../popups/InfoPopup";
import { getQueryParams } from "../../utils/window";
import { SpeedParams, speedApiClient } from "../../network/speedApiClient";
import { enableSpeedMode } from "../../utils/speedPayment";
import { connectToSocket } from "../../utils/socket";
import { apiClient } from "../../network/apis";
import {
  LOCAL_STORAGE_KEYS,
  localStorageUtil,
} from "../../utils/localStorageUtil";
import {
  SPEED_MESSAGES,
  replacePlaceholders,
} from "../../constants/speedMessages";
import { ClientEvent } from "../../utils/clientEvent";

const getSpeedParams = (): SpeedParams | null => {
  const params = getQueryParams();

  // Speed must provide at least acct (account ID)
  if (!params.acct) {
    Logger.error("Speed params missing 'acct' (account ID)", params);
    return null;
  }

  const speedParams: SpeedParams = {
    accountId: params.acct,
    lang: params.lang,
    balanceBtc: params.bal_btc ? parseInt(params.bal_btc, 10) : undefined,
    balanceUsdt: params.bal_usdt ? parseFloat(params.bal_usdt) : undefined,
    lightningAddress: params.p_add,
  };

  return speedParams;
};

/**
 * Detect device type for game-auth
 */
const detectDeviceType = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/android/.test(userAgent)) {
    return "android";
  }
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "ios";
  }
  return "web";
};

const startSpeedMode = async () => {
  try {
    Logger.info("Starting Speed Mini App mode");

    const speedParams = getSpeedParams();

    if (!speedParams) {
      const allParams = getQueryParams();
      Logger.error("Invalid Speed params", allParams);
      navigation.presentPopup(InfoPopup, {
        message: SPEED_MESSAGES.MISSING_ACCOUNT_ID,
        showOkButton: true,
        okButtonText: SPEED_MESSAGES.CLOSE,
        onOkPress: () => {
          navigation.closeWebView("Invalid Speed params");
        },
      });
      return;
    }

    if (!speedParams.lightningAddress) {
      Logger.error("Missing Lightning address (p_add)", speedParams);
      navigation.presentPopup(InfoPopup, {
        message: SPEED_MESSAGES.MISSING_PAYMENT_ADDRESS,
        showOkButton: true,
        okButtonText: SPEED_MESSAGES.CLOSE,
        onOkPress: () => {
          navigation.closeWebView("Missing p_add");
        },
      });
      return;
    }

    const deviceType = detectDeviceType();
    navigation.presentPopup(InfoPopup, {
      message: SPEED_MESSAGES.AUTH_LOADING,
      showLoader: true,
      showOkButton: false,
    });

    const authResponse = await speedApiClient.authenticateSpeed({
      gameUserId: speedParams.accountId,
      paymentAddress: speedParams.lightningAddress,
      deviceType,
    });

    if (!authResponse.success || !authResponse.data) {
      Logger.error("Speed authentication failed", authResponse.error);
      navigation.presentPopup(InfoPopup, {
        message: replacePlaceholders(SPEED_MESSAGES.AUTH_FAILED, {
          error: authResponse.error?.message || "Please try again",
        }),
        showOkButton: true,
        okButtonText: SPEED_MESSAGES.RETRY,
        showCancelButton: true,
        cancelButtonText: SPEED_MESSAGES.CLOSE,
        onOkPress: () => {
          startSpeedMode();
        },
        onCancelPress: () => {
          navigation.closeWebView("Auth failed");
        },
      });
      return;
    }

    const { gameAuthToken, gameRefreshToken } = authResponse.data.game;

    apiClient.setAuthToken(gameAuthToken);
    apiClient.setRefreshToken(gameRefreshToken);

    localStorageUtil.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, gameAuthToken);
    localStorageUtil.setItem(
      LOCAL_STORAGE_KEYS.REFRESH_TOKEN,
      gameRefreshToken,
    );

    enableSpeedMode(speedParams);
    await connectToSocket(gameAuthToken);
  } catch (error) {
    Logger.error("Error in Speed mode", error);
    await navigation.presentPopup(InfoPopup, {
      message: replacePlaceholders(SPEED_MESSAGES.GENERIC_ERROR, {
        error: (error as Error).message,
      }),
      showOkButton: true,
      okButtonText: SPEED_MESSAGES.CLOSE,
      onOkPress: () => {
        navigation.closeWebView("Speed mode error");
      },
    });
    ClientEvent.QuitView();
  }
};

(async () => {
  await init();
  ClientEvent.GameLoaded();
  await startSpeedMode();
})();
