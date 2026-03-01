// === HeatWave PvP — Shared Type Definitions ===

export type PlayerStatus = 'alive' | 'exited' | 'bust';

export type GamePhase = 'lobby' | 'countdown' | 'running' | 'roundOver';

export interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  isBot: boolean;
  status: PlayerStatus;
  exitTime: number | null;
  boostCount: number;
  coolCount: number;
  score: number;
  prize: number;
  rank: number | null;
}

export interface HeatState {
  heat: number;
  rateModifier: number;
  rateModifierEnd: number;
}

export interface FeedMessage {
  id: string;
  playerName: string;
  action: 'cool' | 'boost' | 'exit' | 'bust';
  time: number;
}

// === WebSocket Message Protocol ===

// --- Client → Server ---

export interface JoinQueueMessage {
  type: 'join_queue';
  payload: {};
}

export interface LeaveQueueMessage {
  type: 'leave_queue';
  payload: {};
}

export interface ActionMessage {
  type: 'action';
  payload: { action: 'cool' | 'boost' | 'exit' };
}

export interface PingMessage {
  type: 'ping';
  payload: {};
}

export type ClientMessage =
  | JoinQueueMessage
  | LeaveQueueMessage
  | ActionMessage
  | PingMessage;

// --- Server → Client ---

export interface QueueStatusPayload {
  position: number;
  estimated_wait_ms: number;
}

export interface MatchFoundPayload {
  room_id: string;
  players: Array<{ id: string; name: string; isBot: boolean }>;
  countdown_seconds: number;
}

export interface CountdownPayload {
  seconds_remaining: number;
}

export interface GameStatePayload {
  elapsed: number;
  heat: number;
  heatRateModifier: number;
  heatRateModifierEnd: number;
  players: Player[];
  feedMessages: FeedMessage[];
  phase: GamePhase;
  pool: number;
}

export interface PlayerActionPayload {
  player_id: string;
  player_name: string;
  action: 'cool' | 'boost' | 'exit';
  time: number;
}

export interface RoundOverPayload {
  players: Player[];
  your_rank: number;
  your_prize: number;
  your_profit: number;
  new_balance: number;
  elapsed: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface PongPayload {
  serverTime: number;
}

export type ServerMessage =
  | { type: 'queue_status'; payload: QueueStatusPayload }
  | { type: 'match_found'; payload: MatchFoundPayload }
  | { type: 'countdown'; payload: CountdownPayload }
  | { type: 'game_state'; payload: GameStatePayload }
  | { type: 'player_action'; payload: PlayerActionPayload }
  | { type: 'round_over'; payload: RoundOverPayload }
  | { type: 'error'; payload: ErrorPayload }
  | { type: 'pong'; payload: PongPayload };
