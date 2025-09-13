import { ValidationError, ImpossibleQueryError } from '../types/QuerySpec.ts';

/**
 * Validates queries against system capabilities and constraints
 */
export class CapabilityValidator {
  constructor() {
    this.capabilities = null;
    this.validationRules = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const [capabilitiesResponse, rulesResponse] = await Promise.all([
        fetch('/ai-config/capabilities.json'),
        fetch('/ai-config/validation-rules.json'),
      ]);

      this.capabilities = await capabilitiesResponse.json();
      this.validationRules = await rulesResponse.json();
      this.initialized = true;

      console.log('✅ CapabilityValidator initialized');
    } catch (error) {
      console.error('Failed to initialize CapabilityValidator:', error);
      throw error;
    }
  }

  /**
   * Validate a query specification against system capabilities
   */
  validate(querySpec) {
    if (!this.initialized) {
      throw new Error('CapabilityValidator not initialized');
    }

    try {
      // Check confidence threshold
      this.validateConfidence(querySpec.confidence);

      // Check query structure
      this.validateQueryStructure(querySpec);

      // Check time range validity
      if (querySpec.timeRange) {
        this.validateTimeRange(querySpec.timeRange);
      }

      // Check metrics and operations
      this.validateMetrics(querySpec.metrics);

      // Check dimensions
      if (querySpec.dimensions) {
        this.validateDimensions(querySpec.dimensions);
      }

      // Check filters
      if (querySpec.filters) {
        this.validateFilters(querySpec.filters);
      }

      // Check limits
      if (querySpec.limit) {
        this.validateLimit(querySpec.limit);
      }

      // Check for impossible query patterns
      this.validatePossibility(querySpec);

      return { ok: true };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ImpossibleQueryError) {
        return {
          ok: false,
          reason: error.message,
          suggestions: error.suggestions || [],
          alternatives: error.alternatives || [],
        };
      }

      console.error('Validation error:', error);
      return {
        ok: false,
        reason: `Validation failed: ${error.message}`,
        suggestions: ['Please try rephrasing your query'],
      };
    }
  }

  validateConfidence(confidence) {
    const minThreshold = this.validationRules.rules.confidence.minThreshold;

    if (confidence < minThreshold) {
      throw new ValidationError('Query intent unclear, please be more specific', [
        'Try using specific item names',
        'Specify a time period (e.g., "last week")',
        'Ask for specific metrics (e.g., "profit", "ROI")',
        'Use example patterns from the interface',
      ]);
    }
  }

  validateQueryStructure(querySpec) {
    if (!querySpec.intent) {
      throw new ValidationError('Query intent not specified');
    }

    if (!querySpec.metrics || querySpec.metrics.length === 0) {
      throw new ValidationError('No metrics specified for analysis', [
        'Specify what you want to analyze: profit, ROI, flip count, etc.',
      ]);
    }
  }

  validateTimeRange(timeRange) {
    const rules = this.validationRules.rules.timeRange;

    if (timeRange.preset) {
      if (!rules.validPresets.includes(timeRange.preset)) {
        throw new ValidationError(
          `Invalid time preset: ${timeRange.preset}`,
          rules.validPresets.map(p => `"${p}"`)
        );
      }
    } else if (timeRange.from && timeRange.to) {
      // Validate date format and range
      const fromDate = new Date(timeRange.from);
      const toDate = new Date(timeRange.to);
      const daysDiff = (toDate - fromDate) / (1000 * 60 * 60 * 24);

      if (daysDiff > rules.maxDays) {
        throw new ValidationError(
          `Time range too large (${Math.round(daysDiff)} days). Maximum: ${rules.maxDays} days`,
          ['Use a shorter time period', 'Try "last_30d" or "this_month"']
        );
      }

      if (daysDiff < 0) {
        throw new ValidationError('End date must be after start date', [
          'Check your date format (YYYY-MM-DD)',
        ]);
      }
    }
  }

  validateMetrics(metrics) {
    const validMetrics = this.validationRules.metricValidation.validMetrics;
    const validOperations = this.validationRules.metricValidation.validOperations;

    for (const metricSpec of metrics) {
      if (!validMetrics.includes(metricSpec.metric)) {
        throw new ValidationError(`Invalid metric: ${metricSpec.metric}`, validMetrics);
      }

      if (!validOperations.includes(metricSpec.op)) {
        throw new ValidationError(`Invalid operation: ${metricSpec.op}`, validOperations);
      }

      // Check metric-specific constraints
      const constraints =
        this.validationRules.metricValidation.metricConstraints[metricSpec.metric];
      if (constraints) {
        // Additional metric-specific validation could go here
      }
    }
  }

  validateDimensions(dimensions) {
    const validDimensions = this.validationRules.dimensionValidation.validDimensions;
    const maxDimensions = this.validationRules.dimensionValidation.maxDimensions;

    if (dimensions.length > maxDimensions) {
      throw new ValidationError(
        `Too many grouping dimensions (${dimensions.length}). Maximum: ${maxDimensions}`,
        ['Focus on fewer groupings for clearer results']
      );
    }

    for (const dimension of dimensions) {
      if (!validDimensions.includes(dimension)) {
        throw new ValidationError(`Invalid dimension: ${dimension}`, validDimensions);
      }
    }
  }

  validateFilters(filters) {
    const validOperators = this.validationRules.filterValidation.validOperators;
    const maxFilters = this.validationRules.filterValidation.maxFilters;
    const filterTypes = this.validationRules.filterValidation.filterTypes;

    if (filters.length > maxFilters) {
      throw new ValidationError(`Too many filters (${filters.length}). Maximum: ${maxFilters}`, [
        'Simplify your query with fewer conditions',
      ]);
    }

    for (const filter of filters) {
      if (!validOperators.includes(filter.op)) {
        throw new ValidationError(`Invalid filter operator: ${filter.op}`, validOperators);
      }

      // Validate field exists in schema
      if (!this.capabilities.schema.columns[filter.field]) {
        throw new ValidationError(
          `Invalid filter field: ${filter.field}`,
          Object.keys(this.capabilities.schema.columns)
        );
      }

      // Type-specific validation
      const fieldType = this.getFieldType(filter.field, filterTypes);
      this.validateFilterValue(filter, fieldType);
    }
  }

  validateLimit(limit) {
    const rules = this.validationRules.rules.limits;

    if (limit > rules.max) {
      throw new ValidationError(`Result limit too high (${limit}). Maximum: ${rules.max}`, [
        `Use limit of ${rules.max} or less`,
        'Remove limit for all results',
      ]);
    }

    if (limit < 1) {
      throw new ValidationError('Result limit must be at least 1', [
        'Use a positive number for limit',
      ]);
    }
  }

  validatePossibility(querySpec) {
    const impossibleQueries = this.validationRules.impossibleQueries;

    for (const impossible of impossibleQueries) {
      const hasPattern = impossible.patterns.some(pattern =>
        querySpec.intent.toLowerCase().includes(pattern.toLowerCase())
      );

      if (hasPattern) {
        const contextMatch =
          !impossible.context ||
          impossible.context.some(ctx =>
            querySpec.intent.toLowerCase().includes(ctx.toLowerCase())
          );

        if (contextMatch) {
          throw new ImpossibleQueryError(impossible.reason, impossible.suggestions);
        }
      }
    }
  }

  getFieldType(fieldName, filterTypes) {
    for (const [type, fields] of Object.entries(filterTypes)) {
      if (fields.includes(fieldName)) {
        return type;
      }
    }
    return 'unknown';
  }

  validateFilterValue(filter, fieldType) {
    switch (fieldType) {
      case 'numeric':
        if (isNaN(filter.value) && !Array.isArray(filter.value)) {
          throw new ValidationError(`Invalid numeric value for ${filter.field}: ${filter.value}`, [
            'Use a number value',
          ]);
        }
        break;

      case 'date':
        if (filter.op === 'between') {
          if (!Array.isArray(filter.value) || filter.value.length !== 2) {
            throw new ValidationError('Date range requires two values', [
              'Use format: ["start-date", "end-date"]',
            ]);
          }
        }
        break;

      case 'text':
        if (typeof filter.value !== 'string' && !Array.isArray(filter.value)) {
          throw new ValidationError(`Invalid text value for ${filter.field}`, ['Use a text value']);
        }
        break;
    }
  }

  /**
   * Check if a query requires clarification
   */
  needsClarification(querySpec, originalQuery) {
    const triggers = this.validationRules.clarificationTriggers;

    for (const trigger of triggers) {
      if (this.shouldTriggerClarification(trigger.condition, querySpec, originalQuery)) {
        return {
          question: trigger.question,
          options: trigger.options,
          dynamicOptions: trigger.dynamicOptions,
        };
      }
    }

    return null;
  }

  shouldTriggerClarification(condition, querySpec, originalQuery) {
    switch (condition) {
      case 'multiple_time_ranges':
        return this.hasMultipleTimeReferences(originalQuery);

      case 'ambiguous_item':
        return this.hasAmbiguousItemReference(originalQuery);

      case 'multiple_metrics':
        return querySpec.metrics && querySpec.metrics.length > 3;

      case 'unclear_comparison':
        return originalQuery.includes('vs') || originalQuery.includes('compare');

      default:
        return false;
    }
  }

  hasMultipleTimeReferences(query) {
    const timeTerms = ['week', 'month', 'day', 'yesterday', 'today', 'last', 'this'];
    const foundTerms = timeTerms.filter(term => query.toLowerCase().includes(term));
    return foundTerms.length > 2;
  }

  hasAmbiguousItemReference(query) {
    // This would integrate with the existing itemFuzzySearch
    // For now, simple heuristic
    const lowerQuery = query.toLowerCase();

    // Don't trigger for "top items" or "best items" queries - these are intentionally generic
    if (lowerQuery.includes('top') && lowerQuery.includes('item')) return false;
    if (lowerQuery.includes('best') && lowerQuery.includes('item')) return false;
    if (lowerQuery.includes('most') && lowerQuery.includes('item')) return false;

    const itemIndicators = ['item', 'weapon', 'armor', 'thing'];
    return (
      itemIndicators.some(indicator => lowerQuery.includes(indicator)) &&
      !this.hasSpecificItemName(query)
    );
  }

  hasSpecificItemName(query) {
    // This would check against the OSRS item database
    // For now, check for common specific items
    const commonItems = ['whip', 'dragon', 'bandos', 'armadyl', 'rune', 'adamant'];
    return commonItems.some(item => query.toLowerCase().includes(item));
  }
}
