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
        <div className="flex flex-col min-h-full">
          <Navigation />
          <main id="main-content" role="main" className="flex-1">
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
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default WorkingApp;
