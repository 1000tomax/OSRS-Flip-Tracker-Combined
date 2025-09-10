import Fuse from 'fuse.js';

// Common OSRS abbreviations and their full names
const OSRS_ABBREVIATIONS = {
  // Weapons
  dscim: 'dragon scimitar',
  'd scim': 'dragon scimitar',
  whip: 'abyssal whip',
  'tent whip': 'tentacle',
  dds: 'dragon dagger',
  ags: 'armadyl godsword',
  bgs: 'bandos godsword',
  sgs: 'saradomin godsword',
  zgs: 'zamorak godsword',
  dfs: 'dragonfire shield',
  dfw: 'dragon fire ward',

  // Armor
  bcp: 'bandos chestplate',
  tassets: 'bandos tassets',
  'bandos legs': 'bandos tassets',
  'arma helm': 'armadyl helmet',
  'arma chest': 'armadyl chestplate',
  'arma legs': 'armadyl chainskirt',
  'ancestral hat': 'ancestral hat',
  'ancestral robe': 'ancestral robe top',
  'ancestral bottom': 'ancestral robe bottom',

  // Jewelry & Accessories
  fury: 'amulet of fury',
  torture: 'amulet of torture',
  anguish: 'necklace of anguish',
  occult: 'occult necklace',
  'ring of wealth': 'ring of wealth',
  'berserker ring': 'berserker ring',
  'archer ring': 'archers ring',
  'warrior ring': 'warrior ring',
  'seers ring': 'seers ring',

  // Boots & Gloves
  prims: 'primordial boots',
  pegs: 'pegasian boots',
  eternals: 'eternal boots',
  'barrows gloves': 'barrows gloves',
  'd boots': 'dragon boots',

  // Potions & Consumables
  'super combat': 'super combat potion',
  'ranging pot': 'ranging potion',
  'magic pot': 'magic potion',
  'pray pot': 'prayer potion',
  'super restore': 'super restore',
  'sara brew': 'saradomin brew',
  karambwan: 'cooked karambwan',

  // Resources & Materials
  'pure ess': 'pure essence',
  essence: 'pure essence',
  coal: 'coal',
  'iron ore': 'iron ore',
  'gold ore': 'gold ore',
  'rune ore': 'runite ore',
  'adamant ore': 'adamantite ore',
  'mith ore': 'mithril ore',

  // Runes
  nat: 'nature rune',
  nats: 'nature rune',
  law: 'law rune',
  laws: 'law rune',
  death: 'death rune',
  deaths: 'death rune',
  blood: 'blood rune',
  soul: 'soul rune',
  wrath: 'wrath rune',

  // Common typos and variations
  scimitar: 'scimitar',
  scim: 'scimitar',
  godsword: 'godsword',
  gs: 'godsword',
  chestplate: 'chestplate',
  platebody: 'platebody',
  legs: 'platelegs',
  skirt: 'plateskirt',
};

// Character normalization mappings for OSRS items
const CHARACTER_NORMALIZATIONS = {
  // Apostrophes and quotes
  "'": ["'", "'", "'", '`'],
  // Parentheses variations
  '(': ['(', '（'],
  ')': [')', '）'],
  // Dash variations
  '-': ['-', '–', '—', '_'],
  // Ampersand
  and: ['&', '+'],
  // Common replacements
  ii: ['2', 'II'],
  iii: ['3', 'III'],
  iv: ['4', 'IV'],
  v: ['5', 'V'],
};

// Special OSRS item name patterns
const OSRS_NAME_PATTERNS = {
  // Barrows items (handle apostrophe variations)
  ahrims: "ahrim's",
  dharoks: "dharok's",
  guthans: "guthan's",
  karils: "karil's",
  torags: "torag's",
  veracs: "verac's",

  // Parenthetical items
  'dragon claws spec': 'dragon claws (spec)',
  'bandos godsword spec': 'bandos godsword (spec)',

  // Common shortened forms
  'crystal bow': 'crystal bow (full)',
  'crystal shield': 'crystal shield (full)',
  'slayer helmet': 'slayer helmet (i)',
  'serpentine helm': 'serpentine helmet',
  blowpipe: 'toxic blowpipe',

  // Sets and variations
  'dharoks set': "dharok's set",
  'guthans set': "guthan's set",
  'full dharoks': "dharok's set",
  'full guthans': "guthan's set",

  // Degraded items
  'barrows gloves': 'barrows gloves',
  'void knight': 'void knight',
  'elite void': 'elite void',
};

