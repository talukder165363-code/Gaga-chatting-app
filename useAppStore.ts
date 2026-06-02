import { useMemo, useState, useCallback } from 'react';
import type { User, Chat, Message, CallRecord, TimelinePost, Wallet, WalletTransaction } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/hooks/useChatStore';
import { useUsers } from '@/hooks/useUsers';
import { db, auth, doc, updateDoc, arrayUnion } from '@/lib/firebase';

type AppStoreState = {
  currentUser: User | null;
  users: User[];
  calls: CallRecord[];
  chats: Chat[];
  messages: Record<string, Message[]>;
  posts: TimelinePost[];
  friends: string[];
  favorites: string[];
  friendRequests: Array<{ id: string; from: string; to: string; status: 'pending' | 'accepted' | 'rejected' }>;
  savedPosts: string[];
  blockedUsers: string[];
  login: (email: string, password: string) => boolean;
  signup: (name: string, email: string, password: string) => boolean;
  googleSignIn: () => boolean;
  settings: {
    theme: 'system' | 'light' | 'dark';
    notificationsEnabled: boolean;
    privacyEnabled: boolean;
    appearanceEnabled: boolean;
    readReceiptsEnabled: boolean;
    hideProfilePicture: boolean;
    soundEnabled: boolean;
    fontSize: 'sm' | 'md' | 'lg';
    toggleHideProfilePicture: () => void;
    toggleNotificationsEnabled: () => void;
    toggleSoundEnabled: () => void;
    toggleFontSize: () => void;
  };
  unreadChatCount: number;
  wallet: Wallet | null;
  activeCall: CallRecord | null;
  startCall: (calleeId: string, callType: 'voice' | 'video') => Promise<void>;
  endCall: () => void;
  startDirectChat: (userId: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string, type?: string, replyTo?: unknown) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  reactToMessage: (chatId: string, messageId: string, reaction: string) => Promise<void>;
  onEditMessage: (chatId: string, messageId: string, content: string) => Promise<void>;
  onReact: (chatId: string, messageId: string, reaction: string) => Promise<void>;
  likePost: (postId: string, currentUserId?: string) => Promise<void>;
  commentOnPost: (postId: string, currentUserId: string, content: string) => Promise<void>;
  createPost: (content: string, images: string[], visibility: 'public' | 'friends' | 'private') => Promise<void>;
  savePost: (postId: string, currentUserId?: string) => Promise<void>;
  acceptFriendRequest: (id: string, fromId?: string) => void;
  rejectFriendRequest: (id: string) => void;
  sendFriendRequest: (toUserId: string) => void;
  toggleFavorite: (userId: string) => void;
  toggleBlockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  updateSettings: (patch: Partial<AppStoreState['settings']>) => void;
  getWallet: (userId: string) => Wallet | null;
  earnCoins: (userId: string, amount: number, label: string) => boolean;
  spendCoins: (userId: string, amount: number, label: string) => boolean;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => void;
};

