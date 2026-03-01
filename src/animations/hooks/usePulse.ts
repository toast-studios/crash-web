// === Pulsing Glow Effect Hook ===
import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

/**
 * Creates a pulsing opacity/scale effect.
 * Great for glowing elements, alerts, and attention-grabbing UI.
 */
export function usePulse(active: boolean, speed: number = 600) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: speed, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: speed, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [active, speed]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return { pulse, animatedStyle };
}
