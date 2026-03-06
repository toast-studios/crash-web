// === Heat Bar — Web (no Skia) ===
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { COLORS } from '../../constants';
import { getHeatColor } from '../../engine/HeatEngine';

interface HeatBarProps {
  heat: number;
  width: number;
}

export function HeatBar({ heat, width }: HeatBarProps) {
  const barHeight = 28;
  const padding = 2;
  const fillWidth = Math.max(0, (width - padding * 2) * (heat / 100));
  const color = getHeatColor(heat);

  const backgroundColor = heat < 40
    ? '#00cc66'
    : heat < 65
      ? '#ff8800'
      : heat < 85
        ? '#ff4400'
        : '#ff0000';

  const fillStyle = useAnimatedStyle(() => ({
    width: withTiming(fillWidth, { duration: 80 }),
    backgroundColor,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>HEAT</Text>
        <Text style={[styles.value, { color }]}>{heat.toFixed(1)}%</Text>
      </View>
      <View style={[styles.barOuter, { width, height: barHeight, backgroundColor: '#1a1a2e', borderRadius: 6 }]}>
        <Animated.View style={[styles.fill, { height: barHeight - padding * 2, top: padding, left: padding, borderRadius: 4 }, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  label: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  value: {
    fontSize: 14,
    fontWeight: '800',
  },
  barOuter: {
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
  },
});
