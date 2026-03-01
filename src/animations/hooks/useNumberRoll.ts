// === Smooth Number Interpolation Hook ===
import { useEffect } from 'react';
import {
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

/**
 * Smoothly interpolates a number value for display.
 * Returns a shared value that animates toward the target.
 */
export function useNumberRoll(target: number, duration: number = 80) {
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withTiming(target, {
      duration,
      easing: Easing.out(Easing.quad),
    });
  }, [target, duration]);

  return value;
}
