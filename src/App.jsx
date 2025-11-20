// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import { AccountFilterProvider } from './contexts/AccountFilterContext';
import { ItemsAnalysisProvider } from './contexts/ItemsAnalysisContext';
import AccountFilterBar from './components/AccountFilterBar';
import UploadPage from './pages/UploadPage';
import Dashboard from './pages/Dashboard';
import AnalyticsDisclosure from './components/AnalyticsDisclosure';
import AppErrorBoundary from './components/AppErrorBoundary';
import FeedbackButton from './components/FeedbackButton';
import SupportButton from './components/Footer';
import SEO from './components/SEO';

// Lazy load item pages for code splitting
const ItemsList = lazy(() => import('./pages/ItemsList'));
const ItemDeepDive = lazy(() => import('./pages/ItemDeepDive'));
const BlocklistGeneratorPage = lazy(() => import('./pages/BlocklistGeneratorPage'));

// Protected route component - redirects to upload if no data
function RequireData({ children }) {
  const { guestData } = useData();

  if (!guestData) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Component to conditionally render account filter bar
function RequireDataForFilter({ children }) {
  const { guestData } = useData();

  if (!guestData) {
    return null;
  }

  return children;
}

// Wrapper for ItemsAnalysisProvider
function ItemsAnalysisRoot({ children }) {
  return <ItemsAnalysisProvider>{children}</ItemsAnalysisProvider>;
}

// Loading fallback component
function LoadingFallback({ text = 'Loading...' }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div className="bg-gray-900/90 border border-gray-700 rounded-xl px-6 py-5 shadow-2xl flex items-center gap-4">
        <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        <div className="text-gray-200 font-medium">{text}</div>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-900">
      {/* Persistent banner */}
      <div className="bg-yellow-500 text-black p-2 text-center font-bold sticky top-0 z-50">
        Your data never leaves this browser
      </div>

      {/* Account filter bar - only shows when data is loaded */}
      <RequireDataForFilter>
        <AccountFilterBar />
      </RequireDataForFilter>

      <Routes>
        {/* Upload is always accessible */}
        <Route path="/" element={<UploadPage />} />

        {/* Dashboard requires data to be uploaded first */}
        <Route
          path="/dashboard"
          element={
            <RequireData>
              <Dashboard />
            </RequireData>
          }
        />

        {/* Items list */}
        <Route
          path="/items"
          element={
            <RequireData>
              <Suspense fallback={<LoadingFallback text="Loading Items..." />}>
                <ItemsList />
              </Suspense>
            </RequireData>
          }
        />

        {/* Individual item deep dive */}
        <Route
          path="/items/:itemName"
          element={
            <RequireData>
              <Suspense fallback={<LoadingFallback text="Loading Item..." />}>
                <ItemDeepDive />
              </Suspense>
            </RequireData>
          }
        />

        {/* Blocklist Generator - accessible without data */}
        <Route
          path="/blocklist-generator"
          element={
            <Suspense fallback={<LoadingFallback text="Loading Generator..." />}>
              <BlocklistGeneratorPage />
            </Suspense>
          }
        />

        {/* Catch-all redirect to upload */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Analytics disclosure */}
      <AnalyticsDisclosure />

      {/* Feedback button */}
      <FeedbackButton />

      {/* Support/footer button */}
      <SupportButton />
    </div>
  );
}

function App() {
  useEffect(() => {
    // Keyboard shortcut to toggle analytics exclusion (Ctrl+Shift+A)
    const handleKeyPress = e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        const isExcluded = localStorage.getItem('exclude-analytics');
        if (isExcluded) {
          localStorage.removeItem('exclude-analytics');
          console.log('Analytics tracking re-enabled. Refresh to apply.');
        } else {
          localStorage.setItem('exclude-analytics', 'true');
          console.log('You are now excluded from analytics. Refresh to apply.');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <AppErrorBoundary>
      <Router>
        <SEO />
        <DataProvider>
          <AccountFilterProvider>
            <ItemsAnalysisRoot>
              <AppContent />
            </ItemsAnalysisRoot>
          </AccountFilterProvider>
        </DataProvider>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;
