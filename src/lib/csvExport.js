/**
 * CSV Export Utility
 *
 * Provides functionality to export JavaScript data to CSV format.
 * Handles special characters, escaping, and custom column configurations.
 */

/**
 * Escapes special characters in CSV values
 * @param {any} value - The value to escape
 * @returns {string} - Escaped CSV-safe string
 */
function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Check if escaping is needed
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Exports data to CSV format and triggers download
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column configuration with key, label, and optional render/sortValue
 * @param {string} filename - Name for the downloaded file
 */
export function exportToCsv(data, columns, filename) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Extract headers from column labels
  const headers = columns.map(col => col.label || col.key);

  // Build CSV content
  const csvRows = [];

  // Add headers
  csvRows.push(headers.map(escapeCsvValue).join(','));

  // Add data rows
  data.forEach(row => {
    const values = columns.map(col => {
      let value;

      // Use sortValue if available (for calculated fields)
      if (col.sortValue) {
        value = col.sortValue(row);
      } else {
        value = row[col.key];
      }

      // Handle special formatting for display
      // Note: We export raw values, not formatted HTML
      if (col.key === 'profit' && row.received_post_tax !== undefined && row.spent !== undefined) {
        value = row.received_post_tax - row.spent;
      } else if (col.key === 'duration' && row.opened_time && row.closed_time) {
        const duration = new Date(row.closed_time).getTime() - new Date(row.opened_time).getTime();
        value = formatDurationForCsv(duration);
      }

      return escapeCsvValue(value);
    });

    csvRows.push(values.join(','));
  });

  // Create CSV content
  const csvContent = csvRows.join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Formats duration in milliseconds to human-readable format for CSV
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration string
 */
function formatDurationForCsv(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Generates a filename with current date
 * @param {string} prefix - Prefix for the filename (e.g., 'osrs-items')
 * @returns {string} - Formatted filename with date
 */
export function generateCsvFilename(prefix) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${prefix}-${year}-${month}-${day}.csv`;
}
