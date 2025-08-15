// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Items from './pages/Items';
import FlipLogs from './pages/FlipLogs';
import Charts from './pages/Charts';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-white dark:bg-black">
          <Navigation />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/items" element={<Items />} />
              <Route path="/flip-logs" element={<FlipLogs />} />
              <Route path="/charts" element={<Charts />} />
              <Route path="*" element={<Home />} /> {/* fallback, not a second "/" */}
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;