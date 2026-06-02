import { useState, useCallback, useEffect, useRef } from 'react';
import { db, auth, doc, onSnapshot, serverTimestamp, setDoc } from '@/lib/firebase';
import type { TimestampType } from '@/lib/firebase';

// Typing doc: conversations/{chatId}/meta/typing
// Shape: { [userId]: { name: string, updatedAt: Timestamp } }

export function useTyping(chatId?: string) {
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const selfStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!chatId) return;
    const docRef = doc(db, 'conversations', chatId, 'meta', 'typing');
    const unsub = onSnapshot(docRef, snap => {
      if (!snap.exists()) { setTypingUsers({}); return; }
      const data = snap.data() as Record<string, unknown>;
      const uid = auth.currentUser?.uid;
      const now = Date.now();
      const active: Record<string, string> = {};
      Object.entries(data).forEach(([userId, val]) => {
        if (userId === uid || !val || typeof val !== 'object') return;
        const entry = val as { name?: string; updatedAt?: TimestampType };
        const updatedAt = entry.updatedAt?.toDate?.()?.getTime() ?? 0;
        if (now - updatedAt < 5000) {
          active[userId] = entry.name || 'Someone';
        }
      });
      setTypingUsers(active);
    }, () => setTypingUsers({}));
    return unsub;
  }, [chatId]);

  const sendTyping = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (!chatId || !uid) return;
    const docRef = doc(db, 'conversations', chatId, 'meta', 'typing');
    const name = auth.currentUser?.displayName || 'Someone';
    setDoc(docRef, {
        [uid]: { name, updatedAt: serverTimestamp() },
      }, { merge: true }).catch(() => {});
    if (selfStopRef.current) clearTimeout(selfStopRef.current);
    selfStopRef.current = setTimeout(() => stopTyping(), 4000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const stopTyping = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (!chatId || !uid) return;
    if (selfStopRef.current) { clearTimeout(selfStopRef.current); selfStopRef.current = null; }
    setDoc(doc(db, 'conversations', chatId, 'meta', 'typing'), {
        [uid]: null,
      }, { merge: true }).catch(() => {});
  }, [chatId]);

  useEffect(() => () => {
    if (selfStopRef.current) clearTimeout(selfStopRef.current);
  }, []);

  return { typingUsers, sendTyping, stopTyping };
}
