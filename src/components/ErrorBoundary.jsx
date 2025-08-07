// src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="text-6xl">💥</div>
            <h2 className="text-2xl font-bold text-red-500">Oops! Something went wrong</h2>
            <p className="text-gray-600 dark:text-gray-400">
              The OSRS dashboard encountered an unexpected error. Don't worry, your flipping data is safe!
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-gray-100 dark:bg-gray-800 p-4 rounded border text-sm">
                <summary className="cursor-pointer font-medium mb-2">Error Details (Dev Mode)</summary>
                <div className="space-y-2">
                  <div>
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs mt-1">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded transition-colors"
                onClick={() => window.location.reload()}
              >
                🔄 Reload Dashboard
              </button>
              <button 
                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded transition-colors"
                onClick={() => window.location.href = '/'}
              >
                🏠 Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;