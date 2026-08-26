import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, setDoc, getDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import ThemeCustomizerModal from '../components/ThemeCustomizerModal';
import EditProfileModal from '../components/EditProfileModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// ─── 3 Random Words Passkey Generator ──────────────────────────────────────────
const ADJECTIVES = [
  'fluffy', 'swift', 'cozy', 'brave', 'silent', 'happy', 'golden', 'bright',
  'clever', 'gentle', 'lucky', 'mighty', 'wild', 'solar', 'velvet', 'frosty',
  'shadow', 'cosmic', 'amber', 'crisp', 'silver', 'sunny', 'quiet', 'snug',
  'breezy', 'mystic', 'neon', 'chill', 'spark', 'pure', 'lively', 'noble'
];

const COLORS_ELEMENTS = [
  'blue', 'red', 'green', 'pink', 'purple', 'orange', 'cyan', 'cloud',
  'star', 'river', 'forest', 'ocean', 'mountain', 'feather', 'breeze', 'moon',
  'sun', 'meadow', 'crystal', 'leaf', 'sky', 'rain', 'dawn', 'dusk',
  'frost', 'ember', 'glade', 'wave', 'grove', 'stone', 'bloom', 'mist'
];

const NOUNS = [
  'bird', 'tiger', 'panda', 'fox', 'koala', 'rabbit', 'otter', 'dolphin',
  'wolf', 'falcon', 'bear', 'lion', 'owl', 'badger', 'deer', 'cat',
  'seal', 'hawk', 'finch', 'sparrow', 'robin', 'lynx', 'beaver', 'swan',
  'crane', 'heron', 'duck', 'hedgehog', 'ferret', 'chinchilla', 'penguin', 'gecko'
];

