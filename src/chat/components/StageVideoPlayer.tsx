import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { MediaStage, extractYouTubeIdFromUrl } from '../hooks/useMediaStages';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Sync time helper (accounts for server clock drift) ──────────────────────
function computeExpectedTime(stage: MediaStage): number {
  if (!stage.isPlaying) return stage.currentTime;
  const elapsed = (Date.now() - stage.updatedAt) / 1000;
  return stage.currentTime + elapsed;
}

// ─── Format seconds to MM:SS ─────────────────────────────────────────────────
function formatTime(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

interface Props {
  stage: MediaStage;
  minimized: boolean;
  isHost: boolean;
  canControl: boolean;
  currentUserUid: string | null;
  onUpdatePlayback: (stageId: string, isPlaying: boolean, currentTime: number) => Promise<void>;
  onSeek: (stageId: string, seconds: number) => Promise<void>;
  onLeave: (stageId: string) => Promise<void>;
  onClose: (stageId: string) => Promise<void>;
  onToggleDjMode: (stageId: string) => Promise<void>;
  onToggleMinimize: () => void;
  onOpenQueue: () => void;
  onOpenHub: () => void;
}

export default function StageVideoPlayer({
  stage,
  minimized,
  isHost,
  canControl,
  currentUserUid,
  onUpdatePlayback,
  onSeek,
  onLeave,
  onClose,
  onToggleDjMode,
  onToggleMinimize,
  onOpenQueue,
  onOpenHub,
}: Props) {
  const { theme } = useTheme();
  const [localTime, setLocalTime] = useState(computeExpectedTime(stage));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Local clock that ticks forward while playing
  useEffect(() => {
    const expectedTime = computeExpectedTime(stage);
    setLocalTime(expectedTime);

    if (timerRef.current) clearInterval(timerRef.current);
    if (stage.isPlaying) {
      timerRef.current = setInterval(() => {
        setLocalTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage.isPlaying, stage.currentTime, stage.updatedAt]);

  const ytId = extractYouTubeIdFromUrl(stage.url);
  const isYouTube = stage.mediaType === 'youtube';
  const isTwitch = stage.mediaType === 'twitch';

  const handleTogglePlay = useCallback(async () => {
    if (!canControl) return;
    await onUpdatePlayback(stage.id, !stage.isPlaying, localTime);
  }, [canControl, stage.id, stage.isPlaying, localTime, onUpdatePlayback]);

  const handleSeekBack = useCallback(async () => {
    if (!canControl) return;
    await onSeek(stage.id, Math.max(0, localTime - 10));
  }, [canControl, stage.id, localTime, onSeek]);

  const handleSeekForward = useCallback(async () => {
    if (!canControl) return;
    await onSeek(stage.id, localTime + 10);
  }, [canControl, stage.id, localTime, onSeek]);

  // ── Minimized floating bar ─────────────────────────────────────────────────
  if (minimized) {
    return (
      <View style={[styles.miniBar, { backgroundColor: '#111215', borderColor: '#FF6B6B' }]}>
        <MaterialCommunityIcons name="theater" size={13} color="#FF6B6B" />
        <View style={{ flex: 1 }}>
          <Text style={styles.miniTitle} numberOfLines={1}>🎬 {stage.title}</Text>
          <Text style={styles.miniMeta}>
            {stage.viewers.length} watching · {stage.hostName}
          </Text>
        </View>

        {canControl && (
          <TouchableOpacity style={styles.miniActionBtn} onPress={handleTogglePlay} activeOpacity={0.7}>
            <Feather name={stage.isPlaying ? 'pause' : 'play'} size={14} color="#DBDEE1" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.miniActionBtn} onPress={onToggleMinimize} activeOpacity={0.7}>
          <Feather name="maximize-2" size={14} color="#DBDEE1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.miniLeaveBtn} onPress={() => onLeave(stage.id)} activeOpacity={0.7}>
          <Feather name="log-out" size={13} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  // ── Full Stage Player ──────────────────────────────────────────────────────
  return (
    <View style={[styles.playerContainer, { backgroundColor: '#0A0B0D', borderColor: theme.borderSubtle }]}>

      {/* ── Stage Header Bar ──────────────────────────────────────────────── */}
      <View style={styles.playerHeader}>
        <TouchableOpacity onPress={onOpenHub} style={styles.stageBackBtn} activeOpacity={0.7}>
          <Feather name="grid" size={13} color="#949BA4" />
          <Text style={styles.stageBackText}>All Stages</Text>
        </TouchableOpacity>

        <View style={styles.stageTitleRow}>
          {isYouTube && <Ionicons name="logo-youtube" size={12} color="#FF0000" />}
          {isTwitch && <MaterialCommunityIcons name="twitch" size={12} color="#9146FF" />}
          {!isYouTube && !isTwitch && <Feather name="video" size={12} color="#23A55A" />}
          <Text style={styles.stageTitleText} numberOfLines={1}>{stage.title}</Text>
        </View>

        <View style={styles.playerHeaderRight}>
          {stage.queue.length > 0 && (
            <TouchableOpacity onPress={onOpenQueue} style={styles.headerBtn}>
              <Feather name="list" size={13} color="#949BA4" />
              <Text style={styles.headerBtnText}>{stage.queue.length}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onToggleMinimize} style={styles.headerBtn}>
            <Feather name="minimize-2" size={13} color="#949BA4" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Video Frame ───────────────────────────────────────────────────── */}
      <View style={styles.videoFrame}>
        {Platform.OS === 'web' ? (
          isYouTube && ytId ? (
            /* YouTube Embed on Web */
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&start=${Math.floor(localTime)}&enablejsapi=1`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          ) : stage.mediaType === 'direct' ? (
            /* Direct video on web */
            <video
              src={stage.url}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              autoPlay={stage.isPlaying}
              controls={false}
            />
          ) : isTwitch ? (
            /* Twitch embed on web */
            <iframe
              src={`https://player.twitch.tv/?channel=${stage.url.split('/').pop()}&parent=localhost&autoplay=true`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allowFullScreen
            />
          ) : null
        ) : (
          /* React Native - show thumbnail + overlay when native video not available */
          <View style={styles.nativeVideoPlaceholder}>
            <MaterialCommunityIcons name="theater" size={40} color="#FF6B6B" />
            <Text style={styles.nativeVideoTitle}>{stage.title}</Text>
            <Text style={styles.nativeVideoSub}>
              {isYouTube ? '🎬 YouTube' : isTwitch ? '🎮 Twitch' : '🎥 Video'} · {stage.viewers.length} watching
            </Text>
            {isYouTube && ytId && (
              <View style={styles.ytThumbnailContainer}>
                {/* @ts-ignore */}
                <Image
                  source={{ uri: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }}
                  style={styles.ytThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.ytThumbnailOverlay}>
                  <View style={styles.syncBadge}>
                    <Text style={styles.syncBadgeText}>📡 SYNCED · {formatTime(localTime)}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Sync overlay for non-hosts when djMode is on */}
        {!canControl && (
          <View style={styles.syncedOverlay}>
            <View style={styles.syncedPill}>
              <View style={styles.syncedDot} />
              <Text style={styles.syncedText}>🟢 SYNCED WITH {stage.hostName.toUpperCase()}</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Playback Controls ──────────────────────────────────────────────── */}
      <View style={[styles.controls, { backgroundColor: '#111215', borderTopColor: '#1C1E24' }]}>

        {/* Progress / Time */}
        <View style={styles.progressRow}>
          <Text style={styles.timeText}>{formatTime(localTime)}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { backgroundColor: theme.accent }]} />
          </View>
          <Text style={styles.timeText}>LIVE</Text>
        </View>

        {/* Buttons Row */}
        <View style={styles.controlsRow}>
          {/* DJ Mode Toggle (host only) */}
          {isHost && (
            <TouchableOpacity
              style={[styles.djModeBtn, stage.djMode && styles.djModeBtnActive]}
              onPress={() => onToggleDjMode(stage.id)}
              activeOpacity={0.7}
            >
              <Feather name={stage.djMode ? 'lock' : 'unlock'} size={13} color={stage.djMode ? '#FEE75C' : '#949BA4'} />
              <Text style={[styles.djModeBtnText, stage.djMode && { color: '#FEE75C' }]}>
                {stage.djMode ? 'DJ Mode' : 'Free For All'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Non-host — resync */}
          {!isHost && (
            <TouchableOpacity
              style={[styles.resyncBtn, { backgroundColor: theme.bgCard, borderColor: '#23A55A' }]}
              onPress={() => {
                const expected = computeExpectedTime(stage);
                setLocalTime(expected);
              }}
              activeOpacity={0.7}
            >
              <Feather name="refresh-cw" size={12} color="#23A55A" />
              <Text style={styles.resyncText}>Resync</Text>
            </TouchableOpacity>
          )}

          <View style={{ flex: 1 }} />

          {/* Seek back */}
          <TouchableOpacity
            style={[styles.controlBtn, !canControl && styles.controlBtnDisabled]}
            onPress={handleSeekBack}
            disabled={!canControl}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="rewind-10" size={22} color={canControl ? '#DBDEE1' : '#40444B'} />
          </TouchableOpacity>

          {/* Play / Pause */}
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: canControl ? theme.accent : '#40444B' }]}
            onPress={handleTogglePlay}
            disabled={!canControl}
            activeOpacity={0.8}
          >
            <Feather name={stage.isPlaying ? 'pause' : 'play'} size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Seek forward */}
          <TouchableOpacity
            style={[styles.controlBtn, !canControl && styles.controlBtnDisabled]}
            onPress={handleSeekForward}
            disabled={!canControl}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="fast-forward-10" size={22} color={canControl ? '#DBDEE1' : '#40444B'} />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Queue */}
          <TouchableOpacity style={styles.controlBtn} onPress={onOpenQueue} activeOpacity={0.7}>
            <Feather name="list" size={18} color="#949BA4" />
          </TouchableOpacity>

          {/* Leave */}
          <TouchableOpacity
            style={[styles.leaveBtn]}
            onPress={() => onLeave(stage.id)}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={15} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Viewer Row */}
        <View style={styles.viewerRow}>
          <View style={styles.viewerAvatarsInline}>
            {stage.viewers.slice(0, 6).map((v, i) => (
              <View
                key={v.uid}
                style={[
                  styles.viewerAvatar,
                  {
                    backgroundColor: AVATAR_COLORS[v.uid.charCodeAt(0) % AVATAR_COLORS.length],
                    marginLeft: i === 0 ? 0 : -7,
                    zIndex: 6 - i,
                  },
                ]}
              >
                <Text style={styles.viewerAvatarText}>{v.name.charAt(0).toUpperCase()}</Text>
              </View>
            ))}
            {stage.viewers.length > 6 && (
              <Text style={styles.viewerMore}>+{stage.viewers.length - 6}</Text>
            )}
          </View>
          <Text style={styles.viewerCountText}>
            {stage.viewers.length} watching · 👑 {stage.hostName}
          </Text>
        </View>
      </View>
    </View>
  );
}

const AVATAR_COLORS = ['#5865F2', '#23A55A', '#FEE75C', '#EB459E', '#ED4245', '#00A8FC', '#E67E22', '#9B59B6'];

const styles = StyleSheet.create({
  // Minimized bar
  miniBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 12,
    marginBottom: 6,
  },
  miniTitle: { color: '#F2F3F5', fontSize: 12, fontWeight: '700' },
  miniMeta: { color: '#949BA4', fontSize: 10 },
  miniActionBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#20232B',
    alignItems: 'center', justifyContent: 'center',
  },
  miniLeaveBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#ED4245',
    alignItems: 'center', justifyContent: 'center',
  },

  // Full player
  playerContainer: {
    borderRadius: 0,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#16181D',
    borderBottomWidth: 1,
    borderBottomColor: '#1C1E24',
    gap: 8,
  },
  stageBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stageBackText: { color: '#949BA4', fontSize: 11, fontWeight: '700' },
  stageTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center' },
  stageTitleText: { color: '#F2F3F5', fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'center' },
  playerHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#20232B',
  },
  headerBtnText: { color: '#949BA4', fontSize: 11, fontWeight: '700' },

  // Video frame
  videoFrame: {
    width: '100%',
    height: 200,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  nativeVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 16,
  },
  nativeVideoTitle: {
    color: '#F2F3F5',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  nativeVideoSub: {
    color: '#949BA4',
    fontSize: 12,
    textAlign: 'center',
  },
  ytThumbnailContainer: {
    width: '100%',
    height: 120,
    marginTop: 8,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  ytThumbnail: { width: '100%', height: '100%' },
  ytThumbnailOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
  },
  syncBadge: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  syncBadgeText: {
    color: '#23A55A',
    fontSize: 10,
    fontWeight: '800',
  },
  syncedOverlay: {
    position: 'absolute',
    top: 6,
    right: 8,
  },
  syncedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  syncedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#23A55A' },
  syncedText: { color: '#23A55A', fontSize: 9, fontWeight: '800' },

  // Controls
  controls: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: { color: '#949BA4', fontSize: 10, fontWeight: '700', fontFamily: 'monospace', minWidth: 36 },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: '#2C2F33',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '35%',
    height: '100%',
    borderRadius: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#20232B',
  },
  controlBtnDisabled: { opacity: 0.35 },
  playBtn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  djModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#20232B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  djModeBtnActive: {
    backgroundColor: 'rgba(254,231,92,0.1)',
    borderColor: 'rgba(254,231,92,0.3)',
  },
  djModeBtnText: { color: '#949BA4', fontSize: 11, fontWeight: '700' },
  resyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  resyncText: { color: '#23A55A', fontSize: 11, fontWeight: '700' },
  leaveBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
  },

  // Viewer row
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewerAvatarsInline: { flexDirection: 'row', alignItems: 'center' },
  viewerAvatar: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#111215',
  },
  viewerAvatarText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  viewerMore: { color: '#949BA4', fontSize: 10, marginLeft: 4 },
  viewerCountText: { color: '#949BA4', fontSize: 11 },
});
