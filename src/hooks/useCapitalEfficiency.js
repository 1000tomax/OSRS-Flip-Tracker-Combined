import { useMemo } from 'react';
import { useAllFlips } from './useAllFlips';
import {
  calculateCapitalVelocity,
  calculateROIPerGP,
  calculateAvgHoldTime,
  calculateSuccessRate,
  analyzeFlipTypes,
  analyzeCategoryPerformance,
} from '../utils/analyticsCalculations';

export function useCapitalEfficiency(timePeriod = 30) {
  const { data: allFlips, loading, error } = useAllFlips();

  const metrics = useMemo(() => {
    if (!allFlips || !allFlips.length) {
      return {
        capitalVelocity: 0,
        roiPerGP: 0,
        avgHoldTime: 0,
        successRate: 0,
      };
    }

    let relevantFlips;
    if (timePeriod === 9999) {
      // All time - include all flips
      relevantFlips = allFlips.filter(flip => {
        const flipDate = new Date(flip.closed_time || flip.closedTime);
        return !isNaN(flipDate.getTime());
      });
    } else {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timePeriod);

      relevantFlips = allFlips.filter(flip => {
        const flipDate = new Date(flip.closed_time || flip.closedTime);
        return flipDate >= cutoffDate && !isNaN(flipDate.getTime());
      });
    }

    if (relevantFlips.length === 0) {
      return {
        capitalVelocity: 0,
        roiPerGP: 0,
        avgHoldTime: 0,
        successRate: 0,
      };
    }

    const capitalVelocity = calculateCapitalVelocity(relevantFlips, timePeriod);
    const roiPerGP = calculateROIPerGP(relevantFlips);
    const avgHoldTime = calculateAvgHoldTime(relevantFlips);
    const successRate = calculateSuccessRate(relevantFlips);

    // Handle previous period comparison
    let previousFlips = [];
    if (timePeriod !== 9999) {
      const currentCutoff = new Date();
      currentCutoff.setDate(currentCutoff.getDate() - timePeriod);

      const previousPeriodCutoff = new Date();
      previousPeriodCutoff.setDate(previousPeriodCutoff.getDate() - timePeriod * 2);

      previousFlips = allFlips.filter(flip => {
        const flipDate = new Date(flip.closed_time || flip.closedTime);
        return (
          flipDate >= previousPeriodCutoff && flipDate < currentCutoff && !isNaN(flipDate.getTime())
        );
      });
    }

    let changes = {
      velocityChange: null,
      roiChange: null,
      holdTimeChange: null,
      successRateChange: null,
    };

    if (previousFlips.length > 0) {
      const prevVelocity = calculateCapitalVelocity(previousFlips, timePeriod);
      const prevRoi = calculateROIPerGP(previousFlips);
      const prevHoldTime = calculateAvgHoldTime(previousFlips);
      const prevSuccess = calculateSuccessRate(previousFlips);

      changes = {
        velocityChange:
          prevVelocity > 0 ? ((capitalVelocity - prevVelocity) / prevVelocity) * 100 : null,
        roiChange: prevRoi > 0 ? ((roiPerGP - prevRoi) / prevRoi) * 100 : null,
        holdTimeChange:
          prevHoldTime > 0 ? ((avgHoldTime - prevHoldTime) / prevHoldTime) * 100 : null,
        successRateChange:
          prevSuccess > 0 ? ((successRate - prevSuccess) / prevSuccess) * 100 : null,
      };
    }

    return {
      capitalVelocity,
      roiPerGP,
      avgHoldTime,
      successRate,
      ...changes,
      flipCount: relevantFlips.length,
    };
  }, [allFlips, timePeriod]);

  const flipAnalysis = useMemo(() => {
    if (!allFlips || !allFlips.length) {
      return { fast: null, slow: null, medium: null };
    }

    let relevantFlips;
    if (timePeriod === 9999) {
      relevantFlips = allFlips.filter(flip => {
        const flipDate = new Date(flip.closed_time || flip.closedTime);
        return !isNaN(flipDate.getTime());
      });
    } else {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timePeriod);

      relevantFlips = allFlips.filter(flip => {
        const flipDate = new Date(flip.closed_time || flip.closedTime);
        return flipDate >= cutoffDate && !isNaN(flipDate.getTime());
      });
    }

    return analyzeFlipTypes(relevantFlips);
  }, [allFlips, timePeriod]);

  const categoryPerformance = useMemo(() => {
    if (!allFlips || !allFlips.length) {
      return [];
    }

    let relevantFlips;
    if (timePeriod === 9999) {
      relevantFlips = allFlips.filter(flip => {
        const flipDate = new Date(flip.closed_time || flip.closedTime);
        return !isNaN(flipDate.getTime());
      });
    } else {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timePeriod);

      relevantFlips = allFlips.filter(flip => {
        const flipDate = new Date(flip.closed_time || flip.closedTime);
        return flipDate >= cutoffDate && !isNaN(flipDate.getTime());
      });
    }

    return analyzeCategoryPerformance(relevantFlips);
  }, [allFlips, timePeriod]);

  const insights = useMemo(() => {
    const recommendations = [];

    if (metrics.capitalVelocity < 5) {
      recommendations.push({
        type: 'yellow',
        priority: 'high',
        title: 'Low Trading Frequency',
        description: `You're averaging ${metrics.capitalVelocity.toFixed(1)} flips per day. Consider increasing trading activity for better capital utilization.`,
        icon: '⚠️',
      });
    } else if (metrics.capitalVelocity > 20) {
      recommendations.push({
        type: 'green',
        priority: 'low',
        title: 'Excellent Trading Velocity',
        description: `Great job! You're maintaining ${metrics.capitalVelocity.toFixed(1)} flips per day, keeping your capital active.`,
        icon: '✨',
      });
    }

    if (metrics.roiPerGP < 1) {
      recommendations.push({
        type: 'red',
        priority: 'high',
        title: 'Low Profit Margins',
        description: `Your ROI per GP is only ${metrics.roiPerGP.toFixed(2)}%. Focus on higher-margin items or better entry/exit prices.`,
        icon: '📉',
      });
    } else if (metrics.roiPerGP > 5) {
      recommendations.push({
        type: 'green',
        priority: 'medium',
        title: 'Strong Profit Margins',
        description: `Excellent ${metrics.roiPerGP.toFixed(2)}% ROI per GP invested. Keep targeting these profitable items.`,
        icon: '📈',
      });
    }

    if (metrics.avgHoldTime > 24) {
      recommendations.push({
        type: 'yellow',
        priority: 'medium',
        title: 'Long Hold Times',
        description: `Items are taking ${metrics.avgHoldTime.toFixed(1)} hours on average. Consider faster-moving items to improve capital efficiency.`,
        icon: '⏰',
      });
    }

    if (metrics.successRate < 70) {
      recommendations.push({
        type: 'red',
        priority: 'high',
        title: 'Success Rate Needs Improvement',
        description: `Only ${metrics.successRate.toFixed(0)}% of flips are profitable. Review your item selection and pricing strategy.`,
        icon: '🎯',
      });
    }

    if (flipAnalysis.fast && flipAnalysis.slow) {
      const fastGpPerHour = flipAnalysis.fast.avgGpPerHour;
      const slowGpPerHour = flipAnalysis.slow.avgGpPerHour;

      if (fastGpPerHour > slowGpPerHour * 1.5) {
        recommendations.push({
          type: 'blue',
          priority: 'medium',
          title: 'Fast Flips Outperforming',
          description:
            'Your fast flips are generating 50% more GP/hour. Consider allocating more capital to quick trades.',
          icon: '⚡',
        });
      }
    }

    return recommendations;
  }, [metrics, flipAnalysis]);

  return {
    metrics,
    flipAnalysis,
    categoryPerformance,
    insights,
    loading,
    error,
  };
}
