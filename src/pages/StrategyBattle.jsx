/**
 * REFACTORED STRATEGY BATTLE PAGE COMPONENT
 *
 * This page has been broken down into smaller, focused components for better maintainability.
 * Now uses custom hooks for business logic and separated UI components.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useCsvData } from '../hooks/useCsvData';
import { useJsonData } from '../hooks/useJsonData';
import useStrategyAnalysis from '../hooks/useStrategyAnalysis';
import DateNavigation from '../components/DateNavigation';
import StrategyComparison from '../components/StrategyBattle/StrategyComparison';
import { parseDateParts } from '../lib/utils';
import { DataErrorBoundary } from '../components/ErrorBoundary';
import {
  PageContainer,
  CardContainer,
  PageHeader,
  LoadingLayout,
  ErrorLayout,
} from '../components/layouts';

export default function StrategyBattle() {
  // URL and navigation management
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const date = queryParams.get('date');

  // Data loading
  const {
    data: summaryDates,
    loading: summaryLoading,
    error: summaryError,
  } = useJsonData('/data/summary-index.json');

  // Parse date and build CSV path
  const { month, day, year } = date ? parseDateParts(date) : {};
  const csvPath = date ? `/data/processed-flips/${year}/${month}/${day}/flips.csv` : null;

  // Load flip data
  const { data: flips, loading: flipsLoading, error: flipsError } = useCsvData(csvPath);

  // Analyze strategies using custom hook
  const strategyAnalysis = useStrategyAnalysis(flips, date);

  // Loading and error states
  const isLoading = summaryLoading || flipsLoading;
  const hasError = summaryError || flipsError;

  // Get available dates for navigation
  const availableDates =
    summaryDates?.days
      ?.map(day => {
        const [year, month, dayNum] = day.date.split('-');
        return `${month}-${dayNum}-${year}`;
      })
      .reverse() || [];

  if (isLoading) {
    return <LoadingLayout text="Loading strategy battle data..." />;
  }

  if (hasError) {
    return (
      <ErrorLayout
        title="Failed to load strategy battle data"
        error={hasError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto">
        <CardContainer className="text-center mb-8">
          <PageHeader title="Strategy Battle Arena" icon="⚔️" className="text-center" />
          <p className="text-gray-400 text-lg">High Volume vs High Value Trading Strategies</p>
        </CardContainer>

        {/* Date Navigation */}
        <div className="mb-8">
          <DateNavigation
            currentDate={date}
            availableDates={availableDates}
            basePath="/volume"
            label="Select Battle Date"
          />
        </div>

        {/* Main Content */}
        <DataErrorBoundary>
          {!date && (
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">📅</div>
              <h2 className="text-xl font-semibold text-white mb-2">Select a Date to Begin</h2>
              <p className="text-gray-400">
                Choose a trading day from the date selector above to see the strategy battle
                results.
              </p>
            </div>
          )}

          {date && !strategyAnalysis.isValid && (
            <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6 text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-lg font-semibold text-yellow-400 mb-2">
                {strategyAnalysis.error || 'No Data Available'}
              </h2>
              <p className="text-yellow-300 text-sm">
                {strategyAnalysis.error === 'Future date selected' &&
                  'The selected date is in the future. Please choose a past trading day.'}
                {strategyAnalysis.error === "Today's data is incomplete" &&
                  "Today's trading data is still incomplete. Please select a previous day for complete results."}
                {strategyAnalysis.error === 'No completed flips found for this date' &&
                  'No completed trades were found for this date. Try selecting a different day.'}
                {!strategyAnalysis.error &&
                  'Unable to analyze strategy performance for the selected date.'}
              </p>
            </div>
          )}

          {date && strategyAnalysis.isValid && (
            <StrategyComparison
              highVolumeStrategy={strategyAnalysis.highVolumeStrategy}
              highValueStrategy={strategyAnalysis.highValueStrategy}
              winner={strategyAnalysis.winner}
              date={date}
            />
          )}
        </DataErrorBoundary>

        {/* Additional Info */}
        <div className="mt-12 bg-gray-800 border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">About Strategy Battle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300 text-sm">
            <div>
              <h4 className="text-blue-400 font-medium mb-2">How It Works</h4>
              <ul className="space-y-1">
                <li>• Analyzes all completed flips for the selected day</li>
                <li>
                  • Classifies items into High Volume (1000+ qty) and High Value (&lt;100 qty)
                  strategies
                </li>
                <li>• Compares total profit, GP/hour, and efficiency metrics</li>
                <li>• Declares a winner based on GP per hour performance</li>
              </ul>
            </div>
            <div>
              <h4 className="text-green-400 font-medium mb-2">Strategy Insights</h4>
              <ul className="space-y-1">
                <li>• High Volume: Focus on liquid markets and frequent trades</li>
                <li>• High Value: Focus on high-margin, lower-frequency trades</li>
                <li>• Results vary by market conditions and account size</li>
                <li>• Both strategies can be profitable in different scenarios</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
