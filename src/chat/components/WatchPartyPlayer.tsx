import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { WatchPartyData } from '../hooks/useWatchParty';
import { useTheme } from '../hooks/useTheme';

interface Props {
  watchParty: WatchPartyData;
  userUid: string | null;
  onUpdatePlayback: (isPlaying: boolean, currentTime: number) => void;
  onSeek: (seconds: number) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function WatchPartyPlayer({
  watchParty,
  userUid,
  onUpdatePlayback,
  onSeek,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const playerRef = useRef<any>(null);
  const isInternalUpdateRef = useRef<boolean>(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [localTime, setLocalTime] = useState('0:00');
  const [isMuted, setIsMuted] = useState(false);

  // ── 1. Load YouTube IFrame API script on Web ────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player('fluffy-yt-player', {
        videoId: watchParty.youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            try {
              // Calculate expected current time accounting for transmission latency
              const elapsed = watchParty.isPlaying ? (Date.now() - watchParty.updatedAt) / 1000 : 0;
              const targetTime = Math.max(0, watchParty.currentTime + elapsed);
              event.target.seekTo(targetTime, true);
              if (watchParty.isPlaying) {
                event.target.playVideo();
              } else {
                event.target.pauseVideo();
              }
            } catch (_) {}
          },
          onStateChange: (event: any) => {
            if (isInternalUpdateRef.current) return;

            const player = event.target;
            const curTime = player.getCurrentTime ? player.getCurrentTime() : 0;

            // User clicked Play
            if (event.data === window.YT.PlayerState.PLAYING) {
              onUpdatePlayback(true, curTime);
            }
            // User clicked Pause
            else if (event.data === window.YT.PlayerState.PAUSED) {
              onUpdatePlayback(false, curTime);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    return () => {
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch (_) {}
      }
    };
  }, [watchParty.youtubeId]);

  // ── 2. Sync incoming Firestore updates to YouTube player ────────────────────
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;

    // If change was made by this user, ignore incoming echo
    if (watchParty.lastActionBy === userUid) return;

    try {
      const player = playerRef.current;
      const currentPlayTime = player.getCurrentTime ? player.getCurrentTime() : 0;
      const elapsed = watchParty.isPlaying ? (Date.now() - watchParty.updatedAt) / 1000 : 0;
      const targetTime = Math.max(0, watchParty.currentTime + elapsed);

      isInternalUpdateRef.current = true;

      // Drift correction: seek only if out of sync by > 1.5 seconds
      if (Math.abs(currentPlayTime - targetTime) > 1.5) {
        player.seekTo(targetTime, true);
      }

      if (watchParty.isPlaying) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }

      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 500);
    } catch (_) {
      isInternalUpdateRef.current = false;
    }
  }, [watchParty.isPlaying, watchParty.currentTime, watchParty.updatedAt, watchParty.lastActionBy, isPlayerReady, userUid]);

  // ── 3. Time tracker ticker ──────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        try {
          const sec = Math.floor(playerRef.current.getCurrentTime());
          const m = Math.floor(sec / 60);
          const s = sec % 60;
          setLocalTime(`${m}:${s < 10 ? '0' : ''}${s}`);
        } catch (_) {}
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    const curTime = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : 0;
    const nextState = !watchParty.isPlaying;
    onUpdatePlayback(nextState, curTime);
  };

  const handleSeekDelta = (delta: number) => {
    if (!playerRef.current) return;
    const curTime = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : 0;
    const target = Math.max(0, curTime + delta);
    onSeek(target);
    playerRef.current.seekTo(target, true);
  };

  const handleForceResync = () => {
    if (!playerRef.current) return;
    const elapsed = watchParty.isPlaying ? (Date.now() - watchParty.updatedAt) / 1000 : 0;
    const targetTime = Math.max(0, watchParty.currentTime + elapsed);
    playerRef.current.seekTo(targetTime, true);
    if (watchParty.isPlaying) playerRef.current.playVideo();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="tv-outline" size={15} color={theme.accent} />
          <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
            {watchParty.title || 'YouTube Watch Party'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.liveSyncBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveSyncText}>LOCKED SYNC</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Feather name="x" size={15} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Video Frame */}
      <View style={styles.videoWrapper}>
        {Platform.OS === 'web' ? (
          <div
            id="fluffy-yt-player"
            style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden' }}
          />
        ) : (
          <View style={styles.nativeFallback}>
            <Text style={{ color: theme.textPrimary }}>Playing YouTube ID: {watchParty.youtubeId}</Text>
          </View>
        )}
      </View>

      {/* Lockstep Synchronized Control Bar */}
      <View style={[styles.controlBar, { backgroundColor: theme.bgDark, borderColor: theme.borderSubtle }]}>
        {/* Play / Pause Toggle Button */}
        <TouchableOpacity
          style={[styles.syncPlayBtn, { backgroundColor: theme.accent }]}
          onPress={handleTogglePlay}
          activeOpacity={0.8}
        >
          <Feather name={watchParty.isPlaying ? 'pause' : 'play'} size={14} color="#FFFFFF" />
          <Text style={styles.syncPlayText}>
            {watchParty.isPlaying ? 'Pause for Room' : 'Play for Room'}
          </Text>
        </TouchableOpacity>

        {/* -10s / +10s Seek */}
        <View style={styles.seekGroup}>
          <TouchableOpacity style={styles.seekBtn} onPress={() => handleSeekDelta(-10)} activeOpacity={0.7}>
            <Feather name="rotate-ccw" size={12} color={theme.textMuted} />
            <Text style={[styles.seekText, { color: theme.textMuted }]}>-10s</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.seekBtn} onPress={() => handleSeekDelta(10)} activeOpacity={0.7}>
            <Feather name="rotate-cw" size={12} color={theme.textMuted} />
            <Text style={[styles.seekText, { color: theme.textMuted }]}>+10s</Text>
          </TouchableOpacity>
        </View>

        {/* Timestamp & Resync Button */}
        <View style={styles.statusGroup}>
          <Text style={[styles.timeLabel, { color: theme.textMuted }]}>{localTime}</Text>
          <TouchableOpacity onPress={handleForceResync} style={styles.resyncBtn} activeOpacity={0.7}>
            <Feather name="refresh-cw" size={11} color={theme.accent} />
            <Text style={[styles.resyncText, { color: theme.accent }]}>Resync</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    padding: 10,
    zIndex: 90,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(35, 165, 90, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(35, 165, 90, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#23A55A',
  },
  liveSyncText: {
    color: '#23A55A',
    fontSize: 9,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 210,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  nativeFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  syncPlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  seekGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
  },
  seekText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  resyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
  },
  resyncText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
