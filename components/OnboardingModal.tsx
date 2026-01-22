
import React, { useState } from 'react';
import { User, AgeGroup } from '../types';
import { supabase } from '../services/supabase';
import { ShieldCheck, Globe, Calendar, Save, Loader2, CheckCircle2 } from 'lucide-react';

interface OnboardingModalProps {
  user: User;
  onComplete: () => void;
}

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Brazil', 'India', 'Other'];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ user, onComplete }) => {
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('United States');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateAgeGroup = (dob: string): AgeGroup | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

    if (age < 13) return 'under_13';
    if (age >= 13 && age <= 15) return '13_15';
    if (age >= 16 && age <= 17) return '16_17';
    return '18_plus';
  };

  const getAgeRatingLabel = (dobString: string) => {
    const group = calculateAgeGroup(dobString);
    if (!group) return null;
    
    switch (group) {
      case 'under_13': return { label: 'Universal (U) Only', color: 'text-emerald-500' };
      case '13_15': return { label: 'PG-13 Content', color: 'text-amber-500' };
      case '16_17': return { label: 'PG-13 & Some 16+', color: 'text-orange-500' };
      case '18_plus': return { label: 'All Content (18+)', color: 'text-rose-500' };
    }
  };

  const handleSubmit = async () => {
    if (!dob) {
      setError('Date of birth is required.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const ageGroup = calculateAgeGroup(dob);
      
      const { error: updateError } = await supabase.from('profiles').update({
        dob,
        country,
        age_group: ageGroup,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);

      if (updateError) throw updateError;
      
      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <div className="bg-[#0a0a0a] w-full max-w-md border border-white/10 shadow-2xl p-8 flex flex-col font-comfortaa animate-in fade-in zoom-in-95">
        <div className="text-center mb-8 space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Complete Setup</h2>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-2">Required for content personalization</p>
            </div>
        </div>

        {error && (
            <div className="mb-6 p-3 bg-rose-500/10 border-l-2 border-rose-500 text-rose-400 text-[10px] font-black uppercase tracking-widest">
              {error}
            </div>
        )}

        <div className="space-y-6">
            <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Date of Birth</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input 
                    type="date" 
                    value={dob} 
                    onChange={e => setDob(e.target.value)} 
                    className="w-full bg-black border border-white/10 py-3 pl-10 pr-4 text-white text-sm focus:border-brand outline-none uppercase font-bold [color-scheme:dark]" 
                    />
                </div>
                {dob && getAgeRatingLabel(dob) && (
                    <div className="flex items-center gap-2 mt-2 bg-white/5 p-2 border border-white/5">
                    <ShieldCheck className="w-4 h-4 text-zinc-400" />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${getAgeRatingLabel(dob)?.color}`}>
                        {getAgeRatingLabel(dob)?.label}
                    </span>
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Country</label>
                <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <select 
                    value={country} 
                    onChange={e => setCountry(e.target.value)}
                    className="w-full bg-black border border-white/10 py-3 pl-10 pr-4 text-white text-sm focus:border-brand outline-none appearance-none"
                    >
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <button 
                onClick={handleSubmit} 
                disabled={loading || !dob}
                className="w-full bg-brand text-white hover:brightness-110 py-4 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-brand/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Complete Profile
            </button>
        </div>
      </div>
    </div>
  );
};
