/**
 * Speed Payment Utilities
 *
 * Handles payment flow for Speed Mini App integration
 * Uses postMessage to communicate with Speed Wallet for Lightning payments
 *
 * NOTE: Speed params are stored in-memory only (not localStorage) for security
 */

import { Logger } from "./logger";
import { speedApiClient, SpeedParams } from "../network/speedApiClient";
import { apiClient } from "../network/apis";
import { Lobby } from "../store/storeTypes";
import {
  SPEED_MESSAGES,
  replacePlaceholders,
} from "../constants/speedMessages";

// In-memory store for Speed mode state and params
let speedModeEnabled = false;
let currentSpeedParams: SpeedParams | null = null;

/**
 * Enable Speed mode and store params
 * Called from speed/script.ts when Speed Mini App initializes
 */
export const enableSpeedMode = (params: SpeedParams): void => {
  speedModeEnabled = true;
  currentSpeedParams = params;
  Logger.info("Speed mode enabled with params:", params);
};

/**
 * Disable Speed mode and clear params
 */
export const disableSpeedMode = (): void => {
  speedModeEnabled = false;
  currentSpeedParams = null;
  Logger.info("Speed mode disabled");
};

/**
 * Check if Speed mode is currently active
 */
export const isSpeedMode = (): boolean => {
  return speedModeEnabled;
};

/**
 * Get current Speed params (returns null if not in Speed mode)
 */
export const getSpeedParams = (): SpeedParams | null => {
  return currentSpeedParams;
};

/**
 * Convert entry fee to satoshis
 * Assumes lobby entry fee might be in different currency
 * For Speed, we assume the amount is already in satoshis or needs conversion
 */
export const convertToSatoshis = (
  amount: number,
  currencyCode?: string,
): number => {
  // If currency is already SATS or satoshis, return as is
  if (currencyCode === "SATS" || currencyCode === "SAT") {
    return amount;
  }

  // If currency is BTC, convert to satoshis (1 BTC = 100,000,000 satoshis)
  if (currencyCode === "BTC") {
    return Math.round(amount * 100000000);
  }

  // For other currencies, assume the amount is in cents/smallest unit
  // This might need adjustment based on actual currency handling
  return amount;
};

/**
 * Format satoshi amount for display
 */
export const formatSatoshis = (sats: number): string => {
  if (sats >= 100000000) {
    return `${(sats / 100000000).toFixed(8)} BTC`;
  }
  if (sats >= 1000) {
    return `${(sats / 1000).toFixed(2)}k sats`;
  }
  return `${sats} sats`;
};

/**
 * Request Speed payment with new 3-step flow:
 * 1. Create order
 * 2. Poll order status
 * 3. Return result for game registration
 *
 * @param speedParams - Speed params from URL
 * @param lobby - The lobby user wants to join
 * @param onStatusUpdate - Optional callback for UI updates during polling
 * @param onCancelAvailable - Optional callback when cancel becomes available (provides cancel handler)
 * @returns Promise with payment result
 */
