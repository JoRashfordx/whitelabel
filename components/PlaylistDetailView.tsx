import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User, Playlist, PlaylistItem, Video, VideoRating } from '../types';
import { Play, Lock, Globe, Trash2, Shuffle, Clock, MoreVertical, ListVideo, Loader2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface PlaylistDetailViewProps {
  playlistId?: string; // If null, assume 'watch_later' or similar logic
  type?: 'custom' | 'watch_later';
  user: User;
  onPlayVideo: (video: Video, playlistId: string) => void;
}

const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({ playlistId, type, user, onPlayVideo }) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<(PlaylistItem & { video: Video })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaylist();
  }, [playlistId, type, user.id]);

  const fetchPlaylist = async () => {
    setLoading(true);
    let plData: Playlist | null = null;

    try {
        if (type === 'watch_later') {
            const { data } = await supabase.from('playlists').select('*').eq('user_id', user.id).eq('type', 'watch_later').maybeSingle();
            plData = data;
        } else if (playlistId) {
            const { data } = await supabase.from('playlists').select('*').eq('id', playlistId).single();
            plData = data;
        }

        if (plData) {
            setPlaylist(plData);
            const { data: itemData } = await supabase
                .from('playlist_items')
                .select(`*, video:videos(*)`)
                .eq('playlist_id', plData.id)
                .order('added_at', { ascending: false });
            
            // Filter out items where video might be null (deleted)
            if (itemData) {
                setItems(itemData.filter((i: any) => i.video) as any);
            }
        }
    } catch (err) {
        console.error("Playlist fetch error:", err);
    } finally {
        setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
      // Optimistic
      setItems(prev => prev.filter(i => i.id !== itemId));
      await supabase.from('playlist_items').delete().eq('id', itemId);
      addToast({ type: 'success', message: 'Removed from playlist.' });
  };

  const handleDeletePlaylist = async () => {
      if (!playlist) return;
      if (playlist.type === 'watch_later') return; // Cannot delete system playlists
      
      if (await confirm({ title: 'Delete Playlist?', description: 'This cannot be undone.', confirmText: 'Delete', variant: 'danger' })) {
          await supabase.from('playlists').delete().eq('id', playlist.id);
          addToast({ type: 'success', message: 'Playlist deleted.' });
          // Ideally navigate away here, handled by parent typically or just show empty state
          setPlaylist(null);
      }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>;

  if (!playlist) return (
      <div className="min-h-screen flex flex-col items-center justify-center text-zinc-500">
          <ListVideo className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-[10px] font-black uppercase tracking-widest">Playlist not found</p>
      </div>
  );

  const firstVideo = items.length > 0 ? items[0].video : null;

  return (
    <div className="min-h-screen bg-black pt-8 px-6 pb-20 font-comfortaa">
       <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
           
           {/* LEFT: PLAYLIST INFO CARD */}
           <div className="space-y-6">
               <div className="aspect-video bg-zinc-900 border border-white/10 relative overflow-hidden group rounded-lg shadow-2xl">
                   {firstVideo ? (
                       <img src={firstVideo.thumbnail_url || ''} className="w-full h-full object-cover opacity-80" />
                   ) : (
                       <div className="w-full h-full flex items-center justify-center text-zinc-700">
                           <ListVideo className="w-16 h-16" />
                       </div>
                   )}
                   
                   {/* Overlay Stats */}
                   <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-6">
                       <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-2">{playlist.title}</h1>
                       <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                           <span>{items.length} Videos</span>
                           <span className="flex items-center gap-1">
                               {playlist.visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />} {playlist.visibility}
                           </span>
                       </div>
                   </div>
               </div>

               <div className="flex gap-4">
                   <button 
                        onClick={() => firstVideo && onPlayVideo(firstVideo, playlist.id)}
                        disabled={items.length === 0}
                        className="flex-1 py-4 bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                       <Play className="w-4 h-4 fill-current" /> Play All
                   </button>
                   {playlist.type === 'custom' && (
                       <button onClick={handleDeletePlaylist} className="px-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:text-white hover:bg-rose-500 transition-all rounded">
                           <Trash2 className="w-5 h-5" />
                       </button>
                   )}
               </div>
               
               {playlist.description && (
                   <p className="text-sm text-zinc-400 leading-relaxed">{playlist.description}</p>
               )}
           </div>

           {/* RIGHT: VIDEO LIST */}
           <div className="lg:col-span-2 space-y-4">
               {items.length === 0 ? (
                   <div className="py-20 text-center border-2 border-dashed border-white/5 text-zinc-600 rounded-lg">
                       <p className="text-[10px] font-black uppercase tracking-widest">No videos in playlist</p>
                   </div>
               ) : (
                   items.map((item, idx) => (
                       <div key={item.id} className="flex gap-4 p-3 bg-[#0a0a0a] border border-white/5 hover:border-brand/30 group transition-all rounded cursor-pointer" onClick={() => onPlayVideo(item.video, playlist.id)}>
                           <div className="flex items-center justify-center w-8 text-zinc-600 font-black text-sm">{idx + 1}</div>
                           <div className="w-32 aspect-video bg-black relative shrink-0 overflow-hidden border border-white/5">
                               <img src={item.video.thumbnail_url || ''} className="w-full h-full object-cover" />
                               <div className="absolute bottom-1 right-1 bg-black/90 px-1 py-0.5 text-[8px] font-bold text-white">{item.video.duration}</div>
                           </div>
                           <div className="flex-1 min-w-0 flex flex-col justify-center">
                               <h4 className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{item.video.title}</h4>
                               <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Added {new Date(item.added_at).toLocaleDateString()}</p>
                           </div>
                           <div className="flex items-center px-2">
                               <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}
                                className="p-2 text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                   <Trash2 size={16} />
                               </button>
                           </div>
                       </div>
                   ))
               )}
           </div>

       </div>
    </div>
  );
};

export default PlaylistDetailView;