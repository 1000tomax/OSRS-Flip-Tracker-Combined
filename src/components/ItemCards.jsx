/**
 * ITEM CARDS COMPONENT
 * 
 * This component displays item data in a card-based layout instead of a table.
 * It's particularly useful for mobile devices where tables don't work well.
 * 
 * Key features:
 * - Responsive grid layout that adapts to screen size
 * - Flexible column definitions (same as SortableTable)
 * - Click handling for interactive features
 * - Predefined configurations for common data types
 * 
 * Think of it as the "mobile-friendly" version of SortableTable.
 */

import React from 'react';
import { formatGP, formatPercent } from '../lib/utils';

/**
 * ItemCards Component - Displays items in a responsive card grid
 * 
 * @param {Array} items - Array of item objects to display
 * @param {Array} columns - Column definitions (same format as SortableTable)
 * @param {string} gridCols - Tailwind grid classes for responsive layout
 * @param {string} className - Additional CSS classes
 * @param {Function} onItemClick - Callback when a card is clicked
 * @returns {JSX.Element} - Grid of item cards
 */
export default function ItemCards({ 
  items, 
  columns,
  gridCols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  className = "",
  onItemClick = null
}) {
  return (
    <div className={`grid ${gridCols} gap-4 ${className}`}>
      {/* Map through each item and create a card for it */}
      {items.map((item, index) => (
        <ItemCard 
          key={item.id || item.item_name || index}  // Use ID if available, fallback to name or index
          item={item}
          columns={columns}
          onClick={onItemClick}
        />
      ))}
    </div>
  );
}

/**
 * Individual Item Card Component - Single card displaying one item's data
 * 
 * @param {Object} item - Item data object
 * @param {Array} columns - Column definitions for what data to show
 * @param {Function} onClick - Optional click handler
 * @returns {JSX.Element} - Single item card
 */
function ItemCard({ item, columns, onClick }) {
  // Create click handler that passes the item data to parent
  const handleClick = () => {
    if (onClick) onClick(item);
  };

  // Get item name from various possible properties (flexible data structure)
  const title = item.item_name || item.name || 'Unknown Item';
  
  return (
    <div
      className={`bg-gray-800 border border-gray-600 rounded-xl p-4 hover:ring-2 hover:ring-yellow-500 transition duration-150 ${
        onClick ? 'cursor-pointer' : ''  // Only show pointer cursor if clickable
      }`}
      onClick={handleClick}
    >
      {/* Card header with item name */}
      <h3 className="font-bold text-lg text-yellow-400 truncate mb-3" title={title}>
        {title}
      </h3>
      
      {/* Grid layout for data fields */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {columns.map((column) => (
          <div key={column.key}>
            {/* Field label */}
            <span className="text-gray-400 block">{column.label}:</span>
            {/* Field value - use custom render function if provided, otherwise show raw value */}
            <span className={column.cellClass || ''}>
              {column.render ? column.render(item[column.key], item) : item[column.key]}
            </span>
          </div>
        ))}
      </div>
      
      {/* Optional footer with additional info */}
      {item.last_flipped && (
        <div className="text-xs text-gray-500 pt-3 mt-3 border-t border-gray-700">
          Last flipped: {item.last_flipped}
        </div>
      )}
    </div>
  );
}

/**
 * Predefined Column Configurations
 * 
 * These are pre-made column definitions for common data displays.
 * They define how to show item statistics in a consistent way across the app.
 */

// Column configuration for item statistics (used on Items page)
export const itemStatsColumns = [
  {
    key: 'flips',                    // Data field name
    label: 'Flips',                  // Display label
    render: (value) => <span className="text-white font-medium">{value}</span>
  },
  {
    key: 'total_profit',
    label: 'Profit',
    cellClass: 'font-medium font-mono',
    render: (value) => (
      // Color code profit: green for positive, red for negative
      <span className={`font-medium font-mono ${Number(value) >= 0 ? "text-green-400" : "text-red-400"}`}>
        {formatGP(Number(value))} GP
      </span>
    )
  },
  {
    key: 'roi_percent',
    label: 'ROI',
    cellClass: 'font-medium font-mono',
    render: (value) => (
      // Color code ROI: green for positive, red for negative
      <span className={`font-medium font-mono ${Number(value) >= 0 ? "text-green-400" : "text-red-400"}`}>
        {formatPercent(Number(value))}
      </span>
    )
  },
  {
    key: 'avg_profit_per_flip',
    label: 'Avg/Flip',
    render: (value) => <span className="text-white font-medium font-mono">{formatGP(Number(value))} GP</span>
  }
];

/**
 * ITEM CARDS PATTERNS - LEARNING NOTES
 * 
 * 1. **Responsive Design**:
 *    - Grid layout automatically adjusts to screen size
 *    - Cards stack vertically on mobile, spread horizontally on desktop
 *    - Configurable grid columns via gridCols prop
 * 
 * 2. **Flexible Data Display**:
 *    - Uses same column definition format as SortableTable
 *    - Custom render functions for complex data formatting
 *    - Supports any data structure through flexible property access
 * 
 * 3. **Interactive Features**:
 *    - Optional click handling for navigation or selection
 *    - Visual feedback on hover (ring effect)
 *    - Conditional cursor styling based on interactivity
 * 
 * 4. **Component Composition**:
 *    - Main component handles layout and iteration
 *    - Sub-component handles individual card rendering
 *    - Clean separation of concerns
 * 
 * 5. **User Experience**:
 *    - Truncated text with full text on hover (title attribute)
 *    - Color-coded financial data (green/red for profit/loss)
 *    - Consistent spacing and visual hierarchy
 * 
 * 6. **Code Reusability**:
 *    - Predefined column configurations for common use cases
 *    - Flexible prop system allows customization
 *    - Can be used across different pages with different data types
 * 
 * 7. **Performance Considerations**:
 *    - Proper key props for efficient React rendering
 *    - Minimal conditional logic in render functions
 *    - CSS transitions handled by browser GPU
 */