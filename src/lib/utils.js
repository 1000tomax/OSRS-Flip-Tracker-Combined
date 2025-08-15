/**
 * UTILITY FUNCTIONS FOR OSRS FLIP DASHBOARD
 * 
 * This file contains helper functions that are used throughout the application.
 * Think of these as your "toolbox" - reusable functions that handle common tasks
 * like formatting numbers, working with dates, and categorizing items.
 * 
 * By centralizing these functions here, we avoid repeating code and ensure
 * consistent behavior across the entire application.
 */

// ============================================================================
// FORMATTING FUNCTIONS
// These functions take raw data and make it human-readable
// ============================================================================

/**
 * Formats large numbers into readable GP (Gold Pieces) format
 * 
 * In RuneScape, gold amounts can get very large, so we abbreviate them:
 * - 1,500 becomes "2K" 
 * - 2,500,000 becomes "3M"
 * - 1,200,000,000 becomes "1.20B"
 * 
 * @param {number} value - The raw GP amount (e.g., 1500000)
 * @returns {string} - Formatted string (e.g., "1.50M")
 * 
 * How it works:
 * 1. Check if the number is >= 1 billion, format as "B"
 * 2. If >= 1 million, format as "M" 
 * 3. If >= 1 thousand, format as "K"
 * 4. Otherwise, just add commas for readability
 */
export function formatGP(value) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + "B";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "K";
  return value?.toLocaleString?.() ?? value;
}

/**
 * Formats a decimal number as a percentage with + or - sign
 * 
 * Used for showing ROI (Return on Investment) and profit margins
 * 
 * @param {number} value - Decimal number (e.g., 0.15 for 15%)
 * @returns {string} - Formatted percentage (e.g., "+15.00%" or "-5.50%")
 * 
 * Example: 0.25 becomes "+25.00%", -0.1 becomes "-10.00%"
 */
export function formatPercent(value) {
  const prefix = value > 0 ? "+" : ""; // Add + sign for positive numbers
  return prefix + value.toFixed(2) + "%";
}

/**
 * Converts minutes into a human-readable time format
 * 
 * Used for showing how long items were held before selling
 * 
 * @param {number} minutes - Time in minutes
 * @returns {string} - Formatted time (e.g., "2h 30m" or "45m")
 * 
 * Examples:
 * - 30 minutes → "30m"
 * - 90 minutes → "1h 30m"
 * - 125 minutes → "2h 5m"
 */
export function formatTime(minutes) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);     // Get whole hours
    const remaining = minutes % 60;             // Get remaining minutes
    return `${hours}h ${remaining}m`;
  }
  return `${Math.max(0, Math.round(minutes))}m`; // Ensure no negative time
}

/**
 * Converts milliseconds to human-readable duration
 * 
 * Similar to formatTime but starts with milliseconds (useful for calculating
 * time differences between two Date objects)
 * 
 * @param {number} ms - Time in milliseconds
 * @returns {string} - Formatted duration (e.g., "1h 23m")
 * 
 * How it works:
 * 1. Convert milliseconds to minutes (divide by 60,000)
 * 2. If less than 60 minutes, show as minutes only
 * 3. Otherwise, break down into hours and minutes
 */
export function formatDuration(ms) {
  const minutes = Math.round(ms / 60000);      // Convert ms to minutes
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);     // Get whole hours
  const remaining = minutes % 60;             // Get remaining minutes
  return `${hours}h ${remaining}m`;
}

/**
 * Formats chart axis labels that use logarithmic scale
 * 
 * When we show data on charts with very large ranges (like profit from 1K to 1B),
 * we use logarithmic scales. This function converts the log values back to readable numbers.
 * 
 * @param {number} v - Logarithmic value (e.g., 6 represents 10^6 = 1,000,000)
 * @returns {string} - Human-readable label (e.g., "1M")
 * 
 * Technical note: Math.pow(10, v) converts log scale back to normal numbers
 */
export function formatAxisTicksPow10(v) {
  const p = Math.pow(10, v);                  // Convert log value to actual number
  if (p >= 1_000_000) return (p / 1_000_000).toFixed(1).replace(/\.0$/, '') + "M";
  if (p >= 1_000) return Math.round(p / 1_000) + "K";
  return Math.round(p);
}

// ============================================================================
// DATA PROCESSING UTILITIES
// Functions for working with daily summary data and filtering
// ============================================================================

