
import React, { useState } from 'react';
import { 
  ArrowRight, CheckCircle2, Play, Layout, Wand2, Zap, 
  Layers, Star, Flame, MessageSquare, Globe, Scissors, MousePointer2
} from 'lucide-react';
import { useBranding } from '../contexts/BrandingContext';

interface LandingViewProps {
  onJoin: () => void;
  onExplore: () => void;
  onNavigateToMain: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onJoin, onExplore, onNavigateToMain }) => {
  const { config } = useBranding();

  return (
    <div className="bg-primary text-white min-h-screen font-comfortaa selection:bg-brand selection:text-white overflow-x-hidden pb-24 md:pb-0">
      
      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-6 left-6 right-6 z-[100] md:hidden">
        <button 
          onClick={onJoin}
          className="w-full bg-brand text-white py-5 text-sm font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(255,0,127,0.4)] active:scale-95 transition-all"
        >
          Join Now
        </button>
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl aspect-square bg-brand/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Professional content sharing platform</span>
          </div>
          
          <div className="space-y-8">
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] max-w-6xl mx-auto">
              {config.siteName} <br />
              YOUR CONTENT. YOUR CHANNEL. <span className="text-brand">YOUR WAY.</span>
            </h1>
            <p className="text-xl md:text-3xl text-zinc-300 max-w-4xl mx-auto font-medium leading-relaxed">
              The high-performance video platform designed for creators who want professional-grade tools and direct audience access.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
            <button 
              onClick={onJoin}
              className="hidden md:block w-full sm:w-auto px-12 py-5 bg-brand text-white text-sm font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(255,0,127,0.3)] hover:brightness-110 hover:-translate-y-1 transition-all active:scale-95"
            >
              Get Started
            </button>
            <button 
              onClick={onExplore}
              className="w-full sm:w-auto px-12 py-5 bg-white/5 border border-white/10 text-white text-sm font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:-translate-y-1 transition-all active:scale-95"
            >
              See Features
            </button>
          </div>
        </div>

        {/* Visual Mockups Grid */}
        <div className="max-w-7xl mx-auto mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
          <MockupCard title="Thumbnail Studio" label="Built-in Design Tools" icon={Layers} />
          <MockupCard title="Trending Feed" label="Top 5 Spotlight" icon={Flame} />
          <MockupCard title="Shorts Feed" label="Vertical Content" icon={Zap} />
          <MockupCard title="Direct Messaging" label="P2P Connection" icon={MessageSquare} />
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-32 px-6 bg-[#080808]" id="features">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Everything You Need <span className="text-brand">To Grow</span></h2>
            <p className="text-zinc-600 uppercase text-xs font-black tracking-[0.4em]">Creator First Technology</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureItem 
              icon={Layout}
              title="Thumbnail Studio" 
              desc="Create professional thumbnails inside the platform with layers, lasso selection, and built-in AI tools." 
            />
            <FeatureItem 
              icon={Wand2}
              title="AI Title & Description" 
              desc="Stop struggling with metadata. Generate high-performance titles and descriptions using integrated AI tools." 
              badge="Built-in"
            />
            <FeatureItem 
              icon={Zap}
              title="Shorts Integration" 
              desc="Separate feeds ensure your short and long content both find their audience." 
            />
            <FeatureItem 
              icon={Star}
              title="Series + Episodes" 
              desc="Organize your content into seasons and episodes to build a dedicated viewer base." 
            />
            <FeatureItem 
              icon={Flame}
              title="New & Hot Badges" 
              desc="Instantly identify fresh content with the 'New' badge or see what's currently exploding with the 'Hot' badge." 
            />
            <FeatureItem 
              icon={ArrowRight}
              title="Smart Trending Page" 
              desc="Updates every 30 minutes. Features a Top 5 Spotlight box to highlight the most popular creators." 
            />
            <FeatureItem 
              icon={MessageSquare}
              title="P2P Messaging" 
              desc="Message brands and other creators directly. Built-in tools help you connect without leaving the platform." 
            />
            <FeatureItem 
              icon={Globe}
              title="Auto-Translation" 
              desc="Reach the world. Content metadata can be automatically optimized for global audiences." 
            />
            <FeatureItem 
              icon={CheckCircle2}
              title="Community Posts" 
              desc="Keep your audience engaged with text, image, and video updates directly in their feed." 
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-12">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-tight">
              A Better Way To <span className="text-brand">Share Content</span>
            </h2>
            <div className="grid grid-cols-1 gap-10">
              <BenefitBlock title="More Control" desc="You own your channel and your audience. No hidden shadow-bans or opaque algorithm shifts." />
              <BenefitBlock title="Better Discovery" desc="Our momentum-based systems surface quality work regardless of your subscriber count." />
              <BenefitBlock title="Integrated Tools" desc="Spend more time creating and less time managing ten different apps." />
              <BenefitBlock title="Community Focused" desc="Built to foster genuine connections between creators and viewers." />
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] bg-white/5 border border-white/10 p-1 rounded-sm shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-brand/5 opacity-50 group-hover:opacity-100 transition-opacity" />
               <div className="relative h-full flex flex-col p-10 justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-white" />
                    <div className="h-2 w-48 bg-zinc-700" />
                  </div>
                  <div className="space-y-8">
                    <div className="p-6 bg-black border border-white/10 space-y-4">
                       <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Audience Reach</p>
                       <p className="text-3xl font-black text-white">Global</p>
                       <div className="h-1 w-full bg-zinc-900 overflow-hidden">
                          <div className="h-full bg-brand w-[100%]" />
                       </div>
                       <p className="text-[10px] font-bold text-brand uppercase">High Engagement</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white/5 p-4 border border-white/5 flex flex-col gap-1">
                          <span className="text-xs font-black text-zinc-600 uppercase">Views</span>
                          <span className="text-lg font-black text-white">1.2M</span>
                       </div>
                       <div className="bg-white/5 p-4 border border-white/5 flex flex-col gap-1">
                          <span className="text-xs font-black text-zinc-600 uppercase">Hot Score</span>
                          <span className="text-lg font-black text-brand">+420%</span>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="py-20 px-6 border-t border-white/5 bg-[#030303]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-center md:text-left space-y-2">
            <h4 className="text-2xl font-black uppercase tracking-tighter">{config.siteName}</h4>
            <p className="text-xs text-zinc-700 font-black uppercase tracking-widest">Professional content sharing platform.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-10">
            <button 
              onClick={onNavigateToMain} 
              className="text-xs font-black uppercase tracking-widest text-white hover:text-brand transition-colors flex items-center gap-2 group"
            >
              Enter Site <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <span className="text-xs text-zinc-800 font-black uppercase tracking-widest">{config.footerText}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const MockupCard = ({ title, label, icon: Icon }: { title: string, label: string, icon: any }) => (
  <div className="bg-[#0a0a0a] border border-white/5 p-8 space-y-6 hover:border-brand/40 transition-all group">
    <div className="aspect-video bg-white/5 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-brand/5 group-hover:bg-brand/10 transition-colors" />
      <Icon className="w-10 h-10 text-zinc-700 group-hover:text-brand/50 transition-all" />
    </div>
    <div className="space-y-1">
      <h3 className="text-base font-black uppercase tracking-tight">{title}</h3>
      <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">{label}</p>
    </div>
  </div>
);

const FeatureItem = ({ icon: Icon, title, desc, badge }: { icon: any, title: string, desc: string, badge?: string }) => (
  <div className="bg-[#0a0a0a] border border-white/5 p-10 space-y-6 hover:border-brand/20 transition-all group">
    <div className="flex justify-between items-start">
      <Icon className="w-8 h-8 text-brand" />
      {badge && <span className="text-[9px] font-black text-brand bg-brand/5 px-2 py-1 uppercase tracking-widest border border-brand/10">{badge}</span>}
    </div>
    <div className="space-y-3">
      <h3 className="text-2xl font-black uppercase tracking-tight">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed font-medium">{desc}</p>
    </div>
  </div>
);

const BenefitBlock = ({ title, desc }: { title: string, desc: string }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-4">
       <CheckCircle2 className="w-8 h-8 text-brand" />
       <h3 className="text-2xl font-black uppercase tracking-tight">{title}</h3>
    </div>
    <p className="text-lg text-zinc-400 font-medium leading-relaxed pl-12">{desc}</p>
  </div>
);

export default LandingView;
