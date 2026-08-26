import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { VoiceParticipant } from '../hooks/useVoiceCall';
import { Feather, Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  minimized: boolean;
  channelName: string;
  participants: VoiceParticipant[];
  isMuted: boolean;
  isVideoOn: boolean;
  isDeafened: boolean;
  localStream: MediaStream | null;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleDeafen: () => void;
  onLeaveCall: () => void;
  onToggleMinimize: () => void;
}

const AVATAR_COLORS = ['#5865F2', '#23A55A', '#FEE75C', '#EB459E', '#ED4245', '#00A8FC', '#E67E22', '#9B59B6'];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Video Tile / Avatar Card with Emerald Speaking Ring ──────────────────────
function ParticipantTile({
  p,
  localStream,
}: {
  p: VoiceParticipant;
  localStream: MediaStream | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const avatarBg = getAvatarColor(p.name);
  const initial = (p.name || 'U').charAt(0).toUpperCase();

  useEffect(() => {
    if (Platform.OS === 'web' && videoRef.current && p.isLocal && localStream && p.isVideoOn) {
      videoRef.current.srcObject = localStream;
      videoRef.current.play().catch(() => {});
    }
  }, [p.isLocal, localStream, p.isVideoOn]);

  return (
    <View
      style={[
        styles.tileCard,
        p.isSpeaking && styles.tileCardSpeaking,
      ]}
    >
      {/* Video stream on web if enabled */}
      {p.isVideoOn && p.isLocal && Platform.OS === 'web' ? (
        <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'hidden', borderRadius: 14 }}>
          {/* @ts-ignore */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ) : (
        /* Avatar Card */
        <View style={[styles.avatarCircle, { backgroundColor: avatarBg }, p.isSpeaking && styles.avatarSpeakingRing]}>
          <Text style={styles.avatarInitial}>{initial}</Text>
          {p.isSpeaking && <View style={styles.speakingGlowDot} />}
        </View>
      )}

      {/* Participant Name Badge */}
      <View style={styles.nameBadgeRow}>
        <Text style={styles.participantName} numberOfLines={1}>
          {p.isLocal ? `${p.name} (You)` : p.name}
        </Text>
        {p.isMuted && (
          <View style={styles.mutedPill}>
            <Feather name="mic-off" size={10} color="#EF4444" />
          </View>
        )}
      </View>
    </View>
  );
}

export default function VoiceCallModal({
  visible,
  minimized,
  channelName,
  participants,
  isMuted,
  isVideoOn,
  isDeafened,
  localStream,
  onToggleMute,
  onToggleVideo,
  onToggleDeafen,
  onLeaveCall,
  onToggleMinimize,
}: Props) {
  if (!visible) return null;

  // ── 1. Minimized Floating Voice Bar ─────────────────────────────────────────
  if (minimized) {
    return (
      <View style={styles.minimizedBar}>
        <TouchableOpacity style={styles.minimizedInfo} onPress={onToggleMinimize} activeOpacity={0.8}>
          <Feather name="radio" size={13} color="#23A55A" />
          <View style={{ flex: 1 }}>
            <Text style={styles.minimizedTitle}>Voice Connected / #{channelName}</Text>
            <Text style={styles.minimizedSubtitle}>{participants.length} member{participants.length === 1 ? '' : 's'} in call</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.minimizedControls}>
          <TouchableOpacity
            style={[styles.minBtn, isMuted && styles.minBtnActive]}
            onPress={onToggleMute}
            activeOpacity={0.7}
          >
            <Feather name={isMuted ? 'mic-off' : 'mic'} size={14} color={isMuted ? '#EF4444' : '#E4E7EB'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.minBtn, isVideoOn && styles.minBtnActive]}
            onPress={onToggleVideo}
            activeOpacity={0.7}
          >
            <Feather name={isVideoOn ? 'video' : 'video-off'} size={14} color={isVideoOn ? '#5865F2' : '#949BA4'} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.minDisconnectBtn} onPress={onLeaveCall} activeOpacity={0.7}>
            <Feather name="phone-off" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── 2. Fullscreen Voice Channel Overlay ─────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlayContainer}>
        {/* Top Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onToggleMinimize} style={styles.minimizeBtn} activeOpacity={0.7}>
            <Feather name="chevron-down" size={20} color="#DBDEE1" />
          </TouchableOpacity>

          <View style={styles.headerTitleCol}>
            <View style={styles.connectedRow}>
              <Feather name="radio" size={11} color="#23A55A" />
              <Text style={styles.connectedText}>VOICE CONNECTED</Text>
            </View>
            <Text style={styles.channelTitleText}>#{channelName}</Text>
          </View>

          <View style={styles.membersCountPill}>
            <Text style={styles.membersCountText}>{participants.length} in call</Text>
          </View>
        </View>

        {/* Participants Grid */}
        <ScrollView contentContainerStyle={styles.gridContainer}>
          <View style={styles.tilesGrid}>
            {participants.map((p) => (
              <ParticipantTile key={p.uid} p={p} localStream={localStream} />
            ))}
          </View>
        </ScrollView>

        {/* Floating Bottom Control Dock */}
        <View style={styles.dockContainer}>
          <TouchableOpacity
            style={[styles.dockBtn, isMuted ? styles.dockBtnMuted : styles.dockBtnNormal]}
            onPress={onToggleMute}
            activeOpacity={0.75}
          >
            <Feather name={isMuted ? 'mic-off' : 'mic'} size={20} color={isMuted ? '#EF4444' : '#E4E7EB'} />
            <Text style={[styles.dockLabel, isMuted && { color: '#EF4444' }]}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dockBtn, isVideoOn ? styles.dockBtnActive : styles.dockBtnNormal]}
            onPress={onToggleVideo}
            activeOpacity={0.75}
          >
            <Feather name={isVideoOn ? 'video' : 'video-off'} size={20} color={isVideoOn ? '#5865F2' : '#949BA4'} />
            <Text style={[styles.dockLabel, isVideoOn && { color: '#5865F2' }]}>{isVideoOn ? 'Video On' : 'Video Off'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dockBtn, isDeafened ? styles.dockBtnMuted : styles.dockBtnNormal]}
            onPress={onToggleDeafen}
            activeOpacity={0.75}
          >
            <Feather name={isDeafened ? 'volume-x' : 'volume-2'} size={20} color={isDeafened ? '#EF4444' : '#E4E7EB'} />
            <Text style={[styles.dockLabel, isDeafened && { color: '#EF4444' }]}>{isDeafened ? 'Undeafen' : 'Deafen'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dockBtn, styles.dockBtnDisconnect]}
            onPress={onLeaveCall}
            activeOpacity={0.75}
          >
            <Feather name="phone-off" size={20} color="#FFFFFF" />
            <Text style={[styles.dockLabel, { color: '#FFFFFF' }]}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Design Tokens & Styles ───────────────────────────────────────────────────
