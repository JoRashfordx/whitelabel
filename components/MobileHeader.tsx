
import React, { useState, useEffect } from 'react';
import { Search, Bell, Mail, Video, X } from 'lucide-react';
import { User, Notification } from '../types';

interface MobileHeaderProps {
  user: User | null;
  onSearch: (query: string) => void;
  onOpenMessages: () => void;
  onLogoClick: () => void;
  unreadMsgCount: number;
  unreadNotifCount: number;
  onToggleNotifications: () => void;
  onUploadClick: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  user,
  onSearch,
  onOpenMessages,
  onLogoClick,
  unreadMsgCount,
  unreadNotifCount,
  onToggleNotifications,
  onUploadClick
}) => {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
      setIsSearchOpen(false);
    }
  };

  return (
    <>
    <div className="sticky top-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center justify-between transition-all duration-300">
      
      {isSearchOpen ? (
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-right-2">
          <Search className="w-4 h-4 text-brand" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => !query && setIsSearchOpen(false)}
            placeholder="Search VidFree..."
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none font-bold"
          />
          <button type="button" onClick={() => setIsSearchOpen(false)} className="text-[10px] font-black uppercase text-zinc-500">Cancel</button>
        </form>
      ) : (
        <>
          <button onClick={onLogoClick} className="flex items-center gap-1">
            <span className="text-lg font-logo font-medium text-white">VidFree</span>
            <span className="text-lg font-logo font-medium text-brand">.TV</span>
          </button>

          <div className="flex items-center gap-3">
            {user && (
                <button onClick={onUploadClick} className="text-zinc-400 hover:text-white transition-colors">
                    <Video className="w-5 h-5" />
                </button>
            )}
            <button onClick={() => setIsSearchOpen(true)} className="text-zinc-400 hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </button>
            
            {user && (
              <>
                <button onClick={onToggleNotifications} className="relative text-zinc-400 hover:text-white transition-colors">
                  <Bell className="w-5 h-5" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-brand rounded-full border border-black"></span>
                  )}
                </button>
                <button onClick={onOpenMessages} className="relative text-zinc-400 hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                  {unreadMsgCount > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-brand rounded-full border border-black"></span>
                  )}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
    </>
  );
};

export default MobileHeader;
