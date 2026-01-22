
import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../services/supabase';
import { WhitelabelConfig, WhitelabelPage } from '../../types';
import { PageBuilder } from './PageBuilder';
import { ThemeEditor } from './ThemeEditor';
import { LayoutDashboard, Palette, FileText, Video, Users, Settings, LogOut } from 'lucide-react';

export const AdminLayout = () => {
  const [activeTab, setActiveTab] = useState('pages');
  const [config, setConfig] = useState<WhitelabelConfig | null>(null);
  const [pages, setPages] = useState<WhitelabelPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const supabase = getSupabase();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load Config
    const { data: cfg } = await supabase.from('config').select('*').schema('whitelabel').single();
    if (cfg) setConfig(cfg);

    // Load Pages
    const { data: pgs } = await supabase.from('pages').select('*').schema('whitelabel');
    if (pgs) {
        setPages(pgs);
        if(pgs.length > 0) setActivePageId(pgs[0].id);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    await supabase.from('config').update(config).schema('whitelabel').eq('id', config.id);
    alert('Settings Saved');
  };

  const savePage = async () => {
    const page = pages.find(p => p.id === activePageId);
    if (!page) return;
    await supabase.from('pages').update({ blocks: page.blocks }).schema('whitelabel').eq('id', page.id);
    alert('Page Saved');
  };

  if (!config) return <div className="text-white p-10">Loading Admin...</div>;

  return (
    <div className="flex h-screen bg-black text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-xs text-zinc-500 mt-1">Platform Management</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavButton icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavButton icon={FileText} label="Pages & Builder" active={activeTab === 'pages'} onClick={() => setActiveTab('pages')} />
          <NavButton icon={Palette} label="Theme & Brand" active={activeTab === 'theme'} onClick={() => setActiveTab('theme')} />
          <NavButton icon={Video} label="Videos" active={activeTab === 'videos'} onClick={() => setActiveTab('videos')} />
          <NavButton icon={Users} label="Users" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <NavButton icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <button onClick={() => window.location.href = '/'} className="flex items-center gap-3 text-zinc-400 hover:text-white px-4 py-2 w-full">
            <LogOut size={18} /> Exit Admin
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-zinc-950 p-8">
        
        {activeTab === 'theme' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Theme Settings</h2>
            <ThemeEditor config={config} onChange={setConfig} onSave={saveConfig} />
          </div>
        )}

        {activeTab === 'pages' && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Page Builder</h2>
                <select 
                    className="bg-zinc-900 border border-zinc-700 p-2 rounded text-white"
                    value={activePageId || ''}
                    onChange={(e) => setActivePageId(e.target.value)}
                >
                    {pages.map(p => <option key={p.id} value={p.id}>{p.title} ({p.slug})</option>)}
                </select>
            </div>
            {activePageId && (
                <PageBuilder 
                    blocks={pages.find(p => p.id === activePageId)?.blocks || []}
                    onChange={(newBlocks) => setPages(pages.map(p => p.id === activePageId ? { ...p, blocks: newBlocks } : p))}
                    onSave={savePage}
                />
            )}
          </div>
        )}

        {/* Placeholders for other tabs */}
        {['dashboard', 'videos', 'users', 'settings'].includes(activeTab) && (
            <div className="flex items-center justify-center h-full text-zinc-600">
                Module: {activeTab.toUpperCase()} (Coming Soon in V2)
            </div>
        )}

      </main>
    </div>
  );
};

const NavButton = ({ icon: Icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${active ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
  >
    <Icon size={18} /> {label}
  </button>
);