/**
 * Determines if a trading day should be considered "incomplete" or "in progress"
 * 
 * This is a critical function used throughout the app to filter out incomplete data
 * from charts and calculations. We only want to include "complete" trading days
 * in our analysis to avoid skewing metrics with partial data.
 * 
 * @param {object} day - A daily summary object with properties like date, flips, day number
 * @param {array} allDays - Array of all daily summaries for context
 * @returns {boolean} - true if the day should be excluded, false if it's complete
 * 
 * Logic:
 * 1. Basic validation: Check if day has required fields (date, flips count)
 * 2. Find the highest day number in the dataset
 * 3. Mark ONLY the latest day as incomplete (still in progress)
 * 4. All previous days are considered "locked" and complete
 * 
 * Why this matters:
 * - If you're on Day 15 but only made 2 flips so far today, Day 15 is incomplete
 * - Day 14 and earlier are complete and safe to include in statistics
 * - This prevents partial days from skewing your averages and ETA calculations
 */
export function isIncompleteDay(day, allDays) {
  // Basic validation - must have core data
  if (!day || !day.date || typeof day.flips !== 'number') {
    return true; // Missing data = incomplete
  }

  try {
    // Find the highest day number in the dataset
    const maxDay = allDays && allDays.length > 0
      ? Math.max(...allDays.map(d => d.day || 0))
      : day.day || 0;

    // Only mark the LATEST day as incomplete
    // Once a newer day exists, all previous days are locked and complete
    if (day.day === maxDay) {
      return true; // Latest day is always considered in progress
    }

    return false; // All previous days are complete
  } catch {
    return true; // If anything goes wrong, err on the side of caution
  }
}

// ============================================================================
// DATE UTILITIES 
// Functions for working with dates in the MM-DD-YYYY format used by the app
// ============================================================================

/**
 * Splits a date string into separate month, day, and year parts
 * 
 * The app uses MM-DD-YYYY format for dates (e.g., "12-25-2023")
 * This function breaks it apart so we can work with individual components
 * 
 * @param {string} dateStr - Date in MM-DD-YYYY format (e.g., "12-25-2023")
 * @returns {object} - Object with month, day, year properties
 * 
 * Example: "12-25-2023" → { month: "12", day: "25", year: "2023" }
 */
export function parseDateParts(dateStr) {
  const [month, day, year] = dateStr.split('-'); // Split on dashes
  return { month, day, year };
}

/**
 * Converts our app's date format to HTML date input format
 * 
 * HTML date inputs expect YYYY-MM-DD format, but our app uses MM-DD-YYYY.
 * This function converts between the two formats.
 * 
 * @param {string} date - Date in MM-DD-YYYY format (e.g., "12-25-2023")
 * @returns {string} - Date in YYYY-MM-DD format (e.g., "2023-12-25")
 * 
 * Why we need this: HTML <input type="date"> only accepts YYYY-MM-DD format
 */
export function dateToInputValue(date) {
  if (!date) return "";                      // Handle empty/null dates
  const [mm, dd, yyyy] = date.split("-");    // Split MM-DD-YYYY
  return `${yyyy}-${mm}-${dd}`;              // Rearrange to YYYY-MM-DD
}

/**
 * Converts HTML date input format back to our app's format
 * 
 * This is the reverse of dateToInputValue - takes YYYY-MM-DD and converts
 * it back to MM-DD-YYYY for use in URLs and throughout the app
 * 
 * @param {string} date - Date in YYYY-MM-DD format (e.g., "2023-12-25")
 * @returns {string} - Date in MM-DD-YYYY format (e.g., "12-25-2023")
 */
export function formatDateForUrl(date) {
  const [yyyy, mm, dd] = date.split("-");    // Split YYYY-MM-DD
  return `${mm}-${dd}-${yyyy}`;              // Rearrange to MM-DD-YYYY
}

/**
 * Adds or subtracts days from a date string
 * 
 * Used for the "Previous Day" and "Next Day" buttons in the flip log viewer
 * 
 * @param {string} dateStr - Date in MM-DD-YYYY format
 * @param {number} days - Number of days to add (positive) or subtract (negative)
 * @returns {string} - New date in MM-DD-YYYY format
 * 
 * Example: addDaysToDate("12-25-2023", 1) → "12-26-2023"
 *          addDaysToDate("12-25-2023", -1) → "12-24-2023"
 * 
 * Technical notes:
 * - JavaScript Date months are 0-indexed (0=January), so we subtract 1 when creating
 * - We add 1 back when formatting the result
 * - padStart ensures we always get 2-digit months/days ("01" not "1")
 */
export function addDaysToDate(dateStr, days) {
  const [mm, dd, yyyy] = dateStr.split('-');          // Parse our format
  const currentDate = new Date(yyyy, mm - 1, dd);     // Create Date object (mm-1 because JS months are 0-indexed)
  const newDate = new Date(currentDate);              // Copy the date
  newDate.setDate(currentDate.getDate() + days);      // Add/subtract days
  
  // Format back to MM-DD-YYYY with leading zeros
  return `${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}-${newDate.getFullYear()}`;
}

