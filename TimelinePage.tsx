import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { FirestoreData, QuerySnapshot, DocumentSnapshot } from '@/lib/firebase';
import TimelinePostCard from '@/components/features/TimelinePostCard';
import { TimelineHeader } from '@/components/features/timeline/TimelineHeader';
import { PostFilter } from '@/components/features/timeline/PostFilter';
import { CreatePostModal } from '@/components/features/timeline/CreatePostModal';
import type { TimelinePost } from '@/types';
import { getDefaultAvatar, sanitizeForLog } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  db, auth, collection, doc, addDoc, updateDoc,
  query, orderBy, limit, serverTimestamp, arrayUnion, arrayRemove,
  onSnapshot, getDocs, startAfter,
} from '@/lib/firebase';
import type { TimestampType } from '@/lib/firebase';
import { useUsersMap } from '@/hooks/useUsers';
import { useFriends } from '@/hooks/useFriends';

function docToPost(id: string, data: Record<string, unknown>): TimelinePost {
  return {
    id,
    userId: (data.userId as string) || '',
    content: (data.content as string) || '',
    images: (data.images as string[]) || [],
    likes: (data.likes as string[]) || [],
    imageCaptions: (data.imageCaptions as string[]) || [],
    comments: ((data.comments as Record<string, unknown>[]) || []).map((c) => ({
      id: (c.id as string) || '',
      userId: (c.userId as string) || '',
      content: (c.content as string) || '',
      timestamp: (c.timestamp as TimestampType)?.toDate?.() || new Date(),
      likes: (c.likes as string[]) || [],
    })),
    timestamp: (data.timestamp as TimestampType)?.toDate?.() || new Date(),
    visibility: typeof data.visibility === 'string' && ['public', 'friends', 'private'].includes(data.visibility)
      ? data.visibility as TimelinePost['visibility']
      : 'public',
  };
}

