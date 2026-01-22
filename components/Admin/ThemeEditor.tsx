import React from 'react';
import { WhitelabelConfig } from '../../types';

interface ThemeEditorProps {
  config: WhitelabelConfig;
  onChange: (cfg: WhitelabelConfig) => void;
  onSave: () => void;
}

export const ThemeEditor: React.FC<ThemeEditorProps> = ({ config, onChange, onSave }) => {
  const handleChange = (field: keyof WhitelabelConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="grid grid-cols-2 gap-8">
        {/* Branding */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white border-b border-zinc-800 pb-2">Identity</h3>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Site Name</label>
            <input 
              className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white"
              value={config.platform_name}
              onChange={e => handleChange('platform_name', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Logo URL</label>
            <input 
              className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white"
              value={config.logo_url || ''}
              onChange={e => handleChange('logo_url', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Footer Text</label>
            <input 
              className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white"
              value={config.footer_text || ''}
              onChange={e => handleChange('footer_text', e.target.value)}
            />
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white border-b border-zinc-800 pb-2">Colors</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Primary</label>
              <div className="flex gap-2">
                <input type="color" value={config.primary_color} onChange={e => handleChange('primary_color', e.target.value)} />
                <input className="flex-1 bg-zinc-900 border border-zinc-700 p-1 text-sm text-white" value={config.primary_color} onChange={e => handleChange('primary_color', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Background</label>
              <div className="flex gap-2">
                <input type="color" value={config.bg_color} onChange={e => handleChange('bg_color', e.target.value)} />
                <input className="flex-1 bg-zinc-900 border border-zinc-700 p-1 text-sm text-white" value={config.bg_color} onChange={e => handleChange('bg_color', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-zinc-800">
        <button onClick={onSave} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold">
          Save Settings
        </button>
      </div>
    </div>
  );
};