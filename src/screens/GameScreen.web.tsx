// === Main Game Screen — Web (scrolling space background) ===
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, Text, View, SafeAreaView, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolateColor,
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/useGameStore';
import { HeatBar } from '../components/game/HeatBar';
import { MultiplierDisplay } from '../components/game/MultiplierDisplay';
import { RocketScene } from '../components/game/RocketScene';
import { ActionButtons } from '../components/game/ActionButtons';
import { LobbyFeed } from '../components/game/LobbyFeed';
import { CountdownOverlay } from '../components/game/CountdownOverlay';
import { FireParticles } from '../animations/particles/FireParticles';
import { IceParticles } from '../animations/particles/IceParticles';
import { ExplosionEffect } from '../animations/particles/ExplosionEffect';
import { useScreenShake } from '../animations/hooks/useScreenShake';
import { playSound } from '../sounds/SoundManager';
import { ScrollingBackground } from '../components/game/ScrollingBackground';
import { Image } from 'react-native';
import { COLORS } from '../constants';

const crashWarsLogo = require('../../assets/figma/crash-wars-logo.png');
const CLOSE_BTN_URL = 'https://www.figma.com/api/mcp/asset/c5a10420-5daa-4f66-bee8-f13d4cf47dff';

export function GameScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const phase = useGameStore(s => s.phase);
  const elapsed = useGameStore(s => s.elapsed);
  const heat = useGameStore(s => s.heat);
  const pool = useGameStore(s => s.pool);
  const players = useGameStore(s => s.players);
  const coolUsesLeft = useGameStore(s => s.coolUsesLeft);
  const boostUsesLeft = useGameStore(s => s.boostUsesLeft);
  const feedMessages = useGameStore(s => s.feedMessages);

  const heatDeltaEvent = useGameStore(s => s.heatDeltaEvent);

  const useCool = useGameStore(s => s.useCool);
  const useBoost = useGameStore(s => s.useBoost);
  const exitRound = useGameStore(s => s.exitRound);

  const myPlayerId = useGameStore(s => s.myPlayerId);
  const human = players.find(p => p.id === myPlayerId) ?? players[0] ?? {
    id: '', name: '', isHuman: true, isBot: false,
    status: 'alive' as const, exitTime: null, boostCount: 0,
    coolCount: 0, score: 0, prize: 0, rank: null,
  };

  const [optimisticExited, setOptimisticExited] = useState(false);
  const [optimisticExitTime, setOptimisticExitTime] = useState<number | null>(null);

  // Reset optimistic state on new round
  useEffect(() => {
    if (phase === 'countdown') {
      setOptimisticExited(false);
      setOptimisticExitTime(null);
    }
  }, [phase]);

  const effectiveStatus = optimisticExited ? 'exited' as const : human.status;

  // Particle effect triggers
  const [fireActive, setFireActive] = useState(false);
  const [iceActive, setIceActive] = useState(false);

  // Screen flash overlays
  const coolFlash = useSharedValue(0);
  const boostFlash = useSharedValue(0);
  const bustFlash = useSharedValue(0);

  const coolFlashStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0, 212, 255, ${coolFlash.value * 0.25})`,
  }));

  const boostFlashStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(255, 68, 68, ${boostFlash.value * 0.25})`,
  }));

  const bustFlashStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(255, 0, 0, ${bustFlash.value * 0.5})`,
  }));

  // Heat delta indicator
  const [deltaText, setDeltaText] = useState<string | null>(null);
  const [deltaPositive, setDeltaPositive] = useState(false);
  const deltaOpacity = useSharedValue(0);
  const deltaTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!heatDeltaEvent) return;
    const isPositive = heatDeltaEvent.delta > 0;
    setDeltaText(isPositive ? `+${heatDeltaEvent.delta}%` : `${heatDeltaEvent.delta}%`);
    setDeltaPositive(isPositive);
    deltaOpacity.value = 1;
    deltaTranslateY.value = 0;
    deltaOpacity.value = withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }),
    );
    deltaTranslateY.value = withTiming(-28, { duration: 650, easing: Easing.out(Easing.quad) });
  }, [heatDeltaEvent?.id]);

  const deltaAnimStyle = useAnimatedStyle(() => ({
    opacity: deltaOpacity.value,
    transform: [{ translateY: deltaTranslateY.value }],
  }));

  // Screen shake
  const shakeStyle = useScreenShake(heat, 80, effectiveStatus === 'exited');

  // Red overlay based on heat
  const heatShared = useSharedValue(0);
  useEffect(() => {
    heatShared.value = withTiming(heat, { duration: 50 });
  }, [heat]);

  const overlayStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      heatShared.value,
      [0, 50, 80, 100],
      ['transparent', 'transparent', '#ff000010', '#ff000030'],
    ),
  }));

  // Countdown is now handled by CountdownOverlay component
  // Game state comes entirely from server via onGameState

  // Handle COOL — sound + haptic + flash + particles
  const handleCool = useCallback(async () => {
    useCool();
    setIceActive(true);
    setTimeout(() => setIceActive(false), 100);
    coolFlash.value = withSequence(
      withTiming(1, { duration: 60, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }),
    );
    void playSound('cool');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [useCool]);

  // Handle BOOST — sound + haptic + flash + particles
  const handleBoost = useCallback(async () => {
    useBoost();
    setFireActive(true);
    setTimeout(() => setFireActive(false), 100);
    boostFlash.value = withSequence(
      withTiming(1, { duration: 60, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }),
    );
    void playSound('boost');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [useBoost]);

  // Handle EXIT — optimistic exit + sound + success haptic
  const handleExit = useCallback(async () => {
    setOptimisticExited(true);
    setOptimisticExitTime(elapsed);
    exitRound();
    void playSound('exit');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [exitRound, elapsed]);

  // Bust detection — explosion sound + heavy haptic + red flash
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (prevPhaseRef.current === 'running' && phase === 'roundOver') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      void playSound('explosion');
      bustFlash.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }),
      );
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // Warning beep when heat > 85% (plays every ~1.5s)
  const lastWarningRef = useRef(0);
  useEffect(() => {
    if (phase === 'running' && heat > 85) {
      const now = Date.now();
      if (now - lastWarningRef.current > 1500) {
        void playSound('warning', 0.4);
        lastWarningRef.current = now;
      }
    }
  }, [heat, phase]);

  const barWidth = screenWidth - 32;

  // Countdown overlay
  if (phase === 'countdown') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollingBackground />
        <CountdownOverlay onComplete={() => {}} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollingBackground />
      {/* Top gradient overlay — top 30% only */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '30%',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.48) 60%, rgba(0,0,0,0) 100%)',
          zIndex: 1,
        } as any}
      />
      <Animated.View style={[styles.container, shakeStyle, { zIndex: 2 }]}>
        {/* Red heat overlay */}
        <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]} pointerEvents="none" />
        {/* COOL flash (blue) */}
        <Animated.View style={[StyleSheet.absoluteFill, coolFlashStyle]} pointerEvents="none" />
        {/* BOOST flash (red) */}
        <Animated.View style={[StyleSheet.absoluteFill, boostFlashStyle]} pointerEvents="none" />
        {/* Bust flash (deep red) */}
        <Animated.View style={[StyleSheet.absoluteFill, bustFlashStyle]} pointerEvents="none" />

        {/* Top section: Logo + Pool + Heat Bar */}
        <View style={styles.topSection}>
          <View style={styles.poolRow}>
            <Image source={crashWarsLogo} style={styles.logo} resizeMode="contain" />
            <img src={CLOSE_BTN_URL} style={{ width: 100, height: 100, cursor: 'pointer' } as any} alt="close" />
          </View>

          {/* Players count — below logo/X row */}
          <View style={styles.playersRow}>
            <Text style={styles.playersLabel}>Players</Text>
            <View style={styles.playersBadge}>
              <img
                src="https://www.figma.com/api/mcp/asset/6fd71d50-6425-4a79-b8f4-7bc7a4a15e73"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' } as any}
                alt=""
              />
              <Text style={styles.playersCount}>{players.length}</Text>
            </View>
          </View>

          <View style={styles.heatBarContainer}>
            <HeatBar heat={heat} width={barWidth} />
            {deltaText !== null && (
              <Animated.Text style={[styles.heatDelta, deltaPositive ? styles.heatDeltaRed : styles.heatDeltaBlue, deltaAnimStyle]}>
                {deltaText}
              </Animated.Text>
            )}
          </View>
        </View>

        {/* Multiplier */}
        <View style={styles.multiplierSection}>
          <MultiplierDisplay
            elapsed={elapsed}
            heat={heat}
            playerStatus={effectiveStatus}
            exitTime={optimisticExited ? optimisticExitTime : human.exitTime}
          />
        </View>

        {/* Rocket Scene — centered, dedicated area */}
        <View style={styles.rocketSection}>
          <RocketScene
            heat={heat}
            elapsed={elapsed}
            width={screenWidth * 0.5}
            height={140}
            isRunning={phase === 'running'}
          />
        </View>

        {/* Player Feed */}
        <View style={styles.feedSection}>
          <LobbyFeed
            players={players}
            feedMessages={feedMessages}
            showFeed
          />
        </View>

        {/* Action Buttons */}
        <ActionButtons
          coolUsesLeft={coolUsesLeft}
          boostUsesLeft={boostUsesLeft}
          playerStatus={effectiveStatus}
          onCool={handleCool}
          onBoost={handleBoost}
          onExit={handleExit}
        />

        {/* Particle Effects */}
        <FireParticles
          x={screenWidth / 2}
          y={screenHeight * 0.6}
          active={fireActive}
          width={screenWidth}
          height={screenHeight}
        />
        <IceParticles
          x={screenWidth / 2}
          y={screenHeight * 0.4}
          active={iceActive}
          width={screenWidth}
          height={screenHeight}
        />

        {/* Explosion on round end */}
        <ExplosionEffect
          active={phase === 'roundOver'}
          width={screenWidth}
          height={screenHeight}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0d0b2e',
  },
  container: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  poolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 125,
  },
  playersRow: {
    alignItems: 'flex-start',
    paddingLeft: 8,
    marginTop: -8,
  },
  playersLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  playersBadge: {
    width: 52,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playersCount: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    zIndex: 1,
  },
  poolLabel: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  poolAmount: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '800',
  },
  heatBarContainer: {
    alignItems: 'center',
  },
  heatDelta: {
    position: 'absolute',
    right: 8,
    bottom: 0,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heatDeltaRed: {
    color: '#ff4444',
  },
  heatDeltaBlue: {
    color: '#00d4ff',
  },
  multiplierSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  rocketSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
  },
  feedSection: {
    flex: 1,
    paddingHorizontal: 8,
  },
});
