import React, { createContext, useContext, useMemo, useState } from 'react';
import { useGuestData } from './GuestDataContext';
import { useAccountFilter } from './AccountFilterContext';

const ItemsAnalysisContext = createContext(null);

export function useItemsAnalysis() {
  const ctx = useContext(ItemsAnalysisContext);
  if (!ctx) throw new Error('useItemsAnalysis must be used within ItemsAnalysisProvider');
  return ctx;
}

function computeSignature(data, selectedAccounts = []) {
  if (!data) return 'none';
  const from = data?.metadata?.dateRange?.from || '';
  const to = data?.metadata?.dateRange?.to || '';
  const totalFlips = data?.totalFlips || 0;
  const uniqueItems = data?.uniqueItems || 0;
  const accountsKey = Array.isArray(selectedAccounts)
    ? selectedAccounts.slice().sort().join(',')
    : '';
  return `${from}|${to}|${totalFlips}|${uniqueItems}|${accountsKey}`;
}

export function ItemsAnalysisProvider({ children }) {
  const { guestData } = useGuestData();
  const { getFilteredData, selectedAccounts } = useAccountFilter();
  const filteredData = getFilteredData() || guestData;

  const initialSig = computeSignature(filteredData, selectedAccounts);
  const [sig, setSig] = useState(initialSig);
  const [ui, setUi] = useState({
    sortKey: 'profit',
    sortDir: 'desc',
    terms: [],
    filters: new Set(),
  });
  const [baseItems, setBaseItems] = useState([]); // array of base metrics from itemStats
  const [progressive, setProgressive] = useState({ ready: false, byItem: new Map() });

  // When guestData changes significantly, reset caches
  React.useEffect(() => {
    const currentSig = computeSignature(filteredData, selectedAccounts);
    if (currentSig !== sig) {
      setSig(currentSig);
      setBaseItems([]);
      setProgressive({ ready: false, byItem: new Map() });
      // keep UI (filters/sort) across datasets
    }
  }, [filteredData, selectedAccounts, sig]);

  const value = useMemo(
    () => ({
      signature: sig,
      getSignature: computeSignature,
      ui,
      setUi,
      baseItems,
      setBaseItems,
      progressive,
      setProgressive,
    }),
    [sig, ui, baseItems, progressive]
  );

  return <ItemsAnalysisContext.Provider value={value}>{children}</ItemsAnalysisContext.Provider>;
}

export default ItemsAnalysisContext;
