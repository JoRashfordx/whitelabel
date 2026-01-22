import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, Camera, Loader2, Play, Eye, Clock, X, 
  Trash2, Twitter, Instagram, Youtube, Globe, Mail, Layers, Image as ImageIcon, BellRing, BellOff, Lock,
  PenTool, Monitor, Edit, Activity, Heart, Star, ShieldCheck, Settings, Facebook, Ghost, Twitch, ListVideo
} from 'lucide-react';
import { User, Profile, Video, Series, VideoRating, Premiere, DesignProject, Playlist } from '../types';
import { supabase } from '../services/supabase';
import Cropper from 'react-easy-crop';
import CommunityView from './CommunityView';
import SeriesCard from './SeriesCard';
import Vidfree_videocard from './Vidfree_videocard';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import ThumbnailStudio from './ThumbnailStudio';

interface ChannelViewProps {
  user: User | null;
  profile: Profile | null;
  onRefreshProfile: () => void;
  onVideoSelect: (video: Video) => void;
  onSeriesSelect: (seriesId: string) => void;
  refreshTrigger: number;
  onOpenMessages?: (recipientId: string) => void;
  allowedRatings: VideoRating[];
  initialTab?: string;
  onManageChannel?: () => void;
  onPlaylistSelect?: (playlistId: string) => void; // New prop
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const getCroppedImg = async (imageSrc: string, pixelCrop: CropArea) => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => { image.onload = resolve; });
  
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return null;
  
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/jpeg', 0.95);
  });
};

