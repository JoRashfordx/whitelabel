
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Series, User, VideoRating } from '../types';
import SeriesCard from './SeriesCard';
import { Loader2, Play, Flame, Layers, Info, Star } from 'lucide-react';

interface SeriesFeedViewProps {
  onSeriesSelect: (seriesId: string) => void;
  allowedRatings: VideoRating[];
  currentUser: User | null;
}

const SeriesFeedView: React.FC<SeriesFeedViewProps> = ({ onSeriesSelect, allowedRatings, currentUser }) => {
  const [heroSeries, setHeroSeries] = useState<Series | null>(null);
  const [featuredSeries, setFeaturedSeries] = useState<Series[]>([]);
  const [hotSeries, setHotSeries] = useState<Series[]>([]);
  const [feedSeries, setFeedSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeries();
    // Simulate "Hot" updates (re-fetch) every 30 mins as requested
    const interval = setInterval(fetchSeries, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [allowedRatings, currentUser?.id]);

  const fetchSeries = async () => {
    setLoading(true);
    try {
      // 1. Fetch Pro Featured Series (RPC)
      const { data: featuredData } = await supabase.rpc('get_featured_series', { p_limit: 10 });
      setFeaturedSeries(featuredData || []);

      // 2. Fetch active public series
      const { data: publicData, error } = await supabase
        .from('series_with_counts')
        .select('*')
        .eq('status', 'active')
        .eq('visibility', 'public')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      let allData = publicData || [];

      // If logged in, fetch own series to ensure they appear even if restricted/private
      if (currentUser) {
         const { data: ownData } = await supabase
            .from('series_with_counts')
            .select('*')
            .eq('user_id', currentUser.id);
         
         if (ownData) {
             // Merge and deduplicate
             const existingIds = new Set(allData.map((s: Series) => s.id));
             const newOwn = ownData.filter((s: Series) => !existingIds.has(s.id));
             allData = [...newOwn, ...allData];
         }
      }

      // STRICT RESTRICTION FILTER
      // Rule: Allowed Rating OR Author Override
      const safeData = allData.filter((s: Series) => 
        allowedRatings.includes(s.rating as VideoRating) || s.user_id === currentUser?.id
      );

      if (safeData.length > 0) {
        // Setup Hero (Most recent or specific logic)
        setHeroSeries(safeData[0]);
        
        // Setup Hot (Simulated by picking top 5 active)
        setHotSeries(safeData.slice(0, 5));
        
        // Setup Feed (Rest)
        setFeedSeries(safeData);
      } else {
        setHeroSeries(null);
        setHotSeries([]);
        setFeedSeries([]);
      }

    } catch (err) {
      console.error("Series Feed Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-brand animate-spin" />
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Loading Series...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-500">
      
      {/* HERO SECTION */}
      {heroSeries && (
        <div className="relative w-full h-[60vh] bg-black border-b border-white/5 overflow-hidden group">
          <div className="absolute inset-0">
            <img 
              src={heroSeries.thumbnail_url || ''} 
              alt={heroSeries.title} 
              className="w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity duration-1000 scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          </div>

          <div className="absolute inset-0 flex items-center max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full items-center">
               <div className="hidden md:block aspect-[2/3] max-h-[400px] w-auto border border-white/10 shadow-2xl rotate-[-2deg] hover:rotate-0 transition-transform duration-500 bg-zinc-900">
                  <img src={heroSeries.thumbnail_url || ''} className="w-full h-full object-cover" />
               </div>
               
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                     <span className="px-3 py-1 bg-brand text-white text-[9px] font-black uppercase tracking-widest">Featured Series</span>
                     <div className={`px-2 py-0.5 border text-[9px] font-black uppercase ${
                        heroSeries.rating === 'R' ? 'border-rose-500 text-rose-500' : 
                        heroSeries.rating === 'PG' ? 'border-amber-500 text-amber-500' : 
                        'border-emerald-500 text-emerald-500'
                     }`}>
                        {heroSeries.rating}
                     </div>
                  </div>
                  
                  <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none line-clamp-2">
                    {heroSeries.title}
                  </h1>
                  
                  <p className="text-sm text-zinc-300 font-light leading-relaxed line-clamp-3 max-w-lg">
                    {heroSeries.description || "Start watching this series today on VidFree."}
                  </p>

                  <button 
                    onClick={() => onSeriesSelect(heroSeries.id)}
                    className="flex items-center gap-3 bg-white text-black px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,0,127,0.4)]"
                  >
                    <Play className="w-4 h-4 fill-current" /> Watch Now
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1920px] mx-auto px-8 space-y-16 py-12">
        
        {/* PRO FEATURED SECTION */}
        {featuredSeries.length > 0 && (
            <section className="space-y-6">
                <div className="border-b border-white/5 pb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-brand fill-brand" />
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Featured Creators</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {featuredSeries.map(series => (
                        <SeriesCard 
                            key={series.id} 
                            series={series} 
                            onClick={() => onSeriesSelect(series.id)} 
                            isOwner={series.user_id === currentUser?.id}
                        />
                    ))}
                </div>
            </section>
        )}

        {/* HOT RIGHT NOW */}
        {hotSeries.length > 0 && (
          <section className="space-y-6">
             <div className="border-b border-white/5 pb-4">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Hot Right Now</h2>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {hotSeries.map(series => (
                   <SeriesCard 
                     key={series.id} 
                     series={series} 
                     onClick={() => onSeriesSelect(series.id)} 
                     isOwner={series.user_id === currentUser?.id}
                   />
                ))}
             </div>
          </section>
        )}

        {/* ALL SERIES FEED */}
        <section className="space-y-6">
           <div className="border-b border-white/5 pb-4">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">All Series</h2>
           </div>

           {feedSeries.length === 0 ? (
             <div className="py-20 text-center border-2 border-dashed border-white/5 text-zinc-600">
               <Info className="w-10 h-10 mx-auto mb-4 opacity-50" />
               <p className="text-[10px] font-black uppercase tracking-widest">No series available</p>
             </div>
           ) : (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {feedSeries.map(series => (
                   <SeriesCard 
                     key={series.id} 
                     series={series} 
                     onClick={() => onSeriesSelect(series.id)} 
                     isOwner={series.user_id === currentUser?.id}
                   />
                ))}
             </div>
           )}
        </section>

      </div>
    </div>
  );
};

export default SeriesFeedView;
