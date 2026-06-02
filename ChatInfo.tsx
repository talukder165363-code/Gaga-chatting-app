import { useState, useRef, useCallback } from 'react';
import { X, Search, Bell, BellOff, Trash2, ShieldAlert, LogOut, Image as ImageIcon, ChevronRight, Camera, Edit2, Check, Download, ChevronLeft } from 'lucide-react';
import { cn, sanitizeMediaUrl } from '@/lib/utils';
import type { Chat, User, Message } from '@/types';
import { uploadMediaBlob } from '@/lib/storage';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ChatInfoProps {
  chat: Chat;
  chatName: string;
  chatAvatar: string;
  isOpen: boolean;
  onClose: () => void;
  onSearchClick: () => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  onClearChat: () => void;
  onConfirmAction: (action: 'block' | 'report' | 'leave' | 'clear') => void;
  onUpdateChat?: (data: Partial<Chat>) => void;
  onArchive?: () => void;
  onAddParticipant?: () => void;
  onRemoveParticipant?: (userId: string) => void;
  onPromoteAdmin?: (userId: string) => void;
  onDemoteAdmin?: (userId: string) => void;
  otherUser?: User | null;
  participants?: User[];
  mediaMessages?: Message[];
  currentUserId?: string;
}

export function ChatInfo({
  chat,
  chatName,
  chatAvatar,
  isOpen,
  onClose,
  onSearchClick,
  isMuted,
  onMuteToggle,
  onClearChat,
  onConfirmAction,
  onUpdateChat,
  onArchive,
  onAddParticipant,
  onRemoveParticipant,
  onPromoteAdmin,
  onDemoteAdmin,
  otherUser,
  participants = [],
  mediaMessages = [],
  currentUserId
}: ChatInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(chatName);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const images = mediaMessages.filter(m => m.type === 'image');
  const files = mediaMessages.filter(m => m.type === 'file');
  const isAdmin = chat.type === 'group' && currentUserId && chat.admins?.includes(currentUserId);

  const handleAvatarClick = () => {
    if (isAdmin) avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.loading('Updating avatar...', { id: 'chat-avatar' });
      const url = await uploadMediaBlob({ kind: 'chats', chatId: chat.id, file, mimeType: file.type });
      onUpdateChat?.({ avatar: url });
      toast.dismiss('chat-avatar');
    } catch {
      toast.dismiss('chat-avatar');
      toast.error('Failed to update avatar');
    }
  };

  const saveName = () => {
    if (editName.trim() && editName !== chatName) {
      onUpdateChat?.({ name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleNextMedia = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedMediaIndex === null) return;
    setSelectedMediaIndex((selectedMediaIndex + 1) % images.length);
  }, [selectedMediaIndex, images]);

  const handlePrevMedia = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedMediaIndex === null) return;
    setSelectedMediaIndex((selectedMediaIndex - 1 + images.length) % images.length);
  }, [selectedMediaIndex, images]);

  const handleDownload = async (url: string) => {
    const safeUrl = sanitizeMediaUrl(url);
    if (!safeUrl) { toast.error('Invalid media URL'); return; }
    try {
      const response = await fetch(safeUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `gaga-chat-media-${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Failed to download media');
    }

  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in bg-black/60">
      <div
        className="w-full max-w-sm bg-[#111] h-full shadow-2xl animate-slide-left flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Chat Info</h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-10 scrollbar-hide">
          <div className="flex flex-col items-center py-8 px-4 text-center">
            <div className="relative group/avatar mb-4">
              <img
                src={sanitizeMediaUrl(chatAvatar)}
                alt={chatName}
                className={cn(
                  "w-24 h-24 rounded-full object-cover border-2 border-white/10 shadow-xl transition-all",
                  isAdmin && "cursor-pointer hover:brightness-50"
                )}
                onClick={handleAvatarClick}
              />
              {isAdmin && (
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none"
                >
                  <Camera size={24} className="text-white" />
                </div>
              )}
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2 px-4 w-full">
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="flex-1 bg-white/10 border border-[#00FF7F]/50 text-white rounded-xl px-4 py-2 text-center text-lg font-bold outline-none"
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                />
                <button onClick={saveName} className="p-2 bg-[#00FF7F] text-black rounded-full shadow-lg shadow-[#00FF7F]/20">
                  <Check size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/name">
                <h3 className="text-xl font-bold text-white">{chatName}</h3>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-white/20 hover:text-white/60 opacity-0 group-hover/name:opacity-100 transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            )}

            <p className="text-white/40 text-sm mt-1">
              {chat.type === 'direct' ? otherUser?.statusMessage || 'Available' : `${chat.participants.length} Members`}
            </p>
          </div>

          <div className="px-4 py-2 flex justify-around border-b border-white/5 pb-6">
            <button onClick={onSearchClick} className="flex flex-col items-center gap-2 group">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <Search size={20} className="text-white/60" />
              </div>
              <span className="text-[11px] text-white/40 font-medium">Search</span>
            </button>
            <button onClick={onMuteToggle} className="flex flex-col items-center gap-2 group">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                {isMuted ? <BellOff size={20} className="text-[#00FF7F]" /> : <Bell size={20} className="text-white/60" />}
              </div>
              <span className="text-[11px] text-white/40 font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button onClick={onClearChat} className="flex flex-col items-center gap-2 group">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <Trash2 size={20} className="text-white/60" />
              </div>
              <span className="text-[11px] text-white/40 font-medium">Clear</span>
            </button>
            {onArchive && (
              <button onClick={onArchive} className="flex flex-col items-center gap-2 group">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <LogOut size={20} className="text-white/60" />
                </div>
                <span className="text-[11px] text-white/40 font-medium">Archive</span>
              </button>
            )}
          </div>

          <div className="mt-6">
            <div className="px-4 mb-3 flex items-center justify-between">
              <SectionHeader title="Media, Links and Docs" count={images.length + files.length} />
              {images.length + files.length > 4 && <ChevronRight size={16} className="text-white/20" />}
            </div>
            <div className="px-4 grid grid-cols-4 gap-2">
              {images.slice(0, 4).map((m, i) => (
                <div key={m.id} className="aspect-square rounded-lg bg-white/5 overflow-hidden border border-white/5">
                  <img
                    src={sanitizeMediaUrl(m.content)}
                    alt=""
                    onClick={() => setSelectedMediaIndex(i)}
                    className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"
                  />
                </div>
              ))}
              {images.length === 0 && (
                <div className="col-span-4 py-4 flex flex-col items-center justify-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <ImageIcon size={24} className="text-white/10 mb-2" />
                  <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">No shared media</p>
                </div>
              )}
            </div>
          </div>

          {chat.type === 'group' && (
            <div className="mt-8">
              <div className="flex items-center justify-between px-4 mb-2">
                <SectionHeader title="Group Participants" count={participants.length} />
                {isAdmin && (
                  <button
                    onClick={onAddParticipant}
                    className="text-xs font-bold text-[#00FF7F] hover:text-[#00FF7F]/80 transition-colors bg-[#00FF7F]/10 px-3 py-1 rounded-full"
                  >
                    Add Member
                  </button>
                )}
              </div>
              <div className="divide-y divide-white/5">
                {participants.map(user => {
                  const userIsAdmin = chat.admins?.includes(user.id);
                  const isSelf = user.id === currentUserId;

                  return (
                    <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group/item">
                      <img src={sanitizeMediaUrl(user.avatar)} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                          {userIsAdmin && (
                            <span className="text-[9px] font-bold text-[#00FF7F] bg-[#00FF7F]/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40 truncate italic">{user.statusMessage || 'Available'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.status === 'online' && <div className="w-2 h-2 rounded-full bg-[#00FF7F]" />}

                        {isAdmin && !isSelf && (
                          <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                            {!userIsAdmin ? (
                              <button
                                onClick={() => onPromoteAdmin?.(user.id)}
                                className="p-1.5 text-white/20 hover:text-[#00FF7F]"
                                title="Promote to Admin"
                              >
                                <ShieldAlert size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => onDemoteAdmin?.(user.id)}
                                className="p-1.5 text-[#00FF7F] hover:text-white/40"
                                title="Demote from Admin"
                              >
                                <ShieldAlert size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => onRemoveParticipant?.(user.id)}
                              className="p-1.5 text-white/20 hover:text-red-400"
                              title="Remove member"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 px-4 space-y-3">
            {chat.type === 'direct' ? (
              <>
                <DangerButton
                  icon={<ShieldAlert size={18} />}
                  label="Report User"
                  onClick={() => onConfirmAction('report')}
                />
                <DangerButton
                  icon={<LogOut size={18} />}
                  label="Block User"
                  onClick={() => onConfirmAction('block')}
                />
              </>
            ) : (
              <DangerButton
                icon={<LogOut size={18} />}
                label="Leave Group"
                onClick={() => onConfirmAction('leave')}
              />
            )}
          </div>
        </div>
      </div>

      {/* Media Preview Modal */}
      <Dialog open={selectedMediaIndex !== null} onOpenChange={(open) => !open && setSelectedMediaIndex(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none outline-none overflow-hidden flex items-center justify-center">
          {selectedMediaIndex !== null && images[selectedMediaIndex] && (
            <div className="relative w-full h-full flex items-center justify-center group/modal">
              {/* Media Container */}
              <div className="relative max-w-full max-h-[85vh] flex items-center justify-center">
                <img
                  src={sanitizeMediaUrl(images[selectedMediaIndex].content)}
                  alt=""
                  className="max-w-full max-h-full object-contain select-none"
                />
              </div>

              {/* Navigation Controls */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevMedia}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-sm opacity-0 group-hover/modal:opacity-100"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={handleNextMedia}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-sm opacity-0 group-hover/modal:opacity-100"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              {/* Top Controls */}
              <div className="absolute top-4 right-12 flex items-center gap-2">
                <button
                  onClick={() => handleDownload(images[selectedMediaIndex!].content)}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-sm"
                  title="Download"
                >
                  <Download size={20} />
                </button>
              </div>

              {/* Media Indicator */}
              {images.length > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full">
                  <span className="text-white text-xs font-bold">
                    {selectedMediaIndex + 1} / {images.length}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{title}</h4>
      {count !== undefined && <span className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded-md">{count}</span>}
    </div>
  );
}

function DangerButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/10 transition-all active:scale-[0.98]"
    >
      {icon}
      <span className="text-sm font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
