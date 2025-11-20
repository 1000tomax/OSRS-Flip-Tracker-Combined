import { useAccountFilter } from '../contexts/AccountFilterContext';
import { formatGP } from '../utils/formatUtils';

export default function AccountFilterBar() {
  const {
    selectedAccounts,
    availableAccounts,
    toggleAccount,
    selectAll,
    clearAll,
    isAccountSelected,
    isFiltered,
    getFilteredData,
  } = useAccountFilter();

  if (availableAccounts.length <= 1) {
    return null;
  }

  const filteredData = getFilteredData();
  const showingAll = selectedAccounts.length === availableAccounts.length;

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-700 sticky top-10 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-400">Accounts:</span>
              <div className="flex gap-2 flex-wrap">
                {availableAccounts.map(account => (
                  <button
                    key={account}
                    onClick={() => toggleAccount(account)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      isAccountSelected(account)
                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-300'
                    }`}
                    title={`${isAccountSelected(account) ? 'Hide' : 'Show'} ${account}`}
                  >
                    {account}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 border-l border-gray-700 pl-3">
              <button
                onClick={selectAll}
                disabled={showingAll}
                className={`px-2 py-1 text-xs rounded ${
                  showingAll
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={clearAll}
                disabled={selectedAccounts.length === 0}
                className={`px-2 py-1 text-xs rounded ${
                  selectedAccounts.length === 0
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                None
              </button>
            </div>
          </div>

          {isFiltered && filteredData && (
            <div className="text-xs text-gray-400 flex items-center gap-3">
              <span>
                Showing {selectedAccounts.length} of {availableAccounts.length} accounts
              </span>
              <span className="text-gray-600">|</span>
              <span>{filteredData.totalFlips.toLocaleString()} flips</span>
              <span className="text-gray-600">|</span>
              <span className="text-green-400">{formatGP(filteredData.totalProfit)}</span>
            </div>
          )}

          {selectedAccounts.length === 0 && (
            <div className="text-xs text-orange-400">
              No accounts selected - Select at least one account to view data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
