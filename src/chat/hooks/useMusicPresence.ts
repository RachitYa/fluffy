import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.config';

export interface MusicTrack {
  title: string;
  artist: string;
  albumArt?: string;
  sharedBy: string;
  sharedByUid: string;
  sharedAt: number;
}

export function useMusicPresence(
  passkey: string,
  userUid: string | null,
  userName: string | null,
) {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);

  useEffect(() => {
    if (!passkey) return;
    const trackDoc = doc(db, 'rooms', passkey, 'activities', 'nowPlaying');
    const unsub = onSnapshot(trackDoc, (snap) => {
      if (!snap.exists()) {
        setCurrentTrack(null);
        return;
      }
      const data = snap.data();
      if (!data.title) {
        setCurrentTrack(null);
        return;
      }
      setCurrentTrack({
        title: data.title,
        artist: data.artist ?? 'Unknown Artist',
        albumArt: data.albumArt ?? undefined,
        sharedBy: data.sharedBy ?? 'Someone',
        sharedByUid: data.sharedByUid ?? '',
        sharedAt: data.sharedAt ?? Date.now(),
      });
    });
    return unsub;
  }, [passkey]);

  const shareNowPlaying = useCallback(
    async (title: string, artist: string = 'Unknown Artist') => {
      if (!passkey || !userUid || !userName || !title.trim()) return;
      const trackDoc = doc(db, 'rooms', passkey, 'activities', 'nowPlaying');
      await setDoc(trackDoc, {
        title: title.trim(),
        artist: artist.trim(),
        sharedBy: userName,
        sharedByUid: userUid,
        sharedAt: Date.now(),
      });
    },
    [passkey, userUid, userName],
  );

  const clearNowPlaying = useCallback(async () => {
    if (!passkey) return;
    const trackDoc = doc(db, 'rooms', passkey, 'activities', 'nowPlaying');
    await setDoc(trackDoc, { title: null });
  }, [passkey]);

  return { currentTrack, shareNowPlaying, clearNowPlaying };
}
