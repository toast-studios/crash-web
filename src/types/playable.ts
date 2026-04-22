import { CURRENCY_CODES } from ".";

export interface PlayGameData {
  game: {
    gameAuthToken: string;
    gameRefreshToken: string;
  };
  isRejoin: boolean;
}

export interface GameLobby {
  _id: string;
  winAmount: number;
  prevWinAmount?: string;
  currencySymbol: string;
}

export interface Currency {
  balance: number;
  currencyCode: CURRENCY_CODES;
}

export interface PlayerDetails {
  currencies: Currency[]; // New format
}
