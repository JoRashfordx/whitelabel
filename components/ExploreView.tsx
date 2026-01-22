
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Video, Profile, VideoRating, User, Series, Premiere } from '../types';
import { CheckCircle2 } from 'lucide-react';
import SeriesCard from './SeriesCard';
import Vidfree_videocard from './Vidfree_videocard';

interface ExploreViewProps {
  onVideoSelect: (video: Video) => void;
  onProfileClick: (userId: string) => void;
  onSeriesSelect?: (seriesId: string) => void; 
  searchQuery: string;
  allowedRatings: VideoRating[];
  currentUser: User | null;
}

interface VideoWithProfile extends Video {
  profile?: {
    username: string | null;
    avatar_url: string | null;
    subscribers_count: number;
  };
  premiere?: Premiere;
}

const CATEGORIES = ['ALL', 'SERIES', 'VLOGS', 'TECH', 'ART', 'LIFESTYLE', 'DOCUMENTARY', 'ADVENTURE', 'FOOD'];

const ExploreView: React.FC<ExploreViewProps> = ({ onVideoSelect, onProfileClick, onSeriesSelect, searchQuery, allowedRatings, currentUser }) => {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [videos, setVideos] = useState<VideoWithProfile[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [foundSeries, setFoundSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const q = searchQuery.trim();
      let videoData: Video[] = [];

      if (q.length > 0) {
        // --- SEARCH MODE ---
        
        // 1. Search Profiles (Direct ILIKE)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${q}%,alias.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(10);
        setProfiles(profileData || []);
        
        const matchedUserIds = profileData?.map(p => p.id) || [];

        // 2. Search Series (Direct ILIKE)
        const { data: seriesData } = await supabase
          .from('series_with_counts')
          .select('*')
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .eq('visibility', 'public')
          .limit(10);
        
        const filteredSeries = (seriesData || []).filter((s: Series) => 
           allowedRatings.includes(s.rating as VideoRating) || s.user_id === currentUser?.id
        );
        setFoundSeries(filteredSeries);

        // 3. Search Videos (Multi-Strategy)
        const { data: textMatches } = await supabase
          .from('videos')
          .select('*')
          .eq('visibility', 'public')
          .or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
          .order('views_count', { ascending: false })
          .limit(40);

        let tagMatches: Video[] = [];
        const cleanTag = q.replace('#', '').trim();
        if (cleanTag.indexOf(' ') === -1 && cleanTag.length > 0) {
             const { data } = await supabase
                .from('videos')
                .select('*')
                .eq('visibility', 'public')
                .contains('hashtags', [cleanTag])
                .limit(40);
             tagMatches = data || [];
        }

        let authorMatches: Video[] = [];
        if (matchedUserIds.length > 0) {
            const { data } = await supabase
                .from('videos')
                .select('*')
                .eq('visibility', 'public')
                .in('user_id', matchedUserIds)
                .order('created_at', { ascending: false })
                .limit(20);
            authorMatches = data || [];
        }
        
        const allRaw = [...(textMatches || []), ...tagMatches, ...authorMatches];
        const uniqueMap = new Map();
        allRaw.forEach(v => uniqueMap.set(v.id, v));
        videoData = Array.from(uniqueMap.values());

      } else {
        // --- FEED MODE (No Search) ---
        setFoundSeries([]);
        setProfiles([]);
        
        try {
            const { data, error } = await supabase.rpc('get_fair_feed', {
                p_user_id: currentUser?.id || null,
                p_limit: 30
            });
            if (error) throw error;
            videoData = data || [];
        } catch (rpcError) {
            const { data } = await supabase
                .from('videos')
                .select('*')
                .eq('visibility', 'public')
                .order('created_at', { ascending: false })
                .limit(30);
            videoData = data || [];
        }
        
        if (activeFilter !== 'ALL') {
            videoData = videoData.filter(v => v.category?.toUpperCase() === activeFilter);
        }
      }

      const safeVideos = videoData.filter(v => 
         (allowedRatings.includes(v.rating as VideoRating) || v.user_id === currentUser?.id)
      );

      if (safeVideos.length > 0) {
          const userIds = [...new Set(safeVideos.map(v => v.user_id))];
          const videoIds = safeVideos.map(v => v.id);

          const { data: pData } = await supabase.from('profiles').select('id, username, avatar_url, subscribers_count').in('id', userIds);
          const { data: premData } = await supabase.from('premieres').select('*').in('video_id', videoIds);

          const pMap = (pData || []).reduce((acc: any, x: any) => { acc[x.id] = x; return acc; }, {});
          const premMap = (premData || []).reduce((acc: any, x: any) => { acc[x.video_id] = x; return acc; }, {});

          setVideos(safeVideos.map(v => ({
              ...v,
              profile: pMap[v.user_id],
              premiere: premMap[v.id]
          })));
      } else {
          setVideos([]);
      }

    } catch (err) {
      console.error("Explore Error:", err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, allowedRatings, activeFilter, currentUser?.id]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen pb-20">
      <div className="p-6 md:p-8 max-w-[1920px] mx-auto space-y-10">
        
        {!isSearching && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide border-b border-white/5 w-full">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
                    activeFilter === cat 
                    ? 'bg-brand border-brand text-white shadow-[0_0_20px_rgba(255,0,127,0.3)]' 
                    : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white hover:border-white/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-32 text-center">
            <div className="w-10 h-10 border-2 border-brand border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Searching....</p>
          </div>
        ) : (
          <div className="space-y-12">
            
            {isSearching ? (
              <div className="space-y-10">
                {/* 1. MATCHING USERS */}
                {profiles.length > 0 && (
                  <div className="space-y-6 pb-6 border-b border-white/5">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Channels</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {profiles.map(p => (
                        <div 
                          key={p.id}
                          onClick={() => onProfileClick(p.id)}
                          className="p-4 bg-white/5 border border-white/10 flex items-center gap-4 cursor-pointer hover:border-brand transition-all"
                        >
                          <div className="w-12 h-12 bg-zinc-900 border border-white/10 shrink-0">
                            <img src={p.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${p.id}`} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-white uppercase truncate flex items-center gap-1">
                              {p.username} <CheckCircle2 size={12} className="text-brand" />
                            </h4>
                            <p className="text-[9px] font-bold text-zinc-500 uppercase">{p.subscribers_count} Subscribers</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. MATCHING SERIES */}
                {foundSeries.length > 0 && (
                  <div className="space-y-6 pb-6 border-b border-white/5">
                     <h3 className="text-xl font-black text-white uppercase tracking-tight">Series</h3>
                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {foundSeries.map(series => (
                           <SeriesCard 
                             key={series.id} 
                             series={series} 
                             onClick={() => onSeriesSelect && onSeriesSelect(series.id)}
                             isOwner={series.user_id === currentUser?.id}
                           />
                        ))}
                     </div>
                  </div>
                )}

                {/* 3. VIDEO RESULTS */}
                <div className="space-y-8">
                  {videos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
                        {videos.map(video => (
                            <Vidfree_videocard
                                key={video.id}
                                video={video}
                                onSelect={onVideoSelect}
                                onProfileClick={onProfileClick}
                            />
                        ))}
                    </div>
                  ) : (
                    <div className="py-32 text-center border-2 border-dashed border-white/5">
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">No video results found</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // GRID VIEW FOR FEED
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
                {videos.map(video => (
                  <Vidfree_videocard
                    key={video.id}
                    video={video}
                    onSelect={onVideoSelect}
                    onProfileClick={onProfileClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExploreView;
