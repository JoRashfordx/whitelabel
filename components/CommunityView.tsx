
import React, { useState, useEffect, useRef } from 'react';
import { User, Profile, CommunityPost } from '../types';
import { supabase } from '../services/supabase';
import { 
  Image as ImageIcon, Video as VideoIcon, Send, ThumbsUp, MessageSquare, 
  MoreVertical, Share2, Trash2, ArrowLeft, Loader2, Smile, X 
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import Tooltip from './Tooltip';
import SharedCommentSection from './CommentSection';

const formatCommunityTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

interface CommunityViewProps {
  user: User | null;
  profile: Profile;
  isOwner: boolean;
}

const CommunityView: React.FC<CommunityViewProps> = ({ user, profile, isOwner }) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);
  
  const [newContent, setNewContent] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'video' | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (viewingPostId) return;
    fetchPosts();
  }, [profile.id, sort, viewingPostId, user?.id]);

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from('community_posts')
      .select('*, profile:profiles!user_id(username, avatar_url)')
      .eq('user_id', profile.id);

    if (sort === 'newest') query = query.order('created_at', { ascending: false });
    if (sort === 'oldest') query = query.order('created_at', { ascending: true });
    if (sort === 'popular') query = query.order('likes_count', { ascending: false });

    const { data } = await query.limit(20);
    
    if (data && user) {
        const { data: likes } = await supabase
            .from('community_post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', data.map(p => p.id));
        
        const likedIds = new Set(likes?.map(l => l.post_id));
        
        const merged = data.map((p: any) => ({
            ...p,
            profile: Array.isArray(p.profile) ? p.profile[0] : p.profile,
            is_liked_by_viewer: likedIds.has(p.id)
        }));
        setPosts(merged);
    } else if (data) {
        const merged = data.map((p: any) => ({
            ...p,
            profile: Array.isArray(p.profile) ? p.profile[0] : p.profile,
            is_liked_by_viewer: false
        }));
        setPosts(merged);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!type) {
      addToast({ type: 'error', title: 'Invalid File', message: 'Only images and videos are supported.' });
      return;
    }

    setAttachment(file);
    setAttachmentType(type);
    setAttachmentPreview(URL.createObjectURL(file));
  };

  const handleCreatePost = async () => {
    if (!user || (!newContent.trim() && !attachment)) return;
    setIsPosting(true);

    try {
        let url = null;
        if (attachment) {
            const ext = attachment.name.split('.').pop();
            const path = `${user.id}/${Date.now()}.${ext}`;
            const bucket = attachmentType === 'video' ? 'videos' : 'profile-assets';
            
            await supabase.storage.from(bucket).upload(path, attachment);
            const { data } = supabase.storage.from(bucket).getPublicUrl(path);
            url = data.publicUrl;
        }

        const { data: newPost, error } = await supabase
            .from('community_posts')
            .insert([{
                user_id: user.id,
                content: newContent,
                attachment_url: url,
                attachment_type: attachmentType
            }])
            .select('*, profile:profiles!user_id(username, avatar_url)')
            .single();

        if (error) throw error;

        if (newPost) {
            const formatted = { 
                ...newPost, 
                profile: Array.isArray((newPost as any).profile) ? (newPost as any).profile[0] : (newPost as any).profile,
                likes_count: 0,
                comments_count: 0,
                is_liked_by_viewer: false 
            };
            setPosts(prev => [formatted, ...prev]);
            setNewContent('');
            setAttachment(null);
            setAttachmentPreview(null);
            setAttachmentType(null);
            addToast({ type: 'success', title: 'Posted', message: 'Your update is live.' });
        }
    } catch (err) {
        console.error(err);
        addToast({ type: 'error', title: 'Error', message: 'Failed to create post.' });
    } finally {
        setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      addToast({ type: 'info', title: 'Sign In', message: 'Please sign in to like posts.' });
      return;
    }
    
    setPosts(prev => prev.map(p => {
        if (p.id === postId) {
            const isLiked = p.is_liked_by_viewer;
            return {
                ...p,
                is_liked_by_viewer: !isLiked,
                likes_count: isLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1
            };
        }
        return p;
    }));

    try {
        await supabase.rpc('handle_community_like', { p_post_id: postId, p_user_id: user.id });
    } catch (err) {
        console.error("Like error:", err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!(await confirm({
      title: 'Delete Post?',
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    }))) return;
    
    setPosts(prev => prev.filter(p => p.id !== postId));
    if (viewingPostId === postId) setViewingPostId(null);

    try {
        const { error } = await supabase.from('community_posts').delete().eq('id', postId);
        if (error) throw error;
        addToast({ type: 'success', message: 'Post deleted.' });
    } catch (err) {
        console.error("Failed to delete post:", err);
        addToast({ type: 'error', message: 'Failed to delete post.' });
        fetchPosts(); // Revert
    }
  };

  const selectedPost = posts.find(p => p.id === viewingPostId);

  if (viewingPostId && selectedPost) {
      return (
          <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-right-4 font-comfortaa">
              <button 
                onClick={() => setViewingPostId(null)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white mb-6 transition-colors"
              >
                  <ArrowLeft className="w-4 h-4" /> Back to Community
              </button>
              
              <PostCard 
                post={selectedPost} 
                onLike={() => handleLike(selectedPost.id)} 
                isDetailView 
                isOwner={isOwner}
                onDelete={() => handleDeletePost(selectedPost.id)}
              />
              
              <div className="mt-8 border-t border-white/5 pt-8">
                  <SharedCommentSection 
                    targetType="community" 
                    targetId={selectedPost.id} 
                    currentUser={user} 
                    contentOwnerId={profile.id} 
                  />
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8 font-comfortaa">
      {isOwner && (
        <div className="bg-[#0a0a0a] border border-white/10 p-8 space-y-6 shadow-xl">
            <div className="flex gap-5">
                <div className="w-12 h-12 bg-zinc-800 border-2 border-zinc-700/50 overflow-hidden shrink-0">
                    <img src={profile.avatar_url || ''} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-3">
                    <textarea 
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder={`Post an update to your community...`}
                        className="w-full bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none resize-none min-h-[100px] font-comfortaa leading-relaxed"
                    />
                    {attachmentPreview && (
                        <div className="relative w-fit mt-2 group">
                            {attachmentType === 'video' ? (
                                <video src={attachmentPreview} className="max-h-60 border border-white/10" controls />
                            ) : (
                                <img src={attachmentPreview} className="max-h-60 border border-white/10" />
                            )}
                            <button 
                                onClick={() => { setAttachment(null); setAttachmentPreview(null); }}
                                className="absolute -top-2 -right-2 bg-black border border-white/20 text-white p-1 hover:text-rose-500 transition-colors shadow-lg"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div className="flex gap-2">
                    <Tooltip content="Attach Media">
                      <button onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
                          <ImageIcon className="w-5 h-5" />
                      </button>
                    </Tooltip>
                    <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" onChange={handleFileSelect} />
                </div>
                <button 
                    onClick={handleCreatePost}
                    disabled={isPosting || (!newContent.trim() && !attachment)}
                    className="bg-brand text-white px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 disabled:opacity-50 disabled:grayscale transition-all shadow-[0_0_15px_rgba(255,0,127,0.2)]"
                >
                    {isPosting ? 'Posting...' : 'Post Update'}
                </button>
            </div>
        </div>
      )}

      <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-tight">Latest Posts</h3>
          <div className="flex gap-4">
              <button onClick={() => setSort('newest')} className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${sort === 'newest' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}>Newest</button>
              <button onClick={() => setSort('popular')} className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${sort === 'popular' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}>Popular</button>
          </div>
      </div>

      {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
      ) : posts.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-white/5">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No posts yet</p>
          </div>
      ) : (
          <div className="space-y-8">
              {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onLike={() => handleLike(post.id)} 
                    onClick={() => setViewingPostId(post.id)}
                    isOwner={isOwner}
                    onDelete={() => handleDeletePost(post.id)}
                  />
              ))}
          </div>
      )}
    </div>
  );
};

