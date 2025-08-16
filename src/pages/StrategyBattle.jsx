/**
 * STRATEGY BATTLE PAGE COMPONENT
 * 
 * This page provides a daily head-to-head comparison between High Volume and High Value
 * trading strategies. It shows which approach generates better profit per hour on each
 * trading day, helping traders understand when each strategy is most effective.
 * 
 * Strategy definitions:
 * - High Volume: Items with many completed flips (high liquidity, faster turnover)
 * - High Value: Items with high profit per flip (higher margins per transaction)
 * 
 * Key features:
 * - Daily strategy performance comparison with clear winner
 * - Historical progression showing strategy effectiveness over time
 * - Account growth context to understand scaling effects
 * - Running score tracking which strategy wins more often
 * - Detailed breakdown of contributing items for each strategy
 * 
 * This visualization proves whether high volume trading actually outperforms
 * high margin trading in real-world conditions.
 */

import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCsvData } from '../hooks/useCsvData';
import { useJsonData } from '../hooks/useJsonData';
import useDailySummaries from '../hooks/useDailySummaries';
import LoadingSpinner, { ErrorMessage } from '../components/LoadingSpinner';
import DateNavigation from '../components/DateNavigation';
import { parseDateParts, formatGP } from '../lib/utils';

/**
 * Strategy classification thresholds
 * These determine what qualifies as "High Volume" vs "High Value" items
 */
const HIGH_VOLUME_QUANTITY = 1000; // Items with 1000+ quantity per flip are high volume
const HIGH_VALUE_QUANTITY = 100; // Items with <100 quantity per flip are high value

/**
 * ItemBreakdown Component - Shows detailed breakdown of items contributing to strategy performance
 */
