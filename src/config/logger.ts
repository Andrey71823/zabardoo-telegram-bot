type LogArgs = unknown[];

class ConsoleLogger {
  info(...args: LogArgs): void {
    console.log('[INFO]', ...args);
  }

  warn(...args: LogArgs): void {
    console.warn('[WARN]', ...args);
  }

  error(...args: LogArgs): void {
    console.error('[ERROR]', ...args);
  }

  debug(...args: LogArgs): void {
    if (process.env.DEBUG) {
      console.debug('[DEBUG]', ...args);
    }
  }

  child(): ConsoleLogger {
    return this;
  }
}

export const logger = new ConsoleLogger();
export default logger;
