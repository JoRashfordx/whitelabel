
import React from 'react';
import { Profile } from '../types';
import { X, Calendar, Eye, Users, User as UserIcon, Flag } from 'lucide-react';

interface MiniProfileModalProps {
  profile: Profile;
  onClose: () => void;
  onViewChannel: () => void;
  onReport?: () => void;
  children?: React.ReactNode;
}

const MiniProfileModal: React.FC<MiniProfileModalProps> = ({ profile, onClose, onViewChannel, onReport, children }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-[#111] border border-white/10 p-6 w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-2 right-2 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            <div className="flex flex-col items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full border-2 border-brand overflow-hidden bg-zinc-800 shadow-[0_0_20px_rgba(255,0,127,0.3)]">
                    <img src={profile.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${profile.id}`} className="w-full h-full object-cover" />
                </div>
                <div className="text-center space-y-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{profile.username}</h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined {new Date(profile.updated_at || Date.now()).toLocaleDateString()}
                    </p>
                </div>
            </div>
            <div className="flex gap-4 border-y border-white/10 py-4 w-full justify-center bg-white/5 mb-6">
                <div className="text-center px-4">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Eye className="w-3 h-3" /> Views</p>
                    <p className="text-sm font-bold text-white">{(profile.views_count || 0).toLocaleString()}</p>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center px-4">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Subs</p>
                    <p className="text-sm font-bold text-white">{(profile.subscribers_count || 0).toLocaleString()}</p>
                </div>
            </div>
            <div className="space-y-3">
                <button onClick={onViewChannel} className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-white py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    <UserIcon className="w-3 h-3" /> View Full Channel
                </button>
                {onReport && (
                    <button onClick={onReport} className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                        <Flag className="w-3 h-3" /> Report User
                    </button>
                )}
                {children}
            </div>
        </div>
    </div>
  );
};

export default MiniProfileModal;
