export default function QueryTypeSelector({ value, onChange }) {
  const options = [
    {
      value: 'ITEM_FLIPS',
      label: 'Flips by Item',
      icon: '📋',
      description: 'Search flips for specific items',
    },
    {
      value: 'FLIPS_BY_PROFIT',
      label: 'Flips by Profit',
      icon: '💰',
      description: 'Find all flips within profit ranges',
    },
    {
      value: 'ITEMS_BY_ROI',
      label: 'Items by ROI',
      icon: '📈',
      description: 'Find items by return on investment',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`p-4 rounded-lg border-2 transition-all ${
            value === option.value
              ? 'bg-yellow-500/20 border-yellow-500 text-white'
              : 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-300'
          }`}
        >
          <div className="text-2xl mb-2">{option.icon}</div>
          <div className="font-semibold">{option.label}</div>
          <div className="text-xs mt-1 opacity-75">{option.description}</div>
        </button>
      ))}
    </div>
  );
}
