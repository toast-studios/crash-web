// === Rocket Scene — Web (PNG rocket + curved SVG exhaust trail) ===
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Asset } from 'expo-asset';

const rocketModule = require('../../../assets/figma/rocket.png');

const ROCKET_W    = 90;
const ROCKET_H    = 110;
const TRAIL_W     = 380;
const TRAIL_H     = 500;
// Trail origin: overlaps flame area so there's no gap at nozzle
const NOZZLE_Y    = ROCKET_H - 35;
const NOZZLE_CX   = ROCKET_W / 2;   // 45
const NOZZLE_HALF = 8;

interface RocketSceneProps {
  heat: number;
  elapsed: number;
  width: number;
  height: number;
  isRunning: boolean;
}

export function RocketScene({ heat, elapsed, width: rawWidth, height, isRunning }: RocketSceneProps) {
  const width = Math.floor(rawWidth);
  const [rocketUri, setRocketUri] = useState<string | null>(null);

  useEffect(() => {
    Asset.fromModule(rocketModule).downloadAsync().then(a => setRocketUri(a.uri));
  }, []);

  // Static — centered horizontally, upper portion of full screen
  const rocketStyle = useAnimatedStyle(() => ({
    top: height * 0.35 - ROCKET_H / 2,
    left: width * 0.55 - ROCKET_W / 2,
  }));

  // Trail pulse
  const trailOpacity = useSharedValue(0);
  const trailScale   = useSharedValue(1);

  useEffect(() => {
    if (isRunning) {
      trailOpacity.value = withRepeat(
        withSequence(
          withTiming(1,    { duration: 600 }),
          withTiming(0.55, { duration: 600 }),
        ),
        -1,
        true,
      );
      trailScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(0.96, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(trailOpacity);
      cancelAnimation(trailScale);
      trailOpacity.value = withTiming(0, { duration: 300 });
      trailScale.value   = withTiming(1, { duration: 300 });
    }
  }, [isRunning]);

  const heatBoost = 0.55 + (heat / 100) * 0.45;

  const trailStyle = useAnimatedStyle(() => ({
    opacity: trailOpacity.value * heatBoost,
    transform: [{ scaleX: trailScale.value }],
  }));

  // Center the SVG on the rocket nozzle
  const trailLeft = NOZZLE_CX - TRAIL_W / 2; // 45 - 190 = -145

  // Trail top points (narrow at nozzle)
  const cx   = TRAIL_W / 2;          // 190
  const topL = cx - NOZZLE_HALF;     // 172
  const topR = cx + NOZZLE_HALF;     // 208

  // Curved path:
  // - Left edge: straight from nozzle-left → bottom-left
  // - Right edge: quadratic bezier sweeping outward to the right
  //   Control point pushed well outside SVG right boundary for pronounced curve
  const path = [
    `M ${topL} 0`,                                                        // nozzle top-left
    `L 0 ${TRAIL_H}`,                                                     // straight left edge → bottom-left
    `L ${TRAIL_W} ${TRAIL_H}`,                                            // bottom-right
    `Q ${TRAIL_W + TRAIL_W * 0.28} ${TRAIL_H * 0.38} ${topR} 0`,        // curved right edge back up
    'Z',
  ].join(' ');

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      {rocketUri && (
        <Animated.View style={[styles.rocket, rocketStyle]}>

          {/* Curved SVG trail — behind rocket */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: NOZZLE_Y,
                left: trailLeft,
                width: TRAIL_W,
                height: TRAIL_H,
              },
              trailStyle,
            ]}
          >
            <svg
              width={TRAIL_W}
              height={TRAIL_H}
              viewBox={`0 0 ${TRAIL_W} ${TRAIL_H}`}
              style={{ display: 'block', overflow: 'visible' } as React.CSSProperties}
            >
              <defs>
                <linearGradient id="trailGrad" x1="0.5" y1="0" x2="0.5" y2="1">
                  <stop offset="0%"   stopColor="rgba(190,210,255,0.80)" />
                  <stop offset="25%"  stopColor="rgba(155,175,248,0.55)" />
                  <stop offset="60%"  stopColor="rgba(110,140,230,0.22)" />
                  <stop offset="100%" stopColor="rgba(80,110,210,0)" />
                </linearGradient>
              </defs>
              <path d={path} fill="url(#trailGrad)" />
              {/* Nozzle glow — softly bridges rocket exhaust into trail */}
              <ellipse
                cx={cx}
                cy={4}
                rx={NOZZLE_HALF + 10}
                ry={14}
                fill="rgba(210,225,255,0.60)"
              />
            </svg>
          </Animated.View>

          {/* Rocket PNG — above trail */}
          <img
            src={rocketUri}
            alt="rocket"
            style={{
              width: ROCKET_W,
              height: ROCKET_H,
              objectFit: 'contain',
              display: 'block',
              position: 'relative',
              zIndex: 1,
            } as React.CSSProperties}
          />

        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'visible',
  },
  rocket: {
    position: 'absolute',
    width: ROCKET_W,
    alignItems: 'center',
  },
});
