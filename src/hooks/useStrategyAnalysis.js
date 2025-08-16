// src/hooks/useStrategyAnalysis.js - Custom hook for strategy battle analysis
import { useMemo } from 'react';

/**
 * Strategy classification thresholds
 */
const HIGH_VOLUME_QUANTITY = 1000; // Items with 1000+ quantity per flip are high volume
const HIGH_VALUE_QUANTITY = 100; // Items with <100 quantity per flip are high value

/**
 * Custom hook for analyzing strategy performance from flip data
 */
export function useStrategyAnalysis(flips, date) {
  return useMemo(() => {
    if (!flips || flips.length === 0) {
      return {
        isValid: false,
        error: 'No flip data available',
        highVolumeStrategy: null,
        highValueStrategy: null,
        winner: null,
      };
    }

    // Parse date for validation
    const [month, day, year] = date ? date.split('-').map(Number) : [null, null, null];
    if (!month || !day || !year) {
      return {
        isValid: false,
        error: 'Invalid date format',
        highVolumeStrategy: null,
        highValueStrategy: null,
        winner: null,
      };
    }

    const selectedDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Validate date
    if (selectedDate > todayDate) {
      return {
        isValid: false,
        error: 'Future date selected',
        highVolumeStrategy: null,
        highValueStrategy: null,
        winner: null,
      };
    }

    if (selectedDate.getTime() === todayDate.getTime()) {
      return {
        isValid: false,
        error: "Today's data is incomplete",
        highVolumeStrategy: null,
        highValueStrategy: null,
        winner: null,
      };
    }

    // Filter to only completed flips
    const validFlips = flips.filter(
      f => f.closed_quantity > 0 && f.received_post_tax > 0 && f.status === 'FINISHED'
    );

    if (validFlips.length === 0) {
      return {
        isValid: false,
        error: 'No completed flips found for this date',
        highVolumeStrategy: null,
        highValueStrategy: null,
        winner: null,
      };
    }

    // Process flips and aggregate by item
    const itemGroups = {};

    validFlips.forEach(flip => {
      const itemName = flip.item_name || 'Unknown Item';
      const quantity = parseInt(flip.closed_quantity) || 0;
      const profit = parseFloat(flip.profit) || 0;
      const spent = parseFloat(flip.spent) || 0;

      // Parse timestamps
      const openTime = new Date(flip.opened_time);
      const closeTime = new Date(flip.closed_time);
      const durationMinutes = (closeTime - openTime) / (1000 * 60);

      if (!itemGroups[itemName]) {
        itemGroups[itemName] = {
          itemName,
          totalQuantity: 0,
          totalProfit: 0,
          totalSpent: 0,
          totalTime: 0,
          flips: 0,
          profits: [],
        };
      }

      const group = itemGroups[itemName];
      group.totalQuantity += quantity;
      group.totalProfit += profit;
      group.totalSpent += spent;
      group.totalTime += Math.max(0, durationMinutes);
      group.flips += 1;
      group.profits.push(profit);
    });

    // Calculate aggregated metrics for each item
    const processedItems = Object.values(itemGroups).map(group => {
      const avgQuantity = group.totalQuantity / group.flips;
      const winRate = (group.profits.filter(p => p > 0).length / group.profits.length) * 100;

      return {
        ...group,
        quantity: group.totalQuantity,
        profit: group.totalProfit,
        avgQuantity,
        timeMinutes: group.totalTime,
        winRate,
        profitPerHour: group.totalTime > 0 ? (group.totalProfit / group.totalTime) * 60 : 0,
      };
    });

    // Classify items into strategies
    const highVolumeItems = processedItems.filter(item => item.avgQuantity >= HIGH_VOLUME_QUANTITY);

    const highValueItems = processedItems.filter(item => item.avgQuantity <= HIGH_VALUE_QUANTITY);

    // Calculate strategy performance
    const calculateStrategyMetrics = (items, name, description) => {
      if (items.length === 0) {
        return {
          name,
          description,
          totalProfit: 0,
          avgProfit: 0,
          flipCount: 0,
          winRate: 0,
          totalTime: 0,
          gpPerHour: 0,
          roi: 0,
          flips: [],
        };
      }

      const totalProfit = items.reduce((sum, item) => sum + item.profit, 0);
      const totalSpent = items.reduce((sum, item) => sum + item.totalSpent, 0);
      const totalTime = items.reduce((sum, item) => sum + item.timeMinutes, 0);
      const totalFlips = items.reduce((sum, item) => sum + item.flips, 0);
      const profitableFlips = items.reduce(
        (sum, item) => sum + item.profits.filter(p => p > 0).length,
        0
      );

      return {
        name,
        description,
        totalProfit,
        avgProfit: totalFlips > 0 ? totalProfit / totalFlips : 0,
        flipCount: totalFlips,
        winRate: totalFlips > 0 ? (profitableFlips / totalFlips) * 100 : 0,
        totalTime,
        gpPerHour: totalTime > 0 ? (totalProfit / totalTime) * 60 : 0,
        roi: totalSpent > 0 ? totalProfit / totalSpent : 0,
        flips: items,
      };
    };

    const highVolumeStrategy = calculateStrategyMetrics(
      highVolumeItems,
      'High Volume',
      'Items with high quantity per flip (1000+)'
    );

    const highValueStrategy = calculateStrategyMetrics(
      highValueItems,
      'High Value',
      'Items with low quantity per flip (<100)'
    );

    // Determine winner based on GP per hour
    let winner = null;
    if (highVolumeStrategy.gpPerHour > 0 || highValueStrategy.gpPerHour > 0) {
      winner =
        highVolumeStrategy.gpPerHour >= highValueStrategy.gpPerHour ? 'High Volume' : 'High Value';
    }

    return {
      isValid: true,
      error: null,
      highVolumeStrategy,
      highValueStrategy,
      winner,
      totalFlips: validFlips.length,
      totalItems: processedItems.length,
    };
  }, [flips, date]);
}

export default useStrategyAnalysis;
