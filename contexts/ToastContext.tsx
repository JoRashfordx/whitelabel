
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type, title, message, duration = 3000, action }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration, action }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 pointer-events-none font-comfortaa">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto min-w-[300px] max-w-sm bg-[#0a0a0a] border border-white/10 shadow-2xl p-4 flex gap-3 items-start animate-in slide-in-from-right-full duration-300"
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-brand" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <h4 className="text-[11px] font-black uppercase text-white tracking-wide mb-1">{toast.title}</h4>}
              <p className="text-xs text-zinc-400 font-medium leading-relaxed">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="mt-2 text-[10px] font-black uppercase text-brand hover:underline"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
