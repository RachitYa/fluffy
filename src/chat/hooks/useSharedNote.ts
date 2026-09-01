import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';

export interface SharedNote {
  content: string;
  lastEditedBy: string;
  lastEditedAt: number;
}

export function useSharedNote(passkey: string, userUid: string | null, userName: string | null) {
  const [note, setNote] = useState<SharedNote | null>(null);

  useEffect(() => {
    if (!passkey) return;
    const noteDoc = doc(db, 'rooms', passkey, 'activities', 'sharedNote');
    const unsub = onSnapshot(noteDoc, (snap) => {
      if (!snap.exists()) { setNote(null); return; }
      const data = snap.data();
      setNote({
        content: data.content ?? '',
        lastEditedBy: data.lastEditedBy ?? '',
        lastEditedAt: data.lastEditedAt ?? Date.now(),
      });
    });
    return unsub;
  }, [passkey]);

  const updateNote = useCallback(
    async (content: string) => {
      if (!passkey || !userUid || !userName) return;
      const noteDoc = doc(db, 'rooms', passkey, 'activities', 'sharedNote');
      await setDoc(noteDoc, {
        content,
        lastEditedBy: userName,
        lastEditedAt: Date.now(),
      });
    },
    [passkey, userUid, userName],
  );

  return { note, updateNote };
}
