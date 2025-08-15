import React from 'react';
import { useNavigate } from 'react-router-dom';
import { dateToInputValue, formatDateForUrl, addDaysToDate } from '../lib/utils';

export default function DateNavigation({ 
  currentDate, 
  basePath = "/flip-logs",
  className = "" 
}) {
  const navigate = useNavigate();

  const handleDateChange = (newDate) => {
    const formatted = formatDateForUrl(newDate);
    navigate(`${basePath}?date=${formatted}`);
  };

  const navigateDay = (direction) => {
    if (!currentDate) return;
    const newDate = addDaysToDate(currentDate, direction);
    navigate(`${basePath}?date=${newDate}`);
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 mb-6 ${className}`}>
      <span className="text-sm text-gray-300 font-medium">Select date:</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigateDay(-1)}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm font-medium"
          disabled={!currentDate}
          aria-label="Previous day"
        >
          ←
        </button>
        <input
          type="date"
          className="w-full sm:w-auto bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
          value={dateToInputValue(currentDate)}
          onChange={(e) => {
            if (e.target.value) {
              handleDateChange(e.target.value);
            }
          }}
        />
        <button
          onClick={() => navigateDay(1)}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm font-medium"
          disabled={!currentDate}
          aria-label="Next day"
        >
          →
        </button>
      </div>
    </div>
  );
}

/**
 * DATE NAVIGATION PATTERNS - LEARNING NOTES
 * 
 * 1. **URL State Management**:
 *    - Date stored in URL query parameter (?date=MM-DD-YYYY)
 *    - Allows direct linking to specific dates
 *    - Browser back/forward buttons work correctly
 *    - State persists across page refreshes
 * 
 * 2. **Date Format Handling**:
 *    - App uses MM-DD-YYYY format internally
 *    - HTML date inputs require YYYY-MM-DD format
 *    - Utility functions handle conversion between formats
 *    - Consistent format used throughout application
 * 
 * 3. **React Router Integration**:
 *    - useNavigate hook for programmatic navigation
 *    - Updates URL without full page reload (SPA behavior)
 *    - Maintains browser history for back/forward navigation
 * 
 * 4. **User Experience**:
 *    - Multiple ways to select dates (picker vs buttons)
 *    - Visual feedback for disabled states
 *    - Smooth transitions and hover effects
 *    - Clear directional arrows for navigation
 * 
 * 5. **Accessibility**:
 *    - aria-label attributes for screen readers
 *    - Proper disabled states when appropriate
 *    - Semantic HTML elements
 *    - Keyboard navigation support (built into HTML date input)
 * 
 * 6. **Form Handling**:
 *    - Controlled input (value comes from props)
 *    - Proper event handling with validation
 *    - Graceful handling of empty/invalid dates
 * 
 * 7. **Component Design**:
 *    - Single responsibility (date navigation only)
 *    - Flexible base path for reuse on different pages
 *    - Customizable styling via className prop
 *    - No internal state (all state managed by parent/URL)
 */