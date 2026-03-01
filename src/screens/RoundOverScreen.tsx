// === Results / Round Over Screen ===
import React from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/useGameStore';
import { ResultsList } from '../components/results/ResultsList';
import { StarField } from '../components/shared/StarField';
import { COLORS } from '../constants';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RoundOverScreen() {
  const players = useGameStore(s => s.players);
  const elapsed = useGameStore(s => s.elapsed);
  const balance = useGameStore(s => s.balance);
  const lastRoundProfit = useGameStore(s => s.lastRoundProfit);
  const betAmount = useGameStore(s => s.betAmount);
  const resetLobby = useGameStore(s => s.resetLobby);
  const myPlayerId = useGameStore(s => s.myPlayerId);

  const buttonScale = useSharedValue(1);

  const human = myPlayerId
    ? players.find(p => p.id === myPlayerId)
    : players.find(p => p.isHuman);
  const humanRank = human?.rank ?? 99;
  const humanPrize = human?.prize ?? 0;
  const humanScore = human?.score ?? 0;
  const isProfit = lastRoundProfit > 0;
  const isBreakEven = lastRoundProfit === 0;

  const handleReset = () => {
    buttonScale.value = withSequence(
      withSpring(0.92, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(resetLobby, 200);
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StarField starCount={50} />
      <View style={styles.container}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={styles.title}>ROUND OVER</Text>
          <Text style={styles.subtitle}>
            Heat reached 100% at {elapsed.toFixed(2)}s
          </Text>
        </Animated.View>

        {/* Profit/Loss Banner */}
        <Animated.View
          entering={FadeIn.delay(150).duration(400)}
          style={[
            styles.profitBanner,
            isProfit && styles.profitBannerWin,
            !isProfit && !isBreakEven && styles.profitBannerLoss,
          ]}
        >
          <Text style={[
            styles.profitAmount,
            isProfit && { color: COLORS.alive },
            !isProfit && !isBreakEven && { color: COLORS.bust },
          ]}>
            {lastRoundProfit >= 0 ? '+' : '-'}${Math.abs(lastRoundProfit)}
          </Text>
          <Text style={styles.profitLabel}>
            {isProfit ? 'PROFIT' : isBreakEven ? 'BREAK EVEN' : 'LOSS'}
          </Text>
        </Animated.View>

        {/* Human Result Summary */}
        <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>YOUR RANK</Text>
            <Text style={[
              styles.summaryValue,
              humanRank === 1 && { color: COLORS.gold },
              humanRank === 2 && { color: COLORS.silver },
              humanRank === 3 && { color: COLORS.bronze },
            ]}>
              #{humanRank}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>SCORE</Text>
            <Text style={styles.summaryValue}>{humanScore.toFixed(2)}s</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>PRIZE</Text>
            <Text style={[
              styles.summaryValue,
              humanPrize > 0 && { color: COLORS.gold },
            ]}>
              ${humanPrize}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowBorder]}>
            <Text style={styles.summaryLabel}>BALANCE</Text>
            <Text style={[styles.summaryValue, { color: COLORS.text }]}>
              ${balance.toLocaleString()}
            </Text>
          </View>
        </Animated.View>

        {/* Full Rankings */}
        <View style={styles.rankingsSection}>
          <Text style={styles.sectionTitle}>RANKINGS</Text>
          <ResultsList players={players} />
        </View>

        {/* Reset Button */}
        <AnimatedPressable
          onPress={handleReset}
          style={[styles.resetButton, buttonStyle]}
        >
          <Text style={styles.resetText}>NEXT ROUND</Text>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.bust,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textDim,
    marginTop: 4,
  },
  profitBanner: {
    marginHorizontal: 20,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginBottom: 8,
  },
  profitBannerWin: {
    backgroundColor: COLORS.alive + '15',
    borderWidth: 1,
    borderColor: COLORS.alive + '30',
  },
  profitBannerLoss: {
    backgroundColor: COLORS.bust + '15',
    borderWidth: 1,
    borderColor: COLORS.bust + '30',
  },
  profitAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textDim,
    fontVariant: ['tabular-nums'],
  },
  profitLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  summary: {
    marginHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    paddingTop: 6,
    marginTop: 2,
  },
  summaryLabel: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  rankingsSection: {
    flex: 1,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginLeft: 20,
    marginBottom: 6,
  },
  resetButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
  },
  resetText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
