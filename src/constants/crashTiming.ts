// === HeatWave PvP — Crash Game Timing & Limit Constants ===
// Mirrors values from crash-web/shared/constants.ts for client-side use.

export const CRASH_TIMING = {
  COUNTDOWN_SECONDS: 3,
  STATE_BROADCAST_INTERVAL_MS: 100,
  ROUND_OVER_RESULT_DELAY_MS: 1500,
  /** Delay after `gameResultScreen` before navigating to the result UI. */
  RESULT_SCREEN_NAV_DELAY_MS: 3000,
  TICK_INTERVAL_MS: 50,
  /** Hold duration after the GAME OVER splash animation before firing GameEnded. */
  GAME_OVER_HOLD_DURATION_MS: 1000,
} as const;

export const CRASH_GAME_LIMITS = {
  DEFAULT_COOL_MAX: 3,
  DEFAULT_BOOST_MAX: 2,
  TOTAL_PLAYERS: 2,
  HEAT_MAX: 100,
  MAX_ACTIONS_PER_SECOND: 5,
} as const;

export const CRASH_HEAT_DEFAULTS = {
  COOL_REDUCTION_FALLBACK: 10,
  COOL_REDUCTION_YELLOW: 15,
  COOL_REDUCTION_RED: 20,
  COOL_REDUCTION_CRITICAL: 25,
  BOOST_INCREASE_FALLBACK: 10,
  BOOST_INCREASE_YELLOW: 15,
  BOOST_INCREASE_RED: 20,
  BOOST_INCREASE_CRITICAL: 25,
} as const;
