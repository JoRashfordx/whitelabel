
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface LandingPage2Props {
  onNavigateToMain: () => void;
}

const MESSAGES = [
  "vidfree.tv is coming",
  "are you ready...",
  "join the waiting list"
];

const LandingPage2: React.FC<LandingPage2Props> = ({ onNavigateToMain }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (msgIndex < MESSAGES.length) {
      setFadeState('in');
      const timer = setTimeout(() => {
        if (msgIndex < MESSAGES.length - 1) {
            setFadeState('out');
            setTimeout(() => setMsgIndex(prev => prev + 1), 500); // Wait for fade out
        } else {
            // Last message stays until modal
            setTimeout(() => {
                setFadeState('out');
                setTimeout(() => setShowModal(true), 500);
            }, 1000);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [msgIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
        setStatus('error');
        setErrorMsg('Please enter a valid email.');
        return;
    }

    setStatus('loading');
    try {
        const { error } = await supabase.from('waiting_list').insert([{ email }]);
        if (error) {
            if (error.code === '23505') throw new Error('Email already registered.');
            throw error;
        }
        setStatus('success');
    } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Something went wrong.');
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-comfortaa">
      
      {/* Moving Neon Border Container */}
      <div className="absolute inset-0 p-[2px] z-0 overflow-hidden">
         <div className="absolute inset-[-50%] w-[200%] h-[200%] animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0deg,var(--pink-electric)_90deg,transparent_180deg,transparent_360deg)] opacity-80 blur-md origin-center" style={{ animationDuration: '6s' }} />
         <div className="absolute inset-[4px] bg-black z-10" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-20 w-full h-full flex flex-col items-center justify-center p-6 text-center">
        
        {/* Text Sequence */}
        {!showModal && (
            <div className={`transition-all duration-500 transform ${fadeState === 'in' ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-sm'}`}>
                <h1 className={`font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,0,127,0.5)] ${msgIndex === 1 ? 'text-3xl md:text-5xl' : 'text-4xl md:text-7xl'}`}>
                    {msgIndex === 0 && (
                        <>vidfree<span className="text-brand">.tv</span> is coming</>
                    )}
                    {msgIndex === 1 && (
                        <span className="block leading-tight">
                            are you ready <span className="text-brand">to step up your content?</span>
                        </span>
                    )}
                    {msgIndex === 2 && (
                        <>join the waiting <span className="text-brand">list now</span></>
                    )}
                </h1>
            </div>
        )}

        {/* Modal Overlay */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-700">
              <div className="w-full max-w-md bg-black border border-white/10 p-8 shadow-[0_0_50px_rgba(255,0,127,0.2)] relative overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
                {/* Decorative neon line on top of modal */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand to-transparent" />

                {status === 'success' ? (
                    <div className="text-center space-y-6 py-8 animate-in fade-in">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                        <h2 className="text-2xl font-black text-white lowercase tracking-widest">you're on the list!</h2>
                        <p className="text-zinc-400 text-xs lowercase">we'll notify you when vidfree.tv launches.</p>
                        <button 
                            onClick={onNavigateToMain}
                            className="text-[10px] font-black lowercase text-brand hover:text-white transition-colors underline"
                        >
                            go to main site
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in">
                        <div className="text-center space-y-4">
                            <h2 className="text-2xl md:text-3xl font-black text-white lowercase tracking-tight">get early access</h2>
                            <p className="text-sm font-bold leading-relaxed lowercase">
                                <span className="text-white">be the first to experience</span>
                                <br />
                                <span className="text-brand">a new way of creating content</span>
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <input 
                                    type="email" 
                                    placeholder="enter your email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-4 text-center text-white text-sm font-bold lowercase placeholder-zinc-600 focus:outline-none focus:border-brand focus:bg-white/10 transition-all font-comfortaa"
                                    disabled={status === 'loading'}
                                />
                            </div>
                            
                            {status === 'error' && (
                                <div className="text-rose-500 text-[10px] font-bold lowercase flex items-center justify-center gap-2">
                                    <AlertCircle className="w-3 h-3" /> {errorMsg}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={status === 'loading'}
                                className="w-full bg-brand hover:brightness-110 text-white p-4 text-sm font-black lowercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(255,0,127,0.3)] hover:shadow-[0_0_30px_rgba(255,0,127,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'join waiting list'}
                            </button>
                        </form>
                    </div>
                )}
              </div>
            </div>
        )}

      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 z-30 text-center">
        <button 
            onClick={onNavigateToMain}
            className="text-[10px] font-black lowercase tracking-[0.3em] text-zinc-600 hover:text-white transition-colors"
        >
            go to vidfree.tv
        </button>
      </div>

      <style>{`
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage2;
