// === HeatWave PvP — Type Definitions ===
// Re-export shared types + client-only types

export type {
  PlayerStatus,
  GamePhase,
  Player,
  HeatState,
  FeedMessage,
  // WebSocket protocol types
  ClientMessage,
  ServerMessage,
  JoinQueueMessage,
  LeaveQueueMessage,
  ActionMessage,
  PingMessage,
  QueueStatusPayload,
  MatchFoundPayload,
  CountdownPayload,
  GameStatePayload,
  PlayerActionPayload,
  RoundOverPayload,
  ErrorPayload,
  PongPayload,
} from '../shared/types';

// Re-export GameState interface locally (it includes React-specific action signatures)
export interface GameState {
  // Round state
  phase: import('../shared/types').GamePhase;
  elapsed: number;
  heat: number;
  pool: number;
  countdown: number;

  // Heat effect tracking
  heatRateModifier: number;
  heatRateModifierEnd: number;

  // Players
  players: import('../shared/types').Player[];

  // Human actions
  coolUsesLeft: number;
  boostUsesLeft: number;

  // Feed messages
  feedMessages: import('../shared/types').FeedMessage[];

  // Actions
  useCool: () => void;
  useBoost: () => void;
  exitRound: () => void;
  resetLobby: () => void;
}

// Client-only: particle type for visual effects
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  opacity: number;
}
