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
import {
  MediaStage,
  QueueItem,
  detectMediaType,
  extractVideoTitle,
  extractYouTubeIdFromUrl,
} from '../hooks/useMediaStages';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Platform icon helper ───────────────────────────────────────────────────────
function PlatformIcon({ url, size = 14 }: { url: string; size?: number }) {
  if (/youtube|youtu\.be/.test(url))
    return <Ionicons name="logo-youtube" size={size} color="#FF0000" />;
  if (/twitch\.tv/.test(url))
    return <MaterialCommunityIcons name="twitch" size={size} color="#9146FF" />;
  return <Feather name="video" size={size} color="#23A55A" />;
}

// ── Viewer avatars row ─────────────────────────────────────────────────────────
function ViewerAvatars({ viewers, max = 4 }: { viewers: MediaStage['viewers']; max?: number }) {
  const shown = viewers.slice(0, max);
  const extra = viewers.length - max;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: -8 }}>
      {shown.map((v, i) => (
        <View
          key={v.uid}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: AVATAR_COLORS[v.uid.charCodeAt(0) % AVATAR_COLORS.length],
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: '#0E0F12',
            zIndex: max - i,
            marginLeft: i === 0 ? 0 : -8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
            {v.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      ))}
      {extra > 0 && (
        <View style={{ marginLeft: 2 }}>
          <Text style={{ color: '#949BA4', fontSize: 10, fontWeight: '700' }}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

const AVATAR_COLORS = ['#5865F2', '#23A55A', '#FEE75C', '#EB459E', '#ED4245', '#00A8FC', '#E67E22', '#9B59B6'];

interface Props {
  visible: boolean;
  stages: MediaStage[];
  onClose: () => void;
  onTuneIn: (stageId: string) => void;
  onCreateStage: (url: string, title?: string) => Promise<string | null>;
  onCloseStage: (stageId: string) => void;
  currentUserUid: string | null;
}

export default function MediaStagesHubModal({
  visible,
  stages,
  onClose,
  onTuneIn,
  onCreateStage,
  onCloseStage,
  currentUserUid,
}: Props) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

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

  const handleCreate = async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;
    setCreating(true);
    const title = titleInput.trim() || extractVideoTitle(trimmedUrl);
    const id = await onCreateStage(trimmedUrl, title);
    setCreating(false);
    if (id) {
      setUrlInput('');
      setTitleInput('');
      setShowCreate(false);
      onTuneIn(id);
      onClose();
    }
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
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="theater" size={18} color="#FF6B6B" />
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Cinema Stages</Text>
              {stages.length > 0 && (
                <View style={styles.countPill}>
                  <Text style={styles.countText}>{stages.length} LIVE</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: SCREEN_H * 0.5 }} showsVerticalScrollIndicator={false}>
            {/* Active Stages */}
            {stages.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="theater" size={40} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Active Stages</Text>
                <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
                  Start a stage and invite everyone to watch together!
                </Text>
              </View>
            ) : (
              <View style={styles.stagesList}>
                {stages.map((stage) => (
                  <View
                    key={stage.id}
                    style={[styles.stageCard, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}
                  >
                    <View style={styles.stageCardTop}>
                      <PlatformIcon url={stage.url} size={16} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stageTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                          {stage.title}
                        </Text>
                        <View style={styles.stageMetaRow}>
                          <Text style={[styles.stageHost, { color: theme.accent }]}>
                            👑 {stage.hostName}
                          </Text>
                          {stage.djMode && (
                            <View style={styles.djBadge}>
                              <Feather name="lock" size={9} color="#FEE75C" />
                              <Text style={styles.djBadgeText}>DJ Mode</Text>
                            </View>
                          )}
                          <View style={styles.playingDot} />
                          <Text style={[styles.stageStatus, { color: '#23A55A' }]}>
                            {stage.isPlaying ? 'LIVE' : 'PAUSED'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.stageCardBottom}>
                      <ViewerAvatars viewers={stage.viewers} />
                      <Text style={[styles.viewerCount, { color: theme.textMuted }]}>
                        {stage.viewers.length} watching
                      </Text>
                      {stage.queue.length > 0 && (
                        <View style={[styles.queuePill, { backgroundColor: theme.bgDark }]}>
                          <Feather name="list" size={10} color={theme.accent} />
                          <Text style={[styles.queuePillText, { color: theme.accent }]}>
                            {stage.queue.length} queued
                          </Text>
                        </View>
                      )}

                      <View style={{ flex: 1 }} />

                      {/* Host can close, others can tune in */}
                      {stage.hostUid === currentUserUid ? (
                        <TouchableOpacity
                          style={styles.closeStageBtn}
                          onPress={() => onCloseStage(stage.id)}
                          activeOpacity={0.7}
                        >
                          <Feather name="x-circle" size={13} color="#EF4444" />
                          <Text style={styles.closeStageText}>Close</Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={[styles.tuneInBtn, { backgroundColor: theme.accent }]}
                        onPress={() => {
                          onTuneIn(stage.id);
                          onClose();
                        }}
                        activeOpacity={0.8}
                      >
                        <Feather name="play" size={12} color="#fff" />
                        <Text style={styles.tuneInText}>Tune In</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Create Stage Section */}
            {showCreate ? (
              <View style={[styles.createSection, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}>
                <Text style={[styles.createTitle, { color: theme.textPrimary }]}>🎬 Start a New Stage</Text>
                <Text style={[styles.createSubtext, { color: theme.textMuted }]}>
                  Paste any YouTube, Twitch, or direct video URL
                </Text>

                <TextInput
                  style={[styles.input, { backgroundColor: theme.bgDark, color: theme.textPrimary, borderColor: theme.borderSubtle }]}
                  placeholder="Paste YouTube / MP4 / Twitch URL..."
                  placeholderTextColor={theme.textMuted}
                  value={urlInput}
                  onChangeText={setUrlInput}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <TextInput
                  style={[styles.input, { backgroundColor: theme.bgDark, color: theme.textPrimary, borderColor: theme.borderSubtle }]}
                  placeholder="Stage title (optional)"
                  placeholderTextColor={theme.textMuted}
                  value={titleInput}
                  onChangeText={setTitleInput}
                />

                <View style={styles.createActions}>
                  <TouchableOpacity
                    style={[styles.cancelCreateBtn, { borderColor: theme.borderSubtle }]}
                    onPress={() => {
                      setShowCreate(false);
                      setUrlInput('');
                      setTitleInput('');
                    }}
                  >
                    <Text style={[styles.cancelCreateText, { color: theme.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.startStageBtn, { backgroundColor: theme.accent, opacity: creating || !urlInput.trim() ? 0.5 : 1 }]}
                    onPress={handleCreate}
                    disabled={creating || !urlInput.trim()}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="theater" size={14} color="#fff" />
                    <Text style={styles.startStageBtnText}>
                      {creating ? 'Starting...' : 'Start Stage'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addStageBtn, { backgroundColor: theme.bgCard, borderColor: theme.accent }]}
                onPress={() => setShowCreate(true)}
                activeOpacity={0.8}
              >
                <Feather name="plus-circle" size={16} color={theme.accent} />
                <Text style={[styles.addStageBtnText, { color: theme.accent }]}>Start a New Stage</Text>
              </TouchableOpacity>
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
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  countPill: {
    backgroundColor: '#ED4245',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  closeBtn: { padding: 6 },

  emptyState: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtext: { fontSize: 12, textAlign: 'center', lineHeight: 17 },

  stagesList: { gap: 10, marginBottom: 12 },
  stageCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  stageCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stageTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  stageMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  stageHost: { fontSize: 11, fontWeight: '700' },
  djBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(254,231,92,0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(254,231,92,0.3)',
  },
  djBadgeText: { color: '#FEE75C', fontSize: 9, fontWeight: '800' },
  playingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#23A55A' },
  stageStatus: { fontSize: 10, fontWeight: '800' },

  stageCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewerCount: { fontSize: 11 },
  queuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  queuePillText: { fontSize: 10, fontWeight: '700' },
  closeStageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  closeStageText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },
  tuneInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tuneInText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  // Create stage
  createSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  createTitle: { fontSize: 15, fontWeight: '800' },
  createSubtext: { fontSize: 11, lineHeight: 16 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  createActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelCreateBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelCreateText: { fontSize: 13, fontWeight: '700' },
  startStageBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startStageBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  addStageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  addStageBtnText: { fontSize: 14, fontWeight: '700' },
});
