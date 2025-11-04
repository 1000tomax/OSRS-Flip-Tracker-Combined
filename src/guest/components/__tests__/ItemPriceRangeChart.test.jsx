import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ItemPriceRangeChart from '../../components/ItemPriceRangeChart';

describe('ItemPriceRangeChart', () => {
  test('shows explainer and quartile values when toggled', () => {
    const buy = [1000, 1020, 1030, 1100, 1200];
    const sell = [1200, 1250, 1300, 1350, 1400];
    render(<ItemPriceRangeChart buyPrices={buy} sellPrices={sell} />);

    const btn = screen.getByRole('button', { name: /how to read this/i });
    fireEvent.click(btn);
    expect(screen.getByText(/buy quartiles/i)).toBeInTheDocument();
    expect(screen.getByText(/sell quartiles/i)).toBeInTheDocument();
    // Show a known label like Min or Q1 chips
    expect(screen.getAllByText(/min/i).length).toBeGreaterThan(0);
  });
});
