/**
 * Speed API Client
 *
 * Handles API calls specific to Speed Mini App integration
 * - Calls toast-service /partner/game-auth to authenticate Speed users
 * - Handles Speed payment requests
 */

import axios, { AxiosInstance } from "axios";
import { Logger } from "../utils/logger";
import { TOAST_SERVICE_URL } from "./speedConstants";

/**
 * Speed URL Parameters parsed from Mini App URL
 * Reference: https://speed-wallet.gitbook.io/speed-wallet-mini-apps/data-sharing
 *
 * Example URL:
 * https://yourdomain.com?acct=acct_li8hh2xyRuSBWnE4&lang=en&bal_btc=87636&bal_usdt=1975.29&p_add=abc%40speed.app
 */
export interface SpeedParams {
  /** acct - unique Speed Wallet account ID */
  accountId: string;
  /** lang - language preference (en, es, de, hi, etc.) */
  lang?: string;
  /** bal_btc - Bitcoin balance in satoshis */
  balanceBtc?: number;
  /** bal_usdt - USDT balance */
  balanceUsdt?: number;
  /** p_add - Lightning Network address */
  lightningAddress?: string;
}

/**
 * Toast game-auth request body
 * Maps Speed params to Toast requirements
 */
export interface GameAuthRequest {
  playerId: string; // Speed account_id
  deviceType: string; // "android" | "ios" | "web"
  deviceId?: string;
  username?: string;
  profilePicture?: string;
  appVersion?: string;
  overrides?: {
    lobby?: {
      currencyCode?: string;
    };
  };
  partnerParams?: string; // JSON string of additional Speed params
}

/**
 * Simplified Speed game-auth request
 * Only requires gameUserId and paymentAddress (p_add)
 */
export interface SpeedGameAuthRequest {
  gameUserId: string; // Speed account ID (acct)
  paymentAddress: string; // Lightning address (p_add)
  deviceType: string; // "android" | "ios" | "web"
}

/**
 * Toast game-auth response
 */
export interface GameAuthResponse {
  success: boolean;
  data?: {
    embedUrl: string;
    game: {
      gameUserId: string;
      embedUrl: string;
      gameApiUrl: string;
      gameAuthToken: string;
      gameRefreshToken: string;
      gameWebviewUrl: string;
      gameServerUrl: string;
      gameWebSocketUrl: string;
    };
    isRejoin: boolean;
  };
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Speed Payment Request Data
 * Reference: https://speed-wallet.gitbook.io/speed-wallet-mini-apps/receiving-payments
 */
export interface SpeedPaymentData {
  /** The exact payment amount expected from the user */
  amount: number;
  /** Base currency code (USD, EUR, BTC). Defaults to SATS for Lightning */
  currency: "USD" | "EUR" | "BTC" | "SATS";
  /** The cryptocurrency to receive payments (SATS or USDT) */
  target_currency: "SATS" | "USDT";
  /** Payment address or invoice (LN address, LN invoice, LNURL, or Bitcoin/USDT address) */
  deposit_address: string;
  /** Optional transaction details */
  note?: string;
}

/**
 * Speed Payment Request JSON format
 * This is the complete request structure sent to Speed Wallet
 */
export interface SpeedPaymentRequestMessage {
  /** API version - always use "2022-10-15" */
  version: "2022-10-15";
  /** Speed Wallet account ID of the sender (from acct URL param) */
  account_id: string;
  /** Payment data */
  data: SpeedPaymentData;
}

/**
 * Speed Payment Request (simplified for our use)
 */
export interface SpeedPaymentRequest {
  amount: number;
  currency?: "USD" | "EUR" | "BTC" | "SATS";
  targetCurrency?: "SATS" | "USDT";
  depositAddress: string;
  note?: string;
}

/**
 * Speed Payment Response
 */
export interface SpeedPaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Create Order Request
 */
export interface CreateOrderRequest {
  amount: number;
  currency: string;
  userId: string;
  gameId?: string;
  depositAddress?: string;
  targetCurrency?: string;
  note?: string;
}

/**
 * Create Order Response
 */
export interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  paymentId: string;
  status: "paid" | "pending" | "failed" | "processing" | "cancelled";
  data?: {
    paymentUrl?: string;
    qrCode?: string;
    invoice?: string;
  };
  error?: string;
  paymentRequestData?: {
    accountId: string;
    amount: number;
    currency: string;
    targetCurrency: string;
    depositAddress: string;
    note?: string;
  };
}

/**
 * Verify Payment Response
 */
