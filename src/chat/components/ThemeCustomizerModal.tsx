import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme, THEME_PALETTES, ThemeAccentKey } from '../hooks/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ThemeCustomizerModal({ visible, onClose }: Props) {
  const { theme, setThemeAccent } = useTheme();

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
            <Ionicons name="color-palette-outline" size={20} color={theme.accent} />
            <Text style={[styles.title, { color: theme.textPrimary }]}>Chat Theme & Accent</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Personalize your chat bubbles, borders, and UI accents.
          </Text>

          <View style={styles.palettesList}>
            {(Object.keys(THEME_PALETTES) as ThemeAccentKey[]).map((key) => {
              const pal = THEME_PALETTES[key];
              const isSelected = theme.key === key;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.paletteCard,
                    { backgroundColor: pal.bgCard, borderColor: isSelected ? pal.accent : theme.borderSubtle },
                    isSelected && { borderWidth: 2 },
                  ]}
                  onPress={() => setThemeAccent(key)}
                  activeOpacity={0.8}
                >
                  <View style={styles.paletteLeft}>
                    <View style={[styles.colorOrb, { backgroundColor: pal.accent }]} />
                    <View>
                      <Text style={[styles.paletteName, { color: pal.textPrimary }]}>{pal.name}</Text>
                      <Text style={[styles.paletteHex, { color: pal.textMuted }]}>{pal.accent}</Text>
                    </View>
                  </View>

                  {isSelected && (
                    <View style={[styles.checkPill, { backgroundColor: pal.accent }]}>
                      <Feather name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: theme.accent }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.doneText}>Done</Text>
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
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  palettesList: {
    gap: 10,
    marginBottom: 18,
  },
  paletteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  paletteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  paletteName: {
    fontSize: 14,
    fontWeight: '700',
  },
  paletteHex: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  checkPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
