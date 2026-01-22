
export const generateFullSchema = () => {
  return `
-- FULL ISOLATED SCHEMA GENERATION
-- Run this in your Client's Supabase SQL Editor

BEGIN;

-- 0. WHITE LABEL SCHEMA & ADMINS
CREATE SCHEMA IF NOT EXISTS whitelabel;

CREATE TABLE IF NOT EXISTS whitelabel.admins (
  admin_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Secure whitelabel schema
ALTER TABLE whitelabel.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service Role Manage Admins" ON whitelabel.admins FOR ALL TO service_role USING (true);

-- Function to register admin (allows inserting into whitelabel schema from public API)
CREATE OR REPLACE FUNCTION public.register_whitelabel_admin(p_user_id uuid, p_email text)
RETURNS void AS $$
BEGIN
    INSERT INTO whitelabel.admins (user_id, email)
    VALUES (p_user_id, p_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. WHITE LABEL CORE TABLES
CREATE TABLE IF NOT EXISTS public.wl_clients (
  client_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_name text NOT NULL DEFAULT 'public',
  api_url text NOT NULL,
  anon_key text NOT NULL,
  service_role_key text NOT NULL,
  admin_username text NOT NULL,
  admin_password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Secure wl_clients (Only Service Role should access)
ALTER TABLE public.wl_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service Role Only" ON public.wl_clients FOR ALL TO service_role USING (true);

CREATE TABLE IF NOT EXISTS public.wl_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL DEFAULT 'My Platform',
  logo_url text,
  primary_color text DEFAULT '#ff007f',
  secondary_color text DEFAULT '#0a0a0c',
  background_color text DEFAULT '#050505',
  text_main_color text DEFAULT '#ffffff',
  footer_text text DEFAULT '© 2025 All Rights Reserved',
  terms_url text,
  privacy_url text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wl_streaming_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.wl_clients(client_id),
  provider text NOT NULL,
  config jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wl_theme (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wl_mock_data_tracking (
  client_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installed boolean DEFAULT false,
  installed_at timestamptz,
  removed_at timestamptz
);

-- RLS for WL Tables
ALTER TABLE public.wl_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Branding" ON public.wl_branding FOR SELECT USING (true);
CREATE POLICY "Admin Write Branding" ON public.wl_branding FOR ALL TO service_role USING (true);

ALTER TABLE public.wl_streaming_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Streaming" ON public.wl_streaming_settings FOR SELECT USING (true);
CREATE POLICY "Admin Write Streaming" ON public.wl_streaming_settings FOR ALL TO service_role USING (true);

ALTER TABLE public.wl_theme ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Theme" ON public.wl_theme FOR SELECT USING (true);
CREATE POLICY "Admin Write Theme" ON public.wl_theme FOR ALL TO service_role USING (true);

ALTER TABLE public.wl_mock_data_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Tracking" ON public.wl_mock_data_tracking FOR SELECT USING (true);
CREATE POLICY "Admin Write Tracking" ON public.wl_mock_data_tracking FOR ALL TO service_role USING (true);

-- 2. CORE TABLES (Standard Platform Schema)

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT,
    role TEXT DEFAULT 'user',
    theme_color TEXT DEFAULT '#ff007f',
    subscribers_count BIGINT DEFAULT 0,
    views_count BIGINT DEFAULT 0,
    dob DATE,
    country TEXT,
    age_group TEXT,
    social_links JSONB,
    display_preference TEXT DEFAULT 'alias',
    first_name TEXT,
    last_name TEXT,
    alias TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Videos
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    visibility TEXT DEFAULT 'public',
    status TEXT DEFAULT 'ready',
    category TEXT,
    hashtags TEXT[],
    rating TEXT DEFAULT 'U',
    views_count BIGINT DEFAULT 0,
    likes_count BIGINT DEFAULT 0,
    dislikes_count BIGINT DEFAULT 0,
    duration TEXT,
    processing_status TEXT DEFAULT 'ready',
    quality_urls JSONB,
    filmstrip_urls TEXT[],
    momentum_score FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Series
CREATE TABLE IF NOT EXISTS public.series (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    visibility TEXT DEFAULT 'public',
    rating TEXT DEFAULT 'U',
    status TEXT DEFAULT 'active',
    likes_count BIGINT DEFAULT 0,
    dislikes_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.series_episodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
    episode_number INT,
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    release_date TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS public.series_hero_banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    series_id UUID REFERENCES public.series(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT true,
    banner_image_url TEXT,
    headline TEXT,
    subtext TEXT,
    cta_text TEXT
);

CREATE TABLE IF NOT EXISTS public.series_schedule (
    series_id UUID REFERENCES public.series(id) ON DELETE CASCADE PRIMARY KEY,
    timezone TEXT,
    cadence TEXT,
    day_of_week INT,
    release_time TEXT
);

CREATE TABLE IF NOT EXISTS public.series_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, series_id)
);

-- Comments & Social
CREATE TABLE IF NOT EXISTS public.unified_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT, -- 'video' or 'community'
    target_id UUID, 
    content TEXT,
    parent_id UUID REFERENCES public.unified_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    like_count BIGINT DEFAULT 0,
    dislike_count BIGINT DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.unified_comment_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES public.unified_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscriber_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(subscriber_id, creator_id)
);

CREATE TABLE IF NOT EXISTS public.video_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT, -- 'like' or 'dislike'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(video_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.video_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ip_address TEXT,
    viewed_at TIMESTAMPTZ DEFAULT now()
);

-- Community Posts
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    attachment_url TEXT,
    attachment_type TEXT,
    likes_count BIGINT DEFAULT 0,
    comments_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- Playlists
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    visibility TEXT DEFAULT 'public',
    type TEXT DEFAULT 'custom',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(playlist_id, video_id)
);

-- Watch History
CREATE TABLE IF NOT EXISTS public.watch_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    watched_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, video_id)
);

-- Messaging
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID REFERENCES public.profiles(id),
    user2_id UUID REFERENCES public.profiles(id),
    last_message_at TIMESTAMPTZ DEFAULT now(),
    user1_visible BOOLEAN DEFAULT true,
    user2_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id),
    recipient_id UUID REFERENCES public.profiles(id),
    content TEXT,
    attachment_url TEXT,
    attachment_type TEXT,
    is_read BOOLEAN DEFAULT false,
    deleted_by_sender BOOLEAN DEFAULT false,
    deleted_by_recipient BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(blocker_id, blocked_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT,
    target_type TEXT,
    target_id UUID,
    comment_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Premieres
CREATE TABLE IF NOT EXISTS public.premieres (
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE PRIMARY KEY,
    start_time TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS public.premiere_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ip_address TEXT,
    viewed_at TIMESTAMPTZ DEFAULT now()
);

-- Live Chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    type TEXT DEFAULT 'text',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_mod BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    silenced_until TIMESTAMPTZ,
    silenced_by TEXT,
    kicked_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(video_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.channel_moderators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(creator_id, moderator_id)
);

-- Design Studio
CREATE TABLE IF NOT EXISTS public.design_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT,
    name TEXT,
    json_state JSONB,
    preview_url TEXT,
    related_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- VIEWS
CREATE OR REPLACE VIEW public.series_with_counts AS
SELECT s.*,
       (SELECT COUNT(*) FROM public.series_episodes se WHERE se.series_id = s.id) AS episode_count,
       (SELECT MIN(se.release_date) FROM public.series_episodes se WHERE se.series_id = s.id AND se.release_date > now()) AS next_release_date
FROM public.series s;

CREATE OR REPLACE VIEW public.chat_leaderboard_view AS
SELECT video_id, user_id, count(*) as points
FROM public.chat_messages
GROUP BY video_id, user_id
ORDER BY points DESC;

-- FUNCTIONS (Essential for Stats)
CREATE OR REPLACE FUNCTION public.increment_video_view(p_video_id uuid, p_ip_address text)
RETURNS void AS $$
BEGIN
    INSERT INTO public.video_views (video_id, ip_address) VALUES (p_video_id, p_ip_address);
    UPDATE public.videos SET views_count = views_count + 1 WHERE id = p_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_series_view(p_series_id uuid, p_ip_address text)
RETURNS void AS $$
BEGIN
    -- Just a stub for Series Views table if implemented, for now updates nothing or create series_views table
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ENABLE RLS FOR ALL
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiere_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_projects ENABLE ROW LEVEL SECURITY;

-- 4. BASIC POLICIES (Open Public Read, Owner Write)
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Owner Write Profiles" ON public.profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Public Read Videos" ON public.videos FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);
CREATE POLICY "Owner Write Videos" ON public.videos FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public Read Series" ON public.series FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);
CREATE POLICY "Owner Write Series" ON public.series FOR ALL USING (auth.uid() = user_id);

-- (Add simplified policies for all other tables as 'true' for select if public, owner for write)
CREATE POLICY "Public Read All" ON public.series_episodes FOR SELECT USING (true);
CREATE POLICY "Owner Write Episodes" ON public.series_episodes FOR ALL USING (EXISTS (SELECT 1 FROM public.series s WHERE s.id = series_id AND s.user_id = auth.uid()));

COMMIT;
`;
};

