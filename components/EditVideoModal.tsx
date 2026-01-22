
import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoVisibility, User } from '../types';
import { supabase } from '../services/supabase';
import { X, Loader2, Save, Globe, Lock, EyeOff, Image as ImageIcon, Upload, Film, Wand2, Tag } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import ThumbnailStudio from './ThumbnailStudio';

interface EditVideoModalProps {
  video: Video;
  onClose: () => void;
  onUpdate: () => void;
  user?: User; // Optional user for Suite access
}

const EditVideoModal: React.FC<EditVideoModalProps> = ({ video, onClose, onUpdate, user }) => {
  const { addToast } = useToast();
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || '');
  const [visibility, setVisibility] = useState<VideoVisibility>(video.visibility);
  const [category, setCategory] = useState(video.category || 'Vlog');
  const [thumbnailUrl, setThumbnailUrl] = useState(video.thumbnail_url || '');
  const [hashtags, setHashtags] = useState(video.hashtags?.join(' ') || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filmstripUrls, setFilmstripUrls] = useState<string[]>(video.filmstrip_urls || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchDetails = async () => {
        const { data } = await supabase.from('videos').select('filmstrip_urls').eq('id', video.id).single();
        if (data?.filmstrip_urls) {
            setFilmstripUrls(data.filmstrip_urls);
        }
    };
    fetchDetails();
  }, [video.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setThumbnailUrl(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalThumbUrl = thumbnailUrl;

      // Upload new thumbnail if selected via file
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${video.user_id}/${video.id}/thumb_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('thumbnail-assets').upload(fileName, selectedFile);
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('thumbnail-assets').getPublicUrl(fileName);
        finalThumbUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from('videos')
        .update({
          title,
          description,
          visibility,
          category,
          thumbnail_url: finalThumbUrl,
          hashtags: hashtags.split(/[ ,]+/).map(h => h.replace('#', '').trim()).filter(Boolean),
          updated_at: new Date().toISOString()
        })
        .eq('id', video.id);

      if (error) throw error;
      
      addToast({ type: 'success', message: 'Video updated successfully' });
      onUpdate();
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {isStudioOpen && user && (
          <ThumbnailStudio 
            user={user} 
            onClose={() => setIsStudioOpen(false)} 
            onSave={(url) => { 
                setThumbnailUrl(url); 
                setSelectedFile(null); 
                setIsStudioOpen(false); 
            }} 
            initialType='thumbnail'
            relatedId={video.id}
          />
      )}

      <div className="bg-[#0a0a0a] w-full max-w-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
          <h3 className="text-lg font-black text-white uppercase tracking-tight">Edit Video Details</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-zinc-500 hover:text-white" /></button>
        </div>
        
        <div className="p-8 space-y-8 overflow-y-auto">
          {/* Thumbnail Management */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Thumbnail</label>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-56 aspect-video bg-black border border-white/10 relative group overflow-hidden shrink-0">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} className="w-full h-full object-cover" alt="Thumbnail Preview" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-end gap-3 flex-1">
                <div className="flex gap-3">
                    <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-all"
                    >
                    <Upload className="w-3 h-3" /> Upload
                    </button>
                    {user && (
                        <button 
                        onClick={() => setIsStudioOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand/10 hover:bg-brand/20 border border-brand/20 text-[9px] font-black uppercase tracking-widest text-brand hover:text-white transition-all"
                        >
                        <Wand2 className="w-3 h-3" /> Create with Suite
                        </button>
                    )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  hidden 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
                <p className="text-[9px] text-zinc-600 font-medium">Recommended: 1280x720 (16:9). JPG or PNG.</p>
              </div>
            </div>
            
            {/* Filmstrip Selection */}
            {filmstripUrls.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5 mt-2">
                <div className="flex items-center gap-2 mb-2">
                    <Film className="w-3 h-3 text-zinc-500" />
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Select Frame</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {filmstripUrls.map((url, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => { setThumbnailUrl(url); setSelectedFile(null); }}
                      className={`relative w-24 aspect-video flex-shrink-0 border-2 transition-all overflow-hidden group ${
                        thumbnailUrl === url && !selectedFile 
                          ? 'border-brand opacity-100' 
                          : 'border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} className="w-full h-full object-cover" alt={`Frame ${idx}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Title</label>
                <input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="w-full bg-black border border-white/10 p-3 text-sm text-white focus:border-brand outline-none font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white uppercase font-bold outline-none"
                >
                   {['Vlog', 'Travel', 'Gaming', 'Music', 'Sports', 'DIY', 'Tutorial', 'Beauty', 'Lifestyle'].map(c => (
                     <option key={c} value={c}>{c}</option>
                   ))}
                </select>
              </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Description</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={5}
              className="w-full bg-black border border-white/10 p-3 text-sm text-white focus:border-brand outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                 <Tag className="w-3 h-3" /> Hashtags
             </label>
             <input 
                value={hashtags} 
                onChange={(e) => setHashtags(e.target.value)} 
                placeholder="#gaming #viral"
                className="w-full bg-black border border-white/10 p-3 text-xs text-brand font-bold focus:border-brand outline-none"
             />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Visibility</label>
            <div className="grid grid-cols-3 gap-3">
               {[
                   { val: 'public', icon: Globe, label: 'Public' },
                   { val: 'unlisted', icon: EyeOff, label: 'Unlisted' },
                   { val: 'private', icon: Lock, label: 'Private' }
               ].map(opt => (
                   <button 
                     key={opt.val}
                     onClick={() => setVisibility(opt.val as VideoVisibility)}
                     className={`flex flex-col items-center justify-center p-3 border transition-all gap-2 ${visibility === opt.val ? 'bg-white text-black border-white' : 'bg-black border-white/10 text-zinc-500 hover:text-white'}`}
                   >
                       <opt.icon className="w-4 h-4" />
                       <span className="text-[9px] font-black uppercase tracking-widest">{opt.label}</span>
                   </button>
               ))}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5">
           <button onClick={onClose} className="px-6 py-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white">Cancel</button>
           <button 
             onClick={handleSave} 
             disabled={isSaving}
             className="bg-brand text-white px-8 py-2 text-[10px] font-black uppercase tracking-widest hover:brightness-110 flex items-center gap-2 shadow-lg shadow-brand/20"
           >
             {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
           </button>
        </div>
      </div>
    </div>
  );
};

export default EditVideoModal;
