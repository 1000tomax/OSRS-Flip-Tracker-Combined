import React, { useMemo, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatGP } from '../../utils/formatUtils';
import html2canvas from 'html2canvas-pro';

export default function GuestProfitVelocity({
  guestData,
  includeStats = false,
  showMethodologyHint = false,
}) {
  const chartRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Process data for the velocity chart
  const velocityData = useMemo(() => {
    if (!guestData?.flipsByDate) return [];

    const dailyData = {};

    // Process flips by date
    Object.entries(guestData.flipsByDate).forEach(([date, dayData]) => {
      const flips = Array.isArray(dayData) ? dayData : dayData.flips || [];

      if (!Array.isArray(flips)) return;

      let totalProfit = 0;
      let flipCount = 0;
      let profitableFlips = 0;
      let totalDurationMinutes = 0;
      let flipsWithDuration = 0;

      flips.forEach(flip => {
        const profit = flip.profit || 0;
        totalProfit += profit;
        flipCount += 1;

        if (profit > 0) {
          profitableFlips += 1;
        }

        // Try to calculate duration if timestamps exist
        const firstBuy = flip.firstBuyTime || flip.first_buy_time;
        const lastSell = flip.lastSellTime || flip.last_sell_time;

        if (firstBuy && lastSell) {
          const buyTime = new Date(firstBuy);
          const sellTime = new Date(lastSell);

          if (!isNaN(buyTime.getTime()) && !isNaN(sellTime.getTime())) {
            const durationMinutes = (sellTime - buyTime) / (1000 * 60);

            if (durationMinutes > 0 && durationMinutes < 10080) {
              // Cap at 1 week
              totalDurationMinutes += durationMinutes;
              flipsWithDuration += 1;
            }
          }
        }
      });

      if (flipCount > 0) {
        dailyData[date] = {
          date,
          totalProfit,
          flipCount,
          profitableFlips,
          totalDurationMinutes,
          flipsWithDuration,
        };
      }
    });

    // Sort by date and calculate GP/Hour
    const sortedDays = Object.values(dailyData)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((day, index) => {
        const dayNumber = index + 1;

        // Calculate GP/Hour if we have duration data
        let gpPerHour = 0;
        if (day.flipsWithDuration > 0 && day.totalDurationMinutes > 0) {
          // Divide by 8 to estimate active trading time (accounting for parallel GE slots)
          const estimatedActiveMinutes = day.totalDurationMinutes / 8;
          gpPerHour = (day.totalProfit / estimatedActiveMinutes) * 60;
        }

        // Format date for display
        const dateObj = new Date(day.date);
        const displayDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

        return {
          ...day,
          dayNumber,
          displayLabel: `Day ${dayNumber}`, // Back to day numbers for cleaner display
          displayDate, // Keep the actual date for tooltips
          gpPerHour,
          // Fallback to daily profit if no timing data
          displayValue: gpPerHour > 0 ? gpPerHour : day.totalProfit,
          hasTimingData: day.flipsWithDuration > 0,
        };
      });

    return sortedDays;
  }, [guestData]);

  // Check if we have any timing data
  const hasAnyTimingData = velocityData.some(day => day.hasTimingData);

  // Screenshot function
  const captureChart = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);

      // If includeStats is true, capture the entire performance section
      let elementToCapture;
      if (includeStats) {
        elementToCapture = document.getElementById('performance-section');
        if (!elementToCapture) {
          console.error('Performance section not found');
          return;
        }
      } else if (!chartRef.current) {
        return;
      }

      // Create a wrapper div for the screenshot
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '1400px';
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
      title.textContent = hasAnyTimingData ? 'Daily Profit Velocity' : 'Daily Profit Trend';
      title.style.fontSize = '20px';
      title.style.fontWeight = 'bold';
      title.style.margin = '0';
      title.style.color = 'white';

      const subtitle = document.createElement('p');
      subtitle.textContent = `${velocityData.length} Trading Days • Total: ${formatGP(guestData.totalProfit)}`;
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

      if (includeStats) {
        // Clone the entire performance section
        const sectionClone = elementToCapture.cloneNode(true);

        // Hide all screenshot buttons in the clone
        const screenshotButtons = sectionClone.querySelectorAll('.screenshot-button');
        screenshotButtons.forEach(btn => (btn.style.display = 'none'));

        tempDiv.appendChild(headerDiv);
        tempDiv.appendChild(sectionClone);
      } else {
        // Clone just the chart
        const chartClone = chartRef.current.cloneNode(true);
        chartClone.style.height = '400px';

        // Hide screenshot button in clone
        const screenshotBtn = chartClone.querySelector('.screenshot-button');
        if (screenshotBtn) screenshotBtn.style.display = 'none';

        tempDiv.appendChild(headerDiv);
        tempDiv.appendChild(chartClone);
      }

      document.body.appendChild(tempDiv);

      await new Promise(resolve => setTimeout(resolve, 1500));

      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#0f172a',
        scale: 2,
        width: 1400,
        logging: false,
        windowHeight: tempDiv.scrollHeight,
      });

      document.body.removeChild(tempDiv);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const filename = includeStats
        ? `performance-analysis-${new Date().toISOString().split('T')[0]}.png`
        : `profit-velocity-${new Date().toISOString().split('T')[0]}.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
      console.error('Screenshot failed. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (velocityData.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Daily Profit Velocity</h2>
        <p className="text-gray-400">No data available for velocity analysis</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-6" ref={chartRef}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">
            {hasAnyTimingData ? 'Daily Profit Velocity' : 'Daily Profit Trend'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {hasAnyTimingData
              ? 'GP per hour efficiency across trading days'
              : 'Daily profit performance across trading days'}
          </p>
        </div>
        <button
          onClick={captureChart}
          disabled={isCapturing}
          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-500 disabled:opacity-50 screenshot-button"
        >
          {isCapturing ? 'Capturing...' : includeStats ? 'Screenshot All' : 'Screenshot'}
        </button>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={velocityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="displayLabel"
              stroke="#9CA3AF"
              tick={false} // Hide individual tick labels
              label={{
                value:
                  velocityData.length > 0
                    ? `${velocityData[0].displayDate} - ${velocityData[velocityData.length - 1].displayDate}`
                    : '',
                position: 'insideBottom',
                offset: -5,
                style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 14, fontWeight: 500 },
              }}
            />
            <YAxis
              stroke="#9CA3AF"
              tickFormatter={formatGP}
              label={{
                value: hasAnyTimingData ? 'GP/Hour' : 'Daily Profit',
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
              content={props => {
                const { active, payload, label } = props;
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
                      <p className="text-white font-medium">{data.displayDate}</p>
                      <p className="text-gray-400 text-xs">{label}</p>
                      <p className="text-green-400">
                        {hasAnyTimingData ? 'GP/Hour' : 'Profit'}:{' '}
                        {formatGP(Math.round(data.displayValue))}
                      </p>
                      <p className="text-gray-300 text-sm">Flips: {data.flipCount}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="displayValue"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {hasAnyTimingData && showMethodologyHint && (
        <div className="mt-4 bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
          <p className="text-sm text-blue-300">
            <span className="font-semibold">📊 Note:</span> Our GP/Hour calculation may differ from
            Flipping Copilot's numbers.
            <button
              onClick={() => {
                // Find and click the methodology button in the performance analysis component
                const methodButton = document.querySelector('[data-methodology-button]');
                if (methodButton) {
                  methodButton.click();
                } else {
                  // Scroll to the stats cards where the button is
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="ml-2 text-blue-400 hover:text-blue-300 underline font-medium"
            >
              See why the numbers differ →
            </button>
          </p>
        </div>
      )}

      {!hasAnyTimingData && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          💡 GP/Hour calculation requires timestamp data. Showing daily profit instead.
        </p>
      )}
    </div>
  );
}
