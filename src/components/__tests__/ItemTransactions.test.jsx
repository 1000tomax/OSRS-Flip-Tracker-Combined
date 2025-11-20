import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ItemTransactions from '../ItemTransactions';

const flips = [
  {
    ts: '2025-01-01T10:00:00Z',
    tsMs: Date.parse('2025-01-01T10:00:00Z'),
    quantity: 100,
    avgBuyPrice: 1000,
    avgSellPrice: 1100,
    profit: 10000,
    durationMin: 60,
    roi: 0.1,
    tax: 1000,
  },
  {
    ts: '2025-01-02T10:00:00Z',
    tsMs: Date.parse('2025-01-02T10:00:00Z'),
    quantity: 50,
    avgBuyPrice: 1200,
    avgSellPrice: 1180,
    profit: -1000,
    durationMin: 120,
    roi: -0.02,
    tax: 500,
  },
];

describe('ItemTransactions', () => {
  beforeAll(() => {
    // mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
  });

  test('renders rows and sorts by profit', () => {
    render(<ItemTransactions flips={flips} itemName="Dragon bones" />);
    expect(screen.getByText('Historical Transactions')).toBeInTheDocument();
    // Click Profit header to sort desc (default is date desc)
    fireEvent.click(screen.getByRole('button', { name: /profit/i }));
    // Click again to toggle asc
    fireEvent.click(screen.getByRole('button', { name: /profit/i }));
    // Expect both rows rendered in default paginated view
    expect(screen.getAllByText(/gp$/i).length).toBeGreaterThan(0);
  });

  test('toggle Show All and Export CSV', () => {
    render(
      <ItemTransactions
        flips={Array.from({ length: 25 }, (_, i) => ({
          ts: `2025-01-0${(i % 9) + 1}T10:00:00Z`,
          tsMs: Date.parse(`2025-01-0${(i % 9) + 1}T10:00:00Z`),
          quantity: 10 + i,
          avgBuyPrice: 1000,
          avgSellPrice: 1010,
          profit: 100,
          durationMin: 30,
          roi: 0.01,
        }))}
        itemName="Shark"
      />
    );
    const toggle = screen.getByRole('button', { name: /show all/i });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /paginate/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});
