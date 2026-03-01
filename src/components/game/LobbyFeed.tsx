// === Live Player Status Table / Feed ===
import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  Layout,
} from 'react-native-reanimated';
import type { Player, FeedMessage } from '../../types';
import { Badge } from '../shared/Badge';
import { COLORS } from '../../constants';

interface LobbyFeedProps {
  players: Player[];
  feedMessages: FeedMessage[];
  showFeed?: boolean;
}

const actionColors: Record<string, string> = {
  cool: COLORS.cool,
  boost: COLORS.boost,
  exit: COLORS.exited,
  bust: COLORS.bust,
};

const actionLabels: Record<string, string> = {
  cool: 'used COOL',
  boost: 'used BOOST',
  exit: 'EXITED',
  bust: 'BUST!',
};

export function LobbyFeed({ players, feedMessages, showFeed = true }: LobbyFeedProps) {
  const aliveCount = players.filter(p => p.status === 'alive').length;
  const exitedCount = players.filter(p => p.status === 'exited').length;

  return (
    <View style={styles.container}>
      {/* Header stats */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          <Text style={{ color: COLORS.alive }}>{aliveCount}</Text> alive
          {'  '}
          <Text style={{ color: COLORS.exited }}>{exitedCount}</Text> exited
        </Text>
      </View>

      {/* Player list */}
      <View style={styles.playerList}>
        {players.map((player, index) => (
          <View
            key={player.id}
            style={[
              styles.playerRow,
              player.isHuman && styles.playerRowHuman,
            ]}
          >
            <Text
              style={[
                styles.playerName,
                player.isHuman && styles.playerNameHuman,
              ]}
              numberOfLines={1}
            >
              {player.name}
            </Text>
            <Badge status={player.status} small />
          </View>
        ))}
      </View>

      {/* Feed messages */}
      {showFeed && feedMessages.length > 0 && (
        <ScrollView style={styles.feed} nestedScrollEnabled>
          {feedMessages.slice(0, 8).map((msg) => (
            <Animated.View
              key={msg.id}
              entering={FadeIn.duration(200)}
              style={styles.feedRow}
            >
              <Text style={styles.feedTime}>{msg.time.toFixed(1)}s</Text>
              <Text style={styles.feedText}>
                <Text style={{ fontWeight: '700' }}>{msg.playerName}</Text>
                {' '}
                <Text style={{ color: actionColors[msg.action] }}>
                  {actionLabels[msg.action]}
                </Text>
              </Text>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 6,
  },
  header: {
    paddingHorizontal: 8,
  },
  headerText: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  playerList: {
    gap: 2,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  playerRowHuman: {
    backgroundColor: '#ffffff0a',
  },
  playerName: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  playerNameHuman: {
    color: COLORS.text,
    fontWeight: '700',
  },
  feed: {
    maxHeight: 120,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#ffffff10',
    paddingTop: 4,
  },
  feedRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  feedTime: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    width: 32,
  },
  feedText: {
    color: COLORS.textDim,
    fontSize: 11,
    flex: 1,
  },
});
