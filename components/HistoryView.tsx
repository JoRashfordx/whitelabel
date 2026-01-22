
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User, WatchHistoryItem, LikedVideoItem, CommentHistoryItem, Video } from '../types';
import { 
  Clock, Heart, MessageSquare, Trash2, Search, X, Loader2, Play, Image as ImageIcon, FileText
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface HistoryViewProps {
  user: User;
  onVideoSelect: (video: Video) => void;
}

type Tab = 'WATCHED' | 'LIKED' | 'COMMENTS';

const HistoryView: React.FC<HistoryViewProps> = ({ user, onVideoSelect }) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>('WATCHED');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [likedVideos, setLikedVideos] = useState<LikedVideoItem[]>([]);
  const [comments, setComments] = useState<CommentHistoryItem[]>([]);
  
  // Search for comments
  const [commentSearch, setCommentSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab, user.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
        if (activeTab === 'WATCHED') {
            const { data, error } = await supabase.rpc('get_user_watch_history', { p_user_id: user.id });
            if (error) throw error;
            setWatchHistory(data || []);
        } else if (activeTab === 'LIKED') {
            const { data, error } = await supabase.rpc('get_user_liked_videos', { p_user_id: user.id });
            if (error) throw error;
            setLikedVideos(data || []);
        } else if (activeTab === 'COMMENTS') {
            const { data, error } = await supabase.rpc('get_user_comment_history', { p_user_id: user.id });
            if (error) throw error;
            setComments(data || []);
        }
    } catch (err) {
        console.error("History fetch error:", err);
    } finally {
        setLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleDeleteHistoryItem = async (historyId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      // Optimistic
      setWatchHistory(prev => prev.filter(item => item.history_id !== historyId));
      await supabase.from('watch_history').delete().eq('id', historyId);
  };

  const handleClearAllHistory = async () => {
      if (await confirm({ title: 'Clear History?', description: 'This will remove all videos from your watch history and affect your recommendations.', confirmText: 'Clear All', variant: 'danger' })) {
          setWatchHistory([]);
          await supabase.rpc('clear_all_watch_history', { p_user_id: user.id });
          addToast({ type: 'success', message: 'Watch history cleared.' });
      }
  };

  const handleUnlikeVideo = async (videoId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      // Optimistic
      setLikedVideos(prev => prev.filter(item => item.video_id !== videoId));
      // Remove 'like' reaction
      await supabase.from('video_reactions').delete().eq('video_id', videoId).eq('user_id', user.id).eq('type', 'like');
      addToast({ type: 'info', message: 'Removed from liked videos' });
  };

  const handleDeleteComment = async (commentId: string) => {
      if (await confirm({ title: 'Delete Comment?', description: 'This comment will be permanently removed.', confirmText: 'Delete', variant: 'danger' })) {
          // Optimistic
          setComments(prev => prev.filter(c => c.comment_id !== commentId));
          await supabase.from('unified_comments').delete().eq('id', commentId);
          addToast({ type: 'success', message: 'Comment deleted' });
      }
  };

  const filteredComments = comments.filter(c => 
      c.content.toLowerCase().includes(commentSearch.toLowerCase()) || 
      c.context_title?.toLowerCase().includes(commentSearch.toLowerCase())
  );

  // Helper to reconstruct full video object for player
  const playVideoFromHistory = (item: WatchHistoryItem | LikedVideoItem) => {
      // Just start playing, the WatchView will fetch full details if needed or error if deleted
      supabase.from('videos').select('*').eq('id', item.video_id).single().then(({ data }) => {
          if (data) onVideoSelect(data);
          else addToast({ type: 'error', message: 'Video no longer available' });
      });
  };

  return (
    <div className="min-h-screen bg-black pt-8 px-4 md:px-8 pb-20 animate-in fade-in">
        <div className="max-w-7xl mx-auto space-y-8">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">History</h1>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Manage your activity</p>
                </div>
                
                <div className="flex bg-white/5 p-1 rounded-lg">
                    <TabButton active={activeTab === 'WATCHED'} onClick={() => setActiveTab('WATCHED')} icon={Clock} label="Watch History" />
                    <TabButton active={activeTab === 'LIKED'} onClick={() => setActiveTab('LIKED')} icon={Heart} label="Liked Videos" />
                    <TabButton active={activeTab === 'COMMENTS'} onClick={() => setActiveTab('COMMENTS')} icon={MessageSquare} label="Comments" />
                </div>
            </div>

            {/* CONTENT */}
            {loading ? (
                <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
            ) : (
                <div className="min-h-[400px]">
                    
                    {/* WATCH HISTORY TAB */}
                    {activeTab === 'WATCHED' && (
                        <div className="space-y-6">
                            <div className="flex justify-end">
                                {watchHistory.length > 0 && (
                                    <button onClick={handleClearAllHistory} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-white flex items-center gap-2 transition-colors">
                                        <Trash2 className="w-4 h-4" /> Clear All Watch History
                                    </button>
                                )}
                            </div>
                            
                            {watchHistory.length === 0 ? (
                                <EmptyState icon={Clock} text="No watch history found" />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {watchHistory.map(item => (
                                        <div key={item.history_id} onClick={() => playVideoFromHistory(item)} className="group relative bg-[#0a0a0a] border border-white/5 hover:border-brand transition-all cursor-pointer">
                                            <button 
                                                onClick={(e) => handleDeleteHistoryItem(item.history_id, e)}
                                                className="absolute top-2 right-2 z-20 p-1.5 bg-black/80 text-zinc-400 hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            
                                            <div className="aspect-video bg-black relative overflow-hidden">
                                                <img src={item.thumbnail_url || ''} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute bottom-1 right-1 bg-black/80 px-1 text-[9px] font-bold text-white">{item.duration}</div>
                                                <div className="absolute inset-x-0 bottom-0 h-1 bg-brand/50"></div> {/* Watched indicator */}
                                            </div>
                                            
                                            <div className="p-3">
                                                <h3 className="text-xs font-black text-white uppercase truncate mb-1">{item.title}</h3>
                                                <p className="text-[9px] font-bold text-zinc-500 uppercase">{item.username}</p>
                                                <p className="text-[8px] font-bold text-zinc-600 uppercase mt-2">Watched {new Date(item.watched_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* LIKED VIDEOS TAB */}
                    {activeTab === 'LIKED' && (
                        <div className="space-y-6">
                            {likedVideos.length === 0 ? (
                                <EmptyState icon={Heart} text="No liked videos yet" />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {likedVideos.map(item => (
                                        <div key={item.reaction_id} onClick={() => playVideoFromHistory(item)} className="group relative bg-[#0a0a0a] border border-white/5 hover:border-brand transition-all cursor-pointer">
                                            <button 
                                                onClick={(e) => handleUnlikeVideo(item.video_id, e)}
                                                className="absolute top-2 right-2 z-20 p-1.5 bg-black/80 text-brand hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remove Like"
                                            >
                                                <Heart className="w-4 h-4 fill-current" />
                                            </button>
                                            
                                            <div className="aspect-video bg-black relative overflow-hidden">
                                                <img src={item.thumbnail_url || ''} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute bottom-1 right-1 bg-black/80 px-1 text-[9px] font-bold text-white">{item.duration}</div>
                                            </div>
                                            
                                            <div className="p-3">
                                                <h3 className="text-xs font-black text-white uppercase truncate mb-1">{item.title}</h3>
                                                <p className="text-[9px] font-bold text-zinc-500 uppercase">{item.username}</p>
                                                <p className="text-[8px] font-bold text-zinc-600 uppercase mt-2">Liked {new Date(item.liked_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* COMMENTS TAB */}
                    {activeTab === 'COMMENTS' && (
                        <div className="space-y-6">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input 
                                    type="text" 
                                    value={commentSearch}
                                    onChange={e => setCommentSearch(e.target.value)}
                                    placeholder="Search your comments..."
                                    className="w-full bg-[#0a0a0a] border border-white/10 py-2 pl-10 pr-4 text-xs text-white focus:border-brand outline-none"
                                />
                            </div>

                            {comments.length === 0 ? (
                                <EmptyState icon={MessageSquare} text="No comments found" />
                            ) : (
                                <div className="space-y-4">
                                    {filteredComments.map(item => (
                                        <div key={item.comment_id} className="bg-[#0a0a0a] border border-white/5 p-4 flex gap-4 hover:border-white/10 transition-colors group">
                                            <div className="w-16 aspect-video bg-zinc-900 shrink-0 border border-white/10 flex items-center justify-center overflow-hidden relative">
                                                {item.context_thumbnail ? (
                                                    <img src={item.context_thumbnail} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-zinc-700">
                                                        <FileText className="w-6 h-6 mb-1" />
                                                    </div>
                                                )}
                                                {/* Type Badge */}
                                                <div className={`absolute top-0 left-0 px-1 py-0.5 text-[6px] font-black uppercase text-white ${item.target_type === 'video' ? 'bg-brand' : 'bg-indigo-500'}`}>
                                                    {item.target_type}
                                                </div>
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1 truncate pr-4">
                                                        On: <span className="text-zinc-300">{item.context_title}</span>
                                                    </p>
                                                    <span className="text-[9px] font-bold text-zinc-600 uppercase shrink-0">
                                                        {new Date(item.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white leading-relaxed line-clamp-2">"{item.content}"</p>
                                            </div>

                                            <button 
                                                onClick={() => handleDeleteComment(item.comment_id)}
                                                className="p-2 text-zinc-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all self-center"
                                                title="Delete Comment"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                    {filteredComments.length === 0 && commentSearch && (
                                        <p className="text-center text-zinc-500 text-xs py-10 font-bold uppercase">No matching comments</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            )}
        </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded ${active ? 'bg-brand text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
    >
        <Icon className="w-4 h-4" /> {label}
    </button>
);

const EmptyState = ({ icon: Icon, text }: any) => (
    <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-lg text-zinc-600">
        <Icon className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">{text}</p>
    </div>
);

export default HistoryView;
