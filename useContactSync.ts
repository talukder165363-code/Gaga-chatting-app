import { useState, useCallback } from 'react';
import { db, auth, collection, getDocs, query, where, updateDoc, doc, arrayUnion } from '@/lib/firebase';
import { sanitizeForLog } from '@/lib/utils';

export function useContactSync() {
  const [synced, setSynced] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  const syncContacts = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return { success: false };

    setSyncing(true);
    try {
      // Use the Contact Picker API where available
      const ContactsManager = (navigator as unknown as { contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ email?: string[]; tel?: string[] }>> } }).contacts;
      if (!ContactsManager) {
        setSynced(true);
        setLastSynced(new Date());
        return { success: true };
      }

      const contacts = await ContactsManager.select(['email', 'tel'], { multiple: true });
      const emails = contacts.flatMap(c => c.email || []).filter(Boolean);
      const phones = contacts.flatMap(c => c.tel || []).filter(Boolean);

      if (!emails.length && !phones.length) {
        setSynced(true);
        setLastSynced(new Date());
        return { success: true };
      }

      // Find matching users in Firestore (batch in chunks of 10 — Firestore 'in' limit)
      const matchedIds = new Set<string>();

      const chunkBy10 = <T>(arr: T[]): T[][] =>
        Array.from({ length: Math.ceil(arr.length / 10) }, (_, i) => arr.slice(i * 10, i * 10 + 10));

      for (const chunk of chunkBy10(emails)) {
        const snap = await getDocs(query(collection(db, 'users'), where('email', 'in', chunk)));
        snap.docs.forEach(d => { if (d.id !== uid) matchedIds.add(d.id); });
      }
      for (const chunk of chunkBy10(phones)) {
        const snap = await getDocs(query(collection(db, 'users'), where('phone', 'in', chunk)));
        snap.docs.forEach(d => { if (d.id !== uid) matchedIds.add(d.id); });
      }

      if (matchedIds.size > 0) {
        await updateDoc(doc(db, 'users', uid), {
          friends: arrayUnion(...Array.from(matchedIds)),
        });
      }

      setSynced(true);
      setLastSynced(new Date());
      return { success: true };
    } catch (err) {
      console.error('Contact sync failed:', sanitizeForLog(err instanceof Error ? err.message : String(err)));
      return { success: false };
    } finally {
      setSyncing(false);
    }
  }, []);

  return { synced, lastSynced, syncContacts, syncing };
}
