import React from 'react';

export default function SearchControls({
  query,
  onQueryChange,
  placeholder = 'Search...',
  viewMode,
  onViewModeChange,
  showViewToggle = false,
  extraControls = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 mb-6 ${className}`}>
      {/* Search bar */}
      <div className="flex-1">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition placeholder-gray-400"
        />
      </div>

      {/* View Mode Toggle - Mobile only */}
      {showViewToggle && (
        <div className="flex sm:hidden">
          <div className="bg-gray-700 rounded-lg p-0.5 flex gap-0.5">
            <button
              onClick={() => onViewModeChange('cards')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition min-h-[32px] flex-1 ${
                viewMode === 'cards' ? 'bg-yellow-500 text-black' : 'text-white hover:bg-gray-600'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition min-h-[32px] flex-1 ${
                viewMode === 'table' ? 'bg-yellow-500 text-black' : 'text-white hover:bg-gray-600'
              }`}
            >
              Table
            </button>
          </div>
        </div>
      )}

      {/* Extra controls */}
      {extraControls}
    </div>
  );
}

// Results count component
export function ResultsCount({ count, noun = 'item' }) {
  const plural = count !== 1 ? 's' : '';
  return (
    <div className="mb-4 text-sm text-gray-400">
      Showing {count} {noun}
      {plural}
    </div>
  );
}

/**
 * SEARCH CONTROLS PATTERNS - LEARNING NOTES
 *
 * 1. **Flexible Design**:
 *    - Core search functionality always present
 *    - Optional features enabled via props (showViewToggle)
 *    - Extensible via extraControls prop
 *    - Customizable styling via className
 *
 * 2. **Responsive Layout**:
 *    - Mobile: stacked vertically (flex-col)
 *    - Desktop: horizontal layout (sm:flex-row)
 *    - View toggle only shown on mobile (sm:hidden)
 *    - Search input takes remaining space (flex-1)
 *
 * 3. **Controlled Components**:
 *    - Search input value controlled by parent
 *    - View mode controlled by parent
 *    - All changes communicated via callbacks
 *    - No internal state in this component
 *
 * 4. **User Experience**:
 *    - Immediate feedback as user types
 *    - Clear visual states for active/inactive buttons
 *    - Smooth transitions between states
 *    - Consistent styling with rest of app
 *
 * 5. **Accessibility**:
 *    - Semantic HTML elements
 *    - Proper focus management
 *    - Clear button labels
 *    - Responsive design for different devices
 *
 * 6. **Component Composition**:
 *    - Main component handles layout
 *    - Sub-component (ResultsCount) handles specific display logic
 *    - Can be extended with additional sub-components
 *    - Clean separation of concerns
 *
 * 7. **CSS Patterns**:
 *    - Tailwind utility classes for responsive design
 *    - Conditional styling based on state
 *    - Consistent spacing and colors
 *    - Mobile-first responsive approach
 */
