import React, { useState } from 'react';
import HeatMapGrid from '../components/analytics/HeatMapGrid';
import InsightCard from '../components/analytics/InsightCard';
import { useHeatMapData } from '../hooks/useHeatMapData';
import {
  PageContainer,
  PageHeader,
  CardContainer,
  LoadingLayout,
  ErrorLayout,
} from '../components/layouts';

export default function TradingHeatMap() {
  const [dateRange, setDateRange] = useState(30);
  const [metric, setMetric] = useState('profit');
  const [colorScheme, setColorScheme] = useState('green-wide');

  const { heatMapData, insights, loading, error } = useHeatMapData(dateRange, metric);

  if (loading) {
    return <LoadingLayout message="Loading trading activity data..." />;
  }

  if (error) {
    return <ErrorLayout error={error} />;
  }

  const hasData = Object.keys(heatMapData).length > 0;

  return (
    <PageContainer>
      <PageHeader
        title="Trading Activity Heat Map"
        subtitle="Discover your optimal trading times and patterns"
      />

      <div className="space-y-6">
        <CardContainer>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex flex-wrap gap-2">
              <select
                value={dateRange}
                onChange={e => setDateRange(Number(e.target.value))}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg
                         text-white focus:outline-none focus:border-yellow-500
                         transition-colors duration-200"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
                <option value={9999}>All time</option>
              </select>

              <select
                value={metric}
                onChange={e => setMetric(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg
                         text-white focus:outline-none focus:border-yellow-500
                         transition-colors duration-200"
              >
                <option value="profit">Total Profit</option>
                <option value="volume">Trading Volume</option>
                <option value="flips">Number of Flips</option>
                <option value="avgRoi">Average ROI</option>
                <option value="gpPerHour">GP per Hour</option>
              </select>

              <select
                value={colorScheme}
                onChange={e => setColorScheme(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg
                         text-white focus:outline-none focus:border-yellow-500
                         transition-colors duration-200"
              >
                <option value="green-wide">Green (Wide Range)</option>
                <option value="fire">Fire (Yellow to Red)</option>
                <option value="ocean">Ocean (Blue to Cyan)</option>
                <option value="purple">Purple (Purple to Pink)</option>
                <option value="gold">Gold (OSRS Theme)</option>
              </select>
            </div>

            <div className="text-sm text-gray-400">
              <span className="inline-flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                {dateRange === 9999 ? 'All time data' : `Live data from last ${dateRange} days`}
              </span>
            </div>
          </div>
        </CardContainer>

        {hasData ? (
          <>
            <HeatMapGrid data={heatMapData} metric={metric} colorScheme={colorScheme} />

            {insights?.recommendations && insights.recommendations.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Insights & Recommendations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.recommendations.map((recommendation, index) => (
                    <InsightCard key={index} {...recommendation} />
                  ))}
                </div>
              </div>
            )}

            <CardContainer>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">How to Use This Heat Map</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                  <div>
                    <h4 className="font-medium text-yellow-400 mb-2">🎯 Identify Peak Hours</h4>
                    <p>
                      Brighter cells indicate higher activity or performance. Focus your trading
                      during these times for maximum efficiency.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-400 mb-2">📊 Compare Metrics</h4>
                    <p>
                      Switch between different metrics to understand not just when you trade most,
                      but when you're most profitable.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-400 mb-2">📈 Track Patterns</h4>
                    <p>
                      Look for consistent patterns across days. Are weekends better? Do certain
                      hours consistently outperform?
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-400 mb-2">⚡ Optimize Schedule</h4>
                    <p>
                      Use insights to adjust your trading schedule. Consider setting alerts for your
                      peak performance times.
                    </p>
                  </div>
                </div>
              </div>
            </CardContainer>
          </>
        ) : (
          <CardContainer>
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">
                No trading data available for the selected period.
              </p>
              <p className="text-sm text-gray-500">
                Try selecting a different date range or check your data files.
              </p>
            </div>
          </CardContainer>
        )}
      </div>
    </PageContainer>
  );
}
