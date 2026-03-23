/**
 * Speed Mini App User Messages
 *
 * All user-facing messages for Speed Wallet integration
 * Use {{placeholder}} for dynamic content replacement
 */

export const SPEED_MESSAGES = {
  // Authentication
  AUTH_LOADING: "Connecting to Speed Wallet...",
  AUTH_FAILED: "Unable to connect\n\n{{error}}",
  AUTH_SUCCESS: "Connected successfully",

  // Missing Parameters
  MISSING_ACCOUNT_ID:
    "Connection failed\n\nYour Speed Wallet account information is missing. Please restart the app.",
  MISSING_PAYMENT_ADDRESS:
    "Payment address required\n\nYou don't have a payment address to continue playing. Please create it from your Speed Wallet app.",
  INVALID_PARAMS:
    "Connection failed\n\nUnable to connect with Speed Wallet. Please restart the app.",

  // Socket Connection
  SOCKET_CONNECTING: "Connecting to game server...",
  SOCKET_FAILED: "Unable to connect to game server\n\nPlease try again.",
  SOCKET_SUCCESS: "Connected to game",

  // Payment Flow
  PAYMENT_SETUP: "Setting up payment\n\n{{amount}}",
  PAYMENT_WAITING:
    "Complete payment in Speed Wallet\n\nWaiting for confirmation...",
  PAYMENT_POLLING: "Waiting for confirmation...\n\n{{elapsed}}s / {{maxTime}}s",
  PAYMENT_CONFIRMED: "Payment confirmed!\n\nStarting game...",
  PAYMENT_FAILED: "Payment failed\n\n{{error}}",
  PAYMENT_CANCEL_INFO:
    "If you cancelled payment or the payment sheet was closed, you can cancel this confirmation.",
  PAYMENT_CANCELLED: "Payment cancelled",
  PAYMENT_CANCELLING: "Cancelling payment...",

  // General
  RETRY: "Retry",
  CLOSE: "Close",
  OK: "OK",
  TRY_AGAIN: "Try Again",
  CANCEL: "Cancel",

  // Rejoining
  REJOINING: "Rejoining your game...",
  NAVIGATING_LOBBY: "Loading lobby...",

  // Errors
  GENERIC_ERROR: "Something went wrong\n\n{{error}}",
  CONNECTION_LOST: "Connection lost. Please restart the app.",
} as const;

/**
 * Replace placeholders in message with actual values
 * Example: replacePlaceholders("Hello {{name}}", { name: "John" }) => "Hello John"
 */
export const replacePlaceholders = (
  message: string,
  replacements: Record<string, string>,
): string => {
  let result = message;
  Object.entries(replacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  });
  return result;
};
