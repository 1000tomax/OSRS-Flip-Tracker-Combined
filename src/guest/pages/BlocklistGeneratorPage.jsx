import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchItemMapping, fetchLatestPrices, fetch1HourVolume } from '../utils/osrsWikiApi';
import { downloadProfile } from '../components/BlocklistGenerator';
import ItemSelectorPage from '../components/BlocklistGenerator/ItemSelectorPage';

export default function BlocklistGeneratorPage() {
  const navigate = useNavigate();

  // OSRS data
  const [itemsData, setItemsData] = useState([]);
  const [priceData, setPriceData] = useState({});
  const [volumeData, setVolumeData] = useState({});
  const [dataLoading, setDataLoading] = useState(true);

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
    navigate('/guest');
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
          onDownload={handleDownload}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
