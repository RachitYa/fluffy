import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface Props {
  text: string;
}

export function extractUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

export function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function RichLinkPreview({ text }: Props) {
  const { theme } = useTheme();
  const url = extractUrl(text);

  if (!url) return null;

  const ytId = extractYouTubeId(url);
  const isSpotify = url.includes('spotify.com');
  const isTwitter = url.includes('twitter.com') || url.includes('x.com');
  const domain = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];

  const handleOpen = () => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}
      onPress={handleOpen}
      activeOpacity={0.8}
    >
      {ytId ? (
        <View style={styles.ytCard}>
          <Image
            source={{ uri: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <Ionicons name="logo-youtube" size={24} color="#FF0000" />
          </View>
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <View style={styles.domainRow}>
          {isSpotify ? (
            <Ionicons name="musical-notes" size={12} color="#1DB954" />
          ) : isTwitter ? (
            <Ionicons name="logo-twitter" size={12} color="#1DA1F2" />
          ) : (
            <Feather name="globe" size={12} color={theme.accent} />
          )}
          <Text style={[styles.domainText, { color: theme.accent }]}>{domain}</Text>
        </View>
        <Text style={[styles.urlSnippet, { color: theme.textMuted }]} numberOfLines={1}>
          {url}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ytCard: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 3,
  },
  metaRow: {
    padding: 8,
    gap: 3,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  domainText: {
    fontSize: 11,
    fontWeight: '700',
  },
  urlSnippet: {
    fontSize: 11,
  },
});
