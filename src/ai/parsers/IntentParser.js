import { itemFuzzySearch } from '../../lib/itemFuzzySearch.js';

/**
 * Rule-based intent parser for common OSRS flip analysis queries
 */
export class IntentParser {
  constructor() {
    this.patterns = null;
    this.extractionPatterns = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const response = await fetch('/ai-config/query-patterns.json');
      const data = await response.json();

      this.patterns = data.patterns;
      this.extractionPatterns = data.extractionPatterns;
      this.initialized = true;

      console.log('✅ IntentParser initialized');
    } catch (error) {
      console.error('Failed to initialize IntentParser:', error);
      throw error;
    }
  }

  /**
   * Parse user query and extract intent with components
   */
  async parse(userQuery, _conversationContext = []) {
    if (!this.initialized) {
      throw new Error('IntentParser not initialized');
    }

    const normalizedQuery = userQuery.toLowerCase().trim();

    // Step 1: Extract basic components using rules
    const components = await this.extractComponents(normalizedQuery);

    // Step 2: Determine intent from patterns
    const intentResult = this.classifyIntent(normalizedQuery, components);

    // Step 3: Calculate confidence score
    const confidence = this.calculateConfidence(intentResult, components, normalizedQuery);

    return {
      intent: intentResult.intent,
      components,
      confidence,
      originalQuery: userQuery,
      normalizedQuery,
    };
  }

  /**
   * Extract query components using rule-based patterns
   */
  async extractComponents(query) {
    const components = {
      timeRange: null,
      items: [],
      metrics: [],
      dimensions: [],
      filters: [],
      limits: null,
      sortBy: null,
      sortOrder: 'desc',
      modifiers: {},
    };

    // Extract time ranges
    components.timeRange = this.extractTimeRange(query);

    // Extract item references
    components.items = await this.extractItems(query);

    // Extract metrics
    components.metrics = this.extractMetrics(query);

    // Extract dimensions/groupings
    components.dimensions = this.extractDimensions(query);

    // Extract filters (profit thresholds, ROI, duration, etc.)
    components.filters = this.extractFilters(query);

    // Extract limits
    components.limits = this.extractLimits(query);

    // Extract sorting preferences
    const sortInfo = this.extractSorting(query);
    components.sortBy = sortInfo.by;
    components.sortOrder = sortInfo.order;

    // Extract modifiers (exclude, only, etc.)
    components.modifiers = this.extractModifiers(query);

    return components;
  }

  extractTimeRange(query) {
    // Check for preset time ranges
    for (const [preset, patterns] of Object.entries(this.extractionPatterns.timeRanges)) {
      for (const pattern of patterns) {
        if (query.includes(pattern)) {
          return { preset };
        }
      }
    }

    // Check for specific days of week
    for (const [day, patterns] of Object.entries(this.extractionPatterns.dayOfWeek)) {
      for (const pattern of patterns) {
        if (query.includes(pattern)) {
          // Distinguish between "last monday" and "monday flips"
          if (query.includes(`last ${pattern}`)) {
            return { dayOfWeek: day, specific: true };
          } else if (query.includes(`${pattern} flips`) || query.includes(`${pattern}s`)) {
            return { dayOfWeek: day, all: true };
          }
        }
      }
    }

    // Check for time comparisons
    for (const [comparison, config] of Object.entries(this.extractionPatterns.timeComparisons)) {
      for (const pattern of config.patterns) {
        if (query.includes(pattern)) {
          return { comparison };
        }
      }
    }

    // Check for custom date ranges (YYYY-MM-DD format)
    const dateRangeMatch = query.match(
      /(\d{4}-\d{2}-\d{2})\s*(?:to|through|until)\s*(\d{4}-\d{2}-\d{2})/
    );
    if (dateRangeMatch) {
      return {
        from: dateRangeMatch[1],
        to: dateRangeMatch[2],
      };
    }

    return null;
  }

  async extractItems(query) {
    // Use existing fuzzy search to extract item hints
    const itemHints = itemFuzzySearch.extractItemHints(query);
    return itemHints.map(hint => hint.expanded);
  }

  extractMetrics(query) {
    const metrics = [];

    // Profit-related
    if (
      query.includes('profit') ||
      query.includes('money') ||
      query.includes('gp') ||
      query.includes('earnings')
    ) {
      metrics.push('profit');
    }

    // ROI-related
    if (
      query.includes('roi') ||
      query.includes('return') ||
      query.includes('percentage') ||
      query.includes('%')
    ) {
      metrics.push('roi');
    }

    // Count-related
    if (
      query.includes('count') ||
      query.includes('number') ||
      query.includes('how many') ||
      query.includes('flips')
    ) {
      metrics.push('flips');
    }

    // Volume-related
    if (query.includes('volume') || query.includes('invested') || query.includes('spent')) {
      metrics.push('volume');
    }

    // Time-related
    if (
      query.includes('time') ||
      query.includes('duration') ||
      query.includes('hold') ||
      query.includes('held')
    ) {
      metrics.push('avg_hold_time');
    }

    return metrics;
  }

  extractDimensions(query) {
    const dimensions = [];

    // Item grouping
    if (query.includes('by item') || query.includes('per item') || query.includes('each item')) {
      dimensions.push('item');
    }

    // Date grouping
    if (
      query.includes('by date') ||
      query.includes('daily') ||
      query.includes('per day') ||
      query.includes('each day')
    ) {
      dimensions.push('date');
    }

    // Account grouping
    if (
      query.includes('by account') ||
      query.includes('per account') ||
      query.includes('each account')
    ) {
      dimensions.push('account');
    }

    // Time period grouping
    if (query.includes('vs') || query.includes('compare') || query.includes('versus')) {
      dimensions.push('time_period');
    }

    return dimensions;
  }

  extractFilters(query) {
    const filters = [];

    // Profit thresholds
    const profitPatterns = this.extractionPatterns.profitThresholds.patterns;
    for (const pattern of profitPatterns) {
      const match = query.match(new RegExp(pattern.regex, 'i'));
      if (match) {
        const amount = this.parseAmount(match[1], pattern.multipliers);
        filters.push({
          field: 'profit',
          operator: '>',
          value: amount,
        });
      }
    }

    // ROI thresholds
    const roiPatterns = this.extractionPatterns.roiThresholds.patterns;
    for (const pattern of roiPatterns) {
      const match = query.match(new RegExp(pattern.regex, 'i'));
      if (match) {
        filters.push({
          field: 'roi',
          operator: '>',
          value: parseInt(match[pattern.group]),
        });
      }
    }

    // Duration thresholds
    const durationPatterns = this.extractionPatterns.durationThresholds.patterns;
    for (const pattern of durationPatterns) {
      const match = query.match(new RegExp(pattern.regex, 'i'));
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const minutes = value * pattern.conversions[unit];

        filters.push({
          field: 'flip_duration_minutes',
          operator: '>',
          value: minutes,
        });
      }
    }

    // Profit/loss filters
    if (
      query.includes('profitable') ||
      query.includes('positive') ||
      query.includes('successful')
    ) {
      filters.push({
        field: 'profit',
        operator: '>',
        value: 0,
      });
    }

    if (query.includes('loss') || query.includes('negative') || query.includes('losing')) {
      filters.push({
        field: 'profit',
        operator: '<',
        value: 0,
      });
    }

    return filters;
  }

  extractLimits(query) {
    const limitPatterns = this.extractionPatterns.limits.patterns;

    for (const pattern of limitPatterns) {
      const match = query.match(new RegExp(pattern.regex, 'i'));
      if (match) {
        return parseInt(match[pattern.group]);
      }
    }

    // Check for "all" or "show all"
    if (
      query.includes('show all') ||
      query.includes('all results') ||
      query.includes('everything')
    ) {
      return null; // No limit
    }

    return null;
  }

  extractSorting(query) {
    // Default sorting
    let sortBy = null;
    let order = 'desc';

    // Explicit sort patterns
    if (query.includes('sort by profit') || query.includes('by profit')) {
      sortBy = 'profit';
    } else if (query.includes('sort by roi') || query.includes('by roi')) {
      sortBy = 'roi';
    } else if (query.includes('sort by date') || query.includes('by date')) {
      sortBy = 'date';
    } else if (query.includes('sort by time') || query.includes('by duration')) {
      sortBy = 'flip_duration_minutes';
    } else if (query.includes('sort by count') || query.includes('by count')) {
      sortBy = 'flip_count';
    }

    // Order indicators
    if (query.includes('ascending') || query.includes('lowest') || query.includes('smallest')) {
      order = 'asc';
    }

    return { by: sortBy, order };
  }

  extractModifiers(query) {
    const modifiers = {};

    // Exclusions
    if (query.includes('exclude') || query.includes('without') || query.includes('not')) {
      modifiers.exclude = this.extractExclusions(query);
    }

    // Inclusions
    if (query.includes('only') || query.includes('just')) {
      modifiers.include = this.extractInclusions(query);
    }

    // Profitability filter
    if (query.includes('only profitable') || query.includes('profitable only')) {
      modifiers.onlyProfitable = true;
    }

    return modifiers;
  }

  extractExclusions(query) {
    const exclusions = [];

    // Common exclusion patterns
    if (query.includes('exclude ammo') || query.includes('without ammo')) {
      exclusions.push('ammo');
    }
    if (query.includes('exclude armor') || query.includes('without armor')) {
      exclusions.push('armor');
    }
    if (query.includes('exclude weapons') || query.includes('without weapons')) {
      exclusions.push('weapons');
    }

    return exclusions;
  }

  extractInclusions(query) {
    const inclusions = [];

    // Common inclusion patterns
    if (query.includes('only weapons')) {
      inclusions.push('weapons');
    }
    if (query.includes('only armor')) {
      inclusions.push('armor');
    }

    return inclusions;
  }

  /**
   * Classify intent based on query patterns
   */
  classifyIntent(query, components) {
    let bestMatch = null;
    let bestScore = 0;

    // Check each pattern for matches
    for (const [key, pattern] of Object.entries(this.patterns)) {
      const score = this.calculatePatternScore(query, pattern, components);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          intent: pattern.intent,
          pattern: key,
          score,
        };
      }
    }

    // Fallback intent classification
    if (!bestMatch || bestScore < 0.5) {
      bestMatch = this.classifyFallbackIntent(query, components);
    }

    return bestMatch;
  }

  calculatePatternScore(query, pattern, components) {
    let score = 0;
    let totalChecks = 0;

    // Check example matches
    for (const example of pattern.examples) {
      totalChecks++;
      if (this.queryMatchesExample(query, example)) {
        score += 1;
      }
    }

    // Check required components
    if (pattern.requiresItemFilter) {
      totalChecks++;
      if (components.items && components.items.length > 0) {
        score += 1;
      }
    }

    if (pattern.requiresTimeComparison) {
      totalChecks++;
      if (components.timeRange && components.timeRange.comparison) {
        score += 1;
      }
    }

    if (pattern.requiresDurationFilter) {
      totalChecks++;
      const hasDurationFilter = components.filters.some(f => f.field === 'flip_duration_minutes');
      if (hasDurationFilter) {
        score += 1;
      }
    }

    return totalChecks > 0 ? score / totalChecks : 0;
  }

  queryMatchesExample(query, example) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const exampleWords = example.toLowerCase().split(/\s+/);

    // Calculate word overlap with more generous matching
    const overlap = queryWords.filter(word =>
      exampleWords.some(
        exWord =>
          word.includes(exWord) ||
          exWord.includes(word) ||
          this.levenshteinDistance(word, exWord) <= 1
      )
    ).length;

    // Score based on overlap ratio - be more generous for short examples
    const ratio = overlap / Math.max(queryWords.length, exampleWords.length);

    // Boost score for key phrase matches
    if (example.includes('top') && query.includes('top')) {
      return Math.min(1.0, ratio + 0.3);
    }
    if (example.includes('profit') && query.includes('profit')) {
      return Math.min(1.0, ratio + 0.2);
    }
    if (example.includes('best') && (query.includes('best') || query.includes('most'))) {
      return Math.min(1.0, ratio + 0.2);
    }

    return ratio;
  }

  classifyFallbackIntent(query, components) {
    // Simple keyword-based fallback classification
    if (query.includes('top') || query.includes('best') || query.includes('most')) {
      if (query.includes('profit')) {
        return { intent: 'top_items_by_profit', pattern: 'fallback', score: 0.7 };
      }
      if (query.includes('roi')) {
        return { intent: 'roi_analysis', pattern: 'fallback', score: 0.7 };
      }
    }

    if (query.includes('recent') || query.includes('latest') || query.includes('last')) {
      return { intent: 'recent_activity', pattern: 'fallback', score: 0.6 };
    }

    if (query.includes('vs') || query.includes('compare') || query.includes('versus')) {
      return { intent: 'time_comparison', pattern: 'fallback', score: 0.8 };
    }

    if (query.includes('account')) {
      return { intent: 'account_comparison', pattern: 'fallback', score: 0.7 };
    }

    if (components.items && components.items.length > 0) {
      return { intent: 'item_performance', pattern: 'fallback', score: 0.6 };
    }

    // Ultimate fallback
    return { intent: 'profit_analysis', pattern: 'fallback', score: 0.5 };
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidence(intentResult, components, query) {
    let confidence = intentResult.score;

    console.log(`🎯 Intent: ${intentResult.intent}, Base score: ${confidence.toFixed(3)}`);

    // Boost confidence for specific components
    if (components.items && components.items.length > 0) {
      confidence += 0.1;
      console.log(`  + Items detected: ${components.items.join(', ')} (+0.1)`);
    }

    if (components.timeRange) {
      confidence += 0.1;
      console.log(`  + Time range: ${JSON.stringify(components.timeRange)} (+0.1)`);
    }

    if (components.metrics && components.metrics.length > 0) {
      confidence += 0.1;
      console.log(`  + Metrics: ${components.metrics.join(', ')} (+0.1)`);
    }

    if (components.limits) {
      confidence += 0.1;
      console.log(`  + Limit specified: ${components.limits} (+0.1)`);
    }

    // Reduce confidence for very short or vague queries
    if (query.length < 10) {
      confidence -= 0.2;
      console.log(`  - Query too short (+${-0.2})`);
    }

    if (query.split(' ').length < 3) {
      confidence -= 0.1;
      console.log(`  - Too few words (+${-0.1})`);
    }

    // Boost confidence for clear indicators
    if (query.includes('show me') || query.includes('what') || query.includes('how')) {
      confidence += 0.05;
      console.log(`  + Clear query indicator (+0.05)`);
    }

    // Cap confidence at 1.0
    const finalConfidence = Math.min(1.0, Math.max(0.0, confidence));
    console.log(`  = Final confidence: ${finalConfidence.toFixed(3)}`);

    return finalConfidence;
  }

  parseAmount(amountStr, multipliers) {
    const cleanAmount = amountStr.replace(/,/g, '');
    const num = parseFloat(cleanAmount);

    if (isNaN(num)) return 0;

    // Check for multiplier suffix
    for (const [suffix, multiplier] of Object.entries(multipliers || {})) {
      if (amountStr.toLowerCase().includes(suffix)) {
        return num * multiplier;
      }
    }

    return num;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
