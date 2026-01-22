
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User, ChatMessage, ChatLeaderboardEntry, Profile, ChatParticipant } from '../types';
import { 
  Send, MoreVertical, Shield, Crown, 
  Users, Trophy, MessageSquare, Ban, Clock, X, Flag, User as UserIcon, Trash2,
  Eye, Calendar, CheckCircle2, MicOff, DoorOpen, UserMinus
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import Tooltip from './Tooltip';

interface LiveChatProps {
  videoId: string;
  user: User | null;
  isOwner: boolean;
  premiereStatus: 'scheduled' | 'live' | 'ended';
  onProfileClick: (userId: string) => void;
  videoOwnerId: string;
  videoOwnerName: string;
  variant?: 'standard' | 'overlay'; // Added variant prop
}

const EMOJIS = ['🔥', '😂', '👏', '❤️', '😱', '🎉', '💯', '👋'];
const TIMEOUT_DURATIONS = [
    { label: '5m', value: 5 },
    { label: '30m', value: 30 },
    { label: '1h', value: 60 },
    { label: '24h', value: 1440 },
];

const LiveChat: React.FC<LiveChatProps> = ({ 
  videoId, user, isOwner, premiereStatus, onProfileClick, videoOwnerId, videoOwnerName,
  variant = 'standard' 
}) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'CHAT' | 'USERS' | 'RANKS'>('CHAT');
  const [usersFilter, setUsersFilter] = useState<'ALL' | 'MODS'>('ALL');
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [lastSent, setLastSent] = useState(0);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [leaderboard, setLeaderboard] = useState<ChatLeaderboardEntry[]>([]);
  const [isMod, setIsMod] = useState(false);
  
  // Participants State
  const [onlineParticipants, setOnlineParticipants] = useState<ChatParticipant[]>([]);
  const [participantsCount, setParticipantsCount] = useState(0);
  
  // Mini Profile State
  const [miniProfile, setMiniProfile] = useState<Profile | null>(null);
  const [miniProfileIsSilenced, setMiniProfileIsSilenced] = useState(false);
  const [miniProfileIsBanned, setMiniProfileIsBanned] = useState(false);
  const [miniProfileIsMod, setMiniProfileIsMod] = useState(false);
  
  // Moderation State (For Current User)
  const [silenceStatus, setSilenceStatus] = useState<{ isSilenced: boolean; expiresAt: Date | null; by: string | null }>({ 
    isSilenced: false, expiresAt: null, by: null 
  });
  const [isBanned, setIsBanned] = useState(false);
  const [isKicked, setIsKicked] = useState(false);
  const [showSilencePopup, setShowSilencePopup] = useState(false);
  
  // User Profile Ref (for stable access in effect)
  const userProfileRef = useRef<{ username: string, avatar_url: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isOverlay = variant === 'overlay';

  // --- 1. INITIAL DATA FETCH & PROFILE SETUP ---
  useEffect(() => {
    if (!videoId) return;

    // Load History
    const loadHistory = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, profile:profiles(username, avatar_url)')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) {
        setMessages(data.reverse().map((m: any) => ({
          ...m,
          profile: Array.isArray(m.profile) ? m.profile[0] : m.profile
        })));
      }
    };
    loadHistory();

    // Load Leaderboard
    const loadLeaderboard = async () => {
        const { data } = await supabase.from('chat_leaderboard_view').select('*').eq('video_id', videoId).limit(50);
        if(data) setLeaderboard(data);
    };
    loadLeaderboard();

    // Check Wallet
    if (user) {
        // Fetch Profile for Presence
        supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
            .then(({ data }) => { if (data) userProfileRef.current = data; });
            
        // Check Mod Status
        if (!isOwner) {
             supabase.from('channel_moderators').select('id').eq('creator_id', videoOwnerId).eq('moderator_id', user.id).maybeSingle()
             .then(({ data }) => { if (data) setIsMod(true); });
        } else {
            setIsMod(true);
        }
    }
  }, [videoId, user?.id]);

  // --- 2. REALTIME CONNECTION (SINGLE EFFECT) ---
  useEffect(() => {
    if (!videoId) return;

    // Unique channel per video
    const channel = supabase.channel(`room_${videoId}`, {
        config: {
            presence: { key: user?.id || 'anon' }
        }
    });

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `video_id=eq.${videoId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessage;
            
            // Fetch profile for chat display
            const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', newMsg.user_id).single();
            
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              const msgWithProfile = { ...newMsg, profile };
              return [...prev, msgWithProfile].slice(-100);
            });
          }
          else if (payload.eventType === 'DELETE') {
             setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: ChatParticipant[] = [];
        
        for (const key in state) {
            const presences = state[key] as any[];
            presences.forEach(p => {
                if (p.user_id && p.user_id !== 'anon') {
                    users.push({
                        user_id: p.user_id,
                        video_id: videoId,
                        username: p.username || 'User',
                        avatar_url: p.avatar_url,
                        is_mod: p.is_mod || false,
                        is_author: p.is_author || false,
                        online_at: p.online_at
                    });
                }
            });
        }

        // Dedupe
        const unique = Array.from(new Map(users.map(item => [item.user_id, item])).values());
        setParticipantsCount(unique.length);
        
        // Sort: Author > Mod > Time
        unique.sort((a, b) => {
            if (a.is_author) return -1;
            if (b.is_author) return 1;
            if (a.is_mod && !b.is_mod) return -1;
            if (!a.is_mod && b.is_mod) return 1;
            return 0;
        });
        
        setOnlineParticipants(unique);
      })
      .subscribe(async (status) => {
         if (status === 'SUBSCRIBED' && user) {
             // Wait for profile ref to be populated if needed, or fetch it
             let profile = userProfileRef.current;
             if (!profile) {
                 const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
                 if (data) {
                     profile = data;
                     userProfileRef.current = data;
                 }
             }
             
             if (profile) {
                 await channel.track({
                     user_id: user.id,
                     username: profile.username,
                     avatar_url: profile.avatar_url,
                     is_mod: isMod, // Use current state
                     is_author: isOwner,
                     online_at: new Date().toISOString()
                 });
             }
         }
      });

    return () => {
        supabase.removeChannel(channel);
    };
  }, [videoId, user?.id]);

  // --- 3. MODERATION MONITORING (Separate Channel) ---
  useEffect(() => {
    if (!user || !videoId) return;

    // Check Initial
    const checkStatus = async () => {
        const { data } = await supabase
            .from('chat_participants')
            .select('silenced_until, silenced_by, is_banned, kicked_at')
            .eq('video_id', videoId)
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (data) {
            setIsBanned(!!data.is_banned);
            if (data.silenced_until && new Date(data.silenced_until) > new Date()) {
                const expires = new Date(data.silenced_until);
                setSilenceStatus({ isSilenced: true, expiresAt: expires, by: data.silenced_by });
                setShowSilencePopup(true);
            }
        }
    };
    checkStatus();

    const modChannel = supabase.channel(`mod_${user.id}_${videoId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'chat_participants', filter: `video_id=eq.${videoId}&user_id=eq.${user.id}` },
            (payload) => {
                const newRow = payload.new;
                
                // Kick
                if (newRow.kicked_at) {
                    const kickTime = new Date(newRow.kicked_at).getTime();
                    if (Date.now() - kickTime < 10000) setIsKicked(true);
                }

                // Ban
                setIsBanned(!!newRow.is_banned);

                // Silence
                if (newRow.silenced_until) {
                    const expires = new Date(newRow.silenced_until);
                    if (expires > new Date()) {
                        setSilenceStatus({ isSilenced: true, expiresAt: expires, by: newRow.silenced_by });
                        setShowSilencePopup(true);
                        setInputText('');
                    } else {
                        setSilenceStatus({ isSilenced: false, expiresAt: null, by: null });
                        setShowSilencePopup(false);
                    }
                } else {
                    setSilenceStatus({ isSilenced: false, expiresAt: null, by: null });
                    setShowSilencePopup(false);
                }
            }
        )
        .subscribe();

    return () => { supabase.removeChannel(modChannel); };
  }, [videoId, user]);

  // Auto-scroll
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAutoScroll]);

  // --- ACTIONS ---

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (silenceStatus.isSilenced || isBanned || isKicked) return; 

    const content = inputText.trim();
    if (!content || !user) return;

    if ((premiereStatus as string) === 'ended') {
      addToast({ type: 'warning', title: 'Chat Closed', message: 'The premiere has ended.' });
      return;
    }
    if (Date.now() - lastSent < 2000) return; 

    setLastSent(Date.now());
    setInputText('');

    try {
      const { error } = await supabase.rpc('send_chat_message', {
        p_video_id: videoId,
        p_content: content
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Send failed:", err);
      if (err.message?.includes('silenced')) {
          setSilenceStatus({ isSilenced: true, expiresAt: new Date(Date.now() + 300000), by: 'Moderator' });
          setShowSilencePopup(true);
      }
      if (err.message?.includes('banned')) {
          setIsBanned(true);
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!isMod) return;
    try {
      const { error } = await supabase.rpc('delete_chat_message', { p_message_id: messageId });
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) { 
        console.error("Delete failed", err); 
        addToast({ type: 'error', message: 'Failed to delete message.' });
    }
  };

  const handleUserClick = async (targetUserId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
    if (data) {
        setMiniProfile(data);
        const { data: pData } = await supabase
            .from('chat_participants')
            .select('silenced_until, is_banned, is_mod') 
            .eq('video_id', videoId)
            .eq('user_id', targetUserId)
            .maybeSingle();
        
        let persistentMod = false;
        if (!pData?.is_mod) {
             const { data: pm } = await supabase.from('channel_moderators').select('id').eq('creator_id', videoOwnerId).eq('moderator_id', targetUserId).maybeSingle();
             persistentMod = !!pm;
        }

        if (pData) {
            setMiniProfileIsBanned(pData.is_banned || false);
            setMiniProfileIsMod(pData.is_mod || persistentMod || false);
            if (pData.silenced_until && new Date(pData.silenced_until) > new Date()) {
                setMiniProfileIsSilenced(true);
            } else {
                setMiniProfileIsSilenced(false);
            }
        } else {
            setMiniProfileIsBanned(false);
            setMiniProfileIsSilenced(false);
            setMiniProfileIsMod(persistentMod);
        }
    }
  };

  const handleModAction = async (action: string, targetId: string, duration: number = 5) => {
    if (!user) return;
    
    if (action === 'ban') setMiniProfile(null);
    if (action === 'kick') setMiniProfile(null);
    if (action === 'timeout') setMiniProfileIsSilenced(true);
    if (action === 'untimeout') setMiniProfileIsSilenced(false);
    if (action === 'mod') setMiniProfileIsMod(true);
    if (action === 'unmod') setMiniProfileIsMod(false);
    if (action === 'unban') setMiniProfileIsBanned(false);

    try {
        const { error } = await supabase.rpc('moderate_user', {
            p_video_id: videoId,
            p_target_user_id: targetId,
            p_action: action,
            p_duration_minutes: duration
        });
        if (error) throw error;
        addToast({ type: 'success', message: `${action.toUpperCase()} applied.` });
    } catch (err: any) {
        addToast({ type: 'error', title: 'Action Failed', message: err.message });
    }
  };

  const handleReport = async (targetId: string) => {
      addToast({ type: 'info', title: 'Reported', message: 'User reported.' });
      setMiniProfile(null);
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop === clientHeight;
    setIsAutoScroll(isAtBottom);
  };

  const getTimeRemaining = () => {
      if (!silenceStatus.expiresAt) return '';
      const diff = silenceStatus.expiresAt.getTime() - Date.now();
      if (diff <= 0) return 'Expired';
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return `${m}m ${s}s`;
  };

  const filteredParticipants = usersFilter === 'MODS' 
    ? onlineParticipants.filter(p => p.is_mod || p.is_author)
    : onlineParticipants;

  return (
    <>
    <div className={`flex flex-col h-full relative overflow-hidden ${isOverlay ? 'bg-transparent' : 'bg-[#0a0a0a] border border-white/10 shadow-2xl'}`}>
      
      {/* HEADER TABS - Hidden in Overlay Mode to save space */}
      {!isOverlay && (
        <>
          {(premiereStatus as string) === 'scheduled' && (
            <div className="bg-brand/10 border-b border-brand/20 p-2 text-center animate-pulse">
                <p className="text-[9px] font-black text-brand uppercase tracking-widest">Premiere Chat Active</p>
            </div>
          )}
          {(premiereStatus as string) === 'ended' && (
            <div className="bg-zinc-900 border-b border-white/5 p-2 text-center">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Live Chat Closed</p>
            </div>
          )}
          <div className="flex border-b border-white/5 bg-[#050505]">
            <button onClick={() => setActiveTab('CHAT')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'CHAT' ? 'text-brand bg-white/5 border-b-2 border-brand' : 'text-zinc-500 hover:text-white'}`}>
              <MessageSquare className="w-3 h-3" /> Chat
            </button>
            <button onClick={() => setActiveTab('USERS')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'USERS' ? 'text-brand bg-white/5 border-b-2 border-brand' : 'text-zinc-500 hover:text-white'}`}>
              <Users className="w-3 h-3" /> {participantsCount}
            </button>
            <button onClick={() => setActiveTab('RANKS')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'RANKS' ? 'text-brand bg-white/5 border-b-2 border-brand' : 'text-zinc-500 hover:text-white'}`}>
              <Trophy className="w-3 h-3" /> Top
            </button>
          </div>
        </>
      )}

      {/* CONTENT AREA */}
      <div className={`flex-1 overflow-y-auto relative custom-scrollbar ${isOverlay ? 'mask-gradient-top' : ''}`} ref={scrollRef} onScroll={handleScroll}>
        
        {/* CHAT TAB */}
        {(activeTab === 'CHAT' || isOverlay) && (
            <div className={`p-4 space-y-2 min-h-full flex flex-col justify-end`}>
                {messages.length === 0 && (premiereStatus as string) === 'scheduled' && !isOverlay && (
                    <div className="text-center py-10 text-zinc-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Waiting for messages...</p>
                    </div>
                )}
                
                {messages.map((msg, i) => (
                    <div key={msg.id || i} className={`group flex items-start gap-3 p-1.5 rounded transition-colors relative ${isOverlay ? 'hover:bg-black/20' : 'hover:bg-white/5'}`}>
                        <img src={msg.profile?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${msg.user_id}`} className="w-6 h-6 rounded-full bg-zinc-800 shrink-0 border border-white/10" />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                                <button 
                                    onClick={() => handleUserClick(msg.user_id)}
                                    className={`text-[10px] font-black cursor-pointer uppercase truncate ${isOverlay ? 'text-zinc-200 drop-shadow-md' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    {msg.profile?.username || 'User'}
                                </button>
                                {msg.user_id === user?.id && <span className="text-[8px] bg-brand/20 text-brand px-1 rounded uppercase font-bold">You</span>}
                                {isOwner && msg.user_id === user?.id && <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />}
                            </div>
                            
                            <p className={`text-xs leading-relaxed break-words ${isOverlay ? 'text-white font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-white'}`}>{msg.content}</p>
                        </div>
                        
                        {!isOverlay && (
                          <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-1 flex items-center gap-1 bg-[#0a0a0a]/90 rounded px-1 transition-opacity">
                              {isMod && (
                                  <Tooltip content="Delete Message">
                                    <button 
                                        onClick={() => handleDeleteMessage(msg.id)} 
                                        className="p-1 text-zinc-500 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                  </Tooltip>
                              )}
                              <button 
                                  className="p-1 text-zinc-500 hover:text-white transition-colors"
                                  onClick={() => handleUserClick(msg.user_id)}
                              >
                                  <MoreVertical className="w-3 h-3" />
                              </button>
                          </div>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* USERS TAB (Standard Mode Only) */}
        {activeTab === 'USERS' && !isOverlay && (
            <div className="flex flex-col min-h-full">
                {/* SUB TABS */}
                <div className="flex px-4 py-2 gap-2 border-b border-white/5 sticky top-0 bg-[#0a0a0a] z-10">
                    <button 
                        onClick={() => setUsersFilter('ALL')}
                        className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${usersFilter === 'ALL' ? 'bg-white text-black' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setUsersFilter('MODS')}
                        className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all flex items-center gap-1 ${usersFilter === 'MODS' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
                    >
                        <Shield className="w-3 h-3" /> Mods
                    </button>
                </div>

                <div className="p-2 space-y-1">
                    {filteredParticipants.map(participant => (
                        <div 
                            key={participant.user_id} 
                            onClick={() => handleUserClick(participant.user_id)}
                            className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer group"
                        >
                            <div className="relative">
                                <img src={participant.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${participant.user_id}`} className="w-8 h-8 rounded-full bg-zinc-800" />
                                {participant.is_author && (
                                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black rounded-full p-0.5 border border-black">
                                        <Crown className="w-2.5 h-2.5 fill-current" />
                                    </div>
                                )}
                                {participant.is_mod && !participant.is_author && (
                                    <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border border-black">
                                        <Shield className="w-2.5 h-2.5 fill-current" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className={`text-[11px] font-bold truncate ${participant.is_author ? 'text-amber-400' : participant.is_mod ? 'text-blue-400' : 'text-white'}`}>
                                        {participant.username}
                                    </p>
                                    {participant.user_id === user?.id && <span className="text-[8px] bg-white/10 text-zinc-400 px-1 rounded">YOU</span>}
                                </div>
                                <p className="text-[9px] text-zinc-600">
                                    {participant.is_author ? 'Broadcaster' : participant.is_mod ? 'Moderator' : 'Viewer'}
                                </p>
                            </div>
                            <MoreVertical className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))}
                    
                    {filteredParticipants.length === 0 && (
                        <div className="py-10 text-center text-zinc-600">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-[10px] font-black uppercase">No {usersFilter === 'MODS' ? 'moderators' : 'users'} active</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* LEADERBOARD TAB (Standard Mode Only) */}
        {activeTab === 'RANKS' && !isOverlay && (
            <div className="p-0">
                {leaderboard.map((entry, idx) => (
                    <div key={entry.user_id} className="flex items-center gap-4 p-3 border-b border-white/5 hover:bg-white/5">
                        <span className={`font-black text-sm w-6 text-center ${idx < 3 ? 'text-brand' : 'text-zinc-600'}`}>{idx + 1}</span>
                        <img src={entry.avatar_url || ''} className="w-8 h-8 rounded-full bg-zinc-800" />
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-white uppercase">{entry.username}</p>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase">{entry.points} Points</p>
                        </div>
                        {idx === 0 && <Crown className="w-4 h-4 text-amber-400" />}
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* MINI PROFILE MODAL */}
      {miniProfile && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setMiniProfile(null)}>
            <div className="bg-[#111] border border-white/10 p-6 w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setMiniProfile(null)} className="absolute top-2 right-2 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full border-2 border-brand overflow-hidden bg-zinc-800 shadow-[0_0_20px_rgba(255,0,127,0.3)]">
                        <img src={miniProfile.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${miniProfile.id}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center space-y-1">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{miniProfile.username}</h3>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Joined {new Date(miniProfile.updated_at || Date.now()).toLocaleDateString()}
                        </p>
                        {miniProfileIsBanned && (
                            <span className="inline-block bg-rose-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded mt-2">Banned</span>
                        )}
                        {miniProfileIsMod && !miniProfileIsBanned && (
                            <span className="inline-block bg-blue-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded mt-2">Moderator</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-4 border-y border-white/10 py-4 w-full justify-center bg-white/5 mb-6">
                    <div className="text-center px-4">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Eye className="w-3 h-3" /> Views</p>
                        <p className="text-sm font-bold text-white">{(miniProfile.views_count || 0).toLocaleString()}</p>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="text-center px-4">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Subs</p>
                        <p className="text-sm font-bold text-white">{(miniProfile.subscribers_count || 0).toLocaleString()}</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <button onClick={() => { onProfileClick(miniProfile.id); setMiniProfile(null); }} className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-white py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                        <UserIcon className="w-3 h-3" /> View Full Channel
                    </button>
                    <button onClick={() => handleReport(miniProfile.id)} className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                        <Flag className="w-3 h-3" /> Report User
                    </button>
                    
                    {/* MODERATION TOOLS */}
                    {isMod && miniProfile.id !== user?.id && (
                        <div className="space-y-2 pt-2 border-t border-white/10">
                            {/* KICK & BAN */}
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleModAction('kick', miniProfile.id)} className="flex flex-col items-center justify-center gap-1 p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 transition-all group">
                                    <DoorOpen className="w-4 h-4" /> <span className="text-[8px] font-black uppercase">Kick</span>
                                </button>
                                
                                {isOwner && (
                                    miniProfileIsBanned ? (
                                        <button onClick={() => handleModAction('unban', miniProfile.id)} className="flex flex-col items-center justify-center gap-1 p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 transition-all group">
                                            <CheckCircle2 className="w-4 h-4" /> <span className="text-[8px] font-black uppercase">Unban</span>
                                        </button>
                                    ) : (
                                        <button onClick={() => handleModAction('ban', miniProfile.id)} className="flex flex-col items-center justify-center gap-1 p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all group">
                                            <Ban className="w-4 h-4" /> <span className="text-[8px] font-black uppercase">Ban</span>
                                        </button>
                                    )
                                )}
                            </div>

                            {/* TIMEOUT SELECTOR */}
                            {miniProfileIsSilenced ? (
                                <button onClick={() => handleModAction('untimeout', miniProfile.id)} className="w-full py-2 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase border border-emerald-500/20 hover:bg-emerald-500/20">
                                    Remove Silence
                                </button>
                            ) : (
                                <div className="grid grid-cols-4 gap-1">
                                    {TIMEOUT_DURATIONS.map(dur => (
                                        <button key={dur.value} onClick={() => handleModAction('timeout', miniProfile.id, dur.value)} className="py-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[9px] font-black uppercase border border-white/5">
                                            {dur.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* OWNER ONLY: PROMOTE/DEMOTE */}
                            {isOwner && (
                                <button 
                                    onClick={() => handleModAction(miniProfileIsMod ? 'unmod' : 'mod', miniProfile.id)}
                                    className={`w-full py-2 text-[10px] font-black uppercase border transition-all flex items-center justify-center gap-2 ${miniProfileIsMod ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20'}`}
                                >
                                    {miniProfileIsMod ? <UserMinus className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                    {miniProfileIsMod ? 'Remove Mod' : 'Make Mod'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* SILENCE POPUP */}
      {showSilencePopup && silenceStatus.isSilenced && !isBanned && !isKicked && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-in fade-in zoom-in duration-300">
            <div className="w-full max-w-sm bg-[#111] border border-red-500/30 shadow-[0_0_50px_rgba(220,38,38,0.2)] p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                    <MicOff className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">You have been silenced</h3>
                    <p className="text-zinc-400 text-xs font-bold">
                        by: <span className="text-white uppercase">{silenceStatus.by || 'Channel Moderator'}</span>
                    </p>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 p-3">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                        Expires in: {getTimeRemaining()}
                    </p>
                </div>
                <button 
                    onClick={() => setShowSilencePopup(false)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all"
                >
                    Acknowledge
                </button>
            </div>
        </div>
      )}

      {/* INPUT AREA */}
      <div className={`p-3 border-t border-white/10 ${isOverlay ? 'bg-[#0a0a0a]/80 backdrop-blur-md' : 'bg-[#0a0a0a]'}`}>
         {isKicked ? (
             <div className="p-6 bg-amber-500/5 border border-amber-500/20 text-center flex flex-col items-center justify-center gap-3">
                 <DoorOpen className="w-8 h-8 text-amber-500" />
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">You have been kicked</p>
                    <p className="text-[9px] text-amber-500/70 font-bold uppercase">Please refresh to rejoin chat</p>
                 </div>
                 <button onClick={() => window.location.reload()} className="px-4 py-2 bg-amber-500 text-black text-[9px] font-black uppercase hover:bg-amber-400">Reconnect</button>
             </div>
         ) : isBanned ? (
             <div className="p-4 bg-rose-500/5 border border-rose-500/20 text-center flex items-center justify-center gap-2">
                 <Ban className="w-4 h-4 text-rose-500" />
                 <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">You are banned from this chat</p>
             </div>
         ) : (premiereStatus as string) === 'ended' ? (
             <div className="text-center py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Chat Closed</div>
         ) : !user ? (
             <div className="text-center py-2 text-[10px] font-black text-brand uppercase tracking-widest">Sign in to chat</div>
         ) : (
             <div className="flex gap-2">
                 <div className="relative flex-1">
                     <input 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={silenceStatus.isSilenced ? "You have been silenced." : "Say something..."}
                        disabled={(premiereStatus as string) === 'ended' || silenceStatus.isSilenced}
                        maxLength={300}
                        className={`w-full border py-2 pl-3 pr-8 text-xs focus:outline-none placeholder-zinc-600 transition-all rounded-full ${
                            silenceStatus.isSilenced 
                            ? 'bg-[#1a1a1a] border-white/5 text-zinc-500 cursor-not-allowed' 
                            : 'bg-[#111] border-white/10 text-white focus:border-brand'
                        }`}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(e)}
                     />
                     <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                         <span className="text-[9px] text-zinc-600 font-bold">{inputText.length}/300</span>
                     </div>
                 </div>
                 <button 
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || (premiereStatus as string) === 'ended' || silenceStatus.isSilenced}
                    className="p-2 bg-brand text-white transition-colors disabled:opacity-50 rounded-full"
                 >
                     <Send className="w-4 h-4" />
                 </button>
             </div>
         )}
         
         {/* EMOJI BAR */}
         {(premiereStatus as string) !== 'ended' && user && !silenceStatus.isSilenced && !isBanned && !isKicked && !isOverlay && (
             <div className="flex gap-1 mt-2 overflow-x-auto scrollbar-hide pb-1">
                 {EMOJIS.map(e => (
                     <button 
                        key={e} 
                        onClick={() => { if((premiereStatus as string) !== 'ended') setInputText(p => p + e) }}
                        className="text-lg hover:scale-125 transition-transform px-1"
                     >
                         {e}
                     </button>
                 ))}
             </div>
         )}
      </div>
    </div>
    </>
  );
};

export default LiveChat;
