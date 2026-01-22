
export const generateMigrationSQL = () => `
-- FULL WHITELABEL ISOLATION & INSTALL FIX
-- Run in Supabase SQL Editor

BEGIN;

CREATE SCHEMA IF NOT EXISTS whitelabel;

-- 1. Install State (Critical for routing)
CREATE TABLE IF NOT EXISTS whitelabel.install_state (
  id boolean PRIMARY KEY DEFAULT true,
  installed boolean NOT NULL DEFAULT false,
  installed_at timestamptz DEFAULT now(),
  admin_user_id uuid NOT NULL,
  platform_name text,
  CONSTRAINT single_row CHECK (id)
);

-- 2. Config
CREATE TABLE IF NOT EXISTS whitelabel.config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name TEXT DEFAULT 'My Platform',
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3b82f6',
    secondary_color TEXT DEFAULT '#1e293b',
    bg_color TEXT DEFAULT '#0f172a',
    text_color TEXT DEFAULT '#ffffff',
    custom_css TEXT,
    footer_text TEXT DEFAULT '© 2025 All Rights Reserved',
    nav_links JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Profiles (Extends Auth, Isolated)
CREATE TABLE IF NOT EXISTS whitelabel.profiles (
    id UUID PRIMARY KEY, -- Matches auth.users.id
    username TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Admins (RBAC)
CREATE TABLE IF NOT EXISTS whitelabel.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES whitelabel.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Pages (CMS)
CREATE TABLE IF NOT EXISTS whitelabel.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT,
    description TEXT,
    blocks JSONB DEFAULT '[]'::jsonb,
    is_home BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Videos
CREATE TABLE IF NOT EXISTS whitelabel.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES whitelabel.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INT DEFAULT 0,
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    status TEXT DEFAULT 'ready',
    visibility TEXT DEFAULT 'public',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Comments
CREATE TABLE IF NOT EXISTS whitelabel.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES whitelabel.videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES whitelabel.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS POLICIES --

ALTER TABLE whitelabel.install_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Install State" ON whitelabel.install_state;
CREATE POLICY "Public Read Install State" ON whitelabel.install_state FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service Write Install State" ON whitelabel.install_state;
CREATE POLICY "Service Write Install State" ON whitelabel.install_state FOR ALL TO service_role USING (true);

ALTER TABLE whitelabel.config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Config" ON whitelabel.config FOR SELECT USING (true);
CREATE POLICY "Admin Write Config" ON whitelabel.config FOR ALL USING (
    EXISTS (SELECT 1 FROM whitelabel.admins WHERE user_id = auth.uid())
);

ALTER TABLE whitelabel.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Profiles" ON whitelabel.profiles FOR SELECT USING (true);
CREATE POLICY "Self Update Profiles" ON whitelabel.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service Manage Profiles" ON whitelabel.profiles FOR ALL TO service_role USING (true);

ALTER TABLE whitelabel.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Admins" ON whitelabel.admins FOR SELECT USING (true);
CREATE POLICY "Service Manage Admins" ON whitelabel.admins FOR ALL TO service_role USING (true);

ALTER TABLE whitelabel.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Pages" ON whitelabel.pages FOR SELECT USING (
    is_published = true OR EXISTS (SELECT 1 FROM whitelabel.admins WHERE user_id = auth.uid())
);
CREATE POLICY "Admin Manage Pages" ON whitelabel.pages FOR ALL USING (
    EXISTS (SELECT 1 FROM whitelabel.admins WHERE user_id = auth.uid())
);

ALTER TABLE whitelabel.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Videos" ON whitelabel.videos FOR SELECT USING (
    visibility = 'public' OR auth.uid() = user_id OR EXISTS (SELECT 1 FROM whitelabel.admins WHERE user_id = auth.uid())
);
CREATE POLICY "Creator Manage Videos" ON whitelabel.videos FOR ALL USING (auth.uid() = user_id);

ALTER TABLE whitelabel.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Comments" ON whitelabel.comments FOR SELECT USING (true);
CREATE POLICY "User Create Comments" ON whitelabel.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- TRIGGERS & FUNCTIONS --

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION whitelabel.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO whitelabel.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE whitelabel.handle_new_user();

-- INSTALLATION HELPER FUNCTIONS (Bypass Schema Exposure) --

-- 1. Check Install Status (Publicly Accessible)
CREATE OR REPLACE FUNCTION public.check_install_status()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_installed boolean;
BEGIN
    SELECT installed INTO is_installed FROM whitelabel.install_state WHERE id = true;
    RETURN COALESCE(is_installed, false);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 2. Complete Installation (Admin/Service Role Only)
CREATE OR REPLACE FUNCTION public.complete_install(
  p_admin_email text,
  p_platform_name text
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Look up user ID from Auth (Secure)
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_admin_email;
  
  IF v_user_id IS NOT NULL THEN
    -- Upsert Profile
    INSERT INTO whitelabel.profiles (id, username, role) 
    VALUES (v_user_id, 'admin', 'admin') 
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
    
    -- Upsert Admin
    INSERT INTO whitelabel.admins (user_id, email)
    VALUES (v_user_id, p_admin_email)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Set Install State
    INSERT INTO whitelabel.install_state (id, installed, admin_user_id, platform_name)
    VALUES (true, true, v_user_id, p_platform_name)
    ON CONFLICT (id) DO UPDATE SET 
        installed = true,
        admin_user_id = EXCLUDED.admin_user_id,
        platform_name = EXCLUDED.platform_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- INITIAL SEED --
INSERT INTO whitelabel.config (platform_name) VALUES ('Whitelabel Video') ON CONFLICT DO NOTHING;

COMMIT;
`;

export const generateMockDataSQL = () => `
INSERT INTO whitelabel.pages (slug, title, is_home, blocks) VALUES
(
  '/', 'Home', true, 
  '[
    {"id":"h1","type":"hero","content":{"headline":"Welcome to Your Platform","subhead":"Fully customizable video streaming solution.","cta":"Start Watching"},"visible":true},
    {"id":"g1","type":"video_grid","content":{"title":"Trending Now","filter":"trending"},"visible":true},
    {"id":"f1","type":"features","content":{},"visible":true}
  ]'::jsonb
);
`;
