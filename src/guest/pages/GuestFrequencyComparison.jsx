import { useGuestData } from '../contexts/GuestDataContext';
import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatGP } from '../../utils/formatUtils';

const TEST_START_TIME = '2025-09-08T18:04:27.000Z';
const TARGET_ACCOUNTS = ['Iron Nuggget', 'Mreedon97'];
const GAP_THRESHOLD_HOURS = 2; // Consider gaps larger than 2 hours as significant
const GAP_VISUAL_WIDTH = 0.5; // Visual width for gaps on the chart

function FrequencyComparisonChart({ chartData, gapMarkers, accountStats }) {
  const formatTooltipDate = dateStr => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-bold text-white mb-4">Cumulative Profit Comparison</h3>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="displayPosition"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              tick={{ fill: '#9CA3AF' }}
              domain={['dataMin', 'dataMax']}
              type="number"
              tickFormatter={value => {
                // Find the closest data point to this tick value
                const point = chartData.find(d => Math.abs(d.displayPosition - value) < 0.1);
                if (point) {
                  return `${point.actualHours}h`;
                }
                // For ticks that don't match exact data points, interpolate
                return '';
              }}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              tickFormatter={value => formatGP(value)}
              domain={[0, 'dataMax']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: 'white',
              }}
              formatter={(value, name, _props) => {
                let displayName;
                if (name === 'ironNugggetCumulative') {
                  displayName = 'Iron Nuggget (30min)';
                } else if (name === 'mreedon97Cumulative') {
                  displayName = 'Mreedon97 (5min)';
                } else {
                  displayName = name;
                }
                return [`${value.toLocaleString()} GP`, displayName];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  const data = payload[0].payload;
                  const actualHours = data.actualHours;
                  const actualTime = formatTooltipDate(data.timestamp);
                  const gapInfo =
                    data.hoursSinceLastTransaction > GAP_THRESHOLD_HOURS
                      ? ` (${data.hoursSinceLastTransaction.toFixed(1)}h gap)`
                      : '';
                  return `${actualHours}h from start (${actualTime})${gapInfo}`;
                }
                return label;
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ paddingBottom: '20px' }}
              iconType="line"
            />
            {accountStats['Iron Nuggget'] && (
              <Line
                type="monotone"
                dataKey="ironNugggetCumulative"
                name="Iron Nuggget (30min frequency)"
                stroke="#ef4444"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#ef4444' }}
              />
            )}
            {accountStats['Mreedon97'] && (
              <Line
                type="monotone"
                dataKey="mreedon97Cumulative"
                name="Mreedon97 (5min frequency)"
                stroke="#22c55e"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#22c55e' }}
              />
            )}
            {/* Add visual markers for time gaps */}
            {gapMarkers &&
              gapMarkers.map((gap, index) => (
                <ReferenceLine
                  key={`gap-${index}`}
                  x={gap.position}
                  stroke="#fbbf24"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: `${gap.duration.toFixed(1)}h gap`,
                    position: 'top',
                    fill: '#fbbf24',
                    fontSize: 10,
                  }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-gray-400 mt-4">
        Comparison of cumulative profit between 5-minute and 30-minute frequency trading accounts
        from test start. Each point represents a completed transaction (plotted by sell completion
        time). Yellow dashed lines indicate time gaps longer than {GAP_THRESHOLD_HOURS} hours that
        have been compressed for clarity.
      </p>
    </div>
  );
}

