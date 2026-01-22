
import React, { useState, useEffect } from 'react';
import { useBranding } from '../contexts/BrandingContext';
import { X, Save, Palette, Type, Layout, Database, Layers, Check, AlertTriangle, Trash2, Clipboard } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../services/supabase';
import { generateMockDataSQL, removeMockDataSQL } from '../services/schemaGenerator';

interface AdminPanelProps {
    onExit: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
    const { config, updateConfig } = useBranding();
    const { addToast } = useToast();
    const [localConfig, setLocalConfig] = useState(config);
    const [activeTab, setActiveTab] = useState<'branding' | 'mock'>('branding');
    
    // Mock Data State
    const [mockStatus, setMockStatus] = useState<boolean | null>(null);
    const [mockLoading, setMockLoading] = useState(false);
    const [sqlModal, setSqlModal] = useState<{ open: boolean, sql: string, title: string } | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (activeTab === 'mock') checkMockStatus();
    }, [activeTab]);

    const checkMockStatus = async () => {
        setMockLoading(true);
        try {
            const { data } = await supabase.from('wl_mock_data_tracking').select('installed').limit(1).maybeSingle();
            setMockStatus(data?.installed || false);
        } catch (e) {
            console.error(e);
            setMockStatus(false);
        } finally {
            setMockLoading(false);
        }
    };

    const handleSave = () => {
        updateConfig(localConfig);
        addToast({ type: 'success', message: 'Branding updated!' });
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-black text-white font-comfortaa flex flex-col">
            {/* SQL Modal */}
            {sqlModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <div className="bg-[#111] border border-white/10 w-full max-w-2xl p-6 relative">
                        <button onClick={() => setSqlModal(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                            <Database className="w-5 h-5 text-brand" /> {sqlModal.title}
                        </h3>
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 mb-4 text-amber-500 text-xs font-bold uppercase flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Run this SQL in your Supabase Dashboard
                        </div>
                        <div className="relative">
                            <textarea readOnly value={sqlModal.sql} className="w-full h-64 bg-black border border-white/10 p-4 text-xs font-mono text-emerald-400 focus:outline-none resize-none" />
                            <button onClick={() => handleCopy(sqlModal.sql)} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 text-white rounded">
                                {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                            </button>
                        </div>
                        <button onClick={() => { setSqlModal(null); checkMockStatus(); }} className="w-full mt-4 bg-brand text-white py-3 font-black uppercase tracking-widest hover:brightness-110">
                            I Have Run The SQL
                        </button>
                    </div>
                </div>
            )}

            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0a]">
                <h2 className="text-lg font-black uppercase tracking-tight">Platform Admin</h2>
                <div className="flex gap-4">
                    <button onClick={handleSave} className="flex items-center gap-2 bg-brand px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:brightness-110">
                        <Save className="w-4 h-4" /> Save Changes
                    </button>
                    <button onClick={onExit} className="text-zinc-500 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="w-64 bg-[#0a0a0a] border-r border-white/10 p-4 space-y-2">
                    <button 
                        onClick={() => setActiveTab('branding')}
                        className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase rounded flex items-center gap-2 ${activeTab === 'branding' ? 'bg-white/5 text-brand' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Palette className="w-4 h-4" /> Branding
                    </button>
                    <button 
                        onClick={() => setActiveTab('mock')}
                        className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase rounded flex items-center gap-2 ${activeTab === 'mock' ? 'bg-white/5 text-brand' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Layers className="w-4 h-4" /> Mock Data
                    </button>
                </div>

                <div className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-3xl space-y-8">
                        
                        {activeTab === 'branding' && (
                            <>
                                <div className="space-y-4">
                                    <h3 className="text-xl font-black uppercase flex items-center gap-2">
                                        <Type className="w-5 h-5 text-brand" /> Site Identity
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-zinc-500">Site Name</label>
                                            <input 
                                                value={localConfig.siteName}
                                                onChange={e => setLocalConfig({...localConfig, siteName: e.target.value})}
                                                className="w-full bg-black border border-white/10 p-3 text-white focus:border-brand outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-zinc-500">Font Family</label>
                                            <input 
                                                value={localConfig.fontFamily}
                                                onChange={e => setLocalConfig({...localConfig, fontFamily: e.target.value})}
                                                className="w-full bg-black border border-white/10 p-3 text-white focus:border-brand outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-8 border-t border-white/10">
                                    <h3 className="text-xl font-black uppercase flex items-center gap-2">
                                        <Palette className="w-5 h-5 text-brand" /> Theme Colors
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-zinc-500">Primary Color (Brand)</label>
                                            <div className="flex gap-2">
                                                <input type="color" value={localConfig.colors.primary} onChange={e => setLocalConfig({...localConfig, colors: {...localConfig.colors, primary: e.target.value}})} className="w-10 h-10 bg-transparent border-none p-0 cursor-pointer" />
                                                <input value={localConfig.colors.primary} onChange={e => setLocalConfig({...localConfig, colors: {...localConfig.colors, primary: e.target.value}})} className="flex-1 bg-black border border-white/10 p-3 text-xs" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-zinc-500">Background Color</label>
                                            <div className="flex gap-2">
                                                <input type="color" value={localConfig.colors.background} onChange={e => setLocalConfig({...localConfig, colors: {...localConfig.colors, background: e.target.value}})} className="w-10 h-10 bg-transparent border-none p-0 cursor-pointer" />
                                                <input value={localConfig.colors.background} onChange={e => setLocalConfig({...localConfig, colors: {...localConfig.colors, background: e.target.value}})} className="flex-1 bg-black border border-white/10 p-3 text-xs" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'mock' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                                    <h3 className="text-xl font-black uppercase flex items-center gap-2">
                                        <Database className="w-5 h-5 text-brand" /> Mock Data Management
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase text-zinc-500">Status:</span>
                                        {mockLoading ? (
                                            <span className="text-[10px] font-bold uppercase text-zinc-500">Checking...</span>
                                        ) : mockStatus ? (
                                            <span className="text-[10px] font-bold uppercase text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3" /> Installed</span>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase text-zinc-500">Not Installed</span>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white/5 p-6 border border-white/10 space-y-4">
                                    <p className="text-sm text-zinc-300 leading-relaxed">
                                        Mock data populates your platform with sample users, videos, and comments for testing purposes. It creates a separate schema <code>mock_data</code>.
                                    </p>
                                    
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => setSqlModal({ open: true, title: 'Install Mock Data', sql: generateMockDataSQL() })}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <Layers className="w-4 h-4" /> Install Mock Data
                                        </button>
                                        
                                        <button 
                                            onClick={() => setSqlModal({ open: true, title: 'Remove Mock Data', sql: removeMockDataSQL() })}
                                            className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" /> Remove Mock Data
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
