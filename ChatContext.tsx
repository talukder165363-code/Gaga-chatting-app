import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { FirestoreData, QuerySnapshot } from '@/lib/firebase';

import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import type { GroupRole, JoinMode } from '@/context/groupTypes';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from '@/lib/firebase';
import type { Conversation, Message, User } from '@/data/mockData';



import type { ReplyPreview } from '@/types';

interface ChatContextType {
  conversations: Conversation[];
  archivedConversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversation: (id: string) => void;
  createConversation: (partner: User) => Promise<void>;
  createGroup: (options: {
    name: string;
    description?: string;
    memberIds: string[];
    joinMode: JoinMode;
  }) => Promise<void>;
  addGroupMember: (chatId: string, memberId: string) => Promise<void>;
  removeGroupMember: (chatId: string, memberId: string) => Promise<void>;
  promoteGroupMember: (chatId: string, memberId: string) => Promise<void>;
  banGroupMember: (chatId: string, memberId: string) => Promise<void>;
  unbanGroupMember: (chatId: string, memberId: string) => Promise<void>;
  requestGroupJoin: (chatId: string) => Promise<void>;
  approveGroupJoinRequest: (chatId: string, requesterId: string) => Promise<void>;
  rejectGroupJoinRequest: (chatId: string, requesterId: string) => Promise<void>;
  joinGroup: (chatId: string) => Promise<void>;
  activeConversation: Conversation | null;
  sendMessage: (content: string, type?: Message['type'], replyTo?: ReplyPreview) => Promise<void>;
  editMessage: (chatId: string, messageId: string, newContent: string) => Promise<void>;
  markRead: (chatId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  archiveConversation: (chatId: string) => Promise<void>;
  restoreConversation: (chatId: string) => Promise<void>;
  isTyping: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

type FirestoreValue = unknown;

const isTimestampLike = (value: unknown): value is { toDate: () => Date } =>
  typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function';

const formatTimestamp = (value: FirestoreValue): string => {
  if (!value) return '';
  if (isTimestampLike(value)) {
    return value.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (value instanceof Date) {
    return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return String(value);
};

type ConversationDoc = {
  user?: {
    id: string;
    name?: string;
    avatar?: string;
    status?: string;
    online?: boolean;
  };
  type?: 'direct' | 'group';
  name?: string;
  avatarUrl?: string;
  description?: string;
  createdBy?: string;
  joinMode?: JoinMode;
  participants?: string[];
  memberRoles?: Record<string, GroupRole>;
  bannedUsers?: string[];
  joinRequests?: string[];
  lastMessage?: string;
  lastTimestamp?: unknown;
  timestamp?: unknown;
  unread?: number;
  archived?: boolean;
};

const mapConversationDoc = (id: string, data: ConversationDoc): Conversation => {
  const isGroup = data.type === 'group';
  const userData = data.user
    ? {
        id: data.user.id,
        name: data.user.name ?? (isGroup ? data.name ?? 'Group chat' : 'Unknown'),
        avatar: data.user.avatar ?? (isGroup ? data.avatarUrl ?? '/logo.jpg' : '/logo.jpg'),
        status: data.user.status ?? (isGroup ? 'Group chat' : 'Offline'),
        online: data.user.online ?? false,
      }
    : {
        id: isGroup ? 'group' : 'unknown',
        name: isGroup ? data.name ?? 'Group chat' : 'Unknown',
        avatar: isGroup ? data.avatarUrl ?? '/logo.jpg' : '/logo.jpg',
        status: isGroup ? 'Group chat' : 'Offline',
        online: false,
      };

  return {
    id,
    type: data.type ?? 'direct',
    user: userData,
    name: data.name,
    avatarUrl: data.avatarUrl,
    description: data.description,
    createdBy: data.createdBy,
    joinMode: data.joinMode,
    participants: data.participants,
    memberRoles: data.memberRoles,
    bannedUsers: data.bannedUsers ?? [],
    joinRequests: data.joinRequests ?? [],
    lastMessage: data.lastMessage ?? '',
    timestamp: formatTimestamp(data.lastTimestamp ?? data.timestamp),
    unread: data.unread ?? 0,
    archived: data.archived ?? false,
    messages: [],
  };
};

type MessageDoc = {
  senderId?: string;
  content?: string;
  timestamp?: unknown;
  type?: Message['type'];
};

const mapMessageDoc = (id: string, data: MessageDoc): Message => ({
  id,
  senderId: data.senderId ?? 'unknown',
  content: data.content ?? '',
  timestamp: formatTimestamp(data.timestamp),
  type: data.type ?? 'text',
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isTyping] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [activeConversationId, conversations],
  );

  const archivedConversations = useMemo(
    () => conversations.filter((c) => c.archived),
    [conversations],
  );

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setActiveConversationId(null);
      return;
    }

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastTimestamp', 'desc'),
    );

    const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
      const querySnapshot = snapshot as QuerySnapshot<FirestoreData>;
      const updated = querySnapshot.docs.map((docSnap) => mapConversationDoc(docSnap.id, docSnap.data() as ConversationDoc));
      setConversations(updated);
      if (!activeConversationId && updated.length > 0) {
        setActiveConversationId(updated[0].id);
      }

      if (activeConversationId && !updated.some((conv: Conversation) => conv.id === activeConversationId)) {
        setActiveConversationId(updated[0]?.id ?? null);
      }
    });

    return unsubscribe;
  }, [userId, activeConversationId]);

  useEffect(() => {
    if (!userId || !activeConversationId) return;

    const messagesQuery = query(
      collection(db, 'conversations', activeConversationId, 'messages'),
      orderBy('timestamp', 'asc'),
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const querySnapshot = snapshot as QuerySnapshot<FirestoreData>;
      const messages = querySnapshot.docs.map((docSnap) => mapMessageDoc(docSnap.id, docSnap.data() as MessageDoc));
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeConversationId
            ? { ...conversation, messages }
            : conversation,
        ),
      );
    });

    return unsubscribeMessages;
  }, [userId, activeConversationId]);

  const setActiveConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      void markRead(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId],
  );

  const markRead = useCallback(
    async (chatId: string) => {
      if (!userId) return;
      const conversationRef = doc(db, 'conversations', chatId);
      try {
        await updateDoc(conversationRef, {
          unread: 0,
        });
      } catch (error) {
        console.error('Unable to mark conversation read:', error);
      }
    },
    [userId],
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const batch = writeBatch();
    conversations.forEach((conversation) => {
      if (conversation.unread > 0) {
        const conversationRef = doc(db, 'conversations', conversation.id);
        batch.update(conversationRef, { unread: 0 });
      }
    });
    try {
      await batch.commit();
    } catch (error) {
      console.error('Unable to mark all conversations read:', error);
    }
  }, [conversations, userId]);

  const archiveConversation = useCallback(async (chatId: string) => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'conversations', chatId), {
        archived: true,
      });
      if (activeConversationId === chatId) {
        setActiveConversationId(conversations.find((c) => !c.archived && c.id !== chatId)?.id ?? null);
      }
    } catch (error) {
      console.error('Unable to archive conversation:', error);
    }
  }, [userId, activeConversationId, conversations]);

  const restoreConversation = useCallback(async (chatId: string) => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'conversations', chatId), {
        archived: false,
      });
    } catch (error) {
      console.error('Unable to restore conversation:', error);
    }
  }, [userId]);

  const createConversation = useCallback(
    async (partner: User) => {
      if (!userId) return;
      const existing = conversations.find((conversation) => conversation.user?.id === partner.id);
      if (existing) {
        setActiveConversationId(existing.id);
        await markRead(existing.id);
        return;
      }

      try {
        const conversationRef = await addDoc(collection(db, 'conversations'), {
          participants: [userId, partner.id],
          user: {
            id: partner.id,
            name: partner.name,
            avatar: partner.avatar,
            status: partner.status,
            online: partner.online,
          },
          lastMessage: '',
          lastTimestamp: serverTimestamp(),
          unread: 0,
          archived: false,
        });
        setActiveConversationId(conversationRef.id);
      } catch (error) {
        console.error('Unable to create conversation:', error);
      }
    },
    [userId, conversations, markRead],
  );

  const createGroup = useCallback(
    async ({
      name,
      description,
      memberIds,
      joinMode,
    }: {
      name: string;
      description?: string;
      memberIds: string[];
      joinMode: JoinMode;
    }) => {
      if (!userId) return;
      const participants = Array.from(new Set([userId, ...memberIds]));
      const memberRoles = participants.reduce<Record<string, GroupRole>>((acc, participantId) => {
        acc[participantId] = participantId === userId ? 'owner' : 'member';
        return acc;
      }, {});

      try {
        const conversationRef = await addDoc(collection(db, 'conversations'), {
          type: 'group',
          name,
          avatarUrl: '/logo.jpg',
          description: description ?? '',
          createdBy: userId,
          joinMode,
          participants,
          memberRoles,
          bannedUsers: [],
          joinRequests: [],
          lastMessage: '',
          lastTimestamp: serverTimestamp(),
          unread: 0,
          archived: false,
        });
        setActiveConversationId(conversationRef.id);
      } catch (error) {
        console.error('Unable to create group conversation:', error);
      }
    },
    [userId],
  );

  const addGroupMember = useCallback(
    async (chatId: string, memberId: string) => {
      if (!userId) return;
      const conversation = conversations.find((conversation) => conversation.id === chatId);
      if (!conversation || conversation.type !== 'group') return;
      const currentRole = conversation.memberRoles?.[userId];
      if (currentRole !== 'owner' && currentRole !== 'admin') return;
      const participants = Array.from(new Set([...(conversation.participants ?? []), memberId]));
      const memberRoles = {
        ...(conversation.memberRoles ?? {}),
        [memberId]: 'member' as GroupRole,
      };
      try {
        await updateDoc(doc(db, 'conversations', chatId), {
          participants,
          memberRoles,
        });
      } catch (error) {
        console.error('Unable to add group member:', error);
      }
    },
    [userId, conversations],
  );

  const removeGroupMember = useCallback(
    async (chatId: string, memberId: string) => {
      if (!userId) return;
      const conversation = conversations.find((conversation) => conversation.id === chatId);
      if (!conversation || conversation.type !== 'group') return;
      const currentRole = conversation.memberRoles?.[userId];
      if (currentRole !== 'owner' && currentRole !== 'admin') return;
      if (memberId === conversation.createdBy) return;
      const participants = (conversation.participants ?? []).filter((id) => id !== memberId);
      const memberRoles = { ...(conversation.memberRoles ?? {}) };
      delete memberRoles[memberId];
      try {
        await updateDoc(doc(db, 'conversations', chatId), {
          participants,
          memberRoles,
        });
      } catch (error) {
        console.error('Unable to remove group member:', error);
      }
    },
    [userId, conversations],
  );

  const promoteGroupMember = useCallback(
    async (chatId: string, memberId: string) => {
      if (!userId) return;
      const conversation = conversations.find((conversation) => conversation.id === chatId);
      if (!conversation || conversation.type !== 'group') return;
      const currentRole = conversation.memberRoles?.[userId];
      if (currentRole !== 'owner' && currentRole !== 'admin') return;
      if (!conversation.participants?.includes(memberId)) return;
      if (memberId === conversation.createdBy) return;
      const memberRoles = {
        ...(conversation.memberRoles ?? {}),
        [memberId]: 'admin' as GroupRole,
      };
      try {
        await updateDoc(doc(db, 'conversations', chatId), {
          memberRoles,
        });
      } catch (error) {
        console.error('Unable to promote group member:', error);
      }
    },
    [userId, conversations],
  );

  const banGroupMember = useCallback(
    async (chatId: string, memberId: string) => {
      if (!userId) return;
      const conversation = conversations.find((conversation) => conversation.id === chatId);
      if (!conversation || conversation.type !== 'group') return;
      const currentRole = conversation.memberRoles?.[userId];
      if (currentRole !== 'owner' && currentRole !== 'admin') return;
      if (memberId === conversation.createdBy) return;
      const participants = (conversation.participants ?? []).filter((id) => id !== memberId);
      const memberRoles = { ...(conversation.memberRoles ?? {}) };
      delete memberRoles[memberId];
      const bannedUsers = Array.from(new Set([...(conversation.bannedUsers ?? []), memberId]));
      try {
        await updateDoc(doc(db, 'conversations', chatId), {
          participants,
          memberRoles,
          bannedUsers,
        });
      } catch (error) {
        console.error('Unable to ban group member:', error);
      }
    },
    [userId, conversations],
  );

  const unbanGroupMember = useCallback(
    async (chatId: string, memberId: string) => {
      if (!userId) return;
      const conversation = conversations.find((conversation) => conversation.id === chatId);
      if (!conversation || conversation.type !== 'group') return;
      const currentRole = conversation.memberRoles?.[userId];
      if (currentRole !== 'owner' && currentRole !== 'admin') return;
      const bannedUsers = (conversation.bannedUsers ?? []).filter((id) => id !== memberId);
      try {
        await updateDoc(doc(db, 'conversations', chatId), {
          bannedUsers,
        });
      } catch (error) {
        console.error('Unable to unban group member:', error);
      }
    },
    [userId, conversations],
  );

  const joinGroup = useCallback(
    async (chatId: string) => {
      if (!userId) return;
      const conversation = conversations.find((conversation) => conversation.id === chatId);
      if (!conversation || conversation.type !== 'group') return;
      if (conversation.bannedUsers?.includes(userId)) return;
      if (conversation.participants?.includes(userId)) return;
      if (conversation.joinMode === 'approval') {
        return;
      }
      const participants = Array.from(new Set([...(conversation.participants ?? []), userId]));
      const memberRoles = {
        ...(conversation.memberRoles ?? {}),
        [userId]: 'member' as GroupRole,
      };
      try {
        await updateDoc(doc(db, 'conversations', chatId), {
          participants,
          memberRoles,
        });
      } catch (error) {
        console.error('Unable to join group:', error);
      }
    },
    [userId, conversations],
  );

  const requestGroupJoin = useCallback(
    async (chatId: string) => {
      if (!userId) return;
      const conversation = conversations.find((conversation) => conversation.id === chatId);
      if (!conversation || conversation.type !== 'group') return;
      if (conversation.bannedUsers?.includes(userId)) return;
      if (conversation.participants?.includes(userId)) return;
      if (conversation.joinMode !== 'approval') return;
      const joinRequests = Array.from(new Set([...(conversation.joinRequests ?? []), userId]));
      try {
        await updateDoc(doc(db, 'conversations', chatId), {
          joinRequests,
        });
      } catch (error) {
        console.error('Unable to request group join:', error);
      }
    },
    [userId, conversations],
  );

  const approveGroupJoinRequest = useCallback(
    async (chatId: string, requesterId: string) => {
      if (!userId) return;
      const conversation = conversations.find((conversation) => conversation.id === chatId);
      if (!conversation || conversation.type !== 'group') return;
      const currentRole = conversation.memberRoles?.[userId];
      if (currentRole !== 'owner' && currentRole !== 'admin') return;
      if (!conversation.joinRequests?.includes(requesterId)) return;
      const participants = Array.from(new Set([...(conversation.participants ?? []), requesterId]));
      const memberRoles = {
        ...(conversation.memberRoles ?? {}),
        [requesterId]: 'member' as GroupRole,
      };
      const joinRequests = (conversation.joinRequests ?? []).filter((id) => id !== requesterId);
      try {
        await updateDoc(doc(db, 'conversations', chatId), {
          participants,
          memberRoles,
          joinRequests,
        });
      } catch (error) {
        console.error('Unable to approve join request:', error);
      }
    },
    [userId, conversations],
  );

  const rejectGroupJoinRequest = useCallback(
    async (chatId: string, requesterId: string) => {
      if (!userId) return;
      const conversation = conversations.find((conversation) => conversation.id === chatId);
      if (!conversation || conversation.type !== 'group') return;
      const currentRole = conversation.memberRoles?.[userId];
      if (currentRole !== 'owner' && currentRole !== 'admin') return;
      if (!conversation.joinRequests?.includes(requesterId)) return;
      const joinRequests = (conversation.joinRequests ?? []).filter((id) => id !== requesterId);
      try {
        await updateDoc(doc(db, 'conversations', chatId), {
          joinRequests,
        });
      } catch (error) {
        console.error('Unable to reject join request:', error);
      }
    },
    [userId, conversations],
  );

  const editMessage = useCallback(
    async (chatId: string, messageId: string, newContent: string) => {
      if (!userId) return;
      try {
        const messageRef = doc(db, 'conversations', chatId, 'messages', messageId);
        await updateDoc(messageRef, { content: newContent });

        const conversation = conversations.find((c) => c.id === chatId);
        if (conversation?.messages[conversation.messages.length - 1]?.id === messageId) {
          await updateDoc(doc(db, 'conversations', chatId), {
            lastMessage: newContent,
          });
        }
      } catch (error) {
        console.error('Unable to edit message:', error);
      }
    },
    [userId, conversations],
  );

  const sendMessage = useCallback(
    async (content: string, type: Message['type'] = 'text', replyTo?: ReplyPreview) => {
      if (!activeConversationId || !userId || !content.trim()) return;

      const body = replyTo
        ? `Replying to ${replyTo.senderId}: ${content.trim()}`
        : content.trim();

      try {
        const messagesRef = collection(db, 'conversations', activeConversationId, 'messages');
        await addDoc(messagesRef, {
          senderId: userId,
          content: body,
          timestamp: serverTimestamp(),
          type,
          replyTo: replyTo
            ? { messageId: replyTo.messageId, senderId: replyTo.senderId, preview: replyTo.preview }
            : null,
        });

        await updateDoc(doc(db, 'conversations', activeConversationId), {
          lastMessage: body,
          lastTimestamp: serverTimestamp(),
        });
      } catch (error) {
        console.error('Unable to send message:', error);
      }
    },
    [activeConversationId, userId],
  );

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        archivedConversations,
        activeConversationId,
        setActiveConversation,
        activeConversation,
        sendMessage,
        editMessage,
        markRead,
        markAllRead,
        archiveConversation,
        restoreConversation,
        createConversation,
        createGroup,
        addGroupMember,
        removeGroupMember,
        promoteGroupMember,
        banGroupMember,
        unbanGroupMember,
        requestGroupJoin,
        approveGroupJoinRequest,
        rejectGroupJoinRequest,
        joinGroup,
        isTyping,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}


