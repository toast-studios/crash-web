// === COOL Ice Burst Effect ===
import React, { useEffect, useRef, useState } from 'react';
import { ParticleSystem, createParticle, updateParticles } from './ParticleSystem';
import type { Particle } from '../../types';

interface IceParticlesProps {
  x: number;
  y: number;
  active: boolean;
  width: number;
  height: number;
}

const ICE_COLORS = ['#00ccff', '#44ddff', '#88eeff', '#aaf4ff', '#ffffff'];

export function IceParticles({ x, y, active, width, height }: IceParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame>>(undefined);
  const lastTimeRef = useRef(Date.now());
  const emittedRef = useRef(false);

  useEffect(() => {
    if (active && !emittedRef.current) {
      // Emit burst of ice/frost particles — drift downward
      const burst: Particle[] = [];
      for (let i = 0; i < 30; i++) {
        const color = ICE_COLORS[Math.floor(Math.random() * ICE_COLORS.length)];
        burst.push(
          createParticle(x, y, {
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 2 + 0.5, // drift down for frost feel
            life: 0.5 + Math.random() * 0.8,
            size: 2 + Math.random() * 3,
            color,
            spread: 30,
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

      // Ice particles have less gravity (float/drift)
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * dt * 60 + Math.sin(p.life * 10) * 0.3, // sway
            y: p.y + p.vy * dt * 60,
            life: p.life - dt,
          }))
          .filter(p => p.life > 0),
      );
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
