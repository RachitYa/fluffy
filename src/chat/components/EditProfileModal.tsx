import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Image,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export const AVATAR_PRESETS = [
  { id: 'bird', name: 'Flappy Bird', url: 'https://api.dicebear.com/7.x/bottts/png?seed=FlappyBird&backgroundColor=5865F2' },
  { id: 'ninja', name: 'Cyber Ninja', url: 'https://api.dicebear.com/7.x/bottts/png?seed=CyberNinja&backgroundColor=23A55A' },
  { id: 'fox', name: 'Mystic Fox', url: 'https://api.dicebear.com/7.x/bottts/png?seed=MysticFox&backgroundColor=A855F7' },
  { id: 'cat', name: 'Neon Cat', url: 'https://api.dicebear.com/7.x/bottts/png?seed=NeonCat&backgroundColor=EC4899' },
  { id: 'panda', name: 'Space Panda', url: 'https://api.dicebear.com/7.x/bottts/png?seed=SpacePanda&backgroundColor=06B6D4' },
  { id: 'tiger', name: 'Fire Tiger', url: 'https://api.dicebear.com/7.x/bottts/png?seed=FireTiger&backgroundColor=E67E22' },
  { id: 'robot', name: 'Mecha Bot', url: 'https://api.dicebear.com/7.x/bottts/png?seed=MechaBot&backgroundColor=ED4245' },
  { id: 'shiba', name: 'Golden Shiba', url: 'https://api.dicebear.com/7.x/bottts/png?seed=GoldenShiba&backgroundColor=FEE75C' },
];

interface Props {
  visible: boolean;
  currentName: string;
  currentPhotoURL: string | null;
  onClose: () => void;
  onSave: (name: string, photoURL?: string) => Promise<void>;
}

export default function EditProfileModal({
  visible,
  currentName,
  currentPhotoURL,
  onClose,
  onSave,
}: Props) {
  const { theme } = useTheme();
  const [name, setName] = useState(currentName || '');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(currentPhotoURL);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(currentName || '');
      setSelectedPhoto(currentPhotoURL);
    }
  }, [visible, currentName, currentPhotoURL]);

  const handleFileUpload = (e: any) => {
    if (Platform.OS === 'web') {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          Alert.alert('Image too large', 'Please choose a photo under 2MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            setSelectedPhoto(reader.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSave(trimmed, selectedPhoto || undefined);
      onClose();
    } finally {
      setSaving(false);
    }
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
            <Ionicons name="person-circle-outline" size={22} color={theme.accent} />
            <Text style={[styles.title, { color: theme.textPrimary }]}>Edit Profile & Photo</Text>
          </View>

          <ScrollView style={{ maxHeight: 420 }}>
            {/* Current Avatar Preview */}
            <View style={styles.avatarPreviewSection}>
              <View style={[styles.previewCircle, { borderColor: theme.accent, backgroundColor: theme.bgCard }]}>
                {selectedPhoto ? (
                  <Image source={{ uri: selectedPhoto }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                  <Text style={[styles.initialPreviewText, { color: theme.textPrimary }]}>
                    {(name || 'U').charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              {/* Upload Custom Photo Button (Web HTML5 File Picker) */}
              {Platform.OS === 'web' && (
                <label style={styles.uploadBtnLabel as any}>
                  <View style={[styles.uploadBtn, { backgroundColor: theme.accent }]}>
                    <Feather name="camera" size={13} color="#FFFFFF" />
                    <Text style={styles.uploadBtnText}>Upload Photo</Text>
                  </View>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </View>

            {/* Display Name Input */}
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>DISPLAY NICKNAME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgDark, color: theme.textPrimary, borderColor: theme.borderSubtle }]}
              placeholder="Your nickname..."
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={24}
            />

            {/* Preset Avatars Selection */}
            <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: 14 }]}>
              OR CHOOSE AN AVATAR PRESET
            </Text>
            <View style={styles.presetsGrid}>
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = selectedPhoto === preset.url;

                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetTile,
                      { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle },
                      isSelected && { borderColor: theme.accent, borderWidth: 2.5 },
                    ]}
                    onPress={() => setSelectedPhoto(preset.url)}
                    activeOpacity={0.75}
                  >
                    <Image source={{ uri: preset.url }} style={styles.presetImage} />
                    <Text style={[styles.presetName, { color: theme.textMuted }]} numberOfLines={1}>
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: theme.accent }, !name.trim() && styles.btnDisabled]}
            disabled={!name.trim() || saving}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
          </TouchableOpacity>
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
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  avatarPreviewSection: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  previewCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  initialPreviewText: {
    fontSize: 28,
    fontWeight: '800',
  },
  uploadBtnLabel: {
    cursor: 'pointer',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetTile: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    padding: 4,
  },
  presetImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 2,
  },
  presetName: {
    fontSize: 8.5,
    fontWeight: '700',
  },
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
