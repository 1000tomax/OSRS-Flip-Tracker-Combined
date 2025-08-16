// src/components/ETACalculator.js
import { useMemo } from 'react';

export function useETACalculator(summaries, currentNetWorth) {
  const etaData = useMemo(() => {
    if (!summaries || summaries.length < 7) {
      return { eta: null, confidence: 'low', method: 'insufficient_data' };
    }

    const MAX_CASH = 2147483647;
    const remaining = MAX_CASH - currentNetWorth;

    if (remaining <= 0) {
      return { eta: 0, confidence: 'high', method: 'complete' };
    }

    // Filter out very early days and sort by day - reduced filter since you have more data now
    const validDays = summaries
      .filter(day => day.day >= 5) // Skip first few days outliers (reduced from 8 to 5)
      .sort((a, b) => a.day - b.day);

    if (validDays.length < 3) {
      return { eta: null, confidence: 'low', method: 'insufficient_filtered_data' };
    }

    // Method 1: Linear regression on daily profits to find acceleration
    const linearTrendETA = calculateLinearTrendETA(validDays, remaining);

    // Method 2: Exponential growth model based on net worth progression
    const exponentialETA = calculateExponentialETA(validDays, currentNetWorth, MAX_CASH);

    // Method 3: Rolling average with recent weighting
    const weightedAverageETA = calculateWeightedAverageETA(validDays, remaining);

    // Method 4: NEW - Compound growth based on daily percentage gains (most accurate for your trading style)
    const compoundGrowthETA = calculateCompoundGrowthETA(validDays, currentNetWorth, MAX_CASH);

    // Combine methods for final estimate - now includes compound growth method
    const estimates = [
      linearTrendETA,
      exponentialETA,
      weightedAverageETA,
      compoundGrowthETA,
    ].filter(eta => eta > 0 && eta < 1000);

    if (estimates.length === 0) {
      return { eta: null, confidence: 'low', method: 'calculation_error' };
    }

    // Use median of valid estimates
    estimates.sort((a, b) => a - b);
    const finalETA = estimates[Math.floor(estimates.length / 2)];

    // Confidence based on consistency of estimates
    const variance =
      estimates.reduce((sum, eta) => sum + Math.pow(eta - finalETA, 2), 0) / estimates.length;
    const confidence = variance < 100 ? 'high' : variance < 400 ? 'medium' : 'low';

    return {
      eta: Math.round(finalETA),
      confidence,
      method: 'combined_analysis',
      estimates: {
        linear: Math.round(linearTrendETA),
        exponential: Math.round(exponentialETA),
        weighted: Math.round(weightedAverageETA),
        compound: Math.round(compoundGrowthETA),
      },
    };
  }, [summaries, currentNetWorth]);

  return etaData;
}

