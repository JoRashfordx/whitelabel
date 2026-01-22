
import React, { useState, useRef } from 'react';
import { X, Upload, FileVideo, Loader2, CheckCircle2, ShieldAlert, Image as ImageIcon, Settings, Activity, Globe, EyeOff, Lock, Clock, Calendar, Wand2, ChevronRight, ChevronLeft, Save, Film, Tag, AlertCircle } from 'lucide-react';
import { User, VideoRating, VideoVisibility } from '../types';
import { supabase } from '../services/supabase';
import { generateEnhancedDescription } from '../services/ai';
import { useToast } from '../contexts/ToastContext';
import ThumbnailStudio from './ThumbnailStudio';

interface UploadModalProps {
  user: User | null;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

const CATEGORIES = [
  'Vlog', 'Travel', 'Gaming', 'Music', 'Sports', 'DIY', 'Tutorial', 
  'Beauty', 'ASMR', 'Finance', 'Adventure', 'Lifestyle'
];

const RATINGS: { value: VideoRating; label: string; desc: string }[] = [
  { value: 'U', label: 'Universal', desc: 'Suitable for all ages' },
  { value: 'PG', label: 'Parental Guidance', desc: 'Recommended for children over 13' },
  { value: 'R', label: 'Restricted (18+)', desc: 'Adult content' },
];

const VISIBILITY_OPTIONS: { value: VideoVisibility; label: string; icon: any; desc: string }[] = [
  { value: 'public', label: 'Public', icon: Globe, desc: 'Anyone can search and view' },
  { value: 'unlisted', label: 'Unlisted', icon: EyeOff, desc: 'Only people with the link can view' },
  { value: 'private', label: 'Private', icon: Lock, desc: 'Only you can see this video' },
];

const STEPS = ['Details', 'Visuals', 'Audience', 'Publish'];

const UploadModal: React.FC<UploadModalProps> = ({ user, onClose, onUploadSuccess }) => {
  const { addToast } = useToast();
  
  // -- STATE --
  const [currentStep, setCurrentStep] = useState(0);
  
  // Data State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [rating, setRating] = useState<VideoRating>('U');
  const [visibility, setVisibility] = useState<VideoVisibility>('public');
  const [hashtags, setHashtags] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  
  // Premiere Logic
  const [isPremiere, setIsPremiere] = useState(false);
  const [premiereDate, setPremiereDate] = useState('');
  const [premiereTime, setPremiereTime] = useState('');

  const [detectedMaxQuality, setDetectedMaxQuality] = useState('1080p');
  const [duration, setDuration] = useState('0:00');
  const [filmStrip, setFilmStrip] = useState<string[]>([]);
  
  // UI/Process State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);

  // -- LOGIC --

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity || seconds <= 0) return '0:01';
    const totalSeconds = Math.max(1, Math.ceil(seconds)); 
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const processVideoMetadata = async (videoFile: File) => {
    setIsProcessing(true);
    setProcessingStep('Analyzing source resolution...');
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const metadataPromise = new Promise((resolve) => {
      const handleMeta = () => {
        if (!isNaN(video.duration) && video.duration > 0) {
          setDuration(formatDuration(video.duration));
          const h = video.videoHeight;
          if (h >= 2160) setDetectedMaxQuality('4K');
          else if (h >= 1440) setDetectedMaxQuality('1440p');
          else if (h >= 1080) setDetectedMaxQuality('1080p');
          else if (h >= 720) setDetectedMaxQuality('720p');
          else setDetectedMaxQuality('480p');
          resolve(true);
        } else {
          setTimeout(handleMeta, 100);
        }
      };
      video.onloadedmetadata = handleMeta;
      setTimeout(() => resolve(true), 10000);
    });
    video.preload = 'auto';
    video.muted = true;
    video.src = URL.createObjectURL(videoFile);
    try {
      await metadataPromise;
      setProcessingStep(`Generating quality versions (Source: ${video.videoHeight}p)...`);
      const durationSecs = video.duration || 0;
      const points = [0.1, 0.3, 0.5, 0.7, 0.9];
      const frames: string[] = [];
      for (const p of points) {
        video.currentTime = durationSecs * p;
        await new Promise((res) => {
          video.onseeked = () => {
            if (ctx) {
              canvas.width = video.videoWidth / 4;
              canvas.height = video.videoHeight / 4;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              frames.push(canvas.toDataURL('image/jpeg', 0.8));
            }
            res(true);
          };
        });
      }
      setFilmStrip(frames);
    } catch (e) { console.error("Processing failed", e); } finally {
      setIsProcessing(false);
      URL.revokeObjectURL(video.src);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setTitle(selected.name.split('.')[0].replace(/[-_]/g, ' ').toUpperCase());
      processVideoMetadata(selected);
    }
  };