// Fuse.js configuration for item searching
const FUSE_CONFIG = {
  keys: ['name', 'normalized'],
  includeScore: true,
  threshold: 0.4, // Slightly more lenient for character variations
  distance: 100,
  minMatchCharLength: 2,
  shouldSort: true,
  findAllMatches: false,
  location: 0,
  useExtendedSearch: true,
};

class ItemFuzzySearch {
  constructor() {
    this.itemsList = [];
    this.fuse = null;
    this.initialized = false;
  }

  // Normalize item names for better matching
  normalizeItemName(itemName) {
    let normalized = itemName.toLowerCase().trim();

    // Remove common prefixes/suffixes that don't affect matching
    normalized = normalized.replace(/^(a|an|the)\s+/i, '');

    // Normalize apostrophes and quotes
    normalized = normalized.replace(/['`'']/g, '');

    // Normalize dashes and underscores
    normalized = normalized.replace(/[-–—_]/g, ' ');

    // Normalize parentheses and brackets
    normalized = normalized.replace(/[()[\]{}]/g, '');

    // Normalize ampersands
    normalized = normalized.replace(/\s*&\s*/g, ' and ');

    // Normalize multiple spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Apply OSRS-specific patterns
    for (const [pattern, replacement] of Object.entries(OSRS_NAME_PATTERNS)) {
      if (normalized.includes(pattern.toLowerCase())) {
        normalized = normalized.replace(pattern.toLowerCase(), replacement.toLowerCase());
      }
    }

    return normalized;
  }

  // Create variations of an item name for better matching
  createItemVariations(itemName) {
    const variations = new Set();
    const original = itemName.toLowerCase();
    const normalized = this.normalizeItemName(itemName);

    variations.add(original);
    variations.add(normalized);

    // Add version without apostrophes
    variations.add(original.replace(/['`'']/g, ''));

    // Add version with common character substitutions
    let withSubstitutions = original;
    for (const [normalized, chars] of Object.entries(CHARACTER_NORMALIZATIONS)) {
      for (const char of chars) {
        withSubstitutions = withSubstitutions.replace(new RegExp(`\\${char}`, 'g'), normalized);
      }
    }
    variations.add(withSubstitutions);

    // Add barrows variations (with and without apostrophes)
    const barrowsBrothers = ['ahrim', 'dharok', 'guthan', 'karil', 'torag', 'verac'];
    for (const brother of barrowsBrothers) {
      if (original.includes(brother)) {
        variations.add(original.replace(brother, `${brother}s`));
        variations.add(original.replace(`${brother}s`, brother));
        variations.add(original.replace(brother, `${brother}'s`));
        variations.add(original.replace(`${brother}'s`, `${brother}s`));
      }
    }

    return Array.from(variations);
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Load item names from the existing item-stats.csv
      const response = await fetch('/data/item-stats.csv');
      const text = await response.text();
      const lines = text.trim().split('\n');

      // Skip header, extract item names
      this.itemsList = [];
      for (let i = 1; i < lines.length; i++) {
        const itemName = lines[i].split(',')[0];
        if (itemName) {
          const variations = this.createItemVariations(itemName);
          this.itemsList.push({
            name: itemName,
            normalized: this.normalizeItemName(itemName),
            variations,
          });
        }
      }

      // Initialize Fuse.js with the items
      this.fuse = new Fuse(this.itemsList, FUSE_CONFIG);
      this.initialized = true;
      console.log(`🔍 ItemFuzzySearch initialized with ${this.itemsList.length} items`);
    } catch (error) {
      console.error('Failed to initialize ItemFuzzySearch:', error);
    }
  }

  // Expand abbreviations in a query string
  expandAbbreviations(query) {
    let expandedQuery = query.toLowerCase();

    // First apply character normalization
    expandedQuery = this.normalizeItemName(expandedQuery);

    // Sort abbreviations by length (longest first) to avoid partial replacements
    const sortedAbbrevs = Object.entries(OSRS_ABBREVIATIONS).sort(
      ([a], [b]) => b.length - a.length
    );

    for (const [abbrev, fullName] of sortedAbbrevs) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      expandedQuery = expandedQuery.replace(regex, fullName);
    }

    // Apply OSRS name patterns
    for (const [pattern, replacement] of Object.entries(OSRS_NAME_PATTERNS)) {
      const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      expandedQuery = expandedQuery.replace(regex, replacement);
    }

    return expandedQuery;
  }

  // Find fuzzy matches for a query
  findMatches(query, maxResults = 5) {
    if (!this.initialized || !this.fuse) {
      console.warn('ItemFuzzySearch not initialized');
      return [];
    }

    // Normalize and expand the query
    const normalizedQuery = this.normalizeItemName(query);
    const expandedQuery = this.expandAbbreviations(query);

    // Search with multiple query variations
    const queries = [normalizedQuery, expandedQuery, query.toLowerCase()];
    const allResults = new Map(); // Use Map to dedupe by item name

    for (const searchQuery of queries) {
      const results = this.fuse.search(searchQuery, { limit: maxResults * 2 });

      for (const result of results) {
        const itemName = result.item.name;
        if (!allResults.has(itemName) || result.score < allResults.get(itemName).score) {
          allResults.set(itemName, {
            item: itemName,
            score: result.score,
            confidence: Math.max(0, (1 - result.score) * 100), // Convert to percentage
          });
        }
      }
    }

    // Sort by score and return top results
    return Array.from(allResults.values())
      .sort((a, b) => a.score - b.score)
      .slice(0, maxResults);
  }

  // Extract potential item names from a query string
  extractItemHints(query) {
    const potentialItems = [];
    const words = query.toLowerCase().split(/\s+/);

    // Check for abbreviations (including normalized versions)
    for (const word of words) {
      const normalizedWord = this.normalizeItemName(word);

      if (OSRS_ABBREVIATIONS[word]) {
        potentialItems.push({
          original: word,
          expanded: OSRS_ABBREVIATIONS[word],
          type: 'abbreviation',
        });
      } else if (OSRS_ABBREVIATIONS[normalizedWord]) {
        potentialItems.push({
          original: word,
          expanded: OSRS_ABBREVIATIONS[normalizedWord],
          type: 'abbreviation',
        });
      }
    }

    // Check for OSRS name patterns
    const normalizedQuery = this.normalizeItemName(query);
    for (const [pattern, replacement] of Object.entries(OSRS_NAME_PATTERNS)) {
      if (normalizedQuery.includes(pattern.toLowerCase())) {
        potentialItems.push({
          original: pattern,
          expanded: replacement,
          type: 'pattern',
        });
      }
    }

    // Look for fuzzy item matches
    const matches = this.findMatches(query, 3);

    matches.forEach(match => {
      if (match.confidence > 50) {
        // Slightly lower threshold for better suggestions
        // Don't duplicate if we already have this exact match
        const isDuplicate = potentialItems.some(
          item => item.expanded.toLowerCase() === match.item.toLowerCase()
        );

        if (!isDuplicate) {
          potentialItems.push({
            original: query.trim(),
            expanded: match.item,
            confidence: match.confidence,
            type: 'fuzzy',
          });
        }
      }
    });

    return potentialItems;
  }

  // Generate SQL LIKE patterns for an item query
  generateSQLPatterns(itemName) {
    const patterns = [];
    const normalized = this.normalizeItemName(itemName);
    const expanded = this.expandAbbreviations(itemName);

    // Add the expanded name
    patterns.push(`item LIKE '%${expanded}%'`);

    // Add the normalized version if different
    if (normalized !== expanded && normalized !== itemName.toLowerCase()) {
      patterns.push(`item LIKE '%${normalized}%'`);
    }

    // Add the original if different from both
    if (itemName.toLowerCase() !== expanded && itemName.toLowerCase() !== normalized) {
      patterns.push(`item LIKE '%${itemName}%'`);
    }

    // Add character variations for special cases
    const variations = this.createItemVariations(itemName);
    variations.slice(0, 3).forEach(variation => {
      // Limit to prevent too many patterns
      if (!patterns.some(p => p.includes(variation))) {
        patterns.push(`item LIKE '%${variation}%'`);
      }
    });

    // Add fuzzy matches
    const matches = this.findMatches(expanded, 2);
    matches.forEach(match => {
      if (match.confidence > 60) {
        const matchPattern = `item LIKE '%${match.item}%'`;
        if (!patterns.includes(matchPattern)) {
          patterns.push(matchPattern);
        }
      }
    });

    return patterns;
  }
}

// Export singleton instance
export const itemFuzzySearch = new ItemFuzzySearch();

// Export the class for testing
export { ItemFuzzySearch, OSRS_ABBREVIATIONS, OSRS_NAME_PATTERNS, CHARACTER_NORMALIZATIONS };
