/**
 * HOME PAGE COMPONENT
 *
 * This is the main landing page of the OSRS Flip Dashboard application.
 * It provides a high-level overview of trading activity and performance.
 *
 * Key features:
 * - Daily trading summary with key metrics
 * - Item leaderboard showing top-performing items
 * - Responsive layout that works on all devices
 * - Clean, professional design with gradient background
 *
 * Layout:
 * - Desktop: Two-column layout (main content + sidebar)
 * - Mobile: Single column, stacked vertically
 *
 * This page gives users a quick snapshot of their trading performance
 * and helps them identify which items are generating the most profit.
 */

import React from 'react';
import DailySummaryLog from '../components/DailySummaryLog';
import ItemLeaderboard from '../components/ItemLeaderboard';
import { PageContainer, ResponsiveGrid } from '../components/layouts';

/**
 * Home Component - Main dashboard page
 *
 * This component serves as the entry point for users to see their
 * overall trading performance and navigate to more detailed views.
 *
 * @returns {JSX.Element} - The complete home page layout
 */
export default function Home() {
  return (
    <PageContainer>
      <ResponsiveGrid variant="twoColumn">
        {/* Main Content Area - Daily Summary Log */}
        <div className="w-full">
          {/* 
            DailySummaryLog component shows:
            - Recent trading activity by day
            - Profit trends over time
            - Key performance metrics
            - Navigation to detailed views
          */}
          <DailySummaryLog />
        </div>

        {/* Sidebar - Item Leaderboard */}
        <div className="w-full">
          {/* 
            ItemLeaderboard component shows:
            - Top-performing items by profit
            - Most traded items
            - Recent activity highlights
            - Quick item statistics
          */}
          <ItemLeaderboard />
        </div>
      </ResponsiveGrid>
    </PageContainer>
  );
}

/**
 * HOME PAGE PATTERNS - LEARNING NOTES
 *
 * 1. **Page Structure**:
 *    - Full-screen layout with gradient background
 *    - Responsive grid system that adapts to screen size
 *    - Component composition for clean code organization
 *
 * 2. **Responsive Design**:
 *    - Mobile-first approach (flex-col by default)
 *    - Desktop enhancement (xl:grid) for larger screens
 *    - Flexible sizing (2fr + 1fr) for optimal content distribution
 *
 * 3. **User Experience**:
 *    - Immediate value on page load (no waiting for interactions)
 *    - Clear visual hierarchy with main content + sidebar
 *    - Professional color scheme with dark theme
 *
 * 4. **Component Architecture**:
 *    - Page components focus on layout and structure
 *    - Business logic delegated to child components
 *    - Clean separation of concerns
 *
 * 5. **CSS Layout Techniques**:
 *    - CSS Grid for complex layouts
 *    - Flexbox for simpler arrangements
 *    - Tailwind utility classes for consistent styling
 *
 * 6. **Performance Considerations**:
 *    - Minimal page-level logic for fast initial render
 *    - Child components handle their own data loading
 *    - Efficient layout that avoids unnecessary re-renders
 *
 * 7. **Dashboard Best Practices**:
 *    - Most important information gets the most space
 *    - Supporting information in sidebar
 *    - Clear visual distinction between sections
 *    - Consistent spacing and typography
 */
