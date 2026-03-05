// === Round-End Explosion Effect ===
import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  Canvas,
  Circle,
  BlurMask,
  Rect,
} from '@shopify/react-native-skia';

const isWeb = Platform.OS === 'web';
import type { Particle } from '../../types';
import { createParticle, updateParticles } from './ParticleSystem';

interface ExplosionEffectProps {
  active: boolean;
  width: number;
  height: number;
}

const EXPLOSION_COLORS = ['#ff0000', '#ff3300', '#ff6600', '#ffaa00', '#ff4444', '#ffffff'];

export function ExplosionEffect({ active, width, height }: ExplosionEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flash, setFlash] = useState(0);
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame>>(undefined);
  const lastTimeRef = useRef(Date.now());
  const emittedRef = useRef(false);

  useEffect(() => {
    if (active && !emittedRef.current) {
      const cx = width / 2;
      const cy = height / 2;

      // Large radial burst
      const burst: Particle[] = [];
      for (let i = 0; i < 60; i++) {
        const angle = (Math.PI * 2 * i) / 60 + Math.random() * 0.3;
        const speed = 3 + Math.random() * 8;
        const color = EXPLOSION_COLORS[Math.floor(Math.random() * EXPLOSION_COLORS.length)];
        burst.push(
          createParticle(cx, cy, {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.8 + Math.random() * 1.2,
            size: 4 + Math.random() * 6,
            color,
            spread: 10,
          }),
        );
      }
      setParticles(burst);
      setFlash(1);
      emittedRef.current = true;

      // Fade flash
      setTimeout(() => setFlash(0), 150);
    }

    if (!active) {
      emittedRef.current = false;
    }
  }, [active]);

  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setParticles(prev => updateParticles(prev, dt));
      frameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = Date.now();
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [particles.length > 0]);

  if (particles.length === 0 && flash === 0) return null;

  return (
    <Canvas
      style={{
        width,
        height,
        position: 'absolute',
        top: 0,
        left: 0,
      }}
      pointerEvents="none"
    >
      {/* White flash overlay */}
      {flash > 0 && (
        <Rect x={0} y={0} width={width} height={height} color="white" opacity={flash * 0.7} />
      )}
      {/* Explosion particles */}
      {particles.map((p, i) => {
        const alpha = p.opacity * (p.life / p.maxLife);
        if (alpha <= 0) return null;
        return (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.size * (p.life / p.maxLife)}
            color={p.color}
            opacity={alpha}
          >
            {!isWeb && <BlurMask blur={4} style="normal" />}
          </Circle>
        );
      })}
    </Canvas>
  );
}
