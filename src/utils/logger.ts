/**
 * Environment-aware logging utility
 * Prevents console output in production builds
 */

// Removed import - types are defined inline

const nodeEnv = (
  (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV
);
const isDevelopment = import.meta.env.DEV || nodeEnv === 'development';

type LogFunction = (...args: unknown[]) => void;

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
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },

  error: (...args: unknown[]): void => {
    // Always log errors, even in production
    console.error('[ERROR]', ...args);
  },

  // For data processing scripts that should always log
  force: {
    log: (...args: unknown[]): void => console.log(...args),
    warn: (...args: unknown[]): void => console.warn(...args),
    error: (...args: unknown[]): void => console.error(...args),
    info: (...args: unknown[]): void => console.info(...args),
  },
};

export default logger;
