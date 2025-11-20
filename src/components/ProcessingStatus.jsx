export default function ProcessingStatus({ stats }) {
  const { rowsProcessed = 0 } = stats || {};

  return (
    <div className="text-center">
      <div className="text-blue-500 text-6xl mb-4 animate-spin">⚙️</div>
      <h2 className="text-2xl font-bold mb-4 text-white">Processing Your Data</h2>

      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-lg mb-2 text-white">
          Processed {rowsProcessed.toLocaleString()} flips
        </div>

        {/* Progress bar - indeterminate since we don't know total until complete */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
          <div
            className="bg-blue-600 h-2 rounded-full animate-pulse"
            style={{ width: '60%' }}
          ></div>
        </div>

        <p className="text-gray-400 text-sm">
          Processing large files can take a moment. Your browser may appear busy.
        </p>

        <div className="mt-4 text-xs text-gray-500">
          💡 Tip: This happens entirely in your browser - no data is sent anywhere
        </div>
      </div>
    </div>
  );
}
