// === HeatWave PvP — Entry Point (Toast Integration) ===
import React, { useEffect, useState, useCallback } from 'react';
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
  const onMatchFound = useGameStore(s => s.onMatchFound);
  const onCountdown = useGameStore(s => s.onCountdown);
  const onGameStart = useGameStore(s => s.onGameStart);
  const onGameState = useGameStore(s => s.onGameState);
  const onPlayerAction = useGameStore(s => s.onPlayerAction);
  const onRoundOver = useGameStore(s => s.onRoundOver);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const connectSocket = useCallback((token: string) => {
    ToastSocketService.onStatusChange(setConnectionStatus);
    ToastSocketService.connect(token);
  }, [setConnectionStatus]);


  useEffect(() => {
    let cancelled = false;

    async function init() {
      initSounds();
      await loadStats();

      try {
        await ToastAuthService.init();
        if (cancelled) return;

        const token = ToastAuthService.getToken();
        if (!token) throw new Error('No auth token after init');

        // Register Toast socket event listeners
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

        connectSocket(token);
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
      {phase === 'lobby' && <LobbyScreen />}
      {(phase === 'countdown' || phase === 'running') && <GameScreen />}
      {phase === 'roundOver' && <RoundOverScreen />}
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
});
