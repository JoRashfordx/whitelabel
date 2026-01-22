import React, { useEffect, useState } from 'react';
import { WhitelabelConfig, WhitelabelPage } from '../../types';
import { getSupabase } from '../../services/supabase';
import { BlockRenderer } from './BlockRenderer';
import { User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  config: WhitelabelConfig;
}

export const SiteLayout: React.FC<Props> = ({ config }) => {
  const [page, setPage] = useState<WhitelabelPage | null>(null);
  const { user } = useAuth();
  
  // Apply dynamic styles
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', config.primary_color);
    document.documentElement.style.setProperty('--bg-color', config.bg_color);
    document.documentElement.style.setProperty('--text-color', config.text_color);
    document.title = config.platform_name;
  }, [config]);

  useEffect(() => {
    const loadHome = async () => {
      const supabase = getSupabase();
      // Fetch Homepage
      const { data } = await supabase
        .from('pages')
        .select('*')
        .schema('whitelabel')
        .eq('is_home', true)
        .single();
      
      if (data) setPage(data);
    };
    loadHome();
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: config.bg_color, color: config.text_color }}>
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-opacity-90 backdrop-blur-md z-50" style={{ backgroundColor: config.bg_color }}>
        <div className="flex items-center gap-3">
          {config.logo_url ? <img src={config.logo_url} className="h-8" /> : <div className="text-xl font-black">{config.platform_name}</div>}
        </div>
        <nav className="hidden md:flex gap-6 font-medium text-sm">
          <a href="#" className="hover:text-primary">Home</a>
          <a href="#" className="hover:text-primary">Videos</a>
          <a href="#" className="hover:text-primary">Channels</a>
        </nav>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
                {user.avatar_url ? <img src={user.avatar_url} className="rounded-full"/> : <User size={16}/>}
              </div>
              {user.role === 'admin' && (
                <a href="/admin" className="text-xs bg-primary px-3 py-1 rounded font-bold">Admin</a>
              )}
            </div>
          ) : (
            <button className="text-sm font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded transition-colors">Sign In</button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {page ? <BlockRenderer blocks={page.blocks} /> : <div className="p-20 text-center">Loading Content...</div>}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm opacity-60">{config.footer_text}</div>
          <div className="flex gap-6 text-sm opacity-60">
            <a href="#" className="hover:opacity-100">Terms</a>
            <a href="#" className="hover:opacity-100">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};