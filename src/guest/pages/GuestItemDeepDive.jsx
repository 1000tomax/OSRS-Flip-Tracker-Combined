import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useGuestData } from '../contexts/GuestDataContext';
import { useAccountFilter } from '../contexts/AccountFilterContext';
import { ItemWithIcon } from '../../components/ItemIcon';
import { formatGP } from '../../utils/formatUtils';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Scatter } from 'recharts';
import { calculateItemDeepMetrics } from '../utils/dataProcessing';
// Trading time visuals disabled for now per product decision
import GuestItemTransactions from '../components/GuestItemTransactions';
import GuestItemPriceMargin from '../components/GuestItemPriceMargin';

export default function GuestItemDeepDive() {
  const navigate = useNavigate();
  const { itemName } = useParams();
  const [searchParams] = useSearchParams();
  const { guestData: originalData } = useGuestData();
  const { getFilteredData } = useAccountFilter();
  const guestData = getFilteredData() || originalData;
  const decoded = decodeURIComponent(itemName || '');

  // Basic quick stats from itemStats
  const stat = (guestData?.itemStats || []).find(s => s.item === decoded);

  // Compute deep metrics and timeline series
  const deep = useMemo(() => calculateItemDeepMetrics(decoded, guestData?.flipsByDate), [decoded, guestData]);
  const [timelineMode, setTimelineMode] = useState('cumulative'); // 'cumulative' | 'individual'

  const onBack = () => {
    const qs = searchParams.toString();
    navigate(`/guest/dashboard/items${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <nav className="text-sm text-gray-400 mb-2">
        <button onClick={onBack} className="hover:text-gray-200">Items Analysis</button>
        <span className="mx-2">›</span>
        <span className="text-gray-200">{decoded}</span>
      </nav>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <ItemWithIcon itemName={decoded} />
        </h1>
        <button onClick={onBack} className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600">← Back to list</button>
      </div>

      {!stat ? (
        <div className="bg-gray-800 p-6 rounded-lg text-gray-300">No data found for {decoded}.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total Profit</div>
            <div className={`text-2xl font-bold ${deep.totals.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatGP(deep.totals.totalProfit)}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total Flips</div>
            <div className="text-2xl font-bold text-white">{(deep.totals.flipCount || 0).toLocaleString()}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Success Rate</div>
            <div className="text-2xl font-bold text-white">{Math.round(deep.totals.successRate)}%</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Avg Profit/Flip</div>
            <div className="text-2xl font-bold text-white">{formatGP(deep.totals.avgProfit)}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Best Flip</div>
            <div className="text-2xl font-bold text-green-400">{formatGP(deep.totals.bestFlip?.profit || 0)}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Worst Flip</div>
            <div className="text-2xl font-bold text-red-400">{formatGP(deep.totals.worstFlip?.profit || 0)}</div>
          </div>
        </div>
      )}

      {/* Performance Timeline */}
      <div className="mt-6 bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white">Performance Timeline</h2>
          <div className="flex rounded-lg bg-gray-700 p-1">
            <button
              onClick={() => setTimelineMode('cumulative')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${timelineMode==='cumulative' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              Cumulative
            </button>
            <button
              onClick={() => setTimelineMode('individual')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${timelineMode==='individual' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              Individual
            </button>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {timelineMode === 'cumulative' ? (
              <LineChart data={deep.cumulativeSeries} margin={{ top: 8, right: 20, left: 10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="tsMs"
                  type="number"
                  domain={[ 'auto', 'auto' ]}
                  tickFormatter={(v) => new Date(v).toLocaleDateString()}
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(v) => `${v.toLocaleString()} GP`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: 'white' }}
                  formatter={(val, name, ctx) => {
                    if (name === 'cumulativeProfit') return [`${val.toLocaleString()} GP`, 'Cumulative'];
                    if (name === 'profit') return [`${val.toLocaleString()} GP`, 'Flip Profit'];
                    return [val, name];
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleString()}
                />
                <Legend />
                <Line type="monotone" dataKey="cumulativeProfit" name="Cumulative" stroke="#10b981" strokeWidth={3} dot={false} isAnimationActive={false} />
                {/* Flip dots colored by sign */}
                <Scatter name="Profit Flips" data={deep.cumulativeSeries.filter(d => (d.profit||0) >= 0)} dataKey="tsMs" fill="#10b981" />
                <Scatter name="Loss Flips" data={deep.cumulativeSeries.filter(d => (d.profit||0) < 0)} dataKey="tsMs" fill="#ef4444" />
              </LineChart>
            ) : (
              <LineChart data={deep.individualSeries} margin={{ top: 8, right: 20, left: 10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="tsMs"
                  type="number"
                  domain={[ 'auto', 'auto' ]}
                  tickFormatter={(v) => new Date(v).toLocaleDateString()}
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(v) => `${v.toLocaleString()} GP`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: 'white' }}
                  formatter={(val) => [`${val.toLocaleString()} GP`, 'Profit']}
                  labelFormatter={(v) => new Date(v).toLocaleString()}
                />
                <Legend />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          {timelineMode === 'cumulative' ? 'Cumulative profit over time with individual flip markers' : 'Individual flip profits over time'}
        </p>
      </div>

      {/* Price & Margin Analysis */}
      <div className="mt-6">
        <GuestItemPriceMargin flips={deep.flips} />
      </div>

      {/* Historical Transactions */}
      <div className="mt-6">
        <GuestItemTransactions flips={deep.flips} itemName={decoded} />
      </div>
    </div>
  );
}

GuestItemDeepDive.propTypes = {
  children: PropTypes.node,
};
