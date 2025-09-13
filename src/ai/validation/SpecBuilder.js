import { itemFuzzySearch } from '../../lib/itemFuzzySearch.js';

/**
 * Builds structured query specifications from parsed components and patterns
 */
export class SpecBuilder {
  constructor() {
    this.patterns = null;
    this.templates = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const [patternsResponse, templatesResponse] = await Promise.all([
        fetch('/ai-config/query-patterns.json'),
        fetch('/ai-config/sql-templates.json'),
      ]);

      this.patterns = await patternsResponse.json();
      this.templates = await templatesResponse.json();
      this.initialized = true;

      console.log('✅ SpecBuilder initialized');
    } catch (error) {
      console.error('Failed to initialize SpecBuilder:', error);
      throw error;
    }
  }

  /**
   * Build a query specification from parsed components
   */
  buildSpec(intent, parsedComponents, confidence, originalQuery) {
    if (!this.initialized) {
      throw new Error('SpecBuilder not initialized');
    }

    const pattern = this.findMatchingPattern(intent, originalQuery);
    if (!pattern) {
      throw new Error(`No pattern found for intent: ${intent}`);
    }

    // Start with default spec from pattern
    const spec = {
      intent,
      confidence,
      ...JSON.parse(JSON.stringify(pattern.defaultSpec)), // Deep clone
    };

    // Apply parsed components
    if (parsedComponents.timeRange) {
      spec.timeRange = parsedComponents.timeRange;
    }

    if (parsedComponents.metrics && parsedComponents.metrics.length > 0) {
      spec.metrics = this.buildMetricSpecs(parsedComponents.metrics);
    }

    if (parsedComponents.dimensions && parsedComponents.dimensions.length > 0) {
      spec.dimensions = parsedComponents.dimensions;
    }

    if (parsedComponents.filters && parsedComponents.filters.length > 0) {
      spec.filters = this.buildFilters(parsedComponents.filters);
    }

    if (parsedComponents.limits) {
      spec.limit = parsedComponents.limits;
      console.log(`🔢 Setting limit from parsed components: ${parsedComponents.limits}`);
    }

    if (parsedComponents.sortBy) {
      spec.sort = [
        {
          by: parsedComponents.sortBy,
          order: parsedComponents.sortOrder || 'desc',
        },
      ];
    }

    // Handle item filters for item-specific queries
    if (pattern.requiresItemFilter && parsedComponents.items) {
      spec.filters = spec.filters || [];
      spec.filters.push(...this.buildItemFilters(parsedComponents.items));
    }

    // Apply modifiers
    if (parsedComponents.modifiers) {
      this.applyModifiers(spec, parsedComponents.modifiers);
    }

    // Set default limit if not specified
    if (!spec.limit && this.shouldHaveLimit(intent)) {
      spec.limit = this.getDefaultLimit(intent);
      console.log(`🔢 Setting default limit for intent ${intent}: ${spec.limit}`);
    } else if (spec.limit) {
      console.log(`🔢 Using existing limit: ${spec.limit}`);
    }

    // Mark for confirmation if query is complex or ambiguous
    if (this.requiresConfirmation(spec, confidence, originalQuery)) {
      spec.requiresConfirmation = true;
    }

    return spec;
  }

  findMatchingPattern(intent, originalQuery) {
    // First, try exact intent match
    for (const [, pattern] of Object.entries(this.patterns.patterns)) {
      if (pattern.intent === intent) {
        return pattern;
      }
    }

    // Then try pattern matching on examples
    for (const [, pattern] of Object.entries(this.patterns.patterns)) {
      const matches = pattern.examples.some(
        example => this.similarityScore(originalQuery.toLowerCase(), example.toLowerCase()) > 0.7
      );

      if (matches) {
        return pattern;
      }
    }

    // Fallback to generic pattern based on intent type
    return this.getGenericPattern(intent);
  }

  buildMetricSpecs(metricStrings) {
    const metricSpecs = [];

    for (const metricStr of metricStrings) {
      const metric = this.parseMetricString(metricStr);
      if (metric) {
        metricSpecs.push(metric);
      }
    }

    return metricSpecs.length > 0 ? metricSpecs : [{ metric: 'profit', op: 'sum' }];
  }

  parseMetricString(metricStr) {
    const lower = metricStr.toLowerCase();

    // Handle common metric patterns
    if (lower.includes('profit')) {
      return { metric: 'profit', op: lower.includes('total') ? 'sum' : 'sum' };
    }
    if (lower.includes('roi') || lower.includes('return')) {
      return { metric: 'roi', op: 'avg' };
    }
    if (lower.includes('count') || lower.includes('number') || lower.includes('flips')) {
      return { metric: '*', op: 'count' };
    }
    if (lower.includes('volume') || lower.includes('invested')) {
      return { metric: 'volume', op: 'sum' };
    }
    if (lower.includes('time') || lower.includes('duration') || lower.includes('hold')) {
      return { metric: 'avg_hold_time', op: 'avg' };
    }

    return null;
  }

  buildFilters(filterComponents) {
    const filters = [];

    for (const component of filterComponents) {
      const filter = this.buildFilter(component);
      if (filter) {
        filters.push(filter);
      }
    }

    return filters;
  }

  buildFilter(component) {
    const { field, operator, value } = component;

    // Normalize operator
    const normalizedOp = this.normalizeOperator(operator);
    if (!normalizedOp) {
      console.warn('Unknown filter operator:', operator);
      return null;
    }

    // Handle special field mappings
    const normalizedField = this.normalizeField(field);

    return {
      field: normalizedField,
      op: normalizedOp,
      value: this.normalizeValue(value, normalizedField),
    };
  }

  buildItemFilters(items) {
    const filters = [];

    for (const item of items) {
      // Use existing fuzzy search to generate SQL patterns
      const patterns = itemFuzzySearch.generateSQLPatterns(item);

      if (patterns.length === 1) {
        // Single pattern - simple LIKE
        filters.push({
          field: 'item',
          op: 'contains',
          value: item,
        });
      } else {
        // Multiple patterns - would need OR logic in SQL generation
        // For now, use the most confident match
        filters.push({
          field: 'item',
          op: 'contains',
          value: item,
        });
      }
    }

    return filters;
  }

  applyModifiers(spec, modifiers) {
    if (modifiers.exclude) {
      spec.filters = spec.filters || [];
      for (const excludeItem of modifiers.exclude) {
        spec.filters.push({
          field: 'item',
          op: '!=',
          value: excludeItem,
        });
      }
    }

    if (modifiers.onlyProfitable) {
      spec.filters = spec.filters || [];
      spec.filters.push({
        field: 'profit',
        op: '>',
        value: 0,
      });
    }

    if (modifiers.include) {
      // Handle include modifiers (e.g., only certain categories)
      spec.filters = spec.filters || [];
      // Implementation depends on what's being included
    }
  }

  normalizeOperator(operator) {
    const operatorMap = {
      'greater than': '>',
      'more than': '>',
      over: '>',
      above: '>',
      'less than': '<',
      under: '<',
      below: '<',
      equals: '=',
      is: '=',
      contains: 'contains',
      like: 'contains',
      not: '!=',
      between: 'between',
      in: 'in',
    };

    return operatorMap[operator.toLowerCase()] || operator;
  }

  normalizeField(field) {
    const fieldMap = {
      time: 'flip_duration_minutes',
      duration: 'flip_duration_minutes',
      hold_time: 'flip_duration_minutes',
      return: 'roi',
      percentage: 'roi',
      gp: 'profit',
      money: 'profit',
      earnings: 'profit',
    };

    return fieldMap[field.toLowerCase()] || field;
  }

  normalizeValue(value, field) {
    // Handle numeric fields
    if (['profit', 'buy_price', 'sell_price', 'roi', 'quantity'].includes(field)) {
      if (typeof value === 'string') {
        // Handle shorthand notation (e.g., "1m", "100k")
        const numericValue = this.parseNumericValue(value);
        return numericValue !== null ? numericValue : value;
      }
      return value;
    }

    // Handle date fields
    if (['date', 'buy_time', 'sell_time'].includes(field)) {
      return this.normalizeDateValue(value);
    }

    return value;
  }

  parseNumericValue(valueStr) {
    const str = valueStr.toLowerCase().replace(/,/g, '');

    if (str.endsWith('k')) {
      const num = parseFloat(str.slice(0, -1));
      return isNaN(num) ? null : num * 1000;
    }

    if (str.endsWith('m')) {
      const num = parseFloat(str.slice(0, -1));
      return isNaN(num) ? null : num * 1000000;
    }

    if (str.endsWith('gp')) {
      const num = parseFloat(str.slice(0, -2));
      return isNaN(num) ? null : num;
    }

    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  }

  normalizeDateValue(value) {
    // Handle relative dates, specific dates, etc.
    // For now, return as-is and let SQL generation handle it
    return value;
  }

  shouldHaveLimit(intent) {
    const intentsThatNeedLimits = [
      'top_items_by_profit',
      'item_analysis',
      'volume_analysis',
      'expensive_flips',
      'roi_analysis',
    ];

    return intentsThatNeedLimits.includes(intent);
  }

  getDefaultLimit(intent) {
    const defaultLimits = {
      top_items_by_profit: 10,
      item_analysis: 20,
      volume_analysis: 15,
      expensive_flips: 20,
      roi_analysis: 15,
      loss_analysis: 10,
    };

    return defaultLimits[intent] || 50;
  }

  requiresConfirmation(spec, confidence, originalQuery) {
    // Require confirmation for:
    // 1. Low confidence queries (lowered threshold for better UX)
    if (confidence < 0.65) return true;

    // 2. Complex queries with many filters
    if (spec.filters && spec.filters.length > 3) return true;

    // 3. Queries with custom time ranges
    if (spec.timeRange && spec.timeRange.from && spec.timeRange.to) return true;

    // 4. Queries asking for large result sets
    if (spec.limit && spec.limit > 100) return true;

    // 5. Queries with comparison operations
    if (originalQuery.includes(' vs ') || originalQuery.includes('compare')) return true;

    return false;
  }

  /**
   * Generate a preview description of what the query will do
   */
  generatePreview(spec) {
    const parts = [];

    // Context-aware description based on intent
    if (spec.intent === 'item_analysis' && spec.filters?.some(f => f.field === 'item')) {
      // For item analysis, make it more natural
      const itemFilter = spec.filters.find(f => f.field === 'item');
      const itemName = itemFilter ? itemFilter.value : 'items';
      parts.push(`Analyze ${itemName} flips`);

      // Add what metrics we're showing
      const metricDescriptions = spec.metrics
        .map(m => {
          const metricName = this.getMetricDisplayName(m.metric);
          const operation = this.getOperationDisplayName(m.op);

          // Special handling for common combinations
          if ((m.metric === 'flips' || m.metric === '*') && m.op === 'count') {
            return 'flip count';
          } else if (m.metric === 'profit' && m.op === 'sum') {
            return 'total profit';
          } else if (m.metric === 'roi' && m.op === 'avg') {
            return 'average ROI';
          }

          return operation ? `${operation} ${metricName}`.trim() : metricName;
        })
        .filter(desc => desc.trim()); // Remove empty descriptions

      if (metricDescriptions.length > 0) {
        parts.push(`showing ${metricDescriptions.join(', ')}`);
      }
    } else {
      // Default description for other intents
      const metricDescriptions = spec.metrics
        .map(m => {
          const metricName = this.getMetricDisplayName(m.metric);
          const operation = this.getOperationDisplayName(m.op);
          return operation ? `${operation} ${metricName}` : metricName;
        })
        .filter(desc => desc.trim());
      parts.push(`Show ${metricDescriptions.join(', ')}`);

      // Dimensions description
      if (spec.dimensions && spec.dimensions.length > 0) {
        const dimensionNames = spec.dimensions.map(d => this.getDimensionDisplayName(d));
        parts.push(`grouped by ${dimensionNames.join(', ')}`);
      }
    }

    // Time range description
    if (spec.timeRange) {
      parts.push(`for ${this.getTimeRangeDisplayName(spec.timeRange)}`);
    }

    // Filters description
    if (spec.filters && spec.filters.length > 0) {
      const filterDescriptions = spec.filters.map(f => this.getFilterDisplayName(f));
      parts.push(`where ${filterDescriptions.join(' and ')}`);
    }

    // Limit description
    if (spec.limit) {
      parts.push(`(showing top ${spec.limit} results)`);
    }

    return parts.join(' ');
  }

  getMetricDisplayName(metric) {
    const names = {
      profit: 'profit',
      roi: 'ROI',
      flips: 'flip count',
      '*': 'flip count',
      volume: 'trading volume',
      avg_hold_time: 'average hold time',
      weighted_roi: 'weighted ROI',
    };
    return names[metric] || metric;
  }

  getOperationDisplayName(operation) {
    const names = {
      sum: 'total',
      avg: 'average',
      count: '', // Remove redundant "count of" for better readability
      min: 'minimum',
      max: 'maximum',
      calculate: 'calculated',
    };
    return names[operation] || operation;
  }

  getDimensionDisplayName(dimension) {
    const names = {
      item: 'item',
      date: 'date',
      account: 'account',
      hour: 'hour',
      weekday: 'day of week',
      time_period: 'time period',
    };
    return names[dimension] || dimension;
  }

  getTimeRangeDisplayName(timeRange) {
    if (timeRange.preset) {
      const names = {
        last_7d: 'last 7 days',
        last_30d: 'last 30 days',
        this_week: 'this week',
        this_month: 'this month',
        last_month: 'last month',
        all_time: 'all time',
      };
      return names[timeRange.preset] || timeRange.preset;
    }

    if (timeRange.from && timeRange.to) {
      return `${timeRange.from} to ${timeRange.to}`;
    }

    if (timeRange.dayOfWeek) {
      return `${timeRange.dayOfWeek}s`;
    }

    if (timeRange.comparison) {
      return timeRange.comparison.replace('_', ' ');
    }

    return 'specified time period';
  }

  getFilterDisplayName(filter) {
    const field = this.getFieldDisplayName(filter.field);
    const operator = this.getOperatorDisplayName(filter.op);
    const value = this.getValueDisplayName(filter.value, filter.field);

    return `${field} ${operator} ${value}`;
  }

  getFieldDisplayName(field) {
    const names = {
      profit: 'profit',
      roi: 'ROI',
      item: 'item',
      account: 'account',
      buy_price: 'buy price',
      sell_price: 'sell price',
      flip_duration_minutes: 'hold time',
    };
    return names[field] || field;
  }

  getOperatorDisplayName(operator) {
    const names = {
      '>': 'greater than',
      '>=': 'at least',
      '<': 'less than',
      '<=': 'at most',
      '=': 'equals',
      '!=': 'not equal to',
      contains: 'contains',
      in: 'in',
      between: 'between',
    };
    return names[operator] || operator;
  }

  getValueDisplayName(value, field) {
    if (field === 'profit' || field === 'buy_price' || field === 'sell_price') {
      if (typeof value === 'number') {
        return `${value.toLocaleString()} GP`;
      }
    }

    if (field === 'roi') {
      if (typeof value === 'number') {
        return `${value}%`;
      }
    }

    if (field === 'flip_duration_minutes') {
      if (typeof value === 'number') {
        const hours = Math.floor(value / 60);
        const minutes = value % 60;
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      }
    }

    return String(value);
  }

  getGenericPattern(intent) {
    // Fallback patterns for unknown intents
    const genericPatterns = {
      analysis: {
        intent: 'analysis',
        defaultSpec: {
          metrics: [
            { metric: 'profit', op: 'sum' },
            { metric: '*', op: 'count' },
          ],
          dimensions: ['item'],
        },
      },
      summary: {
        intent: 'summary',
        defaultSpec: {
          metrics: [
            { metric: 'profit', op: 'sum' },
            { metric: 'roi', op: 'avg' },
          ],
        },
      },
    };

    // Try to categorize the intent
    if (intent.includes('analysis') || intent.includes('performance')) {
      return genericPatterns.analysis;
    }
    if (intent.includes('summary') || intent.includes('total')) {
      return genericPatterns.summary;
    }

    // Ultimate fallback
    return {
      intent: 'generic',
      defaultSpec: {
        metrics: [{ metric: 'profit', op: 'sum' }],
        dimensions: ['item'],
        limit: 20,
      },
    };
  }

  similarityScore(str1, str2) {
    // Simple similarity scoring using longest common subsequence
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
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
