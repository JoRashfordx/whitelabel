
import React, { useEffect, useState } from 'react';
import { Whitelabel_InstallWizard } from './components/Whitelabel_InstallWizard';
import { Whitelabel_AdminPanel } from './components/Whitelabel_AdminPanel';
import { Whitelabel_PublicRouter } from './components/Whitelabel_PublicRouter';
import { checkIsInstalled, isConfigured, wlSchema } from './services/supabase';
import { Whitelabel_Config } from './types';
import { Loader2 } from 'lucide-react';

type AppState = 'LOADING' | 'INSTALL' | 'ADMIN' | 'PUBLIC';

const App = () => {
  const [state, setState] = useState<AppState>('LOADING');
  const [config, setConfig] = useState<Whitelabel_Config | null>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    // 1. Config Check
    if (!isConfigured()) {
        setState('INSTALL');
        return;
    }

    try {
        // 2. Install State Check (Using Single Source of Truth)
        const installed = await checkIsInstalled();

        if (!installed) {
            console.warn("Boot: Not installed or install check failed.");
            setState('INSTALL');
            return;
        }

        // 3. Load Config (Only if installed)
        const { data: configData } = await wlSchema()
            .from('config')
            .select('*')
            .single();
        
        setConfig(configData);

        // 4. Route based on URL
        if (window.location.pathname.startsWith('/admin')) {
            console.log("Boot: Routing to Admin");
            setState('ADMIN');
        } else {
            console.log("Boot: Routing to Public");
            setState('PUBLIC');
        }

    } catch (e) {
        console.error("Boot Error:", e);
        setState('INSTALL');
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

  if (state === 'INSTALL') {
      return <Whitelabel_InstallWizard onComplete={() => window.location.reload()} />;
  }

  if (state === 'ADMIN') {
      return <Whitelabel_AdminPanel />;
  }

  return <Whitelabel_PublicRouter config={config!} />;
};

export default App;
