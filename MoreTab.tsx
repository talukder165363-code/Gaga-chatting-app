import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, Bell, MessageSquare, Phone, Users,
  Shield, Lock, Palette, Search, LogOut,
  Speaker, TextCursor, Wallet, Globe, HelpCircle, Info
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useWallet } from '@/hooks/useWallet'
import { cn, getDefaultAvatar } from '@/lib/utils'
import { toast } from 'sonner'

type SettingsRowProps = {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  onPress?: () => void;
  danger?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: () => void;
};

function SettingsRow({ icon, label, description, onPress, danger, toggle, toggleValue, onToggle }: SettingsRowProps) {
  const handlePress = toggle ? onToggle ?? onPress ?? (() => {}) : onPress ?? (() => {});
  return (
    <button onClick={handlePress} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left group">
      {icon && (
        <div
          className={cn(
            'flex-shrink-0 w-6 flex items-center justify-center transition-colors',
            danger ? 'text-red-400/60 group-hover:text-red-400' : 'text-white/80'
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-[15px] font-medium', danger ? 'text-red-400' : 'text-white')}>{label}</p>
        {description && <p className="text-[12px] text-white/30 mt-0.5 leading-tight font-medium">{description}</p>}
      </div>
      {toggle ? (
        <div
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
            toggleValue ? 'bg-[#00FF7F]' : 'bg-white/10'
          )}
        >
          <div
            className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-200',
              toggleValue ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </div>
      ) : (
        <ChevronRight size={18} className="text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors" />
      )}
    </button>
  );
}

function Separator() {
  return <div className="h-px bg-white/5 mx-5" />;
}

export default function MoreTab() { 
  const navigate = useNavigate()
  const currentUser = useAppStore(s => s.currentUser)
  const logout = useAppStore(s => s.logout)
  const settings = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const [searchQuery, setSearchQuery] = useState('')
  const [showQR, setShowQR] = useState(false)
  const userId = currentUser?.id || 'user_1'
  const { wallet } = useWallet()

  const handleSignOut = () => {
    logout()
    toast.success('Signed out')
    navigate('/')
  }



  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="px-5 pt-12 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/assets/gaga-logo.jpg" alt="GagaChat" className="w-7 h-7 rounded-full gchat-logo-glow" />
          <h1 className="text-white text-xl font-bold">Settings</h1>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center bg-white/10 rounded-xl px-3 py-2.5 gap-2">
          <Search size={15} className="text-white/40 flex-shrink-0" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search settings..." className="flex-1 bg-transparent text-[14px] text-white placeholder-white/30 outline-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Profile Row */}
        <div className="bg-white/5 mx-3 rounded-xl overflow-hidden mb-1">
          <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors">
            <div className="relative flex-shrink-0">
              <img src={currentUser?.avatar || getDefaultAvatar(userId)} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
              <div className={cn("absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-black", currentUser?.status === 'online' ? "bg-[#00FF00]" : "bg-gray-500")} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-semibold text-[15px]">{currentUser?.name || 'User'}</p>
              <p className="text-white/40 text-[12px] italic">{currentUser?.statusMessage || 'Available'}</p>
            </div>
            <ChevronRight size={18} className="text-white/30" />
          </button>
        </div>

        {/* Wallet Card */}
        <div className="mx-3 mt-3 mb-4">
          <button onClick={() => navigate('/wallet')} className="w-full bg-gradient-to-br from-[#00FF7F]/10 to-[#22D3EE]/10 border border-[#00FF7F]/20 rounded-2xl p-4 flex items-center gap-4 hover:border-[#00FF7F]/40 transition-all">
            <div className="w-12 h-12 rounded-full bg-[#00FF7F]/20 flex items-center justify-center">
              <Wallet size={24} className="text-[#00FF7F]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold">Gaga Wallet</p>
              <p className="text-[#00FF7F] text-sm font-medium">{wallet?.coins ?? 0} coins · ৳{Math.round((wallet?.coins ?? 0) * 0.85)}</p>
            </div>
            <ChevronRight size={18} className="text-white/30" />
          </button>
        </div>

        <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
          <SettingsRow icon={<Palette size={20} />} label="Theme" description={`${settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)} mode`} onPress={() => {
            const themes = ['system', 'light', 'dark'] as const
            const next = themes[(themes.indexOf(settings.theme) + 1) % themes.length]
            updateSettings({ theme: next })
            toast.success(`Theme: ${next}`)
          }} />
          <Separator />
          <SettingsRow icon={<Bell size={20} />} label="Notifications" description={settings.notificationsEnabled ? 'Enabled' : 'Disabled'} toggle toggleValue={settings.notificationsEnabled} onToggle={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })} />
          <Separator />
          <SettingsRow icon={<Speaker size={20} />} label="Sound effects" description={settings.soundEnabled ? 'Enabled' : 'Disabled'} toggle toggleValue={settings.soundEnabled} onToggle={() => updateSettings({ soundEnabled: !settings.soundEnabled })} />
          <Separator />
          <SettingsRow icon={<TextCursor size={20} />} label="Font size" description={settings.fontSize === 'sm' ? 'Small' : settings.fontSize === 'md' ? 'Medium' : 'Large'} onPress={() => {
            const sizes = ['sm', 'md', 'lg'] as const
            const next = sizes[(sizes.indexOf(settings.fontSize) + 1) % sizes.length]
            updateSettings({ fontSize: next })
            toast.success(`Font: ${next}`)
          }} />
        </div>

        {/* General */}
        <div className="px-5 pt-6 pb-2"><p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">General</p></div>
        <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
          <SettingsRow icon={<MessageSquare size={20} />} label="Chats" onPress={() => {}} />
          <Separator />
          <SettingsRow icon={<Phone size={20} />} label="Calls" onPress={() => {}} />
          <Separator />
          <SettingsRow icon={<Users size={20} />} label="Friends" onPress={() => {}} />
          <Separator />
          <SettingsRow icon={<Globe size={20} />} label="Language" description="English / Bangla" onPress={() => toast.info('Bengali coming soon!')} />
        </div>

        {/* App info */}
        <div className="px-5 pt-6 pb-2"><p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">App Info</p></div>
        <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
          <SettingsRow icon={<Shield size={20} />} label="Privacy Policy" onPress={() => navigate('/privacy')} />
          <Separator />
          <SettingsRow icon={<Lock size={20} />} label="Terms of Service" onPress={() => navigate('/terms')} />
          <Separator />
          <SettingsRow icon={<HelpCircle size={20} />} label="Help Center" onPress={() => toast.info('Help center coming soon!')} />
          <Separator />
          <SettingsRow icon={<Info size={20} />} label="About GagaChat" onPress={() => toast.info('GagaChat v1.0.0 by Omar Faruk OumaGa')} />
        </div>

        {/* Sign Out */}
        <div className="px-4 mt-4 pb-4">
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/20 transition-colors">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        <div className="py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img src="/assets/gaga-logo.jpg" alt="GagaChat" className="w-5 h-5 rounded-full" />
            <p className="text-white/20 text-xs font-medium">GagaChat v1.0.0</p>
          </div>
          <p className="text-white/10 text-[10px]">by Omar Faruk OumaGa</p>
          <p className="text-white/10 text-[10px]">Always at your side</p>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-fade-in" onClick={() => setShowQR(false)}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 mx-6 text-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">My Gaga ID</h3>
            <div className="w-52 h-52 mx-auto bg-white rounded-3xl overflow-hidden mb-4 p-3 flex items-center justify-center">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=gagachat:${userId}`} alt="QR" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src={currentUser?.avatar || getDefaultAvatar(userId)} alt="" className="w-8 h-8 rounded-full" />
              <span className="font-semibold text-white">{currentUser?.name || 'User'}</span>
            </div>
            <p className="text-xs text-white/40 mb-4">Scan this QR code to add me on GagaChat</p>
            <button onClick={() => { navigator.clipboard.writeText(`gagachat:${userId}`); toast.success('Copied Gaga ID'); }} className="w-full gchat-btn py-3 rounded-2xl font-semibold text-sm">
              Copy Gaga ID
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
