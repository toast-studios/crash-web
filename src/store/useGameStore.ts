// === HeatWave PvP — Zustand Game Store (Online + Offline) ===

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FeedMessage, GamePhase, Player, GameStatePayload, RoundOverPayload, MatchFoundPayload } from '../types';
import { calculateHeatTick, isRoundOver } from '../engine/HeatEngine';
import { getBotDecision, resetBotCooldowns } from '../engine/BotBrain';
import { rankPlayers } from '../engine/Scoring';
import {
  BET_AMOUNT,
  BOT_CONFIGS,
  BOOST_DURATION,
  BOOST_HEAT_INCREASE,
  BOOST_MAX_USES,
  BOOST_RATE_MODIFIER,
  COOL_DURATION,
  COOL_HEAT_REDUCTION,
  COOL_MAX_USES,
  COOL_RATE_MODIFIER,
  COUNTDOWN_SECONDS,
  PRIZE_POOL,
  STARTING_BALANCE,
  TICK_INTERVAL,
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

  // Actions (offline)
  tick: () => void;
  useCool: () => void;
  useBoost: () => void;
  exitRound: () => void;
  startCountdown: () => void;
  startRound: () => void;
  resetLobby: () => void;
  loadBalance: () => Promise<void>;

  // Actions (online)
  setOnline: (online: boolean) => void;
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

function createPlayers(): Player[] {
  const human: Player = {
    id: 'human',
    name: 'YOU',
    isHuman: true,
    isBot: false,
    status: 'alive',
    exitTime: null,
    boostCount: 0,
    coolCount: 0,
    score: 0,
    prize: 0,
    rank: null,
  };

  const bots: Player[] = BOT_CONFIGS.map((config: (typeof BOT_CONFIGS)[number], i: number) => ({
    id: `bot-${i}`,
    name: config.name,
    isHuman: false,
    isBot: true,
    personality: config.personality,
    status: 'alive' as const,
    exitTime: null,
    boostCount: 0,
    coolCount: 0,
    score: 0,
    prize: 0,
    rank: null,
  }));

  return [human, ...bots];
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

function applyRoundResult(
  balance: number,
  betAmount: number,
  prize: number,
  rank: number,
  stats: PlayerStats,
): { balance: number; profit: number; stats: PlayerStats } {
  const profit = prize - betAmount;
  const newBalance = Math.max(0, balance + profit);
  const won = rank <= 3;

  const newStats: PlayerStats = {
    roundsPlayed: stats.roundsPlayed + 1,
    roundsWon: stats.roundsWon + (won ? 1 : 0),
    totalWinnings: stats.totalWinnings + prize,
    totalLosses: stats.totalLosses + betAmount,
    bestRank: Math.min(stats.bestRank, rank),
    currentStreak: won ? stats.currentStreak + 1 : 0,
    bestStreak: won
      ? Math.max(stats.bestStreak, stats.currentStreak + 1)
      : stats.bestStreak,
  };

  return { balance: newBalance, profit, stats: newStats };
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'lobby',
  elapsed: 0,
  heat: 0,
  pool: PRIZE_POOL,
  countdown: COUNTDOWN_SECONDS,
  heatRateModifier: 0,
  heatRateModifierEnd: 0,
  players: createPlayers(),
  coolUsesLeft: COOL_MAX_USES,
  boostUsesLeft: BOOST_MAX_USES,
  feedMessages: [],

  balance: STARTING_BALANCE,
  betAmount: BET_AMOUNT,
  lastRoundProfit: 0,
  stats: DEFAULT_STATS,
  balanceLoaded: false,

  // Online state
  isOnline: false,
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

  // === OFFLINE ACTIONS (preserved as-is) ===

  tick: () => {
    const state = get();
    if (state.phase !== 'running' || state.isOnline) return;

    const dt = TICK_INTERVAL / 1000;
    const newElapsed = state.elapsed + dt;

    let rateModifier = state.heatRateModifier;
    const rateModifierEnd = state.heatRateModifierEnd;
    if (newElapsed >= rateModifierEnd) {
      rateModifier = 0;
    }

    const newHeat = calculateHeatTick(state.heat, newElapsed, rateModifier);

    let players = [...state.players];
    let feedMessages = [...state.feedMessages];
    let currentHeat = newHeat;
    let currentRateModifier = rateModifier;
    let currentRateModifierEnd = rateModifierEnd;

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!player.isBot || player.status !== 'alive') continue;

      const decision = getBotDecision(player, currentHeat, newElapsed, players);

      switch (decision.action) {
        case 'cool':
          if (player.coolCount < COOL_MAX_USES) {
            players[i] = { ...player, coolCount: player.coolCount + 1 };
            currentHeat = Math.max(0, currentHeat - COOL_HEAT_REDUCTION);
            currentRateModifier = COOL_RATE_MODIFIER;
            currentRateModifierEnd = newElapsed + COOL_DURATION;
            feedMessages = addFeedMessage(feedMessages, player.name, 'cool', newElapsed);
          }
          break;
        case 'boost':
          if (player.boostCount < BOOST_MAX_USES) {
            players[i] = { ...player, boostCount: player.boostCount + 1 };
            currentHeat = Math.min(100, currentHeat + BOOST_HEAT_INCREASE);
            currentRateModifier = BOOST_RATE_MODIFIER;
            currentRateModifierEnd = newElapsed + BOOST_DURATION;
            feedMessages = addFeedMessage(feedMessages, player.name, 'boost', newElapsed);
          }
          break;
        case 'exit':
          players[i] = {
            ...player,
            status: 'exited',
            exitTime: newElapsed,
          };
          feedMessages = addFeedMessage(feedMessages, player.name, 'exit', newElapsed);
          break;
      }
    }

    if (isRoundOver(currentHeat)) {
      players = players.map(p =>
        p.status === 'alive' ? { ...p, status: 'bust' as const } : p,
      );
      players.forEach(p => {
        if (p.status === 'bust') {
          feedMessages = addFeedMessage(feedMessages, p.name, 'bust', newElapsed);
        }
      });

      const ranked = rankPlayers(players, newElapsed);
      const human = ranked.find(p => p.isHuman)!;
      const result = applyRoundResult(
        state.balance,
        state.betAmount,
        human.prize,
        human.rank ?? 99,
        state.stats,
      );
      void persistBalance(result.balance, result.stats);

      set({
        phase: 'roundOver',
        elapsed: newElapsed,
        heat: 100,
        players: ranked,
        feedMessages,
        heatRateModifier: 0,
        heatRateModifierEnd: 0,
        balance: result.balance,
        lastRoundProfit: result.profit,
        stats: result.stats,
      });
      return;
    }

    set({
      elapsed: newElapsed,
      heat: currentHeat,
      players,
      feedMessages,
      heatRateModifier: currentRateModifier,
      heatRateModifierEnd: currentRateModifierEnd,
    });
  },

  useCool: () => {
    const state = get();
    if (state.isOnline) {
      state.sendAction('cool');
      return;
    }
    if (state.phase !== 'running' || state.coolUsesLeft <= 0) return;
    const human = state.players[0];
    if (human.status !== 'alive') return;

    const newHeat = Math.max(0, state.heat - COOL_HEAT_REDUCTION);
    const players = [...state.players];
    players[0] = { ...human, coolCount: human.coolCount + 1 };

    set({
      heat: newHeat,
      coolUsesLeft: state.coolUsesLeft - 1,
      players,
      heatRateModifier: COOL_RATE_MODIFIER,
      heatRateModifierEnd: state.elapsed + COOL_DURATION,
      feedMessages: addFeedMessage(state.feedMessages, 'YOU', 'cool', state.elapsed),
    });
  },

  useBoost: () => {
    const state = get();
    if (state.isOnline) {
      state.sendAction('boost');
      return;
    }
    if (state.phase !== 'running' || state.boostUsesLeft <= 0) return;
    const human = state.players[0];
    if (human.status !== 'alive') return;

    const newHeat = Math.min(100, state.heat + BOOST_HEAT_INCREASE);
    const players = [...state.players];
    players[0] = { ...human, boostCount: human.boostCount + 1 };

    if (isRoundOver(newHeat)) {
      const bustedPlayers = players.map(p =>
        p.status === 'alive' ? { ...p, status: 'bust' as const } : p,
      );
      const ranked = rankPlayers(bustedPlayers, state.elapsed);
      const humanResult = ranked.find(p => p.isHuman)!;
      const result = applyRoundResult(
        state.balance,
        state.betAmount,
        humanResult.prize,
        humanResult.rank ?? 99,
        state.stats,
      );
      void persistBalance(result.balance, result.stats);

      set({
        phase: 'roundOver',
        heat: 100,
        boostUsesLeft: state.boostUsesLeft - 1,
        players: ranked,
        feedMessages: addFeedMessage(state.feedMessages, 'YOU', 'boost', state.elapsed),
        balance: result.balance,
        lastRoundProfit: result.profit,
        stats: result.stats,
      });
      return;
    }

    set({
      heat: newHeat,
      boostUsesLeft: state.boostUsesLeft - 1,
      players,
      heatRateModifier: BOOST_RATE_MODIFIER,
      heatRateModifierEnd: state.elapsed + BOOST_DURATION,
      feedMessages: addFeedMessage(state.feedMessages, 'YOU', 'boost', state.elapsed),
    });
  },

  exitRound: () => {
    const state = get();
    if (state.isOnline) {
      state.sendAction('exit');
      return;
    }
    if (state.phase !== 'running') return;
    const human = state.players[0];
    if (human.status !== 'alive') return;

    const players = [...state.players];
    players[0] = {
      ...human,
      status: 'exited',
      exitTime: state.elapsed,
    };

    set({
      players,
      feedMessages: addFeedMessage(state.feedMessages, 'YOU', 'exit', state.elapsed),
    });
  },

  startCountdown: () => {
    const state = get();
    if (state.isOnline) return; // server handles countdown
    const newBalance = Math.max(0, state.balance - state.betAmount);
    void AsyncStorage.setItem(STORAGE_KEY_BALANCE, JSON.stringify(newBalance));
    set({
      phase: 'countdown',
      countdown: COUNTDOWN_SECONDS,
      balance: newBalance,
    });
  },

  startRound: () => {
    const state = get();
    if (state.isOnline) return; // server handles this
    resetBotCooldowns();
    set({ phase: 'running' });
  },

  resetLobby: () => {
    resetBotCooldowns();
    set({
      phase: 'lobby',
      elapsed: 0,
      heat: 0,
      pool: PRIZE_POOL,
      countdown: COUNTDOWN_SECONDS,
      heatRateModifier: 0,
      heatRateModifierEnd: 0,
      players: createPlayers(),
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

  setOnline: (online: boolean) => set({ isOnline: online }),

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
    // Find the human player in the server state to derive uses left
    const myPlayer = state.myPlayerId
      ? payload.players.find((p: Player) => p.id === state.myPlayerId)
      : payload.players.find((p: Player) => p.isHuman);

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
    // Find our player in the match
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
