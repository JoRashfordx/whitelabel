
import React, { useState, useEffect } from 'react';
import { User, Video, VideoVisibility } from '../types';
import { supabase } from '../services/supabase';
import { 
  Trash2, Edit, Eye, EyeOff, Lock, Globe, Loader2, Play, AlertCircle
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import EditVideoModal from './EditVideoModal';

interface VideoManagerProps {
  user: User;
}

const VideoManager: React.FC<VideoManagerProps> = ({ user }) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  const fetchVideos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setVideos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, [user.id]);

  const handleDelete = async (videoId: string) => {
    if (!(await confirm({
        title: 'Delete Video?',
        description: 'This action cannot be undone. All views and comments will be lost.',
        confirmText: 'Delete Forever',
        variant: 'danger'
    }))) return;

    try {
        const { error } = await supabase.from('videos').delete().eq('id', videoId);
        if (error) throw error;
        setVideos(prev => prev.filter(v => v.id !== videoId));
        addToast({ type: 'success', message: 'Video deleted.' });
    } catch (err: any) {
        addToast({ type: 'error', message: err.message });
    }
  };

  const getVisibilityIcon = (v: VideoVisibility) => {
      switch(v) {
          case 'public': return <Globe className="w-3 h-3 text-emerald-500" />;
          case 'unlisted': return <EyeOff className="w-3 h-3 text-amber-500" />;
          case 'private': return <Lock className="w-3 h-3 text-rose-500" />;
          default: return <Lock className="w-3 h-3" />;
      }
  };

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in">
        {editingVideo && (
            <EditVideoModal 
                video={editingVideo} 
                onClose={() => setEditingVideo(null)} 
                onUpdate={fetchVideos} 
            />
        )}

        <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Content Manager</h2>
                <p className="text-xs text-zinc-500 mt-1">Manage, edit, and delete your uploads.</p>
            </div>
            <span className="bg-white/5 px-3 py-1 rounded text-[10px] font-black uppercase text-zinc-400">
                {videos.length} Videos
            </span>
        </div>

        {videos.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded">
                <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">No videos uploaded yet</p>
            </div>
        ) : (
            <div className="space-y-2">
                {videos.map(video => (
                    <div key={video.id} className="bg-[#050505] border border-white/5 p-4 flex gap-4 items-center group hover:border-white/10 transition-colors">
                        <div className="w-24 aspect-video bg-black relative shrink-0 overflow-hidden border border-white/5">
                            <img src={video.thumbnail_url || ''} className="w-full h-full object-cover" />
                            <div className="absolute bottom-1 right-1 bg-black/80 px-1 text-[8px] font-bold text-white">{video.duration}</div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-black text-white uppercase truncate mb-1">{video.title}</h4>
                            <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase">
                                <span className="flex items-center gap-1">{getVisibilityIcon(video.visibility)} {video.visibility}</span>
                                <span>•</span>
                                <span>{new Date(video.created_at).toLocaleDateString()}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.views_count.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => setEditingVideo(video)}
                                className="p-2 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                title="Edit"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleDelete(video.id)}
                                className="p-2 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default VideoManager;
