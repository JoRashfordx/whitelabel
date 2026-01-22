
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-comfortaa">
      <div 
        className="bg-[#0a0a0a] border border-white/10 w-full max-w-md shadow-2xl overflow-hidden scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full bg-${variant === 'danger' ? 'rose' : variant === 'warning' ? 'amber' : 'blue'}-500/10 border border-${variant === 'danger' ? 'rose' : variant === 'warning' ? 'amber' : 'blue'}-500/20`}>
              <AlertTriangle className={`w-6 h-6 text-${variant === 'danger' ? 'rose' : variant === 'warning' ? 'amber' : 'blue'}-500`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">{title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-light">{description}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white/5 border-t border-white/5 flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg ${
              variant === 'danger' 
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20' 
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20'
                : 'bg-brand hover:brightness-110 shadow-brand/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
