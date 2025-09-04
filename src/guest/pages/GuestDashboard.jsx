import { useGuestData } from '../contexts/GuestDataContext';
import { useAccountFilter } from '../contexts/AccountFilterContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { guestAnalytics } from '../../utils/guestAnalytics';
import * as Sentry from '@sentry/react';
import JSZip from 'jszip';
import { formatGP } from '../../utils/formatUtils';
import html2canvas from 'html2canvas-pro';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Import existing components
import SortableTable from '../../components/SortableTable';
import ItemSearch from '../components/ItemSearch';
import GuestHeatMap from '../components/GuestHeatMap';
import GuestFlipLogViewer from '../components/GuestFlipLogViewer';
import GuestDatePicker from '../components/GuestDatePicker';
// Comment out the old complex version:
// import { QueryBuilder } from '../components/QueryBuilder';
// Use the new simple version:
import { QueryBuilderSimple as QueryBuilder } from '../components/QueryBuilder/QueryBuilderSimple';

// Import new performance components
import GuestPerformanceAnalysis from '../components/GuestPerformanceAnalysis';
import GuestProfitVelocity from '../components/GuestProfitVelocity';
import GuestWinRateChart from '../components/GuestWinRateChart';
import GuestFlipVolumeChart from '../components/GuestFlipVolumeChart';
import GuestProfitLossChart from '../components/GuestProfitLossChart';

// Helper function to convert array of objects to CSV
function arrayToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row =>
    headers
      .map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}

// Export function - creates a ZIP with both JSON and CSV data
async function exportGuestData(guestData) {
  try {
    // Import the analytics at function level since this is outside the component
    const { guestAnalytics } = await import('../../utils/guestAnalytics');

    Sentry.addBreadcrumb({
      category: 'action',
      message: 'Export started',
      level: 'info',
    });

    // Track data export
    guestAnalytics.dataExported();

    const zip = new JSZip();

    // Create metadata
    const metadata = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      source: 'guest-mode',
      accounts: guestData.metadata.accounts,
      dateRange: guestData.metadata.dateRange,
      timezone: guestData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      stats: {
        totalProfit: guestData.totalProfit,
        totalFlips: guestData.totalFlips,
        uniqueItems: guestData.uniqueItems,
      },
    };

    // Add JSON files
    zip.file('meta.json', JSON.stringify(metadata, null, 2));
    zip.file('json/daily-summaries.json', JSON.stringify(guestData.dailySummaries, null, 2));
    zip.file('json/item-stats.json', JSON.stringify(guestData.itemStats, null, 2));

    // Add CSV files (more user-friendly)
    zip.file('csv/daily-summaries.csv', arrayToCSV(guestData.dailySummaries));
    zip.file('csv/item-stats.csv', arrayToCSV(guestData.itemStats));

    // Add all individual flips as CSV (flatten the flipsByDate object)
    if (guestData.flipsByDate) {
      const allFlipsFlat = [];
      Object.entries(guestData.flipsByDate).forEach(([date, dayData]) => {
        // Handle both old format (array) and new format (object with flips array)
        const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];
        // Add safety check
        if (!Array.isArray(flips)) {
          console.error('Expected flips to be array, got:', typeof flips, flips);
          return;
        }
        flips.forEach(flip => {
          allFlipsFlat.push({
            date,
            item: flip.item,
            quantity: flip.quantity || flip.bought || flip.sold,
            avgBuyPrice: flip.avgBuyPrice || flip.avg_buy_price,
            avgSellPrice: flip.avgSellPrice || flip.avg_sell_price,
            profit: flip.profit,
            sellerTax: flip.sellerTax || flip.tax,
            firstBuyTime: flip.firstBuyTime || flip.first_buy_time,
            lastSellTime: flip.lastSellTime || flip.last_sell_time,
            accountId: flip.accountId || flip.account,
          });
        });
      });

      zip.file('csv/all-flips.csv', arrayToCSV(allFlipsFlat));
      zip.file('json/flips-by-date.json', JSON.stringify(guestData.flipsByDate, null, 2));
    }

    // Add a README explaining the files
    const readme = `# OSRS Flip Analysis Export

## Files Included

### CSV Files (Open in Excel/Google Sheets)
- csv/daily-summaries.csv - Your daily profit breakdown
- csv/item-stats.csv - Profit analysis by item
- csv/all-flips.csv - Complete flip history with details

### JSON Files (For developers/advanced users)
- json/daily-summaries.json - Daily data in JSON format
- json/item-stats.json - Item statistics in JSON format  
- json/flips-by-date.json - All flips organized by date

### Metadata
- meta.json - Export information and summary statistics

## Generated on ${new Date().toISOString().split('T')[0]}
Total Profit: ${guestData.totalProfit.toLocaleString()} GP
Total Flips: ${guestData.totalFlips.toLocaleString()}
Unique Items: ${guestData.uniqueItems}
Accounts: ${guestData.metadata.accounts.join(', ')}
`;

    zip.file('README.txt', readme);

    // Generate and download ZIP
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osrs-flips-export-${new Date().toISOString().split('T')[0]}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    Sentry.addBreadcrumb({
      category: 'action',
      message: 'Export completed successfully',
      level: 'info',
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        component: 'export_function',
      },
    });
    throw error; // Re-throw so the calling code can handle it
  }
}

