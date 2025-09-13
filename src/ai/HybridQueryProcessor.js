import { IntentParser } from './parsers/IntentParser.js';
import { CapabilityValidator } from './validation/CapabilityValidator.js';
import { SpecBuilder } from './validation/SpecBuilder.js';

/**
 * Main hybrid query processor that coordinates local AI processing with remote API calls
 */
export class HybridQueryProcessor {
  constructor() {
    this.intentParser = new IntentParser();
    this.validator = new CapabilityValidator();
    this.specBuilder = new SpecBuilder();
    this.state = 'ready';
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize all components
      await Promise.all([
        this.intentParser.initialize(),
        this.validator.initialize(),
        this.specBuilder.initialize(),
      ]);

      this.initialized = true;
      console.log('✅ HybridQueryProcessor initialized');
    } catch (error) {
      console.error('Failed to initialize HybridQueryProcessor:', error);
      throw error;
    }
  }

  /**
   * Process a user query through the hybrid pipeline
   */
  async processQuery(userText, conversationContext = []) {
    if (!this.initialized) {
      throw new Error('HybridQueryProcessor not initialized');
    }

    this.state = 'parsing';

    try {
      // Phase 1: Local intent parsing (50-200ms)
      const parseResult = await this.intentParser.parse(userText, conversationContext);

      // Phase 2: Build structured specification
      const querySpec = this.specBuilder.buildSpec(
        parseResult.intent,
        parseResult.components,
        parseResult.confidence,
        userText
      );

      // Phase 3: Validate against capabilities
      this.state = 'validating';
      const validation = this.validator.validate(querySpec);

      if (!validation.ok) {
        this.state = 'impossible';
        return {
          type: 'impossible',
          reason: validation.reason,
          alternatives: validation.alternatives || validation.suggestions || [],
        };
      }

      // Phase 4: Check if clarification is needed
      const clarification = this.validator.needsClarification(querySpec, userText);
      if (clarification) {
        this.state = 'awaiting_clarification';
        return {
          type: 'clarify',
          question: clarification.question,
          options: clarification.options,
          context: {
            spec: querySpec,
            parseResult,
            originalQuery: userText,
          },
        };
      }

      // Phase 5: Determine if confirmation is needed
      if (querySpec.requiresConfirmation || parseResult.confidence < 0.65) {
        this.state = 'awaiting_confirmation';
        return {
          type: 'confirm',
          spec: querySpec,
          preview: this.specBuilder.generatePreview(querySpec),
          confidence: parseResult.confidence,
        };
      }

      // Phase 6: Auto-confirm high confidence queries
      this.state = 'ready';
      return {
        type: 'parsed',
        spec: querySpec,
        confidence: parseResult.confidence,
        preview: this.specBuilder.generatePreview(querySpec),
      };
    } catch (error) {
      console.error('Query processing error:', error);
      this.state = 'error';

      return {
        type: 'error',
        message: `Failed to process query: ${error.message}`,
        fallbackToAPI: true, // Indicate that we should fall back to the original API
      };
    }
  }

  /**
   * Generate SQL from a confirmed specification (much smaller API call)
   */
  async generateSQL(confirmedSpec, temporalContext = null) {
    this.state = 'generating_sql';

    try {
      // Create structured prompt for Claude API
      const structuredPrompt = this.buildStructuredPrompt(confirmedSpec, temporalContext);

      // Use appropriate API endpoint (local proxy in dev, Vercel in production)
      const apiUrl =
        window.location.hostname === 'localhost'
          ? 'http://localhost:3002/api/generate-sql'
          : '/api/generate-sql';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Hybrid Query: ${confirmedSpec.intent}`, // Satisfy legacy validation
          structuredSpec: confirmedSpec,
          structuredPrompt,
          isHybridQuery: true,
          // Include minimal context for API
          temporalContext: temporalContext
            ? {
                currentDate: temporalContext.currentDate,
                timezone: temporalContext.timezone,
                recentDays: temporalContext.recentDays,
              }
            : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate SQL');
      }

      const { sql } = await response.json();
      this.state = 'ready';

      return sql;
    } catch (error) {
      console.error('SQL generation error:', error);
      this.state = 'error';
      throw error;
    }
  }

  /**
   * Build a structured, minimal prompt for the API
   */
  buildStructuredPrompt(spec, temporalContext) {
    const prompt = {
      intent: spec.intent,
      metrics: spec.metrics,
      dimensions: spec.dimensions || [],
      filters: spec.filters || [],
      timeRange: spec.timeRange,
      sort: spec.sort || [],
      limit: spec.limit,
      includeColumns: spec.includeColumns || [],
    };

    // Add temporal context if needed
    if (temporalContext && spec.timeRange) {
      prompt.temporalContext = {
        currentDate: temporalContext.currentDate,
        recentDays: temporalContext.recentDays,
      };
    }

    return prompt;
  }

  /**
   * Handle clarification responses
   */
  async processClarificationResponse(answer, clarificationContext) {
    try {
      const { spec, parseResult, originalQuery: _originalQuery } = clarificationContext;

      // Update spec based on clarification answer
      const updatedSpec = this.applyClientClarification(spec, answer);

      // Re-validate
      const validation = this.validator.validate(updatedSpec);
      if (!validation.ok) {
        return {
          type: 'impossible',
          reason: validation.reason,
          alternatives: validation.alternatives || [],
        };
      }

      // Return confirmed spec
      return {
        type: 'confirm',
        spec: updatedSpec,
        preview: this.specBuilder.generatePreview(updatedSpec),
        confidence: parseResult.confidence + 0.1, // Boost confidence after clarification
      };
    } catch (error) {
      console.error('Clarification processing error:', error);
      return {
        type: 'error',
        message: `Failed to process clarification: ${error.message}`,
      };
    }
  }

  applyClientClarification(spec, answer) {
    const updatedSpec = { ...spec };

    // Handle different types of clarification answers
    if (typeof answer === 'string') {
      const lowerAnswer = answer.toLowerCase();

      // Time period clarifications
      if (lowerAnswer.includes('last 7 days')) {
        updatedSpec.timeRange = { preset: 'last_7d' };
      } else if (lowerAnswer.includes('last 30 days')) {
        updatedSpec.timeRange = { preset: 'last_30d' };
      } else if (lowerAnswer.includes('this month')) {
        updatedSpec.timeRange = { preset: 'this_month' };
      } else if (lowerAnswer.includes('all time')) {
        updatedSpec.timeRange = { preset: 'all_time' };
      }

      // Metric clarifications
      if (lowerAnswer.includes('total profit')) {
        updatedSpec.metrics = [{ metric: 'profit', op: 'sum' }];
      } else if (lowerAnswer.includes('roi')) {
        updatedSpec.metrics = [{ metric: 'roi', op: 'avg' }];
      } else if (lowerAnswer.includes('number of flips')) {
        updatedSpec.metrics = [{ metric: '*', op: 'count' }];
      }

      // Item clarifications - add item filter when specific item is chosen
      // This handles cases like "weapon" -> "whip" clarification
      if (
        answer &&
        !lowerAnswer.includes('last ') &&
        !lowerAnswer.includes('total ') &&
        !lowerAnswer.includes('roi') &&
        !lowerAnswer.includes('number of')
      ) {
        // Likely an item name clarification
        updatedSpec.filters = updatedSpec.filters || [];

        // Remove any existing generic item filters
        updatedSpec.filters = updatedSpec.filters.filter(
          f => !(f.field === 'item' && ['weapon', 'armor', 'food'].includes(f.value))
        );

        // Add specific item filter
        updatedSpec.filters.push({
          field: 'item',
          op: 'contains',
          value: answer.toLowerCase(),
        });

        // Force comprehensive metrics for showing item flips (override any existing)
        updatedSpec.metrics = [
          { metric: 'profit', op: 'sum' },
          { metric: 'roi', op: 'avg' },
          { metric: '*', op: 'count' },
        ];

        // For grouped item analysis, we don't need includeColumns since we're aggregating
        // The SQL will include the grouping dimension (item) and aggregated metrics
        delete updatedSpec.includeColumns;

        // Set dimensions for proper grouping
        updatedSpec.dimensions = ['item'];

        // Ensure intent reflects comprehensive item analysis
        updatedSpec.intent = 'item_analysis';
      }
    }

    return updatedSpec;
  }

  /**
   * Get current processing state
   */
  getState() {
    return this.state;
  }

  /**
   * Reset processor state
   */
  reset() {
    this.state = 'ready';
  }

  /**
   * Get performance metrics for the hybrid system
   */
  getPerformanceMetrics() {
    // This would track API call reduction, response times, etc.
    // For now, return placeholder metrics
    return {
      apiCallsReduced: 0,
      averageLocalResponseTime: 0,
      totalQueriesProcessed: 0,
      fallbackRate: 0,
    };
  }

  /**
   * Check if query should fall back to original API
   */
  shouldFallbackToAPI(query, error = null, conversationContext = []) {
    // Fallback conditions:
    // 1. Processor initialization failed
    if (!this.initialized) return true;

    // 2. Critical parsing errors
    if (error && error.name === 'ValidationError') return false; // Don't fallback on validation errors
    if (error && error.name === 'ParsingError') return true;

    // 3. Refinement queries - these need conversation context
    if (this.isRefinementQuery(query, conversationContext)) return true;

    // 4. Very complex queries that rule-based parsing can't handle
    if (query.length > 400) return true;

    // 5. Queries with complex nested logic
    if (query.includes(' and ') && query.includes(' or ')) return true;

    // 6. Queries asking for very specific calculations
    if (query.includes('calculate') || query.includes('formula')) return true;

    return false;
  }

  /**
   * Detect if this is a refinement/follow-up query
   */
  isRefinementQuery(query, conversationContext) {
    // No previous context = not a refinement
    if (!conversationContext || conversationContext.length === 0) return false;

    const lowerQuery = query.toLowerCase();

    // Common refinement patterns
    const refinementPatterns = [
      'also include',
      'add to that',
      'include their',
      'show their',
      'with their',
      'can you also',
      'also show',
      'include the',
      'add the',
      'also add',
      'sort by',
      'order by',
      'exclude',
      'remove',
      'filter',
      'only show',
      'limit to',
      'top',
      'bottom',
      'first',
      'last',
    ];

    // Check if query contains refinement patterns
    const hasRefinementPattern = refinementPatterns.some(pattern => lowerQuery.includes(pattern));

    // Additional check: very short queries that modify previous results
    const isShortModification =
      query.length < 50 &&
      (lowerQuery.includes('roi') ||
        lowerQuery.includes('count') ||
        lowerQuery.includes('sort') ||
        lowerQuery.includes('limit') ||
        lowerQuery.includes('exclude') ||
        lowerQuery.includes('include'));

    return hasRefinementPattern || isShortModification;
  }

  /**
   * Process query with automatic fallback
   */
  async processQueryWithFallback(userText, conversationContext = []) {
    try {
      // Check if this is a refinement query that should use the legacy API
      if (this.isRefinementQuery(userText, conversationContext)) {
        console.log('🔄 Detected refinement query, using legacy API for context handling');
        return await this.fallbackToOriginalAPI(userText, conversationContext);
      }

      // Try hybrid processing first
      const result = await this.processQuery(userText, conversationContext);

      // If result suggests fallback, use original API
      if (result.fallbackToAPI) {
        return await this.fallbackToOriginalAPI(userText, conversationContext);
      }

      return result;
    } catch (error) {
      console.error('Hybrid processing failed, falling back to API:', error);

      // Check if we should fallback
      if (this.shouldFallbackToAPI(userText, error, conversationContext)) {
        return await this.fallbackToOriginalAPI(userText, conversationContext);
      }

      // Re-throw error if we shouldn't fallback
      throw error;
    }
  }

  /**
   * Fallback to original API approach
   */
  async fallbackToOriginalAPI(userText, conversationContext = []) {
    console.log('🔄 Falling back to original API for query:', userText);

    try {
      // Use the original API with full context (expensive but reliable)
      const response = await fetch('/api/generate-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userText,
          // Include conversation context in original format
          previousQuery:
            conversationContext.length > 0
              ? conversationContext[conversationContext.length - 1].query
              : null,
          previousSQL:
            conversationContext.length > 0
              ? conversationContext[conversationContext.length - 1].sql
              : null,
          sessionId: 'hybrid_fallback',
          isOwner: true,
          temporalContext: this.getCurrentTemporalContext(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Fallback API call failed');
      }

      const { sql } = await response.json();

      return {
        type: 'fallback_success',
        sql,
        usedFallback: true,
      };
    } catch (error) {
      console.error('Fallback API call failed:', error);
      throw error;
    }
  }

  getCurrentTemporalContext() {
    const now = new Date();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));

    return {
      currentDate: localDate.toISOString().split('T')[0],
      currentYear: localDate.getFullYear(),
      currentMonth: localDate.getMonth() + 1,
      currentDayOfWeek: localDate.getDay(),
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
        localDate.getDay()
      ],
      timezone: userTimezone,
    };
  }
}
