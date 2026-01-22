
import React, { useState, useEffect } from 'react';
import { wlSchema } from '../services/supabase';
import { Whitelabel_Config, Whitelabel_Page } from '../types';
import { LayoutDashboard, Palette, FileText, Video, Users, Settings, LogOut } from 'lucide-react';
import { Whitelabel_PageBuilder } from './Whitelabel_PageBuilder';

export const Whitelabel_AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [config, setConfig] = useState<Whitelabel_Config | null>(null);
  const [pages, setPages] = useState<Whitelabel_Page[]>([]);
  
  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    const { data: cfg } = await wlSchema().from('config').select('*').limit(1).single();
    if (cfg) setConfig(cfg);
    
    const { data: pgs } = await wlSchema().from('pages').select('*');
    if (pgs) setPages(pgs);
  };

  const updateConfig = async (newConfig: Partial<Whitelabel_Config>) => {
      if (!config?.id) return;
      await wlSchema().from('config').update(newConfig).eq('id', config.id);
      setConfig({ ...config, ...newConfig });
      alert('Saved');
  };

  if (!config) return <div className="p-10 text-white">Loading Admin...</div>;

  return (
    <div className="flex h-screen bg-black text-white font-sans">
      <aside className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-950">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold">{config.platform_name}</h1>
          <p className="text-xs text-zinc-500 mt-1">Admin Console</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavButton icon={LayoutDashboard} label="Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavButton icon={FileText} label="Site Builder" active={activeTab === 'pages'} onClick={() => setActiveTab('pages')} />
          <NavButton icon={Palette} label="Theming" active={activeTab === 'theme'} onClick={() => setActiveTab('theme')} />
          <NavButton icon={Video} label="Content" active={activeTab === 'content'} onClick={() => setActiveTab('content')} />
          <NavButton icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        <div className="p-4 border-t border-zinc-800">
            <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-zinc-400 hover:text-white w-full px-4 py-2">
                <LogOut size={16} /> Exit to Site
            </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-black p-8">
        {activeTab === 'theme' && (
            <div className="max-w-2xl">
                <h2 className="text-2xl font-bold mb-6">Theme Settings</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Platform Name</label>
                        <input className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-white" value={config.platform_name} onChange={e => updateConfig({ platform_name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Primary Color</label>
                            <div className="flex gap-2">
                                <input type="color" value={config.primary_color} onChange={e => updateConfig({ primary_color: e.target.value })} />
                                <input className="flex-1 bg-zinc-900 border border-zinc-800 p-1 text-sm" value={config.primary_color} onChange={e => updateConfig({ primary_color: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Background Color</label>
                            <div className="flex gap-2">
                                <input type="color" value={config.bg_color} onChange={e => updateConfig({ bg_color: e.target.value })} />
                                <input className="flex-1 bg-zinc-900 border border-zinc-800 p-1 text-sm" value={config.bg_color} onChange={e => updateConfig({ bg_color: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'pages' && (
            <Whitelabel_PageBuilder pages={pages} onUpdate={loadAdminData} />
        )}

        {activeTab === 'dashboard' && (
            <div>
                <h2 className="text-2xl font-bold mb-6">Overview</h2>
                <div className="grid grid-cols-3 gap-6">
                    <div className="bg-zinc-900 p-6 rounded border border-zinc-800">
                        <h3 className="text-zinc-500 text-xs font-bold uppercase">Total Pages</h3>
                        <p className="text-3xl font-bold mt-2">{pages.length}</p>
                    </div>
                </div>
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
