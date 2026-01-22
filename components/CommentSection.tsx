import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { SharedComment, User } from '../types';
import { 
  Trash2, MoreVertical, Flag, ChevronDown, ChevronUp, Loader2, MessageSquare,
  ThumbsUp, ThumbsDown
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import Tooltip from './Tooltip';

interface SharedCommentSectionProps {
  targetType: 'video' | 'community';
  targetId: string;
  currentUser: User | null;
  contentOwnerId?: string; // Optional: To allow owner to delete any comment
}

const COMMENTS_PER_PAGE = 5;

const SharedCommentSection: React.FC<SharedCommentSectionProps> = ({ targetType, targetId, currentUser, contentOwnerId }) => {
  const { addToast } = useToast();
  const [comments, setComments] = useState<SharedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [userProfile, setUserProfile] = useState<{username: string, avatar_url: string | null} | null>(null);
  const [visibleCount, setVisibleCount] = useState(COMMENTS_PER_PAGE);

  // Fetch Current User Profile once
  useEffect(() => {
    if (currentUser) {
      supabase.from('profiles').select('username, avatar_url').eq('id', currentUser.id).single()
        .then(({ data }) => data && setUserProfile(data));
    }
  }, [currentUser]);

  // Fetch Comments using RPC
  const fetchComments = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_unified_comments', {
        p_target_type: targetType,
        p_target_id: targetId,
        p_current_user_id: currentUser?.id || null
      });

      if (error) throw error;
      if (data) setComments(data);
    } catch (err) {
      console.error("Comments fetch error:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [targetType, targetId, currentUser]);

  useEffect(() => {
    fetchComments(true);
  }, [fetchComments]);

  // Post Comment Logic - UPDATED TO USE NOTIFICATION RPC
  const handlePostComment = async (e: React.FormEvent, parentId: string | null = null, textValue: string, resetFn: () => void) => {
    e.preventDefault();
    const content = textValue.trim();
    if (!currentUser || !content) return;

    // Optimistic Insert
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: SharedComment = {
      id: tempId,
      parent_id: parentId,
      content,
      created_at: new Date().toISOString(),
      like_count: 0,
      dislike_count: 0,
      is_pinned: false,
      user_id: currentUser.id,
      username: userProfile?.username || 'You',
      avatar_url: userProfile?.avatar_url || null,
      user_reaction: null,
      target_type: targetType,
      target_id: targetId
    };

    setComments(prev => [optimisticComment, ...prev]);
    resetFn();

    try {
      // USE RPC TO HANDLE NOTIFICATION GENERATION ATOMICALLY
      const { data, error } = await supabase.rpc('post_unified_comment_with_notify', {
        p_user_id: currentUser.id,
        p_target_type: targetType,
        p_target_id: targetId,
        p_content: content,
        p_parent_id: parentId
      });

      if (error) throw error;

      // Replace optimistic comment with real one
      if (data) {
        setComments(prev => prev.map(c => c.id === tempId ? { ...optimisticComment, id: data.id } : c));
      }
    } catch (err: any) {
      console.error("Post error:", err);
      setComments(prev => prev.filter(c => c.id !== tempId));
      addToast({ type: 'error', message: err.message || 'Failed to post comment.' });
    }
  };

  // Reaction Logic (Shared for Like/Dislike)
  const handleReaction = async (commentId: string, reaction: 'like' | 'dislike') => {
    if (!currentUser) {
      addToast({ type: 'info', title: 'Sign In', message: `Sign in to ${reaction} this comment` });
      return;
    }

    const target = comments.find(c => c.id === commentId);
    if (!target) return;

    const previousReaction = target.user_reaction;
    const isRemoving = previousReaction === reaction;
    const newReaction = isRemoving ? null : reaction;

    // Optimistic Update
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        let likes = c.like_count;
        let dislikes = c.dislike_count;

        if (isRemoving) {
          if (reaction === 'like') likes--;
          else dislikes--;
        } else {
          if (reaction === 'like') {
            likes++;
            if (previousReaction === 'dislike') dislikes--;
          } else {
            dislikes++;
            if (previousReaction === 'like') likes--;
          }
        }
        return { ...c, user_reaction: newReaction, like_count: likes, dislike_count: dislikes };
      }
      return c;
    }));

    try {
      if (isRemoving) {
        await supabase.from('unified_comment_reactions').delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUser.id);
      } else {
        await supabase.from('unified_comment_reactions').upsert({
          comment_id: commentId,
          user_id: currentUser.id,
          reaction_type: newReaction
        }, { onConflict: 'comment_id, user_id' });
      }
    } catch (err) {
      console.error(err);
      fetchComments(false); // Revert on error
    }
  };

  // Build Tree Structure
  const buildTree = (flatComments: SharedComment[]) => {
    const map = new Map<string, SharedComment>();
    const roots: SharedComment[] = [];
    
    // Deep clone to avoid mutation issues
    const list = flatComments.map(c => ({ ...c, replies: [] }));
    
    list.forEach(c => map.set(c.id, c));
    
    list.forEach(c => {
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.replies!.push(c);
      } else {
        roots.push(c);
      }
    });
    
    // Sort roots: Pinned first, then newest
    return roots.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const visibleRoots = buildTree(comments).slice(0, visibleCount);

  if (loading) return <div className="py-20 text-center"><Loader2 className="w-8 h-8 text-brand animate-spin mx-auto" /></div>;

  return (
    <div className="w-full py-10 space-y-10 font-comfortaa">
      <div className="flex items-center gap-3">
        <MessageSquare className="text-brand w-5 h-5" />
        <h3 className="text-xl font-black text-white uppercase tracking-tight">
          {comments.length} <span className="text-zinc-500">Comments</span>
        </h3>
      </div>

      {currentUser ? (
        <form onSubmit={(e) => handlePostComment(e, null, newCommentText, () => setNewCommentText(''))} className="flex gap-5 bg-white/5 border border-white/5 p-6 shadow-xl">
          <div className="w-12 h-12 shrink-0 bg-zinc-900 overflow-hidden border border-white/10 shadow-inner">
            <img src={userProfile?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser.id}`} className="w-full h-full object-cover" alt="" />
          </div>
          <div className="flex-1 space-y-4">
            <textarea 
              value={newCommentText} 
              onChange={(e) => setNewCommentText(e.target.value)} 
              placeholder="Add a comment..." 
              className="w-full bg-transparent border-b border-white/10 py-3 text-sm text-zinc-200 focus:outline-none focus:border-brand resize-none min-h-[50px] transition-all font-comfortaa" 
            />
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={!newCommentText.trim()} 
                className="bg-brand text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-20 shadow-lg shadow-brand/10 transition-all active:scale-95"
              >
                Post Comment
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-10 bg-white/5 border border-dashed border-white/10 text-center">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-loose">Sign in to participate</p>
        </div>
      )}

      <div className="space-y-4">
        {visibleRoots.map(comment => (
          <CommentItem 
            key={comment.id} 
            comment={comment} 
            currentUser={currentUser} 
            contentOwnerId={contentOwnerId}
            depth={0} 
            onRefresh={() => fetchComments(false)} 
            onReaction={handleReaction} 
            onPostReply={handlePostComment} 
            setComments={setComments}
          />
        ))}

        {comments.filter(c => !c.parent_id).length > visibleCount && (
          <div className="pt-6 flex justify-center">
            <button 
              onClick={() => setVisibleCount(prev => prev + COMMENTS_PER_PAGE)}
              className="px-10 py-4 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Show More Comments
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- SINGLE COMMENT COMPONENT ---

interface CommentItemProps {
  comment: SharedComment;
  currentUser: User | null;
  contentOwnerId?: string;
  depth: number;
  onRefresh: () => void;
  onReaction: (id: string, reaction: 'like' | 'dislike') => void;
  onPostReply: (e: React.FormEvent, parentId: string, text: string, reset: () => void) => void;
  setComments: React.Dispatch<React.SetStateAction<SharedComment[]>>;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, currentUser, contentOwnerId, depth, onRefresh, onReaction, onPostReply, setComments }) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const isAuthor = currentUser?.id === comment.user_id;
  const isContentOwner = currentUser?.id === contentOwnerId;
  const canDelete = isAuthor || isContentOwner;

  const handleDelete = async () => {
    if (!(await confirm({
      title: 'Delete Comment?',
      description: 'This cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    }))) return;

    try {
      await supabase.from('unified_comments').delete().eq('id', comment.id);
      setComments(prev => prev.filter(c => c.id !== comment.id)); // Optimistic remove
      addToast({ type: 'success', message: 'Comment deleted.' });
    } catch (err) {
      console.error(err);
      onRefresh(); // Sync if failed
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr), now = new Date(), diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return d.toLocaleDateString();
  };

  return (
    <div className={`group/item transition-all ${depth > 0 ? 'ml-6 md:ml-12 border-l border-white/5 pl-6' : 'bg-white/[0.02] border border-white/5 p-6 md:p-8'}`}>
      <div className="flex gap-4 md:gap-6 relative">
        <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-zinc-900 border border-white/10 overflow-hidden shadow-lg">
          <img src={comment.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${comment.user_id}`} className="w-full h-full object-cover" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-black uppercase tracking-tight ${comment.user_id === contentOwnerId ? 'text-brand' : 'text-white'}`}>
                @{comment.username?.replace('@','')}
              </span>
              <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{formatTime(comment.created_at)}</span>
              {comment.is_pinned && <span className="text-[8px] bg-white/10 text-white px-2 py-0.5 font-bold uppercase">Pinned</span>}
            </div>

            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 text-zinc-600 hover:text-white transition-colors opacity-0 group-hover/item:opacity-100">
                <MoreVertical size={16} />
              </button>
              {showMenu && (
                <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-40 bg-[#111] border border-white/10 shadow-2xl z-20 flex flex-col py-1">
                  {canDelete && (
                    <button onClick={handleDelete} className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-zinc-400 hover:text-rose-500 hover:bg-white/5 transition-all text-left">
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                  <button onClick={() => { addToast({ type: 'info', message: 'Reported' }); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-left">
                    <Flag size={14} /> Report
                  </button>
                </div>
                </>
              )}
            </div>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap font-light">
            {comment.content}
          </p>

          <div className="mt-5 flex items-center gap-8">
            <div className="flex items-center gap-4">
              <Tooltip content="Like">
                <button 
                  onClick={() => onReaction(comment.id, 'like')}
                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase transition-colors ${comment.user_reaction === 'like' ? 'text-brand' : 'text-zinc-600 hover:text-white'}`}
                >
                  <ThumbsUp size={14} className={comment.user_reaction === 'like' ? 'fill-brand' : ''} /> {comment.like_count || 0}
                </button>
              </Tooltip>
              <Tooltip content="Dislike">
                <button 
                  onClick={() => onReaction(comment.id, 'dislike')}
                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase transition-colors ${comment.user_reaction === 'dislike' ? 'text-brand' : 'text-zinc-600 hover:text-white'}`}
                >
                  <ThumbsDown size={14} className={comment.user_reaction === 'dislike' ? 'fill-brand' : ''} /> {comment.dislike_count || 0}
                </button>
              </Tooltip>
            </div>

            <button onClick={() => setIsReplying(!isReplying)} className="text-[9px] font-black text-zinc-600 hover:text-brand uppercase tracking-[0.2em] transition-colors">Reply</button>
            
            {comment.replies && comment.replies.length > 0 && (
              <button onClick={() => setShowReplies(!showReplies)} className="text-[9px] font-black text-brand hover:brightness-125 uppercase tracking-[0.2em] transition-colors flex items-center gap-2">
                {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showReplies ? 'Hide' : `Show ${comment.replies.length} Replies`}
              </button>
            )}
          </div>

          {isReplying && currentUser && (
            <form onSubmit={(e) => onPostReply(e, comment.id, replyText, () => { setIsReplying(false); setReplyText(''); setShowReplies(true); })} className="mt-6 flex gap-4 animate-in slide-in-from-left-2 duration-300">
              <div className="flex-1 space-y-3">
                <input autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand transition-all" />
                <div className="flex gap-4">
                  <button type="submit" disabled={!replyText.trim()} className="text-[9px] font-black text-brand uppercase tracking-widest disabled:opacity-20">Post</button>
                  <button type="button" onClick={() => setIsReplying(false)} className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Cancel</button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {comment.replies.map((reply) => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              currentUser={currentUser} 
              contentOwnerId={contentOwnerId}
              depth={depth + 1} 
              onRefresh={onRefresh} 
              onReaction={onReaction} 
              onPostReply={onPostReply} 
              setComments={setComments}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedCommentSection;