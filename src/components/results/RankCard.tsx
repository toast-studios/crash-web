// === Individual Player Result Card ===
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import type { Player } from '../../types';
import { COLORS } from '../../constants';

interface RankCardProps {
  player: Player;
  index: number; // for stagger delay
}

const rankColors = [COLORS.gold, COLORS.silver, COLORS.bronze];

export function RankCard({ player, index }: RankCardProps) {
  const translateX = useSharedValue(300);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 120;
    translateX.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 120 }));
    opacity.value = withDelay(delay, withSpring(1));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const isTop3 = player.rank !== null && player.rank <= 3;
  const rankColor = isTop3 ? rankColors[(player.rank ?? 1) - 1] : COLORS.textMuted;
  const isBust = player.status === 'bust';

  return (
    <Animated.View style={[styles.card, animatedStyle, isBust && styles.cardBust]}>
      <View style={styles.rankSection}>
        <Text style={[styles.rank, { color: rankColor }]}>
          #{player.rank}
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text
          style={[
            styles.name,
            player.isHuman && styles.nameHuman,
            isBust && styles.textBust,
          ]}
          numberOfLines={1}
        >
          {player.name}
        </Text>
        <Text style={[styles.score, isBust && styles.textBust]}>
          {player.status === 'exited'
            ? `${player.score.toFixed(2)}s`
            : 'BUST'}
          {player.boostCount > 0 && (
            <Text style={styles.boostInfo}> (+{player.boostCount} boost)</Text>
          )}
        </Text>
      </View>

      <View style={styles.prizeSection}>
        {player.prize > 0 ? (
          <Text style={[styles.prize, { color: rankColor }]}>
            ${player.prize}
          </Text>
        ) : (
          <Text style={styles.noPrize}>$0</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginVertical: 3,
  },
  cardBust: {
    opacity: 0.6,
    backgroundColor: COLORS.surface + '80',
  },
  rankSection: {
    width: 36,
  },
  rank: {
    fontSize: 18,
    fontWeight: '900',
  },
  infoSection: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  nameHuman: {
    color: COLORS.accent,
    fontWeight: '800',
  },
  score: {
    color: COLORS.textDim,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  boostInfo: {
    color: COLORS.boost,
    fontSize: 10,
  },
  textBust: {
    color: COLORS.textMuted,
  },
  prizeSection: {
    alignItems: 'flex-end',
    width: 60,
  },
  prize: {
    fontSize: 20,
    fontWeight: '900',
  },
  noPrize: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
