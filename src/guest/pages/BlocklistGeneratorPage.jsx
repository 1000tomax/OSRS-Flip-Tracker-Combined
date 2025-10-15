import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchItemMapping, fetchLatestPrices, fetch1HourVolume } from '../utils/osrsWikiApi';
import { downloadProfile } from '../components/BlocklistGenerator';
import ItemSelectorPage from '../components/BlocklistGenerator/ItemSelectorPage';
import { useGuestData } from '../contexts/GuestDataContext';

export default function BlocklistGeneratorPage() {
  const navigate = useNavigate();
  const { guestData } = useGuestData();

  // OSRS data
  const [itemsData, setItemsData] = useState([]);
  const [priceData, setPriceData] = useState({});
  const [volumeData, setVolumeData] = useState({});
  const [dataLoading, setDataLoading] = useState(true);

  // Calculate user's performance stats per item
  const userItemStats = useMemo(() => {
    if (!guestData?.flipsByDate) return {};

    const stats = {};

    // Iterate through all flips and aggregate by item
    Object.entries(guestData.flipsByDate).forEach(([_date, dayData]) => {
      const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];

      flips.forEach(flip => {
        const itemName = flip.item;
        if (!itemName) return;

        if (!stats[itemName]) {
          stats[itemName] = {
            totalProfit: 0,
            totalTimeMinutes: 0,
            flipCount: 0,
          };
        }

        stats[itemName].totalProfit += flip.profit || 0;
        stats[itemName].flipCount += 1;

        // Calculate time spent on this flip (in minutes)
        if (flip.firstBuyTime && flip.lastSellTime) {
          const buyTime = new Date(flip.firstBuyTime).getTime();
          const sellTime = new Date(flip.lastSellTime).getTime();
          const timeMinutes = (sellTime - buyTime) / (1000 * 60);
          stats[itemName].totalTimeMinutes += timeMinutes;
        } else if (flip.first_buy_time && flip.last_sell_time) {
          const buyTime = new Date(flip.first_buy_time).getTime();
          const sellTime = new Date(flip.last_sell_time).getTime();
          const timeMinutes = (sellTime - buyTime) / (1000 * 60);
          stats[itemName].totalTimeMinutes += timeMinutes;
        }
      });
    });

    // Calculate GP/hour for each item
    Object.keys(stats).forEach(itemName => {
      const item = stats[itemName];
      if (item.totalTimeMinutes > 0) {
        item.gpPerHour = Math.round((item.totalProfit / item.totalTimeMinutes) * 60);
      } else {
        item.gpPerHour = 0;
      }
    });

    return stats;
  }, [guestData]);

  // Fetch OSRS data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true);
        const [items, prices, volume] = await Promise.all([
          fetchItemMapping(),
          fetchLatestPrices(),
          fetch1HourVolume().catch(err => {
            console.warn('Volume data unavailable:', err);
            return {};
          }), // Volume is optional
        ]);

        // Log data stats for debugging
        console.log('OSRS Data loaded:', {
          totalItems: items.length,
          itemsWithPrices: Object.keys(prices).length,
          itemsWithVolume: Object.keys(volume).length,
        });

        setItemsData(items);
        setPriceData(prices);
        setVolumeData(volume);
      } catch (err) {
        console.error('Failed to load OSRS data:', err);
        // eslint-disable-next-line no-alert
        alert('Failed to load item data. Please refresh the page.');
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle download
  const handleDownload = (blockedItemIds, profileName) => {
    downloadProfile(blockedItemIds, {
      profileName: profileName || 'Custom Blocklist',
      timeframe: 5,
      f2pOnly: false,
    });
  };

  // Handle back to dashboard
  const handleBack = () => {
    navigate('/guest/dashboard');
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-4" />
          <div className="text-gray-300">Loading OSRS item data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <ItemSelectorPage
          items={itemsData}
          priceData={priceData}
          volumeData={volumeData}
          userItemStats={userItemStats}
          onDownload={handleDownload}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
