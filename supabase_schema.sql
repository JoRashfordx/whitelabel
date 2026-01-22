
-- ================================================================================
-- VIDFREE PLAYLIST UPDATE
-- ================================================================================

BEGIN;

-- 1. Create Playlists Table
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    visibility TEXT CHECK (visibility IN ('public', 'private')) DEFAULT 'public',
    type TEXT CHECK (type IN ('custom', 'watch_later')) DEFAULT 'custom',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Playlist Items Table
CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(playlist_id, video_id) -- Prevent duplicate videos in same playlist
);

-- 3. RLS for Playlists
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Playlists are viewable by owner or if public" ON public.playlists
    FOR SELECT USING (
        auth.uid() = user_id OR visibility = 'public'
    );

CREATE POLICY "Users can create playlists" ON public.playlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists" ON public.playlists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists" ON public.playlists
    FOR DELETE USING (auth.uid() = user_id);

-- 4. RLS for Playlist Items
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

-- Allow reading items if user can read the playlist
CREATE POLICY "Playlist items viewable if playlist is viewable" ON public.playlist_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.playlists p 
            WHERE p.id = playlist_items.playlist_id 
            AND (p.user_id = auth.uid() OR p.visibility = 'public')
        )
    );

-- Allow inserting if user owns playlist
CREATE POLICY "Users can add items to own playlist" ON public.playlist_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.playlists p 
            WHERE p.id = playlist_items.playlist_id 
            AND p.user_id = auth.uid()
        )
    );

-- Allow deleting if user owns playlist
CREATE POLICY "Users can remove items from own playlist" ON public.playlist_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.playlists p 
            WHERE p.id = playlist_items.playlist_id 
            AND p.user_id = auth.uid()
        )
    );

COMMIT;
