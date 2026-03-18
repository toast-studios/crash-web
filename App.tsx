// === HeatWave PvP — Entry Point (Toast Integration) ===
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useGameStore } from './src/store/useGameStore';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { GameScreen } from './src/screens/GameScreen';
import { RoundOverScreen } from './src/screens/RoundOverScreen';
import { initSounds } from './src/sounds/SoundManager';
import { ToastAuthService } from './src/services/ToastAuthService';
import { ToastSocketService } from './src/services/ToastSocketService';

export default function App() {
  const phase = useGameStore(s => s.phase);
  const loadStats = useGameStore(s => s.loadStats);
  const setConnectionStatus = useGameStore(s => s.setConnectionStatus);
  const onGameTableInfo = useGameStore(s => s.onGameTableInfo);
  const onMatchFound = useGameStore(s => s.onMatchFound);
  const onCountdown = useGameStore(s => s.onCountdown);
  const onGameStart = useGameStore(s => s.onGameStart);
  const onGameState = useGameStore(s => s.onGameState);
  const onPlayerAction = useGameStore(s => s.onPlayerAction);
  const onRoundOver = useGameStore(s => s.onRoundOver);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // True when connected via ?at= webview token — skip LobbyScreen
  const [isWebviewFlow, setIsWebviewFlow] = useState(false);
  // Delay RoundOverScreen so bust Lottie animation can play
  const [showRoundOver, setShowRoundOver] = useState(false);
  useEffect(() => {
    if (phase === 'roundOver') {
      const t = setTimeout(() => setShowRoundOver(true), 2000);
      return () => clearTimeout(t);
    }
    setShowRoundOver(false);
  }, [phase]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      initSounds();
      await loadStats();

      try {
        // --- Webview token flow ---
        const urlTokens = ToastAuthService.parseUrlTokens();
        if (urlTokens) {
          await ToastAuthService.initFromWebviewToken(urlTokens.at, urlTokens.rt);
          if (cancelled) return;

          // Register socket event listeners (safe to do before connect)
          ToastSocketService.onStatusChange(setConnectionStatus);
          ToastSocketService.on('gameTableInfo', onGameTableInfo);
          ToastSocketService.on('matchFound', onMatchFound);
          ToastSocketService.on('countdown', (data: { secondsRemaining: number }) =>
            onCountdown(data.secondsRemaining),
          );
          ToastSocketService.on('gameStart', onGameStart);
          ToastSocketService.on('gameStateSync', onGameState);
          ToastSocketService.on('playerAction', onPlayerAction);
          ToastSocketService.on('roundOver', onRoundOver);
          ToastSocketService.on('gameError', (data: { message: string }) => {
            console.warn('[Toast gameError]', data.message);
          });
          ToastSocketService.on('matchNotFound', (data: { matchId: string }) => {
            console.warn('[Toast matchNotFound]', data.matchId);
          });

          // Connect directly with the JWT — server will pair the player automatically
          ToastSocketService.connect(urlTokens.at);

          setIsWebviewFlow(true);
          setReady(true);
          return;
        }

        // --- Existing Toast gateway flow (dev/testing) ---
        const { isRejoin } = await ToastAuthService.init();
        if (cancelled) return;

        const token = ToastAuthService.getToken();
        if (!token) throw new Error('No auth token after init');

        // Register socket event listeners (safe to do before connect)
        ToastSocketService.onStatusChange(setConnectionStatus);
        ToastSocketService.on('gameTableInfo', onGameTableInfo);
        ToastSocketService.on('matchFound', onMatchFound);
        ToastSocketService.on('countdown', (data: { secondsRemaining: number }) =>
          onCountdown(data.secondsRemaining),
        );
        ToastSocketService.on('gameStart', onGameStart);
        ToastSocketService.on('gameStateSync', onGameState);
        ToastSocketService.on('playerAction', onPlayerAction);
        ToastSocketService.on('roundOver', onRoundOver);
        ToastSocketService.on('gameError', (data: { message: string }) => {
          console.warn('[Toast gameError]', data.message);
        });
        ToastSocketService.on('matchNotFound', (data: { matchId: string }) => {
          console.warn('[Toast matchNotFound]', data.matchId);
        });

        if (isRejoin) {
          // Reconnect to the existing game immediately
          const ctx = ToastAuthService.getMatchContext();
          ToastSocketService.connect(token);
          if (ctx) {
            // Re-emit joinCrashGame once socket connects
            ToastSocketService.onStatusChange((status) => {
              if (status === 'connected') {
                ToastSocketService.emit('joinCrashGame', {
                  matchId: ctx.matchId,
                  totalPlayers: 2,
                  countdownSeconds: 3,
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
                });
              }
            });
          }
        }

        setReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error('[App init]', err);
          setAuthError('Failed to connect. Please reload.');
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  if (authError) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>{authError}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {phase === 'lobby' && isWebviewFlow && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.waitingText}>Finding match…</Text>
        </View>
      )}
      {phase === 'lobby' && !isWebviewFlow && <LobbyScreen />}
      {(phase === 'countdown' || phase === 'running' || (phase === 'roundOver' && !showRoundOver)) && <GameScreen />}
      {phase === 'roundOver' && showRoundOver && <RoundOverScreen />}
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  waitingText: {
    color: '#FF6B35',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