  const handleMagicWrite = async () => {
    if (!title) {
        addToast({ type: 'warning', message: 'Please enter a title first.' });
        return;
    }
    setIsGeneratingDesc(true);
    try {
        const imageContext = thumbnailUrl || (filmStrip.length > 0 ? filmStrip[0] : undefined);
        const generated = await generateEnhancedDescription(title, description, imageContext);
        setDescription(generated);
        addToast({ type: 'success', message: 'Description generated!' });
    } catch (err: any) {
        console.error(err);
        addToast({ type: 'error', message: 'AI generation failed. Try again.' });
    } finally {
        setIsGeneratingDesc(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !user || uploadLock.current) return;
    
    if (isPremiere && (!premiereDate || !premiereTime)) {
        return setError("Please select a date and time for the premiere.");
    }

    uploadLock.current = true;
    setIsUploading(true);
    setUploadProgress(10);
    try {
      const timestamp = Date.now();
      const filePath = `${user.id}/${timestamp}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, file);
      if (uploadError) throw uploadError;
      setUploadProgress(60);
      const { data: { publicUrl: videoUrl } } = supabase.storage.from('videos').getPublicUrl(filePath);
      
      // PRODUCTION UPDATE: Set to processing. Qualities generated on server (simulated in WatchView).
      const processingStatus = 'processing';
      const qualityMap = null; 

      const { data: videoData, error: dbError } = await supabase
        .from('videos')
        .insert([{
          user_id: user.id,
          title: title.trim(),
          description: description || null,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl || (filmStrip[2] || ''),
          visibility,
          category,
          rating,
          hashtags: hashtags.split(/[ ,]+/).map(h => h.replace('#', '').trim()).filter(Boolean),
          max_quality: detectedMaxQuality,
          quality_urls: qualityMap,
          processing_status: processingStatus, // INITIAL STATE
          duration: duration
        }])
        .select()
        .single();
        
      if (dbError) throw dbError;

      if (isPremiere && videoData) {
          const startTime = new Date(`${premiereDate}T${premiereTime}`).toISOString();
          const { error: premError } = await supabase.from('premieres').insert([{
              video_id: videoData.id,
              start_time: startTime,
              status: 'scheduled'
          }]);
          if (premError) throw premError;
      }

      setUploadProgress(100);
      setSuccess(true);
      if (onUploadSuccess) onUploadSuccess();
      setTimeout(onClose, 2500);
    } catch (err: any) {
      setError(err.message || 'Processing failed');
      setIsUploading(false);
      uploadLock.current = false;
    }
  };

  // -- RENDER STEPS --

  const renderStepDetails = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        {!file ? (
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 hover:border-brand/40 transition-all cursor-pointer py-24 flex flex-col items-center justify-center bg-white/5 group rounded-lg">
                <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl border border-white/5">
                    <FileVideo className="w-8 h-8 text-zinc-400 group-hover:text-brand transition-colors" />
                </div>
                <p className="text-white font-black uppercase tracking-widest text-sm mb-2">Select Video File</p>
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Supports MP4, MOV, MKV up to 4K</p>
                <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
            </div>
        ) : (
            <>
                <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-lg">
                    <div className="w-12 h-12 bg-black flex items-center justify-center rounded border border-white/10 text-brand">
                        <FileVideo className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white truncate">{file.name}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">{(file.size / (1024 * 1024)).toFixed(1)} MB • {detectedMaxQuality}</p>
                    </div>
                    <button onClick={() => { setFile(null); setTitle(''); }} className="p-2 text-zinc-500 hover:text-rose-500 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Video Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black border border-white/10 py-3 px-4 text-white focus:outline-none focus:border-brand text-xs font-bold transition-all" placeholder="Enter a catchy title..." />
                    </div>
                    <div className="space-y-2 relative">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Description</label>
                            <button 
                                onClick={handleMagicWrite} 
                                disabled={isGeneratingDesc}
                                className="text-[9px] font-black text-brand uppercase tracking-widest hover:brightness-125 flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                                {isGeneratingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                {isGeneratingDesc ? 'Generating...' : description ? 'Regenerate' : 'Magic Write'}
                            </button>
                        </div>
                        <textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black border border-white/10 py-3 px-4 text-white text-xs font-medium leading-relaxed focus:outline-none focus:border-brand resize-none transition-all placeholder-zinc-700" placeholder="Describe your video..." />
                    </div>
                </div>
            </>
        )}
    </div>
  );

  const renderStepVisuals = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Thumbnail & Preview</h3>
            <div className="flex gap-2">
                <span className="px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-black uppercase text-zinc-400">{duration}</span>
                <span className="px-3 py-1 bg-brand/10 border border-brand/20 text-[9px] font-black uppercase text-brand">{detectedMaxQuality}</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Active Thumbnail</label>
                <div className="aspect-video bg-black border border-white/10 overflow-hidden relative group rounded-lg shadow-2xl">
                    {thumbnailUrl ? (
                        <img src={thumbnailUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
                            <ImageIcon size={40} />
                            <p className="text-[9px] font-black uppercase">No Thumbnail Selected</p>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={() => setIsStudioOpen(true)} className="px-4 py-2 bg-brand text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform">Edit</button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Source Frames</label>
                {isProcessing ? (
                    <div className="flex flex-col items-center justify-center h-40 bg-white/5 border border-white/5 rounded-lg">
                        <Loader2 className="w-6 h-6 text-brand animate-spin mb-4" />
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{processingStep}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                        {filmStrip.map((f, i) => (
                            <button key={i} onClick={() => setThumbnailUrl(f)} className={`relative aspect-video border transition-all overflow-hidden ${thumbnailUrl === f ? 'border-brand ring-2 ring-brand/20 opacity-100' : 'border-white/5 opacity-60 hover:opacity-100'}`}>
                                <img src={f} className="w-full h-full object-cover" alt="" />
                            </button>
                        ))}
                    </div>
                )}
                
                <div className="pt-4 border-t border-white/5">
                    <div className="flex gap-3">
                        <button onClick={() => setIsStudioOpen(true)} className="flex-1 py-3 bg-brand/10 hover:bg-brand border border-brand/20 text-brand hover:text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                            <Wand2 className="w-3 h-3" /> Studio
                        </button>
                        <button onClick={() => thumbInputRef.current?.click()} className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                            <Upload className="w-3 h-3" /> Custom Upload
                        </button>
                        <input type="file" ref={thumbInputRef} className="hidden" accept="image/*" onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                                const reader = new FileReader();
                                reader.onload = () => setThumbnailUrl(reader.result as string);
                                reader.readAsDataURL(f);
                            }
                        }} />
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  const renderStepAudience = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
        <div className="space-y-4">
            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Content Category</label>
            <div className="grid grid-cols-3 gap-3">
                {CATEGORIES.map(c => (
                    <button 
                        key={c} 
                        onClick={() => setCategory(c)}
                        className={`py-3 text-[10px] font-black uppercase tracking-wider border transition-all ${category === c ? 'bg-white text-black border-white' : 'bg-black border-white/10 text-zinc-500 hover:text-white hover:border-white/30'}`}
                    >
                        {c}
                    </button>
                ))}
            </div>
        </div>

        <div className="space-y-4">
            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1 flex items-center gap-2">
                <Settings size={12} className="text-brand" /> Content Rating
            </label>
            <div className="grid grid-cols-1 gap-3">
                {RATINGS.map(r => (
                    <button 
                        key={r.value} 
                        onClick={() => setRating(r.value)} 
                        className={`flex items-start gap-4 p-4 border transition-all text-left group ${rating === r.value ? 'bg-brand/5 border-brand' : 'bg-black border-white/10 hover:bg-white/5'}`}
                    >
                        <div className={`w-8 h-8 flex items-center justify-center border font-black text-xs ${rating === r.value ? 'border-brand text-brand' : 'border-zinc-700 text-zinc-700 group-hover:border-zinc-500 group-hover:text-zinc-500'}`}>
                            {r.value}
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${rating === r.value ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`}>{r.label}</p>
                            <p className="text-[9px] font-medium text-zinc-600 mt-1">{r.desc}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1 flex items-center gap-2">
                <Tag size={12} /> Hashtags
            </label>
            <input type="text" value={hashtags} onChange={(e) => setHashtags(e.target.value)} className="w-full bg-black border border-white/10 py-3 px-4 text-white focus:outline-none focus:border-brand text-xs font-bold transition-all" placeholder="#gaming #vlog #viral" />
        </div>
    </div>
  );

  const renderStepPublish = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
        <div className="space-y-4">
            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Visibility</label>
            <div className="grid grid-cols-1 gap-2">
                {VISIBILITY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setVisibility(opt.value)} className={`w-full text-left p-4 border transition-all flex items-center gap-4 ${visibility === opt.value ? 'bg-white text-black border-white' : 'bg-black border-white/10 text-zinc-500 hover:border-white/30 hover:text-white'}`}>
                        <opt.icon className={`w-5 h-5 ${visibility === opt.value ? 'text-black' : 'text-zinc-600'}`} />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">{opt.label}</p>
                            <p className={`text-[8px] font-bold mt-0.5 uppercase ${visibility === opt.value ? 'text-zinc-500' : 'text-zinc-700'}`}>{opt.desc}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        <div className={`p-6 border transition-all ${isPremiere ? 'bg-brand/5 border-brand' : 'bg-black border-white/10'}`}>
            <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isPremiere ? 'text-brand' : 'text-zinc-400'}`}>
                    <Clock className="w-4 h-4" /> Schedule Premiere
                </span>
                <div className="relative inline-block w-10 h-5 align-middle select-none">
                    <input type="checkbox" checked={isPremiere} onChange={(e) => setIsPremiere(e.target.checked)} className="absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-5 transition-all duration-300" />
                    <label onClick={() => setIsPremiere(!isPremiere)} className={`block overflow-hidden h-5 rounded-full cursor-pointer transition-colors ${isPremiere ? 'bg-brand' : 'bg-zinc-800'}`}></label>
                </div>
            </div>
            
            {isPremiere && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                    <div className="space-y-1">
                        <label className="text-[8px] font-bold text-zinc-500 uppercase">Date</label>
                        <input type="date" value={premiereDate} onChange={(e) => setPremiereDate(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-xs text-white uppercase font-bold focus:border-brand outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-bold text-zinc-500 uppercase">Time</label>
                        <input type="time" value={premiereTime} onChange={(e) => setPremiereTime(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-xs text-white uppercase font-bold focus:border-brand outline-none" />
                    </div>
                    <p className="col-span-2 text-[9px] text-zinc-500 font-bold uppercase flex items-center gap-2 mt-2">
                        <AlertCircle className="w-3 h-3 text-brand" /> A watch page will be created immediately. Chat opens automatically.
                    </p>
                </div>
            )}
        </div>
    </div>
  );

  // -- MAIN UI --

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg">
      {isStudioOpen && user && (
        <ThumbnailStudio user={user} onClose={() => setIsStudioOpen(false)} onSave={setThumbnailUrl} />
      )}
      
      <div className="bg-[#0c0c0c] w-full max-w-5xl h-[85vh] border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* HEADER */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Upload <span className="text-brand">Video</span></h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        {/* LOADING / SUCCESS STATE OVERRIDES */}
        {isUploading || success ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-8 animate-in fade-in">
                {success ? (
                    <>
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mb-4">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                        </div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Upload Complete</h3>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Your video is entering the processing queue.</p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest mt-4">
                            <Loader2 className="w-3 h-3 animate-spin" /> Processing Started
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-full max-w-md space-y-2">
                            <div className="flex justify-between text-[10px] font-black text-brand uppercase tracking-widest mb-2">
                                <span>Uploading & Processing</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-1 bg-zinc-900 w-full overflow-hidden rounded-full">
                                <div className="h-full bg-brand transition-all duration-300 ease-out" style={{width: `${uploadProgress}%`}} />
                            </div>
                        </div>
                        <p className="text-zinc-600 text-[10px] font-bold uppercase animate-pulse">Do not close this window</p>
                    </>
                )}
                {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest">{error}</div>}
            </div>
        ) : (
            <>
                {/* STEPPER */}
                <div className="flex border-b border-white/5 bg-black/20">
                    {STEPS.map((s, i) => {
                        const isActive = i === currentStep;
                        const isCompleted = i < currentStep;
                        return (
                            <div key={s} className={`flex-1 py-4 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${isActive ? 'border-brand text-white' : isCompleted ? 'border-emerald-500/50 text-emerald-500' : 'border-transparent text-zinc-700'}`}>
                                {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <span className={`text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ${isActive ? 'bg-brand text-white' : 'bg-zinc-800 text-zinc-500'}`}>{i + 1}</span>}
                                <span className="text-[10px] font-black uppercase tracking-widest">{s}</span>
                            </div>
                        );
                    })}
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-8 bg-[#0c0c0c]">
                    {currentStep === 0 && renderStepDetails()}
                    {currentStep === 1 && renderStepVisuals()}
                    {currentStep === 2 && renderStepAudience()}
                    {currentStep === 3 && renderStepPublish()}
                </div>

                {/* FOOTER */}
                <div className="p-6 border-t border-white/10 flex justify-between bg-[#0a0a0a]">
                    <button 
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                        className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${currentStep === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <ChevronLeft className="w-4 h-4" /> Back
                    </button>

                    {currentStep < STEPS.length - 1 ? (
                        <button 
                            onClick={() => setCurrentStep(currentStep + 1)}
                            disabled={!file}
                            className="bg-white text-black px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all flex items-center gap-2 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button 
                            onClick={handleUpload}
                            disabled={!file}
                            className="bg-brand text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand/20 hover:brightness-110 flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
                        >
                            {isPremiere ? <Clock className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                            {isPremiere ? 'Schedule Premiere' : 'Upload Video'}
                        </button>
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
