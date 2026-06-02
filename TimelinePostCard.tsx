import React, { useEffect, useState, useCallback } from 'react';

import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Send, Globe, Users2, Lock, Trash2, Edit2, Check, X as XIcon, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { cn, formatTime, getDefaultAvatar, sanitizeMediaUrl } from '@/lib/utils';
import type { TimelinePost } from '@/types';
import { toast } from 'sonner';
import { auth, db, doc, deleteDoc, updateDoc, serverTimestamp } from '@/lib/firebase';
import { useUsersMap } from '@/hooks/useUsers';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface TimelinePostCardProps {
  post: TimelinePost;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onShare?: (post: TimelinePost) => void;
  onDelete?: (postId: string) => void;
  onUpdate?: (postId: string, content: string) => void;
  saved?: boolean;
  onSave?: (postId: string, save: boolean) => void;
}

const visibilityIcon = { public: <Globe size={10} />, friends: <Users2 size={10} />, private: <Lock size={10} /> };
const visibilityLabel = { public: 'Public', friends: 'Friends', private: 'Only me' };

const TimelinePostCard = (props: TimelinePostCardProps) => {

  const { post, onLike, onComment, onShare, onDelete, onUpdate, saved, onSave } = props;
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [showAllImages, setShowAllImages] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!showMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMenu(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showMenu]);

  const { usersMap } = useUsersMap();
  const author = usersMap[post.userId];
  const currentUserId = auth.currentUser?.uid;
  const isLiked = currentUserId ? post.likes.includes(currentUserId) : false;
  const isOwn = post.userId === currentUserId;

  const handleUpdate = async () => {
    if (!editContent.trim() || editContent === post.content) {
      setIsEditing(false);
      return;
    }
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        content: editContent.trim(),
        updatedAt: serverTimestamp(),
      });
      onUpdate?.(post.id, editContent.trim());
      setIsEditing(false);
      toast.success('Post updated');
    } catch {
      toast.error('Failed to update post');
    }
  };

  const handleLike = () => {
    onLike(post.id);
    if (!isLiked) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 600);
    }
  };

  const handleComment = () => {
    if (!commentInput.trim()) return;
    onComment(post.id, commentInput.trim());
    setCommentInput('');
  };

  const handleShare = () => {
    const text = `${post.content} — shared from GaGa Chat`;
    if (navigator.share) {
      navigator.share({ title: 'GaGa Chat Post', text, url: window.location.href }).catch(() => { });
    } else {
      navigator.clipboard?.writeText(text).then(() => toast.success('Copied to clipboard!'));
    }
    onShare?.(post);
  };

  const handleNextMedia = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedMediaIndex === null || !post.images) return;
    setSelectedMediaIndex((selectedMediaIndex + 1) % post.images.length);
  }, [selectedMediaIndex, post.images]);

  const handlePrevMedia = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedMediaIndex === null || !post.images) return;
    setSelectedMediaIndex((selectedMediaIndex - 1 + post.images.length) % post.images.length);
  }, [selectedMediaIndex, post.images]);

  const handleDownload = async (url: string) => {
    const safeUrl = sanitizeMediaUrl(url);
    if (!safeUrl) { toast.error('Invalid media URL'); return; }
    try {
      const response = await fetch(safeUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `gaga-media-${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Failed to download media');
    }

  };

  return (
    <div className="bg-[var(--gchat-bg-soft)] border-b border-white/10">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="story-ring">
          <img src={sanitizeMediaUrl(author?.avatar) || getDefaultAvatar(post.userId)} alt={author?.name || 'Anonymous'} className="w-10 h-10 rounded-full object-cover border-2 border-black" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[14px] text-white">{author?.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[11px] text-white/40">{formatTime(post.timestamp)}</p>
            <span className="text-white/20">·</span>
            <span className="flex items-center gap-1 text-[11px] text-white/30">
              {visibilityIcon[post.visibility]} {visibilityLabel[post.visibility]}
            </span>
          </div>
        </div>
        <div className="relative flex items-center gap-1">
          {onSave && (
            <button
              onClick={() => onSave(post.id, !saved)}
              className={cn('p-2 rounded-full transition-colors', saved ? 'bg-white/10 text-[#00FF7F]' : 'text-white/30 hover:bg-white/10 hover:text-white')}
              aria-label={saved ? 'Unsave post' : 'Save post'}
            >
              <Bookmark size={18} />
            </button>
          )}
          <button
            className="p-1 text-white/30 hover:text-white/60 transition-colors"
            onClick={() => setShowMenu((m) => !m)}
          >
            <MoreHorizontal size={20} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 bg-[var(--gchat-bg-soft)] border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[140px] animate-scale-in backdrop-blur-md bg-opacity-95">
                <button
                  onClick={() => { navigator.clipboard?.writeText(post.content); toast.success('Copied!'); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  Copy text
                </button>
                {isOwn && (
                  <>
                    <button
                      onClick={() => { setIsEditing(true); setShowMenu(false); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors border-t border-white/10"
                    >
                      <Edit2 size={14} /> Edit post
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, 'posts', post.id));
                          onDelete?.(post.id);
                          toast.success('Post deleted');
                        } catch {
                          toast.error('Could not delete post.');
                        }
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/10"
                    >
                      <Trash2 size={14} /> Delete post
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {isEditing ? (
          <div className="flex flex-col gap-2 bg-white/5 rounded-xl p-3 border border-[#00FF7F]/30">
            <textarea
              autoFocus
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full bg-transparent text-[14px] text-white/90 leading-relaxed outline-none resize-none min-h-[80px]"
              placeholder="What's on your mind?"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setIsEditing(false); setEditContent(post.content); }}
                className="p-1.5 text-white/40 hover:text-white transition-colors"
              >
                <XIcon size={18} />
              </button>
              <button
                onClick={handleUpdate}
                disabled={!editContent.trim() || editContent === post.content}
                className="p-1.5 text-[#00FF7F] hover:bg-[#00FF7F]/10 rounded-lg transition-colors disabled:opacity-30"
              >
                <Check size={18} />
              </button>
            </div>
          </div>
        ) : (
          post.content && (
            <p className="text-[14px] text-white/90 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          )
        )}
      </div>

      {/* Images & Videos */}
      {post.images && post.images.length > 0 && (
        <div className={cn('px-4 pb-3', post.images.length > 1 ? 'grid grid-cols-2 gap-1' : '')}>
          {post.images.slice(0, showAllImages ? post.images.length : 2).map((media, i) => {
            const isVideo = /\.(mp4|webm|mov|avi)(\?|$)/i.test(media) || media.includes('video%2F') || media.includes('/video/');
            return (
              <div key={i} className="overflow-hidden rounded-xl bg-white/5 border border-white/5">
                {isVideo ? (
                  <video
                    src={sanitizeMediaUrl(media)}
                    controls
                    className="w-full max-h-96 object-cover rounded-xl"
                    poster={post.images![0] === media ? undefined : sanitizeMediaUrl(post.images![0])}
                  />
                ) : (
                  <img
                    src={sanitizeMediaUrl(media)}
                    alt=""
                    onClick={() => setSelectedMediaIndex(i)}
                    className={cn(
                      'w-full object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity',
                      post.images!.length === 1 ? 'max-h-96' : 'h-48'
                    )}
                  />
                )}
                {post.imageCaptions && post.imageCaptions[i] && (
                  <div className="mt-2 px-2 pb-2 text-[12px] text-white/70">
                    {post.imageCaptions[i]}
                  </div>
                )}
              </div>
            );
          })}
          {!showAllImages && post.images.length > 2 && (
            <div className="relative h-48 rounded-xl overflow-hidden cursor-pointer bg-white/5" onClick={() => setShowAllImages(true)}>
              <img src={sanitizeMediaUrl(post.images[2])} alt="" className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xl font-bold">+{post.images.length - 2}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/5">
        <div className="flex items-center gap-1 text-xs text-white/30">
          {post.likes.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">♥</span>
              {post.likes.length}
            </span>
          )}
        </div>
        <button onClick={() => setShowComments(!showComments)} className="text-xs text-white/30 hover:text-white/60 transition-colors">
          {post.comments.length > 0 ? `${post.comments.length} comments` : 'Comment'}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center border-t border-white/10">
        <button
          onClick={handleLike}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3.5 text-[13px] font-medium transition-all',
            isLiked ? 'text-red-400' : 'text-white/40 hover:text-red-400'
          )}
        >
          <Heart
            size={17}
            fill={isLiked ? 'currentColor' : 'none'}
            className={cn('transition-transform', likeAnim && 'scale-150')}
          />
          Like
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-white/40 hover:text-blue-400 transition-colors"
        >
          <MessageCircle size={17} />
          Comment
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-white/40 hover:text-[#00FF00] transition-colors"
        >
          <Share2 size={17} />
          Share
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-white/10 animate-fade-in">
          {post.comments.map(comment => {
            const commentAuthor = usersMap[comment.userId];
            return (
              <div key={comment.id} className="flex gap-3 px-4 py-2.5">
                <img src={sanitizeMediaUrl(commentAuthor?.avatar) || getDefaultAvatar(comment.userId)} alt="" className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5" />
                <div className="flex-1 bg-white/8 rounded-xl px-3 py-2 border border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-white/80">{commentAuthor?.name || 'Someone'}</p>
                    <p className="text-[10px] text-white/30">{formatTime(comment.timestamp)}</p>
                  </div>
                  <p className="text-[13px] text-white/70 mt-0.5">{comment.content}</p>
                </div>
              </div>
            );
          })}

          {/* Add Comment */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5">
            <img src={sanitizeMediaUrl(auth.currentUser?.photoURL) || getDefaultAvatar(currentUserId ?? 'unknown')} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 flex items-center bg-white/10 rounded-full px-3 py-2 gap-2 border border-white/10">
              <input
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleComment()}
                placeholder="Write a comment..."
                className="flex-1 bg-transparent text-[13px] outline-none text-white placeholder-white/30"
              />
              <button onClick={handleComment} disabled={!commentInput.trim()} className="text-[#00FF00] disabled:text-white/20 transition-colors">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Preview Modal */}
      <Dialog open={selectedMediaIndex !== null} onOpenChange={(open) => !open && setSelectedMediaIndex(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none outline-none overflow-hidden flex items-center justify-center">
          {selectedMediaIndex !== null && post.images && (
            <div className="relative w-full h-full flex items-center justify-center group/modal">
              {/* Media Container */}
              <div className="relative max-w-full max-h-[85vh] flex items-center justify-center">
                {post.images[selectedMediaIndex].match(/\.(mp4|webm|mov|avi)(\?|$)/i) || post.images[selectedMediaIndex].includes('video%2F') ? (
                  <video
                    src={sanitizeMediaUrl(post.images[selectedMediaIndex])}
                    controls
                    autoPlay
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <img
                    src={sanitizeMediaUrl(post.images[selectedMediaIndex])}
                    alt=""
                    className="max-w-full max-h-full object-contain select-none"
                  />
                )}

                {/* Caption Overlay */}
                {post.imageCaptions && post.imageCaptions[selectedMediaIndex] && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-4 text-center">
                    <p className="text-white text-sm font-medium">{post.imageCaptions[selectedMediaIndex]}</p>
                  </div>
                )}
              </div>

              {/* Navigation Controls */}
              {post.images.length > 1 && (
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
                  onClick={() => handleDownload(post.images![selectedMediaIndex!])}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-sm"
                  title="Download"
                >
                  <Download size={20} />
                </button>
              </div>

              {/* Media Indicator */}
              {post.images.length > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full">
                  <span className="text-white text-xs font-bold">
                    {selectedMediaIndex + 1} / {post.images.length}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default React.memo(TimelinePostCard);

