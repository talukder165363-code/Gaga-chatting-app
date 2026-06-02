import { useState, useCallback, useRef } from 'react';
import type { Chat, Message } from '@/types';
import {
  db, auth,
  collection, doc, query, where, orderBy, limit,
  endBefore, limitToLast,
  onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  serverTimestamp, arrayUnion, arrayRemove,
} from '@/lib/firebase';
import type { QueryDocumentSnapshot, FirestoreData, TimestampType } from '@/lib/firebase';

export type ChatMessage = Message;

export type UseChatStore = {
  chats: Chat[];
  archivedChats: Chat[];
  messages: Record<string, ChatMessage[]>;
  activeChat: Chat | null;
  totalUnread: number;
  loadingChats: boolean;
  setActiveChat: (c: Chat | null) => void;
  subscribeChats: (uid: string) => () => void;
  subscribeMessages: (chatId: string) => () => void;
  loadOlderMessages: (chatId: string) => Promise<ChatMessage[]>;
  hasMoreMessages: (chatId: string) => boolean;
  sendMessage: (chatId: string, content: string, type?: string, replyTo?: unknown, forwardedFrom?: string) => Promise<ChatMessage | null>;
  editMessage: (chatId: string, messageId: string, content: string) => Promise<void>;
  addReaction: (chatId: string, messageId: string, reaction: string) => Promise<void>;
  sendPoll: (chatId: string, poll: unknown) => Promise<void>;
  markAsRead: (id: string) => void;
  pinChat: (id: string) => void;
  muteChat: (id: string) => void;
  archiveChat: (id: string) => void;
  deleteChat: (id: string) => void;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  createGroupChat: (name: string, participants: string[]) => Promise<string | null>;
  createDirectChat: (userId: string) => Promise<Chat | null>;
  addParticipant: (chatId: string, userId: string) => Promise<void>;
  removeParticipant: (chatId: string, userId: string) => Promise<void>;
  promoteAdmin: (chatId: string, userId: string) => Promise<void>;
  demoteAdmin: (chatId: string, userId: string) => Promise<void>;
  updateChat: (chatId: string, patch: Partial<Chat>) => Promise<void>;
};

function toDate(v: unknown): Date {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  if (typeof v === 'object' && 'toDate' in (v as object)) return (v as TimestampType).toDate();
  return new Date();
}

function docToChat(id: string, data: Record<string, unknown>): Chat {
  return {
    id,
    type: (data.type as Chat['type']) || 'direct',
    participants: (data.participants as string[]) || [],
    unreadCount: (data.unreadCount as number) || 0,
    isPinned: (data.isPinned as boolean) || false,
    isMuted: (data.isMuted as boolean) || false,
    isArchived: (data.isArchived as boolean) || false,
    isDeleted: (data.isDeleted as boolean) || false,
    name: (data.name as string) || '',
    avatar: (data.avatar as string) || '',
    description: (data.description as string) || '',
    admins: (data.admins as string[]) || [],
    createdAt: toDate(data.createdAt),
    lastMessage: data.lastMessageContent
      ? {
          id: '',
          chatId: id,
          senderId: (data.lastSenderId as string) || '',
          type: 'text',
          content: (data.lastMessageContent as string) || '',
          timestamp: toDate(data.lastTimestamp),
          read: true,
        }
      : undefined,
  };
}

function docToMessage(id: string, chatId: string, data: Record<string, unknown>): ChatMessage {
  return {
    id,
    chatId,
    senderId: (data.senderId as string) || '',
    type: (data.type as ChatMessage['type']) || 'text',
    content: (data.content as string) || '',
    timestamp: toDate(data.timestamp),
    read: (data.read as boolean) || false,
    reactions: (data.reactions as ChatMessage['reactions']) || [],
    replyTo: (data.replyTo as ChatMessage['replyTo']) || undefined,
    forwardedFrom: (data.forwardedFrom as string) || undefined,
    edited: (data.edited as boolean) || false,
    poll: (data.poll as ChatMessage['poll']) || undefined,
  };
}

const PAGE_SIZE = 30;

