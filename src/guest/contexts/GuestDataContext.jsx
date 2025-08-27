/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo } from 'react';

const GuestDataContext = createContext();

export const useGuestData = () => {
  const context = useContext(GuestDataContext);
  if (!context) throw new Error('useGuestData must be used within GuestDataProvider');
  return context;
};

export function GuestDataProvider({ children }) {
  const [guestData, setGuestData] = useState(null);
  const [processingStats, setProcessingStats] = useState(null);

  const value = useMemo(
    () => ({ guestData, setGuestData, processingStats, setProcessingStats }),
    [guestData, processingStats]
  );

  return <GuestDataContext.Provider value={value}>{children}</GuestDataContext.Provider>;
}
