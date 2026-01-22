
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { generateMigrationSQL, generateMockDataSQL } from '../services/schema.ts';
import { Database, Server, CheckCircle, AlertTriangle, Play, Loader2 } from 'lucide-react';

export const Whitelabel_InstallWizard = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    url: '',
    anon: '',
    service: '',
    adminEmail: '',
    adminPass: '',
    platformName: 'My Video Platform'
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

  const runSetup = async () => {
    setIsBusy(true);
    addLog('Connecting to Supabase...');
    
    try {
        const adminClient = createClient(config.url, config.service, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Create Admin User
        addLog('Creating Admin User...');
        const { data: userData, error: authError } = await adminClient.auth.admin.createUser({
            email: config.adminEmail,
            password: config.adminPass,
            email_confirm: true,
            user_metadata: { role: 'admin', username: 'admin' }
        });

        if (authError) addLog(`Auth Note: ${authError.message}`);
        else addLog(`Admin created: ${userData.user.id}`);

        setStep(2);
        
    } catch (err: any) {
        addLog(`ERROR: ${err.message}`);
    } finally {
        setIsBusy(false);
    }
  };

  const verifyAndFinalize = async () => {
      setIsBusy(true);
      addLog('Verifying installation...');
      
      try {
          // Check connection with Service key
          const adminClient = createClient(config.url, config.service);

          // 1. Attempt to call the complete_install RPC
          // This verifies the SQL was run (because the function exists) AND finalizes the table.
          addLog('Finalizing Install State...');
          
          const { error: rpcError } = await adminClient.rpc('complete_install', {
              p_admin_email: config.adminEmail,
              p_platform_name: config.platformName
          });

          if (rpcError) {
              throw new Error(`Migration check failed: ${rpcError.message}. Did you run the SQL in step 2?`);
          }

          // 2. Double check verify via public RPC
          const { data: verifyData } = await adminClient.rpc('check_install_status');
          
          if (verifyData !== true) {
              throw new Error("Verification returned false even after finalization. Check database logs.");
          }

          addLog('Install state confirmed.');

          // 3. Save Credentials locally
          localStorage.setItem('wl_supabase_url', config.url);
          localStorage.setItem('wl_supabase_anon', config.anon);

          addLog('Installation Successful! Redirecting...');
          
          setTimeout(() => {
              onComplete();
          }, 1500);

      } catch (err: any) {
          addLog(`VERIFICATION FAILED: ${err.message}`);
          console.error("Install Verification Failed", err);
      } finally {
          setIsBusy(false);
      }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Server className="text-white" />
            </div>
            <div>
                <h1 className="text-2xl font-bold">Whitelabel Setup</h1>
                <p className="text-zinc-400">Configure your isolated video platform</p>
            </div>
        </div>

        {step === 1 && (
            <div className="space-y-4">
                <div className="bg-blue-900/20 p-4 rounded border border-blue-900/50 text-sm text-blue-200">
                    Enter Supabase credentials. Service Key is used ONCE to setup admin accounts.
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-500">Platform Name</label>
                    <input className="w-full bg-black border border-zinc-700 p-3 rounded" value={config.platformName} onChange={e => setConfig({...config, platformName: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-500">Supabase URL</label>
                        <input className="w-full bg-black border border-zinc-700 p-3 rounded" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} placeholder="https://xyz.supabase.co" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-500">Anon Key</label>
                        <input className="w-full bg-black border border-zinc-700 p-3 rounded" value={config.anon} onChange={e => setConfig({...config, anon: e.target.value})} />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-500">Service Role Key</label>
                    <input className="w-full bg-black border border-zinc-700 p-3 rounded" type="password" value={config.service} onChange={e => setConfig({...config, service: e.target.value})} />
                </div>

                <div className="border-t border-zinc-800 my-4 pt-4">
                    <h3 className="text-sm font-bold text-white mb-4">Create Super Admin</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <input className="w-full bg-black border border-zinc-700 p-3 rounded" value={config.adminEmail} onChange={e => setConfig({...config, adminEmail: e.target.value})} placeholder="admin@example.com" />
                        <input className="w-full bg-black border border-zinc-700 p-3 rounded" type="password" value={config.adminPass} onChange={e => setConfig({...config, adminPass: e.target.value})} placeholder="Password" />
                    </div>
                </div>

                <button 
                    onClick={runSetup} 
                    disabled={isBusy || !config.url || !config.service || !config.adminEmail}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded mt-4 disabled:opacity-50"
                >
                    {isBusy ? 'Processing...' : 'Start Installation'}
                </button>

                {logs.length > 0 && (
                    <div className="mt-4 bg-black p-4 rounded h-32 overflow-y-auto font-mono text-xs text-green-400">
                        {logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                )}
            </div>
        )}

        {step === 2 && (
            <div className="space-y-6">
                <div className="bg-amber-900/20 p-4 rounded border border-amber-900/50 flex gap-3 items-start">
                    <AlertTriangle className="text-amber-500 shrink-0" />
                    <div className="text-sm text-amber-200">
                        <strong>Action Required:</strong> Copy the SQL below and run it in your Supabase SQL Editor to create the <code>whitelabel</code> schema and tables.
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-500">Schema Migration SQL</label>
                    <textarea 
                        readOnly 
                        className="w-full h-48 bg-black border border-zinc-700 p-4 rounded text-xs font-mono text-zinc-300"
                        value={generateMigrationSQL() + '\n' + generateMockDataSQL()}
                    />
                    <button 
                        onClick={() => navigator.clipboard.writeText(generateMigrationSQL() + '\n' + generateMockDataSQL())}
                        className="text-xs text-blue-400 hover:underline"
                    >
                        Copy to Clipboard
                    </button>
                </div>

                <div className="flex justify-between gap-4 border-t border-zinc-800 pt-4">
                    <button onClick={() => setStep(1)} className="text-zinc-400 hover:text-white">Back</button>
                    <button onClick={verifyAndFinalize} disabled={isBusy} className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2 rounded flex items-center gap-2 disabled:opacity-50">
                        {isBusy ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle size={18} />} 
                        {isBusy ? 'Verifying & Finalizing...' : 'Verify & Complete'}
                    </button>
                </div>
                {logs.length > 0 && (
                    <div className="mt-4 bg-black p-4 rounded h-24 overflow-y-auto font-mono text-xs text-green-400">
                        {logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
