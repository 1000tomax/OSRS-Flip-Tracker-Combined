// Centralized UI constants and timings
export const UI = {
  // Refresh intervals, debounce windows, etc.
  REFRESH_INTERVAL_MS: 2000,
  REPORT_FEEDBACK_MS: 5000,
  ANALYTICS_BANNER_TIMEOUT_MS: 30000,
  DAILY_SUMMARY_ROW_HEIGHT: 35,
  DAILY_SUMMARY_EXTRA_HEIGHT: 200,
  AUTOLOAD_FLIPS_THRESHOLD: 200,
};

export const HEATMAP = {
  PROFIT_WEIGHT: 0.7,
  MIN_OPACITY: 0.3,
  EMPTY_OPACITY: 0.2,
};

export const ANALYTICS = {
  ROI_EXCLUSION_DAYS: 8,
  GP_PER_HOUR_NORMALIZER: 10000,
};

export const CHART = {
  Y_PAD_TOP_MULT: 1.1,
  Y_PAD_BOTTOM_MULT: 0.1,
  Y_PAD_MIN_MULT: 0.9,
};

export const TIME = {
  MINUTES_PER_WEEK: 10080,
};

export const TRADING = {
  PARALLEL_SLOTS: 8,
};

export default UI;
