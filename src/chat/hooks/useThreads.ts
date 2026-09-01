import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

export interface ThreadMessage {
  id: string;
  text: string;
  senderName: string;
  senderUid: string;
  senderAvatar?: string | null;
  createdAt: number;
}

export function useThreads(
  passkey: string,
  parentMsgId: string | null,
  userUid: string | null,
  userName: string | null,
  userAvatar?: string | null,
) {
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [threadCount, setThreadCount] = useState(0);

  useEffect(() => {
    if (!passkey || !parentMsgId) return;
    const threadCol = collection(db, 'rooms', passkey, 'messages', parentMsgId, 'thread');
    const unsub = onSnapshot(threadCol, (snap) => {
      const msgs: ThreadMessage[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          text: data.text,
          senderName: data.senderName,
          senderUid: data.senderUid,
          senderAvatar: data.senderAvatar ?? null,
          createdAt: data.createdAt ?? Date.now(),
        };
      });
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      setThreadMessages(msgs);
      setThreadCount(msgs.length);
    });
    return unsub;
  }, [passkey, parentMsgId]);

  const sendThreadReply = useCallback(
    async (text: string) => {
      if (!passkey || !parentMsgId || !userUid || !userName) return;
      const threadCol = collection(db, 'rooms', passkey, 'messages', parentMsgId, 'thread');
      await addDoc(threadCol, {
        text,
        senderName: userName,
        senderUid: userUid,
        senderAvatar: userAvatar ?? null,
        createdAt: Date.now(),
      });
      // Update thread count on parent message
      const parentRef = doc(db, 'rooms', passkey, 'messages', parentMsgId);
      await updateDoc(parentRef, { threadCount: increment(1) }).catch(() => {});
    },
    [passkey, parentMsgId, userUid, userName, userAvatar],
  );

  return { threadMessages, threadCount, sendThreadReply };
}
