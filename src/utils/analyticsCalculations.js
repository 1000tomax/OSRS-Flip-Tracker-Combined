import { DateUtils } from './dateUtils';

export function aggregateHeatMapData(flips, metric, dateRange) {
  let relevantFlips;
  if (dateRange === 9999) {
    // All time - include all flips
    relevantFlips = flips.filter(flip => {
      const flipDate = new Date(flip.closed_time || flip.closedTime || flip.completedAt);
      return !isNaN(flipDate.getTime());
    });
  } else {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);
    relevantFlips = flips.filter(flip => {
      const flipDate = new Date(flip.closed_time || flip.closedTime || flip.completedAt);
      return flipDate >= cutoffDate && !isNaN(flipDate.getTime());
    });
  }

  const heatMap = {};
  for (let day = 0; day < 7; day++) {
    heatMap[day] = {};
    for (let hour = 0; hour < 24; hour++) {
      heatMap[day][hour] = {
        profit: 0,
        volume: 0,
        flips: 0,
        totalRoi: 0,
        gpPerHour: 0,
        count: 0,
      };
    }
  }

  relevantFlips.forEach(flip => {
    const closedTime = new Date(flip.closed_time || flip.closedTime || flip.completedAt);
    const chicagoDate = DateUtils.toChicagoTime(closedTime);
    const day = chicagoDate.getDay();
    const hour = chicagoDate.getHours();
    const cell = heatMap[day][hour];

    const profit = parseFloat(flip.profit) || 0;
    const spent = parseFloat(flip.spent || flip.buyPrice) || 0;
    const roi = spent > 0 ? (profit / spent) * 100 : 0;

    cell.profit += profit;
    cell.volume += spent;
    cell.flips += 1;
    cell.totalRoi += roi;
    cell.count += 1;

    if (flip.opened_time) {
      const openTime = new Date(flip.opened_time);
      const durationHours = (closedTime - openTime) / (1000 * 60 * 60);
      if (durationHours > 0) {
        cell.gpPerHour += profit / durationHours;
      }
    }
  });

  Object.keys(heatMap).forEach(day => {
    Object.keys(heatMap[day]).forEach(hour => {
      const cell = heatMap[day][hour];
      if (cell.count > 0) {
        cell.avgRoi = cell.totalRoi / cell.count;
        cell.gpPerHour = cell.gpPerHour / cell.count;
      }
    });
  });

  return heatMap;
}

export function getIntensityColor(value, maxValue, minValue = 0, colorScheme = 'green-wide') {
  if (value <= minValue) return 'bg-gray-700';

  const range = maxValue - minValue;
  const normalizedValue = (value - minValue) / range;

  // Different color schemes
  const schemes = {
    'green-wide': ['bg-green-950', 'bg-green-800', 'bg-green-600', 'bg-green-400', 'bg-green-300'],
    fire: ['bg-yellow-900', 'bg-orange-700', 'bg-orange-600', 'bg-red-600', 'bg-red-500'],
    ocean: ['bg-blue-950', 'bg-blue-800', 'bg-blue-600', 'bg-cyan-500', 'bg-cyan-400'],
    purple: ['bg-purple-950', 'bg-purple-800', 'bg-purple-600', 'bg-purple-500', 'bg-pink-400'],
    gold: ['bg-yellow-950', 'bg-yellow-800', 'bg-amber-600', 'bg-yellow-500', 'bg-yellow-400'],
  };

  const colors = schemes[colorScheme] || schemes['green-wide'];

  if (normalizedValue < 0.2) return colors[0];
  if (normalizedValue < 0.4) return colors[1];
  if (normalizedValue < 0.6) return colors[2];
  if (normalizedValue < 0.8) return colors[3];
  return colors[4];
}

export function calculateHeatMapInsights(heatMapData, metric) {
  let bestHour = { day: 0, hour: 0, value: 0 };
  let bestDay = { day: 0, value: 0 };
  const dayTotals = new Array(7).fill(0);
  const hourTotals = new Array(24).fill(0);

  Object.keys(heatMapData).forEach(day => {
    Object.keys(heatMapData[day]).forEach(hour => {
      const value = heatMapData[day][hour][metric] || 0;
      dayTotals[parseInt(day)] += value;
      hourTotals[parseInt(hour)] += value;

      if (value > bestHour.value) {
        bestHour = {
          day: parseInt(day),
          hour: parseInt(hour),
          value,
        };
      }
    });
  });

  dayTotals.forEach((total, day) => {
    if (total > bestDay.value) {
      bestDay = { day, value: total };
    }
  });

  const bestHourOverall = hourTotals.reduce(
    (best, value, hour) => {
      if (value > best.value) {
        return { hour, value };
      }
      return best;
    },
    { hour: 0, value: 0 }
  );

  return { bestHour, bestDay, dayTotals, hourTotals, bestHourOverall };
}

export function calculateCapitalVelocity(flips, timePeriodDays) {
  if (timePeriodDays === 0) return 0;

  // For "all time", calculate based on actual date range of flips
  if (timePeriodDays === 9999 && flips.length > 0) {
    const dates = flips
      .map(flip => new Date(flip.closed_time || flip.closedTime || flip.completedAt))
      .filter(date => !isNaN(date.getTime()));

    if (dates.length === 0) return 0;

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const actualDays = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);

    return flips.length / actualDays;
  }

  return flips.length / timePeriodDays;
}

