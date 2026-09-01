import React, { useState, useRef, useEffect } from 'react';
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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Bookmark, BookmarkFolder, DEFAULT_FOLDERS } from '../hooks/useBookmarks';
import { format } from 'date-fns';

const SCREEN_H = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  bookmarks: Bookmark[];
  onClose: () => void;
  onRemove: (id: string) => void;
}

export default function BookmarksModal({ visible, bookmarks, onClose, onRemove }: Props) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const [activeFolder, setActiveFolder] = useState('all');

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 18, tension: 160 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  const filtered = activeFolder === 'all'
    ? bookmarks
    : bookmarks.filter((b) => b.folderId === activeFolder);

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="bookmark" size={16} color={theme.accent} />
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Bookmarks</Text>
              <View style={[styles.countPill, { backgroundColor: theme.accent }]}>
                <Text style={styles.countPillText}>{bookmarks.length}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Folder tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.folderRow} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
            {DEFAULT_FOLDERS.map((folder) => {
              const count = folder.id === 'all'
                ? bookmarks.length
                : bookmarks.filter((b) => b.folderId === folder.id).length;
              return (
                <TouchableOpacity
                  key={folder.id}
                  style={[
                    styles.folderTab,
                    { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle },
                    activeFolder === folder.id && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                  onPress={() => setActiveFolder(folder.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.folderTabEmoji}>{folder.emoji}</Text>
                  <Text style={[styles.folderTabLabel, { color: activeFolder === folder.id ? '#fff' : theme.textPrimary }]}>
                    {folder.name}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.folderCount, { backgroundColor: activeFolder === folder.id ? 'rgba(255,255,255,0.25)' : theme.bgDark }]}>
                      <Text style={[styles.folderCountText, { color: activeFolder === folder.id ? '#fff' : theme.textMuted }]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Bookmark items */}
          <ScrollView style={{ maxHeight: SCREEN_H * 0.45 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 16 }}>
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 32 }}>🔖</Text>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  {activeFolder === 'all' ? 'No bookmarks yet\nLong-press a message to bookmark it' : 'No bookmarks in this folder'}
                </Text>
              </View>
            ) : (
              filtered.map((bm) => (
                <View key={bm.id} style={[styles.bookmarkCard, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.bookmarkMeta}>
                      <Text style={[styles.bookmarkSender, { color: theme.accent }]}>{bm.senderName}</Text>
                      <Text style={[styles.bookmarkRoom, { color: theme.textMuted }]}>in #{bm.roomTitle}</Text>
                    </View>
                    <Text style={[styles.bookmarkText, { color: theme.textPrimary }]} numberOfLines={2}>
                      {bm.text}
                    </Text>
                    <Text style={[styles.bookmarkTime, { color: theme.textMuted }]}>
                      {format(new Date(bm.savedAt), 'dd MMM yyyy · HH:mm')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => onRemove(bm.id)} style={styles.removeBtn}>
                    <Feather name="trash-2" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingBottom: 32,
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
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  countPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  countPillText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  folderRow: { marginBottom: 8 },
  folderTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  folderTabEmoji: { fontSize: 12 },
  folderTabLabel: { fontSize: 12, fontWeight: '700' },
  folderCount: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
  folderCountText: { fontSize: 9, fontWeight: '800' },

  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 30 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  bookmarkCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  bookmarkMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookmarkSender: { fontSize: 11, fontWeight: '800' },
  bookmarkRoom: { fontSize: 10 },
  bookmarkText: { fontSize: 13, lineHeight: 18 },
  bookmarkTime: { fontSize: 10 },
  removeBtn: { padding: 6 },
});
