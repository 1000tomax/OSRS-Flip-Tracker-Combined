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

import React, { useState } from 'react';
import { useCsvData } from '../hooks/useCsvData';
import SearchControls, { ResultsCount } from '../components/SearchControls';
import ItemCards from '../components/ItemCards';
import { itemStatsColumns } from '../lib/columnConfigs.jsx';
import SortableTable from '../components/SortableTable';
import { formatPercent } from '../lib/utils';
import { formatGP } from '../utils/formatUtils';
import { ItemWithIcon } from '../components/ItemIcon';
import {
  PageContainer,
  CardContainer,
  PageHeader,
  LoadingLayout,
  ErrorLayout,
} from '../components/layouts';
import { exportToCsv, generateCsvFilename } from '../lib/csvExport';
import { toast } from 'sonner';

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
  const { data: items, loading, error } = useCsvData('/data/item-stats.csv'); // Load item statistics
  const [query, setQuery] = useState(''); // Search query for filtering items
  const [viewMode, setViewMode] = useState('table'); // Display mode: "table" or "cards"

  // Loading State - Show spinner while data loads
  if (loading) {
    return <LoadingLayout text="Loading item statistics..." />;
  }

  // Error State - Show error message if data loading failed
  if (error) {
    return (
      <ErrorLayout
        title="Failed to load item statistics"
        error={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Filter items based on search query (supports comma-separated searches)
  const filtered = items.filter(item => {
    // Ensure item_name exists and is a string
    const itemName = item?.item_name;
    if (typeof itemName !== 'string') {
      console.warn('Invalid item_name:', item);
      return false;
    }

    // If no query, show all items
    if (!query.trim()) return true;

    // Split by comma and check if any search term matches
    const searchTerms = query
      .split(',')
      .map(term => term.trim().toLowerCase())
      .filter(term => term.length > 0);

    if (searchTerms.length === 0) return true;

    const itemNameLower = itemName.toLowerCase();
    return searchTerms.some(term => itemNameLower.includes(term));
  });

  // Handle CSV export
  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Use the table columns for export (excluding render functions)
    const exportColumns = tableColumns.map(col => ({
      key: col.key,
      label: col.label,
      sortValue: col.sortValue,
    }));

    const filename = generateCsvFilename('osrs-items');
    exportToCsv(filtered, exportColumns, filename);
  };

  /**
   * Table Column Definitions for Items Statistics
   *
   * These columns show comprehensive trading statistics for each item.
   * Each column includes custom formatting and styling for optimal display.
   */
  const tableColumns = [
    // Item Name - With icon and truncated for long names with full name on hover
    {
      key: 'item_name',
      label: 'Item Name',
      render: value => (
        <div className="flex items-center gap-2 max-w-[200px]">
          <ItemWithIcon 
            itemName={value} 
            textClassName="font-medium truncate"
          />
        </div>
      ),
    },

    // Total number of flips for this item
    {
      key: 'flips',
      label: 'Flips',
      cellClass: 'text-gray-300',
    },

    // Total profit earned from this item (color-coded)
    {
      key: 'total_profit',
      label: 'Total Profit',
      cellClass: 'font-mono font-medium',
      render: value => {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          console.warn('Invalid total_profit value:', value);
          return <span className="text-gray-400">0 GP</span>;
        }
        return (
          <span className={numValue >= 0 ? 'text-green-400' : 'text-red-400'}>
            {formatGP(numValue)}
          </span>
        );
      },
    },

    // Total amount invested in this item
    {
      key: 'total_spent',
      label: 'Total Spent',
      cellClass: 'text-gray-300 font-mono',
      render: value => {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          console.warn('Invalid total_spent value:', value);
          return '0';
        }
        return formatGP(numValue);
      },
    },

    // Return on Investment percentage (color-coded)
    {
      key: 'roi_percent',
      label: 'ROI %',
      cellClass: 'font-mono font-medium',
      render: value => {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          console.warn('Invalid roi_percent value:', value);
          return <span className="text-gray-400">0.00%</span>;
        }
        return (
          <span className={numValue >= 0 ? 'text-green-400' : 'text-red-400'}>
            {formatPercent(numValue)}
          </span>
        );
      },
    },

    // Average profit per individual flip (color-coded)
    {
      key: 'avg_profit_per_flip',
      label: 'Avg/Flip',
      cellClass: 'font-mono',
      render: value => {
        const numValue = Number(value);
        if (!Number.isFinite(numValue)) {
          console.warn('Invalid avg_profit_per_flip value:', value);
          return <span className="text-gray-400">0 GP</span>;
        }
        return (
          <span className={numValue >= 0 ? 'text-green-400' : 'text-red-400'}>
            {formatGP(numValue)}
          </span>
        );
      },
    },

    // When this item was last traded
    {
      key: 'last_flipped',
      label: 'Last Flipped',
      cellClass: 'text-gray-400 text-sm',
      sortValue: row => new Date(row.last_flipped).getTime(), // Custom sort by date
    },
  ];

  // Main render - Show the complete items statistics interface
  return (
    <PageContainer>
      <CardContainer>
        <PageHeader title="Full Item Stats" icon="📊" />

        {/* Search and View Controls */}
        <SearchControls
          query={query} // Current search query
          onQueryChange={setQuery} // Update search when user types
          placeholder="Search items... (e.g., 'Dragon bones' or 'Rune sword, Magic logs, Whip')" // Helpful placeholder text
          viewMode={viewMode} // Current view mode (table/cards)
          onViewModeChange={setViewMode} // Switch between view modes
          showViewToggle={true} // Show the view mode toggle
          extraControls={
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition flex items-center gap-2 text-sm font-medium"
              title="Export filtered results to CSV"
              data-html2canvas-ignore="true"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
          }
        />

        {/* Results Count - Shows how many items match the current search */}
        <ResultsCount count={filtered.length} noun="item" />

        {/* Mobile Card View - Only shown on mobile when cards mode is selected */}
        {viewMode === 'cards' && (
          <ItemCards
            items={filtered.map(item => ({ ...item, id: item.item_name }))} // Add unique IDs
            columns={itemStatsColumns} // Use predefined card column configuration
            className="sm:hidden" // Only visible on small screens
          />
        )}

        {/* Table View - Main data display */}
        <div className={`${viewMode === 'cards' ? 'hidden sm:block' : 'block'}`}>
          <div className="rounded-lg border border-gray-700">
            <SortableTable
              data={filtered.map(item => ({ ...item, id: item.item_name }))} // Add unique IDs for React keys
              columns={tableColumns} // Use detailed table columns
              initialSortField="total_profit" // Sort by profit by default
              initialSortDirection="desc" // Show highest profit first
              className="text-white"
            />
          </div>

          {/* Mobile Usability Hint */}
          <p className="text-xs text-gray-500 mt-3 sm:hidden">
            💡 Swipe horizontally to see all columns
          </p>
        </div>
      </CardContainer>
    </PageContainer>
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
