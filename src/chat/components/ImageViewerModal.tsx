import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Linking, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  imageUrl: string | null;
  senderName?: string;
  onClose: () => void;
}

export default function ImageViewerModal({ visible, imageUrl, senderName, onClose }: Props) {
  if (!visible || !imageUrl) return null;

  const handleOpenExternal = () => {
    if (imageUrl) {
      if (Platform.OS === 'web') {
        window.open(imageUrl, '_blank');
      } else {
        Linking.openURL(imageUrl).catch(() => {});
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.senderTitle}>
            Photo from {senderName || 'Friend'}
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleOpenExternal} style={styles.iconBtn}>
              <Feather name="external-link" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Feather name="x" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Full Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.fullImage} resizeMode="contain" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  senderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 6,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