function getRandomItem(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generatePasskey(): string {
  const adj = getRandomItem(ADJECTIVES);
  const elem = getRandomItem(COLORS_ELEMENTS);
  const noun = getRandomItem(NOUNS);
  return `${adj}-${elem}-${noun}`;
}

const AVATAR_COLORS = ['#5865F2', '#23A55A', '#FEE75C', '#EB459E', '#ED4245', '#00A8FC', '#E67E22', '#9B59B6'];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const JOINED_ROOMS_KEY = '@fluffy/joinedRooms';

export interface JoinedRoom {
  passkey: string;
  displayName: string;
  joinedAt?: string;
}

interface Props {
  onNavigateToChat: (passkey: string) => void;
  onBackToGame: () => void;
}

export default function RoomsScreen({ onNavigateToChat, onBackToGame }: Props) {
  const { theme } = useTheme();
  const { uid, displayName, photoURL, loading: authLoading, updateProfile } = useAuth();
  const [joinedRooms, setJoinedRooms] = useState<JoinedRoom[]>([]);

  // Modals state
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinInput, setJoinInput] = useState('');

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [serverNameInput, setServerNameInput] = useState('');
  const [generatedPasskey, setGeneratedPasskey] = useState(generatePasskey());

  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // 1. Load cached rooms from local storage
  useEffect(() => {
    AsyncStorage.getItem(JOINED_ROOMS_KEY).then((raw) => {
      if (raw) {
        try {
          setJoinedRooms(JSON.parse(raw));
        } catch (_) {}
      }
    });
  }, []);

  // 2. Real-time sync with Firestore subcollection users/{uid}/joinedRooms
  useEffect(() => {
    if (!uid) return;

    const roomsSubRef = collection(db, 'users', uid, 'joinedRooms');
    const unsub = onSnapshot(
      roomsSubRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: JoinedRoom[] = snapshot.docs.map((d) => ({
            passkey: d.id,
            displayName: d.data().displayName || d.id,
            joinedAt: d.data().joinedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          }));
          setJoinedRooms(list);
          AsyncStorage.setItem(JOINED_ROOMS_KEY, JSON.stringify(list));
        }
      },
      (err) => {
        console.warn('Firestore joinedRooms listener warning:', err.message);
      }
    );

    return unsub;
  }, [uid]);

  // Show profile prompt on first launch if unset
  useEffect(() => {
    if (!authLoading && !displayName) {
      setEditProfileModalVisible(true);
    }
  }, [authLoading, displayName]);

  const saveJoinedRoom = useCallback(
    async (room: JoinedRoom) => {
      setJoinedRooms((prev) => {
        const filtered = prev.filter((r) => r.passkey.toLowerCase() !== room.passkey.toLowerCase());
        const next = [room, ...filtered].slice(0, 30);
        AsyncStorage.setItem(JOINED_ROOMS_KEY, JSON.stringify(next));
        return next;
      });

      if (uid) {
        try {
          await setDoc(
            doc(db, 'users', uid, 'joinedRooms', room.passkey),
            {
              displayName: room.displayName,
              joinedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn('Failed to sync joined room to Firestore:', e);
        }
      }
    },
    [uid]
  );

  const openCreateModal = () => {
    const freshPasskey = generatePasskey();
    setGeneratedPasskey(freshPasskey);
    const defaultName = displayName ? `${displayName}'s Server` : 'Secret Squad';
    setServerNameInput(defaultName);
    setCreateModalVisible(true);
  };

  const handleCreateServer = useCallback(async () => {
    if (!uid) return;
    const finalServerName = serverNameInput.trim() || 'My Server';
    const passkey = generatedPasskey.trim().toLowerCase();

    setCreating(true);
    try {
      await setDoc(doc(db, 'rooms', passkey), {
        displayName: finalServerName,
        createdAt: serverTimestamp(),
        createdBy: uid,
      });

      const room: JoinedRoom = {
        passkey,
        displayName: finalServerName,
        joinedAt: new Date().toISOString(),
      };

      await saveJoinedRoom(room);
      setCreateModalVisible(false);
      onNavigateToChat(passkey);
    } catch (e: any) {
      console.error('Room creation error:', e);
      Alert.alert('Error', e?.message ?? 'Failed to create server');
    } finally {
      setCreating(false);
    }
  }, [uid, serverNameInput, generatedPasskey, saveJoinedRoom, onNavigateToChat]);

  const handleJoin = useCallback(async () => {
    const pk = joinInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (!pk) return;
    setJoining(true);
    try {
      const snap = await getDoc(doc(db, 'rooms', pk));
      if (!snap.exists()) {
        Alert.alert('Server Not Found', 'No server found with that passkey. Double-check the 3 words.');
        setJoining(false);
        return;
      }
      const data = snap.data();
      const room: JoinedRoom = {
        passkey: pk,
        displayName: data?.displayName ?? pk,
        joinedAt: new Date().toISOString(),
      };
      await saveJoinedRoom(room);
      setJoinModalVisible(false);
      setJoinInput('');
      onNavigateToChat(pk);
    } catch (e: any) {
      console.error('Room join error:', e);
      Alert.alert('Error', e?.message ?? 'Failed to join server');
    } finally {
      setJoining(false);
    }
  }, [joinInput, saveJoinedRoom, onNavigateToChat]);

  const userInitial = (displayName || 'U').charAt(0).toUpperCase();
  const avatarBg = getAvatarColor(displayName || 'User');

  if (authLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgDark }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgDark }]} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      {/* ── Top Obsidian Profile Bar ──────────────────────────────────────── */}
      <View style={[styles.topBar, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
        <TouchableOpacity
          style={styles.userProfile}
          onPress={() => setEditProfileModalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{userInitial}</Text>
            )}
            <View style={[styles.onlineBadge, { borderColor: theme.bgSurface }]} />
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameEditRow}>
              <Text style={[styles.userName, { color: theme.textPrimary }]}>{displayName || 'Anonymous'}</Text>
              <Feather name="edit-2" size={11} color={theme.textMuted} />
            </View>
            <View style={styles.statusRow}>
              <Feather name="radio" size={10} color="#23A55A" />
              <Text style={[styles.userTag, { color: theme.textMuted }]}>
                Online · {joinedRooms.length} server{joinedRooms.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            onPress={() => setThemeModalVisible(true)}
            style={[styles.iconActionBtn, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}
            activeOpacity={0.75}
          >
            <Ionicons name="color-palette-outline" size={15} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onBackToGame}
            style={[styles.panicButton, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}
            activeOpacity={0.75}
            accessibilityLabel="Back to Flappy Bird"
          >
            <MaterialCommunityIcons name="gamepad-variant-outline" size={16} color="#E4E7EB" />
            <Text style={[styles.panicText, { color: theme.textPrimary }]}>Play</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Action Section ─────────────────────────────────────────────────── */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.accent }]}
          onPress={openCreateModal}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create Server</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}
          onPress={() => setJoinModalVisible(true)}
          activeOpacity={0.85}
        >
          <Feather name="key" size={15} color="#D1D5DB" />
          <Text style={styles.joinBtnText}>Enter Passkey</Text>
        </TouchableOpacity>
      </View>

      {/* ── Section Header ─────────────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>YOUR SERVERS & CHANNELS</Text>
        <View style={[styles.countBadge, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.countBadgeText, { color: theme.textMuted }]}>{joinedRooms.length} ACTIVE</Text>
        </View>
      </View>

      {/* ── Server Channels List ───────────────────────────────────────────── */}
      {joinedRooms.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}>
            <Feather name="message-square" size={26} color={theme.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No servers yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Create your custom server or enter a 3-word passkey to join your friends.
          </Text>
          <TouchableOpacity
            style={[styles.emptyCreateBtn, { backgroundColor: theme.accent }]}
            onPress={openCreateModal}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.emptyCreateBtnText}>Create Your First Server</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={joinedRooms}
          keyExtractor={(item) => item.passkey}
          contentContainerStyle={styles.roomList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.serverCard, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}
              onPress={() => onNavigateToChat(item.passkey)}
              activeOpacity={0.7}
            >
              <View style={styles.serverCardLeft}>
                <View style={[styles.hashBadge, { backgroundColor: theme.bgSurface }]}>
                  <Feather name="hash" size={15} color="#80848E" />
                </View>
                <View style={styles.serverMeta}>
                  <Text style={[styles.serverTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  <View style={styles.passkeyPill}>
                    <Feather name="key" size={10} color={theme.textMuted} />
                    <Text style={[styles.passkeyText, { color: theme.textMuted }]}>{item.passkey}</Text>
                  </View>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── Create Server Modal ────────────────────────────────────────────── */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setCreateModalVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={[styles.headerIconCircle, { backgroundColor: theme.bgCard }]}>
                <Ionicons name="sparkles-outline" size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Customize Your Server</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>You will be the admin of this channel.</Text>
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>SERVER NAME</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.bgDark, color: theme.textPrimary, borderColor: theme.borderSubtle }]}
              placeholder="e.g. Rachit's Squad, Gaming Den"
              placeholderTextColor="#6B7280"
              value={serverNameInput}
              onChangeText={setServerNameInput}
              maxLength={36}
              autoFocus
            />

            <View style={[styles.passkeyCard, { backgroundColor: theme.bgDark, borderColor: theme.borderSubtle }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>SECRET 3-WORD PASSKEY</Text>
                <Text style={[styles.generatedPasskeyText, { color: theme.accent }]}>{generatedPasskey}</Text>
              </View>
              <TouchableOpacity
                style={[styles.refreshPasskeyBtn, { backgroundColor: theme.bgCard }]}
                onPress={() => setGeneratedPasskey(generatePasskey())}
                activeOpacity={0.7}
              >
                <Feather name="rotate-cw" size={14} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.modalSubmitBtn,
                { backgroundColor: theme.accent },
                (!serverNameInput.trim() || creating) && styles.btnDisabled,
              ]}
              disabled={!serverNameInput.trim() || creating}
              onPress={handleCreateServer}
              activeOpacity={0.85}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitText}>Create Server</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Enter Passkey Modal ────────────────────────────────────────────── */}
      <Modal visible={joinModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setJoinModalVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={[styles.headerIconCircle, { backgroundColor: theme.bgCard }]}>
                <Feather name="key" size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Join Private Server</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>Enter the 3-word passkey (e.g. swift-cloud-river)</Text>
              </View>
            </View>

            <TextInput
              style={[
                styles.modalInput,
                styles.passkeyInput,
                { backgroundColor: theme.bgDark, color: theme.textPrimary, borderColor: theme.borderSubtle },
              ]}
              placeholder="word1-word2-word3"
              placeholderTextColor="#6B7280"
              value={joinInput}
              onChangeText={setJoinInput}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />

            <TouchableOpacity
              style={[
                styles.modalSubmitBtn,
                { backgroundColor: theme.accent },
                (joining || !joinInput.trim()) && styles.btnDisabled,
              ]}
              disabled={joining || !joinInput.trim()}
              onPress={handleJoin}
              activeOpacity={0.85}
            >
              {joining ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitText}>Join Server</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Edit Profile & Avatar Modal ────────────────────────────────────── */}
      <EditProfileModal
        visible={editProfileModalVisible}
        currentName={displayName || ''}
        currentPhotoURL={photoURL}
        onClose={() => setEditProfileModalVisible(false)}
        onSave={async (name, photo) => {
          await updateProfile(name, photo);
        }}
      />

      {/* ── Theme Customizer Modal ─────────────────────────────────────────── */}
      <ThemeCustomizerModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#23A55A',
    borderWidth: 2,
  },
  userInfo: {
    justifyContent: 'center',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  userTag: {
    fontSize: 11,
    fontWeight: '500',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  panicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  panicText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Actions
  actionSection: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  joinBtnText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '700',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Server Cards
  roomList: {
    paddingHorizontal: 14,
    gap: 8,
    paddingBottom: 24,
  },
  serverCard: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  serverCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  hashBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverMeta: {
    flex: 1,
  },
  serverTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  passkeyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  passkeyText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
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
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  passkeyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 18,
    borderWidth: 1,
  },
  generatedPasskeyText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  refreshPasskeyBtn: {
    padding: 8,
    borderRadius: 8,
  },
  passkeyInput: {
    fontFamily: 'monospace',
    textAlign: 'center',
    fontSize: 15,
    letterSpacing: 1,
  },
  modalSubmitBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
