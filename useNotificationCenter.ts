import { useState, useEffect, useCallback } from 'react';
import type { AppNotification } from '@/types';
import {
  db, auth, collection, query, where, orderBy, limit,
  onSnapshot, updateDoc, doc, writeBatch,
} from '@/lib/firebase';
import type { TimestampType } from '@/lib/firebase';
import { stripHtml } from '@/lib/utils';

export function useNotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(50),
    );

    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        const ts = data.timestamp as TimestampType | undefined;
        return {
          id: d.id,
          userId: (data.userId as string) || uid,
          type: (data.type as AppNotification['type']) || 'message',
          title: (data.title as string) || '',
          body: stripHtml((data.body as string) || ''),
          read: (data.read as boolean) || false,
          timestamp: ts?.toDate?.() ?? new Date(),
          data: (data.data as Record<string, unknown>) || {},
        };
      }));
    });

    return unsub;
  }, []);

  const markRead = useCallback(async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true }).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read);
    if (!unread.length) return;
    const batch = writeBatch();
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }));
    await batch.commit().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead };
}
