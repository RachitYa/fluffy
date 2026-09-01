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

export function cleanDisplayUrl(rawUrl: string): string {
  try {
    // Strip tracking parameters
    let cleaned = rawUrl.replace(/[\?\&](si|utm_[a-z]+|fbclid|feature|ref)=[^\&\#]*/gi, '');
    if (cleaned.endsWith('?') || cleaned.endsWith('&')) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  } catch (_) {
    return rawUrl;
  }
}

export default function RichLinkPreview({ text }: Props) {
  const { theme } = useTheme();
  const rawUrl = extractUrl(text);

  if (!rawUrl) return null;

  const url = cleanDisplayUrl(rawUrl);
  const ytId = extractYouTubeId(url);
  const isSpotify = url.includes('spotify.com');
  const isTwitter = url.includes('twitter.com') || url.includes('x.com');
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const domain = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];

  const handleOpen = () => {
    Linking.openURL(rawUrl).catch(() => {});
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}
      onPress={handleOpen}
      activeOpacity={0.85}
    >
      {ytId ? (
        <View style={styles.ytCard}>
          <Image
            source={{ uri: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <Ionicons name="logo-youtube" size={20} color="#FF0000" />
            <Text style={styles.ytTag}>YouTube</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <View style={styles.domainRow}>
          {isSpotify ? (
            <Ionicons name="musical-notes" size={13} color="#1DB954" />
          ) : isTwitter ? (
            <Ionicons name="logo-twitter" size={13} color="#1DA1F2" />
          ) : isYouTube ? (
            <Ionicons name="logo-youtube" size={13} color="#FF0000" />
          ) : (
            <Feather name="globe" size={12} color={theme.accent} />
          )}
          <Text style={[styles.domainText, { color: theme.accent }]}>{domain}</Text>
          <Feather name="external-link" size={11} color={theme.textMuted} style={{ marginLeft: 'auto' }} />
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
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    maxWidth: 280,
  },
  ytCard: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: '#000000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ytTag: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  metaRow: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  domainText: {
    fontSize: 11,
    fontWeight: '700',
  },
  urlSnippet: {
    fontSize: 10,
  },
});
