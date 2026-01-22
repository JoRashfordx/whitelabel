import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Video, VideoRating, User, Premiere } from '../types';
import { Loader2 } from 'lucide-react';
import Vidfree_videocard from './Vidfree_videocard';

interface HomeViewProps {
  onVideoSelect: (video: Video) => void;
  onProfileClick: (userId: string) => void;
  allowedRatings: VideoRating[];
  refreshTrigger: number;
  currentUser: User | null;
  onAddToPlaylist?: (video: Video) => void;
  onAddToWatchLater?: (video: Video) => void;
}

interface VideoWithProfile extends Video {
  profile?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    subscribers_count: number;
  };
  premiere?: Premiere;
  isBoosted?: boolean; 
  isHot?: boolean;
}

const HomeView: React.FC<HomeViewProps> = ({ 
  onVideoSelect, 
  onProfileClick, 
  allowedRatings, 
  refreshTrigger, 
  currentUser,
  onAddToPlaylist,
  onAddToWatchLater
}) => {
  const [videos, setVideos] = useState<VideoWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const getVideos = async () => {
    setLoading(true);
    try {
      const { data: videoData, error: videoError } = await supabase.rpc('get_fair_feed', {
        p_user_id: currentUser?.id || null,
        p_limit: 40
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

      const mergedVideos = filteredData.map((video: Video) => {
        const isFresh = new Date(video.created_at).getTime() > Date.now() - (24 * 60 * 60 * 1000);
        const isUnderdog = video.views_count < 50;
        
        return {
          ...video,
          profile: profileMap[video.user_id],
          premiere: premiereMap[video.id],
          isBoosted: isFresh && isUnderdog,
          isHot: (video.momentum_score || 0) > 1.2
        };
      });

      setVideos(mergedVideos);
    } catch (err: any) {
      console.error("Feed Error:", err);
      const { data: fallbackData } = await supabase.from('videos').select('*').order('created_at', { ascending: false }).limit(20);
      if (fallbackData) {
         const fbFiltered = fallbackData.filter((v: any) => 
            allowedRatings.includes(v.rating as VideoRating) || v.user_id === currentUser?.id
         );
         setVideos(fbFiltered as any); 
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getVideos();
  }, [allowedRatings, refreshTrigger, currentUser?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/5 text-zinc-600">
           <h3 className="text-[10px] font-black uppercase tracking-widest">No videos found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
          {videos.map((video) => (
            <Vidfree_videocard 
              key={video.id} 
              video={video} 
              onSelect={onVideoSelect} 
              onProfileClick={onProfileClick}
              onAddToPlaylist={onAddToPlaylist}
              onAddToWatchLater={onAddToWatchLater}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeView;