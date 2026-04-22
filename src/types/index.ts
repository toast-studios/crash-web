export enum LOBBY_TYPE {
  FREE = "free",
  PREMIUM = "premium",
  FREE_2_WIN = "free_2_win",
}

export enum CURRENCY_CODES {
  USD = "USD",
  EUR = "EUR",
  INR = "INR",
  PLAY_COINS = "PLAY_COINS",
  PLAY_CASH = "PLAY_CASH",
  GEMS = "GEMS",
}

export interface CurrencyData {
  code: string;
  balance: number;
  icon: string;
}

export interface CurrencyUIMapping {
  icon?: string;
  symbol?: string;
}

// Currency to UI mapping - centralized configuration
export const CURRENCY_UI_MAPPING: Record<string, CurrencyUIMapping> = {
  [CURRENCY_CODES.PLAY_COINS]: {
    icon: "play-coins-icon",
  },
  [CURRENCY_CODES.GEMS]: {
    icon: "play-coins-icon",
  },
  [CURRENCY_CODES.PLAY_CASH]: {
    icon: "play-cash-icon",
  },
  [CURRENCY_CODES.USD]: {
    symbol: "$",
  },
  [CURRENCY_CODES.EUR]: {
    symbol: "€",
  },
  [CURRENCY_CODES.INR]: {
    symbol: "₹",
  },
};

export enum LOBBY_FORMAT {
  DUEL = "duel",
  TOURNAMENT = "tournament",
}
