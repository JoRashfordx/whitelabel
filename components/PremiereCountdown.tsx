
import React, { useState, useEffect } from 'react';
import { Clock, Play, Bell } from 'lucide-react';

interface PremiereCountdownProps {
  startTime: string;
  onLive: () => void;
  title: string;
  thumbnailUrl: string | null;
}

const PremiereCountdown: React.FC<PremiereCountdownProps> = ({ startTime, onLive, title, thumbnailUrl }) => {
  const [timeLeft, setTimeLeft] = useState<{h: number, m: number, s: number} | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(startTime).getTime();
      const dist = target - now;

      if (dist < 0) {
        clearInterval(timer);
        onLive();
      } else {
        const h = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((dist % (1000 * 60)) / 1000);
        setTimeLeft({ h, m, s });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, onLive]);

  if (!timeLeft) return null;

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Background with Blur */}
      {thumbnailUrl && (
        <div className="absolute inset-0 z-0">
          <img src={thumbnailUrl} className="w-full h-full object-cover opacity-30 blur-2xl scale-110" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      <div className="relative z-10 text-center space-y-8 p-8 animate-in fade-in zoom-in duration-700">
        <div className="space-y-2">
          <span className="text-brand font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" /> Premiere Event
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter max-w-2xl leading-none">
            {title}
          </h1>
        </div>

        <div className="flex items-center justify-center gap-4 md:gap-8 font-mono text-white">
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-7xl font-black">{timeLeft.h.toString().padStart(2, '0')}</span>
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Hours</span>
          </div>
          <span className="text-4xl md:text-7xl font-black text-zinc-700">:</span>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-7xl font-black">{timeLeft.m.toString().padStart(2, '0')}</span>
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Minutes</span>
          </div>
          <span className="text-4xl md:text-7xl font-black text-zinc-700">:</span>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-7xl font-black text-brand">{timeLeft.s.toString().padStart(2, '0')}</span>
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Seconds</span>
          </div>
        </div>

        <button className="bg-white/10 hover:bg-white/20 border border-white/10 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-3 mx-auto">
          <Bell className="w-4 h-4" /> Notify Me
        </button>
      </div>
    </div>
  );
};

export default PremiereCountdown;
