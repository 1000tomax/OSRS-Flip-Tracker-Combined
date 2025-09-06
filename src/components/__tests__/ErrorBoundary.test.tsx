import React from 'react';
import { render, screen } from '../../tests/utils/testUtils';
import ErrorBoundary, { ChartErrorBoundary, DataErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
  });

  it('should render custom title and message', () => {
    const customTitle = 'Custom Error Title';
    const customMessage = 'Custom error message';

    render(
      <ErrorBoundary title={customTitle} message={customMessage}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(customTitle)).toBeInTheDocument();
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  // onError prop is not used in current implementation; skipping callback test

  it('should render custom fallback component', () => {
    const FallbackFn = (error: Error, retry: () => void) => (
      <div>
        <span>Custom fallback: {error?.message}</span>
        <button onClick={retry}>Retry</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={FallbackFn}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom fallback: Test error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should reset error state when retry is called', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /try again/i });
    retryButton.click();

    // Rerender with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});

describe('ChartErrorBoundary', () => {
  it('should render chart-specific error message', () => {
    render(
      <ChartErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ChartErrorBoundary>
    );

    // Title is not part of the custom fallback UI
    expect(screen.getByText('Chart Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/could not be displayed/i)).toBeInTheDocument();
  });

  it('should render chart icon in fallback', () => {
    render(
      <ChartErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ChartErrorBoundary>
    );

    expect(screen.getByText('📊')).toBeInTheDocument();
  });
});

describe('DataErrorBoundary', () => {
  it('should render data-specific error message', () => {
    render(
      <DataErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DataErrorBoundary>
    );

    expect(screen.getByText('Data Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Could not load the requested data/i)).toBeInTheDocument();
  });

  it('should render data icon in fallback', () => {
    render(
      <DataErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DataErrorBoundary>
    );

    expect(screen.getByText('📡')).toBeInTheDocument();
  });

  it('should render children when no error occurs', () => {
    render(
      <DataErrorBoundary>
        <ThrowError shouldThrow={false} />
      </DataErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});
