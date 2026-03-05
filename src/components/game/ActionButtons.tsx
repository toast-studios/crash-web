// === COOL / BOOST / EXIT Action Buttons ===
import React, { useCallback } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { COLORS } from '../../constants';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ActionButtonsProps {
  coolUsesLeft: number;
  boostUsesLeft: number;
  playerStatus: 'alive' | 'exited' | 'bust';
  onCool: () => void;
  onBoost: () => void;
  onExit: () => void;
}

interface ActionButtonProps {
  label: string;
  sublabel: string;
  color: string;
  disabled: boolean;
  onPress: () => void;
  flex?: number;
  fireOnPressIn?: boolean;
}

function ActionButton({ label, sublabel, color, disabled, onPress, flex = 1, fireOnPressIn = false }: ActionButtonProps) {
  const scale = useSharedValue(1);

  const triggerAction = useCallback(() => {
    if (disabled) return;
    scale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    // Haptics are handled by parent (GameScreen) for reliability
    onPress();
  }, [disabled, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={fireOnPressIn ? triggerAction : undefined}
      onPress={fireOnPressIn ? undefined : triggerAction}
      style={[
        styles.button,
        {
          flex,
          borderColor: disabled ? COLORS.textMuted : color,
          opacity: disabled ? 0.4 : 1,
        },
        animatedStyle,
      ]}
    >
      <Text style={[styles.buttonLabel, { color: disabled ? COLORS.textMuted : color }]}>
        {label}
      </Text>
      <Text style={[styles.buttonSub, { color: disabled ? COLORS.textMuted : color + '99' }]}>
        {sublabel}
      </Text>
    </AnimatedPressable>
  );
}

export function ActionButtons({
  coolUsesLeft,
  boostUsesLeft,
  playerStatus,
  onCool,
  onBoost,
  onExit,
}: ActionButtonsProps) {
  const isAlive = playerStatus === 'alive';

  return (
    <View style={styles.container}>
      <ActionButton
        label="❄ COOL"
        sublabel={`${coolUsesLeft} left`}
        color={COLORS.cool}
        disabled={!isAlive || coolUsesLeft <= 0}
        onPress={onCool}
      />
      <ActionButton
        label="🔥 BOOST"
        sublabel={`${boostUsesLeft} left`}
        color={COLORS.boost}
        disabled={!isAlive || boostUsesLeft <= 0}
        onPress={onBoost}
      />
      <ActionButton
        label="💰 EXIT"
        sublabel="Lock Score"
        color={COLORS.exit}
        disabled={!isAlive}
        onPress={onExit}
        flex={1.2}
        fireOnPressIn={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  button: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0d20',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
