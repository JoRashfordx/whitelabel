
import React from 'react';
import { Series } from '../types';
import { Layers, Calendar, Lock, EyeOff, Globe, Trash2 } from 'lucide-react';
import Tooltip from './Tooltip';

interface SeriesCardProps {
  series: Series;
  onClick: () => void;
  isOwner?: boolean;
  onDelete?: () => void;
}

const SeriesCard: React.FC<SeriesCardProps> = ({ series, onClick, isOwner, onDelete }) => {
  const nextRelease = (series as any).next_release_date;
  const epCount = (series as any).episode_count || 0;

  const ratingColor = 
    series.rating === 'R' ? 'bg-rose-600 border-rose-600 text-white' :
    series.rating === 'PG' ? 'bg-amber-500 border-amber-500 text-black' :
    'bg-emerald-500 border-emerald-500 text-white';

  return (
    <div 
      onClick={onClick}
      className="vidfree-seriescard group cursor-pointer bg-[#0a0a0a] border border-white/5 hover:border-brand transition-all duration-300 relative overflow-hidden flex flex-col h-full"
    >
      <div className="vidfree-seriescard__thumbnail aspect-[2/3] relative bg-black shrink-0">
        {series.thumbnail_url ? (
          <img src={series.thumbnail_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-700">
            <Layers className="w-8 h-8 mb-2" />
            <span className="text-[8px] font-black uppercase tracking-widest">No Cover</span>
          </div>
        )}
        
        {isOwner && (
          <div className="absolute top-2 right-2 flex flex-col gap-2 items-end z-10">
            <div className="px-1.5 py-0.5 bg-black/80 backdrop-blur-sm border border-white/10 text-white flex items-center gap-1">
               {series.visibility === 'private' && <Lock size={8} className="text-rose-500" />}
               {series.visibility === 'unlisted' && <EyeOff size={8} className="text-amber-500" />}
               {series.visibility === 'public' && <Globe size={8} className="text-emerald-500" />}
            </div>
            {onDelete && (
                <Tooltip content="Delete Series">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all shadow-lg backdrop-blur-md"
                    >
                        <Trash2 size={10} />
                    </button>
                </Tooltip>
            )}
          </div>
        )}

        <div className={`absolute top-1 left-1 px-1.5 py-0.5 text-[8px] font-black uppercase border shadow-lg ${ratingColor}`}>
          {series.rating}
        </div>

        <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black to-transparent pt-4">
           <div className="flex justify-between items-end">
                <div className="bg-brand text-white px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest shadow-lg">
                    {epCount} EPS
                </div>
                {series.status === 'draft' && (
                    <div className="bg-zinc-700 text-white px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest shadow-lg">
                    DRAFT
                    </div>
                )}
           </div>
        </div>
      </div>

      <div className="vidfree-seriescard__meta p-3 space-y-1 bg-[#050505] flex-1 flex flex-col">
        <h3 className="text-xs font-black text-white uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-brand transition-colors mb-auto">
          {series.title}
        </h3>
        <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1 pt-2 border-t border-white/5 mt-2">
           <Calendar size={10} />
           {nextRelease ? `Next: ${new Date(nextRelease).toLocaleDateString(undefined, {month:'short', day:'numeric'})}` : 'Complete'}
        </div>
      </div>
    </div>
  );
};

export default SeriesCard;
