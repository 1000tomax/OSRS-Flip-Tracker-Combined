/**
 * CHART TOOLTIP COMPONENT
 *
 * This component creates custom tooltips for charts (used with Recharts library).
 * When you hover over data points in charts, this component shows detailed information
 * in a nice-looking popup box.
 *
 * Features:
 * - Supports different types of data (universe items, general charts)
 * - Shows formatted financial data (GP amounts, profit margins)
 * - Displays time-based metrics (hold time, profit per minute)
 * - Uses consistent styling with the rest of the app
 */

import React from 'react';
import { formatGP, formatTime, getCategoryIcon } from '../lib/utils';

/**
 * ChartTooltip Component - Creates hover tooltips for chart data points
 *
 * @param {boolean} active - Whether tooltip should be shown (from Recharts)
 * @param {Array} payload - Array of data points being hovered (from Recharts)
 * @param {string} label - Label for the data point (from Recharts)
 * @param {string} type - Type of tooltip to show ("universe" or default)
 * @returns {JSX.Element|null} - The tooltip element or null if not active
 */
export default function ChartTooltip({ active, payload, label, type = 'universe' }) {
  // Don't show tooltip if chart isn't being hovered or no data available
  if (!active || !payload || !payload[0]) return null;

  // Extract the actual data object from the Recharts payload structure
  // Recharts wraps data in a specific format - payload[0].payload gets the original data
  const data = payload[0].payload;

  // Special formatting for universe/item data (more detailed financial info)
  if (type === 'universe') {
    return (
      <div className="bg-gray-900/95 border border-gray-700 rounded-xl p-3 text-white shadow-2xl backdrop-blur-sm">
        {/* Item name as header */}
        <div className="font-semibold text-yellow-400">{data.name}</div>

        {/* Grid layout for key metrics */}
        <div className="text-xs mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
          {/* Total profit earned from this item */}
          <div className="text-gray-400">Total profit</div>
          <div className="text-green-400">{formatGP(data.profit)}</div>

          {/* Average profit per individual flip */}
          <div className="text-gray-400">Profit/flip</div>
          <div>{formatGP(data.margin)}</div>

          {/* How long items are held on average */}
          <div className="text-gray-400">Hold time</div>
          <div>{formatTime(data.holdMin)}</div>

          {/* Profit efficiency (profit per minute of holding) */}
          <div className="text-gray-400">Profit/min</div>
          <div>{formatGP(Math.round(data.ppm))}</div>

          {/* Item category with icon */}
          <div className="text-gray-400">Category</div>
          <div>
            {getCategoryIcon(data.category)} {data.category}
          </div>
        </div>
      </div>
    );
  }

  // Default simple tooltip for general charts (less detailed)
  return (
    <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 text-white shadow-xl backdrop-blur-sm">
      {/* Show label if provided (usually x-axis value like date/time) */}
      {label && <div className="font-medium text-yellow-400 mb-1">{label}</div>}

      <div className="text-sm">
        {/* Loop through all data series being hovered */}
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between gap-4">
            {/* Data series name (e.g., "Revenue", "Profit") */}
            <span className="text-gray-300">{entry.name}:</span>
            {/* Data value with color matching the chart line/bar */}
            <span style={{ color: entry.color }}>{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Recharts Compatible Tooltip Wrapper
 *
 * This is a wrapper component that ensures compatibility with the Recharts library.
 * Recharts expects tooltips to accept specific props, so this wrapper just passes
 * them through to our main ChartTooltip component.
 *
 * @param {Object} props - All props from Recharts (active, payload, label, etc.)
 * @returns {JSX.Element} - The ChartTooltip component with props passed through
 */
export function RechartsTooltip({ active, payload, label, ...props }) {
  return <ChartTooltip active={active} payload={payload} label={label} {...props} />;
}

/**
 * CHART TOOLTIP PATTERNS - LEARNING NOTES
 *
 * 1. **Third-Party Library Integration**:
 *    - Recharts library expects specific component structure
 *    - Must handle props like 'active', 'payload', 'label' correctly
 *    - Custom components need wrapper functions for compatibility
 *
 * 2. **Conditional Rendering**:
 *    - Only show tooltip when actively hovering (active === true)
 *    - Handle cases where data might be missing or invalid
 *    - Different display modes based on data type
 *
 * 3. **Data Processing**:
 *    - Recharts wraps original data in payload structure
 *    - Must extract actual data from payload[0].payload
 *    - Handle multiple data series in single tooltip
 *
 * 4. **User Experience**:
 *    - Rich visual styling with backdrop blur and shadows
 *    - Color-coded information (green for profit, red for loss)
 *    - Organized layout with clear labels and values
 *
 * 5. **Responsive Design**:
 *    - Grid layout for organized information display
 *    - Consistent sizing and spacing
 *    - Works well on both desktop and mobile
 *
 * 6. **Component Flexibility**:
 *    - Supports different tooltip types via 'type' prop
 *    - Extensible design for future chart types
 *    - Reusable across different chart components
 *
 * 7. **Performance Considerations**:
 *    - Quick early returns prevent unnecessary rendering
 *    - Minimal calculations in render function
 *    - Efficient data extraction from complex payload structure
 */
