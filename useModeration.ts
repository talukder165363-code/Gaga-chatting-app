import { useCallback } from 'react';
import { db, auth, addDoc, collection, serverTimestamp } from '@/lib/firebase';
import { sanitizeForLog } from '@/lib/utils';

export type ReportResult = { success: boolean };

export function useModeration() {
  const reportAbuse = useCallback(async (targetId: string, reason: string): Promise<ReportResult> => {
    const uid = auth.currentUser?.uid;
    if (!uid) return { success: false };
    try {
      await addDoc(collection(db, 'reports'), {
        reportedBy: uid,
        targetId,
        reason: reason.slice(0, 500),
        createdAt: serverTimestamp(),
        status: 'pending',
      });
      return { success: true };
    } catch (err) {
      console.error('Failed to submit report:', sanitizeForLog(err instanceof Error ? err.message : String(err)));
      return { success: false };
    }
  }, []);

  return { reportAbuse };
}
