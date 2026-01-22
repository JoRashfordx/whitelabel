
import React, { createContext, useContext } from 'react';

interface GiftContextType {
  addGift: (gift: any) => void;
  currentGift: any | null;
  finishCurrentGift: () => void;
  queueLength: number;
}

const GiftContext = createContext<GiftContextType | undefined>(undefined);

export const useGift = () => {
  const context = useContext(GiftContext);
  if (!context) {
    // throw new Error('useGift must be used within a GiftProvider');
    // Return dummy to prevent crashes if used in remaining code
    return { addGift: () => {}, currentGift: null, finishCurrentGift: () => {}, queueLength: 0 };
  }
  return context;
};

export const GiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <GiftContext.Provider value={{ addGift: () => {}, currentGift: null, finishCurrentGift: () => {}, queueLength: 0 }}>
      {children}
    </GiftContext.Provider>
  );
};
