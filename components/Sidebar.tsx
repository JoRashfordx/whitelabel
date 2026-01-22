
import React from 'react';
import { Home, ShieldAlert, ShieldCheck, Compass, Flame, Layers, Zap, Clock, Lock, ListVideo, UserCircle } from 'lucide-react';
import { ViewState, User } from '../types';

interface SidebarProps {
  isOpen: boolean;
  activeView: ViewState;
  onNavigate: (view: ViewState, params?: any) => void;
  restrictedMode: boolean;
  onToggleRestrictedMode: () => void;
  user: User | null;
  isAdult?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  activeView, 
  onNavigate, 
  restrictedMode, 
  onToggleRestrictedMode, 
  user,
  isAdult = false 
}) => {
  const discoveryItems = [
    { icon: Home, label: 'HOME', view: 'HOME' as const },
    { icon: Flame, label: 'TRENDING', view: 'TRENDING' as const },
    { icon: Layers, label: 'SERIES', view: 'SERIES_BROWSE' as const },
    { icon: Compass, label: 'EXPLORE', view: 'EXPLORE' as const },
  ];

  if (!isOpen) return null;

  const isWatchPage = activeView === 'WATCH';
  
  const isEnforced = user && !isAdult;
  const effectiveRestrictedMode = isEnforced ? true : restrictedMode;

  return (
    <aside className={`
      bg-primary/95 backdrop-blur-xl border-r border-glass-border w-64 transition-all duration-300 flex flex-col overflow-y-auto shrink-0 z-40
      ${isWatchPage 
        ? 'sticky top-0 h-screen pt-16' 
        : 'sticky top-16 h-[calc(100vh-64px)]'
      }
    `}>
      <div className="flex-1 flex flex-col gap-8 py-6 px-4">
        
        {/* DISCOVERY SECTION */}
        <div className="space-y-1">
          <h3 className="px-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Discovery</h3>
          {discoveryItems.map((item) => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-4 px-3 py-2.5 transition-colors group ${
                activeView === item.view ? 'bg-white/5 text-brand border-r-2 border-brand' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-4 h-4 ${activeView === item.view ? 'text-brand' : 'group-hover:text-brand'}`} />
              <span className="text-[11px] font-bold uppercase tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>

        {/* MY ACCOUNT SECTION (Logged In) */}
        {user && (
            <div className="space-y-1 pt-4 border-t border-glass-border">
                <h3 className="px-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">My Account</h3>
                
                <button
                    onClick={() => onNavigate('HISTORY')}
                    className={`w-full flex items-center gap-4 px-3 py-2.5 transition-colors group ${
                    activeView === 'HISTORY' ? 'bg-white/5 text-brand border-r-2 border-brand' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Clock className={`w-4 h-4 ${activeView === 'HISTORY' ? 'text-brand' : 'group-hover:text-brand'}`} />
                    <span className="text-[11px] font-bold uppercase tracking-tight">History</span>
                </button>

                <button
                    onClick={() => onNavigate('PLAYLIST_DETAIL', { type: 'watch_later' })}
                    className={`w-full flex items-center gap-4 px-3 py-2.5 transition-colors group ${
                    activeView === 'PLAYLIST_DETAIL' ? 'bg-white/5 text-brand border-r-2 border-brand' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Clock className={`w-4 h-4 ${activeView === 'PLAYLIST_DETAIL' ? 'text-brand' : 'group-hover:text-brand'}`} />
                    <span className="text-[11px] font-bold uppercase tracking-tight">Watch Later</span>
                </button>

                <button
                    onClick={() => onNavigate('LIBRARY')}
                    className={`w-full flex items-center gap-4 px-3 py-2.5 transition-colors group ${
                    activeView === 'LIBRARY' ? 'bg-white/5 text-brand border-r-2 border-brand' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <ListVideo className={`w-4 h-4 ${activeView === 'LIBRARY' ? 'text-brand' : 'group-hover:text-brand'}`} />
                    <span className="text-[11px] font-bold uppercase tracking-tight">My Playlists</span>
                </button>
            </div>
        )}

        {/* Global Safety Toggle */}
        {user && (
          <div className="space-y-4 pt-4 border-t border-glass-border px-3">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Safety</h3>
            <button 
              onClick={() => { if (!isEnforced) onToggleRestrictedMode(); }}
              disabled={isEnforced}
              className={`w-full flex items-center justify-between group py-1 ${isEnforced ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-4">
                {effectiveRestrictedMode ? (
                  isEnforced ? <Lock className="w-4 h-4 text-emerald-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-zinc-500 group-hover:text-rose-500 transition-colors" />
                )}
                <span className={`text-[10px] font-bold uppercase transition-colors ${effectiveRestrictedMode ? 'text-white' : 'text-zinc-400'}`}>
                  Restricted Mode
                </span>
              </div>
              
              <div className={`w-8 h-4 border transition-all relative rounded-full ${
                  effectiveRestrictedMode 
                    ? 'bg-emerald-500 border-emerald-500' 
                    : 'bg-zinc-800 border-zinc-600'
              }`}>
                <div className={`absolute top-0.5 bottom-0.5 w-3 rounded-full transition-all shadow-sm ${
                    effectiveRestrictedMode ? 'bg-white left-[16px]' : 'bg-zinc-400 left-[2px]'
                }`} />
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/5">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
          <button onClick={() => onNavigate('RATINGS')} className="hover:text-white transition-colors">Ratings</button>
          <button onClick={() => onNavigate('TERMS')} className="hover:text-white transition-colors">Terms</button>
          <button onClick={() => onNavigate('PRIVACY')} className="hover:text-white transition-colors">Privacy</button>
          <button onClick={() => onNavigate('SERIES_POLICY')} className="hover:text-white transition-colors">Series</button>
        </div>
        <div className="mt-4 text-[8px] text-zinc-600 font-bold uppercase tracking-widest">
          © 2025 VidFree Global
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
