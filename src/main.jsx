import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

// Initialize Sentry only in production
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Privacy-first: mask all text and block media
        maskAllText: true,
        blockAllMedia: true,
        // Only record session when error happens
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
      }),
    ],
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Don't send PII
    beforeSend(event) {
      // Remove any potential personal data
      if (event.request) {
        delete event.request.cookies;
      }
      if (event.user) {
        delete event.user.ip_address;
      }
      return event;
    },
    // Ignore common non-critical errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
    ],
  });
}

// Wrap App with Sentry error boundary
const SentryApp = import.meta.env.PROD ? Sentry.withProfiler(App) : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SentryApp />
    <Toaster richColors closeButton position="top-right" />
    {/* Only load analytics in production and if not excluded */}
    {import.meta.env.PROD &&
      !localStorage.getItem('exclude-analytics') &&
      !window.location.hostname.includes('localhost') && <Analytics />}
  </React.StrictMode>
);
// Force rebuild Sat, Aug 16, 2025  1:54:50 PM
// Cache bust: Sat, Aug 16, 2025  2:17:09 PM
