/**
 * PAGE HEADER COMPONENT
 *
 * A reusable header component that provides consistent page titles
 * and descriptions across the OSRS Flip Dashboard application.
 *
 * Features:
 * - Responsive typography that scales with screen size
 * - Optional description text with proper color hierarchy
 * - Consistent spacing and alignment
 * - Support for icons in titles
 * - Semantic heading structure for accessibility
 *
 * This component standardizes the appearance of page headers
 * throughout the application.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * PageHeader Component - Standardized page title and description
 *
 * Provides consistent styling for page headers including title,
 * optional description, and proper responsive typography.
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Main page title (required)
 * @param {string} [props.description] - Optional description text below title
 * @param {string} [props.icon] - Optional emoji or icon to include in title
 * @param {string} [props.className] - Additional CSS classes to apply
 * @param {number} [props.level] - Heading level (1-6) for semantic HTML
 * @returns {JSX.Element} - Styled page header
 */
const PageHeader = ({ title, description, icon, className = '', level = 1 }) => {
  // Create the appropriate heading element based on level
  const HeadingComponent = `h${level}`;

  const displayTitle = icon ? `${icon} ${title}` : title;

  return (
    <div className={`mb-6 ${className}`}>
      <HeadingComponent className="text-2xl sm:text-3xl font-bold mb-2 text-white">
        {displayTitle}
      </HeadingComponent>
      {description && <p className="text-gray-300 text-sm sm:text-base">{description}</p>}
    </div>
  );
};

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  icon: PropTypes.string,
  className: PropTypes.string,
  level: PropTypes.oneOf([1, 2, 3, 4, 5, 6]),
};

export default PageHeader;
