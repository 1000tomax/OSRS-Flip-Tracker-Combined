/**
 * ITEMS PAGE COMPONENT
 * 
 * This page displays comprehensive statistics for all traded items.
 * It shows aggregated performance data across all trading sessions,
 * helping users identify their most profitable items and trading patterns.
 * 
 * Key features:
 * - Search functionality to find specific items
 * - Toggle between table and card view modes
 * - Comprehensive item statistics (profit, ROI, flip count)
 * - Responsive design for all device sizes
 * - Sortable data with multiple sorting options
 * 
 * Data source:
 * - Loads pre-processed item statistics from CSV file
 * - Shows aggregated data across all trading history
 * - Includes profit, ROI, flip counts, and performance metrics
 * 
 * This page helps traders identify:
 * - Which items are most profitable
 * - Which items they trade most frequently
 * - ROI performance across different items
 * - Trading patterns and preferences
 */

import React, { useState } from "react";
import { useCsvData } from "../hooks/useCsvData";
import LoadingSpinner, { ErrorMessage } from "../components/LoadingSpinner";
import SearchControls, { ResultsCount } from "../components/SearchControls";
import ItemCards, { itemStatsColumns } from "../components/ItemCards";
import SortableTable from "../components/SortableTable";
import { formatGP, formatPercent } from "../lib/utils";

/**
 * Items Component - Item statistics and analysis page
 * 
 * This component manages the display of item trading statistics with
 * search functionality and multiple view modes.
 * 
 * @returns {JSX.Element} - Complete items page with search, filtering, and data display
 */
