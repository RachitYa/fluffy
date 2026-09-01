import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Clipboard,
  Alert,
  StatusBar,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { useRoom } from '../hooks/useRoom';
import { useMessages, Message, ReplyInfo, PollData } from '../hooks/useMessages';
import { useTyping } from '../hooks/useTyping';
import { useVoiceCall } from '../hooks/useVoiceCall';
import { useWatchParty } from '../hooks/useWatchParty';
import { useTheme } from '../hooks/useTheme';
import VoiceCallModal from '../components/VoiceCallModal';
import WatchPartyPlayer from '../components/WatchPartyPlayer';
import RichLinkPreview, { extractUrl, extractYouTubeId } from '../components/RichLinkPreview';
import PollMessageCard from '../components/PollMessageCard';
import CreatePollModal from '../components/CreatePollModal';
import GifPickerModal from '../components/GifPickerModal';
import EphemeralViewOnce from '../components/EphemeralViewOnce';
import DynamicHeaderPill from '../components/DynamicHeaderPill';
import StarredMessagesModal, { toggleStarMessage } from '../components/StarredMessagesModal';
import SearchMessagesBar from '../components/SearchMessagesBar';
import ThemeCustomizerModal from '../components/ThemeCustomizerModal';
import ImageViewerModal from '../components/ImageViewerModal';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMediaStages, extractVideoTitle, detectMediaType } from '../hooks/useMediaStages';
import MediaStagesHubModal from '../components/MediaStagesHubModal';
import StageVideoPlayer from '../components/StageVideoPlayer';
import StageQueueModal from '../components/StageQueueModal';
import { useGameSession } from '../hooks/useGameSession';
import { useXpSystem, XP_AMOUNTS } from '../hooks/useXpSystem';
import GameChallengeModal from '../components/GameChallengeModal';
import LeaderboardModal from '../components/LeaderboardModal';
import XpBadge from '../components/XpBadge';
// Phase 2
import { useSharedNote } from '../hooks/useSharedNote';
import { useBookmarks } from '../hooks/useBookmarks';
import ThreadDrawer from '../components/ThreadDrawer';
import BookmarksModal from '../components/BookmarksModal';
import SharedNoteModal from '../components/SharedNoteModal';
// Phase 3
import { useGhostMode, useRoomExpiry, useRoomPasswordLock } from '../hooks/useRoomSecurity';
import RoomSecurityModal from '../components/RoomSecurityModal';
// Phase 4
import { useTodoList } from '../hooks/useTodoList';
import TodoListModal from '../components/TodoListModal';
import { useEvents } from '../hooks/useEvents';
import EventsModal from '../components/EventsModal';
import { useMusicPresence } from '../hooks/useMusicPresence';

interface Props {
  passkey: string;
  onBack: () => void;
  onBackToGame?: () => void;
}

const QUICK_EMOJIS = ['❤️', '😂', '🔥', '😮', '😢', '👍'];