const PostCard: React.FC<{ 
    post: CommunityPost, 
    onLike: () => void, 
    onClick?: () => void, 
    isDetailView?: boolean,
    isOwner?: boolean,
    onDelete?: () => void
}> = ({ post, onLike, onClick, isDetailView, isOwner, onDelete }) => {
    return (
        <div className={`bg-[#0a0a0a] border border-white/10 p-8 font-comfortaa ${!isDetailView ? 'hover:border-white/20 transition-all cursor-pointer shadow-lg hover:shadow-2xl' : ''}`} onClick={!isDetailView ? onClick : undefined}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex gap-5 items-center">
                    <div className="w-12 h-12 bg-zinc-800 overflow-hidden shrink-0 border border-white/10">
                        <img src={post.profile?.avatar_url || ''} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                        <h4 className="text-xs font-black text-white uppercase tracking-wide">{post.profile?.username}</h4>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{formatCommunityTime(post.created_at)}</span>
                    </div>
                </div>
                {isOwner && onDelete && (
                    <Tooltip content="Delete Post">
                      <button 
                          onClick={(e) => { e.stopPropagation(); onDelete(); }}
                          className="text-zinc-600 hover:text-rose-500 p-2 hover:bg-white/5 transition-all"
                      >
                          <Trash2 className="w-4 h-4" />
                      </button>
                    </Tooltip>
                )}
            </div>
            
            <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-loose mb-6 font-medium font-comfortaa">{post.content}</p>
            
            {post.attachment_url && (
                <div className="mb-8 bg-black border border-white/5 overflow-hidden shadow-inner">
                    {post.attachment_type === 'video' ? (
                        <video src={post.attachment_url} controls className="w-full max-h-[500px]" onClick={e => e.stopPropagation()} />
                    ) : (
                        <img src={post.attachment_url} className="w-full max-h-[500px] object-contain" />
                    )}
                </div>
            )}

            <div className="flex items-center gap-8 pt-6 border-t border-white/5">
                <button 
                    onClick={(e) => { e.stopPropagation(); onLike(); }}
                    className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-colors ${post.is_liked_by_viewer ? 'text-brand' : 'text-zinc-500 hover:text-white'}`}
                >
                    <ThumbsUp className={`w-4 h-4 ${post.is_liked_by_viewer ? 'fill-brand' : ''}`} />
                    {post.likes_count} Likes
                </button>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <MessageSquare className="w-4 h-4" />
                    {post.comments_count} Comments
                </div>
            </div>
        </div>
    );
};

export default CommunityView;
