// Working App with all pages restored using simple data fetching
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navigation from './components/Navigation';
import HomeSimple from './pages/Home';
import ItemsSimple from './pages/Items';
import ChartsSimple from './pages/Charts';
import FlipLogsSimple from './pages/FlipLogs';
import PerformanceSimple from './pages/ProfitVelocity';
import VolumeSimple from './pages/StrategyBattle';
import { LoadingLayout } from './components/layouts';

function WorkingApp() {
  return (
    <ErrorBoundary>
      <Router>
        <Navigation />
        <main id="main-content" role="main">
          <Suspense fallback={<LoadingLayout text="Loading page..." />}>
            <Routes>
              <Route path="/" element={<HomeSimple />} />
              <Route path="/items" element={<ItemsSimple />} />
              <Route path="/charts" element={<ChartsSimple />} />
              <Route path="/performance" element={<PerformanceSimple />} />
              <Route path="/volume" element={<VolumeSimple />} />
              <Route path="/flip-logs" element={<FlipLogsSimple />} />
              <Route path="*" element={<HomeSimple />} />
            </Routes>
          </Suspense>
        </main>
      </Router>
    </ErrorBoundary>
  );
}

export default WorkingApp;
