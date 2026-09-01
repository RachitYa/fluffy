import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface Props {
  onlineCount: number;
  voiceCount: number;
  typingUsers: string[];
  stageCount?: number;
  activeStageTitle?: string | null;
  onStagePillPress?: () => void;
}

export default function DynamicHeaderPill({
  onlineCount,
  voiceCount,
  typingUsers,
  stageCount = 0,
  activeStageTitle = null,
  onStagePillPress,
}: Props) {
  const { theme } = useTheme();
  const [cycleIndex, setCycleIndex] = useState(0);

  const statuses = ['online', ...(voiceCount > 0 ? ['voice'] : []), ...(stageCount > 0 ? ['stage'] : [])];

  useEffect(() => {
    if (typingUsers.length > 0) return;
    const interval = setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % statuses.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [statuses.length, typingUsers.length]);

  // Typing — highest priority
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

  const currentStatus = statuses[cycleIndex % statuses.length];

  // Active stage indicator
  if (currentStatus === 'stage' && stageCount > 0) {
    return (
      <TouchableOpacity
        style={[styles.pill, { backgroundColor: '#1A0E1F', borderColor: '#FF6B6B' }]}
        onPress={onStagePillPress}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="theater" size={10} color="#FF6B6B" />
        <Text style={[styles.pillText, { color: '#FF6B6B' }]} numberOfLines={1}>
          {stageCount === 1 && activeStageTitle
            ? `🎬 ${activeStageTitle.slice(0, 18)}${activeStageTitle.length > 18 ? '…' : ''}`
            : `${stageCount} Stage${stageCount > 1 ? 's' : ''} Live`}
        </Text>
        <Feather name="chevron-down" size={9} color="#FF6B6B" />
      </TouchableOpacity>
    );
  }

  // Voice
  if (currentStatus === 'voice' && voiceCount > 0) {
    return (
      <View style={[styles.pill, { backgroundColor: theme.bgDark, borderColor: theme.accent }]}>
        <Feather name="mic" size={10} color={theme.accent} />
        <Text style={[styles.pillText, { color: theme.accent }]}>
          {voiceCount} in Voice Call
        </Text>
      </View>
    );
  }

  // Default online
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
