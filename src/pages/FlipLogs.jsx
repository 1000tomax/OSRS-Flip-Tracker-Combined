/**
 * FLIP LOGS PAGE COMPONENT
 *
 * This page displays detailed transaction logs for a specific trading day.
 * It's one of the most data-rich pages in the application, showing individual
 * flip transactions with comprehensive analysis.
 *
 * Key features:
 * - Date-based navigation to view any trading day
 * - Heat map visualization showing hourly trading activity
 * - Detailed table of individual flip transactions
 * - Summary statistics (total flips, profit)
 * - Responsive design for mobile and desktop viewing
 * - Advanced sorting and filtering capabilities
 *
 * Data flow:
 * 1. Read date from URL query parameter
 * 2. Load corresponding CSV file with flip data
 * 3. Process and filter data for display
 * 4. Render visualizations and tables
 *
 * This page helps traders analyze their daily performance and identify
 * patterns in their trading behavior.
 */

import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import useFlipsByDate from '../hooks/useFlipsByDate';
import useAvailableDates from '../hooks/useAvailableDates';
import DateNavigation from '../components/DateNavigation';
import HeatMap from '../components/HeatMap';
import SortableTable from '../components/SortableTable';
import { formatDuration } from '../lib/utils';
import { formatGP } from '../utils/formatUtils';
import { ItemWithIcon } from '../components/ItemIcon';
import {
  PageContainer,
  CardContainer,
  PageHeader,
  LoadingLayout,
  ErrorLayout,
  ResponsiveGrid,
} from '../components/layouts';
import { exportToCsv, generateCsvFilename } from '../lib/csvExport';
import { toast } from 'sonner';

/**
 * FlipLogs Component - Detailed daily trading analysis page
 *
 * This component manages the complex state and data flow required to display
 * comprehensive trading information for a specific day.
 *
 * @returns {JSX.Element} - Complete flip logs page with navigation, visualizations, and data tables
 */
