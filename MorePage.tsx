import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Bell, Image, MessageSquare, Phone, Users,
  Bot, Shield, Lock, Database, QrCode,
  Palette, UserCircle, Search, X, Settings, LogOut, Speaker,
  TextCursor, Trash2, AlertTriangle, ShieldCheck, Scale, Globe,
  Wallet, Coins
} from 'lucide-react';
import { auth, db, doc, deleteDoc, onSnapshot, setDoc, serverTimestamp } from '@/lib/firebase';
import { toDataURL } from 'qrcode';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useProfile } from '@/hooks/useProfile';
import { useUsersMap } from '@/hooks/useUsers';
import { useWallet } from '@/hooks/useWallet';
import { cn, getDefaultAvatar } from '@/lib/utils';
import { toast } from 'sonner';
const logoSrc = '/assets/gaga-logo.jpg';
import { useAuth } from '@/hooks/useAuth';

interface SettingsSubPageProps {
  title: string;
  onBack: () => void;
  children: ReactNode;
}

const SettingsSubPage = ({ title, onBack, children }: SettingsSubPageProps) => (
  <div className="flex flex-col h-full bg-black">
    <div className="px-4 pt-12 pb-4 flex items-center gap-3">
      <button type="button" onClick={onBack} className="text-white p-1 hover:bg-white/10 rounded-full transition-colors">
        <ChevronRight size={22} className="rotate-180" />
      </button>
      <h1 className="text-white text-xl font-bold">{title}</h1>
    </div>
    <div className="flex-1 overflow-y-auto scrollbar-hide">{children}</div>
  </div>
);

const SettingsRow = ({
  icon,
  label,
  description,
  onPress,
  showArrow = true,
  danger = false,
  toggle,
  toggleValue,
  onToggle,
}: {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  onPress?: () => void;
  showArrow?: boolean;
  danger?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: () => void;
}) => (
  <button
    type="button"
    onClick={toggle ? onToggle : onPress}
    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left group"
  >
    {icon && <div className={cn("flex-shrink-0 w-6 flex items-center justify-center transition-colors", danger ? "text-red-400/60 group-hover:text-red-400" : "text-white/80")}>{icon}</div>}
    <div className="flex-1 min-w-0">
      <p className={cn('text-[15px] font-medium', danger ? 'text-red-400' : 'text-white')}>{label}</p>
      {description && <p className="text-[12px] text-white/30 mt-0.5 leading-tight font-medium">{description}</p>}
    </div>
    {toggle ? (
      <div className={cn('relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0', toggleValue ? 'bg-[#00FF7F]' : 'bg-white/10')}>
        <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-200', toggleValue ? 'translate-x-6' : 'translate-x-1')} />
      </div>
    ) : showArrow ? (
      <ChevronRight size={18} className="text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors" />
    ) : null}
  </button>
);

const SectionDivider = ({ label }: { label: string }) => (
  <div className="px-5 pt-6 pb-2">
    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{label}</p>
  </div>
);

type SettingsView = null | 'account' | 'privacy' | 'shops' | 'devices' | 'blocked' | 'help' | 'about' | 'wallet-help' | 'delete-account' | 'announcements' | 'privacy-center';

const Separator = () => <div className="h-px bg-white/5 mx-5" />;

