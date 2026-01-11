/**
 * Simple Logger for Web Client
 *
 * Replaces Electron's logger with a simple console-based implementation
 */

interface Logger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  scope: (name: string) => Logger;
}

function createLogger(scopeName?: string): Logger {
  const prefix = scopeName ? `[${scopeName}]` : '';

  return {
    info(...args: any[]) {
      console.log(prefix, ...args);
    },

    warn(...args: any[]) {
      console.warn(prefix, ...args);
    },

    error(...args: any[]) {
      console.error(prefix, ...args);
    },

    debug(...args: any[]) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(prefix, ...args);
      }
    },

    scope(name: string) {
      return createLogger(scopeName ? `${scopeName}:${name}` : name);
    }
  };
}

const rawLog = createLogger();

export default rawLog;