export function useAppStore<T = AppStoreState>(selector?: (s: AppStoreState) => T): T {
  const { user, logout } = useAuth();
  const { chats, messages, markAsRead: chatMarkAsRead, sendMessage: chatSend, deleteMessage: chatDelete, addReaction } = useChatStore();
  const { users } = useUsers();

  // Local wallet state — persisted to Firestore on each mutation
  const [walletState, setWalletState] = useState<Record<string, Wallet>>({});

  const getWallet = useCallback((userId: string): Wallet | null => {
    return walletState[userId] ?? { userId, balance: 0, coins: 0, transactions: [] };
  }, [walletState]);

  const earnCoins = useCallback((userId: string, amount: number, label: string): boolean => {
    const uid = auth.currentUser?.uid;
    if (!uid || uid !== userId) return false;
    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      userId,
      type: 'earn',
      amount,
      description: label,
      timestamp: new Date(),
      status: 'completed',
    };
    setWalletState(prev => {
      const w = prev[userId] ?? { userId, balance: 0, coins: 0, transactions: [] };
      return { ...prev, [userId]: { ...w, coins: w.coins + amount, transactions: [...w.transactions, tx] } };
    });
    updateDoc(doc(db, 'users', userId), {
      coins: (getWallet(userId)?.coins ?? 0) + amount,
      transactions: arrayUnion(tx),
    }).catch(() => {});
    return true;
  }, [getWallet]);

  const spendCoins = useCallback((userId: string, amount: number, label: string): boolean => {
    const uid = auth.currentUser?.uid;
    if (!uid || uid !== userId) return false;
    const current = getWallet(userId)?.coins ?? 0;
    if (current < amount) return false;
    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      userId,
      type: 'spend',
      amount,
      description: label,
      timestamp: new Date(),
      status: 'completed',
    };
    setWalletState(prev => {
      const w = prev[userId] ?? { userId, balance: 0, coins: 0, transactions: [] };
      return { ...prev, [userId]: { ...w, coins: w.coins - amount, transactions: [...w.transactions, tx] } };
    });
    updateDoc(doc(db, 'users', userId), {
      coins: current - amount,
      transactions: arrayUnion(tx),
    }).catch(() => {});
    return true;
  }, [getWallet]);

  const state = useMemo((): AppStoreState => {
    const currentUser: User | null = user
      ? {
          id: user.id,
          name: user.name,
          email: user.email || '',
          avatar: user.avatar || '/logo.jpg',
          status: 'online',
          statusMessage: '',
          coins: user.coins || 0,
          emailVerified: user.emailVerified,
        }
      : null;

    return {
      currentUser,
      users,
      calls: [],
      chats,
      messages: messages as Record<string, Message[]>,
      posts: [],
      friends: [],
      favorites: [],
      friendRequests: [],
      savedPosts: [],
      blockedUsers: [],
      settings: {
        theme: 'system',
        notificationsEnabled: true,
        privacyEnabled: true,
        appearanceEnabled: true,
        readReceiptsEnabled: true,
        hideProfilePicture: false,
        soundEnabled: true,
        fontSize: 'md',
        toggleHideProfilePicture: () => {},
        toggleNotificationsEnabled: () => {},
        toggleSoundEnabled: () => {},
        toggleFontSize: () => {},
      },
      unreadChatCount: chats.reduce((s, c) => s + (c.unreadCount || 0), 0),
      wallet: null,
      activeCall: null,
      login: () => true,
      signup: () => true,
      googleSignIn: () => true,
      startCall: async () => {},
      endCall: () => {},
      startDirectChat: async () => {},
      markAsRead: async (chatId) => chatMarkAsRead(chatId),
      sendMessage: async (chatId, content, type, replyTo) => { await chatSend(chatId, content, type, replyTo); },
      deleteMessage: async (chatId, msgId) => chatDelete(chatId, msgId),
      reactToMessage: async (chatId, msgId, reaction) => addReaction(chatId, msgId, reaction),
      onEditMessage: async () => {},
      onReact: async (chatId, msgId, reaction) => addReaction(chatId, msgId, reaction),
      likePost: async () => {},
      commentOnPost: async () => {},
      createPost: async () => {},
      savePost: async () => {},
      acceptFriendRequest: () => {},
      rejectFriendRequest: () => {},
      sendFriendRequest: () => {},
      toggleFavorite: () => {},
      toggleBlockUser: () => {},
      unblockUser: () => {},
      updateSettings: () => {},
      getWallet,
      earnCoins,
      spendCoins,
      logout,
      updateProfile: () => {},
    };
  }, [user, users, chats, messages, chatMarkAsRead, chatSend, chatDelete, addReaction, logout, getWallet, earnCoins, spendCoins]);

  return useMemo(() => {
    const sel = selector ?? ((s: AppStoreState) => s as unknown as T);
    return sel(state);
  }, [selector, state]);
}

export const __appStoreActions = {};
