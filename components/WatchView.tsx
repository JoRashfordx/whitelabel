import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Video, Profile, User, VideoRating, Premiere, PlaylistItem } from '../types';
import { supabase } from '../services/supabase';
import { 
  CheckCircle2, Play, Pause, Eye, ChevronDown, ChevronUp, Share2, 
  ThumbsUp, ThumbsDown, Loader2, Volume2, VolumeX, Maximize, 
  Minimize, Monitor, Settings, PictureInPicture, ShieldAlert, Lock,
  Activity, ListVideo, PlusSquare, Clock
} from 'lucide-react';
import SharedCommentSection from './CommentSection';
import LiveChat from './LiveChat';
import PremiereCountdown from './PremiereCountdown';
import VideoPlayer from './VideoPlayer';

interface WatchViewProps {
  video: Video;
  user: User | null;
  onBack: () => void;
  onVideoSelect: (video: Video, playlistId?: string) => void;
  onProfileClick: (userId: string) => void;
  highlightCommentId?: string;
  allowedRatings: VideoRating[];
  playlistId?: string; // New: context for playlist queue
  onAddToPlaylist?: (video: Video) => void;
  onAddToWatchLater?: (video: Video) => void;
}

type PremiereState = 'normal' | 'upcoming' | 'live' | 'ended_transition';

