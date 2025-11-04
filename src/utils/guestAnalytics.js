/**
 * Analytics utility for privacy-focused event tracking
 * Only tracks anonymous, aggregate data - no personal information
 */

// Check if user has opted out
const isOptedOut = () => {
  return localStorage.getItem('analytics-opt-out') === 'true';
};

// Generate anonymous session ID (resets each session)
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('anon-session-id');
  if (!sessionId) {
    // Use crypto-safe random instead of Math.random()
    const randomValues = new Uint32Array(2);
    crypto.getRandomValues(randomValues);
    const randomString = randomValues[0].toString(36) + randomValues[1].toString(36);
    sessionId = `session-${Date.now()}-${randomString}`;
    sessionStorage.setItem('anon-session-id', sessionId);
  }
  return sessionId;
};

/**
 * Track an event with optional properties
 * @param {string} eventName - Name of the event to track
 * @param {Object} properties - Optional properties (will be anonymized)
 */
export const trackEvent = (eventName, properties = {}) => {
  // Don't track if opted out
  if (isOptedOut()) {
    console.log('[Analytics Opted Out]', eventName, properties);
    return;
  }

  // Always log in development for testing
  if (import.meta.env.DEV) {
    console.log('[Analytics Debug]', eventName, properties);
    return;
  }

  // Use Vercel Analytics if available
  if (window.va) {
    window.va('event', eventName, properties);
  }

  // Also track to console in production for debugging
  console.log('[Analytics]', eventName, properties);
};

/**
 * Track guest mode specific events with privacy-safe defaults
 */
export const guestAnalytics = {
  // Track CSV upload attempt
  uploadStarted: () => {
    trackEvent('guest_upload_started', {
      session: getSessionId(),
      timestamp: new Date().toISOString(),
    });
  },

  // Track successful CSV processing
  uploadCompleted: (rowCount, processingTimeMs, accountCount) => {
    trackEvent('guest_upload_completed', {
      session: getSessionId(),
      // Round to preserve privacy
      row_count_bucket: getBucket(rowCount, [1000, 5000, 10000, 50000]),
      processing_seconds: Math.round(processingTimeMs / 1000),
      account_count: Math.min(accountCount, 5), // Cap at 5+ for privacy
      timestamp: new Date().toISOString(),
    });
  },

  // Track upload errors
  uploadFailed: errorType => {
    trackEvent('guest_upload_failed', {
      session: getSessionId(),
      error_type: errorType, // e.g., 'invalid_format', 'parsing_error', 'show_buying_enabled'
      timestamp: new Date().toISOString(),
    });
  },

  // Track export action
  dataExported: () => {
    trackEvent('guest_data_exported', {
      session: getSessionId(),
      timestamp: new Date().toISOString(),
    });
  },

  // Track screenshot capture
  screenshotCaptured: targetType => {
    trackEvent('guest_screenshot_captured', {
      session: getSessionId(),
      target: targetType, // 'chart', 'items_table', 'daily_summary'
      timestamp: new Date().toISOString(),
    });
  },

  // Track navigation to dashboard
  dashboardViewed: () => {
    trackEvent('guest_dashboard_viewed', {
      session: getSessionId(),
      timestamp: new Date().toISOString(),
    });
  },

  // Track when user returns to upload page with existing data
  returnedToUpload: hasExistingData => {
    trackEvent('guest_returned_to_upload', {
      session: getSessionId(),
      has_existing_data: hasExistingData,
      timestamp: new Date().toISOString(),
    });
  },
};

// Helper function to bucket numbers for privacy
function getBucket(value, buckets) {
  for (const bucket of buckets) {
    if (value <= bucket) return `<=${bucket}`;
  }
  return `>${buckets[buckets.length - 1]}`;
}

// Opt-out functionality
export const analyticsOptOut = {
  optOut: () => {
    localStorage.setItem('analytics-opt-out', 'true');
    trackEvent('analytics_opted_out'); // Track the opt-out itself
  },

  optIn: () => {
    localStorage.removeItem('analytics-opt-out');
    trackEvent('analytics_opted_in');
  },

  isOptedOut: () => {
    return localStorage.getItem('analytics-opt-out') === 'true';
  },
};

// Debug helper for development
export const debugAnalytics = () => {
  console.log('Analytics Debug Info:');
  console.log('- Opted out?', localStorage.getItem('analytics-opt-out'));
  console.log('- Session ID:', sessionStorage.getItem('anon-session-id'));
  console.log('- Environment:', import.meta.env.MODE);
};

// Make debug function available in development
if (import.meta.env.DEV) {
  window.debugAnalytics = debugAnalytics;
}
