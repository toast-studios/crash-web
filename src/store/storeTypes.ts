import { CURRENCY_CODES, LOBBY_FORMAT, LOBBY_TYPE } from "../types";
import { CardId } from "../ui/Cards/Card";
import { ColumnState } from "../ui/Leaderboard";

export enum ALLOW_ACTIONS {
  PICK_CARD = "PICK_CARD",
  HIT = "HIT",
  STAND = "STAND",
}

export enum PLAYER_ACTIONS {
  JOIN_GAME = "JOIN_GAME",
  PICK_CARD = "PICK_CARD",
  HIT = "HIT",
  STAND = "STAND",
  LEAVE_GAME = "LEAVE_GAME",
}
export enum FINISH_TYPES {
  NONE = "",
  BUST = "BUST",
  WIN = "WIN",
  LOSE = "LOSE",
  DRAW = "DRAW",
  BLACKJACK_WIN = "BLACKJACK_WIN",
}

export type CardsColumn = {
  cards: Array<CardId | null>;
  score: number;
  finishType: FINISH_TYPES;
  pointsAwarded?: number;
};
export type CardPositions = {
  columnIndex: number;
  cardIndex: number;
  card: CardId;
};
export enum GAME_STATE {
  IN_PROGRESS = "IN_PROGRESS",
  WAITING_FOR_PLAYER = "WAITING_FOR_PLAYER",
  SHUFFLING_CARDS = "SHUFFLING_CARDS",
  PHASE_ONE = "PHASE_ONE",
  PHASE_TWO = "PHASE_TWO",
  GAME_RESULT_SCREEN = "GAME_RESULT_SCREEN",
}

export enum GAME_TABLE_MODES {
  DUEL = "duel",
  TOURNAMENT = "tournament",
}

export type TournamentRoundColumn = {
  cards: Array<CardId | null>;
  score: number;
  finishType: FINISH_TYPES;
  result: string;
  pointsAwarded: number;
};

export type TournamentRound = {
  columns: Array<TournamentRoundColumn>;
  roundScore: number;
  draftingComplete: boolean;
  playingComplete: boolean;
};

export enum ROUND_STATE {
  DRAFTING = "DRAFTING",
  PLAYING = "PLAYING",
}

export type StoreData = {
  gameUserId: string;
  matchId: string;
  gameState: GAME_STATE;
  gameMode: GAME_TABLE_MODES;
  isReconnection: boolean;
  players: {
    [key: string]: {
      gameUserId: string;
      username: string;
      profilePicture: string;
      fallbackImageUrl: string;
      networkStatus: number;
      extraTurnTimeLeft: number;
      skipTurnCount: number;
      cardsColumns: Array<CardsColumn>;
      positions?: Array<CardPositions>;
      lobbyDetails: Lobby;
      // Tournament-specific properties
      currentRound?: number;
      totalScore?: number;
      activeColumnIndex?: number;
      inActiveCount?: number;
      hasLeft?: boolean;
      rounds?: Array<TournamentRound>;
    };
  };
  turnInfo?: {
    ownTurnInfo?: {
      turnTime: number;
      remainingTurnTime: number;
      isExtraTurnTime: boolean;
      card: CardId;
      allowActions: ALLOW_ACTIONS[];
    };
    opponentTurnInfo?: {
      turnTime: number;
      remainingTurnTime: number;
      isExtraTurnTime: boolean;
    };
    // Tournament flat turnInfo format
    turnTime?: number;
    remainingTurnTime?: number;
    isExtraTurnTime?: boolean;
  };
  currentRound?: number;
  totalRounds?: number;
  roundState?: ROUND_STATE;
  columnsPerRound?: number;
  activeColumnIndex: number; // * default -1
  countdownSeconds?: number;
  extra?: {
    [gameUserId: string]: {
      columnsState: ColumnState[];
    };
  };
  leaderboard?: Array<{
    gameUserId: string;
    score: number;
    rank: number;
    isTopper: boolean;
  }>;
  currentTotalScore?: number;
};

export enum END_GAME_REASON {
  OPPONENT_LEAVE_GAME = "OPPONENT_LEAVE_GAME",
  OPPONENT_SKIP_TURN = "OPPONENT_SKIP_TURN",
  OPPONENT_DISCONNECTED = "OPPONENT_DISCONNECTED",
  DRAW = "DRAW",
  GAME_OVER = "GAME_OVER",
}

export type Lobby = {
  _id: string;
  winAmountCurrencyCode?: CURRENCY_CODES | undefined;
  // TODO: remove this after backend is updated
  currencySymbol: string;
  lobbyType: LOBBY_TYPE;
  extra?: Record<string, unknown>;
  rankRewards?:
    | {
        currencyCode?: CURRENCY_CODES | undefined;
        rank: number;
        rewardAmount: number;
      }[]
    | undefined;
  currencyCode: CURRENCY_CODES;
  partnerId: string;
  entryFee: number;
  //!FIXME change from optional to required
  winAmount?: number;
  isActive: boolean;
  numPlayers: number;
  lobbyFormat: LOBBY_FORMAT;
};

export type PickCardResponseData = {
  positions: CardPositions[];
};

export type TournamentPickCardResponseData = {
  cardInfo: {
    card: CardId;
    columnIndex: number;
    cardIndex: number;
    columnScore: number;
  };
  opponentCardInfo?: {
    card: CardId;
    columnIndex: number;
    cardIndex: number;
    columnScore: number;
  };
};

export type Opponents = {
  gameUserId: string;
  username: string;
  profilePicture: string;
}[];

export type MatchFoundData = {
  gameUserId: string;
  opponents: Opponents;
};

// --- Re-export crash game types for single-import convenience ---
export type {
  CrashPlayerStatus,
  CrashGamePhase,
  HeatZone,
  CrashActionType,
  CrashPlayer,
  CrashFeedMessage,
  CrashGameConfig,
  GameTableInfoPayload,
  CrashMatchFoundPayload,
  GameStartPayload,
  GameStateSyncPayload,
  CrashPlayerActionPayload,
  RoundOverPayload,
  CrashErrorPayload,
  CrashActionPayload,
  CrashActionAckResponse,
} from "../types/crashGame";

export { CrashGameSessionState } from "../types/crashGame";
