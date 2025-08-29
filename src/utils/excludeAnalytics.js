/**
 * Utility to exclude yourself from analytics tracking
 * Run these commands in your browser console
 */

// To exclude yourself from analytics (run once on your browser)
export const excludeMeFromAnalytics = () => {
  localStorage.setItem('exclude-analytics', 'true');
  console.log('✅ You are now excluded from analytics tracking');
  console.log('Refresh the page for changes to take effect');
};

// To re-enable analytics (if you want to test it)
export const includeMeInAnalytics = () => {
  localStorage.removeItem('exclude-analytics');
  console.log('📊 Analytics tracking re-enabled');
  console.log('Refresh the page for changes to take effect');
};

// Check current status
export const checkAnalyticsStatus = () => {
  const isExcluded = localStorage.getItem('exclude-analytics');
  if (isExcluded) {
    console.log('🚫 You are currently EXCLUDED from analytics');
  } else {
    console.log('📊 You are currently INCLUDED in analytics');
  }
  return !isExcluded;
};

// Make functions available globally in development
if (import.meta.env.DEV) {
  window.excludeMeFromAnalytics = excludeMeFromAnalytics;
  window.includeMeInAnalytics = includeMeInAnalytics;
  window.checkAnalyticsStatus = checkAnalyticsStatus;
}
