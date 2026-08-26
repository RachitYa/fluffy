import { useEffect, useState, useCallback, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase.config';

export interface UseTypingResult {
  typingUsers: string[];
  setTyping: (isTyping: boolean) => void;
}

/**
 * Tracks and listens to typing status in rooms/{passkey}/typing subcollection.
 * Automatically clears typing indicator after 2.5s of inactivity.
 */
export function useTyping(
  passkey: string,
  uid: string | null,
  displayName: string | null
): UseTypingResult {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Listen for other typing users
  useEffect(() => {
    if (!passkey) return;

    const typingRef = collection(db, 'rooms', passkey, 'typing');
    const unsub = onSnapshot(typingRef, (snapshot) => {
      const now = Date.now();
      const users: string[] = [];

      snapshot.docs.forEach((d) => {
        // Exclude current user
        if (d.id !== uid) {
          const data = d.data();
          const updatedAt = data.updatedAt?.toMillis?.() || data.localTime || 0;
          // Only show if updated within the last 4 seconds
          if (now - updatedAt < 4500) {
            users.push(data.name || 'Someone');
          }
        }
      });

      setTypingUsers(users);
    });

    return unsub;
  }, [passkey, uid]);

  // 2. Broadcast typing state
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!passkey || !uid) return;

      const userTypingDoc = doc(db, 'rooms', passkey, 'typing', uid);

      if (isTyping) {
        try {
          await setDoc(userTypingDoc, {
            name: displayName || 'Anonymous',
            updatedAt: serverTimestamp(),
            localTime: Date.now(),
          });
        } catch (_) {}

        // Reset auto-clear timer
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(async () => {
          try {
            await deleteDoc(userTypingDoc);
          } catch (_) {}
        }, 2500);
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        try {
          await deleteDoc(userTypingDoc);
        } catch (_) {}
      }
    },
    [passkey, uid, displayName]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (passkey && uid) {
        deleteDoc(doc(db, 'rooms', passkey, 'typing', uid)).catch(() => {});
      }
    };
  }, [passkey, uid]);

  return { typingUsers, setTyping };
}
