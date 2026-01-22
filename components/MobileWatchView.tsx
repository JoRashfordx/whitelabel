
import React, { useState, useEffect, useRef } from 'react';
import { Video, Profile, User, VideoRating, Premiere } from '../types';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, Eye, ThumbsUp, ThumbsDown, Share2, 
  MoreVertical, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import LiveChat from './LiveChat';
import PremiereCountdown from './PremiereCountdown';

interface MobileWatchViewProps {
  video: Video;
  user: User | null;
  onBack: () => void;
  onProfileClick: (userId: string) => void;
  allowedRatings: VideoRating[];
}

type PremiereState = 'normal' | 'upcoming' | 'live' | 'ended_transition';

const MobileWatchView: React.FC<MobileWatchViewProps> = ({ video, user, onBack, onProfileClick, allowedRatings }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploaderProfile, setUploaderProfile] = useState<Profile | null>(null);
  
  // Premiere State
  const [premiereData, setPremiereData] = useState<Premiere | null>(null);
  const [premiereState, setPremiereState] = useState<PremiereState>('normal');
  
  // View/Like Stats
  const [viewsDisplay, setViewsDisplay] = useState(video.views_count || 0);
  const [likesCount, setLikesCount] = useState(video.likes_count || 0);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
  
  // Mobile UI States
  const [showDescription, setShowDescription] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // View counting ref
  const viewRegistered = useRef(false);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
        const { data: pData } = await supabase.from('premieres').select('*').eq('video_id', video.id).maybeSingle();
        setPremiereData(pData || null);

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', video.user_id).single();
        if (profile) setUploaderProfile(profile);

        if (user) {
            const { data: reaction } = await supabase.from('video_reactions').select('type').eq('video_id', video.id).eq('user_id', user.id).maybeSingle();
            setUserReaction(reaction?.type || null);
        }
    };
    fetchData();
  }, [video.id, user]);

  // Premiere Timer Logic
  useEffect(() => {
    let interval: any;
    const calculateState = (prem: Premiere) => {
        if (prem.status === 'ended') return 'normal';
        const now = Date.now();
        const start = new Date(prem.start_time).getTime();
        const endLive = start + 60 * 1000; 
        if (now < start) return 'upcoming';
        if (now >= start && now < endLive) return 'live';
        return 'ended_transition'; 
    };

    if (premiereData) {
        setPremiereState(calculateState(premiereData));
        interval = setInterval(() => {
            const current = calculateState(premiereData);
            if (current === 'ended_transition') {
                clearInterval(interval);
                setPremiereState('normal');
            } else {
                setPremiereState(current);
            }
        }, 1000);
    } else {
        setPremiereState('normal');
    }
    return () => clearInterval(interval);
  }, [premiereData]);

  // Handle Views
  const handleRegisterView = async () => {
    if (viewRegistered.current) return;
    viewRegistered.current = true;
    try {
        await supabase.rpc('increment_video_view', { p_video_id: video.id, p_ip_address: 'mobile' });
        setViewsDisplay(prev => prev + 1);
    } catch (e) { console.warn(e); }
  };

  const handlePremiereStart = () => setPremiereState('live');

  // Logic Constants
  const isUpcoming = premiereState === 'upcoming';
  const isLive = premiereState === 'live';
  const showChat = isUpcoming || isLive || premiereState === 'normal'; // Always show chat on mobile if needed, usually below or overlay

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col h-[100dvh]">
        
        {/* TOP BAR OVERLAY */}
        <div className={`absolute top-0 left-0 right-0 p-4 z-50 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <button onClick={onBack} className="p-2 bg-black/40 rounded-full text-white backdrop-blur-md">
                <ArrowLeft size={20} />
            </button>
            <div className="flex gap-3">
               <button className="p-2 bg-black/40 rounded-full text-white backdrop-blur-md">
                   <Share2 size={20} />
               </button>
               <button className="p-2 bg-black/40 rounded-full text-white backdrop-blur-md">
                   <MoreVertical size={20} />
               </button>
            </div>
        </div>

        {/* VIDEO LAYER */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden" onClick={() => setShowControls(!showControls)}>
            {isUpcoming && premiereData ? (
                <PremiereCountdown startTime={premiereData.start_time} onLive={handlePremiereStart} title={video.title} thumbnailUrl={video.thumbnail_url} />
            ) : (
                <VideoPlayer 
                    src={video.video_url} 
                    poster={video.thumbnail_url || undefined}
                    qualityUrls={video.quality_urls}
                    autoPlay
                    onProgress={() => handleRegisterView()}
                    className="w-full h-full object-contain"
                />
            )}
        </div>

        {/* BOTTOM OVERLAY (Chat & Info) */}
        <div className="absolute inset-x-0 bottom-0 h-[50%] pointer-events-none flex flex-col justify-end z-40">
            {/* Gradient for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

            {/* Chat Area */}
            <div className="pointer-events-auto h-full w-full flex flex-col justify-end pb-24 px-4">
                <LiveChat 
                    videoId={video.id} 
                    user={user} 
                    isOwner={user?.id === video.user_id} 
                    premiereStatus={isLive ? 'live' : 'scheduled'} 
                    onProfileClick={onProfileClick} 
                    videoOwnerId={video.user_id} 
                    videoOwnerName={uploaderProfile?.username || ''}
                    variant="overlay"
                />
            </div>
        </div>

        {/* BOTTOM METADATA BAR (Fixed) */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 p-4 z-50 flex flex-col gap-3 pb-safe">
            <div className="flex justify-between items-start" onClick={() => setShowDescription(!showDescription)}>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-black text-white uppercase tracking-tight truncate pr-4">{video.title}</h2>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                        {uploaderProfile?.username} <CheckCircle2 size={10} className="text-brand" /> 
                        <span className="mx-1">•</span> {viewsDisplay.toLocaleString()} Views
                    </p>
                </div>
                <button className="text-zinc-400">
                    {showDescription ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
            </div>

            {showDescription && (
                <div className="animate-in slide-in-from-bottom-5 text-xs text-zinc-300 max-h-40 overflow-y-auto">
                    <p>{video.description}</p>
                    <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
                        <button className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-bold uppercase">
                            <ThumbsUp size={14} /> {likesCount}
                        </button>
                        <button className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-bold uppercase">
                            <Share2 size={14} /> Share
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default MobileWatchView;
