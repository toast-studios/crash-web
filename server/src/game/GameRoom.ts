// === HeatWave PvP — Game Room ===
// One room = one round. Server-authoritative tick loop.

import seedrandom from 'seedrandom';
import type { Player, FeedMessage, GamePhase, GameStatePayload } from '../../../shared/types';
import {
  calculateHeatTick,
  getSeededHeatJitter,
  isRoundOver,
  rankPlayers,
} from '../../../shared';
import {
  TICK_INTERVAL,
  COOL_HEAT_REDUCTION,
  COOL_RATE_MODIFIER,
  COOL_DURATION,
  COOL_MAX_USES,
  BOOST_HEAT_INCREASE,
  BOOST_RATE_MODIFIER,
  BOOST_DURATION,
  BOOST_MAX_USES,
  PRIZE_POOL,
  MAX_ACTIONS_PER_SECOND,
  COUNTDOWN_SECONDS,
} from '../../../shared/constants';
import type { ConnectionManager } from '../ws/ConnectionManager';
import { ErrorCode } from '../utils/errors';
import { logger } from '../utils/logger';

const EXIT_GRACE_PERIOD_MS = 1000;

interface HumanPlayerEntry {
  userId: string;
  displayName: string;
}

export class GameRoom {
  readonly roomId: string;
  private phase: GamePhase = 'countdown';
  private elapsed = 0;
  private heat = 0;
  private heatRateModifier = 0;
  private heatRateModifierEnd = 0;
  private players: Player[] = [];
  private feedMessages: FeedMessage[] = [];
  private pool = PRIZE_POOL;

  private rng: () => number;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private finalizeTimer: ReturnType<typeof setTimeout> | null = null;
  private roundEndedAt: number | null = null;
  private tickCount = 0;
  private countdownRemaining = COUNTDOWN_SECONDS;

  private humanPlayerIds = new Set<string>(); // userId → playerId mapping
  private userToPlayerId = new Map<string, string>(); // userId → player.id
  private playerActionTimes = new Map<string, number[]>(); // playerId → action timestamps for rate limiting

  private connections: ConnectionManager;
  private onRoomEnd?: (roomId: string, players: Player[], elapsed: number) => void;

  constructor(
    roomId: string,
    humans: HumanPlayerEntry[],
    connections: ConnectionManager,
    onRoomEnd?: (roomId: string, players: Player[], elapsed: number) => void,
  ) {
    this.roomId = roomId;
    this.connections = connections;
    this.onRoomEnd = onRoomEnd;
    this.rng = seedrandom(roomId);

    // Build player list from humans only
    this.players = humans.map((h, i) => {
      const playerId = `human-${i}-${h.userId.slice(0, 8)}`;
      this.humanPlayerIds.add(h.userId);
      this.userToPlayerId.set(h.userId, playerId);
      return {
        id: playerId,
        name: h.displayName,
        isHuman: true,
        isBot: false,
        status: 'alive' as const,
        exitTime: null,
        boostCount: 0,
        coolCount: 0,
        score: 0,
        prize: 0,
        rank: null,
      };
    });

    logger.info({ roomId, playerCount: humans.length }, 'GameRoom created');
  }

