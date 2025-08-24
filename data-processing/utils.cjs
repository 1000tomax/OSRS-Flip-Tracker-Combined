const fs = require('fs');

/**
 * Parse a CSV string into an array of objects.
 * Handles quoted values and escaped quotes. The first line is used as
 * the header. If rows have fewer values than headers, missing values
 * are set to empty strings. Extra values are ignored.
 *
 * @param {string} text The raw CSV contents.
 * @returns {{header: string[], records: object[]}}
 */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { header: [], records: [] };
  }
  const header = parseCSVLine(lines[0]);
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const record = {};
    for (let j = 0; j < header.length; j++) {
      record[header[j]] = fields[j] !== undefined ? fields[j] : '';
    }
    records.push(record);
  }
  return { header, records };
}

/**
 * Parses a single CSV line into an array of cell strings.
 * Supports double quoted values with escaping ("" -> ").
 *
 * @param {string} line
 * @returns {string[]}
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Check if next character is also a quote (escaped quote)
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

/**
 * Ensures that a directory exists. Creates it (recursively) if it does not.
 *
 * @param {string} dirPath
 * @returns {Promise<void>}
 */
async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

/**
 * Removes any commas from a numeric string and converts it to a number.
 * Returns 0 if the input is falsy or cannot be parsed.
 *
 * @param {string|number|null} value
 * @returns {number}
 */
function parseNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;

  // Normalize to string
  let s = String(value).trim();

  // Strip a single leading apostrophe used for CSV formula-injection protection
  if (s.startsWith("'")) s = s.slice(1);

  // Optional: handle parentheses accounting, e.g. "(123)" -> -123
  const parenMatch = s.match(/^\(([\d,]+(\.\d+)?)\)$/);
  if (parenMatch) s = '-' + parenMatch[1];

  // Normalize minus variants and strip noise while preserving a single leading '-'
  s = s
    .replace(/[\u2212\u2012\u2013\u2014]/g, '-') // Unicode minus / figure dash / en/em dash -> ASCII '-'
    .replace(/,/g, '')                           // drop thousands separators
    .replace(/\s+/g, '');                        // drop stray whitespace
  
  // If there are multiple '-' signs, keep only the first (leading) one
  s = s.replace(/(?!^)-/g, '');

  const num = parseFloat(s);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Formats a Date object as MM-DD-YYYY with zero padding.
 * Converts UTC timestamp to Chicago timezone (America/Chicago) for accurate date grouping.
 *
 * @param {Date|string|number} dateVal
 * @returns {string}
 */
function formatDate(dateVal) {
  const date = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
  // Convert to Chicago timezone for accurate date grouping
  const chicagoDate = new Date(date.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  const month = String(chicagoDate.getMonth() + 1).padStart(2, '0');
  const day = String(chicagoDate.getDate()).padStart(2, '0');
  const year = String(chicagoDate.getFullYear());
  return `${month}-${day}-${year}`;
}

/**
 * Formats the current local date/time into the format
 * MM-DD-YYYYTHH:mm:ss±HH:MM. The timezone offset is derived
 * from the local timezone using getTimezoneOffset().
 *
 * @returns {string}
 */
function formatTimestampWithOffset() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear());
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  // Timezone offset in minutes. Positive if local timezone is behind UTC.
  const offsetMinutes = now.getTimezoneOffset();
  const sign = offsetMinutes > 0 ? '-' : '+';
  const offset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(offset / 60)).padStart(2, '0');
  const offsetMins = String(offset % 60).padStart(2, '0');
  const offsetStr = `${sign}${offsetHours}:${offsetMins}`;
  return `${month}-${day}-${year}T${hours}:${minutes}:${seconds}${offsetStr}`;
}

/**
 * Converts arbitrary value to a CSV-safe string. If the value
 * contains a comma, newline or double quote, it will be wrapped
 * in double quotes and any existing quotes will be doubled.
 * Also prevents CSV formula injection by prefixing formula characters.
 *
 * @param {any} val
 * @returns {string}
 */
function toCSVCell(val) {
  let str = val === null || val === undefined ? '' : String(val);
  // Prevent CSV formula injection
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  if (/[,\"\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

module.exports = {
  parseCSV,
  parseCSVLine,
  ensureDir,
  parseNumber,
  formatDate,
  formatTimestampWithOffset,
  toCSVCell,
};