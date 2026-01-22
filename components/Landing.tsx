
import React from 'react';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center fade-in bg-black">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-5xl md:text-7xl tracking-tighter" style={{ fontWeight: 300 }}>
          <span className="text-white">VidFree</span><span className="text-brand">.TV</span>
        </h1>
        <div className="h-[1px] w-16 bg-brand/40 mx-auto"></div>
        <p className="text-slate-500 text-xs uppercase tracking-[0.4em] max-w-md mx-auto" style={{ fontWeight: 300 }}>
          Your content. Your channel. Your way.
        </p>
      </div>
    </div>
  );
};

export default Landing;
