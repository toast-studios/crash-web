// === Skia Heat Bar with Glow + Shimmer ===
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import {
  Canvas,
  RoundedRect,
  LinearGradient,
  vec,
  BlurMask,
  Rect,
} from '@shopify/react-native-skia';
import { useNumberRoll } from '../../animations/hooks/useNumberRoll';
import { COLORS } from '../../constants';
import { getHeatColor } from '../../engine/HeatEngine';

interface HeatBarProps {
  heat: number;
  width: number;
}

export function HeatBar({ heat, width }: HeatBarProps) {
  const barHeight = 28;
  const padding = 2;
  const innerWidth = (width - padding * 2) * (heat / 100);
  const color = getHeatColor(heat);

  // Gradient colors based on heat level
  const gradientColors = heat < 40
    ? ['#00cc66', '#00ff88']
    : heat < 65
      ? ['#ff8800', '#ffcc00']
      : heat < 85
        ? ['#ff4400', '#ff6600']
        : ['#ff0000', '#ff4444'];

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>HEAT</Text>
        <Text style={[styles.value, { color }]}>{heat.toFixed(1)}%</Text>
      </View>
      <View style={[styles.barOuter, { width, height: barHeight }]}>
        <Canvas style={{ width, height: barHeight }}>
          {/* Background */}
          <RoundedRect
            x={0}
            y={0}
            width={width}
            height={barHeight}
            r={6}
            color="#1a1a2e"
          />
          {/* Fill with gradient */}
          {innerWidth > 0 && (
            <RoundedRect
              x={padding}
              y={padding}
              width={Math.max(0, innerWidth)}
              height={barHeight - padding * 2}
              r={4}
            >
              <LinearGradient
                start={vec(0, 0)}
                end={vec(innerWidth, 0)}
                colors={gradientColors}
              />
            </RoundedRect>
          )}
          {/* Glow overlay on the fill */}
          {innerWidth > 2 && heat > 50 && (
            <RoundedRect
              x={padding}
              y={padding}
              width={Math.max(0, innerWidth)}
              height={barHeight - padding * 2}
              r={4}
              color={color}
              opacity={0.3}
            >
              <BlurMask blur={8} style="normal" />
            </RoundedRect>
          )}
          {/* Shimmer overlay */}
          {innerWidth > 10 && (
            <Rect
              x={innerWidth * 0.6 + padding}
              y={padding + 2}
              width={Math.min(40, innerWidth * 0.3)}
              height={barHeight - padding * 2 - 4}
              color="white"
              opacity={0.15}
            />
          )}
        </Canvas>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
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
    fontVariant: ['tabular-nums'],
  },
  barOuter: {
    borderRadius: 6,
    overflow: 'hidden',
  },
});
