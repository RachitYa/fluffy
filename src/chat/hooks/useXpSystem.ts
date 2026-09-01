import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserXp {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  xp: number;
  level: number;
  rank: string;
  rankEmoji: string;
  messagesSent: number;
  reactionsGiven: number;
  voiceMinutes: number;
  stagesHosted: number;
}

// ─── Rank tiers ───────────────────────────────────────────────────────────────
const RANKS = [
  { minXp: 0,    name: 'Newbie',   emoji: '🌱' },
  { minXp: 100,  name: 'Regular',  emoji: '💬' },
  { minXp: 300,  name: 'Active',   emoji: '⭐' },
  { minXp: 700,  name: 'Veteran',  emoji: '🔥' },
  { minXp: 1500, name: 'Elite',    emoji: '💎' },
  { minXp: 3000, name: 'Legend',   emoji: '👑' },
];

export function getRankForXp(xp: number): { level: number; rank: string; rankEmoji: string } {
  let level = 0;
  let rank = RANKS[0];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXp) {
      rank = RANKS[i];
      level = i + 1;
      break;
    }
  }
  return { level, rank: rank.name, rankEmoji: rank.emoji };
}

export function xpToNextRank(xp: number): { next: string; needed: number; progress: number } {
  for (let i = 0; i < RANKS.length - 1; i++) {
    if (xp < RANKS[i + 1].minXp) {
      const range = RANKS[i + 1].minXp - RANKS[i].minXp;
      const earned = xp - RANKS[i].minXp;
      return {
        next: `${RANKS[i + 1].emoji} ${RANKS[i + 1].name}`,
        needed: RANKS[i + 1].minXp - xp,
        progress: Math.min(1, earned / range),
      };
    }
  }
  return { next: '👑 Max Rank', needed: 0, progress: 1 };
}

// ─── XP Award amounts ─────────────────────────────────────────────────────────
export const XP_AMOUNTS = {
  message: 5,
  reaction: 2,
  voiceMinute: 3,
  stageHosted: 10,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useXpSystem(passkey: string, userUid: string | null, userName: string | null) {
  const [leaderboard, setLeaderboard] = useState<UserXp[]>([]);
  const [myXp, setMyXp] = useState<UserXp | null>(null);

  // Subscribe to leaderboard (xp sub-collection under room)
  useEffect(() => {
    if (!passkey) return;
    const xpDoc = doc(db, 'rooms', passkey, 'xp', 'leaderboard');
    const unsub = onSnapshot(xpDoc, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const entries: UserXp[] = Object.values(data).map((entry: any) => {
        const { level, rank, rankEmoji } = getRankForXp(entry.xp ?? 0);
        return {
          uid: entry.uid,
          displayName: entry.displayName,
          photoURL: entry.photoURL ?? null,
          xp: entry.xp ?? 0,
          level,
          rank,
          rankEmoji,
          messagesSent: entry.messagesSent ?? 0,
          reactionsGiven: entry.reactionsGiven ?? 0,
          voiceMinutes: entry.voiceMinutes ?? 0,
          stagesHosted: entry.stagesHosted ?? 0,
        };
      });
      entries.sort((a, b) => b.xp - a.xp);
      setLeaderboard(entries);
      if (userUid) {
        setMyXp(entries.find((e) => e.uid === userUid) ?? null);
      }
    });
    return unsub;
  }, [passkey, userUid]);

  // ── Award XP helper ───────────────────────────────────────────────────────
  const awardXp = useCallback(
    async (amount: number, field?: keyof Pick<UserXp, 'messagesSent' | 'reactionsGiven' | 'voiceMinutes' | 'stagesHosted'>) => {
      if (!passkey || !userUid || !userName) return;
      const xpDoc = doc(db, 'rooms', passkey, 'xp', 'leaderboard');

      const updates: Record<string, any> = {
        [`${userUid}.uid`]: userUid,
        [`${userUid}.displayName`]: userName,
        [`${userUid}.xp`]: increment(amount),
      };
      if (field) {
        updates[`${userUid}.${field}`] = increment(1);
      }

      await setDoc(xpDoc, updates, { merge: true });
    },
    [passkey, userUid, userName],
  );

  const awardMessageXp = useCallback(() => awardXp(XP_AMOUNTS.message, 'messagesSent'), [awardXp]);
  const awardReactionXp = useCallback(() => awardXp(XP_AMOUNTS.reaction, 'reactionsGiven'), [awardXp]);
  const awardVoiceMinuteXp = useCallback(() => awardXp(XP_AMOUNTS.voiceMinute, 'voiceMinutes'), [awardXp]);
  const awardStageHostedXp = useCallback(() => awardXp(XP_AMOUNTS.stageHosted, 'stagesHosted'), [awardXp]);

  return {
    leaderboard,
    myXp,
    awardMessageXp,
    awardReactionXp,
    awardVoiceMinuteXp,
    awardStageHostedXp,
  };
}
