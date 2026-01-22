
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
    const client = getSupabase();
    
    // 1. Try RPC (Fastest if function exists)
    const { data, error } = await client.rpc('check_install_status');
    
    if (!error) {
        const isInstalled = data === true;
        if (isInstalled) console.log("System Status: INSTALLED (via RPC)");
        return isInstalled;
    }

    console.warn("Install check via RPC failed, trying direct select...", error.message);

    // 2. Fallback: Direct Select (In case RPC is missing but table exists)
    // Note: This requires 'whitelabel' schema to be exposed in API settings, 
    // which might fail if user hasn't done that step yet.
    const { data: tableData, error: tableError } = await client
        .schema('whitelabel')
        .from('install_state')
        .select('installed')
        .eq('id', true)
        .maybeSingle();

    if (!tableError && tableData) {
        const isInstalled = tableData.installed === true;
        if (isInstalled) console.log("System Status: INSTALLED (via Table)");
        return isInstalled;
    }

    console.warn("Install check via Table failed:", tableError?.message);
    return false;

  } catch (e) {
    console.error("Install check failed critically:", e);
    return false;
  }
};
