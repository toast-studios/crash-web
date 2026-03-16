// === Scrolling Space Background (Web — CSS animation) ===
import React, { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Asset } from 'expo-asset';

const bgModule = require('../../../assets/figma/space-bg-portrait.png');
const STYLE_ID = 'scrolling-bg-style';

export function ScrollingBackground() {
  const { height: H } = useWindowDimensions();
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    Asset.fromModule(bgModule).downloadAsync().then((asset) => {
      setUri(asset.uri);
    });
  }, []);

  useEffect(() => {
    if (!uri) return;
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = `
      @keyframes scrollUp {
        0%   { transform: translateY(0); }
        100% { transform: translateY(-50%); }
      }
      .scrolling-bg-inner {
        position: absolute;
        top: 0; left: 0;
        width: 100%;
        height: ${H * 2}px;
        animation: scrollUp 20s linear infinite;
        will-change: transform;
      }
      .scrolling-bg-inner img {
        display: block;
        width: 100%;
        height: ${H}px;
        object-fit: cover;
      }
    `;
  }, [uri, H]);

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
      pointerEvents="none"
    >
      {uri && (
        <div className="scrolling-bg-inner">
          <img src={uri} alt="" />
          <img src={uri} alt="" />
        </div>
      )}
    </View>
  );
}
