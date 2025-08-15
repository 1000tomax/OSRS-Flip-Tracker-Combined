import React, { useState, useMemo } from 'react';

export default function SortableTable({ 
  data, 
  columns, 
  initialSortField = null, 
  initialSortDirection = 'desc',
  className = "",
  rowClassName = "",
  headerClassName = "bg-gray-700"
}) {
  const [sortField, setSortField] = useState(initialSortField);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField || !data) return data;

    return [...data].sort((a, b) => {
      const column = columns.find(col => col.key === sortField);
      let aVal, bVal;

      if (column?.sortValue) {
        aVal = column.sortValue(a);
        bVal = column.sortValue(b);
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      // Handle different data types
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      // Numeric comparison
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortField, sortDirection, columns]);

  const getSortIcon = (columnKey) => {
    if (sortField !== columnKey) return '';
    return sortDirection === 'asc' ? '▲' : '▼';
  };

  return (
    <div className="overflow-x-auto">
      <table className={`w-full bg-gray-800 rounded-lg overflow-hidden ${className}`}>
        <thead className={headerClassName}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-600 transition text-sm font-medium ${column.headerClass || 'text-left'}`}
                onClick={() => column.sortable !== false && handleSort(column.key)}
              >
                {column.label} {column.sortable !== false && getSortIcon(column.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr
              key={row.id || index}
              className={`border-t border-gray-700 hover:bg-gray-750 transition ${
                index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'
              } ${rowClassName}`}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 text-sm ${column.cellClass || ''}`}
                >
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * HOW THE SORTABLE TABLE WORKS - LEARNING NOTES
 * 
 * 1. **Component Props Pattern**:
 *    - Takes data and column definitions as props
 *    - Flexible design allows reuse for different types of tables
 *    - Props provide customization without changing core logic
 * 
 * 2. **State Management**:
 *    - Uses useState to track current sort field and direction
 *    - State changes trigger re-renders with new sort order
 *    - Initial state can be configured via props
 * 
 * 3. **Performance Optimization**:
 *    - useMemo prevents unnecessary re-sorting
 *    - Only recalculates when dependencies actually change
 *    - Copying array before sorting preserves original data
 * 
 * 4. **Event Handling**:
 *    - onClick handlers attached to column headers
 *    - Event handlers update state, which triggers re-render
 *    - Conditional logic handles same vs different column clicks
 * 
 * 5. **Data Types**:
 *    - Automatically detects strings vs numbers
 *    - String sorting uses localeCompare (proper alphabetical order)
 *    - Number sorting handles invalid values gracefully
 * 
 * 6. **Customization Features**:
 *    - Custom render functions for special formatting
 *    - Custom sort functions for complex data types
 *    - CSS class customization for styling
 *    - Optional disable sorting per column
 * 
 * 7. **Accessibility**:
 *    - Semantic HTML table structure
 *    - Visual indicators for sort direction
 *    - Hover effects for interactive elements
 * 
 * 8. **React Concepts Demonstrated**:
 *    - Props and prop destructuring
 *    - useState for local component state
 *    - useMemo for performance optimization
 *    - Event handling
 *    - Conditional rendering
 *    - Array mapping for dynamic content
 *    - CSS-in-JS styling
 */