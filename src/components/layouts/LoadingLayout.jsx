/**
 * LOADING LAYOUT COMPONENT
 *
 * A reusable layout component that provides consistent loading states
 * across the OSRS Flip Dashboard application.
 *
 * Features:
 * - Consistent page structure during loading
 * - Responsive loading spinner with customizable size
 * - Optional loading text
 * - Maintains layout consistency with loaded states
 *
 * This component ensures all pages show loading states in a
 * standardized way for better user experience.
 */

import React from 'react';
import PropTypes from 'prop-types';
import PageContainer from './PageContainer';
import CardContainer from './CardContainer';
import LoadingSpinner from '../LoadingSpinner';

/**
 * LoadingLayout Component - Standardized loading state layout
 *
 * Provides consistent loading state presentation that matches
 * the structure of loaded pages for seamless transitions.
 *
 * @param {Object} props - Component props
 * @param {string} [props.text] - Loading text to display
 * @param {string} [props.size] - Spinner size: 'small' | 'medium' | 'large'
 * @param {string} [props.className] - Additional CSS classes for the container
 * @returns {JSX.Element} - Complete loading layout
 */
const LoadingLayout = ({ text = 'Loading...', size = 'large', className = '' }) => {
  return (
    <PageContainer className={className}>
      <CardContainer>
        <LoadingSpinner size={size} text={text} />
      </CardContainer>
    </PageContainer>
  );
};

LoadingLayout.propTypes = {
  text: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
};

export default LoadingLayout;
