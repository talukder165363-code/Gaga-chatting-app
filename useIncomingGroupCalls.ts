import { useEffect, useState } from 'react';
import { db, auth, collection, query, where, onSnapshot } from '@/lib/firebase';
import type { TimestampType } from '@/lib/firebase';

export type IncomingGroupCall = {
  id: string;
  host: string;
  participants: string[];
  type: 'voice' | 'video';
  createdAt?: Date;
};

export function useIncomingGroupCalls() {
  const [incomingGroupCall, setIncomingGroupCall] = useState<IncomingGroupCall | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, 'groupCalls'),
      where('participants', 'array-contains', uid),
      where('status', '==', 'calling'),
    );

    const unsub = onSnapshot(q, snap => {
      // Ignore calls where this user is the host (they initiated it)
      const incoming = snap.docs.find(d => d.data().host !== uid);
      if (!incoming) {
        setIncomingGroupCall(null);
        return;
      }
      const data = incoming.data() as Record<string, unknown>;
      const ts = data.timestamp as TimestampType | undefined;
      setIncomingGroupCall({
        id: incoming.id,
        host: (data.host as string) || '',
        participants: (data.participants as string[]) || [],
        type: (data.type as 'voice' | 'video') || 'voice',
        createdAt: ts?.toDate?.() ?? new Date(),
      });
    });

    return unsub;
  }, []);

  return { incomingGroupCall };
}
