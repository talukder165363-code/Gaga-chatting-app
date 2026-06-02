import { useState, useEffect, useCallback } from 'react';
import { db, auth, doc, updateDoc, onSnapshot } from '@/lib/firebase';
import type { PinnedMessage } from '@/types';

export function useMessagePin(chatId?: string) {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);

  useEffect(() => {
    if (!chatId) return;
    const unsub = onSnapshot(doc(db, 'conversations', chatId), snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      setPinnedMessages((data.pinnedMessages as PinnedMessage[]) || []);
    });
    return unsub;
  }, [chatId]);

  const pinMessage = useCallback(async (message: { id: string; content: string; senderId: string }) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !chatId) return;
    const pinned: PinnedMessage = {
      messageId: message.id,
      content: message.content,
      senderId: message.senderId,
      pinnedAt: new Date(),
      pinnedBy: uid,
    };
    const next = [...pinnedMessages.filter(p => p.messageId !== message.id), pinned];
    await updateDoc(doc(db, 'conversations', chatId), { pinnedMessages: next });
  }, [chatId, pinnedMessages]);

  const unpinMessage = useCallback(async (messageId: string) => {
    if (!chatId) return;
    const next = pinnedMessages.filter(p => p.messageId !== messageId);
    await updateDoc(doc(db, 'conversations', chatId), { pinnedMessages: next });
  }, [chatId, pinnedMessages]);

  return { pinnedMessages, pinMessage, unpinMessage };
}
