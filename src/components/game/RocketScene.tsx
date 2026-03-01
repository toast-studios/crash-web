// === Skia Rocket + Flame Particle Trail ===
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Circle,
  BlurMask,
  LinearGradient,
  vec,
  Group,
  RoundedRect,
  Oval,
} from '@shopify/react-native-skia';
import type { Particle } from '../../types';

interface RocketSceneProps {
  heat: number;
  elapsed: number;
  width: number;
  height: number;
  isRunning: boolean;
}

const FLAME_COLORS_INNER = ['#ffffff', '#ffffaa', '#ffee66', '#ffdd33'];
const FLAME_COLORS_OUTER = ['#ff6600', '#ff4400', '#ff8800', '#ffaa00', '#ff2200'];
const SMOKE_COLORS = ['#666666', '#555555', '#444444', '#333333'];

export function RocketScene({ heat, elapsed, width, height, isRunning }: RocketSceneProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame>>(undefined);
  const lastTimeRef = useRef(Date.now());

  const rocketY = height - 45 - (elapsed * (height - 90)) / 15;
  const rocketX = width / 2;
  const cy = Math.min(height - 30, Math.max(30, rocketY));

  useEffect(() => {
    if (!isRunning) {
      setParticles([]);
      return;
    }

    const animate = () => {
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setParticles(prev => {
        const newParticles: Particle[] = [];
        const intensity = heat > 70 ? 6 : heat > 40 ? 4 : 3;

        // Inner bright flame (white/yellow core)
        for (let i = 0; i < Math.ceil(intensity * 0.4); i++) {
          const color = FLAME_COLORS_INNER[Math.floor(Math.random() * FLAME_COLORS_INNER.length)];
          newParticles.push({
            x: rocketX + (Math.random() - 0.5) * 10,
            y: cy + 34,
            vx: (Math.random() - 0.5) * 1,
            vy: 2.5 + Math.random() * 2,
            life: 0.15 + Math.random() * 0.2,
            maxLife: 0.15 + Math.random() * 0.2,
            size: 3 + Math.random() * 3,
            color,
            opacity: 1,
          });
        }

        // Outer fire particles (orange/red)
        for (let i = 0; i < intensity; i++) {
          const color = FLAME_COLORS_OUTER[Math.floor(Math.random() * FLAME_COLORS_OUTER.length)];
          newParticles.push({
            x: rocketX + (Math.random() - 0.5) * 16,
            y: cy + 36,
            vx: (Math.random() - 0.5) * 2.5,
            vy: 2 + Math.random() * 4,
            life: 0.25 + Math.random() * 0.45,
            maxLife: 0.25 + Math.random() * 0.45,
            size: 4 + Math.random() * 7,
            color,
            opacity: 0.9,
          });
        }

        // Smoke trail (fades to grey)
        if (Math.random() < 0.4) {
          const color = SMOKE_COLORS[Math.floor(Math.random() * SMOKE_COLORS.length)];
          newParticles.push({
            x: rocketX + (Math.random() - 0.5) * 12,
            y: cy + 42,
            vx: (Math.random() - 0.5) * 1.5,
            vy: 1.5 + Math.random() * 2,
            life: 0.5 + Math.random() * 0.6,
            maxLife: 0.5 + Math.random() * 0.6,
            size: 5 + Math.random() * 8,
            color,
            opacity: 0.35,
          });
        }

        // Spark particles (small bright dots flying out)
        if (heat > 50 && Math.random() < 0.3) {
          newParticles.push({
            x: rocketX + (Math.random() - 0.5) * 8,
            y: cy + 35,
            vx: (Math.random() - 0.5) * 5,
            vy: 1 + Math.random() * 5,
            life: 0.2 + Math.random() * 0.3,
            maxLife: 0.2 + Math.random() * 0.3,
            size: 1.5 + Math.random() * 2,
            color: '#ffff88',
            opacity: 1,
          });
        }

        const updated = prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * dt * 60,
            y: p.y + p.vy * dt * 60,
            life: p.life - dt,
            size: p.size * (p.color.startsWith('#ff') ? 0.96 : 0.98),
          }))
          .filter(p => p.life > 0);

        return [...updated, ...newParticles].slice(-120);
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = Date.now();
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isRunning, rocketX, cy, heat]);

  // --- Rocket geometry ---
  const bodyW = 22;
  const bodyH = 40;
  const bx = rocketX - bodyW / 2;
  const by = cy - bodyH / 2 + 4;

  // Nose cone (top of rocket — pointed curve)
  const nosePath = `
    M ${rocketX} ${cy - 38}
    Q ${rocketX - 4} ${cy - 26} ${rocketX - 11} ${cy - 16}
    L ${rocketX + 11} ${cy - 16}
    Q ${rocketX + 4} ${cy - 26} ${rocketX} ${cy - 38}
    Z
  `;

  // Left fin
  const leftFinPath = `
    M ${rocketX - 11} ${cy + 16}
    L ${rocketX - 22} ${cy + 34}
    L ${rocketX - 18} ${cy + 34}
    L ${rocketX - 11} ${cy + 24}
    Z
  `;

  // Right fin
  const rightFinPath = `
    M ${rocketX + 11} ${cy + 16}
    L ${rocketX + 22} ${cy + 34}
    L ${rocketX + 18} ${cy + 34}
    L ${rocketX + 11} ${cy + 24}
    Z
  `;

  // Exhaust nozzle
  const nozzlePath = `
    M ${rocketX - 7} ${cy + 24}
    L ${rocketX - 9} ${cy + 32}
    L ${rocketX + 9} ${cy + 32}
    L ${rocketX + 7} ${cy + 24}
    Z
  `;

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas style={{ width, height }}>
        {/* === Flame particles (rendered behind rocket) === */}
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
              <BlurMask blur={p.size > 5 ? 5 : 3} style="normal" />
            </Circle>
          );
        })}

        {isRunning && (
          <Group>
            {/* === Engine glow === */}
            <Circle
              cx={rocketX}
              cy={cy + 32}
              r={18}
              opacity={0.4 + heat * 0.004}
            >
              <LinearGradient
                start={vec(rocketX, cy + 20)}
                end={vec(rocketX, cy + 50)}
                colors={['#ff880088', '#ff440000']}
              />
              <BlurMask blur={14} style="normal" />
            </Circle>

            {/* === Fins (behind body) === */}
            <Path path={leftFinPath} color="#cc3333" />
            <Path path={leftFinPath} color="#aa2222" style="stroke" strokeWidth={0.5} />
            <Path path={rightFinPath} color="#cc3333" />
            <Path path={rightFinPath} color="#aa2222" style="stroke" strokeWidth={0.5} />

            {/* === Exhaust nozzle === */}
            <Path path={nozzlePath}>
              <LinearGradient
                start={vec(rocketX, cy + 24)}
                end={vec(rocketX, cy + 32)}
                colors={['#888888', '#555555']}
              />
            </Path>

            {/* === Main body === */}
            <RoundedRect
              x={bx}
              y={by}
              width={bodyW}
              height={bodyH}
              r={3}
            >
              <LinearGradient
                start={vec(bx, by)}
                end={vec(bx + bodyW, by)}
                colors={['#e8e8e8', '#ffffff', '#d0d0d0']}
              />
            </RoundedRect>

            {/* Body stripe (accent band) */}
            <RoundedRect
              x={bx + 2}
              y={cy + 6}
              width={bodyW - 4}
              height={5}
              r={1}
            >
              <LinearGradient
                start={vec(bx, cy + 6)}
                end={vec(bx + bodyW, cy + 6)}
                colors={[
                  heat > 70 ? '#ff4444' : '#ff6633',
                  heat > 70 ? '#ff6666' : '#ff8855',
                ]}
              />
            </RoundedRect>

            {/* Second stripe */}
            <RoundedRect
              x={bx + 2}
              y={cy + 14}
              width={bodyW - 4}
              height={3}
              r={1}
              color={heat > 70 ? '#ff4444' : '#ff6633'}
              opacity={0.5}
            />

            {/* === Nose cone === */}
            <Path path={nosePath}>
              <LinearGradient
                start={vec(rocketX - 11, cy - 16)}
                end={vec(rocketX, cy - 38)}
                colors={[
                  heat > 70 ? '#ff4444' : '#ff5533',
                  heat > 70 ? '#ff6666' : '#ff7755',
                ]}
              />
            </Path>

            {/* Nose tip highlight */}
            <Circle
              cx={rocketX}
              cy={cy - 33}
              r={2.5}
              color="#ffffff"
              opacity={0.6}
            />

            {/* === Window (porthole) === */}
            <Circle
              cx={rocketX}
              cy={cy - 4}
              r={6}
              color="#223355"
            />
            <Circle
              cx={rocketX}
              cy={cy - 4}
              r={5}
            >
              <LinearGradient
                start={vec(rocketX - 5, cy - 9)}
                end={vec(rocketX + 5, cy + 1)}
                colors={['#66bbff', '#2255aa']}
              />
            </Circle>
            {/* Window glare */}
            <Circle
              cx={rocketX - 1.5}
              cy={cy - 6}
              r={2}
              color="#ffffff"
              opacity={0.5}
            />

            {/* === Body outline === */}
            <RoundedRect
              x={bx}
              y={by}
              width={bodyW}
              height={bodyH}
              r={3}
              color="#bbbbbb"
              style="stroke"
              strokeWidth={0.8}
            />

            {/* === Ambient glow around rocket (heat-dependent) === */}
            {heat > 60 && (
              <Circle
                cx={rocketX}
                cy={cy}
                r={40}
                opacity={(heat - 60) * 0.004}
              >
                <LinearGradient
                  start={vec(rocketX, cy - 40)}
                  end={vec(rocketX, cy + 40)}
                  colors={['#ff440033', '#ff000000']}
                />
                <BlurMask blur={20} style="normal" />
              </Circle>
            )}
          </Group>
        )}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
