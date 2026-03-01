// === HeatWave PvP — Zustand Game Store (Online Only) ===

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FeedMessage, GamePhase, Player, GameStatePayload, RoundOverPayload, MatchFoundPayload } from '../types';
import {
  BET_AMOUNT,
  BOOST_MAX_USES,
  COOL_MAX_USES,
  COUNTDOWN_SECONDS,
  PRIZE_POOL,
  STARTING_BALANCE,
} from '../constants';
import { WebSocketService } from '../services/WebSocketService';
import type { ConnectionStatus } from '../services/WebSocketService';

// --- Persisted Stats ---
interface PlayerStats {
  roundsPlayed: number;
  roundsWon: number;
  totalWinnings: number;
  totalLosses: number;
  bestRank: number;
  currentStreak: number;
  bestStreak: number;
}

const DEFAULT_STATS: PlayerStats = {
  roundsPlayed: 0,
  roundsWon: 0,
  totalWinnings: 0,
  totalLosses: 0,
  bestRank: 99,
  currentStreak: 0,
  bestStreak: 0,
};

const STORAGE_KEY_BALANCE = 'heatwave_balance';
const STORAGE_KEY_STATS = 'heatwave_stats';

// --- Matchmaking Status ---
export type MatchmakingStatus = 'idle' | 'searching' | 'found';

interface GameStore {
  // Game state
  phase: GamePhase;
  elapsed: number;
  heat: number;
  pool: number;
  countdown: number;
  heatRateModifier: number;
  heatRateModifierEnd: number;
  players: Player[];
  coolUsesLeft: number;
  boostUsesLeft: number;
  feedMessages: FeedMessage[];

  // Balance
  balance: number;
  betAmount: number;
  lastRoundProfit: number;

  // Stats
  stats: PlayerStats;
  balanceLoaded: boolean;

  // Online state
  isOnline: boolean;
  connectionStatus: ConnectionStatus;
  matchmakingStatus: MatchmakingStatus;
  myPlayerId: string | null;
  queuePosition: number;

  // Actions
  useCool: () => void;
  useBoost: () => void;
  exitRound: () => void;
  resetLobby: () => void;
  loadBalance: () => Promise<void>;

  // Online actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  joinQueue: () => void;
  leaveQueue: () => void;
  sendAction: (action: 'cool' | 'boost' | 'exit') => void;

  // Server event handlers
  onGameState: (payload: GameStatePayload) => void;
  onMatchFound: (payload: MatchFoundPayload) => void;
  onCountdown: (seconds: number) => void;
  onRoundOver: (payload: RoundOverPayload) => void;
  onQueueStatus: (position: number) => void;
}

function addFeedMessage(
  messages: FeedMessage[],
  playerName: string,
  action: FeedMessage['action'],
  time: number,
): FeedMessage[] {
  const msg: FeedMessage = {
    id: `${Date.now()}-${Math.random()}`,
    playerName,
    action,
    time,
  };
  return [msg, ...messages].slice(0, 20);
}

