import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadMediaBlob } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface ProfileAvatarUploaderProps {
    uid: string;
    currentAvatar: string;
    onUploadComplete: (url: string) => void;
    className?: string;
}

export function ProfileAvatarUploader({ uid, currentAvatar, onUploadComplete, className }: ProfileAvatarUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        try {
            setUploading(true);
            const url = await uploadMediaBlob({
                kind: 'avatars',
                userId: uid,
                file,
                mimeType: file.type,
            });
            onUploadComplete(url);
            toast.success('Avatar updated');
        } catch (error) {
            console.error('Avatar upload failed:', error);
            toast.error('Failed to upload avatar');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className={cn("relative group", className)}>
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#00FF7F]/20 bg-white/5 relative">
                <img
                    src={currentAvatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                />
                {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-[#00FF7F] animate-spin" />
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-2 bg-[#00FF7F] rounded-full text-black shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
                <Camera size={16} />
            </button>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}
