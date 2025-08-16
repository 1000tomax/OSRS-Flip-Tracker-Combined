// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Navigation from './components/Navigation';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load all page components for code splitting
const Home = lazy(() => import('./pages/Home'));
const Items = lazy(() => import('./pages/Items'));
const FlipLogs = lazy(() => import('./pages/FlipLogs'));
const Charts = lazy(() => import('./pages/Charts'));
const StrategyBattle = lazy(() => import('./pages/StrategyBattle'));
const ProfitVelocity = lazy(() => import('./pages/ProfitVelocity'));

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-white dark:bg-black">
          <Navigation />
          <main>
            <Suspense fallback={
              <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
                  <LoadingSpinner size="large" text="Loading page..." />
                </div>
              </div>
            }>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/items" element={<Items />} />
                <Route path="/flip-logs" element={<FlipLogs />} />
                <Route path="/charts" element={<Charts />} />
                <Route path="/performance" element={<ProfitVelocity />} />
                <Route path="/volume" element={<StrategyBattle />} />
                <Route path="/profit-velocity" element={<ProfitVelocity />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;