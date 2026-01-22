
import React, { useState, useEffect, useMemo } from 'react';
import { User, Profile, Video, Series, VideoRating } from '../types';
import { supabase } from '../services/supabase';
import { 
  User as UserIcon, Settings, Lock, Shield, 
  Save, Loader2, LayoutDashboard, Key, BarChart3, Film, 
  TrendingUp, Users, Eye, Clock, ThumbsUp, ThumbsDown, MessageSquare, 
  Trash2, Edit, Layers, Globe, EyeOff, Flag, Mail, MapPin, Calendar, CheckCircle2,
  Twitter, Instagram, Youtube, Link as LinkIcon, Search, Ban, X, MoreVertical, LogOut,
  AlertTriangle, Play, Wand2, UserMinus, MessageCircleOff, Facebook, Twitch, Ghost
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import EditVideoModal from './EditVideoModal';
import SeriesWizard from './SeriesWizard';

interface SettingsViewProps {
  user: User;
  profile: Profile | null;
  onRefreshProfile: () => void;
  refreshTrigger: number;
  initialTab?: string;
  onProfileClick: (userId: string) => void;
  onOpenMessages: (recipientId?: string) => void;
}

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Brazil', 'India', 'Other'];

const SettingsView: React.FC<SettingsViewProps> = ({ 
  user, profile, onRefreshProfile, refreshTrigger, initialTab, onProfileClick, onOpenMessages
}) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState(initialTab || 'DASHBOARD');
  
  // Dashboard Stats
  const [totalViews, setTotalViews] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [totalSubs, setTotalSubs] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);

  // Content Management State
  const [contentTab, setContentTab] = useState<'VIDEOS' | 'SERIES'>('VIDEOS');
  const [myVideos, setMyVideos] = useState<Video[]>([]);
  const [mySeries, setMySeries] = useState<Series[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);

  // Subscribers Management State
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [filteredSubs, setFilteredSubs] = useState<any[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  const [subSearch, setSubSearch] = useState('');
  const [subSort, setSubSort] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [selectedSubscriber, setSelectedSubscriber] = useState<any | null>(null); // For Mini Profile

  // Identity Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [alias, setAlias] = useState('');
  const [displayPreference, setDisplayPreference] = useState<'alias' | 'name'>('alias');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('United States');
  
  // Socials Form State
  const [socials, setSocials] = useState({
    website: '',
    twitter: '',
    instagram: '',
    youtube: '',
    facebook: '',
    snapchat: '',
    twitch: ''
  });

  // Security Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);

  // Populate form data from profile
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setAlias(profile.alias || '');
      setDisplayPreference(profile.display_preference || 'alias');
      setHandle(profile.username?.replace('@', '') || '');
      setBio(profile.bio || '');
      setCountry(profile.country || 'United States');
      setSocials({
        website: profile.social_links?.website || '',
        twitter: profile.social_links?.twitter || '',
        instagram: profile.social_links?.instagram || '',
        youtube: profile.social_links?.youtube || '',
        facebook: profile.social_links?.facebook || '',
        snapchat: profile.social_links?.snapchat || '',
        twitch: profile.social_links?.twitch || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
      fetchDashboardData();
      if (activeTab === 'CONTENT') fetchContent();
      if (activeTab === 'SUBSCRIBERS') fetchSubscribers();
  }, [user.id, activeTab, refreshTrigger]);

  const fetchDashboardData = async () => {
      if (profile) {
          setTotalSubs(profile.subscribers_count || 0);
          setTotalViews(profile.views_count || 0);
      }
      const { data } = await supabase.from('videos').select('likes_count').eq('user_id', user.id);
      if (data) {
          setTotalVideos(data.length);
          setTotalLikes(data.reduce((acc, curr) => acc + (curr.likes_count || 0), 0));
      }
  };

  const fetchContent = async () => {
      setIsLoadingContent(true);
      // Filter out series episodes from standard video list
      const { data: vData } = await supabase.from('videos')
        .select('*')
        .eq('user_id', user.id)
        .neq('category', 'Series') 
        .order('created_at', { ascending: false });
      if (vData) setMyVideos(vData);
      
      // Use series_with_counts so we don't see "0 episodes" after updates
      const { data: sData } = await supabase
        .from('series_with_counts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (sData) setMySeries(sData);
      
      setIsLoadingContent(false);
  };

  const fetchSubscribers = async () => {
      setIsLoadingSubs(true);
      try {
          const { data: subsData } = await supabase.from('subscriptions').select('created_at, subscriber_id, profile:profiles!subscriber_id(*)').eq('creator_id', user.id);
          const { data: blockedData } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id);
          const blockedIds = new Set(blockedData?.map(b => b.blocked_id));
          const formatted = subsData?.map((sub: any) => ({
              ...sub.profile,
              subscribed_at: sub.created_at,
              is_banned: blockedIds.has(sub.subscriber_id),
              subscription_status: 'Active'
          })) || [];
          setSubscribers(formatted);
          filterSubscribers(formatted, subSearch, subSort);
      } catch (err) { console.error(err); } finally { setIsLoadingSubs(false); }
  };

  const filterSubscribers = (list: any[], search: string, sort: string) => {
      let filtered = [...list];
      if (search.trim()) {
          const q = search.toLowerCase();
          filtered = filtered.filter(s => s.username?.toLowerCase().includes(q));
      }
      filtered.sort((a, b) => {
          const dateA = new Date(a.subscribed_at).getTime();
          const dateB = new Date(b.subscribed_at).getTime();
          return sort === 'NEWEST' ? dateB - dateA : dateA - dateB;
      });
      setFilteredSubs(filtered);
  };

  useEffect(() => { filterSubscribers(subscribers, subSearch, subSort); }, [subSearch, subSort, subscribers]);

  const handleSaveChannel = async () => {
    setIsSaving(true);
    try {
      const finalHandle = `@${handle.replace('@', '').toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
      
      // Check handle uniqueness if changed
      if (finalHandle !== profile?.username) {
          const { data } = await supabase.from('profiles').select('id').eq('username', finalHandle).maybeSingle();
          if (data) throw new Error('Handle already taken');
      }

      const updates = { 
          first_name: firstName, 
          last_name: lastName, 
          username: finalHandle,
          alias: alias,
          display_preference: displayPreference,
          bio, 
          country,
          social_links: socials, 
          updated_at: new Date().toISOString() 
      };
      
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      
      addToast({ type: 'success', message: 'Channel settings updated' });
      onRefreshProfile();
    } catch (err: any) { addToast({ type: 'error', message: err.message }); } finally { setIsSaving(false); }
  };

  const handleUpdatePassword = async () => {
      if (newPassword !== confirmNewPassword) {
          addToast({ type: 'error', message: 'Passwords do not match' });
          return;
      }
      if (newPassword.length < 6) {
          addToast({ type: 'error', message: 'Password must be at least 6 characters' });
          return;
      }
      
      setIsUpdatingSecurity(true);
      try {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) throw error;
          addToast({ type: 'success', message: 'Password updated successfully' });
          setNewPassword('');
          setConfirmNewPassword('');
      } catch (err: any) {
          addToast({ type: 'error', message: err.message });
      } finally {
          setIsUpdatingSecurity(false);
      }
  };

  const handleDeleteAccount = async () => {
      if (await confirm({ 
          title: 'DELETE ACCOUNT?', 
          description: 'This is PERMANENT. All videos, comments, and data will be wiped immediately. There is no going back.', 
          confirmText: 'YES, DELETE EVERYTHING', 
          variant: 'danger' 
      })) {
          // In a real app, this might trigger a cloud function. 
          // For now, we sign out and let RLS/Cascades handle what they can, or call an RPC if one existed for wipe.
          // Since we can't delete auth user from client easily without RPC, we'll wipe profile data which cascades.
          try {
              await supabase.from('profiles').delete().eq('id', user.id);
              await supabase.auth.signOut();
              window.location.reload();
          } catch (err: any) {
              addToast({ type: 'error', message: 'Critical failure during deletion.' });
          }
      }
  };

  const handleDeleteVideo = async (id: string) => {
      if (await confirm({ title: 'Delete Video?', description: 'This cannot be undone.', confirmText: 'Delete', variant: 'danger' })) {
          await supabase.from('videos').delete().eq('id', id);
          setMyVideos(prev => prev.filter(v => v.id !== id));
          addToast({ type: 'success', message: 'Video deleted' });
      }
  };

  const handleDeleteSeries = async (id: string) => {
      if (await confirm({ title: 'Delete Series?', description: 'This will delete the series container. Episodes will remain as individual videos.', confirmText: 'Delete', variant: 'danger' })) {
          await supabase.from('series').delete().eq('id', id);
          setMySeries(prev => prev.filter(s => s.id !== id));
          addToast({ type: 'success', message: 'Series deleted' });
      }
  };

  const handleToggleBan = async (targetId: string, currentStatus: boolean) => {
      try {
          if (currentStatus) {
              // Unban (Allow messages)
              await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', targetId);
              addToast({ type: 'success', message: 'Messages allowed from user.' });
          } else {
              // Ban (Block messages)
              if (await confirm({ title: 'Block Messages?', description: 'This user will no longer be able to message you.', confirmText: 'Block', variant: 'danger' })) {
                  await supabase.from('blocked_users').insert([{ blocker_id: user.id, blocked_id: targetId }]);
                  addToast({ type: 'success', message: 'Messages blocked.' });
              } else {
                  return;
              }
          }
          // Update local state
          const updatedStatus = !currentStatus;
          setSelectedSubscriber((prev: any) => prev ? ({ ...prev, is_banned: updatedStatus }) : null);
          setSubscribers(prev => prev.map(s => s.id === targetId ? { ...s, is_banned: updatedStatus } : s));
          setFilteredSubs(prev => prev.map(s => s.id === targetId ? { ...s, is_banned: updatedStatus } : s));
      } catch (err) {
          addToast({ type: 'error', message: 'Action failed.' });
      }
  };

  // --- COMPUTED ---
  const ageData = useMemo(() => {
      if (!profile?.dob) return { age: 'Unknown', allowed: 'U' };
      const birth = new Date(profile.dob);
      const ageDifMs = Date.now() - birth.getTime();
      const ageDate = new Date(ageDifMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      
      let allowed = 'U';
      if (age >= 13) allowed = 'U, PG';
      if (age >= 18) allowed = 'U, PG, R';
      
      return { age, allowed };
  }, [profile?.dob]);

  const TABS = [
    { id: 'DASHBOARD', label: 'Overview', icon: LayoutDashboard },
    { id: 'CONTENT', label: 'Content', icon: Film },
    { id: 'CHANNEL', label: 'Channel', icon: UserIcon },
    { id: 'SUBSCRIBERS', label: 'Subscribers', icon: Users },
    { id: 'ACCOUNT', label: 'Security', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-black pt-20 px-4 md:px-8 pb-20 font-comfortaa text-white">
      {editingVideo && (
        <EditVideoModal 
            video={editingVideo} 
            onClose={() => setEditingVideo(null)} 
            onUpdate={fetchContent} 
            user={user} // Pass user for creating thumbnails
        />
      )}

      {editingSeries && (
        <SeriesWizard 
            user={user} 
            onClose={() => setEditingSeries(null)} 
            onSuccess={fetchContent} 
            existingSeries={editingSeries} 
        />
      )}

      {/* MINI PROFILE MODAL */}
      {selectedSubscriber && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedSubscriber(null)}>
            <div className="bg-[#111] border border-white/10 p-6 w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelectedSubscriber(null)} className="absolute top-2 right-2 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full border-2 border-brand overflow-hidden bg-zinc-800 shadow-[0_0_20px_rgba(255,0,127,0.3)]">
                        <img src={selectedSubscriber.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${selectedSubscriber.id}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center space-y-1">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedSubscriber.username}</h3>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Joined {new Date(selectedSubscriber.updated_at || Date.now()).toLocaleDateString()}
                        </p>
                        <p className="text-[9px] font-bold text-brand uppercase tracking-widest mt-1">
                            Subscribed: {new Date(selectedSubscriber.subscribed_at).toLocaleDateString()}
                        </p>
                        {selectedSubscriber.is_banned && (
                            <span className="inline-block bg-rose-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded mt-2">Messages Blocked</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-4 border-y border-white/10 py-4 w-full justify-center bg-white/5 mb-6">
                    <div className="text-center px-4">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Eye className="w-3 h-3" /> Views</p>
                        <p className="text-sm font-bold text-white">{(selectedSubscriber.views_count || 0).toLocaleString()}</p>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="text-center px-4">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Subs</p>
                        <p className="text-sm font-bold text-white">{(selectedSubscriber.subscribers_count || 0).toLocaleString()}</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <button onClick={() => onOpenMessages(selectedSubscriber.id)} className="w-full bg-brand hover:brightness-110 text-white py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20">
                        <Mail className="w-3 h-3" /> Message User
                    </button>
                    <button onClick={() => { onProfileClick(selectedSubscriber.id); setSelectedSubscriber(null); }} className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                        <UserIcon className="w-3 h-3" /> View Full Channel
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                        <button 
                            onClick={() => handleToggleBan(selectedSubscriber.id, selectedSubscriber.is_banned)}
                            className={`flex flex-col items-center justify-center gap-1 p-2 border transition-all group ${selectedSubscriber.is_banned ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20'}`}
                        >
                            {selectedSubscriber.is_banned ? <CheckCircle2 className="w-4 h-4" /> : <MessageCircleOff className="w-4 h-4" />}
                            <span className="text-[8px] font-black uppercase">{selectedSubscriber.is_banned ? 'Allow Messages' : 'Block Messages'}</span>
                        </button>
                        <button 
                            onClick={() => { addToast({ type: 'info', message: 'User reported.' }); setSelectedSubscriber(null); }}
                            className="flex flex-col items-center justify-center gap-1 p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all group"
                        >
                            <Flag className="w-4 h-4" /> 
                            <span className="text-[8px] font-black uppercase">Report</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full md:w-64 flex flex-col gap-1 shrink-0">
            <h1 className="text-xl font-black tracking-tighter mb-6 px-4">VidFree <span className="text-brand">Studio</span></h1>
            {TABS.map(tab => (
                <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)} 
                    className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-r ${
                        activeTab === tab.id 
                        ? 'bg-brand/10 border-l-4 border-brand text-white' 
                        : 'text-zinc-500 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                    }`}
                >
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-brand' : ''}`} />
                    {tab.label}
                </button>
            ))}
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 bg-[#0a0a0a] border border-white/10 min-h-[600px] shadow-2xl relative">
            
            {/* --- DASHBOARD TAB --- */}
            {activeTab === 'DASHBOARD' && (
                <div className="p-8 space-y-8 animate-in fade-in">
                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Channel <span className="text-brand">Analytics</span></h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard label="Total Subscribers" value={totalSubs} icon={Users} />
                        <StatCard label="Total Views" value={totalViews} icon={Eye} />
                        <StatCard label="Video Uploads" value={totalVideos} icon={Film} />
                        <StatCard label="Total Likes" value={totalLikes} icon={ThumbsUp} />
                    </div>

                    <div className="bg-white/5 border border-white/10 p-6 space-y-4">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-brand" /> Channel Status
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-400">
                            <div className="flex justify-between p-3 bg-black border border-white/5">
                                <span>Content Rating Access</span>
                                <span className="text-white font-bold">{ageData.allowed}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-black border border-white/5">
                                <span>Account Standing</span>
                                <span className="text-emerald-500 font-bold uppercase flex items-center gap-1"><CheckCircle2 size={12} /> Good</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CONTENT TAB --- */}
            {activeTab === 'CONTENT' && (
                <div className="p-8 space-y-8 animate-in fade-in font-comfortaa">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/5 pb-6">
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Content <span className="text-brand">Manager</span></h2>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Manage your library</p>
                        </div>
                        
                        <div className="flex gap-3 bg-[#050505] p-1 rounded-full border border-white/5">
                            <button 
                                onClick={() => setContentTab('VIDEOS')} 
                                className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                    contentTab === 'VIDEOS' 
                                    ? 'bg-gradient-to-r from-brand to-purple-600 text-white shadow-lg shadow-brand/20' 
                                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                Videos
                            </button>
                            <button 
                                onClick={() => setContentTab('SERIES')} 
                                className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                    contentTab === 'SERIES' 
                                    ? 'bg-gradient-to-r from-brand to-purple-600 text-white shadow-lg shadow-brand/20' 
                                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                Series
                            </button>
                        </div>
                    </div>

                    {isLoadingContent ? (
                        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
                    ) : (
                        <div className="space-y-3">
                            {/* TABLE HEADER */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[9px] font-black uppercase text-zinc-600 tracking-[0.2em] bg-white/[0.02] rounded-t-lg">
                                <div className="col-span-6">Asset Details</div>
                                <div className="col-span-2 text-center">Status</div>
                                <div className="col-span-2 text-center">Uploaded</div>
                                <div className="col-span-2 text-right pr-2">Performance</div>
                            </div>

                            <div className="space-y-1">
                                {contentTab === 'VIDEOS' ? myVideos.map(video => (
                                    <div key={video.id} className="grid grid-cols-12 gap-4 p-4 bg-[#080808] border border-white/5 hover:border-brand/30 hover:bg-white/[0.02] items-center group transition-all rounded-lg">
                                        <div className="col-span-6 flex gap-5 items-center">
                                            <div className="w-32 aspect-video bg-black relative shrink-0 overflow-hidden rounded-sm shadow-lg group-hover:scale-105 transition-transform duration-500">
                                                <img src={video.thumbnail_url || ''} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute bottom-1 right-1 bg-black/90 text-[8px] font-bold px-1.5 py-0.5 text-white rounded-sm">{video.duration}</div>
                                            </div>
                                            <div className="min-w-0 py-1 flex-1">
                                                <h4 className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{video.title}</h4>
                                                <p className="text-[10px] text-zinc-500 truncate mt-1 font-medium">{video.description || 'No description'}</p>
                                                <div className="flex gap-4 mt-3 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                                    <button onClick={() => setEditingVideo(video)} className="text-[9px] font-black uppercase text-white hover:text-brand flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">
                                                        <Edit size={10} /> Edit
                                                    </button>
                                                    <button onClick={() => handleDeleteVideo(video.id)} className="text-[9px] font-black uppercase text-zinc-500 hover:text-rose-500 flex items-center gap-1.5 px-2 py-1.5 transition-colors">
                                                        <Trash2 size={10} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="col-span-2 flex flex-col items-center justify-center gap-1">
                                            {video.visibility === 'public' && <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full flex items-center gap-2 text-[9px] font-black uppercase border border-emerald-500/20"><Globe size={10} /> Public</div>}
                                            {video.visibility === 'unlisted' && <div className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full flex items-center gap-2 text-[9px] font-black uppercase border border-amber-500/20"><EyeOff size={10} /> Unlisted</div>}
                                            {video.visibility === 'private' && <div className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full flex items-center gap-2 text-[9px] font-black uppercase border border-rose-500/20"><Lock size={10} /> Private</div>}
                                        </div>
                                        
                                        <div className="col-span-2 text-center text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                            {new Date(video.created_at).toLocaleDateString()}
                                        </div>
                                        
                                        <div className="col-span-2 text-right pr-4">
                                            <div className="flex flex-col items-end gap-1.5">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-300 bg-white/5 px-2 py-1 rounded-md min-w-[80px] justify-between">
                                                    <Eye size={12} className="text-zinc-500" /> {video.views_count.toLocaleString()}
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-300 bg-white/5 px-2 py-1 rounded-md min-w-[35px] justify-center">
                                                        <ThumbsUp size={10} /> {video.likes_count}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-300 bg-white/5 px-2 py-1 rounded-md min-w-[35px] justify-center">
                                                        <ThumbsDown size={10} /> {video.dislikes_count}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )) : mySeries.map(series => (
                                    <div key={series.id} className="grid grid-cols-12 gap-4 p-4 bg-[#080808] border border-white/5 hover:border-brand/30 hover:bg-white/[0.02] items-center group transition-all rounded-lg">
                                        <div className="col-span-6 flex gap-5 items-center">
                                            <div className="w-20 aspect-[2/3] bg-black relative shrink-0 overflow-hidden rounded-sm shadow-lg group-hover:scale-105 transition-transform duration-500 border border-white/5">
                                                {series.thumbnail_url ? (
                                                    <img src={series.thumbnail_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center"><Layers size={16} className="text-zinc-700"/></div>
                                                )}
                                            </div>
                                            <div className="min-w-0 py-1 flex-1">
                                                <h4 className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{series.title}</h4>
                                                <p className="text-[10px] text-zinc-500 truncate mt-1 font-medium">{series.description || 'No description'}</p>
                                                <div className="flex gap-4 mt-3 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                                    <button onClick={() => setEditingSeries(series)} className="text-[9px] font-black uppercase text-white hover:text-brand flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">
                                                        <Edit size={10} /> Manage Episodes
                                                    </button>
                                                    <button onClick={() => handleDeleteSeries(series.id)} className="text-[9px] font-black uppercase text-zinc-500 hover:text-rose-500 flex items-center gap-1.5 px-2 py-1.5 transition-colors">
                                                        <Trash2 size={10} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="col-span-2 flex flex-col items-center justify-center gap-1">
                                            {series.visibility === 'public' && <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full flex items-center gap-2 text-[9px] font-black uppercase border border-emerald-500/20"><Globe size={10} /> Public</div>}
                                            {series.visibility === 'unlisted' && <div className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full flex items-center gap-2 text-[9px] font-black uppercase border border-amber-500/20"><EyeOff size={10} /> Unlisted</div>}
                                            {series.visibility === 'private' && <div className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full flex items-center gap-2 text-[9px] font-black uppercase border border-rose-500/20"><Lock size={10} /> Private</div>}
                                        </div>
                                        
                                        <div className="col-span-2 text-center text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                            {new Date(series.created_at).toLocaleDateString()}
                                        </div>
                                        
                                        <div className="col-span-2 text-right pr-4">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[9px] font-black text-brand bg-brand/5 px-2 py-0.5 rounded border border-brand/20">
                                                    {(series as any).episode_count || 0} EPS
                                                </span>
                                                <span className={`px-2 py-1 rounded text-[8px] font-black uppercase border ${
                                                    series.rating === 'R' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                                                    series.rating === 'PG' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                                    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                }`}>
                                                    {series.rating} Rated
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {myVideos.length === 0 && contentTab === 'VIDEOS' && (
                                    <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-lg">
                                        <Film className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">No videos found</p>
                                    </div>
                                )}
                                {mySeries.length === 0 && contentTab === 'SERIES' && (
                                    <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-lg">
                                        <Layers className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">No series found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- CHANNEL TAB --- */}
            {activeTab === 'CHANNEL' && (
                <div className="p-8 space-y-8 animate-in fade-in">
                    <div className="border-b border-white/5 pb-4">
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Identity & <span className="text-brand">Branding</span></h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* LEFT COLUMN: IDENTITY */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Channel Handle</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
                                    <input value={handle} onChange={e => setHandle(e.target.value)} className="w-full bg-black border border-white/10 py-3 pl-8 pr-4 text-sm text-white focus:border-brand outline-none font-bold uppercase" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">First Name</label>
                                    <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm text-white focus:border-brand outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Last Name</label>
                                    <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm text-white focus:border-brand outline-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Display Alias</label>
                                <input value={alias} onChange={e => setAlias(e.target.value)} placeholder="e.g. TheGamingPro" className="w-full bg-black border border-white/10 p-3 text-sm text-white focus:border-brand outline-none" />
                                <p className="text-[9px] text-zinc-600 font-bold uppercase">This is your public display name if selected below.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Display Preference</label>
                                <div className="flex gap-6 p-3 bg-white/5 border border-white/10">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input 
                                            type="radio" 
                                            name="displayPref" 
                                            value="name" 
                                            checked={displayPreference === 'name'} 
                                            onChange={() => setDisplayPreference('name')}
                                            className="accent-brand cursor-pointer"
                                        />
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${displayPreference === 'name' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>Use Real Name</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input 
                                            type="radio" 
                                            name="displayPref" 
                                            value="alias" 
                                            checked={displayPreference === 'alias'} 
                                            onChange={() => setDisplayPreference('alias')}
                                            className="accent-brand cursor-pointer"
                                        />
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${displayPreference === 'alias' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>Use Alias</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Date of Birth</label>
                                <div className="flex gap-4">
                                    <input value={profile?.dob || 'Not Set'} disabled className="flex-1 bg-white/5 border border-white/10 p-3 text-sm text-zinc-400 cursor-not-allowed" />
                                    <div className="bg-white/5 border border-white/10 p-3 flex-1">
                                        <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">Watchable Ratings</p>
                                        <p className="text-xs font-bold text-white">{ageData.allowed}</p>
                                    </div>
                                </div>
                                <p className="text-[9px] text-zinc-600 font-bold uppercase ml-1">Cannot be changed once set.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Country</label>
                                <select value={country} onChange={e => setCountry(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm text-white focus:border-brand outline-none">
                                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: BIO & SOCIALS */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Channel Bio</label>
                                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={5} className="w-full bg-black border border-white/10 p-3 text-sm text-white focus:border-brand outline-none resize-none leading-relaxed" placeholder="Tell your story..." />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Social Links</label>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Twitter className="w-4 h-4 text-zinc-500" />
                                        <input value={socials.twitter} onChange={e => setSocials({...socials, twitter: e.target.value})} placeholder="Twitter Handle" className="flex-1 bg-black border border-white/10 p-2 text-xs text-white focus:border-brand outline-none" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Instagram className="w-4 h-4 text-zinc-500" />
                                        <input value={socials.instagram} onChange={e => setSocials({...socials, instagram: e.target.value})} placeholder="Instagram Handle" className="flex-1 bg-black border border-white/10 p-2 text-xs text-white focus:border-brand outline-none" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Youtube className="w-4 h-4 text-zinc-500" />
                                        <input value={socials.youtube} onChange={e => setSocials({...socials, youtube: e.target.value})} placeholder="YouTube URL" className="flex-1 bg-black border border-white/10 p-2 text-xs text-white focus:border-brand outline-none" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Facebook className="w-4 h-4 text-zinc-500" />
                                        <input value={socials.facebook} onChange={e => setSocials({...socials, facebook: e.target.value})} placeholder="Facebook URL" className="flex-1 bg-black border border-white/10 p-2 text-xs text-white focus:border-brand outline-none" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Ghost className="w-4 h-4 text-zinc-500" />
                                        <input value={socials.snapchat} onChange={e => setSocials({...socials, snapchat: e.target.value})} placeholder="Snapchat Username" className="flex-1 bg-black border border-white/10 p-2 text-xs text-white focus:border-brand outline-none" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Twitch className="w-4 h-4 text-zinc-500" />
                                        <input value={socials.twitch} onChange={e => setSocials({...socials, twitch: e.target.value})} placeholder="Twitch URL" className="flex-1 bg-black border border-white/10 p-2 text-xs text-white focus:border-brand outline-none" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <LinkIcon className="w-4 h-4 text-zinc-500" />
                                        <input value={socials.website} onChange={e => setSocials({...socials, website: e.target.value})} placeholder="Website URL" className="flex-1 bg-black border border-white/10 p-2 text-xs text-white focus:border-brand outline-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex justify-end">
                        <button 
                            onClick={handleSaveChannel} 
                            disabled={isSaving}
                            className="bg-brand text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-brand/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                        </button>
                    </div>
                </div>
            )}

            {/* --- SECURITY TAB --- */}
            {activeTab === 'ACCOUNT' && (
                <div className="p-8 space-y-12 animate-in fade-in">
                    <div className="space-y-6">
                        <div className="border-b border-white/5 pb-4">
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Security <span className="text-zinc-500">Settings</span></h2>
                        </div>
                        <div className="max-w-md space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">New Password</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-white focus:border-brand outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Confirm Password</label>
                                <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-white focus:border-brand outline-none" />
                            </div>
                            <button 
                                onClick={handleUpdatePassword} 
                                disabled={isUpdatingSecurity || !newPassword}
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                {isUpdatingSecurity ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6 pt-12 border-t border-white/5">
                        <div className="flex items-center gap-3 text-rose-500">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-black uppercase tracking-tight">Danger Zone</h3>
                        </div>
                        <div className="bg-rose-950/10 border border-rose-900/30 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-white uppercase">Delete Account</h4>
                                <p className="text-xs text-rose-300/70">Permanently delete your account and all content.</p>
                            </div>
                            <button 
                                onClick={handleDeleteAccount}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/20"
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUBSCRIBERS TAB --- */}
            {activeTab === 'SUBSCRIBERS' && (
                <div className="p-8 space-y-6 animate-in fade-in">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Subscribers <span className="text-brand">({subscribers.length})</span></h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                            <input 
                                value={subSearch} 
                                onChange={e => setSubSearch(e.target.value)} 
                                placeholder="Search subscribers..." 
                                className="bg-black border border-white/10 py-2 pl-8 pr-4 text-[10px] text-white w-48 focus:border-brand outline-none uppercase font-bold" 
                            />
                        </div>
                    </div>
                    {filteredSubs.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-white/5 text-zinc-600">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No subscribers found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredSubs.map(sub => (
                                <div key={sub.id} onClick={() => setSelectedSubscriber(sub)} className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 hover:border-brand/30 transition-all group cursor-pointer">
                                    <div className="w-10 h-10 bg-zinc-800 rounded-full overflow-hidden border border-white/10">
                                        <img src={sub.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${sub.id}`} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-black text-white uppercase truncate flex items-center gap-2">
                                            {sub.username}
                                            {sub.is_banned && <MessageCircleOff size={12} className="text-rose-500" />}
                                        </h4>
                                        <p className="text-[9px] text-zinc-500 uppercase">Subscribed {new Date(sub.subscribed_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); onOpenMessages(sub.id); }} className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded"><Mail size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); onProfileClick(sub.id); }} className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded"><UserIcon size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

        </main>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon }: any) => (
    <div className="bg-[#050505] border border-white/10 p-6 flex flex-col items-center justify-center text-center hover:border-brand/30 transition-colors group">
        <Icon className="w-6 h-6 text-zinc-600 mb-3 group-hover:text-brand transition-colors" />
        <span className="text-3xl font-black text-white tabular-nums tracking-tight">{value.toLocaleString()}</span>
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">{label}</span>
    </div>
);

export default SettingsView;
