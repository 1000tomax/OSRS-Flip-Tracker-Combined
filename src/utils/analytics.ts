// src/utils/analytics.ts - Privacy-focused analytics utilities

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

interface PageViewEvent {
  page_title: string;
  page_location: string;
  page_path: string;
}

type WebVitalMetric = { value: number };

class Analytics {
  private isEnabled: boolean;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || false;
    this.isEnabled = !this.isDevelopment && typeof window !== 'undefined';
  }

  // Track page views
  trackPageView(event: PageViewEvent): void {
    if (!this.isEnabled) {
      console.log('Analytics (dev):', 'Page View', event);
      return;
    }

    // In production, this would send to your analytics provider
    // For now, we'll just structure the data properly
    this.sendEvent('page_view', {
      page_title: event.page_title,
      page_location: event.page_location,
      page_path: event.page_path,
    });
  }

  // Track custom events
  trackEvent(event: AnalyticsEvent): void {
    if (!this.isEnabled) {
      console.log('Analytics (dev):', 'Event', event);
      return;
    }

    this.sendEvent('custom_event', {
      event_category: event.category,
      event_action: event.action,
      event_label: event.label,
      value: event.value,
    });
  }

  // Track trading-specific events
  trackTradingEvent(
    action: 'flip_viewed' | 'strategy_compared' | 'chart_interacted',
    details?: Record<string, unknown>
  ): void {
    this.trackEvent({
      category: 'Trading',
      action,
      label: (details?.item_name as string) || (details?.strategy as string) || 'general',
      value: (details?.profit as number) || (details?.quantity as number) || 1,
    });
  }

  // Track user engagement
  trackEngagement(action: 'search' | 'filter' | 'sort' | 'export', context: string): void {
    this.trackEvent({
      category: 'Engagement',
      action,
      label: context,
    });
  }

  // Track performance metrics
  trackPerformance(
    metric: 'load_time' | 'chart_render' | 'data_fetch' | 'lcp' | 'fid' | 'cls',
    value: number
  ): void {
    this.trackEvent({
      category: 'Performance',
      action: metric,
      value: Math.round(value),
    });
  }

  // Track errors
  trackError(error: Error, context: string): void {
    this.trackEvent({
      category: 'Error',
      action: error.name || 'Unknown Error',
      label: `${context}: ${error.message}`,
    });
  }

  private sendEvent(eventName: string, parameters: Record<string, unknown>): void {
    // This is where you'd integrate with your analytics provider
    // Examples: Google Analytics 4, Plausible, Mixpanel, etc.

    if (this.isDevelopment) {
      console.log(`Analytics Event: ${eventName}`, parameters);
    }

    // Example GA4 integration (commented out for privacy):
    // if (typeof gtag !== 'undefined') {
    //   gtag('event', eventName, parameters);
    // }

    // Example custom analytics endpoint:
    // fetch('/api/analytics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ event: eventName, ...parameters })
    // }).catch(() => {}); // Fail silently
  }

  // Track user preferences (privacy-safe)
  trackPreference(setting: string, value: string): void {
    this.trackEvent({
      category: 'Preferences',
      action: 'setting_changed',
      label: `${setting}:${value}`,
    });
  }

  // Measure and track Core Web Vitals
  trackWebVitals(): void {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Track page load performance
    window.addEventListener('load', () => {
      // Largest Contentful Paint
      if ('getLCP' in window) {
        // @ts-ignore
        window.getLCP((metric: WebVitalMetric) => {
          this.trackPerformance('lcp', metric.value);
        });
      }

      // First Input Delay
      if ('getFID' in window) {
        // @ts-ignore
        window.getFID((metric: WebVitalMetric) => {
          this.trackPerformance('fid', metric.value);
        });
      }

      // Cumulative Layout Shift
      if ('getCLS' in window) {
        // @ts-ignore
        window.getCLS((metric: WebVitalMetric) => {
          this.trackPerformance('cls', metric.value * 1000); // Convert to ms
        });
      }
    });
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Export hook for React components
export function useAnalytics() {
  return {
    trackPageView: analytics.trackPageView.bind(analytics),
    trackEvent: analytics.trackEvent.bind(analytics),
    trackTradingEvent: analytics.trackTradingEvent.bind(analytics),
    trackEngagement: analytics.trackEngagement.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackPreference: analytics.trackPreference.bind(analytics),
  };
}

export default analytics;
