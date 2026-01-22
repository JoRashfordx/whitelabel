import React, { useState } from 'react';
import { PageBlock, BlockType } from '../../types';
import { GripVertical, Trash2, Plus, ArrowUp, ArrowDown, Save } from 'lucide-react';

interface PageBuilderProps {
  blocks: PageBlock[];
  onChange: (blocks: PageBlock[]) => void;
  onSave: () => void;
}

const BLOCK_TEMPLATES: Record<BlockType, any> = {
  hero: { headline: 'New Hero', subhead: 'Subtitle', cta: 'Click Me' },
  video_grid: { title: 'Latest Videos', count: 4 },
  text_block: { content: 'Rich text content goes here...' },
  cta: { text: 'Call to Action', link: '#' },
  video_player: { videoId: '' },
  features: { title: 'Features' }
};

export const PageBuilder: React.FC<PageBuilderProps> = ({ blocks, onChange, onSave }) => {
  const [activeBlock, setActiveBlock] = useState<string | null>(null);

  const addBlock = (type: BlockType) => {
    const newBlock: PageBlock = {
      id: `blk_${Date.now()}`,
      type,
      content: { ...BLOCK_TEMPLATES[type] },
      visible: true
    };
    onChange([...blocks, newBlock]);
    setActiveBlock(newBlock.id);
  };

  const updateBlock = (id: string, content: any) => {
    onChange(blocks.map(b => b.id === id ? { ...b, content: { ...b.content, ...content } } : b));
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const newBlocks = [...blocks];
    if (idx + dir < 0 || idx + dir >= newBlocks.length) return;
    [newBlocks[idx], newBlocks[idx + dir]] = [newBlocks[idx + dir], newBlocks[idx]];
    onChange(newBlocks);
  };

  const deleteBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
    if (activeBlock === id) setActiveBlock(null);
  };

  return (
    <div className="flex h-[calc(100vh-100px)] border border-zinc-800 rounded-lg overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-bold text-white mb-4">Components</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(BLOCK_TEMPLATES).map((type) => (
              <button 
                key={type}
                onClick={() => addBlock(type as BlockType)}
                className="p-3 bg-black hover:bg-zinc-800 border border-zinc-700 rounded text-xs font-bold text-zinc-300 capitalize flex flex-col items-center gap-2 transition-colors"
              >
                <Plus size={16} /> {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-bold text-white mb-4">Structure</h3>
          <div className="space-y-2">
            {blocks.map((block, idx) => (
              <div 
                key={block.id}
                onClick={() => setActiveBlock(block.id)}
                className={`p-3 rounded border cursor-pointer flex items-center gap-3 group ${activeBlock === block.id ? 'bg-blue-900/30 border-blue-500' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}
              >
                <GripVertical size={16} className="text-zinc-600" />
                <span className="text-sm font-medium text-white flex-1 capitalize">{block.type.replace('_', ' ')}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, -1); }} className="p-1 hover:text-white text-zinc-500"><ArrowUp size={12}/></button>
                  <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, 1); }} className="p-1 hover:text-white text-zinc-500"><ArrowDown size={12}/></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} className="p-1 hover:text-red-500 text-zinc-500"><Trash2 size={12}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <button onClick={onSave} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded flex items-center justify-center gap-2">
            <Save size={18} /> Save Layout
          </button>
        </div>
      </div>

      {/* Editor / Preview Area */}
      <div className="flex-1 bg-zinc-950 overflow-y-auto p-8">
        {activeBlock ? (
          <div className="max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 capitalize">Edit {blocks.find(b => b.id === activeBlock)?.type.replace('_', ' ')}</h3>
            {/* Simple Dynamic Form Generator based on content keys */}
            <div className="space-y-4">
              {Object.entries(blocks.find(b => b.id === activeBlock)?.content || {}).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{key}</label>
                  {key === 'count' || typeof value === 'number' ? (
                    <input 
                      type="number" 
                      className="w-full bg-black border border-zinc-700 p-2 rounded text-white"
                      value={value as number}
                      onChange={(e) => updateBlock(activeBlock, { [key]: parseInt(e.target.value) })}
                    />
                  ) : (
                    <input 
                      type="text" 
                      className="w-full bg-black border border-zinc-700 p-2 rounded text-white"
                      value={value as string}
                      onChange={(e) => updateBlock(activeBlock, { [key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-600">
            Select a block to edit its properties
          </div>
        )}
      </div>
    </div>
  );
};