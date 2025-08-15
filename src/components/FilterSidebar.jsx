import React from 'react';
import { getCategoryIcon } from '../lib/utils';

export default function FilterSidebar({
  isOpen,
  onToggle,
  title = "Filters",
  icon = "🔧",
  children,
  className = ""
}) {
  return (
    <div className={`${isOpen ? "w-80" : "w-16"} transition-all duration-200 bg-gray-900/80 backdrop-blur-sm border-r border-gray-700 flex flex-col ${className}`}>
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {isOpen ? (
          <h1 className="text-xl font-bold">{icon} {title}</h1>
        ) : (
          <span className="text-lg">{icon}</span>
        )}
        <button 
          className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-sm" 
          onClick={onToggle} 
          aria-label="Toggle sidebar"
        >
          {isOpen ? "←" : "→"}
        </button>
      </div>

      {isOpen && (
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

// Filter section component
export function FilterSection({ title, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-300 mb-2">{title}</label>
      {children}
    </div>
  );
}

// Search input component
export function SearchFilter({ value, onChange, placeholder = "Search..." }) {
  return (
    <input
      placeholder={placeholder}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// Category dropdown component
export function CategoryFilter({ value, onChange, categories, showAll = true }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
    >
      {showAll && <option value="all">All Categories</option>}
      {categories.map((category) => (
        <option key={category} value={category}>
          {getCategoryIcon(category)} {category}
        </option>
      ))}
    </select>
  );
}

// Range filter component
export function RangeFilter({ minValue, maxValue, onMinChange, onMaxChange, label = "Range" }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex items-center gap-2">
        <input 
          type="number" 
          className="w-1/2 bg-gray-800 border border-gray-700 rounded px-2 py-1"
          placeholder="Min"
          value={minValue} 
          onChange={(e) => onMinChange(Number(e.target.value) || 0)} 
        />
        <input 
          type="number" 
          className="w-1/2 bg-gray-800 border border-gray-700 rounded px-2 py-1"
          placeholder="Max"
          value={maxValue} 
          onChange={(e) => onMaxChange(Number(e.target.value) || 0)} 
        />
      </div>
    </div>
  );
}

// Select filter component
export function SelectFilter({ value, onChange, options, label }) {
  return (
    <div>
      <label className="block text-xs mb-1 text-gray-400">{label}</label>
      <select 
        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Checkbox filter component
export function CheckboxFilter({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
      />
      {label}
    </label>
  );
}

// Range slider component
export function SliderFilter({ value, onChange, min = 0, max = 1, step = 0.1, label }) {
  return (
    <div>
      <label className="block text-xs mb-1 text-gray-400">{label}</label>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))} 
        className="w-full" 
      />
    </div>
  );
}

// Summary stats component
export function FilterSummary({ stats, className = "" }) {
  return (
    <div className={`bg-gray-800/50 rounded-lg p-3 ${className}`}>
      <h3 className="text-sm font-medium text-gray-300 mb-2">Summary</h3>
      <div className="space-y-1 text-xs">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="text-gray-400">{key}:</span>
            <span className={typeof value === 'object' ? value.className : ''}>{value.display || value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * FILTER SIDEBAR PATTERNS - LEARNING NOTES
 * 
 * 1. **Compound Component Pattern**:
 *    - Main FilterSidebar component provides structure
 *    - Sub-components (SearchFilter, CategoryFilter, etc.) provide specific functionality
 *    - Each sub-component is focused on one type of input
 *    - Easy to mix and match different filter types
 * 
 * 2. **Controlled Components**:
 *    - All form inputs are "controlled" (value comes from props)
 *    - Parent component manages all state
 *    - Changes flow up via onChange callbacks
 *    - Ensures consistent state management
 * 
 * 3. **Flexible Design**:
 *    - Components accept configuration via props
 *    - Default values make them easy to use
 *    - CSS classes can be customized
 *    - Content is provided via children prop
 * 
 * 4. **Accessibility Features**:
 *    - Proper label elements for form inputs
 *    - ARIA labels for interactive elements
 *    - Semantic HTML structure
 *    - Keyboard navigation support
 * 
 * 5. **Performance Considerations**:
 *    - Conditional rendering (only show content when open)
 *    - Smooth CSS transitions for animations
 *    - Minimal re-renders through proper prop handling
 * 
 * 6. **User Experience**:
 *    - Visual feedback (hover states, focus indicators)
 *    - Consistent styling across all filter types
 *    - Space-efficient collapsible design
 *    - Mobile-friendly responsive layout
 * 
 * 7. **React Concepts**:
 *    - Component composition
 *    - Props passing and destructuring
 *    - Conditional rendering
 *    - Event handling
 *    - CSS-in-JS styling
 *    - Reusable component design
 */