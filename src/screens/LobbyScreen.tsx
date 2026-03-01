// === Pre-Round Lobby Screen with Matchmaking ===
import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { playSound } from '../sounds/SoundManager';
import { useGameStore } from '../store/useGameStore';
import { StarField } from '../components/shared/StarField';
import { COLORS } from '../constants';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type LobbyPhase = 'idle' | 'searching' | 'found';

export function LobbyScreen() {
  const players = useGameStore(s => s.players);
  const pool = useGameStore(s => s.pool);
  const balance = useGameStore(s => s.balance);
  const betAmount = useGameStore(s => s.betAmount);
  const stats = useGameStore(s => s.stats);
  const startCountdown = useGameStore(s => s.startCountdown);
  const isOnline = useGameStore(s => s.isOnline);
  const matchmakingStatus = useGameStore(s => s.matchmakingStatus);
  const joinQueue = useGameStore(s => s.joinQueue);
  const leaveQueue = useGameStore(s => s.leaveQueue);
  const connectionStatus = useGameStore(s => s.connectionStatus);

  const [lobbyPhase, setLobbyPhase] = useState<LobbyPhase>('idle');
  const [visiblePlayers, setVisiblePlayers] = useState(0); // how many bots revealed
  const [searchText, setSearchText] = useState('Searching for opponents');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const buttonScale = useSharedValue(1);
  const canAfford = balance >= betAmount;

  // Searching dots animation text
  useEffect(() => {
    if (lobbyPhase !== 'searching') return;
    let dots = 0;
    const interval = setInterval(() => {
      dots = (dots + 1) % 4;
      setSearchText('Searching for opponents' + '.'.repeat(dots));
    }, 400);
    return () => clearInterval(interval);
  }, [lobbyPhase]);

  // Matchmaking: reveal players one by one
  useEffect(() => {
    if (lobbyPhase !== 'searching') return;

    const bots = players.filter(p => p.isBot);
    let revealed = 0;

    const revealNext = () => {
      revealed++;
      setVisiblePlayers(revealed);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void playSound('tick');

      if (revealed >= bots.length) {
        // All found
        setTimeout(() => {
          setLobbyPhase('found');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 400);
      } else {
        // Random delay for next player (200-600ms)
        const delay = 200 + Math.random() * 400;
        timerRef.current = setTimeout(revealNext, delay);
      }
    };

    // Start revealing after 800ms "searching" delay
    timerRef.current = setTimeout(revealNext, 800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lobbyPhase, players]);

  const handleFindMatch = () => {
    if (!canAfford || lobbyPhase !== 'idle') return;
    buttonScale.value = withSequence(
      withSpring(0.92, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (isOnline) {
      joinQueue();
      setLobbyPhase('searching');
    } else {
      setLobbyPhase('searching');
      setVisiblePlayers(0);
    }
  };

  // Sync online matchmaking status → lobbyPhase
  React.useEffect(() => {
    if (!isOnline) return;
    if (matchmakingStatus === 'found') {
      setLobbyPhase('found');
      setVisiblePlayers(players.filter(p => p.isBot).length);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [isOnline, matchmakingStatus, players]);

  const handleStart = () => {
    buttonScale.value = withSequence(
      withSpring(0.92, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    startCountdown();
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const winRate = stats.roundsPlayed > 0
    ? Math.round((stats.roundsWon / stats.roundsPlayed) * 100)
    : 0;

  // Pulse animation for the searching indicator
  const searchPulse = useSharedValue(1);
  useEffect(() => {
    if (lobbyPhase === 'searching') {
      searchPulse.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      searchPulse.value = withTiming(1, { duration: 200 });
    }
  }, [lobbyPhase]);

  const searchPulseStyle = useAnimatedStyle(() => ({
    opacity: searchPulse.value,
  }));

  const bots = players.filter(p => p.isBot);
  const human = players[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StarField starCount={50} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.titleSection}>
          <Text style={styles.title}>HEATWAVE</Text>
          <Text style={styles.subtitle}>PvP</Text>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.balanceCard}>
          <View style={styles.balanceMain}>
            <Text style={styles.balanceLabel}>BALANCE</Text>
            <Text style={styles.balanceAmount}>${balance.toLocaleString()}</Text>
          </View>
          <View style={styles.balanceStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.roundsPlayed}</Text>
              <Text style={styles.statLabel}>Played</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{winRate}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                stats.currentStreak > 0 && { color: COLORS.alive },
              ]}>
                {stats.currentStreak}
              </Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </Animated.View>

        {/* Bet + Pool Row */}
        <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.betPoolRow}>
          <View style={styles.betCard}>
            <Text style={styles.betLabel}>ENTRY FEE</Text>
            <Text style={styles.betAmount}>${betAmount}</Text>
          </View>
          <View style={styles.betCard}>
            <Text style={styles.betLabel}>PRIZE POOL</Text>
            <Text style={[styles.betAmount, { color: COLORS.gold }]}>${pool}</Text>
          </View>
        </Animated.View>

        {/* Player List */}
        <View style={styles.playerSection}>
          {lobbyPhase === 'idle' ? (
            <Text style={styles.sectionTitle}>TAP FIND MATCH TO BEGIN</Text>
          ) : (
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>
                PLAYERS ({1 + visiblePlayers}/{players.length})
              </Text>
              {lobbyPhase === 'searching' && (
                <Animated.View style={searchPulseStyle}>
                  <ActivityIndicator size="small" color={COLORS.accent} />
                </Animated.View>
              )}
              {lobbyPhase === 'found' && (
                <Animated.Text entering={FadeIn.duration(300)} style={styles.allFoundText}>
                  ALL MATCHED
                </Animated.Text>
              )}
            </View>
          )}

          {/* Searching text */}
          {lobbyPhase === 'searching' && visiblePlayers === 0 && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.searchingContainer}>
              <Animated.Text style={[styles.searchingText, searchPulseStyle]}>
                {searchText}
              </Animated.Text>
            </Animated.View>
          )}

          <View style={styles.playerList}>
            {/* Human always visible */}
            {lobbyPhase !== 'idle' && (
              <Animated.View
                entering={SlideInRight.duration(300).springify().damping(14)}
                style={[styles.playerRow, styles.playerRowHuman]}
              >
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, styles.playerNameHuman]}>
                    {human.name}
                  </Text>
                  <Text style={styles.youLabel}>You</Text>
                </View>
                <View style={styles.readyBadge}>
                  <Text style={styles.readyText}>READY</Text>
                </View>
              </Animated.View>
            )}

            {/* Bots appear one by one */}
            {bots.slice(0, visiblePlayers).map((player, index) => (
              <Animated.View
                key={player.id}
                entering={SlideInRight.duration(350).springify().damping(13)}
                style={styles.playerRow}
              >
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.personality}>{player.personality}</Text>
                </View>
                <Animated.View
                  entering={FadeIn.delay(200).duration(200)}
                  style={styles.readyBadge}
                >
                  <Text style={styles.readyText}>JOINED</Text>
                </Animated.View>
              </Animated.View>
            ))}

            {/* Placeholder slots for unrevealed players */}
            {lobbyPhase === 'searching' && Array.from({ length: bots.length - visiblePlayers }).map((_, i) => (
              <Animated.View
                key={`slot-${i}`}
                style={styles.emptySlot}
              >
                <View style={styles.emptySlotDot} />
                <View style={styles.emptySlotDot} />
                <View style={styles.emptySlotDot} />
              </Animated.View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Button */}
      <View style={styles.stickyBottom}>
        {lobbyPhase === 'idle' && (
          <AnimatedPressable
            onPress={handleFindMatch}
            style={[
              styles.startButton,
              !canAfford && styles.startButtonDisabled,
              buttonStyle,
            ]}
          >
            <Text style={styles.startText}>
              {canAfford ? 'FIND MATCH' : 'INSUFFICIENT FUNDS'}
            </Text>
          </AnimatedPressable>
        )}

        {lobbyPhase === 'searching' && (
          <View style={styles.searchingButton}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.searchingButtonText}>MATCHMAKING...</Text>
          </View>
        )}

        {lobbyPhase === 'found' && (
          <AnimatedPressable
            onPress={handleStart}
            entering={FadeIn.duration(300)}
            style={[styles.startButton, buttonStyle]}
          >
            <Text style={styles.startText}>BET ${betAmount} — START</Text>
          </AnimatedPressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  stickyBottom: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentGlow,
    letterSpacing: 6,
    marginTop: -4,
  },
  balanceCard: {
    backgroundColor: COLORS.surface + 'cc',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  balanceMain: {
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  balanceAmount: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  balanceStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.surfaceLight,
  },
  betPoolRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  betCard: {
    flex: 1,
    backgroundColor: COLORS.surface + 'cc',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  betLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  betAmount: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  allFoundText: {
    color: COLORS.alive,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  searchingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  searchingText: {
    color: COLORS.textDim,
    fontSize: 14,
    fontWeight: '600',
  },
  playerSection: {
    marginTop: 4,
  },
  playerList: {
    gap: 3,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.surface + 'cc',
    borderRadius: 8,
  },
  playerRowHuman: {
    backgroundColor: COLORS.surfaceLight + 'dd',
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  playerInfo: {
    flex: 1,
    gap: 2,
  },
  playerName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  playerNameHuman: {
    color: COLORS.accent,
    fontWeight: '800',
  },
  youLabel: {
    color: COLORS.accentGlow,
    fontSize: 9,
    fontWeight: '600',
  },
  personality: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  readyBadge: {
    backgroundColor: COLORS.alive + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  readyText: {
    color: COLORS.alive,
    fontSize: 10,
    fontWeight: '700',
  },
  emptySlot: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.surface + '44',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight + '33',
    borderStyle: 'dashed',
    gap: 6,
  },
  emptySlotDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted + '66',
  },
  startButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginVertical: 8,
  },
  startButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.5,
  },
  startText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  searchingButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 18,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  searchingButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
