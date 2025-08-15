/**
 * SUMMARY CARDS COMPONENT
 * 
 * This component displays key statistics and metrics in an attractive card layout.
 * It's commonly used on dashboard pages to show important numbers at a glance.
 * 
 * Features:
 * - Color-coded cards based on data type or importance
 * - Flexible content (titles, values, descriptions)
 * - Icons for visual appeal and quick recognition
 * - Responsive grid layout
 * - Helper functions for easy card creation
 * 
 * Common use cases:
 * - Financial summaries (profit, ROI, totals)
 * - Time-based metrics (days, weeks, forecasts)
 * - Count-based data (transactions, items, users)
 */

import React from 'react';

/**
 * SummaryCards Component - Displays a grid of statistic cards
 * 
 * @param {Array} cards - Array of card configuration objects
 * @param {string} className - CSS classes for the grid container
 * @param {string} cardClassName - CSS classes applied to all individual cards
 * @returns {JSX.Element} - Grid of summary cards
 */
export default function SummaryCards({ cards, className = "", cardClassName = "" }) {
  return (
    <div className={`grid md:grid-cols-3 gap-4 ${className}`}>
      {/* Map through card data and create SummaryCard components */}
      {cards.map((card, index) => (
        <SummaryCard key={index} {...card} className={cardClassName} />
      ))}
    </div>
  );
}

/**
 * Individual Summary Card Component - Single statistic card
 * 
 * This displays one key metric with proper styling and color coding.
 * 
 * @param {Object} props - Card configuration
 * @returns {JSX.Element} - Styled summary card
 */
function SummaryCard({
  title,           // Main label (e.g., "Total Profit")
  value,           // The key number/statistic (e.g., "1.2M GP")
  subtitle,        // Optional secondary text
  description,     // Optional additional context
  icon,            // Optional emoji/icon
  color = "blue",  // Color theme for the card
  className = ""   // Additional CSS classes
}) {
  // Define color schemes for different card types
  const colorClasses = {
    blue: "bg-blue-600/20 border-blue-500/30",           // Default/neutral
    green: "bg-green-600/20 border-green-500/30 text-green-400",  // Positive metrics
    yellow: "bg-yellow-600/20 border-yellow-500/30 text-yellow-400", // Warning/attention
    red: "bg-red-600/20 border-red-500/30 text-red-400",        // Negative metrics
    gray: "bg-gray-600/20 border-gray-500/30 text-gray-400"     // Neutral/inactive
  };

  // Define text colors that match the card themes
  const textColorClasses = {
    blue: "text-blue-400",
    green: "text-green-400", 
    yellow: "text-yellow-400",
    red: "text-red-400",
    gray: "text-gray-400"
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4 text-center ${className}`}>
      {/* Optional icon at the top */}
      {icon && <div className="text-2xl mb-2">{icon}</div>}
      
      {/* Main value - the big number */}
      <div className={`text-2xl font-bold ${textColorClasses[color]}`}>
        {value}
      </div>
      
      {/* Title/label for the statistic */}
      <div className="text-sm text-gray-300">{title}</div>
      
      {/* Optional subtitle text */}
      {subtitle && (
        <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
      )}
      
      {/* Optional description text */}
      {description && (
        <div className="text-xs text-gray-400 mt-1">{description}</div>
      )}
    </div>
  );
}

/**
 * Helper Functions for Card Creation
 * 
 * These utility functions make it easier to create card configurations
 * with consistent formatting and structure.
 */

// Helper function to create summary card data with standard structure


/**
 * SUMMARY CARDS PATTERNS - LEARNING NOTES
 * 
 * 1. **Visual Hierarchy**:
 *    - Large, bold value as focal point
 *    - Clear title beneath for context
 *    - Optional subtitle/description for additional detail
 *    - Icon adds visual interest and quick recognition
 * 
 * 2. **Color Psychology**:
 *    - Green: Positive metrics, goals, growth
 *    - Blue: Neutral information, counts, general data
 *    - Yellow: Important metrics requiring attention
 *    - Red: Negative metrics, warnings, losses
 *    - Gray: Inactive or less important data
 * 
 * 3. **Data Presentation**:
 *    - Numbers formatted for readability (commas, GP notation)
 *    - Percentages shown with proper precision
 *    - Context provided through descriptions
 *    - Units clearly indicated
 * 
 * 4. **Responsive Design**:
 *    - Grid layout adapts to screen size
 *    - Cards maintain readability on mobile
 *    - Consistent spacing and proportions
 * 
 * 5. **Component Flexibility**:
 *    - Helper functions reduce boilerplate code
 *    - Configurable styling through color themes
 *    - Optional content elements (icon, subtitle, description)
 * 
 * 6. **React Patterns**:
 *    - Props destructuring with defaults
 *    - Conditional rendering for optional elements
 *    - Object mapping for styling configurations
 *    - Function composition for card creation
 * 
 * 7. **User Experience**:
 *    - Information density balanced with readability
 *    - Consistent visual language across cards
 *    - Clear information hierarchy
 *    - Quick scanning and comprehension
 */