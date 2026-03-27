// === HeatWave PvP — Crash Game Types ===
// Derived from crash-web/shared/types.ts and the Toast server payload contracts.

import { LOBBY_FORMAT } from ".";
import { Lobby } from "../store/storeTypes";

// --- Domain Primitives ---

export type CrashPlayerStatus = "alive" | "exited" | "bust";

export type CrashGamePhase = "lobby" | "countdown" | "running" | "roundOver";

export type HeatZone = "green" | "yellow" | "red" | "critical";

export type CrashActionType = "cool" | "boost" | "exit_ship";

export type CrashFeedActionType = "cool" | "boost" | "exit" | "bust";

// --- Core Game Models ---

export interface CrashPlayer {
  id: string;
  name: string;
  status: CrashPlayerStatus;
  survivalTime: number;
  boostCount: number;
  coolCount: number;
  prize: number;
  rank: number | null;
}

export interface CrashFeedMessage {
  id: string;
  playerName: string;
  action: CrashFeedActionType;
  survivalTime: number;
}

export interface CrashGameConfig {
  coolMaxUses: number;
  boostMaxUses: number;
  coolReductionGreen: number;
  coolReductionYellow: number;
  coolReductionRed: number;
  coolReductionCritical: number;
  boostIncreaseGreen: number;
  boostIncreaseYellow: number;
  boostIncreaseRed: number;
  boostIncreaseCritical: number;
}

// --- Server → Client Payloads ---

export interface GameTableInfoPayload {
  matchId: string;
  gameUserId: string;
  isReconnection: boolean;
  gameConfig: CrashGameConfig;
  players: Array<{
    gameUserId: string;
    username: string;
    status: string;
    lobbyDetails: Lobby;
  }>;
  gameStateSync?: GameStateSyncPayload;
}

export interface CrashMatchFoundPayload {
  matchId: string;
  yourGameUserId: string;
  countdownSeconds: number;
  players: Array<{
    gameUserId: string;
    username: string;
  }>;
}

export interface GameStartPayload {
  gameStartTime: number;
  initialHeat: number;
  initialVelocity: number;
  coolMaxUses: number;
  boostMaxUses: number;
}

export interface GameStateSyncPayload {
  heat: number;
  velocity: number;
  elapsed: number;
  heatZone: HeatZone;
  phase: CrashGamePhase;
  serverTime: number;
  shipSpeed: number;
  players: Array<{
    id: string;
    name: string;
    status: CrashPlayerStatus;
    survivalTime: number;
    boostCount: number;
    coolCount: number;
    prize: number;
    rank: number | null;
  }>;
  feedMessages: Array<{
    id: string;
    playerName: string;
    action: CrashFeedActionType;
    survivalTime: number;
  }>;
}

export interface CrashPlayerActionPayload {
  gameUserId: string;
  username: string;
  action: CrashActionType;
  survivalTime: number;
}

export interface RoundOverPayload {
  matchId: string;
  winnerId: string;
  gameEndType: "GAME_OVER" | "DRAW";
  yourRank: number;
  yourPrize: number;
  yourSurvivalTime: number;
  players: Array<{
    id: string;
    name: string;
    status: CrashPlayerStatus;
    survivalTime: number;
    boostCount: number;
    coolCount: number;
    prize: number;
    rank: number;
  }>;
}

export interface CrashGameResultPayload {
  matchId: string;
  lobbyFormat: LOBBY_FORMAT;
  winnerId: string;
  looserId: string;
  winnerPoints: number;
  looserPoints: number;
  gameEndType: "GAME_OVER" | "DRAW";
  yourRank: number;
  yourPrize: number;
  yourSurvivalTime: number;
  yourUsername: string;
  yourProfilePicture: string;
  currencyCode: string;
  players: Array<{
    id: string;
    username: string;
    profilePicture: string;
    survivalTime: number;
    prize: number;
    rank: number;
  }>;
}

export interface CrashErrorPayload {
  message: string;
}

// --- Client → Server Payloads ---

export interface CrashActionPayload {
  action: "cool" | "boost" | "exit_ship";
}

export interface CrashActionAckResponse {
  error: boolean;
  message: string;
}

// --- Centralized Game Session State ---

export class CrashGameSessionState {
  phase: CrashGamePhase = "lobby";
  elapsed = 0;
  heat = 0;
  heatZone: HeatZone = "green";
  velocity = 0;
  shipSpeed = 0;
  countdown = 3;

  players: CrashPlayer[] = [];
  myPlayerId: string | null = null;
  feedMessages: CrashFeedMessage[] = [];

  coolUsesLeft = 0;
  boostUsesLeft = 0;
  coolMaxUses = 0;
  boostMaxUses = 0;

  gameConfig: CrashGameConfig | null = null;

  lastRoundPrize = 0;
  yourRank: number | null = null;
  yourSurvivalTime = 0;

  heatDeltaEvent: { delta: number; id: string } | null = null;

