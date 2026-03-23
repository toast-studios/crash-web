import { formatCurrency } from "../utils/currency";
import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";
import { CURRENCY_UI_MAPPING } from "../types";
import { Lobby } from "../store/storeTypes";

/**
 * Represents a game lobby with entry fee and win amount information
 */

/**
 * Button text configuration result
 */
interface ButtonTextResult {
  primaryText: string;
  secondaryText: string;
  currencyIcon?: string;
}

/**
 * Button type enum for better type safety
 */
enum ButtonType {
  WIN = "WIN",
  PLAY = "PLAY",
}

/**
 * Currency amount type enum
 */
enum AmountType {
  WIN_AMOUNT = "winAmount",
  ENTRY_FEE = "entryFee",
  NONE = "none",
}

/**
 * Partner-specific button configuration
 */
interface PartnerButtonConfig {
  primaryText: {
    win: string;
    play: string;
  };
  secondaryAmountType: {
    win: AmountType;
    play: AmountType;
  };
  showCurrencyIcon: boolean;
  showCurrencySymbol: boolean;
  specialCases?: {
    zeroWinAmount?: ButtonTextResult;
    default?: ButtonTextResult;
  };
}

/**
 * Centralized partner configuration for button text generation
 */
const PARTNER_BUTTON_CONFIG: Record<string, PartnerButtonConfig> = {
  [PARTNER_ID.bt]: {
    primaryText: { win: "PLAY", play: "PLAY" },
    secondaryAmountType: {
      win: AmountType.WIN_AMOUNT,
      play: AmountType.ENTRY_FEE,
    },
    showCurrencyIcon: false,
    showCurrencySymbol: false,
    specialCases: {
      default: { primaryText: "PLAY", secondaryText: "" },
    },
  },
  [PARTNER_ID.st]: {
    primaryText: { win: "WIN", play: "PLAY" },
    secondaryAmountType: {
      win: AmountType.WIN_AMOUNT,
      play: AmountType.ENTRY_FEE,
    },
    showCurrencyIcon: false,
    showCurrencySymbol: false,
    specialCases: {
      zeroWinAmount: { primaryText: "", secondaryText: "PLAY" },
    },
  },
  [PARTNER_ID.kb]: {
    primaryText: { win: "WIN", play: "PLAY" },
    secondaryAmountType: {
      win: AmountType.WIN_AMOUNT,
      play: AmountType.ENTRY_FEE,
    },
    showCurrencyIcon: false,
    showCurrencySymbol: true,
  },
  [PARTNER_ID.em]: {
    primaryText: { win: "Entry Fee", play: "PLAY" },
    secondaryAmountType: {
      win: AmountType.WIN_AMOUNT,
      play: AmountType.NONE,
    },
    showCurrencyIcon: true,
    showCurrencySymbol: false,
  },
  [PARTNER_ID.bh]: {
    primaryText: { win: "PLAY", play: "PLAY" },
    secondaryAmountType: {
      win: AmountType.ENTRY_FEE,
      play: AmountType.ENTRY_FEE,
    },
    showCurrencyIcon: false,
    showCurrencySymbol: true,
  },
  [PARTNER_ID.gs]: {
    primaryText: { win: "WIN", play: "PLAY" },
    secondaryAmountType: {
      win: AmountType.WIN_AMOUNT,
      play: AmountType.ENTRY_FEE,
    },
    showCurrencyIcon: false,
    showCurrencySymbol: true,
  },
  [PARTNER_ID.fw]: {
    primaryText: { win: "WIN", play: "PLAY" },
    secondaryAmountType: {
      win: AmountType.WIN_AMOUNT,
      play: AmountType.ENTRY_FEE,
    },
    showCurrencyIcon: false,
    showCurrencySymbol: true,
    specialCases: {
      zeroWinAmount: { primaryText: "PLAY", secondaryText: "" },
    },
  },
  [PARTNER_ID.ts]: {
    primaryText: { win: "WIN", play: "PLAY" },
    secondaryAmountType: {
      win: AmountType.WIN_AMOUNT,
      play: AmountType.ENTRY_FEE,
    },
    showCurrencyIcon: true,
    showCurrencySymbol: true,
    specialCases: {
      zeroWinAmount: { primaryText: "PLAY", secondaryText: "" },
    },
  },
  [PARTNER_ID.md]: {
    primaryText: { win: "WIN", play: "PLAY" },
    secondaryAmountType: {
      win: AmountType.WIN_AMOUNT,
      play: AmountType.ENTRY_FEE,
    },
    showCurrencyIcon: true,
    showCurrencySymbol: true,
  },
  [PARTNER_ID.sp]: {
    primaryText: { win: "WIN", play: "PLAY" },
    secondaryAmountType: {
      win: AmountType.WIN_AMOUNT,
      play: AmountType.ENTRY_FEE,
    },
    showCurrencyIcon: true,
    showCurrencySymbol: true,
  },
};