export const generateStoragePolicies = (bucketName: string) => {
    return `
-- STORAGE POLICIES FOR BUCKET: ${bucketName}
-- Run in Supabase SQL Editor

BEGIN;

INSERT INTO storage.buckets (id, name, public) VALUES ('${bucketName}', '${bucketName}', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-assets', 'profile-assets', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnail-assets', 'thumbnail-assets', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('design-assets', 'design-assets', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('design-exports', 'design-exports', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public Access ${bucketName}" ON storage.objects FOR SELECT USING ( bucket_id = '${bucketName}' );
CREATE POLICY "Auth Upload ${bucketName}" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = '${bucketName}' AND auth.role() = 'authenticated' );
CREATE POLICY "Owner Manage ${bucketName}" ON storage.objects FOR ALL USING ( bucket_id = '${bucketName}' AND auth.uid() = owner );

-- Repeat for standard buckets
CREATE POLICY "Public Read Videos" ON storage.objects FOR SELECT USING ( bucket_id = 'videos' );
CREATE POLICY "Auth Upload Videos" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'videos' AND auth.role() = 'authenticated' );

CREATE POLICY "Public Read Profiles" ON storage.objects FOR SELECT USING ( bucket_id = 'profile-assets' );
CREATE POLICY "Auth Upload Profiles" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'profile-assets' AND auth.role() = 'authenticated' );

COMMIT;
    `;
};

