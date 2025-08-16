// src/utils/index.ts - Consolidated utility exports

// Export all named exports from each module
export * from './dateUtils';
export * from './formatUtils';
export * from './logger';

// Export defaults with different names to avoid conflicts
export { default as DateUtilsClass } from './dateUtils';
export { default as FormatUtilsClass } from './formatUtils';
export { default as loggerInstance } from './logger';
