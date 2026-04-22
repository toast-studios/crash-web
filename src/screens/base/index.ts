import { InfoPopup } from "../../popups/InfoPopup";
import { Lobby } from "../../store/storeTypes";
import { ClientEvent } from "../../utils/clientEvent";
import {
  LOCAL_STORAGE_KEYS,
  localStorageUtil,
} from "../../utils/localStorageUtil";
import { navigation } from "../../utils/navigation";
import { apiClient } from "../../network/apis";
import { Logger } from "../../utils/logger";
import { connectToSocket } from "../../utils/socket";
import {
  PARTNER_SPECIFIC_CONFIG,
  CURRENT_PARTNER,
} from "../../network/constants";
import {
  isSpeedMode,
  getSpeedParams,
  requestSpeedPaymentWithPolling,
  formatSatoshis,
} from "../../utils/speedPayment";
import {
  SPEED_MESSAGES,
  replacePlaceholders,
} from "../../constants/speedMessages";

export const registerInLobby = async (
  lobby: Lobby | undefined,
): Promise<boolean> => {
  try {
    if (!lobby || typeof lobby._id !== "string") {
      navigation.presentPopup(InfoPopup, {
        message: "No lobby available to play, or please select a lobby first.",
        showOkButton: true,
      });
      return false;
    }

    const authToken = localStorageUtil.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    // Logger.info("authToken in lobby screen :", authToken);
    if (!authToken) {
      navigation.presentPopup(InfoPopup, {
        message: "Authentication error. Please restart the game.",
        showOkButton: true,
      });
      return false;
    }

    // * set the default lobby id
    localStorageUtil.setItem(
      LOCAL_STORAGE_KEYS.DEFAULT_COIN_LOBBY_ID,
      lobby._id,
    );

    // Speed Mode: 3-step payment flow before registration
    // 1. Create order
    // 2. Poll payment status
    // 3. Register in game (happens after this block)
    let speedOrderId: string | undefined;

    if (isSpeedMode()) {
      const speedParams = getSpeedParams();
      if (!speedParams) {
        navigation.presentPopup(InfoPopup, {
          message: SPEED_MESSAGES.CONNECTION_LOST,
          showOkButton: true,
        });
        return false;
      }

      Logger.info(
        "Speed mode: Starting 3-step payment flow for lobby registration",
      );

      // Step 1: Creating payment order
      navigation.presentPopup(InfoPopup, {
        message: replacePlaceholders(SPEED_MESSAGES.PAYMENT_SETUP, {
          amount: formatSatoshis(lobby.entryFee),
        }),
        showLoader: true,
        showOkButton: false,
        showCancelButton: false,
      });

      Logger.info("Step 1: Creating payment order");

      // Execute the full payment flow with polling
      // Pass callbacks to update UI during polling and handle cancellation
      let cancelHandler: (() => void) | null = null;

      const result = await requestSpeedPaymentWithPolling(
        speedParams,
        lobby,
        (statusMessage: string, infoMessage?: string, showCancel?: boolean) => {
          // Combine main message and info message
          const fullMessage = infoMessage
            ? `${statusMessage}\n\n${infoMessage}`
            : statusMessage;

          navigation.presentPopup(InfoPopup, {
            message: fullMessage,
            showLoader: true,
            showOkButton: false,
            showCancelButton: showCancel || false,
            cancelButtonText: SPEED_MESSAGES.CANCEL,
            onCancelPress: () => {
              if (cancelHandler) {
                cancelHandler();
              }
            },
          });
        },
        (handler: () => void) => {
          // Store cancel handler reference
          cancelHandler = handler;
        },
      );

      // Clear cancel handler after polling completes
      cancelHandler = null;

      if (!result.success) {
        // Check if user cancelled
        if (result.cancelled) {
          Logger.info("Payment cancelled by user");
          navigation.dismissPopup();
          return false;
        }

        Logger.error("Speed payment failed:", result.error);
        navigation.presentPopup(InfoPopup, {
          message: replacePlaceholders(SPEED_MESSAGES.PAYMENT_FAILED, {
            error: result.error || "Please try again",
          }),
          showOkButton: true,
          okButtonText: SPEED_MESSAGES.TRY_AGAIN,
        });
        return false;
      }

      Logger.info("Speed payment successful:", {
        orderId: result.orderId,
        transactionId: result.transactionId,
      });

      // Store orderId to pass to registerInLobby
      speedOrderId = result.orderId;

      // Update UI to show payment completed
      navigation.presentPopup(InfoPopup, {
        message: SPEED_MESSAGES.PAYMENT_CONFIRMED,
        showLoader: true,
        showOkButton: false,
        showCancelButton: false,
      });

      // Small delay to show success message
      await new Promise((resolve) => setTimeout(resolve, 1000));

      navigation.dismissPopup();
    }

    // Step 3: Register in game
    const registrationMessage = "Please wait while we are setting up the game";

    navigation.presentPopup(InfoPopup, {
      message: registrationMessage,
      showLoader: true,
      showOkButton: false,
    });

    ClientEvent.RegisterStart({
      lobbyId: lobby._id,
      amount: lobby.entryFee,
    });

    // For Speed mode, pass orderId in partnerParams
    const response = await apiClient.registerInLobby(lobby._id, speedOrderId);

    if (
      response &&
      response.success &&
      response.data &&
      response.data.registrationId
    ) {
      ClientEvent.RegisterSuccess({
        registrationId: response.data.registrationId,
        amount: lobby.entryFee,
      });

      await connectToSocket(authToken);
      return true;
    }
    throw new Error(response?.error?.message || "Failed to register in lobby", {
      cause: response?.data,
    });
  } catch (error) {
    const errorCode =
      error instanceof Error && error.cause
        ? (error.cause as { errorCode: string }).errorCode
        : "UNKNOWN_ERROR";
    ClientEvent.RegisterFailed({
      reason:
        error instanceof Error ? error.message : "Unable to register in game",
      amount: lobby?.entryFee || 0,
      errorCode,
    });
    if (error instanceof Error && error.message.includes("Low balance")) {
      Logger.warn("Low balance", error);
    } else {
      Logger.error("failed to register game", error);
    }

    // Only show error popup if partner config allows it
    const partnerConfig = PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER];
    if (partnerConfig?.showRegisterInLobbyErrorPopup) {
      navigation.presentPopup(InfoPopup, {
        message:
          error instanceof Error
            ? `Unable to register in game \n${error.message}`
            : "Unable to register in game",
        showOkButton: true,
      });
    } else {
      navigation.dismissPopup();
    }
    return false;
  }
};

export const handleDefaultLobbySelection = (
  lobbies: Lobby[],
): Lobby | undefined => {
  if (lobbies.length === 0) {
    return undefined;
  }
  const id = localStorageUtil.getItem(LOCAL_STORAGE_KEYS.DEFAULT_COIN_LOBBY_ID);
  if (!id) {
    return lobbies[0];
  }
  const foundLobby = lobbies.find((v) => v._id === id);
  if (foundLobby) {
    return foundLobby;
  }
  return lobbies[0];
};
