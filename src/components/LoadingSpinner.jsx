// src/components/LoadingSpinner.jsx
import React from 'react';

export default function LoadingSpinner({ size = 'medium', text = 'Loading...' }) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-3">
      <div className={`${sizeClasses[size]} animate-spin`}>
        <div className="w-full h-full border-4 border-gray-300 dark:border-gray-600 border-t-yellow-600 rounded-full"></div>
      </div>
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

// Error Display Component
export function ErrorMessage({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
      <div className="text-4xl">⚠️</div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-red-500">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
          {error || 'An unexpected error occurred while loading data.'}
        </p>
      </div>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded transition-colors"
        >
          🔄 Try Again
        </button>
      )}
    </div>
  );
}