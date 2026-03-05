// === Core Skia Particle Engine ===
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  Canvas,
  Circle,
  BlurMask,
} from '@shopify/react-native-skia';

const isWeb = Platform.OS === 'web';
import type { Particle } from '../../types';

interface ParticleSystemProps {
  width: number;
  height: number;
  particles: Particle[];
  onTick?: (particles: Particle[]) => Particle[];
  emitting: boolean;
}

/**
 * Generic Skia particle renderer.
 * Takes a list of particles and renders them as glowing circles.
 */
export function ParticleSystem({
  width,
  height,
  particles,
}: ParticleSystemProps) {
  return (
    <Canvas style={{ width, height, position: 'absolute' }} pointerEvents="none">
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
            {!isWeb && <BlurMask blur={3} style="normal" />}
          </Circle>
        );
      })}
    </Canvas>
  );
}

/**
 * Utility: create a new particle.
 */
export function createParticle(
  x: number,
  y: number,
  options: {
    vx?: number;
    vy?: number;
    life?: number;
    size?: number;
    color?: string;
    spread?: number;
  } = {},
): Particle {
  const spread = options.spread ?? 2;
  return {
    x: x + (Math.random() - 0.5) * spread,
    y: y + (Math.random() - 0.5) * spread,
    vx: options.vx ?? (Math.random() - 0.5) * 3,
    vy: options.vy ?? -(Math.random() * 3 + 1),
    life: options.life ?? 0.5 + Math.random() * 0.5,
    maxLife: options.life ?? 0.5 + Math.random() * 0.5,
    size: options.size ?? 2 + Math.random() * 3,
    color: options.color ?? '#ff6600',
    opacity: 0.8 + Math.random() * 0.2,
  };
}

/**
 * Utility: update particles for one frame.
 */
export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * dt * 60,
      y: p.y + p.vy * dt * 60,
      life: p.life - dt,
      vy: p.vy + 0.05 * dt * 60, // gravity
    }))
    .filter(p => p.life > 0);
}
