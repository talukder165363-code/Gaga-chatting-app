import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, Camera, Check, X, QrCode, Edit2 } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { getDefaultAvatar, cn, sanitizeMediaUrl } from '@/lib/utils'
import { uploadMediaBlob } from '@/lib/storage'
import { toast } from 'sonner'
import { toDataURL } from 'qrcode'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { profile: currentUser, loading, updateProfileData } = useProfile()
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const userId = currentUser?.id || 'user_1'
  const qrCodeText = useMemo(() => `gagachat:${userId}`, [userId])

  const hasProfileChanges = useMemo(() => {
    if (!currentUser) return false
    return (
      currentUser.name !== editName ||
      currentUser.bio !== editBio ||
      currentUser.statusMessage !== editStatus ||
      currentUser.location !== editLocation
    )
  }, [currentUser, editBio, editLocation, editName, editStatus])

  const openEditor = () => {
    if (!currentUser) return
    setEditName(currentUser.name || '')
    setEditBio(currentUser.bio || '')
    setEditStatus(currentUser.statusMessage || '')
    setEditLocation(currentUser.location || '')
    setEditMode(true)
  }

  useEffect(() => {
    if (!showQR || !userId) return

    let active = true
    toDataURL(`gagachat:${userId}`, { margin: 2, width: 200, color: { dark: '#111', light: '#ffffff' } })
      .then(url => { if (active) setQrDataUrl(url) })
      .catch(() => { if (active) setQrDataUrl('') })
    return () => { active = false }
  }, [showQR, userId])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    e.target.value = ''
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    try {
      toast.loading('Updating avatar...', { id: 'avatar' })
      const url = await uploadMediaBlob({ kind: 'avatars', userId, file, mimeType: file.type })
      await updateProfileData({ avatar: url })
      toast.dismiss('avatar')
      toast.success('Avatar updated!')
    } catch {
      toast.dismiss('avatar')
      toast.error('Failed to update avatar')
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <p className="text-white/50">Loading profile…</p>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <p className="text-white/50">Please log in to view your profile.</p>
      </div>
    )
  }

  const handleSave = async () => {
    if (!currentUser) return
    if (!hasProfileChanges) {
      toast.info('No changes to save.')
      setEditMode(false)
      return
    }

    if (!editName.trim()) {
      toast.error('Please enter your name.')
      return
    }

    await updateProfileData({
      name: editName.trim(),
      bio: editBio.trim(),
      statusMessage: editStatus.trim(),
      location: editLocation.trim(),
    })
    setEditMode(false)
    toast.success('Profile updated!')
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    if (currentUser) {
      setEditName(currentUser.name || '')
      setEditBio(currentUser.bio || '')
      setEditStatus(currentUser.statusMessage || '')
      setEditLocation(currentUser.location || '')
    }
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between shrink-0">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Profile</h1>
        <button type="button" onClick={() => editMode ? setEditMode(false) : openEditor()} aria-label={editMode ? 'Close editor' : 'Edit profile'} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          {editMode ? <X size={20} /> : <Edit2 size={20} className="text-white/60" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-12">
        {/* Profile Info */}
        <div className="flex flex-col items-center mt-6 text-center">
          <div className="relative mb-4">
            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#00FF7F]/20 shadow-xl">
              <img src={sanitizeMediaUrl(currentUser.avatar) || getDefaultAvatar(userId)} alt={currentUser.name} className="w-full h-full object-cover" />
            </div>
            {editMode && (
              <button type="button" onClick={() => avatarInputRef.current?.click()} aria-label="Upload avatar" title="Upload avatar" className="absolute bottom-0 right-0 w-8 h-8 bg-[#00FF7F] rounded-full flex items-center justify-center">
                <Camera size={16} className="text-black" />
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" aria-label="Upload avatar" className="hidden" onChange={handleAvatarChange} />
          </div>

          {editMode ? (
            <div className="w-full max-w-sm space-y-3">
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name" aria-label="Full name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-bold outline-none focus:border-[#00FF7F]/50" />
              <input value={editStatus} onChange={e => setEditStatus(e.target.value)} placeholder="Status message" aria-label="Status message" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/70 text-sm text-center outline-none focus:border-[#00FF7F]/50" />
              <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Bio" aria-label="Bio" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/70 text-sm text-center outline-none focus:border-[#00FF7F]/50 resize-none" rows={2} />
              <input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="Location" aria-label="Location" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/70 text-sm text-center outline-none focus:border-[#00FF7F]/50" />
              <div className="flex gap-3">
                <button type="button" onClick={handleSave} disabled={!hasProfileChanges} className={cn('flex-1 gchat-btn py-3 rounded-xl font-bold text-sm transition-opacity', !hasProfileChanges ? 'opacity-60 cursor-not-allowed' : '')}>
                  <Check size={16} className="inline mr-2" /> Save Changes
                </button>
                <button type="button" onClick={handleCancelEdit} className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded-xl text-sm font-medium transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{currentUser.name}</h2>
              <p className="text-[#00FF7F] text-xs font-bold uppercase tracking-widest mt-1">{currentUser.statusMessage}</p>
              {currentUser.bio && <p className="text-white/60 text-sm mt-4 max-w-sm leading-relaxed">{currentUser.bio}</p>}
              <div className="flex flex-wrap justify-center gap-4 mt-4 text-white/40 text-xs">
                {currentUser.location && <div className="flex items-center gap-1"><MapPin size={12} /><span>{currentUser.location}</span></div>}
              </div>
              <div className="flex gap-3 mt-8 w-full max-w-xs">
                <button type="button" onClick={() => setEditMode(true)} className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded-2xl text-sm font-medium transition-colors">
                  Edit Profile
                </button>
                <button type="button" onClick={() => setShowQR(true)} aria-label="Show QR code" className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl flex items-center justify-center transition-colors">
                  <QrCode size={20} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
            <p className="text-xl font-black text-[#00FF7F]">{currentUser.friends?.length ?? '—'}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Friends</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
            <p className="text-xl font-black text-[#00FF7F]">{currentUser.savedPosts?.length ?? '—'}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Saved</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
            <p className="text-xl font-black text-[#00FF7F]">{currentUser.coins ?? 0}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Coins</p>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="mt-8 bg-white/5 rounded-2xl p-4 border border-white/5">
          <p className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3">Privacy & Security</p>
          <div className="space-y-3">
            <PrivacyToggle label="Show Online Status" description="Let others see when you're online" active={currentUser.privacy?.showStatus ?? true} onChange={(val) => updateProfileData({ privacy: { ...currentUser.privacy, showStatus: val } })} />
            <PrivacyToggle label="Find by Gaga ID" description="Allow people to find you via your ID" active={currentUser.privacy?.allowFindById ?? true} onChange={(val) => updateProfileData({ privacy: { ...currentUser.privacy, allowFindById: val } })} />
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-fade-in" onClick={() => setShowQR(false)}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 mx-6 text-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">My Gaga ID</h3>
            <div className="w-52 h-52 mx-auto bg-white rounded-3xl overflow-hidden mb-4 p-3 flex items-center justify-center">
              {qrDataUrl
                ? <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain" />
                : <div className="text-gray-400 text-xs">Generating…</div>
              }
            </div>
            <div className="space-y-3">
              <button type="button" onClick={() => {
                if (!navigator.clipboard) {
                  toast.error('Clipboard is unavailable in this browser.');
                  return
                }
                navigator.clipboard.writeText(qrCodeText)
                  .then(() => toast.success('Copied!'))
                  .catch(() => toast.error('Unable to copy Gaga ID.'))
              }} className="w-full gchat-btn py-3 rounded-2xl font-semibold text-sm">
                Copy Gaga ID
              </button>
              <button type="button" onClick={() => setShowQR(false)} className="w-full border border-white/10 bg-white/5 hover:bg-white/10 text-white py-3 rounded-2xl text-sm font-medium transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PrivacyToggle({ label, description, active, onChange }: { label: string; description: string; active: boolean; onChange: (val: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">{description}</p>
      </div>
      <button type="button" onClick={() => onChange(!active)} aria-label={active ? `Disable ${label}` : `Enable ${label}`} title={active ? `Disable ${label}` : `Enable ${label}`} className={cn("w-10 h-5 rounded-full relative transition-colors duration-200", active ? "bg-[#00FF7F]" : "bg-white/10")}>
        <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200", active ? "left-6" : "left-1")} />
      </button>
    </div>
  )
}