function ItemBreakdown({ items, color, strategyName }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const colorClasses = {
    green: {
      text: 'text-green-400',
      bg: 'bg-green-900/20',
      border: 'border-green-400/30',
      hover: 'hover:bg-green-800/30'
    },
    blue: {
      text: 'text-blue-400', 
      bg: 'bg-blue-900/20',
      border: 'border-blue-400/30',
      hover: 'hover:bg-blue-800/30'
    }
  };
  
  const colors = colorClasses[color];
  const displayItems = isExpanded ? items : items.slice(0, 3);
  
  return (
    <div className="border-t border-gray-600 pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-300">Contributing Items:</div>
        {items.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${colors.border} ${colors.text} ${colors.hover}`}
          >
            {isExpanded ? 'Show Less' : `View All ${items.length}`}
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {displayItems.map((item, idx) => {
          // Calculate what percentage of total strategy profit this item contributed
          const totalStrategyProfit = items.reduce((sum, i) => sum + i.profit, 0);
          const profitSharePercent = totalStrategyProfit !== 0 ? (item.profit / totalStrategyProfit) * 100 : 0;
          const timeHours = item.timeMinutes / 60;
          
          return (
            <div key={idx} className={`p-2 rounded border ${colors.border} ${colors.bg}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-gray-300 text-xs font-medium truncate flex-1 mr-2">
                  {item.name}
                </span>
                <span className={`${colors.text} font-mono text-xs font-bold`}>
                  {item.timeMinutes > 0 ? `${formatGP(item.profitPerHour)}/hr` : 'instant'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-white font-mono">{formatGP(item.profit)}</div>
                  <div className="text-gray-500">profit</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-mono">
                    {timeHours >= 0.1 ? `${timeHours.toFixed(1)}h` : 
                     item.timeMinutes >= 1 ? `${Math.round(item.timeMinutes)}m` : 
                     item.timeMinutes > 0 ? '<1m' : 'instant'}
                  </div>
                  <div className="text-gray-500">time</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-mono">{profitSharePercent.toFixed(1)}%</div>
                  <div className="text-gray-500">profit share</div>
                </div>
              </div>
              
              {item.flips > 1 && (
                <div className="text-center mt-1">
                  <span className="text-gray-400 text-xs">{item.flips} flips</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {isExpanded && items.length > 5 && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500">
            Showing {items.length} items contributing to {strategyName} strategy
          </span>
        </div>
      )}
    </div>
  );
}

export default function StrategyBattle() {
  // URL and navigation management (same pattern as FlipLogs)
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const date = queryParams.get('date');

  // Data loading hooks
  const { data: summaryDates, loading: summaryLoading, error: summaryError } = useJsonData("/data/summary-index.json");
  const { summaries } = useDailySummaries();
  
  // Parse the selected date into components for building file path
  const { month, day, year } = date ? parseDateParts(date) : {};
  
  // Build path to the specific day's flip data CSV file
  const csvPath = date ? `/data/processed-flips/${year}/${month}/${day}/flips.csv` : null;
  
  // Load the flip data for the selected date
  const { data: flips, loading: flipsLoading, error: flipsError } = useCsvData(csvPath);

  // Combine loading and error states from all data sources
  const isLoading = summaryLoading || flipsLoading;
  const hasError = summaryError || flipsError;

  /**
   * Strategy Classification and Daily Analysis
   * 
   * This processes the daily flip data and classifies items into strategies,
   * then calculates performance metrics for each strategy.
   */
  // Enhanced date validation
  const dateValidation = useMemo(() => {
    if (!date) return { status: 'no_date' };
    
    // Parse selected date
    const [month, day, year] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Check if date is in the future
    if (selectedDate > todayDate) {
      return { status: 'future_date' };
    }
    
    // Check if date is today (incomplete data)
    if (selectedDate.getTime() === todayDate.getTime()) {
      return { status: 'today_incomplete' };
    }
    
    // Check if we have flip data for this date
    if (!flips || flips.length === 0) {
      return { status: 'no_activity' };
    }
    
    return { status: 'valid' };
  }, [date, flips]);

  const strategyAnalysis = useMemo(() => {
    if (dateValidation.status !== 'valid') return null;

    // Filter to only completed flips for the day
    const validFlips = flips.filter(f =>
      f.closed_quantity > 0 &&
      f.received_post_tax > 0 &&
      f.status === 'FINISHED'
    );

    // Classify each flip by strategy based on quantity traded
    const volumeFlips = [];
    const valueFlips = [];
    const unclassifiedFlips = [];

    validFlips.forEach(flip => {
      // Use the quantity from this specific flip to determine strategy
      const quantity = parseInt(flip.opened_quantity) || parseInt(flip.closed_quantity) || 0;
      
      if (quantity >= HIGH_VOLUME_QUANTITY) {
        // High quantity = High Volume strategy
        volumeFlips.push(flip);
      } else if (quantity < HIGH_VALUE_QUANTITY) {
        // Low quantity = High Value strategy  
        valueFlips.push(flip);
      } else {
        // Medium quantity (100-999) = Unclassified
        unclassifiedFlips.push(flip);
      }
    });

    // Calculate strategy metrics
    const calculateStrategyMetrics = (flips, strategyName) => {
      if (flips.length === 0) {
        return {
          name: strategyName,
          totalFlips: 0,
          totalProfit: 0,
          totalTimeMinutes: 0,
          profitPerHour: 0,
          avgProfitPerFlip: 0,
          items: []
        };
      }

      const totalProfit = flips.reduce((sum, flip) => {
        return sum + (flip.received_post_tax - flip.spent);
      }, 0);

      // Calculate total time spent trading (sum of all flip durations)
      const totalTimeMinutes = flips.reduce((sum, flip) => {
        if (!flip.opened_time || !flip.closed_time) return sum;
        const open = new Date(flip.opened_time);
        const close = new Date(flip.closed_time);
        const durationMinutes = (close.getTime() - open.getTime()) / (1000 * 60);
        return sum + durationMinutes;
      }, 0);

      const profitPerHour = totalTimeMinutes > 0 ? (totalProfit / totalTimeMinutes) * 60 : 0;
      const avgProfitPerFlip = totalProfit / flips.length;

      // Group flips by item for detailed breakdown
      const itemBreakdown = new Map();
      flips.forEach(flip => {
        const itemName = flip.item_name;
        if (!itemBreakdown.has(itemName)) {
          itemBreakdown.set(itemName, {
            name: itemName,
            flips: 0,
            profit: 0,
            timeMinutes: 0
          });
        }
        
        const item = itemBreakdown.get(itemName);
        item.flips += 1;
        item.profit += (flip.received_post_tax - flip.spent);
        
        if (flip.opened_time && flip.closed_time) {
          const open = new Date(flip.opened_time);
          const close = new Date(flip.closed_time);
          const durationMinutes = (close.getTime() - open.getTime()) / (1000 * 60);
          // Only add valid positive durations
          if (durationMinutes > 0) {
            item.timeMinutes += durationMinutes;
          }
        }
      });

      const items = Array.from(itemBreakdown.values())
        .map(item => ({
          ...item,
          profitPerHour: item.timeMinutes > 0 ? (item.profit / item.timeMinutes) * 60 : 0
        }))
        .sort((a, b) => b.profit - a.profit); // Sort by total profit

      return {
        name: strategyName,
        totalFlips: flips.length,
        totalProfit,
        totalTimeMinutes,
        profitPerHour,
        avgProfitPerFlip,
        items: items // All contributing items
      };
    };

    const volumeMetrics = calculateStrategyMetrics(volumeFlips, 'High Volume');
    const valueMetrics = calculateStrategyMetrics(valueFlips, 'High Value');

    // Determine the winner
    const winner = volumeMetrics.profitPerHour > valueMetrics.profitPerHour ? 'volume' : 'value';
    const winnerMargin = Math.abs(volumeMetrics.profitPerHour - valueMetrics.profitPerHour);

    return {
      volume: volumeMetrics,
      value: valueMetrics,
      winner,
      winnerMargin,
      totalValidFlips: validFlips.length,
      unclassifiedFlips: unclassifiedFlips.length
    };
  }, [flips, dateValidation.status]);

  // Starting cash stack calculation
  const cashStackInfo = useMemo(() => {
    if (!date || !summaries || dateValidation.status !== 'valid') return null;
    
    // Find the daily summary for the selected date
    const dailySummary = summaries.find(summary => summary.date === date);
    if (!dailySummary) return null;
    
    const endingNetWorth = dailySummary.net_worth || 0;
    const dayProfit = dailySummary.profit || 0;
    const startingCash = endingNetWorth - dayProfit;
    
    return {
      startingCash,
      endingNetWorth,
      dayProfit,
      percentGain: dayProfit > 0 && startingCash > 0 ? (dayProfit / startingCash) * 100 : 0
    };
  }, [date, summaries, dateValidation.status]);

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
          <LoadingSpinner size="large" text="Loading strategy battle..." />
        </div>
      </div>
    );
  }

  // Error State
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
          <ErrorMessage
            title="Failed to load strategy battle data"
            error={flipsError || summaryError}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  // Main Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-2 sm:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-3 sm:p-6 shadow-lg max-w-full overflow-hidden">
        
        {/* Page Header */}
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-white">⚔️ Strategy Battle: Volume vs Value</h1>

        {/* Date Navigation Controls */}
        {summaryDates && (
          <DateNavigation currentDate={date} basePath="/volume" />
        )}

        {/* Enhanced Empty States */}
        
        {/* State 1: No date selected */}
        {dateValidation.status === 'no_date' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-gray-400 text-lg">Please select a date to see the strategy battle</p>
            <p className="text-gray-500 text-sm mt-2">
              Compare High Volume vs High Value trading strategies for any completed trading day
            </p>
          </div>
        )}

        {/* State 2: Future date */}
        {dateValidation.status === 'future_date' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-gray-400 text-lg">No data yet - {date} is in the future</p>
            <p className="text-gray-500 text-sm mt-2">
              Please select a past date to view completed strategy battles
            </p>
          </div>
        )}

        {/* State 3: Today's incomplete data */}
        {dateValidation.status === 'today_incomplete' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-400 text-lg">Today's data is still updating</p>
            <p className="text-gray-500 text-sm mt-2">
              Check back tomorrow for complete strategy battle analysis, or select yesterday's date
            </p>
          </div>
        )}

        {/* State 4: No trading activity */}
        {dateValidation.status === 'no_activity' && !isLoading && !hasError && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-gray-400 text-lg">No trading activity on {date}</p>
            <p className="text-gray-500 text-sm mt-2">
              No completed flips found for strategy analysis
            </p>
          </div>
        )}

        {/* Strategy Battle Analysis */}
        {date && strategyAnalysis && (
          <div className="space-y-6">
            
            {/* Battle Results Header with Cash Stack */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-4">Battle Results for {date}</h2>
              
              {/* Cash Stack Info Card */}
              {cashStackInfo && (
                <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-4 max-w-md mx-auto">
                  <div className="text-sm font-medium text-yellow-300 mb-2">Starting Cash Stack</div>
                  <div className="text-2xl font-bold text-yellow-400 mb-1">
                    {formatGP(cashStackInfo.startingCash)} GP
                  </div>
                  <div className="text-xs text-yellow-200 space-y-1">
                    <div>Gained: {formatGP(cashStackInfo.dayProfit)} GP ({cashStackInfo.percentGain.toFixed(1)}%)</div>
                    <div>Ended with: {formatGP(cashStackInfo.endingNetWorth)} GP</div>
                  </div>
                </div>
              )}
              
              {/* Battle Winner */}
              <div className={`text-lg font-medium ${
                strategyAnalysis.winner === 'volume' ? 'text-green-400' : 'text-blue-400'
              }`}>
                🏆 {strategyAnalysis.winner === 'volume' ? 'High Volume' : 'High Value'} Strategy Wins!
              </div>
              {strategyAnalysis.winnerMargin > 0 && (
                <div className="text-sm text-gray-400 mt-1">
                  Margin: +{formatGP(strategyAnalysis.winnerMargin)} GP/hour
                </div>
              )}
            </div>

            {/* Strategy Comparison Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* High Volume Strategy Card */}
              <div className={`border-2 rounded-xl p-4 ${
                strategyAnalysis.winner === 'volume' 
                  ? 'border-green-400 bg-green-900/20' 
                  : 'border-gray-600 bg-gray-800/50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">📈 High Volume Strategy</h3>
                  {strategyAnalysis.winner === 'volume' && (
                    <span className="text-green-400 text-2xl">👑</span>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {formatGP(strategyAnalysis.volume.profitPerHour)}
                      </div>
                      <div className="text-xs text-gray-400">GP/hour</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">
                        {strategyAnalysis.volume.totalFlips}
                      </div>
                      <div className="text-xs text-gray-400">flips</div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-mono text-yellow-400">
                      {formatGP(strategyAnalysis.volume.totalProfit)} GP
                    </div>
                    <div className="text-xs text-gray-400">total profit</div>
                  </div>

                  {strategyAnalysis.volume.items.length > 0 && (
                    <ItemBreakdown 
                      items={strategyAnalysis.volume.items} 
                      color="green"
                      strategyName="High Volume"
                    />
                  )}
                </div>
              </div>

              {/* High Value Strategy Card */}
              <div className={`border-2 rounded-xl p-4 ${
                strategyAnalysis.winner === 'value' 
                  ? 'border-blue-400 bg-blue-900/20' 
                  : 'border-gray-600 bg-gray-800/50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">💎 High Value Strategy</h3>
                  {strategyAnalysis.winner === 'value' && (
                    <span className="text-blue-400 text-2xl">👑</span>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {formatGP(strategyAnalysis.value.profitPerHour)}
                      </div>
                      <div className="text-xs text-gray-400">GP/hour</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">
                        {strategyAnalysis.value.totalFlips}
                      </div>
                      <div className="text-xs text-gray-400">flips</div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-mono text-yellow-400">
                      {formatGP(strategyAnalysis.value.totalProfit)} GP
                    </div>
                    <div className="text-xs text-gray-400">total profit</div>
                  </div>

                  {strategyAnalysis.value.items.length > 0 && (
                    <ItemBreakdown 
                      items={strategyAnalysis.value.items} 
                      color="blue"
                      strategyName="High Value"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Strategy Definitions */}
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-3">Strategy Definitions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-green-400">📈 High Volume Strategy</div>
                  <div className="text-gray-300 mt-1">
                    Flips with {HIGH_VOLUME_QUANTITY.toLocaleString()}+ items per trade. Fast-moving goods like runes, arrows, and bulk commodities.
                  </div>
                </div>
                <div>
                  <div className="font-medium text-blue-400">💎 High Value Strategy</div>
                  <div className="text-gray-300 mt-1">
                    Flips with fewer than {HIGH_VALUE_QUANTITY} items per trade. Expensive items like weapons, armor, and rare goods.
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Summary */}
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-3">Analysis Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                <div>
                  <div className="text-xl font-bold text-white">{strategyAnalysis.totalValidFlips}</div>
                  <div className="text-gray-400">total flips</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-400">{strategyAnalysis.volume.totalFlips}</div>
                  <div className="text-gray-400">volume flips</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-blue-400">{strategyAnalysis.value.totalFlips}</div>
                  <div className="text-gray-400">value flips</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-400">{strategyAnalysis.unclassifiedFlips}</div>
                  <div className="text-gray-400">unclassified</div>
                </div>
              </div>
            </div>

            {/* About This Analysis */}
            <div className="bg-gradient-to-r from-purple-800/30 to-blue-800/30 border border-purple-500/30 rounded-xl p-4">
              <h4 className="text-lg font-bold text-white mb-3">💡 How This Analysis Works</h4>
              <div className="text-sm text-gray-300 space-y-3">
                <div>
                  <strong className="text-white">Strategy Classification:</strong> Each flip is automatically categorized based on quantity traded:
                  <ul className="mt-1 ml-4 space-y-1 text-xs">
                    <li>• <span className="text-green-400">High Volume</span>: 1,000+ items per flip (bulk commodities, runes, arrows)</li>
                    <li>• <span className="text-blue-400">High Value</span>: &lt;100 items per flip (expensive gear, rare items)</li>
                    <li>• <span className="text-gray-400">Unclassified</span>: 100-999 items (medium-value trades)</li>
                  </ul>
                </div>
                
                <div>
                  <strong className="text-white">Profit Per Hour Calculation:</strong> For each strategy, we calculate:
                  <ul className="mt-1 ml-4 space-y-1 text-xs">
                    <li>• Total profit from all flips in that category</li>
                    <li>• Total time spent (from flip open to close times)</li>
                    <li>• Individual item contributions and percentages</li>
                    <li>• Final GP/hour rate that determines the winner</li>
                  </ul>
                </div>
                
                <div>
                  <strong className="text-white">What the Data Shows:</strong> The detailed breakdown reveals which specific items 
                  drive each strategy's performance, how much time was invested in each, and their individual hourly rates. 
                  This transparency helps you understand exactly what makes each strategy profitable on any given day.
                </div>
                
                <p className="text-xs text-gray-400 pt-1 border-t border-gray-600">
                  * Analysis uses actual flip durations and post-tax profits for maximum accuracy
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}