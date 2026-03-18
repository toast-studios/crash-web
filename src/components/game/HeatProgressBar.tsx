// === Heat Progress Bar (Web — prominent pill with diagonal stripes + BOOM cover) ===
import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Asset } from 'expo-asset';
import { useState } from 'react';

interface HeatProgressBarProps {
  heat: number; // 0–100
}

const STYLE_ID = 'heat-bar-style';
const boomModule = require('../../../assets/figma/boomContainer.png');

export function HeatProgressBar({ heat }: HeatProgressBarProps) {
  const { width: W } = useWindowDimensions();
  const pct = Math.round(Math.min(100, Math.max(0, heat)));
  const hideText = pct >= 95;
  const [boomUri, setBoomUri] = useState<string | null>(null);

  useEffect(() => {
    Asset.fromModule(boomModule).downloadAsync().then(a => setBoomUri(a.uri));
  }, []);

  // Inject styles once
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = `
      .heat-bar-track {
        position: relative;
        width: 100%;
        height: 38px;
        background: #1a0f3a;
        border-radius: 999px;
        overflow: visible;
        box-shadow: inset 0 2px 8px rgba(0,0,0,0.6);
      }
      .heat-bar-fill {
        position: absolute;
        top: 0; left: 0;
        height: 100%;
        border-radius: 999px;
        background:
          repeating-linear-gradient(
            -52deg,
            transparent 0px,
            transparent 14px,
            rgba(0,0,0,0.18) 14px,
            rgba(0,0,0,0.18) 26px
          ),
          linear-gradient(180deg, #ffb347 0%, #ff7c00 55%, #e05a00 100%);
        transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        padding-left: 20px;
        box-sizing: border-box;
        min-width: 72px;
      }
      .heat-bar-text {
        color: #fff;
        font-size: 18px;
        font-weight: 900;
        font-style: italic;
        font-family: "Alumni Sans", sans-serif;
        text-shadow: 1px 1px 4px rgba(0,0,0,0.5);
        white-space: nowrap;
        line-height: 1;
        letter-spacing: -0.5px;
      }
      .boom-text {
        font-family: "Alumni Sans", sans-serif;
        font-weight: 900;
        font-style: italic;
        font-size: 13px;
        background: linear-gradient(180deg, #bd8140 0%, #8b5c28 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1;
        white-space: nowrap;
        letter-spacing: 0.5px;
      }
    `;
    document.head.appendChild(el);
  }, []);

  return (
    <View style={{ paddingHorizontal: 40, width: '100%' }}>
      {/* Wrapper: relative so BOOM container can overlay right edge */}
      <div style={{ position: 'relative' } as React.CSSProperties}>
        <div className="heat-bar-track">
          <div style={{ position: 'absolute', inset: 0, borderRadius: 999, overflow: 'hidden' } as React.CSSProperties}>
            <div
              className="heat-bar-fill"
              style={{ width: `${pct}%` }}
            >
              {!hideText && (
                <span className="heat-bar-text">{pct}%</span>
              )}
            </div>
          </div>
        </div>

        {/* BOOM container — overlaps right end of bar, covers last 5% */}
        {boomUri && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: -12,
              transform: 'translateY(-50%)',
              width: 58,
              height: 52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            } as React.CSSProperties}
          >
            <img
              src={boomUri}
              alt=""
              style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                pointerEvents: 'none',
              } as React.CSSProperties}
            />
            <span className="boom-text" style={{ position: 'relative', zIndex: 1, marginTop: 4 } as React.CSSProperties}>
              BOOM!
            </span>
          </div>
        )}
      </div>
    </View>
  );
}
