// === Prize Pool Display ===
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants';

interface PoolDisplayProps {
  pool: number;
}

export function PoolDisplay({ pool }: PoolDisplayProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>PRIZE POOL</Text>
      <Text style={styles.amount}>${pool}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 8,
  },
  label: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  amount: {
    color: COLORS.gold,
    fontSize: 22,
    fontWeight: '800',
  },
});
