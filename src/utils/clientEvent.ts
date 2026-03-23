import { CURRENCY_CODES, LOBBY_FORMAT } from "../types";
import { sendMessageToApp } from "../scripts/webToAppCommunication.helper";
import { getSessionId } from "./playable";
import { getUserId } from "./playable";
import { Opponents } from "../store/storeTypes";

export enum CLIENT_EVENT {
  GAME_LOADED = "GAME_LOADED",
  AUTH_SUCCESS = "AUTH_SUCCESS",
  AUTH_FAILED = "AUTH_FAILED",
  REGISTER_START = "REGISTER_START",
  REGISTER_SUCCESS = "REGISTER_SUCCESS",
  REGISTER_FAILED = "REGISTER_FAILED",
  CANCEL_REGISTER = "CANCEL_REGISTER",
  MATCH_FOUND = "MATCH_FOUND",
  MATCH_NOT_FOUND = "MATCH_NOT_FOUND",
  GAME_STARTED = "GAME_STARTED",
  GAME_ENDED = "GAME_ENDED",
  QUIT_VIEW = "QUIT_VIEW",
  SEND_GAME_STATE_EVENT = "SEND_GAME_STATE_EVENT",
  OPEN_QUIT_POPUP_MODAL = "OPEN_QUIT_POPUP_MODAL",
  REMATCH_SCREEN = "REMATCH_SCREEN",
  SEND_DATA_TO_APP = "SEND_DATA_TO_APP",
  GAME_CLOSE = "GAME_CLOSE",
  LOBBY_CLOSE = "LOBBY_CLOSE",
  WAITING_FOR_OPPONENT = "WAITING_FOR_OPPONENT",
  REJOIN_MATCH = "REJOIN_MATCH",
}

export type RegisterSuccessData = {
  registrationId: string;
  amount: number;
};

export type RegisterStartData = {
  amount: number;
  lobbyId: string;
};

export type RegisterFailedData = {
  amount: number;
  reason: string;
  errorCode: string;
};

export enum TournamentParticipantStatus {
  COMPLETED = "COMPLETED",
  PLAYING = "PLAYING",
}

export type GameParticipant = {
  username: string;
  score: number;
  profilePicture: string;
  rank?: number;
  winAmount?: number;
  status?: TournamentParticipantStatus | null;
  isTie: boolean;
};

type GameResultType =
  | "player_won"
  | "player_lost"
  | "draw"
  | "player_quit"
  | "pending";

export type DuelGameEndedContext = {
  matchId: string;
  lobbyFormat: LOBBY_FORMAT.DUEL;
  gameResult: GameResultType;
  amount: number;
  user: GameParticipant;
  opponent: GameParticipant;
  currencyCode: CURRENCY_CODES;
};

export type TournamentGameEndedContext = {
  matchId: string;
  lobbyFormat: LOBBY_FORMAT.TOURNAMENT;
  gameResult: GameResultType;
  amount: number;
  user: GameParticipant;
  opponent: GameParticipant[];
  currencyCode?: CURRENCY_CODES;
};

export type GameEndedContext =
  | DuelGameEndedContext
  | TournamentGameEndedContext;

export type AuthFailedData = {
  reason: string;
};

export type MatchFoundData = {
  matchId: string;
};

export type GameStateChangeData = {
  gameState: "Lobby" | "Matchmaking" | "Gameplay" | "ResultScreen";
};

export type GameStarted = {
  amount: number;
};

export type WaitingForOpponentData = {
  remainingTime: number;
};

export type RejoinMatchData = {
  remainingTime: number;
  isRejoin: boolean; // true if rejoin match, false if new match
  opponents: Opponents;
};

export type EVENT_DATA = {
  [CLIENT_EVENT.GAME_LOADED]: NonNullable<unknown>;
  [CLIENT_EVENT.AUTH_SUCCESS]: NonNullable<unknown>;
  [CLIENT_EVENT.AUTH_FAILED]: AuthFailedData;
  [CLIENT_EVENT.REGISTER_SUCCESS]: RegisterSuccessData;
  [CLIENT_EVENT.REGISTER_FAILED]: RegisterFailedData;
  [CLIENT_EVENT.CANCEL_REGISTER]: NonNullable<unknown>;
  [CLIENT_EVENT.MATCH_FOUND]: Opponents;
  [CLIENT_EVENT.MATCH_NOT_FOUND]: NonNullable<unknown>;
  [CLIENT_EVENT.GAME_STARTED]: GameStarted;
  [CLIENT_EVENT.GAME_ENDED]: GameEndedContext;
  [CLIENT_EVENT.QUIT_VIEW]: NonNullable<unknown>;
  [CLIENT_EVENT.SEND_GAME_STATE_EVENT]: GameStateChangeData;
  [CLIENT_EVENT.OPEN_QUIT_POPUP_MODAL]: NonNullable<unknown>;
  [CLIENT_EVENT.REMATCH_SCREEN]: NonNullable<unknown>;
  [CLIENT_EVENT.REGISTER_START]: RegisterStartData;
  [CLIENT_EVENT.SEND_DATA_TO_APP]: Record<string, unknown>;
  [CLIENT_EVENT.GAME_CLOSE]: NonNullable<unknown>;
  [CLIENT_EVENT.LOBBY_CLOSE]: NonNullable<unknown>;
  [CLIENT_EVENT.WAITING_FOR_OPPONENT]: WaitingForOpponentData;
  [CLIENT_EVENT.REJOIN_MATCH]: RejoinMatchData;
};

