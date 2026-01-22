
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { generateMigrationSQL, generateMockDataSQL } from '../services/schema.ts';
import { Database, Server, CheckCircle, AlertTriangle } from 'lucide-react';

export const InstallWizard = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('');
  const [anon, setAnon] = useState('');
  const [service, setService] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

  const runInstallation = async () => {
    setIsBusy(true);
    addLog('Connecting to Supabase...');
    
    try {
        const adminClient = createClient(url, service, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Create Admin User
        addLog('Creating Admin User...');
        const { data: userData, error: authError } = await adminClient.auth.admin.createUser({
            email: adminEmail,
            password: adminPass,
            email_confirm: true,
            user_metadata: { role: 'admin', username: 'admin' }
        });

        if (authError) addLog(`Auth Warning: ${authError.message} (User might exist)`);
        else addLog(`Admin created: ${userData.user.id}`);

        // 2. Migration Instruction
        // Since we can't run raw SQL easily via JS client without extensions,
        // we prompt the user or attempt a table check.
        // For this demo, we assume the user might have run it, OR we try to insert to trigger creation if using edge functions (not available here).
        // WE WILL COPY/PASTE METHOD for reliability in this pure-client context.
        
        setStep(2); // Move to SQL Step
        
    } catch (err: any) {
        addLog(`ERROR: ${err.message}`);
    } finally {
        setIsBusy(false);
    }
  };

  const finishSetup = () => {
      // Save keys
      localStorage.setItem('wl_supabase_url', url);
      localStorage.setItem('wl_supabase_anon', anon);
      onComplete();
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Server className="text-white" />
            </div>
            <div>
                <h1 className="text-2xl font-bold">Platform Installer</h1>
                <p className="text-zinc-400">Initialize your white-label video solution</p>
            </div>
        </div>

        {step === 1 && (
            <div className="space-y-4">
                <div className="bg-blue-900/20 p-4 rounded border border-blue-900/50 text-sm text-blue-200">
                    Please provide your Supabase project credentials. The <strong>Service Role Key</strong> is required only once to set up the admin account and database policies.
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-500">Supabase URL</label>
                    <input className="w-full bg-black border border-zinc-700 p-3 rounded" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://xyz.supabase.co" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-500">Anon Public Key</label>
                        <input className="w-full bg-black border border-zinc-700 p-3 rounded" value={anon} onChange={e => setAnon(e.target.value)} placeholder="public-key" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-500">Service Role Key</label>
                        <input className="w-full bg-black border border-zinc-700 p-3 rounded" type="password" value={service} onChange={e => setService(e.target.value)} placeholder="secret-key" />
                    </div>
                </div>

                <div className="border-t border-zinc-800 my-4 pt-4">
                    <h3 className="text-sm font-bold text-white mb-4">Create Admin Account</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <input className="w-full bg-black border border-zinc-700 p-3 rounded" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@example.com" />
                        <input className="w-full bg-black border border-zinc-700 p-3 rounded" type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Password" />
                    </div>
                </div>

                <button 
                    onClick={runInstallation} 
                    disabled={isBusy || !url || !service || !adminEmail}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded mt-4 disabled:opacity-50"
                >
                    {isBusy ? 'Processing...' : 'Run Setup'}
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
                        <strong>Manual Step Required:</strong> Due to security restrictions, you must run the database migration SQL manually in your Supabase SQL Editor.
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-500">Migration SQL</label>
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

                <div className="flex justify-end gap-4 border-t border-zinc-800 pt-4">
                    <button onClick={() => setStep(1)} className="text-zinc-400 hover:text-white">Back</button>
                    <button onClick={finishSetup} className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2 rounded flex items-center gap-2">
                        <CheckCircle size={18} /> I have run the SQL
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