const ChannelView: React.FC<ChannelViewProps> = ({ 
  user, profile, onRefreshProfile, onVideoSelect, onSeriesSelect, refreshTrigger, onOpenMessages, allowedRatings, initialTab, onManageChannel, onPlaylistSelect
}) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'VIDEOS' | 'SERIES' | 'PLAYLISTS' | 'COMMUNITY' | 'ABOUT' | 'LIBRARY'>('VIDEOS');
  const [videos, setVideos] = useState<(Video & { premiere?: Premiere })[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [projectsList, setProjectsList] = useState<DesignProject[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  
  const [optimisticSubCount, setOptimisticSubCount] = useState(0);
  const [videoSort, setVideoSort] = useState<'recent' | 'popular' | 'oldest'>('recent');
  const [seriesSort, setSeriesSort] = useState<'recent' | 'popular' | 'oldest'>('recent');

  const [bannerFile, setBannerFile] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'banner' | 'avatar' | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<DesignProject | null>(null);
  
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isOwner = user?.id === profile?.id;

  useEffect(() => {
    if (initialTab && ['VIDEOS', 'SERIES', 'PLAYLISTS', 'COMMUNITY', 'ABOUT', 'LIBRARY'].includes(initialTab)) {
        setActiveTab(initialTab as any);
    }
  }, [initialTab]);

  useEffect(() => {
    if (profile) {
      setCurrentBannerUrl(profile.banner_url);
      setCurrentAvatarUrl(profile.avatar_url);
      setOptimisticSubCount(profile.subscribers_count || 0);
      fetchContent();
      if (isOwner) fetchProjects();
      checkSubscription();
    }
  }, [profile?.id, profile?.banner_url, profile?.avatar_url, profile?.subscribers_count, refreshTrigger, isOwner]);

  const fetchContent = async () => {
    if (!profile) return;
    setLoading(true);
    
    // Videos
    const { data: vData } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', profile.id)
      .neq('category', 'Series') 
      .order('created_at', { ascending: false });
      
    if (vData) {
        const videoIds = vData.map(v => v.id);
        const { data: pData } = await supabase.from('premieres').select('*').in('video_id', videoIds);
        const pMap = (pData || []).reduce((acc: any, p: any) => { acc[p.video_id] = p; return acc; }, {});
        const merged = vData.map(v => ({ ...v, premiere: pMap[v.id] }));
        
        const filtered = merged.filter(v => {
           if (v.visibility === 'private' && !isOwner) return false;
           if (v.visibility === 'unlisted' && !isOwner) return false;
           if (v.processing_status !== 'ready' && !isOwner) return false;
           if (!isOwner && !allowedRatings.includes(v.rating as VideoRating)) return false;
           return true;
        });
        setVideos(filtered);
    }

    // Series
    const { data: sData } = await supabase
        .from('series')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

    if (sData) {
        const filteredSeries = sData.filter((s: Series) => {
            if (s.status === 'draft' && !isOwner) return false;
            if (s.visibility === 'private' && !isOwner) return false;
            if (!isOwner && !allowedRatings.includes(s.rating as VideoRating)) return false;
            return true;
        });
        setSeriesList(filteredSeries);
    }

    // Playlists
    const { data: plData } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
    
    if (plData) {
        const visiblePlaylists = plData.filter((p: Playlist) => {
            if (p.type === 'watch_later' && !isOwner) return false;
            if (p.visibility === 'private' && !isOwner) return false;
            return true;
        });
        
        // Enrich with counts
        for (const pl of visiblePlaylists) {
            const { count } = await supabase.from('playlist_items').select('*', { count: 'exact', head: true }).eq('playlist_id', pl.id);
            pl.video_count = count || 0;
        }
        setPlaylists(visiblePlaylists);
    }

    setLoading(false);
  };

  const fetchProjects = async () => {
      if (!profile) return;
      const { data } = await supabase.from('design_projects').select('*').eq('user_id', profile.id).order('updated_at', { ascending: false });
      if (data) setProjectsList(data as DesignProject[]);
  };

  const getSortedVideos = () => {
      const v = [...videos];
      if (videoSort === 'recent') return v.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (videoSort === 'oldest') return v.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (videoSort === 'popular') return v.sort((a,b) => b.views_count - a.views_count);
      return v;
  };

  const getSortedSeries = () => {
      const s = [...seriesList];
      if (seriesSort === 'recent') return s.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (seriesSort === 'oldest') return s.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (seriesSort === 'popular') return s.sort((a,b) => (b.likes_count || 0) - (a.likes_count || 0));
      return s;
  };

  const checkSubscription = async () => {
    if (!user || !profile || isOwner) return;
    const { data } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('subscriber_id', user.id)
      .eq('creator_id', profile.id)
      .maybeSingle();
    setIsSubscribed(!!data);
  };

  const handleSubscribe = async () => {
    if (!user) {
        addToast({ type: 'info', title: 'Sign In', message: 'Please sign in to subscribe.' });
        return;
    }
    if (isOwner || isSubscribing) return;

    const previousState = isSubscribed;
    const previousCount = optimisticSubCount;

    setIsSubscribing(true);
    setIsSubscribed(!previousState);
    setOptimisticSubCount(prev => previousState ? Math.max(0, prev - 1) : prev + 1);

    try {
        let error;
        if (previousState) {
            const res = await supabase.from('subscriptions').delete().eq('subscriber_id', user.id).eq('creator_id', profile!.id);
            error = res.error;
        } else {
            const res = await supabase.from('subscriptions').insert([{ subscriber_id: user.id, creator_id: profile!.id }]);
            error = res.error;
        }
        
        if (error) throw error;
        setTimeout(onRefreshProfile, 500); 
    } catch (err: any) {
        console.error("Subscription Error:", err);
        const msg = err.code === '42703' ? 'Database schema error. Please refresh.' : err.message;
        addToast({ type: 'error', message: msg || 'Action failed. Please try again.' });
        setIsSubscribed(previousState);
        setOptimisticSubCount(previousCount);
    } finally {
        setIsSubscribing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'avatar') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        if (type === 'banner') setBannerFile(reader.result as string);
        else setAvatarFile(reader.result as string);
        setCropType(type);
        setZoom(1);
      });
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Reset input
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    if ((!bannerFile && !avatarFile) || !croppedAreaPixels || !user || !profile) return;
    setIsUploadingImage(true);
    
    try {
      const src = cropType === 'banner' ? bannerFile : avatarFile;
      const blob = await getCroppedImg(src!, croppedAreaPixels);
      if (!blob) throw new Error('Canvas is empty');

      const fileName = `${user.id}/${cropType}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('profile-assets')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-assets')
        .getPublicUrl(fileName);

      const updates: any = {};
      if (cropType === 'banner') {
        updates.banner_url = publicUrl;
        setCurrentBannerUrl(publicUrl); 
      } else {
        updates.avatar_url = publicUrl;
        setCurrentAvatarUrl(publicUrl); 
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      addToast({ type: 'success', message: `${cropType === 'banner' ? 'Banner' : 'Avatar'} updated!` });
      onRefreshProfile();
      
      setBannerFile(null);
      setAvatarFile(null);
      setCropType(null);
    } catch (error: any) {
      console.error('Error saving image:', error);
      addToast({ type: 'error', message: 'Failed to update image' });
    } finally {
        setIsUploadingImage(false);
    }
  };

  const handleDeleteImage = async (type: 'banner' | 'avatar') => {
    if (!user || !profile) return;
    if (!(await confirm({ 
        title: `Remove ${type}?`, 
        description: 'Are you sure you want to remove this image?', 
        confirmText: 'Remove', 
        variant: 'danger' 
    }))) return;

    try {
        const updates: any = {};
        if (type === 'banner') {
            updates.banner_url = null;
            setCurrentBannerUrl(null);
        } else {
            updates.avatar_url = null;
            setCurrentAvatarUrl(null);
        }

        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        if (error) throw error;

        addToast({ type: 'success', message: `${type} removed.` });
        onRefreshProfile();
    } catch (err: any) {
        addToast({ type: 'error', message: err.message });
    }
  };

  const handleDeleteSeries = async (seriesId: string) => {
    if (!isOwner) return;
    if (!(await confirm({ title: 'Delete Series?', description: 'Permanently delete this series?', confirmText: 'Delete', variant: 'danger' }))) return;
    
    const { error } = await supabase.from('series').delete().eq('id', seriesId);
    if (!error) {
        setSeriesList(prev => prev.filter(s => s.id !== seriesId));
        addToast({ type: 'success', message: 'Series deleted.' });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!isOwner) return;
    if (!(await confirm({ title: 'Delete Project?', description: 'Delete this design project?', confirmText: 'Delete', variant: 'danger' }))) return;

    const { error } = await supabase.from('design_projects').delete().eq('id', projectId);
    if (!error) {
        setProjectsList(prev => prev.filter(p => p.id !== projectId));
        addToast({ type: 'success', message: 'Project deleted.' });
    }
  };

  if (!profile) return null;

  const displayName = profile.display_preference === 'name' 
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username 
    : profile.alias || profile.username;

  const sortedVideos = getSortedVideos();
  const sortedSeries = getSortedSeries();
  const socialLinks = profile.social_links || {};
  const hasSocials = socialLinks.twitter || socialLinks.instagram || socialLinks.youtube || socialLinks.website || socialLinks.facebook || socialLinks.snapchat || socialLinks.twitch;

  return (
    <div className="min-h-screen pb-20 bg-black">
       {/* CROPPER MODAL - (Existing code for cropper) */}
       {(bannerFile || avatarFile) && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-4xl h-[60vh] bg-[#111] border border-white/10 rounded-lg overflow-hidden">
                <Cropper
                    image={bannerFile || avatarFile || ''}
                    crop={crop}
                    zoom={zoom}
                    aspect={cropType === 'banner' ? 16 / 3.5 : 1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                />
            </div>
            <div className="flex gap-4 mt-6">
                <button 
                    onClick={() => { setBannerFile(null); setAvatarFile(null); setCropType(null); }}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded transition-all"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSaveCrop}
                    disabled={isUploadingImage}
                    className="px-8 py-3 bg-brand hover:brightness-110 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-lg transition-all flex items-center gap-2"
                >
                    {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Update'}
                </button>
            </div>
            <div className="mt-4 w-64">
                <input 
                    type="range" 
                    min={1} 
                    max={3} 
                    step={0.1} 
                    value={zoom} 
                    onChange={(e) => setZoom(Number(e.target.value))} 
                    className="w-full accent-brand h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        </div>
       )}

       {/* BANNER SECTION */}
       <div className="group relative w-full aspect-[16/4] md:aspect-[16/3.5] bg-zinc-900 overflow-hidden">
           {currentBannerUrl ? (
               <img src={currentBannerUrl} className="w-full h-full object-cover" alt="Channel Banner" />
           ) : (
               <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-700">
                   <ImageIcon className="w-12 h-12 opacity-20" />
               </div>
           )}
           
           <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

           {isOwner && (
               <div className="absolute top-4 right-4 z-40 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => bannerInputRef.current?.click()} className="bg-black/60 hover:bg-black text-white p-2 rounded-full backdrop-blur-md border border-white/10 transition-colors">
                       <Camera className="w-5 h-5" />
                   </button>
                   {currentBannerUrl && (
                       <button onClick={() => handleDeleteImage('banner')} className="bg-black/60 hover:bg-rose-600 text-white p-2 rounded-full backdrop-blur-md border border-white/10 transition-colors">
                           <Trash2 className="w-5 h-5" />
                       </button>
                   )}
                   <input type="file" ref={bannerInputRef} hidden accept="image/*" onChange={(e) => handleFileSelect(e, 'banner')} />
               </div>
           )}

           <div className="absolute inset-x-0 bottom-0 z-20 w-full pointer-events-none">
                <div className="max-w-[1920px] mx-auto px-4 sm:px-8 pb-14 md:pb-3 flex flex-col md:flex-row items-end">
                    <div className="w-full flex flex-col md:block items-center md:items-start">
                        <div className="md:ml-[11.5rem] text-center md:text-left pointer-events-auto">
                            {/* OVERLAY TEXT: Forced White & Shadow */}
                            <h1 className="font-black text-always-white uppercase tracking-tight flex items-center justify-center md:justify-start gap-2 drop-shadow-md text-3xl md:text-5xl leading-none">
                                {displayName}
                                <CheckCircle2 className="w-6 h-6 text-brand fill-white/10" />
                            </h1>
                        </div>
                    </div>
                </div>
           </div>
           
           {hasSocials && (
               <div className="absolute bottom-4 right-4 md:bottom-4 md:right-8 z-30 flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-2xl hover:bg-black/60 transition-colors">
                   {socialLinks.website && <a href={socialLinks.website.startsWith('http') ? socialLinks.website : `https://${socialLinks.website}`} target="_blank" className="text-zinc-300 hover:text-white transition-colors"><Globe className="w-4 h-4" /></a>}
                   {socialLinks.twitter && <a href={`https://twitter.com/${socialLinks.twitter.replace('@','')}`} target="_blank" className="text-zinc-300 hover:text-[#1DA1F2] transition-colors"><Twitter className="w-4 h-4" /></a>}
                   {socialLinks.instagram && <a href={`https://instagram.com/${socialLinks.instagram.replace('@','')}`} target="_blank" className="text-zinc-300 hover:text-[#E1306C] transition-colors"><Instagram className="w-4 h-4" /></a>}
                   {socialLinks.youtube && <a href={socialLinks.youtube.startsWith('http') ? socialLinks.youtube : `https://youtube.com/${socialLinks.youtube}`} target="_blank" className="text-zinc-300 hover:text-[#FF0000] transition-colors"><Youtube className="w-4 h-4" /></a>}
                   {socialLinks.facebook && <a href={socialLinks.facebook.startsWith('http') ? socialLinks.facebook : `https://facebook.com/${socialLinks.facebook}`} target="_blank" className="text-zinc-300 hover:text-[#1877F2] transition-colors"><Facebook className="w-4 h-4" /></a>}
                   {socialLinks.snapchat && <a href={`https://snapchat.com/add/${socialLinks.snapchat}`} target="_blank" className="text-zinc-300 hover:text-[#FFFC00] transition-colors"><Ghost className="w-4 h-4" /></a>}
                   {socialLinks.twitch && <a href={socialLinks.twitch.startsWith('http') ? socialLinks.twitch : `https://twitch.tv/${socialLinks.twitch}`} target="_blank" className="text-zinc-300 hover:text-[#9146FF] transition-colors"><Twitch className="w-4 h-4" /></a>}
               </div>
           )}
       </div>

       {/* CHANNEL INFO BAR */}
       <div className="max-w-[1920px] mx-auto px-4 sm:px-8">
           <div className="flex flex-col md:flex-row items-start gap-6 relative">
               
               {/* Avatar */}
               <div className="relative -mt-12 md:-mt-16 shrink-0 group z-20 mx-auto md:mx-0">
                   <div className="w-32 h-32 md:w-40 md:h-40 bg-black p-1 shadow-2xl relative overflow-hidden rounded-sm">
                       <img src={currentAvatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${profile.id}`} className="w-full h-full object-cover bg-zinc-800" alt="Avatar" />
                       {isOwner && (
                           <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => avatarInputRef.current?.click()} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm"><Camera className="w-5 h-5" /></button>
                               {currentAvatarUrl && <button onClick={() => handleDeleteImage('avatar')} className="p-2 bg-rose-500/20 hover:bg-rose-500 rounded-full text-white backdrop-blur-sm"><Trash2 className="w-5 h-5" /></button>}
                           </div>
                       )}
                   </div>
                   {isOwner && <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={(e) => handleFileSelect(e, 'avatar')} />}
               </div>

               {/* Text Info */}
               <div className="flex-1 pt-2 md:pt-0 text-center md:text-left min-w-0 w-full">
                   <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                       <div className="space-y-3 md:space-y-1 w-full mt-1">
                           <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-zinc-400 font-bold uppercase tracking-wide">
                               <span className="text-white">@{profile.username?.replace('@', '')}</span>
                               <span className="text-zinc-600">•</span>
                               <span key={optimisticSubCount} className="animate-in fade-in">{optimisticSubCount.toLocaleString()} subscribers</span>
                               <span className="text-zinc-600">•</span>
                               <span>{videos.length} videos</span>
                           </div>
                           {profile.bio && <p className="text-sm text-zinc-400 max-w-3xl line-clamp-2 leading-relaxed font-light mx-auto md:mx-0">{profile.bio}</p>}
                       </div>

                       <div className="flex flex-col items-center md:items-end gap-4 shrink-0 mx-auto md:mx-0 mt-4 md:mt-0">
                           <div className="flex items-center gap-3">
                               {isOwner ? (
                                   <button onClick={onManageChannel} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all">Manage Channel</button>
                               ) : (
                                   <>
                                       <button onClick={handleSubscribe} disabled={isSubscribing} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isSubscribed ? 'bg-white/10 text-zinc-300 hover:bg-white/20' : 'bg-brand text-white hover:brightness-110'} disabled:opacity-50`}>
                                           {isSubscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSubscribed ? <><BellOff size={14} /> Subscribed</> : <><BellRing size={14} /> Subscribe</>}
                                       </button>
                                       {onOpenMessages && <button onClick={() => onOpenMessages(profile.id)} className="p-3 border border-white/10 text-white hover:bg-white/10 transition-colors"><Mail className="w-4 h-4" /></button>}
                                   </>
                               )}
                           </div>
                       </div>
                   </div>
               </div>
           </div>

           {/* TABS */}
           <div className="flex items-center gap-8 border-b border-white/10 mt-10 overflow-x-auto scrollbar-hide">
               {['VIDEOS', 'SERIES', 'PLAYLISTS', 'COMMUNITY', 'ABOUT', ...(isOwner ? ['LIBRARY'] : [])].map(tab => (
                   <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-brand text-white' : 'border-transparent text-zinc-500 hover:text-white'}`}
                   >
                       {tab}
                   </button>
               ))}
           </div>

           {/* CONTENT RENDER */}
           <div className="min-h-[400px] py-8">
               {activeTab === 'VIDEOS' && (
                   <>
                       <div className="flex justify-end items-center mb-6">
                           <div className="flex gap-4">
                               <button onClick={() => setVideoSort('recent')} className={`text-[10px] font-bold uppercase tracking-widest ${videoSort === 'recent' ? 'text-brand' : 'text-zinc-500 hover:text-white'}`}>Recent</button>
                               <button onClick={() => setVideoSort('popular')} className={`text-[10px] font-bold uppercase tracking-widest ${videoSort === 'popular' ? 'text-brand' : 'text-zinc-500 hover:text-white'}`}>Popular</button>
                               <button onClick={() => setVideoSort('oldest')} className={`text-[10px] font-bold uppercase tracking-widest ${videoSort === 'oldest' ? 'text-brand' : 'text-zinc-500 hover:text-white'}`}>Oldest</button>
                           </div>
                       </div>
                       
                       {/* DENSE GRID FOR CHANNEL VIDEOS */}
                       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                           {sortedVideos.map(video => (
                               <Vidfree_videocard 
                                 key={video.id}
                                 video={video}
                                 onSelect={onVideoSelect}
                                 isDense={true}
                                 showAvatar={false}
                               />
                           ))}
                           {sortedVideos.length === 0 && <div className="col-span-full py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No videos found</div>}
                       </div>
                   </>
               )}

               {activeTab === 'SERIES' && (
                   <>
                       <div className="flex justify-between items-center mb-6">
                           <h3 className="text-sm font-black text-white uppercase tracking-widest">{sortedSeries.length} Series</h3>
                           <div className="flex gap-4">
                               <button onClick={() => setSeriesSort('recent')} className={`text-[10px] font-bold uppercase tracking-widest ${seriesSort === 'recent' ? 'text-brand' : 'text-zinc-500 hover:text-white'}`}>Recent</button>
                               <button onClick={() => setSeriesSort('popular')} className={`text-[10px] font-bold uppercase tracking-widest ${seriesSort === 'popular' ? 'text-brand' : 'text-zinc-500 hover:text-white'}`}>Popular</button>
                           </div>
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                           {sortedSeries.map(s => (
                               <SeriesCard 
                                key={s.id} 
                                series={s} 
                                onClick={() => onSeriesSelect(s.id)} 
                                isOwner={isOwner}
                                onDelete={() => handleDeleteSeries(s.id)}
                               />
                           ))}
                           {sortedSeries.length === 0 && <div className="col-span-full py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No series found</div>}
                       </div>
                   </>
               )}

               {activeTab === 'PLAYLISTS' && (
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                       {playlists.length === 0 ? (
                           <div className="col-span-full py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No playlists available</div>
                       ) : (
                           playlists.map(pl => (
                               <div 
                                key={pl.id} 
                                onClick={() => onPlaylistSelect && onPlaylistSelect(pl.id)}
                                className="group cursor-pointer bg-[#0a0a0a] border border-white/5 hover:border-brand transition-all flex flex-col h-full"
                               >
                                   <div className="aspect-video bg-zinc-900 relative border-b border-white/5 flex items-center justify-center">
                                       <ListVideo className="w-8 h-8 text-zinc-700 group-hover:text-brand" />
                                       <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <Play className="w-8 h-8 text-white fill-white" />
                                       </div>
                                       <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-widest">
                                           {pl.video_count || 0} Videos
                                       </div>
                                   </div>
                                   <div className="p-3">
                                       <h4 className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{pl.title}</h4>
                                       <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1">Updated {new Date(pl.created_at).toLocaleDateString()}</p>
                                   </div>
                               </div>
                           ))
                       )}
                   </div>
               )}

               {activeTab === 'COMMUNITY' && (
                   <CommunityView user={user} profile={profile} isOwner={isOwner} />
               )}

               {/* ... (Other tabs remain same) ... */}
               {activeTab === 'ABOUT' && (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                       <div className="md:col-span-2 space-y-8">
                           <div className="space-y-4">
                               <h3 className="text-lg font-black text-white uppercase tracking-tight">Channel Description</h3>
                               <p className="text-sm text-zinc-400 leading-loose whitespace-pre-wrap font-light">{profile.bio || "No description provided."}</p>
                           </div>
                       </div>
                       <div className="space-y-6">
                           <div className="bg-[#0a0a0a] border border-white/10 p-6 space-y-4">
                               <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-4">Stats</h4>
                               <div className="flex justify-between text-xs">
                                   <span className="text-zinc-500 font-bold uppercase">Joined</span>
                                   <span className="text-white font-bold">{new Date(profile.updated_at).toLocaleDateString()}</span>
                               </div>
                               <div className="flex justify-between text-xs">
                                   <span className="text-zinc-500 font-bold uppercase">Views</span>
                                   <span className="text-white font-bold">{profile.views_count.toLocaleString()}</span>
                               </div>
                               <div className="flex justify-between text-xs">
                                   <span className="text-zinc-500 font-bold uppercase">Location</span>
                                   <span className="text-white font-bold">{profile.country || 'Global'}</span>
                               </div>
                           </div>
                       </div>
                   </div>
               )}

               {activeTab === 'LIBRARY' && isOwner && (
                   <div className="space-y-8">
                       <div className="flex justify-between items-center border-b border-white/5 pb-4">
                           <h3 className="text-sm font-black text-white uppercase tracking-widest">My Saved Projects</h3>
                           <button 
                             onClick={() => { setSelectedProject(null); setIsStudioOpen(true); }}
                             className="bg-brand text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg flex items-center gap-2"
                           >
                               <PenTool className="w-3 h-3" /> Create New
                           </button>
                       </div>
                       
                       {projectsList.length === 0 ? (
                           <div className="py-20 text-center border-2 border-dashed border-white/5">
                               <Layers className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                               <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No saved projects found</p>
                           </div>
                       ) : (
                           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                               {projectsList.map(project => (
                                   <div 
                                     key={project.id} 
                                     onClick={() => { setSelectedProject(project); setIsStudioOpen(true); }}
                                     className="group cursor-pointer bg-[#0a0a0a] border border-white/10 hover:border-brand transition-all p-4 relative"
                                   >
                                       <div className="aspect-video bg-black mb-4 overflow-hidden border border-white/5 relative">
                                           {project.preview_url ? (
                                               <img src={project.preview_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                           ) : (
                                               <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                                   <Monitor className="w-8 h-8" />
                                               </div>
                                           )}
                                           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                               <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 bg-brand px-3 py-1.5">
                                                   <Edit className="w-3 h-3" /> Edit
                                               </span>
                                           </div>
                                       </div>
                                       
                                       <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                                                className="p-1.5 bg-black/80 text-zinc-400 hover:text-rose-500 border border-white/10 hover:border-rose-500/50 rounded-sm transition-colors"
                                                title="Delete Project"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                       </div>

                                       <h4 className="text-sm font-bold text-white truncate">{project.name}</h4>
                                       <div className="flex justify-between mt-2 text-[9px] font-bold text-zinc-500 uppercase">
                                           <span>{project.type.replace('_', ' ')}</span>
                                           <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       )}
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};

export default ChannelView;