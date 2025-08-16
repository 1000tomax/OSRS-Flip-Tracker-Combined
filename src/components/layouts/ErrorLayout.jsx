/**
 * ERROR LAYOUT COMPONENT
 *
 * A reusable layout component that provides consistent error states
 * across the OSRS Flip Dashboard application.
 *
 * Features:
 * - Consistent page structure during error states
 * - Standardized error message presentation
 * - Optional retry functionality
 * - Maintains layout consistency with loaded states
 *
 * This component ensures all pages show error states in a
 * standardized way for better user experience.
 */

import React from 'react';
import PropTypes from 'prop-types';
import PageContainer from './PageContainer';
import CardContainer from './CardContainer';
import { ErrorMessage } from '../LoadingSpinner';

/**
 * ErrorLayout Component - Standardized error state layout
 *
 * Provides consistent error state presentation that matches
 * the structure of loaded pages for seamless transitions.
 *
 * @param {Object} props - Component props
 * @param {string} [props.title] - Error title/heading
 * @param {Error|string} props.error - Error object or message to display
 * @param {Function} [props.onRetry] - Optional retry callback function
 * @param {string} [props.className] - Additional CSS classes for the container
 * @returns {JSX.Element} - Complete error layout
 */
const ErrorLayout = ({ 
  title = 'Something went wrong',
  error,
  onRetry,
  className = '' 
}) => {
  return (
    <PageContainer className={className}>
      <CardContainer>
        <ErrorMessage
          title={title}
          error={error}
          onRetry={onRetry}
        />
      </CardContainer>
    </PageContainer>
  );
};

ErrorLayout.propTypes = {
  title: PropTypes.string,
  error: PropTypes.oneOfType([
    PropTypes.instanceOf(Error),
    PropTypes.string,
  ]).isRequired,
  onRetry: PropTypes.func,
  className: PropTypes.string,
};

export default ErrorLayout;