  constructor(init?: {
    gameConfig: CrashGameConfig;
    myPlayerId: string | null;
    players: CrashPlayer[];
  }) {
    if (init) {
      this.gameConfig = init.gameConfig;
      this.myPlayerId = init.myPlayerId;
      this.players = init.players;
      this.coolMaxUses = init.gameConfig.coolMaxUses;
      this.boostMaxUses = init.gameConfig.boostMaxUses;
      this.coolUsesLeft = init.gameConfig.coolMaxUses;
      this.boostUsesLeft = init.gameConfig.boostMaxUses;
    }
  }

  applyGameTableInfo(payload: GameTableInfoPayload): void {
    this.gameConfig = payload.gameConfig;
    this.coolMaxUses = payload.gameConfig.coolMaxUses;
    this.boostMaxUses = payload.gameConfig.boostMaxUses;
    this.coolUsesLeft = payload.gameConfig.coolMaxUses;
    this.boostUsesLeft = payload.gameConfig.boostMaxUses;
    this.phase = "lobby";
    this.heat = 0;
    this.velocity = 0;
    this.shipSpeed = 0;
  }

  applyGameStart(payload: GameStartPayload): void {
    this.phase = "running";
    this.heat = payload.initialHeat;
    this.velocity = payload.initialVelocity;
    this.coolMaxUses = payload.coolMaxUses;
    this.boostMaxUses = payload.boostMaxUses;
    this.coolUsesLeft = payload.coolMaxUses;
    this.boostUsesLeft = payload.boostMaxUses;
    this.shipSpeed = 0;
  }

  applyGameStateSync(payload: GameStateSyncPayload): void {
    this.phase = payload.phase;
    this.elapsed = payload.elapsed;
    this.heat = payload.heat;
    this.heatZone = payload.heatZone;
    this.velocity = payload.velocity;
    this.shipSpeed = Number.isFinite(payload.shipSpeed) ? payload.shipSpeed : 0;

    this.players = payload.players.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      survivalTime: p.survivalTime,
      boostCount: p.boostCount,
      coolCount: p.coolCount,
      prize: p.prize,
      rank: p.rank,
    }));

    this.feedMessages = payload.feedMessages.map((f) => ({
      id: f.id,
      playerName: f.playerName,
      action: f.action,
      survivalTime: f.survivalTime,
    }));

    const myPlayer = this.myPlayerId
      ? this.players.find((p) => p.id === this.myPlayerId)
      : null;

    if (myPlayer) {
      this.coolUsesLeft = this.coolMaxUses - myPlayer.coolCount;
      this.boostUsesLeft = this.boostMaxUses - myPlayer.boostCount;
    }
  }

  applyRoundOver(payload: RoundOverPayload): void {
    this.phase = "roundOver";
    this.heat = 100;
    this.yourRank = payload.yourRank;
    this.lastRoundPrize = payload.yourPrize;
    this.yourSurvivalTime = payload.yourSurvivalTime;

    this.players = payload.players.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      survivalTime: p.survivalTime,
      boostCount: p.boostCount,
      coolCount: p.coolCount,
      prize: p.prize,
      rank: p.rank,
    }));
  }

  computeHeatDelta(action: CrashActionType): number {
    const zone = this.heatZone;
    const cfg = this.gameConfig;

    if (action === "cool") {
      if (!cfg) {
        return -(zone === "critical"
          ? 25
          : zone === "red"
            ? 20
            : zone === "yellow"
              ? 15
              : 10);
      }
      return -(zone === "critical"
        ? cfg.coolReductionCritical
        : zone === "red"
          ? cfg.coolReductionRed
          : zone === "yellow"
            ? cfg.coolReductionYellow
            : cfg.coolReductionGreen);
    }

    if (action === "boost") {
      if (!cfg) {
        return zone === "critical"
          ? 25
          : zone === "red"
            ? 20
            : zone === "yellow"
              ? 15
              : 10;
      }
      return zone === "critical"
        ? cfg.boostIncreaseCritical
        : zone === "red"
          ? cfg.boostIncreaseRed
          : zone === "yellow"
            ? cfg.boostIncreaseYellow
            : cfg.boostIncreaseGreen;
    }

    return 0;
  }

  getMyPlayer(): CrashPlayer | undefined {
    return this.myPlayerId
      ? this.players.find((p) => p.id === this.myPlayerId)
      : undefined;
  }

  isMyPlayerAlive(): boolean {
    return this.getMyPlayer()?.status === "alive";
  }

  reset(): void {
    this.phase = "lobby";
    this.elapsed = 0;
    this.heat = 0;
    this.heatZone = "green";
    this.velocity = 0;
    this.shipSpeed = 0;
    this.countdown = 3;
    this.players = [];
    this.feedMessages = [];
    this.coolUsesLeft = this.coolMaxUses;
    this.boostUsesLeft = this.boostMaxUses;
    this.lastRoundPrize = 0;
    this.yourRank = null;
    this.yourSurvivalTime = 0;
    this.heatDeltaEvent = null;
  }
}