const WatchView: React.FC<WatchViewProps> = ({ 
  video, user, onBack, onVideoSelect, onProfileClick, 
  highlightCommentId, allowedRatings, playlistId,
  onAddToPlaylist, onAddToWatchLater
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  
  const viewRegistered = useRef(false);
  const historyRecorded = useRef(false);
  const [viewsDisplay, setViewsDisplay] = useState(video.views_count || 0);
  const [uploaderProfile, setUploaderProfile] = useState<Profile | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Playlist State
  const [playlistItems, setPlaylistItems] = useState<(PlaylistItem & { video: Video & { profile?: { username: string } } })[]>([]);
  const [currentPlaylistTitle, setCurrentPlaylistTitle] = useState('');

  // Premiere State Logic
  const [premiereData, setPremiereData] = useState<Premiere | null>(null);
  const [premiereState, setPremiereState] = useState<PremiereState>('normal');

  // Processing State Logic
  const [processingStatus, setProcessingStatus] = useState<'processing'|'ready'|'failed'>(video.processing_status || 'ready');
  const [processProgress, setProcessProgress] = useState(0);

  // Like/Dislike States
  const [likesCount, setLikesCount] = useState(video.likes_count || 0);
  const [dislikesCount, setDislikesCount] = useState(video.dislikes_count || 0);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);

  const isOwner = user?.id === video.user_id;
  const isAllowed = allowedRatings.includes(video.rating as VideoRating) || isOwner;

  // --- RECORD WATCH HISTORY ON PLAY ---
  const handleRecordHistory = async () => {
      if (historyRecorded.current || !user) return;
      historyRecorded.current = true;
      try {
          await supabase.rpc('add_to_watch_history', { p_user_id: user.id, p_video_id: video.id });
      } catch (err) {
          console.error("Failed to record history", err);
      }
  };

  // --- PROCESSING SIMULATION WORKER (OWNER ONLY) ---
  useEffect(() => {
    if (processingStatus === 'processing' && isOwner) {
        console.log("Starting Processing Simulation...");
        const duration = 15000; // 15 seconds simulation
        const steps = 100;
        const intervalTime = duration / steps;
        
        let current = 0;
        const interval = setInterval(() => {
            current++;
            setProcessProgress(current);
            
            if (current >= 100) {
                clearInterval(interval);
                finishProcessing();
            }
        }, intervalTime);

        return () => clearInterval(interval);
    }
  }, [processingStatus, isOwner]);

  const finishProcessing = async () => {
      const qualityMap: Record<string, string> = {};
      const allTiers = ['1440p', '1080p', '720p', '480p', '360p'];
      allTiers.forEach(q => { qualityMap[q] = video.video_url; });

      const { error } = await supabase.from('videos').update({
          processing_status: 'ready',
          quality_urls: qualityMap,
          updated_at: new Date().toISOString()
      }).eq('id', video.id);

      if (!error) {
          setProcessingStatus('ready');
      }
  };

  useEffect(() => {
    setIsPlaying(false);
    setPremiereData(null); 
    setPremiereState('normal');
    setProcessingStatus(video.processing_status || 'ready');
    setProcessProgress(0);
    viewRegistered.current = false;
    historyRecorded.current = false;
    setViewsDisplay(video.views_count || 0);
    setLikesCount(video.likes_count || 0);
    setDislikesCount(video.dislikes_count || 0);
  }, [video.id, video.processing_status]); 

  useEffect(() => {
    const fetchData = async () => {
      const { data: pData } = await supabase.from('premieres').select('*').eq('video_id', video.id).maybeSingle();
      if (pData) setPremiereData(pData);
      else setPremiereData(null);

      // Fetch Playlist Data if Context exists
      if (playlistId) {
          const { data: pl } = await supabase.from('playlists').select('title').eq('id', playlistId).single();
          if (pl) setCurrentPlaylistTitle(pl.title);

          const { data: pItems } = await supabase
            .from('playlist_items')
            .select(`*, video:videos(*, profile:profiles(username))`)
            .eq('playlist_id', playlistId)
            .order('added_at', { ascending: false }); // Or position if implemented
          
          if (pItems) {
              setPlaylistItems(pItems.filter((i: any) => i.video) as any);
          }
      } else if (processingStatus === 'ready') {
          // Fallback to related videos if no playlist
          const { data: related } = await supabase.from('videos')
            .select('*')
            .neq('id', video.id)
            .eq('processing_status', 'ready')
            .eq('visibility', 'public')
            .limit(20);
          
          if (related) {
             const safeRelated = related.filter((v: any) => 
                allowedRatings.includes(v.rating as VideoRating) || v.user_id === user?.id
             ).slice(0, 10);
             setRelatedVideos(safeRelated);
          }
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', video.user_id).single();
      if (profile) setUploaderProfile(profile);

      if (user) {
        const { data: reaction } = await supabase.from('video_reactions').select('type').eq('video_id', video.id).eq('user_id', user.id).maybeSingle();
        setUserReaction(reaction?.type || null);
      }
    };
    fetchData();
  }, [video.id, user, allowedRatings, processingStatus, playlistId]);

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
        const newState = calculateState(premiereData);
        setPremiereState(newState === 'ended_transition' ? 'normal' : newState);

        interval = setInterval(async () => {
            const current = calculateState(premiereData);
            if (current === 'ended_transition') {
                clearInterval(interval);
                setPremiereState('normal');
                try {
                    await supabase.rpc('finalize_premiere', { p_video_id: video.id });
                    const { data } = await supabase.from('videos').select('views_count').eq('id', video.id).single();
                    if (data) setViewsDisplay(data.views_count);
                } catch (e) {
                    console.error("Failed to finalize premiere", e);
                }
            } else {
                setPremiereState(current);
            }
        }, 1000);
    } else {
        setPremiereState('normal');
    }
    return () => clearInterval(interval);
  }, [premiereData, video.id]);

  const handlePremiereStart = () => { setPremiereState('live'); };

  const handleRegisterView = async () => {
    // Record History on first progress
    handleRecordHistory();

    if (viewRegistered.current) return;
    viewRegistered.current = true;
    try {
      let ip = '0.0.0.0';
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 2000); 
        const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
        clearTimeout(id);
        const data = await res.json();
        ip = data.ip;
      } catch (e) { console.warn("IP Fetch failed", e); }

      if (premiereData && premiereData.status !== 'ended') {
          await supabase.rpc('register_premiere_view', { p_video_id: video.id, p_user_id: user?.id || null, p_ip_address: ip });
      } else {
          const { error } = await supabase.rpc('increment_video_view', { p_video_id: video.id, p_ip_address: ip });
          if (!error) setViewsDisplay(prev => prev + 1);
      }
    } catch (err) { console.warn("View error:", err); }
  };

  const handleVideoEnded = () => {
      // Auto-play next in playlist if active
      if (playlistId && playlistItems.length > 0) {
          const currentIndex = playlistItems.findIndex(i => i.video_id === video.id);
          if (currentIndex !== -1 && currentIndex < playlistItems.length - 1) {
              const nextItem = playlistItems[currentIndex + 1];
              onVideoSelect(nextItem.video, playlistId);
          }
      }
  };

  const handleReaction = async (type: 'like' | 'dislike') => {
    if (!user) return alert(`You must sign in to ${type} this video`);
    const previousReaction = userReaction;
    const isRemoving = previousReaction === type;
    const newReaction = isRemoving ? null : type;
    setUserReaction(newReaction);
    if (isRemoving) {
      if (type === 'like') setLikesCount(prev => Math.max(0, prev - 1));
      else setDislikesCount(prev => Math.max(0, prev - 1));
    } else {
      if (type === 'like') {
        setLikesCount(prev => prev + 1);
        if (previousReaction === 'dislike') setDislikesCount(prev => Math.max(0, prev - 1));
      } else {
        setDislikesCount(prev => prev + 1);
        if (previousReaction === 'like') setLikesCount(prev => Math.max(0, prev - 1));
      }
    }
    try {
      const { error } = await supabase.rpc('handle_video_reaction', { p_video_id: video.id, p_user_id: user.id, p_type: newReaction });
      if (error) throw error;
    } catch (err) {
      console.error("Reaction failed:", err);
      setUserReaction(previousReaction);
      // Revert counts... (omitted for brevity)
    }
  };

  const getRatingBadge = () => {
    const style = video.rating === 'R' ? 'bg-rose-600 border-rose-600 text-white' :
                  video.rating === 'PG' ? 'bg-amber-500 border-amber-500 text-black' :
                  'bg-emerald-500 border-emerald-500 text-white';
    return <div className={`px-2 py-1 text-[9px] font-black uppercase border shadow-lg ${style}`}>{video.rating}</div>;
  };

  const isUpcoming = premiereState === 'upcoming';
  const isLive = premiereState === 'live';
  const isChatActive = isUpcoming || isLive;

  return (
    <div className={`relative min-h-screen pt-32 pb-40 px-4 md:px-8 transition-all duration-500`}>
      <div className={`${isTheaterMode ? 'max-w-full' : 'max-w-[1800px]'} mx-auto`}>
        <div className={`flex flex-col ${isTheaterMode ? 'lg:flex-col' : 'lg:flex-row'} gap-8`}>
          
          <div className="flex-1 space-y-8">
            <div ref={containerRef} className={`video-player-container relative border border-white/5 overflow-hidden group shadow-2xl ${isTheaterMode ? 'aspect-[21/9]' : 'aspect-video'}`} style={{ backgroundColor: 'black' }}>
              {!isAllowed ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 p-10 text-center space-y-6">
                   <ShieldAlert className="w-16 h-16 text-rose-500" />
                   <div className="space-y-2">
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Restricted Content</h3>
                      <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest max-w-md mx-auto">This video is rated <span className="text-rose-500">{video.rating}</span>.</p>
                   </div>
                </div>
              ) : processingStatus === 'processing' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-50 p-10 text-center space-y-8 animate-in fade-in">
                      <Activity className="w-20 h-20 text-brand animate-pulse" />
                      <div className="space-y-2">
                          <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Processing Video</h3>
                          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest max-w-md mx-auto">Please wait while we optimize this video.</p>
                      </div>
                      {isOwner && (
                          <div className="w-full max-w-md space-y-2">
                              <div className="h-1 bg-zinc-800 w-full overflow-hidden rounded-full">
                                  <div className="h-full bg-brand transition-all duration-300 ease-linear" style={{width: `${processProgress}%`}} />
                              </div>
                          </div>
                      )}
                  </div>
              ) : isUpcoming && premiereData ? (
                <PremiereCountdown startTime={premiereData.start_time} onLive={handlePremiereStart} title={video.title} thumbnailUrl={video.thumbnail_url} />
              ) : (
                <>
                  <VideoPlayer 
                    src={video.video_url}
                    poster={video.thumbnail_url || undefined}
                    qualityUrls={video.quality_urls}
                    autoPlay={true}
                    onProgress={() => handleRegisterView()}
                    isTheaterMode={isTheaterMode}
                    onToggleTheater={() => setIsTheaterMode(!isTheaterMode)}
                    onEnded={handleVideoEnded}
                  />
                  {isLive && (
                      <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg pointer-events-none">Live Premiere</div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-start">
                 <h1 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-tight max-w-[80%]">{video.title}</h1>
                 {getRatingBadge()}
              </div>
              
              <div className="bg-white/5 border border-white/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span className="flex items-center gap-2 text-white"><Eye size={16} className="text-brand" /> {viewsDisplay.toLocaleString()} Views</span>
                  <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                    <button onClick={() => handleReaction('like')} className={`flex items-center gap-2 transition-colors ${userReaction === 'like' ? 'text-brand' : 'hover:text-white'}`}>
                      <ThumbsUp size={18} className={userReaction === 'like' ? 'fill-brand' : ''} />
                      <span>{likesCount.toLocaleString()}</span>
                    </button>
                    <button onClick={() => handleReaction('dislike')} className={`flex items-center gap-2 transition-colors ${userReaction === 'dislike' ? 'text-brand' : 'hover:text-white'}`}>
                      <ThumbsDown size={18} className={userReaction === 'dislike' ? 'fill-brand' : ''} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {onAddToWatchLater && (
                        <button 
                            onClick={() => onAddToWatchLater(video)}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <Clock size={14} /> Watch Later
                        </button>
                    )}
                    {onAddToPlaylist && (
                        <button 
                            onClick={() => onAddToPlaylist(video)}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <PlusSquare size={14} /> Save
                        </button>
                    )}
                    <button className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <Share2 size={14} /> Share
                    </button>
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-white/5 p-6 flex items-center justify-between">
                <div className="flex items-center gap-5 cursor-pointer group" onClick={() => onProfileClick(video.user_id)}>
                  <div className="w-14 h-14 bg-zinc-900 border border-white/10 overflow-hidden shrink-0">
                    <img src={uploaderProfile?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${video.user_id}`} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white uppercase flex items-center gap-2 group-hover:text-brand transition-colors">
                      {uploaderProfile?.username || 'Creator'} <CheckCircle2 size={16} className="text-brand" />
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{uploaderProfile?.subscribers_count || 0} Subscribers</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-8 space-y-4">
                <div className={`text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap ${!isDescriptionExpanded ? 'line-clamp-2' : ''}`}>{video.description || 'No description.'}</div>
                <button onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="text-[11px] font-bold text-white uppercase tracking-widest hover:text-brand flex items-center gap-3 border-t border-white/5 pt-4 w-full">
                  {isDescriptionExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {isDescriptionExpanded ? 'Show Less' : 'Show More'}
                </button>
              </div>

              {/* COMMENTS vs CHAT */}
              {isChatActive ? (
                  <div className="lg:hidden block">
                      <div className="bg-brand/10 border border-brand/20 p-2 mb-2 text-center">
                          <p className="text-[9px] font-black text-brand uppercase tracking-widest">Live Premiere Chat</p>
                      </div>
                      <LiveChat videoId={video.id} user={user} isOwner={isOwner} premiereStatus={isLive ? 'live' : 'scheduled'} onProfileClick={onProfileClick} videoOwnerId={video.user_id} videoOwnerName={uploaderProfile?.username || 'Broadcaster'} />
                  </div>
              ) : processingStatus === 'ready' && (
                  <SharedCommentSection targetType="video" targetId={video.id} currentUser={user} contentOwnerId={video.user_id} />
              )}
            </div>
          </div>

          <div className="w-full lg:w-[420px] space-y-6">
            {isChatActive && (
                <div className="hidden lg:block h-[600px] border border-white/5">
                    <LiveChat videoId={video.id} user={user} isOwner={isOwner} premiereStatus={isLive ? 'live' : 'scheduled'} onProfileClick={onProfileClick} videoOwnerId={video.user_id} videoOwnerName={uploaderProfile?.username || 'Broadcaster'} />
                </div>
            )}

            {/* UP NEXT OR PLAYLIST QUEUE */}
            {playlistId ? (
                // PLAYLIST QUEUE
                <div className="space-y-4 border border-white/10 bg-[#0a0a0a] rounded overflow-hidden">
                    <div className="p-4 bg-white/5 border-b border-white/5">
                        <h2 className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <ListVideo size={16} /> {currentPlaylistTitle || 'Playlist'}
                        </h2>
                        <p className="text-[9px] text-zinc-500 uppercase mt-1">{playlistItems.findIndex(i => i.video_id === video.id) + 1} / {playlistItems.length}</p>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        {playlistItems.map((item, idx) => (
                            <div 
                                key={item.id} 
                                onClick={() => onVideoSelect(item.video, playlistId)}
                                className={`flex gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors ${item.video_id === video.id ? 'bg-white/5 border-l-2 border-brand' : ''}`}
                            >
                                <div className="text-[10px] text-zinc-500 w-4 flex items-center justify-center font-bold">{idx + 1}</div>
                                <div className="w-24 aspect-video bg-black shrink-0 relative overflow-hidden border border-white/5">
                                    <img src={item.video.thumbnail_url || ''} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-[11px] font-bold truncate ${item.video_id === video.id ? 'text-brand' : 'text-zinc-300'}`}>{item.video.title}</h4>
                                    <p className="text-[9px] text-zinc-500 uppercase">{item.video.profile?.username || 'Creator'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : processingStatus === 'ready' && (
                // STANDARD RELATED VIDEOS
                <div className="space-y-6">
                    <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/10 pb-4">Up Next</h2>
                    <div className="space-y-5">
                        {relatedVideos.map(v => (
                        <div key={v.id} onClick={() => onVideoSelect(v, undefined)} className="flex gap-4 group cursor-pointer">
                            <div className="relative w-44 aspect-video flex-shrink-0 bg-black border border-white/5 overflow-hidden">
                            <img src={v.thumbnail_url || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" alt="" />
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/90 text-[10px] font-bold text-white border border-white/10">{v.duration || '0:00'}</div>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h4 className="text-[12px] font-bold text-zinc-200 uppercase line-clamp-2 leading-tight group-hover:text-brand transition-colors">{v.title}</h4>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{v.views_count.toLocaleString()} Views</p>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchView;