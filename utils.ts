import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Chat, User } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(date: Date | string | number): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function getDefaultAvatar(userId: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userId)}&backgroundColor=b6e3f4`
}

export function getChatName(chat: Chat, usersMap: Record<string, User>, currentUserId?: string | null): string {
  if (chat.type === 'group') return chat.name || 'Group'
  const otherId = chat.participants.find(p => p !== currentUserId)
  if (otherId && usersMap[otherId]) return usersMap[otherId].name
  return 'Chat'
}

export function getChatAvatar(chat: Chat, usersMap: Record<string, User>, currentUserId?: string | null): string {
  if (chat.avatar) return chat.avatar
  if (chat.type === 'group') return '/assets/gaga-logo.jpg'
  const otherId = chat.participants.find(p => p !== currentUserId)
  if (otherId) return usersMap[otherId]?.avatar || getDefaultAvatar(otherId)
  return '/assets/gaga-logo.jpg'
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export const EMOJI_LIST = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇',
  '🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑',
  '🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬',
  '😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞',
  '👍','👎','👏','🙌','🤝','👊','✊','🤛','🤜','🤞','✌️','🤟','🤘',
  '🔥','⭐','✨','💫','🌟','💥','💯','💢','💦','💨','🎉','🎊','🎁',
  '😴','😪','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️',
  '👀','👁️','🧠','👶','👧','🧒','👦','👩','🧑','👨','👩‍🦱','👨‍🦱',
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷',
  '🌈','☀️','🌤️','☁️','🌧️','⛈️','❄️','🌊','🌍','🌙','⭐','💥',
  '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🍍',
  '⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥅','🏒',
  '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','🚜',
  '⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿',
  '❤️','💔','💖','💘','💝','💗','💓','💞','💕','❣️','🧡','💛','💚',
  '🎵','🎶','🎼','🎧','🎤','🎬','🎮','🎯','🎲','🎰','🎳','🧩','🧸',
]

export const BD_TK_RATE = 0.85 // 1 GagaCoin = 0.85 BDT

// Allowed origins for media fetches (Firebase Storage + DiceBear avatars)
const ALLOWED_MEDIA_ORIGINS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'gagachat-app.firebasestorage.app',
  'api.dicebear.com',
  'api.qrserver.com',
  'lh3.googleusercontent.com',
]

/**
 * Validates that a URL is https and belongs to a trusted origin.
 * Returns the URL string if valid, otherwise returns a fallback.
 */
export function sanitizeMediaUrl(url: string | undefined | null, fallback = ''): string {
  if (!url) return fallback;
  // Allow relative paths (local assets)
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return url;
  // Allow data URIs (e.g. QR codes generated locally)
  if (url.startsWith('data:image/')) return url;
  // Allow blob URLs (object URLs created locally)
  if (url.startsWith('blob:')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return fallback;
    if (!ALLOWED_MEDIA_ORIGINS.some(origin => parsed.hostname === origin || parsed.hostname.endsWith('.' + origin))) return fallback;
    return url;
  } catch {
    return fallback;
  }
}

/** Strips newline/carriage-return chars to prevent log injection. */
export function sanitizeForLog(value: unknown): string {
  return String(value).replace(/[\r\n]/g, ' ');
}

/** Strips HTML tags from a string to prevent XSS in text contexts. */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

/**
 * Validates a CSS color value (hex, rgb, named) to prevent CSS injection
 * in dangerouslySetInnerHTML style blocks.
 */
export function sanitizeCssColor(value: string | undefined | null): string | null {
  if (!value) return null;
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  if (/^rgba?\(\s*[\d.,\s%]+\)$/.test(value)) return value;
  if (/^hsla?\(\s*[\d.,\s%]+\)$/.test(value)) return value;
  if (/^[a-zA-Z]+$/.test(value)) return value; // named colors
  return null;
}
