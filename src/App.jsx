// src/App.jsx
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Navigation from './components/Navigation';
import LoadingSpinner from './components/LoadingSpinner';
import SEO from './components/SEO';

// Lazy load most page components for code splitting
const Home = lazy(() => import('./pages/Home'));
const Items = lazy(() => import('./pages/Items'));
const FlipLogs = lazy(() => import('./pages/FlipLogs'));
const Charts = lazy(() => import('./pages/Charts'));
const ProfitVelocity = lazy(() => import('./pages/ProfitVelocity'));
const IconTest = lazy(() => import('./pages/IconTest'));
const TestDiscordReport = lazy(() => import('./pages/TestDiscordReport'));

// Lazy load the entire guest mode - it's a separate "app"
const GuestModeApp = lazy(() => import('./guest/GuestModeApp'));

// Import analytics pages directly to debug routing issue
import TradingHeatMap from './pages/TradingHeatMap';
import CapitalEfficiency from './pages/CapitalEfficiency';

// Component to conditionally show navigation
function AppContent() {
  const location = useLocation();
  const isGuestMode = location.pathname.startsWith('/guest');

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {!isGuestMode && <Navigation />}
      <main id="main-content" role="main">
        <Suspense
          fallback={
            <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
                <LoadingSpinner size="large" text="Loading page..." />
              </div>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/items" element={<Items />} />
            <Route path="/flip-logs" element={<FlipLogs />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/performance" element={<ProfitVelocity />} />
            <Route path="/profit-velocity" element={<ProfitVelocity />} />
            <Route path="/heatmap" element={<TradingHeatMap />} />
            <Route path="/efficiency" element={<CapitalEfficiency />} />
            <Route path="/icon-test" element={<IconTest />} />
            <Route path="/test-discord" element={<TestDiscordReport />} />

            {/* Guest mode - completely separate, lazy loaded */}
            <Route
              path="/guest/*"
              element={
                <Suspense
                  fallback={
                    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-900 flex items-center justify-center">
                      <div className="text-white text-xl">Loading Guest Mode...</div>
                    </div>
                  }
                >
                  <GuestModeApp />
                </Suspense>
              }
            />

            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
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
          console.log('📊 Analytics tracking re-enabled. Refresh to apply.');
        } else {
          localStorage.setItem('exclude-analytics', 'true');
          console.log('🚫 You are now excluded from analytics. Refresh to apply.');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <SEO />
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