  getPlayerIds(): string[] {
    return Array.from(this.humanPlayerIds);
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  /**
   * Start the countdown sequence (3, 2, 1, GO).
   */
  startCountdown(): void {
    this.countdownRemaining = COUNTDOWN_SECONDS;

    // Send personalized match_found to each human with their player ID
    const playerList = this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot }));
    for (const [userId, playerId] of this.userToPlayerId) {
      this.connections.send(userId, {
        type: 'match_found',
        payload: {
          room_id: this.roomId,
          players: playerList,
          countdown_seconds: COUNTDOWN_SECONDS,
          yourPlayerId: playerId,
        },
      });
    }

    this.countdownTimer = setInterval(() => {
      if (this.countdownRemaining <= 0) {
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
        this.startGame();
        return;
      }

      this.connections.broadcast(this.roomId, {
        type: 'countdown',
        payload: { seconds_remaining: this.countdownRemaining },
      });

      this.countdownRemaining--;
    }, 1000);
  }

  /**
   * Start the actual game tick loop at 20Hz.
   */
  private startGame(): void {
    this.phase = 'running';
    logger.info({ roomId: this.roomId }, 'Game started');

    this.tickTimer = setInterval(() => this.tick(), TICK_INTERVAL);
  }

  /**
   * Main game tick — runs at 20Hz.
   */
  private tick(): void {
    if (this.phase !== 'running') return;

    const dt = TICK_INTERVAL / 1000;
    this.elapsed += dt;
    this.tickCount++;

    // Expire rate modifier
    if (this.elapsed >= this.heatRateModifierEnd) {
      this.heatRateModifier = 0;
    }

    // Calculate heat with seeded jitter
    const jitter = getSeededHeatJitter(this.rng);
    this.heat = calculateHeatTick(this.heat, this.elapsed, this.heatRateModifier, jitter);

    // Check round over
    if (isRoundOver(this.heat)) {
      this.endRound();
      return;
    }

    // Broadcast state at 10Hz (every other tick)
    if (this.tickCount % 2 === 0) {
      this.broadcastGameState();
    }
  }

  /**
   * Handle a human player's action.
   */
  handleAction(userId: string, action: 'cool' | 'boost' | 'exit'): void {
    const inGrace =
      action === 'exit' &&
      this.phase === 'roundOver' &&
      this.roundEndedAt !== null &&
      Date.now() - this.roundEndedAt < EXIT_GRACE_PERIOD_MS;

    if (this.phase !== 'running' && !inGrace) {
      this.connections.send(userId, {
        type: 'error',
        payload: { code: ErrorCode.GAME_NOT_RUNNING, message: 'Game is not running' },
      });
      return;
    }

    const playerId = this.userToPlayerId.get(userId);
    if (!playerId) return;

    const playerIdx = this.players.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return;

    const player = this.players[playerIdx];
    if (player.status !== 'alive') {
      if (!inGrace) {
        this.connections.send(userId, {
          type: 'error',
          payload: { code: ErrorCode.PLAYER_NOT_ALIVE, message: 'Player is not alive' },
        });
      }
      return;
    }

    // Rate limiting
    if (!this.checkRateLimit(playerId)) {
      this.connections.send(userId, {
        type: 'error',
        payload: { code: ErrorCode.RATE_LIMITED, message: 'Too many actions' },
      });
      return;
    }

    // Validate uses
    if (action === 'cool' && player.coolCount >= COOL_MAX_USES) {
      this.connections.send(userId, {
        type: 'error',
        payload: { code: ErrorCode.NO_USES_LEFT, message: 'No COOL uses left' },
      });
      return;
    }
    if (action === 'boost' && player.boostCount >= BOOST_MAX_USES) {
      this.connections.send(userId, {
        type: 'error',
        payload: { code: ErrorCode.NO_USES_LEFT, message: 'No BOOST uses left' },
      });
      return;
    }

    this.executeAction(playerIdx, action);

    // Broadcast the action immediately to all players
    this.connections.broadcast(this.roomId, {
      type: 'player_action',
      payload: {
        player_id: player.id,
        player_name: player.name,
        action,
        time: this.elapsed,
      },
    });

    // Check round over after boost
    if (action === 'boost' && isRoundOver(this.heat)) {
      this.endRound();
    }
  }

  private executeAction(playerIdx: number, action: string): void {
    if (action === 'none') return;

    const player = this.players[playerIdx];

    switch (action) {
      case 'cool':
        if (player.coolCount < COOL_MAX_USES) {
          this.players[playerIdx] = { ...player, coolCount: player.coolCount + 1 };
          this.heat = Math.max(0, this.heat - COOL_HEAT_REDUCTION);
          this.heatRateModifier = COOL_RATE_MODIFIER;
          this.heatRateModifierEnd = this.elapsed + COOL_DURATION;
          this.addFeedMessage(player.name, 'cool');
        }
        break;
      case 'boost':
        if (player.boostCount < BOOST_MAX_USES) {
          this.players[playerIdx] = { ...player, boostCount: player.boostCount + 1 };
          this.heat = Math.min(100, this.heat + BOOST_HEAT_INCREASE);
          this.heatRateModifier = BOOST_RATE_MODIFIER;
          this.heatRateModifierEnd = this.elapsed + BOOST_DURATION;
          this.addFeedMessage(player.name, 'boost');
        }
        break;
      case 'exit':
        this.players[playerIdx] = {
          ...player,
          status: 'exited',
          exitTime: this.elapsed,
        };
        this.addFeedMessage(player.name, 'exit');
        break;
    }
  }

  private endRound(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    this.phase = 'roundOver';
    this.roundEndedAt = Date.now();
    this.heat = 100;

    // Delay finalization to allow in-flight exit actions to be processed
    this.finalizeTimer = setTimeout(() => this.finalizeRound(), EXIT_GRACE_PERIOD_MS);
  }

  private finalizeRound(): void {
    this.finalizeTimer = null;

    // Mark any players still alive as bust
    this.players = this.players.map(p =>
      p.status === 'alive' ? { ...p, status: 'bust' as const } : p,
    );

    // Add bust messages
    this.players.forEach(p => {
      if (p.status === 'bust') {
        this.addFeedMessage(p.name, 'bust');
      }
    });

    // Rank and assign prizes
    this.players = rankPlayers(this.players, this.elapsed);

    logger.info({ roomId: this.roomId, elapsed: this.elapsed }, 'Round finalized');

    // round_over is sent by GameRoomManager after DB updates (with real balance)

    // Notify room manager for DB persistence and cleanup
    if (this.onRoomEnd) {
      this.onRoomEnd(this.roomId, this.players, this.elapsed);
    }
  }

  private broadcastGameState(): void {
    const payload: GameStatePayload = {
      elapsed: this.elapsed,
      heat: this.heat,
      heatRateModifier: this.heatRateModifier,
      heatRateModifierEnd: this.heatRateModifierEnd,
      players: this.players,
      feedMessages: this.feedMessages,
      phase: this.phase,
      pool: this.pool,
    };

    this.connections.broadcast(this.roomId, { type: 'game_state', payload });
  }

  private addFeedMessage(playerName: string, action: FeedMessage['action']): void {
    const msg: FeedMessage = {
      id: `${Date.now()}-${this.rng()}`,
      playerName,
      action,
      time: this.elapsed,
    };
    this.feedMessages = [msg, ...this.feedMessages].slice(0, 20);
  }

  private checkRateLimit(playerId: string): boolean {
    const now = Date.now();
    let times = this.playerActionTimes.get(playerId);
    if (!times) {
      times = [];
      this.playerActionTimes.set(playerId, times);
    }

    // Remove timestamps older than 1 second
    const cutoff = now - 1000;
    while (times.length > 0 && times[0] < cutoff) {
      times.shift();
    }

    if (times.length >= MAX_ACTIONS_PER_SECOND) {
      return false;
    }

    times.push(now);
    return true;
  }

  /**
   * Get ranked player data for a specific user (for round_over with real balance).
   */
  getPlayerResult(userId: string): { rank: number; prize: number } | null {
    const playerId = this.userToPlayerId.get(userId);
    if (!playerId) return null;
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;
    return { rank: player.rank ?? 99, prize: player.prize };
  }

  getPlayers(): Player[] {
    return this.players;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  /**
   * Get a map from player.id → real userId (for DB recording).
   */
  getPlayerIdToUserId(): Map<string, string> {
    const map = new Map<string, string>();
    for (const [userId, playerId] of this.userToPlayerId) {
      map.set(playerId, userId);
    }
    return map;
  }

  destroy(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.finalizeTimer) {
      clearTimeout(this.finalizeTimer);
      this.finalizeTimer = null;
    }
    logger.info({ roomId: this.roomId }, 'GameRoom destroyed');
  }
}