const TimelinePage = () => {
  const { usersMap } = useUsersMap();
  const { friends, savedPosts, blockedUsers } = useFriends();
  const currentUserId = auth.currentUser?.uid;
  const displayName = usersMap[currentUserId || '']?.name || auth.currentUser?.displayName || 'You';
  const avatar = usersMap[currentUserId || '']?.avatar || auth.currentUser?.photoURL || getDefaultAvatar(currentUserId || 'unknown');

  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);

  // Pagination
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot<FirestoreData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filtering
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const postsContainerRef = useRef<HTMLDivElement>(null);

  // Real-time listener for the first page
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(20));

    const unsub = onSnapshot(q, (snap) => {
      const querySnapshot = snap as QuerySnapshot<FirestoreData>;
      const newPosts = querySnapshot.docs.map((d) => docToPost(d.id, d.data() as Record<string, unknown>));
      setPosts(newPosts);
      setLastVisibleDoc((querySnapshot.docs[querySnapshot.docs.length - 1] as DocumentSnapshot<FirestoreData>) ?? null);
      setHasMore(querySnapshot.docs.length === 20);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const fetchMorePosts = useCallback(async () => {
    if (!lastVisibleDoc || loadingMore || !hasMore) return;

    setLoadingMore(true);
    const pageSize = 20;
    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('timestamp', 'desc'),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );

      const snap = await getDocs(q) as QuerySnapshot<FirestoreData>;
      const nextPosts = snap.docs.map((d) => docToPost(d.id, d.data() as Record<string, unknown>));

      setPosts(prev => [...prev, ...nextPosts]);
      setLastVisibleDoc((snap.docs[snap.docs.length - 1] as DocumentSnapshot<FirestoreData>) ?? null);
      setHasMore(snap.docs.length === pageSize);
    } catch (err) {
      console.warn('Failed to load more posts', err);
    } finally {
      setLoadingMore(false);
    }
  }, [lastVisibleDoc, loadingMore, hasMore]);

  const handleScroll = useCallback(() => {
    const container = postsContainerRef.current;
    if (!container || loading || loadingMore || !hasMore) return;
    if (container.scrollHeight - container.scrollTop - container.clientHeight < 160) {
      fetchMorePosts();
    }
  }, [fetchMorePosts, hasMore, loading, loadingMore]);

  const handleCreatePost = async (content: string, images: string[], visibility: string, imageCaptions?: string[]) => {
    if (!currentUserId) return;
    const postData = {
      userId: currentUserId,
      content,
      images,
      imageCaptions: imageCaptions || [],
      visibility,
      likes: [],
      comments: [],
      timestamp: serverTimestamp(),
    };

    try {
      const ref = await addDoc(collection(db, 'posts'), postData);
      const normalizedVisibility = ['public', 'friends', 'private'].includes(visibility)
        ? visibility as TimelinePost['visibility']
        : 'public';
      const newPost: TimelinePost = {
        id: ref.id,
        userId: currentUserId,
        content,
        images,
        imageCaptions: imageCaptions || [],
        visibility: normalizedVisibility,
        likes: [],
        comments: [],
        timestamp: new Date(),
      };
      setPosts((prev) => [newPost, ...prev]);
      toast.success('Post created successfully!');
    } catch (err) {
      console.error('Failed to create post', sanitizeForLog(err instanceof Error ? err.message : String(err)));
      throw err;
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUserId) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const isLiked = post.likes.includes(currentUserId);
    const previousLikes = post.likes;

    // Optimistic
    setPosts((prev) =>
      prev.map((p) =>
        p.id !== postId
          ? p
          : {
            ...p,
            likes: isLiked
              ? p.likes.filter((id) => id !== currentUserId)
              : [...p.likes, currentUserId],
          }
      )
    );

    try {
      await updateDoc(doc(db, 'posts', postId), {
        likes: isLiked ? arrayRemove(currentUserId) : arrayUnion(currentUserId),
      });
    } catch {
      setPosts((prev) => prev.map((p) => (p.id !== postId ? p : { ...p, likes: previousLikes })));
      toast.error('Could not update like.');
    }
  };

  const handleComment = async (postId: string, content: string) => {
    if (!currentUserId) return;
    const newComment = {
      id: `c_${Date.now()}`,
      userId: currentUserId,
      content,
      timestamp: new Date(),
      likes: [],
    };

    setPosts((prev) =>
      prev.map((p) =>
        p.id !== postId ? p : { ...p, comments: [...p.comments, newComment] }
      )
    );

    try {
      await updateDoc(doc(db, 'posts', postId), {
        comments: arrayUnion({
          ...newComment,
          timestamp: serverTimestamp(),
        }),
      });
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id !== postId
            ? p
            : { ...p, comments: p.comments.filter((c) => c.id !== newComment.id) }
        )
      );
      toast.error('Could not post comment.');
    }
  };

  const handleSavePost = async (postId: string, save: boolean) => {
    if (!currentUserId) return;
    try {
      await updateDoc(doc(db, 'users', currentUserId), {
        savedPosts: save ? arrayUnion(postId) : arrayRemove(postId),
      });
      toast.success(save ? 'Saved to bookmarks' : 'Removed from saved posts');
    } catch {
      toast.error('Could not update saved posts.');
    }
  };

  const handleUpdatePost = (postId: string, content: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, content } : p));
  };

  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // Basic visibility and block filtering
      if (blockedUsers.includes(post.userId)) return false;

      const isOwner = post.userId === currentUserId;
      if (post.visibility === 'private' && !isOwner) return false;
      if (post.visibility === 'friends' && !isOwner && !friends.includes(post.userId)) return false;

      // Filter tabs
      if (activeFilter === 'mine' && post.userId !== currentUserId) return false;
      if (activeFilter === 'saved' && !savedPosts.includes(post.id)) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const userName = usersMap[post.userId]?.name.toLowerCase() || '';
        return post.content.toLowerCase().includes(q) || userName.includes(q);
      }
      return true;
    });
  }, [posts, activeFilter, searchQuery, currentUserId, usersMap, blockedUsers, friends, savedPosts]);

  return (
    <div className="flex flex-col h-full bg-[var(--gchat-bg)]">
      <TimelineHeader onNewPost={() => setShowNewPost(true)} />

      <PostFilter
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
      />

      <div
        ref={postsContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pb-20 scrollbar-hide px-5"
      >
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[var(--gchat-bg-soft)] rounded-2xl p-4 space-y-4 border border-white/5">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full bg-white/10" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 bg-white/10" />
                    <Skeleton className="h-3 w-16 bg-white/10" />
                  </div>
                </div>
                <Skeleton className="h-32 w-full rounded-xl bg-white/10" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-12 bg-white/10" />
                  <Skeleton className="h-4 w-12 bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-10">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Plus size={32} className="text-white/10" />
            </div>
            <p className="text-white font-bold mb-1">No posts yet</p>
            <p className="text-white/40 text-sm">Be the first to share something with the community!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPosts.map((post) => (
              <TimelinePostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onComment={handleComment}
                onSave={handleSavePost}
                onUpdate={handleUpdatePost}
                onDelete={handleDeletePost}
                saved={savedPosts.includes(post.id)}
              />
            ))}

            {loadingMore && (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-[#00FF7F] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center py-10">
                <p className="text-white/20 text-xs font-bold uppercase tracking-widest">You've reached the end</p>
              </div>
            )}
          </div>
        )}
      </div>

      <CreatePostModal
        isOpen={showNewPost}
        onClose={() => setShowNewPost(false)}
        onSubmit={handleCreatePost}
        userAvatar={avatar}
        userName={displayName}
        userId={currentUserId || ''}
      />
    </div>
  );
};

export default TimelinePage;
