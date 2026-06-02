import { useState, useRef, useEffect, type ReactNode } from 'react';
import { X, Globe, Lock, Users2, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn, sanitizeForLog } from '@/lib/utils';
import { toast } from 'sonner';
import { createUploadTask } from '@/lib/storage';
import type { UploadTask } from 'firebase/storage';

type Visibility = 'public' | 'friends' | 'private';

const VisibilityOptions: { value: Visibility; label: string; icon: ReactNode }[] = [
  { value: 'public', label: 'Public', icon: <Globe size={14} /> },
  { value: 'friends', label: 'Friends only', icon: <Users2 size={14} /> },
  { value: 'private', label: 'Only me', icon: <Lock size={14} /> },
];

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, images: string[], visibility: Visibility, imageCaptions?: string[]) => Promise<void>;
  userAvatar: string;
  userName: string;
  userId: string;
}

type ImageItem = { key: string; url?: string; preview?: string; caption?: string; uploading?: boolean; error?: string; file?: File; isVideo?: boolean };

export function CreatePostModal({
  isOpen,
  onClose,
  onSubmit,
  userAvatar,
  userName,
  userId
}: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const uploadTasksRef = useRef<Record<string, UploadTask | undefined>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      imageItems.forEach((it) => {
        if (it.preview) URL.revokeObjectURL(it.preview);
      });
    };
  }, [imageItems]);

  const uploadFile = (file: File, key: string, initialize = true) => new Promise<{ url?: string; error?: string; key: string }>((resolve) => {
    if (initialize) {
      const preview = URL.createObjectURL(file);
      setImageItems((prev) => [...prev, { key, preview, uploading: true, file, isVideo: file.type.startsWith('video/') }]);
    }

    try {
      const { task } = createUploadTask({
        kind: 'posts',
        postUserId: userId,
        file,
        mimeType: file.type,
      }) as { task: UploadTask };
      uploadTasksRef.current[key] = task;

      task.on('state_changed',
        () => { },
        (err: unknown) => {
          console.debug('Upload error', sanitizeForLog(err instanceof Error ? err.message : String(err)));
          setImageItems((prev) => prev.map((it) => it.key === key ? { ...it, uploading: false, error: 'Upload failed' } : it));
          delete uploadTasksRef.current[key];
          resolve({ error: file.name, key });
        },
        async () => {
          try {
            import('firebase/storage').then(async ({ getDownloadURL }) => {
              const url = await getDownloadURL(task.snapshot.ref);
              setImageItems((prev) => {
                const current = prev.find((it) => it.key === key);
                if (current?.preview) URL.revokeObjectURL(current.preview);
                return prev.map((it) =>
                  it.key === key
                    ? { ...it, url, uploading: false, file: undefined, error: undefined, preview: undefined }
                    : it
                );
              });
              delete uploadTasksRef.current[key];
              resolve({ url, key });
            });
          } catch (err) {
            console.debug('Download URL error', sanitizeForLog(err instanceof Error ? err.message : String(err)));
            setImageItems((prev) => prev.map((it) => it.key === key ? { ...it, uploading: false, error: 'Could not fetch image URL' } : it));
            delete uploadTasksRef.current[key];
            resolve({ error: file.name, key });
          }
        }
      );
    } catch (err) {
      console.error('Task creation failed', String(err instanceof Error ? err.message : err).replace(/[\r\n]/g, ' '));
      resolve({ error: file.name, key });
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter(f => {
      const isImage = f.type.startsWith('image/');
      const isVideo = f.type.startsWith('video/');
      if (!isImage && !isVideo) {
        toast.error(`${f.name} is not a supported file type`);
        return false;
      }
      if (f.size > 20 * 1024 * 1024) { // 20MB limit
        toast.error(`${f.name} is too large (max 20MB)`);
        return false;
      }
      return true;
    });

    if (!validFiles.length) return;

    setUploading(true);
    const promises = validFiles.map((f) => uploadFile(f, `file_${Date.now()}_${Math.random().toString(16).slice(2)}`));
    await Promise.all(promises);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (key: string) => {
    const task = uploadTasksRef.current[key];
    if (task) task.cancel();
    delete uploadTasksRef.current[key];
    setImageItems((prev) => {
      const found = prev.find((it) => it.key === key);
      if (found?.preview) URL.revokeObjectURL(found.preview);
      return prev.filter((it) => it.key !== key);
    });
  };

  const handlePost = async () => {
    if (!content.trim() && !imageItems.length) return;
    if (imageItems.some(it => it.uploading)) {
      toast.error('Please wait for images to finish uploading');
      return;
    }

    try {
      setSubmitting(true);
      const imageUrls = imageItems.map(it => it.url).filter(Boolean) as string[];
      const captions = imageItems.map(it => it.caption || '');
      await onSubmit(content.trim(), imageUrls, visibility, captions);
      setContent('');
      setImageItems([]);
      onClose();
    } catch (err) {
      console.error('Failed to create post', sanitizeForLog(err instanceof Error ? err.message : String(err)));
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 animate-fade-in p-0 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[var(--gchat-bg-soft)] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <button onClick={onClose} className="p-2 -ml-2 text-white/40 hover:text-white">
            <X size={20} />
          </button>
          <h2 className="text-white font-bold">New Post</h2>
          <button
            onClick={handlePost}
            disabled={submitting || uploading || (!content.trim() && !imageItems.length)}
            className="bg-[#00FF7F] text-black px-6 py-2 rounded-full font-bold text-sm disabled:opacity-40"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <img src={userAvatar} alt={userName} className="w-10 h-10 rounded-full border border-white/10" />
            <div>
              <p className="text-white font-bold text-sm">{userName}</p>
              <div className="flex gap-1 mt-1">
                {VisibilityOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setVisibility(opt.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border",
                      visibility === opt.value
                        ? "bg-[#00FF7F]/10 border-[#00FF7F]/30 text-[#00FF7F]"
                        : "bg-white/5 border-transparent text-white/40 hover:bg-white/10"
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            className="w-full bg-transparent text-white text-lg outline-none resize-none min-h-[120px] placeholder-white/20"
            maxLength={2000}
          />

          {imageItems.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {imageItems.map((item) => (
                <div key={item.key} className="relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                  {item.isVideo ? (
                    <video src={item.url || item.preview} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={item.url || item.preview} alt="" className="w-full h-full object-cover" />
                  )}
                  {item.uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-[#00FF7F] animate-spin" />
                    </div>
                  )}
                  <button
                    onClick={() => handleRemoveImage(item.key)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm p-2">
                    <input
                      type="text"
                      placeholder="Add caption..."
                      value={item.caption || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setImageItems(prev => prev.map(it => it.key === item.key ? { ...it, caption: val } : it));
                      }}
                      className="w-full bg-transparent text-[10px] text-white placeholder-white/50 outline-none"
                    />
                  </div>
                </div>
              ))}
              {imageItems.length < 4 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-white/20 hover:text-white/40 hover:border-white/20 transition-all"
                >
                  <Camera size={32} />
                  <span className="text-xs font-bold">Add Photo</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-[#00FF7F] hover:bg-[#00FF7F]/10 rounded-full transition-colors"
              title="Add photos or videos"
            >
              <ImageIcon size={24} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-[#00FF7F] hover:bg-[#00FF7F]/10 rounded-full transition-colors"
              title="Camera"
            >
              <Camera size={24} />
            </button>
          </div>
          <span className={cn(
            "text-[10px] font-bold tracking-widest uppercase",
            content.length > 1800 ? "text-yellow-500" : "text-white/20"
          )}>
            {content.length} / 2000
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
