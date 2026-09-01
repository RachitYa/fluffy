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

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdByUid: string;
  createdByName: string;
  completedByUid?: string | null;
  completedByName?: string | null;
  createdAt: number;
}

export function useTodoList(
  passkey: string,
  userUid: string | null,
  userName: string | null,
) {
  const [todos, setTodos] = useState<TodoItem[]>([]);

  useEffect(() => {
    if (!passkey) return;
    const todosCol = collection(db, 'rooms', passkey, 'todos');
    const unsub = onSnapshot(todosCol, (snap) => {
      const list: TodoItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          text: data.text ?? '',
          completed: Boolean(data.completed),
          createdByUid: data.createdByUid ?? '',
          createdByName: data.createdByName ?? 'Anonymous',
          completedByUid: data.completedByUid ?? null,
          completedByName: data.completedByName ?? null,
          createdAt: data.createdAt ?? Date.now(),
        };
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setTodos(list);
    });
    return unsub;
  }, [passkey]);

  const addTodo = useCallback(
    async (text: string) => {
      if (!passkey || !userUid || !userName || !text.trim()) return;
      const todosCol = collection(db, 'rooms', passkey, 'todos');
      await addDoc(todosCol, {
        text: text.trim(),
        completed: false,
        createdByUid: userUid,
        createdByName: userName,
        createdAt: Date.now(),
      });
    },
    [passkey, userUid, userName],
  );

  const toggleTodo = useCallback(
    async (id: string, currentStatus: boolean) => {
      if (!passkey) return;
      const todoRef = doc(db, 'rooms', passkey, 'todos', id);
      await updateDoc(todoRef, {
        completed: !currentStatus,
        completedByUid: !currentStatus ? userUid : null,
        completedByName: !currentStatus ? userName : null,
      });
    },
    [passkey, userUid, userName],
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      if (!passkey) return;
      const todoRef = doc(db, 'rooms', passkey, 'todos', id);
      await deleteDoc(todoRef);
    },
    [passkey],
  );

  return { todos, addTodo, toggleTodo, deleteTodo };
}
