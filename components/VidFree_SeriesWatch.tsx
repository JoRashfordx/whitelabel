
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Series, SeriesEpisode, Video, VideoRating, User } from '../types';
import VideoPlayer from './VideoPlayer';
import { 
  ArrowLeft, ChevronDown, ChevronRight, Play, Check, 
  Info, Loader2, Maximize, Minimize, SkipForward,
  Lock, Calendar
} from 'lucide-react';
import SeriesCard from './SeriesCard';

interface VidFree_SeriesWatchProps {
  seriesId: string;
  initialEpisodeId?: string;
  onBack: () => void;
  user: User | null;
  allowedRatings: VideoRating[];
  onNavigateToSeries: (id: string) => void;
}

const VidFree_SeriesWatch: React.FC<VidFree_SeriesWatchProps> = ({ 
  seriesId, initialEpisodeId, onBack, user, allowedRatings, onNavigateToSeries 
}) => {
  const [series, setSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<SeriesEpisode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<SeriesEpisode | null>(null);
  const [recommendations, setRecommendations] = useState<Series[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  
  const uiTimeoutRef = useRef<any>(null);
  const viewRegistered = useRef(false);

  // Fetch Series & Episodes
  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      try {
        // 1. Series Metadata
        const { data: sData } = await supabase.from('series').select('*').eq('id', seriesId).single();
        if (sData) setSeries(sData);

        // 2. Episodes (with Videos)
        const { data: eData } = await supabase
          .from('series_episodes')
          .select(`*, video:videos(*)`)
          .eq('series_id', seriesId)
          .order('episode_number', { ascending: true });
        
        if (eData) {
          const formatted = eData.map((e: any) => ({ ...e, video: e.video }));
          setEpisodes(formatted);
          
          // Determine initial episode
          if (initialEpisodeId) {
            const match = formatted.find(e => e.id === initialEpisodeId);
            if (match) setCurrentEpisode(match);
            else setCurrentEpisode(formatted[0]);
          } else {
            // Default to first available or first overall
            const firstAvailable = formatted.find(e => new Date(e.release_date) <= new Date());
            setCurrentEpisode(firstAvailable || formatted[0]);
          }
        }

        // 3. Recommendations (Simple fetch for now)
        const { data: recData } = await supabase
            .from('series_with_counts')
            .select('*')
            .neq('id', seriesId)
            .eq('visibility', 'public')
            .limit(6);
        
        if (recData) setRecommendations(recData);

      } catch (err) {
        console.error("Failed to load series context", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [seriesId]);

  // Handle Episode Change
  useEffect(() => {
    viewRegistered.current = false;
    window.scrollTo(0,0);
  }, [currentEpisode?.id]);

  // UI Hiding Interaction
  const handleInteraction = () => {
    setShowUI(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    uiTimeoutRef.current = setTimeout(() => {
        // Only hide if playing
        // We rely on VideoPlayer state, but here we can just assume after 3s of no mouse
        setShowUI(false);
    }, 3500);
  };

  const handleEpisodeChange = (episode: SeriesEpisode) => {
      // UPDATED LOGIC: Trust date only
      if (new Date(episode.release_date) > new Date()) return;
      setCurrentEpisode(episode);
  };

  const handleNextEpisode = () => {
      if (!currentEpisode || !episodes.length) return;
      const currentIndex = episodes.findIndex(e => e.id === currentEpisode.id);
      if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
          handleEpisodeChange(episodes[currentIndex + 1]);
      }
  };

  // View Counting
  const handleProgress = async () => {
      if (viewRegistered.current || !currentEpisode?.video) return;
      viewRegistered.current = true;
      
      // Increment Video View
      await supabase.rpc('increment_video_view', { p_video_id: currentEpisode.video.id, p_ip_address: '0.0.0.0' });
      // Increment Series View
      await supabase.rpc('increment_series_view', { p_series_id: seriesId, p_ip_address: '0.0.0.0' });
  };

  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-10 h-10 text-brand animate-spin" /></div>;
  if (!series || !currentEpisode || !currentEpisode.video) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Content Unavailable</div>;

  const nextEpisode = episodes.find(e => e.episode_number === currentEpisode.episode_number + 1);
  // UPDATED LOGIC: Trust date only
  const canPlayNext = nextEpisode && new Date(nextEpisode.release_date) <= new Date();

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">
        
        {/* --- IMMERSIVE PLAYER SECTION (100vh) --- */}
        <div 
            className="relative w-full h-[100vh] bg-black group"
            onMouseMove={handleInteraction}
            onClick={handleInteraction}
        >
            <VideoPlayer 
                src={currentEpisode.video.video_url}
                poster={currentEpisode.thumbnail_url || series.thumbnail_url || undefined}
                qualityUrls={currentEpisode.video.quality_urls}
                autoPlay={true}
                onProgress={handleProgress}
                onEnded={() => { if(autoPlayNext && canPlayNext) handleNextEpisode(); }}
                className="w-full h-full object-contain"
            />

            {/* TOP OVERLAY (Title) */}
            <div className={`absolute top-0 left-0 right-0 p-8 bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-500 z-20 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
                <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors font-bold uppercase text-xs tracking-widest">
                    <ArrowLeft className="w-4 h-4" /> Back to Browse
                </button>
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white drop-shadow-lg">{series.title}</h1>
                    <h2 className="text-lg md:text-xl font-bold text-zinc-300 flex items-center gap-3">
                        <span className="text-brand">S1:E{currentEpisode.episode_number}</span> 
                        {currentEpisode.title}
                    </h2>
                </div>
            </div>

            {/* BOTTOM OVERLAY (Controls & Info) */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-8 pb-8 pt-24 transition-opacity duration-500 z-20 flex items-end justify-between ${showUI ? 'opacity-100' : 'opacity-0'}`}>
                <div className="max-w-2xl space-y-4">
                    <p className="text-sm md:text-base text-zinc-200 line-clamp-2 font-medium drop-shadow-md leading-relaxed">
                        {currentEpisode.description || series.description}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {canPlayNext && (
                        <button 
                            onClick={handleNextEpisode}
                            className="bg-white text-black px-6 py-3 rounded-sm flex items-center gap-2 font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                        >
                            <SkipForward className="w-5 h-5 fill-current" /> Next Episode
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* --- BELOW THE FOLD CONTENT --- */}
        <div className="relative z-30 bg-[#050505] px-8 py-16 space-y-16">
            
            {/* EPISODES LIST (Horizontal) */}
            <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Episodes</h3>
                    <span className="text-zinc-500 font-bold uppercase text-xs tracking-widest">{episodes.length} Episodes Available</span>
                </div>

                <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x">
                    {episodes.map((ep) => {
                        const isCurrent = ep.id === currentEpisode.id;
                        // UPDATED LOGIC: Trust date only
                        const isLocked = new Date(ep.release_date) > new Date();
                        
                        return (
                            <div 
                                key={ep.id}
                                onClick={() => !isLocked && handleEpisodeChange(ep)}
                                className={`
                                    relative min-w-[300px] w-[300px] group cursor-pointer snap-start
                                    ${isCurrent ? 'opacity-100' : isLocked ? 'opacity-50' : 'opacity-70 hover:opacity-100'}
                                    transition-all duration-300
                                `}
                            >
                                <div className={`aspect-video relative overflow-hidden mb-3 border-2 ${isCurrent ? 'border-brand' : 'border-transparent'}`}>
                                    <img src={ep.thumbnail_url || series.thumbnail_url || ''} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    
                                    {/* Overlay Icon */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                                        {isLocked ? (
                                            <Lock className="w-8 h-8 text-zinc-400" />
                                        ) : isCurrent ? (
                                            <div className="w-10 h-10 bg-brand flex items-center justify-center rounded-full shadow-[0_0_15px_rgba(255,0,127,0.5)]">
                                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                            </div>
                                        ) : (
                                            <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                        )}
                                    </div>

                                    {/* Progress / Duration */}
                                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 text-[9px] font-black text-white uppercase tracking-widest">
                                        {ep.video?.duration || '0:00'}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">Episode {ep.episode_number}</span>
                                        {isLocked && (
                                            <span className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {new Date(ep.release_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className={`text-sm font-bold uppercase leading-tight ${isCurrent ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                                        {ep.title}
                                    </h4>
                                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                                        {ep.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* RECOMMENDATIONS (Grid) */}
            <section className="space-y-6">
                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">More Like This</h3>
                </div>
                
                {recommendations.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {recommendations.map((recSeries) => (
                            <SeriesCard 
                                key={recSeries.id}
                                series={recSeries}
                                onClick={() => onNavigateToSeries(recSeries.id)}
                                isOwner={user?.id === recSeries.user_id}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center text-zinc-600 font-bold uppercase tracking-widest border border-dashed border-white/5">
                        No recommendations available yet
                    </div>
                )}
            </section>

            {/* FOOTER SPACE */}
            <div className="h-20" />
        </div>
    </div>
  );
};

export default VidFree_SeriesWatch;
