
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Video, VideoRating, User, Premiere } from '../types';
import { Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import Vidfree_videocard from './Vidfree_videocard';

interface TrendingViewProps {
  onVideoSelect: (video: Video) => void;
  onProfileClick: (userId: string) => void;
  allowedRatings: VideoRating[];
  refreshTrigger: number;
  currentUser: User | null;
}

interface VideoWithProfile extends Video {
  profile?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    subscribers_count: number;
  };
  premiere?: Premiere;
}

const CATEGORIES = ['ALL', 'VLOG', 'TRAVEL', 'GAMING', 'MUSIC', 'SPORTS', 'DIY', 'TECH', 'FINANCE', 'LIFESTYLE'];

const getNextGlobalRefreshTime = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const nextRefresh = new Date(now);

  if (minutes < 30) {
      nextRefresh.setMinutes(30, 0, 0); 
  } else {
      nextRefresh.setHours(now.getHours() + 1);
      nextRefresh.setMinutes(0, 0, 0); 
  }
  return nextRefresh.getTime();
};

const TrendingView: React.FC<TrendingViewProps> = ({ onVideoSelect, onProfileClick, allowedRatings, refreshTrigger, currentUser }) => {
  const [videos, setVideos] = useState<VideoWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  
  const [targetRefreshTime, setTargetRefreshTime] = useState<number>(getNextGlobalRefreshTime());
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const fetchTrendingVideos = useCallback(async () => {
    setLoading(true);
    try {
      const { data: videoData, error: videoError } = await supabase.rpc('get_trending_feed', {
        p_limit: 50,
        p_category: activeCategory === 'ALL' ? 'All' : activeCategory.charAt(0) + activeCategory.slice(1).toLowerCase()
      });

      if (videoError) throw videoError;

      let filteredData = (videoData || []).filter((v: Video) => 
        allowedRatings.includes(v.rating as VideoRating) || v.user_id === currentUser?.id
      );

      if (filteredData.length === 0) {
        setVideos([]);
        return;
      }

      const userIds = [...new Set(filteredData.map((v: Video) => v.user_id))];
      const videoIds = filteredData.map((v: Video) => v.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, subscribers_count')
        .in('id', userIds);

      const { data: premiereData } = await supabase
        .from('premieres')
        .select('*')
        .in('video_id', videoIds);

      const profileMap = (profileData || []).reduce((acc: any, profile: any) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      const premiereMap = (premiereData || []).reduce((acc: any, p: any) => {
        acc[p.video_id] = p;
        return acc;
      }, {} as Record<string, any>);

      const mergedVideos = filteredData.map((video: Video) => ({
        ...video,
        profile: profileMap[video.user_id],
        premiere: premiereMap[video.id]
      }));

      const sorted = mergedVideos.sort((a, b) => (b.momentum_score || 0) - (a.momentum_score || 0));

      setVideos(sorted);

    } catch (err: any) {
      console.error("Trending Feed Error:", err);
    } finally {
      setLoading(false);
    }
  }, [allowedRatings, activeCategory, currentUser?.id]);

  useEffect(() => {
      fetchTrendingVideos();
  }, [fetchTrendingVideos, refreshTrigger]);

  useEffect(() => {
    const calcDiff = () => Math.max(0, Math.ceil((targetRefreshTime - Date.now()) / 1000));
    setTimeRemaining(calcDiff());

    const interval = setInterval(() => {
        const now = Date.now();
        if (now >= targetRefreshTime) {
            fetchTrendingVideos();
            setTargetRefreshTime(getNextGlobalRefreshTime());
        } else {
            setTimeRemaining(calcDiff());
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetRefreshTime, fetchTrendingVideos]);

  const top5 = videos.slice(0, 5);
  const remaining = videos.slice(5);

  const formatRefreshTime = (secs: number) => {
    if (secs < 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 md:p-8 w-full mx-auto space-y-12 animate-in fade-in duration-700 min-h-screen">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-white/5 bg-[#050505] sticky top-16 z-30 pt-4 -mt-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${
                activeCategory === cat ? 'bg-brand border-brand text-white shadow-[0_0_20px_rgba(255,0,127,0.3)]' : 'bg-[#0a0a0a] border-white/10 text-zinc-500 hover:text-white hover:border-white/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-4 bg-black border border-white/10 rounded-lg py-2 pl-4 pr-2 shadow-2xl hover:border-brand/30 transition-all group">
           <div className="flex flex-col items-start justify-center gap-0.5">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-comfortaa">
                  Next Update
              </span>
              <span className="text-xs font-black text-white tracking-widest tabular-nums leading-none font-comfortaa">{formatRefreshTime(timeRemaining)}</span>
           </div>
           <button 
             onClick={fetchTrendingVideos} 
             disabled={loading}
             className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-brand border border-white/10 hover:border-brand text-zinc-400 hover:text-white transition-all rounded-md disabled:opacity-50"
             title="Force Refresh"
           >
             <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {loading && videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
           <Loader2 className="w-10 h-10 text-brand animate-spin" />
           <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Analyzing Trends...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-white/5 text-zinc-700">
           <TrendingUp className="w-12 h-12 mb-4 opacity-50" />
           <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">No trending videos found</h3>
           <p className="text-[10px] mt-2">Check back in {formatRefreshTime(timeRemaining)}</p>
        </div>
      ) : (
        <>
          {/* LEADERS SECTION */}
          <section className="space-y-8">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Current <span className="text-brand">Leaders</span></h2>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Highest velocity in the last 30 minutes</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
              {top5.map((video, idx) => (
                  <Vidfree_videocard 
                    key={video.id} 
                    video={video} 
                    rank={idx + 1} 
                    onSelect={onVideoSelect} 
                    onProfileClick={onProfileClick}
                  />
              ))}
            </div>
          </section>

          {/* RISING SECTION */}
          {remaining.length > 0 && (
              <section className="space-y-8 pt-12 border-t border-white/5">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Rising <span className="text-zinc-500">Now</span></h2>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gaining significant traction</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
                  {remaining.map((video, index) => (
                      <Vidfree_videocard 
                        key={video.id} 
                        video={video} 
                        rank={index + 6} 
                        onSelect={onVideoSelect} 
                        onProfileClick={onProfileClick}
                      />
                  ))}
                </div>
              </section>
          )}
        </>
      )}
    </div>
  );
};

export default TrendingView;
