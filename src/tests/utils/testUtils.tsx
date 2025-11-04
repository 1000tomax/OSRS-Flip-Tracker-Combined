import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { FlipData, ItemStats, DailySummary } from '../../types';

// Test wrapper with all providers
interface AllProvidersProps {
  children: React.ReactNode;
}

const AllProviders: React.FC<AllProvidersProps> = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

// Custom render function
interface CustomRenderOptions extends RenderOptions {
  initialEntries?: string[];
}

const customRender = (ui: ReactElement, options: CustomRenderOptions = {}): RenderResult => {
  const { wrapper, ...renderOptions } = options;
  const DefaultWrapper: React.FC<AllProvidersProps> = ({ children }) => (
    <AllProviders>{children}</AllProviders>
  );
  const FinalWrapper = wrapper ?? DefaultWrapper;

  return render(ui, { wrapper: FinalWrapper as React.ComponentType, ...renderOptions });
};

// Mock data factories
export const createMockFlipData = (overrides: Partial<FlipData> = {}): FlipData =>
  ({
    id: 'test-flip-1',
    item_name: 'Dragon bones',
    buy_price: 1000,
    sell_price: 1200,
    quantity: 100,
    profit: 200,
    roi_percent: 20,
    opened_time: '2024-01-15T10:00:00Z',
    closed_time: '2024-01-15T11:00:00Z',
    // Additional fields used by tests
    status: 'FINISHED',
    spent: 100000,
    received_post_tax: 120000,
    closed_quantity: 100,
    ...overrides,
  }) as unknown as FlipData;

export const createMockItemStats = (overrides: Partial<ItemStats> = {}): ItemStats =>
  ({
    item_name: 'Dragon bones',
    flips: 50,
    total_profit: 10000,
    total_spent: 50000,
    roi_percent: 20,
    avg_profit_per_flip: 200,
    last_flipped: '2024-01-15',
    ...overrides,
  }) as unknown as ItemStats;

export const createMockDailySummary = (overrides: Partial<DailySummary> = {}): DailySummary =>
  ({
    date: '2024-01-15',
    flips: 25,
    total_profit: 5000,
    total_spent: 25000,
    roi_percent: 20,
    top_items: [
      { item_name: 'Dragon bones', profit: 2000 },
      { item_name: 'Shark', profit: 1500 },
    ],
    ...overrides,
  }) as unknown as DailySummary;

// Mock CSV data
export const mockCsvData = [
  createMockFlipData({ id: '1', item_name: 'Dragon bones', profit: 1000 }),
  createMockFlipData({ id: '2', item_name: 'Shark', profit: 500 }),
  createMockFlipData({ id: '3', item_name: 'Rune sword', profit: -200 }),
];

export const mockItemStatsData = [
  createMockItemStats({ item_name: 'Dragon bones', total_profit: 10000 }),
  createMockItemStats({ item_name: 'Shark', total_profit: 5000 }),
  createMockItemStats({ item_name: 'Rune sword', total_profit: -1000 }),
];

// Mock fetch responses
export const mockFetchSuccess = (data: any) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  });
};

export const mockFetchError = (error: string = 'Network error') => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(error));
};

// Utility functions for testing
export const waitForLoadingToFinish = async () => {
  try {
    await screen.findByText(/loading/i, {}, { timeout: 100 });
    await screen.findByText(/loading/i, {}, { timeout: 100 }).then(() => {
      throw new Error('Still loading');
    });
  } catch {
    // Loading finished
  }
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };
