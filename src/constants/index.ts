const CONSTANTS = {
  PLAYERS: "players",
  PREFIX: {
    GAME_TABLE_INFO: "GTI",
    GAME_CONFIG: "GC",
  },

  // * add Actions and Events
  ACTIONS: {
    JOIN_GAME: "joinGame",
    GAME_TABLE_INFO: "gameTableInfo",
    PICK_CARD: "pickCard",
    HIT: "hit",
    STAND: "stand",
    LEAVE_GAME: "leaveGame",
    PING: "ping",
  },
  EVENTS: {
    SHUFFLE_DECK: "shuffleDeck",
    TURN_INFO: "turnInfo",
    TURN_TAKEN_BY_OPPONENT: "turnTakenByOpponent",
    PICK_CARD: "pickCard",
    SETUP_DONE: "setupDone",
    GAME_TABLE_INFO: "gameTableInfo",
    COLUMN_UPDATE: "columnUpdate",
    COLUMN_UPDATE_TOURNAMENT: "columnUpdateTournament",
    COLUMN_STATE_UPDATE: "columnStateUpdate",
    GAME_RESULT_SCREEN: "gameResultScreen",
    TOURNAMENT_RESULT_SCREEN: "tournamentResultScreen",
    MATCH_NOT_FOUND: "matchNotFound",
    WAITING_FOR_OPPONENT: "waitingForOpponent",
    CARD_PLACED: "cardPlaced",
    LEADERBOARD: "leaderboard",
    DEBUG_GTI_WITH_OPPONENT_INFO: "debugGTIWithOpponentInfo",
    MATCH_FOUND: "matchFound",
    DEALER_REVEAL: "dealerReveal",
    ROUND_COMPLETE: "roundComplete",
    ROUND_STARTING: "roundStarting",
  },
  GAME_TABLE: {
    GAME_STATE: "gameState",
    TURN_TAKEN_BY: "turnTakenBy",
    ACTIVE_COLUMN_INDEX: "activeColumnIndex",
  },
  PLAYER: {
    ACTIVE_INACTIVE_STATUS: "activeInActiveStatus",
  },
  TOURNAMENT_EVENTS: {
    ROUND_STARTING: "roundStarting",
    SHUFFLE_DECK: "shuffleDeck",
    DRAFTING_COMPLETE: "draftingComplete",
    COLUMN_UPDATE: "columnUpdate",
    COLUMN_RESULT: "columnResult",
    DEALER_COLUMN_RESULT: "dealerColumnResult",
    ROUND_RESULT: "roundResult",
    LEADERBOARD_UPDATE: "leaderboardUpdate",
  },
};

export default CONSTANTS;

export const GAME_ENVIRONMENT = {
  DEVELOPMENT: "development",
  STAGING: "staging",
  PRODUCTION: "production",
};

export const GAME_MODES = {
  TEST: "test",
  GAMEPLAY: "gameplay",
  PRACTICE: "practice",
  PLAYABLE: "playable",
  SPEED: "speed",
};

export const VIEW_MODE = {
  WEB_VIEW: "web-view",
};

export const MATCH_MAKING_LOCKING_TIME_IN_SECONDS = 3;

// --- Crash Game (HeatWave PvP) Socket Events ---

export const CRASH_EVENTS = {
  GAME_TABLE_INFO: "gameTableInfo",
  MATCH_FOUND: "matchFound",
  MATCH_NOT_FOUND: "matchNotFound",
  GAME_START: "gameStart",
  GAME_STATE_SYNC: "gameStateSync",
  PLAYER_ACTION: "playerAction",
  ROUND_OVER: "roundOver",
  GAME_RESULT_SCREEN: "gameResultScreen",
  GAME_ERROR: "gameError",
} as const;

export const CRASH_ACTIONS = {
  CRASH_ACTION: "crashAction",
} as const;

export type CrashEventName = (typeof CRASH_EVENTS)[keyof typeof CRASH_EVENTS];
export type CrashActionName =
  (typeof CRASH_ACTIONS)[keyof typeof CRASH_ACTIONS];
