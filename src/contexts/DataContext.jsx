/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo } from 'react';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};

export function DataProvider({ children }) {
  const [guestData, setGuestData] = useState(null);
  const [processingStats, setProcessingStats] = useState(null);

  const value = useMemo(
    () => ({ guestData, setGuestData, processingStats, setProcessingStats }),
    [guestData, processingStats]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
