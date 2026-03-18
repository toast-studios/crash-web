// === Action Buttons — Web (hex design) ===
// Layout: COOL | EXIT | HEAT
import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Asset } from 'expo-asset';

const coolModule = require('../../../assets/figma/btn-cool.png');
const exitModule = require('../../../assets/figma/btn-exit.png');
const heatModule = require('../../../assets/figma/btn-heat.png');

interface ActionButtonsProps {
  coolUsesLeft: number;
  boostUsesLeft: number;
  playerStatus: 'alive' | 'exited' | 'bust';
  onCool: () => void;
  onBoost: () => void;
  onExit: () => void;
}

interface HexButtonProps {
  size: number;
  uri: string | null;
  label: string;
  disabled: boolean;
  onPress: () => void;
  count?: number;
  countTop?: string;
  glow?: 'green' | 'yellow' | 'blue';
}

const glowFilters = {
  green:  'drop-shadow(0px 0px 8px rgba(74, 222, 128, 1.0)) drop-shadow(0px 0px 20px rgba(34, 197, 94, 0.7)) drop-shadow(0px 0px 40px rgba(21, 128, 61, 0.4))',
  yellow: 'drop-shadow(0px 0px 8px rgba(255, 210, 60, 1.0)) drop-shadow(0px 0px 20px rgba(255, 160, 20, 0.7)) drop-shadow(0px 0px 40px rgba(220, 100, 0, 0.4))',
  blue:   'drop-shadow(0px 0px 8px rgba(80, 220, 255, 1.0)) drop-shadow(0px 0px 20px rgba(30, 170, 255, 0.7)) drop-shadow(0px 0px 40px rgba(0, 100, 220, 0.4))',
};

function HexButton({ size, uri, label, disabled, onPress, count, countTop = '20%', glow }: HexButtonProps) {
  const handlePress = useCallback(() => {
    if (disabled) return;
    onPress();
  }, [disabled, onPress]);

  return (
    <View style={{
      width: size,
      height: size,
      opacity: disabled ? 0.4 : 1,
      ...(glow ? { filter: glowFilters[glow] } : {}),
    } as any}>
      <Pressable onPressIn={handlePress} style={{ width: '100%', height: '100%' }}>
        {uri ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' } as React.CSSProperties}>
            <img
              src={uri}
              alt={label}
              style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' } as React.CSSProperties}
            />
            {count !== undefined && (
              <div style={{
                position: 'absolute',
                top: countTop,
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#fff',
                fontFamily: '"Alumni Sans", sans-serif',
                fontWeight: 800,
                fontSize: size * 0.2,
                lineHeight: 1,
                pointerEvents: 'none',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                textAlign: 'center',
              } as React.CSSProperties}>
                {count}
              </div>
            )}
          </div>
        ) : null}
      </Pressable>
    </View>
  );
}

export function ActionButtons({ coolUsesLeft, boostUsesLeft, playerStatus, onCool, onBoost, onExit }: ActionButtonsProps) {
  const isAlive = playerStatus === 'alive';
  const [uris, setUris] = useState<{ cool: string | null; exit: string | null; heat: string | null }>({ cool: null, exit: null, heat: null });

  useEffect(() => {
    Promise.all([
      Asset.fromModule(coolModule).downloadAsync(),
      Asset.fromModule(exitModule).downloadAsync(),
      Asset.fromModule(heatModule).downloadAsync(),
    ]).then(([cool, exit, heat]) => {
      setUris({ cool: cool.uri, exit: exit.uri, heat: heat.uri });
    }).catch(() => {});
  }, []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* COOL — top left */}
      <View style={{ position: 'absolute', top: '18%', left: '13%' }}>
        <HexButton size={110} uri={uris.cool} label="COOL" count={coolUsesLeft} disabled={!isAlive || coolUsesLeft <= 0} onPress={onCool} glow="blue" />
      </View>
      {/* HEAT — top right */}
      <View style={{ position: 'absolute', top: '18%', right: '13%' }}>
        <HexButton size={110} uri={uris.heat} label="HEAT" count={boostUsesLeft} countTop="25%" disabled={!isAlive || boostUsesLeft <= 0} onPress={onBoost} glow="yellow" />
      </View>
      {/* CASHOUT — center, lower, overlapping COOL/HEAT */}
      <View style={{ position: 'absolute', top: '42%', left: '50%', transform: [{ translateX: -72 }] }}>
        <HexButton size={145} uri={uris.exit} label="EXIT" disabled={!isAlive} onPress={onExit} glow="green" />
      </View>
    </View>
  );
}
