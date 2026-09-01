import { useState, useCallback } from 'react';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';

// ─── Ghost Mode ───────────────────────────────────────────────────────────────
// Ghost mode suppresses read-receipt writes on the client side.
// The hook just provides a toggle; ChatScreen gates markAsRead behind it.
export function useGhostMode() {
  const [isGhost, setIsGhost] = useState(false);
  const toggleGhostMode = useCallback(() => setIsGhost((prev) => !prev), []);
  return { isGhost, toggleGhostMode };
}

// ─── Room Expiry ──────────────────────────────────────────────────────────────
export type ExpiryOption = 'never' | '1h' | '24h' | '7d' | '30d';

export const EXPIRY_LABELS: Record<ExpiryOption, string> = {
  never: 'Never',
  '1h': '1 Hour',
  '24h': '24 Hours',
  '7d': '7 Days',
  '30d': '30 Days',
};

export function expiryToMs(option: ExpiryOption): number | null {
  const map: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return map[option] ?? null;
}

export function formatCountdown(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function useRoomExpiry(passkey: string) {
  const setExpiry = useCallback(
    async (option: ExpiryOption) => {
      if (!passkey) return;
      const ms = expiryToMs(option);
      const roomRef = doc(db, 'rooms', passkey);
      if (ms === null) {
        await updateDoc(roomRef, { expiresAt: null });
      } else {
        await updateDoc(roomRef, { expiresAt: Date.now() + ms });
      }
    },
    [passkey],
  );

  return { setExpiry };
}

// ─── Room Password Lock ───────────────────────────────────────────────────────
// Simple client-side hash using djb2 (not cryptographic — for casual lock)
function hashPassword(password: string): string {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 33) ^ password.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function useRoomPasswordLock(passkey: string) {
  const setRoomPassword = useCallback(
    async (password: string) => {
      if (!passkey || !password.trim()) return;
      const hash = hashPassword(password.trim());
      await updateDoc(doc(db, 'rooms', passkey), { passwordHash: hash });
    },
    [passkey],
  );

  const removeRoomPassword = useCallback(
    async () => {
      if (!passkey) return;
      await updateDoc(doc(db, 'rooms', passkey), { passwordHash: null });
    },
    [passkey],
  );

  const verifyPassword = useCallback(
    async (password: string): Promise<boolean> => {
      if (!passkey) return false;
      const snap = await getDoc(doc(db, 'rooms', passkey));
      if (!snap.exists()) return false;
      const data = snap.data();
      if (!data.passwordHash) return true; // no lock
      return data.passwordHash === hashPassword(password.trim());
    },
    [passkey],
  );

  return { setRoomPassword, removeRoomPassword, verifyPassword };
}
