// === Staggered Animated Rank Cards List ===
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { Player } from '../../types';
import { RankCard } from './RankCard';

interface ResultsListProps {
  players: Player[];
}

export function ResultsList({ players }: ResultsListProps) {
  // Players should already be sorted by rank from the store
  const sorted = [...players].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {sorted.map((player, index) => (
        <RankCard key={player.id} player={player} index={index} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 8,
  },
});
