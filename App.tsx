
import React, { useEffect, useState } from 'react';
import { Whitelabel_InstallWizard } from './components/Whitelabel_InstallWizard';
import { Whitelabel_AdminPanel } from './components/Whitelabel_AdminPanel';
import { Whitelabel_PublicRouter } from './components/Whitelabel_PublicRouter';
import { checkIsInstalled, isConfigured, wlSchema } from './services/supabase';
import { Whitelabel_Config } from './types';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

type AppState = 'LOADING' | 'INSTALL' | 'ADMIN' | 'PUBLIC' | 'CONFIG_ERROR';

const App = () => {
  const [state, setState] = useState<AppState>('LOADING');
  const [config, setConfig] = useState<Whitelabel_Config | null>(null);
  const [errorDetail, setErrorDetail] = useState<string>('');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const isInstallRoute = window.location.pathname === '/install';

    // 1. Local Config Check (Env vars or LocalStorage)
    if (!isConfigured()) {
        if (!isInstallRoute) {
            window.location.href = '/install';
            return;
        }
        setState('INSTALL');
        return;
    }

    try {
        // 2. Install State Check (Using Single Source of Truth)
        const installed = await checkIsInstalled();

        // Handle Routing based on install state
        if (isInstallRoute) {
            if (installed) {
                // Already installed, redirect to home to "hide" the installer
                console.log("System already installed. Redirecting to home.");
                window.location.href = '/';
                return;
            }
            // Not installed, on install route -> Show Wizard
            setState('INSTALL');
            return;
        }

        if (!installed) {
            console.warn("Boot: Not installed. Redirecting to /install");
            window.location.href = '/install';
            return;
        }

        // 3. Load Config (Only if installed)
        const { data: configData, error: configError } = await wlSchema()
            .from('config')
            .select('*')
            .single();
        
        if (configError || !configData) {
            console.error("Config Load Failed:", configError);
            setErrorDetail(configError?.message || "Configuration table is empty.");
            setState('CONFIG_ERROR');
            return;
        }
        
        setConfig(configData);

        // 4. Route based on URL
        if (window.location.pathname.startsWith('/admin')) {
            console.log("Boot: Routing to Admin");
            setState('ADMIN');
        } else {
            console.log("Boot: Routing to Public");
            setState('PUBLIC');
        }

    } catch (e: any) {
        console.error("Boot Critical Error:", e);
        // Fallback to install if something is catastrophically wrong and we aren't already there
        if (!isInstallRoute) {
             window.location.href = '/install';
        } else {
             setState('INSTALL');
        }
    }
  };

  if (state === 'LOADING') {
      return (
          <div className="h-screen w-screen bg-black flex items-center justify-center text-white flex-col gap-4">
              <Loader2 className="animate-spin w-10 h-10 text-blue-500" />
              <p className="text-zinc-500 font-mono text-sm">Initializing Platform...</p>
          </div>
      );
  }

  if (state === 'CONFIG_ERROR') {
      return (
          <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center text-white p-6">
              <div className="max-w-md w-full bg-black border border-white/10 p-8 rounded-lg shadow-2xl text-center">
                  <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                  </div>
                  <h1 className="text-2xl font-bold mb-4">Configuration Error</h1>
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                      The platform is installed, but the configuration could not be loaded.
                  </p>
                  
                  <div className="bg-white/5 p-4 rounded text-left mb-6 font-mono text-xs text-rose-300 border border-white/5 break-all">
                      {errorDetail.includes('relation "whitelabel.config" does not exist') || errorDetail.includes('schema') 
                        ? "Supabase API Error: The 'whitelabel' schema is likely not exposed." 
                        : errorDetail}
                  </div>

                  <div className="text-left bg-blue-900/20 border border-blue-900/50 p-4 rounded mb-6">
                      <h3 className="text-blue-200 font-bold text-xs uppercase mb-2">How to fix:</h3>
                      <ol className="list-decimal list-inside text-blue-200/70 text-xs space-y-1">
                          <li>Go to Supabase Dashboard &gt; Settings &gt; API</li>
                          <li>Find "Exposed Schemas"</li>
                          <li>Add <code>whitelabel</code> to the list</li>
                          <li>Save and reload this page</li>
                      </ol>
                  </div>

                  <button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Retry Connection
                  </button>
              </div>
          </div>
      );
  }

  if (state === 'INSTALL') {
      return <Whitelabel_InstallWizard onComplete={() => window.location.href = '/'} />;
  }

  if (state === 'ADMIN') {
      return <Whitelabel_AdminPanel />;
  }

  // Ensure config exists before rendering router
  if (!config) return null; 

  return <Whitelabel_PublicRouter config={config} />;
};

export default App;
