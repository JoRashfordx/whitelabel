import React, { useState, useRef, useEffect } from 'react';
import { Video, Premiere } from '../types';
import { Play, Lock, Clock, Flame, MoreVertical, ListVideo, Clock as ClockIcon } from 'lucide-react';

interface Vidfree_videocardProps {
  video: Video & { 
    profile?: { username: string | null; avatar_url: string | null };
    premiere?: Premiere;
    isHot?: boolean;
    isBoosted?: boolean;
    momentum_score?: number;
  };
  onSelect: (video: Video) => void;
  onProfileClick?: (userId: string) => void;
  rank?: number;
  showAvatar?: boolean;
  isDense?: boolean;
  hideMeta?: boolean;
  onAddToPlaylist?: (video: Video) => void;
  onAddToWatchLater?: (video: Video) => void;
}

const getCountdown = (targetDate: string) => {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return 'NOW';
  const mins = Math.ceil(diff / 60000);
  const hrs = Math.ceil(diff / 3600000);
  const days = Math.ceil(diff / 86400000);
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  return `${days}d`;
};

const formatViews = (count: number) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
};

const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const Vidfree_videocard: React.FC<Vidfree_videocardProps> = ({ 
  video, 
  onSelect, 
  onProfileClick, 
  rank, 
  showAvatar = true, 
  isDense = false,
  hideMeta = false,
  onAddToPlaylist,
  onAddToWatchLater
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [premiereState, setPremiereState] = useState<'normal'|'upcoming'|'live'>('normal');
  const [countdown, setCountdown] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!video.premiere) return;
    const check = () => {
        const now = Date.now();
        const start = new Date(video.premiere!.start_time).getTime();
        const end = start + 60000; 
        if (now < start) {
            setPremiereState('upcoming');
            setCountdown(getCountdown(video.premiere!.start_time));
        } else if (now >= start && now < end) {
            setPremiereState('live');
        } else {
            setPremiereState('normal');
        }
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [video.premiere]);

  useEffect(() => {
    if (isHovered && videoRef.current && premiereState !== 'upcoming') {
        videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
    }
  }, [isHovered, premiereState]);

  const ratingColor = 
    video.rating === 'R' ? 'bg-rose-600 border-rose-600 text-white' :
    video.rating === 'PG' ? 'bg-amber-500 border-amber-500 text-black' :
    'bg-emerald-500 border-emerald-500 text-white';

  const avatarUrl = video.profile?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${video.user_id}`;

  return (
    <div 
        className={`vidfree-videocard group flex flex-col cursor-pointer relative transition-transform duration-300 ${!isDense && 'hover:-translate-y-1'}`}
        onClick={() => onSelect(video)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
    >
        {/* RANK BADGE FOR TRENDING */}
        {rank && (
            <div className={`absolute -top-2 -left-2 z-30 w-6 h-6 font-black flex items-center justify-center text-xs shadow-xl border-2 border-[#050505] transition-colors ${rank <= 3 ? 'bg-brand text-white' : 'bg-white text-black'}`}>
                #{rank}
            </div>
        )}

        {/* THUMBNAIL CONTAINER */}
        <div className="vidfree-videocard__thumbnail relative w-full aspect-video bg-black overflow-hidden rounded-sm border border-white/5 group-hover:border-brand/50 transition-colors">
            {/* Image */}
            <img 
                src={video.thumbnail_url || ''} 
                className={`w-full h-full object-cover transition-opacity duration-500 ${isHovered && premiereState !== 'upcoming' ? 'opacity-0' : 'opacity-100'}`} 
                alt=""
            />
            
            {/* Video Preview */}
            <video 
                ref={videoRef}
                src={video.video_url} 
                muted loop playsInline 
                className={`absolute inset-0 w-full h-full object-cover ${isHovered && premiereState !== 'upcoming' ? 'opacity-100' : 'opacity-0'}`} 
            />

            {/* PREMIERE OVERLAYS */}
            {premiereState === 'upcoming' && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm z-20">
                    <Lock className="w-5 h-5 text-white mb-1" />
                    <span className="text-[8px] font-black bg-brand text-white px-2 py-0.5 uppercase tracking-widest">Premiere</span>
                    <span className="text-[10px] font-mono font-bold text-white mt-1">in {countdown}</span>
                </div>
            )}
            {premiereState === 'live' && (
                <div className="absolute top-2 left-2 z-20">
                    <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest animate-pulse shadow-lg">Live</span>
                </div>
            )}

            {/* BADGES */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-20 pointer-events-none">
                {(video.isHot || (video.momentum_score && video.momentum_score > 1.5)) && (
                    <div className="px-1.5 py-0.5 bg-orange-600 text-white text-[8px] font-black uppercase shadow-lg flex items-center gap-1">
                        <Flame size={8} fill="currentColor"/> HOT
                    </div>
                )}
                {video.isBoosted && (
                    <div className="px-1.5 py-0.5 bg-brand text-white text-[8px] font-black uppercase shadow-lg">NEW</div>
                )}
                <div className={`px-1.5 py-0.5 text-[8px] font-black uppercase border shadow-lg ${ratingColor}`}>
                    {video.rating}
                </div>
            </div>

            {/* DURATION PILL */}
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/90 text-white border border-white/10 text-[9px] font-bold tracking-widest shadow-xl rounded-sm">
                {video.duration || '0:00'}
            </div>

            {/* HOVER PLAY ICON (Non-Premiere) */}
            {premiereState === 'normal' && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>
                </div>
            )}
        </div>

        {/* META INFO */}
        {!hideMeta && (
            <div className="vidfree-videocard__meta flex gap-3 mt-3 px-1">
                {showAvatar && (
                    <div 
                        className="w-8 h-8 shrink-0 bg-zinc-900 rounded-full overflow-hidden border border-white/10 group-hover:border-brand transition-colors cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onProfileClick && onProfileClick(video.user_id); }}
                    >
                        <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                )}
                
                <div className="flex-1 min-w-0 relative">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className={`font-bold text-white leading-tight mb-1 line-clamp-2 min-h-[2.5em] group-hover:text-brand transition-colors ${isDense ? 'text-xs' : 'text-sm'}`}>
                            {video.title}
                        </h3>
                        
                        {(onAddToPlaylist || onAddToWatchLater) && (
                            <div className="relative shrink-0 -mt-1 -mr-1">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                    className="p-1 text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <MoreVertical size={14} />
                                </button>
                                {showMenu && (
                                    <div className="absolute top-full right-0 mt-1 w-40 bg-[#111] border border-white/10 shadow-xl py-1 z-50 flex flex-col animate-in fade-in slide-in-from-top-2 rounded-sm">
                                        {onAddToWatchLater && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onAddToWatchLater(video); setShowMenu(false); }}
                                                className="flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase text-zinc-300 hover:text-white hover:bg-white/10 text-left"
                                            >
                                                <ClockIcon size={12} /> Watch Later
                                            </button>
                                        )}
                                        {onAddToPlaylist && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onAddToPlaylist(video); setShowMenu(false); }}
                                                className="flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase text-zinc-300 hover:text-white hover:bg-white/10 text-left"
                                            >
                                                <ListVideo size={12} /> Save to Playlist
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {showAvatar && (
                        <p 
                            className="text-[10px] font-bold text-zinc-500 uppercase truncate hover:text-white transition-colors cursor-pointer mb-1.5"
                            onClick={(e) => { e.stopPropagation(); onProfileClick && onProfileClick(video.user_id); }}
                        >
                            {video.profile?.username?.replace('@', '') || 'Creator'}
                        </p>
                    )}

                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-zinc-400">
                        <div className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-sm">
                            {formatViews(video.views_count)} Views
                        </div>
                        <div className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-sm">
                            {timeAgo(video.created_at)}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Vidfree_videocard;