import { useState, useMemo } from 'react';
import SortableTable from '../SortableTable';
import { formatGP } from '../../utils/formatGP';
import { exportToCsv } from '../../lib/csvExport';

export default function QueryResults({ queryType, results, loading }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Show warnings if any
  const warnings = results?.warnings || [];

  // Define columns based on query type
  const columns = useMemo(() => {
    if (results?.type === 'FLIP_LIST') {
      return [
        {
          key: 'item_name',
          label: 'Item',
          sortable: true,
        },
        {
          key: 'opened_time',
          label: 'Opened',
          sortable: true,
          render: value => new Date(value).toLocaleString(),
        },
        {
          key: 'closed_time',
          label: 'Closed',
          sortable: true,
          render: value => (value ? new Date(value).toLocaleString() : '-'),
        },
        {
          key: 'spent',
          label: 'Spent',
          sortable: true,
          render: value => formatGP(value),
        },
        {
          key: 'received_post_tax',
          label: 'Received',
          sortable: true,
          render: value => formatGP(value),
        },
        {
          key: 'profit',
          label: 'Profit',
          sortable: true,
          render: value => (
            <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>
              {formatGP(value)}
            </span>
          ),
        },
      ];
    } else if (results?.type === 'ITEM_LIST') {
      return [
        {
          key: 'item_name',
          label: 'Item',
          sortable: true,
        },
        {
          key: 'total_profit',
          label: 'Total Profit',
          sortable: true,
          render: value => (
            <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>
              {formatGP(value)}
            </span>
          ),
        },
        {
          key: 'flips',
          label: 'Flip Count',
          sortable: true,
        },
        {
          key: 'roi_percent',
          label: 'ROI %',
          sortable: true,
          render: value => `${parseFloat(value).toFixed(2)}%`,
        },
        {
          key: 'avg_profit_per_flip',
          label: 'Avg Profit',
          sortable: true,
          render: value => formatGP(value),
        },
        {
          key: 'last_flipped',
          label: 'Last Flipped',
          sortable: true,
        },
      ];
    }
    return [];
  }, [results?.type]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!results?.data) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return results.data.slice(startIndex, startIndex + itemsPerPage);
  }, [results?.data, currentPage]);

  const totalPages = Math.ceil((results?.data?.length || 0) / itemsPerPage);

  const handleExport = () => {
    if (!results?.data || results.data.length === 0) return;

    const filename = `query-results-${queryType.toLowerCase()}-${Date.now()}.csv`;
    exportToCsv(results.data, columns, filename);
  };

  if (loading) {
    return (
      <div className="mt-6 bg-gray-800 rounded-lg p-8 text-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin h-8 w-8 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
          <div className="text-gray-400">Loading results...</div>
        </div>
      </div>
    );
  }

  if (!results || !results.data || results.data.length === 0) {
    return (
      <div className="mt-6 bg-gray-800 rounded-lg p-8 text-center">
        <div className="text-gray-400">No results found matching your criteria</div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
          <div className="text-yellow-400 font-semibold mb-2">Warnings:</div>
          <ul className="list-disc list-inside text-yellow-300 text-sm">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary Stats */}
      {results.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {results.summary.totalFlips !== undefined && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Flips</div>
              <div className="text-white text-xl font-semibold">
                {results.summary.totalFlips.toLocaleString()}
              </div>
            </div>
          )}

          {results.summary.totalProfit !== undefined && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Profit</div>
              <div
                className={`text-xl font-semibold ${
                  results.summary.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatGP(results.summary.totalProfit)}
              </div>
            </div>
          )}

          {results.summary.averageProfit !== undefined && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Average Profit</div>
              <div
                className={`text-xl font-semibold ${
                  results.summary.averageProfit >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatGP(Math.round(results.summary.averageProfit))}
              </div>
            </div>
          )}

          {results.summary.totalItems !== undefined && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Items Found</div>
              <div className="text-white text-xl font-semibold">{results.summary.totalItems}</div>
            </div>
          )}

          {results.summary.combinedProfit !== undefined && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Combined Profit</div>
              <div
                className={`text-xl font-semibold ${
                  results.summary.combinedProfit >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatGP(results.summary.combinedProfit)}
              </div>
            </div>
          )}

          {results.summary.uniqueItems !== undefined && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Unique Items</div>
              <div className="text-white text-xl font-semibold">{results.summary.uniqueItems}</div>
            </div>
          )}
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition"
        >
          Export to CSV
        </button>
      </div>

      {/* Results Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <SortableTable
          columns={columns}
          data={paginatedData}
          defaultSortColumn={columns[0]?.key}
          defaultSortDirection="desc"
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition"
          >
            Previous
          </button>

          <span className="text-gray-400 mx-4">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
