import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getItemTimePatterns } from '../utils/dataProcessing';
import { formatGP } from '../../utils/formatUtils';

const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GuestItemTimeBars({ itemName, guestData, defaultMetric = 'profit' }) {
  const [metric, setMetric] = useState(defaultMetric); // 'profit' | 'flips' | 'avg'
  const cells = useMemo(
    () => getItemTimePatterns(itemName, guestData?.flipsByDate),
    [itemName, guestData]
  );

  const hourly = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ hour: h, profit: 0, flips: 0, avg: 0 }));
    cells.forEach(c => {
      arr[c.hour].profit += c.profit;
      arr[c.hour].flips += c.flips;
    });
    arr.forEach(a => {
      a.avg = a.flips > 0 ? a.profit / a.flips : 0;
    });
    return arr;
  }, [cells]);

  const daily = useMemo(() => {
    const arr = Array.from({ length: 7 }, (_, d) => ({ day: d, profit: 0, flips: 0, avg: 0 }));
    cells.forEach(c => {
      arr[c.day].profit += c.profit;
      arr[c.day].flips += c.flips;
    });
    arr.forEach(a => {
      a.avg = a.flips > 0 ? a.profit / a.flips : 0;
    });
    return arr;
  }, [cells]);

  const yTick = v => (metric === 'flips' ? v.toString() : formatGP(v));
  const barKey = metric;
  const barColor = metric === 'flips' ? '#3b82f6' : metric === 'avg' ? '#8b5cf6' : '#10b981';

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-white">When To Trade</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setMetric('profit')}
            className={`px-3 py-1 text-sm rounded ${metric === 'profit' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Profit
          </button>
          <button
            onClick={() => setMetric('flips')}
            className={`px-3 py-1 text-sm rounded ${metric === 'flips' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Flips
          </button>
          <button
            onClick={() => setMetric('avg')}
            className={`px-3 py-1 text-sm rounded ${metric === 'avg' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            GP/Flip
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-56">
          <div className="text-sm text-gray-300 mb-1">By Hour</div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="hour"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={h => h.toString()}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={yTick} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  color: 'white',
                }}
                formatter={v =>
                  metric === 'flips'
                    ? [v, 'Flips']
                    : [formatGP(v), metric === 'avg' ? 'GP/Flip' : 'Profit']
                }
              />
              <Bar dataKey={barKey} fill={barColor} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-56">
          <div className="text-sm text-gray-300 mb-1">By Day of Week</div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="day"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={d => dayNamesShort[d]}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={yTick} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  color: 'white',
                }}
                formatter={v =>
                  metric === 'flips'
                    ? [v, 'Flips']
                    : [formatGP(v), metric === 'avg' ? 'GP/Flip' : 'Profit']
                }
              />
              <Bar dataKey={barKey} fill={barColor} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

GuestItemTimeBars.propTypes = {
  itemName: PropTypes.string.isRequired,
  guestData: PropTypes.object,
  defaultMetric: PropTypes.oneOf(['profit', 'flips', 'avg']),
};
