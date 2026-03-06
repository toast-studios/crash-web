// === Rocket Scene — Web (pure CSS/Reanimated, no Skia) ===
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';

interface RocketSceneProps {
  heat: number;
  elapsed: number;
  width: number;
  height: number;
  isRunning: boolean;
}

export function RocketScene({ heat, elapsed, width: rawWidth, height, isRunning }: RocketSceneProps) {
  const width = Math.floor(rawWidth);

  // Mirror the same position formula as native
  const rocketY = height - 45 - (elapsed * (height - 90)) / 15;
  const cy = Math.min(height - 30, Math.max(30, rocketY));

  const stripeColor = heat > 70 ? '#ff4444' : '#ff6633';
  const noseColor   = heat > 70 ? '#ff4444' : '#ff5533';

  // Rocket vertical position
  const rocketTop = useSharedValue(cy - 38);
  useEffect(() => {
    rocketTop.value = withTiming(cy - 38, { duration: 100 });
  }, [cy]);

  const rocketStyle = useAnimatedStyle(() => ({
    top: rocketTop.value,
    left: width / 2 - 11, // center: body is 22px wide
  }));

  // Flame flicker
  const flameScale  = useSharedValue(1);
  const flameOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRunning) {
      flameOpacity.value = withTiming(1, { duration: 200 });
      flameScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 70 }),
          withTiming(0.85, { duration: 70 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(flameScale);
      flameScale.value = 1;
      flameOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isRunning]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: flameScale.value }],
    opacity: flameOpacity.value * (0.7 + (heat / 100) * 0.3),
  }));

  // Engine glow dims in when heat > 60
  const glowOpacity = useSharedValue(0);
  useEffect(() => {
    glowOpacity.value = withTiming(
      isRunning && heat > 60 ? (heat - 60) / 40 : 0,
      { duration: 150 },
    );
  }, [heat, isRunning]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <Animated.View style={[styles.rocket, rocketStyle]}>

        {/* Nose cone — upward triangle via border trick */}
        <View style={[styles.nose, { borderBottomColor: noseColor }]} />

        {/* Left fin */}
        <View style={[styles.finLeft, { borderTopColor: stripeColor }]} />
        {/* Right fin */}
        <View style={[styles.finRight, { borderTopColor: stripeColor }]} />

        {/* Body */}
        <View style={styles.body}>
          {/* Gradient stripe 1 */}
          <View style={[styles.stripe, { backgroundColor: stripeColor }]} />
          {/* Stripe 2 */}
          <View style={[styles.stripe2, { backgroundColor: stripeColor, opacity: 0.6 }]} />
          {/* Porthole */}
          <View style={styles.windowOuter}>
            <View style={styles.windowInner} />
            {/* Glare */}
            <View style={styles.windowGlare} />
          </View>
        </View>

        {/* Exhaust nozzle */}
        <View style={styles.nozzle} />

        {/* Engine glow */}
        {isRunning && (
          <Animated.View style={[styles.engineGlow, glowStyle]} />
        )}

        {/* Flame */}
        <Animated.View style={[styles.flameWrapper, flameStyle]}>
          {/* Outer orange flame */}
          <View style={styles.flameOuter} />
          {/* Mid yellow flame */}
          <View style={styles.flameMid} />
          {/* Inner white core */}
          <View style={styles.flameCore} />
        </Animated.View>

      </Animated.View>
    </View>
  );
}

const BODY_W  = 22;
const BODY_H  = 40;
const NOSE_H  = 22;
const NOZZLE_H = 8;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'visible',
  },
  rocket: {
    position: 'absolute',
    width: BODY_W,
    alignItems: 'center',
  },

  // ── Nose cone (upward triangle) ──────────────────────────
  nose: {
    width: 0,
    height: 0,
    borderLeftWidth:  BODY_W / 2,
    borderRightWidth: BODY_W / 2,
    borderBottomWidth: NOSE_H,
    borderLeftColor:  'transparent',
    borderRightColor: 'transparent',
    // borderBottomColor set inline (heat-reactive)
    borderStyle: 'solid',
  },

  // ── Body ─────────────────────────────────────────────────
  body: {
    width: BODY_W,
    height: BODY_H,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0.8,
    borderColor: '#bbbbbb',
  },
  stripe: {
    position: 'absolute',
    top: 14,
    left: 2,
    right: 2,
    height: 5,
    borderRadius: 1,
    opacity: 0.9,
  },
  stripe2: {
    position: 'absolute',
    top: 22,
    left: 2,
    right: 2,
    height: 3,
    borderRadius: 1,
  },
  windowOuter: {
    position: 'absolute',
    top: 2,
    left: BODY_W / 2 - 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#223355',
    overflow: 'hidden',
  },
  windowInner: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 5,
    backgroundColor: '#4499dd',
    opacity: 0.8,
  },
  windowGlare: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
    opacity: 0.5,
  },

  // ── Fins (right-triangle via border trick) ────────────────
  // Left fin: points left-down
  finLeft: {
    position: 'absolute',
    top: NOSE_H + 16,   // where fin meets body
    left: -11,          // outside body
    width: 0,
    height: 0,
    borderTopWidth: 18,
    borderRightWidth: 11,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor:  'transparent',
    // borderTopColor set inline
    borderStyle: 'solid',
  },
  // Right fin: points right-down
  finRight: {
    position: 'absolute',
    top: NOSE_H + 16,
    right: -11,
    width: 0,
    height: 0,
    borderTopWidth: 18,
    borderLeftWidth: 11,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderLeftColor:  'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
    // borderTopColor set inline
    borderStyle: 'solid',
  },

  // ── Nozzle ────────────────────────────────────────────────
  nozzle: {
    width: 14,
    height: NOZZLE_H,
    backgroundColor: '#888',
    borderBottomLeftRadius:  2,
    borderBottomRightRadius: 2,
  },

  // ── Engine glow ───────────────────────────────────────────
  engineGlow: {
    position: 'absolute',
    bottom: NOZZLE_H - 4,
    left: BODY_W / 2 - 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff6600',
    opacity: 0,
  },

  // ── Flame ─────────────────────────────────────────────────
  flameWrapper: {
    alignItems: 'center',
    marginTop: -4,
  },
  flameOuter: {
    width: 18,
    height: 24,
    borderRadius: 9,
    backgroundColor: '#ff4400',
    opacity: 0.85,
  },
  flameMid: {
    position: 'absolute',
    top: 4,
    width: 12,
    height: 16,
    borderRadius: 6,
    backgroundColor: '#ffaa00',
    opacity: 0.9,
  },
  flameCore: {
    position: 'absolute',
    top: 8,
    width: 6,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#ffffcc',
    opacity: 0.95,
  },
});
