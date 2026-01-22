import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, 
  PictureInPicture, Monitor, ChevronRight, Check, Activity 
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  qualityUrls?: Record<string, string>; // Map of "1080p" -> URL
  onEnded?: () => void;
  onProgress?: (progress: number) => void;
  onDuration?: (duration: number) => void;
  autoPlay?: boolean;
  className?: string;
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
}

const QUALITIES = ['1440p', '1080p', '720p', '480p', '360p'];

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, poster, qualityUrls, onEnded, onProgress, onDuration, 
  autoPlay = false, className, isTheaterMode, onToggleTheater 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [buffered, setBuffered] = useState<number>(0); // Percentage 0-100
  
  // Settings State
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'main' | 'quality' | 'speed'>('main');
  
  // Quality State
  const [currentQuality, setCurrentQuality] = useState<string>('Auto');
  const [activeSrc, setActiveSrc] = useState(src);
  const [detectedBandwidth, setDetectedBandwidth] = useState<number>(0); // Mbps

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- BANDWIDTH ESTIMATION ---
  useEffect(() => {
    const checkSpeed = async () => {
        const startTime = Date.now();
        // Fetch a small image to test speed (using a reliable small CDN asset or similar)
        // Here we fetch the poster or a 1px image if no poster
        const testUrl = poster || "https://upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png"; 
        try {
            const response = await fetch(testUrl, { cache: 'no-store' });
            const blob = await response.blob();
            const endTime = Date.now();
            const durationInSeconds = (endTime - startTime) / 1000;
            const sizeInBits = blob.size * 8;
            const speedMbps = (sizeInBits / durationInSeconds) / (1024 * 1024);
            setDetectedBandwidth(speedMbps);
            console.log(`Detected Bandwidth: ${speedMbps.toFixed(2)} Mbps`);
        } catch (e) {
            console.warn("Speed test failed", e);
        }
    };
    checkSpeed();
  }, [src]);

  // --- SOURCE SELECTION ---
  useEffect(() => {
    if (currentQuality === 'Auto') {
        // Simple logic: > 5Mbps = 1080p, > 2.5 = 720p, else 480p
        let bestQuality = '480p';
        if (detectedBandwidth > 8) bestQuality = '1440p';
        else if (detectedBandwidth > 4.5) bestQuality = '1080p';
        else if (detectedBandwidth > 2.5) bestQuality = '720p';
        
        // Check if we actually have that quality URL
        if (qualityUrls && qualityUrls[bestQuality]) {
            if (activeSrc !== qualityUrls[bestQuality]) {
                const time = videoRef.current?.currentTime || 0;
                const isPaused = videoRef.current?.paused;
                setActiveSrc(qualityUrls[bestQuality]);
                // Restore state after source switch
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.currentTime = time;
                        if (!isPaused) videoRef.current.play();
                    }
                }, 100);
            }
        } else {
            setActiveSrc(src); // Fallback to master
        }
    } else {
        // Manual Selection
        if (qualityUrls && qualityUrls[currentQuality]) {
            const time = videoRef.current?.currentTime || 0;
            const isPaused = videoRef.current?.paused;
            setActiveSrc(qualityUrls[currentQuality]);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.currentTime = time;
                    if (!isPaused) videoRef.current.play();
                }
            }, 100);
        } else {
            setActiveSrc(src);
        }
    }
  }, [currentQuality, detectedBandwidth, qualityUrls, src]);

  // --- EVENTS ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => { setIsPlaying(false); if(onEnded) onEnded(); };
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    
    const handleProgress = () => {
        if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const duration = video.duration;
            if (duration > 0) {
                setBuffered((bufferedEnd / duration) * 100);
            }
        }
    };

    const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        if(onProgress) onProgress(video.currentTime);
    };

    const handleDurationChange = () => {
        setDuration(video.duration);
        if(onDuration) onDuration(video.duration);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('durationchange', handleDurationChange);

    // Initial Autoplay
    if (autoPlay) {
        video.play().catch(() => setIsPlaying(false));
    }

    return () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handleCanPlay);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('progress', handleProgress);
        video.removeEventListener('durationchange', handleDurationChange);
    };
  }, [activeSrc]);

  // --- CONTROLS LOGIC ---
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
        if (videoRef.current.paused) videoRef.current.play();
        else videoRef.current.pause();
    }
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  const toggleFullScreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullScreen(true);
    } else {
        await document.exitFullscreen();
        setIsFullScreen(false);
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await videoRef.current.requestPictureInPicture();
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
        ref={containerRef} 
        className={`relative bg-black group overflow-hidden ${className || 'w-full h-full'}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
    >
        <video
            ref={videoRef}
            src={activeSrc}
            poster={poster}
            className="w-full h-full object-contain"
            playsInline
            onClick={togglePlay}
        />

        {/* Buffering Spinner */}
        {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-10">
                <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        )}

        {/* Big Play Button (Initial) */}
        {!isPlaying && !isBuffering && (
            <div 
                className="absolute inset-0 flex items-center justify-center bg-black/10 cursor-pointer z-10"
                onClick={togglePlay}
            >
                <div className="w-16 h-16 bg-brand/90 hover:bg-brand rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,0,127,0.4)] transition-transform hover:scale-110">
                    <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                </div>
            </div>
        )}

        {/* Controls Overlay */}
        <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 z-20 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            
            {/* Progress Bar */}
            <div 
                ref={progressBarRef}
                className="relative w-full h-1.5 bg-white/20 mb-4 cursor-pointer group/progress transition-all hover:h-2"
                onClick={handleSeek}
            >
                {/* Buffered Bar */}
                <div 
                    className="absolute top-0 left-0 h-full bg-white/30 transition-all duration-300"
                    style={{ width: `${buffered}%` }}
                />
                {/* Playhead Bar */}
                <div 
                    className="absolute top-0 left-0 h-full bg-brand shadow-[0_0_10px_rgba(255,0,127,0.8)] relative"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-lg" />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={togglePlay} className="text-white hover:text-brand transition-colors">
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                    </button>
                    
                    <div className="flex items-center gap-2 group/vol">
                        <button onClick={() => { 
                            const newMuted = !isMuted; 
                            setIsMuted(newMuted); 
                            if(videoRef.current) videoRef.current.muted = newMuted; 
                        }} className="text-white hover:text-brand transition-colors">
                            {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <input 
                            type="range" 
                            min="0" max="1" step="0.05" 
                            value={volume}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setVolume(val);
                                setIsMuted(val === 0);
                                if(videoRef.current) {
                                    videoRef.current.volume = val;
                                    videoRef.current.muted = val === 0;
                                }
                            }}
                            className="w-0 overflow-hidden group-hover/vol:w-20 transition-all h-1 accent-brand bg-white/20 rounded-full appearance-none"
                        />
                    </div>

                    <span className="text-xs font-bold text-white tabular-nums tracking-wide">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>

                <div className="flex items-center gap-4 relative">
                    <div className="relative">
                        <button 
                            onClick={() => setShowSettings(!showSettings)} 
                            className={`transition-all ${showSettings ? 'rotate-45 text-brand' : 'text-white hover:text-brand'}`}
                        >
                            <Settings size={20} />
                        </button>

                        {/* Settings Menu */}
                        {showSettings && (
                            <div className="absolute bottom-full right-0 mb-4 w-56 bg-black/95 border border-white/10 rounded-lg shadow-2xl p-2 animate-in slide-in-from-bottom-2 overflow-hidden">
                                {activeMenu === 'main' && (
                                    <div className="space-y-1">
                                        <button 
                                            onClick={() => setActiveMenu('quality')}
                                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-white hover:bg-white/10 rounded"
                                        >
                                            <span className="flex items-center gap-2"><Activity size={14} /> Quality</span>
                                            <span className="flex items-center gap-1 text-zinc-400">{currentQuality} <ChevronRight size={14} /></span>
                                        </button>
                                        <button 
                                            onClick={() => setActiveMenu('speed')}
                                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-white hover:bg-white/10 rounded"
                                        >
                                            <span className="flex items-center gap-2"><Monitor size={14} /> Speed</span>
                                            <span className="flex items-center gap-1 text-zinc-400">{playbackRate}x <ChevronRight size={14} /></span>
                                        </button>
                                    </div>
                                )}

                                {activeMenu === 'quality' && (
                                    <div className="space-y-1">
                                        <button onClick={() => setActiveMenu('main')} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase text-zinc-500 border-b border-white/10 mb-1 hover:text-white">
                                            &lt; Back to Settings
                                        </button>
                                        <button 
                                            onClick={() => { setCurrentQuality('Auto'); setShowSettings(false); setActiveMenu('main'); }}
                                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-white hover:bg-white/10 rounded"
                                        >
                                            <span>Auto {currentQuality === 'Auto' ? `(${detectedBandwidth > 5 ? 'HD' : 'SD'})` : ''}</span>
                                            {currentQuality === 'Auto' && <Check size={14} className="text-brand" />}
                                        </button>
                                        {QUALITIES.map(q => (
                                            <button 
                                                key={q}
                                                onClick={() => { setCurrentQuality(q); setShowSettings(false); setActiveMenu('main'); }}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold hover:bg-white/10 rounded ${qualityUrls?.[q] ? 'text-white' : 'text-zinc-500 cursor-not-allowed'}`}
                                                disabled={!qualityUrls?.[q]}
                                            >
                                                <span>{q} {qualityUrls?.[q] ? '' : '(NA)'}</span>
                                                {currentQuality === q && <Check size={14} className="text-brand" />}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeMenu === 'speed' && (
                                    <div className="space-y-1">
                                        <button onClick={() => setActiveMenu('main')} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase text-zinc-500 border-b border-white/10 mb-1 hover:text-white">
                                            &lt; Back to Settings
                                        </button>
                                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                            <button 
                                                key={rate}
                                                onClick={() => { 
                                                    setPlaybackRate(rate); 
                                                    if(videoRef.current) videoRef.current.playbackRate = rate;
                                                    setShowSettings(false); 
                                                    setActiveMenu('main'); 
                                                }}
                                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-white hover:bg-white/10 rounded"
                                            >
                                                <span>{rate === 1 ? 'Normal' : `${rate}x`}</span>
                                                {playbackRate === rate && <Check size={14} className="text-brand" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button onClick={togglePiP} className="text-white hover:text-brand transition-colors" title="Picture in Picture"><PictureInPicture size={20} /></button>
                    {onToggleTheater && (
                        <button onClick={onToggleTheater} className={`transition-colors ${isTheaterMode ? 'text-brand' : 'text-white hover:text-brand'}`} title="Theater Mode"><Monitor size={20} /></button>
                    )}
                    <button onClick={toggleFullScreen} className="text-white hover:text-brand transition-colors" title="Fullscreen">{isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}</button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default VideoPlayer;