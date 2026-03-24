// === HeatWave PvP — Typed Socket Event Map ===
// Defines compile-time type safety for all crash game socket events.

import { CRASH_EVENTS, CRASH_ACTIONS } from "../constants";
import type {
  GameTableInfoPayload,
  CrashMatchFoundPayload,
  GameStartPayload,
  GameStateSyncPayload,
  CrashPlayerActionPayload,
  RoundOverPayload,
  CrashGameResultPayload,
  CrashErrorPayload,
  CrashActionPayload,
  CrashActionAckResponse,
} from "../types/crashGame";

// --- Server → Client Event Map ---

export interface CrashServerToClientEvents {
  [CRASH_EVENTS.GAME_TABLE_INFO]: (data: GameTableInfoPayload) => void;
  [CRASH_EVENTS.MATCH_FOUND]: (data: CrashMatchFoundPayload) => void;
  [CRASH_EVENTS.MATCH_NOT_FOUND]: (data: { matchId: string }) => void;
  [CRASH_EVENTS.GAME_START]: (data: GameStartPayload) => void;
  [CRASH_EVENTS.GAME_STATE_SYNC]: (data: GameStateSyncPayload) => void;
  [CRASH_EVENTS.PLAYER_ACTION]: (data: CrashPlayerActionPayload) => void;
  [CRASH_EVENTS.ROUND_OVER]: (data: RoundOverPayload) => void;
  [CRASH_EVENTS.GAME_RESULT_SCREEN]: (data: CrashGameResultPayload) => void;
  [CRASH_EVENTS.GAME_ERROR]: (data: CrashErrorPayload) => void;
}

// --- Client → Server Event Map ---

export interface CrashClientToServerEvents {
  [CRASH_ACTIONS.CRASH_ACTION]: (
    data: CrashActionPayload,
    ack?: (response: CrashActionAckResponse) => void,
  ) => void;
}

// Re-export payload types for convenient single-import access
export type {
  GameTableInfoPayload,
  CrashMatchFoundPayload,
  GameStartPayload,
  GameStateSyncPayload,
  CrashPlayerActionPayload,
  RoundOverPayload,
  CrashGameResultPayload,
  CrashErrorPayload,
  CrashActionPayload,
  CrashActionAckResponse,
};
