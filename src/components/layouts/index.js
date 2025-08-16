/**
 * LAYOUT COMPONENTS INDEX
 *
 * Centralized exports for all layout components in the OSRS Flip Dashboard.
 * This barrel export file provides a single import location for all layout
 * components, making them easy to use throughout the application.
 *
 * Available Components:
 * - PageContainer: Full-page wrapper with gradient background
 * - CardContainer: Content card with border and shadow
 * - PageHeader: Standardized page titles and descriptions  
 * - LoadingLayout: Consistent loading state presentation
 * - ErrorLayout: Consistent error state presentation
 * - ResponsiveGrid: Flexible grid layouts for various use cases
 *
 * Usage:
 * import { PageContainer, CardContainer, PageHeader } from '../layouts';
 */

export { default as PageContainer } from './PageContainer';
export { default as CardContainer } from './CardContainer';
export { default as PageHeader } from './PageHeader';
export { default as LoadingLayout } from './LoadingLayout';
export { default as ErrorLayout } from './ErrorLayout';
export { default as ResponsiveGrid } from './ResponsiveGrid';