import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

export interface ReplyInfo {
  id: string;
  text: string;
  senderName: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array of user UIDs
}

export interface PollData {
  question: string;
  options: PollOption[];
}

export interface Message {
  id: string;
  text: string;
  senderName: string;
  senderUid: string;
  senderAvatar?: string | null;
  createdAt: Date | null;
  replyTo?: ReplyInfo | null;
  reactions?: Record<string, string[]>; // emoji -> array of user names
  isEdited?: boolean;
  isDeleted?: boolean;
  type?: 'text' | 'voice' | 'poll' | 'gif' | 'image';
  voiceDuration?: number;
  readBy?: string[];
  isVanish?: boolean;
  isViewOnce?: boolean;
  viewOnceOpenedBy?: string[];
  poll?: PollData | null;
  gifUrl?: string | null;
  imageUrl?: string | null;
}

export interface UseMessagesResult {
  messages: Message[];
  loading: boolean;
  sendMessage: (
    text: string,
    replyTo?: ReplyInfo | null,
    type?: 'text' | 'voice' | 'poll' | 'gif' | 'image',
    extra?: {
      voiceDuration?: number;
      isVanish?: boolean;
      isViewOnce?: boolean;
      poll?: PollData;
      gifUrl?: string;
      imageUrl?: string;
      senderAvatar?: string;
    }
  ) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string, userDisplayName: string) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  votePoll: (messageId: string, optionId: string, userUid: string) => Promise<void>;
  openViewOnce: (messageId: string, userUid: string) => Promise<void>;
  wipeVanishMessages: () => Promise<void>;
}

/**
 * Subscribes to the latest 100 messages in rooms/{passkey}/messages.
 * Supports rich features: Photos, Polls, GIFs, Vanish Mode, View Once, Voice Notes, Reactions.
 */
