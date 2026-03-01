// === Status Badge Component ===
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { PlayerStatus } from '../../types';
import { COLORS } from '../../constants';

interface BadgeProps {
  status: PlayerStatus;
  small?: boolean;
}

const statusConfig: Record<PlayerStatus, { label: string; bg: string; text: string }> = {
  alive: { label: 'ALIVE', bg: COLORS.alive + '33', text: COLORS.alive },
  exited: { label: 'EXITED', bg: COLORS.exited + '33', text: COLORS.exited },
  bust: { label: 'BUST', bg: COLORS.bust + '33', text: COLORS.bust },
};

export function Badge({ status, small }: BadgeProps) {
  const scale = useSharedValue(0);
  const config = statusConfig[status];

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        small && styles.badgeSmall,
        animatedStyle,
      ]}
    >
      <Animated.Text
        style={[
          styles.text,
          { color: config.text },
          small && styles.textSmall,
        ]}
      >
        {config.label}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeSmall: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textSmall: {
    fontSize: 9,
  },
});
