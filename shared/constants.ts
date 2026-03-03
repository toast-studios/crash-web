// === HeatWave PvP — Shared Game Constants ===

// Tick rate
export const TICK_INTERVAL = 50; // ms between ticks
export const TICKS_PER_SECOND = 1000 / TICK_INTERVAL; // 20

// Heat mechanics
export const BASE_HEAT_PER_TICK = 0.15;
export const HEAT_ACCELERATION = 0.02; // additional heat per elapsed second
export const HEAT_JITTER_RANGE = 0.3; // +/-0.3% random noise per tick
export const HEAT_MAX = 100;

// COOL action
export const COOL_HEAT_REDUCTION = 8; // instant -8%
export const COOL_RATE_MODIFIER = -0.05; // reduces rate for duration
export const COOL_DURATION = 1.0; // seconds
export const COOL_MAX_USES = 2;

// BOOST action
export const BOOST_HEAT_INCREASE = 5; // instant +5%
export const BOOST_RATE_MODIFIER = 0.03; // increases rate for duration
export const BOOST_DURATION = 0.5; // seconds
export const BOOST_MAX_USES = 4;
export const BOOST_TIME_BONUS = 1.0; // +1.0s score bonus per boost

// Scoring
export const PRIZE_POOL = 100;

// Balance system
export const STARTING_BALANCE = 1000;
export const BET_AMOUNT = 10;

// Countdown
export const COUNTDOWN_SECONDS = 3;

// Players
export const TOTAL_PLAYERS = 6;

// Matchmaking constants
export const MIN_REAL_PLAYERS = TOTAL_PLAYERS; // need full room of humans
export const MATCHMAKING_POLL_INTERVAL_MS = 1000; // check queue every 1s

// Server constants
export const SERVER_TICK_RATE = 20; // 20Hz game loop
export const STATE_BROADCAST_RATE = 10; // 10Hz broadcast (every other tick)
export const HEARTBEAT_INTERVAL_MS = 30000; // 30s ping/pong
export const RECONNECT_GRACE_PERIOD_MS = 60000; // 60s before full removal
export const MAX_ACTIONS_PER_SECOND = 5; // rate limit per player
export const ROOM_CLEANUP_DELAY_MS = 30000; // 30s after roundOver to destroy room
