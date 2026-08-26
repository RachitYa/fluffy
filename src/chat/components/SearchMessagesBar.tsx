import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface Props {
  visible: boolean;
  query: string;
  onChangeQuery: (text: string) => void;
  onClose: () => void;
  matchCount: number;
}

export default function SearchMessagesBar({
  visible,
  query,
  onChangeQuery,
  onClose,
  matchCount,
}: Props) {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
      <Feather name="search" size={15} color={theme.accent} />
      <TextInput
        style={[styles.input, { color: theme.textPrimary }]}
        placeholder="Search in conversation..."
        placeholderTextColor={theme.textMuted}
        value={query}
        onChangeText={onChangeQuery}
        autoFocus
      />
      {query.length > 0 && (
        <Text style={[styles.matchBadge, { color: theme.textMuted }]}>
          {matchCount} match{matchCount === 1 ? '' : 'es'}
        </Text>
      )}
      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Feather name="x" size={15} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  matchBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
});
