/**
 * Server-sent column result values (e.g. from leaderboard / columnResult).
 */
export enum ColumnResultServer {
  WIN = "WIN",
  LOSE = "LOSE",
  DRAW = "DRAW",
  PUSH = "PUSH",
  BLACKJACK_WIN = "BLACKJACK_WIN",
}

/**
 * UI display values for column result badges (W, 21, L, -, P).
 */
export enum ColumnResultUi {
  W = "W",
  TWENTY_ONE = "21",
  L = "L",
  DASH = "-",
  P = "P",
}

export type ColumnResultServerType = `${ColumnResultServer}`;
export type ColumnResultUiType = `${ColumnResultUi}`;
