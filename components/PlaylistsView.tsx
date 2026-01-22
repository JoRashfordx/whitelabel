import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User, Playlist } from '../types';
import { ListVideo, Play, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface PlaylistsViewProps {
  user: User;
  onPlaylistSelect: (playlistId: string) => void;
}

const PlaylistsView: React.FC<PlaylistsViewProps> = ({ user, onPlaylistSelect }) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaylists();
  }, [user.id]);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
        const { data } = await supabase
            .from('playlists')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (data) {
            const enriched = await Promise.all(data.map(async (pl: any) => {
                const { count } = await supabase.from('playlist_items').select('*', { count: 'exact', head: true }).eq('playlist_id', pl.id);
                // Get first video thumbnail if exists
                const { data: firstItem } = await supabase.from('playlist_items').select('video:videos(thumbnail_url)').eq('playlist_id', pl.id).limit(1).maybeSingle();
                
                return {
                    ...pl,
                    video_count: count || 0,
                    thumbnail_url: (firstItem?.video as any)?.thumbnail_url || null
                };
            }));
            setPlaylists(enriched as Playlist[]);
        }
    } catch (err) {
        console.error("Error fetching playlists:", err);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (await confirm({ title: 'Delete Playlist?', description: 'This will permanently remove the playlist.', confirmText: 'Delete', variant: 'danger' })) {
          const { error } = await supabase.from('playlists').delete().eq('id', id);
          if (!error) {
              setPlaylists(prev => prev.filter(p => p.id !== id));
              addToast({ type: 'success', message: 'Playlist deleted.' });
          } else {
              addToast({ type: 'error', message: 'Failed to delete playlist.' });
          }
      }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-black pt-8 px-6 pb-20 font-comfortaa">
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-3 border-b border-white/10 pb-6">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <ListVideo className="w-6 h-6 text-brand" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">My Playlists</h1>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Manage your collections</p>
                </div>
            </div>

            {playlists.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-lg">
                    <ListVideo className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No playlists created yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {playlists.map(pl => (
                        <div 
                            key={pl.id} 
                            onClick={() => onPlaylistSelect(pl.id)}
                            className="group cursor-pointer bg-[#0a0a0a] border border-white/5 hover:border-brand transition-all flex flex-col relative"
                        >
                            <div className="aspect-video bg-zinc-900 relative border-b border-white/5 flex items-center justify-center overflow-hidden">
                                {pl.thumbnail_url ? (
                                    <img src={pl.thumbnail_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <ListVideo className="w-8 h-8 text-zinc-700" />
                                )}
                                
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                
                                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    {pl.video_count} Videos
                                </div>

                                {/* Hover Play Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-12 h-12 bg-brand/90 rounded-full flex items-center justify-center shadow-lg">
                                        <Play className="w-5 h-5 text-white ml-0.5 fill-current" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 flex justify-between items-start gap-4">
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{pl.title}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 border ${pl.visibility === 'private' ? 'text-rose-500 border-rose-500/30 bg-rose-500/10' : 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'}`}>
                                            {pl.visibility}
                                        </span>
                                        <span className="text-[9px] text-zinc-600 font-bold uppercase">
                                            {new Date(pl.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                {pl.type === 'custom' && (
                                    <button 
                                        onClick={(e) => handleDelete(e, pl.id)}
                                        className="p-2 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default PlaylistsView;