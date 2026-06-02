import type { Dispatch, SetStateAction } from 'react'
import { MessageCircle, Phone, Newspaper, Users, MoreHorizontal } from 'lucide-react'

type Tab = 'chats' | 'calls' | 'timeline' | 'contacts' | 'more';

export default function BottomNav({
  activeTab,
  onTabChange,
  unreadCount,
}: {
  activeTab: Tab
  onTabChange: Dispatch<SetStateAction<Tab>>
  unreadCount?: number
}) {
  const tabs: { key: Tab; label: string; icon: typeof MessageCircle }[] = [
    { key: 'chats', label: 'Chats', icon: MessageCircle },
    { key: 'calls', label: 'Calls', icon: Phone },
    { key: 'timeline', label: 'Timeline', icon: Newspaper },
    { key: 'contacts', label: 'Friends', icon: Users },
    { key: 'more', label: 'More', icon: MoreHorizontal },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 z-50 flex items-center justify-around px-2">
      {tabs.map((t) => {
        const isActive = activeTab === t.key
        const Icon = t.icon
        const badge = t.key === 'chats' && (unreadCount ?? 0) > 0

        return (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full"
          >
            <div className="relative">
              <Icon
                size={22}
                className={isActive ? 'text-[#00FF7F]' : 'text-white/40'}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              {badge ? (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-[#00FF7F] rounded-full text-[9px] font-black text-black flex items-center justify-center px-1">
                  {Math.min(99, unreadCount ?? 0)}
                </span>
              ) : null}
            </div>
            <span className={isActive ? 'text-[10px] text-[#00FF7F]' : 'text-[10px] text-white/40'}>
              {t.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

