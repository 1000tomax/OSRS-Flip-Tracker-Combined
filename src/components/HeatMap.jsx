/**
 * HEAT MAP COMPONENT
 *
 * This component creates a visual "heat map" showing trading activity throughout the day.
 * It takes flip data and creates 24 hourly bars (one for each hour) showing:
 * - How many flips happened in each hour
 * - How much profit was made in each hour
 * - Visual intensity based on activity level
 *
 * Think of it like a bar chart where:
 * - Taller bars = more activity
 * - Green bars = profitable hours
 * - Red bars = loss-making hours
 * - Gray bars = no activity
 *
 * This helps you see patterns like:
 * - What times of day you're most active
 * - Which hours are most profitable
 * - Whether you trade consistently or in bursts
 */

import React, { useMemo } from 'react';
import { formatGP } from '../utils/formatUtils';

/**
 * HeatMap Component - Shows hourly trading activity for a specific day
 *
 * @param {Array} flips - Array of flip transactions for the day
 * @param {string} date - The date being displayed (for debugging/context)
 * @returns {JSX.Element} - The heat map visualization
 */
export default function HeatMap({ flips }) {
  /**
   * Process the flip data into hourly buckets for visualization
   *
   * This is the "brain" of the heat map - it takes raw flip data and organizes
   * it into 24 hourly buckets (0:00-23:59) with statistics for each hour.
   *
   * The useMemo hook means this calculation only runs when the flips data changes,
   * not on every re-render (performance optimization).
   */
  const heatMapData = useMemo(() => {
    // Return empty array if no data (component will show nothing)
    if (!flips || flips.length === 0) return [];

    // Filter out incomplete or invalid flips
    // We only want flips that:
    // - Actually sold something (closed_quantity > 0)
    // - Made money (received_post_tax > 0)
    // - Have a completion time (closed_time exists)
    // - Are marked as finished (not in progress)
    const validFlips = flips.filter(
      f =>
        f.closed_quantity > 0 && f.received_post_tax > 0 && f.closed_time && f.status === 'FINISHED'
    );

    // Create 24 empty buckets, one for each hour of the day
    // Array(24) creates array with 24 undefined elements
    // .fill(0) fills them with 0
    // .map() converts each into an object with hour data
    const hourlyBuckets = Array(24)
      .fill(0)
      .map((_, hour) => ({
        hour, // 0-23 (hour of the day)
        flips: 0, // Number of flips completed this hour
        profit: 0, // Total profit made this hour
        intensity: 0, // Visual intensity (0-1, calculated later)
      }));

    // Go through each valid flip and add it to the appropriate hour bucket
    validFlips.forEach(flip => {
      const closeTime = new Date(flip.closed_time); // Parse the completion time
      const hour = closeTime.getHours(); // Get hour (0-23)
      const profit = flip.received_post_tax - flip.spent; // Calculate profit

      // Add this flip's data to the correct hour bucket
      hourlyBuckets[hour].flips += 1; // Increment flip count
      hourlyBuckets[hour].profit += profit; // Add to profit total
    });

    // Calculate maximum values across all hours for normalization
    // This lets us scale the visual intensity relative to the busiest hour
    const maxFlips = Math.max(...hourlyBuckets.map(b => b.flips));
    const maxProfit = Math.max(...hourlyBuckets.map(b => Math.abs(b.profit)));

    // Calculate visual intensity for each hour (0-1 scale)
    // This determines how tall and opaque each bar appears
    hourlyBuckets.forEach(bucket => {
      // Intensity based on number of flips (more flips = more intense)
      const flipIntensity = maxFlips > 0 ? bucket.flips / maxFlips : 0;

      // Intensity based on profit amount (higher profit = more intense)
      const profitIntensity = maxProfit > 0 ? Math.abs(bucket.profit) / maxProfit : 0;

      // Combine both metrics, weighing flip count slightly higher (0.7 factor)
      // This means busy hours are emphasized more than just profitable hours
      bucket.intensity = Math.max(flipIntensity, profitIntensity * 0.7);
    });

    return hourlyBuckets;
  }, [flips]); // Only recalculate when flips data changes

  if (heatMapData.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Time markers */}
      <div className="flex justify-between items-center mb-2 px-1">
        {['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'].map(time => (
          <div key={time} className="text-xs text-gray-400 font-medium">
            {time}
          </div>
        ))}
      </div>

      {/* Heat map bars container */}
      <div className="flex gap-1 h-8 items-end relative">
        {heatMapData.map((bucket, i) => {
          const intensity = bucket.intensity;
          const height = Math.max(4, intensity * 100); // Min height for visibility
          const isGreen = bucket.profit >= 0;

          return (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-all duration-200 cursor-pointer relative group ${
                intensity > 0
                  ? isGreen
                    ? 'bg-green-500 hover:bg-green-400'
                    : 'bg-red-500 hover:bg-red-400'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              style={{
                height: `${height}%`,
                opacity: intensity > 0 ? Math.max(0.3, intensity) : 0.2,
              }}
            >
              {/* Custom tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-800 border border-gray-600 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                <div className="font-medium text-yellow-400">{bucket.hour}:00</div>
                <div className="text-xs text-gray-300">
                  {bucket.flips} flips •{' '}
                  <span className={bucket.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {bucket.profit >= 0 ? '+' : ''}
                    {formatGP(bucket.profit)}
                  </span>
                </div>
                {/* Tooltip arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * HOW THE HEATMAP WORKS - LEARNING NOTES
 *
 * 1. **Data Processing**:
 *    - Takes raw flip data and groups it by hour (0-23)
 *    - Calculates total flips and profit for each hour
 *    - Normalizes intensity so the busiest hour gets full intensity
 *
 * 2. **Visual Design**:
 *    - 24 bars arranged horizontally (one per hour)
 *    - Bar height represents activity level
 *    - Bar color represents profit (green) vs loss (red)
 *    - Bar opacity represents intensity (more active = more opaque)
 *
 * 3. **Interactive Features**:
 *    - Hover over any bar to see detailed stats
 *    - Smooth animations when data changes
 *    - Responsive design works on mobile
 *
 * 4. **Performance Optimizations**:
 *    - useMemo prevents unnecessary recalculations
 *    - Only re-renders when flips data actually changes
 *    - CSS transitions handled by browser GPU
 *
 * 5. **Learning Concepts Demonstrated**:
 *    - React hooks (useMemo)
 *    - Array methods (map, filter, forEach)
 *    - Date manipulation
 *    - Conditional rendering
 *    - CSS-in-JS styling
 *    - Component composition
 */
