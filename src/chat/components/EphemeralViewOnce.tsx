import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface Props {
  visible: boolean;
  text: string;
  senderName: string;
  onFinish: () => void;
}

export default function EphemeralViewOnce({ visible, text, senderName, onFinish }: Props) {
  const { theme } = useTheme();
  const [secondsLeft, setSecondsLeft] = useState(5.0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setSecondsLeft(5.0);
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const rem = Math.max(0, 5.0 - elapsed);
        setSecondsLeft(rem);
        if (rem <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          onFinish();
        }
      }, 50);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, onFinish]);

  if (!visible) return null;

  const progressPercent = (secondsLeft / 5.0) * 100;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.bgSurface, borderColor: theme.accent }]}>
          {/* Top Timer Bar */}
          <View style={styles.timerTrack}>
            <View
              style={[
                styles.timerFill,
                { width: `${progressPercent}%`, backgroundColor: theme.accent },
              ]}
            />
          </View>

          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <Ionicons name="eye-off-outline" size={16} color={theme.accent} />
              <Text style={[styles.badgeText, { color: theme.accent }]}>VIEW ONCE EPHEMERAL NOTE</Text>
            </View>
            <Text style={[styles.countdownText, { color: '#EF4444' }]}>
              {secondsLeft.toFixed(1)}s
            </Text>
          </View>

          <Text style={[styles.senderText, { color: theme.textMuted }]}>
            From {senderName} · Disappearing permanently
          </Text>

          {/* Secret Message Content */}
          <View style={[styles.messageBox, { backgroundColor: theme.bgDark, borderColor: theme.borderSubtle }]}>
            <Text style={[styles.messageText, { color: theme.textPrimary }]}>{text}</Text>
          </View>

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.accent }]}
            onPress={onFinish}
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>Done / Burn Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  timerTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  timerFill: {
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  senderText: {
    fontSize: 11,
    marginBottom: 14,
  },
  messageBox: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  closeBtn: {
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
