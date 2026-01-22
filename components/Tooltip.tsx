
import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', delay = 200 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const show = () => {
    timeoutRef.current = window.setTimeout(() => setIsVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {isVisible && (
        <div className={`
          absolute z-[100] px-3 py-1.5 bg-[#111] border border-white/10 text-white text-[9px] font-bold uppercase tracking-widest whitespace-nowrap shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-150
          ${position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : ''}
          ${position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' : ''}
          ${position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' : ''}
          ${position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : ''}
        `}>
          {content}
          {/* Arrow */}
          <div className={`absolute w-2 h-2 bg-[#111] border-white/10 transform rotate-45
            ${position === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b' : ''}
            ${position === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-l border-t' : ''}
            ${position === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-r border-t' : ''}
            ${position === 'right' ? 'left-[-5px] top-1/2 -translate-y-1/2 border-l border-b' : ''}
          `}></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