export default function Items() {
  // Data loading and component state
  const { data: items, loading, error } = useCsvData("/data/item-stats.csv");  // Load item statistics
  const [query, setQuery] = useState("");                    // Search query for filtering items
  const [viewMode, setViewMode] = useState("table");        // Display mode: "table" or "cards"

  // Loading State - Show spinner while data loads
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
          <LoadingSpinner size="large" text="Loading item statistics..." />
        </div>
      </div>
    );
  }

  // Error State - Show error message if data loading failed
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
          <ErrorMessage 
            title="Failed to load item statistics"
            error={error}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  // Filter items based on search query
  const filtered = items
    .filter(item =>
      item.item_name.toLowerCase().includes(query.toLowerCase())  // Case-insensitive search
    );

  /**
   * Table Column Definitions for Items Statistics
   * 
   * These columns show comprehensive trading statistics for each item.
   * Each column includes custom formatting and styling for optimal display.
   */
  const tableColumns = [
    // Item Name - Truncated for long names with full name on hover
    {
      key: 'item_name',
      label: 'Item Name',
      render: (value) => (
        <span className="font-medium max-w-[200px] truncate" title={value}>
          {value}
        </span>
      )
    },
    
    // Total number of flips for this item
    {
      key: 'flips',
      label: 'Flips',
      cellClass: 'text-gray-300'
    },
    
    // Total profit earned from this item (color-coded)
    {
      key: 'total_profit',
      label: 'Total Profit',
      cellClass: 'font-mono font-medium',
      render: (value) => (
        <span className={Number(value) >= 0 ? "text-green-400" : "text-red-400"}>
          {formatGP(Number(value))} GP
        </span>
      )
    },
    
    // Total amount invested in this item
    {
      key: 'total_spent',
      label: 'Total Spent',
      cellClass: 'text-gray-300 font-mono',
      render: (value) => formatGP(Number(value))
    },
    
    // Return on Investment percentage (color-coded)
    {
      key: 'roi_percent',
      label: 'ROI %',
      cellClass: 'font-mono font-medium',
      render: (value) => (
        <span className={Number(value) >= 0 ? "text-green-400" : "text-red-400"}>
          {formatPercent(Number(value))}
        </span>
      )
    },
    
    // Average profit per individual flip
    {
      key: 'avg_profit_per_flip',
      label: 'Avg/Flip',
      cellClass: 'text-gray-300 font-mono',
      render: (value) => formatGP(Number(value)) + ' GP'
    },
    
    // When this item was last traded
    {
      key: 'last_flipped',
      label: 'Last Flipped',
      cellClass: 'text-gray-400 text-sm',
      sortValue: (row) => new Date(row.last_flipped).getTime()  // Custom sort by date
    }
  ];

  // Main render - Show the complete items statistics interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
        
        {/* Page Header */}
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-white">📊 Full Item Stats</h1>

        {/* Search and View Controls */}
        <SearchControls 
          query={query}                    // Current search query
          onQueryChange={setQuery}         // Update search when user types
          placeholder="Search items..."    // Helpful placeholder text
          viewMode={viewMode}              // Current view mode (table/cards)
          onViewModeChange={setViewMode}   // Switch between view modes
          showViewToggle={true}            // Show the view mode toggle
        />

        {/* Results Count - Shows how many items match the current search */}
        <ResultsCount count={filtered.length} noun="item" />

        {/* Mobile Card View - Only shown on mobile when cards mode is selected */}
        {viewMode === "cards" && (
          <ItemCards 
            items={filtered.map(item => ({ ...item, id: item.item_name }))}  // Add unique IDs
            columns={itemStatsColumns}     // Use predefined card column configuration
            className="sm:hidden"          // Only visible on small screens
          />
        )}

        {/* Table View - Main data display */}
        <div className={`${viewMode === "cards" ? "hidden sm:block" : "block"}`}>
          <div className="rounded-lg border border-gray-700">
            <SortableTable 
              data={filtered.map(item => ({ ...item, id: item.item_name }))}  // Add unique IDs for React keys
              columns={tableColumns}         // Use detailed table columns
              initialSortField="total_profit" // Sort by profit by default
              initialSortDirection="desc"     // Show highest profit first
              className="text-white"
            />
          </div>
          
          {/* Mobile Usability Hint */}
          <p className="text-xs text-gray-500 mt-3 sm:hidden">
            💡 Swipe horizontally to see all columns
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * ITEMS PAGE PATTERNS - LEARNING NOTES
 * 
 * 1. **Search and Filter Functionality**:
 *    - Real-time search filtering as user types
 *    - Case-insensitive search for better usability
 *    - Results count provides immediate feedback
 *    - Clear visual indication of filter results
 * 
 * 2. **Multiple View Modes**:
 *    - Table view for detailed data analysis
 *    - Card view for mobile-friendly browsing
 *    - Automatic view switching based on screen size
 *    - Consistent data display across both modes
 * 
 * 3. **Data Presentation**:
 *    - Color-coded financial metrics (green/red for profit/loss)
 *    - Formatted numbers for readability (GP notation, percentages)
 *    - Truncated text with hover tooltips for long item names
 *    - Sorted by most important metric (total profit) by default
 * 
 * 4. **Responsive Design**:
 *    - Progressive enhancement: table on desktop, cards on mobile
 *    - Different column sets for different view modes
 *    - Mobile usability hints for complex interactions
 *    - Proper touch targets and spacing
 * 
 * 5. **Performance Considerations**:
 *    - Simple array filtering for fast search results
 *    - Minimal re-renders through proper state management
 *    - Efficient key generation for React list rendering
 * 
 * 6. **User Experience**:
 *    - Immediate visual feedback for all interactions
 *    - Clear data hierarchy and importance
 *    - Helpful empty states and loading indicators
 *    - Consistent behavior with other pages
 * 
 * 7. **Component Reusability**:
 *    - Leverages shared components (SearchControls, SortableTable, ItemCards)
 *    - Consistent column definition patterns
 *    - Standardized styling and behavior
 * 
 * 8. **Data Analysis Features**:
 *    - Multiple sorting options for different analysis needs
 *    - Key metrics easily comparable in table format
 *    - Historical data (last flipped dates) for trend analysis
 *    - ROI and profitability metrics for decision making
 */