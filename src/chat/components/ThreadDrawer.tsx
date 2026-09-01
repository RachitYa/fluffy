import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { ThreadMessage, useThreads } from '../hooks/useThreads';
import { format } from 'date-fns';

const SCREEN_H = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  passkey: string;
  parentMessageId: string | null;
  parentMessageText: string;
  parentSenderName: string;
  userUid: string | null;
  userName: string | null;
  userAvatar?: string | null;
  onClose: () => void;
}

export default function ThreadDrawer({
  visible,
  passkey,
  parentMessageId,
  parentMessageText,
  parentSenderName,
  userUid,
  userName,
  userAvatar,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const { threadMessages, sendThreadReply } = useThreads(
    passkey,
    parentMessageId,
    userUid,
    userName,
    userAvatar,
  );

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 18,
        tension: 160,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  useEffect(() => {
    if (threadMessages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [threadMessages.length]);

  if (!visible) return null;

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text || sending) return;
    setSending(true);
    setReplyText('');
    try {
      await sendThreadReply(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Animated.View
        style={[
          styles.drawer,
          { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
          {/* Handle & Header */}
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="message-square" size={16} color={theme.accent} />
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Thread</Text>
              <View style={[styles.countPill, { backgroundColor: theme.accent }]}>
                <Text style={styles.countPillText}>{threadMessages.length}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Parent message */}
          <View style={[styles.parentCard, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}>
            <Text style={[styles.parentSender, { color: theme.accent }]}>{parentSenderName}</Text>
            <Text style={[styles.parentText, { color: theme.textPrimary }]} numberOfLines={3}>
              {parentMessageText}
            </Text>
            <Text style={[styles.parentLabel, { color: theme.textMuted }]}>
              {threadMessages.length === 0 ? 'No replies yet' : `${threadMessages.length} repl${threadMessages.length === 1 ? 'y' : 'ies'}`}
            </Text>
          </View>

          {/* Thread messages */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.threadList}
            showsVerticalScrollIndicator={false}
          >
            {threadMessages.map((msg) => {
              const isMe = msg.senderUid === userUid;
              return (
                <View key={msg.id} style={[styles.threadBubble, isMe && styles.threadBubbleMe]}>
                  {!isMe && (
                    <View
                      style={[
                        styles.threadAvatar,
                        { backgroundColor: '#5865F2' },
                      ]}
                    >
                      <Text style={styles.threadAvatarText}>
                        {msg.senderName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={[
                    styles.threadBubbleBody,
                    {
                      backgroundColor: isMe ? theme.accent : theme.bgCard,
                      borderColor: theme.borderSubtle,
                    },
                  ]}>
                    {!isMe && (
                      <Text style={[styles.threadSenderName, { color: theme.accent }]}>
                        {msg.senderName}
                      </Text>
                    )}
                    <Text style={[styles.threadText, { color: isMe ? '#fff' : theme.textPrimary }]}>
                      {msg.text}
                    </Text>
                    <Text style={[styles.threadTime, { color: isMe ? 'rgba(255,255,255,0.6)' : theme.textMuted }]}>
                      {format(new Date(msg.createdAt), 'HH:mm')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Reply input */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.inputRow, { backgroundColor: theme.bgSurface, borderTopColor: theme.borderSubtle }]}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bgCard, color: theme.textPrimary, borderColor: theme.borderSubtle }]}
                placeholder="Reply in thread..."
                placeholderTextColor={theme.textMuted}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: !replyText.trim() || sending ? 0.5 : 1 }]}
                onPress={handleSend}
                disabled={!replyText.trim() || sending}
                activeOpacity={0.8}
              >
                <Feather name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  drawer: {
    height: SCREEN_H * 0.75,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingBottom: 8,
    overflow: 'hidden',
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
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  countPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  countPillText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  parentCard: {
    marginHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  parentSender: { fontSize: 12, fontWeight: '800' },
  parentText: { fontSize: 13, lineHeight: 18 },
  parentLabel: { fontSize: 10, marginTop: 2 },

  threadList: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  threadBubble: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  threadBubbleMe: { flexDirection: 'row-reverse' },
  threadAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  threadAvatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  threadBubbleBody: {
    maxWidth: '75%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 3,
  },
  threadSenderName: { fontSize: 10, fontWeight: '800' },
  threadText: { fontSize: 13, lineHeight: 18 },
  threadTime: { fontSize: 9, alignSelf: 'flex-end' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
});
