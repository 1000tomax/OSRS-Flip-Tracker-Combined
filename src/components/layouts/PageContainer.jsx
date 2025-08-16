/**
 * PAGE CONTAINER COMPONENT
 *
 * A reusable layout component that provides the consistent page structure
 * used across all pages in the OSRS Flip Dashboard application.
 *
 * Features:
 * - Full-screen height with gradient background
 * - Responsive padding that adapts to screen size
 * - Consistent color scheme and typography
 * - Optional custom className for specific page needs
 *
 * This component wraps page content and provides the foundational
 * layout structure that all pages share.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * PageContainer Component - Foundation layout for all pages
 *
 * Provides the consistent outer container with gradient background
 * and responsive padding that all pages in the application use.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render inside the container
 * @param {string} [props.className] - Additional CSS classes to apply
 * @param {string} [props.padding] - Padding variant: 'normal' | 'compact' | 'none'
 * @returns {JSX.Element} - Page container with gradient background
 */
const PageContainer = ({ children, className = '', padding = 'normal' }) => {
  const paddingClasses = {
    normal: 'p-2 sm:p-4',
    compact: 'p-2',
    none: '',
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans ${
        paddingClasses[padding]
      } ${className}`}
    >
      {children}
    </div>
  );
};

PageContainer.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  padding: PropTypes.oneOf(['normal', 'compact', 'none']),
};

export default PageContainer;