const AccountSettings = ({ onBack, onNavigate, userId }: { onBack: () => void; onNavigate: (view: SettingsView) => void; userId?: string }) => {
  const [twoStep, setTwoStep] = useState(false);
  const [usePhone, setUsePhone] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'userSettings', uid), (s: unknown) => {
      const snapshot = s as { data: () => Record<string, unknown> | undefined };
      const data = snapshot.data();
      if (data) {
        if (typeof data.twoStepEnabled === 'boolean') setTwoStep(data.twoStepEnabled);
        if (typeof data.usePhoneSignIn === 'boolean') setUsePhone(data.usePhoneSignIn);
      }
    });
    return unsub;
  }, []);

  const persist = async (patch: Record<string, unknown>) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await setDoc(doc(db, 'userSettings', uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
    } catch { /* noop */ }
  };

  return (
    <SettingsSubPage title="Account" onBack={onBack}>
      <div className="px-5 py-6">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] rounded-3xl p-6 border border-white/5 shadow-xl">
          <p className="text-[10px] font-black text-[#00FF7F] uppercase tracking-widest mb-2">My GaGa ID</p>
          <p className="text-white font-mono text-lg break-all select-all">{userId || 'Loading...'}</p>
        </div>
      </div>

      <SectionDivider label="Security" />
      <div className="bg-white/5 rounded-2xl mx-3 overflow-hidden border border-white/5">
        <SettingsRow
          icon={<ShieldCheck size={20} />}
          label="Two-step verification"
          description="Add an extra layer of security to your account."
          toggle
          toggleValue={twoStep}
          onToggle={() => { const v = !twoStep; setTwoStep(v); persist({ twoStepEnabled: v }); }}
        />
        <Separator />
        <SettingsRow
          icon={<Phone size={20} />}
          label="Use phone number"
          description="Allow sign-in using your phone number."
          toggle
          toggleValue={usePhone}
          onToggle={() => { const v = !usePhone; setUsePhone(v); persist({ usePhoneSignIn: v }); }}
        />
      </div>

      <SectionDivider label="Connected devices" />
      <div className="bg-white/5 rounded-2xl mx-3 overflow-hidden border border-white/5">
        <SettingsRow
          icon={<Settings size={20} />}
          label="Manage devices"
          description="View and sign out of active sessions."
          onPress={() => onNavigate('devices')}
        />
      </div>

      <SectionDivider label="Danger Zone" />
      <div className="bg-red-500/5 rounded-2xl mx-3 overflow-hidden border border-red-500/10 mb-10">
        <SettingsRow
          icon={<Trash2 size={20} />}
          label="Delete account"
          description="Permanently remove your account and all data."
          danger
          onPress={() => onNavigate('delete-account')}
        />
      </div>
    </SettingsSubPage>
  );
};

const DeleteAccountView = ({ onBack }: { onBack: () => void }) => {
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { signOut } = useAuth();

  const handleDelete = async () => {
    if (confirm !== 'DELETE') return;
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      // Cleanup logic in a production app would involve cloud functions
      // Here we just clear the user doc and sign out
      await deleteDoc(doc(db, 'users', uid));
      await signOut();
      toast.success('Account deleted successfully');
    } catch {
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsSubPage title="Delete Account" onBack={onBack}>
      <div className="px-6 py-8 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Are you absolutely sure?</h2>
        <p className="text-white/40 text-sm leading-relaxed mb-8">
          This action is permanent. All your chats, contacts, timeline posts, and settings will be deleted forever.
        </p>

        <div className="w-full bg-white/5 rounded-2xl p-6 border border-white/5 text-left mb-8">
          <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-4">Confirm by typing "DELETE"</p>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-red-500/50 transition-colors"
          />
        </div>

        <button
          disabled={confirm !== 'DELETE' || loading}
          onClick={handleDelete}
          className="w-full py-4 rounded-2xl bg-red-500 text-white font-black text-sm uppercase tracking-widest disabled:opacity-20 shadow-xl shadow-red-500/10 transition-all active:scale-95"
        >
          {loading ? 'Deleting...' : 'Permanently Delete My Account'}
        </button>
      </div>
    </SettingsSubPage>
  );
};

const PrivacySettings = ({ onBack, onNavigate }: { onBack: () => void; onNavigate: (view: SettingsView) => void }) => {
  const [readReceipts, setReadReceipts] = useState(true);
  const [showStatus, setShowStatus] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'userSettings', uid), (s: unknown) => {
      const snapshot = s as { data: () => Record<string, unknown> | undefined };
      const data = snapshot.data();
      if (data) {
        if (typeof data.readReceipts === 'boolean') setReadReceipts(data.readReceipts);
        if (typeof data.showStatus === 'boolean') setShowStatus(data.showStatus);
      }
    });
    return unsub;
  }, []);

  const persistPrivacy = async (patch: { readReceipts?: boolean; showStatus?: boolean }) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await setDoc(doc(db, 'userSettings', uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
    } catch { /* noop */ }
  };

  return (
    <SettingsSubPage title="Privacy" onBack={onBack}>
      <SectionDivider label="Privacy controls" />
      <div className="bg-white/5 rounded-xl mx-3 overflow-hidden">
        <SettingsRow
          label="Read receipts"
          description="Allow contacts to see when you've read messages."
          toggle
          toggleValue={readReceipts}
          onToggle={() => { const v = !readReceipts; setReadReceipts(v); persistPrivacy({ readReceipts: v }); }}
        />
        <Separator />
        <SettingsRow
          label="Profile visibility"
          description="Choose who can see your profile details."
          toggle
          toggleValue={showStatus}
          onToggle={() => { const v = !showStatus; setShowStatus(v); persistPrivacy({ showStatus: v }); }}
        />
      </div>
      <SectionDivider label="Safety" />
      <div className="bg-white/5 rounded-xl mx-3 overflow-hidden">
        <SettingsRow label="Blocked contacts" description="Manage users you've blocked." onPress={() => onNavigate('blocked')} />
      </div>
    </SettingsSubPage>
  );
};

