import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchItemMapping, fetchLatestPrices } from '../utils/osrsWikiApi';
import { downloadProfile } from '../components/BlocklistGenerator';
import ItemSelectorPage from '../components/BlocklistGenerator/ItemSelectorPage';
import { useGuestData } from '../contexts/GuestDataContext';
import { getItemVolumes } from '../../utils/supabaseClient';

export default function BlocklistGeneratorPage() {
  const navigate = useNavigate();
  const { guestData } = useGuestData();

  // OSRS data
  const [itemsData, setItemsData] = useState([]);
  const [priceData, setPriceData] = useState({});
  const [volumeData, setVolumeData] = useState({});
  const [volumeLastUpdated, setVolumeLastUpdated] = useState(null);
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
        const [items, prices, volumeResult] = await Promise.all([
          fetchItemMapping(),
          fetchLatestPrices(),
          getItemVolumes().catch(err => {
            console.warn('Volume data unavailable:', err);
            return { volumes: {}, lastUpdated: null };
          }), // Volume is optional
        ]);

        // Log data stats for debugging
        console.log('OSRS Data loaded:', {
          totalItems: items.length,
          itemsWithPrices: Object.keys(prices).length,
          itemsWithVolume: Object.keys(volumeResult.volumes).length,
          volumeLastUpdated: volumeResult.lastUpdated,
        });

        setItemsData(items);
        setPriceData(prices);
        setVolumeData(volumeResult.volumes);
        setVolumeLastUpdated(volumeResult.lastUpdated);
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

  // Helper to format last updated time
  const formatLastUpdated = timestamp => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours < 1) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Volume data info banner */}
        {volumeLastUpdated && (
          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-blue-400 text-xl">ℹ️</span>
              <div className="flex-1">
                <p className="text-blue-200 text-sm">
                  <strong>24-hour trading volumes</strong> are updated twice daily (6 AM & 6 PM
                  UTC).
                </p>
                <p className="text-blue-300 text-xs mt-1">
                  Last updated: <strong>{formatLastUpdated(volumeLastUpdated)}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show upload prompt if no guest data */}
        {!guestData && (
          <div className="bg-gradient-to-r from-green-900/40 to-blue-900/40 border-2 border-green-500/60 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <span className="text-3xl">💡</span>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-200 mb-3">Unlock Advanced Features!</h3>
                <p className="text-green-100 mb-4">
                  Upload your Flipping Copilot CSV first to unlock personalized features:
                </p>
                <ul className="space-y-2 text-green-200 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 font-bold">✓</span>
                    <span>
                      <strong>Your GP/Hour:</strong> See your actual profit rates for each item
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 font-bold">✓</span>
                    <span>
                      <strong>Your Flip Count:</strong> See how many times you've traded each item
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 font-bold">✓</span>
                    <span>
                      <strong>Advanced Filtering:</strong> Filter by your personal performance
                      metrics
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 font-bold">✓</span>
                    <span>
                      <strong>"Items I've Traded" Filter:</strong> Focus on items you have
                      experience with
                    </span>
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/guest')}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <span>📤</span>
                  <span>Upload Your Flips First</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