export const generateMockDataSQL = () => {
    return `
-- MOCK DATA INSTALLATION
-- Run this in your Supabase SQL Editor

BEGIN;

-- 1. Create Schema
CREATE SCHEMA IF NOT EXISTS mock_data;

-- 2. Mirror Table Structure (Simplified)
CREATE TABLE IF NOT EXISTS mock_data.profiles (LIKE public.profiles INCLUDING ALL);
CREATE TABLE IF NOT EXISTS mock_data.videos (LIKE public.videos INCLUDING ALL);
CREATE TABLE IF NOT EXISTS mock_data.unified_comments (LIKE public.unified_comments INCLUDING ALL);

-- 3. Insert Mock Data
INSERT INTO mock_data.profiles (id, username, full_name, avatar_url, subscribers_count) VALUES
('00000000-0000-0000-0000-000000000001', 'DemoCreator', 'Demo Creator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo', 1500),
('00000000-0000-0000-0000-000000000002', 'TravelVlogger', 'Travel Guy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Travel', 3200)
ON CONFLICT DO NOTHING;

INSERT INTO mock_data.videos (id, user_id, title, description, video_url, thumbnail_url, views_count, visibility, category, rating, status) VALUES
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Welcome to My Channel', 'This is a mock video for demonstration purposes.', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://picsum.photos/seed/video1/1280/720', 1200, 'public', 'Vlog', 'U', 'ready'),
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', 'Amazing Travel Vlog', 'Exploring the mountains.', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://picsum.photos/seed/video2/1280/720', 5400, 'public', 'Travel', 'U', 'ready')
ON CONFLICT DO NOTHING;

-- 4. Replace RPC to Union Data
CREATE OR REPLACE FUNCTION public.get_fair_feed(p_user_id uuid DEFAULT NULL, p_limit int DEFAULT 50)
RETURNS SETOF public.videos AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.videos
    WHERE visibility = 'public' AND status = 'ready'
    UNION ALL
    SELECT * FROM mock_data.videos
    WHERE visibility = 'public' AND status = 'ready'
    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update Tracking
INSERT INTO public.wl_mock_data_tracking (installed, installed_at) VALUES (true, now());

COMMIT;
`;
};

export const removeMockDataSQL = () => {
    return `
-- REMOVE MOCK DATA
-- Run this in your Supabase SQL Editor

BEGIN;

-- 1. Restore Original RPC (No Union)
CREATE OR REPLACE FUNCTION public.get_fair_feed(p_user_id uuid DEFAULT NULL, p_limit int DEFAULT 50)
RETURNS SETOF public.videos AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.videos
    WHERE visibility = 'public' AND status = 'ready'
    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop Schema
DROP SCHEMA IF EXISTS mock_data CASCADE;

-- 3. Update Tracking
UPDATE public.wl_mock_data_tracking SET installed = false, removed_at = now();

COMMIT;
`;
};
