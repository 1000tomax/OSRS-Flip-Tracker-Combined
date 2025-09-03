import React, { useMemo, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import html2canvas from 'html2canvas-pro';

export default function GuestFlipVolumeChart({ guestData }) {
  const chartRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Process data for flip volume chart
  const volumeData = useMemo(() => {
    if (!guestData?.flipsByDate) return [];

    const dailyData = [];

    // Process flips by date
    Object.entries(guestData.flipsByDate).forEach(([date, dayData]) => {
      const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];

      if (!Array.isArray(flips)) return;

      const flipCount = flips.length;
      const totalProfit = flips.reduce((sum, flip) => sum + (flip.profit || 0), 0);
      const uniqueItems = new Set(flips.map(flip => flip.item)).size;

      if (flipCount > 0) {
        dailyData.push({
          date,
          flipCount,
          totalProfit,
          uniqueItems,
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
          // Color based on profit
          barColor: day.totalProfit >= 0 ? '#22c55e' : '#ef4444',
        };
      });
  }, [guestData]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (volumeData.length === 0) return null;

    const flipCounts = volumeData.map(d => d.flipCount);
    const avgFlips = flipCounts.reduce((a, b) => a + b, 0) / flipCounts.length;
    const maxFlips = Math.max(...flipCounts);
    const minFlips = Math.min(...flipCounts);
    const totalFlips = flipCounts.reduce((a, b) => a + b, 0);

    return {
      avgFlips: Math.round(avgFlips),
      maxFlips,
      minFlips,
      totalFlips,
      bestDay: volumeData.find(d => d.flipCount === maxFlips),
    };
  }, [volumeData]);

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
      title.textContent = 'Daily Flip Volume';
      title.style.fontSize = '20px';
      title.style.fontWeight = 'bold';
      title.style.margin = '0';
      title.style.color = 'white';

      const subtitle = document.createElement('p');
      subtitle.textContent = `Total: ${stats?.totalFlips || 0} flips • Average: ${stats?.avgFlips || 0} per day`;
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
      link.download = `flip-volume-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
      console.error('Screenshot failed. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (volumeData.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Daily Flip Volume</h2>
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.displayDate}</p>
          <p className="text-gray-400 text-xs">{data.displayLabel}</p>
          <p className="text-purple-400">
            Flips: <span className="font-bold">{data.flipCount}</span>
          </p>
          <p className="text-gray-300 text-sm">Items: {data.uniqueItems}</p>
          <p className={data.totalProfit >= 0 ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
            Profit: {data.totalProfit.toLocaleString()} GP
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-6" ref={chartRef}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Daily Flip Volume</h2>
          <p className="text-sm text-gray-400 mt-1">Number of flips completed per day</p>
        </div>
        <button
          onClick={captureChart}
          disabled={isCapturing}
          className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-500 disabled:opacity-50 screenshot-button"
        >
          {isCapturing ? 'Capturing...' : 'Screenshot'}
        </button>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={volumeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="displayLabel"
              stroke="#9CA3AF"
              tick={false} // Hide individual tick labels
              label={{
                value:
                  volumeData.length > 0
                    ? `${volumeData[0].displayDate} - ${volumeData[volumeData.length - 1].displayDate}`
                    : '',
                position: 'insideBottom',
                offset: -5,
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 14, fontWeight: 500 },
              }}
            />
            <YAxis
              stroke="#9CA3AF"
              label={{
                value: 'Number of Flips',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 12 },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="flipCount" radius={[4, 4, 0, 0]}>
              {volumeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.barColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-900/50 rounded p-2">
            <p className="text-xs text-gray-400">Most Active</p>
            <p className="text-sm font-bold text-purple-400">{stats.maxFlips} flips</p>
            <p className="text-xs text-gray-500">{stats.bestDay?.displayLabel}</p>
          </div>
          <div className="bg-gray-900/50 rounded p-2">
            <p className="text-xs text-gray-400">Average</p>
            <p className="text-sm font-bold text-blue-400">{stats.avgFlips} flips/day</p>
          </div>
          <div className="bg-gray-900/50 rounded p-2">
            <p className="text-xs text-gray-400">Total Volume</p>
            <p className="text-sm font-bold text-green-400">
              {stats.totalFlips.toLocaleString()} flips
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
