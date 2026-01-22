
import React from 'react';
import { Play, Menu, Search, Video, X } from 'lucide-react';

// --- ATOMS ---

export const Whitelabel_Button = ({ children, style, onClick }: any) => (
  <button 
    onClick={onClick}
    className="px-6 py-3 font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
    style={{
      backgroundColor: 'var(--wl-primary)',
      color: 'var(--wl-text)',
      borderRadius: '4px',
      ...style
    }}
  >
    {children}
  </button>
);

// --- BLOCKS ---

export const Whitelabel_Header = ({ content, style }: any) => (
  <header 
    className="flex items-center justify-between px-6 py-4 sticky top-0 z-50 backdrop-blur-md"
    style={{ backgroundColor: 'var(--wl-bg-secondary)', borderBottom: '1px solid var(--wl-border)', ...style }}
  >
    <div className="text-xl font-black uppercase tracking-tighter" style={{ color: 'var(--wl-text)' }}>
      {content.logo ? <img src={content.logo} className="h-8" /> : content.title || 'Brand'}
    </div>
    <div className="hidden md:flex gap-6 text-sm font-bold uppercase" style={{ color: 'var(--wl-text-secondary)' }}>
        <a href="#" className="hover:text-white">Home</a>
        <a href="#" className="hover:text-white">Browse</a>
        <a href="#" className="hover:text-white">Live</a>
    </div>
    <div className="flex gap-4">
        <Search className="w-5 h-5" style={{ color: 'var(--wl-text)' }} />
        <Menu className="w-5 h-5 md:hidden" style={{ color: 'var(--wl-text)' }} />
    </div>
  </header>
);

export const Whitelabel_Hero = ({ content, style }: any) => (
  <section 
    className="relative flex items-center justify-center text-center px-4"
    style={{ 
        minHeight: style.height || '60vh', 
        backgroundColor: style.bg || 'var(--wl-bg)',
        backgroundImage: style.bgImage ? `url(${style.bgImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    }}
  >
    <div className="absolute inset-0 bg-black/50" />
    <div className="relative z-10 max-w-4xl space-y-6">
        <h1 className="text-5xl md:text-7xl font-black uppercase leading-none" style={{ color: 'var(--wl-text)' }}>
            {content.headline || 'Hero Headline'}
        </h1>
        <p className="text-xl md:text-2xl font-light" style={{ color: 'var(--wl-text-secondary)' }}>
            {content.subhead || 'Subtitle goes here'}
        </p>
        <div className="pt-4">
            <Whitelabel_Button>{content.cta || 'Watch Now'}</Whitelabel_Button>
        </div>
    </div>
  </section>
);

export const Whitelabel_VideoGrid = ({ content, style }: any) => (
  <section className="py-12 px-6" style={{ backgroundColor: 'var(--wl-bg)' }}>
      <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black uppercase mb-8" style={{ color: 'var(--wl-text)' }}>{content.title || 'Videos'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                  <div key={i} className="group cursor-pointer">
                      <div className="aspect-video bg-gray-800 relative overflow-hidden rounded-sm mb-3">
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-all">
                              <Play className="w-12 h-12 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                      </div>
                      <h3 className="font-bold text-sm uppercase truncate" style={{ color: 'var(--wl-text)' }}>Sample Video Title {i}</h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--wl-text-secondary)' }}>1.2K Views • 2h ago</p>
                  </div>
              ))}
          </div>
      </div>
  </section>
);

export const Whitelabel_Footer = ({ content, style }: any) => (
    <footer className="py-12 px-6 border-t" style={{ backgroundColor: 'var(--wl-bg-secondary)', borderColor: 'var(--wl-border)', ...style }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-lg font-black uppercase" style={{ color: 'var(--wl-text)' }}>
                {content.title || 'Brand'}
            </div>
            <div className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--wl-text-secondary)' }}>
                {content.text || '© 2025 All Rights Reserved'}
            </div>
        </div>
    </footer>
);