export default function FlipLogs() {
  // URL and navigation management
  const location = useLocation(); // Current URL location
  const queryParams = new URLSearchParams(location.search); // Parse URL query parameters
  const date = queryParams.get('date'); // Get selected date from URL (?date=MM-DD-YYYY)

  // Data loading hooks
  // Load the summary index to know which dates have data available
  const { data: summaryDates, loading: summaryLoading, error: summaryError } = useAvailableDates();

  // Load the flip data for the selected date from Supabase
  const { data: flips, loading: flipsLoading, error: flipsError } = useFlipsByDate(date);

  // Combine loading and error states from both data sources
  const isLoading = summaryLoading || flipsLoading;
  const hasError = summaryError || flipsError;

  // Calculate summary statistics for the selected day
  const summary = useMemo(() => {
    if (!flips || flips.length === 0) return null;

    // Filter out incomplete or invalid flips
    // Only count flips that actually completed successfully
    const validFlips = flips.filter(
      f =>
        f.closed_quantity > 0 && // Actually sold something
        f.received_post_tax > 0 && // Received money
        f.status === 'FINISHED' // Transaction completed
    );

    const totalFlips = validFlips.length;

    // Calculate total profit across all valid flips
    const totalProfit = validFlips.reduce((sum, flip) => {
      return sum + (flip.received_post_tax - flip.spent);
    }, 0);

    return { totalFlips, totalProfit };
  }, [flips]); // Recalculate when flips data changes

  /**
   * Table Column Definitions
   *
   * These define how each column in the flip logs table should be displayed.
   * Each column has properties for styling, sorting, and custom rendering.
   */
  const flipColumns = [
    // Item Name Column - Always visible, shows what was traded
    {
      key: 'item_name', // Data field name
      label: 'Item', // Column header text
      headerClass: 'text-left', // Header cell styling
      cellClass: 'text-left', // Data cell styling
      render: value => (
        <ItemWithIcon itemName={value || 'Unknown Item'} textClassName="text-white font-medium" />
      ),
    },

    // Quantity Column - Hidden on mobile to save space
    {
      key: 'closed_quantity',
      label: 'Qty',
      headerClass: 'text-right hidden sm:table-cell', // Hidden on small screens
      cellClass: 'text-right text-gray-300 hidden sm:table-cell',
    },

    // Profit Column - Most important metric, always visible
    {
      key: 'profit', // Virtual field (calculated in render)
      label: 'Profit',
      headerClass: 'text-right',
      cellClass: 'text-right font-mono',
      sortValue: row => row.received_post_tax - row.spent, // Custom sorting logic
      render: (_, row) => {
        const profit = row.received_post_tax - row.spent;
        const isProfit = profit >= 0;
        return (
          <span className={`font-semibold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
            {isProfit ? '+' : ''}
            {formatGP(profit)}
          </span>
        );
      },
    },
    // Spent Column - Shows investment amount, hidden on medium screens
    {
      key: 'spent',
      label: 'Spent',
      headerClass: 'text-right hidden md:table-cell', // Hidden on medium and smaller screens
      cellClass: 'text-right text-gray-300 font-mono hidden md:table-cell',
      render: value => formatGP(value), // Format as GP amount
    },

    // Received Column - Shows total received after tax, hidden on medium screens
    {
      key: 'received_post_tax',
      label: 'Received',
      headerClass: 'text-right hidden md:table-cell',
      cellClass: 'text-right text-gray-300 font-mono hidden md:table-cell',
      render: value => formatGP(value),
    },

    // Tax Column - Shows GE tax paid, hidden on large screens and smaller
    {
      key: 'tax_paid',
      label: 'Tax',
      headerClass: 'text-right hidden lg:table-cell',
      cellClass: 'text-right text-gray-300 font-mono hidden lg:table-cell',
      render: value => formatGP(value || 0),
    },

    // Duration Column - Shows how long the flip took, hidden on large screens and smaller
    {
      key: 'duration', // Virtual field (calculated in render)
      label: 'Duration',
      headerClass: 'text-right hidden lg:table-cell', // Only visible on large screens
      cellClass: 'text-right text-gray-300 hidden lg:table-cell',
      sortValue: row => {
        // Custom sorting: sort by milliseconds between open and close
        if (!row.opened_time || !row.closed_time) return 0;
        return new Date(row.closed_time).getTime() - new Date(row.opened_time).getTime();
      },
      render: (_, row) => {
        const open = row.opened_time ? new Date(row.opened_time) : null;
        const close = row.closed_time ? new Date(row.closed_time) : null;
        const duration = open && close ? close.getTime() - open.getTime() : null;
        return duration ? formatDuration(duration) : '—'; // Show "—" if no duration data
      },
    },

    // Time Column - Shows when the flip completed, hidden on large screens and smaller
    {
      key: 'closed_time',
      label: 'Time',
      headerClass: 'text-right hidden lg:table-cell',
      cellClass: 'text-right text-gray-300 hidden lg:table-cell',
      sortValue: row => (row.closed_time ? new Date(row.closed_time).getTime() : 0), // Sort by timestamp
      render: value => {
        const close = value ? new Date(value) : null;
        return close
          ? close.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : '—';
      },
    },
  ];

  /**
   * Processed Flip Data for Table Display
   *
   * This filters the raw flip data to only include valid, completed transactions
   * and adds unique IDs for React rendering optimization.
   */
  const validFlips = useMemo(() => {
    if (!flips) return [];

    return flips
      .filter(
        f =>
          f.closed_quantity > 0 && // Actually sold something
          f.received_post_tax > 0 && // Received money
          f.status === 'FINISHED' // Transaction completed
      )
      .map((flip, index) => ({
        ...flip,
        // Create unique ID for React keys (combines multiple fields to ensure uniqueness)
        id: `${flip.item_name}_${flip.closed_time}_${flip.spent}_${flip.received_post_tax}_${index}`,
      }));
  }, [flips]); // Recalculate when flip data changes

  // Handle CSV export
  const handleExport = () => {
    if (validFlips.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Use the flip columns for export (excluding render functions)
    const exportColumns = flipColumns.map(col => ({
      key: col.key,
      label: col.label,
      sortValue: col.sortValue,
    }));

    const filename = date ? `osrs-flip-logs-${date}.csv` : generateCsvFilename('osrs-flip-logs');
    exportToCsv(validFlips, exportColumns, filename);
  };

  // Loading State - Show spinner while data is being fetched
  if (isLoading) {
    return <LoadingLayout text="Loading flip logs..." />;
  }

  // Error State - Show error message if data loading failed
  if (hasError) {
    return (
      <ErrorLayout
        title="Failed to load flip logs"
        error={flipsError || summaryError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Main Render - Show the complete flip logs interface
  return (
    <PageContainer padding="compact">
      <CardContainer>
        <PageHeader title="Flip Log Viewer" icon="📋" />

        {/* Date Navigation Controls */}
        {summaryDates && <DateNavigation currentDate={date} />}

        {/* Empty States - Show helpful messages when no data to display */}

        {/* State 1: No date selected */}
        {!date && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-gray-400 text-lg">Please select a date to view flip logs</p>
          </div>
        )}

        {/* State 2: Date selected but no flips found */}
        {date && validFlips.length === 0 && !isLoading && !hasError && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-gray-400 text-lg">No flips found for {date}</p>
          </div>
        )}

        {/* Trading Summary Section - Shows when date is selected and has data */}
        {date && summary && (
          <div className="mb-6">
            <div className="text-xl font-bold text-white mb-4">Trading Timeline for {date}</div>

            {/* Key Metrics Grid */}
            <ResponsiveGrid variant="equal" gap="normal" className="mb-6">
              {/* Total Flips Card */}
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-400">
                  {summary.totalFlips}
                </div>
                <div className="text-sm text-gray-400">flips</div>
              </div>

              {/* Total Profit Card */}
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                <div
                  className={`text-2xl sm:text-3xl font-bold ${summary.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {formatGP(summary.totalProfit)}
                </div>
                <div className="text-sm text-gray-400">total</div>
              </div>
            </ResponsiveGrid>

            {/* Hourly Activity Heat Map */}
            {/* This visualizes trading activity throughout the day */}
            <HeatMap flips={flips} date={date} />
          </div>
        )}

        {/* Individual Flips Table - Shows detailed transaction list */}
        {date && validFlips.length > 0 && (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h2 className="text-xl font-bold text-white">
                Individual Flips ({validFlips.length})
              </h2>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition flex items-center gap-2 text-sm font-medium"
                title="Export flip logs to CSV"
                data-html2canvas-ignore="true"
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>
            </div>

            {/* Sortable Data Table */}
            <SortableTable
              data={validFlips} // Processed flip data
              columns={flipColumns} // Column definitions
              initialSortField="closed_time" // Sort by completion time initially
              initialSortDirection="desc" // Newest first
            />
          </div>
        )}
      </CardContainer>
    </PageContainer>
  );
}

/**
 * FLIP LOGS PAGE PATTERNS - LEARNING NOTES
 *
 * 1. **URL-Based State Management**:
 *    - Page state (selected date) stored in URL query parameters
 *    - Enables direct linking to specific dates
 *    - Browser back/forward navigation works correctly
 *    - Shareable URLs for specific trading days
 *
 * 2. **Complex Data Loading**:
 *    - Multiple data sources (summary index + daily CSV files)
 *    - Conditional loading based on selected date
 *    - Proper loading and error state management
 *    - Custom hooks for data fetching abstraction
 *
 * 3. **Performance Optimizations**:
 *    - useMemo for expensive calculations (summary stats, filtered data)
 *    - Proper dependency arrays to prevent unnecessary recalculations
 *    - Efficient table rendering with unique keys
 *
 * 4. **Responsive Table Design**:
 *    - Progressive disclosure: show fewer columns on smaller screens
 *    - Mobile-first approach with hidden classes
 *    - Essential information (item, profit) always visible
 *    - Details (spent, received, duration) shown on larger screens
 *
 * 5. **User Experience Patterns**:
 *    - Clear empty states with helpful messages
 *    - Consistent loading and error state handling
 *    - Visual hierarchy with proper headings and sections
 *    - Color-coded profit/loss indicators
 *
 * 6. **Data Visualization**:
 *    - Heat map for temporal pattern recognition
 *    - Summary cards for quick overview
 *    - Detailed table for transaction-level analysis
 *    - Multiple views of the same data for different insights
 *
 * 7. **Component Architecture**:
 *    - Page component handles state and data orchestration
 *    - Specialized components for UI elements (HeatMap, SortableTable)
 *    - Clear separation between data management and presentation
 *
 * 8. **Advanced Table Features**:
 *    - Custom column definitions with flexible rendering
 *    - Virtual fields calculated during rendering
 *    - Custom sorting logic for complex data types
 *    - Responsive column visibility
 *
 * 9. **React Patterns Demonstrated**:
 *    - Custom hooks for data fetching
 *    - useMemo for performance optimization
 *    - Conditional rendering for different states
 *    - Props destructuring and default values
 *    - Complex state management with multiple data sources
 */
