
import React, { useState, useRef, useEffect } from 'react';
import { User, VideoVisibility, VideoRating, Series } from '../types';
import { supabase } from '../services/supabase';
import { generateEnhancedDescription } from '../services/ai';
import { 
  X, ChevronRight, ChevronLeft, Calendar, Clock, Upload, 
  Layers, Check, Loader2, Save, Image as ImageIcon,
  ArrowUp, ArrowDown, Trash2, Wand2, RefreshCw
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import ThumbnailStudio from './ThumbnailStudio';

interface SeriesWizardProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
  existingSeries?: Series; // If editing
}

const STEPS = ['Metadata', 'Schedule', 'Episodes', 'Review'];

interface EpisodeDraft {
  id: string; // temp id or db id
  file?: File;
  thumbFile?: File;
  thumbPreview?: string;
  video_id?: string; // if editing or pre-uploaded
  title: string;
  desc: string;
  customDate?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'ready';
  isExisting?: boolean; // Flag to track if it's already in DB
  release_date?: string;
  episode_number?: number;
}

const SeriesWizard: React.FC<SeriesWizardProps> = ({ user, onClose, onSuccess, existingSeries }) => {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studioMode, setStudioMode] = useState<'cover' | 'hero' | null>(null);

  // --- FORM STATE ---
  // Step 1: Metadata
  const [title, setTitle] = useState(existingSeries?.title || '');
  const [desc, setDesc] = useState(existingSeries?.description || '');
  const [thumb, setThumb] = useState(existingSeries?.thumbnail_url || '');
  const [heroBannerUrl, setHeroBannerUrl] = useState(''); // New state for hero
  const [visibility, setVisibility] = useState<VideoVisibility>(existingSeries?.visibility || 'public');
  const [rating, setRating] = useState<VideoRating>(existingSeries?.rating || 'U');
  
  // AI State
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  
  // Step 2: Schedule
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [cadence, setCadence] = useState<'weekly' | 'biweekly' | 'monthly' | 'custom'>('weekly');
  const [releaseTime, setReleaseTime] = useState('09:00');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Episodes State
  const [episodes, setEpisodes] = useState<EpisodeDraft[]>([]);
  const [deletedEpisodeIds, setDeletedEpisodeIds] = useState<string[]>([]); // Track deletions
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  
  const epFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Series Context & Episodes
  useEffect(() => {
    if (existingSeries?.id) {
      setIsLoadingEpisodes(true);
      
      // 1. Fetch Hero Banner
      supabase.from('series_hero_banners').select('banner_image_url').eq('series_id', existingSeries.id).eq('enabled', true).maybeSingle()
        .then(({ data }) => {
            if (data) setHeroBannerUrl(data.banner_image_url || '');
        });

      // 2. Fetch Existing Episodes
      supabase.from('series_episodes')
        .select('*')
        .eq('series_id', existingSeries.id)
        .order('episode_number', { ascending: true })
        .then(({ data }) => {
          if (data) {
            const mapped: EpisodeDraft[] = data.map(ep => ({
              id: ep.id,
              video_id: ep.video_id,
              title: ep.title,
              desc: ep.description || '',
              thumbPreview: ep.thumbnail_url || undefined,
              status: 'ready', // Already uploaded
              progress: 100,
              isExisting: true,
              release_date: ep.release_date,
              episode_number: ep.episode_number
            }));
            setEpisodes(mapped);
          }
          setIsLoadingEpisodes(false);
        });
    }
  }, [existingSeries?.id]);

  // --- LOGIC ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newEps: EpisodeDraft[] = Array.from(e.target.files).map((f: File, idx) => ({
        id: `new-${Date.now()}-${idx}`,
        file: f,
        title: f.name.split('.')[0].replace(/[-_]/g, ' '),
        desc: '',
        progress: 0,
        status: 'pending',
        isExisting: false
      }));
      setEpisodes(prev => [...prev, ...newEps]);
    }
    // Reset input
    e.target.value = '';
  };

  const handleEpisodeThumbSelect = (e: React.ChangeEvent<HTMLInputElement>, epId: string) => {
    const f = e.target.files?.[0];
    if (f) {
      const reader = new FileReader();
      reader.onload = () => {
        setEpisodes(prev => prev.map(ep => ep.id === epId ? { ...ep, thumbFile: f, thumbPreview: reader.result as string } : ep));
      };
      reader.readAsDataURL(f);
    }
  };

  const moveEpisode = (index: number, direction: -1 | 1) => {
    setEpisodes(prev => {
      const newOrder = [...prev];
      if (index + direction < 0 || index + direction >= newOrder.length) return prev;
      [newOrder[index], newOrder[index + direction]] = [newOrder[index + direction], newOrder[index]];
      return newOrder;
    });
  };

  const handleDeleteEpisode = (index: number) => {
      const ep = episodes[index];
      if (ep.isExisting) {
          setDeletedEpisodeIds(prev => [...prev, ep.id]);
      }
      setEpisodes(prev => prev.filter((_, i) => i !== index));
  };

  const calculateReleaseDate = (index: number): Date => {
    // If specific existing episode has a date, prioritize preserving cadence from there?
    // For simplicity, we recalculate purely based on start date for PREVIEW purposes, 
    // but in backend we only update if needed.
    
    // However, for the UI "First Release" preview, we just use start date
    let runningDate = new Date(`${startDate}T${releaseTime}`);
    
    // Add weeks/days
    if (cadence === 'weekly') {
        runningDate.setDate(runningDate.getDate() + (index * 7));
    } else if (cadence === 'biweekly') {
        runningDate.setDate(runningDate.getDate() + (index * 14));
    } else if (cadence === 'monthly') {
        runningDate.setMonth(runningDate.getMonth() + index);
    }
    
    // Override if custom set (UI logic mostly)
    const ep = episodes[index];
    if (ep?.customDate) {
        return new Date(`${ep.customDate}T${releaseTime}`);
    }
    
    // If existing, fallback to its DB date if available, otherwise calc
    if (ep?.isExisting && ep.release_date) {
        // Return existing date unless we want to force reschedule
        return new Date(ep.release_date);
    }

    return runningDate;
  };

  const handleMagicWrite = async () => {
    if (!title) {
        addToast({ type: 'warning', message: 'Please enter a title first.' });
        return;
    }
    setIsGeneratingDesc(true);
    try {
        const generated = await generateEnhancedDescription(title, desc, thumb);
        setDesc(generated);
        addToast({ type: 'success', message: 'Description generated!' });
    } catch (err: any) {
        console.error(err);
        addToast({ type: 'error', message: 'AI generation failed. Try again.' });
    } finally {
        setIsGeneratingDesc(false);
    }
  };

  const processEpisodes = async (seriesId: string) => {
    for (let i = 0; i < episodes.length; i++) {
      const ep = episodes[i];
      const epNum = i + 1; // 1-based index determined by current list order

      // 1. Handle Existing Episodes (Update Metadata & Order)
      if (ep.isExisting) {
          // Update DB entry
          await supabase.from('series_episodes').update({
              title: ep.title,
              description: ep.desc,
              episode_number: epNum
              // Note: We don't auto-update release_date for existing to avoid accidental rescheduling
              // unless we implement a "Reschedule All" toggle.
          }).eq('id', ep.id);
          
          continue; // Done with this one
      }

      // 2. Handle New Episodes (Upload & Insert)
      if (ep.status === 'ready') continue; // Should not happen for !isExisting unless retrying?
      if (!ep.file && !ep.video_id) continue;

      setEpisodes(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'uploading', progress: 5 } : e));
      
      try {
        let videoUrl = '';
        let thumbnailUrl = ep.thumbPreview || null;

        // Upload Thumbnail
        if (ep.thumbFile) {
           const thumbPath = `${user.id}/series/${seriesId}/thumbs/${Date.now()}_${ep.thumbFile.name}`;
           const { error: thumbErr } = await supabase.storage.from('thumbnail-assets').upload(thumbPath, ep.thumbFile);
           if (!thumbErr) {
              const { data } = supabase.storage.from('thumbnail-assets').getPublicUrl(thumbPath);
              thumbnailUrl = data.publicUrl;
           }
        }

        // Upload Video
        if (ep.file) {
            const filePath = `${user.id}/series/${seriesId}/${Date.now()}_${ep.file.name}`;
            const { error: upErr } = await supabase.storage.from('videos').upload(filePath, ep.file);
            if (upErr) throw upErr;
            
            setEpisodes(prev => prev.map((e, idx) => idx === i ? { ...e, progress: 60 } : e));
            
            const { data } = supabase.storage.from('videos').getPublicUrl(filePath);
            videoUrl = data.publicUrl;
        }

        // Create Video Entry
        const { data: vid, error: vidErr } = await supabase.from('videos').insert([{
          user_id: user.id,
          title: ep.title,
          description: ep.desc,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl || thumb,
          visibility: visibility, 
          rating: rating,
          category: 'Series',
          max_quality: '1080p',
          duration: '0:00',
          processing_status: 'ready' // Assume ready for series
        }]).select().single();

        if (vidErr) throw vidErr;

        // Determine Release Date for New Ep
        // For new eps, we calculate based on position relative to start or last ep?
        // Simple strategy: Calculate based on index in the WHOLE list
        const release = ep.customDate 
            ? new Date(`${ep.customDate}T${releaseTime}`) 
            : calculateReleaseDate(i); // Use the unified calculator

        await supabase.from('series_episodes').insert([{
          series_id: seriesId,
          video_id: vid.id,
          episode_number: epNum,
          title: ep.title,
          description: ep.desc,
          thumbnail_url: thumbnailUrl,
          release_date: release.toISOString(),
          status: 'scheduled'
        }]);

        // Premiere
        await supabase.from('premieres').insert([{
            video_id: vid.id,
            start_time: release.toISOString(),
            status: 'scheduled'
        }]);

        setEpisodes(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'ready', progress: 100, isExisting: true } : e));

      } catch (err) {
        console.error(err);
        addToast({ type: 'error', title: 'Upload Failed', message: `Failed to upload episode ${i+1}` });
      }
    }
  };

  const handleSubmit = async () => {
    if (!title) {
      addToast({ type: 'error', message: 'Title is required' });
      return;
    }
    setIsSubmitting(true);

    try {
      // 1. Create/Update Series
      let sId = existingSeries?.id;
      
      const seriesPayload = {
        user_id: user.id,
        title,
        description: desc,
        thumbnail_url: thumb,
        visibility,
        rating,
        status: 'active'
      };

      if (sId) {
        await supabase.from('series').update(seriesPayload).eq('id', sId);
      } else {
        const { data, error } = await supabase.from('series').insert([seriesPayload]).select().single();
        if (error) throw error;
        sId = data.id;
      }

      // 2. Save Schedule
      await supabase.from('series_schedule').upsert({
        series_id: sId,
        timezone,
        cadence: cadence === 'biweekly' || cadence === 'monthly' ? 'custom' : cadence,
        day_of_week: dayOfWeek,
        release_time: releaseTime
      }, { onConflict: 'series_id' });

      // 3. Save Hero Banner if set
      if (heroBannerUrl) {
          await supabase.from('series_hero_banners').upsert({
              series_id: sId,
              enabled: true,
              banner_image_url: heroBannerUrl,
              headline: title,
              subtext: 'New Episodes Streaming Now',
              cta_text: 'Start Watching'
          }, { onConflict: 'series_id' });
      }

      // 4. Process Deletions
      if (deletedEpisodeIds.length > 0) {
          await supabase.from('series_episodes').delete().in('id', deletedEpisodeIds);
      }

      // 5. Process Episodes (Update Existing & Upload New)
      await processEpisodes(sId!);

      onSuccess();
      addToast({ type: 'success', title: 'Success', message: 'Series saved successfully.' });
      onClose();

    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4">
      {studioMode && (
          <ThumbnailStudio 
            user={user} 
            onClose={() => setStudioMode(null)} 
            onSave={(url) => { 
                if (studioMode === 'cover') setThumb(url);
                if (studioMode === 'hero') setHeroBannerUrl(url);
                setStudioMode(null);
            }} 
            initialType={studioMode === 'cover' ? 'series_cover' : 'hero'}
            relatedId={existingSeries?.id}
          />
      )}

      <div className="bg-[#0a0a0a] w-full max-w-5xl h-[90vh] border border-white/10 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Series <span className="text-brand">Manager</span></h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Create episodic content</p>
          </div>
          <button onClick={onClose}><X className="w-6 h-6 text-zinc-500 hover:text-white" /></button>
        </div>

        {/* Stepper */}
        <div className="flex border-b border-white/5 bg-black/20">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 py-4 text-center border-b-2 transition-colors ${i === currentStep ? 'border-brand text-white' : i < currentStep ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-zinc-600'}`}>
              <span className="text-[10px] font-black uppercase tracking-widest">{i + 1}. {s}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* STEP 1: METADATA */}
          {currentStep === 0 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Series Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm text-white focus:border-brand outline-none font-bold" placeholder="MY NEW SERIES" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Synopsis</label>
                        <button 
                            onClick={handleMagicWrite} 
                            disabled={isGeneratingDesc}
                            className="text-[9px] font-black text-brand uppercase tracking-widest hover:brightness-125 flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                            {isGeneratingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            {isGeneratingDesc ? 'Generating...' : desc ? 'Regenerate' : 'Magic Write'}
                        </button>
                    </div>
                    <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={5} className="w-full bg-black border border-white/10 p-3 text-sm text-white focus:border-brand outline-none resize-none" placeholder="Describe the series..." />
                  </div>
                  
                  {/* HERO BANNER SECTION */}
                  <div className="space-y-2 pt-4 border-t border-white/5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex justify-between">
                          Featured Hero Banner
                          <button onClick={() => setStudioMode('hero')} className="text-brand hover:underline flex items-center gap-1">
                              <Wand2 className="w-3 h-3" /> Create New
                          </button>
                      </label>
                      <div className="w-full aspect-[21/9] bg-black border border-white/10 relative group">
                          {heroBannerUrl ? (
                              <img src={heroBannerUrl} className="w-full h-full object-cover opacity-80" />
                          ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                                  <Layers className="w-8 h-8 mb-2" />
                                  <span className="text-[9px] font-black uppercase">No Banner Set</span>
                              </div>
                          )}
                          {heroBannerUrl && (
                              <button onClick={() => setHeroBannerUrl('')} className="absolute top-2 right-2 p-1 bg-black/50 text-white hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                          )}
                      </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex justify-between">
                        Cover Art
                        <button onClick={() => setStudioMode('cover')} className="text-brand hover:underline flex items-center gap-1">
                            <Wand2 className="w-3 h-3" /> Design Cover
                        </button>
                    </label>
                    <div className="aspect-[2/3] bg-black border-2 border-dashed border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                      {thumb ? <img src={thumb} className="w-full h-full object-cover opacity-80" /> : <Layers className="w-12 h-12 text-zinc-700" />}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 gap-2">
                         <input className="absolute inset-0 opacity-0 cursor-pointer z-10" type="file" accept="image/*" onChange={(e) => {
                           const f = e.target.files?.[0];
                           if(f) {
                             const r = new FileReader();
                             r.onload = () => setThumb(r.result as string);
                             r.readAsDataURL(f);
                           }
                         }} />
                         <button className="bg-white/10 hover:bg-white/20 px-4 py-2 text-[9px] font-black uppercase text-white border border-white/20">Upload</button>
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStudioMode('cover'); }} className="bg-brand text-white px-4 py-2 text-[9px] font-black uppercase z-20 shadow-lg">Design</button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Privacy</label>
                        <select value={visibility} onChange={(e: any) => setVisibility(e.target.value)} className="w-full bg-black border border-white/10 p-2 text-xs text-white uppercase font-bold outline-none">
                            <option value="public">Public</option>
                            <option value="unlisted">Unlisted</option>
                            <option value="private">Private</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Rating</label>
                        <select value={rating} onChange={(e: any) => setRating(e.target.value)} className="w-full bg-black border border-white/10 p-2 text-xs text-white uppercase font-bold outline-none">
                            <option value="U">Universal</option>
                            <option value="PG">PG-13</option>
                            <option value="R">Restricted</option>
                        </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SCHEDULE */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
               <div className="p-6 bg-brand/5 border border-brand/20 space-y-2">
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">Release Automation</h3>
                  <p className="text-xs text-zinc-400">Episodes will automatically unlock based on this schedule.</p>
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Release Cadence</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {['weekly', 'biweekly', 'monthly', 'custom'].map((c) => (
                        <button 
                            key={c}
                            onClick={() => setCadence(c as any)} 
                            className={`p-4 border text-center transition-all ${cadence === c ? 'bg-white/10 border-brand text-white' : 'bg-black border-white/10 opacity-60 text-zinc-500'}`}
                        >
                            <span className="text-[10px] font-black uppercase">{c}</span>
                        </button>
                     ))}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Start Date</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-white uppercase font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Release Time ({timezone})</label>
                      <input type="time" value={releaseTime} onChange={e => setReleaseTime(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-white uppercase font-bold outline-none" />
                  </div>
               </div>
            </div>
          )}

          {/* STEP 3: EPISODES */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
               <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-white uppercase">Episode List</h3>
                  <button onClick={() => epFileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-2 bg-brand text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110">
                     <Upload className="w-4 h-4" /> Bulk Add Episodes
                  </button>
                  <input type="file" multiple accept="video/*" ref={epFileInputRef} className="hidden" onChange={handleFileSelect} />
               </div>

               <div className="space-y-2">
                  {isLoadingEpisodes ? (
                      <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
                  ) : episodes.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-white/10">
                       <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No episodes added. Upload videos to begin.</p>
                    </div>
                  ) : (
                    episodes.map((ep, idx) => (
                      <div key={ep.id} className="bg-[#111] border border-white/5 p-4 flex gap-6 items-start group">
                         <div className="flex flex-col items-center gap-2 pt-1">
                            <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                                {idx + 1}
                            </div>
                            <div className="flex flex-col">
                                <button onClick={() => moveEpisode(idx, -1)} disabled={idx === 0} className="text-zinc-600 hover:text-white disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                                <button onClick={() => moveEpisode(idx, 1)} disabled={idx === episodes.length - 1} className="text-zinc-600 hover:text-white disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                            </div>
                         </div>

                         <div className="w-32 aspect-video bg-black border border-white/10 relative group/thumb cursor-pointer">
                            {ep.thumbPreview ? (
                                <img src={ep.thumbPreview} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-[8px] font-black text-white uppercase">Change</span>
                            </div>
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleEpisodeThumbSelect(e, ep.id)} />
                         </div>

                         <div className="flex-1 space-y-3">
                            <div className="flex gap-4">
                                <input 
                                    value={ep.title} 
                                    onChange={e => setEpisodes(prev => prev.map(x => x.id === ep.id ? { ...x, title: e.target.value } : x))} 
                                    className="flex-1 bg-black border border-white/10 p-2 text-xs font-bold text-white outline-none" 
                                    placeholder="Episode Title" 
                                />
                                <div className="flex items-center gap-2 bg-white/5 px-3 border border-white/5">
                                    <Calendar className="w-3 h-3 text-zinc-500" />
                                    <input 
                                        type="date" 
                                        value={ep.customDate || (ep.isExisting && ep.release_date ? ep.release_date.split('T')[0] : '')} 
                                        onChange={(e) => setEpisodes(prev => prev.map(x => x.id === ep.id ? { ...x, customDate: e.target.value } : x))}
                                        className="bg-transparent text-[10px] text-white outline-none w-24"
                                    />
                                </div>
                            </div>
                            <textarea value={ep.desc} onChange={e => setEpisodes(prev => prev.map(x => x.id === ep.id ? { ...x, desc: e.target.value } : x))} className="w-full bg-black border border-white/10 p-2 text-xs text-zinc-400 outline-none resize-none" placeholder="Description" rows={2} />
                         </div>
                         
                         <div className="flex flex-col gap-2 items-center">
                             {ep.isExisting && <span className="text-[8px] font-black uppercase text-emerald-500">Live</span>}
                             <button onClick={() => handleDeleteEpisode(idx)} className="text-zinc-600 hover:text-rose-500 pt-2"><Trash2 className="w-4 h-4" /></button>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {currentStep === 3 && (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto text-center">
                <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto border border-brand/20">
                   <Check className="w-10 h-10 text-brand" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black text-white uppercase tracking-tight">Ready to Submit</h3>
                   <p className="text-sm text-zinc-400">You are about to {existingSeries ? 'update' : 'create'} <span className="text-white font-bold">"{title}"</span>.</p>
                </div>
                <div className="bg-[#111] p-6 border border-white/5 text-left space-y-4">
                   <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 uppercase font-bold">First Release</span>
                      <span className="text-white font-bold uppercase">{calculateReleaseDate(0).toLocaleDateString()} @ {releaseTime}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 uppercase font-bold">Visibility</span>
                      <span className="text-white font-bold uppercase">{visibility}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 uppercase font-bold">Total Content</span>
                      <span className="text-white font-bold uppercase">{episodes.length} Videos</span>
                   </div>
                   {deletedEpisodeIds.length > 0 && (
                       <div className="flex justify-between text-xs text-rose-500">
                           <span className="uppercase font-bold">Deleting</span>
                           <span className="font-bold uppercase">{deletedEpisodeIds.length} Episodes</span>
                       </div>
                   )}
                </div>
                <p className="text-[10px] text-zinc-600 font-bold uppercase">Note: Uploads will begin immediately after submission. Do not close the window.</p>
             </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 flex justify-between bg-black/40">
           <button 
             onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
             disabled={currentStep === 0 || isSubmitting}
             className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white disabled:opacity-30 flex items-center gap-2"
           >
             <ChevronLeft className="w-4 h-4" /> Back
           </button>

           {currentStep < 3 ? (
             <button 
               onClick={() => setCurrentStep(currentStep + 1)}
               className="bg-white text-black px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all flex items-center gap-2"
             >
               Next <ChevronRight className="w-4 h-4" />
             </button>
           ) : (
             <button 
               onClick={handleSubmit}
               disabled={isSubmitting}
               className="bg-brand text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand/20 hover:brightness-110 flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
             >
               {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
               {isSubmitting ? `Processing...` : 'Submit Series'}
             </button>
           )}
        </div>

      </div>
    </div>
  );
};

export default SeriesWizard;