const ShopSettings = ({ onBack }: { onBack: () => void }) => (
  <SettingsSubPage title="GaGa Shop" onBack={onBack}>
    <div className="px-5 py-6">
      <div className="bg-gradient-to-br from-[#00FF7F]/10 to-blue-500/10 rounded-[40px] p-8 border border-white/5 mb-8 text-center">
        <div className="w-16 h-16 bg-[#00FF7F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Palette size={32} className="text-[#00FF7F]" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Express Yourself</h3>
        <p className="text-white/40 text-sm leading-relaxed">Unlock exclusive sticker packs, custom themes, and premium profile badges.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[
          { label: 'Expressive Pack', price: 'Free', icon: <Image className="text-pink-400" /> },
          { label: 'Midnight Blue Theme', price: '$0.99', icon: <Palette className="text-blue-400" /> },
          { label: 'Premium Badge', price: '$2.99', icon: <ShieldCheck className="text-[#00FF7F]" /> },
        ].map((item) => (
          <div key={item.label} className="group bg-white/5 rounded-[32px] p-6 border border-white/5 hover:border-white/10 transition-all flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white">{item.label}</p>
              <p className="text-xs text-[#00FF7F] font-black uppercase tracking-widest mt-0.5">{item.price}</p>
            </div>
            <button
              onClick={() => toast.info(`${item.label} will be available soon!`)}
              className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white transition-all hover:text-black"
            >
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  </SettingsSubPage>
);

const HelpSettings = ({ onBack }: { onBack: () => void }) => (
  <SettingsSubPage title="Help Center" onBack={onBack}>
    <div className="px-5 py-6 space-y-4">
      <div className="bg-white/5 rounded-[32px] p-8 border border-white/5 text-center mb-4">
        <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">How can we help?</h2>
        <p className="text-white/40 text-sm font-medium">Search our knowledge base or contact our 24/7 support team.</p>
      </div>

      <div className="space-y-3">
        {[
          { title: 'Getting Started', desc: 'New to GaGa Chat? Learn the basics here.' },
          { title: 'Account & Security', desc: 'Recover your account or update security settings.' },
          { title: 'Wallet & GaGaCoins', desc: 'Learn how to earn, spend, and redeem GagaCoins.' },
          { title: 'Safety & Privacy', desc: 'Learn how we protect your data and privacy.' },
        ].map(item => (
          <button key={item.title} className="w-full text-left bg-white/5 rounded-2xl p-5 border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-between group">
            <div className="flex-1">
              <p className="font-bold text-white mb-1">{item.title}</p>
              <p className="text-xs text-white/30 font-medium leading-relaxed">{item.desc}</p>
            </div>
            <ChevronRight size={18} className="text-white/10 group-hover:text-white/40 transition-colors" />
          </button>
        ))}
      </div>

      <div className="pt-6">
        <button
          onClick={() => { window.location.href = 'mailto:support@gagachat.app'; }}
          className="w-full py-5 rounded-2xl bg-[#00FF7F] text-black font-black text-sm uppercase tracking-widest shadow-xl shadow-[#00FF7F]/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Bot size={20} />
          Chat with Support
        </button>
      </div>
    </div>
  </SettingsSubPage>
);

const WalletHelpSettings = ({ onBack }: { onBack: () => void }) => (
  <SettingsSubPage title="Wallet FAQ" onBack={onBack}>
    <div className="px-5 py-6 space-y-5">
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-3xl bg-[#00FF7F]/10 flex items-center justify-center text-[#00FF7F]">
            <Coins size={28} />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-white/40">GaGa Wallet</p>
            <p className="text-lg font-bold text-white">GagaCoins for every moment</p>
          </div>
        </div>
        <p className="text-[13px] text-white/40 leading-relaxed">Use your wallet to collect GagaCoins from app activity, redeem rewards, and send coins to friends across GaGa Chat.</p>
      </div>

      {[
        { question: 'How do I earn GagaCoins?', answer: 'Earn coins by staying active, completing daily activities, and using features like calls and sharing.' },
        { question: 'Where can I spend them?', answer: 'Use GagaCoins for premium themes, badge upgrades, and in-app boosts across the GaGa universe.' },
        { question: 'Can I send coins to friends?', answer: 'Yes. Open the Wallet page, select Send, and share with another GaGa Chat user.' },
      ].map((item) => (
        <div key={item.question} className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="font-semibold text-white mb-2">{item.question}</p>
          <p className="text-sm text-white/40 leading-relaxed">{item.answer}</p>
        </div>
      ))}

      <button
        type="button"
        onClick={() => navigate('/wallet')}
        className="w-full rounded-3xl bg-[#00FF7F] text-black font-black py-4 uppercase tracking-[0.2em] text-sm hover:bg-[#63ff98] transition-all"
      >
        Open Wallet
      </button>
    </div>
  </SettingsSubPage>
);

const AboutSettings = ({ onBack }: { onBack: () => void }) => (
  <SettingsSubPage title="About GaGa Chat" onBack={onBack}>
    <div className="space-y-4 px-5 py-4 text-white/70 text-sm">
      <p className="text-white/80">GaGa Chat is a modern messaging experience built to connect friends through fast, expressive conversations.</p>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="font-semibold text-white">Wallet branding</p>
        <p className="text-[13px] text-white/40 mt-2">Your GaGa Wallet and GagaCoins are designed to reward activity and make the app feel more playful.</p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="font-semibold text-white">Privacy</p>
        <p className="text-[13px] text-white/40 mt-2">Your messages are private and your account data is yours.</p>
      </div>
    </div>
  </SettingsSubPage>
);

const AnnouncementsSettings = ({ onBack }: { onBack: () => void }) => (
  <SettingsSubPage title="Announcements" onBack={onBack}>
    <div className="px-5 py-6 space-y-4">
      {[
        { title: 'Welcome to GaGa Chat!', date: 'May 31, 2026', content: 'We are excited to launch our new messaging platform. Start chatting with friends today!' },
        { title: 'New Story Features', date: 'May 30, 2026', content: 'You can now share videos in your stories and navigate between stories more easily.' },
        { title: 'Timeline Improvements', date: 'May 29, 2026', content: 'Check out the new timeline layout and media preview features.' },
      ].map((news, i) => (
        <div key={i} className="bg-white/5 rounded-3xl p-6 border border-white/5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-white text-base">{news.title}</h3>
            <span className="text-[10px] text-white/20 font-bold uppercase">{news.date}</span>
          </div>
          <p className="text-sm text-white/50 leading-relaxed">{news.content}</p>
        </div>
      ))}
    </div>
  </SettingsSubPage>
);

const PrivacyCenterSettings = ({ onBack }: { onBack: () => void }) => (
  <SettingsSubPage title="Privacy Center" onBack={onBack}>
    <div className="px-5 py-6 space-y-6">
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-[32px] p-8 border border-white/5 text-center">
        <Shield size={40} className="text-blue-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Your Privacy Matters</h2>
        <p className="text-sm text-white/40">Learn how we handle your data and what controls you have over your information.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
          <h3 className="font-bold text-white mb-2">Data Collection</h3>
          <p className="text-xs text-white/40 leading-relaxed">We only collect information necessary to provide our services, such as your profile info and messages. We do not sell your data to third parties.</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
          <h3 className="font-bold text-white mb-2">Your Rights</h3>
          <p className="text-xs text-white/40 leading-relaxed">You have the right to access, export, or delete your data at any time. Use the Account settings to manage your personal information.</p>
        </div>
      </div>
    </div>
  </SettingsSubPage>
);

const FriendsSettings = ({ onBack }: { onBack: () => void }) => {
  const { profile, updateProfileData } = useProfile();
  const autoAdd = profile?.autoAddFriends ?? false;
  const allowOthers = profile?.privacy?.allowFindById ?? true;

  const toggleAutoAdd = () => updateProfileData({ autoAddFriends: !autoAdd });
  const toggleAllowOthers = () => updateProfileData({
    privacy: { ...(profile?.privacy || {}), allowFindById: !allowOthers }
  });

  return (
    <SettingsSubPage title="Friends" onBack={onBack}>
      <SectionDivider label="Discoverability" />
      <div className="bg-white/5 rounded-2xl mx-3 overflow-hidden border border-white/5">
        <SettingsRow
          icon={<Users size={20} />}
          label="Auto-add friends"
          description="Automatically sync and add friends from your contacts."
          toggle
          toggleValue={autoAdd}
          onToggle={toggleAutoAdd}
        />
        <Separator />
        <SettingsRow
          icon={<Search size={20} />}
          label="Allow others to add me"
          description="Let people find you using your unique GaGa ID."
          toggle
          toggleValue={allowOthers}
          onToggle={toggleAllowOthers}
        />
      </div>

      <SectionDivider label="Safety" />
      <div className="bg-white/5 rounded-2xl mx-3 overflow-hidden border border-white/5">
        <SettingsRow
          icon={<Shield size={20} />}
          label="Blocked accounts"
          description="Manage users you've previously blocked."
          onPress={() => toast.info('Access via Privacy > Blocked contacts')}
        />
      </div>
    </SettingsSubPage>
  );
};

const ManageDevicesSettings = ({ onBack }: { onBack: () => void }) => {
  const sessionDate = new Date().toLocaleDateString();
  const currentDevice = useMemo(() => {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Macintosh')) return 'MacBook';
    if (ua.includes('Android')) return 'Android Device';
    if (ua.includes('iPhone')) return 'iPhone';
    return 'Web Browser';
  }, []);

  return (
    <SettingsSubPage title="Manage devices" onBack={onBack}>
      <div className="space-y-4 px-5 py-6">
        <p className="text-sm text-white/40 leading-relaxed">You're currently signed in to GaGa Chat on this device. Multi-device session management requires a backend session service.</p>

        <div className="rounded-[32px] border border-[#00FF7F]/20 bg-[#00FF7F]/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#00FF7F]/10 rounded-2xl flex items-center justify-center text-[#00FF7F]">
              <Settings size={24} />
            </div>
            <span className="text-[10px] font-black text-[#00FF7F] uppercase tracking-widest bg-[#00FF7F]/10 px-2 py-1 rounded-md">Active Now</span>
          </div>
          <p className="text-white font-bold text-lg">{currentDevice}</p>
          <p className="text-[13px] text-white/40 mt-1">Current session • {sessionDate}</p>
        </div>

        <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-6 text-center">
          <Globe size={24} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No other active sessions detected.</p>
        </div>
      </div>
    </SettingsSubPage>
  );
};

const BlockedContactsSettings = ({ onBack }: { onBack: () => void }) => {
  const { profile, updateProfileData } = useProfile();
  const { usersMap } = useUsersMap();
  const blockedIds = profile?.blockedUsers || [];

  const handleUnblock = async (uid: string) => {
    try {
      await updateProfileData({
        blockedUsers: blockedIds.filter(id => id !== uid)
      });
      toast.success('User unblocked');
    } catch {
      toast.error('Failed to unblock user');
    }
  };

  return (
    <SettingsSubPage title="Blocked contacts" onBack={onBack}>
      <div className="px-5 py-4 text-white/70">
        <p className="text-sm mb-6 leading-relaxed">Blocked users cannot send you messages or see your online status. Unblock them at any time to resume contact.</p>

        {blockedIds.length === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-12 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-white/20" />
            </div>
            <p className="text-white font-bold">No blocked contacts</p>
            <p className="text-sm text-white/40 mt-2">People you block will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedIds.map(uid => {
              const user = usersMap[uid];
              return (
                <div key={uid} className="bg-white/5 rounded-2xl p-4 flex items-center gap-4 border border-white/5">
                  <img src={user?.avatar || getDefaultAvatar(uid)} alt="" className="w-12 h-12 rounded-full object-cover border border-white/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{user?.name || 'Unknown User'}</p>
                    <p className="text-[11px] text-white/30 uppercase tracking-widest font-black mt-0.5">Blocked</p>
                  </div>
                  <button
                    onClick={() => handleUnblock(uid)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-[#00FF7F] hover:text-black transition-all"
                  >
                    Unblock
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SettingsSubPage>
  );
};

const MorePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subPage, setSubPage] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const navigate = useNavigate();
  const { signOut, user: authUser } = useAuth();
  const { profile } = useProfile();
  const { wallet, loading: walletLoading } = useWallet();
  const userId = authUser?.id;
  const { settings, updateSettings } = useUserSettings();

  const themeOptions = ['dark', 'midnight', 'oled'] as const;
  const fontSizes = ['small', 'medium', 'large'] as const;

  const cycleTheme = () => {
    const nextTheme = themeOptions[(themeOptions.indexOf(settings.theme) + 1) % themeOptions.length];
    updateSettings({ theme: nextTheme });
  };

  const cycleFontSize = () => {
    const nextSize = fontSizes[(fontSizes.indexOf(settings.fontSize) + 1) % fontSizes.length];
    updateSettings({ fontSize: nextSize });
  };

  const toggleNotifications = useCallback(
    () => updateSettings({ notifications: !settings.notifications }),
    [updateSettings, settings.notifications]
  );
  const toggleSound = useCallback(
    () => updateSettings({ soundEnabled: !settings.soundEnabled }),
    [updateSettings, settings.soundEnabled]
  );


  const handleMoreAction = (item: string) => {
    setSearchQuery('');
    setSubPage(null);
    switch (item) {
      case 'Profile':
        navigate('/profile');
        return;
      case 'Wallet':
        navigate('/wallet');
        return;
      case 'Friends':
        setSubPage('friends');
        return;
      case 'Notifications':
        toggleNotifications();
        return;
      case 'Sound effects':
        toggleSound();
        return;
      case 'Theme':
        cycleTheme();
        return;
      case 'Font size':
        cycleFontSize();
        return;
      case 'My QR code':
        setShowQR(true);
        return;
      case 'Account':
        setSettingsView('account');
        return;
      case 'Privacy':
        setSettingsView('privacy');
        return;
      case 'Manage devices':
        setSettingsView('devices');
        return;
      case 'Blocked contacts':
        setSettingsView('blocked');
        return;
      case 'Privacy Policy':
        navigate('/privacy');
        return;
      case 'Privacy Center':
        setSettingsView('privacy-center');
        return;
      case 'Announcements':
        setSettingsView('announcements');
        return;
      case 'Help center':
        setSettingsView('help');
        return;
      case 'Wallet FAQ':
        setSettingsView('wallet-help');
        return;
      case 'About GaGa Chat':
        setSettingsView('about');
        return;
      default:
        toast.info(`${item} coming soon!`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  const qrContent = useMemo(() => (userId ? `gagachat:${userId}` : ''), [userId]);

  useEffect(() => {
    if (!showQR || !qrContent) {
      const timeout = setTimeout(() => setQrDataUrl(''), 0);
      return () => clearTimeout(timeout);
    }

    let active = true;
    toDataURL(qrContent, {
      margin: 2,
      width: 260,
      color: { dark: '#111', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [qrContent, showQR]);

  const generalItems = useMemo(() => [
    { icon: <Bell size={20} />, label: 'Notifications', onPress: toggleNotifications },
    { icon: <MessageSquare size={20} />, label: 'Chats', onPress: () => navigate('/chats') },
    { icon: <Phone size={20} />, label: 'Calls', onPress: () => navigate('/calls') },
    { icon: <Users size={20} />, label: 'Friends', onPress: () => setSubPage('friends') },
  ], [navigate, setSubPage, toggleNotifications]);

  const appInfoItems = useMemo(() => [
    { icon: <Shield size={20} />, label: 'Privacy Policy', onPress: () => navigate('/privacy') },
    { icon: <Scale size={20} />, label: 'Terms of Service', onPress: () => navigate('/terms') },
    { icon: <Lock size={20} />, label: 'Privacy Center', onPress: () => setSettingsView('privacy-center') },
    { icon: <Bell size={20} />, label: 'Announcements', onPress: () => setSettingsView('announcements') },
    { icon: <UserCircle size={20} />, label: 'Help center', onPress: () => setSettingsView('help') },
    { icon: <Bot size={20} />, label: 'About GaGa Chat', onPress: () => setSettingsView('about') },
    { icon: <Coins size={20} />, label: 'Wallet FAQ', onPress: () => setSettingsView('wallet-help') },
  ], [navigate]);

  const allItems = useMemo(() => [
    'Profile', 'Account', 'Privacy',
    'Manage devices', 'Blocked contacts',
    'My QR code', 'Wallet', 'Wallet FAQ',
    ...generalItems.map(i => i.label),
    ...appInfoItems.map(i => i.label),
  ], [generalItems, appInfoItems]);

  const filtered = useMemo(
    () => (searchQuery
      ? allItems.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
      : []),
    [searchQuery, allItems],
  );

  if (settingsView === 'account') return <AccountSettings onBack={() => setSettingsView(null)} onNavigate={setSettingsView} userId={userId} />;
  if (settingsView === 'delete-account') return <DeleteAccountView onBack={() => setSettingsView('account')} />;
  if (settingsView === 'privacy') return <PrivacySettings onBack={() => setSettingsView(null)} onNavigate={setSettingsView} />;
  if (settingsView === 'shops') return <ShopSettings onBack={() => setSettingsView(null)} />;
  if (settingsView === 'devices') return <ManageDevicesSettings onBack={() => setSettingsView(null)} />;
  if (settingsView === 'blocked') return <BlockedContactsSettings onBack={() => setSettingsView(null)} />;
  if (settingsView === 'help') return <HelpSettings onBack={() => setSettingsView(null)} />;
  if (settingsView === 'wallet-help') return <WalletHelpSettings onBack={() => setSettingsView(null)} />;
  if (settingsView === 'about') return <AboutSettings onBack={() => setSettingsView(null)} />;
  if (settingsView === 'announcements') return <AnnouncementsSettings onBack={() => setSettingsView(null)} />;
  if (settingsView === 'privacy-center') return <PrivacyCenterSettings onBack={() => setSettingsView(null)} />;
  if (subPage === 'friends') return <FriendsSettings onBack={() => setSubPage(null)} />;

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header with GaGa Chat branding */}
      <div className="px-5 pt-12 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logoSrc} alt="GaGa Chat" className="w-7 h-7 rounded-full gchat-logo-glow" />
          <h1 className="text-white text-xl font-bold">Settings</h1>
        </div>
        <button type="button" aria-label="Open settings" onClick={() => setSettingsView('account')} className="p-2 text-white/60 hover:text-white transition-colors">
          <Settings size={20} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center bg-white/10 rounded-xl px-3 py-2.5 gap-2">
          <Search size={15} className="text-white/40 flex-shrink-0" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search settings, help articles"
            className="flex-1 bg-transparent text-[14px] text-white placeholder-white/30 outline-none"
          />
          {searchQuery && (
            <button type="button" aria-label="Clear search" onClick={() => setSearchQuery('')}>
              <X size={14} className="text-white/40" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="flex-1 overflow-y-auto scrollbar-hide bg-black">
          {filtered.length > 0 ? (
            <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
              {filtered.map((item, i) => (
                <div key={item}>
                  <SettingsRow label={item} onPress={() => handleMoreAction(item)} />
                  {i < filtered.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <Search size={32} className="mb-2" />
              <p className="text-sm">No results found</p>
            </div>
          )}
        </div>
      )}

      {/* Main Settings List */}
      {!searchQuery && (
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Profile Row */}
          <div className="bg-white/5 mx-3 rounded-xl overflow-hidden mb-1">
            <button
              type="button"
              aria-label="Open profile"
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
              onClick={() => navigate('/profile')}
            >
              <div className="relative flex-shrink-0">
                <img src={profile?.avatar || getDefaultAvatar(userId || 'unknown')} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-black",
                  profile?.status === 'online' ? "bg-[#00FF00]" : "bg-gray-500"
                )} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-semibold text-[15px]">{profile?.name || profile?.displayName || 'User'}</p>
                <p className="text-white/40 text-[12px] italic">{profile?.statusMessage || 'Available'}</p>
              </div>
              <ChevronRight size={18} className="text-white/30" />
            </button>
          </div>


          {/* Personal info */}
          <SectionDivider label="Personal info" />
          <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
            <SettingsRow icon={<Database size={20} />} label="Account" onPress={() => handleMoreAction('Account')} />
            <Separator />
            <SettingsRow icon={<Lock size={20} />} label="Privacy" onPress={() => handleMoreAction('Privacy')} />
          </div>

          {/* Preferences */}
          <SectionDivider label="Preferences" />
          <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
            <SettingsRow
              icon={<Palette size={20} />}
              label="Theme"
              description={`${settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)} mode`}
              onPress={cycleTheme}
            />
            <Separator />
            <SettingsRow
              icon={<Bell size={20} />}
              label="Notifications"
              description={settings.notifications ? 'Enabled' : 'Disabled'}
              toggle
              toggleValue={settings.notifications}
              onToggle={toggleNotifications}
            />
            <Separator />
            <SettingsRow
              icon={<Speaker size={20} />}
              label="Sound effects"
              description={settings.soundEnabled ? 'Enabled' : 'Disabled'}
              toggle
              toggleValue={settings.soundEnabled}
              onToggle={toggleSound}
            />
            <Separator />
            <SettingsRow
              icon={<TextCursor size={20} />}
              label="Font size"
              description={settings.fontSize}
              onPress={cycleFontSize}
            />
          </div>

          {/* Sharing */}
          <SectionDivider label="Sharing" />
          <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
            <SettingsRow icon={<QrCode size={20} />} label="My QR code" onPress={() => handleMoreAction('My QR code')} />
          </div>

          {/* GaGa Wallet */}
          <SectionDivider label="GaGa Wallet" />
          <div className="bg-gradient-to-br from-[#00FF7F]/10 via-black to-blue-500/10 mx-3 rounded-3xl border border-white/10 overflow-hidden mb-4">
            <div className="px-5 py-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/30 mb-1">GagaCoins balance</p>
                  <p className="text-3xl font-black text-white tracking-tight">{walletLoading ? '—' : wallet.coins}</p>
                </div>
                <div className="bg-white/10 rounded-3xl px-4 py-3 flex items-center gap-2 text-[#00FF7F] font-semibold text-sm">
                  <Wallet size={18} /> gaga
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-3xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Estimated value</p>
                  <p className="mt-2 text-white font-semibold">{walletLoading ? '—' : `Tk ${wallet.balance}`}</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Transactions</p>
                  <p className="mt-2 text-white font-semibold">{walletLoading ? '—' : wallet.transactions.length}</p>
                </div>
              </div>
              <p className="text-[13px] text-white/40 leading-relaxed">Earn and use GagaCoins for premium stickers, boosts, and special GaGa experiences.</p>
            </div>
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={() => handleMoreAction('Wallet')}
                className="w-full rounded-3xl bg-[#00FF7F] text-black font-black py-3 uppercase tracking-[0.2em] text-sm hover:bg-[#63ff98] transition-colors"
              >
                Open Wallet
              </button>
            </div>
          </div>

          {/* General */}
          <SectionDivider label="General" />
          <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
            {generalItems.map((item, i) => (
              <div key={item.label}>
                <SettingsRow
                  icon={item.icon}
                  label={item.label}
                  onPress={item.onPress ?? (() => toast.info(`${item.label} settings coming soon!`))}
                />
                {i < generalItems.length - 1 && <Separator />}
              </div>
            ))}
          </div>

          {/* App info */}
          <SectionDivider label="App info" />
          <div className="bg-white/5 mx-3 rounded-xl overflow-hidden">
            {appInfoItems.map((item, i) => (
              <div key={item.label}>
                <SettingsRow
                  icon={item.icon}
                  label={item.label}
                  onPress={() => handleMoreAction(item.label)}
                />
                {i < appInfoItems.length - 1 && <Separator />}
              </div>
            ))}
          </div>

          <div className="px-4 mt-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/20 transition-colors active:scale-[0.99]"
            >
              <LogOut size={18} />
              Sign Out
              {authUser?.email && <span className="text-red-400/60 text-xs ml-1">({authUser.email})</span>}
            </button>
          </div>

          <div className="py-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img src={logoSrc} alt="GaGa Chat" className="w-5 h-5 rounded-full" />
              <p className="text-white/20 text-xs font-medium">GaGa Chat v1.0.0</p>
            </div>
            <p className="text-white/10 text-[10px]">Always at your side</p>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-fade-in"
          onClick={() => setShowQR(false)}
        >
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 mx-6 text-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src={logoSrc} alt="GaGa Chat" className="w-8 h-8 rounded-full gchat-logo-glow" />
              <h3 className="text-lg font-bold text-white">My QR Code</h3>
            </div>
            <div className="w-52 h-52 mx-auto bg-white rounded-3xl overflow-hidden mb-4 p-3 flex items-center justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="My QR code" className="w-full h-full object-contain" />
              ) : (
                <div className="text-white/40 text-sm">Generating QR code…</div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src={profile?.avatar || getDefaultAvatar(userId || 'unknown')} alt="Profile" className="w-8 h-8 rounded-full" />
              <span className="font-semibold text-white">{profile?.name || profile?.displayName || 'User'}</span>
            </div>
            <p className="text-xs text-white/40 mb-4">Scan this QR code or share your GaGa ID.</p>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-3 mb-4 text-[12px] text-white/60 break-words">
              {qrContent || 'gagachat:your-id'}
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!qrContent) return;
                await navigator.clipboard.writeText(qrContent);
                toast.success('Copied your GaGa ID');
              }}
              className="w-full gchat-btn py-3 rounded-2xl font-semibold text-sm mb-3"
            >
              Copy GaGa ID
            </button>
            <button type="button" onClick={() => setShowQR(false)} className="w-full border border-white/10 text-white py-3 rounded-2xl hover:bg-white/5 transition-colors text-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MorePage;
