
-- ================================================================================
-- VIDFREE SECURITY FIX: ENABLE RLS
-- ================================================================================
-- Run this script in the Supabase SQL Editor to resolve "RLS Disabled in Public" warnings.
-- ================================================================================

BEGIN;

-- 1. Secure 'watch_history'
-- Used in HistoryView and WatchView
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own watch history" ON public.watch_history;
CREATE POLICY "Users can view own watch history" ON public.watch_history
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own watch history" ON public.watch_history;
CREATE POLICY "Users can insert own watch history" ON public.watch_history
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own watch history" ON public.watch_history;
CREATE POLICY "Users can delete own watch history" ON public.watch_history
FOR DELETE USING (auth.uid() = user_id);


-- 2. Secure 'user_wallets'
-- Legacy/Future finance table
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallets;
CREATE POLICY "Users can view own wallet" ON public.user_wallets
FOR SELECT USING (auth.uid() = user_id);


-- 3. Secure 'platform_wallet'
-- System table: Restrict to service_role only
ALTER TABLE public.platform_wallet ENABLE ROW LEVEL SECURITY;


-- 4. Secure 'admin_wallet'
-- System table: Restrict to service_role only
ALTER TABLE public.admin_wallet ENABLE ROW LEVEL SECURITY;


-- 5. Secure 'roles'
-- System/RBAC table: Restrict to service_role only
-- (Assuming frontend RBAC is handled via profile metadata or hardcoded checks as seen in Navbar.tsx)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

COMMIT;
