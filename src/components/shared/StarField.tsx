// === Animated Star Field Background ===
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Circle,
  BlurMask,
} from '@shopify/react-native-skia';

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  speed: number; // drift speed
  twinkleSpeed: number; // how fast it pulses
  twinkleOffset: number; // phase offset
}

interface StarFieldProps {
  starCount?: number;
  /** Extra intensity (0-1) to make stars brighter/more visible */
  intensity?: number;
}

function generateStars(count: number, width: number, height: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 0.5 + Math.random() * 1.8,
      baseOpacity: 0.15 + Math.random() * 0.5,
      speed: 0.02 + Math.random() * 0.08,
      twinkleSpeed: 0.5 + Math.random() * 2,
      twinkleOffset: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

export function StarField({ starCount = 60, intensity = 0 }: StarFieldProps) {
  const { width, height } = useWindowDimensions();
  const starsRef = useRef<Star[]>(generateStars(starCount, width, height));
  const [frame, setFrame] = useState(0);
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame>>(undefined);
  const timeRef = useRef(0);

  useEffect(() => {
    const animate = () => {
      timeRef.current += 1 / 60;
      setFrame(f => f + 1);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Update star positions (slow upward drift)
  const renderedStars = useMemo(() => {
    const t = timeRef.current;
    return starsRef.current.map((star, i) => {
      const y = (star.y - star.speed * t * 60) % height;
      const wrappedY = y < 0 ? y + height : y;
      const twinkle = Math.sin(t * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
      const opacity = Math.min(1, star.baseOpacity * twinkle + intensity * 0.2);
      return { ...star, y: wrappedY, opacity, key: i };
    });
  }, [frame, height, intensity]);

  return (
    <Canvas style={[StyleSheet.absoluteFill, { zIndex: -1 }]} pointerEvents="none">
      {renderedStars.map((star) => (
        <Circle
          key={star.key}
          cx={star.x}
          cy={star.y}
          r={star.size}
          color="white"
          opacity={star.opacity}
        />
      ))}
      {/* A few bigger "bright" stars with glow */}
      {renderedStars.filter((_, i) => i < 8).map((star) => (
        <Circle
          key={`glow-${star.key}`}
          cx={star.x}
          cy={star.y}
          r={star.size * 3}
          color="white"
          opacity={star.opacity * 0.15}
        >
          <BlurMask blur={6} style="normal" />
        </Circle>
      ))}
    </Canvas>
  );
}