// Method 1: Linear regression on daily profits (captures acceleration)
function calculateLinearTrendETA(validDays, remaining) {
  const n = validDays.length;

  // Linear regression: y = mx + b where y = daily_profit, x = day_number
  const sumX = validDays.reduce((sum, day) => sum + day.day, 0);
  const sumY = validDays.reduce((sum, day) => sum + day.profit, 0);
  const sumXY = validDays.reduce((sum, day) => sum + day.day * day.profit, 0);
  const sumX2 = validDays.reduce((sum, day) => sum + day.day * day.day, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  if (slope <= 0) return Infinity; // No growth trend

  // Project future profits and sum until we reach target
  const lastDay = validDays[validDays.length - 1].day;
  let totalProjectedProfit = 0;
  let projectedDays = 0;

  while (totalProjectedProfit < remaining && projectedDays < 1000) {
    projectedDays++;
    const futureDay = lastDay + projectedDays;
    const projectedDailyProfit = Math.max(slope * futureDay + intercept, 0);
    totalProjectedProfit += projectedDailyProfit;
  }

  return projectedDays;
}

// Method 2: Exponential growth model based on net worth progression
function calculateExponentialETA(validDays, currentNetWorth, maxCash) {
  if (validDays.length < 3) return Infinity;

  // Take recent samples for exponential fitting - using more data for better accuracy
  const recentDays = validDays.slice(-Math.min(21, validDays.length)); // Last 3 weeks or all available data

  // Fit exponential curve to net worth: net_worth = a * e^(b * day)
  // Using log-linear regression: ln(net_worth) = ln(a) + b * day
  const validNetWorthDays = recentDays.filter(day => day.net_worth > 1000);

  if (validNetWorthDays.length < 3) return Infinity;

  const n = validNetWorthDays.length;
  const sumX = validNetWorthDays.reduce((sum, day) => sum + day.day, 0);
  const sumLnY = validNetWorthDays.reduce((sum, day) => sum + Math.log(day.net_worth), 0);
  const sumXLnY = validNetWorthDays.reduce(
    (sum, day) => sum + day.day * Math.log(day.net_worth),
    0
  );
  const sumX2 = validNetWorthDays.reduce((sum, day) => sum + day.day * day.day, 0);

  const b = (n * sumXLnY - sumX * sumLnY) / (n * sumX2 - sumX * sumX);
  const lnA = (sumLnY - b * sumX) / n;

  if (b <= 0) return Infinity; // No exponential growth

  // Solve for day when net_worth = maxCash: maxCash = a * e^(b * day)
  // day = (ln(maxCash) - ln(a)) / b
  const lastDay = validNetWorthDays[validNetWorthDays.length - 1].day;
  const targetDay = (Math.log(maxCash) - lnA) / b;

  return Math.max(targetDay - lastDay, 0);
}

// Method 3: Weighted average with recent emphasis
function calculateWeightedAverageETA(validDays, remaining) {
  if (validDays.length < 2) return Infinity;

  // Weight recent days more heavily
  let totalWeightedProfit = 0;
  let totalWeight = 0;

  validDays.forEach((day, index) => {
    // Linear weight: more recent days get higher weight
    const weight = index + 1;
    totalWeightedProfit += day.profit * weight;
    totalWeight += weight;
  });

  const weightedAverage = totalWeightedProfit / totalWeight;

  if (weightedAverage <= 0) return Infinity;

  return remaining / weightedAverage;
}

// Method 4: NEW - Compound growth based on daily percentage gains
function calculateCompoundGrowthETA(validDays, currentNetWorth, maxCash) {
  if (validDays.length < 3) return Infinity;

  // Get recent days for more accurate compound growth calculation
  const recentDays = validDays.slice(-10); // Last 10 days for good sample size

  // Calculate daily growth percentages
  const growthRates = [];
  for (let i = 1; i < recentDays.length; i++) {
    const prevDay = recentDays[i - 1];
    const currentDay = recentDays[i];

    if (prevDay.net_worth > 0 && currentDay.net_worth > prevDay.net_worth) {
      const growthRate = (currentDay.net_worth - prevDay.net_worth) / prevDay.net_worth;
      growthRates.push(growthRate);
    }
  }

  if (growthRates.length === 0) return Infinity;

  // Calculate weighted average of recent growth rates (more recent = higher weight)
  let totalWeightedGrowth = 0;
  let totalWeight = 0;

  growthRates.forEach((rate, index) => {
    const weight = (index + 1) * 2; // Recent days get exponentially more weight
    totalWeightedGrowth += rate * weight;
    totalWeight += weight;
  });

  const avgDailyGrowthRate = totalWeightedGrowth / totalWeight;

  // Add some conservative adjustment - don't assume growth rate will maintain indefinitely
  // But you've been very consistent, so being less conservative
  const conservativeGrowthRate = Math.min(avgDailyGrowthRate * 0.9, 0.12); // Cap at 12% daily max, reduce by only 10%

  if (conservativeGrowthRate <= 0) return Infinity;

  // Use compound interest formula: FV = PV * (1 + r)^t
  // Solve for t: t = log(FV/PV) / log(1 + r)
  const daysToGoal = Math.log(maxCash / currentNetWorth) / Math.log(1 + conservativeGrowthRate);

  return Math.max(daysToGoal, 0);
}

// Utility function to format ETA for display
export function formatETA(eta, confidence) {
  if (!eta || eta === Infinity) return 'Unable to calculate';

  const confidenceEmoji = {
    high: '🎯',
    medium: '📊',
    low: '🤔',
  };

  if (eta < 1) return `${confidenceEmoji[confidence]} Less than 1 day!`;
  if (eta === 1) return `${confidenceEmoji[confidence]} About 1 day`;
  if (eta < 30) return `${confidenceEmoji[confidence]} ${eta} days`;
  if (eta < 365) {
    const weeks = Math.round(eta / 7);
    return `${confidenceEmoji[confidence]} ~${weeks} weeks (${eta} days)`;
  }

  const years = Math.round((eta / 365) * 10) / 10;
  return `${confidenceEmoji[confidence]} ~${years} year${years !== 1 ? 's' : ''}`;
}