export interface VerifyPaymentResponse {
  success: boolean;
  status: "paid" | "pending" | "failed" | "processing" | "cancelled";
  transactionId?: string;
  orderId?: string;
  data?: unknown;
  error?: string;
}

class SpeedApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: TOAST_SERVICE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Authenticate Speed user with Toast service (simplified flow)
   * Calls POST /toast-speed/game-auth
   * Only requires gameUserId and paymentAddress - no partnerId/gameName needed
   *
   * @param request - Speed game auth request with gameUserId and paymentAddress
   */
  async authenticateSpeed(
    request: SpeedGameAuthRequest,
  ): Promise<GameAuthResponse> {
    try {
      Logger.info("Speed authenticateSpeed request:", request);

      const response = await this.instance.post(`/toast-speed/game-auth`, {
        gameUserId: request.gameUserId,
        paymentAddress: request.paymentAddress,
        deviceType: request.deviceType,
      });

      Logger.info("Speed authenticateSpeed response:", response.data);

      if (response.status === 200 && response.data?.data?.data) {
        return {
          success: true,
          data: response.data.data.data,
        };
      }

      return {
        success: false,
        error: {
          message:
            response.data?.data?.error?.message ||
            response.data?.error?.message ||
            "Authentication failed",
          code: response.data?.data?.error?.code || response.data?.error?.code,
        },
      };
    } catch (error) {
      Logger.error("Speed authenticateSpeed error:", error);

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: {
            message:
              error.response?.data?.error?.message ||
              error.message ||
              "Network error",
            code: error.response?.status?.toString(),
          },
        };
      }

      return {
        success: false,
        error: {
          message: "Unknown error occurred",
        },
      };
    }
  }

  /**
   * Request payment from Speed Wallet
   * Reference: https://speed-wallet.gitbook.io/speed-wallet-mini-apps/receiving-payments
   *
   * Uses postMessage to communicate with Speed Wallet (Android/iOS/Web)
   *
   * @param accountId - Speed account ID (from 'acct' URL param)
   * @param request - Payment request details
   */
  requestPayment(accountId: string, request: SpeedPaymentRequest) {
    try {
      Logger.info("Speed payment request:", { accountId, request });

      // Build the Speed payment request message
      // Reference: https://speed-wallet.gitbook.io/speed-wallet-mini-apps/receiving-payments

      // {
      //   "version": "2022-10-15",
      //   "account_id": "acct_xxxxxxxxxx",
      //   "data": {
      //     "amount": 450,
      //     "currency": "USD",
      //     "target_currency": "SATS",
      //     "deposit_address": "lnbc1xxxxxxxxxxxxx",
      //     "note": "Payment for Game Credits"
      //   }
      // }
      const paymentMessage: SpeedPaymentRequestMessage = {
        version: "2022-10-15",
        account_id: accountId,
        data: {
          amount: request.amount,
          currency: request.currency || "SATS",
          target_currency: request.targetCurrency || "SATS",
          deposit_address: request.depositAddress,
          note: request.note,
        },
      };

      Logger.info("Speed payment message:", paymentMessage);

      // Stringify the message for postMessage
      const messageString = JSON.stringify(paymentMessage);

      // Send to Speed Wallet using platform-specific method
      this.sendToSpeedWallet(messageString);
    } catch (error) {
      Logger.error("Speed payment error:", error);
      throw error;
    }
  }

  /**
   * Send message to Speed Wallet
   * Handles Android, iOS, and Web platforms
   * Reference: https://speed-wallet.gitbook.io/speed-wallet-mini-apps/receiving-payments
   */
  private sendToSpeedWallet(data: string): void {
    // Extend window type for Speed Wallet interfaces
    const win = window as Window & {
      Android?: { postMessage: (msg: string) => void };
      webkit?: {
        messageHandlers?: {
          iosInterface?: { postMessage: (msg: string) => void };
        };
      };
    };

    if (win.Android) {
      // Android WebView
      Logger.info("Sending to Speed Wallet via Android interface");
      win.Android.postMessage(data);
    } else if (win.webkit?.messageHandlers?.iosInterface) {
      // iOS WKWebView
      Logger.info("Sending to Speed Wallet via iOS interface");
      win.webkit.messageHandlers.iosInterface.postMessage(data);
    } else if (window.parent && window.parent !== window) {
      // Web iframe
      Logger.info("Sending to Speed Wallet via parent postMessage");
      window.parent.postMessage(data, "*");
    } else {
      // Fallback
      Logger.info("Sending to Speed Wallet via window postMessage");
      window.postMessage(data, "*");
    }
  }
}

export const speedApiClient = new SpeedApiClient();
