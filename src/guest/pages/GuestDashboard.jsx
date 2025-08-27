import { useGuestData } from '../contexts/GuestDataContext';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { formatGP } from '../../utils/formatGP';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Import existing components
import SortableTable from '../../components/SortableTable';

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
    Object.entries(guestData.flipsByDate).forEach(([date, flips]) => {
      flips.forEach(flip => {
        allFlipsFlat.push({
          date,
          item: flip.item,
          quantity: flip.quantity,
          avgBuyPrice: flip.avgBuyPrice,
          avgSellPrice: flip.avgSellPrice,
          profit: flip.profit,
          sellerTax: flip.sellerTax,
          firstBuyTime: flip.firstBuyTime,
          lastSellTime: flip.lastSellTime,
          accountId: flip.accountId,
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
}

export default function GuestDashboard() {
  const { guestData } = useGuestData();
  const navigate = useNavigate();

  // Note: We don't need to check for data here because RequireGuestData handles it
  const userTimezone = guestData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Prepare data for daily summaries table
  const dailyTableColumns = [
    { key: 'date', label: 'Date', sortable: true },
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

  // Show all items - this is their personal analysis, let them see everything
  const allItems = guestData.itemStats;
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

      {/* Account info if multiple accounts */}
      {guestData.metadata?.accountCount > 1 && (
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-6">
          <p className="text-blue-200 text-sm">
            📊 <strong>Combined data from {guestData.metadata.accountCount} accounts:</strong>{' '}
            {guestData.metadata.accounts.join(', ')}
          </p>
          <p className="text-blue-300 text-xs mt-1">
            Tip: Export accounts separately from Flipping Copilot if you want individual analysis
          </p>
        </div>
      )}

      {/* Header with clear indication this is guest mode */}
      <div className="flex justify-between items-center mb-8">
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
            📥 Export Results
          </button>
        </div>
      </div>

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
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h3 className="text-xl font-bold mb-4 text-white">📈 Cumulative Profit Over Time</h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={(() => {
                // Calculate cumulative profit
                let cumulativeProfit = 0;
                return guestData.dailySummaries.map((day, index) => {
                  cumulativeProfit += day.totalProfit;
                  return {
                    date: day.date,
                    day: index + 1,
                    dailyProfit: day.totalProfit,
                    cumulativeProfit,
                    flips: day.flipCount,
                  };
                });
              })()}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="day"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                label={{
                  value: 'Day',
                  position: 'insideBottom',
                  offset: -5,
                  style: { textAnchor: 'middle', fill: '#9CA3AF' },
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
                formatter={(value, name) => [
                  name === 'cumulativeProfit' ? `${value.toLocaleString()} GP` : formatGP(value),
                  name === 'cumulativeProfit'
                    ? 'Total Profit'
                    : name === 'dailyProfit'
                      ? 'Daily Profit'
                      : name,
                ]}
                labelFormatter={day => `Day ${day}`}
              />
              <Line
                type="monotone"
                dataKey="cumulativeProfit"
                stroke="#22c55e"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#22c55e' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Shows your total accumulated profit over {guestData.dailySummaries.length} trading days
        </p>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4 text-white">
            Daily Summary ({guestData.dailySummaries.length} days)
          </h3>
          <div className="max-h-96 overflow-y-auto">
            <SortableTable
              data={guestData.dailySummaries}
              columns={dailyTableColumns}
              className="text-sm"
            />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4 text-white">All Items ({allItems.length})</h3>
          <div className="max-h-96 overflow-y-auto">
            <SortableTable data={allItems} columns={itemTableColumns} className="text-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
