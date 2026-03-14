// === Action Buttons — Web (CSS clip-path hexagons, Figma 514:118 panel container) ===
import React, { useCallback } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

const techTextureUri: string = require('../../assets/tech_texture.png') as string;

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

// Figma: COOL ~104px, CASHOUT ~137px
const SM_W = 108;
const SM_H = Math.round(Math.sqrt(3) * SM_W / 2);
const LG_W = 138;
const LG_H = Math.round(Math.sqrt(3) * LG_W / 2);

const HEX_CLIP = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';

const BUTTON_CONFIGS = {
  cool: {
    // Figma: sky-blue glass
    gradient: 'linear-gradient(160deg, #a8e4f7 0%, #5ab8e8 40%, #2f86c8 100%)',
    glowColor: 'rgba(90,184,232,0.55)',
    highlight: 'radial-gradient(ellipse 60% 55% at 50% 28%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 100%)',
    labelColor: '#1a5c8a',
    labelGlow: '0 0 8px rgba(100,210,255,0.8)',
    countColor: '#ffffff',
    countGlow: '0 0 8px rgba(0,150,220,0.9)',
  },
  heat: {
    // Figma: amber/gold
    gradient: 'linear-gradient(160deg, #ffe580 0%, #ffc837 40%, #e07b00 100%)',
    glowColor: 'rgba(255,180,0,0.55)',
    highlight: 'radial-gradient(ellipse 60% 55% at 50% 28%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
    labelColor: '#7a3e00',
    labelGlow: '0 0 8px rgba(255,160,0,0.8)',
    countColor: '#ffffff',
    countGlow: '0 0 8px rgba(200,100,0,0.9)',
  },
  cashout: {
    // Figma: lime green glass
    gradient: 'linear-gradient(160deg, #c5f080 0%, #7ed957 40%, #3eae32 100%)',
    glowColor: 'rgba(100,210,80,0.55)',
    highlight: 'radial-gradient(ellipse 60% 55% at 50% 28%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)',
    labelColor: '#1a4a10',
    labelGlow: '0 0 8px rgba(80,200,60,0.8)',
    countColor: '#ffffff',
    countGlow: '0 0 8px rgba(30,130,20,0.9)',
  },
};

interface HexButtonProps {
  variant: 'cool' | 'heat' | 'cashout';
  label: string;
  count?: number;
  disabled: boolean;
  onPress: () => void;
  size?: 'sm' | 'lg';
}

function HexButton({ variant, label, count, disabled, onPress, size = 'sm' }: HexButtonProps) {
  const w = size === 'lg' ? LG_W : SM_W;
  const h = size === 'lg' ? LG_H : SM_H;
  const cfg = BUTTON_CONFIGS[variant];

  const scale = useSharedValue(1);
  const triggerAction = useCallback(() => {
    if (disabled) return;
    scale.value = withSequence(
      withSpring(0.88, { damping: 15, stiffness: 450 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    onPress();
  }, [disabled, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ width: w, height: h }, animatedStyle]}>
      {/* Outer glow using native div */}
      {!disabled && (
        <div
          style={{
            position: 'absolute',
            inset: '-6px',
            clipPath: HEX_CLIP,
            background: cfg.glowColor,
            filter: 'blur(8px)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Hex background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: HEX_CLIP,
          background: disabled
            ? 'linear-gradient(180deg, #3d3d5c 0%, #2a2a44 100%)'
            : cfg.gradient,
          opacity: disabled ? 0.55 : 1,
        }}
      />

      {/* Inner edge shadow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: HEX_CLIP,
          boxShadow: disabled
            ? 'inset 0px -4px 0px rgba(0,0,0,0.25)'
            : 'inset 0px -6px 0px rgba(0,0,0,0.25), inset 0px 3px 0px rgba(255,255,255,0.3)',
          pointerEvents: 'none',
        }}
      />

      {/* Gel/glass circular highlight — Figma's sphere-like button look */}
      {!disabled && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: HEX_CLIP,
            background: cfg.highlight,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Text content */}
      <View style={[StyleSheet.absoluteFill, styles.hexContent]}>
        {count !== undefined && (
          <Text
            style={[
              styles.hexCount,
              {
                color: disabled ? '#555570' : cfg.countColor,
                // @ts-ignore
                textShadow: disabled ? 'none' : cfg.countGlow,
              },
            ]}
          >
            {count}
          </Text>
        )}
        <Text
          style={[
            styles.hexLabel,
            {
              fontSize: size === 'lg' ? 18 : 14,
              color: disabled ? '#44445a' : cfg.labelColor,
              // @ts-ignore
              textShadow: disabled ? 'none' : cfg.labelGlow,
            },
          ]}
        >
          {label}
        </Text>
      </View>

      <Pressable style={StyleSheet.absoluteFill} onPressIn={triggerAction} disabled={disabled} />
    </Animated.View>
  );
}

interface ActionButtonsProps {
  coolUsesLeft: number;
  boostUsesLeft: number;
  playerStatus: 'alive' | 'exited' | 'bust';
  onCool: () => void;
  onBoost: () => void;
  onExit: () => void;
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
    <div
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#0d092e',
        borderTopLeftRadius: 48,
        borderTopRightRadius: 48,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        overflow: 'hidden',
        boxShadow: '0px -25px 141.3px 0px #6e24ed, inset 0px -5px 0px 0px #25006d, inset 0px 30px 59.1px 0px rgba(110,36,237,0.3), inset 0px 6px 0px 0px rgba(130,58,255,0.6)',
      }}
    >
      {/* Tech texture overlay — Figma: mix-blend-mode color-dodge, 52% opacity */}
      <img
        src={techTextureUri}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.52,
          mixBlendMode: 'color-dodge',
          pointerEvents: 'none',
        } as React.CSSProperties}
      />

      {/* Top glow line */}
      <div style={{ alignSelf: 'center', width: 238, height: 1, margin: '8px auto 4px', backgroundColor: '#bf9aff', opacity: 0.5 }} />

      <View style={styles.wrapper}>
        <Text style={styles.dashboardLabel}>DASHBOARD</Text>
        <View style={styles.row}>
          <Text style={styles.arrow}>{'»'}</Text>
          <HexButton
            variant="cool"
            label="COOL"
            count={coolUsesLeft}
            disabled={!isAlive || coolUsesLeft <= 0}
            onPress={onCool}
          />
          <HexButton
            variant="cashout"
            label="CASHOUT"
            disabled={!isAlive}
            onPress={onExit}
            size="lg"
          />
          <HexButton
            variant="heat"
            label="HEAT"
            count={boostUsesLeft}
            disabled={!isAlive || boostUsesLeft <= 0}
            onPress={onBoost}
          />
          <Text style={styles.arrow}>{'«'}</Text>
        </View>
      </View>
    </div>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingBottom: 12,
    paddingTop: 4,
  },
  dashboardLabel: {
    color: '#9ab2ff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    opacity: 0.47,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrow: {
    color: '#444466',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -3,
    marginHorizontal: 2,
  },
  hexContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  hexCount: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  hexLabel: {
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
});
