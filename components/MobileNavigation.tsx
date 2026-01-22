
import React from 'react';
import { Home, Compass, Flame, User, Layers, LogIn, PlusSquare } from 'lucide-react';
import { ViewState, User as UserType } from '../types';

interface MobileNavigationProps {
  activeView: ViewState;
  onNavigate: (view: ViewState) => void;
  user: UserType | null;
  onAuthClick: () => void;
  onUploadClick: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ 
  activeView, 
  onNavigate, 
  user, 
  onAuthClick,
  onUploadClick
}) => {
  const navItems = [
    { id: 'HOME', icon: Home, label: 'Home' },
    { id: 'EXPLORE', icon: Compass, label: 'Explore' },
    // Center Action Button Placeholder
    { id: 'UPLOAD', icon: PlusSquare, label: 'Create', isAction: true },
    { id: 'TRENDING', icon: Flame, label: 'Hot' },
    { id: 'CHANNEL', icon: User, label: 'You' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur-xl border-t border-white/10 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = activeView === item.id || (item.id === 'CHANNEL' && activeView === 'SETTINGS');
          
          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={user ? onUploadClick : onAuthClick}
                className="flex flex-col items-center justify-center -mt-6"
              >
                <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,0,127,0.4)] border border-white/20 active:scale-95 transition-transform">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[9px] font-black uppercase text-zinc-400 mt-1 tracking-widest">Create</span>
              </button>
            );
          }

          if (item.id === 'CHANNEL' && !user) {
             return (
                <button
                    key="LOGIN"
                    onClick={onAuthClick}
                    className="flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform"
                >
                    <LogIn className="w-5 h-5 text-zinc-500" />
                    <span className="text-[9px] font-bold uppercase text-zinc-500">Sign In</span>
                </button>
             );
          }

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as ViewState)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform ${isActive ? 'text-brand' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-bold uppercase tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>
      {/* iOS Home Indicator Spacing */}
      <div className="h-4 w-full" /> 
    </div>
  );
};

export default MobileNavigation;
