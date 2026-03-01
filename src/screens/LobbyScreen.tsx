// === Pre-Round Lobby Screen with Matchmaking ===
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import Animated, {
  FadeIn,
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
import { TOTAL_PLAYERS } from '../../shared/constants';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type LobbyPhase = 'idle' | 'searching' | 'found';

export function LobbyScreen() {
  const players = useGameStore(s => s.players);
  const pool = useGameStore(s => s.pool);
  const balance = useGameStore(s => s.balance);
  const betAmount = useGameStore(s => s.betAmount);
  const stats = useGameStore(s => s.stats);
  const matchmakingStatus = useGameStore(s => s.matchmakingStatus);
  const joinQueue = useGameStore(s => s.joinQueue);
  const leaveQueue = useGameStore(s => s.leaveQueue);
  const queuePosition = useGameStore(s => s.queuePosition);

  const [lobbyPhase, setLobbyPhase] = useState<LobbyPhase>('idle');
  const [searchText, setSearchText] = useState('Searching for opponents');

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

  // Sync online matchmaking status → lobbyPhase
  useEffect(() => {
    if (matchmakingStatus === 'found') {
      setLobbyPhase('found');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [matchmakingStatus]);

  const handleFindMatch = () => {
    if (!canAfford || lobbyPhase !== 'idle') return;
    buttonScale.value = withSequence(
      withSpring(0.92, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    joinQueue();
    setLobbyPhase('searching');
  };

  const handleCancel = () => {
    leaveQueue();
    setLobbyPhase('idle');
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
                PLAYERS ({players.length}/{TOTAL_PLAYERS})
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
          {lobbyPhase === 'searching' && players.length === 0 && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.searchingContainer}>
              <Animated.Text style={[styles.searchingText, searchPulseStyle]}>
                {searchText}
              </Animated.Text>
              {queuePosition > 0 && (
                <Text style={styles.queuePositionText}>
                  Position in queue: {queuePosition}
                </Text>
              )}
            </Animated.View>
          )}

          <View style={styles.playerList}>
            {/* Show matched players as they arrive from server */}
            {players.map((player) => (
              <Animated.View
                key={player.id}
                entering={SlideInRight.duration(350).springify().damping(13)}
                style={[styles.playerRow, player.id === useGameStore.getState().myPlayerId && styles.playerRowHuman]}
              >
                <View style={styles.playerInfo}>
                  <Text style={[
                    styles.playerName,
                    player.id === useGameStore.getState().myPlayerId && styles.playerNameHuman,
                  ]}>
                    {player.name}
                  </Text>
                  {player.id === useGameStore.getState().myPlayerId && (
                    <Text style={styles.youLabel}>You</Text>
                  )}
                </View>
                <Animated.View
                  entering={FadeIn.delay(200).duration(200)}
                  style={styles.readyBadge}
                >
                  <Text style={styles.readyText}>JOINED</Text>
                </Animated.View>
              </Animated.View>
            ))}

            {/* Placeholder slots for players not yet joined */}
            {lobbyPhase === 'searching' && Array.from({ length: Math.max(0, TOTAL_PLAYERS - players.length) }).map((_, i) => (
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
          <Pressable onPress={handleCancel} style={styles.searchingButton}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.searchingButtonText}>MATCHMAKING...</Text>
          </Pressable>
        )}

        {lobbyPhase === 'found' && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.foundButton}
          >
            <Text style={styles.foundText}>MATCH FOUND — STARTING...</Text>
          </Animated.View>
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
  queuePositionText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
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
  foundButton: {
    backgroundColor: COLORS.alive,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginVertical: 8,
  },
  foundText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
