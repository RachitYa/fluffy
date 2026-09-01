import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { MediaStage, QueueItem, extractVideoTitle, detectMediaType } from '../hooks/useMediaStages';

const SCREEN_H = Dimensions.get('window').height;

// ─── Queue Drawer ─────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  stage: MediaStage;
  canControl: boolean;
  currentUserUid: string | null;
  currentUserName: string | null;
  onClose: () => void;
  onAddToQueue: (stageId: string, url: string, title: string) => Promise<void>;
  onPlayNext: (stageId: string) => Promise<void>;
  onRemoveFromQueue: (stageId: string, itemId: string) => Promise<void>;
}

export default function StageQueueModal({
  visible,
  stage,
  canControl,
  currentUserUid,
  currentUserName,
  onClose,
  onAddToQueue,
  onPlayNext,
  onRemoveFromQueue,
}: Props) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 20,
        tension: 180,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  const handleAdd = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setAdding(true);
    const title = titleInput.trim() || extractVideoTitle(url);
    await onAddToQueue(stage.id, url, title);
    setUrlInput('');
    setTitleInput('');
    setAdding(false);
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
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="list" size={16} color={theme.accent} />
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Stage Queue</Text>
              {stage.queue.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: theme.accent }]}>
                  <Text style={styles.countBadgeText}>{stage.queue.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Currently Playing */}
          <View style={[styles.nowPlayingCard, { backgroundColor: theme.bgCard, borderColor: theme.accent }]}>
            <View style={styles.nowPlayingDot} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.nowPlayingLabel, { color: theme.accent }]}>NOW PLAYING</Text>
              <Text style={[styles.nowPlayingTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                {stage.title}
              </Text>
            </View>
            {canControl && stage.queue.length > 0 && (
              <TouchableOpacity
                style={[styles.skipBtn, { backgroundColor: theme.bgDark }]}
                onPress={() => onPlayNext(stage.id)}
                activeOpacity={0.7}
              >
                <Feather name="skip-forward" size={14} color={theme.textPrimary} />
                <Text style={[styles.skipText, { color: theme.textPrimary }]}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Queue List */}
          <ScrollView style={{ maxHeight: SCREEN_H * 0.3 }} showsVerticalScrollIndicator={false}>
            {stage.queue.length === 0 ? (
              <View style={styles.emptyQueue}>
                <Text style={[styles.emptyQueueText, { color: theme.textMuted }]}>
                  Queue is empty · Add a video below to play next!
                </Text>
              </View>
            ) : (
              stage.queue.map((item, index) => (
                <View
                  key={item.id}
                  style={[styles.queueItem, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}
                >
                  <Text style={[styles.queueIndex, { color: theme.textMuted }]}>{index + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.queueTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.queueAddedBy, { color: theme.textMuted }]}>
                      Added by {item.addedBy}
                    </Text>
                  </View>
                  {canControl && (
                    <TouchableOpacity onPress={() => onRemoveFromQueue(stage.id, item.id)}>
                      <Feather name="x" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          {/* Add Video Input */}
          <View style={[styles.addSection, { borderTopColor: theme.borderSubtle }]}>
            <Text style={[styles.addTitle, { color: theme.textPrimary }]}>Add to Queue</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgCard, color: theme.textPrimary, borderColor: theme.borderSubtle }]}
              placeholder="YouTube, MP4, or Twitch URL..."
              placeholderTextColor={theme.textMuted}
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgCard, color: theme.textPrimary, borderColor: theme.borderSubtle }]}
              placeholder="Custom title (optional)"
              placeholderTextColor={theme.textMuted}
              value={titleInput}
              onChangeText={setTitleInput}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: theme.accent, opacity: adding || !urlInput.trim() ? 0.5 : 1 }]}
              onPress={handleAdd}
              disabled={adding || !urlInput.trim()}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={15} color="#fff" />
              <Text style={styles.addBtnText}>{adding ? 'Adding...' : 'Add to Queue'}</Text>
            </TouchableOpacity>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  countBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  countBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  nowPlayingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 14,
  },
  nowPlayingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#23A55A' },
  nowPlayingLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  nowPlayingTitle: { fontSize: 13, fontWeight: '700' },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skipText: { fontSize: 12, fontWeight: '700' },

  emptyQueue: { alignItems: 'center', paddingVertical: 18 },
  emptyQueueText: { fontSize: 12, textAlign: 'center' },

  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
  queueIndex: { fontSize: 12, fontWeight: '800', width: 18, textAlign: 'center' },
  queueTitle: { fontSize: 13, fontWeight: '600' },
  queueAddedBy: { fontSize: 10, marginTop: 2 },

  addSection: { paddingTop: 14, borderTopWidth: 1, gap: 8 },
  addTitle: { fontSize: 14, fontWeight: '800' },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