export function calculateROIPerGP(flips) {
  const totalCapital = flips.reduce(
    (sum, flip) => sum + (parseFloat(flip.spent || flip.buyPrice) || 0),
    0
  );
  const totalProfit = flips.reduce((sum, flip) => sum + (parseFloat(flip.profit) || 0), 0);
  return totalCapital > 0 ? (totalProfit / totalCapital) * 100 : 0;
}

export function calculateAvgHoldTime(flips) {
  const flipsWithHoldTime = flips.filter(flip => flip.opened_time && flip.closed_time);

  if (flipsWithHoldTime.length === 0) return 0;

  const totalHoldTime = flipsWithHoldTime.reduce((sum, flip) => {
    const openTime = new Date(flip.opened_time);
    const closeTime = new Date(flip.closed_time || flip.closedTime);
    const holdTimeMinutes = (closeTime - openTime) / (1000 * 60);
    return sum + holdTimeMinutes;
  }, 0);

  return totalHoldTime / flipsWithHoldTime.length / 60;
}

export function calculateSuccessRate(flips) {
  const profitableFlips = flips.filter(flip => (parseFloat(flip.profit) || 0) > 0);
  return flips.length > 0 ? (profitableFlips.length / flips.length) * 100 : 0;
}

export function analyzeFlipTypes(flips) {
  const fastThreshold = 120;
  const slowThreshold = 360;

  const flipsWithTimes = flips
    .filter(flip => flip.opened_time && flip.closed_time)
    .map(flip => {
      const openTime = new Date(flip.opened_time);
      const closeTime = new Date(flip.closed_time);
      const holdTimeMinutes = (closeTime - openTime) / (1000 * 60);
      return { ...flip, holdTimeMinutes };
    });

  const fastFlips = flipsWithTimes.filter(flip => flip.holdTimeMinutes <= fastThreshold);
  const slowFlips = flipsWithTimes.filter(flip => flip.holdTimeMinutes > slowThreshold);

  function analyzeGroup(groupFlips) {
    if (groupFlips.length === 0) return null;

    const totalProfit = groupFlips.reduce((sum, flip) => sum + (parseFloat(flip.profit) || 0), 0);
    const totalCapital = groupFlips.reduce(
      (sum, flip) => sum + (parseFloat(flip.spent || flip.buyPrice) || 0),
      0
    );
    const avgRoi = totalCapital > 0 ? (totalProfit / totalCapital) * 100 : 0;

    const avgGpPerHour =
      groupFlips.reduce((sum, flip) => {
        const hours = (flip.holdTimeMinutes || 60) / 60;
        return sum + (parseFloat(flip.profit) || 0) / hours;
      }, 0) / groupFlips.length;

    const successRate =
      (groupFlips.filter(flip => (parseFloat(flip.profit) || 0) > 0).length / groupFlips.length) *
      100;

    return {
      count: groupFlips.length,
      avgRoi: avgRoi.toFixed(1),
      avgGpPerHour: Math.round(avgGpPerHour),
      successRate: successRate.toFixed(0),
      avgCapital: Math.round(totalCapital / groupFlips.length),
    };
  }

  return {
    fast: analyzeGroup(fastFlips),
    slow: analyzeGroup(slowFlips),
    medium: analyzeGroup(
      flipsWithTimes.filter(
        flip => flip.holdTimeMinutes > fastThreshold && flip.holdTimeMinutes <= slowThreshold
      )
    ),
  };
}

export function analyzeCategoryPerformance(flips) {
  const categories = {};

  flips.forEach(flip => {
    const itemName = flip.item_name || flip.itemName || 'Other';
    const category = categorizeItem(itemName);

    if (!categories[category]) {
      categories[category] = {
        totalProfit: 0,
        totalCapital: 0,
        flips: 0,
        items: new Set(),
      };
    }

    categories[category].totalProfit += parseFloat(flip.profit) || 0;
    categories[category].totalCapital += parseFloat(flip.spent || flip.buyPrice) || 0;
    categories[category].flips += 1;
    categories[category].items.add(itemName);
  });

  return Object.entries(categories)
    .map(([name, data]) => ({
      name,
      totalProfit: data.totalProfit,
      avgRoi: data.totalCapital > 0 ? (data.totalProfit / data.totalCapital) * 100 : 0,
      flipCount: data.flips,
      uniqueItems: data.items.size,
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit);
}

function categorizeItem(itemName) {
  const name = itemName.toLowerCase();

  if (name.includes('rune') && !name.includes('runite')) return 'Runes';
  if (name.includes('log') || name.includes('plank')) return 'Woodcutting';
  if (name.includes('ore') || name.includes('bar')) return 'Mining';
  if (name.includes('potion') || name.includes('herb')) return 'Herblore';
  if (name.includes('seed')) return 'Farming';
  if (name.includes('bolt') || name.includes('arrow') || name.includes('dart')) return 'Ammunition';
  if (name.includes('dragon') || name.includes('rune') || name.includes('adamant'))
    return 'Equipment';
  if (name.includes('bone')) return 'Prayer';
  if (name.includes('food') || name.includes('fish')) return 'Food';

  return 'Other';
}

export const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function formatHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}
