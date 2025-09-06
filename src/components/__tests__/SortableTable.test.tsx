import React from 'react';
import { render, screen, fireEvent } from '../../tests/utils/testUtils';
import SortableTable from '../SortableTable';

const mockData = [
  { id: '1', name: 'John', age: 30, score: 85.5 },
  { id: '2', name: 'Jane', age: 25, score: 92.3 },
  { id: '3', name: 'Bob', age: 35, score: 78.1 },
];

const mockColumns = [
  {
    key: 'name',
    label: 'Name',
    render: (value: string) => <span data-testid="name-cell">{value}</span>,
  },
  {
    key: 'age',
    label: 'Age',
    cellClass: 'text-center',
  },
  {
    key: 'score',
    label: 'Score',
    render: (value: number | undefined) => (typeof value === 'number' ? `${value.toFixed(1)}%` : '-'),
  },
];

describe('SortableTable', () => {
  it('should render table with data', () => {
    render(<SortableTable data={mockData} columns={mockColumns} />);

    // Check headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();

    // Check data rows
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  it('should render custom cell content using render function', () => {
    render(<SortableTable data={mockData} columns={mockColumns} />);

    // Check custom rendered cells
    expect(screen.getAllByTestId('name-cell')).toHaveLength(3);
    expect(screen.getByText('85.5%')).toBeInTheDocument();
    expect(screen.getByText('92.3%')).toBeInTheDocument();
    expect(screen.getByText('78.1%')).toBeInTheDocument();
  });

  it('should apply custom CSS classes to cells', () => {
    render(<SortableTable data={mockData} columns={mockColumns} />);

    // Check that age cells have the text-center class
    const ageCells = screen.getAllByText(/^(25|30|35)$/);
    ageCells.forEach(cell => {
      expect(cell.closest('td')).toHaveClass('text-center');
    });
  });

  it('should sort data when column header is clicked', () => {
    render(
      <SortableTable
        data={mockData}
        columns={mockColumns}
        initialSortField="age"
        initialSortDirection="asc"
      />
    );

    const ageHeader = screen.getByText('Age').closest('th');
    expect(ageHeader).toHaveAttribute('aria-sort', 'ascending');

    // Click to sort descending
    fireEvent.click(ageHeader!);
    expect(ageHeader).toHaveAttribute('aria-sort', 'descending');

    // Check that data is sorted by age descending
    const rows = screen.getAllByRole('row');
    const dataRows = rows.slice(1); // Skip header row
    expect(dataRows[0]).toHaveTextContent('Bob'); // age 35
    expect(dataRows[1]).toHaveTextContent('John'); // age 30
    expect(dataRows[2]).toHaveTextContent('Jane'); // age 25
  });

  it('should handle keyboard navigation', () => {
    render(<SortableTable data={mockData} columns={mockColumns} />);

    const nameHeader = screen.getByText('Name').closest('th');
    nameHeader?.focus();

    // Press Enter to sort (first sort sets desc by default)
    fireEvent.keyDown(nameHeader!, { key: 'Enter', code: 'Enter' });
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');

    // Press Space to sort
    fireEvent.keyDown(nameHeader!, { key: ' ', code: 'Space' });
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('should handle empty data', () => {
    render(<SortableTable data={[]} columns={mockColumns} />);

    // Headers should still be present
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();

    // Expect header row + 'No data available' row
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(2);
  });

  it('should handle missing data fields gracefully', () => {
    const incompleteData = [
      { id: '1', name: 'John' }, // missing age and score
      { id: '2', age: 25, score: 92.3 }, // missing name
    ];

    render(<SortableTable data={incompleteData} columns={mockColumns} />);

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('92.3%')).toBeInTheDocument();
  });

  it('should use custom sort value when provided', () => {
    const columnsWithCustomSort = [
      {
        key: 'name',
        label: 'Name',
        sortValue: (row: any) => row.name.toLowerCase(),
      },
      ...mockColumns.slice(1),
    ];

    render(
      <SortableTable
        data={mockData}
        columns={columnsWithCustomSort}
        initialSortField="name"
        initialSortDirection="asc"
      />
    );

    const rows = screen.getAllByRole('row');
    const dataRows = rows.slice(1);
    expect(dataRows[0]).toHaveTextContent('Bob');
    expect(dataRows[1]).toHaveTextContent('Jane');
    expect(dataRows[2]).toHaveTextContent('John');
  });

  it('should disable sorting for non-sortable columns', () => {
    const nonSortableColumns = [
      {
        key: 'name',
        label: 'Name',
        sortable: false,
      },
      ...mockColumns.slice(1),
    ];

    render(<SortableTable data={mockData} columns={nonSortableColumns} />);

    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toHaveAttribute('tabIndex', '-1');
    expect(nameHeader).not.toHaveAttribute('aria-sort');

    // Clicking should not sort
    fireEvent.click(nameHeader!);
    expect(nameHeader).not.toHaveAttribute('aria-sort');
  });

  it('should apply custom table className', () => {
    const { container } = render(
      <SortableTable data={mockData} columns={mockColumns} className="custom-table-class" />
    );

    const table = container.querySelector('table');
    expect(table).toHaveClass('custom-table-class');
  });

  it('should provide accessibility labels for sorting', () => {
    render(<SortableTable data={mockData} columns={mockColumns} />);

    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toHaveAttribute('aria-label', 'Sort by Name');

    // After clicking once
    fireEvent.click(nameHeader!);
    // After first click current sort is desc, label shows next action
    expect(nameHeader).toHaveAttribute('aria-label', 'Sort by Name ascending');

    // After clicking twice
    fireEvent.click(nameHeader!);
    expect(nameHeader).toHaveAttribute('aria-label', 'Sort by Name descending');
  });
});
