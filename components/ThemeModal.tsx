
import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, ShieldCheck, Palette, RefreshCw } from 'lucide-react';
import { User, Profile } from '../types';
import { supabase } from '../services/supabase';

interface ThemeModalProps {
  user: User;
  profile: Profile | null;
  onClose: () => void;
  onRefreshProfile: () => void;
}

const ThemeModal: React.FC<ThemeModalProps> = ({ user, profile, onClose, onRefreshProfile }) => {
  const [tempThemeColor, setTempThemeColor] = useState(profile?.theme_color || '#FF007F');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (profile?.theme_color) {
      setTempThemeColor(profile.theme_color);
    }
  }, [profile?.theme_color]);

  const isColorTooBright = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.85;
  };

  const tooBright = isColorTooBright(tempThemeColor);

  const handleUpdate = async () => {
    if (tooBright || isUpdating) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ theme_color: tempThemeColor, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      
      if (error) throw error;
      onRefreshProfile();
      onClose();
    } catch (err) {
      console.error("Theme Update Error:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] w-full max-w-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white uppercase tracking-tight">Customize Theme</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Choose a Theme Color</p>
            
            <div className="flex items-center gap-10">
              <div className="relative w-24 h-24 bg-white/5 border border-white/5 p-1">
                <div className="w-full h-full bg-[conic-gradient(from_0deg,red,yellow,lime,aqua,blue,magenta,red)] opacity-10"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="w-12 h-12 border border-white/10 relative" 
                    style={{ backgroundColor: tempThemeColor }}
                  >
                    <input 
                      type="color" 
                      value={tempThemeColor}
                      onChange={(e) => setTempThemeColor(e.target.value)}
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0 z-20"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Palette className="w-4 h-4 text-white/20" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Preview</p>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-white/5" style={{ backgroundColor: tempThemeColor }}></div>
                    <span className="text-xs font-mono text-white opacity-80">{tempThemeColor.toUpperCase()}</span>
                  </div>
                </div>

                {!tooBright && (
                  <div className="flex items-center gap-2 text-emerald-500/80">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Color Valid</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-black/40 border-t border-white/5 flex justify-end gap-6 items-center">
          <button 
            onClick={() => setTempThemeColor('#FF007F')}
            className="text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
          <button 
            disabled={tooBright || isUpdating}
            onClick={handleUpdate}
            className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all disabled:opacity-20 flex items-center gap-2"
            style={{ backgroundColor: tooBright ? '#222' : tempThemeColor }}
          >
            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Save Theme
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeModal;