type ClientEventData<T extends CLIENT_EVENT> = EVENT_DATA[T];
type FinalClientEventData<T extends CLIENT_EVENT> = EVENT_DATA[T] & {
  gameUserId: string;
  sessionId: string;
  timestamp: number;
  webVersion: string;
};

export const sendClientEvent = <T extends CLIENT_EVENT>(
  event: T,
  data: ClientEventData<T>,
) => {
  sendMessageToApp({
    eventName: event,
    context: {
      ...data,
      webVersion: import.meta.env.VITE_WEB_VERSION,
      timestamp: Date.now(),
      gameUserId: getUserId(),
      sessionId: getSessionId(),
    } as FinalClientEventData<T>,
  });
};

export abstract class ClientEvent {
  static GameLoaded() {
    sendClientEvent(CLIENT_EVENT.GAME_LOADED, {});

    // Also dispatch browser event to hide HTML loader
    const event = new CustomEvent("gameLoaded");
    window.dispatchEvent(event);
  }

  static AuthSuccess() {
    sendClientEvent(CLIENT_EVENT.AUTH_SUCCESS, {});
  }

  static AuthFailed(data: AuthFailedData) {
    sendClientEvent(CLIENT_EVENT.AUTH_FAILED, data);
  }

  static RegisterStart(data: RegisterStartData) {
    sendClientEvent(CLIENT_EVENT.REGISTER_START, data);
  }

  static RegisterSuccess(data: RegisterSuccessData) {
    sendClientEvent(CLIENT_EVENT.REGISTER_SUCCESS, data);
  }

  static RegisterFailed(data: RegisterFailedData) {
    sendClientEvent(CLIENT_EVENT.REGISTER_FAILED, data);
  }

  static CancelRegister() {
    sendClientEvent(CLIENT_EVENT.CANCEL_REGISTER, {});
  }

  static MatchFound(data: Opponents) {
    sendClientEvent(CLIENT_EVENT.MATCH_FOUND, data);
  }

  static MatchNotFound() {
    sendClientEvent(CLIENT_EVENT.MATCH_NOT_FOUND, {});
  }

  static GameStarted(data: GameStarted) {
    sendClientEvent(CLIENT_EVENT.GAME_STARTED, data);
  }

  static GameEnded(data: GameEndedContext) {
    sendClientEvent(CLIENT_EVENT.GAME_ENDED, data);
  }

  static QuitView() {
    sendClientEvent(CLIENT_EVENT.QUIT_VIEW, {});
  }

  static GameStateChange(data: GameStateChangeData) {
    sendClientEvent(CLIENT_EVENT.SEND_GAME_STATE_EVENT, data);
  }

  static ShowQuitPopupModal() {
    sendClientEvent(CLIENT_EVENT.OPEN_QUIT_POPUP_MODAL, {});
  }

  static RematchScreen() {
    sendClientEvent(CLIENT_EVENT.REMATCH_SCREEN, {});
  }

  static SendDataToApp(data: Record<string, unknown>) {
    sendClientEvent(CLIENT_EVENT.SEND_DATA_TO_APP, {
      data,
    });
  }

  static GameClose() {
    sendClientEvent(CLIENT_EVENT.GAME_CLOSE, {});
  }

  static LobbyClose() {
    sendClientEvent(CLIENT_EVENT.LOBBY_CLOSE, {});
  }
  static WaitingForOpponent(data: WaitingForOpponentData) {
    sendClientEvent(CLIENT_EVENT.WAITING_FOR_OPPONENT, data);
  }
  static RejoinMatch(data: RejoinMatchData) {
    sendClientEvent(CLIENT_EVENT.REJOIN_MATCH, data);
  }
}

// * Example
// sendClientEvent(CLIENT_EVENT.GAME_ENDED, {
//   gameResult: "player_won",
// });