async function persistBalance(balance: number, stats: PlayerStats) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_BALANCE, JSON.stringify(balance));
    await AsyncStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  } catch {
    // silent fail
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'lobby',
  elapsed: 0,
  heat: 0,
  pool: PRIZE_POOL,
  countdown: COUNTDOWN_SECONDS,
  heatRateModifier: 0,
  heatRateModifierEnd: 0,
  players: [],
  coolUsesLeft: COOL_MAX_USES,
  boostUsesLeft: BOOST_MAX_USES,
  feedMessages: [],

  balance: STARTING_BALANCE,
  betAmount: BET_AMOUNT,
  lastRoundProfit: 0,
  stats: DEFAULT_STATS,
  balanceLoaded: false,

  // Online state — always online
  isOnline: true,
  connectionStatus: 'disconnected',
  matchmakingStatus: 'idle',
  myPlayerId: null,
  queuePosition: 0,

  loadBalance: async () => {
    try {
      const [balStr, statsStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_BALANCE),
        AsyncStorage.getItem(STORAGE_KEY_STATS),
      ]);
      const balance = balStr ? JSON.parse(balStr) : STARTING_BALANCE;
      const stats = statsStr ? { ...DEFAULT_STATS, ...JSON.parse(statsStr) } : DEFAULT_STATS;
      set({ balance, stats, balanceLoaded: true });
    } catch {
      set({ balanceLoaded: true });
    }
  },

  // === ACTIONS (always send via WebSocket) ===

  useCool: () => {
    get().sendAction('cool');
  },

  useBoost: () => {
    get().sendAction('boost');
  },

  exitRound: () => {
    get().sendAction('exit');
  },

  resetLobby: () => {
    set({
      phase: 'lobby',
      elapsed: 0,
      heat: 0,
      pool: PRIZE_POOL,
      countdown: COUNTDOWN_SECONDS,
      heatRateModifier: 0,
      heatRateModifierEnd: 0,
      players: [],
      coolUsesLeft: COOL_MAX_USES,
      boostUsesLeft: BOOST_MAX_USES,
      feedMessages: [],
      lastRoundProfit: 0,
      matchmakingStatus: 'idle',
      myPlayerId: null,
      queuePosition: 0,
    });
  },

  // === ONLINE ACTIONS ===

  setConnectionStatus: (status: ConnectionStatus) => set({ connectionStatus: status }),

  joinQueue: () => {
    set({ matchmakingStatus: 'searching' });
    WebSocketService.send({ type: 'join_queue', payload: {} });
  },

  leaveQueue: () => {
    set({ matchmakingStatus: 'idle', queuePosition: 0 });
    WebSocketService.send({ type: 'leave_queue', payload: {} });
  },

  sendAction: (action: 'cool' | 'boost' | 'exit') => {
    WebSocketService.send({ type: 'action', payload: { action } });
  },

  // === SERVER EVENT HANDLERS ===

  onGameState: (payload: GameStatePayload) => {
    const state = get();
    const myPlayer = state.myPlayerId
      ? payload.players.find((p: Player) => p.id === state.myPlayerId)
      : null;

    set({
      phase: payload.phase,
      elapsed: payload.elapsed,
      heat: payload.heat,
      heatRateModifier: payload.heatRateModifier,
      heatRateModifierEnd: payload.heatRateModifierEnd,
      players: payload.players,
      feedMessages: payload.feedMessages,
      pool: payload.pool,
      coolUsesLeft: myPlayer ? COOL_MAX_USES - myPlayer.coolCount : 0,
      boostUsesLeft: myPlayer ? BOOST_MAX_USES - myPlayer.boostCount : 0,
    });
  },

  onMatchFound: (payload: MatchFoundPayload) => {
    // Find our player in the match (first non-bot, or use WS auth id)
    const myPlayer = payload.players.find((p: MatchFoundPayload['players'][number]) => !p.isBot);

    set({
      matchmakingStatus: 'found',
      phase: 'countdown',
      countdown: payload.countdown_seconds,
      myPlayerId: myPlayer?.id ?? null,
      players: payload.players.map((p: MatchFoundPayload['players'][number]) => ({
        id: p.id,
        name: p.name,
        isHuman: !p.isBot,
        isBot: p.isBot,
        status: 'alive' as const,
        exitTime: null,
        boostCount: 0,
        coolCount: 0,
        score: 0,
        prize: 0,
        rank: null,
      })),
      feedMessages: [],
      heat: 0,
      elapsed: 0,
      coolUsesLeft: COOL_MAX_USES,
      boostUsesLeft: BOOST_MAX_USES,
    });
  },

  onCountdown: (seconds: number) => {
    set({ countdown: seconds, phase: 'countdown' });
  },

  onRoundOver: (payload: RoundOverPayload) => {
    const state = get();
    const newStats: PlayerStats = {
      ...state.stats,
      roundsPlayed: state.stats.roundsPlayed + 1,
      roundsWon: state.stats.roundsWon + (payload.your_rank <= 3 ? 1 : 0),
      totalWinnings: state.stats.totalWinnings + payload.your_prize,
      totalLosses: state.stats.totalLosses + state.betAmount,
      bestRank: Math.min(state.stats.bestRank, payload.your_rank),
      currentStreak: payload.your_rank <= 3 ? state.stats.currentStreak + 1 : 0,
      bestStreak: payload.your_rank <= 3
        ? Math.max(state.stats.bestStreak, state.stats.currentStreak + 1)
        : state.stats.bestStreak,
    };

    set({
      phase: 'roundOver',
      players: payload.players,
      elapsed: payload.elapsed,
      heat: 100,
      balance: payload.new_balance,
      lastRoundProfit: payload.your_profit,
      stats: newStats,
    });

    void persistBalance(payload.new_balance, newStats);
  },

  onQueueStatus: (position: number) => {
    set({ queuePosition: position });
  },
}));
