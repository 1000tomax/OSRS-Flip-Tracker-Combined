export default function NaturalLanguageInput({ query, onQueryChange, onGenerate, loading }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">
          🤖 What items do you want to trade?
        </label>
        <textarea
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="e.g., F2P items between 100k and 10m"
          maxLength={500}
          rows={3}
          disabled={loading}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">Powered by Claude AI ✨</span>
          <span className="text-xs text-gray-500">{query.length}/500</span>
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={loading || !query.trim()}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="h-5 w-5 rounded-full border-3 border-white border-t-transparent animate-spin" />
            <span>Understanding your request...</span>
          </>
        ) : (
          <>
            <span>⚡</span>
            <span>Generate Blocklist</span>
          </>
        )}
      </button>
    </div>
  );
}