export function useChatStore(): UseChatStore {
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [activeChat, setActiveChatState] = useState<Chat | null>(null);
  const [loadingChats, setLoadingChats] = useState(false);

  // Track last doc per chat for pagination
  const lastDocRef = useRef<Record<string, QueryDocumentSnapshot<FirestoreData>>>({});
  const hasMoreRef = useRef<Record<string, boolean>>({});

  const chats = allChats.filter(c => !c.isArchived && !c.isDeleted);
  const archivedChats = allChats.filter(c => c.isArchived && !c.isDeleted);
  const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const setActiveChat = useCallback((c: Chat | null) => setActiveChatState(c), []);

  const subscribeChats = useCallback((uid: string) => {
    setLoadingChats(true);
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', uid),
      orderBy('lastTimestamp', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      const updated = snap.docs.map(d => docToChat(d.id, d.data() as Record<string, unknown>));
      setAllChats(updated);
      setLoadingChats(false);
    }, () => setLoadingChats(false));
    return unsub;
  }, []);

  const subscribeMessages = useCallback((chatId: string) => {
    const q = query(
      collection(db, 'conversations', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(200),
    );
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => docToMessage(d.id, chatId, d.data() as Record<string, unknown>));
      setMessages(prev => ({ ...prev, [chatId]: msgs }));
      // Only initialise the pagination cursor the first time; don't overwrite
      // it after loadOlderMessages has advanced it to an earlier page.
      if (snap.docs.length > 0 && !lastDocRef.current[chatId]) {
        lastDocRef.current[chatId] = snap.docs[0] as QueryDocumentSnapshot<FirestoreData>;
      }
      hasMoreRef.current[chatId] = snap.docs.length === 200;
    });
    return () => {
      unsub();
      // Reset cursor so re-opening the chat starts a fresh pagination window
      delete lastDocRef.current[chatId];
    };
  }, []);

  const loadOlderMessages = useCallback(async (chatId: string): Promise<ChatMessage[]> => {
    const oldestDoc = lastDocRef.current[chatId];
    if (!oldestDoc) return [];
    const q = query(
      collection(db, 'conversations', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      endBefore(oldestDoc),
      limitToLast(PAGE_SIZE),
    );
    const snap = await getDocs(q);
    const older = snap.docs.map(d => docToMessage(d.id, chatId, d.data() as Record<string, unknown>));
    if (snap.docs.length > 0) {
      lastDocRef.current[chatId] = snap.docs[0] as QueryDocumentSnapshot<FirestoreData>;
    }
    hasMoreRef.current[chatId] = snap.docs.length === PAGE_SIZE;
    setMessages(prev => ({ ...prev, [chatId]: [...older, ...(prev[chatId] || [])] }));
    return older;
  }, []);

  const hasMoreMessages = useCallback((chatId: string) => hasMoreRef.current[chatId] || false, []);

  const sendMessage = useCallback(async (
    chatId: string, content: string, type = 'text', replyTo?: unknown, forwardedFrom?: string,
  ): Promise<ChatMessage | null> => {
    const uid = auth.currentUser?.uid;
    if (!uid || !chatId || !content.trim()) return null;
    const msgData: Record<string, unknown> = {
      senderId: uid,
      content: content.trim(),
      type,
      timestamp: serverTimestamp(),
      read: false,
      reactions: [],
    };
    if (replyTo) msgData.replyTo = replyTo;
    if (forwardedFrom) msgData.forwardedFrom = forwardedFrom;
    const ref = await addDoc(collection(db, 'conversations', chatId, 'messages'), msgData);
    await updateDoc(doc(db, 'conversations', chatId), {
      lastMessageContent: content.trim(),
      lastSenderId: uid,
      lastTimestamp: serverTimestamp(),
    });
    return { id: ref.id, chatId, senderId: uid, type: type as ChatMessage['type'], content: content.trim(), timestamp: new Date(), read: false };
  }, []);

  const editMessage = useCallback(async (chatId: string, messageId: string, content: string) => {
    await updateDoc(doc(db, 'conversations', chatId, 'messages', messageId), {
      content,
      edited: true,
    });
  }, []);

  const deleteMessage = useCallback(async (chatId: string, messageId: string) => {
    await deleteDoc(doc(db, 'conversations', chatId, 'messages', messageId));
  }, []);

  const addReaction = useCallback(async (chatId: string, messageId: string, emoji: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await updateDoc(doc(db, 'conversations', chatId, 'messages', messageId), {
      reactions: arrayUnion({ userId: uid, emoji }),
    });
  }, []);

  const sendPoll = useCallback(async (chatId: string, poll: unknown) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await addDoc(collection(db, 'conversations', chatId, 'messages'), {
      senderId: uid,
      type: 'poll',
      content: '',
      poll,
      timestamp: serverTimestamp(),
      read: false,
    });
  }, []);

  const markAsRead = useCallback((chatId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    updateDoc(doc(db, 'conversations', chatId), { unreadCount: 0 }).catch(() => {});
  }, []);

  const pinChat = useCallback((chatId: string) => {
    const chat = allChats.find(c => c.id === chatId);
    if (!chat) return;
    updateDoc(doc(db, 'conversations', chatId), { isPinned: !chat.isPinned }).catch(() => {});
  }, [allChats]);

  const muteChat = useCallback((chatId: string) => {
    const chat = allChats.find(c => c.id === chatId);
    if (!chat) return;
    updateDoc(doc(db, 'conversations', chatId), { isMuted: !chat.isMuted }).catch(() => {});
  }, [allChats]);

  const archiveChat = useCallback((chatId: string) => {
    updateDoc(doc(db, 'conversations', chatId), { isArchived: true }).catch(() => {});
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    updateDoc(doc(db, 'conversations', chatId), { isDeleted: true }).catch(() => {});
  }, []);

  const createGroupChat = useCallback(async (name: string, participants: string[]): Promise<string | null> => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    const allParticipants = Array.from(new Set([uid, ...participants]));
    const ref = await addDoc(collection(db, 'conversations'), {
      type: 'group',
      name,
      participants: allParticipants,
      admins: [uid],
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isArchived: false,
      isDeleted: false,
      createdAt: serverTimestamp(),
      lastTimestamp: serverTimestamp(),
    });
    return ref.id;
  }, []);

  const createDirectChat = useCallback(async (userId: string): Promise<Chat | null> => {
    const uid = auth.currentUser?.uid;
    if (!uid || !userId) return null;
    // Check for existing direct chat
    const q = query(
      collection(db, 'conversations'),
      where('type', '==', 'direct'),
      where('participants', 'array-contains', uid),
    );
    const snap = await getDocs(q);
    const existing = snap.docs.find(d => {
      const parts = (d.data().participants as string[]) || [];
      return parts.includes(userId);
    });
    if (existing) return docToChat(existing.id, existing.data() as Record<string, unknown>);

    const ref = await addDoc(collection(db, 'conversations'), {
      type: 'direct',
      participants: [uid, userId],
      admins: [uid],
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isArchived: false,
      isDeleted: false,
      createdAt: serverTimestamp(),
      lastTimestamp: serverTimestamp(),
    });
    const newSnap = await getDoc(doc(db, 'conversations', ref.id));
    return docToChat(ref.id, newSnap.data() as Record<string, unknown>);
  }, []);

  const addParticipant = useCallback(async (chatId: string, userId: string) => {
    await updateDoc(doc(db, 'conversations', chatId), {
      participants: arrayUnion(userId),
    });
  }, []);

  const removeParticipant = useCallback(async (chatId: string, userId: string) => {
    await updateDoc(doc(db, 'conversations', chatId), {
      participants: arrayRemove(userId),
    });
  }, []);

  const promoteAdmin = useCallback(async (chatId: string, userId: string) => {
    await updateDoc(doc(db, 'conversations', chatId), {
      admins: arrayUnion(userId),
    });
  }, []);

  const demoteAdmin = useCallback(async (chatId: string, userId: string) => {
    await updateDoc(doc(db, 'conversations', chatId), {
      admins: arrayRemove(userId),
    });
  }, []);

  const updateChat = useCallback(async (chatId: string, patch: Partial<Chat>) => {
    await updateDoc(doc(db, 'conversations', chatId), patch as Record<string, unknown>);
  }, []);

  return {
    chats, archivedChats, messages, activeChat, totalUnread, loadingChats,
    setActiveChat, subscribeChats, subscribeMessages, loadOlderMessages,
    hasMoreMessages, sendMessage, editMessage, addReaction, sendPoll,
    markAsRead, pinChat, muteChat, archiveChat, deleteChat, deleteMessage,
    createGroupChat, createDirectChat, addParticipant, removeParticipant,
    promoteAdmin, demoteAdmin, updateChat,
  };
}
