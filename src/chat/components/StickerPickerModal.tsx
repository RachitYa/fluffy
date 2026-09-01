import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { STICKER_PACKS, StickerItem } from '../hooks/useStickers';

const SCREEN_H = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  onSelectSticker: (sticker: StickerItem) => void;
  onClose: () => void;
}

export default function StickerPickerModal({
  visible,
  onSelectSticker,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const [activePackIndex, setActivePackIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 18, tension: 160 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  const activePack = STICKER_PACKS[activePackIndex];

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="sticker-emoji" size={20} color="#EC4899" />
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Stickers</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Pack tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.packRow}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
          >
            {STICKER_PACKS.map((pack, idx) => (
              <TouchableOpacity
                key={pack.name}
                style={[
                  styles.packTab,
                  { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle },
                  activePackIndex === idx && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => setActivePackIndex(idx)}
              >
                <Text style={{ fontSize: 13 }}>{pack.emoji}</Text>
                <Text
                  style={[
                    styles.packTabText,
                    { color: activePackIndex === idx ? '#fff' : theme.textMuted },
                  ]}
                >
                  {pack.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Stickers Grid */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {activePack.stickers.map((stk) => (
              <TouchableOpacity
                key={stk.id}
                style={[styles.stickerCard, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}
                onPress={() => {
                  onSelectSticker(stk);
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: stk.url }} style={styles.stickerImg} resizeMode="cover" />
                <Text style={[styles.stickerLabel, { color: theme.textMuted }]} numberOfLines={1}>
                  {stk.name}
                </Text>
              </TouchableOpacity>
            ))}
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  sheet: {
    height: SCREEN_H * 0.6,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },

  packRow: { marginBottom: 12, maxHeight: 40 },
  packTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  packTabText: { fontSize: 12, fontWeight: '700' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 16,
  },
  stickerCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stickerImg: {
    width: '75%',
    height: '75%',
    borderRadius: 8,
  },
  stickerLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
