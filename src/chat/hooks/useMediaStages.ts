import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

// ─── Types ──────────────────────────────────────────────────────────────────
export type MediaType = 'youtube' | 'direct' | 'twitch';

export interface QueueItem {
  id: string;
  url: string;
  title: string;
  addedBy: string;
  addedAt: number;
}

export interface StageViewer {
  uid: string;
  name: string;
  avatar?: string | null;
  joinedAt: number;
}

export interface MediaStage {
  id: string;
  title: string;
  url: string;
  mediaType: MediaType;
  hostUid: string;
  hostName: string;
  hostAvatar?: string | null;
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;       // epoch ms used to compute drift
  djMode: boolean;         // true = only host can control playback
  viewers: StageViewer[];
  queue: QueueItem[];
  createdAt: number;
}

// ─── URL Helpers ─────────────────────────────────────────────────────────────
export function detectMediaType(url: string): MediaType {
  if (/twitch\.tv/.test(url)) return 'twitch';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  return 'direct';
}

export function extractYouTubeIdFromUrl(url: string): string | null {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function extractVideoTitle(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    if (domain.includes('youtube') || domain.includes('youtu.be')) return 'YouTube Video';
    if (domain.includes('twitch')) return 'Twitch Stream';
    return domain;
  } catch {
    return 'Video';
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useMediaStages(
  passkey: string,
  userUid: string | null,
  userName: string | null,
  userAvatar?: string | null,
) {
  const [stages, setStages] = useState<MediaStage[]>([]);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);

  const activeStage = stages.find((s) => s.id === activeStageId) ?? null;
  const isHost = activeStage?.hostUid === userUid;
  const canControl = !activeStage?.djMode || isHost;

  // ── Real-time subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!passkey) return;
    const stagesCol = collection(db, 'rooms', passkey, 'stages');
    const unsubscribe = onSnapshot(stagesCol, (snap) => {
      const fetched: MediaStage[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || 'Untitled Stage',
          url: data.url || '',
          mediaType: data.mediaType || 'youtube',
          hostUid: data.hostUid || '',
          hostName: data.hostName || 'Host',
          hostAvatar: data.hostAvatar ?? null,
          isPlaying: data.isPlaying ?? false,
          currentTime: data.currentTime ?? 0,
          updatedAt: data.updatedAt ?? Date.now(),
          djMode: data.djMode ?? true,
          viewers: data.viewers ?? [],
          queue: data.queue ?? [],
          createdAt: data.createdAt ?? Date.now(),
        };
      });
      // Sort by creation time so oldest stage is first
      fetched.sort((a, b) => a.createdAt - b.createdAt);
      setStages(fetched);
    });

    return unsubscribe;
  }, [passkey]);

  // ── Create Stage ─────────────────────────────────────────────────────────
  const createStage = useCallback(
    async (url: string, customTitle?: string) => {
      if (!passkey || !userUid || !userName) return null;

      const mediaType = detectMediaType(url);
      const title = customTitle || extractVideoTitle(url);
      const stagesCol = collection(db, 'rooms', passkey, 'stages');

      const docRef = await addDoc(stagesCol, {
        title,
        url,
        mediaType,
        hostUid: userUid,
        hostName: userName,
        hostAvatar: userAvatar ?? null,
        isPlaying: true,
        currentTime: 0,
        updatedAt: Date.now(),
        djMode: true,
        viewers: [{ uid: userUid, name: userName, avatar: userAvatar ?? null, joinedAt: Date.now() }],
        queue: [],
        createdAt: Date.now(),
      });

      setActiveStageId(docRef.id);
      return docRef.id;
    },
    [passkey, userUid, userName, userAvatar],
  );

  // ── Join Stage ───────────────────────────────────────────────────────────
  const joinStage = useCallback(
    async (stageId: string) => {
      if (!passkey || !userUid || !userName) return;

      setActiveStageId(stageId);

      const stageRef = doc(db, 'rooms', passkey, 'stages', stageId);
      const stage = stages.find((s) => s.id === stageId);
      if (!stage) return;

      const alreadyIn = stage.viewers.some((v) => v.uid === userUid);
      if (!alreadyIn) {
        const updatedViewers: StageViewer[] = [
          ...stage.viewers,
          { uid: userUid, name: userName, avatar: userAvatar ?? null, joinedAt: Date.now() },
        ];
        await updateDoc(stageRef, { viewers: updatedViewers });
      }
    },
    [passkey, userUid, userName, userAvatar, stages],
  );

  // ── Leave Stage ──────────────────────────────────────────────────────────
  const leaveStage = useCallback(
    async (stageId: string) => {
      if (!passkey || !userUid) return;

      const stageRef = doc(db, 'rooms', passkey, 'stages', stageId);
      const stage = stages.find((s) => s.id === stageId);
      if (!stage) return;

      const updatedViewers = stage.viewers.filter((v) => v.uid !== userUid);

      // If host leaves and no viewers remain, delete stage. If viewers remain, assign new host.
      if (updatedViewers.length === 0) {
        await deleteDoc(stageRef);
      } else if (stage.hostUid === userUid) {
        // Transfer host to first remaining viewer
        const newHost = updatedViewers[0];
        await updateDoc(stageRef, {
          viewers: updatedViewers,
          hostUid: newHost.uid,
          hostName: newHost.name,
          hostAvatar: newHost.avatar ?? null,
        });
      } else {
        await updateDoc(stageRef, { viewers: updatedViewers });
      }

      if (activeStageId === stageId) {
        setActiveStageId(null);
      }
    },
    [passkey, userUid, stages, activeStageId],
  );

  // ── Close Stage (host only) ──────────────────────────────────────────────
  const closeStage = useCallback(
    async (stageId: string) => {
      if (!passkey) return;
      const stageRef = doc(db, 'rooms', passkey, 'stages', stageId);
      await deleteDoc(stageRef);
      if (activeStageId === stageId) setActiveStageId(null);
    },
    [passkey, activeStageId],
  );

  // ── Update Playback (respects DJ mode) ──────────────────────────────────
  const updatePlayback = useCallback(
    async (stageId: string, isPlaying: boolean, currentTime: number) => {
      if (!passkey || !userUid) return;
      const stage = stages.find((s) => s.id === stageId);
      if (!stage) return;
      if (stage.djMode && stage.hostUid !== userUid) return; // locked

      const stageRef = doc(db, 'rooms', passkey, 'stages', stageId);
      await updateDoc(stageRef, {
        isPlaying,
        currentTime,
        updatedAt: Date.now(),
      });
    },
    [passkey, userUid, stages],
  );

  // ── Seek ─────────────────────────────────────────────────────────────────
  const seekTo = useCallback(
    async (stageId: string, seconds: number) => {
      if (!passkey || !userUid) return;
      const stage = stages.find((s) => s.id === stageId);
      if (!stage) return;
      if (stage.djMode && stage.hostUid !== userUid) return;

      const stageRef = doc(db, 'rooms', passkey, 'stages', stageId);
      await updateDoc(stageRef, {
        currentTime: Math.max(0, seconds),
        updatedAt: Date.now(),
      });
    },
    [passkey, userUid, stages],
  );

  // ── Toggle DJ Mode ───────────────────────────────────────────────────────
  const toggleDjMode = useCallback(
    async (stageId: string) => {
      if (!passkey || !userUid) return;
      const stage = stages.find((s) => s.id === stageId);
      if (!stage || stage.hostUid !== userUid) return;

      const stageRef = doc(db, 'rooms', passkey, 'stages', stageId);
      await updateDoc(stageRef, { djMode: !stage.djMode });
    },
    [passkey, userUid, stages],
  );

  // ── Pass DJ / Transfer Host ──────────────────────────────────────────────
  const passHost = useCallback(
    async (stageId: string, newHostUid: string, newHostName: string, newHostAvatar?: string | null) => {
      if (!passkey || !userUid) return;
      const stage = stages.find((s) => s.id === stageId);
      if (!stage || stage.hostUid !== userUid) return;

      const stageRef = doc(db, 'rooms', passkey, 'stages', stageId);
      await updateDoc(stageRef, {
        hostUid: newHostUid,
        hostName: newHostName,
        hostAvatar: newHostAvatar ?? null,
      });
    },
    [passkey, userUid, stages],
  );

  // ── Add to Queue ─────────────────────────────────────────────────────────
  const addToQueue = useCallback(
    async (stageId: string, url: string, title: string) => {
      if (!passkey || !userUid || !userName) return;
      const stage = stages.find((s) => s.id === stageId);
      if (!stage) return;

      const newItem: QueueItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url,
        title,
        addedBy: userName,
        addedAt: Date.now(),
      };

      const stageRef = doc(db, 'rooms', passkey, 'stages', stageId);
      await updateDoc(stageRef, { queue: [...stage.queue, newItem] });
    },
    [passkey, userUid, userName, stages],
  );

  // ── Play Next in Queue ───────────────────────────────────────────────────
  const playNextInQueue = useCallback(
    async (stageId: string) => {
      if (!passkey || !userUid) return;
      const stage = stages.find((s) => s.id === stageId);
      if (!stage || stage.queue.length === 0) return;
      if (stage.djMode && stage.hostUid !== userUid) return;

      const [next, ...remaining] = stage.queue;
      const mediaType = detectMediaType(next.url);

      const stageRef = doc(db, 'rooms', passkey, 'stages', stageId);
      await updateDoc(stageRef, {
        url: next.url,
        title: next.title,
        mediaType,
        isPlaying: true,
        currentTime: 0,
        updatedAt: Date.now(),
        queue: remaining,
      });
    },
    [passkey, userUid, stages],
  );

  // ── Remove Queue Item ────────────────────────────────────────────────────
  const removeFromQueue = useCallback(
    async (stageId: string, itemId: string) => {
      if (!passkey || !userUid) return;
      const stage = stages.find((s) => s.id === stageId);
      if (!stage) return;
      if (stage.djMode && stage.hostUid !== userUid) return;

      const stageRef = doc(db, 'rooms', passkey, 'stages', stageId);
      await updateDoc(stageRef, {
        queue: stage.queue.filter((q) => q.id !== itemId),
      });
    },
    [passkey, userUid, stages],
  );

  return {
    stages,
    activeStage,
    activeStageId,
    setActiveStageId,
    isHost,
    canControl,
    createStage,
    joinStage,
    leaveStage,
    closeStage,
    updatePlayback,
    seekTo,
    toggleDjMode,
    passHost,
    addToQueue,
    playNextInQueue,
    removeFromQueue,
  };
}
