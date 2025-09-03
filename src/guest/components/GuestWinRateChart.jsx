import React, { useMemo, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import html2canvas from 'html2canvas-pro';

export default function GuestWinRateChart({ guestData }) {
  const chartRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Process data for win rate chart
  const winRateData = useMemo(() => {
    if (!guestData?.flipsByDate) return [];

    const dailyData = [];

    // Process flips by date
    Object.entries(guestData.flipsByDate).forEach(([date, dayData]) => {
      const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];

      if (!Array.isArray(flips) || flips.length === 0) return;

      let totalFlips = 0;
      let profitableFlips = 0;
      let totalProfit = 0;

      flips.forEach(flip => {
        const profit = flip.profit || 0;
        totalFlips += 1;
        totalProfit += profit;

        if (profit > 0) {
          profitableFlips += 1;
        }
      });

      if (totalFlips > 0) {
        dailyData.push({
          date,
          winRate: (profitableFlips / totalFlips) * 100,
          totalFlips,
          profitableFlips,
          totalProfit,
        });
      }
    });

    // Sort by date and add day numbers
    return dailyData
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((day, index) => {
        // Format date for display (MM/DD/YYYY)
        const dateObj = new Date(day.date);
        const displayDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

        return {
          ...day,
          dayNumber: index + 1,
          displayLabel: `Day ${index + 1}`, // Use day numbers for cleaner axis
          displayDate, // Keep actual date for tooltip
        };
      });
  }, [guestData]);

  // Calculate average win rate
  const avgWinRate = useMemo(() => {
    if (winRateData.length === 0) return 0;
    const totalFlips = winRateData.reduce((acc, day) => acc + day.totalFlips, 0);
    const totalProfitable = winRateData.reduce((acc, day) => acc + day.profitableFlips, 0);
    return totalFlips > 0 ? (totalProfitable / totalFlips) * 100 : 0;
  }, [winRateData]);

  // Screenshot function
  const captureChart = async () => {
    if (isCapturing || !chartRef.current) return;

    try {
      setIsCapturing(true);

      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '1000px';
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

      const leftInfo = document.createElement('div');
      const title = document.createElement('h1');
      title.textContent = 'Profitable Trades Percentage';
      title.style.fontSize = '20px';
      title.style.fontWeight = 'bold';
      title.style.margin = '0';
      title.style.color = 'white';

      const subtitle = document.createElement('p');
      subtitle.textContent = `Average: ${avgWinRate.toFixed(1)}% • ${winRateData.length} Trading Days`;
      subtitle.style.fontSize = '14px';
      subtitle.style.color = '#9CA3AF';
      subtitle.style.margin = '2px 0 0 0';

      leftInfo.appendChild(title);
      leftInfo.appendChild(subtitle);

      const rightInfo = document.createElement('div');
      rightInfo.style.textAlign = 'right';
      const brandSpan = document.createElement('span');
      brandSpan.textContent = 'mreedon.com/guest';
      brandSpan.style.color = '#60a5fa';
      brandSpan.style.fontWeight = 'bold';
      brandSpan.style.fontSize = '16px';
      rightInfo.appendChild(brandSpan);

      headerDiv.appendChild(leftInfo);
      headerDiv.appendChild(document.createElement('div'));
      headerDiv.appendChild(rightInfo);

      // Clone the chart
      const chartClone = chartRef.current.cloneNode(true);
      chartClone.style.height = '350px';

      // Hide screenshot button in clone
      const screenshotBtn = chartClone.querySelector('.screenshot-button');
      if (screenshotBtn) screenshotBtn.style.display = 'none';

      tempDiv.appendChild(headerDiv);
      tempDiv.appendChild(chartClone);
      document.body.appendChild(tempDiv);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#0f172a',
        scale: 2,
        width: 1000,
        logging: false,
      });

      document.body.removeChild(tempDiv);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `win-rate-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
      console.error('Screenshot failed. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (winRateData.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">% of Profitable Trades</h2>
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-6" ref={chartRef}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">% of Profitable Trades</h2>
          <p className="text-sm text-gray-400 mt-1">
            Daily win rate trend (Average: {avgWinRate.toFixed(1)}%)
          </p>
        </div>
        <button
          onClick={captureChart}
          disabled={isCapturing}
          className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-500 disabled:opacity-50 screenshot-button"
        >
          {isCapturing ? 'Capturing...' : 'Screenshot'}
        </button>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={winRateData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="displayLabel"
              stroke="#9CA3AF"
              tick={false} // Hide individual tick labels
              label={{
                value:
                  winRateData.length > 0
                    ? `${winRateData[0].displayDate} - ${winRateData[winRateData.length - 1].displayDate}`
                    : '',
                position: 'insideBottom',
                offset: -5,
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 14, fontWeight: 500 },
              }}
            />
            <YAxis
              stroke="#9CA3AF"
              domain={[
                dataMin => Math.max(0, Math.floor(dataMin * 0.9)), // 10% below min, but not below 0
                dataMax => Math.min(100, Math.ceil(dataMax * 1.1)), // 10% above max, but not above 100
              ]}
              tickFormatter={value => `${value}%`}
              label={{
                value: 'Win Rate (%)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 12 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              formatter={(value, name) => {
                if (name === 'winRate') {
                  return [`${value.toFixed(1)}%`, 'Win Rate'];
                }
                return [value, name];
              }}
              labelFormatter={label => label}
              content={props => {
                const { active, payload, label } = props;
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
                      <p className="text-white font-medium">{data.displayDate}</p>
                      <p className="text-gray-400 text-xs">{label}</p>
                      <p className="text-yellow-400">Win Rate: {data.winRate.toFixed(1)}%</p>
                      <p className="text-gray-300 text-sm">
                        {data.profitableFlips} / {data.totalFlips} profitable
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Average win rate reference line */}
            <ReferenceLine
              y={avgWinRate}
              stroke="#6B7280"
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${avgWinRate.toFixed(0)}%`,
                position: 'right',
                style: { fill: '#9CA3AF', fontSize: 11 },
              }}
            />
            {/* 50% reference line */}
            <ReferenceLine y={50} stroke="#374151" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="winRate"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-900/50 rounded p-2">
          <p className="text-xs text-gray-400">Best Day</p>
          <p className="text-sm font-bold text-green-400">
            {Math.max(...winRateData.map(d => d.winRate)).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gray-900/50 rounded p-2">
          <p className="text-xs text-gray-400">Average</p>
          <p className="text-sm font-bold text-yellow-400">{avgWinRate.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-900/50 rounded p-2">
          <p className="text-xs text-gray-400">Worst Day</p>
          <p className="text-sm font-bold text-red-400">
            {Math.min(...winRateData.map(d => d.winRate)).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
