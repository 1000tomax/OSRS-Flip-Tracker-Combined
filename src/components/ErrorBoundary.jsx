// src/components/ErrorBoundary.jsx - Comprehensive error boundary system
import React from 'react';
import logger from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    logger.error('Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      props: this.props,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Report to error tracking service in production
    if (import.meta.env.PROD) {
      // TODO: Send to error tracking service (Sentry, Bugsnag, etc.)
      // errorTracker.captureException(error, { extra: errorInfo })
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });

    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      return (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 m-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-red-400 text-xl">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-red-400">
                {this.props.title || 'Something went wrong'}
              </h3>
              <p className="text-red-300 text-sm">
                {this.props.message || 'An unexpected error occurred in this component'}
              </p>
            </div>
          </div>

          {/* Error details in development */}
          {import.meta.env.DEV && this.state.error && (
            <details className="mb-4">
              <summary className="text-red-300 cursor-pointer text-sm mb-2">
                Error Details (Development Only)
              </summary>
              <div className="bg-gray-900 p-3 rounded text-xs text-gray-300 font-mono overflow-auto">
                <div className="mb-2">
                  <strong>Error:</strong> {this.state.error.message}
                </div>
                <div className="mb-2">
                  <strong>Error ID:</strong> {this.state.errorId}
                </div>
                <div>
                  <strong>Stack:</strong>
                  <pre className="mt-1 whitespace-pre-wrap">{this.state.error.stack}</pre>
                </div>
              </div>
            </details>
          )}

          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition text-sm font-medium"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to catch async errors
export function useErrorHandler() {
  const [error, setError] = React.useState(null);

  const handleError = React.useCallback(error => {
    logger.error('Async error caught:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  // Throw error to be caught by error boundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, clearError };
}

// HOC for easier wrapping
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = props => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Specialized error boundaries for different contexts
export const ChartErrorBoundary = ({ children }) => (
  <ErrorBoundary
    title="Chart Error"
    message="Unable to render the chart. This might be due to invalid data or a display issue."
    fallback={(error, retry) => (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-8 text-center">
        <div className="text-gray-400 text-4xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Chart Unavailable</h3>
        <p className="text-gray-400 text-sm mb-4">
          The chart could not be displayed. This might be temporary.
        </p>
        <button
          onClick={retry}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
        >
          Retry Chart
        </button>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export const DataErrorBoundary = ({ children }) => (
  <ErrorBoundary
    title="Data Loading Error"
    message="Failed to load or process data. This might be a temporary network issue."
    fallback={(error, retry) => (
      <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6 text-center">
        <div className="text-yellow-400 text-3xl mb-3">📡</div>
        <h3 className="text-lg font-semibold text-yellow-400 mb-2">Data Unavailable</h3>
        <p className="text-yellow-300 text-sm mb-4">
          Could not load the requested data. Please check your connection and try again.
        </p>
        <button
          onClick={retry}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-black rounded-lg transition text-sm font-medium"
        >
          Retry Loading
        </button>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;
