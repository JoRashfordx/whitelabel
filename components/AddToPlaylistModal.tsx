
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User, Video, Playlist } from '../types';
import { X, Plus, Check, Lock, Globe, Loader2, ListVideo } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface AddToPlaylistModalProps {
  user: User;
  video: Video;
  onClose: () => void;
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ user, video, onClose }) => {
  const { addToast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newVisibility, setNewVisibility] = useState<'public' | 'private'>('private');
  
  // Track which playlists contain this video
  const [containingIds, setContainingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPlaylists();
  }, [user.id]);

  const fetchPlaylists = async () => {
    setLoading(true);
    // 1. Fetch User Playlists
    const { data: plData } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', user.id)
      .neq('type', 'watch_later') // Watch later handled separately usually, but can be included if desired
      .order('created_at', { ascending: false });
    
    setPlaylists(plData || []);

    // 2. Check existence
    if (plData && plData.length > 0) {
        const ids = plData.map(p => p.id);
        const { data: items } = await supabase
            .from('playlist_items')
            .select('playlist_id')
            .in('playlist_id', ids)
            .eq('video_id', video.id);
        
        if (items) {
            setContainingIds(new Set(items.map(i => i.playlist_id)));
        }
    }
    setLoading(false);
  };

  const togglePlaylist = async (playlist: Playlist) => {
    const isAdded = containingIds.has(playlist.id);
    
    // Optimistic Update
    const nextSet = new Set(containingIds);
    if (isAdded) nextSet.delete(playlist.id);
    else nextSet.add(playlist.id);
    setContainingIds(nextSet);

    try {
        if (isAdded) {
            await supabase.from('playlist_items').delete().eq('playlist_id', playlist.id).eq('video_id', video.id);
        } else {
            await supabase.from('playlist_items').insert({ playlist_id: playlist.id, video_id: video.id });
        }
    } catch (err) {
        // Revert on error
        setContainingIds(containingIds);
        addToast({ type: 'error', message: 'Failed to update playlist.' });
    }
  };

  const createPlaylist = async () => {
      if (!newTitle.trim()) return;
      try {
          const { data, error } = await supabase.from('playlists').insert({
              user_id: user.id,
              title: newTitle,
              visibility: newVisibility,
              type: 'custom'
          }).select().single();

          if (error) throw error;
          if (data) {
              setPlaylists([data, ...playlists]);
              setCreatingNew(false);
              setNewTitle('');
              // Auto-add video to new playlist
              await togglePlaylist(data);
              addToast({ type: 'success', message: 'Playlist created and video added.' });
          }
      } catch (err) {
          addToast({ type: 'error', message: 'Failed to create playlist.' });
      }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#111] w-full max-w-sm border border-white/10 shadow-2xl relative flex flex-col max-h-[80vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0a0a0a]">
                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <ListVideo className="w-4 h-4 text-brand" /> Save to...
                </h3>
                <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                    <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
                ) : (
                    <div className="space-y-1">
                        {playlists.map(pl => (
                            <button 
                                key={pl.id}
                                onClick={() => togglePlaylist(pl)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left group"
                            >
                                <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${containingIds.has(pl.id) ? 'bg-brand border-brand' : 'border-zinc-600 group-hover:border-white'}`}>
                                    {containingIds.has(pl.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-xs font-bold text-white block truncate">{pl.title}</span>
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                        {pl.visibility === 'private' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                        {pl.visibility}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Create New */}
            <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
                {!creatingNew ? (
                    <button 
                        onClick={() => setCreatingNew(true)}
                        className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Create New Playlist
                    </button>
                ) : (
                    <div className="space-y-3 animate-in slide-in-from-bottom-2">
                        <input 
                            autoFocus
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            placeholder="Playlist Name"
                            className="w-full bg-black border border-white/10 p-3 text-xs text-white focus:border-brand outline-none font-bold"
                        />
                        <select 
                            value={newVisibility}
                            onChange={e => setNewVisibility(e.target.value as any)}
                            className="w-full bg-black border border-white/10 p-3 text-xs text-white focus:border-brand outline-none font-bold"
                        >
                            <option value="private">Private</option>
                            <option value="public">Public</option>
                        </select>
                        <div className="flex gap-2">
                            <button onClick={() => setCreatingNew(false)} className="flex-1 py-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white">Cancel</button>
                            <button onClick={createPlaylist} disabled={!newTitle} className="flex-1 py-2 bg-brand text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50">Create</button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    </div>
  );
};

export default AddToPlaylistModal;
