import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  FlatList,
  Image,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectGif: (gifUrl: string) => void;
}

// Curated high-performance animated reaction GIFs
const CURATED_GIFS: { id: string; category: string; url: string; title: string }[] = [
  { id: '1', category: 'hype', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', title: 'Party Hype' },
  { id: '2', category: 'laugh', url: 'https://media.giphy.com/media/26n6Gx9moCgs1qxxt/giphy.gif', title: 'Laughing Dead' },
  { id: '3', category: 'love', url: 'https://media.giphy.com/media/M90mJvfWfd5mbUuULX/giphy.gif', title: 'Heart Love' },
  { id: '4', category: 'shock', url: 'https://media.giphy.com/media/PUBxelzbChUTK/giphy.gif', title: 'Cat Shocked' },
  { id: '5', category: 'sad', url: 'https://media.giphy.com/media/7SF5scGB2AFrgsXP63/giphy.gif', title: 'Pikachu Crying' },
  { id: '6', category: 'dance', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif', title: 'Duck Dancing' },
  { id: '7', category: 'cool', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', title: 'Deal With It' },
  { id: '8', category: 'mindblown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', title: 'Mind Blown' },
  { id: '9', category: 'gaming', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', title: 'Flappy Bird Flap' },
  { id: '10', category: 'agree', url: 'https://media.giphy.com/media/10Jpr9KSaXLchW/giphy.gif', title: 'Jack Nicholson Yes' },
  { id: '11', category: 'bye', url: 'https://media.giphy.com/media/Ru9sLV2Yjwaw8/giphy.gif', title: 'Peace Out Vanish' },
  { id: '12', category: 'cheers', url: 'https://media.giphy.com/media/Zw3oBUuIg231S/giphy.gif', title: 'Great Gatsby Cheers' },
];

const CATEGORIES = ['All', 'hype', 'laugh', 'love', 'shock', 'sad', 'dance', 'gaming'];

export default function GifPickerModal({ visible, onClose, onSelectGif }: Props) {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredGifs = CURATED_GIFS.filter((g) => {
    const matchesCategory = activeCategory === 'All' || g.category === activeCategory;
    const matchesSearch = !search.trim() || g.title.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
            <MaterialCommunityIcons name="file-gif-box" size={22} color={theme.accent} />
            <Text style={[styles.title, { color: theme.textPrimary }]}>Choose a GIF</Text>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.bgDark, borderColor: theme.borderSubtle }]}>
            <Feather name="search" size={15} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search GIFs & memes..."
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Feather name="x" size={14} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Chips */}
          <View style={styles.categoriesRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  { borderColor: theme.borderSubtle },
                  activeCategory === cat && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: activeCategory === cat ? '#FFFFFF' : theme.textMuted },
                  ]}
                >
                  {cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* GIFs Grid */}
          <FlatList
            data={filteredGifs}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.gifGrid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.gifTile, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}
                onPress={() => {
                  onSelectGif(item.url);
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: item.url }} style={styles.gifImage} resizeMode="cover" />
                <View style={styles.gifTitleBar}>
                  <Text style={[styles.gifTitle, { color: '#FFFFFF' }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
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
    height: 480,
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
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gifGrid: {
    gap: 10,
    paddingBottom: 20,
  },
  gifTile: {
    flex: 1,
    aspectRatio: 1.3,
    margin: 4,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  gifTitleBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  gifTitle: {
    fontSize: 10,
    fontWeight: '600',
  },
});
