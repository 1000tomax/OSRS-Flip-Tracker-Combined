/**
 * OSRS Item Icon Utilities
 * 
 * Handles fetching and caching of OSRS item icons from the Wiki.
 * Uses localStorage for persistent caching to improve performance.
 */

// Cache configuration
const CACHE_KEY_PREFIX = 'osrs_icon_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const FAILED_CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day for failed fetches

// Known item name mappings where Wiki uses different names
const ITEM_NAME_MAPPINGS = {
  // Seeds typically use _5 variant (without _detail)
  'Snapdragon seed': 'Snapdragon_seed_5',
  'Ranarr seed': 'Ranarr_seed_5', 
  'Torstol seed': 'Torstol_seed_5',
  'Lantadyme seed': 'Lantadyme_seed_5',
  'Dwarf weed seed': 'Dwarf_weed_seed_5',
  'Cadantine seed': 'Cadantine_seed_5',
  'Avantoe seed': 'Avantoe_seed_5',
  'Kwuarm seed': 'Kwuarm_seed_5',
  'Irit seed': 'Irit_seed_5',
  'Toadflax seed': 'Toadflax_seed_5',
  'Guam seed': 'Guam_seed_5',
  
  // Darts and projectiles
  'Atlatl dart': 'Atlatl_dart_5',
  
  // Items with charges use base image
  'Ring of dueling(8)': 'Ring_of_dueling',
  'Ring of wealth (5)': 'Ring_of_wealth',
  'Amulet of glory(6)': 'Amulet_of_glory',
  'Combat bracelet(6)': 'Combat_bracelet',
  'Burning amulet(5)': 'Burning_amulet',
  'Waterskin(4)': 'Waterskin',
  
  // Teleport tablets (these typically don't use _detail)
  'Teleport to house': 'Teleport_to_house_(tablet)',
  'Varrock teleport': 'Varrock_teleport_(tablet)',
  'Ardougne teleport': 'Ardougne_teleport_(tablet)',
  'Falador teleport': 'Falador_teleport_(tablet)',
  'Lumbridge teleport': 'Lumbridge_teleport_(tablet)',
  'Camelot teleport': 'Camelot_teleport_(tablet)',
  'Watchtower teleport': 'Watchtower_teleport_(tablet)',
  
  // Special arrows (use _5 variant)
  'Dragon arrow(p++)': 'Dragon_arrow%28p%2B%2B%29_5',
  'Dragon arrow(p+)': 'Dragon_arrow%28p%2B%29_5',
  
  // Newer items that use numbered variants
  'Sunfire splinters': 'Sunfire_splinters_1',
  'Sunlight antler bolts': 'Sunlight_antler_bolts',
  'Moonlight antler bolts': 'Moonlight_antler_bolts',
  'Calcified moth': 'Calcified_moth_1',
  'Crushed infernal shale': 'Crushed_infernal_shale_1',
  'Zombie pirate key': 'Zombie_pirate_key_1',
  
  // Spell tablets
  'Bones to peaches': 'Bones_to_peaches_%28tablet%29',
};

/**
 * Convert item name to Wiki URL format
 * @param {string} itemName - The item name to convert
 * @returns {string} - Formatted item name for Wiki URL
 */
function formatItemNameForWiki(itemName) {
  if (!itemName) return '';
  
  // Check for known mappings first
  if (ITEM_NAME_MAPPINGS[itemName]) {
    return ITEM_NAME_MAPPINGS[itemName];
  }
  
  // Trim and handle basic formatting
  let formattedName = itemName.trim();
  
  // Standard formatting: replace spaces with underscores and encode special chars
  // Note: The Wiki uses underscores for spaces and URL encoding for special characters
  return formattedName
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/'/g, '%27') // URL encode apostrophes (e.g., Fenkenstrain's)
    .replace(/\(/g, '%28') // URL encode opening parentheses
    .replace(/\)/g, '%29') // URL encode closing parentheses
    .replace(/\+/g, '%2B'); // URL encode plus signs (e.g., p+ and p++)
}

/**
 * Generate Wiki icon URL for an item
 * @param {string} itemName - The item name
 * @param {boolean} useDetailVersion - Whether to use detail version (default: true)
 * @returns {string} - The Wiki icon URL
 */
export function getItemIconUrl(itemName, useDetailVersion = true) {
  const formattedName = formatItemNameForWiki(itemName);
  // Using the detail version for better quality at small sizes
  const suffix = useDetailVersion ? '_detail.png' : '.png';
  return `https://oldschool.runescape.wiki/images/${formattedName}${suffix}`;
}

/**
 * Generate multiple possible Wiki icon URLs for an item
 * @param {string} itemName - The item name
 * @returns {string[]} - Array of possible Wiki icon URLs
 */