const AVATAR_COLORS = ['#5865F2', '#23A55A', '#FEE75C', '#EB459E', '#ED4245', '#00A8FC', '#E67E22', '#9B59B6'];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Voice Note Waveform Visualizer ───────────────────────────────────────────
function VoiceNoteBubble({
  duration,
  isMe,
  timeStr,
  isReadByOthers,
  onLongPress,
}: {
  duration: number;
  isMe: boolean;
  timeStr: string;
  isReadByOthers: boolean;
  onLongPress?: () => void;
}) {
  const { theme } = useTheme();
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const durSec = duration || 4;

  useEffect(() => {
    let timer: any;
    if (playing) {
      timer = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= durSec) {
            setPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timer);
  }, [playing, durSec]);

  const togglePlay = () => setPlaying(!playing);

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={280}
      style={[
        styles.bubbleBase,
        isMe
          ? [styles.myBubble, { backgroundColor: theme.accent }]
          : [styles.theirBubble, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }],
        styles.voiceBubbleLayout,
      ]}
    >
      <View style={styles.voiceTopRow}>
        <TouchableOpacity
          onPress={togglePlay}
          style={[
            styles.voicePlayBtn,
            isMe ? styles.voicePlayBtnMe : [styles.voicePlayBtnThem, { backgroundColor: theme.accent }],
          ]}
          activeOpacity={0.75}
        >
          <Ionicons
            name={playing ? 'pause' : 'play'}
            size={13}
            color={isMe ? theme.accent : '#FFFFFF'}
            style={!playing ? { marginLeft: 2 } : {}}
          />
        </TouchableOpacity>

        <View style={styles.waveformRow}>
          {[14, 22, 10, 26, 18, 8, 24, 16, 28, 12, 20, 15, 25, 9, 19].map((h, i) => (
            <View
              key={i}
              style={[
                styles.waveBar,
                { height: playing ? Math.max(6, ((h + elapsed * 7 + i * 3) % 28) + 6) : h },
                isMe ? styles.waveBarMe : [styles.waveBarThem, { backgroundColor: theme.accent }],
              ]}
            />
          ))}
        </View>

        <Text style={[styles.voiceDuration, isMe ? styles.voiceDurMe : { color: theme.textMuted }]}>
          {playing ? `0:0${elapsed}` : `0:0${durSec}`}
        </Text>
      </View>

      <View style={styles.bubbleFooter}>
        <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>{timeStr}</Text>
        {isMe && (
          <View style={styles.checkIconWrap}>
            {isReadByOthers ? (
              <Ionicons name="checkmark-done" size={13} color="#23A55A" />
            ) : (
              <Feather name="check" size={12} color="rgba(255, 255, 255, 0.7)" />
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Single Message Item Component ────────────────────────────────────────────
function MessageBubbleItem({
  msg,
  isMe,
  showSenderHeader,
  onDoubleTap,
  onOpenActions,
  onReply,
  onPin,
  onStar,
  onEdit,
  onDelete,
  onReactionPress,
  onQuickReact,
  onVotePoll,
  onOpenViewOnce,
  onOpenImage,
  currentUserDisplayName,
}: {
  msg: Message;
  isMe: boolean;
  showSenderHeader: boolean;
  onDoubleTap: (msg: Message) => void;
  onOpenActions: (msg: Message) => void;
  onReply: (msg: Message) => void;
  onPin: (msg: Message) => void;
  onStar: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  onReactionPress: (msg: Message, emoji: string) => void;
  onQuickReact: (msg: Message, emoji: string) => void;
  onVotePoll: (msgId: string, optId: string) => void;
  onOpenViewOnce: (msg: Message) => void;
  onOpenImage: (imageUrl: string, senderName: string) => void;
  currentUserDisplayName: string | null;
}) {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const lastTapRef = useRef<number>(0);

  const senderName = msg.senderName || 'Anonymous';
  const initial = senderName.charAt(0).toUpperCase();
  const avatarBg = getAvatarColor(senderName);
  const timeStr = msg.createdAt ? format(msg.createdAt, 'h:mm a') : 'Just now';

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      onDoubleTap(msg);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const isDeleted = msg.isDeleted;
  const isReadByOthers = (msg.readBy || []).length > 1;

  return (
    <View
      style={[styles.messageRowWrap, isMe ? styles.rowWrapMe : styles.rowWrapThem]}
      // @ts-ignore - Web hover
      onMouseEnter={() => setIsHovered(true)}
      // @ts-ignore
      onMouseLeave={() => {
        setIsHovered(false);
        setShowEmojiPicker(false);
      }}
      // @ts-ignore - Web right-click
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenActions(msg);
      }}
    >
      {!isMe && (
        showSenderHeader ? (
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            {msg.senderAvatar ? (
              <Image source={{ uri: msg.senderAvatar }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
          </View>
        ) : (
          <View style={styles.avatarPlaceholder} />
        )
      )}

      <View style={[styles.bubbleCol, isMe ? styles.bubbleColMe : styles.bubbleColThem]}>
        {!isMe && showSenderHeader && (
          <Text style={[styles.theirSenderName, { color: avatarBg }]}>{senderName}</Text>
        )}

        <View style={styles.bubbleContainerWithToolbar}>
          {/* ── Hover Action Toolbar (Desktop) ──────────────────────────────── */}
          {(isHovered || showEmojiPicker) && !isDeleted && (
            <View
              style={[
                styles.hoverToolbar,
                { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle },
                isMe ? styles.hoverToolbarMe : styles.hoverToolbarThem,
              ]}
            >
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={() => onQuickReact(msg, '❤️')}
                accessibilityLabel="React Heart"
              >
                <Ionicons name="heart" size={13} color="#EF4444" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolBtn}
                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                accessibilityLabel="Add Reaction"
              >
                <Feather name="smile" size={13} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolBtn}
                onPress={() => onReply(msg)}
                accessibilityLabel="Reply"
              >
                <Feather name="corner-up-left" size={13} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolBtn}
                onPress={() => onStar(msg)}
                accessibilityLabel="Star"
              >
                <Ionicons name="star-outline" size={13} color="#FEE75C" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolBtn}
                onPress={() => onPin(msg)}
                accessibilityLabel="Pin"
              >
                <MaterialCommunityIcons name="pin-outline" size={13} color={theme.textMuted} />
              </TouchableOpacity>

              {isMe && (
                <TouchableOpacity
                  style={styles.toolBtn}
                  onPress={() => onEdit(msg)}
                  accessibilityLabel="Edit"
                >
                  <Feather name="edit-3" size={13} color={theme.textMuted} />
                </TouchableOpacity>
              )}

              {isMe && (
                <TouchableOpacity
                  style={styles.toolBtn}
                  onPress={() => onDelete(msg)}
                  accessibilityLabel="Delete"
                >
                  <Feather name="trash-2" size={13} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Pop-out 6-Emoji Reaction Bar ─────────────────────────────── */}
          {showEmojiPicker && (
            <View
              style={[
                styles.floatingEmojiBar,
                { backgroundColor: theme.bgCard, borderColor: theme.accent },
                isMe ? styles.floatingEmojiMe : styles.floatingEmojiThem,
              ]}
            >
              {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    onQuickReact(msg, emoji);
                    setShowEmojiPicker(false);
                  }}
                  style={styles.quickEmojiBtn}
                >
                  <Text style={styles.quickEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Message Bubble Types ─────────────────────────────────────── */}
          {msg.isViewOnce ? (
            /* Ephemeral View Once Message */
            <TouchableOpacity
              style={[styles.viewOnceBubble, { borderColor: theme.accent, backgroundColor: theme.bgCard }]}
              onPress={() => onOpenViewOnce(msg)}
              onLongPress={() => onOpenActions(msg)}
              delayLongPress={280}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={16} color={theme.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.viewOnceTitle, { color: theme.accent }]}>View Once Note</Text>
                <Text style={[styles.viewOnceSub, { color: theme.textMuted }]}>Tap to reveal (5s countdown)</Text>
              </View>
              <Feather name="lock" size={12} color={theme.textMuted} />
            </TouchableOpacity>
          ) : msg.poll ? (
            /* Interactive Poll Message */
            <PollMessageCard
              poll={msg.poll}
              userUid={isMe ? 'me' : 'other'}
              onVote={(optId) => onVotePoll(msg.id, optId)}
              isMe={isMe}
            />
          ) : msg.imageUrl ? (
            /* Photo / Image Message */
            <TouchableOpacity
              style={[styles.imageBubble, { borderColor: theme.borderSubtle, backgroundColor: theme.bgCard }]}
              onPress={() => onOpenImage(msg.imageUrl!, msg.senderName)}
              onLongPress={() => onOpenActions(msg)}
              delayLongPress={280}
              activeOpacity={0.85}
            >
              <Image source={{ uri: msg.imageUrl }} style={styles.bubblePhoto} resizeMode="cover" />
              <View style={styles.bubbleFooterOverlay}>
                <Text style={styles.photoTimeText}>{timeStr}</Text>
                {isMe && (
                  <View style={{ marginLeft: 3 }}>
                    <Ionicons name="checkmark-done" size={12} color="#23A55A" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ) : msg.gifUrl ? (
            /* Animated GIF Bubble */
            <Pressable
              onLongPress={() => onOpenActions(msg)}
              delayLongPress={280}
              style={[styles.gifBubble, { borderColor: theme.borderSubtle }]}
            >
              <Image source={{ uri: msg.gifUrl }} style={styles.gifBubbleImage} resizeMode="cover" />
              <View style={styles.bubbleFooter}>
                <Text style={[styles.timeText, styles.theirTime]}>{timeStr}</Text>
              </View>
            </Pressable>
          ) : msg.type === 'voice' ? (
            /* Interactive Voice Note Waveform Bubble */
            <VoiceNoteBubble
              duration={msg.voiceDuration || 4}
              isMe={isMe}
              timeStr={timeStr}
              isReadByOthers={isReadByOthers}
              onLongPress={() => onOpenActions(msg)}
            />
          ) : (
            /* Normal Text Message Bubble */
            <Pressable
              onPress={handleTap}
              onLongPress={() => onOpenActions(msg)}
              delayLongPress={280}
              style={[
                styles.bubbleBase,
                isMe ? [styles.myBubble, { backgroundColor: theme.accent }] : [styles.theirBubble, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }],
                msg.isVanish && styles.vanishBubbleGlow,
              ]}
            >
              {msg.replyTo && (
                <View style={[styles.quoteBox, isMe ? styles.quoteBoxMe : styles.quoteBoxThem]}>
                  <Text style={[styles.quoteAuthor, isMe ? styles.quoteAuthorMe : { color: theme.accent }]}>
                    {msg.replyTo.senderName}
                  </Text>
                  <Text style={styles.quoteText} numberOfLines={1}>
                    {msg.replyTo.text}
                  </Text>
                </View>
              )}

              <Text
                style={[
                  styles.messageText,
                  isMe ? styles.myText : { color: theme.textPrimary },
                  isDeleted && styles.deletedText,
                ]}
              >
                {msg.text}
              </Text>

              {/* Rich OpenGraph link preview if URL detected */}
              {!isDeleted && extractUrl(msg.text) && (
                <RichLinkPreview text={msg.text} />
              )}

              {/* Footer */}
              <View style={styles.bubbleFooter}>
                {msg.isVanish && (
                  <Text style={styles.vanishBadge}>vanish</Text>
                )}
                {msg.isEdited && !isDeleted && (
                  <Text style={[styles.editedBadge, isMe && styles.editedBadgeMe]}>edited</Text>
                )}
                <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>{timeStr}</Text>
                {isMe && !isDeleted && (
                  <View style={styles.checkIconWrap}>
                    {isReadByOthers ? (
                      <Ionicons name="checkmark-done" size={13} color="#23A55A" />
                    ) : (
                      <Feather name="check" size={12} color="rgba(255, 255, 255, 0.7)" />
                    )}
                  </View>
                )}
              </View>
            </Pressable>
          )}
        </View>

        {/* Discord-style Pill Reactions */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <View style={[styles.reactionsRow, isMe ? styles.reactionsMe : styles.reactionsThem]}>
            {Object.entries(msg.reactions).map(([emoji, users]) => {
              const count = Array.isArray(users) ? users.length : (typeof users === 'number' ? users : 1);
              if (count <= 0) return null;
              const hasReacted = Array.isArray(users) && currentUserDisplayName ? users.includes(currentUserDisplayName) : false;

              return (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.reactionBadge,
                    {
                      backgroundColor: hasReacted ? 'rgba(88, 101, 242, 0.22)' : theme.bgCard,
                      borderColor: hasReacted ? theme.accent : theme.borderSubtle,
                    },
                  ]}
                  onPress={() => onReactionPress(msg, emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text style={[styles.reactionCount, { color: hasReacted ? theme.accent : theme.textPrimary }]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main ChatScreen Component ────────────────────────────────────────────────
export default function ChatScreen({ passkey, onBack, onBackToGame }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { uid, displayName, photoURL } = useAuth();
  const { room, loading: roomLoading, pinMessage } = useRoom(passkey);
  const {
    messages,
    loading: msgsLoading,
    sendMessage,
    toggleReaction,
    editMessage,
    deleteMessage,
    markAsRead,
    votePoll,
    openViewOnce,
    wipeVanishMessages,
  } = useMessages(passkey, uid, displayName, photoURL);
  const { typingUsers, setTyping } = useTyping(passkey, uid, displayName);

  // WebRTC Voice
  const {
    isInCall,
    isMuted: isVoiceMuted,
    isVideoOn,
    isDeafened,
    participants: voiceParticipants,
    localStream,
    joinCall,
    leaveCall,
    toggleMute: toggleVoiceMute,
    toggleVideo,
    toggleDeafen,
  } = useVoiceCall(passkey, uid, displayName);

  // Watch Party
  const { watchParty, startWatchParty, updatePlayback, seekPlayback, closeWatchParty } =
    useWatchParty(passkey, uid, displayName);

  // ── Cinema Stages ──────────────────────────────────────────────────────────
  const {
    stages,
    activeStage,
    activeStageId,
    isHost: isStageHost,
    canControl: canControlStage,
    createStage,
    joinStage,
    leaveStage,
    closeStage,
    updatePlayback: updateStagePlayback,
    seekTo: seekStage,
    toggleDjMode,
    addToQueue,
    playNextInQueue,
    removeFromQueue,
  } = useMediaStages(passkey, uid, displayName, photoURL);

  const [stagesHubVisible, setStagesHubVisible] = useState(false);
  const [stageMinimized, setStageMinimized] = useState(false);
  const [stageQueueVisible, setStageQueueVisible] = useState(false);

  // Modals & States
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceModalMinimized, setVoiceModalMinimized] = useState(false);
  const [vanishMode, setVanishMode] = useState(false);
  const [viewOnceActive, setViewOnceActive] = useState(false);

  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [gifModalVisible, setGifModalVisible] = useState(false);
  const [starredModalVisible, setStarredModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeViewOnceMsg, setActiveViewOnceMsg] = useState<Message | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; sender: string } | null>(null);

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [attachMenuVisible, setAttachMenuVisible] = useState(false);

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // ── Games ──────────────────────────────────────────────────────────────────
  const {
    games,
    myActiveGame,
    pendingChallenge,
    challengeTicTacToe,
    challengeWordGuess,
    acceptGame,
    makeTicTacToeMove,
    guessLetter,
    dismissGame,
  } = useGameSession(passkey, uid, displayName);

  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [flipResult, setFlipResult] = useState<string | null>(null);

  // ── XP System ─────────────────────────────────────────────────────────────
  const {
    leaderboard,
    myXp,
    awardMessageXp,
    awardReactionXp,
  } = useXpSystem(passkey, uid, displayName);

  // ── Phase 2: Threads, Notes, Bookmarks ───────────────────────────────────
  const { note, updateNote } = useSharedNote(passkey, uid, displayName);
  const { bookmarks, addBookmark, removeBookmark, isBookmarked } = useBookmarks(uid);

  const [threadVisible, setThreadVisible] = useState(false);
  const [threadParentMsg, setThreadParentMsg] = useState<{ id: string; text: string; senderName: string } | null>(null);
  const [bookmarksVisible, setBookmarksVisible] = useState(false);
  const [sharedNoteVisible, setSharedNoteVisible] = useState(false);

  // ── Phase 3: Security ─────────────────────────────────────────────────────
  const { isGhost, toggleGhostMode } = useGhostMode();
  const { setExpiry } = useRoomExpiry(passkey);
  const { setRoomPassword, removeRoomPassword, verifyPassword } = useRoomPasswordLock(passkey);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const roomExpiresAt = (room as any)?.expiresAt ?? null;
  const roomHasPassword = Boolean((room as any)?.passwordHash);

  // ── Phase 4: Productivity & Music ─────────────────────────────────────────
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodoList(passkey, uid, displayName);
  const { events, createEvent, setRsvp, deleteEvent } = useEvents(passkey, uid, displayName);
  const { currentTrack, shareNowPlaying, clearNowPlaying } = useMusicPresence(passkey, uid, displayName);
  const [todosModalVisible, setTodosModalVisible] = useState(false);
  const [eventsModalVisible, setEventsModalVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = room?.createdBy === uid;
  const roomTitle = room?.displayName || passkey;

  useEffect(() => {
    if (!isGhost && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      markAsRead(lastMsg.id);
    }
  }, [messages, markAsRead, isGhost]);

  // Clean up vanish messages on exit
  useEffect(() => {
    return () => {
      wipeVanishMessages().catch(() => {});
    };
  }, [wipeVanishMessages]);

  const handleInputChange = (text: string) => {
    setInputText(text);
    setTyping(text.length > 0);
  };

  // ── Send Message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    if (editingMsg) {
      await editMessage(editingMsg.id, text);
      setEditingMsg(null);
      setInputText('');
      setTyping(false);
      return;
    }

    // ── Slash Commands ────────────────────────────────────────────────────
    if (text.startsWith('/flip')) {
      const result = Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🪙';
      setInputText('');
      setSending(true);
      try {
        await sendMessage(`🪙 Coin Flip → **${result}**`, null, 'text', { senderAvatar: photoURL || undefined });
        awardMessageXp();
      } finally { setSending(false); }
      return;
    }

    if (text.startsWith('/roll')) {
      const parts = text.split(' ');
      const max = parseInt(parts[1] ?? '100', 10) || 100;
      const roll = Math.floor(Math.random() * max) + 1;
      setInputText('');
      setSending(true);
      try {
        await sendMessage(`🎲 Dice Roll (1-${max}) → **${roll}**`, null, 'text', { senderAvatar: photoURL || undefined });
        awardMessageXp();
      } finally { setSending(false); }
      return;
    }

    if (text.startsWith('/leaderboard')) {
      setInputText('');
      setLeaderboardVisible(true);
      return;
    }

    if (text.startsWith('/todo')) {
      setInputText('');
      setTodosModalVisible(true);
      return;
    }

    if (text.startsWith('/events')) {
      setInputText('');
      setEventsModalVisible(true);
      return;
    }

    if (text.startsWith('/np')) {
      const song = text.replace('/np', '').trim();
      setInputText('');
      if (song) {
        shareNowPlaying(song);
        await sendMessage(`🎵 Listening to **${song}**`, null, 'text', { senderAvatar: photoURL || undefined });
        awardMessageXp();
      }
      return;
    }

    const ytId = extractYouTubeId(text);

    setInputText('');
    setSending(true);
    setTyping(false);

    try {
      await sendMessage(text, replyingTo, 'text', {
        isVanish: vanishMode,
        isViewOnce: viewOnceActive,
        senderAvatar: photoURL || undefined,
      });

      // Award XP for sending a message
      awardMessageXp();

      if (ytId && !watchParty) {
        startWatchParty(ytId, 'Shared YouTube Video');
      }

      setReplyingTo(null);
      setViewOnceActive(false);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [inputText, sending, editingMsg, replyingTo, vanishMode, viewOnceActive, watchParty, photoURL, startWatchParty, editMessage, sendMessage, setTyping, awardMessageXp]);

  // ── Photo Upload Handler ───────────────────────────────────────────────────
  const handlePhotoUpload = (e: any) => {
    if (Platform.OS === 'web') {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 3 * 1024 * 1024) {
          Alert.alert('Image too large', 'Please choose a photo under 3MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
          if (reader.result) {
            setAttachMenuVisible(false);
            await sendMessage('📷 Photo', null, 'image', {
              imageUrl: reader.result as string,
              isVanish: vanishMode,
              isViewOnce: viewOnceActive,
              senderAvatar: photoURL || undefined,
            });
            setViewOnceActive(false);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // ── Voice Recording ────────────────────────────────────────────────────────
  const startVoiceRecording = () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    voiceTimerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
  };

  const cancelVoiceRecording = () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const sendVoiceRecording = async () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    const duration = Math.max(1, recordingSeconds);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    await sendMessage('🎤 Voice Note', replyingTo, 'voice', { voiceDuration: duration, senderAvatar: photoURL || undefined });
    setReplyingTo(null);
  };

  const handleSendPoll = async (poll: PollData) => {
    await sendMessage(`📊 Poll: ${poll.question}`, null, 'poll', { poll, senderAvatar: photoURL || undefined });
  };

  const handleSendGif = async (gifUrl: string) => {
    await sendMessage('GIF', null, 'gif', { gifUrl, senderAvatar: photoURL || undefined });
  };

  const handleQuickReact = (msg: Message, emoji: string) => {
    if (displayName) toggleReaction(msg.id, emoji, displayName);
  };

  const handleDoubleTap = (msg: Message) => {
    handleQuickReact(msg, '❤️');
  };

  const handleStarAction = async (msg: Message) => {
    const isStarred = await toggleStarMessage(passkey, {
      id: msg.id,
      text: msg.text,
      senderName: msg.senderName,
    });
    Alert.alert(isStarred ? 'Saved to Starred!' : 'Removed from Starred');
  };

  const copyPasskey = useCallback(() => {
    Clipboard.setString(passkey);
    Alert.alert('Passkey Copied!', `"${passkey}" copied to clipboard.`);
  }, [passkey]);

  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  if (roomLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgDark }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: vanishMode ? '#100A17' : theme.bgDark,
          paddingTop: insets.top,
        },
        vanishMode && styles.vanishBorderGlow,
      ]}
    >
      <StatusBar barStyle="light-content" />

      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="chevron-left" size={24} color="#D1D5DB" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <Feather name="hash" size={15} color="#80848E" />
            <Text style={[styles.channelName, { color: theme.textPrimary }]} numberOfLines={1}>
              {roomTitle}
            </Text>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <MaterialCommunityIcons name="crown" size={11} color="#FEE75C" />
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
            )}
          </View>

          {/* Dynamic Island Status Pill */}
          <DynamicHeaderPill
            onlineCount={1}
            voiceCount={voiceParticipants.length}
            typingUsers={typingUsers}
            stageCount={stages.length}
            activeStageTitle={activeStage?.title ?? null}
            onStagePillPress={() => setStagesHubVisible(true)}
          />
        </View>

        {/* Action icons */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.bgCard }]}
            onPress={() => setSearchVisible(!searchVisible)}
            activeOpacity={0.75}
          >
            <Feather name="search" size={14} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.bgCard }]}
            onPress={() => setStarredModalVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="star-outline" size={14} color="#FEE75C" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              { backgroundColor: theme.bgCard },
              vanishMode && { backgroundColor: '#9333EA' },
            ]}
            onPress={() => setVanishMode(!vanishMode)}
            activeOpacity={0.75}
            accessibilityLabel="Vanish Mode"
          >
            <Ionicons name="eye-off-outline" size={14} color={vanishMode ? '#FFFFFF' : '#D1D5DB'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              { backgroundColor: theme.bgCard },
              isInCall && { backgroundColor: '#23A55A' },
            ]}
            onPress={() => {
              if (!isInCall) joinCall(false);
              setVoiceModalVisible(true);
              setVoiceModalMinimized(false);
            }}
            activeOpacity={0.75}
          >
            <Feather name="mic" size={14} color={isInCall ? '#FFFFFF' : '#D1D5DB'} />
          </TouchableOpacity>

          {/* Cinema Stages button */}
          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              { backgroundColor: stages.length > 0 ? '#1A0E1F' : theme.bgCard },
              stages.length > 0 && { borderWidth: 1, borderColor: '#FF6B6B' },
            ]}
            onPress={() => setStagesHubVisible(true)}
            activeOpacity={0.75}
            accessibilityLabel="Cinema Stages"
          >
            <MaterialCommunityIcons
              name="theater"
              size={14}
              color={stages.length > 0 ? '#FF6B6B' : '#D1D5DB'}
            />
          </TouchableOpacity>

          {/* Security button */}
          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              { backgroundColor: isGhost ? '#1A1A2E' : theme.bgCard },
              isGhost && { borderWidth: 1, borderColor: '#949BA4' },
            ]}
            onPress={() => setSecurityModalVisible(true)}
            activeOpacity={0.75}
            accessibilityLabel="Privacy & Security"
          >
            <Feather name="shield" size={14} color={isGhost ? '#949BA4' : '#D1D5DB'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.bgCard }]}
            onPress={() => setThemeModalVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="color-palette-outline" size={14} color="#D1D5DB" />
          </TouchableOpacity>

          {onBackToGame && (
            <TouchableOpacity
              onPress={onBackToGame}
              style={[styles.panicBtn, { backgroundColor: theme.bgCard }]}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="gamepad-variant-outline" size={15} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Search Bar ────────────────────────────────────────────────────── */}
      <SearchMessagesBar
        visible={searchVisible}
        query={searchQuery}
        onChangeQuery={setSearchQuery}
        onClose={() => {
          setSearchVisible(false);
          setSearchQuery('');
        }}
        matchCount={displayedMessages.length}
      />

      {/* ── Synced YouTube Watch Party Player ─────────────────────────────── */}
      {watchParty && (
        <WatchPartyPlayer
          watchParty={watchParty}
          userUid={uid}
          onUpdatePlayback={updatePlayback}
          onSeek={seekPlayback}
          onClose={closeWatchParty}
        />
      )}

      {/* ── Persistent Cinema Stage Player ────────────────────────────────── */}
      {activeStage && !stageMinimized && (
        <StageVideoPlayer
          stage={activeStage}
          minimized={false}
          isHost={isStageHost}
          canControl={canControlStage}
          currentUserUid={uid}
          onUpdatePlayback={updateStagePlayback}
          onSeek={seekStage}
          onLeave={leaveStage}
          onClose={closeStage}
          onToggleDjMode={toggleDjMode}
          onToggleMinimize={() => setStageMinimized(true)}
          onOpenQueue={() => setStageQueueVisible(true)}
          onOpenHub={() => setStagesHubVisible(true)}
        />
      )}
      {activeStage && stageMinimized && (
        <StageVideoPlayer
          stage={activeStage}
          minimized={true}
          isHost={isStageHost}
          canControl={canControlStage}
          currentUserUid={uid}
          onUpdatePlayback={updateStagePlayback}
          onSeek={seekStage}
          onLeave={leaveStage}
          onClose={closeStage}
          onToggleDjMode={toggleDjMode}
          onToggleMinimize={() => setStageMinimized(false)}
          onOpenQueue={() => setStageQueueVisible(true)}
          onOpenHub={() => setStagesHubVisible(true)}
        />
      )}

      {/* ── Music Presence Now Playing Banner ───────────────────────────────── */}
      {currentTrack && (
        <View style={[styles.nowPlayingBanner, { backgroundColor: '#1DB954' + '22', borderColor: '#1DB954' }]}>
          <Feather name="music" size={13} color="#1DB954" />
          <Text style={[styles.nowPlayingText, { color: theme.textPrimary }]} numberOfLines={1}>
            <Text style={{ fontWeight: '800', color: '#1DB954' }}>{currentTrack.sharedBy}</Text> is listening to{' '}
            <Text style={{ fontWeight: '800' }}>{currentTrack.title}</Text>
            {currentTrack.artist ? ` · ${currentTrack.artist}` : ''}
          </Text>
          <TouchableOpacity onPress={clearNowPlaying} style={{ padding: 2 }}>
            <Feather name="x" size={12} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Pinned Message Banner ─────────────────────────────────────────── */}
      {room?.pinnedMessage && (
        <View style={[styles.pinnedBanner, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
          <MaterialCommunityIcons name="pin-outline" size={15} color={theme.accent} />
          <View style={styles.pinnedContent}>
            <Text style={[styles.pinnedTitle, { color: theme.accent }]}>Pinned by {room.pinnedMessage.senderName}</Text>
            <Text style={[styles.pinnedSnippet, { color: theme.textPrimary }]} numberOfLines={1}>
              {room.pinnedMessage.text}
            </Text>
          </View>
          {isAdmin && (
            <TouchableOpacity onPress={() => pinMessage(null)} style={styles.unpinBtn} activeOpacity={0.7}>
              <Feather name="x" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Vanish Mode Glow Banner ───────────────────────────────────────── */}
      {vanishMode && (
        <View style={styles.vanishStatusBanner}>
          <Ionicons name="eye-off" size={13} color="#C084FC" />
          <Text style={styles.vanishStatusText}>
            Vanish Mode Active · Messages disappear when you leave
          </Text>
        </View>
      )}

      {/* ── Messages List ─────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {msgsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : displayedMessages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyHashCircle, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
              <Feather name="hash" size={28} color={theme.accent} />
            </View>
            <Text style={[styles.emptyWelcome, { color: theme.textPrimary }]}>Welcome to #{roomTitle}!</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
              This is the start of the #{roomTitle} channel. Long-press any message to react, reply, star, or pin!
            </Text>
            <TouchableOpacity onPress={copyPasskey} style={[styles.inviteCard, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]} activeOpacity={0.8}>
              <Feather name="key" size={13} color={theme.accent} />
              <Text style={[styles.inviteCardKey, { color: theme.accent }]}>{passkey}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayedMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            renderItem={({ item, index }) => {
              const isMyMessage = Boolean(
                (uid && item.senderUid === uid) ||
                (displayName && item.senderName && item.senderName.trim().toLowerCase() === displayName.trim().toLowerCase())
              );
              const prevMsg = index > 0 ? displayedMessages[index - 1] : null;
              const isSameSender = prevMsg && prevMsg.senderUid === item.senderUid;
              const showSenderHeader = !isSameSender;

              return (
                <MessageBubbleItem
                  msg={item}
                  isMe={isMyMessage}
                  showSenderHeader={showSenderHeader}
                  onDoubleTap={handleDoubleTap}
                  onOpenActions={(m) => {
                    setSelectedMsg(m);
                    setActionMenuVisible(true);
                  }}
                  onReply={(m) => setReplyingTo({ id: m.id, text: m.text, senderName: m.senderName })}
                  onPin={(m) => pinMessage({ id: m.id, text: m.text, senderName: m.senderName })}
                  onStar={handleStarAction}
                  onEdit={(m) => {
                    setEditingMsg(m);
                    setInputText(m.text);
                  }}
                  onDelete={(m) => deleteMessage(m.id)}
                  onReactionPress={(m, emoji) => displayName && toggleReaction(m.id, emoji, displayName)}
                  onQuickReact={handleQuickReact}
                  onVotePoll={(msgId, optId) => uid && votePoll(msgId, optId, uid)}
                  onOpenViewOnce={(m) => {
                    setActiveViewOnceMsg(m);
                    if (uid) openViewOnce(m.id, uid);
                  }}
                  onOpenImage={(url, sender) => setViewingImage({ url, sender })}
                  currentUserDisplayName={displayName}
                />
              );
            }}
          />
        )}

        {/* ── Replying / Editing Preview Banner ─────────────────────────────── */}
        {replyingTo && (
          <View style={[styles.replyBanner, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
            <View style={[styles.replyBarAccent, { backgroundColor: theme.accent }]} />
            <Feather name="corner-up-left" size={13} color={theme.accent} style={{ marginRight: 8 }} />
            <View style={styles.replyMeta}>
              <Text style={[styles.replyHeader, { color: theme.accent }]}>Replying to {replyingTo.senderName}</Text>
              <Text style={[styles.replyPreview, { color: theme.textPrimary }]} numberOfLines={1}>
                {replyingTo.text}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.closeReplyBtn}>
              <Feather name="x" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {editingMsg && (
          <View style={[styles.replyBanner, { backgroundColor: '#2B2516', borderColor: '#FEE75C' }]}>
            <View style={[styles.replyBarAccent, { backgroundColor: '#FEE75C' }]} />
            <Feather name="edit-3" size={13} color="#FEE75C" style={{ marginRight: 8 }} />
            <View style={styles.replyMeta}>
              <Text style={[styles.replyHeader, { color: '#FEE75C' }]}>Editing Message</Text>
              <Text style={[styles.replyPreview, { color: theme.textPrimary }]} numberOfLines={1}>
                {editingMsg.text}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setEditingMsg(null);
                setInputText('');
              }}
              style={styles.closeReplyBtn}
            >
              <Feather name="x" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {viewOnceActive && (
          <View style={styles.viewOnceNoticeBar}>
            <Ionicons name="eye-off" size={12} color="#EF4444" />
            <Text style={styles.viewOnceNoticeText}>Sending as 1-Time Ephemeral Note (5s self-destruct)</Text>
            <TouchableOpacity onPress={() => setViewOnceActive(false)}>
              <Feather name="x" size={12} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Input Bar ─────────────────────────────────────────────────────── */}
        <View style={[styles.inputContainer, { backgroundColor: theme.bgDark, paddingBottom: Math.max(insets.bottom, 10) }]}>
          {isRecordingVoice ? (
            <View style={[styles.recordingContainer, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
              <View style={styles.recordingPill}>
                <View style={styles.recordingDot} />
                <Text style={[styles.recordingTimer, { color: theme.textPrimary }]}>
                  Recording 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                </Text>
              </View>
              <TouchableOpacity onPress={cancelVoiceRecording} style={styles.cancelRecBtn}>
                <Text style={styles.cancelRecText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={sendVoiceRecording} style={[styles.sendVoiceBtn, { backgroundColor: theme.accent }]}>
                <Feather name="arrow-up" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.inputPill, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
              <TouchableOpacity
                style={[styles.attachBtn, { backgroundColor: theme.bgCard }]}
                onPress={() => setAttachMenuVisible(!attachMenuVisible)}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={16} color="#D1D5DB" />
              </TouchableOpacity>

              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder={editingMsg ? 'Edit message...' : `Message #${roomTitle}`}
                placeholderTextColor={theme.textMuted}
                value={inputText}
                onChangeText={handleInputChange}
                multiline
                maxLength={2000}
                onSubmitEditing={handleSend}
              />

              {inputText.trim() ? (
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: theme.accent }, sending && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={sending}
                  activeOpacity={0.85}
                >
                  <Feather name="arrow-up" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.micBtn, { backgroundColor: theme.bgCard }]}
                  onPress={startVoiceRecording}
                  activeOpacity={0.75}
                  accessibilityLabel="Voice note"
                >
                  <Feather name="mic" size={15} color="#D1D5DB" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Attachment Popup Dock ──────────────────────────────────────── */}
          {attachMenuVisible && (
            <View style={[styles.attachmentDock, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}>
              {/* 1. Photo / Image Picker */}
              {Platform.OS === 'web' && (
                <label style={{ cursor: 'pointer' } as any}>
                  <View style={styles.dockItem}>
                    <View style={[styles.dockIconCircle, { backgroundColor: '#8B5CF6' }]}>
                      <Feather name="image" size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.dockItemLabel, { color: theme.textPrimary }]}>Photo</Text>
                  </View>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}

              {/* 2. Poll */}
              <TouchableOpacity
                style={styles.dockItem}
                onPress={() => {
                  setAttachMenuVisible(false);
                  setPollModalVisible(true);
                }}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: '#3B82F6' }]}>
                  <Feather name="bar-chart-2" size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.dockItemLabel, { color: theme.textPrimary }]}>Poll</Text>
              </TouchableOpacity>

              {/* 3. GIF */}
              <TouchableOpacity
                style={styles.dockItem}
                onPress={() => {
                  setAttachMenuVisible(false);
                  setGifModalVisible(true);
                }}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: '#10B981' }]}>
                  <MaterialCommunityIcons name="file-gif-box" size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.dockItemLabel, { color: theme.textPrimary }]}>GIF</Text>
              </TouchableOpacity>

              {/* 4. View Once Note */}
              <TouchableOpacity
                style={styles.dockItem}
                onPress={() => {
                  setAttachMenuVisible(false);
                  setViewOnceActive(true);
                }}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: '#EC4899' }]}>
                  <Ionicons name="eye-off-outline" size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.dockItemLabel, { color: theme.textPrimary }]}>View Once</Text>
              </TouchableOpacity>

              {/* 5. Mini Games */}
              <TouchableOpacity
                style={styles.dockItem}
                onPress={() => {
                  setAttachMenuVisible(false);
                  setGameModalVisible(true);
                }}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: '#8B5CF6' }]}>
                  <MaterialCommunityIcons name="gamepad-variant" size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.dockItemLabel, { color: theme.textPrimary }]}>Games</Text>
              </TouchableOpacity>

              {/* 6. Leaderboard */}
              <TouchableOpacity
                style={styles.dockItem}
                onPress={() => {
                  setAttachMenuVisible(false);
                  setLeaderboardVisible(true);
                }}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: '#F59E0B' }]}>
                  <MaterialCommunityIcons name="trophy" size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.dockItemLabel, { color: theme.textPrimary }]}>Leaderboard</Text>
              </TouchableOpacity>

              {/* 7. Shared Note */}
              <TouchableOpacity
                style={styles.dockItem}
                onPress={() => {
                  setAttachMenuVisible(false);
                  setSharedNoteVisible(true);
                }}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: '#FEE75C' }]}>
                  <MaterialCommunityIcons name="note-text-outline" size={18} color="#000" />
                </View>
                <Text style={[styles.dockItemLabel, { color: theme.textPrimary }]}>Shared Note</Text>
              </TouchableOpacity>

              {/* 8. Bookmarks */}
              <TouchableOpacity
                style={styles.dockItem}
                onPress={() => {
                  setAttachMenuVisible(false);
                  setBookmarksVisible(true);
                }}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: '#06B6D4' }]}>
                  <Feather name="bookmark" size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.dockItemLabel, { color: theme.textPrimary }]}>Bookmarks</Text>
              </TouchableOpacity>

              {/* 9. Tasks */}
              <TouchableOpacity
                style={styles.dockItem}
                onPress={() => {
                  setAttachMenuVisible(false);
                  setTodosModalVisible(true);
                }}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: '#10B981' }]}>
                  <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.dockItemLabel, { color: theme.textPrimary }]}>Tasks</Text>
              </TouchableOpacity>

              {/* 10. Events */}
              <TouchableOpacity
                style={styles.dockItem}
                onPress={() => {
                  setAttachMenuVisible(false);
                  setEventsModalVisible(true);
                }}
              >
                <View style={[styles.dockIconCircle, { backgroundColor: '#F59E0B' }]}>
                  <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.dockItemLabel, { color: theme.textPrimary }]}>Events</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ── Action Menu Modal ──────────────────────────────────────────────── */}
      <Modal visible={actionMenuVisible} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setActionMenuVisible(false)}>
          <Pressable style={[styles.menuModal, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.menuHeaderTitle, { color: theme.textPrimary }]}>Message Actions</Text>

            <View style={[styles.emojiBar, { backgroundColor: theme.bgDark, borderColor: theme.borderSubtle }]}>
              {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    if (selectedMsg) handleQuickReact(selectedMsg, emoji);
                    setActionMenuVisible(false);
                  }}
                  style={styles.emojiBtn}
                  activeOpacity={0.6}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.menuOptionsList}>
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: theme.bgCard }]}
                onPress={() => {
                  if (selectedMsg) setReplyingTo({ id: selectedMsg.id, text: selectedMsg.text, senderName: selectedMsg.senderName });
                  setActionMenuVisible(false);
                }}
              >
                <Feather name="corner-up-left" size={16} color={theme.accent} style={{ marginRight: 12 }} />
                <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Reply</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: theme.bgCard }]}
                onPress={() => {
                  if (selectedMsg) handleStarAction(selectedMsg);
                  setActionMenuVisible(false);
                }}
              >
                <Ionicons name="star" size={16} color="#FEE75C" style={{ marginRight: 12 }} />
                <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Star Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: theme.bgCard }]}
                onPress={() => {
                  if (selectedMsg) pinMessage({ id: selectedMsg.id, text: selectedMsg.text, senderName: selectedMsg.senderName });
                  setActionMenuVisible(false);
                }}
              >
                <MaterialCommunityIcons name="pin-outline" size={16} color="#FEE75C" style={{ marginRight: 12 }} />
                <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Pin to Top</Text>
              </TouchableOpacity>

              {/* Thread Reply */}
              {selectedMsg && !selectedMsg.isDeleted && (
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: theme.bgCard }]}
                  onPress={() => {
                    if (selectedMsg) {
                      setThreadParentMsg({ id: selectedMsg.id, text: selectedMsg.text, senderName: selectedMsg.senderName });
                      setThreadVisible(true);
                    }
                    setActionMenuVisible(false);
                  }}
                >
                  <Feather name="message-square" size={16} color={theme.accent} style={{ marginRight: 12 }} />
                  <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Open Thread</Text>
                </TouchableOpacity>
              )}

              {/* Bookmark */}
              {selectedMsg && !selectedMsg.isDeleted && (
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: theme.bgCard }]}
                  onPress={() => {
                    if (selectedMsg) {
                      addBookmark(selectedMsg.id, selectedMsg.text, selectedMsg.senderName, passkey, roomTitle);
                    }
                    setActionMenuVisible(false);
                  }}
                >
                  <Feather
                    name={selectedMsg && isBookmarked(selectedMsg.id) ? 'bookmark' : 'bookmark'}
                    size={16}
                    color="#FEE75C"
                    style={{ marginRight: 12 }}
                  />
                  <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>
                    {selectedMsg && isBookmarked(selectedMsg.id) ? 'Bookmarked ✓' : 'Bookmark'}
                  </Text>
                </TouchableOpacity>
              )}

              {selectedMsg?.senderUid === uid && !selectedMsg?.isDeleted && (
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: theme.bgCard }]}
                  onPress={() => {
                    if (selectedMsg) {
                      setEditingMsg(selectedMsg);
                      setInputText(selectedMsg.text);
                    }
                    setActionMenuVisible(false);
                  }}
                >
                  <Feather name="edit-3" size={16} color={theme.textMuted} style={{ marginRight: 12 }} />
                  <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Edit Message</Text>
                </TouchableOpacity>
              )}

              {selectedMsg?.senderUid === uid && !selectedMsg?.isDeleted && (
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger, { backgroundColor: theme.bgCard }]}
                  onPress={() => {
                    if (selectedMsg) deleteMessage(selectedMsg.id);
                    setActionMenuVisible(false);
                  }}
                >
                  <Feather name="trash-2" size={16} color="#EF4444" style={{ marginRight: 12 }} />
                  <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Delete for Everyone</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Sub-Modals ─────────────────────────────────────────────────────── */}
      <VoiceCallModal
        visible={voiceModalVisible || isInCall}
        minimized={voiceModalMinimized}
        channelName={roomTitle}
        participants={voiceParticipants}
        isMuted={isVoiceMuted}
        isVideoOn={isVideoOn}
        isDeafened={isDeafened}
        localStream={localStream}
        onToggleMute={toggleVoiceMute}
        onToggleVideo={toggleVideo}
        onToggleDeafen={toggleDeafen}
        onLeaveCall={() => {
          leaveCall();
          setVoiceModalVisible(false);
          setVoiceModalMinimized(false);
        }}
        onToggleMinimize={() => setVoiceModalMinimized(!voiceModalMinimized)}
      />

      <CreatePollModal
        visible={pollModalVisible}
        onClose={() => setPollModalVisible(false)}
        onCreatePoll={handleSendPoll}
      />

      <GifPickerModal
        visible={gifModalVisible}
        onClose={() => setGifModalVisible(false)}
        onSelectGif={handleSendGif}
      />

      <StarredMessagesModal
        visible={starredModalVisible}
        passkey={passkey}
        onClose={() => setStarredModalVisible(false)}
      />

      <ThemeCustomizerModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />

      {activeViewOnceMsg && (
        <EphemeralViewOnce
          visible={!!activeViewOnceMsg}
          text={activeViewOnceMsg.text}
          senderName={activeViewOnceMsg.senderName}
          onFinish={() => {
            deleteMessage(activeViewOnceMsg.id);
            setActiveViewOnceMsg(null);
          }}
        />
      )}

      {viewingImage && (
        <ImageViewerModal
          visible={!!viewingImage}
          imageUrl={viewingImage.url}
          senderName={viewingImage.sender}
          onClose={() => setViewingImage(null)}
        />
      )}

      {/* ── Cinema Stages Hub Modal ────────────────────────────────────────── */}
      <MediaStagesHubModal
        visible={stagesHubVisible}
        stages={stages}
        onClose={() => setStagesHubVisible(false)}
        onTuneIn={(stageId) => {
          joinStage(stageId);
          setStageMinimized(false);
        }}
        onCreateStage={createStage}
        onCloseStage={closeStage}
        currentUserUid={uid}
      />

      {/* ── Stage Queue Modal ──────────────────────────────────────────────── */}
      {activeStage && stageQueueVisible && (
        <StageQueueModal
          visible={stageQueueVisible}
          stage={activeStage}
          canControl={canControlStage}
          currentUserUid={uid}
          currentUserName={displayName}
          onClose={() => setStageQueueVisible(false)}
          onAddToQueue={addToQueue}
          onPlayNext={playNextInQueue}
          onRemoveFromQueue={removeFromQueue}
        />
      )}

      {/* ── Pending Game Challenge Notification ───────────────────────────── */}
      {pendingChallenge && !gameModalVisible && (
        <TouchableOpacity
          style={styles.pendingChallengeBanner}
          onPress={() => setGameModalVisible(true)}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="gamepad-variant" size={16} color="#fff" />
          <Text style={styles.pendingChallengeText}>
            ⚔️ {pendingChallenge.challengerName} challenged you to{' '}
            {pendingChallenge.type === 'tictactoe' ? 'Tic-Tac-Toe' : 'Word Guess'}! Tap to play
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Game Challenge Modal ──────────────────────────────────────────── */}
      <GameChallengeModal
        visible={gameModalVisible}
        game={myActiveGame ?? pendingChallenge}
        userUid={uid}
        onClose={() => setGameModalVisible(false)}
        onAccept={acceptGame}
        onTicTacToeMove={makeTicTacToeMove}
        onWordGuess={guessLetter}
        onDismiss={dismissGame}
      />

      {/* ── Leaderboard Modal ─────────────────────────────────────────────── */}
      {leaderboardVisible && (
        <LeaderboardModal
          visible={leaderboardVisible}
          leaderboard={leaderboard}
          myXp={myXp}
          onClose={() => setLeaderboardVisible(false)}
        />
      )}

      {/* ── Thread Drawer ─────────────────────────────────────────────────── */}
      <ThreadDrawer
        visible={threadVisible}
        passkey={passkey}
        parentMessageId={threadParentMsg?.id ?? null}
        parentMessageText={threadParentMsg?.text ?? ''}
        parentSenderName={threadParentMsg?.senderName ?? ''}
        userUid={uid}
        userName={displayName}
        userAvatar={photoURL}
        onClose={() => setThreadVisible(false)}
      />

      {/* ── Bookmarks Modal ───────────────────────────────────────────────── */}
      {bookmarksVisible && (
        <BookmarksModal
          visible={bookmarksVisible}
          bookmarks={bookmarks}
          onClose={() => setBookmarksVisible(false)}
          onRemove={removeBookmark}
        />
      )}

      {/* ── Shared Note Modal ─────────────────────────────────────────────── */}
      {sharedNoteVisible && (
        <SharedNoteModal
          visible={sharedNoteVisible}
          note={note}
          onClose={() => setSharedNoteVisible(false)}
          onSave={updateNote}
        />
      )}

      {/* ── Room Security Modal ─────────────────────────────────────────────── */}
      <RoomSecurityModal
        visible={securityModalVisible}
        isAdmin={isAdmin}
        isGhost={isGhost}
        onToggleGhost={toggleGhostMode}
        expiresAt={roomExpiresAt}
        onSetExpiry={setExpiry}
        hasPassword={roomHasPassword}
        onSetPassword={setRoomPassword}
        onRemovePassword={removeRoomPassword}
        onVerifyPassword={verifyPassword}
        onClose={() => setSecurityModalVisible(false)}
      />

      {/* ── Tasks / Todo List Modal ───────────────────────────────────────── */}
      {todosModalVisible && (
        <TodoListModal
          visible={todosModalVisible}
          todos={todos}
          onAddTodo={addTodo}
          onToggleTodo={toggleTodo}
          onDeleteTodo={deleteTodo}
          onClose={() => setTodosModalVisible(false)}
        />
      )}

      {/* ── Events Planning Modal ─────────────────────────────────────────── */}
      {eventsModalVisible && (
        <EventsModal
          visible={eventsModalVisible}
          events={events}
          userUid={uid}
          onCreateEvent={createEvent}
          onSetRsvp={setRsvp}
          onDeleteEvent={deleteEvent}
          onClose={() => setEventsModalVisible(false)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vanishBorderGlow: {
    borderWidth: 1,
    borderColor: '#9333EA',
  },

  // Top Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: { width: 28, alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  channelName: { fontSize: 15, fontWeight: '700' },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#26241D',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(254, 231, 92, 0.2)',
  },
  adminBadgeText: { color: '#FEE75C', fontSize: 8.5, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerActionBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  panicBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  // Now Playing Banner
  nowPlayingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    gap: 8,
  },
  nowPlayingText: { flex: 1, fontSize: 11 },

  // Pinned Banner
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 10,
  },
  pinnedContent: { flex: 1 },
  pinnedTitle: { fontSize: 11, fontWeight: '700' },
  pinnedSnippet: { fontSize: 12, marginTop: 1 },
  unpinBtn: { padding: 4 },

  // Vanish Banner
  vanishStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E122C',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: '#9333EA',
  },
  pendingChallengeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#5865F2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 12,
    borderRadius: 12,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  pendingChallengeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  vanishStatusText: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '700',
  },

  // Messages List
  messageList: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12, gap: 4 },
  messageRowWrap: { flexDirection: 'row', marginVertical: 3, maxWidth: '88%', position: 'relative' },
  rowWrapMe: { alignSelf: 'flex-end' },
  rowWrapThem: { alignSelf: 'flex-start' },
  bubbleCol: { flexShrink: 1, position: 'relative' },
  bubbleColMe: { alignItems: 'flex-end' },
  bubbleColThem: { alignItems: 'flex-start' },

  bubbleContainerWithToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },

  hoverToolbar: {
    position: 'absolute',
    top: -30,
    flexDirection: 'row',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderWidth: 1,
    zIndex: 100,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  hoverToolbarMe: { right: 0 },
  hoverToolbarThem: { left: 0 },
  toolBtn: { padding: 4, borderRadius: 4 },

  floatingEmojiBar: {
    position: 'absolute',
    top: -40,
    flexDirection: 'row',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    zIndex: 110,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingEmojiMe: { right: 0 },
  floatingEmojiThem: { left: 0 },
  quickEmojiBtn: { padding: 2 },
  quickEmojiText: { fontSize: 18 },

  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8, alignSelf: 'flex-end', marginBottom: 2, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: 32, marginRight: 8 },
  avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  theirSenderName: { fontSize: 11, fontWeight: '700', marginBottom: 3, marginLeft: 4 },

  bubbleBase: { borderRadius: 18, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  myBubble: { borderBottomRightRadius: 4 },
  theirBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },
  messageText: { fontSize: 14.5, lineHeight: 20 },
  myText: { color: '#FFFFFF' },
  deletedText: { fontStyle: 'italic', opacity: 0.6 },

  vanishBubbleGlow: {
    borderWidth: 1,
    borderColor: '#A855F7',
    shadowColor: '#A855F7',
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },

  // Photo Bubble
  imageBubble: {
    width: 220,
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  bubblePhoto: {
    width: '100%',
    height: '100%',
  },
  bubbleFooterOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoTimeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },

  // Voice Note Bubble
  voiceBubbleLayout: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    minWidth: 210,
  },
  voiceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePlayBtnMe: {
    backgroundColor: '#FFFFFF',
  },
  voicePlayBtnThem: {},
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    flex: 1,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  waveBarMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  waveBarThem: {},
  voiceDuration: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  voiceDurMe: {
    color: '#FFFFFF',
  },

  // View Once Bubble
  viewOnceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: 200,
  },
  viewOnceTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  viewOnceSub: {
    fontSize: 10,
    marginTop: 1,
  },

  // GIF Bubble
  gifBubble: {
    width: 200,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  gifBubbleImage: {
    width: '100%',
    height: '100%',
  },

  // Quoted Reply Box
  quoteBox: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6, borderLeftWidth: 3 },
  quoteBoxMe: { backgroundColor: 'rgba(0, 0, 0, 0.25)', borderLeftColor: '#FFFFFF' },
  quoteBoxThem: { backgroundColor: '#101115' },
  quoteAuthor: { fontSize: 11, fontWeight: '700', marginBottom: 1 },
  quoteAuthorMe: { color: '#FFFFFF' },
  quoteText: { color: '#B5BAC1', fontSize: 12 },

  // Footer
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 },
  vanishBadge: { fontSize: 8.5, color: '#C084FC', fontWeight: '800', fontStyle: 'italic' },
  editedBadge: { fontSize: 9, color: '#949BA4', fontStyle: 'italic' },
  editedBadgeMe: { color: 'rgba(255, 255, 255, 0.6)' },
  timeText: { fontSize: 10, fontWeight: '500' },
  myTime: { color: 'rgba(255, 255, 255, 0.65)' },
  theirTime: { color: '#949BA4' },
  checkIconWrap: { marginLeft: 2 },

  // Discord-style Pill Reactions
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4, zIndex: 5 },
  reactionsMe: { justifyContent: 'flex-end' },
  reactionsThem: { justifyContent: 'flex-start' },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, fontWeight: '800' },

  // Empty Welcome
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  emptyHashCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1 },
  emptyWelcome: { fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  inviteCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1 },
  inviteCardKey: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },

  // Reply Banner
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  replyBarAccent: { width: 3, height: '100%', borderRadius: 2, marginRight: 10 },
  replyMeta: { flex: 1 },
  replyHeader: { fontSize: 11, fontWeight: '700' },
  replyPreview: { fontSize: 12 },
  closeReplyBtn: { padding: 6 },

  viewOnceNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A1117',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderColor: '#EF4444',
  },
  viewOnceNoticeText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },

  // Input Bar
  inputContainer: { paddingHorizontal: 12, paddingTop: 6, position: 'relative' },
  inputPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  attachBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  input: { flex: 1, minHeight: 38, maxHeight: 100, fontSize: 14, paddingVertical: 8 },
  sendBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  sendBtnDisabled: { opacity: 0.3 },
  micBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },

  // Attachment Dock Popup
  attachmentDock: {
    position: 'absolute',
    bottom: 56,
    left: 12,
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  dockItem: {
    alignItems: 'center',
    gap: 4,
  },
  dockIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockItemLabel: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Recording View
  recordingContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 10, borderWidth: 1 },
  recordingPill: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  recordingTimer: { fontSize: 14, fontWeight: '700' },
  cancelRecBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  cancelRecText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  sendVoiceBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Action Menu Modal
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  menuModal: { borderRadius: 16, width: '100%', maxWidth: 340, padding: 18, borderWidth: 1 },
  menuHeaderTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  emojiBar: { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 24, paddingVertical: 8, paddingHorizontal: 6, marginBottom: 14, borderWidth: 1 },
  emojiBtn: { padding: 6 },
  emojiText: { fontSize: 22 },
  menuOptionsList: { gap: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10 },
  menuItemDanger: { marginTop: 4, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  menuItemText: { fontSize: 14, fontWeight: '600' },
});
