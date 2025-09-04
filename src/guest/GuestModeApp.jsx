import { Routes, Route, Navigate } from 'react-router-dom';
import { GuestDataProvider, useGuestData } from './contexts/GuestDataContext';
import { AccountFilterProvider } from './contexts/AccountFilterContext';
import AccountFilterBar from './components/AccountFilterBar';
import GuestUploadPage from './pages/GuestUploadPage';
import GuestDashboard from './pages/GuestDashboard';
import AnalyticsDisclosure from './components/AnalyticsDisclosure';
import GuestErrorBoundary from './components/GuestErrorBoundary';
import FeedbackButton from '../components/FeedbackButton';
import * as Sentry from '@sentry/react';

// Wrap routes with Sentry
const SentryRoutes = Sentry.withSentryRouting(Routes);

// Protected route component - redirects to upload if no data
function RequireGuestData({ children }) {
  const { guestData } = useGuestData();

  // No data? Always redirect to upload page
  if (!guestData) {
    return <Navigate to="/guest" replace />;
  }

  return children;
}

// Component to conditionally render account filter bar
function RequireGuestDataForFilter({ children }) {
  const { guestData } = useGuestData();

  // Only show filter bar when data is loaded
  if (!guestData) {
    return null;
  }

  return children;
}

// This is a completely separate "app" for guest mode
export default function GuestModeApp() {
  return (
    <GuestDataProvider>
      <AccountFilterProvider>
        <GuestErrorBoundary>
          {/* Different background color to make it visually distinct */}
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-900">
            {/* Persistent banner across all guest pages */}
            <div className="bg-yellow-500 text-black p-2 text-center font-bold sticky top-0 z-50">
              🔒 GUEST MODE - Your data never leaves this browser
            </div>

            {/* Account filter bar - only shows when data is loaded and multiple accounts exist */}
            <RequireGuestDataForFilter>
              <AccountFilterBar />
            </RequireGuestDataForFilter>

            <SentryRoutes>
              {/* Upload is always accessible */}
              <Route path="/" element={<GuestUploadPage />} />

              {/* Dashboard requires data to be uploaded first */}
              <Route
                path="/dashboard"
                element={
                  <RequireGuestData>
                    <GuestDashboard />
                  </RequireGuestData>
                }
              />

              {/* Any other guest routes redirect to upload */}
              <Route path="/*" element={<Navigate to="/guest" replace />} />
            </SentryRoutes>

            {/* Analytics disclosure component */}
            <AnalyticsDisclosure />

            {/* Feedback button - only in guest mode */}
            <FeedbackButton />
          </div>
        </GuestErrorBoundary>
      </AccountFilterProvider>
    </GuestDataProvider>
  );
}
