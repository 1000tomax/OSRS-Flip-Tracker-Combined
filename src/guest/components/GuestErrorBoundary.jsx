import React from 'react';
import * as Sentry from '@sentry/react';

class GuestErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to Sentry with context
    Sentry.withScope(scope => {
      scope.setTag('location', 'guest_dashboard');
      scope.setContext('error_boundary', {
        componentStack: errorInfo.componentStack,
        props: this.props,
      });
      Sentry.captureException(error);
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
            <p className="text-gray-300 mb-4">
              The guest dashboard encountered an error. The error has been logged and we'll fix it
              soon.
            </p>
            <details className="mb-4">
              <summary className="text-gray-400 cursor-pointer">Error details</summary>
              <pre className="text-xs text-gray-500 mt-2 overflow-auto">
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={() => (window.location.href = '/guest')}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Return to Upload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GuestErrorBoundary;
