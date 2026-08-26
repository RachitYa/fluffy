import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PollData } from '../hooks/useMessages';
import { useTheme } from '../hooks/useTheme';

interface Props {
  poll: PollData;
  userUid: string | null;
  onVote: (optionId: string) => void;
  isMe: boolean;
}

export default function PollMessageCard({ poll, userUid, onVote, isMe }: Props) {
  const { theme } = useTheme();

  // Calculate total votes
  const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
      {/* Poll Header */}
      <View style={styles.header}>
        <Feather name="bar-chart-2" size={15} color={theme.accent} />
        <Text style={[styles.questionText, { color: theme.textPrimary }]}>
          {poll.question}
        </Text>
      </View>

      {/* Options List */}
      <View style={styles.optionsList}>
        {poll.options.map((opt) => {
          const voteCount = opt.votes.length;
          const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const hasVoted = userUid ? opt.votes.includes(userUid) : false;

          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.optionRow,
                { borderColor: hasVoted ? theme.accent : theme.borderSubtle },
                hasVoted && { backgroundColor: theme.accentSubtle },
              ]}
              onPress={() => onVote(opt.id)}
              activeOpacity={0.75}
            >
              {/* Animated progress fill */}
              <View
                style={[
                  styles.progressFill,
                  { width: `${percent}%`, backgroundColor: hasVoted ? theme.accent : 'rgba(255,255,255,0.06)' },
                ]}
              />

              <View style={styles.optionContent}>
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.radioCircle,
                      { borderColor: hasVoted ? theme.accent : theme.textMuted },
                      hasVoted && { backgroundColor: theme.accent },
                    ]}
                  >
                    {hasVoted && <Feather name="check" size={10} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.optionText, { color: theme.textPrimary }]}>
                    {opt.text}
                  </Text>
                </View>

                <Text style={[styles.percentText, { color: theme.textMuted }]}>
                  {percent}% ({voteCount})
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textMuted }]}>
          {totalVotes} vote{totalVotes === 1 ? '' : 's'} · Select an option to vote
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    width: '100%',
    minWidth: 220,
    maxWidth: 290,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    opacity: 0.25,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  footer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
