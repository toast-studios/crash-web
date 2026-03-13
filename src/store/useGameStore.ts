// === HeatWave PvP — Zustand Game Store (Toast Integration) ===

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FeedMessage, GamePhase, Player } from '../types';
import { COUNTDOWN_SECONDS, TOTAL_PLAYERS } from '../constants';
import { ToastSocketService } from '../services/ToastSocketService';
import { ToastAuthService } from '../services/ToastAuthService';
import type { ConnectionStatus } from '../services/ToastSocketService';

// --- Persisted Stats ---
interface PlayerStats {
  roundsPlayed: number;
  roundsWon: number;
  totalWinnings: number;
  bestRank: number;
  currentStreak: number;
  bestStreak: number;
}

const DEFAULT_STATS: PlayerStats = {
  roundsPlayed: 0,
  roundsWon: 0,
  totalWinnings: 0,
  bestRank: 99,
  currentStreak: 0,
  bestStreak: 0,
};

const STORAGE_KEY_STATS = 'heatwave_stats';

export type MatchmakingStatus = 'idle' | 'searching' | 'found';
export type HeatZone = 'green' | 'yellow' | 'red' | 'critical';

// --- Toast event payload types ---
interface ToastMatchFoundPayload {
  matchId: string;
  yourGameUserId: string;
  countdownSeconds: number;
  players: Array<{ gameUserId: string; username: string }>;
}

interface ToastGameStateSyncPayload {
  heat: number;
  velocity: number;
  elapsed: number;
  heatZone: HeatZone;
  phase: GamePhase;
  serverTime: number;
  players: Array<{
    id: string;
    name: string;
    status: 'alive' | 'exited' | 'bust';
    survivalTime: number;
    boostCount: number;
    coolCount: number;
    prize: number;
    rank: number | null;
  }>;
  feedMessages: Array<{
    id: string;
    playerName: string;
    action: FeedMessage['action'];
    survivalTime: number;
  }>;
}

interface ToastGameStartPayload {
  gameStartTime: number;
  initialHeat: number;
  initialVelocity: number;
  coolMaxUses: number;
  boostMaxUses: number;
}

interface ToastRoundOverPayload {
  matchId: string;
  winnerId: string;
  gameEndType: 'GAME_OVER' | 'DRAW';
  yourRank: number;
  yourPrize: number;
  yourSurvivalTime: number;
  players: Array<{
    id: string;
    name: string;
    status: 'alive' | 'exited' | 'bust';
    survivalTime: number;
    boostCount: number;
    coolCount: number;
    prize: number;
    rank: number;
  }>;
}

interface ToastPlayerActionPayload {
  gameUserId: string;
  username: string;
  action: 'cool' | 'boost' | 'exit';
  survivalTime: number;
}

interface GameStore {
  // Game state
  phase: GamePhase;
  elapsed: number;
  heat: number;
  heatZone: HeatZone;
  velocity: number;
  pool: number;
  countdown: number;
  players: Player[];
  coolUsesLeft: number;
  boostUsesLeft: number;
  coolMaxUses: number;
  boostMaxUses: number;
  feedMessages: FeedMessage[];

  // Prize / stats
  lastRoundPrize: number;
  betAmount: number;
  stats: PlayerStats;

  // Heat delta flash (for COOL/BOOST feedback on heat bar)
  heatDeltaEvent: { delta: number; id: string } | null;

  // Online state
  connectionStatus: ConnectionStatus;
  matchmakingStatus: MatchmakingStatus;
  myPlayerId: string | null;

  // Actions
  useCool: () => void;
  useBoost: () => void;
  exitRound: () => void;
  resetLobby: () => void;
  loadStats: () => Promise<void>;

  // Online actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  joinQueue: () => Promise<void>;
  leaveQueue: () => void;
  sendAction: (action: 'cool' | 'boost' | 'exit') => void;

