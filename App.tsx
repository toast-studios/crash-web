// === HeatWave PvP — Entry Point ===
import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useGameStore } from './src/store/useGameStore';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { GameScreen } from './src/screens/GameScreen';
import { RoundOverScreen } from './src/screens/RoundOverScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { initSounds } from './src/sounds/SoundManager';
import { AuthService } from './src/services/AuthService';
import { WebSocketService } from './src/services/WebSocketService';
import type { ServerMessage } from './shared/types';

export default function App() {
  const phase = useGameStore(s => s.phase);
  const loadBalance = useGameStore(s => s.loadBalance);
  const isOnline = useGameStore(s => s.isOnline);
  const setOnline = useGameStore(s => s.setOnline);
  const setConnectionStatus = useGameStore(s => s.setConnectionStatus);
  const onGameState = useGameStore(s => s.onGameState);
  const onMatchFound = useGameStore(s => s.onMatchFound);
  const onCountdown = useGameStore(s => s.onCountdown);
  const onRoundOver = useGameStore(s => s.onRoundOver);
  const onQueueStatus = useGameStore(s => s.onQueueStatus);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check existing session on mount
  useEffect(() => {
    initSounds();
    loadBalance();

    let wsConnected = false;

    AuthService.getSession().then(session => {
      if (session) {
        setIsAuthenticated(true);
        if (!wsConnected) {
          wsConnected = true;
          connectWebSocket(session.access_token);
        }
      } else {
        setIsAuthenticated(false);
      }
    });

    // Listen for auth changes (fires on sign-in/sign-out, NOT for initial session)
    const { unsubscribe } = AuthService.onAuthStateChange((session) => {
      if (session) {
        setIsAuthenticated(true);
        if (!wsConnected) {
          wsConnected = true;
          connectWebSocket(session.access_token);
        }
      } else {
        wsConnected = false;
        setIsAuthenticated(false);
        WebSocketService.disconnect();
        setOnline(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const connectWebSocket = useCallback((token: string) => {
    WebSocketService.connect(token);
    setOnline(true);

    // Connection status listener
    WebSocketService.onStatusChange((status) => {
      setConnectionStatus(status);
      if (status === 'disconnected') {
        setOnline(false);
      } else if (status === 'connected') {
        setOnline(true);
      }
    });

    // Server message listener
    WebSocketService.onMessage((message: ServerMessage) => {
      switch (message.type) {
        case 'game_state':
          onGameState(message.payload);
          break;
        case 'match_found':
          onMatchFound(message.payload);
          break;
        case 'countdown':
          onCountdown(message.payload.seconds_remaining);
          break;
        case 'round_over':
          onRoundOver(message.payload);
          break;
        case 'queue_status':
          onQueueStatus(message.payload.position);
          break;
        case 'error':
          console.warn('[WS Error]', message.payload.code, message.payload.message);
          break;
        case 'pong':
          // Latency tracking could go here
          break;
      }
    });
  }, [onGameState, onMatchFound, onCountdown, onRoundOver, onQueueStatus, setConnectionStatus, setOnline]);

  const handleAuth = useCallback(() => {
    setIsAuthenticated(true);
    AuthService.getToken().then(token => {
      if (token) connectWebSocket(token);
    });
  }, [connectWebSocket]);

  // Show auth screen if not authenticated
  // null = still checking session, false = needs auth, true = authenticated
  if (isAuthenticated === null) {
    return <StatusBar style="light" />;
  }

  if (isAuthenticated === false) {
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen onAuth={handleAuth} />
      </>
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
