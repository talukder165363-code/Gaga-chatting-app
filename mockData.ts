import type { LucideIcon } from 'lucide-react'
import { Lock, MessageCircle, Users, Smartphone, Shield, Video, Newspaper } from 'lucide-react'

export type Stat = { label: string; value: string | number; suffix?: string }
export const stats: Stat[] = [
  { label: 'Active Users', value: '50k+' },
  { label: 'Uptime', value: '99.98', suffix: '%' },
  { label: '256-bit Encryption', value: '256', suffix: 'bit' },
  { label: 'Latency', value: '<40', suffix: 'ms' },
]

export type Feature = { id: string; icon: LucideIcon; title: string; description: string }
export const features: Feature[] = [
  {
    id: 'f1',
    icon: MessageCircle,
    title: 'Secure conversations',
    description: 'Fast private messaging with strong encryption and effortless sharing.',
  },
  {
    id: 'f2',
    icon: Video,
    title: 'Crystal-clear calls',
    description: 'HD voice and video calling built for every network and every device.',
  },
  {
    id: 'f3',
    icon: Users,
    title: 'Community spaces',
    description: 'Create groups, launch open chats, and stay close with your people.',
  },
  {
    id: 'f4',
    icon: Newspaper,
    title: 'Private timelines',
    description: 'Share updates, stories, and highlights with the people you trust.',
  },
]

export type Testimonial = { id: string; name: string; role: string; content: string }
export const testimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'Sarah Kim',
    role: 'Product Designer',
    content: 'Switched from three different apps to just GaGa Chat. The UI is beautiful, calls are crystal clear, and I finally feel like my messages are actually private.',
  },
  {
    id: 't2',
    name: 'Alex Morgan',
    role: 'Frontend Engineer',
    content: 'The performance is insane — messages arrive instantly even on a slow connection. The WebRTC calls rival Zoom quality. I recommend it to my whole team.',
  },
  {
    id: 't3',
    name: 'Priya Singh',
    role: 'Community Lead',
    content: 'Managing 500-person communities used to be a nightmare. GaGa Chat\'s group moderation tools and timeline features make it feel effortless.',
  },
]

export const trustBadges = [
  { icon: Lock, label: 'End-to-End Encrypted' },
  { icon: MessageCircle, label: 'Instant Delivery' },
  { icon: Users, label: 'Global Reach' },
  { icon: Smartphone, label: 'Multi-Platform' },
  { icon: Shield, label: 'Trusted by Creators' },
]

// --- Chat mock exports (required by `src/context/ChatContext.tsx`) ---

export type User = {
  id: string;
  name: string;
  avatar: string;
  status: string;
  online: boolean;
};

export type Message = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'sticker' | 'voice' | 'video' | 'file' | 'poll';
};

export type Conversation = {
  id: string;
  type: 'direct' | 'group';
  user: User | null;
  name?: string;
  avatarUrl?: string;
  description?: string;
  createdBy?: string;
  joinMode?: string;
  participants?: string[];
  memberRoles?: Record<string, string>;
  bannedUsers?: string[];
  joinRequests?: string[];
  lastMessage?: string;
  timestamp?: string;
  unread: number;
  archived: boolean;
  messages: Message[];
};


