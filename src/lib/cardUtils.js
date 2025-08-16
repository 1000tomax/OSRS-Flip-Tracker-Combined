/**
 * Utility functions for creating summary cards
 */

export function createSummaryCard(title, value, options = {}) {
  return {
    title, // Main label for the statistic
    value, // The key number/value to display
    subtitle: options.subtitle, // Optional secondary text
    description: options.description, // Optional additional context
    icon: options.icon, // Optional emoji/icon
    color: options.color || 'blue', // Color theme (defaults to blue)
  };
}
