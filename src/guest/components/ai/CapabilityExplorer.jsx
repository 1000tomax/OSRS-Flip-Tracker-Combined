import React, { useState, useEffect } from 'react';

/**
 * Component to show users what queries are possible and guide them
 */
export function CapabilityExplorer({ onQuerySelect }) {
  const [capabilities, setCapabilities] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('common');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCapabilities();
  }, []);

  const loadCapabilities = async () => {
    try {
      const [capabilitiesRes, patternsRes] = await Promise.all([
        fetch('/ai-config/capabilities.json'),
        fetch('/ai-config/query-patterns.json'),
      ]);

      const capabilitiesData = await capabilitiesRes.json();
      const patternsData = await patternsRes.json();

      setCapabilities({
        ...capabilitiesData,
        patterns: patternsData.patterns,
      });
    } catch (error) {
      console.error('Failed to load capabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="text-gray-400">Loading query capabilities...</div>
      </div>
    );
  }

  if (!capabilities) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="text-red-400">Failed to load capabilities</div>
      </div>
    );
  }

  const categories = {
    common: {
      title: 'Common Queries',
      icon: '🎯',
      items: Object.entries(capabilities.patterns)
        .filter(([, pattern]) =>
          [
            'top_items_by_profit',
            'recent_activity',
            'item_performance',
            'profit_analysis',
          ].includes(pattern.intent)
        )
        .map(([, pattern]) => ({
          title: formatIntentTitle(pattern.intent),
          examples: pattern.examples.slice(0, 3),
          description: getIntentDescription(pattern.intent),
        })),
    },
    analysis: {
      title: 'Analysis Queries',
      icon: '📊',
      items: Object.entries(capabilities.patterns)
        .filter(([, pattern]) =>
          ['roi_analysis', 'duration_analysis', 'volume_analysis', 'loss_analysis'].includes(
            pattern.intent
          )
        )
        .map(([, pattern]) => ({
          title: formatIntentTitle(pattern.intent),
          examples: pattern.examples.slice(0, 3),
          description: getIntentDescription(pattern.intent),
        })),
    },
    comparison: {
      title: 'Comparison Queries',
      icon: '⚖️',
      items: Object.entries(capabilities.patterns)
        .filter(([, pattern]) => ['time_comparison', 'account_comparison'].includes(pattern.intent))
        .map(([, pattern]) => ({
          title: formatIntentTitle(pattern.intent),
          examples: pattern.examples.slice(0, 3),
          description: getIntentDescription(pattern.intent),
        })),
    },
    impossible: {
      title: "What's Not Possible",
      icon: '❌',
      items: capabilities.impossible.map(item => ({
        title: item.patterns.join(', '),
        reason: item.reason,
        alternatives: item.alternatives,
      })),
    },
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-700 border-b border-gray-600">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span>💡</span>
          <span>Query Capabilities</span>
        </h3>
        <p className="text-gray-300 text-sm mt-1">Discover what you can ask about your flip data</p>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-gray-600">
        {Object.entries(categories).map(([key, category]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedCategory === key
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.title}</span>
          </button>
        ))}
      </div>

      {/* Category content */}
      <div className="p-4">
        {selectedCategory === 'impossible' ? (
          <div className="space-y-4">
            {categories.impossible.items.map((item, index) => (
              <div key={index} className="p-3 bg-red-900/20 border border-red-500/30 rounded">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-red-400 mt-1">🚫</span>
                  <div>
                    <p className="text-red-300 font-medium">{item.title}</p>
                    <p className="text-red-200 text-sm mt-1">{item.reason}</p>
                  </div>
                </div>
                {item.alternatives && item.alternatives.length > 0 && (
                  <div className="mt-2 pl-6">
                    <p className="text-xs text-red-300 mb-1">Try instead:</p>
                    <div className="space-y-1">
                      {item.alternatives.map((alt, altIndex) => (
                        <button
                          key={altIndex}
                          onClick={() => onQuerySelect && onQuerySelect(alt)}
                          className="block text-xs text-red-200 hover:text-red-100 transition-colors"
                        >
                          • {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {categories[selectedCategory].items.map((item, index) => (
              <div key={index} className="p-3 bg-gray-700 rounded border border-gray-600">
                <h4 className="text-white font-medium mb-2">{item.title}</h4>
                {item.description && (
                  <p className="text-gray-300 text-sm mb-3">{item.description}</p>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 mb-1">Example queries:</p>
                  {item.examples.map((example, exampleIndex) => (
                    <button
                      key={exampleIndex}
                      onClick={() => onQuerySelect && onQuerySelect(example)}
                      className="block text-sm text-blue-300 hover:text-blue-200 transition-colors w-full text-left"
                    >
                      • "{example}"
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with tips */}
      <div className="p-4 bg-gray-700 border-t border-gray-600">
        <div className="text-xs text-gray-400 space-y-1">
          <p>
            💡 <strong>Tips for better queries:</strong>
          </p>
          <p>• Be specific about time periods (e.g., "last week", "this month")</p>
          <p>• Use exact item names or common abbreviations (e.g., "whip", "d bolts")</p>
          <p>• Specify what you want to analyze (profit, ROI, count, etc.)</p>
          <p>• Ask for comparisons to get deeper insights</p>
        </div>
      </div>
    </div>
  );
}

function formatIntentTitle(intent) {
  const titles = {
    top_items_by_profit: 'Top Profitable Items',
    recent_activity: 'Recent Activity',
    item_performance: 'Item Performance Analysis',
    profit_analysis: 'Profit Summary',
    roi_analysis: 'ROI Analysis',
    duration_analysis: 'Hold Time Analysis',
    volume_analysis: 'Trading Volume Analysis',
    loss_analysis: 'Loss Analysis',
    time_comparison: 'Time Period Comparison',
    account_comparison: 'Account Comparison',
  };

  return titles[intent] || intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getIntentDescription(intent) {
  const descriptions = {
    top_items_by_profit: 'Find your most profitable items sorted by total profit',
    recent_activity: 'See your recent flipping activity and trends',
    item_performance: 'Analyze specific item performance with profit, ROI, and volume',
    profit_analysis: 'Get an overall summary of your profits and trading statistics',
    roi_analysis: 'Find items with the best return on investment',
    duration_analysis: 'Analyze flips by how long you held items',
    volume_analysis: 'See which items you trade most frequently',
    loss_analysis: 'Identify your worst performing trades and losses',
    time_comparison: 'Compare performance across different time periods',
    account_comparison: 'Compare performance between different accounts',
  };

  return descriptions[intent] || '';
}

export default CapabilityExplorer;
