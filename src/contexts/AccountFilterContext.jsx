import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useData } from './DataContext';

const AccountFilterContext = createContext();

export const useAccountFilter = () => {
  const context = useContext(AccountFilterContext);
  if (!context) {
    throw new Error('useAccountFilter must be used within AccountFilterProvider');
  }
  return context;
};

const STORAGE_KEY = 'osrs-flip-selected-accounts';

export function AccountFilterProvider({ children }) {
  const { guestData } = useData();
  const [selectedAccounts, setSelectedAccounts] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const availableAccounts = useMemo(() => {
    if (!guestData?.metadata?.accounts) return [];
    return guestData.metadata.accounts;
  }, [guestData]);

  const initializedRef = useRef(false);

  useEffect(() => {
    // Use ref to track initialization and avoid re-running
    if (initializedRef.current) return;
    if (selectedAccounts !== null || availableAccounts.length === 0) return;

    // This is intentional state initialization - sync with available accounts when they become available
    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedAccounts(availableAccounts);
  }, [availableAccounts, selectedAccounts]);

  useEffect(() => {
    if (selectedAccounts !== null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedAccounts));
    }
  }, [selectedAccounts]);

  const toggleAccount = useCallback(account => {
    setSelectedAccounts(prev => {
      if (!prev) return [account];
      if (prev.includes(account)) {
        return prev.filter(a => a !== account);
      }
      return [...prev, account];
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedAccounts(availableAccounts);
  }, [availableAccounts]);

  const clearAll = useCallback(() => {
    setSelectedAccounts([]);
  }, []);

  const isAccountSelected = useCallback(
    account => {
      if (!selectedAccounts) return true;
      return selectedAccounts.includes(account);
    },
    [selectedAccounts]
  );

  const filterFlips = useCallback(
    flips => {
      if (
        !selectedAccounts ||
        selectedAccounts.length === 0 ||
        selectedAccounts.length === availableAccounts.length
      ) {
        return flips;
      }
      return flips.filter(flip => {
        const accountName = flip.account || flip.accountId;
        return selectedAccounts.includes(accountName);
      });
    },
    [selectedAccounts, availableAccounts]
  );

  const getFilteredData = useCallback(() => {
    if (!guestData) return null;

    // If there's only one account, always show all data (no filtering needed)
    if (availableAccounts.length <= 1) {
      return guestData;
    }

    if (!selectedAccounts || selectedAccounts.length === 0) {
      return {
        ...guestData,
        allFlips: [],
        flipsByDate: {},
        dailySummaries: [],
        itemStats: [],
        totalProfit: 0,
        totalFlips: 0,
        uniqueItems: 0,
        totalTax: 0,
      };
    }

    if (selectedAccounts.length === availableAccounts.length) {
      return guestData;
    }

    const filteredFlips = guestData.allFlips ? filterFlips(guestData.allFlips) : [];

    const filteredFlipsByDate = {};
    if (guestData.flipsByDate) {
      Object.entries(guestData.flipsByDate).forEach(([date, dayData]) => {
        const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];
        const filtered = filterFlips(flips);
        if (filtered.length > 0) {
          filteredFlipsByDate[date] = {
            ...dayData,
            flips: filtered,
            totalProfit: filtered.reduce((sum, f) => sum + (f.profit || 0), 0),
            totalFlips: filtered.length,
          };
        }
      });
    }

    const dailySummaries = Object.entries(filteredFlipsByDate)
      .map(([date, data]) => ({
        date,
        totalProfit: data.totalProfit,
        flipCount: data.totalFlips,
        uniqueItems: new Set(data.flips.map(f => f.item)).size,
      }))
      .sort((a, b) => {
        // Sort dates chronologically (MM-DD-YYYY format)
        const [aMonth, aDay, aYear] = a.date.split('-');
        const [bMonth, bDay, bYear] = b.date.split('-');

        const dateA = new Date(aYear, aMonth - 1, aDay);
        const dateB = new Date(bYear, bMonth - 1, bDay);

        return dateA - dateB;
      });

    const itemStatsMap = {};
    filteredFlips.forEach(flip => {
      if (!itemStatsMap[flip.item]) {
        itemStatsMap[flip.item] = {
          item: flip.item,
          totalProfit: 0,
          flipCount: 0,
          totalQuantity: 0,
        };
      }
      itemStatsMap[flip.item].totalProfit += flip.profit || 0;
      itemStatsMap[flip.item].flipCount++;
      itemStatsMap[flip.item].totalQuantity += flip.bought || flip.quantity || 0;
    });

    const totalProfit = filteredFlips.reduce((sum, f) => sum + (f.profit || 0), 0);
    const totalFlips = filteredFlips.length;
    const uniqueItems = Object.keys(itemStatsMap).length;
    const totalTax = filteredFlips.reduce((sum, f) => sum + (f.sellerTax || f.tax || 0), 0);

    return {
      ...guestData,
      allFlips: filteredFlips,
      flipsByDate: filteredFlipsByDate,
      dailySummaries,
      itemStats: Object.values(itemStatsMap),
      totalProfit,
      totalFlips,
      uniqueItems,
      totalTax,
    };
  }, [guestData, selectedAccounts, availableAccounts, filterFlips]);

  const value = useMemo(
    () => ({
      selectedAccounts: selectedAccounts || [],
      availableAccounts,
      toggleAccount,
      selectAll,
      clearAll,
      isAccountSelected,
      filterFlips,
      getFilteredData,
      isFiltered: selectedAccounts && selectedAccounts.length < availableAccounts.length,
    }),
    [
      selectedAccounts,
      availableAccounts,
      toggleAccount,
      selectAll,
      clearAll,
      isAccountSelected,
      filterFlips,
      getFilteredData,
    ]
  );

  return <AccountFilterContext.Provider value={value}>{children}</AccountFilterContext.Provider>;
}
