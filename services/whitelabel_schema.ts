
export const generateWhitelabelSchema = () => `
-- WHITELABEL SCHEMA MIGRATION
-- Run this to initialize the platform

BEGIN;

CREATE SCHEMA IF NOT EXISTS whitelabel;

-- 1. CONFIGURATION
CREATE TABLE IF NOT EXISTS whitelabel.config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_name TEXT DEFAULT 'My Platform',
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3b82f6',
    secondary_color TEXT DEFAULT '#1e293b',
    text_color TEXT DEFAULT '#ffffff',
    bg_color TEXT DEFAULT '#0f172a',
    font_family TEXT DEFAULT 'Inter, sans-serif',
    custom_css TEXT,
    streaming_provider TEXT,
    streaming_config JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ADMINS
CREATE TABLE IF NOT EXISTS whitelabel.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'super_admin',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PAGES (For Visual Builder)
CREATE TABLE IF NOT EXISTS whitelabel.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT,
    blocks JSONB DEFAULT '[]'::jsonb, -- Stores the layout components
    is_home BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. MEDIA / ASSETS
CREATE TABLE IF NOT EXISTS whitelabel.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id UUID,
    url TEXT NOT NULL,
    type TEXT, -- image, video
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. VIDEOS (The Content)
CREATE TABLE IF NOT EXISTS whitelabel.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL, -- Streaming URL
    thumbnail TEXT,
    status TEXT DEFAULT 'ready',
    views BIGINT DEFAULT 0,
    meta_tags JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. MENUS
CREATE TABLE IF NOT EXISTS whitelabel.menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb
);

-- SECURITY & RLS
ALTER TABLE whitelabel.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelabel.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelabel.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelabel.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelabel.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelabel.menus ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Config: Public Read, Admin Write
CREATE POLICY "Public Read Config" ON whitelabel.config FOR SELECT USING (true);
CREATE POLICY "Admin Write Config" ON whitelabel.config FOR ALL USING (
    EXISTS (SELECT 1 FROM whitelabel.admins WHERE user_id = auth.uid())
);

-- Pages: Public Read Published, Admin Write All
CREATE POLICY "Public Read Pages" ON whitelabel.pages FOR SELECT USING (is_published = true);
CREATE POLICY "Admin Read All Pages" ON whitelabel.pages FOR SELECT USING (
    EXISTS (SELECT 1 FROM whitelabel.admins WHERE user_id = auth.uid())
);
CREATE POLICY "Admin Write Pages" ON whitelabel.pages FOR ALL USING (
    EXISTS (SELECT 1 FROM whitelabel.admins WHERE user_id = auth.uid())
);

-- Admins: Service Role Manage, Admin Read Self
CREATE POLICY "Service Manage Admins" ON whitelabel.admins FOR ALL TO service_role USING (true);
CREATE POLICY "Admin Read Self" ON whitelabel.admins FOR SELECT USING (user_id = auth.uid());

-- Videos: Public Read, Admin Write
CREATE POLICY "Public Read Videos" ON whitelabel.videos FOR SELECT USING (status = 'ready');
CREATE POLICY "Admin Write Videos" ON whitelabel.videos FOR ALL USING (
    EXISTS (SELECT 1 FROM whitelabel.admins WHERE user_id = auth.uid())
);

-- INITIAL SEED
INSERT INTO whitelabel.config (site_name) SELECT 'New Platform' WHERE NOT EXISTS (SELECT 1 FROM whitelabel.config);

-- FUNCTIONS
CREATE OR REPLACE FUNCTION whitelabel.create_admin_user(p_email TEXT, p_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO whitelabel.admins (email, user_id) VALUES (p_email, p_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
`;

export const generateMockData = () => `
INSERT INTO whitelabel.pages (slug, title, is_home, is_published, blocks) VALUES 
(
    '/', 
    'Home', 
    true, 
    true, 
    '[
        {"id": "h1", "type": "header", "content": {"title": "My Brand"}, "styles": {}},
        {"id": "hero1", "type": "hero", "content": {"headline": "Welcome to the Future", "subhead": "Streaming Redefined"}, "styles": {"height": "60vh", "bg": "#000"}},
        {"id": "grid1", "type": "video_grid", "content": {"title": "Latest Uploads"}, "styles": {}},
        {"id": "f1", "type": "footer", "content": {"text": "© 2025 Whitelabel Inc"}, "styles": {}}
    ]'::jsonb
);
`;
