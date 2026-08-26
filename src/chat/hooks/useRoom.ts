import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, DocumentData } from 'firebase/firestore';
import { db } from '../../firebase.config';

export interface PinnedMessageInfo {
  id: string;
  text: string;
  senderName: string;
}

export interface RoomData {
  passkey: string;
  displayName: string;
  createdAt: Date | null;
  createdBy: string;
  pinnedMessage?: PinnedMessageInfo | null;
}

export interface UseRoomResult {
  room: RoomData | null;
  loading: boolean;
  error: string | null;
  pinMessage: (pinned: PinnedMessageInfo | null) => Promise<void>;
}

/**
 * Subscribes to the rooms/{passkey} doc in Firestore.
 * Supports reading and updating pinned messages.
 */
export function useRoom(passkey: string): UseRoomResult {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!passkey) return;

    setLoading(true);
    setError(null);

    const ref = doc(db, 'rooms', passkey);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setError('Room not found');
          setRoom(null);
        } else {
          const data = snap.data() as DocumentData;
          setRoom({
            passkey,
            displayName: data.displayName ?? passkey,
            createdAt: data.createdAt?.toDate() ?? null,
            createdBy: data.createdBy ?? '',
            pinnedMessage: data.pinnedMessage ?? null,
          });
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [passkey]);

  const pinMessage = useCallback(
    async (pinned: PinnedMessageInfo | null) => {
      if (!passkey) return;
      try {
        await updateDoc(doc(db, 'rooms', passkey), {
          pinnedMessage: pinned,
        });
      } catch (e) {
        console.error('Failed to update pinned message:', e);
      }
    },
    [passkey]
  );

  return { room, loading, error, pinMessage };
}
