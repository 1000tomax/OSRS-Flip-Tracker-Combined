// src/components/Navigation.jsx - Updated with Charts link and current day default
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DateUtils } from '../utils/dateUtils';

function getCurrentDateFormatted() {
  return DateUtils.getTodayChicago();
}

const Navigation = React.memo(function Navigation() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const menuButtonRef = useRef(null);

  const navItems = useMemo(
    () => [
      { path: '/', label: 'Home', icon: '🏠' },
      { path: '/items', label: 'Items', icon: '📦' },
      { path: '/charts', label: 'Charts', icon: '📈' },
      { path: '/performance', label: 'Performance', icon: '⚡' },
      { path: '/heatmap', label: 'Heat Map', icon: '🔥' },
      { path: `/flip-logs?date=${getCurrentDateFormatted()}`, label: 'Flip Logs', icon: '📋' },
      { path: '/guest', label: 'Guest Mode', icon: '👤' },
    ],
    []
  );

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target)
      ) {
        setMobileMenuOpen(false);
      }
    };

    const handleEscape = event => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen]);

  // Auto-focus first menu item when mobile menu opens
  useEffect(() => {
    if (mobileMenuOpen) {
      const firstMenuItem = mobileMenuRef.current?.querySelector('[role="menuitem"]');
      firstMenuItem?.focus();
    }
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-yellow-600 text-black px-4 py-2 z-50 rounded-br-md"
      >
        Skip to main content
      </a>

      <nav
        className="bg-gray-900 border-b border-gray-700 sticky top-0 z-50"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center space-x-2 text-yellow-500 hover:text-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-md px-2 py-1"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="1K to Max - Go to homepage"
              >
                <span className="text-2xl" aria-hidden="true">
                  💰
                </span>
                <span className="font-bold text-lg">1K to Max</span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex space-x-1">
              {navItems.map(item => {
                const isActive =
                  location.pathname === item.path.split('?')[0] &&
                  (item.path.includes('?') ? location.search === item.path.split('?')[1] : true);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                      isActive
                        ? 'bg-yellow-600 text-black'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="text-lg" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                ref={menuButtonRef}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                onKeyDown={e => {
                  if (e.key === 'Escape' && mobileMenuOpen) {
                    setMobileMenuOpen(false);
                  }
                }}
                className="text-gray-300 hover:text-white p-2 rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label="Toggle mobile menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div
              id="mobile-menu"
              ref={mobileMenuRef}
              className="md:hidden pb-4"
              role="menu"
              aria-labelledby="mobile-menu-button"
            >
              <div className="space-y-1">
                {navItems.map((item, index) => {
                  const isActive =
                    location.pathname === item.path.split('?')[0] &&
                    (item.path.includes('?') ? location.search === item.path.split('?')[1] : true);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      role="menuitem"
                      tabIndex={mobileMenuOpen ? 0 : -1}
                      className={`block px-4 py-3 rounded-md text-base font-medium transition-colors flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                        isActive
                          ? 'bg-yellow-600 text-black'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                      onKeyDown={e => {
                        if (e.key === 'Escape') {
                          setMobileMenuOpen(false);
                          menuButtonRef.current?.focus();
                        }
                        // Arrow key navigation
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          const nextItem =
                            mobileMenuRef.current?.querySelectorAll('[role="menuitem"]')[index + 1];
                          nextItem?.focus();
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          const prevItem =
                            mobileMenuRef.current?.querySelectorAll('[role="menuitem"]')[index - 1];
                          prevItem?.focus();
                        }
                      }}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="text-lg" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
});

export default Navigation;
