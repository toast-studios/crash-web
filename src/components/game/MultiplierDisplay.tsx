// === Large Rolling Multiplier Display ===
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { useNumberRoll } from '../../animations/hooks/useNumberRoll';
import { COLORS } from '../../constants';
import { getHeatColor } from '../../engine/HeatEngine';

interface MultiplierDisplayProps {
  elapsed: number;
  heat: number;
  playerStatus: 'alive' | 'exited' | 'bust';
  exitTime: number | null;
}

export function MultiplierDisplay({
  elapsed,
  heat,
  playerStatus,
  exitTime,
}: MultiplierDisplayProps) {
  const displayValue = playerStatus === 'exited' && exitTime !== null
    ? exitTime
    : elapsed;

  const animatedValue = useNumberRoll(displayValue, 60);

  const displayText = useDerivedValue(() => {
    return animatedValue.value.toFixed(2) + 's';
  });

  const color = playerStatus === 'exited'
    ? COLORS.exited
    : playerStatus === 'bust'
      ? COLORS.bust
      : getHeatColor(heat);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {playerStatus === 'exited' ? 'LOCKED' : playerStatus === 'bust' ? 'BUST' : 'TIME'}
      </Text>
      <Animated.Text style={[styles.value, { color }]}>
        {displayValue.toFixed(2)}s
      </Animated.Text>
      {playerStatus === 'alive' && (
        <Text style={styles.sublabel}>SURVIVE TO SCORE</Text>
      )}
      {playerStatus === 'exited' && (
        <Text style={[styles.sublabel, { color: COLORS.exited }]}>SCORE LOCKED</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
  },
  value: {
    fontSize: 56,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  sublabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 2,
  },
});
