
import React, { useState } from 'react';
import { AuthMode } from '../types';
import { X, Loader2, AlertCircle, AtSign, Lock, CheckCircle2, Database } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ mode, onClose }) => {
  const [currentMode, setCurrentMode] = useState<AuthMode>(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (currentMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose(); // Close modal, App.tsx handles state update via onAuthStateChange
      } else {
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    username: email.split('@')[0], // Default username
                }
            }
        });
        
        if (error) {
            console.error("Signup Error:", error);
            // Specific check for database trigger issues
            if (error.message?.includes('Database error') || error.message?.includes('relation') || error.status === 500) {
                setError("DATABASE ERROR: Please run the 'supabase_schema.sql' repair script in your Supabase Dashboard SQL Editor.");
                setLoading(false);
                return;
            }
            throw error;
        }
        
        if (data.session) {
            onClose(); // Close modal, App.tsx handles state update via onAuthStateChange
        } else {
            setSuccessMsg("Account created successfully! Please check your email to verify your account before logging in.");
            setLoading(false);
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || "Authentication failed.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] w-full max-w-sm border border-white/10 shadow-2xl p-8 relative animate-in fade-in zoom-in-95">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
        </button>
        
        <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-6 text-center">
            {currentMode === 'login' ? 'Welcome Back' : 'Join VidFree'}
        </h2>

        {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-sm flex items-start gap-3">
                {error.includes('DATABASE') ? <Database size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                <span className="leading-relaxed">{error}</span>
            </div>
        )}

        {successMsg && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold rounded-sm flex items-start gap-3">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> 
                <span className="leading-relaxed">{successMsg}</span>
            </div>
        )}

        {!successMsg && (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Email</label>
                    <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-black border border-white/10 py-3 pl-10 pr-4 text-sm text-white focus:border-brand outline-none transition-all placeholder-zinc-700" 
                            placeholder="you@email.com"
                        />
                    </div>
                </div>
                
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                            type="password" 
                            required 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-black border border-white/10 py-3 pl-10 pr-4 text-sm text-white focus:border-brand outline-none transition-all placeholder-zinc-700" 
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-brand hover:brightness-110 text-white py-3 text-xs font-black uppercase tracking-widest shadow-lg shadow-brand/20 flex items-center justify-center gap-2 mt-4 transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : (currentMode === 'login' ? 'Sign In' : 'Create Account')}
                </button>
            </form>
        )}

        <div className="mt-6 text-center pt-6 border-t border-white/5">
            <button 
                onClick={() => { setCurrentMode(currentMode === 'login' ? 'register' : 'login'); setError(null); setSuccessMsg(null); }}
                className="text-xs text-zinc-500 hover:text-white font-bold transition-colors uppercase tracking-wide"
            >
                {currentMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
