import { useMemo } from 'react';
import { useAllFlips } from './useAllFlips';
import {
  aggregateHeatMapData,
  calculateHeatMapInsights,
  dayNames,
  formatHour,
} from '../utils/analyticsCalculations';

export function useHeatMapData(dateRange = 30, metric = 'profit') {
  const { data: allFlips, loading, error } = useAllFlips();

  const heatMapData = useMemo(() => {
    if (!allFlips || !allFlips.length) {
      return {};
    }

    return aggregateHeatMapData(allFlips, metric, dateRange);
  }, [allFlips, metric, dateRange]);

  const insights = useMemo(() => {
    if (!Object.keys(heatMapData).length) {
      return null;
    }

    const rawInsights = calculateHeatMapInsights(heatMapData, metric);

    const formatMetricValue = value => {
      if (metric === 'profit' || metric === 'volume' || metric === 'gpPerHour') {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M GP`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K GP`;
        return `${Math.round(value)} GP`;
      }
      if (metric === 'avgRoi') {
        return `${value.toFixed(1)}%`;
      }
      return value.toString();
    };

    const recommendations = [];

    if (rawInsights.bestHour) {
      recommendations.push({
        type: 'green',
        priority: 'high',
        title: 'Peak Trading Hour',
        description: `Your best performance is ${dayNames[rawInsights.bestHour.day]} at ${formatHour(rawInsights.bestHour.hour)} with ${formatMetricValue(rawInsights.bestHour.value)}`,
        icon: '⭐',
      });
    }

    if (rawInsights.bestDay) {
      recommendations.push({
        type: 'blue',
        priority: 'medium',
        title: 'Most Profitable Day',
        description: `${dayNames[rawInsights.bestDay.day]} shows the highest total ${metric} at ${formatMetricValue(rawInsights.bestDay.value)}`,
        icon: '📈',
      });
    }

    if (rawInsights.bestHourOverall) {
      recommendations.push({
        type: 'yellow',
        priority: 'medium',
        title: 'Optimal Trading Time',
        description: `Across all days, ${formatHour(rawInsights.bestHourOverall.hour)} shows consistent high performance`,
        icon: '🎯',
      });
    }

    const weakDays = rawInsights.dayTotals
      .map((total, day) => ({ day, total }))
      .filter(d => d.total > 0)
      .sort((a, b) => a.total - b.total)
      .slice(0, 2);

    if (weakDays.length > 0 && weakDays[0].total < rawInsights.bestDay.value * 0.3) {
      recommendations.push({
        type: 'red',
        priority: 'low',
        title: 'Underperforming Days',
        description: `Consider increasing activity on ${weakDays.map(d => dayNames[d.day]).join(' and ')}`,
        icon: '⚠️',
      });
    }

    return {
      ...rawInsights,
      recommendations,
    };
  }, [heatMapData, metric]);

  return {
    heatMapData,
    insights,
    loading,
    error,
  };
}
