import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

export interface RoomEvent {
  id: string;
  title: string;
  description: string;
  dateTime: number;
  creatorUid: string;
  creatorName: string;
  rsvps: Record<string, 'going' | 'maybe' | 'not_going'>; // uid -> status
  rsvpNames: Record<string, string>; // uid -> name
  createdAt: number;
}

export function useEvents(
  passkey: string,
  userUid: string | null,
  userName: string | null,
) {
  const [events, setEvents] = useState<RoomEvent[]>([]);

  useEffect(() => {
    if (!passkey) return;
    const eventsCol = collection(db, 'rooms', passkey, 'events');
    const unsub = onSnapshot(eventsCol, (snap) => {
      const list: RoomEvent[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? '',
          description: data.description ?? '',
          dateTime: data.dateTime ?? Date.now(),
          creatorUid: data.creatorUid ?? '',
          creatorName: data.creatorName ?? 'Anonymous',
          rsvps: data.rsvps ?? {},
          rsvpNames: data.rsvpNames ?? {},
          createdAt: data.createdAt ?? Date.now(),
        };
      });
      list.sort((a, b) => a.dateTime - b.dateTime);
      setEvents(list);
    });
    return unsub;
  }, [passkey]);

  const createEvent = useCallback(
    async (title: string, description: string, dateTime: number) => {
      if (!passkey || !userUid || !userName || !title.trim()) return;
      const eventsCol = collection(db, 'rooms', passkey, 'events');
      await addDoc(eventsCol, {
        title: title.trim(),
        description: description.trim(),
        dateTime,
        creatorUid: userUid,
        creatorName: userName,
        rsvps: { [userUid]: 'going' },
        rsvpNames: { [userUid]: userName },
        createdAt: Date.now(),
      });
    },
    [passkey, userUid, userName],
  );

  const setRsvp = useCallback(
    async (eventId: string, status: 'going' | 'maybe' | 'not_going') => {
      if (!passkey || !userUid || !userName) return;
      const eventRef = doc(db, 'rooms', passkey, 'events', eventId);
      await updateDoc(eventRef, {
        [`rsvps.${userUid}`]: status,
        [`rsvpNames.${userUid}`]: userName,
      });
    },
    [passkey, userUid, userName],
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      if (!passkey) return;
      const eventRef = doc(db, 'rooms', passkey, 'events', eventId);
      await deleteDoc(eventRef);
    },
    [passkey],
  );

  return { events, createEvent, setRsvp, deleteEvent };
}
