import React, { useState } from 'react';
import MetricCard from '../components/analytics/MetricCard';
import InsightCard from '../components/analytics/InsightCard';
import FlipComparison from '../components/analytics/FlipComparison';
import PerformanceBreakdown from '../components/analytics/PerformanceBreakdown';
import { useCapitalEfficiency } from '../hooks/useCapitalEfficiency';
import {
  PageContainer,
  PageHeader,
  CardContainer,
  LoadingLayout,
  ErrorLayout,
} from '../components/layouts';

export default function CapitalEfficiency() {
  const [timePeriod, setTimePeriod] = useState(30);

  const { metrics, flipAnalysis, categoryPerformance, insights, loading, error } =
    useCapitalEfficiency(timePeriod);

  if (loading) {
    return <LoadingLayout message="Analyzing capital efficiency..." />;
  }

  if (error) {
    return <ErrorLayout error={error} />;
  }

  const formatHoldTime = hours => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Capital Efficiency Dashboard"
        subtitle="Analyze capital utilization and trading performance"
      />

      <div className="space-y-6">
        <CardContainer>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <select
              value={timePeriod}
              onChange={e => setTimePeriod(Number(e.target.value))}
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

            <div className="text-sm text-gray-400">
              <span className="inline-flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Analyzing {metrics.flipCount || 0} flips
              </span>
            </div>
          </div>
        </CardContainer>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Capital Velocity"
            value={metrics.capitalVelocity.toFixed(1)}
            subtitle="Flips per day"
            icon="🔄"
            change={metrics.velocityChange}
            color="blue"
          />
          <MetricCard
            title="ROI per GP Invested"
            value={`${metrics.roiPerGP.toFixed(2)}%`}
            subtitle="Return on investment"
            icon="💰"
            change={metrics.roiChange}
            color={metrics.roiPerGP > 3 ? 'green' : metrics.roiPerGP < 1 ? 'red' : 'yellow'}
          />
          <MetricCard
            title="Avg Hold Time"
            value={formatHoldTime(metrics.avgHoldTime)}
            subtitle="Time per flip"
            icon="⏱️"
            change={metrics.holdTimeChange ? -metrics.holdTimeChange : null}
            color={metrics.avgHoldTime < 6 ? 'green' : metrics.avgHoldTime > 24 ? 'red' : 'yellow'}
          />
          <MetricCard
            title="Success Rate"
            value={`${metrics.successRate.toFixed(0)}%`}
            subtitle="Profitable flips"
            icon="🎯"
            change={metrics.successRateChange}
            color={metrics.successRate > 80 ? 'green' : metrics.successRate < 60 ? 'red' : 'yellow'}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Flip Type Analysis</h2>
          <FlipComparison fastFlips={flipAnalysis.fast} slowFlips={flipAnalysis.slow} />
        </div>

        {categoryPerformance.length > 0 && (
          <PerformanceBreakdown categories={categoryPerformance} />
        )}

        {insights && insights.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Insights & Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, index) => (
                <InsightCard key={index} {...insight} />
              ))}
            </div>
          </div>
        )}

        <CardContainer>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Understanding Your Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
              <div>
                <h4 className="font-medium text-yellow-400 mb-2">💡 Capital Velocity</h4>
                <p>
                  Measures how quickly you're turning over your capital. Higher velocity means more
                  trading opportunities and potentially more profit, but requires active management.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-yellow-400 mb-2">💡 ROI per GP</h4>
                <p>
                  Shows your return for every GP invested. This is your true efficiency metric -
                  higher percentages mean you're making smart trading decisions.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-yellow-400 mb-2">💡 Hold Time</h4>
                <p>
                  The average time items sit in your inventory. Shorter times mean faster capital
                  recycling, but may sacrifice profit margins.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-yellow-400 mb-2">💡 Success Rate</h4>
                <p>
                  Percentage of flips that are profitable. A high success rate indicates good market
                  knowledge and timing.
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <h4 className="font-medium text-yellow-400 mb-2">🎯 Optimization Strategy</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Balance fast and slow flips based on your available playtime</li>
                <li>
                  • Focus on categories with the highest ROI but don't ignore volume opportunities
                </li>
                <li>• Use all 8 GE slots efficiently - idle slots are wasted potential</li>
                <li>• Track market trends and adjust your strategy accordingly</li>
              </ul>
            </div>
          </div>
        </CardContainer>
      </div>
    </PageContainer>
  );
}
