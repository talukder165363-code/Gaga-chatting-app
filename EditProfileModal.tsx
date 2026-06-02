import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { User } from '@/types';
import { ProfileAvatarUploader } from './ProfileAvatarUploader';
import { ProfileFieldsForm } from './ProfileFieldsForm';

interface EditProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<User>) => Promise<void>;
}

export function EditProfileModal({ user, isOpen, onClose, onUpdate }: EditProfileModalProps) {
  const handleUpdate = async (data: Partial<User>) => {
    await onUpdate(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#05070a] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          <ProfileAvatarUploader
            uid={user.id}
            currentAvatar={user.avatar}
            onUploadComplete={(url) => onUpdate({ avatar: url })}
          />
          
          <div className="w-full">
            <ProfileFieldsForm
              initialData={user}
              onSubmit={handleUpdate}
              onCancel={onClose}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
