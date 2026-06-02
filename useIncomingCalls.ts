import { useEffect, useState } from 'react';
import { db, auth, collection, query, where, onSnapshot } from '@/lib/firebase';
import type { TimestampType } from '@/lib/firebase';

export type IncomingCall = {
  id: string;
  from: string;
  type: 'voice' | 'video';
  createdAt?: Date;
};

export function useIncomingCalls() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, 'calls'),
      where('to', '==', uid),
      where('status', '==', 'calling'),
    );

    const unsub = onSnapshot(q, snap => {
      if (snap.empty) {
        setIncomingCall(null);
        return;
      }
      const d = snap.docs[0];
      const data = d.data() as Record<string, unknown>;
      const ts = data.timestamp as TimestampType | undefined;
      setIncomingCall({
        id: d.id,
        from: (data.from as string) || '',
        type: (data.type as 'voice' | 'video') || 'voice',
        createdAt: ts?.toDate?.() ?? new Date(),
      });
    });

    return unsub;
  }, []);

  return { incomingCall };
}
