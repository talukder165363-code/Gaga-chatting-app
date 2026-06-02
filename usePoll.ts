import { db, doc, updateDoc } from '@/lib/firebase';

export async function votePoll(chatId: string, messageId: string, option: string, uid?: string): Promise<void> {
  if (!uid || !chatId || !messageId || !option) return;

  const msgRef = doc(db, 'conversations', chatId, 'messages', messageId);
  // Use dot-notation to set only this user's vote key inside the poll.votes map
  await updateDoc(msgRef, {
    [`poll.votes.${uid}`]: option,
  });
}
