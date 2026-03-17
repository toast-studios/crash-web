// === Scrolling Space Background (Web — rAF driven, heat-reactive) ===
import React, { useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Asset } from 'expo-asset';
import { useGameStore } from '../../store/useGameStore';

const bgModule = require('../../../assets/figma/space-bg-portrait.png');

const MIN_SPEED = 30;  // px/s at heat=0
const MAX_SPEED = 120; // px/s at heat=100

export function ScrollingBackground() {
  const { height: H } = useWindowDimensions();
  const [uri, setUri] = useState<string | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const heat = useGameStore(s => s.heat);
  const heatRef = useRef(heat);

  // Keep heatRef in sync without restarting the rAF loop
  useEffect(() => {
    heatRef.current = heat;
  }, [heat]);

  useEffect(() => {
    Asset.fromModule(bgModule).downloadAsync().then((asset) => {
      setUri(asset.uri);
    });
  }, []);

  // Start rAF loop once image is ready
  useEffect(() => {
    if (!uri || !innerRef.current) return;

    const totalHeight = H * 2;

    function tick(timestamp: number) {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = timestamp;

      const speed = MIN_SPEED + (heatRef.current / 100) * (MAX_SPEED - MIN_SPEED);
      posRef.current = (posRef.current + speed * delta) % H;

      if (innerRef.current) {
        innerRef.current.style.transform = `translateY(-${posRef.current}px)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, [uri, H]);

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
      pointerEvents="none"
    >
      {uri && (
        <div
          ref={innerRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            willChange: 'transform',
          } as React.CSSProperties}
        >
          <img src={uri} alt="" style={{ display: 'block', width: '100%', height: H, objectFit: 'cover' } as React.CSSProperties} />
          <img src={uri} alt="" style={{ display: 'block', width: '100%', height: H, objectFit: 'cover' } as React.CSSProperties} />
        </div>
      )}
    </View>
  );
}
