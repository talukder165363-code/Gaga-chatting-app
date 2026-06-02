import { useState } from 'react';
import type { User } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ProfileFieldsFormProps {
  initialData: Partial<User>;
  onSubmit: (data: Partial<User>) => Promise<void>;
  onCancel?: () => void;
}

export function ProfileFieldsForm({ initialData, onSubmit, onCancel }: ProfileFieldsFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: initialData.displayName || initialData.name || '',
    statusMessage: initialData.statusMessage || '',
    bio: initialData.bio || '',
    location: initialData.location || '',
    website: initialData.website || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim()) return;

    try {
      setLoading(true);
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="displayName" className="text-white/60">Display Name</Label>
        <Input
          id="displayName"
          value={formData.displayName}
          onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
          placeholder="Enter your name"
          className="bg-white/5 border-white/10 text-white focus:border-[#00FF7F]/50 transition-colors"
          maxLength={40}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="statusMessage" className="text-white/60">Status Message</Label>
        <Textarea
          id="statusMessage"
          value={formData.statusMessage}
          onChange={(e) => setFormData(prev => ({ ...prev, statusMessage: e.target.value }))}
          placeholder="Short status..."
          className="bg-white/5 border-white/10 text-white focus:border-[#00FF7F]/50 transition-colors resize-none"
          maxLength={80}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio" className="text-white/60">Bio</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
          placeholder="Tell us about yourself..."
          className="bg-white/5 border-white/10 text-white focus:border-[#00FF7F]/50 transition-colors resize-none"
          maxLength={200}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location" className="text-white/60">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="City, Country"
            className="bg-white/5 border-white/10 text-white focus:border-[#00FF7F]/50 transition-colors"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website" className="text-white/60">Website</Label>
          <Input
            id="website"
            value={formData.website}
            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
            placeholder="https://..."
            className="bg-white/5 border-white/10 text-white focus:border-[#00FF7F]/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 text-white/60 hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || !formData.displayName.trim()}
          className="flex-1 bg-[#00FF7F] text-black hover:bg-[#00FF7F]/90 font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
