import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  Clipboard,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export interface StarredMessage {
  id: string;
  text: string;
  senderName: string;
  savedAt: string;
}

interface Props {
  visible: boolean;
  passkey: string;
  onClose: () => void;
}

export const STARRED_KEY_PREFIX = '@fluffy/starred_';

export async function toggleStarMessage(passkey: string, msg: { id: string; text: string; senderName: string }): Promise<boolean> {
  const key = `${STARRED_KEY_PREFIX}${passkey}`;
  const raw = await AsyncStorage.getItem(key);
  let list: StarredMessage[] = raw ? JSON.parse(raw) : [];

  const existingIdx = list.findIndex((m) => m.id === msg.id);
  let isStarredNow = false;

  if (existingIdx >= 0) {
    list = list.filter((m) => m.id !== msg.id);
    isStarredNow = false;
  } else {
    list.unshift({
      id: msg.id,
      text: msg.text,
      senderName: msg.senderName,
      savedAt: new Date().toLocaleDateString(),
    });
    isStarredNow = true;
  }

  await AsyncStorage.setItem(key, JSON.stringify(list));
  return isStarredNow;
}

export default function StarredMessagesModal({ visible, passkey, onClose }: Props) {
  const { theme } = useTheme();
  const [starredList, setStarredList] = useState<StarredMessage[]>([]);

  const loadStarred = async () => {
    const key = `${STARRED_KEY_PREFIX}${passkey}`;
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      setStarredList(JSON.parse(raw));
    } else {
      setStarredList([]);
    }
  };

  useEffect(() => {
    if (visible) {
      loadStarred();
    }
  }, [visible, passkey]);

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', 'Message text copied to clipboard.');
  };

  const handleRemove = async (id: string) => {
    const next = starredList.filter((m) => m.id !== id);
    setStarredList(next);
    await AsyncStorage.setItem(`${STARRED_KEY_PREFIX}${passkey}`, JSON.stringify(next));
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
            <Ionicons name="star" size={18} color="#FEE75C" />
            <Text style={[styles.title, { color: theme.textPrimary }]}>Starred Messages</Text>
          </View>

          {starredList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={32} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No starred messages yet. Star any message to save it here!
              </Text>
            </View>
          ) : (
            <FlatList
              data={starredList}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={[styles.starredCard, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.senderName, { color: theme.accent }]}>{item.senderName}</Text>
                    <Text style={[styles.savedDate, { color: theme.textMuted }]}>{item.savedAt}</Text>
                  </View>
                  <Text style={[styles.cardText, { color: theme.textPrimary }]}>{item.text}</Text>

                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => handleCopy(item.text)} style={styles.actionBtn}>
                      <Feather name="copy" size={13} color={theme.textMuted} />
                      <Text style={[styles.actionBtnText, { color: theme.textMuted }]}>Copy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.actionBtn}>
                      <Feather name="trash-2" size={13} color="#EF4444" />
                      <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
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
    height: 480,
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
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  starredCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
  },
  savedDate: {
    fontSize: 10,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
