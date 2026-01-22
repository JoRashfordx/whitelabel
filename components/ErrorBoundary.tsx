import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    // Clear local storage to reset auth state if it's the cause
    localStorage.clear();
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-sans text-white">
          <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-8 border border-rose-500/20 shadow-[0_0_30px_rgba(225,29,72,0.2)]">
            <AlertTriangle className="w-12 h-12 text-rose-500" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-4 text-white">
            Something went wrong
          </h1>
          
          <p className="text-zinc-400 max-w-md mb-10 text-sm leading-relaxed font-medium">
            The application encountered an unexpected error. This might be due to a connection issue, corrupted local data, or a recent update.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
            <button 
                onClick={() => window.location.reload()}
                className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
                <RefreshCw className="w-4 h-4" /> Reload
            </button>
            <button 
                onClick={this.handleReset}
                className="flex-1 px-6 py-4 bg-brand hover:brightness-110 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
            >
                <Trash2 className="w-4 h-4" /> Reset App
            </button>
          </div>

          {this.state.error && (
              <div className="mt-12 p-6 bg-[#0a0a0a] border border-white/5 text-left max-w-xl w-full overflow-auto max-h-48 rounded-lg shadow-inner">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Error Details</p>
                  <p className="text-xs font-mono text-rose-400 break-all leading-relaxed">
                      {this.state.error.toString()}
                  </p>
              </div>
          )}
          
          <div className="mt-8 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            VidFree.TV Client Error
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;