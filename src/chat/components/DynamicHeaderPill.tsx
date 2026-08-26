import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface Props {
  onlineCount: number;
  voiceCount: number;
  typingUsers: string[];
}

export default function DynamicHeaderPill({ onlineCount, voiceCount, typingUsers }: Props) {
  const { theme } = useTheme();
  const [cycleIndex, setCycleIndex] = useState(0);

  // Auto-cycle through statuses every 4 seconds if no typing
  useEffect(() => {
    if (typingUsers.length > 0) return;

    const interval = setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % (voiceCount > 0 ? 2 : 1));
    }, 4000);

    return () => clearInterval(interval);
  }, [voiceCount, typingUsers.length]);

  // If someone is typing, prioritize typing state immediately
  if (typingUsers.length > 0) {
    return (
      <View style={[styles.pill, { backgroundColor: theme.bgDark, borderColor: '#23A55A' }]}>
        <Feather name="radio" size={10} color="#23A55A" />
        <Text style={[styles.pillText, { color: '#23A55A' }]} numberOfLines={1}>
          {typingUsers[0]} is typing...
        </Text>
      </View>
    );
  }

  // Voice status
  if (voiceCount > 0 && cycleIndex === 1) {
    return (
      <View style={[styles.pill, { backgroundColor: theme.bgDark, borderColor: theme.accent }]}>
        <Feather name="mic" size={10} color={theme.accent} />
        <Text style={[styles.pillText, { color: theme.accent }]}>
          {voiceCount} in Voice Call
        </Text>
      </View>
    );
  }

  // Default Online status
  return (
    <View style={[styles.pill, { backgroundColor: theme.bgDark, borderColor: theme.borderSubtle }]}>
      <View style={styles.onlineDot} />
      <Text style={[styles.pillText, { color: theme.textMuted }]}>
        {onlineCount} Online
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#23A55A',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
