import { useState, useEffect, useRef, type ChangeEvent, type MouseEvent } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';

import { toast } from 'sonner';
import { collection, onSnapshot, orderBy, query, db, addDoc, serverTimestamp, storage, ref, uploadBytes, getDownloadURL, deleteDoc, doc } from '@/lib/firebase';
import type { FirestoreData, QuerySnapshot, TimestampType } from '@/lib/firebase';
import { useUsersMap } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { getDefaultAvatar } from '@/lib/utils';
import type { Story } from '@/types';

interface StoryCircleProps {
  onViewStory?: (userId: string) => void;
  onAddStory?: () => void;
}

const StoryCircle = ({ onViewStory, onAddStory }: StoryCircleProps) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [seenStories, setSeenStories] = useState<Set<string>>(new Set());
  const [viewingStory, setViewingStory] = useState<{
    id: string; userId: string; mediaUrl: string; mediaType: 'image' | 'video'; name: string; avatar: string; expiresAt: Date;
  } | null>(null);

  const { usersMap } = useUsersMap();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const usersWithStories = Object.values(usersMap)
    .filter((user) => user.id !== currentUserId && stories.some((story) => story.userId === user.id))
    .slice(0, 6);

  useEffect(() => {
    const storyQuery = query(collection(db, 'stories'), orderBy('expiresAt', 'desc'));
    const unsub = onSnapshot(storyQuery, (snapshot) => {
      const querySnapshot = snapshot as QuerySnapshot<FirestoreData>;
      const activeStories: Story[] = querySnapshot.docs
        .map((doc) => {
          const data = doc.data();
          const timestamp = data.timestamp as TimestampType | undefined;
          const expiresAt = data.expiresAt as TimestampType | undefined;
          const mediaType = (data.mediaType === 'video' ? 'video' : 'image') as 'video' | 'image';

          return {
            id: doc.id,
            userId: typeof data.userId === 'string' ? data.userId : '',
            mediaUrl: typeof data.mediaUrl === 'string' ? data.mediaUrl : '',
            mediaType,
            timestamp: timestamp?.toDate() ?? new Date(),
            viewers: Array.isArray(data.viewers) ? data.viewers.filter((item): item is string => typeof item === 'string') : [],
            expiresAt: expiresAt?.toDate() ?? new Date(),
          };
        })
        .filter((story) => story.userId && story.mediaUrl && story.expiresAt > new Date());
      setStories(activeStories);
    });

    return unsub;
  }, []);

  // Auto-close story viewer after 4s
  useEffect(() => {
    if (!viewingStory) return;
    const id = setTimeout(() => setViewingStory(null), 4000);
    return () => clearTimeout(id);
  }, [viewingStory]);

  const handleViewStory = (userId: string) => {
    const userStories = stories.filter((s) => s.userId === userId);
    const story = userStories[0];
    const user = usersMap[userId];
    if (!story || !user) return;

    setViewingStory({
      id: story.id,
      userId,
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      name: user.name,
      avatar: user.avatar,
      expiresAt: story.expiresAt,
    });
    setSeenStories((prev) => new Set(prev).add(userId));
    onViewStory?.(userId);
    // Mark viewer in Firestore (fire-and-forget)
    if (currentUserId && !story.viewers.includes(currentUserId)) {
      import('@/lib/firebase').then(({ db, doc: firestoreDoc, updateDoc, arrayUnion }) => {
        updateDoc(firestoreDoc(db, 'stories', story.id), { viewers: arrayUnion(currentUserId) }).catch(() => {});
      });
    }
  };

  const handleAddStory = () => {
    if (!currentUserId) {
      toast.error('Sign in to add a story.');
      return;
    }
    onAddStory?.();
    fileInputRef.current?.click();
  };

  const handleStoryFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Only images and videos are supported.');
      return;
    }
    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File must be under ${isVideo ? '50' : '5'} MB.`);
      return;
    }
    e.target.value = '';
    try {
      toast.loading('Uploading story...', { id: 'story-upload' });
      const storageRef = ref(storage, `stories/${currentUserId}/${Date.now()}.${file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4')}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const mediaUrl = await getDownloadURL(storageRef);
      toast.dismiss('story-upload');
      await addDoc(collection(db, 'stories'), {
        userId: currentUserId,
        mediaUrl,
        mediaType: isImage ? 'image' : 'video',
        timestamp: serverTimestamp(),
        viewers: [],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      toast.success('Story posted!');
    } catch {
      toast.dismiss('story-upload');
      toast.error('Unable to post story.');
    }


  };

  const handleDeleteStory = async (e: MouseEvent<HTMLButtonElement>, storyId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this story?')) return;
    try {
      await deleteDoc(doc(db, 'stories', storyId));
      setViewingStory(null);
      toast.success('Story deleted');
    } catch {
      toast.error('Failed to delete story');
    }

  };

  const handleNextStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewingStory) return;
    const currentIndex = stories.findIndex(s => s.id === viewingStory.id);
    if (currentIndex < stories.length - 1) {
      const next = stories[currentIndex + 1];
      const user = usersMap[next.userId];
      setViewingStory({
        id: next.id,
        userId: next.userId,
        mediaUrl: next.mediaUrl,
        mediaType: next.mediaType,
        name: user?.name || 'Unknown',
        avatar: user?.avatar || getDefaultAvatar(next.userId),
        expiresAt: next.expiresAt,
      });
    } else {
      setViewingStory(null);
    }
  };

  const handlePrevStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewingStory) return;
    const currentIndex = stories.findIndex(s => s.id === viewingStory.id);
    if (currentIndex > 0) {
      const prev = stories[currentIndex - 1];
      const user = usersMap[prev.userId];
      setViewingStory({
        id: prev.id,
        userId: prev.userId,
        mediaUrl: prev.mediaUrl,
        mediaType: prev.mediaType,
        name: user?.name || 'Unknown',
        avatar: user?.avatar || getDefaultAvatar(prev.userId),
        expiresAt: prev.expiresAt,
      });
    }
  };

  const timeLeft = (expiresAt: Date) => {
    // Avoid impure Date.now() during render; compute relative time using stateful clock.
    const now = new Date();
    const h = Math.round((expiresAt.getTime() - now.getTime()) / 3_600_000);
    return h > 0 ? `${h}h left` : 'Expiring soon';
  };


  return (
    <>
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide bg-black border-b border-white/10">
        {/* My Story */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0" onClick={handleAddStory}>
          <div className="relative cursor-pointer">
            <img src={user?.avatar || getDefaultAvatar(user?.id ?? 'unknown')} alt="My Story" className="w-14 h-14 rounded-full object-cover border-2 border-white/20" />
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#00FF00] rounded-full flex items-center justify-center border-2 border-black">
              <Plus size={12} className="text-white" strokeWidth={3} />
            </div>
          </div>
          <span className="text-[10px] text-white/50 font-medium truncate w-14 text-center">My Story</span>
        </div>

        {/* Friends' Stories */}
        {usersWithStories.length > 0 ? (
          usersWithStories.map(user => {
            const seen = seenStories.has(user.id);
            return (
              <div
                key={user.id}
                className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
                onClick={() => handleViewStory(user.id)}
              >
                <div className={seen ? 'p-[2px] rounded-full bg-white/20' : 'story-ring'}>
                  <img src={user.avatar} alt={user.name} className="w-14 h-14 rounded-full object-cover border-2 border-black" />
                </div>
                <span className="text-[10px] text-white/50 font-medium truncate w-14 text-center">
                  {user.name.split(' ')[0]}
                </span>
              </div>
            );
          })
        ) : (
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="inline-block w-2 h-2 rounded-full bg-white/30" />
            No stories yet
          </div>
        )}
      </div>

      {/* Story Viewer */}
      {viewingStory && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in"
          onClick={() => setViewingStory(null)}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${viewingStory.mediaUrl})`,
              backgroundSize: 'cover',
              filter: 'blur(30px) brightness(0.3)',
            }}
          />
          {/* Progress bar — animates over 4s */}
          <div className="relative z-10 px-4 pt-12">
            <div className="h-0.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ animation: 'storyProgress 4s linear forwards', width: '100%' }}
              />
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-3 px-4 pt-3 pb-4">
            <img src={viewingStory.avatar} alt={viewingStory.name} className="w-10 h-10 rounded-full border-2 border-white/50" />
            <div>
              <p className="text-white font-semibold">{viewingStory.name}</p>
              <p className="text-white/50 text-xs">{timeLeft(viewingStory.expiresAt)}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {viewingStory.userId === currentUserId && (
                <button
                  className="p-2 text-red-400/80 hover:text-red-400"
                  onClick={e => handleDeleteStory(e, viewingStory.id)}
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button
                className="p-2 text-white/60"
                onClick={e => { e.stopPropagation(); setViewingStory(null); }}
              >
                <X size={22} />
              </button>
            </div>
          </div>

          <div className="relative z-10 flex-1 flex items-center justify-center px-6 overflow-hidden">
            {/* Navigation Areas */}
            <div className="absolute inset-0 z-20 flex">
              <div className="flex-1 h-full cursor-pointer" onClick={handlePrevStory} />
              <div className="flex-1 h-full cursor-pointer" onClick={handleNextStory} />
            </div>

            {viewingStory.mediaType === 'video' ? (
              <video
                src={viewingStory.mediaUrl}
                autoPlay
                className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              />
            ) : (
              <img
                src={viewingStory.mediaUrl}
                alt=""
                className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              />
            )}
          </div>
          <div className="relative z-10 pb-12 flex justify-center">
            <p className="text-white/40 text-xs">Tap anywhere to close</p>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleStoryFileChange} />
    </>
  );
};

export default StoryCircle;
