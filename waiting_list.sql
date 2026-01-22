
-- Execute this SQL in your Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS public.waiting_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert email (for landing page)
CREATE POLICY "Enable insert for anon" ON public.waiting_list
    FOR INSERT TO anon WITH CHECK (true);

-- Allow service_role (dashboard) to read
CREATE POLICY "Enable read for service_role" ON public.waiting_list
    FOR SELECT TO service_role USING (true);