export function useMessages(
  passkey: string,
  senderUid: string | null,
  senderName: string | null,
  senderAvatar: string | null = null
): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!passkey) return;

    setLoading(true);

    const messagesRef = collection(db, 'rooms', passkey, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));

    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          text: data.text as string,
          senderName: data.senderName as string,
          senderUid: data.senderUid as string,
          senderAvatar: data.senderAvatar ?? null,
          createdAt: data.createdAt?.toDate() ?? null,
          replyTo: data.replyTo ?? null,
          reactions: data.reactions ?? {},
          isEdited: data.isEdited ?? false,
          isDeleted: data.isDeleted ?? false,
          type: data.type ?? 'text',
          voiceDuration: data.voiceDuration ?? 0,
          readBy: data.readBy ?? [],
          isVanish: data.isVanish ?? false,
          isViewOnce: data.isViewOnce ?? false,
          viewOnceOpenedBy: data.viewOnceOpenedBy ?? [],
          poll: data.poll ?? null,
          gifUrl: data.gifUrl ?? null,
          imageUrl: data.imageUrl ?? null,
        };
      });
      setMessages(msgs);
      setLoading(false);
    });

    return unsub;
  }, [passkey]);

  // 1. Send Message
  const sendMessage = useCallback(
    async (
      text: string,
      replyTo?: ReplyInfo | null,
      type: 'text' | 'voice' | 'poll' | 'gif' | 'image' = 'text',
      extra?: {
        voiceDuration?: number;
        isVanish?: boolean;
        isViewOnce?: boolean;
        poll?: PollData;
        gifUrl?: string;
        imageUrl?: string;
        senderAvatar?: string;
      }
    ) => {
      const trimmed = text.trim();
      if (!trimmed || !passkey || !senderUid) return;

      const messagesRef = collection(db, 'rooms', passkey, 'messages');
      await addDoc(messagesRef, {
        text: trimmed,
        senderName: senderName ?? 'Anonymous',
        senderUid,
        senderAvatar: extra?.senderAvatar || senderAvatar || null,
        createdAt: serverTimestamp(),
        replyTo: replyTo || null,
        reactions: {},
        isEdited: false,
        isDeleted: false,
        type,
        voiceDuration: extra?.voiceDuration || 0,
        readBy: [senderUid],
        isVanish: extra?.isVanish || false,
        isViewOnce: extra?.isViewOnce || false,
        viewOnceOpenedBy: [],
        poll: extra?.poll || null,
        gifUrl: extra?.gifUrl || null,
        imageUrl: extra?.imageUrl || null,
      });
    },
    [passkey, senderUid, senderName, senderAvatar]
  );

  // 2. Toggle Reaction
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string, userDisplayName: string) => {
      if (!passkey || !messageId || !userDisplayName) return;

      const targetMsg = messages.find((m) => m.id === messageId);
      if (!targetMsg) return;

      const currentReactions = { ...(targetMsg.reactions || {}) };
      const currentUsers = currentReactions[emoji] || [];

      let updatedUsers: string[];
      if (currentUsers.includes(userDisplayName)) {
        updatedUsers = currentUsers.filter((u) => u !== userDisplayName);
      } else {
        updatedUsers = [...currentUsers, userDisplayName];
      }

      if (updatedUsers.length > 0) {
        currentReactions[emoji] = updatedUsers;
      } else {
        delete currentReactions[emoji];
      }

      try {
        await updateDoc(doc(db, 'rooms', passkey, 'messages', messageId), {
          reactions: currentReactions,
        });
      } catch (e) {
        console.error('Failed to toggle reaction:', e);
      }
    },
    [passkey, messages]
  );

  // 3. Edit Message
  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      const trimmed = newText.trim();
      if (!passkey || !messageId || !trimmed) return;

      try {
        await updateDoc(doc(db, 'rooms', passkey, 'messages', messageId), {
          text: trimmed,
          isEdited: true,
          editedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error('Failed to edit message:', e);
      }
    },
    [passkey]
  );

  // 4. Delete for Everyone
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!passkey || !messageId) return;

      try {
        await updateDoc(doc(db, 'rooms', passkey, 'messages', messageId), {
          text: 'This message was deleted',
          isDeleted: true,
        });
      } catch (e) {
        console.error('Failed to delete message:', e);
      }
    },
    [passkey]
  );

  // 5. Mark as Read
  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!passkey || !senderUid || !messageId) return;
      const targetMsg = messages.find((m) => m.id === messageId);
      if (!targetMsg || (targetMsg.readBy && targetMsg.readBy.includes(senderUid))) return;

      try {
        await updateDoc(doc(db, 'rooms', passkey, 'messages', messageId), {
          readBy: [...(targetMsg.readBy || []), senderUid],
        });
      } catch (_) {}
    },
    [passkey, senderUid, messages]
  );

  // 6. Interactive Poll Voting
  const votePoll = useCallback(
    async (messageId: string, optionId: string, userUid: string) => {
      if (!passkey || !messageId || !userUid) return;
      const targetMsg = messages.find((m) => m.id === messageId);
      if (!targetMsg || !targetMsg.poll) return;

      const updatedOptions = targetMsg.poll.options.map((opt) => {
        const hasVotedThis = opt.votes.includes(userUid);
        if (opt.id === optionId) {
          return {
            ...opt,
            votes: hasVotedThis ? opt.votes.filter((u) => u !== userUid) : [...opt.votes, userUid],
          };
        } else {
          return {
            ...opt,
            votes: opt.votes.filter((u) => u !== userUid),
          };
        }
      });

      try {
        await updateDoc(doc(db, 'rooms', passkey, 'messages', messageId), {
          poll: {
            ...targetMsg.poll,
            options: updatedOptions,
          },
        });
      } catch (e) {
        console.error('Failed to vote on poll:', e);
      }
    },
    [passkey, messages]
  );

  // 7. Open View Once Note
  const openViewOnce = useCallback(
    async (messageId: string, userUid: string) => {
      if (!passkey || !messageId || !userUid) return;
      const targetMsg = messages.find((m) => m.id === messageId);
      if (!targetMsg || !targetMsg.isViewOnce) return;

      const currentOpeners = targetMsg.viewOnceOpenedBy || [];
      if (!currentOpeners.includes(userUid)) {
        try {
          await updateDoc(doc(db, 'rooms', passkey, 'messages', messageId), {
            viewOnceOpenedBy: [...currentOpeners, userUid],
          });
        } catch (_) {}
      }
    },
    [passkey, messages]
  );

  // 8. Wipe all vanish messages on room exit
  const wipeVanishMessages = useCallback(async () => {
    if (!passkey) return;
    const vanishMsgs = messages.filter((m) => m.isVanish);
    for (const msg of vanishMsgs) {
      try {
        await deleteDoc(doc(db, 'rooms', passkey, 'messages', msg.id));
      } catch (_) {}
    }
  }, [passkey, messages]);

  return {
    messages,
    loading,
    sendMessage,
    toggleReaction,
    editMessage,
    deleteMessage,
    markAsRead,
    votePoll,
    openViewOnce,
    wipeVanishMessages,
  };
}
