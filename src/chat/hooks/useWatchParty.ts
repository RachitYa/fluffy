import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';

export interface WatchPartyData {
  youtubeId: string;
  title?: string;
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;
  hostUid: string;
  hostName: string;
  lastActionBy?: string;
}

export function useWatchParty(passkey: string, userUid: string | null, userName: string | null) {
  const [watchParty, setWatchParty] = useState<WatchPartyData | null>(null);

  useEffect(() => {
    if (!passkey) return;

    const wpDocRef = doc(db, 'rooms', passkey, 'activities', 'watchParty');
    const unsub = onSnapshot(wpDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWatchParty({
          youtubeId: data.youtubeId,
          title: data.title || 'YouTube Video',
          isPlaying: data.isPlaying ?? true,
          currentTime: data.currentTime ?? 0,
          updatedAt: data.updatedAt ?? Date.now(),
          hostUid: data.hostUid || '',
          hostName: data.hostName || 'Host',
          lastActionBy: data.lastActionBy || '',
        });
      } else {
        setWatchParty(null);
      }
    });

    return unsub;
  }, [passkey]);

  const startWatchParty = useCallback(
    async (youtubeId: string, title?: string) => {
      if (!passkey || !userUid) return;
      const wpDocRef = doc(db, 'rooms', passkey, 'activities', 'watchParty');
      await setDoc(wpDocRef, {
        youtubeId,
        title: title || 'YouTube Video',
        isPlaying: true,
        currentTime: 0,
        updatedAt: Date.now(),
        hostUid: userUid,
        hostName: userName || 'Host',
        lastActionBy: userUid,
      });
    },
    [passkey, userUid, userName]
  );

  const updatePlayback = useCallback(
    async (isPlaying: boolean, currentTime: number) => {
      if (!passkey || !userUid) return;
      const wpDocRef = doc(db, 'rooms', passkey, 'activities', 'watchParty');
      await setDoc(
        wpDocRef,
        {
          isPlaying,
          currentTime,
          updatedAt: Date.now(),
          lastActionBy: userUid,
        },
        { merge: true }
      );
    },
    [passkey, userUid]
  );

  const seekPlayback = useCallback(
    async (seconds: number) => {
      if (!passkey || !userUid) return;
      const wpDocRef = doc(db, 'rooms', passkey, 'activities', 'watchParty');
      await setDoc(
        wpDocRef,
        {
          currentTime: Math.max(0, seconds),
          updatedAt: Date.now(),
          lastActionBy: userUid,
        },
        { merge: true }
      );
    },
    [passkey, userUid]
  );

  const closeWatchParty = useCallback(async () => {
    if (!passkey) return;
    const wpDocRef = doc(db, 'rooms', passkey, 'activities', 'watchParty');
    await deleteDoc(wpDocRef);
  }, [passkey]);

  return {
    watchParty,
    startWatchParty,
    updatePlayback,
    seekPlayback,
    closeWatchParty,
  };
}
