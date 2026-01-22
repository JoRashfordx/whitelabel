
import React, { useEffect, useState } from 'react';
import { wlSchema } from '../services/supabase';
import { Whitelabel_Config, Whitelabel_Page } from '../types';
import { useAuth } from '../hooks/useAuth';
import { User, LogIn } from 'lucide-react';

interface Props {
    config: Whitelabel_Config;
}

export const Whitelabel_PublicRouter: React.FC<Props> = ({ config }) => {
    const [page, setPage] = useState<Whitelabel_Page | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        // Apply styling
        document.documentElement.style.setProperty('--primary', config.primary_color);
        document.documentElement.style.setProperty('--bg-color', config.bg_color);
        document.documentElement.style.setProperty('--text-color', config.text_color);
        document.title = config.platform_name;

        // Load Homepage
        wlSchema().from('pages').select('*').eq('is_home', true).single().then(({ data }) => {
            if (data) setPage(data);
        });
    }, [config]);

    if (!page) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: config.bg_color, color: config.text_color }}>
            {/* Header */}
            <header className="px-6 py-4 flex justify-between items-center border-b border-white/10 sticky top-0 bg-opacity-90 backdrop-blur z-50" style={{ backgroundColor: config.bg_color }}>
                <div className="text-xl font-bold">{config.platform_name}</div>
                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
                                {user.username?.[0] || <User size={16}/>}
                            </div>
                            {user.role === 'admin' && (
                                <a href="/admin" className="text-xs bg-primary px-3 py-1 rounded font-bold">Admin</a>
                            )}
                        </div>
                    ) : (
                        <button className="flex items-center gap-2 text-sm font-bold bg-white/10 px-4 py-2 rounded">
                            <LogIn size={16} /> Sign In
                        </button>
                    )}
                </div>
            </header>

            {/* Blocks */}
            <main className="flex-1">
                {page.blocks.map(block => (
                    <div key={block.id}>
                        {block.type === 'hero' && (
                            <section className="py-32 px-6 text-center bg-gradient-to-b from-blue-900/20 to-transparent">
                                <h1 className="text-5xl font-black mb-4">{block.content.headline}</h1>
                                <p className="text-xl opacity-70 mb-8">{block.content.subhead}</p>
                                <button className="bg-primary text-white px-8 py-3 rounded-full font-bold">{block.content.cta}</button>
                            </section>
                        )}
                        {block.type === 'video_grid' && (
                            <section className="py-20 px-6 max-w-7xl mx-auto">
                                <h2 className="text-2xl font-bold mb-8">{block.content.title}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[1,2,3].map(i => (
                                        <div key={i} className="aspect-video bg-zinc-800 rounded"></div>
                                    ))}
                                </div>
                            </section>
                        )}
                        {block.type === 'text_block' && (
                            <section className="py-20 px-6 max-w-4xl mx-auto text-lg leading-relaxed opacity-80">
                                {block.content.content}
                            </section>
                        )}
                    </div>
                ))}
            </main>

            {/* Footer */}
            <footer className="py-10 px-6 border-t border-white/10 text-center text-sm opacity-60">
                {config.footer_text}
            </footer>
        </div>
    );
};
