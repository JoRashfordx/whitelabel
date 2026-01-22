
import React, { useState } from 'react';
import { Whitelabel_Page, Whitelabel_PageBlock } from '../types';
import { wlSchema } from '../services/supabase';
import { Save, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
    pages: Whitelabel_Page[];
    onUpdate: () => void;
}

const TEMPLATES: Record<string, any> = {
    hero: { headline: 'Welcome', subhead: 'Subtitle text', cta: 'Click Me' },
    video_grid: { title: 'Latest Videos', filter: 'recent' },
    text_block: { content: 'Enter text content here...' },
    features: { title: 'Features' }
};

export const Whitelabel_PageBuilder: React.FC<Props> = ({ pages, onUpdate }) => {
    const [selectedPageId, setSelectedPageId] = useState<string>(pages[0]?.id || '');
    const activePage = pages.find(p => p.id === selectedPageId);

    const saveBlocks = async (blocks: Whitelabel_PageBlock[]) => {
        if (!activePage) return;
        await wlSchema().from('pages').update({ blocks }).eq('id', activePage.id);
        onUpdate();
    };

    const addBlock = (type: string) => {
        if (!activePage) return;
        const newBlock = {
            id: `blk_${Date.now()}`,
            type,
            content: TEMPLATES[type],
            visible: true
        } as Whitelabel_PageBlock;
        saveBlocks([...activePage.blocks, newBlock]);
    };

    const updateBlockContent = (blockId: string, key: string, value: string) => {
        if (!activePage) return;
        const newBlocks = activePage.blocks.map(b => 
            b.id === blockId ? { ...b, content: { ...b.content, [key]: value } } : b
        );
        saveBlocks(newBlocks);
    };

    const deleteBlock = (blockId: string) => {
        if (!activePage) return;
        saveBlocks(activePage.blocks.filter(b => b.id !== blockId));
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            <div className="w-64 flex flex-col gap-4">
                <select 
                    className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-white"
                    value={selectedPageId}
                    onChange={e => setSelectedPageId(e.target.value)}
                >
                    {pages.map(p => <option key={p.id} value={p.id}>{p.title} ({p.slug})</option>)}
                </select>
                
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">Add Block</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.keys(TEMPLATES).map(type => (
                            <button key={type} onClick={() => addBlock(type)} className="p-2 bg-black hover:bg-zinc-800 text-xs rounded border border-zinc-800 capitalize">
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded overflow-y-auto p-8">
                {activePage ? (
                    <div className="space-y-4">
                        {activePage.blocks.map((block, idx) => (
                            <div key={block.id} className="bg-black border border-zinc-800 p-4 rounded relative group">
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => deleteBlock(block.id)} className="p-1 text-red-500 hover:text-white"><Trash2 size={14}/></button>
                                </div>
                                <h4 className="text-xs font-bold text-blue-500 uppercase mb-2">{block.type}</h4>
                                <div className="space-y-2">
                                    {Object.keys(block.content).map(key => (
                                        <div key={key}>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase">{key}</label>
                                            <input 
                                                className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-sm text-white"
                                                value={block.content[key]}
                                                onChange={e => updateBlockContent(block.id, key, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-zinc-500 mt-20">Select a page to edit</div>
                )}
            </div>
        </div>
    );
};
