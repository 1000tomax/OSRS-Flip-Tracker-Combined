import { PRESET_PROFILES } from '../../utils/presetProfiles';

export default function PresetButtons({ onSelectPreset, disabled }) {
  const presets = Object.entries(PRESET_PROFILES);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">Or try these presets:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {presets.map(([name, config]) => (
          <button
            key={name}
            onClick={() => onSelectPreset(config.query)}
            disabled={disabled}
            className="px-4 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 hover:border-blue-500 rounded-lg text-left transition-all duration-200 group"
          >
            <div className="font-medium text-gray-200 text-sm group-hover:text-blue-400">
              {name}
            </div>
            <div className="text-xs text-gray-500 mt-1">{config.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
