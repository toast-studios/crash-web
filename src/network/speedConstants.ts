/**
 * Speed Mini App Constants
 *
 * Configuration for Speed Wallet Mini App integration
 */

import { API_CONSTANTS } from "./constants";

// Partner ID for Speed in Toast system
export const SPEED_PARTNER_ID = "speed";

// Game name for Blackjack
export const SPEED_GAME_NAME = "BLACKJACK";

// Toast Service URL for game-auth
// This is the toast-speed-auth-service
export const TOAST_SERVICE_URL = (() => {
  switch (API_CONSTANTS.GAME_ENVIRONMENT) {
    case "development":
      return "http://localhost:3001"; // Local toast-speed-auth-service
    case "staging":
      return "https://api-staging-speed.toaststudios.io";
    case "production":
      return "https://api-speed.toaststudios.io";
    default:
      return "http://localhost:3001";
  }
})();

/**
 * Speed Payment Configuration
 * Used for Lightning Network payments
 */
export const SPEED_PAYMENT_CONFIG = {
  // Minimum amount in satoshis
  MIN_AMOUNT_SATS: 100,
  // Maximum amount in satoshis
  MAX_AMOUNT_SATS: 1000000,
  // Payment timeout in seconds
  PAYMENT_TIMEOUT_SECONDS: 300,
};

/**
 * Speed URL Parameter names
 * These are the parameters Speed passes in the Mini App URL
 * Reference: https://speed-wallet.gitbook.io/speed-wallet-mini-apps/data-sharing
 *
 * Example URL:
 * https://yourdomain.com?acct=acct_li8hh2xyRuSBWnE4&lang=en&bal_btc=87636&bal_usdt=1975.29&p_add=abc%40speed.app
 */
export const SPEED_URL_PARAMS = {
  /** Account ID - unique Speed Wallet account ID */
  ACCOUNT_ID: "acct",
  /** Language preference (en, es, de, hi, etc.) */
  LANG: "lang",
  /** Bitcoin balance in satoshis (1 BTC = 100,000,000 SATs) */
  BALANCE_BTC: "bal_btc",
  /** USDT balance in standard units */
  BALANCE_USDT: "bal_usdt",
  /** Lightning Network address */
  LIGHTNING_ADDRESS: "p_add",
} as const;

/**
 * Speed Mode identifier for game modes
 */
export const SPEED_MODE = "speed";
