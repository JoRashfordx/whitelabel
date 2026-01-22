
import React, { useState, useEffect, useRef } from 'react';
import { User, AuthMode, Profile, ViewState, Notification } from '../types';
import { supabase } from '../services/supabase';
import { LogOut, Menu, Search, Sun, Moon, PlusSquare, ChevronDown, User as UserIcon, Settings, Palette, LayoutDashboard, Mail, CheckCircle2, UserPlus, Layers, Wand2, Bell, Shield, Box } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useBranding } from '../contexts/BrandingContext';

interface NavbarProps {
  user: User | null;
  profile: Profile | null;
  onLogout: () => void;
  onAuthClick: (mode: AuthMode) => void;
  onToggleSidebar: () => void;
  onUploadClick: () => void;
  onSeriesUploadClick: () => void;
  onLogoClick: () => void;
  onThemeClick: () => void;
  onNavigate: (view: ViewState, params?: any) => void;
  onSearch: (query: string) => void;
  onOpenMessages: () => void;
  onProfileClick: (userId: string) => void;
  position?: 'sticky' | 'fixed';
  refreshTrigger?: number;
  currentTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenCreatorSuite: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  profile, 
  onLogout, 
  onAuthClick, 
  onToggleSidebar, 
  onUploadClick, 
  onSeriesUploadClick, 
  onLogoClick, 
  onThemeClick,
  onNavigate,
  onSearch,
  onOpenMessages,
  onProfileClick,
  position = 'sticky',
  refreshTrigger = 0,
  currentTheme,
  onToggleTheme,
  onOpenCreatorSuite
}) => {
  const { addToast } = useToast();
  const { config } = useBranding();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  
  // Search Suggestions State
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Robust Admin Check (Simplified for White Label)
  const isAdmin = user?.email?.includes('admin');

  // Fetch Message Unread Count
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { data } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .or('deleted_by_recipient.is.null,deleted_by_recipient.eq.false');
        
      if (data) {
        const uniqueThreads = new Set(data.map(m => m.conversation_id));
        setUnreadMsgCount(uniqueThreads.size);
      }
    };

    fetchUnread();

    const channel = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        (payload) => {
            if (payload.eventType === 'INSERT' && (payload.new as any).is_read === false) {
                addToast({ 
                    type: 'info', 
                    title: 'New Message', 
                    message: 'You received a new private message',
                    action: { label: 'View', onClick: onOpenMessages }
                });
            }
            fetchUnread();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, refreshTrigger]);

  // --- NOTIFICATION SYSTEM ---
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select(`*, actor_profile:profiles!actor_id(username, avatar_url)`)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (data) {
            const formatted = data.map((n: any) => ({
                ...n,
                actor_profile: Array.isArray(n.actor_profile) ? n.actor_profile[0] : n.actor_profile
            }));
            setNotifications(formatted);
            setUnreadNotifCount(formatted.filter((n: any) => !n.is_read).length);
        }
    };

    fetchNotifications();

    const channel = supabase.channel(`notifs_realtime_${user.id}`)
        .on(
            'postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
            async (payload) => {
                const { data: actor } = await supabase.from('profiles').select('username, avatar_url').eq('id', payload.new.actor_id).single();
                const newNotif: Notification = { ...payload.new as Notification, actor_profile: actor };
                setNotifications(prev => [newNotif, ...prev]);
                setUnreadNotifCount(prev => prev + 1);
                addToast({
                    type: 'info',
                    title: 'New Notification',
                    message: 'New activity on your channel.',
                    action: { label: 'View', onClick: () => handleNotificationClick(newNotif) }
                });
            }
        )
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleNotificationClick = async (n: Notification) => {
      setShowNotifs(false);
      if (!n.is_read) {
          await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
          setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
          setUnreadNotifCount(prev => Math.max(0, prev - 1));
      }
      if (n.target_type === 'video') {
          const { data: video } = await supabase.from('videos').select('*').eq('id', n.target_id).single();
          if (video) onNavigate('WATCH', { video, highlightCommentId: n.comment_id });
      } else if (n.target_type === 'community') {
          const { data: post } = await supabase.from('community_posts').select('user_id').eq('id', n.target_id).single();
          if (post) {
              onProfileClick(post.user_id);
              onNavigate('CHANNEL', { initialTab: 'COMMUNITY' });
          }
      }
  };

  const markAllRead = async () => {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotifCount(0);
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      const cleanTerm = searchTerm.trim().replace(/^@/, '');
      if (cleanTerm.length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      // Note: search_profiles_advanced RPC might need to be adjusted for dynamic schema or replaced with direct query
      try {
          const { data } = await supabase.from('profiles').select('*').ilike('username', `%${cleanTerm}%`).limit(5);
          if (data && data.length > 0) {
            setSuggestions(data);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
      } catch (err) {
          console.warn("Search unavailable");
      }
    };
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const getSafeUsername = () => {
    const raw = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'USER';
    return typeof raw === 'string' ? raw : 'USER';
  };

  const username = getSafeUsername();
  
  const getAvatarUrl = () => {
    const base = profile?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.id}`;
    if (profile?.avatar_url && profile?.updated_at) {
        return `${base}?v=${new Date(profile.updated_at).getTime()}`;
    }
    return base;
  };
  
  const avatarUrl = getAvatarUrl();

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        handleSuggestionClick(suggestions[selectedSuggestionIndex]);
      } else if (e.key === 'Enter') {
        onSearch(searchTerm);
        setShowSuggestions(false);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else {
      if (e.key === 'Enter') {
        onSearch(searchTerm);
        setShowSuggestions(false);
      }
    }
  };

  const handleSuggestionClick = (profile: Profile) => {
    onProfileClick(profile.id);
    setShowSuggestions(false);
    setSearchTerm('');
    setSuggestions([]);
  };

  const getProfileDisplayName = (p: Profile) => {
    if (p.display_preference === 'alias' && p.alias) return p.alias;
    if (p.display_preference === 'name' && (p.first_name || p.last_name)) return `${p.first_name || ''} ${p.last_name || ''}`.trim();
    return p.alias || p.full_name || p.username?.replace('@', '') || 'User';
  };

  return (
    <>
    <nav className={`${position} top-0 left-0 right-0 z-[60] bg-primary/80 backdrop-blur-xl border-b border-glass-border h-16 px-4 transition-all duration-300`}>
      <div className="max-w-[1920px] mx-auto h-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-[200px]">
          <button onClick={onToggleSidebar} className="p-2 hover:bg-white/5 transition-colors text-zinc-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={onLogoClick} className="text-xl tracking-tight hidden sm:block focus:outline-none hover:opacity-80 transition-opacity font-logo">
            {config.logoUrl ? (
                <img src={config.logoUrl} className="h-8 object-contain" alt={config.siteName} />
            ) : (
                <>
                    <span className="text-white text-main font-medium">{config.siteName.split('.')[0]}</span>
                    {config.siteName.includes('.') && <span className="text-brand font-medium">.{config.siteName.split('.')[1]}</span>}
                </>
            )}
          </button>
        </div>

        <div className="flex-1 max-w-2xl hidden md:block" ref={searchContainerRef}>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-brand transition-colors" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
                setSelectedSuggestionIndex(-1);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-input border border-glass-border py-2 pl-10 pr-4 text-sm font-light text-zinc-300 focus:outline-none focus:border-brand/50 transition-all rounded-none placeholder-zinc-600 font-opensans" 
            />
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-secondary border border-glass-border shadow-2xl overflow-hidden z-[70] flex flex-col font-opensans">
                {suggestions.map((s, index) => (
                  <button
                    key={s.id}
                    onClick={() => handleSuggestionClick(s)}
                    className={`flex items-center gap-3 p-3 w-full text-left transition-colors font-opensans ${
                      index === selectedSuggestionIndex ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/10">
                      <img 
                        src={s.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${s.id}`} 
                        alt={s.username || ''} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white text-main truncate flex items-center gap-1 font-opensans">
                        {getProfileDisplayName(s)} ({s.username})
                        <CheckCircle2 size={12} className="text-brand" />
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 min-w-[200px] justify-end">
          <button onClick={onToggleTheme} className="p-2 text-zinc-400 hover:text-white transition-colors" title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}>
            {currentTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <button onClick={onOpenMessages} className="p-2 relative group hover:bg-white/5 transition-colors">
                <Mail className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                {unreadMsgCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[8px] font-black text-white">
                    {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                  </span>
                )}
              </button>

              <div className="relative">
                  <button onClick={() => setShowNotifs(!showNotifs)} className="p-2 relative group hover:bg-white/5 transition-colors">
                    <Bell className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[8px] font-black text-white">
                        {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                      </span>
                    )}
                  </button>

                  {showNotifs && (
                      <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)}></div>
                      <div className="absolute top-full right-0 mt-2 w-80 bg-[#0a0a0a] border border-white/10 shadow-2xl z-50 flex flex-col font-opensans max-h-[400px] overflow-hidden rounded-sm animate-in fade-in slide-in-from-top-2">
                          <div className="flex justify-between items-center p-3 border-b border-white/10 bg-white/5">
                              <h4 className="text-xs font-black uppercase text-white tracking-widest">Notifications</h4>
                              {unreadNotifCount > 0 && (
                                  <button onClick={markAllRead} className="text-[9px] font-bold text-brand hover:underline uppercase">Mark all read</button>
                              )}
                          </div>
                          <div className="flex-1 overflow-y-auto">
                              {notifications.length === 0 ? (
                                  <div className="p-8 text-center text-zinc-500">
                                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-[10px] font-bold uppercase">No notifications</p>
                                  </div>
                              ) : (
                                  notifications.map(n => (
                                      <button 
                                        key={n.id} 
                                        onClick={() => handleNotificationClick(n)}
                                        className={`w-full text-left p-3 flex gap-3 hover:bg-white/5 border-b border-white/5 transition-colors ${!n.is_read ? 'bg-brand/5' : ''}`}
                                      >
                                          <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0 mt-1">
                                              <img src={n.actor_profile?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${n.actor_id}`} className="w-full h-full object-cover" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <p className="text-[11px] text-white leading-tight">
                                                  <span className="font-bold">{n.actor_profile?.username || 'User'}</span>
                                                  {n.type === 'comment_on_video' && ' commented on your video.'}
                                                  {n.type === 'reply_on_video' && ' replied to your comment.'}
                                                  {n.type === 'comment_on_community' && ' commented on your post.'}
                                                  {n.type === 'reply_on_community' && ' replied to your post comment.'}
                                              </p>
                                              <p className="text-[9px] text-zinc-500 mt-1 uppercase font-bold">
                                                  {new Date(n.created_at).toLocaleDateString()}
                                              </p>
                                          </div>
                                          {!n.is_read && <div className="w-2 h-2 bg-brand rounded-full mt-2 shrink-0"></div>}
                                      </button>
                                  ))
                              )}
                          </div>
                      </div>
                      </>
                  )}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={onSeriesUploadClick}
                  className="hidden md:flex bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-1.5 text-[10px] uppercase font-bold transition-all flex items-center gap-2"
                >
                  <Layers className="w-4 h-4" /> New Series
                </button>

                <button 
                  onClick={onUploadClick}
                  className="bg-brand hover:brightness-110 text-always-white px-4 py-1.5 text-[10px] uppercase font-bold transition-all shadow-[0_0_15px_rgba(255,0,127,0.3)] flex items-center gap-2"
                >
                  <PlusSquare className="w-4 h-4" /> Upload
                </button>
              </div>
              
              <div className="flex items-center gap-1 border-l border-glass-border pl-3 relative">
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  <div className={`w-8 h-8 bg-surface border border-glass-border overflow-hidden relative group-hover:border-brand transition-all`}>
                    <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                  </div>
                  <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </div>

                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[-1]" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="absolute top-full right-0 mt-2 w-64 bg-[#0a0a0a] border border-white/10 shadow-2xl z-[70] py-2 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-glass-border mb-1 bg-white/5">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1.5 font-opensans">Signed in as</p>
                        <p className="text-xs font-bold text-white text-main truncate uppercase pink-text-glow font-opensans flex items-center gap-1">
                            {username}
                        </p>
                      </div>
                      
                      <div className="h-px bg-glass-border my-1"></div>

                      <button 
                        onClick={() => { onNavigate('SETTINGS'); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[10px] font-black text-brand hover:text-white hover:bg-white/5 uppercase flex items-center gap-3 font-opensans bg-brand/5 border-l-2 border-brand"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5" /> Studio
                      </button>

                      <button 
                        onClick={() => { onNavigate('CHANNEL'); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/5 uppercase flex items-center gap-3 font-opensans"
                      >
                        <UserIcon className="w-3.5 h-3.5" /> My Channel
                      </button>
                      <button 
                        onClick={() => { onOpenCreatorSuite(); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 uppercase flex items-center gap-3 transition-colors font-opensans"
                      >
                        <Wand2 className="w-3.5 h-3.5" /> Creator Suite
                      </button>

                      <button 
                        onClick={() => { onThemeClick(); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 uppercase flex items-center gap-3 transition-colors font-opensans"
                      >
                        <Palette className="w-3.5 h-3.5" /> Custom Theme
                      </button>

                      {isAdmin && (
                          <button 
                            onClick={() => { onNavigate('ADMIN_PANEL'); setIsMenuOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-[10px] font-bold text-emerald-500 hover:text-white hover:bg-white/5 uppercase flex items-center gap-3 font-opensans"
                          >
                            <Box className="w-3.5 h-3.5" /> Admin Panel
                          </button>
                      )}
                      
                      <div className="h-px bg-glass-border my-1"></div>
                      <button 
                        onClick={() => { onLogout(); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 uppercase flex items-center gap-3 font-opensans"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button onClick={() => onAuthClick('login')} className="text-xs text-zinc-400 hover:text-white transition-colors uppercase font-bold">Sign In</button>
              <button onClick={() => onAuthClick('register')} className="bg-brand hover:brightness-110 text-always-white px-5 py-2 text-xs uppercase transition-all font-bold shadow-[0_0_15px_rgba(255,0,127,0.3)]">Register</button>
            </div>
          )}
        </div>
      </div>
    </nav>
    </>
  );
};

export default Navbar;
