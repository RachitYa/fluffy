import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  Pressable,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import {
  ExpiryOption,
  EXPIRY_LABELS,
  formatCountdown,
} from '../hooks/useRoomSecurity';

interface Props {
  visible: boolean;
  isAdmin: boolean;
  isGhost: boolean;
  onToggleGhost: () => void;
  expiresAt: number | null;
  onSetExpiry: (option: ExpiryOption) => Promise<void>;
  hasPassword: boolean;
  onSetPassword: (password: string) => Promise<void>;
  onRemovePassword: () => Promise<void>;
  onVerifyPassword: (password: string) => Promise<boolean>;
  onClose: () => void;
}

const EXPIRY_OPTIONS: ExpiryOption[] = ['never', '1h', '24h', '7d', '30d'];

export default function RoomSecurityModal({
  visible,
  isAdmin,
  isGhost,
  onToggleGhost,
  expiresAt,
  onSetExpiry,
  hasPassword,
  onSetPassword,
  onRemovePassword,
  onVerifyPassword,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const [passwordInput, setPasswordInput] = useState('');
  const [verifyInput, setVerifyInput] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  if (!visible) return null;

  const handleSavePassword = async () => {
    if (!passwordInput.trim()) return;
    setSavingPassword(true);
    await onSetPassword(passwordInput.trim());
    setPasswordInput('');
    setShowPasswordSection(false);
    setSavingPassword(false);
    Alert.alert('🔐 Password Set', 'The room is now locked. Share the password with trusted members.');
  };

  const handleRemovePassword = async () => {
    Alert.alert('Remove Password?', 'Anyone will be able to join without a password.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await onRemovePassword();
        },
      },
    ]);
  };

  const handleSetExpiry = async (option: ExpiryOption) => {
    setSavingExpiry(true);
    await onSetExpiry(option);
    setSavingExpiry(false);
    if (option !== 'never') {
      Alert.alert('⏳ Expiry Set', `Room will self-destruct in ${EXPIRY_LABELS[option]}.`);
    }
  };

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable
        style={[styles.modal, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}
        onPress={(e) => e.stopPropagation()}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Feather name="shield" size={18} color={theme.accent} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Privacy & Security</Text>
          <TouchableOpacity onPress={onClose} style={{ marginLeft: 'auto' }}>
            <Feather name="x" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* ── Ghost Mode ──────────────────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>👻</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Ghost Mode</Text>
                <Text style={[styles.sectionSubtext, { color: theme.textMuted }]}>
                  Browse without triggering read receipts
                </Text>
              </View>
              <Switch
                value={isGhost}
                onValueChange={onToggleGhost}
                trackColor={{ false: theme.bgDark, true: theme.accent }}
                thumbColor={isGhost ? '#fff' : '#949BA4'}
              />
            </View>
            {isGhost && (
              <View style={[styles.ghostActiveBadge, { backgroundColor: 'rgba(148,155,164,0.12)', borderColor: '#949BA4' }]}>
                <Text style={[styles.ghostActivText, { color: '#949BA4' }]}>
                  👻 You are invisible · Others won't see your read receipts
                </Text>
              </View>
            )}
          </View>

          {/* ── Auto-Expiring Room (admin only) ──────────────────────────── */}
          {isAdmin && (
            <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>⏳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Auto-Expiring Room</Text>
                  <Text style={[styles.sectionSubtext, { color: theme.textMuted }]}>
                    Room self-destructs after chosen time
                  </Text>
                </View>
              </View>

              {expiresAt && (
                <View style={[styles.countdownBadge, { backgroundColor: 'rgba(237,66,69,0.1)', borderColor: '#ED4245' }]}>
                  <Feather name="clock" size={12} color="#ED4245" />
                  <Text style={[styles.countdownText, { color: '#ED4245' }]}>
                    Expires in: {formatCountdown(expiresAt)}
                  </Text>
                </View>
              )}

              <View style={styles.expiryGrid}>
                {EXPIRY_OPTIONS.map((opt) => {
                  const isActive = opt === 'never' ? !expiresAt : false;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.expiryBtn,
                        { backgroundColor: theme.bgDark, borderColor: theme.borderSubtle },
                        opt !== 'never' && { borderColor: '#ED4245' },
                        savingExpiry && { opacity: 0.5 },
                      ]}
                      onPress={() => handleSetExpiry(opt)}
                      disabled={savingExpiry}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.expiryBtnText, { color: opt === 'never' ? theme.textMuted : '#ED4245' }]}>
                        {EXPIRY_LABELS[opt]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Room Password Lock (admin only) ──────────────────────────── */}
          {isAdmin && (
            <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>🔐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Room Password Lock</Text>
                  <Text style={[styles.sectionSubtext, { color: theme.textMuted }]}>
                    Require a password on top of the passkey
                  </Text>
                </View>
                {hasPassword && (
                  <View style={[styles.lockedBadge, { backgroundColor: 'rgba(35,165,90,0.12)' }]}>
                    <Feather name="lock" size={11} color="#23A55A" />
                    <Text style={[styles.lockedText, { color: '#23A55A' }]}>LOCKED</Text>
                  </View>
                )}
              </View>

              {hasPassword ? (
                <TouchableOpacity
                  style={[styles.removePasswordBtn, { borderColor: '#EF4444' }]}
                  onPress={handleRemovePassword}
                  activeOpacity={0.7}
                >
                  <Feather name="unlock" size={14} color="#EF4444" />
                  <Text style={[styles.removePasswordText, { color: '#EF4444' }]}>Remove Password</Text>
                </TouchableOpacity>
              ) : showPasswordSection ? (
                <View style={styles.passwordForm}>
                  <TextInput
                    style={[styles.passwordInput, { backgroundColor: theme.bgDark, color: theme.textPrimary, borderColor: theme.borderSubtle }]}
                    placeholder="Set room password..."
                    placeholderTextColor={theme.textMuted}
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    secureTextEntry
                    autoFocus
                  />
                  <View style={styles.passwordFormActions}>
                    <TouchableOpacity
                      style={[styles.cancelBtn, { borderColor: theme.borderSubtle }]}
                      onPress={() => { setShowPasswordSection(false); setPasswordInput(''); }}
                    >
                      <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.savePasswordBtn, { backgroundColor: theme.accent, opacity: !passwordInput.trim() || savingPassword ? 0.5 : 1 }]}
                      onPress={handleSavePassword}
                      disabled={!passwordInput.trim() || savingPassword}
                      activeOpacity={0.8}
                    >
                      <Feather name="lock" size={13} color="#fff" />
                      <Text style={styles.savePasswordBtnText}>{savingPassword ? 'Saving…' : 'Lock Room'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.setPasswordBtn, { backgroundColor: theme.bgDark, borderColor: theme.borderSubtle }]}
                  onPress={() => setShowPasswordSection(true)}
                  activeOpacity={0.7}
                >
                  <Feather name="lock" size={14} color={theme.accent} />
                  <Text style={[styles.setPasswordBtnText, { color: theme.accent }]}>Set Room Password</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Info for non-admins ──────────────────────────────────────── */}
          {!isAdmin && (
            <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}>
              <Text style={[styles.sectionSubtext, { color: theme.textMuted, textAlign: 'center' }]}>
                🛡️ Room expiry and password settings are admin-only.{'\n'}Ghost mode is available to all members.
              </Text>
            </View>
          )}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    zIndex: 300,
  },
  modal: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  headerTitle: { fontSize: 17, fontWeight: '800' },

  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionEmoji: { fontSize: 22 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  sectionSubtext: { fontSize: 11, lineHeight: 16 },

  ghostActiveBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ghostActivText: { fontSize: 11, fontWeight: '600' },

  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countdownText: { fontSize: 12, fontWeight: '700' },

  expiryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  expiryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  expiryBtnText: { fontSize: 12, fontWeight: '700' },

  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lockedText: { fontSize: 10, fontWeight: '800' },

  passwordForm: { gap: 8 },
  passwordInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  passwordFormActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '700' },
  savePasswordBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  savePasswordBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  setPasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  setPasswordBtnText: { fontSize: 13, fontWeight: '700' },

  removePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  removePasswordText: { fontSize: 13, fontWeight: '700' },
});