// Universe-specific utilities
export function getProfitTier(profit) {
  if (profit > 100_000) return "high";
  if (profit > 20_000) return "good";
  if (profit >= 0) return "small";
  return "loss";
}

export function getTierColors(tier) {
  if (tier === "high") return { color: "#22c55e", strokeColor: "rgba(34,197,94,0.9)" };
  if (tier === "good") return { color: "#eab308", strokeColor: "rgba(234,179,8,0.9)" };
  if (tier === "small") return { color: "#60a5fa", strokeColor: "rgba(96,165,250,0.9)" };
  return { color: "#ef4444", strokeColor: "rgba(239,68,68,0.9)" };
}

export function getCategoryFromName(name = "") {
  const s = name.toLowerCase();
  if (s.includes("rune")) return "Runes";
  if (s.includes("arrow") || s.includes("bolt") || s.includes("dart")) return "Ammunition";
  if (s.includes("bone")) return "Bones";
  if (s.includes("bar") || s.includes("ore")) return "Materials";
  if (s.includes("seed")) return "Seeds";
  if (s.includes("potion")) return "Potions";
  if (s.includes("shark") || s.includes("lobster") || s.includes("karamb")) return "Food";
  if (s.includes("helm") || s.includes("plate") || s.includes("legs") || s.includes("kite")) return "Armor";
  if (s.includes("sword") || s.includes("scim") || s.includes("whip") || s.includes("bow")) return "Weapons";
  if (s.includes("ring") || s.includes("amulet") || s.includes("necklace")) return "Jewelry";
  if (s.includes("staff") || s.includes("wand") || s.includes("tome")) return "Magic";
  if (s.includes("pickaxe") || s.includes("axe")) return "Tools";
  return "Misc";
}

export function getCategoryIcon(category) {
  const icons = {
    Runes: "🔮",
    Ammunition: "🏹",
    Bones: "🦴",
    Materials: "⛏️",
    Seeds: "🌱",
    Potions: "🧪",
    Food: "🍖",
    Armor: "🛡️",
    Weapons: "⚔️",
    Jewelry: "💍",
    Magic: "✨",
    Tools: "🧰",
    Misc: "📦"
  };
  return icons[category] || "📦";
}

export function getCategoryColors(category) {
  const palette = {
    Runes: "#a78bfa",
    Ammunition: "#60a5fa",
    Bones: "#94a3b8",
    Materials: "#f97316",
    Seeds: "#22c55e",
    Potions: "#14b8a6",
    Food: "#f59e0b",
    Armor: "#64748b",
    Weapons: "#ef4444",
    Jewelry: "#e879f9",
    Magic: "#38bdf8",
    Tools: "#84cc16",
    Misc: "#cbd5e1"
  };
  const color = palette[category] || "#60a5fa";
  return { color, strokeColor: color };
}

export function lerpColor(a, b, c, t) {
  const mix = (x, y, t) => Math.round(x + (y - x) * t);
  if (t <= 0.5) {
    const tt = t / 0.5;
    return { r: mix(a.r, b.r, tt), g: mix(a.g, b.g, tt), b: mix(a.b, b.b, tt) };
  }
  const tt = (t - 0.5) / 0.5;
  return { r: mix(b.r, c.r, tt), g: mix(b.g, c.g, tt), b: mix(b.b, c.b, tt) };
}

export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));  // First apply max, then min
}

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * This utils.js file is the "toolbox" of the OSRS Flip Dashboard.
 * 
 * Key concepts to understand:
 * 
 * 1. **Formatting Functions**: Convert raw numbers/data into human-readable text
 *    - formatGP(): 1500000 → "1.50M"
 *    - formatPercent(): 0.25 → "+25.00%"
 *    - formatTime(): 90 → "1h 30m"
 * 
 * 2. **Date Functions**: Handle converting between different date formats
 *    - App format: MM-DD-YYYY ("12-25-2023")
 *    - HTML format: YYYY-MM-DD ("2023-12-25")
 *    - These functions convert between formats as needed
 * 
 * 3. **Category Functions**: Automatically organize OSRS items
 *    - getCategoryFromName(): Guess item type from name
 *    - getCategoryIcon(): Show emoji for each category
 *    - getCategoryColors(): Assign colors for charts
 * 
 * 4. **Visualization Functions**: Support charts and data displays
 *    - getProfitTier(): Group items by profit level
 *    - lerpColor(): Create smooth color transitions
 *    - clamp(): Keep numbers within valid ranges
 * 
 * By centralizing these functions here, we ensure consistent behavior
 * throughout the app and avoid repeating code. Any page or component
 * can import and use these utilities.
 */