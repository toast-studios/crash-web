// === Heat Progress Bar (Web — prominent pill with diagonal stripes) ===
import React, { useEffect, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';

interface HeatProgressBarProps {
  heat: number; // 0–100
}

const STYLE_ID = 'heat-bar-style';

export function HeatProgressBar({ heat }: HeatProgressBarProps) {
  const { width: W } = useWindowDimensions();
  const fillRef = useRef<HTMLDivElement | null>(null);
  const pct = Math.min(100, Math.max(0, heat));

  // Inject keyframes + styles once
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
        overflow: hidden;
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
    `;
    document.head.appendChild(el);
  }, []);

  return (
    <View style={{ paddingHorizontal: 40, width: '100%' }}>
      <div className="heat-bar-track">
        <div
          ref={fillRef}
          className="heat-bar-fill"
          style={{ width: `${pct}%` }}
        >
          <span className="heat-bar-text">{pct}%</span>
        </div>
      </div>
    </View>
  );
}
