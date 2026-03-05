// === Screen Shake Hook ===
import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

/**
 * Camera shake effect when heat > threshold.
 * Returns an animated style to apply to the root game container.
 */
export function useScreenShake(heat: number, threshold: number = 80, disabled: boolean = false) {
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);

  useEffect(() => {
    if (!disabled && heat > threshold) {
      const intensity = ((heat - threshold) / (100 - threshold)) * 4;
      shakeX.value = withRepeat(
        withSequence(
          withTiming(intensity, { duration: 30, easing: Easing.linear }),
          withTiming(-intensity, { duration: 30, easing: Easing.linear }),
          withTiming(0, { duration: 30, easing: Easing.linear }),
        ),
        -1,
        true,
      );
      shakeY.value = withRepeat(
        withSequence(
          withTiming(-intensity * 0.5, { duration: 40, easing: Easing.linear }),
          withTiming(intensity * 0.5, { duration: 40, easing: Easing.linear }),
          withTiming(0, { duration: 40, easing: Easing.linear }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(shakeX);
      cancelAnimation(shakeY);
      shakeX.value = withTiming(0, { duration: 100 });
      shakeY.value = withTiming(0, { duration: 100 });
    }
  }, [heat > threshold, disabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { translateY: shakeY.value },
    ],
  }));

  return animatedStyle;
}