function SummaryStats({ accountStats }) {
  const formatDate = dateStr => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {TARGET_ACCOUNTS.map(account => {
        const stats = accountStats[account];
        const frequencyLabel = account === 'Iron Nuggget' ? '30-minute' : '5-minute';
        const color = account === 'Iron Nuggget' ? 'red' : 'green';

        if (!stats) {
          return (
            <div key={account} className="bg-gray-800 p-6 rounded-lg border-2 border-gray-700">
              <h3 className={`text-lg font-bold text-${color}-400 mb-4`}>
                {account} ({frequencyLabel})
              </h3>
              <div className="text-center py-8">
                <div className="text-gray-400 text-sm">No data found for this account</div>
                <div className="text-gray-500 text-xs mt-2">
                  Account may not exist in uploaded data or no transactions since test start
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={account}
            className={`bg-gray-800 p-6 rounded-lg border-2 border-${color}-500/30`}
          >
            <h3 className={`text-lg font-bold text-${color}-400 mb-4`}>
              {account} ({frequencyLabel})
            </h3>
            <div className="space-y-3">
              <div>
                <div className="text-gray-400 text-sm">Final Profit</div>
                <div className={`text-2xl font-bold text-${color}-400`}>
                  {stats.totalProfit.toLocaleString()} GP
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 text-sm">Transactions</div>
                  <div className="text-lg font-semibold text-white">{stats.transactionCount}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Avg Profit/Trade</div>
                  <div className="text-lg font-semibold text-white">
                    {(stats.totalProfit / stats.transactionCount).toLocaleString()} GP
                  </div>
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">First Transaction</div>
                <div className="text-sm text-gray-300">{formatDate(stats.firstTransaction)}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Last Transaction</div>
                <div className="text-sm text-gray-300">{formatDate(stats.lastTransaction)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GuestFrequencyComparison() {
  const { guestData } = useGuestData();

  const { chartData, gapMarkers, accountStats, testDuration, hasValidAccounts } = useMemo(() => {
    if (!guestData?.flipsByDate) {
      return {
        chartData: [],
        gapMarkers: [],
        accountStats: {},
        testDuration: 0,
        hasValidAccounts: false,
      };
    }

    const testStartDate = new Date(TEST_START_TIME);
    const accountData = {};
    let hasAnyTargetAccount = false;

    // Initialize account tracking
    TARGET_ACCOUNTS.forEach(account => {
      accountData[account] = {
        transactions: [],
        totalProfit: 0,
        transactionCount: 0,
        firstTransaction: null,
        lastTransaction: null,
      };
    });

    // Process all transactions to find target accounts
    Object.entries(guestData.flipsByDate).forEach(([_date, dayData]) => {
      const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];

      flips.forEach(flip => {
        const accountName = flip.account || flip.accountId;
        const lastSellTime = flip.lastSellTime || flip.last_sell_time || flip['Last sell time'];
        const profit = flip.profit || flip.Profit || 0;
        const status = flip.status || flip.Status;

        // Only include FINISHED transactions from target accounts since test start
        if (
          TARGET_ACCOUNTS.includes(accountName) &&
          status === 'FINISHED' &&
          lastSellTime &&
          new Date(lastSellTime) >= testStartDate
        ) {
          hasAnyTargetAccount = true;
          accountData[accountName].transactions.push({
            timestamp: lastSellTime,
            profit,
            item: flip.item || flip.Item,
          });
        }
      });
    });

    // Sort transactions by timestamp and calculate cumulative data
    const allTransactions = [];

    TARGET_ACCOUNTS.forEach(account => {
      if (accountData[account].transactions.length > 0) {
        accountData[account].transactions.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        accountData[account].totalProfit = accountData[account].transactions.reduce(
          (sum, t) => sum + t.profit,
          0
        );
        accountData[account].transactionCount = accountData[account].transactions.length;
        accountData[account].firstTransaction = accountData[account].transactions[0].timestamp;
        accountData[account].lastTransaction =
          accountData[account].transactions[accountData[account].transactions.length - 1].timestamp;

        // Add to combined timeline
        accountData[account].transactions.forEach(transaction => {
          allTransactions.push({
            ...transaction,
            account,
          });
        });
      }
    });

    // Sort all transactions by timestamp
    allTransactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Build cumulative chart data with discontinuous scale
    const chartData = [];
    const gapMarkers = [];
    const cumulatives = {
      'Iron Nuggget': 0,
      Mreedon97: 0,
    };

    // Helper function to calculate hours from start
    const getHoursFromStart = timestamp => {
      const diffMs = new Date(timestamp) - testStartDate;
      return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal
    };

    // Start with 0,0 point at test start
    let currentDisplayPosition = 0;
    let lastTimestamp = TEST_START_TIME;

    chartData.push({
      timestamp: TEST_START_TIME,
      hoursFromStart: 0,
      actualHours: 0,
      displayPosition: 0,
      timeLabel: '0h',
      ironNugggetCumulative: 0,
      mreedon97Cumulative: 0,
      isGap: false,
    });

    // Add cumulative points for each transaction with gap detection
    allTransactions.forEach((transaction, index) => {
      const hoursFromStart = getHoursFromStart(transaction.timestamp);
      const hoursSinceLastTransaction =
        getHoursFromStart(transaction.timestamp) -
        (index === 0 ? 0 : getHoursFromStart(lastTimestamp));

      // Check if there's a significant gap
      if (hoursSinceLastTransaction > GAP_THRESHOLD_HOURS && index > 0) {
        // Add gap marker
        const gapStart = currentDisplayPosition;
        currentDisplayPosition += GAP_VISUAL_WIDTH;

        gapMarkers.push({
          position: gapStart + GAP_VISUAL_WIDTH / 2,
          duration: hoursSinceLastTransaction,
          startTime: lastTimestamp,
          endTime: transaction.timestamp,
        });
      } else if (index > 0) {
        // Normal progression without gap
        currentDisplayPosition += Math.min(hoursSinceLastTransaction, GAP_THRESHOLD_HOURS);
      }

      cumulatives[transaction.account] += transaction.profit;

      chartData.push({
        timestamp: transaction.timestamp,
        hoursFromStart,
        actualHours: hoursFromStart,
        displayPosition: currentDisplayPosition,
        timeLabel: `${hoursFromStart}h`,
        ironNugggetCumulative: cumulatives['Iron Nuggget'],
        mreedon97Cumulative: cumulatives['Mreedon97'],
        isGap: false,
        hoursSinceLastTransaction: index === 0 ? 0 : hoursSinceLastTransaction,
      });

      lastTimestamp = transaction.timestamp;
    });

    // Calculate test duration
    const lastTransaction =
      allTransactions.length > 0
        ? new Date(allTransactions[allTransactions.length - 1].timestamp)
        : testStartDate;
    const testDuration = Math.max(0, (lastTransaction - testStartDate) / (1000 * 60 * 60 * 24));

    return {
      chartData,
      gapMarkers,
      accountStats: accountData,
      testDuration,
      hasValidAccounts: hasAnyTargetAccount,
    };
  }, [guestData]);

  if (!guestData) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">No Data Available</h2>
          <p className="text-red-200">Please upload CSV data first to use this comparison tool.</p>
        </div>
      </div>
    );
  }

  if (!hasValidAccounts) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Missing Target Accounts</h2>
          <p className="text-yellow-200 mb-4">
            Could not find the required accounts for frequency comparison:
          </p>
          <ul className="list-disc list-inside text-yellow-200 mb-4">
            <li>
              <strong>Iron Nuggget</strong> (30-minute frequency)
            </li>
            <li>
              <strong>Mreedon97</strong> (5-minute frequency)
            </li>
          </ul>
          <div className="text-sm text-yellow-300">
            <p>
              <strong>Possible causes:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 ml-4">
              <li>Account names don't match exactly (check spelling)</li>
              <li>
                No FINISHED transactions since test start:{' '}
                {new Date(TEST_START_TIME).toLocaleString()}
              </li>
              <li>Data uploaded doesn't include these accounts</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white">
          Account Frequency Test - Internal Use Only
        </h1>
        <p className="text-gray-400 mt-2">
          Comparing 5-minute vs 30-minute frequency trading strategies
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Test Period: {new Date(TEST_START_TIME).toLocaleString()} - {testDuration.toFixed(1)} days
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-orange-900/50 border border-orange-500 rounded-lg p-4 mb-8">
        <p className="text-orange-200 text-sm">
          🔬 <strong>Internal Testing Tool:</strong> This page is unlisted and designed for
          controlled frequency comparison analysis. Data shown only includes FINISHED transactions
          from target accounts since the test start time.
        </p>
      </div>

      {/* Summary Statistics */}
      <SummaryStats accountStats={accountStats} />

      {/* Chart */}
      <FrequencyComparisonChart
        chartData={chartData}
        gapMarkers={gapMarkers}
        accountStats={accountStats}
      />

      {/* Test Details */}
      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-white mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-gray-400 mb-2">Target Accounts</div>
            <ul className="space-y-1 text-gray-300">
              <li>
                • <strong>Iron Nuggget:</strong> 30-minute frequency (lower frequency, higher
                margins)
              </li>
              <li>
                • <strong>Mreedon97:</strong> 5-minute frequency (higher frequency, lower margins)
              </li>
            </ul>
          </div>
          <div>
            <div className="text-gray-400 mb-2">Filters Applied</div>
            <ul className="space-y-1 text-gray-300">
              <li>• Status = "FINISHED" only</li>
              <li>• Start Date: {new Date(TEST_START_TIME).toLocaleString()}</li>
              <li>• Using "Last sell time" for chronological order (profit recognition time)</li>
              <li>• Cumulative profit calculated from "Profit" column</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