const BG_DARK = '#0E0F12';
const BG_SURFACE = '#16181D';
const BG_CARD = '#1C1E24';
const TEXT_PRIMARY = '#F2F3F5';
const TEXT_MUTED = '#949BA4';
const BORDER_SUBTLE = 'rgba(255, 255, 255, 0.08)';

const styles = StyleSheet.create({
  minimizedBar: {
    position: 'absolute',
    bottom: 64,
    left: 12,
    right: 12,
    backgroundColor: '#111215',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#23A55A',
    zIndex: 999,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  minimizedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  minimizedTitle: {
    color: '#23A55A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  minimizedSubtitle: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 1,
  },
  minimizedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#20232B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  minBtnActive: {
    backgroundColor: '#2B161B',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  minDisconnectBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Fullscreen Overlay
  overlayContainer: {
    flex: 1,
    backgroundColor: BG_DARK,
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: BG_SURFACE,
    borderBottomWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  minimizeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#20232B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  headerTitleCol: {
    alignItems: 'center',
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  connectedText: {
    color: '#23A55A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  channelTitleText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  membersCountPill: {
    backgroundColor: '#20232B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  membersCountText: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
  },

  // Tiles Grid
  gridContainer: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  tileCard: {
    width: '46%',
    aspectRatio: 1.1,
    backgroundColor: BG_CARD,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: BORDER_SUBTLE,
    overflow: 'hidden',
  },
  tileCardSpeaking: {
    borderColor: '#23A55A',
    shadowColor: '#23A55A',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarSpeakingRing: {
    borderWidth: 3,
    borderColor: '#23A55A',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  speakingGlowDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#23A55A',
    borderWidth: 2,
    borderColor: BG_CARD,
  },
  nameBadgeRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(14, 15, 18, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  participantName: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  mutedPill: {
    marginLeft: 4,
  },

  // Dock
  dockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: BG_SURFACE,
    borderTopWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  dockBtn: {
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  dockBtnNormal: {
    backgroundColor: '#20232B',
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  dockBtnMuted: {
    backgroundColor: '#2B161B',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dockBtnActive: {
    backgroundColor: '#1E2340',
    borderWidth: 1,
    borderColor: 'rgba(88, 101, 242, 0.4)',
  },
  dockBtnDisconnect: {
    backgroundColor: '#EF4444',
  },
  dockLabel: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '700',
  },
});