export default function GuestDashboard() {
  const { guestData: originalData } = useGuestData();
  const { getFilteredData, isFiltered, selectedAccounts } = useAccountFilter();
  const guestData = getFilteredData() || originalData;
  const navigate = useNavigate();
  const [searchTerms, setSearchTerms] = useState([]);
  const [isCapturingChart, setIsCapturingChart] = useState(false);
  const [isCapturingHeatmap, setIsCapturingHeatmap] = useState(false);
  const [chartViewMode, setChartViewMode] = useState('combined'); // 'combined' or 'individual'

  // Tab navigation state
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'performance', 'fliplogs', 'ai'
  const [selectedDate, setSelectedDate] = useState(null); // For flip log viewer
  const [selectedDayHour, setSelectedDayHour] = useState(null); // For heatmap cell clicks

  const chartRef = useRef(null);
  const heatmapRef = useRef(null);

  // Track dashboard view on mount
  useEffect(() => {
    guestAnalytics.dashboardViewed();

    // Add context about loaded data
    Sentry.setContext('dashboard_data', {
      totalFlips: guestData.totalFlips,
      uniqueItems: guestData.uniqueItems,
      dateRange: guestData.metadata?.dateRange,
      accountCount: guestData.metadata?.accountCount || 1,
    });

    Sentry.addBreadcrumb({
      category: 'navigation',
      message: 'Dashboard loaded successfully',
      level: 'info',
    });
  }, [guestData]);

  // Note: We don't need to check for data here because RequireGuestData handles it
  const userTimezone = guestData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Handle heatmap cell clicks
  const handleHeatmapCellClick = cellData => {
    setSelectedDayHour({ day: cellData.day, hour: cellData.hour });
    setSelectedDate(null); // Clear date selection
    setActiveTab('fliplogs');
  };

  // Handle date selection from date picker
  const handleDateSelect = date => {
    setSelectedDate(date);
    setSelectedDayHour(null); // Clear day/hour selection
    setActiveTab('fliplogs');
  };

  // Handle clearing selections and returning to overview
  const handleBackToOverview = () => {
    setActiveTab('overview');
    setSelectedDate(null);
    setSelectedDayHour(null);
  };

  // Generate shareable image of profit chart
  const captureChart = async () => {
    if (isCapturingChart) return;

    try {
      Sentry.addBreadcrumb({
        category: 'action',
        message: 'Screenshot capture started: profit_chart',
        level: 'info',
      });

      // Track screenshot capture
      guestAnalytics.screenshotCaptured('profit_chart');

      setIsCapturingChart(true);
      // Create a temporary div to render the chart
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '1000px';
      tempDiv.style.height = '600px';
      tempDiv.style.padding = '30px';
      tempDiv.style.backgroundColor = '#0f172a';
      tempDiv.style.color = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';

      // Header
      const headerDiv = document.createElement('div');
      headerDiv.style.marginBottom = '20px';
      headerDiv.style.display = 'flex';
      headerDiv.style.justifyContent = 'space-between';
      headerDiv.style.alignItems = 'center';
      headerDiv.style.padding = '15px 20px';
      headerDiv.style.backgroundColor = '#1e293b';
      headerDiv.style.borderRadius = '8px';
      headerDiv.style.border = '2px solid #3b82f6';

      // Left side - Title and stats
      const leftInfo = document.createElement('div');

      const title = document.createElement('h1');
      title.textContent = 'OSRS Flip Analysis - Profit Chart';
      title.style.fontSize = '20px';
      title.style.fontWeight = 'bold';
      title.style.margin = '0';
      title.style.color = 'white';

      const subtitle = document.createElement('p');
      subtitle.textContent = `${guestData.dailySummaries.length} Trading Days • Total Profit: ${guestData.totalProfit.toLocaleString()} GP`;
      subtitle.style.fontSize = '14px';
      subtitle.style.color = '#9CA3AF';
      subtitle.style.margin = '2px 0 0 0';

      leftInfo.appendChild(title);
      leftInfo.appendChild(subtitle);

      // Right side - Brand and date
      const rightInfo = document.createElement('div');
      rightInfo.style.textAlign = 'right';

      const brandDateText = document.createElement('p');
      // Create brand span safely
      const brandSpan = document.createElement('span');
      brandSpan.textContent = 'mreedon.com/guest';
      brandSpan.style.color = '#60a5fa';
      brandSpan.style.fontWeight = 'bold';
      brandSpan.style.fontSize = '16px';

      // Create date span safely
      const dateSpan = document.createElement('span');
      dateSpan.textContent = `Generated: ${new Date().toLocaleDateString()}`;
      dateSpan.style.color = '#94a3b8';
      dateSpan.style.fontSize = '11px';

      brandDateText.appendChild(brandSpan);
      brandDateText.appendChild(document.createElement('br'));
      brandDateText.appendChild(dateSpan);
      brandDateText.style.margin = '0';
      brandDateText.style.lineHeight = '1.3';

      rightInfo.appendChild(brandDateText);

      headerDiv.appendChild(leftInfo);
      headerDiv.appendChild(document.createElement('div')); // empty center
      headerDiv.appendChild(rightInfo);

      // Clone the actual chart
      const originalChart = chartRef.current;
      const chartClone = originalChart.cloneNode(true);
      chartClone.style.height = '400px';
      chartClone.style.backgroundColor = '#0f172a';
      chartClone.style.borderRadius = '8px';
      chartClone.style.padding = '20px';

      // Hide screenshot button in the cloned version
      const screenshotButton = chartClone.querySelector('.screenshot-button');
      if (screenshotButton) {
        screenshotButton.style.display = 'none';
      }

      tempDiv.appendChild(headerDiv);
      tempDiv.appendChild(chartClone);
      document.body.appendChild(tempDiv);

      // Wait a bit for the chart to render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        removeContainer: true,
        height: 600,
        width: 1000,
        logging: false,
        pixelRatio: 1,
      });

      // Clean up
      document.body.removeChild(tempDiv);

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl === 'data:,') {
        throw new Error('Chart capture failed - empty data URL');
      }

      const link = document.createElement('a');
      link.download = `profit-chart-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          component: 'screenshot',
          type: 'profit_chart',
        },
      });
      console.error('Chart screenshot failed:', error);
      // eslint-disable-next-line no-alert
      alert('Chart screenshot failed. Please try again.');
    } finally {
      setIsCapturingChart(false);
    }
  };

  // Generate shareable image of heatmap
  const captureHeatmap = async () => {
    if (isCapturingHeatmap) return;

    try {
      Sentry.addBreadcrumb({
        category: 'action',
        message: 'Screenshot capture started: trading_heatmap',
        level: 'info',
      });

      // Track screenshot capture
      guestAnalytics.screenshotCaptured('trading_heatmap');

      setIsCapturingHeatmap(true);
      // Create a temporary div to render the heatmap
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '1200px';
      tempDiv.style.padding = '30px';
      tempDiv.style.backgroundColor = '#0f172a';
      tempDiv.style.color = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';

      // Header
      const headerDiv = document.createElement('div');
      headerDiv.style.marginBottom = '20px';
      headerDiv.style.display = 'flex';
      headerDiv.style.justifyContent = 'space-between';
      headerDiv.style.alignItems = 'center';
      headerDiv.style.padding = '15px 20px';
      headerDiv.style.backgroundColor = '#1e293b';
      headerDiv.style.borderRadius = '8px';
      headerDiv.style.border = '2px solid #3b82f6';

      // Left side - Title and stats
      const leftInfo = document.createElement('div');

      const title = document.createElement('h1');
      title.textContent = 'OSRS Flip Analysis - Trading Heat Map';
      title.style.fontSize = '20px';
      title.style.fontWeight = 'bold';
      title.style.margin = '0';
      title.style.color = 'white';

      const subtitle = document.createElement('p');
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      subtitle.textContent = `${guestData.uniqueItems} Items • ${guestData.dailySummaries.length} Days • Total: ${guestData.totalProfit.toLocaleString()} GP • Hours in ${userTimezone}`;
      subtitle.style.fontSize = '14px';
      subtitle.style.color = '#9CA3AF';
      subtitle.style.margin = '2px 0 0 0';

      leftInfo.appendChild(title);
      leftInfo.appendChild(subtitle);

      // Right side - Brand and date
      const rightInfo = document.createElement('div');
      rightInfo.style.textAlign = 'right';

      const brandDateText = document.createElement('p');
      // Create brand span safely
      const brandSpan = document.createElement('span');
      brandSpan.textContent = 'mreedon.com/guest';
      brandSpan.style.color = '#60a5fa';
      brandSpan.style.fontWeight = 'bold';
      brandSpan.style.fontSize = '16px';

      // Create date span safely
      const dateSpan = document.createElement('span');
      dateSpan.textContent = `Generated: ${new Date().toLocaleDateString()}`;
      dateSpan.style.color = '#94a3b8';
      dateSpan.style.fontSize = '11px';

      brandDateText.appendChild(brandSpan);
      brandDateText.appendChild(document.createElement('br'));
      brandDateText.appendChild(dateSpan);
      brandDateText.style.margin = '0';
      brandDateText.style.lineHeight = '1.3';

      rightInfo.appendChild(brandDateText);

      headerDiv.appendChild(leftInfo);
      headerDiv.appendChild(document.createElement('div')); // empty center
      headerDiv.appendChild(rightInfo);

      // Clone the heatmap
      const originalHeatmap = heatmapRef.current;
      if (!originalHeatmap) {
        throw new Error('Heatmap element not found');
      }

      const heatmapClone = originalHeatmap.cloneNode(true);

      // Hide any screenshot buttons in the clone
      const screenshotButtons = heatmapClone.querySelectorAll('.screenshot-button');
      screenshotButtons.forEach(btn => {
        btn.style.display = 'none';
      });

      tempDiv.appendChild(headerDiv);
      tempDiv.appendChild(heatmapClone);
      document.body.appendChild(tempDiv);

      // Wait a bit for rendering
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        removeContainer: true,
        width: 1200,
        logging: false,
        pixelRatio: 1,
      });

      // Clean up
      document.body.removeChild(tempDiv);

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl === 'data:,') {
        throw new Error('Heatmap capture failed - empty data URL');
      }

      const link = document.createElement('a');
      link.download = `trading-heatmap-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          component: 'screenshot',
          type: 'trading_heatmap',
        },
      });
      console.error('Heatmap screenshot failed:', error);
      // eslint-disable-next-line no-alert
      alert('Heatmap screenshot failed. Please try again.');
    } finally {
      setIsCapturingHeatmap(false);
    }
  };

  // Prepare data for daily summaries table
  const dailyTableColumns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: value => (
        <button
          onClick={() => handleDateSelect(value)}
          className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors cursor-pointer"
          title="Click to view transactions for this date"
        >
          {value}
        </button>
      ),
    },
    {
      key: 'totalProfit',
      label: 'Profit',
      sortable: true,
      render: value => (
        <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>{formatGP(value)}</span>
      ),
    },
    { key: 'flipCount', label: 'Flips', sortable: true },
    { key: 'uniqueItems', label: 'Items', sortable: true },
  ];

  // Filter items based on search
  const filterItems = (items, searchTerms) => {
    if (searchTerms.length === 0) return items;

    return items.filter(item => {
      const itemName = item.item.toLowerCase();
      return searchTerms.some(term => itemName.includes(term));
    });
  };

  // Show all items - this is their personal analysis, let them see everything
  const allItems = guestData.itemStats;
  const filteredItems = filterItems(allItems, searchTerms);
  const itemTableColumns = [
    { key: 'item', label: 'Item', sortable: true },
    {
      key: 'totalProfit',
      label: 'Total Profit',
      sortable: true,
      render: value => (
        <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>{formatGP(value)}</span>
      ),
    },
    { key: 'flipCount', label: 'Flips', sortable: true },
    { key: 'totalQuantity', label: 'Quantity', sortable: true },
  ];

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Warning about refreshing */}
      <div className="bg-orange-900/50 border border-orange-500 rounded-lg p-3 mb-6">
        <p className="text-orange-200 text-sm">
          ⚠️ <strong>Note:</strong> Your data exists only in this session. Refreshing the page will
          require re-uploading your CSV. Use the Export button to save your processed data.
        </p>
      </div>

      {/* Account filter info */}
      {originalData.metadata?.accountCount > 1 && isFiltered && (
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-6">
          <p className="text-blue-200 text-sm">
            🔍{' '}
            <strong>
              Filtering data for {selectedAccounts.length} account
              {selectedAccounts.length > 1 ? 's' : ''}:
            </strong>{' '}
            {selectedAccounts.join(', ')}
          </p>
          <p className="text-blue-300 text-xs mt-1">
            Use the account toggles above to show/hide individual account data
          </p>
        </div>
      )}

      {/* Header with clear indication this is guest mode */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold text-white">Your Flip Analysis</h1>
          <p className="text-gray-400 mt-2">
            Guest Session -{' '}
            {guestData.metadata?.dateRange
              ? `${guestData.metadata.dateRange.from} to ${guestData.metadata.dateRange.to}`
              : new Date().toLocaleDateString()}
          </p>
          <p className="text-gray-500 text-xs mt-1">Dates shown in your timezone: {userTimezone}</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              // eslint-disable-next-line no-alert
              if (window.confirm('This will clear your current data. Continue?')) {
                navigate('/guest');
              }
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Upload New CSV
          </button>
          <button
            onClick={() => exportGuestData(guestData)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Export Results
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Performance
            </button>
            <button
              onClick={() => {
                setActiveTab('fliplogs');
                // Reset selections when clicking tab directly
                if (activeTab !== 'fliplogs') {
                  setSelectedDate(null);
                  setSelectedDayHour(null);
                }
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'fliplogs'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Transaction Logs
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'ai'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Data Query
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Summary Cards - No challenge metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-gray-400 text-sm">Total Profit</div>
              <div className="text-2xl font-bold text-green-400">
                {guestData.totalProfit.toLocaleString()} GP
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-gray-400 text-sm">Total Flips</div>
              <div className="text-2xl font-bold text-white">
                {guestData.totalFlips.toLocaleString()}
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-gray-400 text-sm">Unique Items</div>
              <div className="text-2xl font-bold text-white">{guestData.uniqueItems}</div>
            </div>
          </div>

          {/* Cumulative Profit Chart */}
          <div className="bg-gray-800 p-6 rounded-lg mb-8" ref={chartRef}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Cumulative Profit Over Time</h3>
              <div className="flex items-center gap-3">
                {/* Toggle buttons for chart view mode */}
                {originalData.metadata?.accountCount > 1 && (
                  <div className="flex rounded-lg bg-gray-700 p-1">
                    <button
                      onClick={() => setChartViewMode('combined')}
                      className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                        chartViewMode === 'combined'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Combined
                    </button>
                    <button
                      onClick={() => setChartViewMode('individual')}
                      className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                        chartViewMode === 'individual'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Individual
                    </button>
                  </div>
                )}
                <button
                  onClick={captureChart}
                  disabled={isCapturingChart}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-500 disabled:opacity-50 screenshot-button"
                >
                  {isCapturingChart ? 'Capturing...' : 'Screenshot'}
                </button>
              </div>
            </div>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={(() => {
                    if (chartViewMode === 'combined') {
                      // Calculate combined cumulative profit
                      let cumulativeProfit = 0;
                      return guestData.dailySummaries.map((day, index) => {
                        cumulativeProfit += day.totalProfit;
                        // Format date for display (MM/DD)
                        const [month, dayNum] = day.date.split('-');
                        const displayLabel = `${month}/${dayNum}`;
                        return {
                          date: day.date,
                          day: index + 1,
                          displayLabel,
                          dailyProfit: day.totalProfit,
                          cumulativeProfit,
                          flips: day.flipCount,
                        };
                      });
                    } else {
                      // Calculate per-account cumulative profit
                      const accountProfits = {};
                      const dates = new Set();

                      // Only process accounts that are currently selected/visible
                      const visibleAccounts =
                        selectedAccounts.length > 0
                          ? selectedAccounts
                          : originalData.metadata?.accounts || [];
                      visibleAccounts.forEach(account => {
                        accountProfits[account] = 0;
                      });

                      // Process all flips by date
                      const dataByDate = {};
                      Object.entries(guestData.flipsByDate).forEach(([date, dayData]) => {
                        dates.add(date);
                        if (!dataByDate[date]) {
                          dataByDate[date] = {};
                          visibleAccounts.forEach(acc => {
                            dataByDate[date][acc] = 0;
                          });
                        }

                        const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];
                        flips.forEach(flip => {
                          const accountName = flip.account || flip.accountId;
                          // Only track data for visible accounts
                          if (
                            accountName &&
                            visibleAccounts.includes(accountName) &&
                            dataByDate[date]
                          ) {
                            dataByDate[date][accountName] =
                              (dataByDate[date][accountName] || 0) + (flip.profit || 0);
                          }
                        });
                      });

                      // Build cumulative data
                      // Sort dates chronologically in ascending order (MM-DD-YYYY format)
                      const sortedDates = Array.from(dates).sort((a, b) => {
                        const [aMonth, aDay, aYear] = a.split('-');
                        const [bMonth, bDay, bYear] = b.split('-');

                        // Create Date objects for proper comparison
                        const dateA = new Date(aYear, aMonth - 1, aDay);
                        const dateB = new Date(bYear, bMonth - 1, bDay);

                        return dateA - dateB;
                      });
                      const cumulativeData = {};
                      visibleAccounts.forEach(account => {
                        cumulativeData[account] = 0;
                      });

                      return sortedDates.map((date, index) => {
                        // Format date for display (MM/DD) from MM-DD-YYYY format
                        const [month, dayNum] = date.split('-');
                        const displayLabel = `${month}/${dayNum}`;
                        const dayEntry = { date, day: index + 1, displayLabel };

                        // Update cumulative for each visible account
                        visibleAccounts.forEach(account => {
                          cumulativeData[account] += dataByDate[date]?.[account] || 0;
                          dayEntry[`cumulative_${account}`] = cumulativeData[account];
                        });

                        return dayEntry;
                      });
                    }
                  })()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    vertical={true}
                    horizontal={true}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    tick={{ fill: 'transparent' }}
                    axisLine={{ stroke: '#374151' }}
                    label={{
                      value: (() => {
                        if (guestData.dailySummaries && guestData.dailySummaries.length > 0) {
                          const firstDate = guestData.dailySummaries[0].date;
                          const lastDate =
                            guestData.dailySummaries[guestData.dailySummaries.length - 1].date;
                          const [fMonth, fDay] = firstDate.split('-');
                          const [lMonth, lDay] = lastDate.split('-');
                          return `${fMonth}/${fDay} - ${lMonth}/${lDay}`;
                        }
                        return 'Date Range';
                      })(),
                      position: 'insideBottom',
                      offset: -8,
                      style: {
                        textAnchor: 'middle',
                        fill: '#9CA3AF',
                        fontSize: 16,
                        fontWeight: 500,
                      },
                    }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={value => formatGP(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: 'white',
                    }}
                    formatter={(value, name) => {
                      if (name.startsWith('cumulative_')) {
                        const accountName = name.replace('cumulative_', '');
                        return [`${value.toLocaleString()} GP`, accountName];
                      }
                      return [
                        name === 'cumulativeProfit'
                          ? `${value.toLocaleString()} GP`
                          : formatGP(value),
                        name === 'cumulativeProfit'
                          ? 'Total Profit'
                          : name === 'dailyProfit'
                            ? 'Daily Profit'
                            : name,
                      ];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return `Date: ${payload[0].payload.date}`;
                      }
                      return label;
                    }}
                  />
                  {chartViewMode === 'combined' ? (
                    <Line
                      type="monotone"
                      dataKey="cumulativeProfit"
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: '#22c55e' }}
                    />
                  ) : (
                    <>
                      {(() => {
                        // Only show lines for visible accounts
                        const visibleAccounts =
                          selectedAccounts.length > 0
                            ? selectedAccounts
                            : originalData.metadata?.accounts || [];
                        const allAccounts = originalData.metadata?.accounts || [];

                        return visibleAccounts.map(account => {
                          // Use the original index for consistent coloring
                          const index = allAccounts.indexOf(account);
                          const colors = [
                            '#3b82f6',
                            '#22c55e',
                            '#ef4444',
                            '#f59e0b',
                            '#8b5cf6',
                            '#ec4899',
                            '#14b8a6',
                            '#f97316',
                          ];
                          const color = colors[index % colors.length];

                          return (
                            <Line
                              key={account}
                              type="monotone"
                              dataKey={`cumulative_${account}`}
                              name={account}
                              stroke={color}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 5, fill: color }}
                            />
                          );
                        });
                      })()}
                      {/* Only show legend if there are visible accounts */}
                      {(selectedAccounts.length > 0
                        ? selectedAccounts
                        : originalData.metadata?.accounts || []
                      ).length > 0 && (
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          wrapperStyle={{ paddingTop: '10px' }}
                          iconType="line"
                        />
                      )}
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              {chartViewMode === 'combined'
                ? `Shows your total accumulated profit over ${guestData.dailySummaries.length} trading days`
                : `Shows individual account profit growth over ${guestData.dailySummaries.length} trading days`}
            </p>
          </div>

          {/* Trading Heat Map */}
          <div ref={heatmapRef} className="mb-8">
            <div className="flex justify-end mb-2">
              <button
                onClick={captureHeatmap}
                disabled={isCapturingHeatmap}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 disabled:opacity-50 screenshot-button"
              >
                {isCapturingHeatmap ? 'Capturing...' : 'Screenshot'}
              </button>
            </div>
            <GuestHeatMap
              guestData={guestData}
              originalData={originalData}
              onCellClick={handleHeatmapCellClick}
            />
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white">
                  Daily Summary ({guestData.dailySummaries.length} days)
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <SortableTable
                  data={guestData.dailySummaries}
                  columns={dailyTableColumns}
                  initialSortField="date"
                  initialSortDirection="desc"
                  className="text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-3">
                💡 Click any date to view detailed transactions for that day
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white">
                  All Items (
                  {searchTerms.length > 0
                    ? `${filteredItems.length} of ${allItems.length}`
                    : allItems.length}
                  )
                </h3>
              </div>

              <ItemSearch
                onSearch={setSearchTerms}
                placeholder="Search items... (e.g., 'Dragon bones' or 'Rune sword, Magic logs, Whip')"
              />

              <div className="max-h-96 overflow-y-auto">
                <SortableTable
                  data={filteredItems}
                  columns={itemTableColumns}
                  className="text-sm"
                />
              </div>

              {searchTerms.length > 0 && filteredItems.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <p>No items found matching your search.</p>
                  <p className="text-sm mt-2">
                    Try searching for partial names like "dragon" or "rune"
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'fliplogs' && (
        <div className="space-y-8">
          {/* Show flip logs based on selection */}
          {selectedDate || selectedDayHour ? (
            <GuestFlipLogViewer
              guestData={guestData}
              originalData={originalData}
              selectedDate={selectedDate}
              selectedDayHour={selectedDayHour}
              onClose={handleBackToOverview}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Date picker for daily logs */}
              <GuestDatePicker
                guestData={guestData}
                originalData={originalData}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />

              {/* Instructions */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-4">🔍 How to View Transactions</h3>
                <div className="space-y-4 text-gray-300">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-400 font-bold">1.</span>
                    <div>
                      <p className="font-medium">By Date</p>
                      <p className="text-sm text-gray-400">
                        Select a trading day from the list to view all transactions from that date
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-400 font-bold">2.</span>
                    <div>
                      <p className="font-medium">By Time Pattern</p>
                      <p className="text-sm text-gray-400">
                        Go back to the Overview tab and click on any colored cell in the heatmap to
                        view transactions for that specific day-of-week and hour
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-400 font-bold">💡</span>
                    <div>
                      <p className="font-medium">Pro Tip</p>
                      <p className="text-sm text-gray-400">
                        Use the heatmap to identify your most profitable hours, then click those
                        cells to analyze what items performed best during those times
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-8" id="performance-section">
          {/* Performance Analysis Stats */}
          <GuestPerformanceAnalysis guestData={guestData} originalData={originalData} />

          {/* Main Velocity Chart */}
          <GuestProfitVelocity
            guestData={guestData}
            originalData={originalData}
            includeStats={true}
            showMethodologyHint={true}
          />

          {/* Profit/Loss Bar Chart */}
          <GuestProfitLossChart guestData={guestData} originalData={originalData} />

          {/* Secondary Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GuestWinRateChart guestData={guestData} originalData={originalData} />
            <GuestFlipVolumeChart guestData={guestData} originalData={originalData} />
          </div>
        </div>
      )}

      {activeTab === 'ai' && <QueryBuilder data={guestData} originalData={originalData} />}
    </div>
  );
}
