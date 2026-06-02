import { useEffect, useMemo, useState } from 'react';
import { db, auth, doc, updateDoc, onSnapshot, collection, where, query } from '@/lib/firebase';
import { getDatabase, ref, onValue, onDisconnect, set, serverTimestamp as rtServerTimestamp } from 'firebase/database';

function getRtdb() {
  try {
    return getDatabase();
  } catch {
    return null;
  }
}

export function usePresence() {
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Mark user online in Firestore
    updateDoc(doc(db, 'users', uid), { status: 'online', lastSeen: new Date() }).catch(() => {});

    // Use RTDB for reliable disconnect detection if available
    const rtdb = getRtdb();
    if (rtdb) {
      const statusRef = ref(rtdb, `status/${uid}`);
      const connectedRef = ref(rtdb, '.info/connected');

      const unsub = onValue(connectedRef, (snap) => {
        if (!snap.val()) return;
        onDisconnect(statusRef).set({ state: 'offline', lastSeen: rtServerTimestamp() });
        set(statusRef, { state: 'online', lastSeen: rtServerTimestamp() });
      });

      return () => {
        unsub();
        set(statusRef, { state: 'offline', lastSeen: rtServerTimestamp() });
        updateDoc(doc(db, 'users', uid), { status: 'offline', lastSeen: new Date() }).catch(() => {});
      };
    }

    // Fallback: mark offline on unload
    const markOffline = () => {
      updateDoc(doc(db, 'users', uid), { status: 'offline', lastSeen: new Date() }).catch(() => {});
    };
    window.addEventListener('beforeunload', markOffline);
    return () => {
      window.removeEventListener('beforeunload', markOffline);
      markOffline();
    };
  }, []);

  const onlineUsers = useMemo(() => ({} as Record<string, boolean>), []);
  return { onlineUsers };
}

export function useOnlineUsers(ids: string[] = []) {
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!ids.length) return;
    const CHUNK = 30;
    const unsubscribers: (() => void)[] = [];
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
      unsubscribers.push(
        onSnapshot(q, snap => {
          setOnlineMap(prev => {
            const next = { ...prev };
            snap.docs.forEach(d => { next[d.id] = d.data().status === 'online'; });
            return next;
          });
        })
      );
    }
    return () => unsubscribers.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  return { onlineUsers: onlineMap };
}
