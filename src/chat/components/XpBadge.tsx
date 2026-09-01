import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getRankForXp } from '../hooks/useXpSystem';

interface Props {
  xp: number;
  size?: 'sm' | 'md';
}

export default function XpBadge({ xp, size = 'sm' }: Props) {
  const { rankEmoji, rank } = getRankForXp(xp);
  const isMd = size === 'md';

  return (
    <View style={[styles.badge, isMd && styles.badgeMd]}>
      <Text style={[styles.emoji, isMd && styles.emojiMd]}>{rankEmoji}</Text>
      {isMd && <Text style={styles.rankLabel}>{rank}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  badgeMd: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  emoji: { fontSize: 11 },
  emojiMd: { fontSize: 14 },
  rankLabel: {
    color: '#949BA4',
    fontSize: 10,
    fontWeight: '700',
  },
});
