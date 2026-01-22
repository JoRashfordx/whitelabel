
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

// Helper for safe environment variable access
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  return undefined;
};

export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;

  // Priority: 1. LocalStorage (Installer), 2. Env Vars
  const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('wl_supabase_url') : null;
  const storedKey = typeof localStorage !== 'undefined' ? localStorage.getItem('wl_supabase_anon') : null;

  const envUrl = getEnv('VITE_SUPABASE_URL');
  const envKey = getEnv('VITE_SUPABASE_ANON_KEY');

  const url = storedUrl || envUrl;
  const key = storedKey || envKey;

  if (url && key) {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  }

  // Fallback for pre-install state
  return createClient('https://placeholder.supabase.co', 'placeholder');
};

export const supabase = getSupabase();

export const isConfigured = () => {
  const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('wl_supabase_url') : null;
  const envUrl = getEnv('VITE_SUPABASE_URL');
  return !!(storedUrl || envUrl);
};

export const wlSchema = () => getSupabase().schema('whitelabel');

// SINGLE SOURCE OF TRUTH FOR INSTALL STATE
export const checkIsInstalled = async (): Promise<boolean> => {
  try {
    if (!isConfigured()) return false;
    
    // Use RPC to bypass schema visibility issues
    const { data, error } = await getSupabase().rpc('check_install_status');
    
    if (error) {
      console.warn("Install check via RPC failed:", error.message);
      // Fallback: If RPC missing, we are definitely not installed or schema is missing
      return false;
    }

    const isInstalled = data === true;
    if (isInstalled) console.log("System Status: INSTALLED");
    return isInstalled;
  } catch (e) {
    console.error("Install check failed critically:", e);
    return false;
  }
};
