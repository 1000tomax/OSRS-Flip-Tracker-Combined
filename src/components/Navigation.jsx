// src/components/Navigation.jsx - Updated with Charts link and current day default
import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

function getCurrentDateFormatted() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  return `${month}-${day}-${year}`;
}

function getYesterdayFormatted() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  const year = yesterday.getFullYear();
  return `${month}-${day}-${year}`;
}

const Navigation = React.memo(function Navigation() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = useMemo(() => [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/items', label: 'Items', icon: '📦' },
    { path: '/charts', label: 'Charts', icon: '📈' },
    { path: `/volume?date=${getYesterdayFormatted()}`, label: 'Volume', icon: '⚔️' },
    { path: `/flip-logs?date=${getCurrentDateFormatted()}`, label: 'Flip Logs', icon: '📋' }
  ], []);

  return (
    <nav className="bg-gray-900 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center space-x-2 text-yellow-500 hover:text-yellow-400 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="text-2xl">💰</span>
              <span className="font-bold text-lg">1K to Max</span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path.split('?')[0] &&
                              (item.path.includes('?') ? location.search === item.path.split('?')[1] : true);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 min-h-[44px] ${
                    isActive
                      ? 'bg-yellow-600 text-black'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-300 hover:text-white p-2 rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path.split('?')[0] &&
                                (item.path.includes('?') ? location.search === item.path.split('?')[1] : true);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`block px-4 py-3 rounded-md text-base font-medium transition-colors flex items-center space-x-3 ${
                      isActive
                        ? 'bg-yellow-600 text-black'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
});

export default Navigation;