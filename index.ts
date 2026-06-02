export type UserStatus = 'online' | 'offline' | 'busy' | 'away' | 'dnd';

export interface User {
  id: string;
  name: string;
  username?: string;
  displayName?: string;
  avatar: string;
  coverImage?: string;
  status: UserStatus;
  statusMessage: string;
  emailVerified?: boolean;
  phone?: string;
  email?: string;
  bio?: string;
  about?: string;
  location?: string;
  website?: string;
  verified?: boolean;
  coins?: number;
  privacy?: {
    showStatus?: boolean;
    showLastSeen?: boolean;
    allowFindById?: boolean;
    showEmail?: boolean;
    hideProfilePicture?: boolean;
  };
  friends?: string[];
  autoAddFriends?: boolean;
  isFavorite?: boolean;
  favorites?: string[];
  savedPosts?: string[];
  lastSeen?: Date;
  blockedUsers?: string[];
}

export type MessageType = 'text' | 'image' | 'sticker' | 'voice' | 'video' | 'file' | 'poll';

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface ReplyPreview {
  messageId: string;
  senderId: string;
  type: MessageType;
  preview: string;
}

export interface Poll {
  question: string;
  options: string[];
  votes: Record<string, string>;
  allowMultiple?: boolean;
  endsAt?: Date;
}

export interface PinnedMessage {
  messageId: string;
  content: string;
  senderId: string;
  pinnedAt: Date;
  pinnedBy: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  read: boolean;
  reactions?: Reaction[];
  replyTo?: ReplyPreview;
  forwardedFrom?: string;
  edited?: boolean;
  poll?: Poll;
  scheduledAt?: Date;
  showAvatar?: boolean;
  showSenderName?: boolean;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  lastMessage?: Message;
  name?: string;
  avatar?: string;
  pinnedMessage?: PinnedMessage;
  description?: string;
  admins: string[];
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  likes: string[];
}

export interface TimelinePost {
  id: string;
  userId: string;
  content: string;
  images: string[];
  imageCaptions?: string[];
  likes: string[];
  comments: Comment[];
  timestamp: Date;
  visibility: 'public' | 'friends' | 'private';
}

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  timestamp: Date;
  viewers: string[];
  expiresAt: Date;
}

export interface CallRecord {
  id: string;
  userId: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: Date;
  duration?: number;
}

export interface StickerPack {
  id: string;
  name: string;
  author?: string;
  previewUrl?: string;
  price?: number;
  isPurchased?: boolean;
  stickers: { id?: string; packId?: string; packName?: string; url?: string; emoji: string; label?: string }[];
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'earn' | 'spend' | 'send' | 'receive';
  amount: number;
  description: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

export interface Wallet {
  userId: string;
  balance: number;
  coins: number;
  transactions: WalletTransaction[];
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'message' | 'call' | 'reaction' | 'mention' | 'group_invite' | 'friend_request';
  title: string;
  body: string;
  read: boolean;
  timestamp: Date;
  data?: Record<string, unknown>;
}
