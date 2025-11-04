/**
 * CARD CONTAINER COMPONENT
 *
 * A reusable container component that provides the consistent card styling
 * used throughout the OSRS Flip Dashboard application.
 *
 * Features:
 * - Consistent gray background with border and shadow
 * - Responsive padding and rounded corners
 * - Overflow handling for wide content
 * - Optional size variants for different use cases
 *
 * This component wraps content sections and provides the standardized
 * card appearance that users see throughout the application.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * CardContainer Component - Styled container for content sections
 *
 * Provides the consistent card styling with background, border,
 * and shadow that's used across all pages for content containers.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render inside the card
 * @param {string} [props.className] - Additional CSS classes to apply
 * @param {string} [props.padding] - Padding variant: 'normal' | 'compact' | 'large'
 * @param {boolean} [props.overflow] - Whether to allow horizontal overflow
 * @returns {JSX.Element} - Styled card container
 */
const CardContainer = ({ children, className = '', padding = 'normal', overflow = true }) => {
  const paddingClasses = {
    compact: 'p-3 sm:p-4',
    normal: 'p-3 sm:p-6',
    large: 'p-4 sm:p-8',
  };

  const overflowClass = overflow ? 'overflow-hidden' : '';

  return (
    <div
      className={`bg-gray-900 border border-gray-700 rounded-2xl shadow-lg max-w-full ${paddingClasses[padding]} ${overflowClass} ${className}`}
    >
      {children}
    </div>
  );
};

CardContainer.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  padding: PropTypes.oneOf(['compact', 'normal', 'large']),
  overflow: PropTypes.bool,
};

export default CardContainer;
