
import React, { useState, useEffect, useRef } from 'react';
import { Series, SeriesEpisode, Video, SeriesHeroBanner, Profile, VideoRating, User } from '../types';
import { supabase } from '../services/supabase';
import { Play, Lock, Clock, Calendar, CheckCircle2, ArrowLeft, Loader2, ShieldAlert, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface SeriesViewProps {
  seriesId: string;
  onBack: () => void;
  onPlayEpisode: (video: Video) => void;
  allowedRatings: VideoRating[];
  currentUser: User | null;
  onProfileClick: (userId: string) => void;
}

const SeriesView: React.FC<SeriesViewProps> = ({ seriesId, onBack, onPlayEpisode, allowedRatings, currentUser, onProfileClick }) => {
  const { addToast } = useToast();
  const [series, setSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<SeriesEpisode[]>([]);
  const [banner, setBanner] = useState<SeriesHeroBanner | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Stats State
  const [aggregateViews, setAggregateViews] = useState(0);
  const [seriesLikes, setSeriesLikes] = useState(0);
  const [seriesDislikes, setSeriesDislikes] = useState(0);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
  
  const viewRegistered = useRef(false);

  // VIEW COUNTING LOGIC (Series Level)
  useEffect(() => {
    // Reset view registered when series ID changes
    viewRegistered.current = false;
    
    const registerView = async () => {
        if (viewRegistered.current) return;
        viewRegistered.current = true;
        try {
            let ip = '0.0.0.0';
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 2000);
                const ipResponse = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
                clearTimeout(id);
                const data = await ipResponse.json();
                ip = data.ip;
            } catch (e) {
                console.warn("IP Fetch failed, using anonymous tracking", e);
            }

            await supabase.rpc('increment_series_view', { 
                p_series_id: seriesId, 
                p_ip_address: ip 
            });
        } catch (err) {
            console.warn("Series view registration error:", err);
        }
    };

    registerView();
  }, [seriesId]);

  useEffect(() => {
    const fetchSeriesData = async () => {
      setLoading(true);
      
      const { data: sData, error: sError } = await supabase.from('series').select('*').eq('id', seriesId).single();
      
      if (sError || !sData) {
        setLoading(false);
        return;
      }
      setSeries(sData);
      setSeriesLikes(sData.likes_count || 0);
      setSeriesDislikes(sData.dislikes_count || 0);

      const { data: cData } = await supabase.from('profiles').select('*').eq('id', sData.user_id).single();
      setCreator(cData);

      const { data: bData } = await supabase.from('series_hero_banners').select('*').eq('series_id', seriesId).eq('enabled', true).maybeSingle();
      setBanner(bData);

      // Fetch episodes with left join to videos.
      const { data: eData } = await supabase
        .from('series_episodes')
        .select(`*, video:videos(*)`)
        .eq('series_id', seriesId)
        .order('episode_number', { ascending: true });
      
      if (eData) {
        const episodeList = eData.map((e: any) => ({ ...e, video: e.video }));
        setEpisodes(episodeList);

        // Calculate Aggregate Views from underlying videos
        const totalViews = episodeList.reduce((acc: number, curr: any) => {
            return acc + (curr.video?.views_count || 0);
        }, 0);
        
        setAggregateViews(totalViews);
      }

      // Fetch User Reaction
      if (currentUser) {
          const { data: reaction } = await supabase
            .from('series_reactions')
            .select('type')
            .eq('series_id', seriesId)
            .eq('user_id', currentUser.id)
            .maybeSingle();
          if (reaction) setUserReaction(reaction.type as any);
      }

      setLoading(false);
    };

    fetchSeriesData();
  }, [seriesId, currentUser?.id]);

  const handleReaction = async (type: 'like' | 'dislike') => {
      if (!currentUser) {
          addToast({ type: 'info', title: 'Sign In', message: `Please sign in to ${type} this series.` });
          return;
      }

      // Capture previous state for rollback
      const prevReaction = userReaction;
      const prevLikes = seriesLikes;
      const prevDislikes = seriesDislikes;

      // Calculate Optimistic State
      const isRemoving = prevReaction === type;
      const newReaction = isRemoving ? null : type;
      
      setUserReaction(newReaction);

      if (isRemoving) {
          if (type === 'like') setSeriesLikes(prev => Math.max(0, prev - 1));
          else setSeriesDislikes(prev => Math.max(0, prev - 1));
      } else {
          if (type === 'like') {
              setSeriesLikes(prev => prev + 1);
              if (prevReaction === 'dislike') setSeriesDislikes(prev => Math.max(0, prev - 1));
          } else {
              setSeriesDislikes(prev => prev + 1);
              if (prevReaction === 'like') setSeriesLikes(prev => Math.max(0, prev - 1));
          }
      }

      try {
          const { error } = await supabase.rpc('handle_series_reaction', {
              p_series_id: seriesId,
              p_user_id: currentUser.id,
              p_type: newReaction
          });
          if (error) throw error;
      } catch (err: any) {
          console.error("Reaction failed", err);
          // Rollback
          setUserReaction(prevReaction);
          setSeriesLikes(prevLikes);
          setSeriesDislikes(prevDislikes);

          if (err.code === 'PGRST202') {
              addToast({ type: 'error', title: 'System Error', message: 'Database function missing. Please run the SQL migration script.' });
          } else {
              addToast({ type: 'error', message: 'Action failed. Please try again.' });
          }
      }
  };

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>;

  if (!series) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><p className="text-zinc-500 font-bold uppercase">Series not found.</p><button onClick={onBack} className="text-brand hover:underline uppercase text-xs font-black">Go Back</button></div>;

  // Check Rating Access
  const isOwner = currentUser?.id === series.user_id;
  const isAllowed = allowedRatings.includes(series.rating as VideoRating) || isOwner;

  if (!isAllowed) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-10 text-center space-y-6">
            <ShieldAlert className="w-16 h-16 text-rose-500" />
            <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Restricted Content</h3>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest max-w-md mx-auto">
                    This series is rated <span className="text-rose-500">{series.rating}</span>. Your account settings or age do not allow you to view this content.
                </p>
            </div>
            <button onClick={onBack} className="px-6 py-3 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20">Return</button>
        </div>
      );
  }

  // UPDATED LOGIC: Ignore 'status' string from DB, rely on Date comparison
  const firstPlayable = episodes.find(e => new Date(e.release_date) <= new Date());

  const getRatingBadge = (rating: string) => {
    const style = rating === 'R' ? 'bg-rose-600 border-rose-600 text-white' :
                  rating === 'PG' ? 'bg-amber-500 border-amber-500 text-black' :
                  'bg-emerald-500 border-emerald-500 text-white';
    return <div className={`px-2 py-1 text-[10px] font-black uppercase border shadow-lg ${style}`}>{rating}</div>;
  };

  const isOngoing = episodes.some(e => new Date(e.release_date) > new Date());

  return (
    <div className="min-h-screen pb-20 animate-in fade-in slide-in-from-bottom-4">
      {/* HERO SECTION */}
      <div className="relative w-full h-[60vh] bg-black overflow-hidden border-b border-white/5">
        <div className="absolute inset-0">
            {banner?.banner_image_url ? (
                <img src={banner.banner_image_url} className="w-full h-full object-cover opacity-60" />
            ) : (
                <img src={series.thumbnail_url || ''} className="w-full h-full object-cover opacity-40 blur-xl" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
        </div>

        <div className="absolute inset-0 flex items-center p-8 md:p-16 max-w-7xl mx-auto">
            <div className="max-w-3xl space-y-6">
                <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Channel
                </button>
                
                {banner ? (
                    <>
                        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">{banner.headline}</h1>
                        <p className="text-lg md:text-xl text-brand font-bold uppercase tracking-widest">{banner.subtext}</p>
                    </>
                ) : (
                    <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">{series.title}</h1>
                )}

                {/* AGGREGATE STATS & FUNCTIONAL REACTIONS */}
                <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                        <Eye className="w-3.5 h-3.5 text-white" />
                        <span>{formatCount(aggregateViews)} Total Views</span>
                    </div>
                    
                    <button 
                        onClick={() => handleReaction('like')}
                        className={`flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors ${userReaction === 'like' ? 'text-brand border-brand/50' : 'text-zinc-300'}`}
                    >
                        <ThumbsUp className={`w-3.5 h-3.5 ${userReaction === 'like' ? 'fill-brand text-brand' : 'text-emerald-500'}`} />
                        <span>{formatCount(seriesLikes)}</span>
                    </button>
                    
                    <button 
                        onClick={() => handleReaction('dislike')}
                        className={`flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors ${userReaction === 'dislike' ? 'text-rose-500 border-rose-500/50' : 'text-zinc-300'}`}
                    >
                        <ThumbsDown className={`w-3.5 h-3.5 ${userReaction === 'dislike' ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} />
                        <span>{formatCount(seriesDislikes)}</span>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-6 pt-4">
                    {firstPlayable && (
                        <button 
                            onClick={() => firstPlayable.video && onPlayEpisode(firstPlayable.video)}
                            className="bg-brand text-white px-8 py-4 text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(255,0,127,0.4)] hover:brightness-110 transition-all flex items-center gap-3"
                        >
                            <Play className="w-4 h-4 fill-current" /> {banner?.cta_text || "Start Watching"}
                        </button>
                    )}
                    <div className="flex items-center gap-4 bg-black/40 border border-white/10 px-6 py-4 backdrop-blur-md">
                        <div 
                            className="w-10 h-10 bg-zinc-800 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-brand transition-all"
                            onClick={() => creator && onProfileClick(creator.id)}
                        >
                            <img src={creator?.avatar_url || ''} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Created By</p>
                            <button 
                                onClick={() => creator && onProfileClick(creator.id)}
                                className="text-xs font-black text-white uppercase flex items-center gap-2 hover:text-brand transition-colors"
                            >
                                {creator?.username} <CheckCircle2 className="w-3 h-3 text-brand" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* DESCRIPTION & METADATA */}
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-2 space-y-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">About The Series</h3>
              <p className="text-sm text-zinc-300 leading-loose font-light whitespace-pre-wrap">{series.description}</p>
          </div>
          <div className="space-y-6">
              <div className="p-6 bg-[#0a0a0a] border border-white/10 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Episodes</span>
                      <span className="text-sm font-bold text-white">{episodes.length}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</span>
                      <span className="text-sm font-bold text-brand uppercase">{isOngoing ? 'Ongoing' : 'Completed'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Rating</span>
                      {getRatingBadge(series.rating)}
                  </div>
              </div>
          </div>
      </div>

      {/* EPISODE LIST */}
      <div className="max-w-6xl mx-auto px-6 space-y-8">
          <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4">
              Episodes <span className="text-sm font-bold text-zinc-600 bg-white/5 px-3 py-1 rounded-full">{episodes.length}</span>
          </h3>
          
          <div className="space-y-4">
              {episodes.map((ep) => {
                  // UPDATED LOGIC: Trust the date only
                  const isReleased = new Date(ep.release_date) <= new Date();
                  
                  return (
                      <div 
                        key={ep.id} 
                        className={`flex flex-col md:flex-row gap-6 p-4 border transition-all ${isReleased ? 'bg-[#0a0a0a] border-white/5 hover:border-brand/50 cursor-pointer group' : 'bg-black border-white/5 opacity-60'}`}
                        onClick={() => isReleased && ep.video && onPlayEpisode(ep.video)}
                      >
                          <div className="relative w-full md:w-64 aspect-video bg-zinc-900 overflow-hidden shrink-0 border border-white/5">
                              <img src={ep.thumbnail_url || series.thumbnail_url || ''} className="w-full h-full object-cover" />
                              
                              {!isReleased && (
                                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                                      <Lock className="w-6 h-6 text-zinc-500" />
                                      <span className="text-[9px] font-black text-white uppercase tracking-widest">Upcoming</span>
                                  </div>
                              )}
                              
                              {isReleased && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Play className="w-8 h-8 text-white fill-white" />
                                  </div>
                              )}

                              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black text-white text-[9px] font-black tracking-widest">
                                  {ep.video?.duration || '0:00'}
                              </div>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="flex items-center gap-3 mb-2">
                                  <span className="text-[10px] font-black text-brand uppercase tracking-widest">Episode {ep.episode_number}</span>
                                  <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                      {isReleased ? <Calendar className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                      {new Date(ep.release_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isReleased && ep.video && (
                                      <>
                                        <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                            <Eye className="w-3 h-3" /> {formatCount(ep.video.views_count || 0)}
                                        </span>
                                      </>
                                  )}
                              </div>
                              <h4 className={`text-lg font-black uppercase tracking-tight mb-2 ${isReleased ? 'text-white group-hover:text-brand transition-colors' : 'text-zinc-400'}`}>
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
      </div>
    </div>
  );
};

export default SeriesView;
