import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

export interface BookmarkFolder {
  id: string;
  name: string;
  emoji: string;
}

export interface Bookmark {
  id: string;
  messageId: string;
  text: string;
  senderName: string;
  passkey: string;
  roomTitle: string;
  folderId: string;
  savedAt: number;
}

export const DEFAULT_FOLDERS: BookmarkFolder[] = [
  { id: 'all', name: 'All', emoji: '🔖' },
  { id: 'ideas', name: 'Ideas', emoji: '💡' },
  { id: 'links', name: 'Links', emoji: '🔗' },
  { id: 'important', name: 'Important', emoji: '⭐' },
];

export function useBookmarks(userUid: string | null) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    if (!userUid) return;
    const bookmarksDoc = doc(db, 'users', userUid, 'data', 'bookmarks');
    const unsub = onSnapshot(bookmarksDoc, (snap) => {
      if (!snap.exists()) { setBookmarks([]); return; }
      const data = snap.data();
      const list: Bookmark[] = Object.values(data.items ?? {});
      list.sort((a: any, b: any) => b.savedAt - a.savedAt);
      setBookmarks(list);
    });
    return unsub;
  }, [userUid]);

  const addBookmark = useCallback(
    async (
      messageId: string,
      text: string,
      senderName: string,
      passkey: string,
      roomTitle: string,
      folderId: string = 'all',
    ) => {
      if (!userUid) return;
      const bookmark: Bookmark = {
        id: `${messageId}-${Date.now()}`,
        messageId,
        text,
        senderName,
        passkey,
        roomTitle,
        folderId,
        savedAt: Date.now(),
      };
      const bookmarksDoc = doc(db, 'users', userUid, 'data', 'bookmarks');
      await setDoc(bookmarksDoc, { [`items.${bookmark.id}`]: bookmark }, { merge: true });
    },
    [userUid],
  );

  const removeBookmark = useCallback(
    async (bookmarkId: string) => {
      if (!userUid) return;
      const bookmarksDoc = doc(db, 'users', userUid, 'data', 'bookmarks');
      await setDoc(bookmarksDoc, { [`items.${bookmarkId}`]: null }, { merge: true });
    },
    [userUid],
  );

  const isBookmarked = useCallback(
    (messageId: string) => bookmarks.some((b) => b.messageId === messageId),
    [bookmarks],
  );

  return { bookmarks, addBookmark, removeBookmark, isBookmarked };
}
