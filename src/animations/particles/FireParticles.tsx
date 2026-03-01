// === BOOST Fire Burst Effect ===
import React, { useEffect, useRef, useState } from 'react';
import { ParticleSystem, createParticle, updateParticles } from './ParticleSystem';
import type { Particle } from '../../types';

interface FireParticlesProps {
  x: number;
  y: number;
  active: boolean;
  width: number;
  height: number;
}

const FIRE_COLORS = ['#ff4400', '#ff6600', '#ff8800', '#ffaa00', '#ffcc00'];

export function FireParticles({ x, y, active, width, height }: FireParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame>>(undefined);
  const lastTimeRef = useRef(Date.now());
  const emittedRef = useRef(false);

  useEffect(() => {
    if (active && !emittedRef.current) {
      // Emit burst of fire particles
      const burst: Particle[] = [];
      for (let i = 0; i < 25; i++) {
        const color = FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)];
        burst.push(
          createParticle(x, y, {
            vx: (Math.random() - 0.5) * 6,
            vy: -(Math.random() * 5 + 2),
            life: 0.4 + Math.random() * 0.6,
            size: 3 + Math.random() * 4,
            color,
            spread: 20,
          }),
        );
      }
      setParticles(burst);
      emittedRef.current = true;
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

  if (particles.length === 0) return null;

  return (
    <ParticleSystem
      width={width}
      height={height}
      particles={particles}
      emitting={active}
    />
  );
}