  // Toast server event handlers
  onMatchFound: (payload: ToastMatchFoundPayload) => void;
  onCountdown: (seconds: number) => void;
  onGameStart: (payload: ToastGameStartPayload) => void;
  onGameState: (payload: ToastGameStateSyncPayload) => void;
  onPlayerAction: (payload: ToastPlayerActionPayload) => void;
  onRoundOver: (payload: ToastRoundOverPayload) => void;
}

async function persistStats(stats: PlayerStats) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  } catch {
    // silent fail
  }
}

const INITIAL_COOL_MAX = 3; // default from Toast docs; overridden by gameStart
const INITIAL_BOOST_MAX = 2;

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'lobby',
  elapsed: 0,
  heat: 0,
  heatZone: 'green',
  velocity: 0,
  pool: 0,
  countdown: COUNTDOWN_SECONDS,
  players: [],
  coolUsesLeft: INITIAL_COOL_MAX,
  boostUsesLeft: INITIAL_BOOST_MAX,
  coolMaxUses: INITIAL_COOL_MAX,
  boostMaxUses: INITIAL_BOOST_MAX,
  feedMessages: [],

  lastRoundPrize: 0,
  betAmount: 0,
  stats: DEFAULT_STATS,

  heatDeltaEvent: null,

  connectionStatus: 'disconnected',
  matchmakingStatus: 'idle',
  myPlayerId: null,

  loadStats: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_STATS);
      if (stored) {
        set({ stats: { ...DEFAULT_STATS, ...JSON.parse(stored) } });
      }
    } catch {
      // silent fail
    }
  },

  // === ACTIONS ===

  useCool: () => get().sendAction('cool'),
  useBoost: () => get().sendAction('boost'),

  exitRound: () => {
    get().sendAction('exit');
  },

  resetLobby: () => {
    const { coolMaxUses, boostMaxUses } = get();
    ToastAuthService.clearMatchContext();
    set({
      phase: 'lobby',
      elapsed: 0,
      heat: 0,
      heatZone: 'green',
      velocity: 0,
      countdown: COUNTDOWN_SECONDS,
      players: [],
      coolUsesLeft: coolMaxUses,
      boostUsesLeft: boostMaxUses,
      feedMessages: [],
      lastRoundPrize: 0,
      matchmakingStatus: 'idle',
      myPlayerId: null,
    });
  },

  // === ONLINE ACTIONS ===

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  joinQueue: async () => {
    set({ matchmakingStatus: 'searching' });
    try {
      const ctx = await ToastAuthService.fetchAndRegister();
      set({ pool: ctx.lobbyDetails.winAmount, betAmount: ctx.lobbyDetails.entryFee });

      ToastSocketService.emit('joinCrashGame', {
        matchId: ctx.matchId,
        totalPlayers: TOTAL_PLAYERS,
        countdownSeconds: COUNTDOWN_SECONDS,
        lobbyFormat: ctx.lobbyDetails.lobbyType,
        playerDetails: {
          gameUserId: ctx.gameUserId,
          registrationId: ctx.registrationId,
          partnerId: ctx.partnerId,
          partnerUserId: ctx.partnerUserId,
          username: ctx.username,
          profilePicture: '',
          lobbyDetails: ctx.lobbyDetails,
        },
      }, (ack: unknown) => {
        const res = ack as { error: boolean; message: string } | undefined;
        if (res?.error) {
          console.warn('[joinCrashGame] Error:', res.message);
          set({ matchmakingStatus: 'idle' });
        }
      });
    } catch (err) {
      console.error('[joinQueue] Failed:', err);
      set({ matchmakingStatus: 'idle' });
    }
  },

  leaveQueue: () => {
    set({ matchmakingStatus: 'idle' });
    ToastAuthService.clearMatchContext();
  },

  sendAction: (action) => {
    ToastSocketService.emit('crashAction', { action }, (ack: unknown) => {
      const res = ack as { error: boolean; message: string } | undefined;
      if (res?.error) {
        console.warn('[crashAction] Error:', res.message);
      }
    });
  },

  // === TOAST SERVER EVENT HANDLERS ===

  onMatchFound: (payload) => {
    set({
      matchmakingStatus: 'found',
      phase: 'countdown',
      countdown: payload.countdownSeconds,
      myPlayerId: payload.yourGameUserId,
      players: payload.players.map(p => ({
        id: p.gameUserId,
        name: p.username,
        isHuman: true,
        isBot: false,
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
    });
  },

  onCountdown: (seconds) => {
    set({ countdown: seconds, phase: 'countdown' });
  },

  onGameStart: (payload) => {
    set({
      phase: 'running',
      heat: payload.initialHeat,
      velocity: payload.initialVelocity,
      coolMaxUses: payload.coolMaxUses,
      boostMaxUses: payload.boostMaxUses,
      coolUsesLeft: payload.coolMaxUses,
      boostUsesLeft: payload.boostMaxUses,
    });
  },

  onGameState: (payload) => {
    const state = get();
    const myPlayer = state.myPlayerId
      ? payload.players.find(p => p.id === state.myPlayerId)
      : null;

    const players: Player[] = payload.players.map(p => ({
      id: p.id,
      name: p.name,
      isHuman: true,
      isBot: false,
      status: p.status,
      exitTime: p.survivalTime ?? null,
      boostCount: p.boostCount,
      coolCount: p.coolCount,
      score: p.survivalTime ?? 0,
      prize: p.prize,
      rank: p.rank,
    }));

    const feedMessages: FeedMessage[] = payload.feedMessages.map(f => ({
      id: f.id,
      playerName: f.playerName,
      action: f.action,
      time: f.survivalTime,
    }));

    set({
      phase: payload.phase,
      elapsed: payload.elapsed,
      heat: payload.heat,
      heatZone: payload.heatZone,
      velocity: payload.velocity,
      players,
      feedMessages,
      coolUsesLeft: myPlayer
        ? state.coolMaxUses - myPlayer.coolCount
        : state.coolUsesLeft,
      boostUsesLeft: myPlayer
        ? state.boostMaxUses - myPlayer.boostCount
        : state.boostUsesLeft,
    });
  },

  onPlayerAction: (payload) => {
    if (payload.action === 'cool') {
      const zone = get().heatZone;
      const delta =
        zone === 'critical' ? -25
        : zone === 'red' ? -20
        : zone === 'yellow' ? -15
        : -10;
      set({ heatDeltaEvent: { delta, id: `${Date.now()}-${Math.random()}` } });
    }
  },

  onRoundOver: (payload) => {
    const state = get();
    const newStats: PlayerStats = {
      ...state.stats,
      roundsPlayed: state.stats.roundsPlayed + 1,
      roundsWon: state.stats.roundsWon + (payload.yourRank === 1 ? 1 : 0),
      totalWinnings: state.stats.totalWinnings + payload.yourPrize,
      bestRank: Math.min(state.stats.bestRank, payload.yourRank),
      currentStreak: payload.yourRank === 1 ? state.stats.currentStreak + 1 : 0,
      bestStreak:
        payload.yourRank === 1
          ? Math.max(state.stats.bestStreak, state.stats.currentStreak + 1)
          : state.stats.bestStreak,
    };

    const players: Player[] = payload.players.map(p => ({
      id: p.id,
      name: p.name,
      isHuman: true,
      isBot: false,
      status: p.status,
      exitTime: p.survivalTime ?? null,
      boostCount: p.boostCount,
      coolCount: p.coolCount,
      score: p.survivalTime ?? 0,
      prize: p.prize,
      rank: p.rank,
    }));

    set({
      phase: 'roundOver',
      players,
      elapsed: payload.yourSurvivalTime,
      heat: 100,
      lastRoundPrize: payload.yourPrize,
      stats: newStats,
    });

    void persistStats(newStats);
  },
}));
