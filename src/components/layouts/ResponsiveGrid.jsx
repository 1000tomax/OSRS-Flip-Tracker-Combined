/**
 * RESPONSIVE GRID COMPONENT
 *
 * A reusable grid layout component that provides consistent responsive
 * grid patterns across the OSRS Flip Dashboard application.
 *
 * Features:
 * - Multiple predefined grid layouts for common use cases
 * - Responsive breakpoints that adapt to screen size
 * - Consistent gap spacing
 * - Support for custom grid configurations
 *
 * This component standardizes grid layouts and ensures consistent
 * responsive behavior across different page sections.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * ResponsiveGrid Component - Flexible grid layout container
 *
 * Provides predefined responsive grid patterns commonly used
 * throughout the application for consistent layouts.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Grid items to render
 * @param {string} [props.variant] - Grid layout variant
 * @param {string} [props.gap] - Gap size between grid items
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element} - Responsive grid container
 */
const ResponsiveGrid = ({ children, variant = 'auto', gap = 'normal', className = '' }) => {
  // Grid layout variants for different use cases
  const gridVariants = {
    // Auto-fit grid that adapts to content
    auto: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',

    // Two column layout (used in Home page)
    twoColumn: 'flex flex-col xl:grid xl:grid-cols-[2fr_1fr]',

    // Equal columns that stack on mobile
    equal: 'grid-cols-1 md:grid-cols-2',

    // Three equal columns
    threeEqual: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',

    // Four columns for dense content
    fourColumn: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',

    // Sidebar layout (main content + narrow sidebar)
    sidebar: 'grid-cols-1 lg:grid-cols-[1fr_300px]',

    // Cards layout for statistics/metrics
    cards: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  // Gap size options
  const gapSizes = {
    none: 'gap-0',
    small: 'gap-2',
    normal: 'gap-4 sm:gap-6',
    large: 'gap-6 sm:gap-8',
  };

  // Determine if this is a flexbox or grid layout
  const isFlexLayout = variant === 'twoColumn';
  const baseClass = isFlexLayout ? 'flex' : 'grid';

  return (
    <div
      className={`${baseClass} ${gridVariants[variant]} ${gapSizes[gap]} items-start ${className}`}
    >
      {children}
    </div>
  );
};

ResponsiveGrid.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    'auto',
    'twoColumn',
    'equal',
    'threeEqual',
    'fourColumn',
    'sidebar',
    'cards',
  ]),
  gap: PropTypes.oneOf(['none', 'small', 'normal', 'large']),
  className: PropTypes.string,
};

export default ResponsiveGrid;
