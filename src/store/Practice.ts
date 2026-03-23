import { CURRENCY_CODES, LOBBY_FORMAT, LOBBY_TYPE } from "../types";
import { CardId } from "../ui/Cards/Card";
import {
  // ALLOW_ACTIONS,
  FINISH_TYPES,
  GAME_STATE,
  GAME_TABLE_MODES,
  StoreData,
} from "./storeTypes";
import {
  localStorageUtil,
  LOCAL_STORAGE_KEYS,
} from "../utils/localStorageUtil";

// Helper function to get profile pictures from localStorage or use default
const getPlayerProfilePicture = () => {
  return (
    localStorageUtil.getItem(LOCAL_STORAGE_KEYS.PLAYER_PROFILE_PICTURE) ||
    "https://d29i2jg7pajoz0.cloudfront.net/avatars/8.png"
  );
};

const getOpponentProfilePicture = () => {
  return (
    localStorageUtil.getItem(LOCAL_STORAGE_KEYS.OPPONENT_PROFILE_PICTURE) ||
    "https://d29i2jg7pajoz0.cloudfront.net/avatars/3.png"
  );
};

export const practicePhaseOneData: StoreData = {
  gameState: GAME_STATE.PHASE_ONE,
  matchId: "123",
  activeColumnIndex: -1,
  gameUserId: "FTUE",
  isReconnection: false,
  gameMode: GAME_TABLE_MODES.DUEL,
  players: {
    FTUE: {
      gameUserId: "FTUE",
      username: "",
      profilePicture: getPlayerProfilePicture(),
      fallbackImageUrl: getPlayerProfilePicture(),
      networkStatus: 1,
      extraTurnTimeLeft: 30,
      skipTurnCount: 3,
      cardsColumns: new Array(3).fill({
        cards: new Array(2).fill(null),
        score: 0,
        finishType: FINISH_TYPES.NONE,
      }),
      lobbyDetails: {
        _id: "123",
        entryFee: 0,
        currencyCode: CURRENCY_CODES.USD,
        lobbyType: LOBBY_TYPE.FREE,
        winAmount: 0,
        currencySymbol: "$",
        isActive: true,
        partnerId: "123",
        numPlayers: 2,
        lobbyFormat: LOBBY_FORMAT.DUEL,
      },
    },
    opponent: {
      gameUserId: "opponent",
      username: "opponent",
      profilePicture: getOpponentProfilePicture(),
      fallbackImageUrl: getOpponentProfilePicture(),
      networkStatus: 1,
      extraTurnTimeLeft: 30,
      skipTurnCount: 3,
      cardsColumns: new Array(3).fill({
        cards: new Array(2).fill(null),
        score: 0,
        finishType: FINISH_TYPES.NONE,
      }),
      lobbyDetails: {
        _id: "123",
        entryFee: 0,
        currencyCode: CURRENCY_CODES.USD,
        lobbyType: LOBBY_TYPE.FREE,
        winAmount: 0,
        currencySymbol: "$",
        isActive: true,
        partnerId: "123",
        numPlayers: 2,
        lobbyFormat: LOBBY_FORMAT.DUEL,
      },
    },
  },
};

export const practicePhaseTwoData: StoreData = {
  gameState: GAME_STATE.PHASE_TWO,
  matchId: "123",
  activeColumnIndex: 2,
  gameUserId: "FTUE",
  isReconnection: false,
  gameMode: GAME_TABLE_MODES.DUEL,
  players: {
    FTUE: {
      gameUserId: "FTUE",
      username: "",
      profilePicture: getPlayerProfilePicture(),
      fallbackImageUrl: getPlayerProfilePicture(),
      networkStatus: 1,
      extraTurnTimeLeft: 30,
      skipTurnCount: 3,
      lobbyDetails: {
        _id: "123",
        entryFee: 0,
        currencyCode: CURRENCY_CODES.USD,
        lobbyType: LOBBY_TYPE.FREE,
        winAmount: 0,
        currencySymbol: "$",
        isActive: true,
        partnerId: "123",
        numPlayers: 2,
        lobbyFormat: LOBBY_FORMAT.DUEL,
      },
      cardsColumns: [
        {
          cards: ["H13", "H3"],
          score: 16,
          finishType: FINISH_TYPES.NONE,
        },
        {
          cards: ["S11", "H7"],
          score: 17,
          finishType: FINISH_TYPES.NONE,
        },
        {
          cards: ["D7", "C9"],
          score: 16,
          finishType: FINISH_TYPES.NONE,
        },
      ],
    },
    opponent: {
      gameUserId: "opponent",
      username: "opponent",
      profilePicture: getOpponentProfilePicture(),
      fallbackImageUrl: getOpponentProfilePicture(),
      networkStatus: 1,
      extraTurnTimeLeft: 30,
      skipTurnCount: 3,
      cardsColumns: [
        {
          cards: ["H7", "D7"],
          score: 14,
          finishType: FINISH_TYPES.NONE,
        },
        {
          cards: ["H13", "C9"],
          score: 19,
          finishType: FINISH_TYPES.NONE,
        },
        {
          cards: ["S11", "H3"],
          score: 13,
          finishType: FINISH_TYPES.NONE,
        },
      ],
      lobbyDetails: {
        _id: "123",
        entryFee: 0,
        currencyCode: CURRENCY_CODES.USD,
        lobbyType: LOBBY_TYPE.FREE,
        winAmount: 0,
        currencySymbol: "$",
        isActive: true,
        partnerId: "123",
        numPlayers: 2,
        lobbyFormat: LOBBY_FORMAT.DUEL,
      },
    },
  },
};

const opponentCardPlacements = new Map([
  [
    "0-0",
    {
      opponentColumn: 2,
      opponentCard: 1,
      cardValue: "H3",
    },
  ],
  [
    "0-1",
    {
      opponentColumn: 1,
      opponentCard: 0,
      cardValue: "H13",
    },
  ],
  [
    "1-0",
    {
      opponentColumn: 0,
      opponentCard: 0,
      cardValue: "H7",
    },
  ],
  [
    "1-1",
    {
      opponentColumn: 2,
      opponentCard: 0,
      cardValue: "S11",
    },
  ],
  [
    "2-0",
    {
      opponentColumn: 1,
      opponentCard: 1,
      cardValue: "C9",
    },
  ],
  [
    "2-1",
    {
      opponentColumn: 0,
      opponentCard: 1,
      cardValue: "D7",
    },
  ],
]);

export const getPracticeStepsData = (
  cardIndex: number,
  columnIndex: number,
) => {
  const key = `${columnIndex}-${cardIndex}`;
  return opponentCardPlacements.get(key) as {
    opponentColumn: number;
    opponentCard: number;
    cardValue: CardId;
  };
};

export const cardPlacements = new Map<number, { column: number; card: number }>(
  [
    [1, { column: 2, card: 0 }],
    [2, { column: 1, card: 1 }],
    [3, { column: 0, card: 0 }],
    [4, { column: 0, card: 1 }],
    [5, { column: 2, card: 1 }],
  ],
);
