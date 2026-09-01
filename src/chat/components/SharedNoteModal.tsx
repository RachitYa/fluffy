import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { SharedNote } from '../hooks/useSharedNote';
import { format } from 'date-fns';

const SCREEN_H = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  note: SharedNote | null;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
}

export default function SharedNoteModal({ visible, note, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (note && !dirty) setContent(note.content);
  }, [note]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 18, tension: 160 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }).start();
      setDirty(false);
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(content);
    setSaving(false);
    setDirty(false);
  };

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="note-text-outline" size={18} color="#FEE75C" />
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Shared Note</Text>
            </View>
            <View style={styles.headerRight}>
              {dirty && (
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {note?.lastEditedBy && (
            <Text style={[styles.lastEdited, { color: theme.textMuted }]}>
              Last edited by <Text style={{ color: theme.accent }}>{note.lastEditedBy}</Text>
              {' · '}{format(new Date(note.lastEditedAt), 'dd MMM HH:mm')}
            </Text>
          )}

          <TextInput
            style={[styles.noteInput, { backgroundColor: theme.bgCard, color: theme.textPrimary, borderColor: theme.borderSubtle }]}
            multiline
            placeholder="Start writing your shared note here…\n\nEveryone in this room can see and edit this note."
            placeholderTextColor={theme.textMuted}
            value={content}
            onChangeText={(t) => { setContent(t); setDirty(true); }}
            textAlignVertical="top"
            autoCorrect
          />

          <View style={styles.footer}>
            <Text style={[styles.footerHint, { color: theme.textMuted }]}>
              📝 Visible to all room members · Changes sync in real time
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  sheet: {
    height: SCREEN_H * 0.75,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  lastEdited: { fontSize: 11, marginBottom: 10 },
  noteInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  footer: { alignItems: 'center' },
  footerHint: { fontSize: 11 },
});
