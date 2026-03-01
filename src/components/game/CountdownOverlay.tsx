// === Cinematic Countdown Overlay ===
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {
  Canvas,
  Circle,
  BlurMask,
} from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { playSound } from '../../sounds/SoundManager';
import { COLORS } from '../../constants';

interface CountdownOverlayProps {
  onComplete: () => void;
}

function CountdownNumber({ value }: { value: number }) {
  const scale = useSharedValue(2.5);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(-8);

  useEffect(() => {
    // Slam in from large → normal with spring
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 150 });
    rotation.value = withSpring(0, { damping: 14, stiffness: 200 });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.number, animatedStyle]}>
      {value}
    </Animated.Text>
  );
}

function GoText() {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 200 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.goText, animatedStyle]}>
      GO!
    </Animated.Text>
  );
}

function PulseRing({ active, index }: { active: boolean; index: number }) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      const delay = index * 120;
      scale.value = withDelay(delay, withTiming(2.5, { duration: 800, easing: Easing.out(Easing.quad) }));
      opacity.value = withDelay(delay,
        withSequence(
          withTiming(0.6, { duration: 100 }),
          withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) }),
        ),
      );
    } else {
      scale.value = 0.3;
      opacity.value = 0;
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.ring, animatedStyle]} />
  );
}

export function CountdownOverlay({ onComplete }: CountdownOverlayProps) {
  const { width, height } = useWindowDimensions();
  const [count, setCount] = useState(3);
  const [showGo, setShowGo] = useState(false);
  const [ringPulse, setRingPulse] = useState(0); // increments to trigger rings

  // Skia glow behind the number
  const glowOpacity = useSharedValue(0);
  const bgFlash = useSharedValue(0);

  useEffect(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    void playSound('tick');
    triggerGlow();

    const timer1 = setTimeout(() => {
      setCount(2);
      setRingPulse(p => p + 1);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      void playSound('tick');
      triggerGlow();
    }, 1000);

    const timer2 = setTimeout(() => {
      setCount(1);
      setRingPulse(p => p + 1);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      void playSound('tick');
      triggerGlow();
    }, 2000);

    const timer3 = setTimeout(() => {
      setShowGo(true);
      setRingPulse(p => p + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void playSound('go');
      // Flash the background
      bgFlash.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }),
      );
    }, 3000);

    const timer4 = setTimeout(() => {
      onComplete();
    }, 3600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  const triggerGlow = () => {
    glowOpacity.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withTiming(0.2, { duration: 600, easing: Easing.out(Easing.quad) }),
    );
  };

  const bgFlashStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(255, 107, 53, ${bgFlash.value * 0.15})`,
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* BG flash */}
      <Animated.View style={[StyleSheet.absoluteFill, bgFlashStyle]} pointerEvents="none" />

      {/* Skia glow behind number */}
      <Animated.View style={[styles.glowContainer, glowAnimStyle]} pointerEvents="none">
        <Canvas style={{ width: 200, height: 200 }}>
          <Circle cx={100} cy={100} r={80} color={COLORS.accent} opacity={0.4}>
            <BlurMask blur={40} style="normal" />
          </Circle>
        </Canvas>
      </Animated.View>

      {/* Pulse rings */}
      <View style={styles.ringContainer}>
        <PulseRing active={ringPulse > 0} index={0} key={`ring-0-${ringPulse}`} />
        <PulseRing active={ringPulse > 0} index={1} key={`ring-1-${ringPulse}`} />
        <PulseRing active={ringPulse > 0} index={2} key={`ring-2-${ringPulse}`} />
      </View>

      {/* Number or GO */}
      {!showGo ? (
        <CountdownNumber value={count} key={count} />
      ) : (
        <GoText />
      )}

      {/* Sublabel */}
      {!showGo && (
        <Animated.Text
          entering={FadeIn.duration(300)}
          style={styles.label}
        >
          GET READY
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  number: {
    fontSize: 140,
    fontWeight: '900',
    color: COLORS.accent,
    zIndex: 10,
  },
  goText: {
    fontSize: 100,
    fontWeight: '900',
    color: COLORS.alive,
    letterSpacing: 8,
    zIndex: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDim,
    letterSpacing: 6,
    marginTop: 8,
    zIndex: 10,
  },
  glowContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  ringContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
});
