/**
 * Environment-aware logging utility
 * Prevents console output in production builds
 */

// Removed import - types are defined inline

const isDevelopment =
  import.meta.env.DEV ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

type LogFunction = (...args: any[]) => void;

interface Logger {
  debug: LogFunction;
  info: LogFunction;
  warn: LogFunction;
  error: LogFunction;
  force: {
    log: LogFunction;
    warn: LogFunction;
    error: LogFunction;
    info: LogFunction;
  };
}

export const logger: Logger = {
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },

  error: (...args: any[]): void => {
    // Always log errors, even in production
    console.error('[ERROR]', ...args);
  },

  // For data processing scripts that should always log
  force: {
    log: (...args: any[]): void => console.log(...args),
    warn: (...args: any[]): void => console.warn(...args),
    error: (...args: any[]): void => console.error(...args),
    info: (...args: any[]): void => console.info(...args),
  },
};

export default logger;
