
import React from 'react';
import { PageBlock } from '../../types';
import { Play } from 'lucide-react';

interface Props {
  blocks: PageBlock[];
}

export const BlockRenderer: React.FC<Props> = ({ blocks }) => {
  return (
    <div className="w-full">
      {blocks.map(block => {
        if (!block.visible) return null;

        switch (block.type) {
          case 'hero':
            return (
              <section key={block.id} className="relative h-[60vh] flex items-center justify-center text-center px-4 bg-gradient-to-br from-blue-900 to-black">
                <div className="max-w-4xl space-y-6 relative z-10">
                  <h1 className="text-5xl md:text-7xl font-black text-white leading-tight">{block.content.headline}</h1>
                  <p className="text-xl text-blue-100">{block.content.subhead}</p>
                  <button className="bg-white text-blue-900 px-8 py-4 font-bold rounded-full hover:bg-blue-50 transition-transform hover:scale-105">
                    {block.content.cta}
                  </button>
                </div>
              </section>
            );

          case 'video_grid':
            return (
              <section key={block.id} className="py-20 px-6 max-w-7xl mx-auto">
                <h2 className="text-3xl font-bold mb-10 text-white">{block.content.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="group cursor-pointer">
                      <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden relative mb-3">
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <Play className="w-12 h-12 text-white fill-current" />
                        </div>
                      </div>
                      <h3 className="font-bold text-white group-hover:text-blue-400">Sample Video {i}</h3>
                      <p className="text-sm text-zinc-400">1.2K views • 2 days ago</p>
                    </div>
                  ))}
                </div>
              </section>
            );

          case 'text_block':
            return (
              <section key={block.id} className="py-12 px-6 max-w-4xl mx-auto text-zinc-300 leading-relaxed">
                {block.content.content}
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
};
