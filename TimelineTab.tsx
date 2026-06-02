import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Share2, Bookmark, Send, Globe, Users2, Lock, Plus, Image, X } from 'lucide-react'
import { formatTime, getDefaultAvatar, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useUsersMap } from '@/hooks/useUsers'
import {
  auth, db, collection, query, orderBy, limit, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, arrayUnion, arrayRemove,
} from '@/lib/firebase'
import type { QuerySnapshot, FirestoreData, TimestampType } from '@/lib/firebase'
import type { TimelinePost } from '@/types'

const visibilityIcon = { public: <Globe size={10} />, friends: <Users2 size={10} />, private: <Lock size={10} /> }
const visibilityLabel = { public: 'Public', friends: 'Friends', private: 'Only me' }

export default function TimelineTab() {
  const { usersMap } = useUsersMap()
  const currentId = auth.currentUser?.uid || ''
  const currentAvatar = auth.currentUser?.photoURL || getDefaultAvatar(currentId)
  const currentName = auth.currentUser?.displayName || 'You'

  const [posts, setPosts] = useState<TimelinePost[]>([])
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostVisibility, setNewPostVisibility] = useState<'public' | 'friends' | 'private'>('public')
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine'>('all')

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(50))
    const unsub = onSnapshot(q, snap => {
      const qs = snap as QuerySnapshot<FirestoreData>
      setPosts(qs.docs.map(d => {
        const data = d.data() as Record<string, unknown>
        return {
          id: d.id,
          userId: (data.userId as string) || '',
          content: (data.content as string) || '',
          images: (data.images as string[]) || [],
          likes: (data.likes as string[]) || [],
          comments: ((data.comments as Record<string, unknown>[]) || []).map(c => ({
            id: (c.id as string) || '',
            userId: (c.userId as string) || '',
            content: (c.content as string) || '',
            timestamp: (c.timestamp as TimestampType)?.toDate?.() || new Date(),
            likes: (c.likes as string[]) || [],
          })),
          timestamp: (data.timestamp as TimestampType)?.toDate?.() || new Date(),
          visibility: (['public', 'friends', 'private'].includes(data.visibility as string)
            ? data.visibility as TimelinePost['visibility']
            : 'public'),
        }
      }))
    })
    return unsub
  }, [])

  const handleLike = async (postId: string) => {
    if (!currentId) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    const isLiked = post.likes.includes(currentId)
    setPosts(prev => prev.map(p => p.id !== postId ? p : {
      ...p, likes: isLiked ? p.likes.filter(id => id !== currentId) : [...p.likes, currentId],
    }))
    await updateDoc(doc(db, 'posts', postId), {
      likes: isLiked ? arrayRemove(currentId) : arrayUnion(currentId),
    }).catch(() => {})
  }

  const handleComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim()
    if (!content || !currentId) return
    const comment = { id: `c_${Date.now()}`, userId: currentId, content, timestamp: new Date(), likes: [] }
    setPosts(prev => prev.map(p => p.id !== postId ? p : { ...p, comments: [...p.comments, comment] }))
    setCommentInputs(prev => ({ ...prev, [postId]: '' }))
    await updateDoc(doc(db, 'posts', postId), {
      comments: arrayUnion({ ...comment, timestamp: serverTimestamp() }),
    }).catch(() => {})
  }

  const handleSave = async (postId: string) => {
    if (!currentId) return
    await updateDoc(doc(db, 'users', currentId), { savedPosts: arrayUnion(postId) }).catch(() => {})
    toast.success('Saved!')
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !currentId) return
    await addDoc(collection(db, 'posts'), {
      userId: currentId,
      content: newPostContent.trim(),
      images: [],
      visibility: newPostVisibility,
      likes: [],
      comments: [],
      timestamp: serverTimestamp(),
    })
    setNewPostContent('')
    setShowNewPost(false)
    toast.success('Post created!')
  }

  const filteredPosts = activeFilter === 'mine' ? posts.filter(p => p.userId === currentId) : posts

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="px-5 pt-12 pb-3 flex items-center justify-between bg-black/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img src="/assets/gaga-logo.jpg" alt="GagaChat" className="w-8 h-8 rounded-full gchat-logo-glow" />
          <h1 className="text-white text-xl font-bold">Timeline</h1>
        </div>
        <button onClick={() => setShowNewPost(true)} className="p-2 text-white/60 hover:text-[#00FF7F] transition-colors bg-white/5 rounded-full">
          <Plus size={22} />
        </button>
      </div>

      <div className="flex px-5 gap-2 mb-2">
        {(['all', 'mine'] as const).map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all', activeFilter === f ? 'bg-[#00FF7F] text-black' : 'bg-white/5 text-white/40 hover:bg-white/10')}>
            {f === 'all' ? 'All Posts' : 'My Posts'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-10">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Plus size={32} className="text-white/10" />
            </div>
            <p className="text-white font-bold mb-1">No posts yet</p>
            <p className="text-white/40 text-sm">Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-4 pb-6">
            {filteredPosts.map(post => {
              const author = usersMap[post.userId]
              const isLiked = post.likes.includes(currentId)
              const showCommentSection = showComments[post.id]
              return (
                <div key={post.id} className="bg-[#111] border border-white/5">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <img src={author?.avatar || getDefaultAvatar(post.userId)} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1">
                      <p className="font-semibold text-[14px] text-white">{author?.name || 'Unknown'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-white/40">{formatTime(post.timestamp)}</span>
                        <span className="text-white/20">·</span>
                        <span className="flex items-center gap-1 text-[11px] text-white/30">{visibilityIcon[post.visibility]} {visibilityLabel[post.visibility]}</span>
                      </div>
                    </div>
                  </div>

                  {post.content && (
                    <div className="px-4 pb-3">
                      <p className="text-[14px] text-white/90 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    </div>
                  )}

                  {post.images.length > 0 && (
                    <div className="px-4 pb-3">
                      <div className={cn(post.images.length > 1 ? 'grid grid-cols-2 gap-1' : '')}>
                        {post.images.map((img, i) => (
                          <img key={i} src={img} alt="" className={cn('w-full object-cover rounded-xl', post.images.length === 1 ? 'max-h-96' : 'h-48')} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-4 py-2 border-t border-white/5">
                    <span className="text-xs text-white/30">{post.likes.length > 0 ? `${post.likes.length} likes` : ''}</span>
                    <button onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))} className="text-xs text-white/30 hover:text-white/60 transition-colors">
                      {post.comments.length > 0 ? `${post.comments.length} comments` : ''}
                    </button>
                  </div>

                  <div className="flex items-center border-t border-white/10">
                    <button onClick={() => handleLike(post.id)} className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-all', isLiked ? 'text-red-400' : 'text-white/40 hover:text-red-400')}>
                      <Heart size={17} fill={isLiked ? 'currentColor' : 'none'} /> Like
                    </button>
                    <button onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))} className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-white/40 hover:text-blue-400 transition-colors">
                      <MessageCircle size={17} /> Comment
                    </button>
                    <button onClick={() => handleSave(post.id)} className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-white/40 hover:text-[#00FF7F] transition-colors">
                      <Bookmark size={17} /> Save
                    </button>
                    <button onClick={() => navigator.clipboard?.writeText(post.content).then(() => toast.success('Copied!'))} className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-white/40 hover:text-[#00FF00] transition-colors">
                      <Share2 size={17} /> Share
                    </button>
                  </div>

                  {showCommentSection && (
                    <div className="border-t border-white/10 animate-fade-in">
                      {post.comments.map(comment => {
                        const commentAuthor = usersMap[comment.userId]
                        return (
                          <div key={comment.id} className="flex gap-3 px-4 py-2.5">
                            <img src={commentAuthor?.avatar || getDefaultAvatar(comment.userId)} alt="" className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5" />
                            <div className="flex-1 bg-white/5 rounded-xl px-3 py-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[12px] font-semibold text-white/80">{commentAuthor?.name || 'Someone'}</p>
                                <p className="text-[10px] text-white/30">{formatTime(comment.timestamp)}</p>
                              </div>
                              <p className="text-[13px] text-white/70 mt-0.5">{comment.content}</p>
                            </div>
                          </div>
                        )
                      })}
                      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5">
                        <img src={currentAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                        <div className="flex-1 flex items-center bg-white/10 rounded-full px-3 py-2 gap-2 border border-white/10">
                          <input
                            value={commentInputs[post.id] || ''}
                            onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                            placeholder="Write a comment..."
                            className="flex-1 bg-transparent text-[13px] outline-none text-white placeholder-white/30"
                          />
                          <button onClick={() => handleComment(post.id)} disabled={!commentInputs[post.id]?.trim()} className="text-[#00FF00] disabled:text-white/20 transition-colors">
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNewPost && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end animate-fade-in">
          <div className="bg-[#1a1a1a] border-t border-white/10 rounded-t-3xl w-full animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">New Post</h2>
              <button onClick={() => setShowNewPost(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <img src={currentAvatar} alt="" className="w-10 h-10 rounded-full" />
                <div>
                  <p className="text-white font-medium text-sm">{currentName}</p>
                  <div className="flex gap-1 mt-1">
                    {(['public', 'friends', 'private'] as const).map(v => (
                      <button key={v} onClick={() => setNewPostVisibility(v)} className={cn('text-[10px] px-2 py-0.5 rounded-full transition-colors', newPostVisibility === v ? 'bg-[#00FF7F] text-black' : 'bg-white/10 text-white/40')}>
                        {visibilityLabel[v]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <textarea
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full bg-transparent text-white text-base outline-none resize-none min-h-[120px] placeholder-white/20"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <button className="p-2 text-white/30 hover:text-[#00FF7F] transition-colors">
                  <Image size={22} />
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim()}
                  className="gchat-btn px-6 py-2.5 rounded-full text-sm font-bold disabled:opacity-40"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
