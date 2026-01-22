
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
          // Check connection with Service key to write install state
          const adminClient = createClient(config.url, config.service);

          // 1. Verify Schema by checking install_state table existence
          const { error: tableError } = await adminClient.schema('whitelabel').from('install_state').select('*').limit(1);
          
          if (tableError) {
              throw new Error(`Schema check failed: ${tableError.message}. Did you run the SQL?`);
          }

          // 2. Fetch Admin User ID
          const { data: { users } } = await adminClient.auth.admin.listUsers();
          const adminUser = users.find(u => u.email === config.adminEmail);
          
          if (!adminUser) throw new Error("Admin user not found in Auth. Please restart setup.");

          // 3. Register Admin Profile
          await adminClient.schema('whitelabel').from('profiles').upsert({
              id: adminUser.id,
              username: 'admin',
              role: 'admin'
          });
          
          await adminClient.schema('whitelabel').from('admins').upsert({
              user_id: adminUser.id,
              email: config.adminEmail
          });

          // 4. WRITE INSTALL STATE (CRITICAL)
          addLog('Writing install state...');
          
          // Using upsert with explicit ID true to ensure singleton
          const { error: installError } = await adminClient.schema('whitelabel').from('install_state').upsert({
              id: true,
              installed: true,
              admin_user_id: adminUser.id,
              platform_name: config.platformName,
              installed_at: new Date().toISOString()
          });

          if (installError) {
              throw new Error(`Failed to write install state: ${installError.message}`);
          }

          addLog('Install state written.');

          // 5. Save Credentials locally
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
