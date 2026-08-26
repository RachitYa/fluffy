import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { PollData } from '../hooks/useMessages';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreatePoll: (poll: PollData) => void;
}

export default function CreatePollModal({ visible, onClose, onCreatePoll }: Props) {
  const { theme } = useTheme();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const handleAddOption = () => {
    if (options.length < 4) {
      setOptions([...options, '']);
    }
  };

  const handleUpdateOption = (text: string, index: number) => {
    const next = [...options];
    next[index] = text;
    setOptions(next);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = () => {
    const validQuestion = question.trim();
    const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);

    if (!validQuestion || validOptions.length < 2) return;

    onCreatePoll({
      question: validQuestion,
      options: validOptions.map((text, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        text,
        votes: [],
      })),
    });

    setQuestion('');
    setOptions(['', '']);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalSheet, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.headerRow}>
            <Feather name="bar-chart-2" size={18} color={theme.accent} />
            <Text style={[styles.title, { color: theme.textPrimary }]}>Create a Poll</Text>
          </View>

          <ScrollView style={{ maxHeight: 380 }}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>QUESTION</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgDark, color: theme.textPrimary, borderColor: theme.borderSubtle }]}
              placeholder="Ask a question..."
              placeholderTextColor={theme.textMuted}
              value={question}
              onChangeText={setQuestion}
              maxLength={120}
              autoFocus
            />

            <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: 12 }]}>OPTIONS</Text>
            {options.map((opt, idx) => (
              <View key={idx} style={styles.optionRow}>
                <TextInput
                  style={[
                    styles.input,
                    { flex: 1, backgroundColor: theme.bgDark, color: theme.textPrimary, borderColor: theme.borderSubtle },
                  ]}
                  placeholder={`Option ${idx + 1}`}
                  placeholderTextColor={theme.textMuted}
                  value={opt}
                  onChangeText={(text) => handleUpdateOption(text, idx)}
                  maxLength={60}
                />
                {options.length > 2 && (
                  <TouchableOpacity onPress={() => handleRemoveOption(idx)} style={styles.removeBtn}>
                    <Feather name="trash-2" size={15} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {options.length < 4 && (
              <TouchableOpacity
                style={[styles.addOptionBtn, { borderColor: theme.borderSubtle }]}
                onPress={handleAddOption}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={14} color={theme.accent} />
                <Text style={[styles.addOptionText, { color: theme.accent }]}>Add Option</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: theme.accent },
              (!question.trim() || options.filter((o) => o.trim()).length < 2) && styles.btnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
            activeOpacity={0.8}
          >
            <Text style={styles.submitText}>Create Poll</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderWidth: 1,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3F424E',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeBtn: {
    padding: 8,
    marginBottom: 8,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
    marginBottom: 16,
  },
  addOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