export function getPossibleIconUrls(itemName) {
  if (!itemName) return [];
  
  const urls = [];
  const formattedName = formatItemNameForWiki(itemName);
  
  // Many items have numbered variations on the Wiki
  // Seeds often use _5, darts use _5, etc.
  const variations = [];
  
  // Check if it's a known item type that uses numbers
  const needsNumber = 
    itemName.includes('seed') ||
    itemName.includes('dart') ||
    itemName.includes('arrow') ||
    itemName.includes('bolt') ||
    itemName.includes('splinters');
  
  // Check if it's a teleport tablet
  const isTeleport = itemName.includes('teleport') || 
                     itemName.includes('Teleport');
  
  // For items with charges/doses in parentheses, remove them for base image
  const baseNameMatch = itemName.match(/^([^(]+)(?:\(\d+\))?$/);
  const baseName = baseNameMatch ? baseNameMatch[1].trim() : itemName;
  const formattedBaseName = formatItemNameForWiki(baseName);
  
  // Standard variations to try
  variations.push(formattedName); // Original name
  variations.push(formattedBaseName); // Without parentheses
  
  if (isTeleport) {
    // Teleport tablets use _(tablet) suffix
    variations.push(`${formattedBaseName}_%28tablet%29`);
  }
  
  if (needsNumber) {
    // Try with common number suffixes for these item types
    variations.push(`${formattedBaseName}_5`);
    variations.push(`${formattedBaseName}_1`);
  }
  
  // For each variation, try different suffixes
  // Order matters - we'll try these in sequence
  variations.forEach(variant => {
    // If it ends with a number (like _5), try without _detail first
    if (variant.match(/_\d+$/)) {
      urls.push(`https://oldschool.runescape.wiki/images/${variant}.png`);
      urls.push(`https://oldschool.runescape.wiki/images/${variant}_detail.png`);
    } else {
      // Most regular items use _detail.png
      urls.push(`https://oldschool.runescape.wiki/images/${variant}_detail.png`);
      urls.push(`https://oldschool.runescape.wiki/images/${variant}.png`);
    }
  });
  
  // Remove duplicates while preserving order
  return [...new Set(urls)];
}

/**
 * Check if a cached icon entry is still valid
 * @param {object} cacheEntry - The cache entry to check
 * @returns {boolean} - Whether the cache is still valid
 */
function isCacheValid(cacheEntry) {
  if (!cacheEntry || !cacheEntry.timestamp) return false;
  
  const now = Date.now();
  const age = now - cacheEntry.timestamp;
  
  // Use different cache duration for successful vs failed fetches
  const maxAge = cacheEntry.failed ? FAILED_CACHE_DURATION : CACHE_DURATION;
  
  return age < maxAge;
}

/**
 * Get cached icon URL if available and valid
 * @param {string} itemName - The item name
 * @returns {string|null} - Cached URL or null if not cached/expired
 */
export function getCachedIconUrl(itemName) {
  try {
    const cacheKey = CACHE_KEY_PREFIX + itemName.toLowerCase();
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const cacheEntry = JSON.parse(cached);
    
    if (isCacheValid(cacheEntry)) {
      return cacheEntry.failed ? null : cacheEntry.url;
    }
    
    // Remove expired cache
    localStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.error('Error reading icon cache:', error);
    return null;
  }
}

/**
 * Cache an icon URL
 * @param {string} itemName - The item name
 * @param {string} url - The icon URL to cache
 * @param {boolean} failed - Whether the fetch failed
 */
export function cacheIconUrl(itemName, url, failed = false) {
  try {
    const cacheKey = CACHE_KEY_PREFIX + itemName.toLowerCase();
    const cacheEntry = {
      url,
      timestamp: Date.now(),
      failed
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch (error) {
    // Handle localStorage quota exceeded or other errors
    console.error('Error caching icon URL:', error);
    
    // Try to clear old cache entries if storage is full
    if (error.name === 'QuotaExceededError') {
      clearOldIconCache();
    }
  }
}

/**
 * Clear old icon cache entries to free up space
 */
export function clearOldIconCache() {
  try {
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          if (!isCacheValid(cached)) {
            localStorage.removeItem(key);
          }
        } catch {
          // Remove invalid entries
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Error clearing old icon cache:', error);
  }
}

/**
 * Clear all icon cache entries (useful for debugging)
 */
export function clearAllIconCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('Icon cache cleared');
  } catch (error) {
    console.error('Error clearing icon cache:', error);
  }
}

/**
 * Preload an image to check if it exists
 * @param {string} url - The image URL to preload
 * @returns {Promise<boolean>} - Whether the image loaded successfully
 */
export function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    
    // Set up event handlers
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    
    // For Wiki images, we need to actually test them
    // The browser can load them despite CORS
    img.src = url;
  });
}

/**
 * Get icon URL with caching and validation
 * @param {string} itemName - The item name
 * @returns {Promise<string|null>} - The icon URL or null if not found
 */
export async function getValidatedIconUrl(itemName) {
  if (!itemName) return null;
  
  // Check cache first
  const cached = getCachedIconUrl(itemName);
  if (cached !== null) return cached;
  
  // Try multiple possible URLs
  const possibleUrls = getPossibleIconUrls(itemName);
  
  for (const url of possibleUrls) {
    const isValid = await preloadImage(url);
    if (isValid) {
      cacheIconUrl(itemName, url, false);
      return url;
    }
  }
  
  // None of the URLs worked, cache the failure
  cacheIconUrl(itemName, '', true);
  return null;
}

/**
 * Batch fetch multiple item icons
 * @param {string[]} itemNames - Array of item names
 * @returns {Promise<Map<string, string|null>>} - Map of item names to URLs
 */
export async function batchFetchIcons(itemNames) {
  const results = new Map();
  
  // Process in parallel but with a limit to avoid overwhelming the server
  const batchSize = 10;
  for (let i = 0; i < itemNames.length; i += batchSize) {
    const batch = itemNames.slice(i, i + batchSize);
    const promises = batch.map(async (itemName) => {
      const url = await getValidatedIconUrl(itemName);
      results.set(itemName, url);
    });
    
    await Promise.all(promises);
  }
  
  return results;
}

// Clean up old cache entries on module load
clearOldIconCache();