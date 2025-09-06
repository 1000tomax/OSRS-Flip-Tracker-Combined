import { useState, useEffect } from 'react';
import { analyticsOptOut } from '../../utils/guestAnalytics';
import UI from '@/config/constants';

export default function AnalyticsDisclosure() {
  const [isOptedOut, setIsOptedOut] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check opt-out status
    setIsOptedOut(analyticsOptOut.isOptedOut());

    // Show banner if user hasn't made a choice yet
    const hasSeenBanner = localStorage.getItem('analytics-banner-seen');
    if (!hasSeenBanner) {
      setShowBanner(true);

      // Auto-dismiss banner after user interaction (implied consent)
      const handleUserInteraction = () => {
        // Only auto-accept if they haven't explicitly opted out
        if (!analyticsOptOut.isOptedOut()) {
          localStorage.setItem('analytics-banner-seen', 'true');
          setShowBanner(false);
        }
      };

      // Listen for user interactions that imply they're using the app
      const interactionEvents = ['click', 'scroll', 'keydown'];
      const timeoutId = setTimeout(() => {
        // Auto-dismiss after 30 seconds of the banner being visible
        handleUserInteraction();
      }, UI.ANALYTICS_BANNER_TIMEOUT_MS);

      // Add event listeners for user interactions
      interactionEvents.forEach(event => {
        document.addEventListener(event, handleUserInteraction, { once: true });
      });

      // Cleanup function
      return () => {
        clearTimeout(timeoutId);
        interactionEvents.forEach(event => {
          document.removeEventListener(event, handleUserInteraction);
        });
      };
    }
  }, []);

  const handleOptOut = () => {
    analyticsOptOut.optOut();
    setIsOptedOut(true);
    localStorage.setItem('analytics-banner-seen', 'true');
    setShowBanner(false);
  };

  const handleAccept = () => {
    analyticsOptOut.optIn();
    setIsOptedOut(false);
    localStorage.setItem('analytics-banner-seen', 'true');
    setShowBanner(false);
  };

  // Initial disclosure banner
  if (showBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-300">
              <span className="font-semibold">📊 Anonymous Analytics</span>
              <br />
              We collect anonymous usage statistics to improve this tool. No personal data or
              trading information is ever collected.
              <br />
              <span className="text-xs text-gray-400 mt-1">
                We only track: page views, file size ranges (not exact), processing times, and
                feature usage. No item names, profits, or account data.
              </span>
              <br />
              <span className="text-xs text-gray-500 mt-1">
                💡 Continuing to use the app implies consent. Banner auto-dismisses after 30
                seconds.
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOptOut}
              className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition"
            >
              Opt Out
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-500 transition"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Persistent minimal indicator (optional - can be removed if you don't want it)
  return (
    <div className="fixed bottom-4 left-4 z-40">
      <button
        onClick={() => setShowBanner(true)}
        className="text-xs text-gray-500 hover:text-gray-400 transition"
        title="Analytics Settings"
      >
        {isOptedOut ? '📊 Analytics: Off' : '📊 Analytics: On'}
      </button>
    </div>
  );
}
