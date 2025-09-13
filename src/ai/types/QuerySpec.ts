// Core query specification types for the hybrid AI system

export type TimeRange =
  | { preset: 'last_7d' | 'last_30d' | 'this_week' | 'this_month' | 'last_month' | 'all_time' }
  | { from: string; to: string } // 'YYYY-MM-DD'
  | {
      dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    }
  | { comparison: 'weekend_vs_weekday' | 'weekday_vs_weekend' };

export type Metric = 'profit' | 'roi' | 'flips' | 'avg_hold_time' | 'volume' | 'weighted_roi';

export type Dimension = 'item' | 'date' | 'hour' | 'weekday' | 'account' | 'time_period';

export type Operation = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'calculate';

export type FilterOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'contains' | 'between';

export interface Filter {
  field: string;
  op: FilterOperator;
  value: any;
}

export interface MetricSpec {
  metric: Metric;
  op: Operation;
}

export interface SortSpec {
  by: string;
  order: 'asc' | 'desc';
}

export interface QuerySpec {
  intent: string;
  confidence: number;
  timeRange?: TimeRange;
  metrics: MetricSpec[];
  dimensions?: Dimension[];
  filters?: Filter[];
  sort?: SortSpec[];
  limit?: number;
  includeColumns?: string[];
  requiresConfirmation?: boolean;
}

// Validation result types
export type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      suggestions?: string[];
      missing?: string[];
      alternatives?: string[];
    };

// Intent parsing result types
export type IntentResult =
  | { type: 'parsed'; spec: QuerySpec; confidence: number }
  | { type: 'clarify'; question: string; options?: string[]; context?: any }
  | { type: 'impossible'; reason: string; alternatives: string[] }
  | { type: 'confirm'; spec: QuerySpec; preview: string };

// Parsed components from rule-based extraction
export interface ParsedComponents {
  timeRange?: TimeRange;
  items?: string[];
  metrics?: string[];
  dimensions?: string[];
  filters?: Array<{ field: string; operator: string; value: any }>;
  limits?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  modifiers?: {
    exclude?: string[];
    include?: string[];
    onlyProfitable?: boolean;
  };
}

// Configuration interfaces
export interface CapabilitiesConfig {
  sqlEngine: {
    name: string;
    version: string;
    supports: string[];
    forbidden: string[];
  };
  schema: {
    table: string;
    columns: Record<
      string,
      {
        type: string;
        searchable?: boolean;
        fuzzy?: boolean;
        aggregatable?: boolean;
        derived?: boolean;
        calculation?: string;
        description: string;
      }
    >;
  };
  metrics: Record<
    string,
    {
      calculation: string;
      aggregations?: string[];
      display: string;
      description: string;
    }
  >;
  impossible: Array<{
    patterns: string[];
    reason: string;
    alternatives: string[];
  }>;
}

export interface QueryPattern {
  examples: string[];
  intent: string;
  defaultSpec: Partial<QuerySpec>;
  requiresItemFilter?: boolean;
  requiresTimeComparison?: boolean;
  requiresDurationFilter?: boolean;
  variations?: Record<
    string,
    {
      patterns: string[];
      additionalMetrics?: MetricSpec[];
      sort?: SortSpec[];
    }
  >;
}

export interface ValidationRules {
  rules: {
    queryLength: { min: number; max: number; errorMessage: string };
    timeRange: { maxDays: number; validPresets: string[]; errorMessage: string };
    limits: { max: number; default: number; errorMessage: string };
    confidence: { minThreshold: number; clarificationThreshold: number; errorMessage: string };
    sqlSafety: {
      forbiddenKeywords: string[];
      allowedKeywords: string[];
      maxComplexity: number;
      errorMessage: string;
    };
  };
  impossibleQueries: Array<{
    patterns: string[];
    context?: string[];
    reason: string;
    suggestions: string[];
  }>;
  clarificationTriggers: Array<{
    condition: string;
    question: string;
    options?: string[];
    dynamicOptions?: boolean;
  }>;
}

// Context for conversations and processing
export interface ConversationContext {
  previousQueries: Array<{
    query: string;
    spec: QuerySpec;
    sql: string;
    resultCount: number;
  }>;
  sessionId: string;
  temporalContext: {
    currentDate: string;
    currentYear: number;
    currentMonth: number;
    currentDayOfWeek: number;
    dayName: string;
    timezone: string;
    recentDays: Record<string, string>;
  };
  userPreferences?: {
    defaultLimit?: number;
    preferredTimeRange?: string;
    favoriteMetrics?: string[];
  };
}

// Processing state types
export type ProcessingState =
  | 'ready'
  | 'parsing'
  | 'validating'
  | 'awaiting_confirmation'
  | 'awaiting_clarification'
  | 'generating_sql'
  | 'impossible'
  | 'error';

// Error types for better error handling
export class ValidationError extends Error {
  constructor(
    message: string,
    public suggestions?: string[],
    public alternatives?: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ParsingError extends Error {
  constructor(
    message: string,
    public originalQuery: string,
    public confidence?: number
  ) {
    super(message);
    this.name = 'ParsingError';
  }
}

export class ImpossibleQueryError extends Error {
  constructor(
    message: string,
    public alternatives: string[]
  ) {
    super(message);
    this.name = 'ImpossibleQueryError';
  }
}
