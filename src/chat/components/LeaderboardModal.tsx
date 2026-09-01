import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { UserXp, xpToNextRank } from '../hooks/useXpSystem';

interface Props {
  visible: boolean;
  leaderboard: UserXp[];
  myXp: UserXp | null;
  onClose: () => void;
}

export default function LeaderboardModal({ visible, leaderboard, myXp, onClose }: Props) {
  const { theme } = useTheme();

  if (!visible) return null;

  const toNext = myXp ? xpToNextRank(myXp.xp) : null;
  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const podiumColors = ['#FEE75C', '#B0B0B0', '#CD7F32'];
  const podiumSizes = [56, 48, 44];
  const podiumOrder = [1, 0, 2]; // Silver, Gold, Bronze display order

  return (
    <View style={styles.backdrop}>
      <View style={[styles.modal, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="trophy" size={20} color="#FEE75C" />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Leaderboard</Text>
          <TouchableOpacity onPress={onClose} style={{ marginLeft: 'auto' }}>
            <Feather name="x" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* My XP Card */}
        {myXp && (
          <View style={[styles.myXpCard, { backgroundColor: theme.bgCard, borderColor: theme.accent }]}>
            <Text style={styles.myRankEmoji}>{myXp.rankEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.myName, { color: theme.textPrimary }]}>{myXp.displayName}</Text>
              <Text style={[styles.myRankName, { color: theme.accent }]}>{myXp.rank}</Text>
              {/* XP Progress bar */}
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.accent,
                      width: `${(toNext?.progress ?? 1) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.myXpText, { color: theme.textMuted }]}>
                {myXp.xp} XP
                {toNext && toNext.needed > 0 ? ` · ${toNext.needed} to ${toNext.next}` : ' · MAX RANK'}
              </Text>
            </View>
          </View>
        )}

        {/* Podium (top 3) */}
        {topThree.length >= 1 && (
          <View style={styles.podium}>
            {podiumOrder.map((pos) => {
              const user = topThree[pos];
              if (!user) return <View key={pos} style={{ flex: 1 }} />;
              return (
                <View key={pos} style={[styles.podiumSlot, { alignItems: 'center' }]}>
                  <Text style={{ fontSize: podiumSizes[pos] * 0.5 }}>{user.rankEmoji}</Text>
                  <Text style={[styles.podiumName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {user.displayName.split(' ')[0]}
                  </Text>
                  <View
                    style={[
                      styles.podiumPillar,
                      {
                        height: pos === 0 ? 60 : pos === 1 ? 40 : 30,
                        backgroundColor: podiumColors[pos],
                      },
                    ]}
                  >
                    <Text style={styles.podiumRank}>{pos + 1}</Text>
                  </View>
                  <Text style={[styles.podiumXp, { color: theme.textMuted }]}>{user.xp} XP</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Rest of leaderboard */}
        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
          {rest.map((user, index) => (
            <View
              key={user.uid}
              style={[
                styles.leaderRow,
                { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle },
                user.uid === myXp?.uid && { borderColor: theme.accent },
              ]}
            >
              <Text style={[styles.leaderPos, { color: theme.textMuted }]}>{index + 4}</Text>
              <Text style={styles.leaderRankEmoji}>{user.rankEmoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.leaderName, { color: theme.textPrimary }]} numberOfLines={1}>
                  {user.displayName}
                </Text>
                <Text style={[styles.leaderRankText, { color: theme.textMuted }]}>{user.rank}</Text>
              </View>
              <Text style={[styles.leaderXp, { color: theme.accent }]}>{user.xp} XP</Text>
            </View>
          ))}
          {leaderboard.length === 0 && (
            <View style={{ alignItems: 'center', padding: 24 }}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No data yet · Start chatting to earn XP!
              </Text>
            </View>
          )}
        </ScrollView>

        {/* XP breakdown legend */}
        <View style={[styles.legend, { backgroundColor: theme.bgCard, borderRadius: 10 }]}>
          <Text style={[styles.legendTitle, { color: theme.textMuted }]}>How to earn XP</Text>
          <View style={styles.legendRow}>
            {[
              { icon: '💬', label: 'Message', xp: '+5' },
              { icon: '❤️', label: 'Reaction', xp: '+2' },
              { icon: '🎤', label: 'Voice/min', xp: '+3' },
              { icon: '🎬', label: 'Host Stage', xp: '+10' },
            ].map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                <Text style={[styles.legendLabel, { color: theme.textMuted }]}>{item.label}</Text>
                <Text style={[styles.legendXp, { color: theme.accent }]}>{item.xp}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 300,
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    paddingBottom: 32,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '900' },

  myXpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
  },
  myRankEmoji: { fontSize: 32 },
  myName: { fontSize: 14, fontWeight: '800' },
  myRankName: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  progressBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 3 },
  progressFill: { height: '100%', borderRadius: 3 },
  myXpText: { fontSize: 10 },

  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  podiumSlot: { flex: 1, gap: 4 },
  podiumName: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  podiumPillar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, alignItems: 'center', justifyContent: 'center' },
  podiumRank: { color: '#000', fontSize: 16, fontWeight: '900' },
  podiumXp: { fontSize: 10, textAlign: 'center' },

  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 5,
  },
  leaderPos: { fontSize: 12, fontWeight: '800', width: 20, textAlign: 'center' },
  leaderRankEmoji: { fontSize: 18 },
  leaderName: { fontSize: 13, fontWeight: '700' },
  leaderRankText: { fontSize: 10 },
  leaderXp: { fontSize: 12, fontWeight: '800' },
  emptyText: { fontSize: 13, textAlign: 'center' },

  legend: { padding: 10, gap: 6 },
  legendTitle: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around' },
  legendItem: { alignItems: 'center', gap: 2 },
  legendLabel: { fontSize: 9 },
  legendXp: { fontSize: 11, fontWeight: '800' },
});