/**
 * Gets the appropriate amount based on the amount type and lobby data
 */
function getAmount(lobby: Lobby, amountType: AmountType): number {
  return amountType === AmountType.WIN_AMOUNT
    ? (lobby.winAmount ?? 0)
    : (lobby.entryFee ?? 0);
}

/**
 * Formats currency text based on partner configuration and CURRENCY_UI_MAPPING
 */
function formatCurrencyText(
  amount: number,
  lobby: Lobby,
  showCurrencySymbol: boolean,
): string {
  const currencyMapping = CURRENCY_UI_MAPPING[lobby.currencyCode];

  // If there's an icon available, exclude the currency symbol (like in PokerChip)
  const shouldIncludeSymbol = showCurrencySymbol && !currencyMapping?.icon;

  return formatCurrency(
    amount,
    lobby.currencyCode,
    lobby.currencySymbol,
    shouldIncludeSymbol,
  );
}

/**
 * Generates button text configuration based on partner, button type, and lobby data
 */
function generateButtonText(
  lobby: Lobby,
  buttonType: ButtonType,
): ButtonTextResult {
  const config = PARTNER_BUTTON_CONFIG[CURRENT_PARTNER];

  if (!config) {
    throw new Error(`No configuration found for partner: ${CURRENT_PARTNER}`);
  }

  // Handle special cases first
  if (config.specialCases?.default) {
    return config.specialCases.default;
  }

  if (config.specialCases?.zeroWinAmount && lobby.winAmount === 0) {
    return config.specialCases.zeroWinAmount;
  }

  // Generate standard button text
  const isWinButton = buttonType === ButtonType.WIN;
  const primaryText = isWinButton
    ? config.primaryText.win
    : config.primaryText.play;
  const amountType = isWinButton
    ? config.secondaryAmountType.win
    : config.secondaryAmountType.play;

  const amount = getAmount(lobby, amountType);
  const secondaryText = formatCurrencyText(
    amount,
    lobby,
    config.showCurrencySymbol,
  );
  // Always provide currency icon if available in CURRENCY_UI_MAPPING (like PokerChip)
  const currencyMapping = CURRENCY_UI_MAPPING[lobby.currencyCode];
  const currencyIcon = config.showCurrencyIcon
    ? currencyMapping?.icon
    : undefined;

  const showPrimaryText = isWinButton
    ? config.primaryText.win !== AmountType.NONE
    : config.primaryText.play !== AmountType.NONE;
  const showSecondaryText = isWinButton
    ? config.secondaryAmountType.win !== AmountType.NONE
    : config.secondaryAmountType.play !== AmountType.NONE;
  return {
    primaryText: showPrimaryText ? primaryText : "",
    secondaryText: showSecondaryText ? secondaryText : "",
    currencyIcon,
  };
}

export type { Lobby, ButtonTextResult };

/**
 * Gets the text configuration for win buttons based on current partner and lobby data
 *
 * @param lobby - The lobby data containing entry fee, win amount, and currency information
 * @returns Button text configuration with primary text, secondary text, and optional currency icon
 */
export function getWinButtonText(lobby: Lobby | undefined): ButtonTextResult {
  if (!lobby) {
    return {
      primaryText: "",
      secondaryText: "",
    };
  }
  return generateButtonText(lobby, ButtonType.WIN);
}

/**
 * Gets the text configuration for play buttons based on current partner and lobby data
 *
 * @param lobby - The lobby data containing entry fee, win amount, and currency information
 * @returns Button text configuration with primary text, secondary text, and optional currency icon
 */
export function getPlayButtonText(lobby: Lobby | undefined): ButtonTextResult {
  if (!lobby) {
    return {
      primaryText: "",
      secondaryText: "",
    };
  }
  return generateButtonText(lobby, ButtonType.PLAY);
}