export const requestSpeedPaymentWithPolling = async (
  speedParams: SpeedParams,
  lobby: Lobby,
  onStatusUpdate?: (
    message: string,
    infoMessage?: string,
    showCancel?: boolean,
  ) => void,
  onCancelAvailable?: (cancelHandler: () => void) => void,
): Promise<{
  success: boolean;
  orderId?: string;
  transactionId?: string;
  error?: string;
  cancelled?: boolean;
}> => {
  // Track cleanup state
  let pollingActive = true;
  let pollingTimeoutId: number | null = null;
  let pendingTimeoutResolve: (() => void) | null = null;

  // Cleanup function to clear all timers and reset state
  const cleanup = () => {
    pollingActive = false;
    if (pollingTimeoutId !== null) {
      clearTimeout(pollingTimeoutId);
      pollingTimeoutId = null;
    }
    // Resolve any pending timeout promise immediately
    if (pendingTimeoutResolve) {
      pendingTimeoutResolve();
      pendingTimeoutResolve = null;
    }
    Logger.info("Polling cleanup completed");
  };

  try {
    Logger.info("Starting Speed payment with polling for lobby:", lobby);

    // Validate Speed account ID
    if (!speedParams.accountId) {
      return {
        success: false,
        error: SPEED_MESSAGES.MISSING_ACCOUNT_ID,
      };
    }

    // Step 1: Create order (using authenticated apiClient)
    Logger.info("Step 1: Creating payment order");

    // Validate withdrawal address
    if (!speedParams.lightningAddress) {
      return {
        success: false,
        error: SPEED_MESSAGES.MISSING_PAYMENT_ADDRESS,
      };
    }

    const createOrderResult = await apiClient.createSpeedOrder({
      lobbyId: lobby._id,
      withdraw_request: speedParams.lightningAddress,
    });

    Logger.info("Order created successfully:", {
      orderId: createOrderResult.orderId,
      paymentRequestData: createOrderResult.paymentRequestData,
    });

    // Step 1.5: Trigger Speed Wallet payment UI via postMessage
    if (createOrderResult.paymentRequestData) {
      Logger.info("Triggering Speed Wallet payment UI with data from backend");

      // Call requestPayment with exact data from backend
      speedApiClient.requestPayment(
        createOrderResult.paymentRequestData.accountId,
        createOrderResult.paymentRequestData,
      );
    } else {
      Logger.warn(
        "No paymentRequestData in createOrder response - skipping Speed Wallet UI trigger",
      );
    }

    // Step 2: Poll order status with cancellation support
    Logger.info(
      "Step 2: Polling payment status for orderId:",
      createOrderResult.orderId,
    );
    const maxPollingAttempts = 10; // 10 attempts
    const pollingInterval = 10000; // 10 seconds between attempts = 100 seconds total
    const maxPollingTime = (maxPollingAttempts * pollingInterval) / 1000; // Total time in seconds
    let attempts = 0;

    // Setup cancel handler - only stops UI polling, backend continues processing
    const handleCancel = () => {
      Logger.info(
        "User cancelled UI polling - backend will continue processing via webhook",
      );
      cleanup();
    };

    // Provide cancel handler to UI
    if (onCancelAvailable) {
      onCancelAvailable(handleCancel);
    }

    // Initial status update with cancel option
    if (onStatusUpdate) {
      onStatusUpdate(
        SPEED_MESSAGES.PAYMENT_WAITING,
        SPEED_MESSAGES.PAYMENT_CANCEL_INFO,
        true,
      );
    }

    // Polling loop with proper async/await for delays
    while (attempts < maxPollingAttempts && pollingActive) {
      attempts++;
      Logger.info(`Polling attempt ${attempts}/${maxPollingAttempts}`);

      // Check if cancelled before making API call
      if (!pollingActive) {
        Logger.info("Polling cancelled by user");
        return {
          success: false,
          orderId: createOrderResult.orderId,
          error: SPEED_MESSAGES.PAYMENT_CANCELLED,
          cancelled: true,
        };
      }

      const verifyResult = await apiClient.verifySpeedPayment(
        createOrderResult.orderId,
      );

      Logger.info(`Verify payment result (attempt ${attempts}):`, verifyResult);

      // Update UI with current status and timer
      if (onStatusUpdate && pollingActive) {
        const timeElapsed = Math.floor((attempts * pollingInterval) / 1000);
        onStatusUpdate(
          replacePlaceholders(SPEED_MESSAGES.PAYMENT_POLLING, {
            elapsed: timeElapsed.toString(),
            maxTime: maxPollingTime.toString(),
          }),
          SPEED_MESSAGES.PAYMENT_CANCEL_INFO,
          true,
        );
      }

      // Check if payment is successful
      if (verifyResult.success && verifyResult.status === "paid") {
        Logger.info("Payment successful!", {
          orderId: verifyResult.orderId,
          transactionId: verifyResult.transactionId,
        });
        cleanup();
        return {
          success: true,
          orderId: verifyResult.orderId,
          transactionId: verifyResult.transactionId,
        };
      }

      // Check if payment failed
      if (
        verifyResult.status === "failed" ||
        verifyResult.status === "cancelled"
      ) {
        Logger.error("Payment failed or cancelled:", verifyResult);
        cleanup();
        return {
          success: false,
          orderId: createOrderResult.orderId,
          error: `Payment ${verifyResult.status}`,
        };
      }

      // If still pending/processing, wait and try again
      if (attempts < maxPollingAttempts && pollingActive) {
        await new Promise<void>((resolve) => {
          pendingTimeoutResolve = resolve;
          pollingTimeoutId = window.setTimeout(() => {
            pollingTimeoutId = null;
            pendingTimeoutResolve = null;
            resolve();
          }, pollingInterval);
        });
      }
    }

    // Check if cancelled during polling
    if (!pollingActive) {
      Logger.info("Polling was cancelled during execution");
      return {
        success: false,
        orderId: createOrderResult.orderId,
        error: SPEED_MESSAGES.PAYMENT_CANCELLED,
        cancelled: true,
      };
    }

    // Timeout - payment still pending after max attempts
    Logger.error("Payment verification timeout after max polling attempts", {
      orderId: createOrderResult.orderId,
      attempts,
      maxPollingAttempts,
      pollingInterval,
    });
    cleanup();
    return {
      success: false,
      orderId: createOrderResult.orderId,
      error: "Payment verification timeout. Please try again.",
    };
  } catch (error) {
    Logger.error("Speed payment with polling error:", error);
    cleanup();
    return {
      success: false,
      error: "Payment request failed. Please try again.",
    };
  }
};
